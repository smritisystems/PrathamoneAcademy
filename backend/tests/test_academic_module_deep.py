# /**
#  * @file        test_academic_module_deep.py
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
#  * @description Pytest integration tests verifying complete academic hierarchy, capacities, and scheduling.
#  */

import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.security import create_access_token


@pytest.fixture
def admin_token():
    return create_access_token(data={"sub": "1", "role": "admin"})


@pytest.fixture
def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.mark.asyncio
async def test_boards_extended_crud(auth_headers):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. List boards and verify enriched counts
        res = await ac.get("/api/v1/boards/", headers=auth_headers)
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
        toggle_res = await ac.put(f"/api/v1/boards/{icse['id']}/toggle-status", headers=auth_headers)
        assert toggle_res.status_code == 200
        # Toggle back to active
        await ac.put(f"/api/v1/boards/{icse['id']}/toggle-status", headers=auth_headers)


@pytest.mark.asyncio
async def test_standards_extended_crud(auth_headers):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/api/v1/standards/", headers=auth_headers)
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
async def test_subjects_full_crud(auth_headers):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. List subjects
        res = await ac.get("/api/v1/subjects/?standard_id=10", headers=auth_headers)
        assert res.status_code == 200
        subjects = res.json()
        assert len(subjects) >= 1
        assert "standard_name" in subjects[0]

        # 2. Create a test subject
        create_res = await ac.post(
            "/api/v1/subjects/",
            headers=auth_headers,
            json={
                "standard_id": 10,
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
        update_res = await ac.put(
            f"/api/v1/subjects/{sub_id}",
            headers=auth_headers,
            json={"name": "Advanced Robotics & AI", "max_marks": 100},
        )
        assert update_res.status_code == 200

        # 4. Deactivate subject
        del_res = await ac.delete(f"/api/v1/subjects/{sub_id}", headers=auth_headers)
        assert del_res.status_code == 200


@pytest.mark.asyncio
async def test_timetable_crud_and_conflict_validation(auth_headers):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. List timetable sessions
        res = await ac.get("/api/v1/timetable/?division_id=25", headers=auth_headers)
        assert res.status_code == 200
        entries = res.json()
        assert len(entries) >= 1
        first_entry = entries[0]
        assert "day_of_week" in first_entry
        assert "room_number" in first_entry

        # 2. List rooms
        rooms_res = await ac.get("/api/v1/timetable/rooms", headers=auth_headers)
        assert rooms_res.status_code == 200
        assert len(rooms_res.json()) >= 1

        # 3. Test Conflict Detection (Same room, overlapping time)
        # Entry 1 is on Monday 16:00-17:30 in Room 101 for division 25
        conflict_res = await ac.post(
            "/api/v1/timetable/check-conflict",
            headers=auth_headers,
            json={
                "room_number": "Room 101",
                "day_of_week": "Monday",
                "start_time": "16:30",
                "end_time": "18:00",
                "division_id": 26,
            },
        )
        assert conflict_res.status_code == 200
        assert conflict_res.json()["has_conflict"] is True
        assert conflict_res.json()["conflict_type"] == "room"

        # 4. Create conflict-free session
        create_res = await ac.post(
            "/api/v1/timetable/",
            headers=auth_headers,
            json={
                "division_id": 25,
                "subject_id": 1,
                "day_of_week": "Sunday",
                "start_time": "08:00",
                "end_time": "09:30",
                "room_number": "Lab 99",
            },
        )
        assert create_res.status_code == 201
        entry_id = create_res.json()["id"]

        # 5. Clean up session
        del_res = await ac.delete(f"/api/v1/timetable/{entry_id}", headers=auth_headers)
        assert del_res.status_code == 200


@pytest.mark.asyncio
async def test_enrollments_listing_and_transfer(auth_headers):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Get stats
        stats_res = await ac.get("/api/v1/enrollments/stats", headers=auth_headers)
        assert stats_res.status_code == 200
        stats = stats_res.json()
        assert stats["total_active_enrollments"] >= 35

        # 2. List enrollments
        list_res = await ac.get("/api/v1/enrollments/?status=active", headers=auth_headers)
        assert list_res.status_code == 200
        data = list_res.json()
        assert data["total"] >= 35
        first_enr = next(e for e in data["items"] if e.get("status") == "active")
        assert "admission_number" in first_enr
        assert "division_name" in first_enr

        # 3. Test Transfer Batch: student transferred to another division
        enr_id = first_enr["id"]
        divs_res = await ac.get("/api/v1/divisions/", headers=auth_headers)
        all_divs = divs_res.json()
        target_div = next(d for d in all_divs if d["id"] != first_enr.get("division_id") and d.get("available_seats", 0) > 0)
        target_div_id = target_div["id"]
        transfer_res = await ac.post(
            "/api/v1/enrollments/transfer",
            headers=auth_headers,
            json={
                "enrollment_id": enr_id,
                "new_division_id": target_div_id,
                "transfer_reason": "Performance stream promotion",
            },
        )
        print("TRANSFER RESPONSE:", transfer_res.status_code, transfer_res.text)
        assert transfer_res.status_code == 200
        new_enr_id = transfer_res.json()["new_enrollment_id"]

        # Verify old enrollment is marked transferred
        check_res = await ac.get(f"/api/v1/enrollments/?division_id={target_div_id}", headers=auth_headers)
        assert check_res.status_code == 200
        items = check_res.json()["items"]
        assert any(e["id"] == new_enr_id for e in items)


@pytest.mark.asyncio
async def test_academic_reports_endpoints(auth_headers):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Batch capacity report
        cap_res = await ac.get("/api/v1/reports/academic/batch-capacity", headers=auth_headers)
        assert cap_res.status_code == 200
        rows = cap_res.json()
        assert len(rows) >= 5
        assert "occupancy_percentage" in rows[0]

        # 2. Distribution report
        dist_res = await ac.get("/api/v1/reports/academic/distribution", headers=auth_headers)
        assert dist_res.status_code == 200
        assert len(dist_res.json()) >= 1

        # 3. Faculty load report
        fac_res = await ac.get("/api/v1/reports/academic/faculty-load", headers=auth_headers)
        assert fac_res.status_code == 200
        assert len(fac_res.json()) >= 1

        # 4. CSV export
        exp_res = await ac.get("/api/v1/reports/academic/export?report_type=batch-capacity", headers=auth_headers)
        assert exp_res.status_code == 200
        assert "text/csv" in exp_res.headers["content-type"]
        assert "batch_name" in exp_res.text

