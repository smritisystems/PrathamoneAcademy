# /**
#  * @file        concessions.py
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
#  * @created     2026-11-10
#  * @updated     2026-11-12
#  *
#  * @description REST API router for fee concessions, merit scholarships, eligibility evaluation, and multi-stage approval workflow.
#  */

import json
from decimal import Decimal
from typing import Optional, List, Dict, Any
from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select, and_, or_, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.deps import get_current_active_user, require_role, has_permission, check_institution_access, is_sysadmin
from app.models.user import User, AuditLog
from app.models.student import Student
from app.models.enrollment import StudentEnrollment
from app.models.standard import Standard
from app.models.academic_year import AcademicYear
from app.models.fee import (
    FeeConcessionType,
    StudentConcessionApplication,
    FeeConcessionAllocation,
    FeeInvoice,
    StudentFeeAssignment,
    SponsorSettlement,
)
from app.services.concession_service import (
    ConcessionEligibilityService,
    ConcessionCalculationService,
    ConcessionWorkflowService,
)
from app.services.financial_governance_service import (
    FinancialGovernanceService,
    FinancialFilter,
)

router = APIRouter(tags=["fees-concessions"])

CONCESSION_STAFF_ROLES = (
    "superadmin",
    "sysadmin",
    "super_admin",
    "admin",
    "principal",
    "accountant",
    "staff",
    "teacher",
    "counselor",
    "counsellor",
    "receptionist",
)
CONCESSION_REPORT_ROLES = ("superadmin", "sysadmin", "super_admin", "admin", "principal", "accountant")


def _authorize_concession_student_or_staff(
    student_id: Optional[int],
    institution_id: Optional[int],
    current_user: User,
) -> None:
    """Enforces student self-ownership or staff role, plus tenant isolation."""
    role = (getattr(current_user, "role", "") or "").strip().lower()
    if role == "student":
        if not student_id or getattr(current_user, "student_id", None) != student_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access forbidden: Students may only view their own concession records.",
            )
    elif not is_sysadmin(current_user) and role not in CONCESSION_STAFF_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
    check_institution_access(institution_id, current_user)


async def _authorize_application_tenant(db: AsyncSession, application_id: int, current_user: User) -> None:
    app_row = await db.get(StudentConcessionApplication, application_id)
    if not app_row:
        raise HTTPException(status_code=404, detail="Application not found")
    check_institution_access(app_row.institution_id, current_user)


# ─── PYDANTIC SCHEMAS ─────────────────────────────────────────────────────────

class ConcessionTypeCreate(BaseModel):
    code: str
    name: str
    category: str
    benefit_type: Optional[str] = None
    description: Optional[str] = None
    funding_source: str = "institute"
    calculation_type: str = "percentage"
    default_value: Decimal = Decimal("0.00")
    max_discount_amount: Optional[Decimal] = None
    is_stackable: bool = True
    requires_documents: bool = False
    eligibility_rules: Optional[str] = None
    is_active: bool = True


class ConcessionTypeUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    category: Optional[str] = None
    benefit_type: Optional[str] = None
    description: Optional[str] = None
    funding_source: Optional[str] = None
    calculation_type: Optional[str] = None
    default_value: Optional[Decimal] = None
    max_discount_amount: Optional[Decimal] = None
    is_stackable: Optional[bool] = None
    requires_documents: Optional[bool] = None
    eligibility_rules: Optional[str] = None
    is_active: Optional[bool] = None


class ConcessionApplicationCreate(BaseModel):
    student_id: int
    concession_type_id: int
    academic_year_id: Optional[int] = None
    fee_category_id: Optional[int] = None
    requested_amount: Optional[Decimal] = None
    requested_percentage: Optional[Decimal] = None
    applicant_type: str = "staff_nomination"
    sponsor_name: Optional[str] = None
    sponsor_reference: Optional[str] = None
    sponsor_sanctioned_amount: Optional[Decimal] = None
    supporting_document_url: Optional[str] = None
    valid_until: Optional[date] = None
    idempotency_key: Optional[str] = None
    remarks: Optional[str] = None


class ConcessionBulkApplicationCreate(BaseModel):
    student_ids: List[int]
    concession_type_id: int
    academic_year_id: Optional[int] = None
    fee_category_id: Optional[int] = None
    requested_amount: Optional[Decimal] = None
    requested_percentage: Optional[Decimal] = None
    applicant_type: str = "staff_nomination"
    sponsor_name: Optional[str] = None
    sponsor_reference: Optional[str] = None
    valid_until: Optional[date] = None
    remarks: Optional[str] = None
    auto_approve: bool = False
    auto_apply: bool = True


class ConcessionVerificationRequest(BaseModel):
    notes: str
    supporting_document_url: Optional[str] = None


class ConcessionApprovalRequest(BaseModel):
    approved_amount: Optional[Decimal] = None
    remarks: Optional[str] = None
    auto_apply: bool = True


class ConcessionApplyRequest(BaseModel):
    allocation_amount: Optional[Decimal] = None
    invoice_item_id: Optional[int] = None


class ConcessionRejectionRequest(BaseModel):
    rejection_reason: str


class ConcessionWithdrawalRequest(BaseModel):
    withdrawal_reason: str


class ConcessionReversalRequest(BaseModel):
    reversal_reason: str


class ConcessionCancellationRequest(BaseModel):
    cancellation_reason: str


class SponsorSettlementCreate(BaseModel):
    amount: Decimal
    received_date: Optional[date] = None
    payment_method: str = "bank_transfer"
    reference_number: Optional[str] = None
    remarks: Optional[str] = None


# ─── 1. CONCESSION TYPE ENDPOINTS ─────────────────────────────────────────────

@router.get("/types")
async def list_concession_types(
    institution_id: Optional[int] = None,
    category: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    if institution_id is not None:
        check_institution_access(institution_id, current_user)
    inst_id = institution_id or current_user.institution_id or 1
    query = select(FeeConcessionType).where(FeeConcessionType.institution_id == inst_id)

    if category:
        query = query.where(FeeConcessionType.category == category)
    if is_active is not None:
        query = query.where(FeeConcessionType.is_active == is_active)

    query = query.order_by(FeeConcessionType.id)
    res = await db.execute(query)
    types = res.scalars().all()

    # Count linked student applications per concession type
    counts_res = await db.execute(
        select(
            StudentConcessionApplication.concession_type_id,
            func.count(StudentConcessionApplication.id),
        ).group_by(StudentConcessionApplication.concession_type_id)
    )
    app_counts = dict(counts_res.all())

    return [
        {
            "id": t.id,
            "institution_id": t.institution_id,
            "code": t.code,
            "name": t.name,
            "category": t.category,
            "benefit_type": t.benefit_type or FinancialGovernanceService.resolve_benefit_classification(
                t.category, t.funding_source, t.calculation_type, getattr(t, "benefit_type", None)
            )[0],
            "description": t.description,
            "funding_source": t.funding_source,
            "calculation_type": t.calculation_type,
            "default_value": float(t.default_value),
            "max_discount_amount": float(t.max_discount_amount) if t.max_discount_amount else None,
            "is_stackable": t.is_stackable,
            "requires_documents": t.requires_documents,
            "eligibility_rules": t.eligibility_rules,
            "is_active": t.is_active,
            "applications_count": app_counts.get(t.id, 0),
            "created_at": t.created_at.isoformat() if t.created_at else None,
        }
        for t in types
    ]


@router.post("/types", status_code=status.HTTP_201_CREATED)
async def create_concession_type(
    payload: ConcessionTypeCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("superadmin", "admin", "accountant", "principal")),
):
    inst_id = current_user.institution_id or 1
    code_clean = payload.code.strip().upper()

    existing = (await db.execute(
        select(FeeConcessionType).where(
            FeeConcessionType.institution_id == inst_id,
            FeeConcessionType.code == code_clean,
        )
    )).scalar_one_or_none()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Concession code '{code_clean}' already exists for this institution.",
        )

    resolved_benefit_type, _ = FinancialGovernanceService.resolve_benefit_classification(
        payload.category, payload.funding_source, payload.calculation_type, payload.benefit_type
    )
    ctype = FeeConcessionType(
        institution_id=inst_id,
        code=code_clean,
        name=payload.name.strip(),
        category=payload.category.strip().lower(),
        benefit_type=resolved_benefit_type,
        description=payload.description,
        funding_source=payload.funding_source,
        calculation_type=payload.calculation_type,
        default_value=payload.default_value,
        max_discount_amount=payload.max_discount_amount,
        is_stackable=payload.is_stackable,
        requires_documents=payload.requires_documents,
        eligibility_rules=payload.eligibility_rules,
        is_active=payload.is_active,
    )
    db.add(ctype)
    await db.commit()
    await db.refresh(ctype)
    return {"message": "Concession type created successfully", "id": ctype.id, "code": ctype.code}


@router.put("/types/{type_id}")
async def update_concession_type(
    type_id: int,
    payload: ConcessionTypeUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("superadmin", "admin", "accountant", "principal")),
):
    ctype = await db.get(FeeConcessionType, type_id)
    if not ctype:
        raise HTTPException(status_code=404, detail="Concession type not found")
    check_institution_access(ctype.institution_id, current_user)

    update_dict = payload.dict(exclude_unset=True)
    if "code" in update_dict and update_dict["code"]:
        code_clean = update_dict["code"].strip().upper()
        if code_clean != ctype.code:
            existing = (await db.execute(
                select(FeeConcessionType).where(
                    FeeConcessionType.institution_id == ctype.institution_id,
                    FeeConcessionType.code == code_clean,
                    FeeConcessionType.id != type_id,
                )
            )).scalar_one_or_none()
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Concession code '{code_clean}' already exists for this institution.",
                )
            ctype.code = code_clean
        del update_dict["code"]

    for key, val in update_dict.items():
        if val is not None:
            if key == "category" and isinstance(val, str):
                val = val.strip().lower()
            setattr(ctype, key, val)

    if "benefit_type" not in update_dict or not update_dict.get("benefit_type"):
        resolved_bt, _ = FinancialGovernanceService.resolve_benefit_classification(
            ctype.category, ctype.funding_source, ctype.calculation_type, getattr(ctype, "benefit_type", None)
        )
        ctype.benefit_type = resolved_bt

    await db.commit()
    await db.refresh(ctype)
    return {"message": "Concession type updated successfully", "id": ctype.id}


@router.patch("/types/{type_id}/toggle-status")
async def toggle_concession_type_status(
    type_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("superadmin", "admin", "accountant", "principal")),
):
    ctype = await db.get(FeeConcessionType, type_id)
    if not ctype:
        raise HTTPException(status_code=404, detail="Concession type not found")
    check_institution_access(ctype.institution_id, current_user)
    ctype.is_active = not ctype.is_active
    await db.commit()
    await db.refresh(ctype)
    status_label = "active" if ctype.is_active else "inactive"
    return {
        "message": f"Concession scheme '{ctype.name}' is now {status_label}.",
        "id": ctype.id,
        "is_active": ctype.is_active,
    }


@router.delete("/types/{type_id}")
async def delete_concession_type(
    type_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("superadmin", "admin", "accountant", "principal")),
):
    ctype = await db.get(FeeConcessionType, type_id)
    if not ctype:
        raise HTTPException(status_code=404, detail="Concession type not found")
    check_institution_access(ctype.institution_id, current_user)

    # Anti-De-Linking & Ledger Immutability Rule:
    # Existing schemes should be deactivated or revised, not deleted,
    # so historical concession records retain their original terms.
    app_count = await db.scalar(
        select(func.count(StudentConcessionApplication.id)).where(
            StudentConcessionApplication.concession_type_id == type_id
        )
    )
    if app_count and app_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Concession scheme '{ctype.name}' cannot be deleted because {app_count} historical student application(s) reference it. In accordance with audit immutability governance, please deactivate or revise the scheme instead.",
        )

    await db.delete(ctype)
    await db.commit()
    return {"message": f"Concession scheme '{ctype.name}' deleted successfully."}


# ─── 2. ELIGIBILITY EVALUATION ENDPOINT ───────────────────────────────────────

@router.get("/evaluate/{student_id}/{type_id}")
async def evaluate_eligibility(
    student_id: int,
    type_id: int,
    academic_year_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    student = await db.get(Student, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    _authorize_concession_student_or_staff(student.id, student.institution_id, current_user)
    try:
        res = await ConcessionEligibilityService.evaluate_student_eligibility(
            db=db,
            student_id=student_id,
            concession_type_id=type_id,
            academic_year_id=academic_year_id,
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ─── 3. APPLICATIONS LIFECYCLE ENDPOINTS ──────────────────────────────────────

@router.get("/applications")
async def list_applications(
    student_id: Optional[int] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    concession_type_id: Optional[int] = None,
    academic_year_id: Optional[int] = None,
    funding_source: Optional[str] = None,
    benefit_type: Optional[str] = None,
    standard_id: Optional[int] = None,
    division_id: Optional[int] = None,
    search: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    inst_id = current_user.institution_id or 1
    role = (getattr(current_user, "role", "") or "").strip().lower()
    if role == "student":
        own_sid = getattr(current_user, "student_id", None)
        if not own_sid or (student_id is not None and student_id != own_sid):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access forbidden: Students may only view their own concession applications.",
            )
        student_id = own_sid
    elif not is_sysadmin(current_user) and role not in CONCESSION_STAFF_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
    query = (
        select(StudentConcessionApplication)
        .options(
            selectinload(StudentConcessionApplication.concession_type),
            selectinload(StudentConcessionApplication.student)
            .selectinload(Student.enrollments)
            .selectinload(StudentEnrollment.standard),
            selectinload(StudentConcessionApplication.invoice),
        )
        .where(StudentConcessionApplication.institution_id == inst_id)
    )

    if student_id:
        query = query.where(StudentConcessionApplication.student_id == student_id)
    if academic_year_id:
        query = query.where(StudentConcessionApplication.academic_year_id == academic_year_id)
    if status_filter and status_filter.lower() != "all":
        query = query.where(StudentConcessionApplication.status == status_filter.lower())
    if concession_type_id:
        query = query.where(StudentConcessionApplication.concession_type_id == concession_type_id)
    if funding_source and funding_source.lower() != "all":
        query = query.where(StudentConcessionApplication.funding_source == funding_source.lower())
    if benefit_type and benefit_type.lower() != "all":
        query = query.where(StudentConcessionApplication.benefit_type == benefit_type.lower())

    joined_student = False
    if standard_id or division_id:
        query = query.join(Student, Student.id == StudentConcessionApplication.student_id).join(
            StudentEnrollment,
            (StudentEnrollment.student_id == Student.id)
            & (StudentEnrollment.academic_year_id == StudentConcessionApplication.academic_year_id),
        )
        joined_student = True
        if standard_id:
            query = query.where(StudentEnrollment.standard_id == standard_id)
        if division_id:
            query = query.where(StudentEnrollment.division_id == division_id)

    if search and search.strip():
        term = f"%{search.strip()}%"
        if not joined_student:
            query = query.join(Student, Student.id == StudentConcessionApplication.student_id)
        query = query.where(
            or_(
                StudentConcessionApplication.application_number.ilike(term),
                Student.first_name.ilike(term),
                Student.last_name.ilike(term),
                Student.admission_number.ilike(term),
                StudentConcessionApplication.sponsor_name.ilike(term),
            )
        )

    query = query.order_by(desc(StudentConcessionApplication.created_at)).limit(limit).offset(offset)
    res = await db.execute(query)
    apps = res.scalars().all()

    result = []
    for a in apps:
        s_name = f"{a.student.first_name} {a.student.last_name}" if a.student else "Unknown"
        adm_no = a.student.admission_number if a.student else "—"
        std_name = "—"
        if a.student and a.student.enrollments:
            active_enr = next((e for e in a.student.enrollments if e.status == "active"), a.student.enrollments[0])
            if active_enr and active_enr.standard:
                std_name = active_enr.standard.name

        result.append({
            "id": a.id,
            "application_number": a.application_number,
            "student_id": a.student_id,
            "student_name": s_name,
            "admission_number": adm_no,
            "standard": std_name,
            "concession_type_id": a.concession_type_id,
            "concession_name": a.concession_type.name if a.concession_type else "Concession",
            "category": a.concession_type.category if a.concession_type else "general",
            "benefit_type": a.benefit_type,
            "waiver_scope": a.waiver_scope,
            "fee_category_id": a.fee_category_id,
            "requested_amount": float(a.requested_amount),
            "requested_percentage": float(a.requested_percentage) if a.requested_percentage else None,
            "approved_amount": float(a.approved_amount),
            "applied_amount": float(a.applied_amount),
            "reversed_amount": float(getattr(a, "reversed_amount", 0) or 0),
            "funding_source": a.funding_source,
            "sponsor_name": a.sponsor_name,
            "sponsor_sanctioned_amount": float(a.sponsor_sanctioned_amount) if a.sponsor_sanctioned_amount else None,
            "sponsor_received_amount": float(a.sponsor_received_amount),
            "sponsor_settlement_status": a.sponsor_settlement_status,
            "status": a.status,
            "applicant_type": a.applicant_type,
            "invoice_id": a.invoice_id,
            "invoice_number": a.invoice.invoice_number if a.invoice else None,
            "valid_until": a.valid_until.isoformat() if getattr(a, "valid_until", None) else None,
            "approval_remarks": a.approval_remarks,
            "rejection_reason": a.rejection_reason,
            "withdrawal_reason": a.withdrawal_reason,
            "cancellation_reason": getattr(a, "cancellation_reason", None),
            "supporting_document_url": a.supporting_document_url,
            "created_at": a.created_at.isoformat() if a.created_at else None,
            "approved_at": a.approved_at.isoformat() if a.approved_at else None,
        })

    return result


@router.post("/applications", status_code=status.HTTP_201_CREATED)
async def submit_application(
    payload: ConcessionApplicationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("superadmin", "admin", "accountant", "principal", "teacher", "staff")),
):
    can_nom = await has_permission(db, current_user, "concessions", "nominate")
    if not can_nom:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions: requires 'concessions:nominate' privilege.",
        )
    inst_id = current_user.institution_id or 1
    ay_id = payload.academic_year_id
    if not ay_id:
        ay_row = (await db.execute(select(AcademicYear).where(AcademicYear.is_active == True).order_by(desc(AcademicYear.id)))).scalars().first()
        ay_id = ay_row.id if ay_row else 1

    try:
        app = await ConcessionWorkflowService.submit_application(
            db=db,
            institution_id=inst_id,
            student_id=payload.student_id,
            concession_type_id=payload.concession_type_id,
            academic_year_id=ay_id,
            nominator=current_user,
            requested_amount=payload.requested_amount,
            requested_percentage=payload.requested_percentage,
            applicant_type=payload.applicant_type,
            sponsor_name=payload.sponsor_name,
            sponsor_reference=payload.sponsor_reference,
            sponsor_sanctioned_amount=payload.sponsor_sanctioned_amount,
            supporting_document_url=payload.supporting_document_url,
            remarks=payload.remarks,
            fee_category_id=payload.fee_category_id,
            valid_until=payload.valid_until,
            idempotency_key=payload.idempotency_key,
        )
        return {
            "message": "Concession application submitted successfully",
            "id": app.id,
            "application_number": app.application_number,
            "benefit_type": app.benefit_type,
            "waiver_scope": app.waiver_scope,
            "requested_amount": float(app.requested_amount),
            "status": app.status,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/applications/bulk", status_code=status.HTTP_201_CREATED)
async def submit_bulk_applications(
    payload: ConcessionBulkApplicationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("superadmin", "admin", "accountant", "principal")),
):
    can_nom = await has_permission(db, current_user, "concessions", "nominate")
    if not can_nom:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions: requires 'concessions:nominate' privilege.",
        )
    if payload.auto_approve:
        can_approve = await has_permission(db, current_user, "concessions", "approve")
        if not can_approve or current_user.role not in ("superadmin", "admin"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Segregation of Duties: Bulk auto-approval requires 'concessions:approve' privilege and superadmin/admin executive authority.",
            )

    inst_id = current_user.institution_id or 1
    ay_id = payload.academic_year_id
    if not ay_id:
        ay_row = (await db.execute(select(AcademicYear).where(AcademicYear.is_active == True).order_by(desc(AcademicYear.id)))).scalars().first()
        ay_id = ay_row.id if ay_row else 1

    created_apps = []
    errors = []

    for sid in payload.student_ids:
        try:
            app = await ConcessionWorkflowService.submit_application(
                db=db,
                institution_id=inst_id,
                student_id=sid,
                concession_type_id=payload.concession_type_id,
                academic_year_id=ay_id,
                nominator=current_user,
                requested_amount=payload.requested_amount,
                requested_percentage=payload.requested_percentage,
                applicant_type=payload.applicant_type,
                sponsor_name=payload.sponsor_name,
                sponsor_reference=payload.sponsor_reference,
                remarks=payload.remarks,
                fee_category_id=payload.fee_category_id,
                valid_until=payload.valid_until,
            )
            if payload.auto_approve:
                await ConcessionWorkflowService.approve_application(
                    db=db,
                    application_id=app.id,
                    approver=current_user,
                    approved_amount=app.requested_amount,
                    remarks=payload.remarks or "Bulk batch approval",
                    auto_apply=payload.auto_apply,
                )
            created_apps.append({
                "student_id": sid,
                "application_id": app.id,
                "application_number": app.application_number,
                "amount": float(app.requested_amount),
                "status": app.status,
            })
        except Exception as e:
            errors.append({"student_id": sid, "error": str(e)})

    return {
        "message": f"Processed {len(created_apps)} of {len(payload.student_ids)} bulk concession applications.",
        "successful_count": len(created_apps),
        "failed_count": len(errors),
        "applications": created_apps,
        "errors": errors,
    }


@router.get("/applications/{application_id}")
async def get_application_detail(
    application_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    app_res = await db.execute(
        select(StudentConcessionApplication)
        .options(
            selectinload(StudentConcessionApplication.concession_type),
            selectinload(StudentConcessionApplication.student),
            selectinload(StudentConcessionApplication.invoice),
            selectinload(StudentConcessionApplication.allocations),
        )
        .where(StudentConcessionApplication.id == application_id)
    )
    app = app_res.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    _authorize_concession_student_or_staff(app.student_id, app.institution_id, current_user)

    eligibility_parsed = None
    if app.eligibility_snapshot:
        try:
            eligibility_parsed = json.loads(app.eligibility_snapshot)
        except Exception:
            pass

    return {
        "id": app.id,
        "application_number": app.application_number,
        "student_id": app.student_id,
        "student_name": f"{app.student.first_name} {app.student.last_name}" if app.student else "Unknown",
        "admission_number": app.student.admission_number if app.student else "—",
        "concession_type_id": app.concession_type_id,
        "concession_name": app.concession_type.name if app.concession_type else "Concession",
        "category": app.concession_type.category if app.concession_type else "general",
        "benefit_type": app.benefit_type,
        "waiver_scope": app.waiver_scope,
        "fee_category_id": app.fee_category_id,
        "funding_source": app.funding_source,
        "sponsor_name": app.sponsor_name,
        "sponsor_reference": app.sponsor_reference,
        "sponsor_sanctioned_amount": float(app.sponsor_sanctioned_amount) if app.sponsor_sanctioned_amount else None,
        "sponsor_received_amount": float(app.sponsor_received_amount),
        "sponsor_settlement_status": app.sponsor_settlement_status,
        "requested_amount": float(app.requested_amount),
        "requested_percentage": float(app.requested_percentage) if app.requested_percentage else None,
        "approved_amount": float(app.approved_amount),
        "applied_amount": float(app.applied_amount),
        "reversed_amount": float(getattr(app, "reversed_amount", 0) or 0),
        "status": app.status,
        "applicant_type": app.applicant_type,
        "invoice_id": app.invoice_id,
        "invoice_number": app.invoice.invoice_number if app.invoice else None,
        "invoice_total": float(app.invoice.total_amount) if app.invoice else None,
        "invoice_net": float(app.invoice.net_amount) if app.invoice else None,
        "invoice_paid": float(app.invoice.paid_amount) if app.invoice else None,
        "invoice_outstanding": float(app.invoice.outstanding_amount) if app.invoice else None,
        "valid_until": app.valid_until.isoformat() if getattr(app, "valid_until", None) else None,
        "expired_at": app.expired_at.isoformat() if getattr(app, "expired_at", None) else None,
        "cancelled_at": app.cancelled_at.isoformat() if getattr(app, "cancelled_at", None) else None,
        "cancellation_reason": getattr(app, "cancellation_reason", None),
        "verification_notes": app.verification_notes,
        "approval_remarks": app.approval_remarks,
        "rejection_reason": app.rejection_reason,
        "withdrawal_reason": app.withdrawal_reason,
        "supporting_document_url": app.supporting_document_url,
        "eligibility_evaluation": eligibility_parsed,
        "allocations": [
            {
                "id": al.id,
                "transaction_ref": getattr(al, "transaction_ref", None),
                "transaction_type": getattr(al, "transaction_type", None),
                "posting_status": getattr(al, "posting_status", "posted"),
                "effective_date": al.effective_date.isoformat() if getattr(al, "effective_date", None) else None,
                "fee_category_id": getattr(al, "fee_category_id", None),
                "invoice_item_id": getattr(al, "invoice_item_id", None),
                "reversal_of_allocation_id": getattr(al, "reversal_of_allocation_id", None),
                "invoice_id": al.invoice_id,
                "allocated_amount": float(al.allocated_amount),
                "credit_adjustment_amount": float(al.credit_adjustment_amount),
                "allocated_at": al.allocated_at.isoformat(),
                "notes": al.notes,
            }
            for al in app.allocations
        ],
        "created_at": app.created_at.isoformat() if app.created_at else None,
        "approved_at": app.approved_at.isoformat() if app.approved_at else None,
    }


@router.post("/applications/{application_id}/verify")
async def verify_application(
    application_id: int,
    payload: ConcessionVerificationRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("superadmin", "admin", "accountant", "principal")),
):
    can_verify = await has_permission(db, current_user, "concessions", "verify")
    if not can_verify:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions: requires 'concessions:verify' privilege.",
        )
    await _authorize_application_tenant(db, application_id, current_user)
    try:
        app = await ConcessionWorkflowService.verify_application(
            db=db,
            application_id=application_id,
            verifier=current_user,
            notes=payload.notes,
            document_url=payload.supporting_document_url,
        )
        return {"message": "Application verified successfully", "status": app.status}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/applications/{application_id}/approve")
async def approve_application(
    application_id: int,
    payload: ConcessionApprovalRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("superadmin", "admin", "accountant", "principal")),
):
    can_approve = await has_permission(db, current_user, "concessions", "approve")
    if not can_approve:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions: requires 'concessions:approve' privilege.",
        )
    await _authorize_application_tenant(db, application_id, current_user)
    try:
        app = await ConcessionWorkflowService.approve_application(
            db=db,
            application_id=application_id,
            approver=current_user,
            approved_amount=payload.approved_amount,
            remarks=payload.remarks,
            auto_apply=payload.auto_apply,
        )
        msg = (
            f"Concession #{app.application_number} approved and applied successfully"
            if app.status == "applied"
            else f"Concession #{app.application_number} approved (pending invoice posting)"
        )
        return {
            "message": msg,
            "status": app.status,
            "approved_amount": float(app.approved_amount),
            "applied_amount": float(app.applied_amount),
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/applications/{application_id}/reject")
async def reject_application(
    application_id: int,
    payload: ConcessionRejectionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("superadmin", "admin", "accountant", "principal")),
):
    can_approve = await has_permission(db, current_user, "concessions", "approve")
    if not can_approve:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions: requires 'concessions:approve' privilege.",
        )
    await _authorize_application_tenant(db, application_id, current_user)
    try:
        app = await ConcessionWorkflowService.reject_application(
            db=db,
            application_id=application_id,
            user=current_user,
            rejection_reason=payload.rejection_reason,
        )
        return {"message": f"Concession #{app.application_number} rejected", "status": app.status}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/applications/{application_id}/apply")
async def apply_concession(
    application_id: int,
    payload: Optional[ConcessionApplyRequest] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("superadmin", "admin", "accountant", "principal")),
):
    can_apply = await has_permission(db, current_user, "concessions", "apply")
    if not can_apply:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions: requires 'concessions:apply' privilege.",
        )
    try:
        alloc = await ConcessionWorkflowService.apply_concession_to_invoice(
            db=db,
            application_id=application_id,
            user=current_user,
            allocation_amount=payload.allocation_amount if payload else None,
            invoice_item_id=payload.invoice_item_id if payload else None,
        )
        await db.commit()
        return {
            "message": "Concession applied to invoice successfully",
            "allocation_id": alloc.id,
            "transaction_ref": getattr(alloc, "transaction_ref", None),
            "transaction_type": getattr(alloc, "transaction_type", None),
            "allocated_amount": float(alloc.allocated_amount),
            "credit_adjustment_amount": float(alloc.credit_adjustment_amount),
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/applications/{application_id}/withdraw")
async def withdraw_application(
    application_id: int,
    payload: ConcessionWithdrawalRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("superadmin", "admin", "accountant", "principal")),
):
    can_act = (
        await has_permission(db, current_user, "concessions", "reverse")
        or await has_permission(db, current_user, "concessions", "cancel")
        or await has_permission(db, current_user, "concessions", "approve")
    )
    if not can_act:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to withdraw concession application.",
        )
    try:
        app = await ConcessionWorkflowService.withdraw_application(
            db=db,
            application_id=application_id,
            user=current_user,
            withdrawal_reason=payload.withdrawal_reason,
        )
        return {
            "message": f"Concession #{app.application_number} withdrawn",
            "status": app.status,
            "reversed_amount": float(getattr(app, "reversed_amount", 0) or 0),
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/applications/{application_id}/reverse")
async def reverse_concession(
    application_id: int,
    payload: ConcessionReversalRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("superadmin", "admin", "accountant", "principal")),
):
    can_reverse = await has_permission(db, current_user, "concessions", "reverse")
    if not can_reverse:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions: requires 'concessions:reverse' privilege.",
        )
    try:
        app = await ConcessionWorkflowService.reverse_concession(
            db=db,
            application_id=application_id,
            user=current_user,
            reversal_reason=payload.reversal_reason,
        )
        return {
            "message": f"Concession #{app.application_number} reversed immutably and invoice ledger restored.",
            "status": app.status,
            "reversed_amount": float(getattr(app, "reversed_amount", 0) or 0),
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/applications/{application_id}/cancel")
async def cancel_application(
    application_id: int,
    payload: ConcessionCancellationRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("superadmin", "admin", "accountant", "principal")),
):
    can_cancel = await has_permission(db, current_user, "concessions", "cancel")
    if not can_cancel:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions: requires 'concessions:cancel' privilege.",
        )
    try:
        app = await ConcessionWorkflowService.cancel_application(
            db=db,
            application_id=application_id,
            user=current_user,
            cancellation_reason=payload.cancellation_reason,
        )
        return {
            "message": f"Concession #{app.application_number} cancelled.",
            "status": app.status,
            "reversed_amount": float(getattr(app, "reversed_amount", 0) or 0),
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/expire-stale")
async def expire_stale_applications(
    institution_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("superadmin", "admin", "accountant", "principal")),
):
    can_apply = await has_permission(db, current_user, "concessions", "apply")
    if not can_apply:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions: requires 'concessions:apply' privilege.",
        )
    inst_id = institution_id or current_user.institution_id or 1
    expired_count = await ConcessionWorkflowService.expire_stale_applications(
        db=db, institution_id=inst_id, user=current_user
    )
    return {
        "message": f"Processed expiry scan: {expired_count} benefit(s) marked expired.",
        "expired_count": expired_count,
    }


@router.post("/applications/{application_id}/sponsor-settlement", status_code=status.HTTP_201_CREATED)
async def record_sponsor_settlement(
    application_id: int,
    payload: SponsorSettlementCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("superadmin", "admin", "accountant", "principal")),
):
    can_settle = await has_permission(db, current_user, "concessions", "sponsor_settle")
    if not can_settle:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions: requires 'concessions:sponsor_settle' privilege.",
        )
    try:
        settlement = await ConcessionWorkflowService.record_sponsor_settlement(
            db=db,
            application_id=application_id,
            user=current_user,
            amount=payload.amount,
            received_date=payload.received_date or date.today(),
            payment_method=payload.payment_method,
            reference_number=payload.reference_number,
            remarks=payload.remarks,
        )
        return {
            "message": f"Sponsor settlement {settlement.settlement_ref} recorded successfully.",
            "id": settlement.id,
            "settlement_ref": settlement.settlement_ref,
            "amount": float(settlement.amount),
            "received_date": settlement.received_date.isoformat(),
            "status": settlement.status,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ─── 4. ANALYTICS, GOVERNANCE SUMMARY, RECONCILIATION & TRACEABILITY ──────────

@router.get("/analytics")
async def get_concession_analytics(
    institution_id: Optional[int] = None,
    academic_year_id: Optional[int] = None,
    standard_id: Optional[int] = None,
    division_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*CONCESSION_STAFF_ROLES)),
):
    if institution_id is not None:
        check_institution_access(institution_id, current_user)
    inst_id = institution_id or current_user.institution_id or 1
    ay_id = academic_year_id
    if not ay_id:
        ay_row = (await db.execute(select(AcademicYear).where(AcademicYear.is_active == True).order_by(desc(AcademicYear.id)))).scalars().first()
        ay_id = ay_row.id if ay_row else 1

    flt = FinancialFilter(
        institution_id=inst_id,
        academic_year_id=ay_id,
        standard_id=standard_id,
        division_id=division_id,
    )
    gov = await FinancialGovernanceService.get_governed_summary(db, flt)
    fin = gov["financials"]
    cnt = gov["counts"]
    spon = gov["sponsors"]

    approved_count = (
        await db.scalar(
            select(func.count(StudentConcessionApplication.id)).where(
                StudentConcessionApplication.institution_id == inst_id,
                StudentConcessionApplication.academic_year_id == ay_id,
                StudentConcessionApplication.status.in_(["approved", "applied", "partially_applied"]),
            )
        )
    ) or 0

    return {
        "academic_year_id": ay_id,
        "total_concessions_awarded": fin["approved_concessions_total"],
        "total_concessions_applied": fin["posted_concessions_total"],
        "total_requested_amount": gov["lifecycle"]["requested"],
        "pending_applications_count": cnt["pending_approvals"],
        "approved_applications_count": int(approved_count),
        "rejected_applications_count": cnt["rejected_benefits"] if "rejected_benefits" in cnt else cnt["rejected_applications"],
        "total_beneficiary_students": cnt["beneficiary_students"],
        "external_sponsors": {
            "total_sanctioned": spon["total_sanctioned"],
            "total_received": spon["total_received"],
            "pending_receivable": spon["outstanding_sponsor_funding"],
        },
        "governance": gov,
    }


@router.get("/governance-summary")
async def get_governance_summary(
    institution_id: Optional[int] = None,
    academic_year_id: Optional[int] = None,
    standard_id: Optional[int] = None,
    division_id: Optional[int] = None,
    student_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    funding_source: Optional[str] = None,
    benefit_type: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = None,
    include_breakdowns: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*CONCESSION_STAFF_ROLES)),
):
    if institution_id is not None:
        check_institution_access(institution_id, current_user)
    inst_id = institution_id or current_user.institution_id or 1
    flt = FinancialFilter(
        institution_id=inst_id,
        academic_year_id=academic_year_id,
        standard_id=standard_id,
        division_id=division_id,
        student_id=student_id,
        start_date=start_date,
        end_date=end_date,
        funding_source=funding_source if funding_source != "all" else None,
        benefit_type=benefit_type if benefit_type != "all" else None,
        status=status_filter if status_filter != "all" else None,
        search=search,
    )
    summary = await FinancialGovernanceService.get_governed_summary(db, flt)
    if include_breakdowns:
        summary["fee_management_breakdown"] = await FinancialGovernanceService.get_fee_management_concession_breakdown(db, flt)
        summary["academic_distribution"] = await FinancialGovernanceService.get_academic_concession_distribution(db, flt)
    return summary


@router.get("/reconciliation")
async def get_concession_reconciliation(
    institution_id: Optional[int] = None,
    academic_year_id: Optional[int] = None,
    standard_id: Optional[int] = None,
    division_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*CONCESSION_REPORT_ROLES)),
):
    can_rep = await has_permission(db, current_user, "concessions", "reports")
    if not can_rep and current_user.role not in ("superadmin", "admin", "accountant", "principal"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions: requires 'concessions:reports' privilege.",
        )
    if institution_id is not None:
        check_institution_access(institution_id, current_user)
    inst_id = institution_id or current_user.institution_id or 1
    flt = FinancialFilter(
        institution_id=inst_id,
        academic_year_id=academic_year_id,
        standard_id=standard_id,
        division_id=division_id,
    )
    return await FinancialGovernanceService.reconcile_financial_ledgers(db, flt)


@router.get("/trace/{entity_type}/{entity_id}")
async def get_transaction_trace(
    entity_type: str,
    entity_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*CONCESSION_REPORT_ROLES)),
):
    if entity_type not in ("application", "allocation", "invoice", "student"):
        raise HTTPException(
            status_code=400,
            detail="Invalid trace entity_type. Allowed: 'application', 'allocation', 'invoice', 'student'.",
        )
    if not is_sysadmin(current_user):
        target_inst_id = None
        if entity_type == "student":
            stu = await db.get(Student, entity_id)
            target_inst_id = stu.institution_id if stu else None
        elif entity_type == "application":
            app_obj = await db.get(StudentConcessionApplication, entity_id)
            target_inst_id = app_obj.institution_id if app_obj else None
        elif entity_type == "allocation":
            alloc = await db.get(FeeConcessionAllocation, entity_id)
            if alloc:
                app_obj = await db.get(StudentConcessionApplication, alloc.application_id)
                target_inst_id = app_obj.institution_id if app_obj else None
        elif entity_type == "invoice":
            inv = await db.get(FeeInvoice, entity_id)
            if inv:
                stu = await db.get(Student, inv.student_id)
                target_inst_id = stu.institution_id if stu else None
        check_institution_access(target_inst_id, current_user)
    return await FinancialGovernanceService.trace_transaction_chain(db, entity_type, entity_id)


# ─── 5. SANCTION LETTER METADATA ENDPOINT ─────────────────────────────────────

@router.get("/applications/{application_id}/letter")
async def get_award_letter_data(
    application_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    app_res = await db.execute(
        select(StudentConcessionApplication)
        .options(
            selectinload(StudentConcessionApplication.concession_type),
            selectinload(StudentConcessionApplication.student),
            selectinload(StudentConcessionApplication.invoice),
        )
        .where(StudentConcessionApplication.id == application_id)
    )
    app = app_res.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    _authorize_concession_student_or_staff(app.student_id, app.institution_id, current_user)

    student = app.student
    return {
        "letter_reference": f"SANCTION-{app.application_number}",
        "issue_date": (app.approved_at or app.created_at).strftime("%d %b %Y"),
        "student": {
            "id": student.id,
            "name": f"{student.first_name} {student.last_name}",
            "admission_number": student.admission_number,
            "address": student.address or "Malad West, Mumbai",
            "phone": student.phone or "—",
        },
        "scholarship": {
            "application_number": app.application_number,
            "scheme_name": app.concession_type.name if app.concession_type else "Concession",
            "category": app.concession_type.category if app.concession_type else "general",
            "funding_source": app.funding_source,
            "sponsor_name": app.sponsor_name or "Prashant Academy Educational Trust",
            "sanctioned_amount": float(app.approved_amount or app.requested_amount),
            "status": app.status.upper(),
            "approval_remarks": app.approval_remarks or "Granted under meritorious academic achievement guidelines",
        },
        "financial_reconciliation": {
            "original_gross_fee": float(app.invoice.total_amount) if app.invoice else 0.0,
            "concession_amount": float(app.approved_amount or app.requested_amount),
            "revised_net_fee": float(app.invoice.net_amount) if app.invoice else 0.0,
            "paid_amount": float(app.invoice.paid_amount) if app.invoice else 0.0,
            "outstanding_balance": float(app.invoice.outstanding_amount) if app.invoice else 0.0,
        },
        "signatory": {
            "title": "Director / Academic Board",
            "designation": "Prashant Academy Coaching Institute",
        },
    }

