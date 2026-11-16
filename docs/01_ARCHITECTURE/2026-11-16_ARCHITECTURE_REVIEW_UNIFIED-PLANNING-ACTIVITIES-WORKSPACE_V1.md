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
updated_date: "2026-11-16"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Draft"
tags: ["planning", "activities", "calendar", "kanban", "agenda", "timeline", "architecture-review"]
entities: ["Activity"]
api_routes: []
related_modules: ["01_ARCHITECTURE", "03_ACADEMIC_MANAGEMENT", "05_TEACHER_MANAGEMENT", "07_ATTENDANCE", "08_EXAMINATION", "09_FEES_PAYMENTS", "12_RBAC_SECURITY", "16_DATABASE_API", "17_UI_UX_DESIGN", "18_TESTING_QA"]
---

# PrathamOne EduOS — Unified Planning & Activities Workspace Proposal Review

## Review Scope

This review evaluates only the supplied workspace proposal. It does not inspect or assert the current repository architecture, existing APIs, database schema, or permissions. No implementation is authorized by this review.

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

## Recommendation

Approve the proposal as a product brief, but resolve the ownership boundary, scheduling semantics, workflow rules, and permission behavior before asking an agent to implement it. Then require an architecture inventory and proposed data/API changes before schema or endpoint modifications. This review does not confirm that any requested feature already exists or that the proposal is compatible with current code.
