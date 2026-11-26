# /**
#  * @file        058_fee_matrix_composite_indexes.py
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
#  * @created     2026-11-26
#  * @updated     2026-11-26
#  *
#  * @description Composite performance indexes for fee matrix, monthly pivot, and multi-tenant academic-year queries.
#  */

"""Add composite indexes for fee matrix and multi-tenant ledger queries

Revision ID: 058_fee_matrix_composite_indexes
Revises: 057_repair_teacher_assignments
Create Date: 2026-11-26
"""

from alembic import op
import sqlalchemy as sa


revision = "058_fee_matrix_composite_indexes"
down_revision = "057_repair_teacher_assignments"
branch_labels = None
depends_on = None

_INDEX_SPECS = (
    ("students", "ix_students_inst_demo_active", ["institution_id", "is_demo", "is_active"]),
    (
        "student_enrollments",
        "ix_student_enrollments_ay_student_status",
        ["academic_year_id", "student_id", "status"],
    ),
    (
        "student_enrollments",
        "ix_student_enrollments_div_ay_student",
        ["division_id", "academic_year_id", "student_id"],
    ),
    (
        "fee_invoices",
        "ix_fee_invoices_ay_student_status",
        ["academic_year_id", "student_id", "status"],
    ),
    (
        "payments",
        "ix_payments_ay_student_status_date",
        ["academic_year_id", "student_id", "status", "payment_date"],
    ),
    (
        "fee_concession_applications",
        "ix_fee_concession_apps_inst_ay_student",
        ["institution_id", "academic_year_id", "student_id"],
    ),
    (
        "fee_structures",
        "ix_fee_structures_inst_ay_std",
        ["institution_id", "academic_year_id", "standard_id"],
    ),
)


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = set(inspector.get_table_names())
    for table_name, index_name, columns in _INDEX_SPECS:
        if table_name not in existing_tables:
            continue
        existing_indexes = {idx["name"] for idx in inspector.get_indexes(table_name)}
        if index_name not in existing_indexes:
            op.create_index(index_name, table_name, columns, unique=False)


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = set(inspector.get_table_names())
    for table_name, index_name, _columns in reversed(_INDEX_SPECS):
        if table_name not in existing_tables:
            continue
        existing_indexes = {idx["name"] for idx in inspector.get_indexes(table_name)}
        if index_name in existing_indexes:
            op.drop_index(index_name, table_name=table_name)
