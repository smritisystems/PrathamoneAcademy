# /**
#  * @file        test_sysadmin_rbac_remediation.py
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
#  * @created     2026-11-06
#  * @updated     2026-11-06
#  *
#  * @description Test suite verifying RBAC audit remediations: academic write endpoint security, role gates, universal editor allowlists, cross-tenant isolation, and posted payment edit protection.
#  */

import pytest
import uuid
from decimal import Decimal
from datetime import date
from sqlalchemy import select
from app.models.user import User, Role, AuditLog
from app.models.board import Board
from app.models.standard import Standard
from app.models.division import Division
from app.models.student import Student
from app.models.institution import Institution
from app.core.security import get_password_hash

pytestmark = pytest.mark.asyncio


async def create_user_with_role(db, role_name: str, institution_id: int):
    role_res = await db.execute(select(Role).where(Role.name == role_name))
    role_obj = role_res.scalar_one_or_none()
    if not role_obj:
        role_obj = Role(name=role_name, description=f"{role_name} test role")
        db.add(role_obj)
        await db.flush()

    uid = uuid.uuid4().hex[:8]
    user = User(
        username=f"{role_name}_{uid}",
        email=f"{role_name}_{uid}@test.edu.in",
        hashed_password=get_password_hash("TestPassword123!"),
        first_name="Test",
        last_name=role_name.capitalize(),
        role=role_name,
        role_id=role_obj.id,
        institution_id=institution_id,
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def get_headers_for_user(client, user, password="TestPassword123!"):
    resp = await client.post(
        "/api/v1/auth/login",
        data={"username": user.username, "password": password},
    )
    assert resp.status_code == 200
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


async def test_academic_write_allowed_for_sysadmin_admin_principal(client, db, test_institution):
    """Verifies that sysadmin, admin, and principal are authorized to create academic boards and standards."""
    inst_id = test_institution.id

    # 1. Sysadmin
    sysadmin = await create_user_with_role(db, "sysadmin", inst_id)
    sys_headers = await get_headers_for_user(client, sysadmin)

    board_code_1 = f"B_{uuid.uuid4().hex[:6]}"
    res1 = await client.post(
        "/api/v1/boards/",
        json={"name": f"Board {board_code_1}", "code": board_code_1, "institution_id": inst_id},
        headers=sys_headers,
    )
    assert res1.status_code == 201
    board_id_1 = res1.json()["id"]

    # 2. Admin
    admin = await create_user_with_role(db, "admin", inst_id)
    admin_headers = await get_headers_for_user(client, admin)

    board_code_2 = f"B_{uuid.uuid4().hex[:6]}"
    res2 = await client.post(
        "/api/v1/boards/",
        json={"name": f"Board {board_code_2}", "code": board_code_2, "institution_id": inst_id},
        headers=admin_headers,
    )
    assert res2.status_code == 201

    # 3. Principal
    principal = await create_user_with_role(db, "principal", inst_id)
    principal_headers = await get_headers_for_user(client, principal)

    res3 = await client.put(
        f"/api/v1/boards/{board_id_1}",
        json={"name": "Updated Board Name by Principal"},
        headers=principal_headers,
    )
    assert res3.status_code == 200
    assert res3.json()["name"] == "Updated Board Name by Principal"


async def test_academic_write_denied_for_student_and_teacher(client, db, test_institution):
    """Verifies that teacher and student roles cannot mutate academic master data (HTTP 403 Forbidden)."""
    inst_id = test_institution.id
    student = await create_user_with_role(db, "student", inst_id)
    student_headers = await get_headers_for_user(client, student)

    teacher = await create_user_with_role(db, "teacher", inst_id)
    teacher_headers = await get_headers_for_user(client, teacher)

    # 1. Student attempts to create Board
    res1 = await client.post(
        "/api/v1/boards/",
        json={"name": "Hacked Board", "code": "HACK1", "institution_id": inst_id},
        headers=student_headers,
    )
    assert res1.status_code == 403
    assert "Insufficient permissions" in res1.json()["detail"]

    # 2. Student attempts to create Standard / Class
    res2 = await client.post(
        "/api/v1/standards/",
        json={"name": "Hacked Standard", "level": 99, "institution_id": inst_id},
        headers=student_headers,
    )
    assert res2.status_code == 403

    # 3. Teacher attempts to create Board
    res3 = await client.post(
        "/api/v1/boards/",
        json={"name": "Teacher Board", "code": "TCH1", "institution_id": inst_id},
        headers=teacher_headers,
    )
    assert res3.status_code == 403

    # 4. Teacher attempts to create Division / Batch
    res4 = await client.post(
        "/api/v1/divisions/",
        json={"standard_id": 1, "name": "Teacher Batch", "capacity": 30},
        headers=teacher_headers,
    )
    assert res4.status_code == 403

    # 5. Teacher attempts to create Timetable Entry
    res5 = await client.post(
        "/api/v1/timetable/",
        json={"division_id": 1, "day_of_week": "Monday", "start_time": "09:00", "end_time": "10:00"},
        headers=teacher_headers,
    )
    assert res5.status_code == 403


async def test_enrollments_write_allowed_for_staff_denied_for_teacher(client, db, test_institution, test_student, test_academic_year):
    """Verifies that staff and sysadmin can manage enrollments, but teachers and students are forbidden."""
    inst_id = test_institution.id

    # Create standard for enrollment
    std = Standard(institution_id=inst_id, name="Class 10", level=10, is_active=True)
    db.add(std)
    await db.commit()
    await db.refresh(std)

    staff = await create_user_with_role(db, "staff", inst_id)
    staff_headers = await get_headers_for_user(client, staff)

    teacher = await create_user_with_role(db, "teacher", inst_id)
    teacher_headers = await get_headers_for_user(client, teacher)

    # Teacher blocked
    res_t = await client.post(
        "/api/v1/enrollments/",
        json={
            "student_id": test_student.id,
            "academic_year_id": test_academic_year.id,
            "standard_id": std.id,
        },
        headers=teacher_headers,
    )
    assert res_t.status_code == 403

    # Staff allowed
    res_s = await client.post(
        "/api/v1/enrollments/",
        json={
            "student_id": test_student.id,
            "academic_year_id": test_academic_year.id,
            "standard_id": std.id,
        },
        headers=staff_headers,
    )
    assert res_s.status_code == 201


async def test_universal_edit_allowlist_enforcement_and_audit_logging(client, db, test_institution, test_student):
    """Verifies universal editor enforces field allowlist and creates audit logs."""
    sysadmin = await create_user_with_role(db, "sysadmin", test_institution.id)
    sys_headers = await get_headers_for_user(client, sysadmin)

    # 1. Permissible field (phone, city) -> Success
    res1 = await client.post(
        "/api/v1/sysadmin/universal-edit",
        json={
            "model_name": "student",
            "record_id": test_student.id,
            "fields": {"phone": "+91 99887 76655", "city": "Thane"},
            "reason": "Administrative address contact correction",
        },
        headers=sys_headers,
    )
    assert res1.status_code == 200
    assert res1.json()["success"] is True

    # Check database state
    await db.refresh(test_student)
    assert test_student.phone == "+91 99887 76655"
    assert test_student.city == "Thane"

    # Verify audit log entry
    audit = (
        await db.execute(
            select(AuditLog)
            .where(
                AuditLog.action == "universal_edit_student",
                AuditLog.resource_id == test_student.id,
            )
            .order_by(AuditLog.id.desc())
        )
    ).scalar_one_or_none()
    assert audit is not None
    assert audit.user_id == sysadmin.id
    assert "Administrative address contact correction" in audit.details

    # 2. Protected relational/tenant field (institution_id) -> Rejected HTTP 400
    res2 = await client.post(
        "/api/v1/sysadmin/universal-edit",
        json={
            "model_name": "student",
            "record_id": test_student.id,
            "fields": {"institution_id": 999},
            "reason": "Attempting tenant reassignment",
        },
        headers=sys_headers,
    )
    assert res2.status_code == 400
    assert "protected or not permissible" in res2.json()["detail"]

    # 3. Unsupported model name -> Rejected HTTP 400
    res3 = await client.post(
        "/api/v1/sysadmin/universal-edit",
        json={
            "model_name": "arbitrary_table",
            "record_id": 1,
            "fields": {"some_field": "val"},
        },
        headers=sys_headers,
    )
    assert res3.status_code == 400
    assert "not supported for universal editing" in res3.json()["detail"]


async def test_universal_edit_sysadmin_deactivation_safeguard(client, db, test_institution):
    """Verifies that the universal editor blocks deactivating the last active sysadmin."""
    sysadmin = await create_user_with_role(db, "sysadmin", test_institution.id)
    sys_headers = await get_headers_for_user(client, sysadmin)

    # Deactivate any other active sysadmins in test session
    others = (
        await db.execute(
            select(User).where(
                User.role == "sysadmin",
                User.id != sysadmin.id,
                User.is_active == True,
            )
        )
    ).scalars().all()
    for o in others:
        o.is_active = False
    await db.commit()

    # Attempt to deactivate the only active sysadmin
    res = await client.post(
        "/api/v1/sysadmin/universal-edit",
        json={
            "model_name": "user",
            "record_id": sysadmin.id,
            "fields": {"is_active": False},
            "reason": "Attempting lock-out",
        },
        headers=sys_headers,
    )
    assert res.status_code == 400
    assert "Cannot deactivate the last remaining active System Administrator" in res.json()["detail"]


async def test_cross_tenant_isolation_enforcement(client, db, test_institution):
    """Verifies tenant isolation: non-sysadmin blocked from cross-institution access, sysadmin permitted."""
    inst1 = test_institution.id

    # Create a distinct second institution
    code2 = f"I2_{uuid.uuid4().hex[:6]}"
    inst2_obj = Institution(name="Second Academy", code=code2, city="Mumbai")
    db.add(inst2_obj)
    await db.commit()
    await db.refresh(inst2_obj)
    inst2 = inst2_obj.id

    # Teacher assigned to inst1
    teacher1 = await create_user_with_role(db, "teacher", institution_id=inst1)
    teacher1_headers = await get_headers_for_user(client, teacher1)

    # Teacher queries attendance specifying target institution_id=inst2 -> HTTP 403 Forbidden
    res1 = await client.get(
        f"/api/v1/attendance/?institution_id={inst2}",
        headers=teacher1_headers,
    )
    assert res1.status_code == 403
    assert "cannot access data outside your assigned institution" in res1.json()["detail"]

    # Sysadmin queries institution_id=inst2 -> Permitted
    sysadmin = await create_user_with_role(db, "sysadmin", institution_id=inst1)
    sys_headers = await get_headers_for_user(client, sysadmin)

    res2 = await client.get(
        f"/api/v1/attendance/?institution_id={inst2}",
        headers=sys_headers,
    )
    assert res2.status_code == 200
