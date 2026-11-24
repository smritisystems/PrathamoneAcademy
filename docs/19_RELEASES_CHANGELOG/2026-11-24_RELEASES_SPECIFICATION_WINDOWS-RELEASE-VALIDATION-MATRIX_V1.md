---
title: "Windows Release Validation Matrix & Staging Verification Protocol"
module: "19_RELEASES_CHANGELOG"
category: "SPECIFICATION"
document_type: "SPECIFICATION"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-24"
updated_date: "2026-11-24"
author: "Jawahar R Mallah"
organization: "Smritisys & AITDL Networks"
status: "Approved"
tags: ["release-validation", "windows-exe", "installation-matrix", "upgrade-drill", "license-enforcement", "disaster-recovery"]
entities: ["SystemRelease", "License", "AuditLog", "HousekeepingBackup"]
api_routes: ["/api/v1/releases", "/api/v1/license", "/api/v1/housekeeping"]
related_modules: ["01_ARCHITECTURE", "02_INSTALLATION_DEPLOYMENT", "16_DATABASE_API", "19_RELEASES_CHANGELOG", "20_AUDITS_COMPLIANCE"]
---

# Windows Release Validation Matrix & Staging Verification Protocol

## 1. Executive Summary

This document establishes the mandatory 9-scenario verification matrix for packaging, signing, and releasing **PrathamOne EduOS (Coaching Institute Edition v1.0.0)** for Windows on-premises deployment. It integrates strict adherence to:
- **Rule 011:** Mandatory Data Deduplication & Canonical Master Reuse
- **Rule 012:** Automated Release Hygiene & Production Artifact Whitelisting (`installer/release_whitelist.json`)
- **Rule 013:** Non-Destructive Desktop In-Place Upgrades & Zero-Data-Loss Installer Governance
- **Rule 014:** Global Sleek UI/UX Design System & Anti-Vertical-Bloat Governance
- **Rule 015:** Operational Data Integrity & Time Schedule Normalization Governance

Every test scenario detailed below must be executed and confirmed in an isolated staging environment before any customer distribution.

---

## 2. Nine-Point Release Validation Matrix

### Scenario 1: Fresh Installation
- **Objective:** Verify clean installation of PrathamOne EduOS on a fresh Windows host (VM / Sandbox).
- **Environment:** Windows 10/11 x64 clean image with no prior PostgreSQL or Python runtimes.
- **Payload:** `PrathamOneEduOS-Setup-1.0.0.exe` built in compliance with `installer/release_whitelist.json`.
- **Preconditions:** Port 8000 and 5432 available; administrative rights granted.
- **Execution Steps:**
  1. Launch installer executable with standard administrator privileges.
  2. Confirm target installation directory (defaults to `C:\Program Files\PrathamOne EduOS`).
  3. Installer deploys bundled binaries, virtual environment, and PostgreSQL 16 cluster binaries.
  4. Installer executes `initdb` initializing cluster in `{app}\data` with UTF-8 encoding.
  5. Installer runs `alembic upgrade head` to establish all SSOT schemas, views, and indexes.
  6. Admin setup wizard requests initial SuperAdmin credentials and institute profile.
  7. Windows Service is registered and health check endpoint `/health` is pinged.
- **Expected Results:**
  - Service starts cleanly; background healthcheck returns `200 OK`.
  - Desktop and Start Menu shortcuts created.
  - Browser automatically navigates to `http://127.0.0.1:8000`.
  - Initial system prompt displays Evaluation / Registration notice without unhandled exceptions.
- **Verification Command:**
  ```powershell
  Invoke-WebRequest -Uri "http://127.0.0.1:8000/health" -UseBasicParsing | Select-Object StatusCode, Content
  ```

---

### Scenario 2: Existing Installation Upgrade (In-Place Upgrade — Rule 013)
- **Objective:** Validate zero-touch in-place upgrade over an existing installation without data loss or duplicate configuration prompts.
- **Environment:** Host running existing release (e.g. v1.0.0-rc / v0.9.x) with active institutional database.
- **Preconditions:** Active database containing students, academic timetable, fee payments, and attendance logs.
- **Execution Steps:**
  1. Run new installer `PrathamOneEduOS-Setup-1.0.0.exe` directly over existing `{app}` directory without uninstallation.
  2. Installer detects pre-existing `{app}\data` and `{app}\.env`.
  3. Installer automatically skips redundant onboarding pages (admin password, institute profile, academic boards).
  4. **Automated Pre-Upgrade Snapshot:** Installer triggers `pg_dump` snapshot saving `{app}\backups\pre_upgrade_{timestamp}.edu`.
  5. Installer updates application code, Python wheels, and compiled Vite frontend assets.
  6. Launcher automatically invokes `alembic upgrade head` for zero-touch schema evolution.
  7. Service restarts and verifies DB connectivity.
- **Expected Results:**
  - Zero data loss or reset of `.env` configuration (`SECRET_KEY`, database credentials preserved).
  - All existing user accounts, passwords, historical receipts, and academic divisions intact.
  - Pre-upgrade backup archive verified and cataloged in Housekeeping service.
- **Verification Command:**
  ```powershell
  python tools/docs_manager.py validate; python -m pytest backend/tests/test_updater_service.py -q
  ```

---

### Scenario 3: License Activation (Serial Key & Hardware Fingerprinting)
- **Objective:** Verify online license activation, hardware fingerprint binding, and cryptographic entitlement unlock.
- **Environment:** Clean or upgraded installation in unactivated evaluation state.
- **Preconditions:** Active internet connection; valid 16-character license serial key issued by Smriti Systems Authority.
- **Execution Steps:**
  1. Institute administrator navigates to Settings -> System Licensing.
  2. Enters license serial key and clicks "Activate License".
  3. Client collects machine hardware fingerprint (CPU ID, motherboard serial, MAC address, primary disk volume UUID).
  4. Client sends TLS 1.3 `POST /api/license/activate` request to remote authority (`smritisys.com` / `smritisys-db`).
  5. Authority validates key, checks rollout stage (`enforced`), signs payload using Ed25519, and returns signed artifact.
  6. Client verifies Ed25519 signature against embedded public key and persists license artifact locally.
- **Expected Results:**
  - Status updates immediately to "Active / Enforced".
  - Licensed modules (Academics, Fees, Examinations, Payroll, Housekeeping) unlocked.
  - Audit log captures `LICENSE_ACTIVATED` event with hardware fingerprint hash.
- **Verification Command:**
  ```bash
  curl -s -X GET "http://127.0.0.1:8000/api/v1/license/status" -H "Authorization: Bearer <token>"
  ```

---

### Scenario 4: License Refresh & Monotonic Entitlement Sync
- **Objective:** Verify automatic and manual lease renewal and entitlement updates without service interruption.
- **Environment:** Active licensed instance with internet access.
- **Preconditions:** Remote authority has updated customer entitlements (e.g., renewed subscription or increased student limit).
- **Execution Steps:**
  1. Trigger manual refresh or wait for daily background lease sync (`POST /api/v1/license/refresh`).
  2. Client transmits current installation token, activation identifier, and monotonic nonce.
  3. Authority verifies token, evaluates quota and expiry, and issues updated signed artifact with extended `lease_expires_at`.
  4. Client receives payload, validates signature, and updates local cache.
- **Expected Results:**
  - Lease period extended (14 days forward).
  - Newly granted features immediately accessible in frontend without application restart.
  - Monotonic counter prevents replay attacks.
- **Verification Command:**
  ```bash
  curl -s -X POST "http://127.0.0.1:8000/api/v1/license/refresh" -H "Authorization: Bearer <token>"
  ```

---

### Scenario 5: Offline Operation & Monotonic Clock Tamper Defense
- **Objective:** Verify system operates normally within the 14-day offline lease window and prevents clock manipulation.
- **Environment:** Air-gapped or network-disconnected workstation.
- **Preconditions:** Valid active license activated prior to network disconnection.
- **Execution Steps:**
  1. Disconnect network adapter (airplane mode).
  2. Perform standard daily operations: create admission, collect fee installment, mark attendance, print receipt.
  3. Verify system behaves identically to online mode while `current_time <= lease_expires_at`.
  4. Advance system clock forward by 3 days (within the 14-day window) -> operations continue.
  5. Attempt clock rollback: set system time backward by 2 days.
  6. Attempt lease expiry: advance system time past the 14-day lease expiration.
- **Expected Results:**
  - Routine operations unhindered during active offline lease.
  - Clock rollback detected via monotonic file timestamp check -> triggers security lockout.
  - Lease expiration triggers graceful fail-closed status: write operations return `HTTP 423 Locked`.
  - Read-only historical access, report export, and housekeeping backups remain operational for business continuity.
- **Verification Criteria:**
  - Zero crashes or corrupted records; explicit UI explanation of offline lease expiration.

---

### Scenario 6: Subscription Expiry & 7-Day Grace Period Behavior
- **Objective:** Verify operational continuity during the 7-day grace period and subsequent lock enforcement.
- **Environment:** Subscription-based installation approaching paid term expiration.
- **Preconditions:** D1 migration 0036 active (`rollout_stage = 'enforced'`, `subscription_grace_days = 7`).
- **Execution Steps:**
  1. Paid subscription term expires (`current_time > subscription_end_date`).
  2. Client syncs with authority or evaluates local license artifact.
  3. **Days 1 to 7 (Grace Period):**
     - UI displays warning banner: "Subscription Expired - Operating under 7-Day Grace Period. Please renew."
     - All academic and administrative workflows remain fully operational.
     - Teachers can mark attendance; cashiers can accept fees and issue receipts.
  4. **Day 8+ (Hard Expiry):**
     - Grace period ends.
     - Write operations transition to locked (`HTTP 423 Locked`).
     - Admin can access `/api/v1/reports/export` and `/api/v1/housekeeping/backups`.
- **Expected Results:**
  - 7-day operational safety net prevents accidental operational shutdowns.
  - Strict enforcement begins promptly on Day 8 with complete data export availability.
- **Verification Criteria:**
  - Grace period calculations conform to UTC boundary rules.

---

### Scenario 7: Backup and Disaster Recovery Drill (GFS & Ephemeral Drill)
- **Objective:** Verify zero-loss database backups and isolated automated restore verification.
- **Environment:** Operational database with multi-year data.
- **Preconditions:** Grandfather-Father-Son (GFS) backup retention active.
- **Execution Steps:**
  1. Navigate to SysAdmin Housekeeping -> Backups.
  2. Initiate backup creation: `POST /api/v1/housekeeping/backups`.
  3. System creates encrypted/compressed `.edu` archive and validates SHA-256 checksum.
  4. GFS engine prunes obsolete archives into distinct daily, weekly, and monthly slots.
  5. Execute restore drill: `POST /api/v1/housekeeping/backups/{filename}/restore-drill` or CLI:
     ```powershell
     python tools/restore_drill.py --backup-file backups/archive.edu
     ```
  6. Engine creates temporary isolated database `prathamone_restore_drill_{uuid}`.
  7. Restores snapshot, verifies schema integrity, student count, and financial ledger balances.
  8. Drops drill database and records verified status in backup catalog.
- **Expected Results:**
  - Production database remains completely isolated and operational throughout drill.
  - Backup archive verified 100% recoverable.
  - Audit log captures drill results.
- **Verification Command:**
  ```powershell
  python -m pytest backend/tests/test_housekeeping.py -k "restore_drill" -q
  ```

---

### Scenario 8: Uninstall and Reinstall Safety
- **Objective:** Verify that uninstallation preserves user database and configuration by default.
- **Environment:** Desktop host with existing institutional data.
- **Preconditions:** Active installation in `C:\Program Files\PrathamOne EduOS`.
- **Execution Steps:**
  1. Open Windows Control Panel -> "Add or Remove Programs" -> select "PrathamOne EduOS" -> Uninstall.
  2. Uninstaller displays prompt: *"Do you want to retain your student database and settings for future upgrades? [Recommended: Yes]"*.
  3. Select "Yes" and complete uninstallation.
  4. Inspect installation directory: verify binaries removed while `{app}\data` and `{app}\.env` are preserved.
  5. Run installer `PrathamOneEduOS-Setup-1.0.0.exe` targeting the same path.
  6. Launch application.
- **Expected Results:**
  - Application starts immediately without requiring re-onboarding.
  - All students, classes, historical vouchers, and users immediately accessible.
- **Verification Criteria:**
  - Zero data loss on intentional or accidental uninstallation.

---

### Scenario 9: Customer Database Preservation & Historical Ledger Immutability (Rule 011)
- **Objective:** Ensure schema migrations and canonical deduplication never mutate historical financial ledgers.
- **Environment:** Upgraded installation with historical invoices and exam marks.
- **Preconditions:** Historical receipts (`RCP-2026-0001` through `RCP-2026-0177`) exist.
- **Execution Steps:**
  1. Query historical receipts and invoices via API.
  2. Confirm fee receipt records retain static financial snapshots (amount, date, cashier, tax breakdown).
  3. Attempt to invoke `DELETE /api/v1/fees/receipts/{id}` or `PUT /api/v1/fees/receipts/{id}` on posted receipt.
  4. Verify canonical subject deduplication: mapping table links subjects without rewriting past exam marks.
  5. Verify sequential numbering: zero gaps, zero number reuse.
- **Expected Results:**
  - Deletion or modification of posted financial records strictly rejected (`HTTP 400/403`).
  - Historical exam marks and student coordinates remain immutable snapshots.
  - Canonical entities linked cleanly via relationship tables.
- **Verification Criteria:**
  - Compliance with Rule 010 (View-First), Rule 011 (Deduplication & Snapshot Immutability), and Rule 015 (Schedule Normalization).

---

## 3. Security & Code-Signing Readiness Gate

| Requirement | Current Status | Release Impact | Resolution Path |
|---|---|---|---|
| **EV Authenticode Code Signing** | PENDING | **RELEASE BLOCKER** | An Extended Validation (EV) certificate with RFC 3161 Digicert timestamping is required. Self-signed certificates are strictly prohibited for customer distribution. |
| **Fail-Closed Automatic Updater** | PASS (Enforced) | Safe | `AUTO_UPDATE_VERIFICATION_READY = False` remains enforced in `updater_service.py` until signed manifest verification is implemented. |
| **SmartScreen Reputation** | INFORMED | Non-Blocker | Microsoft SmartScreen reputation accumulates over time with an EV certificate. Installer messaging must guide administrators during initial deployment. |
| **License Key Protection** | PASS (Enforced) | Safe | Private signing keys reside strictly in Cloudflare KMS. Public verification keys only are bundled in application. |
| **Tenant Isolation & RBAC** | PASS (Enforced) | Safe | SysAdmin privileges strictly enforced; cross-tenant access prohibited across all endpoints. |

---

## 4. Verification Sign-Off Protocol

Before any build is promoted from Staging to Production:
1. **Cloudflare Authority Suite:** Must report `148/148 passed (100%)`.
2. **Frontend Suite:** Must report `646/646 passed (100%)` across 89 files.
3. **Frontend Production Build:** `npm run build` must complete with zero errors.
4. **Backend Suite:** Must report `465/465 passed (100%)`.
5. **Release Hygiene:** `python scripts/check_release_hygiene.py` must pass with zero unwhitelisted artifacts.
6. **Executive Approval:** Explicit release authorization by Product Architect Jawahar R. Mallah.
