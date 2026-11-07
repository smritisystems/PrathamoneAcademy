---
title: "Canonical Subject Architecture Final Integrity Audit & Regression Verification Report"
module: "03_ACADEMIC_MANAGEMENT"
category: "AUDIT-REPORT"
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
tags: ["academics", "subjects", "canonical-subject", "subject-mappings", "ssot", "audit", "integrity", "nulls-not-distinct"]
entities: ["CanonicalSubject", "SubjectMapping", "Subject", "Standard", "Board", "AcademicYear", "ExamMark", "TeachingSession", "TimetableEntry"]
api_routes: ["/api/v1/subjects/canonical", "/api/v1/subjects/mappings", "/api/v1/subjects/duplicate-check", "/api/v1/subjects/"]
related_modules: ["03_ACADEMIC_MANAGEMENT", "08_EXAMINATION", "12_RBAC_SECURITY"]
---

# Canonical Subject Architecture Final Integrity Audit & Regression Verification Report

**Product:** PrathamOne EduOS  
**Edition:** Coaching Institute Edition  
**Baseline Version:** 1.0.0  
**Product Architect:** Jawahar R Mallah  
**Organization:** AITDL — AI Technology & Development Lab  
**Module:** 03_ACADEMIC_MANAGEMENT  
**Reference Commit:** `fca2238`  
**Date:** 2026-11-07  

---

## 1. Executive Summary & Verification Scope

Following the implementation of the Canonical Subject Master and Curriculum Applicability Mapping architecture in commit `fca2238`, an independent, comprehensive forensic audit was conducted across the database schema, business logic, REST APIs, frontend components, test suites, and running container environments.

The audit was conducted strictly under the directive:
> **"AUDIT FIRST → REUSE EXISTING → REFACTOR IF REQUIRED → CREATE ONLY IF GENUINELY MISSING. ONE CANONICAL IDENTITY PER GENUINELY IDENTICAL SUBJECT — DISTINCT CURRICULUM SUBJECTS REMAIN DISTINCT — HISTORICAL ACADEMIC DATA NEVER CHANGES SILENTLY."**

### 1.1 Summary of Verified Architecture
The system establishes a clean, two-tier academic subject architecture:
1. **Tier 1 — Canonical Subject Catalogue (`canonical_subjects`):** Authoritative single source of truth for subject disciplines (e.g., Mathematics, Physics, Chemistry, Biology, Science, Social Studies, English). Each canonical subject possesses an institution-scoped identity, canonical name, code, description, category, and active status.
2. **Tier 2 — Curriculum Applicability Mappings (`subject_mappings`):** Junction entity mapping canonical subjects to specific standards, educational boards (CBSE, ICSE, SSC, etc.), and academic years with curriculum-specific parameters (e.g., curriculum code, board-specific marks schema, optional/compulsory status, display order).
3. **Legacy Compatibility Layer (`subjects` table facade):** Preserves concrete delivery references for 6 historical foreign key dependencies (`exam_marks`, `teaching_sessions`, `study_materials`, `teacher_assignments`, `timetable_entries`, and `subject_mappings.legacy_subject_id`) with zero data breakage or schema disruption.

---

## 2. Forensic Findings & Critical Engine-Level Resolution

### 2.1 The PostgreSQL `NULL != NULL` Uniqueness Vulnerability
During forensic verification of database constraints, a critical edge-case vulnerability was discovered in the partial unique index defined for `subject_mappings`:

```sql
-- Initial Definition in migration 025:
CREATE UNIQUE INDEX uq_subject_mapping_canonical_std_board_yr 
ON subject_mappings (canonical_subject_id, standard_id, board_id, academic_year_id) 
WHERE is_active = true;
```

**Vulnerability Analysis:**
In standard SQL and PostgreSQL versions prior to 15, `NULL` values are treated as distinct (`NULL != NULL`). Consequently, if a curriculum mapping is board-agnostic (`board_id IS NULL`) or academic-year-agnostic (`academic_year_id IS NULL`), the unique index would fail to prevent duplicate mappings for the same canonical subject in the same standard:
- Mapping 1: Canonical `1` (Mathematics) + Standard `10` + Board `NULL` + Year `NULL`
- Mapping 2: Canonical `1` (Mathematics) + Standard `10` + Board `NULL` + Year `NULL`
Both rows would be inserted without triggering a unique constraint violation.

**Remediation Applied:**
Leveraging PostgreSQL 16 (running in `prashant_academy_db`), the unique index was dropped and recreated with `NULLS NOT DISTINCT`:
```sql
DROP INDEX IF EXISTS uq_subject_mapping_canonical_std_board_yr;
CREATE UNIQUE INDEX uq_subject_mapping_canonical_std_board_yr 
ON subject_mappings (canonical_subject_id, standard_id, board_id, academic_year_id) 
NULLS NOT DISTINCT 
WHERE is_active = true;
```
Both `backend/app/models/subject.py` and Alembic migration `025_canonical_subjects.py` were synchronized with `postgresql_nulls_not_distinct=True`. A live database test verified that duplicate insertions with `board_id=NULL` and `academic_year_id=NULL` are now blocked with:
```
ERROR: duplicate key value violates unique constraint "uq_subject_mapping_canonical_std_board_yr"
```

### 2.2 API Duplicate Check Query Resolution
In `backend/app/api/v1/endpoints/subjects.py` (`create_subject_mapping`), the duplicate check query previously evaluated:
```python
if mapping_in.board_id is not None:
    query = query.where(SubjectMapping.board_id == mapping_in.board_id)
# If board_id was None, no condition was attached, risking false rejections or missed collisions
```
This was refactored to explicitly evaluate `.is_(None)` when None:
```python
if mapping_in.board_id is not None:
    query = query.where(SubjectMapping.board_id == mapping_in.board_id)
else:
    query = query.where(SubjectMapping.board_id.is_(None))

if mapping_in.academic_year_id is not None:
    query = query.where(SubjectMapping.academic_year_id == mapping_in.academic_year_id)
else:
    query = query.where(SubjectMapping.academic_year_id.is_(None))
```
This guarantees that curriculum mapping duplicate checks behave deterministically whether boards and academic years are specified or universal.

---

## 3. Academic Identity & Subject Taxonomy Forensic Audit

### 3.1 "Social Studies" vs "Social Science"
- **Audit Findings:**
  In the legacy database, "Social Studies" was registered for Class IV (ID 40) and Class VIII (ID 16), while "Social Science" was registered for Class IX (ID 12) and Class X (ID 6).
- **Academic Taxonomy Decision:**
  In primary/middle school (Classes IV & VIII), boards conventionally label this integrated discipline "Social Studies". In secondary school (Classes IX & X), boards classify it as "Social Science" (History, Civics, Geography, Economics).
  Under SSOT principles, these represent the identical discipline. In the Canonical Master, a single canonical subject `Social Studies / Social Science` (code `SST001`) serves as the root. Each standard mapping defines its exact grade-appropriate curriculum title via `display_name`:
  * Class IV Mapping: `Social Studies (ICSE)`
  * Class VIII Mapping: `Social Studies (ICSE)`
  * Class IX Mapping: `Social Science (SSC)`
  * Class X Mapping: `Social Science (ICSE/CBSE)`
  This eliminates duplicate disciplinary records while preserving curriculum-specific labeling.

### 3.2 "English" vs "English Language" vs "Literature in English"
- **Audit Findings:**
  In certain senior curricula (specifically ICSE/ISC and Cambridge IGCSE), English is formally evaluated as two completely distinct academic subjects with separate examination papers, marks, and specialized teachers:
  1. *English Language* (Grammar, Composition, Comprehension)
  2. *Literature in English* (Drama, Prose, Poetry)
- **Academic Taxonomy Decision:**
  The architecture supports both paradigms without conflict:
  1. **Single Discipline Model (Current Institute Baseline):** For institutions offering a unified English curriculum (Classes IV, VIII, IX, X in `prashant_academy_db`), a single canonical record `ENG001` is maintained and mapped with standard-level display names.
  2. **Split Discipline Model:** Where curricula require separate evaluation, administrators can register `English Language` (`ENGLANG001`) and `Literature in English` (`ENGLIT001`) as distinct canonical subjects. Because both have distinct codes, they co-exist, map simultaneously to Class X, and maintain distinct pass/max marks.
  This was validated via integration test `test_curriculum_specific_subject_distinctions`.

---

## 4. Multi-Board & Multi-Standard Mapping Validation

A key requirement is validating that a single canonical subject (e.g., Mathematics `MATH001`) can map across multiple examination boards within the same standard without collision:
- **Standard 10 — ICSE:** Mathematics (`MATH-10`), Max Marks: 100, Pass Marks: 35.
- **Standard 10 — CBSE:** Mathematics (`041`), Max Marks: 80, Pass Marks: 26.

### 4.1 Multi-Board Test Verification
Integration test `test_multi_board_mapping_for_same_canonical_subject` verified:
1. ICSE mapping successfully created for Class X.
2. CBSE mapping successfully created for Class X referencing the identical `canonical_subject_id`.
3. Different curriculum codes (`MATH-10` vs `041`) and marks schemes (100 vs 80) persisted accurately.
4. An attempt to create a second ICSE mapping for Class X was blocked with HTTP 409 Conflict.

---

## 5. Legacy Compatibility & Historical Data Integrity Audit

### 5.1 Audit of Foreign Key Dependencies
A query against `information_schema.table_constraints` and `key_column_usage` identified all tables referencing `subjects.id`:

| Referencing Table | Foreign Key Column | Referencing Records | Status |
| :--- | :--- | :---: | :--- |
| `exam_marks` | `subject_id` | 284 | Preserved & Intact |
| `timetable_entries` | `subject_id` | 67 | Preserved & Intact |
| `teacher_assignments` | `subject_id` | 21 | Preserved & Intact |
| `study_materials` | `subject_id` | 10 | Preserved & Intact |
| `teaching_sessions` | `subject_id` | 0 | Preserved & Intact |
| `subject_mappings` | `legacy_subject_id` | 20 | Linked Bridge |

**Integrity Verification:**
The legacy `subjects` table was neither dropped nor altered in ways that break foreign keys. The existing 382 foreign key references remain 100% operational. When new subjects are registered via the legacy REST endpoint `POST /api/v1/subjects`, the endpoint automatically creates the canonical subject (or resolves an existing one) and creates the corresponding `subject_mapping`, ensuring backwards compatibility for legacy integrations.

### 5.2 Academic Year Transitions & Examination Immutability
1. **Academic Year Syllabus Evolution:** When a curriculum transitions across academic years (e.g., AY 2026-27 to AY 2027-28), curriculum mappings can be scoped per academic year (`academic_year_id`). Changes to 2027-28 syllabus or max marks do not alter 2026-27 records.
2. **Historical Marksheets:** Past examination marks reference `subjects.id` directly and remain immutable. Deactivating or modifying a subject mapping does not cascade or alter past student marks or historical report cards.

---

## 6. Test Suite & Verification Results

### 6.1 Backend Integration Test Suite (`pytest`)
Executed inside the live Docker container `prashant_academy_backend`:
```bash
docker exec prashant_academy_backend pytest tests/test_canonical_subjects.py
```
**Results:** `10 passed, 2 warnings in 17.62s (100% Pass Rate)`

| Test Name | Focus Area | Status |
| :--- | :--- | :---: |
| `test_create_and_list_canonical_subjects` | Master Catalogue CRUD & Scoping | PASSED |
| `test_duplicate_canonical_subject_code_rejected` | Institution-level Unique Constraint | PASSED |
| `test_duplicate_check_endpoint` | Exact & Fuzzy Matching API | PASSED |
| `test_create_and_list_subject_mappings` | Standard & Board Mapping Logic | PASSED |
| `test_legacy_subject_creation_syncs_canonical` | Dual-write Legacy Bridge | PASSED |
| `test_multi_board_mapping_for_same_canonical_subject` | Multi-board Mapping & Uniqueness | PASSED |
| `test_curriculum_specific_subject_distinctions` | English Language vs Literature Taxonomy | PASSED |
| `test_academic_year_curriculum_transitions` | Multi-year Syllabus Immutability | PASSED |
| `test_historical_examination_integrity` | FK & Exam Marks Immutability | PASSED |
| `test_tenant_isolation_canonical_subjects` | Multi-tenant Code Scoping | PASSED |

### 6.2 Frontend Vitest Suite
Executed across the entire frontend application:
```bash
npm run test --prefix frontend -- --run
```
**Results:** `35 test files passed, 259 tests passed in 161.29s (100% Pass Rate)`

Including `src/test/CanonicalSubjects.test.tsx` (7/7 tests passed):
- RULE 1: Renders canonical subject master with disciplinary grouping.
- RULE 2: Displays associated standards and curriculum count badges.
- RULE 3: Switches seamlessly between Master Catalogue and Applicability Mappings.
- RULE 4: Unlocks mutation controls only when explicit Edit Mode is active.
- RULE 5: Warns user on duplicate registration attempt and offers canonical reuse.
- RULE 6: Filters mappings by examination board and renders board badges.
- RULE 7: Protects mapping deactivation behind scoped Edit Mode and `DeleteConfirmationModal`.

---

## 7. Operational Guidelines & Best Practices

1. **Registering a Subject for a New Standard or Board:**
   Administrators should navigate to **Academic Subjects → Standard & Board Mappings → Add / Map Subject**. Select the existing Master Subject (e.g., Mathematics `MATH001`), choose the target Standard and Board, enter the board-specific curriculum code and marks scheme, and save.
2. **Creating a Truly New Discipline:**
   Only create a new Master Subject if the academic discipline does not exist in the catalogue. The duplicate check engine will actively assist by highlighting existing or similar subjects.
3. **ICSE / Cambridge Split Subjects:**
   When teaching ICSE Class IX/X where English Language and Literature in English are graded as separate subjects, register two distinct master subjects (`ENGLANG001` and `ENGLIT001`) to support separate mark entries and report card rows.
4. **View-First Governance:**
   In compliance with Rule 010, the Academic Subjects workspace opens in View Mode. Creation, mapping, or deactivation controls are unlocked only when the user explicitly clicks "Activate Edit Mode" and possesses Academic Admin privileges.

---

## 8. Conclusion & Sign-Off

The Canonical Subject Catalogue and Curriculum Applicability Mapping architecture has undergone end-to-end forensic validation. The critical `NULLS NOT DISTINCT` database fix guarantees data integrity across board-agnostic mappings. Legacy compatibility is 100% preserved with zero breaking changes to existing examination marks, timetables, or teacher assignments. All 10 backend tests and 259 frontend tests are passing.

