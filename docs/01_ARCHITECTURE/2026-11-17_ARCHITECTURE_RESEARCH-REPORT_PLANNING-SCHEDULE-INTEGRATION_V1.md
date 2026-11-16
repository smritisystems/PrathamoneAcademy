---
title: "Planning & Schedule Integration — Architecture Research and Gap Analysis"
module: "01_ARCHITECTURE"
category: "RESEARCH-REPORT"
document_type: "REPORT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-17"
updated_date: "2026-11-17"
author: "Jawahar R Mallah"
organization: "Smritisys & AITDL Networks"
status: "Approved"
tags: ["planning", "timetable", "calendar-integration", "single-source-of-truth", "schedule-audit"]
entities: ["Activity", "TimetableEntry", "Examination", "HomeworkAssignment", "LeadFollowUp", "LeadDemoClass", "StaffLeave", "TeachingSession"]
api_routes: ["/api/v1/planning/activities", "/api/v1/timetable/", "/api/v1/examinations", "/api/v1/homework", "/api/v1/leads/follow-ups", "/api/v1/leads/demo-classes"]
related_modules: ["03_ACADEMIC_MANAGEMENT", "04_STUDENT_MANAGEMENT", "05_TEACHER_MANAGEMENT", "08_EXAMINATION", "17_UI_UX_DESIGN", "25_BUSINESS_REQUIREMENTS"]
---

# Planning & Schedule Integration — Architecture Research and Gap Analysis

## Executive decision

**Do not refactor or copy the timetable into the Planning `activities` table.** A timetable entry is a recurring academic schedule with its own conflict rules and academic ownership; a Planning activity is a task, event, or holiday with its own lifecycle, assignees, recurrence, and audit history. Converting timetable rows into editable activities would create two authoritative schedules and allow them to drift.

The existing backend already projects timetable occurrences, active examination date ranges, and published homework deadlines into the Planning calendar as read-only items. Keep those source records in their modules and improve the presentation at the projection boundary. This review implements that presentation improvement and exposes Planning in the authorized sidebar.

## Evidence and source inventory

| Existing record | Authoritative source | Planning treatment | Recommendation |
|---|---|---|---|
| Planning task, event, or holiday | `activities` | Planning-owned, permission-governed, editable in the Planning workspace | Continue using the canonical Planning record and its existing lifecycle. |
| Weekly class periods | `timetable_entries` / `TimetableEntry` | Expanded into dated, read-only calendar occurrences; also used by schedule-conflict checks | Keep the Academic Timetable Studio authoritative. Do not copy periods into `activities`. |
| Examination window | `examinations` / `Examination` | Read-only all-day calendar item when the caller can view examinations | Continue projecting the date range. The existing model has dates, not per-paper start times, so do not imply finer scheduling than the source contains. |
| Published assignment deadline | `homework_assignments` / `HomeworkAssignment` | Read-only task-like calendar item when homework view permission is present | Continue projecting the due date. Assignment publication, recipients, submissions, and closure stay in Homework. |
| Scheduled lead follow-up or demo class | `lead_follow_ups`, `lead_demo_classes` | Read-only dated items when the caller has CRM read access and the active data environment matches | Keep CRM as the owner. Planning projects only scheduled records in the selected institution and `PRODUCTION` or `TRAINING` environment, with generic titles that do not expose prospect contact details. |
| Staff leave | `staff_leaves` | Not currently projected | Do not expose by default. If later requested, show only approved date blocks to the staff member and appropriately authorized workforce users; never project the reason or leave type into a broad calendar. |
| Teaching sessions and attendance | `teaching_sessions`, attendance records | Not a planned calendar item | These represent delivery/history or attendance facts. Keep them in their source modules; link to them when relevant instead of presenting them as future commitments. |
| Batch `schedule_timing` text | `divisions.schedule_timing` | Not used to generate dated Planning entries | Treat as descriptive legacy text, not a second timetable. The structured `TimetableEntry` rows are the schedule source. |

### Existing integration path

- `list_calendar_items` in `backend/app/services/planning_service.py` expands Planning-owned recurrence, projects active examination windows and published homework, and expands active weekly timetable entries across the requested local-date range.
- Projected source items are marked `editable: false`; Planning writes do not mutate their source records.
- `check_schedule_conflicts` checks published Planning activities against class, teacher, and room periods from the canonical timetable.
- The frontend exposes Month, Week, Day, Kanban, Agenda, and Timeline. A read-only source item was previously rendered with the placeholder Planning status/priority and could appear in Kanban. This review labels the originating module, hides placeholder status/priority in the detail view, applies status filtering only to Planning-owned records, and limits Kanban cards to editable Planning-owned work.
- Planning already has an authorized module definition and `/planning` route. The hand-maintained secondary sidebar list had omitted it; the link is now present and continues to be filtered through the authorized module registry.

## Refactor assessment

### Timetable: no conversion; consider lifecycle scoping separately

`TimetableEntry` stores division, subject, teacher, day of week, start/end time, room, and active state. It is a weekly pattern, not a dated activity. The current model does not attach an academic year or effective start/end date, while the calendar projection expands every active period for every requested week. This is correct only when active rows represent the currently applicable recurring timetable.

**Recommendation:** defer a timetable schema refactor until institute policy confirms whether a timetable is replaced each academic year, changes by term, or has mid-year effective dates. If those cases must coexist, introduce a versioned/effective-dated timetable source and make the projection honor its validity window. Do not use free-text `schedule_timing` or duplicate it into Planning as a workaround.

### Other source schedules: selective read-only projections

CRM follow-ups and demo classes have scheduled timestamps and are genuine upcoming work. Their read-only Planning projections reuse the CRM `leads:read` authorization policy, match the selected institution and active `PRODUCTION`/`TRAINING` data environment, and include only scheduled records attached to active leads. The calendar exposes generic titles and no lead name, phone, remarks, or demo feedback; all updates remain in CRM. The `ALL` environment intentionally omits CRM projections rather than mixing datasets.

Staff leave is a lower-priority candidate because leave reason/type is sensitive and should not be exposed by the general Planning permission. Teaching sessions and attendance are historical/operational records, not calendar commitments. Fees, payment records, and communications logs should remain excluded except for narrowly defined reminders that link back to their owning module.

## Research basis

- The repository's [Global SSOT Governance Framework](../25_BUSINESS_REQUIREMENTS/2026-11-06_GLOBAL_POLICY_SINGLE-SOURCE-OF-TRUTH-GOVERNANCE_V1.md) requires reuse of authoritative entities and prohibits duplicate business records.
- The [Timetable & Academic Scheduling Studio report](../03_ACADEMIC_MANAGEMENT/2026-11-13_ACADEMIC-MANAGEMENT_FEATURE-REPORT_TIMETABLE-AND-ACADEMIC-SCHEDULING-STUDIO_V1.md) documents the timetable matrix, conflict detection, generation, and print workflow as an existing Academic capability.
- The [Unified Planning & Activities architecture review](2026-11-16_ARCHITECTURE_REVIEW_UNIFIED-PLANNING-ACTIVITIES-WORKSPACE_V1.md) sets the ownership boundary: Planning owns its activities; module-owned records are linked or projected read-only.
- [RFC 5545 (iCalendar)](https://www.rfc-editor.org/rfc/rfc5545) distinguishes calendaring components such as events and to-dos and defines recurrence representations. The product should preserve the source module's semantics rather than flatten every schedule into one editable event record.

## Implemented in this review

1. Linked schedule cards now identify their source as Timetable, Examination, or Homework and visibly remain read-only.
2. Read-only projections no longer display placeholder priority/status as if they were Planning workflow state.
3. Planning status filters apply to Planning-owned activities; read-only source items are excluded when a specific Planning status is selected.
4. Kanban contains only Planning-owned editable items. Calendar, Agenda, and Timeline continue to show source projections.
5. Added Planning & Activities to the sidebar's authorized secondary navigation. New sessions now default to an expanded sidebar at tablet widths as well as desktop widths; an explicit saved collapsed/hidden preference remains respected.
6. Added read-only CRM follow-up and demo-class projections, gated by the shared `leads:read` policy and environment/institution scope. Cancelled or non-scheduled records, inactive leads, and prospect contact details are excluded.
7. Fixed the Planning API startup blocker: migration `052_timetable_teacher_reference` now ensures the canonical teacher reference without failing when an existing installation already has the column and foreign key. The backend now registers the Planning routes in OpenAPI.

No timetable, activity, homework, examination, or CRM database records were copied or migrated by this change.

## Verification status and remaining checks

- Focused frontend Planning workspace tests pass, including the read-only timetable projection and Kanban behavior.
- Sidebar regression coverage verifies the Planning link for an authorized user.
- Backend Planning tests cover read-only CRM projections, status filtering, institution/environment matching, minimized lead data, and omission for Planning-only users.
- After migration `052_timetable_teacher_reference` completed, the route appeared in backend OpenAPI and returned an authentication response rather than 404 through both the backend and Vite proxy. The shared authenticated browser should be refreshed to verify its rendered workspace.
- The timetable's academic-year/effective-date lifecycle remains an open product decision; no timetable data migration is recommended until that policy is confirmed.

## Final recommendation

Keep the existing source-of-truth architecture. Treat Planning as the **cross-module calendar and task view**, not a replacement for timetable, exams, homework, CRM, or HR. The current schedule projections are the right integration mechanism. The implemented UI changes make their ownership and read-only state clearer. Prioritize a verified backend/browser smoke test, then decide whether CRM read-only projections and effective-dated timetable versions are needed for actual institute operations.
