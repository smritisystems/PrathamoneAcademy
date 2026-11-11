---
title: "Housekeeping Module & Automated Database Backup / Restore Governance Feature Report"
module: "13_SYSADMIN_SETTINGS"
category: "FEATURE-REPORT"
document_type: "REPORT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-11"
updated_date: "2026-11-11"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["housekeeping", "database-backup", "restore-drill", "pg-dump", "gfs-retention", "vacuum", "ssot", "rule-010"]
entities: ["InstitutionSetting", "SettingAuditLog", "AuditLog"]
api_routes:
  [
    "/api/v1/housekeeping/overview",
    "/api/v1/housekeeping/backups",
    "/api/v1/housekeeping/backups/{filename}/verify",
    "/api/v1/housekeeping/backups/{filename}/download",
    "/api/v1/housekeeping/backups/upload",
    "/api/v1/housekeeping/backups/prune",
    "/api/v1/housekeeping/restore/drill",
    "/api/v1/housekeeping/restore",
    "/api/v1/housekeeping/maintenance/vacuum",
    "/api/v1/housekeeping/maintenance/reconcile",
    "/api/v1/housekeeping/policy",
    "/api/v1/housekeeping/history",
  ]
related_modules: ["12_RBAC_SECURITY", "13_SYSADMIN_SETTINGS", "16_DATABASE_API", "10_FINANCE_ACCOUNTING"]
---

# HOUSEKEEPING MODULE & AUTOMATED DATABASE BACKUP / RESTORE GOVERNANCE REPORT

**Product:** PrathamOne EduOS — Coaching Institute Edition  
**Baseline Version:** 1.0.0  
**Product Architect:** Jawahar R. Mallah  
**Organization:** AITDL — AI Technology & Development Lab  
**Institution:** Prashant Academy Coaching Institute  
**Policy Alignment:** SSOT Rules 001–011 & Rule 010 Global View-First Edit Mode Governance  

---

## 1. EXECUTIVE SUMMARY

Implemented the **Housekeeping** module (`Housekeeping` menu and workspace under `/housekeeping`) combining **both**:

1. **Automated CLI & Host Scheduler Utility (`scripts/db_backup.py`)** supporting PostgreSQL 16 compressed backups (`pg_dump -Fc -Z 6`) and plain SQL (`-Fp`), SHA-256 + `pg_restore --list` verification, GFS retention pruning, non-destructive sandbox restore drills into `prashant_academy_test`, guarded production restores, and Windows Task Scheduler (`schtasks`) / Linux cron registration.
2. **In-App Housekeeping Backend & Frontend Workspace** providing live database telemetry, on-demand verified backups, `.dump`/`.sql` upload & verification, GFS pruning, sandbox restore drills, guarded live restoration with automatic pre-restore safety snapshot, PostgreSQL `VACUUM (ANALYZE)`, live SSOT financial ledger parity verification via `FinancialGovernanceService.reconcile_financial_ledgers`, and persisted policy management in `InstitutionSetting` (`category='housekeeping'`).

Both surfaces read and maintain one shared archive catalog across `backups/` and legacy `data/backups/`, with `.sha256`, `.meta.json`, and `backups/housekeeping_history.jsonl` persisted on mounted storage so restore history remains intact even across full database replacement.

---

## 2. ARCHITECTURE & GOVERNANCE HIGHLIGHTS

### 2.1 SSOT & Data Persistence Alignment
- **Zero Duplicate Settings Tables (Rule 001–009):** Retention rules (`backup_frequency`, `backup_time`, `backup_format`, `backup_destination`, `offsite_mirror_path`, `retain_daily`, `retain_weekly`, `retain_monthly`, `auto_vacuum_enabled`, `log_retention_days`) and latest operation metadata persist in `InstitutionSetting` (`category='housekeeping'`) with `SettingAuditLog` change history and `AuditLog` security entries.
- **Dynamic Settings Synchronization:** Extended `GET /api/v1/settings/all` in `backend/app/api/v1/endpoints/settings.py` to enrich `maintenance.last_backup_date`, `maintenance.backup_status`, `maintenance.last_backup_file`, `integrations.backup_destination`, and `integrations.backup_frequency` dynamically from `HousekeepingService.list_backups()` and `housekeeping` settings instead of static hardcoded defaults.
- **Rule 010 View-First Edit Mode:** All mutations in [Housekeeping.tsx](file:///f:/PrashantAcademy/frontend/src/pages/Housekeeping.tsx) are gated behind `scope="system:housekeeping"`, `<EditModeBar />`, and `<LockedButton />`.
- **RBAC Enforcement:** All backend endpoints require `_require_housekeeping_access` (`superadmin`, `admin`, `sysadmin`, or `system:housekeeping` permission), verified via 403 checks against `teacher`, `student`, and `accountant` roles.
- **Guarded Production Restore:** Live restore requires exact confirmation phrase `RESTORE PRASHANT_ACADEMY`, an audit reason (`>= 10` chars), integrity verification of the target archive, automatic capture of a `pre_restore` safety `.dump`, clean SQLAlchemy pool disposal, `alembic upgrade head`, `AuditLog` insertion, and post-restore SSOT financial reconciliation.

---

## 3. DELIVERED FILES & API ENDPOINTS

### 3.1 Infrastructure & CLI Automation
- `backend/Dockerfile` — Added `postgresql-client` (Debian Trixie installs `postgresql-client-17` (`17.11`)).
- `docker-compose.yml` — Mounted `./backups:/app/backups` and `./data/backups:/app/data/backups` into `backend`.
- `scripts/db_backup.py` — Host CLI & OS scheduler tool (`backup`, `verify`, `list`, `prune`, `drill`, `restore`, `install-schedule`).

### 3.2 Backend Service & Router
- `backend/app/services/housekeeping_service.py` — `HousekeepingService`, `VALID_FILENAME_RE`, `RESTORE_CONFIRMATION_PHRASE`, `DEFAULT_HOUSEKEEPING_POLICY`, path traversal validation, SHA-256 + TOC verification, GFS retention pruning (always preserving latest snapshot, `data/backups/`, and `<48h` `pre_restore_*` guards), sandbox drill, guarded live restore, `VACUUM (ANALYZE)`, and `pg_stat_user_tables` telemetry.
- `backend/app/api/v1/endpoints/housekeeping.py` — 12 route paths / 14 HTTP operations mounted at `/api/v1/housekeeping` in `backend/app/api/v1/router.py`:
  - `GET /api/v1/housekeeping/overview`
  - `GET /api/v1/housekeeping/backups`, `POST /api/v1/housekeeping/backups`
  - `POST /api/v1/housekeeping/backups/{filename}/verify`
  - `GET /api/v1/housekeeping/backups/{filename}/download`
  - `POST /api/v1/housekeeping/backups/upload`
  - `POST /api/v1/housekeeping/backups/prune`
  - `POST /api/v1/housekeeping/restore/drill`, `POST /api/v1/housekeeping/restore`
  - `POST /api/v1/housekeeping/maintenance/vacuum`, `POST /api/v1/housekeeping/maintenance/reconcile`
  - `GET /api/v1/housekeeping/policy`, `PUT /api/v1/housekeeping/policy`
  - `GET /api/v1/housekeeping/history`
- `backend/app/services/navigation_service.py` — Registered canonical module `"housekeeping"` (`HardDrive`, `system:housekeeping`, 5 sub-items) in `CANONICAL_MODULES` and default menus for `sysadmin` and `admin`.

### 3.3 Frontend Workspace & Navigation
- `frontend/src/types/index.ts` & `frontend/src/api/endpoints.ts` — Strongly typed contracts and `housekeepingApi`.
- `frontend/src/config/modules.ts`, `frontend/src/store/sidebarStore.ts`, `frontend/src/components/Sidebar.tsx`, `frontend/src/App.tsx` — Added `Housekeeping` menu with 5 collapsible sub-routes (`/housekeeping`, `/housekeeping/backups`, `/housekeeping/restore`, `/housekeeping/maintenance`, `/housekeeping/schedules`), visible exclusively to authorized Admin/SysAdmin/permitted users.
- `frontend/src/pages/Housekeeping.tsx` — 5-tab interactive Workspace with live KPI telemetry, backup catalog, SHA-256 copy & verification, `.dump`/`.sql` upload & download, GFS pruning, sandbox drill card, guarded restore modal, `VACUUM (ANALYZE)` selector, SSOT reconciliation card, operations log, and scheduler command generator.
- `frontend/src/pages/Settings.tsx` — Added direct link banner inside the Maintenance tab opening `/housekeeping`.

---

## 4. VERIFICATION & OBSERVED TEST RESULTS

All verification suites, builds, and live smoke checks ran cleanly after final edits:

| Verification Check | Command / Target | Observed Result |
|---|---|---|
| Backend Targeted Pytest | `docker compose exec -T backend pytest tests/test_housekeeping.py tests/test_navigation_engine.py tests/test_settings.py -v` | **14 passed** (including real container `pg_dump`, RBAC 403, path traversal guards, upload/download/verify, GFS prune, `VACUUM`, SSOT reconciliation variance `0.0`, dynamic settings & navigation config) |
| Full Backend Pytest Suite | `docker compose exec -T backend pytest` | **278 passed, 4 skipped** (`388.76s`) |
| TypeScript Check | `npx tsc --noEmit` (inside `frontend/`) | **0 errors** (exit code `0`) |
| Frontend Targeted Vitest | `npx vitest run src/test/Housekeeping.test.tsx src/test/Sidebar.test.tsx src/test/GlobalViewFirstSoftwareWideCoverage.test.tsx` | **3 files, 24 tests passed** |
| Full Frontend Vitest Suite | `npx vitest run --poolOptions.threads.minThreads=1 --poolOptions.threads.maxThreads=2 --testTimeout=15000` | **61 test files, 475 tests passed** |
| Docker Builds & Health | `docker compose build backend`, `docker compose build frontend`, `docker compose up -d` | Both images built cleanly (`Housekeeping-C8oKJOSv.js` bundled; `postgresql-client-17` active); `db`, `backend`, `frontend` running |
| Live CLI Backup & Sandbox Drill | `python scripts/db_backup.py backup --label initial_verified`, `verify`, `drill` | Created `prashant_academy_initial_verified_20261111_172809.dump` (`530,598` bytes, `sha_match=True`, `format_valid=True`, `objects=1120`); Sandbox restore drill succeeded into `prashant_academy_test` (`83 tables restored`) |
| Live OpenAPI Discovery | `GET http://localhost:8000/openapi.json` | Confirmed **12** `/api/v1/housekeeping/*` route paths registered live |
| Corporate Header Audit | `python scripts/manage_headers.py check` | **538 passed, 0 failed** (`100%` compliance) |
