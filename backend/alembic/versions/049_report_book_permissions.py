# /**
#  * @file        049_report_book_permissions.py
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
#  * @description Seeds distinct report-book viewing, template, generation, download, and print permissions.
#  */

"""seed granular report book permissions

Revision ID: 049_report_book_permissions
Revises: 048_report_book_publishing
Create Date: 2026-11-14
"""

from typing import Sequence, Union

from alembic import op
from sqlalchemy.sql import text

revision: str = "049_report_book_permissions"
down_revision: Union[str, None] = "048_report_book_publishing"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

REPORT_BOOK_PERMISSIONS = [
    (role, "view")
    for role in (
        "superadmin", "super_admin", "sysadmin", "admin", "principal",
        "accountant", "teacher", "staff", "counselor", "counsellor", "receptionist",
    )
] + [
    (role, action)
    for role in (
        "superadmin", "super_admin", "sysadmin", "admin", "principal",
        "accountant", "teacher", "staff", "counselor", "counsellor", "receptionist",
    )
    for action in ("generate_books", "download", "print")
] + [
    (role, "manage_templates")
    for role in ("superadmin", "super_admin", "sysadmin", "admin", "principal")
]


def upgrade() -> None:
    connection = op.get_bind()
    for role_name, action in REPORT_BOOK_PERMISSIONS:
        connection.execute(
            text(
                """
                INSERT INTO permissions (role_id, resource, action, created_at)
                SELECT r.id, 'reports', :action, NOW()
                FROM roles r
                WHERE r.name = :role_name
                AND NOT EXISTS (
                    SELECT 1 FROM permissions p
                    WHERE p.role_id = r.id AND p.resource = 'reports' AND p.action = :action
                );
                """
            ),
            {"role_name": role_name, "action": action},
        )


def downgrade() -> None:
    connection = op.get_bind()
    for role_name, action in REPORT_BOOK_PERMISSIONS:
        connection.execute(
            text(
                """
                DELETE FROM permissions
                WHERE resource = 'reports' AND action = :action
                AND role_id IN (SELECT id FROM roles WHERE name = :role_name);
                """
            ),
            {"role_name": role_name, "action": action},
        )
