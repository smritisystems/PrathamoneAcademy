# /**
#  * @file        016_payment_workflow_and_refunds.py
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
#  * @updated     2026-11-05
#  *
#  * @description Alembic migration adding payment lifecycle fields, receipt versioning, refund approval workflows, and workflow settings.
#  */

"""Payment lifecycle, receipt versioning, and refund workflows

Revision ID: 016_payment_workflow
Revises: 015_release_management
Create Date: 2026-11-05 14:45:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "016_payment_workflow"
down_revision = "015_release_management"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Update payments table with lifecycle tracking
    op.add_column("payments", sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("payments", sa.Column("submitted_by_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True))
    op.add_column("payments", sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("payments", sa.Column("approved_by_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True))
    op.add_column("payments", sa.Column("posted_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("payments", sa.Column("posted_by_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True))
    op.add_column("payments", sa.Column("last_edited_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("payments", sa.Column("last_edited_by_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True))
    op.add_column("payments", sa.Column("edit_count", sa.Integer(), server_default="0", nullable=False))
    op.create_index("ix_payments_status", "payments", ["status"])

    # Backfill posted_at for existing completed payments
    op.execute("UPDATE payments SET posted_at = created_at WHERE status IN ('completed', 'posted') AND posted_at IS NULL")

    # 2. Update payment_receipts to support receipt versioning & supersession
    # Drop unique constraint on payment_id (allows superseded historical receipts and active receipt)
    try:
        op.drop_constraint("payment_receipts_payment_id_key", "payment_receipts", type_="unique")
    except Exception:
        # SQLite or custom-named constraint fallback
        pass

    try:
        op.create_index("ix_payment_receipts_payment_id", "payment_receipts", ["payment_id"])
    except Exception:
        pass

    op.add_column("payment_receipts", sa.Column("version", sa.Integer(), server_default="1", nullable=False))
    op.add_column("payment_receipts", sa.Column("status", sa.String(length=20), server_default="valid", nullable=False))
    op.add_column("payment_receipts", sa.Column("superseded_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("payment_receipts", sa.Column("superseded_by_receipt_number", sa.String(length=50), nullable=True))
    op.add_column("payment_receipts", sa.Column("reprint_count", sa.Integer(), server_default="0", nullable=False))
    op.create_index("ix_payment_receipts_status", "payment_receipts", ["status"])

    # 3. Update refunds table with approval workflow tracking
    op.add_column("refunds", sa.Column("requested_by_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True))
    op.add_column("refunds", sa.Column("approved_by_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True))
    op.add_column("refunds", sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("refunds", sa.Column("rejection_reason", sa.Text(), nullable=True))
    op.create_index("ix_refunds_status", "refunds", ["status"])


def downgrade() -> None:
    # 3. Downgrade refunds
    op.drop_index("ix_refunds_status", table_name="refunds")
    op.drop_column("refunds", "rejection_reason")
    op.drop_column("refunds", "approved_at")
    op.drop_column("refunds", "approved_by_id")
    op.drop_column("refunds", "requested_by_id")

    # 2. Downgrade payment_receipts
    op.drop_index("ix_payment_receipts_status", table_name="payment_receipts")
    op.drop_column("payment_receipts", "reprint_count")
    op.drop_column("payment_receipts", "superseded_by_receipt_number")
    op.drop_column("payment_receipts", "superseded_at")
    op.drop_column("payment_receipts", "status")
    op.drop_column("payment_receipts", "version")

    # 1. Downgrade payments
    op.drop_index("ix_payments_status", table_name="payments")
    op.drop_column("payments", "edit_count")
    op.drop_column("payments", "last_edited_by_id")
    op.drop_column("payments", "last_edited_at")
    op.drop_column("payments", "posted_by_id")
    op.drop_column("payments", "posted_at")
    op.drop_column("payments", "approved_by_id")
    op.drop_column("payments", "approved_at")
    op.drop_column("payments", "submitted_by_id")
    op.drop_column("payments", "submitted_at")

