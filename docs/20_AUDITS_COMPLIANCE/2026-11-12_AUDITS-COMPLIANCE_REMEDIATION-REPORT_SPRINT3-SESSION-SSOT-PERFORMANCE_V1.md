---
title: "PrathamOne EduOS — Sprint 3 Session Cookies, SSOT Consolidation, Performance & Test Stability Remediation Report"
module: "20_AUDITS_COMPLIANCE"
category: "REMEDIATION-REPORT"
document_type: "REPORT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-12"
updated_date: "2026-11-12"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["sprint-3", "p2", "p3", "httponly-cookies", "ssot", "alembic-044", "performance", "asset-optimization"]
entities: ["RevokedToken", "AuditLog", "ExamMark", "FeeInvoiceItem", "SharedDocumentToken", "InstitutionSetting"]
api_routes: ["/api/v1/auth/login", "/api/v1/auth/refresh", "/api/v1/auth/logout", "/api/v1/communication/share-links", "/api/v1/standards/settings", "/api/v1/releases"]
related_modules: ["backend.app.core", "backend.app.models", "backend.app.services", "frontend.src.api", "frontend.src.store", "frontend.src.components"]
---

# PrathamOne EduOS — Sprint 3 Session Cookies, SSOT Consolidation, Performance & Test Stability Remediation Report

**Parent Audit Reference:** [2026-11-12_AUDITS-COMPLIANCE_AUDIT-REPORT_FULL-PLATFORM-SECURITY-ARCHITECTURE-AND-RECOMMENDATIONS_V1.md](file:///f:/PrashantAcademy/docs/20_AUDITS_COMPLIANCE/2026-11-12_AUDITS-COMPLIANCE_AUDIT-REPORT_FULL-PLATFORM-SECURITY-ARCHITECTURE-AND-RECOMMENDATIONS_V1.md)  
**Product:** PrathamOne EduOS (`v1.76.0`, Baseline `1.0.0`)  
**Prepared By:** AITDL Engineering & Security Team (`Jawahar R Mallah`, Product Architect)  
**Date:** `2026-11-12`

---

## 1. EXECUTIVE SUMMARY

Sprint 3 executed all remaining **P2 (Session Transport, Cryptographic & SSOT Consolidation)** and **P3 (Frontend Bundle, Navigation SSOT, PNG Assets & Test Isolation)** audit items:

1. **HttpOnly Cookie Session Transport & `jti` Revocation (`P2`):** Migrated authentication transport to `HttpOnly; SameSite=Lax` cookies (`prashant_access_token` / `prashant_refresh_token`) alongside `POST /api/v1/auth/refresh` rotation and persistent `revoked_tokens` (`jti`) revocation on `/logout` and `/refresh`. Stopped persisting raw JWTs in `localStorage['prashant-auth']` via `useAuthStore` `partialize` + `cookie-session` sentinel.
2. **Pre-Hashing, Hashed Share PINs, Git Ref Sanitization & SSOT Snapshots (`P2`):** Prevented silent 72-byte bcrypt truncation via SHA-256 pre-hashing (`_LONG_PW_PREFIX = "sha256$"`), stored `SharedDocumentToken.access_key` hashed (`get_password_hash` + `@limiter.limit("10/minute")` on public resolve), sanitized git refs in `release_service.py`, removed `academic_settings.json` flat-file fallback in `standards.py`, and landed Alembic `044_p2_ssot_snapshots` (`revoked_tokens`, `audit_logs.institution_id`, `exam_marks` snapshots/tenant, `fee_invoice_items` snapshots/tenant, `shared_document_tokens.access_key` widening).
3. **Frontend Navigation SSOT, Vite Chunk Splitting, Asset Compression & Test Stability (`P3`):** Filtered `Sidebar.tsx` Standard Menu via `modules.ts` `getAuthorizedModules(user)`, synced `/payments` and `/homework/submissions|templates` routes, removed dead `App.tsx` imports and `/fees/scholarships` / `/teacher-portal` links, guarded `logTechnicalError` behind `DEV`, added `vite.config.ts` `manualChunks`, uninstalled unused `clsx` & `date-fns`, compressed `public/media/logo/*.png` from `16,762 KB` down to `5,446 KB`, extracted shared `formatINR`/`formatDateIN`/`downloadBlob` helpers, and fixed `seed_historical_releases` cross-test ordering flakiness.

---

## 2. IMPLEMENTED CHANGES & ARTIFACTS

### 2.1 Backend Session, Cryptographic & Database Hardening

| Domain | Files Modified / Created | Key Changes Implemented |
| :--- | :--- | :--- |
| **Token Pre-Hashing & `jti`** | `backend/app/core/security.py` | Added unique `secrets.token_urlsafe(16)` `jti` claim to `create_access_token` & `create_refresh_token`; added `_LONG_PW_PREFIX = "sha256$"` SHA-256 pre-hashing for UTF-8 passwords `> 72` bytes in `get_password_hash` and matching verification in `verify_password` (backward-compatible with existing `<= 72`-byte bcrypt hashes). |
| **Cookie Auth & `jti` Revocation** | `backend/app/core/deps.py`, `backend/app/api/v1/endpoints/auth.py` | Added `ACCESS_COOKIE_NAME = "prashant_access_token"` & `REFRESH_COOKIE_NAME = "prashant_refresh_token"`, `OAuth2PasswordBearer(..., auto_error=False)`, cookie-fallback + `RevokedToken` `jti` rejection in `get_current_user`; set `HttpOnly; SameSite=lax` cookies on `/login`; added rate-limited `POST /auth/refresh` (cookie/body rotation + old `jti` revocation); updated `POST /logout` to revoke active `jti` tokens and clear cookies. |
| **Share PIN Hashing & Rate Limit** | `backend/app/api/v1/endpoints/communication.py`, `backend/app/models/communication.py` | Widened `SharedDocumentToken.access_key` to `String(128)`; hashed newly created share PINs with `get_password_hash`; added `@limiter.limit("10/minute")` on `resolve_shared_document` supporting both bcrypt verification and constant-time legacy plaintext fallback. |
| **Git Ref Safety & Test Isolation** | `backend/app/services/release_service.py` | Added `_SAFE_GIT_REF_RE` & `_sanitize_git_ref` in `get_git_commits`/`get_git_changed_files`; updated `seed_historical_releases` to check `SystemRelease.version.in_(["1.0.0", "1.4.0", "6.99.1"])` idempotently instead of skipping when any test release exists. |
| **SSOT & Tenant Snapshots** | `backend/app/models/user.py`, `exam.py`, `fee.py`, `__init__.py`, `alembic/versions/044_p2_ssot_snapshots_and_token_revocation.py`, `standards.py`, `exam_reports.py`, `fees.py`, `leads.py` | Added `RevokedToken` model and nullable indexed `institution_id` on `AuditLog`; added `institution_id`, `max_marks`, `subject_name`, `exam_name` snapshots to `ExamMark` and `institution_id`, `structure_name`, `fee_category_name` snapshots to `FeeInvoiceItem` (populated in `exam_reports.py`/`fees.py`/`leads.py` and backfilled in migration `044_p2_ssot_snapshots`); removed `academic_settings.json` fallback/writes in `standards.py`. |

### 2.2 Frontend Security, Navigation SSOT, Performance & Assets

| Domain | Files Modified / Created | Key Changes Implemented |
| :--- | :--- | :--- |
| **Cookie Transport & Storage Hygiene** | `frontend/src/api/client.ts`, `endpoints.ts`, `store/authStore.ts`, `pages/Login.tsx`, `components/Sidebar.tsx` | Enabled `withCredentials: true` on `apiClient`; suppressed `Authorization: Bearer` header when `token === 'cookie-session'`; added `partialize` excluding `token` from `localStorage['prashant-auth']` with `onRehydrateStorage` restoring `'cookie-session'`; updated `Login.tsx` to store `'cookie-session'`; wired `Sidebar.tsx` logout to call `authApi.logout()`. |
| **Sidebar SSOT & Dead Code Removal** | `frontend/src/components/Sidebar.tsx`, `config/modules.ts`, `App.tsx`, `components/common/ContextualHelpButton.tsx`, `utils/errorTaxonomy.ts` | Filtered Standard Menu `secondaryNavItems` against `getAuthorizedModules(user)`; synced `/payments` and `/homework/submissions`/`/homework/templates` in `modules.ts` & `Sidebar.tsx`; added `/users/...` active prefix highlight; removed unused `StandardsPage`/`BatchesPage` imports from `App.tsx` and dead `/fees/scholarships` & `/teacher-portal` help entries; guarded `logTechnicalError` behind `import.meta.env?.DEV`. |
| **Bundle, Deps, Formatters & Logo PNGs** | `frontend/vite.config.ts`, `package.json`, `utils/formatters.ts`, `pages/Dashboard.tsx`, `pages/Settings.tsx`, `components/common/ConcessionTraceModal.tsx`, `public/media/logo/*.png` | Added Rollup `manualChunks` (`vendor-charts`, `vendor-excel`, `vendor-icons`, `vendor-forms`, `vendor-react`); uninstalled unused `clsx` & `date-fns`; added shared `formatINR` & `formatDateIN` helpers and reused `downloadBlob` in `Dashboard.tsx` & `Settings.tsx`; downsized/optimized `public/media/logo/*.png` via Pillow (`16,762 KB` → `5,446 KB`, including `POlogo.png` `4,089 KB` → `502 KB`). |

### 2.3 Deferred / Organizational Governance Items Logged Honestly

1. **PyMuPDF (`AGPL-3.0`) License Review:** Management/legal decision required between commercial Artifex PyMuPDF licensing or replacing `PyMuPDF==1.24.5` with `pypdf`/`pdfium` under Apache/BSD terms.
2. **Legacy `subjects` FK Deprecation:** `ExamMark` and `HomeworkAssignment` populate `subject_mapping_id` / snapshot columns alongside legacy `subject_id`; full removal of `subjects` FKs across 7 child tables remains a coordinated future schema cutover to avoid breaking existing customer records.
3. **Full Multi-Page Modularization:** Shared `formatINR` / `formatDateIN` / `downloadBlob` helpers are active; decomposing oversized 1,000+ line page files (`AcademicWorkspace.tsx`, `Fees.tsx`, etc.) continues incrementally.

---

## 3. VERIFIED POST-SPRINT 3 TEST & BUILD MATRIX

| Verification Suite | Command Executed | Outcome | Details |
| :--- | :--- | :---: | :--- |
| **Alembic DB Schema (`044`)** | `docker exec prashant_academy_backend alembic upgrade head` | **PASS** | At `044_p2_ssot_snapshots (head)` on live Postgres DB |
| **Docker Security & Housekeeping Pytest** | `docker exec prashant_academy_backend python -m pytest tests/test_housekeeping.py tests/test_p0_security_lockdown.py tests/test_p1_security_hardening.py tests/test_p2_session_and_ssot.py -v` | **21/21 PASS** | `47.80s`; verifies real `pg_dump`/`psql` (8/8) + P0/P1/P2 (13/13) including `HttpOnly` cookie `/refresh` rotation & `/logout` `jti` revocation |
| **Full Backend Pytest (Windows Host)** | `cd backend ; python -m pytest -q --tb=short` | **308 passed, 2 failed** | `460.68s`; `test_release_management.py::test_get_current_release_and_seed_history` **FIXED & PASSING**; only 2 `test_housekeeping.py` fail on Windows host due to missing `pg_dump`/`psql` binaries (pass in Docker above) |
| **Frontend Vitest Suite** | `cd frontend ; npm test` | **64/64 files, 497/497 tests PASS** | `151.07s`; includes `P2SessionAndNavigation.test.tsx` (3 tests) |
| **Frontend Typecheck & Vite Build** | `cd frontend ; npx tsc --noEmit ; npm run build` | **PASS (0 errors)** | Vite production bundle built in `8.54s` with manual vendor chunks (`vendor-charts`, `vendor-react`, `vendor-forms`, `vendor-excel`, `vendor-icons`) |
| **Frontend Dependency Audit** | `cd frontend ; npm audit` | **0 vulnerabilities** | Clean dependency tree after removing unused `clsx` & `date-fns` |
| **Attribution Headers** | `python scripts/manage_headers.py check` | **564/564 PASS** | 0 failures across all tracked source files |

