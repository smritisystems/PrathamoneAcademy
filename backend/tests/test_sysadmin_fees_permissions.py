# /**
#  * @file        test_sysadmin_fees_permissions.py
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
#  * @created     2026-11-05
#  * @updated     2026-11-06
#  *
#  * @description Test suite verifying Sysadmin role & permissions for Fees & Payments, explicit gate for posted payment edits, mandatory reasons, immutable audit logging, receipt integrity, and separate linked refunds.
#  */

import pytest
import uuid
from decimal import Decimal
from datetime import date
from sqlalchemy import select
from app.models.payment import Payment, PaymentReceipt, Refund
from app.models.fee import FeeInvoice
from app.models.user import User, Role
from app.core.security import get_password_hash


@pytest.fixture
async def sysadmin_test_user(db):
    """Creates a dedicated active sysadmin user for test isolation with unique credentials."""
    role_res = await db.execute(select(Role).where(Role.name == "sysadmin"))
    sys_role = role_res.scalar_one_or_none()
    if not sys_role:
        sys_role = Role(name="sysadmin", description="System Administrator")
        db.add(sys_role)
        await db.flush()

    uid = uuid.uuid4().hex[:8]
    user = User(
        username=f"sysadmin_{uid}",
        email=f"sysadmin_{uid}@prashantacademy.edu.in",
        hashed_password=get_password_hash("TestSysAdmin@2026!"),
        first_name="Test",
        last_name="SysAdmin",
        role="sysadmin",
        role_id=sys_role.id,
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@pytest.fixture
async def sysadmin_headers(client, sysadmin_test_user):
    """Obtains authentic JWT bearer headers for test sysadmin."""
    resp = await client.post(
        "/api/v1/auth/login",
        data={"username": sysadmin_test_user.username, "password": "TestSysAdmin@2026!"},
    )
    assert resp.status_code == 200
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_sysadmin_explicit_fees_permissions_and_posted_edit_gate(
    client, sysadmin_headers, sysadmin_test_user
):
    """
    Test 1: Sysadmin can view fee plans and my-permissions.
    Test 2: Explicit 'Edit Posted Payments' is NOT granted initially to sysadmin.
    """
    # Check /api/v1/payments/my-permissions
    perm_res = await client.get("/api/v1/payments/my-permissions", headers=sysadmin_headers)
    assert perm_res.status_code == 200
    perms = perm_res.json()
    assert perms["can_view_all"] is True
    assert perms["can_create_draft"] is True
    assert perms["can_edit_submitted"] is True
    assert perms["can_configure_workflow"] is True
    assert perms["can_process_refund"] is True
    assert perms["can_approve_refund"] is True
    assert perms["can_view_audit"] is True
    # Crucial Requirement 3: can_edit_posted must be False when explicit permission not granted!
    assert perms["can_edit_posted"] is False


@pytest.mark.asyncio
async def test_sysadmin_draft_payment_creation_and_editing(
    client, sysadmin_headers, test_student, test_academic_year, test_fee_invoice, db
):
    """
    Test 3: Sysadmin can create and edit draft payments without impacting balances.
    """
    invoice = test_fee_invoice["invoice"]
    draft_payload = {
        "student_id": test_student.id,
        "academic_year_id": test_academic_year.id,
        "amount": 3000.0,
        "payment_date": str(date.today()),
        "payment_method": "cash",
        "notes": "SysAdmin initial draft test",
        "action": "draft",
        "allocations": [{"invoice_id": invoice.id, "amount": 3000.0}],
    }

    create_res = await client.post("/api/v1/payments/", json=draft_payload, headers=sysadmin_headers)
    assert create_res.status_code == 201
    payment_id = create_res.json()["payment_id"]
    assert create_res.json()["status"] == "draft"

    # Edit Draft: Modify amount without requiring audit reason
    edit_payload = {
        "amount": 3500.0,
        "payment_method": "upi",
        "allocations": [{"invoice_id": invoice.id, "amount": 3500.0}],
        "notes": "SysAdmin updated draft amount",
    }
    update_res = await client.put(f"/api/v1/payments/{payment_id}", json=edit_payload, headers=sysadmin_headers)
    assert update_res.status_code == 200
    assert update_res.json()["status"] == "draft"


@pytest.mark.asyncio
async def test_sysadmin_submitted_payment_edit_requires_reason(
    client, sysadmin_headers, test_student, test_academic_year, test_fee_invoice, db
):
    """
    Test 4: Edits to submitted payments strictly require a mandatory audit reason.
    """
    invoice = test_fee_invoice["invoice"]
    submit_payload = {
        "student_id": test_student.id,
        "academic_year_id": test_academic_year.id,
        "amount": 4000.0,
        "payment_date": str(date.today()),
        "payment_method": "cheque",
        "cheque_number": "CHQ-8899",
        "action": "submit",
        "allocations": [{"invoice_id": invoice.id, "amount": 4000.0}],
    }

    create_res = await client.post("/api/v1/payments/", json=submit_payload, headers=sysadmin_headers)
    assert create_res.status_code == 201
    payment_id = create_res.json()["payment_id"]

    # Attempt edit WITHOUT reason: MUST be rejected with HTTP 400
    bad_edit = {
        "cheque_number": "CHQ-8899-MOD",
        "reason": "",
    }
    fail_res = await client.put(f"/api/v1/payments/{payment_id}", json=bad_edit, headers=sysadmin_headers)
    assert fail_res.status_code == 400
    assert "mandatory audit reason" in fail_res.json()["detail"].lower()

    # Edit WITH reason: Succeeds with HTTP 200
    good_edit = {
        "cheque_number": "CHQ-8899-MOD",
        "reason": "Administrative correction of cheque number discrepancy",
    }
    ok_res = await client.put(f"/api/v1/payments/{payment_id}", json=good_edit, headers=sysadmin_headers)
    assert ok_res.status_code == 200


@pytest.mark.asyncio
async def test_sysadmin_denied_editing_posted_payment_without_explicit_permission(
    client, sysadmin_headers, test_student, test_academic_year, test_fee_invoice, db
):
    """
    Requirement 3: Sysadmin MUST be denied from editing posted payments when explicit
    'Edit Posted Payments' permission is NOT granted (HTTP 403 Forbidden).
    """
    invoice = test_fee_invoice["invoice"]
    post_payload = {
        "student_id": test_student.id,
        "academic_year_id": test_academic_year.id,
        "amount": 5000.0,
        "payment_date": str(date.today()),
        "payment_method": "cash",
        "action": "post",
        "allocations": [{"invoice_id": invoice.id, "amount": 5000.0}],
    }

    # Post payment
    create_res = await client.post("/api/v1/payments/", json=post_payload, headers=sysadmin_headers)
    assert create_res.status_code == 201
    payment_id = create_res.json()["payment_id"]
    assert create_res.json()["status"] in ("posted", "completed")

    # Attempt to edit posted payment as SysAdmin (WITHOUT explicit payments:edit_posted permission)
    edit_payload = {
        "notes": "SysAdmin attempting unauthorized posted payment modification",
        "reason": "Routine correction attempt",
    }
    denied_res = await client.put(f"/api/v1/payments/{payment_id}", json=edit_payload, headers=sysadmin_headers)
    assert denied_res.status_code == 403
    assert "explicit 'edit posted payments' permission is required" in denied_res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_sysadmin_allowed_editing_posted_payment_when_explicit_permission_granted_and_receipt_integrity(
    client, sysadmin_headers, test_student, test_academic_year, test_fee_invoice, db, sysadmin_test_user
):
    """
    Requirements 3, 4, 5, 6:
    - Grant explicit permission via /api/v1/sysadmin/permissions/toggle-edit-posted
    - Sysadmin can now edit posted payment with mandatory reason
    - Minor edit retains receipt number; financial edit generates new sequential receipt
      and marks old receipt superseded without deleting or renumbering historical records.
    - Audit log records actor, before/after snapshot, timestamp, and reason.
    """
    invoice = test_fee_invoice["invoice"]
    post_payload = {
        "student_id": test_student.id,
        "academic_year_id": test_academic_year.id,
        "amount": 6000.0,
        "payment_date": str(date.today()),
        "payment_method": "cash",
        "action": "post",
        "allocations": [{"invoice_id": invoice.id, "amount": 6000.0}],
    }
    create_res = await client.post("/api/v1/payments/", json=post_payload, headers=sysadmin_headers)
    assert create_res.status_code == 201
    payment_id = create_res.json()["payment_id"]
    initial_receipt_number = create_res.json()["receipt_number"]

    # 1. Grant explicit permission to sysadmin
    grant_res = await client.post(
        "/api/v1/sysadmin/permissions/toggle-edit-posted",
        json={"role_name": "sysadmin", "granted": True, "reason": "Authorization for audit testing"},
        headers=sysadmin_headers,
    )
    assert grant_res.status_code == 200
    assert grant_res.json()["edit_posted_granted"] is True

    try:
        # 2. Minor edit on posted payment: changes notes
        minor_payload = {
            "notes": "Verified receipt with accounts cashier counter",
            "reason": "Updating cashier ledger reconciliation notes",
        }
        minor_res = await client.put(f"/api/v1/payments/{payment_id}", json=minor_payload, headers=sysadmin_headers)
        assert minor_res.status_code == 200
        # Requirement 6: Minor edit preserves receipt number
        assert minor_res.json()["receipt_number"] == initial_receipt_number
        assert minor_res.json()["is_superseded"] is False

        # 3. Financial edit on posted payment: changes amount to 7000
        financial_payload = {
            "amount": 7000.0,
            "allocations": [{"invoice_id": invoice.id, "amount": 7000.0}],
            "reason": "Correcting student fee collection undercharge discrepancy",
        }
        fin_res = await client.put(f"/api/v1/payments/{payment_id}", json=financial_payload, headers=sysadmin_headers)
        assert fin_res.status_code == 200
        new_receipt_number = fin_res.json().get("receipt_number") or fin_res.json()["new_receipt_number"]
        assert fin_res.json()["is_superseded"] is True
        assert new_receipt_number != initial_receipt_number

        # Verify in DB: initial receipt is still present (never deleted or silently overwritten!)
        old_rec_res = await db.execute(select(PaymentReceipt).where(PaymentReceipt.receipt_number == initial_receipt_number))
        old_rec = old_rec_res.scalar_one_or_none()
        assert old_rec is not None
        assert old_rec.status == "superseded"
        assert old_rec.superseded_by_receipt_number == new_receipt_number

        # Verify new receipt is valid
        new_rec_res = await db.execute(select(PaymentReceipt).where(PaymentReceipt.receipt_number == new_receipt_number))
        new_rec = new_rec_res.scalar_one_or_none()
        assert new_rec is not None
        assert new_rec.status == "valid"

        # 4. Requirement 5: Check immutable audit history
        audit_res = await client.get(f"/api/v1/payments/{payment_id}/audit-trail", headers=sysadmin_headers)
        assert audit_res.status_code == 200
        logs = audit_res.json()
        assert len(logs) >= 2
        # Check reasons and snapshots are logged
        actions = [l["action"] for l in logs]
        assert "payment_edit_posted_financial" in actions or "payment_edit_posted_minor" in actions
        reasons = [l["reason"] for l in logs if l.get("reason")]
        assert any("undercharge" in r.lower() for r in reasons)

    finally:
        # Revoke explicit permission back to maintain strict security posture
        await client.post(
            "/api/v1/sysadmin/permissions/toggle-edit-posted",
            json={"role_name": "sysadmin", "granted": False, "reason": "Revoking temporary authorization after test"},
            headers=sysadmin_headers,
        )


@pytest.mark.asyncio
async def test_sysadmin_separate_linked_refunds_workflow(
    client, sysadmin_headers, test_student, test_academic_year, test_fee_invoice, db
):
    """
    Requirement 7: Keep refunds as separate transactions linked to the original payment.
    - Refund linked to payment_id
    - Exceeding refundable balance is rejected
    - Processed and tracked in refunds table
    """
    invoice = test_fee_invoice["invoice"]
    post_payload = {
        "student_id": test_student.id,
        "academic_year_id": test_academic_year.id,
        "amount": 8000.0,
        "payment_date": str(date.today()),
        "payment_method": "cash",
        "action": "post",
        "allocations": [{"invoice_id": invoice.id, "amount": 8000.0}],
    }
    create_res = await client.post("/api/v1/payments/", json=post_payload, headers=sysadmin_headers)
    assert create_res.status_code == 201
    payment_id = create_res.json()["payment_id"]

    # Attempt refund exceeding amount (₹9000 > ₹8000): MUST fail with HTTP 400
    exceed_payload = {
        "amount": 9000.0,
        "reason": "Invalid refund request exceeding payment balance",
    }
    fail_refund = await client.post(f"/api/v1/payments/{payment_id}/refunds", json=exceed_payload, headers=sysadmin_headers)
    assert fail_refund.status_code == 400
    assert "exceeds" in fail_refund.json()["detail"].lower()

    # Valid refund of ₹2500: Processed and linked to payment
    valid_payload = {
        "amount": 2500.0,
        "refund_method": "bank_transfer",
        "reference_number": "REF-TXN-101",
        "reason": "Course subject opt-out fee credit refund",
        "process_now": True,
    }
    ok_refund = await client.post(f"/api/v1/payments/{payment_id}/refunds", json=valid_payload, headers=sysadmin_headers)
    assert ok_refund.status_code == 200
    refund_id = ok_refund.json()["refund_id"]

    # Verify separate refund record linked to payment in DB
    ref_db = await db.get(Refund, refund_id)
    assert ref_db is not None
    assert ref_db.payment_id == payment_id
    assert ref_db.amount == Decimal("2500.00")
    assert ref_db.status in ("completed", "requested")


@pytest.mark.asyncio
async def test_sysadmin_fee_workflow_configuration_access(
    client, sysadmin_headers, db
):
    """
    Requirement 2 & 8: Sysadmin can view and configure fee workflow settings with fee_workflow:configure.
    """
    # 1. GET workflow config
    get_res = await client.get("/api/v1/payments/workflow/config", headers=sysadmin_headers)
    assert get_res.status_code == 200
    config = get_res.json()
    assert "workflow_mode" in config

    # 2. PUT workflow config
    update_res = await client.put(
        "/api/v1/payments/workflow/config",
        json={"allow_posted_payment_edits": True, "approval_amount_threshold": 30000.0},
        headers=sysadmin_headers,
    )
    assert update_res.status_code == 200
