# /**
#  * @file        test_examinations_and_report_cards.py
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
#  * @description Pytest test suite for examination scoring, grade calculation, cohort analytics, and printable report cards.
#  */

import pytest
from datetime import date
from decimal import Decimal

from app.models.exam import Examination, ExamMark
from app.models.subject import Subject
from app.models.standard import Standard
from app.models.enrollment import StudentEnrollment
from app.models.student import Student, Guardian
from app.services.exam_reports import (
    calculate_grade,
    get_exam_marks_sheet,
    save_exam_marks_bulk,
    get_exam_analytics,
    get_student_report_card,
)


def test_grade_calculation_formula():
    """Verifies standard grading scale rules."""
    assert calculate_grade(95.0, 100.0) == "A+"
    assert calculate_grade(85.0, 100.0) == "A"
    assert calculate_grade(72.5, 100.0) == "B"
    assert calculate_grade(64.0, 100.0) == "C"
    assert calculate_grade(42.0, 100.0) == "D"
    assert calculate_grade(28.0, 100.0) == "F"
    assert calculate_grade(None, 100.0) == "F"


@pytest.mark.asyncio
async def test_exam_marks_entry_analytics_and_report_card(
    db, test_institution, test_student, test_academic_year, admin_user
):
    """Verifies end-to-end exam marks entry, cohort analytics, and official report card compilation."""
    # 1. Setup Standard & Subject
    standard = Standard(
        institution_id=test_institution.id,
        name="Standard 10 - Foundation",
        level=10,
    )
    db.add(standard)
    await db.flush()

    math_sub = Subject(
        standard_id=standard.id,
        name="Mathematics",
        code="MTH-10",
        max_marks=100,
        pass_marks=35,
    )
    sci_sub = Subject(
        standard_id=standard.id,
        name="Science & Technology",
        code="SCI-10",
        max_marks=100,
        pass_marks=35,
    )
    db.add_all([math_sub, sci_sub])
    await db.flush()

    # 2. Setup Enrollment
    enrollment = StudentEnrollment(
        student_id=test_student.id,
        academic_year_id=test_academic_year.id,
        standard_id=standard.id,
        roll_number="101",
        enrollment_date=date.today(),
        status="active",
    )
    db.add(enrollment)

    guardian = Guardian(
        student_id=test_student.id,
        first_name="Anil",
        last_name="Student",
        relation="Father",
        phone="+91-9876543299",
        is_primary=True,
    )
    db.add(guardian)
    await db.commit()

    # 3. Create Examination
    exam = Examination(
        academic_year_id=test_academic_year.id,
        standard_id=standard.id,
        name="Mid-Term Assessment 2026",
        exam_type="Term Exam",
        start_date=date(2026, 10, 1),
        end_date=date(2026, 10, 10),
        max_marks=100,
        passing_marks=35,
    )
    db.add(exam)
    await db.commit()
    await db.refresh(exam)

    # 4. Save Marks in Bulk
    marks_payload = [
        {
            "student_id": test_student.id,
            "subject_id": math_sub.id,
            "marks_obtained": 92.5,
            "is_absent": False,
            "remarks": "Excellent numerical problem solving",
        },
        {
            "student_id": test_student.id,
            "subject_id": sci_sub.id,
            "marks_obtained": 84.0,
            "is_absent": False,
            "remarks": "Strong conceptual clarity in physics",
        },
    ]
    save_res = await save_exam_marks_bulk(db, exam_id=exam.id, entries=marks_payload)
    assert save_res["status"] == "success"
    assert save_res["saved_count"] == 2

    # 5. Verify Marks Sheet
    sheet = await get_exam_marks_sheet(db, exam_id=exam.id)
    assert sheet is not None
    assert sheet["exam"]["name"] == "Mid-Term Assessment 2026"
    assert len(sheet["subjects"]) == 2
    assert len(sheet["students"]) >= 1

    stu_entry = next((s for s in sheet["students"] if s["student_id"] == test_student.id), None)
    assert stu_entry is not None
    assert stu_entry["scores"][math_sub.id]["marks_obtained"] == 92.5
    assert stu_entry["scores"][math_sub.id]["grade"] == "A+"
    assert stu_entry["scores"][sci_sub.id]["marks_obtained"] == 84.0
    assert stu_entry["scores"][sci_sub.id]["grade"] == "A"

    # 6. Verify Cohort Analytics
    analytics = await get_exam_analytics(db, exam_id=exam.id)
    assert analytics is not None
    assert analytics["total_candidates"] >= 1
    assert analytics["pass_count"] >= 1
    assert analytics["pass_percentage"] == 100.0
    assert analytics["highest_score"] > 80.0
    assert len(analytics["subject_analytics"]) == 2
    assert len(analytics["leaderboard"]) >= 1
    assert analytics["leaderboard"][0]["student_id"] == test_student.id
    assert analytics["leaderboard"][0]["rank"] == 1

    # 7. Verify Official Printable Report Card
    report_card = await get_student_report_card(
        db, exam_id=exam.id, student_id=test_student.id, institution_id=test_institution.id
    )
    assert report_card is not None
    assert report_card["student"]["full_name"] == f"{test_student.first_name} {test_student.last_name}"
    assert report_card["student"]["guardian_name"] == "Anil Student"
    assert report_card["examination"]["name"] == "Mid-Term Assessment 2026"
    assert report_card["institution"]["name"] == test_institution.name
    assert len(report_card["subjects"]) == 2
    assert report_card["summary"]["total_max_marks"] == 200.0
    assert report_card["summary"]["total_obtained"] == 176.5
    assert report_card["summary"]["percentage"] == 88.25
    assert report_card["summary"]["grade"] == "A"
    assert report_card["summary"]["result"] == "PASS"
    assert report_card["summary"]["class_rank"] == "#1"
