---
title: "Planning Workspace Single-Occurrence Reschedule Implementation Report"
module: "03_ACADEMIC_MANAGEMENT"
category: "IMPLEMENTATION-REPORT"
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
tags: ["planning", "recurrence", "reschedule", "single-occurrence", "activity-recurrence-exceptions"]
entities: ["Activity", "ActivityRecurrenceException"]
api_routes: ["/api/v1/planning/activities/{activity_id}/exceptions"]
related_modules: ["03_ACADEMIC_MANAGEMENT", "01_ARCHITECTURE"]
---

# Planning Workspace Single-Occurrence Reschedule Implementation Report

## 1. Executive Summary

In accordance with Single Source of Truth (SSOT) and anti-duplication governance (RULE 001, RULE 010, RULE 011), this report documents the implementation of the **Single-Occurrence Reschedule** capability within the PrathamOne EduOS Planning Workspace.

Prior to this feature, cancelling a single occurrence of a recurring series was supported by writing an `activity_recurrence_exceptions` entry. However, moving or rescheduling an individual occurrence required mutating or bifurcating the underlying recurring series, compromising master recurrence integrity.

With this enhancement, authorized users in scoped Edit Mode can reschedule a single occurrence of any recurring activity to a new date and time window. The underlying series definition remains immutable, while the override timestamps (`rescheduled_start_at` and `rescheduled_end_at`) are persisted to `activity_recurrence_exceptions`. All calendar, Kanban, agenda, and timeline projections dynamically project the rescheduled occurrence to its override slot with explicit visual badge indicators and one-click restoration to the canonical recurring schedule.

---

## 2. Architectural Blueprint & Data Model

### 2.1 Schema Migration (`053_recurrence_reschedule.py`)

Table `activity_recurrence_exceptions` was expanded with two nullable timezone-aware datetime columns:
- `rescheduled_start_at`: `DateTime(timezone=True)`, nullable
- `rescheduled_end_at`: `DateTime(timezone=True)`, nullable

```sql
ALTER TABLE activity_recurrence_exceptions
    ADD COLUMN rescheduled_start_at TIMESTAMP WITH TIME ZONE NULL,
    ADD COLUMN rescheduled_end_at TIMESTAMP WITH TIME ZONE NULL;
```

Alembic revision identifier: `053_recurrence_reschedule` (down revision `052_timetable_teacher_reference`).

### 2.2 SQLAlchemy Models (`backend/app/models/planning.py`)

Model `ActivityRecurrenceException`:
- `rescheduled_start_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)`
- `rescheduled_end_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)`

### 2.3 Domain Service Logic (`backend/app/services/planning_service.py`)

1. **`_serialize_activity`**:
   - Supports `override_start`, `override_end`, `is_rescheduled`, and `original_occurrence_date`.
   - Sets serialized `start_at` and `end_at` from override timestamps when present.
   - Emits `is_rescheduled: bool` and `original_occurrence_date: Optional[str]`.

2. **`expand_activity`**:
   - Compares recurring dates against `activity.recurrence_exceptions`.
   - When an exception has `rescheduled_start_at is not None`, projects the occurrence to its rescheduled date slot with `is_rescheduled=True`.
   - Suppresses the original occurrence slot so duplicates never appear.
   - Handles horizon-crossing occurrences moved into or out of the requested calendar date range.

3. **`_activity_intervals`**:
   - Incorporates rescheduled override intervals during conflict detection and room/division scheduling validation.

---

## 3. API Contract Specifications

### 3.1 Reschedule Occurrence (`POST /api/v1/planning/activities/{activity_id}/exceptions`)

**Request Payload:**
```json
{
  "occurrence_date": "2026-04-02",
  "rescheduled_start_at": "2026-04-02T14:00:00+00:00",
  "rescheduled_end_at": "2026-04-02T15:00:00+00:00"
}
```

**Behavior:**
- Validates scoped Edit Mode permissions (`planning:edit`).
- Verifies that `occurrence_date` corresponds to a genuine occurrence of the recurring series.
- Runs conflict validation (`check_schedule_conflicts`) for the proposed rescheduled time slot against assignees and location.
- Inserts or updates `activity_recurrence_exceptions`.
- Increments `activity.version` and emits an `occurrence_rescheduled` audit log entry.

### 3.2 Restore Occurrence (`DELETE /api/v1/planning/activities/{activity_id}/exceptions`)

**Query Parameters:**
- `occurrence_date`: Date string (`YYYY-MM-DD`)

**Behavior:**
- Deletes the exception row from `activity_recurrence_exceptions`.
- Synchronizes the in-memory relationship collection.
- Restores the occurrence to its canonical recurring cadence.
- Increments `activity.version` and emits an `occurrence_restored` audit log entry.

---

## 4. Frontend Workspace Integration (`frontend/src/pages/PlanningWorkspace.tsx`)

1. **View-First Governance (RULE 010):**
   - In View Mode, activities display read-only details and scheduled timestamps.
   - When scoped Edit Mode (`planning:workspace`) is activated, recurring activities display:
     - **Reschedule occurrence**: Launches the accessible rescheduling modal.
     - **Restore original schedule**: Appears when viewing a previously rescheduled occurrence (`is_rescheduled === true`).

2. **Visual Indicators:**
   - **Cards & Month View:** Amber "↻ Rescheduled" badge with tooltip indicating the original recurrence date (`Rescheduled from YYYY-MM-DD`).
   - **Detail Modal Header:** Elevated amber badge (`Rescheduled (was YYYY-MM-DD)`).

3. **Reschedule Modal:**
   - Accessible form with date picker and start/end time inputs.
   - Timezone-aware timestamp serialization via `planningInstantFromWallTime`.
   - Conflict-aware error toast feedback.

---

## 5. Verification & Testing

- **Backend Pytest (`backend/tests/test_planning_workspace.py`):**
  - `test_expand_activity_with_rescheduled_occurrence`: PASSED
  - `test_api_reschedule_occurrence_and_restore`: PASSED
  - Full suite: **20/20 passed** in 25.59s.
- **Frontend Vitest (`frontend/src/test/PlanningWorkspace.test.tsx`):**
  - `allows rescheduling a single occurrence to a new date and time`: PASSED
  - `displays rescheduled badge and allows restoring the original schedule`: PASSED
  - Full suite: **6/6 passed** in 1.51s.
- **Corporate Attribution:** 653/653 source files verified (100% compliance).
- **TypeScript & Build:** Clean compilation with Vite 8.3.8.
