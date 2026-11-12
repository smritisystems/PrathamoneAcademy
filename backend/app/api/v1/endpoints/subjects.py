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
#  * @updated     2026-11-12
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
from app.core.deps import get_current_active_user, require_role, check_institution_access, is_sysadmin
from app.models.institution import Institution
from app.models.subject import Subject, CanonicalSubject, SubjectMapping, SubjectLegacyMapping
from app.models.standard import Standard
from app.models.board import Board
from app.models.academic_year import AcademicYear
from app.services.safe_delete_service import SafeDeleteService

router = APIRouter()


def _resolve_subject_institution_filter(institution_id: Optional[int], current_user) -> Optional[int]:
    """Resolve and validate effective institution_id for tenant-scoped subject queries."""
    if institution_id is not None:
        check_institution_access(institution_id, current_user)
        return institution_id
    if not is_sysadmin(current_user):
        inst_id = getattr(current_user, "institution_id", None)
        if inst_id is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Institution context required",
            )
        return inst_id
    return None


# ---------------------------------------------------------------------------
# Pydantic Schemas
# ---------------------------------------------------------------------------

class CanonicalSubjectCreate(BaseModel):
    name: str
    code: str
    category: str = "General"
    description: Optional[str] = None
    aliases: Optional[str] = None
    alternate_codes: Optional[str] = None
    institution_id: Optional[int] = None


class CanonicalSubjectUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    aliases: Optional[str] = None
    alternate_codes: Optional[str] = None
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
    pass_marks: Optional[int] = None
    passing_marks: Optional[int] = None
    is_optional: Optional[bool] = None
    is_core: Optional[bool] = None
    category: Optional[str] = "General"
    aliases: Optional[str] = None


class SubjectUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    standard_id: Optional[int] = None
    max_marks: Optional[int] = None
    pass_marks: Optional[int] = None
    passing_marks: Optional[int] = None
    is_optional: Optional[bool] = None
    is_core: Optional[bool] = None
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
    effective_inst_id = _resolve_subject_institution_filter(institution_id, current_user)
    clean_name = name.strip()

    # Exact name match (case-insensitive and trimmed)
    exact_q = select(CanonicalSubject).where(
        func.lower(func.trim(CanonicalSubject.name)) == clean_name.lower(),
        CanonicalSubject.is_active == True,
    )
    if effective_inst_id is not None:
        exact_q = exact_q.where(CanonicalSubject.institution_id == effective_inst_id)
    exact_res = await db.execute(exact_q)
    exact = exact_res.scalars().first()

    # Check if input matches legacy mapping code/name
    legacy_match = None
    if not exact:
        slm_q = select(SubjectLegacyMapping).join(
            CanonicalSubject, SubjectLegacyMapping.canonical_subject_id == CanonicalSubject.id
        ).where(
            CanonicalSubject.is_active == True,
            or_(
                func.lower(SubjectLegacyMapping.legacy_code) == clean_name.lower(),
                func.lower(SubjectLegacyMapping.legacy_name) == clean_name.lower(),
            ),
        )
        if effective_inst_id is not None:
            slm_q = slm_q.where(CanonicalSubject.institution_id == effective_inst_id)
        slm_res = await db.execute(slm_q)
        slm = slm_res.scalars().first()
        if slm:
            exact = (await db.execute(
                select(CanonicalSubject).where(
                    CanonicalSubject.id == slm.canonical_subject_id,
                    CanonicalSubject.is_active == True,
                )
            )).scalar_one_or_none()
            if exact:
                legacy_match = f"Mapped from historical code '{slm.legacy_code}' ({slm.legacy_name})"

    # Similar matches by substring, aliases, alternate_codes, or code
    pattern = f"%{clean_name}%"
    sim_q = select(CanonicalSubject).where(
        CanonicalSubject.is_active == True,
        or_(
            CanonicalSubject.name.ilike(pattern),
            CanonicalSubject.aliases.ilike(pattern),
            CanonicalSubject.alternate_codes.ilike(pattern),
            CanonicalSubject.code.ilike(pattern),
        ),
    )
    if effective_inst_id is not None:
        sim_q = sim_q.where(CanonicalSubject.institution_id == effective_inst_id)
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
            "alternate_codes": exact.alternate_codes,
            "match_source": legacy_match or "Canonical Name",
        } if exact else None,
        "similar_matches": [
            {
                "id": s.id,
                "name": s.name,
                "code": s.code,
                "category": s.category,
                "description": s.description,
                "aliases": s.aliases,
                "alternate_codes": s.alternate_codes,
            }
            for s in similar if not exact or s.id != exact.id
        ],
        "message": (
            f"An existing canonical subject '{exact.name}' ({exact.code}) was found ({legacy_match or 'canonical match'}). Reusing it will link this curriculum mapping without duplicating master identities."
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
    effective_inst_id = _resolve_subject_institution_filter(institution_id, current_user)
    query = (
        select(CanonicalSubject)
        .options(
            selectinload(CanonicalSubject.mappings).joinedload(SubjectMapping.standard),
            selectinload(CanonicalSubject.mappings).joinedload(SubjectMapping.board),
            selectinload(CanonicalSubject.legacy_mappings),
        )
    )
    if effective_inst_id is not None:
        query = query.where(CanonicalSubject.institution_id == effective_inst_id)
    if not include_inactive:
        query = query.where(CanonicalSubject.is_active == True)
    if category and category.strip():
        query = query.where(CanonicalSubject.category.ilike(category.strip()))
    if search and search.strip():
        s = f"%{search.strip()}%"
        # Search canonical fields and legacy mappings
        matching_cs_ids = (
            await db.execute(
                select(SubjectLegacyMapping.canonical_subject_id).where(
                    or_(
                        SubjectLegacyMapping.legacy_code.ilike(s),
                        SubjectLegacyMapping.legacy_name.ilike(s),
                    )
                )
            )
        ).scalars().all()

        query = query.where(
            or_(
                CanonicalSubject.name.ilike(s),
                CanonicalSubject.code.ilike(s),
                CanonicalSubject.aliases.ilike(s),
                CanonicalSubject.alternate_codes.ilike(s),
                CanonicalSubject.id.in_(matching_cs_ids) if matching_cs_ids else False,
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
            "alternate_codes": cs.alternate_codes,
            "is_active": cs.is_active,
            "mappings_count": len(active_maps),
            "standards_count": len(unique_stds),
            "boards_count": len(unique_boards),
            "standards_summary": standards_names,
            "boards_summary": boards_codes,
            "legacy_mappings_count": len(cs.legacy_mappings),
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
    effective_inst_id = _resolve_subject_institution_filter(data.institution_id, current_user)
    inst_id = effective_inst_id
    if inst_id is None:
        first_inst = (await db.execute(select(Institution))).scalars().first()
        inst_id = first_inst.id if first_inst else 1
    else:
        inst_check = (await db.execute(select(Institution).where(Institution.id == inst_id))).scalar_one_or_none()
        if not inst_check:
            raise HTTPException(status_code=404, detail="Institution not found")

    clean_name = data.name.strip()
    clean_code = data.code.strip().upper()

    # Check code uniqueness
    existing_code = (
        await db.execute(
            select(CanonicalSubject).where(
                CanonicalSubject.institution_id == inst_id,
                CanonicalSubject.code.ilike(clean_code),
                CanonicalSubject.is_active == True,
            )
        )
    ).scalar_one_or_none()
    if existing_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Canonical subject with permanent code '{clean_code}' already exists ({existing_code.name})",
        )

    # Check duplicate normalized name
    if not force:
        existing_name = (
            await db.execute(
                select(CanonicalSubject).where(
                    CanonicalSubject.institution_id == inst_id,
                    func.lower(func.trim(CanonicalSubject.name)) == clean_name.lower(),
                    CanonicalSubject.is_active == True,
                )
            )
        ).scalar_one_or_none()
        if existing_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Canonical subject '{clean_name}' already exists with code '{existing_name.code}'. Reuse this subject or supply ?force=true to create an additional identity.",
            )

    subject = CanonicalSubject(
        institution_id=inst_id,
        name=clean_name,
        code=clean_code,
        category=data.category.strip(),
        description=data.description.strip() if data.description else None,
        aliases=data.aliases.strip() if data.aliases else None,
        alternate_codes=data.alternate_codes.strip() if data.alternate_codes else None,
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
        "alternate_codes": subject.alternate_codes,
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
            selectinload(CanonicalSubject.legacy_mappings),
        )
        .where(CanonicalSubject.id == canonical_id)
    )
    res = await db.execute(query)
    cs = res.scalar_one_or_none()
    if not cs:
        raise HTTPException(status_code=404, detail="Canonical subject not found")
    check_institution_access(cs.institution_id, current_user)

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

    legacy_maps_data = [
        {
            "id": lm.id,
            "legacy_subject_id": lm.legacy_subject_id,
            "standard_id": lm.standard_id,
            "legacy_code": lm.legacy_code,
            "canonical_code": lm.canonical_code,
            "legacy_name": lm.legacy_name,
            "canonical_name": lm.canonical_name,
        }
        for lm in cs.legacy_mappings
    ]

    return {
        "id": cs.id,
        "name": cs.name,
        "code": cs.code,
        "category": cs.category,
        "description": cs.description,
        "aliases": cs.aliases,
        "alternate_codes": cs.alternate_codes,
        "is_active": cs.is_active,
        "created_at": cs.created_at.isoformat() if cs.created_at else None,
        "mappings": mappings_data,
        "legacy_mappings": legacy_maps_data,
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
    check_institution_access(cs.institution_id, current_user)

    update_dict = data.model_dump(exclude_unset=True)
    if "name" in update_dict and update_dict["name"]:
        new_name = update_dict["name"].strip()
        # Check normalized name collision
        coll = (await db.execute(
            select(CanonicalSubject).where(
                CanonicalSubject.institution_id == cs.institution_id,
                CanonicalSubject.id != cs.id,
                func.lower(func.trim(CanonicalSubject.name)) == new_name.lower(),
                CanonicalSubject.is_active == True,
            )
        )).scalar_one_or_none()
        if coll:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Canonical subject '{new_name}' already exists with code '{coll.code}'",
            )
        cs.name = new_name

    for k, v in update_dict.items():
        if k != "name" and hasattr(cs, k) and v is not None:
            setattr(cs, k, v.strip() if isinstance(v, str) else v)

    await db.commit()
    await db.refresh(cs)
    return {
        "id": cs.id,
        "name": cs.name,
        "code": cs.code,
        "category": cs.category,
        "alternate_codes": cs.alternate_codes,
        "message": f"Canonical subject '{cs.name}' updated successfully",
    }


@router.delete("/canonical/{canonical_id}")
async def delete_canonical_subject(
    canonical_id: int,
    permanent: bool = Query(False, description="If true, permanently delete record if eligible; otherwise safely deactivate"),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("superadmin", "admin", "principal")),
):
    cs = await db.get(CanonicalSubject, canonical_id)
    if cs:
        check_institution_access(cs.institution_id, current_user)
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
    effective_inst_id = _resolve_subject_institution_filter(None, current_user)
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
    if effective_inst_id is not None:
        query = query.where(Standard.institution_id == effective_inst_id)

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
    check_institution_access(cs.institution_id, current_user)

    # Verify standard exists
    std = (await db.execute(select(Standard).where(Standard.id == data.standard_id))).scalar_one_or_none()
    if not std:
        raise HTTPException(status_code=404, detail="Standard not found")
    check_institution_access(std.institution_id, current_user)

    if data.board_id is not None:
        brd = await db.get(Board, data.board_id)
        if not brd:
            raise HTTPException(status_code=404, detail="Board not found")
        check_institution_access(brd.institution_id, current_user)

    if data.academic_year_id is not None:
        ay = await db.get(AcademicYear, data.academic_year_id)
        if not ay:
            raise HTTPException(status_code=404, detail="Academic year not found")
        check_institution_access(ay.institution_id, current_user)

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
    std = await db.get(Standard, sm.standard_id)
    check_institution_access(std.institution_id if std else None, current_user)

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
    sm = await db.get(SubjectMapping, mapping_id)
    if sm:
        std = await db.get(Standard, sm.standard_id)
        check_institution_access(std.institution_id if std else None, current_user)
    if permanent:
        return await SafeDeleteService.execute_safe_delete(
            db=db, entity_type="subject_mapping", entity_id=mapping_id, current_user=current_user
        )
    return await SafeDeleteService.execute_safe_deactivate(
        db=db, entity_type="subject_mapping", entity_id=mapping_id, current_user=current_user
    )



# ---------------------------------------------------------------------------
# Reversible Mapping & Subject Resolution Endpoints
# ---------------------------------------------------------------------------

@router.get("/legacy-mappings")
async def list_legacy_mappings(
    canonical_subject_id: Optional[int] = Query(None),
    standard_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """
    Returns reversible legacy subject mapping records linking original subject IDs
    and curriculum codes to canonical subject identities.
    """
    effective_inst_id = _resolve_subject_institution_filter(None, current_user)
    query = (
        select(
            SubjectLegacyMapping,
            CanonicalSubject.name.label("canonical_subject_name"),
            CanonicalSubject.code.label("canonical_subject_code"),
            Standard.name.label("standard_name"),
        )
        .join(CanonicalSubject, SubjectLegacyMapping.canonical_subject_id == CanonicalSubject.id)
        .outerjoin(Standard, SubjectLegacyMapping.standard_id == Standard.id)
    )
    if effective_inst_id is not None:
        query = query.where(CanonicalSubject.institution_id == effective_inst_id)
    if canonical_subject_id:
        query = query.where(SubjectLegacyMapping.canonical_subject_id == canonical_subject_id)
    if standard_id:
        query = query.where(SubjectLegacyMapping.standard_id == standard_id)
    if search and search.strip():
        s = f"%{search.strip()}%"
        query = query.where(
            or_(
                SubjectLegacyMapping.legacy_code.ilike(s),
                SubjectLegacyMapping.canonical_code.ilike(s),
                SubjectLegacyMapping.legacy_name.ilike(s),
                SubjectLegacyMapping.canonical_name.ilike(s),
            )
        )

    result = await db.execute(query.order_by(SubjectLegacyMapping.legacy_subject_id))
    rows = result.all()
    return [
        {
            "id": slm.id,
            "legacy_subject_id": slm.legacy_subject_id,
            "canonical_subject_id": slm.canonical_subject_id,
            "canonical_subject_name": c_name,
            "canonical_subject_code": c_code,
            "standard_id": slm.standard_id,
            "standard_name": std_name,
            "legacy_code": slm.legacy_code,
            "canonical_code": slm.canonical_code,
            "legacy_name": slm.legacy_name,
            "canonical_name": slm.canonical_name,
            "created_at": slm.created_at.isoformat() if slm.created_at else None,
        }
        for slm, c_name, c_code, std_name in rows
    ]


@router.get("/resolve/{identifier}")
async def resolve_subject(
    identifier: str,
    standard_id: Optional[int] = Query(None),
    id_type: Optional[str] = Query(None, description="'legacy', 'canonical', or 'auto'"),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """
    Resolves any subject identifier (canonical ID, legacy subject ID, canonical code,
    legacy code, or alias) into its canonical subject identity and curriculum mappings.
    """
    clean_id = identifier.strip()
    effective_inst_id = _resolve_subject_institution_filter(None, current_user)
    cs: Optional[CanonicalSubject] = None
    resolved_via: str = "unknown"

    def _canon_lookup_stmt(*filters):
        stmt = (
            select(CanonicalSubject)
            .options(
                selectinload(CanonicalSubject.mappings).joinedload(SubjectMapping.standard),
                selectinload(CanonicalSubject.legacy_mappings),
            )
            .where(CanonicalSubject.is_active == True, *filters)
        )
        if effective_inst_id is not None:
            stmt = stmt.where(CanonicalSubject.institution_id == effective_inst_id)
        return stmt

    # 1. Numeric ID resolution (canonical ID or legacy ID)
    if clean_id.isdigit():
        num_id = int(clean_id)

        if id_type == "legacy":
            # Explicit legacy ID resolution
            slm_q = select(SubjectLegacyMapping).where(SubjectLegacyMapping.legacy_subject_id == num_id)
            if effective_inst_id is not None:
                slm_q = slm_q.join(
                    CanonicalSubject, SubjectLegacyMapping.canonical_subject_id == CanonicalSubject.id
                ).where(CanonicalSubject.institution_id == effective_inst_id)
            slm = (await db.execute(slm_q)).scalar_one_or_none()
            if slm:
                cs = (await db.execute(_canon_lookup_stmt(CanonicalSubject.id == slm.canonical_subject_id))).scalar_one_or_none()
                resolved_via = f"legacy_subject_id #{num_id} ({slm.legacy_name})"
        elif id_type == "canonical":
            # Explicit canonical ID resolution
            cs = (await db.execute(_canon_lookup_stmt(CanonicalSubject.id == num_id))).scalar_one_or_none()
            resolved_via = f"canonical_id #{num_id}"
        else:
            # Auto: check canonical ID first, fallback to legacy ID
            cs = (await db.execute(_canon_lookup_stmt(CanonicalSubject.id == num_id))).scalar_one_or_none()
            if cs:
                resolved_via = f"canonical_id #{num_id}"
            else:
                slm_q = select(SubjectLegacyMapping).where(SubjectLegacyMapping.legacy_subject_id == num_id)
                if effective_inst_id is not None:
                    slm_q = slm_q.join(
                        CanonicalSubject, SubjectLegacyMapping.canonical_subject_id == CanonicalSubject.id
                    ).where(CanonicalSubject.institution_id == effective_inst_id)
                slm = (await db.execute(slm_q)).scalar_one_or_none()
                if slm:
                    cs = (await db.execute(_canon_lookup_stmt(CanonicalSubject.id == slm.canonical_subject_id))).scalar_one_or_none()
                    resolved_via = f"legacy_subject_id #{num_id} ({slm.legacy_name})"

    # 2. String resolution: legacy code in subject_legacy_mappings
    if not cs:
        slm_q = select(SubjectLegacyMapping).where(
            func.lower(SubjectLegacyMapping.legacy_code) == clean_id.lower()
        )
        if effective_inst_id is not None:
            slm_q = slm_q.join(
                CanonicalSubject, SubjectLegacyMapping.canonical_subject_id == CanonicalSubject.id
            ).where(CanonicalSubject.institution_id == effective_inst_id)
        slm = (await db.execute(slm_q)).scalars().first()
        if slm:
            cs = (await db.execute(_canon_lookup_stmt(CanonicalSubject.id == slm.canonical_subject_id))).scalar_one_or_none()
            resolved_via = f"legacy_code '{slm.legacy_code}'"

    # 3. String resolution: canonical code, name, alternate_codes, or aliases
    if not cs:
        cs = (await db.execute(
            _canon_lookup_stmt(
                or_(
                    func.lower(CanonicalSubject.code) == clean_id.lower(),
                    func.lower(CanonicalSubject.name) == clean_id.lower(),
                    CanonicalSubject.alternate_codes.ilike(f"%{clean_id}%"),
                    CanonicalSubject.aliases.ilike(f"%{clean_id}%"),
                )
            )
        )).scalars().first()
        if cs:
            resolved_via = f"canonical_record ({cs.name})"

    if not cs:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Subject identifier '{identifier}' could not be resolved to any canonical subject record.",
        )

    # Standard-specific mapping if requested
    target_mapping = None
    if standard_id:
        target_mapping = next(
            (
                {
                    "id": m.id,
                    "standard_id": m.standard_id,
                    "standard_name": m.standard.name if m.standard else None,
                    "curriculum_code": m.curriculum_code,
                    "display_name": m.display_name or cs.name,
                    "legacy_subject_id": m.legacy_subject_id,
                }
                for m in cs.mappings
                if m.is_active and m.standard_id == standard_id
            ),
            None,
        )

    return {
        "canonical_subject_id": cs.id,
        "name": cs.name,
        "code": cs.code,
        "category": cs.category,
        "description": cs.description,
        "aliases": cs.aliases,
        "alternate_codes": cs.alternate_codes,
        "is_active": cs.is_active,
        "matched_input": identifier,
        "target_standard_mapping": target_mapping,
        "all_mappings": [
            {
                "id": m.id,
                "standard_id": m.standard_id,
                "standard_name": m.standard.name if m.standard else None,
                "curriculum_code": m.curriculum_code,
                "display_name": m.display_name or cs.name,
                "legacy_subject_id": m.legacy_subject_id,
            }
            for m in cs.mappings if m.is_active
        ],
        "legacy_codes": [lm.legacy_code for lm in cs.legacy_mappings if lm.legacy_code],
    }


# ---------------------------------------------------------------------------
# Consolidated Subjects Endpoint (/api/v1/subjects)
# ---------------------------------------------------------------------------

@router.get("/")
async def list_subjects(
    standard_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    institution_id: Optional[int] = Query(None),
    raw: bool = Query(False, description="Return raw unconsolidated standard-specific records if true"),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """
    Returns subjects for academic workflows.
    - If standard_id is provided or raw=True: returns standard-specific subjects.
    - If standard_id is omitted (general dropdowns): returns consolidated canonical subjects
      without duplicate identities, supporting lookup by old subject codes and aliases.
    """
    effective_inst_id = _resolve_subject_institution_filter(institution_id, current_user)
    if standard_id is not None or raw:
        query = (
            select(Subject, Standard.name.label("standard_name"))
            .join(Standard, Subject.standard_id == Standard.id)
            .where(Subject.is_active == True)
        )
        if standard_id:
            query = query.where(Subject.standard_id == standard_id)
        if effective_inst_id is not None:
            query = query.where(Standard.institution_id == effective_inst_id)
        if search and search.strip():
            s = f"%{search.strip()}%"
            query = (
                query.outerjoin(CanonicalSubject, Subject.canonical_subject_id == CanonicalSubject.id)
                .where(
                    or_(
                        Subject.name.ilike(s),
                        Subject.code.ilike(s),
                        CanonicalSubject.name.ilike(s),
                        CanonicalSubject.code.ilike(s),
                        CanonicalSubject.aliases.ilike(s),
                        CanonicalSubject.alternate_codes.ilike(s),
                    )
                )
            )

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
                "passing_marks": sub.pass_marks,
                "is_optional": sub.is_optional,
                "is_core": not sub.is_optional,
                "is_active": sub.is_active,
            }
            for sub, std_name in rows
        ]

    # Consolidated Canonical View for general dropdowns when standard_id is omitted
    query = (
        select(CanonicalSubject)
        .options(
            selectinload(CanonicalSubject.mappings).joinedload(SubjectMapping.standard),
            selectinload(CanonicalSubject.legacy_subjects),
            selectinload(CanonicalSubject.legacy_mappings),
        )
        .where(CanonicalSubject.is_active == True)
    )
    if effective_inst_id is not None:
        query = query.where(CanonicalSubject.institution_id == effective_inst_id)
    if search and search.strip():
        s = f"%{search.strip()}%"
        # Search canonical fields and legacy mappings
        matching_cs_ids = (
            await db.execute(
                select(SubjectLegacyMapping.canonical_subject_id).where(
                    or_(
                        SubjectLegacyMapping.legacy_code.ilike(s),
                        SubjectLegacyMapping.legacy_name.ilike(s),
                    )
                )
            )
        ).scalars().all()

        query = query.where(
            or_(
                CanonicalSubject.name.ilike(s),
                CanonicalSubject.code.ilike(s),
                CanonicalSubject.aliases.ilike(s),
                CanonicalSubject.alternate_codes.ilike(s),
                CanonicalSubject.id.in_(matching_cs_ids) if matching_cs_ids else False,
            )
        )

    result = await db.execute(query.order_by(CanonicalSubject.name, CanonicalSubject.id))
    canonical_list = result.scalars().all()

    def _split_csv(val: Optional[str]) -> list[str]:
        if not val:
            return []
        return [part.strip() for part in val.split(",") if part.strip()]

    consolidated: dict[str, dict] = {}
    for cs in canonical_list:
        norm_name = cs.name.strip().lower()
        active_maps = [m for m in cs.mappings if m.is_active]
        standards_names = sorted({m.standard.name for m in active_maps if m.standard})
        primary_legacy_id = cs.legacy_subjects[0].id if cs.legacy_subjects else cs.id
        alt_codes = _split_csv(cs.alternate_codes)
        alias_list = _split_csv(cs.aliases)

        if norm_name not in consolidated:
            consolidated[norm_name] = {
                "id": primary_legacy_id,
                "name": cs.name,
                "code": cs.code,
                "category": cs.category,
                "standard_id": None,
                "standard_name": ", ".join(standards_names) if standards_names else "All Standards",
                "canonical_subject_id": cs.id,
                "alternate_codes": ", ".join(alt_codes) if alt_codes else None,
                "aliases": ", ".join(alias_list) if alias_list else None,
                "standards_count": len(standards_names),
                "standards_summary": standards_names,
                "max_marks": 100,
                "pass_marks": 35,
                "passing_marks": 35,
                "is_optional": False,
                "is_core": True,
                "is_active": cs.is_active,
                "_has_legacy": bool(cs.legacy_mappings or alt_codes),
            }
        else:
            existing_entry = consolidated[norm_name]
            merged_stds = sorted(set(existing_entry["standards_summary"]) | set(standards_names))
            merged_alts = list(dict.fromkeys(_split_csv(existing_entry["alternate_codes"]) + alt_codes))
            merged_aliases = list(dict.fromkeys(_split_csv(existing_entry["aliases"]) + alias_list))
            existing_entry["standards_summary"] = merged_stds
            existing_entry["standards_count"] = len(merged_stds)
            existing_entry["standard_name"] = ", ".join(merged_stds) if merged_stds else "All Standards"
            existing_entry["alternate_codes"] = ", ".join(merged_alts) if merged_alts else None
            existing_entry["aliases"] = ", ".join(merged_aliases) if merged_aliases else None
            if (cs.legacy_mappings or alt_codes) and not existing_entry["_has_legacy"]:
                existing_entry["id"] = primary_legacy_id
                existing_entry["canonical_subject_id"] = cs.id
                existing_entry["code"] = cs.code
                existing_entry["_has_legacy"] = True

    output = []
    for entry in consolidated.values():
        entry.pop("_has_legacy", None)
        output.append(entry)
    return output


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_subject(
    data: SubjectCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("superadmin", "admin", "principal")),
):
    std_rec = (await db.execute(select(Standard).where(Standard.id == data.standard_id))).scalar_one_or_none()
    if not std_rec:
        raise HTTPException(status_code=404, detail="Standard not found")
    check_institution_access(std_rec.institution_id, current_user)

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
    clean_code = data.code.strip().upper() if data.code else None
    inst_id = std_rec.institution_id

    # Check by normalized name, code, alternate codes, or aliases
    match_conditions = [func.lower(func.trim(CanonicalSubject.name)) == clean_name.lower()]
    if clean_code:
        match_conditions.append(func.upper(CanonicalSubject.code) == clean_code)
        match_conditions.append(CanonicalSubject.alternate_codes.ilike(f"%{clean_code}%"))
    match_conditions.append(CanonicalSubject.aliases.ilike(f"%{clean_name}%"))

    canon = (
        await db.execute(
            select(CanonicalSubject).where(
                CanonicalSubject.institution_id == inst_id,
                CanonicalSubject.is_active == True,
                or_(*match_conditions),
            )
        )
    ).scalars().first()

    if not canon:
        # Generate unique code if clean_code is already taken
        base_code = clean_code if clean_code else f"SUB_{clean_name[:4].upper()}"
        canon_code = base_code
        code_exists = (
            await db.execute(
                select(CanonicalSubject).where(
                    CanonicalSubject.institution_id == inst_id,
                    func.upper(CanonicalSubject.code) == canon_code,
                )
            )
        ).scalar_one_or_none()
        if code_exists:
            canon_code = f"{base_code}_{data.standard_id}"

        canon = CanonicalSubject(
            institution_id=inst_id,
            name=clean_name,
            code=canon_code,
            category=(data.category or "General").strip(),
            aliases=data.aliases.strip() if data.aliases else None,
            is_active=True,
        )
        db.add(canon)
        await db.flush()

    effective_pass_marks = (
        data.passing_marks
        if data.passing_marks is not None
        else (data.pass_marks if data.pass_marks is not None else 35)
    )
    effective_is_optional = (
        (not data.is_core)
        if data.is_core is not None
        else (data.is_optional if data.is_optional is not None else False)
    )

    subject = Subject(
        standard_id=data.standard_id,
        canonical_subject_id=canon.id,
        name=data.name,
        code=data.code,
        max_marks=data.max_marks,
        pass_marks=effective_pass_marks,
        is_optional=effective_is_optional,
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
            pass_marks=effective_pass_marks,
            is_optional=effective_is_optional,
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
        select(Subject, Standard.name.label("standard_name"), Standard.institution_id.label("institution_id"))
        .join(Standard, Subject.standard_id == Standard.id)
        .where(Subject.id == subject_id)
    )
    row = (await db.execute(query)).first()
    if not row:
        raise HTTPException(status_code=404, detail="Subject not found")
    sub, std_name, std_inst_id = row
    check_institution_access(std_inst_id, current_user)
    return {
        "id": sub.id,
        "name": sub.name,
        "code": sub.code,
        "standard_id": sub.standard_id,
        "standard_name": std_name,
        "canonical_subject_id": sub.canonical_subject_id,
        "max_marks": sub.max_marks,
        "pass_marks": sub.pass_marks,
        "passing_marks": sub.pass_marks,
        "is_optional": sub.is_optional,
        "is_core": not sub.is_optional,
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
    std = await db.get(Standard, subject.standard_id)
    check_institution_access(std.institution_id if std else None, current_user)

    if data.standard_id is not None and data.standard_id != subject.standard_id:
        target_std = await db.get(Standard, data.standard_id)
        if not target_std:
            raise HTTPException(status_code=404, detail="Target standard not found")
        check_institution_access(target_std.institution_id, current_user)

    update_dict = data.model_dump(exclude_unset=True)
    if "passing_marks" in update_dict and update_dict["passing_marks"] is not None:
        update_dict.setdefault("pass_marks", update_dict["passing_marks"])
    if "is_core" in update_dict and update_dict["is_core"] is not None:
        update_dict.setdefault("is_optional", not update_dict["is_core"])

    for k, v in update_dict.items():
        if k in ("passing_marks", "is_core"):
            continue
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
        if "pass_marks" in update_dict and update_dict["pass_marks"] is not None:
            sm.pass_marks = update_dict["pass_marks"]
        if "is_optional" in update_dict and update_dict["is_optional"] is not None:
            sm.is_optional = update_dict["is_optional"]
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
    sub = await db.get(Subject, subject_id)
    if sub:
        std = await db.get(Standard, sub.standard_id)
        check_institution_access(std.institution_id if std else None, current_user)
    if permanent:
        return await SafeDeleteService.execute_safe_delete(
            db=db, entity_type="subject", entity_id=subject_id, current_user=current_user
        )
    return await SafeDeleteService.execute_safe_deactivate(
        db=db, entity_type="subject", entity_id=subject_id, current_user=current_user
    )

