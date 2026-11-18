# /**
#  * @file        device_binding.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      backend.app.api.v1.endpoints
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
#  * @description API endpoints for optional device-wise security binding, hardware registration, approvals, and safe disablement.
#  */

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import (
    check_institution_access,
    get_current_active_user,
    require_role,
)
from app.models.user import User
from app.services.device_service import DeviceService

router = APIRouter()


class DeviceSettingsPayload(BaseModel):
    enable_device_binding: Optional[bool] = None
    policy_mode: Optional[str] = Field(
        None,
        description="disabled | optional_registration | registered_only | admin_approval_required",
    )
    verification_method: Optional[str] = Field(
        None,
        description="device_fingerprint | totp_otp | device_fingerprint_and_otp | hardware_token",
    )
    max_registered_devices: Optional[int] = Field(None, ge=1, le=20)
    new_device_approval_policy: Optional[str] = Field(
        None, description="admin_approval | auto_approve | otp_verified"
    )
    otp_verification_required: Optional[bool] = None
    device_management_permissions: Optional[str] = Field(
        None, description="admin_only | user_self_service | admin_and_manager"
    )
    shadow_mode: Optional[bool] = None


class RegisterDevicePayload(BaseModel):
    fingerprint: str = Field(..., min_length=8, max_length=128)
    device_name: str = Field(..., min_length=2, max_length=100)
    device_type: str = Field("desktop", description="desktop | laptop | mobile | tablet | smartboard | other")
    browser_info: Optional[str] = None
    os_info: Optional[str] = None
    ip_address: Optional[str] = None
    user_id: Optional[int] = None


class RevokeDevicePayload(BaseModel):
    reason: Optional[str] = Field(None, max_length=250)


@router.get("/settings")
async def get_device_settings(
    institution_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    target_id = institution_id or current_user.institution_id or 1
    check_institution_access(target_id, current_user)
    settings = await DeviceService.get_settings(db, target_id)
    return {"status": "success", "settings": settings}


@router.put("/settings")
async def update_device_settings(
    payload: DeviceSettingsPayload,
    institution_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin", "principal", "sysadmin")),
):
    target_id = institution_id or current_user.institution_id or 1
    check_institution_access(target_id, current_user)

    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    settings = await DeviceService.update_settings(
        db, institution_id=target_id, updates=updates, actor_id=current_user.id
    )
    return {
        "status": "success",
        "message": "Device binding settings updated successfully.",
        "settings": settings,
    }


@router.post("/disable")
async def safe_disable_device_binding(
    institution_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin", "principal", "sysadmin")),
):
    """
    Safely disables Device-Wise Security Binding:
    - Stops enforcing device registration immediately.
    - Preserves all registered devices in database.
    - Preserves all user accounts, passwords, and sessions.
    - Preserves all audit history.
    - Restores normal login experience immediately.
    - Subscriptions, licenses, and accounts are completely untouched.
    """
    target_id = institution_id or current_user.institution_id or 1
    check_institution_access(target_id, current_user)

    settings = await DeviceService.safe_disable(db, target_id, actor_id=current_user.id)
    return {
        "status": "success",
        "message": "Device binding safely disabled. All device registrations and audit history preserved.",
        "settings": settings,
    }


@router.get("/devices")
async def list_registered_devices(
    institution_id: Optional[int] = Query(None),
    user_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    target_id = institution_id or current_user.institution_id or 1
    check_institution_access(target_id, current_user)

    is_admin = current_user.role in ("admin", "principal", "sysadmin", "superadmin")
    target_user_id = user_id if is_admin else current_user.id

    devices = await DeviceService.list_devices(
        db, institution_id=target_id, user_id=target_user_id, status_filter=status_filter
    )
    return {"status": "success", "count": len(devices), "devices": devices}


@router.post("/devices")
async def register_device(
    payload: RegisterDevicePayload,
    institution_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    target_id = institution_id or current_user.institution_id or 1
    check_institution_access(target_id, current_user)

    is_admin = current_user.role in ("admin", "principal", "sysadmin", "superadmin")
    target_user_id = (payload.user_id if is_admin and payload.user_id else current_user.id)

    device = await DeviceService.register_device(
        db=db,
        institution_id=target_id,
        user_id=target_user_id,
        fingerprint=payload.fingerprint,
        device_name=payload.device_name,
        device_type=payload.device_type,
        browser_info=payload.browser_info,
        os_info=payload.os_info,
        ip_address=payload.ip_address,
        actor_id=current_user.id,
    )
    return {
        "status": "success",
        "message": f"Device '{device.device_name}' registered successfully.",
        "device": {
            "id": device.id,
            "device_name": device.device_name,
            "status": device.status,
            "is_trusted": device.is_trusted,
        },
    }


@router.put("/devices/{device_id}/approve")
async def approve_device(
    device_id: int,
    institution_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin", "principal", "sysadmin")),
):
    target_id = institution_id or current_user.institution_id or 1
    check_institution_access(target_id, current_user)

    device = await DeviceService.approve_device(
        db=db, device_id=device_id, institution_id=target_id, admin_user=current_user
    )
    return {
        "status": "success",
        "message": f"Device '{device.device_name}' approved successfully.",
        "device": {
            "id": device.id,
            "status": device.status,
            "is_trusted": device.is_trusted,
        },
    }


@router.put("/devices/{device_id}/revoke")
async def revoke_device(
    device_id: int,
    payload: Optional[RevokeDevicePayload] = None,
    institution_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    target_id = institution_id or current_user.institution_id or 1
    check_institution_access(target_id, current_user)

    reason = payload.reason if payload else None
    device = await DeviceService.revoke_device(
        db=db,
        device_id=device_id,
        institution_id=target_id,
        actor=current_user,
        reason=reason,
    )
    return {
        "status": "success",
        "message": f"Device '{device.device_name}' revoked successfully.",
        "device": {
            "id": device.id,
            "status": device.status,
            "is_trusted": device.is_trusted,
        },
    }


@router.delete("/devices/{device_id}")
async def delete_device(
    device_id: int,
    institution_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    target_id = institution_id or current_user.institution_id or 1
    check_institution_access(target_id, current_user)

    await DeviceService.delete_device(
        db=db, device_id=device_id, institution_id=target_id, actor=current_user
    )
    return {"status": "success", "message": "Device record removed successfully."}


class DeviceTrustPayload(BaseModel):
    is_trusted: bool


@router.put("/devices/{device_id}/trust")
async def set_device_trust(
    device_id: int,
    payload: DeviceTrustPayload,
    institution_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin", "principal", "sysadmin")),
):
    """
    Toggles trusted device status (Trusted vs Standard / Untrusted).
    """
    target_id = institution_id or current_user.institution_id or 1
    check_institution_access(target_id, current_user)

    device = await DeviceService.set_device_trust(
        db=db,
        device_id=device_id,
        institution_id=target_id,
        is_trusted=payload.is_trusted,
        actor=current_user,
    )
    return {
        "status": "success",
        "message": f"Device trust updated to {'Trusted' if device.is_trusted else 'Standard'}.",
        "device": {
            "id": device.id,
            "device_name": device.device_name,
            "is_trusted": device.is_trusted,
            "status": device.status,
        },
    }


@router.post("/devices/{device_id}/terminate-session")
async def terminate_device_session(
    device_id: int,
    institution_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Immediately terminates active session for a specific device.
    """
    target_id = institution_id or current_user.institution_id or 1
    check_institution_access(target_id, current_user)

    device = await DeviceService.terminate_device_session(
        db=db, device_id=device_id, institution_id=target_id, actor=current_user
    )
    return {
        "status": "success",
        "message": f"Active session for device '{device.device_name}' immediately terminated.",
        "device": {
            "id": device.id,
            "device_name": device.device_name,
            "status": device.status,
            "is_trusted": device.is_trusted,
        },
    }


class TerminateUserSessionsPayload(BaseModel):
    user_id: int


@router.post("/sessions/terminate-user")
async def terminate_user_sessions(
    payload: TerminateUserSessionsPayload,
    institution_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin", "principal", "sysadmin")),
):
    """
    Terminates all active device sessions for a target user account.
    """
    target_id = institution_id or current_user.institution_id or 1
    check_institution_access(target_id, current_user)

    count = await DeviceService.terminate_user_sessions(
        db=db,
        target_user_id=payload.user_id,
        institution_id=target_id,
        actor=current_user,
    )
    return {
        "status": "success",
        "message": f"Terminated {count} active device session(s) for user ID {payload.user_id}.",
        "terminated_count": count,
    }


@router.get("/incidents")
async def list_security_incidents(
    institution_id: Optional[int] = Query(None),
    severity: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin", "principal", "sysadmin")),
):
    """
    Fetches real-time security incidents, unauthorized access attempts, and audit telemetry.
    """
    target_id = institution_id or current_user.institution_id or 1
    check_institution_access(target_id, current_user)

    data = await DeviceService.list_security_incidents(
        db=db, institution_id=target_id, limit=limit, severity=severity
    )
    return {"status": "success", **data}
