# /**
#  * @file        041_subject_master_deduplication_and_consolidation.py
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
#  * @created     2026-11-11
#  * @updated     2026-11-11
#  *
#  * @description Database migration establishing reversible legacy subject mapping table, canonical alternate codes, normalized uniqueness constraints, and curriculum mapping reconciliations.
#  */

"""Subject Master Deduplication and Data Consolidation

Revision ID: 041_subject_dedup
Revises: 040_homework_system
Create Date: 2026-11-11 12:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector

revision = "041_subject_dedup"
down_revision = "040_homework_system"
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    existing_tables = set(inspector.get_table_names())

    # 1. Create subject_legacy_mappings table if not exists
    if "subject_legacy_mappings" not in existing_tables:
        op.create_table(
            "subject_legacy_mappings",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("legacy_subject_id", sa.Integer(), nullable=False, unique=True, index=True),
            sa.Column(
                "canonical_subject_id",
                sa.Integer(),
                sa.ForeignKey("canonical_subjects.id", ondelete="CASCADE"),
                nullable=False,
                index=True,
            ),
            sa.Column(
                "standard_id",
                sa.Integer(),
                sa.ForeignKey("standards.id", ondelete="SET NULL"),
                nullable=True,
                index=True,
            ),
            sa.Column("legacy_code", sa.String(50), nullable=True, index=True),
            sa.Column("canonical_code", sa.String(50), nullable=False, index=True),
            sa.Column("legacy_name", sa.String(100), nullable=False),
            sa.Column("canonical_name", sa.String(100), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        )

    # 2. Add alternate_codes column to canonical_subjects if missing
    cs_cols = [c["name"] for c in inspector.get_columns("canonical_subjects")]
    if "alternate_codes" not in cs_cols:
        op.add_column("canonical_subjects", sa.Column("alternate_codes", sa.String(255), nullable=True))

    # 3. Populate alternate_codes on canonical_subjects (using a single parameterized or CASE statement)
    conn.execute(sa.text("""
        UPDATE canonical_subjects
        SET alternate_codes = CASE 
            WHEN code = 'MATH001' THEN 'MATH-10, MATH-9, MATH-8, MATH-4'
            WHEN code = 'PHYS001' THEN 'PHYS-10, PHYS-9'
            WHEN code = 'CHEM001' THEN 'CHEM-10, CHEM-9'
            WHEN code = 'BIO001'  THEN 'BIO-10, BIO-9'
            WHEN code = 'SCI001'  THEN 'SCI-8, SCI-4'
            WHEN code = 'ENG001'  THEN 'ENG-10, ENG-9, ENG-8, ENG-4'
            WHEN code = 'SST001'  THEN 'SST-10, SST-9, SST-8, SST-4'
            WHEN code IN ('ROBO-10', 'ROBO001') THEN 'ROBO-10'
            ELSE alternate_codes
        END
    """))

    # Also update canonical subject 10 name and code to canonical standard if needed
    conn.execute(sa.text("""
        UPDATE canonical_subjects 
        SET name = 'Advanced Robotics & AI',
            aliases = 'Robotics & AI, Robotics, AI, ROBO-10'
        WHERE id = 10
    """))

    # 4. Populate subject_legacy_mappings with all existing subjects
    conn.execute(sa.text("""
        INSERT INTO subject_legacy_mappings (
            legacy_subject_id, canonical_subject_id, standard_id,
            legacy_code, canonical_code, legacy_name, canonical_name
        )
        SELECT 
            s.id AS legacy_subject_id,
            COALESCE(s.canonical_subject_id, 1) AS canonical_subject_id,
            s.standard_id,
            s.code AS legacy_code,
            COALESCE(cs.code, 'LEGACY') AS canonical_code,
            s.name AS legacy_name,
            COALESCE(cs.name, s.name) AS canonical_name
        FROM subjects s
        LEFT JOIN canonical_subjects cs ON s.canonical_subject_id = cs.id
        ON CONFLICT (legacy_subject_id) DO UPDATE SET
            canonical_subject_id = EXCLUDED.canonical_subject_id,
            standard_id = EXCLUDED.standard_id,
            legacy_code = EXCLUDED.legacy_code,
            canonical_code = EXCLUDED.canonical_code,
            legacy_name = EXCLUDED.legacy_name,
            canonical_name = EXCLUDED.canonical_name
    """))

    # 5. Correct subject_mappings for Class IV (legacy_subject_id 37, 38, 39, 40)
    conn.execute(sa.text("""
        UPDATE subject_mappings
        SET standard_id = 4,
            curriculum_code = CASE 
                WHEN legacy_subject_id = 37 THEN 'MATH-4'
                WHEN legacy_subject_id = 38 THEN 'SCI-4'
                WHEN legacy_subject_id = 39 THEN 'ENG-4'
                WHEN legacy_subject_id = 40 THEN 'SST-4'
                ELSE curriculum_code
            END
        WHERE legacy_subject_id IN (37, 38, 39, 40)
    """))

    # 6. Backfill teacher_assignments.subject_mapping_id
    conn.execute(sa.text("""
        UPDATE teacher_assignments ta
        SET subject_mapping_id = sm.id
        FROM subject_mappings sm
        WHERE sm.legacy_subject_id = ta.subject_id 
          AND sm.standard_id = ta.standard_id
          AND ta.subject_mapping_id IS NULL
    """))

    # 7. Safely consolidate unreferenced duplicate subjects 61-65
    conn.execute(sa.text("""
        DELETE FROM subjects 
        WHERE id IN (61, 62, 63, 64, 65)
          AND NOT EXISTS (SELECT 1 FROM exam_marks WHERE subject_id = subjects.id)
          AND NOT EXISTS (SELECT 1 FROM timetable_entries WHERE subject_id = subjects.id)
          AND NOT EXISTS (SELECT 1 FROM teacher_assignments WHERE subject_id = subjects.id)
          AND NOT EXISTS (SELECT 1 FROM study_materials WHERE subject_id = subjects.id)
          AND NOT EXISTS (SELECT 1 FROM teaching_sessions WHERE subject_id = subjects.id)
          AND NOT EXISTS (SELECT 1 FROM homework_assignments WHERE subject_id = subjects.id)
          AND NOT EXISTS (SELECT 1 FROM lead_demo_classes WHERE subject_id = subjects.id)
          AND NOT EXISTS (SELECT 1 FROM subject_mappings WHERE legacy_subject_id = subjects.id)
    """))

    # 8. Apply unique normalized name constraint to canonical_subjects to prevent future duplicates
    existing_indexes = [idx["name"] for idx in inspector.get_indexes("canonical_subjects")]
    if "uq_canonical_subjects_normalized_name" not in existing_indexes:
        op.create_index(
            "uq_canonical_subjects_normalized_name",
            "canonical_subjects",
            ["institution_id", sa.text("lower(trim(name))")],
            unique=True,
            postgresql_where=sa.text("is_active = true"),
        )


def downgrade():
    op.drop_index("uq_canonical_subjects_normalized_name", table_name="canonical_subjects")
    op.drop_table("subject_legacy_mappings")
    op.drop_column("canonical_subjects", "alternate_codes")
