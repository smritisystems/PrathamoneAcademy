# /**
#  * @file        062_repair_baseline_role_permissions.py
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
#  * @created     2026-11-28
#  * @updated     2026-11-28
#  *
#  * @description Idempotent migration backfilling canonical roles and baseline module permissions that were skipped when fresh desktop installs ran Alembic prior to seed.py.
#  */

"""Repair baseline roles and module permissions on fresh/upgraded installations

Revision ID: 062_repair_baseline_perms
Revises: 061_repair_fee_assignments
Create Date: 2026-11-28
"""

from alembic import op
from app.core.permissions_seed import ensure_baseline_role_permissions_sync


revision = "062_repair_baseline_perms"
down_revision = "061_repair_fee_assignments"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    ensure_baseline_role_permissions_sync(conn)


def downgrade() -> None:
    # Repair-only backfill preserves existing institutional role grants safely
    pass
