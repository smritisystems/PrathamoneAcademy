# /**
#  * @file        test_global_post_get_parity.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      backend.tests
#  *
#  * @author      Jawahar R. Mallah
#  * @organization Smritisys & AITDL Networks
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 PrathamOne EduOS
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-26
#  * @updated     2026-11-26
#  *
#  * @description Global POST->GET visibility, cache-control headers, and TRAINING vs PRODUCTION parity regression tests.
#  */

from decimal import Decimal
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.academic_year import AcademicYear
from app.models.fee import FeeCategory, FeeStructure
from app.models.institution import Institution
from app.models.student import Student
from app.models.user import User


@pytest.mark.asyncio
async def test_api_responses_carry_no_store_cache_headers(client: AsyncClient, auth_headers: dict):
    resp = await client.get("/api/v1/students/", headers=auth_headers)
    assert resp.status_code == 200
    assert "no-store" in resp.headers.get("cache-control", "").lower()
    assert "no-cache" in resp.headers.get("pragma", "").lower()


@pytest.mark.asyncio
async def test_unassigned_student_appears_in_list_and_adjust_fees_appears_in_profile_and_register(
    client: AsyncClient,
    auth_headers: dict,
    db: AsyncSession,
    test_institution: Institution,
    test_academic_year: AcademicYear,
):
    inst = test_institution
    ay = test_academic_year

    cat = FeeCategory(institution_id=inst.id, name="Parity Tuition", is_active=True)
    db.add(cat)
    await db.flush()
    fs = FeeStructure(
        institution_id=inst.id,
        academic_year_id=ay.id,
        category_id=cat.id,
        name="Parity Annual Plan",
        amount=Decimal("24000.00"),
        frequency="annual",
        installments_count=2,
        is_active=True,
    )
    db.add(fs)
    await db.commit()

    # 1. Create student WITHOUT standard_id/enrollment
    create_res = await client.post(
        "/api/v1/students/",
        json={
            "institution_id": inst.id,
            "first_name": "Kavya",
            "last_name": "Deshmukh",
            "date_of_birth": "2011-05-14",
            "gender": "female",
            "admission_date": "2026-06-01",
            "academic_year_id": ay.id,
        },
        headers=auth_headers,
    )
    assert create_res.status_code == 201, create_res.text
    student_id = create_res.json()["id"]

    # 2. Must appear in GET /api/v1/students/?academic_year_id=... immediately
    list_res = await client.get(
        f"/api/v1/students/?academic_year_id={ay.id}&institution_id={inst.id}",
        headers=auth_headers,
    )
    assert list_res.status_code == 200
    assert any(row["id"] == student_id for row in list_res.json()["data"])

    # 3. Assign fee via adjust-fees
    adj_res = await client.post(
        f"/api/v1/fees/students/{student_id}/adjust-fees",
        json={
            "fee_structure_id": fs.id,
            "custom_amount": 22000,
            "reason": "Initial package assignment parity check",
        },
        headers=auth_headers,
    )
    assert adj_res.status_code == 200, adj_res.text

    # 4. Student profile must show fees.assignment immediately
    prof_res = await client.get(f"/api/v1/students/{student_id}/profile", headers=auth_headers)
    assert prof_res.status_code == 200
    assignment = prof_res.json()["fees"]["assignment"]
    assert assignment is not None
    assert assignment["fee_structure_id"] == fs.id
    assert assignment["package_amount"] == 22000.0
    assert assignment["has_invoice"] is False

    # 5. Fee register (/fees/invoicing) must include the assigned unbilled student
    reg_res = await client.get(f"/api/v1/fees/register?academic_year_id={ay.id}", headers=auth_headers)
    assert reg_res.status_code == 200
    reg_match = [r for r in reg_res.json() if r["student_id"] == student_id]
    assert len(reg_match) == 1
    assert reg_match[0]["status"] == "unbilled"
    assert reg_match[0]["net_amount"] == 22000.0


@pytest.mark.asyncio
async def test_training_mode_post_and_get_route_consistently_across_modules(
    client: AsyncClient,
    auth_headers: dict,
    db: AsyncSession,
):
    # Ensure PA001-DEMO institution + baseline academic year exist
    demo_inst = (await db.execute(select(Institution).where(Institution.code == "PA001-DEMO"))).scalar_one_or_none()
    if not demo_inst:
        demo_inst = Institution(name="Demo Tenant", code="PA001-DEMO", is_active=True)
        db.add(demo_inst)
        await db.flush()
    demo_ay = (await db.execute(select(AcademicYear).where(AcademicYear.institution_id == demo_inst.id))).scalar_one_or_none()
    if not demo_ay:
        from datetime import date
        demo_ay = AcademicYear(
            institution_id=demo_inst.id,
            name="2026-27 Demo",
            start_date=date(2026, 4, 1),
            end_date=date(2027, 3, 31),
            is_current=True,
            is_active=True,
        )
        db.add(demo_ay)
    await db.commit()

    training_headers = {**auth_headers, "X-Data-Environment": "TRAINING"}

    # Even if client passes institution_id=1 / academic_year_id=1, TRAINING POST must route to PA001-DEMO
    stu_res = await client.post(
        "/api/v1/students/",
        json={
            "institution_id": 1,
            "academic_year_id": 1,
            "first_name": "Rohan",
            "last_name": "DemoUser",
            "date_of_birth": "2010-09-10",
            "gender": "male",
            "admission_date": "2026-06-15",
        },
        headers=training_headers,
    )
    assert stu_res.status_code == 201, stu_res.text
    demo_student_id = stu_res.json()["id"]

    # Visible in TRAINING list, NOT visible in PRODUCTION list
    tr_list = await client.get("/api/v1/students/?academic_year_id=1", headers=training_headers)
    assert any(r["id"] == demo_student_id for r in tr_list.json()["data"])
    prod_list = await client.get("/api/v1/students/?academic_year_id=1", headers=auth_headers)
    assert all(r["id"] != demo_student_id for r in prod_list.json()["data"])

    # Fee category & structure in TRAINING
    cat_res = await client.post(
        "/api/v1/fees/categories",
        json={"institution_id": 1, "name": "Demo Tuition"},
        headers=training_headers,
    )
    assert cat_res.status_code == 201, cat_res.text
    fs_res = await client.post(
        "/api/v1/fees/structures",
        json={
            "institution_id": 1,
            "academic_year_id": 1,
            "category_id": cat_res.json()["id"],
            "name": "Demo Plan 2026",
            "amount": 15000,
        },
        headers=training_headers,
    )
    assert fs_res.status_code == 201, fs_res.text
    fs_list = await client.get("/api/v1/fees/structures?institution_id=1&academic_year_id=1", headers=training_headers)
    assert any(r["id"] == fs_res.json()["id"] for r in fs_list.json())

    # Board & Standard in TRAINING
    brd_res = await client.post(
        "/api/v1/boards/",
        json={"institution_id": 1, "name": "Demo Board", "code": "DEMOBRD"},
        headers=training_headers,
    )
    assert brd_res.status_code == 201, brd_res.text
    brd_list = await client.get("/api/v1/boards/?institution_id=1", headers=training_headers)
    assert any(r["id"] == brd_res.json()["id"] for r in brd_list.json())

    # Staff member in TRAINING
    stf_res = await client.post(
        "/api/v1/staff/",
        json={
            "username": "demostaff_parity",
            "email": "demostaff_parity@demo.local",
            "first_name": "Meera",
            "last_name": "StaffDemo",
            "role": "staff",
            "staff_type": "Admin",
        },
        headers=training_headers,
    )
    assert stf_res.status_code == 201, stf_res.text
    stf_list = await client.get("/api/v1/staff/", headers=training_headers)
    assert any(r["username"] == "demostaff_parity" for r in stf_list.json()["items"])
