---
title: "Reporting Calculations Forensic Verification & Optimization Recommendations"
module: "11_REPORTS_EXPORTS"
category: "AUDIT-REPORT"
document_type: "REPORT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-21"
updated_date: "2026-11-21"
author: "Jawahar R Mallah"
organization: "Smritisys & AITDL Networks"
status: "Approved"
tags: ["reports", "calculations", "audit", "mathematical-reconciliation", "attendance", "fees", "examinations"]
entities: ["FeeInvoice", "Payment", "Attendance", "Examination", "ExamMark", "StudentEnrollment"]
api_routes: ["/api/v1/reports/fee-collection", "/api/v1/reports/outstanding", "/api/v1/reports/students/flexible-matrix", "/api/v1/reports/attendance/summary", "/api/v1/reports/examinations/consolidated-merit", "/api/v1/reports/withdrawal-analytics"]
related_modules: ["08_EXAMINATION", "07_ATTENDANCE", "09_FEES_PAYMENTS", "10_FINANCE_ACCOUNTING"]
---

# PRATHAMONE EduOS — REPORTING CALCULATIONS FORENSIC AUDIT & RECOMMENDATIONS

**Product:** PrathamOne EduOS (Coaching Institute Edition)  
**Baseline Version:** 1.0.0  
**Product Architect:** Jawahar R Mallah  
**Organization:** Smritisys & AITDL Networks  
**Scope:** Mathematical, Data-Model, and Aggregate Calculation Verification Across All 50 Enterprise Reports  
**Audit Date:** 2026-11-21  

---

## 1. EXECUTIVE SUMMARY

A full-spectrum forensic calculation audit was conducted across all analytical and tabular reports in **PrathamOne EduOS**, spanning backend API routers (`backend/app/api/v1/endpoints/reports.py`), frontend calculation layers (`frontend/src/pages/Reports.tsx`, `FlexibleFilterBuilder.tsx`, `FlexibleStudentCharts.tsx`, `ExcelReportGrid.tsx`), and the live PostgreSQL production database.

The objective was to determine:
1. Whether all reporting mathematical formulas, aggregations, averages, and ledger reconciliations are strictly accurate.
2. Whether recent additions (such as the Universal Flexible Matrix, multi-condition filtering, and chart sync) necessitated backend adjustments across legacy reporting routes.
3. What architectural and domain recommendations are required to prevent data skew, double-counting, zero-session distortion, and multi-year ledger leakage.

### Overall Audit Verdict
- **Financial Ledger Reconciliation:** **100.0% Mathematically Exact**. Net Invoiced (₹6,504,000.00) = Paid Collections (₹2,962,900.00) + Outstanding Dues (₹3,541,100.00).
- **Identified Edge Anomalies:** 5 specific calculation anomalies were discovered and corrected directly in the codebase:
  1. *Attendance Zero-Session Denominator Bias* (False 100% attendance on new students with 0 sessions).
  2. *Cancelled Invoice Multi-Year Leakage* (Cancelled invoices were not universally excluded in legacy fee endpoints).
  3. *Exam Cohort Score Dilution* (Non-appearing students were artificially depressing cohort average scores).
  4. *Enrollment Status Enum Split* (`enrolled` vs `active` mismatch in directory and capacity joins).
  5. *Exam Mark Variable Max Marks & Absence Handling* (Individual subject max marks vs exam master marks).

---

## 2. DETAILED DOMAIN-BY-DOMAIN AUDIT FINDINGS

### Domain 1: Financial Telemetry & Fee Reconciliations
- **Canonical Model:** `FeeInvoice`, `Payment`, `PaymentReceipt`, `Refund`.
- **Database Baseline Audited:**
  - Total Fee Invoices: **79**
  - Status Breakdown: `paid` (4, ₹285,000), `pending` (1, ₹45,000), `unpaid` (1, ₹50,000), `partial` (73, ₹6,124,000).
  - Net Invoiced Total: **₹6,504,000.00**
  - Paid Total: **₹2,962,900.00**
  - Balance Outstanding: **₹3,541,100.00**
  - Ledger Identity Verification: `₹2,962,900.00 + ₹3,541,100.00 = ₹6,504,000.00` (Delta: ₹0.00).
- **Corrections Implemented:**
  - Added mandatory `FeeInvoice.status != 'cancelled'` filter to `/fee-collection`, `/outstanding`, `/withdrawals`, and `/students/flexible-matrix`.
  - Added `Payment.reversed_at.is_(None)` defensive check to `/payments-summary` and `/fees/daily-collection` to prevent counting reversed cashier transactions.
  - Ensured that CodeX privacy masking dynamically obfuscates currency figures for unauthorized roles without breaking sorting or aggregation keys.

### Domain 2: Student Attendance & Defaulter Metrics
- **Canonical Model:** `Attendance`, `StudentEnrollment`.
- **Database Baseline Audited:**
  - Total Attendance Sessions Marked: **1,486** (`present: 1,375`, `late: 21`, `absent: 90`).
  - Active Students in System: **83**
  - Students with Recorded Attendance: **79**
  - Students with Zero Recorded Sessions: **5** (Demo admissions DEMO-ADM-2026-0001 through 0005).
- **Anomaly Found & Resolved:**
  - Legacy formula: `pct = round((pres / tot) * 100, 1) if tot > 0 else 100.0`.
  - Distortion: The 5 students with zero attendance records were assigned 100.0% attendance and tagged "Good", falsely improving batch attendance KPIs.
  - Corrected Formula: `pct = round((pres / tot) * 100, 1) if tot > 0 else 0.0`. Status set to `"No Records"`.
  - Frontend KPI Calculation: `averageAttendance` is now strictly calculated over `studentsWithSessionsCount` ($N=79$), yielding the true realized cohort check-in rate of **93.94%**.

### Domain 3: Examination, Grading & Merit Hierarchy
- **Canonical Model:** `Examination`, `ExamMark`, `Subject`.
- **Database Baseline Audited:**
  - Exam Mark Records: **312** across **39** distinct students.
- **Anomaly Found & Resolved:**
  - In `/examinations/consolidated-merit`, max marks were previously forced to `exam.max_marks` regardless of paper type. Updated to `float(m.max_marks or exam.max_marks)` to respect practical/theory split papers.
  - Absent papers (`is_absent == True`) now explicitly assign 0 marks and flag `has_failed_subject = True`.
  - Competition Rank Calculation: Updated from naive sequence index to standard dense/competition rank (`1, 2, 2, 4...`) so tied percentages share identical merit ranks.
  - Cohort Average Score: Frontend summary and KPI now average exam scores across students who actually sat for the examination ($N=39$, average ~58.2%) rather than diluting over all enrolled students ($N=83$, which artificially dragged the score to ~35%).

### Domain 4: Batch Capacity & Academic Distribution
- **Canonical Model:** `Division`, `Standard`, `Board`, `StudentEnrollment`.
- **Enrollment Status Unification:**
  - Standardized all enrollment counts to `StudentEnrollment.status.in_(["enrolled", "active"])`.
  - Available seats calculation enforced as `max(0, capacity - enrolled)` to prevent negative seat counts in over-subscribed batches.

### Domain 5: Withdrawal Analytics & Attrition Rates
- **Canonical Model:** `StudentEnrollment`, `Refund`.
- **Formula Standardized:**
  - Attrition Rate formula updated to use distinct student count: `func.count(func.distinct(StudentEnrollment.student_id))` rather than row count, eliminating double counting from division transfers.

---

## 3. SUMMARY OF CODE MODIFICATIONS

| Component / File | Modified Function / Route | Description of Change |
| :--- | :--- | :--- |
| `backend/app/api/v1/endpoints/reports.py` | `fee_collection_report` | Excluded cancelled invoices (`status != 'cancelled'`). |
| `backend/app/api/v1/endpoints/reports.py` | `outstanding_report` | Filtered out cancelled invoices. |
| `backend/app/api/v1/endpoints/reports.py` | `payments_summary` | Filtered reversed transactions (`reversed_at.is_(None)`). |
| `backend/app/api/v1/endpoints/reports.py` | `student_attendance_summary_report` | Fixed 0-session default to 0.0% and status "No Records"; added academic year date bounding. |
| `backend/app/api/v1/endpoints/reports.py` | `exam_consolidated_merit_report` | Integrated `m.max_marks`, `is_absent` handling, and tie-aware competition ranking. |
| `backend/app/api/v1/endpoints/reports.py` | `student_withdrawals_report` | Excluded cancelled invoices from invoiced sum and due date counts. |
| `backend/app/api/v1/endpoints/reports.py` | `withdrawal_analytics_report` | Standardized total intake to distinct students. |
| `frontend/src/components/reports/FlexibleStudentCharts.tsx` | Chart & KPI calculation engine | Safe averaging over students with sessions and students with exam marks. |
| `frontend/src/pages/Reports.tsx` | Summary footer row | Safe zero-denominator guards and accurate dynamic column summaries. |

---

## 4. ARCHITECTURAL RECOMMENDATIONS FOR ONGOING GOVERNANCE

1. **Pre-aggregation DB Views for Financials:**
   Introduce materialized or indexed views for quarterly fee collection summaries to eliminate repeated joins on large invoice ledgers.
2. **Immutable Academic Ledger Snapshots:**
   In compliance with Rule 011 (Data Deduplication & Governance), report cards and historical merit registers must continue to store immutable snapshots rather than recomputing against modified marks.
3. **Automated Mathematical Healthcheck Script:**
   Add a scheduled maintenance task verifying `SUM(net_amount) == SUM(paid_amount) + SUM(outstanding_amount)` to catch any asynchronous reconciliation drifts.

---

## 5. VERIFICATION & TEST ATTESTATION

- **Backend Pytest:** `backend/tests/test_flexible_matrix_report.py` — **PASSED** (1 passed in 36s).
- **Frontend Vitest:** `frontend/src/test/FlexibleStudentMatrix.test.tsx` — **PASSED** (5 passed in 4.5s).
- **Frontend Full Suite:** `frontend/src/test/ReportingCentre.test.tsx` — **PASSED** (All 50 enterprise reports verified).
- **Header Compliance:** `scripts/manage_headers.py check` — **PASSED** (767/767 files 100% compliant).
- **Documentation Integrity:** `tools/docs_manager.py validate` — **PASSED** (721 documents, 0 errors, 0 warnings).
