# /**
#  * @file        020_teacher_payroll_and_sessions.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      backend.alembic.versions
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
#  * @description Alembic migration creating Teacher Payroll, Rate History, Teaching Sessions, and Payment Vouchers.
#  */

"""Teacher Payroll, Rate History, Teaching Sessions, and Payment Vouchers

Revision ID: 020_teacher_payroll
Revises: 019_fees_permissions
Create Date: 2026-11-06 12:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import text

revision = "020_teacher_payroll"
down_revision = "019_fees_permissions"
branch_labels = None
depends_on = None


def upgrade():
    # 1. Create teacher_payment_profiles
    op.create_table(
        "teacher_payment_profiles",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("institution_id", sa.Integer(), sa.ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, default=1),
        sa.Column("teacher_user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("payment_method", sa.String(30), nullable=False, server_default="hourly"),
        sa.Column("hourly_rate", sa.Numeric(10, 2), nullable=False, server_default="0.00"),
        sa.Column("per_lecture_rate", sa.Numeric(10, 2), nullable=False, server_default="0.00"),
        sa.Column("monthly_fixed_amount", sa.Numeric(10, 2), nullable=False, server_default="0.00"),
        sa.Column("contract_total_amount", sa.Numeric(10, 2), nullable=False, server_default="0.00"),
        sa.Column("currency", sa.String(10), nullable=False, server_default="INR"),
        sa.Column("effective_from", sa.Date(), nullable=False, server_default=sa.func.current_date()),
        sa.Column("effective_until", sa.Date(), nullable=True),
        sa.Column("payment_frequency", sa.String(30), nullable=False, server_default="monthly"),
        sa.Column("payment_terms", sa.String(255), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_by_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index(
        "uq_active_teacher_payment_profile",
        "teacher_payment_profiles",
        ["teacher_user_id", "institution_id"],
        unique=True,
        postgresql_where=text("is_active = true"),
    )

    # 2. Create teacher_rate_histories
    op.create_table(
        "teacher_rate_histories",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("payment_profile_id", sa.Integer(), sa.ForeignKey("teacher_payment_profiles.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("teacher_user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("old_payment_method", sa.String(30), nullable=True),
        sa.Column("new_payment_method", sa.String(30), nullable=False),
        sa.Column("old_rate", sa.Numeric(10, 2), nullable=True),
        sa.Column("new_rate", sa.Numeric(10, 2), nullable=False),
        sa.Column("effective_from", sa.Date(), nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("changed_by_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("changed_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # 3. Create teacher_contract_milestones
    op.create_table(
        "teacher_contract_milestones",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("payment_profile_id", sa.Integer(), sa.ForeignKey("teacher_payment_profiles.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("milestone_name", sa.String(150), nullable=False),
        sa.Column("milestone_order", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("percentage", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("due_date", sa.Date(), nullable=True),
        sa.Column("achieved_date", sa.Date(), nullable=True),
        sa.Column("status", sa.String(30), nullable=False, server_default="pending"),
        sa.Column("approved_by_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # 4. Create teacher_payrolls
    op.create_table(
        "teacher_payrolls",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("payroll_number", sa.String(50), nullable=False, unique=True, index=True),
        sa.Column("institution_id", sa.Integer(), sa.ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, default=1),
        sa.Column("academic_year_id", sa.Integer(), sa.ForeignKey("academic_years.id", ondelete="CASCADE"), nullable=False, default=1),
        sa.Column("teacher_user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("month", sa.Integer(), nullable=False),
        sa.Column("year", sa.Integer(), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("payment_method", sa.String(30), nullable=False),
        sa.Column("total_teaching_hours", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("total_completed_lectures", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("base_earnings", sa.Numeric(12, 2), nullable=False, server_default="0.00"),
        sa.Column("approved_incentives", sa.Numeric(12, 2), nullable=False, server_default="0.00"),
        sa.Column("approved_additional_earnings", sa.Numeric(12, 2), nullable=False, server_default="0.00"),
        sa.Column("contractual_adjustments", sa.Numeric(12, 2), nullable=False, server_default="0.00"),
        sa.Column("gross_pay", sa.Numeric(12, 2), nullable=False, server_default="0.00"),
        sa.Column("total_deductions", sa.Numeric(12, 2), nullable=False, server_default="0.00"),
        sa.Column("withholdings", sa.Numeric(12, 2), nullable=False, server_default="0.00"),
        sa.Column("net_payable", sa.Numeric(12, 2), nullable=False, server_default="0.00"),
        sa.Column("paid_amount", sa.Numeric(12, 2), nullable=False, server_default="0.00"),
        sa.Column("pending_amount", sa.Numeric(12, 2), nullable=False, server_default="0.00"),
        sa.Column("calculation_breakdown_json", sa.Text(), nullable=True),
        sa.Column("status", sa.String(30), nullable=False, server_default="calculated", index=True),
        sa.Column("calculated_by_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("approved_by_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("finalized_by_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("calculated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("finalized_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index(
        "uq_teacher_payroll_period",
        "teacher_payrolls",
        ["teacher_user_id", "month", "year", "institution_id"],
        unique=True,
    )

    # 5. Create teaching_sessions
    op.create_table(
        "teaching_sessions",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("session_code", sa.String(50), nullable=False, unique=True, index=True),
        sa.Column("institution_id", sa.Integer(), sa.ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, default=1),
        sa.Column("academic_year_id", sa.Integer(), sa.ForeignKey("academic_years.id", ondelete="CASCADE"), nullable=False, default=1),
        sa.Column("teacher_user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("substitute_teacher_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("subject_id", sa.Integer(), sa.ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("division_id", sa.Integer(), sa.ForeignKey("divisions.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("timetable_entry_id", sa.Integer(), sa.ForeignKey("timetable_entries.id", ondelete="SET NULL"), nullable=True),
        sa.Column("session_date", sa.Date(), nullable=False, index=True),
        sa.Column("scheduled_start_time", sa.String(15), nullable=False),
        sa.Column("scheduled_end_time", sa.String(15), nullable=False),
        sa.Column("actual_start_time", sa.String(15), nullable=True),
        sa.Column("actual_end_time", sa.String(15), nullable=True),
        sa.Column("break_duration_minutes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("calculated_duration_hours", sa.Float(), nullable=False, server_default="1.0"),
        sa.Column("payment_method", sa.String(30), nullable=False, server_default="hourly"),
        sa.Column("applicable_rate", sa.Numeric(10, 2), nullable=False, server_default="0.00"),
        sa.Column("calculated_amount", sa.Numeric(10, 2), nullable=False, server_default="0.00"),
        sa.Column("session_status", sa.String(30), nullable=False, server_default="completed", index=True),
        sa.Column("approval_status", sa.String(30), nullable=False, server_default="submitted", index=True),
        sa.Column("approved_by_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("rejection_reason", sa.Text(), nullable=True),
        sa.Column("topic_taught", sa.String(255), nullable=True),
        sa.Column("students_present_count", sa.Integer(), nullable=True),
        sa.Column("is_payable", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("payroll_id", sa.Integer(), sa.ForeignKey("teacher_payrolls.id", ondelete="SET NULL"), nullable=True, index=True),
        sa.Column("remarks", sa.Text(), nullable=True),
        sa.Column("created_by_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_teaching_sessions_date_teacher", "teaching_sessions", ["session_date", "teacher_user_id"])
    op.create_index("ix_teaching_sessions_division_date", "teaching_sessions", ["division_id", "session_date"])

    # 6. Create teacher_payment_vouchers
    op.create_table(
        "teacher_payment_vouchers",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("voucher_number", sa.String(50), nullable=False, unique=True, index=True),
        sa.Column("institution_id", sa.Integer(), sa.ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, default=1),
        sa.Column("payroll_id", sa.Integer(), sa.ForeignKey("teacher_payrolls.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("teacher_user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("amount_paid", sa.Numeric(12, 2), nullable=False),
        sa.Column("payment_date", sa.Date(), nullable=False, server_default=sa.func.current_date()),
        sa.Column("payment_method", sa.String(30), nullable=False, server_default="bank_transfer"),
        sa.Column("transaction_reference", sa.String(100), nullable=True),
        sa.Column("bank_name", sa.String(100), nullable=True),
        sa.Column("cheque_number", sa.String(50), nullable=True),
        sa.Column("cheque_date", sa.Date(), nullable=True),
        sa.Column("debit_account", sa.String(100), nullable=False, server_default="Teacher Remuneration & Faculty Cost"),
        sa.Column("credit_account", sa.String(100), nullable=False, server_default="Main Operating Bank Account"),
        sa.Column("recorded_by_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("approved_by_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("status", sa.String(30), nullable=False, server_default="posted", index=True),
        sa.Column("reversal_reason", sa.Text(), nullable=True),
        sa.Column("receipt_statement_data", sa.Text(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # 7. Seed RBAC permissions
    conn = op.get_bind()
    permissions_list = [
        # Sysadmin
        ("sysadmin", "teacher_payroll", "view"),
        ("sysadmin", "teacher_payroll", "calculate"),
        ("sysadmin", "teacher_payroll", "approve"),
        ("sysadmin", "teacher_payroll", "finalize"),
        ("sysadmin", "teacher_payroll", "pay"),
        ("sysadmin", "teacher_payroll", "export"),
        ("sysadmin", "teaching_sessions", "view"),
        ("sysadmin", "teaching_sessions", "create"),
        ("sysadmin", "teaching_sessions", "edit"),
        ("sysadmin", "teaching_sessions", "approve"),
        ("sysadmin", "teaching_sessions", "reject"),
        ("sysadmin", "teaching_sessions", "substitute"),
        ("sysadmin", "teacher_rates", "view"),
        ("sysadmin", "teacher_rates", "edit"),

        # Superadmin
        ("superadmin", "teacher_payroll", "view"),
        ("superadmin", "teacher_payroll", "calculate"),
        ("superadmin", "teacher_payroll", "approve"),
        ("superadmin", "teacher_payroll", "finalize"),
        ("superadmin", "teacher_payroll", "pay"),
        ("superadmin", "teacher_payroll", "export"),
        ("superadmin", "teaching_sessions", "view"),
        ("superadmin", "teaching_sessions", "create"),
        ("superadmin", "teaching_sessions", "edit"),
        ("superadmin", "teaching_sessions", "approve"),
        ("superadmin", "teaching_sessions", "reject"),
        ("superadmin", "teaching_sessions", "substitute"),
        ("superadmin", "teacher_rates", "view"),
        ("superadmin", "teacher_rates", "edit"),

        # Admin
        ("admin", "teacher_payroll", "view"),
        ("admin", "teacher_payroll", "calculate"),
        ("admin", "teacher_payroll", "approve"),
        ("admin", "teacher_payroll", "finalize"),
        ("admin", "teacher_payroll", "pay"),
        ("admin", "teacher_payroll", "export"),
        ("admin", "teaching_sessions", "view"),
        ("admin", "teaching_sessions", "create"),
        ("admin", "teaching_sessions", "edit"),
        ("admin", "teaching_sessions", "approve"),
        ("admin", "teaching_sessions", "reject"),
        ("admin", "teaching_sessions", "substitute"),
        ("admin", "teacher_rates", "view"),
        ("admin", "teacher_rates", "edit"),

        # Principal
        ("principal", "teacher_payroll", "view"),
        ("principal", "teacher_payroll", "approve"),
        ("principal", "teacher_payroll", "finalize"),
        ("principal", "teacher_payroll", "export"),
        ("principal", "teaching_sessions", "view"),
        ("principal", "teaching_sessions", "approve"),
        ("principal", "teaching_sessions", "reject"),
        ("principal", "teaching_sessions", "substitute"),
        ("principal", "teacher_rates", "view"),

        # Accountant
        ("accountant", "teacher_payroll", "view"),
        ("accountant", "teacher_payroll", "calculate"),
        ("accountant", "teacher_payroll", "pay"),
        ("accountant", "teacher_payroll", "export"),
        ("accountant", "teaching_sessions", "view"),
        ("accountant", "teacher_rates", "view"),

        # Teacher (can view own records and log sessions)
        ("teacher", "teacher_payroll", "view_own"),
        ("teacher", "teaching_sessions", "view_own"),
        ("teacher", "teaching_sessions", "create_own"),
    ]

    for role_name, resource, action in permissions_list:
        conn.execute(text("""
            INSERT INTO permissions (role_id, resource, action, created_at)
            SELECT r.id, CAST(:res AS VARCHAR), CAST(:act AS VARCHAR), NOW()
            FROM roles r
            WHERE r.name = CAST(:rname AS VARCHAR)
            AND NOT EXISTS (
                SELECT 1 FROM permissions p
                WHERE p.role_id = r.id AND p.resource = CAST(:res AS VARCHAR) AND p.action = CAST(:act AS VARCHAR)
            );
        """), {"rname": role_name, "res": resource, "act": action})


def downgrade():
    op.drop_table("teacher_payment_vouchers")
    op.drop_table("teaching_sessions")
    op.drop_table("teacher_payrolls")
    op.drop_table("teacher_contract_milestones")
    op.drop_table("teacher_rate_histories")
    op.drop_table("teacher_payment_profiles")
