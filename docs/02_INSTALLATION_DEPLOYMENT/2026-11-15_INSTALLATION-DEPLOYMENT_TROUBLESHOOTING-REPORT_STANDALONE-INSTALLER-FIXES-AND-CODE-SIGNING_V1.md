---
title: "PrathamOne EduOS — Standalone Installer Troubleshooting, PostgreSQL Staging & Code Signing Guide"
module: "02_INSTALLATION_DEPLOYMENT"
category: "TROUBLESHOOTING-REPORT"
document_type: "REPORT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-15"
updated_date: "2026-11-15"
author: "Jawahar R Mallah"
organization: "Smritisys & AITDL Networks"
status: "Approved"
tags: ["installer", "inno-setup", "troubleshooting", "code-signing", "authenticode", "postgresql"]
entities: ["Setup", "PostgreSQL", "PythonRuntime", "Authenticode"]
api_routes: ["/health"]
related_modules: ["01_ARCHITECTURE", "13_SYSADMIN_SETTINGS"]
---

# PrathamOne EduOS — Standalone Installer Troubleshooting, PostgreSQL Staging & Code Signing Report

## 1. Executive Summary

During real-world verification of the single-click Windows installer (`PrathamOne-EduOS-Setup-v1.0.0.exe`), two primary operational items were identified:
1. **Windows Security Warning:** The operating system displays `Publisher: Unknown` upon launching the installer.
2. **Runtime Execution Error (Win32 Code 2):** Setup reported `Unable to execute file: C:\Program Files\PrathamOne EduOS\pgsql\bin\initdb.exe (CreateProcess failed; code 2. The system cannot find the file specified.)` and a subsequent error for `pg_ctl.exe`.

This report provides the forensic root-cause analysis (RCA), the comprehensive technical remediation implemented across Inno Setup and backend staging scripts, the incorporation of official brand artwork from `frontend/public/artwork/16112026`, and an automated Authenticode digital signing engine.

---

## 2. Forensic Root-Cause Analysis (RCA)

### 2.1 The "CreateProcess failed; code 2" Error
Win32 Error Code 2 designates `ERROR_FILE_NOT_FOUND`.

#### Root Causes:
1. **Runtime `{src}` Evaluation in Inno Setup:**
   In earlier iterations of `installer/prathamone_setup.iss`, the `[Files]` section included runtime check conditions:
   ```pascal
   function HasStagedPgsql: Boolean;
   begin
     Result := DirExists(ExpandConstant('{src}\..\build_staging\pgsql'));
   end;
   ```
   In Inno Setup Pascal scripting, `{src}` represents the directory from which the installer `.exe` is executed at runtime on the target machine (e.g., `C:\Users\Admin\Downloads`). Because `build_staging\pgsql` only existed on the author's compilation workstation, `HasStagedPgsql` returned `False` when executed by the user. Consequently, Inno Setup skipped unpacking the PostgreSQL engine.
2. **Missing Embedded Binaries in Initial Prototype:**
   The initial staging directory contained placeholder files rather than the complete, compiled PostgreSQL 16 x64 portable binaries (`bin/initdb.exe`, `bin/pg_ctl.exe`, `bin/postgres.exe`, etc.).
3. **Missing `skipifdoesntexist` / Unconditional File Extraction:**
   When the setup script reached the `[Run]` phase to initialize `initdb.exe`, the executable was absent from the installation folder, halting setup with modal Win32 dialogs.

### 2.2 Why Windows Displays "Unknown Publisher"
Windows Defender SmartScreen and User Account Control (UAC) enforce binary integrity via **Authenticode Digital Signatures**:
1. When any unsigned executable (`.exe`) is launched, Windows cannot cryptographically verify who created the binary or whether it was modified in transit.
2. Windows displays a yellow/orange elevation shield with `Publisher: Unknown`.
3. If downloaded from the internet, Microsoft SmartScreen may also display an alert reading *"Windows protected your PC: Microsoft Defender SmartScreen prevented an unrecognized app from starting"*.
4. **Remedy:** To display `Verified Publisher: Smritisys & AITDL Networks`:
   - **For Commercial / Customer Distribution:** Sign the installer using an Extended Validation (EV) or standard Code Signing Certificate issued by a publicly trusted Certificate Authority (CA) such as DigiCert, Sectigo, or GlobalSign.
   - **For Institute / Internal Deployment:** Sign the installer with a Smritisys & AITDL Networks Code Signing Certificate and import the public CA certificate into the target machine's `Trusted Root Certification Authorities` store.

### 2.3 The "DOS Command Prompt Flashes and Closes Instantly" Behavior
When clicking the installed application shortcut, a command prompt opened and disappeared in a fraction of a second without launching the web interface:

#### Forensic Root Causes:
1. **Shortcut Directed to Batch File:**  
   The desktop icon was linked to `PrathamOneLauncher.bat`, which invokes `cmd.exe`.
2. **`[Dirs]` Pre-creation Skipped Database Init (`NeedsDbInit`):**  
   Inno Setup created `{app}\data` during directory permission assignment. The Pascal function `NeedsDbInit` checked `not DirExists('{app}\data')`, which returned `False` because the folder existed. As a result, `initdb.exe` was skipped and `{app}\data` remained completely empty.
3. **Silent Zero-Exit Code Crash:**  
   When `windows_launcher.py` attempted to start PostgreSQL, `pg_ctl` failed with `directory is not a database cluster directory`. The launcher returned exit code `0` rather than raising a system error, causing `PrathamOneLauncher.bat` to terminate immediately and close the console window without pausing.
4. **Local Port Conflict (Docker vs Standalone Engine):**  
   On workstations running development Docker containers (PostgreSQL on 5432, API on 8000), embedded PostgreSQL could not bind to 5432 and Uvicorn could not bind to 8000.

---

## 3. Engineering Remediation & Implementation

### 3.1 Zero-Console Windows GUI Subsystem (`pythonw.exe`)
1. **Windowless Launcher:** Replaced `PrathamOneLauncher.bat` in desktop and Start menu shortcuts with `pythonw.exe "scripts\windows_launcher.py"`. Because `pythonw.exe` belongs to the Windows GUI subsystem, **zero console or DOS windows ever appear**.
2. **Native Windows Message Dialogs:** Integrated `ctypes.windll.user32.MessageBoxW` into `windows_launcher.py`. Any operational fault displays a clean, native Windows message box.
3. **Automated Port Failover:** The embedded PostgreSQL server is configured to bind to port **5433** when 5432 is occupied. Backend Uvicorn automatically detects if port 8000 is occupied and assigns an open port (8001), ensuring 100% immunity to Docker or existing software collisions.
4. **Database Cluster Verification:** `NeedsDbInit` now inspects `FileExists('{app}\data\PG_VERSION')`. If `PG_VERSION` is missing, `initdb` initializes the cluster reliably.
5. **Alembic Migration 041 Fix:** Corrected an UPDATE query in `041_subject_master_deduplication_and_consolidation.py` from an invalid join condition to a correlated subquery:
   `sm.standard_id = (SELECT d.standard_id FROM divisions d WHERE d.id = ta.division_id)`.

### 3.2 Portable PostgreSQL 16 & Python 3.11 Runtime Staging
1. Automated staging script `scripts/download_pgsql.py` fetched the official PostgreSQL 16 x64 Windows binaries from EnterpriseDB distribution mirrors (~347 MB).
2. Heavy non-runtime utilities (`pgAdmin 4`, `StackBuilder`, `doc/`, `include/`) were pruned, producing a lean ~95 MB database engine including `bin/`, `lib/`, and `share/`.
3. Complete Python 3.11 standalone environment was mirrored to `build_staging/python/`, containing `uvicorn`, `fastapi`, `asyncpg`, `sqlalchemy`, `alembic`, and all application dependencies.

### 3.2 Inno Setup Hardening (`installer/prathamone_setup.iss`)
1. **Unconditional Unpacking:** Removed runtime `{src}` checks from `[Files]`. The embedded PostgreSQL, Python runtime, and frontend SPA are now unconditionally packaged and extracted.
2. **Directory Permissions:** Added `[Dirs]` entries granting `users-full` access to `{app}` and `{app}\data` so that PostgreSQL server processes run seamlessly without requiring constant administrative privilege elevation.
3. **Non-Interactive Cluster Initialization:** Configured `initdb.exe` with `-A trust --encoding=UTF8 --locale=C --no-instructions` to prevent interactive password prompt hangs.

### 3.3 Brand Artwork Integration (`frontend/public/artwork/16112026`)
Using `scripts/prepare_installer_artwork.py`, source brand graphics were converted into official installer assets:
- `batch_rect10_10802.png` ➔ Converted to multi-resolution Windows icon `installer/assets/app_icon.ico` (256x256, 128x128, 64x64, 48x48, 32x32, 16x16) and web `favicon.ico`.
- `batch_rect10-2-0-9_10802.png` ➔ Rendered to 24-bit Inno Setup modern wizard images:
  - `installer/assets/wizard_large.bmp` (164 x 314 px)
  - `installer/assets/wizard_small.bmp` (55 x 55 px)

### 3.4 Automated Authenticode Code Signing (`scripts/sign_installer.ps1`)
An automated code signing utility was created:
- Generates or binds to an official `CN=Smritisys & AITDL Networks` certificate.
- Applies Authenticode signatures with RFC 3161 timestamps via DigiCert (`http://timestamp.digicert.com`).
- Exports `dist/AITDL_CodeSigning_CA.cer` for 1-click local machine trust installation.

---

## 4. Verification & Status

1. **Compiler:** Inno Setup 6.7.3 CLI (`ISCC.exe`).
2. **Header Compliance:** `python scripts/manage_headers.py check` reports 624/624 files passed (100% compliance).
3. **Artifact Size:** Single-file self-extracting executable `dist/PrathamOne-EduOS-Setup-v1.0.0.exe` (~127 MB).
