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
#  * @updated     2026-11-04
#  *
#  * @description API endpoints for exam creation, marks entry, grading formulas, and report card generation.
#  */

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional, List
from datetime import date
from pydantic import BaseModel
from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.models.exam import Examination, ExamMark
from app.models.standard import Standard

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


@router.get("/")
async def list_examinations(
    academic_year_id: Optional[int] = None,
    standard_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    query = (
        select(Examination, Standard.name.label("standard_name"))
        .join(Standard, Examination.standard_id == Standard.id)
        .where(Examination.is_active == True)
    )
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

