# /**
#  * @file        test_p0_security_lockdown.py
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
#  * @description Negative security regression tests for Sprint 1 P0 lockdown across payments,
#  */

import hashlib
import hmac
import json
import uuid
from datetime import date
from decimal import Decimal

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import create_access_token, get_password_hash
from app.models.academic_year import AcademicYear
from app.models.fee import FeeCategory, FeeInvoice, FeeStructure, StudentFeeAssignment
from app.models.institution import Institution
from app.models.settings import InstitutionSetting
from app.models.student import Student
from app.models.user import Role, User
from app.services import payment_gateway


pytestmark = pytest.mark.asyncio


async def _make_user(
    db: AsyncSession,
    role_name: str,
    institution_id: int | None,
    *,
    student_id: int | None = None,
) -> tuple[User, dict]:
    role_obj = (await db.execute(select(Role).where(Role.name == role_name))).scalar_one_or_none()
    if not role_obj:
        role_obj = Role(name=role_name, description=f"{role_name} role")
        db.add(role_obj)
        await db.flush()

    uid = uuid.uuid4().hex[:8]
    user = User(
        username=f"p0_{role_name}_{uid}",
        email=f"p0_{role_name}_{uid}@test.edu.in",
        hashed_password=get_password_hash("TestPass123!"),
        first_name="Sec",
        last_name=role_name.title(),
        role=role_name,
        role_id=role_obj.id,
        institution_id=institution_id,
        student_id=student_id,
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    token = create_access_token(data={"sub": str(user.id), "role": user.role})
    return user, {"Authorization": f"Bearer {token}"}


async def _make_institution_and_invoice(db: AsyncSession, suffix: str) -> tuple[Institution, Student, FeeInvoice]:
    inst = Institution(
        name=f"Sec Inst {suffix}",
        code=f"SEC{suffix[:5].upper()}",
        is_active=True,
    )
    db.add(inst)
    await db.flush()

    ay = AcademicYear(
        institution_id=inst.id,
        name=f"AY-{suffix}",
        start_date=date(2026, 4, 1),
        end_date=date(2027, 3, 31),
        is_current=True,
        is_active=True,
    )
    db.add(ay)
    await db.flush()

    student = Student(
        institution_id=inst.id,
        admission_number=f"SEC-ADM-{suffix}",
        first_name="Tenant",
        last_name="Student",
        date_of_birth=date(2011, 1, 1),
        gender="female",
        admission_date=date(2026, 4, 1),
        is_active=True,
    )
    db.add(student)
    await db.flush()

    cat = FeeCategory(institution_id=inst.id, name=f"Tuition-{suffix}")
    db.add(cat)
    await db.flush()

    fs = FeeStructure(
        institution_id=inst.id,
        academic_year_id=ay.id,
        category_id=cat.id,
        name=f"Structure-{suffix}",
        amount=Decimal("5000.00"),
    )
    db.add(fs)
    await db.flush()

    assignment = StudentFeeAssignment(
        student_id=student.id,
        fee_structure_id=fs.id,
        academic_year_id=ay.id,
    )
    db.add(assignment)
    await db.flush()

    invoice = FeeInvoice(
        student_id=student.id,
        assignment_id=assignment.id,
        academic_year_id=ay.id,
        invoice_number=f"INV-SEC-{suffix}",
        issue_date=date(2026, 11, 1),
        due_date=date(2026, 12, 1),
        total_amount=Decimal("5000.00"),
        discount_amount=Decimal("0.00"),
        net_amount=Decimal("5000.00"),
        paid_amount=Decimal("0.00"),
        outstanding_amount=Decimal("5000.00"),
        status="pending",
    )
    db.add(invoice)
    await db.commit()
    await db.refresh(inst)
    await db.refresh(student)
    await db.refresh(invoice)
    return inst, student, invoice


# =============================================================================
# 1. PAYMENT GATEWAY P0 LOCKDOWN TESTS
# =============================================================================

async def test_webhook_rejects_missing_or_invalid_hmac(
    client: AsyncClient,
    db: AsyncSession,
    test_institution: Institution,
    test_fee_invoice: dict,
):
    secret = "whsec_live_supersecret_99"
    db.add(InstitutionSetting(
        institution_id=test_institution.id,
        key="razorpay_webhook_secret",
        value=secret,
        category="payment_gateway",
    ))
    await db.commit()

    payload = json.dumps({
        "event": "payment.captured",
        "payload": {
            "payment": {
                "entity": {
                    "id": "pay_fake_001",
                    "order_id": "order_fake_001",
                    "notes": {"invoice_id": str(test_fee_invoice["invoice"].id)},
                }
            }
        },
    }).encode("utf-8")

    # Missing signature -> 401
    res_missing = await client.post("/api/v1/payments/online/webhook", content=payload)
    assert res_missing.status_code == 401

    # Invalid HMAC -> 401
    res_bad = await client.post(
        "/api/v1/payments/online/webhook",
        content=payload,
        headers={"X-Razorpay-Signature": "deadbeef" * 8},
    )
    assert res_bad.status_code == 401

    # Valid HMAC reaches payload parsing without 401
    valid_sig = hmac.new(secret.encode("utf-8"), payload, hashlib.sha256).hexdigest()
    res_ok = await client.post(
        "/api/v1/payments/online/webhook",
        content=payload,
        headers={"X-Razorpay-Signature": valid_sig},
    )
    assert res_ok.status_code != 401


async def test_verify_payment_blocks_test_sig_when_not_debug_and_blocks_tampered_amount_or_idor(
    client: AsyncClient,
    db: AsyncSession,
    monkeypatch,
):
    uid = uuid.uuid4().hex[:6]
    inst_a, student_a, inv_a = await _make_institution_and_invoice(db, f"A{uid}")
    inst_b, student_b, inv_b = await _make_institution_and_invoice(db, f"B{uid}")

    _, student_a_headers = await _make_user(db, "student", inst_a.id, student_id=student_a.id)
    _, admin_b_headers = await _make_user(db, "admin", inst_b.id)
    _, teacher_a_headers = await _make_user(db, "teacher", inst_a.id)

    # Mock signature refused when DEBUG=False
    monkeypatch.setattr(settings, "DEBUG", False)
    assert payment_gateway.verify_razorpay_signature("ord_1", "pay_1", "test_signature_valid", "secret", is_test_mode=True) is False
    assert payment_gateway.verify_razorpay_signature("ord_1", "pay_1", "mock_signature_valid", "secret", is_test_mode=True) is False

    # Re-enable DEBUG for API order verification tests
    monkeypatch.setattr(settings, "DEBUG", True)

    # Teacher cannot initiate online payment order -> 403
    res_teacher = await client.post(
        "/api/v1/payments/online/create-order",
        json={"invoice_id": inv_a.id, "amount": 1000.0},
        headers=teacher_a_headers,
    )
    assert res_teacher.status_code == 403

    # Cross-tenant admin B cannot create order or verify against invoice A -> 403
    res_idor_order = await client.post(
        "/api/v1/payments/online/create-order",
        json={"invoice_id": inv_a.id, "amount": 1000.0},
        headers=admin_b_headers,
    )
    assert res_idor_order.status_code == 403

    # Student A CAN create order for own invoice A, then verify must reject tampered amount
    order_res = await client.post(
        "/api/v1/payments/online/create-order",
        json={"invoice_id": inv_a.id, "amount": 1000.0},
        headers=student_a_headers,
    )
    assert order_res.status_code == 200
    order_id = order_res.json()["order_id"]

    # Tampered amount (500 != 1000) -> 400
    tamper_res = await client.post(
        "/api/v1/payments/online/verify",
        json={
            "invoice_id": inv_a.id,
            "order_id": order_id,
            "payment_id": "pay_tamper_01",
            "signature": "test_signature_valid",
            "amount": 500.0,
        },
        headers=student_a_headers,
    )
    assert tamper_res.status_code == 400

    # Student A cannot verify against invoice B -> 403
    idor_verify = await client.post(
        "/api/v1/payments/online/verify",
        json={
            "invoice_id": inv_b.id,
            "order_id": order_id,
            "payment_id": "pay_idor_01",
            "signature": "test_signature_valid",
            "amount": 1000.0,
        },
        headers=student_a_headers,
    )
    assert idor_verify.status_code == 403

    # Online config must never expose webhook secret
    cfg = await client.get("/api/v1/payments/online/config", headers=admin_b_headers)
    assert cfg.status_code == 200
    assert "razorpay_webhook_secret" not in cfg.json()


# =============================================================================
# 2. LEGACY IMPORT REGISTER & INSTITUTIONS P0 LOCKDOWN TESTS
# =============================================================================

async def test_import_register_and_institutions_lockdown(client: AsyncClient, db: AsyncSession):
    uid = uuid.uuid4().hex[:6]
    inst_a, _, _ = await _make_institution_and_invoice(db, f"IA{uid}")
    inst_b, _, _ = await _make_institution_and_invoice(db, f"IB{uid}")
    _, admin_a_headers = await _make_user(db, "admin", inst_a.id)
    _, student_a_headers = await _make_user(db, "student", inst_a.id)

    # import_register strictly rejects non-sysadmin (even institution admin & student)
    for headers in (admin_a_headers, student_a_headers):
        assert (await client.get("/api/v1/import/fee-register/preview", headers=headers)).status_code == 403
        assert (await client.get("/api/v1/import/fee-register/status", headers=headers)).status_code == 403
        assert (
            await client.post(
                "/api/v1/import/fee-register/execute",
                json={"replace_demo_data": False},
                headers=headers,
            )
        ).status_code == 403

    # Arbitrary file_path rejected even for sysadmin -> 403
    _, sys_headers = await _make_user(db, "sysadmin", inst_a.id)
    bad_path = await client.post(
        "/api/v1/import/fee-register/execute",
        json={"file_path": "/etc/passwd", "replace_demo_data": False},
        headers=sys_headers,
    )
    assert bad_path.status_code == 403

    # institutions: non-sysadmin cannot list other tenants, cannot get inst_b, cannot create, cannot update inst_b
    inst_list = await client.get("/api/v1/institutions/", headers=admin_a_headers)
    assert inst_list.status_code == 200
    returned_ids = [row["id"] for row in inst_list.json()]
    assert returned_ids == [inst_a.id]

    assert (await client.get(f"/api/v1/institutions/{inst_b.id}", headers=admin_a_headers)).status_code == 403
    assert (
        await client.post(
            "/api/v1/institutions/",
            json={"name": "Rogue Inst", "code": f"ROG{uid[:4].upper()}"},
            headers=admin_a_headers,
        )
    ).status_code == 403
    assert (
        await client.put(
            f"/api/v1/institutions/{inst_b.id}",
            json={"name": "Hacked"},
            headers=admin_a_headers,
        )
    ).status_code == 403


# =============================================================================
# 3. TEACHER PAYROLL P0 LOCKDOWN TESTS
# =============================================================================

async def test_teacher_payroll_rbac_and_tenant_isolation(client: AsyncClient, db: AsyncSession):
    uid = uuid.uuid4().hex[:6]
    inst_a, _, _ = await _make_institution_and_invoice(db, f"PA{uid}")
    inst_b, _, _ = await _make_institution_and_invoice(db, f"PB{uid}")

    teacher_a, teacher_a_headers = await _make_user(db, "teacher", inst_a.id)
    teacher_b, _ = await _make_user(db, "teacher", inst_b.id)
    _, student_a_headers = await _make_user(db, "student", inst_a.id)
    _, admin_b_headers = await _make_user(db, "admin", inst_b.id)

    # Students blocked from payroll routes -> 403
    assert (await client.get("/api/v1/teacher-payroll/teachers", headers=student_a_headers)).status_code == 403
    assert (await client.get("/api/v1/teacher-payroll/monthly", headers=student_a_headers)).status_code == 403

    # Teacher cannot modify rates, calculate payroll, or read another teacher's profile/institute reports -> 403
    assert (
        await client.put(
            f"/api/v1/teacher-payroll/profiles/{teacher_a.id}",
            json={"payment_method": "hourly", "hourly_rate": 99999.0},
            headers=teacher_a_headers,
        )
    ).status_code == 403
    assert (
        await client.post(
            "/api/v1/teacher-payroll/monthly/calculate",
            json={"teacher_user_id": teacher_a.id, "month": 11, "year": 2026},
            headers=teacher_a_headers,
        )
    ).status_code == 403
    assert (await client.get(f"/api/v1/teacher-payroll/profiles/{teacher_b.id}", headers=teacher_a_headers)).status_code == 403
    assert (await client.get("/api/v1/teacher-payroll/reports/monthly-register", headers=teacher_a_headers)).status_code == 403

    # Cross-tenant admin B blocked from teacher A profile -> 403
    assert (await client.get(f"/api/v1/teacher-payroll/profiles/{teacher_a.id}", headers=admin_b_headers)).status_code == 403


# =============================================================================
# 4. USERS, HOUSEKEEPING & GOVERNANCE SAFE-DELETE P0 LOCKDOWN TESTS
# =============================================================================

async def test_users_housekeeping_and_governance_lockdown(client: AsyncClient, db: AsyncSession):
    uid = uuid.uuid4().hex[:6]
    inst_a, student_a, _ = await _make_institution_and_invoice(db, f"UA{uid}")
    inst_b, _, _ = await _make_institution_and_invoice(db, f"UB{uid}")

    user_a, admin_a_headers = await _make_user(db, "admin", inst_a.id)
    user_b, admin_b_headers = await _make_user(db, "admin", inst_b.id)
    sys_user, _ = await _make_user(db, "sysadmin", None)
    _, student_a_headers = await _make_user(db, "student", inst_a.id, student_id=student_a.id)

    # 1. Users: Cross-tenant admin cannot read/update/reset/toggle/delete another tenant's or global sysadmin user
    for target_id in (user_a.id, sys_user.id):
        assert (await client.get(f"/api/v1/users/{target_id}", headers=admin_b_headers)).status_code == 403
        assert (await client.put(f"/api/v1/users/{target_id}", json={"first_name": "Pwned"}, headers=admin_b_headers)).status_code == 403
        assert (await client.post(f"/api/v1/users/{target_id}/reset-password", json={}, headers=admin_b_headers)).status_code == 403
        assert (await client.post(f"/api/v1/users/{target_id}/toggle-status", headers=admin_b_headers)).status_code == 403
        assert (await client.delete(f"/api/v1/users/{target_id}", headers=admin_b_headers)).status_code == 403

    # Non-sysadmin cannot escalate own role to sysadmin via POST or PUT
    escalate_post = await client.post(
        "/api/v1/users/",
        json={
            "username": f"rogue_{uid}",
            "email": f"rogue_{uid}@test.edu.in",
            "first_name": "Rogue",
            "last_name": "Sys",
            "role": "sysadmin",
        },
        headers=admin_a_headers,
    )
    assert escalate_post.status_code == 403
    escalate_put = await client.put(
        f"/api/v1/users/{user_a.id}",
        json={"role": "superadmin"},
        headers=admin_a_headers,
    )
    assert escalate_put.status_code == 403

    # 2. Housekeeping: tenant-level admin blocked from cluster DB backups/restore/vacuum
    assert (await client.get("/api/v1/housekeeping/backups", headers=admin_a_headers)).status_code == 403
    assert (await client.post("/api/v1/housekeeping/backups", json={"label": "rogue"}, headers=admin_a_headers)).status_code == 403
    assert (await client.post("/api/v1/housekeeping/maintenance/vacuum", json={}, headers=admin_a_headers)).status_code == 403

    # 3. Governance Safe Delete: students blocked on /check -> 403; cross-tenant admin blocked -> 403
    assert (
        await client.get(
            "/api/v1/governance/safe-delete/check",
            params={"entity_type": "student", "entity_id": student_a.id},
            headers=student_a_headers,
        )
    ).status_code == 403
    assert (
        await client.get(
            "/api/v1/governance/safe-delete/check",
            params={"entity_type": "student", "entity_id": student_a.id},
            headers=admin_b_headers,
        )
    ).status_code == 403
    assert (
        await client.post(
            "/api/v1/governance/safe-delete/deactivate",
            json={"entity_type": "student", "entity_id": student_a.id, "reason": "cross-tenant test"},
            headers=admin_b_headers,
        )
    ).status_code == 403
