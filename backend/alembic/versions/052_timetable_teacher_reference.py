# /**
#  * @file        052_timetable_teacher_reference.py
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
#  * @created     2026-11-17
#  * @updated     2026-11-17
#  *
#  * @description Ensures the nullable canonical user reference already defined by the timetable model.
#  */

"""Add the canonical teacher reference to timetable entries.

Revision ID: 052_timetable_teacher_reference
Revises: 051_unified_planning_activities
Create Date: 2026-11-17
"""

from alembic import op
import sqlalchemy as sa


revision = "052_timetable_teacher_reference"
down_revision = "051_unified_planning_activities"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("timetable_entries")}
    if "teacher_id" not in columns:
        op.add_column(
            "timetable_entries",
            sa.Column(
                "teacher_id",
                sa.Integer(),
                sa.ForeignKey("users.id", ondelete="SET NULL"),
                nullable=True,
            ),
        )
        return

    has_user_reference = any(
        foreign_key.get("constrained_columns") == ["teacher_id"]
        and foreign_key.get("referred_table") == "users"
        and foreign_key.get("referred_columns") == ["id"]
        for foreign_key in inspector.get_foreign_keys("timetable_entries")
    )
    if not has_user_reference:
        op.create_foreign_key(
            "fk_timetable_entries_teacher_id_users",
            "timetable_entries",
            "users",
            ["teacher_id"],
            ["id"],
            ondelete="SET NULL",
        )


def downgrade() -> None:
    # Keep the canonical model field on installations where it predated this migration.
    pass
