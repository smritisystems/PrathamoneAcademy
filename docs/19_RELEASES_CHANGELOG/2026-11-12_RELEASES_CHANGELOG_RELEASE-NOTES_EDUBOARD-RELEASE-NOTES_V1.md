---
title: "Release Notes — PrathamOne EduOS v1.88.0-rc.1 (EduBoard Interactive Teaching Engine)"
module: "19_RELEASES_CHANGELOG"
category: "RELEASE-NOTES"
document_type: "RELEASE-NOTES"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.88.0-rc.1"
doc_version: "1.0"
created_date: "2026-11-12"
updated_date: "2026-11-12"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["release-notes", "v1.88.0-rc.1", "eduboard", "digital-classroom", "pdfjs", "konva"]
entities: ["EduBoard", "EduBoardPage", "EduBoardRevision", "EduBoardAttachment", "TeachingSession"]
api_routes: ["/api/v1/eduboard/context", "/api/v1/eduboard/boards", "/api/v1/eduboard/student/boards", "/api/v1/eduboard/reports/summary", "/api/v1/reports/eduboard-summary"]
related_modules: ["03_ACADEMIC_MANAGEMENT", "05_TEACHER_MANAGEMENT", "06_TEACHER_PAYROLL", "11_REPORTS_EXPORTS", "18_TESTING_QA"]
---

# Release Notes — PrathamOne EduOS `v1.88.0-rc.1`
**Release Channel:** Release Candidate (Staging / Local Validation; not auto-deployed to customer production)  
**Build Identifier:** `2026.11.12-REV-159-v1.88.0-rc.1-0795F36`  
**Release Date:** 2026-11-12  
**Database Migration:** `046_create_eduboard_tables`  

---

## 1. Highlights: PrathamOne EduBoard (Interactive Teaching & Digital Classroom Engine)

`v1.88.0-rc.1` introduces **PrathamOne EduBoard**, a unified multi-mode digital classroom teaching engine deeply integrated into PrathamOne EduOS's existing Academic Spine, Teaching Sessions, RBAC, Rule 010 View-First Governance, Student Portal, and Reporting Centre.

### 1.1 Three Classroom Teaching Modes
- **Classic Chalk / Greenboard (`classic`):** Blackboard and Greenboard classroom surfaces with realistic chalk rendering (`perfect-freehand`), eraser, undo/redo history, and multi-page board deck management.
- **Digital Whiteboard (`whiteboard`):** Clean, grid, and ruled notebook surfaces supporting pen, highlighter, geometric shapes (`line`, `arrow`, `rect`, `circle`), editable vector text, and image overlays with touch, pointer, and stylus pressure support.
- **Presentation PDF Board (`presentation`):** Client-side `pdfjs-dist` worker rendering paired with server-side `PyMuPDF` fallback rendering and non-destructive vector annotation layers. Original uploaded PDF documents remain immutable and are never overwritten.

### 1.2 Academic, Security & Governance Compliance
- **Single Source of Truth Reuse:** Associates directly with `Institution`, `AcademicYear`, `Standard`, `Division`, `Subject`, `SubjectMapping`, `TeachingSession`, and `TimetableEntry` without duplicating academic masters.
- **RBAC (`eduboard` Resource):** Enforces seeded permissions (`view`, `create`, `edit`, `delete`, `publish`, `download`, `manage_templates`, `collaborate`) across roles (e.g., Teachers cannot hard-delete boards; Students are restricted to read-only `view` and `download` for their enrolled batches).
- **Environment Isolation (`PRODUCTION` vs `TRAINING`):** Strict `is_demo` separation across boards, pages, attachments, templates, student portal views, and IndexedDB drafts.
- **Rule 010 View-First Edit Mode & Optimistic Concurrency:** All workspaces default to locked **View Mode** until Edit Mode is explicitly activated (`EditModeBar`). Server sync guards against concurrent edits with `409 Conflict` detection and immutable `edu_board_revisions` snapshots for point-in-time restoration.
- **Scoped Offline Crash Recovery:** Native IndexedDB store (`prathamone_eduboard_recovery_v1`) keys drafts by `(institutionId, dataEnvironment, userId, boardId, teachingSessionId)` and purges cleanly on `prashant-logout`.

### 1.3 Student Portal, Teacher Entry Points & Reporting
- **Teacher Entry Points:** Added `EduBoard Classroom` to authorized Sidebar navigation (`Sidebar.tsx`) and deep-link `Open EduBoard` triggers from `/teachers`, `/teachers/performance` (`TeacherManagement.tsx`), and Teaching Session Register (`/teacher-payroll`).
- **Student Read-Only Lecture View:** Eligible students access published boards and download annotated PDFs from `/student-portal` -> `Study Materials` (`StudentDashboard.tsx`), preserving historical lecture access even after batch transfer.
- **Reporting & Audit Trail:** Added `EduBoard Digital Classroom Usage` (`eduboard-summary`) to `/reports` (`Reports.tsx`) backed by `/api/v1/eduboard/reports/summary` and `/api/v1/reports/eduboard-summary`, plus `AuditLog` tracking and deduplicated `CommunicationLog` notifications upon board publication.

### 1.4 Infrastructure & Compatibility Notes
- **Selected Frontend Libraries:** `konva@^9.3.22`, `react-konva@^18.2.16`, `perfect-freehand@^1.2.3`, `pdfjs-dist@^4.10.38`.
- **Nginx & PWA Hardening:** Added `.mjs` (`application/javascript`) MIME rule in `frontend/nginx.conf` for `pdfjs-dist` worker bundles and bumped Service Worker cache key to `prathamone-cache-v1.3.0` (`frontend/public/sw.js`).
- **Deferred Scope (`PPT / PPTX`):** Native `.ppt`/`.pptx` server-side conversion remains explicitly deferred because `python-pptx` and LibreOffice are not installed in the backend container image; supported uploads remain `pdf`, `png`, `jpg`, `jpeg`, and `webp`.

---

## 2. Verification Summary
- Backend Pytest (`test_eduboard_system.py`, `test_homework_system.py`, `test_homework_enhancement_e2e.py`): **13 passed**.
- Backend Pytest (`test_p0_security_lockdown.py`, `test_p1_security_hardening.py`, `test_p2_session_and_ssot.py`): **13 passed**.
- Frontend TypeScript (`npx tsc --noEmit`): **0 errors**.
- Frontend Vitest (`npm test`): **65 test files / 503 tests passed**.
- Frontend Vite Build (`npm run build`): **Built cleanly in 6.07s**.
- Live Chrome Browser E2E Verification: **10/10 scenarios verified** against `http://localhost:5173`.
- Corporate Header Check (`scripts/manage_headers.py check`): **579/579 passed**.

*(Full QA evidence in `docs/18_TESTING_QA/2026-11-12_TESTING-QA_TEST-REPORT_EDUBOARD-TEST-REPORT_V1.md`.)*

