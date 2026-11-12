# /**
#  * @file        teacher_payroll.py
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
#  * @created     2026-11-06
#  * @updated     2026-11-12
#  *
#  * @description API endpoints for Teacher Payroll, Teaching Sessions Register,
#  */

from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import select, and_, or_, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import check_institution_access, get_current_active_user, require_role
from app.models.user import User, AuditLog
from app.models.division import Division
from app.models.subject import Subject
from app.models.portal import TimetableEntry
from app.models.staff import StaffProfile
from app.models.teacher_payroll import (
    TeacherPaymentProfile,
    TeacherRateHistory,
    TeacherContractMilestone,
    TeachingSession,
    TeacherPayroll,
    TeacherPaymentVoucher,
)
from app.services import teacher_payroll_service as svc
from app.services.codex_service import CodeXService

router = APIRouter()


# ============================================================================
# PYDANTIC SCHEMAS
# ============================================================================

class ProfileUpdateSchema(BaseModel):
    payment_method: str
    hourly_rate: Optional[Decimal] = Decimal("0.00")
    per_lecture_rate: Optional[Decimal] = Decimal("0.00")
    monthly_fixed_amount: Optional[Decimal] = Decimal("0.00")
    contract_total_amount: Optional[Decimal] = Decimal("0.00")
    effective_from: Optional[date] = None
    effective_until: Optional[date] = None
    payment_frequency: Optional[str] = "monthly"
    payment_terms: Optional[str] = None
    reason: Optional[str] = "Rate adjustment"
    notes: Optional[str] = None


class MilestoneCreateSchema(BaseModel):
    milestone_name: str
    milestone_order: int = 1
    amount: Decimal
    percentage: float = 0.0
    due_date: Optional[date] = None
    notes: Optional[str] = None


class MilestoneUpdateSchema(BaseModel):
    milestone_name: Optional[str] = None
    amount: Optional[Decimal] = None
    percentage: Optional[float] = None
    due_date: Optional[date] = None
    achieved_date: Optional[date] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class SessionCreateSchema(BaseModel):
    teacher_user_id: int
    substitute_teacher_id: Optional[int] = None
    subject_id: int
    division_id: int
    timetable_entry_id: Optional[int] = None
    session_date: date
    scheduled_start_time: str
    scheduled_end_time: str
    actual_start_time: Optional[str] = None
    actual_end_time: Optional[str] = None
    break_duration_minutes: int = 0
    topic_taught: Optional[str] = None
    students_present_count: Optional[int] = None
    is_payable: bool = True
    session_status: str = "completed"
    approval_status: str = "submitted"
    remarks: Optional[str] = None


class SessionUpdateSchema(BaseModel):
    substitute_teacher_id: Optional[int] = None
    subject_id: Optional[int] = None
    division_id: Optional[int] = None
    session_date: Optional[date] = None
    scheduled_start_time: Optional[str] = None
    scheduled_end_time: Optional[str] = None
    actual_start_time: Optional[str] = None
    actual_end_time: Optional[str] = None
    break_duration_minutes: Optional[int] = None
    topic_taught: Optional[str] = None
    students_present_count: Optional[int] = None
    is_payable: Optional[bool] = None
    session_status: Optional[str] = None
    remarks: Optional[str] = None


class BulkApproveSchema(BaseModel):
    session_ids: List[int]


class RejectSessionSchema(BaseModel):
    reason: str


class AssignSubstituteSchema(BaseModel):
    substitute_teacher_id: int
    reason: Optional[str] = None


class CalculatePayrollSchema(BaseModel):
    teacher_user_id: int
    month: int
    year: int
    academic_year_id: Optional[int] = 1


class BulkCalculateSchema(BaseModel):
    month: int
    year: int
    academic_year_id: Optional[int] = 1


class AdjustPayrollSchema(BaseModel):
    approved_incentives: Optional[Decimal] = None
    approved_additional_earnings: Optional[Decimal] = None
    contractual_adjustments: Optional[Decimal] = None
    total_deductions: Optional[Decimal] = None
    withholdings: Optional[Decimal] = None
    notes: Optional[str] = None


class RecordVoucherSchema(BaseModel):
    amount_paid: Decimal
    payment_date: Optional[date] = None
    payment_method: str = "bank_transfer"
    transaction_reference: Optional[str] = None
    bank_name: Optional[str] = None
    cheque_number: Optional[str] = None
    cheque_date: Optional[date] = None
    notes: Optional[str] = None


class ReverseVoucherSchema(BaseModel):
    reversal_reason: str


# ============================================================================
# ROLE & TENANT HELPERS
# ============================================================================

PAYROLL_ADMIN_ROLES = ("superadmin", "sysadmin", "super_admin", "admin", "principal", "accountant")
PAYROLL_VIEW_ROLES = (*PAYROLL_ADMIN_ROLES, "teacher")
PAYROLL_DROPDOWN_ROLES = (*PAYROLL_VIEW_ROLES, "staff")


def _resolve_inst_id(current_user: User, target_inst_id: Optional[int] = None) -> int:
    if target_inst_id is not None:
        check_institution_access(target_inst_id, current_user)
        return target_inst_id
    return current_user.institution_id or 1


async def _get_teacher_or_404(db: AsyncSession, teacher_user_id: int, current_user: User) -> User:
    teacher = (await db.execute(select(User).where(User.id == teacher_user_id))).scalar_one_or_none()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher user not found")
    check_institution_access(teacher.institution_id, current_user)
    return teacher


async def _get_payroll_or_404(db: AsyncSession, payroll_id: int, current_user: User) -> TeacherPayroll:
    payroll = (await db.execute(select(TeacherPayroll).where(TeacherPayroll.id == payroll_id))).scalar_one_or_none()
    if not payroll:
        raise HTTPException(status_code=404, detail="Payroll record not found")
    check_institution_access(payroll.institution_id, current_user)
    return payroll


# ============================================================================
# 1. TEACHER PROFILES & RATES ENDPOINTS
# ============================================================================

@router.get("/teachers")
async def list_available_teachers(
    institution_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*PAYROLL_DROPDOWN_ROLES)),
):
    """Returns list of active teachers for dropdowns and session assignments."""
    inst_id = _resolve_inst_id(current_user, institution_id)
    stmt = (
        select(User)
        .outerjoin(StaffProfile, StaffProfile.user_id == User.id)
        .where(
            and_(
                User.institution_id == inst_id,
                User.is_active.is_(True),
                or_(
                    User.role == "teacher",
                    StaffProfile.staff_type == "teacher",
                ),
            )
        )
        .order_by(User.first_name, User.last_name)
    )
    result = await db.execute(stmt)
    teachers = result.scalars().all()
    return [
        {
            "id": t.id,
            "full_name": t.full_name,
            "email": t.email,
            "phone": t.phone,
            "role": t.role,
        }
        for t in teachers
    ]


@router.get("/profiles")
async def list_teacher_payment_profiles(
    institution_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*PAYROLL_VIEW_ROLES)),
):
    """Lists payment profiles for all teachers (teachers see only their own profile)."""
    inst_id = _resolve_inst_id(current_user, institution_id)
    filters = [
        User.institution_id == inst_id,
        User.is_active.is_(True),
        or_(
            User.role == "teacher",
            StaffProfile.staff_type == "teacher",
        ),
    ]
    if (current_user.role or "").lower() == "teacher":
        filters.append(User.id == current_user.id)
    stmt = (
        select(User, TeacherPaymentProfile, StaffProfile)
        .outerjoin(TeacherPaymentProfile, and_(TeacherPaymentProfile.teacher_user_id == User.id, TeacherPaymentProfile.is_active.is_(True)))
        .outerjoin(StaffProfile, StaffProfile.user_id == User.id)
        .where(and_(*filters))
        .order_by(User.first_name, User.last_name)
    )
    result = await db.execute(stmt)
    rows = result.all()

    profiles_data = []
    for u, p, sp in rows:
        profiles_data.append({
            "teacher_user_id": u.id,
            "teacher_name": u.full_name,
            "email": u.email,
            "phone": u.phone,
            "designation": u.designation or (sp.department if sp else "Teacher"),
            "department": sp.department if sp else "Academics",
            "profile_id": p.id if p else None,
            "payment_method": p.payment_method if p else "hourly",
            "hourly_rate": float(p.hourly_rate) if p else 500.0,
            "per_lecture_rate": float(p.per_lecture_rate) if p else 600.0,
            "monthly_fixed_amount": float(p.monthly_fixed_amount) if p else 0.0,
            "contract_total_amount": float(p.contract_total_amount) if p else 0.0,
            "payment_frequency": p.payment_frequency if p else "monthly",
            "payment_terms": p.payment_terms if p else "",
            "is_active": p.is_active if p else True,
            "notes": p.notes if p else "",
        })
    return profiles_data


@router.get("/profiles/{teacher_user_id}")
async def get_teacher_profile_details(
    teacher_user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*PAYROLL_VIEW_ROLES)),
):
    """Retrieves payment profile, rate history, and milestones for a teacher."""
    if (current_user.role or "").lower() == "teacher" and teacher_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Teachers may only view their own payment profile")
    teacher = await _get_teacher_or_404(db, teacher_user_id, current_user)
    profile = await svc.get_or_create_payment_profile(
        db, teacher_user_id, teacher.institution_id or current_user.institution_id or 1
    )

    # Get rate histories
    hist_stmt = (
        select(TeacherRateHistory, func.concat(User.first_name, ' ', User.last_name).label("changed_by_name"))
        .join(User, TeacherRateHistory.changed_by_id == User.id, isouter=True)
        .where(TeacherRateHistory.payment_profile_id == profile.id)
        .order_by(desc(TeacherRateHistory.changed_at))
    )
    hist_res = await db.execute(hist_stmt)
    histories = [
        {
            "id": h.id,
            "old_payment_method": h.old_payment_method,
            "new_payment_method": h.new_payment_method,
            "old_rate": float(h.old_rate or 0.0),
            "new_rate": float(h.new_rate),
            "effective_from": str(h.effective_from),
            "reason": h.reason,
            "changed_by": changed_by,
            "changed_at": str(h.changed_at),
        }
        for h, changed_by in hist_res.all()
    ]

    # Get milestones
    ms_stmt = (
        select(TeacherContractMilestone)
        .where(TeacherContractMilestone.payment_profile_id == profile.id)
        .order_by(TeacherContractMilestone.milestone_order)
    )
    ms_res = await db.execute(ms_stmt)
    milestones = [
        {
            "id": m.id,
            "milestone_name": m.milestone_name,
            "milestone_order": m.milestone_order,
            "amount": float(m.amount),
            "percentage": m.percentage,
            "due_date": str(m.due_date) if m.due_date else None,
            "achieved_date": str(m.achieved_date) if m.achieved_date else None,
            "status": m.status,
            "notes": m.notes,
        }
        for m in ms_res.scalars().all()
    ]

    return {
        "profile": {
            "id": profile.id,
            "teacher_user_id": profile.teacher_user_id,
            "payment_method": profile.payment_method,
            "hourly_rate": float(profile.hourly_rate),
            "per_lecture_rate": float(profile.per_lecture_rate),
            "monthly_fixed_amount": float(profile.monthly_fixed_amount),
            "contract_total_amount": float(profile.contract_total_amount),
            "currency": profile.currency,
            "effective_from": str(profile.effective_from),
            "effective_until": str(profile.effective_until) if profile.effective_until else None,
            "payment_frequency": profile.payment_frequency,
            "payment_terms": profile.payment_terms,
            "is_active": profile.is_active,
            "notes": profile.notes,
        },
        "rate_histories": histories,
        "milestones": milestones,
    }


@router.put("/profiles/{teacher_user_id}")
async def update_teacher_profile(
    teacher_user_id: int,
    payload: ProfileUpdateSchema,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*PAYROLL_ADMIN_ROLES)),
):
    """Updates profile rates and preserves immutable rate revision history."""
    teacher = await _get_teacher_or_404(db, teacher_user_id, current_user)
    profile = await svc.get_or_create_payment_profile(
        db, teacher_user_id, teacher.institution_id or current_user.institution_id or 1
    )
    updated = await svc.update_payment_profile_rates(
        db=db,
        profile_id=profile.id,
        data=payload.model_dump(),
        changed_by_user_id=current_user.id,
    )
    return {"message": "Payment profile updated successfully", "profile_id": updated.id}


@router.post("/profiles/{profile_id}/milestones")
async def create_contract_milestone(
    profile_id: int,
    payload: MilestoneCreateSchema,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*PAYROLL_ADMIN_ROLES)),
):
    """Adds a contract milestone to a teacher's payment profile."""
    profile = (
        await db.execute(select(TeacherPaymentProfile).where(TeacherPaymentProfile.id == profile_id))
    ).scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Payment profile not found")
    check_institution_access(profile.institution_id, current_user)
    ms = await svc.add_contract_milestone(db, profile_id, payload.model_dump())
    return {"message": "Contract milestone created", "milestone_id": ms.id}


@router.put("/milestones/{milestone_id}")
async def update_contract_milestone(
    milestone_id: int,
    payload: MilestoneUpdateSchema,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*PAYROLL_ADMIN_ROLES)),
):
    """Updates contract milestone status or details."""
    stmt = (
        select(TeacherContractMilestone, TeacherPaymentProfile.institution_id)
        .join(TeacherPaymentProfile, TeacherContractMilestone.payment_profile_id == TeacherPaymentProfile.id)
        .where(TeacherContractMilestone.id == milestone_id)
    )
    res = await db.execute(stmt)
    row = res.first()
    if not row:
        raise HTTPException(status_code=404, detail="Milestone not found")
    ms, profile_inst_id = row
    check_institution_access(profile_inst_id, current_user)

    d = payload.model_dump(exclude_unset=True)
    for k, v in d.items():
        setattr(ms, k, v)
    if d.get("status") == "approved":
        ms.approved_by_id = current_user.id

    await db.commit()
    await db.refresh(ms)
    return {"message": "Milestone updated", "milestone_id": ms.id}


# ============================================================================
# 2. TEACHING SESSIONS REGISTER ENDPOINTS
# ============================================================================

@router.get("/sessions")
async def list_teaching_sessions(
    teacher_id: Optional[int] = Query(None),
    division_id: Optional[int] = Query(None),
    subject_id: Optional[int] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    approval_status: Optional[str] = Query(None),
    session_status: Optional[str] = Query(None),
    institution_id: Optional[int] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*PAYROLL_VIEW_ROLES)),
):
    """Retrieves teaching sessions register with filtering and pagination."""
    inst_id = _resolve_inst_id(current_user, institution_id)
    # If teacher role, only allow viewing own sessions
    if (current_user.role or "").lower() == "teacher":
        teacher_id = current_user.id

    conditions = [TeachingSession.institution_id == inst_id]
    if teacher_id:
        conditions.append(
            or_(
                TeachingSession.teacher_user_id == teacher_id,
                TeachingSession.substitute_teacher_id == teacher_id,
            )
        )
    if division_id:
        conditions.append(TeachingSession.division_id == division_id)
    if subject_id:
        conditions.append(TeachingSession.subject_id == subject_id)
    if date_from:
        conditions.append(TeachingSession.session_date >= date_from)
    if date_to:
        conditions.append(TeachingSession.session_date <= date_to)
    if approval_status:
        conditions.append(TeachingSession.approval_status == approval_status)
    if session_status:
        conditions.append(TeachingSession.session_status == session_status)

    count_stmt = select(func.count(TeachingSession.id)).where(and_(*conditions))
    total_count = (await db.execute(count_stmt)).scalar() or 0

    stmt = (
        select(
            TeachingSession,
            func.concat(User.first_name, ' ', User.last_name).label("teacher_name"),
            Division.name.label("batch_name"),
            Subject.name.label("subject_name"),
        )
        .join(User, TeachingSession.teacher_user_id == User.id)
        .join(Division, TeachingSession.division_id == Division.id)
        .join(Subject, TeachingSession.subject_id == Subject.id)
        .where(and_(*conditions))
        .order_by(desc(TeachingSession.session_date), desc(TeachingSession.id))
        .offset((page - 1) * limit)
        .limit(limit)
    )
    result = await db.execute(stmt)
    rows = result.all()

    # Get substitute names where applicable
    sub_ids = [s.substitute_teacher_id for s, _, _, _ in rows if s.substitute_teacher_id]
    sub_map = {}
    if sub_ids:
        sub_users = (await db.execute(select(User).where(User.id.in_(sub_ids)))).scalars().all()
        sub_map = {u.id: u.full_name for u in sub_users}

    items = []
    for s, t_name, b_name, sub_name in rows:
        items.append({
            "id": s.id,
            "session_code": s.session_code,
            "teacher_user_id": s.teacher_user_id,
            "teacher_name": t_name,
            "substitute_teacher_id": s.substitute_teacher_id,
            "substitute_name": sub_map.get(s.substitute_teacher_id),
            "batch_name": b_name,
            "subject_name": sub_name,
            "session_date": str(s.session_date),
            "scheduled_start_time": s.scheduled_start_time,
            "scheduled_end_time": s.scheduled_end_time,
            "actual_start_time": s.actual_start_time,
            "actual_end_time": s.actual_end_time,
            "break_duration_minutes": s.break_duration_minutes,
            "calculated_duration_hours": s.calculated_duration_hours,
            "payment_method": s.payment_method,
            "applicable_rate": float(s.applicable_rate),
            "calculated_amount": float(s.calculated_amount),
            "session_status": s.session_status,
            "approval_status": s.approval_status,
            "rejection_reason": s.rejection_reason,
            "topic_taught": s.topic_taught,
            "students_present_count": s.students_present_count,
            "is_payable": s.is_payable,
            "is_locked": s.payroll_id is not None,
            "payroll_id": s.payroll_id,
            "remarks": s.remarks,
        })

    return {
        "items": items,
        "total": total_count,
        "page": page,
        "limit": limit,
    }


@router.post("/sessions")
async def create_teaching_session(
    payload: SessionCreateSchema,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*PAYROLL_VIEW_ROLES)),
):
    """Logs a new teaching session."""
    if (current_user.role or "").lower() == "teacher" and payload.teacher_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Teachers may only log teaching sessions for themselves")
    teacher = await _get_teacher_or_404(db, payload.teacher_user_id, current_user)
    data = payload.model_dump()
    if (current_user.role or "").lower() == "teacher":
        data["approval_status"] = "submitted"
        data["substitute_teacher_id"] = None
    data["institution_id"] = teacher.institution_id or current_user.institution_id or 1
    session = await svc.log_teaching_session(db, data, current_user.id)
    return {"message": "Teaching session logged successfully", "session_id": session.id, "session_code": session.session_code}


@router.put("/sessions/{session_id}")
async def update_teaching_session(
    session_id: int,
    payload: SessionUpdateSchema,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*PAYROLL_VIEW_ROLES)),
):
    """Updates an existing teaching session if not locked in payroll."""
    stmt = select(TeachingSession).where(TeachingSession.id == session_id)
    res = await db.execute(stmt)
    sess = res.scalar_one_or_none()
    if not sess:
        raise HTTPException(status_code=404, detail="Teaching session not found")
    check_institution_access(sess.institution_id, current_user)
    if (current_user.role or "").lower() == "teacher" and sess.teacher_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Teachers may only update their own sessions")
    if sess.payroll_id:
        raise HTTPException(status_code=400, detail="Cannot edit session; it is locked in a payroll.")

    d = payload.model_dump(exclude_unset=True)
    for k, v in d.items():
        setattr(sess, k, v)

    # Recalculate duration if timing updated
    act_s = sess.actual_start_time or sess.scheduled_start_time
    act_e = sess.actual_end_time or sess.scheduled_end_time
    sess.calculated_duration_hours = svc.calculate_session_duration(act_s, act_e, sess.break_duration_minutes)

    if sess.payment_method == "hourly":
        sess.calculated_amount = (sess.applicable_rate * Decimal(str(sess.calculated_duration_hours))).quantize(Decimal("0.01"))

    sess.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(sess)
    return {"message": "Session updated successfully", "session_id": sess.id}


@router.post("/sessions/bulk-approve")
async def bulk_approve_sessions(
    payload: BulkApproveSchema,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*PAYROLL_ADMIN_ROLES)),
):
    """Approves a list of teaching sessions in bulk."""
    if payload.session_ids:
        sess_rows = (
            await db.execute(
                select(TeachingSession.id, TeachingSession.institution_id).where(
                    TeachingSession.id.in_(payload.session_ids)
                )
            )
        ).all()
        for _, sess_inst_id in sess_rows:
            check_institution_access(sess_inst_id, current_user)
    count = await svc.bulk_approve_sessions(db, payload.session_ids, current_user.id)
    return {"message": f"Successfully approved {count} teaching sessions", "approved_count": count}


@router.post("/sessions/{session_id}/reject")
async def reject_session(
    session_id: int,
    payload: RejectSessionSchema,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*PAYROLL_ADMIN_ROLES)),
):
    """Rejects a teaching session with mandatory reason."""
    target_sess = (
        await db.execute(select(TeachingSession).where(TeachingSession.id == session_id))
    ).scalar_one_or_none()
    if not target_sess:
        raise HTTPException(status_code=404, detail="Teaching session not found")
    check_institution_access(target_sess.institution_id, current_user)
    try:
        sess = await svc.reject_teaching_session(db, session_id, current_user.id, payload.reason)
        return {"message": "Session rejected", "session_id": sess.id}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/sessions/{session_id}/substitute")
async def assign_substitute(
    session_id: int,
    payload: AssignSubstituteSchema,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*PAYROLL_ADMIN_ROLES)),
):
    """Assigns substitute teacher to a session and recalculates rates."""
    target_sess = (
        await db.execute(select(TeachingSession).where(TeachingSession.id == session_id))
    ).scalar_one_or_none()
    if not target_sess:
        raise HTTPException(status_code=404, detail="Teaching session not found")
    check_institution_access(target_sess.institution_id, current_user)
    await _get_teacher_or_404(db, payload.substitute_teacher_id, current_user)
    try:
        sess = await svc.assign_substitute_teacher(
            db, session_id, payload.substitute_teacher_id, current_user.id, payload.reason
        )
        return {"message": "Substitute assigned successfully", "session_id": sess.id}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============================================================================
# 3. MONTHLY PAYROLL ENDPOINTS
# ============================================================================

@router.get("/monthly")
async def list_monthly_payrolls(
    month: Optional[int] = Query(None),
    year: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    teacher_id: Optional[int] = Query(None),
    institution_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*PAYROLL_VIEW_ROLES)),
):
    """Lists monthly payroll records for given month and year."""
    inst_id = _resolve_inst_id(current_user, institution_id)
    if (current_user.role or "").lower() == "teacher":
        teacher_id = current_user.id

    conditions = [TeacherPayroll.institution_id == inst_id]
    if month:
        conditions.append(TeacherPayroll.month == month)
    if year:
        conditions.append(TeacherPayroll.year == year)
    if status:
        conditions.append(TeacherPayroll.status == status)
    if teacher_id:
        conditions.append(TeacherPayroll.teacher_user_id == teacher_id)

    stmt = (
        select(
            TeacherPayroll,
            func.concat(User.first_name, ' ', User.last_name).label("teacher_name"),
            User.email.label("teacher_email"),
        )
        .join(User, TeacherPayroll.teacher_user_id == User.id)
        .where(and_(*conditions))
        .order_by(desc(TeacherPayroll.year), desc(TeacherPayroll.month), User.first_name, User.last_name)
    )
    result = await db.execute(stmt)
    rows = result.all()

    items = []
    for p, name, email in rows:
        items.append({
            "id": p.id,
            "payroll_number": p.payroll_number,
            "teacher_user_id": p.teacher_user_id,
            "teacher_name": name,
            "teacher_email": email,
            "month": p.month,
            "year": p.year,
            "payment_method": p.payment_method,
            "total_teaching_hours": p.total_teaching_hours,
            "total_completed_lectures": p.total_completed_lectures,
            "base_earnings": float(p.base_earnings),
            "approved_incentives": float(p.approved_incentives),
            "approved_additional_earnings": float(p.approved_additional_earnings),
            "contractual_adjustments": float(p.contractual_adjustments),
            "gross_pay": float(p.gross_pay),
            "total_deductions": float(p.total_deductions),
            "withholdings": float(p.withholdings),
            "net_payable": float(p.net_payable),
            "paid_amount": float(p.paid_amount),
            "pending_amount": float(p.pending_amount),
            "status": p.status,
            "calculated_at": str(p.calculated_at),
            "notes": p.notes,
        })
    return await CodeXService.mask_records_list(
        db=db,
        institution_id=inst_id,
        user=current_user,
        records=items,
        numeric_fields=[
            "base_earnings", "approved_incentives", "approved_additional_earnings",
            "contractual_adjustments", "gross_pay", "total_deductions", "withholdings",
            "net_payable", "paid_amount", "pending_amount"
        ],
        module="teacher_payroll",
    )


@router.post("/monthly/calculate")
async def calculate_teacher_payroll(
    payload: CalculatePayrollSchema,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*PAYROLL_ADMIN_ROLES)),
):
    """Calculates or recalculates monthly payroll for a teacher."""
    teacher = await _get_teacher_or_404(db, payload.teacher_user_id, current_user)
    try:
        payroll = await svc.calculate_monthly_payroll(
            db=db,
            teacher_user_id=payload.teacher_user_id,
            month=payload.month,
            year=payload.year,
            institution_id=teacher.institution_id or current_user.institution_id or 1,
            academic_year_id=payload.academic_year_id or 1,
            calculated_by_user_id=current_user.id,
            allow_recalculation=True,
        )
        return {
            "message": "Payroll calculated successfully",
            "payroll_id": payroll.id,
            "payroll_number": payroll.payroll_number,
            "net_payable": float(payroll.net_payable),
            "total_hours": payroll.total_teaching_hours,
            "status": payroll.status,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/monthly/bulk-calculate")
async def bulk_calculate_monthly_payroll(
    payload: BulkCalculateSchema,
    institution_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*PAYROLL_ADMIN_ROLES)),
):
    """Calculates payroll for all active teachers for the specified month and year."""
    inst_id = _resolve_inst_id(current_user, institution_id)
    teachers_stmt = (
        select(User.id)
        .outerjoin(StaffProfile, StaffProfile.user_id == User.id)
        .where(
            and_(
                User.institution_id == inst_id,
                User.is_active.is_(True),
                or_(User.role == "teacher", StaffProfile.staff_type == "teacher"),
            )
        )
    )
    t_result = await db.execute(teachers_stmt)
    teacher_ids = t_result.scalars().all()

    calculated = []
    for tid in teacher_ids:
        try:
            p = await svc.calculate_monthly_payroll(
                db=db,
                teacher_user_id=tid,
                month=payload.month,
                year=payload.year,
                institution_id=inst_id,
                academic_year_id=payload.academic_year_id or 1,
                calculated_by_user_id=current_user.id,
                allow_recalculation=True,
            )
            calculated.append({"teacher_user_id": tid, "payroll_id": p.id, "net_payable": float(p.net_payable)})
        except Exception:
            pass

    return {
        "message": f"Successfully calculated payroll for {len(calculated)} teachers",
        "count": len(calculated),
        "results": calculated,
    }


@router.get("/monthly/{payroll_id}")
async def get_payroll_details(
    payroll_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*PAYROLL_VIEW_ROLES)),
):
    """Retrieves full payroll details including session breakdown and vouchers."""
    stmt = (
        select(TeacherPayroll, func.concat(User.first_name, ' ', User.last_name).label("teacher_name"), User.email.label("teacher_email"))
        .join(User, TeacherPayroll.teacher_user_id == User.id)
        .where(TeacherPayroll.id == payroll_id)
    )
    res = await db.execute(stmt)
    row = res.first()
    if not row:
        raise HTTPException(status_code=404, detail="Payroll record not found")
    p, name, email = row
    check_institution_access(p.institution_id, current_user)
    if (current_user.role or "").lower() == "teacher" and p.teacher_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Teachers may only view their own payroll")

    # Get linked sessions
    sess_stmt = (
        select(TeachingSession, Division.name.label("batch_name"), Subject.name.label("subject_name"))
        .join(Division, TeachingSession.division_id == Division.id)
        .join(Subject, TeachingSession.subject_id == Subject.id)
        .where(TeachingSession.payroll_id == p.id)
        .order_by(TeachingSession.session_date)
    )
    sess_res = await db.execute(sess_stmt)
    sessions = [
        {
            "id": s.id,
            "session_code": s.session_code,
            "date": str(s.session_date),
            "batch_name": b_name,
            "subject_name": sub_name,
            "hours": s.calculated_duration_hours,
            "rate": float(s.applicable_rate),
            "amount": float(s.calculated_amount),
            "topic_taught": s.topic_taught,
        }
        for s, b_name, sub_name in sess_res.all()
    ]

    # Get vouchers
    v_stmt = select(TeacherPaymentVoucher).where(TeacherPaymentVoucher.payroll_id == p.id).order_by(desc(TeacherPaymentVoucher.payment_date))
    v_res = await db.execute(v_stmt)
    vouchers = [
        {
            "id": v.id,
            "voucher_number": v.voucher_number,
            "amount_paid": float(v.amount_paid),
            "payment_date": str(v.payment_date),
            "payment_method": v.payment_method,
            "reference": v.transaction_reference or v.cheque_number or "-",
            "debit_account": v.debit_account,
            "credit_account": v.credit_account,
            "status": v.status,
        }
        for v in v_res.scalars().all()
    ]

    return {
        "payroll": {
            "id": p.id,
            "payroll_number": p.payroll_number,
            "teacher_user_id": p.teacher_user_id,
            "teacher_name": name,
            "teacher_email": email,
            "month": p.month,
            "year": p.year,
            "start_date": str(p.start_date),
            "end_date": str(p.end_date),
            "payment_method": p.payment_method,
            "total_teaching_hours": p.total_teaching_hours,
            "total_completed_lectures": p.total_completed_lectures,
            "base_earnings": float(p.base_earnings),
            "approved_incentives": float(p.approved_incentives),
            "approved_additional_earnings": float(p.approved_additional_earnings),
            "contractual_adjustments": float(p.contractual_adjustments),
            "gross_pay": float(p.gross_pay),
            "total_deductions": float(p.total_deductions),
            "withholdings": float(p.withholdings),
            "net_payable": float(p.net_payable),
            "paid_amount": float(p.paid_amount),
            "pending_amount": float(p.pending_amount),
            "status": p.status,
            "notes": p.notes,
            "calculated_at": str(p.calculated_at),
            "approved_at": str(p.approved_at) if p.approved_at else None,
            "finalized_at": str(p.finalized_at) if p.finalized_at else None,
        },
        "sessions": sessions,
        "vouchers": vouchers,
    }


@router.post("/monthly/{payroll_id}/submit")
async def submit_payroll(
    payroll_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*PAYROLL_ADMIN_ROLES)),
):
    await _get_payroll_or_404(db, payroll_id, current_user)
    try:
        p = await svc.submit_payroll_for_approval(db, payroll_id, current_user.id)
        return {"message": "Payroll submitted for approval", "payroll_id": p.id, "status": p.status}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/monthly/{payroll_id}/approve")
async def approve_payroll(
    payroll_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*PAYROLL_ADMIN_ROLES)),
):
    await _get_payroll_or_404(db, payroll_id, current_user)
    try:
        p = await svc.approve_payroll(db, payroll_id, current_user.id)
        return {"message": "Payroll approved successfully", "payroll_id": p.id, "status": p.status}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/monthly/{payroll_id}/finalize")
async def finalize_payroll(
    payroll_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*PAYROLL_ADMIN_ROLES)),
):
    await _get_payroll_or_404(db, payroll_id, current_user)
    try:
        p = await svc.finalize_and_lock_payroll(db, payroll_id, current_user.id)
        return {"message": "Payroll finalized and locked", "payroll_id": p.id, "status": p.status}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/monthly/{payroll_id}/adjust")
async def adjust_payroll(
    payroll_id: int,
    payload: AdjustPayrollSchema,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*PAYROLL_ADMIN_ROLES)),
):
    await _get_payroll_or_404(db, payroll_id, current_user)
    try:
        p = await svc.apply_payroll_adjustments(db, payroll_id, payload.model_dump(exclude_unset=True), current_user.id)
        return {"message": "Payroll adjustments applied", "payroll_id": p.id, "net_payable": float(p.net_payable)}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============================================================================
# 4. PAYMENT VOUCHERS & LEDGER ENDPOINTS
# ============================================================================

@router.get("/vouchers")
async def list_payment_vouchers(
    teacher_id: Optional[int] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    status: Optional[str] = Query(None),
    institution_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*PAYROLL_VIEW_ROLES)),
):
    """Lists teacher payment vouchers with accounting classifications."""
    inst_id = _resolve_inst_id(current_user, institution_id)
    if (current_user.role or "").lower() == "teacher":
        teacher_id = current_user.id

    conditions = [TeacherPaymentVoucher.institution_id == inst_id]
    if teacher_id:
        conditions.append(TeacherPaymentVoucher.teacher_user_id == teacher_id)
    if date_from:
        conditions.append(TeacherPaymentVoucher.payment_date >= date_from)
    if date_to:
        conditions.append(TeacherPaymentVoucher.payment_date <= date_to)
    if status:
        conditions.append(TeacherPaymentVoucher.status == status)

    stmt = (
        select(
            TeacherPaymentVoucher,
            func.concat(User.first_name, ' ', User.last_name).label("teacher_name"),
            TeacherPayroll.payroll_number,
        )
        .join(User, TeacherPaymentVoucher.teacher_user_id == User.id)
        .join(TeacherPayroll, TeacherPaymentVoucher.payroll_id == TeacherPayroll.id)
        .where(and_(*conditions))
        .order_by(desc(TeacherPaymentVoucher.payment_date), desc(TeacherPaymentVoucher.id))
    )
    result = await db.execute(stmt)
    rows = result.all()

    return [
        {
            "id": v.id,
            "voucher_number": v.voucher_number,
            "payroll_number": pr_num,
            "teacher_user_id": v.teacher_user_id,
            "teacher_name": t_name,
            "amount_paid": float(v.amount_paid),
            "payment_date": str(v.payment_date),
            "payment_method": v.payment_method,
            "transaction_reference": v.transaction_reference,
            "bank_name": v.bank_name,
            "cheque_number": v.cheque_number,
            "cheque_date": str(v.cheque_date) if v.cheque_date else None,
            "debit_account": v.debit_account,
            "credit_account": v.credit_account,
            "status": v.status,
            "notes": v.notes,
        }
        for v, t_name, pr_num in rows
    ]


@router.post("/monthly/{payroll_id}/vouchers")
async def record_payment_voucher(
    payroll_id: int,
    payload: RecordVoucherSchema,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*PAYROLL_ADMIN_ROLES)),
):
    """
    Records a payment voucher for teacher payroll.
    Enforces overpayment prevention: payment amount cannot exceed pending balance.
    """
    await _get_payroll_or_404(db, payroll_id, current_user)
    try:
        voucher = await svc.record_payment_voucher(
            db=db,
            payroll_id=payroll_id,
            data=payload.model_dump(),
            recorded_by_user_id=current_user.id,
        )
        return {
            "message": "Payment voucher recorded successfully",
            "voucher_id": voucher.id,
            "voucher_number": voucher.voucher_number,
            "amount_paid": float(voucher.amount_paid),
            "status": voucher.status,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/vouchers/{voucher_id}/reverse")
async def reverse_payment_voucher(
    voucher_id: int,
    payload: ReverseVoucherSchema,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*PAYROLL_ADMIN_ROLES)),
):
    """Reverses a posted payment voucher, restoring pending amount on payroll."""
    target_voucher = (
        await db.execute(select(TeacherPaymentVoucher).where(TeacherPaymentVoucher.id == voucher_id))
    ).scalar_one_or_none()
    if not target_voucher:
        raise HTTPException(status_code=404, detail="Payment voucher not found")
    check_institution_access(target_voucher.institution_id, current_user)
    try:
        voucher = await svc.reverse_payment_voucher(
            db=db,
            voucher_id=voucher_id,
            reversal_reason=payload.reversal_reason,
            reversed_by_user_id=current_user.id,
        )
        return {
            "message": "Payment voucher reversed successfully",
            "voucher_id": voucher.id,
            "status": voucher.status,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============================================================================
# 5. SPECIALIZED REPORTS & EXCEL EXPORTS (10 REPORTS)
# ============================================================================

def _authorize_report_scope(
    report_type: str,
    teacher_id: Optional[int],
    institution_id: Optional[int],
    current_user: User,
) -> tuple[int, Optional[int]]:
    inst_id = _resolve_inst_id(current_user, institution_id)
    if (current_user.role or "").lower() == "teacher":
        if report_type != "teacher-history":
            raise HTTPException(status_code=403, detail="Insufficient permissions for institution-wide payroll reports")
        return inst_id, current_user.id
    return inst_id, teacher_id


@router.get("/reports/{report_type}")
async def get_specialized_report(
    report_type: str,
    month: Optional[int] = Query(None),
    year: Optional[int] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    teacher_id: Optional[int] = Query(None),
    institution_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*PAYROLL_VIEW_ROLES)),
):
    """Generates JSON datasets for all 10 specialized reports."""
    inst_id, scoped_teacher_id = _authorize_report_scope(report_type, teacher_id, institution_id, current_user)
    today = date.today()
    s_date = start_date or date(today.year, 1, 1)
    e_date = end_date or today
    r_year = year or today.year
    r_month = month or today.month

    if report_type == "monthly-register":
        return await svc.get_monthly_payment_register(db, r_month, r_year, inst_id)
    elif report_type == "teacher-history":
        tid = scoped_teacher_id or current_user.id
        return await svc.get_teacher_payment_history(db, tid, inst_id)
    elif report_type == "teaching-hours":
        return await svc.get_teaching_hours_report(db, s_date, e_date, inst_id)
    elif report_type == "batch-cost":
        return await svc.get_batch_wise_teaching_cost(db, s_date, e_date, inst_id)
    elif report_type == "subject-cost":
        return await svc.get_subject_wise_teaching_cost(db, s_date, e_date, inst_id)
    elif report_type == "pending-payments":
        return await svc.get_pending_payments_report(db, inst_id)
    elif report_type == "voucher-register":
        return await svc.get_voucher_register(db, s_date, e_date, inst_id)
    elif report_type == "adjustments":
        return await svc.get_payroll_adjustments_report(db, r_year, inst_id)
    elif report_type == "approval-history":
        return await svc.get_approval_history_report(db, s_date, e_date, inst_id)
    elif report_type == "monthly-summary":
        return await svc.get_monthly_cost_summary(db, r_year, inst_id)
    else:
        raise HTTPException(status_code=400, detail=f"Unknown report type: {report_type}")


@router.get("/reports/{report_type}/export")
async def export_specialized_report(
    report_type: str,
    month: Optional[int] = Query(None),
    year: Optional[int] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    teacher_id: Optional[int] = Query(None),
    institution_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*PAYROLL_VIEW_ROLES)),
):
    """Exports any of the 10 reports as a styled, branded Excel spreadsheet."""
    inst_id, scoped_teacher_id = _authorize_report_scope(report_type, teacher_id, institution_id, current_user)
    today = date.today()
    s_date = start_date or date(today.year, 1, 1)
    e_date = end_date or today
    r_year = year or today.year
    r_month = month or today.month

    if report_type == "monthly-register":
        data = await svc.get_monthly_payment_register(db, r_month, r_year, inst_id)
        headers = ["Payroll #", "Teacher Name", "Method", "Hours", "Lectures", "Base (₹)", "Incentives (₹)", "Deductions (₹)", "Net Payable (₹)", "Paid (₹)", "Pending (₹)", "Status"]
        rows = [
            [d["payroll_number"], d["teacher_name"], d["payment_method"], d["teaching_hours"], d["completed_lectures"], d["base_earnings"], d["incentives"], d["deductions"], d["net_payable"], d["paid_amount"], d["pending_amount"], d["status"]]
            for d in data
        ]
        title = f"Monthly Teacher Payment Register — {r_month:02d}/{r_year}"
    elif report_type == "teacher-history":
        tid = scoped_teacher_id or current_user.id
        data = await svc.get_teacher_payment_history(db, tid, inst_id)
        headers = ["Voucher #", "Payroll #", "Period", "Amount Paid (₹)", "Date", "Method", "Reference", "Bank", "Status"]
        rows = [
            [d["voucher_number"], d["payroll_number"], d["period"], d["amount_paid"], d["payment_date"], d["payment_method"], d["transaction_reference"], d["bank_name"], d["status"]]
            for d in data
        ]
        title = f"Teacher Payment History — Teacher ID #{tid}"
    elif report_type == "teaching-hours":
        data = await svc.get_teaching_hours_report(db, s_date, e_date, inst_id)
        headers = ["Teacher Name", "Total Sessions", "Total Hours", "Total Amount (₹)"]
        rows = [[d["teacher_name"], d["total_sessions"], d["total_hours"], d["total_amount"]] for d in data]
        title = f"Teaching Hours Report ({s_date} to {e_date})"
    elif report_type == "batch-cost":
        data = await svc.get_batch_wise_teaching_cost(db, s_date, e_date, inst_id)
        headers = ["Batch / Division", "Session Count", "Hours", "Total Teaching Cost (₹)"]
        rows = [[d["batch_name"], d["session_count"], d["hours"], d["total_cost"]] for d in data]
        title = f"Batch-wise Teaching Cost Report ({s_date} to {e_date})"
    elif report_type == "subject-cost":
        data = await svc.get_subject_wise_teaching_cost(db, s_date, e_date, inst_id)
        headers = ["Subject Name", "Session Count", "Hours", "Total Teaching Cost (₹)"]
        rows = [[d["subject_name"], d["session_count"], d["hours"], d["total_cost"]] for d in data]
        title = f"Subject-wise Teaching Cost Report ({s_date} to {e_date})"
    elif report_type == "pending-payments":
        data = await svc.get_pending_payments_report(db, inst_id)
        headers = ["Payroll #", "Teacher Name", "Period", "Net Payable (₹)", "Paid Amount (₹)", "Pending Amount (₹)", "Status"]
        rows = [[d["payroll_number"], d["teacher_name"], d["period"], d["net_payable"], d["paid_amount"], d["pending_amount"], d["status"]] for d in data]
        title = "Pending Teacher Payments Report"
    elif report_type == "voucher-register":
        data = await svc.get_voucher_register(db, s_date, e_date, inst_id)
        headers = ["Voucher #", "Date", "Teacher Name", "Payroll #", "Amount (₹)", "Method", "Debit Account", "Credit Account", "Reference", "Status"]
        rows = [[d["voucher_number"], d["payment_date"], d["teacher_name"], d["payroll_number"], d["amount_paid"], d["payment_method"], d["debit_account"], d["credit_account"], d["reference"], d["status"]] for d in data]
        title = f"Teacher Payment Voucher Register ({s_date} to {e_date})"
    elif report_type == "adjustments":
        data = await svc.get_payroll_adjustments_report(db, r_year, inst_id)
        headers = ["Payroll #", "Teacher Name", "Period", "Base (₹)", "Incentives (₹)", "Additional (₹)", "Deductions (₹)", "Withholdings (₹)", "Net (₹)", "Notes"]
        rows = [[d["payroll_number"], d["teacher_name"], d["period"], d["base_earnings"], d["incentives"], d["additional"], d["deductions"], d["withholdings"], d["net_payable"], d["notes"]] for d in data]
        title = f"Payroll Adjustment & Bonus Report — Year {r_year}"
    elif report_type == "approval-history":
        data = await svc.get_approval_history_report(db, s_date, e_date, inst_id)
        headers = ["Session Code", "Date", "Teacher Name", "Hours", "Amount (₹)", "Approval Status", "Rejection Reason", "Approved At"]
        rows = [[d["session_code"], d["session_date"], d["teacher_name"], d["duration_hours"], d["amount"], d["approval_status"], d["rejection_reason"], d["approved_at"]] for d in data]
        title = f"Session Approval History ({s_date} to {e_date})"
    elif report_type == "monthly-summary":
        data = await svc.get_monthly_cost_summary(db, r_year, inst_id)
        headers = ["Month", "Teacher Count", "Gross Total (₹)", "Deductions Total (₹)", "Net Payable (₹)", "Paid Total (₹)", "Pending Total (₹)"]
        rows = [[d["month_name"], d["teacher_count"], d["gross_total"], d["deductions_total"], d["net_total"], d["paid_total"], d["pending_total"]] for d in data]
        title = f"Monthly Teaching Cost Summary — Year {r_year}"
    else:
        raise HTTPException(status_code=400, detail="Unknown report type")

    buf = svc.export_report_to_excel(title, headers, rows)
    filename = f"{report_type}_{today.strftime('%Y%m%d')}.xlsx"
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
