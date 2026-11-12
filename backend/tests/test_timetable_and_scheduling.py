# /**
#  * @file        test_timetable_and_scheduling.py
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
#  * @created     2026-11-13
#  * @updated     2026-11-13
#  *
#  * @description Pytest test suite for timetable scheduling, conflict checks, weekly matrix, and export docket.
#  */

import pytest
from app.models.standard import Standard
from app.models.subject import Subject
from app.models.division import Division
from app.models.user import User
from app.core.security import get_password_hash


@pytest.mark.asyncio
async def test_timetable_scheduling_studio_lifecycle(
    db, client, test_institution, test_academic_year, admin_user, auth_headers
):
    admin_user.institution_id = test_institution.id
    await db.commit()
    await db.refresh(admin_user)

    # 1. Setup Standard, Division & Subjects
    standard = Standard(
        institution_id=test_institution.id,
        name="Standard 9 - Science Stream",
        level=9,
    )
    db.add(standard)
    await db.flush()

    math_sub = Subject(
        standard_id=standard.id,
        name="Advanced Mathematics",
        code="MTH-09",
        max_marks=100,
        pass_marks=35,
    )
    sci_sub = Subject(
        standard_id=standard.id,
        name="Physics & Chemistry",
        code="PHY-09",
        max_marks=100,
        pass_marks=35,
    )
    db.add_all([math_sub, sci_sub])
    await db.flush()

    # Create faculty user
    teacher_user = User(
        username="prof_ramanujan",
        email="ramanujan@test.com",
        hashed_password=get_password_hash("testpassword"),
        first_name="Srinivasa",
        last_name="Ramanujan",
        role="teacher",
        institution_id=test_institution.id,
    )
    db.add(teacher_user)
    await db.flush()

    div_a = Division(
        standard_id=standard.id,
        name="Division A",
        code="9-A",
        room_number="Room 201",
        class_teacher_id=teacher_user.id,
    )
    div_b = Division(
        standard_id=standard.id,
        name="Division B",
        code="9-B",
        room_number="Room 202",
        class_teacher_id=admin_user.id,
    )
    db.add_all([div_a, div_b])
    await db.commit()
    await db.refresh(div_a)
    await db.refresh(div_b)

    # 2. Schedule First Timetable Session for Division A
    create_res = await client.post(
        "/api/v1/timetable/",
        headers=auth_headers,
        json={
            "division_id": div_a.id,
            "subject_id": math_sub.id,
            "teacher_id": teacher_user.id,
            "day_of_week": "Monday",
            "start_time": "08:30",
            "end_time": "09:30",
            "room_number": "Room 201",
        },
    )
    assert create_res.status_code == 201
    entry_id = create_res.json()["id"]

    # 3. Test Room Conflict: Division B trying to book Room 201 at overlapping time
    room_conflict_res = await client.post(
        "/api/v1/timetable/check-conflict",
        headers=auth_headers,
        json={
            "room_number": "Room 201",
            "day_of_week": "Monday",
            "start_time": "09:00",
            "end_time": "10:00",
            "division_id": div_b.id,
        },
    )
    assert room_conflict_res.status_code == 200
    rc_data = room_conflict_res.json()
    assert rc_data["has_conflict"] is True
    assert rc_data["conflict_type"] == "room"

    # 4. Test Batch Conflict: Division A booked for another class at the same time
    batch_conflict_res = await client.post(
        "/api/v1/timetable/check-conflict",
        headers=auth_headers,
        json={
            "room_number": "Room 205",
            "day_of_week": "Monday",
            "start_time": "08:45",
            "end_time": "09:45",
            "division_id": div_a.id,
        },
    )
    assert batch_conflict_res.status_code == 200
    bc_data = batch_conflict_res.json()
    assert bc_data["has_conflict"] is True
    assert bc_data["conflict_type"] == "batch"

    # 5. Test Teacher Conflict: Teacher Ramanujan cannot teach Division B at same time
    teacher_conflict_res = await client.post(
        "/api/v1/timetable/check-conflict",
        headers=auth_headers,
        json={
            "room_number": "Room 202",
            "day_of_week": "Monday",
            "start_time": "08:30",
            "end_time": "09:30",
            "division_id": div_b.id,
            "teacher_id": teacher_user.id,
        },
    )
    assert teacher_conflict_res.status_code == 200
    tc_data = teacher_conflict_res.json()
    assert tc_data["has_conflict"] is True
    assert tc_data["conflict_type"] == "teacher"

    # 6. Verify Weekly Timetable Matrix
    matrix_res = await client.get(
        f"/api/v1/timetable/matrix?division_id={div_a.id}",
        headers=auth_headers,
    )
    assert matrix_res.status_code == 200
    m_data = matrix_res.json()
    assert "days" in m_data
    assert "slots" in m_data
    assert "matrix" in m_data
    assert "Monday" in m_data["matrix"]
    assert "08:30-09:30" in m_data["matrix"]["Monday"]
    session_cell = m_data["matrix"]["Monday"]["08:30-09:30"]
    assert session_cell["subject_name"] == "Advanced Mathematics"
    assert session_cell["teacher_name"] == "Srinivasa Ramanujan"
    assert session_cell["teacher_id"] == teacher_user.id
    assert m_data["summary"]["total_sessions"] == 1

    # 7. Verify Printable Timetable Docket
    docket_res = await client.get(
        f"/api/v1/timetable/export/docket?division_id={div_a.id}",
        headers=auth_headers,
    )
    assert docket_res.status_code == 200
    docket = docket_res.json()
    assert "institution" in docket
    assert "academic_year" in docket
    assert docket["docket_type"] == "division"
    assert docket["scope"]["name"] == "Division A"
    assert "signatures" in docket

    # 8. Batch Generate Period Slots
    batch_gen_res = await client.post(
        "/api/v1/timetable/batch-generate-slots",
        headers=auth_headers,
        json={
            "division_id": div_b.id,
            "subject_id": sci_sub.id,
            "teacher_id": admin_user.id,
            "room_number": "Room 202",
            "period_duration_mins": 45,
            "start_time": "10:00",
            "number_of_periods": 3,
            "break_after_period": 2,
            "break_duration_mins": 15,
            "days": ["Tuesday", "Wednesday"],
        },
    )
    assert batch_gen_res.status_code == 201
    assert batch_gen_res.json()["created_count"] == 6  # 3 periods * 2 days

    # 9. Update Session
    update_res = await client.put(
        f"/api/v1/timetable/{entry_id}",
        headers=auth_headers,
        json={
            "room_number": "Room 201-B",
        },
    )
    assert update_res.status_code == 200

    # 10. Delete Session (Soft Delete)
    del_res = await client.delete(
        f"/api/v1/timetable/{entry_id}",
        headers=auth_headers,
    )
    assert del_res.status_code == 200

    # Verify deleted session not in active matrix
    matrix_after_del = await client.get(
        f"/api/v1/timetable/matrix?division_id={div_a.id}",
        headers=auth_headers,
    )
    assert matrix_after_del.status_code == 200
    assert matrix_after_del.json()["summary"]["total_sessions"] == 0
