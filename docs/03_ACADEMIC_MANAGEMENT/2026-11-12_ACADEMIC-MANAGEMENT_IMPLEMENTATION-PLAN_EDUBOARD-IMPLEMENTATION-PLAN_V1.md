---
title: "PrathamOne EduBoard — Implementation Plan"
module: "03_ACADEMIC_MANAGEMENT"
category: "IMPLEMENTATION-PLAN"
document_type: "PLAN"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.87.0"
doc_version: "1.0"
created_date: "2026-11-12"
updated_date: "2026-11-12"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["eduboard", "implementation-plan", "migration", "api", "frontend", "testing"]
entities: ["EduBoard", "EduBoardPage", "EduBoardRevision", "EduBoardAttachment"]
api_routes: ["/api/v1/eduboard"]
related_modules: ["01_ARCHITECTURE", "03_ACADEMIC_MANAGEMENT", "16_DATABASE_API", "18_TESTING_QA"]
---

# PrathamOne EduBoard — Phased Implementation Plan (`EDUBOARD_IMPLEMENTATION_PLAN`)

| Workstream | Scope & Deliverables | Target Files | Verification Gate |
|---|---|---|---|
| **1. Baseline & Library Audit** | Verify Alembic `045`, Python deps (`PyMuPDF`, `Pillow`), Nginx CSP, React 18 compatibility; install `konva@9`, `react-konva@18`, `perfect-freehand`, `pdfjs-dist@4`. | `frontend/package.json`, `frontend/package-lock.json` | `npm ls`, zero peer errors |
| **2. Database & Migration (`046`)** | Add ORM models & idempotent migration `046_create_eduboard_tables` + seed `eduboard:*` permissions. | `backend/app/models/eduboard.py`, `backend/app/models/__init__.py`, `backend/alembic/versions/046_create_eduboard_tables.py` | `alembic upgrade head` -> single head `046_create_eduboard_tables` |
| **3. Backend Service & API** | Build `EduBoardService` + `/api/v1/eduboard` router: teacher scope (`HomeworkService.validate_teacher_scope`), CRUD, sync with optimistic lock (`409`), publish/close, attachment upload/download + PyMuPDF page rendering & annotated PDF export, `AuditLog`, `CommunicationLog` (`EB_%`), `InstitutionSetting`, `reports.py` integration, and read-only Student Portal APIs preserving transfer history. | `backend/app/services/eduboard_service.py`, `backend/app/api/v1/endpoints/eduboard.py`, `backend/app/api/v1/router.py`, `backend/app/api/v1/endpoints/reports.py` | Backend `pytest` covering auth, RBAC, scope, concurrency, isolation, upload/export, audit |
| **4. Frontend Canvas, Recovery & Integrations** | Build scoped `eduboardRecovery.ts`, Konva+Freehand+PDF.js multi-page `EduBoardCanvas.tsx` (Classic/Whiteboard/Presentation), `EduBoardWorkspace.tsx` (View-First + fullscreen + dirty nav guard + history/templates), Teacher Session launch in `TeacherPayroll.tsx` & `TeacherManagement.tsx`, Student Portal read-only board viewer in `StudentDashboard.tsx`, single canonical nav entry in `modules.ts`. | `frontend/src/utils/eduboardRecovery.ts`, `frontend/src/components/eduboard/EduBoardCanvas.tsx`, `frontend/src/pages/EduBoardWorkspace.tsx`, `frontend/src/pages/TeacherPayroll.tsx`, `frontend/src/pages/StudentDashboard.tsx`, `frontend/src/config/modules.ts`, `frontend/src/App.tsx`, `frontend/src/api/endpoints.ts`, `frontend/src/types/index.ts` | `tsc --noEmit`, Vitest unit/UI tests, Vite build |
| **5. Acceptance & RC Release** | Full regression + Browser Agent 10-step live Chrome verification + `v1.88.0-rc.1` version sync + Test Report & Release Notes + `docs_manager.py validate` & `manage_headers.py check`. | `docs/...` Test Report & Release Notes, `CHANGELOG.md`, version manifests | `0` test failures, `0` doc errors, `100%` headers |

