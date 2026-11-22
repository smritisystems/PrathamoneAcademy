---
title: "Timetable Schedule Status Reporting Feasibility & NEP 2020 UI Alignment Report"
module: "03_ACADEMIC_MANAGEMENT"
category: "FEASIBILITY-REPORT"
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
tags: ["timetable", "reports", "nep2020", "scheduling", "status-tracking"]
entities: ["TimetableEntry", "TeachingSession", "Division", "Standard", "User"]
api_routes: ["/api/v1/reports/academics/timetable-utilization", "/api/v1/teacher-payroll/sessions"]
related_modules: ["06_TEACHER_PAYROLL", "11_REPORTS_EXPORTS", "17_UI_UX_DESIGN"]
---

# Timetable Schedule Status Reporting Feasibility & NEP 2020 UI Alignment Report

## 1. Executive Summary

This report evaluates institutional requirements for **Timetable Schedule Status & Execution Audit Reporting** within PrathamOne EduOS (Coaching Institute Edition), scores its operational weight, and records the deployment of lightweight **NEP 2020 Alignment UI components** across the application.

---

## 2. Forensic Analysis: Existing Timetable Reporting vs. Status Requirements

### 2.1 Existing Capabilities
1. **Timetable Room & Batch Utilization Report (`Reports.tsx`):**
   - Summarizes planned classroom allocations, weekday spread, and weekly period counts.
2. **Faculty Teaching Load Audit (`Reports.tsx`):**
   - Summarizes weekly instructional hours and batch assignments per teacher.
3. **Interactive Timetable Studio (`AcademicWorkspace.tsx`):**
   - Real-time weekly matrix with collision shield, upcoming session radar, and printable dockets.
4. **Conducted Teaching Sessions Ledger (`TeacherManagement.tsx` & `TeacherPayroll.tsx`):**
   - Granular session-by-session approval workflow (`pending`, `approved`, `rejected`, `completed`, `cancelled`) driving lecture-rate payroll.

### 2.2 Operational Gap: The Need for Schedule Execution Audit
While the system maintains scheduled timetable slots and payroll teaching sessions, coaching operations require an integrated report answering:
- **Planned vs. Delivered Hours:** Did Standard 10-A receive the 4 hours of Mathematics scheduled this week?
- **Proxy / Substitution Traceability:** When regular faculty was on leave, who substituted the lecture?
- **Room Contention History:** Was a batch relocated due to sudden room maintenance or split lectures?

---

## 3. Weight & Priority Rating Matrix

```
┌──────────────────────────────────────────────────────────┬──────────┬──────────────┐
│ Evaluation Dimension                                     │ Weight   │ Tier Level   │
├──────────────────────────────────────────────────────────┼──────────┼──────────────┤
│ 1. Financial & Teacher Payroll Reconciliation            │ 9.5 / 10 │ Critical     │
│ 2. Institute Day-to-Day Operational Execution            │ 9.0 / 10 │ High Core    │
│ 3. Parent & Student Friction Reduction (Proxy Awareness) │ 8.5 / 10 │ High Core    │
│ 4. Board Syllabus Contact-Hour Compliance                │ 8.0 / 10 │ Strategic    │
│ 5. Classroom Space ROI & Room Vacancy Minimization       │ 8.8 / 10 │ High Core    │
├──────────────────────────────────────────────────────────┼──────────┼──────────────┤
│ COMPOSITE WEIGHT RATING                                  │ 8.8 / 10 │ TIER-1 CORE  │
└──────────────────────────────────────────────────────────┴──────────┴──────────────┘
```

**Recommendation:** Rated as a **Tier-1 Core Operational Requirement (8.8/10)**. Should be scheduled for implementation as a dedicated Excel-exportable report in `Reports.tsx`.

---

## 4. NEP 2020 Lightweight UI Announcement Implementation

To provide immediate marketing visibility without promising features before their release or altering the database schema, three lightweight components were deployed:

1. **Login Page Trust Banner (`Login.tsx`):**
   - Displays "NEP 2020 Aligned" badge and "Built for the Future of Coaching — NEP 2020 Ready" copy.
   - Interactive `Upcoming Features` pill button triggering the roadmap modal.
2. **Admin Dashboard Info Card (`Dashboard.tsx`):**
   - Dismissible announcement card with `View Roadmap` and `Notify Me When Live` buttons.
   - Persistent subscription state saved in browser local storage.
3. **Top Navbar Header Pill (`Layout.tsx`):**
   - Royal amber pill in header (`NEP 2020 Updates`) for universal access from any workspace.
4. **Roadmap Milestone Modal (`NepRoadmapModal.tsx`):**
   - Highlights 3 core innovations:
     - 01: Competency-Based Test Analytics (Bloom's taxonomy mastery rubrics)
     - 02: Cross-Stream Modular Batching (Multi-disciplinary enrollments)
     - 03: APAAR ID & Academic Credit Bank Support (NCrF standards alignment)
