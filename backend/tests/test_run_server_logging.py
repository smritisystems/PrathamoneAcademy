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
#  * @updated     2026-11-26
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
