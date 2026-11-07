# /**
#  * @file        025_canonical_subjects.py
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
#  * @description Alembic migration establishing canonical subjects catalogue, standard/board applicability mappings, and back-linking legacy subjects.
#  */

"""Canonical Subject Master and Applicability Mappings Architecture

Revision ID: 025_canonical_subjects_and_mappings
Revises: 024_employee_dossier
Create Date: 2026-11-07 14:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector

revision = "025_canonical_subjects"
down_revision = "024_employee_dossier"
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    existing_tables = set(inspector.get_table_names())

    # 1. Create canonical_subjects table if not exists
    if "canonical_subjects" not in existing_tables:
        op.create_table(
            "canonical_subjects",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column(
                "institution_id",
                sa.Integer(),
                sa.ForeignKey("institutions.id", ondelete="CASCADE"),
                nullable=False,
                server_default="1",
            ),
            sa.Column("name", sa.String(100), nullable=False, index=True),
            sa.Column("code", sa.String(30), nullable=False, index=True),
            sa.Column("category", sa.String(50), nullable=False, server_default="General"),
            sa.Column("description", sa.String(255), nullable=True),
            sa.Column("aliases", sa.String(255), nullable=True),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        )

        op.create_index(
            "uq_canonical_subjects_code",
            "canonical_subjects",
            ["institution_id", "code"],
            unique=True,
            postgresql_where=sa.text("is_active = true"),
        )

    # 2. Add canonical_subject_id to subjects table if missing
    subject_cols = [c["name"] for c in inspector.get_columns("subjects")]
    if "canonical_subject_id" not in subject_cols:
        op.add_column(
            "subjects",
            sa.Column(
                "canonical_subject_id",
                sa.Integer(),
                sa.ForeignKey("canonical_subjects.id", ondelete="SET NULL"),
                nullable=True,
                index=True,
            ),
        )

    # 3. Create subject_mappings table if not exists
    if "subject_mappings" not in existing_tables:
        op.create_table(
            "subject_mappings",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
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
                sa.ForeignKey("standards.id", ondelete="CASCADE"),
                nullable=False,
                index=True,
            ),
            sa.Column(
                "board_id",
                sa.Integer(),
                sa.ForeignKey("boards.id", ondelete="SET NULL"),
                nullable=True,
                index=True,
            ),
            sa.Column(
                "academic_year_id",
                sa.Integer(),
                sa.ForeignKey("academic_years.id", ondelete="SET NULL"),
                nullable=True,
                index=True,
            ),
            sa.Column("curriculum_code", sa.String(30), nullable=True),
            sa.Column("display_name", sa.String(120), nullable=True),
            sa.Column("max_marks", sa.Integer(), nullable=False, server_default="100"),
            sa.Column("pass_marks", sa.Integer(), nullable=False, server_default="35"),
            sa.Column("is_optional", sa.Boolean(), nullable=False, server_default="false"),
            sa.Column("display_order", sa.Integer(), nullable=False, server_default="1"),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
            sa.Column(
                "legacy_subject_id",
                sa.Integer(),
                sa.ForeignKey("subjects.id", ondelete="SET NULL"),
                nullable=True,
                index=True,
            ),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        )

        op.create_index(
            "uq_subject_mapping_canonical_std_board_yr",
            "subject_mappings",
            ["canonical_subject_id", "standard_id", "board_id", "academic_year_id"],
            unique=True,
            postgresql_where=sa.text("is_active = true"),
        )

    # 4. Seed Canonical Subjects Master
    seed_canonical = [
        ("Mathematics", "MATH001", "Mathematics", "Core academic mathematics curriculum", "Math, Maths, Pure Mathematics"),
        ("Physics", "PHYS001", "Science", "Classical and modern physical sciences", "PHY"),
        ("Chemistry", "CHEM001", "Science", "Inorganic, organic, and physical chemistry", "CHEM"),
        ("Biology", "BIO001", "Science", "Biological sciences, anatomy, and life sciences", "BIO, Life Sciences"),
        ("Science", "SCI001", "Science", "Integrated general science for middle and primary standards", "General Science, Basic Science"),
        ("English", "ENG001", "Languages", "English language, literature, and communication studies", "English Language, English Literature, ENG"),
        ("Social Science", "SST001", "Social Sciences", "Social sciences including history, civics, and geography", "Social Studies, SST, History, Geography, Civics"),
        ("Hindi", "HIN001", "Languages", "Hindi language, grammar, and literature", "HIN"),
        ("Computer Science", "COMP001", "Computer Science", "Information technology, computer science, and programming", "CS, IT, Computers"),
    ]

    for name, code, cat, desc, aliases in seed_canonical:
        conn.execute(
            sa.text("""
                INSERT INTO canonical_subjects (institution_id, name, code, category, description, aliases, is_active)
                VALUES (1, :name, :code, :cat, :desc, :aliases, true)
                ON CONFLICT (institution_id, code) WHERE is_active = true DO NOTHING;
            """),
            {"name": name, "code": code, "cat": cat, "desc": desc, "aliases": aliases},
        )

    # 5. Link Legacy Subjects to Canonical Subjects
    name_to_code = {
        "Mathematics": "MATH001",
        "Physics": "PHYS001",
        "Chemistry": "CHEM001",
        "Biology": "BIO001",
        "Science": "SCI001",
        "English": "ENG001",
        "English Language": "ENG001",
        "English Language & Lit": "ENG001",
        "Social Science": "SST001",
        "Social Studies": "SST001",
    }

    for sub_name, canon_code in name_to_code.items():
        conn.execute(
            sa.text("""
                UPDATE subjects
                SET canonical_subject_id = (SELECT id FROM canonical_subjects WHERE institution_id = 1 AND code = CAST(:code AS VARCHAR) LIMIT 1)
                WHERE name = CAST(:name AS VARCHAR) AND (canonical_subject_id IS NULL OR canonical_subject_id = 0);
            """),
            {"name": sub_name, "code": canon_code},
        )

    # 6. Backfill Subject Mappings for all active legacy subjects
    # Determine board_id from divisions where available, or fallback according to standards
    conn.execute(sa.text("""
        INSERT INTO subject_mappings (
            canonical_subject_id, standard_id, board_id, academic_year_id,
            curriculum_code, display_name, max_marks, pass_marks, is_optional,
            display_order, is_active, legacy_subject_id
        )
        SELECT 
            s.canonical_subject_id,
            s.standard_id,
            COALESCE(
                (SELECT d.board_id FROM divisions d WHERE d.standard_id = s.standard_id AND d.board_id IS NOT NULL LIMIT 1),
                CASE 
                    WHEN s.standard_id IN (4, 8) THEN 1  -- ICSE
                    WHEN s.standard_id = 9 THEN 3        -- SSC
                    WHEN s.standard_id = 10 THEN 1       -- ICSE
                    ELSE 1
                END
            ) as board_id,
            (SELECT id FROM academic_years WHERE is_current = true LIMIT 1) as academic_year_id,
            s.code as curriculum_code,
            s.name as display_name,
            s.max_marks,
            s.pass_marks,
            s.is_optional,
            1 as display_order,
            true as is_active,
            s.id as legacy_subject_id
        FROM subjects s
        WHERE s.canonical_subject_id IS NOT NULL
          AND NOT EXISTS (
              SELECT 1 FROM subject_mappings sm
              WHERE sm.legacy_subject_id = s.id
          );
    """))


def downgrade():
    op.drop_table("subject_mappings")
    op.drop_column("subjects", "canonical_subject_id")
    op.drop_table("canonical_subjects")
