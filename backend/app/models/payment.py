# /**
#  * @file        payment.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      backend.app.models
#  *
#  * @author      Jawahar R. Mallah
#  * @organization AITDL (AI Technology & Development Lab)
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 AITDL
#  * @license     Proprietary
#  *
#  * @version     2.0.0
#  * @created     2026-11-03
#  * @updated     2026-11-07
#  *
#  * @description SQLAlchemy models defining financial transactions, ERP payment workflow lifecycle, receipt versioning, and refunds.
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
    and_,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship, foreign
from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List
from app.core.database import Base


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    student_id: Mapped[int] = mapped_column(
        ForeignKey("students.id"), nullable=False, index=True
    )
    academic_year_id: Mapped[int] = mapped_column(
        ForeignKey("academic_years.id"), nullable=False, index=True
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    payment_date: Mapped[date] = mapped_column(Date, nullable=False)
    payment_method: Mapped[str] = mapped_column(String(30), nullable=False)
    transaction_reference: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    bank_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    cheque_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    cheque_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Workflow status: draft | submitted | approved | posted | completed | reversed
    status: Mapped[str] = mapped_column(String(20), default="posted", index=True)
    
    # Workflow timestamps & actors
    submitted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    submitted_by_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    approved_by_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    posted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    posted_by_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    last_edited_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    last_edited_by_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    edit_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")

    reversed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    reversal_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    reversed_by_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )
    collected_by_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    data_environment: Mapped[str] = mapped_column(String(20), default="PRODUCTION", nullable=False, index=True)
    demo_dataset_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    student: Mapped["Student"] = relationship(
        "Student", back_populates="payments"
    )
    allocations: Mapped[list["PaymentAllocation"]] = relationship(
        "PaymentAllocation",
        back_populates="payment",
        cascade="all, delete-orphan",
    )
    receipts: Mapped[list["PaymentReceipt"]] = relationship(
        "PaymentReceipt",
        back_populates="payment",
        cascade="all, delete-orphan",
        order_by="desc(PaymentReceipt.version)",
    )
    refunds: Mapped[list["Refund"]] = relationship(
        "Refund", back_populates="payment"
    )

    receipt: Mapped[Optional["PaymentReceipt"]] = relationship(
        "PaymentReceipt",
        primaryjoin="and_(Payment.id == foreign(PaymentReceipt.payment_id), PaymentReceipt.status == 'valid')",
        uselist=False,
        viewonly=True,
        lazy="selectin",
    )


class PaymentAllocation(Base):
    __tablename__ = "payment_allocations"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    payment_id: Mapped[int] = mapped_column(
        ForeignKey("payments.id"), nullable=False, index=True
    )
    invoice_id: Mapped[int] = mapped_column(
        ForeignKey("fee_invoices.id"), nullable=False, index=True
    )
    installment_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("fee_installments.id"), nullable=True
    )
    allocated_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    payment: Mapped["Payment"] = relationship(
        "Payment", back_populates="allocations"
    )
    invoice: Mapped["FeeInvoice"] = relationship(
        "FeeInvoice", back_populates="allocations"
    )
    installment: Mapped[Optional["FeeInstallment"]] = relationship(
        "FeeInstallment", back_populates="allocations"
    )


class PaymentReceipt(Base):
    __tablename__ = "payment_receipts"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    receipt_number: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False, index=True
    )
    payment_id: Mapped[int] = mapped_column(
        ForeignKey("payments.id"), nullable=False, index=True
    )
    student_id: Mapped[int] = mapped_column(
        ForeignKey("students.id"), nullable=False, index=True
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    payment_date: Mapped[date] = mapped_column(Date, nullable=False)
    payment_method: Mapped[str] = mapped_column(String(30), nullable=False)
    receipt_data: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    version: Mapped[int] = mapped_column(Integer, default=1, server_default="1")
    status: Mapped[str] = mapped_column(String(20), default="valid", server_default="valid", index=True)
    superseded_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    superseded_by_receipt_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    reprint_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    data_environment: Mapped[str] = mapped_column(String(20), default="PRODUCTION", nullable=False, index=True)
    demo_dataset_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    generated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    payment: Mapped["Payment"] = relationship(
        "Payment", back_populates="receipts"
    )


class Refund(Base):
    __tablename__ = "refunds"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    institution_id: Mapped[int] = mapped_column(
        ForeignKey("institutions.id"), nullable=False, index=True
    )
    student_id: Mapped[int] = mapped_column(
        ForeignKey("students.id"), nullable=False, index=True
    )
    enrollment_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("student_enrollments.id"), nullable=True
    )
    payment_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("payments.id"), nullable=True, index=True
    )
    invoice_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("fee_invoices.id"), nullable=True
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    refund_date: Mapped[date] = mapped_column(Date, nullable=False)
    refund_method: Mapped[str] = mapped_column(String(30), nullable=False)
    reference_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    reason: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="completed", index=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    requested_by_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    approved_by_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    processed_by_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    student: Mapped["Student"] = relationship("Student", back_populates="refunds")
    payment: Mapped[Optional["Payment"]] = relationship("Payment", back_populates="refunds")
    invoice: Mapped[Optional["FeeInvoice"]] = relationship("FeeInvoice")
    enrollment: Mapped[Optional["StudentEnrollment"]] = relationship("StudentEnrollment")
    processed_by: Mapped[Optional["User"]] = relationship("User", foreign_keys=[processed_by_id])
    requested_by: Mapped[Optional["User"]] = relationship("User", foreign_keys=[requested_by_id])
    approved_by: Mapped[Optional["User"]] = relationship("User", foreign_keys=[approved_by_id])
