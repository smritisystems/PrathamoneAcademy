---
title: "Reporting & Analytics Centre Implementation & Integration Report"
module: "11_REPORTS_EXPORTS"
category: "IMPLEMENTATION-REPORT"
document_type: "REPORT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-07"
updated_date: "2026-11-07"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["reports", "analytics", "excel-grid", "codex", "rbac", "reporting-centre"]
entities: ["Student", "Payment", "FeeInvoice", "Subject", "AuditLog", "FeeInstallment"]
api_routes: [
  "/api/v1/reports/students/master-directory",
  "/api/v1/reports/attendance/summary",
  "/api/v1/reports/academic/curriculum-matrix",
  "/api/v1/reports/academic/timetable-utilization",
  "/api/v1/reports/examinations/consolidated-merit",
  "/api/v1/reports/fees/defaulters",
  "/api/v1/reports/fees/daily-collection",
  "/api/v1/reports/system/audit-summary"
]
related_modules: [
  "03_ACADEMIC_MANAGEMENT",
  "04_STUDENT_MANAGEMENT",
  "06_TEACHER_PAYROLL",
  "07_ATTENDANCE",
  "08_EXAMINATION",
  "09_FEES_PAYMENTS",
  "12_RBAC_SECURITY"
]
---

# Reporting & Analytics Centre — Implementation & Verification Report

**Product:** PrathamOne EduOS (Coaching Institute Edition)  
**Baseline Version:** 1.0.0  
**Architect:** Jawahar R Mallah  
**Organization:** AITDL — AI Technology & Development Lab  
**Date:** November 7, 2026  
**Status:** Completed & Production Deployed  

---

## 1. Executive Summary

In accordance with product architectural governance and the non-negotiable directive **"EXISTING FUNCTIONALITY FIRST — REUSE BEFORE REFACTORING — CREATE ONLY IF GENUINELY MISSING"**, the single-tab `/reports` page has been transformed into an enterprise-grade **Reporting & Analytics Centre**.

Rather than creating parallel duplicate reports, this implementation unified 17 existing domain reports dispersed across academic, payroll, examination, fees, sysadmin, and communication modules with 7 newly engineered canonical reports into a single, high-performance command centre.

Every tabular report is rendered via the reusable `<ExcelReportGrid>` component supporting instant client-side Excel (.xlsx), CSV (.csv), and JSON (.json) exports, multi-column sorting, cascading filters, sticky headers, and aggregated summary totals. All financial reports are strictly governed server-side by the `CodeXService` bijective masking engine.

---

## 2. Canonical Architecture & Directory of 24 Institutional Reports

The Reporting & Analytics Centre organizes the entire institution's operational, financial, academic, and administrative telemetry into **6 Canonical Categories**:

```
Reporting & Analytics Centre
├── 1. Students & Admissions (4 Reports)
│   ├── Student Master Directory & Demographic Roster
│   ├── Student Attendance Percentage & Defaulters (<75%)
│   ├── Student Withdrawals & Exit Ledger
│   └── Student Attrition & Retention Analytics
├── 2. Academics & Batches (4 Reports)
│   ├── Batch Capacity & Occupancy Analysis
│   ├── Academic Board / Standard Distribution
│   ├── Curriculum & Subject Matrix
│   └── Timetable Room & Schedule Utilization
├── 3. Fees & Financials (6 Reports) [CodeX Governed]
│   ├── Fee Collection & Realization Register
│   ├── Outstanding Dues & Aging Analysis
│   ├── Overdue Defaulters Aging Register
│   ├── Daily Payment Collection & Cashier Desk Register
│   ├── Payment Mode & Banking Inflow Distribution
│   └── Batch-wise Financial Reconciliation Ledger
├── 4. Teachers & Payroll (5 Reports)
│   ├── Faculty Teaching Workload
│   ├── Monthly Faculty Register
│   ├── Teaching Hours Delivery
│   ├── Disbursement Vouchers
│   └── Annual Payroll Summary Ledger
├── 5. Examinations & Merit (2 Reports)
│   ├── Consolidated Exam Marks & Merit Ranking Roster
│   └── Subject-wise Score & Pass Analytics
└── 6. System & Audit (3 Reports) [SysAdmin Gated]
    ├── Security & System Access Audit Trail
    ├── Communication & Notice Dispatch Logs
    └── Institutional Data Import / Export Migration History
```

---

## 3. Backend API Implementation & SSOT Verification

### 3.1 Newly Engineered & Unified Endpoints (`backend/app/api/v1/endpoints/reports.py`)

1. **Student Master Demographic Directory:**
   - **Route:** `GET /api/v1/reports/students/master-directory`
   - **Entity Joins:** `Student` → `StudentEnrollment` → `Standard` → `Division` → `Board`.
   - **Filters:** `board_id`, `standard_id`, `division_id`, `gender`, `status`, `search`.

2. **Cohort Attendance Summary & Defaulter Tracking:**
   - **Route:** `GET /api/v1/reports/attendance/summary`
   - **Computation:** Computes student-level attendance percentage, present days, absent days, late sessions, and flags `<75%` chronic defaulters.

3. **Curriculum & Subject Cross-Tabulation Matrix:**
   - **Route:** `GET /api/v1/reports/academic/curriculum-matrix`
   - **Entity Joins:** `Subject` → `Standard` → `Division` → `Board`, joined with `TeacherAssignment` and `User`.
   - **Telemetry:** Standard, affiliated boards, max/pass marks, weekly instructional hours, and assigned faculty roster.

4. **Timetable Room & Schedule Utilization:**
   - **Route:** `GET /api/v1/reports/academic/timetable-utilization`
   - **Entity Joins:** `TimetableEntry` → `Division` → `Standard` → `Subject` → `User`.
   - **Telemetry:** Classroom room number, day of week, time window, allocated batch, subject, and assigned instructor.

5. **Consolidated Exam Marks & Merit Ranking Roster:**
   - **Route:** `GET /api/v1/reports/examinations/consolidated-merit`
   - **Computation:** Aggregates marks across all subject exam marks per student, calculates aggregate score, percentage, letter grades (A+ to E), pass/fail status, and ordinal cohort rank (Rank 1, 2, 3...).

6. **Overdue Fee Defaulters Aging Register:**
   - **Route:** `GET /api/v1/reports/fees/defaulters`
   - **Entity Joins:** `FeeInstallment` → `FeeInvoice` → `Student` → `StudentEnrollment` → `Standard` → `Division`.
   - **Privacy Governance:** Strictly masked via `CodeXService.mask_records_list(numeric_fields=["overdue_amount", "total_outstanding"])`.

7. **Daily Payment Collection & Cashier Desk Register:**
   - **Route:** `GET /api/v1/reports/fees/daily-collection`
   - **Entity Joins:** `Payment` → `Student` → `User` (cashier).
   - **Privacy Governance:** Strictly masked via `CodeXService.mask_records_list(numeric_fields=["amount"])`.

8. **Security & System Access Audit Trail:**
   - **Route:** `GET /api/v1/reports/system/audit-summary`
   - **Telemetry:** Logs action timestamps, actor names, action verbs, target resources, client IP addresses, and security severities.

### 3.2 Security Remediations on Existing Endpoints
- **Outstanding Dues Report (`GET /reports/outstanding`):** Fixed security gap by piping rows through `CodeXService.mask_records_list(numeric_fields=["net_amount", "paid_amount", "outstanding"])`.
- **Payments Summary (`GET /reports/payments-summary`):** Fixed security gap by piping aggregate rows through `CodeXService.mask_records_list(numeric_fields=["total"])`.
- **Withdrawals CSV Export:** Fixed `NameError` in `export_student_withdrawals_report` where `export_rows` was improperly referenced instead of `data`.

---

## 4. Frontend Command Centre Capabilities (`frontend/src/pages/Reports.tsx`)

1. **6-Category Primary Switcher:** High-contrast responsive grid selector cards showing category icons, active highlight rings, and live report counts.
2. **Sub-Report Selector Pills:** Quick-switch pill navigation within each domain with instant active report transition.
3. **Favorites & Pinning Engine:** Users can click the star icon on any report pill to pin it to their quick-access favorites, persisted in browser `localStorage`.
4. **Instant Catalog Search:** Real-time search bar querying across all 24 reports by name, description, category, and keywords with an overlay quick-jump menu.
5. **Spreadsheet Excellence (`<ExcelReportGrid>`):**
   - Zero-latency client-side Excel `.xlsx` generation using SheetJS.
   - Standard `.csv` and `.json` data exports.
   - Resizable column headers with multi-column sorting.
   - Column-level filtering and search query highlighting.
   - Computed summary rows (totals, averages, counts).
6. **Analytical Visualizations (Recharts):**
   - Student Attrition: Reason distribution donut chart and class-level exit bar charts.
   - Payment Modes: Banking inflow pie charts (Cash, UPI, Cheque, Card, Bank Transfer).
   - Academic Distribution: Board and standard enrollment breakdown graphs.
   - Examination Analytics: Subject score distribution and pass percentage bar charts.
7. **RBAC Security Banners:** Friendly unauthorized state screens when non-privileged users attempt to inspect financial or system-level audit logs without required permissions.

---

## 5. Verification & Quality Assurance Evidence

### 5.1 Pytest Automated Test Suite (`backend/tests/test_reporting_centre.py`)
Executed inside the `prashant_academy_backend` container:
```bash
docker exec prashant_academy_backend pytest tests/test_reporting_centre.py -v
```
**Results:**
```
tests/test_reporting_centre.py::TestReportingCentre::test_student_master_directory_endpoint PASSED [ 11%]
tests/test_reporting_centre.py::TestReportingCentre::test_attendance_summary_endpoint PASSED [ 22%]
tests/test_reporting_centre.py::TestReportingCentre::test_academic_curriculum_matrix_endpoint PASSED [ 33%]
tests/test_reporting_centre.py::TestReportingCentre::test_academic_timetable_utilization_endpoint PASSED [ 44%]
tests/test_reporting_centre.py::TestReportingCentre::test_examination_consolidated_merit_endpoint PASSED [ 55%]
tests/test_reporting_centre.py::TestReportingCentre::test_fees_defaulters_endpoint_and_codex_masking PASSED [ 66%]
tests/test_reporting_centre.py::TestReportingCentre::test_fees_daily_collection_endpoint PASSED [ 77%]
tests/test_reporting_centre.py::TestReportingCentre::test_system_audit_summary_endpoint PASSED [ 88%]
tests/test_reporting_centre.py::TestReportingCentre::test_outstanding_and_payments_summary_codex_governance PASSED [100%]

======================== 9 passed, 2 warnings in 17.32s ========================
```

### 5.2 Vitest Frontend Unit & Integration Suite (`frontend/src/test/ReportingCentre.test.tsx`)
Executed on the frontend workspace:
```bash
npm test --prefix frontend -- src/test/ReportingCentre.test.tsx --run
```
**Results:**
```
 ✓ src/test/ReportingCentre.test.tsx (5 tests) 1722ms

 Test Files  1 passed (1)
      Tests  5 passed (5)
   Duration  8.19s
```

### 5.3 Frontend Build Verification
Executed:
```bash
npm run build --prefix frontend
```
**Results:**
```
✓ 2331 modules transformed.
✓ built in 17.34s (0 TypeScript errors, 0 JSX syntax issues).
```

### 5.4 Corporate Header Enforcement
Executed:
```bash
python scripts/manage_headers.py check
```
**Results:**
```
[CHECK] Verifying source-code attribution headers on 328 file(s)...
Total checked: 328
Passed:        328
Failed:        0
[PASS] All source files satisfy attribution and header compliance rules!
```

---

## 6. Deployment Status

- **Frontend:** Built and deployed to Nginx at `prashant_academy_frontend:/usr/share/nginx/html/`.
- **Backend:** Updated and running on `prashant_academy_backend` with healthy status (`{"status":"healthy"}`).
- **Database:** PostgreSQL 16 schema validated with zero dangling relationships or orphaned foreign keys.
