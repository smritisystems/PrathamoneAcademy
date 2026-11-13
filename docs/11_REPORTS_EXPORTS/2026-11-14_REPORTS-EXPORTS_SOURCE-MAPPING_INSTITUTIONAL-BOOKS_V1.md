---
title: "Institutional Books Source-to-Report Mapping"
module: "11_REPORTS_EXPORTS"
category: "SOURCE-MAPPING"
document_type: "MAPPING"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-14"
updated_date: "2026-11-14"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Pending Review"
tags: ["institutional-books", "source-mapping", "ssot", "report-provenance"]
entities: ["Student", "StudentEnrollment", "FeeInvoice", "Payment", "PaymentAllocation", "PaymentReceipt", "Refund", "Attendance", "TeachingSession", "TeacherPayroll", "AuditLog"]
api_routes: ["/api/v1/reports/*", "/api/v1/fees/*", "/api/v1/payments/*", "/api/v1/attendance/*", "/api/v1/teacher-payroll/*", "/api/v1/examinations/*", "/api/v1/homework/*"]
related_modules: ["03_ACADEMIC_MANAGEMENT", "04_STUDENT_MANAGEMENT", "06_TEACHER_PAYROLL", "07_ATTENDANCE", "08_EXAMINATION", "09_FEES_PAYMENTS", "10_FINANCE_ACCOUNTING", "12_RBAC_SECURITY", "14_PRINTING_DOCUMENTS"]
---

# Institutional Books Source-to-Report Mapping

This mapping identifies the source records to reuse for the proposed books. “Available” means a source model and/or route exists in the repository; it does not certify production data completeness or the calculation accuracy of every report. Unsupported reports must remain unavailable rather than showing fabricated zeroes.

## 1. Source map

| Book/report family | Authoritative source records | Existing report/API surface | Status and mapping rule |
|---|---|---|---|
| Fee demand / invoice register | `FeeInvoice`, `FeeInvoiceItem`, `StudentFeeAssignment`, `FeeStructure`, `FeeCategory` | `/api/v1/fees/invoices`, `/api/v1/fees/register`, `/api/v1/reports/fee-collection`, `/api/v1/reports/outstanding` | Available. Use invoice amounts and statuses as the obligation source; do not rebuild an invoice from current fee-structure joins. Preserve invoice/item snapshots. |
| Fee collections / receipt register | `Payment`, `PaymentAllocation`, `PaymentReceipt` | `/api/v1/payments/`, `/api/v1/payments/receipts-list`, `/api/v1/reports/fees/daily-collection` | Pilot implemented. The endpoint selects the latest `PaymentReceipt` snapshot by version; it returns its number only while valid and exposes the recorded status or `missing`. The workspace labels missing receipts without fabricating a number. A receipt is a snapshot linked to a payment, not a second collection. |
| Student fee ledger / outstanding | `FeeInvoice`, `PaymentAllocation`, `Refund`, concession allocations and write-off/adjustment records | Fee register and financial governance summary/reconciliation | Available with rules. Separate current recoverable dues, historical dues, unapplied advances, pending refunds, completed refunds, concessions, and written-off amounts. Do not sum invoice and allocation facts across a multiplying join. |
| Refund, reversal, and adjustment register | `Refund`, payment reversal metadata, `PaymentAllocation`, concession applications/allocations, `AuditLog` | `/api/v1/payments/refunds/`, payment audit trail, concession reconciliation and trace endpoints | Available for existing transaction types. Preserve original and reversing record IDs; do not mutate a posted amount to create a balancing appearance. |
| Concession / scholarship register | `FeeConcessionType`, `StudentConcessionApplication`, `FeeConcessionAllocation`, `SponsorSettlement` | `/api/v1/fees/concessions/*`, `/api/v1/reports/concessions/*` | Available. Distinguish requested, approved, applied/posted, reversed, sponsor-sanctioned, and sponsor-received amounts. Reuse `FinancialGovernanceService`. |
| Cashier intake by payment mode | `Payment`, `PaymentReceipt`, collector user, student and invoice relations | `/api/v1/reports/fees/daily-collection`, `/api/v1/payments/receipts-list` | Partial. Supports transaction intake; it is not a Cash Book and does not prove physical cash on hand or bank settlement. |
| Cash Book / Bank Book / bank reconciliation | No institution cash/bank account ledger, opening balance, cash deposit/withdrawal, transfer, statement-line, or bank-match source identified | None identified as a genuine ledger | Blocked. Payment method and bank reference fields alone cannot produce account balances or a reconciliation. |
| General expenses / payment vouchers | No canonical general expense or purchase voucher source identified. Teacher `TeacherPaymentVoucher` is payroll-specific. | No general expense-register API identified | Not implemented. Do not count teacher payroll as all expenses or create a parallel expense ledger in a reporting feature. |
| Trial Balance / General Ledger / financial statements | No chart of accounts, journal header/lines, posting batches, or general-ledger source identified | None identified | Blocked. Requires an approved accounting product/integration or separate accounting architecture. |
| Student admission / status register | `Student`, `StudentEnrollment`, `StudentLifecycleLog`, user/audit actor references | `/api/v1/reports/students/master-directory`, withdrawal and admissions/CRM surfaces | Available. Use enrollment status and lifecycle event dates; distinguish active, transferred, withdrawn, inactive, completed, and cancelled populations. |
| Enquiries / follow-ups / demonstrations | `Lead`, `LeadFollowUp`, `LeadDemoClass` | `/api/v1/leads/*`; CRM report surface | Available. Admissions conversion should link to the resulting student/enrollment when a conversion exists; do not double-count a lead as an admitted student. |
| Student attendance | `Attendance`, `StudentEnrollment`, `Student` | `/api/v1/attendance/*`, `/api/v1/reports/attendance/summary` | Available with policy rules. Define eligible student-days and approved exclusions before calculating rates. |
| Staff attendance / leave | `StaffAttendance`, `StaffLeave`, `StaffProfile`, `User` | `/api/v1/staff/*` | Available. Filter to the institution and protect sensitive HR fields. |
| Timetable / scheduled teaching | `TimetableEntry`, division/subject/teacher assignments | Academic/timetable report APIs | Available as planned activity. Label as scheduled, not conducted. |
| Actual teaching / lecture register | `TeachingSession` with `session_date`, `session_status`, actual times, approval state, payroll link | `/api/v1/teacher-payroll/sessions`, report type `teaching-hours` | Available. Count only eligible actual statuses for delivered classes; retain scheduled, cancelled, substitute, and unapproved distinctions. |
| Teacher payroll / salary payments | `TeacherPayroll`, `TeacherPaymentVoucher`, teacher user/profile and teaching sessions | `/api/v1/teacher-payroll/monthly`, `/vouchers`, `/reports/{report_type}` | Available as payroll records. Keep calculations in the payroll service and restrict row access; this is not a general ledger posting. |
| Examinations / marks / results | `Examination`, `ExamMark`, student, subject, academic year | `/api/v1/examinations/*`, `/api/v1/reports/examinations/consolidated-merit` | Available. Preserve issued/approved marks snapshots and distinguish absent, not evaluated, and zero marks. |
| Homework / assignments / submissions | `HomeworkAssignment`, `StudentHomeworkRecord`, `HomeworkAuditLog`, `HomeworkFile` | `/api/v1/homework/*` | Available. Separate assigned, submitted, reviewed, pending, exempted, and cancelled records. |
| EduBoard usage | `EduBoard`, `EduBoardPage`, `EduBoardRevision`, `EduBoardAttachment` | `/api/v1/eduboard/*`, EduBoard summary report | Available for EduBoard activity. |
| EduVault resource register | No canonical EduVault model/API identified; study materials and EduBoard attachments are distinct sources | Study-material and EduBoard routes are not an EduVault ledger | Not verified/unsupported as named. Do not relabel unrelated content storage as EduVault without confirming product semantics. |
| Communications / dispatch | `CommunicationLog`, message templates, recipient links/statuses | `/api/v1/communication/*`, communication report in `/reports` | Available for dispatch activity. A sent/queued/failed message must not be reported as successfully delivered unless a delivery state exists. |
| Administrative changes / approval history | `AuditLog`, workflow-specific approver/status fields, setting audit logs | `/api/v1/reports/system/audit-summary`; payment/concession/payroll audit endpoints | Partial. There is no single generic approval or management-decision ledger. Use domain workflow records and audit rows; do not infer a business approval from a generic audit event alone. |
| Inventory / assets / stock movements | No canonical inventory/asset source identified | None identified | Not implemented. Requires approved domain ownership before any register can be built. |
| Generated book archive | No general report-edition record identified. Receipt snapshots and staff generated forms are scoped document features. | Shared print/export tools exist but no complete book archive API identified | Not implemented. Persist immutable edition metadata and content only after retention, authorization, and correction/version policies are approved. |

## 2. Provenance contract for future report rows

Every detail row should identify its authoritative source without copying it into a new transaction system:

- `source_type` and `source_id` (for example `payment` and its primary key).
- The source's existing transaction, invoice, receipt, enrollment, session, or voucher reference.
- Institution and branch scope resolved through the canonical owning entity.
- Business-effective event date, separate from `created_at` and report-generation time.
- Status included in the calculation and any reversal/correction reference.
- The calculation definition/version and report-period boundaries for aggregates.

Aggregate totals should expose a trace action or a reproducible detail query that yields the exact contributing source IDs. Avoid one-to-many joins that multiply transaction amounts; aggregate each fact source at its own grain before combining summaries.

## 3. Date and population semantics

Do not use one generic timestamp for all books. Candidate business dates include `Payment.payment_date`, `Refund.refund_date`, `FeeInvoice.issue_date`/`due_date`, `StudentEnrollment.enrollment_date`/`exit_date`, `Attendance.date`, `TeachingSession.session_date`, exam dates, and workflow effective dates. The approved report definition must state which date drives inclusion and which status set contributes.

Institution timezone exists on `Institution`; reporting period boundaries must be computed in that timezone. Academic-year bounds and financial-year bounds are separate concepts. Current `FinancialPeriod.academic_year_id` coupling must be addressed in the design before cross-year financial books are promised.

## 4. Tenant, branch, and environment filters

Not every source row directly stores `institution_id`. Some domains must be scoped through the student, user, enrollment, institution, or parent transaction relationship. Every future report and export must apply the canonical institution/branch authorization and the existing production/training data-environment rules at the backend. A client-side filter is not an authorization boundary.

## 5. Source documents

- [`FinancialGovernanceService`](../../backend/app/services/financial_governance_service.py)
- [`fee.py`](../../backend/app/models/fee.py)
- [`payment.py`](../../backend/app/models/payment.py)
- [`teacher_payroll.py`](../../backend/app/models/teacher_payroll.py)
- [`Reports.tsx`](../../frontend/src/pages/Reports.tsx)
- [`reports.py`](../../backend/app/api/v1/endpoints/reports.py)
- [`teacher_payroll.py` API](../../backend/app/api/v1/endpoints/teacher_payroll.py)
- [`ReportIntelligenceService`](../../backend/app/services/report_intelligence_service.py)

This is a repository-source mapping, not a live-data reconciliation. It is pending review before implementation.
