---
title: "Examinations Multi-Curriculum Grading Scales & Batch Dossier Export Report"
module: "08_EXAMINATION"
category: "FEATURE-REPORT"
document_type: "REPORT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-13"
updated_date: "2026-11-13"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["examinations", "grading_scales", "cbse", "icse", "state_board", "report_cards", "batch_dossier", "gpa"]
entities: ["Examination", "ExamMark", "InstitutionSetting", "Student"]
api_routes: ["/api/v1/examinations/settings/policies", "/api/v1/examinations/{exam_id}/report-cards-batch", "/api/v1/examinations/{exam_id}/report-card/{student_id}", "/api/v1/examinations/cumulative/student/{student_id}"]
related_modules: ["04_STUDENT_MANAGEMENT", "03_ACADEMIC_MANAGEMENT", "14_PRINTING_DOCUMENTS"]
---

# Examinations Multi-Curriculum Grading Scales & Batch Dossier Export Report

## 1. Executive Summary

This enhancement modernizes the **PrathamOne EduOS** Examinations & Evaluation Engine by delivering:
1. **Multi-Curriculum Grading Scales:** Built-in dynamic support for **CBSE 9-Point Scale (A1–E2 with Grade Points 10.0–0.0)**, **ICSE Numerical Percentage (1–9 bands)**, **State Board Classification (Distinction / First / Second / Pass / Fail)**, and the traditional **Standard 6-Point Scale (A+ to F)**.
2. **Dynamic GPA & Grade Computation:** Recalculates grade points, letter grades, and cumulative Grade Point Average (GPA) in real-time according to the institution's or selected curriculum's official scale.
3. **Cohort Batch Report Cards Dossier:** A unified batch export feature aggregating cohort statistics (toppers leaderboard, pass rates, grade distribution, subject benchmarks) alongside complete candidate transcripts ready for batch printing.
4. **Cumulative Academic Progression Tracking:** Aggregates multi-exam trajectories across terms in an academic year for any enrolled candidate.
5. **Institution Policy Management:** Configurable passing marks, grace mark moderation policies, and rank tie-breaker rules stored in `InstitutionSetting` under View-First and Edit Mode governance.

---

## 2. Architecture & SSOT Implementation

### 2.1 Backend Domain Services (`backend/app/services/exam_reports.py`)
- **`GRADING_SCALES` Registry:** Canonical definition of grade bands, percentage ranges, grade points, and labels.
- **`calculate_grade(marks, max_marks, scale)`:** Pure function mapping percentage scores to curriculum grades.
- **`get_grade_point(grade, scale)`:** Resolves numeric grade points for GPA computation.
- **`get_student_report_card(...)`:** Enhanced with `scale` parameter; loads institution policy default when scale is omitted, and computes subject-wise GP and overall GPA.
- **`get_batch_report_cards(...)`:** Compiles a full class cohort dossier including cohort KPIs and student report cards.
- **`get_cumulative_term_report(...)`:** Compiles year-to-date assessment history for longitudinal academic monitoring.

### 2.2 REST API Endpoints (`backend/app/api/v1/endpoints/examinations.py`)
- `GET /api/v1/examinations/settings/policies` — Fetches active grading policy and available scales.
- `POST /api/v1/examinations/settings/policies` — Updates policy settings (requires active Edit Mode and staff role).
- `GET /api/v1/examinations/{exam_id}/report-cards-batch` — Returns batch cohort dossier with optional curriculum scale and division filters.
- `GET /api/v1/examinations/cumulative/student/{student_id}` — Returns cumulative term trajectory across academic year.
- `GET /api/v1/examinations/{exam_id}/report-card/{student_id}?scale=...` — Returns individual report card under selected scale.

### 2.3 Frontend UI & Component Integration
- **`ReportCardModal.tsx`:** Added curriculum scale switcher, scale metadata badge, GPA indicator, and dynamic scale threshold legend.
- **`Examinations.tsx`:**
  - Added curriculum grading scale dropdown to `Report Cards` tab.
  - Added `Print All Report Cards (Dossier)` action opening the comprehensive cohort batch dossier.
  - Added interactive policy configuration panel in `Exam Policies & Moderation` tab with live threshold tables, grace marks policy, and tie-breaker algorithms.
- **`endpoints.ts` & `types/index.ts`:** Full TypeScript typing for policies, scales, batch dossiers, and cumulative progression.

---

## 3. Verification & Test Coverage

- **Backend Pytest (`backend/tests/test_examinations_and_report_cards.py`):**
  - Verified pure grade calculation across all 4 scales.
  - Verified CBSE 9-Point GPA calculation (88.25% -> A2, 9.0 GP).
  - Verified cohort analytics, batch report card dossier, and cumulative term reports.
  - Verified policy retrieval and update via authenticated HTTP client.
  - **Result:** 2 passed, 0 failures.
- **Frontend Vitest (`frontend/src/test/ExaminationsAndReportCards.test.tsx` & `ExaminationsDedicatedSubmenus.test.tsx`):**
  - Verified report card rendering with CBSE 9-point scale and GPA.
  - Verified batch report card dossier modal opening and rendering.
  - Verified all 7 dedicated examination submenus under View-First mode.
  - **Result:** 13 passed, 0 failures.
- **TypeScript Check:** `npx tsc --noEmit` passed with 0 errors.
- **Header Attribution:** `python scripts/manage_headers.py check` passed with 100% compliance across 588 files.

