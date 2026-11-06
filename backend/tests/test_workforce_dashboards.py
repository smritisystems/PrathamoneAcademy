# /**
#  * @file        test_workforce_dashboards.py
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
#  * @description Pytest test suite for dedicated Teacher & Staff workforce dashboards, unassigned teacher logic, employment lifecycle transitions, and unified employee activity history.
#  */

import pytest
from datetime import date
from decimal import Decimal

from app.models.user import User
from app.models.staff import StaffProfile, TeacherAssignment, StaffEmploymentHistory
from app.models.portal import TimetableEntry
from app.models.standard import Standard
from app.models.division import Division
from app.models.subject import Subject
from app.models.board import Board
from app.services.workforce_service import (
    get_teacher_workforce_dashboard,
    get_staff_workforce_dashboard,
    update_employee_lifecycle,
    get_employee_activity_history,
)


@pytest.mark.asyncio
async def test_teacher_dashboard_and_assignment_status(
    db, test_institution, test_academic_year, admin_user
):
    """Verifies teacher assignment categorization: unassigned vs assigned vs without timetable."""
    # 1. Create a Teacher User & Staff Profile
    teacher = User(
        institution_id=test_institution.id,
        username="prof_sharma",
        email="sharma@prashantacademy.com",
        hashed_password="hashed_pwd_123",
        first_name="Ramesh",
        last_name="Sharma",
        role="teacher",
        staff_code="TCH-2026-008",
        is_active=True,
    )
    db.add(teacher)
    await db.flush()

    profile = StaffProfile(
        user_id=teacher.id,
        institution_id=test_institution.id,
        employee_id="TCH-2026-008",
        staff_type="teacher",
        department="Mathematics",
        status="active",
        joining_date=date.today(),
    )
    db.add(profile)
    await db.commit()

    # Initial check: Teacher must be unassigned
    dashboard = await get_teacher_workforce_dashboard(
        db, institution_id=test_institution.id, academic_year_id=test_academic_year.id
    )
    assert dashboard["metrics"]["total_teachers"] >= 1
    assert dashboard["metrics"]["unassigned_teachers"] >= 1

    tch_item = next(t for t in dashboard["teachers"] if t["id"] == teacher.id)
    assert tch_item["is_assigned"] is False
    assert tch_item["has_timetable"] is False

    # 2. Assign Teacher to Division & Subject
    standard = Standard(institution_id=test_institution.id, name="Std 10", level=10)
    db.add(standard)
    await db.flush()

    division = Division(standard_id=standard.id, name="Div A")
    db.add(division)
    await db.flush()

    subject = Subject(standard_id=standard.id, name="Advanced Algebra", code="ALG10", max_marks=100, pass_marks=35)
    db.add(subject)
    await db.flush()

    board = Board(institution_id=test_institution.id, name="CBSE Board", code="CBSE")
    db.add(board)
    await db.flush()

    assignment = TeacherAssignment(
        teacher_user_id=teacher.id,
        academic_year_id=test_academic_year.id,
        board_id=board.id,
        standard_id=standard.id,
        division_id=division.id,
        subject_id=subject.id,
        weekly_hours=5.0,
        is_active=True,
    )
    db.add(assignment)
    await db.commit()

    # Re-check: Teacher is now assigned, but without timetable
    dashboard2 = await get_teacher_workforce_dashboard(
        db, institution_id=test_institution.id, academic_year_id=test_academic_year.id
    )
    tch_item2 = next(t for t in dashboard2["teachers"] if t["id"] == teacher.id)
    assert tch_item2["is_assigned"] is True
    assert tch_item2["has_timetable"] is False
    assert dashboard2["metrics"]["teachers_without_timetable"] >= 1

    # 3. Add Timetable Entry
    tt_entry = TimetableEntry(
        division_id=division.id,
        subject_id=subject.id,
        teacher_id=teacher.id,
        day_of_week="Monday",
        start_time="09:00",
        end_time="10:00",
        is_active=True,
    )
    db.add(tt_entry)
    await db.commit()

    # Final check: Teacher now has timetable
    dashboard3 = await get_teacher_workforce_dashboard(
        db, institution_id=test_institution.id, academic_year_id=test_academic_year.id
    )
    tch_item3 = next(t for t in dashboard3["teachers"] if t["id"] == teacher.id)
    assert tch_item3["is_assigned"] is True
    assert tch_item3["has_timetable"] is True


@pytest.mark.asyncio
async def test_employee_lifecycle_transitions_and_rehire(
    db, test_institution, admin_user
):
    """Verifies employment lifecycle state transitions, resignation, termination, and rehire continuity."""
    employee = User(
        institution_id=test_institution.id,
        username="staff_sunita",
        email="sunita@prashantacademy.com",
        hashed_password="hashed_pwd_999",
        first_name="Sunita",
        last_name="Patil",
        role="staff",
        staff_code="STF-2026-015",
        is_active=True,
    )
    db.add(employee)
    await db.flush()

    profile = StaffProfile(
        user_id=employee.id,
        institution_id=test_institution.id,
        employee_id="STF-2026-015",
        staff_type="counselor",
        department="Student Counseling",
        status="active",
        joining_date=date(2025, 1, 1),
    )
    db.add(profile)
    await db.commit()

    # 1. Resign Employee
    res_result = await update_employee_lifecycle(
        db=db,
        user_id=employee.id,
        action="resign",
        effective_date=date(2026, 5, 31),
        reason="Relocating to another city",
        rehire_eligible=True,
        current_user_id=admin_user.id,
    )
    assert res_result["status"] == "success"
    assert res_result["new_status"] == "resigned"
    assert res_result["is_active"] is False

    await db.refresh(profile)
    assert profile.status == "resigned"
    assert profile.exit_date == date(2026, 5, 31)
    assert profile.exit_reason == "Relocating to another city"
    assert profile.rehire_eligible is True

    # 2. Rehire Same Employee without duplicating identity
    rehire_result = await update_employee_lifecycle(
        db=db,
        user_id=employee.id,
        action="rehire",
        effective_date=date(2026, 11, 1),
        reason="Returned to Pune, rejoined academy",
        rehire_eligible=True,
        current_user_id=admin_user.id,
    )
    assert rehire_result["status"] == "success"
    assert rehire_result["new_status"] == "active"
    assert rehire_result["is_active"] is True

    await db.refresh(profile)
    assert profile.status == "active"
    assert profile.exit_date is None

    # Check history entries
    history_entries = await get_employee_activity_history(db, user_id=employee.id)
    lifecycle_events = [e for e in history_entries if e["category"] == "lifecycle"]
    assert len(lifecycle_events) >= 2
    assert any(e["event_type"] == "resign" for e in lifecycle_events)
    assert any(e["event_type"] == "rehire" for e in lifecycle_events)


@pytest.mark.asyncio
async def test_non_teaching_staff_dashboard(db, test_institution):
    """Verifies non-teaching staff dashboard metrics and department headcounts."""
    staff_dash = await get_staff_workforce_dashboard(db, institution_id=test_institution.id)
    assert "metrics" in staff_dash
    assert "total_staff" in staff_dash["metrics"]
    assert "department_headcounts" in staff_dash
    assert "staff" in staff_dash
