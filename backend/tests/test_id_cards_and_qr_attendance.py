# /**
#  * @file        test_id_cards_and_qr_attendance.py
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
#  * @created     2026-11-06
#  * @updated     2026-11-06
#  *
#  * @description Pytest test suite for digital student ID card generation, SVG QR codes, and QR attendance scanning terminal.
#  */

import json
import pytest
from datetime import date
from sqlalchemy import select

from app.models.student import Student, Guardian
from app.models.enrollment import StudentEnrollment
from app.models.standard import Standard
from app.models.attendance import Attendance
from app.services.id_card import (
    generate_student_qr_svg,
    get_student_id_card_data,
)
from app.api.v1.endpoints.attendance import (
    scan_attendance_checkin,
    AttendanceScanCheckin,
)


@pytest.mark.asyncio
async def test_student_id_card_generation(db, test_institution, test_student, test_academic_year):
    """Verifies complete student ID card payload generation including high-contrast SVG QR code."""
    # Add guardian
    guardian = Guardian(
        student_id=test_student.id,
        first_name="Ramesh",
        last_name="Student",
        relation="Father",
        phone="+91-9876500000",
        is_primary=True,
    )
    db.add(guardian)

    # Add standard and enrollment
    standard = Standard(
        institution_id=test_institution.id,
        name="Standard 10",
        level=10,
    )
    db.add(standard)
    await db.flush()

    enrollment = StudentEnrollment(
        student_id=test_student.id,
        academic_year_id=test_academic_year.id,
        standard_id=standard.id,
        roll_number="101",
        enrollment_date=date.today(),
        status="active",
    )
    db.add(enrollment)
    await db.commit()

    card_data = await get_student_id_card_data(
        db, student_id=test_student.id, institution_id=test_institution.id
    )

    assert card_data is not None
    assert card_data["student_id"] == test_student.id
    assert card_data["admission_number"] == test_student.admission_number
    assert card_data["full_name"] == f"{test_student.first_name} {test_student.last_name}"
    assert card_data["guardian_name"] == "Ramesh Student"
    assert card_data["guardian_phone"] == "+91-9876500000"
    assert card_data["institution"]["name"] == test_institution.name
    assert card_data["standard_name"] == "Standard 10"
    assert card_data["roll_number"] == "101"
    assert "qr_svg" in card_data
    assert "<svg" in card_data["qr_svg"]
    assert "</svg>" in card_data["qr_svg"]

    # Verify QR payload is parseable JSON
    parsed_payload = json.loads(card_data["qr_payload"])
    assert parsed_payload["adm"] == test_student.admission_number
    assert parsed_payload["id"] == test_student.id


@pytest.mark.asyncio
async def test_qr_attendance_scan_checkin_success_and_duplicate(
    db, test_institution, test_student, test_academic_year, admin_user
):
    """Verifies instant check-in via raw admission number and duplicate check-in prevention."""
    admin_user.institution_id = test_institution.id
    today = date.today()

    standard = Standard(
        institution_id=test_institution.id,
        name="Standard 9",
        level=9,
    )
    db.add(standard)
    await db.flush()

    enrollment = StudentEnrollment(
        student_id=test_student.id,
        academic_year_id=test_academic_year.id,
        standard_id=standard.id,
        roll_number="902",
        enrollment_date=date.today(),
        status="active",
    )
    db.add(enrollment)
    await db.commit()

    # 1. First scan: Success
    scan_payload = AttendanceScanCheckin(
        identifier=test_student.admission_number,
        date=today,
        status="present",
        remarks="QR Terminal Gate 1",
    )
    res = await scan_attendance_checkin(
        data=scan_payload, db=db, current_user=admin_user
    )

    assert res["status"] == "success"
    assert "checked in successfully" in res["message"]
    assert res["student"]["id"] == test_student.id
    assert res["student"]["status"] == "present"

    # Verify in DB
    att_res = await db.execute(
        select(Attendance).where(
            Attendance.student_id == test_student.id,
            Attendance.date == today,
        )
    )
    att = att_res.scalar_one_or_none()
    assert att is not None
    assert att.status == "present"

    # 2. Second scan on same day: Already marked
    res2 = await scan_attendance_checkin(
        data=scan_payload, db=db, current_user=admin_user
    )

    assert res2["status"] == "already_marked"
    assert "already marked" in res2["message"]
    assert res2["student"]["id"] == test_student.id


@pytest.mark.asyncio
async def test_qr_attendance_scan_with_json_payload(
    db, test_institution, test_student, test_academic_year, admin_user
):
    """Verifies that the scanner automatically extracts admission number from QR code JSON payload."""
    admin_user.institution_id = test_institution.id
    tomorrow = date(2026, 11, 7)

    standard = Standard(
        institution_id=test_institution.id,
        name="Standard 11",
        level=11,
    )
    db.add(standard)
    await db.flush()

    enrollment = StudentEnrollment(
        student_id=test_student.id,
        academic_year_id=test_academic_year.id,
        standard_id=standard.id,
        roll_number="1105",
        enrollment_date=date.today(),
        status="active",
    )
    db.add(enrollment)
    await db.commit()

    qr_json = json.dumps(
        {
            "adm": test_student.admission_number,
            "id": test_student.id,
            "inst": test_institution.id,
            "v": "1.0",
        }
    )

    scan_payload = AttendanceScanCheckin(
        identifier=qr_json,
        date=tomorrow,
        status="late",
        remarks="Late Bus Arrival",
    )
    res = await scan_attendance_checkin(
        data=scan_payload, db=db, current_user=admin_user
    )

    assert res["status"] == "success"
    assert res["student"]["status"] == "late"
    assert res["student"]["admission_number"] == test_student.admission_number
