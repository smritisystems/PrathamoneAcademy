---
title: "Global Policy: Non-Destructive In-Place Upgrades & Desktop Installer Governance"
module: "25_BUSINESS_REQUIREMENTS"
category: "POLICY"
document_type: "GOVERNANCE"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-21"
updated_date: "2026-11-21"
author: "Jawahar R Mallah"
organization: "Smritisys & AITDL Networks"
status: "Approved"
tags: ["in-place-upgrade", "installer-governance", "data-preservation", "alembic-auto-migration", "backup-snapshot", "rule-013"]
entities: ["Institution", "User", "FeeInvoice", "Payment", "Student"]
api_routes: ["/api/v1/system/health", "/api/v1/system/version"]
related_modules: ["02_INSTALLATION_DEPLOYMENT", "13_SYSADMIN_SETTINGS", "16_DATABASE_API"]
---

# GLOBAL POLICY: NON-DESTRUCTIVE IN-PLACE UPGRADES & DESKTOP INSTALLER GOVERNANCE (RULE 013)

**Product:** PrathamOne EduOS (Coaching Institute Edition)  
**Baseline Version:** 1.0.0  
**Product Architect:** Jawahar R Mallah  
**Organization:** Smritisys & AITDL Networks  
**Policy Status:** MANDATORY — ALL REPOSITORY WORKFLOWS, INSTALLER BUILDS & CODING AGENTS  

---

## 1. PURPOSE & APPLICABILITY

This governance policy mandates strict non-destructive upgrade workflows for **PrathamOne EduOS**. Whenever an administrator or coaching institute installs a newer software release over an existing deployment (via the Windows Desktop Installer `PrathamOne-EduOS-Setup-*.exe` or container update), the system **MUST** guarantee zero data loss, zero configuration regression, automatic schema evolution, and a streamlined, zero-friction upgrade user experience.

Under no circumstance may an upgrade truncate database tables, overwrite administrator passwords, reset custom branding, or require institutional users to re-enter initial onboarding questions.

---

## 2. THE 5 PILLARS OF UPGRADE GOVERNANCE (RULE 013)

### Pillar 1: Immutability of User Data (`{app}\data\`)
1. **Never Re-initialize Database Clusters:** The installer script MUST inspect `{app}\data\PG_VERSION` before invoking `initdb.exe`. If the database cluster exists, `initdb.exe` MUST be bypassed completely.
2. **Preserve User Files & Media:** All student profile images, uploaded receipts, institutional crests, and TLS security certificates residing in `{app}\assets\`, `{app}\data\`, and `{app}\backend\uploads\` MUST remain intact.
3. **Preserve Environment Secrets:** The existing `{app}\.env` file containing institutional secret keys, database credentials, and port configurations MUST NEVER be overwritten or replaced with `.env.example`.

### Pillar 2: Smart Upgrade Mode & Wizard Page Skipping
1. **Automated Prior-Install Detection:** The installer MUST query the Windows Registry (`HKLM` / `HKCU`) for `Uninstall\{AppId}_is1` and verify existing filesystem anchors (`setup_config.json`, `data\PG_VERSION`).
2. **Bypass Redundant Onboarding Screens:** During an upgrade, the installer MUST automatically skip initial onboarding wizard pages:
   - License & Serial Number entry (`LicensePage`)
   - Institute Profile & Admin Password setup (`ConfigPage`)
   - Official Crest selection (`LogoPage`)
   - Academic Boards selection (`AcademicPage`)
   - Medium of Instruction selection (`MediumPage`)
3. **One-Click Upgrade UX:** The user must only experience:
   $$\text{Welcome} \longrightarrow \text{Ready to Upgrade} \longrightarrow \text{Automated Upgrade} \longrightarrow \text{Finish}$$
4. **Prevent Config Regression:** `{app}\setup_config.json` MUST ONLY be generated during fresh installations. An upgrade MUST NOT overwrite stored credentials or institutional settings with wizard defaults.

### Pillar 3: Automated Pre-Upgrade Safety Snapshot
1. **Zero-Touch Backup:** Before copying any new application binary or bytecode module into `{app}`, the installer MUST invoke `pg_dump.exe` to generate an immutable, compressed binary snapshot:
   $$\text{\{app\}}\backslash\text{backups}\backslash\text{pre\_upgrade\_snapshot\_v[Version]\_[Timestamp].dump}$$
2. **Rollback Assurance:** If the upgrade process is interrupted by power loss or operating system crash, the database snapshot guarantees 100% point-in-time recovery without external IT intervention.

### Pillar 4: Automated Schema Evolution (Alembic Head Migration)
1. **No Manual SQL Execution:** End users must never be instructed to run manual SQL scripts or alter tables in `psql`.
2. **Runtime Head Migration:** [`windows_launcher.py`](file:///f:/PrashantAcademy/scripts/windows_launcher.py) and [`windows_bootstrap.py`](file:///f:/PrashantAcademy/scripts/windows_bootstrap.py) MUST automatically execute `alembic upgrade head` upon boot, applying all new columns, constraints, and tables in the background before launching the user interface.
3. **Idempotent Bootstrapping:** Canonical master seeders (`seed.py --bootstrap-only`) must operate strictly in idempotent mode, inserting newly introduced standards or boards without duplicating or modifying existing master records.

### Pillar 5: Multi-Process Termination & File-Lock Prevention
1. **Clean Daemon Shutdown:** [`InitializeSetup`](file:///f:/PrashantAcademy/installer/prathamone_setup.iss) MUST terminate all running instances of `PrathamOne.exe`, `pythonw.exe`, and `postgres.exe` to eliminate file-lock collisions (`ERROR_SHARING_VIOLATION`).
2. **Stale Lock Cleanup:** The installer MUST remove orphaned lock files (`postmaster.pid`) across standard install locations before starting the new service.

---

## 3. USER-FACING UPGRADE GUIDELINE

All documentation, release announcements, and client instructions MUST include the following authoritative guidance:

> **UPGRADE NOTICE FOR EXISTING CLIENTS:**  
> **Do NOT uninstall your previous version.**  
> Simply run the new `PrathamOne-EduOS-Setup-v[X.Y.Z].exe` directly on your workstation. The installer will automatically recognize your existing installation, take a safety backup, preserve all student records, fee ledgers, and attendance history, and upgrade your system to the latest features in seconds.

---

## 4. AUDIT & ENFORCEMENT CHECKLIST

Before releasing any new desktop installer `.exe`:
- [x] Inno Setup script includes `IsUpgradeMode` and `ShouldSkipPage` routines.
- [x] `setup_config.json` is guarded to only write on fresh installs.
- [x] Pre-upgrade automated backup snapshot is triggered during `ssInstall`.
- [x] `scripts/check_release_hygiene.py` reports 100% clean payload.
- [x] `manage_headers.py check` passes with 100% compliance.
- [x] `docs_manager.py validate` passes with 0 blocking errors.
