---
title: "Existing Table and Field Reuse Matrix"
module: "09_FEES_PAYMENTS"
category: "DATA-DICTIONARY"
document_type: "MATRIX"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-09"
updated_date: "2026-11-09"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["data-dictionary", "schema", "ssot", "reuse-matrix", "payments", "fees"]
entities: ["Payment", "PaymentReceipt", "PaymentAllocation", "FeeInvoice", "FeeInvoiceItem", "Refund", "StudentFeeAssignment", "FeeStructure", "FeeCategory"]
api_routes: ["/api/v1/payments", "/api/v1/fees"]
related_modules: ["10_FINANCE_ACCOUNTING", "16_DATABASE_API"]
---

# Existing Table and Field Reuse Matrix
## Canonical Data Dictionary, Field Ownership, and Entity Classification

**Product:** PrathamOne EduOS  
**Edition:** Coaching Institute Edition  
**Baseline Version:** 1.0.0  
**Product Architect:** Jawahar R Mallah  
**Organization:** AITDL — AI Technology & Development Lab  
**Policy Status:** MANDATORY SSOT ANTI-DUPLICATION COMPLIANCE  

---

## 1. PURPOSE & SSOT CLASSIFICATION RULES

In strict compliance with **RULE 001 (Single Source of Truth)** and **RULE 002 (Mandatory Reuse Before Creation)**, this matrix establishes the definitive, canonical catalog of every table and field within the financial transaction domain of PrathamOne EduOS.

Under **RULE 004**, every entity is classified into one of six operational tiers:
1. **Master Table:** Canonical root entity definitions (e.g., institutions, fee structures, categories).
2. **Relationship Table:** Connects master entities (e.g., student fee assignments).
3. **Transaction Table:** Event vouchers representing monetary inflows or outflows (e.g., payments, refunds).
4. **Ledger Table:** Cumulative, stateful accounting records tracking balances (e.g., fee invoices, allocations).
5. **Snapshot Table:** Immutable historical records of generated outputs (e.g., payment receipts).
6. **Audit Table:** Chronological change logs (e.g., audit logs).

---

## 2. CANONICAL FINANCIAL ENTITY REUSE MATRIX

| Table Name | Entity Tier | Canonical Purpose | Record Count | Reuse Strategy | Retired Equivalent (Do Not Re-create) |
| :--- | :--- | :--- | :---: | :--- | :--- |
| `fee_categories` | Master | Fee classification heads (Tuition, Transport, Lab) | 7 | Universal category master across institute | Parallel category tables |
| `fee_structures` | Master | Standard fee catalog per grade/board/academic year | 39 | Base pricing template for student assignments | Standalone fee package tables |
| `student_fee_assignments` | Relationship | Links student to fee structure with tailored concessions | 40 | Authoritative student fee package and discount source | Legacy `discounts` & `scholarships` tables |
| `fee_invoices` | Ledger | Cumulative receivable balance, paid sum, and net dues | 39 | Primary accounting ledger for student fee obligations | Legacy installment balance tracking tables |
| `fee_invoice_items` | Ledger Item | Itemized line breakdown of fee heads and charges | 39 | Itemized obligations under an invoice | Retired `fee_installments` table |
| `payments` | Transaction | Financial inflow vouchers & workflow lifecycle | 171 | Single authoritative transaction voucher table | Parallel fee receipt voucher tables |
| `payment_allocations` | Relationship | Resolves payment amounts against specific invoices | 171 | Many-to-many DAG settlement of invoices | Direct invoice row mutation without allocation |
| `payment_receipts` | Snapshot | Immutable print/export snapshot with versioning | 171 | Numbered historical receipts with supersession | Dynamic invoice join printing |
| `refunds` | Transaction | Financial outflow vouchers & disbursement lifecycle | 0 | Authoritative refund tracking & multi-partial refunds | Negative payments or manual balance edits |
| `audit_logs` | Audit | Chronological record of administrative & financial actions | 325 | Unified system audit timeline | Isolated module audit tables |

---

## 3. FIELD-BY-FIELD CANONICAL ATTRIBUTION

### 3.1 Table: `payments` (Transaction Voucher)
Authoritative transaction voucher recording cash, bank, or online collections.

| Column Name | PostgreSQL Type | Nullable | Default | Canonical Role & Governance |
| :--- | :--- | :---: | :--- | :--- |
| `id` | `integer` | NO | `nextval()` | Unique surrogate transaction identifier |
| `student_id` | `integer` | NO | None | FK $\rightarrow$ `students.id`. Canonical payer identity |
| `academic_year_id` | `integer` | NO | None | FK $\rightarrow$ `academic_years.id`. Financial accounting year |
| `amount` | `numeric(12,2)` | NO | None | Posted currency amount in INR. **IMMUTABLE ONCE POSTED** |
| `payment_date` | `date` | NO | None | Transaction execution date |
| `payment_method` | `varchar(30)` | NO | None | `cash`, `upi`, `bank_transfer`, `cheque`, `demand_draft` |
| `transaction_reference` | `varchar(200)` | YES | None | Bank UTR, UPI reference, or gateway payment ID |
| `bank_name` | `varchar(100)` | YES | None | Name of drawee/issuing bank |
| `cheque_number` | `varchar(50)` | YES | None | Instrument number for cheques or demand drafts |
| `cheque_date` | `date` | YES | None | Clearing date on cheque instrument |
| `notes` | `text` | YES | None | Operator remarks or special collection terms |
| `status` | `varchar(20)` | NO | `'posted'` | Workflow state: `draft`, `submitted`, `approved`, `posted`, `completed`, `reversed` |
| `submitted_at` | `timestamptz` | YES | None | Timestamp of workflow submission |
| `submitted_by_id` | `integer` | YES | None | FK $\rightarrow$ `users.id`. Staff member who entered the voucher |
| `approved_at` | `timestamptz` | YES | None | Timestamp of administrative approval |
| `approved_by_id` | `integer` | YES | None | FK $\rightarrow$ `users.id`. Administrator who approved |
| `posted_at` | `timestamptz` | YES | None | Timestamp when transaction affected ledger balances |
| `posted_by_id` | `integer` | YES | None | FK $\rightarrow$ `users.id`. Accountant who posted transaction |
| `last_edited_at` | `timestamptz` | YES | None | Timestamp of latest amendment |
| `last_edited_by_id` | `integer` | YES | None | FK $\rightarrow$ `users.id`. User executing amendment |
| `edit_count` | `integer` | NO | `0` | Sequential counter of modifications |
| `reversed_at` | `timestamptz` | YES | None | Timestamp of reversal |
| `reversal_reason` | `text` | YES | None | Mandatory audit justification for reversal |
| `reversed_by_id` | `integer` | YES | None | FK $\rightarrow$ `users.id`. Authorizing administrator |
| `collected_by_id` | `integer` | YES | None | FK $\rightarrow$ `users.id`. Front-desk cashier receiving funds |
| `is_demo` | `boolean` | NO | `false` | Data environment segregation flag |
| `data_environment` | `varchar(20)` | NO | `'PRODUCTION'` | Multi-environment isolation tag |
| `demo_dataset_id` | `varchar(100)` | YES | None | Demo dataset grouping identifier |
| `created_at` | `timestamptz` | YES | `now()` | System creation audit timestamp |

---

### 3.2 Table: `payment_receipts` (Immutable Snapshot)
Historical snapshot of issued receipts. **Never deleted; never overwritten.**

| Column Name | PostgreSQL Type | Nullable | Default | Canonical Role & Governance |
| :--- | :--- | :---: | :--- | :--- |
| `id` | `integer` | NO | `nextval()` | Unique receipt identifier |
| `receipt_number` | `varchar(50)` | NO | None | Unique formatted number (`REC-YYYYMMDD-XXXXXX`). **UNIQUE** |
| `payment_id` | `integer` | NO | None | FK $\rightarrow$ `payments.id`. Linked transaction voucher |
| `student_id` | `integer` | NO | None | FK $\rightarrow$ `students.id`. Canonical recipient student |
| `amount` | `numeric(12,2)` | NO | None | Receipt snapshot face amount |
| `payment_date` | `date` | NO | None | Snapshot payment execution date |
| `payment_method` | `varchar(30)` | NO | None | Snapshot payment method |
| `receipt_data` | `text` | YES | None | JSON snapshot of allocations, student meta, institute branding |
| `version` | `integer` | NO | `1` | Sequential receipt version (1, 2, 3...) |
| `status` | `varchar(20)` | NO | `'valid'` | Status: `valid`, `superseded`, `voided`, `cancelled` |
| `superseded_at` | `timestamptz` | YES | None | Timestamp when higher version replaced this receipt |
| `superseded_by_receipt_number` | `varchar(50)` | YES | None | Pointer to replacement receipt number |
| `reprint_count` | `integer` | NO | `0` | Number of duplicate physical reprint copies requested |
| `is_demo` | `boolean` | NO | `false` | Data environment segregation flag |
| `data_environment` | `varchar(20)` | NO | `'PRODUCTION'` | Multi-environment isolation tag |
| `demo_dataset_id` | `varchar(100)` | YES | None | Demo dataset grouping identifier |
| `generated_at` | `timestamptz` | YES | `now()` | System generation timestamp |

---

### 3.3 Table: `refunds` (Disbursement Voucher)
Authoritative refund tracking table for full and partial returns.

| Column Name | PostgreSQL Type | Nullable | Default | Canonical Role & Governance |
| :--- | :--- | :---: | :--- | :--- |
| `id` | `integer` | NO | `nextval()` | Unique refund voucher ID |
| `institution_id` | `integer` | NO | None | FK $\rightarrow$ `institutions.id`. Multi-tenant boundary |
| `student_id` | `integer` | NO | None | FK $\rightarrow$ `students.id`. Recipient student |
| `enrollment_id` | `integer` | YES | None | FK $\rightarrow$ `student_enrollments.id`. Academic context |
| `payment_id` | `integer` | YES | None | FK $\rightarrow$ `payments.id`. Source collection voucher |
| `invoice_id` | `integer` | YES | None | FK $\rightarrow$ `fee_invoices.id`. Impacted invoice ledger |
| `amount` | `numeric(12,2)` | NO | None | Refunded amount. Cannot exceed eligible collection |
| `refund_date` | `date` | NO | None | Disbursement date |
| `refund_method` | `varchar(30)` | NO | None | `bank_transfer`, `cash`, `cheque`, `upi`, `gateway_reversal` |
| `reference_number` | `varchar(100)` | YES | None | Outward bank UTR or cheque reference |
| `reason` | `varchar(200)` | YES | None | High-level reason (e.g., Admission Withdrawal, Overpayment) |
| `status` | `varchar(20)` | NO | `'completed'` | States: `requested`, `approved`, `completed`, `rejected`, `failed`, `cancelled` |
| `notes` | `text` | YES | None | Detailed operational notes |
| `requested_by_id` | `integer` | YES | None | FK $\rightarrow$ `users.id`. Staff member submitting request |
| `approved_by_id` | `integer` | YES | None | FK $\rightarrow$ `users.id`. Administrator approving request |
| `approved_at` | `timestamptz` | YES | None | Timestamp of approval |
| `rejection_reason` | `text` | YES | None | Reason if rejected |
| `processed_by_id` | `integer` | YES | None | FK $\rightarrow$ `users.id`. Cashier/Accountant disbursing funds |
| `created_at` | `timestamptz` | NO | `now()` | Creation audit timestamp |
| `updated_at` | `timestamptz` | NO | `now()` | Update audit timestamp |

---

## 4. RETIRED ENTITIES & PROHIBITED ANTI-PATTERNS

| Retired / Anti-Pattern Entity | Status | Reason for Retirement | Authoritative SSOT Replacement |
| :--- | :--- | :--- | :--- |
| `discounts` | **DROPPED** | Empty legacy table duplicating assignment concessions | `student_fee_assignments.concession_amount` |
| `scholarships` | **DROPPED** | Empty legacy table duplicating assignment concessions | `student_fee_assignments.concession_amount` & `remarks` |
| `fee_installments` | **DROPPED** | Overlapping schedule duplicating invoice item obligations | `fee_invoices` & `fee_invoice_items` |
| `advance_payments` | **ABSENT** | Inflows must reside in canonical `payments` table | `payments` with unallocated balance |
| In-place amount overwrite | **PROHIBITED** | Violates immutable ledger rules; obscures historical balances | Reversal voucher + replacement payment voucher |
| Receipt row deletion | **PROHIBITED** | Violates audit trails & compliance standards | Mark receipt as `superseded`, `voided`, or `cancelled` |
