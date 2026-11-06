# /**
#  * @file        staff.py
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
#  * @created     2026-11-04
#  * @updated     2026-11-06
#  *
#  * @description SQLAlchemy models for Staff Profiles, Documents, Academic Assignments, Attendance, Leaves, and Generated Documents.
#  */

from sqlalchemy import (
    String, Boolean, DateTime, ForeignKey, func, Integer, Text, Date, Numeric, Float, Index, text
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List
from app.core.database import Base


class StaffProfile(Base):
    __tablename__ = "staff_profiles"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True
    )
    institution_id: Mapped[int] = mapped_column(
        ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, default=1
    )
    employee_id: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False, index=True
    )
    staff_type: Mapped[str] = mapped_column(
        String(50), nullable=False, default="teacher"  # teacher, admin, accountant, counselor, receptionist, other
    )
    department: Mapped[str] = mapped_column(
        String(100), nullable=False, default="Academics"
    )
    date_of_birth: Mapped[date | None] = mapped_column(Date, nullable=True)
    gender: Mapped[str | None] = mapped_column(String(20), nullable=True)
    blood_group: Mapped[str | None] = mapped_column(String(10), nullable=True)
    
    # Emergency contact
    emergency_contact_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    emergency_contact_phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    emergency_contact_relation: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Address
    current_address: Mapped[str | None] = mapped_column(Text, nullable=True)
    permanent_address: Mapped[str | None] = mapped_column(Text, nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), default="Mumbai")
    state: Mapped[str | None] = mapped_column(String(100), default="Maharashtra")
    pincode: Mapped[str | None] = mapped_column(String(20), default="400001")

    # Qualifications & Professional Experience
    qualification: Mapped[str | None] = mapped_column(String(200), nullable=True)
    specialization: Mapped[str | None] = mapped_column(String(200), nullable=True)
    experience_years: Mapped[float] = mapped_column(Float, default=0.0)
    joining_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    employment_type: Mapped[str] = mapped_column(
        String(50), default="full_time"  # full_time, part_time, visiting, contract
    )
    contract_start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    contract_end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    status_effective_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    exit_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    exit_reason: Mapped[str | None] = mapped_column(String(255), nullable=True)
    rehire_eligible: Mapped[bool] = mapped_column(Boolean, default=True)
    approved_by_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    # Financial / Compliance
    basic_salary: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"))
    pan_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    aadhar_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    bank_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    bank_account_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    bank_ifsc: Mapped[str | None] = mapped_column(String(20), nullable=True)

    profile_photo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    status: Mapped[str] = mapped_column(
        String(30), default="active", index=True  # active, on_leave, resigned, terminated, inactive
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])
    institution: Mapped["Institution"] = relationship("Institution")
    documents: Mapped[List["StaffDocument"]] = relationship(
        "StaffDocument", back_populates="staff_profile", cascade="all, delete-orphan"
    )
    approved_by: Mapped["User | None"] = relationship("User", foreign_keys=[approved_by_id])
    employment_histories: Mapped[List["StaffEmploymentHistory"]] = relationship(
        "StaffEmploymentHistory", back_populates="staff_profile", cascade="all, delete-orphan", order_by="desc(StaffEmploymentHistory.created_at)"
    )


class StaffEmploymentHistory(Base):
    __tablename__ = "staff_employment_histories"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    staff_profile_id: Mapped[int] = mapped_column(
        ForeignKey("staff_profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # event_type: joined | status_change | contract_renewed | leave_started | leave_ended | resigned | terminated | contract_ended | rehired
    event_type: Mapped[str] = mapped_column(String(50), nullable=False)
    old_status: Mapped[str | None] = mapped_column(String(30), nullable=True)
    new_status: Mapped[str] = mapped_column(String(30), nullable=False)
    effective_date: Mapped[date] = mapped_column(Date, nullable=False, default=date.today)
    reason: Mapped[str | None] = mapped_column(String(255), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    recorded_by_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    staff_profile: Mapped["StaffProfile"] = relationship("StaffProfile", back_populates="employment_histories")
    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])
    recorded_by: Mapped["User | None"] = relationship("User", foreign_keys=[recorded_by_id])


class StaffDocument(Base):
    __tablename__ = "staff_documents"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    staff_profile_id: Mapped[int] = mapped_column(
        ForeignKey("staff_profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    document_type: Mapped[str] = mapped_column(
        String(100), nullable=False  # Degree Certificate, Contract, PAN, Aadhaar, Resume, Experience Letter
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    file_url: Mapped[str] = mapped_column(String(500), nullable=False)
    file_type: Mapped[str] = mapped_column(String(50), default="PDF")
    file_size_bytes: Mapped[int] = mapped_column(Integer, default=0)
    verification_status: Mapped[str] = mapped_column(
        String(30), default="verified"  # pending, verified, rejected
    )
    expiry_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    staff_profile: Mapped["StaffProfile"] = relationship("StaffProfile", back_populates="documents")


class TeacherAssignment(Base):
    __tablename__ = "teacher_assignments"
    __table_args__ = (
        Index(
            "uq_teacher_academic_assignment",
            "teacher_user_id",
            "division_id",
            "subject_id",
            "academic_year_id",
            unique=True,
            postgresql_where=text("is_active = true"),
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    teacher_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    academic_year_id: Mapped[int] = mapped_column(
        ForeignKey("academic_years.id", ondelete="CASCADE"), nullable=False
    )
    board_id: Mapped[int] = mapped_column(
        ForeignKey("boards.id", ondelete="CASCADE"), nullable=False
    )
    standard_id: Mapped[int] = mapped_column(
        ForeignKey("standards.id", ondelete="CASCADE"), nullable=False
    )
    division_id: Mapped[int] = mapped_column(
        ForeignKey("divisions.id", ondelete="CASCADE"), nullable=False
    )
    subject_id: Mapped[int] = mapped_column(
        ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False
    )
    weekly_hours: Mapped[float] = mapped_column(Float, default=4.0)
    is_class_teacher: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    notes: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    teacher: Mapped["User"] = relationship("User", foreign_keys=[teacher_user_id])
    academic_year: Mapped["AcademicYear"] = relationship("AcademicYear")
    board: Mapped["Board"] = relationship("Board")
    standard: Mapped["Standard"] = relationship("Standard")
    division: Mapped["Division"] = relationship("Division")
    subject: Mapped["Subject"] = relationship("Subject")


class StaffAttendance(Base):
    __tablename__ = "staff_attendances"
    __table_args__ = (
        Index("uq_staff_attendance_date", "user_id", "date", unique=True),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    status: Mapped[str] = mapped_column(
        String(20), default="present"  # present, absent, late, half_day, on_leave
    )
    check_in_time: Mapped[str | None] = mapped_column(String(10), nullable=True)  # e.g. "08:45 AM"
    check_out_time: Mapped[str | None] = mapped_column(String(10), nullable=True)  # e.g. "04:30 PM"
    hours_worked: Mapped[float | None] = mapped_column(Float, nullable=True)
    remarks: Mapped[str | None] = mapped_column(String(255), nullable=True)
    marked_by_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])
    marked_by: Mapped["User | None"] = relationship("User", foreign_keys=[marked_by_id])


class StaffLeave(Base):
    __tablename__ = "staff_leaves"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    leave_type: Mapped[str] = mapped_column(
        String(50), nullable=False  # casual, sick, earned, maternity, unpaid
    )
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    days_count: Mapped[float] = mapped_column(Float, default=1.0)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(
        String(30), default="pending", index=True  # pending, approved, rejected, cancelled
    )
    approved_by_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    action_remarks: Mapped[str | None] = mapped_column(String(255), nullable=True)
    action_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    applied_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])
    approved_by: Mapped["User | None"] = relationship("User", foreign_keys=[approved_by_id])


class StaffLeaveBalance(Base):
    __tablename__ = "staff_leave_balances"
    __table_args__ = (
        Index("uq_staff_leave_balance_user_year", "user_id", "academic_year_id", unique=True),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    academic_year_id: Mapped[int] = mapped_column(
        ForeignKey("academic_years.id", ondelete="CASCADE"), nullable=False, default=1
    )
    casual_leave_total: Mapped[float] = mapped_column(Float, default=12.0)
    casual_leave_used: Mapped[float] = mapped_column(Float, default=0.0)
    sick_leave_total: Mapped[float] = mapped_column(Float, default=10.0)
    sick_leave_used: Mapped[float] = mapped_column(Float, default=0.0)
    earned_leave_total: Mapped[float] = mapped_column(Float, default=15.0)
    earned_leave_used: Mapped[float] = mapped_column(Float, default=0.0)

    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])
    academic_year: Mapped["AcademicYear"] = relationship("AcademicYear")


class StaffGeneratedDocument(Base):
    __tablename__ = "staff_generated_documents"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    form_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    reference_number: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    document_type: Mapped[str] = mapped_column(String(100), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    period_month: Mapped[str | None] = mapped_column(String(50), nullable=True)  # e.g. "October 2026"
    status: Mapped[str] = mapped_column(String(30), default="official")  # draft, approved, official, archived
    payload_snapshot: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON snapshot
    generated_by_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    generated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])
    generated_by: Mapped["User | None"] = relationship("User", foreign_keys=[generated_by_id])

