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
#  * @updated     2026-11-11
#  *
#  * @description Backend integration & governance test suite for the Housekeeping module (RBAC, backups, checksum verification, GFS pruning, restore guards, VACUUM, reconciliation, settings sync, and navigation registry).
#  */

import os
import time
import random
from pathlib import Path
import pytest
from sqlalchemy import select

from app.core.security import get_password_hash
from app.models.user import Role, User
from app.services.housekeeping_service import HousekeepingService, RESTORE_CONFIRMATION_PHRASE


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

    guard = backups_dir / "prashant_academy_pre_restore_20261111_120000.sql"
    guard.write_text("-- PostgreSQL database dump\nCREATE TABLE g (id int);\n", encoding="utf-8")

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
async def test_housekeeping_create_backup_real_pg_dump(client, auth_headers, monkeypatch, tmp_path):
    backups_dir = tmp_path / "backups"
    legacy_dir = tmp_path / "legacy"
    mirror_dir = tmp_path / "mirror"
    backups_dir.mkdir()
    legacy_dir.mkdir()
    monkeypatch.setenv("HOUSEKEEPING_BACKUPS_DIR", str(backups_dir))
    monkeypatch.setenv("HOUSEKEEPING_LEGACY_BACKUPS_DIR", str(legacy_dir))

    res = await client.post(
        "/api/v1/housekeeping/backups",
        json={
            "label": "pytest_real",
            "backup_format": "custom",
            "notes": "Container pg_dump verification",
            "mirror_dir": str(mirror_dir),
        },
        headers=auth_headers,
    )
    assert res.status_code == 201, res.text
    data = res.json()
    assert data["verified"] is True
    assert data["size_bytes"] > 0
    assert data["toc_entries"] > 0
    assert (backups_dir / data["filename"]).exists()
    assert (backups_dir / f"{data['filename']}.sha256").exists()
    assert (mirror_dir / data["filename"]).exists()


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
            "sandbox_db": "prashant_academy_test",
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
