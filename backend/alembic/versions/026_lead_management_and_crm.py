# /**
#  * @file        026_lead_management_and_crm.py
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
#  * @description Alembic migration creating tables for Lead Management & CRM: leads, lead_follow_ups, and lead_demo_classes.
#  */

"""Lead Management & CRM Architecture Migration

Revision ID: 026_lead_management_and_crm
Revises: 025_canonical_subjects
Create Date: 2026-11-07 16:30:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector

revision = "026_lead_management_and_crm"
down_revision = "025_canonical_subjects"
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    tables = inspector.get_table_names()

    # 1. Create leads table
    if "leads" not in tables:
        op.create_table(
            "leads",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("institution_id", sa.Integer(), sa.ForeignKey("institutions.id"), nullable=False, index=True),
            sa.Column("lead_number", sa.String(length=30), unique=True, nullable=False, index=True),
            sa.Column("academic_year_id", sa.Integer(), sa.ForeignKey("academic_years.id"), nullable=True, index=True),
            sa.Column("standard_id", sa.Integer(), sa.ForeignKey("standards.id"), nullable=True, index=True),
            sa.Column("board_id", sa.Integer(), sa.ForeignKey("boards.id"), nullable=True, index=True),
            sa.Column("interested_course", sa.String(length=150), nullable=True),
            sa.Column("first_name", sa.String(length=100), nullable=False),
            sa.Column("last_name", sa.String(length=100), nullable=False),
            sa.Column("gender", sa.String(length=10), nullable=True),
            sa.Column("date_of_birth", sa.Date(), nullable=True),
            sa.Column("phone", sa.String(length=20), nullable=True, index=True),
            sa.Column("email", sa.String(length=200), nullable=True, index=True),
            sa.Column("school_name", sa.String(length=200), nullable=True),
            sa.Column("address", sa.Text(), nullable=True),
            sa.Column("city", sa.String(length=100), nullable=True),
            sa.Column("state", sa.String(length=100), nullable=True),
            sa.Column("pincode", sa.String(length=10), nullable=True),
            sa.Column("guardian_name", sa.String(length=150), nullable=True),
            sa.Column("guardian_relation", sa.String(length=50), nullable=True),
            sa.Column("guardian_phone", sa.String(length=20), nullable=True, index=True),
            sa.Column("guardian_email", sa.String(length=200), nullable=True),
            sa.Column("guardian_occupation", sa.String(length=100), nullable=True),
            sa.Column("stage", sa.String(length=30), nullable=False, server_default="new_enquiry", index=True),
            sa.Column("priority", sa.String(length=20), nullable=False, server_default="warm", index=True),
            sa.Column("source", sa.String(length=50), nullable=False, server_default="Website", index=True),
            sa.Column("campaign_name", sa.String(length=100), nullable=True),
            sa.Column("assigned_to_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True, index=True),
            sa.Column("enquiry_date", sa.Date(), nullable=False, server_default=sa.text("CURRENT_DATE")),
            sa.Column("next_follow_up_at", sa.DateTime(timezone=True), nullable=True, index=True),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column("converted_student_id", sa.Integer(), sa.ForeignKey("students.id"), nullable=True, index=True),
            sa.Column("converted_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("converted_by_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
            sa.Column("lost_reason", sa.String(length=100), nullable=True),
            sa.Column("lost_notes", sa.Text(), nullable=True),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        )

    # 2. Create lead_follow_ups table
    if "lead_follow_ups" not in tables:
        op.create_table(
            "lead_follow_ups",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("lead_id", sa.Integer(), sa.ForeignKey("leads.id", ondelete="CASCADE"), nullable=False, index=True),
            sa.Column("institution_id", sa.Integer(), sa.ForeignKey("institutions.id"), nullable=False, index=True),
            sa.Column("follow_up_type", sa.String(length=30), nullable=False, server_default="call"),
            sa.Column("stage_at_time", sa.String(length=30), nullable=True),
            sa.Column("status", sa.String(length=20), nullable=False, server_default="completed"),
            sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("outcome", sa.String(length=50), nullable=True),
            sa.Column("remarks", sa.Text(), nullable=True),
            sa.Column("next_follow_up_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("performed_by_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        )

    # 3. Create lead_demo_classes table
    if "lead_demo_classes" not in tables:
        op.create_table(
            "lead_demo_classes",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("lead_id", sa.Integer(), sa.ForeignKey("leads.id", ondelete="CASCADE"), nullable=False, index=True),
            sa.Column("institution_id", sa.Integer(), sa.ForeignKey("institutions.id"), nullable=False, index=True),
            sa.Column("standard_id", sa.Integer(), sa.ForeignKey("standards.id"), nullable=True),
            sa.Column("subject_id", sa.Integer(), sa.ForeignKey("subjects.id"), nullable=True),
            sa.Column("teacher_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
            sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("status", sa.String(length=20), nullable=False, server_default="scheduled"),
            sa.Column("feedback", sa.Text(), nullable=True),
            sa.Column("rating", sa.Integer(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        )

    # 4. Seed standard CRM lookups if lookup_items exists
    if "lookup_items" in tables:
        lead_sources = [
            ("Website", "Online portal & website enquiry form", 10),
            ("Walk-in", "Direct walk-in to coaching reception", 20),
            ("Referral", "Referred by existing student or parent", 30),
            ("WhatsApp", "WhatsApp chat & campaign enquiry", 40),
            ("Phone Enquiry", "Incoming telephone enquiry", 50),
            ("Social Media", "Instagram, Facebook, YouTube", 60),
            ("Newspaper Ad", "Print media and banner campaign", 70),
            ("Campaign", "School seminar and workshop campaign", 80),
        ]
        for src_label, src_desc, sort_idx in lead_sources:
            code = src_label.upper().replace(" ", "_").replace("-", "_")
            op.execute(sa.text(f"""
                INSERT INTO lookup_items (institution_id, category, code, label, description, sort_order, is_active, is_system, created_at, updated_at)
                SELECT 1, 'lead_source', '{code}', '{src_label}', '{src_desc}', {sort_idx}, true, true, NOW(), NOW()
                WHERE NOT EXISTS (
                    SELECT 1 FROM lookup_items WHERE category = 'lead_source' AND code = '{code}'
                );
            """))

        lost_reasons = [
            ("FEE_TOO_HIGH", "Fee Structure Too High / Budget Constraint", 10),
            ("LOCATION_DISTANCE", "Location / Distance / Commute Difficulty", 20),
            ("TIMING_CONFLICT", "Class Timing / Batch Schedule Conflict", 30),
            ("JOINED_COMPETITOR", "Opted for Another Coaching Institute", 40),
            ("DECIDED_AGAINST", "Decided Against Coaching / Self-Study", 50),
            ("INVALID_SPAM", "Invalid Phone Number / Test Enquiry", 60),
            ("OTHER", "Other Unspecified Reasons", 70),
        ]
        for r_code, r_label, sort_idx in lost_reasons:
            op.execute(sa.text(f"""
                INSERT INTO lookup_items (institution_id, category, code, label, description, sort_order, is_active, is_system, created_at, updated_at)
                SELECT 1, 'lost_reason', '{r_code}', '{r_label}', '{r_label}', {sort_idx}, true, true, NOW(), NOW()
                WHERE NOT EXISTS (
                    SELECT 1 FROM lookup_items WHERE category = 'lost_reason' AND code = '{r_code}'
                );
            """))


def downgrade():
    op.drop_table("lead_demo_classes")
    op.drop_table("lead_follow_ups")
    op.drop_table("leads")
