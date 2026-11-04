# /**
#  * @file        010_enforce_curriculum_and_timetable_constraints.py
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
#  * @created     2026-11-04
#  * @updated     2026-11-04
#  *
#  * @description Database migration cleaning test artifacts, synchronizing RBAC roles, and enforcing composite unique constraints on academic hierarchy and timetable.
#  */

"""Clean test artifacts, sync RBAC, and enforce unique constraints on subjects, standards, divisions, timetable, and fee assignments

Revision ID: 010_curriculum_timetable
Revises: 009_unique_active_enrollment
Create Date: 2026-11-04 17:55:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "010_curriculum_timetable"
down_revision = "009_unique_active_enrollment"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ═══════════════════════════════════════════════════════════════════════
    # 1. CLEANUP OF TEST ARTIFACTS & DUPLICATES
    # ═══════════════════════════════════════════════════════════════════════
    # Clean up test subjects from previous acceptance runs
    op.execute("DELETE FROM subjects WHERE code IN ('ROBO-10', 'QR-13');")

    # Clean up test timetable entries from previous acceptance runs
    op.execute("DELETE FROM timetable_entries WHERE room_number IN ('Lab 99', 'Room 501');")

    # Clean up test divisions
    op.execute("DELETE FROM divisions WHERE name ILIKE '%audit%';")

    # Clean up test standards
    op.execute("DELETE FROM standards WHERE name ILIKE '%audit%';")

    # Clean up test boards
    op.execute("DELETE FROM boards WHERE code = 'IB-AUDIT';")

    # Clean up duplicate historical transferred enrollment (ID 171)
    op.execute("DELETE FROM student_enrollments WHERE id = 171;")

    # Clean up duplicate audit logs
    op.execute("""
        DELETE FROM audit_logs a
        USING audit_logs b
        WHERE a.id > b.id
          AND a.user_id = b.user_id
          AND a.action = b.action
          AND a.resource_type = b.resource_type
          AND a.resource_id = b.resource_id
          AND a.old_data = b.old_data
          AND a.new_data = b.new_data;
    """)

    # ═══════════════════════════════════════════════════════════════════════
    # 2. RBAC SCHEMA SYNCHRONIZATION
    # ═══════════════════════════════════════════════════════════════════════
    op.execute("INSERT INTO roles (name, description) VALUES ('student', 'Student Account') ON CONFLICT (name) DO NOTHING;")
    op.execute("UPDATE users u SET role_id = r.id FROM roles r WHERE u.role = r.name AND u.role_id IS NULL;")

    # ═══════════════════════════════════════════════════════════════════════
    # 3. ENFORCE COMPOSITE UNIQUE CONSTRAINTS
    # ═══════════════════════════════════════════════════════════════════════
    # 3.1 Subject unique code per standard
    op.create_index(
        "uq_subjects_standard_code",
        "subjects",
        ["standard_id", "code"],
        unique=True,
        postgresql_where=sa.text("is_active = true"),
    )

    # 3.2 Standard unique level per institution
    op.create_index(
        "uq_standards_institution_level",
        "standards",
        ["institution_id", "level"],
        unique=True,
        postgresql_where=sa.text("is_active = true"),
    )

    # 3.3 Timetable unique slot per division
    op.create_index(
        "uq_timetable_division_slot",
        "timetable_entries",
        ["division_id", "day_of_week", "start_time"],
        unique=True,
        postgresql_where=sa.text("is_active = true"),
    )

    # 3.4 Division unique code per standard and board
    op.create_index(
        "uq_divisions_standard_board_code",
        "divisions",
        ["standard_id", "board_id", "code"],
        unique=True,
        postgresql_where=sa.text("is_active = true AND code IS NOT NULL"),
    )

    # 3.5 Student fee assignment single assignment per academic year
    op.create_index(
        "uq_student_fee_assignment_ay",
        "student_fee_assignments",
        ["student_id", "academic_year_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("uq_student_fee_assignment_ay", table_name="student_fee_assignments")
    op.drop_index("uq_divisions_standard_board_code", table_name="divisions")
    op.drop_index("uq_timetable_division_slot", table_name="timetable_entries")
    op.drop_index("uq_standards_institution_level", table_name="standards")
    op.drop_index("uq_subjects_standard_code", table_name="subjects")
