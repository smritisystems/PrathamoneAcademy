---
title: "PrathamOne EduOS — Sprint 1 (P0) Critical Security Lockdown Remediation Report"
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
tags: ["sprint-1", "p0", "security-lockdown", "rbac", "tenant-isolation", "payments", "nginx", "remediation"]
entities: ["Payment", "PaymentReceipt", "FeeInvoice", "User", "Institution", "TeacherPayroll", "AuditLog", "InstitutionSetting"]
api_routes: ["/api/v1/payments/online/webhook", "/api/v1/payments/online/create-order", "/api/v1/payments/online/verify", "/api/v1/payments/online/config", "/api/v1/import/fee-register/preview", "/api/v1/import/fee-register/preview-upload", "/api/v1/import/fee-register/execute", "/api/v1/import/fee-register/status", "/api/v1/institutions/", "/api/v1/teacher-payroll", "/api/v1/users", "/api/v1/housekeeping", "/api/v1/governance/safe-delete"]
related_modules: ["09_FEES_PAYMENTS", "06_TEACHER_PAYROLL", "12_RBAC_SECURITY", "13_SYSADMIN_SETTINGS", "18_TESTING_QA", "20_AUDITS_COMPLIANCE"]
---

# PRATHAMONE EduOS — SPRINT 1 (P0) CRITICAL SECURITY LOCKDOWN REPORT

**Product:** PrathamOne EduOS (Coaching Institute Edition)  
**Date:** 2026-11-12  
**Parent Audit:** [2026-11-12_AUDITS-COMPLIANCE_AUDIT-REPORT_FULL-PLATFORM-SECURITY-ARCHITECTURE-AND-RECOMMENDATIONS_V1.md](file:///f:/PrashantAcademy/docs/20_AUDITS_COMPLIANCE/2026-11-12_AUDITS-COMPLIANCE_AUDIT-REPORT_FULL-PLATFORM-SECURITY-ARCHITECTURE-AND-RECOMMENDATIONS_V1.md)  
**Scope:** Sprint 1 (`P0` Critical Security Lockdown) across online payment gateway, legacy fee register import, multi-tenant institutions, teacher payroll RBAC/tenant isolation, user management privilege/tenant bounds, sysadmin housekeeping DB controls, safe-delete entity isolation, frontend route/credential hardening, and Nginx security headers.

---

## 1. IMPLEMENTED P0 CONTROLS BY DOMAIN

| Domain | Modified Files | Controls Implemented |
| :--- | :--- | :--- |
| **Online Payment Gateway** | [payments.py](file:///f:/PrashantAcademy/backend/app/api/v1/endpoints/payments.py), [payment_gateway.py](file:///f:/PrashantAcademy/backend/app/services/payment_gateway.py) | • Verified `X-Razorpay-Signature` HMAC-SHA256 in `/online/webhook` via `verify_webhook_signature` (resolving tenant `institution_id` from `AuditLog` order record or `notes.invoice_id` -> `FeeInvoice`/`Student.institution_id`).<br>• Restricted mock checkout signatures (`test_signature_valid`, `mock_signature_valid`) strictly to `is_test_mode and settings.DEBUG`.<br>• Recorded authoritative order metadata (`order_id`, `invoice_id`, `amount`, `institution_id`, `installment_id`) on `/online/create-order` and enforced server-side verification (`require_order_record=True`) on `/online/verify`.<br>• Added `_authorize_online_invoice_access` (`ONLINE_CHECKOUT_ROLES`, `check_institution_access`, student ownership check) on `/online/create-order` and `/online/verify`, restricted `PUT /online/config`, and masked/popped `razorpay_webhook_secret` in `GET /online/config`. |
| **Legacy Fee Register Import & Institutions** | [import_register.py](file:///f:/PrashantAcademy/backend/app/api/v1/endpoints/import_register.py), [institutions.py](file:///f:/PrashantAcademy/backend/app/api/v1/endpoints/institutions.py) | • Restricted all routes under `/api/v1/import/fee-register/` to `REGISTER_IMPORT_ROLES = ("superadmin", "sysadmin", "super_admin")`.<br>• Rejected non-canonical arbitrary `file_path` inputs on `/execute` with HTTP `403`, and bounded `/preview-upload` size to `MAX_UPLOAD_BYTES` (`10 MB`, returning `413`).<br>• Scoped `GET /api/v1/institutions/` to the caller's `institution_id` unless `is_sysadmin(current_user)`, locked `POST /institutions/` to sysadmin roles, and enforced `check_institution_access` on institution reads/updates. |
| **Teacher Payroll** | [teacher_payroll.py](file:///f:/PrashantAcademy/backend/app/api/v1/endpoints/teacher_payroll.py) | • Enforced `require_role(*PAYROLL_ADMIN_ROLES)` / `require_role(*PAYROLL_VIEW_ROLES)` / `PAYROLL_DROPDOWN_ROLES` across all 25 routes.<br>• Enforced `_resolve_inst_id`, `_get_teacher_or_404`, `_get_payroll_or_404`, `_authorize_report_scope`, `check_institution_access`, and teacher self-scoping across profiles, sessions, payrolls, and `teacher-history`. |
| **Users, Housekeeping & Safe-Delete Governance** | [users.py](file:///f:/PrashantAcademy/backend/app/api/v1/endpoints/users.py), [housekeeping.py](file:///f:/PrashantAcademy/backend/app/api/v1/endpoints/housekeeping.py), [housekeeping_service.py](file:///f:/PrashantAcademy/backend/app/services/housekeeping_service.py), [governance.py](file:///f:/PrashantAcademy/backend/app/api/v1/endpoints/governance.py), [safe_delete_service.py](file:///f:/PrashantAcademy/backend/app/services/safe_delete_service.py) | • Added `_tenant_visibility_clause`, `_authorize_target_user`, and `_validate_role_assignment` across `/api/v1/users/` stats, listings, profile workspace, create/update/reset-password/status/invitation/delete.<br>• Restricted `/api/v1/housekeeping/` strictly to `require_sysadmin` via `_require_housekeeping_access`, added `_resolve_housekeeping_inst_id`, enforced `MAX_BACKUP_UPLOAD_BYTES` (`500 MB`, HTTP `413`), added `validate_mirror_dir` allowlisting, and added `VALID_PG_IDENTIFIER_RE` validation in `_recreate_and_restore_pg_db`.<br>• Added `require_role(*GOVERNANCE_ADMIN_ROLES)` on `GET /safe-delete/eligibility`, filtered `/safe-delete/audit-logs` by tenant for non-sysadmins, and added `SafeDeleteService._authorize_entity_scope` across eligibility, deactivation, and archive flows. |
| **Frontend Entrypoint & Nginx** | [Login.tsx](file:///f:/PrashantAcademy/frontend/src/pages/Login.tsx), [App.tsx](file:///f:/PrashantAcademy/frontend/src/App.tsx), [nginx.conf](file:///f:/PrashantAcademy/frontend/nginx.conf) | • Guarded the "Quick Access Profiles" demo credential helper block behind `(import.meta as any).env?.DEV` in `Login.tsx` so production builds strip demo credentials.<br>• Added `RoleOutlet` (`sysadminOnly` / `roles` / non-student default guard) in `App.tsx` across `sysadmin`, `housekeeping`, `fees/import`, `users`, `settings`, `codex`, `import-export`, `releases`, `training`, `fees*`, `payments`, `teacher-payroll`, and staff workspaces.<br>• Configured `server_tokens off;` and security headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `Content-Security-Policy`) in `frontend/nginx.conf`. |
| **P0 Negative Security Test Suite** | [test_p0_security_lockdown.py](file:///f:/PrashantAcademy/backend/tests/test_p0_security_lockdown.py) | • Added 5 multi-tenant / RBAC / cryptographic integration tests covering webhook HMAC enforcement, server-side payment order verification & IDOR blocking, `import/fee-register` & `institutions` restrictions, teacher payroll isolation, and user/housekeeping/safe-delete governance lockdown. |

---

## 2. VERIFIED POST-CHANGE TEST & TOOLING RESULTS

| Check | Command / Environment | Verified Outcome | Scope / Notes |
| :--- | :--- | :---: | :--- |
| **P0 Lockdown + Payments (Host)** | `cd backend ; python -m pytest tests/test_p0_security_lockdown.py tests/test_payment_gateway.py tests/test_payments.py -v` | **21 passed** (`51.87s`) | Ran after final `payments.py` and test edits |
| **Housekeeping + P0 Lockdown (Docker)** | `docker exec prashant_academy_backend python -m pytest tests/test_housekeeping.py tests/test_p0_security_lockdown.py -v` | **13 passed** (`35.06s`) | Verifies real `pg_dump`/`psql` tests + P0 suite |
| **Full Backend Suite (Docker)** | `docker exec prashant_academy_backend python -m pytest -q --tb=short` | **293 passed, 1 failed, 4 skipped** (`314.43s`) | Sole failure: pre-existing ordering issue in `test_release_management.py::test_get_current_release_and_seed_history` (passes standalone **6 passed in 14.54s**); 3 of 4 skips are `test_fee_register_import.py` Excel file checks absent on Linux container path |
| **TypeScript Typecheck** | `cd frontend ; npx tsc --noEmit` | **PASS (`0` errors)** | Clean build gate after `Login.tsx` and `App.tsx` edits |
| **Frontend Vitest Suite** | `cd frontend ; npx vitest run` | **62/62 files, 487/487 passed** (`141.08s`) | Zero failures or regressions |
| **Production Bundle Check** | `cd frontend ; npm run build` (`vite build` in `17.74s`) + `Select-String` on `dist/assets/Login-*.js` | **PASS (`0` credential matches)** | Verified `"admin123"`, `"superadmin123"`, `"Quick Access Profiles"` absent from compiled bundle |
| **Nginx Syntax Validation** | `docker run --rm --network <compose_net> -v f:/PrashantAcademy/frontend/nginx.conf:/etc/nginx/conf.d/default.conf:ro nginx:alpine nginx -t` | **PASS** | `nginx.conf` syntax & test succeeded (requires frontend image rebuild to deploy into running `prashant_academy_frontend`) |
| **Corporate Headers Check** | `python scripts/manage_headers.py check` | **557/557 passed (`0` failed)** | Verified after all code edits |

---

## 3. REMAINING FOLLOW-UP WORK

- **Deployment Sync:** Rebuild the `frontend` Docker image (`docker compose build frontend && docker compose up -d frontend`) so `prashant_academy_frontend` serves the newly compiled bundle and hardened `nginx.conf`.
- **Sprint 2 (`P1`) & Sprint 3 (`P2/P3`):** Remaining non-P0 routers (`examinations.py`, `homework.py`, `attendance.py`, `students.py`, `reports.py`, `concessions.py`, `communication.py`, `forms.py`, `fees.py`, `student_portal.py`), `deps.py` access-token type enforcement, `config.py` `DEBUG=False`/secret hardening, remaining Rule 010 UI View-First gaps, dependency upgrades, and SSOT/bundle optimizations remain queued in the parent audit roadmap pending Sprint 2 authorization.

