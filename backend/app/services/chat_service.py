# /**
#  * @file        chat_service.py
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
#  * @created     2026-11-16
#  * @updated     2026-11-16
#  *
#  * @description Domain service managing Full Hybrid Chat: Staff Collaboration Rooms,
#  */

import re
from datetime import datetime, time as dtime, timezone
from typing import List, Optional, Dict, Any, Tuple
from sqlalchemy import select, or_, and_, desc, func, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.chat import ChatRoom, ChatParticipant, ChatMessage
from app.models.user import User
from app.models.student import Student
from app.models.division import Division
from app.models.standard import Standard
from app.models.enrollment import StudentEnrollment


# Basic educational profanity and abuse filter list
ABUSIVE_KEYWORDS = {
    "abuse", "idiot", "stupid", "bastard", "cheat", "scam", "leak", "paper leak",
    "exam leak", "harass", "vulgar", "bitch", "asshole", "fuck", "shit", "chutiya", "madarchod"
}

DEFAULT_STAFF_ROOMS = [
    ("STAFF_GENERAL", "Staff General", "staff_general", "All-staff general communication and notices"),
    ("STAFF_DEPT", "Faculty Room", "faculty_room", "Academic faculty syllabus, lectures, and test prep"),
    ("STAFF_DEPT", "Accounts & Fees Desk", "accounts_desk", "Fee collections, concessions, and reconciliations"),
    ("STAFF_DEPT", "Reception & Admissions Desk", "reception_desk", "Walk-in inquiries, parent visits, and student pickups"),
]


class ChatService:
    @classmethod
    async def sync_default_staff_rooms(cls, session: AsyncSession, institution_id: int = 1):
        """Ensure core staff collaboration channels exist for the institution."""
        created_any = False
        for r_type, name, code, desc_text in DEFAULT_STAFF_ROOMS:
            existing = (await session.execute(
                select(ChatRoom).where(ChatRoom.code == code)
            )).scalar_one_or_none()
            if not existing:
                new_room = ChatRoom(
                    institution_id=institution_id,
                    room_type=r_type,
                    name=name,
                    code=code,
                    description=desc_text,
                    is_active=True,
                    is_curfew_enabled=False,
                )
                session.add(new_room)
                created_any = True
        if created_any:
            await session.commit()
    @staticmethod
    def is_curfew_active(room: ChatRoom, now: Optional[datetime] = None) -> bool:
        """Evaluate if room curfew mode is currently active."""
        if not room.is_curfew_enabled or not room.curfew_start_time or not room.curfew_end_time:
            return False

        current_dt = now or datetime.now()
        current_time = current_dt.time()

        try:
            start_parts = [int(p) for p in room.curfew_start_time.split(":")]
            end_parts = [int(p) for p in room.curfew_end_time.split(":")]
            curfew_start = dtime(start_parts[0], start_parts[1])
            curfew_end = dtime(end_parts[0], end_parts[1])

            if curfew_start > curfew_end:
                # Overnight curfew (e.g. 20:30 to 08:00)
                return current_time >= curfew_start or current_time <= curfew_end
            else:
                return curfew_start <= current_time <= curfew_end
        except Exception:
            return False

    @staticmethod
    def screen_content(content: str) -> Tuple[bool, Optional[str]]:
        """Screen content against educational anti-abuse rules."""
        lower_content = content.lower()
        for kw in ABUSIVE_KEYWORDS:
            pattern = r"\b" + re.escape(kw) + r"\b"
            if re.search(pattern, lower_content):
                return True, f"Prohibited word detected: '{kw}'"
        return False, None

    @classmethod
    async def sync_batch_rooms(cls, session: AsyncSession, institution_id: int = 1) -> List[ChatRoom]:
        """Automatically create and synchronize doubt rooms for all active divisions."""
        div_stmt = (
            select(Division)
            .join(Standard, Standard.id == Division.standard_id)
            .where(Division.is_active == True)
            .options(selectinload(Division.standard))
        )
        divisions = (await session.execute(div_stmt)).scalars().all()

        synced_rooms = []
        for div in divisions:
            code = f"batch_doubt_div_{div.id}"
            existing = (await session.execute(
                select(ChatRoom).where(ChatRoom.code == code)
            )).scalar_one_or_none()

            std_name = div.standard.name if div.standard else "Standard"
            room_name = f"{std_name} — Division {div.name} Academic Doubts"

            if not existing:
                new_room = ChatRoom(
                    institution_id=institution_id,
                    room_type="BATCH_DOUBT",
                    name=room_name,
                    code=code,
                    description=f"Curfew-moderated doubt desk for {std_name} Division {div.name}",
                    standard_id=div.standard_id,
                    division_id=div.id,
                    is_active=True,
                    is_curfew_enabled=True,
                    curfew_start_time="20:30",
                    curfew_end_time="08:00",
                )
                session.add(new_room)
                synced_rooms.append(new_room)
            else:
                synced_rooms.append(existing)

        if synced_rooms:
            await session.commit()

        return synced_rooms

    @classmethod
    async def get_accessible_rooms(
        cls,
        session: AsyncSession,
        institution_id: int,
        user: Optional[User] = None,
        student: Optional[Student] = None,
    ) -> List[Dict[str, Any]]:
        """Return all rooms accessible to the authenticated user or student."""
        # Ensure default staff rooms and batch rooms are provisioned
        await cls.sync_default_staff_rooms(session, institution_id)
        await cls.sync_batch_rooms(session, institution_id)

        rooms_stmt = select(ChatRoom).where(
            ChatRoom.institution_id == institution_id,
            ChatRoom.is_active == True,
        ).order_by(ChatRoom.room_type, ChatRoom.name)

        all_rooms = (await session.execute(rooms_stmt)).scalars().all()
        accessible = []

        is_staff = user is not None
        user_role = (user.role.lower() if user and user.role else "")

        # For student: find active divisions
        student_div_ids = set()
        if student:
            enr_stmt = select(StudentEnrollment.division_id).where(
                StudentEnrollment.student_id == student.id,
                StudentEnrollment.status == "active",
            )
            student_div_ids = set((await session.execute(enr_stmt)).scalars().all())

        now = datetime.now()

        for room in all_rooms:
            can_access = False
            user_room_role = "MEMBER"

            if is_staff:
                # Admins, principals, teachers see all staff rooms and doubt rooms
                if user_role in ("superadmin", "super_admin", "sysadmin", "admin", "principal"):
                    can_access = True
                    user_room_role = "MODERATOR"
                elif user_role == "teacher":
                    can_access = True
                    user_room_role = "TEACHER"
                elif user_role in ("accountant", "staff", "receptionist", "counselor"):
                    # Staff members see staff rooms
                    if room.room_type in ("STAFF_GENERAL", "STAFF_DEPT", "STAFF_DIRECT"):
                        can_access = True
                        user_room_role = "MEMBER"
            elif student:
                # Students ONLY see their enrolled batch doubt rooms
                if room.room_type == "BATCH_DOUBT" and room.division_id in student_div_ids:
                    can_access = True
                    user_room_role = "STUDENT"

            if can_access:
                # Count unresolved doubts
                unresolved_count = 0
                if room.room_type == "BATCH_DOUBT":
                    d_count_stmt = select(func.count(ChatMessage.id)).where(
                        ChatMessage.room_id == room.id,
                        ChatMessage.message_type == "DOUBT_QUESTION",
                        ChatMessage.is_doubt_resolved == False,
                        ChatMessage.is_deleted == False,
                        ChatMessage.is_quarantined == False,
                    )
                    unresolved_count = (await session.execute(d_count_stmt)).scalar() or 0

                curfew_active = cls.is_curfew_active(room, now)

                accessible.append({
                    "id": room.id,
                    "name": room.name,
                    "code": room.code,
                    "room_type": room.room_type,
                    "description": room.description,
                    "standard_id": room.standard_id,
                    "division_id": room.division_id,
                    "subject_id": room.subject_id,
                    "is_curfew_enabled": room.is_curfew_enabled,
                    "curfew_start_time": room.curfew_start_time,
                    "curfew_end_time": room.curfew_end_time,
                    "is_curfew_active": curfew_active,
                    "user_room_role": user_room_role,
                    "unresolved_doubts_count": unresolved_count,
                    "created_at": room.created_at.isoformat() if room.created_at else None,
                })

        return accessible

    @classmethod
    async def get_room_messages(
        cls,
        session: AsyncSession,
        room_id: int,
        limit: int = 50,
        before_id: Optional[int] = None,
        is_staff: bool = True,
    ) -> List[Dict[str, Any]]:
        """Retrieve paginated messages for a room."""
        stmt = (
            select(ChatMessage)
            .where(
                ChatMessage.room_id == room_id,
                ChatMessage.is_deleted == False,
            )
            .order_by(desc(ChatMessage.created_at))
            .limit(limit)
        )

        if before_id:
            stmt = stmt.where(ChatMessage.id < before_id)

        if not is_staff:
            # Hide quarantined messages from students
            stmt = stmt.where(ChatMessage.is_quarantined == False)

        messages = (await session.execute(stmt)).scalars().all()

        result = []
        for m in reversed(messages):
            result.append({
                "id": m.id,
                "room_id": m.room_id,
                "sender_user_id": m.sender_user_id,
                "sender_student_id": m.sender_student_id,
                "sender_display_name": m.sender_display_name,
                "sender_role": m.sender_role,
                "message_type": m.message_type,
                "content": m.content,
                "attachment_url": m.attachment_url,
                "attachment_type": m.attachment_type,
                "is_doubt_resolved": m.is_doubt_resolved,
                "resolved_by_user_id": m.resolved_by_user_id,
                "resolved_at": m.resolved_at.isoformat() if m.resolved_at else None,
                "is_quarantined": m.is_quarantined,
                "quarantine_reason": m.quarantine_reason if is_staff else None,
                "created_at": m.created_at.isoformat() if m.created_at else None,
            })

        return result

    @classmethod
    async def post_message(
        cls,
        session: AsyncSession,
        room_id: int,
        content: str,
        sender_user: Optional[User] = None,
        sender_student: Optional[Student] = None,
        message_type: str = "TEXT",
        attachment_url: Optional[str] = None,
        attachment_type: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Post a new message or doubt to a room with curfew and quarantine checks."""
        room = (await session.execute(
            select(ChatRoom).where(ChatRoom.id == room_id, ChatRoom.is_active == True)
        )).scalar_one_or_none()

        if not room:
            raise ValueError("Chat room not found or inactive")

        is_staff = sender_user is not None
        sender_role = "STAFF"
        display_name = "User"

        if sender_user:
            sender_role = (sender_user.role or "STAFF").upper()
            display_name = sender_user.full_name or sender_user.username
        elif sender_student:
            sender_role = "STUDENT"
            display_name = f"{sender_student.first_name} {sender_student.last_name}".strip()

        # Check Curfew Mode: Students are prohibited from sending messages during curfew
        if not is_staff and cls.is_curfew_active(room):
            raise PermissionError(
                f"Curfew active for this academic room until {room.curfew_end_time}. "
                "Messaging is restricted overnight to encourage healthy study habits."
            )

        # Anti-abuse screening
        is_quarantined, quarantine_reason = cls.screen_content(content)

        msg = ChatMessage(
            room_id=room.id,
            sender_user_id=sender_user.id if sender_user else None,
            sender_student_id=sender_student.id if sender_student else None,
            sender_display_name=display_name,
            sender_role=sender_role,
            message_type=message_type,
            content=content,
            attachment_url=attachment_url,
            attachment_type=attachment_type,
            is_doubt_resolved=False,
            is_quarantined=is_quarantined,
            quarantine_reason=quarantine_reason,
            is_deleted=False,
        )
        session.add(msg)
        await session.commit()
        await session.refresh(msg)

        return {
            "id": msg.id,
            "room_id": msg.room_id,
            "sender_user_id": msg.sender_user_id,
            "sender_student_id": msg.sender_student_id,
            "sender_display_name": msg.sender_display_name,
            "sender_role": msg.sender_role,
            "message_type": msg.message_type,
            "content": msg.content,
            "attachment_url": msg.attachment_url,
            "attachment_type": msg.attachment_type,
            "is_doubt_resolved": msg.is_doubt_resolved,
            "is_quarantined": msg.is_quarantined,
            "quarantine_reason": msg.quarantine_reason if is_staff else None,
            "created_at": msg.created_at.isoformat() if msg.created_at else None,
        }

    @classmethod
    async def resolve_doubt(
        cls,
        session: AsyncSession,
        message_id: int,
        resolved_by_user: User,
    ) -> Dict[str, Any]:
        """Mark an academic doubt question as resolved."""
        stmt = select(ChatMessage).where(ChatMessage.id == message_id)
        msg = (await session.execute(stmt)).scalar_one_or_none()

        if not msg:
            raise ValueError("Message not found")

        msg.is_doubt_resolved = True
        msg.resolved_by_user_id = resolved_by_user.id
        msg.resolved_at = datetime.now(timezone.utc)

        await session.commit()
        await session.refresh(msg)

        return {
            "id": msg.id,
            "is_doubt_resolved": msg.is_doubt_resolved,
            "resolved_by_user_id": msg.resolved_by_user_id,
            "resolved_at": msg.resolved_at.isoformat() if msg.resolved_at else None,
        }

    @classmethod
    async def create_custom_room(
        cls,
        session: AsyncSession,
        institution_id: int,
        name: str,
        code: str,
        room_type: str,
        description: Optional[str] = None,
        is_curfew_enabled: bool = False,
    ) -> Dict[str, Any]:
        """Create a new staff or department collaboration room."""
        existing = (await session.execute(
            select(ChatRoom).where(ChatRoom.code == code)
        )).scalar_one_or_none()

        if existing:
            raise ValueError(f"A room with code '{code}' already exists")

        room = ChatRoom(
            institution_id=institution_id,
            room_type=room_type,
            name=name,
            code=code,
            description=description,
            is_active=True,
            is_curfew_enabled=is_curfew_enabled,
        )
        session.add(room)
        await session.commit()
        await session.refresh(room)

        return {
            "id": room.id,
            "name": room.name,
            "code": room.code,
            "room_type": room.room_type,
            "description": room.description,
            "is_curfew_enabled": room.is_curfew_enabled,
        }
