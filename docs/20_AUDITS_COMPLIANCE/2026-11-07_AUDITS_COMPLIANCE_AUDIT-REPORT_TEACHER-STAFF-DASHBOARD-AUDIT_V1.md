---
title: "Teacher and Staff Dashboard & Profile Forensic Audit — Workspaces, Navigation, and Action Verification"
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
tags: ["teacher-management", "staff-management", "dashboards", "profiles", "workspaces", "audit"]
entities: ["User", "StaffProfile", "TeacherAssignment", "StaffLeave", "StaffEmploymentHistory", "TeacherPayroll"]
api_routes: ["/api/v1/staff/teachers/dashboard", "/api/v1/staff/non-teaching/dashboard", "/api/v1/staff/{user_id}/lifecycle", "/api/v1/staff/{user_id}/activity-history"]
related_modules: ["05_TEACHER_MANAGEMENT", "06_TEACHER_PAYROLL", "07_ATTENDANCE", "17_UI_UX_DESIGN"]
---

# PRATHAMONE EduOS — TEACHER & STAFF DASHBOARD AUDIT

**Product:** PrathamOne EduOS (Coaching Institute Edition)  
**Baseline Version:** 1.0.0  
**Audit Scope:** Dedicated Teacher & Staff Workspaces, Analytics, Profiles & Action Menus  
**Lead Auditor:** Jawahar R Mallah, Product Architect  
**Organization:** AITDL — AI Technology & Development Lab  
**Audit Date:** 2026-11-07  

---

## 1. DEDICATED WORKSPACES ARCHITECTURAL AUDIT

Following the visual concept specification for PrathamOne EduOS Workforce Management, the system implements four distinct operational environments:

```
[ Workforce Management Architecture ]
  ├── 1. Teacher Dashboard (Teacher Workspace)         [TeacherManagement.tsx]
  ├── 2. Individual Teacher Profile (12 Tabs)          [TeacherProfilePage.tsx]
  ├── 3. Staff Dashboard (Staff Workspace)             [StaffManagement.tsx]
  └── 4. Individual Staff Profile (12 Tabs)            [StaffProfilePage.tsx]
```

This audit examines each workspace against data connectivity, analytics integrity, and interactive action handling.

---

## 2. WORKSPACE 1: TEACHER DASHBOARD (`TeacherManagement.tsx`)

### 2.1 KPI Cards & Metrics Verification
- **Endpoint:** `GET /api/v1/staff/teachers/dashboard`
- **Total Teachers:** `REAL_CONNECTED_DATA` (Count of users with teacher role / profile).
- **Active / Assigned / Unassigned / No Timetable / On Leave / Inactive / Departed:** `REAL_CONNECTED_DATA`. Live classifications computed by `workforce_service.py` by aggregating `users`, `staff_profiles`, `teacher_assignments`, `timetable_entries`, and `staff_leaves`.
- **Verdict:** KPI metric cards are 100% connected to live database state.

### 2.2 Visual Analytics Charts
- **Teacher Status Distribution Donut:** `REAL_CONNECTED_DATA`. Feeds dynamic counts from live metrics.
- **Monthly Teaching Hours Bar Chart:** `REAL_DATA_BUT_INCOMPLETE` / `MOCK_DATA`.
  - When sessions exist, the query sums `calculated_duration_hours` across 6 months.
  - **Defect:** If total hours equal 0 (fresh system or no sessions logged), the backend service injects `sample_hours = [480.0, 540.0, 620.0, 590.0, 640.0, 550.0]` and `total_trend_hours = 3420.0`. The frontend also defaults to `3420` and the same mock array.
  - **Remediation:** Remove synthetic data injection. Show flat 0 hours with an informative empty state.

### 2.3 Navigation Tabs & Action Modals
- **Tabs (All Faculty, Assigned, Unassigned, No Timetable, On Leave, Upcoming, Departed, Assignments Grid, Session Register):** `REAL_CONNECTED_DATA`. Filters live teacher lists.
- **Assign Faculty Modal:** `REAL_CONNECTED_DATA`. Opens modal, loads real boards/standards/divisions/subjects, and saves to `POST /api/v1/staff/assignments/create`.

---

## 3. WORKSPACE 2: INDIVIDUAL TEACHER PROFILE (`TeacherProfilePage.tsx`)

### 3.1 12-Tab Profile Architecture
Every teacher is accessible at `/teachers/:id` and renders 12 dedicated tabs:
1. `Overview`: Profile summary, current assignments, teaching activity summary (`REAL_CONNECTED_DATA`).
2. `Personal`: Gender, DOB, Blood Group, Aadhaar, PAN, Address (`REAL_CONNECTED_DATA`).
3. `Employment`: Staff Code, Joining Date, Employment Type, Status (`REAL_CONNECTED_DATA`).
4. `Qualifications`: Degrees, Specialization, University, Year of Passing (`REAL_CONNECTED_DATA`).
5. `Subjects`: List of assigned subjects (`REAL_CONNECTED_DATA`).
6. `Assignments`: Interactive batch allocation cards (`REAL_CONNECTED_DATA`).
7. `Timetable`: Weekly schedule slots from `timetable_entries` (`REAL_CONNECTED_DATA`).
8. `Attendance`: Monthly attendance percentage & day count from `attendances` (`REAL_CONNECTED_DATA`).
9. `Leave`: Leave history and balances from `staff_leaves` (`REAL_CONNECTED_DATA`).
10. `Payroll`: Payment profile, rate type, frequency from `teacher_payment_profiles` (`REAL_CONNECTED_DATA`).
11. `Documents`: `PLACEHOLDER_UI`. 4 hardcoded string titles with dead "View" buttons.
12. `Activity`: `REAL_CONNECTED_DATA`. Timeline loaded from `/api/v1/staff/{user_id}/activity-history`.

### 3.2 Action Menu Integrity
- **Update Employment Status:** `REAL_CONNECTED_DATA`. Handled; opens `StaffLifecycleModal`.
- **Assign Batch & Subject:** `MISSING_IMPLEMENTATION`. Unhandled event in `onAction`. Clicking does nothing.
- **Print Employee Dossier:** `MISSING_IMPLEMENTATION`. Unhandled event in `onAction`. Clicking does nothing.
- **Edit Button:** `MISSING_IMPLEMENTATION`. `onEdit` prop not passed.

---

## 4. WORKSPACE 3: STAFF DASHBOARD (`StaffManagement.tsx`)

### 4.1 KPI Cards & Metrics Verification
- **Endpoint:** `GET /api/v1/staff/non-teaching/dashboard`
- **Total Staff, Active, Unassigned, On Leave, Inactive, Departed, Upcoming, Departments:** `REAL_CONNECTED_DATA`. Computed dynamically from non-teaching users.

### 4.2 Visual Analytics Charts & Cards
- **Staff by Department Donut Chart:** `HARDCODED_DATA`.
  - **Defect:** In `StaffManagement.tsx:375-381`, segments are hardcoded:
    - Administration: 10, Accounts: 4, IT & Systems: 3, Library: 3, Others: 8.
  - **Evidence:** The backend endpoint computes and returns `department_headcounts`, but the frontend completely ignores it!
- **Salary Payable & Pending Payments Cards:** `MOCK_DATA` fallback.
  - Defaults to `₹7,84,500` and `₹1,26,000`. In the backend, if `salary_payable == 0`, it computes `active_staff * 32687.50` (which equals 784,500 for 24 staff).
  - **Remediation:** Bind directly to `department_headcounts` and show actual sum of basic salaries without synthetic multipliers.

---

## 5. WORKSPACE 4: INDIVIDUAL STAFF PROFILE (`StaffProfilePage.tsx`)

### 5.1 12-Tab Profile Architecture
Every non-teaching staff member is accessible at `/staff/:id` and renders 12 dedicated tabs:
- `Overview`, `Personal`, `Employment`, `Department`, `Designation`, `Reporting`, `Responsibilities`, `Attendance`, `Leave`, `Salary`, `Documents`, `Activity`.
- Tabs 1-10 and 12 are wired to real API fields and query caches.
- **Documents Tab:** `PLACEHOLDER_UI`. 4 hardcoded string titles with dead "View" buttons.

### 5.2 Hero Card Fallbacks & Actions
- **Fallbacks:** Line 160 (`phone || '+91 98673 21904'`), Line 164 (`'Office Administrator'`), Line 173 (`joining_date || '01 Aug 2019'`).
- **Update Employment Status:** `REAL_CONNECTED_DATA`. Opens lifecycle transition modal.
- **Print Employee Dossier:** `MISSING_IMPLEMENTATION`. Unhandled event in `onAction`.
- **Edit Button:** `MISSING_IMPLEMENTATION`. `onEdit` prop not passed.

---

## 6. FORENSIC AUDIT CONCLUSION

The dual-workspace architecture (separate Teacher and Staff hubs) with dedicated 12-tab profiles represents an outstanding foundation. The primary gaps are confined to:
1. Connecting the 2 dead action items in `WorkforceHeroCard` (Assign Batch & Print Dossier).
2. Removing hardcoded chart fallbacks in both workspace dashboards.
3. Replacing the mock documents list with a real document attachment mechanism.

---
*Report Certified by Product Architect Jawahar R Mallah — AITDL AI Technology & Development Lab.*

