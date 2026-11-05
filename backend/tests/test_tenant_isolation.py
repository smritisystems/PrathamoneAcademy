# /**
#  * @file        test_tenant_isolation.py
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
#  * @created     2026-11-05
#  * @updated     2026-11-05
#  *
#  * @description Regression test suite proving multi-tenant data isolation, HTTP 403 cross-tenant enforcement,
#  */

import pytest
import uuid
import random
from datetime import date
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.user import User, Role
from app.models.institution import Institution
from app.models.academic_year import AcademicYear
from app.models.student import Student
from app.models.standard import Standard
from app.models.staff import StaffProfile
from app.core.security import create_access_token, get_password_hash


@pytest.fixture
async def institution_a(db: AsyncSession) -> Institution:
    inst = Institution(
        name=f"Academy A {uuid.uuid4().hex[:6]}",
        code=f"INSTA_{uuid.uuid4().hex[:6].upper()}",
        city="Mumbai",
    )
    db.add(inst)
    await db.commit()
    await db.refresh(inst)
    return inst


@pytest.fixture
async def institution_b(db: AsyncSession) -> Institution:
    inst = Institution(
        name=f"Academy B {uuid.uuid4().hex[:6]}",
        code=f"INSTB_{uuid.uuid4().hex[:6].upper()}",
        city="Pune",
    )
    db.add(inst)
    await db.commit()
    await db.refresh(inst)
    return inst


@pytest.fixture
async def admin_a(db: AsyncSession, institution_a: Institution) -> User:
    suffix = random.randint(100000, 999999)
    admin_role = (await db.execute(select(Role).where(Role.name == "admin"))).scalar_one_or_none()
    if not admin_role:
        admin_role = Role(name="admin", description="Administrator")
        db.add(admin_role)
        await db.flush()

    user = User(
        institution_id=institution_a.id,
        username=f"admin_a_{suffix}",
        email=f"admin_a_{suffix}@inst-a.edu.in",
        hashed_password=get_password_hash("AdminPass123!"),
        first_name="Admin",
        last_name="InstA",
        role="admin",
        role_id=admin_role.id,
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@pytest.fixture
def auth_headers_a(admin_a: User):
    token = create_access_token(data={"sub": str(admin_a.id), "role": admin_a.role})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
async def sysadmin_user(db: AsyncSession, institution_a: Institution) -> User:
    suffix = random.randint(100000, 999999)
    sys_role = (await db.execute(select(Role).where(Role.name == "sysadmin"))).scalar_one_or_none()
    if not sys_role:
        sys_role = Role(name="sysadmin", description="System Administrator")
        db.add(sys_role)
        await db.flush()

    user = User(
        institution_id=institution_a.id,
        username=f"sysadmin_{suffix}",
        email=f"sysadmin_{suffix}@prashantacademy.edu.in",
        hashed_password=get_password_hash("SysAdminPass123!"),
        first_name="Super",
        last_name="SysAdmin",
        role="sysadmin",
        role_id=sys_role.id,
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@pytest.fixture
def auth_headers_sysadmin(sysadmin_user: User):
    token = create_access_token(data={"sub": str(sysadmin_user.id), "role": sysadmin_user.role})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
async def student_b(db: AsyncSession, institution_b: Institution) -> Student:
    suffix = random.randint(10000, 99999)
    student = Student(
        institution_id=institution_b.id,
        admission_number=f"PA-2026-B{suffix}",
        first_name="Foreign",
        last_name="StudentB",
        date_of_birth=date(2010, 5, 20),
        gender="female",
        admission_date=date(2026, 4, 1),
        is_active=True,
    )
    db.add(student)
    await db.commit()
    await db.refresh(student)
    return student


@pytest.mark.asyncio
async def test_cross_institution_list_endpoints_return_403(
    client: AsyncClient,
    auth_headers_a: dict,
    institution_b: Institution,
):
    """
    Verifies that a non-sysadmin tenant administrator querying any other institution ID
    via query parameter is strictly rejected with HTTP 403 Forbidden.
    """
    endpoints = [
        f"/api/v1/students/?institution_id={institution_b.id}",
        f"/api/v1/attendance/?institution_id={institution_b.id}",
        f"/api/v1/examinations/?institution_id={institution_b.id}",
        f"/api/v1/academic-years/?institution_id={institution_b.id}",
        f"/api/v1/staff/?institution_id={institution_b.id}",
    ]

    for url in endpoints:
        resp = await client.get(url, headers=auth_headers_a)
        assert resp.status_code == 403, f"Endpoint {url} expected 403 Forbidden, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "Access forbidden" in data.get("detail", "") or "assigned institution" in data.get("detail", "")


@pytest.mark.asyncio
async def test_cross_institution_detail_endpoints_return_403(
    client: AsyncClient,
    auth_headers_a: dict,
    student_b: Student,
):
    """
    Verifies that an administrator belonging to Institution A cannot access or update
    individual student records belonging to Institution B.
    """
    # 1. Fetch individual student
    get_res = await client.get(f"/api/v1/students/{student_b.id}", headers=auth_headers_a)
    assert get_res.status_code == 403, f"Expected 403 Forbidden, got {get_res.status_code}"

    # 2. Update individual student profile
    put_res = await client.put(
        f"/api/v1/students/{student_b.id}/profile",
        json={"first_name": "UnauthorizedHackedName"},
        headers=auth_headers_a,
    )
    assert put_res.status_code == 403, f"Expected 403 Forbidden, got {put_res.status_code}"


@pytest.mark.asyncio
async def test_sysadmin_can_cross_query_institutions(
    client: AsyncClient,
    auth_headers_sysadmin: dict,
    institution_b: Institution,
    student_b: Student,
):
    """
    Verifies that System Administrators have authorized universal superuser access across all tenants.
    """
    resp = await client.get(f"/api/v1/students/?institution_id={institution_b.id}", headers=auth_headers_sysadmin)
    assert resp.status_code == 200
    ids = [s["id"] for s in resp.json().get("data", [])]
    assert student_b.id in ids

    # Detail access
    detail_res = await client.get(f"/api/v1/students/{student_b.id}", headers=auth_headers_sysadmin)
    assert detail_res.status_code == 200
    assert detail_res.json()["id"] == student_b.id


@pytest.mark.asyncio
async def test_student_admission_number_autogeneration(
    client: AsyncClient,
    auth_headers_a: dict,
    institution_a: Institution,
):
    """
    Verifies that when admission_number is omitted from StudentCreate,
    the backend automatically assigns a sequential PA-{YYYY}-{SEQ:06d} admission number.
    """
    payload = {
        "institution_id": institution_a.id,
        "first_name": "Rohan",
        "last_name": "Patil",
        "date_of_birth": "2012-08-14",
        "gender": "male",
        "admission_date": "2026-06-01",
    }
    resp = await client.post("/api/v1/students/", json=payload, headers=auth_headers_a)
    assert resp.status_code == 201, f"Expected 201, got {resp.status_code}: {resp.text}"
    created = resp.json()
    assert "admission_number" in created
    assert created["admission_number"].startswith("PA-2026-")
    assert len(created["admission_number"]) >= 13  # PA-2026-000001


@pytest.mark.asyncio
async def test_staff_creation_temporary_password_and_role_fallback(
    client: AsyncClient,
    auth_headers_a: dict,
    institution_a: Institution,
    db: AsyncSession,
):
    """
    Verifies:
    1. Initial password is not hardcoded; if omitted, a secure temporary password is generated.
    2. Non-standard role types like Counselor/Receptionist safely fall back to the 'staff' role
       with valid role_id populated (preventing NULL role assignments).
    """
    suffix = random.randint(10000, 99999)
    payload = {
        "username": f"counselor_{suffix}",
        "email": f"counselor_{suffix}@inst-a.edu.in",
        "first_name": "Sunita",
        "last_name": "TestCounselor",
        "role": "counselor",  # Non-standard role name
        "staff_type": "Counselor",
        "department": "Student Affairs",
    }
    resp = await client.post("/api/v1/staff/", json=payload, headers=auth_headers_a)
    assert resp.status_code == 201, f"Expected 201, got {resp.status_code}: {resp.text}"
    res_data = resp.json()

    assert res_data.get("temporary_password") is not None
    assert len(res_data["temporary_password"]) >= 10
    assert res_data["temporary_password"] != "Prashant@2026"

    # Verify database state for role_id
    user_row = (await db.execute(select(User).where(User.username == payload["username"]))).scalar_one_or_none()
    assert user_row is not None
    assert user_row.role_id is not None, "Role ID must NOT be NULL"
    assert user_row.role == "staff", "Role should safely fall back to 'staff'"



@pytest.mark.asyncio
async def test_institutions_endpoint_authentication_and_unauthorized_rejection(
    client: AsyncClient,
    auth_headers_a: dict,
    institution_a: Institution,
):
    """
    Regression test ensuring:
    1. Valid authenticated request with Bearer token succeeds with HTTP 200.
    2. Missing credentials returns HTTP 401 Unauthorized.
    3. Invalid / expired token returns HTTP 401 Unauthorized.
    """
    # 1. Valid authentication -> HTTP 200
    res_auth = await client.get("/api/v1/institutions/", headers=auth_headers_a)
    assert res_auth.status_code == 200
    data = res_auth.json()
    assert isinstance(data, list)
    assert any(inst["id"] == institution_a.id for inst in data)

    # 2. Missing credentials -> HTTP 401
    res_no_auth = await client.get("/api/v1/institutions/")
    assert res_no_auth.status_code == 401

    # 3. Invalid credentials -> HTTP 401
    res_bad_auth = await client.get("/api/v1/institutions/", headers={"Authorization": "Bearer invalid.expired.token"})
    assert res_bad_auth.status_code == 401
