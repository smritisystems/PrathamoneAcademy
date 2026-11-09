# /**
#  * @file        test_payment_workflow.py
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
#  * @updated     2026-11-09
#  *
#  * @description Test suite verifying payment workflow lifecycle (Draft, Submitted, Approved, Posted), audited edits, receipt supersession, reprints, and refunds.
#  */

import pytest
from decimal import Decimal
from datetime import date
from sqlalchemy import select
from app.models.payment import Payment, PaymentReceipt, Refund
from app.models.fee import FeeInvoice
from app.models.user import AuditLog


@pytest.mark.asyncio
async def test_payment_draft_lifecycle_and_balance_isolation(
    client, auth_headers, test_student, test_academic_year, test_fee_invoice, db
):
    """
    Requirement 1: Draft payment creation must not alter student fee invoice balance.
    Drafts can be edited freely, then submitted.
    """
    invoice = test_fee_invoice["invoice"]
    payload = {
        "student_id": test_student.id,
        "academic_year_id": test_academic_year.id,
        "amount": 5000.0,
        "payment_date": str(date.today()),
        "payment_method": "cash",
        "notes": "Initial draft collection voucher",
        "action": "draft",
        "allocations": [
            {"invoice_id": invoice.id, "amount": 5000.0}
        ],
    }

    # 1. Create Draft
    res = await client.post("/api/v1/payments/", json=payload, headers=auth_headers)
    assert res.status_code == 201
    data = res.json()
    assert data["status"] == "draft"
    payment_id = data["payment_id"]

    # Verify invoice outstanding is NOT decremented
    inv_res = await db.execute(select(FeeInvoice).where(FeeInvoice.id == invoice.id))
    inv = inv_res.scalar_one()
    assert inv.outstanding_amount == Decimal("24000.00")
    assert inv.paid_amount == Decimal("0.00")

    # 2. Edit Draft freely (e.g. change amount and notes without audit reason)
    update_res = await client.put(
        f"/api/v1/payments/{payment_id}",
        json={
            "amount": 6000.0,
            "notes": "Updated draft notes",
            "allocations": [{"invoice_id": invoice.id, "amount": 6000.0}],
        },
        headers=auth_headers,
    )
    assert update_res.status_code == 200

    # 3. Submit Draft
    submit_res = await client.post(f"/api/v1/payments/{payment_id}/submit", headers=auth_headers)
    assert submit_res.status_code == 200
    assert submit_res.json()["status"] == "submitted"


@pytest.mark.asyncio
async def test_simple_mode_payment_posting(
    client, auth_headers, test_student, test_academic_year, test_fee_invoice, db
):
    """
    Requirement 1 & 2: Simple Mode allows direct posting or post after submission.
    Deducts invoice balance and generates sequential receipt.
    """
    invoice = test_fee_invoice["invoice"]
    payload = {
        "student_id": test_student.id,
        "academic_year_id": test_academic_year.id,
        "amount": 4000.0,
        "payment_date": str(date.today()),
        "payment_method": "upi",
        "transaction_reference": "UPI-12345678",
        "action": "post",
        "allocations": [
            {"invoice_id": invoice.id, "amount": 4000.0}
        ],
    }

    res = await client.post("/api/v1/payments/", json=payload, headers=auth_headers)
    assert res.status_code == 201
    data = res.json()
    assert data["status"] in ("posted", "completed")
    assert "receipt_number" in data
    assert data["receipt_number"].startswith("RCP-")

    # Verify invoice balance decremented
    inv_res = await db.execute(select(FeeInvoice).where(FeeInvoice.id == invoice.id))
    inv = inv_res.scalar_one()
    assert inv.paid_amount == Decimal("4000.00")
    assert inv.outstanding_amount == Decimal("20000.00")


@pytest.mark.asyncio
async def test_standard_erp_mode_approval_gates(
    client, auth_headers, test_student, test_academic_year, test_fee_invoice, db
):
    """
    Requirement 2: Standard ERP Mode enforces approval for amounts exceeding threshold or cheque payments.
    """
    invoice = test_fee_invoice["invoice"]
    # 1. Configure Standard ERP Mode with threshold ₹10,000
    cfg_res = await client.put(
        "/api/v1/payments/workflow/config",
        json={
            "payment_workflow_mode": "standard_erp",
            "erp_approval_amount_threshold": 10000.0,
            "erp_require_approval_methods": ["cheque", "bank_transfer"],
        },
        headers=auth_headers,
    )
    assert cfg_res.status_code == 200

    # 2. Submit payment exceeding ₹10,000 threshold (₹12,000)
    pay_res = await client.post(
        "/api/v1/payments/",
        json={
            "student_id": test_student.id,
            "academic_year_id": test_academic_year.id,
            "amount": 12000.0,
            "payment_date": str(date.today()),
            "payment_method": "cash",
            "action": "submit",
            "allocations": [{"invoice_id": invoice.id, "amount": 12000.0}],
        },
        headers=auth_headers,
    )
    assert pay_res.status_code == 201
    pay_data = pay_res.json()
    payment_id = pay_data["payment_id"]
    assert pay_data["status"] == "submitted"

    # 3. Approve payment
    approve_res = await client.post(f"/api/v1/payments/{payment_id}/approve", headers=auth_headers)
    assert approve_res.status_code == 200
    assert approve_res.json()["status"] == "approved"

    # 4. Post approved payment
    post_res = await client.post(f"/api/v1/payments/{payment_id}/post", headers=auth_headers)
    assert post_res.status_code == 200
    assert post_res.json()["status"] == "posted"

    # Restore Simple Mode
    await client.put(
        "/api/v1/payments/workflow/config",
        json={"payment_workflow_mode": "simple"},
        headers=auth_headers,
    )


@pytest.mark.asyncio
async def test_posted_payment_minor_edit_retains_receipt(
    client, auth_headers, test_student, test_academic_year, test_fee_invoice, db
):
    """
    Requirement 5: Minor corrections on posted payments retain receipt number and record audit reason.
    """
    invoice = test_fee_invoice["invoice"]
    # Create and post payment
    res = await client.post(
        "/api/v1/payments/",
        json={
            "student_id": test_student.id,
            "academic_year_id": test_academic_year.id,
            "amount": 2000.0,
            "payment_date": str(date.today()),
            "payment_method": "cash",
            "notes": "Original note",
            "action": "post",
            "allocations": [{"invoice_id": invoice.id, "amount": 2000.0}],
        },
        headers=auth_headers,
    )
    p_id = res.json()["payment_id"]
    original_rcp = res.json()["receipt_number"]

    # Minor update (notes & reference) with reason
    edit_res = await client.put(
        f"/api/v1/payments/{p_id}",
        json={
            "notes": "Corrected notes for audit compliance",
            "transaction_reference": "TXN-REF-UPDATED",
            "reason": "Administrative correction of remarks",
        },
        headers=auth_headers,
    )
    assert edit_res.status_code == 200
    edit_data = edit_res.json()
    assert edit_data["receipt_number"] == original_rcp
    assert edit_data["is_superseded"] is False

    # Verify audit log exists
    audit_res = await client.get(f"/api/v1/payments/{p_id}/audit-trail", headers=auth_headers)
    assert audit_res.status_code == 200
    logs = audit_res.json()
    assert any("Administrative correction" in str(l["reason"]) for l in logs)


@pytest.mark.asyncio
async def test_posted_payment_financial_edit_supersedes_receipt(
    client, auth_headers, test_student, test_academic_year, test_fee_invoice, db
):
    """
    Requirement 5: Financial or payment-method changes supersede the previous receipt and issue a new one.
    """
    invoice = test_fee_invoice["invoice"]
    # Create initial payment of ₹3,000
    res = await client.post(
        "/api/v1/payments/",
        json={
            "student_id": test_student.id,
            "academic_year_id": test_academic_year.id,
            "amount": 3000.0,
            "payment_date": str(date.today()),
            "payment_method": "cash",
            "action": "post",
            "allocations": [{"invoice_id": invoice.id, "amount": 3000.0}],
        },
        headers=auth_headers,
    )
    p_id = res.json()["payment_id"]
    old_rcp = res.json()["receipt_number"]

    # Financial update: amount corrected to ₹3,500
    edit_res = await client.put(
        f"/api/v1/payments/{p_id}",
        json={
            "amount": 3500.0,
            "allocations": [{"invoice_id": invoice.id, "amount": 3500.0}],
            "reason": "Cash counter recount discrepancy: additional ₹500 verified",
        },
        headers=auth_headers,
    )
    assert edit_res.status_code == 200
    edit_data = edit_res.json()
    assert edit_data["is_superseded"] is True
    assert edit_data["old_receipt_number"] == old_rcp
    assert edit_data["new_receipt_number"] != old_rcp
    assert edit_data["version"] == 2

    # Verify old receipt is marked superseded
    old_rcp_res = await client.get(f"/api/v1/payments/receipts/{old_rcp}", headers=auth_headers)
    assert old_rcp_res.status_code == 200
    old_rcp_data = old_rcp_res.json()
    assert old_rcp_data["is_superseded"] is True
    assert old_rcp_data["superseded_by_receipt_number"] == edit_data["new_receipt_number"]


@pytest.mark.asyncio
async def test_receipt_reprint_and_duplicate_copy(
    client, auth_headers, test_student, test_academic_year, test_fee_invoice, db
):
    """
    Requirement 5: Reprints are marked as duplicate copies with tracked reprint count.
    """
    invoice = test_fee_invoice["invoice"]
    res = await client.post(
        "/api/v1/payments/",
        json={
            "student_id": test_student.id,
            "academic_year_id": test_academic_year.id,
            "amount": 1000.0,
            "payment_date": str(date.today()),
            "payment_method": "cash",
            "action": "post",
            "allocations": [{"invoice_id": invoice.id, "amount": 1000.0}],
        },
        headers=auth_headers,
    )
    rcp_num = res.json()["receipt_number"]

    # Call reprint
    reprint_res = await client.post(
        f"/api/v1/payments/receipts/{rcp_num}/reprint", headers=auth_headers
    )
    assert reprint_res.status_code == 200
    rep_data = reprint_res.json()
    assert rep_data["is_duplicate"] is True
    assert rep_data["reprint_count"] == 1

    # Fetch receipt and verify duplicate metadata
    get_res = await client.get(f"/api/v1/payments/receipts/{rcp_num}", headers=auth_headers)
    assert get_res.status_code == 200
    assert get_res.json()["is_duplicate"] is True
    assert get_res.json()["reprint_count"] == 1


@pytest.mark.asyncio
async def test_refund_workflow_and_balance_integrity(
    client, auth_headers, test_student, test_academic_year, test_fee_invoice, db
):
    """
    Requirement 6: Refunds are linked to the original payment, validated against remaining refundable balance,
    and follow request -> approve -> process lifecycle.
    """
    invoice = test_fee_invoice["invoice"]
    # 1. Post payment of ₹5,000
    res = await client.post(
        "/api/v1/payments/",
        json={
            "student_id": test_student.id,
            "academic_year_id": test_academic_year.id,
            "amount": 5000.0,
            "payment_date": str(date.today()),
            "payment_method": "bank_transfer",
            "action": "post",
            "allocations": [{"invoice_id": invoice.id, "amount": 5000.0}],
        },
        headers=auth_headers,
    )
    p_id = res.json()["payment_id"]

    # 2. Request refund of ₹2,000
    ref_res = await client.post(
        f"/api/v1/payments/{p_id}/refunds",
        json={
            "amount": 2000.0,
            "refund_method": "bank_transfer",
            "reason": "Subject dropped by student",
        },
        headers=auth_headers,
    )
    assert ref_res.status_code == 200
    ref_id = ref_res.json()["refund_id"]
    assert ref_res.json()["status"] == "requested"

    # 3. Attempting to refund ₹4,000 (which exceeds remaining ₹3,000) must fail
    excess_res = await client.post(
        f"/api/v1/payments/{p_id}/refunds",
        json={
            "amount": 4000.0,
            "refund_method": "bank_transfer",
            "reason": "Excess request",
        },
        headers=auth_headers,
    )
    assert excess_res.status_code == 400
    assert "exceeds remaining refundable balance" in excess_res.json()["detail"]

    # 4. Approve refund
    app_res = await client.post(f"/api/v1/payments/refunds/{ref_id}/approve", headers=auth_headers)
    assert app_res.status_code == 200
    assert app_res.json()["status"] == "approved"

    # 5. Process refund
    proc_res = await client.post(f"/api/v1/payments/refunds/{ref_id}/process", headers=auth_headers)
    assert proc_res.status_code == 200
    assert proc_res.json()["status"] == "completed"

    # 6. Verify invoice balance was decremented by refund amount (from ₹5,000 to ₹3,000)
    inv_res = await db.execute(select(FeeInvoice).where(FeeInvoice.id == invoice.id))
    inv = inv_res.scalar_one()
    assert inv.paid_amount == Decimal("3000.00")
    assert inv.outstanding_amount == Decimal("21000.00")
    assert inv.status == "partial"


@pytest.mark.asyncio
async def test_client_idempotency_key_prevents_duplicate_payment(
    client, auth_headers, test_student, test_academic_year, test_fee_invoice, db
):
    """
    Requirement: Submitting identical idempotency_key must return existing transaction
    without duplicating payment rows, receipts, or modifying balances twice.
    """
    invoice = test_fee_invoice["invoice"]
    idem_key = "IDEM-TEST-1001"
    payload = {
        "student_id": test_student.id,
        "academic_year_id": test_academic_year.id,
        "amount": 4000.0,
        "payment_date": str(date.today()),
        "payment_method": "upi",
        "action": "post",
        "idempotency_key": idem_key,
        "allocations": [{"invoice_id": invoice.id, "amount": 4000.0}],
    }

    # 1. First submission
    res1 = await client.post("/api/v1/payments/", json=payload, headers=auth_headers)
    assert res1.status_code == 201
    p_id_1 = res1.json()["payment_id"]
    receipt_1 = res1.json()["receipt_number"]

    # 2. Second identical submission with same idempotency key
    res2 = await client.post("/api/v1/payments/", json=payload, headers=auth_headers)
    assert res2.status_code == 201
    assert "idempotent" in res2.json()["message"].lower()
    assert res2.json()["payment_id"] == p_id_1
    assert res2.json()["receipt_number"] == receipt_1


@pytest.mark.asyncio
async def test_receipt_cancellation_immutable_lifecycle(
    client, auth_headers, test_student, test_academic_year, test_fee_invoice, db
):
    """
    Requirement: Cancelling an issued receipt updates status to 'cancelled', records
    operator and reason, and permanently retains the row without number reuse.
    """
    invoice = test_fee_invoice["invoice"]
    res = await client.post(
        "/api/v1/payments/",
        json={
            "student_id": test_student.id,
            "academic_year_id": test_academic_year.id,
            "amount": 2500.0,
            "payment_date": str(date.today()),
            "payment_method": "cash",
            "action": "post",
            "allocations": [{"invoice_id": invoice.id, "amount": 2500.0}],
        },
        headers=auth_headers,
    )
    assert res.status_code == 201
    rec_num = res.json()["receipt_number"]

    # Cancel receipt
    cancel_res = await client.post(
        f"/api/v1/payments/receipts/{rec_num}/cancel",
        json={"reason": "Instrument damaged during printing"},
        headers=auth_headers,
    )
    assert cancel_res.status_code == 200
    assert cancel_res.json()["status"] == "cancelled"

    # Verify receipt record in DB
    rec_db = (await db.execute(select(PaymentReceipt).where(PaymentReceipt.receipt_number == rec_num))).scalar_one()
    assert rec_db.status == "cancelled"
    assert rec_db.cancellation_reason == "Instrument damaged during printing"
    assert rec_db.cancelled_at is not None


@pytest.mark.asyncio
async def test_financial_period_locking_blocks_mutation(
    client, auth_headers, test_student, test_academic_year, test_fee_invoice, db
):
    """
    Requirement: Modifications on dates falling within closed accounting periods
    must be strictly blocked.
    """
    from app.models.payment import FinancialPeriod
    from datetime import timedelta

    today = date.today()
    period = FinancialPeriod(
        institution_id=1,
        academic_year_id=test_academic_year.id,
        name="Locked Test Month",
        period_type="monthly",
        start_date=today - timedelta(days=5),
        end_date=today + timedelta(days=5),
        is_closed=True,
    )
    db.add(period)
    await db.commit()
    await db.refresh(period)

    try:
        invoice = test_fee_invoice["invoice"]
        # Attempt to post a payment during this closed period
        blocked_res = await client.post(
            "/api/v1/payments/",
            json={
                "student_id": test_student.id,
                "academic_year_id": test_academic_year.id,
                "amount": 1000.0,
                "payment_date": str(today),
                "payment_method": "cash",
                "action": "post",
                "allocations": [{"invoice_id": invoice.id, "amount": 1000.0}],
            },
            headers=auth_headers,
        )
        assert blocked_res.status_code == 400
        assert "closed" in blocked_res.json()["detail"].lower()
    finally:
        # Cleanup test period
        await db.delete(period)
        await db.commit()

