---
title: "PrathamOne EduOS — Global Functional Gap Analysis"
module: "20_AUDITS_COMPLIANCE"
category: "REPORT"
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
tags:
  - "gap-analysis"
  - "functional-defects"
  - "forensic-audit"
  - "prioritization"
entities:
  - "StudyMaterial"
  - "TeacherPayroll"
  - "TeachingSession"
  - "PaymentVoucher"
  - "StaffProfile"
api_routes:
  - "/api/v1/student-portal/*"
  - "/api/v1/teacher-payroll/*"
  - "/api/v1/staff/*"
related_modules:
  - "05_TEACHER_MANAGEMENT"
  - "06_TEACHER_PAYROLL"
  - "20_AUDITS_COMPLIANCE"
---

# PrathamOne EduOS — Global Functional Gap Analysis

**Product:** PrathamOne EduOS (Coaching Institute Edition)  
**Baseline Version:** 1.0.0  
**Product Architect:** Jawahar R. Mallah  
**Organization:** AITDL — AI Technology & Development Lab  

---

## 1. GAP INVENTORY & PRIORITIZATION TAXONOMY

Priorities are classified according to strict operational criteria:
- **P0 (Critical / Blocker):** Data loss, security breach, financial corruption, or production failure. *(Zero P0 gaps detected!)*
- **P1 (High / Core Functional Missing):** Core business workflow incomplete, disconnected, or unpersisted.
- **P2 (Medium / Integration Incomplete):** Important secondary workflow or automation pending.
- **P3 (Low / Operational Refinement):** UI notifications, audit logging depth, or configuration usability.
- **P4 (Cosmetic / Architectural Polish):** Minor route redirects or zero-row optional schema tables.

---

## 2. DETAILED GAP FINDINGS

### GAP-01: Admin Study Materials Management Missing & Static Course Catalog (MOD-11)
- **Module:** `MOD-11` Study Materials & Student Learning Portal
- **Priority:** **P1**
- **Status:** **UI ONLY**
- **Evidence:**
  - Sidebar line 74: `{ to: '/courses', label: 'Study Materials', icon: BookOpen }`
  - Frontend component: [`frontend/src/pages/Courses.tsx`](file:///f:/PrashantAcademy/frontend/src/pages/Courses.tsx#L38-L93) renders `const COURSES: CourseItem[] = [...]` (hardcoded 6-item static array).
  - Database table: `study_materials` (10 rows in PostgreSQL).
  - Backend endpoints: `/api/v1/student-portal/study-materials` exists strictly for student portal consumption.
- **What is Missing:**
  - Administrative CRUD API routes under `/api/v1/academic/study-materials` or `/api/v1/study-materials`.
  - Admin UI for teachers and staff to upload, organize by subject/batch, and publish PDF notes and assignments.
  - Real database integration on `/courses` (either dynamic Course Master or repurposing `/courses` to a dedicated Study Materials Management console).
- **Business Impact:** Staff cannot upload or distribute digital learning notes to students through the web application; students only see historical sample records.
- **Dependencies:** Academic Structure (`standards`, `subjects`, `divisions`), Student Portal.
- **Recommended Corrective Action:**
  1. Extend REST router `/api/v1/study-materials` with teacher/admin CRUD endpoints.
  2. Refactor `Courses.tsx` or create `StudyMaterialsManagement.tsx` with full View-First Edit Mode controls, file upload, and batch assignment.

---

### GAP-02: Teaching Sessions Auto-Logging & Teacher Payment Vouchers Unintegrated (MOD-05)
- **Module:** `MOD-05` Teacher Payroll & Compensation
- **Priority:** **P2**
- **Status:** **INTEGRATION PENDING**
- **Evidence:**
  - Tables `teaching_sessions` (0 rows), `teacher_payment_vouchers` (0 rows), `teacher_rate_histories` (0 rows).
  - File [`backend/app/services/teacher_payroll_service.py`](file:///f:/PrashantAcademy/backend/app/services/teacher_payroll_service.py).
  - Frontend [`frontend/src/pages/TeacherPayroll.tsx`](file:///f:/PrashantAcademy/frontend/src/pages/TeacherPayroll.tsx).
- **What is Missing:**
  - Timetable lecture completion check-in is not automatically inserting records into `teaching_sessions` to aggregate hourly teacher payouts.
  - While monthly payroll records (`teacher_payrolls`) calculate and persist properly, official printable payment vouchers (`teacher_payment_vouchers`) with voucher numbering are not automatically issued.
- **Business Impact:** Coaching institutes paying visiting/hourly faculty must manually calculate lecture hours rather than relying on automated timetable attendance aggregation.
- **Dependencies:** Timetable (`timetable_entries`), Teacher Attendance (`staff_attendances`).
- **Recommended Corrective Action:**
  1. Add an automated hook in `Attendance` marking for teachers that creates a `TeachingSession` record when a batch lecture is completed.
  2. Implement printable payment voucher generation leveraging `useUniversalPrint` in `TeacherPayroll.tsx`.

---

### GAP-03: Legacy Browser Alerts in Workforce & SysAdmin Pages (MOD-04, MOD-07, MOD-17)
- **Module:** `MOD-04`, `MOD-07`, `MOD-17`
- **Priority:** **P3**
- **Status:** **OPERATIONAL POLISH**
- **Evidence:**
  - `frontend/src/pages/StaffManagement.tsx:225, 245, 255, 258, 284`
  - `frontend/src/pages/SysAdminWorkspace.tsx:162, 165, 174, 177, 600`
  - `frontend/src/pages/TeacherManagement.tsx:238, 249, 252`
  - Total: 15 occurrences of `window.alert(...)`.
- **What is Missing:**
  - Replacement of native browser modal alerts with `react-hot-toast` (`toast.success` and `toast.error`).
- **Business Impact:** Minor UX degradation; native browser alert popups interrupt workflow and lack modern enterprise styling.
- **Dependencies:** None.
- **Recommended Corrective Action:** Refactor the 15 alert calls to `toast.success(...)` and `toast.error(...)`.

---

### GAP-04: Staff Employment History Not Populated on Job Promotions (MOD-04)
- **Module:** `MOD-04` Teacher & Staff Workforce
- **Priority:** **P3**
- **Status:** **SCHEMA EXTENSION UNLINKED**
- **Evidence:** Table `staff_employment_histories` has 0 rows.
- **What is Missing:**
  - When staff designation, department, or salary changes on `StaffProfilePage.tsx`, an audit entry should be appended to `staff_employment_histories`. Currently, fields are updated directly on `staff_profiles`.
- **Business Impact:** Historical promotion and designation track record is not retained in a separate dedicated ledger.
- **Dependencies:** `staff_profiles`.
- **Recommended Corrective Action:** Add an automatic insert into `staff_employment_histories` in `staff_service.py` during profile updates.

---

### GAP-05: Unpopulated Optional Ledger Tables (MOD-09, MOD-10, MOD-16, MOD-20)
- **Module:** `MOD-09`, `MOD-10`, `MOD-16`, `MOD-20`
- **Priority:** **P4**
- **Status:** **OPTIONAL / UNUSED IN CURRENT TENANT**
- **Evidence:**
  - `fee_installments`: 0 rows
  - `discounts`: 0 rows
  - `scholarships`: 0 rows
  - `refunds`: 0 rows
  - `codex_scope_assignments`: 0 rows
  - `data_import_logs`: 0 rows
- **What is Missing / Context:**
  - Prashant Academy operates on term-based fee invoices with direct net fee assignments, resulting in 0 discount/scholarship rows.
  - Zero refunds have occurred in the institute's operating history.
  - CodeX data masking is applied via global profile mappings rather than per-user scope assignments.
- **Business Impact:** None. Tables are fully supported by database models and migrations; their zero count reflects actual operational reality.
- **Dependencies:** None.
- **Recommended Corrective Action:** Preserve tables for enterprise multi-branch scaling.

---

## 3. SUMMARY OF AUDIT Gaps BY PRIORITY

| Priority | Count | Description |
|---|---|---|
| **P0** | **0** | Zero critical bugs, zero data corruption, zero production blockers |
| **P1** | **1** | Admin Study Materials management & `/courses` dynamic data integration |
| **P2** | **1** | Teaching sessions timetable hook & teacher payment vouchers |
| **P3** | **2** | Replace 15 `window.alert` calls with toast notifications; staff history logging |
| **P4** | **4** | Clean operational zero-row optional tables (`refunds`, `discounts`, etc.) |

