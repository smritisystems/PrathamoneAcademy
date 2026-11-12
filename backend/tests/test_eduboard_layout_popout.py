# /**
#  * @file        test_eduboard_layout_popout.py
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
#  * @created     2026-11-12
#  * @updated     2026-11-12
#  *
#  * @description Backend test suite for EduBoard display preferences governance (System -> Institution -> Individual), scoped Pop-Out launch tokens, Read-Only presentation enforcement, collaborator policy, tenant/env isolation, and real-time WebSocket multi-window sync.
#  */

import asyncio
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import WebSocketDisconnect

from app.api.v1.endpoints.eduboard import eduboard_realtime_websocket
from app.core.security import decode_token
from app.main import app
from app.models.institution import Institution
from app.services.eduboard_realtime import EduBoardWsClient, eduboard_realtime_manager
from tests.test_eduboard_system import _create_user_with_token, _setup_academic_context


@pytest.mark.asyncio
async def test_display_preferences_inheritance_and_admin_lock(
    client: AsyncClient,
    db: AsyncSession,
    test_institution: Institution,
):
    _, admin_headers = await _create_user_with_token(
        db, role_name="admin", institution_id=test_institution.id
    )
    _, teacher_headers = await _create_user_with_token(
        db, role_name="teacher", institution_id=test_institution.id
    )

    # 1. Default system resolution
    pref_res = await client.get("/api/v1/eduboard/preferences", headers=teacher_headers)
    assert pref_res.status_code == 200
    data = pref_res.json()
    assert data["effective"]["default_workspace_mode"] == "standard"
    assert data["effective"]["toolbar_state"] == "expanded"
    assert data["locked_by_institution"] is False

    # 2. Admin sets institution defaults (Greenboard + Focus)
    upd_inst = await client.put(
        "/api/v1/eduboard/settings",
        headers=admin_headers,
        json={
            "default_workspace_mode": "focus",
            "default_board_appearance": "greenboard",
            "toolbar_state": "compact",
            "allow_user_display_overrides": True,
        },
    )
    assert upd_inst.status_code == 200

    pref_res2 = await client.get("/api/v1/eduboard/preferences", headers=teacher_headers)
    assert pref_res2.status_code == 200
    assert pref_res2.json()["effective"]["default_board_appearance"] == "greenboard"
    assert pref_res2.json()["effective"]["default_workspace_mode"] == "focus"

    # 3. Teacher saves personal overrides
    put_user = await client.put(
        "/api/v1/eduboard/preferences",
        headers=teacher_headers,
        json={
            "default_workspace_mode": "fullscreen",
            "toolbar_position": "left",
            "pages_panel_open": False,
        },
    )
    assert put_user.status_code == 200
    assert put_user.json()["effective"]["default_workspace_mode"] == "fullscreen"
    assert put_user.json()["effective"]["toolbar_position"] == "left"
    assert put_user.json()["effective"]["pages_panel_open"] is False

    # 4. Teacher resets back to institution defaults
    reset_res = await client.delete("/api/v1/eduboard/preferences", headers=teacher_headers)
    assert reset_res.status_code == 200
    assert reset_res.json()["effective"]["default_workspace_mode"] == "focus"
    assert reset_res.json()["user_overrides"] == {}

    # 5. Admin locks personal overrides
    lock_res = await client.put(
        "/api/v1/eduboard/settings",
        headers=admin_headers,
        json={"allow_user_display_overrides": False},
    )
    assert lock_res.status_code == 200

    blocked_put = await client.put(
        "/api/v1/eduboard/preferences",
        headers=teacher_headers,
        json={"default_workspace_mode": "standard"},
    )
    assert blocked_put.status_code == 403

    locked_get = await client.get("/api/v1/eduboard/preferences", headers=teacher_headers)
    assert locked_get.status_code == 200
    assert locked_get.json()["locked_by_institution"] is True


@pytest.mark.asyncio
async def test_popout_scoped_tokens_presentation_readonly_and_isolation(
    client: AsyncClient,
    db: AsyncSession,
    test_institution: Institution,
    test_academic_year,
):
    teacher, teacher_headers = await _create_user_with_token(
        db, role_name="teacher", institution_id=test_institution.id
    )
    _, other_headers = await _create_user_with_token(
        db, role_name="teacher", institution_id=test_institution.id
    )
    _, admin_headers = await _create_user_with_token(
        db, role_name="admin", institution_id=test_institution.id
    )
    _, student_headers = await _create_user_with_token(
        db, role_name="student", institution_id=test_institution.id
    )

    std, div, subj, ts = await _setup_academic_context(
        db, test_institution.id, test_academic_year.id, teacher.id
    )
    create_res = await client.post(
        "/api/v1/eduboard/boards",
        headers=teacher_headers,
        json={
            "title": "Popout Electromagnetism",
            "academic_year_id": test_academic_year.id,
            "standard_id": std.id,
            "division_id": div.id,
            "subject_id": subj.id,
            "teaching_session_id": ts.id,
            "board_mode_default": "classic",
            "collaboration_enabled": True,
        },
    )
    assert create_res.status_code == 201
    board_id = create_res.json()["id"]

    # 1. Create scoped Teacher Edit popout session (never exposes login JWT)
    pop_edit = await client.post(
        f"/api/v1/eduboard/boards/{board_id}/popout-session",
        headers=teacher_headers,
        json={"launch_mode": "teacher_edit", "surface": "greenboard", "compact_tools": True},
    )
    assert pop_edit.status_code == 200
    launch_token = pop_edit.json()["launch_token"]
    claims = decode_token(launch_token)
    assert claims["type"] == "eduboard_popout"
    assert claims["board_id"] == board_id
    assert claims["mode"] == "teacher_edit"

    # 2. Cross-user replay blocked cleanly
    replay_res = await client.get(
        f"/api/v1/eduboard/popout/resolve?launch={launch_token}",
        headers=other_headers,
    )
    assert replay_res.status_code == 403

    # 3. Cross-environment (TRAINING vs PRODUCTION) blocked cleanly
    env_res = await client.get(
        f"/api/v1/eduboard/popout/resolve?launch={launch_token}",
        headers={**teacher_headers, "X-Data-Environment": "TRAINING"},
    )
    assert env_res.status_code == 403

    # 4. Authorized owner resolve returns greenboard config & ws_token
    resolved_edit = await client.get(
        f"/api/v1/eduboard/popout/resolve?launch={launch_token}",
        headers=teacher_headers,
    )
    assert resolved_edit.status_code == 200
    r_data = resolved_edit.json()
    assert r_data["permissions"]["can_edit"] is True
    assert r_data["ui_config"]["surface"] == "greenboard"
    assert r_data["ws_token"]

    # 5. Presentation popout strictly blocks writes even by board owner
    pop_pres = await client.post(
        f"/api/v1/eduboard/boards/{board_id}/popout-session",
        headers=teacher_headers,
        json={"launch_mode": "presentation", "hide_toolbar": True},
    )
    assert pop_pres.status_code == 200
    pres_token = pop_pres.json()["launch_token"]

    resolved_pres = await client.get(
        f"/api/v1/eduboard/popout/resolve?launch={pres_token}",
        headers=teacher_headers,
    )
    assert resolved_pres.status_code == 200
    assert resolved_pres.json()["permissions"]["can_edit"] is False

    blocked_sync = await client.put(
        f"/api/v1/eduboard/boards/{board_id}/sync",
        headers=teacher_headers,
        json={
            "expected_revision_no": 1,
            "popout_token": pres_token,
            "pages": r_data["board"]["pages"],
        },
    )
    assert blocked_sync.status_code == 403

    # 6. Student cannot launch Teacher Edit or Collaborator popout
    stu_edit = await client.post(
        f"/api/v1/eduboard/boards/{board_id}/popout-session",
        headers=student_headers,
        json={"launch_mode": "teacher_edit"},
    )
    assert stu_edit.status_code == 403

    # 7. Admin policy disables collaborator cleanly
    await client.put(
        "/api/v1/eduboard/settings",
        headers=admin_headers,
        json={"allow_collaborator_mode": False},
    )
    collab_blocked = await client.post(
        f"/api/v1/eduboard/boards/{board_id}/popout-session",
        headers=teacher_headers,
        json={"launch_mode": "collaborator"},
    )
    assert collab_blocked.status_code == 403


@pytest.mark.asyncio
async def test_realtime_websocket_route_auth_readonly_and_scene_sync(
    client: AsyncClient,
    db: AsyncSession,
    test_institution: Institution,
    test_academic_year,
):
    teacher, teacher_headers = await _create_user_with_token(
        db, role_name="teacher", institution_id=test_institution.id
    )
    std, div, subj, ts = await _setup_academic_context(
        db, test_institution.id, test_academic_year.id, teacher.id
    )
    create_res = await client.post(
        "/api/v1/eduboard/boards",
        headers=teacher_headers,
        json={
            "title": "WS Live Sync Lecture",
            "academic_year_id": test_academic_year.id,
            "standard_id": std.id,
            "division_id": div.id,
            "subject_id": subj.id,
            "teaching_session_id": ts.id,
            "board_mode_default": "classic",
        },
    )
    assert create_res.status_code == 201
    board_id = create_res.json()["id"]

    # Mint main ws_ticket (teacher_edit) & presentation ws_token (presentation)
    main_ticket = await client.post(
        f"/api/v1/eduboard/boards/{board_id}/ws-ticket",
        headers=teacher_headers,
        json={"window_type": "main", "mode": "teacher_edit"},
    )
    assert main_ticket.status_code == 200
    ws_edit_token = main_ticket.json()["ws_token"]

    pres_pop = await client.post(
        f"/api/v1/eduboard/boards/{board_id}/popout-session",
        headers=teacher_headers,
        json={"launch_mode": "presentation", "surface": "greenboard"},
    )
    assert pres_pop.status_code == 200
    pres_resolved = await client.get(
        f"/api/v1/eduboard/popout/resolve?launch={pres_pop.json()['launch_token']}",
        headers=teacher_headers,
    )
    assert pres_resolved.status_code == 200
    ws_pres_token = pres_resolved.json()["ws_token"]

    class _MockWebSocket:
        def __init__(self, incoming: list[dict], env: str = "PRODUCTION"):
            self.app = app
            self.cookies = {}
            self.query_params = {"env": env}
            self._incoming: asyncio.Queue = asyncio.Queue()
            for item in incoming:
                self._incoming.put_nowait(item)
            self.sent: list[dict] = []
            self.closed_code: int | None = None
            self.accepted = False

        async def accept(self):
            self.accepted = True

        async def close(self, code: int = 1000):
            self.closed_code = code

        async def send_json(self, data: dict):
            self.sent.append(data)

        async def receive_json(self) -> dict:
            if self._incoming.empty():
                raise WebSocketDisconnect(code=1000)
            return await self._incoming.get()

    # 1. Invalid token rejects with 4403
    ws_bad = _MockWebSocket([])
    await eduboard_realtime_websocket(
        websocket=ws_bad,
        board_id=board_id,
        token="invalid.jwt.token",
        client_id="bad_1",
        window_type="main",
    )
    assert ws_bad.closed_code == 4403
    assert ws_bad.accepted is False

    # 2. Presentation window trying to send scene_patch gets READ_ONLY_MODE error
    ws_pres_ro = _MockWebSocket(
        [
            {"type": "ping", "ts": 123},
            {"type": "scene_patch", "pages": []},
        ]
    )
    await eduboard_realtime_websocket(
        websocket=ws_pres_ro,
        board_id=board_id,
        token=ws_pres_token,
        client_id="pres_1",
        window_type="detached",
        surface="greenboard",
    )
    assert ws_pres_ro.accepted is True
    assert any(m.get("type") == "pong" and m.get("ts") == 123 for m in ws_pres_ro.sent)
    assert any(m.get("type") == "error" and m.get("code") == "READ_ONLY_MODE" for m in ws_pres_ro.sent)

    # 3. Teacher edit WS broadcasts scene_patch to attached peer in same room
    class _PeerSink:
        def __init__(self):
            self.sent = []

        async def send_json(self, data):
            self.sent.append(data)

    peer_sink = _PeerSink()
    room_key = (test_institution.id, False, board_id)
    await eduboard_realtime_manager.connect(
        room_key,
        EduBoardWsClient(peer_sink, "peer_pop", teacher.id, "Teacher", "teacher", "presentation", "detached", "greenboard"),
    )
    try:
        ws_teacher = _MockWebSocket(
            [{"type": "scene_patch", "active_page_uid": "p1", "pages": [{"page_uid": "p1", "elements": []}], "base_revision_no": 1}]
        )
        await eduboard_realtime_websocket(
            websocket=ws_teacher,
            board_id=board_id,
            token=ws_edit_token,
            client_id="main_1",
            window_type="main",
        )
        assert any(m.get("type") == "scene_sync" and m.get("client_id") == "main_1" for m in peer_sink.sent)
    finally:
        await eduboard_realtime_manager.disconnect(room_key, "peer_pop")


@pytest.mark.asyncio
async def test_realtime_room_manager_isolation_and_detached_close_safety():
    class FakeWs:
        def __init__(self):
            self.sent = []

        async def send_json(self, data):
            self.sent.append(data)

    ws_main = FakeWs()
    ws_detached = FakeWs()
    ws_other_env = FakeWs()

    room_prod = (1, False, 777)
    room_train = (1, True, 777)

    await eduboard_realtime_manager.connect(
        room_prod,
        EduBoardWsClient(ws_main, "c_main", 10, "Teacher A", "teacher", "teacher_edit", "main"),
    )
    await eduboard_realtime_manager.connect(
        room_prod,
        EduBoardWsClient(ws_detached, "c_pop", 10, "Teacher A", "teacher", "teacher_edit", "detached", "greenboard"),
    )
    await eduboard_realtime_manager.connect(
        room_train,
        EduBoardWsClient(ws_other_env, "c_train", 20, "Demo T", "teacher", "teacher_edit", "main"),
    )

    pres = await eduboard_realtime_manager.get_presence(room_prod)
    assert pres["total_connections"] == 2
    assert pres["detached_count"] == 1

    # Broadcast inside PROD reaches detached peer, NOT main sender and NEVER TRAINING tenant
    await eduboard_realtime_manager.broadcast_room(
        room_prod,
        {"type": "scene_sync", "board_id": 777, "client_id": "c_main"},
        exclude_client_id="c_main",
    )
    assert any(m["type"] == "scene_sync" for m in ws_detached.sent)
    assert all(m["type"] != "scene_sync" for m in ws_main.sent)
    assert all(m["type"] != "scene_sync" for m in ws_other_env.sent)

    await eduboard_realtime_manager.disconnect(room_prod, "c_pop")
    after = await eduboard_realtime_manager.get_presence(room_prod)
    assert after["detached_count"] == 0
    assert after["total_connections"] == 1

    await eduboard_realtime_manager.disconnect(room_prod, "c_main")
    await eduboard_realtime_manager.disconnect(room_train, "c_train")
