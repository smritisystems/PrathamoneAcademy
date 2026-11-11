---
title: "Subject Master Deduplication and Data Consolidation Audit Report"
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
tags: ["subjects", "deduplication", "canonical-master", "data-consolidation", "ssot", "migration-041"]
entities: ["CanonicalSubject", "Subject", "SubjectMapping", "SubjectLegacyMapping"]
api_routes: ["/api/v1/subjects/", "/api/v1/subjects/canonical", "/api/v1/subjects/mappings", "/api/v1/subjects/resolve/{identifier}", "/api/v1/subjects/legacy-mappings", "/api/v1/subjects/duplicate-check"]
related_modules: ["03_ACADEMIC_MANAGEMENT", "05_TEACHER_MANAGEMENT", "06_TEACHER_PAYROLL", "08_EXAMINATION", "16_DATABASE_API"]
---

# PRATHAMONE EduOS — FORENSIC AUDIT & VERIFICATION REPORT
## Subject Master Deduplication & Canonical Consolidation Architecture

---

### Executive Summary

In compliance with **RULE 001 (Single Source of Truth)** and **RULE 011 (Data Deduplication & Canonical Master Reuse)**, a full forensic audit, consolidation migration, backend adaptation, and frontend harmonization was executed across the academic subject ecosystem in **PrathamOne EduOS (Coaching Institute Edition)**.

Prior to consolidation, the system suffered from fragmented subject identities across standard boundaries: genuinely identical subjects (e.g., Mathematics, Physics, English, Social Science) were duplicated per standard (Standard 10, Standard 9, Standard 8, Standard 4) with independent integer IDs and variant codes (`MATH-10`, `MATH-9`, `MATH-8`, `MATH-4`). Furthermore, testing artifacts introduced duplicate unreferenced rows for advanced subjects.

This consolidation successfully unified **26 legacy subject records** into **10 canonical subject identities** while guaranteeing **zero data loss**, preserving 100% of historical exam marks, timetable entries, and teacher logs, establishing a bidirectional reversible mapping registry (`subject_legacy_mappings`), enforcing normalized unique constraints to prevent future duplicate creation, and ensuring that all general dropdowns and search endpoints resolve aliases and legacy codes seamlessly.

---

### 1. Pre-Migration Forensic Audit Findings

A thorough inspection of PostgreSQL tables (`subjects`, `canonical_subjects`, `subject_mappings`, `exam_marks`, `timetable_entries`, `teacher_assignments`, `study_materials`, `teaching_sessions`) revealed the baseline state:

1. **Total Subjects in Legacy Table (`subjects`):** 26 rows.
2. **Total Canonical Subjects in Master Catalog (`canonical_subjects`):** 10 rows.
3. **Duplicate Groups Identified:** 8 active duplicate groups across 26 legacy records:
   - **Group 1 (Mathematics):** Canonical ID `1` (`MATH001`), alternate codes `['MATH-10', 'MATH-4', 'MATH-8', 'MATH-9']`, legacy IDs `[1, 7, 13, 37]`.
   - **Group 2 (Physics):** Canonical ID `2` (`PHYS001`), alternate codes `['PHYS-10', 'PHYS-9']`, legacy IDs `[2, 8]`.
   - **Group 3 (Chemistry):** Canonical ID `3` (`CHEM001`), alternate codes `['CHEM-10', 'CHEM-9']`, legacy IDs `[3, 9]`.
   - **Group 4 (Biology):** Canonical ID `4` (`BIO001`), alternate codes `['BIO-10', 'BIO-9']`, legacy IDs `[4, 10]`.
   - **Group 5 (Science):** Canonical ID `5` (`SCI001`), alternate codes `['SCI-4', 'SCI-8']`, legacy IDs `[14, 38]`.
   - **Group 6 (English):** Canonical ID `6` (`ENG001`), alternate codes `['ENG-10', 'ENG-4', 'ENG-8', 'ENG-9']`, legacy IDs `[5, 11, 15, 39]`. Name variations included `'English Language & Lit'`, `'English Language'`, and `'English'`.
   - **Group 7 (Social Science):** Canonical ID `7` (`SST001`), alternate codes `['SST-10', 'SST-4', 'SST-8', 'SST-9']`, legacy IDs `[6, 12, 16, 40]`. Name variations included `'Social Science'` and `'Social Studies'`.
   - **Group 8 (Advanced Robotics & AI):** Canonical ID `10` (`ROBO-10`), legacy ID `60` (active mapping), and IDs `[61, 62, 63, 64, 65]` (5 duplicate test rows with 0 foreign key references).
4. **Historical Configuration Typo in Standard 4 Mappings:**
   - In historical migration `025`, `subject_mappings` rows `[4, 12, 14, 20]` (linked to legacy subjects 37, 38, 39, 40 for Class IV) were incorrectly populated with `standard_id: 9` instead of `standard_id: 4`. This prevented proper teacher assignment lookups for Class IV.

---

### 2. Consolidation Architecture & Reversible Mapping Strategy

To preserve complete backward compatibility and avoid breaking external APIs or legacy frontend components:

1. **Canonical Master as Authority:**
   `canonical_subjects` is the single source of truth for academic discipline identity.
2. **Alternate Codes Column (`alternate_codes`):**
   Added `alternate_codes VARCHAR(255)` to `canonical_subjects` storing comma-delimited historical codes (e.g. `MATH-10, MATH-9, MATH-8, MATH-4`).
3. **Reversible Mapping Table (`subject_legacy_mappings`):**
   Created dedicated table storing bidirectional mappings:
   - `id` (PK)
   - `legacy_subject_id` (Integer, Unique, Index)
   - `canonical_subject_id` (FK -> `canonical_subjects.id`, Index)
   - `standard_id` (FK -> `standards.id`, Index)
   - `legacy_code` (String, Index)
   - `canonical_code` (String, Index)
   - `legacy_name` (String)
   - `canonical_name` (String)
   - `created_at` (DateTime)
4. **Normalized Unique Index:**
   Added partial unique index `uq_canonical_subjects_normalized_name` on `(institution_id, lower(trim(name))) WHERE is_active = true` to strictly prevent future duplicates through case or whitespace variations.
5. **Preservation of Referenced Legacy Rows:**
   All 21 referenced records in `subjects` remain intact in PostgreSQL. Foreign keys from `exam_marks`, `timetable_entries`, and `study_materials` remain valid without disruption.
6. **Purge of Unreferenced Test Artifacts:**
   Rows 61–65 (exact duplicates of ID 60 with 0 foreign key references across all tables) were safely purged.

---

### 3. Database Migration Summary (`041_subject_master_deduplication_and_consolidation.py`)

Alembic migration `041_subject_master_deduplication_and_consolidation` was created and executed transactionally:

| Step | Action | Outcome |
| :--- | :--- | :--- |
| **1. Table Creation** | Create `subject_legacy_mappings` table | Table and foreign key constraints established |
| **2. Column Addition** | Add `alternate_codes` to `canonical_subjects` | Column created |
| **3. Alternate Codes Backfill** | Populate comma-delimited legacy codes on canonical rows | 10 canonical rows updated |
| **4. Typo Correction** | Fix `standard_id = 4` on `subject_mappings` rows 4, 12, 14, 20 | Class IV mappings restored |
| **5. Mapping Backfill** | Insert 26 rows into `subject_legacy_mappings` | Bidirectional lookup established |
| **6. Teacher Assignments** | Backfill `teacher_assignments.subject_mapping_id` | 23 of 23 active assignments linked (0 nulls) |
| **7. Safe Purge** | Delete unreferenced test duplicate IDs `61..65` from `subjects` | `subjects` reduced from 26 to 21 verified rows |
| **8. Unique Constraint** | Add partial unique index `uq_canonical_subjects_normalized_name` | Future duplicates blocked |
| **9. Rollback Verification** | Execute `alembic downgrade -1` followed by `alembic upgrade head` | 100% reversible and reproducible |

---

### 4. Consolidated Canonical Subject Directory & Preserved Codes

| Canonical ID | Canonical Name | Code | Category | Preserved Legacy Codes | Mapped Standards |
| :---: | :--- | :---: | :---: | :--- | :--- |
| **1** | Mathematics | `MATH001` | Mathematics | `MATH-10, MATH-9, MATH-8, MATH-4` | Class IV, Class VIII, Class IX, Class X |
| **2** | Physics | `PHYS001` | Science | `PHYS-10, PHYS-9` | Class IX, Class X |
| **3** | Chemistry | `CHEM001` | Science | `CHEM-10, CHEM-9` | Class IX, Class X |
| **4** | Biology | `BIO001` | Science | `BIO-10, BIO-9` | Class IX, Class X |
| **5** | Science | `SCI001` | Science | `SCI-4, SCI-8` | Class IV, Class VIII |
| **6** | English | `ENG001` | Languages | `ENG-10, ENG-4, ENG-8, ENG-9` | Class IV, Class VIII, Class IX, Class X |
| **7** | Social Science | `SST001` | Social Studies | `SST-10, SST-4, SST-8, SST-9` | Class IV, Class VIII, Class IX, Class X |
| **8** | Hindi | `HIN001` | Languages | `HIN001` | Master catalog |
| **9** | Computer Science | `CS001` | Computer Science | `CS001` | Master catalog |
| **10** | Advanced Robotics & AI | `ROBO-10` | General | `ROBO-10` | Class X |

---

### 5. Backend & API Enhancement Summary

1. **Consolidated General Listing (`GET /api/v1/subjects/`):**
   - When `standard_id` is omitted and `raw=False`, returns the 10 consolidated canonical subjects (0 duplicate names).
   - Each item includes `id` (primary legacy ID), `name`, `code`, `canonical_subject_id`, `alternate_codes`, `aliases`, `standards_count`, and `standards_summary`.
   - When `standard_id` is supplied, returns standard-specific subjects preserving exact class-level configurations.
   - When `search` query is supplied, searches canonical names, canonical codes, aliases, alternate codes, and legacy mapped codes.
2. **Canonical List (`GET /api/v1/subjects/canonical`):**
   - Returns `alternate_codes` and filters by category or search.
3. **Reversible Mappings Endpoint (`GET /api/v1/subjects/legacy-mappings`):**
   - Returns reversible mapping records with optional filters for `canonical_subject_id`, `standard_id`, or `search`.
4. **Intelligent Subject Resolution (`GET /api/v1/subjects/resolve/{identifier}`):**
   - Accepts subject name, master code, legacy code (e.g. `MATH-10`), or numeric ID.
   - Accepts `?id_type=legacy | canonical | auto` to unambiguously distinguish overlapping integer IDs.
5. **Duplicate Check (`GET /api/v1/subjects/duplicate-check`):**
   - Validates input against canonical names, aliases, alternate codes, and legacy codes, preventing redundant creation.
6. **Workforce & Payroll Service Resilience:**
   - `backend/app/api/v1/endpoints/staff.py` and `backend/app/services/teacher_payroll_service.py` updated to resolve assignments and teaching sessions seamlessly whether passed a legacy subject ID or a canonical subject ID.

---

### 6. Frontend Harmonization Summary

1. **`frontend/src/types/index.ts`:**
   - Extended `CanonicalSubject` with `alternate_codes?: string | null` and `legacy_mappings?: SubjectLegacyMapping[]`.
   - Added `SubjectLegacyMapping` interface.
   - Extended `AcademicSubject` with `canonical_subject_id`, `alternate_codes`, and `aliases`.
2. **`frontend/src/api/endpoints.ts`:**
   - Added `subjectsApi.resolve(identifier, params)` and `subjectsApi.listLegacyMappings()`.
3. **`frontend/src/pages/Subjects.tsx`:**
   - Added legacy alternate codes pills in the Subject Identity column in the Canonical Subject Master table.
   - Search bar resolves old codes (`MATH-10`, `ENG-9`) and aliases (`Maths`).
4. **`frontend/src/components/workforce/TeacherAssignBatchModal.tsx`:**
   - Subject dropdown dynamic filtering bound to selected standard with canonical fallback.
5. **`frontend/src/pages/Courses.tsx`:**
   - Subject filter dropdown renders consolidated canonical subjects (0 duplicate entries).
   - Modal form dynamically queries standard-specific subjects upon standard selection.
6. **`frontend/src/pages/HomeworkWorkspace.tsx` and `TeacherPayroll.tsx`:**
   - General subject dropdowns display consolidated canonical subjects without duplicate names.

---

### 7. Verification & Regression Testing Matrix

| Suite / Test Case | Scope | Result | Details |
| :--- | :--- | :---: | :--- |
| **Backend Integration Suite** (`test_subjects_api.py`) | 8 API Endpoints | **PASSED** | 8/8 tests passed against live Postgres instance |
| **Consolidation Test Suite** (`test_subject_deduplication_consolidation.py`) | Dedicated deduplication suite | **PASSED** | 8/8 tests passed |
| **Canonical Subjects Suite** (`test_canonical_subjects.py`) | Multi-standard & board mappings | **PASSED** | 10/10 tests passed |
| **Deep Academic Suite** (`test_academic_module_deep.py`) | Academic CRUD, Timetable, Reports | **PASSED** | 6/6 tests passed |
| **Full Pytest Regression Suite** | Entire backend codebase | **PASSED** | 260 passed, 4 skipped, 0 failed |
| **Frontend Production Build** | TypeScript compilation & Vite build | **PASSED** | Built in 19.44s with 0 errors |
| **Corporate Header Compliance** | Attribution & governance check | **PASSED** | 527/527 files compliant (100%) |

---

### 8. Records Requiring Manual Review

- **Total Records Requiring Manual Review:** **0**
- All 21 active legacy subjects, 23 teacher assignments, 234 exam marks, 60 timetable sessions, and 10 canonical subject master entries have been forensically verified and reconciled without ambiguity.

---

### Conclusion & Operational Status

The Subject Master deduplication and data consolidation is complete, fully tested, and verified across all backend services, database migrations, and frontend user interfaces. The system adheres strictly to the single source of truth governance directive.

