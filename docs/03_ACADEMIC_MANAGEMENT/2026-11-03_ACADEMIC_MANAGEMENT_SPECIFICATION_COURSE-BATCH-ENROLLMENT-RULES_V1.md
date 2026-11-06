---
title: "Course, Batch, and Enrollment Rules"
module: "03_ACADEMIC_MANAGEMENT"
category: "SPECIFICATION"
document_type: "SPECIFICATION"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-03"
updated_date: "2026-11-03"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["03-academic-management", "specification"]
entities: ["Standard", "Division", "Subject", "TimetableEntry"]
api_routes: ["/api/v1/standards", "/api/v1/divisions", "/api/v1/subjects"]
related_modules: []
---

# Course, Batch, and Enrollment Rules
**Document ID**: CBER-001  
**Version**: 1.0-DRAFT  
**Status**: DRAFT — Pending Owner Approval  
**Parent Framework**: CIPF-001

---

> `[OPEN DECISION: PDR-001]` — Batch and Course tables do not yet exist in the current database schema. All rules in this document describing batch or course operations are **aspirational/planned** and require schema design approval before implementation.

---

## Section 1: Course Management Rules

### CBER-CRS-001: Course Definition
| Field | Value |
|---|---|
| **ID** | CBER-CRS-001 |
| **Title** | Course is a configurable program linked to a board |
| **Scope** | Course Management |
| **Responsible Role** | Institute Admin |
| **Rule Statement** | A Course defines: (a) board/exam it belongs to (CBSE / ICSE / JEE / NEET / State Board / custom), (b) duration in months, (c) academic level/year, (d) list of subjects, (e) minimum and maximum batch size. A course must be linked to an academic year before students can be enrolled. |
| **Examples** | "JEE Main 2025 — Class 12 (1-year)", "NEET UG Dropper Batch", "CBSE Class 10 — 2024-25" |
| **System Behavior** | `courses` table with `board_id`, `academic_year_id`, `name`, `duration_months`, `min_batch_size`, `max_batch_size`, `is_active` |
| **Audit Requirements** | Course creation, update, and deactivation logged |
| **Acceptance Criteria** | AC: Course cannot be created without a board. AC: Course with zero subjects cannot accept student enrollment. |

---

### CBER-CRS-002: Syllabus Association
| Field | Value |
|---|---|
| **ID** | CBER-CRS-002 |
| **Title** | Courses must have subjects assigned before enrollment opens |
| **Scope** | Course Management |
| **Responsible Role** | Academic Coordinator |
| **Rule Statement** | Before a course's enrollment status is set to `open`, at least one subject must be assigned. Each subject specifies: name, weekly hours, maximum marks, passing marks, and the assigned teacher (batch-specific). |
| **Exceptions** | Institute Admin may open enrollment without subjects for capacity planning, with a warning |
| **System Behavior** | Enrollment open API checks subject count > 0; returns warning if 0 |
| **Acceptance Criteria** | AC: Setting course to enrollment-open with 0 subjects returns warning but does not block (configurable). |

---

### CBER-CRS-003: Course Year Rollover
| Field | Value |
|---|---|
| **ID** | CBER-CRS-003 |
| **Title** | Courses roll over annually with archive of previous year |
| **Scope** | Course Management, Academic Year |
| **Responsible Role** | Institute Admin |
| **Rule Statement** | At academic year end: (a) current courses are archived (status → `completed`), (b) new courses for the next year may be cloned from current year's template, (c) student enrollments are not auto-transferred — each student must be explicitly re-enrolled in the new year's course/batch. |
| **System Behavior** | Year-end rollover tool creates course copies with new `academic_year_id`; old courses become read-only |
| **Acceptance Criteria** | AC: Archived course cannot accept new enrollments. AC: Course clone copies subjects but not students. |

---

## Section 2: Batch Management Rules

### CBER-BCH-001: Batch Definition
| Field | Value |
|---|---|
| **ID** | CBER-BCH-001 |
| **Title** | Batch is a time-bound scheduled group within a course |
| **Scope** | Batch Management |
| **Responsible Role** | Academic Coordinator |
| **Rule Statement** | A Batch defines: (a) parent course, (b) name (e.g., "Morning Batch A"), (c) maximum capacity `[PROPOSED: 30]`, (d) start date and end date, (e) schedule (days of week + time slots), (f) primary assigned teacher. A batch is `scheduled` → `active` → `completed`. |
| **Exceptions** | `[OPEN DECISION: PDR-004]` — Batch capacity default requires owner approval |
| **System Behavior** | `batches` table; batch status controlled by date range + explicit admin action |
| **Audit Requirements** | Batch creation, schedule change, teacher change, and status change logged |
| **Acceptance Criteria** | AC: Batch with 0 capacity cannot be created. AC: Active batch without teacher shows warning on dashboard. |

---

### CBER-BCH-002: Batch Capacity Enforcement
| Field | Value |
|---|---|
| **ID** | CBER-BCH-002 |
| **Title** | Student enrollment is blocked when batch is at capacity |
| **Scope** | Batch Enrollment |
| **Responsible Role** | System (auto-enforced) |
| **Preconditions** | Student attempts to enroll in a batch |
| **Rule Statement** | System counts active enrollments (status = `enrolled` or `active`) in the batch. If count ≥ batch capacity, enrollment is rejected with message "Batch is full." Institute Admin may add a waitlist entry or increase capacity with documented reason. |
| **Exceptions** | Institute Admin may override capacity limit by setting `allow_overflow = true` with documented reason |
| **System Behavior** | API checks count at enrollment; uses SELECT FOR UPDATE to prevent race conditions |
| **Acceptance Criteria** | AC: 31st student enrollment in a capacity-30 batch returns HTTP 409. AC: Admin override allows enrollment with audit log entry. AC: Concurrent enrollment of 2 students in last seat → exactly 1 succeeds. |

---

### CBER-BCH-003: Teacher Assignment to Batches
| Field | Value |
|---|---|
| **ID** | CBER-BCH-003 |
| **Title** | Each batch must have a primary teacher per subject |
| **Scope** | Batch Management, Teacher Management |
| **Responsible Role** | Academic Coordinator |
| **Rule Statement** | For each subject in a course, one teacher must be assigned per batch. A teacher may be assigned to multiple batches, subject to: (a) no schedule conflict (no overlapping time slots), (b) teacher is `active` in the system. |
| **Exceptions** | `[OPEN DECISION: PDR-010]` — Maximum batches per teacher per day requires owner decision |
| **System Behavior** | Schedule conflict check on `teacher_batch_assignments` table; returns HTTP 409 if conflict |
| **Acceptance Criteria** | AC: Assigning teacher to two batches with overlapping time slots returns conflict error. AC: Active batch with unassigned teacher subjects shows alert on academic coordinator dashboard. |

---

### CBER-BCH-004: Teacher Substitution
| Field | Value |
|---|---|
| **ID** | CBER-BCH-004 |
| **Title** | Teacher substitution must be recorded for missed classes |
| **Scope** | Batch Management, Attendance |
| **Responsible Role** | Academic Coordinator |
| **Preconditions** | Primary teacher is absent for a scheduled class |
| **Rule Statement** | When a primary teacher cannot conduct a class: (a) Academic Coordinator assigns a substitute teacher, (b) substitute assignment is recorded with date, batch, subject, and reason, (c) substitute teacher gets read-only access to batch attendance for that date, (d) if no substitute is available, class is marked `cancelled` with make-up class scheduled within 7 days. |
| **Exceptions** | `[OPEN DECISION: PDR-011]` — Maximum cancelled classes without make-up requires owner policy |
| **System Behavior** | `batch_substitutions` table; make-up scheduling tracked separately |
| **Acceptance Criteria** | AC: Substitution record is created before substitute can mark attendance. AC: Cancelled class appears in student attendance records as `excused` (not absent). |

---

### CBER-BCH-005: Batch Cancellation
| Field | Value |
|---|---|
| **ID** | CBER-BCH-005 |
| **Title** | Batch cancellation policy and student transition |
| **Scope** | Batch Management |
| **Responsible Role** | Institute Admin, Owner |
| **Rule Statement** | A batch may be cancelled if: (a) enrollment count falls below minimum batch size (defined per course), (b) teacher is unavailable and no substitute can be found for >14 days. Upon cancellation: (c) enrolled students are notified, (d) students must be transferred to another batch or refunded, (e) Owner approval required for cancellation affecting >5 enrolled students. |
| **Exceptions** | Natural disaster or regulatory closure — immediate cancellation without minimum-days waiting |
| **System Behavior** | Batch cancellation triggers notification queue and creates pending transfer requests for enrolled students |
| **Acceptance Criteria** | AC: Batch with 0 enrolled students can be cancelled immediately. AC: Batch with 10 students requires Owner approval. AC: Cancelled batch shows all students as requiring reallocation. |

---

## Section 3: Enrollment Rules

### CBER-ENR-001: Enrollment Prerequisites
| Field | Value |
|---|---|
| **ID** | CBER-ENR-001 |
| **Title** | Prerequisites that must be met before batch enrollment |
| **Scope** | Enrollment |
| **Responsible Role** | Admission Counselor |
| **Rule Statement** | Before a student can be enrolled in a batch, ALL of the following must be true: (a) Student profile exists with mandatory fields (CBR-STU-001), (b) Guardian record exists (CBR-ADM-003), (c) Registration/admission fee has been paid `[OPEN DECISION: PDR-012 — whether this is mandatory before enrollment]`, (d) Batch has available capacity, (e) Student has not already enrolled in the same course in the same academic year. |
| **System Behavior** | Enrollment API validates all prerequisites; returns specific error codes per failed check |
| **Acceptance Criteria** | AC: Enrollment without student profile → HTTP 422. AC: Enrollment in full batch → HTTP 409. AC: Duplicate enrollment in same course → HTTP 409. |

---

### CBER-ENR-002: Enrollment Fee Invoice Generation
| Field | Value |
|---|---|
| **ID** | CBER-ENR-002 |
| **Title** | Fee invoice is auto-generated upon enrollment confirmation |
| **Scope** | Enrollment, Fee Management |
| **Responsible Role** | System (automatic) |
| **Preconditions** | Student enrollment is confirmed |
| **Rule Statement** | Upon enrollment confirmation: (a) system looks up the fee structure for the course + academic year, (b) applies any applicable scholarship or discount (pre-approved), (c) generates a `fee_invoice` with total_amount and due_amount, (d) generates `fee_installments` per the fee structure's payment schedule. |
| **Exceptions** | If no fee structure exists for the course, enrollment is permitted but a warning is shown and invoice must be manually created |
| **System Behavior** | Enrollment endpoint triggers async fee invoice generation; rollback if generation fails |
| **Acceptance Criteria** | AC: Enrollment with matching fee structure → invoice created automatically. AC: Invoice total = fee structure amount − approved discounts. AC: Installment count matches fee structure's payment schedule. |

---

### CBER-ENR-003: Batch Transfer Between Students
| Field | Value |
|---|---|
| **ID** | CBER-ENR-003 |
| **Title** | Cross-batch transfer does not reset fee obligations |
| **Scope** | Batch Transfer, Fee Management |
| **Responsible Role** | Academic Coordinator, Accountant |
| **Rule Statement** | When a student transfers from Batch A to Batch B (same course): (a) existing fee invoice and installment schedule are retained unchanged, (b) outstanding fees do not change, (c) attendance records remain in Batch A for pre-transfer period, (d) post-transfer attendance is recorded in Batch B. Fee differences (if any, e.g., premium batch) require a supplementary invoice — `[OPEN DECISION: PDR-013]`. |
| **System Behavior** | Transfer creates new `batch_enrollment` record; flags original as `transferred`; no change to `fee_invoices` table |
| **Acceptance Criteria** | AC: Transfer does not change invoice total. AC: Attendance report shows batch correctly for each period. |

---

*End of COURSE_BATCH_ENROLLMENT_RULES.md*

