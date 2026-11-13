# /**
#  * @file        test_housekeeping.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      backend.tests
#  *
#  * @author      Jawahar R. Mallah
#  * @organization AITDL (AI Technology & Development Lab)
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 AITDL
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-11
#  * @updated     2026-11-14
#  *
#  * @description Backend integration & governance test suite for the Housekeeping module (RBAC, backups, checksum verification, GFS pruning, restore guards, VACUUM, reconciliation, settings sync, and navigation registry).
#  */

import os
import io
import gzip
import json
import time
import random
import zipfile
import importlib.util
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from types import SimpleNamespace
import pytest
from sqlalchemy import select, func
from unittest.mock import AsyncMock

from app.core.security import get_password_hash
from app.models.communication import CommunicationLog, SharedDocumentToken
from app.models.navigation import UserNavigationActivity
from app.models.user import AuditLog, Role, User
from app.services.housekeeping_service import HousekeepingService, RESTORE_CONFIRMATION_PHRASE
import app.services.housekeeping_service as housekeeping_service_module


async def _create_role_token(client, db, role_name: str, inst_id: int = 1):
    suffix = random.randint(100000, 999999)
    role_row = (await db.execute(select(Role).where(Role.name == role_name))).scalar_one_or_none()
    user = User(
        username=f"{role_name}_{suffix}",
        email=f"{role_name}_{suffix}@test.com",
        hashed_password=get_password_hash("testpassword"),
        first_name="Role",
        last_name=role_name.title(),
        role=role_name,
        role_id=role_row.id if role_row else None,
        institution_id=inst_id,
    )
    db.add(user)
    await db.commit()
    resp = await client.post(
        "/api/v1/auth/login",
        data={"username": user.username, "password": "testpassword"},
    )
    assert resp.status_code == 200
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


@pytest.mark.asyncio
async def test_housekeeping_rbac_enforced(client, db, test_institution):
    teacher_headers = await _create_role_token(client, db, "teacher", test_institution.id)
    student_headers = await _create_role_token(client, db, "student", test_institution.id)
    accountant_headers = await _create_role_token(client, db, "accountant", test_institution.id)

    for headers in (teacher_headers, student_headers, accountant_headers):
        res_ov = await client.get("/api/v1/housekeeping/overview", headers=headers)
        assert res_ov.status_code == 403
        res_bk = await client.post("/api/v1/housekeeping/backups", json={"label": "unauth"}, headers=headers)
        assert res_bk.status_code == 403


@pytest.mark.asyncio
async def test_housekeeping_admin_can_read_and_create_but_not_use_privileged_actions(
    client, db, test_institution, monkeypatch
):
    admin_headers = await _create_role_token(client, db, "admin", test_institution.id)
    backup_result = {
        "filename": "admin_created.edu",
        "source": "backups",
        "format": "edu_zip",
        "size_bytes": 100,
        "sha256": "abc123",
        "verified": True,
    }
    monkeypatch.setattr(
        HousekeepingService, "get_housekeeping_policy", AsyncMock(return_value={"offsite_mirror_path": ""})
    )
    monkeypatch.setattr(HousekeepingService, "create_backup", AsyncMock(return_value=backup_result))
    monkeypatch.setattr(HousekeepingService, "get_overview_telemetry", AsyncMock(return_value={"ok": True}))

    for path in (
        "/api/v1/housekeeping/overview",
        "/api/v1/housekeeping/backups",
        "/api/v1/housekeeping/policy",
        "/api/v1/housekeeping/history",
        "/api/v1/housekeeping/storage",
    ):
        response = await client.get(path, headers=admin_headers)
        assert response.status_code == 200, path

    create_response = await client.post(
        "/api/v1/housekeeping/backups",
        json={
            "label": "admin-created",
            "backup_format": "edu",
            "mirror_dir": "/unapproved/admin/override",
        },
        headers=admin_headers,
    )
    assert create_response.status_code == 201
    assert create_response.json() == backup_result
    HousekeepingService.create_backup.assert_awaited_once()
    assert HousekeepingService.create_backup.call_args.kwargs["mirror_dir"] is None

    protected_requests = (
        ("post", "/api/v1/housekeeping/backups/example.edu/verify", {}),
        ("get", "/api/v1/housekeeping/backups/example.edu/download", None),
        ("post", "/api/v1/housekeeping/backups/prune", {}),
        ("post", "/api/v1/housekeeping/restore/drill", {"filename": "example.edu"}),
        ("post", "/api/v1/housekeeping/restore", {
            "filename": "example.edu",
            "confirmation_phrase": "RESTORE PRASHANT_ACADEMY",
            "reason": "Admin must not restore a production database",
        }),
        ("post", "/api/v1/housekeeping/maintenance/vacuum", {}),
        ("post", "/api/v1/housekeeping/storage/clean-orphans", {}),
        ("put", "/api/v1/housekeeping/policy", {"backup_frequency": "weekly"}),
        ("post", "/api/v1/housekeeping/cleanup/execute", {"confirm": True}),
        ("get", "/api/v1/housekeeping/cleanup/archives/example.jsonl.gz/download", None),
    )
    for method, path, payload in protected_requests:
        response = await getattr(client, method)(
            path,
            headers=admin_headers,
            **({"json": payload} if payload is not None else {}),
        )
        assert response.status_code == 403, path


def test_cli_restore_drill_parser_provides_live_database_guard(monkeypatch, tmp_path, capsys):
    cli_path = Path(__file__).resolve().parents[2] / "scripts" / "db_backup.py"
    spec = importlib.util.spec_from_file_location("housekeeping_backup_cli_test", cli_path)
    assert spec and spec.loader
    cli = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(cli)

    restored_databases = []
    monkeypatch.setattr(cli, "_resolve_input_file", lambda _filename: tmp_path / "snapshot.dump")
    monkeypatch.setattr(cli, "verify_file", lambda _path: True)
    monkeypatch.setattr(cli, "_restore_into_db", lambda _path, _user, dbname: restored_databases.append(dbname))
    monkeypatch.setattr(cli, "_append_history", lambda _event: None)
    monkeypatch.setattr(cli, "_docker_exec", lambda *_args, **_kwargs: SimpleNamespace(stdout=b"4"))
    monkeypatch.setattr(sys, "argv", [
        str(cli_path),
        "drill",
        "--file",
        "snapshot.dump",
        "--database",
        "production_db",
        "--sandbox-db",
        "prashant_academy_drill",
    ])

    assert cli.main() == 0
    assert len(restored_databases) == 1
    assert restored_databases[0].startswith("prashant_academy_drill_")
    assert "production_db" not in restored_databases[0]
    assert "[PASS] Sandbox restore drill succeeded" in capsys.readouterr().out


@pytest.mark.asyncio
async def test_housekeeping_overview_and_policy_persistence(client, auth_headers, monkeypatch, tmp_path):
    backups_dir = tmp_path / "backups"
    legacy_dir = tmp_path / "legacy"
    backups_dir.mkdir()
    legacy_dir.mkdir()
    monkeypatch.setenv("HOUSEKEEPING_BACKUPS_DIR", str(backups_dir))
    monkeypatch.setenv("HOUSEKEEPING_LEGACY_BACKUPS_DIR", str(legacy_dir))

    # Create one dummy valid-header plain SQL file
    sample_sql = backups_dir / "prashant_academy_test_20261111_010000.sql"
    sample_sql.write_text("-- PostgreSQL database dump\nCREATE TABLE demo_tbl (id int);\n", encoding="utf-8")

    ov_res = await client.get("/api/v1/housekeeping/overview", headers=auth_headers)
    assert ov_res.status_code == 200
    ov = ov_res.json()
    assert ov["database"]["size_bytes"] > 0
    assert ov["backups_summary"]["total_count"] == 1
    assert "windows_task_scheduler" in ov["scheduler_commands"]
    assert "linux_cron" in ov["scheduler_commands"]

    put_res = await client.put(
        "/api/v1/housekeeping/policy",
        json={
            "backup_frequency": "weekly",
            "backup_time": "03:30",
            "retain_daily": 10,
            "retain_weekly": 6,
            "retain_monthly": 12,
            "reason": "Audit policy test update",
        },
        headers=auth_headers,
    )
    assert put_res.status_code == 200
    pol = put_res.json()
    assert pol["backup_frequency"] == "weekly"
    assert pol["backup_time"] == "03:30"
    assert pol["retain_daily"] == 10

    settings_res = await client.get("/api/v1/settings/all", headers=auth_headers)
    assert settings_res.status_code == 200
    s_data = settings_res.json()
    assert s_data["maintenance"]["last_backup_file"] == sample_sql.name
    assert s_data["maintenance"]["last_backup_date"] is not None


@pytest.mark.asyncio
async def test_housekeeping_backup_verify_download_upload_and_gfs_prune(client, auth_headers, monkeypatch, tmp_path):
    backups_dir = tmp_path / "backups"
    legacy_dir = tmp_path / "legacy"
    backups_dir.mkdir()
    legacy_dir.mkdir()
    monkeypatch.setenv("HOUSEKEEPING_BACKUPS_DIR", str(backups_dir))
    monkeypatch.setenv("HOUSEKEEPING_LEGACY_BACKUPS_DIR", str(legacy_dir))

    # Legacy file must never be deleted by pruning
    legacy_file = legacy_dir / "legacy_pre_migration.sql"
    legacy_file.write_text("-- PostgreSQL database dump\nCREATE TABLE legacy_t (id int);\n", encoding="utf-8")

    # Path traversal & invalid filename guards (URL + JSON payload)
    bad_url_verify = await client.post("/api/v1/housekeeping/backups/..%2Fsecret.sql/verify", headers=auth_headers)
    assert bad_url_verify.status_code in (400, 404)
    bad_ext_verify = await client.post("/api/v1/housekeeping/backups/secret.txt/verify", headers=auth_headers)
    assert bad_ext_verify.status_code == 400
    bad_body_drill = await client.post(
        "/api/v1/housekeeping/restore/drill",
        json={"filename": "../../etc/passwd.sql", "source": "backups"},
        headers=auth_headers,
    )
    assert bad_body_drill.status_code == 400

    # Upload a plain SQL backup
    sql_payload = b"-- PostgreSQL database dump\nCREATE TABLE uploaded_tbl (id int);\n"
    up_res = await client.post(
        "/api/v1/housekeeping/backups/upload",
        files={"file": ("uploaded_snapshot.sql", sql_payload, "application/octet-stream")},
        headers=auth_headers,
    )
    assert up_res.status_code == 201
    up_data = up_res.json()
    assert up_data["verified"] is True
    assert up_data["checksum_match"] is True
    assert up_data["toc_entries"] == 1

    # Re-verify + Download uploaded archive
    ver_res = await client.post(
        f"/api/v1/housekeeping/backups/{up_data['filename']}/verify",
        headers=auth_headers,
    )
    assert ver_res.status_code == 200
    assert ver_res.json()["verified"] is True

    dl_res = await client.get(
        f"/api/v1/housekeeping/backups/{up_data['filename']}/download",
        headers=auth_headers,
    )
    assert dl_res.status_code == 200
    assert dl_res.content == sql_payload

    # Create 4 timestamped snapshots + 1 recent pre_restore guard snapshot
    now = time.time()
    for idx in range(1, 5):
        p = backups_dir / f"snap_2026110{idx}.sql"
        p.write_text("-- PostgreSQL database dump\nCREATE TABLE s (id int);\n", encoding="utf-8")
        # Separate timestamps by distinct years/months older than current month
        mtime = now - (idx * 60 * 60 * 24 * 45)
        os.utime(p, (mtime, mtime))

    guard = backups_dir / "POeduOS_20261111_120000.edu"
    with zipfile.ZipFile(guard, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("database.sql", "-- PostgreSQL database dump\nCREATE TABLE g (id int);\n")
    Path(str(guard) + ".meta.json").write_text(json.dumps({"label": "pre_restore"}), encoding="utf-8")

    # Reject corrupted / non-zip .edu upload cleanly
    bad_edu = await client.post(
        "/api/v1/housekeeping/backups/upload",
        files={"file": ("POeduOS_corrupt.edu", b"NOT_A_ZIP_PAYLOAD", "application/octet-stream")},
        headers=auth_headers,
    )
    assert bad_edu.status_code == 400

    empty_checksum_buf = io.BytesIO()
    with zipfile.ZipFile(empty_checksum_buf, "w") as zf:
        zf.writestr("database.sql", "-- PostgreSQL database dump\nCREATE TABLE valid_t (id int);\n")
        zf.writestr("checksum.sha256", "")
    empty_checksum_res = await client.post(
        "/api/v1/housekeeping/backups/upload",
        files={"file": ("POeduOS_empty_checksum.edu", empty_checksum_buf.getvalue(), "application/octet-stream")},
        headers=auth_headers,
    )
    assert empty_checksum_res.status_code == 400

    # Reject Zip-Slip path traversal entry inside uploaded .edu archive
    slip_buf = io.BytesIO()
    with zipfile.ZipFile(slip_buf, "w") as zf:
        zf.writestr("../../evil.sql", "-- PostgreSQL database dump\nCREATE TABLE x (id int);\n")
    slip_res = await client.post(
        "/api/v1/housekeeping/backups/upload",
        files={"file": ("POeduOS_slip.edu", slip_buf.getvalue(), "application/octet-stream")},
        headers=auth_headers,
    )
    assert slip_res.status_code == 400

    prune_res = await client.post(
        "/api/v1/housekeeping/backups/prune",
        json={"retain_daily": 1, "retain_weekly": 0, "retain_monthly": 0},
        headers=auth_headers,
    )
    assert prune_res.status_code == 200
    pdata = prune_res.json()
    # At least old snapshots removed while newest, guard (<48h), and legacy are safe
    assert len(pdata["deleted"]) >= 3
    assert guard.exists()
    assert legacy_file.exists()


@pytest.mark.asyncio
async def test_housekeeping_gfs_retention_uses_unique_day_week_and_month_slots(
    client, auth_headers, monkeypatch, tmp_path
):
    backups_dir = tmp_path / "backups"
    legacy_dir = tmp_path / "legacy"
    backups_dir.mkdir()
    legacy_dir.mkdir()
    monkeypatch.setenv("HOUSEKEEPING_BACKUPS_DIR", str(backups_dir))
    monkeypatch.setenv("HOUSEKEEPING_LEGACY_BACKUPS_DIR", str(legacy_dir))

    anchor = datetime(2026, 11, 14, 12, tzinfo=timezone.utc)
    snapshot_days = [0, 0, 1, 7, 14, 40, 75, 120]
    for index, days_ago in enumerate(snapshot_days):
        snapshot = backups_dir / f"retention_{index}.sql"
        snapshot.write_text("-- PostgreSQL database dump\nCREATE TABLE retained (id int);\n", encoding="utf-8")
        timestamp = (anchor - timedelta(days=days_ago)).timestamp()
        os.utime(snapshot, (timestamp, timestamp))

    prune_res = await client.post(
        "/api/v1/housekeeping/backups/prune",
        json={"retain_daily": 2, "retain_weekly": 2, "retain_monthly": 2},
        headers=auth_headers,
    )
    assert prune_res.status_code == 200
    kept_days = {
        round((anchor.timestamp() - (backups_dir / name).stat().st_mtime) / 86400)
        for name in (snapshot.name for snapshot in backups_dir.glob("*.sql"))
    }
    assert kept_days == {0, 1, 7, 14}


def test_housekeeping_backup_catalog_is_globally_sorted_and_detects_file_drift(monkeypatch, tmp_path):
    backups_dir = tmp_path / "backups"
    legacy_dir = tmp_path / "legacy"
    backups_dir.mkdir()
    legacy_dir.mkdir()
    monkeypatch.setenv("HOUSEKEEPING_BACKUPS_DIR", str(backups_dir))
    monkeypatch.setenv("HOUSEKEEPING_LEGACY_BACKUPS_DIR", str(legacy_dir))

    older = backups_dir / "older.sql"
    latest = legacy_dir / "latest.sql"
    older.write_text("older", encoding="utf-8")
    latest.write_text("latest", encoding="utf-8")

    now = datetime.now(timezone.utc)
    for path, created_at in (
        (older, (now - timedelta(days=1)).isoformat()),
        (latest, now.isoformat()),
    ):
        stat = path.stat()
        Path(f"{path}.meta.json").write_text(json.dumps({
            "created_at": created_at,
            "verified": True,
            "verified_size_bytes": stat.st_size,
            "verified_mtime_ns": stat.st_mtime_ns,
            "sha256": "a" * 64,
        }), encoding="utf-8")
        Path(f"{path}.sha256").write_text(f"{'a' * 64}  {path.name}\n", encoding="utf-8")

    catalog = HousekeepingService.list_backups()
    assert [item["filename"] for item in catalog] == ["latest.sql", "older.sql"]
    assert catalog[0]["verified"] is True

    latest.write_text("latest modified", encoding="utf-8")
    modified_catalog = HousekeepingService.list_backups()
    assert modified_catalog[0]["filename"] == "latest.sql"
    assert modified_catalog[0]["verified"] is False


@pytest.mark.asyncio
async def test_housekeeping_restore_drill_uses_unique_database_and_cleans_up_on_failure(
    monkeypatch, tmp_path, admin_user
):
    pg = {
        "dbname": "prashant_academy",
        "user": "postgres",
        "password": "test",
        "host": "localhost",
        "port": "5432",
    }
    monkeypatch.setattr(housekeeping_service_module, "parse_pg_connection", lambda: pg)
    monkeypatch.setenv("HOUSEKEEPING_DRILL_DB", "prashant_academy_test")

    async def verify_backup(cls, filename, source, user=None):
        return {"verified": True, "detail": "verified"}

    monkeypatch.setattr(
        HousekeepingService,
        "verify_backup",
        classmethod(verify_backup),
    )
    monkeypatch.setattr(
        HousekeepingService,
        "resolve_safe_path",
        classmethod(lambda cls, filename, source: tmp_path / filename),
    )
    observed = {}

    async def fail_restore(cls, pg_config, target_db, backup_path):
        observed["restore_db"] = target_db
        raise RuntimeError("mocked restore failure")

    async def record_cleanup(cls, pg_config, target_db):
        observed["cleanup_db"] = target_db

    monkeypatch.setattr(HousekeepingService, "_recreate_and_restore_pg_db", classmethod(fail_restore))
    monkeypatch.setattr(HousekeepingService, "_drop_pg_database", classmethod(record_cleanup))

    with pytest.raises(RuntimeError, match="mocked restore failure"):
        await HousekeepingService.run_restore_drill("snapshot.sql", "backups", admin_user)

    assert observed["restore_db"].startswith("prashant_academy_test_")
    assert observed["restore_db"] != pg["dbname"]
    assert observed["cleanup_db"] == observed["restore_db"]


@pytest.mark.asyncio
async def test_housekeeping_create_backup_real_pg_dump(client, auth_headers, monkeypatch, tmp_path):
    backups_dir = tmp_path / "backups"
    legacy_dir = tmp_path / "legacy"
    mirror_dir = tmp_path / "mirror"
    backups_dir.mkdir()
    legacy_dir.mkdir()
    monkeypatch.setenv("HOUSEKEEPING_BACKUPS_DIR", str(backups_dir))
    monkeypatch.setenv("HOUSEKEEPING_LEGACY_BACKUPS_DIR", str(legacy_dir))

    # Default format ('edu') creates POeduOS_Date_Time.edu auto-zipped package
    res = await client.post(
        "/api/v1/housekeeping/backups",
        json={
            "label": "pytest_edu",
            "backup_format": "edu",
            "notes": "Container pg_dump auto-zip .edu verification",
            "mirror_dir": str(mirror_dir),
        },
        headers=auth_headers,
    )
    assert res.status_code == 201, res.text
    data = res.json()
    assert data["filename"].startswith("POeduOS_") and data["filename"].endswith(".edu")
    assert data["format"] == "edu_zip"
    assert data["verified"] is True
    assert data["size_bytes"] > 0
    assert data["toc_entries"] > 0
    edu_file = backups_dir / data["filename"]
    assert edu_file.exists()
    assert (backups_dir / f"{data['filename']}.sha256").exists()
    assert (mirror_dir / data["filename"]).exists()
    assert zipfile.is_zipfile(edu_file)
    with zipfile.ZipFile(edu_file, "r") as zf:
        names = set(zf.namelist())
        assert {"database.dump", "checksum.sha256", "manifest.json"}.issubset(names)
        manifest = json.loads(zf.read("manifest.json").decode("utf-8"))
        assert manifest["product"] == "PrathamOne EduOS"
        assert manifest["label"] == "pytest_edu"

    # Re-verify + download generated .edu package
    ver_edu = await client.post(f"/api/v1/housekeeping/backups/{data['filename']}/verify", headers=auth_headers)
    assert ver_edu.status_code == 200
    assert ver_edu.json()["verified"] is True

    # Also test edu_sql high-compression format
    res_sql = await client.post(
        "/api/v1/housekeeping/backups",
        json={"label": "pytest_edu_sql", "backup_format": "edu_sql"},
        headers=auth_headers,
    )
    assert res_sql.status_code == 201, res_sql.text
    assert res_sql.json()["filename"].endswith(".edu")
    assert res_sql.json()["verified"] is True


@pytest.mark.asyncio
async def test_housekeeping_restore_guards_and_drill_mocked(client, auth_headers, monkeypatch, tmp_path):
    backups_dir = tmp_path / "backups"
    legacy_dir = tmp_path / "legacy"
    backups_dir.mkdir()
    legacy_dir.mkdir()
    monkeypatch.setenv("HOUSEKEEPING_BACKUPS_DIR", str(backups_dir))
    monkeypatch.setenv("HOUSEKEEPING_LEGACY_BACKUPS_DIR", str(legacy_dir))

    snap = backups_dir / "valid_restore_candidate.sql"
    snap.write_text("-- PostgreSQL database dump\nCREATE TABLE demo_tbl (id int);\n", encoding="utf-8")

    # Wrong phrase -> 400
    bad_phrase = await client.post(
        "/api/v1/housekeeping/restore",
        json={
            "filename": snap.name,
            "source": "backups",
            "confirmation_phrase": "WRONG PHRASE",
            "reason": "Attempting restore with invalid phrase",
        },
        headers=auth_headers,
    )
    assert bad_phrase.status_code == 400

    # Reason too short -> 422 Pydantic min_length=10
    short_reason = await client.post(
        "/api/v1/housekeeping/restore",
        json={
            "filename": snap.name,
            "source": "backups",
            "confirmation_phrase": RESTORE_CONFIRMATION_PHRASE,
            "reason": "short",
        },
        headers=auth_headers,
    )
    assert short_reason.status_code == 422

    # Mock destructive pg drop/restore during sandbox drill check so test DB isn't clobbered under active fixture
    called = {"drill": False}

    async def fake_drill(filename, source, user):
        called["drill"] = True
        return {
            "sandbox_db": "prashant_academy_drill",
            "filename": filename,
            "tables_restored": 42,
            "students_restored": 5,
            "is_reconciled": True,
            "variance": 0.0,
            "verified_at": "2026-11-11T12:00:00Z",
        }

    monkeypatch.setattr(HousekeepingService, "run_restore_drill", staticmethod(fake_drill) if False else classmethod(lambda cls, fn, src, user: fake_drill(fn, src, user)))

    drill_res = await client.post(
        "/api/v1/housekeeping/restore/drill",
        json={"filename": snap.name, "source": "backups"},
        headers=auth_headers,
    )
    assert drill_res.status_code == 200
    assert called["drill"] is True
    assert drill_res.json()["is_reconciled"] is True


@pytest.mark.asyncio
async def test_housekeeping_vacuum_reconcile_and_navigation(client, auth_headers, db, test_fee_invoice, monkeypatch, tmp_path):
    backups_dir = tmp_path / "backups"
    backups_dir.mkdir()
    monkeypatch.setenv("HOUSEKEEPING_BACKUPS_DIR", str(backups_dir))

    # Reconcile endpoint uses active DB session -> verifies parity with zero variance
    rec_res = await client.post("/api/v1/housekeeping/maintenance/reconcile", headers=auth_headers)
    assert rec_res.status_code == 200
    rec = rec_res.json()
    assert rec["is_reconciled"] is True
    assert rec["ledger_audit"]["variance"] == 0.0

    # Live VACUUM ANALYZE on PostgreSQL via psql
    vac_res = await client.post("/api/v1/housekeeping/maintenance/vacuum", json={}, headers=auth_headers)
    assert vac_res.status_code == 200
    assert vac_res.json()["status"] == "completed"

    # History recorded
    hist_res = await client.get("/api/v1/housekeeping/history", headers=auth_headers)
    assert hist_res.status_code == 200
    assert len(hist_res.json()["events"]) >= 1

    # Navigation config includes 'housekeeping' for admin/sysadmin and hides from student
    nav_admin = await client.get("/api/v1/navigation/config", headers=auth_headers)
    assert nav_admin.status_code == 200
    mod_ids = {m["id"] for m in nav_admin.json().get("authorized_modules", [])}
    assert "housekeeping" in mod_ids

    student_headers = await _create_role_token(client, db, "student", 1)
    nav_student = await client.get("/api/v1/navigation/config", headers=student_headers)
    assert nav_student.status_code == 200
    stu_mods = {m["id"] for m in nav_student.json().get("authorized_modules", [])}
    assert "housekeeping" not in stu_mods


@pytest.mark.asyncio
async def test_housekeeping_vacuum_metadata_uses_requested_institution(monkeypatch, db, admin_user):
    observed = {}

    async def fake_subprocess(cmd, env_extra=None, timeout=300):
        return 0, "", ""

    async def fake_upsert(cls, session, institution_id, user_id, data):
        observed["institution_id"] = institution_id
        observed["user_id"] = user_id
        observed["data"] = data

    monkeypatch.setattr(housekeeping_service_module, "_run_subprocess", fake_subprocess)
    monkeypatch.setattr(HousekeepingService, "_upsert_internal_meta", classmethod(fake_upsert))
    monkeypatch.setattr(housekeeping_service_module, "_append_history_event", lambda event: None)

    result = await HousekeepingService.run_vacuum_analyze(db, admin_user, institution_id=42)

    assert result["status"] == "completed"
    assert observed["institution_id"] == 42
    assert observed["user_id"] == admin_user.id
    assert "last_vacuum_at" in observed["data"]


@pytest.mark.asyncio
async def test_housekeeping_storage_orphan_cleanup_and_alerts(client, auth_headers, monkeypatch, tmp_path):
    backups_dir = tmp_path / "backups"
    legacy_dir = tmp_path / "legacy"
    backups_dir.mkdir()
    legacy_dir.mkdir()
    monkeypatch.setenv("HOUSEKEEPING_BACKUPS_DIR", str(backups_dir))
    monkeypatch.setenv("HOUSEKEEPING_LEGACY_BACKUPS_DIR", str(legacy_dir))

    # No verified backup -> alerts report critical
    al_empty = await client.get("/api/v1/housekeeping/alerts", headers=auth_headers)
    assert al_empty.status_code == 200
    assert al_empty.json()["health_status"] == "critical"
    assert any(a["id"] == "no_verified_backup" for a in al_empty.json()["items"])

    # Create valid snapshot + dangling orphan sidecars and temp file
    valid_sql = backups_dir / "valid_snap.sql"
    valid_sql.write_text("-- PostgreSQL database dump\nCREATE TABLE ok_t (id int);\n", encoding="utf-8")
    orphan_sha = backups_dir / "deleted_snap.dump.sha256"
    orphan_sha.write_text("deadbeef  deleted_snap.dump\n", encoding="utf-8")
    orphan_meta = backups_dir / "deleted_snap.dump.meta.json"
    orphan_meta.write_text("{}", encoding="utf-8")
    temp_file = backups_dir / "partial_write.tmp"
    temp_file.write_bytes(b"tempbytes")

    stor_res = await client.get("/api/v1/housekeeping/storage", headers=auth_headers)
    assert stor_res.status_code == 200
    stor = stor_res.json()
    assert stor["disk"]["free_bytes"] > 0
    assert stor["breakdown"]["orphan_count"] == 3

    clean_res = await client.post("/api/v1/housekeeping/storage/clean-orphans", headers=auth_headers)
    assert clean_res.status_code == 200
    cdata = clean_res.json()
    assert len(cdata["deleted"]) == 3
    assert valid_sql.exists()
    assert not orphan_sha.exists()
    assert not orphan_meta.exists()
    assert not temp_file.exists()

    # Dispatch health alert email digest
    notify_res = await client.post(
        "/api/v1/housekeeping/alerts/notify",
        json={"recipient_email": "ops@prashant.edu"},
        headers=auth_headers,
    )
    assert notify_res.status_code == 200
    ndata = notify_res.json()
    assert ndata["dispatched"] is True
    assert ndata["recipient"] == "ops@prashant.edu"


@pytest.mark.asyncio
async def test_housekeeping_log_archival_preview_and_safe_purge(client, auth_headers, db, admin_user, monkeypatch, tmp_path):
    backups_dir = tmp_path / "backups"
    legacy_dir = tmp_path / "legacy"
    backups_dir.mkdir()
    legacy_dir.mkdir()
    monkeypatch.setenv("HOUSEKEEPING_BACKUPS_DIR", str(backups_dir))
    monkeypatch.setenv("HOUSEKEEPING_LEGACY_BACKUPS_DIR", str(legacy_dir))

    inst_id = admin_user.institution_id or 1
    old_dt = datetime.now(timezone.utc) - timedelta(days=120)
    fresh_dt = datetime.now(timezone.utc) - timedelta(days=1)

    # Seed old & fresh Navigation Activity
    db.add(UserNavigationActivity(user_id=admin_user.id, institution_id=inst_id, module_key="dashboard", route_path="/dashboard", accessed_at=old_dt))
    db.add(UserNavigationActivity(user_id=admin_user.id, institution_id=inst_id, module_key="students", route_path="/students", accessed_at=fresh_dt))

    # Seed old & fresh SharedDocumentToken
    db.add(SharedDocumentToken(token="tok_old_expired_1", institution_id=inst_id, document_type="RECEIPT", record_id=1, expires_at=old_dt))
    db.add(SharedDocumentToken(token="tok_active_1", institution_id=inst_id, document_type="RECEIPT", record_id=2, expires_at=datetime.now(timezone.utc) + timedelta(days=5)))

    # Seed old & fresh CommunicationLog
    db.add(CommunicationLog(institution_id=inst_id, channel="EMAIL", recipient_type="STUDENT", recipient_name="A", recipient_destination="a@b.com", content="Old", status="SENT", created_at=old_dt))
    db.add(CommunicationLog(institution_id=inst_id, channel="EMAIL", recipient_type="STUDENT", recipient_name="B", recipient_destination="b@c.com", content="Fresh", status="SENT", created_at=fresh_dt))

    # Seed AuditLog: old routine INFO vs protected old WARNING vs protected old system audit
    db.add(AuditLog(user_id=admin_user.id, action="ROUTINE_VIEW", resource_type="test_cleanup", severity="info", is_system_audit=False, details="old_info_row", created_at=old_dt))
    db.add(AuditLog(user_id=admin_user.id, action="CRITICAL_SEC_EVENT", resource_type="test_cleanup", severity="WARNING", is_system_audit=False, details="protected_warn_row", created_at=old_dt))
    db.add(AuditLog(user_id=admin_user.id, action="SYSTEM_POLICY_LOCK", resource_type="test_cleanup", severity="info", is_system_audit=True, details="protected_sys_row", created_at=old_dt))
    await db.commit()

    # Retention floor (<7 days) rejected
    bad_prev = await client.get("/api/v1/housekeeping/cleanup/preview?retention_days=3", headers=auth_headers)
    assert bad_prev.status_code == 422
    invalid_category = await client.get(
        "/api/v1/housekeeping/cleanup/preview?categories=financial_ledger",
        headers=auth_headers,
    )
    assert invalid_category.status_code == 400

    # Execute without confirm=True blocked (400)
    unconfirmed = await client.post(
        "/api/v1/housekeeping/cleanup/execute",
        json={"retention_days": 30, "confirm": False},
        headers=auth_headers,
    )
    assert unconfirmed.status_code == 400

    # Dry-run preview counts strictly eligible rows
    prev_res = await client.get("/api/v1/housekeeping/cleanup/preview?retention_days=30", headers=auth_headers)
    assert prev_res.status_code == 200
    prev = prev_res.json()
    counts = {c["category"]: c["eligible_count"] for c in prev["categories"]}
    assert counts["navigation_activity"] >= 1
    assert counts["expired_tokens"] >= 1
    assert counts["communication_logs"] >= 1
    assert counts["routine_audit_logs"] >= 1

    # Confirmed archival + purge
    exec_res = await client.post(
        "/api/v1/housekeeping/cleanup/execute",
        json={"retention_days": 30, "confirm": True},
        headers=auth_headers,
    )
    assert exec_res.status_code == 200
    edata = exec_res.json()
    assert edata["total_purged"] >= 4
    assert len(edata["archived_files"]) >= 4

    # Verify gzip archive exists, contains exported data, and downloads cleanly
    first_arch = edata["archived_files"][0]["filename"]
    arch_path = backups_dir / "archives" / first_arch
    assert arch_path.exists()
    with gzip.open(arch_path, "rt", encoding="utf-8") as gz:
        assert len(gz.read().strip().splitlines()) >= 1

    dl_arch = await client.get(
        f"/api/v1/housekeeping/cleanup/archives/{first_arch}/download",
        headers=auth_headers,
    )
    assert dl_arch.status_code == 200

    # Confirm protected WARNING & system audit & fresh rows remain in DB
    warn_exists = (await db.execute(select(func.count(AuditLog.id)).where(AuditLog.details == "protected_warn_row"))).scalar()
    sys_exists = (await db.execute(select(func.count(AuditLog.id)).where(AuditLog.details == "protected_sys_row"))).scalar()
    old_info_exists = (await db.execute(select(func.count(AuditLog.id)).where(AuditLog.details == "old_info_row"))).scalar()
    fresh_nav = (await db.execute(select(func.count(UserNavigationActivity.id)).where(UserNavigationActivity.route_path == "/students"))).scalar()
    assert warn_exists == 1
    assert sys_exists == 1
    assert old_info_exists == 0
    assert fresh_nav >= 1
