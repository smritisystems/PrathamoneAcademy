---
title: "PrathamOne EduBoard — System Architecture & Engineering Design"
module: "01_ARCHITECTURE"
category: "SYSTEM-DESIGN"
document_type: "ARCHITECTURE"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.87.0"
doc_version: "1.0"
created_date: "2026-11-12"
updated_date: "2026-11-12"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["eduboard", "architecture", "canvas", "pdf", "recovery", "ssot", "view-first"]
entities: ["EduBoard", "EduBoardPage", "EduBoardRevision", "EduBoardAttachment", "TeachingSession", "AuditLog", "CommunicationLog"]
api_routes: ["/api/v1/eduboard", "/api/v1/teacher-payroll", "/api/v1/student-portal"]
related_modules: ["01_ARCHITECTURE", "03_ACADEMIC_MANAGEMENT", "06_TEACHER_PAYROLL", "12_RBAC_SECURITY", "16_DATABASE_API"]
---

# PrathamOne EduBoard — System Architecture (`EDUBOARD_ARCHITECTURE`)

## 1. Architectural Principles (SSOT & Governance)
- **Zero Academic Master Duplication:** Every `EduBoard` binds directly to existing `Institution`, `AcademicYear`, `Standard`, `Division`, `Subject`/`SubjectMapping`, `TeachingSession`, `TimetableEntry`, and `User` records.
- **Environment & Tenant Isolation:** Both `institution_id` and `is_demo` (`PRODUCTION` vs `TRAINING` `PA001-DEMO`) are enforced on every read, write, attachment download, and PDF export.
- **Immutability of Uploaded Documents:** Uploaded PDFs and images reside unchanged on protected disk storage (`edu_board_attachments`, SHA-256 checksummed). Annotations are layered cleanly inside `edu_board_pages.scene_json`.

## 2. Frontend Library Selection & Justification

| Package | Version | License | Role in EduBoard | Justification |
|---|---|---|---|---|
| `konva` + `react-konva` | `^9.3.20` + `^18.2.16` | MIT | Vector canvas stage, multi-layer composition, shapes, text, images, `<Transformer>` select/move/resize, zoom/pan | Native React 18 compatibility without optional native `canvas@3` Node peer dependencies (`konva@10`), pure client-side serialization, lazy-loaded route chunk isolation. |
| `perfect-freehand` | `^1.2.3` | MIT | Pressure-sensitive chalk, pen, marker, and highlighter stroke geometry | Converts HTML5 `PointerEvent` points (`x, y, pressure`) into smooth tapered vector polygons. |
| `pdfjs-dist` | `^4.10.38` | Apache-2.0 | Client-side PDF slide rendering under CSP `'self'` worker (`?url`) | Paired with backend PyMuPDF `1.24.5` fallback page rendering & flattened PDF export. |

- **Deferred Scope (`PPT/PPTX`):** Neither `python-pptx` nor LibreOffice is present in the backend container. Adding LibreOffice (~400+ MB) introduces deployment/security maintenance outside this release candidate; PPT/PPTX import is explicitly deferred with clear UI notices while PDF + PNG/JPG presentations are fully supported.

## 3. Autosave, IndexedDB Crash Recovery & Optimistic Concurrency
1. **Pointer-Event Discipline:** Canvas pointer moves never write to PostgreSQL. Freehand points render locally in memory, then serialize to IndexedDB (`eduboardRecovery.ts`, ~250ms debounce).
2. **Strict Local Key Scoping:** Recovery records use composite keys `eb:${institutionId}:${dataEnvironment}:${userId}:${boardId}:${sessionId || 0}`. Logging out (`prashant-logout` event) or detecting a different `userId` / `institutionId` / `dataEnvironment` invalidates cross-account recovery access immediately.
3. **Debounced Server Snapshot & Conflict Guard:** Changes sync to `PUT /api/v1/eduboard/boards/{id}/sync` (~3.5s debounce + manual Save button) carrying `expected_revision_no` and per-page `version`. If another writer incremented server `revision_no` or `page.version`, backend rejects with HTTP `409 Conflict` so older autosave requests never overwrite newer work.
4. **Rule 010 View-First Navigation Handling:** Opening any board defaults to `View Mode` unless the authorized user explicitly enables `eduboard:workspace` Edit Mode (`Enable Edit Mode` / `Start Teaching`). Active dirty state triggers browser `beforeunload` warning plus React route navigation warning, while IndexedDB preserves unsaved strokes across refreshes or accidental navigation resets.

