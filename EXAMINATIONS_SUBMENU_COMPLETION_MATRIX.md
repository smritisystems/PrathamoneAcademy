# PRATHAMONE EDUOS — EXAMINATION CENTRE SUBMENU COMPLETION MATRIX

**Product:** PrathamOne EduOS  
**Edition:** Coaching Institute Edition  
**Version:** 1.0.0  
**Architect:** Jawahar R. Mallah  
**Organization:** AITDL — AI Technology & Development Lab  
**Date:** 2026-11-08  

---

## 1. Workspaces Implementation Summary

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

## 2. Key Features Implemented

- **Dedicated First-Class Routes:** Direct URLs registered in `App.tsx` (`/examinations/overview`, `/examinations/schedules`, `/examinations/marks-entry`, `/examinations/analytics`, `/examinations/report-cards`, `/examinations/papers`, `/examinations/settings`) and seamlessly linked in `Sidebar.tsx`.
- **URL Synchronization & Deep Linking:** Bidirectional synchronization between URL route pathname, tab navigation bar, browser back/forward buttons, and page refresh preservation.
- **Collapsible Sidebar Accordion:** Expandable Tests & Results menu with active indicator tracking across desktop expanded, compact icon rail flyout popovers, and mobile navigation drawer.
- **SSOT & Anti-Duplication Compliance:** 100% adherence to Rules 001–009. Utilizes canonical `examinationsApi`, `standardsApi`, and `academicYearsApi` endpoints without schema drift or duplicated business logic.
- **View-First Governance (Rule 010):** All mutating actions (`Schedule Examination`, `Save All Marks`, `Upload Blueprint`, `Save Grading Policies`) enforce safe locked states in default View Mode with explicit scoped Edit Mode unlocking.
- **Training Mode Isolation:** Displays prominent amber `TRAINING MODE` badge with data isolation verification when `useEnvironmentStore.isTrainingMode` is active.
- **Universal Print Engine Integration:** Batch print triggers for graphical student report cards with institute crest and QR authenticity tokens.
- **Visual Evidence:** High-resolution 1080p screenshots captured for all 7 workspaces (`screenshot_49` to `screenshot_55`).

---

## 3. Test Suite Verification

- `src/test/ExaminationsDedicatedSubmenus.test.tsx`: 8/8 tests passed
- `src/test/ExaminationsAndReportCards.test.tsx`: 3/3 tests passed
- `src/test/Sidebar.test.tsx`: 13/13 tests passed
- **Total Combined Suite:** 24/24 tests passed (100% green)

---

## 4. Visual Evidence Artifacts

1. `screenshot_49_examinations_overview.png` — Examinations Overview Workspace
2. `screenshot_50_examinations_schedules.png` — Exam Schedules & Timetable Workspace
3. `screenshot_51_examinations_marks_entry.png` — Marks Entry Centre Workspace
4. `screenshot_52_examinations_analytics.png` — Exam Performance Analytics Workspace
5. `screenshot_53_examinations_report_cards.png` — Report Cards & Transcripts Workspace
6. `screenshot_54_examinations_papers.png` — Question Papers & Blueprints Workspace
7. `screenshot_55_examinations_settings.png` — Examination Settings & Grading Scales Workspace
