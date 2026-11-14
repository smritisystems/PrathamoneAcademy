# /**
#  * @file        048_report_book_publishing.py
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
#  * @created     2026-11-14
#  * @updated     2026-11-14
#  *
#  * @description Adds tenant-scoped reusable report-book templates and immutable generation audit snapshots.
#  */

"""add tenant-scoped report book templates and generation snapshots

Revision ID: 048_report_book_publishing
Revises: 047_official_brand_colors
Create Date: 2026-11-14
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "048_report_book_publishing"
down_revision: Union[str, None] = "047_official_brand_colors"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "report_book_templates",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("institution_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("configuration_json", sa.Text(), nullable=False),
        sa.Column("created_by_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["created_by_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["institution_id"], ["institutions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("institution_id", "name", name="uq_report_book_template_institution_name"),
    )
    op.create_index("ix_report_book_templates_institution_id", "report_book_templates", ["institution_id"])

    op.create_table(
        "report_book_generations",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("document_id", sa.String(length=36), nullable=False),
        sa.Column("institution_id", sa.Integer(), nullable=False),
        sa.Column("generated_by_id", sa.Integer(), nullable=True),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("snapshot_json", sa.Text(), nullable=False),
        sa.Column("generated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["generated_by_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["institution_id"], ["institutions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("document_id"),
    )
    op.create_index("ix_report_book_generations_document_id", "report_book_generations", ["document_id"])
    op.create_index("ix_report_book_generations_institution_id", "report_book_generations", ["institution_id"])
    op.create_index("ix_report_book_generations_generated_at", "report_book_generations", ["generated_at"])

    op.create_table(
        "report_book_generation_events",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("generation_id", sa.Integer(), nullable=False),
        sa.Column("institution_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("action", sa.String(length=20), nullable=False),
        sa.Column("occurred_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["generation_id"], ["report_book_generations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["institution_id"], ["institutions.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_report_book_generation_events_generation_id", "report_book_generation_events", ["generation_id"])
    op.create_index("ix_report_book_generation_events_institution_id", "report_book_generation_events", ["institution_id"])
    op.create_index("ix_report_book_generation_events_occurred_at", "report_book_generation_events", ["occurred_at"])


def downgrade() -> None:
    op.drop_index("ix_report_book_generation_events_occurred_at", table_name="report_book_generation_events")
    op.drop_index("ix_report_book_generation_events_institution_id", table_name="report_book_generation_events")
    op.drop_index("ix_report_book_generation_events_generation_id", table_name="report_book_generation_events")
    op.drop_table("report_book_generation_events")
    op.drop_index("ix_report_book_generations_generated_at", table_name="report_book_generations")
    op.drop_index("ix_report_book_generations_institution_id", table_name="report_book_generations")
    op.drop_index("ix_report_book_generations_document_id", table_name="report_book_generations")
    op.drop_table("report_book_generations")
    op.drop_index("ix_report_book_templates_institution_id", table_name="report_book_templates")
    op.drop_table("report_book_templates")
