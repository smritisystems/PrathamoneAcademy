---
title: "Teacher Payroll & Payment Management — Teacher Visibility Audit & Remediation Report"
module: "06_TEACHER_PAYROLL"
category: "AUDIT-REPORT"
document_type: "REPORT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-06"
updated_date: "2026-11-06"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["teacher-payroll", "forensic-audit", "bugfix", "visibility", "sqlalchemy", "operator-precedence"]
entities: ["User", "StaffProfile", "TeacherPaymentProfile", "TeachingSession", "TeacherPayroll", "TeacherPaymentVoucher"]
api_routes: [
  "/api/v1/teacher-payroll/teachers",
  "/api/v1/teacher-payroll/profiles",
  "/api/v1/teacher-payroll/monthly",
  "/api/v1/teacher-payroll/sessions",
  "/api/v1/teacher-payroll/vouchers",
  "/api/v1/teacher-payroll/monthly/bulk-calculate"
]
related_modules: ["05_TEACHER_MANAGEMENT", "06_TEACHER_PAYROLL", "16_DATABASE_API"]
---

# PRATHAMONE EduOS — TEACHER PAYROLL VISIBILITY AUDIT & REMEDIATION REPORT

**Product:** PrathamOne EduOS  
**Edition:** Coaching Institute Edition  
**Module:** 06_TEACHER_PAYROLL  
**Product Architect:** Jawahar R Mallah  
**Organization:** AITDL — AI Technology & Development Lab  

---

## 1. EXECUTIVE SUMMARY

An end-to-end forensic audit was conducted on the **Teacher Payroll & Payment Management** module to identify why faculty members were not appearing across the workspace (dropdowns, profiles, session registers, and monthly calculations).

The investigation isolated **two critical backend bugs** and **two frontend UX bottlenecks**:
1. **Python Operator Precedence Fault in SQLAlchemy WHERE Clauses:** Expressions written as `Model.institution_id == current_user.institution_id or 1` evaluated to integer `1` due to Python operator precedence, triggering an unhandled `ArgumentError: SQL expression for WHERE/HAVING role expected, got 1` (HTTP 500) across six key endpoints.
2. **Missing Attribute Error on StaffProfile:** An attempt to access `sp.designation` threw an `AttributeError` because `designation` is stored on the canonical `users` model (`User.designation`).
3. **Empty Month Landing State:** The default tab ("Monthly Payroll") queries generated payroll for the selected period. In uncalculated months, the table was blank without explaining that faculty members exist and need calculation.
4. **Container State Staleness:** Production Docker containers were running cached application builds prior to the fixes.

All issues have been remediated, verified via automated pytest suites (5/5 passing), rebuilt in the frontend, synchronized to Docker, and visually validated through Playwright.

---

## 2. FORENSIC ROOT CAUSE ANALYSIS

### Root Cause 1: Operator Precedence on Multi-Tenant Isolation
In `backend/app/api/v1/endpoints/teacher_payroll.py`:
```python
# BUGGY CODE:
User.institution_id == current_user.institution_id or 1
```
Because `==` binds tighter than `or`, Python parsed the expression as:
```python
(User.institution_id == current_user.institution_id) or 1
```
In Python, SQLAlchemy's binary expression is truthy or short-circuits to the right-hand operand `1`. When passed to `and_(*conditions)` or `and_(...)`, SQLAlchemy rejected integer `1` with:
```
sqlalchemy.exc.ArgumentError: SQL expression for WHERE/HAVING role expected, got 1.
```
This crashed the following endpoints with HTTP 500:
- `GET /api/v1/teacher-payroll/teachers` (Populates all teacher dropdown selectors)
- `GET /api/v1/teacher-payroll/profiles` (Populates Tab 3: Teacher Profiles & Rates)
- `GET /api/v1/teacher-payroll/sessions` (Populates Tab 2: Teaching Session Register)
- `GET /api/v1/teacher-payroll/monthly` (Populates Tab 1: Monthly Payroll)
- `GET /api/v1/teacher-payroll/vouchers` (Populates Tab 4: Vouchers & Ledger)
- `POST /api/v1/teacher-payroll/monthly/bulk-calculate` (Bulk calculation engine)

### Root Cause 2: Column Schema Mismatch (`sp.designation`)
In `list_teacher_payment_profiles`:
```python
# BUGGY CODE:
"designation": sp.designation if sp else "Teacher"
```
The canonical person master `users` holds `users.designation`, whereas `staff_profiles` holds `department`, `staff_type`, and `specialization`. Attempting `sp.designation` caused an immediate `AttributeError`.

### Root Cause 3: Default Empty Period State & Silent Query Fallbacks
In `frontend/src/pages/TeacherPayroll.tsx`:
- When `monthlyPayrolls` query failed or had no records for November 2026, the table rendered 0 rows without displaying teacher profile links.
- Tab 3 ("Teacher Profiles & Rates") lacked an empty/error state and search filtering, displaying an empty grid when the profile API returned an error.

---

## 3. ARCHITECTURAL REMEDIATION

### 3.1 Backend Fixes (`backend/app/api/v1/endpoints/teacher_payroll.py`)
1. **Explicit Institution Extraction:**
   ```python
   inst_id = current_user.institution_id or 1
   ```
   Applied cleanly across `User.institution_id == inst_id`, `TeachingSession.institution_id == inst_id`, `TeacherPayroll.institution_id == inst_id`, and `TeacherPaymentVoucher.institution_id == inst_id`.
2. **Canonical Designation Resolution:**
   ```python
   "designation": u.designation or (sp.department if sp else "Teacher")
   ```
3. **SSOT Role & Staff Type Harmonization:**
   Joined `users` with `staff_profiles` using `or_(User.role == "teacher", StaffProfile.staff_type == "teacher")`, accurately selecting all active institute faculty (`Amit Patil`, `Neha Kulkarni`, `Priya Mehta`, `Rahul Desai`).

### 3.2 Frontend UX Enhancements (`frontend/src/pages/TeacherPayroll.tsx`)
1. **Interactive Search & Roster Counter:** Added real-time search across teacher names, departments, and payment methods in Tab 3, accompanied by an active faculty badge (`4 Faculty Members`).
2. **Intelligent Tab 1 Empty State:** Replaced the plain "No payroll calculated" text with an actionable panel featuring two prominent options:
   - `[Calculate Payroll Now]` (opens modal with bulk/individual selector)
   - `[View Teacher Profiles & Rates (4)]` (navigates directly to Tab 3)
3. **Comprehensive Error & Loading States:** Added visual loading spinners and explicit error alert boxes with retry controls for `monthlyError` and `profilesError`.

---

## 4. VERIFICATION EVIDENCE

### 4.1 Pytest Automated Suite
Executed `pytest backend/tests/test_teacher_payroll.py`:
```
backend/tests/test_teacher_payroll.py::test_hourly_payroll_calculation_and_voucher PASSED
backend/tests/test_teacher_payroll.py::test_lecture_and_fixed_payroll_calculations PASSED
backend/tests/test_teacher_payroll.py::test_session_approval_rejection_workflow PASSED
backend/tests/test_teacher_payroll.py::test_reports_and_export PASSED
backend/tests/test_teacher_payroll.py::test_teacher_visibility_and_listings PASSED
============================= 5 passed in 27.29s =============================
```

### 4.2 Production Build & Docker Container Sync
- **Vite Production Build:** `npx vite build` completed in 25.75s (0 errors).
- **Docker Frontend Sync:** Copied distribution assets to `prashant_academy_frontend:/usr/share/nginx/html/` and reloaded Nginx.
- **Docker Backend Restart:** Restarted `prashant_academy_backend` with live volume mapping.

### 4.3 Live Application Validation (Playwright)
- Verified all 4 active teachers are listed with full compensation details on Tab 3.
- Executed live bulk payroll calculation for November 2026; generated payroll records `PRL-2026-11-0001` through `PRL-2026-11-0004` displayed in the Monthly Payroll register.

