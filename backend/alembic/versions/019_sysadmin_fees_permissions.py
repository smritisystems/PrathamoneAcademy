# /**
#  * @file        019_sysadmin_fees_permissions.py
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
#  * @updated     2026-11-06
#  *
#  * @description Alembic migration adding direct user permission support and seeding explicit Fees & Payments permissions.
#  */

"""Support direct user permissions and seed explicit Fees & Payments permissions

Revision ID: 019_fees_permissions
Revises: 018_branding_text
Create Date: 2026-11-05 23:45:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import text

revision = "019_fees_permissions"
down_revision = "018_branding_text"
branch_labels = None
depends_on = None


def upgrade():
    # 1. Modify permissions table to make role_id nullable and add user_id column
    op.alter_column("permissions", "role_id", nullable=True)
    op.add_column("permissions", sa.Column("user_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_permissions_user_id_users",
        "permissions",
        "users",
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_index("ix_permissions_user_id", "permissions", ["user_id"])

    # 2. Seed explicit permissions for Roles: sysadmin (18), superadmin (7), admin (8), accountant (10)
    conn = op.get_bind()

    # Permissions list: (role_name, resource, action)
    explicit_perms = [
        # Sysadmin baseline permissions
        ("sysadmin", "fees", "view"),
        ("sysadmin", "payments", "view"),
        ("sysadmin", "payments", "draft"),
        ("sysadmin", "payments", "edit_submitted"),
        ("sysadmin", "fee_workflow", "configure"),
        ("sysadmin", "payments", "refund_process"),
        ("sysadmin", "payments", "refund_approve"),
        ("sysadmin", "payments", "view_audit"),

        # Superadmin baseline permissions
        ("superadmin", "fees", "view"),
        ("superadmin", "payments", "view"),
        ("superadmin", "payments", "draft"),
        ("superadmin", "payments", "edit_submitted"),
        ("superadmin", "payments", "edit_posted"),
        ("superadmin", "fee_workflow", "configure"),
        ("superadmin", "payments", "refund_process"),
        ("superadmin", "payments", "refund_approve"),
        ("superadmin", "payments", "view_audit"),

        # Admin baseline permissions
        ("admin", "fees", "view"),
        ("admin", "payments", "view"),
        ("admin", "payments", "draft"),
        ("admin", "payments", "edit_submitted"),
        ("admin", "payments", "edit_posted"),
        ("admin", "fee_workflow", "configure"),
        ("admin", "payments", "refund_process"),
        ("admin", "payments", "refund_approve"),
        ("admin", "payments", "view_audit"),

        # Accountant baseline permissions
        ("accountant", "fees", "view"),
        ("accountant", "payments", "view"),
        ("accountant", "payments", "draft"),
        ("accountant", "payments", "edit_submitted"),
        ("accountant", "payments", "refund_process"),
        ("accountant", "payments", "view_audit"),
    ]

    for role_name, resource, action in explicit_perms:
        conn.execute(text("""
            INSERT INTO permissions (role_id, resource, action, created_at)
            SELECT r.id, CAST(:res AS VARCHAR), CAST(:act AS VARCHAR), NOW()
            FROM roles r
            WHERE r.name = CAST(:rname AS VARCHAR)
            AND NOT EXISTS (
                SELECT 1 FROM permissions p
                WHERE p.role_id = r.id AND p.resource = CAST(:res AS VARCHAR) AND p.action = CAST(:act AS VARCHAR)
            );
        """), {"rname": role_name, "res": resource, "act": action})


def downgrade():
    op.drop_constraint("fk_permissions_user_id_users", "permissions", type_="foreignkey")
    op.drop_index("ix_permissions_user_id", "permissions")
    op.drop_column("permissions", "user_id")
    op.alter_column("permissions", "role_id", nullable=False)
