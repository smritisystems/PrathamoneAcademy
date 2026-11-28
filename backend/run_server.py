#!/usr/bin/env python3
# /**
#  * @file        run_server.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      backend.run_server
#  *
#  * @author      Jawahar R. Mallah
#  * @organization Smritisys & AITDL Networks
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 PrathamOne EduOS
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-25
#  * @updated     2026-11-28
#  *
#  * @description Standalone Windows backend entrypoint compiled with Nuitka.
#  */

import argparse
import asyncio
import atexit
import copy
import ctypes
import datetime
import faulthandler
import hashlib
import ipaddress
import json
import logging
from logging.handlers import RotatingFileHandler
import os
import re
import secrets
import shutil
import signal
import socket
import stat
import subprocess
import sys
import time
from pathlib import Path
from typing import Any, List, Optional
from urllib.parse import urlparse


def _resolve_dirs() -> tuple[Path, Path]:
    """Resolve backend directory and application root directory for both frozen Nuitka and dev runs."""
    exe_name = Path(sys.executable).name.lower()
    is_compiled = bool(getattr(sys, "frozen", False)) or (
        exe_name not in ("python.exe", "pythonw.exe", "python", "python3")
    )
    if is_compiled:
        backend_dir = Path(sys.executable).resolve().parent
    else:
        backend_dir = Path(__file__).resolve().parent
    return backend_dir, backend_dir.parent


def _is_dir_writable(path: Path) -> bool:
    try:
        path.mkdir(parents=True, exist_ok=True)
        probe = path / f".write_probe_{os.getpid()}"
        probe.write_text("ok", encoding="utf-8")
        probe.unlink(missing_ok=True)
        return True
    except Exception:
        return False


def _extract_cli_data_root() -> Optional[Path]:
    """Read optional --data-root <path> or --data-root=<path> CLI flag prior to full argparse."""
    argv = sys.argv[1:]
    for idx, arg in enumerate(argv):
        if arg.startswith("--data-root="):
            val = arg.split("=", 1)[1].strip().strip('"')
            if val:
                return Path(val)
        elif arg == "--data-root" and idx + 1 < len(argv):
            val = argv[idx + 1].strip().strip('"')
            if val:
                return Path(val)
    return None


def _resolve_data_root(app_root: Path) -> Path:
    """Resolve user-writable storage root for data/, logs/, backups/, and .env (aligned with PrathamOneLauncher.cs)."""
    cli_override = _extract_cli_data_root()
    if cli_override is not None:
        return cli_override

    override = os.getenv("PRATHAM_DATA_ROOT", "").strip()
    if override:
        return Path(override)

    # Preserve existing portable non-Program-Files clusters (e.g., D:\PrathamOneEduOS\data\PG_VERSION)
    existing_local_data = app_root / "data"
    prog_files = {
        p.lower()
        for p in (
            os.environ.get("ProgramFiles", ""),
            os.environ.get("ProgramFiles(x86)", ""),
            os.environ.get("ProgramW6432", ""),
        )
        if p
    }
    in_program_files = any(str(app_root).lower().startswith(pf) for pf in prog_files)
    if not in_program_files and (existing_local_data / "PG_VERSION").is_file() and _is_dir_writable(app_root):
        return app_root

    local_app_data = os.environ.get("LOCALAPPDATA")
    if local_app_data:
        return Path(local_app_data) / "PrathamOneEduOS"

    if not in_program_files and _is_dir_writable(app_root):
        return app_root

    try:
        return Path.home() / "AppData" / "Local" / "PrathamOneEduOS"
    except Exception:
        import tempfile
        return Path(tempfile.gettempdir()) / "PrathamOneEduOS"


BACKEND_DIR, APP_ROOT = _resolve_dirs()
DATA_ROOT = _resolve_data_root(APP_ROOT)
os.environ.setdefault("PRATHAM_APP_ROOT", str(APP_ROOT))
os.environ.setdefault("PRATHAM_DATA_ROOT", str(DATA_ROOT))
os.environ.setdefault("HOUSEKEEPING_BACKUPS_DIR", str(DATA_ROOT / "backups"))
os.environ.setdefault("HOUSEKEEPING_LEGACY_BACKUPS_DIR", str(DATA_ROOT / "data" / "backups"))
_EMBEDDED_PG_BIN_DIR = APP_ROOT / "pgsql" / "bin"
if _EMBEDDED_PG_BIN_DIR.is_dir():
    os.environ.setdefault("HOUSEKEEPING_PG_BIN_DIR", str(_EMBEDDED_PG_BIN_DIR))
    _cur_path = os.environ.get("PATH", "")
    if str(_EMBEDDED_PG_BIN_DIR) not in _cur_path.split(os.pathsep):
        os.environ["PATH"] = f"{_EMBEDDED_PG_BIN_DIR}{os.pathsep}{_cur_path}" if _cur_path else str(_EMBEDDED_PG_BIN_DIR)
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
os.chdir(str(BACKEND_DIR))


_LOG_FP = None
_ROTATING_LOG_HANDLER: Optional[RotatingFileHandler] = None
_STDIO_FALLBACK_LOCK = None
LOG_MAX_BYTES = 5 * 1024 * 1024
LOG_BACKUP_COUNT = 5


def _is_compiled_runtime() -> bool:
    exe_name = Path(sys.executable).name.lower()
    return bool(getattr(sys, "frozen", False)) or (
        exe_name not in ("python.exe", "pythonw.exe", "python", "python3")
    )


class _WindowsSafeRotatingFileHandler(RotatingFileHandler):
    """RotatingFileHandler that safely falls back to copy-truncate on Windows if another FD holds the file open."""

    def rotate(self, source: str, dest: str) -> None:
        try:
            super().rotate(source, dest)
        except PermissionError:
            if os.path.exists(source):
                shutil.copy2(source, dest)
                with open(source, "r+b") as fp:
                    fp.truncate(0)


def _clean_stray_root_logs(app_root: Path, data_root: Path) -> None:
    """Remove stale 0-byte log files outside <dataRoot>/logs when centralized log directory is active."""
    active_logs_dir = (data_root / "logs").resolve()
    candidate_dirs = {app_root.resolve(), data_root.resolve(), (data_root / "data").resolve()}
    for d in candidate_dirs:
        if d == active_logs_dir or not d.is_dir():
            continue
        for fname in ("backend_server.log", "launcher.log", "frontend_errors.log"):
            fpath = d / fname
            try:
                if fpath.is_file() and fpath.stat().st_size == 0:
                    fpath.unlink()
            except Exception:
                pass


def _ensure_stdio_streams(log_path: Path):
    """Unconditionally redirect stdout/stderr (plus OS FD 1/2 in frozen mode) to <dataRoot>/logs/backend_server.log."""
    global _LOG_FP
    log_path.parent.mkdir(parents=True, exist_ok=True)
    log_fp = open(str(log_path), "a", encoding="utf-8", buffering=1)
    if hasattr(log_fp, "reconfigure"):
        try:
            log_fp.reconfigure(write_through=True)
        except Exception:
            pass
    _LOG_FP = log_fp
    sys.stdout = log_fp
    sys.stderr = log_fp
    if _is_compiled_runtime():
        try:
            fd = log_fp.fileno()
            os.dup2(fd, 1)
            os.dup2(fd, 2)
        except Exception:
            pass
        try:
            faulthandler.enable(file=log_fp, all_threads=True)
        except Exception:
            pass
    return log_fp


def _get_rotating_handler(log_path: Path) -> _WindowsSafeRotatingFileHandler:
    global _ROTATING_LOG_HANDLER
    log_path.parent.mkdir(parents=True, exist_ok=True)
    if _ROTATING_LOG_HANDLER is None:
        handler = _WindowsSafeRotatingFileHandler(
            str(log_path),
            maxBytes=LOG_MAX_BYTES,
            backupCount=LOG_BACKUP_COUNT,
            encoding="utf-8",
        )
        handler.setFormatter(
            logging.Formatter("%(asctime)s [%(levelname)s] [%(name)s] %(message)s")
        )
        handler.setLevel(logging.INFO)
        _ROTATING_LOG_HANDLER = handler
    return _ROTATING_LOG_HANDLER


def _configure_rotating_logging(log_path: Path) -> None:
    """Attach a 5 MB x 5 RotatingFileHandler to root, uvicorn, fastapi, alembic, and app loggers."""
    handler = _get_rotating_handler(log_path)
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)
    if handler not in root_logger.handlers:
        root_logger.addHandler(handler)

    for logger_name in ("uvicorn", "uvicorn.error", "uvicorn.access", "fastapi", "alembic", "app"):
        target_logger = logging.getLogger(logger_name)
        target_logger.setLevel(logging.INFO)
        target_logger.handlers = [handler]
        target_logger.propagate = False

    def _log_uncaught_exc(exc_type, exc_value, exc_tb):
        if issubclass(exc_type, KeyboardInterrupt):
            return
        logging.getLogger("app").critical(
            "Uncaught backend exception", exc_info=(exc_type, exc_value, exc_tb)
        )

    sys.excepthook = _log_uncaught_exc
    if hasattr(threading_mod := __import__("threading"), "excepthook"):
        def _thread_exc_hook(args):
            logging.getLogger("app").error(
                "Uncaught exception in background thread %s",
                getattr(args.thread, "name", "unknown"),
                exc_info=(args.exc_type, args.exc_value, args.exc_traceback),
            )
        threading_mod.excepthook = _thread_exc_hook


def _create_uvicorn_handler(log_path: Path):
    """Return the shared Windows-safe rotating file handler for Uvicorn dictConfig."""
    return _get_rotating_handler(log_path)


def _build_uvicorn_log_config(log_path: Path) -> dict:
    """Build Uvicorn logging config writing cleanly through the 5 MB x 5 RotatingFileHandler."""
    import uvicorn.config

    cfg = copy.deepcopy(uvicorn.config.LOGGING_CONFIG)
    cfg["formatters"]["default"] = {
        "format": "%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
    }
    cfg["handlers"] = {
        "rotating_file": {
            "()": _create_uvicorn_handler,
            "log_path": log_path,
            "formatter": "default",
        },
    }
    cfg["loggers"] = {
        "uvicorn": {"handlers": ["rotating_file"], "level": "INFO", "propagate": False},
        "uvicorn.error": {"handlers": ["rotating_file"], "level": "INFO", "propagate": False},
        "uvicorn.access": {"handlers": ["rotating_file"], "level": "INFO", "propagate": False},
    }
    return cfg


def _is_port_in_use(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.5)
        return s.connect_ex(("127.0.0.1", port)) == 0


def _find_free_port(start_port: int, max_scan: int = 25) -> int:
    for p in range(start_port, start_port + max_scan):
        if not _is_port_in_use(p):
            return p
    return start_port


def _load_env_file(env_path: Path) -> dict[str, str]:
    loaded: dict[str, str] = {}
    if not env_path.is_file():
        return loaded
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            loaded[k.strip()] = v.strip().strip("'\"")
    return loaded


def _get_institute_slug(root_dir: Path) -> str:
    slug = "prathamone"
    cfg_file = root_dir / "setup_config.json"
    if cfg_file.is_file():
        try:
            data = json.loads(cfg_file.read_text(encoding="utf-8"))
            val = str(data.get("institute_name", ""))
            cleaned = "".join(c.lower() for c in val if c.isalnum())
            if cleaned and cleaned not in ("youracademyname", "institute"):
                return cleaned
        except Exception:
            pass
    env_vars = _load_env_file(root_dir / ".env")
    for key in ("INSTITUTE_SLUG", "INSTITUTE_NAME"):
        val = env_vars.get(key, "")
        cleaned = "".join(c.lower() for c in val if c.isalnum())
        if cleaned and cleaned not in ("youracademyname", "institute"):
            return cleaned
    return slug


def generate_local_pki(output_dir: Path, extra_slugs: Optional[List[str]] = None):
    """Generate Smritisys & AITDL local Root CA and SAN server SSL certificates."""
    from cryptography import x509
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import rsa
    from cryptography.x509.oid import ExtendedKeyUsageOID, NameOID

    output_dir.mkdir(parents=True, exist_ok=True)
    ca_cert_path = output_dir / "Smritisys_AITDL_Local_CA.cer"
    ca_key_path = output_dir / "Smritisys_AITDL_Local_CA.key"
    server_cert_path = output_dir / "prathamone_ssl_cert.pem"
    server_key_path = output_dir / "prathamone_ssl_key.pem"

    now = datetime.datetime.now(datetime.timezone.utc)
    ca_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    ca_name = x509.Name([
        x509.NameAttribute(NameOID.ORGANIZATION_NAME, "Smritisys & AITDL Networks"),
        x509.NameAttribute(NameOID.ORGANIZATIONAL_UNIT_NAME, "Security Operations"),
        x509.NameAttribute(NameOID.COMMON_NAME, "Smritisys & AITDL Networks Local Root CA"),
    ])
    ca_cert = (
        x509.CertificateBuilder()
        .subject_name(ca_name)
        .issuer_name(ca_name)
        .public_key(ca_key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(now - datetime.timedelta(days=1))
        .not_valid_after(now + datetime.timedelta(days=3650))
        .add_extension(x509.BasicConstraints(ca=True, path_length=None), critical=True)
        .add_extension(
            x509.KeyUsage(
                digital_signature=True,
                key_encipherment=False,
                key_cert_sign=True,
                crl_sign=True,
                content_commitment=False,
                data_encipherment=False,
                key_agreement=False,
                encipher_only=False,
                decipher_only=False,
            ),
            critical=True,
        )
        .sign(ca_key, hashes.SHA256())
    )
    ca_cert_path.write_bytes(ca_cert.public_bytes(serialization.Encoding.PEM))
    ca_key_path.write_bytes(
        ca_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.TraditionalOpenSSL,
            encryption_algorithm=serialization.NoEncryption(),
        )
    )

    server_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    server_name = x509.Name([
        x509.NameAttribute(NameOID.ORGANIZATION_NAME, "Smritisys & AITDL Networks"),
        x509.NameAttribute(NameOID.COMMON_NAME, "prathamone.local"),
    ])
    domain_names = [
        "localhost",
        "*.localhost",
        "prathamone",
        "prathamone.local",
        "classesname",
        "classesname.local",
    ]
    if extra_slugs:
        for slug in extra_slugs:
            cleaned = "".join(c.lower() for c in slug if c.isalnum())
            if cleaned and cleaned not in domain_names:
                domain_names.append(cleaned)
                domain_names.append(f"{cleaned}.local")

    san_list: List[x509.GeneralName] = [x509.DNSName(d) for d in domain_names]
    san_list.append(x509.IPAddress(ipaddress.IPv4Address("127.0.0.1")))
    san_list.append(x509.IPAddress(ipaddress.IPv6Address("::1")))

    try:
        host_name = socket.gethostname().lower()
        for h_variant in (host_name, f"{host_name}.local"):
            if h_variant not in domain_names:
                domain_names.append(h_variant)
                san_list.append(x509.DNSName(h_variant))
        _, _, ip_list = socket.gethostbyname_ex(host_name)
        for ip_str in ip_list:
            try:
                ip_obj = ipaddress.ip_address(ip_str)
                if not ip_obj.is_loopback and x509.IPAddress(ip_obj) not in san_list:
                    san_list.append(x509.IPAddress(ip_obj))
            except ValueError:
                pass
    except Exception:
        pass

    server_cert = (
        x509.CertificateBuilder()
        .subject_name(server_name)
        .issuer_name(ca_name)
        .public_key(server_key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(now - datetime.timedelta(days=1))
        .not_valid_after(now + datetime.timedelta(days=1825))
        .add_extension(x509.BasicConstraints(ca=False, path_length=None), critical=True)
        .add_extension(x509.SubjectAlternativeName(san_list), critical=False)
        .add_extension(x509.ExtendedKeyUsage([ExtendedKeyUsageOID.SERVER_AUTH]), critical=False)
        .sign(ca_key, hashes.SHA256())
    )
    server_cert_path.write_bytes(server_cert.public_bytes(serialization.Encoding.PEM))
    server_key_path.write_bytes(
        server_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.TraditionalOpenSSL,
            encryption_algorithm=serialization.NoEncryption(),
        )
    )
    print(f"[SSL PKI] Generated certificates in {output_dir} ({len(san_list)} SANs).")


def configure_local_domains(root_dir: Path, backend_port: int = 2026) -> None:
    """Configure Windows hosts entries and portproxy rules cleanly."""
    slug = _get_institute_slug(root_dir)
    hosts_path = Path(r"C:\Windows\System32\drivers\etc\hosts")
    if hosts_path.exists():
        try:
            content = hosts_path.read_text(encoding="utf-8", errors="ignore")
            required = ["prathamone", "prathamone.local", "classesname", "classesname.local"]
            if slug and slug not in required:
                required.extend([slug, f"{slug}.local"])
            missing = [d for d in required if not re.search(rf"\b{re.escape(d)}\b", content, re.IGNORECASE)]
            if missing:
                entries = "\n\n# PrathamOne EduOS Local Domain Aliases\n" + "".join(
                    f"127.0.0.1    {d}\n" for d in missing
                )
                os.chmod(str(hosts_path), stat.S_IWRITE)
                with open(str(hosts_path), "a", encoding="utf-8") as f:
                    f.write(entries)
                subprocess.run(["ipconfig", "/flushdns"], capture_output=True, check=False)
        except Exception as exc:
            print(f"[HOSTS WARN] {exc}")

    for cmd in [
        ["netsh", "interface", "portproxy", "add", "v4tov4", "listenport=80", "listenaddress=127.0.0.1", f"connectport={backend_port}", "connectaddress=127.0.0.1"],
        ["netsh", "interface", "portproxy", "add", "v4tov4", "listenport=443", "listenaddress=127.0.0.1", f"connectport={backend_port}", "connectaddress=127.0.0.1"],
        ["netsh", "advfirewall", "firewall", "add", "rule", "name=PrathamOne EduOS Local Network", "dir=in", "action=allow", "protocol=TCP", f"localport={backend_port},80,443"],
    ]:
        try:
            subprocess.run(cmd, capture_output=True, check=False)
        except Exception:
            pass


def _ensure_env_file(root_dir: Path, db_port: int, db_password: str, institute_name: str = "", data_root: Optional[Path] = None) -> Path:
    effective_root = data_root or root_dir
    env_path = effective_root / ".env"
    env_example = root_dir / ".env.example"

    if env_path.exists():
        # Keep existing <dataRoot>\.env intact as SSOT, but synchronize active embedded pg_port if drifted
        try:
            existing_lines = env_path.read_text(encoding="utf-8").splitlines()
            expected_url = f"postgresql+asyncpg://postgres:{db_password}@127.0.0.1:{db_port}/prashant_academy"
            updated_lines = []
            changed = False
            saw_port = False
            saw_url = False
            for line in existing_lines:
                if line.startswith("POSTGRES_PORT="):
                    saw_port = True
                    target_line = f"POSTGRES_PORT={db_port}"
                    if line != target_line:
                        changed = True
                    updated_lines.append(target_line)
                elif line.startswith("DATABASE_URL="):
                    saw_url = True
                    if line != f"DATABASE_URL={expected_url}":
                        changed = True
                    updated_lines.append(f"DATABASE_URL={expected_url}")
                else:
                    updated_lines.append(line)
            if not saw_port:
                updated_lines.append(f"POSTGRES_PORT={db_port}")
                changed = True
            if not saw_url:
                updated_lines.append(f"DATABASE_URL={expected_url}")
                changed = True
            if changed:
                env_path.write_text("\n".join(updated_lines) + "\n", encoding="utf-8")
        except Exception:
            pass
        return env_path

    if not env_example.exists():
        secret_key = secrets.token_hex(32)
        db_url = f"postgresql+asyncpg://postgres:{db_password}@127.0.0.1:{db_port}/prashant_academy"
        content = (
            f"POSTGRES_USER=postgres\n"
            f"POSTGRES_PASSWORD={db_password}\n"
            f"POSTGRES_DB=prashant_academy\n"
            f"POSTGRES_PORT={db_port}\n"
            f"DATABASE_URL={db_url}\n"
            f"SECRET_KEY={secret_key}\n"
            f"ALGORITHM=HS256\n"
        )
    else:
        content = env_example.read_text(encoding="utf-8")
        secret_key = secrets.token_hex(32)
        db_url = f"postgresql+asyncpg://postgres:{db_password}@127.0.0.1:{db_port}/prashant_academy"
        lines = []
        for line in content.splitlines():
            if line.startswith("SECRET_KEY="):
                lines.append(f"SECRET_KEY={secret_key}")
            elif line.startswith("POSTGRES_PORT="):
                lines.append(f"POSTGRES_PORT={db_port}")
            elif line.startswith("POSTGRES_PASSWORD="):
                lines.append(f"POSTGRES_PASSWORD={db_password}")
            elif line.startswith("DATABASE_URL="):
                lines.append(f"DATABASE_URL={db_url}")
            else:
                lines.append(line)
        content = "\n".join(lines) + "\n"

    slug = "".join(c.lower() for c in institute_name if c.isalnum()) or "prathamone"
    if "INSTITUTE_NAME=" not in content:
        content += f'\nINSTITUTE_NAME="{institute_name}"\nINSTITUTE_SLUG="{slug}"\n'

    env_path.parent.mkdir(parents=True, exist_ok=True)
    env_path.write_text(content, encoding="utf-8")
    return env_path


async def _ensure_database_exists(db_url: str):
    import asyncpg

    clean_url = db_url.replace("postgresql+asyncpg://", "postgresql://")
    parsed = urlparse(clean_url)
    target_db = parsed.path.lstrip("/") or "prashant_academy"
    user = parsed.username or "postgres"
    password = parsed.password or ""
    host = parsed.hostname or "127.0.0.1"
    port = parsed.port or 5432

    conn = None
    try:
        conn = await asyncpg.connect(user=user, password=password, host=host, port=port, database="postgres", timeout=10.0)
        exists = await conn.fetchval("SELECT 1 FROM pg_database WHERE datname = $1", target_db)
        if not exists:
            await conn.execute(f'CREATE DATABASE "{target_db}" OWNER "{user}" ENCODING "UTF8"')
    finally:
        if conn:
            await conn.close()


async def _save_license_credentials(db_url: str, serial_number: str, activation_key: str):
    if not serial_number and not activation_key:
        return
    import asyncpg

    clean_url = db_url.replace("postgresql+asyncpg://", "postgresql://")
    conn = None
    try:
        conn = await asyncpg.connect(clean_url)
        row = await conn.fetchrow("SELECT id FROM institutions ORDER BY id ASC LIMIT 1")
        inst_id = row["id"] if row else 1
        if serial_number:
            await conn.execute(
                """
                INSERT INTO institution_settings (institution_id, category, key, value, data_type, is_secret, is_public, description, created_at, updated_at)
                VALUES ($1, 'licensing', 'license.serial_number', $2, 'string', false, false, 'Serial number captured during setup', NOW(), NOW())
                ON CONFLICT (institution_id, key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
                """,
                inst_id,
                serial_number,
            )
        if activation_key:
            await conn.execute(
                """
                INSERT INTO institution_settings (institution_id, category, key, value, data_type, is_secret, is_public, description, created_at, updated_at)
                VALUES ($1, 'licensing', 'license.activation_identifier', $2, 'string', false, false, 'Activation key captured during setup', NOW(), NOW())
                ON CONFLICT (institution_id, key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
                """,
                inst_id,
                activation_key,
            )
    except Exception as exc:
        print(f"[BOOTSTRAP WARN] Failed to store license keys: {exc}")
    finally:
        if conn:
            await conn.close()


def _run_inprocess_bootstrap(root_dir: Path, backend_dir: Path, pg_port: int, data_root: Optional[Path] = None):
    """Execute zero-touch DB creation, Alembic migrations, master seeding, and PKI verification."""
    effective_root = data_root or root_dir
    cfg_file = effective_root / "setup_config.json"
    if not cfg_file.exists():
        cfg_file = root_dir / "setup_config.json"
    setup_config = {}
    if cfg_file.exists():
        try:
            setup_config = json.loads(cfg_file.read_text(encoding="utf-8"))
        except Exception:
            pass

    has_setup_wizard_config = bool(setup_config)
    explicit_admin_pw = (
        setup_config.get("bootstrap_admin_secret")
        or setup_config.get("admin_password")
    )
    raw_inst_name = str(setup_config.get("institute_name") or "").strip()
    institute_name = (
        raw_inst_name
        if raw_inst_name and raw_inst_name != "Prashant Academy Coaching Institute"
        else "Your Academy Name"
    )
    branch_name = str(setup_config.get("branch_name", "Main Campus")).strip() or "Main Campus"
    address = str(setup_config.get("address", "Campus Address, Education Hub")).strip() or "Campus Address, Education Hub"
    phone = str(setup_config.get("phone", "+91-8779-123-007")).strip() or "+91-8779-123-007"
    boards = setup_config.get("boards") or "MSBSHSE,CBSE,ICSE,GSEB,COMPETITIVE"
    mediums = setup_config.get("mediums") or "English,Semi-English,Hindi,Marathi,Gujarati"

    logo_url = "/media/logo/prathamone-symbol-icon.svg"
    raw_logo_path = str(setup_config.get("logo_path", "")).strip()
    if raw_logo_path and Path(raw_logo_path).is_file():
        try:
            logo_ext = Path(raw_logo_path).suffix or ".png"
            dest_name = f"custom-academy-logo{logo_ext}"
            for sub in ("frontend/dist/media/logo", "backend/media/logo"):
                dest_dir = root_dir / sub
                if _is_dir_writable(dest_dir):
                    dest_dir.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(raw_logo_path, dest_dir / dest_name)
            logo_url = f"/media/logo/{dest_name}"
        except Exception:
            pass

    env_path = effective_root / ".env"
    env_vars = _load_env_file(env_path)
    if not env_vars and not env_path.exists():
        env_vars = _load_env_file(root_dir / ".env")
    db_password = env_vars.get("POSTGRES_PASSWORD") or "postgres"
    _ensure_env_file(root_dir, pg_port, db_password, institute_name, data_root=effective_root)
    env_vars = _load_env_file(env_path)
    os.environ["PRATHAM_ENV_FILE"] = str(env_path)
    os.environ.update(env_vars)

    db_url = f"postgresql+asyncpg://postgres:{db_password}@127.0.0.1:{pg_port}/prashant_academy"
    os.environ["POSTGRES_PORT"] = str(pg_port)
    os.environ["DATABASE_URL"] = db_url
    if explicit_admin_pw:
        os.environ["INITIAL_ADMIN_PASSWORD"] = explicit_admin_pw
        os.environ["FORCE_ADMIN_PASSWORD_RESET"] = "1"
    else:
        os.environ.pop("INITIAL_ADMIN_PASSWORD", None)
        os.environ.pop("FORCE_ADMIN_PASSWORD_RESET", None)

    if has_setup_wizard_config:
        os.environ["FORCE_INSTITUTE_PROFILE_RESET"] = "1"
    else:
        os.environ.pop("FORCE_INSTITUTE_PROFILE_RESET", None)

    os.environ["INSTITUTE_NAME"] = institute_name
    os.environ["INSTITUTE_BRANCH"] = branch_name
    os.environ["INSTITUTE_ADDRESS"] = address
    os.environ["INSTITUTE_PHONE"] = phone
    os.environ["INSTITUTE_LOGO_URL"] = logo_url
    os.environ["SEED_BOARDS"] = boards
    os.environ["SEED_MEDIUMS"] = mediums

    asyncio.run(_ensure_database_exists(db_url))

    alembic_ini = backend_dir / "alembic.ini"
    if alembic_ini.exists():
        from alembic import command
        from alembic.config import Config

        alembic_cfg = Config(str(alembic_ini))
        alembic_cfg.set_main_option("script_location", str(backend_dir / "alembic"))
        alembic_cfg.attributes["database_url"] = db_url
        try:
            command.upgrade(alembic_cfg, "head")
        except Exception:
            logging.getLogger("alembic").exception("Alembic upgrade head failed during bootstrap")
            raise

    import seed
    try:
        asyncio.run(seed.seed(bootstrap_only=True))
    except Exception:
        logging.getLogger("app").exception("Database bootstrap seeding failed")
        raise

    serial_number = str(setup_config.get("serial_number", "")).strip()
    activation_key = str(setup_config.get("activation_key", "")).strip()
    asyncio.run(_save_license_credentials(db_url, serial_number, activation_key))

    slug = "".join(c.lower() for c in institute_name if c.isalnum())
    assets_dir = root_dir / "assets"
    if not (assets_dir / "prathamone_ssl_cert.pem").exists() and _is_dir_writable(assets_dir):
        generate_local_pki(assets_dir, extra_slugs=[slug] if slug else None)

    app_ver, build_num = _resolve_app_version_metadata()
    bootstrap_marker = effective_root / ".bootstrap_complete"
    try:
        bootstrap_marker.parent.mkdir(parents=True, exist_ok=True)
        bootstrap_marker.write_text(
            json.dumps(
                {
                    "version": app_ver,
                    "build_number": build_num,
                    "updated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                },
                indent=2,
            ),
            encoding="utf-8",
        )
    except Exception:
        pass

    for cand_cfg in {cfg_file, effective_root / "setup_config.json", root_dir / "setup_config.json"}:
        if cand_cfg.exists():
            try:
                cand_cfg.unlink()
            except Exception:
                pass


def _clean_stale_pid_file(data_dir: Path):
    pid_file = data_dir / "postmaster.pid"
    if not pid_file.exists():
        return
    try:
        lines = pid_file.read_text(encoding="utf-8").splitlines()
        if lines:
            pid = int(lines[0].strip())
            is_alive = False
            if sys.platform == "win32":
                h = ctypes.windll.kernel32.OpenProcess(0x1000, False, pid)
                if h:
                    ctypes.windll.kernel32.CloseHandle(h)
                    is_alive = True
            if not is_alive:
                pid_file.unlink(missing_ok=True)
    except Exception:
        try:
            pid_file.unlink(missing_ok=True)
        except Exception:
            pass


class _PgCtlProcessHandle:
    """Process-like handle for pg_ctl-managed PostgreSQL so shutdown hooks stop cleanly."""

    def __init__(self, data_dir: Path, pg_ctl: Path):
        self._data_dir = data_dir
        self._pg_ctl = pg_ctl
        self._stopped = False

    def poll(self) -> Optional[int]:
        if self._stopped or not (self._data_dir / "postmaster.pid").is_file():
            return 0
        return None

    def terminate(self) -> None:
        if self._stopped:
            return
        flags = 0x08000000 if sys.platform == "win32" else 0
        if self._pg_ctl.exists() and self._data_dir.exists():
            subprocess.run(
                [str(self._pg_ctl), "stop", "-w", "-t", "20", "-D", str(self._data_dir), "-m", "fast"],
                stdin=subprocess.DEVNULL,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                creationflags=flags,
                timeout=25,
            )
        self._stopped = True


def _start_embedded_postgres(
    root_dir: Path,
    backend_dir: Path,
    data_root: Optional[Path] = None,
    run_bootstrap: bool = True,
) -> tuple[Optional[Any], int]:
    """Start embedded PostgreSQL if present in app_root/pgsql, returning (proc_handle, pg_port)."""
    effective_root = data_root or root_dir
    pgsql_dir = root_dir / "pgsql"
    data_dir = effective_root / "data"
    logs_dir = effective_root / "logs"
    pg_ctl = pgsql_dir / "bin" / "pg_ctl.exe"
    postgres_exe = pgsql_dir / "bin" / "postgres.exe"
    pg_isready = pgsql_dir / "bin" / "pg_isready.exe"
    initdb = pgsql_dir / "bin" / "initdb.exe"
    flags = 0x08000000 if sys.platform == "win32" else 0

    if not postgres_exe.exists():
        return None, int(os.getenv("POSTGRES_PORT", "5432"))

    _clean_stale_pid_file(data_dir)
    if not (data_dir / "PG_VERSION").exists() and (pg_ctl.exists() or initdb.exists()):
        data_dir.mkdir(parents=True, exist_ok=True)
        if pg_ctl.exists():
            # pg_ctl drops elevated Windows Admin tokens automatically before invoking initdb/postgres.
            subprocess.run(
                [str(pg_ctl), "init", "-D", str(data_dir), "-o", "-U postgres -A trust --encoding=UTF8 --locale=C --no-instructions"],
                cwd=str(pg_ctl.parent),
                stdin=subprocess.DEVNULL,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                check=True,
                creationflags=flags,
            )
        else:
            subprocess.run(
                [str(initdb), "-D", str(data_dir), "-U", "postgres", "-A", "trust", "--encoding=UTF8", "--locale=C", "--no-instructions"],
                check=True,
                creationflags=flags,
            )

    own_pid_file = data_dir / "postmaster.pid"
    own_running_port = None
    if own_pid_file.exists():
        try:
            pid_lines = own_pid_file.read_text(encoding="utf-8", errors="ignore").splitlines()
            if len(pid_lines) >= 4 and pid_lines[3].strip().isdigit():
                cand_port = int(pid_lines[3].strip())
                if _is_port_in_use(cand_port):
                    own_running_port = cand_port
        except Exception:
            pass

    if own_running_port:
        pg_port = own_running_port
    else:
        pg_port = next((p for p in range(5432, 5450) if not _is_port_in_use(p)), 5433)
    if pg_port != 5432:
        conf_file = data_dir / "postgresql.conf"
        if conf_file.exists() and f"port = {pg_port}" not in conf_file.read_text(encoding="utf-8"):
            with open(conf_file, "a", encoding="utf-8") as f:
                f.write(f"\nport = {pg_port}\n")

    pg_proc: Optional[Any] = None
    if not _is_port_in_use(pg_port):
        data_dir.mkdir(parents=True, exist_ok=True)
        logs_dir.mkdir(parents=True, exist_ok=True)
        pg_log_path = logs_dir / "pg_server.log"
        if pg_ctl.exists():
            # Use pg_ctl start -w with DEVNULL stdio so postgres.exe never keeps PIPE handles open on Windows.
            start_res = subprocess.run(
                [str(pg_ctl), "start", "-w", "-t", "90", "-D", str(data_dir), "-o", f"-p {pg_port}", "-l", str(pg_log_path)],
                cwd=str(pg_ctl.parent),
                stdin=subprocess.DEVNULL,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                creationflags=flags,
            )
            if start_res.returncode != 0:
                detail = pg_log_path.read_text(encoding="utf-8", errors="ignore")[-800:].strip() if pg_log_path.is_file() else ""
                raise RuntimeError(f"Embedded PostgreSQL pg_ctl start failed (exit {start_res.returncode}): {detail}")
            pg_proc = _PgCtlProcessHandle(data_dir, pg_ctl)
        else:
            pg_log = open(str(data_dir / "pg_server.log"), "a", encoding="utf-8")
            pg_proc = subprocess.Popen(
                [str(postgres_exe), "-D", str(data_dir), "-p", str(pg_port)],
                stdout=pg_log,
                stderr=pg_log,
                creationflags=flags,
            )
            for _ in range(90):
                if pg_isready.exists():
                    chk = subprocess.run(
                        [str(pg_isready), "-h", "127.0.0.1", "-p", str(pg_port), "-U", "postgres"],
                        capture_output=True,
                        creationflags=flags,
                    )
                    if chk.returncode == 0:
                        break
                elif _is_port_in_use(pg_port):
                    break
                time.sleep(0.5)

    if run_bootstrap:
        # Check if bootstrap/alembic stamp needs execution
        bootstrap_marker = data_dir / ".bootstrap_complete"
        alembic_dir = backend_dir / "alembic" / "versions"
        stamp_src = b"standalone"
        if alembic_dir.exists():
            stamp_src += "|".join(sorted(p.name for p in alembic_dir.iterdir())).encode("utf-8")
        current_stamp = hashlib.sha256(stamp_src).hexdigest()
        needs_bootstrap = (
            not (effective_root / ".env").exists()
            or (effective_root / "setup_config.json").exists()
            or (root_dir / "setup_config.json").exists()
            or not bootstrap_marker.exists()
            or bootstrap_marker.read_text(encoding="utf-8").strip() != current_stamp
        )
        if needs_bootstrap:
            _run_inprocess_bootstrap(root_dir, backend_dir, pg_port, data_root=effective_root)
            bootstrap_marker.write_text(current_stamp, encoding="utf-8")

    return pg_proc, pg_port


def _stop_postgres_graceful(root_dir: Path, pg_proc: Optional[Any], data_root: Optional[Path] = None):
    effective_root = data_root or root_dir
    pg_ctl = root_dir / "pgsql" / "bin" / "pg_ctl.exe"
    data_dir = effective_root / "data"
    flags = 0x08000000 if sys.platform == "win32" else 0
    if pg_proc and pg_proc.poll() is None and pg_ctl.exists() and data_dir.exists():
        try:
            subprocess.run(
                [str(pg_ctl), "stop", "-w", "-t", "20", "-D", str(data_dir), "-m", "fast"],
                stdin=subprocess.DEVNULL,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                creationflags=flags,
                timeout=25,
            )
        except Exception:
            try:
                pg_proc.terminate()
            except Exception:
                pass


def _nuitka_dependency_hints():
    """Ensure Nuitka standalone includes dynamic runtime dependencies used by external app/ modules."""
    import aiohttp.client  # noqa
    import alembic  # noqa
    import asyncpg  # noqa
    import bcrypt  # noqa
    import click  # noqa
    import cryptography  # noqa
    import cryptography.exceptions  # noqa
    import cryptography.hazmat.primitives  # noqa
    import cryptography.hazmat.primitives.asymmetric.ed25519  # noqa
    import cryptography.hazmat.primitives.ciphers.aead  # noqa
    import dotenv  # noqa
    import email_validator  # noqa
    import fastapi  # noqa
    import fastapi.security  # noqa
    import greenlet  # noqa
    import h11  # noqa
    import httpx  # noqa
    import jinja2  # noqa
    import jwt  # noqa
    import jwt.exceptions  # noqa
    import limits  # noqa
    import limits.aio  # noqa
    import limits.storage  # noqa
    import multipart  # noqa
    import openpyxl  # noqa
    import openpyxl.styles  # noqa
    import openpyxl.utils  # noqa
    import passlib  # noqa
    import passlib.handlers.bcrypt  # noqa
    import PIL.Image  # noqa
    import psycopg2  # noqa
    import pydantic  # noqa
    import pydantic_core  # noqa
    import pydantic_settings  # noqa
    import python_multipart  # noqa
    import qrcode  # noqa
    import qrcode.image.svg  # noqa
    import slowapi  # noqa
    import slowapi.util  # noqa
    import sqlalchemy  # noqa
    import sqlalchemy.dialects.postgresql  # noqa
    import sqlalchemy.dialects.postgresql.asyncpg  # noqa
    import sqlalchemy.ext.asyncio  # noqa
    import sqlalchemy.orm  # noqa
    import sqlalchemy.pool  # noqa
    import starlette  # noqa
    import starlette.requests  # noqa
    import tzdata  # noqa
    import uvicorn  # noqa
    import uvicorn.lifespan.on  # noqa
    import uvicorn.loops.asyncio  # noqa
    import uvicorn.protocols.http.h11_impl  # noqa
    import uvicorn.protocols.websockets.websockets_impl  # noqa
    import websockets  # noqa
    import binascii  # noqa
    import calendar  # noqa
    import csv  # noqa
    import dataclasses  # noqa
    import decimal  # noqa
    import faulthandler  # noqa
    import functools  # noqa
    import gzip  # noqa
    import hmac  # noqa
    import html  # noqa
    import ipaddress  # noqa
    import logging.config  # noqa
    import logging.handlers  # noqa
    import math  # noqa
    import string  # noqa
    import struct  # noqa
    import tempfile  # noqa
    import urllib.error  # noqa
    import urllib.request  # noqa
    import uuid  # noqa
    import winreg  # noqa
    import zipfile  # noqa
    import zoneinfo  # noqa


def _create_progressive_asgi_app(shutdown_callback=None):
    """Bind /health, /openapi.json, and SPA static assets immediately while loading full routers in background."""
    import threading
    from fastapi import FastAPI, Request
    from fastapi.responses import FileResponse, JSONResponse, Response
    from fastapi.staticfiles import StaticFiles

    bootstrap_app = FastAPI(
        title="PrathamOne EduOS — Coaching Institute Edition",
        version="1.0.0",
        docs_url=None,
        redoc_url=None,
    )

    @bootstrap_app.middleware("http")
    async def _bootstrap_ipc_guard(request: Request, call_next):
        desktop_token = os.getenv("PRATHAM_DESKTOP_TOKEN")
        path = request.url.path or ""

        async def _proceed():
            resp = await call_next(request)
            if path.startswith("/api/") or path == "/health" or path.startswith("/health/"):
                resp.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
                resp.headers["Pragma"] = "no-cache"
                resp.headers["Expires"] = "0"
            return resp

        if not desktop_token:
            return await _proceed()
        if path == "/health" or path.startswith("/health/"):
            return await _proceed()
        client_host = request.client.host if request.client else "127.0.0.1"
        is_loopback = False
        is_private_lan = False
        try:
            ip_obj = ipaddress.ip_address(client_host)
            is_loopback = ip_obj.is_loopback
            is_private_lan = ip_obj.is_private and not ip_obj.is_loopback
        except ValueError:
            is_loopback = client_host in ("127.0.0.1", "::1", "localhost")

        if is_loopback:
            token_hdr = request.headers.get("x-pratham-client-token")
            cookie_token = request.cookies.get("pratham_client_token")
            if not ((token_hdr == desktop_token) or (cookie_token == desktop_token)):
                return JSONResponse(
                    status_code=403,
                    content={
                        "detail": "Direct loopback access forbidden. Please launch PrathamOne EduOS via the native desktop application."
                    },
                )
            response = await _proceed()
            if token_hdr == desktop_token and cookie_token != desktop_token:
                response.set_cookie(
                    key="pratham_client_token",
                    value=desktop_token,
                    httponly=True,
                    samesite="lax",
                    path="/",
                    secure=(request.url.scheme == "https"),
                )
            return response

        allow_lan = os.getenv("PRATHAM_ALLOW_LAN_ACCESS", "true").lower() in ("true", "1", "yes")
        if is_private_lan and not allow_lan:
            return JSONResponse(
                status_code=403,
                content={"detail": "LAN network access is disabled by institute administrator."},
            )
        if not is_private_lan:
            return JSONResponse(
                status_code=403,
                content={"detail": "External untrusted network access forbidden."},
            )
        return await _proceed()

    static_dir = os.getenv(
        "STATIC_DIR",
        os.path.join(str(APP_ROOT), "frontend", "dist"),
    )

    @bootstrap_app.get("/")
    async def _bootstrap_root():
        index_file = os.path.join(static_dir, "index.html")
        if os.path.isdir(static_dir) and os.path.isfile(index_file):
            return FileResponse(index_file)
        return {"product": "PrathamOne EduOS", "status": "initializing"}

    @bootstrap_app.get("/health")
    async def _bootstrap_health():
        return {
            "status": "healthy",
            "product": "PrathamOne EduOS",
            "version": "1.182.0",
            "alembic_head": "057_repair_teacher_assignments",
        }

    if os.path.isdir(static_dir) and os.path.isfile(os.path.join(static_dir, "index.html")):
        assets_dir = os.path.join(static_dir, "assets")
        if os.path.isdir(assets_dir):
            bootstrap_app.mount("/assets", StaticFiles(directory=assets_dir), name="bootstrap_spa_assets")

        @bootstrap_app.get("/{full_path:path}", include_in_schema=False)
        async def _bootstrap_spa(full_path: str):
            if full_path == "api" or full_path.startswith("api/"):
                return JSONResponse(status_code=404, content={"detail": "API endpoint not found"})
            if full_path == "health":
                return {"status": "healthy"}
            static_root = Path(static_dir).resolve()
            candidate = (static_root / full_path).resolve()
            if candidate.is_relative_to(static_root) and candidate.is_file():
                return FileResponse(str(candidate))
            return FileResponse(os.path.join(static_dir, "index.html"))

    state = {
        "real_app": None,
        "ready_event": None,
        "error": None,
    }

    async def _finalize_real_app(loaded_app):
        try:
            await loaded_app.router.startup()
            state["real_app"] = loaded_app
        except Exception as exc:
            logging.getLogger("app").exception("FastAPI router startup failed")
            state["error"] = f"{type(exc).__name__}: {exc}"
        finally:
            if state["ready_event"] is not None:
                state["ready_event"].set()

    def _background_import(loop: asyncio.AbstractEventLoop):
        try:
            from app.main import app as loaded_app
            loop.call_soon_threadsafe(lambda: asyncio.create_task(_finalize_real_app(loaded_app)))
        except Exception as exc:
            logging.getLogger("app").exception("Failed to import app.main in background loader")
            state["error"] = f"{type(exc).__name__}: {exc}"
            if state["ready_event"] is not None:
                loop.call_soon_threadsafe(state["ready_event"].set)

    async def _wait_for_real_app():
        ev = state["ready_event"]
        if ev is not None and not ev.is_set():
            await asyncio.wait_for(ev.wait(), timeout=120.0)

    async def progressive_asgi(scope, receive, send):
        real_app = state["real_app"]
        scope_type = scope.get("type")

        if scope_type == "lifespan":
            while True:
                message = await receive()
                msg_type = message.get("type")
                if msg_type == "lifespan.startup":
                    state["ready_event"] = asyncio.Event()
                    loop = asyncio.get_running_loop()
                    threading.Thread(
                        target=_background_import,
                        args=(loop,),
                        name="prathamone-router-loader",
                        daemon=True,
                    ).start()
                    await send({"type": "lifespan.startup.complete"})
                elif msg_type == "lifespan.shutdown":
                    loaded = state["real_app"]
                    if loaded is not None:
                        try:
                            await loaded.router.shutdown()
                        except Exception:
                            pass
                        try:
                            from app.core.database import engine
                            await engine.dispose()
                        except Exception:
                            pass
                    await send({"type": "lifespan.shutdown.complete"})
                    return
            return

        path = scope.get("path", "")
        if path == "/_desktop/shutdown" and scope.get("method") == "POST" and shutdown_callback is not None:
            desktop_token = os.getenv("PRATHAM_DESKTOP_TOKEN")
            client_host = (scope.get("client") or ("127.0.0.1", 0))[0]
            try:
                is_loopback = ipaddress.ip_address(client_host).is_loopback
            except ValueError:
                is_loopback = client_host in ("127.0.0.1", "::1", "localhost")
            hdrs = {k.decode("latin1").lower(): v.decode("latin1") for k, v in scope.get("headers", [])}
            token_ok = bool(desktop_token) and hdrs.get("x-pratham-client-token") == desktop_token
            if is_loopback and token_ok:
                shutdown_callback()
                resp = JSONResponse(status_code=200, content={"status": "shutting_down"})
            else:
                resp = JSONResponse(status_code=403, content={"detail": "Forbidden"})
            await resp(scope, receive, send)
            return

        if real_app is not None:
            try:
                await real_app(scope, receive, send)
            except Exception:
                logging.getLogger("app").exception(
                    "Unhandled ASGI exception on %s %s",
                    scope.get("method", "WS"),
                    scope.get("path", ""),
                )
                raise
            return

        if scope_type == "websocket":
            await _wait_for_real_app()
            if state["real_app"] is not None:
                await state["real_app"](scope, receive, send)
            return

        path = scope.get("path", "")
        if path.startswith("/api/"):
            await _wait_for_real_app()
            if state["real_app"] is not None:
                await state["real_app"](scope, receive, send)
                return
            err_resp = JSONResponse(
                status_code=503,
                content={"detail": f"Backend initializing or unavailable: {state['error'] or 'timeout'}"},
            )
            await err_resp(scope, receive, send)
            return

        await bootstrap_app(scope, receive, send)

    return progressive_asgi


# Populated inside clean_src during ADR-009 Gate 2 release builds
_EXPECTED_PYD_MANIFEST: Optional[dict[str, str]] = None


def _preload_data_root_env(app_root: Path, data_root: Path) -> tuple[Optional[Path], dict[str, str]]:
    """Load <data_root>/.env (or <app_root>/.env) into os.environ before importing app.core.config."""
    env_path = data_root / ".env"
    if not env_path.is_file() and (app_root / ".env").is_file():
        env_path = app_root / ".env"
    env_vars = _load_env_file(env_path)
    if env_path.is_file():
        os.environ.setdefault("PRATHAM_ENV_FILE", str(env_path))
        for k, v in env_vars.items():
            os.environ.setdefault(k, v)
    if len(os.environ.get("SECRET_KEY", "").strip()) < 32:
        os.environ["SECRET_KEY"] = secrets.token_hex(32)
    return (env_path if env_path.is_file() else None), env_vars


def _resolve_app_version_metadata() -> tuple[str, str]:
    """Return (VERSION, BUILD_NUMBER) without exposing secrets or failing when .env has not initialized."""
    manifest_file = BACKEND_DIR / "app" / "release_manifest.json"
    if manifest_file.is_file():
        try:
            manifest = json.loads(manifest_file.read_text(encoding="utf-8"))
            ver = str(manifest.get("version") or "").strip()
            bld = str(manifest.get("build_number") or "").strip()
            if ver:
                return ver, bld or ver
        except Exception:
            pass

    had_db_url = "DATABASE_URL" in os.environ
    had_secret = "SECRET_KEY" in os.environ
    if not had_db_url:
        os.environ["DATABASE_URL"] = "postgresql+asyncpg://postgres:postgres@127.0.0.1:5432/prashant_academy"
    if not had_secret:
        os.environ["SECRET_KEY"] = "metadata_probe_secret_key_for_version_inspection_only_1234567890ab"
    try:
        from app.core.config import Settings

        cfg = Settings()
        return str(cfg.VERSION), str(cfg.BUILD_NUMBER)
    except Exception:
        return "1.194.1", "unknown"
    finally:
        if not had_db_url:
            os.environ.pop("DATABASE_URL", None)
        if not had_secret:
            os.environ.pop("SECRET_KEY", None)


def _append_upgrade_audit_event(data_root: Path, event: dict) -> Path:
    """Append a structured, secret-free upgrade/migration audit record to <data_root>/logs/upgrade_audit.jsonl."""
    audit_path = data_root / "logs" / "upgrade_audit.jsonl"
    audit_path.parent.mkdir(parents=True, exist_ok=True)
    record = {
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "actor": event.get("actor", "system"),
        "operation": event.get("operation", "unknown"),
        "app_version": event.get("app_version"),
        "build_number": event.get("build_number"),
        "data_root": str(data_root),
        "schema_before": event.get("schema_before", []),
        "schema_after": event.get("schema_after", []),
        "pending_migrations": event.get("pending_migrations", []),
        "backup_path": event.get("backup_path"),
        "recommendation": event.get("recommendation"),
        "outcome": event.get("outcome", "unknown"),
        "reason": event.get("reason", ""),
    }
    with open(audit_path, "a", encoding="utf-8") as fp:
        fp.write(json.dumps(record, ensure_ascii=False) + "\n")
    return audit_path


async def _inspect_database_state(db_url: str, all_known_revs: set[str]) -> dict:
    """Inspect existing PostgreSQL database schema version, domain record counts, and license metadata safely."""
    import asyncpg

    clean_url = db_url.replace("postgresql+asyncpg://", "postgresql://")
    conn = await asyncpg.connect(clean_url, timeout=8.0)
    try:
        pg_version = await conn.fetchval("SHOW server_version")
        has_alembic = bool(await conn.fetchval("SELECT to_regclass('public.alembic_version') IS NOT NULL"))
        current_revs: list[str] = []
        if has_alembic:
            rows = await conn.fetch("SELECT version_num FROM alembic_version")
            current_revs = [str(r["version_num"]) for r in rows if r["version_num"]]

        has_institutions = bool(await conn.fetchval("SELECT to_regclass('public.institutions') IS NOT NULL"))
        has_students = bool(await conn.fetchval("SELECT to_regclass('public.students') IS NOT NULL"))
        has_settings = bool(await conn.fetchval("SELECT to_regclass('public.institution_settings') IS NOT NULL"))

        inst_count = int(await conn.fetchval("SELECT COUNT(*) FROM institutions") or 0) if has_institutions else 0
        student_count = int(await conn.fetchval("SELECT COUNT(*) FROM students") or 0) if has_students else 0

        license_meta = {
            "has_artifact": False,
            "serial_number": None,
            "installation_id": None,
            "tier": None,
            "status": None,
        }
        if has_settings:
            lic_rows = await conn.fetch(
                """
                SELECT key, value
                FROM institution_settings
                WHERE key IN (
                    'license.artifact',
                    'license.serial_number',
                    'license.installation_id',
                    'license.tier',
                    'license.status'
                )
                ORDER BY institution_id ASC
                """
            )
            for row in lic_rows:
                k = str(row["key"])
                v = row["value"]
                if k == "license.artifact" and v:
                    license_meta["has_artifact"] = True
                elif k == "license.serial_number" and v and not license_meta["serial_number"]:
                    license_meta["serial_number"] = str(v)
                elif k == "license.installation_id" and v and not license_meta["installation_id"]:
                    license_meta["installation_id"] = str(v)
                elif k == "license.tier" and v and not license_meta["tier"]:
                    license_meta["tier"] = str(v)
                elif k == "license.status" and v and not license_meta["status"]:
                    license_meta["status"] = str(v)

        unknown_revs = [r for r in current_revs if r not in all_known_revs]
        return {
            "reachable": True,
            "postgres_version": str(pg_version or ""),
            "has_alembic_version": has_alembic,
            "current_revisions": current_revs,
            "unknown_revisions": unknown_revs,
            "has_institutions_table": has_institutions,
            "institutions_count": inst_count,
            "students_count": student_count,
            "license": license_meta,
        }
    finally:
        await conn.close()


def _get_alembic_script_info(backend_dir: Path) -> tuple[list[str], set[str], list[str]]:
    """Return (heads, all_revision_ids, ordered_revisions_base_to_head) from local Alembic scripts."""
    alembic_ini = backend_dir / "alembic.ini"
    if not alembic_ini.exists():
        return [], set(), []
    from alembic.config import Config
    from alembic.script import ScriptDirectory

    alembic_cfg = Config(str(alembic_ini))
    alembic_cfg.set_main_option("script_location", str(backend_dir / "alembic"))
    script = ScriptDirectory.from_config(alembic_cfg)
    heads = list(script.get_heads())
    ordered_desc = [rev.revision for rev in script.walk_revisions()]
    ordered_asc = list(reversed(ordered_desc))
    return heads, set(ordered_asc), ordered_asc


def _compute_pending_revisions(current_revs: list[str], heads: list[str], ordered_asc: list[str]) -> list[str]:
    """Compute ordered revision IDs still needed to reach Alembic head(s)."""
    if not heads:
        return []
    if set(current_revs) == set(heads):
        return []
    if not current_revs:
        return list(ordered_asc)
    try:
        max_idx = max(ordered_asc.index(rev) for rev in current_revs if rev in ordered_asc)
        return ordered_asc[max_idx + 1 :]
    except ValueError:
        return []


def run_preflight_check(
    app_root: Path,
    backend_dir: Path,
    data_root: Path,
    json_out: Optional[Path] = None,
    db_url_override: Optional[str] = None,
    start_pg_if_stopped: bool = False,
    actor: str = "cli",
) -> tuple[int, dict]:
    """Inspect existing installation, PostgreSQL cluster, Alembic schema state, disk space, and license parity."""
    _env_path, env_vars = _preload_data_root_env(app_root, data_root)
    app_version, build_number = _resolve_app_version_metadata()
    heads, all_known_revs, ordered_asc = _get_alembic_script_info(backend_dir)

    installed_version = None
    bootstrap_marker = data_root / ".bootstrap_complete"
    if bootstrap_marker.is_file():
        try:
            marker_data = json.loads(bootstrap_marker.read_text(encoding="utf-8"))
            if isinstance(marker_data, dict):
                installed_version = marker_data.get("version") or marker_data.get("app_version")
        except Exception:
            pass
    version_file = app_root / "VERSION"
    if not installed_version and version_file.is_file():
        try:
            installed_version = version_file.read_text(encoding="utf-8").strip() or None
        except Exception:
            pass

    data_dir = data_root / "data"
    has_pg_cluster = (data_dir / "PG_VERSION").is_file()
    pg_cluster_major = (data_dir / "PG_VERSION").read_text(encoding="utf-8").strip() if has_pg_cluster else None

    env_path = data_root / ".env"
    if not env_path.is_file() and (app_root / ".env").is_file():
        env_path = app_root / ".env"
    env_vars = _load_env_file(env_path)

    disk_target = data_root if data_root.exists() else app_root
    usage = shutil.disk_usage(str(disk_target))
    free_mb = int(usage.free // (1024 * 1024))

    db_url = (db_url_override or env_vars.get("DATABASE_URL") or "").strip()
    if not db_url and env_vars.get("POSTGRES_PORT"):
        db_pw = env_vars.get("POSTGRES_PASSWORD") or "postgres"
        db_url = f"postgresql+asyncpg://postgres:{db_pw}@127.0.0.1:{env_vars['POSTGRES_PORT']}/prashant_academy"

    started_pg_proc = None
    db_state: dict = {"reachable": False, "current_revisions": [], "unknown_revisions": [], "license": {}}
    db_error = ""

    if not db_url and not has_pg_cluster:
        recommendation = "FRESH_INSTALL"
        reason = "No existing database cluster or runtime environment found; safe for clean installation."
        exit_code = 0
    else:
        if start_pg_if_stopped and has_pg_cluster and not db_url_override:
            try:
                probe_port = int(env_vars.get("POSTGRES_PORT") or "5433")
                if not _is_port_in_use(probe_port):
                    started_pg_proc, probe_port = _start_embedded_postgres(app_root, backend_dir, data_root=data_root)
                    db_pw = env_vars.get("POSTGRES_PASSWORD") or "postgres"
                    db_url = f"postgresql+asyncpg://postgres:{db_pw}@127.0.0.1:{probe_port}/prashant_academy"
            except Exception as exc:
                db_error = str(exc)

        try:
            if db_url:
                db_state = asyncio.run(_inspect_database_state(db_url, all_known_revs))
        except Exception as exc:
            db_error = str(exc)
        finally:
            if started_pg_proc is not None:
                _stop_postgres_graceful(app_root, started_pg_proc, data_root)

        current_revs = db_state.get("current_revisions", [])
        unknown_revs = db_state.get("unknown_revisions", [])
        pending_revs = _compute_pending_revisions(current_revs, heads, ordered_asc) if db_state.get("reachable") else []

        if not db_state.get("reachable"):
            recommendation = "MANUAL_INTERVENTION"
            reason = f"Existing installation detected, but PostgreSQL database could not be inspected: {db_error or 'connection unavailable'}."
            exit_code = 2
        elif unknown_revs:
            recommendation = "MANUAL_INTERVENTION"
            reason = f"Unrecognized or conflicting Alembic revision(s) in database: {', '.join(unknown_revs)}."
            exit_code = 2
        elif not db_state.get("has_institutions_table") and bootstrap_marker.is_file():
            recommendation = "RECOVERY_REQUIRED"
            reason = "Database is reachable, but core 'institutions' table is missing despite previous bootstrap marker."
            exit_code = 3
        elif pending_revs:
            recommendation = "UPGRADE_WITH_MIGRATION"
            reason = f"Database is healthy at {current_revs or ['uninitialized']} and requires {len(pending_revs)} Alembic migration(s) to reach head {heads}."
            exit_code = 0
        elif installed_version and installed_version != app_version:
            recommendation = "UPGRADE_STANDARD"
            reason = f"Database schema is already at head {heads}; upgrading runtime from {installed_version} to {app_version}."
            exit_code = 0
        else:
            recommendation = "UP_TO_DATE"
            reason = f"Installed schema matches target head {heads} and version {app_version}."
            exit_code = 0

    try:
        from app.core.hardware import get_machine_hardware_fingerprint

        machine_fp = get_machine_hardware_fingerprint()
    except Exception:
        machine_fp = "UNKNOWN"

    lic_info = db_state.get("license") or {}
    registered_hw = lic_info.get("installation_id")
    hardware_match = None
    if registered_hw:
        hardware_match = registered_hw.strip().upper() == machine_fp.strip().upper()

    pending_revs_out = (
        _compute_pending_revisions(db_state.get("current_revisions", []), heads, ordered_asc)
        if db_state.get("reachable")
        else []
    )
    report = {
        "recommendation": recommendation,
        "reason": reason,
        "target_version": app_version,
        "target_build": build_number,
        "installed_version": installed_version,
        "app_root": str(app_root),
        "data_root": str(data_root),
        "has_pg_cluster": has_pg_cluster,
        "pg_cluster_major": pg_cluster_major,
        "free_disk_mb": free_mb,
        "db_reachable": bool(db_state.get("reachable")),
        "postgres_version": db_state.get("postgres_version"),
        "schema_current": db_state.get("current_revisions", []),
        "schema_target": heads,
        "pending_migrations": pending_revs_out,
        "pending_count": len(pending_revs_out),
        "institutions_count": db_state.get("institutions_count", 0),
        "students_count": db_state.get("students_count", 0),
        "license_present": bool(lic_info.get("has_artifact") or lic_info.get("serial_number")),
        "license_serial": lic_info.get("serial_number"),
        "license_registered_hardware": registered_hw,
        "machine_hardware_fingerprint": machine_fp,
        "hardware_match": hardware_match,
        "checked_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    }

    if _is_dir_writable(data_root):
        try:
            _append_upgrade_audit_event(
                data_root,
                {
                    "actor": actor,
                    "operation": "preflight_check",
                    "app_version": app_version,
                    "build_number": build_number,
                    "schema_before": report["schema_current"],
                    "schema_after": report["schema_current"],
                    "pending_migrations": pending_revs_out,
                    "recommendation": recommendation,
                    "outcome": "ok" if exit_code == 0 else "blocked",
                    "reason": reason,
                },
            )
        except Exception:
            pass

    if json_out is not None:
        json_out.parent.mkdir(parents=True, exist_ok=True)
        json_out.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")

    return exit_code, report


def run_migrate_only(
    app_root: Path,
    backend_dir: Path,
    data_root: Path,
    backup_path: Optional[str] = None,
    actor: str = "installer",
    db_url_override: Optional[str] = None,
    start_pg: bool = True,
) -> tuple[int, dict]:
    """Execute Alembic migrations forward to head, verify resulting revision, and record an audit trail."""
    _env_path, env_vars = _preload_data_root_env(app_root, data_root)
    app_version, build_number = _resolve_app_version_metadata()
    heads, all_known_revs, ordered_asc = _get_alembic_script_info(backend_dir)

    started_pg_proc = None
    schema_before: list[str] = []
    schema_after: list[str] = []
    pending_revs: list[str] = []
    try:
        db_url = (db_url_override or os.environ.get("DATABASE_URL") or env_vars.get("DATABASE_URL") or "").strip()
        if start_pg and not db_url_override and (app_root / "pgsql" / "bin" / "postgres.exe").is_file():
            if not (data_root / "data" / "PG_VERSION").is_file():
                raise RuntimeError(
                    f"Existing PostgreSQL cluster PG_VERSION not found at {data_root / 'data'}; aborting migration without initdb."
                )
            started_pg_proc, pg_port = _start_embedded_postgres(
                app_root,
                backend_dir,
                data_root=data_root,
                run_bootstrap=False,
            )
            db_pw = env_vars.get("POSTGRES_PASSWORD") or os.environ.get("POSTGRES_PASSWORD") or "postgres"
            db_url = f"postgresql+asyncpg://postgres:{db_pw}@127.0.0.1:{pg_port}/prashant_academy"
            os.environ["POSTGRES_PORT"] = str(pg_port)

        if not db_url:
            raise RuntimeError("No DATABASE_URL or embedded PostgreSQL configuration found for migration.")

        os.environ["DATABASE_URL"] = db_url
        before_state = asyncio.run(_inspect_database_state(db_url, all_known_revs))
        schema_before = before_state.get("current_revisions", [])
        pending_revs = _compute_pending_revisions(schema_before, heads, ordered_asc)

        alembic_ini = backend_dir / "alembic.ini"
        if not alembic_ini.is_file():
            raise RuntimeError(f"Missing Alembic configuration: {alembic_ini}")

        from alembic import command
        from alembic.config import Config

        alembic_cfg = Config(str(alembic_ini))
        alembic_cfg.set_main_option("script_location", str(backend_dir / "alembic"))
        alembic_cfg.set_main_option("sqlalchemy.url", db_url.replace("%", "%%"))
        alembic_cfg.attributes["database_url"] = db_url
        command.upgrade(alembic_cfg, "head")

        after_state = asyncio.run(_inspect_database_state(db_url, all_known_revs))
        schema_after = after_state.get("current_revisions", [])
        if heads and set(schema_after) != set(heads):
            raise RuntimeError(
                f"Post-migration schema verification failed: expected head {heads}, got {schema_after}."
            )

        marker = data_root / ".bootstrap_complete"
        marker.parent.mkdir(parents=True, exist_ok=True)
        marker.write_text(
            json.dumps(
                {
                    "version": app_version,
                    "build_number": build_number,
                    "schema_revisions": schema_after,
                    "updated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                },
                indent=2,
            ),
            encoding="utf-8",
        )

        result = {
            "outcome": "success",
            "app_version": app_version,
            "schema_before": schema_before,
            "schema_after": schema_after,
            "applied_migrations": pending_revs,
            "backup_path": backup_path,
        }
        _append_upgrade_audit_event(
            data_root,
            {
                **result,
                "actor": actor,
                "operation": "migrate_only",
                "build_number": build_number,
                "pending_migrations": pending_revs,
                "reason": "Verified forward Alembic migration to head.",
            },
        )
        return 0, result
    except Exception as exc:
        recovery_note = f"Restore from pre-upgrade backup: {backup_path}" if backup_path else "Review logs/upgrade_audit.jsonl and restore verified pre-upgrade pg_dump."
        reason = f"Migration failed without automatic downgrade ({exc}). {recovery_note}"
        _append_upgrade_audit_event(
            data_root,
            {
                "actor": actor,
                "operation": "migrate_only",
                "app_version": app_version,
                "build_number": build_number,
                "schema_before": schema_before,
                "schema_after": schema_after,
                "pending_migrations": pending_revs,
                "backup_path": backup_path,
                "outcome": "failed",
                "reason": reason,
            },
        )
        return 1, {"outcome": "failed", "reason": reason, "schema_before": schema_before}
    finally:
        if started_pg_proc is not None:
            _stop_postgres_graceful(app_root, started_pg_proc, data_root)


def run_cli_backup(
    app_root: Path,
    backend_dir: Path,
    data_root: Path,
    prune: bool = False,
) -> tuple[int, dict]:
    """Execute a headless verified Housekeeping backup (and optional GFS prune) for Windows Task Scheduler."""
    env_path = data_root / ".env"
    if not env_path.is_file() and (app_root / ".env").is_file():
        env_path = app_root / ".env"
    env_vars = _load_env_file(env_path)
    if env_path.is_file():
        os.environ["PRATHAM_ENV_FILE"] = str(env_path)
        for k, v in env_vars.items():
            os.environ.setdefault(k, v)

    started_pg_proc = None
    try:
        pg_port = int(env_vars.get("POSTGRES_PORT") or os.environ.get("POSTGRES_PORT") or "5432")
        if (app_root / "pgsql" / "bin" / "postgres.exe").is_file():
            own_pid = data_root / "data" / "postmaster.pid"
            already_up = False
            if own_pid.is_file():
                try:
                    lines = own_pid.read_text(encoding="utf-8", errors="ignore").splitlines()
                    if len(lines) >= 4 and lines[3].strip().isdigit():
                        cand_port = int(lines[3].strip())
                        if _is_port_in_use(cand_port):
                            pg_port = cand_port
                            already_up = True
                except Exception:
                    pass
            if not already_up:
                started_pg_proc, pg_port = _start_embedded_postgres(
                app_root,
                backend_dir,
                data_root=data_root,
                run_bootstrap=False,
            )
            db_pw = env_vars.get("POSTGRES_PASSWORD") or os.environ.get("POSTGRES_PASSWORD") or "postgres"
            os.environ["POSTGRES_PORT"] = str(pg_port)
            os.environ["DATABASE_URL"] = f"postgresql+asyncpg://postgres:{db_pw}@127.0.0.1:{pg_port}/prashant_academy"

        async def _exec_backup() -> dict:
            from sqlalchemy import select
            from app.core.database import AsyncSessionLocal, engine
            from app.models.user import User
            from app.services.housekeeping_service import HousekeepingService

            try:
                async with AsyncSessionLocal() as db:
                    actor_user = (
                        await db.execute(select(User).order_by(User.id.asc()).limit(1))
                    ).scalar_one_or_none()
                    if actor_user is None:
                        raise RuntimeError("No active database user found for scheduled backup audit.")
                    policy = await HousekeepingService.get_housekeeping_policy(
                        db, actor_user.institution_id or 1
                    )
                    fmt = str(policy.get("backup_format") or "edu")
                    if fmt not in ("edu", "edu_sql", "custom", "plain_sql"):
                        fmt = "edu"
                    mirror = (policy.get("offsite_mirror_path") or "").strip() or None
                    created = await HousekeepingService.create_backup(
                        db=db,
                        user=actor_user,
                        label="scheduled",
                        backup_format=fmt,
                        notes="Automated OS scheduler backup",
                        mirror_dir=mirror,
                        institution_id=actor_user.institution_id or 1,
                    )
                    pruned = None
                    if prune:
                        pruned = await HousekeepingService.prune_backups(
                            db=db,
                            user=actor_user,
                            retain_daily=int(policy.get("retain_daily", 7) or 7),
                            retain_weekly=int(policy.get("retain_weekly", 4) or 4),
                            retain_monthly=int(policy.get("retain_monthly", 6) or 6),
                        )
                    return {"outcome": "success", "backup": created, "pruned": pruned}
            finally:
                await engine.dispose()

        result = asyncio.run(_exec_backup())
        return 0, result
    except Exception as exc:
        logging.getLogger("app").exception("Scheduled CLI backup failed")
        return 1, {"outcome": "failed", "error": str(exc)}
    finally:
        if started_pg_proc is not None:
            _stop_postgres_graceful(app_root, started_pg_proc, data_root)


def _verify_pyd_integrity() -> None:
    """Verify compiled app/core and app/services .pyd binaries against the embedded release manifest."""
    exe_name = Path(sys.executable).name.lower()
    is_compiled = bool(getattr(sys, "frozen", False)) or (
        exe_name not in ("python.exe", "pythonw.exe", "python", "python3")
    )
    manifest = _EXPECTED_PYD_MANIFEST
    if not is_compiled and not manifest:
        return

    for sub in ("app/core", "app/services"):
        sub_dir = BACKEND_DIR / sub
        if not sub_dir.is_dir():
            continue
        for item in sub_dir.rglob("*"):
            if item.is_file() and item.suffix.lower() in {".py", ".pyc", ".pyo"}:
                raise SystemExit(f"CRITICAL: Unauthorized Python source file detected in {sub}: {item.name}")

    if not manifest:
        return

    for rel_posix, expected_hash in manifest.items():
        target = BACKEND_DIR / rel_posix
        if not target.is_file():
            raise SystemExit(f"CRITICAL: Protected extension missing: {rel_posix}")
        actual_hash = hashlib.sha256(target.read_bytes()).hexdigest().lower()
        if actual_hash != expected_hash.lower():
            raise SystemExit(f"CRITICAL: Runtime integrity mismatch detected for {rel_posix}")


def main():
    parser = argparse.ArgumentParser(description="PrathamOne EduOS Standalone Backend Server")
    parser.add_argument("--port", type=int, default=0, help="Explicit HTTP/HTTPS port override")
    parser.add_argument("--host", default="127.0.0.1", help="Bind host address (default loopback 127.0.0.1)")
    parser.add_argument("--no-browser", action="store_true", help="Compatibility flag for desktop shell")
    parser.add_argument("--uvicorn-only", action="store_true", help="Skip embedded PostgreSQL management")
    parser.add_argument("--generate-ssl", action="store_true", help="Generate local SSL certificates and exit")
    parser.add_argument("--configure-domains", action="store_true", help="Configure local hosts and portproxy and exit")
    parser.add_argument("--healthcheck-smoke", action="store_true", help="Verify app import, .pyd extensions, and OpenAPI schema")
    parser.add_argument("--preflight-check", action="store_true", help="Inspect installation, DB schema, disk space, and license parity cleanly")
    parser.add_argument("--migrate-only", action="store_true", help="Execute forward Alembic migrations to head with schema verification and exit")
    parser.add_argument("--backup-now", action="store_true", help="Run a headless verified PostgreSQL backup and exit")
    parser.add_argument("--prune", action="store_true", help="Apply GFS retention pruning alongside --backup-now")
    parser.add_argument("--data-root", default="", help="Explicit user-writable data root override for data/, logs/, backups/, and .env")
    parser.add_argument("--json-out", default="", help="Optional JSON output file path for --preflight-check / --migrate-only")
    parser.add_argument("--backup-path", default="", help="Verified pre-upgrade backup path recorded in upgrade_audit.jsonl")
    parser.add_argument("--actor", default="cli", help="Actor label for upgrade_audit.jsonl")
    args = parser.parse_args()

    if args.generate_ssl:
        slug = _get_institute_slug(APP_ROOT)
        assets_dir = APP_ROOT / "assets"
        generate_local_pki(assets_dir, extra_slugs=[slug] if slug else None)
        return

    if args.configure_domains:
        configure_local_domains(APP_ROOT, backend_port=args.port or 2026)
        return

    if args.healthcheck_smoke:
        _verify_pyd_integrity()
        os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@127.0.0.1:5432/prashant_academy")
        os.environ.setdefault("SECRET_KEY", "smoke_test_secret_key_for_verification_only_1234567890abcdef12345678")
        os.environ.setdefault("DEBUG", "false")
        from app.main import app as fastapi_app
        schema = fastapi_app.openapi()
        paths_count = len(schema.get("paths", {}))
        if paths_count < 10:
            raise RuntimeError(f"Unexpectedly small OpenAPI schema path count: {paths_count}")
        print(f"SMOKE_OK paths={paths_count}")
        return

    if args.preflight_check:
        _verify_pyd_integrity()
        json_out = Path(args.json_out) if args.json_out.strip() else None
        code, report = run_preflight_check(
            APP_ROOT,
            BACKEND_DIR,
            DATA_ROOT,
            json_out=json_out,
            start_pg_if_stopped=True,
            actor=args.actor or "cli",
        )
        print(json.dumps(report, indent=2, ensure_ascii=False))
        sys.exit(code)

    if args.migrate_only:
        _verify_pyd_integrity()
        backend_log_path = DATA_ROOT / "logs" / "backend_server.log"
        _configure_rotating_logging(backend_log_path)
        code, result = run_migrate_only(
            APP_ROOT,
            BACKEND_DIR,
            DATA_ROOT,
            backup_path=args.backup_path.strip() or None,
            actor=args.actor or "installer",
            start_pg=True,
        )
        if args.json_out.strip():
            out_path = Path(args.json_out.strip())
            out_path.parent.mkdir(parents=True, exist_ok=True)
            out_path.write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")
        print(json.dumps(result, indent=2, ensure_ascii=False))
        sys.exit(code)

    if args.backup_now:
        _verify_pyd_integrity()
        backend_log_path = DATA_ROOT / "logs" / "backend_server.log"
        _configure_rotating_logging(backend_log_path)
        code, result = run_cli_backup(APP_ROOT, BACKEND_DIR, DATA_ROOT, prune=args.prune)
        if args.json_out.strip():
            out_path = Path(args.json_out.strip())
            out_path.parent.mkdir(parents=True, exist_ok=True)
            out_path.write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")
        print(json.dumps(result, indent=2, ensure_ascii=False))
        sys.exit(code)

    backend_log_path = DATA_ROOT / "logs" / "backend_server.log"
    _clean_stray_root_logs(APP_ROOT, DATA_ROOT)
    _ensure_stdio_streams(backend_log_path)
    _configure_rotating_logging(backend_log_path)
    logging.getLogger("app").info("Starting PrathamOne EduOS standalone backend (data_root=%s)", DATA_ROOT)
    _verify_pyd_integrity()

    pg_proc: Optional[subprocess.Popen] = None
    pg_port = int(os.getenv("POSTGRES_PORT", "5432"))
    if not args.uvicorn_only:
        pg_proc, pg_port = _start_embedded_postgres(APP_ROOT, BACKEND_DIR, data_root=DATA_ROOT)
        atexit.register(_stop_postgres_graceful, APP_ROOT, pg_proc, DATA_ROOT)

    data_env_path = DATA_ROOT / ".env"
    if not data_env_path.exists():
        db_pw = os.environ.get("POSTGRES_PASSWORD") or "postgres"
        _ensure_env_file(APP_ROOT, pg_port, db_pw, data_root=DATA_ROOT)
    elif not args.uvicorn_only and (APP_ROOT / "pgsql" / "bin" / "postgres.exe").exists():
        cur_env = _load_env_file(data_env_path)
        _ensure_env_file(APP_ROOT, pg_port, cur_env.get("POSTGRES_PASSWORD") or "postgres", data_root=DATA_ROOT)

    os.environ["PRATHAM_ENV_FILE"] = str(data_env_path)
    env_vars = _load_env_file(data_env_path)
    for k, v in env_vars.items():
        os.environ[k] = v

    if not args.uvicorn_only and (APP_ROOT / "pgsql" / "bin" / "postgres.exe").exists():
        db_pass = os.environ.get("POSTGRES_PASSWORD", "postgres")
        os.environ["POSTGRES_PORT"] = str(pg_port)
        os.environ["DATABASE_URL"] = f"postgresql+asyncpg://postgres:{db_pass}@127.0.0.1:{pg_port}/prashant_academy"

    static_dist = APP_ROOT / "frontend" / "dist"
    if static_dist.exists():
        os.environ["STATIC_DIR"] = str(static_dist)

    port = args.port or int(os.getenv("PORT", "2026"))
    if not args.port and _is_port_in_use(port):
        port = _find_free_port(2027)

    cert_file = next(
        (c for c in [APP_ROOT / "assets" / "prathamone_ssl_cert.pem", APP_ROOT / "installer" / "assets" / "prathamone_ssl_cert.pem"] if c.is_file()),
        None,
    )
    key_file = next(
        (k for k in [APP_ROOT / "assets" / "prathamone_ssl_key.pem", APP_ROOT / "installer" / "assets" / "prathamone_ssl_key.pem"] if k.is_file()),
        None,
    )

    def _handle_sig(_signum, _frame):
        _stop_postgres_graceful(APP_ROOT, pg_proc, DATA_ROOT)
        sys.exit(0)

    signal.signal(signal.SIGINT, _handle_sig)
    signal.signal(signal.SIGTERM, _handle_sig)

    import uvicorn

    server_ref: dict[str, Optional[uvicorn.Server]] = {"server": None}

    def _trigger_graceful_shutdown():
        srv = server_ref["server"]
        if srv is not None:
            srv.should_exit = True

    progressive_app = _create_progressive_asgi_app(shutdown_callback=_trigger_graceful_shutdown)

    uvicorn_kwargs = {
        "host": args.host,
        "port": port,
        "log_level": "info",
        "use_colors": False,
        "log_config": _build_uvicorn_log_config(backend_log_path),
    }
    if cert_file and key_file:
        uvicorn_kwargs["ssl_certfile"] = str(cert_file)
        uvicorn_kwargs["ssl_keyfile"] = str(key_file)

    try:
        config = uvicorn.Config(progressive_app, **uvicorn_kwargs)
        server = uvicorn.Server(config)
        server_ref["server"] = server
        server.run()
    except Exception:
        logging.getLogger("app").exception("Standalone backend server terminated with fatal error")
        raise


if __name__ == "__main__":
    main()
