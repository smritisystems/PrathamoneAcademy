---
title: "Database Migration and Rollback Plan"
module: "16_DATABASE_API"
category: "MIGRATION-PLAN"
document_type: "PLAN"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-09"
updated_date: "2026-11-09"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["database", "alembic", "migration", "rollback", "schema", "financial-integrity"]
entities: ["Payment", "PaymentReceipt", "FinancialPeriod"]
api_routes: ["/api/v1/payments", "/api/v1/fees"]
related_modules: ["09_FEES_PAYMENTS", "10_FINANCE_ACCOUNTING"]
---

# Database Migration and Rollback Plan
## Alembic Migration Specification, Zero-Downtime DDL, and Reversible Rollback Procedures

**Product:** PrathamOne EduOS  
**Edition:** Coaching Institute Edition  
**Baseline Version:** 1.0.0  
**Product Architect:** Jawahar R Mallah  
**Organization:** AITDL — AI Technology & Development Lab  
**Migration ID:** `033_financial_transaction_integrity`  

---

## 1. MIGRATION OBJECTIVES & SCOPE

This migration safely extends the production PostgreSQL 16 schema to implement the Master Command on Financial Transaction Integrity without modifying, truncating, or corrupting existing live financial records (171 payments totaling ₹1,824,500.00).

### Schema Modifications:
1. **`payments` Table Enhancements:**
   - Add `reversal_of_payment_id` (`INTEGER`, foreign key referencing `payments.id` on delete set null).
   - Add `replacement_payment_id` (`INTEGER`, foreign key referencing `payments.id` on delete set null).
   - Add `idempotency_key` (`VARCHAR(100)`, nullable, unique index scoped to `(institution_id, idempotency_key)`).
2. **`payment_receipts` Table Enhancements:**
   - Add `cancelled_at` (`TIMESTAMPTZ`, nullable).
   - Add `cancelled_by_id` (`INTEGER`, foreign key referencing `users.id` on delete set null).
   - Add `cancellation_reason` (`TEXT`, nullable).
3. **New Table: `financial_periods`:**
   - Canonical table supporting monthly and annual accounting period closure to prevent tampering with historical records.

---

## 2. ALEMBIC MIGRATION SCRIPT SPECIFICATION

**Target File:** `backend/alembic/versions/033_financial_transaction_integrity.py`  
**Revision:** `033_financial_transaction_integrity`  
**Down Revision:** `032_unified_audit_log_view`  

```python
"""Financial Transaction Integrity: Reversal lineage, receipt cancellation, and period locking

Revision ID: 033_financial_transaction_integrity
Revises: 032_unified_audit_log_view
Create Date: 2026-11-09 18:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector

revision = "033_financial_transaction_integrity"
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
            sa.Column("period_type", sa.String(length=20), default="monthly", nullable=False),
            sa.Column("start_date", sa.Date(), nullable=False),
            sa.Column("end_date", sa.Date(), nullable=False),
            sa.Column("is_closed", sa.Boolean(), default=False, nullable=False, index=True),
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
```

---

## 3. ROLLBACK & DEPLOYMENT VERIFICATION PROTOCOL

### Pre-Migration Safeguards
1. **Hot Logical Backup:**
   ```bash
   docker exec prashant_academy_db pg_dump -U postgres -d prashant_academy -F c -b -v -f /tmp/backup_pre_033.dump
   ```
2. **Reconciliation Verification Check:**
   Verify payment sum equals ₹1,824,500.00 before executing migration:
   ```bash
   python tools/forensic_financial_audit.py
   ```

### Execution Steps
```bash
docker exec prashant_academy_backend alembic upgrade head
```

### Rollback Steps (In the event of an anomaly)
```bash
docker exec prashant_academy_backend alembic downgrade 032_unified_audit_log_view
```
Verify schema and test suite to confirm zero data alteration.
