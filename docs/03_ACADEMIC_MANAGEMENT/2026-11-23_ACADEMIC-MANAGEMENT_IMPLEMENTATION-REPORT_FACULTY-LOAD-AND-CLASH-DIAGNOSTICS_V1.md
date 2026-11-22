---
title: "Faculty Teaching Load & Multi-Batch Schedule Clashing Diagnostics Implementation Report"
module: "03_ACADEMIC_MANAGEMENT"
category: "IMPLEMENTATION-REPORT"
document_type: "REPORT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-23"
updated_date: "2026-11-23"
author: "Jawahar R Mallah"
organization: "Smritisys & AITDL Networks"
status: "Approved"
tags: ["academic-management", "timetable", "faculty-load", "clash-diagnostics", "sleek-ui", "ssot"]
entities: ["TimetableEntry", "TeachingSession", "TeacherAssignment", "Division", "User"]
api_routes: ["/api/v1/reports/academic/faculty-load", "/api/v1/reports/academic/timetable-execution-audit", "/api/v1/reports/academic/timetable-utilization"]
related_modules: ["03_ACADEMIC_MANAGEMENT", "05_TEACHER_MANAGEMENT", "11_REPORTS_EXPORTS"]
---

# Faculty Teaching Load & Multi-Batch Clashing Diagnostics Report

## 1. Executive Summary & Problem Resolution

Prior to this implementation, the `faculty-load` report in `backend/app/api/v1/endpoints/reports.py` suffered from architectural misalignment:
1. **Misattributed Timetable Load:** Weekly sessions were grouped using `Division.class_teacher_id` instead of the canonical `TimetableEntry.teacher_id`. As a result, non-class teacher subject faculty (e.g., Prof. Amit Patil) incorrectly reported zero weekly sessions, while class teachers inherited sessions actually delivered by other teachers in their division.
2. **Missing Contact Hours:** Only session counts were tracked, without calculating true instructional duration hours (e.g. 45-min vs 60-min vs 90-min periods).
3. **No Collision / Clash Detection:** Institutional schedulers lacked visibility into simultaneous multi-batch conflicts where a single faculty member was assigned to two distinct divisions during overlapping time slots on the same day.
4. **UI Telemetry Absence:** The frontend grid lacked top-level summary ribbons, monospace timing metrics, and visual conflict badges.

The enhanced system resolves these issues with strict SSOT compliance, high-performance in-memory clash detection, and Sleek UI ribbon telemetry.

---

## 2. Architectural Design & SSOT Implementation

### 2.1 Backend Metric Aggregation (`backend/app/api/v1/endpoints/reports.py`)
- **Direct Faculty Allocation:** Timetable sessions are now grouped strictly by `TimetableEntry.teacher_id`.
- **Duration Contact Hours Calculation:**
  ```python
  start_dt = datetime.strptime(str(entry.start_time), "%H:%M:%S")
  end_dt = datetime.strptime(str(entry.end_time), "%H:%M:%S")
  duration_hrs = (end_dt - start_dt).total_seconds() / 3600.0
  ```
- **Pairwise Schedule Collision Detection:**
  For each faculty member, active timetable entries are indexed by `(day_of_week)`. For any two entries on the same day:
  ```python
  if max(start_a, start_b) < min(end_a, end_b):
      clashes_count += 1
  ```
  This identifies double-booking across different batches or rooms without requiring complex database joins.
- **Batches & Mentorship Union:** Combines subjects taught via `TeacherAssignment` with divisions where the faculty serves as `Division.class_teacher_id`.

### 2.2 Frontend Enhancements (`frontend/src/pages/Reports.tsx`)
- **Sleek KPI Ribbon (6 Metrics):**
  1. *Total Faculty:* Total registered teaching staff in the academic year.
  2. *Active Teaching:* Faculty actively scheduled for one or more weekly sessions.
  3. *Weekly Sessions:* Aggregate scheduled timetable sessions across all divisions.
  4. *Instruction Hours:* Sum of weekly instructional duration hours.
  5. *Schedule Clashes:* Conflict counter featuring an emerald `0 Clashes Clean` badge or an amber `X Conflicts Detected` alert.
  6. *Avg Sessions / Staff:* Mean workload per active instructor.
- **ExcelReportGrid Columns:**
  - `Faculty Member`: Name, email, and purple `Class Mentor` badge when applicable.
  - `Staff Code`: Monospace uppercase identifier.
  - `Active Batches`: Count of unique assigned divisions.
  - `Weekly Sessions`: Bold numeric session counter with ` sessions/wk` chip.
  - `Contact Hours`: Precise duration formatted to 1 decimal place (e.g. `2.3 hrs`).
  - `Schedule Clashes`: Monospace counter with emerald `Clean` or amber `X Clashes` badge.
  - `Taught Students`: Sum of enrolled students across the faculty member's active batches.

---

## 3. Data Integrity & Verification Evidence

- **Docker Integration:** Backend updated and restarted in `prashant_academy_backend`; frontend bundled and reloaded in `prashant_academy_frontend`.
- **Attribution Headers:** 100% compliance verified across 775 files (`manage_headers.py`).
- **Live Verification:** Subagent verified report rendering, KPI metrics calculation, and timetable docket logo bounding.
