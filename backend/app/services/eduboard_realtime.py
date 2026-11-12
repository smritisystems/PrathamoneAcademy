# /**
#  * @file        eduboard_realtime.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      backend.app.services
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
#  * @description Async multi-window WebSocket room coordinator for PrathamOne EduBoard live stroke synchronization, detached window presence, and tenant-isolated broadcasting.
#  */

import asyncio
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from fastapi import WebSocket

RoomKey = Tuple[int, bool, int]  # (institution_id, is_demo, board_id)


@dataclass
class EduBoardWsClient:
    websocket: WebSocket
    client_id: str
    user_id: int
    user_name: str
    role: str
    mode: str  # 'teacher_edit' | 'presentation' | 'collaborator'
    window_type: str  # 'main' | 'detached'
    surface: Optional[str] = None
    connected_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class EduBoardRoomManager:
    """
    In-memory WebSocket room manager isolated strictly by (institution_id, is_demo, board_id).
    Synchronizes live strokes, page switches/additions/reorders, committed DB revisions,
    and detached pop-out window presence without mutating DB lecture lifecycle on tab close.
    """

    def __init__(self) -> None:
        self._rooms: Dict[RoomKey, Dict[str, EduBoardWsClient]] = {}
        self._lock = asyncio.Lock()

    async def connect(self, room_key: RoomKey, client: EduBoardWsClient) -> Dict[str, Any]:
        async with self._lock:
            room = self._rooms.setdefault(room_key, {})
            room[client.client_id] = client
            snapshot = self._build_presence_locked(room)

        await self.broadcast_room(
            room_key,
            {
                "type": "presence",
                "board_id": room_key[2],
                **snapshot,
            },
        )
        return snapshot

    async def disconnect(self, room_key: RoomKey, client_id: str) -> None:
        snapshot: Optional[Dict[str, Any]] = None
        async with self._lock:
            room = self._rooms.get(room_key)
            if not room:
                return
            room.pop(client_id, None)
            if not room:
                self._rooms.pop(room_key, None)
            else:
                snapshot = self._build_presence_locked(room)

        if snapshot is not None:
            await self.broadcast_room(
                room_key,
                {
                    "type": "presence",
                    "board_id": room_key[2],
                    **snapshot,
                },
            )

    def _build_presence_locked(self, room: Dict[str, EduBoardWsClient]) -> Dict[str, Any]:
        clients: List[Dict[str, Any]] = []
        detached_count = 0
        collaborator_count = 0
        for c in room.values():
            if c.window_type == "detached":
                detached_count += 1
            if c.mode == "collaborator":
                collaborator_count += 1
            clients.append(
                {
                    "client_id": c.client_id,
                    "user_id": c.user_id,
                    "user_name": c.user_name,
                    "role": c.role,
                    "mode": c.mode,
                    "window_type": c.window_type,
                    "surface": c.surface,
                }
            )
        return {
            "total_connections": len(room),
            "detached_count": detached_count,
            "collaborator_count": collaborator_count,
            "clients": clients,
        }

    async def get_presence(self, room_key: RoomKey) -> Dict[str, Any]:
        async with self._lock:
            room = self._rooms.get(room_key)
            if not room:
                return {
                    "total_connections": 0,
                    "detached_count": 0,
                    "collaborator_count": 0,
                    "clients": [],
                }
            return self._build_presence_locked(room)

    async def broadcast_room(
        self,
        room_key: RoomKey,
        payload: Dict[str, Any],
        exclude_client_id: Optional[str] = None,
    ) -> int:
        async with self._lock:
            room = self._rooms.get(room_key)
            if not room:
                return 0
            targets = [
                (cid, c.websocket)
                for cid, c in room.items()
                if exclude_client_id is None or cid != exclude_client_id
            ]

        delivered = 0
        stale_ids: List[str] = []
        for cid, ws in targets:
            try:
                await ws.send_json(payload)
                delivered += 1
            except Exception:
                stale_ids.append(cid)

        if stale_ids:
            async with self._lock:
                room = self._rooms.get(room_key)
                if room:
                    for cid in stale_ids:
                        room.pop(cid, None)
                    if not room:
                        self._rooms.pop(room_key, None)

        return delivered


eduboard_realtime_manager = EduBoardRoomManager()

