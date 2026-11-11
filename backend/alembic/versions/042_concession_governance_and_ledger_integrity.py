# /**
#  * @file        042_concession_governance_and_ledger_integrity.py
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
#  * @description Extends concession, waiver, scholarship, sponsor settlement, refund idempotency, currency settings, and RBAC permission governance tables cleanly.
#  */

"""Concession Governance and Ledger Integrity

Revision ID: 042_concession_governance
Revises: 041_subject_dedup
Create Date: 2026-11-11 14:40:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector

revision = "042_concession_governance"
down_revision = "041_subject_dedup"
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    existing_tables = set(inspector.get_table_names())

    # 1. Extend fee_concession_types with explicit benefit_type
    if "fee_concession_types" in existing_tables:
        cols = {c["name"] for c in inspector.get_columns("fee_concession_types")}
        if "benefit_type" not in cols:
            op.add_column(
                "fee_concession_types",
                sa.Column("benefit_type", sa.String(length=30), nullable=False, server_default="fee_concession"),
            )
            conn.execute(sa.text("""
                UPDATE fee_concession_types
                SET benefit_type = CASE
                    WHEN category = 'fee_waiver' OR calculation_type = 'full_waiver' THEN 'fee_waiver'
                    WHEN funding_source IN ('external_sponsor', 'government') OR category = 'external_sponsor' THEN 'sponsor_funding'
                    WHEN category = 'merit' OR code ILIKE '%SCHOLAR%' THEN 'scholarship'
                    ELSE 'fee_concession'
                END;
            """))

    # 2. Extend fee_concession_applications with benefit classification, reversals, cancellations, expiry, idempotency
    if "fee_concession_applications" in existing_tables:
        cols = {c["name"] for c in inspector.get_columns("fee_concession_applications")}
        if "benefit_type" not in cols:
            op.add_column("fee_concession_applications", sa.Column("benefit_type", sa.String(length=30), nullable=False, server_default="fee_concession"))
            op.create_index("ix_fee_concession_applications_benefit_type", "fee_concession_applications", ["benefit_type"])
        if "waiver_scope" not in cols:
            op.add_column("fee_concession_applications", sa.Column("waiver_scope", sa.String(length=30), nullable=True))
        if "fee_category_id" not in cols:
            op.add_column("fee_concession_applications", sa.Column("fee_category_id", sa.Integer(), sa.ForeignKey("fee_categories.id", ondelete="SET NULL"), nullable=True))
            op.create_index("ix_fee_concession_applications_fee_category_id", "fee_concession_applications", ["fee_category_id"])
        if "reversed_amount" not in cols:
            op.add_column("fee_concession_applications", sa.Column("reversed_amount", sa.Numeric(12, 2), nullable=False, server_default="0.00"))
        if "sponsor_settlement_status" not in cols:
            op.add_column("fee_concession_applications", sa.Column("sponsor_settlement_status", sa.String(length=30), nullable=False, server_default="not_applicable"))
        if "idempotency_key" not in cols:
            op.add_column("fee_concession_applications", sa.Column("idempotency_key", sa.String(length=100), nullable=True))
            op.create_index("ix_fee_concession_applications_idempotency_key", "fee_concession_applications", ["idempotency_key"])
        if "cancelled_by_id" not in cols:
            op.add_column("fee_concession_applications", sa.Column("cancelled_by_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True))
        if "cancelled_at" not in cols:
            op.add_column("fee_concession_applications", sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True))
        if "cancellation_reason" not in cols:
            op.add_column("fee_concession_applications", sa.Column("cancellation_reason", sa.Text(), nullable=True))
        if "expired_at" not in cols:
            op.add_column("fee_concession_applications", sa.Column("expired_at", sa.DateTime(timezone=True), nullable=True))

        # Backfill benefit_type and sponsor_settlement_status from concession_type
        conn.execute(sa.text("""
            UPDATE fee_concession_applications a
            SET
                benefit_type = COALESCE(t.benefit_type, 'fee_concession'),
                waiver_scope = CASE
                    WHEN COALESCE(t.benefit_type, '') = 'fee_waiver' AND t.calculation_type = 'full_waiver' THEN 'full_waiver'
                    WHEN COALESCE(t.benefit_type, '') = 'fee_waiver' THEN 'partial_waiver'
                    ELSE NULL
                END,
                sponsor_settlement_status = CASE
                    WHEN a.funding_source IN ('external_sponsor', 'government') THEN
                        CASE
                            WHEN COALESCE(a.sponsor_received_amount, 0) >= COALESCE(a.sponsor_sanctioned_amount, a.approved_amount, 0) AND COALESCE(a.sponsor_sanctioned_amount, a.approved_amount, 0) > 0 THEN 'settled'
                            WHEN COALESCE(a.sponsor_received_amount, 0) > 0 THEN 'partial'
                            ELSE 'pending'
                        END
                    ELSE 'not_applicable'
                END
            FROM fee_concession_types t
            WHERE a.concession_type_id = t.id;
        """))

    # 3. Extend fee_concession_allocations with immutable ledger transaction metadata & reversal chain
    if "fee_concession_allocations" in existing_tables:
        cols = {c["name"] for c in inspector.get_columns("fee_concession_allocations")}
        if "transaction_ref" not in cols:
            op.add_column("fee_concession_allocations", sa.Column("transaction_ref", sa.String(length=60), nullable=True))
            op.create_index("ix_fee_concession_allocations_transaction_ref", "fee_concession_allocations", ["transaction_ref"], unique=True)
        if "fee_category_id" not in cols:
            op.add_column("fee_concession_allocations", sa.Column("fee_category_id", sa.Integer(), sa.ForeignKey("fee_categories.id", ondelete="SET NULL"), nullable=True))
        if "invoice_item_id" not in cols:
            op.add_column("fee_concession_allocations", sa.Column("invoice_item_id", sa.Integer(), sa.ForeignKey("fee_invoice_items.id", ondelete="SET NULL"), nullable=True))
        if "transaction_type" not in cols:
            op.add_column("fee_concession_allocations", sa.Column("transaction_type", sa.String(length=40), nullable=False, server_default="fee_concession"))
            op.create_index("ix_fee_concession_allocations_transaction_type", "fee_concession_allocations", ["transaction_type"])
        if "posting_status" not in cols:
            op.add_column("fee_concession_allocations", sa.Column("posting_status", sa.String(length=20), nullable=False, server_default="posted"))
            op.create_index("ix_fee_concession_allocations_posting_status", "fee_concession_allocations", ["posting_status"])
        if "effective_date" not in cols:
            op.add_column("fee_concession_allocations", sa.Column("effective_date", sa.Date(), nullable=True))
        if "reversed_by_id" not in cols:
            op.add_column("fee_concession_allocations", sa.Column("reversed_by_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True))
        if "reversed_at" not in cols:
            op.add_column("fee_concession_allocations", sa.Column("reversed_at", sa.DateTime(timezone=True), nullable=True))
        if "reversal_reason" not in cols:
            op.add_column("fee_concession_allocations", sa.Column("reversal_reason", sa.Text(), nullable=True))
        if "reversal_of_allocation_id" not in cols:
            op.add_column("fee_concession_allocations", sa.Column("reversal_of_allocation_id", sa.Integer(), sa.ForeignKey("fee_concession_allocations.id", ondelete="SET NULL"), nullable=True))

        # Backfill existing allocation transaction references, types, and effective dates
        conn.execute(sa.text("""
            UPDATE fee_concession_allocations fca
            SET
                transaction_ref = COALESCE(fca.transaction_ref, 'CTXN-2026-' || LPAD(fca.id::text, 4, '0')),
                transaction_type = COALESCE(a.benefit_type, 'fee_concession'),
                posting_status = 'posted',
                effective_date = COALESCE(fca.effective_date, DATE(fca.allocated_at AT TIME ZONE 'UTC')),
                fee_category_id = COALESCE(fca.fee_category_id, a.fee_category_id)
            FROM fee_concession_applications a
            WHERE fca.application_id = a.id;
        """))

    # 4. Create sponsor_settlements ledger table
    if "sponsor_settlements" not in existing_tables:
        op.create_table(
            "sponsor_settlements",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("institution_id", sa.Integer(), sa.ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True),
            sa.Column("application_id", sa.Integer(), sa.ForeignKey("fee_concession_applications.id", ondelete="RESTRICT"), nullable=False, index=True),
            sa.Column("settlement_ref", sa.String(length=60), nullable=False, unique=True, index=True),
            sa.Column("amount", sa.Numeric(12, 2), nullable=False),
            sa.Column("received_date", sa.Date(), nullable=False),
            sa.Column("payment_method", sa.String(length=30), nullable=False, server_default="bank_transfer"),
            sa.Column("reference_number", sa.String(length=100), nullable=True),
            sa.Column("remarks", sa.Text(), nullable=True),
            sa.Column("recorded_by_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
            sa.Column("status", sa.String(length=20), nullable=False, server_default="completed", index=True),
            sa.Column("reversed_by_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
            sa.Column("reversed_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("reversal_reason", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )

    # 5. Extend refunds with idempotency_key
    if "refunds" in existing_tables:
        cols = {c["name"] for c in inspector.get_columns("refunds")}
        if "idempotency_key" not in cols:
            op.add_column("refunds", sa.Column("idempotency_key", sa.String(length=100), nullable=True))
            op.create_index("ix_refunds_idempotency_key", "refunds", ["idempotency_key"])

    # 6. Seed currency & precision defaults into institution_settings idempotently
    if "institution_settings" in existing_tables and "institutions" in existing_tables:
        conn.execute(sa.text("""
            INSERT INTO institution_settings (institution_id, category, key, value, data_type, is_secret, scope, description)
            SELECT i.id, 'fees', s.k, s.v, s.vt, false, 'institute', s.d
            FROM institutions i
            CROSS JOIN (
                VALUES
                    ('currency_code', 'INR', 'string', 'ISO 4217 currency code for financial reporting'),
                    ('currency_symbol', '₹', 'string', 'Currency symbol displayed in statements and dashboards'),
                    ('currency_precision', '2', 'number', 'Decimal precision used for fee and concession rounding')
            ) AS s(k, v, vt, d)
            WHERE NOT EXISTS (
                SELECT 1 FROM institution_settings ex
                WHERE ex.institution_id = i.id AND ex.key = s.k
            );
        """))

    # 7. Seed granular concession RBAC permissions
    if "permissions" in existing_tables and "roles" in existing_tables:
        conn.execute(sa.text("""
            INSERT INTO permissions (role_id, resource, action, created_at)
            SELECT r.id, p.res, p.act, NOW()
            FROM roles r
            CROSS JOIN (
                VALUES
                    ('superadmin', 'concessions', 'view'),
                    ('superadmin', 'concessions', 'nominate'),
                    ('superadmin', 'concessions', 'verify'),
                    ('superadmin', 'concessions', 'approve'),
                    ('superadmin', 'concessions', 'apply'),
                    ('superadmin', 'concessions', 'reverse'),
                    ('superadmin', 'concessions', 'cancel'),
                    ('superadmin', 'concessions', 'reports'),
                    ('superadmin', 'concessions', 'sponsor_settle'),
                    ('admin', 'concessions', 'view'),
                    ('admin', 'concessions', 'nominate'),
                    ('admin', 'concessions', 'verify'),
                    ('admin', 'concessions', 'approve'),
                    ('admin', 'concessions', 'apply'),
                    ('admin', 'concessions', 'reverse'),
                    ('admin', 'concessions', 'cancel'),
                    ('admin', 'concessions', 'reports'),
                    ('admin', 'concessions', 'sponsor_settle'),
                    ('principal', 'concessions', 'view'),
                    ('principal', 'concessions', 'nominate'),
                    ('principal', 'concessions', 'verify'),
                    ('principal', 'concessions', 'approve'),
                    ('principal', 'concessions', 'apply'),
                    ('principal', 'concessions', 'reports'),
                    ('accountant', 'concessions', 'view'),
                    ('accountant', 'concessions', 'nominate'),
                    ('accountant', 'concessions', 'verify'),
                    ('accountant', 'concessions', 'apply'),
                    ('accountant', 'concessions', 'reverse'),
                    ('accountant', 'concessions', 'reports'),
                    ('accountant', 'concessions', 'sponsor_settle'),
                    ('staff', 'concessions', 'view'),
                    ('staff', 'concessions', 'nominate')
            ) AS p(role_name, res, act)
            WHERE r.name = p.role_name
              AND NOT EXISTS (
                  SELECT 1 FROM permissions ex
                  WHERE ex.role_id = r.id AND ex.resource = p.res AND ex.action = p.act
              );
        """))


def downgrade():
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    existing_tables = set(inspector.get_table_names())

    if "sponsor_settlements" in existing_tables:
        op.drop_table("sponsor_settlements")

    if "refunds" in existing_tables:
        cols = {c["name"] for c in inspector.get_columns("refunds")}
        if "idempotency_key" in cols:
            op.drop_index("ix_refunds_idempotency_key", table_name="refunds")
            op.drop_column("refunds", "idempotency_key")

    if "fee_concession_allocations" in existing_tables:
        for col in [
            "reversal_of_allocation_id", "reversal_reason", "reversed_at", "reversed_by_id",
            "effective_date", "posting_status", "transaction_type", "invoice_item_id",
            "fee_category_id", "transaction_ref",
        ]:
            cols = {c["name"] for c in inspector.get_columns("fee_concession_allocations")}
            if col in cols:
                op.drop_column("fee_concession_allocations", col)

    if "fee_concession_applications" in existing_tables:
        for col in [
            "expired_at", "cancellation_reason", "cancelled_at", "cancelled_by_id",
            "idempotency_key", "sponsor_settlement_status", "reversed_amount",
            "fee_category_id", "waiver_scope", "benefit_type",
        ]:
            cols = {c["name"] for c in inspector.get_columns("fee_concession_applications")}
            if col in cols:
                op.drop_column("fee_concession_applications", col)

    if "fee_concession_types" in existing_tables:
        cols = {c["name"] for c in inspector.get_columns("fee_concession_types")}
        if "benefit_type" in cols:
            op.drop_column("fee_concession_types", "benefit_type")
