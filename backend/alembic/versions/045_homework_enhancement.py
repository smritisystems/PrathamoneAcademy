# /**
#  * @file        045_homework_enhancement.py
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
#  * @created     2026-11-12
#  * @updated     2026-11-12
#  *
#  * @description Extend homework_assignments and student_homework_records for assignment types, late-joiner policies, submission versioning, evaluation history, secure homework_files storage, and granular homework RBAC permissions.
#  */

"""homework_enhancement

Revision ID: 045_homework_enhancement
Revises: 044_p2_ssot_snapshots
Create Date: 2026-11-12 15:15:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "045_homework_enhancement"
down_revision = "044_p2_ssot_snapshots"
branch_labels = None
depends_on = None


def _column_exists(inspector, table_name: str, column_name: str) -> bool:
    return any(col["name"] == column_name for col in inspector.get_columns(table_name))


def _table_exists(inspector, table_name: str) -> bool:
    return table_name in inspector.get_table_names()


def _index_exists(inspector, table_name: str, index_name: str) -> bool:
    return any(idx["name"] == index_name for idx in inspector.get_indexes(table_name))


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    # 1. Extend homework_assignments
    if _table_exists(inspector, "homework_assignments"):
        hw_cols = [
            ("assignment_type", sa.Column("assignment_type", sa.String(length=40), nullable=False, server_default="homework")),
            ("estimated_duration_minutes", sa.Column("estimated_duration_minutes", sa.Integer(), nullable=True)),
            ("original_recipient_count", sa.Column("original_recipient_count", sa.Integer(), nullable=False, server_default="0")),
            ("late_joiner_policy", sa.Column("late_joiner_policy", sa.String(length=30), nullable=False, server_default="manual")),
            ("published_at", sa.Column("published_at", sa.DateTime(timezone=True), nullable=True)),
            ("closed_at", sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True)),
            ("allow_resubmission", sa.Column("allow_resubmission", sa.Boolean(), nullable=False, server_default="true")),
        ]
        for col_name, col_def in hw_cols:
            if not _column_exists(inspector, "homework_assignments", col_name):
                op.add_column("homework_assignments", col_def)

        if not _index_exists(inspector, "homework_assignments", "ix_hw_assignment_type"):
            op.create_index("ix_hw_assignment_type", "homework_assignments", ["assignment_type"])

        # Backfill original_recipient_count & published_at for existing published records
        op.execute(
            sa.text(
                """
                UPDATE homework_assignments ha
                SET original_recipient_count = COALESCE((
                    SELECT COUNT(*) FROM student_homework_records shr
                    WHERE shr.assignment_id = ha.id
                ), 0),
                published_at = COALESCE(ha.published_at, CASE WHEN ha.status = 'published' THEN ha.created_at ELSE NULL END)
                WHERE ha.original_recipient_count = 0
                """
            )
        )

    # 2. Extend student_homework_records
    if _table_exists(inspector, "student_homework_records"):
        rec_cols = [
            ("is_late_addition", sa.Column("is_late_addition", sa.Boolean(), nullable=False, server_default="false")),
            ("addition_reason", sa.Column("addition_reason", sa.String(length=255), nullable=True)),
            ("custom_instructions", sa.Column("custom_instructions", sa.Text(), nullable=True)),
            ("custom_attachments", sa.Column("custom_attachments", sa.Text(), nullable=True)),
            ("teacher_feedback_attachments", sa.Column("teacher_feedback_attachments", sa.Text(), nullable=True)),
            ("submission_version", sa.Column("submission_version", sa.Integer(), nullable=False, server_default="0")),
            ("submission_history", sa.Column("submission_history", sa.Text(), nullable=True)),
            ("evaluation_history", sa.Column("evaluation_history", sa.Text(), nullable=True)),
        ]
        for col_name, col_def in rec_cols:
            if not _column_exists(inspector, "student_homework_records", col_name):
                op.add_column("student_homework_records", col_def)

        op.execute(
            sa.text(
                """
                UPDATE student_homework_records
                SET submission_version = 1
                WHERE submission_version = 0 AND submission_time IS NOT NULL
                """
            )
        )

    # 3. Create homework_files table
    if not _table_exists(inspector, "homework_files"):
        op.create_table(
            "homework_files",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("institution_id", sa.Integer(), sa.ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, server_default="1"),
            sa.Column("assignment_id", sa.Integer(), sa.ForeignKey("homework_assignments.id", ondelete="CASCADE"), nullable=True),
            sa.Column("student_record_id", sa.Integer(), sa.ForeignKey("student_homework_records.id", ondelete="CASCADE"), nullable=True),
            sa.Column("uploader_user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
            sa.Column("context", sa.String(length=40), nullable=False, server_default="assignment_attachment"),
            sa.Column("original_filename", sa.String(length=255), nullable=False),
            sa.Column("stored_filename", sa.String(length=255), nullable=False),
            sa.Column("storage_path", sa.String(length=500), nullable=False),
            sa.Column("mime_type", sa.String(length=150), nullable=False),
            sa.Column("extension", sa.String(length=20), nullable=False),
            sa.Column("file_size_bytes", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("sha256_checksum", sa.String(length=64), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )
        op.create_index("ix_homework_files_id", "homework_files", ["id"])
        op.create_index("ix_hw_files_institution", "homework_files", ["institution_id"])
        op.create_index("ix_hw_files_assignment", "homework_files", ["assignment_id"])
        op.create_index("ix_hw_files_record", "homework_files", ["student_record_id"])

    # 4. Seed separated granular homework permissions across existing roles (if roles table populated)
    role_actions = {
        "admin": ["view", "create", "edit", "publish", "evaluate", "delete", "reports", "settings", "manage_all"],
        "principal": ["view", "create", "edit", "publish", "evaluate", "delete", "reports", "settings", "manage_all"],
        "coordinator": ["view", "create", "edit", "publish", "evaluate", "reports", "manage_all"],
        "teacher": ["view", "create", "edit", "publish", "evaluate", "reports"],
        "staff": ["view", "create", "edit", "reports"],
    }
    if _table_exists(inspector, "roles") and _table_exists(inspector, "permissions"):
        roles_rows = conn.execute(sa.text("SELECT id, LOWER(name) FROM roles")).fetchall()
        for role_id, role_name in roles_rows:
            actions = role_actions.get(role_name)
            if not actions:
                continue
            for action in actions:
                exists = conn.execute(
                    sa.text(
                        "SELECT 1 FROM permissions WHERE role_id = :rid AND resource = 'homework' AND action = :act LIMIT 1"
                    ),
                    {"rid": role_id, "act": action},
                ).first()
                if not exists:
                    conn.execute(
                        sa.text(
                            "INSERT INTO permissions (role_id, resource, action) VALUES (:rid, 'homework', :act)"
                        ),
                        {"rid": role_id, "act": action},
                    )


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    if _table_exists(inspector, "homework_files"):
        op.drop_table("homework_files")

    if _table_exists(inspector, "student_homework_records"):
        for col_name in [
            "evaluation_history",
            "submission_history",
            "submission_version",
            "teacher_feedback_attachments",
            "custom_attachments",
            "custom_instructions",
            "addition_reason",
            "is_late_addition",
        ]:
            if _column_exists(inspector, "student_homework_records", col_name):
                op.drop_column("student_homework_records", col_name)

    if _table_exists(inspector, "homework_assignments"):
        if _index_exists(inspector, "homework_assignments", "ix_hw_assignment_type"):
            op.drop_index("ix_hw_assignment_type", table_name="homework_assignments")
        for col_name in [
            "allow_resubmission",
            "closed_at",
            "published_at",
            "late_joiner_policy",
            "original_recipient_count",
            "estimated_duration_minutes",
            "assignment_type",
        ]:
            if _column_exists(inspector, "homework_assignments", col_name):
                op.drop_column("homework_assignments", col_name)

