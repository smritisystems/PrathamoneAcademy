# /**
#  * @file        planning_service.py
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
#  * @created     2026-11-16
#  * @updated     2026-11-18
#  *
#  * @description Planning activity authorization, recurrence expansion, conflict detection, and read-only module projections.
#  */

import json
from datetime import date, datetime, time, timedelta, timezone
from typing import Any, Optional
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import HTTPException, status
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import (
    LEAD_READ_ROLES,
    check_institution_access,
    has_permission,
    has_resource_access,
    is_sysadmin,
)
from app.models.academic_year import AcademicYear
from app.models.attendance import Attendance
from app.models.communication import CommunicationLog
from app.models.division import Division
from app.models.exam import Examination
from app.models.fee import FeeInvoice
from app.models.homework import HomeworkAssignment
from app.models.institution import Institution
from app.models.planning import (
    Activity,
    ActivityAssignee,
    ActivityReference,
    ActivityRecurrenceException,
)
from app.models.portal import TimetableEntry
from app.models.crm import Lead, LeadDemoClass, LeadFollowUp
from app.models.standard import Standard
from app.models.staff import StaffProfile
from app.models.student import Student
from app.models.subject import Subject
from app.models.enrollment import StudentEnrollment
from app.models.user import AuditLog, User


STATUSES = ("backlog", "todo", "in_progress", "blocked", "completed", "cancelled")
PRIORITIES = ("low", "normal", "high", "urgent")
ACTIVITY_TYPES = ("task", "event", "holiday")
RECURRENCE_FREQUENCIES = ("daily", "weekly", "monthly")
SOURCE_TYPES = (
    "student",
    "lead",
    "fee_invoice",
    "attendance",
    "academic_year",
    "division",
    "subject",
    "examination",
    "timetable_entry",
    "communication_log",
    "homework_assignment",
)

STATUS_TRANSITIONS = {
    "backlog": {"todo", "cancelled"},
    "todo": {"backlog", "in_progress", "blocked", "completed", "cancelled"},
    "in_progress": {"todo", "blocked", "completed", "cancelled"},
    "blocked": {"todo", "in_progress", "cancelled"},
    "completed": {"todo"},
    "cancelled": {"todo"},
}


def _aware_utc(value: Optional[datetime]) -> Optional[datetime]:
    if value is None:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _local_zone(name: str) -> ZoneInfo:
    try:
        return ZoneInfo(name)
    except ZoneInfoNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unknown timezone '{name}'.",
        ) from exc


async def require_planning_permission(
    db: AsyncSession, user: User, action: str
) -> None:
    if not await has_permission(db, user, "planning", action):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Insufficient permissions: requires 'planning:{action}'.",
        )


async def get_activity(
    db: AsyncSession, activity_id: int, user: User, *, lock: bool = False
) -> Activity:
    stmt = (
        select(Activity)
        .options(
            selectinload(Activity.assignees).selectinload(ActivityAssignee.user),
            selectinload(Activity.attachments),
            selectinload(Activity.references),
            selectinload(Activity.recurrence_exceptions),
        )
        .where(Activity.id == activity_id)
    )
    if lock:
        stmt = stmt.with_for_update()
    activity = (
        await db.execute(stmt)
    ).scalar_one_or_none()
    if activity is None:
        raise HTTPException(status_code=404, detail="Activity not found.")
    check_institution_access(activity.institution_id, user)
    return activity


async def can_manage_activity(
    db: AsyncSession, activity: Activity, user: User
) -> bool:
    if is_sysadmin(user):
        return True
    if activity.created_by_id == user.id or any(
        assignee.user_id == user.id for assignee in activity.assignees
    ):
        return True
    return await has_permission(db, user, "planning", "edit_any")


async def ensure_activity_visible(
    db: AsyncSession, activity: Activity, user: User
) -> None:
    if activity.visibility == "institution" and activity.is_published:
        return
    if await has_permission(db, user, "planning", "view_all"):
        return
    if await can_manage_activity(db, activity, user):
        return
    raise HTTPException(status_code=404, detail="Activity not found.")


async def validate_academic_scope(
    db: AsyncSession,
    institution_id: int,
    academic_year_id: Optional[int],
    division_id: Optional[int],
    subject_id: Optional[int],
) -> None:
    if academic_year_id is not None:
        year = await db.get(AcademicYear, academic_year_id)
        if year is None or year.institution_id != institution_id:
            raise HTTPException(status_code=422, detail="Academic year is outside this institution.")
    division = None
    if division_id is not None:
        division = (
            await db.execute(
                select(Division)
                .join(Standard, Division.standard_id == Standard.id)
                .where(Division.id == division_id, Standard.institution_id == institution_id)
            )
        ).scalar_one_or_none()
        if division is None:
            raise HTTPException(status_code=422, detail="Class or batch is outside this institution.")
    if subject_id is not None:
        subject = await db.get(Subject, subject_id)
        if subject is None:
            raise HTTPException(status_code=422, detail="Subject does not exist.")
        if division is not None and subject.standard_id != division.standard_id:
            raise HTTPException(status_code=422, detail="Subject does not belong to the selected class.")


async def resolve_assignee_ids(
    db: AsyncSession,
    institution_id: int,
    user_ids: list[int],
    department_names: list[str],
) -> list[int]:
    resolved = set(user_ids)
    if department_names:
        rows = await db.execute(
            select(StaffProfile.user_id).where(
                StaffProfile.institution_id == institution_id,
                StaffProfile.department.in_(department_names),
                StaffProfile.status == "active",
            )
        )
        resolved.update(rows.scalars().all())
    if not resolved:
        return []
    rows = await db.execute(
        select(User.id).where(
            User.id.in_(resolved),
            User.institution_id == institution_id,
            User.is_active.is_(True),
        )
    )
    valid_ids = set(rows.scalars().all())
    missing = resolved - valid_ids
    if missing:
        raise HTTPException(
            status_code=422,
            detail="One or more assignees are inactive or outside this institution.",
        )
    return sorted(valid_ids)


async def validate_reference(
    db: AsyncSession, institution_id: int, source_type: str, record_id: int
) -> None:
    if source_type not in SOURCE_TYPES:
        raise HTTPException(status_code=422, detail="Unsupported linked-record type.")

    if source_type == "student":
        row = await db.execute(
            select(Student.id).where(
                Student.id == record_id, Student.institution_id == institution_id
            )
        )
    elif source_type == "lead":
        row = await db.execute(
            select(Lead.id).where(
                Lead.id == record_id, Lead.institution_id == institution_id
            )
        )
    elif source_type == "fee_invoice":
        row = await db.execute(
            select(FeeInvoice.id)
            .join(Student, Student.id == FeeInvoice.student_id)
            .where(FeeInvoice.id == record_id, Student.institution_id == institution_id)
        )
    elif source_type == "attendance":
        row = await db.execute(
            select(Attendance.id)
            .join(Student, Student.id == Attendance.student_id)
            .where(Attendance.id == record_id, Student.institution_id == institution_id)
        )
    elif source_type == "academic_year":
        row = await db.execute(
            select(AcademicYear.id).where(
                AcademicYear.id == record_id,
                AcademicYear.institution_id == institution_id,
            )
        )
    elif source_type == "division":
        row = await db.execute(
            select(Division.id)
            .join(Standard, Standard.id == Division.standard_id)
            .where(Division.id == record_id, Standard.institution_id == institution_id)
        )
    elif source_type == "subject":
        row = await db.execute(
            select(Subject.id)
            .join(Standard, Standard.id == Subject.standard_id)
            .where(Subject.id == record_id, Standard.institution_id == institution_id)
        )
    elif source_type == "examination":
        row = await db.execute(
            select(Examination.id)
            .join(AcademicYear, AcademicYear.id == Examination.academic_year_id)
            .where(Examination.id == record_id, AcademicYear.institution_id == institution_id)
        )
    elif source_type == "timetable_entry":
        row = await db.execute(
            select(TimetableEntry.id)
            .join(Division, Division.id == TimetableEntry.division_id)
            .join(Standard, Standard.id == Division.standard_id)
            .where(TimetableEntry.id == record_id, Standard.institution_id == institution_id)
        )
    elif source_type == "communication_log":
        row = await db.execute(
            select(CommunicationLog.id).where(
                CommunicationLog.id == record_id,
                CommunicationLog.institution_id == institution_id,
            )
        )
    else:
        row = await db.execute(
            select(HomeworkAssignment.id).where(
                HomeworkAssignment.id == record_id,
                HomeworkAssignment.institution_id == institution_id,
            )
        )
    if row.scalar_one_or_none() is None:
        raise HTTPException(status_code=422, detail="Linked record is missing or outside this institution.")


def _occurrence_dates(activity: Activity, start: date, end: date) -> list[date]:
    if not activity.recurrence_frequency or not activity.start_at:
        return []
    zone = _local_zone(activity.timezone)
    first = _aware_utc(activity.start_at).astimezone(zone).date()
    last = min(end, activity.recurrence_until) if activity.recurrence_until else end
    current = max(start, first)
    if last < current:
        return []
    weekdays = {
        int(day)
        for day in (activity.recurrence_weekdays or "").split(",")
        if day.strip().isdigit() and 0 <= int(day) <= 6
    }
    if not weekdays:
        weekdays = {first.weekday()}
    first_week = first - timedelta(days=first.weekday())
    result: list[date] = []
    while current <= last:
        delta = (current - first).days
        if activity.recurrence_frequency == "daily":
            matches = delta % activity.recurrence_interval == 0
        elif activity.recurrence_frequency == "weekly":
            week_number = ((current - first_week).days) // 7
            matches = (
                current.weekday() in weekdays
                and week_number % activity.recurrence_interval == 0
            )
        else:
            month_delta = (current.year - first.year) * 12 + current.month - first.month
            matches = (
                month_delta % activity.recurrence_interval == 0
                and current.day == first.day
            )
        if matches:
            result.append(current)
        current += timedelta(days=1)
    return result


get_occurrence_dates = _occurrence_dates


async def resolve_reference_labels(
    db: AsyncSession,
    references: list[ActivityReference],
) -> dict[tuple[str, int], str]:
    if not references:
        return {}

    labels: dict[tuple[str, int], str] = {}
    by_type: dict[str, set[int]] = {}
    for ref in references:
        by_type.setdefault(ref.source_type, set()).add(ref.source_record_id)

    # 1. Students
    if "student" in by_type:
        rows = await db.execute(
            select(Student.id, Student.first_name, Student.last_name, Student.admission_number)
            .where(Student.id.in_(by_type["student"]))
        )
        for sid, fname, lname, adm in rows.all():
            full = f"{fname or ''} {lname or ''}".strip()
            labels[("student", sid)] = f"{full} ({adm})" if adm else full

    # 2. Leads
    if "lead" in by_type:
        rows = await db.execute(
            select(Lead.id, Lead.student_name, Lead.stage)
            .where(Lead.id.in_(by_type["lead"]))
        )
        for lid, name, stage in rows.all():
            labels[("lead", lid)] = f"{name} ({stage})" if stage else name

    # 3. Examinations
    if "examination" in by_type:
        rows = await db.execute(
            select(Examination.id, Examination.name)
            .where(Examination.id.in_(by_type["examination"]))
        )
        for eid, name in rows.all():
            labels[("examination", eid)] = name

    # 4. Homework Assignments
    if "homework_assignment" in by_type:
        rows = await db.execute(
            select(HomeworkAssignment.id, HomeworkAssignment.title)
            .where(HomeworkAssignment.id.in_(by_type["homework_assignment"]))
        )
        for hid, title in rows.all():
            labels[("homework_assignment", hid)] = title

    # 5. Divisions / Classes
    if "division" in by_type:
        rows = await db.execute(
            select(Division.id, Division.name, Standard.name)
            .join(Standard, Standard.id == Division.standard_id)
            .where(Division.id.in_(by_type["division"]))
        )
        for did, dname, sname in rows.all():
            labels[("division", did)] = f"Class {sname} · {dname}"

    # 6. Subjects
    if "subject" in by_type:
        rows = await db.execute(
            select(Subject.id, Subject.name)
            .where(Subject.id.in_(by_type["subject"]))
        )
        for suid, sname in rows.all():
            labels[("subject", suid)] = sname

    # 7. Academic Years
    if "academic_year" in by_type:
        rows = await db.execute(
            select(AcademicYear.id, AcademicYear.name)
            .where(AcademicYear.id.in_(by_type["academic_year"]))
        )
        for yid, yname in rows.all():
            labels[("academic_year", yid)] = yname

    # 8. Timetable
    if "timetable_entry" in by_type:
        rows = await db.execute(
            select(TimetableEntry.id, Subject.name, Division.name)
            .join(Division, Division.id == TimetableEntry.division_id)
            .join(Subject, Subject.id == TimetableEntry.subject_id)
            .where(TimetableEntry.id.in_(by_type["timetable_entry"]))
        )
        for tid, sname, dname in rows.all():
            labels[("timetable_entry", tid)] = f"{sname} · {dname}"

    # 9. Fee Invoices
    if "fee_invoice" in by_type:
        rows = await db.execute(
            select(FeeInvoice.id, FeeInvoice.invoice_number, Student.first_name, Student.last_name)
            .join(Student, Student.id == FeeInvoice.student_id)
            .where(FeeInvoice.id.in_(by_type["fee_invoice"]))
        )
        for fid, num, fname, lname in rows.all():
            labels[("fee_invoice", fid)] = f"Invoice #{num} ({fname or ''} {lname or ''}".strip() + ")"

    return labels


def _serialize_activity(
    activity: Activity,
    *,
    occurrence_date: Optional[date] = None,
    exceptions: Optional[set[date]] = None,
    reference_labels: Optional[dict[tuple[str, int], str]] = None,
    override_start: Optional[datetime] = None,
    override_end: Optional[datetime] = None,
    is_rescheduled: bool = False,
    original_occurrence_date: Optional[date] = None,
) -> dict[str, Any]:
    zone = _local_zone(activity.timezone)
    base_start = _aware_utc(activity.start_at)
    base_end = _aware_utc(activity.end_at)
    base_due = _aware_utc(activity.due_at)
    if override_start:
        start = _aware_utc(override_start)
        end = _aware_utc(override_end) if override_end else None
        due = None
    elif occurrence_date and base_start:
        local_start = base_start.astimezone(zone)
        start = datetime.combine(occurrence_date, local_start.timetz().replace(tzinfo=None), tzinfo=zone)
        duration = (base_end - base_start) if base_end else None
        start = start.astimezone(timezone.utc)
        end = start + duration if duration else None
        due = None
    else:
        start, end, due = base_start, base_end, base_due
    return {
        "id": activity.id,
        "key": f"activity:{activity.id}:{occurrence_date.isoformat() if occurrence_date else 'once'}",
        "source_type": "activity",
        "source_id": activity.id,
        "title": activity.title,
        "description": activity.description,
        "activity_type": activity.activity_type,
        "category": activity.category,
        "start_at": start.isoformat() if start else None,
        "end_at": end.isoformat() if end else None,
        "due_at": due.isoformat() if due else None,
        "occurrence_date": occurrence_date.isoformat() if occurrence_date else None,
        "timezone": activity.timezone,
        "all_day": activity.all_day,
        "location": activity.location,
        "priority": activity.priority,
        "status": activity.status,
        "allowed_transitions": sorted(STATUS_TRANSITIONS.get(activity.status, set())),
        "visibility": activity.visibility,
        "is_published": activity.is_published,
        "academic_year_id": activity.academic_year_id,
        "division_id": activity.division_id,
        "subject_id": activity.subject_id,
        "is_rescheduled": is_rescheduled,
        "original_occurrence_date": original_occurrence_date.isoformat() if original_occurrence_date else None,
        "assignees": [
            {
                "user_id": item.user_id,
                "name": item.user.full_name if item.user else "Former user",
            }
            for item in activity.assignees
        ],
        "attachments": [
            {
                "id": attachment.id,
                "filename": attachment.original_filename,
                "mime_type": attachment.mime_type,
                "file_size_bytes": attachment.file_size_bytes,
            }
            for attachment in activity.attachments
        ],
        "references": [
            {
                "source_type": item.source_type,
                "source_record_id": item.source_record_id,
                "label": (reference_labels or {}).get((item.source_type, item.source_record_id)),
            }
            for item in activity.references
        ],
        "recurrence": {
            "frequency": activity.recurrence_frequency,
            "interval": activity.recurrence_interval,
            "until": activity.recurrence_until.isoformat() if activity.recurrence_until else None,
            "weekdays": [
                int(day)
                for day in (activity.recurrence_weekdays or "").split(",")
                if day.strip().isdigit()
            ],
        }
        if activity.recurrence_frequency
        else None,
        "version": activity.version,
        "created_by_id": activity.created_by_id,
        "created_at": activity.created_at.isoformat() if activity.created_at else None,
        "updated_at": activity.updated_at.isoformat() if activity.updated_at else None,
        "editable": True,
    }


def expand_activity(
    activity: Activity,
    start: date,
    end: date,
    reference_labels: Optional[dict[tuple[str, int], str]] = None,
) -> list[dict[str, Any]]:
    exception_map = {exc.occurrence_date: exc for exc in activity.recurrence_exceptions}
    if activity.recurrence_frequency and activity.start_at:
        zone = _local_zone(activity.timezone)
        results = []
        occurrences_in_range = set(_occurrence_dates(activity, start, end))
        for occurrence in _occurrence_dates(activity, start, end):
            exc = exception_map.get(occurrence)
            if exc is None:
                results.append(
                    _serialize_activity(activity, occurrence_date=occurrence, reference_labels=reference_labels)
                )
            elif exc.rescheduled_start_at is not None:
                res_local = exc.rescheduled_start_at.astimezone(zone)
                res_date = res_local.date()
                if start <= res_date <= end:
                    results.append(
                        _serialize_activity(
                            activity,
                            occurrence_date=res_date,
                            reference_labels=reference_labels,
                            override_start=exc.rescheduled_start_at,
                            override_end=exc.rescheduled_end_at,
                            is_rescheduled=True,
                            original_occurrence_date=occurrence,
                        )
                    )
        for exc in activity.recurrence_exceptions:
            if exc.rescheduled_start_at is not None and exc.occurrence_date not in occurrences_in_range:
                res_local = exc.rescheduled_start_at.astimezone(zone)
                res_date = res_local.date()
                if start <= res_date <= end:
                    results.append(
                        _serialize_activity(
                            activity,
                            occurrence_date=res_date,
                            reference_labels=reference_labels,
                            override_start=exc.rescheduled_start_at,
                            override_end=exc.rescheduled_end_at,
                            is_rescheduled=True,
                            original_occurrence_date=exc.occurrence_date,
                        )
                    )
        return results
    result = _serialize_activity(activity, reference_labels=reference_labels)
    start_at = _aware_utc(activity.start_at)
    end_at = _aware_utc(activity.end_at)
    due_at = _aware_utc(activity.due_at)
    if start_at is None and due_at is None:
        return [result]
    zone = _local_zone(activity.timezone)
    range_start = datetime.combine(start, time.min, tzinfo=zone).astimezone(timezone.utc)
    range_end = datetime.combine(end + timedelta(days=1), time.min, tzinfo=zone).astimezone(timezone.utc)
    is_in_range = (
        (start_at is not None and (start_at < range_end and (end_at or start_at) >= range_start))
        or (due_at is not None and range_start <= due_at < range_end)
    )
    return [result] if is_in_range else []


def _time_from_string(raw: Optional[str], default: time) -> time:
    if not raw:
        return default
    try:
        return time.fromisoformat(raw)
    except ValueError:
        return default


def _projected_item(
    source_type: str,
    source_id: int,
    title: str,
    activity_type: str,
    category: str,
    start_at: Optional[datetime],
    end_at: Optional[datetime],
    *,
    due_at: Optional[datetime] = None,
    location: Optional[str] = None,
    division_id: Optional[int] = None,
    subject_id: Optional[int] = None,
    occurrence_date: Optional[date] = None,
    all_day: bool = False,
    timezone_name: Optional[str] = None,
) -> dict[str, Any]:
    return {
        "id": f"{source_type}:{source_id}",
        "key": f"{source_type}:{source_id}:{occurrence_date.isoformat() if occurrence_date else 'once'}",
        "source_type": source_type,
        "source_id": source_id,
        "title": title,
        "description": None,
        "activity_type": activity_type,
        "category": category,
        "start_at": start_at.isoformat() if start_at else None,
        "end_at": end_at.isoformat() if end_at else None,
        "due_at": due_at.isoformat() if due_at else None,
        "occurrence_date": occurrence_date.isoformat() if occurrence_date else None,
        "timezone": timezone_name,
        "all_day": all_day,
        "location": location,
        "priority": "normal",
        "status": "todo",
        "visibility": "institution",
        "is_published": True,
        "academic_year_id": None,
        "division_id": division_id,
        "subject_id": subject_id,
        "assignees": [],
        "attachments": [],
        "references": [{"source_type": source_type, "source_record_id": source_id, "label": title}],
        "recurrence": None,
        "version": None,
        "created_by_id": None,
        "created_at": None,
        "updated_at": None,
        "editable": False,
    }


async def list_calendar_items(
    db: AsyncSession,
    user: User,
    institution: Institution,
    start: date,
    end: date,
    *,
    include_cancelled: bool = False,
    data_environment: str = "PRODUCTION",
) -> list[dict[str, Any]]:
    if end < start or (end - start).days > 370:
        raise HTTPException(status_code=422, detail="Calendar range must be between 1 and 371 days.")
    local_zone = _local_zone(institution.timezone or "Asia/Kolkata")
    start_local = datetime.combine(start, time.min, tzinfo=local_zone)
    end_local = datetime.combine(end + timedelta(days=1), time.min, tzinfo=local_zone)
    # Add a generous 1-day safety buffer on each side in UTC to encompass any activity-specific timezone offsets
    query_window_start_utc = (start_local - timedelta(days=1)).astimezone(timezone.utc)
    query_window_end_utc = (end_local + timedelta(days=1)).astimezone(timezone.utc)

    assigned_ids = select(ActivityAssignee.activity_id).where(
        ActivityAssignee.user_id == user.id
    )
    date_filter = or_(
        Activity.recurrence_frequency.isnot(None),
        and_(Activity.start_at.is_(None), Activity.due_at.is_(None)),
        and_(
            Activity.start_at.isnot(None),
            Activity.start_at < query_window_end_utc,
            func.coalesce(Activity.end_at, Activity.start_at) >= query_window_start_utc,
        ),
        and_(
            Activity.due_at.isnot(None),
            Activity.due_at >= query_window_start_utc,
            Activity.due_at < query_window_end_utc,
        ),
    )
    query = (
        select(Activity)
        .options(
            selectinload(Activity.assignees).selectinload(ActivityAssignee.user),
            selectinload(Activity.attachments),
            selectinload(Activity.references),
            selectinload(Activity.recurrence_exceptions),
        )
        .where(
            Activity.institution_id == institution.id,
            date_filter,
            or_(
                and_(Activity.visibility == "institution", Activity.is_published.is_(True)),
                Activity.created_by_id == user.id,
                Activity.id.in_(assigned_ids),
            ),
        )
    )
    if not include_cancelled:
        query = query.where(Activity.status != "cancelled")
    activities = (await db.execute(query.order_by(Activity.start_at, Activity.due_at))).scalars().all()
    all_refs = [ref for activity in activities for ref in activity.references]
    ref_labels = await resolve_reference_labels(db, all_refs)
    items = [
        occurrence
        for activity in activities
        for occurrence in expand_activity(activity, start, end, reference_labels=ref_labels)
    ]

    if is_sysadmin(user) or await has_permission(db, user, "examinations", "view"):
        exams = await db.execute(
            select(Examination)
            .join(AcademicYear, AcademicYear.id == Examination.academic_year_id)
            .where(
                AcademicYear.institution_id == institution.id,
                Examination.is_active.is_(True),
                Examination.start_date.isnot(None),
                Examination.start_date <= end,
                or_(Examination.end_date.is_(None), Examination.end_date >= start),
            )
        )
        for exam in exams.scalars().all():
            event_start_date = max(exam.start_date, start)
            event_end_date = min(exam.end_date or exam.start_date, end)
            event_start = datetime.combine(event_start_date, time.min, tzinfo=local_zone)
            event_end = datetime.combine(event_end_date + timedelta(days=1), time.min, tzinfo=local_zone)
            items.append(
                _projected_item(
                    "examination",
                    exam.id,
                    exam.name,
                    "event",
                    "academic",
                    event_start.astimezone(timezone.utc),
                    event_end.astimezone(timezone.utc),
                    all_day=True,
                    timezone_name=institution.timezone or "Asia/Kolkata",
                )
            )

    weekdays = {index: name for index, name in enumerate(
        ("Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday")
    )}
    timetable_rows = await db.execute(
        select(TimetableEntry, Division.name, Subject.name)
        .join(Division, Division.id == TimetableEntry.division_id)
        .join(Standard, Standard.id == Division.standard_id)
        .join(Subject, Subject.id == TimetableEntry.subject_id)
        .where(
            Standard.institution_id == institution.id,
            TimetableEntry.is_active.is_(True),
        )
    )
    timetable_entries = timetable_rows.all()
    day_names = {name.casefold(): index for index, name in weekdays.items()}
    current_day = start
    while current_day <= end:
        for timetable, division_name, subject_name in timetable_entries:
            if day_names.get(timetable.day_of_week.casefold()) != current_day.weekday():
                continue
            local_start_time = _time_from_string(timetable.start_time, time(9, 0))
            local_end_time = _time_from_string(timetable.end_time, time(10, 0))
            local_start_at = datetime.combine(current_day, local_start_time, tzinfo=local_zone)
            local_end_at = datetime.combine(current_day, local_end_time, tzinfo=local_zone)
            items.append(
                _projected_item(
                    "timetable_entry",
                    timetable.id,
                    f"{subject_name} · {division_name}",
                    "event",
                    "academic",
                    local_start_at.astimezone(timezone.utc),
                    local_end_at.astimezone(timezone.utc),
                    location=timetable.room_number,
                    division_id=timetable.division_id,
                    subject_id=timetable.subject_id,
                    occurrence_date=current_day,
                    timezone_name=institution.timezone or "Asia/Kolkata",
                )
            )
        current_day += timedelta(days=1)

    from app.services.homework_service import HomeworkService

    if await HomeworkService.check_permission(db, user, "view"):
        homework_rows = await db.execute(
            select(HomeworkAssignment, Division.name)
            .outerjoin(Division, Division.id == HomeworkAssignment.division_id)
            .where(
                HomeworkAssignment.institution_id == institution.id,
                HomeworkAssignment.status == "published",
                HomeworkAssignment.is_template.is_(False),
                HomeworkAssignment.due_date >= start,
                HomeworkAssignment.due_date <= end,
            )
        )
        for homework, division_name in homework_rows.all():
            due_time = _time_from_string(homework.due_time, time(23, 59))
            local_due = datetime.combine(homework.due_date, due_time, tzinfo=local_zone)
            items.append(
                _projected_item(
                    "homework_assignment",
                    homework.id,
                    f"Homework due: {homework.title}",
                    "task",
                    "academic",
                    None,
                    None,
                    due_at=local_due.astimezone(timezone.utc),
                    division_id=homework.division_id,
                    subject_id=homework.subject_id,
                    timezone_name=institution.timezone or "Asia/Kolkata",
                )
            )

    crm_environment = data_environment.upper()
    if crm_environment in ("PRODUCTION", "TRAINING") and await has_resource_access(
        db, user, "leads", "read", LEAD_READ_ROLES
    ):
        source_start = start_local.astimezone(timezone.utc)
        source_end = end_local.astimezone(timezone.utc)
        follow_up_rows = await db.execute(
            select(LeadFollowUp)
            .join(Lead, Lead.id == LeadFollowUp.lead_id)
            .where(
                LeadFollowUp.institution_id == institution.id,
                Lead.institution_id == institution.id,
                Lead.is_active.is_(True),
                LeadFollowUp.status == "scheduled",
                LeadFollowUp.scheduled_at >= source_start,
                LeadFollowUp.scheduled_at < source_end,
                Lead.data_environment == crm_environment,
                LeadFollowUp.data_environment == crm_environment,
            )
        )
        for follow_up in follow_up_rows.scalars().all():
            scheduled_at = _aware_utc(follow_up.scheduled_at)
            if scheduled_at is None:
                continue
            follow_up_type = follow_up.follow_up_type.replace("_", " ").title()
            items.append(
                _projected_item(
                    "lead_follow_up",
                    follow_up.id,
                    f"CRM follow-up · {follow_up_type}",
                    "event",
                    "administrative",
                    scheduled_at,
                    None,
                    timezone_name=institution.timezone or "Asia/Kolkata",
                )
            )

        demo_rows = await db.execute(
            select(LeadDemoClass)
            .join(Lead, Lead.id == LeadDemoClass.lead_id)
            .options(selectinload(LeadDemoClass.subject))
            .where(
                LeadDemoClass.institution_id == institution.id,
                Lead.institution_id == institution.id,
                Lead.is_active.is_(True),
                LeadDemoClass.status == "scheduled",
                LeadDemoClass.scheduled_at >= source_start,
                LeadDemoClass.scheduled_at < source_end,
                Lead.data_environment == crm_environment,
                LeadDemoClass.data_environment == crm_environment,
            )
        )
        for demo_class in demo_rows.scalars().all():
            scheduled_at = _aware_utc(demo_class.scheduled_at)
            if scheduled_at is None:
                continue
            subject_name = demo_class.subject.name if demo_class.subject else None
            title = f"CRM demo class · {subject_name}" if subject_name else "CRM demo class"
            items.append(
                _projected_item(
                    "lead_demo_class",
                    demo_class.id,
                    title,
                    "event",
                    "academic",
                    scheduled_at,
                    None,
                    subject_id=demo_class.subject_id,
                    timezone_name=institution.timezone or "Asia/Kolkata",
                )
            )

    items.sort(
        key=lambda item: (
            item.get("start_at") or item.get("due_at") or "",
            item["title"].casefold(),
        )
    )
    return items


def _activity_intervals(
    activity: Activity,
    start_at: Optional[datetime],
    end_at: Optional[datetime],
    *,
    window_start: Optional[datetime] = None,
    window_end: Optional[datetime] = None,
) -> list[tuple[datetime, datetime]]:
    start_utc, end_utc = _aware_utc(start_at), _aware_utc(end_at)
    if start_utc is None or end_utc is None:
        return []
    if not activity.recurrence_frequency:
        if window_start and end_utc <= window_start:
            return []
        if window_end and start_utc >= window_end:
            return []
        return [(start_utc, end_utc)]

    zone = _local_zone(activity.timezone)
    local_start = start_utc.astimezone(zone)
    duration = end_utc - start_utc
    first = local_start.date()
    last = activity.recurrence_until or first
    if window_start:
        first = max(
            first,
            (window_start - duration).astimezone(zone).date() - timedelta(days=1),
        )
    if window_end:
        last = min(last, window_end.astimezone(zone).date() + timedelta(days=1))
    if last < first:
        return []

    exceptions = {entry.occurrence_date: entry for entry in activity.recurrence_exceptions}
    wall_time = local_start.timetz().replace(tzinfo=None)
    intervals = []
    for occurrence_date in _occurrence_dates(activity, first, last):
        if occurrence_date in exceptions:
            continue
        occurrence_start = datetime.combine(occurrence_date, wall_time, tzinfo=zone).astimezone(timezone.utc)
        intervals.append((occurrence_start, occurrence_start + duration))

    for exc in activity.recurrence_exceptions:
        if exc.rescheduled_start_at and exc.rescheduled_end_at:
            res_start = _aware_utc(exc.rescheduled_start_at)
            res_end = _aware_utc(exc.rescheduled_end_at)
            if res_start and res_end:
                if (window_start is None or res_end > window_start) and (window_end is None or res_start < window_end):
                    intervals.append((res_start, res_end))
    return intervals


async def check_schedule_conflicts(
    db: AsyncSession,
    activity: Activity,
    candidate_assignee_ids: list[int],
    start_at: Optional[datetime],
    end_at: Optional[datetime],
    location: Optional[str],
    division_id: Optional[int],
    exclude_activity_id: Optional[int] = None,
) -> list[dict[str, Any]]:
    if start_at is None or end_at is None:
        return []
    candidate_intervals = _activity_intervals(activity, start_at, end_at)
    if not candidate_intervals:
        return []
    candidate_start = min(interval[0] for interval in candidate_intervals)
    candidate_end = max(interval[1] for interval in candidate_intervals)
    stmt = (
        select(Activity)
        .options(
            selectinload(Activity.assignees),
            selectinload(Activity.recurrence_exceptions),
        )
        .where(
            Activity.institution_id == activity.institution_id,
            Activity.start_at.isnot(None),
            Activity.end_at.isnot(None),
            Activity.status.notin_(("completed", "cancelled")),
            Activity.is_published.is_(True),
            or_(
                and_(
                    Activity.recurrence_frequency.is_(None),
                    Activity.start_at < candidate_end,
                    Activity.end_at > candidate_start,
                ),
                and_(
                    Activity.recurrence_frequency.isnot(None),
                    Activity.start_at < candidate_end,
                    or_(
                        Activity.recurrence_until.is_(None),
                        Activity.recurrence_until >= candidate_start.date() - timedelta(days=1),
                    ),
                ),
            ),
        )
    )
    if exclude_activity_id is not None:
        stmt = stmt.where(Activity.id != exclude_activity_id)
    existing = (await db.execute(stmt)).scalars().all()
    conflicts: list[dict[str, Any]] = []
    for other in existing:
        other_intervals = _activity_intervals(
            other,
            other.start_at,
            other.end_at,
            window_start=candidate_start,
            window_end=candidate_end,
        )
        candidate_index = other_index = 0
        overlaps = False
        while candidate_index < len(candidate_intervals) and other_index < len(other_intervals):
            candidate_interval = candidate_intervals[candidate_index]
            other_interval = other_intervals[other_index]
            if candidate_interval[0] < other_interval[1] and candidate_interval[1] > other_interval[0]:
                overlaps = True
                break
            if candidate_interval[1] <= other_interval[0]:
                candidate_index += 1
            else:
                other_index += 1
        if not overlaps:
            continue
        reasons = []
        other_assignees = {item.user_id for item in other.assignees}
        if other_assignees.intersection(candidate_assignee_ids):
            reasons.append("assignee")
        if division_id is not None and other.division_id == division_id:
            reasons.append("class")
        if location and other.location and location.strip().casefold() == other.location.strip().casefold():
            reasons.append("location")
        if reasons:
            conflicts.append({"activity_id": other.id, "title": other.title, "reasons": reasons})

    timetable_rows = await db.execute(
        select(TimetableEntry, Division.class_teacher_id)
        .join(Division, Division.id == TimetableEntry.division_id)
        .join(Standard, Standard.id == Division.standard_id)
        .where(
            Standard.institution_id == activity.institution_id,
            TimetableEntry.is_active.is_(True),
        )
    )
    day_names = {
        "monday": 0, "tuesday": 1, "wednesday": 2, "thursday": 3,
        "friday": 4, "saturday": 5, "sunday": 6,
    }
    activity_zone = _local_zone(activity.timezone)
    local_candidate_intervals = [
        (interval_start.astimezone(activity_zone), interval_end.astimezone(activity_zone))
        for interval_start, interval_end in candidate_intervals
    ]
    for entry, class_teacher_id in timetable_rows.all():
        if division_id is not None and entry.division_id == division_id:
            reasons = ["class"]
        else:
            reasons = []
        if entry.teacher_id in candidate_assignee_ids or (
            entry.teacher_id is None and class_teacher_id in candidate_assignee_ids
        ):
            reasons.append("assignee")
        if location and entry.room_number and location.strip().casefold() == entry.room_number.strip().casefold():
            reasons.append("location")
        if not reasons:
            continue
        timetable_start = _time_from_string(entry.start_time, time(9, 0))
        timetable_end = _time_from_string(entry.end_time, time(10, 0))
        has_time_conflict = any(
            day_names.get(entry.day_of_week.casefold()) == local_interval_start.weekday()
            and local_interval_start.timetz().replace(tzinfo=None) < timetable_end
            and local_interval_end.timetz().replace(tzinfo=None) > timetable_start
            for local_interval_start, local_interval_end in local_candidate_intervals
        )
        if has_time_conflict:
            conflicts.append({
                "source_type": "timetable_entry",
                "activity_id": entry.id,
                "title": "Existing timetable entry",
                "reasons": sorted(set(reasons)),
            })
    return conflicts


async def record_activity_audit(
    db: AsyncSession,
    user: User,
    activity: Activity,
    action: str,
    old_data: Optional[dict[str, Any]],
    new_data: Optional[dict[str, Any]],
) -> None:
    db.add(
        AuditLog(
            user_id=user.id,
            institution_id=activity.institution_id,
            action=action,
            resource_type="activity",
            resource_id=activity.id,
            old_data=json.dumps(old_data, default=str) if old_data is not None else None,
            new_data=json.dumps(new_data, default=str) if new_data is not None else None,
            details=f"Planning activity {action}",
            severity="info",
        )
    )
