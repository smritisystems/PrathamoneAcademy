---
title: "PrathamOne EduBoard — Existing Functionality Audit & Baseline Verification"
module: "03_ACADEMIC_MANAGEMENT"
category: "AUDIT-REPORT"
document_type: "AUDIT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.87.0"
doc_version: "1.0"
created_date: "2026-11-12"
updated_date: "2026-11-12"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["eduboard", "audit", "baseline", "alembic", "ssot", "dependencies"]
entities: ["TeachingSession", "TeacherAssignment", "TimetableEntry", "StudyMaterial", "HomeworkAssignment", "EduBoard"]
api_routes: ["/api/v1/teacher-payroll", "/api/v1/student-portal", "/api/v1/homework", "/api/v1/eduboard"]
related_modules: ["01_ARCHITECTURE", "03_ACADEMIC_MANAGEMENT", "05_TEACHER_MANAGEMENT", "06_TEACHER_PAYROLL", "12_RBAC_SECURITY"]
---

# PrathamOne EduBoard — Existing Functionality Audit (`EDUBOARD_EXISTING_FUNCTIONALITY_AUDIT`)

## 1. Baseline Environment & Dependency Verification

| Check Area | Verified Observed Value | Status | Notes |
|---|---|---|---|
| **Backend Runtime (`prashant_academy_backend`)** | FastAPI `0.115.14`, SQLAlchemy `2.0.30`, Alembic `1.14.1`, PyMuPDF `1.24.5`, Pillow `11.3.0`, Pydantic `2.10.6`, PyJWT `2.10.1` | `PASS` | Observed inside running container; `python-pptx` and LibreOffice (`soffice`) are NOT installed. |
| **Frontend Manifest (`frontend/package.json`)** | React `18.3.1`, Vite `8.3.8`, TypeScript `5.4.5`, Tailwind `3.4.4`, Zustand `4.5.2`, TanStack Query `5.40.0`, Lucide `0.395.0` | `PASS` | Zero pre-existing canvas/whiteboard/PDF-rendering dependencies before EduBoard package selection. |
| **Alembic History (`001`..`045`)** | 45 linear revisions ending at single head `045_homework_enhancement` on `prashant_academy` | `PASS` | Zero multiple heads or missing parents; `prashant_academy_test` is dynamically initialized via SQLAlchemy `Base.metadata.create_all`. |
| **Environments & Tenants (`institutions`)** | `id=1` (`PA001` Prashant Academy — Production), `id=2` (`PA001-DEMO` — Training/Demo) | `PASS` | Isolated via `enforce_institution_access`, `TRAINING_INSTITUTION_CODE`, and `is_demo` scoping. |

## 2. Functionality & Reuse Audit Matrix

| Capability | Existing Implementation | Gap | Decision | Classification |
|---|---|---|---|---|
| **Academic & Lecture Spine** | `TeachingSession` (`teacher_payroll.py`), `TeacherAssignment` (`staff.py`), `TimetableEntry` (`portal.py`), `AcademicYear`, `Standard`, `Division`, `Subject`, `SubjectMapping`, `StudentEnrollment` | No EduBoard FK linking directly to lectures | **Reuse** all academic masters as-is; add `teaching_session_id` FK on `edu_boards` | `PASS` (Spine Existing) |
| **Classic & Digital Board Engine** | None in `frontend/package.json` | No multi-page canvas, strokes, shapes, layers, undo/redo, zoom/pan | **Create** using `konva@^9.3.20`, `react-konva@^18.2.16`, `perfect-freehand@^1.2.3` | `NOT IMPLEMENTED` |
| **Presentation (PDF & PPTX)** | Backend bundles `PyMuPDF 1.24.5` + `Pillow 11.3.0`; `StudyMaterial` only stores external URLs; no LibreOffice/`python-pptx` | No client PDF renderer or non-destructive overlay annotations; no PPTX converter | **Install** `pdfjs-dist@^4.10.38` + **Reuse** `PyMuPDF` for server fallback rendering & annotated PDF export; explicitly **defer** PPT/PPTX | `PARTIAL` -> Extend (`PDF` only in `v1.88.0-rc.1`) |
| **Autosave, Crash Recovery & Concurrency** | No board draft persistence in IndexedDB | No scoped local crash recovery or page `version` optimistic lock | **Create** scoped `eduboardRecovery.ts` IndexedDB utility + backend `version`/`latest_revision_no` conflict checks | `NOT IMPLEMENTED` |
| **Rule 010 View-First Governance** | `Layout.tsx` calls `useEditModeStore.getState().resetAll()` on route/query change | Active lecture board edits must not lose work on accidental navigation | **Reuse** `EditModeBar` (`eduboard:workspace`) + add IDB recovery + navigation unsaved-change prompt | `PARTIAL` |
| **Teacher Launch Surface** | `TeacherPayroll.tsx` (`/teachers/performance`) lists `TeachingSession` rows with action links | No "Open EduBoard" action on teaching sessions | **Extend** `TeacherPayroll.tsx` + `TeacherManagement.tsx` with direct `/eduboard?session_id=...` launcher | `PARTIAL` |
| **Student Portal Access** | `StudentDashboard.tsx` + `/api/v1/student-portal/*` (`get_effective_student`, `StudentEnrollment`) | No read-only lecture board viewer or permitted annotated PDF download | **Extend** `StudentDashboard.tsx` (`materials` tab) with read-only Lecture Boards & Notes | `PARTIAL` |
| **Security, Storage, Audit & Notifications** | `enforce_institution_access`, `get_user_permissions`, `HomeworkService.validate_teacher_scope`, `HomeworkFile` pattern, `AuditLog`, `CommunicationLog`, `InstitutionSetting` | No `eduboard:*` permissions or `edu_board_attachments` / `is_demo` board isolation | **Reuse** auth/scope helpers; seed `eduboard:*` permissions; write `AuditLog` + `CommunicationLog` (`EB_%`) | `PASS` (Infrastructure Ready) |

