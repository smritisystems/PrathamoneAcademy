# /**
#  * @file        windows_bootstrap.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      scripts.windows_bootstrap
#  *
#  * @author      Jawahar R. Mallah
#  * @organization AITDL (AI Technology & Development Lab)
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 AITDL
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-15
#  * @updated     2026-11-15
#  *
#  * @description Automated Windows standalone bootstrap utility: initializes environment,
#  */

import argparse
import asyncio
import os
import secrets
import subprocess
import sys
from pathlib import Path


def generate_secret_key(length: int = 64) -> str:
    """Generate a cryptographically secure random hexadecimal key."""
    return secrets.token_hex(length // 2)


def ensure_env_file(root_dir: Path, db_port: int, db_password: str) -> Path:
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
    """Ensure the target PostgreSQL database exists; create it if absent."""
    from sqlalchemy.ext.asyncio import create_async_engine
    from sqlalchemy import text

    # Parse database name from URL
    db_name = db_url.rsplit("/", 1)[-1]
    # Maintenance URL pointing to default 'postgres' database
    maintenance_url = db_url.rsplit("/", 1)[0] + "/postgres"

    print(f"[BOOTSTRAP] Verifying target database: '{db_name}'...")
    try:
        engine = create_async_engine(maintenance_url, isolation_level="AUTOCOMMIT")
        async with engine.connect() as conn:
            check_query = text("SELECT 1 FROM pg_database WHERE datname = :name")
            result = await conn.execute(check_query, {"name": db_name})
            exists = result.scalar() is not None

            if not exists:
                print(f"[BOOTSTRAP] Database '{db_name}' does not exist. Creating...")
                await conn.execute(text(f'CREATE DATABASE "{db_name}" ENCODING "UTF8"'))
                print(f"[BOOTSTRAP] Database '{db_name}' created successfully.")
            else:
                print(f"[BOOTSTRAP] Database '{db_name}' already exists.")
        await engine.dispose()
    except Exception as exc:
        print(f"[BOOTSTRAP] Database existence check returned: {exc}")
        print("[BOOTSTRAP] Proceeding with connection check...")


def _load_env_dict(root_dir: Path) -> dict:
    env_vars = {}
    env_file = root_dir / ".env"
    if env_file.exists():
        for line in env_file.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                env_vars[k.strip()] = v.strip()
    return env_vars


def run_alembic_migrations(root_dir: Path, db_url: str):
    """Execute Alembic database migrations to upgrade schema to head."""
    print("[BOOTSTRAP] Applying database migrations (alembic upgrade head)...")
    env = os.environ.copy()
    env.update(_load_env_dict(root_dir))
    env["DATABASE_URL"] = db_url
    env["PYTHONPATH"] = str(root_dir / "backend")
    alembic_ini = root_dir / "backend" / "alembic.ini"
    if not alembic_ini.exists():
        alembic_ini = root_dir / "alembic.ini"

    cmd = [sys.executable, "-m", "alembic", "-c", str(alembic_ini), "upgrade", "head"]
    result = subprocess.run(cmd, cwd=str(root_dir / "backend"), env=env, capture_output=True, text=True)

    if result.returncode != 0:
        print(f"[BOOTSTRAP ERROR] Alembic migrations failed:\n{result.stderr}")
        raise RuntimeError("Database migration execution failed.")
    print("[BOOTSTRAP] Alembic migrations applied successfully.")


def run_seed_bootstrap(root_dir: Path, db_url: str, admin_password: str, accountant_password: str = ""):
    """Run initial database bootstrap and administrator account creation."""
    print("[BOOTSTRAP] Seeding administrator and canonical academic masters...")
    env = os.environ.copy()
    env.update(_load_env_dict(root_dir))
    env["DATABASE_URL"] = db_url
    env["PYTHONPATH"] = str(root_dir / "backend")
    env["INITIAL_ADMIN_PASSWORD"] = admin_password
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
    print("[BOOTSTRAP] Administrator credentials and canonical masters seeded successfully.")


def main():
    parser = argparse.ArgumentParser(description="PrathamOne EduOS Windows Standalone Bootstrap Utility")
    parser.add_argument("--admin-password", required=True, help="Initial Administrator password (min 14 chars)")
    parser.add_argument("--accountant-password", default="", help="Optional initial Accountant password")
    parser.add_argument("--db-port", type=int, default=5432, help="PostgreSQL connection port (default: 5432)")
    parser.add_argument("--db-password", default="", help="PostgreSQL superuser password")
    parser.add_argument("--root-dir", default=None, help="Application root directory path")
    args = parser.parse_args()

    if len(args.admin_password) < 14:
        print("[BOOTSTRAP ERROR] Administrator password must contain at least 14 characters.")
        sys.exit(1)

    root_dir = Path(args.root_dir).resolve() if args.root_dir else Path(__file__).resolve().parent.parent
    db_password = args.db_password or generate_secret_key(32)

    try:
        ensure_env_file(root_dir, args.db_port, db_password)
        db_url = f"postgresql+asyncpg://postgres:{db_password}@localhost:{args.db_port}/prashant_academy"

        asyncio.run(ensure_database_exists(db_url))
        run_alembic_migrations(root_dir, db_url)
        run_seed_bootstrap(root_dir, db_url, args.admin_password, args.accountant_password)

        print("\n======================================================================")
        print("  PRATHAMONE EduOS — STANDALONE BOOTSTRAP COMPLETED SUCCESSFULLY!    ")
        print("======================================================================\n")
    except Exception as exc:
        print(f"\n[FATAL] Bootstrap failed: {exc}")
        sys.exit(1)


if __name__ == "__main__":
    main()
