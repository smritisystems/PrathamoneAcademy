# /**
#  * @file        029_crm_rbac_permissions.py
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
#  * @created     2026-11-08
#  * @updated     2026-11-08
#  *
#  * @description Database migration establishing canonical CRM Lead Management permissions and strictly decoupling CRM operations from student admission authorization.
#  */

"""Establish canonical CRM Lead permissions and separate from student admission

Revision ID: 029_crm_rbac_permissions
Revises: 028_global_training_environment
Create Date: 2026-11-08 00:15:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import text

revision = "029_crm_rbac_permissions"
down_revision = "028_global_training_environment"
branch_labels = None
depends_on = None

CRM_PERMISSIONS = [
    # ─── SYSADMIN ─────────────────────────────────────────────────────────────
    ("sysadmin", "leads", "read"),
    ("sysadmin", "leads", "create"),
    ("sysadmin", "leads", "update"),
    ("sysadmin", "leads", "assign"),
    ("sysadmin", "leads", "followup"),
    ("sysadmin", "leads", "communicate"),
    ("sysadmin", "leads", "manage_pipeline"),
    ("sysadmin", "leads", "reports"),
    ("sysadmin", "leads", "delete"),
    ("sysadmin", "students", "admission"),

    # ─── SUPERADMIN ───────────────────────────────────────────────────────────
    ("superadmin", "leads", "read"),
    ("superadmin", "leads", "create"),
    ("superadmin", "leads", "update"),
    ("superadmin", "leads", "assign"),
    ("superadmin", "leads", "followup"),
    ("superadmin", "leads", "communicate"),
    ("superadmin", "leads", "manage_pipeline"),
    ("superadmin", "leads", "reports"),
    ("superadmin", "leads", "delete"),
    ("superadmin", "students", "admission"),

    # ─── ADMIN ────────────────────────────────────────────────────────────────
    ("admin", "leads", "read"),
    ("admin", "leads", "create"),
    ("admin", "leads", "update"),
    ("admin", "leads", "assign"),
    ("admin", "leads", "followup"),
    ("admin", "leads", "communicate"),
    ("admin", "leads", "manage_pipeline"),
    ("admin", "leads", "reports"),
    ("admin", "leads", "delete"),
    ("admin", "students", "admission"),

    # ─── PRINCIPAL ────────────────────────────────────────────────────────────
    ("principal", "leads", "read"),
    ("principal", "leads", "create"),
    ("principal", "leads", "update"),
    ("principal", "leads", "assign"),
    ("principal", "leads", "followup"),
    ("principal", "leads", "communicate"),
    ("principal", "leads", "manage_pipeline"),
    ("principal", "leads", "reports"),
    ("principal", "leads", "delete"),
    ("principal", "students", "admission"),

    # ─── STAFF (COUNSELLORS & FRONT DESK - SEPARATED FROM ADMISSION) ──────────
    ("staff", "leads", "read"),
    ("staff", "leads", "create"),
    ("staff", "leads", "update"),
    ("staff", "leads", "assign"),
    ("staff", "leads", "followup"),
    ("staff", "leads", "communicate"),
    ("staff", "leads", "manage_pipeline"),
    ("staff", "leads", "reports"),

    # ─── ACCOUNTANT (VIEW CRM FOR FEE/BILLING RECONCILIATION) ─────────────────
    ("accountant", "leads", "read"),
    ("accountant", "leads", "reports"),
]


def upgrade() -> None:
    conn = op.get_bind()

    # Seed canonical permissions
    for role_name, resource, action in CRM_PERMISSIONS:
        conn.execute(
            text("""
                INSERT INTO permissions (role_id, resource, action, created_at)
                SELECT r.id, CAST(:res AS VARCHAR), CAST(:act AS VARCHAR), NOW()
                FROM roles r
                WHERE r.name = CAST(:rname AS VARCHAR)
                AND NOT EXISTS (
                    SELECT 1 FROM permissions p
                    WHERE p.role_id = r.id AND p.resource = CAST(:res AS VARCHAR) AND p.action = CAST(:act AS VARCHAR)
                );
            """),
            {"rname": role_name, "res": resource, "act": action},
        )


def downgrade() -> None:
    conn = op.get_bind()

    for role_name, resource, action in CRM_PERMISSIONS:
        conn.execute(
            text("""
                DELETE FROM permissions
                WHERE resource = CAST(:res AS VARCHAR)
                AND action = CAST(:act AS VARCHAR)
                AND role_id IN (SELECT id FROM roles WHERE name = CAST(:rname AS VARCHAR));
            """),
            {"rname": role_name, "res": resource, "act": action},
        )
