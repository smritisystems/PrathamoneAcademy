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
#  * @updated     2026-11-11
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
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = set(inspector.get_table_names())

    if "staff_profiles" not in existing_tables:
        op.create_table(
            "staff_profiles",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True),
            sa.Column("institution_id", sa.Integer(), sa.ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, default=1),
            sa.Column("employee_id", sa.String(50), unique=True, nullable=False, index=True),
            sa.Column("staff_type", sa.String(50), nullable=False, default="teacher"),
            sa.Column("department", sa.String(100), nullable=False, default="Academics"),
            sa.Column("date_of_birth", sa.Date(), nullable=True),
            sa.Column("gender", sa.String(20), nullable=True),
            sa.Column("blood_group", sa.String(10), nullable=True),
            sa.Column("emergency_contact_name", sa.String(100), nullable=True),
            sa.Column("emergency_contact_phone", sa.String(20), nullable=True),
            sa.Column("emergency_contact_relation", sa.String(50), nullable=True),
            sa.Column("current_address", sa.Text(), nullable=True),
            sa.Column("permanent_address", sa.Text(), nullable=True),
            sa.Column("city", sa.String(100), default="Mumbai"),
            sa.Column("state", sa.String(100), default="Maharashtra"),
            sa.Column("pincode", sa.String(20), default="400001"),
            sa.Column("qualification", sa.String(200), nullable=True),
            sa.Column("specialization", sa.String(200), nullable=True),
            sa.Column("experience_years", sa.Float(), default=0.0),
            sa.Column("joining_date", sa.Date(), nullable=True),
            sa.Column("employment_type", sa.String(50), default="full_time"),
            sa.Column("basic_salary", sa.Numeric(10, 2), default=0.00),
            sa.Column("pan_number", sa.String(20), nullable=True),
            sa.Column("aadhar_number", sa.String(20), nullable=True),
            sa.Column("bank_name", sa.String(100), nullable=True),
            sa.Column("bank_account_number", sa.String(50), nullable=True),
            sa.Column("bank_ifsc", sa.String(20), nullable=True),
            sa.Column("profile_photo_url", sa.String(500), nullable=True),
            sa.Column("status", sa.String(30), default="active", index=True),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        )

    if "staff_documents" not in existing_tables:
        op.create_table(
            "staff_documents",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("staff_profile_id", sa.Integer(), sa.ForeignKey("staff_profiles.id", ondelete="CASCADE"), nullable=False, index=True),
            sa.Column("document_type", sa.String(100), nullable=False),
            sa.Column("title", sa.String(200), nullable=False),
            sa.Column("file_url", sa.String(500), nullable=False),
            sa.Column("file_type", sa.String(50), default="PDF"),
            sa.Column("file_size_bytes", sa.Integer(), default=0),
            sa.Column("verification_status", sa.String(30), default="verified"),
            sa.Column("expiry_date", sa.Date(), nullable=True),
            sa.Column("uploaded_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        )

    if "teacher_assignments" not in existing_tables:
        op.create_table(
            "teacher_assignments",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("teacher_user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
            sa.Column("division_id", sa.Integer(), sa.ForeignKey("divisions.id", ondelete="CASCADE"), nullable=False, index=True),
            sa.Column("subject_id", sa.Integer(), sa.ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True),
            sa.Column("academic_year_id", sa.Integer(), sa.ForeignKey("academic_years.id", ondelete="CASCADE"), nullable=False, index=True),
            sa.Column("is_active", sa.Boolean(), default=True, server_default="true"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        )

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

