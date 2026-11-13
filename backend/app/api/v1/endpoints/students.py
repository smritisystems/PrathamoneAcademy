# /**
#  * @file        students.py
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
#  * @updated     2026-11-13
#  *
#  * @description API endpoints for student CRUD, profile editing, guardian details, and identity documents.
#  */

import json
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_, desc
from sqlalchemy.orm import selectinload
from typing import Optional, List, Dict, Any
from app.core.database import get_db
from app.core.deps import (
    get_current_active_user,
    require_role,
    enforce_institution_access,
    check_institution_access,
    is_sysadmin,
)
from app.services.settings_service import get_institution_setting
from app.models.student import Student, Guardian, StudentLifecycleLog
from app.models.enrollment import StudentEnrollment
from app.models.fee import (
    FeeInvoice,
    FeeInstallment,
    FeeInvoiceItem,
    FeeConcessionType,
    StudentConcessionApplication,
    FeeConcessionAllocation,
)
from app.models.payment import Payment, PaymentAllocation, PaymentReceipt, Refund
from app.services.financial_governance_service import FinancialGovernanceService, FinancialFilter
from app.models.standard import Standard
from app.models.division import Division
from app.models.board import Board
from app.models.subject import Subject
from app.models.academic_year import AcademicYear
from app.models.attendance import Attendance
from app.models.exam import Examination, ExamMark
from app.models.portal import StudentDocument, TimetableEntry
from app.models.user import User, AuditLog
from app.models.communication import CommunicationLog
from app.models.crm import Lead
from pydantic import BaseModel, Field
from datetime import date
from decimal import Decimal

router = APIRouter()


class GuardianCreate(BaseModel):
    relation: str
    first_name: str
    last_name: str
    occupation: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    aadhar_number: Optional[str] = None
    annual_income: Optional[float] = None
    is_primary: bool = False


class StudentCreate(BaseModel):
    institution_id: Optional[int] = None
    admission_number: Optional[str] = None
    first_name: str
    last_name: str
    middle_name: Optional[str] = None
    date_of_birth: date
    gender: str
    blood_group: Optional[str] = None
    nationality: str = "Indian"
    religion: Optional[str] = None
    caste: Optional[str] = None
    aadhar_number: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    admission_date: date
    guardians: List[GuardianCreate] = []
    guardian: Optional[Dict[str, Any]] = None
    standard_id: Optional[int] = None
    division_id: Optional[int] = None
    academic_year_id: Optional[int] = None


class GuardianUpdate(BaseModel):
    id: Optional[int] = None
    relation: str
    first_name: str
    last_name: str
    occupation: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    aadhar_number: Optional[str] = None
    annual_income: Optional[float] = None
    is_primary: bool = False


class EnrollmentUpdate(BaseModel):
    standard_id: Optional[int] = None
    division_id: Optional[int] = None
    roll_number: Optional[str] = None
    status: Optional[str] = None
    remarks: Optional[str] = None


class StudentUpdate(BaseModel):
    # Personal & Identity
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    middle_name: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    nationality: Optional[str] = None
    religion: Optional[str] = None
    caste: Optional[str] = None
    aadhar_number: Optional[str] = None
    photo_url: Optional[str] = None
    admission_date: Optional[date] = None
    is_active: Optional[bool] = None

    # Contact & Address
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None

    # Guardians
    guardians: Optional[List[GuardianUpdate]] = None

    # Academic & Batch Assignment
    enrollment: Optional[EnrollmentUpdate] = None
    transfer_reason: Optional[str] = None


class EnrollmentCreate(BaseModel):
    academic_year_id: int
    standard_id: int
    division_id: Optional[int] = None
    roll_number: Optional[str] = None
    enrollment_date: date


class StudentExitRequest(BaseModel):
    enrollment_id: Optional[int] = None
    status: str = "withdrawn"  # "withdrawn", "inactive", "completed", "transferred"
    exit_date: date = Field(default_factory=date.today)
    reason: str = Field(min_length=2, max_length=100)
    notes: Optional[str] = None
    refund_amount: Optional[Decimal] = None
    refund_method: Optional[str] = "bank_transfer"
    refund_reference: Optional[str] = None
    refund_reason: Optional[str] = None


class StudentReactivateRequest(BaseModel):
    academic_year_id: Optional[int] = None
    standard_id: Optional[int] = None
    division_id: Optional[int] = None
    effective_date: date = Field(default_factory=date.today)
    reason: Optional[str] = "Student re-enrolled"
    notes: Optional[str] = None


STUDENT_READ_ROLES = (
    "superadmin",
    "sysadmin",
    "super_admin",
    "admin",
    "principal",
    "teacher",
    "accountant",
    "staff",
    "counselor",
    "counsellor",
    "receptionist",
    "coordinator",
)


def _authorize_student_read(student_id: int, student_inst_id: Optional[int], current_user) -> None:
    """Enforces role/self ownership and tenant scoping for student record reads."""
    role = (getattr(current_user, "role", "") or "").strip().lower()
    if role == "student":
        if getattr(current_user, "student_id", None) != student_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access forbidden: Students can only view their own profile.",
            )
    elif not is_sysadmin(current_user) and role not in STUDENT_READ_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
    check_institution_access(student_inst_id, current_user)


@router.get("/")
async def list_students(
    standard_id: Optional[int] = None,
    division_id: Optional[int] = None,
    academic_year_id: Optional[int] = None,
    search: Optional[str] = None,
    include_inactive: Optional[bool] = Query(default=None),
    status: Optional[str] = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, le=100),
    effective_inst_id: int = Depends(enforce_institution_access),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role(*STUDENT_READ_ROLES)),
):
    query = select(Student)

    if effective_inst_id:
        query = query.where(Student.institution_id == effective_inst_id)

    # Resolve student visibility mode from settings or explicit user query override
    user_inst_id = effective_inst_id or getattr(current_user, "institution_id", None) or 1
    configured_list_mode = await get_institution_setting(
        db, user_inst_id, "admission", "student_visibility_lists", "active_only"
    )

    # Active / Inactive / Status Filtering
    if status:
        stat_lower = status.strip().lower()
        if stat_lower == "active":
            query = query.where(Student.is_active == True)
        elif stat_lower == "inactive":
            query = query.where(Student.is_active == False)
        elif stat_lower == "withdrawn":
            query = query.where(
                or_(
                    and_(Student.is_active == False, Student.exit_date.isnot(None)),
                    Student.enrollments.any(StudentEnrollment.status == "withdrawn"),
                )
            )
        elif stat_lower == "completed":
            query = query.where(Student.enrollments.any(StudentEnrollment.status == "completed"))
        elif stat_lower == "graduated":
            query = query.where(Student.enrollments.any(StudentEnrollment.status == "graduated"))
        elif stat_lower in ("all", "include_all"):
            pass  # preserve full list
        else:
            query = query.where(Student.enrollments.any(StudentEnrollment.status == stat_lower))
    elif include_inactive is not None:
        if not include_inactive:
            query = query.where(Student.is_active == True)
        # include_inactive == True preserves all students
    else:
        # Default behavior driven by institute settings
        if configured_list_mode != "include_all":
            query = query.where(Student.is_active == True)

    if search:
        query = query.where(
            or_(
                Student.first_name.ilike(f"%{search}%"),
                Student.last_name.ilike(f"%{search}%"),
                Student.admission_number.ilike(f"%{search}%"),
                Student.phone.ilike(f"%{search}%"),
            )
        )

    if standard_id or division_id or academic_year_id:
        query = query.join(
            StudentEnrollment, Student.id == StudentEnrollment.student_id
        )
        if standard_id:
            query = query.where(StudentEnrollment.standard_id == standard_id)
        if division_id:
            query = query.where(StudentEnrollment.division_id == division_id)
        if academic_year_id:
            query = query.where(
                StudentEnrollment.academic_year_id == academic_year_id
            )

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    offset = (page - 1) * page_size
    result = await db.execute(
        query.offset(offset)
        .limit(page_size)
        .order_by(Student.first_name)
        .distinct()
    )
    students = result.scalars().all()

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "configured_visibility": configured_list_mode,
        "effective_status": status or ("all" if include_inactive or configured_list_mode == "include_all" else "active"),
        "data": [
            {
                "id": s.id,
                "admission_number": s.admission_number,
                "first_name": s.first_name,
                "last_name": s.last_name,
                "middle_name": s.middle_name,
                "gender": s.gender,
                "date_of_birth": str(s.date_of_birth),
                "phone": s.phone,
                "email": s.email,
                "admission_date": str(s.admission_date),
                "city": s.city,
                "is_active": s.is_active,
                "exit_date": str(s.exit_date) if s.exit_date else None,
                "exit_reason": s.exit_reason,
                "exit_notes": s.exit_notes,
            }
            for s in students
        ],
    }


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_student(
    data: StudentCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("superadmin", "admin", "principal", "staff")),
):
    user_inst_id = getattr(current_user, "institution_id", None) or 1
    if not is_sysadmin(current_user):
        if data.institution_id is not None and data.institution_id != user_inst_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access forbidden: You cannot create students outside your assigned institution.",
            )
        data.institution_id = user_inst_id
    elif not data.institution_id:
        data.institution_id = user_inst_id

    # Auto-generate admission_number if missing
    if not data.admission_number:
        adm_year = data.admission_date.year if data.admission_date else 2026
        prefix = f"PA-{adm_year}-"
        count_stmt = select(func.count(Student.id)).where(Student.institution_id == data.institution_id)
        inst_count = (await db.execute(count_stmt)).scalar() or 0
        seq = inst_count + 1
        candidate_adm = f"{prefix}{seq:06d}"
        while (await db.execute(select(Student.id).where(Student.admission_number == candidate_adm))).scalar_one_or_none():
            seq += 1
            candidate_adm = f"{prefix}{seq:06d}"
        data.admission_number = candidate_adm
    else:
        existing = await db.execute(
            select(Student).where(Student.admission_number == data.admission_number)
        )
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=400, detail="Admission number already exists"
            )

    guardians_data = list(data.guardians)
    if not guardians_data and data.guardian:
        g = data.guardian
        guardians_data.append(
            GuardianCreate(
                relation=g.get("relationship") or g.get("relation") or "Father",
                first_name=g.get("first_name") or (g.get("full_name", "").split()[0] if g.get("full_name") else "Guardian"),
                last_name=g.get("last_name") or (" ".join(g.get("full_name", "").split()[1:]) if g.get("full_name") and len(g.get("full_name", "").split()) > 1 else "Parent"),
                phone=g.get("phone"),
                email=g.get("email"),
                occupation=g.get("occupation"),
                annual_income=g.get("annual_income"),
                is_primary=True,
            )
        )

    student_data = data.model_dump(exclude={"guardians", "guardian", "standard_id", "division_id", "academic_year_id"})
    student = Student(**student_data)
    db.add(student)
    await db.flush()

    for g_data in guardians_data:
        guardian = Guardian(student_id=student.id, **g_data.model_dump())
        db.add(guardian)

    # Initial enrollment if standard and academic year provided
    if data.standard_id and data.academic_year_id:
        enrollment = StudentEnrollment(
            student_id=student.id,
            academic_year_id=data.academic_year_id,
            standard_id=data.standard_id,
            division_id=data.division_id,
            enrollment_date=data.admission_date,
            status="active",
        )
        db.add(enrollment)

    await db.commit()
    await db.refresh(student)
    return {
        "id": student.id,
        "admission_number": student.admission_number,
        "first_name": student.first_name,
        "last_name": student.last_name,
    }


@router.get("/batch/id-cards")
async def get_batch_student_id_cards(
    standard_id: Optional[int] = None,
    division_id: Optional[int] = None,
    effective_inst_id: int = Depends(enforce_institution_access),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role(*STUDENT_READ_ROLES)),
):
    """Generates printable ID card datasets with SVG QR codes for a batch of students."""
    from app.services.id_card import get_batch_id_card_data
    cards = await get_batch_id_card_data(
        db=db,
        institution_id=effective_inst_id,
        standard_id=standard_id,
        division_id=division_id,
    )
    return {"count": len(cards), "cards": cards}


@router.get("/{student_id}")
async def get_student(
    student_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    result = await db.execute(
        select(Student)
        .options(
            selectinload(Student.guardians),
            selectinload(Student.enrollments),
        )
        .where(Student.id == student_id)
    )
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    _authorize_student_read(student_id, student.institution_id, current_user)

    fee_result = await db.execute(
        select(
            func.coalesce(func.sum(FeeInvoice.net_amount), 0).label("total_fees"),
            func.coalesce(func.sum(FeeInvoice.paid_amount), 0).label("total_paid"),
            func.coalesce(func.sum(FeeInvoice.outstanding_amount), 0).label(
                "outstanding"
            ),
        ).where(FeeInvoice.student_id == student_id)
    )
    fee_summary = fee_result.one()

    return {
        "id": student.id,
        "admission_number": student.admission_number,
        "first_name": student.first_name,
        "last_name": student.last_name,
        "middle_name": student.middle_name,
        "date_of_birth": str(student.date_of_birth),
        "gender": student.gender,
        "blood_group": student.blood_group,
        "nationality": student.nationality,
        "religion": student.religion,
        "caste": student.caste,
        "aadhar_number": student.aadhar_number,
        "address": student.address,
        "city": student.city,
        "state": student.state,
        "pincode": student.pincode,
        "phone": student.phone,
        "email": student.email,
        "admission_date": str(student.admission_date),
        "is_active": student.is_active,
        "exit_date": str(student.exit_date) if student.exit_date else None,
        "exit_reason": student.exit_reason,
        "exit_notes": student.exit_notes,
        "guardians": [
            {
                "id": g.id,
                "relation": g.relation,
                "first_name": g.first_name,
                "last_name": g.last_name,
                "phone": g.phone,
                "email": g.email,
                "occupation": g.occupation,
                "is_primary": g.is_primary,
            }
            for g in student.guardians
        ],
        "enrollments": [
            {
                "id": e.id,
                "academic_year_id": e.academic_year_id,
                "standard_id": e.standard_id,
                "division_id": e.division_id,
                "roll_number": e.roll_number,
                "status": e.status,
                "enrollment_date": str(e.enrollment_date),
                "exit_date": str(e.exit_date) if e.exit_date else None,
                "exit_reason": e.exit_reason,
                "exit_notes": e.exit_notes,
            }
            for e in student.enrollments
        ],
        "fee_summary": {
            "total_fees": float(fee_summary.total_fees),
            "total_paid": float(fee_summary.total_paid),
            "outstanding": float(fee_summary.outstanding),
        },
    }


@router.get("/{student_id}/id-card")
async def get_student_id_card(
    student_id: int,
    effective_inst_id: int = Depends(enforce_institution_access),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """Generates official student ID card data with SVG QR code for thermal/PVC printing."""
    student = await db.get(Student, student_id)
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student #{student_id} not found or does not belong to this institution.",
        )
    _authorize_student_read(student_id, student.institution_id, current_user)
    from app.services.id_card import get_student_id_card_data
    card = await get_student_id_card_data(
        db=db, student_id=student_id, institution_id=student.institution_id or effective_inst_id
    )
    if not card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student #{student_id} not found or does not belong to this institution.",
        )
    return card


@router.put("/{student_id}")
@router.put("/{student_id}/profile")
async def update_student_profile(
    student_id: int,
    data: StudentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("superadmin", "admin", "principal")),
):
    result = await db.execute(
        select(Student)
        .options(
            selectinload(Student.guardians),
            selectinload(Student.enrollments),
        )
        .where(Student.id == student_id)
    )
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    check_institution_access(student.institution_id, current_user)

    # Capture snapshot of old state for audit
    old_state = {
        "first_name": student.first_name,
        "last_name": student.last_name,
        "middle_name": student.middle_name,
        "date_of_birth": str(student.date_of_birth) if student.date_of_birth else None,
        "gender": student.gender,
        "blood_group": student.blood_group,
        "nationality": student.nationality,
        "religion": student.religion,
        "caste": student.caste,
        "aadhar_number": student.aadhar_number,
        "photo_url": student.photo_url,
        "address": student.address,
        "city": student.city,
        "state": student.state,
        "pincode": student.pincode,
        "phone": student.phone,
        "email": student.email,
        "admission_date": str(student.admission_date) if student.admission_date else None,
        "is_active": student.is_active,
        "guardians": [
            {
                "id": g.id,
                "relation": g.relation,
                "first_name": g.first_name,
                "last_name": g.last_name,
                "phone": g.phone,
                "email": g.email,
                "occupation": g.occupation,
                "aadhar_number": g.aadhar_number,
                "annual_income": g.annual_income,
                "is_primary": g.is_primary,
            }
            for g in student.guardians
        ],
    }

    diff_changes = {}

    # 1. Update master scalar fields
    master_fields = [
        "first_name", "last_name", "middle_name", "date_of_birth", "gender",
        "blood_group", "nationality", "religion", "caste", "aadhar_number",
        "photo_url", "address", "city", "state", "pincode", "phone", "email",
        "admission_date", "is_active",
    ]
    for fld in master_fields:
        val = getattr(data, fld)
        if val is not None:
            curr_val = getattr(student, fld)
            if curr_val != val:
                diff_changes[fld] = {"old": str(curr_val), "new": str(val)}
                setattr(student, fld, val)

    # 2. Update Guardians if provided
    if data.guardians is not None:
        existing_guardians = {g.id: g for g in student.guardians if g.id}
        retained_ids = set()
        guardian_changes = []

        for g_in in data.guardians:
            if g_in.id and g_in.id in existing_guardians:
                g = existing_guardians[g_in.id]
                retained_ids.add(g.id)
                g.relation = g_in.relation
                g.first_name = g_in.first_name
                g.last_name = g_in.last_name
                g.phone = g_in.phone
                g.email = g_in.email
                g.occupation = g_in.occupation
                g.aadhar_number = g_in.aadhar_number
                g.annual_income = g_in.annual_income
                g.is_primary = g_in.is_primary
                guardian_changes.append({"action": "updated", "id": g.id, "name": f"{g.first_name} {g.last_name}"})
            else:
                new_g = Guardian(
                    student_id=student.id,
                    relation=g_in.relation,
                    first_name=g_in.first_name,
                    last_name=g_in.last_name,
                    phone=g_in.phone,
                    email=g_in.email,
                    occupation=g_in.occupation,
                    aadhar_number=g_in.aadhar_number,
                    annual_income=g_in.annual_income,
                    is_primary=g_in.is_primary,
                )
                db.add(new_g)
                guardian_changes.append({"action": "added", "name": f"{new_g.first_name} {new_g.last_name}"})

        for g in list(student.guardians):
            if g.id and g.id not in retained_ids:
                guardian_changes.append({"action": "removed", "id": g.id, "name": f"{g.first_name} {g.last_name}"})
                await db.delete(g)

        if guardian_changes:
            diff_changes["guardians"] = guardian_changes

    # 3. Update Enrollment / Batch
    is_batch_transfer = False
    if data.enrollment is not None:
        active_enr = next((e for e in student.enrollments if e.status == "active"), None)
        if not active_enr and student.enrollments:
            active_enr = sorted(student.enrollments, key=lambda e: e.id, reverse=True)[0]

        if active_enr:
            if data.enrollment.standard_id is not None and data.enrollment.standard_id != active_enr.standard_id:
                diff_changes["standard_id"] = {"old": active_enr.standard_id, "new": data.enrollment.standard_id}
                active_enr.standard_id = data.enrollment.standard_id
                is_batch_transfer = True

            if data.enrollment.division_id is not None and data.enrollment.division_id != active_enr.division_id:
                diff_changes["division_id"] = {"old": active_enr.division_id, "new": data.enrollment.division_id}
                active_enr.division_id = data.enrollment.division_id
                is_batch_transfer = True

            if data.enrollment.roll_number is not None and data.enrollment.roll_number != active_enr.roll_number:
                diff_changes["roll_number"] = {"old": active_enr.roll_number, "new": data.enrollment.roll_number}
                active_enr.roll_number = data.enrollment.roll_number

            if data.enrollment.status is not None and data.enrollment.status != active_enr.status:
                diff_changes["enrollment_status"] = {"old": active_enr.status, "new": data.enrollment.status}
                active_enr.status = data.enrollment.status

            if data.enrollment.remarks is not None:
                active_enr.remarks = data.enrollment.remarks
            elif data.transfer_reason and is_batch_transfer:
                cur_rem = active_enr.remarks or ""
                active_enr.remarks = f"{cur_rem} | Batch Transfer: {data.transfer_reason}".strip(" |")
        elif data.enrollment.standard_id is not None:
            # Create active enrollment if none existed
            ay_res = await db.execute(
                select(AcademicYear).where(AcademicYear.institution_id == student.institution_id, AcademicYear.is_current == True)
            )
            ay = ay_res.scalar_one_or_none()
            if not ay:
                ay = await db.scalar(select(AcademicYear).where(AcademicYear.institution_id == student.institution_id).order_by(desc(AcademicYear.id)))

            if ay:
                new_enr = StudentEnrollment(
                    student_id=student.id,
                    academic_year_id=ay.id,
                    standard_id=data.enrollment.standard_id,
                    division_id=data.enrollment.division_id,
                    roll_number=data.enrollment.roll_number,
                    enrollment_date=date.today(),
                    status=data.enrollment.status or "active",
                    remarks=data.enrollment.remarks or data.transfer_reason,
                )
                db.add(new_enr)
                diff_changes["enrollment"] = {"action": "created", "standard_id": data.enrollment.standard_id, "division_id": data.enrollment.division_id}

    # 4. Record Audit Log
    action = "batch_transfer" if is_batch_transfer else "student_profile_updated"
    audit_log = AuditLog(
        user_id=current_user.id,
        action=action,
        resource_type="student",
        resource_id=student.id,
        old_data=json.dumps(old_state, default=str),
        new_data=json.dumps(
            {
                "updated_by": current_user.username,
                "admin_name": f"{current_user.first_name} {current_user.last_name}",
                "changes": diff_changes,
                "transfer_reason": data.transfer_reason if is_batch_transfer else None,
            },
            default=str,
        ),
    )
    db.add(audit_log)

    await db.commit()
    await db.refresh(student)

    # Apply homework late-joiner policy if student was newly enrolled or transferred batch
    if is_batch_transfer or "enrollment" in diff_changes:
        try:
            enr_obj = await db.scalar(
                select(StudentEnrollment).where(
                    StudentEnrollment.student_id == student.id,
                    StudentEnrollment.status == "active",
                ).order_by(desc(StudentEnrollment.id))
            )
            if enr_obj:
                from app.services.homework_service import HomeworkService
                await HomeworkService.apply_late_joiner_policy_for_enrollment(db, enr_obj, current_user)
        except Exception:
            pass

    return {
        "message": "Student profile updated successfully",
        "id": student_id,
        "action": action,
        "changes": diff_changes,
    }


@router.post("/{student_id}/enroll", status_code=status.HTTP_201_CREATED)
async def enroll_student(
    student_id: int,
    data: EnrollmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("superadmin", "admin", "principal", "staff")),
):
    result = await db.execute(
        select(Student).where(Student.id == student_id)
    )
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    check_institution_access(student.institution_id, current_user)

    enrollment = StudentEnrollment(student_id=student_id, **data.model_dump())
    db.add(enrollment)
    await db.commit()
    await db.refresh(enrollment)
    try:
        from app.services.homework_service import HomeworkService
        await HomeworkService.apply_late_joiner_policy_for_enrollment(db, enrollment, current_user)
    except Exception:
        pass
    return {
        "id": enrollment.id,
        "student_id": student_id,
        "status": enrollment.status,
    }


class StudentDocumentCreate(BaseModel):
    title: str
    document_type: str
    file_url: str
    status: Optional[str] = "verified"


@router.get("/{student_id}/profile")
async def get_student_admin_profile(
    student_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("superadmin", "admin", "principal", "teacher", "accountant", "staff")),
):
    """
    Comprehensive 8-tab profile view for Admin and Teachers:
    Overview, Enrollment, Classes, Attendance, Tests, Fees, Documents, Activity
    """
    # 1. Base Student with relations
    res = await db.execute(
        select(Student)
        .options(
            selectinload(Student.guardians),
            selectinload(Student.enrollments),
            selectinload(Student.documents),
        )
        .where(Student.id == student_id)
    )
    student = res.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    check_institution_access(student.institution_id, current_user)

    # 2. Active Enrollment details (Board, Standard, Division, Academic Year)
    enr_stmt = (
        select(StudentEnrollment, Standard, Division, Board, AcademicYear)
        .join(Standard, StudentEnrollment.standard_id == Standard.id)
        .outerjoin(Division, StudentEnrollment.division_id == Division.id)
        .outerjoin(Board, Division.board_id == Board.id)
        .join(AcademicYear, StudentEnrollment.academic_year_id == AcademicYear.id)
        .where(StudentEnrollment.student_id == student_id)
        .order_by(desc(StudentEnrollment.id))
    )
    enr_rows = (await db.execute(enr_stmt)).all()
    enrollment_list = []
    active_division_id = None
    active_standard_id = None
    for enr, std, div, brd, ay in enr_rows:
        if enr.status == "active" and active_division_id is None:
            active_division_id = div.id if div else None
            active_standard_id = std.id
        enrollment_list.append({
            "id": enr.id,
            "academic_year": ay.name,
            "academic_year_id": ay.id,
            "standard_id": std.id,
            "standard_name": std.name,
            "standard_level": std.level,
            "division_id": div.id if div else None,
            "division_name": div.name if div else "Unassigned",
            "board_name": brd.name if brd else "General Board",
            "board_code": brd.code if brd else "GEN",
            "roll_number": enr.roll_number or "N/A",
            "status": enr.status,
            "enrollment_date": str(enr.enrollment_date),
            "remarks": enr.remarks,
        })

    # 3. Classes and subjects
    subjects_list = []
    if active_standard_id:
        sub_stmt = (
            select(Subject)
            .where(Subject.standard_id == active_standard_id, Subject.is_active == True)
            .order_by(Subject.name)
        )
        subjects_list = [
            {
                "id": s.id,
                "name": s.name,
                "code": s.code,
                "max_marks": s.max_marks,
                "pass_marks": s.pass_marks,
                "is_optional": s.is_optional,
            }
            for s in (await db.execute(sub_stmt)).scalars().all()
        ]

    # 4. Attendance
    att_stats_stmt = (
        select(
            func.count(Attendance.id).label("total"),
            func.count(func.nullif(Attendance.status != "present", True)).label("present"),
            func.count(func.nullif(Attendance.status != "absent", True)).label("absent"),
            func.count(func.nullif(Attendance.status != "late", True)).label("late"),
        )
        .where(Attendance.student_id == student_id)
    )
    att_stats = (await db.execute(att_stats_stmt)).one()
    att_total = att_stats.total or 0
    att_present = att_stats.present or 0
    att_absent = att_stats.absent or 0
    att_late = att_stats.late or 0
    att_pct = round((att_present / att_total) * 100, 1) if att_total > 0 else 100.0

    att_records_stmt = (
        select(Attendance)
        .where(Attendance.student_id == student_id)
        .order_by(desc(Attendance.date))
        .limit(30)
    )
    att_records = [
        {"id": a.id, "date": str(a.date), "status": a.status, "remarks": a.remarks or ""}
        for a in (await db.execute(att_records_stmt)).scalars().all()
    ]

    # 5. Tests & Marks
    marks_stmt = (
        select(ExamMark, Examination, Subject)
        .join(Examination, ExamMark.examination_id == Examination.id)
        .join(Subject, ExamMark.subject_id == Subject.id)
        .where(ExamMark.student_id == student_id)
        .order_by(desc(Examination.start_date), Subject.name)
    )
    test_results = []
    for mark, exam, subj in (await db.execute(marks_stmt)).all():
        obt = float(mark.marks_obtained) if mark.marks_obtained is not None else 0.0
        max_m = exam.max_marks or 100
        pct = round((obt / max_m) * 100, 1) if max_m > 0 else 0.0
        test_results.append({
            "id": mark.id,
            "exam_name": exam.name,
            "exam_type": exam.exam_type,
            "subject_name": subj.name,
            "marks_obtained": obt,
            "max_marks": max_m,
            "percentage": pct,
            "grade": mark.grade or ("A+" if pct >= 90 else "A" if pct >= 80 else "B" if pct >= 70 else "C" if pct >= 50 else "D"),
            "remarks": mark.remarks or "Completed",
            "is_absent": mark.is_absent,
            "exam_date": str(exam.start_date) if exam.start_date else None,
        })

    # 6. Fees & Payments
    inv_stmt = (
        select(FeeInvoice)
        .options(selectinload(FeeInvoice.items))
        .where(FeeInvoice.student_id == student_id, FeeInvoice.status != "cancelled")
        .order_by(desc(FeeInvoice.id))
    )
    invoices = (await db.execute(inv_stmt)).scalars().all()

    pmt_stmt = (
        select(Payment)
        .options(selectinload(Payment.receipt))
        .where(Payment.student_id == student_id)
        .order_by(desc(Payment.payment_date), desc(Payment.id))
    )
    payments = (await db.execute(pmt_stmt)).scalars().all()

    ref_stmt = select(func.coalesce(func.sum(Refund.amount), 0)).where(
        Refund.student_id == student_id,
        Refund.status == "completed",
    )
    refunds_completed = float((await db.execute(ref_stmt)).scalar() or 0.0)

    gross_fees = sum(float(i.total_amount) for i in invoices)
    total_concessions = sum(float(i.discount_amount) for i in invoices)
    total_fees = sum(float(i.net_amount) for i in invoices)
    gross_paid = sum(float(p.amount) for p in payments if p.status in ("completed", "posted"))
    total_paid = max(0.0, gross_paid - refunds_completed)
    outstanding = sum(float(i.outstanding_amount) for i in invoices if i.status != "written_off")

    # Concessions, Waivers & Scholarships for this student
    conc_stmt = (
        select(StudentConcessionApplication, FeeConcessionType)
        .join(FeeConcessionType, StudentConcessionApplication.concession_type_id == FeeConcessionType.id)
        .options(selectinload(StudentConcessionApplication.allocations))
        .where(StudentConcessionApplication.student_id == student_id)
        .order_by(desc(StudentConcessionApplication.id))
    )
    concessions_list = []
    waiver_history = []
    approval_history = []
    for c_app, c_type in (await db.execute(conc_stmt)).all():
        entry = {
            "id": c_app.id,
            "application_number": c_app.application_number,
            "concession_type_code": c_type.code,
            "concession_name": c_type.name,
            "category": c_type.category,
            "benefit_type": c_app.benefit_type or getattr(c_type, "benefit_type", "fee_concession"),
            "waiver_scope": c_app.waiver_scope,
            "requested_amount": float(c_app.requested_amount),
            "approved_amount": float(c_app.approved_amount),
            "applied_amount": float(c_app.applied_amount),
            "reversed_amount": float(getattr(c_app, "reversed_amount", 0) or 0),
            "status": c_app.status,
            "funding_source": c_app.funding_source,
            "sponsor_name": c_app.sponsor_name,
            "sponsor_settlement_status": c_app.sponsor_settlement_status,
            "valid_until": c_app.valid_until.isoformat() if getattr(c_app, "valid_until", None) else None,
            "approved_at": c_app.approved_at.isoformat() if c_app.approved_at else None,
            "approval_remarks": c_app.approval_remarks,
            "rejection_reason": c_app.rejection_reason,
            "cancellation_reason": getattr(c_app, "cancellation_reason", None),
            "invoice_id": c_app.invoice_id,
            "allocations": [
                {
                    "id": al.id,
                    "transaction_ref": getattr(al, "transaction_ref", None),
                    "transaction_type": getattr(al, "transaction_type", None),
                    "posting_status": getattr(al, "posting_status", "posted"),
                    "allocated_amount": float(al.allocated_amount),
                    "credit_adjustment_amount": float(al.credit_adjustment_amount),
                    "effective_date": al.effective_date.isoformat() if getattr(al, "effective_date", None) else None,
                }
                for al in (c_app.allocations or [])
            ],
        }
        concessions_list.append(entry)
        if entry["benefit_type"] == "fee_waiver":
            waiver_history.append(entry)
        approval_history.append({
            "application_id": c_app.id,
            "application_number": c_app.application_number,
            "benefit_name": c_type.name,
            "benefit_type": entry["benefit_type"],
            "status": c_app.status,
            "requested_amount": entry["requested_amount"],
            "approved_amount": entry["approved_amount"],
            "applied_amount": entry["applied_amount"],
            "approved_at": entry["approved_at"],
            "remarks": c_app.approval_remarks or c_app.rejection_reason or c_app.withdrawal_reason or c_app.cancellation_reason,
        })

    stu_gov = await FinancialGovernanceService.get_governed_summary(
        db,
        FinancialFilter(
            institution_id=student.institution_id,
            student_id=student_id,
            is_demo=None,
        ),
    )
    stu_fin = stu_gov["financials"]

    fee_details = {
        "summary": {
            "gross_fees": gross_fees,
            "total_concessions": total_concessions,
            "approved_benefits": stu_fin["approved_concessions_total"],
            "approved_unapplied": stu_fin["approved_unapplied"],
            "applied_concessions": stu_fin["posted_concessions_total"],
            "fee_waivers": stu_fin["posted_fee_waivers"],
            "scholarships": stu_fin["scholarships_awarded"],
            "sponsor_funding": stu_fin["sponsor_funded_scholarships"],
            "net_fees": total_fees,
            "total_fees": total_fees,
            "gross_paid": gross_paid,
            "refunds_completed": refunds_completed,
            "total_paid": total_paid,
            "outstanding": outstanding,
            "collection_rate": round((total_paid / total_fees) * 100, 1) if total_fees > 0 else 100.0,
        },
        "governance": stu_gov,
        "waiver_history": waiver_history,
        "approval_history": approval_history,
        "invoices": [
            {
                "id": inv.id,
                "invoice_number": inv.invoice_number,
                "issue_date": str(inv.issue_date),
                "due_date": str(inv.due_date) if inv.due_date else None,
                "total_amount": float(inv.total_amount),
                "discount_amount": float(inv.discount_amount),
                "net_amount": float(inv.net_amount),
                "paid_amount": float(inv.paid_amount),
                "outstanding_amount": float(inv.outstanding_amount),
                "status": inv.status,
                "notes": inv.notes,
                "items": [
                    {
                        "id": it.id,
                        "description": it.description,
                        "amount": float(it.amount),
                        "discount_amount": float(it.discount_amount or (inv.discount_amount if len(inv.items) == 1 else 0.0)),
                        "net_amount": float(it.net_amount if (it.discount_amount and it.discount_amount > 0) else max(0.0, float(it.amount) - float(inv.discount_amount if len(inv.items) == 1 else 0.0))),
                    }
                    for it in inv.items
                ],
                "installments": [
                    {
                        "id": inst.id,
                        "installment_number": inst.installment_number,
                        "due_date": str(inst.due_date),
                        "amount": float(inst.amount),
                        "paid_amount": float(inst.paid_amount),
                        "status": inst.status,
                    }
                    for inst in inv.installments
                ],
            }
            for inv in invoices
        ],
        "concessions": concessions_list,
        "payments": [
            {
                "id": p.id,
                "receipt_number": p.receipt.receipt_number if p.receipt else f"REC-{p.id}",
                "payment_date": str(p.payment_date),
                "amount": float(p.amount),
                "payment_method": p.payment_method,
                "transaction_reference": p.transaction_reference or "N/A",
                "status": p.status,
            }
            for p in payments
        ],
    }

    # 7. Documents
    documents_list = [
        {
            "id": d.id,
            "title": d.title,
            "document_type": d.document_type,
            "file_url": d.file_url,
            "status": d.status,
            "uploaded_at": str(d.uploaded_at),
        }
        for d in student.documents
    ]

    # 8. Activity Log
    # Fetch audit logs + recent payment events + attendance logs to synthesize a clean activity timeline
    audit_stmt = (
        select(AuditLog)
        .where(
            or_(
                and_(AuditLog.resource_type == "student", AuditLog.resource_id == student_id),
                and_(AuditLog.resource_type == "fee_invoice", AuditLog.resource_id.in_([i.id for i in invoices] or [-1])),
            )
        )
        .order_by(desc(AuditLog.created_at))
        .limit(10)
    )
    audit_logs = (await db.execute(audit_stmt)).scalars().all()

    activity_timeline = []
    for log in audit_logs:
        act_description = f"{log.action.replace('_', ' ').capitalize()} for {log.resource_type}"
        if log.action == "batch_transfer":
            act_description = "Student transferred to different batch by administrator"
            if log.new_data:
                try:
                    payload = json.loads(log.new_data)
                    reason = payload.get("transfer_reason")
                    if reason:
                        act_description += f" (Reason: {reason})"
                except Exception:
                    pass
        elif log.action == "student_profile_updated":
            act_description = "Student profile updated by administrator"
            if log.new_data:
                try:
                    payload = json.loads(log.new_data)
                    ch = payload.get("changes", {})
                    if ch:
                        fields_updated = [k.replace('_', ' ').capitalize() for k in ch.keys()]
                        act_description += f" ({', '.join(fields_updated[:4])})"
                except Exception:
                    pass
        activity_timeline.append({
            "id": f"audit-{log.id}",
            "type": "audit",
            "action": log.action,
            "description": act_description,
            "timestamp": str(log.created_at),
        })

    for p in payments[:5]:
        activity_timeline.append({
            "id": f"pmt-{p.id}",
            "type": "payment",
            "action": "fee_payment",
            "description": f"Payment of ₹{float(p.amount):,.0f} received via {p.payment_method.upper()}",
            "timestamp": str(p.payment_date),
        })

    # 9. Communication History & Linked Lead Integration (Canonical SSOT Ledger)
    lead_row = (await db.execute(
        select(Lead).where(Lead.converted_student_id == student_id)
    )).scalar_one_or_none()
    lead_id = lead_row.id if lead_row else None

    comm_conditions = [
        and_(CommunicationLog.recipient_type == "STUDENT", CommunicationLog.recipient_id == student_id),
    ]
    if lead_id:
        comm_conditions.append(CommunicationLog.lead_id == lead_id)
    if student.phone or student.email:
        dest_conditions = []
        if student.phone:
            dest_conditions.append(CommunicationLog.recipient_destination == student.phone)
        if student.email:
            dest_conditions.append(CommunicationLog.recipient_destination == student.email)
        comm_conditions.append(and_(CommunicationLog.institution_id == student.institution_id, or_(*dest_conditions)))

    comm_stmt = (
        select(CommunicationLog)
        .where(or_(*comm_conditions))
        .order_by(desc(CommunicationLog.created_at))
        .limit(30)
    )
    comms = (await db.execute(comm_stmt)).scalars().all()
    seen_comm_ids = set()
    communications_list = []
    for c in comms:
        if c.id in seen_comm_ids:
            continue
        seen_comm_ids.add(c.id)
        is_lead = bool(lead_id and c.lead_id == lead_id)
        origin_label = "Enquiry CRM Lead" if is_lead else "Student Communication"
        communications_list.append({
            "id": c.id,
            "channel": c.channel,
            "recipient_name": c.recipient_name,
            "recipient_destination": c.recipient_destination,
            "subject": c.subject or "Communication Notification",
            "content": c.content,
            "status": c.status,
            "is_lead_history": is_lead,
            "created_at": str(c.created_at),
        })
        activity_timeline.append({
            "id": f"comm-{c.id}",
            "type": "communication",
            "action": c.channel.lower(),
            "description": f"[{c.channel.upper()}] {c.subject or c.content[:60]} ({origin_label})",
            "timestamp": str(c.created_at),
        })

    # Sort combined activity timeline in reverse chronological order
    activity_timeline.sort(key=lambda x: str(x.get("timestamp", "")), reverse=True)

    if not activity_timeline:
        activity_timeline.append({
            "id": f"enroll-{student.id}",
            "type": "enrollment",
            "action": "enrolled",
            "description": f"Student admitted into Prashant Academy on {student.admission_date}",
            "timestamp": str(student.admission_date),
        })

    return {
        "overview": {
            "id": student.id,
            "admission_number": student.admission_number,
            "first_name": student.first_name,
            "last_name": student.last_name,
            "middle_name": student.middle_name,
            "full_name": f"{student.first_name} {student.last_name}",
            "date_of_birth": str(student.date_of_birth),
            "gender": student.gender,
            "blood_group": student.blood_group,
            "nationality": student.nationality,
            "religion": student.religion,
            "caste": student.caste,
            "aadhar_number": student.aadhar_number,
            "phone": student.phone,
            "email": student.email,
            "address": student.address,
            "city": student.city,
            "state": student.state,
            "pincode": student.pincode,
            "admission_date": str(student.admission_date),
            "is_active": student.is_active,
            "exit_date": str(student.exit_date) if student.exit_date else None,
            "exit_reason": student.exit_reason,
            "exit_notes": student.exit_notes,
            "active_batch": enrollment_list[0]["division_name"] if enrollment_list else "Unassigned",
            "active_standard": enrollment_list[0]["standard_name"] if enrollment_list else "Unassigned",
            "active_board": enrollment_list[0]["board_name"] if enrollment_list else "General Board",
            "guardians": [
                {
                    "id": g.id,
                    "relation": g.relation,
                    "first_name": g.first_name,
                    "last_name": g.last_name,
                    "phone": g.phone,
                    "email": g.email,
                    "occupation": g.occupation,
                    "is_primary": g.is_primary,
                }
                for g in student.guardians
            ],
            "attendance_summary": {
                "attendance_percentage": att_pct,
                "total_days": att_total,
                "present_days": att_present,
                "absent_days": att_absent,
            },
            "fee_summary": fee_details["summary"],
            "recent_test": test_results[0] if test_results else None,
        },
        "enrollment": enrollment_list,
        "classes": {
            "active_standard_id": active_standard_id,
            "active_division_id": active_division_id,
            "subjects": subjects_list,
        },
        "attendance": {
            "summary": {
                "total_days": att_total,
                "present_days": att_present,
                "absent_days": att_absent,
                "late_days": att_late,
                "attendance_percentage": att_pct,
            },
            "records": att_records,
        },
        "tests": test_results,
        "fees": fee_details,
        "documents": documents_list,
        "activity": activity_timeline,
        "communications": communications_list,
        "linked_lead": {
            "id": lead_row.id,
            "lead_number": lead_row.lead_number,
            "stage": lead_row.stage,
            "source": lead_row.source,
            "created_at": str(lead_row.created_at),
        } if lead_row else None,
    }


@router.post("/{student_id}/documents", status_code=status.HTTP_201_CREATED)
async def add_student_document(
    student_id: int,
    data: StudentDocumentCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("superadmin", "admin", "principal", "staff", "teacher")),
):
    student = await db.scalar(select(Student).where(Student.id == student_id))
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    check_institution_access(student.institution_id, current_user)

    doc = StudentDocument(
        student_id=student_id,
        title=data.title,
        document_type=data.document_type,
        file_url=data.file_url,
        status=data.status or "verified",
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    return {
        "id": doc.id,
        "student_id": doc.student_id,
        "title": doc.title,
        "document_type": doc.document_type,
        "file_url": doc.file_url,
        "status": doc.status,
        "uploaded_at": str(doc.uploaded_at),
    }


@router.delete("/{student_id}/documents/{document_id}")
async def delete_student_document(
    student_id: int,
    document_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("superadmin", "admin", "principal")),
):
    student = await db.scalar(select(Student).where(Student.id == student_id))
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    check_institution_access(student.institution_id, current_user)

    doc = await db.scalar(
        select(StudentDocument).where(
            and_(
                StudentDocument.id == document_id,
                StudentDocument.student_id == student_id,
            )
        )
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    audit = AuditLog(
        user_id=current_user.id,
        action="delete_student_document",
        resource_type="student_document",
        resource_id=document_id,
        old_data=f"title={doc.title}, document_type={doc.document_type}, student_id={student_id}",
        new_data=None,
    )
    db.add(audit)

    await db.delete(doc)
    await db.commit()
    return {"message": "Document removed successfully", "id": document_id}


# ── Student Lifecycle: Exit / Withdrawal, Reactivation & History ──


@router.post("/{student_id}/exit")
async def exit_student(
    student_id: int,
    data: StudentExitRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("superadmin", "admin", "principal", "accountant")),
):
    student = await db.scalar(select(Student).where(Student.id == student_id))
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    check_institution_access(student.institution_id, current_user)

    if not student.is_active:
        raise HTTPException(status_code=400, detail="Student is already inactive / withdrawn.")

    # Find the target enrollment (either specified or the current active one)
    if data.enrollment_id:
        enr = await db.scalar(
            select(StudentEnrollment).where(
                StudentEnrollment.id == data.enrollment_id,
                StudentEnrollment.student_id == student_id,
            )
        )
    else:
        enr = await db.scalar(
            select(StudentEnrollment).where(
                StudentEnrollment.student_id == student_id,
                StudentEnrollment.status == "active",
            ).order_by(desc(StudentEnrollment.id))
        )

    if not enr:
        raise HTTPException(status_code=400, detail="No active enrollment found for this student.")

    old_status = enr.status

    # Update enrollment record
    enr.status = data.status
    enr.exit_date = data.exit_date
    enr.exit_reason = data.reason
    enr.exit_notes = data.notes
    enr.exited_by_id = current_user.id
    enr.exited_at = func.now()

    # Update student master record
    student.is_active = False
    student.exit_date = data.exit_date
    student.exit_reason = data.reason
    student.exit_notes = data.notes

    # Process refund if provided
    refund_record = None
    if data.refund_amount and data.refund_amount > 0:
        # Check that refund doesn't exceed total net paid
        payments_sum = (
            await db.execute(
                select(func.coalesce(func.sum(Payment.amount), 0)).where(
                    Payment.student_id == student_id,
                    Payment.status.in_(["completed", "posted"]),
                    Payment.reversed_at.is_(None),
                )
            )
        ).scalar() or Decimal("0")

        existing_refunds_sum = (
            await db.execute(
                select(func.coalesce(func.sum(Refund.amount), 0)).where(
                    Refund.student_id == student_id,
                    Refund.status.in_(["completed", "processed"]),
                )
            )
        ).scalar() or Decimal("0")

        max_refundable = payments_sum - existing_refunds_sum
        if data.refund_amount > max_refundable:
            raise HTTPException(
                status_code=400,
                detail=f"Refund amount (₹{data.refund_amount}) exceeds net paid collections (₹{max_refundable}).",
            )

        # Find latest payment/invoice for linkage
        latest_payment = await db.scalar(
            select(Payment).where(
                Payment.student_id == student_id,
                Payment.status.in_(["completed", "posted"]),
                Payment.reversed_at.is_(None),
            ).order_by(desc(Payment.payment_date))
        )
        latest_invoice = await db.scalar(
            select(FeeInvoice).where(
                FeeInvoice.student_id == student_id,
            ).order_by(desc(FeeInvoice.id))
        )

        refund_record = Refund(
            institution_id=student.institution_id,
            student_id=student.id,
            enrollment_id=enr.id,
            payment_id=latest_payment.id if latest_payment else None,
            invoice_id=latest_invoice.id if latest_invoice else None,
            amount=data.refund_amount,
            refund_date=data.exit_date,
            refund_method=data.refund_method or "bank_transfer",
            reference_number=data.refund_reference,
            reason=data.refund_reason or f"Withdrawal refund: {data.reason}",
            status="completed",
            notes=data.notes,
            processed_by_id=current_user.id,
        )
        db.add(refund_record)

    # Record in StudentLifecycleLog
    lifecycle_log = StudentLifecycleLog(
        institution_id=student.institution_id,
        student_id=student.id,
        enrollment_id=enr.id,
        action=data.status,
        from_status=old_status,
        to_status=data.status,
        effective_date=data.exit_date,
        reason=data.reason,
        notes=data.notes,
        performed_by_id=current_user.id,
    )
    db.add(lifecycle_log)

    # General system AuditLog
    audit = AuditLog(
        user_id=current_user.id,
        action="student_exit",
        resource_type="student",
        resource_id=student.id,
        old_data=f"status={old_status}, is_active=True",
        new_data=f"status={data.status}, is_active=False, reason={data.reason}, exit_date={data.exit_date}",
    )
    db.add(audit)

    await db.commit()
    await db.refresh(student)
    await db.refresh(enr)

    return {
        "success": True,
        "message": f"Student {student.first_name} {student.last_name} marked as {data.status} successfully.",
        "student_id": student.id,
        "enrollment_id": enr.id,
        "is_active": student.is_active,
        "exit_date": str(student.exit_date),
        "exit_reason": student.exit_reason,
        "refund_id": refund_record.id if refund_record else None,
    }


@router.post("/{student_id}/reactivate")
async def reactivate_student(
    student_id: int,
    data: StudentReactivateRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("superadmin", "admin", "principal")),
):
    student = await db.scalar(select(Student).where(Student.id == student_id))
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    check_institution_access(student.institution_id, current_user)

    if student.is_active:
        raise HTTPException(status_code=400, detail="Student is already active.")

    # Determine target academic year
    target_ay_id = data.academic_year_id
    if not target_ay_id:
        active_ay = await db.scalar(
            select(AcademicYear).where(
                AcademicYear.institution_id == student.institution_id,
                AcademicYear.is_current == True,
            )
        )
        if not active_ay:
            active_ay = await db.scalar(
                select(AcademicYear).where(
                    AcademicYear.institution_id == student.institution_id
                ).order_by(desc(AcademicYear.id))
            )
        target_ay_id = active_ay.id if active_ay else 1

    # Check if student already has an active enrollment in this AY
    existing_active = await db.scalar(
        select(StudentEnrollment).where(
            StudentEnrollment.student_id == student_id,
            StudentEnrollment.academic_year_id == target_ay_id,
            StudentEnrollment.status == "active",
        )
    )
    if existing_active:
        raise HTTPException(
            status_code=400,
            detail=f"Student already has an active enrollment (#{existing_active.id}) in academic year #{target_ay_id}.",
        )

    # Check division capacity if division_id provided
    target_div_id = data.division_id
    target_std_id = data.standard_id

    # If standard or division not provided, fallback to their last enrollment
    if not target_std_id or not target_div_id:
        last_enr = await db.scalar(
            select(StudentEnrollment).where(
                StudentEnrollment.student_id == student_id
            ).order_by(desc(StudentEnrollment.id))
        )
        if last_enr:
            if not target_std_id:
                target_std_id = last_enr.standard_id
            if not target_div_id:
                target_div_id = last_enr.division_id

    if not target_std_id:
        first_std = await db.scalar(
            select(Standard).where(Standard.institution_id == student.institution_id).order_by(Standard.id)
        )
        target_std_id = first_std.id if first_std else 1

    if target_div_id:
        div = await db.scalar(select(Division).where(Division.id == target_div_id))
        if div and div.capacity:
            enrolled_count = (
                await db.execute(
                    select(func.count(StudentEnrollment.id)).where(
                        StudentEnrollment.division_id == target_div_id,
                        StudentEnrollment.status == "active",
                    )
                )
            ).scalar() or 0
            if enrolled_count >= div.capacity:
                raise HTTPException(
                    status_code=400,
                    detail=f"Target batch '{div.name}' is at full capacity ({div.capacity} students).",
                )

    # Create new active enrollment
    new_enrollment = StudentEnrollment(
        student_id=student_id,
        academic_year_id=target_ay_id,
        standard_id=target_std_id,
        division_id=target_div_id,
        roll_number=student.admission_number,
        enrollment_date=data.effective_date or date.today(),
        status="active",
        remarks=f"Reactivated on {data.effective_date or date.today()}. Reason: {data.reason or 'Re-enrollment'}",
    )
    db.add(new_enrollment)
    await db.flush()

    # Update student master record
    student.is_active = True
    student.exit_date = None
    student.exit_reason = None
    student.exit_notes = None

    # Lifecycle log
    lifecycle_log = StudentLifecycleLog(
        institution_id=student.institution_id,
        student_id=student.id,
        enrollment_id=new_enrollment.id,
        action="reactivated",
        from_status="withdrawn",
        to_status="active",
        effective_date=data.effective_date or date.today(),
        reason=data.reason or "Student reactivated by administration",
        notes=data.notes,
        performed_by_id=current_user.id,
    )
    db.add(lifecycle_log)

    # General audit log
    audit = AuditLog(
        user_id=current_user.id,
        action="student_reactivate",
        resource_type="student",
        resource_id=student.id,
        old_data="is_active=False",
        new_data=f"is_active=True, enrollment_id={new_enrollment.id}, reason={data.reason}",
    )
    db.add(audit)

    await db.commit()
    await db.refresh(student)
    await db.refresh(new_enrollment)

    return {
        "success": True,
        "message": f"Student {student.first_name} {student.last_name} reactivated successfully.",
        "student_id": student.id,
        "enrollment_id": new_enrollment.id,
        "is_active": student.is_active,
        "academic_year_id": target_ay_id,
        "standard_id": target_std_id,
        "division_id": target_div_id,
    }


@router.get("/{student_id}/lifecycle-history")
async def get_student_lifecycle_history(
    student_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    student = await db.scalar(select(Student).where(Student.id == student_id))
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    _authorize_student_read(student_id, student.institution_id, current_user)

    # Fetch lifecycle logs with performer details
    logs_stmt = (
        select(StudentLifecycleLog, StudentEnrollment, User)
        .outerjoin(StudentEnrollment, StudentLifecycleLog.enrollment_id == StudentEnrollment.id)
        .outerjoin(User, StudentLifecycleLog.performed_by_id == User.id)
        .where(StudentLifecycleLog.student_id == student_id)
        .order_by(desc(StudentLifecycleLog.created_at))
    )
    logs_rows = (await db.execute(logs_stmt)).all()

    logs_list = [
        {
            "id": log.id,
            "action": log.action,
            "from_status": log.from_status,
            "to_status": log.to_status,
            "effective_date": str(log.effective_date),
            "reason": log.reason,
            "notes": log.notes,
            "performed_by": f"{u.first_name} {u.last_name}" if u else "System Admin",
            "created_at": log.created_at.isoformat() if log.created_at else None,
            "enrollment_id": log.enrollment_id,
        }
        for log, enr, u in logs_rows
    ]

    # Fetch all enrollments (both active and historical)
    enr_stmt = (
        select(StudentEnrollment, Standard, Division, AcademicYear, User)
        .join(Standard, StudentEnrollment.standard_id == Standard.id)
        .outerjoin(Division, StudentEnrollment.division_id == Division.id)
        .join(AcademicYear, StudentEnrollment.academic_year_id == AcademicYear.id)
        .outerjoin(User, StudentEnrollment.exited_by_id == User.id)
        .where(StudentEnrollment.student_id == student_id)
        .order_by(desc(StudentEnrollment.id))
    )
    enr_rows = (await db.execute(enr_stmt)).all()

    enrollments_list = [
        {
            "id": enr.id,
            "academic_year": ay.name,
            "standard_name": std.name,
            "division_name": div.name if div else "Unassigned",
            "roll_number": enr.roll_number,
            "enrollment_date": str(enr.enrollment_date),
            "status": enr.status,
            "exit_date": str(enr.exit_date) if enr.exit_date else None,
            "exit_reason": enr.exit_reason,
            "exit_notes": enr.exit_notes,
            "exited_by": f"{exited_by.first_name} {exited_by.last_name}" if exited_by else None,
            "remarks": enr.remarks,
        }
        for enr, std, div, ay, exited_by in enr_rows
    ]

    # Fetch refunds if any
    ref_stmt = (
        select(Refund, User)
        .outerjoin(User, Refund.processed_by_id == User.id)
        .where(Refund.student_id == student_id)
        .order_by(desc(Refund.refund_date))
    )
    ref_rows = (await db.execute(ref_stmt)).all()
    refunds_list = [
        {
            "id": r.id,
            "amount": float(r.amount),
            "refund_date": str(r.refund_date),
            "refund_method": r.refund_method,
            "reference_number": r.reference_number,
            "reason": r.reason,
            "status": r.status,
            "notes": r.notes,
            "processed_by": f"{u.first_name} {u.last_name}" if u else None,
        }
        for r, u in ref_rows
    ]

    return {
        "student_id": student.id,
        "is_active": student.is_active,
        "current_status": "active" if student.is_active else (student.exit_reason or "withdrawn"),
        "exit_date": str(student.exit_date) if student.exit_date else None,
        "exit_reason": student.exit_reason,
        "exit_notes": student.exit_notes,
        "lifecycle_logs": logs_list,
        "enrollments": enrollments_list,
        "refunds": refunds_list,
    }



