---
title: "Printable Graphical Report Cards & Exam Analytics Implementation Report"
module: "08_EXAMINATION"
category: "IMPLEMENTATION-REPORT"
document_type: "REPORT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-06"
updated_date: "2026-11-06"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["examinations", "report-cards", "analytics", "grades", "leaderboard", "marks-sheet", "printing"]
entities: ["Examination", "ExamMarks", "Subject", "Standard", "Student", "Institution"]
api_routes: ["/api/v1/examinations/{id}/marks", "/api/v1/examinations/{id}/analytics", "/api/v1/examinations/{id}/report-card/{student_id}"]
related_modules: ["03_ACADEMIC_MANAGEMENT", "04_STUDENT_MANAGEMENT", "14_PRINTING_DOCUMENTS"]
---

# PRATHAMONE EduOS — PRINTABLE GRAPHICAL REPORT CARDS & EXAM ANALYTICS
## Module Implementation & Verification Report (v1.0.0)

**Product:** PrathamOne EduOS  
**Edition:** Coaching Institute Edition  
**Module:** 08_EXAMINATION (Examinations, Analytics & Printable Report Cards)  
**Product Architect:** Jawahar R Mallah  
**Organization:** AITDL — AI Technology & Development Lab  
**Policy Status:** FULLY COMPLIANT — SSOT & ANTI-DUPLICATION STRICTLY ENFORCED  

---

## 1. EXECUTIVE SUMMARY

The Printable Graphical Report Cards and Exam Analytics module has been successfully implemented and verified for **PrathamOne EduOS** (Coaching Institute Edition v1.0.0).

This module enables coaching institutes, faculty members, and academic administrators to:
1. Schedule examinations, unit tests, mid-terms, and competitive mock test series (JEE/NEET).
2. Enter and bulk update student marks obtained across all standard subjects via a responsive grid interface.
3. Automatically calculate standardized percentage marks, 6-tier grades (`A+`, `A`, `B`, `C`, `D`, `F`), pass/fail statuses, and handle absentee candidates (`AB`).
4. Generate comprehensive real-time exam analytics including candidate appearance rate, class pass percentage, score distribution across letter grades, subject averages with highest/lowest benchmarks, and a top-performer merit leaderboard.
5. Render and print high-fidelity, A4-formatted, official academic report cards with institute crest/branding, demographic credentials, subject performance meters, consolidated results, class ranking, and dual signature blocks.

---

## 2. ARCHITECTURAL SSOT COMPLIANCE

Per **RULE 001** and **RULE 002** of the Single Source of Truth directive, zero duplicate tables or redundant database entities were introduced:
- **Canonical Master Tables Leveraged:**
  - `examinations`: Authoritative exam definition master.
  - `exam_marks`: Authoritative transactional marks storage linking examination, student, and subject.
  - `subjects`: Authoritative subject master with curriculum codes and credit weights.
  - `students`: Canonical student master with roll numbers and admission numbers.
  - `institutions`: Authoritative institute metadata for crests, tags, phone, and addresses.
- **Domain Service Single Responsibility:**
  - All calculation logic (percentages, letter grading, pass criteria, class averages, rank ordering) is isolated in `backend/app/services/exam_reports.py`. The frontend never duplicates persistence calculation logic.

---

## 3. IMPLEMENTED COMPONENTS & API ROUTES

### 3.1 Backend Domain Service (`backend/app/services/exam_reports.py`)
- `calculate_grade(marks, max_marks)`: Standardized 6-tier grading scale ($\ge 90\% \rightarrow \text{A+}$, $\ge 80\% \rightarrow \text{A}$, $\ge 70\% \rightarrow \text{B}$, $\ge 60\% \rightarrow \text{C}$, $\ge 35\% \rightarrow \text{D}$, $< 35\% \rightarrow \text{F}$).
- `get_exam_marks_sheet(db, exam_id)`: Assembles comprehensive matrix of enrolled students, curriculum subjects, and existing marks/grades.
- `save_exam_marks_bulk(db, exam_id, entries)`: Performs idempotent upsert of marks, absent flags, and teacher remarks.
- `get_exam_analytics(db, exam_id)`: Aggregates class average, pass/fail counts, grade distribution histograms, subject-wise metrics, and top 5 merit rankings.
- `get_student_report_card(db, exam_id, student_id, institution_id)`: Generates full transcript payload with institute identity, subject performance bars, aggregate results, and class rank.

### 3.2 REST API Endpoints (`backend/app/api/v1/endpoints/examinations.py`)
- `GET /api/v1/examinations/{exam_id}/marks`: Fetches standard subjects and enrolled student marks sheet.
- `POST /api/v1/examinations/{exam_id}/marks`: Saves marks and absentee statuses in bulk.
- `GET /api/v1/examinations/{exam_id}/analytics`: Returns aggregate statistics and leaderboard.
- `GET /api/v1/examinations/{exam_id}/report-card/{student_id}`: Returns official student transcript.

### 3.3 Frontend Client & UI Components
- `frontend/src/api/endpoints.ts`: Added typed API methods to `examinationsApi`.
- `frontend/src/types/index.ts`: Typed interfaces `ExamMarksSheet`, `ExamAnalyticsData`, `StudentReportCardData`.
- `frontend/src/components/ReportCardModal.tsx`:
  - Official transcript modal with printable A4 formatting (`@media print`).
  - Progress meter bars with dynamic color gradients (Emerald $\ge 80\%$, Blue $\ge 60\%$, Amber $\ge 35\%$, Rose $< 35\%$).
  - Consolidated KPI cards (Total Marks, Percentage, Grade, Class Rank `#X of N`, Result).
  - Class Teacher and Principal / Exam Controller signature endorsements.
- `frontend/src/pages/Examinations.tsx`:
  - Upgraded table actions with "Marks" and "Analytics" quick triggers.
  - Interactive Marks Entry grid supporting fast keyboard entry, `AB` checkbox, and inline validation.
  - Performance Analytics dashboard featuring grade breakdown bars, subject metrics, and merit leaderboard with direct "View Report" actions.

---

## 4. VERIFICATION & TEST RESULTS

### 4.1 Backend Pytest Suite (`backend/tests/test_examinations_and_report_cards.py`)
- `test_exam_marks_entry_and_analytics`: Verified bulk marks recording, score upsert, pass percentage calculation, and top 5 leaderboard generation.
- `test_student_report_card_generation`: Verified transcript generation with subject performance bars, rank determination, and institute headers.
- **Result:** `2 passed, 2 warnings in 9.63s` (100% pass rate).

### 4.2 Frontend Vitest Suite (`frontend/src/test/ExaminationsAndReportCards.test.tsx`)
- `renders student report card modal with transcript details, marks table, and summary`: Passed.
- `renders examinations list with action buttons for marks entry and analytics`: Passed.
- `opens marks entry sheet and analytics drawer properly`: Passed.
- **Result:** `3 passed in 634ms` (100% pass rate).

---

## 5. REPOSITORY HEALTH & COMPLIANCE VERIFICATION

1. **Header Verification:**
   All newly created and modified files maintain the corporate attribution header for Jawahar R. Mallah & AITDL:
   - `backend/app/services/exam_reports.py`
   - `backend/app/api/v1/endpoints/examinations.py`
   - `backend/tests/test_examinations_and_report_cards.py`
   - `frontend/src/components/ReportCardModal.tsx`
   - `frontend/src/pages/Examinations.tsx`
   - `frontend/src/test/ExaminationsAndReportCards.test.tsx`
   - `frontend/src/api/endpoints.ts`
   - `frontend/src/types/index.ts`
2. **Documentation Management Engine:**
   Reindexed and validated via `python tools/docs_manager.py reindex && python tools/docs_manager.py validate`.
