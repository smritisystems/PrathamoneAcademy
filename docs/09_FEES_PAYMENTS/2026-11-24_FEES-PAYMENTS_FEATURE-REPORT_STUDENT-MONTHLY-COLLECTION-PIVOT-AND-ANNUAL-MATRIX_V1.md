---
title: "Dynamic Student-wise Fee Collection Pivot & 12-Month Annual Financial Matrix"
module: "09_FEES_PAYMENTS"
category: "FEATURE-REPORT"
document_type: "REPORT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-24"
updated_date: "2026-11-24"
author: "Jawahar R Mallah"
organization: "Smritisys & AITDL Networks"
status: "Approved"
tags: ["fees", "monthly-pivot", "annual-matrix", "defaulters-fix", "student-collections", "realization"]
entities: ["Student", "StudentEnrollment", "FeeInvoice", "FeeInvoiceInstallment", "Payment", "PaymentReceipt"]
api_routes: ["/api/v1/fees/student-monthly-pivot", "/api/v1/fees/dimension-analytics"]
related_modules: ["03_ACADEMIC_MANAGEMENT", "04_STUDENT_MANAGEMENT", "10_FINANCE_ACCOUNTING"]
---

# Dynamic Student-wise Fee Collection Pivot & 12-Month Annual Financial Matrix

## Executive Summary

This feature report documents the architectural design, implementation, and verification of the enterprise **Dynamic Student-wise Fee Collection Pivot** and the **12-Month Annual Financial Realization Matrix** in **PrathamOne EduOS** (Coaching Institute Edition).

In addition to implementing the full student-wise monthly collection matrix with interactive transaction drilldown popovers, this release resolves critical data-integrity discrepancies identified during multi-dimensional financial auditing:
1. **Defaulter Count Deduplication**: Resolved a bug where student records with multiple batch transfers or re-enrollments caused defaulter counts to exceed enrolled student counts.
2. **Text Clipping & Horizon Padding**: Fixed horizontal truncation on the Annual comparison matrix where the `Academic Year` header and `2026-27` label were clipped.
3. **12-Month Financial Realization Pivot in Annual View**: Embedded a multi-dimensional 12-month realization matrix across educational boards, grades, and batch cohorts with automatic totals.

---

## 1. Architectural Compliance & SSOT Alignment

In strict compliance with **RULE 001 through RULE 015**:
- **Single Source of Truth (SSOT)**: Reused existing canonical masters (`students`, `student_enrollments`, `fee_invoices`, `fee_invoice_installments`, `payments`, `academic_years`, `boards`, `standards`, `divisions`). Zero duplicate tables or parallel entities created.
- **Data Deduplication Governance (Rule 011)**: All student fee realization metrics aggregate by canonical `Student.id` rather than raw enrollment row iterations.
- **View-First Governance (Rule 010)**: All pivot tables, metrics ribbons, and drilldowns operate in safe read-only View Mode with explicit action boundaries.
- **Sleek UI/UX Design System (Rule 014)**: Adheres to Linear/Stripe-grade aesthetics with custom 6px ultra-thin scrollbars, soft pastel badge tints, monospace numeric/timing chips, sticky frozen identification columns, and minimalist `—` markers for non-billed periods.

---

## 2. Dynamic Student-wise Monthly Fee Collection Pivot

### 2.1 Matrix Specifications
- **Fixed & Sticky Row Dimensions**:
  - `Student Name`: Frozen left sticky column (`left-0`, `min-w-[170px]`, `z-20`).
  - `Admission #`: Frozen second sticky column (`left-[170px]`, `min-w-[125px]`, `z-20`).
  - `Board`: Educational board badge (CBSE, ICSE, SSC, etc.).
  - `Standard / Grade`: Class/Grade badge (Class X, Class IX, etc.).
  - `Division & Batch`: Cohort designation.
  - `Agreed Package Fee`: Total committed institutional tuition obligation.
- **Dynamic 12-Month Academic Sequence**:
  - Columns: `March`, `April`, `May`, `June`, `July`, `August`, `September`, `October`, `November`, `December`, `January`, `February`.
  - Displays cumulative realized payment sum per month in Indian currency (`₹`).
  - Displays pending installment status badge (`Pending ₹...`) only when an actual installment due schedule exists and remains uncollected.
  - Displays minimalist `—` when no billing or obligation is scheduled for that month.
- **Computed Terminal Summaries**:
  - `Total Collected`: Total verified cash/bank/UPI receipts for the student.
  - `Balance Due`: `Agreed Package Fee - Total Valid Collected Payments`.

### 2.2 Interactive Transaction Receipt Drilldown Popover
Clicking or focusing any active monthly cell opens an immediate transaction drilldown popover displaying:
- Receipt Number (`PA-REC-...`)
- Transaction Date & Timestamp
- Payment Mode (`CASH`, `UPI`, `BANK_TRANSFER`, `CHEQUE`)
- Realized Amount (`₹`)
- Reference / Transaction Note

### 2.3 Cascading Dynamic Filters
- **Academic Year**: Preselected to current active year (`2026-27`).
- **Board**: Independent master filter (CBSE, ICSE, Maharashtra State Board).
- **Standard / Grade**: Dependent filter cascading from selected Board.
- **Division / Batch**: Dependent filter cascading from selected Standard.
- **Payment Status**: `All`, `Paid in Full`, `Partial Payment`, `Overdue Defaulters`, `Upcoming Schedule`.
- **Student Status**: `Active`, `Transferred`, `Completed`.
- **Payment Method**: `Cash`, `UPI`, `Bank Transfer`, `Cheque`.
- **Live Search**: Instant multi-attribute search across Student Name, Admission Number, and Guardian Contact.
- **Reset Filters**: One-click restoration of all filter dimensions to institution defaults.

### 2.4 Receipt Print & PDF Download Integration
In the **Monthly Payment Details** popout window:
- **Top Card Actions**: Dedicated `Print Receipt` and `Download PDF` buttons for rapid voucher handling.
- **Transaction Table Actions**: Every single transaction row contains isolated `Print` (opens official A5 portrait receipt modal with QR verification and watermarks) and `PDF` (triggers automated download of the official signed receipt PDF).
- **Print Hygiene Enforcement**: Receipt printing uses isolated iframe sandboxing to strip application backdrops and navigation bars.

### 2.5 Quick Receive Payment & Collection Priority Remarks
- **Quick Receive Payment Action**:
  - `Pending` cells feature an interactive clock badge leading to the payment dispatcher.
  - Blank unbilled cells (`—`) smoothly reveal a `+ Collect` button on hover, providing instant access to the Collection Desk or a dedicated terminal without navigating away from the matrix.
- **Collection Remarks & Priority Engine**:
  - Operators can attach follow-up remarks and priority ratings (`URGENT`, `HIGH`, `NORMAL`, `LOW`) along with follow-up status (`PROMISE_TO_PAY`, `FOLLOW_UP_REQUIRED`, `UNDER_REVIEW`, `DISPUTED`, `CLEARED`).
  - Urgent and High priority tags are prominently rendered next to student names in the matrix.
  - Persisted in canonical `FeeInvoice.notes` and `FeeInvoice.remarks` with automated user audit attribution.

---

## 3. Data Integrity & Defaulters Fix

### 3.1 Forensic Audit of Defaulters Overcounting Bug
During audits, the Annual Perspective previously reported **61 Defaulters** out of **40 Enrolled Students**.
Forensic investigation revealed that student `137` (Roudrita PA-2024-000009) possessed 26 transfer and test records in `student_enrollments`. Without `Student.id` deduplication, the query joined enrollments directly, duplicating the same student across multiple batch transitions.

### 3.2 Implemented Resolution
In `backend/app/api/v1/endpoints/fees.py`:
- Distinct student deduplication was enforced:
```python
# Deduplicate students by distinct Student.id to ensure canonical accuracy
unique_students = {s.id: s for s in students_query.all()}.values()
defaulters_count = sum(1 for s in unique_students if student_balances.get(s.id, 0) > 0)
```
- Realized Result: Defaulters count strictly normalized to **36** out of **40** unique enrolled students.

---

## 4. Annual 12-Month Financial Realization Pivot Matrix

In the `Annual Year-wise` perspective of `BatchMonthlyFeeMatrix.tsx`:
1. **Header Truncation Resolved**: Added `min-w-[140px] whitespace-nowrap px-5 py-3` to ensure `Academic Year` and `2026-27` headers and cells have ample clearance without horizontal clipping.
2. **12-Month Financial Realization Pivot Matrix**:
   - Integrated a complete realization card with sub-dimension switchers:
     - `By Board`: Realization across CBSE, ICSE, and State Boards.
     - `By Grade`: Realization across Class X, Class IX, Class VIII, etc.
     - `By Batch`: Realization across individual batch cohorts.
   - Comprehensive footer displaying cumulative monthly totals across all 12 academic months and year-to-date realization.

---

## 5. Verification & Testing Evidence

### 5.1 Automated Test Execution
Automated test suite executed inside Docker container `prashant_academy_backend`:
```
tests/test_dimension_analytics.py::test_dimension_analytics_annual_board_standard PASSED [ 20%]
tests/test_student_monthly_pivot.py::test_student_monthly_pivot_default_and_summary PASSED [ 40%]
tests/test_student_monthly_pivot.py::test_student_monthly_pivot_board_filter PASSED [ 60%]
tests/test_student_monthly_pivot.py::test_student_monthly_pivot_payment_status_filter PASSED [ 80%]
tests/test_student_monthly_pivot.py::test_student_monthly_pivot_search PASSED [100%]

======================== 5 passed, 3 warnings in 13.27s ========================
```

### 5.2 Release Hygiene & Whitelist Audit
Audited distribution bundle using `python scripts/check_release_hygiene.py`:
- Total Distribution Files: `282`
- Total Distribution Size: `76.33 MB`
- Status: `100% CLEAN RELEASE PAYLOAD` (Zero forbidden extensions, bloat files, or raw media).

### 5.3 Corporate Attribution Compliance
Audited codebase using `python scripts/manage_headers.py check`:
- Total Files Checked: `799`
- Passed: `799` (100% compliance across all backend and frontend source files).

---

## 6. Conclusion

The Dynamic Student-wise Fee Collection Pivot and 12-Month Annual Financial Realization Matrix are fully operational, performant, and production-certified in PrathamOne EduOS 1.0.0.
