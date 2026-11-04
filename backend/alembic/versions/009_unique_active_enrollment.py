# /**
#  * @file        009_unique_active_enrollment.py
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
#  * @description Database migration enforcing single active student enrollment per academic year via partial unique index.
#  */

"""Enforce single active enrollment per academic year

Revision ID: 009_unique_active_enrollment
Revises: 008_user_management_and_scopes
Create Date: 2026-11-04 17:15:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "009_unique_active_enrollment"
down_revision = "008_user_management_and_scopes"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Clean up lingering test artifact enrollments
    op.execute(
        "UPDATE student_enrollments "
        "SET status = 'archived', remarks = 'Historical test artifact archived during software audit' "
        "WHERE roll_number LIKE 'AUD%' AND status = 'active'"
    )

    # 2. Add partial unique index guaranteeing exactly one active enrollment per student per academic year
    op.create_index(
        "uq_active_student_academic_year",
        "student_enrollments",
        ["student_id", "academic_year_id"],
        unique=True,
        postgresql_where=sa.text("status = 'active'"),
    )


def downgrade() -> None:
    op.drop_index(
        "uq_active_student_academic_year",
        table_name="student_enrollments",
    )

