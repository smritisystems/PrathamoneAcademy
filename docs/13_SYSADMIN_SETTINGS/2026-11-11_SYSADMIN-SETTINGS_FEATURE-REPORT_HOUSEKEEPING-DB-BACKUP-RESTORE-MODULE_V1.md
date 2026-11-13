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
updated_date: "2026-11-14"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["housekeeping", "database-backup", "restore-drill", "pg-dump", "gfs-retention", "vacuum", "ssot", "rule-010"]
entities: ["InstitutionSetting", "SettingAuditLog", "AuditLog", "CommunicationLog", "SharedDocumentToken", "UserNavigationActivity"]
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
    "/api/v1/housekeeping/storage",
    "/api/v1/housekeeping/storage/clean-orphans",
    "/api/v1/housekeeping/cleanup/preview",
    "/api/v1/housekeeping/cleanup/execute",
    "/api/v1/housekeeping/cleanup/archives/{filename}/download",
    "/api/v1/housekeeping/alerts",
    "/api/v1/housekeeping/alerts/notify",
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

1. **Automated CLI & Host Scheduler Utility (`scripts/db_backup.py`)** supporting auto-zipped **`POeduOS_YYYYMMDD_HHMMSS.edu`** packages (defaulting to compressed PostgreSQL `pg_dump -Fc -Z 6` or `plain_sql` bundled with `manifest.json` + `checksum.sha256`), legacy `.dump`/`.sql` formats, SHA-256 + `pg_restore --list` verification, GFS retention pruning, uniquely named temporary restore drills with explicit cleanup, guarded production restores, and Windows Task Scheduler (`schtasks`) / Linux cron registration.
2. **In-App Housekeeping Backend & Frontend Workspace** providing live database telemetry, on-demand verified `.edu`/`.dump`/`.sql` backups, archive upload & Zip-Slip-guarded verification, GFS pruning, isolated sandbox restore drills, guarded live restoration with automatic pre-restore `.edu` safety snapshot, PostgreSQL `VACUUM (ANALYZE)`, live SSOT financial ledger parity verification via `FinancialGovernanceService.reconcile_financial_ledgers`, and persisted policy management in `InstitutionSetting` (`category='housekeeping'`).

Both surfaces read and maintain one shared archive catalog across `backups/` and legacy `data/backups/`, with `.sha256`, `.meta.json`, and `backups/housekeeping_history.jsonl` persisted on mounted storage so restore history remains intact even across full database replacement.

---

## 2. ARCHITECTURE & GOVERNANCE HIGHLIGHTS

### 2.1 SSOT & Data Persistence Alignment
- **Zero Duplicate Settings Tables (Rule 001–009):** Retention rules (`backup_frequency`, `backup_time`, `backup_format`, `backup_destination`, `offsite_mirror_path`, `retain_daily`, `retain_weekly`, `retain_monthly`, `auto_vacuum_enabled`, `log_retention_days`) and latest operation metadata persist in `InstitutionSetting` (`category='housekeeping'`) with `SettingAuditLog` change history and `AuditLog` security entries.
- **Dynamic Settings Synchronization:** Extended `GET /api/v1/settings/all` in `backend/app/api/v1/endpoints/settings.py` to enrich `maintenance.last_backup_date`, `maintenance.backup_status`, `maintenance.last_backup_file`, `integrations.backup_destination`, and `integrations.backup_frequency` dynamically from `HousekeepingService.list_backups()` and `housekeeping` settings instead of static hardcoded defaults.
- **Rule 010 View-First Edit Mode:** Backup creation and SysAdmin operations in [Housekeeping.tsx](../../frontend/src/pages/Housekeeping.tsx) require explicit Edit Mode; SysAdmin-only controls also require a SysAdmin role.
- **RBAC Enforcement:** Institute Admins may view housekeeping telemetry, backup catalog, history, storage, policy, alerts, and cleanup previews, and may create backups. Admin-provided mirror path overrides are ignored; any configured mirror path is still validated against approved roots. Only SysAdmins may verify or download archives, upload or prune backups, restore, run maintenance, change policy, clean orphans, execute cleanup, or dispatch alerts. Non-Admin roles are denied.
- **Guarded Production Restore:** Live restore requires exact confirmation phrase `RESTORE PRASHANT_ACADEMY`, an audit reason (`>= 10` chars), integrity verification of the target archive, automatic capture of a `pre_restore` safety `POeduOS_*.edu` archive, clean SQLAlchemy pool disposal, `alembic upgrade head`, `AuditLog` insertion, and post-restore SSOT financial reconciliation.

---

## 3. DELIVERED FILES & API ENDPOINTS

### 3.1 Infrastructure & CLI Automation
- `backend/Dockerfile` — Added `postgresql-client` (Debian Trixie installs `postgresql-client-17` (`17.11`)).
- `docker-compose.yml` — Mounted `./backups:/app/backups` and `./data/backups:/app/data/backups` into `backend`.
- `scripts/db_backup.py` — Host CLI & OS scheduler tool (`backup`, `verify`, `list`, `prune`, `drill`, `restore`, `install-schedule`) defaulting to `POeduOS_YYYYMMDD_HHMMSS.edu` auto-zipped bundles.

### 3.2 Backend Service & Router
- `backend/app/services/housekeeping_service.py` — `HousekeepingService`, `VALID_FILENAME_RE` (`.edu|dump|sql`), `_extract_edu_payload` (Zip-Slip & Zip-Bomb protected extractor), `RESTORE_CONFIRMATION_PHRASE`, `DEFAULT_HOUSEKEEPING_POLICY` (`backup_format='edu'`), SHA-256 + TOC verification, GFS retention by distinct day/week/month (preserving newest snapshot, legacy `data/backups/`, and `<48h` `pre_restore` safety snapshots), unique temporary restore drills with explicit cleanup, guarded live restore, `VACUUM (ANALYZE)`, and `pg_stat_user_tables` telemetry.
- `backend/app/api/v1/endpoints/housekeeping.py` — 19 route paths / 21 HTTP operations mounted at `/api/v1/housekeeping` in `backend/app/api/v1/router.py`:
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
  - `GET /api/v1/housekeeping/storage`, `POST /api/v1/housekeeping/storage/clean-orphans`
  - `GET /api/v1/housekeeping/cleanup/preview`, `POST /api/v1/housekeeping/cleanup/execute`, `GET /api/v1/housekeeping/cleanup/archives/{filename}/download`
  - `GET /api/v1/housekeeping/alerts`, `POST /api/v1/housekeeping/alerts/notify`
- `backend/app/services/navigation_service.py` — Registered canonical module `"housekeeping"` (`HardDrive`, `system:housekeeping`, 5 sub-items) in `CANONICAL_MODULES` and default menus for `sysadmin` and `admin`.

### 3.3 Frontend Workspace & Navigation
- `frontend/src/types/index.ts` & `frontend/src/api/endpoints.ts` — Strongly typed contracts and `housekeepingApi`.
- `frontend/src/config/modules.ts`, `frontend/src/store/sidebarStore.ts`, `frontend/src/components/Sidebar.tsx`, `frontend/src/App.tsx` — Added `Housekeeping` menu with 5 collapsible sub-routes (`/housekeeping`, `/housekeeping/backups`, `/housekeeping/restore`, `/housekeeping/maintenance`, `/housekeeping/schedules`), visible exclusively to authorized Admin/SysAdmin/permitted users.
- `frontend/src/pages/Housekeeping.tsx` — 5-tab interactive Workspace with live KPI & disk telemetry, proactive health alert panel + digest dispatch, backup catalog supporting `.edu`, `.dump`, and `.sql` archives, SHA-256 verification, GFS pruning, temporary isolated sandbox drill card, guarded restore modal, `VACUUM (ANALYZE)`, SSOT reconciliation card, storage/orphan sidecar cleanup, dry-run & `.jsonl.gz` log archival retention cleanup, operations log, and scheduler command generator.
- `frontend/src/pages/Settings.tsx` — Added direct link banner inside the Maintenance tab opening `/housekeeping`.

---

## 4. VERIFICATION & OBSERVED TEST RESULTS

All verification suites, builds, and live smoke checks ran cleanly after final edits:

| Verification Check | Command / Target | Observed Result |
|---|---|---|
| Backend Targeted Pytest (Post-Extension) | `docker compose exec -T backend pytest tests/test_housekeeping.py tests/test_navigation_engine.py tests/test_settings.py -v` | **16 passed** (`test_housekeeping.py` 8/8 incl. `POeduOS_*.edu`, Zip-Slip/corrupt 400, orphan sidecar cleanup, health alerts & email digest dispatch, dry-run & `.jsonl.gz` log archival preserving recent + `WARNING`/`is_system_audit=True` rows; `test_navigation_engine.py` 4/4; `test_settings.py` 4/4) |
| Full Backend Pytest Baseline (Initial Module) | `docker compose exec -T backend pytest` | **278 passed, 4 skipped** (`388.76s`) |
| TypeScript Check (Post-Extension) | `npx tsc --noEmit` (inside `frontend/`) | **0 errors** (exit code `0`) |
| Frontend Targeted Vitest (Post-Extension) | `npx vitest run src/test/Housekeeping.test.tsx src/test/Sidebar.test.tsx src/test/GlobalViewFirstSoftwareWideCoverage.test.tsx` | **3 files, 26 tests passed** |
| Full Frontend Vitest Baseline (Pre-Extension) | `npx vitest run --poolOptions.threads.minThreads=1 --poolOptions.threads.maxThreads=2 --testTimeout=15000` | **61 test files, 476 tests passed** |
| Docker Builds & Health | `docker compose build backend`, `docker compose build frontend`, `docker compose up -d` | Both images built cleanly (`Housekeeping-DeDJ-9Dl.js` bundled; `postgresql-client-17` active); `db`, `backend`, `frontend` running healthy |
| Live CLI `.edu` Backup & Isolated Drill | `python scripts/db_backup.py backup`, `verify`, `drill` | Created `POeduOS_20261111_192952.edu` (**133,721** bytes; wraps `530,879 B` `database.dump` -> `133,043 B` ZIP, `checksum.sha256`, `manifest.json`; `sha_match=True`, `format_valid=True`, `objects=1120`); isolated drill succeeded on `prashant_academy_drill` (`83` tables restored) and cleaned up `prashant_academy_drill` leaving `prashant_academy_test` untouched |
| Live End-to-End API & Browser Check | Playwright Chromium (`http://localhost:80`) + live HTTP APIs (`http://localhost:8000`) as `admin@example.com` | Passed against live stack: `/housekeeping/storage` (`28.10 GB` free / `12.87%`), `/housekeeping/alerts` (`status=warning`, `total=2`), `/housekeeping/cleanup/preview?retention_days=90` (`total_eligible=0`), Sidebar 5 sub-items, Settings launcher, Rule 010 locks + Edit Mode unlock, `.edu` TOC verify (`1120` objects), Guarded Restore modal, SSOT Reconciliation `PASS — ZERO VARIANCE`, UI Alerts/Storage/Dry-Run cards, `0` console errors, `0` page errors, `0` `>=400` API errors |
| Live OpenAPI Discovery | `GET http://localhost:8000/openapi.json` | Confirmed **19** `/api/v1/housekeeping/*` route paths registered live |
| Corporate Header Audit | `python scripts/manage_headers.py check` | **538 passed, 0 failed** (`100%` compliance) |

## 5. HOUSEKEEPING SAFETY AUDIT FOLLOW-UP — 2026-11-14

The follow-up review found correctness and data-safety gaps in the earlier implementation. The backend and CLI now use distinct, random-suffixed database names for restore drills; they attempt cleanup on success and failure, and report cleanup failures instead of silently ignoring them. The old fixed-name drill behavior could overwrite a pre-existing database with that name; the historical live-drill result above must not be treated as evidence that a pre-existing drill database was protected.

Additional corrections:
- GFS pruning now retains snapshots by distinct calendar day, ISO week, and month, while preserving the newest archive and recent pre-restore snapshots.
- The backup catalog is globally newest-first across managed and legacy folders. A backup only remains marked verified while its size and modification timestamp match the values recorded at verification; older metadata without these markers must be explicitly re-verified.
- Plain SQL inspection is line-streamed rather than loaded into memory multiple times. Empty or malformed embedded checksum files are rejected clearly.
- Log cleanup requires known, non-empty category selections. The confirmation dialog opens only after a fresh preview succeeds, and the archive is decompressed and row-count checked before database rows are deleted.
- CLI restore identifiers are validated before they are interpolated into PostgreSQL statements.
- VACUUM operation metadata is now stored against the active institution instead of always using institution `1`.

No live pruning, restore drill, production restore, or log purge was run during this follow-up. Focused non-destructive regression tests and environment-specific validation results are recorded in the task completion response.

## 6. ADMIN BACKUP-ONLY ACCESS FOLLOW-UP — 2026-11-14

The Housekeeping workspace is now available to Institute Admins as a read-only telemetry/catalog view with one approved mutation: on-demand backup creation in Edit Mode. Backend dependencies enforce the same boundary: Admins can read operational summaries and create backups, while verification, download, restore, pruning, upload, maintenance, policy edits, cleanup execution, and alert dispatch remain SysAdmin-only. The React route and locked controls mirror the API policy.

The host CLI restore-drill parser now defines its production database option, allowing the existing guard against using the live or test database name as the sandbox prefix to execute under the real parser. Regression coverage was added for both the Admin access boundary and parser-level drill argument handling.
