---
title: "Release Notes v1.87.0 — Homework & Assignment Management Enhancement"
module: "19_RELEASES_CHANGELOG"
category: "CHANGELOG"
document_type: "CHANGELOG"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.87.0"
doc_version: "1.0"
created_date: "2026-11-12"
updated_date: "2026-11-12"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["releases", "v1.87.0", "homework", "assignments", "submissions", "evaluation", "notifications", "governance"]
entities: ["HomeworkAssignment", "StudentHomeworkRecord", "HomeworkAuditLog", "HomeworkFile", "CommunicationLog"]
api_routes: ["/api/v1/homework", "/api/v1/students"]
related_modules: ["03_ACADEMIC_MANAGEMENT", "04_STUDENT_MANAGEMENT", "05_TEACHER_MANAGEMENT", "11_REPORTS_EXPORTS", "19_RELEASES_CHANGELOG"]
---

# Release Notes — PrathamOne EduOS v1.87.0

**Product:** PrathamOne EduOS (Coaching Institute Edition)  
**Release Title:** Staging / Release Candidate v1.87.0 — Homework & Assignment Management Enhancement  
**Release Date:** 2026-11-12  
**Build Identifier:** `2026.11.12-REV-158-v1.87.0-EB97155`  
**Git Branch / Base Commit:** `master` / `eb97155`  
**Database Schema Head:** `045_homework_enhancement (head)`  
**Target Environment:** Staging / Local Docker Verification (not auto-published to external customer production)  
**Product Architect:** Jawahar R. Mallah  
**Organization:** AITDL — AI Technology & Development Lab

---

## 1. Executive Summary

Release **v1.87.0** increments the application version (`1.76.0` -> `1.87.0`, minor feature release synchronized via `scripts/auto_version.py`) to deliver the complete **Homework & Assignment Management Enhancement** across Backend, Database, Teacher Workspace, Student Portal, Notifications, Reporting, RBAC, and Docker deployment configuration.

---

## 2. Key Features & Technical Changes

### 2.1 Database Schema & RBAC (`045_homework_enhancement`)
- Added snapshot & policy columns on `homework_assignments`: `original_recipient_count`, `late_joiner_policy` (`manual`, `auto_include`, `exclude`), `estimated_duration_minutes`, `published_at`, `published_by_id`, `closed_at`.
- Added recipient-level governance & versioning columns on `student_homework_records`: `custom_due_date`, `custom_instructions`, `custom_attachments`, `is_late_addition`, `addition_reason`, `viewed_at`, `submission_version`, `submission_history`, `teacher_feedback_attachments`, `evaluation_history`.
- Added canonical secure upload metadata table `homework_files` (MIME type, extension, byte size, SHA-256 checksum, uploader, context, assignment/record foreign keys).
- Seeded separated `homework:*` RBAC permissions (`homework:view`, `homework:create`, `homework:edit`, `homework:publish`, `homework:evaluate`, `homework:delete`, `homework:reports`, `homework:settings`, `homework:manage_all`).

### 2.2 Backend Services & Endpoints (`/api/v1/homework`)
- **Creation, Preview & Lifecycle:** Live recipient preview (`/recipients/preview`), student search (`/students/search`), draft save & publish (`/assignments/{id}/publish`), close/reopen lifecycle, and manual/automatic late-joiner sync (`/sync-late-joiners` + `students.py` enrollment hooks preserving `original_recipient_count` and transfer history).
- **Secure Attachments & Submissions:** Multipart file upload (`/files/upload`) and access-controlled download (`/files/{file_id}/download`) enforcing administrator-configured extensions, MIME allowlist, size limit (`max_file_size_mb`), and tenant/student isolation, backed by a dedicated Docker named volume (`homework_uploads:/app/uploads`).
- **Evaluation & State Integrity:** Backend-validated state transitions, non-destructive `submission_history` & `evaluation_history`, `marks_obtained <= max_marks` validation, and teacher feedback attachments.
- **Notifications & Analytics:** Deduplicated `IN_APP` notifications via `CommunicationLog` (`HW_%` event keys), reminder sweep (`/reminders/run`), 7-KPI Teacher Dashboard, 6-KPI Student Dashboard (`/dashboards/student`), Batch Report (`/reports/batch/{assignment_id}`), and DB-derived Institute Analytics (`/reports/analytics`).

### 2.3 Frontend UI & Workspace Consolidation
- **Teacher Workspace Integration:** Added `Teacher Workspace -> Homework & Assignments` quick-launch card in `TeacherManagement.tsx` (6 primary action links) and direct studio link in `TeacherPayroll.tsx`.
- **Modular Homework Studio (`HomeworkWorkspace.tsx`):** Refactored into `HomeworkCreateForm.tsx`, `HomeworkSubmissionsTab.tsx`, `HomeworkTemplatesTab.tsx`, and `HomeworkReportsAndSettingsTab.tsx` under Rule 010 View-First Edit Mode governance, with Excel (`.xlsx`) & CSV export via `write-excel-file`.
- **Student Portal (`StudentDashboard.tsx`):** Extended `My Homework` tab with 6 student KPI cards, unread `HW_%` notification banner, downloadable homework/feedback attachments, auto `markViewed`, real file upload controls, and submission version history.

---

## 3. Verification Sign-Off

- **Backend Pytest Suite:** `21 passed, 2 warnings` across `test_homework_system.py`, `test_homework_enhancement_e2e.py`, `test_p0_security_lockdown.py`, `test_p1_security_hardening.py`, and `test_p2_session_and_ssot.py`.
- **Frontend Vitest Suite:** `64 passed (64)` test files, `499 passed (499)` tests.
- **TypeScript & Production Build:** `npx tsc --noEmit` (`0` errors) and Vite production build (`✓ built in 5.63s`).
- **Docker Stack & Live Chrome Verification:** Rebuilt `frontend` (`v1.87.0`) and `backend` (`email-validator==2.2.0` + `homework_uploads` volume); verified live workflows on `http://localhost:5173` with zero 4xx/5xx app API errors and zero JS runtime errors.
- **Header Compliance:** `570 / 570` source files passed `scripts/manage_headers.py check`.

