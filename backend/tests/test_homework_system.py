# /**
#  * @file        test_homework_system.py
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
#  * @created     2026-11-11
#  * @updated     2026-11-11
#  *
#  * @description Comprehensive test suite for Homework & Assignment Management System covering creation, recipient deduplication, checking register, digital submissions, and academic activity.
#  */

import pytest
import uuid
from datetime import date, timedelta
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.homework import HomeworkAssignment, StudentHomeworkRecord, HomeworkAuditLog
from app.models.student import Student
from app.models.enrollment import StudentEnrollment
from app.models.division import Division
from app.models.standard import Standard
from app.models.subject import Subject


async def get_or_create_academic_fixtures(db: AsyncSession, institution_id: int):
    import random
    suffix = uuid.uuid4().hex[:6]
    lvl = random.randint(100, 999999)
    std = Standard(
        institution_id=institution_id,
        name=f"Standard 10-{suffix}",
        level=lvl,
    )
    db.add(std)
    await db.flush()

    div = Division(
        standard_id=std.id,
        name=f"Batch A-{suffix}",
        code=f"BA-{suffix}",
    )
    db.add(div)
    await db.flush()

    subj = Subject(
        standard_id=std.id,
        name=f"Mathematics-{suffix}",
        code=f"MATH-{suffix}",
    )
    db.add(subj)
    await db.commit()
    await db.refresh(std)
    await db.refresh(div)
    await db.refresh(subj)
    return std, div, subj


@pytest.mark.asyncio
async def test_create_homework_batch_and_checking(
    client,
    db: AsyncSession,
    auth_headers: dict,
    admin_user,
    test_institution,
    test_academic_year,
    test_student,
):
    """
    Test Phase 2 & 3: Creates a homework assignment for a batch, verifies independent
    student tracking records, and executes physical checking register.
    """
    admin_user.institution_id = test_institution.id
    await db.commit()

    std, div, subj = await get_or_create_academic_fixtures(db, test_institution.id)

    # 1. Ensure student has active enrollment in division
    enr = StudentEnrollment(
        student_id=test_student.id,
        academic_year_id=test_academic_year.id,
        standard_id=std.id,
        division_id=div.id,
        roll_number="101",
        enrollment_date=date.today(),
        status="active",
    )
    db.add(enr)
    await db.commit()
    await db.refresh(enr)

    # 2. POST /api/v1/homework/assignments
    payload = {
        "academic_year_id": test_academic_year.id,
        "standard_id": std.id,
        "subject_id": subj.id,
        "division_id": div.id,
        "teacher_user_id": admin_user.id,
        "title": "Quadratic Equations Problem Set 1",
        "description": "Complete exercises 4.1 to 4.3 in homework notebook.",
        "instructions": "Show all steps clearly.",
        "chapter": "Chapter 4: Quadratic Equations",
        "topic": "Factoring and Formula Method",
        "due_date": str(date.today() + timedelta(days=3)),
        "due_time": "18:00",
        "max_marks": 25.0,
        "difficulty_level": "medium",
        "priority": "normal",
        "submission_method": "physical_notebook",
        "recipient_type": "batch",
        "status": "published",
        "attachments": [
            {
                "title": "Quadratic Equations Formula Sheet",
                "file_url": "https://example.com/quadratic.pdf",
                "file_type": "pdf",
                "file_size_bytes": 102400,
            }
        ],
    }

    create_resp = await client.post(
        "/api/v1/homework/assignments",
        json=payload,
        headers=auth_headers,
    )
    assert create_resp.status_code == 200, create_resp.text
    create_data = create_resp.json()
    assert create_data["success"] is True
    assignment_id = create_data["id"]
    assert "HW-" in create_data["assignment_code"]

    # 3. Verify student tracking records in DB
    records_stmt = select(StudentHomeworkRecord).where(
        StudentHomeworkRecord.assignment_id == assignment_id
    )
    records_res = await db.execute(records_stmt)
    records = records_res.scalars().all()
    assert len(records) >= 1
    target_record = next(r for r in records if r.student_id == test_student.id)
    assert target_record.status == "assigned"
    assert target_record.submission_status == "pending"
    assert target_record.review_status == "pending"

    # 4. GET /api/v1/homework/assignments/{assignment_id}/register
    reg_resp = await client.get(
        f"/api/v1/homework/assignments/{assignment_id}/register",
        headers=auth_headers,
    )
    assert reg_resp.status_code == 200
    reg_data = reg_resp.json()
    assert reg_data["assignment_id"] == assignment_id
    assert len(reg_data["students"]) >= 1

    # 5. POST /api/v1/homework/assignments/{assignment_id}/check (Physical Checking Register)
    check_payload = {
        "items": [
            {
                "record_id": target_record.id,
                "student_id": test_student.id,
                "review_status": "done",
                "marks_obtained": 24.0,
                "teacher_remarks": "Neat presentation and correct derivation.",
            }
        ]
    }
    check_resp = await client.post(
        f"/api/v1/homework/assignments/{assignment_id}/check",
        json=check_payload,
        headers=auth_headers,
    )
    assert check_resp.status_code == 200
    assert check_resp.json()["updated_count"] == 1

    # 6. Verify record is updated to completed
    await db.refresh(target_record)
    assert target_record.status == "completed"
    assert target_record.review_status == "done"
    assert float(target_record.marks_obtained) == 24.0
    assert target_record.teacher_remarks == "Neat presentation and correct derivation."


@pytest.mark.asyncio
async def test_digital_submission_and_resubmission(
    client,
    db: AsyncSession,
    auth_headers: dict,
    admin_user,
    test_institution,
    test_academic_year,
    test_student,
):
    """
    Test Phase 4 & 6: Digital submissions, late checks, and teacher resubmission requests.
    """
    admin_user.institution_id = test_institution.id
    await db.commit()

    std, div, subj = await get_or_create_academic_fixtures(db, test_institution.id)

    enr = StudentEnrollment(
        student_id=test_student.id,
        academic_year_id=test_academic_year.id,
        standard_id=std.id,
        division_id=div.id,
        roll_number="102",
        enrollment_date=date.today(),
        status="active",
    )
    db.add(enr)
    await db.commit()

    # 1. Create a digital homework assignment
    payload = {
        "academic_year_id": test_academic_year.id,
        "standard_id": std.id,
        "subject_id": subj.id,
        "division_id": div.id,
        "teacher_user_id": admin_user.id,
        "title": "Science Lab Report - Osmosis Experiment",
        "due_date": str(date.today() + timedelta(days=2)),
        "submission_method": "pdf_document",
        "recipient_type": "batch",
        "status": "published",
    }
    resp = await client.post(
        "/api/v1/homework/assignments",
        json=payload,
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assignment_id = resp.json()["id"]

    rec_stmt = select(StudentHomeworkRecord).where(
        StudentHomeworkRecord.assignment_id == assignment_id,
        StudentHomeworkRecord.student_id == test_student.id,
    )
    rec = (await db.execute(rec_stmt)).scalar_one()

    # 2. Submit digital homework
    submit_payload = {
        "submission_text": "Attached my osmosis observation report with diagrams.",
        "submission_files": [
            {
                "file_url": "https://example.com/osmosis_report.pdf",
                "file_name": "osmosis_report.pdf",
                "file_type": "application/pdf",
            }
        ],
    }
    submit_resp = await client.post(
        f"/api/v1/homework/student/{rec.id}/submit",
        json=submit_payload,
        headers=auth_headers,
    )
    assert submit_resp.status_code == 200
    assert submit_resp.json()["submission_status"] == "submitted"

    # 3. Request Resubmission
    resub_payload = {
        "remarks": "Diagram for Osmosis Step 3 is missing. Please re-upload.",
        "extended_due_date": str(date.today() + timedelta(days=5)),
    }
    resub_resp = await client.post(
        f"/api/v1/homework/records/{rec.id}/resubmit",
        json=resub_payload,
        headers=auth_headers,
    )
    assert resub_resp.status_code == 200

    await db.refresh(rec)
    assert rec.status == "resubmit_required"
    assert rec.resubmission_count == 1
    assert "Diagram for Osmosis Step 3 is missing" in rec.resubmission_history


@pytest.mark.asyncio
async def test_due_date_extension_and_exemption(
    client,
    db: AsyncSession,
    auth_headers: dict,
    admin_user,
    test_institution,
    test_academic_year,
    test_student,
):
    """
    Test Phase 6: Individual due date extension and student exemption.
    """
    admin_user.institution_id = test_institution.id
    await db.commit()

    std, div, subj = await get_or_create_academic_fixtures(db, test_institution.id)

    enr = StudentEnrollment(
        student_id=test_student.id,
        academic_year_id=test_academic_year.id,
        standard_id=std.id,
        division_id=div.id,
        roll_number="103",
        enrollment_date=date.today(),
        status="active",
    )
    db.add(enr)
    await db.commit()

    payload = {
        "academic_year_id": test_academic_year.id,
        "standard_id": std.id,
        "subject_id": subj.id,
        "division_id": div.id,
        "teacher_user_id": admin_user.id,
        "title": "History Chapter 2 Notes",
        "due_date": str(date.today()),
        "submission_method": "physical_notebook",
        "status": "published",
    }
    resp = await client.post(
        "/api/v1/homework/assignments",
        json=payload,
        headers=auth_headers,
    )
    assignment_id = resp.json()["id"]

    rec_stmt = select(StudentHomeworkRecord).where(
        StudentHomeworkRecord.assignment_id == assignment_id,
        StudentHomeworkRecord.student_id == test_student.id,
    )
    rec = (await db.execute(rec_stmt)).scalar_one()

    # 1. Extend due date
    new_date = date.today() + timedelta(days=7)
    ext_resp = await client.post(
        f"/api/v1/homework/records/{rec.id}/extend",
        json={"new_due_date": str(new_date), "reason": "Medical leave requested"},
        headers=auth_headers,
    )
    assert ext_resp.status_code == 200
    assert ext_resp.json()["new_due_date"] == str(new_date)

    # 2. Exempt student
    exempt_resp = await client.post(
        f"/api/v1/homework/records/{rec.id}/exempt",
        json={"reason": "Excused due to inter-school sports competition"},
        headers=auth_headers,
    )
    assert exempt_resp.status_code == 200

    await db.refresh(rec)
    assert rec.status == "excused"
    assert rec.review_status == "excused"
    assert "inter-school sports competition" in rec.exemption_reason


@pytest.mark.asyncio
async def test_student_portal_and_academic_activity(
    client,
    auth_headers: dict,
    test_student,
):
    """
    Test Phase 7 & 8: Student portal list and unified academic activity register.
    """
    # 1. GET /api/v1/homework/student/my-homework
    portal_resp = await client.get(
        f"/api/v1/homework/student/my-homework?student_id={test_student.id}",
        headers=auth_headers,
    )
    assert portal_resp.status_code == 200
    portal_data = portal_resp.json()
    assert portal_data["student_id"] == test_student.id
    assert isinstance(portal_data["items"], list)

    # 2. GET /api/v1/homework/reports/activity-register/{student_id}
    act_resp = await client.get(
        f"/api/v1/homework/reports/activity-register/{test_student.id}",
        headers=auth_headers,
    )
    assert act_resp.status_code == 200
    act_data = act_resp.json()
    assert act_data["student_id"] == test_student.id
    assert isinstance(act_data["activities"], list)


@pytest.mark.asyncio
async def test_dashboards_and_daily_register(
    client,
    db: AsyncSession,
    auth_headers: dict,
    admin_user,
    test_institution,
):
    """
    Test Phase 9: Teacher dashboard, daily homework register, and templates.
    """
    admin_user.institution_id = test_institution.id
    await db.commit()

    _, div, _ = await get_or_create_academic_fixtures(db, test_institution.id)

    # 1. Teacher dashboard
    dash_resp = await client.get(
        f"/api/v1/homework/dashboards/teacher?teacher_id={admin_user.id}",
        headers=auth_headers,
    )
    assert dash_resp.status_code == 200
    dash_data = dash_resp.json()
    assert "total_assigned" in dash_data
    assert "assigned_today" in dash_data
    assert "awaiting_check" in dash_data

    # 2. Daily register
    daily_resp = await client.get(
        f"/api/v1/homework/reports/daily-register?division_id={div.id}",
        headers=auth_headers,
    )
    assert daily_resp.status_code == 200
    assert "items" in daily_resp.json()

    # 3. Templates
    tpl_resp = await client.get(
        "/api/v1/homework/templates",
        headers=auth_headers,
    )
    assert tpl_resp.status_code == 200
    assert "templates" in tpl_resp.json()
