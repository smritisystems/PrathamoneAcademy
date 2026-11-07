# /**
#  * @file        027_crm_ssot_consolidation.py
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
#  * @description Alembic migration consolidating CRM communication into canonical communication_logs table and registering lead stage lookups.
#  */

"""CRM Communication SSOT Consolidation Migration

Revision ID: 027_crm_ssot_consolidation
Revises: 026_lead_management_and_crm
Create Date: 2026-11-07 17:35:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector

revision = "027_crm_ssot_consolidation"
down_revision = "026_lead_management_and_crm"
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    tables = inspector.get_table_names()

    # 1. Add lead_id column to communication_logs if not present
    if "communication_logs" in tables:
        comm_cols = [c["name"] for c in inspector.get_columns("communication_logs")]
        if "lead_id" not in comm_cols:
            op.add_column(
                "communication_logs",
                sa.Column(
                    "lead_id",
                    sa.Integer(),
                    sa.ForeignKey("leads.id", ondelete="SET NULL"),
                    nullable=True,
                ),
            )
            op.create_index(
                op.f("ix_communication_logs_lead_id"),
                "communication_logs",
                ["lead_id"],
                unique=False,
            )

    # 2. Seed canonical lead stages into lookup_items
    if "lookup_items" in tables:
        lead_stages = [
            ("NEW_ENQUIRY", "New Enquiry", "Initial enquiry registered, waiting for first contact", 10),
            ("CONTACTED", "Contacted", "Counsellor spoke with student or parent", 20),
            ("COUNSELLING_DEMO", "Counselling / Demo", "Academic counselling or demo class scheduled", 30),
            ("INTERESTED", "Interested", "Student/parent demonstrated high intent to join", 40),
            ("ADMISSION_PENDING", "Admission Pending", "Fee quotation given, awaiting token or payment", 50),
            ("CONVERTED", "Converted", "Successfully enrolled and converted to active student admission", 60),
            ("LOST", "Lost", "Enquiry dropped, joined competitor, or disqualified", 70),
        ]
        for stg_code, stg_label, stg_desc, sort_idx in lead_stages:
            op.execute(sa.text(f"""
                INSERT INTO lookup_items (institution_id, category, code, label, description, sort_order, is_active, is_system, created_at, updated_at)
                SELECT 1, 'lead_stage', '{stg_code}', '{stg_label}', '{stg_desc}', {sort_idx}, true, true, NOW(), NOW()
                WHERE NOT EXISTS (
                    SELECT 1 FROM lookup_items WHERE category = 'lead_stage' AND code = '{stg_code}'
                );
            """))


def downgrade():
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    tables = inspector.get_table_names()

    if "communication_logs" in tables:
        comm_cols = [c["name"] for c in inspector.get_columns("communication_logs")]
        if "lead_id" in comm_cols:
            op.drop_index(op.f("ix_communication_logs_lead_id"), table_name="communication_logs")
            op.drop_column("communication_logs", "lead_id")
