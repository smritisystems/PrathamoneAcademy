# /**
#  * @file        training.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      backend.app.models
#  *
#  * @author      Jawahar R. Mallah
#  * @organization AITDL (AI Technology & Development Lab)
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 AITDL
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-07
#  * @updated     2026-11-07
#  *
#  * @description SQLAlchemy models for Global Training & Demo Environment: configurations, active sessions, and reset audit logs.
#  */

from datetime import datetime
from typing import Optional
from sqlalchemy import (
    String, Integer, Boolean, DateTime, Text, ForeignKey, func
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class TrainingEnvironmentConfig(Base):
    __tablename__ = "training_environment_configs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    institution_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=True
    )
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    reset_policy: Mapped[str] = mapped_column(
        String(30), default="manual_only", nullable=False
    )  # manual_only, after_session, inactivity_timeout, daily_scheduled, never
    inactivity_timeout_minutes: Mapped[int] = mapped_column(
        Integer, default=60, nullable=False
    )
    daily_reset_time: Mapped[str] = mapped_column(
        String(10), default="03:00", nullable=False
    )
    active_dataset_version: Mapped[str] = mapped_column(
        String(50), default="CRM-STAFF-TRAINING-V1", nullable=False
    )
    last_reset_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    last_reset_by_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    last_reset_status: Mapped[str] = mapped_column(
        String(30), default="SUCCESS", nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    institution = relationship("Institution", lazy="selectin")
    last_reset_by = relationship("User", foreign_keys=[last_reset_by_id], lazy="selectin")


class TrainingSession(Base):
    __tablename__ = "training_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    session_token: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    last_active_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    ended_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True, nullable=False, index=True
    )

    user = relationship("User", foreign_keys=[user_id], lazy="selectin")


class TrainingResetLog(Base):
    __tablename__ = "training_reset_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    initiated_by: Mapped[str] = mapped_column(
        String(100), default="admin", nullable=False
    )  # admin, scheduled, session_end, inactivity
    dataset_version: Mapped[str] = mapped_column(
        String(50), default="CRM-STAFF-TRAINING-V1", nullable=False
    )
    records_cleared: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    records_seeded: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    duration_ms: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), default="SUCCESS", nullable=False
    )  # SUCCESS, FAILED, IN_PROGRESS
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    user = relationship("User", foreign_keys=[user_id], lazy="selectin")
