# Database Design & Schema Specification

**Database Engine**: PostgreSQL 16  
**ORM**: SQLAlchemy 2.0 (Async Engine via `asyncpg`)  
**Migration Framework**: Alembic  
**Precision Standard**: `Numeric(12, 2)` for all monetary values  

---

## 1. Entity-Relationship Model Overview

The database contains 25 normalized tables partitioned into 5 core functional clusters:

```
[Core / Academic Hierarchy]
institutions ──< academic_years
academic_years ──< standards ──< divisions
standards ──< subjects

[Student Lifecycle]
students ──< guardians
students ──< student_enrollments >── divisions
student_enrollments ──< attendance

[Assessment Subsystem]
examinations ──< exam_marks >── student_enrollments

[Financial Ledger Subsystem]
fee_categories ──< fee_structures
fee_structures ──< student_fee_assignments >── students
students ──< fee_invoices ──< fee_invoice_items
fee_invoices ──< fee_installments
students ──< payments ──< payment_allocations >── fee_invoices
payments ──< payment_receipts

[Security & Governance]
users ──< audit_logs
roles ──< permissions
```

---

## 2. Table Catalog & Key Constraints

### 2.1 Financial Ledger Tables

#### `fee_invoices`
- Primary immutable fee obligation for an enrolled student.
- Columns:
  - `id`: BigInt Primary Key
  - `invoice_number`: Varchar(50) Unique
  - `student_id`: Int FK -> `students(id)`
  - `academic_year_id`: Int FK -> `academic_years(id)`
  - `total_amount`: Numeric(12, 2) NOT NULL
  - `discount_amount`: Numeric(12, 2) DEFAULT 0.00
  - `net_amount`: Numeric(12, 2) NOT NULL
  - `paid_amount`: Numeric(12, 2) DEFAULT 0.00
  - `outstanding_amount`: Numeric(12, 2) NOT NULL
  - `status`: Varchar(20) (`unpaid`, `partial`, `paid`, `cancelled`)
  - `issue_date`: Date NOT NULL
  - `due_date`: Date

#### `fee_installments`
- Breakdown of invoice into scheduled payment milestones.
- Columns:
  - `id`: BigInt Primary Key
  - `invoice_id`: BigInt FK -> `fee_invoices(id)` ON DELETE CASCADE
  - `installment_number`: Int NOT NULL
  - `amount`: Numeric(12, 2) NOT NULL
  - `paid_amount`: Numeric(12, 2) DEFAULT 0.00
  - `due_date`: Date NOT NULL
  - `status`: Varchar(20) (`unpaid`, `partial`, `paid`, `overdue`)

#### `payments`
- Immutable ledger entries recording real-world financial inflow.
- Columns:
  - `id`: BigInt Primary Key
  - `student_id`: Int FK -> `students(id)`
  - `academic_year_id`: Int FK -> `academic_years(id)`
  - `amount`: Numeric(12, 2) NOT NULL
  - `payment_date`: Date NOT NULL
  - `payment_method`: Varchar(30) (`cash`, `upi`, `bank_transfer`, `cheque`, `other`)
  - `transaction_reference`: Varchar(100)
  - `status`: Varchar(20) (`completed`, `reversed`)
  - `reversed_at`: Timestamp
  - `reversal_reason`: Text
  - `collected_by_id`: Int FK -> `users(id)`

#### `payment_allocations`
- Links a payment to specific invoices and installments.
- Columns:
  - `id`: BigInt Primary Key
  - `payment_id`: BigInt FK -> `payments(id)` ON DELETE CASCADE
  - `invoice_id`: BigInt FK -> `fee_invoices(id)`
  - `installment_id`: BigInt FK -> `fee_installments(id)`
  - `allocated_amount`: Numeric(12, 2) NOT NULL

#### `payment_receipts`
- Official immutable receipt records.
- Columns:
  - `id`: BigInt Primary Key
  - `receipt_number`: Varchar(50) Unique (`RCP-{AY}-{SEQ}`)
  - `payment_id`: BigInt FK -> `payments(id)`
  - `student_id`: Int FK -> `students(id)`
  - `amount`: Numeric(12, 2) NOT NULL
  - `receipt_data`: JSONB (full immutable receipt snapshot)

---

## 3. Database Indexing Strategy

1. **Unique Indexes**:
   - `students(admission_number)`
   - `fee_invoices(invoice_number)`
   - `payment_receipts(receipt_number)`
   - `academic_years(institution_id, name)`
2. **Foreign Key Indexes**:
   - `student_enrollments(student_id, academic_year_id)`
   - `payments(student_id, academic_year_id)`
   - `payment_allocations(payment_id, invoice_id)`
   - `attendance(student_id, date)`
3. **Audit Indexes**:
   - `audit_logs(user_id, created_at)`
   - `audit_logs(resource_type, resource_id)`

