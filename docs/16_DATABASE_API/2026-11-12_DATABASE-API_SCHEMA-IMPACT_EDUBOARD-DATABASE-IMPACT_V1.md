---
title: "PrathamOne EduBoard — Database Impact & Migration Specification"
module: "16_DATABASE_API"
category: "SCHEMA-IMPACT"
document_type: "DATABASE"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.87.0"
doc_version: "1.0"
created_date: "2026-11-12"
updated_date: "2026-11-12"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["eduboard", "alembic", "046", "schema", "postgres", "migrations", "ssot"]
entities: ["EduBoard", "EduBoardPage", "EduBoardRevision", "EduBoardAttachment", "Permission"]
api_routes: ["/api/v1/eduboard"]
related_modules: ["01_ARCHITECTURE", "03_ACADEMIC_MANAGEMENT", "12_RBAC_SECURITY", "16_DATABASE_API"]
---

# PrathamOne EduBoard — Database Impact (`EDUBOARD_DATABASE_IMPACT`)

## 1. Migration Chain Verification (`001` -> `046`)
- Audited all 45 historical migrations in `backend/alembic/versions/` (`001_initial` through `045_homework_enhancement`).
- Confirmed zero branches, zero missing parents, and live `prashant_academy` DB head = `045_homework_enhancement`.
- Added single linear migration `046_create_eduboard_tables` (`down_revision = "045_homework_enhancement"`), purely additive (zero destructive alterations to customer tables).

## 2. Minimal New Persistence Tables

| Table | Purpose | Key Foreign Keys (SSOT Reuse) | Concurrency & Isolation Fields |
|---|---|---|---|
| `edu_boards` | Classroom board master per lecture/topic | `institution_id`, `academic_year_id`, `teaching_session_id` (`SET NULL`), `timetable_entry_id` (`SET NULL`), `teacher_user_id`, `standard_id`, `division_id` (`SET NULL`), `subject_id`, `subject_mapping_id` (`SET NULL`), `published_by_id` | `is_demo` (`PRODUCTION` vs `TRAINING`), `latest_revision_no`, `is_deleted` (soft archive), `collaboration_enabled` |
| `edu_board_attachments` | Access-controlled PDFs, canvas images & exported PDFs | `institution_id`, `board_id` (`CASCADE`), `uploader_user_id` (`SET NULL`) | `is_demo`, `sha256_checksum`, `is_immutable`, `page_count` |
| `edu_board_pages` | Ordered pages (`classic`, `whiteboard`, `presentation`) & Konva/freehand JSON scene | `board_id` (`CASCADE`), `source_attachment_id` (`SET NULL`) | `version` integer optimistic lock, unique `(board_id, page_uid)` |
| `edu_board_revisions` | Snapshot revision checkpoints (`autosave`, `manual`, `publish`, `restore`) | `board_id` (`CASCADE`), `created_by_id` (`SET NULL`) | Unique `(board_id, revision_no)` |

## 3. Existing Tables Reused Without Duplication
- `teaching_sessions`, `timetable_entries`, `teacher_assignments`, `academic_years`, `standards`, `divisions`, `subjects`, `subject_mappings`, `student_enrollments`, `users`, `roles`, `permissions`, `audit_logs`, `communication_logs`, `institution_settings`.

