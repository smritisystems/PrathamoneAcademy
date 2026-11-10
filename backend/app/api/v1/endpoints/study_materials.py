# /**
#  * @file        study_materials.py
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
#  * @created     2026-11-07
#  * @updated     2026-11-10
#  *
#  * @description REST API router managing academic study materials, question banks, and syllabus documents.
#  */

from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc

from app.core.database import get_db
from app.core.deps import get_current_active_user, enforce_institution_access
from app.models.user import User
from app.models.portal import StudyMaterial
from app.models.standard import Standard
from app.models.subject import Subject, SubjectMapping
from app.models.division import Division

router = APIRouter()

ALLOWED_MANAGE_ROLES = {"superadmin", "super_admin", "admin", "sysadmin", "teacher", "academic_coordinator", "staff"}


class StudyMaterialCreate(BaseModel):
    standard_id: int
    subject_id: int
    division_id: Optional[int] = None
    title: str = Field(..., min_length=2, max_length=200)
    description: Optional[str] = None
    file_type: str = Field(default="Notes", max_length=50)
    file_url: str = Field(..., min_length=1, max_length=500)
    file_size_bytes: int = Field(default=0, ge=0)


class StudyMaterialUpdate(BaseModel):
    standard_id: Optional[int] = None
    subject_id: Optional[int] = None
    division_id: Optional[int] = None
    title: Optional[str] = Field(None, min_length=2, max_length=200)
    description: Optional[str] = None
    file_type: Optional[str] = None
    file_url: Optional[str] = None
    file_size_bytes: Optional[int] = None


@router.get("", response_model=Dict[str, Any])
async def list_study_materials(
    standard_id: Optional[int] = Query(None, description="Filter by Standard ID"),
    subject_id: Optional[int] = Query(None, description="Filter by Subject ID"),
    division_id: Optional[int] = Query(None, description="Filter by Division ID"),
    file_type: Optional[str] = Query(None, description="Filter by File Type"),
    search: Optional[str] = Query(None, description="Search by title or description"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    institution_id: int = Depends(enforce_institution_access),
):
    """
    List all study materials for the active institution with joined standard, subject, and division metadata.
    """
    stmt = (
        select(StudyMaterial, Standard.name.label("standard_name"), Subject.name.label("subject_name"), Division.name.label("division_name"))
        .join(Standard, StudyMaterial.standard_id == Standard.id)
        .join(Subject, StudyMaterial.subject_id == Subject.id)
        .outerjoin(Division, StudyMaterial.division_id == Division.id)
        .where(StudyMaterial.institution_id == institution_id)
    )

    if standard_id:
        stmt = stmt.where(StudyMaterial.standard_id == standard_id)
    if subject_id:
        stmt = stmt.where(StudyMaterial.subject_id == subject_id)
    if division_id:
        stmt = stmt.where(StudyMaterial.division_id == division_id)
    if file_type and file_type != "All":
        stmt = stmt.where(StudyMaterial.file_type == file_type)
    if search:
        search_pattern = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                StudyMaterial.title.ilike(search_pattern),
                StudyMaterial.description.ilike(search_pattern),
            )
        )

    # Count total
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total_count = (await db.execute(count_stmt)).scalar() or 0

    # Paginate and order by newest first
    stmt = stmt.order_by(desc(StudyMaterial.created_at)).offset(skip).limit(limit)
    rows = (await db.execute(stmt)).all()

    items = []
    for sm, std_name, subj_name, div_name in rows:
        items.append({
            "id": sm.id,
            "institution_id": sm.institution_id,
            "standard_id": sm.standard_id,
            "standard_name": std_name,
            "subject_id": sm.subject_id,
            "subject_name": subj_name,
            "division_id": sm.division_id,
            "division_name": div_name,
            "title": sm.title,
            "description": sm.description or "",
            "file_type": sm.file_type,
            "file_url": sm.file_url,
            "file_size_bytes": sm.file_size_bytes,
            "created_at": sm.created_at.isoformat() if sm.created_at else None,
        })

    return {
        "items": items,
        "total": total_count,
        "skip": skip,
        "limit": limit,
    }


@router.get("/stats", response_model=Dict[str, Any])
async def get_study_materials_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    institution_id: int = Depends(enforce_institution_access),
):
    """
    Get summary metrics for study materials in the active institution.
    """
    total_stmt = select(func.count(StudyMaterial.id)).where(StudyMaterial.institution_id == institution_id)
    total_materials = (await db.execute(total_stmt)).scalar() or 0

    stds_stmt = select(func.count(func.distinct(StudyMaterial.standard_id))).where(StudyMaterial.institution_id == institution_id)
    standards_covered = (await db.execute(stds_stmt)).scalar() or 0

    subjs_stmt = select(func.count(func.distinct(StudyMaterial.subject_id))).where(StudyMaterial.institution_id == institution_id)
    subjects_covered = (await db.execute(subjs_stmt)).scalar() or 0

    types_stmt = (
        select(StudyMaterial.file_type, func.count(StudyMaterial.id))
        .where(StudyMaterial.institution_id == institution_id)
        .group_by(StudyMaterial.file_type)
    )
    type_counts = dict((await db.execute(types_stmt)).all())

    return {
        "total_materials": total_materials,
        "standards_covered": standards_covered,
        "subjects_covered": subjects_covered,
        "question_banks": type_counts.get("Question Bank", 0),
        "formula_sheets": type_counts.get("Formula Sheet", 0),
        "notes": type_counts.get("Notes", 0),
        "assignments": type_counts.get("Assignment", 0),
        "revision": type_counts.get("Revision", 0),
        "type_breakdown": type_counts,
    }


@router.post("", status_code=status.HTTP_201_CREATED, response_model=Dict[str, Any])
async def create_study_material(
    payload: StudyMaterialCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    institution_id: int = Depends(enforce_institution_access),
):
    """
    Register a new study material or handbook. Requires authorized staff role.
    """
    if current_user.role not in ALLOWED_MANAGE_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to upload or manage study materials.",
        )

    # Validate standard exists and belongs to tenant
    std_stmt = select(Standard).where(and_(Standard.id == payload.standard_id, Standard.institution_id == institution_id))
    std = (await db.execute(std_stmt)).scalar_one_or_none()
    if not std:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Specified Standard not found in this institution.")

    # Validate subject exists
    subj_stmt = select(Subject).where(Subject.id == payload.subject_id)
    subj = (await db.execute(subj_stmt)).scalar_one_or_none()
    if not subj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Specified Subject not found.")

    sm_id = (
        await db.execute(
            select(SubjectMapping.id).where(
                SubjectMapping.legacy_subject_id == payload.subject_id
            )
        )
    ).scalar_one_or_none()

    material = StudyMaterial(
        institution_id=institution_id,
        standard_id=payload.standard_id,
        subject_id=payload.subject_id,
        subject_mapping_id=sm_id,
        division_id=payload.division_id,
        title=payload.title.strip(),
        description=payload.description.strip() if payload.description else None,
        file_type=payload.file_type.strip(),
        file_url=payload.file_url.strip(),
        file_size_bytes=payload.file_size_bytes,
    )
    db.add(material)
    await db.commit()
    await db.refresh(material)

    return {
        "success": True,
        "message": f"Study material '{material.title}' uploaded successfully.",
        "id": material.id,
        "title": material.title,
        "standard_name": std.name,
        "subject_name": subj.name,
    }


@router.put("/{material_id}", response_model=Dict[str, Any])
async def update_study_material(
    material_id: int,
    payload: StudyMaterialUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    institution_id: int = Depends(enforce_institution_access),
):
    """
    Update study material attributes. Requires authorized staff role.
    """
    if current_user.role not in ALLOWED_MANAGE_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to edit study materials.",
        )

    stmt = select(StudyMaterial).where(and_(StudyMaterial.id == material_id, StudyMaterial.institution_id == institution_id))
    material = (await db.execute(stmt)).scalar_one_or_none()
    if not material:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Study material not found.")

    if payload.standard_id is not None:
        material.standard_id = payload.standard_id
    if payload.subject_id is not None:
        material.subject_id = payload.subject_id
    if payload.division_id is not None:
        material.division_id = payload.division_id
    if payload.title is not None:
        material.title = payload.title.strip()
    if payload.description is not None:
        material.description = payload.description.strip() if payload.description else None
    if payload.file_type is not None:
        material.file_type = payload.file_type.strip()
    if payload.file_url is not None:
        material.file_url = payload.file_url.strip()
    if payload.file_size_bytes is not None:
        material.file_size_bytes = payload.file_size_bytes

    await db.commit()
    await db.refresh(material)

    return {
        "success": True,
        "message": f"Study material '{material.title}' updated successfully.",
        "id": material.id,
        "title": material.title,
    }


@router.delete("/{material_id}", response_model=Dict[str, Any])
async def delete_study_material(
    material_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    institution_id: int = Depends(enforce_institution_access),
):
    """
    Delete a study material document. Requires admin or sysadmin role.
    """
    if current_user.role not in {"superadmin", "super_admin", "admin", "sysadmin"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only institute administrators can delete study materials.",
        )

    stmt = select(StudyMaterial).where(and_(StudyMaterial.id == material_id, StudyMaterial.institution_id == institution_id))
    material = (await db.execute(stmt)).scalar_one_or_none()
    if not material:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Study material not found.")

    deleted_title = material.title
    await db.delete(material)
    await db.commit()

    return {
        "success": True,
        "message": f"Study material '{deleted_title}' deleted successfully.",
        "id": material_id,
    }
