# /**
#  * @file        test_transaction_governance.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      backend.tests.test_transaction_governance
#  *
#  * @author      Jawahar R. Mallah
#  * @organization AITDL (AI Technology & Development Lab)
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 AITDL
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-10
#  * @updated     2026-11-10
#  *
#  * @description Test suite verifying Global Transaction Deletion, Cancellation, and Immutable Document Numbering Policy.
#  */

import pytest
from decimal import Decimal
from datetime import date
from sqlalchemy import select
from app.models.payment import Payment, PaymentAllocation, PaymentReceipt, Refund
from app.models.fee import FeeInvoice, FeeInvoiceItem
from app.models.user import User, AuditLog
from app.services.safe_delete_service import SafeDeleteService
from app.services.sequence import (
    generate_next_receipt_number,
    generate_next_invoice_number,
    log_sequence_gap,
)


@pytest.mark.asyncio
async def test_draft_payment_permanent_deletion_allowed(db, client, auth_headers, test_fee_invoice, admin_user):
    """
    POLICY RULE B: Permanent deletion may be allowed ONLY when transaction is an unposted draft
    with zero ledger impact, zero document numbers, and zero dependencies.
    """
    inv = test_fee_invoice["invoice"]
    student = test_fee_invoice["student"]
    ay = test_fee_invoice["academic_year"]

    # 1. Create Draft Payment
    draft_pay = Payment(
        student_id=student.id,
        academic_year_id=ay.id,
        amount=Decimal("5000.00"),
        payment_date=date.today(),
        payment_method="cash",
        status="draft",
        collected_by_id=admin_user.id,
    )
    db.add(draft_pay)
    await db.flush()

    alloc = PaymentAllocation(
        payment_id=draft_pay.id,
        invoice_id=inv.id,
        allocated_amount=Decimal("5000.00"),
    )
    db.add(alloc)
    await db.commit()
    await db.refresh(draft_pay)

    # 2. Verify SafeDeleteService eligibility
    report = await SafeDeleteService.check_eligibility(db, "payment", draft_pay.id, admin_user)
    assert report.is_eligible is True
    assert report.recommended_action == "delete"

    # 3. Call DELETE /api/v1/payments/{payment_id}
    del_resp = await client.delete(f"/api/v1/payments/{draft_pay.id}", headers=auth_headers)
    assert del_resp.status_code == 200
    assert del_resp.json()["success"] is True

    # 4. Verify Payment and Allocations are permanently removed
    check_pay = (await db.execute(select(Payment).where(Payment.id == draft_pay.id))).scalar_one_or_none()
    assert check_pay is None
    check_alloc = (await db.execute(select(PaymentAllocation).where(PaymentAllocation.payment_id == draft_pay.id))).scalar_one_or_none()
    assert check_alloc is None

    # 5. Verify AuditLog was recorded
    audit_stmt = select(AuditLog).where(
        AuditLog.action == "delete_draft_payment",
        AuditLog.resource_id == draft_pay.id,
    )
    audit = (await db.execute(audit_stmt)).scalar_one_or_none()
    assert audit is not None
    assert audit.user_id == admin_user.id


@pytest.mark.asyncio
async def test_posted_payment_permanent_deletion_strictly_blocked(db, client, auth_headers, test_fee_invoice, admin_user):
    """
    POLICY RULE C: Never permanently delete posted transactions.
    Attempting permanent delete must return HTTP 400 with strict explanatory message.
    """
    inv = test_fee_invoice["invoice"]
    student = test_fee_invoice["student"]
    ay = test_fee_invoice["academic_year"]

    # 1. Post a payment
    post_resp = await client.post(
        "/api/v1/payments/",
        json={
            "student_id": student.id,
            "academic_year_id": ay.id,
            "amount": 2000.0,
            "payment_date": str(date.today()),
            "payment_method": "cash",
            "action": "post",
            "allocations": [{"invoice_id": inv.id, "amount": 2000.0}],
        },
        headers=auth_headers,
    )
    assert post_resp.status_code == 201
    pay_data = post_resp.json()
    payment_id = pay_data["payment_id"]
    receipt_number = pay_data.get("receipt_number")

    # 2. Check eligibility via SafeDeleteService
    report = await SafeDeleteService.check_eligibility(db, "payment", payment_id, admin_user)
    assert report.is_eligible is False
    assert report.block_category == "transaction_history"
    assert report.recommended_action == "reversal"
    assert report.reversal_guidance is not None

    # 3. Attempt permanent deletion via DELETE endpoint -> MUST BE BLOCKED
    del_resp = await client.delete(f"/api/v1/payments/{payment_id}", headers=auth_headers)
    assert del_resp.status_code == 400
    err_msg = del_resp.json()["detail"]
    assert "Permanent deletion blocked" in err_msg
    assert "Reversal" in err_msg

    # 4. Verify payment and receipt still exist in DB completely intact
    p = (await db.execute(select(Payment).where(Payment.id == payment_id))).scalar_one_or_none()
    assert p is not None
    assert p.status in ("posted", "completed")
    r = (await db.execute(select(PaymentReceipt).where(PaymentReceipt.payment_id == payment_id))).scalar_one_or_none()
    assert r is not None


@pytest.mark.asyncio
async def test_payment_reversal_workflow(db, client, auth_headers, test_fee_invoice, admin_user):
    """
    POLICY RULE C & E: Reversing a payment preserves the original payment record,
    marks receipt as voided with historical number intact, and restores invoice balances.
    """
    inv = test_fee_invoice["invoice"]
    student = test_fee_invoice["student"]
    ay = test_fee_invoice["academic_year"]

    # 1. Create and post payment
    post_resp = await client.post(
        "/api/v1/payments/",
        json={
            "student_id": student.id,
            "academic_year_id": ay.id,
            "amount": 3000.0,
            "payment_date": str(date.today()),
            "payment_method": "upi",
            "action": "post",
            "allocations": [{"invoice_id": inv.id, "amount": 3000.0}],
        },
        headers=auth_headers,
    )
    assert post_resp.status_code == 201
    payment_id = post_resp.json()["payment_id"]

    # 2. Execute Reversal
    rev_resp = await client.post(
        f"/api/v1/payments/{payment_id}/reverse",
        json={"reason": "Incorrect payment instrument entered"},
        headers=auth_headers,
    )
    assert rev_resp.status_code == 200

    # 3. Verify Payment is marked reversed and NOT deleted
    p = (await db.execute(select(Payment).where(Payment.id == payment_id))).scalar_one_or_none()
    assert p is not None
    assert p.status == "reversed"
    assert p.reversal_reason == "Incorrect payment instrument entered"

    # 4. Verify Receipt is marked voided and retains original receipt number
    receipt = (await db.execute(select(PaymentReceipt).where(PaymentReceipt.payment_id == payment_id))).scalar_one_or_none()
    assert receipt is not None
    assert receipt.status == "voided"
    assert receipt.receipt_number is not None

    # 5. Check eligibility after reversal -> Must still be blocked
    report = await SafeDeleteService.check_eligibility(db, "payment", payment_id, admin_user)
    assert report.is_eligible is False
    assert report.block_category == "transaction_history"


@pytest.mark.asyncio
async def test_cancel_receipt_retains_number_and_warns_refund(db, client, auth_headers, test_fee_invoice, admin_user):
    """
    POLICY RULE D & E: When a receipt is cancelled:
    - Retain its original number.
    - Status becomes cancelled.
    - Explains receipt cancellation alone is not proof of refund.
    """
    inv = test_fee_invoice["invoice"]
    student = test_fee_invoice["student"]
    ay = test_fee_invoice["academic_year"]

    post_resp = await client.post(
        "/api/v1/payments/",
        json={
            "student_id": student.id,
            "academic_year_id": ay.id,
            "amount": 1500.0,
            "payment_date": str(date.today()),
            "payment_method": "cash",
            "action": "post",
            "allocations": [{"invoice_id": inv.id, "amount": 1500.0}],
        },
        headers=auth_headers,
    )
    assert post_resp.status_code == 201
    receipt_num = post_resp.json()["receipt_number"]

    # Cancel the receipt
    cancel_resp = await client.post(
        f"/api/v1/payments/receipts/{receipt_num}/cancel",
        json={"reason": "Clerical error on payment mode"},
        headers=auth_headers,
    )
    assert cancel_resp.status_code == 200
    data = cancel_resp.json()
    assert data["status"] == "cancelled"
    assert data["receipt_number"] == receipt_num
    assert "refund_guidance" in data
    assert "Refund Workflow" in data["refund_guidance"]

    # Verify receipt record in DB retains number
    r = (await db.execute(select(PaymentReceipt).where(PaymentReceipt.receipt_number == receipt_num))).scalar_one_or_none()
    assert r is not None
    assert r.status == "cancelled"
    assert r.cancellation_reason == "Clerical error on payment mode"


@pytest.mark.asyncio
async def test_immutable_numbering_zero_reuse(db, test_institution, test_academic_year, test_student, admin_user):
    """
    POLICY RULE D: Never reuse an issued receipt number. Cancelled and voided documents
    retain their numbers. Next sequence strictly advances.
    """
    # 1. Create a payment to attach the receipt to
    pay = Payment(
        student_id=test_student.id,
        academic_year_id=test_academic_year.id,
        amount=Decimal("1000.00"),
        payment_date=date.today(),
        payment_method="cash",
        status="posted",
        collected_by_id=admin_user.id,
    )
    db.add(pay)
    await db.flush()

    # 2. Generate receipt 1
    r1 = await generate_next_receipt_number(db, institution_id=test_institution.id, academic_year_id=test_academic_year.id)
    rec1 = PaymentReceipt(
        payment_id=pay.id,
        student_id=test_student.id,
        amount=Decimal("1000.00"),
        payment_date=date.today(),
        payment_method="cash",
        receipt_number=r1,
        status="cancelled",  # Marked cancelled!
    )
    db.add(rec1)
    await db.commit()

    # 3. Generate next receipt -> Must NOT reuse r1
    r2 = await generate_next_receipt_number(db, institution_id=test_institution.id, academic_year_id=test_academic_year.id)
    assert r2 != r1

    seq1 = int(r1.split("-")[-1])
    seq2 = int(r2.split("-")[-1])
    assert seq2 == seq1 + 1


@pytest.mark.asyncio
async def test_segregation_of_duties_approval(db, client, test_fee_invoice, admin_user):
    """
    POLICY RULE F: Segregation of Duties - Users cannot approve transactions or refunds
    they submitted or requested themselves.
    """
    from app.core.security import create_access_token

    # 1. Login user
    token = create_access_token(data={"sub": str(admin_user.id)})
    headers = {"Authorization": f"Bearer {token}"}

    inv = test_fee_invoice["invoice"]
    student = test_fee_invoice["student"]
    ay = test_fee_invoice["academic_year"]

    # 2. Submit payment by admin_user
    sub_resp = await client.post(
        "/api/v1/payments/",
        json={
            "student_id": student.id,
            "academic_year_id": ay.id,
            "amount": 2500.0,
            "payment_date": str(date.today()),
            "payment_method": "cheque",
            "action": "submit",
            "allocations": [{"invoice_id": inv.id, "amount": 2500.0}],
        },
        headers=headers,
    )
    assert sub_resp.status_code == 201
    payment_id = sub_resp.json()["payment_id"]

    # 3. Same user attempts to approve their own submitted payment -> HTTP 403
    appr_resp = await client.post(
        f"/api/v1/payments/{payment_id}/approve",
        headers=headers,
    )
    assert appr_resp.status_code == 403
    assert "Segregation of Duties Violation" in appr_resp.json()["detail"]


@pytest.mark.asyncio
async def test_sequential_invoice_numbering_and_cancellation(db, client, auth_headers, test_institution, test_academic_year, test_fee_invoice):
    """
    POLICY RULE D: Fee invoice document numbers follow INV-YYYY-XXXX sequential format.
    Cancelled invoices retain numbers and sequence strictly advances without reuse.
    """
    inv_num_1 = await generate_next_invoice_number(db, institution_id=test_institution.id, academic_year_id=test_academic_year.id)
    assert "INV-" in inv_num_1

    inv = test_fee_invoice["invoice"]
    inv.invoice_number = inv_num_1
    inv.status = "draft"
    await db.commit()

    # Cancel invoice
    cancel_resp = await client.post(
        f"/api/v1/fees/invoices/{inv.id}/cancel",
        json={"reason": "Course package altered before commencement"},
        headers=auth_headers,
    )
    assert cancel_resp.status_code == 200
    assert cancel_resp.json()["status"] == "cancelled"

    # Generate next invoice number -> must not reuse inv_num_1
    inv_num_2 = await generate_next_invoice_number(db, institution_id=test_institution.id, academic_year_id=test_academic_year.id)
    assert inv_num_2 != inv_num_1
    seq1 = int(inv_num_1.split("-")[-1])
    seq2 = int(inv_num_2.split("-")[-1])
    assert seq2 == seq1 + 1
    assert seq2 == seq1 + 1


@pytest.mark.asyncio
async def test_sequence_gap_logging(db, test_institution, admin_user):
    """
    POLICY RULE D: Preserve numbering gaps with an auditable explanation.
    """
    await log_sequence_gap(
        db=db,
        institution_id=test_institution.id,
        document_type="Receipt",
        skipped_number="RCP-2024-0099",
        reason="Print abort during spooling",
        user_id=admin_user.id,
    )

    # Verify audit log row
    stmt = select(AuditLog).where(
        AuditLog.action == "document_number_gap",
        AuditLog.user_id == admin_user.id,
    )
    log = (await db.execute(stmt)).scalar_one_or_none()
    assert log is not None
    assert "RCP-2024-0099" in log.old_data
    assert "Print abort during spooling" in log.details
