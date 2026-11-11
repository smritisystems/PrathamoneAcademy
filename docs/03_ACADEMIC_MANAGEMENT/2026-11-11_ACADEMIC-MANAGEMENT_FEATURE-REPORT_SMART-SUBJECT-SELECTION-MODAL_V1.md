---
title: "Smart Subject Selection Modal — Search-First UX with Canonical Autocomplete & Duplicate Recommendations"
module: "03_ACADEMIC_MANAGEMENT"
category: "FEATURE-REPORT"
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
tags: ["subjects", "modal", "autocomplete", "SSOT", "deduplication", "UX"]
entities: ["CanonicalSubject", "SubjectMapping", "Subject"]
api_routes: ["/api/v1/subjects/", "/api/v1/subjects/canonical", "/api/v1/subjects/duplicate-check", "/api/v1/subjects/mappings"]
related_modules: ["03_ACADEMIC_MANAGEMENT", "16_DATABASE_API", "17_UI_UX_DESIGN"]
git_commit: "278a6d7"
---

# Smart Subject Selection Modal — Feature Report

## 1. Overview

This report documents the implementation of the **Smart Search-First Subject Selection UX** across
both academic subject entry points in **PrathamOne EduOS**:

1. **`AcademicWorkspace.tsx`** (`"Add Subject to Curriculum"` modal) — Added option to **Select Existing Subject** (searchable canonical catalog + partial/token recommendations + auto-code suggestion) OR **Create New Subject** (with live duplicate & similar-subject recommendations and 1-click reuse).
2. **`Subjects.tsx`** (`"Add / Map Subject"` modal, commit `278a6d7`) — Replaced the 2-tab dialog with a **unified 3-step search-first flow** (`1 · Search` → `2 · Map to Class` → `3 · Register New`).
3. **`backend/app/api/v1/endpoints/subjects.py`** — Consolidated `GET /api/v1/subjects/` across unscoped multi-institution queries, added optional `institution_id` filtering, and aligned `passing_marks` / `is_core` / `category` / `aliases` compatibility with `AcademicWorkspace.tsx`.

---

## 2. Problem Statement & Resolution

| Issue | Previous Behaviour | New Behaviour |
|-------|--------------------|---------------|
| `AcademicWorkspace.tsx` Add Subject modal | Plain text input only; blindly created subjects without showing existing canonical subjects | Default **Select Existing Subject** searchable picker from canonical catalog, with inline recommendations and fallback **Create New Subject** CTA |
| Similar/duplicate entry when creating | No live warning or recommendation in `AcademicWorkspace.tsx` | Debounced live duplicate check + local fallback warns user with clickable **Use Existing** recommendations |
| `Subjects.tsx` 2-tab modal | Allowed jumping straight to Register New without searching first | Unified **3-step flow**: mandatory Step 1 search/quick-pick → Step 2 map → Step 3 create |
| Multi-institution `/api/v1/subjects/` | Unscoped queries could return identical canonical subject names across multiple institutions | Added `institution_id` scoping + normalized name deduplication merging standards and alternate codes |
| Syllabus field naming | Backend used `pass_marks` / `is_optional` while UI sent `passing_marks` / `is_core` | Backend accepts and returns both field pairs consistently |

---

## 3. Implementation Details

### 3.1 `frontend/src/pages/AcademicWorkspace.tsx`

In the `"Add Subject to Curriculum"` modal (when adding, preserving the Edit modal cleanly):

- **Mode Toggle**:
  - **Select Existing Subject** (default): Loads canonical subjects on modal open (`enabled: showAddSubjectModal && !showEditSubjectModal`), filters by name, code, category, aliases, or legacy alternate codes.
  - **Create New Subject**: Displays live debounced `subjectsApi.checkDuplicate(name)` results (with local catalog fallback) as an amber **Existing Subject Recommendation** banner featuring clickable reuse buttons.
- **No-Match Recommendations & CTA**: When search yields zero exact matches in Select Existing mode, partial/prefix matches are surfaced as **Recommended Existing Subjects**, alongside a **Create New Subject "<query>"** button that switches modes and pre-fills subject name and suggested code.
- **Mapping Action**: Selecting an existing canonical subject calls `subjectsApi.createMapping(...)`, creating the standard curriculum mapping and backward-compatible `Subject` row without duplicating canonical records.

### 3.2 `frontend/src/pages/Subjects.tsx`

- **Step 1 · Search**: Live autocomplete (`>= 2` chars against `GET /api/v1/subjects/canonical?search=...`) plus quick-pick list of canonical subjects and a `Subject not listed? Register new →` link.
- **Step 2 · Map to Class**: Confirmed canonical card showing code badge, category, aliases, and legacy codes, with standard/board/marks configuration.
- **Step 3 · Register New**: Live 400 ms debounced duplicate check with exact-match reuse button and similar-subject suggestions.

### 3.3 `backend/app/api/v1/endpoints/subjects.py`

- Added `institution_id: Optional[int] = Query(None)` to `list_subjects` (`GET /api/v1/subjects/`).
- Applied `effective_inst_id` scoping when `institution_id` or `current_user.institution_id` is present, and consolidated duplicate normalized canonical names when unscoped.
- Extended `SubjectCreate` and `SubjectUpdate` to accept optional `passing_marks`, `is_core`, `category`, and `aliases`, and added `passing_marks` and `is_core` to `list_subjects` and `get_subject` payloads.

---

## 4. SSOT Governance Compliance

| Rule | How Enforced |
|------|-------------|
| RULE 001 — Single Source of Truth | `canonical_subjects` remains authoritative; selecting existing subjects maps directly to canonical IDs |
| RULE 002 — Mandatory Reuse Before Creation | Searching and selecting existing subjects is the default primary path in both modals |
| RULE 010 — View-First Governance | Edit Mode protections preserved (`Subjects.tsx` locked controls, safe delete modals) |
| RULE 011 — No shared entity duplication | Exact and similar canonical recommendations block accidental grade-based duplication |

---

## 5. Verification & Test Results

| Check | Result | Scope / Details |
|-------|--------|-----------------|
| Backend Pytest Regression (`pytest`) | **PASSED** | `268 passed, 4 skipped, 0 failed` (full suite including all 8 subject deduplication tests & 10 canonical subject tests) |
| Academic & Subject Vitest Suite | **PASSED** | `3/3` test files, `27/27` tests passed (`CanonicalSubjects.test.tsx`, `AcademicWorkspace.test.tsx`, `AcademicDedicatedSubmenus.test.tsx`) |
| Forms Submenu Standalone Vitest | **PASSED** | `12/12` passed (`FormsDedicatedSubmenus.test.tsx`; 1 timeout/flake seen earlier during parallel full-suite run under heavy CPU load) |
| Frontend Production Build (`tsc && vite build`) | **PASSED** | `0` TypeScript errors, `2368` modules transformed cleanly |
| Corporate Header Compliance | **PASSED** | `527/527` files passed (`manage_headers.py check`) |
| Docker Containers | **HEALTHY** | `prashant_academy_db`, `prashant_academy_backend`, `prashant_academy_frontend` all `Up (healthy)` |

---

## 6. Files Modified

- `frontend/src/pages/AcademicWorkspace.tsx`
- `frontend/src/pages/Subjects.tsx` (commit `278a6d7`)
- `frontend/src/api/endpoints.ts`
- `backend/app/api/v1/endpoints/subjects.py`
- `frontend/src/test/AcademicWorkspace.test.tsx`
- `frontend/src/test/CanonicalSubjects.test.tsx`
- `docs/03_ACADEMIC_MANAGEMENT/2026-11-11_ACADEMIC-MANAGEMENT_FEATURE-REPORT_SMART-SUBJECT-SELECTION-MODAL_V1.md`
