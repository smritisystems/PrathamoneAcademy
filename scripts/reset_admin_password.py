# /**
#  * @file        reset_admin_password.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      13_SYSADMIN_SETTINGS
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
#  * @description Emergency admin password reset script. Supports both live PostgreSQL
#  */

import argparse
import asyncio
import hashlib
import os
import re
import subprocess
import sys
import time
from pathlib import Path
from urllib.parse import urlparse


def _hash_password(password: str) -> str:
    """Hash password compatibly with app.core.security.get_password_hash."""
    import bcrypt as _bcrypt

    pw_bytes = password.encode("utf-8")
    salt = _bcrypt.gensalt()
    if len(pw_bytes) > 72:
        digest = hashlib.sha256(pw_bytes).hexdigest().encode("ascii")
        return "sha256$" + _bcrypt.hashpw(digest, salt).decode("utf-8")
    return _bcrypt.hashpw(pw_bytes, salt).decode("utf-8")


def _verify_password(password: str, hashed: str) -> bool:
    import bcrypt as _bcrypt

    pw_bytes = password.encode("utf-8")
    if hashed.startswith("sha256$"):
        digest = hashlib.sha256(pw_bytes).hexdigest().encode("ascii")
        return _bcrypt.checkpw(digest, hashed[7:].encode("utf-8"))
    return _bcrypt.checkpw(pw_bytes, hashed.encode("utf-8"))


def _resolve_desktop_env() -> dict[str, str]:
    """Read desktop installation .env parameters if available."""
    result: dict[str, str] = {}
    local_app = os.environ.get("LOCALAPPDATA", "")
    candidates = [
        Path(local_app) / "PrathamOneEduOS" / ".env" if local_app else None,
        Path(r"D:\PrathamOneEduOS\.env"),
    ]
    for env_file in candidates:
        if env_file and env_file.is_file():
            for line in env_file.read_text(encoding="utf-8", errors="ignore").splitlines():
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    result[k.strip()] = v.strip().strip("'\"")
            result["_data_root"] = str(env_file.parent)
            break
    return result


def _find_pg_ctl() -> Path | None:
    for candidate in (
        Path(r"D:\PrathamOneEduOS\pgsql\bin\pg_ctl.exe"),
        Path(os.environ.get("ProgramFiles", r"C:\Program Files")) / "PrathamOneEduOS" / "pgsql" / "bin" / "pg_ctl.exe",
        Path(__file__).resolve().parent.parent / "build_staging" / "pgsql" / "bin" / "pg_ctl.exe",
    ):
        if candidate.is_file():
            return candidate
    return None


async def _try_update(dsn: str, admin_email: str, new_password: str) -> bool:
    import asyncpg

    hashed = _hash_password(new_password)
    conn = await asyncpg.connect(dsn, timeout=5.0)
    try:
        await conn.execute(
            "UPDATE users SET hashed_password=$1, is_active=true WHERE username='admin' OR email=$2",
            hashed,
            admin_email,
        )
        rows = await conn.fetch(
            "SELECT id, username, email, is_active, hashed_password FROM users WHERE username='admin' OR email=$1",
            admin_email,
        )
        if not rows:
            print("[WARN] No admin user found. Check database name or email.")
            return False
        for r in rows:
            ok = _verify_password(new_password, r["hashed_password"])
            print(f"[OK] Updated id={r['id']} username={r['username']} email={r['email']} active={r['is_active']} verified={ok}")
        return True
    finally:
        await conn.close()


async def reset_password(
    host: str,
    port: int,
    dbname: str,
    pg_user: str,
    pg_pass: str,
    admin_email: str,
    new_password: str,
):
    dsn = f"postgresql://{pg_user}:{pg_pass}@{host}:{port}/{dbname}"
    print(f"[INFO] Connecting to {host}:{port}/{dbname} ...")
    try:
        await _try_update(dsn, admin_email, new_password)
        return
    except Exception as exc:
        print(f"[INFO] Direct connect on {host}:{port} unavailable ({exc}); checking embedded cluster...")

    env_cfg = _resolve_desktop_env()
    data_root = Path(env_cfg["_data_root"]) if "_data_root" in env_cfg else None
    data_dir = (data_root / "data") if data_root else None
    pg_ctl = _find_pg_ctl()
    if not (pg_ctl and data_dir and (data_dir / "PG_VERSION").is_file()):
        print("[ERROR] Could not connect to live PostgreSQL or locate an embedded cluster.")
        sys.exit(1)

    opts_file = data_dir / "postmaster.opts"
    target_port = port
    if opts_file.is_file():
        m = re.search(r'"-p"\s+"(\d+)"', opts_file.read_text(encoding="utf-8", errors="ignore"))
        if m:
            target_port = int(m.group(1))
    if "DATABASE_URL" in env_cfg:
        parsed = urlparse(env_cfg["DATABASE_URL"].replace("postgresql+asyncpg://", "postgresql://"))
        dbname = parsed.path.lstrip("/") or dbname
        pg_user = parsed.username or pg_user
        pg_pass = parsed.password or pg_pass

    flags = 0x08000000 if sys.platform == "win32" else 0
    print(f"[INFO] Temporarily starting embedded cluster at {data_dir} on port {target_port}...")
    subprocess.run(
        [str(pg_ctl), "start", "-w", "-t", "20", "-D", str(data_dir), "-o", f"-p {target_port}", "-l", str(data_dir / "pg_server.log")],
        check=True,
        creationflags=flags,
    )
    time.sleep(1.0)
    try:
        emb_dsn = f"postgresql://{pg_user}:{pg_pass}@127.0.0.1:{target_port}/{dbname}"
        await _try_update(emb_dsn, admin_email, new_password)
    finally:
        subprocess.run([str(pg_ctl), "stop", "-w", "-t", "15", "-D", str(data_dir), "-m", "fast"], creationflags=flags)


def main():
    env_cfg = _resolve_desktop_env()
    default_port = int(env_cfg.get("POSTGRES_PORT", "5433"))
    default_db = env_cfg.get("POSTGRES_DB", "prashant_academy")
    default_email = env_cfg.get("DEFAULT_ADMIN_EMAIL", "admin@prathamone.com")

    parser = argparse.ArgumentParser(description="PrathamOne EduOS — Emergency Admin Password Reset")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=default_port)
    parser.add_argument("--dbname", default=default_db)
    parser.add_argument("--pg-user", default=env_cfg.get("POSTGRES_USER", "postgres"))
    parser.add_argument("--pg-pass", default=env_cfg.get("POSTGRES_PASSWORD", "postgres"))
    parser.add_argument("--admin-email", default=default_email)
    parser.add_argument("--password", default="PrathamAdmin@2026!", help="New admin password (min 14 chars)")
    args = parser.parse_args()

    if len(args.password) < 14:
        print("[ERROR] Password must be at least 14 characters.")
        sys.exit(1)

    asyncio.run(
        reset_password(
            args.host,
            args.port,
            args.dbname,
            args.pg_user,
            args.pg_pass,
            args.admin_email,
            args.password,
        )
    )


if __name__ == "__main__":
    main()
