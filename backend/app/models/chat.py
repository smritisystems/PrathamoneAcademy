# /**
#  * @file        chat.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      backend.app.models
#  *
#  * @author      Jawahar R. Mallah
#  * @organization Smritisys & AITDL Networks
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 PrathamOne EduOS
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-16
#  * @updated     2026-11-16
#  *
#  * @description SQLAlchemy ORM models for Full Hybrid Chat: Staff Collaboration Rooms,
#  */

from datetime import datetime
from typing import Optional, List
from sqlalchemy import (
    String,
    Boolean,
    DateTime,
    ForeignKey,
    func,
    Integer,
    Text,
    Index,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class ChatRoom(Base):
    __tablename__ = "chat_rooms"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    institution_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    room_type: Mapped[str] = mapped_column(
        String(30), nullable=False, index=True
    )  # 'STAFF_GENERAL', 'STAFF_DEPT', 'STAFF_DIRECT', 'BATCH_DOUBT'
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    code: Mapped[str] = mapped_column(String(100), nullable=False, unique=True, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    academic_year_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("academic_years.id", ondelete="CASCADE"), nullable=True, index=True
    )
    standard_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("standards.id", ondelete="SET NULL"), nullable=True, index=True
    )
    division_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("divisions.id", ondelete="SET NULL"), nullable=True, index=True
    )
    subject_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True, index=True
    )

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_curfew_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    curfew_start_time: Mapped[Optional[str]] = mapped_column(String(10), default="20:30", nullable=True)
    curfew_end_time: Mapped[Optional[str]] = mapped_column(String(10), default="08:00", nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    institution = relationship("Institution")
    academic_year = relationship("AcademicYear")
    standard = relationship("Standard")
    division = relationship("Division")
    subject = relationship("Subject")
    participants: Mapped[List["ChatParticipant"]] = relationship(
        "ChatParticipant", back_populates="room", cascade="all, delete-orphan"
    )
    messages: Mapped[List["ChatMessage"]] = relationship(
        "ChatMessage", back_populates="room", cascade="all, delete-orphan", order_by="ChatMessage.created_at"
    )

    __table_args__ = (
        Index("ix_chat_rooms_inst_type", "institution_id", "room_type"),
    )


class ChatParticipant(Base):
    __tablename__ = "chat_participants"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    room_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("chat_rooms.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True
    )
    student_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=True, index=True
    )
    role_in_room: Mapped[str] = mapped_column(
        String(30), default="MEMBER", nullable=False
    )  # 'MODERATOR', 'TEACHER', 'MEMBER', 'OBSERVER'
    is_muted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    last_read_message_id: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    room: Mapped["ChatRoom"] = relationship("ChatRoom", back_populates="participants")
    user = relationship("User")
    student = relationship("Student")

    __table_args__ = (
        UniqueConstraint("room_id", "user_id", name="uq_chat_participant_user"),
        UniqueConstraint("room_id", "student_id", name="uq_chat_participant_student"),
    )


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    room_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("chat_rooms.id", ondelete="CASCADE"), nullable=False, index=True
    )
    sender_user_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    sender_student_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("students.id", ondelete="SET NULL"), nullable=True, index=True
    )
    sender_display_name: Mapped[str] = mapped_column(String(120), nullable=False)
    sender_role: Mapped[str] = mapped_column(
        String(30), nullable=False
    )  # 'ADMIN', 'TEACHER', 'STUDENT', 'STAFF'
    message_type: Mapped[str] = mapped_column(
        String(30), default="TEXT", nullable=False
    )  # 'TEXT', 'DOUBT_QUESTION', 'DOUBT_ANSWER', 'ATTACHMENT', 'SYSTEM_NOTICE'
    content: Mapped[str] = mapped_column(Text, nullable=False)
    attachment_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    attachment_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    is_doubt_resolved: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    resolved_by_user_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    is_quarantined: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    quarantine_reason: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    room: Mapped["ChatRoom"] = relationship("ChatRoom", back_populates="messages")
    sender_user = relationship("User", foreign_keys=[sender_user_id])
    sender_student = relationship("Student", foreign_keys=[sender_student_id])
    resolved_by = relationship("User", foreign_keys=[resolved_by_user_id])

    __table_args__ = (
        Index("ix_chat_messages_room_created", "room_id", "created_at"),
    )
