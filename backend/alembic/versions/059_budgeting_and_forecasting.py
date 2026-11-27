# /**
#  * @file        059_budgeting_and_forecasting.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      backend.alembic.versions
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
#  * @description Database migration creating budget_plans, budget_line_items, forecast_scenarios, and forecast_period_projections tables.
#  */

"""Create budgeting and forecasting tables

Revision ID: 059_budgeting_and_forecasting
Revises: 058_fee_matrix_composite_indexes
Create Date: 2026-11-27
"""

from alembic import op
import sqlalchemy as sa


revision = "059_budgeting_and_forecasting"
down_revision = "058_fee_matrix_composite_indexes"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())

    if "budget_plans" not in existing_tables:
        op.create_table(
            "budget_plans",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column(
                "institution_id",
                sa.Integer(),
                sa.ForeignKey("institutions.id", ondelete="CASCADE"),
                nullable=False,
                server_default="1",
            ),
            sa.Column("branch_id", sa.Integer(), nullable=True, server_default="1"),
            sa.Column(
                "academic_year_id",
                sa.Integer(),
                sa.ForeignKey("academic_years.id", ondelete="SET NULL"),
                nullable=True,
            ),
            sa.Column("fiscal_year_label", sa.String(40), nullable=False),
            sa.Column("name", sa.String(160), nullable=False),
            sa.Column("plan_type", sa.String(30), nullable=False, server_default="operating"),
            sa.Column("granularity", sa.String(20), nullable=False, server_default="monthly"),
            sa.Column("start_date", sa.Date(), nullable=False),
            sa.Column("end_date", sa.Date(), nullable=False),
            sa.Column("version_number", sa.Integer(), nullable=False, server_default="1"),
            sa.Column(
                "parent_plan_id",
                sa.Integer(),
                sa.ForeignKey("budget_plans.id", ondelete="SET NULL"),
                nullable=True,
            ),
            sa.Column("status", sa.String(30), nullable=False, server_default="draft"),
            sa.Column("enforcement_mode", sa.String(20), nullable=False, server_default="soft_warn"),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column("created_by_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
            sa.Column("approved_by_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
            sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("locked_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.CheckConstraint("version_number >= 1", name="ck_budget_plan_version_positive"),
        )
        op.create_index("ix_budget_plans_inst_status", "budget_plans", ["institution_id", "status"])
        op.create_index("ix_budget_plans_inst_fy", "budget_plans", ["institution_id", "fiscal_year_label"])
        op.create_index("ix_budget_plans_ay_id", "budget_plans", ["academic_year_id"])

    if "budget_line_items" not in existing_tables:
        op.create_table(
            "budget_line_items",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column(
                "budget_plan_id",
                sa.Integer(),
                sa.ForeignKey("budget_plans.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column(
                "financial_period_id",
                sa.Integer(),
                sa.ForeignKey("financial_periods.id", ondelete="SET NULL"),
                nullable=True,
            ),
            sa.Column("period_start", sa.Date(), nullable=False),
            sa.Column("period_end", sa.Date(), nullable=False),
            sa.Column("period_label", sa.String(40), nullable=False),
            sa.Column("line_direction", sa.String(20), nullable=False),
            sa.Column("source_domain", sa.String(30), nullable=False),
            sa.Column(
                "expense_category_id",
                sa.Integer(),
                sa.ForeignKey("expense_categories.id", ondelete="RESTRICT"),
                nullable=True,
            ),
            sa.Column(
                "fee_category_id",
                sa.Integer(),
                sa.ForeignKey("fee_categories.id", ondelete="RESTRICT"),
                nullable=True,
            ),
            sa.Column(
                "standard_id",
                sa.Integer(),
                sa.ForeignKey("standards.id", ondelete="SET NULL"),
                nullable=True,
            ),
            sa.Column(
                "division_id",
                sa.Integer(),
                sa.ForeignKey("divisions.id", ondelete="SET NULL"),
                nullable=True,
            ),
            sa.Column("line_label", sa.String(160), nullable=False),
            sa.Column("planned_amount", sa.Numeric(14, 2), nullable=False, server_default="0.00"),
            sa.Column("warning_threshold_pct", sa.Numeric(5, 2), nullable=False, server_default="85.00"),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.CheckConstraint("planned_amount >= 0", name="ck_budget_line_amount_nonnegative"),
        )
        op.create_index("ix_budget_lines_plan_period", "budget_line_items", ["budget_plan_id", "period_start"])
        op.create_index("ix_budget_lines_exp_cat", "budget_line_items", ["expense_category_id"])
        op.create_index("ix_budget_lines_source_domain", "budget_line_items", ["source_domain"])

    if "forecast_scenarios" not in existing_tables:
        op.create_table(
            "forecast_scenarios",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column(
                "institution_id",
                sa.Integer(),
                sa.ForeignKey("institutions.id", ondelete="CASCADE"),
                nullable=False,
                server_default="1",
            ),
            sa.Column(
                "academic_year_id",
                sa.Integer(),
                sa.ForeignKey("academic_years.id", ondelete="SET NULL"),
                nullable=True,
            ),
            sa.Column(
                "linked_budget_plan_id",
                sa.Integer(),
                sa.ForeignKey("budget_plans.id", ondelete="SET NULL"),
                nullable=True,
            ),
            sa.Column("name", sa.String(140), nullable=False),
            sa.Column("scenario_type", sa.String(30), nullable=False, server_default="baseline"),
            sa.Column("horizon_months", sa.Integer(), nullable=False, server_default="6"),
            sa.Column("opening_bank_balance", sa.Numeric(14, 2), nullable=False, server_default="0.00"),
            sa.Column("opening_cash_override", sa.Numeric(14, 2), nullable=True),
            sa.Column("assumptions_json", sa.Text(), nullable=False, server_default="{}"),
            sa.Column("is_default", sa.Boolean(), nullable=False, server_default="false"),
            sa.Column("created_by_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )
        op.create_index("ix_forecast_scenarios_inst_type", "forecast_scenarios", ["institution_id", "scenario_type"])

    if "forecast_period_projections" not in existing_tables:
        op.create_table(
            "forecast_period_projections",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column(
                "scenario_id",
                sa.Integer(),
                sa.ForeignKey("forecast_scenarios.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column("run_batch_id", sa.String(36), nullable=False),
            sa.Column("period_start", sa.Date(), nullable=False),
            sa.Column("period_end", sa.Date(), nullable=False),
            sa.Column("period_label", sa.String(40), nullable=False),
            sa.Column("projected_fee_collections", sa.Numeric(14, 2), nullable=False, server_default="0.00"),
            sa.Column("projected_pipeline_admissions", sa.Numeric(14, 2), nullable=False, server_default="0.00"),
            sa.Column("projected_concessions", sa.Numeric(14, 2), nullable=False, server_default="0.00"),
            sa.Column("projected_refunds", sa.Numeric(14, 2), nullable=False, server_default="0.00"),
            sa.Column("projected_faculty_payroll", sa.Numeric(14, 2), nullable=False, server_default="0.00"),
            sa.Column("projected_staff_payroll", sa.Numeric(14, 2), nullable=False, server_default="0.00"),
            sa.Column("projected_recurring_opex", sa.Numeric(14, 2), nullable=False, server_default="0.00"),
            sa.Column("projected_variable_opex", sa.Numeric(14, 2), nullable=False, server_default="0.00"),
            sa.Column("projected_net_cashflow", sa.Numeric(14, 2), nullable=False, server_default="0.00"),
            sa.Column("projected_ending_liquidity", sa.Numeric(14, 2), nullable=False, server_default="0.00"),
            sa.Column("confidence_low", sa.Numeric(14, 2), nullable=False, server_default="0.00"),
            sa.Column("confidence_high", sa.Numeric(14, 2), nullable=False, server_default="0.00"),
            sa.Column("provenance_summary_json", sa.Text(), nullable=True),
            sa.Column("computed_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )
        op.create_index("ix_forecast_proj_scen_start", "forecast_period_projections", ["scenario_id", "period_start"])
        op.create_index("ix_forecast_proj_batch", "forecast_period_projections", ["run_batch_id"])


def downgrade() -> None:
    op.drop_table("forecast_period_projections")
    op.drop_table("forecast_scenarios")
    op.drop_table("budget_line_items")
    op.drop_table("budget_plans")
