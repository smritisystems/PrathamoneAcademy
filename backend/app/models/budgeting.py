# /**
#  * @file        budgeting.py
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
#  * @created     2026-11-27
#  * @updated     2026-11-27
#  *
#  * @description SQLAlchemy models for Institutional Budgeting, Budget Line Allocations, Cashflow Forecast Scenarios, and Projection Snapshots (Rule 004).
#  */

from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List

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
    CheckConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class BudgetPlan(Base):
    """Master entity (Rule 004) representing a versioned institutional budget plan (BE / RE)."""

    __tablename__ = "budget_plans"
    __table_args__ = (
        Index("ix_budget_plans_inst_status", "institution_id", "status"),
        Index("ix_budget_plans_inst_fy", "institution_id", "fiscal_year_label"),
        CheckConstraint("version_number >= 1", name="ck_budget_plan_version_positive"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    institution_id: Mapped[int] = mapped_column(
        ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, default=1, index=True
    )
    branch_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, default=1)
    academic_year_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("academic_years.id", ondelete="SET NULL"), nullable=True, index=True
    )
    fiscal_year_label: Mapped[str] = mapped_column(String(40), nullable=False)
    name: Mapped[str] = mapped_column(String(160), nullable=False)

    # Plan type: operating | cashflow | capex
    plan_type: Mapped[str] = mapped_column(String(30), default="operating", nullable=False)
    # Granularity: monthly | quarterly | annual
    granularity: Mapped[str] = mapped_column(String(20), default="monthly", nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)

    version_number: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    parent_plan_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("budget_plans.id", ondelete="SET NULL"), nullable=True, index=True
    )
    # Lifecycle status: draft | submitted | approved | locked | superseded
    status: Mapped[str] = mapped_column(String(30), default="draft", nullable=False, index=True)
    # Guardrail mode: advisory | soft_warn | hard_limit
    enforcement_mode: Mapped[str] = mapped_column(String(20), default="soft_warn", nullable=False)

    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_by_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    approved_by_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    locked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    lines: Mapped[List["BudgetLineItem"]] = relationship(
        "BudgetLineItem", back_populates="budget_plan", cascade="all, delete-orphan"
    )
    parent_plan: Mapped[Optional["BudgetPlan"]] = relationship("BudgetPlan", remote_side=[id])
    academic_year: Mapped[Optional["AcademicYear"]] = relationship("AcademicYear")
    created_by: Mapped[Optional["User"]] = relationship("User", foreign_keys=[created_by_id])
    approved_by: Mapped[Optional["User"]] = relationship("User", foreign_keys=[approved_by_id])


class BudgetLineItem(Base):
    """Configuration/Relationship entity (Rule 004) mapping planned amounts directly to canonical masters."""

    __tablename__ = "budget_line_items"
    __table_args__ = (
        Index("ix_budget_lines_plan_period", "budget_plan_id", "period_start"),
        Index("ix_budget_lines_exp_cat", "expense_category_id"),
        CheckConstraint("planned_amount >= 0", name="ck_budget_line_amount_nonnegative"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    budget_plan_id: Mapped[int] = mapped_column(
        ForeignKey("budget_plans.id", ondelete="CASCADE"), nullable=False, index=True
    )
    financial_period_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("financial_periods.id", ondelete="SET NULL"), nullable=True
    )
    period_start: Mapped[date] = mapped_column(Date, nullable=False)
    period_end: Mapped[date] = mapped_column(Date, nullable=False)
    period_label: Mapped[str] = mapped_column(String(40), nullable=False)

    # Direction: inflow_target | outflow_cap
    line_direction: Mapped[str] = mapped_column(String(20), nullable=False)
    # Canonical SSOT domain: fee_category | expense_category | faculty_payroll | staff_payroll | concession | custom
    source_domain: Mapped[str] = mapped_column(String(30), nullable=False, index=True)

    expense_category_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("expense_categories.id", ondelete="RESTRICT"), nullable=True
    )
    fee_category_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("fee_categories.id", ondelete="RESTRICT"), nullable=True
    )
    standard_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("standards.id", ondelete="SET NULL"), nullable=True
    )
    division_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("divisions.id", ondelete="SET NULL"), nullable=True
    )

    line_label: Mapped[str] = mapped_column(String(160), nullable=False)
    planned_amount: Mapped[Decimal] = mapped_column(
        Numeric(14, 2), default=Decimal("0.00"), nullable=False
    )
    warning_threshold_pct: Mapped[Decimal] = mapped_column(
        Numeric(5, 2), default=Decimal("85.00"), nullable=False
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    budget_plan: Mapped["BudgetPlan"] = relationship("BudgetPlan", back_populates="lines")
    expense_category: Mapped[Optional["ExpenseCategory"]] = relationship("ExpenseCategory")
    fee_category: Mapped[Optional["FeeCategory"]] = relationship("FeeCategory")


class ForecastScenario(Base):
    """Configuration entity (Rule 004) storing cashflow and margin modeling assumptions."""

    __tablename__ = "forecast_scenarios"
    __table_args__ = (
        Index("ix_forecast_scenarios_inst_type", "institution_id", "scenario_type"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    institution_id: Mapped[int] = mapped_column(
        ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, default=1, index=True
    )
    academic_year_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("academic_years.id", ondelete="SET NULL"), nullable=True, index=True
    )
    linked_budget_plan_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("budget_plans.id", ondelete="SET NULL"), nullable=True
    )
    name: Mapped[str] = mapped_column(String(140), nullable=False)
    # baseline | conservative | optimistic | what_if
    scenario_type: Mapped[str] = mapped_column(String(30), default="baseline", nullable=False)
    horizon_months: Mapped[int] = mapped_column(Integer, default=6, nullable=False)
    opening_bank_balance: Mapped[Decimal] = mapped_column(
        Numeric(14, 2), default=Decimal("0.00"), nullable=False
    )
    opening_cash_override: Mapped[Optional[Decimal]] = mapped_column(Numeric(14, 2), nullable=True)
    assumptions_json: Mapped[str] = mapped_column(Text, default="{}", nullable=False)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    created_by_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    projections: Mapped[List["ForecastPeriodProjection"]] = relationship(
        "ForecastPeriodProjection",
        back_populates="scenario",
        cascade="all, delete-orphan",
        order_by="ForecastPeriodProjection.period_start",
    )


class ForecastPeriodProjection(Base):
    """Snapshot entity (Rule 004) persisting generated multi-month cashflow and liquidity projections."""

    __tablename__ = "forecast_period_projections"
    __table_args__ = (
        Index("ix_forecast_proj_scen_start", "scenario_id", "period_start"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    scenario_id: Mapped[int] = mapped_column(
        ForeignKey("forecast_scenarios.id", ondelete="CASCADE"), nullable=False, index=True
    )
    run_batch_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    period_start: Mapped[date] = mapped_column(Date, nullable=False)
    period_end: Mapped[date] = mapped_column(Date, nullable=False)
    period_label: Mapped[str] = mapped_column(String(40), nullable=False)

    projected_fee_collections: Mapped[Decimal] = mapped_column(
        Numeric(14, 2), default=Decimal("0.00"), nullable=False
    )
    projected_pipeline_admissions: Mapped[Decimal] = mapped_column(
        Numeric(14, 2), default=Decimal("0.00"), nullable=False
    )
    projected_concessions: Mapped[Decimal] = mapped_column(
        Numeric(14, 2), default=Decimal("0.00"), nullable=False
    )
    projected_refunds: Mapped[Decimal] = mapped_column(
        Numeric(14, 2), default=Decimal("0.00"), nullable=False
    )
    projected_faculty_payroll: Mapped[Decimal] = mapped_column(
        Numeric(14, 2), default=Decimal("0.00"), nullable=False
    )
    projected_staff_payroll: Mapped[Decimal] = mapped_column(
        Numeric(14, 2), default=Decimal("0.00"), nullable=False
    )
    projected_recurring_opex: Mapped[Decimal] = mapped_column(
        Numeric(14, 2), default=Decimal("0.00"), nullable=False
    )
    projected_variable_opex: Mapped[Decimal] = mapped_column(
        Numeric(14, 2), default=Decimal("0.00"), nullable=False
    )
    projected_net_cashflow: Mapped[Decimal] = mapped_column(
        Numeric(14, 2), default=Decimal("0.00"), nullable=False
    )
    projected_ending_liquidity: Mapped[Decimal] = mapped_column(
        Numeric(14, 2), default=Decimal("0.00"), nullable=False
    )
    confidence_low: Mapped[Decimal] = mapped_column(
        Numeric(14, 2), default=Decimal("0.00"), nullable=False
    )
    confidence_high: Mapped[Decimal] = mapped_column(
        Numeric(14, 2), default=Decimal("0.00"), nullable=False
    )
    provenance_summary_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    computed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    scenario: Mapped["ForecastScenario"] = relationship("ForecastScenario", back_populates="projections")
