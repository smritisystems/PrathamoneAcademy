# /**
#  * @file        auto_task_service.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      backend.app.services
#  *
#  * @author      Jawahar R. Mallah
#  * @organization Smritisys & AITDL Networks
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 PrathamOne EduOS
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-21
#  * @updated     2026-11-21
#  *
#  * @description Cross-module automated task creation and resolution engine with idempotency, anti-spam governance, and institutional triggers across Fees, CRM, Homework, Timetable, and Truancy.
#  */

import asyncio
import json
import logging
from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.attendance import Attendance
from app.models.crm import Lead
from app.models.division import Division
from app.models.exam import Examination, ExamMark
from app.models.fee import FeeInvoice
from app.models.homework import HomeworkAssignment, StudentHomeworkRecord
from app.models.institution import Institution
from app.models.planning import Activity, ActivityAssignee, ActivityReference
from app.models.portal import TimetableEntry
from app.models.staff import StaffAttendance, StaffLeave
from app.models.standard import Standard
from app.models.student import Student
from app.models.subject import Subject
from app.models.teacher_payroll import TeachingSession
from app.models.user import AuditLog, User

logger = logging.getLogger(__name__)


async def create_automated_task(
    db: AsyncSession,
    institution_id: int,
    title: str,
    description: Optional[str] = None,
    due_at: Optional[datetime] = None,
    source_type: str = "administrative",
    source_record_id: int = 0,
    priority: str = "normal",
    assignee_user_ids: Optional[List[int]] = None,
    created_by_id: Optional[int] = None,
    category: str = "administrative",
    location: Optional[str] = None,
) -> Tuple[Activity, bool]:
    """
    Creates an automated institutional task linked to a source entity.
    Enforces Rule 001 (SSOT) and Idempotency:
    If an open task already exists for this (source_type, source_record_id),
    it avoids creating a duplicate task and returns the existing record.

    Returns:
        Tuple[Activity, bool]: (activity, is_newly_created)
    """
    # ─── 1. IDEMPOTENCY / ANTI-SPAM DEDUPLICATION CHECK ─────────────────────
    if source_record_id > 0:
        existing_stmt = (
            select(Activity)
            .join(ActivityReference, ActivityReference.activity_id == Activity.id)
            .where(
                Activity.institution_id == institution_id,
                ActivityReference.source_type == source_type,
                ActivityReference.source_record_id == source_record_id,
                Activity.status.not_in(["completed", "cancelled"]),
            )
        )
        existing_res = await db.execute(existing_stmt)
        existing_activity = existing_res.scalars().first()
        if existing_activity:
            changed = False
            if due_at and (not existing_activity.due_at or due_at < existing_activity.due_at):
                existing_activity.due_at = due_at
                changed = True
            if priority in ("urgent", "high") and existing_activity.priority in ("low", "normal"):
                existing_activity.priority = priority
                changed = True
            if changed:
                await db.flush()
            return existing_activity, False

    # ─── 2. NORMALIZE TIMESTAMPS ────────────────────────────────────────────
    aware_due_at = due_at
    if aware_due_at and aware_due_at.tzinfo is None:
        aware_due_at = aware_due_at.replace(tzinfo=timezone.utc)

    clean_priority = priority if priority in ("low", "normal", "high", "urgent") else "normal"

    # ─── 3. CREATE CANONICAL ACTIVITY RECORD ─────────────────────────────────
    activity = Activity(
        institution_id=institution_id,
        title=title[:200].strip(),
        description=description,
        activity_type="task",
        category=category,
        start_at=aware_due_at,
        due_at=aware_due_at,
        timezone="Asia/Kolkata",
        all_day=False,
        location=location.strip() if location else None,
        priority=clean_priority,
        status="todo",
        visibility="institution",
        is_published=True,
        created_by_id=created_by_id,
    )
    db.add(activity)
    await db.flush()

    # ─── 4. ATTACH POLYMORPHIC REFERENCE ─────────────────────────────────────
    if source_record_id > 0:
        ref = ActivityReference(
            activity_id=activity.id,
            source_type=source_type,
            source_record_id=source_record_id,
        )
        db.add(ref)

    # ─── 5. ASSIGN RELEVANT USERS ───────────────────────────────────────────
    if assignee_user_ids:
        for uid in sorted(set(assignee_user_ids)):
            db.add(
                ActivityAssignee(
                    activity_id=activity.id,
                    user_id=uid,
                    assigned_by_id=created_by_id,
                )
            )

    # ─── 6. AUDIT TRAIL ──────────────────────────────────────────────────────
    db.add(
        AuditLog(
            user_id=created_by_id,
            institution_id=institution_id,
            action="AUTOMATED_TASK_CREATED",
            resource_type="activity",
            resource_id=activity.id,
            details=f"Automated task generated from {source_type} #{source_record_id}: {activity.title}",
            severity="info",
        )
    )
    await db.flush()
    return activity, True


async def resolve_automated_tasks(
    db: AsyncSession,
    institution_id: int,
    source_type: str,
    source_record_id: int,
    resolution_status: str = "completed",
    actor_id: Optional[int] = None,
) -> int:
    """
    Auto-resolves open activities bound to a source entity (e.g. invoice paid, lead enrolled).
    Eliminates Ghost Tasks and dual-state desynchronization.

    Returns:
        int: Number of resolved tasks.
    """
    clean_status = resolution_status if resolution_status in ("completed", "cancelled") else "completed"

    stmt = (
        select(Activity)
        .join(ActivityReference, ActivityReference.activity_id == Activity.id)
        .where(
            Activity.institution_id == institution_id,
            ActivityReference.source_type == source_type,
            ActivityReference.source_record_id == source_record_id,
            Activity.status.not_in(["completed", "cancelled"]),
        )
    )
    res = await db.execute(stmt)
    activities = res.scalars().all()

    resolved_count = 0
    for act in activities:
        act.status = clean_status
        resolved_count += 1
        db.add(
            AuditLog(
                user_id=actor_id,
                institution_id=institution_id,
                action="AUTOMATED_TASK_RESOLVED",
                resource_type="activity",
                resource_id=act.id,
                details=f"Task auto-resolved ({clean_status}) following {source_type} #{source_record_id} completion",
                severity="info",
            )
        )

    if resolved_count > 0:
        await db.flush()

    return resolved_count


# ─── 1. FEE DEFAULTER SCANNER ───────────────────────────────────────────────
async def sync_overdue_fee_tasks(
    db: AsyncSession,
    institution_id: int,
    academic_year_id: Optional[int] = None,
    created_by_id: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Scans for overdue fee invoices and creates / updates collection tasks.
    Safe to run repeatedly; idempotent due to create_automated_task anti-duplication logic.
    """
    today = date.today()
    query = (
        select(FeeInvoice, Student)
        .join(Student, Student.id == FeeInvoice.student_id)
        .where(
            Student.institution_id == institution_id,
            FeeInvoice.status.not_in(["paid", "cancelled", "written_off"]),
            FeeInvoice.outstanding_amount > Decimal("0.00"),
            FeeInvoice.due_date < today,
        )
    )
    if academic_year_id:
        query = query.where(FeeInvoice.academic_year_id == academic_year_id)

    res = await db.execute(query)
    rows = res.all()

    created_count = 0
    existing_count = 0

    for invoice, student in rows:
        due_datetime = (
            datetime.combine(invoice.due_date, time(17, 0, tzinfo=timezone.utc))
            if invoice.due_date
            else datetime.now(timezone.utc)
        )
        days_overdue = (today - invoice.due_date).days if invoice.due_date else 0
        priority = "urgent" if days_overdue >= 14 else "high"

        student_name = f"{student.first_name} {student.last_name}".strip()
        title = f"Collect Overdue Fee: Inv #{invoice.invoice_number} ({student_name})"
        desc = (
            f"Invoice #{invoice.invoice_number} is {days_overdue} days overdue. "
            f"Outstanding: ₹{invoice.outstanding_amount:,.2f}. "
            f"Student: {student_name} (Adm: {student.admission_number}). "
            f"Guardian Phone: {student.guardian_phone or 'N/A'}."
        )

        _, is_new = await create_automated_task(
            db=db,
            institution_id=institution_id,
            title=title,
            description=desc,
            due_at=due_datetime,
            source_type="fee_invoice",
            source_record_id=invoice.id,
            priority=priority,
            category="administrative",
            created_by_id=created_by_id,
        )
        if is_new:
            created_count += 1
        else:
            existing_count += 1

    return {
        "overdue_invoices_scanned": len(rows),
        "tasks_created": created_count,
        "tasks_already_active": existing_count,
    }


# ─── 2. HOMEWORK CHECKING & GRADING SCANNER ─────────────────────────────────
async def sync_homework_checking_tasks(
    db: AsyncSession,
    institution_id: int,
    academic_year_id: Optional[int] = None,
    created_by_id: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Scans for published homework assignments whose due date has passed
    and which have pending/unchecked student submissions.
    Generates evaluation tasks assigned to the responsible teacher.
    """
    today = date.today()
    stmt = (
        select(HomeworkAssignment, Subject.name.label("subject_name"), Division.name.label("division_name"))
        .join(Subject, Subject.id == HomeworkAssignment.subject_id)
        .outerjoin(Division, Division.id == HomeworkAssignment.division_id)
        .where(
            HomeworkAssignment.institution_id == institution_id,
            HomeworkAssignment.status.in_(["published", "closed"]),
            HomeworkAssignment.due_date < today,
        )
    )
    if academic_year_id:
        stmt = stmt.where(HomeworkAssignment.academic_year_id == academic_year_id)

    res = await db.execute(stmt)
    assignments = res.all()

    created_count = 0
    existing_count = 0

    for hw, subj_name, div_name in assignments:
        pending_recs = (
            await db.execute(
                select(func.count(StudentHomeworkRecord.id)).where(
                    StudentHomeworkRecord.assignment_id == hw.id,
                    StudentHomeworkRecord.review_status == "pending",
                )
            )
        ).scalar() or 0

        if pending_recs > 0:
            due_dt = datetime.combine(hw.due_date + timedelta(days=1), time(18, 0, tzinfo=timezone.utc))
            days_overdue = (today - hw.due_date).days
            priority = "urgent" if days_overdue >= 3 else "high"

            div_label = div_name or "All Batches"
            title = f"Grade Homework: {hw.title} ({div_label} · {subj_name})"
            desc = (
                f"Assignment '{hw.title}' (Code: {hw.assignment_code}) has {pending_recs} pending submissions "
                f"awaiting teacher review. Due date was {hw.due_date} ({days_overdue} days ago)."
            )

            _, is_new = await create_automated_task(
                db=db,
                institution_id=institution_id,
                title=title,
                description=desc,
                due_at=due_dt,
                source_type="homework_assignment",
                source_record_id=hw.id,
                priority=priority,
                category="academic",
                assignee_user_ids=[hw.teacher_user_id] if hw.teacher_user_id else None,
                created_by_id=created_by_id,
            )
            if is_new:
                created_count += 1
            else:
                existing_count += 1

    return {
        "assignments_scanned": len(assignments),
        "tasks_created": created_count,
        "tasks_already_active": existing_count,
    }


# ─── 3. TIMETABLE SUBSTITUTION & UNASSIGNED SLOTS SCANNER ───────────────────
async def sync_timetable_substitution_tasks(
    db: AsyncSession,
    institution_id: int,
    target_date: Optional[date] = None,
    created_by_id: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Scans timetable entries for:
    1. Unassigned slots (teacher_id IS NULL)
    2. Scheduled slots where assigned teacher is absent / on leave for target_date.
    Generates high-priority substitute allocation tasks.
    """
    check_date = target_date or date.today()
    day_name = check_date.strftime("%A")

    # 1. Query unassigned timetable slots for this institution
    unassigned_stmt = (
        select(TimetableEntry, Subject.name.label("subject_name"), Division.name.label("division_name"))
        .join(Division, Division.id == TimetableEntry.division_id)
        .join(Standard, Standard.id == Division.standard_id)
        .join(Subject, Subject.id == TimetableEntry.subject_id)
        .where(
            Standard.institution_id == institution_id,
            TimetableEntry.is_active == True,
            TimetableEntry.teacher_id == None,
        )
    )
    unassigned_res = await db.execute(unassigned_stmt)
    unassigned_slots = unassigned_res.all()

    created_count = 0
    existing_count = 0

    for slot, subj_name, div_name in unassigned_slots:
        title = f"Assign Faculty: {subj_name} ({div_name}) on {slot.day_of_week}s"
        desc = (
            f"Timetable entry #{slot.id} ({div_name} - {subj_name}) on {slot.day_of_week} "
            f"from {slot.start_time} to {slot.end_time} in {slot.room_number or 'Classroom'} has no assigned teacher."
        )
        _, is_new = await create_automated_task(
            db=db,
            institution_id=institution_id,
            title=title,
            description=desc,
            due_at=datetime.now(timezone.utc) + timedelta(days=2),
            source_type="timetable_entry",
            source_record_id=slot.id,
            priority="high",
            category="academic",
            created_by_id=created_by_id,
        )
        if is_new:
            created_count += 1
        else:
            existing_count += 1

    # 2. Check teachers marked absent on target_date
    absent_teacher_ids = (
        await db.execute(
            select(StaffAttendance.user_id)
            .join(User, User.id == StaffAttendance.user_id)
            .where(
                User.institution_id == institution_id,
                StaffAttendance.date == check_date,
                StaffAttendance.status.in_(["absent", "on_leave"]),
            )
        )
    ).scalars().all()

    on_leave_teacher_ids = (
        await db.execute(
            select(StaffLeave.user_id)
            .join(User, User.id == StaffLeave.user_id)
            .where(
                User.institution_id == institution_id,
                StaffLeave.status == "approved",
                StaffLeave.start_date <= check_date,
                StaffLeave.end_date >= check_date,
            )
        )
    ).scalars().all()

    unavailable_teacher_ids = set(absent_teacher_ids) | set(on_leave_teacher_ids)

    if unavailable_teacher_ids:
        sub_stmt = (
            select(
                TimetableEntry,
                Subject.name.label("subject_name"),
                Division.name.label("division_name"),
                User.first_name.label("teacher_first"),
                User.last_name.label("teacher_last"),
            )
            .join(Division, Division.id == TimetableEntry.division_id)
            .join(Standard, Standard.id == Division.standard_id)
            .join(Subject, Subject.id == TimetableEntry.subject_id)
            .join(User, User.id == TimetableEntry.teacher_id)
            .where(
                Standard.institution_id == institution_id,
                TimetableEntry.is_active == True,
                TimetableEntry.day_of_week == day_name,
                TimetableEntry.teacher_id.in_(unavailable_teacher_ids),
            )
        )
        sub_slots = (await db.execute(sub_stmt)).all()
        for slot, subj_name, div_name, t_first, t_last in sub_slots:
            t_name = f"{t_first} {t_last}".strip()
            title = f"Urgent Substitute Needed: {subj_name} ({div_name}) at {slot.start_time}"
            desc = (
                f"Faculty {t_name} is marked absent/on leave on {check_date}. "
                f"Classroom slot {slot.start_time} - {slot.end_time} in {slot.room_number or 'Classroom'} "
                f"for {div_name} requires an emergency substitute."
            )
            _, is_new = await create_automated_task(
                db=db,
                institution_id=institution_id,
                title=title,
                description=desc,
                due_at=datetime.combine(check_date, time(8, 0, tzinfo=timezone.utc)),
                source_type="timetable_entry",
                source_record_id=slot.id,
                priority="urgent",
                category="academic",
                created_by_id=created_by_id,
            )
            if is_new:
                created_count += 1
            else:
                existing_count += 1

    return {
        "date_checked": str(check_date),
        "unassigned_slots_scanned": len(unassigned_slots),
        "unavailable_teachers_count": len(unavailable_teacher_ids),
        "tasks_created": created_count,
        "tasks_already_active": existing_count,
    }


# ─── 4. STUDENT CHRONIC TRUANCY OUTREACH SCANNER ────────────────────────────
async def sync_student_truancy_tasks(
    db: AsyncSession,
    institution_id: int,
    consecutive_days: int = 2,
    created_by_id: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Scans attendance registers for students marked absent on consecutive recent dates.
    Generates parental outreach tasks to prevent dropout and course derailment.
    """
    today = date.today()
    check_window_start = today - timedelta(days=7)

    stmt = (
        select(Attendance.student_id, func.count(Attendance.id).label("absent_count"), Student)
        .join(Student, Student.id == Attendance.student_id)
        .where(
            Student.institution_id == institution_id,
            Student.is_active == True,
            Attendance.date >= check_window_start,
            Attendance.date <= today,
            Attendance.status == "absent",
        )
        .group_by(Attendance.student_id, Student.id)
        .having(func.count(Attendance.id) >= consecutive_days)
    )

    res = await db.execute(stmt)
    chronic_absentees = res.all()

    created_count = 0
    existing_count = 0

    for student_id, absent_count, student in chronic_absentees:
        student_name = f"{student.first_name} {student.last_name}".strip()
        title = f"Absence Outreach: {student_name} ({absent_count} days absent)"
        desc = (
            f"Student {student_name} (Adm: {student.admission_number}) has recorded {absent_count} absences "
            f"in the past week. Contact: {student.phone or 'No phone'}. "
            f"Contact guardian to verify welfare and prevent learning loss."
        )
        priority = "urgent" if absent_count >= 3 else "high"

        _, is_new = await create_automated_task(
            db=db,
            institution_id=institution_id,
            title=title,
            description=desc,
            due_at=datetime.now(timezone.utc) + timedelta(days=1),
            source_type="attendance",
            source_record_id=student.id,
            priority=priority,
            category="attendance",
            created_by_id=created_by_id,
        )
        if is_new:
            created_count += 1
        else:
            existing_count += 1

    return {
        "chronic_absentees_detected": len(chronic_absentees),
        "tasks_created": created_count,
        "tasks_already_active": existing_count,
    }


# ─── 5. CRM & ADMISSIONS SLA SCANNER ─────────────────────────────────────────
async def sync_crm_lead_followup_tasks(
    db: AsyncSession,
    institution_id: int,
    created_by_id: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Scans active CRM inquiries where next_follow_up_at has passed or new inquiries
    lack counselor outreach. Generates admissions tasks linked to the lead.
    """
    now_utc = datetime.now(timezone.utc)
    today = date.today()

    stmt = select(Lead).where(
        Lead.institution_id == institution_id,
        Lead.stage.not_in(["converted", "lost", "junk"]),
        or_(
            Lead.next_follow_up_at <= now_utc,
            and_(Lead.stage == "new_enquiry", Lead.enquiry_date < today),
        ),
    )
    res = await db.execute(stmt)
    overdue_leads = res.scalars().all()

    created_count = 0
    existing_count = 0

    for lead in overdue_leads:
        lead_name = f"{lead.first_name} {lead.last_name}".strip()
        priority = "urgent" if lead.priority == "hot" else "high"
        title = f"Admissions SLA: Follow-up {lead_name} ({lead.lead_number})"
        desc = (
            f"Inquiry #{lead.lead_number} ({lead_name}) is awaiting counselor contact. "
            f"Interested Course: {lead.interested_course or 'General'}. "
            f"Phone: {lead.phone or lead.guardian_phone or 'No phone'}. "
            f"Stage: {lead.stage}."
        )
        assignee_ids = [lead.assigned_to_id] if lead.assigned_to_id else None

        _, is_new = await create_automated_task(
            db=db,
            institution_id=institution_id,
            title=title,
            description=desc,
            due_at=lead.next_follow_up_at or (now_utc + timedelta(hours=4)),
            source_type="lead",
            source_record_id=lead.id,
            priority=priority,
            category="admissions",
            assignee_user_ids=assignee_ids,
            created_by_id=created_by_id,
        )
        if is_new:
            created_count += 1
        else:
            existing_count += 1

    return {
        "overdue_leads_detected": len(overdue_leads),
        "tasks_created": created_count,
        "tasks_already_active": existing_count,
    }


# ─── 6. EXAM MARKSHEET SUBMISSION SLA SCANNER ───────────────────────────────
async def sync_exam_marks_submission_tasks(
    db: AsyncSession,
    institution_id: int,
    academic_year_id: Optional[int] = None,
    created_by_id: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Scans completed examinations past end_date where student marks have not been submitted.
    Generates academic tasks assigned to faculty/coordinators.
    """
    today = date.today()
    cutoff_date = today - timedelta(days=2)

    stmt = (
        select(Examination, Standard.name.label("standard_name"))
        .join(Standard, Standard.id == Examination.standard_id)
        .where(
            Standard.institution_id == institution_id,
            Examination.is_active == True,
            Examination.end_date != None,
            Examination.end_date <= cutoff_date,
        )
    )
    if academic_year_id:
        stmt = stmt.where(Examination.academic_year_id == academic_year_id)

    res = await db.execute(stmt)
    exams = res.all()

    created_count = 0
    existing_count = 0

    for exam, std_name in exams:
        # Check count of marks submitted
        mark_count = (
            await db.execute(
                select(func.count(ExamMark.id)).where(ExamMark.examination_id == exam.id)
            )
        ).scalar() or 0

        # If 0 marks or missing submission, create task
        if mark_count == 0:
            title = f"Exam Marks Due: {exam.name} ({std_name})"
            desc = (
                f"Examination '{exam.name}' ({exam.exam_type}) concluded on {exam.end_date}. "
                f"Student marks have not been entered into the marks register. "
                f"Submit scores to enable report card generation."
            )
            _, is_new = await create_automated_task(
                db=db,
                institution_id=institution_id,
                title=title,
                description=desc,
                due_at=datetime.combine(cutoff_date + timedelta(days=2), time(18, 0, tzinfo=timezone.utc)),
                source_type="examination",
                source_record_id=exam.id,
                priority="high",
                category="examination",
                created_by_id=created_by_id,
            )
            if is_new:
                created_count += 1
            else:
                existing_count += 1

    return {
        "pending_exams_detected": len(exams),
        "tasks_created": created_count,
        "tasks_already_active": existing_count,
    }


# ─── 7. FACULTY SESSION VERIFICATION & PAYROLL CUTOFF SCANNER ────────────────
async def sync_faculty_session_verification_tasks(
    db: AsyncSession,
    institution_id: int,
    created_by_id: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Scans past teaching sessions that remain in 'draft' or 'submitted' status requiring sign-off.
    Ensures timely hourly/per-lecture verification prior to monthly payroll cutoff.
    """
    today = date.today()

    stmt = (
        select(TeachingSession, User.first_name, User.last_name, Subject.name.label("subject_name"))
        .join(User, User.id == TeachingSession.teacher_user_id)
        .join(Subject, Subject.id == TeachingSession.subject_id)
        .where(
            TeachingSession.institution_id == institution_id,
            TeachingSession.approval_status.in_(["submitted", "draft"]),
            TeachingSession.session_date < today,
        )
    )
    res = await db.execute(stmt)
    pending_sessions = res.all()

    created_count = 0
    existing_count = 0

    for session, t_first, t_last, subj_name in pending_sessions:
        t_name = f"{t_first} {t_last}".strip()
        title = f"Verify Session: {session.session_code} - {t_name} ({subj_name})"
        desc = (
            f"Teaching session #{session.session_code} on {session.session_date} "
            f"({session.calculated_duration_hours} hrs, ₹{session.calculated_amount}) by faculty {t_name} "
            f"requires administrative approval before payroll generation."
        )
        source_rec_id = session.timetable_entry_id if session.timetable_entry_id else session.division_id

        _, is_new = await create_automated_task(
            db=db,
            institution_id=institution_id,
            title=title,
            description=desc,
            due_at=datetime.combine(session.session_date + timedelta(days=2), time(17, 0, tzinfo=timezone.utc)),
            source_type="timetable_entry",
            source_record_id=source_rec_id,
            priority="normal",
            category="academic",
            created_by_id=created_by_id,
        )
        if is_new:
            created_count += 1
        else:
            existing_count += 1

    return {
        "pending_sessions_detected": len(pending_sessions),
        "tasks_created": created_count,
        "tasks_already_active": existing_count,
    }


# ─── 8. STUDENT BIRTHDAY & MILESTONE OUTREACH SCANNER ────────────────────────
async def sync_student_birthday_milestone_tasks(
    db: AsyncSession,
    institution_id: int,
    created_by_id: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Identifies enrolled students celebrating birthdays today.
    Generates front-desk outreach tasks to foster student connection and community.
    """
    today = date.today()

    stmt = select(Student).where(
        Student.institution_id == institution_id,
        Student.is_active == True,
        Student.date_of_birth != None,
        func.extract("month", Student.date_of_birth) == today.month,
        func.extract("day", Student.date_of_birth) == today.day,
    )
    res = await db.execute(stmt)
    birthday_students = res.scalars().all()

    created_count = 0
    existing_count = 0

    for student in birthday_students:
        student_name = f"{student.first_name} {student.last_name}".strip()
        age_turning = today.year - student.date_of_birth.year
        title = f"Birthday Greeting: {student_name} (Adm: {student.admission_number})"
        desc = (
            f"Student {student_name} turns {age_turning} today! "
            f"Contact Number: {student.phone or 'No phone'}. "
            f"Send institute WhatsApp birthday greeting or deliver greeting card."
        )
        _, is_new = await create_automated_task(
            db=db,
            institution_id=institution_id,
            title=title,
            description=desc,
            due_at=datetime.combine(today, time(12, 0, tzinfo=timezone.utc)),
            source_type="student",
            source_record_id=student.id,
            priority="normal",
            category="administrative",
            created_by_id=created_by_id,
        )
        if is_new:
            created_count += 1
        else:
            existing_count += 1

    return {
        "birthdays_today_detected": len(birthday_students),
        "tasks_created": created_count,
        "tasks_already_active": existing_count,
    }


# ─── 9. MASTER ORCHESTRATOR: UNIFIED TASK SYNCHRONIZATION ───────────────────
async def sync_all_automated_tasks(
    db: AsyncSession,
    institution_id: int,
    academic_year_id: Optional[int] = None,
    created_by_id: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Master orchestrator: Executes all 8 operational task scanners in a single unified run.
    Combines:
    1. Overdue Fee Invoices
    2. CRM & Admissions SLAs
    3. Pending Homework Evaluations
    4. Timetable Substitutions & Unassigned Slots
    5. Chronic Student Truancy Outreach
    6. Exam Marksheet Submission SLAs
    7. Teaching Session Verifications & Payroll Cutoffs
    8. Student Birthday & Community Milestones
    """
    fees_res = await sync_overdue_fee_tasks(
        db, institution_id, academic_year_id=academic_year_id, created_by_id=created_by_id
    )
    crm_res = await sync_crm_lead_followup_tasks(
        db, institution_id, created_by_id=created_by_id
    )
    homework_res = await sync_homework_checking_tasks(
        db, institution_id, academic_year_id=academic_year_id, created_by_id=created_by_id
    )
    timetable_res = await sync_timetable_substitution_tasks(
        db, institution_id, created_by_id=created_by_id
    )
    truancy_res = await sync_student_truancy_tasks(
        db, institution_id, consecutive_days=2, created_by_id=created_by_id
    )
    exam_res = await sync_exam_marks_submission_tasks(
        db, institution_id, academic_year_id=academic_year_id, created_by_id=created_by_id
    )
    session_res = await sync_faculty_session_verification_tasks(
        db, institution_id, created_by_id=created_by_id
    )
    birthday_res = await sync_student_birthday_milestone_tasks(
        db, institution_id, created_by_id=created_by_id
    )

    total_created = (
        fees_res["tasks_created"]
        + crm_res["tasks_created"]
        + homework_res["tasks_created"]
        + timetable_res["tasks_created"]
        + truancy_res["tasks_created"]
        + exam_res["tasks_created"]
        + session_res["tasks_created"]
        + birthday_res["tasks_created"]
    )
    total_active = (
        fees_res["tasks_already_active"]
        + crm_res["tasks_already_active"]
        + homework_res["tasks_already_active"]
        + timetable_res["tasks_already_active"]
        + truancy_res["tasks_already_active"]
        + exam_res["tasks_already_active"]
        + session_res["tasks_already_active"]
        + birthday_res["tasks_already_active"]
    )

    return {
        "total_created": total_created,
        "total_already_active": total_active,
        "fees": fees_res,
        "crm": crm_res,
        "homework": homework_res,
        "timetable": timetable_res,
        "truancy": truancy_res,
        "exam_marks": exam_res,
        "sessions": session_res,
        "birthdays": birthday_res,
    }


# ─── 10. AUTONOMOUS BACKGROUND SYNC DAEMON ──────────────────────────────────
async def run_daily_autonomous_sync_daemon():
    """
    Autonomous background worker that scans and pre-populates operational tasks
    across all active institutions daily at 06:30 AM (and upon startup).
    """
    logger.info("[AUTONOMOUS SYNC] Daemon initialized. Will execute daily task synchronization.")
    # Initial sleep on startup so container and db migrations are settled
    await asyncio.sleep(20)

    while True:
        try:
            from app.core.database import async_session_maker
            async with async_session_maker() as db:
                institutions = (
                    await db.execute(select(Institution.id).where(Institution.is_active == True))
                ).scalars().all()

                for inst_id in institutions:
                    try:
                        res = await sync_all_automated_tasks(db, institution_id=inst_id)
                        logger.info(
                            "[AUTONOMOUS SYNC] Inst %s synced: %d created, %d active.",
                            inst_id,
                            res["total_created"],
                            res["total_already_active"],
                        )
                    except Exception as inst_err:
                        logger.error("[AUTONOMOUS SYNC] Failed for institution %s: %s", inst_id, inst_err)

        except Exception as e:
            logger.error("[AUTONOMOUS SYNC] Daemon cycle encountered error: %s", e)

        # Sleep for next 6-hour cycle
        await asyncio.sleep(21600)


# ─── 6. HIGH-LEVEL KPI METRICS ──────────────────────────────────────────────
async def get_task_metrics_summary(
    db: AsyncSession,
    institution_id: int,
    user_id: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Returns high-level task metrics for dashboards, quick status bars, and Kanban summaries.
    """
    base_filter = [
        Activity.institution_id == institution_id,
        Activity.activity_type == "task",
    ]

    total_tasks = (
        await db.execute(select(func.count(Activity.id)).where(*base_filter))
    ).scalar() or 0

    todo_tasks = (
        await db.execute(select(func.count(Activity.id)).where(*base_filter, Activity.status == "todo"))
    ).scalar() or 0

    in_progress_tasks = (
        await db.execute(select(func.count(Activity.id)).where(*base_filter, Activity.status == "in_progress"))
    ).scalar() or 0

    completed_tasks = (
        await db.execute(select(func.count(Activity.id)).where(*base_filter, Activity.status == "completed"))
    ).scalar() or 0

    urgent_tasks = (
        await db.execute(
            select(func.count(Activity.id)).where(
                *base_filter,
                Activity.status.not_in(["completed", "cancelled"]),
                Activity.priority == "urgent",
            )
        )
    ).scalar() or 0

    now_utc = datetime.now(timezone.utc)
    overdue_tasks = (
        await db.execute(
            select(func.count(Activity.id)).where(
                *base_filter,
                Activity.status.not_in(["completed", "cancelled"]),
                Activity.due_at < now_utc,
            )
        )
    ).scalar() or 0

    return {
        "total_tasks": total_tasks,
        "todo": todo_tasks,
        "in_progress": in_progress_tasks,
        "completed": completed_tasks,
        "urgent": urgent_tasks,
        "overdue": overdue_tasks,
    }
