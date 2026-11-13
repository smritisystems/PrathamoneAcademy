# /**
#  * @file        test_student_lifecycle.py
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
#  * @updated     2026-11-14
#  *
#  * @description Comprehensive test suite verifying student exit workflows, reactivation, refunds, and withdrawal analytics.
#  */

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import date
from decimal import Decimal
import random

from app.models.institution import Institution
from app.models.academic_year import AcademicYear
from app.models.standard import Standard
from app.models.division import Division
from app.models.board import Board
from app.models.student import Student, StudentLifecycleLog
from app.models.enrollment import StudentEnrollment
from app.models.fee import FeeCategory, FeeStructure, FeeInvoice, FeeInstallment, StudentFeeAssignment
from app.models.payment import Payment, Refund
from app.models.user import User, Role
from app.core.security import create_access_token, get_password_hash


@pytest.fixture
async def setup_lifecycle_data(db: AsyncSession):
    suffix = random.randint(10000, 99999)
    # Institution
    inst = Institution(
        name=f"Lifecycle Institute {suffix}",
        code=f"LC{suffix}",
        is_active=True,
    )
    db.add(inst)
    await db.flush()

    # Academic Year
    ay = AcademicYear(
        institution_id=inst.id,
        name=f"2026-27-{suffix}",
        start_date=date(2026, 4, 1),
        end_date=date(2027, 3, 31),
        is_current=True,
    )
    db.add(ay)

    # Board, Standard & Division
    board = Board(
        institution_id=inst.id,
        name="State Board",
        code=f"SB{suffix}",
    )
    db.add(board)
    await db.flush()

    standard = Standard(
        institution_id=inst.id,
        name="Standard 10",
        level=10,
    )
    db.add(standard)
    await db.flush()

    division = Division(
        standard_id=standard.id,
        board_id=board.id,
        name="Batch Alpha",
        code=f"BA{suffix}",
        capacity=30,
    )
    db.add(division)
    await db.flush()

    # Admin User
    admin_role = (await db.execute(select(Role).where(Role.name == "admin"))).scalar_one_or_none()
    if not admin_role:
        admin_role = Role(name="admin", description="Admin Role")
        db.add(admin_role)
        await db.flush()

    admin = User(
        institution_id=inst.id,
        username=f"admin_lc_{suffix}",
        email=f"admin_lc_{suffix}@test.com",
        hashed_password=get_password_hash("AdminPass123!"),
        first_name="Admin",
        last_name="Officer",
        role="admin",
        role_id=admin_role.id,
        is_active=True,
    )
    db.add(admin)
    await db.flush()

    # Active Student 1 (Will be exited with payments and refund)
    student1 = Student(
        institution_id=inst.id,
        admission_number=f"ADM-LC1-{suffix}",
        first_name="Rahul",
        last_name="Sharma",
        date_of_birth=date(2008, 5, 15),
        gender="male",
        admission_date=date(2026, 4, 10),
        is_active=True,
    )
    db.add(student1)
    await db.flush()

    enr1 = StudentEnrollment(
        student_id=student1.id,
        academic_year_id=ay.id,
        standard_id=standard.id,
        division_id=division.id,
        roll_number=f"101-{suffix}",
        enrollment_date=date(2026, 4, 10),
        status="active",
    )
    db.add(enr1)
    await db.flush()

    # Fee Category & Structure
    cat = FeeCategory(institution_id=inst.id, name="Tuition Fees")
    db.add(cat)
    await db.flush()

    fee_struct = FeeStructure(
        institution_id=inst.id,
        academic_year_id=ay.id,
        standard_id=standard.id,
        category_id=cat.id,
        name="Standard 10 Annual Tuition",
        amount=Decimal("40000.00"),
        frequency="annual",
    )
    db.add(fee_struct)
    await db.flush()

    assignment1 = StudentFeeAssignment(
        student_id=student1.id,
        fee_structure_id=fee_struct.id,
        academic_year_id=ay.id,
    )
    db.add(assignment1)
    await db.flush()

    # Fee Invoice for Student 1
    invoice1 = FeeInvoice(
        invoice_number=f"INV-LC1-{suffix}",
        student_id=student1.id,
        assignment_id=assignment1.id,
        academic_year_id=ay.id,
        total_amount=Decimal("40000.00"),
        net_amount=Decimal("40000.00"),
        paid_amount=Decimal("20000.00"),
        outstanding_amount=Decimal("20000.00"),
        status="partial",
        issue_date=date(2026, 4, 10),
    )
    db.add(invoice1)
    await db.flush()

    inst1 = FeeInstallment(
        invoice_id=invoice1.id,
        fee_structure_id=fee_struct.id,
        description="Installment 1",
        installment_number=1,
        amount=Decimal("20000.00"),
        paid_amount=Decimal("20000.00"),
        due_date=date(2026, 5, 1),
        status="paid",
    )
    inst2 = FeeInstallment(
        invoice_id=invoice1.id,
        fee_structure_id=fee_struct.id,
        description="Installment 2",
        installment_number=2,
        amount=Decimal("20000.00"),
        paid_amount=Decimal("0.00"),
        due_date=date(2026, 9, 1),
        status="unpaid",
    )
    db.add_all([inst1, inst2])

    # Payment for Student 1
    pmt1 = Payment(
        student_id=student1.id,
        academic_year_id=ay.id,
        amount=Decimal("20000.00"),
        payment_date=date(2026, 5, 2),
        payment_method="upi",
        status="completed",
    )
    db.add(pmt1)

    # Student 2 (Unpaid student who will exit)
    student2 = Student(
        institution_id=inst.id,
        admission_number=f"ADM-LC2-{suffix}",
        first_name="Pooja",
        last_name="Verma",
        date_of_birth=date(2008, 8, 20),
        gender="female",
        admission_date=date(2026, 4, 15),
        is_active=True,
    )
    db.add(student2)
    await db.flush()

    enr2 = StudentEnrollment(
        student_id=student2.id,
        academic_year_id=ay.id,
        standard_id=standard.id,
        division_id=division.id,
        roll_number=f"102-{suffix}",
        enrollment_date=date(2026, 4, 15),
        status="active",
    )
    db.add(enr2)

    await db.commit()

    return {
        "institution": inst,
        "academic_year": ay,
        "standard": standard,
        "division": division,
        "admin": admin,
        "student1": student1,
        "enrollment1": enr1,
        "student2": student2,
        "enrollment2": enr2,
        "payment1": pmt1,
        "invoice1": invoice1,
    }


@pytest.mark.asyncio
async def test_student_exit_and_lifecycle_history(client: AsyncClient, setup_lifecycle_data, db: AsyncSession):
    data = setup_lifecycle_data
    admin = data["admin"]
    student1 = data["student1"]
    enr1 = data["enrollment1"]

    token = create_access_token({"sub": str(admin.id), "institution_id": data["institution"].id})
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Exit Student 1 with refund
    exit_payload = {
        "enrollment_id": enr1.id,
        "status": "withdrawn",
        "exit_date": str(date(2026, 6, 15)),
        "reason": "Relocation to another city",
        "notes": "Family moved to Pune. Partial tuition refund approved.",
        "refund_amount": "5000.00",
        "refund_method": "bank_transfer",
        "refund_reference": "NEFT12345678",
        "refund_reason": "Relocation pro-rata refund",
    }

    res = await client.post(f"/api/v1/students/{student1.id}/exit", json=exit_payload, headers=headers)
    assert res.status_code == 200, res.text
    res_data = res.json()
    assert res_data["success"] is True
    assert res_data["is_active"] is False
    assert res_data["exit_reason"] == "Relocation to another city"
    assert res_data["refund_id"] is not None

    # Verify database state
    await db.refresh(student1)
    await db.refresh(enr1)
    assert student1.is_active is False
    assert student1.exit_date == date(2026, 6, 15)
    assert enr1.status == "withdrawn"
    assert enr1.exit_reason == "Relocation to another city"

    # Verify Refund record
    refund = (await db.execute(select(Refund).where(Refund.id == res_data["refund_id"]))).scalar_one()
    assert refund.amount == Decimal("5000.00")
    assert refund.student_id == student1.id
    assert refund.status == "completed"

    # Verify Lifecycle History
    hist_res = await client.get(f"/api/v1/students/{student1.id}/lifecycle-history", headers=headers)
    assert hist_res.status_code == 200
    hist_data = hist_res.json()
    assert hist_data["is_active"] is False
    assert len(hist_data["lifecycle_logs"]) >= 1
    assert hist_data["lifecycle_logs"][0]["action"] == "withdrawn"
    assert len(hist_data["refunds"]) == 1


@pytest.mark.asyncio
async def test_student_reactivation_workflow(client: AsyncClient, setup_lifecycle_data, db: AsyncSession):
    data = setup_lifecycle_data
    admin = data["admin"]
    student1 = data["student1"]
    ay = data["academic_year"]
    standard = data["standard"]
    division = data["division"]

    token = create_access_token({"sub": str(admin.id), "institution_id": data["institution"].id})
    headers = {"Authorization": f"Bearer {token}"}

    # Exit student first so they are withdrawn
    exit_payload = {
        "status": "withdrawn",
        "exit_date": str(date(2026, 6, 20)),
        "reason": "Temporary relocation",
    }
    exit_res = await client.post(f"/api/v1/students/{student1.id}/exit", json=exit_payload, headers=headers)
    assert exit_res.status_code == 200

    # Reactivate student
    reactivate_payload = {
        "academic_year_id": ay.id,
        "standard_id": standard.id,
        "division_id": division.id,
        "effective_date": str(date(2026, 7, 1)),
        "reason": "Family returned to city, re-admitted",
        "notes": "Approved by principal",
    }

    res = await client.post(f"/api/v1/students/{student1.id}/reactivate", json=reactivate_payload, headers=headers)
    assert res.status_code == 200, res.text
    res_data = res.json()
    assert res_data["success"] is True
    assert res_data["is_active"] is True
    assert res_data["enrollment_id"] is not None

    # Verify student is now active in DB
    await db.refresh(student1)
    assert student1.is_active is True
    assert student1.exit_date is None

    # Attempting to reactivate an already active student should fail with 400
    fail_res = await client.post(f"/api/v1/students/{student1.id}/reactivate", json=reactivate_payload, headers=headers)
    assert fail_res.status_code == 400
    assert "already active" in fail_res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_student_directory_inactive_filtering(client: AsyncClient, setup_lifecycle_data, db: AsyncSession):
    data = setup_lifecycle_data
    admin = data["admin"]
    student2 = data["student2"]
    inst = data["institution"]

    token = create_access_token({"sub": str(admin.id), "institution_id": inst.id})
    headers = {"Authorization": f"Bearer {token}"}

    # Exit student 2 (Unpaid)
    exit_payload = {
        "status": "withdrawn",
        "exit_date": str(date(2026, 5, 20)),
        "reason": "Financial difficulties",
        "notes": "Cannot afford current academic fees",
    }
    await client.post(f"/api/v1/students/{student2.id}/exit", json=exit_payload, headers=headers)

    # 1. Default request (include_inactive=False): should not include student 2
    res_default = await client.get("/api/v1/students/", headers=headers)
    assert res_default.status_code == 200
    ids_default = [s["id"] for s in res_default.json()["data"]]
    assert student2.id not in ids_default

    # 2. include_inactive=True: should include student 2
    res_inactive = await client.get("/api/v1/students/?include_inactive=true", headers=headers)
    assert res_inactive.status_code == 200
    ids_inactive = [s["id"] for s in res_inactive.json()["data"]]
    assert student2.id in ids_inactive

    # 3. status=withdrawn: should return only withdrawn students
    res_withdrawn = await client.get("/api/v1/students/?status=withdrawn", headers=headers)
    assert res_withdrawn.status_code == 200
    withdrawn_list = res_withdrawn.json()["data"]
    assert any(s["id"] == student2.id for s in withdrawn_list)
    assert all(s["is_active"] is False for s in withdrawn_list)


@pytest.mark.asyncio
async def test_withdrawal_and_analytics_reports(client: AsyncClient, setup_lifecycle_data, db: AsyncSession):
    data = setup_lifecycle_data
    admin = data["admin"]
    inst = data["institution"]
    ay = data["academic_year"]
    data["student2"].is_active = False
    data["student2"].exit_date = date.today()
    data["student2"].exit_reason = "Financial difficulties"
    data["enrollment2"].status = "withdrawn"
    data["enrollment2"].exit_date = date.today()
    await db.commit()

    token = create_access_token({"sub": str(admin.id), "institution_id": inst.id})
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Test detailed withdrawals report
    rep_res = await client.get(f"/api/v1/reports/withdrawals?academic_year_id={ay.id}", headers=headers)
    assert rep_res.status_code == 200, rep_res.text
    rep_data = rep_res.json()
    assert isinstance(rep_data, list)
    withdrawn_report = next(item for item in rep_data if item["student_id"] == data["student2"].id)
    assert withdrawn_report["paid_classification"] == "Unpaid"
    assert withdrawn_report["installment_at_exit"] == "No invoice due by exit"

    # 2. Test Analytics aggregation endpoint
    analytics_res = await client.get(f"/api/v1/reports/withdrawal-analytics?academic_year_id={ay.id}", headers=headers)
    assert analytics_res.status_code == 200, analytics_res.text
    analytics = analytics_res.json()

    assert "summary" in analytics
    assert "by_reason" in analytics
    assert "by_class_batch" in analytics
    assert "by_installment" in analytics
    assert "trends_monthly" in analytics

    summary = analytics["summary"]
    assert summary["total_enrolled"] >= 2
    assert summary["total_withdrawn"] == 1
    assert summary["total_gross_paid"] == 0
    assert summary["total_refunds"] == 0
    assert summary["total_net_retained"] == 0
    assert summary["attrition_rate"] >= 0.0

    # 3. Test CSV export endpoint
    export_res = await client.get(f"/api/v1/reports/withdrawals/export?academic_year_id={ay.id}", headers=headers)
    assert export_res.status_code == 200
    assert "text/csv" in export_res.headers["content-type"]
    assert "admission_number" in export_res.text


@pytest.mark.asyncio
async def test_cross_institution_isolation(client: AsyncClient, setup_lifecycle_data, db: AsyncSession):
    data = setup_lifecycle_data
    student1 = data["student1"]

    # Create another institution and another admin
    other_inst = Institution(name="Alien Institute", code="ALIEN01", is_active=True)
    db.add(other_inst)
    await db.flush()

    other_admin = User(
        institution_id=other_inst.id,
        username="alien_admin",
        email="alien@test.com",
        hashed_password=get_password_hash("Pass123!"),
        first_name="Alien",
        last_name="User",
        role="admin",
        is_active=True,
    )
    db.add(other_admin)
    await db.commit()

    token = create_access_token({"sub": str(other_admin.id), "institution_id": other_inst.id})
    headers = {"Authorization": f"Bearer {token}"}

    # Attempt to exit student1 belonging to the first institution -> should return 403 Forbidden
    res = await client.post(
        f"/api/v1/students/{student1.id}/exit",
        json={"status": "withdrawn", "reason": "Attempted Hack"},
        headers=headers,
    )
    assert res.status_code == 403
