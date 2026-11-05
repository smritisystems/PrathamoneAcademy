# /**
#  * @file        test_student_visibility_settings.py
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
#  * @description Test suite validating institute settings for student visibility across dashboard, student lists, batch rosters, reports, and historical data preservation.
#  */

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import date
from decimal import Decimal
import uuid

from app.models.institution import Institution
from app.models.academic_year import AcademicYear
from app.models.board import Board
from app.models.standard import Standard
from app.models.division import Division
from app.models.student import Student
from app.models.enrollment import StudentEnrollment
from app.models.fee import FeeCategory, FeeStructure, StudentFeeAssignment, FeeInvoice
from app.models.payment import Payment, PaymentReceipt


@pytest.fixture
async def setup_visibility_environment(db: AsyncSession, admin_user, test_institution: Institution):
    """
    Creates an academic environment with:
    - 1 Active Student with Fee Invoice and Payment
    - 1 Withdrawn Student with Fee Invoice and Payment
    - 1 Completed Student with Fee Invoice
    """
    admin_user.institution_id = test_institution.id
    await db.commit()

    ay = AcademicYear(
        institution_id=test_institution.id,
        name="AY 2026-27",
        start_date=date(2026, 4, 1),
        end_date=date(2027, 3, 31),
        is_current=True,
    )
    db.add(ay)
    await db.flush()

    board = Board(
        institution_id=test_institution.id,
        name="State Board",
        code="MSBSHSE",
    )
    db.add(board)
    await db.flush()

    standard = Standard(
        institution_id=test_institution.id,
        name="Class 10",
        level=10,
    )
    db.add(standard)
    await db.flush()

    batch = Division(
        standard_id=standard.id,
        board_id=board.id,
        name="Batch Alpha",
        code="ALP-10",
        capacity=40,
        is_active=True,
    )
    db.add(batch)
    await db.flush()

    # Fee Category & Fee Structure
    cat = FeeCategory(institution_id=test_institution.id, name="Tuition Fee")
    db.add(cat)
    await db.flush()

    struct = FeeStructure(
        institution_id=test_institution.id,
        academic_year_id=ay.id,
        standard_id=standard.id,
        category_id=cat.id,
        name="Class 10 Annual Fee",
        amount=Decimal("50000.00"),
        frequency="annual",
    )
    db.add(struct)
    await db.flush()

    # 1. Active Student
    s_active = Student(
        institution_id=test_institution.id,
        admission_number=f"ADM-ACT-{uuid.uuid4().hex[:6]}",
        first_name="Aarav",
        last_name="Active",
        date_of_birth=date(2010, 5, 10),
        gender="Male",
        admission_date=date(2026, 4, 1),
        is_active=True,
    )
    db.add(s_active)
    await db.flush()

    enr_active = StudentEnrollment(
        student_id=s_active.id,
        academic_year_id=ay.id,
        standard_id=standard.id,
        division_id=batch.id,
        roll_number="101",
        enrollment_date=date(2026, 4, 1),
        status="active",
    )
    db.add(enr_active)

    asgn_active = StudentFeeAssignment(
        student_id=s_active.id,
        fee_structure_id=struct.id,
        academic_year_id=ay.id,
    )
    db.add(asgn_active)
    await db.flush()

    inv_active = FeeInvoice(
        student_id=s_active.id,
        assignment_id=asgn_active.id,
        academic_year_id=ay.id,
        invoice_number=f"INV-{uuid.uuid4().hex[:6]}",
        issue_date=date(2026, 4, 5),
        total_amount=Decimal("50000.00"),
        net_amount=Decimal("50000.00"),
        paid_amount=Decimal("25000.00"),
        outstanding_amount=Decimal("25000.00"),
        status="partially_paid",
    )
    db.add(inv_active)

    pay_active = Payment(
        student_id=s_active.id,
        academic_year_id=ay.id,
        amount=Decimal("25000.00"),
        payment_date=date(2026, 4, 10),
        payment_method="UPI",
        status="completed",
    )
    db.add(pay_active)
    await db.flush()

    db.add(PaymentReceipt(
        payment_id=pay_active.id,
        student_id=s_active.id,
        receipt_number=f"RCP-{pay_active.id:06d}",
        amount=pay_active.amount,
        payment_date=pay_active.payment_date,
        payment_method=pay_active.payment_method,
    ))

    # 2. Withdrawn Student
    s_withdrawn = Student(
        institution_id=test_institution.id,
        admission_number=f"ADM-WTH-{uuid.uuid4().hex[:6]}",
        first_name="Rohan",
        last_name="Withdrawn",
        date_of_birth=date(2010, 8, 15),
        gender="Male",
        admission_date=date(2026, 4, 1),
        is_active=False,
        exit_date=date(2026, 6, 30),
        exit_reason="Relocation",
    )
    db.add(s_withdrawn)
    await db.flush()

    enr_withdrawn = StudentEnrollment(
        student_id=s_withdrawn.id,
        academic_year_id=ay.id,
        standard_id=standard.id,
        division_id=batch.id,
        roll_number="102",
        enrollment_date=date(2026, 4, 1),
        status="withdrawn",
        exit_date=date(2026, 6, 30),
        exit_reason="Relocation",
    )
    db.add(enr_withdrawn)

    asgn_withdrawn = StudentFeeAssignment(
        student_id=s_withdrawn.id,
        fee_structure_id=struct.id,
        academic_year_id=ay.id,
    )
    db.add(asgn_withdrawn)
    await db.flush()

    inv_withdrawn = FeeInvoice(
        student_id=s_withdrawn.id,
        assignment_id=asgn_withdrawn.id,
        academic_year_id=ay.id,
        invoice_number=f"INV-{uuid.uuid4().hex[:6]}",
        issue_date=date(2026, 4, 5),
        total_amount=Decimal("50000.00"),
        net_amount=Decimal("50000.00"),
        paid_amount=Decimal("15000.00"),
        outstanding_amount=Decimal("35000.00"),
        status="partially_paid",
    )
    db.add(inv_withdrawn)

    pay_withdrawn = Payment(
        student_id=s_withdrawn.id,
        academic_year_id=ay.id,
        amount=Decimal("15000.00"),
        payment_date=date(2026, 4, 12),
        payment_method="Bank Transfer",
        status="completed",
    )
    db.add(pay_withdrawn)
    await db.flush()

    db.add(PaymentReceipt(
        payment_id=pay_withdrawn.id,
        student_id=s_withdrawn.id,
        receipt_number=f"RCP-{pay_withdrawn.id:06d}",
        amount=pay_withdrawn.amount,
        payment_date=pay_withdrawn.payment_date,
        payment_method=pay_withdrawn.payment_method,
    ))

    # 3. Completed Student
    s_completed = Student(
        institution_id=test_institution.id,
        admission_number=f"ADM-CMP-{uuid.uuid4().hex[:6]}",
        first_name="Ananya",
        last_name="Completed",
        date_of_birth=date(2010, 3, 20),
        gender="Female",
        admission_date=date(2026, 4, 1),
        is_active=False,
    )
    db.add(s_completed)
    await db.flush()

    enr_completed = StudentEnrollment(
        student_id=s_completed.id,
        academic_year_id=ay.id,
        standard_id=standard.id,
        division_id=batch.id,
        roll_number="103",
        enrollment_date=date(2026, 4, 1),
        status="completed",
    )
    db.add(enr_completed)

    await db.commit()
    return {
        "institution": test_institution,
        "academic_year": ay,
        "board": board,
        "standard": standard,
        "batch": batch,
        "s_active": s_active,
        "s_withdrawn": s_withdrawn,
        "s_completed": s_completed,
    }


@pytest.mark.asyncio
async def test_student_visibility_settings_defaults_and_persistence(
    client: AsyncClient,
    auth_headers: dict,
    setup_visibility_environment: dict,
):
    """
    Requirement 1:
    - Verify defaults:
      * Dashboard: active_only (default)
      * Reports: include_all (default)
      * Student Lists: active_only (default)
    - Persist settings via PUT /settings/batch
    - Verify updated settings loaded via GET /settings/all
    """
    # 1. Fetch initial settings
    res = await client.get("/api/v1/settings/all", headers=auth_headers)
    assert res.status_code == 200
    settings = res.json()
    assert "admission" in settings
    adm = settings["admission"]
    assert adm["student_visibility_dashboard"] == "active_only"
    assert adm["student_visibility_reports"] == "include_all"
    assert adm["student_visibility_lists"] == "active_only"

    # 2. Persist custom visibility configuration
    update_payload = {
        "category": "admission",
        "settings": {
            "student_visibility_dashboard": "include_all",
            "student_visibility_reports": "active_only",
            "student_visibility_lists": "include_all",
        },
        "reason": "Test visibility configuration persistence",
    }
    put_res = await client.put("/api/v1/settings/batch", headers=auth_headers, json=update_payload)
    assert put_res.status_code == 200
    assert put_res.json()["status"] == "success"

    # 3. Reload settings
    reload_res = await client.get("/api/v1/settings/all", headers=auth_headers)
    assert reload_res.status_code == 200
    updated_adm = reload_res.json()["admission"]
    assert updated_adm["student_visibility_dashboard"] == "include_all"
    assert updated_adm["student_visibility_reports"] == "active_only"
    assert updated_adm["student_visibility_lists"] == "include_all"


@pytest.mark.asyncio
async def test_dashboard_stats_visibility_and_status_overrides(
    client: AsyncClient,
    auth_headers: dict,
    setup_visibility_environment: dict,
):
    """
    Requirement 2: Dashboard student counts & widgets
    - Default: active students only (1 student)
    - Override with status=all: includes all student statuses (3 students)
    - Override with status=withdrawn: only withdrawn (1 student)
    - Override with status=active: only active (1 student)
    """
    env = setup_visibility_environment
    ay_id = env["academic_year"].id
    inst_id = env["institution"].id

    # 1. Default (Active only)
    res_default = await client.get(
        f"/api/v1/dashboard/stats?academic_year_id={ay_id}&institution_id={inst_id}",
        headers=auth_headers,
    )
    assert res_default.status_code == 200
    data_default = res_default.json()
    assert data_default["total_students"] == 1
    assert data_default["status_filter"] == "active"

    # 2. Explicit Override: status=all
    res_all = await client.get(
        f"/api/v1/dashboard/stats?academic_year_id={ay_id}&institution_id={inst_id}&status=all",
        headers=auth_headers,
    )
    assert res_all.status_code == 200
    data_all = res_all.json()
    assert data_all["total_students"] == 3
    assert data_all["status_filter"] == "all"

    # 3. Explicit Override: status=withdrawn
    res_withdrawn = await client.get(
        f"/api/v1/dashboard/stats?academic_year_id={ay_id}&institution_id={inst_id}&status=withdrawn",
        headers=auth_headers,
    )
    assert res_withdrawn.status_code == 200
    data_withdrawn = res_withdrawn.json()
    assert data_withdrawn["total_students"] == 1
    assert data_withdrawn["status_filter"] == "withdrawn"


@pytest.mark.asyncio
async def test_student_lists_visibility_and_status_overrides(
    client: AsyncClient,
    auth_headers: dict,
    setup_visibility_environment: dict,
):
    """
    Requirement 2: Student lists, search results, and rosters
    - Default: active students only
    - Override with include_inactive=true / status=all
    - Override with status=withdrawn / status=completed
    """
    env = setup_visibility_environment
    inst_id = env["institution"].id

    # 1. Default list -> active only
    res_def = await client.get(f"/api/v1/students/?institution_id={inst_id}", headers=auth_headers)
    assert res_def.status_code == 200
    data_def = res_def.json()
    assert data_def["total"] == 1
    assert data_def["data"][0]["first_name"] == "Aarav"

    # 2. include_inactive=true -> all 3 students
    res_all = await client.get(
        f"/api/v1/students/?institution_id={inst_id}&include_inactive=true",
        headers=auth_headers,
    )
    assert res_all.status_code == 200
    data_all = res_all.json()
    assert data_all["total"] == 3

    # 3. status=withdrawn -> only Rohan
    res_wth = await client.get(
        f"/api/v1/students/?institution_id={inst_id}&status=withdrawn",
        headers=auth_headers,
    )
    assert res_wth.status_code == 200
    data_wth = res_wth.json()
    assert data_wth["total"] == 1
    assert data_wth["data"][0]["first_name"] == "Rohan"

    # 4. status=completed -> only Ananya
    res_cmp = await client.get(
        f"/api/v1/students/?institution_id={inst_id}&status=completed",
        headers=auth_headers,
    )
    assert res_cmp.status_code == 200
    data_cmp = res_cmp.json()
    assert data_cmp["total"] == 1
    assert data_cmp["data"][0]["first_name"] == "Ananya"


@pytest.mark.asyncio
async def test_batch_roster_visibility_and_overrides(
    client: AsyncClient,
    auth_headers: dict,
    setup_visibility_environment: dict,
):
    """
    Requirement 2: Batch roster filtering
    - Default: active students only in batch roster
    - Override with status=all: returns all students
    - Override with status=withdrawn: returns withdrawn
    """
    env = setup_visibility_environment
    batch_id = env["batch"].id

    # 1. Default roster -> active only
    res_roster = await client.get(f"/api/v1/divisions/{batch_id}/roster", headers=auth_headers)
    assert res_roster.status_code == 200
    roster_def = res_roster.json()
    assert len(roster_def["students"]) == 1
    assert roster_def["students"][0]["first_name"] == "Aarav"

    # 2. status=all -> all students
    res_roster_all = await client.get(
        f"/api/v1/divisions/{batch_id}/roster?status=all", headers=auth_headers
    )
    assert res_roster_all.status_code == 200
    roster_all = res_roster_all.json()
    assert len(roster_all["students"]) == 3

    # 3. status=withdrawn -> withdrawn only
    res_roster_wth = await client.get(
        f"/api/v1/divisions/{batch_id}/roster?status=withdrawn", headers=auth_headers
    )
    assert res_roster_wth.status_code == 200
    roster_wth = res_roster_wth.json()
    assert len(roster_wth["students"]) == 1
    assert roster_wth["students"][0]["first_name"] == "Rohan"


@pytest.mark.asyncio
async def test_reports_visibility_and_export_filtering(
    client: AsyncClient,
    auth_headers: dict,
    setup_visibility_environment: dict,
):
    """
    Requirement 2 & 3: Reports & exports
    - Reports default to include all student statuses (both active and withdrawn with fee invoices)
    - Overriding with status=active filters to active student invoices only
    - CSV export honors status=active filter
    """
    env = setup_visibility_environment
    ay_id = env["academic_year"].id
    inst_id = env["institution"].id

    # 1. Default Fee Collection -> includes both active and withdrawn invoices (2 records)
    res_rep = await client.get(
        f"/api/v1/reports/fee-collection?academic_year_id={ay_id}&institution_id={inst_id}",
        headers=auth_headers,
    )
    assert res_rep.status_code == 200
    rep_data = res_rep.json()
    assert len(rep_data) == 2

    # 2. Override status=active -> only Aarav (1 record)
    res_rep_act = await client.get(
        f"/api/v1/reports/fee-collection?academic_year_id={ay_id}&institution_id={inst_id}&status=active",
        headers=auth_headers,
    )
    assert res_rep_act.status_code == 200
    rep_act = res_rep_act.json()
    assert len(rep_act) == 1
    assert "Aarav" in rep_act[0]["student_name"]

    # 3. Export CSV with status=active
    res_exp = await client.get(
        f"/api/v1/reports/fee-collection/export?format=csv&academic_year_id={ay_id}&institution_id={inst_id}&status=active",
        headers=auth_headers,
    )
    assert res_exp.status_code == 200
    csv_text = res_exp.text
    assert "Aarav Active" in csv_text
    assert "Rohan Withdrawn" not in csv_text


@pytest.mark.asyncio
async def test_historical_records_preservation(
    client: AsyncClient,
    auth_headers: dict,
    setup_visibility_environment: dict,
):
    """
    Requirement 3: Preserve historical records
    - Ensure historical payments, receipts, and invoices for withdrawn/inactive students remain 100% accessible.
    - Never delete or corrupt historical financial records.
    """
    env = setup_visibility_environment
    wth_id = env["s_withdrawn"].id

    # Direct student profile access
    res_stu = await client.get(f"/api/v1/students/{wth_id}", headers=auth_headers)
    assert res_stu.status_code == 200
    stu_data = res_stu.json()
    assert stu_data["first_name"] == "Rohan"
    assert stu_data["is_active"] is False

    assert stu_data["fee_summary"]["total_fees"] == 50000.0
    assert stu_data["fee_summary"]["total_paid"] == 15000.0
    assert stu_data["fee_summary"]["outstanding"] == 35000.0

    # Historical payments must exist and match authoritative amounts via /api/v1/payments
    res_pay = await client.get(f"/api/v1/payments/?student_id={wth_id}", headers=auth_headers)
    assert res_pay.status_code == 200
    payments = res_pay.json()
    assert len(payments) >= 1
    assert float(payments[0]["amount"]) == 15000.0

    # Historical invoices must exist and remain accessible via /api/v1/fees/invoices
    res_inv = await client.get(f"/api/v1/fees/invoices?student_id={wth_id}", headers=auth_headers)
    assert res_inv.status_code == 200
    invoices = res_inv.json()
    assert len(invoices) >= 1
    assert float(invoices[0]["net_amount"]) == 50000.0
    assert float(invoices[0]["paid_amount"]) == 15000.0








