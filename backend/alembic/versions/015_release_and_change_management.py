# /**
#  * @file        015_release_and_change_management.py
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
#  * @description Migration creating system_releases table for release tracking, build versioning, and lifecycle management.
#  */

"""Create system_releases table for Release and Change Management

Revision ID: 015_release_management
Revises: 014_student_lifecycle
Create Date: 2026-11-05 13:45:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "015_release_management"
down_revision = "014_student_lifecycle"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "system_releases",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("version", sa.String(length=50), nullable=False),
        sa.Column("build_number", sa.String(length=100), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("status", sa.String(length=30), server_default="draft", nullable=False),
        sa.Column("environment", sa.String(length=30), server_default="production", nullable=False),
        sa.Column("git_branch", sa.String(length=100), nullable=True),
        sa.Column("git_commit_start", sa.String(length=50), nullable=True),
        sa.Column("git_commit_end", sa.String(length=50), nullable=True),
        sa.Column("git_tag", sa.String(length=50), nullable=True),
        sa.Column("release_notes_markdown", sa.Text(), nullable=False),
        sa.Column("release_notes_structured", sa.Text(), server_default="{}", nullable=False),
        sa.Column("change_summary", sa.Text(), server_default="{}", nullable=False),
        sa.Column("validation_status", sa.String(length=30), server_default="pending", nullable=False),
        sa.Column("validation_results", sa.Text(), server_default="{}", nullable=False),
        sa.Column("is_critical_security", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("requires_db_backup", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("migration_plan", sa.Text(), nullable=True),
        sa.Column("created_by_id", sa.Integer(), nullable=False),
        sa.Column("approved_by_id", sa.Integer(), nullable=True),
        sa.Column("published_by_id", sa.Integer(), nullable=True),
        sa.Column("rolled_back_by_id", sa.Integer(), nullable=True),
        sa.Column("rollback_reason", sa.Text(), nullable=True),
        sa.Column("rollback_target_version", sa.String(length=50), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("rolled_back_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["created_by_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["approved_by_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["published_by_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["rolled_back_by_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_system_releases_id"), "system_releases", ["id"], unique=False)
    op.create_index(op.f("ix_system_releases_version"), "system_releases", ["version"], unique=True)
    op.create_index(op.f("ix_system_releases_status"), "system_releases", ["status"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_system_releases_status"), table_name="system_releases")
    op.drop_index(op.f("ix_system_releases_version"), table_name="system_releases")
    op.drop_index(op.f("ix_system_releases_id"), table_name="system_releases")
    op.drop_table("system_releases")
