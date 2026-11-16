# /**
#  * @file        050_chat_and_doubt_engine.py
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
#  * @updated     2026-11-16
#  *
#  * @description Alembic migration creating chat_rooms, chat_participants, chat_messages,
#  */

"""create chat and academic doubt resolution engine tables

Revision ID: 050_chat_and_doubt_engine
Revises: 049_report_book_permissions
Create Date: 2026-11-16
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import text

revision: str = "050_chat_and_doubt_engine"
down_revision: Union[str, None] = "049_report_book_permissions"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create chat_rooms table
    op.create_table(
        "chat_rooms",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("institution_id", sa.Integer(), nullable=False),
        sa.Column("room_type", sa.String(length=30), nullable=False),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.Column("code", sa.String(length=100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("academic_year_id", sa.Integer(), nullable=True),
        sa.Column("standard_id", sa.Integer(), nullable=True),
        sa.Column("division_id", sa.Integer(), nullable=True),
        sa.Column("subject_id", sa.Integer(), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("is_curfew_enabled", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("curfew_start_time", sa.String(length=10), server_default="20:30", nullable=True),
        sa.Column("curfew_end_time", sa.String(length=10), server_default="08:00", nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["institution_id"], ["institutions.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["academic_year_id"], ["academic_years.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["standard_id"], ["standards.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["division_id"], ["divisions.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["subject_id"], ["subjects.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code", name="uq_chat_room_code"),
    )
    op.create_index("ix_chat_rooms_inst_type", "chat_rooms", ["institution_id", "room_type"])
    op.create_index("ix_chat_rooms_division", "chat_rooms", ["division_id"])

    # 2. Create chat_participants table
    op.create_table(
        "chat_participants",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("room_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("student_id", sa.Integer(), nullable=True),
        sa.Column("role_in_room", sa.String(length=30), server_default="MEMBER", nullable=False),
        sa.Column("is_muted", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("last_read_message_id", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("joined_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["room_id"], ["chat_rooms.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["student_id"], ["students.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("room_id", "user_id", name="uq_chat_participant_user"),
        sa.UniqueConstraint("room_id", "student_id", name="uq_chat_participant_student"),
    )
    op.create_index("ix_chat_participants_room", "chat_participants", ["room_id"])
    op.create_index("ix_chat_participants_user", "chat_participants", ["user_id"])
    op.create_index("ix_chat_participants_student", "chat_participants", ["student_id"])

    # 3. Create chat_messages table
    op.create_table(
        "chat_messages",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("room_id", sa.Integer(), nullable=False),
        sa.Column("sender_user_id", sa.Integer(), nullable=True),
        sa.Column("sender_student_id", sa.Integer(), nullable=True),
        sa.Column("sender_display_name", sa.String(length=120), nullable=False),
        sa.Column("sender_role", sa.String(length=30), nullable=False),
        sa.Column("message_type", sa.String(length=30), server_default="TEXT", nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("attachment_url", sa.String(length=500), nullable=True),
        sa.Column("attachment_type", sa.String(length=50), nullable=True),
        sa.Column("is_doubt_resolved", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("resolved_by_user_id", sa.Integer(), nullable=True),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_quarantined", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("quarantine_reason", sa.String(length=255), nullable=True),
        sa.Column("is_deleted", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["room_id"], ["chat_rooms.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["sender_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["sender_student_id"], ["students.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["resolved_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_chat_messages_room_created", "chat_messages", ["room_id", "created_at"])
    op.create_index("ix_chat_messages_sender_user", "chat_messages", ["sender_user_id"])
    op.create_index("ix_chat_messages_sender_student", "chat_messages", ["sender_student_id"])

    # 4. Seed default staff channels for existing institution (id=1)
    bind = op.get_bind()
    bind.execute(
        text("""
        INSERT INTO chat_rooms (institution_id, room_type, name, code, description, is_active, is_curfew_enabled)
        VALUES
            (1, 'STAFF_GENERAL', 'Staff General', 'staff_general', 'All-staff general communication and notices', true, false),
            (1, 'STAFF_DEPT', 'Faculty Room', 'faculty_room', 'Academic faculty syllabus, lectures, and test prep', true, false),
            (1, 'STAFF_DEPT', 'Accounts & Fees Desk', 'accounts_desk', 'Fee collections, concessions, and reconciliations', true, false),
            (1, 'STAFF_DEPT', 'Reception & Admissions Desk', 'reception_desk', 'Walk-in inquiries, parent visits, and student pickups', true, false)
        ON CONFLICT (code) DO NOTHING;
        """)
    )


def downgrade() -> None:
    op.drop_table("chat_messages")
    op.drop_table("chat_participants")
    op.drop_table("chat_rooms")
