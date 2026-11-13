# /**
#  * @file        institutions.py
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
#  * @updated     2026-11-14
#  *
#  * @description API endpoints for multi-branch institute profile configuration and campus metadata.
#  */

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from app.core.database import get_db
from app.core.deps import get_current_active_user, require_role, is_sysadmin, check_institution_access
from app.models.institution import Institution
from app.models.settings import InstitutionSetting
from pydantic import BaseModel

router = APIRouter()


class InstitutionCreate(BaseModel):
    name: str
    code: str
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None


class InstitutionUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None


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
            "favicon_url": i.favicon_url or "/icons/icon-192x192.png",
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


@router.get("/public/branding")
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

    def _safe_int(val, default):
        try:
            return int(val) if val is not None else default
        except (ValueError, TypeError):
            return default

    return {
        "id": inst.id,
        "name": inst.name,
        "code": inst.code,
        "short_name": inst.short_name or "PA",
        "tagline": inst.tagline or "Learn • Practice • Achieve",
        "logo_url": inst.logo_url,
        "favicon_url": inst.favicon_url or "/icons/icon-192x192.png",
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
        "favicon_url": institution.favicon_url or "/icons/icon-192x192.png",
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
