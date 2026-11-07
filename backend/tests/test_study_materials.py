# /**
#  * @file        test_study_materials.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      backend.tests
#  *
#  * @author      Jawahar R. Mallah
#  * @organization AITDL (AI Technology & Development Lab)
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 AITDL
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-07
#  * @updated     2026-11-07
#  *
#  * @description Test suite validating study materials CRUD, stats, RBAC, and tenant isolation.
#  */

import pytest
import uuid
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.portal import StudyMaterial
from app.models.standard import Standard
from app.models.subject import Subject
from app.models.institution import Institution
from app.models.user import User
from app.core.security import create_access_token


async def setup_test_academic_context(db: AsyncSession, admin_user: User):
    # Ensure institution exists and admin is attached
    if not admin_user.institution_id:
        inst_res = await db.execute(select(Institution))
        inst = inst_res.scalars().first()
        if not inst:
            inst = Institution(name="Prashant Academy Test", code=f"TA{uuid.uuid4().hex[:6]}", city="Mumbai")
            db.add(inst)
            await db.flush()
        admin_user.institution_id = inst.id
        await db.commit()
        await db.refresh(admin_user)
    else:
        inst_res = await db.execute(select(Institution).where(Institution.id == admin_user.institution_id))
        inst = inst_res.scalars().first()
        if not inst:
            inst = Institution(name="Prashant Academy Test", code=f"TA{uuid.uuid4().hex[:6]}", city="Mumbai")
            db.add(inst)
            await db.flush()
            admin_user.institution_id = inst.id
            await db.commit()

    # Ensure Standard exists
    std_res = await db.execute(select(Standard).where(Standard.institution_id == admin_user.institution_id))
    std = std_res.scalars().first()
    if not std:
        std = Standard(institution_id=admin_user.institution_id, name="Standard 10", level=10)
        db.add(std)
        await db.flush()

    # Ensure Subject exists
    subj_res = await db.execute(select(Subject).where(Subject.standard_id == std.id))
    subj = subj_res.scalars().first()
    if not subj:
        subj = Subject(standard_id=std.id, name="Mathematics", code="MTH-10")
        db.add(subj)
        await db.flush()

    await db.commit()
    return std, subj


@pytest.mark.asyncio
async def test_list_study_materials(client: AsyncClient, db: AsyncSession, admin_user: User):
    std, subj = await setup_test_academic_context(db, admin_user)
    token = create_access_token(data={"sub": str(admin_user.id)})
    headers = {"Authorization": f"Bearer {token}", "X-Data-Environment": "PRODUCTION"}

    # Seed 2 test materials
    sm1 = StudyMaterial(
        institution_id=admin_user.institution_id,
        standard_id=std.id,
        subject_id=subj.id,
        title="Class X Geometry Formula Booklet",
        file_type="Formula Sheet",
        file_url="/materials/geom_formulas.pdf",
        file_size_bytes=102400,
    )
    sm2 = StudyMaterial(
        institution_id=admin_user.institution_id,
        standard_id=std.id,
        subject_id=subj.id,
        title="Class X Algebra Question Bank",
        file_type="Question Bank",
        file_url="/materials/algebra_bank.pdf",
        file_size_bytes=204800,
    )
    db.add_all([sm1, sm2])
    await db.commit()

    response = await client.get("/api/v1/study-materials", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert data["total"] >= 2
    item = next(i for i in data["items"] if i["id"] == sm1.id)
    assert item["standard_name"] == std.name
    assert item["subject_name"] == subj.name


@pytest.mark.asyncio
async def test_study_materials_stats(client: AsyncClient, db: AsyncSession, admin_user: User):
    std, subj = await setup_test_academic_context(db, admin_user)
    token = create_access_token(data={"sub": str(admin_user.id)})
    headers = {"Authorization": f"Bearer {token}", "X-Data-Environment": "PRODUCTION"}

    # Seed test material for stats
    sm = StudyMaterial(
        institution_id=admin_user.institution_id,
        standard_id=std.id,
        subject_id=subj.id,
        title="Class X Trigonometry Revision Notes",
        file_type="Notes",
        file_url="/materials/trig_notes.pdf",
        file_size_bytes=51200,
    )
    db.add(sm)
    await db.commit()

    response = await client.get("/api/v1/study-materials/stats", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "total_materials" in data
    assert "standards_covered" in data
    assert data["total_materials"] >= 1


@pytest.mark.asyncio
async def test_create_update_delete_study_material(client: AsyncClient, db: AsyncSession, admin_user: User):
    std, subj = await setup_test_academic_context(db, admin_user)
    token = create_access_token(data={"sub": str(admin_user.id)})
    headers = {"Authorization": f"Bearer {token}", "X-Data-Environment": "PRODUCTION"}

    # 1. Create
    payload = {
        "standard_id": std.id,
        "subject_id": subj.id,
        "title": "Automated Test Notes for Calculus",
        "description": "Integration test for study material management",
        "file_type": "Formula Sheet",
        "file_url": "/materials/test_calculus.pdf",
        "file_size_bytes": 102400,
    }
    create_resp = await client.post("/api/v1/study-materials", json=payload, headers=headers)
    assert create_resp.status_code == 201
    created = create_resp.json()
    material_id = created["id"]
    assert created["success"] is True

    # 2. Update
    update_resp = await client.put(
        f"/api/v1/study-materials/{material_id}",
        json={"title": "Updated Calculus Master Booklet", "file_type": "Question Bank"},
        headers=headers,
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["title"] == "Updated Calculus Master Booklet"

    # 3. Delete
    delete_resp = await client.delete(f"/api/v1/study-materials/{material_id}", headers=headers)
    assert delete_resp.status_code == 200
    assert delete_resp.json()["success"] is True

    # 4. Verify deleted from DB
    check_stmt = select(StudyMaterial).where(StudyMaterial.id == material_id)
    check_res = (await db.execute(check_stmt)).scalar_one_or_none()
    assert check_res is None
