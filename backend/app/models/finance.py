# /**
#  * @file        finance.py
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
#  * @created     2026-11-24
#  * @updated     2026-11-24
#  *
#  * @description SQLAlchemy models for Institute Daily Expense Management, Cash Registers, Live Cash Movements, and Daily Automated Cash Opening and Closing.
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
    UniqueConstraint,
    Index,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List
from app.core.database import Base


class ExpenseCategory(Base):
    __tablename__ = "expense_categories"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    institution_id: Mapped[int] = mapped_column(
        ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, default=1, index=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    code: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    expenses: Mapped[List["Expense"]] = relationship("Expense", back_populates="category")


class Expense(Base):
    __tablename__ = "expenses"
    __table_args__ = (
        UniqueConstraint("expense_number", name="uq_expense_number"),
        Index("ix_expenses_inst_date", "institution_id", "expense_date"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    institution_id: Mapped[int] = mapped_column(
        ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, default=1, index=True
    )
    branch_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, default=1)
    category_id: Mapped[int] = mapped_column(
        ForeignKey("expense_categories.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    expense_number: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    expense_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)

    # Payment Mode: CASH | UPI | BANK_TRANSFER | CARD | CHEQUE
    payment_mode: Mapped[str] = mapped_column(String(30), default="CASH", nullable=False, index=True)
    paid_to_vendor: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    vendor_contact: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    invoice_reference: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    attachment_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    attachment_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Workflow status: draft | submitted | approved | paid | rejected | cancelled
    status: Mapped[str] = mapped_column(String(30), default="submitted", nullable=False, index=True)

    is_recurring: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    recurring_frequency: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)  # monthly, quarterly, yearly

    recorded_by_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    approved_by_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    paid_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    category: Mapped["ExpenseCategory"] = relationship("ExpenseCategory", back_populates="expenses")
    recorded_by: Mapped[Optional["User"]] = relationship("User", foreign_keys=[recorded_by_id])
    approved_by: Mapped[Optional["User"]] = relationship("User", foreign_keys=[approved_by_id])


class CashRegister(Base):
    __tablename__ = "cash_registers"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    institution_id: Mapped[int] = mapped_column(
        ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, default=1, index=True
    )
    branch_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, default=1)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    code: Mapped[str] = mapped_column(String(50), nullable=False, unique=True, index=True)
    description: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_default: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    managed_by_user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    managed_by: Mapped[Optional["User"]] = relationship("User", foreign_keys=[managed_by_user_id])
    daily_registers: Mapped[List["DailyCashRegister"]] = relationship(
        "DailyCashRegister", back_populates="cash_register", cascade="all, delete-orphan"
    )


class DailyCashRegister(Base):
    __tablename__ = "daily_cash_registers"
    __table_args__ = (
        UniqueConstraint("cash_register_id", "register_date", name="uq_cash_register_daily"),
        Index("ix_daily_cash_reg_inst_date", "institution_id", "register_date"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    institution_id: Mapped[int] = mapped_column(
        ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, default=1, index=True
    )
    cash_register_id: Mapped[int] = mapped_column(
        ForeignKey("cash_registers.id", ondelete="CASCADE"), nullable=False, index=True
    )
    register_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)

    # Status: not_opened | open | pending_reconciliation | pending_approval | closed | reopened
    status: Mapped[str] = mapped_column(String(30), default="open", nullable=False, index=True)
    business_day_start_time: Mapped[Optional[str]] = mapped_column(String(10), default="08:00")

    # Opening balance
    opening_balance: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    opening_source_closing_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("daily_cash_registers.id", ondelete="SET NULL"), nullable=True
    )
    opened_by_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    opened_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    opening_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    opening_adjusted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    opening_adjustment_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Inflows breakdown
    cash_inflows_fees: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    cash_inflows_other: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    cash_inflows_bank_withdrawal: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    cash_inflows_transfers: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    total_cash_inflows: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)

    # Outflows breakdown
    cash_outflows_expenses: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    cash_outflows_refunds: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    cash_outflows_bank_deposit: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    cash_outflows_transfers: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    total_cash_outflows: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)

    # Balances & Reconciliation
    expected_closing_balance: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    physical_closing_balance: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    difference_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    # Difference type: none | shortage | excess
    difference_type: Mapped[str] = mapped_column(String(20), default="none", nullable=False)
    difference_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Denomination JSON storage: e.g. {"500": 10, "200": 5, "100": 20, ...}
    denominations: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Closing workflow
    closed_by_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    closed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    verified_by_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    is_locked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Reopening audit trail
    reopened_by_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    reopened_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    reopening_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    cash_register: Mapped["CashRegister"] = relationship("CashRegister", back_populates="daily_registers")
    opened_by: Mapped[Optional["User"]] = relationship("User", foreign_keys=[opened_by_id])
    closed_by: Mapped[Optional["User"]] = relationship("User", foreign_keys=[closed_by_id])
    verified_by: Mapped[Optional["User"]] = relationship("User", foreign_keys=[verified_by_id])
    reopened_by: Mapped[Optional["User"]] = relationship("User", foreign_keys=[reopened_by_id])


class CashTransaction(Base):
    __tablename__ = "cash_transactions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    institution_id: Mapped[int] = mapped_column(
        ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, default=1, index=True
    )
    cash_register_id: Mapped[int] = mapped_column(
        ForeignKey("cash_registers.id", ondelete="CASCADE"), nullable=False, index=True
    )
    transaction_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    # Type: bank_deposit | bank_withdrawal | transfer_in | transfer_out | other_receipt | other_payment
    transaction_type: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    reference_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    destination_or_source: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    performed_by_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    performed_by: Mapped[Optional["User"]] = relationship("User", foreign_keys=[performed_by_id])
    cash_register: Mapped["CashRegister"] = relationship("CashRegister")
