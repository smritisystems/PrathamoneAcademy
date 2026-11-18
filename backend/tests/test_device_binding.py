# /**
#  * @file        test_device_binding.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      backend.tests
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
#  * @description Comprehensive test suite for optional device-wise security binding, policy evaluation, multi-tenant isolation, safe disablement, and licensing independence.
#  */

import pytest
import uuid
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.institution import Institution
from app.models.user import User, Role
from app.models.device import UserDevice
from app.models.settings import InstitutionSetting
from app.services.device_service import DeviceService
from app.core.security import create_access_token, get_password_hash


@pytest.fixture
async def sample_admin(db: AsyncSession, test_institution: Institution):
    suffix = uuid.uuid4().hex[:6]
    admin_role = (await db.execute(select(Role).where(Role.name == "admin"))).scalar_one_or_none()
    if not admin_role:
        admin_role = Role(name="admin", description="Administrator")
        db.add(admin_role)
        await db.flush()

    user = User(
        institution_id=test_institution.id,
        username=f"admin_dev_{suffix}",
        email=f"admin_dev_{suffix}@prathamone.com",
        hashed_password=get_password_hash("AdminPass123!"),
        first_name="Admin",
        last_name="Tester",
        role="admin",
        role_id=admin_role.id,
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@pytest.fixture
async def sample_staff(db: AsyncSession, test_institution: Institution):
    suffix = uuid.uuid4().hex[:6]
    staff_role = (await db.execute(select(Role).where(Role.name == "staff"))).scalar_one_or_none()
    if not staff_role:
        staff_role = Role(name="staff", description="Staff Member")
        db.add(staff_role)
        await db.flush()

    user = User(
        institution_id=test_institution.id,
        username=f"staff_dev_{suffix}",
        email=f"staff_dev_{suffix}@prathamone.com",
        hashed_password=get_password_hash("StaffPass123!"),
        first_name="Staff",
        last_name="Tester",
        role="staff",
        role_id=staff_role.id,
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@pytest.mark.asyncio
async def test_default_behavior_device_binding_is_disabled(
    client: AsyncClient, db: AsyncSession, sample_staff: User, test_institution: Institution
):
    """
    Requirement 1: Default Behaviour
    - Device Binding must be DISABLED by default.
    - Existing login and authentication workflows must continue working normally without device headers.
    - Do not enforce device limits or registration when disabled.
    """
    # 1. Verify service defaults
    settings = await DeviceService.get_settings(db, test_institution.id)
    assert settings["enable_device_binding"] is False
    assert settings["policy_mode"] == "disabled"
    assert settings["verification_method"] == "device_fingerprint"
    assert settings["max_registered_devices"] == 3

    # 2. Existing standard OAuth2 login without device headers must succeed seamlessly
    login_res = await client.post(
        "/api/v1/auth/login",
        data={"username": sample_staff.username, "password": "StaffPass123!"},
    )
    assert login_res.status_code == 200
    data = login_res.json()
    assert "access_token" in data
    assert data["user"]["username"] == sample_staff.username


@pytest.mark.asyncio
async def test_admin_updates_device_settings(
    client: AsyncClient, sample_admin: User, sample_staff: User, test_institution: Institution
):
    """
    Requirement 2 & RBAC:
    - Only authorized administrators can modify device binding settings.
    - Non-admin staff attempting to modify settings receives 403 Forbidden.
    """
    admin_token = create_access_token({"sub": str(sample_admin.id), "institution_id": test_institution.id})
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    staff_token = create_access_token({"sub": str(sample_staff.id), "institution_id": test_institution.id})
    staff_headers = {"Authorization": f"Bearer {staff_token}"}

    payload = {
        "enable_device_binding": True,
        "policy_mode": "optional_registration",
        "verification_method": "totp_otp",
        "max_registered_devices": 5,
        "new_device_approval_policy": "auto_approve",
        "otp_verification_required": True,
        "device_management_permissions": "user_self_service",
        "shadow_mode": False,
    }

    # Staff attempt -> 403 Forbidden
    res_staff = await client.put(
        f"/api/v1/security/device-binding/settings?institution_id={test_institution.id}",
        headers=staff_headers,
        json=payload,
    )
    assert res_staff.status_code == 403

    # Admin attempt -> 200 OK
    res_admin = await client.put(
        f"/api/v1/security/device-binding/settings?institution_id={test_institution.id}",
        headers=admin_headers,
        json=payload,
    )
    assert res_admin.status_code == 200
    res_data = res_admin.json()
    assert res_data["settings"]["enable_device_binding"] is True
    assert res_data["settings"]["policy_mode"] == "optional_registration"
    assert res_data["settings"]["max_registered_devices"] == 5
    assert res_data["settings"]["otp_verification_required"] is True


@pytest.mark.asyncio
async def test_flexible_security_policy_modes(
    client: AsyncClient, db: AsyncSession, sample_admin: User, sample_staff: User, test_institution: Institution
):
    """
    Requirement 3: Flexible Security Policies
    1. Disabled: Users can log in from any device.
    2. Optional Registration: Unregistered devices still allowed.
    3. Registered Devices Only: Only registered active devices allowed; unregistered rejected.
    4. Admin Approval Required: New devices require admin approval.
    """
    token = create_access_token({"sub": str(sample_admin.id), "institution_id": test_institution.id})
    headers = {"Authorization": f"Bearer {token}"}
    dev_fp = "fp_macbook_pro_hardware_token_991823"

    # --- Mode 2: Optional Registration ---
    await DeviceService.update_settings(
        db, test_institution.id,
        {"enable_device_binding": True, "policy_mode": "optional_registration", "shadow_mode": False},
        actor_id=sample_admin.id,
    )

    # Login without device headers still succeeds
    login_opt = await client.post(
        "/api/v1/auth/login",
        data={"username": sample_staff.username, "password": "StaffPass123!"},
    )
    assert login_opt.status_code == 200

    # --- Mode 3: Registered Devices Only (strict mode, shadow_mode=False) ---
    await DeviceService.update_settings(
        db, test_institution.id,
        {"enable_device_binding": True, "policy_mode": "registered_only", "shadow_mode": False},
        actor_id=sample_admin.id,
    )

    # Login without registered device is blocked (403 Forbidden)
    login_unreg = await client.post(
        "/api/v1/auth/login",
        data={"username": sample_staff.username, "password": "StaffPass123!"},
        headers={"x-device-fingerprint": "unregistered_fp_device_123"},
    )
    assert login_unreg.status_code == 403
    assert "Device registration required" in login_unreg.json()["detail"] or "Access denied" in login_unreg.json()["detail"]

    # Register device for staff
    reg_res = await client.post(
        f"/api/v1/security/device-binding/devices?institution_id={test_institution.id}",
        headers=headers,
        json={
            "fingerprint": dev_fp,
            "device_name": "Teacher MacBook Pro",
            "device_type": "laptop",
            "user_id": sample_staff.id,
        },
    )
    assert reg_res.status_code == 200

    # Make sure device is approved/active
    device = (
        await db.execute(
            select(UserDevice).where(
                UserDevice.institution_id == test_institution.id,
                UserDevice.device_fingerprint == dev_fp,
            )
        )
    ).scalar_one()
    device.status = "active"
    await db.commit()

    # Login WITH registered device header succeeds!
    login_reg = await client.post(
        "/api/v1/auth/login",
        data={"username": sample_staff.username, "password": "StaffPass123!"},
        headers={"x-device-fingerprint": dev_fp},
    )
    assert login_reg.status_code == 200

    # --- Mode 4: Admin Approval Required ---
    await DeviceService.update_settings(
        db, test_institution.id,
        {"enable_device_binding": True, "policy_mode": "admin_approval_required", "shadow_mode": False},
        actor_id=sample_admin.id,
    )
    new_fp = "brand_new_unapproved_pc_fingerprint_448822"

    # New device login triggers pending approval and returns 403
    login_pending = await client.post(
        "/api/v1/auth/login",
        data={"username": sample_staff.username, "password": "StaffPass123!"},
        headers={"x-device-fingerprint": new_fp, "x-device-name": "Classroom Smartboard"},
    )
    assert login_pending.status_code == 403
    assert "administrator approval" in login_pending.json()["detail"]

    # Find pending device
    pending_dev = (
        await db.execute(
            select(UserDevice).where(
                UserDevice.institution_id == test_institution.id,
                UserDevice.device_fingerprint == new_fp,
            )
        )
    ).scalar_one_or_none()
    assert pending_dev is not None
    assert pending_dev.status == "pending_approval"

    # Admin approves the device
    approve_res = await client.put(
        f"/api/v1/security/device-binding/devices/{pending_dev.id}/approve?institution_id={test_institution.id}",
        headers=headers,
    )
    assert approve_res.status_code == 200

    # Staff can now log in from the newly approved device!
    login_approved = await client.post(
        "/api/v1/auth/login",
        data={"username": sample_staff.username, "password": "StaffPass123!"},
        headers={"x-device-fingerprint": new_fp},
    )
    assert login_approved.status_code == 200


@pytest.mark.asyncio
async def test_institution_level_multi_tenant_isolation(
    client: AsyncClient, db: AsyncSession, sample_admin: User, sample_staff: User
):
    """
    Requirement 4: Institution-Level Isolation
    - Settings configured in Institution A never affect Institution B.
    - Institution B maintains default disabled policy.
    """
    # Create Institution B
    inst_b = Institution(
        name=f"Campus B {uuid.uuid4().hex[:6]}",
        code=f"CAMPUSB_{uuid.uuid4().hex[:6].upper()}",
        city="Thane",
    )
    db.add(inst_b)
    await db.commit()
    await db.refresh(inst_b)

    # Create Staff in Institution B
    suffix = uuid.uuid4().hex[:6]
    staff_b = User(
        institution_id=inst_b.id,
        username=f"staff_b_{suffix}",
        email=f"staff_b_{suffix}@prathamone.com",
        hashed_password=get_password_hash("StaffPass123!"),
        first_name="StaffB",
        last_name="Tester",
        role="staff",
        is_active=True,
    )
    db.add(staff_b)
    await db.commit()

    # Enable strict registered_only on Institution A (sample_admin's institution)
    await DeviceService.update_settings(
        db, sample_admin.institution_id,
        {"enable_device_binding": True, "policy_mode": "registered_only", "shadow_mode": False},
        actor_id=sample_admin.id,
    )

    # Check Institution B's settings are still default disabled
    settings_b = await DeviceService.get_settings(db, inst_b.id)
    assert settings_b["enable_device_binding"] is False
    assert settings_b["policy_mode"] == "disabled"

    # User in Institution B can log in freely without device restriction
    login_b = await client.post(
        "/api/v1/auth/login",
        data={"username": staff_b.username, "password": "StaffPass123!"},
    )
    assert login_b.status_code == 200

    # User in Institution A without registered device is blocked
    login_a = await client.post(
        "/api/v1/auth/login",
        data={"username": sample_staff.username, "password": "StaffPass123!"},
        headers={"x-device-fingerprint": "unregistered_test_fp"},
    )
    assert login_a.status_code == 403


@pytest.mark.asyncio
async def test_safe_disable_behavior(
    client: AsyncClient, db: AsyncSession, sample_admin: User, sample_staff: User, test_institution: Institution
):
    """
    Requirement 5: Safe Disable Behaviour
    When disabled:
    - Stop enforcing device registration requirements immediately.
    - Do NOT delete existing device registrations.
    - Do NOT delete user accounts or authentication records.
    - Preserve device history and audit logs.
    - Restore normal existing login experience.
    """
    token = create_access_token({"sub": str(sample_admin.id), "institution_id": test_institution.id})
    headers = {"Authorization": f"Bearer {token}"}
    dev_fp = "persistent_device_fp_777221"

    # 1. Enable strict registered_only & register a device
    await DeviceService.update_settings(
        db, test_institution.id,
        {"enable_device_binding": True, "policy_mode": "registered_only", "shadow_mode": False},
        actor_id=sample_admin.id,
    )
    await DeviceService.register_device(
        db, test_institution.id, sample_staff.id, dev_fp, "Staff Tablet", "tablet"
    )

    # 2. Call safe disable endpoint
    disable_res = await client.post(
        f"/api/v1/security/device-binding/disable?institution_id={test_institution.id}",
        headers=headers,
    )
    assert disable_res.status_code == 200
    assert disable_res.json()["settings"]["enable_device_binding"] is False
    assert disable_res.json()["settings"]["policy_mode"] == "disabled"

    # 3. VERIFY: Device record still exists in database!
    dev_in_db = (
        await db.execute(
            select(UserDevice).where(
                UserDevice.institution_id == test_institution.id,
                UserDevice.device_fingerprint == dev_fp,
            )
        )
    ).scalar_one_or_none()
    assert dev_in_db is not None
    assert dev_in_db.device_name == "Staff Tablet"

    # 4. VERIFY: Staff user account is intact and active
    user_in_db = (
        await db.execute(select(User).where(User.id == sample_staff.id))
    ).scalar_one_or_none()
    assert user_in_db is not None
    assert user_in_db.is_active is True

    # 5. VERIFY: Immediate open login restored for any device (or no device header)
    login_open = await client.post(
        "/api/v1/auth/login",
        data={"username": sample_staff.username, "password": "StaffPass123!"},
    )
    assert login_open.status_code == 200


@pytest.mark.asyncio
async def test_licensing_independence(
    client: AsyncClient, db: AsyncSession, sample_admin: User, test_institution: Institution
):
    """
    Requirement 6: Licensing Independence
    - Device Binding must remain independent of subscription and license activation.
    - Disabling/enabling device binding must not deactivate licenses, subscriptions, or user accounts.
    """
    admin_token = create_access_token({"sub": str(sample_admin.id), "institution_id": test_institution.id})
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Check license status before
    res_before = await client.get(
        f"/api/v1/license/status?institution_id={test_institution.id}", headers=headers
    )
    assert res_before.status_code == 200
    status_before = res_before.json()

    # Toggle device binding enabled
    await DeviceService.update_settings(
        db, test_institution.id,
        {"enable_device_binding": True, "policy_mode": "registered_only"},
        actor_id=sample_admin.id,
    )

    # Safely disable device binding
    await DeviceService.safe_disable(db, test_institution.id, actor_id=sample_admin.id)

    # Check license status after
    res_after = await client.get(
        f"/api/v1/license/status?institution_id={test_institution.id}", headers=headers
    )
    assert res_after.status_code == 200
    status_after = res_after.json()

    # Licensing mode and product remain 100% identical and independent
    assert status_before["product"] == status_after["product"]
    assert status_before["mode"] == status_after["mode"]
    assert status_before["rollout_stage"] == status_after["rollout_stage"]


@pytest.mark.asyncio
async def test_maximum_devices_limit_enforcement(
    db: AsyncSession, sample_admin: User, sample_staff: User, test_institution: Institution
):
    """
    Test maximum registered devices limit enforcement.
    """
    # Set limit to 2 devices
    await DeviceService.update_settings(
        db, test_institution.id,
        {"enable_device_binding": True, "max_registered_devices": 2},
        actor_id=sample_admin.id,
    )

    # Register device 1 -> Success
    await DeviceService.register_device(
        db, test_institution.id, sample_staff.id, "fp_limit_dev_01", "Device 1", "desktop"
    )

    # Register device 2 -> Success
    await DeviceService.register_device(
        db, test_institution.id, sample_staff.id, "fp_limit_dev_02", "Device 2", "laptop"
    )

    # Register device 3 -> Exceeds limit of 2 -> HTTPException 400
    with pytest.raises(Exception) as exc_info:
        await DeviceService.register_device(
            db, test_institution.id, sample_staff.id, "fp_limit_dev_03", "Device 3", "mobile"
        )
    assert "Maximum registered devices limit reached" in str(exc_info.value)
