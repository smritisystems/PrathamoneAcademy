# /**
#  * @file        030_subject_mapping_bridge.py
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
#  * @updated     2026-11-09
#  *
#  * @description Alembic migration adding subject_mapping_id relational bridge foreign key
#  */

"""Subject Mapping Relational Bridge

Revision ID: 030_subject_mapping_bridge
Revises: 029_crm_rbac_permissions
Create Date: 2026-11-09 14:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector

revision = "030_subject_mapping_bridge"
down_revision = "029_crm_rbac_permissions"
branch_labels = None
depends_on = None

TARGET_TABLES = [
    "exam_marks",
    "timetable_entries",
    "study_materials",
    "teacher_assignments",
    "teaching_sessions",
    "lead_demo_classes",
]


def upgrade():
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    existing_tables = set(inspector.get_table_names())

    for tbl in TARGET_TABLES:
        if tbl in existing_tables:
            columns = {col["name"] for col in inspector.get_columns(tbl)}
            if "subject_mapping_id" not in columns:
                op.add_column(
                    tbl,
                    sa.Column(
                        "subject_mapping_id",
                        sa.Integer(),
                        sa.ForeignKey("subject_mappings.id", ondelete="SET NULL"),
                        nullable=True,
                    ),
                )
                op.create_index(
                    f"ix_{tbl}_subject_mapping_id",
                    tbl,
                    ["subject_mapping_id"],
                )

    # Backfill subject_mapping_id from subject_mappings.legacy_subject_id
    for tbl in TARGET_TABLES:
        if tbl in existing_tables:
            conn.execute(
                sa.text(
                    f"""
                    UPDATE {tbl} target
                    SET subject_mapping_id = sm.id
                    FROM subject_mappings sm
                    WHERE target.subject_id = sm.legacy_subject_id
                      AND target.subject_mapping_id IS NULL;
                    """
                )
            )


def downgrade():
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    existing_tables = set(inspector.get_table_names())

    for tbl in TARGET_TABLES:
        if tbl in existing_tables:
            columns = {col["name"] for col in inspector.get_columns(tbl)}
            if "subject_mapping_id" in columns:
                op.drop_index(f"ix_{tbl}_subject_mapping_id", table_name=tbl)
                op.drop_column(tbl, "subject_mapping_id")

