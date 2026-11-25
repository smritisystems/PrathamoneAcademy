# /**
#  * @file        fees.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      backend.app.api.v1.endpoints
#  *
#  * @author      Jawahar R. Mallah
#  * @organization Smritisys & AITDL Networks
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 PrathamOne EduOS
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-03
#  * @updated     2026-11-26
#  *
#  * @description API endpoints for fee obligations, payment collections, receipts, trends, and ledger reconciliation.
#  */

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc, asc, case
from sqlalchemy.orm import selectinload
from typing import Optional, List
from app.core.database import get_db
from app.core.deps import (
    get_current_active_user,
    require_role,
    is_sysadmin,
    get_data_environment,
    check_institution_access,
)
import uuid
import json
from app.models.user import AuditLog, User
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
from app.models.payment import Payment, PaymentAllocation, PaymentReceipt
from app.services.codex_service import CodeXService
from app.services.concession_service import ConcessionWorkflowService
from app.services.fee_invoice_service import issue_fee_invoice
from app.services.financial_governance_service import (
    FinancialGovernanceService,
    FinancialFilter,
    _latest_enrollment_sq,
)
from app.services.student_metrics import (
    get_authoritative_student_count,
    get_authoritative_student_counts_by_board,
    get_authoritative_student_counts_by_batch,
    get_student_reconciliation_diagnostic,
)
from pydantic import BaseModel, ConfigDict, Field
from datetime import date, datetime, timezone
from decimal import Decimal
import uuid

router = APIRouter()

FEE_STAFF_VIEW_ROLES = (
    "superadmin",
    "sysadmin",
    "super_admin",
    "admin",
    "principal",
    "accountant",
    "staff",
    "counselor",
    "counsellor",
    "receptionist",
)


def _authorize_fee_student_record(
    record_student_id: Optional[int],
    record_institution_id: Optional[int],
    current_user,
) -> None:
    """Enforces student self-ownership or staff role, plus tenant isolation on fee records."""
    role = (getattr(current_user, "role", "") or "").strip().lower()
    if role == "student":
        if not record_student_id or getattr(current_user, "student_id", None) != record_student_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access forbidden: Students may only view their own fee records.",
            )
    elif not is_sysadmin(current_user) and role not in FEE_STAFF_VIEW_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
    check_institution_access(record_institution_id, current_user)


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
    model_config = ConfigDict(extra="forbid")

    student_id: int
    fee_structure_id: int
    academic_year_id: int
    custom_amount: Optional[Decimal] = None
    remarks: Optional[str] = None


class InstallmentConfig(BaseModel):
    description: str = Field(min_length=1)
    due_date: date
    amount: Decimal = Field(gt=0)


class InvoiceCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    student_id: int
    assignment_id: int
    academic_year_id: int
    issue_date: date
    due_date: Optional[date] = None
    notes: Optional[str] = None
    installments: List[InstallmentConfig] = Field(min_length=1)


class CancelInvoiceRequest(BaseModel):
    reason: str



# ---------- Fee Categories ----------
@router.get("/categories")
async def list_fee_categories(
    institution_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    if institution_id is not None:
        check_institution_access(institution_id, current_user)
    target_inst = institution_id if institution_id is not None else (
        None if is_sysadmin(current_user) else getattr(current_user, "institution_id", None)
    )
    query = select(FeeCategory).where(FeeCategory.is_active == True)
    if target_inst is not None:
        query = query.where(FeeCategory.institution_id == target_inst)
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
    if institution_id is not None:
        check_institution_access(institution_id, current_user)
    target_inst = institution_id if institution_id is not None else (
        None if is_sysadmin(current_user) else getattr(current_user, "institution_id", None)
    )
    query = select(FeeStructure).where(FeeStructure.is_active == True)
    if academic_year_id:
        query = query.where(FeeStructure.academic_year_id == academic_year_id)
    if standard_id:
        query = query.where(FeeStructure.standard_id == standard_id)
    if target_inst is not None:
        query = query.where(FeeStructure.institution_id == target_inst)
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
    check_institution_access(structure.institution_id, current_user)

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
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail="Legacy discounts are retired. Use the governed fee concession workflow.",
    )


@router.post("/discounts", status_code=201)
async def create_discount(
    data: DiscountCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("superadmin", "admin", "accountant", "principal")),
):
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail="Legacy discounts are retired. Create and approve a fee concession instead.",
    )


# ---------- Scholarships (Consolidated SSOT) ----------
@router.get("/scholarships")
async def list_scholarships(
    institution_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail="Legacy scholarships are retired. Use the governed fee concession workflow.",
    )


@router.post("/scholarships", status_code=201)
async def create_scholarship(
    data: ScholarshipCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("superadmin", "admin", "accountant", "principal")),
):
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail="Legacy scholarships are retired. Create and approve a fee concession instead.",
    )


# ---------- Fee Assignments ----------
@router.get("/assignments")
async def list_fee_assignments(
    student_id: Optional[int] = None,
    academic_year_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    role = (getattr(current_user, "role", "") or "").strip().lower()
    if role == "student":
        own_sid = getattr(current_user, "student_id", None)
        if not own_sid or (student_id is not None and student_id != own_sid):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Students can only view their own fee assignments")
        student_id = own_sid
    elif not is_sysadmin(current_user) and role not in FEE_STAFF_VIEW_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

    query = (
        select(StudentFeeAssignment)
        .options(selectinload(StudentFeeAssignment.fee_structure))
        .join(Student, StudentFeeAssignment.student_id == Student.id)
    )
    if not is_sysadmin(current_user) and getattr(current_user, "institution_id", None):
        query = query.where(Student.institution_id == current_user.institution_id)
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
            "custom_amount": float(a.custom_amount) if a.custom_amount is not None else None,
            "concession_amount": float(a.concession_amount),
            "fee_structure_name": a.fee_structure.name if a.fee_structure else None,
            "fee_amount": float(a.fee_structure.amount) if a.fee_structure else None,
            "installments_count": a.fee_structure.installments_count if a.fee_structure else 1,
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
    student = await db.get(Student, data.student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    check_institution_access(student.institution_id, current_user)
    structure = await db.get(FeeStructure, data.fee_structure_id)
    if not structure:
        raise HTTPException(status_code=404, detail="Fee structure not found")
    if structure.academic_year_id != data.academic_year_id:
        raise HTTPException(
            status_code=400,
            detail="Fee structure and assignment must use the same academic year.",
        )
    if structure.institution_id != student.institution_id:
        raise HTTPException(
            status_code=400,
            detail="Fee structure and student must belong to the same institution.",
        )
    assignment = StudentFeeAssignment(
        **data.model_dump(),
        concession_amount=Decimal("0.00"),
    )
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
    _authorize_fee_student_record(student.id, student.institution_id, current_user)

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
        .options(selectinload(FeeInvoice.installments))
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

    custom_val = float(assignment.custom_amount) if (assignment and assignment.custom_amount is not None) else (assigned_structure["base_amount"] if assigned_structure else 0.0)
    inv_data = {
        "id": invoice.id if invoice else None,
        "invoice_number": invoice.invoice_number if invoice else None,
        "total_amount": float(invoice.total_amount) if invoice else 0.0,
        "discount_amount": float(invoice.discount_amount) if invoice else 0.0,
        "net_amount": float(invoice.net_amount) if invoice else 0.0,
        "paid_amount": float(invoice.paid_amount) if invoice else 0.0,
        "outstanding_amount": float(invoice.outstanding_amount) if invoice else 0.0,
        "status": invoice.status if invoice else "none",
        "due_date": str(invoice.due_date) if invoice and invoice.due_date else None,
        "installments": [
            {
                "id": installment.id,
                "installment_number": installment.installment_number,
                "description": installment.description,
                "amount": float(installment.amount),
                "paid_amount": float(installment.paid_amount),
                "outstanding_amount": float(installment.outstanding_amount),
                "due_date": str(installment.due_date),
                "status": installment.status,
            }
            for installment in invoice.installments
        ] if invoice else [],
    } if invoice else None

    return {
        "student_id": student.id,
        "student_name": f"{student.first_name} {student.last_name}",
        "admission_number": student.admission_number,
        "academic_year_id": ay_id,
        "assigned_structure": assigned_structure,
        "current_structure": assigned_structure,
        "custom_amount": custom_val,
        "custom_package_amount": custom_val,
        "concession_amount": float(assignment.concession_amount) if assignment else 0.0,
        "remarks": assignment.remarks if assignment else "",
        "invoice": inv_data,
        "current_invoice": inv_data,
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
    if data.concession_amount is not None and data.concession_amount > Decimal("0.00"):
        raise HTTPException(
            status_code=409,
            detail=(
                "Concessions must use the governed concession application and approval "
                "workflow; direct fee adjustments cannot apply discounts."
            ),
        )

    student_res = await db.execute(select(Student).where(Student.id == student_id))
    student = student_res.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail=f"Student #{student_id} not found")
    _authorize_fee_student_record(student.id, student.institution_id, current_user)

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

    old_custom = assignment.custom_amount if assignment else None
    package_amt = (
        data.custom_amount
        if data.custom_amount is not None
        else (
            assignment.custom_amount
            if assignment and assignment.custom_amount is not None
            else fs_obj.amount
        )
    )
    if package_amt <= Decimal("0.00") or package_amt != package_amt.quantize(Decimal("0.01")):
        raise HTTPException(
            status_code=422,
            detail="Assigned fee amount must be a positive currency amount.",
        )

    existing_invoice_id = None
    if assignment:
        existing_invoice_id = (
            await db.execute(
                select(FeeInvoice.id)
                .where(
                    FeeInvoice.assignment_id == assignment.id,
                    FeeInvoice.status != "cancelled",
                )
                .limit(1)
            )
        ).scalar_one_or_none()
    if existing_invoice_id is not None:
        raise HTTPException(
            status_code=409,
            detail=(
                "An issued invoice already exists for this fee assignment. Its financial "
                "snapshot cannot be changed here; use the governed concession workflow "
                "or authorized invoice cancellation."
            ),
        )

    if not assignment:
        assignment = StudentFeeAssignment(
            student_id=student_id,
            fee_structure_id=target_structure_id,
            academic_year_id=ay_id,
            custom_amount=package_amt,
            remarks=data.remarks or reason,
        )
        db.add(assignment)
        await db.flush()
    else:
        assignment.fee_structure_id = target_structure_id
        assignment.custom_amount = package_amt
        if data.remarks:
            assignment.remarks = data.remarks

    db.add(
        AuditLog(
            user_id=current_user.id,
            institution_id=student.institution_id
            or getattr(current_user, "institution_id", None),
            action="STUDENT_FEE_ASSIGNMENT_ADJUSTMENT",
            resource_type="student_fee_assignment",
            resource_id=assignment.id,
            old_data=json.dumps(
                {"custom_amount": str(old_custom) if old_custom is not None else None}
            ),
            new_data=json.dumps(
                {
                    "custom_amount": float(package_amt),
                    "fee_structure_id": assignment.fee_structure_id,
                }
            ),
            severity="INFO",
            details=(
                f"Fee assignment adjusted for Student #{student_id}: "
                f"₹{package_amt}. Reason: {reason}"
            ),
        )
    )
    await db.commit()
    await db.refresh(assignment)
    return {
        "success": True,
        "message": (
            f"Fee assignment updated for {student.first_name} {student.last_name}. "
            "Issue an invoice from Fee Invoicing and provide its persisted schedule."
        ),
        "student_id": student_id,
        "assignment_id": assignment.id,
        "package_amount": float(package_amt),
        "invoice_number": None,
        "status": "assignment_updated",
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
    role = (getattr(current_user, "role", "") or "").strip().lower()
    if role == "student":
        own_sid = getattr(current_user, "student_id", None)
        if not own_sid or (student_id is not None and student_id != own_sid):
            raise HTTPException(status_code=403, detail="Students may only view their own fee invoices")
        student_id = own_sid
    elif not is_sysadmin(current_user) and role not in FEE_STAFF_VIEW_ROLES:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    query = (
        select(FeeInvoice, Student)
        .options(selectinload(FeeInvoice.installments))
        .join(Student, FeeInvoice.student_id == Student.id)
    )
    if not is_sysadmin(current_user) and getattr(current_user, "institution_id", None):
        query = query.where(Student.institution_id == current_user.institution_id)
    if student_id:
        query = query.where(FeeInvoice.student_id == student_id)
    if academic_year_id:
        query = query.where(FeeInvoice.academic_year_id == academic_year_id)
    if status:
        query = query.where(FeeInvoice.status == status)
    result = await db.execute(query.order_by(FeeInvoice.created_at.desc()))
    invoices = result.all()

    student_ids = [student.id for inv, student in invoices]
    enr_map = {}
    if student_ids:
        enr_q = (
            select(
                StudentEnrollment.student_id,
                Standard.name.label("standard_name"),
                Division.name.label("division_name"),
                Board.name.label("board_name"),
            )
            .join(Standard, StudentEnrollment.standard_id == Standard.id)
            .outerjoin(Division, StudentEnrollment.division_id == Division.id)
            .outerjoin(Board, Division.board_id == Board.id)
            .where(StudentEnrollment.student_id.in_(student_ids))
            .order_by(
                StudentEnrollment.student_id,
                case((StudentEnrollment.status.in_(["active", "enrolled"]), 0), else_=1),
                StudentEnrollment.id.desc(),
            )
        )
        if academic_year_id:
            enr_q = enr_q.where(StudentEnrollment.academic_year_id == academic_year_id)
        enr_res = await db.execute(enr_q)
        for row in enr_res.all():
            if row.student_id not in enr_map:
                enr_map[row.student_id] = row

    inv_list = [
        {
            "id": inv.id,
            "invoice_number": inv.invoice_number,
            "student_id": inv.student_id,
            "student_name": " ".join(
                part
                for part in (student.first_name, student.middle_name, student.last_name)
                if part
            ),
            "admission_number": student.admission_number,
            "student_phone": student.phone,
            "standard_name": enr_map[student.id].standard_name if student.id in enr_map else None,
            "division_name": enr_map[student.id].division_name if student.id in enr_map else None,
            "board_name": enr_map[student.id].board_name if student.id in enr_map else None,
            "assignment_id": inv.assignment_id,
            "academic_year_id": inv.academic_year_id,
            "total_amount": float(inv.total_amount),
            "discount_amount": float(inv.discount_amount),
            "net_amount": float(inv.net_amount),
            "paid_amount": float(inv.paid_amount),
            "outstanding_amount": float(inv.outstanding_amount),
            "status": inv.status,
            "issue_date": str(inv.issue_date),
            "due_date": str(inv.due_date) if inv.due_date else None,
            "installments": [
                {
                    "id": installment.id,
                    "installment_number": installment.installment_number,
                    "description": installment.description,
                    "amount": float(installment.amount),
                    "paid_amount": float(installment.paid_amount),
                    "outstanding_amount": float(installment.outstanding_amount),
                    "due_date": str(installment.due_date),
                    "status": installment.status,
                }
                for installment in inv.installments
            ],
        }
        for inv, student in invoices
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
        select(StudentFeeAssignment)
        .where(StudentFeeAssignment.id == data.assignment_id)
        .with_for_update(of=StudentFeeAssignment)
    )
    assignment = assignment_result.scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=404, detail="Fee assignment not found")
    if (
        assignment.student_id != data.student_id
        or assignment.academic_year_id != data.academic_year_id
    ):
        raise HTTPException(
            status_code=400,
            detail="Fee assignment does not match the requested student and academic year.",
        )
    existing_invoice = (
        await db.execute(
            select(FeeInvoice.id)
            .where(
                FeeInvoice.assignment_id == assignment.id,
                FeeInvoice.status != "cancelled",
            )
            .limit(1)
        )
    ).scalar_one_or_none()
    if existing_invoice is not None:
        raise HTTPException(
            status_code=409,
            detail=(
                "This fee assignment already has an issued invoice. Cancel that invoice "
                "through the authorized workflow before issuing a replacement."
            ),
        )

    student = await db.get(Student, assignment.student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Assigned student not found")
    check_institution_access(student.institution_id, current_user)

    structure_result = await db.execute(
        select(FeeStructure).where(FeeStructure.id == assignment.fee_structure_id)
    )
    structure = structure_result.scalar_one_or_none()
    if not structure:
        raise HTTPException(status_code=404, detail="Fee structure not found")
    if (
        structure.academic_year_id != data.academic_year_id
        or structure.institution_id != student.institution_id
    ):
        raise HTTPException(
            status_code=400,
            detail="Fee structure must match the student's institution and academic year.",
        )
    if any(not installment.description.strip() for installment in data.installments):
        raise HTTPException(
            status_code=422,
            detail="Installment descriptions cannot be blank.",
        )
    earliest_due_date = min(installment.due_date for installment in data.installments)
    if data.due_date is not None and data.due_date != earliest_due_date:
        raise HTTPException(
            status_code=422,
            detail="Invoice due_date must equal the earliest scheduled installment due date.",
        )

    invoice = await issue_fee_invoice(
        db,
        student=student,
        assignment=assignment,
        structure=structure,
        issue_date=data.issue_date,
        installments=data.installments,
        notes=data.notes,
        actor=current_user,
    )

    await db.commit()
    await db.refresh(invoice)
    persisted_installments = (
        await db.execute(
            select(FeeInstallment)
            .where(FeeInstallment.invoice_id == invoice.id)
            .order_by(FeeInstallment.installment_number)
        )
    ).scalars().all()
    return {
        "id": invoice.id,
        "invoice_number": invoice.invoice_number,
        "student_id": invoice.student_id,
        "assignment_id": invoice.assignment_id,
        "academic_year_id": invoice.academic_year_id,
        "total_amount": float(invoice.total_amount),
        "discount_amount": float(invoice.discount_amount),
        "net_amount": float(invoice.net_amount),
        "paid_amount": float(invoice.paid_amount),
        "outstanding_amount": float(invoice.outstanding_amount),
        "status": invoice.status,
        "issue_date": str(invoice.issue_date),
        "due_date": str(invoice.due_date),
        "installments": [
            {
                "id": installment.id,
                "installment_number": installment.installment_number,
                "description": installment.description,
                "amount": float(installment.amount),
                "paid_amount": float(installment.paid_amount),
                "outstanding_amount": float(installment.outstanding_amount),
                "due_date": str(installment.due_date),
                "status": installment.status,
            }
            for installment in persisted_installments
        ],
    }


async def _authorize_invoice_access(
    db: AsyncSession,
    invoice: FeeInvoice,
    current_user: User,
    allow_student_self: bool = False,
) -> None:
    """Resolve invoice tenant institution_id via Student and enforce access."""
    student = await db.get(Student, invoice.student_id)
    inst_id = student.institution_id if student else None
    if allow_student_self:
        _authorize_fee_student_record(invoice.student_id, inst_id, current_user)
    else:
        check_institution_access(inst_id, current_user)


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
    await _authorize_invoice_access(db, invoice, current_user, allow_student_self=True)
    student = await db.get(Student, invoice.student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Invoice student not found")
    return {
        "id": invoice.id,
        "invoice_number": invoice.invoice_number,
        "student_id": invoice.student_id,
        "student_name": " ".join(
            part
            for part in (student.first_name, student.middle_name, student.last_name)
            if part
        ),
        "admission_number": student.admission_number,
        "student_phone": student.phone,
        "assignment_id": invoice.assignment_id,
        "academic_year_id": invoice.academic_year_id,
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
                "fee_structure_id": i.fee_structure_id,
                "fee_category_name": i.fee_category_name,
                "structure_name": i.structure_name,
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
                "outstanding_amount": float(inst.outstanding_amount),
                "due_date": str(inst.due_date),
                "status": inst.status,
                "late_fee_applied": float(inst.late_fee_applied),
            }
            for inst in invoice.installments
        ],
    }


@router.delete("/invoices/{invoice_id}")
async def delete_fee_invoice(
    invoice_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("superadmin", "admin", "principal", "sysadmin")),
):
    invoice = await db.get(FeeInvoice, invoice_id)
    if invoice is None:
        raise HTTPException(status_code=404, detail="Fee invoice not found")
    await _authorize_invoice_access(db, invoice, current_user)
    raise HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail=(
            f"Issued invoice '{invoice.invoice_number}' is immutable and cannot be deleted. "
            "Use the authorized invoice cancellation workflow."
        ),
    )


@router.post("/invoices/{invoice_id}/cancel")
async def cancel_fee_invoice(
    invoice_id: int,
    data: CancelInvoiceRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("superadmin", "admin", "principal", "sysadmin")),
):
    """
    POLICY RULE C & D:
    Cancels an issued fee invoice while strictly preserving the original invoice record,
    its serial invoice_number, and complete audit history.
    """
    res = await db.execute(
        select(FeeInvoice)
        .options(selectinload(FeeInvoice.allocations))
        .where(FeeInvoice.id == invoice_id)
    )
    invoice = res.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=404, detail="Fee invoice not found")
    await _authorize_invoice_access(db, invoice, current_user)

    if invoice.status == "cancelled":
        raise HTTPException(status_code=400, detail=f"Invoice '{invoice.invoice_number}' is already cancelled")

    allocation_res = await db.execute(
        select(PaymentAllocation.id)
        .join(Payment, Payment.id == PaymentAllocation.payment_id)
        .where(
            PaymentAllocation.invoice_id == invoice.id,
            Payment.status.in_(["draft", "submitted", "approved", "posted", "completed"]),
        )
        .limit(1)
    )
    if invoice.paid_amount and invoice.paid_amount > Decimal("0") or allocation_res.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail=(
                f"Cannot cancel invoice '{invoice.invoice_number}' while it has a balance-affecting payment "
                "allocation. Reverse the payment and resolve any refund request first."
            ),
        )

    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    old_status = invoice.status
    invoice.status = "cancelled"
    invoice.outstanding_amount = Decimal("0.00")
    invoice.notes = f"{invoice.notes or ''}\n[Cancelled by {current_user.username} on {now_str}: {data.reason}]".strip()

    audit = AuditLog(
        user_id=current_user.id,
        action="cancel_fee_invoice",
        resource_type="fee_invoice",
        resource_id=invoice.id,
        old_data=json.dumps({"status": old_status, "invoice_number": invoice.invoice_number}),
        new_data=json.dumps({"status": "cancelled", "reason": data.reason}),
        details=f"Invoice '{invoice.invoice_number}' cancelled. Reason: {data.reason}",
        severity="warning",
    )
    db.add(audit)
    await db.commit()

    return {
        "success": True,
        "message": f"Invoice '{invoice.invoice_number}' cancelled successfully. Original serial number retained.",
        "invoice_number": invoice.invoice_number,
        "status": "cancelled",
    }



@router.get("/installments")
async def list_installments(
    invoice_id: Optional[int] = None,
    student_id: Optional[int] = None,
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """Return persisted installment schedules; historical unscheduled invoices return no rows."""
    role = (getattr(current_user, "role", "") or "").strip().lower()
    if role == "student":
        own_sid = getattr(current_user, "student_id", None)
        if not own_sid or (student_id is not None and student_id != own_sid):
            raise HTTPException(status_code=403, detail="Students may only view their own installments")
        student_id = own_sid
    elif not is_sysadmin(current_user) and role not in FEE_STAFF_VIEW_ROLES:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    query = (
        select(FeeInstallment)
        .join(FeeInvoice, FeeInstallment.invoice_id == FeeInvoice.id)
        .join(Student, FeeInvoice.student_id == Student.id)
    )
    if not is_sysadmin(current_user) and getattr(current_user, "institution_id", None):
        query = query.where(Student.institution_id == current_user.institution_id)
    if invoice_id:
        query = query.where(FeeInvoice.id == invoice_id)
    if student_id:
        query = query.where(FeeInvoice.student_id == student_id)
    if status:
        query = query.where(FeeInstallment.status == status)
    result = await db.execute(
        query.order_by(FeeInstallment.due_date, FeeInstallment.installment_number)
    )
    items = result.scalars().all()
    return [
        {
            "id": installment.id,
            "invoice_id": installment.invoice_id,
            "installment_number": installment.installment_number,
            "description": installment.description,
            "amount": float(installment.amount),
            "paid_amount": float(installment.paid_amount),
            "outstanding_amount": float(installment.outstanding_amount),
            "due_date": str(installment.due_date),
            "status": installment.status,
        }
        for installment in items
    ]


# ---------- Unified Fees & Payments: Overview & Register ----------
@router.get("/overview")
async def get_fees_overview(
    academic_year_id: Optional[int] = None,
    board_id: Optional[int] = None,
    standard_id: Optional[int] = None,
    division_id: Optional[int] = None,
    institution_id: Optional[int] = None,
    data_env: str = Depends(get_data_environment),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role(*FEE_STAFF_VIEW_ROLES)),
):
    """
    Consolidated fees overview metrics with cascading filters:
    - Summary figures (obligation, collected, outstanding, rate, student count)
    - Board & Batch breakdowns (using deduplicated latest enrollment)
    - Monthly collection trend & governed concession/waiver/scholarship breakdowns
    - Recent payments
    """
    if institution_id is not None:
        check_institution_access(institution_id, current_user)
    is_demo_filter = True if data_env == "TRAINING" else (False if data_env == "PRODUCTION" else None)
    if is_sysadmin(current_user):
        effective_inst_id = institution_id
        if institution_id:
            inst_has_students = (await db.execute(select(func.count(Student.id)).where(Student.institution_id == institution_id))).scalar() or 0
            if inst_has_students == 0:
                effective_inst_id = None
    else:
        effective_inst_id = institution_id or getattr(current_user, "institution_id", None)

    latest_enr = _latest_enrollment_sq()

    # Base invoice query with student receivables breakdown
    inv_query = (
        select(
            func.coalesce(func.sum(FeeInvoice.total_amount), 0).label("gross_obligation"),
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
            latest_enr,
            (FeeInvoice.student_id == latest_enr.c.student_id)
            & (FeeInvoice.academic_year_id == latest_enr.c.academic_year_id),
        )
        .outerjoin(Division, latest_enr.c.division_id == Division.id)
        .where(FeeInvoice.status != "cancelled")
    )

    if is_demo_filter is not None:
        inv_query = inv_query.where(Student.is_demo.is_(is_demo_filter))
    if academic_year_id:
        inv_query = inv_query.where(FeeInvoice.academic_year_id == academic_year_id)
    if effective_inst_id:
        inv_query = inv_query.where(Student.institution_id == effective_inst_id)
    if board_id:
        inv_query = inv_query.where(Division.board_id == board_id)
    if standard_id:
        inv_query = inv_query.where(latest_enr.c.standard_id == standard_id)
    if division_id:
        inv_query = inv_query.where(latest_enr.c.division_id == division_id)

    stats = (await db.execute(inv_query)).one()
    gross_obligation = float(stats.gross_obligation)
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
            latest_enr,
            (FeeInvoice.student_id == latest_enr.c.student_id)
            & (FeeInvoice.academic_year_id == latest_enr.c.academic_year_id),
        )
        .outerjoin(Division, latest_enr.c.division_id == Division.id)
        .outerjoin(Board, Division.board_id == Board.id)
        .where(FeeInvoice.status != "cancelled")
    )
    if is_demo_filter is not None:
        board_query = board_query.where(Student.is_demo.is_(is_demo_filter))
    if academic_year_id:
        board_query = board_query.where(FeeInvoice.academic_year_id == academic_year_id)
    if effective_inst_id:
        board_query = board_query.where(Student.institution_id == effective_inst_id)
    if board_id:
        board_query = board_query.where(Division.board_id == board_id)
    if standard_id:
        board_query = board_query.where(latest_enr.c.standard_id == standard_id)
    if division_id:
        board_query = board_query.where(latest_enr.c.division_id == division_id)

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
            latest_enr,
            (FeeInvoice.student_id == latest_enr.c.student_id)
            & (FeeInvoice.academic_year_id == latest_enr.c.academic_year_id),
        )
        .outerjoin(Division, latest_enr.c.division_id == Division.id)
        .outerjoin(Standard, latest_enr.c.standard_id == Standard.id)
        .outerjoin(Board, Division.board_id == Board.id)
        .where(FeeInvoice.status != "cancelled")
    )
    if is_demo_filter is not None:
        batch_query = batch_query.where(Student.is_demo.is_(is_demo_filter))
    if academic_year_id:
        batch_query = batch_query.where(FeeInvoice.academic_year_id == academic_year_id)
    if effective_inst_id:
        batch_query = batch_query.where(Student.institution_id == effective_inst_id)
    if board_id:
        batch_query = batch_query.where(Division.board_id == board_id)
    if standard_id:
        batch_query = batch_query.where(latest_enr.c.standard_id == standard_id)
    if division_id:
        batch_query = batch_query.where(latest_enr.c.division_id == division_id)

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
            latest_enr,
            (Payment.student_id == latest_enr.c.student_id)
            & (Payment.academic_year_id == latest_enr.c.academic_year_id),
        )
        .outerjoin(Division, latest_enr.c.division_id == Division.id)
        .where(Payment.status.in_(["posted", "completed"]))
    )
    if is_demo_filter is not None:
        trend_query = trend_query.where(Student.is_demo.is_(is_demo_filter))
    if academic_year_id:
        trend_query = trend_query.where(Payment.academic_year_id == academic_year_id)
    if effective_inst_id:
        trend_query = trend_query.where(Student.institution_id == effective_inst_id)
    if board_id:
        trend_query = trend_query.where(Division.board_id == board_id)
    if standard_id:
        trend_query = trend_query.where(latest_enr.c.standard_id == standard_id)
    if division_id:
        trend_query = trend_query.where(latest_enr.c.division_id == division_id)

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
            latest_enr,
            (Payment.student_id == latest_enr.c.student_id)
            & (Payment.academic_year_id == latest_enr.c.academic_year_id),
        )
        .outerjoin(Division, latest_enr.c.division_id == Division.id)
        .where(Payment.status.in_(["posted", "completed"]))
    )
    if is_demo_filter is not None:
        method_query = method_query.where(Student.is_demo.is_(is_demo_filter))
    if academic_year_id:
        method_query = method_query.where(Payment.academic_year_id == academic_year_id)
    if effective_inst_id:
        method_query = method_query.where(Student.institution_id == effective_inst_id)
    if board_id:
        method_query = method_query.where(Division.board_id == board_id)
    if standard_id:
        method_query = method_query.where(latest_enr.c.standard_id == standard_id)
    if division_id:
        method_query = method_query.where(latest_enr.c.division_id == division_id)

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
            latest_enr,
            (FeeInvoice.student_id == latest_enr.c.student_id)
            & (FeeInvoice.academic_year_id == latest_enr.c.academic_year_id),
        )
        .outerjoin(Division, latest_enr.c.division_id == Division.id)
        .outerjoin(Standard, latest_enr.c.standard_id == Standard.id)
        .outerjoin(Board, Division.board_id == Board.id)
        .where(FeeInvoice.status != "cancelled")
        .where(FeeInvoice.outstanding_amount > 0)
    )
    if is_demo_filter is not None:
        overdue_query = overdue_query.where(Student.is_demo.is_(is_demo_filter))
    if academic_year_id:
        overdue_query = overdue_query.where(FeeInvoice.academic_year_id == academic_year_id)
    if effective_inst_id:
        overdue_query = overdue_query.where(Student.institution_id == effective_inst_id)
    if board_id:
        overdue_query = overdue_query.where(Division.board_id == board_id)
    if standard_id:
        overdue_query = overdue_query.where(latest_enr.c.standard_id == standard_id)
    if division_id:
        overdue_query = overdue_query.where(latest_enr.c.division_id == division_id)

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
            latest_enr,
            (Payment.student_id == latest_enr.c.student_id)
            & (Payment.academic_year_id == latest_enr.c.academic_year_id),
        )
        .outerjoin(Division, latest_enr.c.division_id == Division.id)
        .outerjoin(Standard, latest_enr.c.standard_id == Standard.id)
        .outerjoin(Board, Division.board_id == Board.id)
        .where(Payment.status.in_(["posted", "completed"]))
    )
    if is_demo_filter is not None:
        rec_query = rec_query.where(Student.is_demo.is_(is_demo_filter))
    if academic_year_id:
        rec_query = rec_query.where(Payment.academic_year_id == academic_year_id)
    if effective_inst_id:
        rec_query = rec_query.where(Student.institution_id == effective_inst_id)
    if board_id:
        rec_query = rec_query.where(Division.board_id == board_id)
    if standard_id:
        rec_query = rec_query.where(latest_enr.c.standard_id == standard_id)
    if division_id:
        rec_query = rec_query.where(latest_enr.c.division_id == division_id)

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
    gov_flt = FinancialFilter(
        institution_id=user_inst_id,
        academic_year_id=academic_year_id,
        standard_id=standard_id,
        division_id=division_id,
        board_id=board_id,
        is_demo=is_demo_filter,
    )
    gov_summary = await FinancialGovernanceService.get_governed_summary(db, gov_flt)
    concession_breakdown = await FinancialGovernanceService.get_fee_management_concession_breakdown(db, gov_flt)
    academic_concessions = await FinancialGovernanceService.get_academic_concession_distribution(db, gov_flt)

    summary_dict = {
        "gross_obligation": gross_obligation,
        "total_obligation": total_obligation,
        "total_collected": total_collected,
        "total_outstanding": total_outstanding,
        "active_students_outstanding": active_students_outstanding,
        "former_students_outstanding": former_students_outstanding,
        "inactive_students_outstanding": inactive_students_outstanding,
        "total_recoverable_outstanding": total_recoverable_outstanding,
        "overdue_outstanding": overdue_outstanding,
        "waived_amount": waived_amount,
        "approved_concessions": gov_summary["financials"]["approved_concessions_total"],
        "posted_concessions": gov_summary["financials"]["posted_concessions_total"],
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
            "gross_obligation",
            "total_obligation",
            "total_collected",
            "total_outstanding",
            "active_students_outstanding",
            "former_students_outstanding",
            "inactive_students_outstanding",
            "total_recoverable_outstanding",
            "overdue_outstanding",
            "waived_amount",
            "approved_concessions",
            "posted_concessions",
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
        "governance": gov_summary,
        "concession_breakdown": concession_breakdown,
        "academic_concessions": academic_concessions,
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
    data_env: str = Depends(get_data_environment),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role(*FEE_STAFF_VIEW_ROLES)),
):
    """
    Consolidated student fee register records with cascading filters:
    Student obligations, payment totals, balance, installment schedule, and recent payment date.
    Uses deduplicated latest_enr to avoid duplicate rows on transferred enrollments.
    """
    is_demo_filter = True if data_env == "TRAINING" else (False if data_env == "PRODUCTION" else None)
    latest_enr = _latest_enrollment_sq()
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
        .options(
            selectinload(FeeInvoice.items),
            selectinload(FeeInvoice.installments),
        )
        .join(Student, FeeInvoice.student_id == Student.id)
        .join(AcademicYear, FeeInvoice.academic_year_id == AcademicYear.id)
        .outerjoin(
            latest_enr,
            (FeeInvoice.student_id == latest_enr.c.student_id)
            & (FeeInvoice.academic_year_id == latest_enr.c.academic_year_id),
        )
        .outerjoin(Standard, latest_enr.c.standard_id == Standard.id)
        .outerjoin(Division, latest_enr.c.division_id == Division.id)
        .outerjoin(Board, Division.board_id == Board.id)
        .outerjoin(
            Payment,
            (FeeInvoice.student_id == Payment.student_id)
            & (FeeInvoice.academic_year_id == Payment.academic_year_id)
            & (Payment.status.in_(["posted", "completed"])),
        )
        .where(FeeInvoice.status != "cancelled")
    )

    if not is_sysadmin(current_user) and getattr(current_user, "institution_id", None):
        query = query.where(Student.institution_id == current_user.institution_id)
    if is_demo_filter is not None:
        query = query.where(Student.is_demo.is_(is_demo_filter))
    if academic_year_id:
        query = query.where(FeeInvoice.academic_year_id == academic_year_id)
    if board_id:
        query = query.where(Division.board_id == board_id)
    if standard_id:
        query = query.where(latest_enr.c.standard_id == standard_id)
    if division_id:
        query = query.where(latest_enr.c.division_id == division_id)
    if status:
        query = query.where(FeeInvoice.status == status)
    if student_status:
        st_lower = student_status.strip().lower()
        if st_lower == "active":
            query = query.where(Student.is_active.is_(True))
        elif st_lower in ("former", "discontinued", "withdrawn"):
            query = query.where(Student.is_active.is_(False))
        elif st_lower == "transferred":
            query = query.where(latest_enr.c.status == "transferred")
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


@router.get("/batch-monthly-matrix")
async def get_batch_monthly_matrix(
    academic_year_id: Optional[int] = None,
    division_id: Optional[int] = None,
    standard_id: Optional[int] = None,
    board_id: Optional[int] = None,
    data_env: str = Depends(get_data_environment),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role(*FEE_STAFF_VIEW_ROLES)),
):
    """
    2D Batch Monthly Fee Collection Matrix (Executive Spreadsheet View).
    Cross-tabulates enrolled batch students (Columns) across 12 Academic Months (Rows),
    providing single-screen visibility into realized receipts, dates, package obligation, and overdue gaps.
    """
    from datetime import datetime
    is_demo_filter = True if data_env == "TRAINING" else (False if data_env == "PRODUCTION" else None)

    # 1. Fetch all active divisions/batches that have enrolled students
    div_query = (
        select(
            Division.id,
            Division.name.label("division_name"),
            Division.standard_id,
            Standard.name.label("standard_name"),
            Board.name.label("board_name"),
            func.count(StudentEnrollment.id).label("student_count"),
        )
        .join(Standard, Division.standard_id == Standard.id)
        .outerjoin(Board, Division.board_id == Board.id)
        .join(StudentEnrollment, StudentEnrollment.division_id == Division.id)
        .join(Student, StudentEnrollment.student_id == Student.id)
    )
    if not is_sysadmin(current_user) and getattr(current_user, "institution_id", None):
        div_query = div_query.where(Student.institution_id == current_user.institution_id)
    if is_demo_filter is not None:
        div_query = div_query.where(Student.is_demo.is_(is_demo_filter))
    if academic_year_id:
        div_query = div_query.where(StudentEnrollment.academic_year_id == academic_year_id)
    if board_id:
        div_query = div_query.where(Division.board_id == board_id)
    if standard_id:
        div_query = div_query.where(Division.standard_id == standard_id)

    div_query = div_query.group_by(
        Division.id,
        Division.name,
        Division.standard_id,
        Standard.name,
        Board.name,
    ).having(func.count(StudentEnrollment.id) > 0).order_by(Division.id.asc())

    div_rows = (await db.execute(div_query)).all()
    available_batches = []
    for d_id, d_name, std_id, std_name, brd_name, st_cnt in div_rows:
        available_batches.append({
            "id": d_id,
            "name": d_name,
            "tab_label": d_name,
            "standard_id": std_id,
            "standard_name": std_name,
            "board_name": brd_name or "General",
            "student_count": st_cnt,
        })

    # Pick active batch: prefer passed division_id, else division 25 ('ICSE X') if available, else first batch
    active_batch_id = division_id
    if not active_batch_id:
        icse_x = next((b for b in available_batches if b["id"] == 25 or "ICSE X" in b["name"]), None)
        if icse_x:
            active_batch_id = icse_x["id"]
        elif available_batches:
            active_batch_id = available_batches[0]["id"]
        else:
            active_batch_id = None

    active_batch_info = next((b for b in available_batches if b["id"] == active_batch_id), None)

    if not active_batch_id:
        return {
            "available_batches": [],
            "active_batch": None,
            "months": [],
            "students": [],
            "summary": {
                "total_students": 0,
                "total_package_value": 0.0,
                "total_collected": 0.0,
                "total_outstanding": 0.0,
                "recovery_rate": 0.0,
            },
        }

    # 2. Fetch distinct enrolled students in active division
    stud_query = (
        select(
            Student,
            FeeInvoice,
            Division,
            Standard,
            Board,
        )
        .join(StudentEnrollment, StudentEnrollment.student_id == Student.id)
        .outerjoin(
            FeeInvoice,
            (FeeInvoice.student_id == Student.id)
            & (FeeInvoice.status != "cancelled")
            & ((FeeInvoice.academic_year_id == academic_year_id) if academic_year_id else True),
        )
        .join(Division, StudentEnrollment.division_id == Division.id)
        .join(Standard, Division.standard_id == Standard.id)
        .outerjoin(Board, Division.board_id == Board.id)
        .where(StudentEnrollment.division_id == active_batch_id)
    )
    if not is_sysadmin(current_user) and getattr(current_user, "institution_id", None):
        stud_query = stud_query.where(Student.institution_id == current_user.institution_id)
    if is_demo_filter is not None:
        stud_query = stud_query.where(Student.is_demo.is_(is_demo_filter))
    if academic_year_id:
        stud_query = stud_query.where(StudentEnrollment.academic_year_id == academic_year_id)

    stud_query = stud_query.order_by(Student.id.asc())
    stud_rows = (await db.execute(stud_query)).all()

    # Deduplicate students by id
    seen_student_ids = set()
    students_data = []
    student_id_list = []
    for st, inv, div, std, brd in stud_rows:
        if st.id in seen_student_ids:
            continue
        seen_student_ids.add(st.id)
        student_id_list.append(st.id)
        students_data.append((st, inv, div, std, brd))

    # 3. Query all payments for these students
    payments_by_student = {sid: [] for sid in student_id_list}
    if student_id_list:
        pay_query = (
            select(
                Payment,
                PaymentReceipt.receipt_number,
            )
            .outerjoin(
                PaymentReceipt,
                (PaymentReceipt.payment_id == Payment.id) & (PaymentReceipt.status == "valid"),
            )
            .where(
                Payment.student_id.in_(student_id_list),
                Payment.status.in_(["posted", "completed"]),
            )
            .order_by(Payment.payment_date.asc(), Payment.id.asc())
        )
        if academic_year_id:
            pay_query = pay_query.where(Payment.academic_year_id == academic_year_id)
        pay_rows = (await db.execute(pay_query)).all()
        for p, r_num in pay_rows:
            payments_by_student[p.student_id].append({
                "id": p.id,
                "amount": float(p.amount),
                "payment_date": str(p.payment_date),
                "payment_method": p.payment_method,
                "receipt_number": r_num or f"RCP-{p.id:04d}",
                "notes": p.notes or "",
            })

    # 4. Define the 12 standard Academic Months (April 2026 to March 2027)
    months = [
        {"key": "2026-04", "month_name": "April", "year": 2026, "academic_order": 1},
        {"key": "2026-05", "month_name": "May", "year": 2026, "academic_order": 2},
        {"key": "2026-06", "month_name": "June", "year": 2026, "academic_order": 3},
        {"key": "2026-07", "month_name": "July", "year": 2026, "academic_order": 4},
        {"key": "2026-08", "month_name": "August", "year": 2026, "academic_order": 5},
        {"key": "2026-09", "month_name": "September", "year": 2026, "academic_order": 6},
        {"key": "2026-10", "month_name": "October", "year": 2026, "academic_order": 7},
        {"key": "2026-11", "month_name": "November", "year": 2026, "academic_order": 8},
        {"key": "2026-12", "month_name": "December", "year": 2026, "academic_order": 9},
        {"key": "2027-01", "month_name": "January", "year": 2027, "academic_order": 10},
        {"key": "2027-02", "month_name": "February", "year": 2027, "academic_order": 11},
        {"key": "2027-03", "month_name": "March", "year": 2027, "academic_order": 12},
    ]

    def format_date_label(dt_str: str) -> str:
        try:
            d = datetime.strptime(dt_str, "%Y-%m-%d")
            return f"{d.day} {d.strftime('%b')} {d.year}"
        except Exception:
            return dt_str

    students_result = []
    total_batch_pkg = 0.0
    total_batch_collected = 0.0
    total_batch_outstanding = 0.0

    current_month_key = datetime.now().strftime("%Y-%m")
    if current_month_key < "2026-04":
        current_month_key = "2026-11"

    for st, inv, div, std, brd in students_data:
        pkg_fee = float(inv.net_amount) if inv else 0.0
        tot_paid = float(inv.paid_amount) if inv else sum(p["amount"] for p in payments_by_student.get(st.id, []))
        tot_out = float(inv.outstanding_amount) if inv else max(0.0, pkg_fee - tot_paid)

        total_batch_pkg += pkg_fee
        total_batch_collected += tot_paid
        total_batch_outstanding += tot_out

        st_payments = payments_by_student.get(st.id, [])

        monthly_map = {}
        for m in months:
            monthly_map[m["key"]] = []

        for p in st_payments:
            p_date = p["payment_date"]
            p_ym = p_date[:7]
            if p_ym <= "2026-03":
                p_ym = "2026-04"
            if p_ym in monthly_map:
                monthly_map[p_ym].append(p)

        monthly_cells = {}
        for m in months:
            m_key = m["key"]
            cell_pays = monthly_map[m_key]
            if cell_pays:
                cell_sum = sum(cp["amount"] for cp in cell_pays)
                dates = [format_date_label(cp["payment_date"]) for cp in cell_pays]
                amts = [f"₹{int(cp['amount']):,}" for cp in cell_pays]
                monthly_cells[m_key] = {
                    "status": "paid",
                    "has_payment": True,
                    "payments": cell_pays,
                    "total_amount": cell_sum,
                    "date_text": " / ".join(dates),
                    "amount_text": " / ".join(amts),
                }
            else:
                is_past_or_current = m_key <= current_month_key
                monthly_cells[m_key] = {
                    "status": "overdue" if is_past_or_current else "upcoming",
                    "has_payment": False,
                    "payments": [],
                    "total_amount": 0.0,
                    "date_text": "—",
                    "amount_text": "Pending" if is_past_or_current else "Upcoming",
                }

        recovery_pct = round((tot_paid / pkg_fee * 100.0), 1) if pkg_fee > 0 else 0.0
        students_result.append({
            "student_id": st.id,
            "admission_number": st.admission_number,
            "roll_number": getattr(st, "roll_number", None) or getattr(st, "admission_number", "—"),
            "first_name": st.first_name,
            "last_name": st.last_name,
            "short_name": st.first_name,
            "full_name": f"{st.first_name} {st.last_name}",
            "invoice_id": inv.id if inv else None,
            "invoice_number": inv.invoice_number if inv else "UNINVOICED",
            "package_fee": pkg_fee,
            "package_fee_k": int(round(pkg_fee / 1000.0)),
            "total_paid": tot_paid,
            "total_outstanding": tot_out,
            "recovery_pct": recovery_pct,
            "monthly_cells": monthly_cells,
        })

    overall_recovery = round((total_batch_collected / total_batch_pkg * 100.0), 1) if total_batch_pkg > 0 else 0.0

    user_inst_id = getattr(current_user, "institution_id", None) or 1
    students_result = await CodeXService.mask_records_list(
        db=db,
        institution_id=user_inst_id,
        user=current_user,
        records=students_result,
        numeric_fields=["package_fee", "total_paid", "total_outstanding"],
        module="fees",
    )

    return {
        "available_batches": available_batches,
        "active_batch": active_batch_info,
        "academic_year": {"id": academic_year_id or 1, "name": "AY 2026-27"},
        "months": months,
        "students": students_result,
        "summary": {
            "total_students": len(students_result),
            "total_package_value": total_batch_pkg,
            "total_collected": total_batch_collected,
            "total_outstanding": total_batch_outstanding,
            "recovery_rate": overall_recovery,
        },
    }


@router.get("/month-collection-matrix")
async def get_month_collection_matrix(
    academic_year_id: Optional[int] = None,
    month_key: Optional[str] = "2026-08",
    division_id: Optional[int] = None,
    standard_id: Optional[int] = None,
    board_id: Optional[int] = None,
    data_env: str = Depends(get_data_environment),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role(*FEE_STAFF_VIEW_ROLES)),
):
    """
    Month-Centric Collection Matrix (Cross-Batch Daybook & Defaulter Ledger).
    Organized by Month: Select any month (e.g. August 2026) to see institute-wide realization,
    batch-wise cross-tabulation performance, and individual student collection roster.
    """
    from datetime import datetime
    is_demo_filter = True if data_env == "TRAINING" else (False if data_env == "PRODUCTION" else None)

    # 1. Standard 12 Academic Months
    months_def = [
        {"key": "2026-04", "month_name": "April", "year": 2026, "academic_order": 1},
        {"key": "2026-05", "month_name": "May", "year": 2026, "academic_order": 2},
        {"key": "2026-06", "month_name": "June", "year": 2026, "academic_order": 3},
        {"key": "2026-07", "month_name": "July", "year": 2026, "academic_order": 4},
        {"key": "2026-08", "month_name": "August", "year": 2026, "academic_order": 5},
        {"key": "2026-09", "month_name": "September", "year": 2026, "academic_order": 6},
        {"key": "2026-10", "month_name": "October", "year": 2026, "academic_order": 7},
        {"key": "2026-11", "month_name": "November", "year": 2026, "academic_order": 8},
        {"key": "2026-12", "month_name": "December", "year": 2026, "academic_order": 9},
        {"key": "2027-01", "month_name": "January", "year": 2027, "academic_order": 10},
        {"key": "2027-02", "month_name": "February", "year": 2027, "academic_order": 11},
        {"key": "2027-03", "month_name": "March", "year": 2027, "academic_order": 12},
    ]

    selected_month = next((m for m in months_def if m["key"] == month_key), months_def[4])
    curr_month_key = datetime.now().strftime("%Y-%m")
    if curr_month_key < "2026-04":
        curr_month_key = "2026-11"

    # Query all active divisions/batches
    div_query = (
        select(
            Division.id,
            Division.name.label("division_name"),
            Division.standard_id,
            Standard.name.label("standard_name"),
            Board.name.label("board_name"),
            func.count(StudentEnrollment.id).label("student_count"),
        )
        .join(Standard, Division.standard_id == Standard.id)
        .outerjoin(Board, Division.board_id == Board.id)
        .join(StudentEnrollment, StudentEnrollment.division_id == Division.id)
        .join(Student, StudentEnrollment.student_id == Student.id)
    )
    if not is_sysadmin(current_user) and getattr(current_user, "institution_id", None):
        div_query = div_query.where(Student.institution_id == current_user.institution_id)
    if is_demo_filter is not None:
        div_query = div_query.where(Student.is_demo.is_(is_demo_filter))
    if academic_year_id:
        div_query = div_query.where(StudentEnrollment.academic_year_id == academic_year_id)
    if board_id:
        div_query = div_query.where(Division.board_id == board_id)
    if standard_id:
        div_query = div_query.where(Division.standard_id == standard_id)
    if division_id:
        div_query = div_query.where(Division.id == division_id)

    div_query = div_query.group_by(
        Division.id,
        Division.name,
        Division.standard_id,
        Standard.name,
        Board.name,
    ).having(func.count(StudentEnrollment.id) > 0).order_by(Division.id.asc())

    div_rows = (await db.execute(div_query)).all()

    # Query all enrolled students and their fee packages across all batches
    stud_query = (
        select(
            Student,
            FeeInvoice,
            Division,
            Standard,
            Board,
        )
        .join(StudentEnrollment, StudentEnrollment.student_id == Student.id)
        .outerjoin(
            FeeInvoice,
            (FeeInvoice.student_id == Student.id)
            & (FeeInvoice.status != "cancelled")
            & ((FeeInvoice.academic_year_id == academic_year_id) if academic_year_id else True),
        )
        .join(Division, StudentEnrollment.division_id == Division.id)
        .join(Standard, Division.standard_id == Standard.id)
        .outerjoin(Board, Division.board_id == Board.id)
    )
    if not is_sysadmin(current_user) and getattr(current_user, "institution_id", None):
        stud_query = stud_query.where(Student.institution_id == current_user.institution_id)
    if is_demo_filter is not None:
        stud_query = stud_query.where(Student.is_demo.is_(is_demo_filter))
    if academic_year_id:
        stud_query = stud_query.where(StudentEnrollment.academic_year_id == academic_year_id)
    if board_id:
        stud_query = stud_query.where(Division.board_id == board_id)
    if standard_id:
        stud_query = stud_query.where(Division.standard_id == standard_id)
    if division_id:
        stud_query = stud_query.where(StudentEnrollment.division_id == division_id)

    stud_query = stud_query.order_by(Division.id.asc(), Student.id.asc())
    all_stud_rows = (await db.execute(stud_query)).all()

    # Deduplicate students
    seen_ids = set()
    all_students = []
    student_ids = []
    for st, inv, div, std, brd in all_stud_rows:
        if st.id in seen_ids:
            continue
        seen_ids.add(st.id)
        student_ids.append(st.id)
        all_students.append((st, inv, div, std, brd))

    # Query all payments
    payments_by_student_month = {}  # (student_id, month_key) -> list of payments
    month_totals = {m["key"]: {"total_collected": 0.0, "total_target": 0.0} for m in months_def}

    if student_ids:
        pay_query = (
            select(
                Payment,
                PaymentReceipt.receipt_number,
            )
            .outerjoin(
                PaymentReceipt,
                (PaymentReceipt.payment_id == Payment.id) & (PaymentReceipt.status == "valid"),
            )
            .where(
                Payment.student_id.in_(student_ids),
                Payment.status.in_(["posted", "completed"]),
            )
            .order_by(Payment.payment_date.asc())
        )
        if academic_year_id:
            pay_query = pay_query.where(Payment.academic_year_id == academic_year_id)
        pay_rows = (await db.execute(pay_query)).all()

        for p, r_num in pay_rows:
            p_date_str = str(p.payment_date)
            p_ym = p_date_str[:7]
            if p_ym <= "2026-03":
                p_ym = "2026-04"
            key = (p.student_id, p_ym)
            if key not in payments_by_student_month:
                payments_by_student_month[key] = []
            payments_by_student_month[key].append({
                "id": p.id,
                "amount": float(p.amount),
                "payment_date": p_date_str,
                "payment_method": p.payment_method,
                "receipt_number": r_num or f"RCP-{p.id:04d}",
            })
            if p_ym in month_totals:
                month_totals[p_ym]["total_collected"] += float(p.amount)

    # Compute targets for each month across enrolled students
    total_inst_target_per_month = 0.0
    for st, inv, div, std, brd in all_students:
        pkg_fee = float(inv.net_amount) if inv else 0.0
        m_due = round(pkg_fee / 12.0, 2)
        total_inst_target_per_month += m_due

    for m in months_def:
        m["total_target"] = round(total_inst_target_per_month, 2)
        m["total_collected"] = round(month_totals[m["key"]]["total_collected"], 2)
        target = m["total_target"]
        col = m["total_collected"]
        rate = round((col / target * 100.0), 1) if target > 0 else 0.0
        m["recovery_rate"] = rate
        if m["key"] > curr_month_key:
            m["status_color"] = "slate"
        elif rate >= 85:
            m["status_color"] = "emerald"
        elif rate >= 50:
            m["status_color"] = "amber"
        else:
            m["status_color"] = "rose"

    # Batch Performance Summaries for Selected Month
    batch_map = {}
    for d_id, d_name, std_id, std_name, brd_name, st_cnt in div_rows:
        batch_map[d_id] = {
            "batch_id": d_id,
            "batch_name": d_name,
            "standard_name": std_name,
            "board_name": brd_name or "General",
            "enrolled_count": st_cnt,
            "target_amount": 0.0,
            "collected_amount": 0.0,
            "pending_amount": 0.0,
            "defaulters_count": 0,
            "students_count": 0,
            "recovery_pct": 0.0,
        }

    # Student Roster for Selected Month
    students_roster = []
    month_target_total = 0.0
    month_collected_total = 0.0
    defaulters_count_total = 0
    mode_split = {"upi": 0.0, "cash": 0.0, "bank": 0.0, "other": 0.0}

    for st, inv, div, std, brd in all_students:
        pkg_fee = float(inv.net_amount) if inv else 0.0
        month_due = round(pkg_fee / 12.0, 2)
        month_target_total += month_due

        pays = payments_by_student_month.get((st.id, selected_month["key"]), [])
        paid_amount = sum(p["amount"] for p in pays)
        month_collected_total += paid_amount

        for p in pays:
            m_meth = (p["payment_method"] or "").upper()
            if "UPI" in m_meth or "QR" in m_meth:
                mode_split["upi"] += p["amount"]
            elif "CASH" in m_meth:
                mode_split["cash"] += p["amount"]
            elif "BANK" in m_meth or "NEFT" in m_meth or "RTGS" in m_meth or "CHEQUE" in m_meth:
                mode_split["bank"] += p["amount"]
            else:
                mode_split["other"] += p["amount"]

        bal_due = max(0.0, round(month_due - paid_amount, 2))
        is_past_or_current = selected_month["key"] <= curr_month_key

        if paid_amount >= month_due and month_due > 0:
            status = "paid"
        elif paid_amount > 0:
            status = "partial"
        elif is_past_or_current:
            status = "overdue"
            defaulters_count_total += 1
        else:
            status = "upcoming"

        p_date = pays[0]["payment_date"] if pays else None
        p_receipt = pays[0]["receipt_number"] if pays else None
        p_method = pays[0]["payment_method"] if pays else None

        # Add to batch summary
        if div.id in batch_map:
            batch_map[div.id]["target_amount"] += month_due
            batch_map[div.id]["collected_amount"] += paid_amount
            batch_map[div.id]["students_count"] += 1
            if status == "overdue":
                batch_map[div.id]["defaulters_count"] += 1

        students_roster.append({
            "student_id": st.id,
            "admission_number": st.admission_number,
            "student_name": f"{st.first_name} {st.last_name}",
            "batch_id": div.id,
            "batch_name": div.name,
            "standard_name": std.name,
            "package_fee": pkg_fee,
            "month_due": month_due,
            "paid_amount": paid_amount,
            "payment_date": p_date,
            "receipt_number": p_receipt,
            "payment_method": p_method,
            "balance_due": bal_due,
            "status": status,
        })

    # Finalize batch recovery rates
    batch_summaries = []
    for b_id, b_data in batch_map.items():
        b_tgt = b_data["target_amount"]
        b_col = b_data["collected_amount"]
        b_data["pending_amount"] = max(0.0, round(b_tgt - b_col, 2))
        b_data["recovery_pct"] = round((b_col / b_tgt * 100.0), 1) if b_tgt > 0 else 0.0
        batch_summaries.append(b_data)

    # Enrich months_def with total_target, total_collected, recovery_rate, status_color
    enriched_months = []
    for m in months_def:
        m_k = m["key"]
        m_tgt = 0.0
        m_col = 0.0
        for st, inv, _, _, _ in all_students:
            pkg = float(inv.net_amount) if inv else 0.0
            m_tgt += round(pkg / 12.0, 2)
            pays = payments_by_student_month.get((st.id, m_k), [])
            m_col += sum(p["amount"] for p in pays)

        m_rate = round((m_col / m_tgt * 100.0), 1) if m_tgt > 0 else 0.0
        if m_rate >= 80.0:
            color = "emerald"
        elif m_rate >= 40.0:
            color = "amber"
        elif m_k <= curr_month_key:
            color = "rose"
        else:
            color = "slate"

        enriched_months.append({
            **m,
            "total_target": round(m_tgt, 2),
            "total_collected": round(m_col, 2),
            "recovery_rate": m_rate,
            "status_color": color,
        })

    month_pending_total = max(0.0, round(month_target_total - month_collected_total, 2))
    overall_rate = (
        round((month_collected_total / month_target_total * 100.0), 1)
        if month_target_total > 0
        else 0.0
    )

    return {
        "months": enriched_months,
        "active_month": {
            "key": selected_month["key"],
            "month_name": f"{selected_month['month_name']} {selected_month['year']}",
            "year": selected_month["year"],
        },
        "kpis": {
            "month_target": round(month_target_total, 2),
            "month_collected": round(month_collected_total, 2),
            "month_pending": month_pending_total,
            "realization_rate": overall_rate,
            "defaulters_count": defaulters_count_total,
            "mode_split": {
                "upi": round(mode_split["upi"], 2),
                "cash": round(mode_split["cash"], 2),
                "bank": round(mode_split["bank"], 2),
                "other": round(mode_split["other"], 2),
            },
        },
        "batch_summaries": batch_summaries,
        "students": students_roster,
        "total_students": len(students_roster),
    }


@router.get("/dimension-analytics")
async def get_dimension_analytics(
    academic_year_id: Optional[int] = None,
    board_id: Optional[int] = None,
    standard_id: Optional[int] = None,
    division_id: Optional[int] = None,
    data_env: str = Depends(get_data_environment),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role(*FEE_STAFF_VIEW_ROLES)),
):
    """
    Multi-Dimensional Fee Collection & Realization Matrix:
    - Annual / Academic Year-wise Performance & Multi-Year Trends
    - Educational Board-wise Cross-Tabulation (ICSE, CBSE, SSC, State Board, etc.)
    - Standard / Grade-wise Performance & Realization Ledger
    """
    is_demo_filter = True if data_env == "TRAINING" else (False if data_env == "PRODUCTION" else None)

    # 1. Fetch all Academic Years for Multi-Year Annual Comparison
    ay_query = select(AcademicYear).order_by(AcademicYear.id.desc())
    if not is_sysadmin(current_user) and getattr(current_user, "institution_id", None):
        ay_query = ay_query.where(AcademicYear.institution_id == current_user.institution_id)
    all_ays = (await db.execute(ay_query)).scalars().all()

    # Query all enrollments & invoices across all AYs for multi-year comparison
    all_ay_query = (
        select(
            StudentEnrollment.student_id,
            StudentEnrollment.academic_year_id,
            func.coalesce(func.sum(FeeInvoice.net_amount), 0).label("pkg_fee"),
        )
        .join(Student, StudentEnrollment.student_id == Student.id)
        .outerjoin(
            FeeInvoice,
            (FeeInvoice.student_id == Student.id)
            & (FeeInvoice.status != "cancelled")
            & (FeeInvoice.academic_year_id == StudentEnrollment.academic_year_id),
        )
    )
    if not is_sysadmin(current_user) and getattr(current_user, "institution_id", None):
        all_ay_query = all_ay_query.where(Student.institution_id == current_user.institution_id)
    if is_demo_filter is not None:
        all_ay_query = all_ay_query.where(Student.is_demo.is_(is_demo_filter))
    all_ay_query = all_ay_query.group_by(StudentEnrollment.student_id, StudentEnrollment.academic_year_id)
    all_ay_stud_rows = (await db.execute(all_ay_query)).all()

    # Query all completed payments across all AYs
    all_ay_pay_query = (
        select(
            Payment.student_id,
            Payment.academic_year_id,
            func.coalesce(func.sum(Payment.amount), 0).label("total_paid"),
        )
        .join(Student, Payment.student_id == Student.id)
        .where(Payment.status.in_(["completed", "verified", "reconciled", "posted"]))
    )
    if not is_sysadmin(current_user) and getattr(current_user, "institution_id", None):
        all_ay_pay_query = all_ay_pay_query.where(Student.institution_id == current_user.institution_id)
    if is_demo_filter is not None:
        all_ay_pay_query = all_ay_pay_query.where(Student.is_demo.is_(is_demo_filter))
    all_ay_pay_query = all_ay_pay_query.group_by(Payment.student_id, Payment.academic_year_id)
    all_ay_pay_rows = (await db.execute(all_ay_pay_query)).all()
    all_ay_pay_map = {(r.student_id, r.academic_year_id): float(r.total_paid) for r in all_ay_pay_rows}

    # Build multi-year annual breakdown across all academic years
    annual_breakdown = []
    selected_effective_ay = academic_year_id or (all_ays[0].id if all_ays else 1)
    for ay in all_ays:
        ay_students = [r for r in all_ay_stud_rows if r.academic_year_id == ay.id]
        tgt = sum(float(r.pkg_fee) for r in ay_students)
        col = sum(all_ay_pay_map.get((r.student_id, ay.id), 0.0) for r in ay_students)
        defaulters = sum(1 for r in ay_students if float(r.pkg_fee) > all_ay_pay_map.get((r.student_id, ay.id), 0.0) and float(r.pkg_fee) > 0)
        rate = round((col / tgt * 100.0), 1) if tgt > 0 else 0.0
        annual_breakdown.append({
            "academic_year_id": ay.id,
            "academic_year_name": ay.name,
            "is_current": ay.is_current,
            "is_selected": ay.id == selected_effective_ay,
            "enrolled_students": len(ay_students),
            "target_amount": round(tgt, 2),
            "collected_amount": round(col, 2),
            "pending_amount": max(0.0, round(tgt - col, 2)),
            "recovery_rate": rate,
            "defaulters_count": defaulters,
        })
    annual_breakdown.sort(key=lambda x: x["academic_year_id"], reverse=True)

    # 2. Query all enrolled students and their academic coordinates
    stud_query = (
        select(
            Student.id,
            Student.first_name,
            Student.last_name,
            Student.admission_number,
            Division.id.label("division_id"),
            Division.name.label("division_name"),
            Standard.id.label("standard_id"),
            Standard.name.label("standard_name"),
            Standard.level.label("standard_level"),
            Board.id.label("board_id"),
            Board.name.label("board_name"),
            StudentEnrollment.academic_year_id,
            AcademicYear.name.label("academic_year_name"),
            FeeInvoice.net_amount,
        )
        .join(StudentEnrollment, StudentEnrollment.student_id == Student.id)
        .join(AcademicYear, StudentEnrollment.academic_year_id == AcademicYear.id)
        .join(Division, StudentEnrollment.division_id == Division.id)
        .join(Standard, Division.standard_id == Standard.id)
        .outerjoin(Board, Division.board_id == Board.id)
        .outerjoin(
            FeeInvoice,
            (FeeInvoice.student_id == Student.id)
            & (FeeInvoice.status != "cancelled")
            & (FeeInvoice.academic_year_id == StudentEnrollment.academic_year_id),
        )
    )
    if not is_sysadmin(current_user) and getattr(current_user, "institution_id", None):
        stud_query = stud_query.where(Student.institution_id == current_user.institution_id)
    if is_demo_filter is not None:
        stud_query = stud_query.where(Student.is_demo.is_(is_demo_filter))

    if academic_year_id:
        stud_query = stud_query.where(StudentEnrollment.academic_year_id == academic_year_id)
    if board_id:
        stud_query = stud_query.where(Division.board_id == board_id)
    if standard_id:
        stud_query = stud_query.where(Division.standard_id == standard_id)
    if division_id:
        stud_query = stud_query.where(Division.id == division_id)

    stud_rows = (await db.execute(stud_query)).all()

    # Query all completed payments for enrolled students
    pay_query = (
        select(
            Payment.student_id,
            Payment.academic_year_id,
            Payment.amount,
            Payment.payment_method,
            Payment.payment_date,
            PaymentReceipt.receipt_number,
        )
        .join(Student, Payment.student_id == Student.id)
        .outerjoin(PaymentReceipt, PaymentReceipt.payment_id == Payment.id)
        .where(Payment.status.in_(["completed", "verified", "reconciled"]))
    )
    if not is_sysadmin(current_user) and getattr(current_user, "institution_id", None):
        pay_query = pay_query.where(Student.institution_id == current_user.institution_id)
    if is_demo_filter is not None:
        pay_query = pay_query.where(Student.is_demo.is_(is_demo_filter))
    if academic_year_id:
        pay_query = pay_query.where(Payment.academic_year_id == academic_year_id)

    pay_rows = (await db.execute(pay_query)).all()

    payments_by_student = {}
    mode_split = {"upi": 0.0, "cash": 0.0, "bank": 0.0, "other": 0.0}
    for p_sid, p_ayid, p_amt, p_meth, p_dt, p_rcpt in pay_rows:
        p_val = float(p_amt)
        if p_sid not in payments_by_student:
            payments_by_student[p_sid] = []
        payments_by_student[p_sid].append({
            "amount": p_val,
            "method": p_meth,
            "date": str(p_dt) if p_dt else None,
            "receipt": p_rcpt,
            "academic_year_id": p_ayid,
        })
        m_str = (p_meth or "").upper()
        if "UPI" in m_str or "QR" in m_str:
            mode_split["upi"] += p_val
        elif "CASH" in m_str:
            mode_split["cash"] += p_val
        elif "BANK" in m_str or "NEFT" in m_str or "RTGS" in m_str or "CHEQUE" in m_str:
            mode_split["bank"] += p_val
        else:
            mode_split["other"] += p_val

    # Deduplicate students across enrollments to prevent multiple count anomalies
    student_dict = {}
    for r in stud_rows:
        if r.id not in student_dict:
            student_dict[r.id] = r

    # 12-Month Pivot definitions (March to February as per coaching cycle)
    pivot_months_def = [
        {"key": "2026-03", "label": "Mar 26", "name": "March"},
        {"key": "2026-04", "label": "Apr 26", "name": "April"},
        {"key": "2026-05", "label": "May 26", "name": "May"},
        {"key": "2026-06", "label": "Jun 26", "name": "June"},
        {"key": "2026-07", "label": "Jul 26", "name": "July"},
        {"key": "2026-08", "label": "Aug 26", "name": "August"},
        {"key": "2026-09", "label": "Sep 26", "name": "September"},
        {"key": "2026-10", "label": "Oct 26", "name": "October"},
        {"key": "2026-11", "label": "Nov 26", "name": "November"},
        {"key": "2026-12", "label": "Dec 26", "name": "December"},
        {"key": "2027-01", "label": "Jan 27", "name": "January"},
        {"key": "2027-02", "label": "Feb 27", "name": "February"},
    ]
    pivot_month_keys = [m["key"] for m in pivot_months_def]

    board_map = {}
    standard_map = {}
    batch_map = {}
    students_roster = []

    pivot_monthly_totals = {k: 0.0 for k in pivot_month_keys}

    for s_id, r in student_dict.items():
        s_name = f"{r.first_name} {r.last_name or ''}".strip()
        b_id = r.board_id or 0
        b_name = r.board_name or "General / Other"
        std_id = r.standard_id
        std_name = r.standard_name
        std_level = r.standard_level
        div_id = r.division_id
        div_name = r.division_name
        ay_id = r.academic_year_id
        pkg_fee = float(r.net_amount or 0.0)

        # Student payments
        st_pays = payments_by_student.get(s_id, [])
        paid_val = sum(p["amount"] for p in st_pays if not academic_year_id or p["academic_year_id"] == ay_id)
        bal_due = max(0.0, round(pkg_fee - paid_val, 2))
        is_defaulter = 1 if bal_due > 0 and pkg_fee > 0 else 0

        # Monthly payment map for this student
        st_months_paid = {k: 0.0 for k in pivot_month_keys}
        for p in st_pays:
            if not academic_year_id or p["academic_year_id"] == ay_id:
                p_dt = p["date"] or ""
                ym = p_dt[:7]
                if ym in st_months_paid:
                    st_months_paid[ym] += p["amount"]
                    pivot_monthly_totals[ym] += p["amount"]

        if paid_val >= pkg_fee and pkg_fee > 0:
            status = "paid"
        elif paid_val > 0:
            status = "partial"
        elif pkg_fee > 0:
            status = "overdue"
        else:
            status = "upcoming"

        # 1. Board map
        if b_id not in board_map:
            board_map[b_id] = {
                "board_id": b_id,
                "board_name": b_name,
                "enrolled_students": set(),
                "standards_set": set(),
                "batches_set": set(),
                "target_amount": 0.0,
                "collected_amount": 0.0,
                "defaulters_count": 0,
                "monthly_collections": {k: 0.0 for k in pivot_month_keys},
            }
        board_map[b_id]["enrolled_students"].add(s_id)
        board_map[b_id]["standards_set"].add(std_id)
        board_map[b_id]["batches_set"].add(div_id)
        board_map[b_id]["target_amount"] += pkg_fee
        board_map[b_id]["collected_amount"] += paid_val
        board_map[b_id]["defaulters_count"] += is_defaulter
        for k, v in st_months_paid.items():
            board_map[b_id]["monthly_collections"][k] += v

        # 2. Standard map
        if std_id not in standard_map:
            standard_map[std_id] = {
                "standard_id": std_id,
                "standard_name": std_name,
                "level": std_level,
                "board_name": b_name,
                "enrolled_students": set(),
                "batches_set": set(),
                "target_amount": 0.0,
                "collected_amount": 0.0,
                "defaulters_count": 0,
                "monthly_collections": {k: 0.0 for k in pivot_month_keys},
            }
        standard_map[std_id]["enrolled_students"].add(s_id)
        standard_map[std_id]["batches_set"].add(div_id)
        standard_map[std_id]["target_amount"] += pkg_fee
        standard_map[std_id]["collected_amount"] += paid_val
        standard_map[std_id]["defaulters_count"] += is_defaulter
        for k, v in st_months_paid.items():
            standard_map[std_id]["monthly_collections"][k] += v

        # 3. Batch map
        if div_id not in batch_map:
            batch_map[div_id] = {
                "batch_id": div_id,
                "batch_name": div_name,
                "standard_name": std_name,
                "board_name": b_name,
                "enrolled_students": set(),
                "target_amount": 0.0,
                "collected_amount": 0.0,
                "defaulters_count": 0,
                "monthly_collections": {k: 0.0 for k in pivot_month_keys},
            }
        batch_map[div_id]["enrolled_students"].add(s_id)
        batch_map[div_id]["target_amount"] += pkg_fee
        batch_map[div_id]["collected_amount"] += paid_val
        batch_map[div_id]["defaulters_count"] += is_defaulter
        for k, v in st_months_paid.items():
            batch_map[div_id]["monthly_collections"][k] += v

        # 4. Student Roster item
        p_first = st_pays[0] if st_pays else None
        students_roster.append({
            "student_id": s_id,
            "admission_number": r.admission_number,
            "student_name": s_name,
            "batch_id": div_id,
            "batch_name": div_name,
            "standard_id": std_id,
            "standard_name": std_name,
            "board_id": b_id,
            "board_name": b_name,
            "academic_year_id": ay_id,
            "package_fee": pkg_fee,
            "month_due": round(pkg_fee / 12.0, 2),
            "paid_amount": paid_val,
            "balance_due": bal_due,
            "status": status,
            "payment_date": p_first["date"] if p_first else None,
            "receipt_number": p_first["receipt"] if p_first else None,
            "payment_method": p_first["method"] if p_first else None,
        })

    # Finalize Board Breakdown
    board_breakdown = []
    for b_id, b_data in board_map.items():
        tgt = round(b_data["target_amount"], 2)
        col = round(b_data["collected_amount"], 2)
        rate = round((col / tgt * 100.0), 1) if tgt > 0 else 0.0
        color = "emerald" if rate >= 80.0 else ("amber" if rate >= 40.0 else "rose")
        board_breakdown.append({
            "board_id": b_data["board_id"],
            "board_name": b_data["board_name"],
            "enrolled_students": len(b_data["enrolled_students"]),
            "standards_count": len(b_data["standards_set"]),
            "batches_count": len(b_data["batches_set"]),
            "target_amount": tgt,
            "collected_amount": col,
            "pending_amount": max(0.0, round(tgt - col, 2)),
            "recovery_rate": rate,
            "defaulters_count": b_data["defaulters_count"],
            "status_color": color,
        })
    board_breakdown.sort(key=lambda x: x["target_amount"], reverse=True)

    # Finalize Standard Breakdown
    standard_breakdown = []
    for s_id, s_data in standard_map.items():
        tgt = round(s_data["target_amount"], 2)
        col = round(s_data["collected_amount"], 2)
        rate = round((col / tgt * 100.0), 1) if tgt > 0 else 0.0
        color = "emerald" if rate >= 80.0 else ("amber" if rate >= 40.0 else "rose")
        standard_breakdown.append({
            "standard_id": s_data["standard_id"],
            "standard_name": s_data["standard_name"],
            "level": s_data["level"],
            "board_name": s_data["board_name"],
            "enrolled_students": len(s_data["enrolled_students"]),
            "batches_count": len(s_data["batches_set"]),
            "target_amount": tgt,
            "collected_amount": col,
            "pending_amount": max(0.0, round(tgt - col, 2)),
            "recovery_rate": rate,
            "defaulters_count": s_data["defaulters_count"],
            "status_color": color,
        })
    standard_breakdown.sort(key=lambda x: x["level"])

    # Global KPI calculation
    total_target = sum(b["target_amount"] for b in board_breakdown)
    total_collected = sum(b["collected_amount"] for b in board_breakdown)
    total_pending = max(0.0, round(total_target - total_collected, 2))
    overall_rate = round((total_collected / total_target * 100.0), 1) if total_target > 0 else 0.0
    total_defaulters = sum(b["defaulters_count"] for b in board_breakdown)

    # Finalize Monthly Pivot by Board, Standard, and Batch
    pivot_by_board = []
    for b_id, b_data in board_map.items():
        tgt = round(b_data["target_amount"], 2)
        col = round(b_data["collected_amount"], 2)
        rate = round((col / tgt * 100.0), 1) if tgt > 0 else 0.0
        pivot_by_board.append({
            "board_id": b_data["board_id"],
            "board_name": b_data["board_name"],
            "enrolled_students": len(b_data["enrolled_students"]),
            "target_amount": tgt,
            "monthly_collections": {k: round(v, 2) for k, v in b_data["monthly_collections"].items()},
            "total_realized": col,
            "pending_amount": max(0.0, round(tgt - col, 2)),
            "recovery_rate": rate,
        })
    pivot_by_board.sort(key=lambda x: x["target_amount"], reverse=True)

    pivot_by_standard = []
    for s_id, s_data in standard_map.items():
        tgt = round(s_data["target_amount"], 2)
        col = round(s_data["collected_amount"], 2)
        rate = round((col / tgt * 100.0), 1) if tgt > 0 else 0.0
        pivot_by_standard.append({
            "standard_id": s_data["standard_id"],
            "standard_name": s_data["standard_name"],
            "board_name": s_data["board_name"],
            "batches_count": len(s_data["batches_set"]),
            "enrolled_students": len(s_data["enrolled_students"]),
            "target_amount": tgt,
            "monthly_collections": {k: round(v, 2) for k, v in s_data["monthly_collections"].items()},
            "total_realized": col,
            "pending_amount": max(0.0, round(tgt - col, 2)),
            "recovery_rate": rate,
        })
    pivot_by_standard.sort(key=lambda x: x["target_amount"], reverse=True)

    pivot_by_batch = []
    for b_id, b_data in batch_map.items():
        tgt = round(b_data["target_amount"], 2)
        col = round(b_data["collected_amount"], 2)
        rate = round((col / tgt * 100.0), 1) if tgt > 0 else 0.0
        pivot_by_batch.append({
            "batch_id": b_data["batch_id"],
            "batch_name": b_data["batch_name"],
            "standard_name": b_data["standard_name"],
            "board_name": b_data["board_name"],
            "enrolled_students": len(b_data["enrolled_students"]),
            "target_amount": tgt,
            "monthly_collections": {k: round(v, 2) for k, v in b_data["monthly_collections"].items()},
            "total_realized": col,
            "pending_amount": max(0.0, round(tgt - col, 2)),
            "recovery_rate": rate,
        })
    pivot_by_batch.sort(key=lambda x: x["target_amount"], reverse=True)

    monthly_pivot = {
        "months": pivot_months_def,
        "by_board": pivot_by_board,
        "by_standard": pivot_by_standard,
        "by_batch": pivot_by_batch,
        "totals": {
            "monthly_realized": {k: round(v, 2) for k, v in pivot_monthly_totals.items()},
            "total_target": total_target,
            "total_realized": total_collected,
            "total_pending": total_pending,
            "recovery_rate": overall_rate,
        },
    }

    return {
        "kpis": {
            "total_target": total_target,
            "total_collected": total_collected,
            "total_pending": total_pending,
            "realization_rate": overall_rate,
            "total_students": len(students_roster),
            "total_defaulters": total_defaulters,
            "mode_split": {
                "upi": round(mode_split["upi"], 2),
                "cash": round(mode_split["cash"], 2),
                "bank": round(mode_split["bank"], 2),
                "other": round(mode_split["other"], 2),
            },
        },
        "annual_breakdown": annual_breakdown,
        "board_breakdown": board_breakdown,
        "standard_breakdown": standard_breakdown,
        "monthly_pivot": monthly_pivot,
        "students": students_roster,
        "total_students": len(students_roster),
    }


@router.get("/student-monthly-pivot")
async def get_student_monthly_pivot(
    academic_year_id: Optional[int] = None,
    board_id: Optional[str] = None,
    standard_id: Optional[str] = None,
    division_id: Optional[str] = None,
    payment_status: Optional[str] = None,
    student_status: Optional[str] = None,
    payment_method: Optional[str] = None,
    search: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    data_env: str = Depends(get_data_environment),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role(*FEE_STAFF_VIEW_ROLES)),
):
    """
    Dynamic Student-wise Fee Collection Pivot with Advanced Multi-Dimensional Filters:
    - Rows: Student name, admission #, board, standard/grade, division, batch, package fee
    - Columns: 12 months (March to February), Total Collected, Balance
    - Individual payment amounts with drilldown transaction details
    - Summary metrics: total students, agreed package, total collected, balance, collection %, defaulters
    """
    is_demo_filter = True if data_env == "TRAINING" else (False if data_env == "PRODUCTION" else None)
    inst_id = getattr(current_user, "institution_id", None) if not is_sysadmin(current_user) else None

    # 1. Resolve Academic Year
    if not academic_year_id:
        curr_ay_query = select(AcademicYear).where(AcademicYear.is_current.is_(True))
        if inst_id:
            curr_ay_query = curr_ay_query.where(AcademicYear.institution_id == inst_id)
        curr_ay = (await db.execute(curr_ay_query)).scalars().first()
        effective_ay_id = curr_ay.id if curr_ay else 1
    else:
        effective_ay_id = academic_year_id

    # 2. Fetch Filter Master Options
    ay_q = select(AcademicYear).order_by(AcademicYear.id.desc())
    bd_q = select(Board).order_by(Board.name.asc())
    std_q = select(Standard).order_by(Standard.level.asc(), Standard.name.asc())
    div_q = select(Division).order_by(Division.name.asc())

    if inst_id:
        ay_q = ay_q.where(AcademicYear.institution_id == inst_id)
        bd_q = bd_q.where(Board.institution_id == inst_id)
        std_q = std_q.where(Standard.institution_id == inst_id)

    all_ays = (await db.execute(ay_q)).scalars().all()
    all_bds = (await db.execute(bd_q)).scalars().all()
    all_stds = (await db.execute(std_q)).scalars().all()
    all_divs = (await db.execute(div_q)).scalars().all()

    filter_options = {
        "academic_years": [{"id": a.id, "name": a.name, "is_current": a.is_current} for a in all_ays],
        "boards": [{"id": b.id, "name": b.name, "code": b.code} for b in all_bds],
        "standards": [{"id": s.id, "name": s.name, "level": s.level} for s in all_stds],
        "divisions": [{"id": d.id, "name": d.name, "standard_id": d.standard_id, "board_id": d.board_id} for d in all_divs],
        "payment_methods": ["CASH", "UPI", "BANK_TRANSFER", "CHEQUE", "CARD", "DEMAND_DRAFT"],
        "payment_statuses": [
            {"id": "all", "label": "All Payment Statuses"},
            {"id": "paid", "label": "Fully Paid"},
            {"id": "partial", "label": "Partially Paid"},
            {"id": "overdue", "label": "Overdue Defaulters"},
            {"id": "upcoming", "label": "Upcoming / No Dues"},
        ],
        "student_statuses": [
            {"id": "all", "label": "All Students"},
            {"id": "active", "label": "Active Students"},
            {"id": "former", "label": "Former / Inactive"},
        ],
    }

    # 3. Parse Multi-Select Filter Lists
    def parse_int_list(val: Optional[str]) -> List[int]:
        if not val or val.strip().lower() in ("all", ""):
            return []
        res = []
        for p in val.split(","):
            p = p.strip()
            if p.isdigit():
                res.append(int(p))
        return res

    selected_bds = parse_int_list(board_id)
    selected_stds = parse_int_list(standard_id)
    selected_divs = parse_int_list(division_id)
    selected_statuses = [s.strip().lower() for s in (payment_status or "").split(",") if s.strip() and s.strip().lower() != "all"]

    # 4. Query Enrolled Students for Selected AY
    stud_q = (
        select(
            Student.id,
            Student.admission_number,
            Student.first_name,
            Student.last_name,
            Student.phone,
            Student.is_active,
            Student.admission_date,
            StudentEnrollment.status.label("enrollment_status"),
            Division.id.label("division_id"),
            Division.name.label("division_name"),
            Standard.id.label("standard_id"),
            Standard.name.label("standard_name"),
            Board.id.label("board_id"),
            Board.name.label("board_name"),
            FeeInvoice.id.label("invoice_id"),
            FeeInvoice.net_amount,
            FeeInvoice.due_date,
            FeeInvoice.outstanding_amount,
            FeeInvoice.notes.label("invoice_notes"),
        )
        .join(StudentEnrollment, StudentEnrollment.student_id == Student.id)
        .join(Division, StudentEnrollment.division_id == Division.id)
        .join(Standard, Division.standard_id == Standard.id)
        .outerjoin(Board, Division.board_id == Board.id)
        .outerjoin(
            FeeInvoice,
            (FeeInvoice.student_id == Student.id)
            & (FeeInvoice.status != "cancelled")
            & (FeeInvoice.academic_year_id == effective_ay_id),
        )
        .where(StudentEnrollment.academic_year_id == effective_ay_id)
    )
    if inst_id:
        stud_q = stud_q.where(Student.institution_id == inst_id)
    if is_demo_filter is not None:
        stud_q = stud_q.where(Student.is_demo.is_(is_demo_filter))

    # Apply Dependent Multi-Select Filters
    if selected_bds:
        stud_q = stud_q.where(Division.board_id.in_(selected_bds))
    if selected_stds:
        stud_q = stud_q.where(Division.standard_id.in_(selected_stds))
    if selected_divs:
        stud_q = stud_q.where(Division.id.in_(selected_divs))

    # Student Status Filter
    if student_status and student_status.lower() != "all":
        if student_status.lower() == "active":
            stud_q = stud_q.where(Student.is_active.is_(True))
        elif student_status.lower() in ("former", "inactive"):
            stud_q = stud_q.where(Student.is_active.is_(False))

    # Search filter
    if search and search.strip():
        term = f"%{search.strip()}%"
        stud_q = stud_q.where(
            or_(
                Student.first_name.ilike(term),
                Student.last_name.ilike(term),
                Student.admission_number.ilike(term),
                Student.phone.ilike(term),
            )
        )

    stud_q = stud_q.order_by(StudentEnrollment.id.desc())
    stud_rows = (await db.execute(stud_q)).all()

    # Deduplicate students
    student_dict = {}
    for r in stud_rows:
        if r.id not in student_dict:
            student_dict[r.id] = r

    student_ids = list(student_dict.keys())

    # 5. Query Completed Payments for these students
    payments_by_student = {}
    if student_ids:
        pay_q = (
            select(
                Payment.id,
                Payment.student_id,
                Payment.amount,
                Payment.payment_date,
                Payment.payment_method,
                Payment.status,
                PaymentReceipt.receipt_number,
            )
            .outerjoin(
                PaymentReceipt,
                (PaymentReceipt.payment_id == Payment.id) & (PaymentReceipt.status == "valid"),
            )
            .where(
                Payment.student_id.in_(student_ids),
                Payment.academic_year_id == effective_ay_id,
                Payment.status.in_(["completed", "verified", "reconciled", "posted"]),
            )
            .order_by(Payment.payment_date.asc())
        )
        if payment_method and payment_method.strip().lower() != "all":
            pay_q = pay_q.where(Payment.payment_method.ilike(f"%{payment_method.strip()}%"))
        if start_date:
            pay_q = pay_q.where(Payment.payment_date >= start_date)
        if end_date:
            pay_q = pay_q.where(Payment.payment_date <= end_date)

        pay_rows = (await db.execute(pay_q)).all()
        for p in pay_rows:
            payments_by_student.setdefault(p.student_id, []).append({
                "id": p.id,
                "amount": float(p.amount),
                "payment_date": str(p.payment_date),
                "payment_method": p.payment_method or "CASH",
                "receipt_number": p.receipt_number or f"RCP-{p.id:04d}",
            })

    # 6. Define 12 Months (March through February)
    months_def = [
        {"key": "2026-03", "name": "March", "short_name": "Mar", "year": 2026},
        {"key": "2026-04", "name": "April", "short_name": "Apr", "year": 2026},
        {"key": "2026-05", "name": "May", "short_name": "May", "year": 2026},
        {"key": "2026-06", "name": "June", "short_name": "Jun", "year": 2026},
        {"key": "2026-07", "name": "July", "short_name": "Jul", "year": 2026},
        {"key": "2026-08", "name": "August", "short_name": "Aug", "year": 2026},
        {"key": "2026-09", "name": "September", "short_name": "Sep", "year": 2026},
        {"key": "2026-10", "name": "October", "short_name": "Oct", "year": 2026},
        {"key": "2026-11", "name": "November", "short_name": "Nov", "year": 2026},
        {"key": "2026-12", "name": "December", "short_name": "Dec", "year": 2026},
        {"key": "2027-01", "name": "January", "short_name": "Jan", "year": 2027},
        {"key": "2027-02", "name": "February", "short_name": "Feb", "year": 2027},
    ]
    month_keys = [m["key"] for m in months_def]
    monthly_col_totals = {m["key"]: 0.0 for m in months_def}

    # 7. Build Student Pivot Rows
    pivot_students = []
    total_agreed = 0.0
    total_col = 0.0
    total_bal = 0.0
    defaulters_cnt = 0
    pending_installments_cnt = 0

    today_ym = "2026-11"  # Current institute operating cycle

    for s_id, r in student_dict.items():
        s_name = f"{r.first_name} {r.last_name or ''}".strip()
        pkg_fee = float(r.net_amount or 0.0)
        st_pays = payments_by_student.get(s_id, [])
        paid_val = sum(p["amount"] for p in st_pays)
        bal_due = max(0.0, round(pkg_fee - paid_val, 2))

        # Monthly breakdown
        months_data = {}
        for m in months_def:
            m_key = m["key"]
            m_pays = [p for p in st_pays if p["payment_date"][:7] == m_key]
            m_amt = sum(p["amount"] for p in m_pays)

            # Check if pending installment exists in this month
            is_pending = False
            pending_amt = 0.0
            if r.due_date and str(r.due_date)[:7] == m_key and bal_due > 0 and m_key <= today_ym:
                is_pending = True
                pending_amt = bal_due

            if m_amt > 0:
                cell_status = "paid"
            elif is_pending:
                cell_status = "pending"
            elif m_key <= today_ym and bal_due > 0:
                cell_status = "unpaid"
            else:
                cell_status = "none"

            months_data[m_key] = {
                "amount": round(m_amt, 2),
                "payments_count": len(m_pays),
                "is_pending": is_pending,
                "pending_amount": round(pending_amt, 2),
                "status": cell_status,
                "payments": m_pays,
            }
            monthly_col_totals[m_key] += m_amt

        if bal_due <= 0 and pkg_fee > 0:
            calc_status = "paid"
        elif paid_val > 0:
            calc_status = "partial"
        elif pkg_fee > 0:
            calc_status = "overdue"
            defaulters_cnt += 1
        else:
            calc_status = "upcoming"

        if any(v["is_pending"] for v in months_data.values()):
            pending_installments_cnt += 1

        # Check Payment Status filter
        if selected_statuses and calc_status not in selected_statuses:
            continue

        total_agreed += pkg_fee
        total_col += paid_val
        total_bal += bal_due

        student_st_str = "active" if r.is_active else "former"

        # Parse collection remark & priority from invoice notes
        raw_notes = getattr(r, "invoice_notes", None) or ""
        parsed_priority = None
        parsed_status = "follow_up_required"
        parsed_remark = ""
        if raw_notes:
            parsed_remark = raw_notes
            if "[PRIORITY:" in raw_notes:
                import re
                p_match = re.search(r"\[PRIORITY:\s*(\w+)\]", raw_notes, re.IGNORECASE)
                if p_match:
                    parsed_priority = p_match.group(1).lower()
                s_match = re.search(r"\[STATUS:\s*(\w+)\]", raw_notes, re.IGNORECASE)
                if s_match:
                    parsed_status = s_match.group(1).lower()
                clean_rem = re.sub(r"\[PRIORITY:[^\]]+\]", "", raw_notes)
                clean_rem = re.sub(r"\[STATUS:[^\]]+\]", "", clean_rem)
                clean_rem = re.sub(r"\(by [^\)]+\)", "", clean_rem)
                parsed_remark = clean_rem.strip()
            else:
                parsed_priority = "normal"

        pivot_students.append({
            "student_id": s_id,
            "admission_number": r.admission_number,
            "student_name": s_name,
            "phone": r.phone or "—",
            "board_id": r.board_id,
            "board_name": r.board_name or "General",
            "standard_id": r.standard_id,
            "standard_name": r.standard_name,
            "division_id": r.division_id,
            "division_name": r.division_name,
            "batch_name": r.division_name,
            "package_fee": pkg_fee,
            "months": months_data,
            "total_collected": round(paid_val, 2),
            "balance": round(bal_due, 2),
            "collection_rate": round((paid_val / pkg_fee * 100.0), 1) if pkg_fee > 0 else 0.0,
            "status": calc_status,
            "student_status": student_st_str,
            "invoice_id": getattr(r, "invoice_id", None),
            "remark": parsed_remark,
            "priority": parsed_priority,
            "follow_up_status": parsed_status,
        })

    col_pct = round((total_col / total_agreed * 100.0), 1) if total_agreed > 0 else 0.0

    return {
        "summary": {
            "total_students": len(pivot_students),
            "total_agreed_package": round(total_agreed, 2),
            "total_collected": round(total_col, 2),
            "total_balance": round(total_bal, 2),
            "collection_percentage": col_pct,
            "defaulters_count": defaulters_cnt,
            "pending_installments_count": pending_installments_cnt,
        },
        "months": months_def,
        "students": pivot_students,
        "monthly_totals": {k: round(v, 2) for k, v in monthly_col_totals.items()},
        "filter_options": filter_options,
    }


class StudentCollectionRemarkPayload(BaseModel):
    student_id: int
    invoice_id: Optional[int] = None
    academic_year_id: Optional[int] = None
    remark: str = Field(..., min_length=1, max_length=500)
    priority: str = Field("normal")  # urgent, high, normal, low
    follow_up_status: str = Field("follow_up_required")  # follow_up_required, promise_to_pay, disputed, under_review, cleared
    follow_up_date: Optional[str] = None


@router.post("/student-collection-remark")
async def save_student_collection_remark(
    data: StudentCollectionRemarkPayload,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role(*FEE_STAFF_VIEW_ROLES)),
):
    """
    Record or update an operational follow-up remark and priority on a student fee account.
    Persists to the student's active FeeInvoice.notes and FeeInvoice.remarks with audit attribution.
    """
    student = await db.get(Student, data.student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    check_institution_access(student.institution_id, current_user)

    invoice = None
    if data.invoice_id:
        invoice = await db.get(FeeInvoice, data.invoice_id)
    if not invoice:
        inv_q = (
            select(FeeInvoice)
            .where(
                FeeInvoice.student_id == data.student_id,
                FeeInvoice.status != "cancelled",
            )
        )
        if data.academic_year_id:
            inv_q = inv_q.where(FeeInvoice.academic_year_id == data.academic_year_id)
        inv_q = inv_q.order_by(FeeInvoice.id.desc())
        invoice = (await db.execute(inv_q)).scalars().first()

    now_str = datetime.now().strftime("%Y-%m-%d %H:%M")
    username = getattr(current_user, "username", "staff")
    formatted_entry = f"[PRIORITY: {data.priority.upper()}] [STATUS: {data.follow_up_status.upper()}] {data.remark.strip()} (by {username} on {now_str})"

    if invoice:
        invoice.notes = formatted_entry
        db.add(invoice)
    else:
        # Fallback to latest student enrollment record
        enr_q = (
            select(StudentEnrollment)
            .where(StudentEnrollment.student_id == data.student_id)
            .order_by(StudentEnrollment.id.desc())
        )
        enr = (await db.execute(enr_q)).scalars().first()
        if enr:
            enr.remarks = formatted_entry[:500]
            db.add(enr)

    await db.commit()
    return {
        "status": "success",
        "message": "Collection remark and priority recorded successfully",
        "student_id": data.student_id,
        "priority": data.priority.lower(),
        "follow_up_status": data.follow_up_status.lower(),
        "remark": data.remark.strip(),
    }


@router.get("/former-students-recovery")
async def get_former_students_recovery(
    academic_year_id: Optional[int] = None,
    board_id: Optional[int] = None,
    standard_id: Optional[int] = None,
    min_outstanding: Optional[float] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role(*FEE_STAFF_VIEW_ROLES)),
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

    if not is_sysadmin(current_user) and getattr(current_user, "institution_id", None):
        query = query.where(Student.institution_id == current_user.institution_id)
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

