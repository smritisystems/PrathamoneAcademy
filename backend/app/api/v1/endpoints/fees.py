# /**
#  * @file        fees.py
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
#  * @updated     2026-11-04
#  *
#  * @description API endpoints for fee obligations, payment collections, receipts, trends, and ledger reconciliation.
#  */

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc, asc, case
from sqlalchemy.orm import selectinload
from typing import Optional, List
from app.core.database import get_db
from app.core.deps import get_current_active_user, require_role
import uuid
from app.models.fee import (
    FeeCategory,
    FeeStructure,
    StudentFeeAssignment,
    FeeInvoice,
    FeeInvoiceItem,
    FeeInstallment,
    Discount,
    Scholarship,
)
from app.models.student import Student
from app.models.enrollment import StudentEnrollment
from app.models.board import Board
from app.models.standard import Standard
from app.models.division import Division
from app.models.academic_year import AcademicYear
from app.models.payment import Payment, PaymentReceipt
from pydantic import BaseModel
from datetime import date
from decimal import Decimal
import uuid

router = APIRouter()


class FeeCategoryCreate(BaseModel):
    institution_id: int
    name: str
    description: Optional[str] = None


class FeeStructureCreate(BaseModel):
    institution_id: int
    academic_year_id: int
    standard_id: Optional[int] = None
    category_id: int
    name: str
    amount: Decimal
    frequency: str = "annual"
    installments_count: int = 1
    due_day: Optional[int] = None
    late_fee_amount: Decimal = Decimal("0")
    late_fee_days: int = 0


class DiscountCreate(BaseModel):
    institution_id: int
    name: str
    discount_type: str
    value: Decimal
    description: Optional[str] = None


class ScholarshipCreate(BaseModel):
    institution_id: int
    name: str
    amount: Decimal
    description: Optional[str] = None


class FeeAssignmentCreate(BaseModel):
    student_id: int
    fee_structure_id: int
    academic_year_id: int
    discount_id: Optional[int] = None
    scholarship_id: Optional[int] = None
    custom_amount: Optional[Decimal] = None
    concession_amount: Decimal = Decimal("0")
    remarks: Optional[str] = None


class InstallmentConfig(BaseModel):
    description: str
    due_date: date
    amount: Decimal


class InvoiceCreate(BaseModel):
    student_id: int
    assignment_id: int
    academic_year_id: int
    issue_date: date
    due_date: Optional[date] = None
    notes: Optional[str] = None
    installments: Optional[List[InstallmentConfig]] = None


# ---------- Fee Categories ----------
@router.get("/categories")
async def list_fee_categories(
    institution_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    query = select(FeeCategory).where(FeeCategory.is_active == True)
    if institution_id:
        query = query.where(FeeCategory.institution_id == institution_id)
    result = await db.execute(query)
    cats = result.scalars().all()
    return [
        {"id": c.id, "name": c.name, "description": c.description} for c in cats
    ]


@router.post("/categories", status_code=201)
async def create_fee_category(
    data: FeeCategoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("superadmin", "admin", "accountant", "principal")),
):
    cat = FeeCategory(**data.model_dump())
    db.add(cat)
    await db.commit()
    await db.refresh(cat)
    return {"id": cat.id, "name": cat.name}


# ---------- Fee Structures ----------
@router.get("/structures")
async def list_fee_structures(
    academic_year_id: Optional[int] = None,
    standard_id: Optional[int] = None,
    institution_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    query = select(FeeStructure).where(FeeStructure.is_active == True)
    if academic_year_id:
        query = query.where(FeeStructure.academic_year_id == academic_year_id)
    if standard_id:
        query = query.where(FeeStructure.standard_id == standard_id)
    if institution_id:
        query = query.where(FeeStructure.institution_id == institution_id)
    result = await db.execute(query)
    structures = result.scalars().all()
    return [
        {
            "id": s.id,
            "name": s.name,
            "amount": float(s.amount),
            "frequency": s.frequency,
            "category_id": s.category_id,
            "standard_id": s.standard_id,
            "installments_count": s.installments_count,
            "late_fee_amount": float(s.late_fee_amount),
        }
        for s in structures
    ]


@router.post("/structures", status_code=201)
async def create_fee_structure(
    data: FeeStructureCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("superadmin", "admin", "accountant", "principal")),
):
    structure = FeeStructure(**data.model_dump())
    db.add(structure)
    await db.commit()
    await db.refresh(structure)
    return {
        "id": structure.id,
        "name": structure.name,
        "amount": float(structure.amount),
    }


# ---------- Discounts ----------
@router.get("/discounts")
async def list_discounts(
    institution_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    query = select(Discount).where(Discount.is_active == True)
    if institution_id:
        query = query.where(Discount.institution_id == institution_id)
    result = await db.execute(query)
    discounts = result.scalars().all()
    return [
        {
            "id": d.id,
            "name": d.name,
            "discount_type": d.discount_type,
            "value": float(d.value),
        }
        for d in discounts
    ]


@router.post("/discounts", status_code=201)
async def create_discount(
    data: DiscountCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("superadmin", "admin", "accountant", "principal")),
):
    discount = Discount(**data.model_dump())
    db.add(discount)
    await db.commit()
    await db.refresh(discount)
    return {"id": discount.id, "name": discount.name}


# ---------- Scholarships ----------
@router.get("/scholarships")
async def list_scholarships(
    institution_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    query = select(Scholarship).where(Scholarship.is_active == True)
    if institution_id:
        query = query.where(Scholarship.institution_id == institution_id)
    result = await db.execute(query)
    scholarships = result.scalars().all()
    return [
        {"id": s.id, "name": s.name, "amount": float(s.amount)} for s in scholarships
    ]


@router.post("/scholarships", status_code=201)
async def create_scholarship(
    data: ScholarshipCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("superadmin", "admin", "accountant", "principal")),
):
    scholarship = Scholarship(**data.model_dump())
    db.add(scholarship)
    await db.commit()
    await db.refresh(scholarship)
    return {"id": scholarship.id, "name": scholarship.name}


# ---------- Fee Assignments ----------
@router.get("/assignments")
async def list_fee_assignments(
    student_id: Optional[int] = None,
    academic_year_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    query = select(StudentFeeAssignment)
    if student_id:
        query = query.where(StudentFeeAssignment.student_id == student_id)
    if academic_year_id:
        query = query.where(StudentFeeAssignment.academic_year_id == academic_year_id)
    result = await db.execute(query)
    assignments = result.scalars().all()
    return [
        {
            "id": a.id,
            "student_id": a.student_id,
            "fee_structure_id": a.fee_structure_id,
            "academic_year_id": a.academic_year_id,
            "concession_amount": float(a.concession_amount),
            "remarks": a.remarks,
        }
        for a in assignments
    ]


@router.post("/assignments", status_code=201)
async def create_fee_assignment(
    data: FeeAssignmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("superadmin", "admin", "accountant", "principal")),
):
    assignment = StudentFeeAssignment(**data.model_dump())
    db.add(assignment)
    await db.commit()
    await db.refresh(assignment)
    return {"id": assignment.id, "student_id": assignment.student_id}


# ---------- Invoices ----------
@router.get("/invoices")
async def list_invoices(
    student_id: Optional[int] = None,
    academic_year_id: Optional[int] = None,
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    query = select(FeeInvoice)
    if student_id:
        query = query.where(FeeInvoice.student_id == student_id)
    if academic_year_id:
        query = query.where(FeeInvoice.academic_year_id == academic_year_id)
    if status:
        query = query.where(FeeInvoice.status == status)
    result = await db.execute(query.order_by(FeeInvoice.created_at.desc()))
    invoices = result.scalars().all()
    return [
        {
            "id": inv.id,
            "invoice_number": inv.invoice_number,
            "student_id": inv.student_id,
            "total_amount": float(inv.total_amount),
            "discount_amount": float(inv.discount_amount),
            "net_amount": float(inv.net_amount),
            "paid_amount": float(inv.paid_amount),
            "outstanding_amount": float(inv.outstanding_amount),
            "status": inv.status,
            "issue_date": str(inv.issue_date),
            "due_date": str(inv.due_date) if inv.due_date else None,
        }
        for inv in invoices
    ]


@router.post("/invoices", status_code=201)
async def create_fee_invoice(
    data: InvoiceCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("superadmin", "admin", "accountant", "principal")),
):
    assignment_result = await db.execute(
        select(StudentFeeAssignment).where(
            StudentFeeAssignment.id == data.assignment_id
        )
    )
    assignment = assignment_result.scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=404, detail="Fee assignment not found")

    structure_result = await db.execute(
        select(FeeStructure).where(FeeStructure.id == assignment.fee_structure_id)
    )
    structure = structure_result.scalar_one_or_none()
    if not structure:
        raise HTTPException(status_code=404, detail="Fee structure not found")

    base_amount = assignment.custom_amount or structure.amount
    discount_amount = Decimal("0")

    if assignment.discount_id:
        discount_result = await db.execute(
            select(Discount).where(Discount.id == assignment.discount_id)
        )
        discount = discount_result.scalar_one_or_none()
        if discount:
            if discount.discount_type == "percentage":
                discount_amount += base_amount * discount.value / 100
            else:
                discount_amount += discount.value

    if assignment.scholarship_id:
        scholarship_result = await db.execute(
            select(Scholarship).where(Scholarship.id == assignment.scholarship_id)
        )
        scholarship = scholarship_result.scalar_one_or_none()
        if scholarship:
            discount_amount += scholarship.amount

    discount_amount += assignment.concession_amount
    net_amount = max(base_amount - discount_amount, Decimal("0"))

    invoice_number = f"INV-{data.academic_year_id}-{uuid.uuid4().hex[:8].upper()}"

    invoice = FeeInvoice(
        invoice_number=invoice_number,
        student_id=data.student_id,
        assignment_id=data.assignment_id,
        academic_year_id=data.academic_year_id,
        total_amount=base_amount,
        discount_amount=discount_amount,
        net_amount=net_amount,
        paid_amount=Decimal("0"),
        outstanding_amount=net_amount,
        issue_date=data.issue_date,
        due_date=data.due_date,
        notes=data.notes,
        status="unpaid",
    )
    db.add(invoice)
    await db.flush()

    item = FeeInvoiceItem(
        invoice_id=invoice.id,
        fee_structure_id=structure.id,
        description=structure.name,
        amount=base_amount,
        discount_amount=discount_amount,
        net_amount=net_amount,
    )
    db.add(item)

    if data.installments:
        for i, inst in enumerate(data.installments, 1):
            installment = FeeInstallment(
                invoice_id=invoice.id,
                installment_number=i,
                description=inst.description,
                amount=inst.amount,
                paid_amount=Decimal("0"),
                due_date=inst.due_date,
                status="unpaid",
            )
            db.add(installment)
    else:
        installment = FeeInstallment(
            invoice_id=invoice.id,
            installment_number=1,
            description="Full Payment",
            amount=net_amount,
            paid_amount=Decimal("0"),
            due_date=data.due_date or data.issue_date,
            status="unpaid",
        )
        db.add(installment)

    await db.commit()
    return {
        "id": invoice.id,
        "invoice_number": invoice_number,
        "net_amount": float(net_amount),
        "outstanding": float(net_amount),
    }


@router.get("/invoices/{invoice_id}")
async def get_invoice(
    invoice_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    result = await db.execute(
        select(FeeInvoice)
        .options(
            selectinload(FeeInvoice.items),
            selectinload(FeeInvoice.installments),
        )
        .where(FeeInvoice.id == invoice_id)
    )
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return {
        "id": invoice.id,
        "invoice_number": invoice.invoice_number,
        "student_id": invoice.student_id,
        "total_amount": float(invoice.total_amount),
        "discount_amount": float(invoice.discount_amount),
        "net_amount": float(invoice.net_amount),
        "paid_amount": float(invoice.paid_amount),
        "outstanding_amount": float(invoice.outstanding_amount),
        "status": invoice.status,
        "issue_date": str(invoice.issue_date),
        "due_date": str(invoice.due_date) if invoice.due_date else None,
        "notes": invoice.notes,
        "items": [
            {
                "id": i.id,
                "description": i.description,
                "amount": float(i.amount),
                "discount_amount": float(i.discount_amount),
                "net_amount": float(i.net_amount),
            }
            for i in invoice.items
        ],
        "installments": [
            {
                "id": inst.id,
                "installment_number": inst.installment_number,
                "description": inst.description,
                "amount": float(inst.amount),
                "paid_amount": float(inst.paid_amount),
                "due_date": str(inst.due_date),
                "status": inst.status,
                "late_fee_applied": float(inst.late_fee_applied),
            }
            for inst in invoice.installments
        ],
    }


@router.get("/installments")
async def list_installments(
    invoice_id: Optional[int] = None,
    student_id: Optional[int] = None,
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    query = select(FeeInstallment)
    if invoice_id:
        query = query.where(FeeInstallment.invoice_id == invoice_id)
    if student_id:
        query = query.join(FeeInvoice).where(FeeInvoice.student_id == student_id)
    if status:
        query = query.where(FeeInstallment.status == status)
    result = await db.execute(query.order_by(FeeInstallment.due_date))
    installments = result.scalars().all()
    return [
        {
            "id": i.id,
            "invoice_id": i.invoice_id,
            "installment_number": i.installment_number,
            "description": i.description,
            "amount": float(i.amount),
            "paid_amount": float(i.paid_amount),
            "due_date": str(i.due_date),
            "status": i.status,
        }
        for i in installments
    ]


# ---------- Unified Fees & Payments: Overview & Register ----------
@router.get("/overview")
async def get_fees_overview(
    academic_year_id: Optional[int] = None,
    board_id: Optional[int] = None,
    standard_id: Optional[int] = None,
    division_id: Optional[int] = None,
    institution_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """
    Consolidated fees overview metrics with cascading filters:
    - Summary figures (obligation, collected, outstanding, rate, student count)
    - Board & Batch breakdowns
    - Monthly collection trend
    - Recent payments
    """
    effective_inst_id = institution_id
    if institution_id:
        inst_has_students = (await db.execute(select(func.count(Student.id)).where(Student.institution_id == institution_id))).scalar() or 0
        if inst_has_students == 0:
            effective_inst_id = None

    # Base invoice query
    inv_query = (
        select(
            func.coalesce(func.sum(FeeInvoice.net_amount), 0).label("total_obligation"),
            func.coalesce(func.sum(FeeInvoice.paid_amount), 0).label("total_collected"),
            func.coalesce(func.sum(FeeInvoice.outstanding_amount), 0).label("total_outstanding"),
            func.count(func.distinct(FeeInvoice.student_id)).label("student_count"),
        )
        .join(Student, FeeInvoice.student_id == Student.id)
        .outerjoin(
            StudentEnrollment,
            (FeeInvoice.student_id == StudentEnrollment.student_id)
            & (FeeInvoice.academic_year_id == StudentEnrollment.academic_year_id),
        )
        .outerjoin(Division, StudentEnrollment.division_id == Division.id)
        .where(FeeInvoice.status != "cancelled")
    )

    if academic_year_id:
        inv_query = inv_query.where(FeeInvoice.academic_year_id == academic_year_id)
    if effective_inst_id:
        inv_query = inv_query.where(Student.institution_id == effective_inst_id)
    if board_id:
        inv_query = inv_query.where(Division.board_id == board_id)
    if standard_id:
        inv_query = inv_query.where(StudentEnrollment.standard_id == standard_id)
    if division_id:
        inv_query = inv_query.where(StudentEnrollment.division_id == division_id)

    stats = (await db.execute(inv_query)).one()
    total_obligation = float(stats.total_obligation)
    total_collected = float(stats.total_collected)
    total_outstanding = float(stats.total_outstanding)
    student_count = stats.student_count or 0
    collection_rate = (
        round((total_collected / total_obligation) * 100, 1)
        if total_obligation > 0
        else 0.0
    )

    # Board Breakdown
    board_query = (
        select(
            func.coalesce(Board.name, "General").label("board_name"),
            func.coalesce(func.sum(FeeInvoice.net_amount), 0).label("total_fees"),
            func.coalesce(func.sum(FeeInvoice.paid_amount), 0).label("collected"),
            func.coalesce(func.sum(FeeInvoice.outstanding_amount), 0).label("outstanding"),
            func.count(func.distinct(FeeInvoice.student_id)).label("student_count"),
        )
        .join(Student, FeeInvoice.student_id == Student.id)
        .outerjoin(
            StudentEnrollment,
            (FeeInvoice.student_id == StudentEnrollment.student_id)
            & (FeeInvoice.academic_year_id == StudentEnrollment.academic_year_id),
        )
        .outerjoin(Division, StudentEnrollment.division_id == Division.id)
        .outerjoin(Board, Division.board_id == Board.id)
        .where(FeeInvoice.status != "cancelled")
    )
    if academic_year_id:
        board_query = board_query.where(FeeInvoice.academic_year_id == academic_year_id)
    if effective_inst_id:
        board_query = board_query.where(Student.institution_id == effective_inst_id)
    if board_id:
        board_query = board_query.where(Division.board_id == board_id)
    if standard_id:
        board_query = board_query.where(StudentEnrollment.standard_id == standard_id)
    if division_id:
        board_query = board_query.where(StudentEnrollment.division_id == division_id)

    board_query = board_query.group_by(Board.name).order_by(desc("total_fees"))
    board_rows = (await db.execute(board_query)).all()
    board_breakdown = [
        {
            "board_name": r.board_name,
            "total_fees": float(r.total_fees),
            "collected": float(r.collected),
            "outstanding": float(r.outstanding),
            "student_count": r.student_count,
            "rate": (
                round((float(r.collected) / float(r.total_fees)) * 100, 1)
                if float(r.total_fees) > 0
                else 0.0
            ),
        }
        for r in board_rows
    ]

    # Batch / Division Breakdown
    batch_query = (
        select(
            func.coalesce(Division.name, "Unassigned").label("batch_name"),
            func.coalesce(Standard.name, "General").label("standard_name"),
            func.coalesce(Board.name, "General").label("board_name"),
            func.coalesce(func.sum(FeeInvoice.net_amount), 0).label("total_fees"),
            func.coalesce(func.sum(FeeInvoice.paid_amount), 0).label("collected"),
            func.coalesce(func.sum(FeeInvoice.outstanding_amount), 0).label("outstanding"),
            func.count(func.distinct(FeeInvoice.student_id)).label("student_count"),
        )
        .join(Student, FeeInvoice.student_id == Student.id)
        .outerjoin(
            StudentEnrollment,
            (FeeInvoice.student_id == StudentEnrollment.student_id)
            & (FeeInvoice.academic_year_id == StudentEnrollment.academic_year_id),
        )
        .outerjoin(Division, StudentEnrollment.division_id == Division.id)
        .outerjoin(Standard, StudentEnrollment.standard_id == Standard.id)
        .outerjoin(Board, Division.board_id == Board.id)
        .where(FeeInvoice.status != "cancelled")
    )
    if academic_year_id:
        batch_query = batch_query.where(FeeInvoice.academic_year_id == academic_year_id)
    if effective_inst_id:
        batch_query = batch_query.where(Student.institution_id == effective_inst_id)
    if board_id:
        batch_query = batch_query.where(Division.board_id == board_id)
    if standard_id:
        batch_query = batch_query.where(StudentEnrollment.standard_id == standard_id)
    if division_id:
        batch_query = batch_query.where(StudentEnrollment.division_id == division_id)

    batch_query = batch_query.group_by(Division.name, Standard.name, Board.name).order_by(desc("total_fees"))
    batch_rows = (await db.execute(batch_query)).all()
    batch_breakdown = [
        {
            "batch_name": r.batch_name,
            "standard_name": r.standard_name,
            "board_name": r.board_name,
            "total_fees": float(r.total_fees),
            "collected": float(r.collected),
            "outstanding": float(r.outstanding),
            "student_count": r.student_count,
            "rate": (
                round((float(r.collected) / float(r.total_fees)) * 100, 1)
                if float(r.total_fees) > 0
                else 0.0
            ),
        }
        for r in batch_rows
    ]

    # Monthly collection trends
    month_key = func.to_char(Payment.payment_date, "YYYY-MM")
    month_label = func.to_char(Payment.payment_date, "Mon YYYY")
    trend_query = (
        select(
            month_key.label("month_key"),
            month_label.label("month_label"),
            func.coalesce(func.sum(Payment.amount), 0).label("collected"),
        )
        .join(Student, Payment.student_id == Student.id)
        .outerjoin(
            StudentEnrollment,
            (Payment.student_id == StudentEnrollment.student_id)
            & (Payment.academic_year_id == StudentEnrollment.academic_year_id),
        )
        .outerjoin(Division, StudentEnrollment.division_id == Division.id)
        .where(Payment.status != "reversed")
    )
    if academic_year_id:
        trend_query = trend_query.where(Payment.academic_year_id == academic_year_id)
    if effective_inst_id:
        trend_query = trend_query.where(Student.institution_id == effective_inst_id)
    if board_id:
        trend_query = trend_query.where(Division.board_id == board_id)
    if standard_id:
        trend_query = trend_query.where(StudentEnrollment.standard_id == standard_id)
    if division_id:
        trend_query = trend_query.where(StudentEnrollment.division_id == division_id)

    trend_query = trend_query.group_by(month_key, month_label).order_by(month_key.asc())
    trend_rows = (await db.execute(trend_query)).all()
    cumulative_amount = 0.0
    monthly_trends = []
    for r in trend_rows:
        coll = float(r.collected)
        cumulative_amount += coll
        monthly_trends.append({
            "month": r.month_label,
            "collected": coll,
            "cumulative": cumulative_amount,
        })

    # Payment Methods distribution
    method_query = (
        select(
            Payment.payment_method,
            func.coalesce(func.sum(Payment.amount), 0).label("amount"),
            func.count(Payment.id).label("count"),
        )
        .join(Student, Payment.student_id == Student.id)
        .outerjoin(
            StudentEnrollment,
            (Payment.student_id == StudentEnrollment.student_id)
            & (Payment.academic_year_id == StudentEnrollment.academic_year_id),
        )
        .outerjoin(Division, StudentEnrollment.division_id == Division.id)
        .where(Payment.status != "reversed")
    )
    if academic_year_id:
        method_query = method_query.where(Payment.academic_year_id == academic_year_id)
    if effective_inst_id:
        method_query = method_query.where(Student.institution_id == effective_inst_id)
    if board_id:
        method_query = method_query.where(Division.board_id == board_id)
    if standard_id:
        method_query = method_query.where(StudentEnrollment.standard_id == standard_id)
    if division_id:
        method_query = method_query.where(StudentEnrollment.division_id == division_id)

    method_query = method_query.group_by(Payment.payment_method).order_by(desc("amount"))
    method_rows = (await db.execute(method_query)).all()
    total_method_amount = sum(float(r.amount) for r in method_rows)
    payment_methods = [
        {
            "method": r.payment_method,
            "amount": float(r.amount),
            "count": r.count,
            "percentage": (
                round((float(r.amount) / total_method_amount) * 100, 1)
                if total_method_amount > 0
                else 0.0
            ),
        }
        for r in method_rows
    ]

    # Top Overdue Accounts / Invoices
    overdue_query = (
        select(
            FeeInvoice.id,
            FeeInvoice.invoice_number,
            FeeInvoice.outstanding_amount,
            FeeInvoice.due_date,
            FeeInvoice.status,
            Student.id.label("student_id"),
            Student.admission_number,
            Student.first_name,
            Student.last_name,
            Student.phone,
            Board.name.label("board_name"),
            Standard.name.label("standard_name"),
            Division.name.label("batch_name"),
        )
        .join(Student, FeeInvoice.student_id == Student.id)
        .outerjoin(
            StudentEnrollment,
            (FeeInvoice.student_id == StudentEnrollment.student_id)
            & (FeeInvoice.academic_year_id == StudentEnrollment.academic_year_id),
        )
        .outerjoin(Division, StudentEnrollment.division_id == Division.id)
        .outerjoin(Standard, StudentEnrollment.standard_id == Standard.id)
        .outerjoin(Board, Division.board_id == Board.id)
        .where(FeeInvoice.status != "cancelled")
        .where(FeeInvoice.outstanding_amount > 0)
    )
    if academic_year_id:
        overdue_query = overdue_query.where(FeeInvoice.academic_year_id == academic_year_id)
    if effective_inst_id:
        overdue_query = overdue_query.where(Student.institution_id == effective_inst_id)
    if board_id:
        overdue_query = overdue_query.where(Division.board_id == board_id)
    if standard_id:
        overdue_query = overdue_query.where(StudentEnrollment.standard_id == standard_id)
    if division_id:
        overdue_query = overdue_query.where(StudentEnrollment.division_id == division_id)

    overdue_query = overdue_query.order_by(desc(FeeInvoice.outstanding_amount), asc(FeeInvoice.due_date)).limit(10)
    overdue_rows = (await db.execute(overdue_query)).all()
    top_overdue = [
        {
            "invoice_id": r.id,
            "invoice_number": r.invoice_number,
            "student_id": r.student_id,
            "student_name": f"{r.first_name} {r.last_name}".strip(),
            "admission_number": r.admission_number,
            "phone": r.phone or "",
            "board_name": r.board_name or "General",
            "standard_name": r.standard_name or "General",
            "batch_name": r.batch_name or "Unassigned",
            "due_amount": float(r.outstanding_amount),
            "due_date": str(r.due_date) if r.due_date else None,
            "status": r.status,
        }
        for r in overdue_rows
    ]

    # Recent payments (last 8)
    rec_query = (
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
        .where(Payment.status != "reversed")
    )
    if academic_year_id:
        rec_query = rec_query.where(Payment.academic_year_id == academic_year_id)
    if effective_inst_id:
        rec_query = rec_query.where(Student.institution_id == effective_inst_id)
    if board_id:
        rec_query = rec_query.where(Division.board_id == board_id)
    if standard_id:
        rec_query = rec_query.where(StudentEnrollment.standard_id == standard_id)
    if division_id:
        rec_query = rec_query.where(StudentEnrollment.division_id == division_id)

    rec_query = rec_query.order_by(desc(Payment.payment_date), desc(Payment.created_at)).limit(8)
    recent_rows = (await db.execute(rec_query)).all()
    recent_payments = [
        {
            "id": p.id,
            "receipt_number": r_num or f"RCP-{p.id:06d}",
            "student_id": p.student_id,
            "student_name": f"{s.first_name} {s.last_name}".strip(),
            "admission_number": s.admission_number,
            "board": bd_name or "General",
            "standard": st_name or "General",
            "batch": b_name or "General",
            "amount": float(p.amount),
            "payment_date": str(p.payment_date),
            "payment_method": p.payment_method,
            "status": p.status,
        }
        for p, s, r_num, b_name, st_name, bd_name in recent_rows
    ]

    return {
        "summary": {
            "total_obligation": total_obligation,
            "total_collected": total_collected,
            "total_outstanding": total_outstanding,
            "collection_rate": collection_rate,
            "student_count": student_count,
        },
        "board_breakdown": board_breakdown,
        "batch_breakdown": batch_breakdown,
        "monthly_trends": monthly_trends,
        "payment_methods": payment_methods,
        "top_overdue": top_overdue,
        "recent_payments": recent_payments,
    }


@router.get("/register")
async def get_fee_register(
    academic_year_id: Optional[int] = None,
    board_id: Optional[int] = None,
    standard_id: Optional[int] = None,
    division_id: Optional[int] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """
    Consolidated student fee register records with cascading filters:
    Student obligations, payment totals, balance, installment schedule, and recent payment date.
    """
    query = (
        select(
            FeeInvoice,
            Student,
            AcademicYear,
            Standard,
            Division,
            Board,
            func.count(Payment.id).label("payment_count"),
            func.max(Payment.payment_date).label("last_payment_date"),
        )
        .options(selectinload(FeeInvoice.installments))
        .join(Student, FeeInvoice.student_id == Student.id)
        .join(AcademicYear, FeeInvoice.academic_year_id == AcademicYear.id)
        .outerjoin(
            StudentEnrollment,
            (FeeInvoice.student_id == StudentEnrollment.student_id)
            & (FeeInvoice.academic_year_id == StudentEnrollment.academic_year_id),
        )
        .outerjoin(Standard, StudentEnrollment.standard_id == Standard.id)
        .outerjoin(Division, StudentEnrollment.division_id == Division.id)
        .outerjoin(Board, Division.board_id == Board.id)
        .outerjoin(
            Payment,
            (FeeInvoice.student_id == Payment.student_id)
            & (FeeInvoice.academic_year_id == Payment.academic_year_id)
            & (Payment.status != "reversed"),
        )
        .where(FeeInvoice.status != "cancelled")
    )

    if academic_year_id:
        query = query.where(FeeInvoice.academic_year_id == academic_year_id)
    if board_id:
        query = query.where(Division.board_id == board_id)
    if standard_id:
        query = query.where(StudentEnrollment.standard_id == standard_id)
    if division_id:
        query = query.where(StudentEnrollment.division_id == division_id)
    if status:
        query = query.where(FeeInvoice.status == status)
    if search:
        search_term = f"%{search.strip()}%"
        query = query.where(
            or_(
                Student.first_name.ilike(search_term),
                Student.last_name.ilike(search_term),
                Student.admission_number.ilike(search_term),
                FeeInvoice.invoice_number.ilike(search_term),
            )
        )

    query = query.group_by(
        FeeInvoice.id,
        Student.id,
        AcademicYear.id,
        Standard.id,
        Division.id,
        Board.id,
    ).order_by(Student.first_name.asc(), FeeInvoice.id.desc())

    rows = (await db.execute(query)).all()

    register_entries = []
    for inv, student, ay, std, div, brd, p_count, last_p_date in rows:
        register_entries.append({
            "student_id": student.id,
            "admission_number": student.admission_number,
            "student_name": f"{student.first_name} {student.last_name}",
            "phone": student.phone or "—",
            "board_id": brd.id if brd else None,
            "board_name": brd.name if brd else "General",
            "standard_id": std.id if std else None,
            "standard_name": std.name if std else "—",
            "division_id": div.id if div else None,
            "batch_name": div.name if div else "Unassigned",
            "academic_year_id": ay.id,
            "academic_year_name": ay.name,
            "invoice_id": inv.id,
            "invoice_number": inv.invoice_number,
            "total_amount": float(inv.total_amount),
            "discount_amount": float(inv.discount_amount),
            "net_amount": float(inv.net_amount),
            "paid_amount": float(inv.paid_amount),
            "outstanding_amount": float(inv.outstanding_amount),
            "status": inv.status,
            "due_date": str(inv.due_date) if inv.due_date else None,
            "payment_count": p_count or 0,
            "last_payment_date": str(last_p_date) if last_p_date else None,
            "installments": [
                {
                    "id": inst.id,
                    "installment_number": inst.installment_number,
                    "description": inst.description,
                    "amount": float(inst.amount),
                    "paid_amount": float(inst.paid_amount),
                    "due_date": str(inst.due_date),
                    "status": inst.status,
                }
                for inst in (inv.installments or [])
            ],
        })

    return register_entries

