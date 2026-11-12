---
title: "PrathamOne EduOS — Sprint 2 (P1) Security, View-First & Dependency Remediation Report"
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
tags: ["remediation", "sprint-2", "p1", "rbac", "multi-tenancy", "idor", "xss", "rule-010", "dependencies", "pyjwt", "write-excel-file", "vite-8"]
entities: ["User", "Institution", "Student", "Payment", "PaymentReceipt", "FeeInvoice", "FeeConcessionAllocation", "Subject", "CanonicalSubject", "StaffProfile"]
api_routes: ["/api/v1/auth/login", "/api/v1/examinations", "/api/v1/homework", "/api/v1/attendance", "/api/v1/students", "/api/v1/reports", "/api/v1/concessions", "/api/v1/communication", "/api/v1/forms", "/api/v1/fees", "/api/v1/payments", "/api/v1/student-portal", "/api/v1/divisions", "/api/v1/timetable", "/api/v1/boards", "/api/v1/academic-years", "/api/v1/standards", "/api/v1/subjects", "/api/v1/staff", "/api/v1/codex"]
related_modules: ["03_ACADEMIC_MANAGEMENT", "04_STUDENT_MANAGEMENT", "05_TEACHER_MANAGEMENT", "07_ATTENDANCE", "08_EXAMINATION", "09_FEES_PAYMENTS", "12_RBAC_SECURITY", "13_SYSADMIN_SETTINGS", "14_PRINTING_DOCUMENTS", "18_TESTING_QA", "20_AUDITS_COMPLIANCE"]
---

# PRATHAMONE EduOS — SPRINT 2 (`P1`) REMEDIATION REPORT

**Product:** PrathamOne EduOS (Coaching Institute Edition)  
**Remediation Date:** 2026-11-12  
**Parent Audit:** [2026-11-12_AUDITS-COMPLIANCE_AUDIT-REPORT_FULL-PLATFORM-SECURITY-ARCHITECTURE-AND-RECOMMENDATIONS_V1.md](file:///f:/PrashantAcademy/docs/20_AUDITS_COMPLIANCE/2026-11-12_AUDITS-COMPLIANCE_AUDIT-REPORT_FULL-PLATFORM-SECURITY-ARCHITECTURE-AND-RECOMMENDATIONS_V1.md)  
**Prerequisite Baseline:** [2026-11-12_AUDITS-COMPLIANCE_REMEDIATION-REPORT_SPRINT1-P0-SECURITY-LOCKDOWN_V1.md](file:///f:/PrashantAcademy/docs/20_AUDITS_COMPLIANCE/2026-11-12_AUDITS-COMPLIANCE_REMEDIATION-REPORT_SPRINT1-P0-SECURITY-LOCKDOWN_V1.md)

---

## 1. SCOPE & EXECUTIVE OUTCOME

Sprint 2 executed the approved **High-Priority (`P1`) Hardening, Rule 010 View-First Governance, XSS Sanitization, Container/Config Hardening, and Dependency Remediation** workstreams across backend routers/services, frontend workspaces/utilities, Dockerfiles, and package manifests:

- **Backend `H1`/`H2`/`H3` Authorization & Tenant Isolation:** Closed fail-open JWT/tenant gaps in `deps.py` (`payload.get("type") == "access"`, strict `int(raw_sub)` validation), `config.py` (`DEBUG: bool = False`, `_INSECURE_SECRETS` startup rejection via `Settings.validate_security()`, 60-minute access token lifetime), shared-document PIN verification (`resolve_shared_document` in `communication.py`), cross-tenant `data_importer.py` standard isolation, `_authorize_invoice_access` in `fees.py`, `FeeInvoice.allocations` handling in `safe_delete_service.py`, and student/cross-tenant RBAC + IDOR protections verified by `tests/test_p1_security_hardening.py`.
- **Container & Host Binding Hardening:** Updated [backend/Dockerfile](file:///f:/PrashantAcademy/backend/Dockerfile) to execute as non-root `USER appuser` with `postgresql-client` installed, bumped [frontend/Dockerfile](file:///f:/PrashantAcademy/frontend/Dockerfile) build stage to `node:22-alpine`, and verified [docker-compose.yml](file:///f:/PrashantAcademy/docker-compose.yml) binds PostgreSQL (`5432`) strictly to `127.0.0.1` and requires `SECRET_KEY` at startup.
- **Frontend `H3` XSS & HTML Escaping Hardening:** Eliminated HTML/SVG DOM injection risks across [htmlSanitizer.ts](file:///f:/PrashantAcademy/frontend/src/utils/htmlSanitizer.ts), `OnlinePaymentModal.tsx`, `StudentIDCardModal.tsx`, `DocumentPreviewModal.tsx`, `PrintPreviewCanvas.tsx`, `printLayoutEngine.ts`, `printReceipt.ts`, and `printIDCard.ts`.
- **Frontend `H4` Rule 010 View-First Governance Completion:** Unified edit-mode authorization in [editModeStore.ts](file:///f:/PrashantAcademy/frontend/src/store/editModeStore.ts) (`EDIT_CAPABLE_ROLES` and `canActivateEditMode(user, requiredPermission)` adding `counselor`, `counsellor`, `coordinator`, and `receptionist` role parity while preserving `isSuperAdmin`-only permission bypass), reused it in [EditModeBar.tsx](file:///f:/PrashantAcademy/frontend/src/components/common/EditModeBar.tsx), added `?tab=` search-param reset in [Layout.tsx](file:///f:/PrashantAcademy/frontend/src/components/Layout.tsx), and enforced View-First edit gates across `TrainingManagement.tsx`, `StudentDashboard.tsx`, `Releases.tsx`, `UserProfile.tsx`, `Users.tsx`, `Payments.tsx`, and `ImportExport.tsx`.
- **Dependency & Vulnerability Remediation (`H5`):** Resolved all `10` `npm audit` vulnerabilities (`0 vulnerabilities` post-remediation) by removing unmaintained `xlsx` (`SheetJS`), adopting `write-excel-file@^4.1.1` with CSV/spreadsheet formula-injection neutralization in [reportExport.ts](file:///f:/PrashantAcademy/frontend/src/utils/reportExport.ts), upgrading Vite/Vitest/React-Router/Zod/RHF, replacing `python-jose` with `PyJWT==2.10.1` across [security.py](file:///f:/PrashantAcademy/backend/app/core/security.py), [deps.py](file:///f:/PrashantAcademy/backend/app/core/deps.py), and [requirements.txt](file:///f:/PrashantAcademy/backend/requirements.txt), and updating Third-Party Acknowledgements in [help_seed_data.py](file:///f:/PrashantAcademy/backend/app/services/help_seed_data.py).

> [!NOTE]
> **Carried Forward to Sprint 3 (`P2`):** Migration of frontend Bearer token storage (`apiClient` / `useAuthStore`) to `HttpOnly; SameSite=Lax` cookies remains queued for Sprint 3 (`P2` session architecture), alongside `PyMuPDF` licensing review and Sprint 3 SSOT/bundle items. Additionally, production Docker containers will reflect the `node:22-alpine` build stage and pinned `requirements.txt` natively on next `docker compose build`.

---

## 2. IMPLEMENTED CHANGES BY WORKSTREAM

### 2.1 Backend Auth, Tenant Isolation & Ledger Fixes

| Target Component | Change Summary |
| :--- | :--- |
| [backend/app/core/deps.py](file:///f:/PrashantAcademy/backend/app/core/deps.py) | Replaced `python-jose` with `from jwt.exceptions import InvalidTokenError as JWTError`; enforced `payload.get("type") == "access"` and `int(raw_sub)` parsing in `get_current_user`; fail-closed role/institution access checks. |
| [backend/app/core/config.py](file:///f:/PrashantAcademy/backend/app/core/config.py) | Set `DEBUG: bool = False`, shortened `ACCESS_TOKEN_EXPIRE_MINUTES: int = 60`, defined `_INSECURE_SECRETS`, and enforced startup termination via `Settings.validate_security()` when `not self.DEBUG` and `SECRET_KEY` is weak/default. |
| [backend/app/api/v1/endpoints/communication.py](file:///f:/PrashantAcademy/backend/app/api/v1/endpoints/communication.py) | Updated `resolve_shared_document` so omitting `pin` returns `{"status": "pin_required", ...}` without leaking `recipient_name`, whereas an invalid `pin` triggers `HTTPException(status_code=403)` after `hmac.compare_digest`. |
| [backend/app/api/v1/endpoints/fees.py](file:///f:/PrashantAcademy/backend/app/api/v1/endpoints/fees.py) | Fixed `AuditLog`/`User` imports and introduced `_authorize_invoice_access` resolving `Student` via `db.get(Student, invoice.student_id)` (eliminating `AttributeError` on `FeeInvoice.student`). |
| [backend/app/services/safe_delete_service.py](file:///f:/PrashantAcademy/backend/app/services/safe_delete_service.py) | Updated deletion dependency inspection to query `FeeInvoice.allocations` directly instead of nonexistent `FeeInvoice.payments`/`FeeInvoice.student` attributes. |
| [backend/app/services/data_importer.py](file:///f:/PrashantAcademy/backend/app/services/data_importer.py) | Enforced tenant scoping (`institution_id`) during subject and student import validation previews (`validate_and_preview_import`). |
| [backend/Dockerfile](file:///f:/PrashantAcademy/backend/Dockerfile) | Added non-root `appuser` group/user ownership of `/app` and `USER appuser` runtime execution with `postgresql-client` installed for in-container backup/restore CLI operations. |

### 2.2 Frontend XSS Sanitization & Rule 010 View-First Hardening

- **XSS & Print/DOM Safety (`H3`):** Added centralized escaping/sanitization helpers in [htmlSanitizer.ts](file:///f:/PrashantAcademy/frontend/src/utils/htmlSanitizer.ts) and applied them across `OnlinePaymentModal.tsx`, `StudentIDCardModal.tsx`, `DocumentPreviewModal.tsx`, `PrintPreviewCanvas.tsx`, `printLayoutEngine.ts`, `printReceipt.ts`, and `printIDCard.ts`.
- **View-First Governance (`H4` / Rule 010):**
  - [editModeStore.ts](file:///f:/PrashantAcademy/frontend/src/store/editModeStore.ts) & [EditModeBar.tsx](file:///f:/PrashantAcademy/frontend/src/components/common/EditModeBar.tsx): Centralized `EDIT_CAPABLE_ROLES` and `canActivateEditMode(user, requiredPermission)` so `counselor`/`counsellor`/`coordinator`/`receptionist` roles can activate scoped Edit Mode while `isSuperAdmin` remains the sole bypass authority.
  - [Layout.tsx](file:///f:/PrashantAcademy/frontend/src/components/Layout.tsx): Calls `useEditModeStore.getState().resetAll()` whenever `location.pathname` or `location.search` (`?tab=`) changes.
  - **Page-level View-First Enforcement:** Gated mutating actions and triggers behind `isEditMode` (or `isProfileEditMode` on Student Profile) in `TrainingManagement.tsx`, `StudentDashboard.tsx`, `Releases.tsx` (also tracking `rollbackModalOpen` in `isDirty`), `UserProfile.tsx`, `Users.tsx`, `Payments.tsx`, and `ImportExport.tsx`.
  - [Fees.tsx](file:///f:/PrashantAcademy/frontend/src/pages/Fees.tsx): Replaced dynamic timestamp regex `.replace(/[-:T.]/g, '')` with chained `.replace()` calls so Tailwind JIT does not emit CSS class selectors invalid under Vite 8 LightningCSS.

### 2.3 Dependency & Vulnerability Upgrades (`H5`)

- **Backend ([requirements.txt](file:///f:/PrashantAcademy/backend/requirements.txt)):**
  - Replaced `python-jose[cryptography]==3.3.0` with `PyJWT==2.10.1` (`security.py` + `deps.py`).
  - Upgraded `fastapi==0.115.14` (with `starlette==0.46.2`), `uvicorn[standard]==0.34.0`, `alembic==1.14.1`, `asyncpg==0.30.0`, `pydantic==2.10.6`, `pydantic-settings==2.8.1`, `cryptography==50.0.2`, `Jinja2==3.1.6`, `python-multipart==0.0.20`, `greenlet==3.1.1`, `openpyxl==3.1.5`, `pandas==2.2.3`, `psycopg2-binary==2.9.10`, and `Pillow==11.3.0`. Synced both host Python and running `prashant_academy_backend` container.
- **Frontend ([package.json](file:///f:/PrashantAcademy/frontend/package.json), [Dockerfile](file:///f:/PrashantAcademy/frontend/Dockerfile), [main.tsx](file:///f:/PrashantAcademy/frontend/src/main.tsx), [reportExport.ts](file:///f:/PrashantAcademy/frontend/src/utils/reportExport.ts)):**
  - Removed `xlsx` and migrated XLSX exports to `write-excel-file@^4.1.1` (`write-excel-file/browser`) with spreadsheet formula-injection neutralization.
  - Upgraded `zod@^4.6.7`, `@hookform/resolvers@^7.0.6`, `react-hook-form@^7.92.0`, `react-router-dom@^7.18.5` (removing obsolete v6 `<BrowserRouter>` future flags in `main.tsx`), `vite@^8.3.8`, `@vitejs/plugin-react@^6.3.0`, `vitest@^5.1.0`, `@vitest/ui@^5.1.0`, and `jsdom@^30.1.3`.
  - Bumped build stage in `frontend/Dockerfile` to `node:22-alpine`.
  - Updated Third-Party Acknowledgements entries (`write-excel-file` and `PyJWT & Cryptography`) in [help_seed_data.py](file:///f:/PrashantAcademy/backend/app/services/help_seed_data.py).

---

## 3. VERIFICATION RESULTS (POST-FINAL-EDIT)

| Check | Command | Outcome | Notes |
| :--- | :--- | :---: | :--- |
| **Frontend Dependency Audit** | `cd frontend ; npm audit` | **PASS (`0 vulnerabilities`)** | Down from `10` (`3 critical, 3 high, 4 moderate`) |
| **TypeScript Typecheck** | `cd frontend ; npx tsc --noEmit` | **PASS (`0` errors)** | Exit code `0` |
| **Frontend Vitest Suite** | `cd frontend ; npm test` (`vitest run --pool=forks`) | **63/63 files, 494/494 tests PASS** | `159.73s`; includes `P1SecurityAndViewFirst.test.tsx` (7 tests) |
| **Frontend Production Build** | `cd frontend ; npm run build` | **PASS (`5.93s`)** | Vite `8.3.8` bundle built with 0 errors |
| **Backend Targeted Regressions (Host)** | `pytest tests/test_global_view_edit_governance.py tests/test_transaction_governance.py tests/test_safe_delete_policy.py tests/test_p0_security_lockdown.py tests/test_p1_security_hardening.py tests/test_release_management.py tests/test_help_and_about.py tests/test_concession_financial_governance.py tests/test_concession_ledger_regression.py tests/test_payments.py tests/test_payment_workflow.py -v` | **71/71 PASSED** | `117.41s`; verified `fees.py`, `safe_delete_service.py`, `communication.py`, and `release_management` |
| **Backend Container Suite (Docker)** | `docker exec prashant_academy_backend python -m pytest tests/test_housekeeping.py tests/test_p0_security_lockdown.py tests/test_p1_security_hardening.py -v` | **17/17 PASSED** | `30.51s`; verifies real `pg_dump`/`psql` + P0/P1 lockdowns with `PyJWT 2.10.1` & `FastAPI 0.115.14` |
| **Backend Full Suite (Host)** | `cd backend ; python -m pytest -q --tb=short` | **303 passed, 3 failed** | `406.70s`; same 3 known host-only failures: 2 `test_housekeeping.py` (no Windows `pg_dump`) + 1 `test_release_management.py::test_get_current_release_and_seed_history` cross-test ordering flakiness (`passes 6/6 isolated`) |
| **Attribution Headers** | `python scripts/manage_headers.py check` | **PASS (`560/560`)** | 0 failures |

