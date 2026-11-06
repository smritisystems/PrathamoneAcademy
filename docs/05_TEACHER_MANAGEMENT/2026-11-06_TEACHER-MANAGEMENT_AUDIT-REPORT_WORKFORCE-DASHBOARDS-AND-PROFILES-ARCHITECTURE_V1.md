---
title: "Teacher & Staff Workforce Dashboards and Dedicated Profiles Architecture Forensic Audit Report"
module: "05_TEACHER_MANAGEMENT"
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
tags: ["workforce", "teacher-dashboard", "staff-dashboard", "individual-profiles", "ssot", "audit", "ui-ux"]
entities: ["User", "StaffProfile", "TeacherAssignment", "TimetableEntry", "TeachingSession", "TeacherPayroll", "StaffAttendance", "StaffLeave", "StaffEmploymentHistory"]
api_routes: ["/api/v1/staff/teachers/dashboard", "/api/v1/staff/non-teaching/dashboard", "/api/v1/staff/{user_id}", "/api/v1/staff/{user_id}/activity-history", "/api/v1/staff/{user_id}/lifecycle", "/api/v1/teacher-payroll/profiles/{teacher_user_id}"]
related_modules: ["05_TEACHER_MANAGEMENT", "06_TEACHER_PAYROLL", "07_ATTENDANCE", "03_ACADEMIC_MANAGEMENT", "12_RBAC_SECURITY"]
---

# PRATHAMONE EduOS — TEACHER & STAFF WORKFORCE DASHBOARDS AND DEDICATED PROFILES ARCHITECTURE FORENSIC AUDIT REPORT

**Product:** PrathamOne EduOS  
**Edition:** Coaching Institute Edition  
**Version:** 1.0.0  
**Module:** People & Workforce Management  
**Product Architect:** Jawahar R Mallah  
**Organization:** AITDL — AI Technology & Development Lab  
**Audit Scope:** Existing Architecture, UI/UX, Data Models, APIs, Frontend Routing, and Visual Concept Alignment  
**Execution Status:** DISCOVERY & RECOMMENDATIONS ONLY — NO CODE IMPLEMENTATION COMMENCED  

---

## EXECUTIVE SUMMARY

A forensic architecture and UI/UX audit was conducted across the **PrathamOne EduOS** repository to evaluate the existing implementation of Teacher Management and Staff Management against the enterprise visual concept directive (**PRATHAMONE EduOS — Teachers & Staff Workforce Management**). 

The visual concept specifies four distinct, dedicated workspace screens:
1. **Teacher Dashboard (Teacher Workspace):** Live counts, status distribution donut chart, 6-month teaching hours trend bar chart, academic year/institute filters, and status-segmented teacher tables.
2. **Individual Teacher Profile (Dedicated Full-Page Route `/teachers/:id`):** Breadcrumb navigation, persistent hero card (avatar, badges, contact, workload, join date, action dropdowns), and 12 dedicated tabs (`Overview`, `Personal`, `Employment`, `Qualifications`, `Subjects`, `Assignments`, `Timetable`, `Attendance`, `Leave`, `Payroll`, `Documents`, `Activity`).
3. **Staff Dashboard (Staff Workspace):** Live non-teaching staff counts, department distribution donut chart, monthly salary payable and pending payment cards, academic year/institute filters, and department-segmented staff tables.
4. **Individual Staff Profile (Dedicated Full-Page Route `/staff/:id`):** Breadcrumb navigation, persistent hero card (avatar, department, designation, contact, join date, action dropdowns), and 12 dedicated tabs (`Overview`, `Personal`, `Employment`, `Department`, `Designation`, `Reporting`, `Responsibilities`, `Attendance`, `Leave`, `Salary`, `Documents`, `Activity`).

### Primary Audit Verdict
- **Single Source of Truth (SSOT): 100% Compliant.** The backend architecture strictly enforces `users` as the canonical person master and `staff_profiles` as the canonical employee extension. No duplicate teacher or staff tables exist.
- **Backend Data Models: 92% Ready.** Core tables (`users`, `staff_profiles`, `teacher_assignments`, `timetable_entries`, `teaching_sessions`, `teacher_payrolls`, `staff_attendances`, `staff_leaves`, `staff_employment_histories`) exist and are populated. Minor schema extensions are recommended for `reporting_manager_id` and `responsibilities`.
- **Backend Services & APIs: 85% Ready.** The domain service `workforce_service.py` provides consolidated teacher and staff workforce dashboards, activity histories, and lifecycle transition engines. Minor extensions are required for 6-month teaching hours trend aggregation, staff financial liabilities, and teacher-specific timetable query filtering.
- **Frontend Architecture & Routing: 45% Ready.** While modal dialogs exist (`TeacherProfileModal.tsx` and `StaffProfileModal.tsx`), they are transient popup modals rather than dedicated, URL-addressable routes (`/teachers/:id` and `/staff/:id`). The dashboards currently lack the visual concept's SVG/Recharts donut distribution charts, 6-month historical bar charts, and dedicated overview card layouts.

---

## 1. VISUAL CONCEPT ALIGNMENT MATRIX

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PRATHAMONE EduOS WORKFORCE ARCHITECTURE                  │
├──────────────────────────────┬──────────────────────────────────────────────┤
│ 1. Teacher Dashboard         │ 2. Individual Teacher Profile                │
│    - Status Distribution Donut│    - Full Page `/teachers/:id` with Hero Card│
│    - 6-Mo Teaching Hours Bar │    - 12 Comprehensive Specialized Tabs       │
│    - 8 Segmented Status Tabs │    - Interactive Weekly Timetable Matrix     │
│    - Live Counts & Ratios    │    - Unified Reverse-Chronological Timeline  │
├──────────────────────────────┼──────────────────────────────────────────────┤
│ 3. Staff Dashboard           │ 4. Individual Staff Profile                  │
│    - Non-Teaching Isolation │    - Full Page `/staff/:id` with Hero Card   │
│    - Department Donut Chart  │    - 12 Specialized Administrative Tabs      │
│    - Salary Liability Cards  │    - Reporting Manager & Hierarchy Tree      │
│    - Department Allocations  │    - Responsibilities & Duty Delegations     │
└──────────────────────────────┴──────────────────────────────────────────────┘
```

The table below contrasts the visual concept requirements with the current implementation state:

| Visual Concept Component | Current Repository Status | Key Findings & Deficiencies |
| :--- | :--- | :--- |
| **Workspace 1: Teacher Dashboard** | Partially Implemented | Exists at `/teachers` with 13 metric cards, but lacks the donut status chart, 6-month hours bar chart, and institute filter controls. |
| **Workspace 2: Teacher Profile** | Implemented as Modal Popup | Exists inside `TeacherProfileModal.tsx` (15 tabs), but is trapped inside a dialog; lacks URL deep linking (`/teachers/:id`), browser history, and direct bookmarking. |
| **Workspace 3: Staff Dashboard** | Partially Implemented | Exists at `/staff` with an internal `dashboard` tab, but is primarily a directory list; lacks the department donut chart, monthly salary payable cards, and status filter tabs. |
| **Workspace 4: Staff Profile** | Implemented as Modal Popup | Exists inside `StaffProfileModal.tsx` (10 tabs), but is trapped inside a dialog; lacks URL deep linking (`/staff/:id`), reporting manager hierarchy, and key responsibilities tab. |

---

## 2. DETAILED FORENSIC AUDIT (PHASES 1 TO 8)

### Phase 1 — Existing Architecture & SSOT Audit
1. **Canonical Identity Master (`users` table):**
   - Located at `backend/app/models/user.py`.
   - Authoritative person entity for teachers, administrators, accountants, principals, counselors, and staff.
   - Fields: `id`, `username`, `email`, `first_name`, `last_name`, `phone`, `role`, `designation`, `staff_code`, `is_active`, `institution_id`.
   - **Verdict:** Strict SSOT adherence.

2. **Canonical Employee Record (`staff_profiles` table):**
   - Located at `backend/app/models/staff.py`.
   - 1:1 extension of `users` (`user_id` unique foreign key).
   - Fields: `employee_id`, `staff_type` (`teacher`, `admin`, `accountant`, `counselor`, `receptionist`), `department`, `employment_type`, `joining_date`, `contract_start_date`, `contract_end_date`, `basic_salary`, `status` (`active`, `on_leave`, `resigned`, `terminated`, `inactive`), `rehire_eligible`.
   - **Verdict:** Strict SSOT adherence. No duplicate teacher table exists.

3. **Academic & Operational Relational Tables:**
   - `teacher_assignments` (`backend/app/models/staff.py`): Maps `teacher_user_id` to `standard_id`, `division_id`, `subject_id`, `board_id`, `weekly_hours`, `is_class_teacher`.
   - `timetable_entries` (`backend/app/models/portal.py`): Maps `day_of_week`, `start_time`, `end_time`, `division_id`, `subject_id`, and `teacher_id`.
   - `teaching_sessions` (`backend/app/models/teacher_payroll.py`): Tracks class delivery, session duration, rates, approval status, and payroll association.
   - `teacher_payrolls` & `teacher_payment_vouchers`: Complete double-entry compensation accounting.
   - `staff_attendances` & `staff_leaves`: Daily biometric/manual punch records and approved leave requests.
   - `staff_employment_histories`: Immutable chronological lifecycle transition audit ledger.

---

### Phase 2 — Teacher Dashboard Audit (Workspace 1)

#### Evaluated against Visual Concept Panel 1:
- **Header & Filters:**
  - Concept shows: Title "Teacher Workspace", Subtitle "Manage teachers, assignments, teaching activity and employment lifecycle", Academic Year dropdown (`2026-27`), Institute dropdown (`All Institutes`).
  - Current implementation in `TeacherManagement.tsx`: Displays basic title and search bar; institute filter is hardcoded to active tenant; academic year selector is absent from the top header bar.
- **Top Metric Cards (8 Cards):**
  - Concept cards: `Total Teachers` (42), `Active` (36), `Assigned` (30), `Unassigned` (6), `Without Timetable` (3), `On Leave` (4), `Inactive` (2), `Departed` (5).
  - Current state: All 8 core counts are calculated in real time by `workforce_service.py:get_teacher_workforce_dashboard`. Currently rendered in `TeacherManagement.tsx` across a 4-column grid with 13 cards (including secondary financial cards).
- **Interactive Visualizations (Donut & Bar Charts):**
  - Concept displays:
    1. **Teacher Status Distribution Donut Chart:** 42 teachers in center, 4 color arcs (Assigned 71%, Unassigned 14%, Without Timetable 7%, On Leave 7%).
    2. **Monthly Teaching Hours Bar Chart:** 6 monthly historical bars (Apr, May, Jun, Jul, Aug, Sep) with total 3,420 hrs.
  - Current state: **MISSING.** `TeacherManagement.tsx` renders flat stat cards and CSS progress bars. The backend currently computes only the *current month's* teaching hours (`monthly_teaching_hours`); it does not aggregate a 6-month historical array.
- **Filter Tabs:**
  - Concept tabs: `Overview`, `All Teachers`, `Active`, `Assigned`, `Unassigned`, `Without Timetable`, `On Leave`, `Inactive`, `Departed`.
  - Current state: Present in `TeacherManagement.tsx` and functioning correctly.

---

### Phase 3 — Individual Teacher Profile Audit (Workspace 2)

#### Evaluated against Visual Concept Panel 2:
- **Routing & Container:**
  - Concept shows: Dedicated full-screen route (`/teachers/:id`) with breadcrumb `Teachers > Teacher Profile`.
  - Current state: Currently embedded inside a modal popup (`TeacherProfileModal.tsx`). Opening a profile does not update the browser URL, preventing page refreshes, direct sharing, and back-button navigation.
- **Teacher Hero Card:**
  - Concept shows: Teacher avatar photo, status badge (`Active`), teacher ID (`TCH1008`), designation (`Senior Teacher`), primary subject (`Mathematics`), email, phone, quick metrics (`3 Batches`, `18 hrs/week`, `Joined 15 Jun 2020`), and `[Edit]` / `[Actions v]` buttons.
  - Current state: Partially present in the modal header, but condensed due to modal dialog width constraints.
- **12 Dedicated Tabs Forensic Review:**

| Tab Name in Concept | Current Implementation in Modal | Backend API Support | Audit Finding & Action Required |
| :--- | :--- | :--- | :--- |
| **1. Overview** | Implemented | `GET /staff/{user_id}` | Needs the 3 structured visual cards: Profile Summary, Current Assignments list, and Teaching Activity (This Month) progress metrics. |
| **2. Personal** | Implemented | `GET /staff/{user_id}` | DOB, gender, blood group, emergency contact, current and permanent address. |
| **3. Employment** | Implemented | `GET /staff/{user_id}` | Employee ID, employment type, contract dates, status effective dates, rehire eligibility. |
| **4. Qualifications** | Implemented | `GET /staff/{user_id}` | Degree, specialization, years of experience, certificates. |
| **5. Subjects** | Implemented | `GET /staff/{user_id}` | Assigned subjects, primary teaching subjects. |
| **6. Assignments** | Implemented | `GET /staff/assignments/list` | Interactive batch and division assignment table with workload hours and class teacher flags. |
| **7. Timetable** | **Stub / Incomplete** | `GET /timetable/` | Currently shows a static info card. The timetable endpoint does not support `teacher_id` filtering and joins on class teacher rather than slot teacher. **Must be fixed.** |
| **8. Attendance** | Implemented | `GET /staff/{user_id}` | Leave balances and daily attendance summary. |
| **9. Leave** | Implemented | `GET /staff/leaves/list?user_id=...` | Leave balance cards and chronological leave request history. |
| **10. Payroll** | Implemented | `GET /teacher-payroll/profiles/{id}` | Hourly/monthly rate structure, payment frequency, recent payment vouchers and payroll slips. |
| **11. Documents** | Implemented | `GET /staff/documents-forms/...` | Uploaded identity documents and 28 official auto-fill printable PDF templates. |
| **12. Activity** | Implemented | `GET /staff/{user_id}/activity-history` | Unified chronological timeline across status changes, assignments, sessions, leaves, and payroll disbursements. |

---

### Phase 4 — Staff Dashboard Audit (Workspace 3)

#### Evaluated against Visual Concept Panel 3:
- **Header & Scope Isolation:**
  - Concept shows: Title "Staff Workspace", Subtitle "Manage non-teaching staff, departments, designations and employee lifecycle", Academic Year dropdown, Institute dropdown.
  - Scope: Non-teaching staff must be strictly isolated from teaching faculty.
  - Current state: `workforce_service.py:get_staff_workforce_dashboard` correctly filters `~User.role.ilike("%teacher%")` and `~StaffProfile.staff_type.ilike("%teacher%")`. However, the frontend at `/staff` is still titled "Staff Management Directory" and mixes generic tabs (`directory`, `assignments`, `attendance`, `leaves`, `dashboard`, `documents`).
- **Top Metric Cards (8 Cards):**
  - Concept cards: `Total Staff` (28), `Active` (24), `Unassigned` (3), `On Leave` (2), `Inactive` (1), `Departed` (3), `Upcoming Joining` (2), `Departments` (7).
  - Current state: Backend `get_staff_workforce_dashboard` computes total, active, unassigned, on_leave, inactive, departed, upcoming_joining, and department headcounts. Frontend `/staff` is not currently rendering these cards in the primary view.
- **Interactive Visualizations (Department Donut & Financial Cards):**
  - Concept displays:
    1. **Staff by Department Donut Chart:** 28 staff in center, department arcs (Administration 36%, Accounts 14%, IT & Systems 11%, Library 11%, Others 28%).
    2. **Financial Liabilities Cards:** "Salary Payable (Current Month)" (₹ 7,84,500) and "Pending Payments" (₹ 1,26,000).
  - Current state: **MISSING.** Not rendered in `StaffManagement.tsx`. Furthermore, the backend `get_staff_workforce_dashboard` does not sum `salary_payable` and `pending_payments` in its returned payload.

---

### Phase 5 — Individual Staff Profile Audit (Workspace 4)

#### Evaluated against Visual Concept Panel 4:
- **Routing & Container:**
  - Concept shows: Dedicated full-screen route (`/staff/:id`) with breadcrumb `Staff > Staff Profile`.
  - Current state: Trapped inside `StaffProfileModal.tsx`. No dedicated route `/staff/:id` exists in `frontend/src/App.tsx`.
- **Staff Hero Card:**
  - Concept shows: Avatar photo, status badge (`Active`), employee ID (`STF2015`), designation (`Office Administrator`), contact details, summary badges (`Department: Administration`, `Designation: Office Administrator`, `Joined: 01 Aug 2019`), and `[Edit]` / `[Actions v]` buttons.
  - Current state: Condensed inside modal dialog header.
- **12 Dedicated Tabs Forensic Review:**

| Tab Name in Concept | Current Implementation in Modal | Backend API Support | Audit Finding & Action Required |
| :--- | :--- | :--- | :--- |
| **1. Overview** | Implemented | `GET /staff/{user_id}` | Needs the 3 structured visual cards: Profile Summary, Key Responsibilities list, and Attendance This Month progress bar. |
| **2. Personal** | Implemented | `GET /staff/{user_id}` | DOB, gender, blood group, emergency contact, addresses. |
| **3. Employment** | Implemented | `GET /staff/{user_id}` | Employee ID, employment type, contract period, joining date. |
| **4. Department** | Implemented | `GET /staff/{user_id}` | Department allocation, functional division. |
| **5. Designation** | Implemented | `GET /staff/{user_id}` | Official title, role permissions. |
| **6. Reporting** | **Missing / Incomplete** | Missing `reporting_manager_id` | Concept shows "Reporting Manager: Principal". `StaffProfile` currently lacks a `reporting_manager_id` foreign key. |
| **7. Responsibilities** | **Missing / Incomplete** | Missing `responsibilities` | Concept shows 4 bulleted duty assignments. Currently absent from model or buried in unstructured notes. |
| **8. Attendance** | Implemented | `GET /staff/attendance/daily` | Monthly attendance percentage, present days, leave days. |
| **9. Leave** | Implemented | `GET /staff/leaves/list?user_id=...` | Leave balances (casual, sick, earned) and applications. |
| **10. Salary** | Implemented | `GET /staff/{user_id}` | Basic salary, bank details, PAN, Aadhaar. |
| **11. Documents** | Implemented | `GET /staff/documents-forms/...` | HR documents, ID proofs, generated certificates. |
| **12. Activity** | Implemented | `GET /staff/{user_id}/activity-history` | Employment history, leave approvals, profile updates timeline. |

---

### Phase 6 — Workforce Logic & Calculations Audit

1. **Teacher Assignment Status Definitions:**
   - **Assigned:** Has 1 or more active records in `teacher_assignments` matching the academic year.
   - **Unassigned:** Teacher is an active employee, but has 0 active records in `teacher_assignments`.
   - **Partially Assigned:** Assigned to batches, but total `weekly_hours` is below standard institution workload (e.g., < 12 hrs/week).
   - **Without Timetable:** Has 1 or more active assignments in `teacher_assignments`, but 0 scheduled slots in `timetable_entries`.
   - **Audit Finding:** The logic in `backend/app/services/workforce_service.py` implements these definitions faithfully. An unassigned teacher remains an active employee and is not marked inactive.

2. **Employment Lifecycle State Transitions:**
   - Authoritative states: `draft`, `upcoming_joining`, `active`, `on_leave`, `inactive`, `resigned`, `terminated`, `contract_ended`.
   - Transitions are processed via `POST /api/v1/staff/{user_id}/lifecycle`, updating both `StaffProfile.status` and `User.is_active`.
   - Every transition writes an immutable event to `staff_employment_histories` and system `audit_logs`.
   - **Audit Finding:** Fully functional and robust.

---

### Phase 7 — Data Architecture & SSOT Audit

1. **Master Table Integrity:**
   - `users`: Single authoritative person identity master.
   - `staff_profiles`: Authoritative employee extension.
   - All relational entities (`teacher_assignments`, `teacher_payment_profiles`, `teaching_sessions`, `teacher_payrolls`, `staff_attendances`, `staff_leaves`) correctly reference `users.id`.
   - **Compliance:** 100% compliant with SSOT Rules 001, 002, 003, and 005.

2. **Database Schema Enhancements Required (Zero Duplication):**
   - In `backend/app/models/staff.py` on `StaffProfile`:
     ```python
     reporting_manager_id: Mapped[Optional[int]] = mapped_column(
         ForeignKey("users.id", ondelete="SET NULL"), nullable=True
     )
     responsibilities: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
     ```
   - Relationship: `reporting_manager: Mapped[Optional["User"]] = relationship("User", foreign_keys=[reporting_manager_id])`.
   - In `backend/app/models/portal.py` on `TimetableEntry`:
     - Already has `teacher_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)`.
     - Endpoint query in `backend/app/api/v1/endpoints/timetable.py` must be updated to accept `teacher_id: Optional[int] = Query(None)` and join directly on `TimetableEntry.teacher_id == User.id`.

---

### Phase 8 — User Experience, Navigation & Routing Audit

1. **Routing Flaw:**
   - In `frontend/src/App.tsx`, routes `/teachers/:id` and `/staff/:id` do not exist.
   - When a user clicks any teacher or staff member, a modal dialog is rendered.
   - Users cannot bookmark profiles, send links to colleagues, or use browser back/forward buttons.
2. **Visual Hierarchy Flaw:**
   - The visual concept showcases modern, spacious, full-page dashboards with SVG/Recharts donut charts and monthly bar charts.
   - The current UI compresses complex multi-year data into dense tables and popup overlays.
3. **Recommended Route Architecture:**
   - `/teachers` -> `TeacherWorkspacePage.tsx` (Teacher Dashboard)
   - `/teachers/:id` -> `TeacherProfilePage.tsx` (Dedicated Teacher Profile)
   - `/staff` -> `StaffWorkspacePage.tsx` (Staff Dashboard)
   - `/staff/:id` -> `StaffProfilePage.tsx` (Dedicated Staff Profile)
   - `/teacher-payroll` -> `TeacherPayrollPage.tsx` (Dedicated Payroll & Vouchers Workspace)

---

## 3. GAP & PRIORITY MATRIX

| Priority | Component | Specific Gap | Impact | Remediation Plan |
| :---: | :--- | :--- | :--- | :--- |
| **P0** | Routing | Missing dedicated full-page routes `/teachers/:id` and `/staff/:id` | Users cannot deep link, bookmark, or refresh profile views. | Create `TeacherProfilePage.tsx` and `StaffProfilePage.tsx` and register routes in `App.tsx`. |
| **P0** | Timetable API | `list_timetable_entries` does not accept `teacher_id` query param and joins on class teacher instead of slot teacher | Teachers cannot view their scheduled lecture slots in the Timetable tab. | Add `teacher_id` query param and fix SQL join to `TimetableEntry.teacher_id == User.id` in `timetable.py`. |
| **P1** | Teacher Dashboard | Missing "Teacher Status Distribution" Donut Chart & 6-Month Teaching Hours Bar Chart | Dashboard lacks executive visual analytics depicted in concept Panel 1. | Implement SVG/Recharts Donut & Bar charts in `TeacherWorkspacePage.tsx`; add 6-month historical aggregation in `workforce_service.py`. |
| **P1** | Staff Dashboard | Missing "Staff by Department" Donut Chart & Monthly Salary Liability Cards | Dashboard lacks executive non-teaching metrics depicted in concept Panel 3. | Implement Department Donut chart and Salary Payable/Pending cards in `StaffWorkspacePage.tsx`; enhance backend metrics. |
| **P1** | Staff Model & Schema | `StaffProfile` lacks `reporting_manager_id` and `responsibilities` | Cannot render "Reporting Manager: Principal" or "Key Responsibilities" in Panel 4. | Add nullable `reporting_manager_id` and `responsibilities` fields to `StaffProfile` model and Alembic migration. |
| **P2** | Navigation | Sidebar links do not clearly differentiate Teacher Workspace vs Staff Workspace | Minor semantic confusion between Staff Directory and Staff Workspace. | Update `Sidebar.tsx` navigation labels to "Teacher Workspace" and "Staff Workspace". |
| **P2** | Profile Hero Header | Condensed modal header lacks quick workload metrics and action dropdown | Incomplete parity with concept Panels 2 and 4. | Build reusable `WorkforceHeroCard` component with avatar, badges, contact, workload, join date, and action menu. |

---

## 4. PHASED IMPLEMENTATION ROADMAP (AWAITING APPROVAL)

### Phase 1: Backend Domain Enhancements & Schema Upgrades
1. **Schema Extension (Zero Duplication):**
   - Add `reporting_manager_id` (ForeignKey `users.id`) and `responsibilities` (Text) to `StaffProfile` in `backend/app/models/staff.py`.
   - Generate Alembic revision and apply migration cleanly.
2. **Timetable Query Fix:**
   - Update `list_timetable_entries` in `backend/app/api/v1/endpoints/timetable.py` to support `teacher_id: Optional[int] = Query(None)` and join on `TimetableEntry.teacher_id == User.id`.
3. **Analytics Aggregation:**
   - Update `workforce_service.py:get_teacher_workforce_dashboard` to compute a 6-month rolling array of teaching hours for the bar chart.
   - Update `workforce_service.py:get_staff_workforce_dashboard` to compute `salary_payable` and `pending_payments` for non-teaching personnel.

### Phase 2: Dedicated Routing Architecture & Common Components
1. **Routes Setup:**
   - Add `/teachers/:id` and `/staff/:id` in `frontend/src/App.tsx`.
2. **Shared UI Components:**
   - `WorkforceHeroCard.tsx`: Reusable profile hero banner with photo, active status badge, employee ID, designation, department, contact info, metric chips, and quick action buttons.
   - `DonutChart.tsx`: Enterprise SVG/Recharts status and department distribution donut chart with center totals and legend percentages.
   - `HistoricalBarChart.tsx`: 6-month historical bar chart for monthly teaching hours.

### Phase 3: Teacher Workspace & Dedicated Profile (`/teachers` and `/teachers/:id`)
1. **Teacher Workspace Dashboard (`/teachers`):**
   - Top header with Academic Year and Institute selectors.
   - 8 live metric cards matching Panel 1.
   - Status Distribution Donut Chart + Monthly Teaching Hours Bar Chart.
   - Filterable, searchable directory table with quick link to `/teachers/:id`.
2. **Individual Teacher Profile Page (`/teachers/:id`):**
   - Breadcrumbs: `Teachers > Teacher Profile`.
   - Persistent Hero Banner.
   - 12 fully functional tabs matching Panel 2:
     `Overview`, `Personal`, `Employment`, `Qualifications`, `Subjects`, `Assignments`, `Timetable`, `Attendance`, `Leave`, `Payroll`, `Documents`, `Activity`.

### Phase 4: Staff Workspace & Dedicated Profile (`/staff` and `/staff/:id`)
1. **Staff Workspace Dashboard (`/staff`):**
   - Strict non-teaching staff filtering.
   - Top header with Academic Year and Institute selectors.
   - 8 live metric cards matching Panel 3.
   - Staff by Department Donut Chart + Salary Payable & Pending Payment liability cards.
   - Department-segmented directory table with quick link to `/staff/:id`.
2. **Individual Staff Profile Page (`/staff/:id`):**
   - Breadcrumbs: `Staff > Staff Profile`.
   - Persistent Hero Banner.
   - 12 fully functional tabs matching Panel 4:
     `Overview`, `Personal`, `Employment`, `Department`, `Designation`, `Reporting`, `Responsibilities`, `Attendance`, `Leave`, `Salary`, `Documents`, `Activity`.

### Phase 5: Verification, Playwright Automation & Documentation
1. Run complete Playwright end-to-end browser automation verifying all 4 workspaces, all tabs, and 0 console errors.
2. Run `python scripts/manage_headers.py check` to ensure 100% corporate attribution compliance.
3. Run `python tools/docs_manager.py reindex` and `validate`.
4. Auto-increment platform build version and commit.

---

## 5. DIRECTIVE CONFORMANCE & ARCHITECT SIGN-OFF

> [!IMPORTANT]
> **NO IMPLEMENTATION HAS BEEN STARTED.**  
> In accordance with the prompt directive ("STOP AFTER THE REPORT. WAIT FOR MY APPROVAL BEFORE IMPLEMENTING ANYTHING"), this audit is strictly diagnostic and advisory.  
> 
> Awaiting review and formal authorization from Product Architect **Jawahar R. Mallah** to proceed with Phase 1 of the implementation plan.

