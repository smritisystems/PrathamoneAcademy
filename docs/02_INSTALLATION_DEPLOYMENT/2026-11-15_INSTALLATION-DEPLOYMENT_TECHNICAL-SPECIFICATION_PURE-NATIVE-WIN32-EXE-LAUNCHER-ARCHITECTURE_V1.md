---
title: "PrathamOne EduOS — 100% Native Win32 Executable Launcher Specification"
module: "02_INSTALLATION_DEPLOYMENT"
category: "TECHNICAL-SPECIFICATION"
document_type: "SPECIFICATION"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-15"
updated_date: "2026-11-15"
author: "Jawahar R Mallah"
organization: "Smritisys & AITDL Networks"
status: "Approved"
tags: ["native-exe", "win32", "winexe", "system-tray", "zero-console", "desktop-installer"]
entities: ["PrathamOneExe", "StopPrathamOneExe", "SystemTray", "InnoSetup"]
api_routes: ["/health"]
related_modules: ["01_ARCHITECTURE", "02_INSTALLATION_DEPLOYMENT"]
---

# PrathamOne EduOS — 100% Native Win32 Executable Launcher Specification

## 1. Executive Summary & Directive

Modern enterprise desktop users expect consumer-grade software behavior:
- **Zero Console / DOS Prompts:** No black command windows (`cmd.exe`) flashing, lingering, or closing on double-click.
- **Zero Scripting Overhead:** No dependencies on `powershell.exe` execution policies or shell environment configurations.
- **100% Native Binary Experience:** Execution via genuine Windows PE `.exe` files (`PrathamOne.exe`) carrying official brand icons, metadata, and taskbar integration.
- **System Tray Notification Engine:** A background status presence in the Windows taskbar tray allowing one-click access, LAN URL sharing, and graceful shutdown.

This specification details the architecture of `PrathamOne.exe` and `StopPrathamOne.exe`, compiled using Microsoft's native C# Win32 compiler (`csc.exe /target:winexe`).

---

## 2. Architectural Comparison: Script-Based vs 100% Native EXE

| Architectural Metric | Legacy Script Launcher (`.bat` / `.ps1`) | 100% Native Win32 Executable (`PrathamOne.exe`) |
| :--- | :--- | :--- |
| **Windows Subsystem** | `IMAGE_SUBSYSTEM_WINDOWS_CUI` (Console) | `IMAGE_SUBSYSTEM_WINDOWS_GUI` (GUI / Windowless) |
| **Publisher Branding** | Unknown / Script | Smritisys & AITDL Networks |
| **Visual Artifacts** | Flashes black DOS prompt window | **Zero visual console artifacts** |
| **Windows Taskbar & Tray** | Shows generic `cmd.exe` window | High-resolution brand icon in System Tray |
| **Error Handling** | Prints text to console and exits | Native Windows `MessageBox` dialogs with `[OK]` button |
| **Single-Instance Safety** | Spawns multiple instances if double-clicked | Kernel-level Mutex (`PrathamOneEduOS_SingleInstance_Mutex_2026`) |
| **Execution Policy Gate** | Blocked by restrictive PowerShell ExecutionPolicy | Native Win32 PE binary; unaffected by script policies |
| **Shutdown Mechanics** | Manual `Ctrl+C` or task manager | Right-click System Tray ➔ Exit, or `StopPrathamOne.exe` |

---

## 3. Native Executable Components

### 3.1 `PrathamOne.exe` (Primary Application Launcher)
- **Source:** `installer/src/PrathamOneLauncher.cs`
- **Compiler:** `C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe`
- **Compiler Flags:** `/target:winexe /optimize+ /win32icon:installer\assets\app_icon.ico`
- **Key Capabilities:**
  1. **Single-Instance Enforcement:** Uses a named system Mutex. If the user double-clicks the desktop icon while the application is already running, it brings the browser to the foreground and exits instantly without starting duplicate processes.
  2. **Windowless Process Management:** Spawns `pythonw.exe` and `pg_ctl.exe` with `CreateNoWindow = true` and `WindowStyle = ProcessWindowStyle.Hidden`.
  3. **Healthcheck & Automatic Browser Trigger:** Polls `http://127.0.0.1:8000/health` (and failover port `8001`). Upon receiving `HTTP 200 OK`, immediately launches the default browser to the web app.
  4. **System Tray (`NotifyIcon`):** Sits in the notification tray next to the Windows clock with a custom context menu:
     - 🚀 Open PrathamOne EduOS
     - 📋 Copy LAN Network URL
     - ❌ Exit

### 3.2 `StopPrathamOne.exe` (Clean Shutdown Engine)
- **Source:** `installer/src/StopPrathamOne.cs`
- **Function:** Safely halts all running `PrathamOne.exe` and `pythonw.exe` backend processes, sends `pg_ctl.exe stop -m fast` to embedded PostgreSQL, and displays a confirmation notification.

---

## 4. Inno Setup Integration

In `installer/prathamone_setup.iss`:
- `#define MyAppExeName "PrathamOne.exe"`
- Desktop shortcut points directly to `{app}\PrathamOne.exe`.
- Post-install "Finish" action directly executes `PrathamOne.exe`.
- Uninstaller automatically invokes `StopPrathamOne.exe` prior to removing files.

---

## 5. Verification & Compliance

1. **Header Verification:** `python scripts/manage_headers.py check` reports 624/624 files compliant (100%).
2. **Docs Indexing:** Verified via `python tools/docs_manager.py validate` (0 blocking errors, 0 warnings).
