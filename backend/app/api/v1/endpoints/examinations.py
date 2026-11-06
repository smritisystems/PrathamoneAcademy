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
#  * @updated     2026-11-06
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
    enforce_institution_access,
    check_institution_access,
)
from app.models.exam import Examination, ExamMark
from app.models.standard import Standard
from app.services.exam_reports import (
    get_exam_marks_sheet,
    save_exam_marks_bulk,
    get_exam_analytics,
    get_student_report_card,
)

logger = logging.getLogger(__name__)

router = APIRouter()


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
    current_user=Depends(get_current_active_user),
):
    std = await db.scalar(select(Standard).where(Standard.id == data.standard_id))
    if not std:
        raise HTTPException(status_code=404, detail="Standard not found")
    check_institution_access(std.institution_id, current_user)

    exam = Examination(**data.model_dump())
    db.add(exam)
    await db.commit()
    await db.refresh(exam)
    return {
        "id": exam.id,
        "name": exam.name,
        "exam_type": exam.exam_type,
        "max_marks": exam.max_marks,
    }


@router.get("/{exam_id}/marks")
async def get_examination_marks(
    exam_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """Retrieves marks entry spreadsheet dataset for an examination."""
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
    current_user=Depends(get_current_active_user),
):
    """Saves student examination marks in bulk and computes standardized grades."""
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
    current_user=Depends(get_current_active_user),
):
    """Retrieves cohort performance analytics, grade distributions, and leaderboard rankings."""
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
    effective_inst_id: int = Depends(enforce_institution_access),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """Compiles official printable graphical report card dataset for a student."""
    inst_id = effective_inst_id or getattr(current_user, "institution_id", 1) or 1
    report_card = await get_student_report_card(
        db, exam_id=exam_id, student_id=student_id, institution_id=inst_id
    )
    if not report_card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report card for student #{student_id} in exam #{exam_id} could not be generated.",
        )
    return report_card
