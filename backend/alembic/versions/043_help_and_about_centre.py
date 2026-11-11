# /**
#  * @file        043_help_and_about_centre.py
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
#  * @created     2026-11-11
#  * @updated     2026-11-12
#  *
#  * @description Creates Help & About Centre tables for documentation governance, revisions, and customer support requests.
#  */

"""Help and About Centre

Revision ID: 043_help_about_centre
Revises: 042_concession_governance
Create Date: 2026-11-11 21:10:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector

revision = "043_help_about_centre"
down_revision = "042_concession_governance"
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    existing_tables = set(inspector.get_table_names())

    if "help_categories" not in existing_tables:
        op.create_table(
            "help_categories",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("slug", sa.String(length=80), nullable=False),
            sa.Column("name", sa.String(length=120), nullable=False),
            sa.Column("section", sa.String(length=40), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("icon", sa.String(length=50), nullable=True),
            sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_help_categories_slug", "help_categories", ["slug"], unique=True)
        op.create_index("ix_help_categories_section", "help_categories", ["section"])

    if "help_articles" not in existing_tables:
        op.create_table(
            "help_articles",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("slug", sa.String(length=120), nullable=False),
            sa.Column("category_id", sa.Integer(), sa.ForeignKey("help_categories.id", ondelete="SET NULL"), nullable=True),
            sa.Column("section", sa.String(length=40), nullable=False),
            sa.Column("module_key", sa.String(length=60), nullable=True),
            sa.Column("title", sa.String(length=200), nullable=False),
            sa.Column("summary", sa.Text(), nullable=True),
            sa.Column("content_markdown", sa.Text(), nullable=False),
            sa.Column("tags", sa.Text(), nullable=True),
            sa.Column("required_permissions", sa.Text(), nullable=True),
            sa.Column("related_routes", sa.Text(), nullable=True),
            sa.Column("related_slugs", sa.Text(), nullable=True),
            sa.Column("doc_version", sa.String(length=20), nullable=False, server_default="1.0"),
            sa.Column("status", sa.String(length=30), nullable=False, server_default="published"),
            sa.Column("approval_status", sa.String(length=30), nullable=False, server_default="approved"),
            sa.Column("approved_by_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
            sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("is_system", sa.Boolean(), nullable=False, server_default=sa.text("true")),
            sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("created_by_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
            sa.Column("updated_by_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_help_articles_slug", "help_articles", ["slug"], unique=True)
        op.create_index("ix_help_articles_category_id", "help_articles", ["category_id"])
        op.create_index("ix_help_articles_section", "help_articles", ["section"])
        op.create_index("ix_help_articles_module_key", "help_articles", ["module_key"])
        op.create_index("ix_help_articles_status", "help_articles", ["status"])
        op.create_index("ix_help_articles_approval_status", "help_articles", ["approval_status"])

    if "help_article_revisions" not in existing_tables:
        op.create_table(
            "help_article_revisions",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("article_id", sa.Integer(), sa.ForeignKey("help_articles.id", ondelete="CASCADE"), nullable=False),
            sa.Column("doc_version", sa.String(length=20), nullable=False),
            sa.Column("title", sa.String(length=200), nullable=False),
            sa.Column("summary", sa.Text(), nullable=True),
            sa.Column("content_markdown", sa.Text(), nullable=False),
            sa.Column("status", sa.String(length=30), nullable=False),
            sa.Column("approval_status", sa.String(length=30), nullable=False),
            sa.Column("change_note", sa.Text(), nullable=True),
            sa.Column("changed_by_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
            sa.Column("changed_by_name", sa.String(length=120), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_help_article_revisions_article_id", "help_article_revisions", ["article_id"])

    if "support_requests" not in existing_tables:
        op.create_table(
            "support_requests",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("ticket_number", sa.String(length=40), nullable=False),
            sa.Column("institution_id", sa.Integer(), sa.ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("request_type", sa.String(length=30), nullable=False, server_default="support_request"),
            sa.Column("category", sa.String(length=50), nullable=False, server_default="general"),
            sa.Column("priority", sa.String(length=20), nullable=False, server_default="medium"),
            sa.Column("subject", sa.String(length=200), nullable=False),
            sa.Column("description", sa.Text(), nullable=False),
            sa.Column("module_key", sa.String(length=60), nullable=True),
            sa.Column("page_route", sa.String(length=200), nullable=True),
            sa.Column("error_reference_id", sa.String(length=50), nullable=True),
            sa.Column("contact_email", sa.String(length=200), nullable=True),
            sa.Column("contact_phone", sa.String(length=40), nullable=True),
            sa.Column("status", sa.String(length=30), nullable=False, server_default="open"),
            sa.Column("resolution_notes", sa.Text(), nullable=True),
            sa.Column("assigned_to_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
            sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_support_requests_ticket_number", "support_requests", ["ticket_number"], unique=True)
        op.create_index("ix_support_requests_institution_id", "support_requests", ["institution_id"])
        op.create_index("ix_support_requests_user_id", "support_requests", ["user_id"])
        op.create_index("ix_support_requests_request_type", "support_requests", ["request_type"])
        op.create_index("ix_support_requests_category", "support_requests", ["category"])
        op.create_index("ix_support_requests_status", "support_requests", ["status"])
        op.create_index("ix_support_requests_created_at", "support_requests", ["created_at"])

    if "support_request_comments" not in existing_tables:
        op.create_table(
            "support_request_comments",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("request_id", sa.Integer(), sa.ForeignKey("support_requests.id", ondelete="CASCADE"), nullable=False),
            sa.Column("author_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
            sa.Column("author_name", sa.String(length=120), nullable=False),
            sa.Column("author_role", sa.String(length=40), nullable=False, server_default="staff"),
            sa.Column("message", sa.Text(), nullable=False),
            sa.Column("is_internal_note", sa.Boolean(), nullable=False, server_default=sa.text("false")),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_support_request_comments_request_id", "support_request_comments", ["request_id"])


def downgrade():
    op.drop_table("support_request_comments")
    op.drop_table("support_requests")
    op.drop_table("help_article_revisions")
    op.drop_table("help_articles")
    op.drop_table("help_categories")
