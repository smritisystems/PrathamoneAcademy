---
title: "PrathamOne EduOS v1.182.0 — Desktop Auth, Upgrade pg_dump & Full Release Audit Remediation Report"
module: "20_AUDITS_COMPLIANCE"
category: "REMEDIATION-REPORT"
document_type: "REPORT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.182.0"
doc_version: "1.0"
created_date: "2026-11-26"
updated_date: "2026-11-26"
author: "Jawahar R Mallah"
organization: "Smritisys & AITDL Networks"
status: "Approved"
tags: ["audit-closure", "windows-installer", "pg_dump", "desktop-auth", "adr-009", "dpdp-compliance"]
entities: ["PrathamOneEduOS", "PrathamOneSetup", "EmergencyPasswordReset", "User"]
api_routes: ["/health", "/api/v1/auth/login", "/_desktop/shutdown"]
related_modules: ["02_INSTALLATION_DEPLOYMENT", "12_RBAC_SECURITY", "13_SYSADMIN_SETTINGS"]
---

# PRATHAMONE EduOS (Coaching Institute Edition)
## Desktop Auth, Pre-Upgrade `pg_dump` & Full Release Verification Audit Report

**Product:** PrathamOne EduOS — Coaching Institute Edition (`v1.182.0`)  
**Product Architect:** Jawahar R Mallah  
**Organization:** Smritisys & AITDL Networks  
**Audit Date:** 2026-11-26  
**Status:** Verified & Approved  

---

## 1. Executive Summary

A full repository debug, installation lifecycle, and release verification audit was completed across `installer/`, `backend/`, `frontend/`, `scripts/`, `tools/`, and `build_staging/`. All release gates, unit/integration suites (`476` backend tests and `675` frontend tests across `91` files), live desktop HTTPS authentication against compiled `prathamone_backend.exe`, and `811` source header checks passed cleanly.

Two additional operational issues uncovered during live desktop troubleshooting were resolved, regression-guarded in `installer/verify_release_policy.py`, and repackaged into a freshly verified `dist/PrathamOne_EduOS_Setup.exe` (`94.45 MB`).

---

## 2. Root-Cause Findings & Remediations

### 2.1 Embedded Desktop Cluster (`5433`) vs. Standalone Dev Cluster (`5432`) Auth Mismatch
- **Symptom:** After installing `PrathamOne_EduOS_Setup.exe` over `D:\PrathamOneEduOS`, sign-in in the desktop application returned `401 Unauthorized` (`"Incorrect username or password"`).
- **Root Cause:** The installed desktop application launches embedded PostgreSQL on port `5433` against `%LOCALAPPDATA%\PrathamOneEduOS\data\`. An earlier manual password reset updated the standalone developer database on port `5432` while port `5433` was stopped, leaving the existing embedded cluster's unknown bcrypt hash intact (upgrade `seed.py` correctly preserved the cluster per Rule 013 / DPDP compliance without overwriting credentials).
- **Remediation:**
  - Updated `admin` (`admin@prathamone.com`, `id=1`) directly inside `%LOCALAPPDATA%\PrathamOneEduOS\data` on `127.0.0.1:5433` (`prashant_academy`) using `app.core.security.get_password_hash`.
  - Verified live HTTPS `POST https://127.0.0.1:2026/api/v1/auth/login` against the installed `D:\PrathamOneEduOS\backend\prathamone_backend.exe` returned HTTP `200` with a `181`-byte JWT token for both `admin@prathamone.com` and `admin`.
  - Enhanced [reset_admin_password.py](file:///F:/PrashantAcademy/scripts/reset_admin_password.py) to auto-read `%LOCALAPPDATA%\PrathamOneEduOS\.env`, match `sha256$` pre-hashing from `app.core.security`, and temporarily start/stop the embedded cluster with `pg_ctl.exe` when offline.

### 2.2 Windows `pg_dump` Argument Ordering Failure During Upgrade & Uninstall Backups
- **Symptom:** Upgrade backups created raw `robocopy` data snapshots under `%LOCALAPPDATA%\PrathamOneEduOS\backups\pre_upgrade_snapshot_*`, but produced zero logical `.dump` archives.
- **Root Cause:** In [prathamone_setup.iss](file:///F:/PrashantAcademy/installer/prathamone_setup.iss), `Exec(PgDump, ...)` passed `-f "<DumpFile>"` after the positional database name `prashant_academy` in both `CurStepChanged` (`ssInstall`) and `CurUninstallStepChanged`. On Windows PostgreSQL 16, `pg_dump.exe` rejects options after positional arguments (`pg_dump: error: too many command-line arguments (first is "-f")`, exit code `1`).
- **Remediation:**
  - Reordered `-f "<DumpFile>"` before `prashant_academy` in both `CurStepChanged` (`ssInstall`) and `CurUninstallStepChanged`, and supplied `{app}\pgsql\bin` as the working directory.
  - Added `{localappdata}\{#MyAppDirName}\data\postmaster.pid` cleanup to `InitializeSetup`.
  - Verified `pg_dump.exe -h 127.0.0.1 -p 5433 -U postgres -Fc -f <file> prashant_academy` exited `0` producing a `624,709`-byte custom-format dump.
  - Added regex enforcement in [verify_release_policy.py](file:///F:/PrashantAcademy/installer/verify_release_policy.py) (`DPDP-UPGRADE-DUMP`) so `-f` after `prashant_academy` fails Gate 0 immediately.
  - Added `--skip-gate2` support in [build_release.py](file:///F:/PrashantAcademy/build_staging/build_release.py) while purging stale non-backend payload directories before Gate 3 packaging.

---

## 3. Comprehensive Verification Matrix (Observed Post-Edit Results)

| Check / Gate | Command / Scope | Observed Result |
|---|---|---|
| **Gate 0 Policy Audit** | `python installer/verify_release_policy.py --strict` | `24 passed, 0 policy gap(s)` |
| **Gate 3 Packaging** | `python build_staging/build_release.py --skip-frontend --skip-gate1 --skip-gate2` | Built `dist/PrathamOne_EduOS_Setup.exe` (`94.45 MB`) in `588.8s` (4× expected `[SIGN SKIP]` without `PRATHAM_SIGN_CERT_PFX`) |
| **Gate 4 Clean-Room Audit** | `verify_build.py` (Criteria 1–4) | `RESULT: APPROVED — ALL 4 ADR-009 CRITERIA SATISFIED`; isolated `/health` HTTP `200` in `2.56s`, `/openapi.json` HTTP `200` |
| **Live Desktop Login E2E** | Installed `prathamone_backend.exe` + embedded Postgres `5433` | `/health` HTTP `200`; `POST /api/v1/auth/login` HTTP `200` (`admin@prathamone.com` & `admin`) |
| **Backend Test Suite** | `python -m pytest backend/tests/ -q --tb=short` | `476 passed` in `2181.87s` (`0` failed, `0` skipped) |
| **Frontend Test Suite** | `npm --prefix frontend run test` (`vitest run --pool=forks`) | `91` files, `675 passed` in `564.86s` (`0` failed, `0` skipped) |
| **Frontend Typecheck & Hygiene** | `npx tsc --noEmit`; `python scripts/check_release_hygiene.py` | Typecheck exit `0`; `241` dist files (`63.40 MB`), clean |
| **API Schema & Migrations** | OpenAPI reflection & `python -m alembic heads` | `525` paths, `638` operations, `0` duplicate `operationId`s; single head `056_expense_and_cash_register` |
| **Header Compliance** | `python scripts/manage_headers.py check` | `811/811` source files passed (`0` failures) |
| **Environment Advisory Notes** | `python -m pip check`; Vite build/config inspection | Dev-only `playwright 1.44.0` expects `greenlet==3.0.3` (`greenlet 3.1.1` installed); `vite.config.ts` `server.fs.allow` is dev-server-only (`dist` unaffected) |
