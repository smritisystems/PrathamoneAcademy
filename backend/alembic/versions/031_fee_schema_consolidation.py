# /**
#  * @file        031_fee_schema_consolidation.py
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
#  * @description Alembic migration consolidating fee schema: safely retiring empty legacy tables
#  */

"""Fee Schema Consolidation: Retire discounts, scholarships, and fee_installments

Revision ID: 031_fee_schema_consolidation
Revises: 030_subject_mapping_bridge
Create Date: 2026-11-09 17:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector

revision = "031_fee_schema_consolidation"
down_revision = "030_subject_mapping_bridge"
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    existing_tables = set(inspector.get_table_names())

    # 1. Drop foreign key constraint on student_fee_assignments.discount_id if exists
    if "student_fee_assignments" in existing_tables:
        fks = inspector.get_foreign_keys("student_fee_assignments")
        fk_names = {fk["name"] for fk in fks}
        if "student_fee_assignments_discount_id_fkey" in fk_names:
            op.drop_constraint("student_fee_assignments_discount_id_fkey", "student_fee_assignments", type_="foreignkey")
        if "student_fee_assignments_scholarship_id_fkey" in fk_names:
            op.drop_constraint("student_fee_assignments_scholarship_id_fkey", "student_fee_assignments", type_="foreignkey")

        columns = {col["name"] for col in inspector.get_columns("student_fee_assignments")}
        if "discount_id" in columns:
            op.drop_column("student_fee_assignments", "discount_id")
        if "scholarship_id" in columns:
            op.drop_column("student_fee_assignments", "scholarship_id")

    # 2. Drop foreign key constraint on payment_allocations.installment_id if exists
    if "payment_allocations" in existing_tables:
        fks = inspector.get_foreign_keys("payment_allocations")
        fk_names = {fk["name"] for fk in fks}
        if "payment_allocations_installment_id_fkey" in fk_names:
            op.drop_constraint("payment_allocations_installment_id_fkey", "payment_allocations", type_="foreignkey")

        columns = {col["name"] for col in inspector.get_columns("payment_allocations")}
        if "installment_id" in columns:
            op.drop_column("payment_allocations", "installment_id")

    # 3. Drop empty tables
    if "fee_installments" in existing_tables:
        op.drop_table("fee_installments")
    if "discounts" in existing_tables:
        op.drop_table("discounts")
    if "scholarships" in existing_tables:
        op.drop_table("scholarships")


def downgrade():
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    existing_tables = set(inspector.get_table_names())

    if "discounts" not in existing_tables:
        op.create_table(
            "discounts",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("institution_id", sa.Integer(), sa.ForeignKey("institutions.id"), nullable=False),
            sa.Column("name", sa.String(length=100), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("discount_type", sa.String(length=20), nullable=False),
            sa.Column("value", sa.Numeric(precision=10, scale=2), nullable=False),
            sa.Column("is_active", sa.Boolean(), default=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        )

    if "scholarships" not in existing_tables:
        op.create_table(
            "scholarships",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("institution_id", sa.Integer(), sa.ForeignKey("institutions.id"), nullable=False),
            sa.Column("name", sa.String(length=100), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("amount", sa.Numeric(precision=10, scale=2), nullable=False),
            sa.Column("criteria", sa.Text(), nullable=True),
            sa.Column("is_active", sa.Boolean(), default=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        )

    if "fee_installments" not in existing_tables:
        op.create_table(
            "fee_installments",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("fee_structure_id", sa.Integer(), sa.ForeignKey("fee_structures.id"), nullable=False),
            sa.Column("installment_number", sa.Integer(), nullable=False),
            sa.Column("due_date", sa.Date(), nullable=False),
            sa.Column("amount", sa.Numeric(precision=10, scale=2), nullable=False),
            sa.Column("is_active", sa.Boolean(), default=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        )

    if "student_fee_assignments" in existing_tables:
        op.add_column("student_fee_assignments", sa.Column("discount_id", sa.Integer(), sa.ForeignKey("discounts.id"), nullable=True))
        op.add_column("student_fee_assignments", sa.Column("scholarship_id", sa.Integer(), sa.ForeignKey("scholarships.id"), nullable=True))

    if "payment_allocations" in existing_tables:
        op.add_column("payment_allocations", sa.Column("installment_id", sa.Integer(), sa.ForeignKey("fee_installments.id"), nullable=True))
