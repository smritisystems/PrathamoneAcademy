---
title: "Dedicated Teacher & Staff Workforce Dashboards Implementation Plan"
module: "05_TEACHER_MANAGEMENT"
category: "IMPLEMENTATION-PLAN"
document_type: "PLAN"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-06"
updated_date: "2026-11-06"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["teachers", "staff", "workforce", "dashboards", "lifecycle", "assignments", "timetable", "activity-history"]
entities: ["User", "StaffProfile", "StaffEmploymentHistory", "TeacherAssignment", "TimetableEntry", "TeachingSession", "StaffAttendance", "StaffLeave", "TeacherPayroll"]
api_routes: [
  "/api/v1/staff/teachers/dashboard",
  "/api/v1/staff/non-teaching/dashboard",
  "/api/v1/staff/{user_id}/lifecycle",
  "/api/v1/staff/{user_id}/activity-history"
]
related_modules: ["05_TEACHER_MANAGEMENT", "06_TEACHER_PAYROLL", "07_ATTENDANCE", "03_ACADEMIC_MANAGEMENT", "12_RBAC_SECURITY"]
---

# PRATHAMONE EduOS — DEDICATED TEACHER & STAFF WORKFORCE DASHBOARDS
## Technical Implementation Plan — Version 1.0.0

**Product:** PrathamOne EduOS  
**Edition:** Coaching Institute Edition  
**Module:** 05_TEACHER_MANAGEMENT & People Operations  
**Product Architect:** Jawahar R Mallah  
**Organization:** AITDL — AI Technology & Development Lab  

---

## 1. OBJECTIVE & ARCHITECTURAL DIRECTIVE

Implement dedicated, enterprise-grade **Teacher Workspace** and **Staff Workspace** dashboards with comprehensive employment lifecycle tracking, assignment visibility, activity auditing, attendance, leave, payroll integration, and historical records.

### Mandatory Single Source of Truth (SSOT) Compliance
1. **Canonical Identity Master:** All teaching and non-teaching personnel resolve to the canonical `users` table (`users.id`).
2. **Canonical Employee Profile:** All employment details resolve to `staff_profiles` (`staff_profiles.user_id = users.id`).
3. **Zero Duplicate Masters:** No parallel `teachers` or `instructors` tables shall be created. Teachers are distinguished by `staff_type = 'teacher'` or `role = 'teacher'`.
4. **Historical Continuity:** Rejoining/rehiring the same individual reactivates their canonical profile and records an employment history event without creating a duplicate identity.

---

## 2. DATABASE SCHEMA ENHANCEMENTS

### 2.1 StaffProfile Field Additions
Extend `backend/app/models/staff.py` (`StaffProfile`):
- `contract_start_date`: Date | None
- `contract_end_date`: Date | None
- `status_effective_date`: Date | None
- `exit_date`: Date | None
- `exit_reason`: String(255) | None
- `rehire_eligible`: Boolean (default=True)
- `approved_by_id`: ForeignKey("users.id") | None

### 2.2 Employment Lifecycle Ledger (`StaffEmploymentHistory`)
Create `StaffEmploymentHistory` in `backend/app/models/staff.py`:
- `id`: Integer (Primary Key)
- `staff_profile_id`: ForeignKey("staff_profiles.id", ondelete="CASCADE")
- `user_id`: ForeignKey("users.id", ondelete="CASCADE")
- `event_type`: String(50) — `'joined'`, `'status_change'`, `'contract_renewed'`, `'leave_started'`, `'leave_ended'`, `'resigned'`, `'terminated'`, `'contract_ended'`, `'rehired'`
- `old_status`: String(30) | None
- `new_status`: String(30)
- `effective_date`: Date
- `reason`: String(255) | None
- `notes`: Text | None
- `recorded_by_id`: ForeignKey("users.id") | None
- `created_at`: DateTime(timezone=True)

---

## 3. CORE LOGIC SPECIFICATIONS

### 3.1 Teacher Assignment Classification (Phase 3)
- **Unassigned:** Teacher is active (`status == 'active'` or `user.is_active == True`), but has zero active academic assignments (`teacher_assignments` count == 0).
- **Assigned:** Teacher has 1 or more active batch-subject assignments (`teacher_assignments` count > 0).
- **No Timetable:** Teacher has active assignments, but zero active scheduled slots in `timetable_entries` for the current academic session.
- **On Leave:** Teacher has an approved leave record overlapping today or `status == 'on_leave'`.
- **Inactive / Departed:** Clearly separated from unassigned teachers (`status in ('resigned', 'terminated', 'contract_ended', 'inactive')`).

### 3.2 Live Overview Metrics (13 Live Counters)
1. `total_teachers`
2. `active_teachers`
3. `assigned_teachers`
4. `unassigned_teachers`
5. `teachers_without_timetable`
6. `teachers_on_leave`
7. `inactive_teachers`
8. `departed_teachers`
9. `upcoming_joining`
10. `pending_session_approvals`
11. `monthly_teaching_hours`
12. `monthly_payroll_payable`
13. `pending_teacher_payments`

### 3.3 Activity History Chronology (Phase 8)
Unified aggregation service `get_employee_activity_history(db, user_id, limit=50)` pulling:
- Status changes and rehire events from `StaffEmploymentHistory`
- Academic assignments from `TeacherAssignment`
- Scheduled timetable entries from `TimetableEntry`
- Attendance records from `StaffAttendance`
- Leave approvals from `StaffLeave`
- Teaching sessions from `TeachingSession`
- Payroll computations and vouchers from `TeacherPayroll` and `TeacherPaymentVoucher`
- Uploaded credentials from `StaffDocument`
- System audits from `AuditLog`

---

## 4. UI & WORKSPACE ARCHITECTURE

### 4.1 Dedicated Teacher Workspace (`frontend/src/pages/TeacherManagement.tsx`)
- Navigation route: `/teachers`
- 16 Tabs:
  1. Overview (13 KPI cards, workload distribution, urgent session approvals)
  2. All Teachers
  3. Active Teachers
  4. Assigned Teachers
  5. Unassigned Teachers (highlighting action to assign batch/subject)
  6. Teachers Without Timetable
  7. On Leave
  8. Inactive Teachers
  9. Departed Teachers (with rehire trigger)
  10. Upcoming Joining
  11. Teaching Activity (verified session hours, topic logs)
  12. Attendance
  13. Leave Management
  14. Payroll & Payments (deep link to Teacher Payroll engine)
  15. Documents (28 printable dossier forms & certificates)
  16. Activity History

### 4.2 Dedicated Staff Workspace (`frontend/src/pages/StaffManagement.tsx`)
- Navigation route: `/staff`
- 15 Tabs tailored for administrative, accounts, counseling, and support workforce:
  1. Overview
  2. All Staff
  3. Active Staff
  4. Unassigned Staff
  5. On Leave
  6. Inactive Staff
  7. Departed Staff
  8. Upcoming Joining
  9. Departments
  10. Designations
  11. Attendance
  12. Leave Management
  13. Salary & Payments
  14. Documents
  15. Activity History

### 4.3 Detailed Profile Modals & Drawers
- `TeacherProfileModal.tsx`: Comprehensive 15-tab profile with full activity timeline, assignments, teaching sessions, and rate cards.
- `StaffProfileModal.tsx`: 10-tab employee profile with department, manager, attendance, and leave balance.
- `StaffLifecycleModal.tsx`: Controls status transitions (Activate, Put on Leave, Resignation, Termination, Rehire).

---

## 5. VALIDATION & TESTING PLAN

1. Pytest suite `backend/tests/test_workforce_dashboards.py`:
   - Lifecycle transitions and rehire history integrity.
   - Assignment categorization (assigned vs unassigned vs no timetable).
   - Live KPI count accuracy and tenant isolation.
   - Unified activity history chronological collation.
2. Vitest suite `frontend/src/test/WorkforceDashboards.test.tsx`:
   - Teacher workspace rendering and tab switching.
   - Staff workspace rendering and tab switching.
   - Unassigned teacher filter and assignment modal triggers.
   - Unified employee activity history timeline rendering.
