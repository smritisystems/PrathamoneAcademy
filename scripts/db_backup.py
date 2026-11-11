# /**
#  * @file        db_backup.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      scripts.housekeeping
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
#  * @description CLI & scheduled automation utility for PrathamOne EduOS Housekeeping:
#  */

import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Dict, List, Optional, Tuple

REPO_ROOT = Path(__file__).resolve().parents[1]
BACKUPS_DIR = REPO_ROOT / "backups"
LEGACY_DIR = REPO_ROOT / "data" / "backups"


def _sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def _append_history(event: Dict) -> None:
    BACKUPS_DIR.mkdir(parents=True, exist_ok=True)
    log_path = BACKUPS_DIR / "housekeeping_history.jsonl"
    with log_path.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps({"timestamp": datetime.now(timezone.utc).isoformat(), **event}) + "\n")


def _docker_exec(cmd: List[str], stdin_path: Optional[Path] = None, stdout_path: Optional[Path] = None, check: bool = True) -> subprocess.CompletedProcess:
    full_cmd = ["docker", "compose", "exec", "-T", "db"] + cmd
    stdin_fh = stdin_path.open("rb") if stdin_path else None
    stdout_fh = stdout_path.open("wb") if stdout_path else None
    try:
        res = subprocess.run(
            full_cmd,
            cwd=str(REPO_ROOT),
            stdin=stdin_fh if stdin_fh else subprocess.DEVNULL,
            stdout=stdout_fh if stdout_fh else subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
        )
        if check and res.returncode != 0:
            err = (res.stderr or b"").decode("utf-8", errors="replace")
            raise RuntimeError(f"Command {' '.join(full_cmd)} failed (exit {res.returncode}): {err.strip()}")
        return res
    finally:
        if stdin_fh:
            stdin_fh.close()
        if stdout_fh:
            stdout_fh.close()


def _resolve_input_file(file_arg: str) -> Path:
    candidate = Path(file_arg)
    if not candidate.is_absolute():
        if (BACKUPS_DIR / file_arg).exists():
            candidate = BACKUPS_DIR / file_arg
        elif (LEGACY_DIR / file_arg).exists():
            candidate = LEGACY_DIR / file_arg
        else:
            candidate = (REPO_ROOT / file_arg).resolve()
    if not candidate.exists():
        raise FileNotFoundError(f"Backup file not found: {candidate}")
    return candidate


def cmd_backup(args: argparse.Namespace) -> int:
    BACKUPS_DIR.mkdir(parents=True, exist_ok=True)
    db_name = args.database
    label = re.sub(r"[^a-zA-Z0-9_-]+", "_", args.label).strip("_") or "scheduled"
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    ext = "sql" if args.format == "plain_sql" else "dump"
    filename = f"{db_name}_{label}_{ts}.{ext}"
    target = BACKUPS_DIR / filename

    dump_cmd = ["pg_dump", "-U", args.user, "-Fp" if args.format == "plain_sql" else "-Fc"]
    if args.format != "plain_sql":
        dump_cmd.extend(["-Z", "6"])
    dump_cmd.append(db_name)

    print(f"[HOUSEKEEPING] Creating {args.format} backup -> {target}")
    _docker_exec(dump_cmd, stdout_path=target, check=True)
    sha = _sha256(target)
    Path(str(target) + ".sha256").write_text(f"{sha}  {filename}\n", encoding="utf-8")

    now_iso = datetime.now(timezone.utc).isoformat()
    meta_path = Path(str(target) + ".meta.json")
    meta_path.write_text(json.dumps({
        "filename": filename,
        "label": label,
        "format": "plain_sql" if args.format == "plain_sql" else "custom_dump",
        "database": db_name,
        "created_by": f"cli:{os.getenv('USERNAME') or os.getenv('USER') or 'scheduler'}",
        "created_at": now_iso,
        "size_bytes": target.stat().st_size,
        "sha256": sha,
        "notes": args.notes or "Automated Housekeeping CLI backup",
    }, indent=2), encoding="utf-8")

    ok = verify_file(target)
    if not ok:
        raise RuntimeError(f"Backup verification FAILED for {target}")

    if args.mirror_dir:
        mdir = Path(args.mirror_dir)
        mdir.mkdir(parents=True, exist_ok=True)
        shutil.copy2(target, mdir / filename)
        shutil.copy2(str(target) + ".sha256", mdir / f"{filename}.sha256")
        print(f"[HOUSEKEEPING] Mirrored offsite copy -> {mdir / filename}")

    _append_history({
        "action": "CLI_BACKUP_CREATED",
        "status": "success",
        "filename": filename,
        "size_bytes": target.stat().st_size,
        "sha256": sha,
    })

    if args.prune:
        prune_backups(args.retain_daily, args.retain_weekly, args.retain_monthly)

    print(f"[PASS] Verified backup saved: {filename} ({target.stat().st_size:,} bytes, SHA-256: {sha[:16]}...)")
    return 0


def verify_file(target: Path) -> bool:
    computed = _sha256(target)
    sha_file = Path(str(target) + ".sha256")
    sha_match = True
    if sha_file.exists():
        recorded = sha_file.read_text(encoding="utf-8", errors="replace").strip().split()[0]
        sha_match = recorded.lower() == computed.lower()
    else:
        sha_file.write_text(f"{computed}  {target.name}\n", encoding="utf-8")

    if target.suffix == ".dump":
        res = _docker_exec(["pg_restore", "--list"], stdin_path=target, check=False)
        fmt_ok = res.returncode == 0
        toc_entries = len([ln for ln in (res.stdout or b"").decode("utf-8", errors="replace").splitlines() if ln.strip() and not ln.strip().startswith(";")])
    else:
        txt = target.read_text(encoding="utf-8", errors="replace")
        fmt_ok = "PostgreSQL database dump" in txt[:2048] or "CREATE TABLE" in txt[:4096]
        toc_entries = txt.count("CREATE TABLE ")

    verified = sha_match and fmt_ok
    meta_path = Path(str(target) + ".meta.json")
    meta = {}
    if meta_path.exists():
        try:
            meta = json.loads(meta_path.read_text(encoding="utf-8"))
        except Exception:
            meta = {}
    meta.update({
        "sha256": computed,
        "verified": verified,
        "verified_at": datetime.now(timezone.utc).isoformat(),
        "toc_entries": toc_entries,
    })
    meta_path.write_text(json.dumps(meta, indent=2), encoding="utf-8")
    print(f"[VERIFY] {target.name}: sha_match={sha_match}, format_valid={fmt_ok}, objects={toc_entries}")
    return verified


def cmd_verify(args: argparse.Namespace) -> int:
    target = _resolve_input_file(args.file)
    ok = verify_file(target)
    return 0 if ok else 1


def cmd_list(_args: argparse.Namespace) -> int:
    for label, directory in (("backups/", BACKUPS_DIR), ("data/backups/", LEGACY_DIR)):
        print(f"\n=== {label} ===")
        if not directory.exists():
            print("  (empty)")
            continue
        files = sorted([p for p in directory.iterdir() if p.is_file() and p.suffix in (".dump", ".sql")], key=lambda p: p.stat().st_mtime, reverse=True)
        for f in files:
            meta_p = Path(str(f) + ".meta.json")
            verified = "?"
            if meta_p.exists():
                try:
                    verified = "VERIFIED" if json.loads(meta_p.read_text(encoding="utf-8")).get("verified") else "UNVERIFIED"
                except Exception:
                    pass
            print(f"  {f.name:<58} {f.stat().st_size:>10,} B  [{verified}]")
    return 0


def prune_backups(retain_daily: int, retain_weekly: int, retain_monthly: int) -> Tuple[int, int]:
    if not BACKUPS_DIR.exists():
        return 0, 0
    files = sorted([p for p in BACKUPS_DIR.iterdir() if p.is_file() and p.suffix in (".dump", ".sql")], key=lambda p: p.stat().st_mtime, reverse=True)
    if len(files) <= 1:
        return 0, len(files)
    now = datetime.now(timezone.utc)
    keep = {files[0]}
    daily = 0
    weeks = set()
    months = set()
    for p in files:
        mt = datetime.fromtimestamp(p.stat().st_mtime, tz=timezone.utc)
        if "pre_restore_" in p.name and (now - mt) < timedelta(hours=48):
            keep.add(p)
            continue
        if daily < retain_daily:
            keep.add(p)
            daily += 1
            continue
        wk = (mt.isocalendar().year, mt.isocalendar().week)
        if wk not in weeks and len(weeks) < retain_weekly:
            weeks.add(wk)
            keep.add(p)
            continue
        mk = (mt.year, mt.month)
        if mk not in months and len(months) < retain_monthly:
            months.add(mk)
            keep.add(p)
    deleted = 0
    for p in files:
        if p not in keep:
            p.unlink(missing_ok=True)
            Path(str(p) + ".sha256").unlink(missing_ok=True)
            Path(str(p) + ".meta.json").unlink(missing_ok=True)
            deleted += 1
    _append_history({"action": "CLI_PRUNE", "status": "success", "deleted": deleted, "kept": len(keep)})
    print(f"[PRUNE] Deleted {deleted} expired dump(s); retained {len(keep)} snapshot(s).")
    return deleted, len(keep)


def cmd_prune(args: argparse.Namespace) -> int:
    prune_backups(args.daily, args.weekly, args.monthly)
    return 0


def _restore_into_db(target_path: Path, user: str, dbname: str) -> None:
    term_sql = f"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '{dbname}' AND pid <> pg_backend_pid();"
    _docker_exec(["psql", "-U", user, "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-c", term_sql])
    _docker_exec(["psql", "-U", user, "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-c", f'DROP DATABASE IF EXISTS "{dbname}";'])
    _docker_exec(["psql", "-U", user, "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-c", f'CREATE DATABASE "{dbname}" OWNER "{user}";'])
    if target_path.suffix == ".dump":
        _docker_exec(["pg_restore", "-U", user, "-d", dbname, "--no-owner", "--no-privileges", "--single-transaction"], stdin_path=target_path)
    else:
        _docker_exec(["psql", "-U", user, "-d", dbname, "-v", "ON_ERROR_STOP=1"], stdin_path=target_path)


def cmd_drill(args: argparse.Namespace) -> int:
    target = _resolve_input_file(args.file)
    if not verify_file(target):
        raise RuntimeError(f"Drill aborted: integrity verification failed for {target.name}")
    sandbox_db = args.sandbox_db
    if sandbox_db == "prashant_academy":
        raise ValueError("Sandbox drill cannot target live production DB 'prashant_academy'.")
    print(f"[DRILL] Running non-destructive sandbox restore of {target.name} -> {sandbox_db}...")
    _restore_into_db(target, args.user, sandbox_db)
    res = _docker_exec(["psql", "-U", args.user, "-d", sandbox_db, "-tAc", "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';"])
    tbls = (res.stdout or b"").decode("utf-8", errors="replace").strip()
    _append_history({"action": "CLI_RESTORE_DRILL", "status": "success", "filename": target.name, "sandbox_db": sandbox_db, "tables": tbls})
    print(f"[PASS] Sandbox restore drill succeeded on '{sandbox_db}' ({tbls} tables restored).")
    return 0


def cmd_restore(args: argparse.Namespace) -> int:
    target = _resolve_input_file(args.file)
    if not verify_file(target):
        raise RuntimeError(f"Restore aborted: verification failed for {target.name}")
    if not args.yes:
        ans = input(f"Type 'RESTORE {args.database.upper()}' to overwrite live database '{args.database}' from {target.name}: ").strip()
        if ans != f"RESTORE {args.database.upper()}":
            print("[ABORTED] Confirmation mismatch.")
            return 1

    # Mandatory Pre-Restore Safety Snapshot
    pre_args = argparse.Namespace(
        database=args.database, user=args.user, label="pre_restore", format="custom",
        notes=f"Pre-restore CLI safety snapshot before {target.name}", mirror_dir=None,
        prune=False, retain_daily=7, retain_weekly=4, retain_monthly=6,
    )
    cmd_backup(pre_args)

    print("[RESTORE] Stopping backend container to avoid concurrent writes...")
    subprocess.run(["docker", "compose", "stop", "backend"], cwd=str(REPO_ROOT), check=True)
    try:
        _restore_into_db(target, args.user, args.database)
    finally:
        print("[RESTORE] Starting backend container (runs alembic upgrade head)...")
        subprocess.run(["docker", "compose", "up", "-d", "backend"], cwd=str(REPO_ROOT), check=True)

    _append_history({"action": "CLI_DATABASE_RESTORED", "status": "success", "filename": target.name, "database": args.database})
    print(f"[PASS] Database '{args.database}' restored from {target.name} and backend restarted cleanly.")
    return 0


def cmd_install_schedule(args: argparse.Namespace) -> int:
    python_exe = sys.executable
    script_path = Path(__file__).resolve()
    task_cmd = f'"{python_exe}" "{script_path}" backup --prune'
    if args.mirror_dir:
        task_cmd += f' --mirror-dir "{args.mirror_dir}"'

    schtasks_cmd = [
        "schtasks", "/Create",
        "/TN", args.task_name,
        "/TR", task_cmd,
        "/SC", "DAILY",
        "/ST", args.time,
        "/F",
    ]
    print("[SCHEDULE] Windows Task Scheduler Command:")
    print(" ", " ".join(schtasks_cmd))
    if args.apply:
        res = subprocess.run(schtasks_cmd, capture_output=True, text=True)
        print(res.stdout)
        if res.returncode != 0:
            print(res.stderr, file=sys.stderr)
            return res.returncode
        print(f"[PASS] Registered daily task '{args.task_name}' at {args.time}.")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="PrathamOne EduOS Housekeeping DB Backup & Restore CLI")
    sub = parser.add_subparsers(dest="command", required=True)

    p_bk = sub.add_parser("backup", help="Create & verify a PostgreSQL database backup")
    p_bk.add_argument("--database", default="prashant_academy")
    p_bk.add_argument("--user", default="postgres")
    p_bk.add_argument("--label", default="scheduled")
    p_bk.add_argument("--format", choices=["custom", "plain_sql"], default="custom")
    p_bk.add_argument("--notes", default=None)
    p_bk.add_argument("--mirror-dir", default=None)
    p_bk.add_argument("--prune", action="store_true")
    p_bk.add_argument("--retain-daily", type=int, default=7)
    p_bk.add_argument("--retain-weekly", type=int, default=4)
    p_bk.add_argument("--retain-monthly", type=int, default=6)
    p_bk.set_defaults(func=cmd_backup)

    p_ver = sub.add_parser("verify", help="Verify SHA-256 and TOC of an existing backup")
    p_ver.add_argument("--file", required=True)
    p_ver.set_defaults(func=cmd_verify)

    p_ls = sub.add_parser("list", help="List backups in backups/ and data/backups/")
    p_ls.set_defaults(func=cmd_list)

    p_pr = sub.add_parser("prune", help="Prune expired backups using GFS policy")
    p_pr.add_argument("--daily", type=int, default=7)
    p_pr.add_argument("--weekly", type=int, default=4)
    p_pr.add_argument("--monthly", type=int, default=6)
    p_pr.set_defaults(func=cmd_prune)

    p_dr = sub.add_parser("drill", help="Run non-destructive sandbox restore verification")
    p_dr.add_argument("--file", required=True)
    p_dr.add_argument("--user", default="postgres")
    p_dr.add_argument("--sandbox-db", default="prashant_academy_test")
    p_dr.set_defaults(func=cmd_drill)

    p_rs = sub.add_parser("restore", help="Restore production database with pre-restore safety backup")
    p_rs.add_argument("--file", required=True)
    p_rs.add_argument("--database", default="prashant_academy")
    p_rs.add_argument("--user", default="postgres")
    p_rs.add_argument("--yes", action="store_true")
    p_rs.set_defaults(func=cmd_restore)

    p_sc = sub.add_parser("install-schedule", help="Show or register Windows Task Scheduler nightly job")
    p_sc.add_argument("--task-name", default="PrathamOne_Nightly_DB_Backup")
    p_sc.add_argument("--time", default="02:00")
    p_sc.add_argument("--mirror-dir", default=None)
    p_sc.add_argument("--apply", action="store_true")
    p_sc.set_defaults(func=cmd_install_schedule)

    args = parser.parse_args()
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())

