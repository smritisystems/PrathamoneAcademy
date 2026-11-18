---
title: "One-Click Automated Update & Zero-Data-Loss Rollback Engine — Enterprise Specification"
module: "19_RELEASES_CHANGELOG"
category: "SPECIFICATION"
document_type: "RESEARCH"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-18"
updated_date: "2026-11-18"
author: "Jawahar R Mallah"
organization: "Smritisys & AITDL Networks"
status: "Approved"
tags: ["auto-update", "one-click-update", "rollback", "zero-data-loss", "windows-installer", "exe-updater", "sysadmin", "release-management"]
entities: ["SystemRelease", "ReleaseAuditLog", "DatabaseBackup"]
api_routes: ["/api/v1/releases/check-update", "/api/v1/releases/apply-update", "/api/v1/releases/rollback"]
related_modules: ["01_ARCHITECTURE", "13_SYSADMIN_SETTINGS", "19_RELEASES_CHANGELOG"]
---

# One-Click Automated Update & Zero-Data-Loss Rollback Engine

## 1. Executive Summary & Problem Analysis

Coaching institutes, academies, and private schools are typically managed by **non-technical personnel**: institute owners, principals, administrative coordinators, front-desk staff, and accountants.

In traditional custom software deployments, upgrading software requires complex technical operations:
- Running command-line git pulls (`git pull`)
- Rebuilding node assets (`npm run build`)
- Executing database schema migrations (`alembic upgrade head`)
- Managing Docker containers (`docker compose up -d`)
- Diagnosing database lockouts or migration conflicts

When non-technical operators are forced to perform or wait for these operations:
1. **Fear of Data Loss:** Administrators hesitate to update because they fear losing critical student fee ledgers, admission KYC records, or historical examination marks.
2. **Downtime & Panic:** If an update fails halfway through (e.g. schema migration error or network disconnection), the software becomes unusable with zero automated path back to working status.
3. **No Visual Feedback:** Traditional scripts provide cryptic console logs that confuse non-technical users.

### The Objective
Deliver a **"Zero-IT-Skills" 1-Click Update System** with:
- A prominent **"Check for Updates"** button directly inside the web software.
- An interactive **Progress Modal (0% to 100%)** displaying human-readable step-by-step milestones.
- **Automated Pre-Update Snapshot:** Full transactional snapshot of all student, fee, and academic data prior to any modification.
- **Guaranteed Zero-Data-Loss Automatic Rollback:** If any error occurs at any point during downloading, schema migration, or healthcheck verification, the system automatically restores the pre-update snapshot and returns to the previous working release without losing a single rupee or student record.
- **Dual Availability:** Available both inside the web application (`Settings / Releases`) and within the standalone Windows Desktop Launcher (`.exe`).

---

## 2. Comparative Industry Research: How Enterprise Systems Update

| Architecture Model | Systems | How It Works | Strengths | Limitations for Coaching ERP |
|---|---|---|---|---|
| **Model A: Standalone Desktop Helper (`.exe`)** | VS Code, Discord, Slack, Chrome (Omaha/Squirrel) | Background worker downloads update; upon restart, a separate tiny executable (`Update.exe`) replaces files. | Seamless for pure desktop client binaries. | Doesn't manage relational databases (PostgreSQL) or stateful multi-user LAN deployments. |
| **Model B: In-App Web 1-Click Updater** | WordPress, Nextcloud, Home Assistant, Portainer | Web UI checks update server; clicking "Update Now" downloads archive, runs migrations, verifies health, shows progress. | Ideal for non-technical users; handles web and database atomically. | Requires robust process isolation and rollback safeguards. |
| **Model C: Enterprise Accounting / On-Prem ERP** | TallyPrime, Marg ERP, SAP Business One | Integrated "F1: Upgrade" wizard; creates mandatory full data snapshot before applying patches; offers both Online and Offline ZIP update modes. | Proven reliability in Indian SME & education sector; guarantees financial immutability. | Historical systems often required restarting the PC. |

### The Finding: Why an `.exe` Cannot Update Itself Directly
On the Windows operating system, any running executable file (`.exe`) is held in an exclusive file lock by the OS kernel (`ERROR_SHARING_VIOLATION`). An `.exe` **cannot overwrite or delete itself while it is executing**.

Therefore, enterprise desktop systems use a **Two-Process Architecture**:
1. The **Main Application** triggers the update request, downloads the payload, and snapshots data.
2. A lightweight **Bootstrap Launcher / Updater Process** (`windows_launcher.py` / `PrathamOneUpdater.exe`) stops the main process, applies the file replacements, runs migrations, and relaunches the service.

---

## 3. Recommended Hybrid Architecture for PrathamOne EduOS

To satisfy both standalone single-PC installations and multi-PC LAN coaching networks, PrathamOne EduOS implements a **Unified Dual-Surface Architecture**:

```
┌────────────────────────────────────────────────────────────────────────┐
│             PRATHAMONE EduOS UNIFIED UPDATE ARCHITECTURE               │
├────────────────────────────────────────────────────────────────────────┤
│  SURFACE 1: IN-SOFTWARE WEB HUB (Settings -> System Releases)          │
│  - Available to Superadmins & Principals from any web browser or tablet│
│  - "Check for Updates" -> Real-time streaming progress modal (0-100%)  │
│  - Online (CDN) & Offline (.edu-update package upload) modes           │
├────────────────────────────────────────────────────────────────────────┤
│  SURFACE 2: WINDOWS DESKTOP LAUNCHER (.exe System Tray)                │
│  - Right-click Tray Icon -> "Check for Updates..."                     │
│  - Spawns bootstrap updater; handles local PostgreSQL & service restart│
├────────────────────────────────────────────────────────────────────────┤
│  COMMON CORE ENGINE: FAIL-SAFE ORCHESTRATOR                            │
│  1. Pre-Flight Storage Check                                           │
│  2. Transactional Database & Ledger Snapshot (db_backup.py)            │
│  3. Cryptographic Signature & SHA-256 Verification                     │
│  4. Transactional Alembic Schema Upgrade                               │
│  5. Atomic Static Asset & Binary Swap                                  │
│  6. Automated Post-Deployment Smoke Test (/health)                     │
│  7. AUTOMATIC ROLLBACK DAEMON (Triggered on any failure)               │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. The 6-Step Fail-Safe Update Lifecycle

When an administrator clicks **"Update to v1.133.0 Now"**, the progress modal executes the following 6 sequential phases:

```
[0% ─────── 15% ──────── 35% ──────── 60% ──────── 80% ──────── 100%]
Pre-Flight   Ledger Snapshot   Download/Verify   Alembic DB   Reload/Smoke
Verification (db_backup.py)    SHA-256 Check     Migration    Healthcheck
```

### Phase 1: Pre-Flight Environment Validation (0% – 15%)
- Checks free disk space (minimum 2.5 GB required for safety).
- Confirms active PostgreSQL connection and table lock availability.
- Verifies that no critical financial transactions or fee receipt generations are actively in-flight.
- Activates temporary **"System Maintenance Mode"** with friendly user message: *"PrathamOne EduOS is applying a system update. Estimated time: 60 seconds."*

### Phase 2: Transactional Database Snapshot (15% – 35%)
- Invokes [`scripts/db_backup.py`](file:///f:/PrashantAcademy/scripts/db_backup.py) to generate a full, verified PostgreSQL custom dump:
  `backups/pre_update_snapshot_v1.132.1_YYYYMMDD_HHMMSS.dump`
- Computes and records the SHA-256 checksum and TOC table count.
- Records the snapshot URI in the active update transaction manifest.
- **Guarantee:** If anything fails after this point, the database can be restored to this exact millisecond.

### Phase 3: Package Ingestion & Integrity Verification (35% – 60%)
- **Online Mode:** Downloads release payload `prathamone-eduos-v1.133.0.pkg` from the secure distribution CDN.
- **Offline Mode:** Accepts uploaded `.pkg` or `.zip` file directly through the web UI for air-gapped or firewalled institutes.
- Verifies the cryptographic RSA/ECDSA digital signature and SHA-256 hash against the official release authority (`Smritisys & AITDL Networks`). Rejects tampered files immediately.

### Phase 4: Atomic Database Schema Migration (60% – 80%)
- Executes database migrations via Alembic (`alembic upgrade head`) within an isolated database transaction.
- If any migration script fails or throws an exception, the transaction is immediately aborted and rolled back.

### Phase 5: Asset Swap & Service Reload (80% – 95%)
- Replaces compiled frontend static assets (`frontend/dist/`) and updated backend route modules.
- Gracefully reloads uvicorn/gunicorn worker processes without dropping existing socket connections.

### Phase 6: Post-Deployment Smoke Healthcheck (95% – 100%)
- The updater polls `http://localhost:2026/health` (or port 80/5173).
- Validates:
  1. API returns HTTP 200 OK.
  2. Database responds with active connection.
  3. Release version string confirms `v1.133.0`.
- **Upon Success:** Clears maintenance mode, shows vibrant green banner:
  *"Update to v1.133.0 Completed Successfully! 100% data intact. Refreshing workspace..."*

---

## 5. Automated Zero-Data-Loss Rollback Engine

If an update fails at **ANY** stage (e.g. server crash, power outage, corrupt download, failed migration, or failed post-update healthcheck):

```
                                  [FAILURE DETECTED]
                                           │
                                           ▼
                       ┌───────────────────────────────────────┐
                       │   AUTOMATIC ROLLBACK ENGINE ACTIVATES │
                       └───────────────────────────────────────┘
                                           │
             ┌─────────────────────────────┼─────────────────────────────┐
             ▼                             ▼                             ▼
    [1. RESTORE DATABASE]         [2. RESTORE ASSETS]          [3. LOG AUDIT & NOTIFY]
    pg_restore from snapshot      Revert frontend/dist &       Record Rollback in
    pre_update_snapshot.dump      backend modules to prior     SystemRelease table;
    (100% data preserved)         working release tag          show plain-English status
```

### Rollback Guarantees:
1. **Zero Data Loss (Rule 001 & Rule 011):** Every student admission record, fee receipt, parent payment, attendance mark, and exam result is preserved exactly as it existed before the update attempt.
2. **Automatic Self-Healing:** The operator is not left with a broken white screen. The software automatically re-launches the last known working release.
3. **Transparent Explanations:** The UI explains in plain English why the rollback occurred (e.g., *"Update was safely rolled back because the internet connection dropped during download. Your academy data was not affected."*).

---

## 6. User Interface Specification (Non-Technical Friendly)

### 6.1 Status Card in Releases / Settings
```
┌────────────────────────────────────────────────────────────────────────┐
│ 🚀 System Updates & Maintenance                                        │
│ Current Version: v1.132.1 (Coaching Institute Edition)                 │
│                                                                        │
│ 🟢 Status: Update Available!                                          │
│ New Version: v1.133.0 (Released Nov 19, 2026)                          │
│                                                                        │
│ Highlights:                                                            │
│ • Enhanced Fee Concession workflows and receipts                       │
│ • 40% faster calendar planning and timetable rendering                 │
│ • Security and database optimizations                                  │
│                                                                        │
│ [ ⚡ Update to v1.133.0 Now ]      [ 📁 Upload Offline Update File ]    │
└────────────────────────────────────────────────────────────────────────┘
```

### 6.2 The Interactive Progress Modal (During Update)
```
┌────────────────────────────────────────────────────────────────────────┐
│ Updating PrathamOne EduOS to v1.133.0                                  │
├────────────────────────────────────────────────────────────────────────┤
│ [██████████████████████████████░░░░░░░░░░░░░░] 65%                     │
│ Current Task: Applying database schema updates...                      │
├────────────────────────────────────────────────────────────────────────┤
│ Progress Steps:                                                        │
│  ✓ Step 1: Pre-flight checks & storage verified                        │
│  ✓ Step 2: Full safe backup of student and fee data created            │
│  ✓ Step 3: Verified package integrity (SHA-256 valid)                  │
│  ➜ Step 4: Upgrading database tables safely (in progress...)           │
│  ○ Step 5: Reloading software services                                 │
│  ○ Step 6: Verifying system health                                     │
├────────────────────────────────────────────────────────────────────────┤
│ ℹ️ Do not turn off your computer. Your data is protected by an        │
│    automated fail-safe snapshot.                                       │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Implementation Roadmap & Technical Components

1. **Backend Update Orchestrator (`backend/app/services/updater_service.py`):**
   - Endpoints:
     - `GET /api/v1/releases/check-update`: Queries remote release manifest or checks staged offline packages.
     - `POST /api/v1/releases/apply-update`: Initiates background task and emits SSE (Server-Sent Events) progress updates.
     - `GET /api/v1/releases/update-status`: Polling / SSE stream returning `{ progress: 65, step: "migrating", log: "..." }`.
     - `POST /api/v1/releases/rollback`: Explicit rollback trigger to restore specified backup snapshot.
2. **Frontend Progress Modal (`frontend/src/components/releases/SystemUpdateModal.tsx`):**
   - High-fidelity React component with animated progress bar, step checklist, live status logs, and error recovery view.
3. **Windows Launcher Integration (`scripts/windows_launcher.py`):**
   - Adds native Windows System Tray option `"Check for Updates..."`.
   - Embeds pre-update backup and service restart runner.
4. **Offline Update Package Generator (`scripts/build_update_package.py`):**
   - Packages diffs, migrations, and assets into an encrypted, signed `.edu-update` archive.

---

## 8. Governance & Compliance Sign-Off

- **Single Source of Truth (SSOT):** Centralized in `SystemRelease` and `release_manifest.json`.
- **Financial Immutability (Rule 010 & Rule 011):** All historical receipts and ledgers protected via pre-flight snapshot.
- **Product Architecture:** PrathamOne EduOS (Coaching Institute Edition) by Smritisys & AITDL Networks.
- **Author:** Jawahar R Mallah.
