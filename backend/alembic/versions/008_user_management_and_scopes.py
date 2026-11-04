# /**
#  * @file        008_user_management_and_scopes.py
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
#  * @description Database migration extending user management fields, scope definitions, and access logs.
#  */

"""Add user management fields and scopes to users table

Revision ID: 008_user_management_and_scopes
Revises: 007_data_import_export_logs
Create Date: 2026-11-04 10:15:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "008_user_management_and_scopes"
down_revision = "007_data_import_export_logs"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("invitation_status", sa.String(length=30), server_default="accepted", nullable=False))
    op.add_column("users", sa.Column("invitation_sent_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("users", sa.Column("scope_type", sa.String(length=30), server_default="institute", nullable=False))
    op.add_column("users", sa.Column("scope_id", sa.Integer(), nullable=True))
    op.add_column("users", sa.Column("staff_code", sa.String(length=50), nullable=True))
    op.add_column("users", sa.Column("designation", sa.String(length=100), nullable=True))

    op.create_index(op.f("ix_users_staff_code"), "users", ["staff_code"], unique=False)
    op.create_index(op.f("ix_users_invitation_status"), "users", ["invitation_status"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_users_invitation_status"), table_name="users")
    op.drop_index(op.f("ix_users_staff_code"), table_name="users")
    op.drop_column("users", "designation")
    op.drop_column("users", "staff_code")
    op.drop_column("users", "scope_id")
    op.drop_column("users", "scope_type")
    op.drop_column("users", "invitation_sent_at")
    op.drop_column("users", "invitation_status")

