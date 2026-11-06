# /**
#  * @file        teacher_payroll.py
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
#  * @created     2026-11-06
#  * @updated     2026-11-06
#  *
#  * @description SQLAlchemy models for Teacher Payment Profiles, Teaching Session Register, Monthly Payroll, and Payment Vouchers.
#  */

from sqlalchemy import (
    String, Boolean, DateTime, ForeignKey, func, Integer, Text, Date, Numeric, Float, Index, text
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List
from app.core.database import Base


class TeacherPaymentProfile(Base):
    __tablename__ = "teacher_payment_profiles"
    __table_args__ = (
        Index("uq_active_teacher_payment_profile", "teacher_user_id", "institution_id", unique=True, postgresql_where=text("is_active = true")),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    institution_id: Mapped[int] = mapped_column(
        ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, default=1, index=True
    )
    teacher_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # Payment method: hourly | per_lecture | monthly_fixed | fixed_contract | mixed
    payment_method: Mapped[str] = mapped_column(String(30), default="hourly", nullable=False)
    hourly_rate: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    per_lecture_rate: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    monthly_fixed_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    contract_total_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="INR", nullable=False)
    effective_from: Mapped[date] = mapped_column(Date, nullable=False, default=date.today)
    effective_until: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    # Payment frequency: monthly | biweekly | term_end | per_milestone
    payment_frequency: Mapped[str] = mapped_column(String(30), default="monthly", nullable=False)
    payment_terms: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_by_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    teacher: Mapped["User"] = relationship("User", foreign_keys=[teacher_user_id])
    institution: Mapped["Institution"] = relationship("Institution")
    created_by: Mapped[Optional["User"]] = relationship("User", foreign_keys=[created_by_id])
    rate_histories: Mapped[List["TeacherRateHistory"]] = relationship(
        "TeacherRateHistory", back_populates="payment_profile", cascade="all, delete-orphan", order_by="desc(TeacherRateHistory.changed_at)"
    )
    milestones: Mapped[List["TeacherContractMilestone"]] = relationship(
        "TeacherContractMilestone", back_populates="payment_profile", cascade="all, delete-orphan", order_by="TeacherContractMilestone.milestone_order"
    )


class TeacherRateHistory(Base):
    __tablename__ = "teacher_rate_histories"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    payment_profile_id: Mapped[int] = mapped_column(
        ForeignKey("teacher_payment_profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    teacher_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    old_payment_method: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    new_payment_method: Mapped[str] = mapped_column(String(30), nullable=False)
    old_rate: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)
    new_rate: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    effective_from: Mapped[date] = mapped_column(Date, nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    changed_by_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    changed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    payment_profile: Mapped["TeacherPaymentProfile"] = relationship("TeacherPaymentProfile", back_populates="rate_histories")
    teacher: Mapped["User"] = relationship("User", foreign_keys=[teacher_user_id])
    changed_by: Mapped[Optional["User"]] = relationship("User", foreign_keys=[changed_by_id])


class TeacherContractMilestone(Base):
    __tablename__ = "teacher_contract_milestones"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    payment_profile_id: Mapped[int] = mapped_column(
        ForeignKey("teacher_payment_profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    milestone_name: Mapped[str] = mapped_column(String(150), nullable=False)
    milestone_order: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    percentage: Mapped[float] = mapped_column(Float, default=0.0)
    due_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    achieved_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    # status: pending | achieved | approved | paid
    status: Mapped[str] = mapped_column(String(30), default="pending", nullable=False)
    approved_by_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    payment_profile: Mapped["TeacherPaymentProfile"] = relationship("TeacherPaymentProfile", back_populates="milestones")
    approved_by: Mapped[Optional["User"]] = relationship("User", foreign_keys=[approved_by_id])


class TeachingSession(Base):
    __tablename__ = "teaching_sessions"
    __table_args__ = (
        Index("ix_teaching_sessions_date_teacher", "session_date", "teacher_user_id"),
        Index("ix_teaching_sessions_division_date", "division_id", "session_date"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    session_code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    institution_id: Mapped[int] = mapped_column(
        ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, default=1
    )
    academic_year_id: Mapped[int] = mapped_column(
        ForeignKey("academic_years.id", ondelete="CASCADE"), nullable=False, default=1
    )
    teacher_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    substitute_teacher_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    subject_id: Mapped[int] = mapped_column(
        ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False
    )
    division_id: Mapped[int] = mapped_column(
        ForeignKey("divisions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    timetable_entry_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("timetable_entries.id", ondelete="SET NULL"), nullable=True
    )
    session_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    scheduled_start_time: Mapped[str] = mapped_column(String(15), nullable=False)
    scheduled_end_time: Mapped[str] = mapped_column(String(15), nullable=False)
    actual_start_time: Mapped[Optional[str]] = mapped_column(String(15), nullable=True)
    actual_end_time: Mapped[Optional[str]] = mapped_column(String(15), nullable=True)
    break_duration_minutes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    calculated_duration_hours: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    payment_method: Mapped[str] = mapped_column(String(30), default="hourly", nullable=False)
    applicable_rate: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    calculated_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)

    # Session Status: scheduled | completed | cancelled | rescheduled | absent | substitute_assigned
    session_status: Mapped[str] = mapped_column(String(30), default="completed", nullable=False, index=True)
    # Approval Status: draft | submitted | approved | rejected
    approval_status: Mapped[str] = mapped_column(String(30), default="submitted", nullable=False, index=True)
    approved_by_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    topic_taught: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    students_present_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    is_payable: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    # Locked when included into a payroll
    payroll_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("teacher_payrolls.id", ondelete="SET NULL"), nullable=True, index=True
    )
    remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_by_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    teacher: Mapped["User"] = relationship("User", foreign_keys=[teacher_user_id])
    substitute_teacher: Mapped[Optional["User"]] = relationship("User", foreign_keys=[substitute_teacher_id])
    subject: Mapped["Subject"] = relationship("Subject")
    division: Mapped["Division"] = relationship("Division")
    timetable_entry: Mapped[Optional["TimetableEntry"]] = relationship("TimetableEntry")
    approved_by: Mapped[Optional["User"]] = relationship("User", foreign_keys=[approved_by_id])
    created_by: Mapped[Optional["User"]] = relationship("User", foreign_keys=[created_by_id])
    payroll: Mapped[Optional["TeacherPayroll"]] = relationship("TeacherPayroll", back_populates="sessions")


class TeacherPayroll(Base):
    __tablename__ = "teacher_payrolls"
    __table_args__ = (
        Index("uq_teacher_payroll_period", "teacher_user_id", "month", "year", "institution_id", unique=True),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    payroll_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    institution_id: Mapped[int] = mapped_column(
        ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, default=1
    )
    academic_year_id: Mapped[int] = mapped_column(
        ForeignKey("academic_years.id", ondelete="CASCADE"), nullable=False, default=1
    )
    teacher_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    month: Mapped[int] = mapped_column(Integer, nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    payment_method: Mapped[str] = mapped_column(String(30), nullable=False)

    total_teaching_hours: Mapped[float] = mapped_column(Float, default=0.0)
    total_completed_lectures: Mapped[int] = mapped_column(Integer, default=0)
    base_earnings: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    approved_incentives: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    approved_additional_earnings: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    contractual_adjustments: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    gross_pay: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    total_deductions: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    withholdings: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    net_payable: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    paid_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    pending_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)

    calculation_breakdown_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # Status: calculated | submitted | approved | finalized | partially_paid | paid | adjusted
    status: Mapped[str] = mapped_column(String(30), default="calculated", nullable=False, index=True)

    calculated_by_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    approved_by_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    finalized_by_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    calculated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    finalized_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    teacher: Mapped["User"] = relationship("User", foreign_keys=[teacher_user_id])
    institution: Mapped["Institution"] = relationship("Institution")
    academic_year: Mapped["AcademicYear"] = relationship("AcademicYear")
    calculated_by: Mapped[Optional["User"]] = relationship("User", foreign_keys=[calculated_by_id])
    approved_by: Mapped[Optional["User"]] = relationship("User", foreign_keys=[approved_by_id])
    finalized_by: Mapped[Optional["User"]] = relationship("User", foreign_keys=[finalized_by_id])
    sessions: Mapped[List["TeachingSession"]] = relationship("TeachingSession", back_populates="payroll")
    vouchers: Mapped[List["TeacherPaymentVoucher"]] = relationship(
        "TeacherPaymentVoucher", back_populates="payroll", cascade="all, delete-orphan", order_by="desc(TeacherPaymentVoucher.payment_date)"
    )


class TeacherPaymentVoucher(Base):
    __tablename__ = "teacher_payment_vouchers"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    voucher_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    institution_id: Mapped[int] = mapped_column(
        ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, default=1
    )
    payroll_id: Mapped[int] = mapped_column(
        ForeignKey("teacher_payrolls.id", ondelete="CASCADE"), nullable=False, index=True
    )
    teacher_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    amount_paid: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    payment_date: Mapped[date] = mapped_column(Date, nullable=False, default=date.today)
    payment_method: Mapped[str] = mapped_column(String(30), default="bank_transfer", nullable=False)
    transaction_reference: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    bank_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    cheque_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    cheque_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    # Double-entry ledger classifications
    debit_account: Mapped[str] = mapped_column(
        String(100), default="Teacher Remuneration & Faculty Cost", nullable=False
    )
    credit_account: Mapped[str] = mapped_column(
        String(100), default="Main Operating Bank Account", nullable=False
    )
    recorded_by_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    approved_by_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    # Status: posted | cleared | reversed
    status: Mapped[str] = mapped_column(String(30), default="posted", nullable=False, index=True)
    reversal_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    receipt_statement_data: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    payroll: Mapped["TeacherPayroll"] = relationship("TeacherPayroll", back_populates="vouchers")
    teacher: Mapped["User"] = relationship("User", foreign_keys=[teacher_user_id])
    recorded_by: Mapped[Optional["User"]] = relationship("User", foreign_keys=[recorded_by_id])
    approved_by: Mapped[Optional["User"]] = relationship("User", foreign_keys=[approved_by_id])
