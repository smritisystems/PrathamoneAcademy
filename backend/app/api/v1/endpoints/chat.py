# /**
#  * @file        chat.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      backend.app.api.v1.endpoints
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
#  * @description REST and WebSocket endpoints for Full Hybrid Chat: Staff Rooms,
#  */

import json
from typing import Dict, List, Optional, Any
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    status,
    WebSocket,
    WebSocketDisconnect,
)
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db, AsyncSessionLocal
from app.core.deps import get_current_active_user
from app.core.security import decode_token
from app.models.user import User
from app.models.institution import Institution
from app.models.chat import ChatRoom
from app.services.chat_service import ChatService

router = APIRouter(prefix="/chat", tags=["Chat & Academic Doubts"])


# ------------------------------------------------------------------------------
# WebSocket Real-Time Connection Manager
# ------------------------------------------------------------------------------
class ChatConnectionManager:
    def __init__(self):
        # room_id -> list of active WebSockets
        self.active_rooms: Dict[int, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, room_id: int):
        await websocket.accept()
        if room_id not in self.active_rooms:
            self.active_rooms[room_id] = []
        self.active_rooms[room_id].append(websocket)

    def disconnect(self, websocket: WebSocket, room_id: int):
        if room_id in self.active_rooms and websocket in self.active_rooms[room_id]:
            self.active_rooms[room_id].remove(websocket)
            if not self.active_rooms[room_id]:
                del self.active_rooms[room_id]

    async def broadcast(self, room_id: int, message_data: dict):
        if room_id in self.active_rooms:
            for connection in list(self.active_rooms[room_id]):
                try:
                    await connection.send_text(json.dumps(message_data))
                except Exception:
                    self.disconnect(connection, room_id)


manager = ChatConnectionManager()


# ------------------------------------------------------------------------------
# Request / Response Schemas
# ------------------------------------------------------------------------------
class CreateRoomRequest(BaseModel):
    name: str
    code: str
    room_type: str = "STAFF_DEPT"  # 'STAFF_GENERAL', 'STAFF_DEPT', 'BATCH_DOUBT'
    description: Optional[str] = None
    is_curfew_enabled: bool = False


class SendMessageRequest(BaseModel):
    content: str
    message_type: str = "TEXT"  # 'TEXT', 'DOUBT_QUESTION', 'DOUBT_ANSWER', 'ATTACHMENT'
    attachment_url: Optional[str] = None
    attachment_type: Optional[str] = None


# ------------------------------------------------------------------------------
# REST Endpoints
# ------------------------------------------------------------------------------
@router.get("/rooms")
async def list_accessible_rooms(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve all chat rooms accessible to the authenticated staff member or user."""
    inst_id = current_user.institution_id
    if not inst_id:
        inst_stmt = select(Institution.id).order_by(Institution.id.desc()).limit(1)
        inst_id = (await db.execute(inst_stmt)).scalar() or 1

    return await ChatService.get_accessible_rooms(
        session=db,
        institution_id=inst_id,
        user=current_user,
    )


@router.post("/rooms")
async def create_room(
    payload: CreateRoomRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new custom department or collaboration channel (Admin/Principal only)."""
    user_role = (current_user.role or "").lower()
    if user_role not in ("superadmin", "super_admin", "sysadmin", "admin", "principal"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators or principals may create custom chat rooms",
        )

    inst_id = current_user.institution_id
    if not inst_id:
        inst_stmt = select(Institution.id).order_by(Institution.id.desc()).limit(1)
        inst_id = (await db.execute(inst_stmt)).scalar() or 1

    try:
        return await ChatService.create_custom_room(
            session=db,
            institution_id=inst_id,
            name=payload.name,
            code=payload.code,
            room_type=payload.room_type,
            description=payload.description,
            is_curfew_enabled=payload.is_curfew_enabled,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/rooms/{room_id}/messages")
async def get_room_messages(
    room_id: int,
    limit: int = Query(50, ge=1, le=200),
    before_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Fetch paginated message feed for a specific room."""
    return await ChatService.get_room_messages(
        session=db,
        room_id=room_id,
        limit=limit,
        before_id=before_id,
        is_staff=True,
    )


@router.post("/rooms/{room_id}/messages")
async def send_room_message(
    room_id: int,
    payload: SendMessageRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Post a message or academic doubt to a room and broadcast to active WebSocket listeners."""
    try:
        msg = await ChatService.post_message(
            session=db,
            room_id=room_id,
            content=payload.content,
            sender_user=current_user,
            message_type=payload.message_type,
            attachment_url=payload.attachment_url,
            attachment_type=payload.attachment_type,
        )

        # Broadcast real-time event to WebSocket listeners
        await manager.broadcast(room_id, {"type": "NEW_MESSAGE", "message": msg})
        return msg
    except PermissionError as pe:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(pe))
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))


@router.post("/messages/{message_id}/resolve")
async def resolve_doubt_message(
    message_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark an academic doubt question as resolved (Teachers/Admins)."""
    user_role = (current_user.role or "").lower()
    if user_role not in ("superadmin", "super_admin", "sysadmin", "admin", "principal", "teacher"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers or administrators can mark doubts as resolved",
        )

    try:
        result = await ChatService.resolve_doubt(
            session=db,
            message_id=message_id,
            resolved_by_user=current_user,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/rooms/{room_id}/curfew-status")
async def get_curfew_status(
    room_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Evaluate whether curfew lock is currently active on the room."""
    room = (await db.execute(select(ChatRoom).where(ChatRoom.id == room_id))).scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found")

    is_active = ChatService.is_curfew_active(room)
    return {
        "room_id": room.id,
        "is_curfew_enabled": room.is_curfew_enabled,
        "curfew_start_time": room.curfew_start_time,
        "curfew_end_time": room.curfew_end_time,
        "is_curfew_active": is_active,
    }


# ------------------------------------------------------------------------------
# WebSocket Real-Time Stream
# ------------------------------------------------------------------------------
@router.websocket("/ws/{room_id}")
async def chat_websocket_endpoint(
    websocket: WebSocket,
    room_id: int,
    token: Optional[str] = Query(None),
):
    """WebSocket stream for real-time room communication."""
    # Authenticate token
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    try:
        payload = decode_token(token)
        user_id = int(payload.get("sub"))
    except Exception:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await manager.connect(websocket, room_id)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                parsed = json.loads(data)
                content = parsed.get("content", "").strip()
                message_type = parsed.get("message_type", "TEXT")
                attachment_url = parsed.get("attachment_url")

                if content:
                    async with AsyncSessionLocal() as session:
                        user = (await session.execute(
                            select(User).where(User.id == user_id)
                        )).scalar_one_or_none()

                        if user:
                            msg = await ChatService.post_message(
                                session=session,
                                room_id=room_id,
                                content=content,
                                sender_user=user,
                                message_type=message_type,
                                attachment_url=attachment_url,
                            )
                            await manager.broadcast(
                                room_id, {"type": "NEW_MESSAGE", "message": msg}
                            )
            except Exception as inner_ex:
                await websocket.send_text(
                    json.dumps({"type": "ERROR", "error": str(inner_ex)})
                )
    except WebSocketDisconnect:
        manager.disconnect(websocket, room_id)
