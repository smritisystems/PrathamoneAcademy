# /**
#  * @file        examinations.py
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
#  * @description API endpoints for exam creation, marks entry, grading formulas, and report card generation.
#  */

import logging
from typing import Optional, List
from datetime import date
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.deps import (
    get_current_active_user,
    require_role,
    enforce_institution_access,
    check_institution_access,
    is_sysadmin,
)
from app.models.exam import Examination, ExamMark
from app.models.standard import Standard
from app.models.student import Student
from app.models.settings import InstitutionSetting
from app.services.exam_reports import (
    get_exam_marks_sheet,
    save_exam_marks_bulk,
    get_exam_analytics,
    get_student_report_card,
    get_batch_report_cards,
    get_cumulative_term_report,
    GRADING_SCALES,
)

logger = logging.getLogger(__name__)

router = APIRouter()

EXAM_STAFF_ROLES = ("superadmin", "sysadmin", "super_admin", "admin", "principal", "teacher", "staff", "coordinator")
EXAM_VIEW_ROLES = EXAM_STAFF_ROLES + ("counselor", "counsellor", "accountant")


async def _authorize_exam_access(db: AsyncSession, exam_id: int, current_user) -> Examination:
    """Ensures exam exists and belongs to the caller's institution."""
    row = (
        await db.execute(
            select(Examination, Standard.institution_id)
            .join(Standard, Examination.standard_id == Standard.id)
            .where(Examination.id == exam_id)
        )
    ).first()
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Examination #{exam_id} not found.",
        )
    exam, inst_id = row
    check_institution_access(inst_id, current_user)
    return exam


class ExamCreate(BaseModel):
    academic_year_id: int
    standard_id: int
    name: str
    exam_type: str = "Unit Test"
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    max_marks: int = 100
    passing_marks: int = 35


class MarkEntry(BaseModel):
    student_id: int
    subject_id: int
    marks_obtained: Optional[float] = None
    is_absent: Optional[bool] = False
    remarks: Optional[str] = None


class BulkMarksPayload(BaseModel):
    entries: List[MarkEntry]


@router.get("/")
async def list_examinations(
    academic_year_id: Optional[int] = None,
    standard_id: Optional[int] = None,
    effective_inst_id: int = Depends(enforce_institution_access),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    query = (
        select(Examination, Standard.name.label("standard_name"))
        .join(Standard, Examination.standard_id == Standard.id)
        .where(Examination.is_active == True)
    )
    if effective_inst_id:
        query = query.where(Standard.institution_id == effective_inst_id)
    if academic_year_id:
        query = query.where(Examination.academic_year_id == academic_year_id)
    if standard_id:
        query = query.where(Examination.standard_id == standard_id)

    result = await db.execute(query.order_by(Examination.id.desc()))
    rows = result.all()
    return [
        {
            "id": exam.id,
            "name": exam.name,
            "exam_type": exam.exam_type,
            "academic_year_id": exam.academic_year_id,
            "standard_id": exam.standard_id,
            "standard_name": std_name,
            "start_date": str(exam.start_date) if exam.start_date else None,
            "end_date": str(exam.end_date) if exam.end_date else None,
            "max_marks": exam.max_marks,
            "passing_marks": exam.passing_marks,
            "is_active": exam.is_active,
        }
        for exam, std_name in rows
    ]


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_examination(
    data: ExamCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role(*EXAM_STAFF_ROLES)),
):
    std = await db.scalar(select(Standard).where(Standard.id == data.standard_id))
    if not std:
        raise HTTPException(status_code=404, detail="Standard not found")
    check_institution_access(std.institution_id, current_user)

    exam = Examination(**data.model_dump())
    db.add(exam)
    await db.commit()
    await db.refresh(exam)

    # Automated examination schedule broadcast trigger
    try:
        from app.services.communication import get_automation_rules, dispatch_exam_schedule_notification
        comm_rules = await get_automation_rules(db, std.institution_id or 1)
        if comm_rules.get("exam_schedule_alerts_enabled", True):
            await dispatch_exam_schedule_notification(
                db,
                exam_id=exam.id,
                institution_id=std.institution_id or 1,
                sender_id=current_user.id,
                sender_name=getattr(current_user, "full_name", None) or getattr(current_user, "username", "Exam Office"),
                channel=comm_rules.get("default_channel", "WHATSAPP"),
            )
    except Exception:
        pass

    return {
        "id": exam.id,
        "name": exam.name,
        "exam_type": exam.exam_type,
        "max_marks": exam.max_marks,
    }


class ExamPoliciesPayload(BaseModel):
    default_grading_scale: str = "STANDARD_6_POINT"
    default_passing_threshold: int = 35
    grace_marks_policy: str = "Max 3 Grace Marks per candidate"
    rank_tie_breaker: str = "Mathematics & Science Priority, then Roll Number"


@router.get("/settings/policies")
async def get_examination_policies(
    effective_inst_id: int = Depends(enforce_institution_access),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role(*EXAM_VIEW_ROLES)),
):
    """Retrieves current institution examination grading policies, threshold settings, and available scales."""
    inst_id = effective_inst_id or getattr(current_user, "institution_id", 1) or 1
    settings_rows = (
        await db.execute(
            select(InstitutionSetting).where(
                InstitutionSetting.institution_id == inst_id,
                InstitutionSetting.category == "examinations",
            )
        )
    ).scalars().all()

    settings_map = {s.key: s.value for s in settings_rows}
    active_scale = settings_map.get("default_grading_scale", "STANDARD_6_POINT")
    pass_thresh = int(settings_map.get("default_passing_threshold", 35))
    grace_pol = settings_map.get("grace_marks_policy", "Max 3 Grace Marks per candidate")
    tie_breaker = settings_map.get("rank_tie_breaker", "Mathematics & Science Priority, then Roll Number")

    return {
        "active_policies": {
            "default_grading_scale": active_scale,
            "default_passing_threshold": pass_thresh,
            "grace_marks_policy": grace_pol,
            "rank_tie_breaker": tie_breaker,
        },
        "available_scales": [
            {
                "id": k,
                "name": v["name"],
                "description": v["description"],
                "thresholds": v["thresholds"],
            }
            for k, v in GRADING_SCALES.items()
        ],
    }


@router.post("/settings/policies")
async def update_examination_policies(
    data: ExamPoliciesPayload,
    effective_inst_id: int = Depends(enforce_institution_access),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role(*EXAM_STAFF_ROLES)),
):
    """Updates institution examination grading policies, scale choice, and moderation rules."""
    inst_id = effective_inst_id or getattr(current_user, "institution_id", 1) or 1
    if data.default_grading_scale not in GRADING_SCALES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid grading scale: {data.default_grading_scale}. Choose from {list(GRADING_SCALES.keys())}.",
        )

    policy_items = {
        "default_grading_scale": data.default_grading_scale,
        "default_passing_threshold": str(data.default_passing_threshold),
        "grace_marks_policy": data.grace_marks_policy,
        "rank_tie_breaker": data.rank_tie_breaker,
    }

    user_id = getattr(current_user, "id", None)
    for key, val in policy_items.items():
        existing = await db.scalar(
            select(InstitutionSetting).where(
                InstitutionSetting.institution_id == inst_id,
                InstitutionSetting.category == "examinations",
                InstitutionSetting.key == key,
            )
        )
        if existing:
            existing.value = val
            existing.updated_by_id = user_id
        else:
            new_setting = InstitutionSetting(
                institution_id=inst_id,
                category="examinations",
                key=key,
                value=val,
                data_type="string" if key != "default_passing_threshold" else "integer",
                updated_by_id=user_id,
            )
            db.add(new_setting)

    await db.commit()
    return {"status": "success", "message": "Examination grading policies saved successfully."}


@router.get("/cumulative/student/{student_id}")
async def get_student_cumulative_report(
    student_id: int,
    academic_year_id: Optional[int] = None,
    scale: Optional[str] = None,
    effective_inst_id: int = Depends(enforce_institution_access),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """Compiles multi-exam cumulative performance progression across an academic year."""
    role = (getattr(current_user, "role", "") or "").strip().lower()
    if role == "student":
        if getattr(current_user, "student_id", None) != student_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access forbidden: Students can only view their own performance trajectory.",
            )
    elif not is_sysadmin(current_user) and role not in EXAM_VIEW_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

    student = await db.get(Student, student_id)
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Student #{student_id} not found.")
    check_institution_access(student.institution_id, current_user)

    inst_id = student.institution_id or effective_inst_id or getattr(current_user, "institution_id", 1) or 1
    report = await get_cumulative_term_report(
        db,
        student_id=student_id,
        institution_id=inst_id,
        academic_year_id=academic_year_id,
        scale=scale,
    )
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Cumulative performance report for student #{student_id} could not be generated.",
        )
    return report


@router.get("/{exam_id}/marks")
async def get_examination_marks(
    exam_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role(*EXAM_STAFF_ROLES)),
):
    """Retrieves marks entry spreadsheet dataset for an examination."""
    await _authorize_exam_access(db, exam_id, current_user)
    sheet = await get_exam_marks_sheet(db, exam_id)
    if not sheet:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Examination #{exam_id} not found.",
        )
    return sheet


@router.post("/{exam_id}/marks")
async def save_examination_marks(
    exam_id: int,
    data: BulkMarksPayload,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role(*EXAM_STAFF_ROLES)),
):
    """Saves student examination marks in bulk and computes standardized grades."""
    await _authorize_exam_access(db, exam_id, current_user)
    if data.entries and not is_sysadmin(current_user):
        user_inst_id = getattr(current_user, "institution_id", None)
        student_ids = list({e.student_id for e in data.entries})
        foreign_students = (
            await db.execute(
                select(Student.id).where(
                    Student.id.in_(student_ids),
                    Student.institution_id != user_inst_id,
                )
            )
        ).scalars().all()
        if foreign_students:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access forbidden: Marks entries include students outside your institution.",
            )
    try:
        entries_dicts = [e.model_dump() for e in data.entries]
        res = await save_exam_marks_bulk(db, exam_id, entries_dicts)
        return res
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        logger.error("Failed to save exam marks: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to record examination scores.",
        )


@router.get("/{exam_id}/analytics")
async def get_examination_analytics(
    exam_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role(*EXAM_STAFF_ROLES)),
):
    """Retrieves cohort performance analytics, grade distributions, and leaderboard rankings."""
    await _authorize_exam_access(db, exam_id, current_user)
    analytics = await get_exam_analytics(db, exam_id)
    if not analytics:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Examination #{exam_id} not found.",
        )
    return analytics


@router.get("/{exam_id}/report-card/{student_id}")
async def get_examination_student_report_card(
    exam_id: int,
    student_id: int,
    scale: Optional[str] = None,
    effective_inst_id: int = Depends(enforce_institution_access),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """Compiles official printable graphical report card dataset for a student with selectable grading scale."""
    role = (getattr(current_user, "role", "") or "").strip().lower()
    if role == "student":
        if getattr(current_user, "student_id", None) != student_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access forbidden: Students can only view their own report card.",
            )
    elif not is_sysadmin(current_user) and role not in EXAM_VIEW_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

    await _authorize_exam_access(db, exam_id, current_user)
    student = await db.get(Student, student_id)
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Student #{student_id} not found.")
    check_institution_access(student.institution_id, current_user)

    inst_id = student.institution_id or effective_inst_id or getattr(current_user, "institution_id", 1) or 1
    report_card = await get_student_report_card(
        db, exam_id=exam_id, student_id=student_id, institution_id=inst_id, scale=scale
    )
    if not report_card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report card for student #{student_id} in exam #{exam_id} could not be generated.",
        )
    return report_card


@router.get("/{exam_id}/report-cards-batch")
async def get_examination_batch_report_cards(
    exam_id: int,
    division_id: Optional[int] = None,
    scale: Optional[str] = None,
    effective_inst_id: int = Depends(enforce_institution_access),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role(*EXAM_STAFF_ROLES)),
):
    """Compiles complete batch report card dossier for all candidates enrolled in an examination cohort."""
    await _authorize_exam_access(db, exam_id, current_user)
    inst_id = effective_inst_id or getattr(current_user, "institution_id", 1) or 1
    dossier = await get_batch_report_cards(
        db, exam_id=exam_id, institution_id=inst_id, division_id=division_id, scale=scale
    )
    if not dossier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Batch report card dossier for examination #{exam_id} could not be compiled.",
        )
    return dossier
