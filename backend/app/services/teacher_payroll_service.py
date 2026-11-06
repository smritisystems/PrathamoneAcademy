# /**
#  * @file        teacher_payroll_service.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      backend.app.services
#  *
#  * @author      Jawahar R. Mallah
#  * @organization AITDL (AI Technology & Development Lab)
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 AITDL
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-06
#  * @updated     2026-11-06
#  *
#  * @description Complete business logic and calculation engine for Teacher Payroll,
#  */

import io
import json
import re
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import List, Dict, Any, Optional, Tuple

import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

from sqlalchemy import select, and_, or_, func, desc, update, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User, AuditLog
from app.models.institution import Institution
from app.models.academic_year import AcademicYear
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


def sanitize_formula_injection(val: Any) -> Any:
    """Prevent Spreadsheet Formula Injection."""
    if val is None:
        return ""
    if isinstance(val, (int, float, Decimal, bool, date, datetime)):
        return val
    s = str(val).strip()
    if s and s[0] in ("=", "+", "-", "@", "\t", "\r"):
        return f"'{s}"
    return s


# ============================================================================
# 1. SEQUENTIAL CODE GENERATORS
# ============================================================================

async def generate_next_session_code(db: AsyncSession, session_date: date) -> str:
    """Format: SES-{YYYYMM}-{SEQ:04d} e.g. SES-202611-0001"""
    ym = session_date.strftime("%Y%m")
    prefix = f"SES-{ym}-"
    stmt = select(TeachingSession.session_code).where(
        TeachingSession.session_code.like(f"{prefix}%")
    ).order_by(desc(TeachingSession.id))
    result = await db.execute(stmt)
    codes = result.scalars().all()
    max_seq = 0
    for code in codes:
        try:
            seq_part = int(code.split("-")[-1])
            if seq_part > max_seq:
                max_seq = seq_part
        except (ValueError, IndexError):
            pass
    return f"{prefix}{max_seq + 1:04d}"


async def generate_next_payroll_number(db: AsyncSession, year: int, month: int) -> str:
    """Format: PRL-{YYYY}-{MM:02d}-{SEQ:04d} e.g. PRL-2026-11-0001"""
    prefix = f"PRL-{year}-{month:02d}-"
    stmt = select(TeacherPayroll.payroll_number).where(
        TeacherPayroll.payroll_number.like(f"{prefix}%")
    ).order_by(desc(TeacherPayroll.id))
    result = await db.execute(stmt)
    numbers = result.scalars().all()
    max_seq = 0
    for num in numbers:
        try:
            seq_part = int(num.split("-")[-1])
            if seq_part > max_seq:
                max_seq = seq_part
        except (ValueError, IndexError):
            pass
    return f"{prefix}{max_seq + 1:04d}"


async def generate_next_voucher_number(db: AsyncSession, payment_date: date) -> str:
    """Format: TPV-{YYYY}-{SEQ:04d} e.g. TPV-2026-0001"""
    year = payment_date.year
    prefix = f"TPV-{year}-"
    stmt = select(TeacherPaymentVoucher.voucher_number).where(
        TeacherPaymentVoucher.voucher_number.like(f"{prefix}%")
    ).order_by(desc(TeacherPaymentVoucher.id))
    result = await db.execute(stmt)
    numbers = result.scalars().all()
    max_seq = 0
    for num in numbers:
        try:
            seq_part = int(num.split("-")[-1])
            if seq_part > max_seq:
                max_seq = seq_part
        except (ValueError, IndexError):
            pass
    return f"{prefix}{max_seq + 1:04d}"


# ============================================================================
# 2. TEACHER PAYMENT PROFILES & RATE AUDIT TRAIL
# ============================================================================

async def get_or_create_payment_profile(
    db: AsyncSession,
    teacher_user_id: int,
    institution_id: int = 1,
) -> TeacherPaymentProfile:
    """Retrieves active profile or creates a default hourly payment profile."""
    stmt = select(TeacherPaymentProfile).where(
        and_(
            TeacherPaymentProfile.teacher_user_id == teacher_user_id,
            TeacherPaymentProfile.institution_id == institution_id,
            TeacherPaymentProfile.is_active.is_(True),
        )
    )
    result = await db.execute(stmt)
    profile = result.scalar_one_or_none()
    if not profile:
        profile = TeacherPaymentProfile(
            institution_id=institution_id,
            teacher_user_id=teacher_user_id,
            payment_method="hourly",
            hourly_rate=Decimal("500.00"),
            per_lecture_rate=Decimal("600.00"),
            monthly_fixed_amount=Decimal("0.00"),
            contract_total_amount=Decimal("0.00"),
            currency="INR",
            effective_from=date.today(),
            payment_frequency="monthly",
            is_active=True,
            notes="Initial default payment profile",
        )
        db.add(profile)
        await db.commit()
        await db.refresh(profile)
    return profile


async def update_payment_profile_rates(
    db: AsyncSession,
    profile_id: int,
    data: Dict[str, Any],
    changed_by_user_id: Optional[int] = None,
) -> TeacherPaymentProfile:
    """Updates profile rates and logs immutable rate history."""
    stmt = select(TeacherPaymentProfile).where(TeacherPaymentProfile.id == profile_id)
    result = await db.execute(stmt)
    profile = result.scalar_one_or_none()
    if not profile:
        raise ValueError(f"TeacherPaymentProfile with id {profile_id} not found.")

    old_method = profile.payment_method
    new_method = data.get("payment_method", profile.payment_method)

    # Determine old rate and new rate for audit based on new method
    old_rate = Decimal("0.00")
    new_rate = Decimal("0.00")
    if new_method == "hourly":
        old_rate = profile.hourly_rate
        new_rate = Decimal(str(data.get("hourly_rate", profile.hourly_rate)))
        profile.hourly_rate = new_rate
    elif new_method == "per_lecture":
        old_rate = profile.per_lecture_rate
        new_rate = Decimal(str(data.get("per_lecture_rate", profile.per_lecture_rate)))
        profile.per_lecture_rate = new_rate
    elif new_method == "monthly_fixed":
        old_rate = profile.monthly_fixed_amount
        new_rate = Decimal(str(data.get("monthly_fixed_amount", profile.monthly_fixed_amount)))
        profile.monthly_fixed_amount = new_rate
    elif new_method == "fixed_contract":
        old_rate = profile.contract_total_amount
        new_rate = Decimal(str(data.get("contract_total_amount", profile.contract_total_amount)))
        profile.contract_total_amount = new_rate

    # Record rate history
    reason = data.get("reason", "Standard rate adjustment / revision")
    effective_from = data.get("effective_from") or date.today()
    if isinstance(effective_from, str):
        effective_from = datetime.strptime(effective_from, "%Y-%m-%d").date()

    history = TeacherRateHistory(
        payment_profile_id=profile.id,
        teacher_user_id=profile.teacher_user_id,
        old_payment_method=old_method,
        new_payment_method=new_method,
        old_rate=old_rate,
        new_rate=new_rate,
        effective_from=effective_from,
        reason=reason,
        changed_by_id=changed_by_user_id,
    )
    db.add(history)

    profile.payment_method = new_method
    if "payment_frequency" in data:
        profile.payment_frequency = data["payment_frequency"]
    if "payment_terms" in data:
        profile.payment_terms = data["payment_terms"]
    if "notes" in data:
        profile.notes = data["notes"]
    if "effective_until" in data and data["effective_until"]:
        eu = data["effective_until"]
        profile.effective_until = datetime.strptime(eu, "%Y-%m-%d").date() if isinstance(eu, str) else eu

    profile.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(profile)
    return profile


async def add_contract_milestone(
    db: AsyncSession,
    profile_id: int,
    data: Dict[str, Any],
) -> TeacherContractMilestone:
    """Adds a contractual milestone for milestone-based compensation."""
    due_date = data.get("due_date")
    if isinstance(due_date, str) and due_date:
        due_date = datetime.strptime(due_date, "%Y-%m-%d").date()

    milestone = TeacherContractMilestone(
        payment_profile_id=profile_id,
        milestone_name=data["milestone_name"],
        milestone_order=int(data.get("milestone_order", 1)),
        amount=Decimal(str(data["amount"])),
        percentage=float(data.get("percentage", 0.0)),
        due_date=due_date,
        status="pending",
        notes=data.get("notes"),
    )
    db.add(milestone)
    await db.commit()
    await db.refresh(milestone)
    return milestone


# ============================================================================
# 3. TEACHING SESSION DURATION & REGISTER LOGGING
# ============================================================================

def parse_time_to_minutes(time_str: str) -> int:
    """Parses HH:MM (24-hour or 12-hour format) to minutes from midnight."""
    time_str = time_str.strip()
    # Check for AM/PM
    is_pm = "pm" in time_str.lower()
    is_am = "am" in time_str.lower()
    cleaned = re.sub(r"[^\d:]", "", time_str)
    parts = cleaned.split(":")
    hours = int(parts[0])
    mins = int(parts[1]) if len(parts) > 1 else 0
    if is_pm and hours < 12:
        hours += 12
    elif is_am and hours == 12:
        hours = 0
    return hours * 60 + mins


def calculate_session_duration(
    start_time: str,
    end_time: str,
    break_mins: int = 0,
) -> float:
    """Calculates duration in decimal hours (e.g. 1.5 hours)."""
    try:
        start_m = parse_time_to_minutes(start_time)
        end_m = parse_time_to_minutes(end_time)
        if end_m < start_m:
            # Crossed midnight
            end_m += 24 * 60
        net_minutes = max(0, (end_m - start_m) - break_mins)
        return round(net_minutes / 60.0, 2)
    except Exception:
        return 1.0


async def log_teaching_session(
    db: AsyncSession,
    data: Dict[str, Any],
    logged_by_user_id: Optional[int] = None,
) -> TeachingSession:
    """
    Logs an actual teaching session conducted by a teacher or substitute.
    Automatically assigns rate snapshot and calculated amount.
    """
    teacher_id = int(data["teacher_user_id"])
    inst_id = int(data.get("institution_id", 1))
    ay_id = int(data.get("academic_year_id", 1))
    sub_teacher_id = int(data["substitute_teacher_id"]) if data.get("substitute_teacher_id") else None

    # Determine effective teacher who delivered the lecture
    effective_teacher_id = sub_teacher_id if sub_teacher_id else teacher_id

    # Get active payment profile of the effective teacher
    profile = await get_or_create_payment_profile(db, effective_teacher_id, inst_id)

    # Session date
    sess_date = data["session_date"]
    if isinstance(sess_date, str):
        sess_date = datetime.strptime(sess_date, "%Y-%m-%d").date()

    sched_start = data.get("scheduled_start_time", "09:00")
    sched_end = data.get("scheduled_end_time", "10:00")
    act_start = data.get("actual_start_time") or sched_start
    act_end = data.get("actual_end_time") or sched_end
    break_mins = int(data.get("break_duration_minutes", 0))

    calc_duration = calculate_session_duration(act_start, act_end, break_mins)

    # Determine rate snapshot
    pay_method = profile.payment_method
    applicable_rate = Decimal("0.00")
    calc_amount = Decimal("0.00")

    if pay_method == "hourly":
        applicable_rate = profile.hourly_rate
        calc_amount = (applicable_rate * Decimal(str(calc_duration))).quantize(Decimal("0.01"))
    elif pay_method == "per_lecture":
        applicable_rate = profile.per_lecture_rate
        calc_amount = applicable_rate
    elif pay_method == "monthly_fixed":
        # Sessions tracked for attendance/verification, amount calculated at month end
        applicable_rate = profile.monthly_fixed_amount
        calc_amount = Decimal("0.00")
    elif pay_method == "fixed_contract":
        applicable_rate = profile.contract_total_amount
        calc_amount = Decimal("0.00")
    else:
        applicable_rate = profile.hourly_rate
        calc_amount = (applicable_rate * Decimal(str(calc_duration))).quantize(Decimal("0.01"))

    session_code = await generate_next_session_code(db, sess_date)

    session = TeachingSession(
        session_code=session_code,
        institution_id=inst_id,
        academic_year_id=ay_id,
        teacher_user_id=teacher_id,
        substitute_teacher_id=sub_teacher_id,
        subject_id=int(data["subject_id"]),
        division_id=int(data["division_id"]),
        timetable_entry_id=int(data["timetable_entry_id"]) if data.get("timetable_entry_id") else None,
        session_date=sess_date,
        scheduled_start_time=sched_start,
        scheduled_end_time=sched_end,
        actual_start_time=act_start,
        actual_end_time=act_end,
        break_duration_minutes=break_mins,
        calculated_duration_hours=calc_duration,
        payment_method=pay_method,
        applicable_rate=applicable_rate,
        calculated_amount=calc_amount,
        session_status=data.get("session_status", "completed"),
        approval_status=data.get("approval_status", "submitted"),
        topic_taught=data.get("topic_taught"),
        students_present_count=data.get("students_present_count"),
        is_payable=data.get("is_payable", True),
        remarks=data.get("remarks"),
        created_by_id=logged_by_user_id,
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


async def bulk_approve_sessions(
    db: AsyncSession,
    session_ids: List[int],
    approver_user_id: int,
) -> int:
    """Approves a list of teaching sessions in bulk."""
    if not session_ids:
        return 0
    now = datetime.utcnow()
    stmt = (
        update(TeachingSession)
        .where(
            and_(
                TeachingSession.id.in_(session_ids),
                TeachingSession.payroll_id.is_(None),  # cannot change if already locked in payroll
            )
        )
        .values(
            approval_status="approved",
            approved_by_id=approver_user_id,
            approved_at=now,
            rejection_reason=None,
        )
    )
    result = await db.execute(stmt)
    await db.commit()
    return result.rowcount


async def reject_teaching_session(
    db: AsyncSession,
    session_id: int,
    approver_user_id: int,
    reason: str,
) -> TeachingSession:
    """Rejects a teaching session with an explicit mandatory reason."""
    stmt = select(TeachingSession).where(TeachingSession.id == session_id)
    result = await db.execute(stmt)
    session = result.scalar_one_or_none()
    if not session:
        raise ValueError(f"TeachingSession with id {session_id} not found.")
    if session.payroll_id:
        raise ValueError("Cannot reject session because it is locked in a payroll.")

    session.approval_status = "rejected"
    session.rejection_reason = reason
    session.approved_by_id = approver_user_id
    session.is_payable = False
    session.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(session)
    return session


async def assign_substitute_teacher(
    db: AsyncSession,
    session_id: int,
    substitute_teacher_id: int,
    updated_by_user_id: int,
    reason: Optional[str] = None,
) -> TeachingSession:
    """Assigns substitute teacher to session and recalculates rate."""
    stmt = select(TeachingSession).where(TeachingSession.id == session_id)
    result = await db.execute(stmt)
    session = result.scalar_one_or_none()
    if not session:
        raise ValueError(f"TeachingSession with id {session_id} not found.")
    if session.payroll_id:
        raise ValueError("Cannot assign substitute because session is already locked in a payroll.")

    # Fetch substitute's profile
    sub_profile = await get_or_create_payment_profile(db, substitute_teacher_id, session.institution_id)

    session.substitute_teacher_id = substitute_teacher_id
    session.session_status = "substitute_assigned"
    session.payment_method = sub_profile.payment_method

    if sub_profile.payment_method == "hourly":
        session.applicable_rate = sub_profile.hourly_rate
        session.calculated_amount = (sub_profile.hourly_rate * Decimal(str(session.calculated_duration_hours))).quantize(Decimal("0.01"))
    elif sub_profile.payment_method == "per_lecture":
        session.applicable_rate = sub_profile.per_lecture_rate
        session.calculated_amount = sub_profile.per_lecture_rate

    if reason:
        session.remarks = f"{session.remarks or ''} | Substitute: {reason}".strip(" |")

    session.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(session)
    return session


# ============================================================================
# 4. PAYROLL CALCULATION ENGINE & ANTI-DOUBLE-COUNTING LOCK
# ============================================================================

async def calculate_monthly_payroll(
    db: AsyncSession,
    teacher_user_id: int,
    month: int,
    year: int,
    institution_id: int = 1,
    academic_year_id: int = 1,
    calculated_by_user_id: Optional[int] = None,
    allow_recalculation: bool = True,
) -> TeacherPayroll:
    """
    Calculates monthly payroll for a teacher across the selected month.
    Anti-double-counting protection: strictly checks `payroll_id IS NULL`
    or already attached to this specific payroll.
    """
    # 1. Determine period dates
    start_date = date(year, month, 1)
    if month == 12:
        end_date = date(year, 12, 31)
    else:
        next_month = date(year, month + 1, 1)
        end_date = next_month - timedelta(days=1)

    # 2. Check existing payroll record
    stmt = select(TeacherPayroll).where(
        and_(
            TeacherPayroll.teacher_user_id == teacher_user_id,
            TeacherPayroll.month == month,
            TeacherPayroll.year == year,
            TeacherPayroll.institution_id == institution_id,
        )
    )
    result = await db.execute(stmt)
    payroll = result.scalar_one_or_none()

    if payroll and payroll.status in ("finalized", "paid") and not allow_recalculation:
        raise ValueError(f"Payroll for {month}/{year} is locked/finalized and cannot be recalculated.")

    # 3. Retrieve teacher payment profile
    profile = await get_or_create_payment_profile(db, teacher_user_id, institution_id)
    pay_method = profile.payment_method

    # 4. Fetch approved, payable sessions in this period
    # Either primary teacher without substitute, OR substitute teacher
    sessions_stmt = select(TeachingSession).where(
        and_(
            TeachingSession.institution_id == institution_id,
            TeachingSession.session_date >= start_date,
            TeachingSession.session_date <= end_date,
            TeachingSession.approval_status == "approved",
            TeachingSession.is_payable.is_(True),
            or_(
                and_(TeachingSession.teacher_user_id == teacher_user_id, TeachingSession.substitute_teacher_id.is_(None)),
                TeachingSession.substitute_teacher_id == teacher_user_id,
            ),
            or_(
                TeachingSession.payroll_id.is_(None),
                TeachingSession.payroll_id == (payroll.id if payroll else -1),
            ),
        )
    )
    sess_result = await db.execute(sessions_stmt)
    sessions = sess_result.scalars().all()

    total_hours = 0.0
    total_lectures = 0
    base_earnings = Decimal("0.00")
    breakdown_list = []

    for s in sessions:
        total_hours += s.calculated_duration_hours
        total_lectures += 1
        breakdown_list.append({
            "session_id": s.id,
            "session_code": s.session_code,
            "date": str(s.session_date),
            "hours": s.calculated_duration_hours,
            "rate": str(s.applicable_rate),
            "amount": str(s.calculated_amount),
            "subject_id": s.subject_id,
            "division_id": s.division_id,
            "is_substitute": s.substitute_teacher_id == teacher_user_id,
        })

    # 5. Method-specific calculation
    if pay_method == "hourly":
        base_earnings = sum((Decimal(str(s.calculated_amount)) for s in sessions), Decimal("0.00"))
    elif pay_method == "per_lecture":
        base_earnings = sum((Decimal(str(s.calculated_amount)) for s in sessions), Decimal("0.00"))
    elif pay_method == "monthly_fixed":
        base_earnings = profile.monthly_fixed_amount
    elif pay_method == "fixed_contract":
        # Check approved milestones within this period
        ms_stmt = select(TeacherContractMilestone).where(
            and_(
                TeacherContractMilestone.payment_profile_id == profile.id,
                TeacherContractMilestone.status == "approved",
                TeacherContractMilestone.achieved_date >= start_date,
                TeacherContractMilestone.achieved_date <= end_date,
            )
        )
        ms_result = await db.execute(ms_stmt)
        milestones = ms_result.scalars().all()
        base_earnings = sum((m.amount for m in milestones), Decimal("0.00"))
    else:
        # Default hourly
        base_earnings = sum((Decimal(str(s.calculated_amount)) for s in sessions), Decimal("0.00"))

    # Preserve any existing manual adjustments/incentives/deductions
    incentives = payroll.approved_incentives if payroll else Decimal("0.00")
    additional = payroll.approved_additional_earnings if payroll else Decimal("0.00")
    contract_adj = payroll.contractual_adjustments if payroll else Decimal("0.00")
    deductions = payroll.total_deductions if payroll else Decimal("0.00")
    withholdings = payroll.withholdings if payroll else Decimal("0.00")
    paid_amt = payroll.paid_amount if payroll else Decimal("0.00")

    gross_pay = base_earnings + incentives + additional + contract_adj
    net_payable = max(Decimal("0.00"), gross_pay - deductions - withholdings)
    pending_amount = max(Decimal("0.00"), net_payable - paid_amt)

    breakdown_json = json.dumps({
        "calculated_at": datetime.utcnow().isoformat(),
        "payment_method": pay_method,
        "base_rate": str(profile.hourly_rate if pay_method == "hourly" else profile.per_lecture_rate if pay_method == "per_lecture" else profile.monthly_fixed_amount),
        "total_sessions": len(sessions),
        "sessions": breakdown_list,
    })

    if not payroll:
        payroll_number = await generate_next_payroll_number(db, year, month)
        payroll = TeacherPayroll(
            payroll_number=payroll_number,
            institution_id=institution_id,
            academic_year_id=academic_year_id,
            teacher_user_id=teacher_user_id,
            month=month,
            year=year,
            start_date=start_date,
            end_date=end_date,
            payment_method=pay_method,
            total_teaching_hours=round(total_hours, 2),
            total_completed_lectures=total_lectures,
            base_earnings=base_earnings,
            approved_incentives=incentives,
            approved_additional_earnings=additional,
            contractual_adjustments=contract_adj,
            gross_pay=gross_pay,
            total_deductions=deductions,
            withholdings=withholdings,
            net_payable=net_payable,
            paid_amount=paid_amt,
            pending_amount=pending_amount,
            calculation_breakdown_json=breakdown_json,
            status="calculated",
            calculated_by_id=calculated_by_user_id,
            calculated_at=datetime.utcnow(),
        )
        db.add(payroll)
        await db.commit()
        await db.refresh(payroll)
    else:
        payroll.payment_method = pay_method
        payroll.total_teaching_hours = round(total_hours, 2)
        payroll.total_completed_lectures = total_lectures
        payroll.base_earnings = base_earnings
        payroll.gross_pay = gross_pay
        payroll.net_payable = net_payable
        payroll.pending_amount = pending_amount
        payroll.calculation_breakdown_json = breakdown_json
        payroll.calculated_by_id = calculated_by_user_id
        payroll.calculated_at = datetime.utcnow()
        if payroll.status in ("draft", "rejected"):
            payroll.status = "calculated"
        payroll.updated_at = datetime.utcnow()
        await db.commit()
        await db.refresh(payroll)

    # Lock these sessions to this payroll_id
    if sessions:
        sess_ids = [s.id for s in sessions]
        await db.execute(
            update(TeachingSession)
            .where(TeachingSession.id.in_(sess_ids))
            .values(payroll_id=payroll.id)
        )
        await db.commit()

    return payroll


# ============================================================================
# 5. PAYROLL APPROVAL & FINALIZATION LIFECYCLE
# ============================================================================

async def submit_payroll_for_approval(
    db: AsyncSession,
    payroll_id: int,
    user_id: int,
) -> TeacherPayroll:
    stmt = select(TeacherPayroll).where(TeacherPayroll.id == payroll_id)
    result = await db.execute(stmt)
    payroll = result.scalar_one_or_none()
    if not payroll:
        raise ValueError(f"TeacherPayroll {payroll_id} not found.")
    if payroll.status not in ("calculated", "draft"):
        raise ValueError(f"Payroll in status '{payroll.status}' cannot be submitted.")
    payroll.status = "submitted"
    payroll.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(payroll)
    return payroll


async def approve_payroll(
    db: AsyncSession,
    payroll_id: int,
    approver_user_id: int,
) -> TeacherPayroll:
    stmt = select(TeacherPayroll).where(TeacherPayroll.id == payroll_id)
    result = await db.execute(stmt)
    payroll = result.scalar_one_or_none()
    if not payroll:
        raise ValueError(f"TeacherPayroll {payroll_id} not found.")
    if payroll.status not in ("submitted", "calculated"):
        raise ValueError(f"Payroll in status '{payroll.status}' cannot be approved.")
    # Prevent self-approval
    if payroll.teacher_user_id == approver_user_id:
        raise ValueError("Self-approval is strictly forbidden. Another administrator must approve.")

    payroll.status = "approved"
    payroll.approved_by_id = approver_user_id
    payroll.approved_at = datetime.utcnow()
    payroll.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(payroll)
    return payroll


async def finalize_and_lock_payroll(
    db: AsyncSession,
    payroll_id: int,
    finalizer_user_id: int,
) -> TeacherPayroll:
    stmt = select(TeacherPayroll).where(TeacherPayroll.id == payroll_id)
    result = await db.execute(stmt)
    payroll = result.scalar_one_or_none()
    if not payroll:
        raise ValueError(f"TeacherPayroll {payroll_id} not found.")
    if payroll.status not in ("approved", "partially_paid"):
        raise ValueError("Only approved payroll can be finalized and locked.")

    payroll.status = "finalized"
    payroll.finalized_by_id = finalizer_user_id
    payroll.finalized_at = datetime.utcnow()
    payroll.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(payroll)
    return payroll


async def apply_payroll_adjustments(
    db: AsyncSession,
    payroll_id: int,
    data: Dict[str, Any],
    adjusted_by_user_id: int,
) -> TeacherPayroll:
    """Applies incentives, bonuses, deductions, and withholdings."""
    stmt = select(TeacherPayroll).where(TeacherPayroll.id == payroll_id)
    result = await db.execute(stmt)
    payroll = result.scalar_one_or_none()
    if not payroll:
        raise ValueError(f"TeacherPayroll {payroll_id} not found.")
    if payroll.status == "finalized":
        raise ValueError("Cannot adjust a finalized and locked payroll.")

    if "approved_incentives" in data:
        payroll.approved_incentives = Decimal(str(data["approved_incentives"]))
    if "approved_additional_earnings" in data:
        payroll.approved_additional_earnings = Decimal(str(data["approved_additional_earnings"]))
    if "contractual_adjustments" in data:
        payroll.contractual_adjustments = Decimal(str(data["contractual_adjustments"]))
    if "total_deductions" in data:
        payroll.total_deductions = Decimal(str(data["total_deductions"]))
    if "withholdings" in data:
        payroll.withholdings = Decimal(str(data["withholdings"]))
    if "notes" in data:
        payroll.notes = data["notes"]

    payroll.gross_pay = (
        payroll.base_earnings
        + payroll.approved_incentives
        + payroll.approved_additional_earnings
        + payroll.contractual_adjustments
    )
    payroll.net_payable = max(Decimal("0.00"), payroll.gross_pay - payroll.total_deductions - payroll.withholdings)
    payroll.pending_amount = max(Decimal("0.00"), payroll.net_payable - payroll.paid_amount)
    payroll.updated_at = datetime.utcnow()

    # Log audit
    log = AuditLog(
        user_id=adjusted_by_user_id,
        action="payroll_adjustment",
        resource_type="teacher_payrolls",
        resource_id=payroll.id,
        details=f"Adjusted payroll {payroll.payroll_number}: Net={payroll.net_payable}",
    )
    db.add(log)

    await db.commit()
    await db.refresh(payroll)
    return payroll


# ============================================================================
# 6. PAYMENT PROCESSING & ACCOUNTING VOUCHERS
# ============================================================================

async def record_payment_voucher(
    db: AsyncSession,
    payroll_id: int,
    data: Dict[str, Any],
    recorded_by_user_id: int,
) -> TeacherPaymentVoucher:
    """
    Records a payment voucher against an approved/finalized payroll.
    Enforces overpayment protection: payment amount cannot exceed pending_amount.
    Directly writes to double-entry accounting ledger accounts:
      - Debit: 'Teacher Remuneration & Faculty Cost'
      - Credit: 'Main Operating Bank Account' (or Cash)
    """
    stmt = select(TeacherPayroll).where(TeacherPayroll.id == payroll_id).with_for_update()
    result = await db.execute(stmt)
    payroll = result.scalar_one_or_none()
    if not payroll:
        raise ValueError(f"TeacherPayroll {payroll_id} not found.")

    if payroll.status not in ("approved", "finalized", "partially_paid"):
        raise ValueError(f"Cannot record payment on payroll with status '{payroll.status}'. It must be approved or finalized.")

    amount_to_pay = Decimal(str(data["amount_paid"])).quantize(Decimal("0.01"))
    if amount_to_pay <= Decimal("0.00"):
        raise ValueError("Payment amount must be greater than zero.")

    if amount_to_pay > payroll.pending_amount:
        raise ValueError(
            f"Overpayment rejected! Requested payment amount ₹{amount_to_pay} exceeds pending balance ₹{payroll.pending_amount}."
        )

    pay_date = data.get("payment_date") or date.today()
    if isinstance(pay_date, str):
        pay_date = datetime.strptime(pay_date, "%Y-%m-%d").date()

    pay_method = data.get("payment_method", "bank_transfer")
    credit_acc = "Main Operating Bank Account"
    if pay_method == "cash":
        credit_acc = "Cash in Hand / Cash Counter"
    elif pay_method == "upi":
        credit_acc = "Main Operating Bank Account (UPI Gateway)"

    voucher_num = await generate_next_voucher_number(db, pay_date)

    voucher = TeacherPaymentVoucher(
        voucher_number=voucher_num,
        institution_id=payroll.institution_id,
        payroll_id=payroll.id,
        teacher_user_id=payroll.teacher_user_id,
        amount_paid=amount_to_pay,
        payment_date=pay_date,
        payment_method=pay_method,
        transaction_reference=data.get("transaction_reference"),
        bank_name=data.get("bank_name"),
        cheque_number=data.get("cheque_number"),
        cheque_date=datetime.strptime(data["cheque_date"], "%Y-%m-%d").date() if data.get("cheque_date") else None,
        debit_account="Teacher Remuneration & Faculty Cost",
        credit_account=credit_acc,
        recorded_by_id=recorded_by_user_id,
        status="posted",
        notes=data.get("notes"),
    )
    db.add(voucher)
    await db.flush()

    # Update payroll amounts
    payroll.paid_amount += amount_to_pay
    payroll.pending_amount = max(Decimal("0.00"), payroll.net_payable - payroll.paid_amount)
    if payroll.pending_amount == Decimal("0.00"):
        payroll.status = "paid"
    else:
        payroll.status = "partially_paid"
    payroll.updated_at = datetime.utcnow()

    # Log financial audit log
    audit_entry = AuditLog(
        user_id=recorded_by_user_id,
        action="record_teacher_payment",
        resource_type="teacher_payment_vouchers",
        resource_id=voucher.id,
        details=f"Paid ₹{amount_to_pay} via {pay_method} for Payroll {payroll.payroll_number} (Teacher ID {payroll.teacher_user_id})",
    )
    db.add(audit_entry)

    await db.commit()
    await db.refresh(voucher)
    return voucher


async def reverse_payment_voucher(
    db: AsyncSession,
    voucher_id: int,
    reversal_reason: str,
    reversed_by_user_id: int,
) -> TeacherPaymentVoucher:
    """Reverses a posted payment voucher, restoring pending amount on payroll."""
    stmt = select(TeacherPaymentVoucher).where(TeacherPaymentVoucher.id == voucher_id).with_for_update()
    result = await db.execute(stmt)
    voucher = result.scalar_one_or_none()
    if not voucher:
        raise ValueError(f"TeacherPaymentVoucher {voucher_id} not found.")
    if voucher.status == "reversed":
        raise ValueError("Voucher is already reversed.")

    payroll_stmt = select(TeacherPayroll).where(TeacherPayroll.id == voucher.payroll_id).with_for_update()
    p_res = await db.execute(payroll_stmt)
    payroll = p_res.scalar_one_or_none()
    if not payroll:
        raise ValueError("Associated payroll not found.")

    voucher.status = "reversed"
    voucher.reversal_reason = reversal_reason

    # Revert payroll amounts
    payroll.paid_amount = max(Decimal("0.00"), payroll.paid_amount - voucher.amount_paid)
    payroll.pending_amount = max(Decimal("0.00"), payroll.net_payable - payroll.paid_amount)
    if payroll.paid_amount == Decimal("0.00"):
        payroll.status = "finalized"
    else:
        payroll.status = "partially_paid"
    payroll.updated_at = datetime.utcnow()

    # Audit log
    audit_entry = AuditLog(
        user_id=reversed_by_user_id,
        action="reverse_teacher_payment",
        resource_type="teacher_payment_vouchers",
        resource_id=voucher.id,
        details=f"Reversed Voucher {voucher.voucher_number} for ₹{voucher.amount_paid}. Reason: {reversal_reason}",
    )
    db.add(audit_entry)

    await db.commit()
    await db.refresh(voucher)
    return voucher


# ============================================================================
# 7. SPECIALIZED REPORTS (ALL 10 REPORTS)
# ============================================================================

async def get_monthly_payment_register(
    db: AsyncSession,
    month: int,
    year: int,
    institution_id: int = 1,
) -> List[Dict[str, Any]]:
    """Report 1: Monthly Payment Register."""
    stmt = (
        select(TeacherPayroll, User)
        .join(User, TeacherPayroll.teacher_user_id == User.id)
        .where(
            and_(
                TeacherPayroll.institution_id == institution_id,
                TeacherPayroll.month == month,
                TeacherPayroll.year == year,
            )
        )
        .order_by(User.first_name, User.last_name)
    )
    result = await db.execute(stmt)
    rows = result.all()
    data = []
    for p, u in rows:
        data.append({
            "payroll_number": p.payroll_number,
            "teacher_name": u.full_name,
            "payment_method": p.payment_method,
            "teaching_hours": p.total_teaching_hours,
            "completed_lectures": p.total_completed_lectures,
            "base_earnings": float(p.base_earnings),
            "incentives": float(p.approved_incentives + p.approved_additional_earnings),
            "deductions": float(p.total_deductions + p.withholdings),
            "net_payable": float(p.net_payable),
            "paid_amount": float(p.paid_amount),
            "pending_amount": float(p.pending_amount),
            "status": p.status,
        })
    return data


async def get_teacher_payment_history(
    db: AsyncSession,
    teacher_user_id: int,
    institution_id: int = 1,
) -> List[Dict[str, Any]]:
    """Report 2: Teacher-wise Payment History."""
    stmt = (
        select(TeacherPaymentVoucher, TeacherPayroll)
        .join(TeacherPayroll, TeacherPaymentVoucher.payroll_id == TeacherPayroll.id)
        .where(
            and_(
                TeacherPaymentVoucher.teacher_user_id == teacher_user_id,
                TeacherPaymentVoucher.institution_id == institution_id,
            )
        )
        .order_by(desc(TeacherPaymentVoucher.payment_date))
    )
    result = await db.execute(stmt)
    rows = result.all()
    data = []
    for v, p in rows:
        data.append({
            "voucher_number": v.voucher_number,
            "payroll_number": p.payroll_number,
            "period": f"{p.month:02d}/{p.year}",
            "amount_paid": float(v.amount_paid),
            "payment_date": str(v.payment_date),
            "payment_method": v.payment_method,
            "transaction_reference": v.transaction_reference or "-",
            "bank_name": v.bank_name or "-",
            "status": v.status,
        })
    return data


async def get_teaching_hours_report(
    db: AsyncSession,
    start_date: date,
    end_date: date,
    institution_id: int = 1,
) -> List[Dict[str, Any]]:
    """Report 3: Teaching Hours Report."""
    stmt = (
        select(
            func.concat(User.first_name, ' ', User.last_name).label("teacher_name"),
            func.count(TeachingSession.id).label("total_sessions"),
            func.sum(TeachingSession.calculated_duration_hours).label("total_hours"),
            func.sum(TeachingSession.calculated_amount).label("total_amount"),
        )
        .join(User, TeachingSession.teacher_user_id == User.id)
        .where(
            and_(
                TeachingSession.institution_id == institution_id,
                TeachingSession.session_date >= start_date,
                TeachingSession.session_date <= end_date,
                TeachingSession.approval_status == "approved",
            )
        )
        .group_by(User.id, User.first_name, User.last_name)
        .order_by(desc("total_hours"))
    )
    result = await db.execute(stmt)
    return [
        {
            "teacher_name": r.teacher_name,
            "total_sessions": r.total_sessions or 0,
            "total_hours": round(float(r.total_hours or 0.0), 2),
            "total_amount": float(r.total_amount or 0.0),
        }
        for r in result.all()
    ]


async def get_batch_wise_teaching_cost(
    db: AsyncSession,
    start_date: date,
    end_date: date,
    institution_id: int = 1,
) -> List[Dict[str, Any]]:
    """Report 4: Batch-wise Teaching Cost Report."""
    stmt = (
        select(
            Division.name.label("batch_name"),
            func.count(TeachingSession.id).label("session_count"),
            func.sum(TeachingSession.calculated_duration_hours).label("hours"),
            func.sum(TeachingSession.calculated_amount).label("total_cost"),
        )
        .join(Division, TeachingSession.division_id == Division.id)
        .where(
            and_(
                TeachingSession.institution_id == institution_id,
                TeachingSession.session_date >= start_date,
                TeachingSession.session_date <= end_date,
                TeachingSession.approval_status == "approved",
            )
        )
        .group_by(Division.id, Division.name)
        .order_by(desc("total_cost"))
    )
    result = await db.execute(stmt)
    return [
        {
            "batch_name": r.batch_name,
            "session_count": r.session_count or 0,
            "hours": round(float(r.hours or 0.0), 2),
            "total_cost": float(r.total_cost or 0.0),
        }
        for r in result.all()
    ]


async def get_subject_wise_teaching_cost(
    db: AsyncSession,
    start_date: date,
    end_date: date,
    institution_id: int = 1,
) -> List[Dict[str, Any]]:
    """Report 5: Subject-wise Teaching Cost Report."""
    stmt = (
        select(
            Subject.name.label("subject_name"),
            func.count(TeachingSession.id).label("session_count"),
            func.sum(TeachingSession.calculated_duration_hours).label("hours"),
            func.sum(TeachingSession.calculated_amount).label("total_cost"),
        )
        .join(Subject, TeachingSession.subject_id == Subject.id)
        .where(
            and_(
                TeachingSession.institution_id == institution_id,
                TeachingSession.session_date >= start_date,
                TeachingSession.session_date <= end_date,
                TeachingSession.approval_status == "approved",
            )
        )
        .group_by(Subject.id, Subject.name)
        .order_by(desc("total_cost"))
    )
    result = await db.execute(stmt)
    return [
        {
            "subject_name": r.subject_name,
            "session_count": r.session_count or 0,
            "hours": round(float(r.hours or 0.0), 2),
            "total_cost": float(r.total_cost or 0.0),
        }
        for r in result.all()
    ]


async def get_pending_payments_report(
    db: AsyncSession,
    institution_id: int = 1,
) -> List[Dict[str, Any]]:
    """Report 6: Pending Teacher Payments."""
    stmt = (
        select(TeacherPayroll, User)
        .join(User, TeacherPayroll.teacher_user_id == User.id)
        .where(
            and_(
                TeacherPayroll.institution_id == institution_id,
                TeacherPayroll.pending_amount > Decimal("0.00"),
                TeacherPayroll.status.in_(["approved", "finalized", "partially_paid"]),
            )
        )
        .order_by(desc(TeacherPayroll.year), desc(TeacherPayroll.month), User.first_name, User.last_name)
    )
    result = await db.execute(stmt)
    rows = result.all()
    return [
        {
            "payroll_number": p.payroll_number,
            "teacher_name": u.full_name,
            "period": f"{p.month:02d}/{p.year}",
            "net_payable": float(p.net_payable),
            "paid_amount": float(p.paid_amount),
            "pending_amount": float(p.pending_amount),
            "status": p.status,
        }
        for p, u in rows
    ]


async def get_voucher_register(
    db: AsyncSession,
    start_date: date,
    end_date: date,
    institution_id: int = 1,
) -> List[Dict[str, Any]]:
    """Report 7: Teacher Payment Voucher Register."""
    stmt = (
        select(TeacherPaymentVoucher, User, TeacherPayroll)
        .join(User, TeacherPaymentVoucher.teacher_user_id == User.id)
        .join(TeacherPayroll, TeacherPaymentVoucher.payroll_id == TeacherPayroll.id)
        .where(
            and_(
                TeacherPaymentVoucher.institution_id == institution_id,
                TeacherPaymentVoucher.payment_date >= start_date,
                TeacherPaymentVoucher.payment_date <= end_date,
            )
        )
        .order_by(desc(TeacherPaymentVoucher.payment_date))
    )
    result = await db.execute(stmt)
    rows = result.all()
    return [
        {
            "voucher_number": v.voucher_number,
            "payment_date": str(v.payment_date),
            "teacher_name": u.full_name,
            "payroll_number": p.payroll_number,
            "amount_paid": float(v.amount_paid),
            "payment_method": v.payment_method,
            "debit_account": v.debit_account,
            "credit_account": v.credit_account,
            "reference": v.transaction_reference or v.cheque_number or "-",
            "status": v.status,
        }
        for v, u, p in rows
    ]


async def get_payroll_adjustments_report(
    db: AsyncSession,
    year: int,
    institution_id: int = 1,
) -> List[Dict[str, Any]]:
    """Report 8: Payroll Adjustment & Bonus Report."""
    stmt = (
        select(TeacherPayroll, User)
        .join(User, TeacherPayroll.teacher_user_id == User.id)
        .where(
            and_(
                TeacherPayroll.institution_id == institution_id,
                TeacherPayroll.year == year,
                or_(
                    TeacherPayroll.approved_incentives > Decimal("0.00"),
                    TeacherPayroll.approved_additional_earnings > Decimal("0.00"),
                    TeacherPayroll.total_deductions > Decimal("0.00"),
                    TeacherPayroll.withholdings > Decimal("0.00"),
                ),
            )
        )
        .order_by(desc(TeacherPayroll.month), User.first_name, User.last_name)
    )
    result = await db.execute(stmt)
    rows = result.all()
    return [
        {
            "payroll_number": p.payroll_number,
            "teacher_name": u.full_name,
            "period": f"{p.month:02d}/{p.year}",
            "base_earnings": float(p.base_earnings),
            "incentives": float(p.approved_incentives),
            "additional": float(p.approved_additional_earnings),
            "deductions": float(p.total_deductions),
            "withholdings": float(p.withholdings),
            "net_payable": float(p.net_payable),
            "notes": p.notes or "-",
        }
        for p, u in rows
    ]


async def get_approval_history_report(
    db: AsyncSession,
    start_date: date,
    end_date: date,
    institution_id: int = 1,
) -> List[Dict[str, Any]]:
    """Report 9: Teaching Session Approval History Report."""
    stmt = (
        select(
            TeachingSession,
            func.concat(User.first_name, ' ', User.last_name).label("teacher_name"),
        )
        .join(User, TeachingSession.teacher_user_id == User.id)
        .where(
            and_(
                TeachingSession.institution_id == institution_id,
                TeachingSession.session_date >= start_date,
                TeachingSession.session_date <= end_date,
            )
        )
        .order_by(desc(TeachingSession.session_date))
    )
    result = await db.execute(stmt)
    rows = result.all()
    return [
        {
            "session_code": s.session_code,
            "session_date": str(s.session_date),
            "teacher_name": teacher_name,
            "duration_hours": s.calculated_duration_hours,
            "amount": float(s.calculated_amount),
            "approval_status": s.approval_status,
            "rejection_reason": s.rejection_reason or "-",
            "approved_at": str(s.approved_at) if s.approved_at else "-",
        }
        for s, teacher_name in rows
    ]


async def get_monthly_cost_summary(
    db: AsyncSession,
    year: int,
    institution_id: int = 1,
) -> List[Dict[str, Any]]:
    """Report 10: Monthly Teaching Cost Summary (12-month overview)."""
    stmt = (
        select(
            TeacherPayroll.month,
            func.count(TeacherPayroll.id).label("teacher_count"),
            func.sum(TeacherPayroll.gross_pay).label("gross_total"),
            func.sum(TeacherPayroll.total_deductions).label("deductions_total"),
            func.sum(TeacherPayroll.net_payable).label("net_total"),
            func.sum(TeacherPayroll.paid_amount).label("paid_total"),
            func.sum(TeacherPayroll.pending_amount).label("pending_total"),
        )
        .where(
            and_(
                TeacherPayroll.institution_id == institution_id,
                TeacherPayroll.year == year,
            )
        )
        .group_by(TeacherPayroll.month)
        .order_by(TeacherPayroll.month)
    )
    result = await db.execute(stmt)
    rows = result.all()
    month_names = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    return [
        {
            "month_num": r.month,
            "month_name": month_names[r.month] if 1 <= r.month <= 12 else str(r.month),
            "year": year,
            "teacher_count": r.teacher_count or 0,
            "gross_total": float(r.gross_total or 0.0),
            "deductions_total": float(r.deductions_total or 0.0),
            "net_total": float(r.net_total or 0.0),
            "paid_total": float(r.paid_total or 0.0),
            "pending_total": float(r.pending_total or 0.0),
        }
        for r in rows
    ]


# ============================================================================
# 8. EXCEL EXPORT GENERATOR
# ============================================================================

def export_report_to_excel(
    report_title: str,
    headers: List[str],
    rows: List[List[Any]],
    subtitle: Optional[str] = None,
) -> io.BytesIO:
    """Generates a professional, branded Excel workbook adhering to PrathamOne EduOS design."""
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Report"

    # Brand Title
    ws.cell(row=1, column=1, value="PRATHAMONE EduOS — COACHING INSTITUTE EDITION")
    ws.cell(row=1, column=1).font = Font(name="Arial", size=14, bold=True, color="1E3A8A")

    ws.cell(row=2, column=1, value=report_title.upper())
    ws.cell(row=2, column=1).font = Font(name="Arial", size=12, bold=True, color="1F2937")

    if subtitle:
        ws.cell(row=3, column=1, value=subtitle)
        ws.cell(row=3, column=1).font = Font(name="Arial", size=10, italic=True, color="4B5563")

    header_row_idx = 5
    header_fill = PatternFill(start_color="1E3A8A", end_color="1E3A8A", fill_type="solid")
    header_font = Font(name="Arial", size=10, bold=True, color="FFFFFF")
    thin_border = Border(
        left=Side(style="thin", color="D1D5DB"),
        right=Side(style="thin", color="D1D5DB"),
        top=Side(style="thin", color="D1D5DB"),
        bottom=Side(style="thin", color="D1D5DB"),
    )

    for col_idx, h in enumerate(headers, 1):
        cell = ws.cell(row=header_row_idx, column=col_idx, value=h)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center")
        cell.border = thin_border

    # Data Rows
    current_row = header_row_idx + 1
    for r in rows:
        for col_idx, val in enumerate(r, 1):
            cell = ws.cell(row=current_row, column=col_idx, value=sanitize_formula_injection(val))
            cell.font = Font(name="Arial", size=9)
            cell.border = thin_border
            if isinstance(val, (int, float, Decimal)):
                cell.alignment = Alignment(horizontal="right", vertical="center")
            else:
                cell.alignment = Alignment(horizontal="left", vertical="center")
        current_row += 1

    # Auto-fit column widths
    for col in ws.columns:
        max_len = 0
        col_letter = get_column_letter(col[0].column)
        for cell in col:
            if cell.row >= header_row_idx and cell.value:
                max_len = max(max_len, len(str(cell.value)))
        ws.column_dimensions[col_letter].width = max(max_len + 4, 12)

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf
