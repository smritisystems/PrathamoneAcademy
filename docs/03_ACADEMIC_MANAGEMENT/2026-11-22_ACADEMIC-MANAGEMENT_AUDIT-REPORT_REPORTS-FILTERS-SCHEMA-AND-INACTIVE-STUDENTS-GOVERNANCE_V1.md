---
title: "Reports, Cascading Filters, Database Schemas & Inactive Student Governance Forensic Audit"
module: "03_ACADEMIC_MANAGEMENT"
category: "AUDIT-REPORT"
document_type: "REPORT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-22"
updated_date: "2026-11-22"
author: "Jawahar R Mallah"
organization: "Smritisys & AITDL Networks"
status: "Approved"
tags: ["reports", "cascading-filters", "inactive-students", "transferred-students", "database-schema", "financial-governance", "ssot", "audit"]
entities: ["Student", "StudentEnrollment", "Division", "Standard", "Board", "FeeInvoice", "Payment", "Attendance", "Examination", "FeeStructure"]
api_routes: ["/api/v1/reports/*", "/api/v1/students/*", "/api/v1/divisions/*", "/api/v1/fees/*", "/api/v1/attendance/*"]
related_modules: ["03_ACADEMIC_MANAGEMENT", "04_STUDENT_MANAGEMENT", "07_ATTENDANCE", "09_FEES_PAYMENTS", "10_FINANCE_ACCOUNTING", "25_BUSINESS_REQUIREMENTS"]
---

# PRATHAMONE EDUOS — REPORTS, CASCADING FILTERS, DATABASE SCHEMAS & INACTIVE STUDENT GOVERNANCE FORENSIC AUDIT

**Document ID:** REP-2026-EDUOS-ACAD-015  
**Product:** PrathamOne EduOS (Coaching Institute Edition)  
**Baseline Version:** 1.0.0  
**Architect:** Jawahar R Mallah  
**Organization:** Smritisys & AITDL Networks  
**Date:** 2026-11-22  
**Status:** APPROVED & MANDATORY ENGINEERING DIRECTIVE  

---

## 1. EXECUTIVE OVERVIEW & AUDIT SCOPE

This comprehensive forensic audit addresses the four fundamental operational integrity questions of **PrathamOne EduOS**:
1. **Reports & Filter Alignment:** Are all reports and filter bars displaying accurate data strictly scoped to the active workspace tab and selected parameters?
2. **Database Schemas & Field Completeness:** Are all tables, foreign keys, indexes, and constraints properly configured, or are structural schema corrections required?
3. **Inactive & Transferred Students Impact:** Are inactive, withdrawn, or transferred students present in the system, how do they alter financial and academic metrics, and what global safeguards govern them?
4. **Architectural Remediation Roadmap:** What concrete corrections must be deployed across backend endpoints and frontend components to guarantee 100% data fidelity?

---

## 2. FORENSIC VERIFICATION: INACTIVE & TRANSFERRED STUDENTS IN LIVE DATA

A deep live database audit (`AsyncSessionLocal` inspection across 84 student records) yielded significant findings:
- **Total Students in Master:** 84 students
- **Active Students:** 83 students
- **Inactive / Withdrawn Students:** 1 student

### 2.1 Case Study 1: Inactive Student #142 (Satyam)
- **Identity:** Student ID 142, Admission # `PA-2024-000014`, Name: `Satyam`
- **Exit Date:** `2026-11-05`, **Exit Reason:** `Discontinued`
- **Academic Placement:** Enrollment ID 142 in Standard 9, Division 7 (status: `inactive`)
- **Historical Activity:** 35 daily attendance sessions, 8 exam marks
- **Financial Ledger Balance:**
  - Invoice ID 24 (`INV-2026-0142`): Net Amount: **Rs. 80,000.00**
  - Paid Amount (3 Receipts): **Rs. 22,000.00** (Rs. 8,000 + Rs. 8,000 + Rs. 6,000)
  - **Unpaid Outstanding Dues:** **Rs. 58,000.00** (status: `partial`)

### 2.2 Case Study 2: Transferred Students in Division 7 (The Enrollment Status Flaw)
An inspection of Division 7 revealed a critical distinction between **Student Status** and **Enrollment Status**:
```
Division 7 Enrollment Records:
├── Active Enrollments:      14 students (Student.is_active = True,  Enrollment.status = 'active')
├── Transferred Enrollments: 11 records  (Student.is_active = True,  Enrollment.status = 'transferred')
└── Inactive Enrollments:     1 student  (Student.is_active = False, Enrollment.status = 'inactive')
Total Records in Div 7:      26 records
```
- **The Core Flaw Discovered:** In `backend/app/api/v1/endpoints/students.py` (`list_students`), when `division_id=7` is queried:
  ```python
  if division_id:
      query = query.join(StudentEnrollment).where(StudentEnrollment.division_id == division_id)
  ```
  It filters `Student.is_active == True`, but **fails to check `StudentEnrollment.status == 'active'`**!
- **Consequence:** Student ID 137 (`Roudrita`), who was transferred out of Division 7 to another batch, has 11 historical transferred records. `list_students(division_id=7)` returns Roudrita as an active student of Division 7 (15 students instead of 14)!
- **Attendance & Roster Corruption:** When a teacher takes attendance for Division 7, Roudrita appears on Division 7's roll call even though she no longer studies in that section!

---

## 3. HOW INACTIVE & TRANSFERRED STUDENTS AFFECT THE DATA

```
┌──────────────────────────────┬──────────────────────────────┬──────────────────────────────┐
│ Operational Subsystem        │ Unmitigated Risk / Impact    │ Governed SSOT Solution       │
├──────────────────────────────┼──────────────────────────────┼──────────────────────────────┤
│ 1. Classroom Batch Capacity  │ Withdrawn/transferred pupils │ Count ONLY                   │
│    & Occupancy Meters        │ falsely occupy classroom     │ StudentEnrollment.status =   │
│                              │ capacity and block seats.    │ 'active'.                    │
├──────────────────────────────┼──────────────────────────────┼──────────────────────────────┤
│ 2. Daily Attendance Roll Call│ Inactive pupils marked       │ Restrict roll call to        │
│    & Automated SMS Alerts    │ absent, sending erroneous    │ Student.is_active = True AND │
│                              │ distress alerts to parents.  │ Enrollment.status = 'active'.│
├──────────────────────────────┼──────────────────────────────┼──────────────────────────────┤
│ 3. Examination Admit Cards   │ Hall tickets printed for     │ Examination rosters must     │
│    & Marks Entry Registers   │ students no longer enrolled. │ join active enrollments only.│
├──────────────────────────────┼──────────────────────────────┼──────────────────────────────┤
│ 4. Active Fee Defaulters     │ Rs. 58,000 withdrawn debt    │ Segregate into two ledgers:  │
│    & Term Revenue Recovery   │ distorts current operational │ 1. Active Term Receivables   │
│                              │ collection targets.          │ 2. Former Students Recovery. │
├──────────────────────────────┼──────────────────────────────┼──────────────────────────────┤
│ 5. Statutory Tax & Audit     │ Deleting records destroys    │ Strictly preserve historical │
│    Ledger (Invoices/Receipts)│ accounting audit trails.     │ invoices/receipts as         │
│                              │                              │ immutable legal records.     │
└──────────────────────────────┴──────────────────────────────┴──────────────────────────────┘
```

---

## 4. REPORTS & FILTER BAR AUDIT ACROSS WORKSPACES

### 4.1 Reporting Centre (`frontend/src/pages/Reports.tsx`)
1. **Missing Board Dropdown:**
   - On line 667, `selectedBoardId` state is defined and passed to API queries and export endpoints.
   - **Defect:** No `<select>` element for Board exists anywhere in the UI filter bar! Users cannot select a Board, and `selectedBoardId` remains perpetually blank (`''`).
2. **Uneven Standard Filter Exposure:**
   - Standard selector is conditionally rendered for only 7 specific reports.
   - **Defect:** It is hidden from `Universal Student Matrix (flexible-student-matrix)`, `Fee Collection Register`, `Outstanding Fees Register`, and `Consolidated Exam Marks`.
3. **Restricted Student Scope Filter:**
   - The Student Scope dropdown (`Institute Default` | `Active Only` | `Include All` | `Withdrawn` | `Completed`) is hardcoded to appear *only* for `student-master`, `collection`, and `outstanding`.
   - **Defect:** Missing from `student-attendance`, `fee-defaulters`, and `exam-merit`.

### 4.2 Academic Workspace (`frontend/src/pages/AcademicWorkspace.tsx`)
- On the Batches directory tab (Line 3040), the component maps directly over `{batches.map((batch) => ...)}`.
- **Defect:** It completely bypasses the global top filter bar's `selectedBoardId` and `selectedStandardId`. Selecting "Standard 10" leaves Standard 5 through 12 batches visible.

### 4.3 Students Master Directory (`frontend/src/pages/Students.tsx`)
- Contains Standard and Division dropdowns, but completely lacks a Board filter.
- `studentsApi.list` does not accept `board_id`.

### 4.4 Student Admission (`frontend/src/pages/AddStudent.tsx`)
- Admission form captures Standard and Division, but omits Board selection.

---

## 5. DATABASE SCHEMA & FIELD COMPLETENESS AUDIT

```
┌───────────────────────┬────────────────────────────────┬───────────────────────────┐
│ Table Name            │ Current Fields                 │ Missing Fields / Fixes    │
├───────────────────────┼────────────────────────────────┼───────────────────────────┤
│ boards                │ id, institution_id, name, code,│ COMPLIANT.                │
│                       │ is_active, created_at          │                           │
├───────────────────────┼────────────────────────────────┼───────────────────────────┤
│ standards             │ id, institution_id, name,      │ COMPLIANT (Universal      │
│                       │ level, is_active, created_at   │ Level Master).            │
├───────────────────────┼────────────────────────────────┼───────────────────────────┤
│ divisions             │ id, standard_id, board_id,     │ Schema is sound, but      │
│ (Batches)             │ name, code, capacity, room_no, │ frontend forms must NOT   │
│                       │ schedule_timing, status        │ allow null board_id.      │
├───────────────────────┼────────────────────────────────┼───────────────────────────┤
│ student_enrollments   │ id, student_id, academic_yr_id,│ CRITICAL GAP: Missing     │
│                       │ standard_id, division_id, roll,│ board_id. If division_id  │
│                       │ status, exit_date, exit_reason │ is null, board is lost.   │
├───────────────────────┼────────────────────────────────┼───────────────────────────┤
│ examinations          │ id, academic_year_id,          │ CRITICAL GAP: Missing     │
│                       │ standard_id, name, exam_type,  │ board_id and division_id. │
│                       │ max_marks, passing_marks       │ Exams apply to all boards.│
├───────────────────────┼────────────────────────────────┼───────────────────────────┤
│ fee_structures        │ id, institution_id, standard_id│ CRITICAL GAP: Missing     │
│                       │ academic_year_id, category_id, │ board_id. Cannot price    │
│                       │ name, amount, frequency        │ CBSE vs ICSE natively.    │
├───────────────────────┼────────────────────────────────┼───────────────────────────┤
│ canonical_subjects    │ id, institution_id, name, code,│ COMPLIANT (Rule 011 SSOT).│
│                       │ category, is_active            │                           │
├───────────────────────┼────────────────────────────────┼───────────────────────────┤
│ subject_mappings      │ id, canonical_subject_id,      │ COMPLIANT (Full curriculum│
│                       │ standard_id, board_id, yr_id,  │ bridge with max/pass marks│
│                       │ max_marks, pass_marks, optional│ and curriculum codes).    │
└───────────────────────┴────────────────────────────────┴───────────────────────────┘
```

---

## 6. GLOBAL ARCHITECTURAL SOLUTIONS & RECOMMENDATIONS

### Recommendation 1: Fix `list_students` Enrollment Status Join (High Priority)
In `backend/app/api/v1/endpoints/students.py`:
When filtering by `division_id` or `standard_id` without an explicit `status` override, enforce:
```python
if division_id or standard_id or academic_year_id:
    query = query.join(StudentEnrollment, Student.id == StudentEnrollment.student_id)
    if division_id:
        query = query.where(StudentEnrollment.division_id == division_id)
    if standard_id:
        query = query.where(StudentEnrollment.standard_id == standard_id)
    if academic_year_id:
        query = query.where(StudentEnrollment.academic_year_id == academic_year_id)
    
    # CRITICAL: If no status override provided, restrict to active enrollments
    if not status and include_inactive is not True:
        query = query.where(StudentEnrollment.status == "active")
```
*Effect:* Eliminates transferred students (like Roudrita in Div 7) from appearing in old batch rosters and attendance sheets.

### Recommendation 2: Add Board Selector to `frontend/src/pages/Reports.tsx`
Add a Board dropdown into the filter bar on line 1495:
```tsx
<div className="flex items-center gap-1.5">
  <span className="text-slate-500 font-semibold">Board:</span>
  <select
    value={selectedBoardId}
    onChange={(e) => {
      setSelectedBoardId(e.target.value)
      setSelectedStandardId('')
      setSelectedDivisionId('')
    }}
    className="px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-medium"
  >
    <option value="">All Boards</option>
    {boards.map((b: any) => (
      <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
    ))}
  </select>
</div>
```

### Recommendation 3: Add `board_id` to `student_enrollments`, `examinations`, and `fee_structures`
Generate an Alembic schema migration adding:
- `student_enrollments.board_id` (FK to `boards.id`, nullable)
- `examinations.board_id` (FK to `boards.id`, nullable)
- `fee_structures.board_id` (FK to `boards.id`, nullable)

### Recommendation 4: Two-Tier Financial Receivables Governance
Segregate fee reporting into two dedicated tabs:
1. **Active Term Outstanding Dues:** Invoices belonging to students where `Student.is_active = True`.
2. **Former Students Recovery Register:** Invoices belonging to students where `Student.is_active = False` (e.g. Satyam's Rs. 58,000 balance). This keeps active recovery targets clean while preserving full legal audit trails.

---

## 7. COMPLIANCE & VERIFICATION CHECKLIST

- **Document Indexed:** `docs/03_ACADEMIC_MANAGEMENT/2026-11-22_ACADEMIC-MANAGEMENT_AUDIT-REPORT_REPORTS-FILTERS-SCHEMA-AND-INACTIVE-STUDENTS-GOVERNANCE_V1.md`
- **Reindexing & Validation:** `docs_manager.py validate` passed with 0 errors.
- **Attribution Headers:** 100% compliant across 769 repository files.
