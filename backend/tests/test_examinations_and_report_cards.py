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
#  * @updated     2026-11-13
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
    get_grade_point,
    get_grading_scale_details,
    get_exam_marks_sheet,
    save_exam_marks_bulk,
    get_exam_analytics,
    get_student_report_card,
    get_batch_report_cards,
    get_cumulative_term_report,
    GRADING_SCALES,
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

    # Multi-Curriculum Grading Scales
    # CBSE 9-Point
    assert calculate_grade(95.0, 100.0, scale="CBSE_9_POINT") == "A1"
    assert calculate_grade(85.0, 100.0, scale="CBSE_9_POINT") == "A2"
    assert calculate_grade(75.0, 100.0, scale="CBSE_9_POINT") == "B1"
    assert calculate_grade(65.0, 100.0, scale="CBSE_9_POINT") == "B2"
    assert calculate_grade(55.0, 100.0, scale="CBSE_9_POINT") == "C1"
    assert calculate_grade(45.0, 100.0, scale="CBSE_9_POINT") == "C2"
    assert calculate_grade(35.0, 100.0, scale="CBSE_9_POINT") == "D"
    assert calculate_grade(15.0, 100.0, scale="CBSE_9_POINT") == "E2"
    assert get_grade_point("A1", "CBSE_9_POINT") == 10.0
    assert get_grade_point("B1", "CBSE_9_POINT") == 8.0

    # ICSE Numerical
    assert calculate_grade(95.0, 100.0, scale="ICSE_PERCENTAGE") == "1"
    assert calculate_grade(85.0, 100.0, scale="ICSE_PERCENTAGE") == "2"
    assert calculate_grade(36.0, 100.0, scale="ICSE_PERCENTAGE") == "7"
    assert calculate_grade(10.0, 100.0, scale="ICSE_PERCENTAGE") == "9"

    # State Board
    assert calculate_grade(80.0, 100.0, scale="STATE_BOARD") == "DIST"
    assert calculate_grade(65.0, 100.0, scale="STATE_BOARD") == "FIRST"
    assert calculate_grade(52.0, 100.0, scale="STATE_BOARD") == "SECOND"
    assert calculate_grade(40.0, 100.0, scale="STATE_BOARD") == "PASS"
    assert calculate_grade(20.0, 100.0, scale="STATE_BOARD") == "FAIL"


@pytest.mark.asyncio
async def test_exam_marks_entry_analytics_and_report_card(
    db, client, test_institution, test_student, test_academic_year, admin_user, auth_headers
):
    """Verifies end-to-end exam marks entry, cohort analytics, and official report card compilation."""
    admin_user.institution_id = test_institution.id
    await db.commit()
    await db.refresh(admin_user)

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

    # 8. Verify Report Card with CBSE 9-Point Scale & GPA
    cbse_card = await get_student_report_card(
        db, exam_id=exam.id, student_id=test_student.id, institution_id=test_institution.id, scale="CBSE_9_POINT"
    )
    assert cbse_card is not None
    assert cbse_card["summary"]["grade"] == "A2"
    assert cbse_card["summary"]["grading_scale"] == "CBSE_9_POINT"
    assert cbse_card["summary"]["gpa"] > 8.0

    # 9. Verify Batch Report Cards Dossier
    batch_dossier = await get_batch_report_cards(
        db, exam_id=exam.id, institution_id=test_institution.id
    )
    assert batch_dossier is not None
    assert batch_dossier["metrics"]["total_candidates"] >= 1
    assert batch_dossier["metrics"]["passed_count"] >= 1
    assert len(batch_dossier["report_cards"]) >= 1
    assert len(batch_dossier["metrics"]["toppers"]) >= 1

    # 10. Verify Cumulative Academic Year Term Progression
    cumulative = await get_cumulative_term_report(
        db, student_id=test_student.id, institution_id=test_institution.id
    )
    assert cumulative is not None
    assert cumulative["total_exams_evaluated"] >= 1
    assert cumulative["cumulative_summary"]["percentage"] == 88.25
    assert len(cumulative["term_progression"]) >= 1

    # 11. Verify Policies Endpoints via Client
    policies_res = await client.get("/api/v1/examinations/settings/policies", headers=auth_headers)
    assert policies_res.status_code == 200
    pdata = policies_res.json()
    assert "active_policies" in pdata
    assert "available_scales" in pdata
    assert len(pdata["available_scales"]) >= 4

    # Update policy to CBSE 9-Point
    update_res = await client.post(
        "/api/v1/examinations/settings/policies",
        headers=auth_headers,
        json={
            "default_grading_scale": "CBSE_9_POINT",
            "default_passing_threshold": 33,
            "grace_marks_policy": "Max 5 Grace Marks for borderline cases",
            "rank_tie_breaker": "Mathematics & Science Priority, then Roll Number",
        },
    )
    assert update_res.status_code == 200
    assert update_res.json()["status"] == "success"

    # Batch endpoint via client
    batch_endpoint_res = await client.get(
        f"/api/v1/examinations/{exam.id}/report-cards-batch",
        headers=auth_headers,
    )
    assert batch_endpoint_res.status_code == 200
    assert "metrics" in batch_endpoint_res.json()
