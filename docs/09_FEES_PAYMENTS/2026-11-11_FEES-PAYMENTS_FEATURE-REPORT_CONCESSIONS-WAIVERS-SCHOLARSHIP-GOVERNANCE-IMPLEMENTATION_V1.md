---
title: "Centralized Concessions, Fee Waivers & Scholarship Financial Governance — Implementation & Reconciliation Report"
module: "09_FEES_PAYMENTS"
category: "FEATURE-REPORT"
document_type: "REPORT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-11"
updated_date: "2026-11-11"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["concessions", "fee-waivers", "scholarships", "sponsor-funding", "reconciliation", "SSOT", "financial-governance", "reports"]
entities: ["FeeConcessionType", "StudentConcessionApplication", "FeeConcessionAllocation", "SponsorSettlement", "FeeInvoice", "FeeInvoiceItem", "Payment", "PaymentAllocation", "PaymentReceipt", "Refund", "AuditLog"]
api_routes: ["/api/v1/fees/concessions/*", "/api/v1/fees/*", "/api/v1/payments/*", "/api/v1/dashboard/*", "/api/v1/students/*/profile", "/api/v1/student-portal/fees", "/api/v1/leads/*/convert-to-admission", "/api/v1/reports/concessions/*"]
related_modules: ["01_ARCHITECTURE", "03_ACADEMIC_MANAGEMENT", "04_STUDENT_MANAGEMENT", "09_FEES_PAYMENTS", "10_FINANCE_ACCOUNTING", "11_REPORTS_EXPORTS", "12_RBAC_SECURITY"]
---

# CENTRALIZED CONCESSIONS, FEE WAIVERS & SCHOLARSHIP FINANCIAL GOVERNANCE — IMPLEMENTATION & RECONCILIATION REPORT

**Product:** PrathamOne EduOS (Coaching Institute Edition v1.0.0)  
**Architect & Author:** Jawahar R. Mallah — AITDL (AI Technology & Development Lab)  
**Pre-Implementation Backup:** `data/backups/prashant_academy_pre_concession_governance_2026-11-11.sql` (`2,114,740` bytes)  
**Active Alembic Head:** `042_concession_governance` (reversible to `041_subject_dedup`)  
**Phase 1 Audit Reference:** `docs/09_FEES_PAYMENTS/2026-11-11_FEES-PAYMENTS_AUDIT-REPORT_CONCESSIONS-WAIVERS-SCHOLARSHIP-GOVERNANCE-AUDIT_V1.md`

---

## 1. Executive Summary

This release implements full end-to-end **Single Source of Truth (SSOT)** financial governance for Concessions, Fee Waivers, Academy Scholarships, External Sponsor & Government Funding, Manual Fee Adjustments, Receipts, Refunds, Cancellations, and Reversals across database schema, domain services, API endpoints, dashboards, student portals, receipts, and 20 Enterprise Reports.

Key invariants enforced across the platform:
1. **Strict Transaction Classification:** Separate accounting classifications for `fee_concession`, `fee_waiver` (`full_waiver` / `partial_waiver`), `scholarship`, `sponsor_funding`, manual fee adjustments, fee receipts, completed refunds, overpayment credit adjustments, reversals, and cancellations.
2. **Approval != Financial Application:** Approving a concession or scholarship records `approved_amount` (`status = 'approved'`) without lowering student invoice balances until posted (`FeeConcessionAllocation` with `posting_status = 'posted'`), maintaining an auditable gap (`approved_unapplied`).
3. **Immutable Non-Destructive Ledger:** Financial allocations and applications are never physically deleted. Reversals and cancellations mark active posted rows as `reversed`, create paired negative reversal ledger entries (`allocated_amount < 0`, `transaction_type = 'reversal'`, `reversal_of_allocation_id`), and atomically restore `FeeInvoice`, `FeeInvoiceItem`, and `StudentFeeAssignment` balances under row-level database locks (`FOR UPDATE`).
4. **Zero Hardcoded Metrics & Zero Discrepancy:** Replaced all hardcoded CRM/Academic/Transactions/Fee Collection dashboard numbers and dummy defaulters lists with live queries backed by `FinancialGovernanceService`.

---

## 2. Architecture, Database Schema & Domain Services

### 2.1 Database Migration (`042_concession_governance`)
Implemented in `backend/alembic/versions/042_concession_governance_and_ledger_integrity.py` and models (`backend/app/models/fee.py`, `backend/app/models/payment.py`, `backend/app/models/__init__.py`):
- **`fee_concession_types`:** Added `benefit_type` with automated backfill mapping existing schemes cleanly.
- **`fee_concession_applications`:** Added `benefit_type`, `waiver_scope`, `fee_category_id`, `reversed_amount`, `sponsor_settlement_status`, `idempotency_key`, `cancelled_by_id`, `cancelled_at`, `cancellation_reason`, and `expired_at`.
- **`fee_concession_allocations`:** Added immutable `transaction_ref` (`CTXN-YYYY-XXXX`), `fee_category_id`, `invoice_item_id`, `transaction_type`, `posting_status`, `effective_date`, `reversed_by_id`, `reversed_at`, `reversal_reason`, and `reversal_of_allocation_id`.
- **`sponsor_settlements`:** Added new transactional table tracking external sponsor and government fund recoveries (`settlement_ref`, `amount`, `received_date`, `payment_method`, `reference_number`, `recorded_by_id`, `status`).
- **`refunds`:** Added indexed `idempotency_key` for duplicate-safe refund submission.
- **RBAC (`permissions`):** Seeded granular `concessions` permissions (`view`, `nominate`, `verify`, `approve`, `apply`, `reverse`, `cancel`, `reports`, `sponsor_settle`) across `superadmin`, `admin`, `principal`, `accountant`, `teacher`, and `staff` roles (and mirrored in `backend/tests/conftest.py`).

### 2.2 Central Financial Governance & Workflow Engines
- **`backend/app/services/financial_governance_service.py`:** Central SSOT engine providing:
  - `get_governed_summary(db, FinancialFilter)`
  - `get_fee_management_concession_breakdown(db, FinancialFilter)`
  - `get_academic_concession_distribution(db, FinancialFilter)`
  - `reconcile_financial_ledgers(db, FinancialFilter)`
  - `trace_transaction_chain(db, entity_type, entity_id)`
  - `generate_concession_report(db, report_id, FinancialFilter)` (all 20 reports)
- **`backend/app/services/concession_service.py`:** Atomic workflow state machine enforcing idempotency, past `valid_until` expiry blocking and `/expire-stale` transitions, pro-rata `FeeInvoiceItem` discount synchronization, overpayment `credit_adjustment_amount`, Segregation of Duties (SoD), immutable reversals (`reverse_concession`), cancellations (`cancel_application`), and sponsor recovery (`record_sponsor_settlement`).
- **`backend/app/services/sequence.py`:** Concurrency-safe generators `generate_next_concession_txn_ref` (`CTXN-YYYY-XXXX`) and `generate_next_sponsor_settlement_ref` (`SPNS-YYYY-XXXX`).
- **`backend/app/services/payment_workflow_service.py`:** Row-level locks (`with_for_update(of=FeeInvoice)`) during payment posting and refund disbursement.

---

## 3. API & Frontend Coverage

### 3.1 Live Verified API Endpoints (29 Governance Routes)
- **Concessions (`/api/v1/fees/concessions/*`):** `types`, `evaluate`, `applications`, `applications/bulk` (with SoD `auto_approve` restriction to `superadmin`/`admin` + `concessions:approve`), `verify`, `approve`, `reject`, `apply`, `withdraw`, `reverse`, `cancel`, `expire-stale`, `sponsor-settlement`, `analytics`, `governance-summary`, `reconciliation`, `trace/{entity_type}/{entity_id}`, and `letter`.
- **Payments & Refunds (`/api/v1/payments/*`):** Refund idempotency & locking on `POST /{payment_id}/refunds`, SoD approval/disbursement (`/refunds/{id}/approve`, `/process`, and new `/refunds/{id}/reject`), and `build_receipt_response` synchronized to `FeeInvoice.net_amount` with explicit `gross_fee` and `concession_amount` fields.
- **Reports (`/api/v1/reports/concessions/*`):** `catalog`, `{report_id}`, and `{report_id}/export` (`csv` / `xlsx`) across all 20 reports.
- **Cross-Module Integration:** Unified `dashboard.py`, `fees.py` (fixed `adjust_student_fees` line-item/overpayment handling and removed invalid `FeeInstallment.installment_number` query property), `students.py`, `student_portal.py`, `leads.py` (admission fee structure & concession offer at conversion), and `report_intelligence_service.py`.

### 3.2 Frontend UI & Traceability (`frontend/src/`)
- **`ConcessionTraceModal.tsx`:** Shared end-to-end drill-down modal (`Student → Fee Invoice → Benefit Application → Immutable Ledger Allocation → Audit History`) wired into Dashboards, Fees Concessions Workspace, Student Admin Profile, and Reports.
- **Dashboards (`Dashboard.tsx`):** Added Governed Financial Strip; eliminated hardcoded fallback values in Fee Collection, Admissions CRM, Academic Analysis, and Transactions Reconciliation tabs.
- **Fees & Payments (`Fees.tsx`, `Payments.tsx`, `FeeCollection.tsx`, `PaymentReceiptView.tsx`):** Live defaulters via `reportsApi.feeDefaulters` and dynamic aging cards; Approve vs Approve & Post, Reverse, Cancel, Expire Stale, and Sponsor Settlement actions; Refunds Approval & Disbursement ledger panel; Gross/Benefit/Net breakdown on fee collection and receipt views (`receipt_pdf_service.py` also prints `Net Payable (Gross - Benefit)` on A5 PDFs when benefits apply).
- **Student Dossier, Portal, Academics & CRM (`StudentDetail.tsx`, `StudentDashboard.tsx`, `AcademicWorkspace.tsx`, `LeadManagement.tsx`):** Full Benefit/Waiver/Scholarship statements, Academic class-wise concession overview, and admission offer selection at lead conversion.
- **Enterprise Reporting (`Reports.tsx`):** Registered all **20 Phase 5 reports** (`48` total enterprise reports across 7 categories) with student/status/funding/standard/batch/date filters, server CSV/Excel exports, print/PDF, and Trace action column.

---

## 4. Live Database Reconciliation & Report Performance Verification

Executed read-only against live `prashant_academy` PostgreSQL after backend updates (`FinancialGovernanceService.reconcile_financial_ledgers`):

| Environment | `is_reconciled` | `variance` | `broken_invoices` | `gross_assessed` | `posted_reductions` | `net_invoiced` | `total_collected` | `total_outstanding` | `reversed_allocation_excluded` |
|:---|:---:|---:|---:|---:|---:|---:|---:|---:|---:|
| **PRODUCTION (`is_demo=False`)** | `True` | `0.0` | `0` | `2,889,000.0` | `35,000.0` | `2,854,000.0` | `1,882,900.0` | `971,100.0` | `10,012.0` |
| **TRAINING (`is_demo=True`)** | `True` | `0.0` | `0` | `0.0` | `0.0` | `0.0` | `0.0` | `0.0` | `0.0` |

- **20-Report Benchmark (`PRODUCTION`):** Total execution time across all 20 concession reports combined was **`1.308s`** (slowest individual report: `academic-year-comparison` at **`0.473s`**).

---

## 5. Verification & Quality Gates (Observed Post-Final Edit)

| Gate | Command / Scope | Observed Result |
|:---|:---|:---|
| **Backend 20-Scenario Suite** | `docker compose exec -T backend pytest tests/test_concession_financial_governance.py -v` | **3 passed, 0 failed** (`65.93s`) covering Scenarios 1–20 |
| **Backend Targeted Financial Suites** | `docker compose exec -T backend pytest tests/test_payments.py tests/test_payment_workflow.py tests/test_receipt_pdf_and_bulk_export.py tests/test_concession_financial_governance.py -v` | **35 passed, 0 failed** (`165.02s`) |
| **Backend Full Regression Suite** | `docker compose exec -T backend pytest -q` (run after final backend edits) | **271 passed, 4 skipped, 0 failed** (`657.18s`); the 4 skips are environment-conditional guards (`test_auto_version.py` host `scripts/` directory check; 3 `test_fee_register_import.py` external Excel workbook path guards) |
| **Frontend Full Regression Suite** | `cd frontend; npx vitest run --poolOptions.threads.minThreads=1 --poolOptions.threads.maxThreads=2 --testTimeout=15000` (run after final frontend edits) | **60 test files passed (60/60), 471 tests passed (471/471), 0 failed, 0 skipped** (`847.65s`) |
| **TypeScript & Production Bundle** | `cd frontend; npx tsc --noEmit` + `docker compose build frontend; if ($?) { docker compose up -d frontend }` | **0 TypeScript errors**; Vite production bundle rebuilt and deployed to `prashant_academy_frontend` Nginx (`http://localhost/` HTTP 200) |
| **Live Containers & OpenAPI** | `docker compose ps` + `http://localhost:8000/health` + `http://localhost:8000/openapi.json` | All 3 containers (`db`, `backend`, `frontend`) `Up (healthy)`, `{"status":"healthy"}`, 29 live concession/refund OpenAPI routes |
| **Corporate Attribution Check** | `python scripts/manage_headers.py check` | **532 / 532 source files passed (`0 failed`)** |

