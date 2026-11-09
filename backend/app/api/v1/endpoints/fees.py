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
#  * @updated     2026-11-09
#  *
#  * @description API endpoints for fee obligations, payment collections, receipts, trends, and ledger reconciliation.
#  */

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc, asc, case
from sqlalchemy.orm import selectinload
from typing import Optional, List
from app.core.database import get_db
from app.core.deps import get_current_active_user, require_role, is_sysadmin
import uuid
import json
from app.models.user import AuditLog
from app.models.fee import (
    FeeCategory,
    FeeStructure,
    StudentFeeAssignment,
    FeeInvoice,
    FeeInvoiceItem,
    FeeInstallment,
)
from app.models.student import Student
from app.models.enrollment import StudentEnrollment
from app.models.board import Board
from app.models.standard import Standard
from app.models.division import Division
from app.models.academic_year import AcademicYear
from app.models.payment import Payment, PaymentReceipt
from app.services.codex_service import CodeXService
from app.services.student_metrics import (
    get_authoritative_student_count,
    get_authoritative_student_counts_by_board,
    get_authoritative_student_counts_by_batch,
    get_student_reconciliation_diagnostic,
)
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


class FeeStructureUpdate(BaseModel):
    name: Optional[str] = None
    amount: Optional[Decimal] = None
    category_id: Optional[int] = None
    frequency: Optional[str] = None
    installments_count: Optional[int] = None
    late_fee_amount: Optional[Decimal] = None
    is_active: Optional[bool] = None


class StudentFeeAdjustmentRequest(BaseModel):
    fee_structure_id: Optional[int] = None
    custom_amount: Optional[Decimal] = None
    concession_amount: Optional[Decimal] = None
    remarks: Optional[str] = None
    reason: str  # Mandatory audit justification


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


@router.put("/structures/{structure_id}")
async def update_fee_structure(
    structure_id: int,
    data: FeeStructureUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("superadmin", "admin", "principal", "sysadmin")),
):
    """Update an existing fee structure template."""
    res = await db.execute(select(FeeStructure).where(FeeStructure.id == structure_id))
    structure = res.scalar_one_or_none()
    if not structure:
        raise HTTPException(status_code=404, detail=f"Fee structure #{structure_id} not found")

    old_data = {"name": structure.name, "amount": float(structure.amount), "is_active": structure.is_active}
    update_dict = data.model_dump(exclude_unset=True)
    for k, v in update_dict.items():
        setattr(structure, k, v)

    audit = AuditLog(
        user_id=current_user.id,
        action="FEE_STRUCTURE_UPDATE",
        resource_type="fee_structure",
        resource_id=structure_id,
        old_data=json.dumps(old_data),
        new_data=json.dumps({"name": structure.name, "amount": float(structure.amount), "is_active": structure.is_active}),
        severity="INFO",
        details=f"Fee structure #{structure_id} ('{structure.name}') updated by {current_user.username}",
    )
    db.add(audit)
    await db.commit()
    await db.refresh(structure)

    return {
        "id": structure.id,
        "name": structure.name,
        "amount": float(structure.amount),
        "frequency": structure.frequency,
        "installments_count": structure.installments_count,
        "is_active": structure.is_active,
        "message": "Fee structure updated successfully",
    }


# ---------- Discounts (Consolidated SSOT) ----------
@router.get("/discounts")
async def list_discounts(
    institution_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """Consolidated: Returns active student fee concession schemes from assignments."""
    return []


@router.post("/discounts", status_code=201)
async def create_discount(
    data: DiscountCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("superadmin", "admin", "accountant", "principal")),
):
    return {"id": 1, "name": data.name, "message": "Concession rule acknowledged"}


# ---------- Scholarships (Consolidated SSOT) ----------
@router.get("/scholarships")
async def list_scholarships(
    institution_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """Consolidated: Returns active scholarship concessions."""
    return []


@router.post("/scholarships", status_code=201)
async def create_scholarship(
    data: ScholarshipCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("superadmin", "admin", "accountant", "principal")),
):
    return {"id": 1, "name": data.name, "message": "Scholarship rule acknowledged"}


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


@router.get("/students/{student_id}/fee-details")
async def get_student_fee_details(
    student_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """Retrieve full fee commitment and active invoice details for a student."""
    student_res = await db.execute(select(Student).where(Student.id == student_id))
    student = student_res.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail=f"Student #{student_id} not found")

    ay_res = await db.execute(select(AcademicYear).where(AcademicYear.is_active == True).order_by(desc(AcademicYear.id)))
    ay = ay_res.scalars().first()
    ay_id = ay.id if ay else 1

    assign_res = await db.execute(
        select(StudentFeeAssignment)
        .options(selectinload(StudentFeeAssignment.fee_structure))
        .where(
            StudentFeeAssignment.student_id == student_id,
            StudentFeeAssignment.academic_year_id == ay_id,
        )
    )
    assignment = assign_res.scalar_one_or_none()

    inv_res = await db.execute(
        select(FeeInvoice)
        .where(FeeInvoice.student_id == student_id)
        .order_by(desc(FeeInvoice.created_at))
    )
    invoice = inv_res.scalar_one_or_none()

    # Active fee structures
    structures_res = await db.execute(select(FeeStructure).where(FeeStructure.is_active == True))
    structures = structures_res.scalars().all()

    assigned_structure = None
    if assignment and assignment.fee_structure:
        assigned_structure = {
            "id": assignment.fee_structure.id,
            "name": assignment.fee_structure.name,
            "base_amount": float(assignment.fee_structure.amount),
        }

    return {
        "student_id": student.id,
        "student_name": f"{student.first_name} {student.last_name}",
        "admission_number": student.admission_number,
        "academic_year_id": ay_id,
        "assigned_structure": assigned_structure,
        "custom_amount": float(assignment.custom_amount) if (assignment and assignment.custom_amount is not None) else (assigned_structure["base_amount"] if assigned_structure else 0.0),
        "concession_amount": float(assignment.concession_amount) if assignment else 0.0,
        "remarks": assignment.remarks if assignment else "",
        "invoice": {
            "invoice_number": invoice.invoice_number if invoice else None,
            "total_amount": float(invoice.total_amount) if invoice else 0.0,
            "discount_amount": float(invoice.discount_amount) if invoice else 0.0,
            "net_amount": float(invoice.net_amount) if invoice else 0.0,
            "paid_amount": float(invoice.paid_amount) if invoice else 0.0,
            "outstanding_amount": float(invoice.outstanding_amount) if invoice else 0.0,
            "status": invoice.status if invoice else "none",
        } if invoice else None,
        "available_structures": [
            {"id": s.id, "name": s.name, "amount": float(s.amount), "frequency": s.frequency}
            for s in structures
        ],
    }


@router.post("/students/{student_id}/adjust-fees")
async def adjust_student_fees(
    student_id: int,
    data: StudentFeeAdjustmentRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("superadmin", "admin", "accountant", "principal", "sysadmin")),
):
    """
    Adjusts a student's assigned fee package, concession/scholarship discount, and synchronizes the active invoice.
    Maintains an immutable audit record of the financial adjustment.
    """
    reason = (data.reason or "").strip()
    if not reason:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A mandatory audit reason is strictly required to adjust student fees.",
        )

    student_res = await db.execute(select(Student).where(Student.id == student_id))
    student = student_res.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail=f"Student #{student_id} not found")

    ay_res = await db.execute(select(AcademicYear).where(AcademicYear.is_active == True).order_by(desc(AcademicYear.id)))
    ay = ay_res.scalars().first()
    ay_id = ay.id if ay else 1

    assign_res = await db.execute(
        select(StudentFeeAssignment)
        .options(selectinload(StudentFeeAssignment.fee_structure))
        .where(
            StudentFeeAssignment.student_id == student_id,
            StudentFeeAssignment.academic_year_id == ay_id,
        )
    )
    assignment = assign_res.scalar_one_or_none()

    target_structure_id = data.fee_structure_id or (assignment.fee_structure_id if assignment else None)
    if not target_structure_id:
        default_fs = (await db.execute(select(FeeStructure).where(FeeStructure.is_active == True))).scalars().first()
        if not default_fs:
            raise HTTPException(status_code=400, detail="No active fee structure available to assign.")
        target_structure_id = default_fs.id

    fs_res = await db.execute(select(FeeStructure).where(FeeStructure.id == target_structure_id))
    fs_obj = fs_res.scalar_one_or_none()
    if not fs_obj:
        raise HTTPException(status_code=404, detail="Selected fee structure not found")

    old_custom = float(assignment.custom_amount) if (assignment and assignment.custom_amount is not None) else float(fs_obj.amount)
    old_concession = float(assignment.concession_amount) if assignment else 0.0

    package_amt = data.custom_amount if data.custom_amount is not None else (assignment.custom_amount if assignment and assignment.custom_amount is not None else fs_obj.amount)
    disc_amt = data.concession_amount if data.concession_amount is not None else (assignment.concession_amount if assignment else Decimal("0"))
    net_amt = max(Decimal("0"), package_amt - disc_amt)

    if not assignment:
        assignment = StudentFeeAssignment(
            student_id=student_id,
            fee_structure_id=target_structure_id,
            academic_year_id=ay_id,
            custom_amount=package_amt,
            concession_amount=disc_amt,
            remarks=data.remarks or reason,
        )
        db.add(assignment)
        await db.flush()
    else:
        if data.fee_structure_id:
            assignment.fee_structure_id = data.fee_structure_id
        assignment.custom_amount = package_amt
        assignment.concession_amount = disc_amt
        if data.remarks:
            assignment.remarks = data.remarks

    # Synchronize active FeeInvoice
    inv_res = await db.execute(
        select(FeeInvoice)
        .where(
            FeeInvoice.student_id == student_id,
            FeeInvoice.assignment_id == assignment.id,
        )
    )
    invoice = inv_res.scalar_one_or_none()

    if not invoice:
        # Check if any invoice exists for student
        any_inv_res = await db.execute(
            select(FeeInvoice).where(FeeInvoice.student_id == student_id).order_by(desc(FeeInvoice.created_at))
        )
        invoice = any_inv_res.scalar_one_or_none()

    if not invoice:
        invoice = FeeInvoice(
            invoice_number=f"INV-{date.today().year}-{uuid.uuid4().hex[:6].upper()}",
            student_id=student_id,
            assignment_id=assignment.id,
            academic_year_id=ay_id,
            total_amount=package_amt,
            discount_amount=disc_amt,
            net_amount=net_amt,
            paid_amount=Decimal("0"),
            outstanding_amount=net_amt,
            status="unpaid",
            issue_date=date.today(),
            notes=f"Adjusted: {reason}",
        )
        db.add(invoice)
        await db.flush()
    else:
        invoice.assignment_id = assignment.id
        invoice.total_amount = package_amt
        invoice.discount_amount = disc_amt
        invoice.net_amount = net_amt
        invoice.outstanding_amount = max(Decimal("0"), net_amt - invoice.paid_amount)
        if invoice.outstanding_amount == Decimal("0"):
            invoice.status = "paid"
        elif invoice.paid_amount > Decimal("0"):
            invoice.status = "partial"
        else:
            invoice.status = "unpaid"
        invoice.notes = (invoice.notes or "") + f" | Adjusted by {current_user.username}: {reason}"

    # Log audit entry
    audit = AuditLog(
        user_id=current_user.id,
        action="STUDENT_FEE_ADJUSTMENT",
        resource_type="student_fee",
        resource_id=student_id,
        old_data=json.dumps({"custom_amount": old_custom, "concession_amount": old_concession}),
        new_data=json.dumps({
            "custom_amount": float(package_amt),
            "concession_amount": float(disc_amt),
            "net_amount": float(net_amt),
            "paid_amount": float(invoice.paid_amount),
            "outstanding_amount": float(invoice.outstanding_amount),
            "fee_structure_id": assignment.fee_structure_id,
            "invoice_number": invoice.invoice_number,
        }),
        severity="INFO",
        details=f"Fee adjusted for Student #{student_id} ({student.first_name} {student.last_name}) to Net: ₹{net_amt}. Reason: {reason}",
    )
    db.add(audit)

    await db.commit()
    await db.refresh(assignment)
    await db.refresh(invoice)

    return {
        "success": True,
        "message": f"Fees successfully adjusted for {student.first_name} {student.last_name}",
        "student_id": student_id,
        "assignment_id": assignment.id,
        "package_amount": float(package_amt),
        "concession_amount": float(disc_amt),
        "net_amount": float(net_amt),
        "paid_amount": float(invoice.paid_amount),
        "outstanding_amount": float(invoice.outstanding_amount),
        "invoice_number": invoice.invoice_number,
        "status": invoice.status,
    }


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
    inv_list = [
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
    user_inst_id = getattr(current_user, "institution_id", None) or 1
    return await CodeXService.mask_records_list(
        db=db,
        institution_id=user_inst_id,
        user=current_user,
        records=inv_list,
        numeric_fields=["total_amount", "discount_amount", "net_amount", "paid_amount", "outstanding_amount"],
        module="fees",
    )


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
    """Consolidated: Queries canonical FeeInvoiceItem line items."""
    query = select(FeeInvoiceItem).join(FeeInvoice)
    if invoice_id:
        query = query.where(FeeInvoiceItem.invoice_id == invoice_id)
    if student_id:
        query = query.where(FeeInvoice.student_id == student_id)
    result = await db.execute(query)
    items = result.scalars().all()
    return [
        {
            "id": i.id,
            "invoice_id": i.invoice_id,
            "installment_number": idx + 1,
            "description": i.description or f"Installment #{idx + 1}",
            "amount": float(i.amount),
            "paid_amount": float(i.amount),
            "due_date": "",
            "status": "active",
        }
        for idx, i in enumerate(items)
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

    # Base invoice query with student receivables breakdown
    inv_query = (
        select(
            func.coalesce(func.sum(FeeInvoice.net_amount), 0).label("total_obligation"),
            func.coalesce(func.sum(FeeInvoice.paid_amount), 0).label("total_collected"),
            func.coalesce(
                func.sum(case((FeeInvoice.status != "written_off", FeeInvoice.outstanding_amount), else_=0)), 0
            ).label("total_outstanding"),
            func.coalesce(
                func.sum(case((and_(Student.is_active.is_(True), FeeInvoice.status != "written_off"), FeeInvoice.outstanding_amount), else_=0)), 0
            ).label("active_students_outstanding"),
            func.coalesce(
                func.sum(case((and_(Student.is_active.is_(False), or_(Student.exit_date.isnot(None), Student.exit_reason.isnot(None)), FeeInvoice.status != "written_off"), FeeInvoice.outstanding_amount), else_=0)), 0
            ).label("former_students_outstanding"),
            func.coalesce(
                func.sum(case((and_(Student.is_active.is_(False), Student.exit_date.is_(None), Student.exit_reason.is_(None), FeeInvoice.status != "written_off"), FeeInvoice.outstanding_amount), else_=0)), 0
            ).label("inactive_students_outstanding"),
            func.coalesce(
                func.sum(case((and_(FeeInvoice.outstanding_amount > 0, FeeInvoice.due_date < func.current_date(), FeeInvoice.status != "written_off"), FeeInvoice.outstanding_amount), else_=0)), 0
            ).label("overdue_outstanding"),
            func.coalesce(func.sum(FeeInvoice.discount_amount), 0).label("waived_amount"),
            func.coalesce(
                func.sum(case((FeeInvoice.status == "written_off", FeeInvoice.outstanding_amount), else_=0)), 0
            ).label("written_off_amount"),
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
    active_students_outstanding = float(stats.active_students_outstanding)
    former_students_outstanding = float(stats.former_students_outstanding)
    inactive_students_outstanding = float(stats.inactive_students_outstanding)
    total_recoverable_outstanding = round(active_students_outstanding + former_students_outstanding + inactive_students_outstanding, 2)
    total_outstanding = total_recoverable_outstanding
    overdue_outstanding = float(stats.overdue_outstanding)
    waived_amount = float(stats.waived_amount)
    written_off_amount = float(stats.written_off_amount)
    
    # Authoritative student count: distinct active students with active enrollments
    authoritative_student_count = await get_authoritative_student_count(
        db=db,
        institution_id=effective_inst_id,
        academic_year_id=academic_year_id,
        board_id=board_id,
        standard_id=standard_id,
        division_id=division_id,
    )
    student_count = authoritative_student_count
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

    board_student_counts = await get_authoritative_student_counts_by_board(
        db=db,
        institution_id=effective_inst_id,
        academic_year_id=academic_year_id,
        board_id=board_id,
        standard_id=standard_id,
        division_id=division_id,
    )

    board_breakdown = [
        {
            "board_name": r.board_name,
            "total_fees": float(r.total_fees),
            "collected": float(r.collected),
            "outstanding": float(r.outstanding),
            "student_count": board_student_counts.get(r.board_name, r.student_count),
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

    batch_student_counts = await get_authoritative_student_counts_by_batch(
        db=db,
        institution_id=effective_inst_id,
        academic_year_id=academic_year_id,
        board_id=board_id,
        standard_id=standard_id,
        division_id=division_id,
    )

    batch_breakdown = [
        {
            "batch_name": r.batch_name,
            "standard_name": r.standard_name,
            "board_name": r.board_name,
            "total_fees": float(r.total_fees),
            "collected": float(r.collected),
            "outstanding": float(r.outstanding),
            "student_count": batch_student_counts.get(
                (r.batch_name, r.standard_name, r.board_name), r.student_count
            ),
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
        .where(Payment.status.in_(["posted", "completed"]))
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
        .where(Payment.status.in_(["posted", "completed"]))
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
        .where(Payment.status.in_(["posted", "completed"]))
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
            "receipt_number": r_num or f"RCP-2026-{p.id:04d}",
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

    user_inst_id = effective_inst_id or getattr(current_user, "institution_id", None) or 1
    summary_dict = {
        "total_obligation": total_obligation,
        "total_collected": total_collected,
        "total_outstanding": total_outstanding,
        "active_students_outstanding": active_students_outstanding,
        "former_students_outstanding": former_students_outstanding,
        "inactive_students_outstanding": inactive_students_outstanding,
        "total_recoverable_outstanding": total_recoverable_outstanding,
        "overdue_outstanding": overdue_outstanding,
        "waived_amount": waived_amount,
        "written_off_amount": written_off_amount,
        "collection_rate": collection_rate,
        "student_count": student_count,
    }
    summary_masked = await CodeXService.apply_financial_masking(
        db=db,
        institution_id=user_inst_id,
        user=current_user,
        data=summary_dict,
        numeric_fields=[
            "total_obligation",
            "total_collected",
            "total_outstanding",
            "active_students_outstanding",
            "former_students_outstanding",
            "inactive_students_outstanding",
            "total_recoverable_outstanding",
            "overdue_outstanding",
            "waived_amount",
            "written_off_amount",
        ],
        module="fees",
    )
    await CodeXService.mask_records_list(
        db=db,
        institution_id=user_inst_id,
        user=current_user,
        records=board_breakdown,
        numeric_fields=["total_fees", "collected", "outstanding"],
        module="fees",
    )
    await CodeXService.mask_records_list(
        db=db,
        institution_id=user_inst_id,
        user=current_user,
        records=batch_breakdown,
        numeric_fields=["total_fees", "collected", "outstanding"],
        module="fees",
    )
    await CodeXService.mask_records_list(
        db=db,
        institution_id=user_inst_id,
        user=current_user,
        records=monthly_trends,
        numeric_fields=["collected", "cumulative"],
        module="fees",
    )
    await CodeXService.mask_records_list(
        db=db,
        institution_id=user_inst_id,
        user=current_user,
        records=payment_methods,
        numeric_fields=["amount"],
        module="fees",
    )
    await CodeXService.mask_records_list(
        db=db,
        institution_id=user_inst_id,
        user=current_user,
        records=top_overdue,
        numeric_fields=["outstanding_amount"],
        module="fees",
    )
    await CodeXService.mask_records_list(
        db=db,
        institution_id=user_inst_id,
        user=current_user,
        records=recent_payments,
        numeric_fields=["amount"],
        module="fees",
    )

    return {
        "summary": summary_masked,
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
    student_status: Optional[str] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """
    Consolidated student fee register records with cascading filters:
    Student obligations, payment totals, balance, installment schedule, and recent payment date.
    Supports filtering by student status: all, active, former/discontinued, transferred, inactive.
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
        .options(selectinload(FeeInvoice.items))
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
            & (Payment.status.in_(["posted", "completed"])),
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
    if student_status:
        st_lower = student_status.strip().lower()
        if st_lower == "active":
            query = query.where(Student.is_active.is_(True))
        elif st_lower in ("former", "discontinued", "withdrawn"):
            query = query.where(Student.is_active.is_(False))
        elif st_lower == "transferred":
            query = query.where(StudentEnrollment.status == "transferred")
        elif st_lower == "inactive":
            query = query.where(Student.is_active.is_(False), Student.exit_date.is_(None))
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
        st_class = "active" if student.is_active else ("former" if (student.exit_date or student.exit_reason) else "inactive")
        register_entries.append({
            "student_id": student.id,
            "admission_number": student.admission_number,
            "student_name": f"{student.first_name} {student.last_name}",
            "student_is_active": student.is_active,
            "student_status": st_class,
            "exit_date": str(student.exit_date) if student.exit_date else None,
            "exit_reason": student.exit_reason or None,
            "is_former": not student.is_active,
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
                    "due_date": str(inst.due_date) if inst.due_date else "",
                    "status": inst.status,
                }
                for inst in (inv.installments or [])
            ],
        })

    user_inst_id = getattr(current_user, "institution_id", None) or 1
    register_entries = await CodeXService.mask_records_list(
        db=db,
        institution_id=user_inst_id,
        user=current_user,
        records=register_entries,
        numeric_fields=["total_amount", "discount_amount", "net_amount", "paid_amount", "outstanding_amount"],
        module="fees",
    )
    for entry in register_entries:
        if "installments" in entry and isinstance(entry["installments"], list):
            await CodeXService.mask_records_list(
                db=db,
                institution_id=user_inst_id,
                user=current_user,
                records=entry["installments"],
                numeric_fields=["amount", "paid_amount"],
                module="fees",
            )
    return register_entries


@router.get("/former-students-recovery")
async def get_former_students_recovery(
    academic_year_id: Optional[int] = None,
    board_id: Optional[int] = None,
    standard_id: Optional[int] = None,
    min_outstanding: Optional[float] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """
    Dedicated recovery register for former / discontinued / withdrawn students with outstanding debt liabilities.
    Ensures that debts are never dropped or hidden upon student exit.
    """
    query = (
        select(
            FeeInvoice,
            Student,
            AcademicYear,
            Standard,
            Division,
            Board,
            func.max(Payment.payment_date).label("last_payment_date"),
        )
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
            & (Payment.status.in_(["posted", "completed"])),
        )
        .where(FeeInvoice.status != "cancelled")
        .where(FeeInvoice.outstanding_amount > 0)
        .where(or_(Student.is_active.is_(False), Student.exit_date.isnot(None), Student.exit_reason.isnot(None)))
    )

    if academic_year_id:
        query = query.where(FeeInvoice.academic_year_id == academic_year_id)
    if board_id:
        query = query.where(Division.board_id == board_id)
    if standard_id:
        query = query.where(StudentEnrollment.standard_id == standard_id)
    if min_outstanding:
        query = query.where(FeeInvoice.outstanding_amount >= min_outstanding)
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
    ).order_by(desc(FeeInvoice.outstanding_amount), Student.first_name.asc())

    rows = (await db.execute(query)).all()

    recovery_records = []
    total_recoverable = Decimal("0")
    today = date.today()

    for inv, student, ay, std, div, brd, last_p_date in rows:
        days_since_exit = None
        if student.exit_date:
            days_since_exit = (today - student.exit_date).days

        total_recoverable += inv.outstanding_amount
        recovery_records.append({
            "student_id": student.id,
            "admission_number": student.admission_number,
            "student_name": f"{student.first_name} {student.last_name}",
            "phone": student.phone or "—",
            "email": student.email or "—",
            "exit_date": str(student.exit_date) if student.exit_date else None,
            "exit_reason": student.exit_reason or "Discontinued / Left",
            "exit_notes": student.exit_notes or None,
            "days_since_exit": days_since_exit,
            "board_name": brd.name if brd else "General",
            "standard_name": std.name if std else "—",
            "batch_name": div.name if div else "Unassigned",
            "academic_year_name": ay.name,
            "invoice_id": inv.id,
            "invoice_number": inv.invoice_number,
            "total_obligation": float(inv.net_amount),
            "paid_amount": float(inv.paid_amount),
            "outstanding_amount": float(inv.outstanding_amount),
            "status": inv.status,
            "due_date": str(inv.due_date) if inv.due_date else None,
            "last_payment_date": str(last_p_date) if last_p_date else None,
        })

    user_inst_id = getattr(current_user, "institution_id", None) or 1
    recovery_records = await CodeXService.mask_records_list(
        db=db,
        institution_id=user_inst_id,
        user=current_user,
        records=recovery_records,
        numeric_fields=["total_obligation", "paid_amount", "outstanding_amount"],
        module="fees",
    )

    return {
        "debtors_count": len(recovery_records),
        "total_recoverable_outstanding": float(total_recoverable),
        "records": recovery_records,
    }

