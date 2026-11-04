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
#  * @updated     2026-11-04
#  *
#  * @description API endpoints for multi-branch institute profile configuration and campus metadata.
#  */

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.models.institution import Institution
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
    result = await db.execute(
        select(Institution).where(Institution.is_active == True)
    )
    institutions = result.scalars().all()
    if not institutions:
        res_any = await db.execute(select(Institution))
        institutions = res_any.scalars().all()
    if not institutions:
        pa = Institution(
            name="Prashant Academy",
            code="PA001",
            address="Dadar West, Near Shivaji Park",
            city="Mumbai",
            state="Maharashtra",
            pincode="400028",
            phone="+91-22-12345678",
            email="info@prashantacademy.edu.in",
            website="https://prashantacademy.edu.in",
            is_active=True,
        )
        db.add(pa)
        await db.commit()
        await db.refresh(pa)
        institutions = [pa]
    return [
        {
            "id": i.id,
            "name": i.name,
            "code": i.code,
            "city": i.city,
            "state": i.state,
            "phone": i.phone,
            "email": i.email,
            "website": i.website,
            "address": i.address,
        }
        for i in institutions
    ]


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_institution(
    data: InstitutionCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
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


@router.get("/{institution_id}")
async def get_institution(
    institution_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
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
        "address": institution.address,
        "city": institution.city,
        "state": institution.state,
        "pincode": institution.pincode,
        "phone": institution.phone,
        "email": institution.email,
        "website": institution.website,
    }


@router.put("/{institution_id}")
async def update_institution(
    institution_id: int,
    data: InstitutionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
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

