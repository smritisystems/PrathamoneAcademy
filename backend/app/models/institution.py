# /**
#  * @file        institution.py
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
#  * @created     2026-11-03
#  * @updated     2026-11-05
#  *
#  * @description SQLAlchemy model defining coaching institute branch entities and institutional settings.
#  */

from sqlalchemy import String, Text, Boolean, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from app.core.database import Base


class Institution(Base):
    __tablename__ = "institutions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    address: Mapped[str] = mapped_column(Text, nullable=True)
    city: Mapped[str] = mapped_column(String(100), nullable=True)
    state: Mapped[str] = mapped_column(String(100), nullable=True)
    pincode: Mapped[str] = mapped_column(String(10), nullable=True)
    phone: Mapped[str] = mapped_column(String(20), nullable=True)
    email: Mapped[str] = mapped_column(String(200), nullable=True)
    website: Mapped[str] = mapped_column(String(200), nullable=True)
    logo_url: Mapped[str] = mapped_column(String(500), nullable=True)
    short_name: Mapped[str] = mapped_column(String(50), nullable=True, default="PA")
    tagline: Mapped[str] = mapped_column(String(255), nullable=True, default="Learn • Practice • Achieve")
    institute_type: Mapped[str] = mapped_column(String(100), nullable=True, default="Coaching Institute")
    establishment_year: Mapped[int] = mapped_column(nullable=True, default=2018)
    registration_number: Mapped[str] = mapped_column(String(100), nullable=True, default="MH-COACH-2018-0157")
    tax_id: Mapped[str] = mapped_column(String(100), nullable=True, default="AABCP1234K")
    description: Mapped[str] = mapped_column(Text, nullable=True)
    primary_color: Mapped[str] = mapped_column(String(20), nullable=True, default="#1E40AF")
    secondary_color: Mapped[str] = mapped_column(String(20), nullable=True, default="#3B82F6")
    accent_color: Mapped[str] = mapped_column(String(20), nullable=True, default="#8B5CF6")
    favicon_url: Mapped[str] = mapped_column(String(500), nullable=True, default="/favicon.svg")
    timezone: Mapped[str] = mapped_column(String(50), nullable=True, default="Asia/Kolkata")
    default_language: Mapped[str] = mapped_column(String(20), nullable=True, default="en")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    academic_years: Mapped[list["AcademicYear"]] = relationship(
        "AcademicYear", back_populates="institution"
    )
    standards: Mapped[list["Standard"]] = relationship(
        "Standard", back_populates="institution"
    )
    boards: Mapped[list["Board"]] = relationship(
        "Board", back_populates="institution"
    )
    settings: Mapped[list["InstitutionSetting"]] = relationship(
        "InstitutionSetting", back_populates="institution", cascade="all, delete-orphan"
    )
    lookups: Mapped[list["LookupItem"]] = relationship(
        "LookupItem", back_populates="institution", cascade="all, delete-orphan"
    )
    setting_audit_logs: Mapped[list["SettingAuditLog"]] = relationship(
        "SettingAuditLog", back_populates="institution", cascade="all, delete-orphan"
    )

