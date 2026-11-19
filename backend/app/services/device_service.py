# /**
#  * @file        device_service.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      backend.app.services
#  *
#  * @author      Jawahar R. Mallah
#  * @organization Smritisys & AITDL Networks
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 PrathamOne EduOS
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-19
#  * @updated     2026-11-19
#  *
#  * @description Domain service for optional device-wise security binding, policy evaluation, registration, and safe disablement.
#  */

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy import select, func, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession
import json

from app.models.device import UserDevice
from app.models.settings import InstitutionSetting
from app.models.user import User, AuditLog


DEFAULT_DEVICE_BINDING_SETTINGS: Dict[str, Any] = {
    "enable_device_binding": False,
    "policy_mode": "disabled",  # "disabled", "optional_registration", "registered_only", "admin_approval_required"
    "verification_method": "device_fingerprint",  # "device_fingerprint", "totp_otp", "device_fingerprint_and_otp", "hardware_token"
    "max_registered_devices": 3,
    "new_device_approval_policy": "admin_approval",  # "admin_approval", "auto_approve", "otp_verified"
    "otp_verification_required": False,
    "device_management_permissions": "admin_only",  # "admin_only", "user_self_service", "admin_and_manager"
    "shadow_mode": True,
}


class DeviceService:
    @staticmethod
    async def get_settings(db: AsyncSession, institution_id: Optional[int]) -> Dict[str, Any]:
        """
        Fetch device binding security settings for an institution.
        Returns safe defaults if institution has not overridden any settings.
        Default is strictly DISABLED.
        """
        if not institution_id:
            return dict(DEFAULT_DEVICE_BINDING_SETTINGS)

        stmt = select(InstitutionSetting).where(
            InstitutionSetting.institution_id == institution_id,
            InstitutionSetting.category == "security",
        )
        result = await db.execute(stmt)
        rows = result.scalars().all()

        stored: Dict[str, Any] = {}
        for r in rows:
            val = r.value
            if r.data_type == "boolean":
                stored[r.key] = val.lower() in ("true", "1") if val else False
            elif r.data_type == "number":
                try:
                    stored[r.key] = float(val) if "." in val else int(val)
                except Exception:
                    stored[r.key] = val
            elif r.data_type == "json" and val:
                try:
                    stored[r.key] = json.loads(val)
                except Exception:
                    stored[r.key] = val
            else:
                stored[r.key] = val

        merged = dict(DEFAULT_DEVICE_BINDING_SETTINGS)
        merged.update(stored)
        return merged

    @staticmethod
    async def update_settings(
        db: AsyncSession,
        institution_id: int,
        updates: Dict[str, Any],
        actor_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Update device binding settings for a specific institution.
        Strictly isolated per-tenant.
        """
        for k, v in updates.items():
            if k not in DEFAULT_DEVICE_BINDING_SETTINGS:
                continue

            data_type = "string"
            serialized_val = ""
            if isinstance(v, bool):
                data_type = "boolean"
                serialized_val = "true" if v else "false"
            elif isinstance(v, (int, float)):
                data_type = "number"
                serialized_val = str(v)
            elif isinstance(v, (dict, list)):
                data_type = "json"
                serialized_val = json.dumps(v)
            else:
                serialized_val = str(v) if v is not None else ""

            stmt = select(InstitutionSetting).where(
                InstitutionSetting.institution_id == institution_id,
                InstitutionSetting.category == "security",
                InstitutionSetting.key == k,
            )
            existing = (await db.execute(stmt)).scalar_one_or_none()

            old_val = existing.value if existing else None
            if existing:
                existing.value = serialized_val
                existing.data_type = data_type
                existing.updated_by_id = actor_id
            else:
                new_item = InstitutionSetting(
                    institution_id=institution_id,
                    category="security",
                    key=k,
                    value=serialized_val,
                    data_type=data_type,
                    updated_by_id=actor_id,
                )
                db.add(new_item)

            if old_val != serialized_val:
                audit = AuditLog(
                    institution_id=institution_id,
                    user_id=actor_id,
                    action="DEVICE_BINDING_SETTING_UPDATED",
                    resource_type="institution_settings",
                    old_data=json.dumps({k: old_val}),
                    new_data=json.dumps({k: serialized_val}),
                    severity="info",
                    details=f"Device binding setting '{k}' changed.",
                )
                db.add(audit)

        await db.commit()
        return await DeviceService.get_settings(db, institution_id)

    @staticmethod
    async def safe_disable(
        db: AsyncSession,
        institution_id: int,
        actor_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Safely disables Device Binding for an institution:
        - Immediately stops enforcement in login flows.
        - Preserves all registered device records intact in database.
        - Preserves all user accounts, passwords, and sessions.
        - Preserves all audit history.
        - Does NOT affect licensing or subscriptions.
        """
        updated = await DeviceService.update_settings(
            db,
            institution_id=institution_id,
            updates={
                "enable_device_binding": False,
                "policy_mode": "disabled",
            },
            actor_id=actor_id,
        )

        audit = AuditLog(
            institution_id=institution_id,
            user_id=actor_id,
            action="DEVICE_BINDING_SAFELY_DISABLED",
            resource_type="device_binding",
            severity="warning",
            details="Device-Wise Security Binding safely disabled. Open authentication restored while preserving all device records.",
        )
        db.add(audit)
        await db.commit()
        return updated

    @staticmethod
    async def list_devices(
        db: AsyncSession,
        institution_id: int,
        user_id: Optional[int] = None,
        status_filter: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        List devices registered for an institution, optionally filtered by user or status.
        """
        stmt = (
            select(UserDevice, User.first_name, User.last_name, User.email)
            .join(User, UserDevice.user_id == User.id)
            .where(UserDevice.institution_id == institution_id)
        )
        if user_id:
            stmt = stmt.where(UserDevice.user_id == user_id)
        if status_filter:
            stmt = stmt.where(UserDevice.status == status_filter)

        stmt = stmt.order_by(desc(UserDevice.created_at))
        rows = (await db.execute(stmt)).all()

        results = []
        for dev, fn, ln, email in rows:
            results.append({
                "id": dev.id,
                "institution_id": dev.institution_id,
                "user_id": dev.user_id,
                "user_name": f"{fn} {ln}".strip(),
                "user_email": email,
                "device_fingerprint": dev.device_fingerprint,
                "device_name": dev.device_name,
                "device_type": dev.device_type,
                "browser_info": dev.browser_info,
                "os_info": dev.os_info,
                "ip_address": dev.ip_address,
                "status": dev.status,
                "is_trusted": dev.is_trusted,
                "approved_by_id": dev.approved_by_id,
                "approved_at": dev.approved_at.isoformat() if dev.approved_at else None,
                "last_used_at": dev.last_used_at.isoformat() if dev.last_used_at else None,
                "registered_at": dev.registered_at.isoformat() if dev.registered_at else None,
                "revoked_at": dev.revoked_at.isoformat() if dev.revoked_at else None,
                "revocation_reason": dev.revocation_reason,
            })
        return results

    @staticmethod
    async def register_device(
        db: AsyncSession,
        institution_id: int,
        user_id: int,
        fingerprint: str,
        device_name: str,
        device_type: str = "desktop",
        browser_info: Optional[str] = None,
        os_info: Optional[str] = None,
        ip_address: Optional[str] = None,
        status_override: Optional[str] = None,
        actor_id: Optional[int] = None,
    ) -> UserDevice:
        """
        Register a new device or update an existing registration.
        Validates maximum registered devices limit.
        """
        settings = await DeviceService.get_settings(db, institution_id)
        max_devices = int(settings.get("max_registered_devices", 3))

        # Check existing device
        stmt = select(UserDevice).where(
            UserDevice.institution_id == institution_id,
            UserDevice.user_id == user_id,
            UserDevice.device_fingerprint == fingerprint,
        )
        existing = (await db.execute(stmt)).scalar_one_or_none()

        if existing:
            # Re-activate or update metadata
            existing.device_name = device_name
            existing.device_type = device_type
            if browser_info:
                existing.browser_info = browser_info
            if os_info:
                existing.os_info = os_info
            if ip_address:
                existing.ip_address = ip_address
            if status_override:
                existing.status = status_override
            existing.last_used_at = datetime.now(timezone.utc)
            await db.commit()
            await db.refresh(existing)
            return existing

        # Check active device limit
        count_stmt = select(func.count(UserDevice.id)).where(
            UserDevice.institution_id == institution_id,
            UserDevice.user_id == user_id,
            UserDevice.status.in_(["active", "pending_approval"]),
        )
        active_count = (await db.execute(count_stmt)).scalar() or 0
        if active_count >= max_devices:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Maximum registered devices limit reached ({max_devices}). Please revoke an existing device before registering a new one.",
            )

        # Determine initial status
        if status_override:
            dev_status = status_override
        else:
            approval_policy = settings.get("new_device_approval_policy", "admin_approval")
            dev_status = "active" if approval_policy == "auto_approve" else "pending_approval"

        new_device = UserDevice(
            institution_id=institution_id,
            user_id=user_id,
            device_fingerprint=fingerprint,
            device_name=device_name,
            device_type=device_type,
            browser_info=browser_info,
            os_info=os_info,
            ip_address=ip_address,
            status=dev_status,
            is_trusted=(dev_status == "active"),
            approved_by_id=actor_id if dev_status == "active" else None,
            approved_at=datetime.now(timezone.utc) if dev_status == "active" else None,
            last_used_at=datetime.now(timezone.utc),
        )
        db.add(new_device)

        audit = AuditLog(
            institution_id=institution_id,
            user_id=actor_id or user_id,
            action="DEVICE_REGISTERED",
            resource_type="user_devices",
            new_data=json.dumps({
                "fingerprint": fingerprint[:12] + "...",
                "device_name": device_name,
                "status": dev_status,
            }),
            severity="info",
            details=f"Device '{device_name}' registered for user ID {user_id} with status '{dev_status}'.",
        )
        db.add(audit)
        await db.commit()
        await db.refresh(new_device)
        return new_device

    @staticmethod
    async def approve_device(
        db: AsyncSession,
        device_id: int,
        institution_id: int,
        admin_user: User,
    ) -> UserDevice:
        """
        Approve a pending device registration.
        """
        stmt = select(UserDevice).where(
            UserDevice.id == device_id,
            UserDevice.institution_id == institution_id,
        )
        device = (await db.execute(stmt)).scalar_one_or_none()
        if not device:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found.")

        device.status = "active"
        device.is_trusted = True
        device.approved_by_id = admin_user.id
        device.approved_at = datetime.now(timezone.utc)

        audit = AuditLog(
            institution_id=institution_id,
            user_id=admin_user.id,
            action="DEVICE_APPROVED",
            resource_type="user_devices",
            resource_id=device.id,
            new_data=json.dumps({"status": "active"}),
            severity="info",
            details=f"Device '{device.device_name}' approved by administrator {admin_user.full_name}.",
        )
        db.add(audit)
        await db.commit()
        await db.refresh(device)
        return device

    @staticmethod
    async def revoke_device(
        db: AsyncSession,
        device_id: int,
        institution_id: int,
        actor: User,
        reason: Optional[str] = None,
    ) -> UserDevice:
        """
        Revoke an active device registration.
        """
        stmt = select(UserDevice).where(
            UserDevice.id == device_id,
            UserDevice.institution_id == institution_id,
        )
        device = (await db.execute(stmt)).scalar_one_or_none()
        if not device:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found.")

        # Permission check: if actor is not admin, they can only revoke their own devices
        if actor.role not in ("admin", "principal", "sysadmin", "superadmin") and device.user_id != actor.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to revoke this device.")

        device.status = "revoked"
        device.is_trusted = False
        device.revoked_at = datetime.now(timezone.utc)
        device.revocation_reason = reason or "Revoked by user/administrator"

        audit = AuditLog(
            institution_id=institution_id,
            user_id=actor.id,
            action="DEVICE_REVOKED",
            resource_type="user_devices",
            resource_id=device.id,
            new_data=json.dumps({"status": "revoked", "reason": device.revocation_reason}),
            severity="warning",
            details=f"Device '{device.device_name}' revoked. Reason: {device.revocation_reason}",
        )
        db.add(audit)
        await db.commit()
        await db.refresh(device)
        return device

    @staticmethod
    async def delete_device(
        db: AsyncSession,
        device_id: int,
        institution_id: int,
        actor: User,
    ) -> None:
        """
        Remove a device record while recording audit history.
        """
        stmt = select(UserDevice).where(
            UserDevice.id == device_id,
            UserDevice.institution_id == institution_id,
        )
        device = (await db.execute(stmt)).scalar_one_or_none()
        if not device:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found.")

        if actor.role not in ("admin", "principal", "sysadmin", "superadmin") and device.user_id != actor.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to delete this device.")

        dev_name = device.device_name
        dev_fp = device.device_fingerprint[:12] + "..."

        await db.delete(device)

        audit = AuditLog(
            institution_id=institution_id,
            user_id=actor.id,
            action="DEVICE_DELETED",
            resource_type="user_devices",
            resource_id=device_id,
            old_data=json.dumps({"device_name": dev_name, "fingerprint": dev_fp}),
            severity="warning",
            details=f"Device record '{dev_name}' deleted by user/admin {actor.full_name}.",
        )
        db.add(audit)
        await db.commit()

    @staticmethod
    async def validate_device_login(
        db: AsyncSession,
        user: User,
        device_fingerprint: Optional[str],
        client_info: Optional[Dict[str, Any]] = None,
    ) -> Tuple[bool, str, Dict[str, Any]]:
        """
        Evaluates device binding security policies upon authentication.

        Safety Directives:
        1. If institution has device binding disabled (default): Returns allowed immediately without restrictions.
        2. If user has no institution: Returns allowed.
        3. Supports 4 flexible security modes:
           - disabled: Always allow
           - optional_registration: Allow, record last_used if registered
           - registered_only: Allow registered active devices only; reject others (or audit if shadow mode)
           - admin_approval_required: Require admin approval before access is granted (or audit if shadow mode)
        4. If shadow mode is ON: Allows authentication while logging telemetry for unrecognized devices.
        """
        if not user.institution_id:
            return True, "No institution scope", {}

        settings = await DeviceService.get_settings(db, user.institution_id)

        # 1. Disabled Check (Mandatory Default)
        if not settings.get("enable_device_binding") or settings.get("policy_mode") == "disabled":
            return True, "Device binding is disabled (default).", {"mode": "disabled"}

        policy_mode = settings.get("policy_mode", "disabled")
        shadow_mode = bool(settings.get("shadow_mode", True))
        info = client_info or {}
        ip_addr = info.get("ip_address")
        u_agent = info.get("user_agent", "")

        # 2. Mode: Optional Registration
        if policy_mode == "optional_registration":
            if device_fingerprint:
                stmt = select(UserDevice).where(
                    UserDevice.institution_id == user.institution_id,
                    UserDevice.user_id == user.id,
                    UserDevice.device_fingerprint == device_fingerprint,
                )
                device = (await db.execute(stmt)).scalar_one_or_none()
                if device and device.status == "active":
                    device.last_used_at = datetime.now(timezone.utc)
                    await db.commit()
                elif not device and info.get("device_consent"):
                    try:
                        await DeviceService.register_device(
                            db,
                            institution_id=user.institution_id,
                            user_id=user.id,
                            fingerprint=device_fingerprint,
                            device_name=info.get("device_name", "Workstation"),
                            device_type=info.get("device_type", "desktop"),
                            browser_info=info.get("browser_info"),
                            os_info=info.get("os_info"),
                            ip_address=ip_addr,
                            status_override="active",
                        )
                    except HTTPException:
                        pass
            return True, "Optional device registration active; login permitted.", {"mode": "optional_registration"}

        # 3. Mode: Registered Devices Only
        if policy_mode == "registered_only":
            if not device_fingerprint:
                if shadow_mode:
                    db.add(AuditLog(
                        institution_id=user.institution_id,
                        user_id=user.id,
                        action="DEVICE_LOGIN_SHADOW",
                        resource_type="auth",
                        ip_address=ip_addr,
                        user_agent=u_agent,
                        severity="warning",
                        details="Shadow Mode: Login permitted without device fingerprint under 'registered_only' policy.",
                    ))
                    await db.commit()
                    return True, "Shadow mode permitted unidentifiable device.", {"shadow": True}

                db.add(AuditLog(
                    institution_id=user.institution_id,
                    user_id=user.id,
                    action="UNAUTHORIZED_ACCESS_BLOCKED",
                    resource_type="security_incident",
                    ip_address=ip_addr,
                    user_agent=u_agent,
                    severity="critical",
                    details=f"Blocked login attempt for '{user.email}' from missing hardware fingerprint under registered_only policy.",
                ))
                await db.commit()
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="DEVICE_CONSENT_REQUIRED: Device registration and consent required. Unregistered devices cannot access this account.",
                )

            stmt = select(UserDevice).where(
                UserDevice.institution_id == user.institution_id,
                UserDevice.user_id == user.id,
                UserDevice.device_fingerprint == device_fingerprint,
            )
            device = (await db.execute(stmt)).scalar_one_or_none()

            if not device:
                device_consent = bool(info.get("device_consent", False))
                perm = settings.get("device_management_permissions", "admin_only")
                can_self_register = (perm == "user_allowed") or (user.role in ("admin", "principal", "sysadmin", "staff", "teacher"))

                if device_consent and can_self_register:
                    try:
                        registered_dev = await DeviceService.register_device(
                            db,
                            institution_id=user.institution_id,
                            user_id=user.id,
                            fingerprint=device_fingerprint,
                            device_name=info.get("device_name", "Registered Workstation"),
                            device_type=info.get("device_type", "desktop"),
                            browser_info=info.get("browser_info"),
                            os_info=info.get("os_info"),
                            ip_address=ip_addr,
                            status_override="active",
                        )
                        db.add(AuditLog(
                            institution_id=user.institution_id,
                            user_id=user.id,
                            action="DEVICE_REGISTERED_WITH_CONSENT",
                            resource_type="auth",
                            ip_address=ip_addr,
                            user_agent=u_agent,
                            severity="info",
                            details=f"Device '{registered_dev.device_name}' bound to user account with explicit DPDP Act 2023 consent.",
                        ))
                        await db.commit()
                        return True, "Device registered with consent.", {"device_id": registered_dev.id}
                    except HTTPException as reg_err:
                        raise reg_err

                if not device_consent:
                    if shadow_mode:
                        db.add(AuditLog(
                            institution_id=user.institution_id,
                            user_id=user.id,
                            action="DEVICE_LOGIN_SHADOW",
                            resource_type="auth",
                            ip_address=ip_addr,
                            user_agent=u_agent,
                            severity="warning",
                            details=f"Shadow Mode: Login permitted for unconsented device (fingerprint: {device_fingerprint[:12]}...).",
                        ))
                        await db.commit()
                        return True, "Shadow mode permitted unconsented device.", {"shadow": True}

                    db.add(AuditLog(
                        institution_id=user.institution_id,
                        user_id=user.id,
                        action="UNAUTHORIZED_ACCESS_BLOCKED",
                        resource_type="security_incident",
                        ip_address=ip_addr,
                        user_agent=u_agent,
                        severity="warning",
                        details=f"Login paused for '{user.email}': Device registration & consent confirmation required.",
                    ))
                    await db.commit()
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="DEVICE_CONSENT_REQUIRED: Please confirm your device name and authorize hardware registration to access Prashant Academy.",
                    )

            if device.status != "active":
                if shadow_mode:
                    db.add(AuditLog(
                        institution_id=user.institution_id,
                        user_id=user.id,
                        action="DEVICE_LOGIN_SHADOW",
                        resource_type="auth",
                        ip_address=ip_addr,
                        user_agent=u_agent,
                        severity="warning",
                        details=f"Shadow Mode: Login permitted for revoked/inactive device '{device.device_name}'.",
                    ))
                    await db.commit()
                    return True, "Shadow mode permitted inactive device.", {"shadow": True}

                db.add(AuditLog(
                    institution_id=user.institution_id,
                    user_id=user.id,
                    action="UNAUTHORIZED_ACCESS_BLOCKED",
                    resource_type="security_incident",
                    ip_address=ip_addr,
                    user_agent=u_agent,
                    severity="critical",
                    details=f"Blocked login attempt for '{user.email}' from inactive/revoked device '{device.device_name}'.",
                ))
                await db.commit()
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Access denied: Device '{device.device_name}' has been revoked or is inactive. Contact your administrator.",
                )

            device.last_used_at = datetime.now(timezone.utc)
            await db.commit()
            return True, "Registered device verified.", {"device_id": device.id}

        # 4. Mode: Admin Approval Required
        if policy_mode == "admin_approval_required":
            if not device_fingerprint:
                if shadow_mode:
                    return True, "Shadow mode permitted unidentifiable device.", {"shadow": True}
                db.add(AuditLog(
                    institution_id=user.institution_id,
                    user_id=user.id,
                    action="UNAUTHORIZED_ACCESS_BLOCKED",
                    resource_type="security_incident",
                    ip_address=ip_addr,
                    user_agent=u_agent,
                    severity="critical",
                    details=f"Blocked login attempt for '{user.email}' without device identifier under admin_approval_required policy.",
                ))
                await db.commit()
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="DEVICE_CONSENT_REQUIRED: Device verification required. Missing device identifier.",
                )

            stmt = select(UserDevice).where(
                UserDevice.institution_id == user.institution_id,
                UserDevice.user_id == user.id,
                UserDevice.device_fingerprint == device_fingerprint,
            )
            device = (await db.execute(stmt)).scalar_one_or_none()

            if not device:
                device_consent = bool(info.get("device_consent", False))
                if not device_consent:
                    if shadow_mode:
                        return True, "Shadow mode permitted device.", {"shadow": True}
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="DEVICE_CONSENT_REQUIRED: Please confirm your device name and authorize hardware registration to request access.",
                    )

                # Auto-register as pending approval with explicit user consent
                try:
                    await DeviceService.register_device(
                        db,
                        institution_id=user.institution_id,
                        user_id=user.id,
                        fingerprint=device_fingerprint,
                        device_name=info.get("device_name", "Pending Corporate Workstation"),
                        device_type=info.get("device_type", "desktop"),
                        browser_info=info.get("browser_info"),
                        os_info=info.get("os_info"),
                        ip_address=ip_addr,
                        status_override="pending_approval",
                    )
                except HTTPException:
                    pass

                if shadow_mode:
                    db.add(AuditLog(
                        institution_id=user.institution_id,
                        user_id=user.id,
                        action="DEVICE_LOGIN_SHADOW",
                        resource_type="auth",
                        ip_address=ip_addr,
                        user_agent=u_agent,
                        severity="warning",
                        details="Shadow Mode: New device logged in pending admin approval.",
                    ))
                    await db.commit()
                    return True, "Shadow mode permitted new device pending approval.", {"shadow": True}

                db.add(AuditLog(
                    institution_id=user.institution_id,
                    user_id=user.id,
                    action="UNAUTHORIZED_ACCESS_BLOCKED",
                    resource_type="security_incident",
                    ip_address=ip_addr,
                    user_agent=u_agent,
                    severity="warning",
                    details=f"Login on hold for '{user.email}': Device registration submitted with user consent and queued for admin approval.",
                ))
                await db.commit()
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="DEVICE_PENDING_APPROVAL: Device registration submitted with your consent. Administrator approval is required before you can sign in.",
                )

            if device.status == "pending_approval":
                if shadow_mode:
                    return True, "Shadow mode permitted pending device.", {"shadow": True}
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="This device is pending administrator approval. Please wait for your administrator to approve it.",
                )

            if device.status != "active":
                db.add(AuditLog(
                    institution_id=user.institution_id,
                    user_id=user.id,
                    action="UNAUTHORIZED_ACCESS_BLOCKED",
                    resource_type="security_incident",
                    ip_address=ip_addr,
                    user_agent=u_agent,
                    severity="critical",
                    details=f"Blocked login attempt for '{user.email}' from revoked device '{device.device_name}'.",
                ))
                await db.commit()
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="This device has been revoked or blocked. Contact your institution administrator.",
                )

            device.last_used_at = datetime.now(timezone.utc)
            await db.commit()
            return True, "Approved device verified.", {"device_id": device.id}

        return True, "Policy satisfied.", {}

    @staticmethod
    async def set_device_trust(
        db: AsyncSession,
        device_id: int,
        institution_id: int,
        is_trusted: bool,
        actor: User,
    ) -> UserDevice:
        """
        Updates the trusted status of a registered device.
        """
        stmt = select(UserDevice).where(
            UserDevice.id == device_id,
            UserDevice.institution_id == institution_id,
        )
        device = (await db.execute(stmt)).scalar_one_or_none()
        if not device:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found.")

        device.is_trusted = is_trusted
        trust_label = "Trusted" if is_trusted else "Standard / Untrusted"
        audit = AuditLog(
            institution_id=institution_id,
            user_id=actor.id,
            action="DEVICE_TRUST_UPDATED",
            resource_type="user_devices",
            resource_id=device.id,
            severity="info",
            details=f"Device '{device.device_name}' marked as {trust_label} by {actor.full_name}.",
        )
        db.add(audit)
        await db.commit()
        await db.refresh(device)
        return device

    @staticmethod
    async def terminate_device_session(
        db: AsyncSession,
        device_id: int,
        institution_id: int,
        actor: User,
    ) -> UserDevice:
        """
        Immediately revokes an active device session, marking it revoked and untrusted.
        """
        stmt = select(UserDevice).where(
            UserDevice.id == device_id,
            UserDevice.institution_id == institution_id,
        )
        device = (await db.execute(stmt)).scalar_one_or_none()
        if not device:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found.")

        device.status = "revoked"
        device.is_trusted = False
        device.revoked_at = datetime.now(timezone.utc)
        device.revocation_reason = f"Session terminated immediately by {actor.full_name}"

        audit = AuditLog(
            institution_id=institution_id,
            user_id=actor.id,
            action="SESSION_REVOKED",
            resource_type="security_incident",
            resource_id=device.id,
            severity="warning",
            details=f"Active session for device '{device.device_name}' immediately terminated by {actor.full_name}.",
        )
        db.add(audit)
        await db.commit()
        await db.refresh(device)
        return device

    @staticmethod
    async def terminate_user_sessions(
        db: AsyncSession,
        target_user_id: int,
        institution_id: int,
        actor: User,
    ) -> int:
        """
        Terminates all active device sessions for a target user.
        """
        stmt = select(UserDevice).where(
            UserDevice.user_id == target_user_id,
            UserDevice.institution_id == institution_id,
            UserDevice.status == "active",
        )
        active_devices = (await db.execute(stmt)).scalars().all()
        now = datetime.now(timezone.utc)
        for dev in active_devices:
            dev.status = "revoked"
            dev.is_trusted = False
            dev.revoked_at = now
            dev.revocation_reason = f"All sessions terminated by {actor.full_name}"

        audit = AuditLog(
            institution_id=institution_id,
            user_id=actor.id,
            action="USER_SESSIONS_REVOKED",
            resource_type="security_incident",
            resource_id=target_user_id,
            severity="critical",
            details=f"All active device sessions ({len(active_devices)}) terminated for user ID {target_user_id} by {actor.full_name}.",
        )
        db.add(audit)
        await db.commit()
        return len(active_devices)

    @staticmethod
    async def list_security_incidents(
        db: AsyncSession,
        institution_id: int,
        limit: int = 50,
        severity: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Lists security incidents, unauthorized access attempts, and audit telemetry.
        """
        tracked_actions = [
            "UNAUTHORIZED_ACCESS_BLOCKED",
            "DEVICE_LOGIN_SHADOW",
            "DEVICE_REVOKED",
            "DEVICE_DELETED",
            "SESSION_REVOKED",
            "USER_SESSIONS_REVOKED",
            "DEVICE_TRUST_UPDATED",
            "DEVICE_REGISTERED",
            "DEVICE_APPROVED",
        ]

        stmt = (
            select(AuditLog, User.email, User.first_name, User.last_name)
            .outerjoin(User, AuditLog.user_id == User.id)
            .where(
                AuditLog.institution_id == institution_id,
                AuditLog.action.in_(tracked_actions),
            )
        )
        if severity:
            stmt = stmt.where(AuditLog.severity == severity)

        stmt = stmt.order_by(desc(AuditLog.created_at)).limit(limit)
        rows = (await db.execute(stmt)).all()

        incidents = []
        blocked_count = 0
        shadow_count = 0
        revoked_count = 0

        for audit, email, fn, ln in rows:
            user_name = f"{fn or ''} {ln or ''}".strip() or "System / Unknown"
            if audit.action == "UNAUTHORIZED_ACCESS_BLOCKED":
                blocked_count += 1
            elif audit.action == "DEVICE_LOGIN_SHADOW":
                shadow_count += 1
            elif audit.action in ("SESSION_REVOKED", "DEVICE_REVOKED", "USER_SESSIONS_REVOKED"):
                revoked_count += 1

            incidents.append({
                "id": audit.id,
                "action": audit.action,
                "severity": audit.severity,
                "details": audit.details,
                "ip_address": audit.ip_address,
                "user_agent": audit.user_agent,
                "user_id": audit.user_id,
                "user_email": email,
                "user_name": user_name,
                "created_at": audit.created_at.isoformat() if audit.created_at else None,
            })

        return {
            "metrics": {
                "total_incidents": len(incidents),
                "blocked_attempts": blocked_count,
                "shadow_observations": shadow_count,
                "revoked_sessions": revoked_count,
            },
            "incidents": incidents,
        }
