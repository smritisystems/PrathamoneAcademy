# /**
#  * @file        test_student_outstanding_governance.py
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
#  * @created     2026-11-09
#  * @updated     2026-11-09
#  *
#  * @description Test suite verifying student receivables governance, active vs former student balance segregation, transfer continuity, debt retention on student exit, and dashboard reconciliation.
#  */

import pytest
import uuid
from decimal import Decimal
from datetime import date
from sqlalchemy import select
from app.models.student import Student
from app.models.enrollment import StudentEnrollment
from app.models.fee import (
    FeeCategory,
    FeeStructure,
    StudentFeeAssignment,
    FeeInvoice,
    FeeInvoiceItem,
)
from app.models.standard import Standard
from app.models.division import Division


@pytest.fixture
async def setup_receivables_environment(
    db, test_institution, test_academic_year, admin_user
):
    """
    Sets up an environment with:
    - 1 Active Student with an unpaid fee invoice of INR 24,000.
    - 1 Former Student (exited/discontinued) with an unpaid fee invoice of INR 35,000.
    """
    suffix = uuid.uuid4().hex[:8]

    # 1. Academic Standard & Division
    std = Standard(institution_id=test_institution.id, name=f"Class 10-{suffix}", level=10)
    db.add(std)
    await db.flush()

    div = Division(standard_id=std.id, name=f"Batch A-{suffix}")
    db.add(div)
    await db.flush()

    # 2. Fee Structure
    cat = FeeCategory(institution_id=test_institution.id, name=f"Tuition-{suffix}")
    db.add(cat)
    await db.flush()

    struct = FeeStructure(
        institution_id=test_institution.id,
        academic_year_id=test_academic_year.id,
        category_id=cat.id,
        name=f"Standard Fee-{suffix}",
        amount=Decimal("50000.00"),
        frequency="annual",
    )
    db.add(struct)
    await db.flush()

    # 3. Active Student
    active_student = Student(
        institution_id=test_institution.id,
        admission_number=f"ACT-{suffix}",
        first_name="Active",
        last_name="Scholar",
        date_of_birth=date(2010, 1, 1),
        gender="male",
        admission_date=date(2024, 6, 1),
        is_active=True,
    )
    db.add(active_student)
    await db.flush()

    active_enr = StudentEnrollment(
        student_id=active_student.id,
        academic_year_id=test_academic_year.id,
        standard_id=std.id,
        division_id=div.id,
        status="active",
        enrollment_date=date(2024, 6, 1),
    )
    db.add(active_enr)
    await db.flush()

    active_assign = StudentFeeAssignment(
        student_id=active_student.id,
        fee_structure_id=struct.id,
        academic_year_id=test_academic_year.id,
        concession_amount=Decimal("0"),
    )
    db.add(active_assign)
    await db.flush()

    active_inv = FeeInvoice(
        invoice_number=f"INV-ACT-{suffix}",
        student_id=active_student.id,
        assignment_id=active_assign.id,
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
    db.add(active_inv)
    await db.flush()

    active_item = FeeInvoiceItem(
        invoice_id=active_inv.id,
        fee_structure_id=struct.id,
        description="Tuition Term 1",
        amount=Decimal("24000.00"),
        discount_amount=Decimal("0"),
        net_amount=Decimal("24000.00"),
    )
    db.add(active_item)
    await db.flush()

    # 4. Former Student (Left institution with debt)
    former_student = Student(
        institution_id=test_institution.id,
        admission_number=f"FORM-{suffix}",
        first_name="Former",
        last_name="Discontinued",
        date_of_birth=date(2009, 5, 12),
        gender="female",
        admission_date=date(2024, 4, 1),
        is_active=False,
        exit_date=date(2024, 10, 15),
        exit_reason="Discontinued / Relocated",
        exit_notes="Transferred out of district with unpaid fee liability",
    )
    db.add(former_student)
    await db.flush()

    former_enr = StudentEnrollment(
        student_id=former_student.id,
        academic_year_id=test_academic_year.id,
        standard_id=std.id,
        division_id=div.id,
        status="withdrawn",
        enrollment_date=date(2024, 4, 1),
        exit_date=date(2024, 10, 15),
        exit_reason="Discontinued / Relocated",
    )
    db.add(former_enr)
    await db.flush()

    former_assign = StudentFeeAssignment(
        student_id=former_student.id,
        fee_structure_id=struct.id,
        academic_year_id=test_academic_year.id,
        concession_amount=Decimal("0"),
    )
    db.add(former_assign)
    await db.flush()

    former_inv = FeeInvoice(
        invoice_number=f"INV-FORM-{suffix}",
        student_id=former_student.id,
        assignment_id=former_assign.id,
        academic_year_id=test_academic_year.id,
        total_amount=Decimal("50000.00"),
        discount_amount=Decimal("0"),
        net_amount=Decimal("50000.00"),
        paid_amount=Decimal("15000.00"),
        outstanding_amount=Decimal("35000.00"),
        issue_date=date(2024, 4, 1),
        due_date=date(2024, 9, 30),
        status="partial",
    )
    db.add(former_inv)
    await db.flush()

    former_item = FeeInvoiceItem(
        invoice_id=former_inv.id,
        fee_structure_id=struct.id,
        description="Tuition Term 1",
        amount=Decimal("50000.00"),
        discount_amount=Decimal("0"),
        net_amount=Decimal("50000.00"),
    )
    db.add(former_item)
    await db.commit()

    return {
        "institution": test_institution,
        "academic_year": test_academic_year,
        "standard": std,
        "division": div,
        "active_student": active_student,
        "active_invoice": active_inv,
        "former_student": former_student,
        "former_invoice": former_inv,
    }


@pytest.mark.asyncio
async def test_fees_overview_receivables_segregation_and_reconciliation(
    client, auth_headers, setup_receivables_environment
):
    """
    Requirement 1: Dashboard fees overview must provide separate values for:
    - Active Students Outstanding
    - Former / Discontinued Students Outstanding
    - Total Recoverable Outstanding
    Total Recoverable must reconcile exactly: Active + Former + Inactive == Total Recoverable.
    """
    env = setup_receivables_environment
    inst_id = env["institution"].id

    res = await client.get(f"/api/v1/fees/overview?institution_id={inst_id}", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    summary = data["summary"]

    assert "active_students_outstanding" in summary
    assert "former_students_outstanding" in summary
    assert "total_recoverable_outstanding" in summary
    assert "total_outstanding" in summary

    active = summary["active_students_outstanding"]
    former = summary["former_students_outstanding"]
    inactive = summary.get("inactive_students_outstanding", 0.0)
    recoverable = summary["total_recoverable_outstanding"]

    # Reconciles exactly to the penny
    assert round(active + former + inactive, 2) == round(recoverable, 2)
    assert round(recoverable, 2) == round(summary["total_outstanding"], 2)
    assert active == 24000.0
    assert former == 35000.0
    assert recoverable == 59000.0


@pytest.mark.asyncio
async def test_former_students_recovery_register(
    client, auth_headers, setup_receivables_environment
):
    """
    Requirement 2: Dedicated former student recovery endpoint must expose all former/discontinued
    students with non-zero outstanding liabilities so debts are never dropped.
    """
    env = setup_receivables_environment
    former_std = env["former_student"]

    res = await client.get("/api/v1/fees/former-students-recovery", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()

    assert "debtors_count" in data
    assert "total_recoverable_outstanding" in data
    assert "records" in data
    assert data["debtors_count"] >= 1
    assert data["total_recoverable_outstanding"] >= 35000.0

    # Verify former student is listed in recovery register with exact balances
    debtor = next((r for r in data["records"] if r["student_id"] == former_std.id), None)
    assert debtor is not None
    assert debtor["outstanding_amount"] == 35000.0
    assert debtor["exit_reason"] == "Discontinued / Relocated"
    assert debtor["exit_date"] == "2024-10-15"


@pytest.mark.asyncio
async def test_fee_register_student_status_filters(
    client, auth_headers, setup_receivables_environment
):
    """
    Requirement 3: Fee Register must support filtering by student status:
    - active: only currently active enrolled students
    - former: only former/discontinued/withdrawn students
    """
    env = setup_receivables_environment
    active_std = env["active_student"]
    former_std = env["former_student"]

    # 1. Active students filter
    res_active = await client.get("/api/v1/fees/register?student_status=active", headers=auth_headers)
    assert res_active.status_code == 200
    active_entries = res_active.json()
    assert len(active_entries) >= 1
    for entry in active_entries:
        assert entry["is_former"] is False
        assert entry["student_is_active"] is True
        assert entry["student_status"] == "active"
    assert any(e["student_id"] == active_std.id for e in active_entries)
    assert not any(e["student_id"] == former_std.id for e in active_entries)

    # 2. Former students filter
    res_former = await client.get("/api/v1/fees/register?student_status=former", headers=auth_headers)
    assert res_former.status_code == 200
    former_entries = res_former.json()
    assert len(former_entries) >= 1
    for entry in former_entries:
        assert entry["is_former"] is True
        assert entry["student_is_active"] is False
    assert any(e["student_id"] == former_std.id for e in former_entries)
    assert not any(e["student_id"] == active_std.id for e in former_entries)


@pytest.mark.asyncio
async def test_student_exit_preserves_financial_liability(
    client, auth_headers, setup_receivables_environment, db
):
    """
    Requirement 4: When a student exits / withdraws, their fee invoice and outstanding balance
    must remain 100% intact and never be zeroed out or dropped.
    """
    env = setup_receivables_environment
    active_std = env["active_student"]
    active_inv = env["active_invoice"]

    # Verify initial active status & outstanding amount
    initial_outstanding = float(active_inv.outstanding_amount)
    assert initial_outstanding == 24000.0

    # Execute student exit via exit endpoint
    exit_payload = {
        "status": "withdrawn",
        "reason": "Family Relocation",
        "notes": "Relocating out of city",
        "exit_date": str(date.today()),
    }
    res_exit = await client.post(f"/api/v1/students/{active_std.id}/exit", json=exit_payload, headers=auth_headers)
    assert res_exit.status_code == 200

    # Re-query invoice: verify outstanding amount was NOT changed or cleared
    inv_after = (await db.execute(select(FeeInvoice).where(FeeInvoice.id == active_inv.id))).scalar_one()
    assert float(inv_after.outstanding_amount) == initial_outstanding
    assert inv_after.status != "cancelled"

    # Verify student now appears in former status in fee register with debt intact
    reg_res = await client.get(f"/api/v1/fees/register?search={active_std.admission_number}", headers=auth_headers)
    assert reg_res.status_code == 200
    reg_data = reg_res.json()
    assert len(reg_data) >= 1
    entry = next(e for e in reg_data if e["student_id"] == active_std.id)
    assert entry["is_former"] is True
    assert entry["student_status"] == "former"
    assert entry["exit_reason"] == "Family Relocation"
    assert entry["outstanding_amount"] == initial_outstanding


@pytest.mark.asyncio
async def test_enrollment_transfer_preserves_invoice_and_obligations(
    client, auth_headers, setup_receivables_environment, db
):
    """
    Requirement 5: Class/Batch transfers within an academic year must preserve existing fee invoices.
    When an enrollment is transferred to another division, the student's invoices remain intact.
    """
    env = setup_receivables_environment
    active_std = env["active_student"]
    active_inv = env["active_invoice"]
    inst = env["institution"]
    ay = env["academic_year"]
    std = env["standard"]

    # Create new division
    div_b = Division(standard_id=std.id, name=f"Batch B-{uuid.uuid4().hex[:6]}")
    db.add(div_b)
    await db.flush()

    # Mark old enrollment as transferred
    old_enr = (
        await db.execute(
            select(StudentEnrollment).where(
                StudentEnrollment.student_id == active_std.id,
                StudentEnrollment.status == "active",
            )
        )
    ).scalar_one()
    old_enr.status = "transferred"
    old_enr.exit_date = date.today()
    old_enr.exit_reason = "Internal Batch Transfer"

    # Create new enrollment in Division B
    new_enr = StudentEnrollment(
        student_id=active_std.id,
        academic_year_id=ay.id,
        standard_id=std.id,
        division_id=div_b.id,
        status="active",
        enrollment_date=date.today(),
    )
    db.add(new_enr)
    await db.commit()

    # Query student invoices: must remain intact and valid
    student_invoices = (
        await db.execute(select(FeeInvoice).where(FeeInvoice.student_id == active_std.id))
    ).scalars().all()

    assert len(student_invoices) >= 1
    for inv in student_invoices:
        assert inv.status != "cancelled"
        assert inv.outstanding_amount == active_inv.outstanding_amount
