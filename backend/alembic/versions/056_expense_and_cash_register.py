# /**
#  * @file        056_expense_and_cash_register.py
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
#  * @created     2026-11-24
#  * @updated     2026-11-24
#  *
#  * @description Database migration creating expense_categories, expenses, cash_registers, daily_cash_registers, and cash_transactions tables.
#  */

"""Create expense and cash register tables for daily expense and cash management.

Revision ID: 056_expense_and_cash_register
Revises: 055_device_binding
Create Date: 2026-11-24
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "056_expense_and_cash_register"
down_revision = "055_device_binding"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()

    # 1. Expense Categories Table
    if "expense_categories" not in tables:
        op.create_table(
            "expense_categories",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("institution_id", sa.Integer(), sa.ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, server_default="1"),
            sa.Column("name", sa.String(100), nullable=False),
            sa.Column("code", sa.String(50), nullable=False),
            sa.Column("description", sa.String(255), nullable=True),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )
        op.create_index("ix_expense_categories_inst_id", "expense_categories", ["institution_id"])
        op.create_index("ix_expense_categories_code", "expense_categories", ["code"])

    # 2. Expenses Table
    if "expenses" not in tables:
        op.create_table(
            "expenses",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("institution_id", sa.Integer(), sa.ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, server_default="1"),
            sa.Column("branch_id", sa.Integer(), nullable=True, server_default="1"),
            sa.Column("category_id", sa.Integer(), sa.ForeignKey("expense_categories.id", ondelete="RESTRICT"), nullable=False),
            sa.Column("expense_number", sa.String(50), nullable=False),
            sa.Column("expense_date", sa.Date(), nullable=False),
            sa.Column("title", sa.String(200), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("amount", sa.Numeric(12, 2), nullable=False),
            sa.Column("payment_mode", sa.String(30), nullable=False, server_default="CASH"),
            sa.Column("paid_to_vendor", sa.String(150), nullable=False),
            sa.Column("vendor_contact", sa.String(50), nullable=True),
            sa.Column("invoice_reference", sa.String(100), nullable=True),
            sa.Column("attachment_url", sa.String(500), nullable=True),
            sa.Column("attachment_name", sa.String(255), nullable=True),
            sa.Column("status", sa.String(30), nullable=False, server_default="submitted"),
            sa.Column("is_recurring", sa.Boolean(), nullable=False, server_default="false"),
            sa.Column("recurring_frequency", sa.String(30), nullable=True),
            sa.Column("recorded_by_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
            sa.Column("approved_by_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
            sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("rejection_reason", sa.Text(), nullable=True),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.UniqueConstraint("expense_number", name="uq_expense_number"),
        )
        op.create_index("ix_expenses_inst_date", "expenses", ["institution_id", "expense_date"])
        op.create_index("ix_expenses_category_id", "expenses", ["category_id"])
        op.create_index("ix_expenses_payment_mode", "expenses", ["payment_mode"])
        op.create_index("ix_expenses_status", "expenses", ["status"])

    # 3. Cash Registers Master Table
    if "cash_registers" not in tables:
        op.create_table(
            "cash_registers",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("institution_id", sa.Integer(), sa.ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, server_default="1"),
            sa.Column("branch_id", sa.Integer(), nullable=True, server_default="1"),
            sa.Column("name", sa.String(100), nullable=False),
            sa.Column("code", sa.String(50), nullable=False),
            sa.Column("description", sa.String(255), nullable=True),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
            sa.Column("is_default", sa.Boolean(), nullable=False, server_default="true"),
            sa.Column("managed_by_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.UniqueConstraint("code", name="uq_cash_register_code"),
        )
        op.create_index("ix_cash_registers_inst_id", "cash_registers", ["institution_id"])

    # 4. Daily Cash Registers Table
    if "daily_cash_registers" not in tables:
        op.create_table(
            "daily_cash_registers",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("institution_id", sa.Integer(), sa.ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, server_default="1"),
            sa.Column("cash_register_id", sa.Integer(), sa.ForeignKey("cash_registers.id", ondelete="CASCADE"), nullable=False),
            sa.Column("register_date", sa.Date(), nullable=False),
            sa.Column("status", sa.String(30), nullable=False, server_default="open"),
            sa.Column("business_day_start_time", sa.String(10), nullable=True, server_default="08:00"),
            sa.Column("opening_balance", sa.Numeric(12, 2), nullable=False, server_default="0.00"),
            sa.Column("opening_source_closing_id", sa.Integer(), sa.ForeignKey("daily_cash_registers.id", ondelete="SET NULL"), nullable=True),
            sa.Column("opened_by_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
            sa.Column("opened_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("opening_notes", sa.Text(), nullable=True),
            sa.Column("opening_adjusted", sa.Boolean(), nullable=False, server_default="false"),
            sa.Column("opening_adjustment_reason", sa.Text(), nullable=True),
            sa.Column("cash_inflows_fees", sa.Numeric(12, 2), nullable=False, server_default="0.00"),
            sa.Column("cash_inflows_other", sa.Numeric(12, 2), nullable=False, server_default="0.00"),
            sa.Column("cash_inflows_bank_withdrawal", sa.Numeric(12, 2), nullable=False, server_default="0.00"),
            sa.Column("cash_inflows_transfers", sa.Numeric(12, 2), nullable=False, server_default="0.00"),
            sa.Column("total_cash_inflows", sa.Numeric(12, 2), nullable=False, server_default="0.00"),
            sa.Column("cash_outflows_expenses", sa.Numeric(12, 2), nullable=False, server_default="0.00"),
            sa.Column("cash_outflows_refunds", sa.Numeric(12, 2), nullable=False, server_default="0.00"),
            sa.Column("cash_outflows_bank_deposit", sa.Numeric(12, 2), nullable=False, server_default="0.00"),
            sa.Column("cash_outflows_transfers", sa.Numeric(12, 2), nullable=False, server_default="0.00"),
            sa.Column("total_cash_outflows", sa.Numeric(12, 2), nullable=False, server_default="0.00"),
            sa.Column("expected_closing_balance", sa.Numeric(12, 2), nullable=False, server_default="0.00"),
            sa.Column("physical_closing_balance", sa.Numeric(12, 2), nullable=False, server_default="0.00"),
            sa.Column("difference_amount", sa.Numeric(12, 2), nullable=False, server_default="0.00"),
            sa.Column("difference_type", sa.String(20), nullable=False, server_default="none"),
            sa.Column("difference_reason", sa.Text(), nullable=True),
            sa.Column("denominations", sa.Text(), nullable=True),
            sa.Column("closed_by_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
            sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("verified_by_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
            sa.Column("verified_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("is_locked", sa.Boolean(), nullable=False, server_default="false"),
            sa.Column("reopened_by_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
            sa.Column("reopened_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("reopening_reason", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.UniqueConstraint("cash_register_id", "register_date", name="uq_cash_register_daily"),
        )
        op.create_index("ix_daily_cash_reg_inst_date", "daily_cash_registers", ["institution_id", "register_date"])
        op.create_index("ix_daily_cash_reg_status", "daily_cash_registers", ["status"])

    # 5. Cash Transactions Table (Ancillary Cash Movements)
    if "cash_transactions" not in tables:
        op.create_table(
            "cash_transactions",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("institution_id", sa.Integer(), sa.ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, server_default="1"),
            sa.Column("cash_register_id", sa.Integer(), sa.ForeignKey("cash_registers.id", ondelete="CASCADE"), nullable=False),
            sa.Column("transaction_date", sa.Date(), nullable=False),
            sa.Column("transaction_type", sa.String(30), nullable=False),
            sa.Column("amount", sa.Numeric(12, 2), nullable=False),
            sa.Column("reference_number", sa.String(100), nullable=True),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("destination_or_source", sa.String(150), nullable=True),
            sa.Column("performed_by_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )
        op.create_index("ix_cash_transactions_inst_date", "cash_transactions", ["institution_id", "transaction_date"])
        op.create_index("ix_cash_transactions_type", "cash_transactions", ["transaction_type"])

    # Seed baseline expense categories and default cash register
    op.execute("""
        INSERT INTO expense_categories (institution_id, name, code, description, is_active)
        VALUES
            (1, 'Staff Salary & Honorarium', 'STAFF_SALARY', 'Faculty and administrative staff remuneration', true),
            (1, 'Rent & Infrastructure', 'RENT_MAINT', 'Facility rent, building maintenance, property charges', true),
            (1, 'Utilities & Power', 'UTILITIES', 'Electricity, water, high-speed broadband, diesel generator', true),
            (1, 'Printing & Stationery', 'STATIONERY', 'Class test printouts, assignment booklets, registers, office stationery', true),
            (1, 'Marketing & Student Outreach', 'MARKETING', 'Banners, local newspaper ads, online campaigns, brochures', true),
            (1, 'Travel & Conveyance', 'TRAVEL', 'Field faculty conveyance, logistics, courier charges', true),
            (1, 'Refreshments & Hospitality', 'REFRESHMENTS', 'Staff tea, guest hospitality, student orientation snacks', true),
            (1, 'Lab & Classroom Equipment', 'EQUIPMENT', 'Smartboard accessories, lab kits, projector lamps, furniture repair', true),
            (1, 'Housekeeping & Sanitation', 'HOUSEKEEPING', 'Cleaning supplies, sanitization, facility hygiene consumables', true),
            (1, 'General & Miscellaneous', 'MISC', 'Sundry operational expenses and contingency expenditures', true)
        ON CONFLICT DO NOTHING;
    """)

    op.execute("""
        INSERT INTO cash_registers (institution_id, branch_id, name, code, description, is_active, is_default)
        VALUES
            (1, 1, 'Main Front Desk Counter', 'CASH-REG-01', 'Primary admissions and fee collection cash drawer', true, true)
        ON CONFLICT (code) DO NOTHING;
    """)


def downgrade() -> None:
    op.drop_table("cash_transactions")
    op.drop_table("daily_cash_registers")
    op.drop_table("cash_registers")
    op.drop_table("expenses")
    op.drop_table("expense_categories")
