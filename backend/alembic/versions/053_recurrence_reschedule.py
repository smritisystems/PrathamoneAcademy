# /**
#  * @file        053_recurrence_reschedule.py
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
#  * @description Adds optional rescheduled start and end timestamps to activity recurrence exceptions.
#  */

"""Add rescheduled start and end timestamps to activity recurrence exceptions.

Revision ID: 053_recurrence_reschedule
Revises: 052_timetable_teacher_reference
Create Date: 2026-11-17
"""

from alembic import op
import sqlalchemy as sa


revision = "053_recurrence_reschedule"
down_revision = "052_timetable_teacher_reference"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("activity_recurrence_exceptions")}
    if "rescheduled_start_at" not in columns:
        op.add_column(
            "activity_recurrence_exceptions",
            sa.Column("rescheduled_start_at", sa.DateTime(timezone=True), nullable=True),
        )
    if "rescheduled_end_at" not in columns:
        op.add_column(
            "activity_recurrence_exceptions",
            sa.Column("rescheduled_end_at", sa.DateTime(timezone=True), nullable=True),
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("activity_recurrence_exceptions")}
    if "rescheduled_end_at" in columns:
        op.drop_column("activity_recurrence_exceptions", "rescheduled_end_at")
    if "rescheduled_start_at" in columns:
        op.drop_column("activity_recurrence_exceptions", "rescheduled_start_at")
