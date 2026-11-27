# /**
#  * @file        test_fee_invoicing_parity_and_ssot.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      backend.tests.test_fee_invoicing_parity_and_ssot
#  *
#  * @author      Jawahar R. Mallah
#  * @organization Smritisys & AITDL Networks
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 PrathamOne EduOS
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-28
#  * @updated     2026-11-28
#  *
#  * @description Regression tests verifying SSOT institution/academic-year guards on fee assignments and Fee Invoicing register parity.
#  */

import pytest
from decimal import Decimal
from datetime import date
from uuid import uuid4

from app.models.academic_year import AcademicYear
from app.models.fee import FeeCategory, FeeStructure, StudentFeeAssignment
from app.models.institution import Institution
from app.models.student import Student


@pytest.mark.asyncio
async def test_adjust_student_fees_rejects_cross_institution_and_wrong_ay_structures(
    db, client, auth_headers
):
    suffix = uuid4().hex[:6]

    ay_prod = AcademicYear(
        institution_id=1,
        name=f"2026-27-{suffix}",
        start_date=date(2026, 4, 1),
        end_date=date(2027, 3, 31),
        is_current=True,
        is_active=True,
    )
    ay_prod_old = AcademicYear(
        institution_id=1,
        name=f"2025-26-{suffix}",
        start_date=date(2025, 4, 1),
        end_date=date(2026, 3, 31),
        is_current=False,
        is_active=True,
    )
    inst_demo = Institution(name=f"Demo Mirror {suffix}", code=f"DM-{suffix}", is_active=True)
    db.add_all([ay_prod, ay_prod_old, inst_demo])
    await db.flush()

    ay_demo = AcademicYear(
        institution_id=inst_demo.id,
        name=f"2026-27-D-{suffix}",
        start_date=date(2026, 4, 1),
        end_date=date(2027, 3, 31),
        is_current=True,
        is_active=True,
    )
    cat_prod = FeeCategory(institution_id=1, name=f"Tuition-{suffix}", is_active=True)
    cat_demo = FeeCategory(institution_id=inst_demo.id, name=f"Tuition-D-{suffix}", is_active=True)
    db.add_all([ay_demo, cat_prod, cat_demo])
    await db.flush()

    fs_demo = FeeStructure(
        institution_id=inst_demo.id,
        academic_year_id=ay_demo.id,
        category_id=cat_demo.id,
        name=f"Demo Fee Plan {suffix}",
        amount=Decimal("24000.00"),
        frequency="annual",
        installments_count=1,
        is_active=True,
    )
    fs_wrong_ay = FeeStructure(
        institution_id=1,
        academic_year_id=ay_prod_old.id,
        category_id=cat_prod.id,
        name=f"Old AY Fee Plan {suffix}",
        amount=Decimal("22000.00"),
        frequency="annual",
        installments_count=1,
        is_active=True,
    )
    student = Student(
        institution_id=1,
        admission_number=f"PA-SSOT-{suffix}",
        first_name="Pushpa",
        last_name="Mallah",
        date_of_birth=date(2009, 5, 1),
        gender="female",
        admission_date=date(2026, 4, 1),
        is_demo=False,
        is_active=True,
    )
    db.add_all([fs_demo, fs_wrong_ay, student])
    await db.commit()

    # Cross-institution fee structure MUST be rejected
    resp_cross = await client.post(
        f"/api/v1/fees/students/{student.id}/adjust-fees",
        headers=auth_headers,
        json={
            "fee_structure_id": fs_demo.id,
            "academic_year_id": ay_prod.id,
            "custom_amount": 24000,
            "reason": "Cross institution attempt",
        },
    )
    assert resp_cross.status_code == 400
    assert "same institution" in resp_cross.json()["detail"].lower()

    # Same institution but mismatched academic year MUST be rejected
    resp_wrong_ay = await client.post(
        f"/api/v1/fees/students/{student.id}/adjust-fees",
        headers=auth_headers,
        json={
            "fee_structure_id": fs_wrong_ay.id,
            "academic_year_id": ay_prod.id,
            "custom_amount": 22000,
            "reason": "Wrong academic year attempt",
        },
    )
    assert resp_wrong_ay.status_code == 400
    assert "same academic year" in resp_wrong_ay.json()["detail"].lower()


@pytest.mark.asyncio
async def test_unbilled_assignment_parity_across_profile_register_and_invoicing(
    db, client, auth_headers
):
    suffix = uuid4().hex[:6]

    ay_prod = AcademicYear(
        institution_id=1,
        name=f"2026-27-P-{suffix}",
        start_date=date(2026, 4, 1),
        end_date=date(2027, 3, 31),
        is_current=True,
        is_active=True,
    )
    inst_other = Institution(name=f"Other Inst {suffix}", code=f"OI-{suffix}", is_active=True)
    db.add_all([ay_prod, inst_other])
    await db.flush()

    ay_other = AcademicYear(
        institution_id=inst_other.id,
        name=f"2024-25-O-{suffix}",
        start_date=date(2024, 4, 1),
        end_date=date(2025, 3, 31),
        is_current=False,
        is_active=True,
    )
    cat_prod = FeeCategory(institution_id=1, name=f"Tuition-P-{suffix}", is_active=True)
    cat_other = FeeCategory(institution_id=inst_other.id, name=f"Tuition-O-{suffix}", is_active=True)
    db.add_all([ay_other, cat_prod, cat_other])
    await db.flush()

    fs_prod = FeeStructure(
        institution_id=1,
        academic_year_id=ay_prod.id,
        category_id=cat_prod.id,
        name=f"Std 11 Commerce {suffix}",
        amount=Decimal("24000.00"),
        frequency="annual",
        installments_count=1,
        is_active=True,
    )
    fs_other = FeeStructure(
        institution_id=inst_other.id,
        academic_year_id=ay_other.id,
        category_id=cat_other.id,
        name=f"Demo Fee {suffix}",
        amount=Decimal("18000.00"),
        frequency="annual",
        installments_count=1,
        is_active=True,
    )
    stu_valid = Student(
        institution_id=1,
        admission_number=f"PA-VALID-{suffix}",
        first_name="Pushpa",
        last_name="Mallah",
        date_of_birth=date(2009, 5, 1),
        gender="female",
        admission_date=date(2026, 4, 1),
        is_demo=False,
        is_active=True,
    )
    stu_corrupt = Student(
        institution_id=1,
        admission_number=f"PA-CORRUPT-{suffix}",
        first_name="Legacy",
        last_name="Mismatch",
        date_of_birth=date(2009, 5, 2),
        gender="female",
        admission_date=date(2026, 4, 1),
        is_demo=False,
        is_active=True,
    )
    db.add_all([fs_prod, fs_other, stu_valid, stu_corrupt])
    await db.flush()

    # Simulate legacy drifted cross-institution assignment row
    db.add(
        StudentFeeAssignment(
            student_id=stu_corrupt.id,
            fee_structure_id=fs_other.id,
            academic_year_id=ay_other.id,
            custom_amount=Decimal("18000.00"),
            concession_amount=Decimal("0.00"),
            remarks="Legacy drift",
        )
    )
    await db.commit()

    # Legacy cross-institution assignment must NOT falsely appear as pending on profile
    corrupt_fees = await client.get(f"/api/v1/students/{stu_corrupt.id}/profile", headers=auth_headers)
    assert corrupt_fees.status_code == 200
    assert corrupt_fees.json()["fees"]["assignment"] is None

    # Valid adjustment creates assignment visible on profile, Fee Register (all + status=unbilled), and Assignments
    adj_resp = await client.post(
        f"/api/v1/fees/students/{stu_valid.id}/adjust-fees",
        headers=auth_headers,
        json={
            "fee_structure_id": fs_prod.id,
            "academic_year_id": ay_prod.id,
            "custom_amount": 24000,
            "reason": "Approved package assignment",
        },
    )
    assert adj_resp.status_code == 200
    assignment_id = adj_resp.json()["assignment_id"]

    profile_fees = await client.get(f"/api/v1/students/{stu_valid.id}/profile", headers=auth_headers)
    assert profile_fees.status_code == 200
    assert profile_fees.json()["fees"]["assignment"]["id"] == assignment_id
    assert profile_fees.json()["fees"]["assignment"]["has_invoice"] is False

    reg_all = await client.get(
        "/api/v1/fees/register",
        headers=auth_headers,
        params={"academic_year_id": ay_prod.id, "search": stu_valid.admission_number},
    )
    assert reg_all.status_code == 200
    assert len(reg_all.json()) == 1
    assert reg_all.json()[0]["status"] == "unbilled"
    assert reg_all.json()[0]["net_amount"] == 24000.0

    reg_unbilled = await client.get(
        "/api/v1/fees/register",
        headers=auth_headers,
        params={"academic_year_id": ay_prod.id, "status": "unbilled", "search": stu_valid.admission_number},
    )
    assert reg_unbilled.status_code == 200
    assert len(reg_unbilled.json()) == 1
    assert reg_unbilled.json()[0]["student_id"] == stu_valid.id

    inv_resp = await client.post(
        "/api/v1/fees/invoices",
        headers=auth_headers,
        json={
            "student_id": stu_valid.id,
            "assignment_id": assignment_id,
            "academic_year_id": ay_prod.id,
            "issue_date": "2026-06-01",
            "installments": [
                {
                    "description": "Installment 1",
                    "due_date": "2026-06-15",
                    "amount": 24000,
                }
            ],
        },
    )
    assert inv_resp.status_code == 201
