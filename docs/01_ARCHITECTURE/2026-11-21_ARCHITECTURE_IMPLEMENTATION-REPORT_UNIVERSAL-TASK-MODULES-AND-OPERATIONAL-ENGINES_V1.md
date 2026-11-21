---
title: "Universal Task Modules and Autonomous Operational Engines Implementation Report"
module: "01_ARCHITECTURE"
category: "IMPLEMENTATION-REPORT"
document_type: "REPORT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-21"
updated_date: "2026-11-21"
author: "Jawahar R Mallah"
organization: "Smritisys & AITDL Networks"
status: "Approved"
tags: ["tasks", "planning", "operational-engines", "automation", "ssot", "view-first", "crm", "examinations", "payroll"]
entities: ["Activity", "ActivityReference", "ActivityAssignee", "ActivityOccurrenceOverride"]
api_routes: ["/api/v1/planning/tasks/sync-all", "/api/v1/planning/tasks/sync-crm", "/api/v1/planning/tasks/sync-exams", "/api/v1/planning/tasks/sync-sessions", "/api/v1/planning/tasks/sync-birthdays"]
related_modules: ["04_STUDENT_MANAGEMENT", "06_TEACHER_PAYROLL", "07_ATTENDANCE", "08_EXAMINATION", "09_FEES_PAYMENTS", "15_INTEGRATIONS"]
---

# Universal Task Modules and Autonomous Operational Engines Implementation Report

## 1. Executive Summary

In accordance with architectural directive **RULE 001** (Single Source of Truth), **RULE 002** (Reuse Before Creation), **RULE 010** (Global View-First & Explicit Edit Mode), and **RULE 011** (Data Deduplication & Canonical Master Reuse), this release completes the transformation of **PrathamOne EduOS** into an autonomous, proactive education operating system.

Previously, tasks required manual entry or covered only three basic domain notifications. With this release, the **Tasks & Planning Center** (`PlanningWorkspace.tsx`) is driven by an autonomous background sync cadence and an 8-pillar operational intelligence suite that automatically scans academic, financial, faculty, and CRM records, generates SLA-governed tasks, binds them to canonical master entities via `activity_references`, and equips faculty and administrators with 1-Click Action Jumpers directly to actionable workflows.

---

## 2. Architectural Pillars

```
+---------------------------------------------------------------------------------------------------+
|                                      PRATHAMONE EduOS CORE                                       |
|                                                                                                   |
|  +--------------------+  +--------------------+  +--------------------+  +--------------------+  |
|  | Engine 1: Overdue  |  | Engine 2: CRM Lead |  | Engine 3: Defaulter|  | Engine 4: Homework|  |
|  | Fee Invoices       |  | Overdue Touchpoints|  | Student Attendance |  | Review Deadlines   |  |
|  +--------------------+  +--------------------+  +--------------------+  +--------------------+  |
|  | Engine 5: Syllabus |  | Engine 6: Exam Mark|  | Engine 7: Faculty  |  | Engine 8: Birthday |  |
|  | Pace Deficits      |  | Sheet Submission   |  | Session Sign-Off   |  | & Milestone Wishes |  |
|  +--------------------+  +--------------------+  +--------------------+  +--------------------+  |
+-------------------------------------------------+-------------------------------------------------+
                                                  |
                         Polymorphic Activity Reference Engine
                               (`activity_references`)
                                                  |
+-------------------------------------------------v-------------------------------------------------+
|                                 UNIVERSAL OPERATIONAL TASKS                                       |
|                                                                                                   |
|  • Zero-Click 06:30 AM Autonomous Daemon (`run_daily_autonomous_sync_daemon`)                      |
|  • Reverse Auto-Resolution on Action Completion (e.g. `save_examination_marks`)                    |
|  • Scoped "My Tasks" (User-filtered) vs "Institute Overview" (Global Master)                     |
|  • 1-Click Direct Action Jumpers (`/fees`, `/homework`, `/examinations`, `/leads`, `/students`)   |
+---------------------------------------------------------------------------------------------------+
```

### Pillar 1: The 8 Autonomous Operational Engines

| # | Operational Engine | Trigger Criteria | Priority | Destination Module & Jumper | SLA / Due Window |
|---|---|---|---|---|---|
| **1** | **Overdue Fee Invoices** | Pending invoices past `due_date` with balance $> 0$ | High / Urgent | `/fees` ("Collect Fee") | Immediate upon due date breach |
| **2** | **CRM Lead Follow-Up** | Inquiries/Leads without touchpoint for $> 3$ days | Medium / High | `/leads` ("View Leads") | Next business day follow-up |
| **3** | **Defaulter Attendance** | Consecutive unexcused absences or $< 75\%$ rate | High | `/attendance` ("View Attendance") | 48 hours guardian outreach |
| **4** | **Homework Review** | Submissions pending evaluation $> 48$ hours past due | Medium | `/homework` ("Review Homework") | 2 business days grading SLA |
| **5** | **Syllabus Pace Deficit** | Batches $> 15\%$ behind scheduled curriculum milestones | High | `/academic?tab=timetable` ("View Timetable") | Weekly curriculum realignment |
| **6** | **Exam Mark Submission** | Concluded examinations without finalized marksheets | Urgent | `/examinations` ("Enter Marks") | 3 calendar days post-exam |
| **7** | **Faculty Session Sign-Off** | Hourly teaching sessions requiring sign-off for payroll | High | `/payroll` ("Verify Session") | 24 hours prior to pay cutoff |
| **8** | **Student Birthday Milestones** | Enrolled active students with birthdays today | Low / Informational | `/students` ("Send Wish") | Same-day celebration outreach |

### Pillar 2: Zero-Click Daily Background Daemon

To eliminate manual trigger requirements:
1. **Async Startup Daemon:** Initialized during FastAPI lifecycle in `backend/app/main.py` via `asyncio.create_task(run_daily_autonomous_sync_daemon())`.
2. **06:30 AM Institute Timezone Cadence:** Computes exact seconds until next 06:30 AM Asia/Kolkata wall-clock time, sleeps non-blockingly, and runs automated synchronization across all active institutions.
3. **Idempotency Safeguards:** Employs canonical deduplication keys (`f"auto:engine_name:record_id"`) ensuring zero task duplication across repeat scans.
4. **Reverse Auto-Resolution Hooks:** Operational events automatically resolve linked tasks (e.g., submitting exam marks in `save_examination_marks` triggers `resolve_automated_tasks(db, source_type="examination", source_record_id=exam_id)`).

### Pillar 3: Frontend UX & 1-Click Action Jumpers

1. **Segmented Scope Filter:**
   - `[ 👤 My Tasks (N) ]`: Instant client-side filter displaying tasks assigned to the active user or requiring personal action.
   - `[ 🏢 Institute Overview ]`: Comprehensive bird's-eye institutional view across all faculty, administrative staff, and departments.
2. **1-Click Action Jumpers:**
   - Displayed prominently on Kanban cards, Day/Week/Agenda/Timeline views, and within the Activity Detail Modal.
   - Distinct color-coded badges with direct navigation icons (`CreditCard`, `FileText`, `GraduationCap`, `PhoneCall`, `Cake`, `UserCheck`).
3. **Global Compact EditModeBar:**
   - Docked neatly in workspace headers at ~32px height, fully compliant with View-First governance (RULE 010) while preserving critical screen real estate.

---

## 3. Database & Entity Relationship Verification

All automated tasks comply strictly with the canonical polymorphic database constraint `ck_activity_references_source_type`:
```sql
CONSTRAINT ck_activity_references_source_type CHECK (
  source_type IN (
    'student', 'lead', 'fee_invoice', 'attendance', 
    'academic_year', 'division', 'subject', 'examination', 
    'timetable_entry', 'communication_log', 'homework_assignment'
  )
)
```
- CRM Follow-ups bind to `source_type="lead"`.
- Exam Marksheet tasks bind to `source_type="examination"`.
- Faculty session reviews bind to `source_type="timetable_entry"`.
- Student birthday outreach binds to `source_type="student"`.

---

## 4. Quality Verification & Release Hygiene

1. **Vitest Frontend Regression Suite:** 25/25 unit & integration tests PASSED.
2. **Pytest Backend Verification:** 9/9 automated engine tests PASSED in 123s.
3. **Corporate Attribution Headers:** 763/763 files verified with 100% compliance (`python scripts/manage_headers.py check`).
4. **Release Hygiene Auditor:** 215 files scanned, 42.24 MB production distribution payload verified with zero forbidden files or raw media (`python scripts/check_release_hygiene.py`).
