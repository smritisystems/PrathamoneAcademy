# /**
#  * @file        011_institute_settings_and_lookups.py
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
#  * @created     2026-11-05
#  * @updated     2026-11-05
#  *
#  * @description Database migration creating institution_settings, lookup_items, setting_audit_logs, and enhancing institution profiles.
#  */

"""Add institute profile fields, settings key-value store, lookup items, and audit logs

Revision ID: 011_settings_lookups
Revises: 010_curriculum_timetable
Create Date: 2026-11-05 01:55:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "011_settings_lookups"
down_revision = "010_curriculum_timetable"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Enhance institutions table with profile & branding fields
    with op.batch_alter_table("institutions") as batch_op:
        batch_op.add_column(sa.Column("short_name", sa.String(50), nullable=True, server_default="PA"))
        batch_op.add_column(sa.Column("tagline", sa.String(255), nullable=True, server_default="Learn • Practice • Achieve"))
        batch_op.add_column(sa.Column("institute_type", sa.String(100), nullable=True, server_default="Coaching Institute"))
        batch_op.add_column(sa.Column("establishment_year", sa.Integer(), nullable=True, server_default="2018"))
        batch_op.add_column(sa.Column("registration_number", sa.String(100), nullable=True, server_default="MH-COACH-2018-0157"))
        batch_op.add_column(sa.Column("tax_id", sa.String(100), nullable=True, server_default="AABCP1234K"))
        batch_op.add_column(sa.Column("description", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("primary_color", sa.String(20), nullable=True, server_default="#1E40AF"))
        batch_op.add_column(sa.Column("secondary_color", sa.String(20), nullable=True, server_default="#3B82F6"))
        batch_op.add_column(sa.Column("accent_color", sa.String(20), nullable=True, server_default="#8B5CF6"))
        batch_op.add_column(sa.Column("favicon_url", sa.String(500), nullable=True, server_default="/favicon.svg"))
        batch_op.add_column(sa.Column("timezone", sa.String(50), nullable=True, server_default="Asia/Kolkata"))
        batch_op.add_column(sa.Column("default_language", sa.String(20), nullable=True, server_default="en"))

    # Update existing institution (ID 1) with complete profile defaults
    op.execute("""
        UPDATE institutions
        SET short_name = 'PA',
            tagline = 'Learn • Practice • Achieve',
            institute_type = 'Coaching Institute',
            establishment_year = 2018,
            registration_number = 'MH-COACH-2018-0157',
            tax_id = 'AABCP1234K',
            description = 'A comprehensive coaching academy for school & competitive examinations, focused on concept clarity and student success.',
            primary_color = '#1E40AF',
            secondary_color = '#3B82F6',
            accent_color = '#8B5CF6',
            favicon_url = '/favicon.svg',
            timezone = 'Asia/Kolkata',
            default_language = 'en'
        WHERE id = 1;
    """)

    # 2. Create institution_settings table
    op.create_table(
        "institution_settings",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("institution_id", sa.Integer(), sa.ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("category", sa.String(50), nullable=False, index=True),
        sa.Column("key", sa.String(100), nullable=False, index=True),
        sa.Column("value", sa.Text(), nullable=True),
        sa.Column("data_type", sa.String(20), nullable=False, server_default="string"),
        sa.Column("is_secret", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("scope", sa.String(20), nullable=False, server_default="institute"),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("updated_by_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
        sa.UniqueConstraint("institution_id", "key", name="uq_institution_setting_key"),
    )

    # 3. Create lookup_items table
    op.create_table(
        "lookup_items",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("institution_id", sa.Integer(), sa.ForeignKey("institutions.id", ondelete="CASCADE"), nullable=True, index=True),
        sa.Column("category", sa.String(50), nullable=False, index=True),
        sa.Column("code", sa.String(50), nullable=False, index=True),
        sa.Column("label", sa.String(100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("is_system", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("meta_data", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )
    op.create_index("ix_lookup_items_cat_code", "lookup_items", ["institution_id", "category", "code"], unique=True)

    # 4. Create setting_audit_logs table
    op.create_table(
        "setting_audit_logs",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("institution_id", sa.Integer(), sa.ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("setting_key", sa.String(100), nullable=False, index=True),
        sa.Column("category", sa.String(50), nullable=True),
        sa.Column("previous_value", sa.Text(), nullable=True),
        sa.Column("new_value", sa.Text(), nullable=True),
        sa.Column("changed_by_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("changed_by_name", sa.String(100), nullable=True),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("setting_audit_logs")
    op.drop_index("ix_lookup_items_cat_code", table_name="lookup_items")
    op.drop_table("lookup_items")
    op.drop_table("institution_settings")
    with op.batch_alter_table("institutions") as batch_op:
        batch_op.drop_column("default_language")
        batch_op.drop_column("timezone")
        batch_op.drop_column("favicon_url")
        batch_op.drop_column("accent_color")
        batch_op.drop_column("secondary_color")
        batch_op.drop_column("primary_color")
        batch_op.drop_column("description")
        batch_op.drop_column("tax_id")
        batch_op.drop_column("registration_number")
        batch_op.drop_column("establishment_year")
        batch_op.drop_column("institute_type")
        batch_op.drop_column("tagline")
        batch_op.drop_column("short_name")

