---
title: "Coaching Business Rules"
module: "25_BUSINESS_REQUIREMENTS"
category: "POLICY-FRAMEWORK"
document_type: "POLICY-FRAMEWORK"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-03"
updated_date: "2026-11-03"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["25-business-requirements", "policy-framework"]
entities: []
api_routes: []
related_modules: []
---

# Coaching Business Rules
**Document ID**: CBR-001  
**Version**: 1.0-DRAFT  
**Status**: DRAFT — Pending Owner Approval  
**Parent Framework**: CIPF-001

---

## Rule Format

Each rule is documented with:
- **ID**: Unique rule identifier
- **Title**: Short name
- **Scope**: Which modules/entities it applies to
- **Responsible Role**: Who enforces this rule
- **Preconditions**: What must be true before the rule applies
- **Rule Statement**: The actual rule
- **Exceptions**: When the rule may be bypassed and who authorizes it
- **Approval Required**: Who must approve
- **System Behavior**: How the software enforces it
- **Audit Requirements**: What is logged
- **Acceptance Criteria**: Testable pass/fail criteria

---

## Section 1: Admission and Enrollment Rules

### CBR-ADM-001: Student Inquiry Registration
| Field | Value |
|---|---|
| **ID** | CBR-ADM-001 |
| **Title** | Every student inquiry must be recorded before enrollment |
| **Scope** | Admissions, Student Registration |
| **Responsible Role** | Admission Counselor |
| **Preconditions** | Student or guardian contacts institute |
| **Rule Statement** | Before any student is formally enrolled, an inquiry record must be created capturing: student name, guardian name, contact number, course/standard of interest, and inquiry date. |
| **Exceptions** | None — all students must have inquiry records even if converted same-day |
| **Approval Required** | None (data entry only) |
| **System Behavior** | Inquiry form is the entry point; enrollment form is disabled until inquiry exists |
| **Audit Requirements** | Inquiry creation, status changes, and converting-staff ID logged |
| **Acceptance Criteria** | AC: Attempting to create enrollment without inquiry record returns HTTP 422. AC: Inquiry record persists after enrollment is completed. |

---

### CBR-ADM-002: Unique Admission Number Assignment
| Field | Value |
|---|---|
| **ID** | CBR-ADM-002 |
| **Title** | Each student receives a unique, system-generated admission number |
| **Scope** | Student Registration |
| **Responsible Role** | System (auto-generated) |
| **Preconditions** | Student record is being created |
| **Rule Statement** | Admission number format: `PA-{YYYY}-{NNNNNN}` where YYYY = admission year, NNNNNN = 6-digit zero-padded sequential number. Example: `PA-2024-000001`. Admission numbers are never reused, even if the student record is deleted. |
| **Exceptions** | None — the system always assigns; staff cannot manually set admission numbers |
| **Approval Required** | None |
| **System Behavior** | Database sequence or UUID-derived counter. Backend generates and validates uniqueness before commit. |
| **Audit Requirements** | Admission number assignment logged with timestamp and creating staff |
| **Acceptance Criteria** | AC: Two students created simultaneously have different admission numbers. AC: Admission number format matches regex `PA-\d{4}-\d{6}`. AC: Deleted student's admission number is not re-assigned. |

---

### CBR-ADM-003: Mandatory Guardian Information
| Field | Value |
|---|---|
| **ID** | CBR-ADM-003 |
| **Title** | At least one guardian record is mandatory for enrollment |
| **Scope** | Student Registration |
| **Responsible Role** | Admission Counselor |
| **Preconditions** | Student enrollment form is being submitted |
| **Rule Statement** | Every enrolled student must have at least one guardian record with: guardian name, relationship, and at least one contact number. |
| **Exceptions** | Adult students (age ≥ 18) may self-register with their own contact as guardian |
| **Approval Required** | None |
| **System Behavior** | API validates at least one guardian exists before enrollment confirmation |
| **Audit Requirements** | Guardian creation and updates logged |
| **Acceptance Criteria** | AC: Enrollment submission without guardian returns HTTP 422. AC: Guardian with only name (no contact) is rejected. |

---

### CBR-ADM-004: Trial Class Period
| Field | Value |
|---|---|
| **ID** | CBR-ADM-004 |
| **Title** | Trial class period and conversion |
| **Scope** | Admissions, Batch Enrollment |
| **Responsible Role** | Admission Counselor |
| **Preconditions** | Student inquiry exists, batch has available seats |
| **Rule Statement** | `[PROPOSED]` A student may attend up to **3 trial classes** in a batch before formal enrollment is required. After 3 trial classes, the student must enroll (pay registration fee) or discontinue. Trial attendance is recorded but does not count toward attendance percentage calculations. |
| **Exceptions** | Institute Admin may extend trial period for exceptional cases with documented reason |
| **Approval Required** | `[OPEN DECISION: PDR-007]` — Exact trial class count and fee (₹0 vs nominal) requires owner approval |
| **System Behavior** | Student status = `trial`; attendance records created with `trial` flag; batch seat count includes trial students toward capacity |
| **Audit Requirements** | Trial class attendance logged; conversion to enrolled logged with converting-staff ID |
| **Acceptance Criteria** | AC: Trial student can attend up to 3 classes without payment. AC: 4th class attempt is blocked with "enrollment required" message. AC: Trial attendance not included in attendance percentage report. |

---

### CBR-ADM-005: Enrollment Status State Machine
| Field | Value |
|---|---|
| **ID** | CBR-ADM-005 |
| **Title** | Valid enrollment status transitions |
| **Scope** | Student Enrollment |
| **Responsible Role** | System (enforced), Institute Admin (approves transitions) |
| **Preconditions** | Student enrollment record exists |
| **Rule Statement** | Enrollment status follows this state machine: |

```
inquiry → trial → enrolled → [active]
                                  ↓         ↓
                            transferred  withdrawn
                                  ↓
                             re-enrolled
                                  ↓
                            completed/graduated
```

Valid transitions:
- `inquiry` → `trial` (Admission Counselor)
- `trial` → `enrolled` (Admission Counselor + payment of registration fee)
- `enrolled` → `active` (System, after first payment)
- `active` → `transferred` (Institute Admin approval)
- `active` → `withdrawn` (Institute Admin approval)
- `withdrawn` → `re-enrolled` (Institute Admin + owner approval)
- `active` → `completed` (System, at year end)

Invalid transitions (system rejects):
- `completed` → any status
- `withdrawn` → `active` (must go through `re-enrolled`)

| **Exceptions** | Owner can force-override any status with documented reason |
| **Approval Required** | Transfer and withdrawal require Institute Admin. Re-enrollment requires owner. |
| **System Behavior** | Backend validates transition before updating. Invalid transitions return HTTP 409. |
| **Audit Requirements** | Every status change logged: old status, new status, reason, approving staff ID |
| **Acceptance Criteria** | AC: Direct `withdrawn` → `active` returns HTTP 409. AC: `completed` → any returns HTTP 409. AC: Valid transitions succeed and generate audit log. |

---

### CBR-ADM-006: Batch Transfer Rules
| Field | Value |
|---|---|
| **ID** | CBR-ADM-006 |
| **Title** | Student batch transfer conditions |
| **Scope** | Batch Management, Enrollment |
| **Responsible Role** | Academic Coordinator, Institute Admin |
| **Preconditions** | Student is in `active` enrollment; destination batch has available capacity |
| **Rule Statement** | A student may be transferred to a different batch (same course/standard) subject to: (a) destination batch has available capacity, (b) transfer date is not in an examination blackout period, (c) Institute Admin approves, (d) no outstanding fee overdue >30 days. Attendance records remain with the original batch. Transfer date is recorded. |
| **Exceptions** | Emergency transfers (medical, safety) may bypass (b) and (d) with owner approval |
| **Approval Required** | Institute Admin |
| **System Behavior** | Transfer creates a new `batch_enrollment` record; old record is marked `transferred`; both records retain timestamps |
| **Audit Requirements** | Transfer logged: from-batch, to-batch, reason, approving admin, transfer date |
| **Acceptance Criteria** | AC: Transfer to full batch (capacity reached) returns error. AC: Transfer with overdue fees >30 days requires override flag and admin approval. AC: Post-transfer attendance reports for original batch still show student's pre-transfer records. |

---

### CBR-ADM-007: Withdrawal and Refund Trigger
| Field | Value |
|---|---|
| **ID** | CBR-ADM-007 |
| **Title** | Withdrawal process and refund eligibility |
| **Scope** | Enrollment, Fee Management |
| **Responsible Role** | Institute Admin (withdrawal), Accountant (refund) |
| **Preconditions** | Student is in `active` enrollment |
| **Rule Statement** | Withdrawal requires: (a) written request from guardian, (b) Institute Admin approval, (c) no outstanding dues. Upon withdrawal, refund eligibility is calculated per the Refund Policy (see FEE_POLICY_AND_ACCOUNTING.md §5). Enrollment status → `withdrawn`. |
| **Exceptions** | `[OPEN DECISION: PDR-008]` — Refund policy for mid-term withdrawal requires owner decision |
| **Approval Required** | Institute Admin for withdrawal; Owner for refund approval above threshold |
| **System Behavior** | Withdrawal creates a pending refund request if overpayment exists; status update blocked if outstanding dues exist |
| **Audit Requirements** | Withdrawal logged with guardian request date, admin approval, refund amount calculated |
| **Acceptance Criteria** | AC: Withdrawal with outstanding dues returns error unless admin overrides with documented reason. AC: Withdrawal generates refund calculation automatically. AC: Status change to `withdrawn` triggers audit log entry. |

---

## Section 2: Student Profile Rules

### CBR-STU-001: Student Data Completeness
| Field | Value |
|---|---|
| **ID** | CBR-STU-001 |
| **Title** | Mandatory fields for student profile |
| **Scope** | Student Registration |
| **Responsible Role** | Admission Counselor |
| **Rule Statement** | The following fields are mandatory for student profile creation: full name, date of birth, gender, admission date, standard/course, guardian name, guardian contact number. Optional but encouraged: photo, Aadhar number (see DPS-001 for encryption requirement), previous school name, medium of instruction. |
| **Exceptions** | Date of birth may be approximate for very young students with note |
| **Approval Required** | None |
| **System Behavior** | API returns HTTP 422 for missing mandatory fields with field-specific error messages |
| **Audit Requirements** | Profile creation and all updates logged |
| **Acceptance Criteria** | AC: Student creation without full name → HTTP 422. AC: Student creation without guardian → HTTP 422. AC: Student creation with all required fields → HTTP 201. |

---

### CBR-STU-002: Student Search and Privacy
| Field | Value |
|---|---|
| **ID** | CBR-STU-002 |
| **Title** | Student search returns are role-filtered |
| **Scope** | Student Management |
| **Responsible Role** | System |
| **Rule Statement** | Search results show different fields based on role: Teachers see academic data only (no financial data). Accountants see financial data and contact info. Admission Counselors see all except financial history. Parents/Guardians see only their own child's data. |
| **Exceptions** | Super Admin sees all fields |
| **Approval Required** | None (system-enforced) |
| **System Behavior** | API serializers use role-based field filtering |
| **Audit Requirements** | Bulk student data exports logged with requester ID |
| **Acceptance Criteria** | AC: Teacher token calling `/students/{id}` does not receive fee balance. AC: Parent token returns only their child's record. |

---

## Section 3: Rejoining Rules

### CBR-ADM-008: Rejoining After Withdrawal
| Field | Value |
|---|---|
| **ID** | CBR-ADM-008 |
| **Title** | Conditions for re-enrollment after withdrawal |
| **Scope** | Admissions, Enrollment |
| **Responsible Role** | Institute Admin, Owner |
| **Preconditions** | Student has `withdrawn` status; has been absent for at least 30 days |
| **Rule Statement** | Re-enrollment requires: (a) owner approval, (b) settlement of any outstanding dues from previous enrollment, (c) fresh fee assignment for the current academic year, (d) new enrollment record linked to original student ID (admission number preserved). |
| **Exceptions** | `[OPEN DECISION: PDR-009]` — Gap penalty fee (if any) requires owner decision |
| **Approval Required** | Owner approval |
| **System Behavior** | New `student_enrollment` row created; old enrollment updated to `re-enrolled`; new fee invoice generated; original student ID preserved |
| **Audit Requirements** | Re-enrollment logged with gap period, owner approval record, new fee invoice ID |
| **Acceptance Criteria** | AC: Re-enrollment without outstanding dues clearance is blocked. AC: Re-enrollment uses original admission number. AC: New enrollment record exists alongside old withdrawn record. |

---

## Section 4: Course Completion

### CBR-ADM-009: Course Completion Criteria
| Field | Value |
|---|---|
| **ID** | CBR-ADM-009 |
| **Title** | Criteria for marking a student as course-completed |
| **Scope** | Academic Management |
| **Responsible Role** | Academic Coordinator, System |
| **Preconditions** | Academic year is being closed |
| **Rule Statement** | A student may be marked `completed` when: (a) minimum attendance threshold met (see PDR-005), (b) all fee obligations for the year are settled or formally waived, (c) Academic Coordinator confirms. Competitive-exam students completing their course year are marked `completed`; school students who pass to next standard are `graduated`. |
| **Exceptions** | Students with pending fee dues may be marked completed only with Owner approval and formal fee waiver |
| **Approval Required** | Academic Coordinator for completion; Owner for completion with outstanding dues |
| **System Behavior** | Bulk year-end promotion tool marks eligible students; individual override requires elevated role |
| **Audit Requirements** | Completion logged per student with criteria-check results |
| **Acceptance Criteria** | AC: Student with <75% attendance cannot be auto-completed. AC: Student with outstanding dues cannot be completed without override. AC: Completed students appear in alumni reports. |

---

*End of COACHING_BUSINESS_RULES.md*

