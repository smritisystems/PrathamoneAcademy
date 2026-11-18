# /**
#  * @file        054_fee_installments_refunds.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      backend.alembic.versions
#  *
#  * @author      Jawahar R. Mallah
#  * @organization Smritisys & AITDL Networks
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 PrathamOne EduOS
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-18
#  * @updated     2026-11-18
#  *
#  * @description Persists fee invoice schedules and allocation-aware refund details.
#  */

"""Persist invoice installment schedules and refund allocations in revision 054.

Revision ID: 054_fee_installments_refunds
Revises: 053_recurrence_reschedule
Create Date: 2026-11-18
"""

from alembic import op
import sqlalchemy as sa


revision = "054_fee_installments_refunds"
down_revision = "053_recurrence_reschedule"
branch_labels = None
depends_on = None


def _require_tables(bind, *names: str) -> None:
    inspector = sa.inspect(bind)
    missing = [name for name in names if not inspector.has_table(name)]
    if missing:
        raise RuntimeError(
            "Migration 054 preflight failed; required tables are missing: "
            + ", ".join(missing)
        )


def _require_current_head(bind) -> None:
    inspector = sa.inspect(bind)
    if not inspector.has_table("alembic_version"):
        raise RuntimeError(
            "Migration 054 preflight failed; alembic_version is missing."
        )
    versions = bind.execute(
        sa.text("SELECT version_num FROM alembic_version")
    ).scalars().all()
    if versions != ["053_recurrence_reschedule"]:
        raise RuntimeError(
            "Migration 054 preflight failed; expected exactly Alembic head "
            "'053_recurrence_reschedule', found "
            + (", ".join(versions) if versions else "no recorded revision")
            + "."
        )


def _require_foreign_key(
    inspector,
    table: str,
    column: str,
    referred_table: str,
    referred_column: str,
) -> None:
    exists = any(
        fk.get("constrained_columns") == [column]
        and fk.get("referred_table") == referred_table
        and fk.get("referred_columns") == [referred_column]
        for fk in inspector.get_foreign_keys(table)
    )
    if not exists:
        raise RuntimeError(
            f"Migration 054 found an unexpected foreign-key schema on "
            f"{table}.{column}; manual reconciliation is required."
        )


def upgrade() -> None:
    bind = op.get_bind()
    _require_current_head(bind)
    _require_tables(bind, "fee_invoices", "payment_allocations", "refunds")
    inspector = sa.inspect(bind)
    allocation_columns = {
        column["name"] for column in inspector.get_columns("payment_allocations")
    }
    if (
        inspector.has_table("fee_invoice_installments")
        or inspector.has_table("refund_allocations")
        or "installment_id" in allocation_columns
    ):
        raise RuntimeError(
            "Migration 054 preflight found pre-existing target schema objects. "
            "Reconcile the deployed schema and migration history before proceeding."
        )

    if not inspector.has_table("fee_invoice_installments"):
        op.create_table(
            "fee_invoice_installments",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column(
                "invoice_id",
                sa.Integer(),
                sa.ForeignKey("fee_invoices.id", ondelete="RESTRICT"),
                nullable=False,
            ),
            sa.Column("installment_number", sa.Integer(), nullable=False),
            sa.Column("description", sa.String(length=200), nullable=False),
            sa.Column("amount", sa.Numeric(12, 2), nullable=False),
            sa.Column(
                "paid_amount",
                sa.Numeric(12, 2),
                nullable=False,
                server_default=sa.text("0"),
            ),
            sa.Column("outstanding_amount", sa.Numeric(12, 2), nullable=False),
            sa.Column("due_date", sa.Date(), nullable=False),
            sa.Column(
                "status",
                sa.String(length=20),
                nullable=False,
                server_default=sa.text("'unpaid'"),
            ),
            sa.Column(
                "late_fee_applied",
                sa.Numeric(12, 2),
                nullable=False,
                server_default=sa.text("0"),
            ),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.func.now(),
            ),
            sa.Column(
                "updated_at",
                sa.DateTime(timezone=True),
                server_default=sa.func.now(),
            ),
            sa.CheckConstraint(
                "installment_number > 0",
                name="ck_fee_invoice_installment_number_positive",
            ),
            sa.CheckConstraint(
                "amount >= 0",
                name="ck_fee_invoice_installment_amount_nonnegative",
            ),
            sa.CheckConstraint(
                "paid_amount >= 0",
                name="ck_fee_invoice_installment_paid_nonnegative",
            ),
            sa.CheckConstraint(
                "outstanding_amount >= 0",
                name="ck_fee_invoice_installment_outstanding_nonnegative",
            ),
            sa.UniqueConstraint(
                "invoice_id",
                "installment_number",
                name="uq_fee_invoice_installment_number",
            ),
        )
        op.create_index(
            "ix_fee_invoice_installments_id",
            "fee_invoice_installments",
            ["id"],
            unique=False,
        )
        op.create_index(
            "ix_fee_invoice_installments_invoice_id",
            "fee_invoice_installments",
            ["invoice_id"],
            unique=False,
        )
        op.create_index(
            "ix_fee_invoice_installments_due_date",
            "fee_invoice_installments",
            ["due_date"],
            unique=False,
        )
    else:
        columns = {
            column["name"]
            for column in inspector.get_columns("fee_invoice_installments")
        }
        required = {
            "id",
            "invoice_id",
            "installment_number",
            "description",
            "amount",
            "paid_amount",
            "outstanding_amount",
            "due_date",
            "status",
            "late_fee_applied",
        }
        if not required.issubset(columns):
            raise RuntimeError(
                "Migration 054 found a pre-existing fee_invoice_installments "
                "table with an unexpected schema; manual reconciliation is required."
            )
        _require_foreign_key(
            inspector, "fee_invoice_installments", "invoice_id", "fee_invoices", "id"
        )

    inspector = sa.inspect(bind)
    allocation_columns = {
        column["name"] for column in inspector.get_columns("payment_allocations")
    }
    if "installment_id" not in allocation_columns:
        op.add_column(
            "payment_allocations",
            sa.Column("installment_id", sa.Integer(), nullable=True),
        )
        op.create_foreign_key(
            "fk_payment_allocations_installment_id",
            "payment_allocations",
            "fee_invoice_installments",
            ["installment_id"],
            ["id"],
            ondelete="RESTRICT",
        )
        op.create_index(
            "ix_payment_allocations_installment_id",
            "payment_allocations",
            ["installment_id"],
            unique=False,
        )
    else:
        _require_foreign_key(
            inspector,
            "payment_allocations",
            "installment_id",
            "fee_invoice_installments",
            "id",
        )

    inspector = sa.inspect(bind)
    if not inspector.has_table("refund_allocations"):
        op.create_table(
            "refund_allocations",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column(
                "refund_id",
                sa.Integer(),
                sa.ForeignKey("refunds.id", ondelete="RESTRICT"),
                nullable=False,
            ),
            sa.Column(
                "payment_allocation_id",
                sa.Integer(),
                sa.ForeignKey("payment_allocations.id", ondelete="RESTRICT"),
                nullable=False,
            ),
            sa.Column("amount", sa.Numeric(12, 2), nullable=False),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.func.now(),
            ),
            sa.CheckConstraint(
                "amount > 0", name="ck_refund_allocation_amount_positive"
            ),
            sa.UniqueConstraint(
                "refund_id",
                "payment_allocation_id",
                name="uq_refund_allocation_original_payment_allocation",
            ),
        )
        op.create_index(
            "ix_refund_allocations_id",
            "refund_allocations",
            ["id"],
            unique=False,
        )
        op.create_index(
            "ix_refund_allocations_refund_id",
            "refund_allocations",
            ["refund_id"],
            unique=False,
        )
        op.create_index(
            "ix_refund_allocations_payment_allocation_id",
            "refund_allocations",
            ["payment_allocation_id"],
            unique=False,
        )
    else:
        columns = {
            column["name"] for column in inspector.get_columns("refund_allocations")
        }
        required = {
            "id",
            "refund_id",
            "payment_allocation_id",
            "amount",
            "created_at",
        }
        if not required.issubset(columns):
            raise RuntimeError(
                "Migration 054 found a pre-existing refund_allocations table "
                "with an unexpected schema; manual reconciliation is required."
            )
        _require_foreign_key(
            inspector, "refund_allocations", "refund_id", "refunds", "id"
        )
        _require_foreign_key(
            inspector,
            "refund_allocations",
            "payment_allocation_id",
            "payment_allocations",
            "id",
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if inspector.has_table("refund_allocations"):
        count = bind.execute(
            sa.text("SELECT count(*) FROM refund_allocations")
        ).scalar_one()
        if count:
            raise RuntimeError(
                "Cannot downgrade migration 054: refund allocation history exists."
            )

    if inspector.has_table("payment_allocations"):
        columns = {
            column["name"] for column in inspector.get_columns("payment_allocations")
        }
        if "installment_id" in columns:
            count = bind.execute(
                sa.text(
                    "SELECT count(*) FROM payment_allocations "
                    "WHERE installment_id IS NOT NULL"
                )
            ).scalar_one()
            if count:
                raise RuntimeError(
                    "Cannot downgrade migration 054: installment payment allocations exist."
                )

    if inspector.has_table("fee_invoice_installments"):
        count = bind.execute(
            sa.text("SELECT count(*) FROM fee_invoice_installments")
        ).scalar_one()
        if count:
            raise RuntimeError(
                "Cannot downgrade migration 054: persisted invoice schedules exist."
            )

    if inspector.has_table("refund_allocations"):
        op.drop_index(
            "ix_refund_allocations_payment_allocation_id",
            table_name="refund_allocations",
        )
        op.drop_index(
            "ix_refund_allocations_refund_id", table_name="refund_allocations"
        )
        op.drop_index("ix_refund_allocations_id", table_name="refund_allocations")
        op.drop_table("refund_allocations")

    if inspector.has_table("payment_allocations"):
        columns = {
            column["name"] for column in inspector.get_columns("payment_allocations")
        }
        if "installment_id" in columns:
            op.drop_index(
                "ix_payment_allocations_installment_id",
                table_name="payment_allocations",
            )
            op.drop_constraint(
                "fk_payment_allocations_installment_id",
                "payment_allocations",
                type_="foreignkey",
            )
            op.drop_column("payment_allocations", "installment_id")

    if inspector.has_table("fee_invoice_installments"):
        op.drop_index(
            "ix_fee_invoice_installments_due_date",
            table_name="fee_invoice_installments",
        )
        op.drop_index(
            "ix_fee_invoice_installments_invoice_id",
            table_name="fee_invoice_installments",
        )
        op.drop_index(
            "ix_fee_invoice_installments_id",
            table_name="fee_invoice_installments",
        )
        op.drop_table("fee_invoice_installments")
