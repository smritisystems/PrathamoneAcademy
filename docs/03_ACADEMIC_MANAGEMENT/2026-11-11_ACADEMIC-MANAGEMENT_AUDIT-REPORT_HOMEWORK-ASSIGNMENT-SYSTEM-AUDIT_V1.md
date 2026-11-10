---
title: "Homework & Assignment Management System — Software Audit & Architectural Blueprint"
module: "03_ACADEMIC_MANAGEMENT"
category: "AUDIT-REPORT"
document_type: "REPORT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-11"
updated_date: "2026-11-11"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["homework", "assignments", "academic_management", "audit", "teaching_sessions", "student_portal"]
entities: ["HomeworkAssignment", "StudentHomeworkRecord", "HomeworkAuditLog", "TeachingSession", "StudentEnrollment", "Student"]
api_routes: ["/api/v1/homework", "/api/v1/teacher-payroll/sessions", "/api/v1/student-portal"]
related_modules: ["03_ACADEMIC_MANAGEMENT", "04_STUDENT_MANAGEMENT", "05_TEACHER_MANAGEMENT", "06_TEACHER_PAYROLL", "07_ATTENDANCE", "08_EXAMINATION"]
---

# PRATHAMONE EduOS — HOMEWORK & ASSIGNMENT MANAGEMENT SYSTEM
## Comprehensive Software Audit, Reuse Reconciliation & Implementation Architecture

**Product:** PrathamOne EduOS (Coaching Institute Edition v1.0.0)  
**Product Architect:** Jawahar R Mallah  
**Organization:** AITDL — AI Technology & Development Lab  
**Date of Audit:** 2026-11-11  

---

## 1. EXECUTIVE SUMMARY & AUDIT MANDATE

In strict accordance with the **Master Implementation Directive**, this document presents a full-stack forensic audit of PrathamOne EduOS to evaluate existing modules, database models, business logic, endpoints, and frontend components before implementing the unified **Homework & Assignment Management System**.

The core operational principle is:
> **One assignment, multiple recipients, independently tracked student records.**

---

## 2. FORENSIC AUDIT OF EXISTING APPLICATION COMPONENTS

Every relevant domain of the existing application has been examined against live PostgreSQL schemas, SQLAlchemy ORM models, FastAPI routers, and React frontend workspaces.

| Component / Subsystem | Current Implementation State | Technical Location | Classification | Reuse & Integration Plan |
| :--- | :--- | :--- | :--- | :--- |
| **1. Academic Session / Year** | Fully implemented, active flag, date range | `backend/app/models/academic_year.py`, `AcademicWorkspace.tsx` | **Fully implemented and functional** | **Direct Reuse**: Every assignment is bound to `academic_year_id`. |
| **2. Board, Course & Standard** | Canonical standards, boards, class levels | `backend/app/models/standard.py`, `board.py` | **Fully implemented and functional** | **Direct Reuse**: Assignments scoped to `standard_id` and optional `board_id`. |
| **3. Class, Division & Batch** | Batches (`divisions`), classroom capacity, class teachers | `backend/app/models/division.py`, `AcademicWorkspace.tsx` | **Fully implemented and functional** | **Direct Reuse**: Primary recipient selector uses `division_id`. Multi-batch targets multiple division IDs. |
| **4. Student Master & Enrollment** | Canonical `students` table, `student_enrollments` by academic year and batch | `backend/app/models/student.py`, `enrollment.py` | **Fully implemented and functional** | **Direct Reuse**: Independent tracking records link `student_id` and `enrollment_id`. |
| **5. Subject Master & Canonical Mappings** | Canonical subjects, standard mappings (`subject_mappings`) | `backend/app/models/subject.py`, `Subjects.tsx` | **Fully implemented and functional** | **Direct Reuse**: Assignments bind to `subject_id` and `subject_mapping_id`. |
| **6. Teacher Master & Allocation** | `users` (role `teacher`), `teacher_assignments` | `backend/app/models/staff.py`, `TeacherManagement.tsx` | **Fully implemented and functional** | **Direct Reuse**: Assigned teacher references `teacher_user_id` in `users`. Note: `teacher_assignments` is for faculty workload, not student homework. |
| **7. Timetable & Teaching Session** | Timetable slots and verified `teaching_sessions` register | `backend/app/models/teacher_payroll.py`, `portal.py` | **Fully implemented and functional** | **Direct Reuse & Extension**: TeachingSession has `id`, `session_code`, `session_date`, `division_id`, `subject_id`, `topic_taught`. |
| **8. Log Teaching Session** | Modal to log completed session, topic, student count | `frontend/src/pages/TeacherPayroll.tsx`, `teacher_payroll.py` | **Fully implemented and functional** | **Direct Extension (Phase 5)**: Add "Assign Homework" trigger button inside session log & register, prefilling metadata. |
| **9. Attendance Management** | Daily attendance, QR terminal, registers | `backend/app/models/attendance.py`, `Attendance.tsx` | **Fully implemented and functional** | **Governance**: Strictly decoupled from homework checking. Physical notebook checking is separate from roll-call attendance. |
| **10. Study Materials & Uploads** | File repository, categories, PDF/doc uploads | `backend/app/models/portal.py`, `study_materials.py` | **Fully implemented and functional** | **Direct Reuse**: Homework attachments and digital submission uploads reuse existing upload/storage facilities. |
| **11. Tests & Examinations** | `examinations` and `exam_marks` | `backend/app/models/exam.py`, `Examinations.tsx` | **Fully implemented and functional** | **Integration (Phase 8)**: Academic Activity Register unifies exams, marks, teaching sessions, and homework history. |
| **12. Student Portal & Dashboard** | Dedicated student portal with 8 tabs, effective student isolation | `frontend/src/pages/StudentDashboard.tsx`, `student_portal.py` | **Fully implemented and functional** | **Direct Extension (Phase 7)**: Add dedicated "My Homework" tab with status breakdown and submission modal. |
| **13. Student Dossier / Detail** | Master student profile with 9 administrative tabs | `frontend/src/pages/StudentDetail.tsx`, `students.py` | **Fully implemented and functional** | **Direct Extension (Phase 8)**: Add Homework Activity tab inside student profile. |
| **14. Communication & Notifications** | `communication_logs`, `message_templates`, WhatsApp/SMS | `backend/app/models/communication.py`, `Communication.tsx` | **Fully implemented and functional** | **Direct Reuse**: Homework events (assigned, overdue, checked) trigger auditable communication logs. |
| **15. Existing Homework / Assignments** | **NONE** — Previous audits noted "No student homework module exists" | N/A | **Missing functionality** | **To Create**: Comprehensive `HomeworkAssignment`, `StudentHomeworkRecord`, and `HomeworkAuditLog` models and endpoints. |

---

## 3. IDENTIFIED GAPS & REUSE ARCHITECTURE

### 3.1 Gap Analysis
1. **No Student Homework Entity**: While teacher batch assignments (`teacher_assignments`) exist in `staff.py`, there were zero tables for student homework tasks, questions, or problem sets.
2. **No Physical Checking Register**: Teachers had no unified screen to open a batch's homework and rapidly mark students as Done, Incomplete, Not Done, or Excused with bulk actions and remarks.
3. **No Digital Submission Channel**: Students had no facility in the student portal to upload images/PDFs of completed work or submit text responses for homework.
4. **No Link from Log Teaching Session**: When a teacher finished logging a teaching session, there was no immediate action to assign homework prefilled with that session's division, subject, and topic.
5. **No Unified Academic Activity Timeline**: Teaching sessions, homework completions, test scores, and attendance were recorded in separate silos without a unified chronological student register.

### 3.2 Single Source of Truth (SSOT) Reuse Blueprint
- **Canonical Masters Reused**: `users`, `students`, `academic_years`, `standards`, `divisions`, `subjects`, `subject_mappings`, `teaching_sessions`.
- **Zero Duplicate Masters Created**: Student homework records strictly link to canonical `students.id` and `student_enrollments.id`.
- **View-First Governance (Rule 010)**: All homework workspaces default to View Mode. Creating, updating, or deleting assignments or bulk checking records strictly requires activating Scoped Edit Mode.
- **Independent Tracking Records**: Each recipient student receives an independent `StudentHomeworkRecord`. Updates to one student's status or remarks never alter any other student's record.

---

## 4. DOMAIN ENTITY SPECIFICATIONS

### 4.1 `HomeworkAssignment` (`homework_assignments`)
- `id`: Primary Key
- `institution_id`: Institutional tenancy isolation
- `academic_year_id`: Academic session link
- `standard_id`: Standard / Class
- `board_id`: Optional Board link
- `subject_id` & `subject_mapping_id`: Canonical subject links
- `division_id`: Primary batch link (nullable for multi-batch/custom student groups)
- `teaching_session_id`: Optional originating Teaching Session
- `teacher_user_id`: Assigned faculty creator
- `assignment_code`: Unique code (e.g., `HW-2026-0001`)
- `title`, `description`, `instructions`
- `chapter`, `topic`
- `assigned_date`, `due_date`, `due_time`
- `max_marks`: Optional marks
- `difficulty_level`: `easy` | `medium` | `hard`
- `priority`: `low` | `normal` | `high` | `urgent`
- `submission_method`: `physical_notebook` | `photo_upload` | `pdf_document` | `online_text` | `online_quiz` | `in_class` | `no_submission`
- `recipient_type`: `batch` | `multi_batch` | `selected_students` | `individual_student` | `student_group`
- `recipient_batch_ids`: JSON array of batch IDs for multi-batch
- `status`: `draft` | `published` | `scheduled` | `archived`
- `publish_at`: Scheduled timestamp
- `attachments`: JSON array of reference documents/questions
- `allow_late_submissions`: Boolean flag
- `is_template`: Boolean flag for reusable homework templates
- `template_name`: Optional template label

### 4.2 `StudentHomeworkRecord` (`student_homework_records`)
- `id`: Primary Key
- `assignment_id`: Parent homework assignment
- `student_id`: Canonical student
- `enrollment_id` & `division_id`: Batch enrollment snapshot
- `publication_time`: When assigned
- `individual_due_date` & `individual_due_time`: Supports individual extensions
- `status`: Lifecycle status (`assigned`, `viewed`, `in_progress`, `pending`, `submitted`, `late_submitted`, `checked`, `returned`, `resubmit_required`, `completed`, `overdue`, `excused`)
- `viewed_at`: When opened by student
- `submission_status`: `pending` | `submitted` | `late` | `not_submitted` | `excused`
- `submission_time`: Timestamp of submission
- `submission_text`: Online text response
- `submission_files`: JSON array of uploaded images/PDFs
- `review_status`: `pending` | `done` | `incomplete` | `not_done` | `absent_not_checked` | `excused` | `checked`
- `marks_obtained`: Optional marks awarded
- `teacher_remarks`: Faculty feedback
- `reviewed_by_id` & `reviewed_at`: Checking auditor
- `exemption_reason`: Note if excused
- `resubmission_count` & `resubmission_history`: JSON audit of resubmissions

### 4.3 `HomeworkAuditLog` (`homework_audit_logs`)
- Tracks all lifecycle changes, individual extensions, exemptions, and checking corrections.

---

## 5. API ROUTE DESIGN (`/api/v1/homework`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/homework/assignments` | List assignments with filtering by batch, standard, subject, teacher, status |
| `POST` | `/api/v1/homework/assignments` | Create assignment (Draft, Publish Now, or Schedule) + auto-generate student records |
| `GET` | `/api/v1/homework/assignments/{id}` | Get assignment details + recipient summary stats |
| `PUT` | `/api/v1/homework/assignments/{id}` | Update assignment (Edit Mode protected) |
| `DELETE` | `/api/v1/homework/assignments/{id}` | Delete / Archive assignment (Edit Mode + RBAC) |
| `GET` | `/api/v1/homework/assignments/{id}/register` | Fetch checking register for all assigned students in a batch |
| `POST` | `/api/v1/homework/assignments/{id}/check` | Bulk or single physical checking submission (Done, Incomplete, Remarks, Marks) |
| `POST` | `/api/v1/homework/assignments/{id}/resubmit` | Request student resubmission |
| `POST` | `/api/v1/homework/assignments/{id}/extend` | Individual or batch due date extension |
| `POST` | `/api/v1/homework/assignments/{id}/exempt` | Individual student exemption |
| `GET` | `/api/v1/homework/student/my-homework` | Student portal list with status filtering |
| `POST` | `/api/v1/homework/student/{record_id}/submit` | Student digital submission (photos/PDFs/text) |
| `GET` | `/api/v1/homework/dashboards/teacher` | Teacher dashboard stats & pending checking queue |
| `GET` | `/api/v1/homework/dashboards/batch/{division_id}` | Batch-wise completion metrics |
| `GET` | `/api/v1/homework/reports/activity-register/{student_id}` | Unified chronological student academic activity register |
| `GET` | `/api/v1/homework/reports/daily-register` | Daily homework register report with print/export data |
| `GET` | `/api/v1/homework/templates` | List reusable homework templates |

---

## 6. PHASE EXECUTION ROADMAP

1. **Phase 1 (Complete)**: Software Audit, SSOT Reconciliation, and Architecture Report.
2. **Phase 2**: Backend SQLAlchemy ORM Models (`backend/app/models/homework.py`), Alembic Migration `040_create_homework_and_assignment_tables.py`, and Domain Service.
3. **Phase 3 & 4**: FastAPI Router (`backend/app/api/v1/endpoints/homework.py`) with Physical Checking Register and Digital Submissions.
4. **Phase 5**: Teaching Session integration linking `TeachingSession` $\to$ Homework prefill.
5. **Phase 6**: Homework Templates and Recurrence support.
6. **Phase 7**: Student Portal Integration (`StudentDashboard.tsx` "My Homework" tab).
7. **Phase 8**: Unified Academic Activity Register.
8. **Phase 9**: Comprehensive UI Workspaces, Dashboards, Reports, and Tests.
9. **Verification**: 100% Header compliance, Docs validation, Backend Pytest, Frontend Vitest.

---

## 7. CERTIFICATION

This audit confirms that the existing system architecture is fully prepared to incorporate the unified Homework & Assignment Management System without disrupting any existing models, tables, or workflows.

**Audited & Approved By:**  
Jawahar R Mallah, Product Architect  
AITDL — AI Technology & Development Lab  
PrathamOne EduOS v1.0.0

