---
title: "Smart Installer Drive Selection and Folder Architecture Blueprint"
module: "01_ARCHITECTURE"
category: "TECHNICAL-BLUEPRINT"
document_type: "BLUEPRINT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-16"
updated_date: "2026-11-16"
author: "Jawahar R Mallah"
organization: "Smritisys & AITDL Networks"
status: "Approved"
tags: ["installer", "architecture", "drive-selection", "non-system-drive", "folder-naming", "PrathamOneEduOS", "data-protection"]
entities: ["InstallationEngine", "EmbeddedPostgres", "EmbeddedBackend", "SystemTrayLauncher", "AutoBackupEngine"]
api_routes: []
related_modules: ["02_INSTALLATION_DEPLOYMENT", "13_SYSADMIN_SETTINGS", "16_DATABASE_API"]
---

# Smart Installer Drive Selection and Folder Architecture Blueprint

## 1. Executive Summary & Problem Formulation

### 1.1 Problem Statement
1. **OS Vulnerability & Data Loss Risk:** On Windows PCs in coaching institutes, the Windows operating system drive (typically `C:\`) is frequently formatted, reinstalled, or repaired by local technicians following malware, BSOD crashes, or OS upgrades. Installing educational enterprise software and its PostgreSQL database on the OS drive creates a high risk of catastrophic data loss.
2. **Drive Letter Ambiguity:** While `C:` is customary, Windows is not guaranteed to be installed on `C:\`. In dual-boot or partitioned OEM computers, the Windows operating system may reside on `D:\`, `E:\`, or another drive letter. An installer must never assume `C:` is the OS drive.
3. **Filesystem Space Incompatibility:** Paths with spaces (e.g. `C:\Program Files\PrathamOne EduOS\`) require continuous quote escaping in batch scripts, CLI utilities, and Unix-derived engines like PostgreSQL (`initdb`, `pg_ctl`, `pg_dump`). They also introduce Windows 8.3 short filename aliasing (`PRATHA~1`) and unquoted search path vulnerabilities.

### 1.2 Architectural Resolution
This blueprint establishes the **Smart Drive Selection & Decoupled Folder Architecture** for PrathamOne EduOS v1.0.0:
1. **Dynamic OS Drive Discovery:** Detects the true Windows system drive dynamically via `{sd}` and Win32 `GetDriveType` APIs, avoiding installation onto the active Windows OS drive whenever a secondary data drive is present.
2. **Visual vs. Filesystem Decoupling:** Decouples the human-readable brand name (`PrathamOne EduOS`) used for UI, Desktop icons, and Control Panel from the physical filesystem folder name (`PrathamOneEduOS`) used on disk.
3. **Zero-Scattering Storage:** Consolidates 100% of the runtime stack, database, logs, and uploads inside the chosen installation root, leaving `C:\ProgramData` completely untouched (except for standard Windows Start Menu shortcuts).

---

## 2. Decoupled Brand vs. Filesystem Matrix

```mermaid
flowchart LR
    subgraph User Experience & Branding
        U1["Desktop Shortcut: 'PrathamOne EduOS'"]
        U2["Start Menu Group: 'PrathamOne EduOS'"]
        U3["Apps & Features: 'PrathamOne EduOS v1.0.0'"]
        U4["Browser Tab / UI: 'PrathamOne EduOS'"]
    end

    subgraph Physical Filesystem Architecture
        D1["Default Target: D:\PrathamOneEduOS\"]
        D2["data\ (PostgreSQL 16 Database)"]
        D3["pgsql\ (Portable Binaries)"]
        D4["python\ (Embedded Runtime)"]
        D5["backend\ & frontend\dist\"]
        D1 --> D2
        D1 --> D3
        D1 --> D4
        D1 --> D5
    end

    U1 -.->|Points to Executable| D1
```

| Component | Identifier | Purpose | Value |
| :--- | :--- | :--- | :--- |
| **Brand Display Name** | `MyAppName` | Shortcuts, window titles, Control Panel, dialogs | **`PrathamOne EduOS`** |
| **Filesystem Folder** | `MyAppDirName` | Physical directory on disk | **`PrathamOneEduOS`** |
| **Primary Target Path** | Smart Resolved | Automated target if non-OS drive exists | **`D:\PrathamOneEduOS`** |
| **Fallback Target Path** | System Fallback | If only single partition exists | **`{autopf}\PrathamOneEduOS`** |

---

## 3. Dynamic Smart Drive Selection Algorithm

The installer evaluates system drives at wizard initialization:

```mermaid
flowchart TD
    START([Start Setup Wizard]) --> DETECT["1. Read True Windows OS Drive via {sd}"]
    DETECT --> LOOP["2. Iterate Fixed Drives: D: through Z:"]
    LOOP --> CHECK_FIXED{Is Drive Fixed & Not OS Drive?}
    CHECK_FIXED -- Yes --> SELECT_DRIVE["Select First Fixed Data Drive (e.g. D:)"]
    CHECK_FIXED -- No --> NEXT_DRIVE[Check Next Letter]
    NEXT_DRIVE --> LOOP
    SELECT_DRIVE --> BUILD_PATH["Set Target: <Drive>:\PrathamOneEduOS"]
    LOOP -- All Scanned & None Found --> CHECK_C{Is Windows on D/E/Z?}
    CHECK_C -- Yes & C: is Fixed --> SELECT_C["Select C:\PrathamOneEduOS"]
    CHECK_C -- No (Single Partition C:) --> FALLBACK["Fall back to {autopf}\PrathamOneEduOS"]
    SELECT_C --> BUILD_PATH
    FALLBACK --> SHOW_WIZARD
    BUILD_PATH --> SHOW_WIZARD["Display Destination Selection Page with 'Browse...' Option"]
```

### 3.1 Formal Inno Setup Algorithm Specification
```pascal
function GetDriveType(lpRootPathName: String): Cardinal;
external 'GetDriveTypeW@kernel32.dll stdcall';

function GetSmartInstallDir(Param: String): String;
var
  SysDrive: String;
  DriveCode: Integer;
  DriveLetter: String;
  DrivePath: String;
  BestDrive: String;
begin
  // 1. Authoritative dynamic resolution of current Windows system drive
  SysDrive := Copy(ExpandConstant('{sd}'), 1, 1);
  BestDrive := '';

  // 2. Scan drive letters D: through Z: for a permanent fixed drive (Type 3)
  for DriveCode := 68 to 90 do
  begin
    DriveLetter := Chr(DriveCode);
    if DriveLetter <> SysDrive then
    begin
      DrivePath := DriveLetter + ':\';
      if DirExists(DrivePath) and (GetDriveType(DrivePath) = 3) then
      begin
        BestDrive := DriveLetter;
        Break;
      end;
    end;
  end;

  // 3. If Windows is installed on D: or E:, check if C: is an available fixed data drive
  if (BestDrive = '') and (SysDrive <> 'C') then
  begin
    DrivePath := 'C:\';
    if DirExists(DrivePath) and (GetDriveType(DrivePath) = 3) then
    begin
      BestDrive := 'C';
    end;
  end;

  // 4. Return optimal non-OS data directory or fall back to standard Program Files
  if BestDrive <> '' then
    Result := BestDrive + ':\' + Param
  else
    Result := ExpandConstant('{autopf}\') + Param;
end;
```

---

## 4. Disaster Recovery & Uninstallation Governance

### 4.1 Safety Backup Before Uninstallation
Before any files are removed, the uninstaller queries the administrator:
```
"Would you like to save a safety backup of your student and fee database in your Documents folder before uninstalling?"
```
On confirmation, it executes:
```powershell
pg_dump.exe -U postgres -p 5432 -Fc prashant_academy -f "%USERPROFILE%\Documents\PrathamOne_Backups\prathamone_uninstall_backup.dump"
```

### 4.2 Reinstallation Data Preservation
If an institute uninstalls and subsequently reinstalls PrathamOne EduOS on the same drive:
- The installer detects `{app}\data\PG_VERSION`.
- It **skips** `initdb.exe` initialization.
- The new executables attach seamlessly to the existing database cluster, preserving 100% of historical records.

---

## 5. Architectural Verification & Sign-Off

- **Product:** PrathamOne EduOS (Coaching Institute Edition v1.0.0)
- **Architectural Directives:** SSOT Rule 001, Rule 004, Rule 009 compliant.
- **Security:** Eliminates unquoted search path vulnerabilities (CWE-428) and prevents OS drive storage exhaustion.
- **Approved by:** Jawahar R. Mallah, Product Architect (AITDL).
