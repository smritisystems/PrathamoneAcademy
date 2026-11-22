---
title: "Timetable Schedule Execution & Substitution Status Audit Report Implementation"
module: "03_ACADEMIC_MANAGEMENT"
category: "IMPLEMENTATION-REPORT"
document_type: "REPORT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-22"
updated_date: "2026-11-22"
author: "Jawahar R Mallah"
organization: "Smritisys & AITDL Networks"
status: "Approved"
tags: ["timetable", "teaching-sessions", "substitution", "proxy", "reports", "academic-audit", "sleek-ui"]
entities: ["TeachingSession", "TimetableEntry", "Division", "Standard", "Subject", "User"]
api_routes: ["/api/v1/reports/academic/timetable-execution-audit"]
related_modules: ["03_ACADEMIC_MANAGEMENT", "06_TEACHER_PAYROLL", "11_REPORTS_EXPORTS"]
---

# Timetable Schedule Execution & Substitution Status Audit Report Implementation Report

**Executive Summary:**  
Following the architectural feasibility evaluation in `docs/03_ACADEMIC_MANAGEMENT/2026-11-22_ACADEMIC-MANAGEMENT_FEASIBILITY-REPORT_TIMETABLE-STATUS-REPORTING-AND-NEP2020-ALIGNMENT_V1.md` (Weighted Score: 8.8/10 — Tier-1 Core Operational Requirement), this document records the complete implementation of the **Timetable Schedule Execution & Substitution Status Audit Report** in PrathamOne EduOS.

---

## 1. Business Problem & Operational Imperative

Coaching institutes operate with high daily lecture density across multiple batches, subjects, and physical classrooms. Academic administrators and center heads face three critical operational challenges:
1. **Unplanned Faculty Absences & Proxy Assignments:** When a regular teacher is absent, substitute or proxy faculty take over. Without an auditable register, substitution rates remain invisible, causing billing disputes and payroll reconciliation delays.
2. **Scheduled vs. Delivered Variance:** Timetable entries represent *planned commitments*, whereas actual lectures may be conducted, cancelled, or rescheduled. Centers require auditable variance tracking.
3. **Payroll & Remuneration Verification:** Per-session faculty payouts require proof that a substitute lecture was authorized, conducted, and signed off before being processed into payroll batches.

---

## 2. Architecture & Data Model Harmonization

Adhering strictly to **RULE 001 (Single Source of Truth)** and **RULE 003 (No Duplicate Master Tables)**:
- **Canonical Person Master:** `User` (`app.models.user`) powers both the primary scheduled teacher (`teacher_user_id`) and the proxy teacher (`substitute_teacher_id`) via SQLAlchemy `aliased(User)`.
- **Session Execution Master:** `TeachingSession` (`app.models.teacher_payroll`) records actual conducted and proxy lectures, linked to `TimetableEntry` (`timetable_entry_id`), `Division` (`division_id`), `Subject` (`subject_id`), and `Standard` (`Division.standard_id`).
- **Audit Classification:**
  - `is_substituted: True` when `substitute_teacher_id` is populated or `session_status == "substitute_assigned"`.
  - Granular session statuses: `completed` (Conducted), `substitute_assigned` (Proxy Substituted), `cancelled` (Cancelled / Missed), `rescheduled`.
  - Payroll verification: `approval_status == "approved"`, `is_payable`, and `payroll_id`.

---

## 3. Backend Endpoint Implementation

**Route:** `GET /api/v1/reports/academic/timetable-execution-audit`  
**File:** `backend/app/api/v1/endpoints/reports.py`  
**Security:** Governed by `require_role(*REPORT_STAFF_ROLES)` and multi-tenant institution isolation via `resolve_report_institution_id`.

### Response Payload Structure:
```json
{
  "summary": {
    "total_sessions": 5,
    "conducted_count": 3,
    "substituted_count": 1,
    "cancelled_count": 1,
    "substitution_rate_pct": 20.0,
    "total_instruction_hours": 4.5,
    "approved_for_payroll_count": 4
  },
  "records": [
    {
      "id": 101,
      "session_code": "AUD-SES-202611-101",
      "session_date": "2026-11-22",
      "day_of_week": "Sunday",
      "scheduled_start_time": "08:30",
      "scheduled_end_time": "09:15",
      "time_slot": "08:30 - 09:15",
      "batch_name": "ICSE-IX",
      "batch_code": "ICSE-IX",
      "standard_name": "Standard IX",
      "subject_name": "Mathematics",
      "subject_code": "MATH-4",
      "scheduled_teacher_name": "Rahul Desai",
      "actual_teacher_name": "Rahul Desai",
      "is_substituted": false,
      "substitute_teacher_name": null,
      "session_status": "completed",
      "status_label": "Conducted",
      "approval_status": "approved",
      "duration_hours": 0.75,
      "room_number": "Room 101",
      "topic_taught": "Quadratic Equations — Ex 4.3 Factorization & Roots",
      "students_present": 26,
      "is_payable": true,
      "payroll_id": null
    }
  ]
}
```

---

## 4. Frontend Workspace & UI/UX Integration

**File:** `frontend/src/pages/Reports.tsx`  
**API Client:** `frontend/src/api/endpoints.ts` (`reportsApi.timetableExecutionAudit`)

### 4.1 Sleek Telemetry KPI Ribbon (RULE 014 Compliant)
Consolidated into a single-surface 6-metric summary ribbon:
- **Total Sessions:** Monospace dark numeric counter.
- **Conducted:** Pastel emerald tint (`bg-emerald-50/50`, `border-emerald-200/70`).
- **Proxy Substituted:** Pastel amber tint (`bg-amber-50/50`, `border-amber-200/70`).
- **Cancelled / Missed:** Pastel rose tint (`bg-rose-50/50`, `border-rose-200/70`).
- **Substitution Rate:** Indigo percentage badge (`X.X%`).
- **Instruction Hours:** Purple aggregate decimal hours (`X.Xh`).

### 4.2 Granular Contextual Filtering
- **Standard & Batch Filters:** Filter by cohort/division.
- **Date Range Pickers:** Start Date to End Date window.
- **Session Status Dropdown:** All Session Types, Conducted / Completed, Proxy Substituted, Cancelled / Missed, Rescheduled.

### 4.3 Governed ExcelReportGrid Table
- Columns: Date + Day of Week, Time Slot, Batch / Standard, Subject + Code, Scheduled Faculty, Delivered By (with bold amber `Proxy` badge), Execution Status (soft pill badges), Classroom, Duration (`X.Xh`), Topic Covered, and Payroll Approval Status.
- Summary Calculation Footer: Total Sessions and Aggregate Hours.
- Universal Export: Seamless 1-click Excel (`.xlsx`) and CSV (`.csv`) export with UTF-8 BOM encoding.

---

## 5. Verification & Governance Summary

- **Source Code Headers:** 100% compliant across 775 files (`python scripts/manage_headers.py check`).
- **Documentation Integrity:** 0 errors, 0 warnings across 736 indexed documents (`python tools/docs_manager.py validate`).
- **TypeScript & Vite Bundler:** Passed with zero compilation errors (`tsc && vite build`).
- **Docker Environment:** Production assets deployed to `prashant_academy_frontend` and `prashant_academy_backend` containers.
