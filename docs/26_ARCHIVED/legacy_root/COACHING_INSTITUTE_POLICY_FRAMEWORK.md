# Coaching Institute Policy Framework
**Document ID**: CIPF-001  
**Version**: 1.0-DRAFT  
**Prepared By**: System Architect (AI-assisted)  
**Status**: DRAFT — Pending Owner Approval  
**Date**: 2024-01-01  
**Applies To**: Prashant Academy — All Campuses, Boards, and Courses

---

> **IMPORTANT**: This document contains **proposed defaults** (marked `[PROPOSED]`) and **open decisions** (marked `[OPEN DECISION: PDR-XXX]`) that require institute owner approval before becoming operative policy. Do not treat proposed values as approved policy.

---

## 1. Purpose and Scope

### 1.1 Purpose
This framework establishes the foundational policies, governance structure, and operational standards for Prashant Academy as a multi-mode coaching institute. It governs:
- School-board coaching (Standards 1–12, CBSE / ICSE / Maharashtra State Board)
- Competitive-exam coaching (JEE Main, JEE Advanced, NEET UG, NEET PG, and other configurable courses)
- Hybrid programs combining school-curriculum with competitive-exam preparation

### 1.2 Scope
This framework applies to:
- All students, guardians, and staff of Prashant Academy
- All physical campuses and online delivery modes
- All technology systems (SMS, mobile apps, portals)
- All financial transactions

### 1.3 Out of Scope
- Parent-institute (board/university) examination rules (those bodies govern themselves)
- Regulatory compliance beyond applicable Indian law
- Third-party vendor internal policies

---

## 2. Organizational Hierarchy

```
Prashant Academy (Institution)
│
├── Academic Year (e.g., 2024–25)
│
├── Boards / Programs
│   ├── CBSE (school-board coaching)
│   ├── ICSE (school-board coaching)
│   ├── Maharashtra State Board (school-board coaching)
│   ├── JEE Foundation (competitive)
│   ├── JEE Main + Advanced (competitive)
│   ├── NEET UG (competitive)
│   └── [Configurable] (extensible)
│
├── Courses / Standards / Levels
│   ├── School Mode:  Standard 1 → Standard 12
│   └── Competitive Mode: Foundation / Dropper / Repeater / Integrated
│
├── Subjects
│   ├── School: Mathematics, Science, English, Social Studies, etc.
│   └── Competitive: Physics, Chemistry, Mathematics, Biology
│
├── Batches
│   ├── Morning Batch (e.g., 7:00–10:00 AM)
│   ├── Afternoon Batch (e.g., 12:00–3:00 PM)
│   └── Weekend Batch
│
└── Students
    ├── Enrolled Students
    ├── Trial Students
    └── Alumni
```

### 2.1 Current Schema Status
> **[OPEN DECISION: PDR-001]**: The current database schema (`f:\PrashantAcademy\backend\app\models\`) supports the school hierarchy only (Institution → AcademicYear → Standard → Division → Student). The coaching-institute extensions (Board, Course, Batch, TeacherAssignment, BatchSchedule tables) **do not yet exist** and require owner approval to design and implement.

**Existing tables** (implemented):
- `institutions`, `academic_years`, `standards`, `divisions`
- `students`, `guardians`, `student_enrollments`
- `subjects`, `attendance`, `examinations`, `exam_marks`
- `fee_categories`, `fee_structures`, `student_fee_assignments`, `fee_invoices`, `fee_invoice_items`, `fee_installments`
- `payments`, `payment_allocations`, `payment_receipts`
- `users`, `roles`, `permissions`, `audit_logs`

**Tables requiring design/approval** (coaching extensions):
- `boards` — CBSE, ICSE, JEE, NEET, etc.
- `courses` — configurable programs per board
- `batches` — time-bound student groups
- `batch_schedules` — day/time/classroom per batch
- `teacher_batch_assignments` — which teacher teaches which batch
- `batch_enrollments` — student↔batch membership (replaces or extends `student_enrollments`)

---

## 3. Policy Hierarchy

```
Level 1: This Framework Document (CIPF-001) — supersedes all below
Level 2: Domain Policies (Fee, Attendance, Academic, Data Privacy)
Level 3: Standard Operating Procedures (SOPs)
Level 4: Staff Guidelines
Level 5: Batch/Course-Specific Rules
```

Higher levels supersede lower levels in case of conflict.

---

## 4. Guiding Principles

### 4.1 Student-First
Every policy decision must prioritize student learning outcomes and welfare. Administrative convenience is secondary.

### 4.2 Financial Transparency
All fee transactions are immutable, auditable, and traceable. No payment or receipt may be overwritten or deleted — only reversed with documented reasons.

### 4.3 Role-Based Access
Information is accessible only to personnel who need it for their defined role. No person has access beyond their role's defined scope.

### 4.4 Audit Everything
All state-changing operations generate audit log entries. Financial transactions, enrollment changes, and role assignments are irreversibly logged.

### 4.5 Explicit Over Implicit
No policy is assumed. Unresolved decisions are flagged as open decisions and escalated to the owner. The system must not make consequential decisions without human approval.

---

## 5. Academic Calendar

### 5.1 Academic Year Definition
- `[PROPOSED]` Standard academic year: **June 1 – May 31**
- Each academic year has a status: `planning`, `active`, `completed`
- Only one academic year per institution may be `active` at a time (enforced by database constraint)
- Academic years are identified by code (e.g., `2024-25`) and stored in the `academic_years` table

### 5.2 Coaching Cycles
- School-mode: Aligned with school academic year (June–May)
- Competitive-mode: May have independent cycles (e.g., JEE cycle: July–April; NEET cycle: August–May)
- `[OPEN DECISION: PDR-002]` — Should competitive-exam batches use the same `academic_years` table, or have an independent cycle model?

### 5.3 Key Dates
`[OPEN DECISION: PDR-003]` — The following dates require owner approval:
- Admission opening date
- Admission closing date
- Fee due dates per installment
- Late fee grace period
- Examination schedule policy

---

## 6. Delivery Modes

| Mode | Description | Current Support |
|---|---|---|
| Classroom (offline) | Physical classroom, fixed batch | ✅ (via Division) |
| Online live | Video conferencing per batch | ❌ (not implemented) |
| Recorded/self-paced | Asynchronous content | ❌ (not in scope) |
| Hybrid | Mix of classroom and online | ❌ (not in scope) |

`[PROPOSED]` Initial implementation covers **classroom mode only**. Online delivery is a future phase.

---

## 7. Quality Standards

### 7.1 Student-to-Teacher Ratio
`[OPEN DECISION: PDR-004]` — Recommended ratios:
- School standard coaching (Std 1–8): ≤ 40 students per teacher per subject
- School standard coaching (Std 9–12): ≤ 35 students per teacher per subject
- Competitive coaching (JEE/NEET): ≤ 30 students per batch

### 7.2 Minimum Attendance for Examination
`[OPEN DECISION: PDR-005]` — Recommended minimum: **75%** aggregate attendance per subject per term for eligibility to sit institute internal examinations.

### 7.3 Minimum Teaching Hours
`[OPEN DECISION: PDR-006]` — Recommended minimums:
- Per subject per week: ≥ 3 hours
- Per batch per week: ≥ 15 hours (all subjects combined)

---

## 8. Document Control

| Document | ID | Owner | Review Cycle |
|---|---|---|---|
| This framework | CIPF-001 | Institute Owner | Annual |
| Business Rules | CBR-001 | Institute Admin | Bi-annual |
| Fee Policy | FPA-001 | Accountant | Annual |
| Attendance/Test Policy | ATP-001 | Academic Coordinator | Annual |
| Role/Permission Matrix | RPM-001 | Institute Admin | Annual |
| Data Privacy | DPS-001 | Owner | Annual |
| Workflow Specifications | WFS-001 | Institute Admin | Bi-annual |

---

## 9. Revision History

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0-DRAFT | 2024-01-01 | AI Architect | Initial draft for owner review |

---

*End of COACHING_INSTITUTE_POLICY_FRAMEWORK.md*

