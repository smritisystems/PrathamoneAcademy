# /**
#  * @file        test_planning_workspace.py
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
#  * @created     2026-11-16
#  * @updated     2026-11-17
#  *
#  * @description Focused planning workspace recurrence and timezone regression tests.
#  */

import asyncio
import struct
from datetime import date, datetime, timezone
from pathlib import Path
from uuid import uuid4
from zoneinfo import ZoneInfo

import pytest
from fastapi import HTTPException

import app.api.v1.endpoints.planning as planning_endpoint
from app.api.v1.endpoints.planning import (
    RecurrenceInput,
    _scan_attachment,
    _validated_attachment_mime,
    _validate_time_fields,
)
from app.models.planning import Activity, ActivityRecurrenceException
from app.models.crm import Lead, LeadDemoClass, LeadFollowUp
from app.models.user import Permission, User
from app.services.planning_service import expand_activity
from app.core.security import get_password_hash


def make_recurring_activity(**overrides) -> Activity:
    fields = {
        "id": 41,
        "institution_id": 1,
        "title": "Weekly planning",
        "activity_type": "event",
        "category": "academic",
        "start_at": datetime(2026, 3, 7, 14, 30, tzinfo=timezone.utc),
        "end_at": datetime(2026, 3, 7, 15, 30, tzinfo=timezone.utc),
        "due_at": None,
        "timezone": "America/New_York",
        "all_day": False,
        "priority": "normal",
        "status": "todo",
        "visibility": "institution",
        "is_published": True,
        "academic_year_id": None,
        "division_id": None,
        "subject_id": None,
        "recurrence_frequency": "daily",
        "recurrence_interval": 1,
        "recurrence_until": date(2026, 3, 9),
        "recurrence_weekdays": None,
        "version": 1,
        "created_by_id": 1,
        "assignees": [],
        "attachments": [],
        "references": [],
        "recurrence_exceptions": [],
    }
    fields.update(overrides)
    return Activity(**fields)


@pytest.mark.asyncio
async def test_attachment_scanner_streams_content_to_clamd(monkeypatch):
    received = bytearray()

    async def clamd_handler(reader, writer):
        assert await reader.readuntil(b"\0") == b"zINSTREAM\0"
        while True:
            chunk_size = struct.unpack("!I", await reader.readexactly(4))[0]
            if chunk_size == 0:
                break
            received.extend(await reader.readexactly(chunk_size))
        writer.write(b"stream: OK\0")
        await writer.drain()
        writer.close()

    server = await asyncio.start_server(clamd_handler, "127.0.0.1", 0)
    monkeypatch.setenv("CLAMAV_HOST", "127.0.0.1")
    monkeypatch.setenv("CLAMAV_PORT", str(server.sockets[0].getsockname()[1]))
    try:
        await _scan_attachment(b"validated attachment")
    finally:
        server.close()
        await server.wait_closed()

    assert received == b"validated attachment"


@pytest.mark.asyncio
async def test_attachment_scanner_rejects_detected_malware(monkeypatch):
    async def infected_response(content, host, port):
        return b"stream: Eicar-Test-Signature FOUND\0"

    monkeypatch.setenv("CLAMAV_HOST", "127.0.0.1")
    monkeypatch.setattr(planning_endpoint, "_clamav_instream", infected_response)

    with pytest.raises(HTTPException) as exc_info:
        await _scan_attachment(b"validated attachment")

    assert exc_info.value.status_code == 422


@pytest.mark.asyncio
async def test_attachment_scanner_fails_closed_when_not_configured(monkeypatch):
    monkeypatch.delenv("CLAMAV_HOST", raising=False)

    with pytest.raises(HTTPException) as exc_info:
        await _scan_attachment(b"validated attachment")

    assert exc_info.value.status_code == 503


def test_recurrence_exceptions_remove_only_the_selected_occurrence():
    activity = make_recurring_activity(
        timezone="UTC",
        recurrence_exceptions=[
            ActivityRecurrenceException(occurrence_date=date(2026, 3, 8))
        ],
    )

    occurrences = expand_activity(activity, date(2026, 3, 7), date(2026, 3, 9))

    assert [item["occurrence_date"] for item in occurrences] == [
        "2026-03-07",
        "2026-03-09",
    ]


def test_recurrence_preserves_local_wall_time_across_daylight_saving_transition():
    activity = make_recurring_activity()

    occurrences = expand_activity(activity, date(2026, 3, 7), date(2026, 3, 9))

    assert [item["start_at"] for item in occurrences] == [
        "2026-03-07T14:30:00+00:00",
        "2026-03-08T13:30:00+00:00",
        "2026-03-09T13:30:00+00:00",
    ]


def test_weekly_recurrence_obeys_selected_weekdays_and_interval():
    activity = make_recurring_activity(
        timezone="UTC",
        start_at=datetime(2026, 3, 2, 9, tzinfo=timezone.utc),
        end_at=datetime(2026, 3, 2, 10, tzinfo=timezone.utc),
        recurrence_frequency="weekly",
        recurrence_interval=2,
        recurrence_until=date(2026, 3, 31),
        recurrence_weekdays="0,2",
    )

    occurrences = expand_activity(activity, date(2026, 3, 1), date(2026, 3, 31))

    assert [item["occurrence_date"] for item in occurrences] == [
        "2026-03-02",
        "2026-03-04",
        "2026-03-16",
        "2026-03-18",
        "2026-03-30",
    ]


def test_unscheduled_task_remains_available_to_kanban_and_agenda():
    activity = make_recurring_activity(
        activity_type="task",
        start_at=None,
        end_at=None,
        recurrence_frequency=None,
        recurrence_until=None,
    )

    items = expand_activity(activity, date(2026, 3, 7), date(2026, 3, 9))

    assert len(items) == 1
    assert items[0]["title"] == "Weekly planning"
    assert items[0]["start_at"] is None
    assert items[0]["due_at"] is None


def test_recurrence_horizon_is_bounded_to_five_years():
    with pytest.raises(HTTPException) as error:
        _validate_time_fields(
            "event",
            datetime(2026, 1, 1, 9, tzinfo=timezone.utc),
            datetime(2026, 1, 1, 10, tzinfo=timezone.utc),
            None,
            RecurrenceInput(frequency="daily", until=date(2032, 1, 1)),
        )
    assert error.value.status_code == 422
    assert "five years" in error.value.detail


def test_recurrence_end_date_is_checked_in_the_activity_timezone():
    _validate_time_fields(
        "event",
        datetime(2026, 1, 1, 0, 30, tzinfo=timezone.utc),
        datetime(2026, 1, 1, 1, 30, tzinfo=timezone.utc),
        None,
        RecurrenceInput(frequency="daily", until=date(2025, 12, 31)),
        "America/Los_Angeles",
    )


def test_attachment_content_must_match_its_allowed_extension():
    assert _validated_attachment_mime(".pdf", b"%PDF-1.7\nsample") == "application/pdf"
    assert _validated_attachment_mime(".pdf", b"not a pdf") is None
    assert _validated_attachment_mime(".png", b"\x89PNG\r\n\x1a\nsample") == "image/png"
    assert _validated_attachment_mime(".jpg", b"\x89PNG\r\n\x1a\nsample") is None


@pytest.mark.asyncio
async def test_planning_activity_lifecycle_uses_one_record_and_canonical_status(
    client, admin_user, test_institution, auth_headers
):
    create_response = await client.post(
        "/api/v1/planning/activities",
        headers=auth_headers,
        json={
            "institution_id": test_institution.id,
            "title": "Prepare mock examination",
            "activity_type": "task",
            "category": "academic",
            "status": "backlog",
            "visibility": "institution",
            "is_published": True,
            "assignee_user_ids": [],
            "department_names": [],
            "references": [],
        },
    )
    assert create_response.status_code == 201, create_response.text
    created = create_response.json()["item"]
    activity_id = created["id"]

    list_response = await client.get(
        "/api/v1/planning/activities",
        headers=auth_headers,
        params={
            "start": "2026-03-07",
            "end": "2026-03-09",
            "institution_id": test_institution.id,
        },
    )
    assert list_response.status_code == 200
    assert any(item["id"] == activity_id for item in list_response.json()["items"])
    assert list_response.json()["timezone"] == test_institution.timezone or list_response.json()["timezone"] == "Asia/Kolkata"

    update_response = await client.put(
        f"/api/v1/planning/activities/{activity_id}",
        headers=auth_headers,
        json={"expected_version": created["version"], "title": "Prepare final mock examination"},
    )
    assert update_response.status_code == 200, update_response.text
    updated = update_response.json()["item"]

    stale_update = await client.put(
        f"/api/v1/planning/activities/{activity_id}",
        headers=auth_headers,
        json={"expected_version": created["version"], "title": "Stale edit"},
    )
    assert stale_update.status_code == 409

    transition_response = await client.patch(
        f"/api/v1/planning/activities/{activity_id}/status",
        headers=auth_headers,
        json={"status": "todo", "expected_version": updated["version"]},
    )
    assert transition_response.status_code == 200, transition_response.text
    assert transition_response.json()["status"] == "todo"

    detail_response = await client.get(
        f"/api/v1/planning/activities/{activity_id}",
        headers=auth_headers,
    )
    assert detail_response.status_code == 200
    assert detail_response.json()["item"]["title"] == "Prepare final mock examination"
    assert detail_response.json()["item"]["status"] == "todo"
    assert detail_response.json()["item"]["allowed_transitions"] == ["backlog", "blocked", "cancelled", "completed", "in_progress"]


@pytest.mark.asyncio
async def test_calendar_projects_scheduled_crm_records_without_prospect_details(
    db, client, test_institution, auth_headers
):
    timezone_name = test_institution.timezone or "Asia/Kolkata"
    scheduled_at = datetime(2026, 3, 8, 10, tzinfo=ZoneInfo(timezone_name))
    lead = Lead(
        institution_id=test_institution.id,
        lead_number=f"PLAN-{uuid4().hex[:8].upper()}",
        first_name="Private",
        last_name="Prospect",
        phone="5550102030",
        data_environment="PRODUCTION",
    )
    training_lead = Lead(
        institution_id=test_institution.id,
        lead_number=f"TRAIN-{uuid4().hex[:8].upper()}",
        first_name="Training",
        last_name="Prospect",
        is_demo=True,
        data_environment="TRAINING",
    )
    db.add_all([lead, training_lead])
    await db.flush()

    follow_up = LeadFollowUp(
        lead_id=lead.id,
        institution_id=test_institution.id,
        follow_up_type="call",
        status="scheduled",
        scheduled_at=scheduled_at,
        data_environment="PRODUCTION",
    )
    cancelled_follow_up = LeadFollowUp(
        lead_id=lead.id,
        institution_id=test_institution.id,
        follow_up_type="meeting",
        status="cancelled",
        scheduled_at=scheduled_at,
        data_environment="PRODUCTION",
    )
    demo_class = LeadDemoClass(
        lead_id=lead.id,
        institution_id=test_institution.id,
        scheduled_at=scheduled_at,
        status="scheduled",
        data_environment="PRODUCTION",
    )
    training_follow_up = LeadFollowUp(
        lead_id=training_lead.id,
        institution_id=test_institution.id,
        follow_up_type="call",
        status="scheduled",
        scheduled_at=scheduled_at,
        is_demo=True,
        data_environment="TRAINING",
    )
    db.add_all([follow_up, cancelled_follow_up, demo_class, training_follow_up])
    await db.commit()

    response = await client.get(
        "/api/v1/planning/activities",
        headers=auth_headers,
        params={
            "start": "2026-03-08",
            "end": "2026-03-08",
            "institution_id": test_institution.id,
        },
    )

    assert response.status_code == 200, response.text
    items = response.json()["items"]
    crm_items = [item for item in items if item["source_type"] in ("lead_follow_up", "lead_demo_class")]
    assert {item["source_type"] for item in crm_items} == {"lead_follow_up", "lead_demo_class"}
    assert {item["source_id"] for item in crm_items} == {follow_up.id, demo_class.id}
    assert all(item["editable"] is False for item in crm_items)
    assert all(item["start_at"] for item in crm_items)
    serialized = response.text
    assert "Private" not in serialized
    assert "5550102030" not in serialized
    assert "TRAINING" not in serialized


@pytest.mark.asyncio
async def test_calendar_hides_crm_projections_without_lead_read_access(
    db, client, test_institution
):
    username = f"planning_only_{uuid4().hex[:8]}"
    viewer = User(
        username=username,
        email=f"{username}@test.com",
        hashed_password=get_password_hash("testpassword"),
        first_name="Planning",
        last_name="Only",
        role="planning_calendar_viewer",
        institution_id=test_institution.id,
    )
    lead = Lead(
        institution_id=test_institution.id,
        lead_number=f"READ-{uuid4().hex[:8].upper()}",
        first_name="Restricted",
        last_name="Lead",
        data_environment="PRODUCTION",
    )
    db.add_all([viewer, lead])
    await db.flush()
    db.add_all([
        Permission(user_id=viewer.id, resource="planning", action="view"),
        LeadFollowUp(
            lead_id=lead.id,
            institution_id=test_institution.id,
            follow_up_type="call",
            status="scheduled",
            scheduled_at=datetime(2026, 3, 8, 10, tzinfo=timezone.utc),
            data_environment="PRODUCTION",
        ),
    ])
    await db.commit()

    login_response = await client.post(
        "/api/v1/auth/login",
        data={"username": username, "password": "testpassword"},
    )
    assert login_response.status_code == 200
    response = await client.get(
        "/api/v1/planning/activities",
        headers={"Authorization": f"Bearer {login_response.json()['access_token']}"},
        params={
            "start": "2026-03-08",
            "end": "2026-03-08",
            "institution_id": test_institution.id,
        },
    )

    assert response.status_code == 200, response.text
    assert all(
        item["source_type"] not in ("lead_follow_up", "lead_demo_class")
        for item in response.json()["items"]
    )


@pytest.mark.asyncio
async def test_cancelled_activity_is_available_only_when_requested(
    client, test_institution, auth_headers
):
    create_response = await client.post(
        "/api/v1/planning/activities",
        headers=auth_headers,
        json={
            "institution_id": test_institution.id,
            "title": "Cancelled planning item",
            "activity_type": "task",
            "category": "administrative",
            "visibility": "institution",
            "is_published": True,
            "assignee_user_ids": [],
            "department_names": [],
            "references": [],
        },
    )
    assert create_response.status_code == 201, create_response.text
    activity_id = create_response.json()["item"]["id"]

    cancel_response = await client.delete(
        f"/api/v1/planning/activities/{activity_id}",
        headers=auth_headers,
    )
    assert cancel_response.status_code == 200, cancel_response.text

    params = {
        "start": "2026-03-07",
        "end": "2026-03-09",
        "institution_id": test_institution.id,
    }
    active_response = await client.get(
        "/api/v1/planning/activities", headers=auth_headers, params=params
    )
    cancelled_response = await client.get(
        "/api/v1/planning/activities",
        headers=auth_headers,
        params={**params, "include_cancelled": "true"},
    )
    assert active_response.status_code == 200
    assert all(item["id"] != activity_id for item in active_response.json()["items"])
    assert any(item["id"] == activity_id for item in cancelled_response.json()["items"])


@pytest.mark.asyncio
async def test_delete_permission_cannot_cancel_an_unpublished_activity_owned_by_another_user(
    db, client, test_institution, auth_headers
):
    create_response = await client.post(
        "/api/v1/planning/activities",
        headers=auth_headers,
        json={
            "institution_id": test_institution.id,
            "title": "Private activity",
            "activity_type": "task",
            "category": "administrative",
            "visibility": "institution",
            "is_published": False,
            "assignee_user_ids": [],
            "department_names": [],
            "references": [],
        },
    )
    assert create_response.status_code == 201, create_response.text
    activity_id = create_response.json()["item"]["id"]

    username = f"planning_deleter_{uuid4().hex[:8]}"
    deleter = User(
        username=username,
        email=f"{username}@test.com",
        hashed_password=get_password_hash("testpassword"),
        first_name="Planning",
        last_name="Deleter",
        role="teacher",
        institution_id=test_institution.id,
    )
    db.add(deleter)
    await db.flush()
    db.add_all([
        Permission(user_id=deleter.id, resource="planning", action="view"),
        Permission(user_id=deleter.id, resource="planning", action="delete"),
    ])
    await db.commit()
    login_response = await client.post(
        "/api/v1/auth/login",
        data={"username": username, "password": "testpassword"},
    )
    assert login_response.status_code == 200

    response = await client.delete(
        f"/api/v1/planning/activities/{activity_id}",
        headers={"Authorization": f"Bearer {login_response.json()['access_token']}"},
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_attachment_can_be_removed_with_audit_and_file_cleanup(
    client, test_institution, auth_headers, tmp_path, monkeypatch
):
    async def clean_scan(content):
        return None

    monkeypatch.setenv("PLANNING_UPLOAD_ROOT", str(tmp_path))
    activity_response = await client.post(
        "/api/v1/planning/activities",
        headers=auth_headers,
        json={
            "institution_id": test_institution.id,
            "title": "Attachment lifecycle test",
            "activity_type": "task",
            "category": "administrative",
            "visibility": "institution",
            "assignee_user_ids": [],
            "department_names": [],
            "references": [],
        },
    )
    assert activity_response.status_code == 201, activity_response.text
    activity_id = activity_response.json()["item"]["id"]

    async def unavailable_scan(content):
        raise HTTPException(status_code=503, detail="Attachment scanning is unavailable.")

    monkeypatch.setattr(planning_endpoint, "_scan_attachment", unavailable_scan)
    rejected_upload = await client.post(
        f"/api/v1/planning/activities/{activity_id}/attachments",
        headers=auth_headers,
        files={"file": ("meeting.pdf", b"%PDF-1.7\n%%EOF\n", "text/plain")},
    )
    assert rejected_upload.status_code == 503
    assert not list(tmp_path.rglob("*.pdf"))

    monkeypatch.setattr(planning_endpoint, "_scan_attachment", clean_scan)
    upload_response = await client.post(
        f"/api/v1/planning/activities/{activity_id}/attachments",
        headers=auth_headers,
        files={"file": ("meeting.pdf", b"%PDF-1.7\n%%EOF\n", "text/plain")},
    )
    assert upload_response.status_code == 201, upload_response.text
    attachment_id = upload_response.json()["id"]
    stored_path = next(tmp_path.rglob("*.pdf"))
    original_unlink = Path.unlink

    def fail_attachment_unlink(path, *args, **kwargs):
        if path.resolve() == stored_path.resolve():
            raise PermissionError("simulated temporary file lock")
        return original_unlink(path, *args, **kwargs)

    monkeypatch.setattr(Path, "unlink", fail_attachment_unlink)
    failed_delete = await client.delete(
        f"/api/v1/planning/attachments/{attachment_id}",
        headers=auth_headers,
    )
    assert failed_delete.status_code == 500
    assert "metadata is retained" in failed_delete.json()["detail"]
    assert stored_path.is_file()

    download_retry = await client.get(
        f"/api/v1/planning/attachments/{attachment_id}/download",
        headers=auth_headers,
    )
    assert download_retry.status_code == 200
    monkeypatch.setattr(Path, "unlink", original_unlink)

    delete_response = await client.delete(
        f"/api/v1/planning/attachments/{attachment_id}",
        headers=auth_headers,
    )
    assert delete_response.status_code == 200, delete_response.text
    assert delete_response.json()["deleted"] is True
    assert delete_response.json()["version"] == activity_response.json()["item"]["version"] + 2
    assert list(tmp_path.rglob("*.pdf")) == []

    download_response = await client.get(
        f"/api/v1/planning/attachments/{attachment_id}/download",
        headers=auth_headers,
    )
    assert download_response.status_code == 404


@pytest.mark.asyncio
async def test_conflicts_are_checked_against_future_occurrences_of_existing_series(
    client, admin_user, test_institution, auth_headers
):
    recurring_response = await client.post(
        "/api/v1/planning/activities",
        headers=auth_headers,
        json={
            "institution_id": test_institution.id,
            "title": "Weekly staff planning",
            "activity_type": "event",
            "category": "meeting",
            "start_at": "2027-01-04T09:00:00+00:00",
            "end_at": "2027-01-04T10:00:00+00:00",
            "timezone": "UTC",
            "location": f"Planning conflict room {test_institution.id}",
            "status": "todo",
            "visibility": "institution",
            "is_published": True,
            "recurrence": {
                "frequency": "weekly",
                "interval": 1,
                "until": "2027-02-01",
                "weekdays": [0],
            },
            "assignee_user_ids": [],
            "department_names": [],
            "references": [],
        },
    )
    assert recurring_response.status_code == 201, recurring_response.text

    conflict_response = await client.post(
        "/api/v1/planning/activities",
        headers=auth_headers,
        json={
            "institution_id": test_institution.id,
            "title": "One-time room booking",
            "activity_type": "event",
            "category": "meeting",
            "start_at": "2027-01-18T09:30:00+00:00",
            "end_at": "2027-01-18T10:30:00+00:00",
            "timezone": "UTC",
            "location": f"Planning conflict room {test_institution.id}",
            "status": "todo",
            "visibility": "institution",
            "is_published": True,
            "assignee_user_ids": [],
            "department_names": [],
            "references": [],
        },
    )
    assert conflict_response.status_code == 409
    assert "conflicts" in conflict_response.json()["detail"]

    one_time_response = await client.post(
        "/api/v1/planning/activities",
        headers=auth_headers,
        json={
            "institution_id": test_institution.id,
            "title": "Room booking in recurring window",
            "activity_type": "event",
            "category": "meeting",
            "start_at": "2027-01-18T11:30:00+00:00",
            "end_at": "2027-01-18T12:30:00+00:00",
            "timezone": "UTC",
            "location": f"Planning recurring candidate room {test_institution.id}",
            "status": "todo",
            "visibility": "institution",
            "is_published": True,
            "assignee_user_ids": [],
            "department_names": [],
            "references": [],
        },
    )
    assert one_time_response.status_code == 201, one_time_response.text

    recurring_conflict_response = await client.post(
        "/api/v1/planning/activities",
        headers=auth_headers,
        json={
            "institution_id": test_institution.id,
            "title": "Conflicting recurring series",
            "activity_type": "event",
            "category": "meeting",
            "start_at": "2027-01-04T11:00:00+00:00",
            "end_at": "2027-01-04T12:00:00+00:00",
            "timezone": "UTC",
            "location": f"Planning recurring candidate room {test_institution.id}",
            "status": "todo",
            "visibility": "institution",
            "is_published": True,
            "recurrence": {
                "frequency": "weekly",
                "interval": 1,
                "until": "2027-02-01",
                "weekdays": [0],
            },
            "assignee_user_ids": [],
            "department_names": [],
            "references": [],
        },
    )
    assert recurring_conflict_response.status_code == 409


@pytest.mark.asyncio
async def test_planning_api_enforces_tenant_scope_and_write_permissions(
    db, client, test_institution
):
    username = f"planning_viewer_{uuid4().hex[:8]}"
    viewer = User(
        username=username,
        email=f"{username}@test.com",
        hashed_password=get_password_hash("testpassword"),
        first_name="Planning",
        last_name="Viewer",
        role="teacher",
        institution_id=test_institution.id,
    )
    db.add(viewer)
    await db.flush()
    db.add(Permission(user_id=viewer.id, resource="planning", action="view"))
    await db.commit()

    login_response = await client.post(
        "/api/v1/auth/login",
        data={"username": username, "password": "testpassword"},
    )
    assert login_response.status_code == 200
    headers = {"Authorization": f"Bearer {login_response.json()['access_token']}"}

    own_scope_response = await client.get(
        "/api/v1/planning/activities",
        headers=headers,
        params={
            "start": "2026-03-07",
            "end": "2026-03-09",
            "institution_id": test_institution.id,
        },
    )
    assert own_scope_response.status_code == 200

    other_scope_response = await client.get(
        "/api/v1/planning/activities",
        headers=headers,
        params={
            "start": "2026-03-07",
            "end": "2026-03-09",
            "institution_id": test_institution.id + 100000,
        },
    )
    assert other_scope_response.status_code == 403

    create_response = await client.post(
        "/api/v1/planning/activities",
        headers=headers,
        json={
            "title": "Unauthorized task",
            "activity_type": "task",
            "category": "administrative",
            "visibility": "institution",
            "is_published": False,
        },
    )
    assert create_response.status_code == 403
