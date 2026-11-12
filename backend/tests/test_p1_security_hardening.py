# /**
#  * @file        test_p1_security_hardening.py
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
#  * @created     2026-11-12
#  * @updated     2026-11-12
#  *
#  * @description Regression security test suite verifying Sprint 2 P1 hardening: JWT token_type/sub validation, fail-closed tenant checks, production secret guard, RBAC/IDOR protection across routers, and tenant-scoped importer queries.
#  */

import uuid
import pytest
from decimal import Decimal
from datetime import date, datetime, timezone
from fastapi import HTTPException
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, _INSECURE_DEFAULT
from app.core.deps import check_institution_access
from app.core.security import create_access_token, create_refresh_token, get_password_hash
from app.models.institution import Institution
from app.models.academic_year import AcademicYear
from app.models.standard import Standard
from app.models.division import Division
from app.models.subject import Subject, CanonicalSubject
from app.models.student import Student
from app.models.user import User, Role
from app.models.enrollment import StudentEnrollment
from app.models.communication import SharedDocumentToken
from app.models.payment import Payment, PaymentAllocation
from app.services.data_importer import validate_and_preview_import


async def _create_user_with_role(
    db: AsyncSession, role_name: str, institution_id: int | None
) -> tuple[User, dict[str, str]]:
    suffix = uuid.uuid4().hex[:8]
    role = (await db.execute(select(Role).where(Role.name == role_name))).scalar_one_or_none()
    if not role:
        role = Role(name=role_name, description=role_name.title())
        db.add(role)
        await db.flush()

    user = User(
        institution_id=institution_id,
        username=f"p1_{role_name}_{suffix}",
        email=f"p1_{role_name}_{suffix}@test.edu.in",
        hashed_password=get_password_hash("TestPass123!"),
        first_name=role_name.title(),
        last_name=f"User{suffix[:4]}",
        role=role_name,
        role_id=role.id,
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    token = create_access_token(data={"sub": str(user.id), "role": user.role})
    return user, {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_core_jwt_refresh_rejected_and_malformed_sub_rejected(
    client: AsyncClient, db: AsyncSession
):
    inst = Institution(name=f"JWT Inst {uuid.uuid4().hex[:6]}", code=f"JW{uuid.uuid4().hex[:5].upper()}")
    db.add(inst)
    await db.commit()
    await db.refresh(inst)

    user, valid_headers = await _create_user_with_role(db, "admin", inst.id)

    # Valid access token works
    ok_res = await client.get("/api/v1/students/", headers=valid_headers)
    assert ok_res.status_code == 200

    # Refresh token must NOT authenticate protected API endpoints
    refresh_token = create_refresh_token(data={"sub": str(user.id), "role": user.role})
    ref_res = await client.get(
        "/api/v1/students/", headers={"Authorization": f"Bearer {refresh_token}"}
    )
    assert ref_res.status_code == 401

    # Non-integer sub must return 401 cleanly
    bad_sub_token = create_access_token(data={"sub": "not-an-integer", "role": "admin"})
    bad_res = await client.get(
        "/api/v1/students/", headers={"Authorization": f"Bearer {bad_sub_token}"}
    )
    assert bad_res.status_code == 401

    # Missing sub must return 401 cleanly
    no_sub_token = create_access_token(data={"role": "admin"})
    no_sub_res = await client.get(
        "/api/v1/students/", headers={"Authorization": f"Bearer {no_sub_token}"}
    )
    assert no_sub_res.status_code == 401


def test_fail_closed_check_institution_access_and_production_secret_guard():
    class DummyUser:
        def __init__(self, role: str, institution_id: int | None):
            self.role = role
            self.institution_id = institution_id

    tenant_admin = DummyUser("admin", 1)
    # Fail-closed when target_institution_id is None for non-sysadmin
    with pytest.raises(HTTPException) as exc:
        check_institution_access(None, tenant_admin)
    assert exc.value.status_code == 403

    # Fail-closed on cross-tenant access
    with pytest.raises(HTTPException) as exc2:
        check_institution_access(2, tenant_admin)
    assert exc2.value.status_code == 403

    # Sysadmin allowed (returns None without raising)
    sys_user = DummyUser("sysadmin", None)
    assert check_institution_access(None, sys_user) is None

    # Settings with DEBUG=False and insecure default SECRET_KEY must exit cleanly
    insecure_settings = Settings(DEBUG=False, SECRET_KEY=_INSECURE_DEFAULT)
    with pytest.raises(SystemExit) as sys_exc:
        insecure_settings.validate_security()
    assert sys_exc.value.code == 1


@pytest.mark.asyncio
async def test_student_rbac_and_idor_blocked_across_hardened_routers(
    client: AsyncClient, db: AsyncSession
):
    suffix = uuid.uuid4().hex[:6]
    inst_a = Institution(name=f"SecInstA {suffix}", code=f"SIA{suffix.upper()}")
    inst_b = Institution(name=f"SecInstB {suffix}", code=f"SIB{suffix.upper()}")
    db.add_all([inst_a, inst_b])
    await db.commit()
    await db.refresh(inst_a)
    await db.refresh(inst_b)

    admin_b, headers_admin_b = await _create_user_with_role(db, "admin", inst_b.id)
    stu_user_a, headers_student_a = await _create_user_with_role(db, "student", inst_a.id)

    # Create two students in inst_a (one linked to stu_user_a, one peer)
    stu_self = Student(
        institution_id=inst_a.id,
        admission_number=f"SELF{suffix}",
        first_name="Self",
        last_name="Student",
        date_of_birth=date(2012, 1, 1),
        gender="female",
        admission_date=date(2025, 6, 1),
    )
    stu_peer = Student(
        institution_id=inst_a.id,
        admission_number=f"PEER{suffix}",
        first_name="Peer",
        last_name="Student",
        date_of_birth=date(2012, 2, 2),
        gender="male",
        admission_date=date(2025, 6, 1),
    )
    db.add_all([stu_self, stu_peer])
    await db.flush()
    stu_user_a.student_id = stu_self.id
    await db.commit()
    await db.refresh(stu_self)
    await db.refresh(stu_peer)

    # 1. Students router: peer profile blocked with 403, self allowed
    assert (await client.get(f"/api/v1/students/{stu_peer.id}", headers=headers_student_a)).status_code == 403
    assert (await client.get(f"/api/v1/students/{stu_self.id}", headers=headers_student_a)).status_code == 200
    assert (await client.get(f"/api/v1/students/{stu_self.id}", headers=headers_admin_b)).status_code == 403

    # 1b. Enrollments router: list only shows self (not peer) for student
    enr_list_res = await client.get("/api/v1/enrollments/", headers=headers_student_a)
    assert enr_list_res.status_code == 200

    # 2. Reports router: audit-summary & academic/fee reports block student and cross-tenant
    assert (await client.get("/api/v1/reports/system/audit-summary", headers=headers_student_a)).status_code == 403
    assert (await client.get("/api/v1/reports/academic/distribution", headers=headers_student_a)).status_code == 403
    assert (
        await client.get(
            f"/api/v1/reports/fee-collection?institution_id={inst_a.id}",
            headers=headers_admin_b,
        )
    ).status_code == 403

    # 3. Fees router: overview & recovery block student; cross-tenant student fee details blocked
    assert (await client.get("/api/v1/fees/overview", headers=headers_student_a)).status_code == 403
    assert (await client.get("/api/v1/fees/former-students-recovery", headers=headers_student_a)).status_code == 403
    assert (
        await client.get(f"/api/v1/fees/students/{stu_peer.id}/fee-details", headers=headers_student_a)
    ).status_code == 403
    assert (
        await client.get(f"/api/v1/fees/students/{stu_self.id}/fee-details", headers=headers_admin_b)
    ).status_code == 403

    # 4. Concessions router: trace & staff endpoints block student
    assert (
        await client.get(f"/api/v1/fees/concessions/trace/student/{stu_peer.id}", headers=headers_student_a)
    ).status_code == 403
    assert (await client.get("/api/v1/fees/concessions/governance-summary", headers=headers_student_a)).status_code == 403

    # 5. Communication router: templates, automation rules block student; shared-doc wrong PIN fails
    assert (await client.get("/api/v1/communication/templates", headers=headers_student_a)).status_code == 403
    assert (await client.get("/api/v1/communication/automation/rules", headers=headers_student_a)).status_code == 403

    token_val = f"tok_{suffix}"
    shared = SharedDocumentToken(
        token=token_val,
        institution_id=inst_a.id,
        document_type="RECEIPT",
        record_id=1,
        created_by_id=admin_b.id,
        access_key="9999",
        expires_at=datetime(2099, 1, 1, tzinfo=timezone.utc),
    )
    db.add(shared)
    await db.commit()
    assert (await client.get(f"/api/v1/communication/shared-doc/{token_val}?pin=0000")).status_code == 403

    # 6. Forms & Staff routers: bulk-render/audit-logs and staff stats block student
    assert (await client.get("/api/v1/forms/audit-logs", headers=headers_student_a)).status_code == 403
    assert (await client.get("/api/v1/staff/dashboard/stats", headers=headers_student_a)).status_code == 403
    assert (
        await client.get(f"/api/v1/settings/profile?institution_id={inst_a.id}", headers=headers_admin_b)
    ).status_code == 403

    # 7. Enrollments & Bulk Receipt Export block student
    assert (await client.get("/api/v1/enrollments/stats", headers=headers_student_a)).status_code == 403
    assert (await client.get("/api/v1/enrollments/unassigned", headers=headers_student_a)).status_code == 403
    assert (
        await client.post(
            "/api/v1/payments/receipts/bulk-pdf-zip",
            json={"receipt_numbers": ["RCPT-1"]},
            headers=headers_student_a,
        )
    ).status_code == 403


@pytest.mark.asyncio
async def test_cross_tenant_isolation_for_payments_divisions_timetable_enrollments_subjects_and_importer(
    client: AsyncClient, db: AsyncSession
):
    suffix = uuid.uuid4().hex[:6]
    inst_a = Institution(name=f"IsoInstA {suffix}", code=f"IIA{suffix.upper()}")
    inst_b = Institution(name=f"IsoInstB {suffix}", code=f"IIB{suffix.upper()}")
    db.add_all([inst_a, inst_b])
    await db.commit()
    await db.refresh(inst_a)
    await db.refresh(inst_b)

    _, headers_a = await _create_user_with_role(db, "admin", inst_a.id)
    _, headers_b = await _create_user_with_role(db, "admin", inst_b.id)
    _, headers_stu_a = await _create_user_with_role(db, "student", inst_a.id)

    ay_a = AcademicYear(
        institution_id=inst_a.id,
        name=f"2026-27-{suffix}",
        start_date=date(2026, 4, 1),
        end_date=date(2027, 3, 31),
        is_current=True,
    )
    std_a = Standard(institution_id=inst_a.id, name=f"StdA-{suffix}", level=10)
    db.add_all([ay_a, std_a])
    await db.commit()
    await db.refresh(ay_a)
    await db.refresh(std_a)

    div_a = Division(standard_id=std_a.id, name=f"BatchA-{suffix}", code=f"BA{suffix}", capacity=30)
    canon_a = CanonicalSubject(institution_id=inst_a.id, name=f"Physics-{suffix}", code=f"PHY{suffix}")
    stu_a = Student(
        institution_id=inst_a.id,
        admission_number=f"ISO{suffix}",
        first_name="Iso",
        last_name="Stu",
        date_of_birth=date(2011, 5, 5),
        gender="male",
        admission_date=date(2026, 6, 1),
    )
    db.add_all([div_a, canon_a, stu_a])
    await db.commit()
    await db.refresh(div_a)
    await db.refresh(canon_a)
    await db.refresh(stu_a)

    sub_a = Subject(standard_id=std_a.id, canonical_subject_id=canon_a.id, name=f"Physics-{suffix}", code=f"PHY{suffix}")
    pay_a = Payment(
        student_id=stu_a.id,
        academic_year_id=ay_a.id,
        amount=Decimal("1000.00"),
        payment_date=date(2026, 6, 5),
        payment_method="cash",
        status="posted",
    )
    db.add_all([sub_a, pay_a])
    await db.commit()
    await db.refresh(sub_a)
    await db.refresh(pay_a)

    # Divisions cross-tenant check
    assert (await client.get(f"/api/v1/divisions/{div_a.id}", headers=headers_b)).status_code == 403
    assert (await client.get(f"/api/v1/divisions/{div_a.id}/roster", headers=headers_b)).status_code == 403

    # Subjects cross-tenant check
    assert (await client.get(f"/api/v1/subjects/{sub_a.id}", headers=headers_b)).status_code == 403
    assert (await client.get(f"/api/v1/subjects/canonical/{canon_a.id}", headers=headers_b)).status_code == 403

    # Timetable cross-tenant create check
    tt_res = await client.post(
        "/api/v1/timetable/",
        json={
            "division_id": div_a.id,
            "subject_id": sub_a.id,
            "day_of_week": "Monday",
            "start_time": "09:00",
            "end_time": "10:00",
        },
        headers=headers_b,
    )
    assert tt_res.status_code == 403

    # Enrollments cross-tenant create check
    enr_res = await client.post(
        "/api/v1/enrollments/",
        json={
            "student_id": stu_a.id,
            "academic_year_id": ay_a.id,
            "standard_id": std_a.id,
            "division_id": div_a.id,
        },
        headers=headers_b,
    )
    assert enr_res.status_code == 403

    # Payments cross-tenant get, receipt & bulk ZIP check
    assert (await client.get(f"/api/v1/payments/{pay_a.id}", headers=headers_b)).status_code == 403
    assert (await client.get(f"/api/v1/payments/{pay_a.id}", headers=headers_a)).status_code == 200
    assert (await client.get(f"/api/v1/divisions/{div_a.id}", headers=headers_a)).status_code == 200
    assert (await client.get(f"/api/v1/subjects/{sub_a.id}", headers=headers_a)).status_code == 200

    # Student blocked from creating timetable/subject/division
    assert (
        await client.post(
            "/api/v1/divisions/",
            json={"standard_id": std_a.id, "name": "HackBatch", "code": "HB1"},
            headers=headers_stu_a,
        )
    ).status_code == 403

    # Importer tenant isolation: importing under inst_b must NOT resolve inst_a admission_number or standard
    preview_stu = await validate_and_preview_import(
        entity_type="students",
        headers=["admission_number", "first_name", "last_name"],
        raw_rows=[[stu_a.admission_number, "CrossTenant", "Attempt"]],
        institution_id=inst_b.id,
        mode="create_only",
        db=db,
    )
    assert preview_stu["row_previews"][0]["is_duplicate"] is False
    assert preview_stu["row_previews"][0]["action"] != "skip_duplicate"

    preview_sub = await validate_and_preview_import(
        entity_type="subjects",
        headers=["Class Name", "Subject Name", "Subject Code"],
        raw_rows=[[std_a.name, "CrossTenant Physics", f"CT-{suffix}"]],
        institution_id=inst_b.id,
        mode="create_only",
        db=db,
    )
    assert any("not found" in err.lower() for err in preview_sub["row_previews"][0]["errors"])

    # Control: under inst_a, same admission_number IS detected as duplicate and std_a resolves cleanly
    preview_a = await validate_and_preview_import(
        entity_type="students",
        headers=["admission_number", "first_name", "last_name"],
        raw_rows=[[stu_a.admission_number, "SameTenant", "Attempt"]],
        institution_id=inst_a.id,
        mode="create_only",
        db=db,
    )
    row_res_a = preview_a["row_previews"][0]
    assert row_res_a["is_duplicate"] is True
    assert row_res_a["action"] == "skip_duplicate"
