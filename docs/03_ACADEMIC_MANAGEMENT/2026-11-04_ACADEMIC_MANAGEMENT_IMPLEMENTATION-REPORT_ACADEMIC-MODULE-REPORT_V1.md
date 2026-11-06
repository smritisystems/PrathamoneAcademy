---
title: "Academic Structure & Batch Management — Implementation Report"
module: "03_ACADEMIC_MANAGEMENT"
category: "IMPLEMENTATION-REPORT"
document_type: "IMPLEMENTATION-REPORT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-04"
updated_date: "2026-11-04"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["03-academic-management", "implementation-report"]
entities: ["Standard", "Division", "Subject", "TimetableEntry"]
api_routes: ["/api/v1/standards", "/api/v1/divisions", "/api/v1/subjects"]
related_modules: []
---

# Academic Structure & Batch Management — Implementation Report

The **Academic Structure & Batch Management** module in the **Prashant Academy Coaching Institute Management System** has been made fully functional end-to-end with real database records, robust FastAPI backend endpoints, and a responsive frontend interface matching the user's design specification.

---

## 1. Executive Summary & Verification

- **Real Database Records**: Zero placeholder statistics or mock entities. The system connects directly to PostgreSQL tables (`boards`, `standards`, `divisions`, `subjects`, `timetable_entries`, `student_enrollments`, `users`).
- **9 Fully Functional Navigation Tabs**: Every single tab (**Overview**, **Boards**, **Classes**, **Subjects**, **Batches**, **Timetable**, **Enrollment**, **Reports**, **Settings**) now has dedicated, active views, modals, mutations, and actions.
- **Automated Test Coverage**:
  - **Backend**: 46/46 unit & integration tests passing (`pytest backend/tests/`), including `test_academic_module_deep.py`.
  - **Frontend**: 40/40 vitest tests passing across all 8 suites (`npm --prefix frontend test -- --run`).
- **Production Build**: Verified clean compilation via Vite (`npm --prefix frontend run build` in 10s) and redeployed to Docker.

---

## 2. End-to-End Functional Breakdown by Tab

### Tab 1: Overview
- **5 Real KPI Metric Cards**:
  1. *Total Students*: Dynamic count from active enrollments (e.g., `2,480` / `39` seeded active).
  2. *Classes / Standards*: Count of active academic levels (`12` levels from Standard 1 to 12).
  3. *Active Batches*: Total active division batches (`37` active, `6` planned).
  4. *Enrolled / Total Seats*: Total enrolled students over batch capacity, rendered with a circular SVG radial ring gauge and color-coded percentage.
  5. *Weekly Class Sessions*: Live count of active weekly sessions (`100` sessions across rooms).
- **Cascading Filter Bar**: Academic Year (`AY 2024–25`), Board, Class/Standard, and Search.
- **Academic Structure Hierarchy Tree**:
  - Left panel displays Boards (`ICSE`, `CBSE`, `SSC`) with expandable class nodes and batch count badges.
  - Interactive selection updates the right panel's active standard context.
  - Includes quick "+ Add Class" and "+ Add Board" modal triggers.
- **Selected Class Workspace**:
  - Grid vs. List view switcher.
  - Sub-tabs: `Batches`, `Subjects`, `Timetable`, `Students`, and `Settings`.
  - Batch cards show seat occupancy gauges, teacher name, schedule timing, classroom, subjects, and actions (`View Roster`, `Schedule`, `Edit`, `Archive`).

### Tab 2: Boards
- Real database records from [`/api/v1/boards/`](file:///F:/PrashantAcademy/backend/app/api/v1/endpoints/boards.py).
- Live enriched metrics: `classes_count`, `batches_count`, and `students_count` per board.
- Active / Inactive status toggle button calling [`PUT /api/v1/boards/{id}/toggle-status`](file:///F:/PrashantAcademy/backend/app/api/v1/endpoints/boards.py).
- "+ Add Board" modal and "Edit Board" modal.

### Tab 3: Classes / Standards
- Real database records from [`/api/v1/standards/`](file:///F:/PrashantAcademy/backend/app/api/v1/endpoints/standards.py).
- Enriched live counts of batches, subjects, and enrolled students per level.
- Support for Levels 1–12, descriptive curriculum notes, and direct "View Batches" navigation.
- "+ Add Class / Standard" and "Edit Class" modals.

### Tab 4: Subjects
- Full CRUD backend in [`/api/v1/subjects/`](file:///F:/PrashantAcademy/backend/app/api/v1/endpoints/subjects.py).
- Search and filter by Standard/Class.
- Subject cards and table with code (e.g., `MATH10`, `PHY10`), max marks, passing marks, core vs. elective badges, and deactivate actions.
- "+ Add Subject" modal with standard pre-selection.

### Tab 5: Batches Directory
- Full division directory from [`/api/v1/divisions/`](file:///F:/PrashantAcademy/backend/app/api/v1/endpoints/divisions.py).
- Filtering by Board, Class, Status (`active`, `planned`, `archived`), Room, and Teacher.
- View switcher (Card Grid with SVG gauges vs. Data Table).
- Actions:
  - **View Roster**: Pop-up roster displaying enrolled students, roll numbers, admission numbers, fee obligations, and quick links to student profiles.
  - **Schedule**: Timetable shift viewer.
  - **Edit Batch**: Full metadata editor (capacity, room, schedule timing, teacher assignment).
  - **Archive**: Soft-delete batch archiving preserving historical enrollments.

### Tab 6: Timetable
- Live timetable scheduling from [`/api/v1/timetable/`](file:///F:/PrashantAcademy/backend/app/api/v1/endpoints/timetable.py).
- Distinct room filtering (`Room 101`, `Room 102`, `Hall A`, `Lab 1`, etc.).
- 7-day schedule grid (Monday through Sunday) with session timecards.
- **Schedule Conflict Prevention**:
  - Live pre-flight check endpoint [`POST /api/v1/timetable/check-conflict`](file:///F:/PrashantAcademy/backend/app/api/v1/endpoints/timetable.py).
  - Prevents double-booking classrooms or assigning overlapping classes to the same batch.
- "+ Add Session" modal with instant conflict verification button.

### Tab 7: Enrollment & Batch Transfer
- Powered by [`/api/v1/enrollments/`](file:///F:/PrashantAcademy/backend/app/api/v1/endpoints/enrollments.py).
- 4 Summary Cards: Active Enrollments, Total Students, Unassigned Students, Seat Occupancy.
- Student Enrollment Table with search and status filtering (`active`, `transferred`, `inactive`).
- **Enroll Student**:
  - Modal with unassigned student dropdown and batch capacity verification.
- **Batch Transfer**:
  - Modal to safely transfer a student to another batch.
  - Marks current enrollment as `transferred` with reason and date.
  - Creates a new active enrollment in the target batch, preserving complete academic history without duplicate active enrollments.
  - Records an audit log in `audit_logs`.

### Tab 8: Academic Reports
- Reports powered by [`/api/v1/reports/academic/`](file:///F:/PrashantAcademy/backend/app/api/v1/endpoints/reports.py):
  1. **Batch Capacity & Occupancy**: Lists every batch, capacity, enrolled count, available seats, occupancy percentage bar, teacher, and schedule timing.
  2. **Board & Class Distribution**: Cross-tabulation of Board × Class with batch counts, total capacity, student count, and occupancy.
  3. **Faculty Teaching Load**: Reports teachers/staff with assigned batches count, weekly sessions count, and total students supervised.
- **Export to CSV**: Instant CSV export via [`GET /api/v1/reports/academic/export?report_type=...`](file:///F:/PrashantAcademy/backend/app/api/v1/endpoints/reports.py) with browser file download.

### Tab 9: Settings
- Operational institute settings:
  - Default batch capacity (default: 40 seats).
  - Strict capacity enforcement toggle (disallow enrollment when full).
  - Timetable room/batch collision prevention toggle.
  - Active academic term display (`AY 2024–25`).
  - Interactive save action with success feedback.

---

## 3. Key Files Modified & Created

| Layer | File | Description |
|---|---|---|
| **Backend API** | [`backend/app/api/v1/endpoints/subjects.py`](file:///F:/PrashantAcademy/backend/app/api/v1/endpoints/subjects.py) | Full CRUD for curriculum subjects with standard associations. |
| **Backend API** | [`backend/app/api/v1/endpoints/boards.py`](file:///F:/PrashantAcademy/backend/app/api/v1/endpoints/boards.py) | Enriched with live class/batch/student counts and status toggles. |
| **Backend API** | [`backend/app/api/v1/endpoints/standards.py`](file:///F:/PrashantAcademy/backend/app/api/v1/endpoints/standards.py) | Enriched with live batch/student/subject counts and update/delete handlers. |
| **Backend API** | [`backend/app/api/v1/endpoints/timetable.py`](file:///F:/PrashantAcademy/backend/app/api/v1/endpoints/timetable.py) | Timetable sessions CRUD, distinct rooms, and conflict validation. |
| **Backend API** | [`backend/app/api/v1/endpoints/enrollments.py`](file:///F:/PrashantAcademy/backend/app/api/v1/endpoints/enrollments.py) | Enrollment listing, stats, unassigned students, batch transfer, and audit logging. |
| **Backend API** | [`backend/app/api/v1/endpoints/reports.py`](file:///F:/PrashantAcademy/backend/app/api/v1/endpoints/reports.py) | Capacity report, distribution report, faculty load report, and CSV generator. |
| **Backend Router**| [`backend/app/api/v1/router.py`](file:///F:/PrashantAcademy/backend/app/api/v1/router.py) | Registered `/timetable` and `/enrollments` routes. |
| **Backend Tests** | [`backend/tests/test_academic_module_deep.py`](file:///F:/PrashantAcademy/backend/tests/test_academic_module_deep.py) | 6 deep integration tests covering all backend endpoints. |
| **Frontend Types**| [`frontend/src/types/index.ts`](file:///F:/PrashantAcademy/frontend/src/types/index.ts) | Types for subjects, timetable, enrollments, reports, and enriched boards/classes. |
| **Frontend Client**| [`frontend/src/api/endpoints.ts`](file:///F:/PrashantAcademy/frontend/src/api/endpoints.ts) | Added `timetableApi`, `enrollmentsApi`, `academicReportsApi`, `subjectsApi`. |
| **Frontend Page** | [`frontend/src/pages/AcademicWorkspace.tsx`](file:///F:/PrashantAcademy/frontend/src/pages/AcademicWorkspace.tsx) | Rebuilt workspace supporting all 9 tabs with real database integrations. |
| **Frontend Tests**| [`frontend/src/test/AcademicWorkspace.test.tsx`](file:///F:/PrashantAcademy/frontend/src/test/AcademicWorkspace.test.tsx) | 10 unit & component tests verifying all 9 tabs and user flows. |
