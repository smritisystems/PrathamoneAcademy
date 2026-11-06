---
title: "Chart and Analytics Validation — Forensic Evaluation of Visual Metrics and Fallback Risks"
module: "20_AUDITS_COMPLIANCE"
category: "AUDIT-REPORT"
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
tags: ["charts", "analytics", "data-validation", "visual-metrics", "fallbacks", "audit"]
entities: ["TeachingSession", "TeacherAssignment", "StaffProfile", "Payment", "Attendance"]
api_routes: ["/api/v1/staff/teachers/dashboard", "/api/v1/staff/non-teaching/dashboard", "/api/v1/reports/dashboard-stats"]
related_modules: ["05_TEACHER_MANAGEMENT", "06_TEACHER_PAYROLL", "11_REPORTS_EXPORTS", "17_UI_UX_DESIGN"]
---

# PRATHAMONE EduOS — CHART & ANALYTICS VALIDATION REPORT

**Product:** PrathamOne EduOS (Coaching Institute Edition)  
**Baseline Version:** 1.0.0  
**Audit Scope:** Visual Analytics, Donut Charts, Trend Bars, and KPI Computation  
**Lead Auditor:** Jawahar R Mallah, Product Architect  
**Organization:** AITDL — AI Technology & Development Lab  
**Audit Date:** 2026-11-07  

---

## 1. OBJECTIVE & AUDIT CRITERIA

Visual charts and KPI cards provide institute leadership with operational visibility into attendance, workload, compliance, and finances. Every chart was audited against four strict governance rules:
1. **Real Data Backing:** The chart must derive entirely from live database records.
2. **Date Range Authenticity:** Timelines must reflect the actual institution academic year or calendar dates.
3. **Mathematical Consistency:** Chart slice totals must reconcile with corresponding table listings.
4. **Zero-State Integrity:** If zero records exist, the chart must render zero or an explicit empty state—NEVER fallback mock numbers.

---

## 2. CHART & ANALYTICS AUDIT REGISTER

| Chart Component | Page Location | Metric Displayed | Data Source | Classification | Verification Finding & Fallback Risk |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **Teacher Status Distribution** | `TeacherManagement.tsx:506` | Status breakdown (Assigned, Unassigned, No Timetable, On Leave) | `GET /api/v1/staff/teachers/dashboard` | `REAL_CONNECTED_DATA` | **PASS.** Reconciles with live rows in `users` and `teacher_assignments`. Sum of segments equals total teachers. |
| **Monthly Teaching Hours Trend** | `TeacherManagement.tsx:518` | 6-month historical completed teaching hours | `GET /api/v1/staff/teachers/dashboard` | `MOCK_DATA` *(Conditional Fallback)* | **FAIL.** While the SQL query sums `TeachingSession.calculated_duration_hours`, both backend (`workforce_service.py:291`) and frontend inject synthetic sample hours `[480, 540, 620, 590, 640, 550]` and `3420` total hours when database session count is 0. |
| **Staff by Department Donut** | `StaffManagement.tsx:371` | Headcount breakdown across administrative departments | `GET /api/v1/staff/non-teaching/dashboard` | `HARDCODED_DATA` | **FAIL.** Frontend completely hardcodes slice values: Admin: 10, Accounts: 4, IT: 3, Library: 3, Others: 8. Backend already returns `department_headcounts`, but frontend ignores it. |
| **Salary Payable (Staff Workspace)** | `StaffManagement.tsx:385` | Monthly non-teaching salary obligation | `GET /api/v1/staff/non-teaching/dashboard` | `MOCK_DATA` *(Conditional Fallback)* | **FAIL.** Frontend defaults to `₹7,84,500` via `|| 784500`. Backend calculates `active_staff * 32687.50` when `basic_salary` is unpopulated. |
| **Pending Payments (Staff Workspace)**| `StaffManagement.tsx:398` | Unsettled non-teaching compensation | `GET /api/v1/staff/non-teaching/dashboard` | `MOCK_DATA` *(Conditional Fallback)* | **FAIL.** Frontend defaults to `₹1,26,000` via `|| 126000`. Backend multiplies salary by `0.1606`. |
| **Attendance Trends Chart** | `Attendance.tsx:410` | Daily attendance percentage trend | `GET /api/v1/attendance/stats` | `REAL_CONNECTED_DATA` | **PASS.** Computed from `attendances` table records. Correctly drops to 0 on holidays. |
| **Fee Collection Overview** | `Fees.tsx:620` | Collections vs Pending vs Overdue | `GET /api/v1/payments/summary` | `REAL_CONNECTED_DATA` | **PASS.** Derives from live `payments` and `student_fee_assignments`. |
| **Exam Marks Distribution** | `Examinations.tsx:780` | Grade percentiles and pass percentages | `GET /api/v1/exams/{id}/analytics`| `REAL_CONNECTED_DATA` | **PASS.** Derives directly from `exam_marks` table records. |

---

## 3. REMEDIATION REQUIREMENTS FOR CHARTS

1. **Teacher Monthly Hours:** Remove lines 291-297 in `workforce_service.py` that inject `sample_hours`. Update `MonthlyTeachingHoursChart.tsx` to display:
   - Total Hours: `0 hrs`
   - Flat zero-height bars with an SVG overlay: *"No teaching sessions completed in the last 6 months."*
2. **Staff Department Donut:** Replace hardcoded `segments` array in `StaffManagement.tsx:375` with:
   ```tsx
   segments={dashboardData?.department_headcounts?.map((dept, idx) => ({
     label: dept.department,
     count: dept.count,
     color: DEPARTMENT_COLORS[idx % DEPARTMENT_COLORS.length]
   })) || []}
   ```
3. **Staff Financial Cards:** Remove `|| 784500` and `|| 126000` fallbacks. Display `₹0` when no payroll obligations are configured.

---
*Report Certified by Product Architect Jawahar R Mallah — AITDL AI Technology & Development Lab.*

