# /**
#  * @file        test_student_count_reconciliation.py
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
#  * @description Test suite for student count consistency between Main Dashboard and Fees Dashboard.
#  */

import pytest
import uuid
import random
from datetime import date
from decimal import Decimal
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.student import Student
from app.models.institution import Institution
from app.models.academic_year import AcademicYear
from app.models.board import Board
from app.models.standard import Standard
from app.models.division import Division
from app.models.enrollment import StudentEnrollment
from app.models.fee import FeeInvoice, FeeCategory, FeeStructure, StudentFeeAssignment
from app.services.student_metrics import (
    get_authoritative_student_count,
    get_authoritative_student_counts_by_board,
    get_authoritative_student_counts_by_batch,
    get_student_reconciliation_diagnostic,
)


@pytest.mark.asyncio
async def test_student_counting_rule_and_reconciliation(db: AsyncSession, test_institution: Institution):
    """
    Test that the authoritative counting rule:
    1. Includes active students with active enrollments even WITHOUT fee records (fee-less).
    2. Excludes inactive students (is_active = False).
    3. Excludes students with non-active enrollments (status = 'withdrawn' or 'transferred').
    4. Excludes students from other academic years or other institutions.
    5. Counts distinct student IDs once even if multiple enrollments exist.
    """
    rand = random.randint(10000, 99999)

    # 1. Academic Years
    ay_curr = AcademicYear(
        institution_id=test_institution.id,
        name=f"2026-27-{rand}",
        start_date=date(2026, 4, 1),
        end_date=date(2027, 3, 31),
        is_current=True,
    )
    ay_other = AcademicYear(
        institution_id=test_institution.id,
        name=f"2025-26-{rand}",
        start_date=date(2025, 4, 1),
        end_date=date(2026, 3, 31),
        is_current=False,
    )
    db.add_all([ay_curr, ay_other])
    await db.flush()

    # 2. Board, Standard, Division
    board_cbse = Board(institution_id=test_institution.id, name=f"CBSE-{rand}", code=f"CBSE{rand}")
    board_icse = Board(institution_id=test_institution.id, name=f"ICSE-{rand}", code=f"ICSE{rand}")
    db.add_all([board_cbse, board_icse])
    await db.flush()

    lvl10 = (rand % 500) * 2 + 100
    lvl9 = lvl10 + 1
    std_10 = Standard(institution_id=test_institution.id, name=f"Class X-{rand}", level=lvl10)
    std_9 = Standard(institution_id=test_institution.id, name=f"Class IX-{rand}", level=lvl9)
    db.add_all([std_10, std_9])
    await db.flush()

    div_10_a = Division(standard_id=std_10.id, board_id=board_cbse.id, name="Batch A", code=f"B10A-{rand}")
    div_9_a = Division(standard_id=std_9.id, board_id=board_icse.id, name="Batch A", code=f"B9A-{rand}")
    db.add_all([div_10_a, div_9_a])
    await db.flush()

    # 3. Create Students:
    # S1: Active student in AY 2026-27, CBSE Class X, HAS fee invoice
    s1 = Student(
        institution_id=test_institution.id,
        admission_number=f"ADM-S1-{rand}",
        first_name="ActiveWithFee",
        last_name="One",
        gender="male",
        date_of_birth=date(2010, 5, 10),
        admission_date=date(2026, 4, 1),
        is_active=True,
    )
    # S2: Active student in AY 2026-27, CBSE Class X, NO fee records (fee-less)
    s2 = Student(
        institution_id=test_institution.id,
        admission_number=f"ADM-S2-{rand}",
        first_name="ActiveNoFee",
        last_name="Two",
        gender="female",
        date_of_birth=date(2010, 6, 12),
        admission_date=date(2026, 4, 1),
        is_active=True,
    )
    # S3: Active student in AY 2026-27, ICSE Class IX, NO fee records (fee-less)
    s3 = Student(
        institution_id=test_institution.id,
        admission_number=f"ADM-S3-{rand}",
        first_name="ActiveIcseNoFee",
        last_name="Three",
        gender="female",
        date_of_birth=date(2011, 2, 14),
        admission_date=date(2026, 4, 1),
        is_active=True,
    )
    # S4: Inactive student (is_active = False)
    s4 = Student(
        institution_id=test_institution.id,
        admission_number=f"ADM-S4-{rand}",
        first_name="InactiveStudent",
        last_name="Four",
        gender="male",
        date_of_birth=date(2010, 8, 20),
        admission_date=date(2026, 4, 1),
        is_active=False,
    )
    # S5: Active student, but WITHDRAWN enrollment
    s5 = Student(
        institution_id=test_institution.id,
        admission_number=f"ADM-S5-{rand}",
        first_name="WithdrawnStudent",
        last_name="Five",
        gender="female",
        date_of_birth=date(2010, 9, 25),
        admission_date=date(2026, 4, 1),
        is_active=True,
    )
    # S6: Active student, enrolled ONLY in other academic year (2025-26)
    s6 = Student(
        institution_id=test_institution.id,
        admission_number=f"ADM-S6-{rand}",
        first_name="PastYearStudent",
        last_name="Six",
        gender="male",
        date_of_birth=date(2009, 3, 15),
        admission_date=date(2025, 4, 1),
        is_active=True,
    )
    db.add_all([s1, s2, s3, s4, s5, s6])
    await db.flush()

    # 4. Enrollments:
    e1 = StudentEnrollment(student_id=s1.id, academic_year_id=ay_curr.id, standard_id=std_10.id, division_id=div_10_a.id, enrollment_date=date(2026, 4, 1), status="active")
    e2 = StudentEnrollment(student_id=s2.id, academic_year_id=ay_curr.id, standard_id=std_10.id, division_id=div_10_a.id, enrollment_date=date(2026, 4, 1), status="active")
    e3 = StudentEnrollment(student_id=s3.id, academic_year_id=ay_curr.id, standard_id=std_9.id, division_id=div_9_a.id, enrollment_date=date(2026, 4, 1), status="active")
    e4 = StudentEnrollment(student_id=s4.id, academic_year_id=ay_curr.id, standard_id=std_10.id, division_id=div_10_a.id, enrollment_date=date(2026, 4, 1), status="active")
    e5 = StudentEnrollment(student_id=s5.id, academic_year_id=ay_curr.id, standard_id=std_10.id, division_id=div_10_a.id, enrollment_date=date(2026, 4, 1), status="withdrawn")
    e6 = StudentEnrollment(student_id=s6.id, academic_year_id=ay_other.id, standard_id=std_10.id, division_id=div_10_a.id, enrollment_date=date(2025, 4, 1), status="active")
    db.add_all([e1, e2, e3, e4, e5, e6])
    await db.flush()

    # 5. Fee Structure and Invoice for S1 only
    cat = FeeCategory(institution_id=test_institution.id, name=f"Category-{rand}")
    db.add(cat)
    await db.flush()

    struct = FeeStructure(
        institution_id=test_institution.id,
        academic_year_id=ay_curr.id,
        category_id=cat.id,
        name=f"FeeStruct-{rand}",
        amount=Decimal("50000.00"),
        frequency="annual",
    )
    db.add(struct)
    await db.flush()

    asgn1 = StudentFeeAssignment(
        student_id=s1.id,
        fee_structure_id=struct.id,
        academic_year_id=ay_curr.id,
        concession_amount=Decimal("0.00"),
    )
    db.add(asgn1)
    await db.flush()

    inv1 = FeeInvoice(
        student_id=s1.id,
        assignment_id=asgn1.id,
        academic_year_id=ay_curr.id,
        invoice_number=f"INV-{rand}-001",
        issue_date=date(2026, 4, 1),
        due_date=date(2026, 4, 15),
        total_amount=Decimal("50000.00"),
        discount_amount=Decimal("0.00"),
        net_amount=Decimal("50000.00"),
        paid_amount=Decimal("20000.00"),
        outstanding_amount=Decimal("30000.00"),
        status="partially_paid",
    )
    db.add(inv1)
    await db.commit()

    # TEST ASSERTIONS:
    # 1. Total authoritative student count in AY 2026-27 for test_institution:
    # Expected: Exactly 3 students (s1, s2, s3).
    # s1 is counted ONCE despite having 2 enrollments.
    # s2 & s3 are counted despite having NO invoices.
    # s4 excluded (inactive).
    # s5 excluded (withdrawn).
    # s6 excluded (wrong AY).
    total_ay_curr = await get_authoritative_student_count(
        db,
        institution_id=test_institution.id,
        academic_year_id=ay_curr.id,
    )
    assert total_ay_curr == 3, f"Expected 3 active students in AY 2026-27, got {total_ay_curr}"

    # 2. Filter by Board:
    cbse_count = await get_authoritative_student_count(
        db,
        institution_id=test_institution.id,
        academic_year_id=ay_curr.id,
        board_id=board_cbse.id,
    )
    assert cbse_count == 2  # s1, s2

    icse_count = await get_authoritative_student_count(
        db,
        institution_id=test_institution.id,
        academic_year_id=ay_curr.id,
        board_id=board_icse.id,
    )
    assert icse_count == 1  # s3

    # 3. Filter by Class (Standard):
    std10_count = await get_authoritative_student_count(
        db,
        institution_id=test_institution.id,
        academic_year_id=ay_curr.id,
        standard_id=std_10.id,
    )
    assert std10_count == 2  # s1, s2

    # 4. Filter by Batch (Division):
    div10a_count = await get_authoritative_student_count(
        db,
        institution_id=test_institution.id,
        academic_year_id=ay_curr.id,
        division_id=div_10_a.id,
    )
    assert div10a_count == 2  # s1, s2

    # 5. Diagnostic reconciliation report:
    diag = await get_student_reconciliation_diagnostic(
        db,
        institution_id=test_institution.id,
        academic_year_id=ay_curr.id,
    )
    # The active students in this AY:
    s_ids = [d["student_id"] for d in diag]
    assert s1.id in s_ids
    assert s2.id in s_ids
    assert s3.id in s_ids
    # Check fee flags
    d1 = next(d for d in diag if d["student_id"] == s1.id)
    assert d1["has_fee_record"] is True
    d2 = next(d for d in diag if d["student_id"] == s2.id)
    assert d2["has_fee_record"] is False


@pytest.mark.asyncio
async def test_dashboard_and_fees_api_consistency(
    client: AsyncClient,
    auth_headers: dict,
    db: AsyncSession,
    test_institution: Institution,
):
    """
    Test that both /api/v1/dashboard/stats and /api/v1/fees/overview
    return the exact same student_count when equivalent filters are applied.
    """
    rand = random.randint(10000, 99999)
    ay = AcademicYear(
        institution_id=test_institution.id,
        name=f"2026-27-{rand}",
        start_date=date(2026, 4, 1),
        end_date=date(2027, 3, 31),
        is_current=True,
    )
    db.add(ay)
    await db.flush()

    board = Board(institution_id=test_institution.id, name=f"Brd-{rand}", code=f"B{rand}")
    db.add(board)
    await db.flush()

    lvl = (rand % 500) * 2 + 300
    std = Standard(institution_id=test_institution.id, name=f"Std-{rand}", level=lvl)
    db.add(std)
    await db.flush()

    div = Division(standard_id=std.id, board_id=board.id, name=f"Div-{rand}", code=f"D{rand}")
    db.add(div)
    await db.flush()

    # Student A (with fee invoice)
    s_a = Student(
        institution_id=test_institution.id,
        admission_number=f"ADM-A-{rand}",
        first_name="Alice",
        last_name="Test",
        gender="female",
        date_of_birth=date(2011, 1, 1),
        admission_date=date(2026, 4, 1),
        is_active=True,
    )
    # Student B (fee-less: NO invoice)
    s_b = Student(
        institution_id=test_institution.id,
        admission_number=f"ADM-B-{rand}",
        first_name="Bob",
        last_name="Test",
        gender="male",
        date_of_birth=date(2011, 2, 2),
        admission_date=date(2026, 4, 1),
        is_active=True,
    )
    db.add_all([s_a, s_b])
    await db.flush()

    e_a = StudentEnrollment(student_id=s_a.id, academic_year_id=ay.id, standard_id=std.id, division_id=div.id, enrollment_date=date(2026, 4, 1), status="active")
    e_b = StudentEnrollment(student_id=s_b.id, academic_year_id=ay.id, standard_id=std.id, division_id=div.id, enrollment_date=date(2026, 4, 1), status="active")
    db.add_all([e_a, e_b])
    await db.flush()

    # Fee setup for Alice
    cat_b = FeeCategory(institution_id=test_institution.id, name=f"CatB-{rand}")
    db.add(cat_b)
    await db.flush()

    struct_b = FeeStructure(
        institution_id=test_institution.id,
        academic_year_id=ay.id,
        category_id=cat_b.id,
        name=f"StructB-{rand}",
        amount=Decimal("40000.00"),
        frequency="annual",
    )
    db.add(struct_b)
    await db.flush()

    asgn_a = StudentFeeAssignment(
        student_id=s_a.id,
        fee_structure_id=struct_b.id,
        academic_year_id=ay.id,
        concession_amount=Decimal("0.00"),
    )
    db.add(asgn_a)
    await db.flush()

    # Invoice for Alice only
    inv = FeeInvoice(
        student_id=s_a.id,
        assignment_id=asgn_a.id,
        academic_year_id=ay.id,
        invoice_number=f"INV-{rand}-A",
        issue_date=date(2026, 4, 1),
        due_date=date(2026, 4, 15),
        total_amount=Decimal("40000.00"),
        discount_amount=Decimal("0.00"),
        net_amount=Decimal("40000.00"),
        paid_amount=Decimal("40000.00"),
        outstanding_amount=Decimal("0.00"),
        status="paid",
    )
    db.add(inv)
    await db.commit()

    # Call Dashboard API:
    dash_resp = await client.get(
        "/api/v1/dashboard/stats",
        params={
            "institution_id": test_institution.id,
            "academic_year_id": ay.id,
            "board_id": board.id,
            "standard_id": std.id,
            "division_id": div.id,
        },
        headers=auth_headers,
    )
    assert dash_resp.status_code == 200
    dash_data = dash_resp.json()

    # Call Fees API:
    fees_resp = await client.get(
        "/api/v1/fees/overview",
        params={
            "institution_id": test_institution.id,
            "academic_year_id": ay.id,
            "board_id": board.id,
            "standard_id": std.id,
            "division_id": div.id,
        },
        headers=auth_headers,
    )
    assert fees_resp.status_code == 200
    fees_data = fees_resp.json()

    # VERIFY BOTH RETURN 2 STUDENTS (Alice + Bob)
    assert dash_data["total_students"] == 2, f"Expected 2 in dashboard, got {dash_data['total_students']}"
    assert fees_data["summary"]["student_count"] == 2, f"Expected 2 in fees overview, got {fees_data['summary']['student_count']}"
    assert dash_data["total_students"] == fees_data["summary"]["student_count"]

    # Verify Board Breakdown in Fees API reports 2 students
    board_row = next((b for b in fees_data["board_breakdown"] if b["board_name"] == board.name), None)
    assert board_row is not None
    assert board_row["student_count"] == 2

    # Verify Batch Breakdown in Fees API reports 2 students
    batch_row = next((b for b in fees_data["batch_breakdown"] if b["batch_name"] == div.name), None)
    assert batch_row is not None
    assert batch_row["student_count"] == 2

    # Verify financial totals remain exact (only Alice's invoice)
    assert fees_data["summary"]["total_obligation"] == 40000.0
    assert fees_data["summary"]["total_collected"] == 40000.0
    assert fees_data["summary"]["total_outstanding"] == 0.0
