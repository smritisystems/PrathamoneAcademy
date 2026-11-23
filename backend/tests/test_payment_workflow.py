# /**
#  * @file        test_payment_workflow.py
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
#  * @created     2026-11-05
#  * @updated     2026-11-23
#  *
#  * @description Test suite verifying payment workflow lifecycle (Draft, Submitted, Approved, Posted), audited edits, receipt supersession, reprints, and refunds.
#  */

import pytest
from decimal import Decimal
from datetime import date
from sqlalchemy import select, delete
from app.models.payment import (
    Payment,
    PaymentAllocation,
    PaymentReceipt,
    Refund,
    RefundAllocation,
)
from app.models.fee import FeeInvoice, FeeInvoiceInstallment
from app.models.fee import StudentFeeAssignment
from app.models.user import AuditLog, User, Role
from app.core.security import get_password_hash, create_access_token


@pytest.fixture
async def reviewer_headers(db, test_institution):
    import random
    suffix = random.randint(100000, 999999)
    role_res = await db.execute(select(Role).where(Role.name == "superadmin"))
    admin_role = role_res.scalar_one_or_none()
    role_id = admin_role.id if admin_role else None

    reviewer = User(
        username=f"reviewer_{suffix}",
        email=f"reviewer_{suffix}@test.com",
        hashed_password=get_password_hash("testpassword"),
        first_name="Reviewer",
        last_name="Admin",
        role="superadmin",
        role_id=role_id,
        institution_id=test_institution.id,
    )
    db.add(reviewer)
    await db.commit()
    await db.refresh(reviewer)
    token = create_access_token(data={"sub": str(reviewer.id)})
    return {"Authorization": f"Bearer {token}"}



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
async def test_invoice_wide_payment_allocates_oldest_installments_first(
    client, auth_headers, test_student, test_academic_year, test_fee_invoice, db
):
    invoice = test_fee_invoice["invoice"]
    await db.execute(delete(FeeInvoiceInstallment).where(FeeInvoiceInstallment.invoice_id == invoice.id))
    await db.flush()
    first = FeeInvoiceInstallment(
        invoice_id=invoice.id,
        installment_number=1,
        description="First due",
        amount=Decimal("10000.00"),
        paid_amount=Decimal("0.00"),
        outstanding_amount=Decimal("10000.00"),
        due_date=date(2026, 1, 1),
        status="unpaid",
    )
    second = FeeInvoiceInstallment(
        invoice_id=invoice.id,
        installment_number=2,
        description="Second due",
        amount=Decimal("14000.00"),
        paid_amount=Decimal("0.00"),
        outstanding_amount=Decimal("14000.00"),
        due_date=date(2026, 2, 1),
        status="unpaid",
    )
    db.add_all([first, second])
    await db.flush()

    response = await client.post(
        "/api/v1/payments/",
        json={
            "student_id": test_student.id,
            "academic_year_id": test_academic_year.id,
            "amount": 12000.0,
            "payment_date": str(date.today()),
            "payment_method": "cash",
            "action": "post",
            "allocations": [{"invoice_id": invoice.id, "amount": 12000.0}],
        },
        headers=auth_headers,
    )
    assert response.status_code == 201

    payment_allocations = (
        await db.execute(
            select(PaymentAllocation)
            .where(PaymentAllocation.payment_id == response.json()["payment_id"])
            .order_by(PaymentAllocation.id)
        )
    ).scalars().all()
    assert [
        (allocation.installment_id, allocation.allocated_amount)
        for allocation in payment_allocations
    ] == [
        (first.id, Decimal("10000.00")),
        (second.id, Decimal("2000.00")),
    ]

    await db.refresh(first)
    await db.refresh(second)
    assert first.outstanding_amount == Decimal("0.00")
    assert second.outstanding_amount == Decimal("12000.00")


@pytest.mark.asyncio
async def test_posting_legacy_invoice_wide_allocation_normalizes_schedule(
    client, auth_headers, test_student, test_academic_year, test_fee_invoice, db
):
    invoice = test_fee_invoice["invoice"]
    await db.execute(delete(FeeInvoiceInstallment).where(FeeInvoiceInstallment.invoice_id == invoice.id))
    await db.flush()

    response = await client.post(
        "/api/v1/payments/",
        json={
            "student_id": test_student.id,
            "academic_year_id": test_academic_year.id,
            "amount": 12000.0,
            "payment_date": str(date.today()),
            "payment_method": "cash",
            "action": "draft",
            "allocations": [{"invoice_id": invoice.id, "amount": 12000.0}],
        },
        headers=auth_headers,
    )
    assert response.status_code == 201
    payment_id = response.json()["payment_id"]

    first = FeeInvoiceInstallment(
        invoice_id=invoice.id,
        installment_number=1,
        description="First due",
        amount=Decimal("10000.00"),
        paid_amount=Decimal("0.00"),
        outstanding_amount=Decimal("10000.00"),
        due_date=date(2026, 1, 1),
        status="unpaid",
    )
    second = FeeInvoiceInstallment(
        invoice_id=invoice.id,
        installment_number=2,
        description="Second due",
        amount=Decimal("14000.00"),
        paid_amount=Decimal("0.00"),
        outstanding_amount=Decimal("14000.00"),
        due_date=date(2026, 2, 1),
        status="unpaid",
    )
    db.add_all([first, second])
    await db.flush()

    submit_response = await client.post(
        f"/api/v1/payments/{payment_id}/submit", headers=auth_headers
    )
    assert submit_response.status_code == 200
    post_response = await client.post(
        f"/api/v1/payments/{payment_id}/post", headers=auth_headers
    )
    assert post_response.status_code == 200

    allocations = (
        await db.execute(
            select(PaymentAllocation)
            .where(PaymentAllocation.payment_id == payment_id)
            .order_by(PaymentAllocation.id)
        )
    ).scalars().all()
    assert [
        (allocation.installment_id, allocation.allocated_amount)
        for allocation in allocations
    ] == [
        (first.id, Decimal("10000.00")),
        (second.id, Decimal("2000.00")),
    ]


@pytest.mark.asyncio
async def test_invoice_creation_persists_required_schedule(
    client, auth_headers, test_fee_invoice, db
):
    existing = test_fee_invoice["invoice"]
    existing.status = "cancelled"
    await db.flush()
    assignment = await db.get(StudentFeeAssignment, existing.assignment_id)

    mismatch_response = await client.post(
        "/api/v1/fees/invoices",
        json={
            "student_id": existing.student_id,
            "assignment_id": existing.assignment_id,
            "academic_year_id": existing.academic_year_id,
            "issue_date": "2026-01-01",
            "installments": [
                {
                    "description": "Incomplete schedule",
                    "due_date": "2026-01-15",
                    "amount": 100.0,
                }
            ],
        },
        headers=auth_headers,
    )
    assert mismatch_response.status_code == 422

    response = await client.post(
        "/api/v1/fees/invoices",
        json={
            "student_id": existing.student_id,
            "assignment_id": existing.assignment_id,
            "academic_year_id": existing.academic_year_id,
            "issue_date": "2026-01-01",
            "installments": [
                {
                    "description": "First installment",
                    "due_date": "2026-01-15",
                    "amount": 12000.0,
                },
                {
                    "description": "Second installment",
                    "due_date": "2026-02-15",
                    "amount": 12000.0,
                },
            ],
        },
        headers=auth_headers,
    )
    assert response.status_code == 201
    invoice_id = response.json()["id"]
    assert response.json()["net_amount"] == 24000.0
    assert len(response.json()["installments"]) == 2
    assert assignment is not None
    assert sum(
        installment["amount"] for installment in response.json()["installments"]
    ) == float(assignment.custom_amount or 24000)

    duplicate_response = await client.post(
        "/api/v1/fees/invoices",
        json={
            "student_id": existing.student_id,
            "assignment_id": existing.assignment_id,
            "academic_year_id": existing.academic_year_id,
            "issue_date": "2026-01-01",
            "installments": [
                {
                    "description": "Incomplete schedule",
                    "due_date": "2026-01-15",
                    "amount": 100.0,
                }
            ],
        },
        headers=auth_headers,
    )
    assert duplicate_response.status_code == 409
    created_invoice = await db.get(FeeInvoice, invoice_id)
    assert created_invoice is not None


@pytest.mark.asyncio
async def test_invoice_list_and_detail_include_student_identity_for_printing(
    client, auth_headers, test_fee_invoice, test_student
):
    invoice = test_fee_invoice["invoice"]

    list_response = await client.get(
        f"/api/v1/fees/invoices?academic_year_id={invoice.academic_year_id}",
        headers=auth_headers,
    )
    assert list_response.status_code == 200
    listed_invoice = next(
        item for item in list_response.json() if item["id"] == invoice.id
    )
    expected_name = " ".join(
        part
        for part in (
            test_student.first_name,
            test_student.middle_name,
            test_student.last_name,
        )
        if part
    )
    assert listed_invoice["student_name"] == expected_name
    assert listed_invoice["admission_number"] == test_student.admission_number

    detail_response = await client.get(
        f"/api/v1/fees/invoices/{invoice.id}",
        headers=auth_headers,
    )
    assert detail_response.status_code == 200
    assert detail_response.json()["student_name"] == expected_name
    assert detail_response.json()["admission_number"] == test_student.admission_number


@pytest.mark.asyncio
async def test_refund_is_proportionally_reconciled_across_payment_invoices(
    client,
    auth_headers,
    reviewer_headers,
    test_student,
    test_academic_year,
    test_fee_invoice,
    db,
):
    first_invoice = test_fee_invoice["invoice"]
    second_invoice = FeeInvoice(
        invoice_number="TEST-REFUND-SECOND",
        student_id=test_student.id,
        assignment_id=first_invoice.assignment_id,
        academic_year_id=test_academic_year.id,
        total_amount=Decimal("12000.00"),
        discount_amount=Decimal("0.00"),
        net_amount=Decimal("12000.00"),
        paid_amount=Decimal("0.00"),
        outstanding_amount=Decimal("12000.00"),
        issue_date=date.today(),
        due_date=date.today(),
        status="unpaid",
    )
    db.add(second_invoice)
    await db.flush()

    payment_response = await client.post(
        "/api/v1/payments/",
        json={
            "student_id": test_student.id,
            "academic_year_id": test_academic_year.id,
            "amount": 6000.0,
            "payment_date": str(date.today()),
            "payment_method": "bank_transfer",
            "action": "post",
            "allocations": [
                {"invoice_id": first_invoice.id, "amount": 2000.0},
                {"invoice_id": second_invoice.id, "amount": 4000.0},
            ],
        },
        headers=auth_headers,
    )
    assert payment_response.status_code == 201
    payment_id = payment_response.json()["payment_id"]

    refund_response = await client.post(
        f"/api/v1/payments/{payment_id}/refunds",
        json={
            "amount": 3000.0,
            "refund_method": "bank_transfer",
            "reason": "Partial refund across invoices",
        },
        headers=auth_headers,
    )
    assert refund_response.status_code == 200
    refund_id = refund_response.json()["refund_id"]

    approval_response = await client.post(
        f"/api/v1/payments/refunds/{refund_id}/approve",
        headers=reviewer_headers,
    )
    assert approval_response.status_code == 200
    process_response = await client.post(
        f"/api/v1/payments/refunds/{refund_id}/process",
        headers=auth_headers,
    )
    assert process_response.status_code == 200

    refund_allocations = (
        await db.execute(
            select(RefundAllocation).where(
                RefundAllocation.refund_id == refund_id
            )
        )
    ).scalars().all()
    assert sorted(allocation.amount for allocation in refund_allocations) == [
        Decimal("1000.00"),
        Decimal("2000.00"),
    ]
    await db.refresh(first_invoice)
    await db.refresh(second_invoice)
    assert first_invoice.paid_amount == Decimal("1000.00")
    assert first_invoice.outstanding_amount == Decimal("23000.00")
    assert second_invoice.paid_amount == Decimal("2000.00")
    assert second_invoice.outstanding_amount == Decimal("10000.00")


@pytest.mark.asyncio
async def test_standard_erp_mode_approval_gates(
    client, auth_headers, reviewer_headers, test_student, test_academic_year, test_fee_invoice, db
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

    # 3. Approve payment by independent reviewer (Segregation of Duties)
    approve_res = await client.post(f"/api/v1/payments/{payment_id}/approve", headers=reviewer_headers)
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
    client, auth_headers, reviewer_headers, test_student, test_academic_year, test_fee_invoice, db
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

    # 4. Approve refund by independent reviewer (Segregation of Duties)
    app_res = await client.post(f"/api/v1/payments/refunds/{ref_id}/approve", headers=reviewer_headers)
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
        institution_id=test_student.institution_id,
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

