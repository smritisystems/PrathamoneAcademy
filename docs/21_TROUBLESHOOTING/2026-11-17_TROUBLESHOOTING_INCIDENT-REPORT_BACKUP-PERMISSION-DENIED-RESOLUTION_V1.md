---
title: "Housekeeping Backup Permission Denied Incident Resolution"
module: "21_TROUBLESHOOTING"
category: "INCIDENT-REPORT"
document_type: "REPORT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-17"
updated_date: "2026-11-17"
author: "Jawahar R Mallah"
organization: "Smritisys & AITDL Networks"
status: "Approved"
tags: ["housekeeping", "backup", "permissions", "docker", "troubleshooting"]
entities: ["AuditLog", "HousekeepingService"]
api_routes: ["/api/v1/housekeeping/backups", "/api/v1/housekeeping/history"]
related_modules: ["13_SYSADMIN_SETTINGS", "16_DATABASE_API"]
---

# INCIDENT REPORT: Housekeeping Backup Flat-File Permission Denied Resolution

## 1. Executive Summary
During a routine administrative backup invocation from the PrathamOne EduOS Management Console, a client administrator encountered the following error toast:
```
Database backup failed: [Errno 13] Permission denied: '/app/backups/housekeeping_history.jsonl'
```
Forensic analysis revealed that while the core PostgreSQL `pg_dump` payload, cryptographic checksum calculations, `.sha256` sidecars, `.meta.json` records, automated verification, and canonical database `AuditLog` database table persistence all executed with 100% success, a subsequent auxiliary append call to the secondary flat-file stream (`housekeeping_history.jsonl`) raised an unhandled `PermissionError`. 

Because `./backups:/app/backups` is mounted from the host OS (Windows/Linux) into the container environment where the backend executes under the non-root `appuser` (UID 999), host-side file creation or restrictive NTFS/Linux permissions on the pre-existing `housekeeping_history.jsonl` file caused `open("a", encoding="utf-8")` to fail.

This directive details the multi-tiered defense-in-depth remediation implemented across domain services, CLI tools, container lifecycles, and host update scripts.

---

## 2. Root Cause Analysis (RCA)

### 2.1 Failure Mechanism
1. In `backend/app/services/housekeeping_service.py:create_backup()`, the database dump is written and verified, and metadata is committed to PostgreSQL:
   ```python
   db.add(AuditLog(
       user_id=user.id,
       action="HOUSEKEEPING_BACKUP_CREATED",
       ...
   ))
   await db.commit()
   ```
2. Following transaction commitment, `_append_history_event(...)` was called to append a JSON line to `resolve_backups_dir() / "housekeeping_history.jsonl"`.
3. In host environments where `update.ps1` or host-side git operations created or altered `housekeeping_history.jsonl` with standard user or root ownership (mode `0644`), the containerized non-root `appuser` lacked write permissions to that specific file.
4. Because `_append_history_event` lacked exception shielding, the `PermissionError: [Errno 13]` bubbled up to `backend/app/api/v1/endpoints/housekeeping.py:179`, triggering an HTTP 500 error and giving the false impression that database backup had failed.
5. Crucially, `_append_history_event` was invoked across 11 core housekeeping operations (backup creation, verification, restore, pruning, vacuuming, policy configuration), making all of them vulnerable to the same flat-file permission failure.

---

## 3. Defense-in-Depth Engineering Solution

### 3.1 Non-Fatal Auxiliary Logging & Multi-Tier Fallback
The `_append_history_event` function was re-engineered with the following guarantees:
- **Rule of Non-Interference:** Auxiliary flat-file logging must NEVER disrupt primary transactional business logic or database persistence.
- **Permission Relaxation:** When accessing candidate files, `os.chmod(candidate, 0o666)` is proactively attempted to repair restricted permissions.
- **Multi-Tier Hierarchy:** If appending to primary `/app/backups/housekeeping_history.jsonl` fails with `PermissionError` or `OSError`, the service automatically falls back sequentially through:
  1. Primary: `/app/backups/housekeeping_history.jsonl`
  2. Legacy Directory: `/app/data/backups/housekeeping_history.jsonl`
  3. Container User Home: `/home/appuser/housekeeping_history.jsonl`
  4. System Temp Directory: `/tmp/housekeeping_history.jsonl`
- **Graceful Degradation:** If all storage locations fail, a structured error is logged to standard logging, while the caller receives a clean, successful return code.

### 3.2 Resilient History Reading & Merge Deduplication
`read_history_events(limit=50)` was updated to:
- Inspect all candidate storage locations in sequence.
- Safely read accessible files while ignoring any files subject to permission denials.
- Parse JSON records, deduplicate events by `(timestamp, action, filename)`, sort chronologically descending, and return up to `limit` events.

### 3.3 Safe Sidecar Writing
Introduced `_safe_write_text(path, content)` which safely wraps `.sha256` and `.meta.json` sidecar writes, ensuring:
- Proactive `os.chmod(path, 0o666)` on pre-existing sidecars.
- Parent directory creation with `0o777` permissions.
- Logging of non-fatal warnings if file sidecars cannot be persisted.

### 3.4 Host Script & Windows ACL Hardening (`update.ps1` & `update.sh`)
- **Windows (`update.ps1`):** In Step 3 (pre-update snapshot), PowerShell applies `icacls $backupDir /grant "Everyone:(OI)(CI)F" /T /Q` and explicitly clears the `IsReadOnly` attribute on `housekeeping_history.jsonl`.
- **Linux/macOS (`update.sh`):** In Step 3, `chmod -R 777 backups data/backups 2>/dev/null || true` is executed before and after snapshot capture.

### 3.5 Container Startup Defensive Normalization
Added an application startup hook in `backend/app/main.py`:
```python
@app.on_event("startup")
async def on_startup():
    from pathlib import Path
    for dir_path in [Path("/app/backups"), Path("/app/data/backups")]:
        try:
            if dir_path.exists():
                hist = dir_path / "housekeeping_history.jsonl"
                if hist.exists():
                    try:
                        os.chmod(hist, 0o666)
                    except Exception:
                        pass
        except Exception:
            pass
```

---

## 4. Verification & Validation Evidence

### 4.1 Automated Test Suite
Added 3 dedicated automated integration tests in `backend/tests/test_housekeeping.py`:
1. `test_housekeeping_history_append_resilience_on_permission_denied`: Simulates primary `housekeeping_history.jsonl` raising `PermissionError(13)`, asserts zero exceptions raised, and confirms successful fallback write & read.
2. `test_housekeeping_create_backup_resilient_to_history_permission_denied`: Simulates live backup creation with primary log file raising `PermissionError(13)`, verifying that the backup is created, verified, and returned with HTTP 200 equivalent.
3. `test_safe_write_text_resilience`: Verifies sidecar write resilience and permission handling.

**Test Results:**
```
============================= test session starts ==============================
collected 17 items

tests/test_housekeeping.py ..s..............                             [100%]
================== 16 passed, 1 skipped, 3 warnings in 27.42s ==================
```

### 4.2 Corporate Attribution & Compliance
Executed `python scripts/manage_headers.py check`:
```
Total checked: 657
Passed:        657
Failed:        0
[PASS] All source files satisfy attribution and header compliance rules!
```
