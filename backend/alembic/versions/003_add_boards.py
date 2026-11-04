# /**
#  * @file        003_add_boards.py
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
#  * @description Database migration introducing boards table and linking educational boards to standards.
#  */

"""Add boards table and board_id to divisions

Revision ID: 003_add_boards
Revises: 002_fee_register_imports
Create Date: 2026-11-04 01:15:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "003_add_boards"
down_revision = "002_fee_register_imports"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Create boards table
    op.create_table(
        "boards",
        sa.Column("id", sa.Integer, primary_key=True, index=True),
        sa.Column("institution_id", sa.Integer, sa.ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(50), nullable=False),
        sa.Column("code", sa.String(20), nullable=False),
        sa.Column("description", sa.String(200), nullable=True),
        sa.Column("is_active", sa.Boolean, default=True, nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )

    # 2. Add board_id to divisions
    op.add_column(
        "divisions",
        sa.Column("board_id", sa.Integer, sa.ForeignKey("boards.id", ondelete="SET NULL"), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("divisions", "board_id")
    op.drop_table("boards")

