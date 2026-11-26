---
title: "PrathamOne EduOS v1.182.0 — 423 Route Mapping, White Screen on Save, Fresh DB Schema & Desktop EXE Logging Remediation Report"
module: "20_AUDITS_COMPLIANCE"
category: "REMEDIATION-REPORT"
document_type: "REPORT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.182.0"
doc_version: "1.2"
created_date: "2026-11-26"
updated_date: "2026-11-26"
author: "Jawahar R Mallah"
organization: "Smritisys & AITDL Networks"
status: "Approved"
tags: ["423-locked", "white-screen", "react-31", "license-routes", "alembic-057", "desktop-exe", "logging", "dpdp", "30-day-trial", "authenticode", "demo-modes"]
entities: ["TeacherAssignment", "StudentCreate", "SafeToaster", "LicenseRouter", "MainWindow", "RotatingFileHandler", "MachineTrialAnchor"]
api_routes: ["/api/v1/catalogue/overview", "/api/v1/planning/tasks/summary", "/api/v1/chat/rooms", "/api/v1/security/device-binding/settings", "/api/v1/video-studio/templates", "/api/v1/finance/expenses", "/api/v1/students/", "/api/v1/staff/assignments/list"]
related_modules: ["04_STUDENT_MANAGEMENT", "05_TEACHER_MANAGEMENT", "12_RBAC_SECURITY", "13_SYSADMIN_SETTINGS"]
---

# PRATHAMONE EduOS (Coaching Institute Edition)
## 423 Route Policy Mapping, Save White Screen (`React #31`) & Fresh DB Schema Remediation Report

**Product:** PrathamOne EduOS — Coaching Institute Edition (`v1.182.0`)  
**Product Architect:** Jawahar R Mallah  
**Organization:** Smritisys & AITDL Networks  
**Audit Date:** 2026-11-26  
**Status:** Verified & Approved  

---

## 1. Root-Cause Findings & Remediations

### 1.1 Blank White Screen on Save (`Minified React error #31` / Empty `#root`)
- **Symptoms:** Submitting Student Admission (`/students/admission`) inside the compiled desktop executable (`PrathamOne.exe` / `prathamone_backend.exe`) caused the WebView2 viewport to go completely blank white.
- **Root Causes:**
  1. `Students.tsx` (`admissionForm`) omitted `admission_date` and sent flat guardian fields instead of `guardian`, while backend `StudentCreate` in `backend/app/api/v1/endpoints/students.py` required `admission_date: date` with no default — triggering HTTP `422 Unprocessable Entity` with a Pydantic error array (`[{type, loc, msg, input}]`) whenever a request passed Evaluation Mode (e.g., in Training Mode or on activated licenses).
  2. Mutation handlers across the frontend forwarded `err?.response?.data?.detail` directly to `toast.error(...)`, and `<Toaster />` in `frontend/src/main.tsx` sat outside `<ErrorBoundary>`. Rendering a Pydantic error array inside `react-hot-toast` threw React error `#31` (*Objects are not valid as a React child*), unmounting the entire React root.
- **Fixes Applied:**
  - Added `formatApiErrorDetail(...)` and `extractApiErrorMessage(...)` in [errorTaxonomy.ts](file:///f:/PrashantAcademy/frontend/src/utils/errorTaxonomy.ts) to safely coerce FastAPI validation arrays/objects and HTTP `423` messages into readable strings.
  - Created crash-proof [SafeToaster.tsx](file:///f:/PrashantAcademy/frontend/src/components/common/SafeToaster.tsx) with an internal `ToastBoundary` and `sanitizeToastMessage(...)`, wired in [main.tsx](file:///f:/PrashantAcademy/frontend/src/main.tsx) and exported via [index.ts](file:///f:/PrashantAcademy/frontend/src/components/common/index.ts).
  - Updated [Students.tsx](file:///f:/PrashantAcademy/frontend/src/pages/Students.tsx) (`admission_date` field + structured `guardian` payload + safe error message coercion), [students.py](file:///f:/PrashantAcademy/backend/app/api/v1/endpoints/students.py) (`admission_date: date = Field(default_factory=date.today)`), and error handlers in [Settings.tsx](file:///f:/PrashantAcademy/frontend/src/pages/Settings.tsx), [AddStudent.tsx](file:///f:/PrashantAcademy/frontend/src/pages/AddStudent.tsx), [Fees.tsx](file:///f:/PrashantAcademy/frontend/src/pages/Fees.tsx), [AcademicWorkspace.tsx](file:///f:/PrashantAcademy/frontend/src/pages/AcademicWorkspace.tsx), [TrainingManagement.tsx](file:///f:/PrashantAcademy/frontend/src/pages/TrainingManagement.tsx), [NavigationSettingsPanel.tsx](file:///f:/PrashantAcademy/frontend/src/components/settings/NavigationSettingsPanel.tsx), and [MenuCustomizerModal.tsx](file:///f:/PrashantAcademy/frontend/src/components/navigation/MenuCustomizerModal.tsx).

### 1.2 HTTP `423 Locked` Errors in Compiled Desktop App
- **Root Causes:**
  1. **Unconfigured Route Policies:** 6 routers mounted in `router.py` (`/catalogue`, `/planning`, `/chat`, `/security/device-binding`, `/video-studio`, `/finance`) were absent from `_ROUTE_MODULES` in [license.py](file:///f:/PrashantAcademy/backend/app/api/v1/endpoints/license.py), causing fail-closed `423` errors on all requests (`GET /api/v1/catalogue/overview`, etc.) regardless of license activation.
  2. **Evaluation Mode Enforcement:** Installed `.env` (`%LOCALAPPDATA%\PrathamOneEduOS\.env`) runs `LICENSE_ENFORCEMENT_STAGE=enforced` on an unactivated embedded DB (`5433`), which intentionally blocks production write mutations (`POST`/`PUT`/`PATCH`/`DELETE`) until activated or switched to `TRAINING` mode.
  3. **Training Switch Ordering:** [EnvironmentSwitchModal.tsx](file:///f:/PrashantAcademy/frontend/src/components/common/EnvironmentSwitchModal.tsx) previously called `trainingApi.pingSession()` before switching `useEnvironmentStore` to `'TRAINING'`, firing a pre-switch `423`.
- **Fixes Applied:**
  - Mapped all 6 missing routers in `_ROUTE_MODULES` (`/catalogue` -> `academic_management`, `/planning` -> `planning`, `/chat` -> `communication`, `/security/device-binding` -> `administration`, `/video-studio` -> `video_studio`, `/finance` -> `accounting`).
  - Updated `EnvironmentSwitchModal.tsx` to activate `TRAINING` environment state prior to calling `pingSession()`.

### 1.3 Fresh Desktop DB (`5433`) Schema Drift on `teacher_assignments`
- **Root Cause:** Migration `013_repair_staff_role_assignments.py` created `teacher_assignments` without `board_id`, `standard_id`, `weekly_hours`, `is_class_teacher`, and `notes`, causing `UndefinedColumnError` (HTTP `500`) on `/api/v1/staff/assignments/list` and `/api/v1/staff/teachers/dashboard` on fresh desktop installs.
- **Fix Applied:** Added idempotent Alembic migration [057_repair_teacher_assignments.py](file:///f:/PrashantAcademy/backend/alembic/versions/057_repair_teacher_assignments.py) (`<=32` char revision ID) and updated Alembic head metadata in [main.py](file:///f:/PrashantAcademy/backend/app/main.py) and [run_server.py](file:///f:/PrashantAcademy/backend/run_server.py).

### 1.4 Desktop EXE Rotating Logs, WebView2 Error Bridge & Stray Root Log Consolidation
- **Root Causes:**
  1. Frozen `prathamone_backend.exe` lacked resilient rotating file logging with Win32 copy-truncate fallback and unconditional OS FD `1`/`2` redirection, risking lost tracebacks when running detached under the desktop shell.
  2. Client-side exceptions inside WebView2 (`window.onerror`, `unhandledrejection`, `ErrorBoundary`, and HTTP `>= 500` / `423` API failures) had no persistent host-side log sink.
  3. Stray 0-byte `backend_server.log` / `launcher.log` files could remain in the installation or root folder alongside `<dataRoot>\logs\`.
- **Fixes Applied:**
  - **Backend Rotating File Logging (`backend/run_server.py`):** Added `_WindowsSafeRotatingFileHandler` (`5 MB` × `5` backups with Windows `PermissionError` copy-truncate fallback), unconditional `sys.stdout`/`sys.stderr` redirection plus OS FD `1`/`2` `os.dup2` & `faulthandler.enable` in frozen mode inside `_ensure_stdio_streams`, `_configure_rotating_logging` across root / `uvicorn` / `uvicorn.error` / `uvicorn.access` / `fastapi` / `alembic` / `app` plus `sys.excepthook` & `threading.excepthook`, and `_clean_stray_root_logs`.
  - **Frontend -> WebView2 DPDP Bridge (`frontend/src/utils/errorTaxonomy.ts`, `ErrorBoundary.tsx`, `main.tsx`):** Added `redactSensitiveText`, endpoint scrubbing in `createSafeDiagnostics`, and `forwardDiagnosticsToDesktopHost` + `installGlobalErrorBridge()` transmitting sanitized `PRATHAMONE_FRONTEND_ERROR` JSON packets via `window.chrome?.webview?.postMessage(...)`.
  - **Launcher Log Sink & Consolidation (`installer/src/PrathamOneLauncher.cs`, `scripts/windows_launcher.py`):** Enabled `IsWebMessageEnabled = true`, added loopback-origin-checked `OnCoreWebViewMessageReceived`, secondary DPDP scrubbing (`ScrubFrontendErrorJson` redacting `Bearer` tokens, JWTs, and 12-digit Aadhaar IDs), `AppendRotatingLog` (`5 MB` × `5` backups for `launcher.log`; `5 MB` × `3` backups for `frontend_errors.log`), `CleanStrayRootLogs`, and moved standalone launcher `backend_server.log` into `logs/backend_server.log`.

### 1.5 Authenticode Signing Across All Release Binaries
- **Root Cause:** Without `PRATHAM_SIGN_CERT_PFX` and `signtool.exe`, `build_release.py` skipped Authenticode signing, leaving binaries `NotSigned` (triggering `"Publisher: Unknown"` in Windows UAC).
- **Fixes Applied:** Added `_sign_with_cert_thumbprint` in [build_release.py](file:///f:/PrashantAcademy/build_staging/build_release.py) supporting `PRATHAM_SIGN_CERT_THUMBPRINT` via PowerShell `Set-AuthenticodeSignature` + DigiCert timestamping + 6-attempt transient file-lock retry (for Windows Defender post-`ISCC` scans), and also wired `--skip-gate2` backend binary signing. Signed all 4 release executables (`prathamone_backend.exe`, `PrathamOne.exe`, `StopPrathamOne.exe`, `PrathamOne_EduOS_Setup.exe`) with `CN=Smritisys & AITDL Networks` (`C2920B24F87AE380394821DF20517D953D531F71`) and exported public [Smritisys_AITDL_CodeSigning.cer](file:///f:/PrashantAcademy/dist/Smritisys_AITDL_CodeSigning.cer) for local machine trust testing.

### 1.6 30-Day Hardware-Locked Trial & 3-Mode Demo Sandbox
- **30-Day Unique-Machine Trial (`license_service.py`, `license.py`, UI modals/banners):** Added opt-in `POST /api/v1/license/trial/start` issuing a `30`-day trial strictly node-locked to `PRATHAM-XXXX-XXXX-XXXX-XXXX`, redundantly anchored across PostgreSQL (`license.trial_artifact`), Windows `HKCU\Software\Smritisys\PrathamOneEduOS\Trial`, and filesystem `.trial_*.dat` stores with HMAC-SHA256 verification and clock-rollback detection. Enforces capacity bounds (`100` students, `25` staff, `10` seats) via `enforce_lease_quota` across [students.py](file:///f:/PrashantAcademy/backend/app/api/v1/endpoints/students.py), [leads.py](file:///f:/PrashantAcademy/backend/app/api/v1/endpoints/leads.py), [staff.py](file:///f:/PrashantAcademy/backend/app/api/v1/endpoints/staff.py), [users.py](file:///f:/PrashantAcademy/backend/app/api/v1/endpoints/users.py), and [import_export.py](file:///f:/PrashantAcademy/backend/app/api/v1/endpoints/import_export.py), automatically reverting to read-only Evaluation Mode after Day 30 while preserving all entered data.
- **3-Mode Demo Sandbox (`training_dataset_service.py`, `training.py`, `TrainingManagement.tsx`, `EnvironmentSwitchModal.tsx`):** Added `mirror_live` (clones local live institute setup, students, batches, fee structures, invoices, and receipts into isolated `PA001-DEMO`), `baseline` (standard 20-lead / 5-student sample), and `clean_empty` (`0` students & `0` leads with batches and fee structures preserved), plus automatic first-entry initialization in `/training/session/ping` and dependency-ordered cleanup.

---

## 2. Verification Summary
- **Documentation & Repository Policy:** `docs_manager.py reindex` + `validate`, `python scripts/manage_headers.py check` (`814/814`), `python installer/verify_release_policy.py --strict` (`24 passed, 0 policy gap(s)`), and `python scripts/check_release_hygiene.py` (`241` files in `frontend/dist`, `63.42 MB`).
- **Backend Verification (Ephemeral PostgreSQL `5441`):** `45 passed` across `test_license_service.py`, `test_license_security_hardening.py` (trial anchor DB-wipe persistence, clock-rollback lock, DB-clone node-lock rejection, student/staff cap enforcement), `test_staff_mutation_security.py`, `test_global_training_environment.py` (clean-empty & mirror-live demo modes), and `test_student_lifecycle.py` (including `test_complete_student_closed_loop_from_admission_to_full_payment`: 30-day trial start -> student admission -> attendance -> examination marks -> fee assignment -> invoice -> partial/full payments -> `paid` status & `0.0` balance), plus `4 passed` in `test_run_server_logging.py`.
- **Frontend Verification:** `npx tsc --noEmit`, `npm run build`, and `48 passed` across `LicenseActivation.test.tsx`, `LicenseDetailsModal.test.tsx`, `TrainingEnvironment.test.tsx`, and `ErrorHandling.test.tsx`.
- **Full Signed Release Build & ADR-009 Gate 4 (`build_release.py --skip-frontend`):** Compiled `46` Cython `.pyd` modules (`571.7s`), built `prathamone_backend.exe` (`2409.5s`), packaged & Authenticode-signed all 4 binaries (`PrathamOne_EduOS_Setup.exe` `94.58 MB` with DigiCert SHA-256 timestamping), and passed ADR-009 Gate 4 (`APPROVED — ALL 4 ADR-009 CRITERIA SATISFIED`, `/health` in `4.56s`, `/openapi.json` `HTTP 200`).
