---
title: "EduBoard Subject Deduplication & Canonical Mapping Forensic Audit"
module: "03_ACADEMIC_MANAGEMENT"
category: "FORENSIC-AUDIT"
document_type: "REPORT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-13"
updated_date: "2026-11-13"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["eduboard", "subjects", "canonical-mapping", "ssot", "deduplication", "rule-011"]
entities: ["CanonicalSubject", "SubjectMapping", "Subject", "EduBoard"]
api_routes: ["/api/v1/eduboard/context", "/api/v1/eduboard/boards"]
related_modules: ["03_ACADEMIC_MANAGEMENT", "08_EXAMINATION", "16_DATABASE_API"]
---

# EduBoard Subject Deduplication & Canonical Mapping Forensic Audit

## 1. Executive Summary

During testing of the **Create Classroom EduBoard** workflow in **PrathamOne EduOS**, multiple duplicated subject entries were observed in the Subject dropdown (e.g., 18 identical entries for *"Advanced Robotics & AI"*, 4 identical entries for *"Mathematics"*, 2 entries for *"Biology"*, 2 entries for *"Chemistry"*, 2 entries for *"Physics"*, and 2 entries for *"English"*).

This forensic audit identifies the three distinct root causes across the backend querying layer, data lifecycle management, and frontend cascading selectors. A comprehensive architectural review was also conducted to verify whether the underlying database table mappings (`subject_mappings` and `canonical_subjects`) were misconfigured.

**Key Finding:** The underlying canonical mapping registry (`subject_mappings` and `canonical_subjects`) was **100% healthy, intact, and correctly configured**. The duplicates were caused by:
1. Missing `is_active == True` soft-delete filtering in `EduBoardService.get_teacher_context()`.
2. Direct un-cascaded querying of the legacy multi-standard `subjects` table without canonical deduplication.
3. Lack of cascading batch-to-subject filtering and standard grouping in `EduBoardWorkspace.tsx`.

All three issues have been definitively resolved and verified through automated tests.

---

## 2. Root Cause Analysis

### 2.1 Cause A: Soft-Deleted Inactive Records Leaked by Missing Filter (18x "Advanced Robotics & AI")
- **Database Findings:** Querying the `subjects` table revealed 18 rows for *"Advanced Robotics & AI"*, every single one of which had `is_active = False` (IDs 60, 66–82). These had been deactivated during previous test cycles.
- **Backend Flaw:** In `backend/app/services/eduboard_service.py`, `sub_query = select(Subject).order_by(Subject.name)` completely omitted the `Subject.is_active == True` predicate. Consequently, every inactive/deleted legacy record was fetched and sent to the client.

### 2.2 Cause B: Multi-Standard Legacy Representation (4x "Mathematics")
- **Legacy Architecture Context:** In historical releases prior to Rule 011, subjects were scoped per standard in the `subjects` table (e.g., Mathematics for Class 4 [ID 37], Class 8 [ID 13], Class 9 [ID 7], and Class 10 [ID 1]).
- **Missing Standard Labeling:** When `eduboardApi.getContext()` returned raw rows without standard context (`standard_name`), the UI rendered simply `{s.name}`, causing four distinct standard subjects to appear as four indistinguishable *"Mathematics"* options.

### 2.3 Cause C: Frontend Dropdown Lacked Cascading Filter
- **UI Flaw:** In `frontend/src/pages/EduBoardWorkspace.tsx`, selecting a **Batch / Division** did not filter the Subject dropdown. All 38 subjects across all grades remained visible in the dropdown, even when a specific batch (e.g., *Class X — ICSE X*) was chosen.

---

## 3. Database Mapping Verification

A deep inspection of the canonical registry in PostgreSQL confirmed:
- `canonical_subjects`: Exactly 10 clean, active master records (`MATH001`, `PHYS001`, `CHEM001`, `BIO001`, `SCI001`, `ENG001`, `SST001`, `HIN001`, `COMP001`, `ROBO-10`).
- `subject_mappings`: Exactly 21 active mapping rows correctly bridging `canonical_subject_id -> standard_id -> board_id -> legacy_subject_id`.
- **Verdict:** The mapping itself is **NOT wrongly mapped**. The mapping schema satisfies Rule 011 completely.

---

## 4. Implemented Architecture & Permanent Fixes

```
[User Selects Batch / Division]
       │
       ▼
[Cascading Subject Filter]
       │
       ├──► If Batch Selected (e.g., Class 10):
       │      Filters subjects to ONLY Class 10 active subjects (zero duplicates)
       │
       └──► If Standalone / Blank (No Batch):
              Groups subjects by Standard (<optgroup label="Class X">)
              Displays standard context (e.g., "Mathematics (Class X)")
```

### 4.1 Backend Hardening (`eduboard_service.py`)
1. **Mandatory Soft-Delete Filtering:** Enforced `Subject.is_active == True` on `get_teacher_context()`.
2. **Canonical Metadata Enrichment:** Joined `CanonicalSubject` to populate `canonical_name` and `standard_name` on each returned subject item.
3. **Automatic Mapping Bridge (Rule 011):** In `create_board()`, if `subject_mapping_id` is omitted, the service auto-resolves it from `SubjectMapping` using `(standard_id, subject_id, canonical_subject_id)`.
4. **Validation Guard:** Prevents creation with inactive or standard-mismatched subjects, returning a clean 400 error.
5. **Audited Endpoints:** Applied `Subject.is_active == True` to `student_portal.py` and `students.py` to eliminate identical leaks in student views.

### 4.2 Frontend Hardening (`EduBoardWorkspace.tsx`)
1. **Dynamic Cascading:** When a batch is selected, `availableSubjects` automatically narrows to subjects mapped to that batch's standard.
2. **Auto-Reset on Incompatibility:** Switching batches automatically resets the selected subject if it does not belong to the newly selected standard.
3. **Contextual Grouping:** When no batch is selected, subjects are cleanly categorized using standard `<optgroup>` headers.
4. **Session Auto-Fill:** Selecting a Teaching Session automatically binds the corresponding batch, subject, and title.

---

## 5. Verification & Test Suite Results

1. **Backend Unit Tests:**
   - `tests/test_eduboard_system.py`: 6/6 tests passed (including new `test_eduboard_context_excludes_inactive_subjects_and_enriches_canonical`).
   - `tests/test_eduboard_layout_popout.py`: 4/4 tests passed.
   - `tests/test_canonical_subjects.py`: 10/10 tests passed.
   - `tests/test_subject_deduplication_consolidation.py`: 8/8 tests passed.
2. **Frontend Test Suite:**
   - `EduBoardWorkspace.test.tsx` & `EduBoardDisplayAndPopout.test.tsx`: 9/9 tests passed.
   - Full TypeScript & Vite build: 0 compilation errors.
3. **Attribution & Header Check:**
   - `python scripts/manage_headers.py check`: 100% compliance across all 591 files.

