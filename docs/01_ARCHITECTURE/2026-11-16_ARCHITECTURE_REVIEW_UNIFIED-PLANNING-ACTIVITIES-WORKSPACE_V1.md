---
title: "PrathamOne EduOS — Unified Planning & Activities Workspace Proposal Review"
module: "01_ARCHITECTURE"
category: "ARCHITECTURE-REVIEW"
document_type: "REVIEW"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-16"
updated_date: "2026-11-17"
author: "Jawahar R Mallah"
organization: "Smritisys & AITDL Networks"
status: "In Progress"
tags: ["planning", "activities", "calendar", "kanban", "agenda", "timeline", "architecture-review"]
entities: ["Activity", "ActivityAssignee", "ActivityAttachment", "ActivityReference", "ActivityRecurrenceException"]
api_routes: ["/api/v1/planning/activities", "/api/v1/planning/assignees", "/api/v1/planning/attachments"]
related_modules: ["01_ARCHITECTURE", "03_ACADEMIC_MANAGEMENT", "05_TEACHER_MANAGEMENT", "07_ATTENDANCE", "08_EXAMINATION", "09_FEES_PAYMENTS", "12_RBAC_SECURITY", "16_DATABASE_API", "17_UI_UX_DESIGN", "18_TESTING_QA"]
---

# PrathamOne EduOS — Unified Planning & Activities Workspace Proposal Review

## Review Scope

This document records the original proposal review and the implementation decisions made while inspecting the repository. Implementation is in progress; the verification status below reflects only checks actually completed.

## Overall Assessment

The proposal has a strong product direction: one planning activity system, multiple views, explicit links to authoritative modules, role-aware behavior, responsive design, and a verification requirement. Its single-workspace principle is the right guardrail against four disconnected task stores.

The principal implementation risk is an unresolved ownership boundary: the workspace is asked to manage calendars for examinations, timetables, holidays, attendance, fees, and admissions while also being prohibited from duplicating those records. Define which data the activity system owns and which records it only displays before implementation begins.

## Strengths

- States a single-source-of-truth goal and explicitly prohibits duplicate operational records.
- Covers complementary planning views rather than prescribing separate data stores.
- Includes scheduling, assignment, priorities, statuses, recurrence, attachments, links, and audit history.
- Includes permission governance, responsive behavior, accessibility alternatives, and regression testing.
- Requires real implementation and verification rather than accepting an unverified completion claim.

## Decisions Needed Before Implementation

### 1. Define authoritative ownership

Separate workspace-owned planning items (for example, tasks and institute-created events) from records owned by existing modules (for example, examination schedules, timetable entries, attendance, fee transactions, and admissions). Existing module-owned records should be surfaced through read-only projections or explicit links, not copied into a second editable activity record. State the authoritative source and allowed actions for each displayed category.

### 2. Bound the activity model

Clarify whether an activity can have multiple assignees, linked records, and attachments. Define how links retain referential integrity across modules rather than relying on an unconstrained entity-name/id pair. Specify whether recurrence is a series with exceptions or individual generated records, and how audit history relates to both.

Classify each proposed persisted entity under the repository's governance (such as transaction, relationship, or configuration) and reuse canonical user, academic-year, class, subject, room, and branch records.

### 3. Specify scheduling semantics

Define institute/branch timezone handling, daylight-saving behavior, all-day events, inclusive/exclusive end times, and the relationship between start/end and due date. For recurrence, specify supported rules and what happens when editing one occurrence versus the whole series. Define conflict rules for shared rooms, teachers, and cohorts, including whether conflicts block saving or are permission-controlled warnings.

### 4. Make workflow behavior testable

Clarify whether the listed Kanban columns are fixed defaults or configurable workflow columns mapped to canonical statuses. Define permitted transitions, cancellation behavior, reopening completed work, and whether board movement updates the same canonical status shown in Calendar, Agenda, and Timeline.

### 5. Align permissions with global governance

Require existing role and branch checks at the API/service boundary, not only in the UI. State that workspaces default to View Mode and require explicit, scoped Edit Mode for changes; deletion/cancellation must follow authorization, confirmation, and applicable historical-record protections. Define who may publish calendars and who can see private or department-specific activities.

### 6. Define API and operational expectations

Specify date-window filtering, pagination, sorting, search, branch scoping, and expected behavior for concurrent edits. Define whether cancellation is a soft state rather than physical deletion. For attachments, require existing storage/access controls and authorization checks. Keep test fixtures isolated from production seed data.

### 7. Turn verification into acceptance criteria

For each view and workflow, list observable expected results and edge cases. Tests should include timezone/DST and recurrence exceptions; overlapping room/teacher/cohort schedules; permission-denied operations; valid and invalid Kanban transitions; and cross-view status consistency. Require desktop and mobile screenshots at stated viewport sizes, plus migration and regression results.

## Suggested Prompt Additions

Add a short **Ownership and constraints** section:

> Before designing persistence, inspect and map the existing authoritative models, APIs, services, and permission checks. Create no duplicate copies of module-owned records. The workspace may persist only planning-owned activities; module-owned calendar items must be linked or projected from their source of truth and remain read-only unless that module already grants the operation. Reuse canonical users and branch/academic references. Default to View Mode and enforce scoped Edit Mode and authorization on the server.

Add explicit **scheduling and workflow acceptance criteria**:

> State the supported recurrence rules, timezone policy, single-occurrence versus series edit behavior, and room/teacher/cohort conflict policy. Keep one canonical status across all views and test allowed/denied transitions. Define calendar date boundaries and test recurring occurrences, exceptions, DST/timezone cases, and overlapping resources.

## Implementation Decisions and Current Status

The repository inspection found existing authoritative records for examinations, timetable entries, published homework, leads, students, fee invoices, attendance, and communication logs. The Planning workspace uses a new institution-scoped activity master only for activities owned by Planning. Existing modules are not copied into activity rows; supported external records are validated references, and supported calendar records are read-only projections. Canonical `users`, academic years, divisions, and subjects are reused. The existing global `AuditLog` remains the audit source.

Scheduling decisions:

- The institution timezone is used by default; submitted datetimes must include an offset and are stored in UTC.
- Recurrence supports daily, weekly, and monthly rules with an interval, an end date, optional weekly weekdays, and per-occurrence cancellation exceptions.
- Recurrence is limited to five years to keep conflict evaluation bounded.
- Calendar ranges are inclusive by local date. Recurring event times preserve local wall-clock time across timezone offset changes.
- Conflicts are rejected for overlapping planning activities and matching timetable class, assignee, or location conflicts. Tests cover conflicts in both directions between recurring and one-time schedules.

Workflow and authorization decisions:

- Canonical statuses are Backlog, To Do, In Progress, Blocked, Completed, and Cancelled. Status transitions are checked by the API; Kanban drag-and-drop and the status selector use the same transition endpoint.
- Mutating operations lock the activity row while validating its optimistic version to prevent concurrent lost updates.
- Planning-owned writes are API-authorized and the frontend uses the existing scoped View/Edit Mode. The workspace defaults to Agenda on small screens and provides Month, Week, Day, Kanban, Agenda, and Timeline presentations.
- Cancellation is a status change or a per-occurrence exception, not physical deletion. Source-module projections are read-only.
- Attachments are stored outside the database payload and served only through authenticated, institution-scoped endpoints with type and size validation. Removal requires confirmation and is audit-logged; files written before a failed database persistence are cleaned up.

### Research-backed audit and fixes

The implementation was reviewed against the following primary guidance:

- [RFC 5545, iCalendar](https://www.rfc-editor.org/rfc/rfc5545), especially DATE-TIME, time-zone identifiers, and recurrence rules. Recurrences must retain their intended local wall time while offsets change; date-only recurrence boundaries must be interpreted in the event timezone.
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/) and the [WAI-ARIA modal dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/). A modal needs a programmatic label, modal semantics, initial focus, contained keyboard navigation, Escape handling, and focus restoration. Drag-and-drop also needs a non-drag alternative.
- [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html). Client MIME headers are untrusted; use narrow extension allowlists, content-signature checks, generated storage names, size limits, authorization, and non-public storage, with malware scanning or content disarm where available.
- [ClamAV clamd protocol](https://docs.clamav.net/manual/Usage/ClamdProtocol.html) and [official Docker guidance](https://docs.clamav.net/manual/Installing/Docker.html). The implementation uses framed INSTREAM requests; the daemon's unauthenticated TCP port stays on the private Compose network. The official Docker guidance recommends budgeting about 4 GiB of RAM for ClamAV.

The audit found and corrected these concrete defects:

- Calendar navigation and event entry used the browser timezone, while recurrence expansion and projections used the institution/activity timezone. The API now returns the institution timezone; date-only navigation is host-timezone independent; event form values convert using the activity's IANA timezone; skipped daylight-saving wall times are rejected and repeated wall times resolve consistently. Recurrence end-date validation now uses the event timezone.
- Editing an item opened a second modal over the still-open detail modal. Edit now closes the detail view first. The shared modal now declares an accessible dialog, focuses content, traps Tab/Shift+Tab, closes on Escape, and restores focus.
- Agenda had only date grouping. It now separates Today, Overdue, Upcoming, Pending tasks, Assigned work, and Institutional events. Weekly recurrence can select weekdays and interval; the form supports all-day activities, visibility, publishing (subject to permission), and validated links to authoritative records.
- Kanban exposed invalid status moves, and the Cancelled filter could not return cancelled rows. Status options now reflect server-provided transitions; the API can include cancelled rows only when explicitly requested.
- Activity cancellation checked a delete permission but did not check visibility or management ownership. The endpoint now applies both checks before returning or changing status; a regression test covers attempts to cancel another user's unpublished activity.
- Upload handling trusted extension and client-provided MIME together. It now validates file signatures / required Office package entries and stores a MIME type derived from the validated extension. Existing size limits, generated filenames, tenant scoping, and authenticated download remain in place.
- Planning attachment uploads now stream validated content to ClamAV before any file or metadata is persisted. An unavailable or misconfigured scanner rejects uploads; malware detections are rejected. Docker Compose adds a health-checked ClamAV service with a persistent signature database and no published scanner port.
- Attachment lifecycle was incomplete. A scoped, authorized removal endpoint and confirmed UI action now audit the metadata change and remove the stored file; failed upload persistence also cleans up the new file. Removal now unlinks before committing metadata deletion, so filesystem failures preserve metadata and support retry.
- Mobile view controls hid their text labels without accessible names or selected-state semantics. The view switcher now exposes a labeled group, named buttons, and `aria-pressed` state.
- An authenticated end-to-end check against a disposable migrated database exposed that the calendar timetable projection selected `timetable_entries.teacher_id`, although the table-creation migration did not create that model-defined column. Added migration `052_timetable_teacher_reference` to align the deployed schema with the existing nullable canonical `users.id` relationship; no application or customer database was altered.

### Delivered so far

- SQLAlchemy models and Alembic revisions `051_unified_planning_activities` and `052_timetable_teacher_reference`.
- Institution-scoped planning APIs for listing, creating, updating, status transitions, cancellation, assignees, recurrence exceptions, attachment upload/download/removal, and audit history.
- Frontend registry/navigation routing, typed API methods, and a responsive workspace with Calendar Month/Week/Day, Kanban, Agenda, and Timeline views.
- The activity form now reuses the institution-scoped academic-year, class/batch, and subject APIs for readable academic context selectors; the selected IDs are included in create/update payloads and remain validated by the API.
- Focused backend tests for recurrence exceptions, weekly interval selection, daylight-saving local-time behavior, undated Kanban tasks, and the create/list/update/status API lifecycle.
- Regression tests for timezone wall-time conversion and DST gaps/overlaps, modal keyboard focus containment, attachment signature checks, ClamAV INSTREAM protocol, infected-file and fail-closed behavior, lifecycle (including retry after a transient unlink failure), cancelled-item filtering, recurrence boundary timezone handling, and cancellation authorization.

### Remaining verification / known gaps

- The final Planning, timetable scheduling, and global View/Edit governance selection passed: 20 tests. The Planning file passed 16 tests, including scanner protocol and failure handling, upload/removal, authorization, tenant scope, stale edits, recurrence boundaries, and schedule conflicts.
- Before the academic-scope selector update, the full frontend suite passed: 76 test files and 564 tests. After the update, the focused Planning workspace UI suite passed (2 tests), and the TypeScript/Vite production build passed. Existing CSS parsing and large-chunk warnings remain; the full frontend suite has not been rerun after this update.
- Revisions `051_unified_planning_activities` and `052_timetable_teacher_reference` upgraded successfully on the confirmed disposable test database. The live API smoke exposed and confirmed the timetable column mismatch that revision 052 corrects. Revision 052 is additive and its column is nullable; its downgrade removes only that new column. A full rollback to `base` remains blocked: migration 013 conditionally creates `teacher_assignments` and has a no-op downgrade, leaving a table that can still reference `subjects` when migration 001 attempts to drop it. The table's provenance cannot safely be assumed, so this legacy downgrade path was not changed. No application database was modified.
- An isolated browser UI smoke test used only synthetic, non-persistent API responses at 1440px desktop and 390px / 320px mobile widths; screenshots were captured at 1440px and 390px. The workspace rendered without horizontal overflow at all tested widths, mobile initially selected Agenda, and all six view buttons exposed accessible names and selected state. These mock-data screenshots do not verify authenticated live API behavior.
- An authenticated end-to-end review used only the synthetic `UI Review Academy` tenant and `prashant_academy_test` database. The migrated Planning API returned 200 and rendered a synthetic task across Month, Week, Kanban, Agenda, and Timeline; Day correctly showed no item on Nov 17 for a task due Nov 18. At desktop 1481px, mobile 390px, and narrow 320px widths, the page had no horizontal overflow; mobile selected Agenda by default. Screenshots were captured for desktop and mobile. The shared browser tab and production database were not used.
- The isolated browser session also observed an unrelated `GET /api/v1/codex/user-status` 500 caused by a unique-key conflict while creating a CodeX config; Planning API requests returned 200 after revision 052. This CodeX issue is outside this review and was not changed.
- ClamAV fail-closed scanning and Docker Compose validation passed. A temporary loopback-only ClamAV 1.4 daemon with current signatures accepted a clean stream and rejected the harmless EICAR test signature; the temporary scanner container was stopped afterward. This validates the daemon protocol and verdict handling, but not a full production deployment lifecycle or signature-update monitoring. Content disarm/reconstruction and parser-based validation are not implemented.
- Record links are still selected by authoritative record type and numeric ID; user-friendly record search/pickers remain to be integrated.
- The academic selectors have focused UI coverage but have not yet been verified in the authenticated browser. Keyboard and touch operation still need an authenticated end-to-end review; prior responsive checks verified layout and overflow, not those interaction modes.

## Recommendation

The single-source architecture and core planning workflow are substantially implemented, and the verified integration defects are fixed. Evidence-based score remains **9.1/10**. The score is not 10/10: the repository's full historical rollback has a separate legacy blocker; user-friendly linked-record pickers remain; the new academic selectors still need authenticated browser verification; and full production deployment, monitoring, accessibility, and touch-operation checks are still needed. The authenticated visual and real-daemon tests used isolated synthetic data, not production records. Do not treat isolated test results as evidence of production readiness.
