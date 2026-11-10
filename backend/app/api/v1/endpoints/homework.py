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
#  * @version     1.0.0
#  * @created     2026-11-11
#  * @updated     2026-11-11
#  *
#  * @description REST API endpoints for Homework Assignments, Recipient Management, Physical Checking Register, Digital Submissions, and Academic Activity.
#  */

import json
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc, asc
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.deps import get_current_active_user, require_role
from app.models.user import User
from app.models.homework import HomeworkAssignment, StudentHomeworkRecord, HomeworkAuditLog
from app.models.student import Student
from app.models.enrollment import StudentEnrollment
from app.models.standard import Standard
from app.models.division import Division
from app.models.subject import Subject
from app.models.teacher_payroll import TeachingSession
from app.services.homework_service import HomeworkService

router = APIRouter()


# ── Pydantic Request Schemas ──

class HomeworkAttachmentSchema(BaseModel):
    title: str
    file_url: str
    file_type: str = "document"  # document, image, pdf, worksheet
    file_size_bytes: int = 0


class HomeworkCreateSchema(BaseModel):
    academic_year_id: int
    board_id: Optional[int] = None
    standard_id: int
    subject_id: int
    subject_mapping_id: Optional[int] = None
    division_id: Optional[int] = None
    teaching_session_id: Optional[int] = None
    teacher_user_id: int
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
    recipient_type: str = "batch"  # batch | multi_batch | selected_students | individual_student | student_group
    recipient_batch_ids: Optional[List[int]] = None
    selected_student_ids: Optional[List[int]] = None
    status: str = "published"  # draft | published | scheduled | archived
    publish_at: Optional[datetime] = None
    attachments: Optional[List[HomeworkAttachmentSchema]] = None
    allow_late_submissions: bool = True
    is_template: bool = False
    template_name: Optional[str] = None


class HomeworkUpdateSchema(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    instructions: Optional[str] = None
    chapter: Optional[str] = None
    topic: Optional[str] = None
    due_date: Optional[date] = None
    due_time: Optional[str] = None
    max_marks: Optional[Decimal] = None
    difficulty_level: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    attachments: Optional[List[HomeworkAttachmentSchema]] = None


class CheckingItemSchema(BaseModel):
    record_id: Optional[int] = None
    student_id: Optional[int] = None
    review_status: str  # done | incomplete | not_done | absent_not_checked | excused
    marks_obtained: Optional[Decimal] = None
    teacher_remarks: Optional[str] = None
    exemption_reason: Optional[str] = None


class BulkCheckPayload(BaseModel):
    items: List[CheckingItemSchema]


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


# ============================================================================
# 1. ASSIGNMENT CRUD & LISTING
# ============================================================================

@router.get("/assignments")
async def list_assignments(
    division_id: Optional[int] = Query(None),
    standard_id: Optional[int] = Query(None),
    subject_id: Optional[int] = Query(None),
    teacher_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    submission_method: Optional[str] = Query(None),
    is_template: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Lists homework assignments with extensive filtering and real-time completion summary stats.
    """
    inst_id = current_user.institution_id or 1
    conditions = [HomeworkAssignment.institution_id == inst_id]

    # If teacher, default to viewing assignments taught by them unless querying all
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

    count_stmt = select(func.count(HomeworkAssignment.id)).where(and_(*conditions))
    total_count = (await db.execute(count_stmt)).scalar() or 0

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
    res = await db.execute(stmt)
    rows = res.all()

    items = []
    for hw, std_name, subj_name, div_name, t_name in rows:
        summary = await HomeworkService.get_assignment_summary(db, hw.id)
        items.append({
            "id": hw.id,
            "assignment_code": hw.assignment_code,
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
            "status": hw.status,
            "is_template": hw.is_template,
            "template_name": hw.template_name,
            "attachments": json.loads(hw.attachments) if hw.attachments else [],
            "summary": summary,
        })

    return {"items": items, "total": total_count, "page": page, "limit": limit}


@router.post("/assignments")
async def create_assignment(
    payload: HomeworkCreateSchema,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Creates an assignment and automatically provisions independent student tracking records.
    """
    data = payload.model_dump()
    assignment = await HomeworkService.create_assignment(
        db,
        data,
        actor_user_id=current_user.id,
        institution_id=current_user.institution_id or 1,
    )
    return {
        "success": True,
        "message": f"Homework assignment '{assignment.assignment_code}' created successfully.",
        "id": assignment.id,
        "assignment_code": assignment.assignment_code,
    }


@router.get("/assignments/{assignment_id}")
async def get_assignment(
    assignment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Retrieves a single assignment's complete details and summary KPIs.
    """
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
    res = await db.execute(stmt)
    row = res.first()
    if not row:
        raise HTTPException(status_code=404, detail="Assignment not found.")

    hw, std_name, subj_name, div_name, t_name = row
    summary = await HomeworkService.get_assignment_summary(db, hw.id)

    return {
        "id": hw.id,
        "assignment_code": hw.assignment_code,
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
        "status": hw.status,
        "is_template": hw.is_template,
        "template_name": hw.template_name,
        "attachments": json.loads(hw.attachments) if hw.attachments else [],
        "summary": summary,
    }


@router.put("/assignments/{assignment_id}")
async def update_assignment(
    assignment_id: int,
    payload: HomeworkUpdateSchema,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Updates an assignment's details.
    """
    stmt = select(HomeworkAssignment).where(HomeworkAssignment.id == assignment_id)
    res = await db.execute(stmt)
    hw = res.scalar_one_or_none()
    if not hw:
        raise HTTPException(status_code=404, detail="Assignment not found.")

    data = payload.model_dump(exclude_unset=True)
    if "attachments" in data and data["attachments"] is not None:
        hw.attachments = json.dumps([a.model_dump() for a in payload.attachments])
        del data["attachments"]

    for k, v in data.items():
        setattr(hw, k, v)

    await db.commit()
    return {"success": True, "message": "Assignment updated successfully."}


@router.delete("/assignments/{assignment_id}")
async def delete_assignment(
    assignment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Soft-archives or deletes an assignment and its child records.
    """
    stmt = select(HomeworkAssignment).where(HomeworkAssignment.id == assignment_id)
    res = await db.execute(stmt)
    hw = res.scalar_one_or_none()
    if not hw:
        raise HTTPException(status_code=404, detail="Assignment not found.")

    await db.delete(hw)
    await db.commit()
    return {"success": True, "message": "Assignment deleted successfully."}


# ============================================================================
# 2. PHYSICAL CHECKING REGISTER (PHASE 3)
# ============================================================================

@router.get("/assignments/{assignment_id}/register")
async def get_checking_register(
    assignment_id: int,
    search: Optional[str] = Query(None),
    review_status: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Single-screen checking register for teachers:
    Lists all assigned students with their personal details, checking status, marks, and remarks.
    """
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

    res = await db.execute(stmt)
    rows = res.all()

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
            "submission_status": r.submission_status,
            "submission_time": r.submission_time.isoformat() if r.submission_time else None,
            "submission_text": r.submission_text,
            "submission_files": json.loads(r.submission_files) if r.submission_files else [],
            "review_status": r.review_status,
            "marks_obtained": float(r.marks_obtained) if r.marks_obtained is not None else None,
            "teacher_remarks": r.teacher_remarks,
            "reviewed_at": r.reviewed_at.isoformat() if r.reviewed_at else None,
            "individual_due_date": str(r.individual_due_date) if r.individual_due_date else None,
            "exemption_reason": r.exemption_reason,
            "resubmission_count": r.resubmission_count,
        })

    return {"assignment_id": assignment_id, "students": students, "total": len(students)}


@router.post("/assignments/{assignment_id}/check")
async def check_homework_register(
    assignment_id: int,
    payload: BulkCheckPayload,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Bulk or single student physical checking submission:
    Marks Done, Incomplete, Not Done, Absent / Not Checked, Excused, with marks and remarks.
    """
    items = [item.model_dump() for item in payload.items]
    try:
        result = await HomeworkService.check_physical_homework(
            db, assignment_id, items, reviewer_user_id=current_user.id
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/records/{record_id}/resubmit")
async def request_resubmission_endpoint(
    record_id: int,
    payload: ResubmissionRequestPayload,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Teacher requests student resubmission.
    """
    try:
        rec = await HomeworkService.request_resubmission(
            db,
            record_id,
            teacher_user_id=current_user.id,
            remarks=payload.remarks,
            extended_due_date=payload.extended_due_date,
        )
        return {"success": True, "message": "Resubmission requested successfully.", "record_id": rec.id}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/records/{record_id}/extend")
async def extend_due_date_endpoint(
    record_id: int,
    payload: DueDateExtensionPayload,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Extends individual due date for a student.
    """
    try:
        rec = await HomeworkService.extend_due_date(
            db,
            record_id,
            teacher_user_id=current_user.id,
            new_due_date=payload.new_due_date,
            reason=payload.reason,
        )
        return {"success": True, "message": "Due date extended successfully.", "new_due_date": str(rec.individual_due_date)}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/records/{record_id}/exempt")
async def exempt_student_endpoint(
    record_id: int,
    payload: StudentExemptionPayload,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Exempts an individual student from an assignment.
    """
    try:
        rec = await HomeworkService.exempt_student(
            db,
            record_id,
            teacher_user_id=current_user.id,
            reason=payload.reason,
        )
        return {"success": True, "message": "Student excused from assignment.", "record_id": rec.id}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ============================================================================
# 3. STUDENT PORTAL & DIGITAL SUBMISSIONS (PHASE 4 & 7)
# ============================================================================

@router.get("/student/my-homework")
async def get_student_homework_list(
    student_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Student portal 'My Homework' endpoint.
    Enforces student isolation: students only see their own assignments.
    """
    if current_user.role == "student":
        target_student_id = current_user.student_id
        if not target_student_id:
            raise HTTPException(status_code=403, detail="No student profile linked to this user account.")
    else:
        target_student_id = student_id or 1

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
        .where(StudentHomeworkRecord.student_id == target_student_id)
        .order_by(desc(HomeworkAssignment.due_date), desc(StudentHomeworkRecord.id))
    )

    today = date.today()
    if status_filter == "pending":
        stmt = stmt.where(StudentHomeworkRecord.status.in_(["assigned", "in_progress", "pending", "resubmit_required"]))
    elif status_filter == "submitted":
        stmt = stmt.where(StudentHomeworkRecord.submission_status.in_(["submitted", "late"]))
    elif status_filter == "checked":
        stmt = stmt.where(StudentHomeworkRecord.review_status.in_(["done", "checked", "incomplete", "excused"]))
    elif status_filter == "overdue":
        stmt = stmt.where(
            and_(
                StudentHomeworkRecord.status.notin_(["completed", "excused"]),
                StudentHomeworkRecord.submission_status != "submitted",
                func.coalesce(StudentHomeworkRecord.individual_due_date, HomeworkAssignment.due_date) < today,
            )
        )

    res = await db.execute(stmt)
    rows = res.all()

    items = []
    for r, hw, subj_name, std_name, t_name in rows:
        eff_due_date = r.individual_due_date or hw.due_date
        is_overdue = (eff_due_date < today) and (r.status not in ("completed", "excused")) and (r.submission_status != "submitted")

        items.append({
            "record_id": r.id,
            "assignment_id": hw.id,
            "assignment_code": hw.assignment_code,
            "title": hw.title,
            "description": hw.description,
            "instructions": hw.instructions,
            "chapter": hw.chapter,
            "topic": hw.topic,
            "subject_name": subj_name,
            "standard_name": std_name,
            "teacher_name": t_name,
            "submission_method": hw.submission_method,
            "max_marks": float(hw.max_marks) if hw.max_marks is not None else None,
            "due_date": str(eff_due_date),
            "due_time": r.individual_due_time or hw.due_time,
            "status": "overdue" if is_overdue else r.status,
            "submission_status": r.submission_status,
            "submission_time": r.submission_time.isoformat() if r.submission_time else None,
            "submission_text": r.submission_text,
            "submission_files": json.loads(r.submission_files) if r.submission_files else [],
            "review_status": r.review_status,
            "marks_obtained": float(r.marks_obtained) if r.marks_obtained is not None else None,
            "teacher_remarks": r.teacher_remarks,
            "exemption_reason": r.exemption_reason,
            "resubmission_count": r.resubmission_count,
            "resubmission_history": json.loads(r.resubmission_history) if r.resubmission_history else [],
            "attachments": json.loads(hw.attachments) if hw.attachments else [],
            "allow_late_submissions": hw.allow_late_submissions,
        })

    return {"student_id": target_student_id, "items": items, "total": len(items)}


@router.post("/student/{record_id}/submit")
async def submit_student_homework_endpoint(
    record_id: int,
    payload: DigitalSubmissionPayload,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Student digital homework submission (photos, PDF files, text).
    """
    try:
        rec = await HomeworkService.submit_digital_homework(
            db, record_id, student_user=current_user, payload=payload.model_dump()
        )
        return {
            "success": True,
            "message": "Homework submitted successfully.",
            "record_id": rec.id,
            "submission_status": rec.submission_status,
        }
    except (ValueError, PermissionError) as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============================================================================
# 4. DASHBOARDS & ACADEMIC ACTIVITY (PHASE 8 & 9)
# ============================================================================

@router.get("/dashboards/teacher")
async def get_teacher_homework_dashboard(
    teacher_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Teacher homework dashboard KPIs and pending checking worklist.
    """
    inst_id = current_user.institution_id or 1
    t_id = teacher_id or (current_user.id if current_user.role == "teacher" else None)
    today = date.today()

    conditions = [HomeworkAssignment.institution_id == inst_id]
    if t_id:
        conditions.append(HomeworkAssignment.teacher_user_id == t_id)

    # 1. Total assignments created
    total_assigned_stmt = select(func.count(HomeworkAssignment.id)).where(and_(*conditions))
    total_assigned = (await db.execute(total_assigned_stmt)).scalar() or 0

    # 2. Assigned today
    assigned_today_stmt = select(func.count(HomeworkAssignment.id)).where(
        and_(*conditions, HomeworkAssignment.assigned_date == today)
    )
    assigned_today = (await db.execute(assigned_today_stmt)).scalar() or 0

    # 3. Active assignments (due date >= today and status == 'published')
    active_stmt = select(func.count(HomeworkAssignment.id)).where(
        and_(*conditions, HomeworkAssignment.due_date >= today, HomeworkAssignment.status == "published")
    )
    active_assignments = (await db.execute(active_stmt)).scalar() or 0

    # 4. Awaiting checking queue (Student records where review_status is 'pending' and status != 'excused')
    awaiting_stmt = (
        select(func.count(StudentHomeworkRecord.id))
        .join(HomeworkAssignment, StudentHomeworkRecord.assignment_id == HomeworkAssignment.id)
        .where(
            and_(
                *conditions,
                StudentHomeworkRecord.review_status == "pending",
                StudentHomeworkRecord.status != "excused",
            )
        )
    )
    awaiting_check = (await db.execute(awaiting_stmt)).scalar() or 0

    # 5. Overdue count
    overdue_stmt = (
        select(func.count(StudentHomeworkRecord.id))
        .join(HomeworkAssignment, StudentHomeworkRecord.assignment_id == HomeworkAssignment.id)
        .where(
            and_(
                *conditions,
                StudentHomeworkRecord.status.notin_(["completed", "excused"]),
                StudentHomeworkRecord.submission_status != "submitted",
                func.coalesce(StudentHomeworkRecord.individual_due_date, HomeworkAssignment.due_date) < today,
            )
        )
    )
    overdue_count = (await db.execute(overdue_stmt)).scalar() or 0

    return {
        "total_assigned": total_assigned,
        "assigned_today": assigned_today,
        "active_assignments": active_assignments,
        "awaiting_check": awaiting_check,
        "overdue_count": overdue_count,
    }


@router.get("/reports/activity-register/{student_id}")
async def get_student_academic_activity_endpoint(
    student_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Phase 8: Chronological unified student academic activity register.
    """
    activities = await HomeworkService.get_unified_academic_activity_register(db, student_id)
    return {"student_id": student_id, "activities": activities, "total": len(activities)}


@router.get("/reports/daily-register")
async def get_daily_homework_register(
    target_date: Optional[date] = Query(None),
    division_id: Optional[int] = Query(None),
    standard_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Phase 9 Report: Daily homework register with printable / exportable rows.
    """
    inst_id = current_user.institution_id or 1
    query_date = target_date or date.today()

    conditions = [
        HomeworkAssignment.institution_id == inst_id,
        HomeworkAssignment.assigned_date == query_date,
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
    res = await db.execute(stmt)
    rows = res.all()

    report_items = []
    for hw, std_name, subj_name, div_name, t_name in rows:
        summary = await HomeworkService.get_assignment_summary(db, hw.id)
        report_items.append({
            "assignment_code": hw.assignment_code,
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

    return {
        "date": str(query_date),
        "total_assignments": len(report_items),
        "items": report_items,
    }


@router.get("/templates")
async def list_homework_templates(
    standard_id: Optional[int] = Query(None),
    subject_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Phase 6: List reusable homework templates.
    """
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
    res = await db.execute(stmt)
    rows = res.all()

    return {
        "templates": [
            {
                "id": hw.id,
                "template_name": hw.template_name or hw.title,
                "title": hw.title,
                "description": hw.description,
                "instructions": hw.instructions,
                "standard_name": std_name,
                "subject_name": subj_name,
                "chapter": hw.chapter,
                "topic": hw.topic,
                "submission_method": hw.submission_method,
                "max_marks": float(hw.max_marks) if hw.max_marks is not None else None,
            }
            for hw, std_name, subj_name in rows
        ]
    }

