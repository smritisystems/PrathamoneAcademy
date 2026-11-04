# /**
#  * @file        005_division_name_and_indexes.py
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
#  * @created     2026-11-04
#  * @updated     2026-11-04
#  *
#  * @description Database migration adding division name aliases and query optimization indexes.
#  */

"""Widen division name and add performance indexes

Revision ID: 005_division_name_and_indexes
Revises: 004_student_portal_and_profile
Create Date: 2026-11-04 02:15:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "005_division_name_and_indexes"
down_revision = "004_student_portal_and_profile"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Expand divisions.name from VARCHAR(10) to VARCHAR(100)
    op.alter_column(
        "divisions",
        "name",
        existing_type=sa.String(10),
        type_=sa.String(100),
        existing_nullable=False,
    )

    # 2. Add performance indexes for frequently queried foreign keys & date filters
    op.create_index(
        "ix_attendances_student_date",
        "attendances",
        ["student_id", "date"],
        if_not_exists=True,
    )
    op.create_index(
        "ix_exam_marks_student_id",
        "exam_marks",
        ["student_id"],
        if_not_exists=True,
    )
    op.create_index(
        "ix_payment_allocations_invoice_id",
        "payment_allocations",
        ["invoice_id"],
        if_not_exists=True,
    )
    op.create_index(
        "ix_payment_allocations_payment_id",
        "payment_allocations",
        ["payment_id"],
        if_not_exists=True,
    )
    op.create_index(
        "ix_student_enrollments_student_ay",
        "student_enrollments",
        ["student_id", "academic_year_id"],
        if_not_exists=True,
    )
    op.create_index(
        "ix_fee_invoices_student_ay",
        "fee_invoices",
        ["student_id", "academic_year_id"],
        if_not_exists=True,
    )
    op.create_index(
        "ix_payments_student_date",
        "payments",
        ["student_id", "payment_date"],
        if_not_exists=True,
    )


def downgrade() -> None:
    op.drop_index("ix_payments_student_date", table_name="payments")
    op.drop_index("ix_fee_invoices_student_ay", table_name="fee_invoices")
    op.drop_index("ix_student_enrollments_student_ay", table_name="student_enrollments")
    op.drop_index("ix_payment_allocations_payment_id", table_name="payment_allocations")
    op.drop_index("ix_payment_allocations_invoice_id", table_name="payment_allocations")
    op.drop_index("ix_exam_marks_student_id", table_name="exam_marks")
    op.drop_index("ix_attendances_student_date", table_name="attendances")

    op.alter_column(
        "divisions",
        "name",
        existing_type=sa.String(100),
        type_=sa.String(10),
        existing_nullable=False,
    )

