---
title: "Teacher & Staff Dedicated Workforce Dashboards Implementation Report"
module: "05_TEACHER_MANAGEMENT"
category: "IMPLEMENTATION-REPORT"
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
tags: ["workforce", "teacher-management", "staff-management", "unassigned-teachers", "lifecycle", "ssot", "audit"]
entities: ["User", "StaffProfile", "StaffEmploymentHistory", "TeacherAssignment", "TimetableEntry", "TeachingSession", "TeacherPayroll", "StaffLeave", "StaffAttendance"]
api_routes: ["/api/v1/staff/teachers/dashboard", "/api/v1/staff/non-teaching/dashboard", "/api/v1/staff/{user_id}/lifecycle", "/api/v1/staff/{user_id}/activity-history"]
related_modules: ["06_TEACHER_PAYROLL", "07_ATTENDANCE", "03_ACADEMIC_MANAGEMENT", "12_RBAC_SECURITY"]
---

# PRATHAMONE EduOS — TEACHER & STAFF DEDICATED WORKFORCE DASHBOARDS
## Feature Implementation & Architectural Report — Version 1.0.0

**Product:** PrathamOne EduOS  
**Edition:** Coaching Institute Edition  
**Baseline Version:** 1.0.0  
**Product Architect:** Jawahar R Mallah  
**Organization:** AITDL — AI Technology & Development Lab  
**Policy Status:** FULL COMPLIANCE (SSOT & Corporate Attribution)

---

## 1. EXECUTIVE SUMMARY

The **Teacher & Staff Dedicated Workforce Dashboards** module establishes authoritative, distinct, and comprehensive operating workspaces for faculty and non-teaching personnel in **PrathamOne EduOS** (Coaching Institute Edition v1.0.0).

In full compliance with **RULE 001 through RULE 009 (Single Source of Truth Governance)**:
- **Canonical Person Identity:** The `users` table (`users.id`) serves as the single authoritative master identity for all teachers, administrative staff, accountants, and principals.
- **Canonical Employment Record:** The `staff_profiles` table (`staff_profiles.user_id = users.id`) maintains the sole employee record.
- **Zero Duplicate Master Tables:** No duplicate `teachers` or `instructors` tables exist. Teachers are classified by role/staff_type (`teacher`), while non-teaching staff encompass administration, counseling, accounts, and IT.
- **Assignment vs Status Separation:** An active teacher with zero batch assignments remains active and is accurately classified as `unassigned` with visual alerts and one-click batch allocation.
- **Rehire Continuity:** When a resigned, terminated, or contract-ended employee is rehired, the system reinstates their existing canonical identity and records an immutable historical ledger event in `staff_employment_histories` without creating parallel records.

---

## 2. ARCHITECTURAL AUDIT & SCHEMA ENHANCEMENTS

### 2.1 Database Migration: `021_workforce_lifecycle_and_employment_history.py`

The Alembic migration added lifecycle fields to `staff_profiles` and created the `staff_employment_histories` table:

```sql
-- Enhanced staff_profiles columns
ALTER TABLE staff_profiles ADD COLUMN contract_start_date DATE;
ALTER TABLE staff_profiles ADD COLUMN contract_end_date DATE;
ALTER TABLE staff_profiles ADD COLUMN status_effective_date DATE;
ALTER TABLE staff_profiles ADD COLUMN exit_date DATE;
ALTER TABLE staff_profiles ADD COLUMN exit_reason VARCHAR(255);
ALTER TABLE staff_profiles ADD COLUMN rehire_eligible BOOLEAN DEFAULT TRUE;
ALTER TABLE staff_profiles ADD COLUMN approved_by_id INTEGER REFERENCES users(id);

-- Immutable Employment History Ledger
CREATE TABLE staff_employment_histories (
    id SERIAL PRIMARY KEY,
    staff_profile_id INTEGER NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    old_status VARCHAR(50) NOT NULL,
    new_status VARCHAR(50) NOT NULL,
    effective_date DATE NOT NULL,
    reason VARCHAR(255),
    notes TEXT,
    recorded_by_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2.2 Entity Categorization (SSOT Classification)

| Table | SSOT Classification | Business Function | Canonical Key |
|---|---|---|---|
| `users` | Master | Canonical person and authentication master | `users.id` |
| `staff_profiles` | Master (Extension) | Canonical employee profile & personal details | `staff_profiles.id`, `user_id` |
| `staff_employment_histories` | Ledger | Immutable chronological lifecycle state transitions | `id`, `staff_profile_id` |
| `teacher_assignments` | Relationship | Academic allocation to standard, division, subject | `teacher_assignments.id` |
| `timetable_entries` | Transaction / Schedule | Weekly schedule slots with conflict detection | `timetable_entries.id` |
| `teaching_sessions` | Transaction | Verified teaching activity register | `teaching_sessions.id` |
| `teacher_payrolls` | Transaction / Ledger | Monthly payroll calculation and liabilities | `teacher_payrolls.id` |
| `teacher_payment_vouchers` | Ledger | Official disbursement vouchers | `teacher_payment_vouchers.id` |

---

## 3. BACKEND DOMAIN SERVICE ARCHITECTURE

The centralized domain service `backend/app/services/workforce_service.py` implements:

1. **`get_teacher_workforce_dashboard(db, institution_id, academic_year_id)`**:
   Computes the 13 live KPI metrics and teacher directory:
   - `total_teachers`
   - `active_teachers`
   - `assigned_teachers`
   - `unassigned_teachers` (Active teachers with 0 active batch assignments)
   - `teachers_without_timetable` (Active teachers with assignments > 0, but 0 active timetable slots)
   - `teachers_on_leave` (Teachers on active approved leave)
   - `inactive_teachers`
   - `departed_teachers` (Resigned, terminated, contract ended)
   - `upcoming_joining` (Draft, selected, upcoming joining dates)
   - `pending_session_approvals` (Submitted teaching sessions)
   - `monthly_teaching_hours` (Sum of verified hours for current month)
   - `monthly_payroll_payable` (Total net payable for current month)
   - `pending_teacher_payments` (Unpaid balance on monthly payrolls)

2. **`get_staff_workforce_dashboard(db, institution_id)`**:
   Computes non-teaching staff headcount, department breakdowns, and designation statistics.

3. **`update_employee_lifecycle(...)`**:
   Handles authoritative status transitions:
   - `activate`
   - `put_on_leave`
   - `deactivate`
   - `resign`
   - `terminate`
   - `end_contract`
   - `rehire`
   Enforces audit logging, immutably updates `staff_employment_histories`, and manages user authentication state (`user.is_active`).

4. **`get_employee_activity_history(...)`**:
   Collates a chronological timeline across:
   - Lifecycle state changes
   - Academic batch assignments
   - Timetable slots
   - Staff attendance records
   - Leave applications and decisions
   - Teaching activity sessions
   - Monthly payroll generation
   - Disbursement vouchers
   - Document uploads and verification

---

## 4. API ENDPOINTS SPECIFICATION

The endpoints are mounted under `/api/v1/staff/`:

| Method | Endpoint | Description | Access Control |
|---|---|---|---|
| `GET` | `/api/v1/staff/teachers/dashboard` | Dedicated Teacher Workspace live metrics & directory | Admin, Principal, Superadmin |
| `GET` | `/api/v1/staff/non-teaching/dashboard` | Dedicated Staff Workspace live metrics & departments | Admin, Principal, Superadmin |
| `POST` | `/api/v1/staff/{user_id}/lifecycle` | Execute status transition (activate, leave, resign, rehire) | Admin, Superadmin |
| `GET` | `/api/v1/staff/{user_id}/activity-history` | Unified chronological activity timeline | Admin, Principal, Self |

---

## 5. FRONTEND WORKSPACES & COMPONENTS

### 5.1 Dedicated Teacher Workspace (`frontend/src/pages/TeacherManagement.tsx`)
- **Route:** `/teachers` and `/teacher-management`
- **13 Live Metric Cards:** With interactive filtering on click.
- **Unassigned Alert Badge:** Special amber highlighting for teachers with 0 active batch assignments, featuring a 1-click batch allocation shortcut.
- **Tabs:** All Faculty, Assigned, Unassigned, No Timetable, On Leave, Upcoming, Departed, Batch Allocations Grid, and Session Register.
- **Fast Search:** Live substring search across name, employee ID, phone, email, qualification, and specialization.

### 5.2 15-Tab Teacher Profile Modal (`frontend/src/components/TeacherProfileModal.tsx`)
- **Overview:** Summary card, status badge, key metrics.
- **Personal Information:** DOB, gender, blood group, address, emergency contact.
- **Employment:** Employee ID, joining date, contract dates, employment type, status.
- **Qualifications:** Degree, certifications, years of experience.
- **Subjects & Specializations:** Specialization focus and masteries.
- **Batch Assignments:** Table of assigned standards, divisions, subjects, weekly hours, and class teacher designations.
- **Timetable:** Active weekly lecture slots and scheduling.
- **Teaching Sessions:** Live verified teaching register with approvals and compensation.
- **Attendance:** Attendance logs and check-in/out records.
- **Leave Balances:** Casual, sick, earned balances and past applications.
- **Payroll Configuration:** Hourly rate, per-lecture rate, monthly fixed amount, payment method.
- **Payroll Slips:** Monthly generated payslips with gross pay, deductions, and net payable.
- **Payment Disbursements:** Disbursement vouchers with transaction references.
- **Documents & KYC:** Official appointment letters, service agreements, and KYC records.
- **Unified Activity Timeline:** Chronological timeline of all employee events.

### 5.3 Dedicated Staff Workspace (`frontend/src/pages/StaffManagement.tsx`)
- **Route:** `/staff`
- Live Non-Teaching workforce counters (Total Staff, Active, Departments, On Leave, Upcoming, Departed).
- Department and designation breakdown cards.
- Daily attendance register and check-in/out recording.
- Leave application approvals and tracking.
- 28 printable HR document templates.

### 5.4 Staff Profile Modal (`frontend/src/components/StaffProfileModal.tsx`)
- Comprehensive 10-tab modal tailored specifically for administrative, operational, accounts, and IT personnel.

### 5.5 Employee Lifecycle Action Modal (`frontend/src/components/StaffLifecycleModal.tsx`)
- Radio selection of transition actions: Activate, Approved Leave, Deactivate, Resignation, Termination, End Contract, Rehire.
- Standard reason templates + custom justification.
- Rehire eligibility toggle.
- Submits to `POST /api/v1/staff/{user_id}/lifecycle`.

---

## 6. VERIFICATION & QUALITY ASSURANCE

### 6.1 Backend Pytest Suite (`backend/tests/test_workforce_dashboards.py`)
- `test_teacher_dashboard_and_assignment_status`: Verifies teacher transitions between `unassigned` -> `assigned` -> `has_timetable`. **PASSED**
- `test_employee_lifecycle_transitions_and_rehire`: Verifies lifecycle state changes (`resign` -> `rehire`), immutable history ledger recording, and identity preservation. **PASSED**
- `test_non_teaching_staff_dashboard`: Verifies non-teaching staff filtering and department counting. **PASSED**
- **Result:** 3 passed in 11.26s.

### 6.2 Frontend Vitest Suite (`frontend/src/test/WorkforceDashboards.test.tsx`)
- `renders Teacher Workspace with live 13 KPI metric cards and unassigned teacher badge`: **PASSED**
- `filters teacher list when clicking Unassigned sub-filter tab`: **PASSED**
- `opens and submits StaffLifecycleModal for status transition`: **PASSED**
- `renders Non-Teaching Staff Workspace with department and headcount KPIs`: **PASSED**
- **Result:** 4 passed in 21.06s.

### 6.3 Production Build Verification
- `vite build` completed successfully with **0 errors** in 24.70s.
- `TeacherManagement` bundle: 69.13 kB.
- `StaffManagement` bundle: 66.05 kB.

### 6.4 Corporate Attribution & Header Compliance
- Executed `python scripts/manage_headers.py check`.
- Verified 275 source files across Python and TypeScript.
- **Result:** 275/275 passed (100% compliance).

---

## 7. CONCLUSION & NEXT PHASES

The Dedicated Teacher & Staff Workforce Dashboards module is fully implemented, verified, and operational in **PrathamOne EduOS v1.0.0**. The system enforces single source of truth person identity, provides clear visibility over unassigned faculty, and manages complete employment lifecycles.
