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
#  * @updated     2026-11-10
#  *
#  * @description API endpoints for canonical subject master catalogue, curriculum syllabus mappings, and legacy subject compatibility.
#  */

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func, and_
from sqlalchemy.orm import selectinload, joinedload
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime

from app.core.database import get_db
from app.core.deps import get_current_active_user, require_role
from app.models.institution import Institution
from app.models.subject import Subject, CanonicalSubject, SubjectMapping
from app.models.standard import Standard
from app.models.board import Board
from app.models.academic_year import AcademicYear
from app.services.safe_delete_service import SafeDeleteService

router = APIRouter()


# ---------------------------------------------------------------------------
# Pydantic Schemas
# ---------------------------------------------------------------------------

class CanonicalSubjectCreate(BaseModel):
    name: str
    code: str
    category: str = "General"
    description: Optional[str] = None
    aliases: Optional[str] = None
    institution_id: int = 1


class CanonicalSubjectUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    aliases: Optional[str] = None
    is_active: Optional[bool] = None


class SubjectMappingCreate(BaseModel):
    canonical_subject_id: int
    standard_id: int
    board_id: Optional[int] = None
    academic_year_id: Optional[int] = None
    curriculum_code: Optional[str] = None
    display_name: Optional[str] = None
    max_marks: int = 100
    pass_marks: int = 35
    is_optional: bool = False
    display_order: int = 1


class SubjectMappingUpdate(BaseModel):
    curriculum_code: Optional[str] = None
    display_name: Optional[str] = None
    board_id: Optional[int] = None
    academic_year_id: Optional[int] = None
    max_marks: Optional[int] = None
    pass_marks: Optional[int] = None
    is_optional: Optional[bool] = None
    display_order: Optional[int] = None
    is_active: Optional[bool] = None


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


# ---------------------------------------------------------------------------
# Duplicate Detection & Live Suggestion
# ---------------------------------------------------------------------------

@router.get("/duplicate-check")
async def check_duplicate_subject(
    name: str = Query(..., min_length=1, description="Subject name to check for duplicates"),
    institution_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    clean_name = name.strip()

    # Exact name match (case-insensitive)
    exact_q = select(CanonicalSubject).where(
        func.lower(CanonicalSubject.name) == clean_name.lower(),
        CanonicalSubject.is_active == True,
    )
    if institution_id:
        exact_q = exact_q.where(CanonicalSubject.institution_id == institution_id)
    exact_res = await db.execute(exact_q)
    exact = exact_res.scalars().first()

    # Similar matches by substring or aliases
    pattern = f"%{clean_name}%"
    sim_q = select(CanonicalSubject).where(
        CanonicalSubject.is_active == True,
        or_(
            CanonicalSubject.name.ilike(pattern),
            CanonicalSubject.aliases.ilike(pattern),
            CanonicalSubject.code.ilike(pattern),
        ),
    )
    if institution_id:
        sim_q = sim_q.where(CanonicalSubject.institution_id == institution_id)
    sim_res = await db.execute(sim_q.limit(10))
    similar = sim_res.scalars().all()

    return {
        "has_exact_match": exact is not None,
        "exact_match": {
            "id": exact.id,
            "name": exact.name,
            "code": exact.code,
            "category": exact.category,
            "description": exact.description,
            "aliases": exact.aliases,
        } if exact else None,
        "similar_matches": [
            {
                "id": s.id,
                "name": s.name,
                "code": s.code,
                "category": s.category,
                "description": s.description,
                "aliases": s.aliases,
            }
            for s in similar if not exact or s.id != exact.id
        ],
        "message": (
            f"An existing canonical subject '{exact.name}' ({exact.code}) was found. Reusing it will link this curriculum mapping without duplicating master identities."
            if exact
            else (
                f"Found {len(similar)} similar subject(s) in master catalog. Please verify if one of these should be reused."
                if similar
                else "No existing duplicate subject found. Safe to register new canonical subject."
            )
        ),
    }


# ---------------------------------------------------------------------------
# Canonical Subject Master Endpoints
# ---------------------------------------------------------------------------

@router.get("/canonical")
async def list_canonical_subjects(
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    include_inactive: bool = Query(False),
    institution_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    query = (
        select(CanonicalSubject)
        .options(
            selectinload(CanonicalSubject.mappings).joinedload(SubjectMapping.standard),
            selectinload(CanonicalSubject.mappings).joinedload(SubjectMapping.board),
        )
    )
    if institution_id:
        query = query.where(CanonicalSubject.institution_id == institution_id)
    if not include_inactive:
        query = query.where(CanonicalSubject.is_active == True)
    if category and category.strip():
        query = query.where(CanonicalSubject.category.ilike(category.strip()))
    if search and search.strip():
        s = f"%{search.strip()}%"
        query = query.where(
            or_(
                CanonicalSubject.name.ilike(s),
                CanonicalSubject.code.ilike(s),
                CanonicalSubject.aliases.ilike(s),
            )
        )

    result = await db.execute(query.order_by(CanonicalSubject.name))
    canonical_list = result.scalars().all()

    output = []
    for cs in canonical_list:
        active_maps = [m for m in cs.mappings if m.is_active]
        unique_stds = {m.standard_id for m in active_maps if m.standard_id}
        unique_boards = {m.board_id for m in active_maps if m.board_id}
        standards_names = sorted(list({m.standard.name for m in active_maps if m.standard}))
        boards_codes = sorted(list({m.board.code for m in active_maps if m.board}))

        output.append({
            "id": cs.id,
            "name": cs.name,
            "code": cs.code,
            "category": cs.category,
            "description": cs.description,
            "aliases": cs.aliases,
            "is_active": cs.is_active,
            "mappings_count": len(active_maps),
            "standards_count": len(unique_stds),
            "boards_count": len(unique_boards),
            "standards_summary": standards_names,
            "boards_summary": boards_codes,
            "created_at": cs.created_at.isoformat() if cs.created_at else None,
        })
    return output


@router.post("/canonical", status_code=status.HTTP_201_CREATED)
async def create_canonical_subject(
    data: CanonicalSubjectCreate,
    force: bool = Query(False, description="Force creation even if duplicate name exists"),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("superadmin", "admin", "principal")),
):
    # Verify institution_id exists, fallback to first institution if needed
    inst_id = data.institution_id
    inst_check = (await db.execute(select(Institution).where(Institution.id == inst_id))).scalar_one_or_none()
    if not inst_check:
        first_inst = (await db.execute(select(Institution))).scalars().first()
        if first_inst:
            inst_id = first_inst.id

    # Check code uniqueness
    existing_code = (
        await db.execute(
            select(CanonicalSubject).where(
                CanonicalSubject.institution_id == inst_id,
                CanonicalSubject.code.ilike(data.code.strip()),
                CanonicalSubject.is_active == True,
            )
        )
    ).scalar_one_or_none()
    if existing_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Canonical subject with permanent code '{data.code}' already exists ({existing_code.name})",
        )

    # Check duplicate name
    if not force:
        existing_name = (
            await db.execute(
                select(CanonicalSubject).where(
                    CanonicalSubject.institution_id == inst_id,
                    func.lower(CanonicalSubject.name) == data.name.strip().lower(),
                    CanonicalSubject.is_active == True,
                )
            )
        ).scalar_one_or_none()
        if existing_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Canonical subject '{data.name}' already exists with code '{existing_name.code}'. Reuse this subject or supply ?force=true to create an additional identity.",
            )

    subject = CanonicalSubject(
        institution_id=inst_id,
        name=data.name.strip(),
        code=data.code.strip().upper(),
        category=data.category.strip(),
        description=data.description.strip() if data.description else None,
        aliases=data.aliases.strip() if data.aliases else None,
        is_active=True,
    )
    db.add(subject)
    await db.commit()
    await db.refresh(subject)
    return {
        "id": subject.id,
        "name": subject.name,
        "code": subject.code,
        "category": subject.category,
        "message": f"Canonical subject '{subject.name}' registered successfully",
    }


@router.get("/canonical/{canonical_id}")
async def get_canonical_subject(
    canonical_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    query = (
        select(CanonicalSubject)
        .options(
            selectinload(CanonicalSubject.mappings).joinedload(SubjectMapping.standard),
            selectinload(CanonicalSubject.mappings).joinedload(SubjectMapping.board),
            selectinload(CanonicalSubject.mappings).joinedload(SubjectMapping.academic_year),
        )
        .where(CanonicalSubject.id == canonical_id)
    )
    res = await db.execute(query)
    cs = res.scalar_one_or_none()
    if not cs:
        raise HTTPException(status_code=404, detail="Canonical subject not found")

    mappings_data = [
        {
            "id": m.id,
            "standard_id": m.standard_id,
            "standard_name": m.standard.name if m.standard else None,
            "board_id": m.board_id,
            "board_name": m.board.name if m.board else None,
            "board_code": m.board.code if m.board else None,
            "academic_year_id": m.academic_year_id,
            "academic_year_name": m.academic_year.name if m.academic_year else None,
            "curriculum_code": m.curriculum_code,
            "display_name": m.display_name or cs.name,
            "max_marks": m.max_marks,
            "pass_marks": m.pass_marks,
            "is_optional": m.is_optional,
            "is_active": m.is_active,
            "legacy_subject_id": m.legacy_subject_id,
        }
        for m in cs.mappings if m.is_active
    ]

    return {
        "id": cs.id,
        "name": cs.name,
        "code": cs.code,
        "category": cs.category,
        "description": cs.description,
        "aliases": cs.aliases,
        "is_active": cs.is_active,
        "created_at": cs.created_at.isoformat() if cs.created_at else None,
        "mappings": mappings_data,
    }


@router.put("/canonical/{canonical_id}")
async def update_canonical_subject(
    canonical_id: int,
    data: CanonicalSubjectUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("superadmin", "admin", "principal")),
):
    res = await db.execute(select(CanonicalSubject).where(CanonicalSubject.id == canonical_id))
    cs = res.scalar_one_or_none()
    if not cs:
        raise HTTPException(status_code=404, detail="Canonical subject not found")

    update_dict = data.model_dump(exclude_unset=True)
    for k, v in update_dict.items():
        if hasattr(cs, k) and v is not None:
            setattr(cs, k, v)

    await db.commit()
    await db.refresh(cs)
    return {
        "id": cs.id,
        "name": cs.name,
        "code": cs.code,
        "category": cs.category,
        "message": f"Canonical subject '{cs.name}' updated successfully",
    }


@router.delete("/canonical/{canonical_id}")
async def delete_canonical_subject(
    canonical_id: int,
    permanent: bool = Query(False, description="If true, permanently delete record if eligible; otherwise safely deactivate"),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("superadmin", "admin", "principal")),
):
    if permanent:
        return await SafeDeleteService.execute_safe_delete(
            db=db, entity_type="canonical_subject", entity_id=canonical_id, current_user=current_user
        )
    return await SafeDeleteService.execute_safe_deactivate(
        db=db, entity_type="canonical_subject", entity_id=canonical_id, current_user=current_user
    )



# ---------------------------------------------------------------------------
# Subject Applicability Mappings Endpoints
# ---------------------------------------------------------------------------

@router.get("/mappings")
async def list_subject_mappings(
    canonical_subject_id: Optional[int] = Query(None),
    standard_id: Optional[int] = Query(None),
    board_id: Optional[int] = Query(None),
    academic_year_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    query = (
        select(
            SubjectMapping,
            CanonicalSubject.name.label("canonical_name"),
            CanonicalSubject.code.label("canonical_code"),
            CanonicalSubject.category.label("category"),
            Standard.name.label("standard_name"),
            Standard.level.label("standard_level"),
            Board.name.label("board_name"),
            Board.code.label("board_code"),
            AcademicYear.name.label("academic_year_name"),
        )
        .join(CanonicalSubject, SubjectMapping.canonical_subject_id == CanonicalSubject.id)
        .join(Standard, SubjectMapping.standard_id == Standard.id)
        .outerjoin(Board, SubjectMapping.board_id == Board.id)
        .outerjoin(AcademicYear, SubjectMapping.academic_year_id == AcademicYear.id)
        .where(SubjectMapping.is_active == True)
    )

    if canonical_subject_id:
        query = query.where(SubjectMapping.canonical_subject_id == canonical_subject_id)
    if standard_id:
        query = query.where(SubjectMapping.standard_id == standard_id)
    if board_id:
        query = query.where(SubjectMapping.board_id == board_id)
    if academic_year_id:
        query = query.where(SubjectMapping.academic_year_id == academic_year_id)
    if search and search.strip():
        s = f"%{search.strip()}%"
        query = query.where(
            or_(
                CanonicalSubject.name.ilike(s),
                SubjectMapping.curriculum_code.ilike(s),
                SubjectMapping.display_name.ilike(s),
                Standard.name.ilike(s),
            )
        )

    result = await db.execute(query.order_by(Standard.level, CanonicalSubject.name))
    rows = result.all()

    return [
        {
            "id": sm.id,
            "canonical_subject_id": sm.canonical_subject_id,
            "canonical_name": c_name,
            "canonical_code": c_code,
            "category": cat,
            "standard_id": sm.standard_id,
            "standard_name": std_name,
            "standard_level": std_level,
            "board_id": sm.board_id,
            "board_name": b_name,
            "board_code": b_code,
            "academic_year_id": sm.academic_year_id,
            "academic_year_name": ay_name,
            "curriculum_code": sm.curriculum_code,
            "display_name": sm.display_name or c_name,
            "max_marks": sm.max_marks,
            "pass_marks": sm.pass_marks,
            "is_optional": sm.is_optional,
            "display_order": sm.display_order,
            "is_active": sm.is_active,
            "legacy_subject_id": sm.legacy_subject_id,
        }
        for sm, c_name, c_code, cat, std_name, std_level, b_name, b_code, ay_name in rows
    ]


@router.post("/mappings", status_code=status.HTTP_201_CREATED)
async def create_subject_mapping(
    data: SubjectMappingCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("superadmin", "admin", "principal")),
):
    # Verify canonical subject exists
    cs = (await db.execute(select(CanonicalSubject).where(CanonicalSubject.id == data.canonical_subject_id))).scalar_one_or_none()
    if not cs:
        raise HTTPException(status_code=404, detail="Canonical subject not found")

    # Verify standard exists
    std = (await db.execute(select(Standard).where(Standard.id == data.standard_id))).scalar_one_or_none()
    if not std:
        raise HTTPException(status_code=404, detail="Standard not found")

    # Check for existing duplicate mapping
    check_query = select(SubjectMapping).where(
        SubjectMapping.canonical_subject_id == data.canonical_subject_id,
        SubjectMapping.standard_id == data.standard_id,
        SubjectMapping.is_active == True,
    )
    if data.board_id is not None:
        check_query = check_query.where(SubjectMapping.board_id == data.board_id)
    else:
        check_query = check_query.where(SubjectMapping.board_id.is_(None))

    if data.academic_year_id is not None:
        check_query = check_query.where(SubjectMapping.academic_year_id == data.academic_year_id)
    else:
        check_query = check_query.where(SubjectMapping.academic_year_id.is_(None))

    existing = (await db.execute(check_query)).scalar_one_or_none()
    if existing:
        board_label = f" for board ID {data.board_id}" if data.board_id else ""
        ay_label = f" in academic year ID {data.academic_year_id}" if data.academic_year_id else ""
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Subject '{cs.name}' is already mapped to {std.name}{board_label}{ay_label}",
        )

    # Maintain backward compatibility with legacy Subject table
    effective_name = data.display_name.strip() if data.display_name else cs.name
    effective_code = data.curriculum_code.strip() if data.curriculum_code else cs.code

    legacy_sub = (
        await db.execute(
            select(Subject).where(
                Subject.standard_id == data.standard_id,
                Subject.name == effective_name,
                Subject.is_active == True,
            )
        )
    ).scalar_one_or_none()

    if not legacy_sub:
        legacy_sub = Subject(
            standard_id=data.standard_id,
            canonical_subject_id=cs.id,
            name=effective_name,
            code=effective_code,
            max_marks=data.max_marks,
            pass_marks=data.pass_marks,
            is_optional=data.is_optional,
            is_active=True,
        )
        db.add(legacy_sub)
        await db.flush()

    mapping = SubjectMapping(
        canonical_subject_id=cs.id,
        standard_id=data.standard_id,
        board_id=data.board_id,
        academic_year_id=data.academic_year_id,
        curriculum_code=effective_code,
        display_name=effective_name,
        max_marks=data.max_marks,
        pass_marks=data.pass_marks,
        is_optional=data.is_optional,
        display_order=data.display_order,
        is_active=True,
        legacy_subject_id=legacy_sub.id,
    )
    db.add(mapping)
    await db.commit()
    await db.refresh(mapping)

    return {
        "id": mapping.id,
        "canonical_subject_id": mapping.canonical_subject_id,
        "canonical_name": cs.name,
        "standard_id": mapping.standard_id,
        "standard_name": std.name,
        "curriculum_code": mapping.curriculum_code,
        "display_name": mapping.display_name,
        "legacy_subject_id": mapping.legacy_subject_id,
        "message": f"Successfully mapped '{cs.name}' to {std.name}",
    }


@router.put("/mappings/{mapping_id}")
async def update_subject_mapping(
    mapping_id: int,
    data: SubjectMappingUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("superadmin", "admin", "principal")),
):
    res = await db.execute(select(SubjectMapping).where(SubjectMapping.id == mapping_id))
    sm = res.scalar_one_or_none()
    if not sm:
        raise HTTPException(status_code=404, detail="Subject mapping not found")

    update_dict = data.model_dump(exclude_unset=True)
    for k, v in update_dict.items():
        if hasattr(sm, k) and v is not None:
            setattr(sm, k, v)

    # Sync to legacy subject if linked
    if sm.legacy_subject_id:
        legacy_res = await db.execute(select(Subject).where(Subject.id == sm.legacy_subject_id))
        legacy = legacy_res.scalar_one_or_none()
        if legacy:
            if data.display_name is not None:
                legacy.name = data.display_name
            if data.curriculum_code is not None:
                legacy.code = data.curriculum_code
            if data.max_marks is not None:
                legacy.max_marks = data.max_marks
            if data.pass_marks is not None:
                legacy.pass_marks = data.pass_marks
            if data.is_optional is not None:
                legacy.is_optional = data.is_optional
            if data.is_active is not None:
                legacy.is_active = data.is_active

    await db.commit()
    await db.refresh(sm)
    return {"id": sm.id, "message": "Subject mapping updated successfully"}


@router.delete("/mappings/{mapping_id}")
async def delete_subject_mapping(
    mapping_id: int,
    permanent: bool = Query(False, description="If true, permanently delete record if eligible; otherwise safely deactivate"),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("superadmin", "admin", "principal")),
):
    if permanent:
        return await SafeDeleteService.execute_safe_delete(
            db=db, entity_type="subject_mapping", entity_id=mapping_id, current_user=current_user
        )
    return await SafeDeleteService.execute_safe_deactivate(
        db=db, entity_type="subject_mapping", entity_id=mapping_id, current_user=current_user
    )



# ---------------------------------------------------------------------------
# Legacy Compatibility Endpoints (/api/v1/subjects)
# ---------------------------------------------------------------------------

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
            "canonical_subject_id": sub.canonical_subject_id,
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
    current_user=Depends(require_role("superadmin", "admin", "principal")),
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

    # Find or auto-link canonical subject
    clean_name = data.name.strip()
    std_rec = (await db.execute(select(Standard).where(Standard.id == data.standard_id))).scalar_one_or_none()
    inst_id = std_rec.institution_id if std_rec else 1

    canon = (
        await db.execute(
            select(CanonicalSubject).where(
                CanonicalSubject.institution_id == inst_id,
                func.lower(CanonicalSubject.name) == clean_name.lower(),
                CanonicalSubject.is_active == True,
            )
        )
    ).scalar_one_or_none()

    if not canon:
        # Create canonical subject
        canon_code = data.code.strip().upper() if data.code else f"SUB_{clean_name[:4].upper()}"
        canon = CanonicalSubject(
            institution_id=inst_id,
            name=clean_name,
            code=canon_code,
            category="General",
            is_active=True,
        )
        db.add(canon)
        await db.flush()

    subject = Subject(
        standard_id=data.standard_id,
        canonical_subject_id=canon.id,
        name=data.name,
        code=data.code,
        max_marks=data.max_marks,
        pass_marks=data.pass_marks,
        is_optional=data.is_optional,
        is_active=True,
    )
    db.add(subject)
    await db.flush()

    # Also register in subject_mappings if not present
    existing_mapping = (
        await db.execute(
            select(SubjectMapping).where(
                SubjectMapping.canonical_subject_id == canon.id,
                SubjectMapping.standard_id == data.standard_id,
                SubjectMapping.is_active == True,
            )
        )
    ).scalar_one_or_none()

    if not existing_mapping:
        mapping = SubjectMapping(
            canonical_subject_id=canon.id,
            standard_id=data.standard_id,
            curriculum_code=data.code,
            display_name=data.name,
            max_marks=data.max_marks,
            pass_marks=data.pass_marks,
            is_optional=data.is_optional,
            legacy_subject_id=subject.id,
            is_active=True,
        )
        db.add(mapping)

    await db.commit()
    await db.refresh(subject)
    return {
        "id": subject.id,
        "name": subject.name,
        "code": subject.code,
        "standard_id": subject.standard_id,
        "canonical_subject_id": subject.canonical_subject_id,
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
        "canonical_subject_id": sub.canonical_subject_id,
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
    current_user=Depends(require_role("superadmin", "admin", "principal")),
):
    result = await db.execute(select(Subject).where(Subject.id == subject_id))
    subject = result.scalar_one_or_none()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    update_dict = data.model_dump(exclude_unset=True)
    for k, v in update_dict.items():
        if hasattr(subject, k) and v is not None:
            setattr(subject, k, v)

    # Sync to mapping if linked
    mapping_res = await db.execute(
        select(SubjectMapping).where(SubjectMapping.legacy_subject_id == subject.id)
    )
    sm = mapping_res.scalar_one_or_none()
    if sm:
        if data.name is not None:
            sm.display_name = data.name
        if data.code is not None:
            sm.curriculum_code = data.code
        if data.max_marks is not None:
            sm.max_marks = data.max_marks
        if data.pass_marks is not None:
            sm.pass_marks = data.pass_marks
        if data.is_optional is not None:
            sm.is_optional = data.is_optional
        if data.is_active is not None:
            sm.is_active = data.is_active

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
    permanent: bool = Query(False, description="If true, permanently delete record if eligible; otherwise safely deactivate"),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("superadmin", "admin", "principal")),
):
    if permanent:
        return await SafeDeleteService.execute_safe_delete(
            db=db, entity_type="subject", entity_id=subject_id, current_user=current_user
        )
    return await SafeDeleteService.execute_safe_deactivate(
        db=db, entity_type="subject", entity_id=subject_id, current_user=current_user
    )

