# /**
#  * @file        046_create_eduboard_tables.py
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
#  * @description Creates edu_boards, edu_board_pages, edu_board_revisions, and edu_board_attachments tables and seeds granular eduboard RBAC permissions.
#  */

"""create eduboard tables and permissions

Revision ID: 046_create_eduboard_tables
Revises: 045_homework_enhancement
Create Date: 2026-11-12
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "046_create_eduboard_tables"
down_revision: Union[str, None] = "045_homework_enhancement"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _table_exists(inspector, table_name: str) -> bool:
    return table_name in inspector.get_table_names()


def _index_exists(inspector, table_name: str, index_name: str) -> bool:
    return any(ix["name"] == index_name for ix in inspector.get_indexes(table_name))


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    # 1. edu_boards (created first; edu_board_attachments FK references it)
    if not _table_exists(inspector, "edu_boards"):
        op.create_table(
            "edu_boards",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("board_code", sa.String(length=60), nullable=False, unique=True),
            sa.Column("institution_id", sa.Integer(), sa.ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, server_default="1"),
            sa.Column("is_demo", sa.Boolean(), nullable=False, server_default="false"),
            sa.Column("academic_year_id", sa.Integer(), sa.ForeignKey("academic_years.id", ondelete="CASCADE"), nullable=False),
            sa.Column("teaching_session_id", sa.Integer(), sa.ForeignKey("teaching_sessions.id", ondelete="SET NULL"), nullable=True),
            sa.Column("timetable_entry_id", sa.Integer(), sa.ForeignKey("timetable_entries.id", ondelete="SET NULL"), nullable=True),
            sa.Column("teacher_user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("standard_id", sa.Integer(), sa.ForeignKey("standards.id", ondelete="CASCADE"), nullable=False),
            sa.Column("division_id", sa.Integer(), sa.ForeignKey("divisions.id", ondelete="SET NULL"), nullable=True),
            sa.Column("subject_id", sa.Integer(), sa.ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False),
            sa.Column("subject_mapping_id", sa.Integer(), sa.ForeignKey("subject_mappings.id", ondelete="SET NULL"), nullable=True),
            sa.Column("title", sa.String(length=255), nullable=False),
            sa.Column("topic", sa.String(length=255), nullable=True),
            sa.Column("board_mode_default", sa.String(length=30), nullable=False, server_default="whiteboard"),
            sa.Column("status", sa.String(length=30), nullable=False, server_default="draft"),
            sa.Column("is_template", sa.Boolean(), nullable=False, server_default="false"),
            sa.Column("template_category", sa.String(length=60), nullable=True),
            sa.Column("collaboration_enabled", sa.Boolean(), nullable=False, server_default="false"),
            sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("published_by_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
            sa.Column("latest_revision_no", sa.Integer(), nullable=False, server_default="1"),
            sa.Column("page_count", sa.Integer(), nullable=False, server_default="1"),
            sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default="false"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )
        op.create_index("ix_edu_boards_id", "edu_boards", ["id"])
        op.create_index("ix_edu_boards_board_code", "edu_boards", ["board_code"], unique=True)
        op.create_index("ix_eduboard_inst_env", "edu_boards", ["institution_id", "is_demo"])
        op.create_index("ix_eduboard_ay_div", "edu_boards", ["academic_year_id", "division_id"])
        op.create_index("ix_eduboard_teacher", "edu_boards", ["teacher_user_id"])
        op.create_index("ix_eduboard_session", "edu_boards", ["teaching_session_id"])
        op.create_index("ix_eduboard_status", "edu_boards", ["status"])

    # 2. edu_board_attachments (created before edu_board_pages so source_attachment_id FK resolves)
    if not _table_exists(inspector, "edu_board_attachments"):
        op.create_table(
            "edu_board_attachments",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("institution_id", sa.Integer(), sa.ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, server_default="1"),
            sa.Column("is_demo", sa.Boolean(), nullable=False, server_default="false"),
            sa.Column("board_id", sa.Integer(), sa.ForeignKey("edu_boards.id", ondelete="CASCADE"), nullable=True),
            sa.Column("uploader_user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
            sa.Column("attachment_role", sa.String(length=40), nullable=False, server_default="source_document"),
            sa.Column("original_filename", sa.String(length=255), nullable=False),
            sa.Column("stored_filename", sa.String(length=255), nullable=False),
            sa.Column("storage_path", sa.String(length=500), nullable=False),
            sa.Column("mime_type", sa.String(length=150), nullable=False),
            sa.Column("extension", sa.String(length=20), nullable=False),
            sa.Column("file_size_bytes", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("sha256_checksum", sa.String(length=64), nullable=True),
            sa.Column("page_count", sa.Integer(), nullable=True),
            sa.Column("is_immutable", sa.Boolean(), nullable=False, server_default="true"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )
        op.create_index("ix_edu_board_attachments_id", "edu_board_attachments", ["id"])
        op.create_index("ix_eb_att_inst_env", "edu_board_attachments", ["institution_id", "is_demo"])
        op.create_index("ix_eb_att_board", "edu_board_attachments", ["board_id"])

    # 3. edu_board_pages
    if not _table_exists(inspector, "edu_board_pages"):
        op.create_table(
            "edu_board_pages",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("board_id", sa.Integer(), sa.ForeignKey("edu_boards.id", ondelete="CASCADE"), nullable=False),
            sa.Column("page_uid", sa.String(length=64), nullable=False),
            sa.Column("page_order", sa.Integer(), nullable=False, server_default="1"),
            sa.Column("title", sa.String(length=150), nullable=False, server_default="Page 1"),
            sa.Column("mode", sa.String(length=30), nullable=False, server_default="whiteboard"),
            sa.Column("background_style", sa.String(length=30), nullable=False, server_default="white"),
            sa.Column("source_attachment_id", sa.Integer(), sa.ForeignKey("edu_board_attachments.id", ondelete="SET NULL"), nullable=True),
            sa.Column("source_page_number", sa.Integer(), nullable=True),
            sa.Column("scene_json", sa.Text(), nullable=False, server_default='{"schemaVersion":1,"elements":[]}'),
            sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.UniqueConstraint("board_id", "page_uid", name="uq_eduboard_page_uid"),
        )
        op.create_index("ix_edu_board_pages_id", "edu_board_pages", ["id"])
        op.create_index("ix_eduboard_pages_board_order", "edu_board_pages", ["board_id", "page_order"])

    # 4. edu_board_revisions
    if not _table_exists(inspector, "edu_board_revisions"):
        op.create_table(
            "edu_board_revisions",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("board_id", sa.Integer(), sa.ForeignKey("edu_boards.id", ondelete="CASCADE"), nullable=False),
            sa.Column("revision_no", sa.Integer(), nullable=False),
            sa.Column("save_type", sa.String(length=30), nullable=False, server_default="manual"),
            sa.Column("created_by_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
            sa.Column("snapshot_json", sa.Text(), nullable=False),
            sa.Column("note", sa.String(length=255), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.UniqueConstraint("board_id", "revision_no", name="uq_eduboard_revision_no"),
        )
        op.create_index("ix_edu_board_revisions_id", "edu_board_revisions", ["id"])
        op.create_index("ix_eduboard_rev_board_created", "edu_board_revisions", ["board_id", "created_at"])

    # 5. Seed granular `eduboard` permissions across roles
    role_actions = {
        "superadmin": ["view", "create", "edit", "delete", "publish", "download", "manage_templates", "collaborate"],
        "sysadmin": ["view", "create", "edit", "delete", "publish", "download", "manage_templates", "collaborate"],
        "admin": ["view", "create", "edit", "delete", "publish", "download", "manage_templates", "collaborate"],
        "principal": ["view", "create", "edit", "delete", "publish", "download", "manage_templates", "collaborate"],
        "coordinator": ["view", "create", "edit", "publish", "download", "manage_templates", "collaborate"],
        "teacher": ["view", "create", "edit", "publish", "download", "manage_templates", "collaborate"],
        "staff": ["view", "download"],
        "student": ["view", "download"],
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
                        "SELECT 1 FROM permissions WHERE role_id = :rid AND resource = 'eduboard' AND action = :act LIMIT 1"
                    ),
                    {"rid": role_id, "act": action},
                ).first()
                if not exists:
                    conn.execute(
                        sa.text(
                            "INSERT INTO permissions (role_id, resource, action) VALUES (:rid, 'eduboard', :act)"
                        ),
                        {"rid": role_id, "act": action},
                    )


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    if _table_exists(inspector, "permissions"):
        conn.execute(sa.text("DELETE FROM permissions WHERE resource = 'eduboard'"))
    for tbl in ("edu_board_revisions", "edu_board_pages", "edu_board_attachments", "edu_boards"):
        if _table_exists(inspector, tbl):
            op.drop_table(tbl)

