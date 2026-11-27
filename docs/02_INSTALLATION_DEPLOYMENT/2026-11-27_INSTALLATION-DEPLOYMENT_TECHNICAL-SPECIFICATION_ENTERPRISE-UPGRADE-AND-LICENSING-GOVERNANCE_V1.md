---
title: "Enterprise Installation, Upgrade, Licensing & Database Migration Architecture & Governance"
module: "02_INSTALLATION_DEPLOYMENT"
category: "ARCHITECTURE"
document_type: "SPECIFICATION"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-27"
updated_date: "2026-11-27"
author: "Jawahar R Mallah"
organization: "Smritisys & AITDL Networks"
status: "Approved"
tags: ["installer", "in-place-upgrade", "licensing", "hardware-fingerprint", "alembic", "backup-restore", "governance", "rule-013", "rule-016", "rule-017"]
entities: ["Institution", "InstitutionSetting", "AlembicVersion"]
api_routes: ["/api/v1/license/status", "/api/v1/license/activate", "/health"]
related_modules: ["12_RBAC_SECURITY", "16_DATABASE_API", "19_RELEASES_CHANGELOG", "25_BUSINESS_REQUIREMENTS"]
---

# PRATHAMONE EduOS — ENTERPRISE INSTALLATION, UPGRADE, LICENSING & DATABASE MIGRATION ARCHITECTURE

**Product:** PrathamOne EduOS (Coaching Institute Edition)  
**Organization:** Smritisys & AITDL Networks  
**Product Architect:** Jawahar R Mallah  
**Governance Alignment:** Rules 001–017 (`AGENTS.md`)

---

## 1. FORENSIC ROOT CAUSE ANALYSIS: POST-UPGRADE `Node-Lock Mismatch`

### 1.1 Observed Production Symptom
Following an in-place desktop upgrade using `PrathamOne_EduOS_Setup.exe`, the Software License screen displayed:
> `Signature status: Node-Lock Mismatch: Hardware mismatch detected! Machine 'PRATHAM-49F5-2C0B-936A-9DB8' does not match registered license target 'PRATHAM-B347-9CFE-842B-E65C'.`

### 1.2 Forensic Lifecycle Verification
Inspection of the live installation (`D:\PrathamOneEduOS`) and external data root (`%LOCALAPPDATA%\PrathamOneEduOS\data`) confirmed:
1. **Installer Did NOT Wipe Data or License Records:** PostgreSQL 16 database cluster (`PG_VERSION = 16`, `postmaster.opts` on port `5433`), `alembic_version` (`059_budgeting_and_forecasting`), `institution_settings` (`license.serial_number = 263835371`, `license.installation_id = PRATHAM-B347-9CFE-842B-E65C`, signed Ed25519 `license.artifact`), institutional records, `.env`, and 6 `pre_upgrade_*` backups remained intact.
2. **True Root Cause in `backend/app/core/hardware.py`:**
   - Previously, `hardware.py` spawned three sequential PowerShell processes (`timeout=3.5s`) to query `Win32_Processor`, `Win32_BaseBoard`/`Win32_BIOS`, and `Win32_ComputerSystemProduct`, wrapped in `@lru_cache(maxsize=1)`.
   - On an idle host, PowerShell CIM startup alone measured `~1.75s`; under post-upgrade first-boot load (antivirus binary scan + Python/Cython import + embedded PostgreSQL startup), the `Win32_Processor` call exceeded `3.5s` and timed out to `"UNKNOWN"`.
   - The fallback read Windows Registry `ProcessorNameString` (`'Intel(R) Xeon(R) E-2104G CPU @ 3.20GHz'`) instead of `ProcessorId` (`'BFEBFBFF000906EA'`). Because SHA-256 is deterministic, replacing `ProcessorId` with `ProcessorNameString` produced `'PRATHAM-49F5-2C0B-936A-9DB8'` instead of `'PRATHAM-B347-9CFE-842B-E65C'`.
   - `@lru_cache(maxsize=1)` then permanently pinned `'PRATHAM-49F5-2C0B-936A-9DB8'` for the entire server process lifetime until restart.

### 1.3 Permanent Fix (Without Weakening Licensing Security)
Implemented in [`hardware.py`](file:///f:/PrashantAcademy/backend/app/core/hardware.py) and compiled into `hardware.pyd`:
1. **Single Batched WMI Query (`_query_wmi_batch`):** Queries CPU `ProcessorId`, BaseBoard `SerialNumber`, BIOS `SerialNumber`, and ComputerSystemProduct `UUID` in a single PowerShell invocation (`timeout=8.0s`, up to 2 attempts, deterministic `Sort-Object Index | Select-Object -First 1`).
2. **Zero Non-Equivalent Fallbacks:** Removed mismatched registry substitutes (`ProcessorNameString` / BIOS strings) so legitimate `ProcessorId` parity is strictly preserved.
3. **Non-Poisoning Cache (`_CACHED_HW_COMPONENTS`):** Complete results are cached in memory **only** when all 4 physical components resolve without `"UNKNOWN"` / `"UNKNOWN_GUID"`. Transient timeouts never lock a degraded fingerprint into process memory.

---

## 2. INSTALLATION IDENTITY & DATA SEPARATION MODEL

| Layer | Canonical Location | Preserved on Upgrade | Owned By |
| :--- | :--- | :--- | :--- |
| **A. Application Binaries** | `{app}\backend\`, `{app}\frontend\dist\`, `{app}\pgsql\`, `PrathamOne.exe` | Replaced cleanly (`[Files]`) | SMRITI Release Pipeline |
| **B. Institutional Data** | `%LOCALAPPDATA%\PrathamOneEduOS\data\` (or legacy `{app}\data\` outside Program Files) | **Strictly Preserved** | Institution Owner |
| **C. License & Activation** | `institution_settings` (`license.artifact`, `license.serial_number`, `license.installation_id`) + Ed25519 signature | **Strictly Preserved** | SMRITI Authority + Hardware Lock |
| **D. App Configuration** | `<DATA_ROOT>\.env` (`PRATHAM_ENV_FILE`) & `.bootstrap_complete` | **Strictly Preserved** | Institution Admin |
| **E. DB Credentials** | `POSTGRES_PASSWORD`, `POSTGRES_PORT`, `DATABASE_URL` in `<DATA_ROOT>\.env` | **Strictly Preserved** | Automated Setup / Admin |
| **F. Logs & Audit Trails** | `<DATA_ROOT>\logs\backend_server.log*` & `upgrade_audit.jsonl` | **Preserved & Appended** | Support / Audit |
| **G. Backups & Snapshots** | `<DATA_ROOT>\backups\pre_upgrade_v*.dump` & cluster snapshots | **Preserved** (never overwritten) | Institution DBA / Installer |

### Distinct Entity Identifiers
- **Institution Identity:** `institutions.id`, institutional metadata & `institution_settings`.
- **License Identity:** Ed25519 signed license artifact + `license.serial_number` issued by `https://smritisys.com`.
- **Machine Identity:** Physical SHA-256 fingerprint `PRATHAM-XXXX-XXXX-XXXX-XXXX` derived from host hardware.
- **Database Identity:** Embedded PostgreSQL 16 database (`prashant_academy`), `PG_VERSION`, and `alembic_version.version_num`.
- **Installation Identity:** Resolved `<DATA_ROOT>` + `.bootstrap_complete` manifest (`version`, `build_number`, `schema_revisions`, `updated_at`).
- **Application Version:** Synchronized across [`config.py`](file:///f:/PrashantAcademy/backend/app/core/config.py) (`Settings.VERSION`, `Settings.BUILD_NUMBER`) and installer `#define MyAppVersion`.

An in-place upgrade preserves Institution Identity, License Identity, Machine Identity, Database Identity, and Installation Identity while evolving **Application Version** and **Database Schema Version**.

---

## 3. INTELLIGENT PRE-FLIGHT DETECTION (`--preflight-check`)

[`run_server.py`](file:///f:/PrashantAcademy/backend/run_server.py) provides `prathamone_backend.exe --preflight-check [--json-out <file>] [--actor <name>]` to inspect actual filesystem, PostgreSQL, Alembic, and hardware state before and during upgrades:

| Decision Code | Exit Code | Trigger Condition | Installer / Operator Action |
| :--- | :---: | :--- | :--- |
| `FRESH_INSTALL` | `0` | No `PG_VERSION` cluster and no active `.env` DB config | Run standard onboarding wizard & fresh bootstrap |
| `UPGRADE_WITH_MIGRATION` | `0` | Healthy reachable DB with `pending_migrations` > 0 | Mandatory backup gate -> binary update -> `--migrate-only` |
| `UPGRADE_STANDARD` | `0` | Healthy reachable DB at head; `installed_version != target_version` | Mandatory backup gate -> binary update -> refresh marker |
| `UP_TO_DATE` | `0` | Schema matches Alembic head and version matches target | Safe repair / reinstall or skip |
| `MANUAL_INTERVENTION` | `2` | DB cluster unreachable OR unknown/conflicting `alembic_version` | Abort automation; inspect cluster logs / migration state |
| `RECOVERY_REQUIRED` | `3` | DB reachable while core `institutions` table missing despite `.bootstrap_complete` | Restore verified `pre_upgrade_*.dump` before continuing |

In GUI mode, [`prathamone_setup.iss`](file:///f:/PrashantAcademy/installer/prathamone_setup.iss) executes `UpdateReadyMemo` on `wpReady` to surface installation mode, detected `<DATA_ROOT>`, PostgreSQL port/version, installed vs target version, free disk space, and active backup protection prior to clicking Install.

---

## 4. DATABASE COMPATIBILITY MATRIX & MIGRATION ENGINE

PrathamOne EduOS uses **Alembic** (`backend/alembic/`) exclusively as the canonical schema evolution engine (SSOT Rule 002):

| App Release Range | Alembic Head Revision | Schema Milestone | Upgrade Path From Prior |
| :--- | :--- | :--- | :--- |
| `1.182.x` | `057_repair_teacher_assignments` | Teacher assignment normalization | Linear `alembic upgrade head` |
| `1.183.x – 1.184.x` | `058_*` | Licensing / telemetry hardening | Linear `alembic upgrade head` |
| `1.185.x` | `059_budgeting_and_forecasting` | FP&A budgets & line items | Linear `alembic upgrade head` |

### Execution Policy (`--migrate-only`)
1. Pre-copy disk check (`>= 500 MB`) and verified logical backup (`pg_dump -Fc`, non-zero >1024 B) + `robocopy` cluster snapshot in `PrepareToInstall` **before** extracting any binary.
2. Execute `prathamone_backend.exe --migrate-only --actor installer --backup-path "<dump>"` inside `ssPostInstall`.
3. Verify `set(schema_after) == set(alembic_script.get_heads())` against live PostgreSQL before writing `.bootstrap_complete`.
4. Append secret-free audit JSONL entry (`timestamp`, `actor`, `operation`, `app_version`, `schema_before`, `schema_after`, `pending_migrations`, `backup_path`, `outcome`, `reason`) to `<DATA_ROOT>\logs\upgrade_audit.jsonl`.
5. **No Automatic Schema Downgrade:** On migration failure, exit non-zero (`1`), preserve both the pre-upgrade dump and partial state without running `downgrade`, and display explicit restore instructions.

---

## 5. BACKUP, RESTORE & ROLLBACK PROTOCOL

1. **Mandatory Pre-Upgrade Backup Gate (`PrepareToInstall`):** Runs before `[Files]` extraction in both interactive and `/SILENT` modes. If `pg_dump.exe` returns a non-zero exit code or produces a `< 1024 B` dump on an active `PG_VERSION` cluster, Setup aborts immediately with binaries and database untouched.
2. **Binary vs Database Rollback Separation:**
   - Reinstalling an older `.exe` MUST NOT run against a newer DB schema without matching DB restoration.
   - To restore database state after an aborted migration:
     1. Stop PrathamOne services (`StopPrathamOne.exe`).
     2. Drop or recreate target database / cluster using `pg_ctl.exe` & `pg_restore.exe`.
     3. Restore the timestamped custom-format archive:  
        `pg_restore -h 127.0.0.1 -p <port> -U postgres -c -d prashant_academy "<DATA_ROOT>\backups\pre_upgrade_v...dump"`
     4. Re-run `prathamone_backend.exe --preflight-check` to verify clean revision alignment before launching `PrathamOne.exe`.

---

## 6. LICENSING GOVERNANCE & UPGRADE SURVIVAL

- **Authoritative System of Record:** SMRITI Licensing Server (`https://smritisys.com`) issues Ed25519 signed license payloads bound to `license.installation_id` (`PRATHAM-*`).
- **Survival Across Legitimate Upgrades:** Because hardware fingerprinting hashes only stable physical motherboard/CPU/BIOS/UUID identifiers and `<DATA_ROOT>` preserves PostgreSQL `institution_settings`, upgrades across PrathamOne EduOS versions automatically retain active commercial leases, serial numbers, and 30-day desktop trial anchors without reactivation or manual key re-entry.
- **When Revalidation / Reassignment Is Required:** Physical motherboard/CPU replacement, VM UUID reassignment, or moving the database cluster to a different workstation legitimately alters `PRATHAM-*` and triggers fail-closed `Node-Lock Mismatch` (Rule 016), requiring authorized administrator deactivation/re-activation via OTP against `smritisys.com`. Copying `<DATA_ROOT>\data` to clone a license remains strictly blocked.

---

## 7. STAKEHOLDER RIGHTS, ROLES & GOVERNANCE MATRIX

| Stakeholder | Product & Licensing Rights | Institutional Data Rights | Upgrade & Migration Authority |
| :--- | :--- | :--- | :--- |
| **SMRITI Systems (Product Owner)** | Owns IP, issues/revokes licenses, sets edition limits & signing keys | Zero unconsented access to tenant student/financial data | Publishes signed installers, release manifests & compatibility matrices |
| **Release Administrator** | Signs binaries (Authenticode), maintains CI gates & whitelists | Zero production DB access | Authorizes production releases after Gate 1–4 + `verify_market_readiness.py` |
| **Institution Owner** | Holds commercial entitlement for licensed edition | **Sole Owner** of institutional, student, fee & academic records | Final approval for production software & schema-changing upgrades |
| **Institution Administrator** | Views status, performs OTP reactivation if authorized | Administers institute settings & backups via GUI | Initiates approved workstation upgrades (`Do NOT uninstall`) |
| **Database Administrator (DBA)** | Read-only entitlement visibility | Manages authorized `pg_dump` / `pg_restore` exports | Authorizes maintenance windows, verifies `--preflight-check` & recovery |
| **Technical Support** | Diagnostic access only to `logs\upgrade_audit.jsonl` & license serial | Cannot export student/fee PII without written owner consent | Guides backup verification, `--preflight-check`, and `pg_restore` SOPs |
| **End User (Teacher / Staff)** | Consumes authorized workspace features under RBAC | Subject to View-First & RBAC scope controls | Standard application usage only; no upgrade or DB privileges |

---

## 8. MANDATORY RELEASE VERIFICATION CHECKLISTS

- **Before Code Freeze:** `python -m pytest` security/hardware/logging suites pass; zero plaintext credentials or secrets in logs (`upgrade_audit.jsonl`, `backend_server.log`).
- **Policy & Compliance:** `python scripts/manage_headers.py check` (100%), `python tools/docs_manager.py reindex && validate` (0 errors), `python scripts/check_release_hygiene.py`.
- **Desktop Installer Gate (ADR-009):** Full `python build_staging/build_release.py` compiling Cython `.pyd` + `_EXPECTED_PYD_MANIFEST`, Authenticode-signed `PrathamOne_EduOS_Setup.exe`, and passing `verify_release_policy.py --strict`.
- **Dual-Target Parity (Rule 017):** Both `python installer/verify_market_readiness.py --target hosted` and `python installer/verify_market_readiness.py --target desktop` return `APPROVED`.
