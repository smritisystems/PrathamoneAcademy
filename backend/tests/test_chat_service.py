# /**
#  * @file        test_chat_service.py
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
#  * @created     2026-11-16
#  * @updated     2026-11-16
#  *
#  * @description Pytest test suite validating Full Hybrid Chat: room access, messaging,
#  */

import pytest
from datetime import datetime
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.chat import ChatRoom, ChatMessage
from app.services.chat_service import ChatService


@pytest.fixture
async def setup_chat_rooms(db: AsyncSession, test_institution, admin_user):
    """Seed default staff channels into the test database and associate admin."""
    admin_user.institution_id = test_institution.id
    db.add(admin_user)
    await db.commit()
    await ChatService.sync_default_staff_rooms(db, test_institution.id)
    return True


@pytest.mark.asyncio
async def test_list_accessible_rooms(client: AsyncClient, auth_headers: dict, db: AsyncSession, setup_chat_rooms):
    """Verify authenticated staff member can retrieve seeded staff rooms."""
    response = await client.get("/api/v1/chat/rooms", headers=auth_headers)
    assert response.status_code == 200
    rooms = response.json()
    assert isinstance(rooms, list)
    assert len(rooms) >= 4

    codes = [r["code"] for r in rooms]
    assert "staff_general" in codes
    assert "faculty_room" in codes


@pytest.mark.asyncio
async def test_create_custom_chat_room(client: AsyncClient, auth_headers: dict, db: AsyncSession, setup_chat_rooms):
    """Verify administrator can provision a new department collaboration room."""
    payload = {
        "name": "NEET Faculty Coordination",
        "code": "neet_faculty_coord_test",
        "room_type": "STAFF_DEPT",
        "description": "Coordination channel for NEET medical batch faculty",
        "is_curfew_enabled": False,
    }
    response = await client.post("/api/v1/chat/rooms", json=payload, headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == "neet_faculty_coord_test"
    assert data["name"] == "NEET Faculty Coordination"


@pytest.mark.asyncio
async def test_post_and_retrieve_room_messages(client: AsyncClient, auth_headers: dict, db: AsyncSession, setup_chat_rooms):
    """Verify sending a message and retrieving room message history."""
    # Find staff_general room
    room = (await db.execute(select(ChatRoom).where(ChatRoom.code == "staff_general"))).scalar_one()

    post_payload = {
        "content": "Good morning team, faculty meeting scheduled at 3:00 PM.",
        "message_type": "TEXT",
    }
    post_res = await client.post(f"/api/v1/chat/rooms/{room.id}/messages", json=post_payload, headers=auth_headers)
    assert post_res.status_code == 200
    created = post_res.json()
    assert created["content"] == post_payload["content"]
    assert created["room_id"] == room.id
    assert created["is_quarantined"] is False

    # Fetch room messages
    get_res = await client.get(f"/api/v1/chat/rooms/{room.id}/messages", headers=auth_headers)
    assert get_res.status_code == 200
    messages = get_res.json()
    assert any(m["id"] == created["id"] for m in messages)


@pytest.mark.asyncio
async def test_profanity_quarantine_screening(client: AsyncClient, auth_headers: dict, db: AsyncSession, setup_chat_rooms):
    """Verify automated quarantine when abusive keywords are detected."""
    room = (await db.execute(select(ChatRoom).where(ChatRoom.code == "staff_general"))).scalar_one()

    abusive_payload = {
        "content": "This paper is a leak scam you idiot",
        "message_type": "TEXT",
    }
    res = await client.post(f"/api/v1/chat/rooms/{room.id}/messages", json=abusive_payload, headers=auth_headers)
    assert res.status_code == 200
    msg_data = res.json()
    assert msg_data["is_quarantined"] is True
    assert msg_data["quarantine_reason"] is not None


@pytest.mark.asyncio
async def test_academic_doubt_resolution(client: AsyncClient, auth_headers: dict, db: AsyncSession, setup_chat_rooms):
    """Verify tagging a doubt question and marking it resolved by faculty."""
    room = (await db.execute(select(ChatRoom).where(ChatRoom.code == "staff_general"))).scalar_one()

    doubt_payload = {
        "content": "Please explain integration by parts for $\\int x e^x dx$",
        "message_type": "DOUBT_QUESTION",
    }
    post_res = await client.post(f"/api/v1/chat/rooms/{room.id}/messages", json=doubt_payload, headers=auth_headers)
    assert post_res.status_code == 200
    doubt_msg = post_res.json()
    assert doubt_msg["message_type"] == "DOUBT_QUESTION"
    assert doubt_msg["is_doubt_resolved"] is False

    # Mark as resolved
    resolve_res = await client.post(f"/api/v1/chat/messages/{doubt_msg['id']}/resolve", headers=auth_headers)
    assert resolve_res.status_code == 200
    resolve_data = resolve_res.json()
    assert resolve_data["is_doubt_resolved"] is True
    assert resolve_data["resolved_at"] is not None


def test_curfew_schedule_evaluation():
    """Verify unit logic of overnight curfew calculation."""
    room = ChatRoom(
        institution_id=1,
        room_type="BATCH_DOUBT",
        name="Test Room",
        code="test_curfew_code",
        is_curfew_enabled=True,
        curfew_start_time="20:30",
        curfew_end_time="08:00",
    )

    # 1. At 23:00 (11 PM) -> curfew should be active
    dt_night = datetime(2026, 11, 16, 23, 0, 0)
    assert ChatService.is_curfew_active(room, dt_night) is True

    # 2. At 03:00 (3 AM) -> curfew should be active
    dt_early = datetime(2026, 11, 16, 3, 0, 0)
    assert ChatService.is_curfew_active(room, dt_early) is True

    # 3. At 14:00 (2 PM) -> curfew should NOT be active
    dt_day = datetime(2026, 11, 16, 14, 0, 0)
    assert ChatService.is_curfew_active(room, dt_day) is False
