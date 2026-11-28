# /**
#  * @file        institutions.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      backend.app.api.v1.endpoints
#  *
#  * @author      Jawahar R. Mallah
#  * @organization Smritisys & AITDL Networks
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 PrathamOne EduOS
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-03
#  * @updated     2026-11-28
#  *
#  * @description API endpoints for multi-branch institute profile configuration and campus metadata.
#  */

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from app.core.config import PRODUCT_APP_ICON_URL
from app.core.database import get_db
from app.core.deps import get_current_active_user, require_role, is_sysadmin, check_institution_access
from app.models.institution import Institution, InstitutionBranch
from app.models.academic_year import AcademicYear
from app.models.board import Board
from app.models.standard import Standard
from app.models.subject import CanonicalSubject
from app.models.settings import InstitutionSetting
from app.services.institution_profile_service import (
    apply_validated_profile_updates,
    compute_profile_completeness,
    derive_monogram,
    ensure_unique_branch_and_save,
    record_audit_change,
    sanitize_login_custom_svg,
    serialize_branch,
    serialize_institution_profile,
)
from pydantic import BaseModel

router = APIRouter()
public_router = APIRouter()


class InstitutionCreate(BaseModel):
    name: str
    code: str
    short_name: Optional[str] = None
    tagline: Optional[str] = None
    address: Optional[str] = None
    address_line_2: Optional[str] = None
    area_locality: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    country: Optional[str] = None
    phone: Optional[str] = None
    alternate_phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    institute_type: Optional[str] = "Coaching Institute"


class InstitutionUpdate(BaseModel):
    name: Optional[str] = None
    short_name: Optional[str] = None
    branch_name: Optional[str] = None
    tagline: Optional[str] = None
    address: Optional[str] = None
    address_line_1: Optional[str] = None
    address_line_2: Optional[str] = None
    area_locality: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    country: Optional[str] = None
    phone: Optional[str] = None
    alternate_phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    logo_url: Optional[str] = None
    favicon_url: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    accent_color: Optional[str] = None
    institute_type: Optional[str] = None
    establishment_year: Optional[int] = None
    registration_number: Optional[str] = None
    gstin: Optional[str] = None
    pan: Optional[str] = None
    onboarding_completed: Optional[bool] = None
    reason: Optional[str] = None


class BranchCreate(BaseModel):
    branch_name: str
    branch_code: Optional[str] = None
    is_main_branch: bool = False
    address_line_1: Optional[str] = None
    address_line_2: Optional[str] = None
    area_locality: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    country: Optional[str] = "India"
    phone: Optional[str] = None
    alternate_phone: Optional[str] = None
    email: Optional[str] = None
    gstin: Optional[str] = None


class BranchUpdate(BaseModel):
    branch_name: Optional[str] = None
    branch_code: Optional[str] = None
    is_main_branch: Optional[bool] = None
    address_line_1: Optional[str] = None
    address_line_2: Optional[str] = None
    area_locality: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    country: Optional[str] = None
    phone: Optional[str] = None
    alternate_phone: Optional[str] = None
    email: Optional[str] = None
    gstin: Optional[str] = None
    is_active: Optional[bool] = None


@router.get("/")
async def list_institutions(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    stmt = select(Institution).where(Institution.is_active == True)
    if not is_sysadmin(current_user):
        user_inst_id = getattr(current_user, "institution_id", None)
        if not user_inst_id:
            return []
        stmt = stmt.where(Institution.id == user_inst_id)
    result = await db.execute(stmt)
    institutions = result.scalars().all()
    if not institutions and is_sysadmin(current_user):
        res_any = await db.execute(select(Institution))
        institutions = res_any.scalars().all()
    output = []
    for inst in institutions:
        b_res = await db.execute(
            select(InstitutionBranch)
            .where(InstitutionBranch.institution_id == inst.id, InstitutionBranch.is_active == True)
            .order_by(InstitutionBranch.is_main_branch.desc(), InstitutionBranch.id.asc())
        )
        output.append(serialize_institution_profile(inst, b_res.scalars().all()))
    return output


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_institution(
    data: InstitutionCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("superadmin", "sysadmin", "super_admin")),
):
    institution = Institution(**data.model_dump())
    db.add(institution)
    await db.commit()
    await db.refresh(institution)
    return {
        "id": institution.id,
        "name": institution.name,
        "code": institution.code,
    }


@router.get("/public/branding", include_in_schema=False)
@public_router.get("/public/branding", operation_id="get_public_institution_branding")
async def get_public_institution_branding(
    institution_id: Optional[int] = None,
    branch_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
):
    target_id = institution_id or 1
    res = await db.execute(select(Institution).where(Institution.id == target_id))
    inst = res.scalar_one_or_none()
    if not inst:
        res_any = await db.execute(select(Institution).limit(1))
        inst = res_any.scalar_one_or_none()
    if not inst:
        raise HTTPException(status_code=404, detail="Institution not found")

    branch_res = await db.execute(
        select(InstitutionBranch)
        .where(InstitutionBranch.institution_id == inst.id, InstitutionBranch.is_active == True)
        .order_by(InstitutionBranch.is_main_branch.desc(), InstitutionBranch.id.asc())
    )
    branches = list(branch_res.scalars().all())
    selected_branch = (
        next((b for b in branches if b.id == branch_id), None)
        if branch_id
        else next((b for b in branches if b.is_main_branch), branches[0] if branches else None)
    )

    # Fetch branding category settings (background, styles, presets)
    settings_res = await db.execute(
        select(InstitutionSetting).where(
            InstitutionSetting.institution_id == inst.id,
            InstitutionSetting.category == "branding",
        )
    )
    b_settings = {s.key: s.value for s in settings_res.scalars().all()}

    # Resolve active academic session
    ay_res = await db.execute(
        select(AcademicYear).where(
            AcademicYear.institution_id == inst.id,
            AcademicYear.is_current == True,
        ).limit(1)
    )
    active_ay = ay_res.scalar_one_or_none()
    if not active_ay:
        ay_res = await db.execute(
            select(AcademicYear).where(
                AcademicYear.institution_id == inst.id,
                AcademicYear.is_active == True,
            ).order_by(AcademicYear.id.desc()).limit(1)
        )
        active_ay = ay_res.scalar_one_or_none()
    academic_session = f"Academic Session {active_ay.name}" if active_ay else "Academic Session 2026–2027"

    def _safe_int(val, default):
        try:
            return int(val) if val is not None else default
        except (ValueError, TypeError):
            return default

    boards_res = await db.execute(
        select(Board)
        .where(Board.institution_id == inst.id, Board.is_active == True)
        .order_by(Board.id.asc())
    )
    active_boards = [
        {"name": b.name, "code": b.code}
        for b in boards_res.scalars().all()
    ]

    classes_res = await db.execute(
        select(Standard)
        .where(Standard.institution_id == inst.id, Standard.is_active == True)
        .order_by(Standard.level.asc(), Standard.id.asc())
    )
    active_classes = [s.name for s in classes_res.scalars().all()]

    subjects_res = await db.execute(
        select(CanonicalSubject.name)
        .where(CanonicalSubject.institution_id == inst.id, CanonicalSubject.is_active == True)
        .order_by(CanonicalSubject.id.asc())
        .limit(30)
    )
    active_subjects = [name for name in subjects_res.scalars().all() if name]

    completeness = compute_profile_completeness(inst)
    return {
        "id": inst.id,
        "name": inst.name,
        "code": inst.code,
        "short_name": derive_monogram(inst.name, inst.short_name),
        "tagline": inst.tagline or "COACHING MANAGEMENT. SIMPLIFIED.",
        "academic_session": academic_session,
        "boards": active_boards,
        "classes": active_classes,
        "subjects": active_subjects,
        "branch_id": selected_branch.id if selected_branch else None,
        "branch_name": selected_branch.branch_name if selected_branch else (inst.city or "Main Branch"),
        "institute_type": inst.institute_type or "Coaching Institute",
        "establishment_year": inst.establishment_year,
        "logo_url": inst.logo_url,
        "favicon_url": inst.favicon_url or PRODUCT_APP_ICON_URL,
        "primary_color": inst.primary_color or "#0B2D6B",
        "secondary_color": inst.secondary_color or "#071C44",
        "accent_color": inst.accent_color or "#F57C00",
        "phone": selected_branch.phone if (selected_branch and selected_branch.phone) else inst.phone,
        "alternate_phone": selected_branch.alternate_phone if (selected_branch and selected_branch.alternate_phone) else inst.alternate_phone,
        "email": selected_branch.email if (selected_branch and selected_branch.email) else inst.email,
        "website": inst.website,
        "address": selected_branch.address_line_1 if (selected_branch and selected_branch.address_line_1) else inst.address,
        "address_line_2": selected_branch.address_line_2 if (selected_branch and selected_branch.address_line_2) else inst.address_line_2,
        "area_locality": selected_branch.area_locality if (selected_branch and selected_branch.area_locality) else inst.area_locality,
        "city": selected_branch.city if (selected_branch and selected_branch.city) else inst.city,
        "district": selected_branch.district if (selected_branch and selected_branch.district) else inst.district,
        "state": selected_branch.state if (selected_branch and selected_branch.state) else inst.state,
        "pincode": selected_branch.pincode if (selected_branch and selected_branch.pincode) else inst.pincode,
        "country": selected_branch.country if (selected_branch and selected_branch.country) else inst.country,
        "onboarding_completed": completeness["onboarding_completed"],
        "is_placeholder_profile": completeness["is_placeholder_profile"],
        "background": {
            "mode": b_settings.get("login_bg_mode", "india_network"),
            "image_url": b_settings.get("login_bg_image_url", ""),
            "fit": b_settings.get("login_bg_fit", "cover"),
            "overlay_opacity": _safe_int(b_settings.get("login_bg_overlay_opacity"), 60),
            "blur": _safe_int(b_settings.get("login_bg_blur"), 4),
            "pattern": b_settings.get("login_bg_pattern", "geometric"),
            "video_url": b_settings.get("login_bg_video_url", ""),
            "video_type": b_settings.get("login_bg_video_type", "mp4"),
            "custom_svg": sanitize_login_custom_svg(b_settings.get("login_bg_custom_svg", ""), strict=False),
            "custom_html": b_settings.get("login_bg_custom_html", ""),
        },
    }


@router.get("/{institution_id}")
async def get_institution(
    institution_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    check_institution_access(institution_id, current_user)
    result = await db.execute(
        select(Institution).where(Institution.id == institution_id)
    )
    institution = result.scalar_one_or_none()
    if not institution:
        raise HTTPException(status_code=404, detail="Institution not found")
    branch_res = await db.execute(
        select(InstitutionBranch)
        .where(InstitutionBranch.institution_id == institution.id, InstitutionBranch.is_active == True)
        .order_by(InstitutionBranch.is_main_branch.desc(), InstitutionBranch.id.asc())
    )
    return serialize_institution_profile(institution, branch_res.scalars().all())


@router.put("/{institution_id}")
async def update_institution(
    institution_id: int,
    data: InstitutionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("superadmin", "sysadmin", "super_admin", "admin", "principal")),
):
    check_institution_access(institution_id, current_user)
    result = await db.execute(
        select(Institution).where(Institution.id == institution_id)
    )
    institution = result.scalar_one_or_none()
    if not institution:
        raise HTTPException(status_code=404, detail="Institution not found")

    updates = data.model_dump(exclude_unset=True)
    mark_complete = updates.pop("onboarding_completed", None)
    reason = str(updates.pop("reason", None) or "Updated via Institutions API")
    await apply_validated_profile_updates(
        db,
        institution,
        updates,
        actor=current_user,
        reason=reason,
        mark_onboarding_complete=mark_complete,
    )
    await db.commit()
    await db.refresh(institution)
    branch_res = await db.execute(
        select(InstitutionBranch)
        .where(InstitutionBranch.institution_id == institution.id, InstitutionBranch.is_active == True)
        .order_by(InstitutionBranch.is_main_branch.desc(), InstitutionBranch.id.asc())
    )
    return serialize_institution_profile(institution, branch_res.scalars().all())


@router.get("/{institution_id}/branches")
async def list_institution_branches(
    institution_id: int,
    include_inactive: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    check_institution_access(institution_id, current_user)
    stmt = (
        select(InstitutionBranch)
        .where(InstitutionBranch.institution_id == institution_id)
        .order_by(InstitutionBranch.is_main_branch.desc(), InstitutionBranch.id.asc())
    )
    if not include_inactive:
        stmt = stmt.where(InstitutionBranch.is_active == True)
    rows = (await db.execute(stmt)).scalars().all()
    return [serialize_branch(b) for b in rows]


@router.post("/{institution_id}/branches", status_code=status.HTTP_201_CREATED)
async def create_institution_branch(
    institution_id: int,
    data: BranchCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("superadmin", "sysadmin", "super_admin", "admin", "principal")),
):
    check_institution_access(institution_id, current_user)
    inst = await db.get(Institution, institution_id)
    if not inst:
        raise HTTPException(status_code=404, detail="Institution not found")
    branch = await ensure_unique_branch_and_save(
        db,
        institution_id=institution_id,
        payload=data.model_dump(exclude_unset=True),
        actor=current_user,
    )
    await db.commit()
    await db.refresh(branch)
    return serialize_branch(branch)


@router.put("/{institution_id}/branches/{branch_id}")
async def update_institution_branch(
    institution_id: int,
    branch_id: int,
    data: BranchUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("superadmin", "sysadmin", "super_admin", "admin", "principal")),
):
    check_institution_access(institution_id, current_user)
    branch = await ensure_unique_branch_and_save(
        db,
        institution_id=institution_id,
        payload=data.model_dump(exclude_unset=True),
        actor=current_user,
        branch_id=branch_id,
    )
    await db.commit()
    await db.refresh(branch)
    return serialize_branch(branch)


@router.delete("/{institution_id}/branches/{branch_id}")
async def deactivate_institution_branch(
    institution_id: int,
    branch_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("superadmin", "sysadmin", "super_admin", "admin", "principal")),
):
    check_institution_access(institution_id, current_user)
    res = await db.execute(
        select(InstitutionBranch).where(
            InstitutionBranch.id == branch_id,
            InstitutionBranch.institution_id == institution_id,
            InstitutionBranch.is_active == True,
        )
    )
    branch = res.scalar_one_or_none()
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    if branch.is_main_branch:
        raise HTTPException(
            status_code=409,
            detail="Cannot delete or archive the primary Main Branch. Assign another Main Branch first.",
        )
    branch.is_active = False
    record_audit_change(
        db,
        institution_id=institution_id,
        setting_key=f"branch.{branch.id}.is_active",
        category="branches",
        old_val=True,
        new_val=False,
        actor=current_user,
        reason="Deactivated secondary branch",
    )
    await db.commit()
    return {"status": "success", "id": branch_id, "is_active": False}


@public_router.get("/public/notices")
async def get_public_campus_notices(
    institution_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Public unauthenticated endpoint returning non-confidential campus notices and circulars.
    Strictly excludes internal faculty notes, disciplinary records, and financial ledgers.
    """
    from app.models.portal import Announcement
    target_id = institution_id or 1
    stmt = (
        select(Announcement)
        .where(Announcement.institution_id == target_id)
        .order_by(Announcement.is_pinned.desc(), Announcement.id.desc())
        .limit(10)
    )
    res = await db.execute(stmt)
    records = res.scalars().all()

    output = []
    for r in records:
        cat = "Academic"
        raw_cat = (r.category or "").lower()
        title_lower = (r.title or "").lower()
        if "exam" in raw_cat or "test" in title_lower:
            cat = "Examination"
        elif "holiday" in raw_cat:
            cat = "Holiday"
        elif "event" in raw_cat or "celebration" in title_lower:
            cat = "Event"

        date_str = "23 Nov 2026"
        if hasattr(r, "publish_date") and r.publish_date:
            date_str = r.publish_date.strftime("%d %b %Y")
        elif hasattr(r, "created_at") and r.created_at:
            date_str = r.created_at.strftime("%d %b %Y")

        output.append({
            "id": f"notice-{r.id}",
            "title": r.title,
            "category": cat,
            "date": date_str,
            "urgency": "high" if getattr(r, "is_pinned", False) else "normal",
            "summary": (r.content or "")[:240],
            "targetGrade": "All Standards",
            "hasAttachment": bool(getattr(r, "attachment_url", None)),
        })
    return {"status": "success", "count": len(output), "notices": output}

