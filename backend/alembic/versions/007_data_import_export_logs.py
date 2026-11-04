# /**
#  * @file        007_data_import_export_logs.py
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
#  * @description Database migration creating import/export job logs and audit tracking tables.
#  */

"""Add data_import_logs table

Revision ID: 007_data_import_export_logs
Revises: 006_academic_batch_workspace
Create Date: 2026-11-04 09:50:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "007_data_import_export_logs"
down_revision = "006_academic_batch_workspace"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "data_import_logs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("institution_id", sa.Integer(), nullable=False),
        sa.Column("academic_year_id", sa.Integer(), nullable=True),
        sa.Column("entity_type", sa.String(length=50), nullable=False),
        sa.Column("import_mode", sa.String(length=30), server_default="create_only", nullable=False),
        sa.Column("source_type", sa.String(length=20), server_default="file", nullable=False),
        sa.Column("file_name", sa.String(length=255), nullable=True),
        sa.Column("total_rows", sa.Integer(), server_default="0", nullable=False),
        sa.Column("successful_rows", sa.Integer(), server_default="0", nullable=False),
        sa.Column("failed_rows", sa.Integer(), server_default="0", nullable=False),
        sa.Column("status", sa.String(length=30), server_default="completed", nullable=False),
        sa.Column("error_summary", sa.Text(), nullable=True),
        sa.Column("reconciliation_data", sa.Text(), nullable=True),
        sa.Column("imported_by_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["academic_year_id"], ["academic_years.id"]),
        sa.ForeignKeyConstraint(["imported_by_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["institution_id"], ["institutions.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_data_import_logs_id"), "data_import_logs", ["id"], unique=False)
    op.create_index(op.f("ix_data_import_logs_entity_type"), "data_import_logs", ["entity_type"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_data_import_logs_entity_type"), table_name="data_import_logs")
    op.drop_index(op.f("ix_data_import_logs_id"), table_name="data_import_logs")
    op.drop_table("data_import_logs")

