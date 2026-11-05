# /**
#  * @file        014_student_lifecycle_and_withdrawal_analytics.py
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
#  * @created     2026-11-05
#  * @updated     2026-11-05
#  *
#  * @description Migration adding student lifecycle tracking, exit fields, refunds, and lifecycle audit logs.
#  */

"""Student lifecycle, exit metadata, refunds, and withdrawal tracking

Revision ID: 014_student_lifecycle
Revises: 013_repair_staff_roles
Create Date: 2026-11-05 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "014_student_lifecycle"
down_revision = "013_repair_staff_roles"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Add exit columns to students table
    op.add_column("students", sa.Column("exit_date", sa.Date(), nullable=True))
    op.add_column("students", sa.Column("exit_reason", sa.String(length=100), nullable=True))
    op.add_column("students", sa.Column("exit_notes", sa.Text(), nullable=True))

    # 2. Add exit columns and user attribution to student_enrollments table
    op.add_column("student_enrollments", sa.Column("exit_date", sa.Date(), nullable=True))
    op.add_column("student_enrollments", sa.Column("exit_reason", sa.String(length=100), nullable=True))
    op.add_column("student_enrollments", sa.Column("exit_notes", sa.Text(), nullable=True))
    op.add_column("student_enrollments", sa.Column("exited_by_id", sa.Integer(), nullable=True))
    op.add_column("student_enrollments", sa.Column("exited_at", sa.DateTime(timezone=True), nullable=True))

    op.create_foreign_key(
        "fk_student_enrollments_exited_by",
        "student_enrollments",
        "users",
        ["exited_by_id"],
        ["id"],
    )

    # 3. Create refunds table for authoritative tracking of refund disbursements
    op.create_table(
        "refunds",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("institution_id", sa.Integer(), nullable=False),
        sa.Column("student_id", sa.Integer(), nullable=False),
        sa.Column("enrollment_id", sa.Integer(), nullable=True),
        sa.Column("payment_id", sa.Integer(), nullable=True),
        sa.Column("invoice_id", sa.Integer(), nullable=True),
        sa.Column("amount", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("refund_date", sa.Date(), nullable=False),
        sa.Column("refund_method", sa.String(length=30), nullable=False),
        sa.Column("reference_number", sa.String(length=100), nullable=True),
        sa.Column("reason", sa.String(length=200), nullable=True),
        sa.Column("status", sa.String(length=20), server_default="completed", nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("processed_by_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["institution_id"], ["institutions.id"]),
        sa.ForeignKeyConstraint(["student_id"], ["students.id"]),
        sa.ForeignKeyConstraint(["enrollment_id"], ["student_enrollments.id"]),
        sa.ForeignKeyConstraint(["payment_id"], ["payments.id"]),
        sa.ForeignKeyConstraint(["invoice_id"], ["fee_invoices.id"]),
        sa.ForeignKeyConstraint(["processed_by_id"], ["users.id"]),
    )
    op.create_index("ix_refunds_id", "refunds", ["id"])
    op.create_index("ix_refunds_student_id", "refunds", ["student_id"])
    op.create_index("ix_refunds_institution_id", "refunds", ["institution_id"])
    op.create_index("ix_refunds_refund_date", "refunds", ["refund_date"])

    # 4. Create student_lifecycle_logs table for complete chronological audit history
    op.create_table(
        "student_lifecycle_logs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("institution_id", sa.Integer(), nullable=False),
        sa.Column("student_id", sa.Integer(), nullable=False),
        sa.Column("enrollment_id", sa.Integer(), nullable=True),
        sa.Column("action", sa.String(length=50), nullable=False),
        sa.Column("from_status", sa.String(length=30), nullable=True),
        sa.Column("to_status", sa.String(length=30), nullable=False),
        sa.Column("effective_date", sa.Date(), nullable=False),
        sa.Column("reason", sa.String(length=100), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("performed_by_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["institution_id"], ["institutions.id"]),
        sa.ForeignKeyConstraint(["student_id"], ["students.id"]),
        sa.ForeignKeyConstraint(["enrollment_id"], ["student_enrollments.id"]),
        sa.ForeignKeyConstraint(["performed_by_id"], ["users.id"]),
    )
    op.create_index("ix_student_lifecycle_logs_id", "student_lifecycle_logs", ["id"])
    op.create_index("ix_student_lifecycle_logs_student_id", "student_lifecycle_logs", ["student_id"])
    op.create_index("ix_student_lifecycle_logs_action", "student_lifecycle_logs", ["action"])
    op.create_index("ix_student_lifecycle_logs_effective_date", "student_lifecycle_logs", ["effective_date"])


def downgrade() -> None:
    op.drop_table("student_lifecycle_logs")
    op.drop_table("refunds")

    op.drop_constraint("fk_student_enrollments_exited_by", "student_enrollments", type_="foreignkey")
    op.drop_column("student_enrollments", "exited_at")
    op.drop_column("student_enrollments", "exited_by_id")
    op.drop_column("student_enrollments", "exit_notes")
    op.drop_column("student_enrollments", "exit_reason")
    op.drop_column("student_enrollments", "exit_date")

    op.drop_column("students", "exit_notes")
    op.drop_column("students", "exit_reason")
    op.drop_column("students", "exit_date")
