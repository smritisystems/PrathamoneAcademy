# PrathamOne EduOS — Build, Release & Installer Governance Policy

**Document ID:** `BUILD-INSTALLER-POLICY-V1`  
**Product:** PrathamOne EduOS — Coaching Institute Edition  
**Baseline Version:** `1.0.0`  
**Organization:** Smritisys & AITDL Networks  
**Product Architect:** Jawahar R Mallah  
**Status:** MANDATORY — All Windows Desktop, Release, and CI Workflows  

---

## 1. Windows Security & Networking

1. **Loopback-Only Binding Default (`127.0.0.1`):**
   - Standalone desktop backend launches (`prathamone_backend.exe` spawned by `PrathamOne.exe`) MUST bind strictly to `127.0.0.1` by default (`--host 127.0.0.1`), never exposing `0.0.0.0` unless explicitly enabled by administrator LAN policy (`PRATHAM_ALLOW_LAN_ACCESS=true`).
2. **Dynamic Port Fallback:**
   - Backend port binding defaults to `2026` and must scan fallback ports cleanly (`2026..2051`) if already occupied, with identical port-discovery range in both `PrathamOneLauncher.cs` and `backend/run_server.py`.
3. **Mandatory `PRATHAM_DESKTOP_TOKEN` IPC Authentication:**
   - Every desktop launch must generate a cryptographically random `PRATHAM_DESKTOP_TOKEN` (`RNGCryptoServiceProvider`), inject it into backend env, WebView2 cookies (`pratham_client_token`), and request headers (`X-Pratham-Client-Token`). Direct unauthenticated loopback access must return `HTTP 403`.
4. **User-Writable Data Separation (No `Program Files` Mutable Writes):**
   - Executables, runtime DLLs, and immutable frontend assets live in `{app}`.
   - Mutable application state (`data\` PostgreSQL cluster, `backups\`, `logs\` / `launcher.log`, `backend_server.log`, `WebView2Profile`, and `.env` / secrets) MUST reside in user-writable storage (`%LOCALAPPDATA%\PrathamOneEduOS` or `{commonappdata}\PrathamOneEduOS` when `{app}` resides under protected `Program Files`), never relying on `Users:Full` ACL loosening inside `Program Files`.
5. **Authenticode Code Signing Hooks:**
   - Release builds MUST support Authenticode SHA-256 signing hooks (`signtool.exe` via `PRATHAM_SIGN_CERT_PFX` / timestamp server) across **all four** shipping executables:
     1. `PrathamOne.exe`
     2. `StopPrathamOne.exe`
     3. `prathamone_backend.exe`
     4. `PrathamOne_EduOS_Setup.exe`

---

## 2. Data Protection & Safe Lifecycle (DPDP Compliance)

1. **Local Credential & Secret Protection:**
   - Randomly generated 64-char `SECRET_KEY`, `JWT` signing secrets, and institutional credentials in `.env` MUST never be overwritten or leaked into build logs, crash dumps, or setup artifacts.
   - Temporary bootstrap passwords (e.g., `setup_config.json`) must not remain in plaintext on disk after initial database seeding (`bootstrap_only=True`).
2. **Mandatory Pre-Upgrade `pg_dump` Backup Before Alembic Migrations:**
   - Before replacing binaries or executing `alembic upgrade head` during an in-place upgrade, the installer/bootstrap pipeline MUST verify and write a logical PostgreSQL `pg_dump -Fc` snapshot into `backups\` (in addition to `data\` filesystem safety preservation), using the dynamically detected cluster port (`POSTGRES_PORT` / `postmaster.opts`, e.g., `5432` or `5433`).
3. **Non-Destructive Reinstall / In-Place Upgrade Guarantee:**
   - Existing `{app}\data` (or external data root) and `.env` MUST NEVER be overwritten or re-initialized (`NeedsDbInit` / `initdb.exe` skipped when `PG_VERSION` exists; onboarding wizard skipped).
4. **Explicit User Confirmation Before Deleting `data\` on Uninstall:**
   - Uninstalling PrathamOne EduOS MUST preserve institutional `data\` and backups by default. Deletion of local student, ledger, and financial records requires explicit affirmative confirmation from the user (never silently wiped) plus an optional `pg_dump` export prompt (safely bypassed during `/SILENT` / `/VERYSILENT` unattended runs).

---

## 3. Branding & Asset Pipeline

1. **Single Source of Truth (`frontend/public/artwork/25112026`):**
   - All Windows desktop branding (`.ico`, wizard graphics, tray/title icons, and splash animation) MUST be sourced exclusively from `F:\PrashantAcademy\frontend\public\artwork\25112026` via `scripts/prepare_installer_artwork.py`.
2. **Automated Multi-Resolution Icons & Wizard Bitmaps:**
   - `app_icon.ico` MUST contain `[16x16, 32x32, 48x48, 64x64, 128x128, 256x256]` frames and be embedded in `PrathamOne.exe`, `StopPrathamOne.exe`, and `PrathamOne_EduOS_Setup.exe`.
   - `wizard_large.bmp` (`164x314`, 24-bit RGB) and `wizard_small.bmp` (`160x58`, 24-bit RGB) must be regenerated cleanly during release packaging.
3. **Splash Animation Budget (`< 3 MB`):**
   - `Splash.gif` bundled into `{app}\assets\Splash.gif` MUST remain strictly under `3 MB` (`3,145,728` bytes) to prevent slow installer extraction or GDI+ memory spikes.
4. **Commercial License & Hygiene Verification:**
   - Every bundled third-party runtime/asset and proprietary `LICENSE` notice must comply with `installer/release_whitelist.json` (`check_release_hygiene.py`). Dev docs, tutorials, source tests, and `.log` files must never enter release packages.

---

## 4. Deterministic Versioning & Silent Install

1. **Synchronized Version Metadata:**
   - Version numbers MUST match identically across:
     - `package.json` (`version`)
     - `backend/app/core/config.py` (`VERSION`)
     - `installer/prathamone_setup.iss` (`MyAppVersion` / `MyAppFileVersion`)
     - `installer/src/PrathamOneLauncher.cs` & `StopPrathamOne.cs` (`AssemblyVersion` / `AssemblyFileVersion` + UI labels)
     - Backend `/health` response (`product`, `version`, `alembic_head`) and single active Alembic head revision.
2. **Silent Install & Uninstall Compatibility:**
   - `prathamone_setup.iss` MUST execute `/SILENT` and `/VERYSILENT` installs and uninstalls cleanly without modal UI hangs (`skipifsilent`, `not WizardSilent` / `not UninstallSilent` guards around dialogs), while preserving existing databases and avoiding insecure hardcoded production admin passwords where possible.
