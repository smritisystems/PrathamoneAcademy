# /**
#  * @file        homework.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      backend.app.api.v1.endpoints
#  *
#  * @author      Jawahar R. Mallah
#  * @organization AITDL (AI Technology & Development Lab)
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 AITDL
#  * @license     Proprietary
#  *
#  * @version     1.1.0
#  * @created     2026-11-11
#  * @updated     2026-11-12
#  *
#  * @description REST API endpoints for Homework & Assignment Management, Recipient Previews & Late-Joiner Policies, Secure File Attachments, Digital Submissions with Version History, Evaluations, Notifications, Dashboards, and Institute Analytics.
#  */

import json
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy import and_, asc, desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.deps import (
    check_institution_access,
    get_current_active_user,
    is_sysadmin,
    require_role,
)
from app.models.communication import CommunicationLog
from app.models.division import Division
from app.models.enrollment import StudentEnrollment
from app.models.homework import (
    HomeworkAssignment,
    HomeworkAuditLog,
    HomeworkFile,
    StudentHomeworkRecord,
)
from app.models.standard import Standard
from app.models.student import Student
from app.models.subject import Subject
from app.models.user import User
from app.services.homework_service import HomeworkService

router = APIRouter()

HOMEWORK_STAFF_ROLES = (
    "superadmin",
    "sysadmin",
    "super_admin",
    "admin",
    "principal",
    "teacher",
    "staff",
    "coordinator",
)


async def _get_authorized_assignment(
    db: AsyncSession, assignment_id: int, current_user: User
) -> HomeworkAssignment:
    """Loads a homework assignment and enforces institution isolation."""
    hw = await db.get(HomeworkAssignment, assignment_id)
    if not hw:
        raise HTTPException(status_code=404, detail="Assignment not found.")
    check_institution_access(hw.institution_id, current_user)
    return hw


async def _get_authorized_record(
    db: AsyncSession, record_id: int, current_user: User
) -> StudentHomeworkRecord:
    """Loads a homework tracking record and validates its parent assignment's institution."""
    rec = (
        await db.execute(
            select(StudentHomeworkRecord)
            .options(selectinload(StudentHomeworkRecord.assignment))
            .where(StudentHomeworkRecord.id == record_id)
        )
    ).scalar_one_or_none()
    if not rec:
        raise HTTPException(status_code=404, detail=f"Student homework record ID {record_id} not found.")
    hw = rec.assignment
    if not hw:
        raise HTTPException(status_code=404, detail="Parent assignment not found.")
    check_institution_access(hw.institution_id, current_user)
    return rec


async def _require_hw_action(
    db: AsyncSession,
    user: User,
    action: str,
    assignment: Optional[HomeworkAssignment] = None,
) -> None:
    """Enforces separated Homework permission actions (edit, delete, publish, evaluate, etc.)."""
    allowed = await HomeworkService.check_permission(db, user, action, assignment=assignment)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Insufficient permissions: requires 'homework:{action}' authorization.",
        )


def _safe_json_loads(raw: Optional[str], default: Any) -> Any:
    if not raw:
        return default
    try:
        return json.loads(raw)
    except Exception:
        return default


# ── Pydantic Request Schemas ──

class HomeworkAttachmentSchema(BaseModel):
    title: str
    file_url: str
    file_type: str = "document"
    file_size_bytes: int = 0
    file_id: Optional[int] = None


class StudentAssignmentOverrideSchema(BaseModel):
    student_id: int
    due_date: Optional[date] = None
    due_time: Optional[str] = None
    instructions: Optional[str] = None
    attachments: Optional[List[HomeworkAttachmentSchema]] = None


class HomeworkCreateSchema(BaseModel):
    academic_year_id: int
    board_id: Optional[int] = None
    standard_id: int
    subject_id: int
    subject_mapping_id: Optional[int] = None
    division_id: Optional[int] = None
    teaching_session_id: Optional[int] = None
    teacher_user_id: int
    assignment_type: str = "homework"
    estimated_duration_minutes: Optional[int] = None
    title: str = Field(..., min_length=2, max_length=255)
    description: Optional[str] = None
    instructions: Optional[str] = None
    chapter: Optional[str] = None
    topic: Optional[str] = None
    assigned_date: Optional[date] = None
    due_date: date
    due_time: str = "23:59"
    max_marks: Optional[Decimal] = None
    difficulty_level: str = "medium"
    priority: str = "normal"
    submission_method: str = "physical_notebook"
    recipient_type: str = "batch"  # batch | multi_batch | selected_group | selected_students | individual_student | student_group
    recipient_batch_ids: Optional[List[int]] = None
    selected_student_ids: Optional[List[int]] = None
    student_overrides: Optional[List[StudentAssignmentOverrideSchema]] = None
    late_joiner_policy: str = "manual"
    status: str = "published"  # draft | published | scheduled | closed | archived
    publish_at: Optional[datetime] = None
    attachments: Optional[List[HomeworkAttachmentSchema]] = None
    allow_late_submissions: bool = True
    allow_resubmission: bool = True
    is_template: bool = False
    template_name: Optional[str] = None


class HomeworkUpdateSchema(BaseModel):
    title: Optional[str] = None
    assignment_type: Optional[str] = None
    estimated_duration_minutes: Optional[int] = None
    description: Optional[str] = None
    instructions: Optional[str] = None
    chapter: Optional[str] = None
    topic: Optional[str] = None
    due_date: Optional[date] = None
    due_time: Optional[str] = None
    max_marks: Optional[Decimal] = None
    difficulty_level: Optional[str] = None
    priority: Optional[str] = None
    submission_method: Optional[str] = None
    late_joiner_policy: Optional[str] = None
    allow_late_submissions: Optional[bool] = None
    allow_resubmission: Optional[bool] = None
    status: Optional[str] = None
    attachments: Optional[List[HomeworkAttachmentSchema]] = None


class RecipientPreviewSchema(BaseModel):
    academic_year_id: int
    standard_id: int
    division_id: Optional[int] = None
    subject_id: Optional[int] = None
    recipient_type: str = "batch"
    recipient_batch_ids: Optional[List[int]] = None
    selected_student_ids: Optional[List[int]] = None


class PublishAssignmentSchema(BaseModel):
    selected_student_ids: Optional[List[int]] = None
    student_overrides: Optional[List[StudentAssignmentOverrideSchema]] = None


class ReopenAssignmentSchema(BaseModel):
    new_due_date: Optional[date] = None
    reason: Optional[str] = None


class SyncLateJoinersSchema(BaseModel):
    student_ids: Optional[List[int]] = None
    reason: str = "Late batch enrollment inclusion"


class CheckingItemSchema(BaseModel):
    record_id: Optional[int] = None
    student_id: Optional[int] = None
    review_status: str  # done | evaluated | incomplete | not_done | absent_not_checked | excused | returned | under_evaluation
    marks_obtained: Optional[Decimal] = None
    teacher_remarks: Optional[str] = None
    exemption_reason: Optional[str] = None
    teacher_feedback_attachments: Optional[List[HomeworkAttachmentSchema]] = None
    correction_requested: bool = False


class BulkCheckPayload(BaseModel):
    items: List[CheckingItemSchema]


class SingleEvaluatePayload(BaseModel):
    review_status: str = "evaluated"
    marks_obtained: Optional[Decimal] = None
    teacher_remarks: Optional[str] = None
    teacher_feedback_attachments: Optional[List[HomeworkAttachmentSchema]] = None
    correction_requested: bool = False


class DigitalSubmissionPayload(BaseModel):
    submission_text: Optional[str] = None
    submission_files: Optional[List[Dict[str, Any]]] = None


class ResubmissionRequestPayload(BaseModel):
    remarks: str
    extended_due_date: Optional[date] = None


class DueDateExtensionPayload(BaseModel):
    new_due_date: date
    reason: Optional[str] = None


class StudentExemptionPayload(BaseModel):
    reason: str


class HomeworkSettingsUpdatePayload(BaseModel):
    allowed_extensions: Optional[List[str]] = None
    max_file_size_mb: Optional[int] = None
    custom_assignment_types: Optional[List[str]] = None
    default_late_joiner_policy: Optional[str] = None
    reminder_hours_before_due: Optional[int] = None
    pending_eval_alert_threshold: Optional[int] = None
    allow_parent_portal_view: Optional[bool] = None


# ============================================================================
# 1. SETTINGS, FILE ATTACHMENTS & RECIPIENT PREVIEW / SEARCH
# ============================================================================

@router.get("/settings")
async def get_homework_module_settings(
    institution_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Retrieves institutional homework policies (allowed extensions, max MB, custom assignment types)."""
    inst_id = institution_id or current_user.institution_id or 1
    check_institution_access(inst_id, current_user)
    return await HomeworkService.get_homework_settings(db, inst_id)


@router.put("/settings")
async def update_homework_module_settings(
    payload: HomeworkSettingsUpdatePayload,
    institution_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("superadmin", "sysadmin", "super_admin", "admin", "principal")),
):
    """Updates configurable homework rules, custom assignment types, and allowed file formats."""
    inst_id = institution_id or current_user.institution_id or 1
    check_institution_access(inst_id, current_user)
    await _require_hw_action(db, current_user, "settings")
    return await HomeworkService.update_homework_settings(
        db, inst_id, payload.model_dump(exclude_unset=True), current_user.id
    )


@router.post("/files/upload", status_code=status.HTTP_201_CREATED)
async def upload_homework_attachment(
    file: UploadFile = File(...),
    context: str = Form("assignment_attachment"),
    assignment_id: Optional[int] = Form(None),
    student_record_id: Optional[int] = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Securely uploads a homework attachment or student submission document.
    Validates extension, MIME type, file size limit, and student/staff permissions.
    """
    role = (current_user.role or "").strip().lower()
    if role == "student":
        if context != "submission_file":
            raise HTTPException(status_code=403, detail="Students can only upload submission attachments.")
        if student_record_id:
            rec = await _get_authorized_record(db, student_record_id, current_user)
            if rec.student_id != current_user.student_id:
                raise HTTPException(status_code=403, detail="Cannot upload file to another student's submission.")
    elif not is_sysadmin(current_user) and role not in HOMEWORK_STAFF_ROLES:
        raise HTTPException(status_code=403, detail="Insufficient permissions to upload homework files.")

    inst_id = current_user.institution_id or 1
    if assignment_id:
        hw = await _get_authorized_assignment(db, assignment_id, current_user)
        inst_id = hw.institution_id
    elif student_record_id:
        rec = await _get_authorized_record(db, student_record_id, current_user)
        inst_id = rec.institution_id

    try:
        saved = await HomeworkService.save_homework_file(
            db=db,
            institution_id=inst_id,
            uploader_user=current_user,
            upload=file,
            context=context,
            assignment_id=assignment_id,
            student_record_id=student_record_id,
        )
    except ValueError as e:
        msg = str(e)
        code = 413 if "exceeds maximum allowed size" in msg.lower() else 400
        raise HTTPException(status_code=code, detail=msg)

    return {
        "id": saved.id,
        "title": saved.original_filename,
        "file_name": saved.original_filename,
        "file_url": f"/api/v1/homework/files/{saved.id}/download",
        "file_type": saved.extension,
        "mime_type": saved.mime_type,
        "file_size_bytes": saved.file_size_bytes,
    }


@router.get("/files/{file_id}/download")
async def download_homework_attachment(
    file_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Streams an uploaded homework attachment after verifying institution and ownership access."""
    hw_file = await db.get(HomeworkFile, file_id)
    if not hw_file:
        raise HTTPException(status_code=404, detail="Attachment not found.")
    check_institution_access(hw_file.institution_id, current_user)

    role = (current_user.role or "").strip().lower()
    if role in ("student", "parent", "guardian"):
        linked_student_id = current_user.student_id
        if not linked_student_id:
            raise HTTPException(status_code=403, detail="No student profile linked.")
        if hw_file.student_record_id:
            rec = await db.get(StudentHomeworkRecord, hw_file.student_record_id)
            if not rec or rec.student_id != linked_student_id:
                raise HTTPException(status_code=403, detail="Access denied to another student's file.")
        elif hw_file.assignment_id:
            rec_id = (
                await db.execute(
                    select(StudentHomeworkRecord.id).where(
                        StudentHomeworkRecord.assignment_id == hw_file.assignment_id,
                        StudentHomeworkRecord.student_id == linked_student_id,
                    )
                )
            ).scalar_one_or_none()
            if rec_id is None:
                raise HTTPException(status_code=403, detail="This assignment attachment is not assigned to you.")
        elif hw_file.uploader_user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied.")
    elif not is_sysadmin(current_user) and role not in HOMEWORK_STAFF_ROLES:
        raise HTTPException(status_code=403, detail="Insufficient permissions.")

    disk_path = Path(hw_file.storage_path)
    if not disk_path.is_file():
        raise HTTPException(status_code=404, detail="Stored file binary no longer exists on server.")

    return FileResponse(
        path=str(disk_path),
        filename=hw_file.original_filename,
        media_type=hw_file.mime_type or "application/octet-stream",
    )


@router.get("/students/search")
async def search_homework_students(
    standard_id: Optional[int] = Query(None),
    division_id: Optional[int] = Query(None),
    academic_year_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*HOMEWORK_STAFF_ROLES)),
):
    """Searches eligible active students by name or admission number for individual/group assignments."""
    inst_id = current_user.institution_id or 1
    conditions = [
        Student.institution_id == inst_id,
        Student.is_active == True,
        StudentEnrollment.status == "active",
    ]
    if standard_id:
        conditions.append(StudentEnrollment.standard_id == standard_id)
    if division_id:
        conditions.append(StudentEnrollment.division_id == division_id)
    if academic_year_id:
        conditions.append(StudentEnrollment.academic_year_id == academic_year_id)
    if search and search.strip():
        p = f"%{search.strip()}%"
        conditions.append(
            or_(
                Student.first_name.ilike(p),
                Student.last_name.ilike(p),
                Student.admission_number.ilike(p),
                StudentEnrollment.roll_number.ilike(p),
            )
        )

    stmt = (
        select(
            Student.id,
            Student.first_name,
            Student.last_name,
            Student.admission_number,
            StudentEnrollment.roll_number,
            StudentEnrollment.division_id,
            Division.name.label("division_name"),
        )
        .join(StudentEnrollment, StudentEnrollment.student_id == Student.id)
        .outerjoin(Division, StudentEnrollment.division_id == Division.id)
        .where(and_(*conditions))
        .order_by(asc(StudentEnrollment.roll_number), asc(Student.first_name))
        .limit(limit)
    )
    rows = (await db.execute(stmt)).all()
    seen = set()
    items = []
    for sid, fn, ln, adm, roll, div_id, div_name in rows:
        if sid in seen:
            continue
        seen.add(sid)
        items.append({
            "student_id": sid,
            "student_name": f"{fn} {ln}".strip(),
            "admission_number": adm,
            "roll_number": roll or "—",
            "division_id": div_id,
            "division_name": div_name or "Unassigned",
        })
    return {"items": items, "total": len(items)}


@router.post("/recipients/preview")
async def preview_assignment_recipients(
    payload: RecipientPreviewSchema,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*HOMEWORK_STAFF_ROLES)),
):
    """Returns deduplicated eligible active student count and preview roster prior to publishing."""
    std = await db.get(Standard, payload.standard_id)
    if not std:
        raise HTTPException(status_code=404, detail="Standard not found.")
    check_institution_access(std.institution_id, current_user)
    try:
        await HomeworkService.validate_teacher_scope(
            db,
            current_user,
            std.institution_id,
            standard_id=payload.standard_id,
            division_id=payload.division_id,
            batch_ids=payload.recipient_batch_ids,
            subject_id=payload.subject_id,
            student_ids=payload.selected_student_ids,
        )
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    return await HomeworkService.preview_recipients(
        db=db,
        institution_id=std.institution_id or current_user.institution_id or 1,
        academic_year_id=payload.academic_year_id,
        standard_id=payload.standard_id,
        recipient_type=payload.recipient_type,
        division_id=payload.division_id,
        recipient_batch_ids=payload.recipient_batch_ids,
        selected_student_ids=payload.selected_student_ids,
    )


# ============================================================================
# 2. ASSIGNMENT CRUD & LIFECYCLE WORKFLOW
# ============================================================================

@router.get("/assignments")
async def list_assignments(
    division_id: Optional[int] = Query(None),
    standard_id: Optional[int] = Query(None),
    subject_id: Optional[int] = Query(None),
    teacher_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    assignment_type: Optional[str] = Query(None),
    submission_method: Optional[str] = Query(None),
    is_template: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*HOMEWORK_STAFF_ROLES)),
):
    """Lists homework & assignments with real-time completion summary stats."""
    await _require_hw_action(db, current_user, "view")
    inst_id = current_user.institution_id or 1
    conditions = [HomeworkAssignment.institution_id == inst_id]

    if current_user.role == "teacher" and not teacher_id:
        teacher_id = current_user.id

    if teacher_id:
        conditions.append(HomeworkAssignment.teacher_user_id == teacher_id)
    if division_id:
        conditions.append(HomeworkAssignment.division_id == division_id)
    if standard_id:
        conditions.append(HomeworkAssignment.standard_id == standard_id)
    if subject_id:
        conditions.append(HomeworkAssignment.subject_id == subject_id)
    if status_filter and status_filter != "all":
        conditions.append(HomeworkAssignment.status == status_filter)
    if assignment_type and assignment_type != "all":
        conditions.append(HomeworkAssignment.assignment_type == assignment_type)
    if submission_method and submission_method != "all":
        conditions.append(HomeworkAssignment.submission_method == submission_method)
    if is_template is not None:
        conditions.append(HomeworkAssignment.is_template == is_template)
    if search:
        p = f"%{search.strip()}%"
        conditions.append(
            or_(
                HomeworkAssignment.title.ilike(p),
                HomeworkAssignment.assignment_code.ilike(p),
                HomeworkAssignment.topic.ilike(p),
                HomeworkAssignment.chapter.ilike(p),
            )
        )

    total_count = (await db.execute(select(func.count(HomeworkAssignment.id)).where(and_(*conditions)))).scalar() or 0

    stmt = (
        select(
            HomeworkAssignment,
            Standard.name.label("standard_name"),
            Subject.name.label("subject_name"),
            Division.name.label("division_name"),
            func.concat(User.first_name, " ", User.last_name).label("teacher_name"),
        )
        .join(Standard, HomeworkAssignment.standard_id == Standard.id)
        .join(Subject, HomeworkAssignment.subject_id == Subject.id)
        .outerjoin(Division, HomeworkAssignment.division_id == Division.id)
        .join(User, HomeworkAssignment.teacher_user_id == User.id)
        .where(and_(*conditions))
        .order_by(desc(HomeworkAssignment.assigned_date), desc(HomeworkAssignment.id))
        .offset((page - 1) * limit)
        .limit(limit)
    )
    rows = (await db.execute(stmt)).all()

    items = []
    for hw, std_name, subj_name, div_name, t_name in rows:
        summary = await HomeworkService.get_assignment_summary(db, hw.id)
        items.append({
            "id": hw.id,
            "assignment_code": hw.assignment_code,
            "assignment_type": hw.assignment_type,
            "estimated_duration_minutes": hw.estimated_duration_minutes,
            "title": hw.title,
            "description": hw.description,
            "instructions": hw.instructions,
            "chapter": hw.chapter,
            "topic": hw.topic,
            "academic_year_id": hw.academic_year_id,
            "standard_id": hw.standard_id,
            "standard_name": std_name,
            "subject_id": hw.subject_id,
            "subject_name": subj_name,
            "division_id": hw.division_id,
            "division_name": div_name or "Multi-Batch",
            "teaching_session_id": hw.teaching_session_id,
            "teacher_user_id": hw.teacher_user_id,
            "teacher_name": t_name,
            "assigned_date": str(hw.assigned_date),
            "due_date": str(hw.due_date),
            "due_time": hw.due_time,
            "max_marks": float(hw.max_marks) if hw.max_marks is not None else None,
            "difficulty_level": hw.difficulty_level,
            "priority": hw.priority,
            "submission_method": hw.submission_method,
            "recipient_type": hw.recipient_type,
            "original_recipient_count": hw.original_recipient_count,
            "late_joiner_policy": hw.late_joiner_policy,
            "allow_late_submissions": hw.allow_late_submissions,
            "allow_resubmission": hw.allow_resubmission,
            "status": hw.status,
            "published_at": hw.published_at.isoformat() if hw.published_at else None,
            "closed_at": hw.closed_at.isoformat() if hw.closed_at else None,
            "is_template": hw.is_template,
            "template_name": hw.template_name,
            "attachments": _safe_json_loads(hw.attachments, []),
            "summary": summary,
        })

    return {"items": items, "total": total_count, "page": page, "limit": limit}


@router.post("/assignments")
async def create_assignment(
    payload: HomeworkCreateSchema,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*HOMEWORK_STAFF_ROLES)),
):
    """Creates a draft, scheduled, or published assignment with recipient snapshotting."""
    await _require_hw_action(db, current_user, "create")
    if (payload.status or "published").strip().lower() == "published":
        await _require_hw_action(db, current_user, "publish")

    std = await db.get(Standard, payload.standard_id)
    if not std:
        raise HTTPException(status_code=404, detail="Standard not found.")
    check_institution_access(std.institution_id, current_user)
    if payload.division_id:
        div = await db.get(Division, payload.division_id)
        if not div or div.standard_id != std.id:
            raise HTTPException(status_code=400, detail="Division does not belong to the selected standard.")

    try:
        await HomeworkService.validate_teacher_scope(
            db,
            current_user,
            std.institution_id,
            standard_id=payload.standard_id,
            division_id=payload.division_id,
            batch_ids=payload.recipient_batch_ids,
            subject_id=payload.subject_id,
            student_ids=payload.selected_student_ids,
        )
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    data = payload.model_dump()
    assignment = await HomeworkService.create_assignment(
        db,
        data,
        actor_user_id=current_user.id,
        institution_id=std.institution_id or current_user.institution_id or 1,
        actor_user=current_user,
    )
    return {
        "success": True,
        "message": f"Homework assignment '{assignment.assignment_code}' created successfully.",
        "id": assignment.id,
        "assignment_code": assignment.assignment_code,
        "status": assignment.status,
        "original_recipient_count": assignment.original_recipient_count,
    }


@router.get("/assignments/{assignment_id}")
async def get_assignment(
    assignment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*HOMEWORK_STAFF_ROLES)),
):
    """Retrieves full assignment details, summary KPIs, and audit log timeline."""
    await _require_hw_action(db, current_user, "view")
    await _get_authorized_assignment(db, assignment_id, current_user)
    stmt = (
        select(
            HomeworkAssignment,
            Standard.name.label("standard_name"),
            Subject.name.label("subject_name"),
            Division.name.label("division_name"),
            func.concat(User.first_name, " ", User.last_name).label("teacher_name"),
        )
        .join(Standard, HomeworkAssignment.standard_id == Standard.id)
        .join(Subject, HomeworkAssignment.subject_id == Subject.id)
        .outerjoin(Division, HomeworkAssignment.division_id == Division.id)
        .join(User, HomeworkAssignment.teacher_user_id == User.id)
        .where(HomeworkAssignment.id == assignment_id)
    )
    row = (await db.execute(stmt)).first()
    if not row:
        raise HTTPException(status_code=404, detail="Assignment not found.")

    hw, std_name, subj_name, div_name, t_name = row
    summary = await HomeworkService.get_assignment_summary(db, hw.id)
    logs = (
        await db.execute(
            select(HomeworkAuditLog)
            .where(HomeworkAuditLog.assignment_id == hw.id)
            .order_by(desc(HomeworkAuditLog.created_at))
            .limit(40)
        )
    ).scalars().all()

    return {
        "id": hw.id,
        "assignment_code": hw.assignment_code,
        "assignment_type": hw.assignment_type,
        "estimated_duration_minutes": hw.estimated_duration_minutes,
        "title": hw.title,
        "description": hw.description,
        "instructions": hw.instructions,
        "chapter": hw.chapter,
        "topic": hw.topic,
        "standard_id": hw.standard_id,
        "standard_name": std_name,
        "subject_id": hw.subject_id,
        "subject_name": subj_name,
        "division_id": hw.division_id,
        "division_name": div_name or "Multi-Batch",
        "teaching_session_id": hw.teaching_session_id,
        "teacher_user_id": hw.teacher_user_id,
        "teacher_name": t_name,
        "assigned_date": str(hw.assigned_date),
        "due_date": str(hw.due_date),
        "due_time": hw.due_time,
        "max_marks": float(hw.max_marks) if hw.max_marks is not None else None,
        "difficulty_level": hw.difficulty_level,
        "priority": hw.priority,
        "submission_method": hw.submission_method,
        "recipient_type": hw.recipient_type,
        "original_recipient_count": hw.original_recipient_count,
        "late_joiner_policy": hw.late_joiner_policy,
        "allow_late_submissions": hw.allow_late_submissions,
        "allow_resubmission": hw.allow_resubmission,
        "status": hw.status,
        "published_at": hw.published_at.isoformat() if hw.published_at else None,
        "closed_at": hw.closed_at.isoformat() if hw.closed_at else None,
        "is_template": hw.is_template,
        "template_name": hw.template_name,
        "attachments": _safe_json_loads(hw.attachments, []),
        "summary": summary,
        "audit_logs": [
            {
                "id": lg.id,
                "action": lg.action,
                "previous_status": lg.previous_status,
                "new_status": lg.new_status,
                "details": lg.details,
                "created_at": lg.created_at.isoformat() if lg.created_at else None,
            }
            for lg in logs
        ],
    }


@router.put("/assignments/{assignment_id}")
async def update_assignment(
    assignment_id: int,
    payload: HomeworkUpdateSchema,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*HOMEWORK_STAFF_ROLES)),
):
    """Updates an assignment; published updates record detailed audit logs and notify students."""
    hw = await _get_authorized_assignment(db, assignment_id, current_user)
    await _require_hw_action(db, current_user, "edit", assignment=hw)
    if current_user.role == "teacher" and hw.teacher_user_id != current_user.id:
        if not await HomeworkService.check_permission(db, current_user, "manage_all"):
            raise HTTPException(status_code=403, detail="Teachers may only edit their own assignments.")

    data = payload.model_dump(exclude_unset=True)
    if "status" in data and data["status"] != hw.status:
        try:
            await HomeworkService.transition_assignment_status(
                db, hw, data.pop("status"), current_user
            )
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

    changed_diff: Dict[str, Any] = {}
    due_changed = False
    if "attachments" in data and data["attachments"] is not None:
        new_att = [a.model_dump() for a in payload.attachments]
        changed_diff["attachments"] = "updated"
        hw.attachments = json.dumps(new_att)
        await HomeworkService._bind_file_urls_to_assignment(db, hw.id, None, new_att)
        del data["attachments"]

    for k, v in data.items():
        old_val = getattr(hw, k, None)
        if old_val != v:
            changed_diff[k] = {"old": str(old_val), "new": str(v)}
            if k in ("due_date", "due_time"):
                due_changed = True
            setattr(hw, k, v)

    if changed_diff:
        db.add(
            HomeworkAuditLog(
                assignment_id=hw.id,
                actor_user_id=current_user.id,
                action="updated_published" if hw.status == "published" else "updated_draft",
                previous_status=hw.status,
                new_status=hw.status,
                details=json.dumps(changed_diff),
            )
        )
        if hw.status == "published" and due_changed:
            records = (
                await db.execute(
                    select(StudentHomeworkRecord).where(StudentHomeworkRecord.assignment_id == hw.id)
                )
            ).scalars().all()
            await HomeworkService._notify_assignment_students(
                db=db,
                assignment=hw,
                records=records,
                template_code="HW_DUE_CHANGED",
                subject=f"Due Date Updated: {hw.title}",
                message=f"Due date/time for '{hw.title}' ({hw.assignment_code}) changed to {hw.due_date} {hw.due_time}.",
                dedup_suffix=f"due_{hw.due_date}_{hw.due_time}",
                sender_user=current_user,
            )

    await db.commit()
    return {"success": True, "message": "Assignment updated successfully.", "changed_fields": list(changed_diff.keys())}


@router.post("/assignments/{assignment_id}/publish")
async def publish_assignment_endpoint(
    assignment_id: int,
    payload: Optional[PublishAssignmentSchema] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*HOMEWORK_STAFF_ROLES)),
):
    """Publishes a draft or scheduled assignment, provisions student records, and notifies recipients."""
    hw = await _get_authorized_assignment(db, assignment_id, current_user)
    await _require_hw_action(db, current_user, "publish", assignment=hw)
    if current_user.role == "teacher" and hw.teacher_user_id != current_user.id:
        if not await HomeworkService.check_permission(db, current_user, "manage_all"):
            raise HTTPException(status_code=403, detail="Teachers may only publish their own assignments.")
    try:
        updated = await HomeworkService.publish_assignment(
            db,
            hw,
            actor_user=current_user,
            selected_student_ids=payload.selected_student_ids if payload else None,
            student_overrides=[ov.model_dump() for ov in payload.student_overrides] if payload and payload.student_overrides else None,
        )
        return {
            "success": True,
            "message": f"Assignment '{updated.assignment_code}' published to {updated.original_recipient_count} students.",
            "status": updated.status,
            "original_recipient_count": updated.original_recipient_count,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/assignments/{assignment_id}/close")
async def close_assignment_endpoint(
    assignment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*HOMEWORK_STAFF_ROLES)),
):
    """Closes a published assignment from further submissions."""
    hw = await _get_authorized_assignment(db, assignment_id, current_user)
    await _require_hw_action(db, current_user, "publish", assignment=hw)
    try:
        updated = await HomeworkService.transition_assignment_status(db, hw, "closed", current_user)
        return {"success": True, "status": updated.status, "message": "Assignment closed."}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/assignments/{assignment_id}/reopen")
async def reopen_assignment_endpoint(
    assignment_id: int,
    payload: Optional[ReopenAssignmentSchema] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*HOMEWORK_STAFF_ROLES)),
):
    """Reopens a closed assignment and notifies all assigned students."""
    hw = await _get_authorized_assignment(db, assignment_id, current_user)
    await _require_hw_action(db, current_user, "publish", assignment=hw)
    try:
        updated = await HomeworkService.transition_assignment_status(
            db,
            hw,
            "published",
            current_user,
            reason=payload.reason if payload else None,
            new_due_date=payload.new_due_date if payload else None,
        )
        return {"success": True, "status": updated.status, "message": "Assignment reopened and students notified."}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/assignments/{assignment_id}/sync-late-joiners")
async def sync_late_joiners_endpoint(
    assignment_id: int,
    payload: Optional[SyncLateJoinersSchema] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*HOMEWORK_STAFF_ROLES)),
):
    """Includes newly joined batch students into a published assignment without altering original snapshot."""
    hw = await _get_authorized_assignment(db, assignment_id, current_user)
    await _require_hw_action(db, current_user, "publish", assignment=hw)
    return await HomeworkService.sync_late_joiners(
        db=db,
        assignment=hw,
        actor_user_id=current_user.id,
        student_ids=payload.student_ids if payload else None,
        reason=payload.reason if payload else "Late batch enrollment inclusion",
        sender_user=current_user,
    )


@router.delete("/assignments/{assignment_id}")
async def delete_assignment(
    assignment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*HOMEWORK_STAFF_ROLES)),
):
    """Deletes draft assignments or archives published ones preserving historical data when evaluated."""
    hw = await _get_authorized_assignment(db, assignment_id, current_user)
    await _require_hw_action(db, current_user, "delete", assignment=hw)

    if hw.status != "draft":
        has_activity = (
            await db.execute(
                select(StudentHomeworkRecord.id).where(
                    StudentHomeworkRecord.assignment_id == hw.id,
                    or_(
                        StudentHomeworkRecord.submission_version > 0,
                        StudentHomeworkRecord.review_status != "pending",
                    ),
                )
                .limit(1)
            )
        ).scalar_one_or_none()
        if has_activity is not None:
            hw.status = "archived"
            db.add(
                HomeworkAuditLog(
                    assignment_id=hw.id,
                    actor_user_id=current_user.id,
                    action="archived",
                    previous_status=hw.status,
                    new_status="archived",
                    details="Archived instead of hard delete to preserve student submission/evaluation history.",
                )
            )
            await db.commit()
            return {"success": True, "message": "Assignment archived to preserve student submission/evaluation history."}

    await db.delete(hw)
    await db.commit()
    return {"success": True, "message": "Assignment deleted successfully."}


# ============================================================================
# 3. EVALUATION & CHECKING REGISTER
# ============================================================================

@router.get("/assignments/{assignment_id}/register")
async def get_checking_register(
    assignment_id: int,
    search: Optional[str] = Query(None),
    review_status: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*HOMEWORK_STAFF_ROLES)),
):
    """Lists assigned students with submission history, evaluation history, and custom override details."""
    await _require_hw_action(db, current_user, "view")
    await _get_authorized_assignment(db, assignment_id, current_user)
    stmt = (
        select(
            StudentHomeworkRecord,
            Student.first_name,
            Student.last_name,
            Student.admission_number,
            Student.photo_url,
            StudentEnrollment.roll_number,
            Division.name.label("division_name"),
        )
        .join(Student, StudentHomeworkRecord.student_id == Student.id)
        .outerjoin(StudentEnrollment, StudentHomeworkRecord.enrollment_id == StudentEnrollment.id)
        .outerjoin(Division, StudentHomeworkRecord.division_id == Division.id)
        .where(StudentHomeworkRecord.assignment_id == assignment_id)
        .order_by(
            asc(StudentEnrollment.roll_number),
            asc(Student.first_name),
            asc(Student.last_name),
        )
    )

    if review_status and review_status != "all":
        stmt = stmt.where(StudentHomeworkRecord.review_status == review_status)
    if search:
        p = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                Student.first_name.ilike(p),
                Student.last_name.ilike(p),
                Student.admission_number.ilike(p),
                StudentEnrollment.roll_number.ilike(p),
            )
        )

    rows = (await db.execute(stmt)).all()
    students = []
    for r, f_name, l_name, adm_no, photo, roll_no, div_name in rows:
        students.append({
            "record_id": r.id,
            "student_id": r.student_id,
            "student_name": f"{f_name} {l_name}",
            "admission_number": adm_no,
            "roll_number": roll_no or "—",
            "photo_url": photo,
            "division_name": div_name,
            "status": r.status,
            "viewed_at": r.viewed_at.isoformat() if r.viewed_at else None,
            "submission_status": r.submission_status,
            "submission_time": r.submission_time.isoformat() if r.submission_time else None,
            "submission_text": r.submission_text,
            "submission_files": _safe_json_loads(r.submission_files, []),
            "submission_version": r.submission_version,
            "submission_history": _safe_json_loads(r.submission_history, []),
            "review_status": r.review_status,
            "marks_obtained": float(r.marks_obtained) if r.marks_obtained is not None else None,
            "teacher_remarks": r.teacher_remarks,
            "teacher_feedback_attachments": _safe_json_loads(r.teacher_feedback_attachments, []),
            "evaluation_history": _safe_json_loads(r.evaluation_history, []),
            "reviewed_at": r.reviewed_at.isoformat() if r.reviewed_at else None,
            "individual_due_date": str(r.individual_due_date) if r.individual_due_date else None,
            "custom_instructions": r.custom_instructions,
            "custom_attachments": _safe_json_loads(r.custom_attachments, []),
            "is_late_addition": r.is_late_addition,
            "addition_reason": r.addition_reason,
            "exemption_reason": r.exemption_reason,
            "resubmission_count": r.resubmission_count,
        })

    return {"assignment_id": assignment_id, "students": students, "total": len(students)}


@router.post("/assignments/{assignment_id}/check")
async def check_homework_register(
    assignment_id: int,
    payload: BulkCheckPayload,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*HOMEWORK_STAFF_ROLES)),
):
    """Bulk or single student evaluation/checking with marks validation and audit history."""
    hw = await _get_authorized_assignment(db, assignment_id, current_user)
    await _require_hw_action(db, current_user, "evaluate", assignment=hw)
    items = [item.model_dump() for item in payload.items]
    try:
        return await HomeworkService.check_physical_homework(
            db, assignment_id, items, reviewer_user_id=current_user.id, reviewer_user=current_user
        )
    except ValueError as e:
        msg = str(e)
        code = 404 if "not found" in msg.lower() else 400
        raise HTTPException(status_code=code, detail=msg)


@router.post("/records/{record_id}/evaluate")
async def evaluate_single_record(
    record_id: int,
    payload: SingleEvaluatePayload,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*HOMEWORK_STAFF_ROLES)),
):
    """Evaluates a single student submission with marks, remarks, and optional feedback attachments."""
    rec = await _get_authorized_record(db, record_id, current_user)
    await _require_hw_action(db, current_user, "evaluate", assignment=rec.assignment)
    item = {
        "record_id": rec.id,
        "student_id": rec.student_id,
        "review_status": payload.review_status,
        "marks_obtained": payload.marks_obtained,
        "teacher_remarks": payload.teacher_remarks,
        "teacher_feedback_attachments": [a.model_dump() for a in payload.teacher_feedback_attachments]
        if payload.teacher_feedback_attachments
        else None,
        "correction_requested": payload.correction_requested,
    }
    try:
        return await HomeworkService.check_physical_homework(
            db, rec.assignment_id, [item], reviewer_user_id=current_user.id, reviewer_user=current_user
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/records/{record_id}/resubmit")
async def request_resubmission_endpoint(
    record_id: int,
    payload: ResubmissionRequestPayload,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*HOMEWORK_STAFF_ROLES)),
):
    """Teacher requests student resubmission."""
    rec = await _get_authorized_record(db, record_id, current_user)
    await _require_hw_action(db, current_user, "evaluate", assignment=rec.assignment)
    try:
        updated = await HomeworkService.request_resubmission(
            db,
            record_id,
            teacher_user_id=current_user.id,
            remarks=payload.remarks,
            extended_due_date=payload.extended_due_date,
            teacher_user=current_user,
        )
        return {"success": True, "message": "Resubmission requested successfully.", "record_id": updated.id}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/records/{record_id}/extend")
async def extend_due_date_endpoint(
    record_id: int,
    payload: DueDateExtensionPayload,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*HOMEWORK_STAFF_ROLES)),
):
    """Extends individual due date for a student."""
    rec = await _get_authorized_record(db, record_id, current_user)
    await _require_hw_action(db, current_user, "edit", assignment=rec.assignment)
    try:
        updated = await HomeworkService.extend_due_date(
            db,
            record_id,
            teacher_user_id=current_user.id,
            new_due_date=payload.new_due_date,
            reason=payload.reason,
            teacher_user=current_user,
        )
        return {"success": True, "message": "Due date extended successfully.", "new_due_date": str(updated.individual_due_date)}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/records/{record_id}/exempt")
async def exempt_student_endpoint(
    record_id: int,
    payload: StudentExemptionPayload,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*HOMEWORK_STAFF_ROLES)),
):
    """Exempts an individual student from an assignment."""
    rec = await _get_authorized_record(db, record_id, current_user)
    await _require_hw_action(db, current_user, "evaluate", assignment=rec.assignment)
    try:
        updated = await HomeworkService.exempt_student(
            db,
            record_id,
            teacher_user_id=current_user.id,
            reason=payload.reason,
        )
        return {"success": True, "message": "Student excused from assignment.", "record_id": updated.id}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ============================================================================
# 4. STUDENT PORTAL & DIGITAL SUBMISSIONS
# ============================================================================

@router.get("/student/my-homework")
async def get_student_homework_list(
    student_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Student / Guardian Portal 'My Homework' endpoint.
    Enforces student isolation and strictly excludes draft or archived assignments.
    """
    role = (current_user.role or "").strip().lower()
    if role == "student":
        target_student_id = current_user.student_id
        if not target_student_id:
            raise HTTPException(status_code=403, detail="No student profile linked to this user account.")
    elif role in ("parent", "guardian"):
        inst_id = current_user.institution_id or 1
        hw_settings = await HomeworkService.get_homework_settings(db, inst_id)
        if not hw_settings.get("allow_parent_portal_view", True) or not current_user.student_id:
            raise HTTPException(status_code=403, detail="Parent portal viewing is disabled or unlinked.")
        target_student_id = current_user.student_id
    elif is_sysadmin(current_user) or role in HOMEWORK_STAFF_ROLES:
        target_student_id = student_id or 1
        stu = await db.get(Student, target_student_id)
        if stu:
            check_institution_access(stu.institution_id, current_user)
    else:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    stmt = (
        select(
            StudentHomeworkRecord,
            HomeworkAssignment,
            Subject.name.label("subject_name"),
            Standard.name.label("standard_name"),
            func.concat(User.first_name, " ", User.last_name).label("teacher_name"),
        )
        .join(HomeworkAssignment, StudentHomeworkRecord.assignment_id == HomeworkAssignment.id)
        .join(Subject, HomeworkAssignment.subject_id == Subject.id)
        .join(Standard, HomeworkAssignment.standard_id == Standard.id)
        .join(User, HomeworkAssignment.teacher_user_id == User.id)
        .where(
            StudentHomeworkRecord.student_id == target_student_id,
            HomeworkAssignment.status.in_(["published", "closed"]),
        )
        .order_by(desc(HomeworkAssignment.due_date), desc(StudentHomeworkRecord.id))
    )

    today = date.today()
    if status_filter == "pending":
        stmt = stmt.where(StudentHomeworkRecord.status.in_(["assigned", "viewed", "in_progress", "pending", "resubmit_required", "returned", "reopened"]))
    elif status_filter == "submitted":
        stmt = stmt.where(StudentHomeworkRecord.submission_status.in_(["submitted", "late"]))
    elif status_filter == "checked":
        stmt = stmt.where(StudentHomeworkRecord.review_status.in_(["done", "evaluated", "checked", "incomplete", "excused"]))
    elif status_filter == "overdue":
        stmt = stmt.where(
            and_(
                StudentHomeworkRecord.status.notin_(["completed", "evaluated", "checked", "excused"]),
                StudentHomeworkRecord.submission_status.notin_(["submitted", "late"]),
                func.coalesce(StudentHomeworkRecord.individual_due_date, HomeworkAssignment.due_date) < today,
            )
        )

    rows = (await db.execute(stmt)).all()
    items = []
    for r, hw, subj_name, std_name, t_name in rows:
        eff_due_date = r.individual_due_date or hw.due_date
        is_overdue = (
            (eff_due_date < today)
            and (r.status not in ("completed", "evaluated", "checked", "excused"))
            and (r.submission_status not in ("submitted", "late"))
        )

        items.append({
            "record_id": r.id,
            "assignment_id": hw.id,
            "assignment_code": hw.assignment_code,
            "assignment_type": hw.assignment_type,
            "estimated_duration_minutes": hw.estimated_duration_minutes,
            "title": hw.title,
            "description": hw.description,
            "instructions": r.custom_instructions or hw.instructions,
            "base_instructions": hw.instructions,
            "custom_instructions": r.custom_instructions,
            "chapter": hw.chapter,
            "topic": hw.topic,
            "subject_name": subj_name,
            "standard_name": std_name,
            "teacher_name": t_name,
            "submission_method": hw.submission_method,
            "max_marks": float(hw.max_marks) if hw.max_marks is not None else None,
            "assigned_date": str(hw.assigned_date),
            "due_date": str(eff_due_date),
            "due_time": r.individual_due_time or hw.due_time,
            "assignment_status": hw.status,
            "status": "overdue" if is_overdue else r.status,
            "viewed_at": r.viewed_at.isoformat() if r.viewed_at else None,
            "submission_status": r.submission_status,
            "submission_time": r.submission_time.isoformat() if r.submission_time else None,
            "submission_text": r.submission_text,
            "submission_files": _safe_json_loads(r.submission_files, []),
            "submission_version": r.submission_version,
            "submission_history": _safe_json_loads(r.submission_history, []),
            "review_status": r.review_status,
            "marks_obtained": float(r.marks_obtained) if r.marks_obtained is not None else None,
            "teacher_remarks": r.teacher_remarks,
            "teacher_feedback_attachments": _safe_json_loads(r.teacher_feedback_attachments, []),
            "evaluation_history": _safe_json_loads(r.evaluation_history, []),
            "exemption_reason": r.exemption_reason,
            "resubmission_count": r.resubmission_count,
            "resubmission_history": _safe_json_loads(r.resubmission_history, []),
            "attachments": _safe_json_loads(hw.attachments, []),
            "custom_attachments": _safe_json_loads(r.custom_attachments, []),
            "allow_late_submissions": hw.allow_late_submissions,
            "allow_resubmission": hw.allow_resubmission,
        })

    return {"student_id": target_student_id, "items": items, "total": len(items)}


@router.post("/student/{record_id}/view")
async def mark_homework_viewed_endpoint(
    record_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Records when a student opens an assignment and transitions assigned -> viewed."""
    await _get_authorized_record(db, record_id, current_user)
    try:
        rec = await HomeworkService.mark_student_viewed(db, record_id, current_user)
        return {"success": True, "record_id": rec.id, "status": rec.status, "viewed_at": rec.viewed_at.isoformat() if rec.viewed_at else None}
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/student/{record_id}/submit")
async def submit_student_homework_endpoint(
    record_id: int,
    payload: DigitalSubmissionPayload,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Student digital homework submission & versioned resubmission."""
    await _get_authorized_record(db, record_id, current_user)
    role = (current_user.role or "").strip().lower()
    if role != "student" and not is_sysadmin(current_user) and role not in HOMEWORK_STAFF_ROLES:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    try:
        rec = await HomeworkService.submit_digital_homework(
            db, record_id, student_user=current_user, payload=payload.model_dump()
        )
        return {
            "success": True,
            "message": "Homework submitted successfully.",
            "record_id": rec.id,
            "submission_status": rec.submission_status,
            "submission_version": rec.submission_version,
        }
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============================================================================
# 5. DASHBOARDS, NOTIFICATIONS, ANALYTICS & REPORTS
# ============================================================================

@router.get("/dashboards/teacher")
async def get_teacher_homework_dashboard(
    teacher_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*HOMEWORK_STAFF_ROLES)),
):
    """Teacher homework dashboard KPIs (backward compatible + all Phase 10 metrics)."""
    inst_id = current_user.institution_id or 1
    t_id = teacher_id or (current_user.id if current_user.role == "teacher" else None)
    today = date.today()

    conditions = [HomeworkAssignment.institution_id == inst_id, HomeworkAssignment.is_template == False]
    if t_id:
        conditions.append(HomeworkAssignment.teacher_user_id == t_id)

    total_assigned = (await db.execute(select(func.count(HomeworkAssignment.id)).where(and_(*conditions)))).scalar() or 0
    assigned_today = (
        await db.execute(select(func.count(HomeworkAssignment.id)).where(and_(*conditions, HomeworkAssignment.assigned_date == today)))
    ).scalar() or 0
    active_assignments = (
        await db.execute(
            select(func.count(HomeworkAssignment.id)).where(
                and_(*conditions, HomeworkAssignment.due_date >= today, HomeworkAssignment.status == "published")
            )
        )
    ).scalar() or 0

    pending_submissions = (
        await db.execute(
            select(func.count(StudentHomeworkRecord.id))
            .join(HomeworkAssignment, StudentHomeworkRecord.assignment_id == HomeworkAssignment.id)
            .where(and_(*conditions, StudentHomeworkRecord.submission_status == "pending", StudentHomeworkRecord.status != "excused"))
        )
    ).scalar() or 0
    submitted_assignments = (
        await db.execute(
            select(func.count(StudentHomeworkRecord.id))
            .join(HomeworkAssignment, StudentHomeworkRecord.assignment_id == HomeworkAssignment.id)
            .where(and_(*conditions, StudentHomeworkRecord.submission_status.in_(["submitted", "late"])))
        )
    ).scalar() or 0
    late_submissions = (
        await db.execute(
            select(func.count(StudentHomeworkRecord.id))
            .join(HomeworkAssignment, StudentHomeworkRecord.assignment_id == HomeworkAssignment.id)
            .where(and_(*conditions, or_(StudentHomeworkRecord.submission_status == "late", StudentHomeworkRecord.status == "late_submitted")))
        )
    ).scalar() or 0
    pending_evaluations = (
        await db.execute(
            select(func.count(StudentHomeworkRecord.id))
            .join(HomeworkAssignment, StudentHomeworkRecord.assignment_id == HomeworkAssignment.id)
            .where(
                and_(
                    *conditions,
                    StudentHomeworkRecord.review_status.in_(["pending", "under_evaluation"]),
                    StudentHomeworkRecord.status != "excused",
                )
            )
        )
    ).scalar() or 0
    completed_evaluations = (
        await db.execute(
            select(func.count(StudentHomeworkRecord.id))
            .join(HomeworkAssignment, StudentHomeworkRecord.assignment_id == HomeworkAssignment.id)
            .where(and_(*conditions, StudentHomeworkRecord.review_status.in_(["done", "evaluated", "checked"])))
        )
    ).scalar() or 0
    overdue_count = (
        await db.execute(
            select(func.count(StudentHomeworkRecord.id))
            .join(HomeworkAssignment, StudentHomeworkRecord.assignment_id == HomeworkAssignment.id)
            .where(
                and_(
                    *conditions,
                    StudentHomeworkRecord.status.notin_(["completed", "evaluated", "checked", "excused"]),
                    StudentHomeworkRecord.submission_status.notin_(["submitted", "late"]),
                    func.coalesce(StudentHomeworkRecord.individual_due_date, HomeworkAssignment.due_date) < today,
                )
            )
        )
    ).scalar() or 0

    return {
        "total_assigned": total_assigned,
        "total_assignments": total_assigned,
        "assigned_today": assigned_today,
        "active_assignments": active_assignments,
        "awaiting_check": pending_evaluations,
        "pending_submissions": pending_submissions,
        "submitted_assignments": submitted_assignments,
        "late_submissions": late_submissions,
        "pending_evaluations": pending_evaluations,
        "completed_evaluations": completed_evaluations,
        "overdue_count": overdue_count,
    }


@router.get("/dashboards/student")
async def get_student_homework_dashboard(
    student_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Phase 10 Student Dashboard KPIs: new, due today, upcoming, overdue, submitted, evaluated."""
    role = (current_user.role or "").strip().lower()
    if role in ("student", "parent", "guardian"):
        target_student_id = current_user.student_id
        if not target_student_id:
            raise HTTPException(status_code=403, detail="No student profile linked.")
    elif is_sysadmin(current_user) or role in HOMEWORK_STAFF_ROLES:
        target_student_id = student_id or 1
    else:
        raise HTTPException(status_code=403, detail="Insufficient permissions.")

    stu = await db.get(Student, target_student_id)
    if stu:
        check_institution_access(stu.institution_id, current_user)

    rows = (
        await db.execute(
            select(StudentHomeworkRecord, HomeworkAssignment)
            .join(HomeworkAssignment, StudentHomeworkRecord.assignment_id == HomeworkAssignment.id)
            .where(
                StudentHomeworkRecord.student_id == target_student_id,
                HomeworkAssignment.status.in_(["published", "closed"]),
            )
        )
    ).all()

    today = date.today()
    new_hw = due_today = upcoming = overdue = submitted = evaluated = 0
    for rec, hw in rows:
        eff_due = rec.individual_due_date or hw.due_date
        is_done_eval = rec.review_status in ("done", "evaluated", "checked") or rec.status in ("completed", "evaluated", "checked")
        is_sub = rec.submission_status in ("submitted", "late")
        if rec.viewed_at is None and rec.status == "assigned":
            new_hw += 1
        if is_done_eval:
            evaluated += 1
        if is_sub:
            submitted += 1
        if not is_done_eval and not is_sub and rec.status != "excused":
            if eff_due == today:
                due_today += 1
            elif eff_due > today:
                upcoming += 1
            elif eff_due < today:
                overdue += 1

    notifs = (
        await db.execute(
            select(CommunicationLog)
            .where(
                CommunicationLog.channel == "IN_APP",
                CommunicationLog.recipient_type == "STUDENT",
                CommunicationLog.recipient_id == target_student_id,
                CommunicationLog.template_code.like("HW_%"),
            )
            .order_by(desc(CommunicationLog.created_at))
            .limit(20)
        )
    ).scalars().all()
    unread = sum(1 for n in notifs if not _safe_json_loads(n.metadata_json, {}).get("is_read"))

    return {
        "student_id": target_student_id,
        "new_homework": new_hw,
        "due_today": due_today,
        "upcoming_deadlines": upcoming,
        "overdue_work": overdue,
        "submitted_work": submitted,
        "evaluated_work": evaluated,
        "unread_notifications": unread,
    }


@router.get("/notifications/my")
async def get_my_homework_notifications(
    limit: int = Query(25, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Fetches deduplicated homework notifications from SSOT CommunicationLog for current user/student."""
    role = (current_user.role or "").strip().lower()
    if role in ("student", "parent", "guardian"):
        rec_type = "STUDENT"
        rec_id = current_user.student_id
        if not rec_id:
            return {"items": [], "unread_count": 0}
    else:
        rec_type = "TEACHER"
        rec_id = current_user.id

    logs = (
        await db.execute(
            select(CommunicationLog)
            .where(
                CommunicationLog.channel == "IN_APP",
                CommunicationLog.recipient_type == rec_type,
                CommunicationLog.recipient_id == rec_id,
                CommunicationLog.template_code.like("HW_%"),
            )
            .order_by(desc(CommunicationLog.created_at))
            .limit(limit)
        )
    ).scalars().all()

    items = []
    unread_count = 0
    for lg in logs:
        meta = _safe_json_loads(lg.metadata_json, {})
        is_read = bool(meta.get("is_read", False))
        if not is_read:
            unread_count += 1
        items.append({
            "id": lg.id,
            "template_code": lg.template_code,
            "subject": lg.subject,
            "message": lg.content,
            "is_read": is_read,
            "metadata": meta,
            "created_at": lg.created_at.isoformat() if lg.created_at else None,
        })
    return {"items": items, "unread_count": unread_count}


@router.post("/notifications/{log_id}/read")
async def mark_homework_notification_read(
    log_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Marks a homework CommunicationLog notification as read."""
    lg = await db.get(CommunicationLog, log_id)
    if not lg or lg.channel != "IN_APP":
        raise HTTPException(status_code=404, detail="Notification not found.")
    role = (current_user.role or "").strip().lower()
    expected_id = current_user.student_id if role in ("student", "parent", "guardian") else current_user.id
    if lg.recipient_id != expected_id and not is_sysadmin(current_user):
        raise HTTPException(status_code=403, detail="Access denied.")
    meta = _safe_json_loads(lg.metadata_json, {})
    meta["is_read"] = True
    meta["read_at"] = datetime.now(timezone.utc).isoformat()
    lg.metadata_json = json.dumps(meta)
    await db.commit()
    return {"success": True, "id": lg.id}


@router.post("/reminders/run")
async def trigger_homework_reminders(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*HOMEWORK_STAFF_ROLES)),
):
    """Runs deduplicated approaching-deadline and pending-evaluation alerts for the institution."""
    inst_id = current_user.institution_id or 1
    return await HomeworkService.run_reminders_and_alerts(db, inst_id, actor_user=current_user)


@router.get("/reports/batch/{assignment_id}")
async def get_batch_assignment_report(
    assignment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*HOMEWORK_STAFF_ROLES)),
):
    """Phase 10 Batch Report: per-student breakdown with status, submission date, marks, and feedback."""
    await _require_hw_action(db, current_user, "reports")
    hw = await _get_authorized_assignment(db, assignment_id, current_user)
    summary = await HomeworkService.get_assignment_summary(db, hw.id)
    reg = await get_checking_register(
        assignment_id=assignment_id,
        search=None,
        review_status=None,
        db=db,
        current_user=current_user,
    )
    rows = [
        {
            "record_id": s["record_id"],
            "student_id": s["student_id"],
            "student_name": s["student_name"],
            "admission_number": s["admission_number"],
            "roll_number": s["roll_number"],
            "assignment_status": s["status"],
            "submission_status": s["submission_status"],
            "submission_date": s["submission_time"],
            "marks_obtained": s["marks_obtained"],
            "max_marks": float(hw.max_marks) if hw.max_marks is not None else None,
            "feedback": s["teacher_remarks"],
            "review_status": s["review_status"],
            "is_late_addition": s["is_late_addition"],
            "addition_reason": s["addition_reason"],
            "submission_version": s["submission_version"],
        }
        for s in reg["students"]
    ]
    return {
        "assignment_id": hw.id,
        "assignment_code": hw.assignment_code,
        "title": hw.title,
        "due_date": str(hw.due_date),
        "max_marks": float(hw.max_marks) if hw.max_marks is not None else None,
        "original_recipient_count": hw.original_recipient_count,
        "summary": summary,
        "rows": rows,
    }


@router.get("/reports/analytics")
async def get_institute_homework_analytics(
    standard_id: Optional[int] = Query(None),
    subject_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*HOMEWORK_STAFF_ROLES)),
):
    """Phase 10 Institute Reports derived strictly from DB records."""
    await _require_hw_action(db, current_user, "reports")
    inst_id = current_user.institution_id or 1
    return await HomeworkService.get_institute_analytics(
        db, inst_id, standard_id=standard_id, subject_id=subject_id
    )


@router.get("/reports/activity-register/{student_id}")
async def get_student_academic_activity_endpoint(
    student_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Chronological unified student academic activity register."""
    role = (current_user.role or "").strip().lower()
    if role == "student":
        if current_user.student_id != student_id:
            raise HTTPException(status_code=403, detail="Students can only view their own academic activity register.")
    elif not is_sysadmin(current_user) and role not in HOMEWORK_STAFF_ROLES:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    student = await db.get(Student, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")
    check_institution_access(student.institution_id, current_user)

    activities = await HomeworkService.get_unified_academic_activity_register(db, student_id)
    return {"student_id": student_id, "activities": activities, "items": activities, "total": len(activities)}


@router.get("/reports/daily-register")
async def get_daily_homework_register(
    target_date: Optional[date] = Query(None),
    division_id: Optional[int] = Query(None),
    standard_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*HOMEWORK_STAFF_ROLES)),
):
    """Daily homework register with printable / exportable rows."""
    await _require_hw_action(db, current_user, "reports")
    inst_id = current_user.institution_id or 1
    query_date = target_date or date.today()

    conditions = [
        HomeworkAssignment.institution_id == inst_id,
        HomeworkAssignment.assigned_date == query_date,
        HomeworkAssignment.status != "draft",
    ]
    if division_id:
        conditions.append(HomeworkAssignment.division_id == division_id)
    if standard_id:
        conditions.append(HomeworkAssignment.standard_id == standard_id)

    stmt = (
        select(
            HomeworkAssignment,
            Standard.name.label("standard_name"),
            Subject.name.label("subject_name"),
            Division.name.label("division_name"),
            func.concat(User.first_name, " ", User.last_name).label("teacher_name"),
        )
        .join(Standard, HomeworkAssignment.standard_id == Standard.id)
        .join(Subject, HomeworkAssignment.subject_id == Subject.id)
        .outerjoin(Division, HomeworkAssignment.division_id == Division.id)
        .join(User, HomeworkAssignment.teacher_user_id == User.id)
        .where(and_(*conditions))
        .order_by(desc(HomeworkAssignment.id))
    )
    rows = (await db.execute(stmt)).all()

    report_items = []
    for hw, std_name, subj_name, div_name, t_name in rows:
        summary = await HomeworkService.get_assignment_summary(db, hw.id)
        report_items.append({
            "assignment_id": hw.id,
            "assignment_code": hw.assignment_code,
            "assignment_type": hw.assignment_type,
            "title": hw.title,
            "standard": std_name,
            "batch": div_name or "Multi-Batch",
            "subject": subj_name,
            "teacher": t_name,
            "topic": hw.topic or "—",
            "due_date": str(hw.due_date),
            "submission_method": hw.submission_method,
            "total_students": summary["total_recipients"],
            "completed": summary["completed_count"],
            "pending": summary["pending_check_count"],
            "completion_rate": f"{summary['completion_percentage']}%",
        })

    return {"date": str(query_date), "total_assignments": len(report_items), "items": report_items}


@router.get("/templates")
async def list_homework_templates(
    standard_id: Optional[int] = Query(None),
    subject_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*HOMEWORK_STAFF_ROLES)),
):
    """List reusable homework templates."""
    await _require_hw_action(db, current_user, "view")
    inst_id = current_user.institution_id or 1
    conditions = [
        HomeworkAssignment.institution_id == inst_id,
        HomeworkAssignment.is_template == True,
    ]
    if standard_id:
        conditions.append(HomeworkAssignment.standard_id == standard_id)
    if subject_id:
        conditions.append(HomeworkAssignment.subject_id == subject_id)

    stmt = (
        select(
            HomeworkAssignment,
            Standard.name.label("standard_name"),
            Subject.name.label("subject_name"),
        )
        .join(Standard, HomeworkAssignment.standard_id == Standard.id)
        .join(Subject, HomeworkAssignment.subject_id == Subject.id)
        .where(and_(*conditions))
        .order_by(desc(HomeworkAssignment.id))
    )
    rows = (await db.execute(stmt)).all()

    return {
        "templates": [
            {
                "id": hw.id,
                "template_name": hw.template_name or hw.title,
                "assignment_type": hw.assignment_type,
                "estimated_duration_minutes": hw.estimated_duration_minutes,
                "title": hw.title,
                "description": hw.description,
                "instructions": hw.instructions,
                "standard_id": hw.standard_id,
                "standard_name": std_name,
                "subject_id": hw.subject_id,
                "subject_name": subj_name,
                "chapter": hw.chapter,
                "topic": hw.topic,
                "submission_method": hw.submission_method,
                "max_marks": float(hw.max_marks) if hw.max_marks is not None else None,
            }
            for hw, std_name, subj_name in rows
        ]
    }
