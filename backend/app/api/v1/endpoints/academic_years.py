# /**
#  * @file        academic_years.py
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
#  * @description API endpoints for academic year lifecycle, current session selection, and validation.
#  */

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from typing import Optional
from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.models.academic_year import AcademicYear
from pydantic import BaseModel
from datetime import date

router = APIRouter()


class AcademicYearCreate(BaseModel):
    institution_id: int
    name: str
    start_date: date
    end_date: date
    is_current: bool = False


class AcademicYearUpdate(BaseModel):
    name: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_current: Optional[bool] = None


@router.get("/")
async def list_academic_years(
    institution_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    query = select(AcademicYear).where(AcademicYear.is_active == True)
    if institution_id:
        query = query.where(AcademicYear.institution_id == institution_id)
    result = await db.execute(query.order_by(AcademicYear.start_date.desc()))
    years = result.scalars().all()

    # Resilient fallback: If filtering by institution_id returned 0 years (e.g. stale client localStorage),
    # return active academic years so client UI never renders a blank academic year dropdown
    if not years and institution_id:
        fallback_query = select(AcademicYear).where(AcademicYear.is_active == True).order_by(AcademicYear.start_date.desc())
        fallback_res = await db.execute(fallback_query)
        years = fallback_res.scalars().all()

    return [
        {
            "id": y.id,
            "name": y.name,
            "start_date": str(y.start_date),
            "end_date": str(y.end_date),
            "is_current": y.is_current,
            "institution_id": y.institution_id,
        }
        for y in years
    ]


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_academic_year(
    data: AcademicYearCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    if data.is_current:
        await db.execute(
            update(AcademicYear)
            .where(AcademicYear.institution_id == data.institution_id)
            .values(is_current=False)
        )
    year = AcademicYear(**data.model_dump())
    db.add(year)
    await db.commit()
    await db.refresh(year)
    return {
        "id": year.id,
        "name": year.name,
        "start_date": str(year.start_date),
        "end_date": str(year.end_date),
        "is_current": year.is_current,
    }


@router.get("/{year_id}")
async def get_academic_year(
    year_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    result = await db.execute(
        select(AcademicYear).where(AcademicYear.id == year_id)
    )
    year = result.scalar_one_or_none()
    if not year:
        raise HTTPException(status_code=404, detail="Academic year not found")
    return {
        "id": year.id,
        "name": year.name,
        "start_date": str(year.start_date),
        "end_date": str(year.end_date),
        "is_current": year.is_current,
        "institution_id": year.institution_id,
    }


@router.put("/{year_id}")
async def update_academic_year(
    year_id: int,
    data: AcademicYearUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    result = await db.execute(
        select(AcademicYear).where(AcademicYear.id == year_id)
    )
    year = result.scalar_one_or_none()
    if not year:
        raise HTTPException(status_code=404, detail="Academic year not found")
    for key, value in data.model_dump(exclude_none=True).items():
        setattr(year, key, value)
    await db.commit()
    return {"id": year.id, "name": year.name}

