# /**
#  * @file        subjects.py
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
#  * @description API endpoints for academic subjects master catalogue and curriculum syllabus mapping.
#  */

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from typing import Optional, List
from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.models.subject import Subject
from app.models.standard import Standard
from pydantic import BaseModel

router = APIRouter()


class SubjectCreate(BaseModel):
    standard_id: int
    name: str
    code: Optional[str] = None
    max_marks: int = 100
    pass_marks: int = 35
    is_optional: bool = False


class SubjectUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    standard_id: Optional[int] = None
    max_marks: Optional[int] = None
    pass_marks: Optional[int] = None
    is_optional: Optional[bool] = None
    is_active: Optional[bool] = None


@router.get("/")
async def list_subjects(
    standard_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    query = (
        select(Subject, Standard.name.label("standard_name"))
        .join(Standard, Subject.standard_id == Standard.id)
        .where(Subject.is_active == True)
    )
    if standard_id:
        query = query.where(Subject.standard_id == standard_id)
    if search and search.strip():
        s = f"%{search.strip()}%"
        query = query.where(or_(Subject.name.ilike(s), Subject.code.ilike(s)))

    result = await db.execute(query.order_by(Standard.level, Subject.name))
    rows = result.all()
    return [
        {
            "id": sub.id,
            "name": sub.name,
            "code": sub.code,
            "standard_id": sub.standard_id,
            "standard_name": std_name,
            "max_marks": sub.max_marks,
            "pass_marks": sub.pass_marks,
            "is_optional": sub.is_optional,
            "is_active": sub.is_active,
        }
        for sub, std_name in rows
    ]


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_subject(
    data: SubjectCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    if data.code:
        existing = (
            await db.execute(
                select(Subject).where(
                    Subject.standard_id == data.standard_id,
                    Subject.code.ilike(data.code),
                    Subject.is_active == True,
                )
            )
        ).scalar_one_or_none()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Subject with code '{data.code}' already exists for this standard",
            )

    subject = Subject(**data.model_dump())
    db.add(subject)
    await db.commit()
    await db.refresh(subject)
    return {
        "id": subject.id,
        "name": subject.name,
        "code": subject.code,
        "standard_id": subject.standard_id,
        "message": f"Subject '{subject.name}' created successfully",
    }


@router.get("/{subject_id}")
async def get_subject(
    subject_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    query = (
        select(Subject, Standard.name.label("standard_name"))
        .join(Standard, Subject.standard_id == Standard.id)
        .where(Subject.id == subject_id)
    )
    row = (await db.execute(query)).first()
    if not row:
        raise HTTPException(status_code=404, detail="Subject not found")
    sub, std_name = row
    return {
        "id": sub.id,
        "name": sub.name,
        "code": sub.code,
        "standard_id": sub.standard_id,
        "standard_name": std_name,
        "max_marks": sub.max_marks,
        "pass_marks": sub.pass_marks,
        "is_optional": sub.is_optional,
        "is_active": sub.is_active,
    }


@router.put("/{subject_id}")
async def update_subject(
    subject_id: int,
    data: SubjectUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    result = await db.execute(select(Subject).where(Subject.id == subject_id))
    subject = result.scalar_one_or_none()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    update_dict = data.model_dump(exclude_unset=True)
    for k, v in update_dict.items():
        if hasattr(subject, k) and v is not None:
            setattr(subject, k, v)

    await db.commit()
    await db.refresh(subject)
    return {
        "id": subject.id,
        "name": subject.name,
        "code": subject.code,
        "message": f"Subject '{subject.name}' updated successfully",
    }


@router.delete("/{subject_id}")
async def delete_subject(
    subject_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    result = await db.execute(select(Subject).where(Subject.id == subject_id))
    subject = result.scalar_one_or_none()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    subject.is_active = False
    await db.commit()
    return {"id": subject.id, "message": f"Subject '{subject.name}' deactivated successfully"}
