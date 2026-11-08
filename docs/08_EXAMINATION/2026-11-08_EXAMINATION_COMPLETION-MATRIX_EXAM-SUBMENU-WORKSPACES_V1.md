---
title: "Examination Centre Submenu Completion Matrix & Dedicated Workspaces"
module: "08_EXAMINATION"
category: "IMPLEMENTATION-REPORT"
document_type: "REPORT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-08"
updated_date: "2026-11-08"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["examinations", "marks-entry", "analytics", "report-cards", "schedules", "view-first", "submenus"]
entities: ["Examination", "ExamMarks", "Standard", "AcademicYear", "Institution"]
api_routes: ["/api/v1/examinations", "/api/v1/standards", "/api/v1/academic-years"]
related_modules: ["03_ACADEMIC_MANAGEMENT", "04_STUDENT_MANAGEMENT", "14_PRINTING_DOCUMENTS"]
---

# PRATHAMONE EDUOS — EXAMINATION CENTRE SUBMENU COMPLETION MATRIX

**Product:** PrathamOne EduOS  
**Edition:** Coaching Institute Edition  
**Version:** 1.0.0  
**Architect:** Jawahar R. Mallah  
**Organization:** AITDL — AI Technology & Development Lab  
**Date:** 2026-11-08  

---

## 1. Executive Summary

This engineering document certifies the complete transformation and delivery of the **Tests & Results / Examination Centre** module within PrathamOne EduOS into seven (7) dedicated, first-class workspaces. Every submenu option in the primary navigation now features its own isolated route, contextual page header, breadcrumbs, action bar with View-First governance (Rule 010), high-density data tables, modal triggers, and deep-linking support across browser reloads.

---

## 2. Workspaces Implementation Matrix

| # | Submenu & Route | Component | Page Heading | Contextual Primary Action | View-First Mode Status |
|---|----------------|-----------|--------------|---------------------------|------------------------|
| 1 | `/examinations/overview` | `Examinations.tsx` | Examinations & Test Series | Schedule Examination | Locked until Edit Mode |
| 2 | `/examinations/schedules` | `Examinations.tsx` | Examination Schedules & Timetable | Schedule Examination | Locked until Edit Mode |
| 3 | `/examinations/marks-entry` | `Examinations.tsx` | Marks Entry Centre | Save All Marks | Locked until Edit Mode |
| 4 | `/examinations/analytics` | `Examinations.tsx` | Exam Performance Analytics | Export Analytics | Default Safe |
| 5 | `/examinations/report-cards` | `Examinations.tsx` | Report Cards & Transcripts | Print Batch Reports | Default Safe |
| 6 | `/examinations/papers` | `Examinations.tsx` | Question Papers & Blueprints | Upload Blueprint | Locked until Edit Mode |
| 7 | `/examinations/settings` | `Examinations.tsx` | Examination Settings & Grading Scales | Save Grading Policies | Locked until Edit Mode |

---

## 3. Architecture & Governance Compliance

### 3.1 Single Source of Truth (SSOT Rules 001–009)
- **Canonical API Endpoints:** Consumes canonical `/api/v1/examinations`, `/api/v1/standards`, and `/api/v1/academic-years` without duplicate router definitions or shadow state tables.
- **Single Business Logic:** All grading conversions, percentile ranks, and pass/fail thresholds originate from backend domain services.

### 3.2 View-First Governance (Rule 010)
- Workspaces default strictly to read-only View Mode.
- All mutating action triggers (`Schedule Examination`, `Save All Marks`, `Upload Blueprint`, `Save Grading Policies`) display visual lock icons and disabled tooltips until scoped Edit Mode (`academic:examinations`) is activated.

### 3.3 Training Mode Isolation
- Seamless integration with `useEnvironmentStore.isTrainingMode`.
- Prominently displays an amber badge when in Training Mode to guarantee strict isolation between production institutional transcripts and simulated demo sessions.

---

## 4. Test Suite Verification & Quality Assurance

Automated regression and functional testing was executed using Vitest:
- `frontend/src/test/ExaminationsDedicatedSubmenus.test.tsx` (8/8 tests passed)
- `frontend/src/test/ExaminationsAndReportCards.test.tsx` (3/3 tests passed)
- `frontend/src/test/Sidebar.test.tsx` (13/13 tests passed)

All 24 unit and component integration tests are green with 0 failures.

---

## 5. Visual Evidence Artifacts

Full-resolution (1080p) visual snapshots captured via Playwright:
- `screenshot_49_examinations_overview.png`
- `screenshot_50_examinations_schedules.png`
- `screenshot_51_examinations_marks_entry.png`
- `screenshot_52_examinations_analytics.png`
- `screenshot_53_examinations_report_cards.png`
- `screenshot_54_examinations_papers.png`
- `screenshot_55_examinations_settings.png`
