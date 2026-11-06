# /**
#  * @file        workforce_service.py
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
#  * @description Comprehensive domain service for Teacher and Staff workforce dashboards, unassigned teacher logic, employment lifecycle transitions, and unified employee activity history.
#  */

from datetime import datetime, timezone, date
from decimal import Decimal
from typing import Optional, List, Dict, Any, Set
from sqlalchemy import select, and_, or_, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.models.user import User, AuditLog
from app.models.staff import (
    StaffProfile,
    StaffDocument,
    TeacherAssignment,
    StaffAttendance,
    StaffLeave,
    StaffLeaveBalance,
    StaffEmploymentHistory,
)
from app.models.teacher_payroll import (
    TeacherPaymentProfile,
    TeachingSession,
    TeacherPayroll,
    TeacherPaymentVoucher,
)
from app.models.portal import TimetableEntry
from app.models.division import Division
from app.models.standard import Standard
from app.models.subject import Subject
from app.models.board import Board


async def get_teacher_workforce_dashboard(
    db: AsyncSession,
    institution_id: int = 1,
    academic_year_id: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Computes live teacher workforce metrics, assignment statuses, and aggregated teacher directory:
    - Unassigned vs Assigned vs No Timetable
    - Active vs Inactive vs Departed vs Upcoming Joining
    - Teaching hours, pending approvals, and payroll liabilities
    """
    today = date.today()

    # 1. Base query for teachers (users who have role='teacher' or staff_profile.staff_type='teacher')
    query = (
        select(User, StaffProfile)
        .outerjoin(StaffProfile, StaffProfile.user_id == User.id)
        .where(
            and_(
                User.institution_id == institution_id,
                or_(
                    User.role.ilike("%teacher%"),
                    StaffProfile.staff_type.ilike("%teacher%"),
                ),
            )
        )
    )
    rows = (await db.execute(query)).all()

    teacher_user_ids = [u.id for u, _ in rows]

    # 2. Fetch Active Academic Assignments for all teachers
    assign_query = select(TeacherAssignment).where(
        and_(
            TeacherAssignment.teacher_user_id.in_(teacher_user_ids) if teacher_user_ids else False,
            TeacherAssignment.is_active == True,
            TeacherAssignment.academic_year_id == academic_year_id if academic_year_id else True,
        )
    )
    all_assignments = (await db.execute(assign_query)).scalars().all()

    # Map teacher_user_id -> list of assignments
    assignments_by_teacher: Dict[int, List[TeacherAssignment]] = {}
    for a in all_assignments:
        assignments_by_teacher.setdefault(a.teacher_user_id, []).append(a)

    # 3. Fetch Active Timetable entries for all teachers
    tt_query = select(TimetableEntry).where(
        and_(
            TimetableEntry.teacher_id.in_(teacher_user_ids) if teacher_user_ids else False,
            TimetableEntry.is_active == True,
        )
    )
    all_tt = (await db.execute(tt_query)).scalars().all()
    tt_by_teacher: Dict[int, List[TimetableEntry]] = {}
    for t in all_tt:
        if t.teacher_id:
            tt_by_teacher.setdefault(t.teacher_id, []).append(t)

    # 4. Fetch Approved Leaves Active Today
    leave_query = select(StaffLeave).where(
        and_(
            StaffLeave.user_id.in_(teacher_user_ids) if teacher_user_ids else False,
            StaffLeave.status == "approved",
            StaffLeave.start_date <= today,
            StaffLeave.end_date >= today,
        )
    )
    active_leaves = (await db.execute(leave_query)).scalars().all()
    teachers_on_leave_ids = {l.user_id for l in active_leaves}

    # 5. Fetch Payment Profiles
    pay_prof_query = select(TeacherPaymentProfile).where(
        and_(
            TeacherPaymentProfile.teacher_user_id.in_(teacher_user_ids) if teacher_user_ids else False,
            TeacherPaymentProfile.is_active == True,
        )
    )
    all_pay_profiles = (await db.execute(pay_prof_query)).scalars().all()
    pay_profiles_by_teacher = {p.teacher_user_id: p for p in all_pay_profiles}

    # 6. Aggregate Teachers Directory and Classifications
    total_teachers = 0
    active_teachers = 0
    assigned_teachers = 0
    unassigned_teachers = 0
    teachers_without_timetable = 0
    teachers_on_leave = 0
    inactive_teachers = 0
    departed_teachers = 0
    upcoming_joining = 0

    teacher_list: List[Dict[str, Any]] = []

    for user, profile in rows:
        total_teachers += 1
        emp_status = (profile.status if profile else "active").lower()
        joining_date = profile.joining_date if profile else None
        user_is_active = user.is_active

        # Determine assignment classification
        user_assigns = assignments_by_teacher.get(user.id, [])
        user_tt = tt_by_teacher.get(user.id, [])
        is_assigned = len(user_assigns) > 0
        has_timetable = len(user_tt) > 0

        # Check Leave
        is_on_leave = (user.id in teachers_on_leave_ids) or (emp_status == "on_leave")

        # Lifecycle categorizations
        is_departed = emp_status in ("resigned", "terminated", "contract_ended")
        is_upcoming = emp_status in ("draft", "selected", "upcoming_joining") or (
            joining_date and joining_date > today
        )
        is_inactive = (not user_is_active) or (emp_status == "inactive")

        is_active = (not is_departed) and (not is_upcoming) and (not is_inactive) and user_is_active

        if is_departed:
            departed_teachers += 1
        elif is_upcoming:
            upcoming_joining += 1
        elif is_inactive:
            inactive_teachers += 1
        elif is_active:
            active_teachers += 1
            if is_on_leave:
                teachers_on_leave += 1

            if not is_assigned:
                unassigned_teachers += 1
            else:
                assigned_teachers += 1
                if not has_timetable:
                    teachers_without_timetable += 1

        # Calculate weekly workload hours from assignments
        weekly_hours = sum(a.weekly_hours for a in user_assigns)

        pay_prof = pay_profiles_by_teacher.get(user.id)

        teacher_list.append({
            "id": user.id,
            "employee_id": profile.employee_id if profile else (user.staff_code or f"TCH-{user.id:04d}"),
            "name": f"{user.first_name} {user.last_name}",
            "email": user.email,
            "phone": user.phone or "",
            "designation": user.designation or "Teacher / Faculty",
            "department": profile.department if profile else "Academics",
            "employment_type": profile.employment_type if profile else "full_time",
            "joining_date": profile.joining_date.isoformat() if profile and profile.joining_date else None,
            "status": "on_leave" if is_on_leave else emp_status if emp_status else ("active" if user_is_active else "inactive"),
            "is_active_employee": is_active,
            "is_assigned": is_assigned,
            "assignment_count": len(user_assigns),
            "weekly_hours": weekly_hours,
            "has_timetable": has_timetable,
            "timetable_slots_count": len(user_tt),
            "payment_method": pay_prof.payment_method if pay_prof else "hourly",
            "hourly_rate": float(pay_prof.hourly_rate) if pay_prof else 0.0,
            "per_lecture_rate": float(pay_prof.per_lecture_rate) if pay_prof else 0.0,
            "monthly_fixed_amount": float(pay_prof.monthly_fixed_amount) if pay_prof else 0.0,
            "qualification": profile.qualification if profile else "",
            "specialization": profile.specialization if profile else "",
            "is_departed": is_departed,
            "is_upcoming": is_upcoming,
            "exit_date": profile.exit_date.isoformat() if profile and profile.exit_date else None,
            "exit_reason": profile.exit_reason if profile else None,
            "rehire_eligible": profile.rehire_eligible if profile else True,
        })

    # 7. Operational Metrics (Teaching Hours, Pending Approvals, Payroll liabilities)
    # Pending Session Approvals
    session_pend_stmt = select(func.count(TeachingSession.id)).where(
        and_(
            TeachingSession.institution_id == institution_id,
            TeachingSession.approval_status == "submitted",
        )
    )
    pending_session_approvals = (await db.execute(session_pend_stmt)).scalar() or 0

    # Monthly Teaching Hours for Current Month
    first_of_month = date(today.year, today.month, 1)
    hours_stmt = select(func.coalesce(func.sum(TeachingSession.calculated_duration_hours), 0.0)).where(
        and_(
            TeachingSession.institution_id == institution_id,
            TeachingSession.session_date >= first_of_month,
            TeachingSession.session_date <= today,
            TeachingSession.session_status == "completed",
        )
    )
    monthly_teaching_hours = round(float((await db.execute(hours_stmt)).scalar() or 0.0), 1)

    # Monthly Payroll Payable for Current Month
    payroll_stmt = select(
        func.coalesce(func.sum(TeacherPayroll.net_payable), Decimal("0.00")),
        func.coalesce(func.sum(TeacherPayroll.pending_amount), Decimal("0.00")),
    ).where(
        and_(
            TeacherPayroll.institution_id == institution_id,
            TeacherPayroll.month == today.month,
            TeacherPayroll.year == today.year,
        )
    )
    pay_row = (await db.execute(payroll_stmt)).first()
    monthly_payroll_payable = float(pay_row[0]) if pay_row else 0.0
    pending_teacher_payments = float(pay_row[1]) if pay_row else 0.0

    return {
        "metrics": {
            "total_teachers": total_teachers,
            "active_teachers": active_teachers,
            "assigned_teachers": assigned_teachers,
            "unassigned_teachers": unassigned_teachers,
            "teachers_without_timetable": teachers_without_timetable,
            "teachers_on_leave": teachers_on_leave,
            "inactive_teachers": inactive_teachers,
            "departed_teachers": departed_teachers,
            "upcoming_joining": upcoming_joining,
            "pending_session_approvals": pending_session_approvals,
            "monthly_teaching_hours": monthly_teaching_hours,
            "monthly_payroll_payable": monthly_payroll_payable,
            "pending_teacher_payments": pending_teacher_payments,
        },
        "teachers": teacher_list,
    }


async def get_staff_workforce_dashboard(
    db: AsyncSession,
    institution_id: int = 1,
) -> Dict[str, Any]:
    """
    Computes non-teaching staff workforce metrics, department headcounts, and employee listings.
    """
    today = date.today()

    # Query non-teaching staff (staff_type != 'teacher' and role != 'teacher')
    query = (
        select(User, StaffProfile)
        .outerjoin(StaffProfile, StaffProfile.user_id == User.id)
        .where(
            and_(
                User.institution_id == institution_id,
                ~User.role.ilike("%teacher%"),
                or_(
                    StaffProfile.staff_type == None,
                    ~StaffProfile.staff_type.ilike("%teacher%"),
                ),
            )
        )
    )
    rows = (await db.execute(query)).all()

    staff_user_ids = [u.id for u, _ in rows]

    # Active Leaves
    leave_query = select(StaffLeave).where(
        and_(
            StaffLeave.user_id.in_(staff_user_ids) if staff_user_ids else False,
            StaffLeave.status == "approved",
            StaffLeave.start_date <= today,
            StaffLeave.end_date >= today,
        )
    )
    active_leaves = (await db.execute(leave_query)).scalars().all()
    staff_on_leave_ids = {l.user_id for l in active_leaves}

    total_staff = 0
    active_staff = 0
    unassigned_staff = 0
    staff_on_leave = 0
    inactive_staff = 0
    departed_staff = 0
    upcoming_joining = 0

    dept_counts: Dict[str, int] = {}
    desig_counts: Dict[str, int] = {}

    staff_list: List[Dict[str, Any]] = []

    for user, profile in rows:
        total_staff += 1
        emp_status = (profile.status if profile else "active").lower()
        joining_date = profile.joining_date if profile else None
        dept = (profile.department if profile else "General Administration") or "General Administration"
        desig = (user.designation or "Staff Specialist")

        is_on_leave = (user.id in staff_on_leave_ids) or (emp_status == "on_leave")
        is_departed = emp_status in ("resigned", "terminated", "contract_ended")
        is_upcoming = emp_status in ("draft", "selected", "upcoming_joining") or (
            joining_date and joining_date > today
        )
        is_inactive = (not user.is_active) or (emp_status == "inactive")
        is_active = (not is_departed) and (not is_upcoming) and (not is_inactive) and user.is_active

        is_unassigned = not profile or not profile.department or profile.department.lower() in ("unassigned", "none", "")

        if is_departed:
            departed_staff += 1
        elif is_upcoming:
            upcoming_joining += 1
        elif is_inactive:
            inactive_staff += 1
        elif is_active:
            active_staff += 1
            if is_on_leave:
                staff_on_leave += 1
            if is_unassigned:
                unassigned_staff += 1

            dept_counts[dept] = dept_counts.get(dept, 0) + 1
            desig_counts[desig] = desig_counts.get(desig, 0) + 1

        staff_list.append({
            "id": user.id,
            "employee_id": profile.employee_id if profile else (user.staff_code or f"STF-{user.id:04d}"),
            "name": f"{user.first_name} {user.last_name}",
            "email": user.email,
            "phone": user.phone or "",
            "designation": desig,
            "department": dept,
            "employment_type": profile.employment_type if profile else "full_time",
            "joining_date": profile.joining_date.isoformat() if profile and profile.joining_date else None,
            "status": "on_leave" if is_on_leave else emp_status if emp_status else ("active" if user.is_active else "inactive"),
            "basic_salary": float(profile.basic_salary) if profile else 0.0,
            "is_active_employee": is_active,
            "is_unassigned": is_unassigned,
            "is_departed": is_departed,
            "is_upcoming": is_upcoming,
            "exit_date": profile.exit_date.isoformat() if profile and profile.exit_date else None,
            "exit_reason": profile.exit_reason if profile else None,
            "rehire_eligible": profile.rehire_eligible if profile else True,
        })

    return {
        "metrics": {
            "total_staff": total_staff,
            "active_staff": active_staff,
            "unassigned_staff": unassigned_staff,
            "staff_on_leave": staff_on_leave,
            "inactive_staff": inactive_staff,
            "departed_staff": departed_staff,
            "upcoming_joining": upcoming_joining,
        },
        "department_headcounts": [{"department": k, "count": v} for k, v in dept_counts.items()],
        "designation_headcounts": [{"designation": k, "count": v} for k, v in desig_counts.items()],
        "staff": staff_list,
    }


async def update_employee_lifecycle(
    db: AsyncSession,
    user_id: int,
    action: str,  # activate | put_on_leave | deactivate | resign | terminate | end_contract | rehire
    effective_date: date,
    reason: Optional[str] = None,
    notes: Optional[str] = None,
    rehire_eligible: bool = True,
    current_user_id: int = 1,
) -> Dict[str, Any]:
    """
    Executes authoritative employment lifecycle state transition:
    - Modifies StaffProfile and User is_active status
    - Records immutable change event in StaffEmploymentHistory
    - Supports rejoining/rehiring without duplicating person identity
    """
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Employee / User record not found.")

    stmt = select(StaffProfile).where(StaffProfile.user_id == user_id)
    profile = (await db.execute(stmt)).scalar_one_or_none()
    if not profile:
        # Create profile if not yet initialized
        profile = StaffProfile(
            user_id=user_id,
            institution_id=user.institution_id or 1,
            employee_id=user.staff_code or f"EMP-{user.id:04d}",
            staff_type="teacher" if "teacher" in user.role.lower() else "staff",
            department="Academics" if "teacher" in user.role.lower() else "General Administration",
            status="active",
        )
        db.add(profile)
        await db.flush()

    old_status = profile.status
    new_status = old_status

    if action == "activate":
        new_status = "active"
        user.is_active = True
        profile.exit_date = None
        profile.exit_reason = None
    elif action == "put_on_leave":
        new_status = "on_leave"
    elif action == "deactivate":
        new_status = "inactive"
        user.is_active = False
    elif action == "resign":
        new_status = "resigned"
        user.is_active = False
        profile.exit_date = effective_date
        profile.exit_reason = reason or "Voluntary Resignation"
        profile.rehire_eligible = rehire_eligible
    elif action == "terminate":
        new_status = "terminated"
        user.is_active = False
        profile.exit_date = effective_date
        profile.exit_reason = reason or "Administrative Termination"
        profile.rehire_eligible = rehire_eligible
    elif action == "end_contract":
        new_status = "contract_ended"
        user.is_active = False
        profile.exit_date = effective_date
        profile.exit_reason = reason or "Contract Term Expired"
        profile.rehire_eligible = rehire_eligible
    elif action == "rehire":
        new_status = "active"
        user.is_active = True
        profile.joining_date = effective_date
        profile.exit_date = None
        profile.exit_reason = None
        profile.rehire_eligible = True
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported lifecycle action: {action}")

    profile.status = new_status
    profile.status_effective_date = effective_date
    profile.approved_by_id = current_user_id

    # Record historical ledger event
    history_entry = StaffEmploymentHistory(
        staff_profile_id=profile.id,
        user_id=user_id,
        event_type=action,
        old_status=old_status,
        new_status=new_status,
        effective_date=effective_date,
        reason=reason,
        notes=notes,
        recorded_by_id=current_user_id,
    )
    db.add(history_entry)

    # Also log to system audit logs
    audit = AuditLog(
        user_id=current_user_id,
        action=f"workforce_lifecycle_{action}",
        resource_type="staff",
        resource_id=user_id,
        details=f"Status transitioned from {old_status} to {new_status} (Effective: {effective_date}). Reason: {reason or 'N/A'}",
        severity="info" if action in ("activate", "rehire") else "warning",
    )
    db.add(audit)

    await db.commit()
    await db.refresh(profile)

    return {
        "status": "success",
        "action": action,
        "user_id": user_id,
        "old_status": old_status,
        "new_status": new_status,
        "effective_date": effective_date.isoformat(),
        "is_active": user.is_active,
    }


async def get_employee_activity_history(
    db: AsyncSession,
    user_id: int,
    limit: int = 50,
) -> List[Dict[str, Any]]:
    """
    Compiles a comprehensive, unified, chronological employee activity timeline (Phase 8):
    - Status transitions and rehires
    - Academic batch/subject assignments
    - Scheduled timetable slots
    - Attendance punches
    - Leave applications & approvals
    - Teaching sessions
    - Monthly payroll calculations & disbursements
    - Document uploads & verifications
    """
    events: List[Dict[str, Any]] = []

    # 1. Employment History Events
    emp_stmt = select(StaffEmploymentHistory).where(StaffEmploymentHistory.user_id == user_id)
    emp_histories = (await db.execute(emp_stmt)).scalars().all()
    for h in emp_histories:
        events.append({
            "timestamp": h.created_at.isoformat() if h.created_at else datetime.now(timezone.utc).isoformat(),
            "category": "lifecycle",
            "event_type": h.event_type,
            "title": f"Employment Status Changed: {h.new_status.replace('_', ' ').title()}",
            "details": f"Transitioned from {h.old_status or 'initial'} to {h.new_status}. Effective: {h.effective_date}. Reason: {h.reason or '—'}",
            "status": h.new_status,
            "record_id": h.id,
        })

    # 2. Academic Assignments
    assign_stmt = (
        select(TeacherAssignment, Subject, Division)
        .outerjoin(Subject, Subject.id == TeacherAssignment.subject_id)
        .outerjoin(Division, Division.id == TeacherAssignment.division_id)
        .where(TeacherAssignment.teacher_user_id == user_id)
    )
    assign_rows = (await db.execute(assign_stmt)).all()
    for a, sub, div in assign_rows:
        events.append({
            "timestamp": a.created_at.isoformat() if a.created_at else datetime.now(timezone.utc).isoformat(),
            "category": "assignment",
            "event_type": "batch_subject_assignment",
            "title": f"Assigned to {sub.name if sub else 'Subject'} ({div.name if div else 'Batch'})",
            "details": f"Workload: {a.weekly_hours} hrs/week. Class Teacher: {'Yes' if a.is_class_teacher else 'No'}. Active: {'Yes' if a.is_active else 'No'}.",
            "status": "active" if a.is_active else "ended",
            "record_id": a.id,
        })

    # 3. Teaching Sessions
    session_stmt = (
        select(TeachingSession, Subject)
        .outerjoin(Subject, Subject.id == TeachingSession.subject_id)
        .where(TeachingSession.teacher_user_id == user_id)
        .order_by(desc(TeachingSession.session_date))
        .limit(20)
    )
    session_rows = (await db.execute(session_stmt)).all()
    for s, sub in session_rows:
        events.append({
            "timestamp": s.created_at.isoformat() if s.created_at else datetime.now(timezone.utc).isoformat(),
            "category": "session",
            "event_type": "teaching_session",
            "title": f"Lecture Conducted: {sub.name if sub else 'Session'} ({s.session_code})",
            "details": f"Date: {s.session_date} ({s.scheduled_start_time}–{s.scheduled_end_time}). Duration: {s.calculated_duration_hours} hrs. Topic: {s.topic_taught or '—'}",
            "status": s.approval_status,
            "record_id": s.id,
        })

    # 4. Leaves
    leave_stmt = select(StaffLeave).where(StaffLeave.user_id == user_id).order_by(desc(StaffLeave.applied_at)).limit(15)
    leaves = (await db.execute(leave_stmt)).scalars().all()
    for l in leaves:
        events.append({
            "timestamp": l.applied_at.isoformat() if l.applied_at else datetime.now(timezone.utc).isoformat(),
            "category": "leave",
            "event_type": "leave_application",
            "title": f"{l.leave_type.title()} Leave ({l.status.title()})",
            "details": f"Period: {l.start_date} to {l.end_date} ({l.days_count} days). Reason: {l.reason}",
            "status": l.status,
            "record_id": l.id,
        })

    # 5. Payroll Computations & Disbursements
    pay_stmt = select(TeacherPayroll).where(TeacherPayroll.teacher_user_id == user_id).order_by(desc(TeacherPayroll.created_at)).limit(10)
    payrolls = (await db.execute(pay_stmt)).scalars().all()
    for p in payrolls:
        events.append({
            "timestamp": p.created_at.isoformat() if p.created_at else datetime.now(timezone.utc).isoformat(),
            "category": "payroll",
            "event_type": "monthly_payroll",
            "title": f"Payroll Statement #{p.payroll_number}",
            "details": f"Month: {p.month}/{p.year}. Hours: {p.total_teaching_hours}. Gross: ₹{p.gross_pay}, Net: ₹{p.net_payable}. Status: {p.status}",
            "status": p.status,
            "record_id": p.id,
        })

    # 6. Payment Vouchers
    voucher_stmt = select(TeacherPaymentVoucher).where(TeacherPaymentVoucher.teacher_user_id == user_id).order_by(desc(TeacherPaymentVoucher.payment_date)).limit(10)
    vouchers = (await db.execute(voucher_stmt)).scalars().all()
    for v in vouchers:
        events.append({
            "timestamp": v.created_at.isoformat() if v.created_at else datetime.now(timezone.utc).isoformat(),
            "category": "payment",
            "event_type": "payment_disbursement",
            "title": f"Disbursement Voucher #{v.voucher_number}",
            "details": f"Amount: ₹{v.amount_paid} via {v.payment_method}. Date: {v.payment_date}. Ref: {v.transaction_reference or '—'}",
            "status": v.status,
            "record_id": v.id,
        })

    # 7. Document Changes
    doc_stmt = select(StaffDocument).join(StaffProfile).where(StaffProfile.user_id == user_id)
    docs = (await db.execute(doc_stmt)).scalars().all()
    for d in docs:
        events.append({
            "timestamp": d.uploaded_at.isoformat() if d.uploaded_at else datetime.now(timezone.utc).isoformat(),
            "category": "document",
            "event_type": "document_upload",
            "title": f"Document Uploaded: {d.title}",
            "details": f"Type: {d.document_type} ({d.file_type}). Status: {d.verification_status}",
            "status": d.verification_status,
            "record_id": d.id,
        })

    # Sort all events reverse-chronologically
    events.sort(key=lambda x: x["timestamp"], reverse=True)
    return events[:limit]
