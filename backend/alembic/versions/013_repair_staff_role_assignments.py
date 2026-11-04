# /**
#  * @file        013_repair_staff_role_assignments.py
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
#  * @description Safe, idempotent migration to repair NULL role_id assignments for non-teaching staff members.
#  */

"""Repair null staff role assignments

Revision ID: 013_repair_staff_roles
Revises: 012_comm_sharing
Create Date: 2026-11-05 03:45:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "013_repair_staff_roles"
down_revision = "012_comm_sharing"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """
    Idempotent migration repairing users who have role_id IS NULL in the staff roster.
    Specifically targets counselor and receptionist users (users 126 & 127) whose
    job classifications were stored without linking to the primary 'staff' role entity.
    Preserves exact job titles in users.designation and staff_profiles.staff_type.
    """
    op.execute("""
        UPDATE users
        SET role_id = (SELECT id FROM roles WHERE name = 'staff'),
            role = 'staff'
        WHERE role_id IS NULL
          AND id IN (SELECT user_id FROM staff_profiles);
    """)


def downgrade() -> None:
    """
    Downgrade operation: Preserves user accounts in their current safe state.
    """
    pass

