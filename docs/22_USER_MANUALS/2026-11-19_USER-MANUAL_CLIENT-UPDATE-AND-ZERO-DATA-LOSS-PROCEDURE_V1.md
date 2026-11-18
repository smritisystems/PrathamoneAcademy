---
title: "Client Site System Update & Zero-Data-Loss Operational Procedure"
module: "22_USER_MANUALS"
category: "USER-MANUAL"
document_type: "MANUAL"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.135.0"
doc_version: "1.0"
created_date: "2026-11-19"
updated_date: "2026-11-19"
author: "Jawahar R Mallah"
organization: "Smritisys & AITDL Networks"
status: "Approved"
tags: ["update", "rollback", "deployment", "client-site", "docker", "housekeeping"]
entities: ["UpdaterService", "HousekeepingService", "SystemRelease"]
api_routes: ["/api/v1/updater/progress", "/api/v1/updater/run"]
related_modules: ["13_SYSADMIN_SETTINGS", "19_RELEASES_CHANGELOG"]
---

# Client Site System Update & Zero-Data-Loss Operational Procedure

**Product:** PrathamOne EduOS (Coaching Institute Edition)  
**Target Release:** `v1.135.0` (Build: `2026.11.18-REV-249-v1.135.0-3BCC6F4D`)  
**Architecture:** Single Source of Truth (SSOT) & Self-Healing Zero-Data-Loss Engine  

---

## 1. Incident Forensic Analysis (Client Site Incident)

### 1.1 What Happened
During a system update attempt at the client site, the process stopped at 25% with:
```
Update Interrupted
[Errno 13] Permission denied: '/backups'
Update halted safely before making data changes: [Errno 13] Permission denied: '/backups' 25%
[17:49:38] Starting pre-flight system validation...
[17:49:39] Pre-flight verified: 931.84 GB free disk space available.
[17:49:39] Creating safe transactional snapshot of all student records and ledgers...
[17:49:39] ERROR DETECTED: [Errno 13] Permission denied: '/backups'. Initiating automated self-healing rollback...
[17:49:39] Pre-flight abort: No data was modified. System remains on v1.133.1.
```

### 1.2 Root Cause Analysis (RCA)
- The backend runs within a Linux Docker container under a non-root security context (`appuser`).
- The previous path resolution logic used `REPO_ROOT = Path(__file__).resolve().parents[3]`.
- Inside the container, `__file__` is `/app/app/services/updater_service.py`, so `parents[3]` resolved to `/` (the Linux root filesystem).
- `Path('/backups')` attempted to create a directory directly under `/`, which was rejected by Linux kernel permissions.
- **Fail-Safe Mechanism Success:** The built-in transactional fail-safe detected the permission issue *before* any database migrations or schema alterations took place. It triggered an automated pre-flight abort, ensuring **zero data corruption and zero data loss**, keeping the client operational on `v1.133.1`.

### 1.3 Resolution in v1.135.0
1. `updater_service.py` now uses the canonical `resolve_backups_dir()` method from `housekeeping_service.py`, resolving accurately to `/app/backups` (which maps directly to the host's `./backups` volume).
2. Added transactional metadata fallback snapshotting with SHA-256 verification.
3. Added multi-destination backup replication (Secondary USB, Network NAS, Google Drive Desktop, and Cloudflare R2 / AWS S3).
4. Standardized print footers to `"Powered by [Brand Logo]"` and `" · Powered and managed by [Brand Logo]"`, removing parent corporate identities from student-facing printouts.

---

## 2. Step-by-Step Update Procedure for Client Site

Choose any of the three sanctioned methods below depending on your connectivity to the client machine:

### Method A: 1-Click Update from the Web Interface (Recommended for Non-Technical Staff)

1. Open the browser on the coaching institute host machine and navigate to:
   $$\text{http://localhost:5173/releases}$$
2. Log in with SysAdmin credentials (`admin` / institute administrator account).
3. In the **System Update & Version Management** card, locate the latest release (`v1.135.0`).
4. Click **Start 1-Click Update**.
5. The automated 6-step pipeline executes with real-time visual progress:
   - **Step 1 (15%):** Pre-flight health and disk space verification.
   - **Step 2 (35%):** Automated transactional `.edu` database snapshot.
   - **Step 3 (60%):** Cryptographic package integrity validation.
   - **Step 4 (80%):** Safe database schema migration within an atomic transaction.
   - **Step 5 (95%):** Compiled asset and service module synchronization.
   - **Step 6 (100%):** Post-deployment smoke healthcheck.
6. The modal displays: *"Update to v1.135.0 completed successfully! 100% of your data is intact."*

---

### Method B: Automated 1-Click PowerShell Script (Windows Host)

On the client machine (where Docker Compose is running):
1. Open PowerShell as Administrator in the installation directory (`F:\PrashantAcademy` or client root).
2. Run the automated updater script:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\update.ps1
   ```
3. The script executes the 5-phase safe upgrade:
   - Pulls latest commit from `origin/master`.
   - Validates `.env` production secrets.
   - Captures an automated pre-update PostgreSQL snapshot.
   - Rebuilds and restarts Docker containers while preserving persistent volumes (`pgdata`).
   - Normalizes database schemas, syncs sysadmin accounts, and validates backend health at `http://localhost:8000/health`.

---

### Method C: Quick Terminal Command (Git Pull & Docker Restart)

If executing directly via CLI:
```bash
git pull origin master
docker compose restart backend frontend
```
The backend automatically applies any new Alembic migrations on startup and services become healthy immediately.

---

## 3. Post-Update Verification Checklist

Once updated, perform this 60-second verification:
- [ ] **System Version:** Navigate to Settings / About. Confirm version displays `v1.135.0`.
- [ ] **Data Integrity:** Verify existing student count, recent fee collection transactions, and academic batches match pre-update records.
- [ ] **Print Branding Check:**
  - Open any issued invoice in **Fees & Payments** -> **Issued Invoices** -> **Preview / Print**.
  - Confirm the bottom footer displays:  
    `PrathamOne EduOS · Coaching Institute Edition · Powered and managed by [Brand Logo]`
  - Confirm that `"SmritiSys & AITDL Networks"` is **NOT** present on the print preview.
  - Open any fee receipt; confirm the attribution reads `"Powered by [Brand Logo]"` (and not `"Created by"`).
- [ ] **Multi-Path Backup Test:**
  - Navigate to **Settings** -> **Housekeeping** -> **Database Backups**.
  - Confirm the **"Multi-Path Backup Destinations & Cloud Sync"** card is active.
  - Click **"Test Path & Permissions"** on configured backup destinations to ensure green status.
