# /**
#  * @file        fee.py
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
#  * @updated     2026-11-10
#  *
#  * @description SQLAlchemy models defining fee structures, fee categories, invoices, installments, and fee concessions.
#  */

from typing import Optional
from sqlalchemy import (
    String,
    Boolean,
    DateTime,
    ForeignKey,
    func,
    Date,
    Numeric,
    Text,
    Integer,
    Index,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime, date
from decimal import Decimal
from app.core.database import Base


class FeeCategory(Base):
    __tablename__ = "fee_categories"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    institution_id: Mapped[int] = mapped_column(
        ForeignKey("institutions.id"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    fee_structures: Mapped[list["FeeStructure"]] = relationship(
        "FeeStructure", back_populates="category"
    )


class FeeStructure(Base):
    __tablename__ = "fee_structures"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    institution_id: Mapped[int] = mapped_column(
        ForeignKey("institutions.id"), nullable=False
    )
    academic_year_id: Mapped[int] = mapped_column(
        ForeignKey("academic_years.id"), nullable=False
    )
    standard_id: Mapped[int] = mapped_column(
        ForeignKey("standards.id"), nullable=True
    )
    category_id: Mapped[int] = mapped_column(
        ForeignKey("fee_categories.id"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    frequency: Mapped[str] = mapped_column(String(20), default="annual")
    installments_count: Mapped[int] = mapped_column(Integer, default=1)
    due_day: Mapped[int] = mapped_column(Integer, nullable=True)
    late_fee_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    late_fee_days: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    academic_year: Mapped["AcademicYear"] = relationship(
        "AcademicYear", back_populates="fee_structures"
    )
    category: Mapped["FeeCategory"] = relationship(
        "FeeCategory", back_populates="fee_structures"
    )
    assignments: Mapped[list["StudentFeeAssignment"]] = relationship(
        "StudentFeeAssignment", back_populates="fee_structure"
    )


# [DEPRECATED & RETIRED IN P1] Discount and Scholarship consolidated into StudentFeeAssignment

class StudentFeeAssignment(Base):
    __tablename__ = "student_fee_assignments"
    __table_args__ = (
        Index("uq_student_fee_assignment_ay", "student_id", "academic_year_id", unique=True),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    student_id: Mapped[int] = mapped_column(
        ForeignKey("students.id"), nullable=False
    )
    fee_structure_id: Mapped[int] = mapped_column(
        ForeignKey("fee_structures.id"), nullable=False
    )
    academic_year_id: Mapped[int] = mapped_column(
        ForeignKey("academic_years.id"), nullable=False
    )
# Consolidated in student_fee_assignments via concession_amount and scholarship_name
    custom_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=True)
    concession_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    remarks: Mapped[str] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    student: Mapped["Student"] = relationship(
        "Student", back_populates="fee_assignments"
    )
    fee_structure: Mapped["FeeStructure"] = relationship(
        "FeeStructure", back_populates="assignments"
    )
    invoices: Mapped[list["FeeInvoice"]] = relationship(
        "FeeInvoice", back_populates="assignment"
    )
    concession_applications: Mapped[list["StudentConcessionApplication"]] = relationship(
        "StudentConcessionApplication", back_populates="assignment"
    )


class FeeInvoice(Base):
    __tablename__ = "fee_invoices"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    invoice_number: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False, index=True
    )
    student_id: Mapped[int] = mapped_column(
        ForeignKey("students.id"), nullable=False
    )
    assignment_id: Mapped[int] = mapped_column(
        ForeignKey("student_fee_assignments.id"), nullable=False
    )
    academic_year_id: Mapped[int] = mapped_column(
        ForeignKey("academic_years.id"), nullable=False
    )
    total_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    discount_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    net_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    paid_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    outstanding_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False
    )
    status: Mapped[str] = mapped_column(String(20), default="unpaid")
    issue_date: Mapped[date] = mapped_column(Date, nullable=False)
    due_date: Mapped[date] = mapped_column(Date, nullable=True)
    notes: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    assignment: Mapped["StudentFeeAssignment"] = relationship(
        "StudentFeeAssignment", back_populates="invoices"
    )
    items: Mapped[list["FeeInvoiceItem"]] = relationship(
        "FeeInvoiceItem", back_populates="invoice"
    )
    allocations: Mapped[list["PaymentAllocation"]] = relationship(
        "PaymentAllocation", back_populates="invoice"
    )
    concession_allocations: Mapped[list["FeeConcessionAllocation"]] = relationship(
        "FeeConcessionAllocation", back_populates="invoice"
    )
    concession_applications: Mapped[list["StudentConcessionApplication"]] = relationship(
        "StudentConcessionApplication", back_populates="invoice"
    )

    @property
    def installments(self) -> list["FeeInvoiceItem"]:
        """Backward compatibility property mapping legacy installments to invoice items."""
        return self.items


class FeeInvoiceItem(Base):
    __tablename__ = "fee_invoice_items"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    invoice_id: Mapped[int] = mapped_column(
        ForeignKey("fee_invoices.id"), nullable=False
    )
    fee_structure_id: Mapped[int] = mapped_column(
        ForeignKey("fee_structures.id"), nullable=False
    )
    description: Mapped[str] = mapped_column(String(200), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    discount_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    net_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    invoice: Mapped["FeeInvoice"] = relationship(
        "FeeInvoice", back_populates="items"
    )

    @property
    def installment_number(self) -> int:
        return 1

    @property
    def paid_amount(self) -> Decimal:
        return Decimal("0")

    @property
    def due_date(self) -> date | None:
        return None

    @property
    def status(self) -> str:
        return "unpaid"


# ─── FEE CONCESSION & SCHOLARSHIP MANAGEMENT MODELS ─────────────────────────────

class FeeConcessionType(Base):
    __tablename__ = "fee_concession_types"
    __table_args__ = (
        UniqueConstraint("institution_id", "code", name="uq_concession_type_inst_code"),
        Index("ix_fee_concession_types_category", "category"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    institution_id: Mapped[int] = mapped_column(
        ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    code: Mapped[str] = mapped_column(String(50), nullable=False)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    funding_source: Mapped[str] = mapped_column(String(30), default="institute")
    calculation_type: Mapped[str] = mapped_column(String(30), default="percentage")
    default_value: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"))
    max_discount_amount: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2), nullable=True)
    is_stackable: Mapped[bool] = mapped_column(Boolean, default=True)
    requires_documents: Mapped[bool] = mapped_column(Boolean, default=False)
    eligibility_rules: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    applications: Mapped[list["StudentConcessionApplication"]] = relationship(
        "StudentConcessionApplication", back_populates="concession_type"
    )


class StudentConcessionApplication(Base):
    __tablename__ = "fee_concession_applications"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    institution_id: Mapped[int] = mapped_column(
        ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    application_number: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False, index=True
    )
    student_id: Mapped[int] = mapped_column(
        ForeignKey("students.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    academic_year_id: Mapped[int] = mapped_column(
        ForeignKey("academic_years.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    concession_type_id: Mapped[int] = mapped_column(
        ForeignKey("fee_concession_types.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    invoice_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("fee_invoices.id", ondelete="SET NULL"), nullable=True, index=True
    )
    assignment_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("student_fee_assignments.id", ondelete="SET NULL"), nullable=True
    )
    requested_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"))
    requested_percentage: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2), nullable=True)
    approved_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"))
    applied_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"))
    funding_source: Mapped[str] = mapped_column(String(30), default="institute")
    sponsor_name: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    sponsor_reference: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    sponsor_sanctioned_amount: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2), nullable=True)
    sponsor_received_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"))
    status: Mapped[str] = mapped_column(String(30), default="draft", index=True)
    applicant_type: Mapped[str] = mapped_column(String(30), default="staff_nomination")
    nominator_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    verifier_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    verification_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    approver_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    approval_remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    withdrawal_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    valid_until: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    supporting_document_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    eligibility_snapshot: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    concession_type: Mapped["FeeConcessionType"] = relationship(
        "FeeConcessionType", back_populates="applications"
    )
    student: Mapped["Student"] = relationship(
        "Student", back_populates="concession_applications"
    )
    invoice: Mapped[Optional["FeeInvoice"]] = relationship(
        "FeeInvoice", back_populates="concession_applications"
    )
    assignment: Mapped[Optional["StudentFeeAssignment"]] = relationship(
        "StudentFeeAssignment", back_populates="concession_applications"
    )
    allocations: Mapped[list["FeeConcessionAllocation"]] = relationship(
        "FeeConcessionAllocation", back_populates="application"
    )


class FeeConcessionAllocation(Base):
    __tablename__ = "fee_concession_allocations"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    application_id: Mapped[int] = mapped_column(
        ForeignKey("fee_concession_applications.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    invoice_id: Mapped[int] = mapped_column(
        ForeignKey("fee_invoices.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    allocated_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    allocated_by_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    allocated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    credit_adjustment_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), default=Decimal("0.00")
    )
    refund_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("refunds.id", ondelete="SET NULL"), nullable=True
    )

    application: Mapped["StudentConcessionApplication"] = relationship(
        "StudentConcessionApplication", back_populates="allocations"
    )
    invoice: Mapped["FeeInvoice"] = relationship(
        "FeeInvoice", back_populates="concession_allocations"
    )


# [DEPRECATED & RETIRED IN P1] FeeInstallment alias for backward compatibility
FeeInstallment = FeeInvoiceItem


# [DEPRECATED & RETIRED IN P1] Backward compatibility stubs
Discount = None
Scholarship = None
