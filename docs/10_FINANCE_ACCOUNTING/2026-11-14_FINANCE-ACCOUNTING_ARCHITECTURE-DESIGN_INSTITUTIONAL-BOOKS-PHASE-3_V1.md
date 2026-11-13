---
title: "Institutional Books & Reports Phase 3 Architecture and Implementation Plan"
module: "10_FINANCE_ACCOUNTING"
category: "ARCHITECTURE-DESIGN"
document_type: "PLAN"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-14"
updated_date: "2026-11-14"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Pending Review"
tags: ["institutional-books", "architecture", "implementation-plan", "ssot", "reporting"]
entities: ["FinancialPeriod", "FeeInvoice", "Payment", "PaymentAllocation", "PaymentReceipt", "Refund", "Student", "StudentEnrollment", "AuditLog"]
api_routes: ["/api/v1/reports/*", "/api/v1/reports/intelligence/*", "/api/v1/fees/*", "/api/v1/payments/*"]
related_modules: ["03_ACADEMIC_MANAGEMENT", "04_STUDENT_MANAGEMENT", "06_TEACHER_PAYROLL", "07_ATTENDANCE", "08_EXAMINATION", "09_FEES_PAYMENTS", "11_REPORTS_EXPORTS", "12_RBAC_SECURITY", "14_PRINTING_DOCUMENTS"]
---

# Phase 3: Architecture and Implementation Plan

## 1. Approval boundary

This plan follows the attached command's required order: audit, reuse, refactor, extend, create only if missing, test, reconcile, verify. It is a proposal, not implementation approval. Do not begin broad implementation until the owner reviews the findings and resolves the decisions in Section 7.

## 2. Architectural recommendation

### Reuse existing product surfaces

- Extend the existing central report catalogue/workspace in [`Reports.tsx`](../../frontend/src/pages/Reports.tsx) and module registry in [`modules.ts`](../../frontend/src/config/modules.ts). Do not build a parallel report center.
- Extend the existing `/api/v1/reports/` responsibility for cross-module read-only report views. Continue using the canonical domain routers/services for transaction-specific detail and workflow actions.
- Reuse [`FinancialGovernanceService`](../../backend/app/services/financial_governance_service.py) for its fee, concession, and current reconciliation definitions; do not duplicate its formulas in frontend code or a new ledger.
- Reuse `ReportIntelligenceService` calculation definitions where appropriate, but extend its calculation availability/provenance semantics so missing/unconfigured data is not presented as an actual zero.
- Reuse `ExcelReportGrid`, existing CSV/XLSX export helpers, the common print engine, and the canonical print footer. Do not create another print stack.
- Keep all report actions read-only. Report generation must not create payments, invoices, accounting transactions, approvals, or balancing adjustments.

### Define each book as a report over source facts

Each approved report definition should declare its source grain, business date, population/status filters, formula, availability conditions, permission, and trace fields. A report definition may aggregate source facts, but it is never a substitute source of truth. Persist only an approved report edition/archive if the owner accepts the retention and immutable-version policy.

For multi-source summaries, aggregate each source independently at its natural grain before combining totals. This avoids fan-out from one-to-many joins. Every detail row must retain source type and source ID; aggregates need deterministic drill-down to their contributing records.

## 3. Proposed release boundaries

### Initial scope: reports derivable from existing sources

Subject to owner review and validation:

- Daily receipt/payment intake, admissions/enquiries, student/staff attendance, actual teaching sessions, homework/exam activity, and workflow/audit exceptions where source status is clear.
- Existing fee demand, collection, invoice, student receivable, receipt, refund/reversal, concession, and teacher-payroll registers.
- Weekly/monthly/quarterly/annual rollups only after the report period and event-date semantics are explicit.
- Existing fee reconciliation with its current bounded meaning; the UI should identify its scope and link to individual broken records.
- Management snapshot metrics only when each metric has a documented source, formula, availability state, and authorized drill-down.

### Explicitly excluded until a canonical source exists or integration is approved

- General Cash Book and Bank Book balances/reconciliation.
- General expense, purchase, asset, and inventory registers.
- General Ledger, Trial Balance, Profit & Loss, Balance Sheet, and statutory accounts.
- EduVault usage reporting under that name until its product entity/source is confirmed.

Do not show excluded reports with placeholder or fabricated values. Return a clear `not_supported`/`not_configured` state and explain the required source capability.

## 4. Delivery sequence after approval

| Step | Work | Guardrail / exit evidence |
|---|---|---|
| A. Decision and source freeze | Approve report scope, canonical tagline, calendar definitions, branch boundaries, and permissions. | Signed-off source map and formula matrix. No schema change. |
| B. Contract and calculation tests | Define report metadata, source ID/drill-down contract, status inclusion rules, missing-vs-zero states, and no-activity behavior. | Unit/contract tests for valid, empty, missing, reversed, and cross-boundary records. |
| C. Existing-source pilot | The daily collection receipt-trace pilot is implemented through the existing report route and workspace using canonical `PaymentReceipt` snapshots. | Targeted test covers valid, missing, and cancelled receipt states; no synthetic receipt number is emitted. Broader register pilots still require approval. |
| D. Cross-book reconciliation | Extend existing fee reconciliation only for validated sources; add explicit findings and source references. | Seeded mismatch tests; no auto-correction; resolved state is auditable. |
| E. Periodic reporting | Add period filters and rollups, using institution timezone and separate academic and financial calendars. | Boundary tests, late-entry behavior, reproducible formulas. |
| F. Management Snapshot | Compose approved report metrics rather than reimplementing formulas. | Each tile shows source, calculation, last-updated/cutoff, availability, and drill-down. |
| G. Edition archive and approvals | Only after owner approves retention and lifecycle semantics, save immutable generated editions, version lineage, checksum, parameters, source cutoff, actor, and approval. | Re-generation does not overwrite; corrected edition links to prior edition; permission/audit tests. |
| H. Print/export and production readiness | Add book-specific layouts to existing print/export systems. | PDF/browser print and CSV/XLSX checked with actual test data, multiple pages, totals, permissions, and source references. |

The remaining requested artifacts—financial registers, academic/administrative registers, periodic-book design, reconciliation design, snapshot design, close/approval design, archive design, test reports, user guide, and production-readiness report—should be created as the corresponding implementation phases are approved and completed. Do not create empty deliverables or claim they are verified in this design phase.

## 5. Integrity, security, and lifecycle requirements

- Financial calculations stay in backend domain services and use existing decimal-valued source records; formatting must not change arithmetic.
- Never infer settlement from a payment method, or accounting recognition from the existence of an invoice or payroll voucher.
- Preserve issued invoice, receipt, exam-mark, and other historical snapshots. Corrections use the existing authorized reversal/adjustment workflow.
- Do not auto-modify records to make a reconciliation pass.
- Scope queries and exports by institution/branch, tenant permissions, and data environment on the server. Avoid leaking sensitive fields in drill-downs or exports.
- Use separate permissions for view, generate, export, approve, close, reopen, audit access, and archive/restore. Payroll and sensitive student/financial details need least-privilege access.
- A report-period lock must not silently prevent legitimate corrections. Corrections after approval need traceable revised editions.
- Scheduled generation, if later approved, must not auto-approve or close a period.

## 6. Status and verification plan

This plan has not been validated against live database records, actual UI behavior, PDFs, exports, or a running deployment. Before accepting any implementation phase, require the evidence in the attached acceptance tests plus:

1. Source record IDs and independently recomputed totals for each report.
2. Duplicate-counting and fan-out tests across joins.
3. Period boundary, late-entry, timezone, cancellation, refund, and reversal cases.
4. Actual-zero versus empty/missing/unconfigured/unreconciled states.
5. Institution/branch, role, export, and drill-down authorization tests.
6. Generated PDF and CSV/XLSX content verification, including multi-page output.
7. Proof that prior approved report editions remain retrievable and unmodified, if archive is approved.

## 7. Owner decisions required before implementation

1. **Accounting:** Is a genuine accounting system already used by the institution? If yes, which integration and data contract are approved? If no, should accounting statements stay out of scope or be handled by a separate project?
2. **Brand:** Which exact product tagline is canonical? The attached command, uploaded logo, and current `BRANDING_CONFIG` disagree. No branding change is included here.
3. **Initial release:** Approve an existing-source-only release that does not claim Cash Book, Bank Book, expenses, assets, inventory, or formal statements?
4. **Calendar:** What financial-year start/end rules apply independently of the academic year? Are quarters calendar-based, financial-year-based, or configurable per institution?
5. **Org structure:** Does a report cover one institution, multiple branches, or an owner-level group? The current schema sometimes scopes through parent student/user records.
6. **Governance:** Who may view, export, approve, close, reopen, archive, and restore each class of book? Should close/reopen require a reason and immutable event history?
7. **Archive:** What is the retention period, who can restore/download, and are generated PDF/XLSX editions legally/operationally authoritative?
8. **Missing domains:** Are expense, inventory, assets, and EduVault modules planned or external? Which system is canonical for each?

## 8. Related Phase 1-2 artifacts

- [Existing-functionality audit](./2026-11-14_FINANCE-ACCOUNTING_AUDIT-REPORT_INSTITUTIONAL-BOOKS-EXISTING-FUNCTIONALITY_V1.md)
- [Source-to-report mapping](../11_REPORTS_EXPORTS/2026-11-14_REPORTS-EXPORTS_SOURCE-MAPPING_INSTITUTIONAL-BOOKS_V1.md)
- [Accounting capability assessment](./2026-11-14_FINANCE-ACCOUNTING_CAPABILITY-ASSESSMENT_DOUBLE-ENTRY-AND-STATEMENTS_V1.md)

**Approval status:** Pending owner review. No implementation has started.
