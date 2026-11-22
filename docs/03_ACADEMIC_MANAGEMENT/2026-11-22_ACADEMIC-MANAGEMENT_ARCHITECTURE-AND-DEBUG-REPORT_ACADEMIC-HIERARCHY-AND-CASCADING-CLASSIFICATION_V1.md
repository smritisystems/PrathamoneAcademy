---
title: "Academic Hierarchy, Entity Classification & Cascading Filter Architecture Audit Report"
module: "03_ACADEMIC_MANAGEMENT"
category: "ARCHITECTURE-AND-DEBUG-REPORT"
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
tags: ["academic-hierarchy", "boards", "standards", "batches", "subjects", "students", "cascading-filters", "ssot", "audit"]
entities: ["Board", "Standard", "Division", "CanonicalSubject", "SubjectMapping", "Student", "StudentEnrollment", "TimetableEntry", "Examination", "FeeStructure"]
api_routes: ["/api/v1/boards/*", "/api/v1/standards/*", "/api/v1/divisions/*", "/api/v1/subjects/*", "/api/v1/students/*"]
related_modules: ["03_ACADEMIC_MANAGEMENT", "04_STUDENT_MANAGEMENT", "08_EXAMINATION", "09_FEES_PAYMENTS", "25_BUSINESS_REQUIREMENTS"]
---

# PRATHAMONE EDUOS — ACADEMIC HIERARCHY, ENTITY CLASSIFICATION & CASCADING FILTER ARCHITECTURE AUDIT REPORT

**Document ID:** REP-2026-EDUOS-ACAD-014  
**Product:** PrathamOne EduOS (Coaching Institute Edition)  
**Baseline Version:** 1.0.0  
**Architect:** Jawahar R Mallah  
**Organization:** Smritisys & AITDL Networks  
**Date:** 2026-11-22  
**Status:** APPROVED & MANDATORY ARCHITECTURAL DIRECTIVE  

---

## 1. EXECUTIVE SUMMARY & PROBLEM STATEMENT

Coaching institutes operate multi-curriculum, multi-grade academic operations spanning national boards (CBSE, ICSE), state boards (e.g., Maharashtra SSC / HSC), and international curricula (Cambridge IGCSE, IB). In such environments, academic data integrity depends entirely on rigorous entity classifications and unambiguous relational hierarchies:
```
Academic Year (AY) ──► Board ──► Grade / STD ──► Batch / Division ──► Subject / Student / Timetable
```

### The User Problem
When end-users navigate academic workspaces, admission centres, batch directories, attendance registers, or exam setups:
1. Selecting **Standard X (Grade X)** must strictly display *only* data relevant to Standard X (its active batches, curriculum subjects, enrolled students, timetable slots, and scheduled exams).
2. Selecting **Board B** must filter standards, batches, and subjects down to that specific curriculum.
3. Selecting **Batch Y** must resolve exactly to the student roster, faculty assignments, classroom room, and timetable sessions of that specific cohort.

This report provides:
- The canonical domain classification of **Board, Grade/STD, Batch, Subject, Student**, and all connected academic entities under Single Source of Truth (SSOT) rules.
- A forensic debugging audit of current schemas, API endpoints, and frontend pages.
- Eight (8) critical bugs/disconnections discovered where unfiltered or cross-board data leaks into view.
- The authoritative cascading dependency matrix and the implementation roadmap to enforce zero-leakage cascading filters across all workspaces.

---

## 2. CANONICAL ENTITY CLASSIFICATIONS (SSOT DOMAIN TAXONOMY)

Under **POL-2026-EDUOS-001 (SSOT)** and **POL-2026-EDUOS-011 (Canonical Master Reuse)**, educational entities are categorized into five distinct architectural classifications:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       CANONICAL ACADEMIC TAXONOMY                           │
├────────────────────────────────┬───────────────────┬────────────────────────┤
│ Entity                         │ Classification    │ Canonical Table        │
├────────────────────────────────┼───────────────────┼────────────────────────┤
│ Academic Year (AY)             │ Temporal Context  │ academic_years         │
│ Board                          │ Governance Master │ boards                 │
│ Grade / STD (Standard)         │ Level Master      │ standards              │
│ Batch / Division (Section)     │ Operational Unit  │ divisions              │
│ Subject (Discipline Identity)  │ Canonical Master  │ canonical_subjects     │
│ Subject (Curriculum Bridge)    │ Relational Map    │ subject_mappings       │
│ Student (Person Profile)       │ Person Master     │ students               │
│ Student Enrollment             │ Placement Ledger  │ student_enrollments    │
│ Faculty / Teacher Assignment   │ Resource Map      │ users + teacher_assign │
│ Timetable Entry (Session Slot) │ Schedule Map      │ timetable_entries      │
│ Examination & Marks            │ Assessment Ledger │ examinations, exam_mark│
│ Fee Structure                  │ Financial Config  │ fee_structures         │
└────────────────────────────────┴───────────────────┴────────────────────────┘
```

### 2.1 Board (Educational Examination Board / Curriculum Authority)
- **Table:** `boards`
- **Definition:** The statutory educational authority prescribing syllabus, examination guidelines, and certification format (e.g., CBSE, ICSE, Maharashtra State Board / SSC, Cambridge IGCSE, IB).
- **Attributes:** `id`, `institution_id`, `name`, `code`, `is_active`.
- **Relationship:** 1 Board ──► Many Batches (`divisions.board_id`), 1 Board ──► Many Curriculum Subject Mappings (`subject_mappings.board_id`).
- **SSOT Mandate:** Boards are institution-level masters. A board does not hold students or teachers directly; it defines curriculum standards and batch affiliations.

### 2.2 Grade / Standard (STD / Class Level)
- **Table:** `standards`
- **Definition:** The pedagogical level of education (e.g., Standard 8, Standard 9, Standard 10, Standard 11, Standard 12).
- **Attributes:** `id`, `institution_id`, `name` ("Standard 10"), `level` (10), `is_active`.
- **Constraint:** Unique index on `(institution_id, level)` where `is_active = true`.
- **SSOT Mandate (Rule 011):** Standards are **universal across curricula**. "Standard 10" is registered **once** per institution. It is strictly prohibited to create "CBSE Standard 10" and "ICSE Standard 10" as separate records in `standards`. Curricular distinction occurs exclusively at the Batch (`divisions`) and Subject Mapping (`subject_mappings`) layers!

### 2.3 Batch / Division (Operational Classroom Cohort)
- **Table:** `divisions`
- **Definition:** The operational unit of learning. A cohort of students studying together at a scheduled time, in a specific classroom, under an assigned class teacher.
- **Attributes:** `id`, `standard_id` (FK), `board_id` (FK, nullable), `name` ("Batch Alpha", "Morning Shift"), `code`, `capacity` (e.g. 40), `room_number`, `schedule_timing`, `class_teacher_id` (FK to `users`), `status` ('active', 'archived').
- **Crucial Architectural Role:** A Batch is where **Standard and Board converge**! A Batch binds `standard_id` (e.g., STD 10) + `board_id` (e.g., ICSE) + Room + Teacher + Schedule.

### 2.4 Subject (Two-Tier Canonical Architecture)
Under Rule 011, subjects are decoupled into:
1. **Canonical Subject Master (`canonical_subjects`):**
   - Authoritative identity of the academic discipline (e.g., "Mathematics", "Science", "Physics", "English Literature").
   - Registered once in the catalog, regardless of how many boards or grades teach it.
2. **Subject Mapping (`subject_mappings`):**
   - The curriculum applicability bridge. Binds `canonical_subject_id` + `standard_id` + `board_id` + `academic_year_id`.
   - Holds standard- and board-specific grading parameters: `curriculum_code` (e.g. "CBSE-041"), `max_marks` (e.g. 100), `pass_marks` (e.g. 33), `is_optional` (core vs elective), `display_order`.
3. **Legacy Bridge (`subjects`):**
   - Retained for backward-compatible foreign keys to historical exam marks, study materials, and timetable entries, referencing `canonical_subjects.id`.

### 2.5 Student & Student Enrollment
1. **Student Master (`students`):**
   - Canonical person identity: `admission_number`, legal name, date of birth, gender, Aadhaar, blood group, guardian details, address, contact info.
   - Independent of academic year or standard.
2. **Student Enrollment (`student_enrollments`):**
   - The academic placement record binding `student_id` + `academic_year_id` + `standard_id` + `division_id` (batch) + `roll_number` + `status` ('active', 'withdrawn', 'completed', 'graduated').
   - A student belongs to a Board *via* their assigned Batch (`division.board_id`).

---

## 3. FORENSIC AUDIT & DEBUGGING FINDINGS

A deep codebase inspection across `backend/app/models/`, `backend/app/api/v1/endpoints/`, and `frontend/src/pages/` revealed eight (8) critical architectural disconnects:

### Finding 1: `list_students` API Endpoint Completely Omits `board_id`
- **Location:** `backend/app/api/v1/endpoints/students.py` (Line 216)
- **Defect:** `list_students` accepts `standard_id`, `division_id`, `academic_year_id`, `search`, `status`, `include_inactive`. It has **no `board_id` parameter**!
- **Consequence:** If a user selects Board "ICSE" and Standard "10", the frontend cannot query students by Board. The backend returns all students in Standard 10 across CBSE, ICSE, and SSC combined.

### Finding 2: `list_standards(board_id=X)` Fails for Boards Without Active Divisions
- **Location:** `backend/app/api/v1/endpoints/standards.py` (Line 289-294)
- **Defect:** Standards are filtered by board via:
  ```python
  if board_id:
      query = (
          query.join(Division, Division.standard_id == Standard.id)
          .where(Division.board_id == board_id, Division.is_active == True)
          .distinct()
      )
  ```
- **Consequence:** If an institute registers a new Board (e.g., Cambridge / IGCSE) but has not yet created a division, `list_standards(board_id=X)` returns an **empty array** (`[]`). Cascading standard dropdowns become empty, preventing the administrator from selecting a standard to create the very first batch!

### Finding 3: Orphaned Batches Created in `Batches.tsx` Without `board_id`
- **Location:** `frontend/src/pages/Batches.tsx` (Line 34-39, 223-285)
- **Defect:** In `Batches.tsx`, `batchForm` contains `{ standard_id, name, capacity, room_number }`. The `board_id` field is completely missing!
- **Consequence:** Batches created from the dedicated Batches page are saved with `board_id = NULL`. In `AcademicWorkspace.tsx` Overview (which groups by Board ──► Standard ──► Batch), these batches are orphaned and invisible. Students enrolled in these batches have no board linkage.

### Finding 4: `AcademicWorkspace.tsx` Batches Tab Ignores Top Filter Bar
- **Location:** `frontend/src/pages/AcademicWorkspace.tsx` (Line 3038-3042)
- **Defect:** When navigating to the "Batches" tab (`activeTab === 'batches'`), the page maps directly over `{batches.map((batch) => ...)}`. It completely ignores `selectedBoardId` and `selectedStandardId` from the global header filter bar!
- **Consequence:** Selecting "Standard 10" in the top bar has zero effect on the Batches directory — batches for Standard 5, 6, 7, 8, 9, 10, 11, 12 all remain displayed simultaneously.

### Finding 5: `Students.tsx` Filter Bar Has No Board Filter
- **Location:** `frontend/src/pages/Students.tsx` (Line 124-126, 155-165)
- **Defect:** The Master Directory filter bar only exposes `standardId` and `divisionId`.
- **Consequence:** Users cannot filter the student register by curriculum board. When Standard 10 is selected, batches from all boards are merged into one flat list.

### Finding 6: `AddStudent.tsx` Omits Board Selection During Admission
- **Location:** `frontend/src/pages/AddStudent.tsx` (Line 56, 98-106, 368-395)
- **Defect:** The student admission form prompts for `standard_id` and `division_id`, but has no `board_id`.
- **Consequence:** Staff admitting a student cannot filter or verify the board. If batch names do not explicitly include board prefixes (e.g. "Batch A" instead of "10-CBSE-A"), students are frequently enrolled into the wrong curriculum cohort.

### Finding 7: `CascadingFilters.tsx` Is Isolated to Only Two Pages
- **Location:** `frontend/src/components/CascadingFilters.tsx`
- **Defect:** `CascadingFilters.tsx` contains clean 4-tier cascading logic (AY ──► Board ──► Standard ──► Batch), but it is imported **only** in `Dashboard.tsx` and `Payments.tsx`. It is completely absent from `Students.tsx`, `Batches.tsx`, `Attendance.tsx`, and `Examinations.tsx`.

### Finding 8: `Examination` and `FeeStructure` Lack Direct `board_id`
- **Location:** `backend/app/models/exam.py` (Line 35), `backend/app/models/fee.py` (Line 59)
- **Defect:** `examinations` and `fee_structures` only link to `standard_id`.
- **Consequence:** An exam scheduled for Standard 10 applies to all students in Standard 10 across CBSE and ICSE unless filtered by division or distinct examination entities. Fee structures cannot natively enforce different tuition amounts for CBSE vs ICSE without naming workarounds.

---

## 4. THE CASCADING FILTER ARCHITECTURE & DEPENDENCY MATRIX

To achieve 100% accurate data isolation, all selection controls across PrathamOne EduOS must adhere to the **Strict Downward Cascade & Upward Reset Rule**:

```
Level 1: Academic Year (AY)
   │
   ▼
Level 2: Board (All / CBSE / ICSE / SSC / Cambridge / IB)
   │
   ▼
Level 3: Grade / STD (All Standards in Board / STD 8, 9, 10, 11, 12)
   │
   ├──────────────────────────────┬──────────────────────────────┐
   ▼                              ▼                              ▼
Level 4: Batch / Division      Level 4: Subject              Level 4: Student Register
(Batches in Board & STD)    (Mapped to Board & STD)      (Enrolled in Board & STD)
   │                              │                              │
   └──────────────┬───────────────┘                              │
                  ▼                                              │
      Level 5: Timetable Slot                                    │
    (Batch + Subject + Teacher)                                  │
                  │                                              │
                  └──────────────────────┬───────────────────────┘
                                         ▼
                             Level 6: Attendance & Exams
                            (Specific Batch & Subject)
```

### 4.1 Downward Cascade & State Reset Contract
When any filter level changes, dependent downstream filters MUST reset immediately:
1. **When Academic Year Changes:**
   - Reset: Student list, active enrollments, fees, exams, timetable slots.
   - Retain: Board master, Standard master, Canonical Subject master.
2. **When Board Changes:**
   - Cascade: Standard dropdown displays standards active in this Board (or all standards if board has no divisions yet).
   - Reset: Selected `standard_id = null`, selected `division_id = null`.
   - Downstream: Batch list, Subject list, and Student list filter strictly to that Board.
3. **When Standard (STD X) Changes:**
   - Cascade:
     - **Batches:** Division dropdown displays ONLY batches where `standard_id == STD X` (and `board_id == Board` if board is selected).
     - **Subjects:** Displays ONLY subjects mapped to `STD X` (via `subject_mappings` or `subjects`).
     - **Students:** Queries `studentsApi.list({ standard_id: STD X, board_id: Board })`.
     - **Exams:** Displays exams scheduled for `STD X`.
   - Reset: Selected `division_id = null`.
4. **When Batch / Division Changes:**
   - Cascade:
     - **Students:** Displays ONLY students actively enrolled in `division_id`.
     - **Roster & Seat Occupancy:** Displays capacity meter, enrolled count, and vacant seats.
     - **Class Teacher:** Displays the assigned class faculty.
     - **Timetable:** Displays weekly sessions for this specific batch.
     - **Attendance:** Pre-populates attendance roll call for this batch.

---

## 5. ACTIONABLE IMPLEMENTATION BLUEPRINT & REMEDIATION PLAN

### 5.1 Backend Remediation

#### Step 1: Add `board_id` Filter to `list_students`
In `backend/app/api/v1/endpoints/students.py`:
```python
@router.get("/")
async def list_students(
    standard_id: Optional[int] = None,
    division_id: Optional[int] = None,
    board_id: Optional[int] = None,  # ADDED
    academic_year_id: Optional[int] = None,
    search: Optional[str] = None,
    ...
):
    ...
    if standard_id or division_id or board_id or academic_year_id:
        query = query.join(StudentEnrollment, Student.id == StudentEnrollment.student_id)
        if board_id:
            # Join division to filter by board
            query = query.join(Division, StudentEnrollment.division_id == Division.id).where(
                Division.board_id == board_id
            )
        if standard_id:
            query = query.where(StudentEnrollment.standard_id == standard_id)
        if division_id:
            query = query.where(StudentEnrollment.division_id == division_id)
        if academic_year_id:
            query = query.where(StudentEnrollment.academic_year_id == academic_year_id)
```

#### Step 2: Fallback in `list_standards(board_id=X)`
In `backend/app/api/v1/endpoints/standards.py`:
When `board_id` is supplied but no divisions exist yet, fallback to all standards or standards linked via `subject_mappings` so the UI does not blank out during onboarding:
```python
if board_id:
    # Check if divisions or subject_mappings exist for this board
    div_exists = (await db.execute(
        select(func.count(Division.id)).where(Division.board_id == board_id, Division.is_active == True)
    )).scalar() or 0
    if div_exists > 0:
        query = query.join(Division, Division.standard_id == Standard.id).where(
            Division.board_id == board_id, Division.is_active == True
        ).distinct()
    else:
        # Fallback to institution standards so admin can assign the first batch
        pass
```

### 5.2 Frontend Remediation

#### Step 1: Fix Batch Directory Filtering in `AcademicWorkspace.tsx`
Replace the raw mapping on line 3040 with filtered batches:
```typescript
const displayBatches = useMemo(() => {
  return batches.filter((b) => {
    const matchBoard = selectedBoardId !== 'all' ? String(b.board_id) === String(selectedBoardId) : true
    const matchStandard = selectedStandardId !== 'all' ? String(b.standard_id) === String(selectedStandardId) : true
    const matchSearch = searchQuery.trim()
      ? b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.room_number?.toLowerCase().includes(searchQuery.toLowerCase())
      : true
    return matchBoard && matchStandard && matchSearch
  })
}, [batches, selectedBoardId, selectedStandardId, searchQuery])
```

#### Step 2: Add `board_id` to Batch Creation in `Batches.tsx`
Add `board_id` dropdown to `batchForm` and modal in `frontend/src/pages/Batches.tsx`:
- Fetch boards list via `boardsApi.list()`.
- Include `board_id: batchForm.board_id ? Number(batchForm.board_id) : undefined` in `batchMutation.mutate`.

#### Step 3: Add Board Filter & Cascading Dropdowns to `Students.tsx`
In `frontend/src/pages/Students.tsx`:
- Add `boardId` state.
- Filter divisions query: `queryKey: ['divisions', standardId, boardId]`, `divisionsApi.list({ standard_id: standardId, board_id: boardId })`.
- Pass `board_id: boardId` to `studentsApi.list`.

#### Step 4: Add Board Selector to Student Admission (`AddStudent.tsx`)
In `frontend/src/pages/AddStudent.tsx`:
- Add Board dropdown before Standard/Batch selection.
- Filter batch options to only those belonging to the selected Board and Standard.

---

## 6. VERIFICATION & COMPLIANCE

This architecture and audit specification complies fully with:
- **POL-2026-EDUOS-001 (SSOT & Anti-Duplication):** Single canonical definition for Board, Standard, Batch, Subject, and Student.
- **POL-2026-EDUOS-011 (Canonical Master Reuse):** Standards and Subjects registered once; board distinctions mapped at division/mapping layers.
- **POL-2026-EDUOS-010 (View-First Governance):** Filtering remains read-only; mutations require explicit edit mode.

```bash
# Verification commands executed:
python -m pytest backend/tests/test_board_class_structure.py -v
python tools/docs_manager.py reindex
python tools/docs_manager.py validate
python scripts/manage_headers.py check
```
