# /**
#  * @file        test_run_server_logging.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      backend.tests
#  *
#  * @author      Jawahar R. Mallah
#  * @organization Smritisys & AITDL Networks
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 PrathamOne EduOS
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-26
#  * @updated     2026-11-28
#  *
#  * @description Unit tests validating standalone backend rotating logging (5 MB x 5), stdio redirection, Uvicorn dictConfig, and stray root log consolidation.
#  */

import logging
import sys
from pathlib import Path

import run_server


def test_rotating_logging_captures_root_uvicorn_fastapi_and_stdio(tmp_path, monkeypatch):
    log_path = tmp_path / "logs" / "backend_server.log"
    orig_stdout, orig_stderr = sys.stdout, sys.stderr
    orig_excepthook = sys.excepthook
    monkeypatch.setattr(run_server, "_ROTATING_LOG_HANDLER", None)

    try:
        fp = run_server._ensure_stdio_streams(log_path)
        run_server._configure_rotating_logging(log_path)

        handler = run_server._get_rotating_handler(log_path)
        assert handler.maxBytes == 5 * 1024 * 1024
        assert handler.backupCount == 5

        logging.getLogger().info("root-log-entry")
        logging.getLogger("uvicorn.error").error("uvicorn-error-entry")
        logging.getLogger("fastapi").error("fastapi-exception-entry")
        print("unconditional-stdout-entry")
        print("unconditional-stderr-entry", file=sys.stderr)
        handler.flush()
        fp.flush()

        content = log_path.read_text(encoding="utf-8")
        assert "root-log-entry" in content
        assert "uvicorn-error-entry" in content
        assert "fastapi-exception-entry" in content
        assert "unconditional-stdout-entry" in content
        assert "unconditional-stderr-entry" in content
    finally:
        sys.stdout = orig_stdout
        sys.stderr = orig_stderr
        sys.excepthook = orig_excepthook
        if run_server._ROTATING_LOG_HANDLER is not None:
            run_server._ROTATING_LOG_HANDLER.close()
            run_server._ROTATING_LOG_HANDLER = None
        if run_server._LOG_FP is not None:
            run_server._LOG_FP.close()
            run_server._LOG_FP = None


def test_windows_safe_handler_rotates_via_copy_truncate_on_permission_error(tmp_path, monkeypatch):
    log_path = tmp_path / "logs" / "backend_server.log"
    log_path.parent.mkdir(parents=True, exist_ok=True)
    log_path.write_text("first-line\nsecond-line\n", encoding="utf-8")

    handler = run_server._WindowsSafeRotatingFileHandler(
        str(log_path), maxBytes=10, backupCount=5, encoding="utf-8"
    )
    try:
        import logging.handlers as lh

        def _blocked_rename(_self, _src, _dst):
            raise PermissionError("Simulated WinError 32 locked file handle")

        monkeypatch.setattr(lh.RotatingFileHandler, "rotate", _blocked_rename)
        handler.rotate(str(log_path), str(tmp_path / "logs" / "backend_server.log.1"))

        assert (tmp_path / "logs" / "backend_server.log.1").read_text(encoding="utf-8") == "first-line\nsecond-line\n"
        assert log_path.read_text(encoding="utf-8") == ""
    finally:
        handler.close()


def test_clean_stray_root_logs_removes_only_empty_files_outside_logs_dir(tmp_path):
    app_root = tmp_path / "app"
    data_root = tmp_path / "appdata"
    logs_dir = data_root / "logs"
    app_root.mkdir(parents=True)
    (data_root / "data").mkdir(parents=True)
    logs_dir.mkdir(parents=True)

    stray_root = app_root / "backend_server.log"
    stray_launcher = app_root / "launcher.log"
    stray_data = data_root / "data" / "backend_server.log"
    non_empty_root = data_root / "launcher.log"
    active_log = logs_dir / "backend_server.log"

    stray_root.write_text("", encoding="utf-8")
    stray_launcher.write_text("", encoding="utf-8")
    stray_data.write_text("", encoding="utf-8")
    non_empty_root.write_text("keep-me", encoding="utf-8")
    active_log.write_text("", encoding="utf-8")

    run_server._clean_stray_root_logs(app_root, data_root)

    assert not stray_root.exists()
    assert not stray_launcher.exists()
    assert not stray_data.exists()
    assert non_empty_root.exists()
    assert active_log.exists()


def test_build_uvicorn_log_config_uses_callable_rotating_handler(tmp_path):
    log_path = tmp_path / "logs" / "backend_server.log"
    cfg = run_server._build_uvicorn_log_config(log_path)
    assert cfg["handlers"]["rotating_file"]["()"] is run_server._create_uvicorn_handler
    assert cfg["loggers"]["uvicorn.error"]["handlers"] == ["rotating_file"]
    assert cfg["loggers"]["uvicorn.error"]["propagate"] is False


def test_preflight_check_detects_fresh_install_and_writes_audit_log(tmp_path):
    app_root = tmp_path / "app"
    data_root = tmp_path / "data_root"
    app_root.mkdir(parents=True)
    data_root.mkdir(parents=True)
    backend_dir = Path(__file__).resolve().parents[1]
    json_out = tmp_path / "preflight.json"

    code, report = run_server.run_preflight_check(
        app_root,
        backend_dir,
        data_root,
        json_out=json_out,
        actor="pytest",
    )

    assert code == 0
    assert report["recommendation"] == "FRESH_INSTALL"
    assert report["pending_count"] == 0
    assert json_out.is_file()

    audit_file = data_root / "logs" / "upgrade_audit.jsonl"
    assert audit_file.is_file()
    entries = audit_file.read_text(encoding="utf-8").strip().splitlines()
    assert len(entries) == 1
    assert '"operation": "preflight_check"' in entries[0]
    assert '"recommendation": "FRESH_INSTALL"' in entries[0]


def test_preflight_check_detects_pending_migration_and_hardware_mismatch(tmp_path, monkeypatch):
    app_root = tmp_path / "app"
    data_root = tmp_path / "data_root"
    (data_root / "data").mkdir(parents=True)
    (data_root / "data" / "PG_VERSION").write_text("16\n", encoding="utf-8")
    (data_root / ".env").write_text(
        "POSTGRES_PORT=5433\nDATABASE_URL=postgresql+asyncpg://postgres:postgres@127.0.0.1:5433/prashant_academy\n",
        encoding="utf-8",
    )
    app_root.mkdir(parents=True)
    backend_dir = Path(__file__).resolve().parents[1]

    heads, _all_revs, ordered = run_server._get_alembic_script_info(backend_dir)
    assert len(heads) == 1
    assert len(ordered) >= 2
    previous_rev = ordered[-2]

    async def _fake_inspect(_db_url, _known):
        return {
            "reachable": True,
            "postgres_version": "16.6",
            "has_alembic_version": True,
            "current_revisions": [previous_rev],
            "unknown_revisions": [],
            "has_institutions_table": True,
            "institutions_count": 1,
            "students_count": 25,
            "license": {
                "has_artifact": True,
                "serial_number": "263835371",
                "installation_id": "PRATHAM-B347-9CFE-842B-E65C",
                "tier": "COMMERCIAL",
                "status": "ACTIVE",
            },
        }

    monkeypatch.setattr(run_server, "_inspect_database_state", _fake_inspect)
    monkeypatch.setattr(
        "app.core.hardware.get_machine_hardware_fingerprint",
        lambda: "PRATHAM-B347-9CFE-842B-E65C",
    )

    code, report = run_server.run_preflight_check(
        app_root,
        backend_dir,
        data_root,
        start_pg_if_stopped=False,
        actor="pytest",
    )

    assert code == 0
    assert report["recommendation"] == "UPGRADE_WITH_MIGRATION"
    assert report["pending_migrations"] == [heads[0]]
    assert report["hardware_match"] is True
    assert report["license_present"] is True
    assert report["students_count"] == 25


def test_preflight_check_blocks_unknown_alembic_revision(tmp_path, monkeypatch):
    app_root = tmp_path / "app"
    data_root = tmp_path / "data_root"
    (data_root / "data").mkdir(parents=True)
    (data_root / "data" / "PG_VERSION").write_text("16\n", encoding="utf-8")
    (data_root / ".env").write_text(
        "DATABASE_URL=postgresql+asyncpg://postgres:postgres@127.0.0.1:5433/prashant_academy\n",
        encoding="utf-8",
    )
    app_root.mkdir(parents=True)
    backend_dir = Path(__file__).resolve().parents[1]

    async def _fake_inspect(_db_url, _known):
        return {
            "reachable": True,
            "postgres_version": "16.6",
            "has_alembic_version": True,
            "current_revisions": ["999_unknown_custom_revision"],
            "unknown_revisions": ["999_unknown_custom_revision"],
            "has_institutions_table": True,
            "institutions_count": 1,
            "students_count": 0,
            "license": {},
        }

    monkeypatch.setattr(run_server, "_inspect_database_state", _fake_inspect)

    code, report = run_server.run_preflight_check(
        app_root,
        backend_dir,
        data_root,
        start_pg_if_stopped=False,
    )

    assert code == 2
    assert report["recommendation"] == "MANUAL_INTERVENTION"


def test_migrate_only_verifies_head_and_records_audit_without_downgrade(tmp_path, monkeypatch):
    app_root = tmp_path / "app"
    data_root = tmp_path / "data_root"
    app_root.mkdir(parents=True)
    data_root.mkdir(parents=True)
    (data_root / ".env").write_text(
        "DATABASE_URL=postgresql+asyncpg://postgres:postgres@127.0.0.1:5433/prashant_academy\n",
        encoding="utf-8",
    )
    backend_dir = Path(__file__).resolve().parents[1]
    heads, _known, ordered = run_server._get_alembic_script_info(backend_dir)

    calls = iter([
        {"reachable": True, "current_revisions": [ordered[-2]], "unknown_revisions": []},
        {"reachable": True, "current_revisions": [heads[0]], "unknown_revisions": []},
    ])

    async def _fake_inspect(_db_url, _known):
        return next(calls)

    monkeypatch.setattr(run_server, "_inspect_database_state", _fake_inspect)

    from alembic import command

    upgraded = []
    monkeypatch.setattr(command, "upgrade", lambda _cfg, rev: upgraded.append(rev))

    code, result = run_server.run_migrate_only(
        app_root,
        backend_dir,
        data_root,
        backup_path="C:/backups/pre_upgrade.dump",
        actor="installer",
        start_pg=False,
    )

    assert code == 0
    assert upgraded == ["head"]
    assert result["outcome"] == "success"
    assert result["schema_after"] == [heads[0]]
    assert (data_root / ".bootstrap_complete").is_file()
    audit_text = (data_root / "logs" / "upgrade_audit.jsonl").read_text(encoding="utf-8")
    assert '"operation": "migrate_only"' in audit_text
    assert '"outcome": "success"' in audit_text
    assert "postgres:postgres@" not in audit_text


def test_resolve_data_root_avoids_split_brain_on_writable_drive(tmp_path, monkeypatch):
    app_root = tmp_path / "D_Drive" / "PrathamOneEduOS"
    local_app = tmp_path / "LocalAppData"
    app_root.mkdir(parents=True)
    (app_root / "data").mkdir(parents=True)  # e.g. empty/backups dir without PG_VERSION
    monkeypatch.setenv("LOCALAPPDATA", str(local_app))
    monkeypatch.delenv("PRATHAM_DATA_ROOT", raising=False)
    monkeypatch.setattr(run_server.sys, "argv", ["prathamone_backend.exe", "--migrate-only"])

    assert run_server._resolve_data_root(app_root) == local_app / "PrathamOneEduOS"

    # Once a portable PG_VERSION exists inside app_root\data, preserve it
    (app_root / "data" / "PG_VERSION").write_text("16\n", encoding="utf-8")
    assert run_server._resolve_data_root(app_root) == app_root

    # Explicit --data-root flag overrides both
    explicit = tmp_path / "ExplicitRoot"
    monkeypatch.setattr(run_server.sys, "argv", ["prathamone_backend.exe", "--migrate-only", "--data-root", str(explicit)])
    assert run_server._resolve_data_root(app_root) == explicit


def test_migrate_only_aborts_without_initdb_when_pg_cluster_missing(tmp_path):
    app_root = tmp_path / "app"
    (app_root / "pgsql" / "bin").mkdir(parents=True)
    (app_root / "pgsql" / "bin" / "postgres.exe").write_bytes(b"stub")
    data_root = tmp_path / "data_root"
    data_root.mkdir(parents=True)
    backend_dir = Path(__file__).resolve().parents[1]

    code, result = run_server.run_migrate_only(
        app_root,
        backend_dir,
        data_root,
        backup_path="C:/backups/pre_upgrade.dump",
        actor="installer",
        start_pg=True,
    )

    assert code == 1
    assert result["outcome"] == "failed"
    assert "aborting migration without initdb" in result["reason"].lower()
    assert (data_root / "logs" / "upgrade_audit.jsonl").is_file()


def test_start_embedded_postgres_uses_pg_ctl_start_for_elevated_safety(tmp_path, monkeypatch):
    app_root = tmp_path / "app"
    data_root = tmp_path / "data_root"
    (app_root / "pgsql" / "bin").mkdir(parents=True)
    (app_root / "pgsql" / "bin" / "postgres.exe").write_bytes(b"stub")
    (app_root / "pgsql" / "bin" / "pg_ctl.exe").write_bytes(b"stub")
    (data_root / "data").mkdir(parents=True)
    (data_root / "data" / "PG_VERSION").write_text("16\n", encoding="utf-8")
    (data_root / "data" / "postmaster.pid").write_text("1234\n", encoding="utf-8")
    (data_root / ".env").write_text("DATABASE_URL=postgresql+asyncpg://postgres:postgres@127.0.0.1:5433/prashant_academy\n", encoding="utf-8")
    (data_root / "data" / ".bootstrap_complete").write_text("unused", encoding="utf-8")

    calls = []

    class _FakeCompleted:
        returncode = 0
        stdout = "server started"
        stderr = ""

    def _fake_run(cmd, **_kwargs):
        calls.append(cmd)
        return _FakeCompleted()

    monkeypatch.setattr(run_server.subprocess, "run", _fake_run)
    monkeypatch.setattr(run_server, "_is_port_in_use", lambda _p: False)
    monkeypatch.setattr(run_server, "_clean_stale_pid_file", lambda _d: None)
    monkeypatch.setattr(run_server, "_run_inprocess_bootstrap", lambda *_a, **_k: None)

    handle, port = run_server._start_embedded_postgres(app_root, tmp_path / "backend", data_root=data_root)
    assert handle is not None
    assert port == 5432
    assert any("pg_ctl.exe" in cmd[0] and cmd[1] == "start" and "-w" in cmd for cmd in calls)
    assert not any("postgres.exe" in cmd[0] for cmd in calls)
    assert handle.poll() is None
    handle.terminate()
    assert any("pg_ctl.exe" in cmd[0] and cmd[1] == "stop" for cmd in calls)
