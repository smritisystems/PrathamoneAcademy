# /**
#  * @file        002_fee_register_imports.py
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
#  * @description Database migration adding fee register import batch tracking and reconciliation fields.
#  */

"""Fee register imports tracking table

Revision ID: 002_fee_register_imports
Revises: 001_initial
Create Date: 2026-11-04 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "002_fee_register_imports"
down_revision = "001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "fee_register_imports",
        sa.Column("id", sa.Integer, primary_key=True, index=True),
        sa.Column("file_name", sa.String(255), nullable=False),
        sa.Column("file_hash", sa.String(64), unique=True, index=True, nullable=False),
        sa.Column("academic_year_id", sa.Integer, sa.ForeignKey("academic_years.id"), nullable=False),
        sa.Column("institution_id", sa.Integer, sa.ForeignKey("institutions.id"), nullable=False),
        sa.Column("imported_students_count", sa.Integer, default=0, nullable=False),
        sa.Column("imported_payments_count", sa.Integer, default=0, nullable=False),
        sa.Column("total_fees", sa.Numeric(12, 2), default=0, nullable=False),
        sa.Column("total_collected", sa.Numeric(12, 2), default=0, nullable=False),
        sa.Column("total_outstanding", sa.Numeric(12, 2), default=0, nullable=False),
        sa.Column("reconciliation_summary", sa.Text, nullable=True),
        sa.Column("status", sa.String(30), default="completed", nullable=False),
        sa.Column("imported_by_id", sa.Integer, sa.ForeignKey("users.id"), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_table("fee_register_imports")

