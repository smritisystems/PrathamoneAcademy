---
title: "Students & Admissions Centre Submenu Completion Matrix & Dedicated Workspaces"
module: "04_STUDENT_MANAGEMENT"
category: "IMPLEMENTATION-REPORT"
document_type: "REPORT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-09"
updated_date: "2026-11-09"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["students", "admissions", "submenus", "workspaces", "ssot", "view-first", "id-cards", "allocations"]
entities: ["Student", "Enrollment", "Standard", "Division", "StudentIdCard", "AdmissionSettings"]
api_routes: ["/api/v1/students/", "/api/v1/enrollments/", "/api/v1/standards/", "/api/v1/divisions/", "/api/v1/settings/"]
related_modules: ["03_ACADEMIC_MANAGEMENT", "07_ATTENDANCE", "08_EXAMINATION", "09_FEES_PAYMENTS"]
---

# PRATHAMONE EDUOS — STUDENTS & ADMISSIONS SUBMENU COMPLETION MATRIX

**Product:** PrathamOne EduOS  
**Edition:** Coaching Institute Edition  
**Version:** 1.0.0  
**Architect:** Jawahar R. Mallah  
**Organization:** AITDL — AI Technology & Development Lab  
**Date:** 2026-11-09  

---

## 1. Executive Summary

In full compliance with the PrathamOne EduOS AI Agent Directive, all Students & Admissions submenu links have been transformed from generic placeholders into 8 dedicated, fully functional workspaces. Every submenu has its own canonical route, dedicated view content, context-specific filters and primary actions, responsive desktop/tablet/mobile layouts, and strict Rule 010 View-First governance.

---

## 2. Workspaces Implementation Summary

| # | Submenu & Route | Component | Page Heading | Contextual Primary Action | View-First Mode Status |
|---|----------------|-----------|--------------|---------------------------|------------------------|
| 1 | `/students/overview` | `Students.tsx` | Student Enrolment & Operations Overview | New Admission | Locked until Edit Mode |
| 2 | `/students/directory` | `Students.tsx` | Master Student Directory & Register | New Admission | Locked until Edit Mode |
| 3 | `/students/admission` | `Students.tsx` | New Student Admission & KYC Application | Submit Admission | Locked until Edit Mode |
| 4 | `/students/allocations` | `Students.tsx` | Batch & Division Allocations | Allocate Batches | Locked until Edit Mode |
| 5 | `/students/id-cards` | `Students.tsx` | Student ID Cards & Biometric Credentials | Print Batch ID Cards | Default Safe Action |
| 6 | `/students/history` | `Students.tsx` | Disciplinary & Activity Audit History | Export Audit Log | Default Safe Action |
| 7 | `/students/reactivation` | `Students.tsx` | Inactive, Exited & Reactivation Centre | Reactivate Student | Locked until Edit Mode |
| 8 | `/students/settings` | `Students.tsx` | Student Admission Policies & Settings | Save Admission Policies | Locked until Edit Mode |

---

## 3. Architecture & Governance Compliance

### 3.1 SSOT & Anti-Duplication Enforcement (Rules 001–009)
- **Canonical Person & Student Master:** Uses `students` and `users` as canonical entities without duplicate tables.
- **Unified Services & REST Routers:** All operations interact directly with `/api/v1/students/`, `/api/v1/enrollments/`, `/api/v1/standards/`, `/api/v1/divisions/`, and `/api/v1/settings/`.
- **Reusable Modals & Shared Elements:** Existing `StudentExitModal`, `StudentReactivateModal`, `StudentIDCardModal`, and `EditModeBar` are fully reused across the workspaces.

### 3.2 Global View-First & Scoped Edit Mode (Rule 010)
- View Mode is the mandatory default across all 8 submenus.
- Mutating actions (`New Admission`, `Submit Admission`, `Assign Division`, `Reactivate Student`, `Save Admission Policies`) render in locked states with clear visual lock badges. Clicking them displays guidance toasts instructing the user to activate Edit Mode.
- Edit Mode requires explicit user activation scoped to `students:master`.

### 3.3 Training Mode Isolation
- Detects the active environment state via `useEnvironmentStore`.
- Displays an amber `TRAINING MODE ACTIVE` badge with sandbox identity verification when active.

---

## 4. Verification & Testing Results

All 7 relevant test suites execute with 100% green status across 55 tests:
1. `src/test/StudentDedicatedSubmenus.test.tsx`: 12/12 passed
2. `src/test/StudentIDCardAndScanner.test.tsx`: 3/3 passed
3. `src/test/StudentLifecycle.test.tsx`: 6/6 passed
4. `src/test/StudentPortal.test.tsx`: 4/4 passed
5. `src/test/StudentProfileEdit.test.tsx`: 7/7 passed
6. `src/test/Sidebar.test.tsx`: 13/13 passed
7. `src/test/TeacherDedicatedSubmenus.test.tsx`: 10/10 passed

---

## 5. Visual Evidence Artifacts

The following high-resolution 1080p visual evidence screenshots were captured and verified:
1. `screenshot_72_students_overview.png` — Student Enrolment Overview Workspace
2. `screenshot_73_students_directory.png` — Master Student Directory Workspace
3. `screenshot_74_students_admission.png` — New Admission & KYC Application Workspace
4. `screenshot_75_students_allocations.png` — Batch & Division Allocations Workspace
5. `screenshot_76_students_id_cards.png` — Student ID Cards & Biometric Badges Workspace
6. `screenshot_77_students_history.png` — Disciplinary & Activity History Workspace
7. `screenshot_78_students_reactivation.png` — Reactivation & Archive Workspace
8. `screenshot_79_students_settings.png` — Admission Policies & Settings Workspace
