# /**
#  * @file        035_fee_concession_and_scholarship_engine.py
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
#  * @created     2026-11-10
#  * @updated     2026-11-10
#  *
#  * @description Alembic migration creating fee_concession_types, fee_concession_applications, and fee_concession_allocations tables.
#  */

"""Fee Concession & Scholarship Management Engine schema

Revision ID: 035_fee_concessions
Revises: 034_navigation_engine
Create Date: 2026-11-10 13:40:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector

revision = "035_fee_concessions"
down_revision = "034_navigation_engine"
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    existing_tables = set(inspector.get_table_names())

    # 1. Create fee_concession_types table
    if "fee_concession_types" not in existing_tables:
        op.create_table(
            "fee_concession_types",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("institution_id", sa.Integer(), sa.ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True),
            sa.Column("code", sa.String(length=50), nullable=False),
            sa.Column("name", sa.String(length=150), nullable=False),
            sa.Column("category", sa.String(length=50), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("funding_source", sa.String(length=30), nullable=False, server_default="institute"),
            sa.Column("calculation_type", sa.String(length=30), nullable=False, server_default="percentage"),
            sa.Column("default_value", sa.Numeric(precision=12, scale=2), nullable=False, server_default="0.00"),
            sa.Column("max_discount_amount", sa.Numeric(precision=12, scale=2), nullable=True),
            sa.Column("is_stackable", sa.Boolean(), nullable=False, server_default="true"),
            sa.Column("requires_documents", sa.Boolean(), nullable=False, server_default="false"),
            sa.Column("eligibility_rules", sa.Text(), nullable=True),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
            sa.UniqueConstraint("institution_id", "code", name="uq_concession_type_inst_code"),
        )
        op.create_index("ix_fee_concession_types_category", "fee_concession_types", ["category"])

    # 2. Create fee_concession_applications table
    if "fee_concession_applications" not in existing_tables:
        op.create_table(
            "fee_concession_applications",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("institution_id", sa.Integer(), sa.ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True),
            sa.Column("application_number", sa.String(length=50), nullable=False, unique=True, index=True),
            sa.Column("student_id", sa.Integer(), sa.ForeignKey("students.id", ondelete="RESTRICT"), nullable=False, index=True),
            sa.Column("academic_year_id", sa.Integer(), sa.ForeignKey("academic_years.id", ondelete="RESTRICT"), nullable=False, index=True),
            sa.Column("concession_type_id", sa.Integer(), sa.ForeignKey("fee_concession_types.id", ondelete="RESTRICT"), nullable=False, index=True),
            sa.Column("invoice_id", sa.Integer(), sa.ForeignKey("fee_invoices.id", ondelete="SET NULL"), nullable=True, index=True),
            sa.Column("assignment_id", sa.Integer(), sa.ForeignKey("student_fee_assignments.id", ondelete="SET NULL"), nullable=True),
            sa.Column("requested_amount", sa.Numeric(precision=12, scale=2), nullable=False, server_default="0.00"),
            sa.Column("requested_percentage", sa.Numeric(precision=5, scale=2), nullable=True),
            sa.Column("approved_amount", sa.Numeric(precision=12, scale=2), nullable=False, server_default="0.00"),
            sa.Column("applied_amount", sa.Numeric(precision=12, scale=2), nullable=False, server_default="0.00"),
            sa.Column("funding_source", sa.String(length=30), nullable=False, server_default="institute"),
            sa.Column("sponsor_name", sa.String(length=150), nullable=True),
            sa.Column("sponsor_reference", sa.String(length=100), nullable=True),
            sa.Column("sponsor_sanctioned_amount", sa.Numeric(precision=12, scale=2), nullable=True),
            sa.Column("sponsor_received_amount", sa.Numeric(precision=12, scale=2), nullable=False, server_default="0.00"),
            sa.Column("status", sa.String(length=30), nullable=False, server_default="draft", index=True),
            sa.Column("applicant_type", sa.String(length=30), nullable=False, server_default="staff_nomination"),
            sa.Column("nominator_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
            sa.Column("verifier_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
            sa.Column("verified_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("verification_notes", sa.Text(), nullable=True),
            sa.Column("approver_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
            sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("approval_remarks", sa.Text(), nullable=True),
            sa.Column("rejection_reason", sa.Text(), nullable=True),
            sa.Column("withdrawal_reason", sa.Text(), nullable=True),
            sa.Column("valid_until", sa.Date(), nullable=True),
            sa.Column("supporting_document_url", sa.String(length=500), nullable=True),
            sa.Column("eligibility_snapshot", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
        )

    # 3. Create fee_concession_allocations table
    if "fee_concession_allocations" not in existing_tables:
        op.create_table(
            "fee_concession_allocations",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("application_id", sa.Integer(), sa.ForeignKey("fee_concession_applications.id", ondelete="RESTRICT"), nullable=False, index=True),
            sa.Column("invoice_id", sa.Integer(), sa.ForeignKey("fee_invoices.id", ondelete="RESTRICT"), nullable=False, index=True),
            sa.Column("allocated_amount", sa.Numeric(precision=12, scale=2), nullable=False),
            sa.Column("allocated_by_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
            sa.Column("allocated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column("credit_adjustment_amount", sa.Numeric(precision=12, scale=2), nullable=False, server_default="0.00"),
            sa.Column("refund_id", sa.Integer(), sa.ForeignKey("refunds.id", ondelete="SET NULL"), nullable=True),
        )

    # 4. Seed Canonical 10 Concession Types for Existing Institutions
    # Check if any types exist
    conn.execute(sa.text("""
        INSERT INTO fee_concession_types (institution_id, code, name, category, description, funding_source, calculation_type, default_value, max_discount_amount, is_stackable, requires_documents, is_active)
        SELECT i.id, t.code, t.name, t.category, t.description, t.funding_source, t.calculation_type, t.default_value, t.max_discount_amount, t.is_stackable, t.requires_documents, true
        FROM institutions i
        CROSS JOIN (
            VALUES 
            ('MERIT', 'Merit Scholarship', 'merit', 'Academic excellence in competitive entrance examination or qualifying board examination', 'institute', 'percentage', 25.00, 50000.00, true, true),
            ('NEED_BASED', 'Need-Based Financial Assistance', 'need_based', 'Financial assistance based on guardian verified annual income threshold', 'institute', 'percentage', 30.00, 40000.00, true, true),
            ('SIBLING', 'Sibling Discount', 'sibling', 'Concession granted for younger ward co-enrolled in the academy', 'institute', 'percentage', 15.00, 20000.00, true, false),
            ('STAFF_CHILD', 'Faculty & Staff Child Concession', 'staff_child', 'Benefit extended to biological children of active faculty and administrative personnel', 'institute', 'percentage', 25.00, 35000.00, false, false),
            ('ADMISSION', 'Early Admission Campaign Discount', 'admission', 'Promotional waiver granted during initial academic batch enrollment campaigns', 'institute', 'fixed_amount', 5000.00, 10000.00, true, false),
            ('EARLY_PAYMENT', 'Full Lump-Sum Early Payment Discount', 'early_payment', 'Incentive for upfront annual fee settlement in a single installment', 'institute', 'percentage', 10.00, 15000.00, true, false),
            ('PROMOTIONAL', 'Academic Olympiad & Promotional Discount', 'promotional', 'Special grant for Olympiad, NTSE, or Kishore Vaigyanik talent qualifiers', 'institute', 'fixed_amount', 3000.00, 10000.00, true, true),
            ('SPECIAL_MGMT', 'Special Management Concession', 'special_management', 'Discretionary fee reduction approved by the Executive Director or Board of Trustees', 'institute', 'fixed_amount', 10000.00, 50000.00, false, false),
            ('FEE_WAIVER', 'Full / Partial Emergency Fee Waiver', 'fee_waiver', 'Exceptional financial waiver granted due to extreme bereavement, medical hardship, or crisis', 'institute', 'full_waiver', 100.00, 100000.00, false, true),
            ('EXTERNAL_SPONSOR', 'Externally Sponsored Scholarship', 'external_sponsor', 'Philanthropic grant or corporate CSR sponsorship disbursed by third-party benefactor', 'external_sponsor', 'fixed_amount', 20000.00, 100000.00, true, true)
        ) AS t(code, name, category, description, funding_source, calculation_type, default_value, max_discount_amount, is_stackable, requires_documents)
        WHERE NOT EXISTS (
            SELECT 1 FROM fee_concession_types existing WHERE existing.institution_id = i.id AND existing.code = t.code
        );
    """))


def downgrade():
    op.drop_table("fee_concession_allocations")
    op.drop_table("fee_concession_applications")
    op.drop_table("fee_concession_types")

