---
title: "Subject Master Duplication Audit, Canonical Catalogue Architecture & Standard Mappings Implementation Report"
module: "03_ACADEMIC_MANAGEMENT"
category: "IMPLEMENTATION-REPORT"
document_type: "REPORT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-07"
updated_date: "2026-11-07"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["academics", "subjects", "canonical-master", "curriculum-mapping", "ssot", "duplicate-prevention"]
entities: ["CanonicalSubject", "SubjectMapping", "Subject", "Standard", "Board"]
api_routes: ["/api/v1/subjects/canonical", "/api/v1/subjects/mappings", "/api/v1/subjects/duplicate-check", "/api/v1/subjects/"]
related_modules: ["03_ACADEMIC_MANAGEMENT", "08_EXAMINATION", "12_RBAC_SECURITY"]
---

# Subject Master Duplication Audit, Canonical Catalogue Architecture & Standard Mappings Implementation Report

**Product:** PrathamOne EduOS  
**Edition:** Coaching Institute Edition  
**Baseline Version:** 1.0.0  
**Product Architect:** Jawahar R Mallah  
**Organization:** AITDL — AI Technology & Development Lab  
**Module:** 03_ACADEMIC_MANAGEMENT  
**Date:** 2026-11-07  

---

## 1. Executive Summary & Forensic Audit Findings

During operational review of the Academic Management workspace, UI listings revealed repeated subject names mapped across different class levels:
- *Mathematics — MATH-4 — Class IV — ICSE*
- *Mathematics — MATH-8 — Class VIII — ICSE*
- *Mathematics — MATH-9 — Class IX — SSC*
- *Mathematics — MATH-10 — Class X — CBSE, ICSE*
- *English / English Language / English Language & Lit across Classes IV, VIII, IX, and X*

### 1.1 Forensic Database Diagnostic Findings
A comprehensive diagnostic script was executed against the live PostgreSQL database (`prashant_academy`), yielding the following audit metrics:
1. **Total Active Subject Records:** Exactly 20 active rows in the legacy `subjects` table.
2. **Duplication Distribution:**
   - **Mathematics:** 4 separate records (IDs 37, 13, 7, 1 for Classes IV, VIII, IX, X).
   - **Physics:** 2 separate records (IDs 8, 2 for Classes IX, X).
   - **Chemistry:** 2 separate records (IDs 9, 3 for Classes IX, X).
   - **Biology:** 2 separate records (IDs 10, 4 for Classes IX, X).
   - **Science:** 2 separate records (IDs 38, 14 for Classes IV, VIII).
   - **English Variants:** 4 records (IDs 39, 15, 11, 5 for Classes IV, VIII, IX, X).
   - **Social Studies / Social Science Variants:** 4 records (IDs 40, 16, 12, 6 for Classes IV, VIII, IX, X).
3. **Foreign Key Dependency Audit:**
   - `exam_marks`: 284 records referencing `subjects.id`.
   - `timetable_entries`: 67 records referencing `subjects.id`.
   - `study_materials`: 10 records referencing `subjects.id`.
   - `teacher_assignments`: 21 records referencing `subjects.id`.
   - **Total existing dependencies:** 382 active foreign key references.
4. **Root Cause Analysis:**
   The legacy table `subjects` contained `standard_id` as a mandatory foreign key directly on the subject row (`ForeignKey("standards.id"), nullable=False`), with a unique composite index `(standard_id, code)`. This schema forced administrators to create an entirely new subject row every time a discipline was taught in a different grade or class, shattering the Single Source of Truth (SSOT) principle.

---

## 2. Architectural Design & SSOT Decoupling

To resolve this structural defect without breaking existing foreign key integrity, two distinct responsibilities were established:

```
┌────────────────────────────────────────────────────────┐
│        CANONICAL SUBJECT MASTER (Single Source)        │
│  - id (PK)                                             │
│  - code: Permanent Subject Code (MATH001, ENG001)       │
│  - name: Authoritative Name (Mathematics, English)     │
│  - category: Academic Discipline (Science, Languages)  │
│  - aliases: Alternative terms (Math, Maths, Pure Math) │
│  - is_active: Boolean                                  │
└───────────────────────────┬────────────────────────────┘
                            │ 1 : N (Applicability)
                            ▼
┌────────────────────────────────────────────────────────┐
│           SUBJECT MAPPINGS (Applicability)             │
│  - id (PK)                                             │
│  - canonical_subject_id (FK -> canonical_subjects)     │
│  - standard_id (FK -> standards)                       │
│  - board_id (FK -> boards, optional)                   │
│  - curriculum_code: Syllabus Code (MATH-10, ENG-9)     │
│  - display_name: Board/Standard Name                   │
│  - max_marks / pass_marks                              │
│  - legacy_subject_id (FK -> subjects, bridges legacy)  │
└────────────────────────────────────────────────────────┘
```

### 2.1 Canonical Subject Master (`canonical_subjects`)
- Serves as the authoritative personification of an academic discipline.
- Permanent Subject Codes (`MATH001`, `PHYS001`, `CHEM001`, `BIO001`, `SCI001`, `ENG001`, `SST001`, `HIN001`, `COMP001`) remain immutable across class levels and examination boards.
- Governed by partial unique index `(institution_id, code) WHERE is_active = true`.

### 2.2 Subject Applicability Mappings (`subject_mappings`)
- Decouples curriculum-specific details (e.g. syllabus codes `MATH-10`, `MATH-4`, board display names "English Language & Lit", maximum marks 100, pass marks 35, compulsory vs elective).
- Governed by partial unique constraint `(canonical_subject_id, standard_id, board_id, academic_year_id) WHERE is_active = true`.

### 2.3 Backward Compatibility Preservation
- The legacy table `subjects` was extended with `canonical_subject_id (nullable=True, FK -> canonical_subjects.id)`.
- All 20 existing active records in `subjects` remain preserved with their original primary keys (IDs 1 through 40), guaranteeing that all 382 historical marks, timetable entries, and teacher assignments remain intact without dangling references.

---

## 3. Database Migration & Historical Data Reconciliation

Alembic migration `025_canonical_subjects.py` (Revises: `024_employee_dossier`) was generated and executed:

1. **Table Creation:** Created tables `canonical_subjects` and `subject_mappings`.
2. **Column Extension:** Added `canonical_subject_id` to `subjects`.
3. **Master Seeding:** Seeded 9 canonical academic disciplines:
   - `MATH001`: Mathematics (Category: Mathematics)
   - `PHYS001`: Physics (Category: Science)
   - `CHEM001`: Chemistry (Category: Science)
   - `BIO001`: Biology (Category: Science)
   - `SCI001`: Science (Category: Science)
   - `ENG001`: English (Category: Languages)
   - `SST001`: Social Science (Category: Social Sciences)
   - `HIN001`: Hindi (Category: Languages)
   - `COMP001`: Computer Science (Category: Computer Science)
4. **Data Backfill:** Back-linked all 20 active `subjects` rows to their matching canonical subjects and generated 20 `subject_mappings` entries with corresponding board associations (Class IV/VIII -> ICSE, Class IX -> SSC, Class X -> ICSE/CBSE).

---

## 4. Backend API Architecture

In `backend/app/api/v1/endpoints/subjects.py`, new RESTful endpoints were implemented:

| Method | Endpoint | Description | Authorization |
|---|---|---|---|
| `GET` | `/api/v1/subjects/duplicate-check` | Live search returning exact and similar canonical matches with reuse advice | Authenticated |
| `GET` | `/api/v1/subjects/canonical` | List canonical subjects with mapped standards/boards summaries and counts | Authenticated |
| `GET` | `/api/v1/subjects/canonical/{id}` | Detailed canonical subject profile with all active curriculum mappings | Authenticated |
| `POST` | `/api/v1/subjects/canonical` | Register new canonical subject with duplicate code and name prevention | Admin / Principal |
| `PUT` | `/api/v1/subjects/canonical/{id}` | Update canonical subject metadata (name, code, category, aliases) | Admin / Principal |
| `DELETE` | `/api/v1/subjects/canonical/{id}` | Soft deactivate canonical subject without cascading deletions | Admin / Principal |
| `GET` | `/api/v1/subjects/mappings` | List curriculum applicability mappings filtered by standard, board, or search | Authenticated |
| `POST` | `/api/v1/subjects/mappings` | Map canonical subject to standard/board, auto-syncing legacy table | Admin / Principal |
| `PUT` | `/api/v1/subjects/mappings/{id}` | Update mapping (curriculum code, display name, max/pass marks) | Admin / Principal |
| `DELETE` | `/api/v1/subjects/mappings/{id}` | Soft deactivate mapping | Admin / Principal |
| `GET` | `/api/v1/subjects/` | Legacy standard-filtered subjects endpoint (preserved for existing callers) | Authenticated |
| `POST` | `/api/v1/subjects/` | Legacy create endpoint (auto-links canonical subject & creates mapping) | Admin / Principal |

---

## 5. Frontend User Experience Refactoring

In `frontend/src/pages/Subjects.tsx`, the interface was upgraded to provide dual logical views:

### 5.1 Dual-View Presentation
1. **Common Subject Master View:**
   - Displays authoritative canonical subjects.
   - Shows permanent code (`MATH001`), subject name, category pill, count of linked standards with pill badges (e.g. `Class IV`, `Class VIII`, `Class IX`, `Class X`), count of linked boards (`ICSE`, `SSC`), total mappings count, status, and "+ Map Standard" shortcut.
   - Filterable by Category pills (Mathematics, Science, Languages, Social Sciences, Commerce, Computer Science) and real-time search.
2. **Standard & Board Mappings View:**
   - Filterable by Standard selector pills and Board selector buttons.
   - Columns: Standard & Board, Canonical Subject (Master Code), Syllabus Code (`MATH-10`), Display Name in Syllabus (`English Language & Lit`), Max/Pass Marks, Compulsory vs Elective, Status, and Action controls.

### 5.2 Subject Registration & Duplicate Warning UX
The modal offers two operational modes:
- **Mode 1 — Map Existing Subject (Recommended):** User selects a canonical subject from the master catalog, picks the standard and board, and assigns syllabus-specific codes without duplicating subject identity.
- **Mode 2 — Register New Master Subject:** Includes a live debounce query against `/duplicate-check`. If an administrator types an existing subject (e.g. "Mathematics" or "Math"), an amber alert banner displays:
  > *"Duplicate Subject Warning: An existing canonical subject 'Mathematics' (MATH001) was found. Reusing it will link this curriculum mapping without duplicating master identities."*
  Includes a 1-click button: `"Reuse 'Mathematics' (MATH001) Instead"`, which instantly transitions the modal to Mode 1 with Mathematics pre-selected.

### 5.3 Global View-First & Explicit Edit Mode Governance
- Enforces `EditModeBar` with scope `academic:subjects`.
- In View Mode, mutation buttons show `"Add / Map Subject (Locked)"` with informative guidance.
- Table delete and edit actions are hidden or disabled until Edit Mode is actively unlocked.
- Deletions utilize `DeleteConfirmationModal` with clear operational risk explanations.

---

## 6. Verification & Quality Assurance

### 6.1 Pytest Automated Test Suite
- Executed in backend container: `pytest tests/test_canonical_subjects.py -v`
- **Result:** 5 passed in 9.38s (100% pass rate).
- Validated:
  1. `test_canonical_subjects_catalogue_seeded`: Verified seeded canonical records and mapping summaries.
  2. `test_duplicate_check_endpoint`: Verified exact and similar duplicate detection.
  3. `test_create_canonical_subject_duplicate_prevention`: Verified 400 rejection on duplicate codes and names.
  4. `test_canonical_subject_multi_standard_mapping`: Verified mapping of single master subject across multiple standards.
  5. `test_legacy_endpoint_synchronization`: Verified backward compatibility of legacy endpoints.

### 6.2 Vitest Automated Test Suite
- Executed in frontend: `npm run test -- src/test/CanonicalSubjects.test.tsx`
- **Result:** 5 passed in 716ms (100% pass rate).
- Full frontend test suite: 34 test files, 250 tests passed in 71.31s with zero regressions.

### 6.3 Header & Attribution Governance
- Executed `python scripts/manage_headers.py check`.
- Verified 338 source code files with 100% corporate header compliance.
