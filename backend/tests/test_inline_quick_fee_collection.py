# /**
#  * @file        test_inline_quick_fee_collection.py
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
#  * @created     2026-11-25
#  * @updated     2026-11-26
#  *
#  * @description End-to-end backend tests for Inline Quick Fee Collection & Receipt Generation workflows.
#  */

import random
from datetime import date
from decimal import Decimal
import pytest
from sqlalchemy import select, func

from app.core.security import create_access_token, get_password_hash
from app.models.academic_year import AcademicYear
from app.models.board import Board
from app.models.division import Division
from app.models.enrollment import StudentEnrollment
from app.models.fee import (
    FeeCategory,
    FeeInvoice,
    FeeInvoiceInstallment,
    FeeInvoiceItem,
    FeeStructure,
    StudentFeeAssignment,
)
from app.models.payment import Payment, PaymentReceipt
from app.models.standard import Standard
from app.models.student import Student
from app.models.user import AuditLog, Role, User

pytestmark = pytest.mark.asyncio


async def _setup_scheduled_student_ledger(db, test_institution, test_academic_year):
    suffix = random.randint(10000, 99999)
    board = Board(institution_id=test_institution.id, name=f"ICSE-{suffix}", code=f"IC{suffix}")
    db.add(board)
    await db.flush()

    std = Standard(institution_id=test_institution.id, name=f"Class IX-{suffix}", level=9)
    db.add(std)
    await db.flush()

    div = Division(standard_id=std.id, board_id=board.id, name=f"Batch-{suffix}", capacity=40)
    db.add(div)
    await db.flush()

    student = Student(
        institution_id=test_institution.id,
        admission_number=f"PA-2026-{suffix}",
        first_name="Aaradhya",
        last_name="Verma",
        date_of_birth=date(2012, 5, 10),
        gender="female",
        admission_date=date(2026, 3, 1),
        is_active=True,
    )
    db.add(student)
    await db.flush()

    enr = StudentEnrollment(
        student_id=student.id,
        academic_year_id=test_academic_year.id,
        standard_id=std.id,
        division_id=div.id,
        enrollment_date=date(2026, 3, 1),
        status="active",
    )
    db.add(enr)

    cat = FeeCategory(institution_id=test_institution.id, name=f"Tuition Fee {suffix}", is_active=True)
    db.add(cat)
    await db.flush()

    struct = FeeStructure(
        institution_id=test_institution.id,
        academic_year_id=test_academic_year.id,
        standard_id=std.id,
        category_id=cat.id,
        name=f"Annual Package {suffix}",
        amount=Decimal("45000.00"),
        installments_count=3,
        is_active=True,
    )
    db.add(struct)
    await db.flush()

    assign = StudentFeeAssignment(
        student_id=student.id,
        fee_structure_id=struct.id,
        academic_year_id=test_academic_year.id,
        concession_amount=Decimal("0.00"),
    )
    db.add(assign)
    await db.flush()

    invoice = FeeInvoice(
        invoice_number=f"INV-2026-{suffix}",
        student_id=student.id,
        assignment_id=assign.id,
        academic_year_id=test_academic_year.id,
        total_amount=Decimal("45000.00"),
        discount_amount=Decimal("0.00"),
        net_amount=Decimal("45000.00"),
        paid_amount=Decimal("0.00"),
        outstanding_amount=Decimal("45000.00"),
        status="unpaid",
        issue_date=date(2026, 4, 1),
        due_date=date(2026, 5, 10),
    )
    db.add(invoice)
    await db.flush()

    item = FeeInvoiceItem(
        institution_id=test_institution.id,
        invoice_id=invoice.id,
        fee_structure_id=struct.id,
        fee_category_name=cat.name,
        structure_name=struct.name,
        description="Annual Tuition Fee",
        amount=Decimal("45000.00"),
        discount_amount=Decimal("0.00"),
        net_amount=Decimal("45000.00"),
    )
    db.add(item)

    inst1 = FeeInvoiceInstallment(
        invoice_id=invoice.id,
        installment_number=1,
        description="May 2026 Installment",
        amount=Decimal("15000.00"),
        paid_amount=Decimal("0.00"),
        outstanding_amount=Decimal("15000.00"),
        due_date=date(2026, 5, 10),
        status="unpaid",
    )
    inst2 = FeeInvoiceInstallment(
        invoice_id=invoice.id,
        installment_number=2,
        description="August 2026 Installment",
        amount=Decimal("15000.00"),
        paid_amount=Decimal("0.00"),
        outstanding_amount=Decimal("15000.00"),
        due_date=date(2026, 8, 10),
        status="unpaid",
    )
    inst3 = FeeInvoiceInstallment(
        invoice_id=invoice.id,
        installment_number=3,
        description="December 2026 Installment (Future)",
        amount=Decimal("15000.00"),
        paid_amount=Decimal("0.00"),
        outstanding_amount=Decimal("15000.00"),
        due_date=date(2026, 12, 10),
        status="unpaid",
    )
    db.add_all([inst1, inst2, inst3])
    await db.commit()
    await db.refresh(student)
    await db.refresh(invoice)
    await db.refresh(inst1)
    await db.refresh(inst2)
    await db.refresh(inst3)
    return {
        "student": student,
        "invoice": invoice,
        "installments": [inst1, inst2, inst3],
        "category": cat,
        "structure": struct,
    }


async def test_inline_partial_multiple_installments_advance_and_pivot_refresh(
    client, auth_headers, db, test_institution, test_academic_year
):
    """Covers partial payment, multi-installment split, advance installment, payment date != fee month, and pivot refresh."""
    ledger = await _setup_scheduled_student_ledger(db, test_institution, test_academic_year)
    student = ledger["student"]
    invoice = ledger["invoice"]
    inst1, inst2, inst3 = ledger["installments"]

    # 1. Partial payment on May 2026 installment with payment_date in Nov 2026 (Cash)
    r1 = await client.post(
        "/api/v1/payments/",
        json={
            "student_id": student.id,
            "academic_year_id": test_academic_year.id,
            "amount": 10000.0,
            "payment_date": "2026-11-25",
            "payment_method": "cash",
            "notes": "Partial May fee [Fee Period: May 2026]",
            "idempotency_key": f"idem-part-{student.id}",
            "allocations": [{"invoice_id": invoice.id, "installment_id": inst1.id, "amount": 10000.0}],
        },
        headers=auth_headers,
    )
    assert r1.status_code == 201, r1.text
    d1 = r1.json()
    assert d1["status"] == "posted"
    assert d1["receipt_number"]

    # Verify audit log written on direct post
    audit_row = (
        await db.execute(
            select(AuditLog).where(
                AuditLog.resource_type == "payment",
                AuditLog.resource_id == d1["payment_id"],
                AuditLog.action == "payment_posted",
            )
        )
    ).scalar_one_or_none()
    assert audit_row is not None

    # 2. Multiple installments in single payment (remaining 5000 of Inst 1 + 15000 of Inst 2) via UPI
    r2 = await client.post(
        "/api/v1/payments/",
        json={
            "student_id": student.id,
            "academic_year_id": test_academic_year.id,
            "amount": 20000.0,
            "payment_date": "2026-11-25",
            "payment_method": "upi",
            "transaction_reference": "UTR-99887766",
            "idempotency_key": f"idem-multi-{student.id}",
            "allocations": [
                {"invoice_id": invoice.id, "installment_id": inst1.id, "amount": 5000.0},
                {"invoice_id": invoice.id, "installment_id": inst2.id, "amount": 15000.0},
            ],
        },
        headers=auth_headers,
    )
    assert r2.status_code == 201, r2.text

    await db.refresh(inst1)
    await db.refresh(inst2)
    await db.refresh(invoice)
    assert inst1.status == "paid"
    assert inst2.status == "paid"
    assert invoice.paid_amount == Decimal("30000.00")
    assert invoice.outstanding_amount == Decimal("15000.00")

    # 3. Advance payment toward future Dec 2026 installment via Cheque
    r3 = await client.post(
        "/api/v1/payments/",
        json={
            "student_id": student.id,
            "academic_year_id": test_academic_year.id,
            "amount": 15000.0,
            "payment_date": "2026-11-25",
            "payment_method": "cheque",
            "cheque_number": "456789",
            "bank_name": "HDFC Bank",
            "cheque_date": "2026-11-25",
            "notes": "Advance payment [Advance Payment • Fee Period: December 2026]",
            "idempotency_key": f"idem-adv-{student.id}",
            "allocations": [{"invoice_id": invoice.id, "installment_id": inst3.id, "amount": 15000.0}],
        },
        headers=auth_headers,
    )
    assert r3.status_code == 201, r3.text

    # 4. Verify matrix endpoint reflects updated collections & ₹0 balance
    pivot_resp = await client.get(
        f"/api/v1/fees/student-monthly-pivot?academic_year_id={test_academic_year.id}&search={student.admission_number}",
        headers=auth_headers,
    )
    assert pivot_resp.status_code == 200, pivot_resp.text
    rows = pivot_resp.json()["students"]
    match = next((row for row in rows if row["student_id"] == student.id), None)
    assert match is not None
    assert match["total_collected"] == 45000.0
    assert match["balance"] == 0.0
    assert match["status"] == "paid"
    # Cash-basis month 2026-11 reflects the actual payment date 2026-11-25
    assert match["months"]["2026-11"]["amount"] == 45000.0
    assert match["months"]["2026-11"]["payments_count"] == 3


async def test_previous_dues_and_bank_transfer_and_invoice_items(
    client, auth_headers, db, test_institution, test_academic_year
):
    """Covers Previous Dues invoice in prior academic year, bank_transfer mode, and invoice items fee head exposure."""
    suffix = random.randint(10000, 99999)
    prior_ay = AcademicYear(
        institution_id=test_institution.id,
        name=f"2025-2026-{suffix}",
        start_date=date(2025, 3, 1),
        end_date=date(2026, 2, 28),
        is_current=False,
    )
    db.add(prior_ay)
    await db.flush()

    ledger = await _setup_scheduled_student_ledger(db, test_institution, test_academic_year)
    student = ledger["student"]

    prior_assign = StudentFeeAssignment(
        student_id=student.id,
        fee_structure_id=ledger["structure"].id,
        academic_year_id=prior_ay.id,
        concession_amount=Decimal("0.00"),
    )
    db.add(prior_assign)
    await db.flush()

    prior_inv = FeeInvoice(
        invoice_number=f"INV-PREV-{suffix}",
        student_id=student.id,
        assignment_id=prior_assign.id,
        academic_year_id=prior_ay.id,
        total_amount=Decimal("8000.00"),
        discount_amount=Decimal("0.00"),
        net_amount=Decimal("8000.00"),
        paid_amount=Decimal("0.00"),
        outstanding_amount=Decimal("8000.00"),
        status="unpaid",
        issue_date=date(2025, 11, 1),
        due_date=date(2025, 12, 10),
    )
    db.add(prior_inv)
    await db.commit()
    await db.refresh(prior_inv)

    # Verify invoice detail exposes fee_category_name on items
    inv_detail = await client.get(f"/api/v1/fees/invoices/{ledger['invoice'].id}", headers=auth_headers)
    assert inv_detail.status_code == 200
    assert inv_detail.json()["items"][0]["fee_category_name"] == ledger["category"].name

    # Collect Previous Dues via bank_transfer
    pay_resp = await client.post(
        "/api/v1/payments/",
        json={
            "student_id": student.id,
            "academic_year_id": prior_ay.id,
            "amount": 8000.0,
            "payment_date": "2026-11-25",
            "payment_method": "bank_transfer",
            "transaction_reference": "NEFT-20261125-001",
            "bank_name": "SBI",
            "notes": "Previous year dues cleared",
            "allocations": [{"invoice_id": prior_inv.id, "amount": 8000.0}],
        },
        headers=auth_headers,
    )
    assert pay_resp.status_code == 201, pay_resp.text
    await db.refresh(prior_inv)
    assert prior_inv.status == "paid"
    assert prior_inv.outstanding_amount == Decimal("0.00")


async def test_duplicate_submission_invalid_amount_pdf_reprint_and_permissions(
    client, auth_headers, db, test_institution, test_academic_year
):
    """Covers idempotent duplicate submission, overpayment rejection, receipt PDF, reprint without new payment, and RBAC."""
    ledger = await _setup_scheduled_student_ledger(db, test_institution, test_academic_year)
    student = ledger["student"]
    invoice = ledger["invoice"]
    inst1 = ledger["installments"][0]

    idem_key = f"idem-dup-{student.id}-{random.randint(100,999)}"
    payload = {
        "student_id": student.id,
        "academic_year_id": test_academic_year.id,
        "amount": 15000.0,
        "payment_date": "2026-11-25",
        "payment_method": "upi",
        "transaction_reference": "UPI-DUP-1",
        "idempotency_key": idem_key,
        "allocations": [{"invoice_id": invoice.id, "installment_id": inst1.id, "amount": 15000.0}],
    }

    first = await client.post("/api/v1/payments/", json=payload, headers=auth_headers)
    assert first.status_code == 201
    second = await client.post("/api/v1/payments/", json=payload, headers=auth_headers)
    assert second.status_code == 201
    assert second.json()["payment_id"] == first.json()["payment_id"]
    assert second.json()["receipt_number"] == first.json()["receipt_number"]

    # Confirm only 1 Payment row was created
    pay_count = (
        await db.execute(select(func.count(Payment.id)).where(Payment.student_id == student.id))
    ).scalar_one()
    assert pay_count == 1

    # Invalid amount (<= 0) and Overpayment (> remaining 30,000)
    bad_zero = await client.post(
        "/api/v1/payments/",
        json={**payload, "amount": 0, "idempotency_key": "idem-zero", "allocations": [{"invoice_id": invoice.id, "amount": 0}]},
        headers=auth_headers,
    )
    assert bad_zero.status_code == 422

    bad_overpay = await client.post(
        "/api/v1/payments/",
        json={
            **payload,
            "amount": 35000.0,
            "idempotency_key": "idem-over",
            "allocations": [{"invoice_id": invoice.id, "amount": 35000.0}],
        },
        headers=auth_headers,
    )
    assert bad_overpay.status_code == 400

    # Receipt PDF generation
    rcp_num = first.json()["receipt_number"]
    pdf_resp = await client.get(f"/api/v1/payments/receipts/{rcp_num}/pdf", headers=auth_headers)
    assert pdf_resp.status_code == 200
    assert pdf_resp.headers["content-type"] == "application/pdf"
    assert pdf_resp.content.startswith(b"%PDF-")

    # Reprint receipt without creating another payment
    reprint_resp = await client.post(f"/api/v1/payments/receipts/{rcp_num}/reprint", headers=auth_headers)
    assert reprint_resp.status_code == 200
    assert reprint_resp.json()["reprint_count"] == 1
    assert reprint_resp.json()["is_duplicate"] is True

    pay_count_after_reprint = (
        await db.execute(select(func.count(Payment.id)).where(Payment.student_id == student.id))
    ).scalar_one()
    assert pay_count_after_reprint == 1

    # Permission restrictions: Teacher & Student roles must receive 403
    teacher_role = (await db.execute(select(Role).where(Role.name == "teacher"))).scalar_one_or_none()
    teacher = User(
        username=f"tchr_perm_{random.randint(1000,9999)}",
        email=f"tchr_{random.randint(1000,9999)}@test.com",
        hashed_password=get_password_hash("testpass"),
        first_name="Restricted",
        last_name="Teacher",
        role="teacher",
        role_id=teacher_role.id if teacher_role else None,
        institution_id=test_institution.id,
    )
    db.add(teacher)
    await db.commit()
    await db.refresh(teacher)
    teacher_token = create_access_token(data={"sub": str(teacher.id)})

    forbidden = await client.post(
        "/api/v1/payments/",
        json={**payload, "idempotency_key": "idem-forbidden", "allocations": [{"invoice_id": invoice.id, "amount": 1000.0}], "amount": 1000.0},
        headers={"Authorization": f"Bearer {teacher_token}"},
    )
    assert forbidden.status_code == 403
