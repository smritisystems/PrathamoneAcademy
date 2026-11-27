# /**
#  * @file        institution.py
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
#  * @created     2026-11-03
#  * @updated     2026-11-27
#  *
#  * @description SQLAlchemy models for the canonical Institution master and normalized InstitutionBranch child entities.
#  */

from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.config import PRODUCT_APP_ICON_URL
from app.core.database import Base


class Institution(Base):
    """Canonical tenant Master entity for an educational coaching institute."""

    __tablename__ = "institutions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    # address holds Address Line 1 for backward compatibility with existing reports & prints
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    address_line_2: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    area_locality: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    city: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    district: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    state: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    pincode: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    country: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    alternate_phone: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    website: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    logo_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    short_name: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    tagline: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    institute_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    establishment_year: Mapped[Optional[int]] = mapped_column(nullable=True)
    registration_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    tax_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    gstin: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    pan: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    primary_color: Mapped[Optional[str]] = mapped_column(String(20), nullable=True, default="#0B2D6B")
    secondary_color: Mapped[Optional[str]] = mapped_column(String(20), nullable=True, default="#071C44")
    accent_color: Mapped[Optional[str]] = mapped_column(String(20), nullable=True, default="#F57C00")
    favicon_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True, default=PRODUCT_APP_ICON_URL)
    timezone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, default="Asia/Kolkata")
    default_language: Mapped[Optional[str]] = mapped_column(String(20), nullable=True, default="en")
    onboarding_completed: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="false", nullable=False
    )
    onboarding_completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
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
    message_templates: Mapped[list["MessageTemplate"]] = relationship(
        "MessageTemplate", back_populates="institution", cascade="all, delete-orphan"
    )
    communication_logs: Mapped[list["CommunicationLog"]] = relationship(
        "CommunicationLog", back_populates="institution", cascade="all, delete-orphan"
    )
    branches: Mapped[list["InstitutionBranch"]] = relationship(
        "InstitutionBranch", back_populates="institution", cascade="all, delete-orphan"
    )


class InstitutionBranch(Base):
    """Normalized physical branch / campus entity belonging to one canonical Institution."""

    __tablename__ = "institution_branches"
    __table_args__ = (
        UniqueConstraint("institution_id", "branch_code", name="uq_institution_branch_code"),
        Index("ix_institution_branches_institution_id", "institution_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    institution_id: Mapped[int] = mapped_column(
        ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False
    )
    branch_name: Mapped[str] = mapped_column(String(150), nullable=False)
    branch_code: Mapped[str] = mapped_column(String(50), nullable=False)
    is_main_branch: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false", nullable=False)
    address_line_1: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    address_line_2: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    area_locality: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    city: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    district: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    state: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    pincode: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    country: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    alternate_phone: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    gstin: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    institution: Mapped["Institution"] = relationship("Institution", back_populates="branches")
