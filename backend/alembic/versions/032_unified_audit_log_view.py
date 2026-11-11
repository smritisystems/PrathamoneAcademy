# /**
#  * @file        032_unified_audit_log_view.py
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
#  * @created     2026-11-09
#  * @updated     2026-11-11
#  *
#  * @description Alembic migration creating the v_unified_audit_logs view uniting
#  */

"""Unified Cross-Domain Audit Log View

Revision ID: 032_unified_audit_log_view
Revises: 031_fee_schema_consolidation
Create Date: 2026-11-09 17:15:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "032_unified_audit_log_view"
down_revision = "031_fee_schema_consolidation"
branch_labels = None
depends_on = None

VIEW_SQL = """
CREATE OR REPLACE VIEW v_unified_audit_logs AS
SELECT 
    'audit_logs'::text AS source_table,
    id AS source_id,
    'SECURITY_SYSTEM'::text AS domain,
    action::text AS action,
    resource_type::text AS entity_type,
    resource_id::text AS entity_id,
    user_id AS actor_user_id,
    COALESCE(details, severity)::text AS details,
    'success'::text AS status,
    ip_address::text AS ip_address,
    created_at
FROM audit_logs

UNION ALL

SELECT 
    'setting_audit_logs'::text AS source_table,
    id AS source_id,
    'SETTINGS'::text AS domain,
    'UPDATE_SETTING'::text AS action,
    category::text AS entity_type,
    setting_key::text AS entity_id,
    changed_by_id AS actor_user_id,
    COALESCE(reason, 'Setting changed')::text AS details,
    'success'::text AS status,
    NULL::text AS ip_address,
    created_at
FROM setting_audit_logs

UNION ALL

SELECT 
    'communication_logs'::text AS source_table,
    id AS source_id,
    'COMMUNICATION'::text AS domain,
    ('DISPATCH_' || UPPER(channel))::text AS action,
    recipient_type::text AS entity_type,
    recipient_id::text AS entity_id,
    sender_id AS actor_user_id,
    COALESCE(subject, template_code, 'Direct message')::text AS details,
    status::text AS status,
    NULL::text AS ip_address,
    created_at
FROM communication_logs

UNION ALL

SELECT 
    'codex_audit_logs'::text AS source_table,
    id AS source_id,
    'CODEX_SECURITY'::text AS domain,
    action::text AS action,
    entity_type::text AS entity_type,
    entity_id::text AS entity_id,
    user_id AS actor_user_id,
    details::text AS details,
    status::text AS status,
    ip_address::text AS ip_address,
    created_at
FROM codex_audit_logs

UNION ALL

SELECT 
    'student_lifecycle_logs'::text AS source_table,
    id AS source_id,
    'STUDENT_ACADEMIC'::text AS domain,
    action::text AS action,
    'STUDENT'::text AS entity_type,
    student_id::text AS entity_id,
    performed_by_id AS actor_user_id,
    COALESCE(reason, notes, 'Lifecycle transition')::text AS details,
    to_status::text AS status,
    NULL::text AS ip_address,
    created_at
FROM student_lifecycle_logs;
"""


def upgrade():
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    cols = {c["name"] for c in inspector.get_columns("audit_logs")}
    if "is_system_audit" not in cols:
        op.add_column("audit_logs", sa.Column("is_system_audit", sa.Boolean(), nullable=False, server_default="false"))
    if "severity" not in cols:
        op.add_column("audit_logs", sa.Column("severity", sa.String(20), nullable=False, server_default="info"))
    if "details" not in cols:
        op.add_column("audit_logs", sa.Column("details", sa.Text(), nullable=True))

    op.execute(VIEW_SQL)


def downgrade():
    op.execute("DROP VIEW IF EXISTS v_unified_audit_logs;")
