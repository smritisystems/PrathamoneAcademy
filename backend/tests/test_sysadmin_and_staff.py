# /**
#  * @file        test_sysadmin_and_staff.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      backend.tests
#  *
#  * @author      Jawahar R. Mallah
#  * @organization AITDL (AI Technology & Development Lab)
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 AITDL
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-04
#  * @updated     2026-11-11
#  *
#  * @description Test suite for SysAdmin superuser role, universal edit controls, audit isolation, and Staff module.
#  */

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.models.user import User, Role, AuditLog
from app.models.institution import Institution
from app.models.staff import StaffProfile, TeacherAssignment, StaffAttendance
from app.core.security import create_access_token, get_password_hash


@pytest.fixture
async def sysadmin_user(db: AsyncSession, test_institution: Institution):
    import random
    suffix = random.randint(100000, 999999)
    sys_role = (await db.execute(select(Role).where(Role.name == "sysadmin"))).scalar_one_or_none()
    if not sys_role:
        sys_role = Role(name="sysadmin", description="System Administrator")
        db.add(sys_role)
        await db.flush()

    user = User(
        institution_id=test_institution.id,
        username=f"test_sysadmin_{suffix}",
        email=f"test_sysadmin_{suffix}@example.com",
        hashed_password=get_password_hash("SysAdmin@2026!"),
        first_name="Root",
        last_name="Superuser",
        role="sysadmin",
        role_id=sys_role.id,
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@pytest.fixture
async def teacher_user(db: AsyncSession, test_institution: Institution):
    import random
    suffix = random.randint(100000, 999999)
    user = User(
        institution_id=test_institution.id,
        username=f"test_teacher_{suffix}",
        email=f"test_teacher_{suffix}@example.com",
        hashed_password=get_password_hash("Teacher@2026!"),
        first_name="Test",
        last_name="Faculty",
        role="teacher",
        is_active=True,
    )
    db.add(user)
    await db.flush()

    prof = StaffProfile(
        user_id=user.id,
        institution_id=test_institution.id,
        employee_id=f"TCH-{suffix}",
        staff_type="Teacher",
        department="Academics",
        qualification="M.Sc. Physics",
        specialization="Senior Secondary Physics",
        status="active",
    )
    db.add(prof)
    await db.commit()
    await db.refresh(user)
    return user


@pytest.mark.asyncio
async def test_sysadmin_overview_access(client: AsyncClient, sysadmin_user: User):
    token = create_access_token({"sub": str(sysadmin_user.id)})
    headers = {"Authorization": f"Bearer {token}"}

    res = await client.get("/api/v1/sysadmin/overview", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "operational"
    assert "users_summary" in data
    assert "academic_summary" in data
    assert "security_audit_summary" in data


@pytest.mark.asyncio
async def test_non_sysadmin_forbidden_from_sysadmin_api(client: AsyncClient, teacher_user: User):
    token = create_access_token({"sub": str(teacher_user.id)})
    headers = {"Authorization": f"Bearer {token}"}

    res = await client.get("/api/v1/sysadmin/overview", headers=headers)
    assert res.status_code == 403
    assert "SysAdmin" in res.json()["detail"]


@pytest.mark.asyncio
async def test_universal_edit_and_security_audit(client: AsyncClient, sysadmin_user: User, teacher_user: User):
    token = create_access_token({"sub": str(sysadmin_user.id)})
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "model_name": "user",
        "record_id": teacher_user.id,
        "fields": {"phone": "+91 99999 88888"},
        "reason": "Administrative emergency contact phone verification",
    }

    res = await client.post("/api/v1/sysadmin/universal-edit", json=payload, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "audit_id" in data

    # Verify security audit log contains this action
    audit_res = await client.get("/api/v1/sysadmin/security-audit-logs?is_system_only=true", headers=headers)
    assert audit_res.status_code == 200
    audits = audit_res.json()["items"]
    assert any(a["action"] == "universal_edit_user" for a in audits)


@pytest.mark.asyncio
async def test_staff_directory_and_documents(client: AsyncClient, sysadmin_user: User, teacher_user: User):
    token = create_access_token({"sub": str(sysadmin_user.id)})
    headers = {"Authorization": f"Bearer {token}"}

    # List staff
    list_res = await client.get("/api/v1/staff/", headers=headers)
    assert list_res.status_code == 200
    assert list_res.json()["total"] >= 1

    # Render document
    doc_res = await client.get(
        f"/api/v1/staff/documents-forms/render/monthly_salary_slip?user_id={teacher_user.id}",
        headers=headers,
    )
    assert doc_res.status_code == 200
    data = doc_res.json()
    assert "html_content" in data
    assert "reference_number" in data
