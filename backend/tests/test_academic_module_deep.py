# /**
#  * @file        test_academic_module_deep.py
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
#  * @created     2026-11-04
#  * @updated     2026-11-25
#  *
#  * @description Pytest integration tests verifying complete academic hierarchy, capacities, and scheduling.
#  */

import pytest
import pytest_asyncio
from datetime import date
from sqlalchemy import select
from app.models.board import Board
from app.models.standard import Standard
from app.models.division import Division
from app.models.enrollment import StudentEnrollment
from app.models.portal import TimetableEntry
from app.models.subject import Subject
from app.models.user import User


@pytest_asyncio.fixture
async def academic_deep_fixtures(db, test_institution, test_academic_year, test_student, admin_user):
    admin_user.institution_id = test_institution.id
    await db.commit()
    await db.refresh(admin_user)

    # 1. Seed 3 boards if needed
    board_objs = []
    for b_name, b_code in [("ICSE Board", "ICSE"), ("CBSE Board", "CBSE"), ("State Board", "SSC")]:
        b = (await db.execute(select(Board).where(Board.institution_id == test_institution.id, Board.code == b_code))).scalars().first()
        if not b:
            b = Board(institution_id=test_institution.id, name=b_name, code=b_code, is_active=True)
            db.add(b)
            await db.flush()
        board_objs.append(b)
    icse_board = board_objs[0]

    # 2. Seed 10 standards if needed
    standards = []
    for lvl in range(1, 11):
        s = (await db.execute(select(Standard).where(Standard.institution_id == test_institution.id, Standard.level == lvl))).scalars().first()
        if not s:
            s = Standard(institution_id=test_institution.id, name=f"Class {lvl}", level=lvl, is_active=True)
            db.add(s)
            await db.flush()
        standards.append(s)
    cls_10 = standards[-1]

    # 3. Seed Class 10 Subject
    sub = (await db.execute(select(Subject).where(Subject.standard_id == cls_10.id, Subject.code == "MATH-10"))).scalars().first()
    if not sub:
        sub = Subject(standard_id=cls_10.id, name="Mathematics", code="MATH-10", is_active=True)
        db.add(sub)
        await db.flush()

    # 4. Seed 2 divisions for Class 10
    div_a = (await db.execute(select(Division).where(Division.standard_id == cls_10.id, Division.code == "10-A"))).scalars().first()
    if not div_a:
        div_a = Division(standard_id=cls_10.id, board_id=icse_board.id, name="Batch 10-A", code="10-A", room_number="Room 101", capacity=40, status="active", is_active=True)
        db.add(div_a)
        await db.flush()

    div_b = (await db.execute(select(Division).where(Division.standard_id == cls_10.id, Division.code == "10-B"))).scalars().first()
    if not div_b:
        div_b = Division(standard_id=cls_10.id, board_id=icse_board.id, name="Batch 10-B", code="10-B", room_number="Room 102", capacity=40, status="active", is_active=True)
        db.add(div_b)
        await db.flush()

    # 5. Seed enrollment for test student in div_a
    enr = (await db.execute(select(StudentEnrollment).where(StudentEnrollment.student_id == test_student.id, StudentEnrollment.academic_year_id == test_academic_year.id))).scalars().first()
    if not enr:
        enr = StudentEnrollment(
            student_id=test_student.id,
            academic_year_id=test_academic_year.id,
            standard_id=cls_10.id,
            division_id=div_a.id,
            enrollment_date=date.today(),
            status="active"
        )
        db.add(enr)
        await db.flush()

    # 6. Seed timetable entry in Room 101 for div_a
    tt = (await db.execute(select(TimetableEntry).where(TimetableEntry.division_id == div_a.id, TimetableEntry.day_of_week == "Monday"))).scalars().first()
    if not tt:
        tt = TimetableEntry(division_id=div_a.id, subject_id=sub.id, day_of_week="Monday", start_time="16:00", end_time="17:30", room_number="Room 101")
        db.add(tt)
        await db.flush()

    await db.commit()
    return {
        "institution": test_institution,
        "academic_year": test_academic_year,
        "boards": board_objs,
        "icse_board": icse_board,
        "standards": standards,
        "cls_10": cls_10,
        "subject": sub,
        "div_a": div_a,
        "div_b": div_b,
        "enrollment": enr,
        "timetable_entry": tt,
    }


@pytest.mark.asyncio
async def test_boards_extended_crud(client, auth_headers, academic_deep_fixtures):
    # 1. List boards and verify enriched counts
    res = await client.get("/api/v1/boards/", headers=auth_headers)
    assert res.status_code == 200
    boards = res.json()
    assert len(boards) >= 3
    # Check ICSE exists with counts
    icse = next((b for b in boards if b["code"] == "ICSE"), None)
    assert icse is not None
    assert "classes_count" in icse
    assert "batches_count" in icse
    assert "students_count" in icse
    assert icse["batches_count"] >= 1

    # 2. Toggle status
    toggle_res = await client.put(f"/api/v1/boards/{icse['id']}/toggle-status", headers=auth_headers)
    assert toggle_res.status_code == 200
    # Toggle back to active
    await client.put(f"/api/v1/boards/{icse['id']}/toggle-status", headers=auth_headers)


@pytest.mark.asyncio
async def test_standards_extended_crud(client, auth_headers, academic_deep_fixtures):
    res = await client.get("/api/v1/standards/", headers=auth_headers)
    assert res.status_code == 200
    standards = res.json()
    assert len(standards) >= 10
    cls_10 = next((s for s in standards if s["level"] == 10), None)
    assert cls_10 is not None
    assert "batches_count" in cls_10
    assert "subjects_count" in cls_10
    assert "students_count" in cls_10
    assert cls_10["subjects_count"] >= 1


@pytest.mark.asyncio
async def test_subjects_full_crud(client, auth_headers, academic_deep_fixtures):
    cls_10 = academic_deep_fixtures["cls_10"]
    # 1. List subjects
    res = await client.get(f"/api/v1/subjects/?standard_id={cls_10.id}", headers=auth_headers)
    assert res.status_code == 200
    subjects = res.json()
    assert len(subjects) >= 1
    assert "standard_name" in subjects[0]

    # 2. Create a test subject
    create_res = await client.post(
        "/api/v1/subjects/",
        headers=auth_headers,
        json={
            "standard_id": cls_10.id,
            "name": "Robotics & AI",
            "code": "ROBO-10",
            "max_marks": 100,
            "pass_marks": 40,
            "is_optional": True,
        },
    )
    assert create_res.status_code == 201
    sub_id = create_res.json()["id"]

    # 3. Update subject
    update_res = await client.put(
        f"/api/v1/subjects/{sub_id}",
        headers=auth_headers,
        json={"name": "Advanced Robotics & AI", "max_marks": 100},
    )
    assert update_res.status_code == 200

    # 4. Deactivate subject
    del_res = await client.delete(f"/api/v1/subjects/{sub_id}", headers=auth_headers)
    assert del_res.status_code == 200


@pytest.mark.asyncio
async def test_timetable_crud_and_conflict_validation(client, auth_headers, academic_deep_fixtures):
    div_a = academic_deep_fixtures["div_a"]
    div_b = academic_deep_fixtures["div_b"]
    sub = academic_deep_fixtures["subject"]

    # 1. List timetable sessions
    res = await client.get(f"/api/v1/timetable/?division_id={div_a.id}", headers=auth_headers)
    assert res.status_code == 200
    entries = res.json()
    assert len(entries) >= 1
    first_entry = entries[0]
    assert "day_of_week" in first_entry
    assert "room_number" in first_entry

    # 2. List rooms
    rooms_res = await client.get("/api/v1/timetable/rooms", headers=auth_headers)
    assert rooms_res.status_code == 200
    assert len(rooms_res.json()) >= 1

    # 3. Test Conflict Detection (Same room, overlapping time)
    conflict_res = await client.post(
        "/api/v1/timetable/check-conflict",
        headers=auth_headers,
        json={
            "room_number": "Room 101",
            "day_of_week": "Monday",
            "start_time": "16:30",
            "end_time": "18:00",
            "division_id": div_b.id,
        },
    )
    assert conflict_res.status_code == 200
    assert conflict_res.json()["has_conflict"] is True
    assert conflict_res.json()["conflict_type"] == "room"

    # 4. Create conflict-free session
    create_res = await client.post(
        "/api/v1/timetable/",
        headers=auth_headers,
        json={
            "division_id": div_a.id,
            "subject_id": sub.id,
            "day_of_week": "Sunday",
            "start_time": "08:00",
            "end_time": "09:30",
            "room_number": "Lab 99",
        },
    )
    assert create_res.status_code == 201
    entry_id = create_res.json()["id"]

    # 5. Clean up session
    del_res = await client.delete(f"/api/v1/timetable/{entry_id}", headers=auth_headers)
    assert del_res.status_code == 200


@pytest.mark.asyncio
async def test_enrollments_listing_and_transfer(client, auth_headers, academic_deep_fixtures):
    div_b = academic_deep_fixtures["div_b"]
    enr = academic_deep_fixtures["enrollment"]

    # 1. Get stats
    stats_res = await client.get("/api/v1/enrollments/stats", headers=auth_headers)
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert stats["total_active_enrollments"] >= 1

    # 2. List enrollments
    list_res = await client.get("/api/v1/enrollments/?status=active", headers=auth_headers)
    assert list_res.status_code == 200
    data = list_res.json()
    assert data["total"] >= 1
    first_enr = next(e for e in data["items"] if e.get("status") == "active")
    assert "admission_number" in first_enr
    assert "division_name" in first_enr

    # 3. Test Transfer Batch: student transferred to another division
    transfer_res = await client.post(
        "/api/v1/enrollments/transfer",
        headers=auth_headers,
        json={
            "enrollment_id": enr.id,
            "new_division_id": div_b.id,
            "transfer_reason": "Performance stream promotion",
        },
    )
    assert transfer_res.status_code == 200
    new_enr_id = transfer_res.json()["new_enrollment_id"]

    # Verify old enrollment is marked transferred
    check_res = await client.get(f"/api/v1/enrollments/?division_id={div_b.id}", headers=auth_headers)
    assert check_res.status_code == 200
    items = check_res.json()["items"]
    assert any(e["id"] == new_enr_id for e in items)


@pytest.mark.asyncio
async def test_academic_reports_endpoints(client, auth_headers, academic_deep_fixtures):
    # 1. Batch capacity report
    cap_res = await client.get("/api/v1/reports/academic/batch-capacity", headers=auth_headers)
    assert cap_res.status_code == 200
    rows = cap_res.json()
    assert len(rows) >= 1
    assert "occupancy_percentage" in rows[0]

    # 2. Distribution report
    dist_res = await client.get("/api/v1/reports/academic/distribution", headers=auth_headers)
    assert dist_res.status_code == 200
    assert len(dist_res.json()) >= 1

    # 3. Faculty load report
    fac_res = await client.get("/api/v1/reports/academic/faculty-load", headers=auth_headers)
    assert fac_res.status_code == 200
    assert isinstance(fac_res.json(), list)

    # 4. CSV export
    exp_res = await client.get("/api/v1/reports/academic/export?report_type=batch-capacity", headers=auth_headers)
    assert exp_res.status_code == 200
    assert "text/csv" in exp_res.headers["content-type"]
    assert "batch_name" in exp_res.text

