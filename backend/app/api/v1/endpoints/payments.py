# /**
#  * @file        payments.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      backend.app.api.v1.endpoints
#  *
#  * @author      Jawahar R. Mallah
#  * @organization AITDL (AI Technology & Development Lab)
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 AITDL
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-03
#  * @updated     2026-11-05
#  *
#  * @description API endpoints for transaction recording, payment reversals, audit logs, and receipt vouchers.
#  */

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, desc, and_
from sqlalchemy.orm import selectinload
from typing import Optional, List
from decimal import Decimal
from datetime import date, datetime, timezone
import json
import uuid
from app.core.database import get_db
from app.core.deps import get_current_active_user, require_role
from app.models.payment import Payment, PaymentAllocation, PaymentReceipt
from app.models.fee import FeeInvoice, FeeInstallment
from app.models.student import Student
from app.models.enrollment import StudentEnrollment
from app.models.standard import Standard
from app.models.division import Division
from app.models.board import Board
from app.models.user import User
from pydantic import BaseModel

router = APIRouter()


class AllocationInput(BaseModel):
    invoice_id: int
    installment_id: Optional[int] = None
    amount: Decimal


class PaymentCreate(BaseModel):
    student_id: int
    academic_year_id: int
    amount: Decimal
    payment_date: date
    payment_method: str
    transaction_reference: Optional[str] = None
    bank_name: Optional[str] = None
    cheque_number: Optional[str] = None
    cheque_date: Optional[date] = None
    notes: Optional[str] = None
    allocations: List[AllocationInput]


class ReversalRequest(BaseModel):
    reason: str


@router.post("/", status_code=201)
async def create_payment(
    data: PaymentCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("superadmin", "admin", "accountant")),
):
    """Record a payment with allocation. Atomic transaction prevents overbilling."""
    # Validate allocation total equals payment amount
    total_allocated = sum(a.amount for a in data.allocations)
    if abs(total_allocated - data.amount) > Decimal("0.01"):
        raise HTTPException(
            status_code=400,
            detail=f"Total allocation ({total_allocated}) must equal payment amount ({data.amount})",
        )

    # Validate each allocation
    for alloc in data.allocations:
        inv_result = await db.execute(
            select(FeeInvoice).where(FeeInvoice.id == alloc.invoice_id)
        )
        invoice = inv_result.scalar_one_or_none()
        if not invoice:
            raise HTTPException(
                status_code=404, detail=f"Invoice {alloc.invoice_id} not found"
            )
        if invoice.student_id != data.student_id:
            raise HTTPException(
                status_code=400,
                detail="Invoice does not belong to this student",
            )
        if alloc.amount > invoice.outstanding_amount + Decimal("0.01"):
            raise HTTPException(
                status_code=400,
                detail=f"Allocation amount {alloc.amount} exceeds outstanding {invoice.outstanding_amount}",
            )

        if alloc.installment_id:
            inst_result = await db.execute(
                select(FeeInstallment).where(
                    FeeInstallment.id == alloc.installment_id,
                    FeeInstallment.invoice_id == alloc.invoice_id,
                )
            )
            installment = inst_result.scalar_one_or_none()
            if not installment:
                raise HTTPException(
                    status_code=404,
                    detail=f"Installment {alloc.installment_id} not found",
                )
            remaining = installment.amount - installment.paid_amount
            if alloc.amount > remaining + Decimal("0.01"):
                raise HTTPException(
                    status_code=400,
                    detail=f"Allocation exceeds installment balance ({remaining})",
                )

    # Create payment record
    payment_data = data.model_dump(exclude={"allocations"})
    payment = Payment(**payment_data, collected_by_id=current_user.id)
    db.add(payment)
    await db.flush()

    # Create allocations and update balances
    for alloc in data.allocations:
        allocation = PaymentAllocation(
            payment_id=payment.id,
            invoice_id=alloc.invoice_id,
            installment_id=alloc.installment_id,
            allocated_amount=alloc.amount,
        )
        db.add(allocation)

        inv_result = await db.execute(
            select(FeeInvoice).where(FeeInvoice.id == alloc.invoice_id)
        )
        invoice = inv_result.scalar_one_or_none()
        invoice.paid_amount = invoice.paid_amount + alloc.amount
        invoice.outstanding_amount = max(
            invoice.outstanding_amount - alloc.amount, Decimal("0")
        )
        if invoice.outstanding_amount <= Decimal("0.01"):
            invoice.status = "paid"
        elif invoice.paid_amount > Decimal("0"):
            invoice.status = "partial"

        if alloc.installment_id:
            inst_result = await db.execute(
                select(FeeInstallment).where(
                    FeeInstallment.id == alloc.installment_id
                )
            )
            installment = inst_result.scalar_one_or_none()
            if installment:
                installment.paid_amount = installment.paid_amount + alloc.amount
                remaining = installment.amount - installment.paid_amount
                if remaining <= Decimal("0.01"):
                    installment.status = "paid"
                elif installment.paid_amount > Decimal("0"):
                    installment.status = "partial"

    # Generate receipt with UUID-based number to avoid race conditions
    receipt_number = f"RCP-{data.academic_year_id}-{uuid.uuid4().hex[:8].upper()}"

    student_result = await db.execute(
        select(Student).where(Student.id == data.student_id)
    )
    student = student_result.scalar_one_or_none()

    receipt_data = {
        "receipt_number": receipt_number,
        "student_name": (
            f"{student.first_name} {student.last_name}" if student else ""
        ),
        "admission_number": student.admission_number if student else "",
        "amount": float(data.amount),
        "payment_date": str(data.payment_date),
        "payment_method": data.payment_method,
        "transaction_reference": data.transaction_reference,
        "allocations": [
            {"invoice_id": a.invoice_id, "amount": float(a.amount)}
            for a in data.allocations
        ],
    }

    receipt = PaymentReceipt(
        receipt_number=receipt_number,
        payment_id=payment.id,
        student_id=data.student_id,
        amount=data.amount,
        payment_date=data.payment_date,
        payment_method=data.payment_method,
        receipt_data=json.dumps(receipt_data),
    )
    db.add(receipt)
    await db.commit()

    return {
        "payment_id": payment.id,
        "receipt_number": receipt_number,
        "amount": float(data.amount),
        "payment_method": data.payment_method,
        "payment_date": str(data.payment_date),
        "message": "Payment recorded successfully",
    }


@router.get("/")
async def list_payments(
    student_id: Optional[int] = None,
    academic_year_id: Optional[int] = None,
    board_id: Optional[int] = None,
    standard_id: Optional[int] = None,
    division_id: Optional[int] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    query = (
        select(
            Payment,
            Student,
            PaymentReceipt.receipt_number,
            Division.name.label("batch_name"),
            Standard.name.label("standard_name"),
            Board.name.label("board_name"),
        )
        .join(Student, Payment.student_id == Student.id)
        .outerjoin(PaymentReceipt, Payment.id == PaymentReceipt.payment_id)
        .outerjoin(
            StudentEnrollment,
            (Payment.student_id == StudentEnrollment.student_id)
            & (Payment.academic_year_id == StudentEnrollment.academic_year_id),
        )
        .outerjoin(Division, StudentEnrollment.division_id == Division.id)
        .outerjoin(Standard, StudentEnrollment.standard_id == Standard.id)
        .outerjoin(Board, Division.board_id == Board.id)
    )
    if student_id:
        query = query.where(Payment.student_id == student_id)
    if academic_year_id:
        query = query.where(Payment.academic_year_id == academic_year_id)
    if board_id:
        query = query.where(Division.board_id == board_id)
    if standard_id:
        query = query.where(StudentEnrollment.standard_id == standard_id)
    if division_id:
        query = query.where(StudentEnrollment.division_id == division_id)
    if status:
        query = query.where(Payment.status == status)
    if search:
        search_term = f"%{search.strip()}%"
        query = query.where(
            or_(
                Student.first_name.ilike(search_term),
                Student.last_name.ilike(search_term),
                Student.admission_number.ilike(search_term),
                PaymentReceipt.receipt_number.ilike(search_term),
                Payment.transaction_reference.ilike(search_term),
            )
        )

    query = query.order_by(desc(Payment.payment_date), desc(Payment.created_at))
    rows = (await db.execute(query)).all()

    return [
        {
            "id": p.id,
            "student_id": p.student_id,
            "student_name": f"{s.first_name} {s.last_name}",
            "admission_number": s.admission_number,
            "board_name": b_name or "General",
            "standard_name": std_name or "—",
            "batch_name": bch_name or "Unassigned",
            "amount": float(p.amount),
            "payment_date": str(p.payment_date),
            "payment_method": p.payment_method,
            "transaction_reference": p.transaction_reference or "N/A",
            "status": p.status,
            "notes": p.notes or "",
            "receipt_number": rec_num or f"RCP-{p.id:06d}",
        }
        for p, s, rec_num, bch_name, std_name, b_name in rows
    ]


@router.get("/receipts-list")
async def list_receipts(
    academic_year_id: Optional[int] = None,
    board_id: Optional[int] = None,
    standard_id: Optional[int] = None,
    division_id: Optional[int] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    query = (
        select(
            PaymentReceipt,
            Payment,
            Student,
            Division.name.label("batch_name"),
            Standard.name.label("standard_name"),
            Board.name.label("board_name"),
        )
        .join(Payment, PaymentReceipt.payment_id == Payment.id)
        .join(Student, PaymentReceipt.student_id == Student.id)
        .outerjoin(
            StudentEnrollment,
            (Payment.student_id == StudentEnrollment.student_id)
            & (Payment.academic_year_id == StudentEnrollment.academic_year_id),
        )
        .outerjoin(Division, StudentEnrollment.division_id == Division.id)
        .outerjoin(Standard, StudentEnrollment.standard_id == Standard.id)
        .outerjoin(Board, Division.board_id == Board.id)
    )
    if academic_year_id:
        query = query.where(Payment.academic_year_id == academic_year_id)
    if board_id:
        query = query.where(Division.board_id == board_id)
    if standard_id:
        query = query.where(StudentEnrollment.standard_id == standard_id)
    if division_id:
        query = query.where(StudentEnrollment.division_id == division_id)
    if search:
        search_term = f"%{search.strip()}%"
        query = query.where(
            or_(
                Student.first_name.ilike(search_term),
                Student.last_name.ilike(search_term),
                Student.admission_number.ilike(search_term),
                PaymentReceipt.receipt_number.ilike(search_term),
            )
        )

    query = query.order_by(desc(PaymentReceipt.payment_date), desc(PaymentReceipt.id))
    rows = (await db.execute(query)).all()

    receipts = []
    for r, p, s, bch_name, std_name, b_name in rows:
        receipt_meta = {}
        if r.receipt_data:
            try:
                receipt_meta = json.loads(r.receipt_data)
            except Exception:
                pass

        is_voided = p.status == "reversed" or receipt_meta.get("status") == "voided"

        receipts.append({
            "id": r.id,
            "receipt_number": r.receipt_number,
            "payment_id": p.id,
            "student_id": s.id,
            "student_name": f"{s.first_name} {s.last_name}",
            "admission_number": s.admission_number,
            "board_name": b_name or "General",
            "standard_name": std_name or "—",
            "batch_name": bch_name or "Unassigned",
            "amount": float(r.amount),
            "payment_date": str(r.payment_date),
            "payment_method": r.payment_method,
            "status": "voided" if is_voided else "valid",
            "is_voided": is_voided,
            "generated_at": r.generated_at.isoformat() if r.generated_at else None,
            "details": receipt_meta,
        })

    return receipts


@router.get("/{payment_id}")
async def get_payment(
    payment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    result = await db.execute(
        select(Payment)
        .options(
            selectinload(Payment.allocations),
            selectinload(Payment.receipt),
        )
        .where(Payment.id == payment_id)
    )
    payment = result.scalar_one_or_none()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    return {
        "id": payment.id,
        "student_id": payment.student_id,
        "amount": float(payment.amount),
        "payment_date": str(payment.payment_date),
        "payment_method": payment.payment_method,
        "transaction_reference": payment.transaction_reference,
        "status": payment.status,
        "notes": payment.notes,
        "receipt_number": (
            payment.receipt.receipt_number if payment.receipt else None
        ),
        "allocations": [
            {
                "id": a.id,
                "invoice_id": a.invoice_id,
                "installment_id": a.installment_id,
                "allocated_amount": float(a.allocated_amount),
            }
            for a in payment.allocations
        ],
    }


@router.post("/{payment_id}/reverse")
async def reverse_payment(
    payment_id: int,
    data: ReversalRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("superadmin", "admin", "accountant")),
):
    """Reverse a payment, restore invoice balances, and mark receipt as voided."""
    result = await db.execute(
        select(Payment)
        .options(selectinload(Payment.allocations))
        .where(Payment.id == payment_id)
    )
    payment = result.scalar_one_or_none()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    if payment.status == "reversed":
        raise HTTPException(status_code=400, detail="Payment already reversed")

    for alloc in payment.allocations:
        inv_result = await db.execute(
            select(FeeInvoice).where(FeeInvoice.id == alloc.invoice_id)
        )
        invoice = inv_result.scalar_one_or_none()
        if invoice:
            invoice.paid_amount = max(
                invoice.paid_amount - alloc.allocated_amount, Decimal("0")
            )
            invoice.outstanding_amount = invoice.net_amount - invoice.paid_amount
            if invoice.paid_amount <= Decimal("0"):
                invoice.status = "unpaid"
            else:
                invoice.status = "partial"

        if alloc.installment_id:
            inst_result = await db.execute(
                select(FeeInstallment).where(
                    FeeInstallment.id == alloc.installment_id
                )
            )
            installment = inst_result.scalar_one_or_none()
            if installment:
                installment.paid_amount = max(
                    installment.paid_amount - alloc.allocated_amount, Decimal("0")
                )
                if installment.paid_amount <= Decimal("0"):
                    installment.status = "unpaid"
                else:
                    installment.status = "partial"

    payment.status = "reversed"
    payment.reversed_at = datetime.now(timezone.utc)
    payment.reversal_reason = data.reason
    payment.reversed_by_id = current_user.id

    # Mark associated receipt as voided if exists
    receipt_stmt = select(PaymentReceipt).where(PaymentReceipt.payment_id == payment_id)
    receipt = (await db.execute(receipt_stmt)).scalar_one_or_none()
    if receipt and receipt.receipt_data:
        try:
            rdata = json.loads(receipt.receipt_data)
            rdata["status"] = "voided"
            rdata["voided_at"] = payment.reversed_at.isoformat()
            rdata["void_reason"] = data.reason
            receipt.receipt_data = json.dumps(rdata)
        except Exception:
            pass

    await db.commit()
    return {"message": "Payment reversed successfully", "payment_id": payment_id}


async def build_receipt_response(
    db: AsyncSession,
    receipt: PaymentReceipt,
    payment: Optional[Payment] = None,
) -> dict:
    """
    Constructs an authoritative receipt payload containing current transaction details,
    historical successful payments for the same fee obligation, and reconciled fee ledger summary.
    """
    if not payment:
        pay_res = await db.execute(
            select(Payment)
            .options(
                selectinload(Payment.allocations).selectinload(PaymentAllocation.installment),
                selectinload(Payment.student),
            )
            .where(Payment.id == receipt.payment_id)
        )
        payment = pay_res.scalar_one_or_none()

    if not payment:
        raise HTTPException(status_code=404, detail="Payment record for receipt not found")

    receipt_data = json.loads(receipt.receipt_data) if receipt.receipt_data else {}

    # Scope to the same fee obligation (invoice)
    target_invoice_id = None
    if payment.allocations:
        target_invoice_id = payment.allocations[0].invoice_id
    elif "invoice_id" in receipt_data:
        target_invoice_id = receipt_data["invoice_id"]
    elif "invoice_number" in receipt_data:
        inv_by_num = (await db.execute(
            select(FeeInvoice.id).where(FeeInvoice.invoice_number == receipt_data["invoice_number"])
        )).scalar_one_or_none()
        target_invoice_id = inv_by_num

    # Fallback to active invoice for student & academic year
    if not target_invoice_id:
        inv_active = (await db.execute(
            select(FeeInvoice.id).where(
                FeeInvoice.student_id == payment.student_id,
                FeeInvoice.academic_year_id == payment.academic_year_id,
            ).order_by(FeeInvoice.id.desc()).limit(1)
        )).scalar_one_or_none()
        target_invoice_id = inv_active

    invoice = None
    historical_payments = []
    previous_payments_total = Decimal("0.00")
    total_fee_amount = Decimal(str(receipt_data.get("total_fees") or payment.amount))

    if target_invoice_id:
        inv_res = await db.execute(
            select(FeeInvoice).where(FeeInvoice.id == target_invoice_id)
        )
        invoice = inv_res.scalar_one_or_none()
        if invoice:
            total_fee_amount = invoice.total_amount

        # Query all completed previous payments allocated to this same invoice
        # Exclude current payment (Payment.id != payment.id)
        # Exclude failed, reversed, pending transactions
        # Sort chronologically, oldest to newest (payment_date ASC, id ASC)
        hist_stmt = (
            select(Payment, PaymentReceipt)
            .join(PaymentAllocation, PaymentAllocation.payment_id == Payment.id)
            .outerjoin(PaymentReceipt, PaymentReceipt.payment_id == Payment.id)
            .where(
                PaymentAllocation.invoice_id == target_invoice_id,
                Payment.status == "completed",
                Payment.id != payment.id,
                or_(
                    Payment.payment_date < payment.payment_date,
                    and_(
                        Payment.payment_date == payment.payment_date,
                        Payment.id < payment.id,
                    ),
                ),
            )
            .distinct()
            .order_by(Payment.payment_date.asc(), Payment.id.asc())
        )
        hist_rows = (await db.execute(hist_stmt)).all()

        seen_payment_ids = set()
        for p_hist, pr_hist in hist_rows:
            if p_hist.id in seen_payment_ids:
                continue
            seen_payment_ids.add(p_hist.id)

            hist_receipt_no = pr_hist.receipt_number if pr_hist else f"RCP-{p_hist.id:06d}"
            p_amt = Decimal(str(p_hist.amount))
            previous_payments_total += p_amt
            historical_payments.append({
                "payment_id": p_hist.id,
                "receipt_number": hist_receipt_no,
                "date": str(p_hist.payment_date),
                "payment_method": p_hist.payment_method,
                "amount": float(p_amt),
                "transaction_reference": p_hist.transaction_reference,
            })

    current_payment_amount = Decimal(str(payment.amount))
    if payment.status == "completed":
        total_paid_to_date = previous_payments_total + current_payment_amount
    else:
        total_paid_to_date = previous_payments_total

    outstanding_balance = max(Decimal("0.00"), total_fee_amount - total_paid_to_date)

    # Student demographic metadata
    student = payment.student
    student_name = receipt_data.get("student_name") or (f"{student.first_name} {student.last_name}" if student else "")
    admission_number = receipt_data.get("admission_number") or (student.admission_number if student else "")

    standard_name = receipt_data.get("standard")
    division_name = receipt_data.get("batch") or receipt_data.get("division")
    if not standard_name or not division_name:
        enr_stmt = (
            select(StudentEnrollment)
            .options(
                selectinload(StudentEnrollment.standard),
                selectinload(StudentEnrollment.division),
            )
            .where(
                StudentEnrollment.student_id == payment.student_id,
                StudentEnrollment.academic_year_id == payment.academic_year_id,
            )
            .order_by(StudentEnrollment.id.desc())
            .limit(1)
        )
        enr = (await db.execute(enr_stmt)).scalar_one_or_none()
        if enr:
            if not standard_name and enr.standard:
                standard_name = enr.standard.name
            if not division_name and enr.division:
                division_name = enr.division.name

    collected_by = receipt_data.get("collected_by")
    if not collected_by and payment.collected_by_id:
        user_res = await db.execute(select(User).where(User.id == payment.collected_by_id))
        collector_user = user_res.scalar_one_or_none()
        if collector_user:
            collected_by = f"{collector_user.first_name or ''} {collector_user.last_name or ''}".strip()
    if not collected_by:
        collected_by = "Staff"

    invoice_number = (
        (invoice.invoice_number if invoice else None)
        or receipt_data.get("invoice_number")
        or (f"INV-{payment.academic_year_id}-{payment.student_id:04d}")
    )

    fee_summary = {
        "total_fee_amount": float(total_fee_amount),
        "previous_payments_total": float(previous_payments_total),
        "current_payment_amount": float(current_payment_amount),
        "total_paid_to_date": float(total_paid_to_date),
        "outstanding_balance": float(outstanding_balance),
    }

    allocations_list = []
    if payment.allocations:
        for a in payment.allocations:
            allocations_list.append({
                "id": a.id,
                "invoice_id": a.invoice_id,
                "installment_id": a.installment_id,
                "installment_number": getattr(a.installment, "installment_number", None) if a.installment else None,
                "amount": float(a.allocated_amount),
            })
    elif "allocations" in receipt_data:
        allocations_list = receipt_data["allocations"]

    return {
        "receipt_number": receipt.receipt_number,
        "payment_id": payment.id,
        "student_id": payment.student_id,
        "student_name": student_name,
        "admission_number": admission_number,
        "standard": standard_name or "—",
        "division": division_name or "—",
        "batch": division_name or "—",
        "amount": float(current_payment_amount),
        "payment_date": str(payment.payment_date),
        "payment_method": payment.payment_method,
        "transaction_reference": payment.transaction_reference,
        "bank_name": payment.bank_name,
        "cheque_number": payment.cheque_number,
        "cheque_date": str(payment.cheque_date) if payment.cheque_date else None,
        "notes": payment.notes,
        "status": payment.status,
        "is_reversed": payment.status == "reversed",
        "reversed_at": payment.reversed_at.isoformat() if payment.reversed_at else None,
        "reversal_reason": payment.reversal_reason,
        "invoice_id": invoice.id if invoice else target_invoice_id,
        "invoice_number": invoice_number,
        "historical_payments": historical_payments,
        "fee_summary": fee_summary,
        "allocations": allocations_list,
        "collected_by": collected_by,
        "generated_at": receipt.generated_at.isoformat(),
        # Backward compatibility aliases
        "total_fees": float(total_fee_amount),
        "total_paid": float(total_paid_to_date),
        "outstanding_after": float(outstanding_balance),
        "previous_paid": float(previous_payments_total),
    }


@router.get("/receipts/{receipt_number}")
async def get_receipt(
    receipt_number: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    result = await db.execute(
        select(PaymentReceipt).where(
            PaymentReceipt.receipt_number == receipt_number
        )
    )
    receipt = result.scalar_one_or_none()

    if not receipt and receipt_number.isdigit():
        result = await db.execute(
            select(PaymentReceipt).where(
                PaymentReceipt.payment_id == int(receipt_number)
            )
        )
        receipt = result.scalar_one_or_none()

    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")

    return await build_receipt_response(db, receipt)

