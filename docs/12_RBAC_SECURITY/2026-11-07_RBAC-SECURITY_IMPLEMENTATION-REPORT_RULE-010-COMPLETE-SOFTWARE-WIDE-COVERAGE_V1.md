---
title: "Rule 010 Global View-First Enforcement — Complete Software-Wide Coverage Implementation Report"
module: "12_RBAC_SECURITY"
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
tags: ["rule-010", "view-first", "edit-mode", "rbac", "security", "governance"]
entities: ["User", "AuditLog"]
api_routes: ["/api/v1/*"]
related_modules: ["03_ACADEMIC_MANAGEMENT", "04_STUDENT_MANAGEMENT", "05_TEACHER_MANAGEMENT", "06_TEACHER_PAYROLL", "07_ATTENDANCE", "08_EXAMINATION", "09_FEES_PAYMENTS", "10_FINANCE_ACCOUNTING", "11_REPORTS_EXPORTS", "12_RBAC_SECURITY", "13_SYSADMIN_SETTINGS", "14_PRINTING_DOCUMENTS", "15_INTEGRATIONS"]
---

# Rule 010 Global View-First Enforcement — Complete Software-Wide Coverage Implementation Report

**Product:** PrathamOne EduOS (Coaching Institute Edition)  
**Baseline Version:** 1.0.0  
**Product Architect:** Jawahar R Mallah  
**Organization:** AITDL — AI Technology & Development Lab  
**Policy Status:** MANDATORY — PERMANENT CORE GOVERNANCE DIRECTIVE  

---

## 1. Executive Summary

This implementation report documents the complete, software-wide extension and rigorous enforcement of **Rule 010: Global View-First & Explicit Edit Mode Governance** across 100% of the **PrathamOne EduOS** application.

Prior to this engineering phase, View Mode defaults were partially enforced on a subset of profile pages and academic components. Under this directive, **View Mode is now the permanent default across every module, workspace, page, form, modal, drawer, table, and setting screen in the software**. No human user—regardless of administrative privilege—may add, create, update, modify, replace, delete, upload, or adjust application records without explicitly activating scoped Edit Mode and possessing verified backend authorization.

### Key Deliverables Achieved
1. **100% Page Coverage:** All 35 frontend page components in `frontend/src/pages/` audited. 28 mutation-capable workspace pages have been integrated with `EditModeBar`, scoped state reactivity, and action locking. The 7 view-only/analytical pages (`Dashboard`, `StudentDashboard`, `Reports`, `Receipt`, `Login`, `NotFound`, `InstallApp`) are strictly read-only and exempt from edit toggles.
2. **Strict Scoped Isolation:** All 28 workspaces utilize canonical scope strings (`academic:*`, `students:*`, `workforce:*`, `finance:*`, `admin:*`, `sysadmin:*`, `security:*`, `communication:*`, `system:*`). Activating Edit Mode in one workspace has zero side effects on any other workspace.
3. **Route Navigation & Session Auto-Reset:** Centralized layout interceptor in `Layout.tsx` guarantees that route transitions, tab switches, and user logouts immediately drop active edit modes back to View Mode.
4. **Zero-Trust Backend Security:** Backend write endpoints (`POST`, `PUT`, `DELETE`) independently enforce role permissions, financial ledger immutability, and soft-delete protections regardless of frontend state.
5. **Automated Governance CLI Engine:** Created `scripts/check_view_first_governance.py` which scans and validates 100% compliance across all stores, layouts, and page components.
6. **Exhaustive Test Coverage:** Delivered a dedicated Vitest test suite (`GlobalViewFirstSoftwareWideCoverage.test.tsx`), passed full Vitest regression suite (257 tests), and verified backend pytest suite (`test_global_view_edit_governance.py`).

---

## 2. Rule 010 Governance Specification & SSOT Principles

### 2.1 The Non-Negotiable Directives of Rule 010

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      RULE 010 — VIEW-FIRST GOVERNANCE                       │
├─────────────────────────────────────────────────────────────────────────────┤
│ 1. DEFAULT TO VIEW: Every user enters any workspace in read-only View Mode. │
│ 2. EXPLICIT ACTIVATION: Modifying data requires clicking "Enable Edit Mode". │
│ 3. STRICT SCOPING: Edit mode is isolated per workspace or entity ID.        │
│ 4. RBAC VERIFICATION: Activation requires explicit role or permission grant.│
│ 5. FINANCIAL IMMUTABILITY: Ledger entries (payments, vouchers) cannot delete│
│ 6. AUTOMATIC RESET: Navigation, tab exit, or logout resets to View Mode.    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Anti-Duplication & Single Source of Truth
In strict adherence to SSOT Rules 001–010:
- **Zero Parallel Stores:** Reused the canonical Zustand store `frontend/src/store/editModeStore.ts`.
- **Zero Parallel Banners:** Reused the standardized UI component `frontend/src/components/common/EditModeBar.tsx`.
- **Zero Parallel Confirmation Modals:** Reused `frontend/src/components/common/DeleteConfirmationModal.tsx`.
- **Single Person Master:** Identity and role verification seamlessly references `users` and `authStore.ts`.

---

## 3. Software-Wide Audit Matrix (35 Pages)

The table below provides a forensic audit and compliance verification for every page component in `frontend/src/pages/`:

| # | Page Component | Workspace Category | Canonical Scope | EditModeBar | Action Guarding | Delete Protection | Status |
|---|----------------|-------------------|-----------------|-------------|-----------------|-------------------|--------|
| 1 | `AcademicWorkspace.tsx` | Academic Management | `academic:workspace` | Rendered | Batch modals, Tree edits | Modal Confirmation | **PASS** |
| 2 | `AddStudent.tsx` | Student Management | `students:admission` | Rendered | Form submit, Photo upload | N/A (Create Form) | **PASS** |
| 3 | `Attendance.tsx` | Academic & Attendance | `academic:attendance` | Rendered | QR Check-in, Bulk Mark | Historical Retention | **PASS** |
| 4 | `Batches.tsx` | Academic Management | `academic:batches` | Rendered | Batch creation, division edits | Soft Delete | **PASS** |
| 5 | `CodeXStudio.tsx` | Security & Cryptography | `security:codex` | Rendered | Master Toggle, PIN change | N/A (Config) | **PASS** |
| 6 | `Communication.tsx` | Communication & SMS | `communication:broadcasts` | Rendered | Send broadcast, template edit | Template Delete Guard | **PASS** |
| 7 | `Courses.tsx` | Academic Management | `academic:courses` | Rendered | Course creation, fee tier | Soft Delete | **PASS** |
| 8 | `Dashboard.tsx` | Executive Reporting | *N/A (Read-Only)* | Exempt | Read-Only KPIs | No Mutations | **PASS (Exempt)** |
| 9 | `Examinations.tsx` | Academic & Exams | `academic:examinations` | Rendered | Exam creation, marks entry | Exam Delete Guard | **PASS** |
| 10 | `FeeCollection.tsx` | Finance & Fees | `finance:collection` | Rendered | Payment collection, allocations | Immutability Enforced | **PASS** |
| 11 | `Fees.tsx` | Finance & Accounting | `finance:fees` | Rendered | Structure create, payment draft | Immutability Enforced | **PASS** |
| 12 | `FormsDocuments.tsx` | Official Documents | `academic:forms_documents` | Rendered | Template editor, issue doc | Soft Archive | **PASS** |
| 13 | `ImportExport.tsx` | System Operations | `system:import_export` | Rendered | Live Grid commit, Bulk import | Rollback Safety | **PASS** |
| 14 | `ImportFeeRegister.tsx` | Finance Migration | `finance:import_fee_register` | Rendered | Legacy CSV ingestion | Audit Ledger | **PASS** |
| 15 | `InstallApp.tsx` | Utility / PWA | *N/A (Read-Only)* | Exempt | Read-Only Guides | No Mutations | **PASS (Exempt)** |
| 16 | `Login.tsx` | Authentication | *N/A (Read-Only)* | Exempt | Auth Entry | No Mutations | **PASS (Exempt)** |
| 17 | `NotFound.tsx` | System Error | *N/A (Read-Only)* | Exempt | Error View | No Mutations | **PASS (Exempt)** |
| 18 | `Payments.tsx` | Finance & Ledger | `finance:payments` | Rendered | Reversal, Edit Notes | Immutability Enforced | **PASS** |
| 19 | `Receipt.tsx` | Financial Printing | *N/A (Read-Only)* | Exempt | Printable Receipt Viewer | No Mutations | **PASS (Exempt)** |
| 20 | `Releases.tsx` | System Deployment | `system:releases` | Rendered | Release notes, deploy tag | Version Lock | **PASS** |
| 21 | `Reports.tsx` | Reporting Centre | *N/A (Read-Only)* | Exempt | Analytical Filters & Export | No Mutations | **PASS (Exempt)** |
| 22 | `Settings.tsx` | System Administration | `sysadmin:settings` | Rendered | Branding, Academic year config | Audit Trail | **PASS** |
| 23 | `StaffManagement.tsx` | Workforce Management | `workforce:staff` | Rendered | Staff creation, role assign | Soft Deactivation | **PASS** |
| 24 | `StaffProfilePage.tsx` | Workforce Dossier | `workforce:staff:profile:${id}` | Rendered | KYC update, contract edits | Historical Archive | **PASS** |
| 25 | `Standards.tsx` | Academic Management | `academic:standards` | Rendered | Class standard, division add | Soft Deactivation | **PASS** |
| 26 | `StudentDashboard.tsx` | Student Portal | *N/A (Read-Only)* | Exempt | Student/Parent View | No Mutations | **PASS (Exempt)** |
| 27 | `StudentDetail.tsx` | Student Management | `students:detail:${id}` | Rendered | Profile edit, KYC, documents | Soft Archive | **PASS** |
| 28 | `Students.tsx` | Student Directory | `students:master` | Rendered | Quick add, bulk promote | Soft Archive | **PASS** |
| 29 | `Subjects.tsx` | Academic Management | `academic:subjects` | Rendered | Subject create, board mapping | Soft Deactivation | **PASS** |
| 30 | `SysAdminWorkspace.tsx`| System Administration | `sysadmin:workspace` | Rendered | DB maintenance, cache flush | Superadmin Guard | **PASS** |
| 31 | `TeacherManagement.tsx`| Workforce Management | `workforce:teachers` | Rendered | Teacher create, subject assign | Soft Deactivation | **PASS** |
| 32 | `TeacherPayroll.tsx` | Workforce Payroll | `workforce:payroll` | Rendered | Session log, monthly calculate | Ledger Immutability | **PASS** |
| 33 | `TeacherProfilePage.tsx`| Faculty Dossier | `teacher:profile:${id}` | Rendered | Rate cards, qualification edit | Historical Archive | **PASS** |
| 34 | `UserProfile.tsx` | User Account | `admin:user:${id}` | Rendered | Password change, email update | Superadmin Guard | **PASS** |
| 35 | `Users.tsx` | User Management | `admin:users` | Rendered | User creation, role change | Deactivation Guard | **PASS** |

---

## 4. Architectural Implementation Details

### 4.1 Global Edit Mode Store (`frontend/src/store/editModeStore.ts`)
The Zustand store manages active scopes as an isolated dictionary `scopes: Record<string, boolean>`.
- Default state: `scopes: {}` (Every scope evaluates to `false` = View Mode).
- Scope enabling: Validates role/permission. Rejects viewers, students, and unauthenticated callers.
- Scope disabling: Reverts scope to `false` and flushes the `dirty` flag for that scope.
- Global reset: `resetAll()` clears `scopes = {}` and `dirty = {}`.

### 4.2 Universal View Mode Banner (`frontend/src/components/common/EditModeBar.tsx`)
- Renders an emerald read-only banner when in View Mode:
  - Text: `View Mode Active • Read-Only Safety Lock`
  - Explanatory message: `{title} is protected. All mutation controls are disabled until Edit Mode is explicitly enabled.`
  - Action button: `Enable Edit Mode` (with unlock icon).
- Transitions to an amber active banner when explicitly enabled:
  - Text: `Edit Mode Active • Scoped Modification Workspace`
  - Action button: `Cancel Edit Mode` / `Exit Edit Mode` (with discard safety warning if unsaved changes exist).

### 4.3 Navigation & Logout Interceptor (`frontend/src/components/Layout.tsx`)
```tsx
useEffect(() => {
  // RULE 010: Route transitions unconditionally reset all active Edit Modes back to View Mode
  useEditModeStore.getState().resetAll()
}, [location.pathname])
```
Whenever a user navigates between routes, all active scopes are immediately purged, ensuring that no stale edit permissions persist across views.

### 4.4 Automated Governance CLI Engine (`scripts/check_view_first_governance.py`)
To prevent future regressions, an automated verification engine was built and added to the repository:
- Validates initial Zustand store state.
- Validates `Layout.tsx` reset hook.
- Validates that all mutation-capable pages render `EditModeBar` and enforce `isEditMode` guards.
- Command: `python scripts/check_view_first_governance.py`.
- Result: 35/35 pages verified with 0 violations.

---

## 5. Verification & Test Suite Results

### 5.1 Frontend Vitest Suite
- **Dedicated Governance Suite:** `frontend/src/test/GlobalViewFirstSoftwareWideCoverage.test.tsx` (7 tests, 100% pass).
  - Tests universal View-First initialization across all 28 scopes.
  - Tests strict scope isolation (activating one scope leaves the other 27 scopes locked).
  - Tests multi-scope concurrency without leakage.
  - Tests permission-gated barriers.
  - Tests dirty state isolation and cleanup on exit.
  - Tests software-wide `resetAll()` on navigation/logout.
  - Tests `EditModeBar` DOM rendering and state transitions.
- **Full Vitest Suite:** 35 test files, 257 tests executed, 0 failures.

### 5.2 Backend Pytest Suite
- **Governance Suite:** `backend/tests/test_global_view_edit_governance.py` (6 tests, 100% pass).
  - Verifies unauthenticated mutation rejection (`POST`, `PUT`, `DELETE` return 401).
  - Verifies financial ledger immutability (hard deletion on payments, invoices, payroll returns 404/405).
  - Verifies soft-deletion of standards, subjects, and users (database records preserved with `is_active = False`).

### 5.3 Corporate Attribution Compliance
- Ran `python scripts/manage_headers.py check`.
- Verified 100% compliance across all 340 source code files.

---

## 6. Deployment Status & Container Synchronization

- **Production Frontend Bundle:** Compiled via Vite v5.4.21 (`tsc && vite build`) with 0 errors in 15.25s.
- **Docker Container Sync:** Executed `docker cp frontend/dist/. prashant_academy_frontend:/usr/share/nginx/html/`.
- **Live Verification:** Verified all frontend assets served cleanly by Nginx.
- **Source Control:** Ready for commit and push to `origin/master`.

---

## 7. Operational Guidelines for Future Development

1. **New Pages / Workspaces:** Any future workspace added to `frontend/src/pages/` must immediately define an `editScope`, import and render `EditModeBar`, and guard all mutation triggers with `if (!isEditMode)`.
2. **Automated Verification in CI/CD:** Include `python scripts/check_view_first_governance.py` in pre-commit and deployment verification pipelines.
3. **Ledger Immutability:** Never expose `DELETE` endpoints for financial transactions. Adjustments must follow double-entry reversals with auditable reasons.
