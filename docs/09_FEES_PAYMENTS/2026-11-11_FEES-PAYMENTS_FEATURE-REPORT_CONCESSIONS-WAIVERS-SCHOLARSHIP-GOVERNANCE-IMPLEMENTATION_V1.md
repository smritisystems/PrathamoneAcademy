---
title: "Centralized Concessions, Fee Waivers & Scholarship Financial Governance — Final Delivery & Reconciliation Report"
module: "09_FEES_PAYMENTS"
category: "FEATURE-REPORT"
document_type: "REPORT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.1"
created_date: "2026-11-11"
updated_date: "2026-11-11"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["concessions", "fee-waivers", "scholarships", "sponsor-funding", "reconciliation", "SSOT", "financial-governance", "reports"]
entities: ["FeeConcessionType", "StudentConcessionApplication", "FeeConcessionAllocation", "SponsorSettlement", "FeeInvoice", "FeeInvoiceItem", "StudentFeeAssignment", "Payment", "PaymentAllocation", "PaymentReceipt", "Refund", "AuditLog"]
api_routes: ["/api/v1/fees/concessions/*", "/api/v1/fees/*", "/api/v1/payments/*", "/api/v1/dashboard/*", "/api/v1/students/*/profile", "/api/v1/student-portal/fees", "/api/v1/leads/*/convert-to-admission", "/api/v1/reports/concessions/*"]
related_modules: ["01_ARCHITECTURE", "03_ACADEMIC_MANAGEMENT", "04_STUDENT_MANAGEMENT", "09_FEES_PAYMENTS", "10_FINANCE_ACCOUNTING", "11_REPORTS_EXPORTS", "12_RBAC_SECURITY"]
---

# PHASE 11 — FINAL DELIVERY & RECONCILIATION REPORT: CENTRALIZED CONCESSIONS, FEE WAIVERS & SCHOLARSHIP FINANCIAL GOVERNANCE

**Product:** PrathamOne EduOS (Coaching Institute Edition v1.0.0)  
**Architect & Author:** Jawahar R. Mallah — AITDL (AI Technology & Development Lab)  
**Pre-Implementation Backup:** `data/backups/prashant_academy_pre_concession_governance_2026-11-11.sql` (`2,114,740` bytes)  
**Active Alembic Head:** `042_concession_governance` (reversible to `041_subject_dedup`)  
**Phase 1 Audit Reference:** [2026-11-11_FEES-PAYMENTS_AUDIT-REPORT_CONCESSIONS-WAIVERS-SCHOLARSHIP-GOVERNANCE-AUDIT_V1.md](file:///f:/PrashantAcademy/docs/09_FEES_PAYMENTS/2026-11-11_FEES-PAYMENTS_AUDIT-REPORT_CONCESSIONS-WAIVERS-SCHOLARSHIP-GOVERNANCE-AUDIT_V1.md)

---

## 1. Complete System Audit Findings

Pre-implementation audit of `prashant_academy` live data and full codebase identified 15 systemic defects across 4 categories (detailed in the Phase 1 Audit Report):
1. **Hardcoded Dashboard Fallbacks & Dummy Defaulters:**
   - `frontend/src/pages/Dashboard.tsx` previously fell back to hardcoded constants (`171`, `1794300`, `2894000`, `1094700`), hardcoded `"100% Balanced"` / `"Variance: ₹0.00"` / `"Zero unauthorized waivers recorded"` / `"Zero refund liability backlog"`.
   - `backend/app/api/v1/endpoints/dashboard.py` hardcoded `reversals_amount = 0.0` (despite `5` reversed payments totaling `₹17,513.00` in DB) and fabricated collection target via `collected * 1.15`.
   - `frontend/src/pages/Fees.tsx` initialized a static dummy array of 6 fake defaulters instead of querying `reportsApi.feeDefaulters`.
2. **Calculation Conflicts & Incomplete Models:**
   - `/dashboard/stats` and `/fees/overview` conflated `Gross Fee Assessed` (`total_amount`) with `Net Fee Due` (`net_amount`) and lumped all `FeeInvoice.discount_amount` into `waived_amount`.
   - `report_intelligence_service.py` divided realization rate by `total_amount` (gross) instead of `net_amount` (net payable).
   - `students.py` and `student_portal.py` omitted `FeeInvoice.status != 'cancelled'` and failed to subtract completed `Refund`s from paid totals; `payments.py` `build_receipt_response` also used `invoice.total_amount` (gross) instead of `invoice.net_amount` when computing receipt `outstanding_balance`.
   - Naive `SUM(payment_allocations.allocated_amount)` included `₹10,012.00` of positive allocation rows on `3` reversed payments (`#107`, `#175`, `#176`).
   - Direct `StudentEnrollment` joins in `fees.py` caused Cartesian duplication on batch transfers and omitted `is_demo` filtering.
   - `FeeInstallment.installment_number` / `FeeInvoice.installments` `@property` references caused SQLAlchemy `ArgumentError` in `/students/{id}/profile`, `/student-portal/fees`, `/fees/register`, and `/fees/students/{id}/adjust-fees`.
3. **Lifecycle, Non-Destructive Ledger & RBAC Gaps:**
   - `withdraw_application` deleted `FeeConcessionAllocation` rows via `db.delete(alloc)` instead of posting immutable negative reversal entries.
   - Missing `sponsor_settlements` recovery ledger, `valid_until` expiry enforcement, `/cancel` & `/reverse` workflows, `idempotency_key` on concession applications and refunds, pessimistic row locks (`FOR UPDATE`), and granular permission checks (`concessions:*`).
4. **Dashboard & Report Coverage:** 0 of 20 Phase 5 concession/waiver/scholarship governance reports existed in `reports.py` or `Reports.tsx`, and 4 dashboards/workspaces lacked benefit visibility (`FeeCollection.tsx`, `StudentDashboard.tsx`, `AcademicWorkspace.tsx`, `LeadManagement.tsx`).

---

## 2. Existing Modules Reused (SSOT Compliance — Rules 001–011)

No parallel tables or duplicate business modules were introduced. All enhancements extended existing canonical infrastructure:
- **Canonical Identity & Academic Masters:** `Student`, `User`, `Role`, `Permission`, `Institution`, `AcademicYear`, `Standard`, `Division`, `Board`.
- **Canonical Fee & Concession Schema:** `FeeCategory`, `FeeStructure`, `StudentFeeAssignment`, `FeeInvoice`, `FeeInvoiceItem`, `FeeConcessionType`, `StudentConcessionApplication`, `FeeConcessionAllocation`, `Payment`, `PaymentAllocation`, `PaymentReceipt`, `Refund`, `AuditLog`, `InstitutionSetting`.
- **Existing Services & Shared UI Reused:** [`ConcessionWorkflowService`](file:///f:/PrashantAcademy/backend/app/services/concession_service.py), [`payment_workflow_service.py`](file:///f:/PrashantAcademy/backend/app/services/payment_workflow_service.py), [`sequence.py`](file:///f:/PrashantAcademy/backend/app/services/sequence.py), [`report_intelligence_service.py`](file:///f:/PrashantAcademy/backend/app/services/report_intelligence_service.py), [`ExcelReportGrid.tsx`](file:///f:/PrashantAcademy/frontend/src/components/reports/ExcelReportGrid.tsx), [`PaymentReceiptView.tsx`](file:///f:/PrashantAcademy/frontend/src/components/PaymentReceiptView.tsx), [`useEditModeStore`](file:///f:/PrashantAcademy/frontend/src/store/editModeStore.ts).

---

## 3. Missing Functionality Implemented

- **Central Financial Governance Engine ([`financial_governance_service.py`](file:///f:/PrashantAcademy/backend/app/services/financial_governance_service.py)):** Single calculation layer enforcing separated accounting classifications (`fee_concession`, `fee_waiver` [`full_waiver`/`partial_waiver`], `scholarship`, `sponsor_funding`, manual fee adjustments, receipts, refunds, credit adjustments, reversals, cancellations).
- **Sponsor & Government Funding Recovery Ledger (`SponsorSettlement`):** Full tracking of `funding_source`, `sponsor_name`, `sponsor_sanctioned_amount`, `sponsor_received_amount`, `outstanding_sponsor_funding`, and `sponsor_settlement_status` (`not_applicable` / `pending` / `partial` / `settled`) with `SPNS-YYYY-XXXX` references.
- **Immutable Ledger Reversals, Cancellations & Expirations ([`concession_service.py`](file:///f:/PrashantAcademy/backend/app/services/concession_service.py)):** Zero physical deletes; reversals/cancellations append paired negative allocation rows (`allocated_amount < 0`, `transaction_type = 'reversal'`, `reversal_of_allocation_id`) and restore `FeeInvoice`, `FeeInvoiceItem`, and `StudentFeeAssignment` atomically under row-level locks (`with_for_update`), plus automated `/expire-stale` transitions and `CTXN-YYYY-XXXX` immutable refs.
- **Overpayment Credit & Refund Controls:** Automatic calculation of `credit_adjustment_amount` when concessions exceed unpaid balance; `idempotency_key` deduplication, row locks, SoD approval guard, and `/refunds/{id}/reject` endpoint in [`payments.py`](file:///f:/PrashantAcademy/backend/app/api/v1/endpoints/payments.py).
- **End-to-End Traceability UI ([`ConcessionTraceModal.tsx`](file:///f:/PrashantAcademy/frontend/src/components/common/ConcessionTraceModal.tsx)):** Interactive chain viewer `Student → Fee Invoice → Benefit Application → Immutable Ledger Posting → Audit History`.

---

## 4. Database Changes and Migrations

Executed cleanly via [`042_concession_governance_and_ledger_integrity.py`](file:///f:/PrashantAcademy/backend/alembic/versions/042_concession_governance_and_ledger_integrity.py) (`alembic current` -> `042_concession_governance (head)`):
- **`fee_concession_types`:** Added `benefit_type` with deterministic backfill across schemes.
- **`fee_concession_applications`:** Added `benefit_type`, `waiver_scope`, `fee_category_id`, `reversed_amount`, `sponsor_settlement_status`, `idempotency_key`, `cancelled_by_id`, `cancelled_at`, `cancellation_reason`, `expired_at` + indexes & foreign keys.
- **`fee_concession_allocations`:** Added unique `transaction_ref`, `fee_category_id`, `invoice_item_id`, `transaction_type`, `posting_status`, `effective_date`, `reversed_by_id`, `reversed_at`, `reversal_reason`, `reversal_of_allocation_id`.
- **`sponsor_settlements`:** New transactional ledger table referencing `institutions`, `fee_concession_applications`, and `users`.
- **`refunds`:** Added indexed `idempotency_key`.
- **`permissions`:** Seeded granular `concessions` permissions (`view`, `nominate`, `verify`, `approve`, `apply`, `reverse`, `cancel`, `reports`, `sponsor_settle`) across `superadmin`, `admin`, `principal`, `accountant`, `teacher`, and `staff` roles (mirrored in [`conftest.py`](file:///f:/PrashantAcademy/backend/tests/conftest.py)).

---

## 5. APIs Created or Modified

Verified **29 live OpenAPI routes** on `http://localhost:8000/openapi.json` plus synchronized cross-module endpoints:
- **Concessions ([`concessions.py`](file:///f:/PrashantAcademy/backend/app/api/v1/endpoints/concessions.py)):** `/api/v1/fees/concessions/*` — added `benefit_type`, `waiver_scope`, `fee_category_id`, `valid_until`, `reversed_amount`, `sponsor_settlement_status`; enforced `has_permission`; restricted bulk `auto_approve` to `superadmin`/`admin` with `concessions:approve`; added `POST /applications/{id}/reverse`, `POST /applications/{id}/cancel`, `POST /expire-stale`, `POST /applications/{id}/sponsor-settlement`, `GET /governance-summary`, `GET /reconciliation`, `GET /trace/{entity_type}/{entity_id}`; unified `/analytics`.
- **Payments & Receipts ([`payments.py`](file:///f:/PrashantAcademy/backend/app/api/v1/endpoints/payments.py)):** Added `idempotency_key` & locking to `POST /{id}/refunds`, added `POST /refunds/{id}/reject`, and updated `build_receipt_response` to set `total_fee_amount = invoice.net_amount` and return `gross_fee` and `concession_amount`.
- **Reports ([`reports.py`](file:///f:/PrashantAcademy/backend/app/api/v1/endpoints/reports.py)):** Added `GET /api/v1/reports/concessions/catalog`, `GET /api/v1/reports/concessions/{report_id}`, and `GET /api/v1/reports/concessions/{report_id}/export` (`csv` | `xlsx`).
- **Dashboards, Fees, Students, Leads:** Updated [`dashboard.py`](file:///f:/PrashantAcademy/backend/app/api/v1/endpoints/dashboard.py), [`fees.py`](file:///f:/PrashantAcademy/backend/app/api/v1/endpoints/fees.py), [`students.py`](file:///f:/PrashantAcademy/backend/app/api/v1/endpoints/students.py), [`student_portal.py`](file:///f:/PrashantAcademy/backend/app/api/v1/endpoints/student_portal.py), [`leads.py`](file:///f:/PrashantAcademy/backend/app/api/v1/endpoints/leads.py), and [`report_intelligence_service.py`](file:///f:/PrashantAcademy/backend/app/services/report_intelligence_service.py) onto canonical SSOT queries.

---

## 6. Dashboards Integrated (All 7 Phase 4 Workspaces)

1. **Management Dashboard ([`Dashboard.tsx`](file:///f:/PrashantAcademy/frontend/src/pages/Dashboard.tsx)):** Added Governed Financial Strip displaying Gross Assessed, Approved vs Posted Concessions, Fee Waivers, Scholarships, Net Due, Collections, Outstanding, Refunds, Pending Approvals, and Sponsor Funding Outstanding with drill-down trace triggers.
2. **Fee Management Dashboard ([`Fees.tsx`](file:///f:/PrashantAcademy/frontend/src/pages/Fees.tsx)):** Added Student-wise, Installment/Item-wise, Fee-head-wise, Approved vs Posted & Remaining breakdown; replaced dummy defaulters array with live `reportsApi.feeDefaulters` & dynamic aging cards; added Approve vs Approve & Post, Reverse, Cancel, Expire Stale, Sponsor Settlement, and Trace controls.
3. **Collection Dashboard & Official Receipts ([`FeeCollection.tsx`](file:///f:/PrashantAcademy/frontend/src/pages/FeeCollection.tsx), [`PaymentReceiptView.tsx`](file:///f:/PrashantAcademy/frontend/src/components/PaymentReceiptView.tsx)):** Displays Gross Assessed Fee, Posted Benefit Reductions, and Net Payable clearly on collection workspace, on-screen receipts, and A5 PDF receipts (`receipt_pdf_service.py`).
4. **Student Dossier & Student Portal ([`StudentDetail.tsx`](file:///f:/PrashantAcademy/frontend/src/pages/StudentDetail.tsx), [`StudentDashboard.tsx`](file:///f:/PrashantAcademy/frontend/src/pages/StudentDashboard.tsx)):** Added full individual benefit cards (Original Gross Fee, Approved Benefits, Applied Concessions, Scholarships/Waivers, Net Fee Payable, Paid, Outstanding) and Benefits/Waivers/Approval history tables with drill-down Trace.
5. **Class & Academic Dashboard ([`AcademicWorkspace.tsx`](file:///f:/PrashantAcademy/frontend/src/pages/AcademicWorkspace.tsx)):** Added Class-wise & Division-wise Concessions, Beneficiaries count, Average Concession per Student, Scholarship/Waiver split, and Gross vs Net table.
6. **Admission Dashboard ([`LeadManagement.tsx`](file:///f:/PrashantAcademy/frontend/src/pages/LeadManagement.tsx) + [`Dashboard.tsx`](file:///f:/PrashantAcademy/frontend/src/pages/Dashboard.tsx) CRM Tab):** Displays Admission Concessions, Promotional Offers, Sibling Discounts, and New Admission Scholarships, plus fee structure & concession offer selection inside `ConvertToAdmissionModal`.
7. **Accounts & Reconciliation Dashboard ([`Dashboard.tsx`](file:///f:/PrashantAcademy/frontend/src/pages/Dashboard.tsx) Transactions Tab & [`Payments.tsx`](file:///f:/PrashantAcademy/frontend/src/pages/Payments.tsx)):** Live posted concessions, waivers, refunds ledger, reversals, manual fee adjustments, sponsor settlements, and zero-fallback ledger reconciliation audit.

---

## 7. Reports Integrated (All 20 Governed Reports)

Registered in `reports.py` and `Reports.tsx` (`Concessions & Scholarships` category — bringing Enterprise Reporting Centre total to **48 reports across 7 categories**, with student, status, funding source, standard, batch, date-range filters, server CSV/Excel export, print/PDF, and Trace modal column):
1. `complete-concession-register` — Complete Concession Register
2. `complete-fee-waiver-register` — Complete Fee Waiver Register
3. `student-concession-statement` — Student-wise Concession Statement
4. `class-wise-concession` — Class-wise Concession Report
5. `division-wise-concession` — Division-wise Concession Report
6. `scheme-wise-scholarship` — Scheme-wise Scholarship Report
7. `approved-vs-applied` — Approved vs Applied Concession Report
8. `pending-approval` — Pending Approval Report
9. `full-fee-waiver` — Full Fee Waiver Report
10. `partial-fee-waiver` — Partial Fee Waiver Report
11. `sponsor-funded-scholarship` — Sponsor-funded Scholarship Report
12. `expired-benefits` — Expired Benefits Report
13. `cancelled-benefits` — Cancelled Benefits Report
14. `reversal-adjustment` — Reversal and Adjustment Report
15. `installment-wise-concession` — Installment-wise Concession Report
16. `fee-collection-vs-concession` — Fee Collection vs Concession Reconciliation
17. `academic-year-comparison` — Academic Year Comparison
18. `user-wise-approval-audit` — User-wise Approval Audit Report
19. `concession-eligibility-utilization` — Concession Eligibility and Utilization Report
20. `complete-student-benefit-register` — Complete Student Benefit Register

---

## 8. Financial Formulas and Definitions

Every calculation is quantized via the institution's configured `currency_code`, `currency_symbol`, and `currency_precision` in [`FinancialGovernanceService`](file:///f:/PrashantAcademy/backend/app/services/financial_governance_service.py):
- **Gross Fee Assessed:** $\sum \text{FeeInvoice.total\_amount}$ where $\text{FeeInvoice.status} \neq \text{'cancelled'}$
- **Approved Concession:** $\sum \text{StudentConcessionApplication.approved\_amount}$ for active approved/applied/partially-applied benefits
- **Posted Concession / Tracked Reductions:** $\sum \text{FeeConcessionAllocation.allocated\_amount}$ where $\text{posting\_status} = \text{'posted'}$ and $\text{transaction\_type} \neq \text{'reversal'}$, segmented strictly by `benefit_type` (`fee_concession`, `fee_waiver`, `scholarship`, `sponsor_funding`)
- **Approved Unapplied:** $\max(0,\; \text{Approved} - \text{Applied})$ on non-expired/non-cancelled approved applications (never reduces student outstanding)
- **Manual Fee Adjustments:** $\max(0,\; \sum \text{FeeInvoice.discount\_amount} - \text{Tracked Posted Reductions})$
- **Total Posted Reductions:** $\text{Tracked Posted Benefits} + \text{Manual Fee Adjustments}$
- **Net Fee Due:** $\text{Gross Fee Assessed} - \text{Total Posted Reductions} = \sum \text{FeeInvoice.net\_amount}$
- **Net Collections:** $\sum \text{Payment.amount}_{\text{posted/completed}} - \sum \text{Refund.amount}_{\text{completed}}$ (reconciled against $\sum \text{FeeInvoice.paid\_amount}$)
- **Outstanding Fee:** $\text{Net Fee Due} - \text{Invoice Paid} - \text{Written Off} = \sum \text{FeeInvoice.outstanding\_amount}_{\text{status} \neq \text{'written\_off'}}$
- **Sponsor Outstanding:** $\max(0,\; \text{Sponsor Sanctioned} - \text{Sponsor Received Settlement})$
- **Collection Percentage:** $\frac{\text{Total Collections}}{\text{Net Fee Due}} \times 100$

---

## 9. Transaction Reconciliation Evidence

Executed read-only against live `prashant_academy` PostgreSQL after backend service deployment (`FinancialGovernanceService.reconcile_financial_ledgers`):

| Environment | `is_reconciled` | `variance` | `broken_invoices` | `gross_assessed` | `posted_reductions` | `net_invoiced` | `total_collected` | `total_outstanding` | `reversed_allocation_excluded` |
|:---|:---:|---:|---:|---:|---:|---:|---:|---:|---:|
| **PRODUCTION (`is_demo=False`)** | `True` | `0.0` | `0` | `2,889,000.0` | `35,000.0` | `2,854,000.0` | `1,882,900.0` | `971,100.0` | `10,012.0` |
| **TRAINING (`is_demo=True`)** | `True` | `0.0` | `0` | `0.0` | `0.0` | `0.0` | `0.0` | `0.0` | `0.0` |

Verification proves:
- $2,889,000.0 - 35,000.0 = 2,854,000.0$ (`Net Invoiced`), variance $= 0.0$.
- $2,854,000.0 - 1,882,900.0 = 971,100.0$ (`Total Outstanding`), variance $= 0.0$.
- $\text{Net Payment Cashflow } (1,882,900.0) - \text{Invoice Paid } (1,882,900.0) = 0.0$ (`payment_vs_invoice_variance = 0.0`), with historical `₹10,012.0` reversed allocations safely isolated.

---

## 10. Data Integrity Test Results

| Verification Run | Command / Scope | Exact Observed Result |
|:---|:---|:---|
| **Expanded Phase 10 Governance Suite** *(latest run after adding pending, rejected, full concession, multi-branch & cross-dashboard tests)* | `docker compose exec -T backend pytest tests/test_concession_financial_governance.py -v` | **4 passed, 0 failed** (`28.64s`) covering fixed, percentage, full concession, full waiver, partial waiver + item sync, academy/sponsor/government funding + settlement recovery, pending approval, rejection, approved-unapplied, expiry, cancellation, reversal, overpayment refund SoD & idempotency, manual fee adjustment, stacking/ceiling rules, bulk + SoD, multi-branch isolation, multi-AY isolation, over-allocation block, RBAC 403s, all 20 reports + CSV/XLSX export, trace chain, and cross-module parity |
| **Full Backend Regression Suite** *(run after final `backend/app/` production edit)* | `docker compose exec -T backend pytest -q` | **271 passed, 4 skipped, 0 failed** (`657.18s`); the 4 skips are environment guards (`test_auto_version.py` host `scripts/` directory check; 3 `test_fee_register_import.py` external Excel workbook path guards) |
| **Full Frontend Regression Suite** *(run after final `frontend/src/` edit)* | `cd frontend; npx vitest run --poolOptions.threads.minThreads=1 --poolOptions.threads.maxThreads=2 --testTimeout=15000` | **60 test files passed (60/60), 471 tests passed (471/471), 0 failed, 0 skipped** (`847.65s`) |
| **TypeScript, Vite & Docker Build** | `npx tsc --noEmit` + `docker compose build frontend; if ($?) { docker compose up -d frontend }` | **0 TypeScript errors**; `vite build` succeeded cleanly inside Docker; `db`, `backend`, `frontend` containers `Up (healthy)`, `http://localhost/` HTTP `200`, `http://localhost:8000/health` `{"status":"healthy"}` |
| **Headers & Documentation Integrity** | `python scripts/manage_headers.py check` + `python tools/docs_manager.py validate` | `532/532` source files passed (`0` failed); `409` docs validated |

---

## 11. Performance Test Results

- **All 20 Reports Sequential Execution (`PRODUCTION` live DB):** Combined wall-clock duration across all 20 `FinancialGovernanceService.generate_concession_report` calls was **`1.308s`**; slowest individual report was `academic-year-comparison` at **`0.473s`**, well below sub-second SLA targets.
- Indexed filtering on `benefit_type`, `fee_category_id`, `transaction_type`, `posting_status`, and `idempotency_key` avoids full-table linear scans.

---

## 12. Outstanding Discrepancies

- **Unresolved Financial Discrepancies:** **None (`0.0` ledger variance, `0` broken invoices across both `PRODUCTION` and `TRAINING`).**
- **Advisory Historical Data Notes:**
  - `3` historical reversed payments in live DB retain positive rows inside `payment_allocations` totaling `₹10,012.00`; `FinancialGovernanceService` explicitly excludes these via `Payment.status.in_(["posted", "completed"])` filters and reports them transparently under `reversed_allocation_excluded`.
  - No physical deletion or mutation of historical records was performed on live data.

---

## 13. Rollback and Recovery Procedure

If rollback to the pre-governance baseline (`041_subject_dedup`) is ever required:
1. **Stop Application Write Traffic:** `docker compose stop backend frontend`
2. **Database Schema Rollback (if reverting code to pre-042):**
   ```bash
   docker compose run --rm backend alembic downgrade 041_subject_dedup
   ```
3. **Full Point-in-Time Database Restoration (using verified pre-migration snapshot):**
   ```bash
   docker compose exec -T db psql -U postgres -d prashant_academy -f - < data/backups/prashant_academy_pre_concession_governance_2026-11-11.sql
   ```
4. **Code & Container Rollback:** `git checkout 774a06d` and `docker compose up -d --build`.
