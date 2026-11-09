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
#  * @updated     2026-11-09
#  *
#  * @description SQLAlchemy models defining fee structures, fee categories, invoices, and installments.
#  */

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


# [DEPRECATED & RETIRED IN P1] FeeInstallment alias for backward compatibility
FeeInstallment = FeeInvoiceItem

