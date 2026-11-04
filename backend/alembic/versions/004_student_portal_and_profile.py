# /**
#  * @file        004_student_portal_and_profile.py
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
#  * @description Database migration extending student profile fields and student portal credentials.
#  */

"""Add student portal and profile tables

Revision ID: 004_student_portal_and_profile
Revises: 003_add_boards
Create Date: 2026-11-04 01:30:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "004_student_portal_and_profile"
down_revision = "003_add_boards"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Add student_id to users
    op.add_column(
        "users",
        sa.Column("student_id", sa.Integer, sa.ForeignKey("students.id", ondelete="SET NULL"), nullable=True),
    )

    # 2. Create timetable_entries
    op.create_table(
        "timetable_entries",
        sa.Column("id", sa.Integer, primary_key=True, index=True),
        sa.Column("division_id", sa.Integer, sa.ForeignKey("divisions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("subject_id", sa.Integer, sa.ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("day_of_week", sa.String(15), nullable=False),
        sa.Column("start_time", sa.String(10), nullable=False),
        sa.Column("end_time", sa.String(10), nullable=False),
        sa.Column("room_number", sa.String(20), nullable=True),
        sa.Column("is_active", sa.Boolean, default=True, nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )

    # 3. Create study_materials
    op.create_table(
        "study_materials",
        sa.Column("id", sa.Integer, primary_key=True, index=True),
        sa.Column("institution_id", sa.Integer, sa.ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("standard_id", sa.Integer, sa.ForeignKey("standards.id", ondelete="CASCADE"), nullable=False),
        sa.Column("subject_id", sa.Integer, sa.ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("division_id", sa.Integer, sa.ForeignKey("divisions.id", ondelete="SET NULL"), nullable=True),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("file_type", sa.String(20), nullable=False, default="PDF"),
        sa.Column("file_url", sa.String(500), nullable=False),
        sa.Column("file_size_bytes", sa.Integer, default=0, nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )

    # 4. Create announcements
    op.create_table(
        "announcements",
        sa.Column("id", sa.Integer, primary_key=True, index=True),
        sa.Column("institution_id", sa.Integer, sa.ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("standard_id", sa.Integer, sa.ForeignKey("standards.id", ondelete="SET NULL"), nullable=True),
        sa.Column("division_id", sa.Integer, sa.ForeignKey("divisions.id", ondelete="SET NULL"), nullable=True),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("content", sa.Text, nullable=False),
        sa.Column("category", sa.String(50), default="notice", nullable=False),
        sa.Column("is_pinned", sa.Boolean, default=False, nullable=False),
        sa.Column("publish_date", sa.Date, nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )

    # 5. Create student_documents
    op.create_table(
        "student_documents",
        sa.Column("id", sa.Integer, primary_key=True, index=True),
        sa.Column("student_id", sa.Integer, sa.ForeignKey("students.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("document_type", sa.String(50), nullable=False),
        sa.Column("file_url", sa.String(500), nullable=False),
        sa.Column("status", sa.String(20), default="verified", nullable=False),
        sa.Column(
            "uploaded_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_table("student_documents")
    op.drop_table("announcements")
    op.drop_table("study_materials")
    op.drop_table("timetable_entries")
    op.drop_column("users", "student_id")

