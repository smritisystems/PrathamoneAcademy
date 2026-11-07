# /**
#  * @file        028_global_training_environment.py
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
#  * @created     2026-11-07
#  * @updated     2026-11-07
#  *
#  * @description Database migration creating dedicated Training Tenant, demo metadata columns across core domain entities, training configuration, active sessions, and reset audit logs.
#  */

"""Global Training and Demo Environment Migration

Revision ID: 028_global_training_environment
Revises: 027_crm_ssot_consolidation
Create Date: 2026-11-07 19:40:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector

revision = "028_global_training_environment"
down_revision = "027_crm_ssot_consolidation"
branch_labels = None
depends_on = None

DEMO_METADATA_TABLES = [
    "leads",
    "lead_follow_ups",
    "lead_demo_classes",
    "students",
    "guardians",
    "student_enrollments",
    "payments",
    "payment_receipts",
    "fee_invoices",
    "attendances",
    "exam_marks",
    "communication_logs",
]


def upgrade():
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    existing_tables = inspector.get_table_names()

    # 1. Ensure isolated Training Tenant exists in institutions
    if "institutions" in existing_tables:
        op.execute(sa.text("""
            INSERT INTO institutions (
                name, code, short_name, tagline, institute_type,
                establishment_year, registration_number, tax_id, description,
                primary_color, secondary_color, accent_color, favicon_url, timezone, default_language, is_active, created_at, updated_at
            )
            SELECT
                'Prashant Academy (Training & Demo Environment)', 'PA001-DEMO', 'PA-DEMO',
                'Staff Training • Sample Data • Isolated Environment', 'Coaching Institute (Training)',
                2026, 'MH-TRAIN-2026-0001', 'DEMO12345T',
                'Dedicated training and simulation tenant for staff practice and workflow verification.',
                '#D97706', '#F59E0B', '#B45309', '/favicon.svg', 'Asia/Kolkata', 'en', true, NOW(), NOW()
            WHERE NOT EXISTS (
                SELECT 1 FROM institutions WHERE code = 'PA001-DEMO'
            );
        """))

    # 2. Add demo metadata columns to core entities
    for tbl in DEMO_METADATA_TABLES:
        if tbl in existing_tables:
            cols = [c["name"] for c in inspector.get_columns(tbl)]

            if "is_demo" not in cols:
                op.add_column(
                    tbl,
                    sa.Column("is_demo", sa.Boolean(), server_default=sa.text("false"), nullable=False),
                )
                op.create_index(f"ix_{tbl}_is_demo", tbl, ["is_demo"], unique=False)

            if "data_environment" not in cols:
                op.add_column(
                    tbl,
                    sa.Column(
                        "data_environment",
                        sa.String(20),
                        server_default=sa.text("'PRODUCTION'"),
                        nullable=False,
                    ),
                )
                op.create_index(f"ix_{tbl}_data_environment", tbl, ["data_environment"], unique=False)

            if "demo_dataset_id" not in cols:
                op.add_column(
                    tbl,
                    sa.Column("demo_dataset_id", sa.String(100), nullable=True),
                )

    # 3. Create training_environment_configs table
    if "training_environment_configs" not in existing_tables:
        op.create_table(
            "training_environment_configs",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("institution_id", sa.Integer(), sa.ForeignKey("institutions.id", ondelete="CASCADE"), nullable=True),
            sa.Column("is_enabled", sa.Boolean(), server_default=sa.text("true"), nullable=False),
            sa.Column("reset_policy", sa.String(30), server_default=sa.text("'manual_only'"), nullable=False),
            sa.Column("inactivity_timeout_minutes", sa.Integer(), server_default=sa.text("60"), nullable=False),
            sa.Column("daily_reset_time", sa.String(10), server_default=sa.text("'03:00'"), nullable=False),
            sa.Column("active_dataset_version", sa.String(50), server_default=sa.text("'CRM-STAFF-TRAINING-V1'"), nullable=False),
            sa.Column("last_reset_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("last_reset_by_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
            sa.Column("last_reset_status", sa.String(30), server_default=sa.text("'SUCCESS'"), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )

        op.execute(sa.text("""
            INSERT INTO training_environment_configs (
                is_enabled, reset_policy, inactivity_timeout_minutes, daily_reset_time, active_dataset_version, last_reset_status, created_at, updated_at
            )
            SELECT true, 'manual_only', 60, '03:00', 'CRM-STAFF-TRAINING-V1', 'READY', NOW(), NOW()
            WHERE NOT EXISTS (
                SELECT 1 FROM training_environment_configs
            );
        """))

    # 4. Create training_sessions table
    if "training_sessions" not in existing_tables:
        op.create_table(
            "training_sessions",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
            sa.Column("session_token", sa.String(100), nullable=True),
            sa.Column("started_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("last_active_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        )
        op.create_index("ix_training_sessions_is_active", "training_sessions", ["is_active"], unique=False)

    # 5. Create training_reset_logs table
    if "training_reset_logs" not in existing_tables:
        op.create_table(
            "training_reset_logs",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
            sa.Column("initiated_by", sa.String(100), server_default=sa.text("'admin'"), nullable=False),
            sa.Column("dataset_version", sa.String(50), server_default=sa.text("'CRM-STAFF-TRAINING-V1'"), nullable=False),
            sa.Column("records_cleared", sa.Integer(), server_default=sa.text("0"), nullable=False),
            sa.Column("records_seeded", sa.Integer(), server_default=sa.text("0"), nullable=False),
            sa.Column("duration_ms", sa.Integer(), server_default=sa.text("0"), nullable=False),
            sa.Column("status", sa.String(20), server_default=sa.text("'SUCCESS'"), nullable=False),
            sa.Column("error_message", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )


def downgrade():
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    existing_tables = inspector.get_table_names()

    if "training_reset_logs" in existing_tables:
        op.drop_table("training_reset_logs")

    if "training_sessions" in existing_tables:
        op.drop_table("training_sessions")

    if "training_environment_configs" in existing_tables:
        op.drop_table("training_environment_configs")

    for tbl in DEMO_METADATA_TABLES:
        if tbl in existing_tables:
            cols = [c["name"] for c in inspector.get_columns(tbl)]
            if "demo_dataset_id" in cols:
                op.drop_column(tbl, "demo_dataset_id")
            if "data_environment" in cols:
                op.drop_index(f"ix_{tbl}_data_environment", table_name=tbl)
                op.drop_column(tbl, "data_environment")
            if "is_demo" in cols:
                op.drop_index(f"ix_{tbl}_is_demo", table_name=tbl)
                op.drop_column(tbl, "is_demo")
