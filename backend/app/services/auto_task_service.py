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
#  * @description Cross-module automated task creation and resolution engine with idempotency and anti-spam governance.
#  */

import json
from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.fee import FeeInvoice
from app.models.planning import Activity, ActivityAssignee, ActivityReference
from app.models.student import Student
from app.models.user import AuditLog, User


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
            # Task already active; update due_at if earlier or higher priority
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
