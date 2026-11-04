# /**
#  * @file        test_academic_workspace.py
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
#  * @created     2026-11-04
#  * @updated     2026-11-04
#  *
#  * @description Pytest suite testing academic structure CRUD endpoints, tree queries, and batch rosters.
#  */

import pytest
from datetime import date
from sqlalchemy import select
from app.models.board import Board
from app.models.standard import Standard
from app.models.division import Division
from app.models.enrollment import StudentEnrollment
from app.models.portal import TimetableEntry
from app.models.subject import Subject


@pytest.mark.asyncio
async def test_academic_overview_and_structure(client, auth_headers, db, test_institution, test_academic_year, test_student):
    board = Board(
        institution_id=test_institution.id,
        name="ICSE Board",
        code="ICSE",
        is_active=True,
    )
    db.add(board)
    await db.flush()

    standard = Standard(
        institution_id=test_institution.id,
        name="Class X",
        level=10,
        is_active=True,
    )
    db.add(standard)
    await db.flush()

    subject = Subject(
        standard_id=standard.id,
        name="Mathematics",
        code="MATH-10",
        is_active=True,
    )
    db.add(subject)
    await db.flush()

    division = Division(
        standard_id=standard.id,
        board_id=board.id,
        name="Batch A (Morning)",
        code="ICSE-X-A",
        room_number="Room 1",
        schedule_timing="Mon - Fri, 07:00 AM - 09:00 AM",
        capacity=40,
        status="active",
        is_active=True,
    )
    db.add(division)
    await db.flush()

    enrollment = StudentEnrollment(
        student_id=test_student.id,
        academic_year_id=test_academic_year.id,
        standard_id=standard.id,
        division_id=division.id,
        roll_number="ICSEX-01",
        enrollment_date=date(2024, 4, 1),
        status="active",
    )
    db.add(enrollment)

    tt = TimetableEntry(
        division_id=division.id,
        subject_id=subject.id,
        day_of_week="Monday",
        start_time="07:00",
        end_time="09:00",
        room_number="Room 1",
        is_active=True,
    )
    db.add(tt)
    await db.commit()

    # Test Overview Endpoint
    res = await client.get("/api/v1/standards/academic-overview", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert "metrics" in data
    assert "structure_tree" in data

    metrics = data["metrics"]
    assert metrics["total_students"] >= 1
    assert metrics["total_classes"] >= 1
    assert metrics["active_batches"] >= 1
    assert metrics["enrolled_seats"] >= 1
    assert metrics["weekly_sessions"] >= 1

    # Check Structure Tree
    tree = data["structure_tree"]
    assert len(tree) >= 1
    found_icse = next((b for b in tree if b["board_code"] == "ICSE"), None)
    assert found_icse is not None
    assert len(found_icse["classes"]) >= 1


@pytest.mark.asyncio
async def test_divisions_listing_filtering_and_roster(client, auth_headers, db, test_institution, test_academic_year, test_student):
    board = Board(
        institution_id=test_institution.id,
        name="CBSE Board",
        code="CBSE",
        is_active=True,
    )
    db.add(board)
    await db.flush()

    standard = Standard(
        institution_id=test_institution.id,
        name="Class IX",
        level=9,
        is_active=True,
    )
    db.add(standard)
    await db.flush()

    division = Division(
        standard_id=standard.id,
        board_id=board.id,
        name="Batch A (Morning)",
        code="CBSE-IX-A",
        room_number="Room 2",
        schedule_timing="Mon - Fri, 07:00 AM - 09:00 AM",
        capacity=40,
        status="active",
        is_active=True,
    )
    db.add(division)
    await db.flush()

    enrollment = StudentEnrollment(
        student_id=test_student.id,
        academic_year_id=test_academic_year.id,
        standard_id=standard.id,
        division_id=division.id,
        roll_number="CBSE-01",
        enrollment_date=date(2024, 4, 1),
        status="active",
    )
    db.add(enrollment)

    subj = Subject(
        standard_id=standard.id,
        name="Science",
        code="SCI-9",
        is_active=True,
    )
    db.add(subj)
    await db.flush()

    tt = TimetableEntry(
        division_id=division.id,
        subject_id=subj.id,
        day_of_week="Monday",
        start_time="07:00",
        end_time="09:00",
        room_number="Room 2",
        is_active=True,
    )
    db.add(tt)
    await db.commit()

    # 1. List Divisions
    res = await client.get("/api/v1/divisions/", headers=auth_headers)
    assert res.status_code == 200
    divisions = res.json()
    assert len(divisions) >= 1

    div = divisions[0]
    assert "name" in div
    assert "code" in div
    assert "capacity" in div
    assert "enrolled_count" in div
    assert "occupancy_percentage" in div

    # 2. Get Roster
    div_id = division.id
    roster_res = await client.get(f"/api/v1/divisions/{div_id}/roster", headers=auth_headers)
    assert roster_res.status_code == 200
    roster_data = roster_res.json()
    assert "students" in roster_data
    assert roster_data["batch_id"] == div_id
    assert len(roster_data["students"]) >= 1

    # 3. Conflict Detection
    conflict_res = await client.post(
        "/api/v1/divisions/check-conflict",
        headers=auth_headers,
        json={
            "room_number": "Room 2",
            "day_of_week": "Monday",
            "start_time": "07:30",
            "end_time": "08:30",
        },
    )
    assert conflict_res.status_code == 200
    assert conflict_res.json()["has_conflict"] is True
    assert conflict_res.json()["conflict_type"] == "room"

    # Non-conflicting time
    ok_res = await client.post(
        "/api/v1/divisions/check-conflict",
        headers=auth_headers,
        json={
            "room_number": "Room 2",
            "day_of_week": "Monday",
            "start_time": "10:00",
            "end_time": "12:00",
        },
    )
    assert ok_res.status_code == 200
    assert ok_res.json()["has_conflict"] is False


@pytest.mark.asyncio
async def test_division_create_and_archive(client, auth_headers, db, test_institution):
    std = Standard(
        institution_id=test_institution.id,
        name="Class VIII",
        level=8,
        is_active=True,
    )
    db.add(std)
    brd = Board(
        institution_id=test_institution.id,
        name="SSC Board",
        code="SSC",
        is_active=True,
    )
    db.add(brd)
    await db.commit()

    # Create batch
    create_res = await client.post(
        "/api/v1/divisions/",
        headers=auth_headers,
        json={
            "standard_id": std.id,
            "board_id": brd.id,
            "name": "Batch E (Test)",
            "code": "TEST-VIII-E",
            "capacity": 30,
            "room_number": "Room 5",
            "schedule_timing": "Mon - Fri, 02:00 PM - 04:00 PM",
            "status": "planned",
        },
    )
    assert create_res.status_code == 201
    created = create_res.json()
    batch_id = created["id"]

    # Archive batch
    arch_res = await client.put(f"/api/v1/divisions/{batch_id}/archive", headers=auth_headers)
    assert arch_res.status_code == 200
    assert arch_res.json()["status"] == "archived"
