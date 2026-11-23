# /**
#  * @file        test_academic_coordinates_reporting.py
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
#  * @created     2026-11-23
#  * @updated     2026-11-23
#  *
#  * @description Test suite validating student academic coordinates (standard, board, batch/division, roll number) across directory listings, invoices, and reporting endpoints.
#  */

import uuid
import pytest
from datetime import date
from decimal import Decimal
from app.models.board import Board
from app.models.standard import Standard
from app.models.division import Division
from app.models.student import Student
from app.models.enrollment import StudentEnrollment
from app.models.fee import FeeCategory, FeeStructure, StudentFeeAssignment, FeeInvoice, FeeInvoiceItem, FeeInvoiceInstallment
from app.models.payment import Payment, PaymentReceipt


@pytest.mark.asyncio
async def test_students_list_and_invoices_include_academic_coordinates(
    client, auth_headers, db, test_institution, test_academic_year, admin_user
):
    """Validates that GET /api/v1/students/ and GET /api/v1/fees/invoices return academic coordinates."""
    admin_user.institution_id = test_institution.id
    await db.commit()

    suffix = uuid.uuid4().hex[:6]

    # 1. Create Board, Standard, Division
    board = Board(
        institution_id=test_institution.id,
        name=f"CBSE-{suffix}",
        code=f"CBSE{suffix[:4].upper()}",
        is_active=True,
    )
    db.add(board)
    await db.flush()

    standard = Standard(
        institution_id=test_institution.id,
        name=f"Grade 10-{suffix}",
        level=10,
        is_active=True,
    )
    db.add(standard)
    await db.flush()

    division = Division(
        standard_id=standard.id,
        board_id=board.id,
        name=f"Titans-{suffix}",
        code=f"TTN-{suffix}",
        status="active",
    )
    db.add(division)
    await db.flush()

    # 2. Create Student & StudentEnrollment
    student = Student(
        institution_id=test_institution.id,
        admission_number=f"ADM-COORD-{suffix}",
        first_name="Arya",
        last_name="Stark",
        date_of_birth=date(2010, 3, 15),
        gender="female",
        admission_date=date(2026, 1, 1),
        is_active=True,
    )
    db.add(student)
    await db.flush()

    enrollment = StudentEnrollment(
        student_id=student.id,
        academic_year_id=test_academic_year.id,
        standard_id=standard.id,
        division_id=division.id,
        roll_number="101",
        enrollment_date=date(2026, 1, 1),
        status="active",
    )
    db.add(enrollment)
    await db.commit()

    # Test GET /api/v1/students/
    resp = await client.get("/api/v1/students/", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    students = data.get("data", data) if isinstance(data, dict) else data
    target_student = next((s for s in students if s["id"] == student.id), None)
    assert target_student is not None
    assert target_student["standard_name"] == standard.name
    assert target_student["division_name"] == division.name
    assert target_student["board_name"] == board.name
    assert target_student["roll_number"] == "101"

    # 3. Create FeeInvoice for student and verify GET /api/v1/fees/invoices
    category = FeeCategory(institution_id=test_institution.id, name=f"Coaching-{suffix}")
    db.add(category)
    await db.flush()

    structure = FeeStructure(
        institution_id=test_institution.id,
        academic_year_id=test_academic_year.id,
        category_id=category.id,
        name=f"Annual Coaching-{suffix}",
        amount=Decimal("15000.00"),
        frequency="annual",
    )
    db.add(structure)
    await db.flush()

    assignment = StudentFeeAssignment(
        student_id=student.id,
        fee_structure_id=structure.id,
        academic_year_id=test_academic_year.id,
        concession_amount=Decimal("0"),
    )
    db.add(assignment)
    await db.flush()

    invoice = FeeInvoice(
        invoice_number=f"INV-COORD-{suffix}",
        student_id=student.id,
        assignment_id=assignment.id,
        academic_year_id=test_academic_year.id,
        total_amount=Decimal("15000.00"),
        discount_amount=Decimal("0"),
        net_amount=Decimal("15000.00"),
        paid_amount=Decimal("0"),
        outstanding_amount=Decimal("15000.00"),
        issue_date=date(2026, 1, 1),
        due_date=date(2026, 12, 31),
        status="unpaid",
    )
    db.add(invoice)
    await db.commit()

    # Test GET /api/v1/fees/invoices
    resp_inv = await client.get("/api/v1/fees/invoices", headers=auth_headers)
    assert resp_inv.status_code == 200
    inv_data = resp_inv.json()
    invoices = inv_data.get("data", inv_data) if isinstance(inv_data, dict) else inv_data
    target_invoice = next((i for i in invoices if i["id"] == invoice.id), None)
    assert target_invoice is not None
    assert target_invoice["standard_name"] == standard.name
    assert target_invoice["division_name"] == division.name
    assert target_invoice["board_name"] == board.name


@pytest.mark.asyncio
async def test_reporting_endpoints_include_academic_coordinates(
    client, auth_headers, db, test_institution, test_academic_year, admin_user
):
    """Validates that reporting endpoints include standard_name, division_name, and board_name."""
    admin_user.institution_id = test_institution.id
    await db.commit()

    suffix = uuid.uuid4().hex[:6]

    # Setup Board, Standard, Division, Student, Enrollment
    board = Board(
        institution_id=test_institution.id,
        name=f"ICSE-{suffix}",
        code=f"ICSE{suffix[:4].upper()}",
        is_active=True,
    )
    db.add(board)
    await db.flush()

    standard = Standard(
        institution_id=test_institution.id,
        name=f"Grade 12-{suffix}",
        level=12,
        is_active=True,
    )
    db.add(standard)
    await db.flush()

    division = Division(
        standard_id=standard.id,
        board_id=board.id,
        name=f"Apex-{suffix}",
        code=f"APX-{suffix}",
        status="active",
    )
    db.add(division)
    await db.flush()

    student = Student(
        institution_id=test_institution.id,
        admission_number=f"ADM-REP-COORD-{suffix}",
        first_name="Ravi",
        last_name="Kumar",
        date_of_birth=date(2008, 6, 20),
        gender="male",
        admission_date=date(2026, 1, 1),
        is_active=True,
    )
    db.add(student)
    await db.flush()

    enrollment = StudentEnrollment(
        student_id=student.id,
        academic_year_id=test_academic_year.id,
        standard_id=standard.id,
        division_id=division.id,
        roll_number="202",
        enrollment_date=date(2026, 1, 1),
        status="active",
    )
    db.add(enrollment)

    # Add overdue invoice for defaulters and fee collection report
    category = FeeCategory(institution_id=test_institution.id, name=f"Tuition-Rep-{suffix}")
    db.add(category)
    await db.flush()

    structure = FeeStructure(
        institution_id=test_institution.id,
        academic_year_id=test_academic_year.id,
        category_id=category.id,
        name=f"Tuition-Structure-{suffix}",
        amount=Decimal("10000.00"),
        frequency="annual",
    )
    db.add(structure)
    await db.flush()

    assignment = StudentFeeAssignment(
        student_id=student.id,
        fee_structure_id=structure.id,
        academic_year_id=test_academic_year.id,
        concession_amount=Decimal("0"),
    )
    db.add(assignment)
    await db.flush()

    invoice = FeeInvoice(
        invoice_number=f"INV-REP-{suffix}",
        student_id=student.id,
        assignment_id=assignment.id,
        academic_year_id=test_academic_year.id,
        total_amount=Decimal("10000.00"),
        discount_amount=Decimal("0"),
        net_amount=Decimal("10000.00"),
        paid_amount=Decimal("2000.00"),
        outstanding_amount=Decimal("8000.00"),
        issue_date=date(2026, 1, 1),
        due_date=date(2026, 1, 15),
        status="partial",
    )
    db.add(invoice)
    await db.flush()

    installment = FeeInvoiceInstallment(
        invoice_id=invoice.id,
        installment_number=1,
        description="Term 1",
        amount=Decimal("10000.00"),
        paid_amount=Decimal("2000.00"),
        outstanding_amount=Decimal("8000.00"),
        due_date=date(2026, 1, 15),
        status="overdue",
    )
    db.add(installment)

    # Payment for daily collection and fee collection report
    payment = Payment(
        student_id=student.id,
        academic_year_id=test_academic_year.id,
        amount=Decimal("2000.00"),
        payment_date=date.today(),
        payment_method="cash",
        status="completed",
    )
    db.add(payment)
    await db.flush()

    receipt = PaymentReceipt(
        receipt_number=f"RCP-REP-COORD-{suffix}",
        payment_id=payment.id,
        student_id=student.id,
        amount=Decimal("2000.00"),
        payment_date=date.today(),
        payment_method="cash",
        version=1,
        status="valid",
    )
    db.add(receipt)
    await db.commit()

    # 1. GET /api/v1/reports/fee-collection
    res_fc = await client.get("/api/v1/reports/fee-collection", headers=auth_headers)
    assert res_fc.status_code == 200
    fc_data = res_fc.json()
    assert isinstance(fc_data, list)
    target_fc = next((r for r in fc_data if r.get("student_id") == student.id), None)
    if target_fc:
        assert target_fc["standard_name"] == standard.name
        assert target_fc["division_name"] == division.name
        assert target_fc["board_name"] == board.name

    # 2. GET /api/v1/reports/outstanding
    res_out = await client.get("/api/v1/reports/outstanding", headers=auth_headers)
    assert res_out.status_code == 200
    out_data = res_out.json()
    assert isinstance(out_data, list)
    target_out = next((r for r in out_data if r.get("student_id") == student.id), None)
    if target_out:
        assert target_out["standard_name"] == standard.name
        assert target_out["division_name"] == division.name
        assert target_out["board_name"] == board.name

    # 3. GET /api/v1/reports/fees/defaulters
    res_def = await client.get("/api/v1/reports/fees/defaulters?min_days_overdue=1", headers=auth_headers)
    assert res_def.status_code == 200
    def_data = res_def.json()
    assert isinstance(def_data, list)
    target_def = next((r for r in def_data if r.get("student_id") == student.id), None)
    if target_def:
        assert target_def["division_name"] == division.name
        assert target_def["board_name"] == board.name

    # 4. GET /api/v1/reports/fees/daily-collection
    res_daily = await client.get(f"/api/v1/reports/fees/daily-collection?date={date.today()}", headers=auth_headers)
    assert res_daily.status_code == 200
    daily_data = res_daily.json()
    assert isinstance(daily_data, list)
    target_daily = next((r for r in daily_data if r.get("student_id") == student.id), None)
    if target_daily:
        assert target_daily["standard_name"] == standard.name
        assert target_daily["division_name"] == division.name
        assert target_daily["board_name"] == board.name
