---
title: "PrathamOne EduOS Desktop App Mode and Local Trusted SSL Architecture"
module: "19_RELEASES_CHANGELOG"
category: "SPECIFICATION"
document_type: "SPECIFICATION"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-20"
updated_date: "2026-11-20"
author: "Jawahar R Mallah"
organization: "Smritisys & AITDL Networks"
status: "Approved"
tags: ["desktop-app", "local-ssl", "https", "pki", "inno-setup", "hosts-mapping"]
entities: ["SecurityArchitecture", "DesktopLauncher", "RootCertificateAuthority"]
api_routes: ["/health", "/api/v1/*"]
related_modules: ["01_ARCHITECTURE", "12_RBAC_SECURITY", "13_SYSADMIN_SETTINGS"]
---

# PRATHAMONE EduOS — DESKTOP APP MODE & LOCAL TRUSTED SSL ARCHITECTURE

**Product:** PrathamOne EduOS  
**Edition:** Coaching Institute Edition  
**Baseline Version:** 1.0.0  
**Product Architect:** Jawahar R Mallah  
**Organization:** Smritisys & AITDL Networks  

---

## 1. EXECUTIVE OVERVIEW

Modern web browsers (Google Chrome, Microsoft Edge, Mozilla Firefox) display a prominent `⚠️ Not secure` warning badge whenever accessing non-localhost IP addresses or custom hostnames via unencrypted HTTP. Furthermore, standard browser windows expose URL address bars, navigation controls, bookmarks, and extensions that detract from a native, enterprise application experience.

To solve both challenges simultaneously, PrathamOne EduOS incorporates a dual-mode local security and presentation architecture:
1. **Desktop App Mode (PWA-Class Standalone Window):** Launches Google Chrome or Microsoft Edge with the `--app=` runtime flag. This suppresses the browser URL bar, navigation toolbar, extension trays, and browser warning chips, providing a borderless, branded desktop application feel with PrathamOne's custom title bar.
2. **Local PKI & Automated Windows Trusted SSL:** Bundles an internal Root Certificate Authority (`Smritisys & AITDL Networks Local Root CA`) and multi-domain Server Certificate containing Subject Alternative Names (SANs) for all local aliases. During elevated installation, Inno Setup installs the Root CA into the Windows Trusted Root Certification Authorities store via `certutil.exe -addstore -f "ROOT"`. This displays the trusted 🔒 padlock across all browser tabs without third-party internet dependencies.

---

## 2. MULTI-DOMAIN SAN MATRIX & LOCAL HOST RESOLUTION

To guarantee seamless access with or without ports and across custom institute branding, the local server certificate and Windows `hosts` configuration resolve all of the following:

| Hostname / URL Pattern | Protocol | Port | Windows Resolution | SSL SAN Covered |
| :--- | :--- | :--- | :--- | :--- |
| `https://{classesname}:2026` | HTTPS | 2026 | `drivers/etc/hosts` | ✅ Yes |
| `https://{classesname}` | HTTPS | 443 -> 2026 | Portproxy (Port 443) | ✅ Yes |
| `http://{classesname}` | HTTP | 80 -> 2026 | Portproxy (Port 80) | N/A |
| `https://classesname:2026` | HTTPS | 2026 | Universal Alias in `hosts` | ✅ Yes |
| `https://classesname` | HTTPS | 443 -> 2026 | Portproxy (Port 443) | ✅ Yes |
| `https://prathamone:2026` | HTTPS | 2026 | Universal Alias in `hosts` | ✅ Yes |
| `https://prathamone` | HTTPS | 443 -> 2026 | Portproxy (Port 443) | ✅ Yes |
| `https://localhost:2026` | HTTPS | 2026 | Loopback | ✅ Yes |
| `https://127.0.0.1:2026` | HTTPS | 2026 | Loopback | ✅ Yes (IP SAN) |

---

## 3. ZERO-INTERACTION INSTALLATION & TRUST REGISTRATION

During administrative setup, the Inno Setup engine executes the following non-interactive provisioning steps:

```pascal
; Register Smritisys & AITDL Local Root CA into Windows Trusted Root Store
Filename: "certutil.exe"; Parameters: "-addstore -f ""ROOT"" ""{app}\assets\Smritisys_AITDL_Local_CA.cer"""; Flags: runhidden; StatusMsg: "Configuring local trusted SSL security certificate..."

; Setup port 80 and port 443 kernel proxy for direct access without port numbers
Filename: "netsh"; Parameters: "interface portproxy add v4tov4 listenport=80 listenaddress=127.0.0.1 connectport=2026 connectaddress=127.0.0.1"; Flags: runhidden
Filename: "netsh"; Parameters: "interface portproxy add v4tov4 listenport=443 listenaddress=127.0.0.1 connectport=2026 connectaddress=127.0.0.1"; Flags: runhidden
```

Upon uninstallation, clean teardown is guaranteed:
```pascal
Filename: "certutil.exe"; Parameters: "-delstore ""ROOT"" ""Smritisys & AITDL Networks Local Root CA"""; Flags: runhidden; RunOnceId: "RemoveRootCA"
Filename: "netsh"; Parameters: "interface portproxy delete v4tov4 listenport=80 listenaddress=127.0.0.1"; Flags: runhidden; RunOnceId: "RemovePortproxy80"
Filename: "netsh"; Parameters: "interface portproxy delete v4tov4 listenport=443 listenaddress=127.0.0.1"; Flags: runhidden; RunOnceId: "RemovePortproxy443"
```

---

## 4. LAUNCHER INTELLIGENCE & CONFIGURABLE PRESENTATION MODES

`scripts/windows_launcher.py` inspects `assets/` on startup. If certificate files are present, it:
1. Passes `--ssl-certfile` and `--ssl-keyfile` to the Uvicorn engine.
2. Uses an internal unverified SSL context (`ssl._create_unverified_context()`) for loopback health polling so local startup never blocks on OS truststore propagation delays.
3. Evaluates the user's preferred presentation mode via `get_launch_mode()`:
   - **Default:** Standard Web Browser (`mode == 'browser'`) via `webbrowser.open(app_url)`.
   - **Alternative:** Dedicated Desktop Window (`mode == 'app'` or `'pwa'`) via `chrome.exe --app=https://{slug}:{port}/` or `msedge.exe --app=https://{slug}:{port}/`.

---

## 5. BROWSER-FIRST GOVERNANCE & SETTINGS WORKSPACE INTEGRATION

To satisfy requirements where coaching institute administrators prefer standard web browser tabs (with address bars, bookmarks, multi-tab coaching workflows, and native browser extensions) by default, while still allowing a standalone app experience:

### 5.1 Resolution Hierarchy
1. **Command Line Flags:**
   - `PrathamOne.exe --browser`: Explicitly launches in standard browser tabs.
   - `PrathamOne.exe --app`: Explicitly launches in standalone PWA app window.
2. **Persistent Configuration File (`launcher_config.json`):**
   ```json
   {
     "launch_mode": "browser"
   }
   ```
3. **Environment Settings (`.env`):**
   `DESKTOP_LAUNCH_MODE=browser` or `LAUNCH_MODE=app`.
4. **Authoritative Default:**
   Standard Web Browser (Default).

### 5.2 Settings Workspace (`Settings.tsx` & `settings.py`)
In the administrative **System Parameters** panel:
- Admins can select between **Standard Web Browser (Default)** and **Dedicated Desktop Window (PWA Mode)** in Edit Mode.
- Saving automatically writes the preference to `institution_settings` (category: `system`, key: `desktop_launch_mode`) and immediately synchronizes `launcher_config.json` on disk for subsequent desktop launches.

### 5.3 Desktop & Start Menu Shortcuts
- **Desktop Shortcut:** "PrathamOne EduOS" -> Executes `PrathamOne.exe` (respects configured launch mode, default is browser).
- **Start Menu Shortcuts:**
  - `PrathamOne EduOS (Web Browser Mode)` -> `PrathamOne.exe --browser`
  - `PrathamOne EduOS (Desktop App Mode)` -> `PrathamOne.exe --app`
  - `PrathamOne EduOS (Web Portal HTTPS)` -> `https://prathamone:2026`
