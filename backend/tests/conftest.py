# /**
#  * @file        conftest.py
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
#  * @created     2026-11-03
#  * @updated     2026-11-06
#  *
#  * @description Pytest configuration fixtures providing test database session, test client, and auth helpers.
#  */

import pytest
import asyncio
from decimal import Decimal
from datetime import date
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from app.main import app
from app.core.database import Base, get_db
from app.core.security import get_password_hash
from app.models.user import User
from app.models.institution import Institution
from app.models.academic_year import AcademicYear
from app.models.student import Student
from app.models.fee import (
    FeeCategory,
    FeeStructure,
    StudentFeeAssignment,
    FeeInvoice,
    FeeInvoiceItem,
    FeeInstallment,
)

import os
from app.core.limiter import limiter

from sqlalchemy.pool import NullPool

# Disable rate limits during test execution
limiter.enabled = False

db_url = os.getenv("DATABASE_URL", "")
default_test_host = "db" if "@db:" in db_url else "localhost"
TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL",
    f"postgresql+asyncpg://postgres:postgres@{default_test_host}:5432/prashant_academy_test"
)

test_engine = create_async_engine(TEST_DATABASE_URL, echo=False, poolclass=NullPool)
TestSessionLocal = async_sessionmaker(
    test_engine, expire_on_commit=False, class_=AsyncSession
)


@pytest.fixture(scope="session")
def event_loop():
    policy = asyncio.get_event_loop_policy()
    loop = policy.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session", autouse=True)
async def db_setup():
    from sqlalchemy.sql import text
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

        # Seed standard roles in test database
        await conn.execute(text("""
            INSERT INTO roles (name, description, created_at) VALUES
            ('superadmin', 'Super Administrator', NOW()),
            ('admin', 'Administrator', NOW()),
            ('principal', 'Principal', NOW()),
            ('accountant', 'Accountant', NOW()),
            ('teacher', 'Teacher', NOW()),
            ('staff', 'Staff Member', NOW()),
            ('student', 'Student Account', NOW()),
            ('sysadmin', 'System Administrator', NOW());
        """))

        # Seed standard permissions in test database
        role_rows = (await conn.execute(text("SELECT id, name FROM roles;"))).fetchall()
        role_map = {r[1]: r[0] for r in role_rows}

        perms_to_seed = [
            ("sysadmin", "*", "*"),
            ("sysadmin", "fees", "view"),
            ("sysadmin", "payments", "view"),
            ("sysadmin", "payments", "draft"),
            ("sysadmin", "payments", "edit_submitted"),
            ("sysadmin", "fee_workflow", "configure"),
            ("sysadmin", "payments", "refund_process"),
            ("sysadmin", "payments", "refund_approve"),
            ("sysadmin", "payments", "view_audit"),

            ("admin", "fees", "view"),
            ("admin", "payments", "view"),
            ("admin", "payments", "draft"),
            ("admin", "payments", "edit_submitted"),
            ("admin", "payments", "edit_posted"),
            ("admin", "fee_workflow", "configure"),
            ("admin", "payments", "refund_process"),
            ("admin", "payments", "refund_approve"),
            ("admin", "payments", "view_audit"),

            ("accountant", "fees", "view"),
            ("accountant", "payments", "view"),
            ("accountant", "payments", "draft"),
            ("accountant", "payments", "edit_submitted"),
            ("accountant", "payments", "refund_process"),
            ("accountant", "payments", "view_audit"),
        ]

        for rname, res, act in perms_to_seed:
            rid = role_map.get(rname)
            if rid:
                await conn.execute(text("""
                    INSERT INTO permissions (role_id, resource, action, created_at)
                    VALUES (:rid, :res, :act, NOW());
                """), {"rid": rid, "res": res, "act": act})

    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture
async def db():
    async with TestSessionLocal() as session:
        try:
            yield session
        finally:
            await session.rollback()
            await session.close()


@pytest.fixture
async def client(db):
    async def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.fixture
async def admin_user(db):
    import random
    from sqlalchemy import select
    from app.models.user import Role
    suffix = random.randint(100000, 999999)
    username = f"admin_{suffix}"
    role_res = await db.execute(select(Role).where(Role.name == "admin"))
    admin_role = role_res.scalar_one_or_none()
    role_id = admin_role.id if admin_role else None

    user = User(
        username=username,
        email=f"admin_{suffix}@test.com",
        hashed_password=get_password_hash("testpassword"),
        first_name="Test",
        last_name="Admin",
        role="admin",
        role_id=role_id,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@pytest.fixture
async def auth_headers(client, admin_user):
    response = await client.post(
        "/api/v1/auth/login",
        data={"username": admin_user.username, "password": "testpassword"},
    )
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
async def test_institution(db):
    import uuid
    code = f"TA{uuid.uuid4().hex[:8]}"
    institution = Institution(
        name="Test Academy", code=code, city="Test City"
    )
    db.add(institution)
    await db.commit()
    await db.refresh(institution)
    return institution


@pytest.fixture
async def test_academic_year(db, test_institution):
    year = AcademicYear(
        institution_id=test_institution.id,
        name="2024-25",
        start_date=date(2024, 6, 1),
        end_date=date(2025, 3, 31),
        is_current=True,
    )
    db.add(year)
    await db.commit()
    await db.refresh(year)
    return year


@pytest.fixture
async def test_student(db, test_institution):
    import uuid
    suffix = uuid.uuid4().hex[:8]
    student = Student(
        institution_id=test_institution.id,
        admission_number=f"TEST{suffix}",
        first_name="Test",
        last_name="Student",
        date_of_birth=date(2014, 1, 1),
        gender="male",
        admission_date=date(2024, 6, 1),
    )
    db.add(student)
    await db.commit()
    await db.refresh(student)
    return student


@pytest.fixture
async def test_fee_invoice(db, test_student, test_institution, test_academic_year, admin_user):
    """Setup: ₹24,000 invoice with 1 installment"""
    import uuid
    suffix = uuid.uuid4().hex[:8]

    category = FeeCategory(institution_id=test_institution.id, name=f"Tuition-{suffix}")
    db.add(category)
    await db.flush()

    structure = FeeStructure(
        institution_id=test_institution.id,
        academic_year_id=test_academic_year.id,
        category_id=category.id,
        name=f"Annual Tuition-{suffix}",
        amount=Decimal("24000.00"),
        frequency="annual",
    )
    db.add(structure)
    await db.flush()

    assignment = StudentFeeAssignment(
        student_id=test_student.id,
        fee_structure_id=structure.id,
        academic_year_id=test_academic_year.id,
        concession_amount=Decimal("0"),
    )
    db.add(assignment)
    await db.flush()

    invoice = FeeInvoice(
        invoice_number=f"TEST-INV-{suffix}",
        student_id=test_student.id,
        assignment_id=assignment.id,
        academic_year_id=test_academic_year.id,
        total_amount=Decimal("24000.00"),
        discount_amount=Decimal("0"),
        net_amount=Decimal("24000.00"),
        paid_amount=Decimal("0"),
        outstanding_amount=Decimal("24000.00"),
        issue_date=date(2024, 6, 1),
        due_date=date(2025, 3, 31),
        status="unpaid",
    )
    db.add(invoice)
    await db.flush()

    item = FeeInvoiceItem(
        invoice_id=invoice.id,
        fee_structure_id=structure.id,
        description="Annual Tuition Fee",
        amount=Decimal("24000.00"),
        discount_amount=Decimal("0"),
        net_amount=Decimal("24000.00"),
    )
    db.add(item)

    installment = FeeInstallment(
        invoice_id=invoice.id,
        installment_number=1,
        description="Full Payment",
        amount=Decimal("24000.00"),
        paid_amount=Decimal("0"),
        due_date=date(2025, 3, 31),
        status="unpaid",
    )
    db.add(installment)
    await db.commit()
    await db.refresh(invoice)
    await db.refresh(installment)

    return {
        "invoice": invoice,
        "installment": installment,
        "student": test_student,
        "academic_year": test_academic_year,
    }

