# /**
#  * @file        windows_bootstrap.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      scripts
#  *
#  * @author      Jawahar R. Mallah
#  * @organization Smritisys & AITDL Networks
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 PrathamOne EduOS
#  * @license     Proprietary
#  *
#  * @version     1.2.0
#  * @created     2026-11-14
#  * @updated     2026-11-16
#  *
#  * @description Automated post-install bootstrap utility initializing local databases, executing Alembic migrations, seeding Indian educational boards, mediums, canonical subjects, and setting initial administrator credentials from installer configuration.
#  */

import os
import sys
import json
import secrets
import argparse
import subprocess
from pathlib import Path
import asyncio
import asyncpg


def generate_secret_key(length: int = 64) -> str:
    """Generate a cryptographically secure hex secret key."""
    return secrets.token_hex(length // 2)


def ensure_env_file(root_dir: Path, db_port: int, db_password: str, institute_name: str = "") -> Path:
    """Ensure a valid .env configuration exists with secure secrets."""
    env_path = root_dir / ".env"
    backend_env = root_dir / "backend" / ".env"
    env_example = root_dir / ".env.example"

    if env_path.exists():
        print("[BOOTSTRAP] Preserving existing .env configuration.")
        try:
            backend_env.write_text(env_path.read_text(encoding="utf-8"), encoding="utf-8")
        except Exception:
            pass
        return env_path

    print("[BOOTSTRAP] Creating new .env configuration from template...")
    if not env_example.exists():
        raise FileNotFoundError(f"Missing required template: {env_example}")

    content = env_example.read_text(encoding="utf-8")
    secret_key = generate_secret_key(64)
    db_url = f"postgresql+asyncpg://postgres:{db_password}@127.0.0.1:{db_port}/prashant_academy"

    content = content.replace("POSTGRES_PASSWORD=postgres", f"POSTGRES_PASSWORD={db_password}")
    content = content.replace("POSTGRES_PASSWORD=", f"POSTGRES_PASSWORD={db_password}")
    content = content.replace("DATABASE_URL=", f"DATABASE_URL={db_url}")
    if "SECRET_KEY=" in content:
        lines = []
        for line in content.splitlines():
            if line.startswith("SECRET_KEY="):
                lines.append(f"SECRET_KEY={secret_key}")
            elif line.startswith("POSTGRES_PORT="):
                lines.append(f"POSTGRES_PORT={db_port}")
            else:
                lines.append(line)
        content = "\n".join(lines) + "\n"

    env_path.write_text(content, encoding="utf-8")
    try:
        backend_env.write_text(content, encoding="utf-8")
    except Exception:
        pass
    print(f"[BOOTSTRAP] .env created successfully with secure credentials on port {db_port}.")
    return env_path


async def ensure_database_exists(db_url: str):
    """Ensure PostgreSQL target database exists, creating it if necessary."""
    # Convert asyncpg/SQLAlchemy URL format to asyncpg connection parameters
    clean_url = db_url.replace("postgresql+asyncpg://", "postgresql://")
    from urllib.parse import urlparse
    parsed = urlparse(clean_url)

    target_db = parsed.path.lstrip("/") or "prashant_academy"
    user = parsed.username or "postgres"
    password = parsed.password or ""
    host = parsed.hostname or "127.0.0.1"
    port = parsed.port or 5432

    print(f"[BOOTSTRAP] Verifying target database '{target_db}' on {host}:{port}...")

    # Connect to the default 'postgres' maintenance database first
    conn = None
    try:
        conn = await asyncpg.connect(
            user=user,
            password=password,
            host=host,
            port=port,
            database="postgres",
            timeout=10.0
        )
        exists = await conn.fetchval(
            "SELECT 1 FROM pg_database WHERE datname = $1",
            target_db
        )
        if not exists:
            print(f"[BOOTSTRAP] Target database '{target_db}' not found. Creating database...")
            # Note: CREATE DATABASE cannot run in a transaction block
            await conn.execute(f'CREATE DATABASE "{target_db}" OWNER "{user}" ENCODING "UTF8"')
            print(f"[BOOTSTRAP] Database '{target_db}' created successfully.")
        else:
            print(f"[BOOTSTRAP] Target database '{target_db}' is ready.")
    finally:
        if conn:
            await conn.close()


def _load_env_dict(root_dir: Path) -> dict:
    """Load key-value pairs from .env into a dictionary without overriding existing system envs."""
    env_file = root_dir / ".env"
    env_vars = {}
    if env_file.exists():
        for line in env_file.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, val = line.split("=", 1)
                env_vars[key.strip()] = val.strip().strip("'\"")
    return env_vars


def run_alembic_migrations(root_dir: Path, db_url: str):
    """Run Alembic migrations to the latest revision (head)."""
    print("[BOOTSTRAP] Applying database schema migrations via Alembic...")
    alembic_ini = root_dir / "backend" / "alembic.ini"
    if not alembic_ini.exists():
        raise FileNotFoundError(f"Missing alembic.ini at {alembic_ini}")

    env = os.environ.copy()
    env.update(_load_env_dict(root_dir))
    env["DATABASE_URL"] = db_url
    env["PYTHONPATH"] = str(root_dir / "backend")

    cmd = [sys.executable, "-m", "alembic", "-c", str(alembic_ini), "upgrade", "head"]
    result = subprocess.run(cmd, cwd=str(root_dir / "backend"), env=env, capture_output=True, text=True)

    if result.returncode != 0:
        print(f"[BOOTSTRAP ERROR] Alembic migrations failed:\n{result.stderr}")
        raise RuntimeError("Database migration execution failed.")
    print("[BOOTSTRAP] Alembic migrations applied successfully.")


def run_seed_bootstrap(
    root_dir: Path,
    db_url: str,
    admin_password: str,
    institute_name: str = "Your Academy Name",
    branch_name: str = "Main Campus",
    address: str = "Campus Address, Education Hub",
    phone: str = "+91-9876543210",
    logo_url: str = "/media/logo/prathamone-symbol-icon.svg",
    boards: str = "MSBSHSE,CBSE,ICSE,GSEB,COMPETITIVE",
    mediums: str = "English,Semi-English,Hindi,Marathi,Gujarati",
    accountant_password: str = "",
):
    """Run initial database bootstrap and administrator account creation."""
    print("[BOOTSTRAP] Seeding administrator, Indian examination boards, and canonical academic masters...")
    env = os.environ.copy()
    env.update(_load_env_dict(root_dir))
    env["DATABASE_URL"] = db_url
    env["PYTHONPATH"] = str(root_dir / "backend")
    env["INITIAL_ADMIN_PASSWORD"] = admin_password
    env["INSTITUTE_NAME"] = institute_name
    env["INSTITUTE_BRANCH"] = branch_name
    env["INSTITUTE_ADDRESS"] = address
    env["INSTITUTE_PHONE"] = phone
    env["INSTITUTE_LOGO_URL"] = logo_url
    env["SEED_BOARDS"] = boards
    env["SEED_MEDIUMS"] = mediums
    if accountant_password:
        env["INITIAL_ACCOUNTANT_PASSWORD"] = accountant_password

    seed_script = root_dir / "backend" / "seed.py"
    if not seed_script.exists():
        seed_script = root_dir / "seed.py"

    cmd = [sys.executable, str(seed_script), "--bootstrap-only"]
    result = subprocess.run(cmd, cwd=str(root_dir / "backend"), env=env, capture_output=True, text=True)

    if result.returncode != 0:
        print(f"[BOOTSTRAP ERROR] Database seed failed:\n{result.stderr}")
        raise RuntimeError("Initial master database seeding failed.")
    print(f"[BOOTSTRAP] {result.stdout.strip()}")
    print("[BOOTSTRAP] Administrator credentials and canonical masters seeded successfully.")


def main():
    parser = argparse.ArgumentParser(description="PrathamOne EduOS Windows Standalone Bootstrap Utility")
    parser.add_argument("--admin-password", default="", help="Initial Administrator password (min 14 chars)")
    parser.add_argument("--institute-name", default="", help="Coaching Institute Name")
    parser.add_argument("--boards", default="", help="Comma-separated list of active examination boards")
    parser.add_argument("--mediums", default="", help="Comma-separated list of instruction mediums")
    parser.add_argument("--accountant-password", default="", help="Optional initial Accountant password")
    parser.add_argument("--db-port", type=int, default=5432, help="PostgreSQL connection port (default: 5432)")
    parser.add_argument("--db-password", default="", help="PostgreSQL superuser password")
    parser.add_argument("--root-dir", default=None, help="Application root directory path")
    args = parser.parse_args()

    root_dir = Path(args.root_dir).resolve() if args.root_dir else Path(__file__).resolve().parent.parent

    # 1. Read setup_config.json if written by Inno Setup installer
    config_file = root_dir / "setup_config.json"
    setup_config = {}
    if config_file.exists():
        try:
            setup_config = json.loads(config_file.read_text(encoding="utf-8"))
            print("[BOOTSTRAP] Loaded installer configuration from setup_config.json.")
        except Exception as e:
            print(f"[BOOTSTRAP WARN] Failed to read setup_config.json: {e}")

    admin_password = args.admin_password or setup_config.get("admin_password") or "PrathamOne2026!Admin"
    raw_inst_name = args.institute_name or setup_config.get("institute_name") or ""
    institute_name = raw_inst_name.strip() if raw_inst_name.strip() and raw_inst_name.strip() != "Prashant Academy Coaching Institute" else "Your Academy Name"
    branch_name = setup_config.get("branch_name", "Main Campus").strip() or "Main Campus"
    address = setup_config.get("address", "Campus Address, Education Hub").strip() or "Campus Address, Education Hub"
    phone = setup_config.get("phone", "+91-9876543210").strip() or "+91-9876543210"
    
    # Handle optional logo image provided during installation
    raw_logo_path = setup_config.get("logo_path", "").strip()
    logo_url = "/media/logo/prathamone-symbol-icon.svg"
    if raw_logo_path and Path(raw_logo_path).is_file():
        try:
            import shutil
            logo_ext = Path(raw_logo_path).suffix or ".png"
            dest_logo_name = f"custom-academy-logo{logo_ext}"
            for sub_dir in ["frontend/dist/media/logo", "frontend/public/media/logo", "backend/media/logo"]:
                dest_dir = root_dir / sub_dir
                dest_dir.mkdir(parents=True, exist_ok=True)
                shutil.copy2(raw_logo_path, dest_dir / dest_logo_name)
            logo_url = f"/media/logo/{dest_logo_name}"
            print(f"[BOOTSTRAP] Copied custom academy logo from {raw_logo_path} to {logo_url}.")
        except Exception as e:
            print(f"[BOOTSTRAP WARN] Failed to copy custom logo: {e}")

    boards = args.boards or setup_config.get("boards") or "MSBSHSE,CBSE,ICSE,GSEB,COMPETITIVE"
    mediums = args.mediums or setup_config.get("mediums") or "English,Semi-English,Hindi,Marathi,Gujarati"

    if len(admin_password) < 14:
        print("[BOOTSTRAP ERROR] Administrator password must contain at least 14 characters.")
        sys.exit(1)

    db_password = args.db_password or generate_secret_key(32)

    try:
        ensure_env_file(root_dir, args.db_port, db_password, institute_name)
        db_url = f"postgresql+asyncpg://postgres:{db_password}@localhost:{args.db_port}/prashant_academy"

        asyncio.run(ensure_database_exists(db_url))
        run_alembic_migrations(root_dir, db_url)
        run_seed_bootstrap(
            root_dir,
            db_url,
            admin_password,
            institute_name=institute_name,
            branch_name=branch_name,
            address=address,
            phone=phone,
            logo_url=logo_url,
            boards=boards,
            mediums=mediums,
            accountant_password=args.accountant_password,
        )

        # Remove sensitive plain setup_config.json after successful bootstrapping
        if config_file.exists():
            try:
                config_file.unlink()
                print("[BOOTSTRAP] Sensitive installer configuration file cleaned up.")
            except Exception:
                pass

        print("\n======================================================================")
        print("  PRATHAMONE EduOS — STANDALONE BOOTSTRAP COMPLETED SUCCESSFULLY!    ")
        print("======================================================================\n")
    except Exception as exc:
        print(f"\n[FATAL] Bootstrap failed: {exc}")
        sys.exit(1)


if __name__ == "__main__":
    main()
