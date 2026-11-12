---
title: "PrathamOne EduBoard — RBAC Permission & Isolation Matrix"
module: "12_RBAC_SECURITY"
category: "PERMISSION-MATRIX"
document_type: "SECURITY"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.87.0"
doc_version: "1.0"
created_date: "2026-11-12"
updated_date: "2026-11-12"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["eduboard", "rbac", "permissions", "tenant-isolation", "security", "view-first"]
entities: ["Permission", "Role", "EduBoard", "AuditLog"]
api_routes: ["/api/v1/eduboard"]
related_modules: ["03_ACADEMIC_MANAGEMENT", "04_STUDENT_MANAGEMENT", "12_RBAC_SECURITY"]
---

# PrathamOne EduBoard — Permission & Security Matrix (`EDUBOARD_PERMISSION_MATRIX`)

## 1. Seeded Resource Permissions (`resource = 'eduboard'`)

Migration `046_create_eduboard_tables` registers and seeds all 8 independent actions on `permissions`:

| Action | SuperAdmin / SysAdmin / Admin / Principal | Coordinator | Teacher | Staff | Student | Backend Enforcement Summary |
|---|---|---|---|---|---|---|
| `eduboard:view` | Allowed | Allowed | Allowed (own / scoped batch) | Allowed (read-only) | Allowed (`published` enrolled/historical batch only) | Filters by `institution_id`, `is_demo`, and role/student scope |
| `eduboard:create` | Allowed | Allowed | Allowed (validated via `HomeworkService.validate_teacher_scope`) | Denied | Denied | Validates teacher batch/subject/session ownership |
| `eduboard:edit` | Allowed | Allowed | Allowed (own board unless published/closed or admin override) | Denied | Denied (blocked on backend; `collaborate` opt-in guarded separately) | Enforces `version` / `revision_no` optimistic lock + `eduboard:workspace` Edit Mode |
| `eduboard:delete` | Allowed | Denied (unless granted) | Draft/own soft-archive or denied when published | Denied | Denied | Soft-archives (`is_deleted=True`) + writes `AuditLog`; never silently drops historical published records from student history |
| `eduboard:publish` | Allowed | Allowed | Allowed (own/scoped) | Denied | Denied | Transitions board to `published`, writes revision checkpoint + `AuditLog` + `CommunicationLog` (`EB_PUBLISHED`) |
| `eduboard:download` | Allowed | Allowed | Allowed | Allowed | Allowed (published boards only) | Serves `edu_board_attachments` / exported PDFs behind authenticated & tenant-scoped endpoints |
| `eduboard:manage_templates` | Allowed | Allowed | Allowed | Denied | Denied | Controls saving/deleting reusable classroom templates |
| `eduboard:collaborate` | Allowed | Allowed | Allowed (controls temporary opt-in `collaboration_enabled` toggle) | Denied | Denied unless board `collaboration_enabled` & teacher grant | Future-ready moderation control; default `False` in v1 |

## 2. Mandatory Cross-Cutting Security Controls
- **PRODUCTION vs TRAINING (`PA001-DEMO`) Isolation:** Every endpoint resolves `data_env` (`X-Data-Environment`) via `enforce_institution_access`. Queries filter explicitly by `EduBoard.is_demo == (data_env == "TRAINING")`. Production users never see `PA001-DEMO` training boards and vice versa.
- **Student Isolation:** Uses `get_effective_student` semantics (`user.student_id` locked for student accounts) + queries `StudentEnrollment` history (`division_id` + `academic_year_id`, regardless of later withdrawal/transfer) so historical published lecture boards remain accessible without exposing another batch's boards or draft/closed teacher workspaces.
- **Audit Trail:** All create, manual save, publish, close, restore, delete, attachment upload, PDF export, student view, and download events write structured rows to `AuditLog` (`resource_type='eduboard'`).

