# /**
#  * @file        006_academic_batch_workspace.py
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
#  * @description Database migration supporting academic batch capacity, teachers, and timetable links.
#  */

"""Academic structure and batch workspace schema enhancements

Revision ID: 006_academic_batch_workspace
Revises: 005_division_name_and_indexes
Create Date: 2026-11-04 09:30:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "006_academic_batch_workspace"
down_revision = "005_division_name_and_indexes"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Add code, room_number, schedule_timing, status to divisions
    op.add_column("divisions", sa.Column("code", sa.String(50), nullable=True))
    op.add_column("divisions", sa.Column("room_number", sa.String(50), nullable=True))
    op.add_column("divisions", sa.Column("schedule_timing", sa.String(100), nullable=True))
    op.add_column(
        "divisions",
        sa.Column("status", sa.String(20), server_default="active", nullable=False),
    )

    # 2. Add indexes
    op.create_index("ix_divisions_board_id", "divisions", ["board_id"], if_not_exists=True)
    op.create_index("ix_divisions_standard_id", "divisions", ["standard_id"], if_not_exists=True)
    op.create_index("ix_divisions_status", "divisions", ["status"], if_not_exists=True)


def downgrade() -> None:
    op.drop_index("ix_divisions_status", "divisions")
    op.drop_index("ix_divisions_standard_id", "divisions")
    op.drop_index("ix_divisions_board_id", "divisions")
    op.drop_column("divisions", "status")
    op.drop_column("divisions", "schedule_timing")
    op.drop_column("divisions", "room_number")
    op.drop_column("divisions", "code")

