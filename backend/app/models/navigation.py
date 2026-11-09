# /**
#  * @file        navigation.py
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
#  * @created     2026-11-10
#  * @updated     2026-11-10
#  *
#  * @description SQLAlchemy models for user personalized navigation preferences, personal menus, and privacy-preserving usage telemetry.
#  */

from sqlalchemy import String, Text, Integer, DateTime, ForeignKey, UniqueConstraint, func, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from typing import Optional
from app.core.database import Base


class UserNavigationPreference(Base):
    """
    Single Source of Truth (SSOT) configuration for an individual user's
    personalized menu preferences, navigation mode, pinned shortcuts, and custom groups.
    """
    __tablename__ = "user_navigation_preferences"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    institution_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # Navigation Mode: 'standard' | 'hybrid' | 'my_menu_only'
    navigation_mode: Mapped[str] = mapped_column(String(20), nullable=False, default="standard", server_default="standard")
    
    # JSON array of pinned module / sub-item keys: ["dashboard", "fees/collection", "students"]
    pinned_items: Mapped[str] = mapped_column(Text, nullable=False, default="[]", server_default="[]")
    
    # JSON array of hidden module keys: ["releases", "training"]
    hidden_items: Mapped[str] = mapped_column(Text, nullable=False, default="[]", server_default="[]")
    
    # JSON array of custom user groups: [{"id": "g1", "name": "Daily Counters", "items": ["fees/collection", "attendance/daily"]}]
    custom_groups: Mapped[str] = mapped_column(Text, nullable=False, default="[]", server_default="[]")
    
    # JSON array of custom item ordering: ["dashboard", "students", "fees", ...]
    item_order: Mapped[str] = mapped_column(Text, nullable=False, default="[]", server_default="[]")
    
    # JSON array of dismissed recommendation IDs: ["sug_pin_fees_collection", ...]
    dismissed_suggestions: Mapped[str] = mapped_column(Text, nullable=False, default="[]", server_default="[]")

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    __table_args__ = (
        UniqueConstraint("user_id", "institution_id", name="uq_user_inst_nav_preference"),
    )

    user = relationship("User", backref="navigation_preference")
    institution = relationship("Institution", backref="user_nav_preferences")


class UserNavigationActivity(Base):
    """
    Lightweight, privacy-preserving navigation telemetry recording module visits.
    Strictly records route visit timestamps; never captures form contents or financial data.
    """
    __tablename__ = "user_navigation_activities"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    institution_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    module_key: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    route_path: Mapped[str] = mapped_column(String(200), nullable=False)
    label: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    accessed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )

    __table_args__ = (
        Index("ix_nav_activity_user_time", "user_id", "institution_id", "accessed_at"),
    )

    user = relationship("User")
    institution = relationship("Institution")
