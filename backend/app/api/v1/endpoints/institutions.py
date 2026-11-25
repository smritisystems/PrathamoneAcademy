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
#  * @updated     2026-11-26
#  *
#  * @description API endpoints for multi-branch institute profile configuration and campus metadata.
#  */

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from app.core.config import PRODUCT_APP_ICON_URL
from app.core.database import get_db
from app.core.deps import get_current_active_user, require_role, is_sysadmin, check_institution_access
from app.models.institution import Institution
from app.models.academic_year import AcademicYear
from app.models.settings import InstitutionSetting
from pydantic import BaseModel

router = APIRouter()
public_router = APIRouter()


class InstitutionCreate(BaseModel):
    name: str
    code: str
    short_name: Optional[str] = None
    tagline: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    institute_type: Optional[str] = "Coaching Institute"


class InstitutionUpdate(BaseModel):
    name: Optional[str] = None
    short_name: Optional[str] = None
    tagline: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    logo_url: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    accent_color: Optional[str] = None
    institute_type: Optional[str] = None
    establishment_year: Optional[int] = None
    registration_number: Optional[str] = None


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
    return [
        {
            "id": i.id,
            "name": i.name,
            "code": i.code,
            "short_name": i.short_name or "PA",
            "tagline": i.tagline or "Learn • Practice • Achieve",
            "city": i.city,
            "state": i.state,
            "pincode": i.pincode,
            "phone": i.phone,
            "email": i.email,
            "website": i.website,
            "address": i.address,
            "logo_url": i.logo_url or "/logo.svg",
            "favicon_url": i.favicon_url or PRODUCT_APP_ICON_URL,
            "primary_color": i.primary_color or "#0B2D6B",
            "secondary_color": i.secondary_color or "#071C44",
            "accent_color": i.accent_color or "#F57C00",
        }
        for i in institutions
    ]


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

    fallback_monogram = "YA"
    if inst.name and inst.name != "Your Academy Name":
        parts = inst.name.split()
        if len(parts) >= 2:
            fallback_monogram = f"{parts[0][0]}{parts[1][0]}".upper()
        elif len(parts) == 1 and len(parts[0]) >= 2:
            fallback_monogram = parts[0][:2].upper()

    return {
        "id": inst.id,
        "name": inst.name,
        "code": inst.code,
        "short_name": inst.short_name or fallback_monogram,
        "tagline": inst.tagline or "Empowering Minds • Inspiring Excellence • Shaping Futures",
        "academic_session": academic_session,
        "branch_name": inst.city or "Main Campus",
        "institute_type": inst.institute_type or "Coaching Institute",
        "establishment_year": inst.establishment_year or 2018,
        "logo_url": inst.logo_url,
        "favicon_url": inst.favicon_url or PRODUCT_APP_ICON_URL,
        "primary_color": inst.primary_color or "#0B2D6B",
        "secondary_color": inst.secondary_color or "#071C44",
        "accent_color": inst.accent_color or "#F57C00",
        "phone": inst.phone,
        "email": inst.email,
        "website": inst.website,
        "address": inst.address,
        "city": inst.city,
        "state": inst.state,
        "pincode": inst.pincode,
        "background": {
            "mode": b_settings.get("login_bg_mode", "waves"),
            "image_url": b_settings.get("login_bg_image_url", ""),
            "fit": b_settings.get("login_bg_fit", "cover"),
            "overlay_opacity": _safe_int(b_settings.get("login_bg_overlay_opacity"), 60),
            "blur": _safe_int(b_settings.get("login_bg_blur"), 4),
            "pattern": b_settings.get("login_bg_pattern", "geometric"),
            "video_url": b_settings.get("login_bg_video_url", ""),
            "video_type": b_settings.get("login_bg_video_type", "mp4"),
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
    return {
        "id": institution.id,
        "name": institution.name,
        "code": institution.code,
        "short_name": institution.short_name or "PA",
        "tagline": institution.tagline or "Learn • Practice • Achieve",
        "address": institution.address,
        "city": institution.city,
        "state": institution.state,
        "pincode": institution.pincode,
        "phone": institution.phone,
        "email": institution.email,
        "website": institution.website,
        "logo_url": institution.logo_url or "/logo.svg",
        "favicon_url": institution.favicon_url or PRODUCT_APP_ICON_URL,
        "primary_color": institution.primary_color or "#0B2D6B",
        "secondary_color": institution.secondary_color or "#071C44",
        "accent_color": institution.accent_color or "#F57C00",
    }


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
    for key, value in data.model_dump(exclude_none=True).items():
        setattr(institution, key, value)
    await db.commit()
    await db.refresh(institution)
    return {"id": institution.id, "name": institution.name}


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

