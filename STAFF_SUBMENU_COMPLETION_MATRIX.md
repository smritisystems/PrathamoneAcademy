# PRATHAMONE EDUOS — STAFF & HR DIRECTORY SUBMENU COMPLETION MATRIX

**Product:** PrathamOne EduOS  
**Edition:** Coaching Institute Edition  
**Version:** 1.0.0  
**Architect:** Jawahar R. Mallah  
**Organization:** AITDL — AI Technology & Development Lab  
**Date:** 2026-11-09  

---

## 1. Workspaces Implementation Summary

| # | Submenu & Route | Component | Page Heading | Contextual Primary Action | View-First Mode Status |
|---|----------------|-----------|--------------|---------------------------|------------------------|
| 1 | `/staff/overview` | `StaffManagement.tsx` | Staff HR Operations & Workforce Overview | Onboard Staff | Locked until Edit Mode |
| 2 | `/staff/directory` | `StaffManagement.tsx` | Master Staff Personnel Directory & Register | Onboard Staff | Locked until Edit Mode |
| 3 | `/staff/onboarding` | `StaffManagement.tsx` | New Staff Onboarding & Profile Creation | Submit Staff Onboarding | Locked until Edit Mode |
| 4 | `/staff/duties` | `StaffManagement.tsx` | Operational Duties & Department Allocations | Allocate Duty Shift | Locked until Edit Mode |
| 5 | `/staff/attendance` | `StaffManagement.tsx` | Daily Duty Register & Attendance Roll Call | Save Attendance Changes | Locked until Edit Mode |
| 6 | `/staff/leaves` | `StaffManagement.tsx` | Leave Applications & Approvals Desk | Approve / Reject Application | Locked until Edit Mode |
| 7 | `/staff/documents` | `StaffManagement.tsx` | HR Letters & Official Documentation Studio | Generate & Print Document | Default Safe Action |
| 8 | `/staff/settings` | `StaffManagement.tsx` | Institute Employment & HR Policies | Save HR Policies | Locked until Edit Mode |

---

## 2. Key Features Implemented

- **Dedicated First-Class Routes:** Direct URLs registered in `App.tsx` (`/staff`, `/staff/overview`, `/staff/directory`, `/staff/onboarding`, `/staff/duties`, `/staff/attendance`, `/staff/leaves`, `/staff/documents`, `/staff/settings`) and seamlessly integrated into `Sidebar.tsx`.
- **URL Synchronization & Deep Linking:** Bidirectional synchronization between URL route pathname, tab navigation bar, browser back/forward buttons, and page refresh preservation.
- **Collapsible Sidebar Accordion:** Expandable Staff menu with active indicator tracking across desktop expanded, compact icon rail flyout popovers, and mobile navigation drawer. Label `Staff Presence` used for attendance sub-item to avoid regex collision with the parent Attendance menu.
- **SSOT & Anti-Duplication Compliance:** 100% adherence to Rules 001–009. Utilizes canonical `staffApi` (`list`, `get`, `create`, `dailyAttendance`, `markAttendance`, `leavesList`, `actionLeave`, `getStaffDashboard`, `documentCatalogue`), `usersApi`, and `settingsApi` endpoints without schema drift or duplicated business logic.
- **Rule 010 View-First Governance:** All mutating actions (`Onboard Staff`, `Submit Onboarding`, `Save Attendance`, `Approve / Reject Leave`, `Save HR Policies`) enforce safe locked states in default View Mode with explicit scoped Edit Mode unlocking (`workforce:staff`).
- **Integrated Staff Onboarding Workflow:** Multi-section onboarding form capturing personal details, departmental assignment, RBAC operational role, compensation frequency, and system access credentials.
- **Duty Allocations & Roster Workspace:** Overview of front desk, lab supervisor, fee counter, and document verification personnel with shift breakdown and status tracking.
- **Daily Attendance & Roll Call:** Daily check-in, check-out, working hours, and operational presence log for all non-teaching staff members with date filtering and attendance modification persistence.
- **Leave Applications Desk:** Full workflow for reviewing, approving, and rejecting casual, medical, and privilege leaves with pending queue badge tracking.
- **HR Letters Studio:** Catalogue of 28 standard HR documents (Appointment Letters, NDAs, Payslips, Experience Certificates, Relieving Letters, Probation Confirmation) with preview modal and PDF printing.
- **Employment & HR Policies Workspace:** Institute probation policies, daily duty hours, late check-in grace period, and annual leave quota management.
- **Training Mode Isolation:** Displays prominent amber `TRAINING MODE` badge with data isolation verification when `useEnvironmentStore.isTrainingMode` is active.
- **Visual Evidence:** High-resolution 1080p screenshots captured for all 8 workspaces (`screenshot_80` to `screenshot_87`).

---

## 3. Test Suite Verification

- `src/test/StaffDedicatedSubmenus.test.tsx`: 12/12 tests passed
- `src/test/StudentDedicatedSubmenus.test.tsx`: 12/12 tests passed
- `src/test/Sidebar.test.tsx`: 13/13 tests passed
- **Total Combined Suite:** 37/37 tests passed (100% green)

---

## 4. Visual Evidence Artifacts

1. `screenshot_80_staff_overview.png` — Staff HR Operations Overview Workspace
2. `screenshot_81_staff_directory.png` — Master Staff Personnel Directory Workspace
3. `screenshot_82_staff_onboarding.png` — New Staff Onboarding & Profile Creation Workspace
4. `screenshot_83_staff_duties.png` — Operational Duties & Department Allocations Workspace
5. `screenshot_84_staff_attendance.png` — Daily Duty Register & Attendance Roll Call Workspace
6. `screenshot_85_staff_leaves.png` — Leave Applications & Approvals Workspace
7. `screenshot_86_staff_documents.png` — HR Letters & Official Documentation Studio Workspace
8. `screenshot_87_staff_settings.png` — Institute Employment & HR Policies Workspace

