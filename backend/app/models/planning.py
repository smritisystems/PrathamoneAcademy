# /**
#  * @file        planning.py
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
#  * @updated     2026-11-17
#  *
#  * @description Canonical planning activities, assignments, attachments, references, and recurrence exceptions.
#  */

from datetime import date, datetime
from typing import List, Optional

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Activity(Base):
    __tablename__ = "activities"
    __table_args__ = (
        CheckConstraint(
            "activity_type IN ('task', 'event', 'holiday')",
            name="ck_activities_type",
        ),
        CheckConstraint(
            "status IN ('backlog', 'todo', 'in_progress', 'blocked', 'completed', 'cancelled')",
            name="ck_activities_status",
        ),
        CheckConstraint(
            "priority IN ('low', 'normal', 'high', 'urgent')",
            name="ck_activities_priority",
        ),
        CheckConstraint(
            "recurrence_frequency IS NULL OR recurrence_frequency IN ('daily', 'weekly', 'monthly')",
            name="ck_activities_recurrence_frequency",
        ),
        CheckConstraint(
            "recurrence_interval >= 1",
            name="ck_activities_recurrence_interval",
        ),
        CheckConstraint(
            "end_at IS NULL OR (start_at IS NOT NULL AND end_at > start_at)",
            name="ck_activities_valid_time_range",
        ),
        Index("ix_activities_institution_status", "institution_id", "status"),
        Index("ix_activities_institution_start", "institution_id", "start_at"),
        Index("ix_activities_institution_due", "institution_id", "due_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    institution_id: Mapped[int] = mapped_column(
        ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    academic_year_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("academic_years.id", ondelete="SET NULL"), nullable=True, index=True
    )
    division_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("divisions.id", ondelete="SET NULL"), nullable=True, index=True
    )
    subject_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True, index=True
    )
    created_by_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )

    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    activity_type: Mapped[str] = mapped_column(
        String(20), nullable=False, default="task", server_default="task"
    )
    category: Mapped[str] = mapped_column(
        String(30), nullable=False, default="administrative", server_default="administrative"
    )
    start_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    end_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    due_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    timezone: Mapped[str] = mapped_column(
        String(50), nullable=False, default="Asia/Kolkata", server_default="Asia/Kolkata"
    )
    all_day: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    location: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    priority: Mapped[str] = mapped_column(
        String(20), nullable=False, default="normal", server_default="normal"
    )
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="todo", server_default="todo", index=True
    )
    visibility: Mapped[str] = mapped_column(
        String(20), nullable=False, default="institution", server_default="institution"
    )
    is_published: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")

    recurrence_frequency: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    recurrence_interval: Mapped[int] = mapped_column(Integer, nullable=False, default=1, server_default="1")
    recurrence_until: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    recurrence_weekdays: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)

    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1, server_default="1")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    assignees: Mapped[List["ActivityAssignee"]] = relationship(
        back_populates="activity", cascade="all, delete-orphan", lazy="selectin"
    )
    attachments: Mapped[List["ActivityAttachment"]] = relationship(
        back_populates="activity", cascade="all, delete-orphan", lazy="selectin"
    )
    references: Mapped[List["ActivityReference"]] = relationship(
        back_populates="activity", cascade="all, delete-orphan", lazy="selectin"
    )
    recurrence_exceptions: Mapped[List["ActivityRecurrenceException"]] = relationship(
        back_populates="activity", cascade="all, delete-orphan", lazy="selectin"
    )


class ActivityAssignee(Base):
    __tablename__ = "activity_assignees"
    __table_args__ = (
        UniqueConstraint("activity_id", "user_id", name="uq_activity_assignee_user"),
        Index("ix_activity_assignees_user", "user_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    activity_id: Mapped[int] = mapped_column(
        ForeignKey("activities.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    assigned_by_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    assigned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    activity: Mapped["Activity"] = relationship(back_populates="assignees")
    user = relationship("User", foreign_keys=[user_id])
    assigned_by = relationship("User", foreign_keys=[assigned_by_id])


class ActivityAttachment(Base):
    __tablename__ = "activity_attachments"
    __table_args__ = (Index("ix_activity_attachments_activity", "activity_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    activity_id: Mapped[int] = mapped_column(
        ForeignKey("activities.id", ondelete="CASCADE"), nullable=False
    )
    uploader_user_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    stored_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    storage_path: Mapped[str] = mapped_column(String(500), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(150), nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    activity: Mapped["Activity"] = relationship(back_populates="attachments")
    uploader = relationship("User", foreign_keys=[uploader_user_id])


class ActivityReference(Base):
    __tablename__ = "activity_references"
    __table_args__ = (
        CheckConstraint(
            "source_type IN ('student', 'lead', 'fee_invoice', 'attendance', 'academic_year', 'division', 'subject', 'examination', 'timetable_entry', 'communication_log', 'homework_assignment')",
            name="ck_activity_references_source_type",
        ),
        UniqueConstraint(
            "activity_id", "source_type", "source_record_id", name="uq_activity_reference"
        ),
        Index("ix_activity_references_source", "source_type", "source_record_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    activity_id: Mapped[int] = mapped_column(
        ForeignKey("activities.id", ondelete="CASCADE"), nullable=False
    )
    source_type: Mapped[str] = mapped_column(String(30), nullable=False)
    source_record_id: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    activity: Mapped["Activity"] = relationship(back_populates="references")


class ActivityRecurrenceException(Base):
    __tablename__ = "activity_recurrence_exceptions"
    __table_args__ = (
        UniqueConstraint(
            "activity_id", "occurrence_date", name="uq_activity_recurrence_exception"
        ),
        Index("ix_activity_recurrence_exceptions_activity", "activity_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    activity_id: Mapped[int] = mapped_column(
        ForeignKey("activities.id", ondelete="CASCADE"), nullable=False
    )
    occurrence_date: Mapped[date] = mapped_column(Date, nullable=False)
    created_by_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    activity: Mapped["Activity"] = relationship(back_populates="recurrence_exceptions")
