---
title: "Institutional Books & Reports Existing-Functionality Audit"
module: "10_FINANCE_ACCOUNTING"
category: "AUDIT-REPORT"
document_type: "REPORT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-14"
updated_date: "2026-11-14"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Pending Review"
tags: ["institutional-books", "reporting", "audit", "financial-integrity", "ssot"]
entities: ["FeeInvoice", "Payment", "PaymentAllocation", "PaymentReceipt", "Refund", "Student", "StudentEnrollment", "TeachingSession", "TeacherPayroll", "AuditLog"]
api_routes: ["/api/v1/reports/*", "/api/v1/reports/intelligence/*", "/api/v1/payments/*", "/api/v1/fees/*", "/api/v1/fees/concessions/*", "/api/v1/teacher-payroll/*"]
related_modules: ["04_STUDENT_MANAGEMENT", "06_TEACHER_PAYROLL", "07_ATTENDANCE", "08_EXAMINATION", "09_FEES_PAYMENTS", "11_REPORTS_EXPORTS", "12_RBAC_SECURITY", "14_PRINTING_DOCUMENTS"]
---

# Institutional Books & Reports: Existing-Functionality Audit

**Product:** PrathamOne EduOS — Coaching Institute Edition  
**Audit stage:** Phases 1-3 discovery and design, plus approved source-backed receipt-trace pilot  
**Disposition:** Review required before broad implementation

## 1. Executive conclusion

The repository already contains substantial operational records, financial subledgers, a centralized Reporting & Analytics Centre, report-calculation definitions, reconciliation logic, export paths, and shared print components. The proposed Institutional Books & Reports capability should extend those sources and surfaces; it should not introduce parallel transaction ledgers, a second report centre, or a duplicate print system.

The source code does **not** show a general-ledger, chart-of-accounts, or double-entry journal engine. It also does not show canonical operational sources for general expenses, cash/bank account balances and transfers, inventory, or assets. As a result:

- Fee and payroll registers can be reported from their existing source records, subject to report-specific validation.
- Operational fee summaries must not be presented as a Cash Book, Bank Book, Trial Balance, Profit & Loss statement, or Balance Sheet.
- Reports requiring missing expense, asset, inventory, or accounting records are blocked until an approved source system or integration is selected.
- The database's live schema and customer records were not queried. Findings below are based on repository models, migrations, services, routes, UI, and tests; production-data reconciliation remains **NOT VERIFIED**.

The user-provided specification itself sets the correct implementation gate: perform audit, source mapping, and architecture design first; wait for review before broad implementation.

## 2. Audit method and boundaries

This was a read-only source audit of the backend model and API layers, reporting and financial services, frontend module registry and reporting workspace, shared print components, existing documentation, and relevant test-file inventory. No application code, schema, customer data, or deployment was changed. No live database query, browser run, PDF generation, export validation, or test suite was performed.

The audit treats a model or route as evidence of implemented source capability, not proof that its production data is complete or that a report currently reconciles in a deployed environment. Status values follow the requested vocabulary: **PASS**, **PARTIAL**, **BLOCKED**, **NOT IMPLEMENTED**, and **NOT VERIFIED**.

## 3. Existing capability assessment

| Requirement area | Status | Repository evidence and finding |
|---|---|---|
| Central reports surface | PARTIAL | [`Reports.tsx`](../../frontend/src/pages/Reports.tsx) already has a multi-domain report catalogue for students/admissions, academics, fees, concessions, workforce/payroll, examinations, communications, imports, and audit. [`modules.ts`](../../frontend/src/config/modules.ts) already registers `/reports`. Extend these surfaces rather than adding a second reporting centre. |
| Financial SSOT | PARTIAL | Fee invoices/items, payment transactions, allocations, receipt snapshots, refunds, and concession applications/allocations are modeled in [`fee.py`](../../backend/app/models/fee.py) and [`payment.py`](../../backend/app/models/payment.py). [`FinancialGovernanceService`](../../backend/app/services/financial_governance_service.py) centralizes fee/concession summaries and fee-ledger reconciliation. This is an operational fee subledger, not a general ledger. |
| Reversal, refund, and period controls | PARTIAL | Payment lifecycle, receipts, refunds, and `FinancialPeriod` are present in [`payment.py`](../../backend/app/models/payment.py), [`payment_workflow_service.py`](../../backend/app/services/payment_workflow_service.py), and [`payments.py`](../../backend/app/api/v1/endpoints/payments.py). Period locking is applied in payment workflows; this is not evidence that every module's writes are period-locked. Reopening clears the stored closed timestamp and actor, so the current period row is not a durable close/reopen history. |
| Student and admission records | PARTIAL | Canonical `Student`, `StudentEnrollment`, lifecycle log, and CRM lead/follow-up/demo records exist. These can support registers, but student counts and status transitions must use enrollment/lifecycle semantics rather than naive joins. |
| Academic and teaching records | PARTIAL | Academic years, standards, divisions, subjects, timetable entries, teaching sessions, examinations/marks, homework/submissions, and EduBoard records exist. Scheduled sessions and completed/cancelled actual teaching sessions are distinguishable in `TeachingSession`. EduVault is not represented by an identified canonical model in this audit. |
| Staff and teacher payroll | PARTIAL | Users remain the person master; staff profiles, attendance/leaves, teacher payment profiles, teaching sessions, payrolls, and teacher payment vouchers exist. Teacher payroll vouchers do not constitute a general expense ledger or account posting. Payroll data requires narrower access than ordinary academic reporting. |
| Cash Book and Bank Book | BLOCKED | Payment methods and transaction references exist, but no canonical institution cash/bank accounts, opening balances, deposits, inter-account transfers, statement lines, or general cash/bank ledger were found. A payment-mode report is not a cash or bank book. |
| General expenses, purchase vouchers, assets, and inventory | NOT IMPLEMENTED | No canonical source model/API for general expenses, purchases, assets, or stock/inventory was found in the application model/API inventory. Staff bank-account profiles and teacher payroll vouchers are not substitutes. |
| Double-entry statements | BLOCKED | No chart of accounts, journal entry/line, posting engine, or general ledger source was found in the model/API/migration audit. Trial Balance, Profit & Loss, and Balance Sheet must not be synthesized from fee/payroll operational totals. See the separate capability assessment. |
| Reconciliation Centre | PARTIAL | [`reconcile_financial_ledgers`](../../backend/app/services/financial_governance_service.py) validates fee/invoice/payment/allocation/concession invariants and identifies broken invoices. It does not reconcile all requested books, bank statements, expenses, payroll disbursement, or a general ledger. |
| Report-to-source drill-down | PARTIAL | Several reports return source records and the financial governance service supports transaction tracing. Aggregate metrics and report rows do not uniformly expose a canonical source reference. The future report contract must include source type and source ID for every detail row and traceable provenance for aggregates. |
| Management Snapshot | PARTIAL | Dashboard and report-intelligence capabilities exist. The required one-page owner snapshot, full source drill-down for every metric, and explicit unavailable-vs-zero state were not verified as one implemented feature. |
| Print and export | PARTIAL | Shared print layout/footer components, report grids, and CSV/XLSX/receipt exports exist. [`PrintFooter.tsx`](../../frontend/src/components/printing/PrintFooter.tsx) is the existing attribution surface. No evidence was found that every requested book already has a tested PDF/Excel template. |
| Immutable Digital Book Archive | NOT IMPLEMENTED | No general generated-report/book edition model or API was identified. Existing receipt snapshots and specialized generated staff documents do not provide the requested archive of report parameters, source cutoff, checksum, version, approval, and source references. |
| Scheduled book generation | NOT IMPLEMENTED | No report/book scheduler or scheduled approval flow was identified. A future scheduler must generate only; it must not approve or close periods automatically. |
| Quarterly/annual period configuration | PARTIAL | `AcademicYear` defines academic boundaries. `FinancialPeriod` requires `academic_year_id`, so the current period entity cannot independently represent an institution's financial calendar as required. |
| Live database reconciliation | NOT VERIFIED | The live PostgreSQL schema, data counts, tenant/branch dataset, and actual report totals were intentionally not queried. Source-level schemas and migration history do not establish production runtime state. |

## 4. Material design and integrity findings

### 4.1 Do not conflate an operational fee subledger with accounting

The authoritative records include invoices, student collections, payment allocations, receipts, refunds, concessions, and payroll. They do not form balanced debit/credit journals across cash, bank, receivables, income, expenses, liabilities, and assets. Any statutory or accounting statement would therefore be fabricated if inferred from these operational reports.

### 4.2 Existing reconciliation has a bounded scope

`FinancialGovernanceService.reconcile_financial_ledgers` checks invoice arithmetic, net due, paid/outstanding, payment/refund totals, payment allocations, and concession adjustments. It is valuable and should be reused for its existing domain. It is not the proposed universal book-to-book reconciliation engine and has no bank-statement or general-expense source to reconcile.

The `fee-reconciliation` card in [`Reports.tsx`](../../frontend/src/pages/Reports.tsx) currently loads the fee overview endpoint. The dedicated fee/concession reconciliation route is under `/fees/concessions/reconciliation`. Before presenting this card as the new book reconciliation centre, verify and explicitly wire the required reconciliation response rather than assuming the title means the complete reconciliation service is displayed.

### 4.3 Period close is not report-edition governance

`FinancialPeriod` stores a close flag and close actor/time, and payment workflows call the period-open check. The model requires an academic year; there is no separate financial-year identity. Reopening clears the close actor/time fields. No durable report edition, corrected edition lineage, approval history, or general audit trail for book close/reopen was identified. Do not silently expand the current lock mechanism into a system-wide close without workflow design and permission review.

### 4.4 Zero and unavailable must remain distinct

The report-intelligence `SafeMath` helpers return zero for absent operands or zero denominators. That behavior may be appropriate for some rate calculations but cannot alone represent “no source data,” “not configured,” “not reconciled,” and an actual zero. New book responses should carry data availability and reconciliation state explicitly.

### 4.5 Daily collection report receipt trace (pilot implemented)

The original `daily_payment_collection_report` selected `Payment`, `Student`, and collector `User`, but did not join `PaymentReceipt`. It emitted `REC-{payment.id}` when `Payment.receipt_number` was absent; the inspected `Payment` model has no `receipt_number` column and the canonical receipt number is stored in `PaymentReceipt.receipt_number`. The approved pilot now selects the latest receipt snapshot by version, returns a receipt number only when that snapshot is valid, and exposes the actual receipt status or `missing`. The report workspace shows “Not issued” instead of generating a number. Targeted coverage verifies valid, missing, and cancelled receipt states.

### 4.6 Branding has an unresolved conflict

The pasted command says `Coaching Management. Simplified.`; the uploaded official logo says `Teach Smarter. Grow Better.`; and `BRANDING_CONFIG` currently contains `The Power of Enterprise Education. The Simplicity of WhatsApp.` These are different taglines. This audit does not change product branding. Product ownership should select the canonical product tagline before any new book cover, report template, or footer is designed.

## 5. Requested deliverables and current readiness

| Deliverable family | Status at audit stage |
|---|---|
| Existing-functionality audit, source-to-report mapping, accounting capability assessment, and Phase 3 architecture/design | Prepared in the accompanying documents; pending owner review. |
| Daily collection receipt-trace pilot | Implemented using canonical `PaymentReceipt` snapshots; targeted valid/missing/cancelled-state test passed. |
| Broader financial, student, academic, staff, and administrative books | Design inputs mapped; implementation not started beyond the bounded pilot. |
| Daily-to-annual books, management snapshot, and book-to-book reconciliation | Not implemented; source coverage and period/availability rules need review. |
| Period approval/close/reopen and digital archive | Not implemented as the requested report-edition workflow. Existing payment period controls are narrower. |
| PDF/export, security, reconciliation, and production-readiness test reports | Deferred until implementation and execution against an approved test environment. |
| User guide | Deferred until interfaces and workflows are implemented and verified. |

## 6. Review gate

No broad implementation should begin until the owner reviews the source map and architecture plan and decides:

1. Whether formal accounting statements are out of scope, supplied by an accounting integration, or require a separately approved accounting-engine project.
2. Which canonical product tagline is approved.
3. Whether the first release is limited to reports derivable from existing records, with unsupported Cash Book/Bank Book/expense/asset/inventory reports clearly unavailable.
4. Which roles may view, generate, export, approve, close, reopen, archive, and restore each book.
5. What institution/branch scope, financial-year boundaries, archive retention, and report-edition approval rules apply.

Until then, the current result is an architecture and implementation gate—not a production-readiness claim.
