# /**
#  * @file        022_codex_engine.py
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
#  * @description Alembic migration creating CodeX configurable feature activation and numeric coding engine tables.
#  */

"""CodeX Configurable Feature Activation & Numeric Coding Engine

Revision ID: 022_codex_engine
Revises: 021_workforce_lifecycle
Create Date: 2026-11-07 00:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector

revision = "022_codex_engine"
down_revision = "021_workforce_lifecycle"
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    existing_tables = set(inspector.get_table_names())

    # 1. codex_configs
    if "codex_configs" not in existing_tables:
        op.create_table(
            "codex_configs",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("institution_id", sa.Integer(), sa.ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, unique=True, index=True),
            sa.Column("is_master_enabled", sa.Boolean(), nullable=False, server_default="false"),
            sa.Column("feature_numeric_to_alphabet", sa.Boolean(), nullable=False, server_default="false"),
            sa.Column("feature_alphabet_to_numeric", sa.Boolean(), nullable=False, server_default="false"),
            sa.Column("feature_custom_alphabet_mapping", sa.Boolean(), nullable=False, server_default="false"),
            sa.Column("feature_multiple_mapping_profiles", sa.Boolean(), nullable=False, server_default="false"),
            sa.Column("feature_mapping_version_history", sa.Boolean(), nullable=False, server_default="false"),
            sa.Column("feature_hide_actual_amount", sa.Boolean(), nullable=False, server_default="false"),
            sa.Column("feature_show_actual_amount", sa.Boolean(), nullable=False, server_default="true"),
            sa.Column("feature_show_both", sa.Boolean(), nullable=False, server_default="false"),
            sa.Column("feature_qr_generation", sa.Boolean(), nullable=False, server_default="false"),
            sa.Column("feature_mobile_decoder", sa.Boolean(), nullable=False, server_default="false"),
            sa.Column("feature_offline_decoder", sa.Boolean(), nullable=False, server_default="false"),
            sa.Column("feature_copy_share_code", sa.Boolean(), nullable=False, server_default="false"),
            sa.Column("feature_expiry_codes", sa.Boolean(), nullable=False, server_default="false"),
            sa.Column("feature_pin_protected_decoding", sa.Boolean(), nullable=False, server_default="false"),
            sa.Column("app_selling_price", sa.Boolean(), nullable=False, server_default="false"),
            sa.Column("app_purchase_cost", sa.Boolean(), nullable=False, server_default="false"),
            sa.Column("app_salary_payroll", sa.Boolean(), nullable=False, server_default="false"),
            sa.Column("app_commission", sa.Boolean(), nullable=False, server_default="false"),
            sa.Column("app_discounts", sa.Boolean(), nullable=False, server_default="false"),
            sa.Column("app_customer_specific_values", sa.Boolean(), nullable=False, server_default="false"),
            sa.Column("app_internal_reference_values", sa.Boolean(), nullable=False, server_default="false"),
            sa.Column("app_fee_structures", sa.Boolean(), nullable=False, server_default="false"),
            sa.Column("security_pin_hash", sa.String(255), nullable=True),
            sa.Column("decoder_expiry_seconds", sa.Integer(), nullable=False, server_default="300"),
            sa.Column("max_decoding_attempts", sa.Integer(), nullable=False, server_default="5"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_by_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        )

    # 2. codex_mapping_profiles
    if "codex_mapping_profiles" not in existing_tables:
        op.create_table(
            "codex_mapping_profiles",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("institution_id", sa.Integer(), sa.ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True),
            sa.Column("profile_code", sa.String(50), nullable=False, index=True),
            sa.Column("name", sa.String(100), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
            sa.Column("digit_map", sa.Text(), nullable=False),
            sa.Column("decimal_symbol", sa.String(5), nullable=False, server_default="."),
            sa.Column("negative_symbol", sa.String(5), nullable=False, server_default="-"),
            sa.Column("prefix", sa.String(20), nullable=False, server_default="CX-"),
            sa.Column("suffix", sa.String(20), nullable=False, server_default=""),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
            sa.Column("is_default", sa.Boolean(), nullable=False, server_default="false"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("created_by_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        )

    # 3. codex_mapping_versions
    if "codex_mapping_versions" not in existing_tables:
        op.create_table(
            "codex_mapping_versions",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("profile_id", sa.Integer(), sa.ForeignKey("codex_mapping_profiles.id", ondelete="CASCADE"), nullable=False, index=True),
            sa.Column("version", sa.Integer(), nullable=False),
            sa.Column("digit_map", sa.Text(), nullable=False),
            sa.Column("decimal_symbol", sa.String(5), nullable=False),
            sa.Column("negative_symbol", sa.String(5), nullable=False),
            sa.Column("prefix", sa.String(20), nullable=False),
            sa.Column("suffix", sa.String(20), nullable=False),
            sa.Column("change_reason", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("created_by_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        )

    # 4. codex_scope_assignments
    if "codex_scope_assignments" not in existing_tables:
        op.create_table(
            "codex_scope_assignments",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("institution_id", sa.Integer(), sa.ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True),
            sa.Column("scope_type", sa.String(30), nullable=False, index=True),
            sa.Column("scope_target", sa.String(100), nullable=False, index=True),
            sa.Column("visibility_mode", sa.String(30), nullable=False, server_default="actual_only"),
            sa.Column("allowed_modules", sa.Text(), nullable=False, server_default="[]"),
            sa.Column("can_decode", sa.Boolean(), nullable=False, server_default="false"),
            sa.Column("can_generate_qr", sa.Boolean(), nullable=False, server_default="false"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )

    # 5. codex_audit_logs
    if "codex_audit_logs" not in existing_tables:
        op.create_table(
            "codex_audit_logs",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("institution_id", sa.Integer(), sa.ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True),
            sa.Column("user_name", sa.String(100), nullable=True),
            sa.Column("action", sa.String(50), nullable=False, index=True),
            sa.Column("entity_type", sa.String(50), nullable=False),
            sa.Column("entity_id", sa.String(50), nullable=True),
            sa.Column("details", sa.Text(), nullable=True),
            sa.Column("ip_address", sa.String(50), nullable=True),
            sa.Column("user_agent", sa.String(255), nullable=True),
            sa.Column("status", sa.String(20), nullable=False, server_default="success"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )

    # 6. codex_temporary_tokens
    if "codex_temporary_tokens" not in existing_tables:
        op.create_table(
            "codex_temporary_tokens",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("institution_id", sa.Integer(), sa.ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True),
            sa.Column("token", sa.String(64), nullable=False, unique=True, index=True),
            sa.Column("encoded_payload", sa.Text(), nullable=False),
            sa.Column("actual_value_hash", sa.String(64), nullable=True),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("requires_pin", sa.Boolean(), nullable=False, server_default="false"),
            sa.Column("is_used", sa.Boolean(), nullable=False, server_default="false"),
            sa.Column("created_by_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )


def downgrade():
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    existing_tables = set(inspector.get_table_names())

    for tbl in [
        "codex_temporary_tokens",
        "codex_audit_logs",
        "codex_scope_assignments",
        "codex_mapping_versions",
        "codex_mapping_profiles",
        "codex_configs",
    ]:
        if tbl in existing_tables:
            op.drop_table(tbl)
