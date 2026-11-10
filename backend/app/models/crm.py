# /**
#  * @file        crm.py
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
#  * @updated     2026-11-10
#  *
#  * @description SQLAlchemy models for Lead Management & CRM: Enquiries, Follow-up Logs, Demo Classes, and Admission Conversion.
#  */

from datetime import datetime, date
from typing import Optional, List
from sqlalchemy import (
    String, Integer, Boolean, DateTime, Date, Text, ForeignKey,
    Index, func, Float
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class Lead(Base):
    __tablename__ = "leads"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    institution_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("institutions.id"), nullable=False, index=True
    )
    lead_number: Mapped[str] = mapped_column(
        String(30), unique=True, nullable=False, index=True
    )
    academic_year_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("academic_years.id"), nullable=True, index=True
    )
    standard_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("standards.id"), nullable=True, index=True
    )
    board_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("boards.id"), nullable=True, index=True
    )
    interested_course: Mapped[Optional[str]] = mapped_column(
        String(150), nullable=True
    )
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    gender: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    date_of_birth: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True, index=True)
    email: Mapped[Optional[str]] = mapped_column(String(200), nullable=True, index=True)
    school_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    city: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    state: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    pincode: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)

    # Parent / Guardian Information
    guardian_name: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    guardian_relation: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    guardian_phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True, index=True)
    guardian_email: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    guardian_occupation: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # CRM Stage & Classification
    stage: Mapped[str] = mapped_column(
        String(30), default="new_enquiry", nullable=False, index=True
    )  # new_enquiry, contacted, counselling_demo, interested, admission_pending, converted, lost, junk
    priority: Mapped[str] = mapped_column(
        String(20), default="warm", nullable=False, index=True
    )  # hot, warm, cold
    source: Mapped[str] = mapped_column(
        String(50), default="Website", nullable=False, index=True
    )  # Website, Walk-in, Referral, WhatsApp, Phone Enquiry, Social Media, Newspaper Ad, Campaign
    campaign_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Counsellor Assignment
    assigned_to_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=True, index=True
    )
    enquiry_date: Mapped[date] = mapped_column(
        Date, default=date.today, nullable=False
    )
    next_follow_up_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True, index=True
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Conversion Tracking
    converted_student_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("students.id"), nullable=True, index=True
    )
    converted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    converted_by_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=True
    )
    lost_reason: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    lost_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    # Global Training & Demo Environment Metadata
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    data_environment: Mapped[str] = mapped_column(String(20), default="PRODUCTION", nullable=False, index=True)
    demo_dataset_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    institution = relationship("Institution", lazy="selectin")
    academic_year = relationship("AcademicYear", lazy="selectin")
    standard = relationship("Standard", lazy="selectin")
    board = relationship("Board", lazy="selectin")
    assigned_to = relationship("User", foreign_keys=[assigned_to_id], lazy="selectin")
    converted_student = relationship("Student", foreign_keys=[converted_student_id], lazy="selectin")
    converted_by = relationship("User", foreign_keys=[converted_by_id], lazy="selectin")

    follow_ups: Mapped[List["LeadFollowUp"]] = relationship(
        "LeadFollowUp", back_populates="lead", cascade="all, delete-orphan",
        order_by="desc(LeadFollowUp.created_at)", lazy="selectin"
    )
    demo_classes: Mapped[List["LeadDemoClass"]] = relationship(
        "LeadDemoClass", back_populates="lead", cascade="all, delete-orphan",
        order_by="desc(LeadDemoClass.scheduled_at)", lazy="selectin"
    )
    communications = relationship(
        "CommunicationLog", back_populates="lead",
        order_by="desc(CommunicationLog.created_at)", lazy="selectin"
    )

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()


class LeadFollowUp(Base):
    __tablename__ = "lead_follow_ups"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    lead_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("leads.id", ondelete="CASCADE"), nullable=False, index=True
    )
    institution_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("institutions.id"), nullable=False, index=True
    )
    follow_up_type: Mapped[str] = mapped_column(
        String(30), default="call", nullable=False
    )  # call, whatsapp, email, meeting, visit
    stage_at_time: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    status: Mapped[str] = mapped_column(
        String(20), default="completed", nullable=False
    )  # completed, scheduled, cancelled, missed
    scheduled_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    outcome: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True
    )  # interested, not_reachable, call_back, callback_requested, visit_scheduled, demo_scheduled, admission_confirmed, lost
    remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    next_follow_up_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    performed_by_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=True
    )
    # Global Training & Demo Environment Metadata
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    data_environment: Mapped[str] = mapped_column(String(20), default="PRODUCTION", nullable=False, index=True)
    demo_dataset_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    lead: Mapped["Lead"] = relationship("Lead", back_populates="follow_ups")
    performed_by = relationship("User", foreign_keys=[performed_by_id], lazy="selectin")


class LeadDemoClass(Base):
    __tablename__ = "lead_demo_classes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    lead_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("leads.id", ondelete="CASCADE"), nullable=False, index=True
    )
    institution_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("institutions.id"), nullable=False, index=True
    )
    standard_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("standards.id"), nullable=True
    )
    subject_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("subjects.id"), nullable=True
    )
    subject_mapping_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("subject_mappings.id", ondelete="SET NULL"), nullable=True, index=True
    )
    teacher_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=True
    )
    scheduled_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    status: Mapped[str] = mapped_column(
        String(20), default="scheduled", nullable=False
    )  # scheduled, attended, absent, cancelled
    feedback: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    rating: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # 1 to 5
    # Global Training & Demo Environment Metadata
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    data_environment: Mapped[str] = mapped_column(String(20), default="PRODUCTION", nullable=False, index=True)
    demo_dataset_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    lead: Mapped["Lead"] = relationship("Lead", back_populates="demo_classes")
    standard = relationship("Standard", lazy="selectin")
    subject = relationship("Subject", lazy="selectin")
    teacher = relationship("User", foreign_keys=[teacher_id], lazy="selectin")
