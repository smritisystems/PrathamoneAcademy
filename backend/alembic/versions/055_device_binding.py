# /**
#  * @file        055_device_binding.py
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
#  * @created     2026-11-19
#  * @updated     2026-11-19
#  *
#  * @description Database migration creating user_devices table for optional device-wise security binding.
#  */

"""Create user_devices table for optional device-wise security binding.

Revision ID: 055_device_binding
Revises: 054_fee_installments_refunds
Create Date: 2026-11-19
"""

from alembic import op
import sqlalchemy as sa


revision = "055_device_binding"
down_revision = "054_fee_installments_refunds"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()

    if "user_devices" not in tables:
        op.create_table(
            "user_devices",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("institution_id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("device_fingerprint", sa.String(length=128), nullable=False),
            sa.Column("device_name", sa.String(length=100), nullable=False),
            sa.Column("device_type", sa.String(length=50), server_default="desktop", nullable=False),
            sa.Column("browser_info", sa.String(length=200), nullable=True),
            sa.Column("os_info", sa.String(length=100), nullable=True),
            sa.Column("ip_address", sa.String(length=50), nullable=True),
            sa.Column("status", sa.String(length=30), server_default="active", nullable=False),
            sa.Column("is_trusted", sa.Boolean(), server_default="true", nullable=False),
            sa.Column("approved_by_id", sa.Integer(), nullable=True),
            sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("registered_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("revocation_reason", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(["institution_id"], ["institutions.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["approved_by_id"], ["users.id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("institution_id", "user_id", "device_fingerprint", name="uq_user_device_binding"),
        )
        op.create_index("ix_user_devices_institution_id", "user_devices", ["institution_id"])
        op.create_index("ix_user_devices_user_id", "user_devices", ["user_id"])
        op.create_index("ix_user_devices_device_fingerprint", "user_devices", ["device_fingerprint"])
        op.create_index("ix_user_devices_status", "user_devices", ["status"])


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()

    if "user_devices" in tables:
        op.drop_index("ix_user_devices_status", table_name="user_devices")
        op.drop_index("ix_user_devices_device_fingerprint", table_name="user_devices")
        op.drop_index("ix_user_devices_user_id", table_name="user_devices")
        op.drop_index("ix_user_devices_institution_id", table_name="user_devices")
        op.drop_table("user_devices")
