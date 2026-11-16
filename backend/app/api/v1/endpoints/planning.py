# /**
#  * @file        planning.py
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
#  * @created     2026-11-16
#  * @updated     2026-11-17
#  *
#  * @description Institution-scoped planning activity APIs, safe attachments, recurrence exceptions, and audit history.
#  */

import asyncio
import io
import json
import math
import os
import re
import struct
import tempfile
import uuid
import zipfile
from datetime import date, datetime, time, timedelta, timezone
from pathlib import Path
from typing import Literal, Optional
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.deps import (
    enforce_institution_access,
    get_current_active_user,
    get_data_environment,
    is_sysadmin,
)
from app.models.institution import Institution
from app.models.planning import (
    Activity,
    ActivityAssignee,
    ActivityAttachment,
    ActivityReference,
    ActivityRecurrenceException,
)
from app.models.staff import StaffProfile
from app.models.user import AuditLog, User
from app.services.planning_service import (
    ACTIVITY_TYPES,
    PRIORITIES,
    RECURRENCE_FREQUENCIES,
    SOURCE_TYPES,
    STATUSES,
    STATUS_TRANSITIONS,
    can_manage_activity,
    check_schedule_conflicts,
    ensure_activity_visible,
    expand_activity,
    get_activity,
    list_calendar_items,
    record_activity_audit,
    require_planning_permission,
    resolve_assignee_ids,
    resolve_reference_labels,
    validate_academic_scope,
    validate_reference,
)

router = APIRouter()

MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024
MAX_RECURRENCE_DAYS = 366 * 5
ALLOWED_EXTENSIONS = {".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".jpg", ".jpeg", ".png"}
ATTACHMENT_MIME_TYPES = {
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".ppt": "application/vnd.ms-powerpoint",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
}
OOXML_REQUIRED_ENTRIES = {
    ".docx": "word/document.xml",
    ".xlsx": "xl/workbook.xml",
    ".pptx": "ppt/presentation.xml",
}
OLE_SIGNATURE = b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1"


def _validated_attachment_mime(extension: str, content: bytes) -> Optional[str]:
    if extension == ".pdf" and content.startswith(b"%PDF-"):
        return ATTACHMENT_MIME_TYPES[extension]
    if extension in (".jpg", ".jpeg") and content.startswith(b"\xff\xd8\xff"):
        return ATTACHMENT_MIME_TYPES[extension]
    if extension == ".png" and content.startswith(b"\x89PNG\r\n\x1a\n"):
        return ATTACHMENT_MIME_TYPES[extension]
    if extension in (".doc", ".xls", ".ppt") and content.startswith(OLE_SIGNATURE):
        return ATTACHMENT_MIME_TYPES[extension]
    required_entry = OOXML_REQUIRED_ENTRIES.get(extension)
    if required_entry and zipfile.is_zipfile(io.BytesIO(content)):
        try:
            with zipfile.ZipFile(io.BytesIO(content)) as archive:
                entries = archive.infolist()
                if (
                    required_entry in archive.namelist()
                    and sum(entry.file_size for entry in entries) <= 100 * 1024 * 1024
                    and all(entry.file_size <= max(entry.compress_size, 1) * 200 for entry in entries)
                ):
                    return ATTACHMENT_MIME_TYPES[extension]
        except (OSError, zipfile.BadZipFile):
            return None
    return None


class RecurrenceInput(BaseModel):
    frequency: Literal["daily", "weekly", "monthly"]
    interval: int = Field(default=1, ge=1, le=30)
    until: date
    weekdays: list[int] = Field(default_factory=list)


class ActivityReferenceInput(BaseModel):
    source_type: str
    source_record_id: int = Field(gt=0)
    label: Optional[str] = None


class ActivityCreateRequest(BaseModel):
    institution_id: Optional[int] = None
    academic_year_id: Optional[int] = None
    division_id: Optional[int] = None
    subject_id: Optional[int] = None
    title: str = Field(min_length=2, max_length=200)
    description: Optional[str] = Field(default=None, max_length=10000)
    activity_type: Literal["task", "event", "holiday"] = "task"
    category: Literal["academic", "administrative", "institutional", "meeting", "other"] = "administrative"
    start_at: Optional[datetime] = None
    end_at: Optional[datetime] = None
    due_at: Optional[datetime] = None
    timezone: Optional[str] = None
    all_day: bool = False
    location: Optional[str] = Field(default=None, max_length=200)
    priority: Literal["low", "normal", "high", "urgent"] = "normal"
    status: Literal["backlog", "todo", "in_progress", "blocked", "completed", "cancelled"] = "backlog"
    visibility: Literal["institution", "assignees"] = "institution"
    is_published: bool = False
    recurrence: Optional[RecurrenceInput] = None
    assignee_user_ids: list[int] = Field(default_factory=list, max_length=100)
    department_names: list[str] = Field(default_factory=list, max_length=30)
    references: list[ActivityReferenceInput] = Field(default_factory=list, max_length=30)


class ActivityUpdateRequest(BaseModel):
    expected_version: int = Field(ge=1)
    title: Optional[str] = Field(default=None, min_length=2, max_length=200)
    description: Optional[str] = Field(default=None, max_length=10000)
    activity_type: Optional[Literal["task", "event", "holiday"]] = None
    category: Optional[Literal["academic", "administrative", "institutional", "meeting", "other"]] = None
    academic_year_id: Optional[int] = None
    division_id: Optional[int] = None
    subject_id: Optional[int] = None
    start_at: Optional[datetime] = None
    end_at: Optional[datetime] = None
    due_at: Optional[datetime] = None
    timezone: Optional[str] = None
    all_day: Optional[bool] = None
    location: Optional[str] = Field(default=None, max_length=200)
    priority: Optional[Literal["low", "normal", "high", "urgent"]] = None
    visibility: Optional[Literal["institution", "assignees"]] = None
    is_published: Optional[bool] = None
    recurrence: Optional[RecurrenceInput] = None
    assignee_user_ids: Optional[list[int]] = Field(default=None, max_length=100)
    department_names: Optional[list[str]] = Field(default=None, max_length=30)
    references: Optional[list[ActivityReferenceInput]] = Field(default=None, max_length=30)


class ActivityStatusRequest(BaseModel):
    status: Literal["backlog", "todo", "in_progress", "blocked", "completed", "cancelled"]
    expected_version: int = Field(ge=1)


def _validate_time_fields(
    activity_type: str,
    start_at: Optional[datetime],
    end_at: Optional[datetime],
    due_at: Optional[datetime],
    recurrence: Optional[RecurrenceInput],
    timezone_name: Optional[str] = None,
) -> None:
    if activity_type in ("event", "holiday") and (start_at is None or end_at is None):
        raise HTTPException(status_code=422, detail="Events and holidays require start and end times.")
    if end_at is not None and (start_at is None or end_at <= start_at):
        raise HTTPException(status_code=422, detail="End time must be after start time.")
    for label, value in (("start_at", start_at), ("end_at", end_at), ("due_at", due_at)):
        if value is not None and (value.tzinfo is None or value.utcoffset() is None):
            raise HTTPException(status_code=422, detail=f"{label} must include a timezone offset.")
    if recurrence is not None:
        if start_at is None:
            raise HTTPException(status_code=422, detail="Recurring activities require a start time.")
        recurrence_start_date = (
            start_at.astimezone(ZoneInfo(timezone_name)).date()
            if timezone_name
            else start_at.date()
        )
        if recurrence.until < recurrence_start_date:
            raise HTTPException(status_code=422, detail="Recurrence end date cannot precede the start date.")
        if recurrence.until - recurrence_start_date > timedelta(days=MAX_RECURRENCE_DAYS):
            raise HTTPException(status_code=422, detail="Recurrence cannot extend more than five years.")
        if any(day < 0 or day > 6 for day in recurrence.weekdays):
            raise HTTPException(status_code=422, detail="Recurrence weekdays must use values from 0 to 6.")
        if recurrence.frequency != "weekly" and recurrence.weekdays:
            raise HTTPException(status_code=422, detail="Weekday selection is only valid for weekly recurrence.")


def _recurrence_fields(value: Optional[RecurrenceInput]) -> dict:
    if value is None:
        return {
            "recurrence_frequency": None,
            "recurrence_interval": 1,
            "recurrence_until": None,
            "recurrence_weekdays": None,
        }
    return {
        "recurrence_frequency": value.frequency,
        "recurrence_interval": value.interval,
        "recurrence_until": value.until,
        "recurrence_weekdays": ",".join(str(day) for day in sorted(set(value.weekdays))) or None,
    }


def _activity_snapshot(activity: Activity) -> dict:
    return {
        "title": activity.title,
        "description": activity.description,
        "activity_type": activity.activity_type,
        "category": activity.category,
        "status": activity.status,
        "start_at": activity.start_at.isoformat() if activity.start_at else None,
        "end_at": activity.end_at.isoformat() if activity.end_at else None,
        "due_at": activity.due_at.isoformat() if activity.due_at else None,
        "location": activity.location,
        "priority": activity.priority,
        "visibility": activity.visibility,
        "is_published": activity.is_published,
        "assignee_user_ids": [item.user_id for item in activity.assignees],
        "references": [
            {"source_type": item.source_type, "source_record_id": item.source_record_id}
            for item in activity.references
        ],
        "version": activity.version,
    }


async def _institution_for_create(
    db: AsyncSession, user: User, requested_id: Optional[int]
) -> Institution:
    institution_id = requested_id or user.institution_id
    if institution_id is None:
        raise HTTPException(status_code=422, detail="Institution context is required.")
    if not is_sysadmin(user) and institution_id != user.institution_id:
        raise HTTPException(status_code=403, detail="Cannot create an activity outside your institution.")
    institution = await db.get(Institution, institution_id)
    if institution is None or not institution.is_active:
        raise HTTPException(status_code=404, detail="Institution not found or inactive.")
    return institution


async def _check_publish_permission(
    db: AsyncSession, user: User, requested: bool
) -> None:
    if requested:
        await require_planning_permission(db, user, "publish")


async def _replace_assignees(
    db: AsyncSession,
    activity: Activity,
    assignee_ids: list[int],
    assigned_by_id: int,
) -> None:
    activity.assignees.clear()
    activity.assignees.extend(
        ActivityAssignee(user_id=user_id, assigned_by_id=assigned_by_id)
        for user_id in assignee_ids
    )


async def _replace_references(
    db: AsyncSession,
    activity: Activity,
    references: list[ActivityReferenceInput],
) -> None:
    for reference in references:
        if reference.source_type not in SOURCE_TYPES:
            raise HTTPException(status_code=422, detail="Unsupported linked-record type.")
        await validate_reference(
            db, activity.institution_id, reference.source_type, reference.source_record_id
        )
    activity.references.clear()
    activity.references.extend(
        ActivityReference(
            source_type=reference.source_type,
            source_record_id=reference.source_record_id,
        )
        for reference in references
    )


@router.get("/assignees")
async def list_assignees(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    await require_planning_permission(db, current_user, "view")
    institution_id = current_user.institution_id
    if institution_id is None and not is_sysadmin(current_user):
        raise HTTPException(status_code=403, detail="Institution context is required.")
    user_query = select(User).where(User.is_active.is_(True))
    department_query = select(StaffProfile.department).where(StaffProfile.status == "active")
    if institution_id is not None:
        user_query = user_query.where(User.institution_id == institution_id)
        department_query = department_query.where(StaffProfile.institution_id == institution_id)
    users = (await db.execute(user_query.order_by(User.first_name, User.last_name))).scalars().all()
    departments = (await db.execute(department_query.distinct().order_by(StaffProfile.department))).scalars().all()
    return {
        "users": [{"id": user.id, "name": user.full_name, "role": user.role} for user in users],
        "departments": [name for name in departments if name],
    }


@router.get("/activities")
async def list_activities(
    start: date = Query(...),
    end: date = Query(...),
    include_sources: bool = Query(True),
    include_cancelled: bool = Query(False),
    effective_inst_id: Optional[int] = Depends(enforce_institution_access),
    data_environment: str = Depends(get_data_environment),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    await require_planning_permission(db, current_user, "view")
    institution = await db.get(Institution, effective_inst_id) if effective_inst_id else None
    if institution is None or not institution.is_active:
        raise HTTPException(status_code=404, detail="Institution not found or inactive.")
    items = await list_calendar_items(
        db,
        current_user,
        institution,
        start,
        end,
        include_cancelled=include_cancelled,
        data_environment=data_environment,
    )
    if not include_sources:
        items = [item for item in items if item["source_type"] == "activity"]
    return {"items": items, "timezone": institution.timezone or "Asia/Kolkata"}


@router.post("/activities", status_code=status.HTTP_201_CREATED)
async def create_activity(
    payload: ActivityCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    await require_planning_permission(db, current_user, "create")
    institution = await _institution_for_create(db, current_user, payload.institution_id)
    timezone_name = payload.timezone or institution.timezone or "Asia/Kolkata"
    try:
        ZoneInfo(timezone_name)
    except ZoneInfoNotFoundError as exc:
        raise HTTPException(status_code=422, detail="Unknown timezone.") from exc
    _validate_time_fields(
        payload.activity_type, payload.start_at, payload.end_at, payload.due_at, payload.recurrence,
        timezone_name,
    )
    if payload.status not in ("backlog", "todo"):
        raise HTTPException(
            status_code=422,
            detail="New activities must start in Backlog or To Do; use a governed status transition afterward.",
        )
    if payload.assignee_user_ids or payload.department_names:
        await require_planning_permission(db, current_user, "assign")
    await _check_publish_permission(db, current_user, payload.is_published)
    await validate_academic_scope(
        db, institution.id, payload.academic_year_id, payload.division_id, payload.subject_id
    )
    assignee_ids = await resolve_assignee_ids(
        db, institution.id, payload.assignee_user_ids, payload.department_names
    )
    for reference in payload.references:
        await validate_reference(db, institution.id, reference.source_type, reference.source_record_id)

    activity = Activity(
        institution_id=institution.id,
        academic_year_id=payload.academic_year_id,
        division_id=payload.division_id,
        subject_id=payload.subject_id,
        created_by_id=current_user.id,
        title=payload.title.strip(),
        description=payload.description,
        activity_type=payload.activity_type,
        category=payload.category,
        start_at=payload.start_at.astimezone(timezone.utc) if payload.start_at else None,
        end_at=payload.end_at.astimezone(timezone.utc) if payload.end_at else None,
        due_at=payload.due_at.astimezone(timezone.utc) if payload.due_at else None,
        timezone=timezone_name,
        all_day=payload.all_day,
        location=payload.location.strip() if payload.location else None,
        priority=payload.priority,
        status=payload.status,
        visibility=payload.visibility,
        is_published=payload.is_published,
        assignees=[],
        references=[],
        recurrence_exceptions=[],
        **_recurrence_fields(payload.recurrence),
    )
    conflicts = await check_schedule_conflicts(
        db,
        activity,
        assignee_ids,
        activity.start_at,
        activity.end_at,
        activity.location,
        activity.division_id,
    )
    if conflicts:
        raise HTTPException(
            status_code=409,
            detail={"message": "Activity conflicts with an existing schedule.", "conflicts": conflicts},
        )
    db.add(activity)
    await db.flush()
    await _replace_assignees(db, activity, assignee_ids, current_user.id)
    await _replace_references(db, activity, payload.references)
    await record_activity_audit(db, current_user, activity, "created", None, _activity_snapshot(activity))
    await db.commit()
    activity = await get_activity(db, activity.id, current_user)
    return {"item": await _serialize_activity_for_detail(db, activity)}


async def _serialize_activity_for_detail(db: AsyncSession, activity: Activity) -> dict:
    ref_labels = await resolve_reference_labels(db, activity.references)
    expanded = expand_activity(
        activity,
        activity.start_at.date() if activity.start_at else date.today(),
        activity.start_at.date() if activity.start_at else date.today(),
        reference_labels=ref_labels,
    )
    item = expanded[0] if expanded else {
        "id": activity.id,
        "title": activity.title,
        "activity_type": activity.activity_type,
        "status": activity.status,
    }
    item["institution_id"] = activity.institution_id
    item["created_by_id"] = activity.created_by_id
    item["version"] = activity.version
    return item


@router.get("/activities/{activity_id}")
async def get_activity_detail(
    activity_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    await require_planning_permission(db, current_user, "view")
    activity = await get_activity(db, activity_id, current_user)
    await ensure_activity_visible(db, activity, current_user)
    return {"item": await _serialize_activity_for_detail(db, activity)}


@router.put("/activities/{activity_id}")
async def update_activity(
    activity_id: int,
    payload: ActivityUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    await require_planning_permission(db, current_user, "edit")
    activity = await get_activity(db, activity_id, current_user, lock=True)
    await ensure_activity_visible(db, activity, current_user)
    if not await can_manage_activity(db, activity, current_user):
        raise HTTPException(status_code=403, detail="Only the creator, an assignee, or an activity manager may edit this activity.")
    if activity.version != payload.expected_version:
        raise HTTPException(status_code=409, detail="Activity changed since it was loaded. Refresh and retry.")
    old_data = _activity_snapshot(activity)
    values = payload.model_dump(exclude_unset=True, exclude={"expected_version", "assignee_user_ids", "department_names", "references", "recurrence"})
    target_type = values.get("activity_type", activity.activity_type)
    target_start = values.get("start_at", activity.start_at)
    target_end = values.get("end_at", activity.end_at)
    target_due = values.get("due_at", activity.due_at)
    timezone_name = values.get("timezone") or activity.timezone
    try:
        ZoneInfo(timezone_name)
    except ZoneInfoNotFoundError as exc:
        raise HTTPException(status_code=422, detail="Unknown timezone.") from exc
    recurrence = payload.recurrence if "recurrence" in payload.model_fields_set else (
        RecurrenceInput(
            frequency=activity.recurrence_frequency,
            interval=activity.recurrence_interval,
            until=activity.recurrence_until,
            weekdays=[int(day) for day in (activity.recurrence_weekdays or "").split(",") if day.isdigit()],
        )
        if activity.recurrence_frequency
        else None
    )
    _validate_time_fields(target_type, target_start, target_end, target_due, recurrence, timezone_name)
    values.pop("timezone", None)
    values["timezone"] = timezone_name
    await validate_academic_scope(
        db,
        activity.institution_id,
        values.get("academic_year_id", activity.academic_year_id),
        values.get("division_id", activity.division_id),
        values.get("subject_id", activity.subject_id),
    )
    if "is_published" in values and values["is_published"] != activity.is_published:
        await _check_publish_permission(db, current_user, values["is_published"])

    assignee_ids = [item.user_id for item in activity.assignees]
    if payload.assignee_user_ids is not None or payload.department_names is not None:
        await require_planning_permission(db, current_user, "assign")
        assignee_ids = await resolve_assignee_ids(
            db,
            activity.institution_id,
            payload.assignee_user_ids or [],
            payload.department_names or [],
        )
    target_references = payload.references if payload.references is not None else None
    if target_references is not None:
        for reference in target_references:
            await validate_reference(db, activity.institution_id, reference.source_type, reference.source_record_id)

    for field in ("start_at", "end_at", "due_at"):
        if values.get(field) is not None:
            values[field] = values[field].astimezone(timezone.utc)
    values.update(_recurrence_fields(recurrence))
    candidate_location = values.get("location", activity.location)
    candidate_division = values.get("division_id", activity.division_id)
    schedule_candidate = Activity(
        id=activity.id,
        institution_id=activity.institution_id,
        start_at=values.get("start_at", activity.start_at),
        end_at=values.get("end_at", activity.end_at),
        timezone=timezone_name,
        recurrence_exceptions=list(activity.recurrence_exceptions),
        **_recurrence_fields(recurrence),
    )
    conflicts = await check_schedule_conflicts(
        db,
        schedule_candidate,
        assignee_ids,
        values.get("start_at", activity.start_at),
        values.get("end_at", activity.end_at),
        candidate_location,
        candidate_division,
        exclude_activity_id=activity.id,
    )
    if conflicts:
        raise HTTPException(
            status_code=409,
            detail={"message": "Activity conflicts with an existing schedule.", "conflicts": conflicts},
        )

    for key, value in values.items():
        setattr(activity, key, value)
    activity.version += 1
    if payload.assignee_user_ids is not None or payload.department_names is not None:
        await _replace_assignees(db, activity, assignee_ids, current_user.id)
    if target_references is not None:
        await _replace_references(db, activity, target_references)
    await record_activity_audit(db, current_user, activity, "updated", old_data, _activity_snapshot(activity))
    await db.commit()
    activity = await get_activity(db, activity.id, current_user)
    return {"item": await _serialize_activity_for_detail(db, activity)}


@router.patch("/activities/{activity_id}/status")
async def transition_activity(
    activity_id: int,
    payload: ActivityStatusRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    activity = await get_activity(db, activity_id, current_user, lock=True)
    await ensure_activity_visible(db, activity, current_user)
    if not await can_manage_activity(db, activity, current_user):
        raise HTTPException(status_code=403, detail="Only the creator, an assignee, or an activity manager may change status.")
    if activity.version != payload.expected_version:
        raise HTTPException(status_code=409, detail="Activity changed since it was loaded. Refresh and retry.")
    if payload.status not in STATUS_TRANSITIONS.get(activity.status, set()):
        raise HTTPException(
            status_code=422,
            detail=f"Transition from '{activity.status}' to '{payload.status}' is not allowed.",
        )
    action = "complete" if payload.status == "completed" else "cancel" if payload.status == "cancelled" else "edit"
    await require_planning_permission(db, current_user, action)
    old_data = _activity_snapshot(activity)
    activity.status = payload.status
    activity.version += 1
    await record_activity_audit(db, current_user, activity, "status_changed", old_data, _activity_snapshot(activity))
    await db.commit()
    return {"id": activity.id, "status": activity.status, "version": activity.version}


@router.delete("/activities/{activity_id}")
async def cancel_activity(
    activity_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    await require_planning_permission(db, current_user, "delete")
    activity = await get_activity(db, activity_id, current_user, lock=True)
    await ensure_activity_visible(db, activity, current_user)
    if not await can_manage_activity(db, activity, current_user):
        raise HTTPException(
            status_code=403,
            detail="Only the creator, an assignee, or an activity manager may cancel this activity.",
        )
    if activity.status == "cancelled":
        return {"id": activity.id, "status": activity.status}
    old_data = _activity_snapshot(activity)
    activity.status = "cancelled"
    activity.version += 1
    await record_activity_audit(db, current_user, activity, "cancelled", old_data, _activity_snapshot(activity))
    await db.commit()
    return {"id": activity.id, "status": activity.status, "version": activity.version}


@router.post("/activities/{activity_id}/exceptions")
async def cancel_occurrence(
    activity_id: int,
    occurrence_date: date = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    await require_planning_permission(db, current_user, "edit")
    activity = await get_activity(db, activity_id, current_user, lock=True)
    await ensure_activity_visible(db, activity, current_user)
    if not await can_manage_activity(db, activity, current_user):
        raise HTTPException(status_code=403, detail="Only an activity manager may edit its recurrence.")
    if not activity.recurrence_frequency:
        raise HTTPException(status_code=422, detail="Only recurring activities can have occurrence exceptions.")
    if occurrence_date not in {
        date.fromisoformat(item["occurrence_date"])
        for item in expand_activity(activity, occurrence_date, occurrence_date)
    }:
        raise HTTPException(status_code=422, detail="The selected date is not a scheduled occurrence.")
    existing_exception = (
        await db.execute(
            select(ActivityRecurrenceException).where(
                ActivityRecurrenceException.activity_id == activity.id,
                ActivityRecurrenceException.occurrence_date == occurrence_date,
            )
        )
    ).scalar_one_or_none()
    if existing_exception:
        raise HTTPException(status_code=409, detail="This occurrence is already cancelled.")
    exception = ActivityRecurrenceException(
        activity_id=activity.id,
        occurrence_date=occurrence_date,
        created_by_id=current_user.id,
    )
    db.add(exception)
    activity.version += 1
    await record_activity_audit(
        db,
        current_user,
        activity,
        "occurrence_cancelled",
        None,
        {"occurrence_date": occurrence_date.isoformat()},
    )
    await db.commit()
    return {"activity_id": activity.id, "occurrence_date": occurrence_date.isoformat()}


@router.get("/activities/{activity_id}/history")
async def activity_history(
    activity_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    await require_planning_permission(db, current_user, "view_audit")
    activity = await get_activity(db, activity_id, current_user, lock=True)
    await ensure_activity_visible(db, activity, current_user)
    query = select(AuditLog).where(
        AuditLog.resource_type == "activity",
        AuditLog.resource_id == activity.id,
        AuditLog.institution_id == activity.institution_id,
    )
    rows = (await db.execute(query.order_by(AuditLog.created_at.desc()).limit(100))).scalars().all()
    return {
        "items": [
            {
                "id": row.id,
                "action": row.action,
                "user_id": row.user_id,
                "old_data": json.loads(row.old_data) if row.old_data else None,
                "new_data": json.loads(row.new_data) if row.new_data else None,
                "created_at": row.created_at.isoformat() if row.created_at else None,
            }
            for row in rows
        ]
    }


def _upload_root() -> Path:
    default_root = Path(__file__).resolve().parents[3] / "uploads" / "planning"
    fallback = Path(tempfile.gettempdir()) / "prathamone_uploads" / "planning"
    candidates = [Path(os.getenv("PLANNING_UPLOAD_ROOT") or default_root), fallback]
    for candidate in candidates:
        try:
            candidate.mkdir(parents=True, exist_ok=True)
            if os.access(candidate, os.W_OK):
                return candidate.resolve()
        except OSError:
            continue
    raise HTTPException(status_code=500, detail="Planning attachment storage is not writable.")


async def _clamav_instream(content: bytes, host: str, port: int) -> bytes:
    reader, writer = await asyncio.open_connection(host, port)
    try:
        writer.write(b"zINSTREAM\0")
        await writer.drain()
        chunk_size = 64 * 1024
        for offset in range(0, len(content), chunk_size):
            chunk = content[offset : offset + chunk_size]
            writer.write(struct.pack("!I", len(chunk)) + chunk)
            await writer.drain()
        writer.write(b"\0\0\0\0")
        await writer.drain()
        return await reader.readuntil(b"\0")
    finally:
        writer.close()


async def _scan_attachment(content: bytes) -> None:
    host = os.getenv("CLAMAV_HOST", "").strip()
    try:
        port = int(os.getenv("CLAMAV_PORT", "3310"))
        timeout = float(os.getenv("CLAMAV_TIMEOUT_SECONDS", "60"))
        if not host or not 1 <= port <= 65535 or not math.isfinite(timeout) or timeout <= 0:
            raise ValueError("Invalid ClamAV configuration.")
    except ValueError as exc:
        raise HTTPException(
            status_code=503,
            detail="Attachment scanning is unavailable; upload was rejected.",
        ) from exc

    try:
        response = await asyncio.wait_for(
            _clamav_instream(content, host, port),
            timeout=timeout,
        )
    except (OSError, asyncio.TimeoutError, asyncio.IncompleteReadError, asyncio.LimitOverrunError) as exc:
        raise HTTPException(
            status_code=503,
            detail="Attachment scanning is unavailable; upload was rejected.",
        ) from exc

    result = response.decode("utf-8", errors="replace").rstrip("\0\r\n")
    if result.endswith(" FOUND"):
        raise HTTPException(
            status_code=422,
            detail="Attachment failed malware scanning and was rejected.",
        )
    if result != "stream: OK":
        raise HTTPException(
            status_code=503,
            detail="Attachment scanning failed; upload was rejected.",
        )


@router.post("/activities/{activity_id}/attachments", status_code=status.HTTP_201_CREATED)
async def upload_activity_attachment(
    activity_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    await require_planning_permission(db, current_user, "edit")
    activity = await get_activity(db, activity_id, current_user)
    await ensure_activity_visible(db, activity, current_user)
    if not await can_manage_activity(db, activity, current_user):
        raise HTTPException(status_code=403, detail="Only an activity manager may attach files.")
    extension = Path(file.filename or "").suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=415, detail="Unsupported attachment type.")
    content = await file.read(MAX_ATTACHMENT_BYTES + 1)
    if not content:
        raise HTTPException(status_code=422, detail="Attachment is empty.")
    if len(content) > MAX_ATTACHMENT_BYTES:
        raise HTTPException(status_code=413, detail="Attachment exceeds the 10 MB limit.")
    mime_type = _validated_attachment_mime(extension, content)
    if mime_type is None:
        raise HTTPException(status_code=415, detail="Attachment content does not match an allowed file type.")
    await _scan_attachment(content)
    safe_name = re.sub(r"[^A-Za-z0-9._-]", "_", Path(file.filename or "attachment").name)[:200]
    stored_name = f"{uuid.uuid4().hex}{extension}"
    activity_dir = _upload_root() / str(activity.institution_id) / str(activity.id)
    activity_dir.mkdir(parents=True, exist_ok=True)
    path = activity_dir / stored_name
    persisted = False
    try:
        path.write_bytes(content)
        attachment = ActivityAttachment(
            activity_id=activity.id,
            uploader_user_id=current_user.id,
            original_filename=safe_name,
            stored_filename=stored_name,
            storage_path=str(path.resolve()),
            mime_type=mime_type,
            file_size_bytes=len(content),
        )
        db.add(attachment)
        activity.version += 1
        await record_activity_audit(
            db,
            current_user,
            activity,
            "attachment_added",
            None,
            {"filename": safe_name, "size": len(content)},
        )
        await db.commit()
        persisted = True
        await db.refresh(attachment)
    finally:
        if not persisted:
            path.unlink(missing_ok=True)
    return {
        "id": attachment.id,
        "filename": attachment.original_filename,
        "mime_type": attachment.mime_type,
        "file_size_bytes": attachment.file_size_bytes,
    }


@router.delete("/attachments/{attachment_id}")
async def delete_activity_attachment(
    attachment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    await require_planning_permission(db, current_user, "edit")
    attachment = await db.get(ActivityAttachment, attachment_id)
    if attachment is None:
        raise HTTPException(status_code=404, detail="Attachment not found.")
    activity = await get_activity(db, attachment.activity_id, current_user, lock=True)
    await ensure_activity_visible(db, activity, current_user)
    if not await can_manage_activity(db, activity, current_user):
        raise HTTPException(status_code=403, detail="Only an activity manager may remove attachments.")
    stored_path = Path(attachment.storage_path).resolve()
    tenant_root = (_upload_root() / str(activity.institution_id)).resolve()
    if tenant_root not in stored_path.parents:
        raise HTTPException(status_code=404, detail="Attachment file is unavailable.")

    try:
        stored_path.unlink(missing_ok=True)
    except OSError as exc:
        raise HTTPException(
            status_code=500,
            detail="Attachment file could not be removed; metadata is retained so the request can be retried.",
        ) from exc

    await record_activity_audit(
        db,
        current_user,
        activity,
        "attachment_removed",
        None,
        {"attachment_id": attachment.id, "filename": attachment.original_filename},
    )
    activity.version += 1
    await db.delete(attachment)
    await db.commit()
    return {"id": attachment_id, "deleted": True, "version": activity.version}


@router.get("/attachments/{attachment_id}/download")
async def download_activity_attachment(
    attachment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    await require_planning_permission(db, current_user, "view")
    attachment = await db.get(ActivityAttachment, attachment_id)
    if attachment is None:
        raise HTTPException(status_code=404, detail="Attachment not found.")
    activity = await get_activity(db, attachment.activity_id, current_user)
    await ensure_activity_visible(db, activity, current_user)
    stored_path = Path(attachment.storage_path).resolve()
    tenant_root = (_upload_root() / str(activity.institution_id)).resolve()
    if tenant_root not in stored_path.parents or not stored_path.is_file():
        raise HTTPException(status_code=404, detail="Attachment file is unavailable.")
    return FileResponse(
        path=stored_path,
        media_type=attachment.mime_type,
        filename=attachment.original_filename,
    )
