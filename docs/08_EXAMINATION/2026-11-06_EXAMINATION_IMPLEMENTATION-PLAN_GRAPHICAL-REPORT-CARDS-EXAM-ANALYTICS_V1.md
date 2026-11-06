---
title: "Printable Graphical Report Cards & Exam Analytics Implementation Plan"
module: "08_EXAMINATION"
category: "IMPLEMENTATION-PLAN"
document_type: "PLAN"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-06"
updated_date: "2026-11-06"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Draft"
tags: ["examinations", "report-cards", "analytics", "marks-entry", "coaching-edition", "print"]
entities: ["Examination", "ExamMark", "Subject", "Student", "Institution", "Standard"]
api_routes: ["/api/v1/examinations/{exam_id}/marks", "/api/v1/examinations/{exam_id}/analytics", "/api/v1/examinations/{exam_id}/report-card/{student_id}"]
related_modules: ["04_STUDENT_MANAGEMENT", "07_ATTENDANCE", "14_PRINTING_DOCUMENTS"]
---

# Printable Graphical Report Cards & Exam Analytics — Implementation Plan

**Product:** PrathamOne EduOS  
**Edition:** Coaching Institute Edition  
**Baseline Version:** 1.0.0  
**Module:** 08_EXAMINATION  
**Product Architect:** Jawahar R Mallah  
**Organization:** AITDL — AI Technology & Development Lab  

---

## 1. OBJECTIVE & ARCHITECTURAL SCOPE

The objective of **Module 3** is to provide coaching institutes with an enterprise-grade examination assessment, performance analytics, and official report card printing system.

Key deliverables:
1. **Interactive Marks Entry & Grade Calculation:**
   - Multi-subject scoring matrix with automatic percentage and grading calculations (`A+`, `A`, `B`, `C`, `D`, `F`).
   - Absentee handling and customized teacher remarks.
2. **Examination Performance Analytics & Leaderboards:**
   - Cohort pass rates, average marks, highest/lowest scores, subject-wise performance distribution.
   - Top performers leaderboard (Rank 1, 2, 3) and grade frequency breakdown.
3. **Official Printable Graphical Report Cards (A4 Layout):**
   - Official institute branding, student demographics, roll number, batch, and photo.
   - Comprehensive subject marks table with graphical score meters, class rank, total percentage, and final result.
   - Attendance correlation and authorized signatory blocks.
   - Single-student and batch class print capabilities.

---

## 2. SSOT & ANTI-DUPLICATION COMPLIANCE

In strict adherence to Platform SSOT Directives:
- **Canonical Master Entities:** Reuses existing `examinations`, `exam_marks`, `subjects`, `standards`, and `students` tables.
- **No Duplicate Grading Masters:** Calculates grades using centralized domain service logic (`backend/app/services/exam_reports.py`).
- **No Parallel APIs:** Extends the existing `/api/v1/examinations/` REST router.

---

## 3. IMPLEMENTATION WORKFLOW

### Phase 1: Backend Domain Service (`backend/app/services/exam_reports.py`)
- Standard grading scale calculator:
  - $\ge 90\% \rightarrow \text{A+}$
  - $\ge 80\% \rightarrow \text{A}$
  - $\ge 70\% \rightarrow \text{B}$
  - $\ge 60\% \rightarrow \text{C}$
  - $\ge 35\% \rightarrow \text{D}$
  - $< 35\% \rightarrow \text{F (Fail)}$
- `save_bulk_marks`: Batch upserts marks records into `exam_marks`.
- `compute_exam_analytics`: Computes cohort KPIs, subject averages, and class rankings.
- `generate_student_report_card`: Compiles comprehensive single and batch report card datasets.

### Phase 2: REST API Endpoints (`backend/app/api/v1/endpoints/examinations.py`)
- `GET /api/v1/examinations/{exam_id}/marks`: Retrieves marks entry sheet.
- `POST /api/v1/examinations/{exam_id}/marks`: Commits bulk marks.
- `GET /api/v1/examinations/{exam_id}/analytics`: Retrieves cohort analytics and leaderboard.
- `GET /api/v1/examinations/{exam_id}/report-card/{student_id}`: Retrieves single student report card.
- `GET /api/v1/examinations/{exam_id}/report-cards`: Retrieves class batch report cards.

### Phase 3: Frontend Report Card & Analytics Workspace
- Create `frontend/src/components/ReportCardModal.tsx`: Official A4 report card modal with print CSS.
- Upgrade `frontend/src/pages/Examinations.tsx`:
  - Tab 1: Scheduled Examinations (with Enter Marks, Analytics, Print Report Card actions).
  - Tab 2: Marks Entry Sheet (live grid with autosave).
  - Tab 3: Performance Analytics Dashboard (visual charts and toppers).

### Phase 4: Automated Testing & Verification
- Backend pytest: `backend/tests/test_examinations_and_report_cards.py`.
- Frontend vitest: `frontend/src/test/ExaminationsAndReportCards.test.tsx`.
- Attribution & Header Compliance: `python scripts/manage_headers.py check`.
- Documentation Reindex: `python tools/docs_manager.py reindex && validate`.

