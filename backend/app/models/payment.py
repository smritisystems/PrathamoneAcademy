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
#  * @version     1.0.0
#  * @created     2026-11-03
#  * @updated     2026-11-05
#  *
#  * @description SQLAlchemy model defining financial transactions, payment modes, and receipt numbering.
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
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime, date
from decimal import Decimal
from app.core.database import Base


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    student_id: Mapped[int] = mapped_column(
        ForeignKey("students.id"), nullable=False
    )
    academic_year_id: Mapped[int] = mapped_column(
        ForeignKey("academic_years.id"), nullable=False
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    payment_date: Mapped[date] = mapped_column(Date, nullable=False)
    payment_method: Mapped[str] = mapped_column(String(30), nullable=False)
    transaction_reference: Mapped[str] = mapped_column(String(200), nullable=True)
    bank_name: Mapped[str] = mapped_column(String(100), nullable=True)
    cheque_number: Mapped[str] = mapped_column(String(50), nullable=True)
    cheque_date: Mapped[date] = mapped_column(Date, nullable=True)
    notes: Mapped[str] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="completed")
    reversed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    reversal_reason: Mapped[str] = mapped_column(Text, nullable=True)
    reversed_by_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )
    collected_by_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )
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
    receipt: Mapped["PaymentReceipt"] = relationship(
        "PaymentReceipt", back_populates="payment", uselist=False
    )


class PaymentAllocation(Base):
    __tablename__ = "payment_allocations"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    payment_id: Mapped[int] = mapped_column(
        ForeignKey("payments.id"), nullable=False
    )
    invoice_id: Mapped[int] = mapped_column(
        ForeignKey("fee_invoices.id"), nullable=False
    )
    installment_id: Mapped[int] = mapped_column(
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
    installment: Mapped["FeeInstallment"] = relationship(
        "FeeInstallment", back_populates="allocations"
    )


class PaymentReceipt(Base):
    __tablename__ = "payment_receipts"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    receipt_number: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False, index=True
    )
    payment_id: Mapped[int] = mapped_column(
        ForeignKey("payments.id"), nullable=False, unique=True
    )
    student_id: Mapped[int] = mapped_column(
        ForeignKey("students.id"), nullable=False
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    payment_date: Mapped[date] = mapped_column(Date, nullable=False)
    payment_method: Mapped[str] = mapped_column(String(30), nullable=False)
    receipt_data: Mapped[str] = mapped_column(Text, nullable=True)
    generated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    payment: Mapped["Payment"] = relationship(
        "Payment", back_populates="receipt"
    )


class Refund(Base):
    __tablename__ = "refunds"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    institution_id: Mapped[int] = mapped_column(
        ForeignKey("institutions.id"), nullable=False
    )
    student_id: Mapped[int] = mapped_column(
        ForeignKey("students.id"), nullable=False
    )
    enrollment_id: Mapped[int] = mapped_column(
        ForeignKey("student_enrollments.id"), nullable=True
    )
    payment_id: Mapped[int] = mapped_column(
        ForeignKey("payments.id"), nullable=True
    )
    invoice_id: Mapped[int] = mapped_column(
        ForeignKey("fee_invoices.id"), nullable=True
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    refund_date: Mapped[date] = mapped_column(Date, nullable=False)
    refund_method: Mapped[str] = mapped_column(String(30), nullable=False)
    reference_number: Mapped[str] = mapped_column(String(100), nullable=True)
    reason: Mapped[str] = mapped_column(String(200), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="completed")
    notes: Mapped[str] = mapped_column(Text, nullable=True)
    processed_by_id: Mapped[int] = mapped_column(
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
    payment: Mapped["Payment"] = relationship("Payment")
    invoice: Mapped["FeeInvoice"] = relationship("FeeInvoice")
    enrollment: Mapped["StudentEnrollment"] = relationship("StudentEnrollment")
    processed_by: Mapped["User"] = relationship("User")


