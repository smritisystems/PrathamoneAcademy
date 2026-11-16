# /**
#  * @file        051_unified_planning_activities.py
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
#  * @created     2026-11-16
#  * @updated     2026-11-17
#  *
#  * @description Creates the unified institution-scoped planning activity and relationship tables and seeds granular permissions.
#  */

"""create unified planning activities

Revision ID: 051_unified_planning_activities
Revises: 050_chat_and_doubt_engine
Create Date: 2026-11-16
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import text


revision: str = "051_unified_planning_activities"
down_revision: Union[str, None] = "050_chat_and_doubt_engine"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


PERMISSIONS = {
    "view": (
        "superadmin", "super_admin", "sysadmin", "admin", "principal",
        "teacher", "staff", "coordinator", "accountant", "counselor",
        "counsellor", "receptionist",
    ),
    "view_all": ("superadmin", "super_admin", "sysadmin", "admin", "principal"),
    "create": (
        "superadmin", "super_admin", "sysadmin", "admin", "principal",
        "teacher", "staff", "coordinator", "receptionist",
    ),
    "edit": (
        "superadmin", "super_admin", "sysadmin", "admin", "principal",
        "teacher", "staff", "coordinator", "receptionist",
    ),
    "edit_any": ("superadmin", "super_admin", "sysadmin", "admin", "principal"),
    "complete": (
        "superadmin", "super_admin", "sysadmin", "admin", "principal",
        "teacher", "staff", "coordinator", "receptionist",
    ),
    "assign": (
        "superadmin", "super_admin", "sysadmin", "admin", "principal",
        "coordinator",
    ),
    "publish": ("superadmin", "super_admin", "sysadmin", "admin", "principal"),
    "cancel": ("superadmin", "super_admin", "sysadmin", "admin", "principal"),
    "delete": ("superadmin", "super_admin", "sysadmin", "admin", "principal"),
    "view_audit": ("superadmin", "super_admin", "sysadmin", "admin", "principal"),
}


def upgrade() -> None:
    op.create_table(
        "activities",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("institution_id", sa.Integer(), nullable=False),
        sa.Column("academic_year_id", sa.Integer(), nullable=True),
        sa.Column("division_id", sa.Integer(), nullable=True),
        sa.Column("subject_id", sa.Integer(), nullable=True),
        sa.Column("created_by_id", sa.Integer(), nullable=True),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("activity_type", sa.String(length=20), server_default="task", nullable=False),
        sa.Column("category", sa.String(length=30), server_default="administrative", nullable=False),
        sa.Column("start_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("end_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("due_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("timezone", sa.String(length=50), server_default="Asia/Kolkata", nullable=False),
        sa.Column("all_day", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("location", sa.String(length=200), nullable=True),
        sa.Column("priority", sa.String(length=20), server_default="normal", nullable=False),
        sa.Column("status", sa.String(length=20), server_default="todo", nullable=False),
        sa.Column("visibility", sa.String(length=20), server_default="institution", nullable=False),
        sa.Column("is_published", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("recurrence_frequency", sa.String(length=10), nullable=True),
        sa.Column("recurrence_interval", sa.Integer(), server_default="1", nullable=False),
        sa.Column("recurrence_until", sa.Date(), nullable=True),
        sa.Column("recurrence_weekdays", sa.String(length=20), nullable=True),
        sa.Column("version", sa.Integer(), server_default="1", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint(
            "activity_type IN ('task', 'event', 'holiday')",
            name="ck_activities_type",
        ),
        sa.CheckConstraint(
            "status IN ('backlog', 'todo', 'in_progress', 'blocked', 'completed', 'cancelled')",
            name="ck_activities_status",
        ),
        sa.CheckConstraint(
            "priority IN ('low', 'normal', 'high', 'urgent')",
            name="ck_activities_priority",
        ),
        sa.CheckConstraint(
            "recurrence_frequency IS NULL OR recurrence_frequency IN ('daily', 'weekly', 'monthly')",
            name="ck_activities_recurrence_frequency",
        ),
        sa.CheckConstraint("recurrence_interval >= 1", name="ck_activities_recurrence_interval"),
        sa.CheckConstraint(
            "end_at IS NULL OR (start_at IS NOT NULL AND end_at > start_at)",
            name="ck_activities_valid_time_range",
        ),
        sa.ForeignKeyConstraint(["institution_id"], ["institutions.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["academic_year_id"], ["academic_years.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["division_id"], ["divisions.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["subject_id"], ["subjects.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["created_by_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_activities_institution_id", "activities", ["institution_id"])
    op.create_index("ix_activities_academic_year_id", "activities", ["academic_year_id"])
    op.create_index("ix_activities_division_id", "activities", ["division_id"])
    op.create_index("ix_activities_subject_id", "activities", ["subject_id"])
    op.create_index("ix_activities_created_by_id", "activities", ["created_by_id"])
    op.create_index("ix_activities_status", "activities", ["status"])
    op.create_index("ix_activities_institution_status", "activities", ["institution_id", "status"])
    op.create_index("ix_activities_institution_start", "activities", ["institution_id", "start_at"])
    op.create_index("ix_activities_institution_due", "activities", ["institution_id", "due_at"])

    op.create_table(
        "activity_assignees",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("activity_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("assigned_by_id", sa.Integer(), nullable=True),
        sa.Column("assigned_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["activity_id"], ["activities.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["assigned_by_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("activity_id", "user_id", name="uq_activity_assignee_user"),
    )
    op.create_index("ix_activity_assignees_user", "activity_assignees", ["user_id"])

    op.create_table(
        "activity_attachments",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("activity_id", sa.Integer(), nullable=False),
        sa.Column("uploader_user_id", sa.Integer(), nullable=True),
        sa.Column("original_filename", sa.String(length=255), nullable=False),
        sa.Column("stored_filename", sa.String(length=255), nullable=False),
        sa.Column("storage_path", sa.String(length=500), nullable=False),
        sa.Column("mime_type", sa.String(length=150), nullable=False),
        sa.Column("file_size_bytes", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["activity_id"], ["activities.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["uploader_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_activity_attachments_activity", "activity_attachments", ["activity_id"])

    op.create_table(
        "activity_references",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("activity_id", sa.Integer(), nullable=False),
        sa.Column("source_type", sa.String(length=30), nullable=False),
        sa.Column("source_record_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint(
            "source_type IN ('student', 'lead', 'fee_invoice', 'attendance', 'academic_year', 'division', 'subject', 'examination', 'timetable_entry', 'communication_log', 'homework_assignment')",
            name="ck_activity_references_source_type",
        ),
        sa.ForeignKeyConstraint(["activity_id"], ["activities.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "activity_id", "source_type", "source_record_id", name="uq_activity_reference"
        ),
    )
    op.create_index(
        "ix_activity_references_source",
        "activity_references",
        ["source_type", "source_record_id"],
    )

    op.create_table(
        "activity_recurrence_exceptions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("activity_id", sa.Integer(), nullable=False),
        sa.Column("occurrence_date", sa.Date(), nullable=False),
        sa.Column("created_by_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["activity_id"], ["activities.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["created_by_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "activity_id", "occurrence_date", name="uq_activity_recurrence_exception"
        ),
    )
    op.create_index(
        "ix_activity_recurrence_exceptions_activity",
        "activity_recurrence_exceptions",
        ["activity_id"],
    )

    connection = op.get_bind()
    for action, roles in PERMISSIONS.items():
        for role_name in roles:
            connection.execute(
                text(
                    """
                    INSERT INTO permissions (role_id, resource, action, created_at)
                    SELECT r.id, 'planning', CAST(:action AS VARCHAR), NOW()
                    FROM roles r
                    WHERE r.name = :role_name
                    AND NOT EXISTS (
                        SELECT 1 FROM permissions p
                        WHERE p.role_id = r.id
                          AND p.resource = 'planning'
                          AND p.action = CAST(:action AS VARCHAR)
                    )
                    """
                ),
                {"role_name": role_name, "action": action},
            )


def downgrade() -> None:
    connection = op.get_bind()
    for action, roles in PERMISSIONS.items():
        for role_name in roles:
            connection.execute(
                text(
                    """
                    DELETE FROM permissions
                    WHERE resource = 'planning' AND action = :action
                      AND role_id IN (SELECT id FROM roles WHERE name = :role_name)
                    """
                ),
                {"role_name": role_name, "action": action},
            )

    op.drop_index(
        "ix_activity_recurrence_exceptions_activity",
        table_name="activity_recurrence_exceptions",
    )
    op.drop_table("activity_recurrence_exceptions")
    op.drop_index("ix_activity_references_source", table_name="activity_references")
    op.drop_table("activity_references")
    op.drop_index("ix_activity_attachments_activity", table_name="activity_attachments")
    op.drop_table("activity_attachments")
    op.drop_index("ix_activity_assignees_user", table_name="activity_assignees")
    op.drop_table("activity_assignees")
    op.drop_index("ix_activities_institution_due", table_name="activities")
    op.drop_index("ix_activities_institution_start", table_name="activities")
    op.drop_index("ix_activities_institution_status", table_name="activities")
    op.drop_index("ix_activities_status", table_name="activities")
    op.drop_index("ix_activities_created_by_id", table_name="activities")
    op.drop_index("ix_activities_subject_id", table_name="activities")
    op.drop_index("ix_activities_division_id", table_name="activities")
    op.drop_index("ix_activities_academic_year_id", table_name="activities")
    op.drop_index("ix_activities_institution_id", table_name="activities")
    op.drop_table("activities")
