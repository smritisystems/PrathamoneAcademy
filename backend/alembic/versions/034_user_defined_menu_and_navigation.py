# /**
#  * @file        034_user_defined_menu_and_navigation.py
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
#  * @created     2026-11-10
#  * @updated     2026-11-10
#  *
#  * @description Alembic migration creating user_navigation_preferences and user_navigation_activities tables.
#  */

"""User-Defined Menu & Intelligent Adaptive Navigation Engine tables

Revision ID: 034_navigation_engine
Revises: 033_financial_integrity
Create Date: 2026-11-10 02:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector

revision = "034_navigation_engine"
down_revision = "033_financial_integrity"
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    existing_tables = set(inspector.get_table_names())

    # 1. Create user_navigation_preferences table
    if "user_navigation_preferences" not in existing_tables:
        op.create_table(
            "user_navigation_preferences",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
            sa.Column("institution_id", sa.Integer(), sa.ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True),
            sa.Column("navigation_mode", sa.String(length=20), nullable=False, server_default="standard"),
            sa.Column("pinned_items", sa.Text(), nullable=False, server_default="[]"),
            sa.Column("hidden_items", sa.Text(), nullable=False, server_default="[]"),
            sa.Column("custom_groups", sa.Text(), nullable=False, server_default="[]"),
            sa.Column("item_order", sa.Text(), nullable=False, server_default="[]"),
            sa.Column("dismissed_suggestions", sa.Text(), nullable=False, server_default="[]"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
            sa.UniqueConstraint("user_id", "institution_id", name="uq_user_inst_nav_preference"),
        )

    # 2. Create user_navigation_activities table
    if "user_navigation_activities" not in existing_tables:
        op.create_table(
            "user_navigation_activities",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
            sa.Column("institution_id", sa.Integer(), sa.ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True),
            sa.Column("module_key", sa.String(length=50), nullable=False, index=True),
            sa.Column("route_path", sa.String(length=200), nullable=False),
            sa.Column("label", sa.String(length=100), nullable=True),
            sa.Column("accessed_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False, index=True),
        )
        op.create_index(
            "ix_nav_activity_user_time",
            "user_navigation_activities",
            ["user_id", "institution_id", "accessed_at"],
        )


def downgrade():
    op.drop_table("user_navigation_activities")
    op.drop_table("user_navigation_preferences")
