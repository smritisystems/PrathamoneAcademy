# /**
#  * @file        033_financial_transaction_integrity.py
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
#  * @description Alembic migration adding financial transaction integrity columns, reversal lineage, receipt cancellation audit, and financial periods locking table.
#  */

"""Financial Transaction Integrity: Reversal lineage, receipt cancellation, and period locking

Revision ID: 033_financial_transaction_integrity
Revises: 032_unified_audit_log_view
Create Date: 2026-11-09 18:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector

revision = "033_financial_integrity"
down_revision = "032_unified_audit_log_view"
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    existing_tables = set(inspector.get_table_names())

    # 1. Extend payments table
    if "payments" in existing_tables:
        pay_cols = {col["name"] for col in inspector.get_columns("payments")}
        if "reversal_of_payment_id" not in pay_cols:
            op.add_column("payments", sa.Column("reversal_of_payment_id", sa.Integer(), sa.ForeignKey("payments.id"), nullable=True))
        if "replacement_payment_id" not in pay_cols:
            op.add_column("payments", sa.Column("replacement_payment_id", sa.Integer(), sa.ForeignKey("payments.id"), nullable=True))
        if "idempotency_key" not in pay_cols:
            op.add_column("payments", sa.Column("idempotency_key", sa.String(length=100), nullable=True))
            op.create_index("ix_payments_idempotency_key", "payments", ["idempotency_key"], unique=False)

    # 2. Extend payment_receipts table
    if "payment_receipts" in existing_tables:
        rec_cols = {col["name"] for col in inspector.get_columns("payment_receipts")}
        if "cancelled_at" not in rec_cols:
            op.add_column("payment_receipts", sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True))
        if "cancelled_by_id" not in rec_cols:
            op.add_column("payment_receipts", sa.Column("cancelled_by_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True))
        if "cancellation_reason" not in rec_cols:
            op.add_column("payment_receipts", sa.Column("cancellation_reason", sa.Text(), nullable=True))

    # 3. Create financial_periods table
    if "financial_periods" not in existing_tables:
        op.create_table(
            "financial_periods",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("institution_id", sa.Integer(), sa.ForeignKey("institutions.id"), nullable=False, index=True),
            sa.Column("academic_year_id", sa.Integer(), sa.ForeignKey("academic_years.id"), nullable=False, index=True),
            sa.Column("name", sa.String(length=100), nullable=False),
            sa.Column("period_type", sa.String(length=20), server_default="monthly", nullable=False),
            sa.Column("start_date", sa.Date(), nullable=False),
            sa.Column("end_date", sa.Date(), nullable=False),
            sa.Column("is_closed", sa.Boolean(), server_default=sa.text("false"), nullable=False, index=True),
            sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("closed_by_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )


def downgrade():
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    existing_tables = set(inspector.get_table_names())

    # 1. Drop financial_periods table
    if "financial_periods" in existing_tables:
        op.drop_table("financial_periods")

    # 2. Revert payment_receipts columns
    if "payment_receipts" in existing_tables:
        rec_cols = {col["name"] for col in inspector.get_columns("payment_receipts")}
        if "cancellation_reason" in rec_cols:
            op.drop_column("payment_receipts", "cancellation_reason")
        if "cancelled_by_id" in rec_cols:
            op.drop_column("payment_receipts", "cancelled_by_id")
        if "cancelled_at" in rec_cols:
            op.drop_column("payment_receipts", "cancelled_at")

    # 3. Revert payments columns
    if "payments" in existing_tables:
        pay_cols = {col["name"] for col in inspector.get_columns("payments")}
        if "idempotency_key" in pay_cols:
            op.drop_index("ix_payments_idempotency_key", table_name="payments")
            op.drop_column("payments", "idempotency_key")
        if "replacement_payment_id" in pay_cols:
            op.drop_column("payments", "replacement_payment_id")
        if "reversal_of_payment_id" in pay_cols:
            op.drop_column("payments", "reversal_of_payment_id")
