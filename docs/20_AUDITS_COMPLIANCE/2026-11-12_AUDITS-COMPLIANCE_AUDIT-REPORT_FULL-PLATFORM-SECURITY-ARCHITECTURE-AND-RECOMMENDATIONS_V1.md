---
title: "PrathamOne EduOS — Full Platform Security, Architecture, Governance & Dependency Audit"
module: "20_AUDITS_COMPLIANCE"
category: "AUDIT-REPORT"
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
tags: ["full-audit", "security", "rbac", "multi-tenancy", "idor", "rule-010", "rule-011", "ssot", "dependencies", "performance", "nginx"]
entities: ["User", "Institution", "Student", "Payment", "PaymentReceipt", "FeeInvoice", "FeeConcessionAllocation", "TeacherPayroll", "AuditLog", "ExamMark", "Subject", "CanonicalSubject", "SubjectMapping", "StaffProfile"]
api_routes: ["/api/v1/payments/online/webhook", "/api/v1/import-register", "/api/v1/teacher-payroll", "/api/v1/institutions", "/api/v1/users", "/api/v1/housekeeping", "/api/v1/governance", "/api/v1/examinations", "/api/v1/homework", "/api/v1/attendance", "/api/v1/students", "/api/v1/reports", "/api/v1/concessions", "/api/v1/communication", "/api/v1/forms", "/api/v1/fees", "/api/v1/student-portal", "/api/v1/codex"]
related_modules: ["01_ARCHITECTURE", "03_ACADEMIC_MANAGEMENT", "04_STUDENT_MANAGEMENT", "05_TEACHER_MANAGEMENT", "06_TEACHER_PAYROLL", "07_ATTENDANCE", "08_EXAMINATION", "09_FEES_PAYMENTS", "12_RBAC_SECURITY", "13_SYSADMIN_SETTINGS", "16_DATABASE_API", "18_TESTING_QA", "25_BUSINESS_REQUIREMENTS"]
---

# PRATHAMONE EduOS — FULL PLATFORM AUDIT & RECOMMENDATIONS

**Product:** PrathamOne EduOS (Coaching Institute Edition)  
**Audit Date:** 2026-11-12  
**Codebase Revision:** `master` (`eb97155`)  
**Scope:** End-to-end static & verification audit across `backend/app/` (38 endpoint routers, services, core security/config/deps, 27 model files, 43 Alembic migrations), `frontend/src/` (all pages, components, routing, stores, API client, assets, tests, `nginx.conf`, `vite.config.ts`), dependencies (`requirements.txt`, `package.json`), Docker setup (`docker-compose.yml`), and documentation/attribution governance.

---

## 1. EXECUTIVE SUMMARY & PLATFORM SCORECARD

PrathamOne EduOS delivers broad coaching-institute functionality with notable architectural strengths in newer governance subsystems: canonical `User`/`Student` identity masters, immutable `PaymentReceipt` JSON snapshots with supersession/cancellation lineage, `FeeConcessionAllocation`/`FinancialPeriod` ledger locks, the **Help & About Centre** (recently P0–P3 hardened), a clean **62/62 (487/487)** frontend test suite, **0** TypeScript errors, **412/412** valid docs, and **556/556** compliant source attribution headers.

However, **platform-wide multi-tenant isolation, RBAC enforcement, payment/file-handling security, Rule 010 View-First coverage, and dependency currency carry high operational risk** in any multi-tenant or internet-facing deployment:

| Audit Pillar | Status | Key Verified Evidence |
| :--- | :---: | :--- |
| **RBAC & Privilege Isolation** | **Critical Risk** | **Zero `require_role`** across all 25 routes in `teacher_payroll.py`, all 16 routes in `homework.py`, all 4 routes in `institutions.py`, `import_register.py`, `examinations.py`, `attendance.py`, 19/22 routes in `reports.py`, plus PII/financial read/admin endpoints (`students.py`, `fees.py`, `payments.py`, `concessions.py`, `communication.py`, `forms.py`, `codex.py`). Frontend `App.tsx` applies `StaffRoute` only to `/dashboard`. |
| **Multi-Tenant Isolation (`institution_id`)** | **Critical Risk** | `SafeDeleteService`, `users.py` mutations, `housekeeping.py` (shared cluster DB backup/restore exposed to tenant `admin`), `student_portal.py` (`?student_id=`), `data_importer.py`, `divisions.py`, `timetable.py`, `boards.py`, `academic_years.py`, `standards.py`, `subjects.py`, `fees.py`, `concessions.py`, `staff.py`, and global `AuditLog` lack tenant scoping. |
| **Payment & File/Host Security** | **Critical Risk** | Unauthenticated `/payments/online/webhook` with no HMAC check; `test` gateway signature bypass & client-trusted payment amounts; arbitrary server `file_path` open + destructive `PA2024%` wipe in `import_register.py`; unbounded uploads (`import_export.py`, `housekeeping.py`); unvalidated `mirror_dir` write. |
| **Auth, Secrets & Transport Hardening** | **High Risk** | Demo credentials (`admin`/`admin123`, `accountant`/`account123`) rendered in production `Login.tsx`; JWT stored in `localStorage`; `refresh_token` accepted as access Bearer token; `DEBUG=True` default & static compose `SECRET_KEY` fallback; `nginx.conf` HTTP-only with no security headers and `server_tokens` enabled; backend runs as container `root`. |
| **Rule 010 (View-First Governance)** | **High Risk** | Complete absence in `TrainingManagement.tsx` & `StudentDashboard.tsx`; declared `isEditMode` ignored in `Releases.tsx`, `UserProfile.tsx`, `Users.tsx` row actions, and `Payments.tsx` core workflow actions; `counselor`/`counsellor`/`receptionist`/`coordinator` locked out of Edit Mode; `Layout.tsx` skips `?tab=` reset. |
| **SSOT & Rule 011 Compliance** | **Moderate / Mixed** | Financial & concession ledgers are strongly immutable; legacy `subjects` table still coexists with `CanonicalSubject`/`SubjectMapping` across 7 child tables; `StaffProfile` retains inline bank/ID/address columns alongside child tables; `ExamMark` lacks `institution_id` and snapshots; `AuditLog` lacks `institution_id`. |
| **Dependencies & Vulnerabilities** | **High Risk** | GitHub Dependabot reports **84 vulnerabilities** on default branch (`10 critical, 41 high, 29 moderate, 4 low`). Local `npm audit` flags **10** (`tinypool` critical, `xlsx` high with no fix, `zod` high, `react-router`/`esbuild`/`vite` moderate). Python `requirements.txt` pins stale `fastapi==0.111.0`, `starlette==0.37.2`, `python-jose==3.3.0`, `Pillow==10.3.0`, `PyMuPDF==1.24.5` (`AGPL-3.0`). |
| **Tests, Build & Tooling Hygiene** | **Good / Needs Attention** | Frontend Vitest **62/62 files (487/487 tests)** PASS, `tsc --noEmit` **0** errors. Backend Pytest **294 passed, 3 failed** (2 `test_housekeeping.py` require container `pg_dump`/`psql`; 1 `test_release_management.py` ordering flakiness). Alembic synced at `043_help_about_centre (head)`. Docs **412/412** PASS, Headers **556/556** PASS. |

---

## 2. CRITICAL (P0) SECURITY & AUTHORIZATION FINDINGS

### C1. Payment Gateway Webhook Auth Missing, Test Signature Bypass & Unvalidated Amounts
- **Evidence:**
  - `backend/app/api/v1/endpoints/payments.py`: `online_payment_webhook_endpoint` (`L2426-2447`), `create_online_order_endpoint` (`L2380-2397`), `verify_online_payment_endpoint` (`L2401-2422`).
  - `backend/app/services/payment_gateway.py`: `DEFAULT_GATEWAY_CONFIG` (`L38-46`), `create_gateway_order` (`L138-211`), `verify_razorpay_signature` (`L214-232`), `verify_and_post_gateway_payment` (`L235-295`).
- **Impact:**
  1. `POST /api/v1/payments/online/webhook` requires neither authentication nor `X-Razorpay-Signature` HMAC verification.
  2. `verify_razorpay_signature` returns `True` when gateway mode defaults to `"test"` (`DEFAULT_GATEWAY_CONFIG` `L40`) and `signature` matches `"test_signature_valid"` / `"mock_signature_valid"` or secret is unset.
  3. Order/verification endpoints check only `get_current_active_user`, fail to verify `invoice.student.institution_id == current_user.institution_id` or `"student"` ownership, and `verify_and_post_gateway_payment` (`L292`) posts the client-supplied `payload.amount` without server-side order-amount verification.

### C2. Arbitrary Server File Read & Destructive `PA2024%` Data Wipe (`import_register.py`)
- **Evidence:** `backend/app/api/v1/endpoints/import_register.py` (`DEFAULT_WORKBOOK_PATH` `L36`, `ImportExecuteRequest.file_path` `L41`, routes at `L45`, `L66`, `L81`, `L111`); `backend/app/services/fee_register_importer.py` (`L354-385`).
- **Impact:** All 4 routes rely solely on `get_current_active_user` (zero `require_role` checks). Any `"student"` can trigger `execute_register_import` against an arbitrary server `file_path` (`with open(file_path, "rb")`, `L90-98`) or wipe existing `PA2024%` students/invoices/payments inside `fee_register_importer.py`, while `preview_uploaded_register` reads unbounded uploads into memory.

### C3. Complete Missing RBAC & Tenant Checks Across `teacher_payroll.py`
- **Evidence:** All 25 routes in `backend/app/api/v1/endpoints/teacher_payroll.py` (`L178` through `L1069`).
- **Impact:** Every route uses only `Depends(get_current_active_user)` with zero `require_role` guards. Any `"student"`, `"teacher"`, or `"staff"` account can inspect/edit teacher pay rates (`L339`), bulk-approve sessions (`L554`), calculate/approve/finalize/adjust payrolls (`L679-889`), record or reverse payment vouchers (`L968-997`), and export payroll reports (`L1069`), with no `institution_id` verification on target primary keys (`L357`, `L369`, `L520`, `L565`, `L580`, `L755`, `L850-889`, `L968-997`).

### C4. Arbitrary Institution Enumeration, Creation & Modification (`institutions.py`)
- **Evidence:** `backend/app/api/v1/endpoints/institutions.py` (`list_institutions` `L56-105`, `create_institution` `L109-122`, `get_institution` `L186-215`, `update_institution` `L219-235`).
- **Impact:** All 4 routes accept any `get_current_active_user` with zero role or tenant checks, allowing any `"student"` to enumerate all institutions, create institutions, or overwrite any institution's name, contacts, and branding. `list_institutions` (`L67-83`) also writes to the DB inside a `GET` handler.

### C5. Cross-Tenant User Takeover (`users.py`) & Cluster-Wide DB Access by Tenant Admins (`housekeeping.py`)
- **Evidence:**
  - `backend/app/api/v1/endpoints/users.py`: `list_users` (`L171-196`), `get_user_profile_workspace` (`L381-398`), `update_user` (`L757-828`), `reset_user_password` (`L857-894`), `toggle_user_status` (`L898-940`), `resend_user_invitation` (`L944-974`), `delete_user` (`L978-989`).
  - `backend/app/api/v1/endpoints/housekeeping.py` (`L111-406`); `backend/app/services/housekeeping_service.py` (`L621-626`, `L803-820`).
- **Impact:**
  - Tenant `"admin"` / `"principal"` users can read, role-escalate, password-reset (receiving plaintext `temporary_password` at `L892`), deactivate, or delete users in **other institutions** and global sysadmins (`user.institution_id is None`).
  - `_require_housekeeping_access` permits tenant `"admin"` accounts to trigger full PostgreSQL `pg_dump` backups, download `.edu` database dumps containing **all tenants**, upload & run `DROP DATABASE` / live restores, write backups to unvalidated `mirror_dir` (`L621-626`), and run storage cleanups.

### C6. Cross-Tenant Deletion, Deactivation & Archival via `SafeDeleteService` IDOR
- **Evidence:** `backend/app/api/v1/endpoints/governance.py` (`L59-160`); `backend/app/services/safe_delete_service.py` (`L801-1311`).
- **Impact:** `check_delete_eligibility` (`L59`) lacks `require_role`; `SafeDeleteService` fetches target rows (`Student`, `User`, `Standard`, `Division`, `Subject`, `Payment`, etc.) by PK without verifying `institution_id == current_user.institution_id`; `list_governance_audit_logs` (`L148`) exposes `AuditLog` globally across tenants.

### C7. Production Demo Credentials & Missing Frontend Route / Nginx Security Controls
- **Evidence:**
  - `frontend/src/pages/Login.tsx` (`L456-482`): Unconditionally renders `"Quick Access Profiles"` (`admin` / `admin123`, `accountant` / `account123`) in production UI with no `import.meta.env.DEV` gate.
  - `frontend/src/App.tsx` (`L138`, `L168-354`): `StaffRoute` protects only `/dashboard`; `/users`, `/sysadmin`, `/housekeeping`, `/settings`, `/fees/*`, `/payments`, and `/teacher-payroll` use `<PrivateRoute>` only.
  - `frontend/nginx.conf` (`L1-60`): Listens only on HTTP `:80`, omits `server_tokens off;`, and defines zero security headers (`Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security`, `Referrer-Policy`, `Permissions-Policy`).

---

## 3. HIGH (P1) FINDINGS ACROSS BACKEND, FRONTEND & INFRASTRUCTURE

### H1. Systemic Missing `require_role` & Student Ownership Checks Across Core Modules
- **`examinations.py`** (`L111`, `L134`, `L150`, `L172`, `L188`): Any authenticated user (including `student`) can create exams, view/edit marks, and view any student's analytics/report card.
- **`homework.py` & `homework_service.py`** (`L137-834`): All 16 routes omit `require_role`; any student can create/delete assignments (`L248`, `L336`, `L364`), grade submissions (`L465`), extend due dates (`L509`), exempt students (`L532`), and inspect teacher dashboards (`L678`, `L749`, `L767`).
- **`attendance.py`** (`L64`, `L141`, `L256`): Any student can mark bulk attendance, run QR check-ins, and list all institutional attendance.
- **`students.py`** (`L186`, `L391`, `L410`, `L503`, `L1664`): Any student can list all students, retrieve batch ID cards, and access full PII (`aadhar_number`, DOB, address, phone, guardians, fee summary at `L443-498`).
- **`payments.py`** (`L842`, `L1174`, `L1355`, `L1453`, `L1563`, `L2061`, `L2187`, `L2266`, `L2454`): `get_payment`, `get_receipt`, `get_receipt_pdf`, and `export_bulk_receipts_zip` perform no `student_id` ownership check when `role == "student"`; list/reprint/period routes omit `require_role`.
- **`reports.py` & `report_intelligence.py`**: 19/22 report endpoints (`L86-1584`) lack `require_role` (including `system_audit_summary_report` `L1530`, which dumps cross-tenant `AuditLog`); `update_report_thresholds` (`L80`) lacks `require_role`.
- **`concessions.py`, `communication.py`, `forms.py`, `fees.py`, `enrollments.py`, `releases.py`, `settings.py`, `codex.py`:** Missing `require_role` on operational/financial/PII routes (`forms.py` & `form_renderer.py` `L293-300`, `L403-405` also synthesize dummy marks/fee amounts when real rows are absent; `releases.py` `L86`/`L102` seed DB records on `GET`).

### H2. Cross-Tenant `institution_id` Isolation Gaps (IDOR)
- **`student_portal.py`** (`get_effective_student` `L65-111`, `update_student_portal_profile` `L948`): Non-student callers pass `?student_id=` without `check_institution_access`.
- **`data_importer.py` (`import_export.py`):** Lookups/updates on `Division` (`L502`, `L521`, `L675`, `L820`), `Payment.transaction_reference` (`L524`, `L859`), `AcademicYear` (`L682`), `Student.admission_number` (`L713`), and `Board.code` (`L795`) lack `institution_id` scoping.
- **`divisions.py`**, **`timetable.py`**, **`boards.py`**, **`academic_years.py`**, **`standards.py`**, **`subjects.py`**, **`fees.py`**, **`concessions.py`**, **`payments.py`** (`cancel_receipt` `L882`, `create_payment_refund` `L932`, `close/reopen_financial_period` `L2504/L2525`), **`codex.py`** (`profile_id` routes `L382/L426/L457`), **`staff.py`** (`L1310-1702`, `L2116-2140`), **`communication.py`** (`L204/L236/L259/L482/L678`), **`settings.py`** (`delete_lookup_item` `L660`), **`study_materials.py`** (`L287`): Missing `check_institution_access` / tenant filtering. Additionally, `core/deps.py:check_institution_access` (`L177-188`) returns silently when `target_institution_id is None`.

### H3. Auth Token Confusion, Weak Fallback Secrets, `localStorage` & XSS Sinks
- **JWT Type Confusion (`deps.py` `L31-56`, `security.py` `L59-64`):** `get_current_user` does not require `payload.get("type") == "access"`, allowing long-lived `refresh_token`s to act as access tokens, and `int(user_id)` raises an unhandled `ValueError` (HTTP 500) on malformed `sub`.
- **Insecure Defaults (`config.py`, `docker-compose.yml`, `.env.example`):** `config.py` defaults `DEBUG = True` (`L46`), bypassing `validate_security()` and exposing `/api/docs`. `docker-compose.yml` (`L31`) and `.env.example` (`L25`) ship a hardcoded 68-character fallback `SECRET_KEY` that bypasses `validate_security()`, plus default `postgres`/`postgres` credentials with host port `5432:5432` exposed (`L7-11`).
- **Frontend Token Storage & HTML/SVG Sinks:** JWT stored in `localStorage['prashant-auth']` (`authStore.ts:34-110`); unsanitized `dangerouslySetInnerHTML` on SVG QR payloads (`OnlinePaymentModal.tsx:357`, `StudentIDCardModal.tsx:276`); unescaped `title` / `classification` / `docId` / `softwareBranding` / `innerHTML` written in `printLayoutEngine.ts:502-548`, `printReceipt.ts:111,457`, and `printIDCard.ts:297`.

### H4. Rule 010 View-First Edit Mode & Cross-Stack Role Gaps
- **Missing Edit Mode:** `TrainingManagement.tsx` (sandbox reset `L344/496`, card-click policy mutation `L269`) and `StudentDashboard.tsx` (`L159`, `L201`, `L1221`, `L1438`).
- **Bypassed Edit Mode (`isEditMode` unused or incomplete):** `Releases.tsx` (`L43` unused across `L404-552` lifecycle actions), `UserProfile.tsx` (`L59` unused across `L143-192`, `L388-433`), `Users.tsx` (row actions `L249-303`, `L796-859` run in View Mode), `Payments.tsx` (draft/submitted/approved workflow & lock toggles `L580-604`, `L890-1020`), `ImportExport.tsx` (`L1067`, `L1206` buttons lack visual lock), `Batches.tsx`/`Standards.tsx` (modal submit omits guard).
- **Role Lockout & Spelling Drift:** `editModeStore.ts:99-104` and `EditModeBar.tsx:86` omit `"counselor"`, `"counsellor"`, `"receptionist"`, and `"coordinator"`; backend uses `"counsellor"` in `leads.py:1318` vs `"counselor"` in `navigation_service.py:410-413` and frontend panels. `Layout.tsx:75-78` resets Edit Mode only on `location.pathname`, leaving Edit Mode active across `?tab=` switches.

### H5. Vulnerable & Outdated Dependencies
- **GitHub Repository Alerts (observed on push to `origin/master`):** **84 vulnerabilities** (`10 critical, 41 high, 29 moderate, 4 low`).
- **Frontend (`npm audit`):** **10 vulnerabilities** (`3 critical, 3 high, 4 moderate`):
  - `tinypool <=2.1.1` (critical — prototype pollution -> RCE, dev/test runner via `vitest`).
  - `xlsx *` (high — prototype pollution & ReDoS, **no upstream fix available**).
  - `zod <4.6.6` (high — memory exhaustion on constrained collections).
  - `react-router` / `react-router-dom` `6.0.0–7.17.0` (moderate — backslash open redirect `CVE-2025-68470` bypass & SSR hydration constructor injection).
  - `esbuild <=0.24.2` / `vite <=6.4.3` (moderate — dev server request leak).
- **Backend (`requirements.txt` & `pip list --outdated`):** `fastapi==0.111.0` (latest `0.162.5`), `starlette==0.37.2` (`1.10.0`), `python-jose==3.3.0` (`3.5.0` — legacy JWT lib with CVEs; prefer `PyJWT`), `Pillow==10.3.0` (`13.0.0`), `Jinja2` (`3.1.4` vs `3.1.6`), `cryptography` (`50.0.1` vs `50.0.2`), `pydantic==2.7.1`, `SQLAlchemy==2.0.30`, `alembic==1.13.1`, `asyncpg==0.29.0`, `PyMuPDF==1.24.5` (`AGPL-3.0` commercial compliance review note).

---

## 4. MEDIUM (P2) & LOW (P3) ARCHITECTURE, SSOT, TEST & PERFORMANCE FINDINGS

1. **SSOT & Rule 011 Schema Gaps (`backend/app/models/`):**
   - `CanonicalSubject` + `SubjectMapping` exist, but legacy per-standard `subjects` (`Subject` `L167-209`) remains wired as a required/companion FK across 7 tables (`exam_marks`, `timetable_entries`, `study_materials`, `teacher_assignments`, `teaching_sessions`, `homework_assignments`, `lead_demo_classes`).
   - `StaffProfile` (`L53-62, L89-92`) duplicates bank/ID/address/contact columns already modeled in `StaffBankAccount`, `StaffAddress`, and `StaffKeyContact`; `User.staff_code`/`designation` overlaps `StaffProfile`.
   - `ExamMark` (`exam.py:61`) lacks `institution_id` and historical snapshots (`max_marks`, `subject_name`, `exam_name`); `FeeInvoice`/`FeeInvoiceItem` lack direct snapshot labels; `AuditLog` (`user.py:122`) and 12 other operational models lack direct `institution_id` columns.
2. **Backend Operational & Auth Hygiene Gaps:**
   - `codex.py`, `forms.py`, and `report_intelligence.py` use `get_current_user` instead of `get_current_active_user` (allowing deactivated accounts to retain access until token expiry).
   - `auth.py:logout` (`L84-88`) is a stateless no-op while `.env` extends token TTL to `1440` minutes.
   - `communication.py` (`resolve_shared_document` `L333-374`) stores plaintext share PINs (`L275`), compares with `!=` (`L353`) rather than `hmac.compare_digest`, and lacks rate limiting.
   - `housekeeping_service.py` (`L803-820`) interpolates `target_db` into `psql -c` strings; `release_service.py` (`L260-312`) passes `since_commit..HEAD` to `git`; `standards.py` (`L60, L101`) reads/writes a single un-scoped `academic_settings.json` file instead of `InstitutionSetting`; `staff.py` (`L775-814`) exposes unmasked bank `account_number`/`ifsc_code`.
   - `backend/Dockerfile` executes as container `root` (no non-root `USER`).
   - `security.py:37` silently truncates passwords at 72 bytes (`bcrypt` limit).
3. **Frontend Menu Drift, Console Logs, Dead Code & Bundle Performance:**
   - `Sidebar.tsx` (`2,629 lines`) duplicates `modules.ts` navigation in Standard Menu mode (`L2496-2530`), ignoring `requiredPermission`, adds `/payments` inconsistently under `feesSubItems` (`L73`), omits `/homework/submissions` & `/homework/templates`, and highlights `/users` with exact equality only; `App.tsx:32-33` retains unrouted `StandardsPage`/`BatchesPage` imports; `ContextualHelpButton.tsx` maps dead `/fees/scholarships` & `/teacher-portal`.
   - `errorTaxonomy.ts:407-444` prints raw error stacks to browser console in production (`logTechnicalError` lacks `DEV` check).
   - **Bundle & Assets:** Zero `manualChunks` in `vite.config.ts`; 27 pages exceed 1,000 lines (`Fees.tsx` = 7,547 lines / 374 KB; `AcademicWorkspace.tsx` = 4,749 lines); `public/media/logo/POlogo.png` is **4.0 MB** (alongside 5 other `1.1–1.9 MB` PNG logos); unused `clsx` & `date-fns` packages in `package.json`; duplicate CSV/blob (`createObjectURL` in 7+ files instead of `reportExport.ts`) and 30+ inline `en-IN` currency/date formatters violating Rule 008.
4. **Test Suite Portability & Isolation (`backend/tests/`):**
   - `test_housekeeping.py` fails (`503`) on Windows host when `pg_dump`/`psql` are not on `PATH` (passes only inside Docker image).
   - `test_release_management.py::test_get_current_release_and_seed_history` failed during full-suite run (`294 passed, 3 failed`) yet passed standalone (`10.88s`), showing cross-test `Release` DB state leakage.

---

## 5. VERIFIED TEST, BUILD & TOOLING BASELINE (`2026-11-12`)

| Check | Scope & Command | Outcome | Notes |
| :--- | :--- | :---: | :--- |
| **Backend Pytest (Full — Post-Sprint 3 Host)** | `cd backend ; python -m pytest -q --tb=short` | **308 passed, 2 failed** | `460.68s`; `test_release_management.py` ordering flakiness fixed (**PASS**); only 2 `test_housekeeping.py` fail on Windows host (`pg_dump`/`psql` missing — pass **8/8** in Docker) |
| **Backend Container Tests (Docker)** | `docker exec prashant_academy_backend python -m pytest tests/test_housekeeping.py tests/test_p0_security_lockdown.py tests/test_p1_security_hardening.py tests/test_p2_session_and_ssot.py -v` | **21/21 PASS** | `47.80s`; verifies `pg_dump`/`psql` + P0/P1/P2 lockdowns, `HttpOnly` cookie `/refresh` rotation, and `RevokedToken` `jti` logout |
| **Frontend Vitest (Full — Post-Sprint 3)** | `cd frontend ; npm test` (`vitest run --pool=forks`) | **64/64 files, 497/497 tests PASS** | `151.07s` (includes Sprint 3 `P2SessionAndNavigation.test.tsx`) |
| **TypeScript Typecheck & Prod Build** | `cd frontend ; npx tsc --noEmit` & `npm run build` | **PASS (0 errors)** | `vite` built in `8.54s` with `manualChunks` vendor splitting |
| **Frontend `npm audit` (Post-Sprint 3)** | `cd frontend ; npm audit` | **0 vulnerabilities** | Clean after replacing `xlsx` and removing unused `clsx` & `date-fns` |
| **Alembic Migrations** | `docker exec ... alembic upgrade head` | **PASS (In Sync)** | Upgraded to `044_p2_ssot_snapshots (head)` (`revoked_tokens` + `AuditLog`/`ExamMark`/`FeeInvoiceItem` snapshots) |
| **Secrets in Git** | `git ls-files "*.env*" "*secret*"` | **PASS** | Only `.env.example` tracked; `.env` excluded |
| **Docs & Headers** | `docs_manager.py validate` & `manage_headers.py check` | **PASS** | `564/564` headers compliant; docs reindexed & validated |

---

## 6. PRIORITIZED ACTIONABLE ROADMAP

1. **Sprint 1 — Critical Security Lockdown (P0, Completed `2026-11-12` — see [2026-11-12_AUDITS-COMPLIANCE_REMEDIATION-REPORT_SPRINT1-P0-SECURITY-LOCKDOWN_V1.md](file:///f:/PrashantAcademy/docs/20_AUDITS_COMPLIANCE/2026-11-12_AUDITS-COMPLIANCE_REMEDIATION-REPORT_SPRINT1-P0-SECURITY-LOCKDOWN_V1.md)):**
   - **Payments (`payments.py` + `payment_gateway.py`):** Verify `X-Razorpay-Signature` HMAC on `/online/webhook`; block mock/test signatures when `not settings.DEBUG`; bind orders server-side (`invoice_id`, `expected_amount`, `institution_id`) and enforce student ownership + tenant check.
   - **RBAC & Legacy Script Removal (`import_register.py`, `teacher_payroll.py`, `institutions.py`):** Restrict `import_register.py` (`/api/v1/import/fee-register/*`) to `sysadmin`/`superadmin` and block arbitrary `file_path`; add role + `check_institution_access` dependencies to all 25 routes in `teacher_payroll.py` and tenant scoping/RBAC across `institutions.py`.
   - **Tenant Isolation (`users.py`, `housekeeping.py`, `governance.py`/`SafeDeleteService`):** Enforce `check_institution_access` and privilege-hierarchy checks on `users.py` mutations and `SafeDeleteService`; restrict cluster-wide `housekeeping.py` DB backup/restore/vacuum/storage endpoints to `require_sysadmin` only with `mirror_dir` allowlisting, PostgreSQL identifier validation, and 500 MB upload size caps.
   - **Frontend Entrypoint & Nginx (`Login.tsx`, `App.tsx`, `nginx.conf`):** Guard `Login.tsx` demo credentials behind `DEV`; wrap staff/admin/finance routes in `RoleOutlet` guards in `App.tsx`; configure `server_tokens off;` and strict security headers (`CSP`, `X-Frame-Options`, `X-Content-Type-Options`, `Permissions-Policy`, `Referrer-Policy`) in `nginx.conf`.
2. **Sprint 2 — High-Priority Authorization, View-First & Dependency Remediation (P1, Completed `2026-11-12` — see [2026-11-12_AUDITS-COMPLIANCE_REMEDIATION-REPORT_SPRINT2-P1-HARDENING_V1.md](file:///f:/PrashantAcademy/docs/20_AUDITS_COMPLIANCE/2026-11-12_AUDITS-COMPLIANCE_REMEDIATION-REPORT_SPRINT2-P1-HARDENING_V1.md)):**
   - Locked down cross-tenant/student RBAC & IDOR protections across `examinations.py`, `homework.py`, `attendance.py`, `students.py`, `reports.py`, `concessions.py`, `communication.py` (`resolve_shared_document` PIN gating), `forms.py`, `fees.py` (`_authorize_invoice_access`), `payments.py`, `student_portal.py`, `data_importer.py`, and tenant-scoped academic/staff/codex routers.
   - Enforced `payload.get("type") == "access"` and strict integer `sub` in `deps.py:get_current_user`; hardened `config.py` (`DEBUG=False` default, `_INSECURE_SECRETS` startup block, 60-min access token expiry); bound Postgres `:5432` to `127.0.0.1` in `docker-compose.yml` and configured non-root `USER appuser` in `backend/Dockerfile`.
   - Completed **Rule 010 View-First Edit Mode** across `TrainingManagement.tsx`, `StudentDashboard.tsx`, `Releases.tsx`, `UserProfile.tsx`, `Users.tsx` row actions, `Payments.tsx` workflow buttons, `ImportExport.tsx`, and `editModeStore.ts` (`EDIT_CAPABLE_ROLES` parity + `?tab=` reset in `Layout.tsx`).
   - Sanitized HTML/SVG outputs (`htmlSanitizer.ts`) across print/modal views; resolved all **10 `npm audit` vulnerabilities (`0` remaining)** by replacing `xlsx` with `write-excel-file@^4.1.1` (with formula-injection neutralization) and upgrading Vite `8.3.8`/Vitest `5.1.0`/React Router `7.18.5`/Zod `4.6.7`/`node:22-alpine`; replaced `python-jose` with `PyJWT==2.10.1` and upgraded `fastapi==0.115.14`, `pydantic==2.10.6`, `Pillow==11.3.0`, and `Jinja2==3.1.6`. *(Note: `HttpOnly; SameSite=Lax` cookie session transport carried forward to Sprint 3.)*
3. **Sprint 3 — Session Cookies, SSOT Consolidation, Performance & Test Stability (P2/P3, Completed `2026-11-12` — see [2026-11-12_AUDITS-COMPLIANCE_REMEDIATION-REPORT_SPRINT3-SESSION-SSOT-PERFORMANCE_V1.md](file:///f:/PrashantAcademy/docs/20_AUDITS_COMPLIANCE/2026-11-12_AUDITS-COMPLIANCE_REMEDIATION-REPORT_SPRINT3-SESSION-SSOT-PERFORMANCE_V1.md)):**
   - Migrated auth session transport to `HttpOnly; SameSite=Lax` cookies (`prashant_access_token`/`prashant_refresh_token`) with `/auth/refresh` rotation, persistent `RevokedToken` (`jti`) revocation on `/logout`, and zero raw JWT storage in `localStorage['prashant-auth']` (`useAuthStore` `partialize` + `cookie-session` sentinel).
   - Added SHA-256 pre-hashing (`>72`-byte passwords), hashed `SharedDocumentToken.access_key` PINs (`String(128)`) + rate-limited `/share-links`, sanitized git refs in `release_service.py`, removed `academic_settings.json` disk fallback in `standards.py`, and applied Alembic `044_p2_ssot_snapshots` (`revoked_tokens` + `AuditLog`/`ExamMark`/`FeeInvoiceItem` `institution_id` and historical snapshot columns).
   - Filtered `Sidebar.tsx` Standard Menu via `modules.ts` `getAuthorizedModules(user)`, synced `/payments` and `/homework/submissions|templates` routes, removed dead `App.tsx` imports, guarded `logTechnicalError` behind `DEV`, added `vite.config.ts` `manualChunks`, compressed `public/media/logo/*.png` (`16,762 KB` → `5,446 KB`), extracted `formatINR`/`formatDateIN`/`downloadBlob`, and fixed `seed_historical_releases` idempotency. *(Organizational governance carry-forwards: legal decision on `PyMuPDF` `AGPL-3.0`, coordinated legacy `subjects` FK retirement, and incremental large-page decomposition.)*

