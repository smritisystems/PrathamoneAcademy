---
title: "CodeX Engine Fresh Installation & Roster Import 500 Error Root Cause Analysis and Remediation"
module: "21_TROUBLESHOOTING"
category: "POSTMORTEM"
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
tags: ["codex", "migrations", "alembic", "seed", "troubleshooting", "postmortem", "sql-dump"]
entities: ["CodeXConfig", "CodeXMappingProfile", "StaffProfile", "Institution"]
api_routes: ["/api/v1/codex/config", "/api/v1/codex/profiles"]
related_modules: ["16_DATABASE_API", "02_INSTALLATION_DEPLOYMENT"]
---

# CodeX Engine Fresh Installation & Roster Import 500 Error Postmortem

## 1. Executive Summary

Users installing **PrathamOne EduOS** (Coaching Institute Edition) on clean environments reported HTTP 500 Internal Server Errors (`[PrathamOne Error] ERR-20261111-THF6 • SERVER_UNAVAILABLE`) when navigating to **CodeX Studio**:
- `GET http://localhost/api/v1/codex/profiles 500 (Internal Server Error)`
- `GET http://localhost/api/v1/codex/config 500 (Internal Server Error)`

A forensic investigation revealed that on fresh installations, or after executing the roster restoration script (`add_39_students.ps1` / `add_39_students.sh`), the database schema was either halted before migration `022_codex_engine.py` or replaced with an obsolete Nov 4 SQL dump pinned to migration `010_curriculum_timetable`. Consequently, CodeX database tables (`codex_configs`, `codex_mapping_profiles`, `codex_mapping_versions`, `codex_scope_assignments`, `codex_audit_logs`, `codex_temporary_tokens`) were completely missing from PostgreSQL, causing unhandled `asyncpg.exceptions.UndefinedTableError` exceptions in FastAPI.

---

## 2. Root Cause Analysis (Chain of Failure)

The failure was traced to four interconnected defects in the database migration chain, the roster loader dump, and the seeder:

### Defect 1: Obsolete Roster Seed Dump Overwriting Database
- The seed file `data/prashant_academy_production_39_students.sql` contained an outdated dump from November 4, 2026.
- It was pinned to Alembic revision `010_curriculum_timetable` and contained only 22 tables.
- When new users ran `.\add_39_students.ps1` as prompted by `install.ps1`, the script executed `psql -f /tmp/prashant_academy_production_39_students.sql`, which issued `DROP TABLE IF EXISTS` across modern tables, rolled back `alembic_version` to `010`, and wiped all tables created after revision 010 (including all 6 CodeX tables).

### Defect 2: Broken Migration Chain at Revision 013 (`staff_profiles` Missing)
- When the backend container restarted and executed `alembic upgrade head`, migration `013_repair_staff_role_assignments.py` immediately crashed:
  ```text
  asyncpg.exceptions.UndefinedTableError: relation "staff_profiles" does not exist
  ```
- In historical developer environments, `staff_profiles` was created out-of-band via `init_staff_module.py` (`Base.metadata.create_all`). Because no previous migration created `staff_profiles`, a clean migration sequence from 000 to head crashed at 013.
- Consequently, migrations 014 through 040 (including `022_codex_engine.py`) **never ran**, preventing the creation of `codex_configs` and `codex_mapping_profiles`.

### Defect 3: Non-Idempotent Migrations with Hardcoded Keys (017, 025, 032, 037, 038)
- Even after fixing migration 013, four subsequent migrations contained non-idempotent statements:
  - `017_forensic_fee_ledger_reconciliation.py`: Hardcoded `institution_id = 1` and inserted into child tables for students without verifying if student records existed, causing Foreign Key constraint violations.
  - `025_canonical_subjects.py`: Hardcoded `institution_id = 1` when seeding canonical subjects and updating legacy subjects.
  - `032_unified_audit_log_view.py`: Created a view referencing `details` and `severity` columns on `audit_logs`, which were defined in SQLAlchemy models (`AuditLog`) but never added to the database via Alembic migrations.
  - `037_reconcile_khushi_allocations.py`: Attempted to insert payment receipts referencing payment ID `69` and `83` without checking if the parent payments existed.
  - `038_reconcile_nethan_and_legacy_receipt_typos.py`: Attempted to insert an audit log referencing `user_id = 1` on databases where `users` was empty.

### Defect 4: Syntax / NameError in `backend/seed.py`
- `backend/seed.py` referenced `installment_id=installment.id`, but `fee_installments` was dropped in migration 031 and variable `installment` was undefined, throwing `NameError: name 'installment' is not defined`.
- In addition, the seeder skipped creating administrative users if any institution existed, even if `users` was empty.

---

## 3. Comprehensive Remediation

### 3.1 Migration Chain Hardening (001 – 040)
1. **`001_initial_schema.py`:** Added idempotent baseline institution creation (`id = 1`, `code = 'PA001'`) and reset sequence.
2. **`013_repair_staff_role_assignments.py`:** Added idempotent inspection and table creation for `staff_profiles`, `staff_documents`, and `teacher_assignments`.
3. **`017_forensic_fee_ledger_reconciliation.py`:** Dynamically selects active institution ID and guards student updates with `AND EXISTS (SELECT 1 FROM students WHERE id = ...)`.
4. **`021_workforce_lifecycle_and_employment_history.py`:** Idempotently checks column existence on `staff_profiles` before issuing `ADD COLUMN`.
5. **`025_canonical_subjects.py`:** Guards canonical subject seeding with institution existence checks and dynamic ID resolution.
6. **`032_unified_audit_log_view.py`:** Idempotently ensures `is_system_audit`, `severity`, and `details` columns exist on `audit_logs` prior to creating `v_unified_audit_log`.
7. **`037_reconcile_khushi_allocations.py`:** Wrapped payment receipts insertion with `IF EXISTS (SELECT 1 FROM payments WHERE id IN (69, 83))` check.
8. **`038_reconcile_nethan_and_legacy_receipt_typos.py`:** Wrapped audit log insertion with `WHERE EXISTS (SELECT 1 FROM students WHERE id = 131)`.
9. **`039_add_staff_reporting_manager_and_responsibilities.py`:** Idempotently checks column existence on `staff_profiles`.

### 3.2 Seeder Resolution (`backend/seed.py`)
- Removed obsolete `installment_id` parameters from `PaymentAllocation` calls.
- Updated baseline user verification check to verify whether `admin` user exists rather than relying solely on institution count.

### 3.3 Production SQL Seed Dump Regeneration
- Regenerated `data/prashant_academy_production_39_students.sql` and `data/prashant_academy_complete_production.sql` directly from the verified production database.
- The new dump includes:
  - 80 tables (including all 6 CodeX tables)
  - Full Alembic schema at head (`040_homework_system`)
  - 39 verified students, 5 batches, 78 guardians, 195 KYC documents, 39 invoices, 178 payment receipts
  - Initialized CodeX configuration and default mapping profile
  - Canonical domain `example.com`

### 3.4 Roster Loader Automation (`add_39_students.ps1` & `add_39_students.sh`)
- Appended `docker compose exec -T backend alembic upgrade head` immediately following container restart and health verification.

---

## 4. Verification and Validation Results

1. **Zero-to-Head Clean Migration Test:**
   - Initialized an empty PostgreSQL database (`test_fresh_db`).
   - Ran `alembic upgrade head` from empty schema to `040_homework_system`: **PASS (exit code 0, 77 tables created)**.
   - Executed `python seed.py`: **PASS (exit code 0, administrative users and configurations seeded)**.
   - Tested CodeX service queries: **PASS (Config ID 1, Default Profile ID 1 returned)**.
2. **Roster Loader Execution Test:**
   - Ran `.\add_39_students.ps1 -Force`: **PASS (exit code 0, 39 students, 178 payments restored, Alembic at head)**.
3. **Live Playwright & API End-to-End Verification:**
   - Navigated to `/login`, authenticated as `admin@example.com`.
   - Navigated to `/dashboard`: **HTTP 200 OK**.
   - Navigated to `/codex`: **HTTP 200 OK**.
   - Total console error/warning events: **0**.
4. **Header and Documentation Integrity:**
   - `python scripts/manage_headers.py check`: **100% PASS (524 files checked, 0 failed)**.
   - `python tools/docs_manager.py reindex && python tools/docs_manager.py validate`: **100% PASS (405 documents, 0 blocking errors, 0 warnings)**.

