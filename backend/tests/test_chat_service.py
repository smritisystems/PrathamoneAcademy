# /**
#  * @file        test_chat_service.py
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
#  * @updated     2026-11-18
#  *
#  * @description Pytest test suite validating Full Hybrid Chat: room access, messaging,
#  */

import uuid
import pytest
from datetime import datetime
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.chat import ChatRoom, ChatMessage
from app.models.user import User
from app.core.security import get_password_hash, create_access_token
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


@pytest.mark.asyncio
async def test_get_mentionable_entities(client: AsyncClient, auth_headers: dict, db: AsyncSession, setup_chat_rooms, test_student):
    """Verify @-mention entities search returns students and faculty."""
    room = (await db.execute(select(ChatRoom).where(ChatRoom.code == "staff_general"))).scalar_one()

    # Search by student's first name
    res = await client.get(
        f"/api/v1/chat/mentionable-entities?room_id={room.id}&q={test_student.first_name[:3]}",
        headers=auth_headers,
    )
    assert res.status_code == 200
    entities = res.json()
    assert isinstance(entities, list)
    assert any(e["entity_type"] == "STUDENT" for e in entities)


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


@pytest.fixture
async def student_user_and_headers(db: AsyncSession, test_institution, test_student):
    """Fixture creating an authenticated student user account."""
    suffix = uuid.uuid4().hex[:6]
    username = f"std_{suffix}"
    student_user = User(
        institution_id=test_institution.id,
        username=username,
        email=f"{username}@prathamone.com",
        first_name="Test",
        last_name="Student",
        hashed_password=get_password_hash("testpass123"),
        role="student",
        is_active=True,
        student_id=test_student.id,
    )
    db.add(student_user)
    await db.commit()
    await db.refresh(student_user)

    token = create_access_token(data={"sub": str(student_user.id)})
    headers = {"Authorization": f"Bearer {token}"}
    return student_user, headers


@pytest.mark.asyncio
async def test_student_curfew_enforcement(
    client: AsyncClient,
    auth_headers: dict,
    student_user_and_headers,
    db: AsyncSession,
    test_institution,
):
    """Verify students are blocked from posting when curfew is active, while staff have override capability."""
    student_user, std_headers = student_user_and_headers

    # Create room with active 24-hr curfew
    curfew_room = ChatRoom(
        institution_id=test_institution.id,
        room_type="BATCH_DOUBT",
        name="Physics 10-A Doubts",
        code=f"curfew_test_{uuid.uuid4().hex[:6]}",
        is_curfew_enabled=True,
        curfew_start_time="00:00",
        curfew_end_time="23:59",
    )
    db.add(curfew_room)
    await db.commit()
    await db.refresh(curfew_room)

    # 1. Student attempt to post during curfew -> 403 Forbidden
    payload = {"content": "Can I submit homework late?", "message_type": "TEXT"}
    std_res = await client.post(
        f"/api/v1/chat/rooms/{curfew_room.id}/messages",
        json=payload,
        headers=std_headers,
    )
    assert std_res.status_code == 403
    assert "curfew active" in std_res.json()["detail"].lower()

    # 2. Staff/Admin attempt to post to same room -> 200 OK (staff override)
    staff_payload = {"content": "Announcement from faculty: homework due Friday.", "message_type": "TEXT"}
    staff_res = await client.post(
        f"/api/v1/chat/rooms/{curfew_room.id}/messages",
        json=staff_payload,
        headers=auth_headers,
    )
    assert staff_res.status_code == 200


@pytest.mark.asyncio
async def test_student_direct_chat_prohibited(
    client: AsyncClient,
    admin_user: User,
    student_user_and_headers,
):
    """Verify Zero Student-to-Student DMs safeguard: students cannot query staff directory or start direct chats."""
    _, std_headers = student_user_and_headers

    # 1. Student queries direct directory -> 403 Forbidden
    dir_res = await client.get("/api/v1/chat/direct-directory", headers=std_headers)
    assert dir_res.status_code == 403
    dir_detail = dir_res.json()["detail"].lower()
    assert "not permitted" in dir_detail or "prohibited" in dir_detail

    # 2. Student attempts to start 1-on-1 direct chat -> 403 Forbidden
    direct_res = await client.post(
        "/api/v1/chat/direct",
        json={"target_user_id": admin_user.id},
        headers=std_headers,
    )
    assert direct_res.status_code == 403
    direct_detail = direct_res.json()["detail"].lower()
    assert "not permitted" in direct_detail or "prohibited" in direct_detail


@pytest.mark.asyncio
async def test_quarantined_messages_hidden_from_students(
    client: AsyncClient,
    auth_headers: dict,
    student_user_and_headers,
    db: AsyncSession,
    setup_chat_rooms,
):
    """Verify quarantined messages are visible to staff moderators but hidden from student feeds."""
    _, std_headers = student_user_and_headers
    room = (await db.execute(select(ChatRoom).where(ChatRoom.code == "staff_general"))).scalar_one()

    # Staff posts an abusive message that triggers automated quarantine
    abusive_payload = {
        "content": "Secret leak scam idiot test for student quarantine suppression",
        "message_type": "TEXT",
    }
    post_res = await client.post(
        f"/api/v1/chat/rooms/{room.id}/messages",
        json=abusive_payload,
        headers=auth_headers,
    )
    assert post_res.status_code == 200
    quarantined_id = post_res.json()["id"]
    assert post_res.json()["is_quarantined"] is True

    # 1. Staff queries messages -> quarantined message IS present
    staff_get = await client.get(f"/api/v1/chat/rooms/{room.id}/messages", headers=auth_headers)
    assert staff_get.status_code == 200
    staff_ids = [m["id"] for m in staff_get.json()]
    assert quarantined_id in staff_ids

    # 2. Student queries messages -> quarantined message is NOT present
    std_get = await client.get(f"/api/v1/chat/rooms/{room.id}/messages", headers=std_headers)
    assert std_get.status_code == 200
    std_ids = [m["id"] for m in std_get.json()]
    assert quarantined_id not in std_ids


@pytest.mark.asyncio
async def test_export_room_transcript_pdf(
    client: AsyncClient,
    auth_headers: dict,
    student_user_and_headers,
    db: AsyncSession,
    setup_chat_rooms,
):
    """Verify high-fidelity PDF transcript generation for faculty/admin and 403 block for students."""
    _, std_headers = student_user_and_headers
    room = (await db.execute(select(ChatRoom).where(ChatRoom.code == "staff_general"))).scalar_one()

    # 1. Staff/Admin exports transcript -> 200 OK with application/pdf header and PDF magic bytes
    export_res = await client.get(f"/api/v1/chat/rooms/{room.id}/export-pdf", headers=auth_headers)
    assert export_res.status_code == 200
    assert export_res.headers["content-type"] == "application/pdf"
    assert export_res.content.startswith(b"%PDF-")
    assert len(export_res.content) > 500

    # 2. Student attempts to export transcript -> 403 Forbidden
    std_export_res = await client.get(f"/api/v1/chat/rooms/{room.id}/export-pdf", headers=std_headers)
    assert std_export_res.status_code == 403

