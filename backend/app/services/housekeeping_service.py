# /**
#  * @file        housekeeping_service.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      backend.app.services.housekeeping_service
#  *
#  * @author      Jawahar R. Mallah
#  * @organization AITDL (AI Technology & Development Lab)
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 AITDL
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-11
#  * @updated     2026-11-12
#  *
#  * @description Domain service for database backup, SHA-256 verification, GFS retention pruning,
#  */

import asyncio
import gzip
import hashlib
import json
import os
import re
import shutil
import tempfile
import zipfile
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import unquote, urlparse

from sqlalchemy import text, select, desc, func, delete, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import NullPool

from app.core.config import settings
from app.core.database import engine
from app.models.communication import CommunicationLog, SharedDocumentToken
from app.models.navigation import UserNavigationActivity
from app.models.settings import InstitutionSetting, SettingAuditLog
from app.models.user import AuditLog, User
from app.services.communication import ChannelAdapter
from app.services.financial_governance_service import FinancialGovernanceService, FinancialFilter

VALID_FILENAME_RE = re.compile(r"^[A-Za-z0-9._-]+\.(edu|dump|sql)$")
VALID_LOG_ARCHIVE_RE = re.compile(r"^[A-Za-z0-9._-]+\.jsonl\.gz$")
VALID_PG_IDENTIFIER_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_]{0,62}$")
RESTORE_CONFIRMATION_PHRASE = "RESTORE PRASHANT_ACADEMY"
MAX_EDU_UNCOMPRESSED_BYTES = 2 * 1024 * 1024 * 1024  # 2 GiB safety limit against malformed zip bombs

DEFAULT_HOUSEKEEPING_POLICY: Dict[str, Any] = {
    "backup_frequency": "daily",
    "backup_time": "02:00",
    "backup_format": "edu",
    "backup_destination": "Local & Mirror",
    "offsite_mirror_path": "",
    "retain_daily": 7,
    "retain_weekly": 4,
    "retain_monthly": 6,
    "auto_vacuum_enabled": True,
    "log_retention_days": 90,
    "alert_enabled": True,
    "alert_email": "",
    "alert_max_backup_age_hours": 36,
    "alert_min_free_disk_percent": 15,
    "dead_tuple_alert_threshold": 10000,
    "archive_before_purge": True,
}


def resolve_backups_dir() -> Path:
    env_override = os.getenv("HOUSEKEEPING_BACKUPS_DIR")
    if env_override:
        p = Path(env_override)
        p.mkdir(parents=True, exist_ok=True)
        return p
    if Path("/app/app/main.py").exists():
        p = Path("/app/backups")
    else:
        p = Path(__file__).resolve().parents[3] / "backups"
    p.mkdir(parents=True, exist_ok=True)
    return p


def resolve_legacy_backups_dir() -> Path:
    env_override = os.getenv("HOUSEKEEPING_LEGACY_BACKUPS_DIR")
    if env_override:
        p = Path(env_override)
        p.mkdir(parents=True, exist_ok=True)
        return p
    if Path("/app/app/main.py").exists():
        p = Path("/app/data/backups")
    else:
        p = Path(__file__).resolve().parents[3] / "data" / "backups"
    p.mkdir(parents=True, exist_ok=True)
    return p


def parse_pg_connection(database_url: Optional[str] = None) -> Dict[str, str]:
    raw_url = (database_url or settings.DATABASE_URL).replace("+asyncpg", "").replace("+psycopg", "")
    parsed = urlparse(raw_url)
    return {
        "host": parsed.hostname or "localhost",
        "port": str(parsed.port or 5432),
        "user": unquote(parsed.username or "postgres"),
        "password": unquote(parsed.password or "postgres"),
        "dbname": (parsed.path or "/prashant_academy").lstrip("/"),
    }


def compute_sha256(file_path: Path) -> str:
    h = hashlib.sha256()
    with file_path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def _extract_edu_payload(edu_path: Path, dest_dir: Path) -> Tuple[Path, bool, Dict[str, Any]]:
    """
    Safely validate and extract a PrathamOne .edu auto-zipped backup package.
    Protects against Zip-Slip traversal and Zip-Bombs, verifies embedded checksum.sha256
    when present, and returns (extracted_payload_path, internal_sha_ok, manifest_dict).
    """
    if not zipfile.is_zipfile(edu_path):
        raise ValueError(f"'{edu_path.name}' is not a valid compressed .edu backup package.")

    with zipfile.ZipFile(edu_path, "r") as zf:
        infos = zf.infolist()
        total_uncompressed = sum(max(0, info.file_size) for info in infos)
        if total_uncompressed > MAX_EDU_UNCOMPRESSED_BYTES:
            raise ValueError("Archive exceeds maximum safe uncompressed size limit.")

        safe_members: Dict[str, zipfile.ZipInfo] = {}
        for info in infos:
            if info.is_dir():
                continue
            member_name = info.filename.replace("\\", "/")
            if member_name.startswith("/") or ".." in Path(member_name).parts:
                raise ValueError(f"Unsafe path entry inside .edu archive rejected: {info.filename}")
            base = Path(member_name).name
            safe_members[base] = info

        payload_info = safe_members.get("database.dump") or safe_members.get("database.sql")
        if payload_info is None:
            for base, info in safe_members.items():
                if base.endswith(".dump") or base.endswith(".sql"):
                    payload_info = info
                    break
        if payload_info is None:
            raise ValueError("Invalid .edu package: missing database.dump or database.sql payload.")

        payload_name = Path(payload_info.filename.replace("\\", "/")).name
        extracted_payload = (dest_dir / payload_name).resolve()
        with zf.open(payload_info, "r") as src, extracted_payload.open("wb") as dst:
            shutil.copyfileobj(src, dst, length=1024 * 1024)

        manifest: Dict[str, Any] = {}
        if "manifest.json" in safe_members:
            try:
                manifest = json.loads(zf.read(safe_members["manifest.json"]).decode("utf-8", errors="replace"))
            except Exception:
                manifest = {}

        internal_sha_ok = True
        if "checksum.sha256" in safe_members:
            recorded = zf.read(safe_members["checksum.sha256"]).decode("utf-8", errors="replace").strip().split()[0]
            computed_inner = compute_sha256(extracted_payload)
            internal_sha_ok = recorded.lower() == computed_inner.lower()

        return extracted_payload, internal_sha_ok, manifest


async def _run_subprocess(cmd: List[str], env_extra: Optional[Dict[str, str]] = None, timeout: int = 300) -> Tuple[int, str, str]:
    env = os.environ.copy()
    if env_extra:
        env.update(env_extra)
    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env=env,
        )
    except FileNotFoundError as exc:
        raise RuntimeError(
            f"Required PostgreSQL CLI binary '{cmd[0]}' is missing inside this container/host. "
            "Rebuild the backend image with postgresql-client installed or run scripts/db_backup.py on the host."
        ) from exc

    try:
        stdout_b, stderr_b = await asyncio.wait_for(proc.communicate(), timeout=timeout)
    except asyncio.TimeoutError:
        proc.kill()
        await proc.wait()
        raise RuntimeError(f"Command '{cmd[0]}' timed out after {timeout} seconds.")

    return proc.returncode or 0, stdout_b.decode("utf-8", errors="replace"), stderr_b.decode("utf-8", errors="replace")


def _append_history_event(event: Dict[str, Any]) -> None:
    backups_dir = resolve_backups_dir()
    log_path = backups_dir / "housekeeping_history.jsonl"
    record = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        **event,
    }
    with log_path.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(record) + "\n")


def read_history_events(limit: int = 50) -> List[Dict[str, Any]]:
    log_path = resolve_backups_dir() / "housekeeping_history.jsonl"
    if not log_path.exists():
        return []
    lines = log_path.read_text(encoding="utf-8", errors="replace").splitlines()
    items: List[Dict[str, Any]] = []
    for line in reversed(lines):
        if not line.strip():
            continue
        try:
            items.append(json.loads(line))
        except Exception:
            continue
        if len(items) >= limit:
            break
    return items


class HousekeepingService:
    """Authoritative backend governance service for database backups, restore, vacuum & schedules."""

    @classmethod
    def validate_mirror_dir(cls, mirror_dir: str) -> Path:
        raw = (mirror_dir or "").strip()
        if not raw or "\x00" in raw:
            raise ValueError("Invalid mirror directory path.")
        candidate = Path(raw)
        if ".." in candidate.parts:
            raise ValueError("Mirror directory must not contain path traversal segments ('..').")
        resolved = candidate.resolve()
        backups_root = resolve_backups_dir().resolve()
        allowed_roots = [
            (backups_root.parent / "mirror").resolve(),
            (backups_root / "mirror").resolve(),
        ]
        env_allowed = os.getenv("HOUSEKEEPING_ALLOWED_MIRROR_DIRS", "")
        for entry in env_allowed.split(os.pathsep):
            entry = entry.strip()
            if entry:
                allowed_roots.append(Path(entry).resolve())
        if not any(resolved == root or resolved.is_relative_to(root) for root in allowed_roots):
            raise ValueError(
                "Offsite mirror path must be located inside an approved backup mirror directory "
                "(or configured via HOUSEKEEPING_ALLOWED_MIRROR_DIRS)."
            )
        return resolved

    @classmethod
    def resolve_safe_path(cls, filename: str, source: str = "backups") -> Path:
        if not VALID_FILENAME_RE.match(filename or ""):
            raise ValueError("Invalid backup filename. Allowed format: alphanumeric, '.', '_', '-' ending in .edu, .dump or .sql")
        base_dir = resolve_legacy_backups_dir() if source == "legacy_data" else resolve_backups_dir()
        candidate = (base_dir / filename).resolve()
        if not candidate.is_relative_to(base_dir.resolve()):
            raise ValueError("Path traversal outside approved backup directory is forbidden.")
        return candidate

    @classmethod
    async def get_housekeeping_policy(cls, db: AsyncSession, institution_id: int = 1) -> Dict[str, Any]:
        stmt = select(InstitutionSetting).where(
            InstitutionSetting.institution_id == institution_id,
            InstitutionSetting.category == "housekeeping",
        )
        rows = (await db.execute(stmt)).scalars().all()
        policy: Dict[str, Any] = dict(DEFAULT_HOUSEKEEPING_POLICY)
        meta: Dict[str, Any] = {
            "last_backup_date": None,
            "last_backup_file": None,
            "last_backup_status": "No verified backup recorded yet",
            "last_backup_sha256": None,
            "last_vacuum_at": None,
        }
        for r in rows:
            val: Any = r.value
            if r.data_type == "boolean":
                val = (val or "").lower() in ("true", "1", "yes")
            elif r.data_type == "number":
                try:
                    val = float(val) if val and "." in val else int(val or 0)
                except Exception:
                    pass
            if r.key in policy:
                policy[r.key] = val
            else:
                meta[r.key] = val
        return {**policy, **meta}

    @classmethod
    async def update_housekeeping_policy(
        cls,
        db: AsyncSession,
        user: User,
        institution_id: int,
        updates: Dict[str, Any],
        reason: str,
    ) -> Dict[str, Any]:
        clean_reason = (reason or "").strip() or "Updated from Housekeeping Policy Workspace"
        allowed_keys = set(DEFAULT_HOUSEKEEPING_POLICY.keys())
        for key, value in updates.items():
            if key not in allowed_keys:
                continue
            dtype = "boolean" if isinstance(value, bool) else ("number" if isinstance(value, (int, float)) else "string")
            serialized = ("true" if value else "false") if isinstance(value, bool) else str(value if value is not None else "")
            existing = (
                await db.execute(
                    select(InstitutionSetting).where(
                        InstitutionSetting.institution_id == institution_id,
                        InstitutionSetting.key == key,
                    )
                )
            ).scalar_one_or_none()
            old_val = existing.value if existing else None
            if existing:
                existing.value = serialized
                existing.data_type = dtype
                existing.category = "housekeeping"
                existing.updated_by_id = user.id
            else:
                db.add(InstitutionSetting(
                    institution_id=institution_id,
                    category="housekeeping",
                    key=key,
                    value=serialized,
                    data_type=dtype,
                    scope="institute",
                    updated_by_id=user.id,
                ))
            if str(old_val) != serialized:
                db.add(SettingAuditLog(
                    institution_id=institution_id,
                    setting_key=f"housekeeping.{key}",
                    category="housekeeping",
                    previous_value=old_val,
                    new_value=serialized,
                    changed_by_id=user.id,
                    changed_by_name=f"{user.first_name} {user.last_name}".strip() or user.username,
                    reason=clean_reason,
                ))
        await db.commit()
        _append_history_event({
            "action": "POLICY_UPDATED",
            "status": "success",
            "actor": user.username,
            "details": f"Updated housekeeping policy keys: {', '.join(k for k in updates if k in allowed_keys)}",
        })
        return await cls.get_housekeeping_policy(db, institution_id)

    @classmethod
    async def _upsert_internal_meta(cls, db: AsyncSession, institution_id: int, user_id: Optional[int], data: Dict[str, Any]) -> None:
        for k, v in data.items():
            existing = (
                await db.execute(
                    select(InstitutionSetting).where(
                        InstitutionSetting.institution_id == institution_id,
                        InstitutionSetting.key == k,
                    )
                )
            ).scalar_one_or_none()
            sval = "" if v is None else str(v)
            if existing:
                existing.value = sval
                existing.category = "housekeeping"
                existing.updated_by_id = user_id
            else:
                db.add(InstitutionSetting(
                    institution_id=institution_id,
                    category="housekeeping",
                    key=k,
                    value=sval,
                    data_type="string",
                    scope="system",
                    updated_by_id=user_id,
                ))

    @classmethod
    def list_backups(cls) -> List[Dict[str, Any]]:
        results: List[Dict[str, Any]] = []
        for source, directory in (("backups", resolve_backups_dir()), ("legacy_data", resolve_legacy_backups_dir())):
            if not directory.exists():
                continue
            for entry in sorted(directory.iterdir(), key=lambda p: p.stat().st_mtime, reverse=True):
                if not entry.is_file() or entry.suffix not in (".edu", ".dump", ".sql"):
                    continue
                stat = entry.stat()
                sha_path = Path(str(entry) + ".sha256")
                meta_path = Path(str(entry) + ".meta.json")
                meta_data: Dict[str, Any] = {}
                if meta_path.exists():
                    try:
                        meta_data = json.loads(meta_path.read_text(encoding="utf-8"))
                    except Exception:
                        meta_data = {}
                stored_sha = None
                if sha_path.exists():
                    stored_sha = sha_path.read_text(encoding="utf-8", errors="replace").strip().split()[0]
                elif meta_data.get("sha256"):
                    stored_sha = meta_data.get("sha256")

                fmt_label = (
                    "edu_zip"
                    if entry.suffix == ".edu"
                    else ("custom_dump" if entry.suffix == ".dump" else "plain_sql")
                )
                results.append({
                    "filename": entry.name,
                    "source": source,
                    "format": fmt_label,
                    "size_bytes": stat.st_size,
                    "size_human": f"{stat.st_size / (1024 * 1024):.2f} MB" if stat.st_size >= 1024 * 1024 else f"{stat.st_size / 1024:.1f} KB",
                    "created_at": meta_data.get("created_at") or datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat(),
                    "label": meta_data.get("label") or ("legacy_snapshot" if source == "legacy_data" else "manual"),
                    "created_by": meta_data.get("created_by") or ("pre-migration" if source == "legacy_data" else "system"),
                    "database": meta_data.get("database") or "prashant_academy",
                    "sha256": stored_sha,
                    "has_checksum": bool(stored_sha),
                    "verified": bool(meta_data.get("verified", False)),
                    "verified_at": meta_data.get("verified_at"),
                    "notes": meta_data.get("notes"),
                })
        return results

    @classmethod
    async def _verify_raw_payload(cls, payload_path: Path, pg: Dict[str, str]) -> Tuple[bool, int, str]:
        if payload_path.suffix == ".dump":
            rc, out, err = await _run_subprocess(
                ["pg_restore", "--list", str(payload_path)],
                env_extra={"PGPASSWORD": pg["password"]},
                timeout=120,
            )
            format_valid = rc == 0
            toc_entries = len([ln for ln in out.splitlines() if ln.strip() and not ln.strip().startswith(";")])
            detail_msg = f"Archive TOC verified ({toc_entries} database objects)" if format_valid else err.strip()
            return format_valid, toc_entries, detail_msg

        head = payload_path.read_text(encoding="utf-8", errors="replace")[:2048]
        format_valid = ("PostgreSQL database dump" in head) or ("CREATE TABLE" in head)
        toc_entries = payload_path.read_text(encoding="utf-8", errors="replace").count("CREATE TABLE ")
        detail_msg = f"Plain SQL header verified ({toc_entries} CREATE TABLE statements)" if format_valid else "Invalid SQL dump header"
        return format_valid, toc_entries, detail_msg

    @classmethod
    async def verify_backup(cls, filename: str, source: str = "backups", user: Optional[User] = None) -> Dict[str, Any]:
        target = cls.resolve_safe_path(filename, source)
        if not target.exists():
            raise ValueError(f"Backup file '{filename}' not found in '{source}'.")

        pg = parse_pg_connection()
        computed_sha = compute_sha256(target)
        sha_path = Path(str(target) + ".sha256")
        sha_match = True
        recorded_sha = None
        if sha_path.exists():
            recorded_sha = sha_path.read_text(encoding="utf-8", errors="replace").strip().split()[0]
            sha_match = recorded_sha.lower() == computed_sha.lower()
        else:
            sha_path.write_text(f"{computed_sha}  {target.name}\n", encoding="utf-8")
            recorded_sha = computed_sha

        toc_entries = 0
        format_valid = False
        detail_msg = ""
        embedded_manifest: Dict[str, Any] = {}

        if target.suffix == ".edu":
            with tempfile.TemporaryDirectory(prefix="poedu_verify_") as tmp_dir:
                try:
                    extracted_payload, inner_sha_ok, embedded_manifest = _extract_edu_payload(target, Path(tmp_dir))
                    payload_ok, toc_entries, inner_detail = await cls._verify_raw_payload(extracted_payload, pg)
                    format_valid = inner_sha_ok and payload_ok
                    detail_msg = (
                        f"Auto-zipped .edu package verified · {inner_detail}"
                        if format_valid
                        else (inner_detail if inner_sha_ok else "Embedded payload SHA-256 mismatch inside .edu package")
                    )
                except ValueError as exc:
                    format_valid = False
                    detail_msg = str(exc)
        else:
            format_valid, toc_entries, detail_msg = await cls._verify_raw_payload(target, pg)

        verified = sha_match and format_valid
        now_iso = datetime.now(timezone.utc).isoformat()
        meta_path = Path(str(target) + ".meta.json")
        meta: Dict[str, Any] = {}
        if meta_path.exists():
            try:
                meta = json.loads(meta_path.read_text(encoding="utf-8"))
            except Exception:
                meta = {}
        if embedded_manifest:
            meta.setdefault("label", embedded_manifest.get("label"))
            meta.setdefault("database", embedded_manifest.get("database"))
            meta.setdefault("payload_format", embedded_manifest.get("payload_format"))
        meta.update({
            "sha256": computed_sha,
            "verified": verified,
            "verified_at": now_iso,
            "toc_entries": toc_entries,
        })
        meta_path.write_text(json.dumps(meta, indent=2), encoding="utf-8")

        _append_history_event({
            "action": "BACKUP_VERIFIED",
            "status": "success" if verified else "failed",
            "filename": filename,
            "source": source,
            "actor": user.username if user else "system",
            "details": detail_msg,
        })
        return {
            "filename": filename,
            "source": source,
            "verified": verified,
            "checksum_match": sha_match,
            "format_valid": format_valid,
            "sha256": computed_sha,
            "recorded_sha256": recorded_sha,
            "toc_entries": toc_entries,
            "detail": detail_msg,
            "verified_at": now_iso,
        }

    @classmethod
    async def create_backup(
        cls,
        db: AsyncSession,
        user: User,
        label: str = "manual",
        backup_format: str = "edu",
        notes: Optional[str] = None,
        mirror_dir: Optional[str] = None,
        institution_id: int = 1,
    ) -> Dict[str, Any]:
        pg = parse_pg_connection()
        backups_dir = resolve_backups_dir()
        safe_label = re.sub(r"[^a-zA-Z0-9_-]+", "_", (label or "manual")).strip("_") or "manual"
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        is_edu_zip = backup_format in ("edu", "edu_sql")
        use_plain_sql = backup_format in ("plain_sql", "edu_sql")

        if is_edu_zip:
            filename = f"POeduOS_{ts}.edu"
            target = backups_dir / filename
            seq = 1
            while target.exists():
                filename = f"POeduOS_{ts}_{seq:02d}.edu"
                target = backups_dir / filename
                seq += 1
        else:
            ext = "sql" if use_plain_sql else "dump"
            filename = f"{pg['dbname']}_{safe_label}_{ts}.{ext}"
            target = backups_dir / filename

        now_iso = datetime.now(timezone.utc).isoformat()
        fmt_flag = "-Fp" if use_plain_sql else "-Fc"

        def _build_pg_dump_cmd(out_file: Path) -> List[str]:
            cmd = [
                "pg_dump",
                "-h", pg["host"],
                "-p", pg["port"],
                "-U", pg["user"],
                fmt_flag,
            ]
            if not use_plain_sql:
                cmd.extend(["-Z", "6"])
            cmd.extend(["-f", str(out_file), pg["dbname"]])
            return cmd

        if is_edu_zip:
            inner_name = "database.sql" if use_plain_sql else "database.dump"
            with tempfile.TemporaryDirectory(prefix="poedu_pack_") as tmp_dir:
                tmp_path = Path(tmp_dir)
                inner_file = tmp_path / inner_name
                rc, _, err = await _run_subprocess(
                    _build_pg_dump_cmd(inner_file),
                    env_extra={"PGPASSWORD": pg["password"]},
                    timeout=300,
                )
                if rc != 0 or not inner_file.exists() or inner_file.stat().st_size == 0:
                    raise RuntimeError(f"PostgreSQL backup failed: {err.strip() or 'Empty output produced'}")

                inner_sha = compute_sha256(inner_file)
                inner_size = inner_file.stat().st_size
                manifest = {
                    "product": "PrathamOne EduOS",
                    "package_format": "edu_zip",
                    "payload_file": inner_name,
                    "payload_format": "plain_sql" if use_plain_sql else "custom_dump",
                    "payload_size_bytes": inner_size,
                    "payload_sha256": inner_sha,
                    "database": pg["dbname"],
                    "label": safe_label,
                    "created_by": user.username,
                    "created_at": now_iso,
                    "notes": notes,
                }
                tmp_zip = tmp_path / filename
                with zipfile.ZipFile(tmp_zip, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as zf:
                    zf.write(inner_file, arcname=inner_name)
                    zf.writestr("checksum.sha256", f"{inner_sha}  {inner_name}\n")
                    zf.writestr("manifest.json", json.dumps(manifest, indent=2))
                shutil.move(str(tmp_zip), str(target))
        else:
            rc, _, err = await _run_subprocess(
                _build_pg_dump_cmd(target),
                env_extra={"PGPASSWORD": pg["password"]},
                timeout=300,
            )
            if rc != 0 or not target.exists() or target.stat().st_size == 0:
                if target.exists():
                    target.unlink(missing_ok=True)
                raise RuntimeError(f"PostgreSQL backup failed: {err.strip() or 'Empty output produced'}")

        sha = compute_sha256(target)
        Path(str(target) + ".sha256").write_text(f"{sha}  {filename}\n", encoding="utf-8")

        recorded_format = "edu_zip" if is_edu_zip else ("plain_sql" if use_plain_sql else "custom_dump")
        meta_path = Path(str(target) + ".meta.json")
        meta_path.write_text(json.dumps({
            "filename": filename,
            "label": safe_label,
            "format": recorded_format,
            "payload_format": "plain_sql" if use_plain_sql else "custom_dump",
            "database": pg["dbname"],
            "created_by": user.username,
            "created_at": now_iso,
            "size_bytes": target.stat().st_size,
            "sha256": sha,
            "notes": notes,
        }, indent=2), encoding="utf-8")

        verify_res = await cls.verify_backup(filename, "backups", user=user)

        mirror_copied = None
        if mirror_dir and mirror_dir.strip():
            mdir = cls.validate_mirror_dir(mirror_dir)
            mdir.mkdir(parents=True, exist_ok=True)
            shutil.copy2(target, mdir / filename)
            shutil.copy2(str(target) + ".sha256", mdir / f"{filename}.sha256")
            mirror_copied = str(mdir / filename)

        status_label = "Verified Healthy" if verify_res["verified"] else "Checksum Warning"
        await cls._upsert_internal_meta(db, institution_id, user.id, {
            "last_backup_date": now_iso,
            "last_backup_file": filename,
            "last_backup_status": status_label,
            "last_backup_sha256": sha,
        })
        db.add(AuditLog(
            user_id=user.id,
            action="HOUSEKEEPING_BACKUP_CREATED",
            resource_type="database_backup",
            details=f"Created backup {filename} ({target.stat().st_size} bytes, sha256={sha[:12]}..., verified={verify_res['verified']})",
            severity="INFO",
        ))
        await db.commit()

        _append_history_event({
            "action": "BACKUP_CREATED",
            "status": "success" if verify_res["verified"] else "warning",
            "filename": filename,
            "actor": user.username,
            "size_bytes": target.stat().st_size,
            "sha256": sha,
            "mirror_copied": mirror_copied,
        })
        return {
            "filename": filename,
            "source": "backups",
            "format": recorded_format,
            "size_bytes": target.stat().st_size,
            "sha256": sha,
            "verified": verify_res["verified"],
            "toc_entries": verify_res["toc_entries"],
            "created_at": now_iso,
            "mirror_copied": mirror_copied,
        }

    @classmethod
    async def save_uploaded_backup(
        cls,
        filename: str,
        raw_bytes: bytes,
        user: User,
    ) -> Dict[str, Any]:
        safe_name = re.sub(r"[^A-Za-z0-9._-]+", "_", Path(filename or "uploaded.edu").name)
        if not VALID_FILENAME_RE.match(safe_name):
            raise ValueError("Uploaded file must end in .edu, .dump, or .sql with alphanumeric characters.")
        if not raw_bytes:
            raise ValueError("Uploaded backup file is empty.")

        backups_dir = resolve_backups_dir()
        target = (backups_dir / safe_name).resolve()
        if target.exists():
            ts = datetime.now().strftime("%Y%m%d_%H%M%S")
            target = (backups_dir / f"{target.stem}_{ts}{target.suffix}").resolve()

        target.write_bytes(raw_bytes)
        sha = compute_sha256(target)
        Path(str(target) + ".sha256").write_text(f"{sha}  {target.name}\n", encoding="utf-8")
        fmt_val = "edu_zip" if target.suffix == ".edu" else ("custom_dump" if target.suffix == ".dump" else "plain_sql")
        Path(str(target) + ".meta.json").write_text(json.dumps({
            "filename": target.name,
            "label": "uploaded",
            "format": fmt_val,
            "database": "prashant_academy",
            "created_by": user.username,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "size_bytes": len(raw_bytes),
            "sha256": sha,
            "notes": "Uploaded via Housekeeping UI",
        }, indent=2), encoding="utf-8")

        verify_res = await cls.verify_backup(target.name, "backups", user=user)
        if not verify_res["format_valid"]:
            target.unlink(missing_ok=True)
            Path(str(target) + ".sha256").unlink(missing_ok=True)
            Path(str(target) + ".meta.json").unlink(missing_ok=True)
            raise ValueError(f"Uploaded file failed PostgreSQL backup validation: {verify_res['detail']}")

        _append_history_event({
            "action": "BACKUP_UPLOADED",
            "status": "success",
            "filename": target.name,
            "actor": user.username,
            "size_bytes": len(raw_bytes),
        })
        return verify_res

    @classmethod
    async def prune_backups(
        cls,
        db: AsyncSession,
        user: User,
        retain_daily: int = 7,
        retain_weekly: int = 4,
        retain_monthly: int = 6,
    ) -> Dict[str, Any]:
        """GFS retention pruning strictly limited to backups/ directory; preserves legacy data/backups/, newest snapshot, and recent pre-restore guards."""
        backups_dir = resolve_backups_dir()
        candidates = sorted(
            [p for p in backups_dir.iterdir() if p.is_file() and p.suffix in (".edu", ".dump", ".sql")],
            key=lambda p: p.stat().st_mtime,
            reverse=True,
        )
        if len(candidates) <= 1:
            return {"deleted": [], "kept_count": len(candidates), "freed_bytes": 0}

        now = datetime.now(timezone.utc)
        keep_paths: set[Path] = {candidates[0]}  # Always keep latest backup
        daily_kept = 0
        weeks_seen: set[Tuple[int, int]] = set()
        months_seen: set[Tuple[int, int]] = set()

        for p in candidates:
            mtime = datetime.fromtimestamp(p.stat().st_mtime, tz=timezone.utc)
            meta_label = ""
            meta_file = Path(str(p) + ".meta.json")
            if meta_file.exists():
                try:
                    meta_label = str(json.loads(meta_file.read_text(encoding="utf-8")).get("label") or "")
                except Exception:
                    meta_label = ""
            if ("pre_restore_" in p.name or meta_label == "pre_restore") and (now - mtime) < timedelta(hours=48):
                keep_paths.add(p)
                continue
            if daily_kept < retain_daily:
                keep_paths.add(p)
                daily_kept += 1
                continue
            wk = (mtime.isocalendar().year, mtime.isocalendar().week)
            if wk not in weeks_seen and len(weeks_seen) < retain_weekly:
                weeks_seen.add(wk)
                keep_paths.add(p)
                continue
            mk = (mtime.year, mtime.month)
            if mk not in months_seen and len(months_seen) < retain_monthly:
                months_seen.add(mk)
                keep_paths.add(p)

        deleted: List[str] = []
        freed_bytes = 0
        for p in candidates:
            if p not in keep_paths:
                freed_bytes += p.stat().st_size
                deleted.append(p.name)
                p.unlink(missing_ok=True)
                Path(str(p) + ".sha256").unlink(missing_ok=True)
                Path(str(p) + ".meta.json").unlink(missing_ok=True)

        db.add(AuditLog(
            user_id=user.id,
            action="HOUSEKEEPING_BACKUPS_PRUNED",
            resource_type="database_backup",
            details=f"Pruned {len(deleted)} expired backup(s), freed {freed_bytes} bytes, kept {len(keep_paths)}.",
            severity="INFO",
        ))
        await db.commit()
        _append_history_event({
            "action": "BACKUPS_PRUNED",
            "status": "success",
            "actor": user.username,
            "deleted_count": len(deleted),
            "freed_bytes": freed_bytes,
            "kept_count": len(keep_paths),
        })
        return {"deleted": deleted, "kept_count": len(keep_paths), "freed_bytes": freed_bytes}

    @classmethod
    async def _recreate_and_restore_pg_db(
        cls,
        pg: Dict[str, str],
        target_db: str,
        backup_path: Path,
    ) -> None:
        if not VALID_PG_IDENTIFIER_RE.match(target_db or ""):
            raise ValueError(f"Unsafe target database identifier: {target_db!r}")
        if not VALID_PG_IDENTIFIER_RE.match(pg.get("user", "")):
            raise ValueError(f"Unsafe PostgreSQL user identifier: {pg.get('user')!r}")
        env = {"PGPASSWORD": pg["password"]}
        terminate_sql = (
            f"SELECT pg_terminate_backend(pid) FROM pg_stat_activity "
            f"WHERE datname = '{target_db}' AND pid <> pg_backend_pid();"
        )
        rc, _, err = await _run_subprocess(
            ["psql", "-h", pg["host"], "-p", pg["port"], "-U", pg["user"], "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-c", terminate_sql],
            env_extra=env,
            timeout=60,
        )
        if rc != 0:
            raise RuntimeError(f"Failed terminating active sessions on '{target_db}': {err.strip()}")

        for stmt in (f'DROP DATABASE IF EXISTS "{target_db}";', f'CREATE DATABASE "{target_db}" OWNER "{pg["user"]}";'):
            rc, _, err = await _run_subprocess(
                ["psql", "-h", pg["host"], "-p", pg["port"], "-U", pg["user"], "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-c", stmt],
                env_extra=env,
                timeout=60,
            )
            if rc != 0:
                raise RuntimeError(f"Failed preparing target database '{target_db}': {err.strip()}")

        if backup_path.suffix == ".edu":
            with tempfile.TemporaryDirectory(prefix="poedu_restore_") as tmp_dir:
                extracted_payload, inner_sha_ok, _ = _extract_edu_payload(backup_path, Path(tmp_dir))
                if not inner_sha_ok:
                    raise RuntimeError(f"Embedded checksum mismatch inside .edu package '{backup_path.name}'.")
                await cls._restore_raw_payload(pg, target_db, extracted_payload, env)
        else:
            await cls._restore_raw_payload(pg, target_db, backup_path, env)

    @classmethod
    async def _restore_raw_payload(
        cls,
        pg: Dict[str, str],
        target_db: str,
        payload_path: Path,
        env: Dict[str, str],
    ) -> None:
        if payload_path.suffix == ".dump":
            rc, _, err = await _run_subprocess(
                [
                    "pg_restore",
                    "-h", pg["host"],
                    "-p", pg["port"],
                    "-U", pg["user"],
                    "-d", target_db,
                    "--no-owner",
                    "--no-privileges",
                    "--single-transaction",
                    str(payload_path),
                ],
                env_extra=env,
                timeout=600,
            )
            if rc != 0:
                raise RuntimeError(f"pg_restore failed on '{target_db}': {err.strip()}")
        else:
            rc, _, err = await _run_subprocess(
                [
                    "psql",
                    "-h", pg["host"],
                    "-p", pg["port"],
                    "-U", pg["user"],
                    "-d", target_db,
                    "-v", "ON_ERROR_STOP=1",
                    "-f", str(payload_path),
                ],
                env_extra=env,
                timeout=600,
            )
            if rc != 0:
                raise RuntimeError(f"psql restore failed on '{target_db}': {err.strip()}")

    @classmethod
    async def run_restore_drill(cls, filename: str, source: str, user: User) -> Dict[str, Any]:
        """Non-destructive sandbox verification restore into prashant_academy_test."""
        pg = parse_pg_connection()
        sandbox_db = os.getenv("HOUSEKEEPING_DRILL_DB", f"{pg['dbname']}_test")
        if sandbox_db == pg["dbname"]:
            raise ValueError("Sandbox drill database must differ from live production database.")

        verify_res = await cls.verify_backup(filename, source, user=user)
        if not verify_res["verified"]:
            raise ValueError(f"Backup verification failed before drill: {verify_res['detail']}")

        backup_path = cls.resolve_safe_path(filename, source)
        await cls._recreate_and_restore_pg_db(pg, sandbox_db, backup_path)

        # Verify Alembic + Ledger Reconciliation on Sandbox DB
        sandbox_url = f"postgresql+asyncpg://{pg['user']}:{pg['password']}@{pg['host']}:{pg['port']}/{sandbox_db}"
        alembic_cwd = "/app" if Path("/app/alembic.ini").exists() else str(Path(__file__).resolve().parents[2])
        rc_alb, out_alb, err_alb = await _run_subprocess(
            ["alembic", "upgrade", "head"],
            env_extra={"DATABASE_URL": sandbox_url},
            timeout=180,
        ) if alembic_cwd == "/app" else (0, "Host drill skipped alembic cwd", "")
        if rc_alb != 0:
            raise RuntimeError(f"Sandbox alembic upgrade check failed: {err_alb.strip()}")

        sb_engine = create_async_engine(sandbox_url, echo=False, poolclass=NullPool)
        sb_session_factory = async_sessionmaker(sb_engine, expire_on_commit=False, class_=AsyncSession)
        try:
            async with sb_session_factory() as sdb:
                tbl_count = (await sdb.execute(
                    text("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public'")
                )).scalar() or 0
                stu_count = (await sdb.execute(text("SELECT COUNT(*) FROM students"))).scalar() or 0
                rec = await FinancialGovernanceService.reconcile_financial_ledgers(
                    sdb, FinancialFilter(institution_id=1, is_demo=False)
                )
        finally:
            await sb_engine.dispose()

        _append_history_event({
            "action": "RESTORE_DRILL_PASSED",
            "status": "success" if rec["is_reconciled"] else "warning",
            "filename": filename,
            "source": source,
            "sandbox_db": sandbox_db,
            "actor": user.username,
            "tables": tbl_count,
            "students": stu_count,
            "variance": rec["ledger_audit"]["variance"],
        })
        return {
            "sandbox_db": sandbox_db,
            "filename": filename,
            "tables_restored": int(tbl_count),
            "students_restored": int(stu_count),
            "is_reconciled": rec["is_reconciled"],
            "variance": rec["ledger_audit"]["variance"],
            "verified_at": datetime.now(timezone.utc).isoformat(),
        }

    @classmethod
    async def restore_backup(
        cls,
        db: AsyncSession,
        filename: str,
        source: str,
        user: User,
        confirmation_phrase: str,
        reason: str,
    ) -> Dict[str, Any]:
        """Guarded live database restore with pre-restore safety snapshot and post-restore reconciliation."""
        if (confirmation_phrase or "").strip() != RESTORE_CONFIRMATION_PHRASE:
            raise ValueError(f"Exact confirmation phrase '{RESTORE_CONFIRMATION_PHRASE}' is required.")
        if len((reason or "").strip()) < 10:
            raise ValueError("Mandatory audit reason (>= 10 characters) is required for live restore.")

        verify_res = await cls.verify_backup(filename, source, user=user)
        if not verify_res["verified"]:
            raise ValueError(f"Restore aborted: backup integrity check failed ({verify_res['detail']}).")

        # 1. Mandatory automatic Pre-Restore Safety Snapshot
        safety_snapshot = await cls.create_backup(
            db,
            user=user,
            label="pre_restore",
            backup_format="edu",
            notes=f"Auto safety snapshot before restoring {filename} ({source}): {reason.strip()}",
        )

        pg = parse_pg_connection()
        backup_path = cls.resolve_safe_path(filename, source)

        # 2. Release SQLAlchemy pool cleanly before terminating DB sessions
        await db.commit()
        await db.close()
        await engine.dispose()

        # 3. Drop, recreate, restore
        await cls._recreate_and_restore_pg_db(pg, pg["dbname"], backup_path)

        # 4. Run Alembic upgrade head so restored older snapshots migrate cleanly to active code schema
        if Path("/app/alembic.ini").exists():
            rc_alb, _, err_alb = await _run_subprocess(["alembic", "upgrade", "head"], timeout=180)
            if rc_alb != 0:
                raise RuntimeError(f"Post-restore Alembic migration failed: {err_alb.strip()}")

        # 5. Re-open fresh pool session to log audit & run SSOT financial reconciliation
        from app.core.database import AsyncSessionLocal
        async with AsyncSessionLocal() as post_db:
            post_db.add(AuditLog(
                user_id=user.id,
                action="HOUSEKEEPING_DATABASE_RESTORED",
                resource_type="database_restore",
                details=(
                    f"Restored database '{pg['dbname']}' from {source}/{filename}. "
                    f"Pre-restore safety backup: {safety_snapshot['filename']}. Reason: {reason.strip()}"
                ),
                severity="WARNING",
            ))
            await post_db.commit()
            rec = await FinancialGovernanceService.reconcile_financial_ledgers(
                post_db, FinancialFilter(institution_id=1, is_demo=False)
            )

        _append_history_event({
            "action": "DATABASE_RESTORED",
            "status": "success" if rec["is_reconciled"] else "warning",
            "filename": filename,
            "source": source,
            "safety_snapshot": safety_snapshot["filename"],
            "actor": user.username,
            "reason": reason.strip(),
            "variance": rec["ledger_audit"]["variance"],
        })
        return {
            "restored_from": filename,
            "source": source,
            "safety_snapshot": safety_snapshot["filename"],
            "is_reconciled": rec["is_reconciled"],
            "variance": rec["ledger_audit"]["variance"],
            "broken_invoices": len(rec["broken_invoices"]),
            "restored_at": datetime.now(timezone.utc).isoformat(),
        }

    @classmethod
    async def run_vacuum_analyze(cls, db: AsyncSession, user: User, tables: Optional[List[str]] = None) -> Dict[str, Any]:
        pg = parse_pg_connection()
        env = {"PGPASSWORD": pg["password"]}
        safe_tables: List[str] = []
        if tables:
            valid_tbls = (await db.execute(
                text("SELECT tablename FROM pg_tables WHERE schemaname='public'")
            )).scalars().all()
            valid_set = set(valid_tbls)
            for t in tables:
                if t not in valid_set or not re.match(r"^[a-z0-9_]+$", t):
                    raise ValueError(f"Unknown or invalid table name: {t}")
                safe_tables.append(t)

        sql_cmd = (
            "VACUUM (ANALYZE) " + ", ".join(f'"{t}"' for t in safe_tables) + ";"
            if safe_tables
            else "VACUUM (ANALYZE);"
        )
        rc, _, err = await _run_subprocess(
            ["psql", "-h", pg["host"], "-p", pg["port"], "-U", pg["user"], "-d", pg["dbname"], "-v", "ON_ERROR_STOP=1", "-c", sql_cmd],
            env_extra=env,
            timeout=180,
        )
        if rc != 0:
            raise RuntimeError(f"PostgreSQL VACUUM ANALYZE failed: {err.strip()}")

        now_iso = datetime.now(timezone.utc).isoformat()
        await cls._upsert_internal_meta(db, 1, user.id, {"last_vacuum_at": now_iso})
        db.add(AuditLog(
            user_id=user.id,
            action="HOUSEKEEPING_VACUUM_ANALYZE",
            resource_type="database_maintenance",
            details=f"Executed {sql_cmd} cleanly.",
            severity="INFO",
        ))
        await db.commit()
        _append_history_event({
            "action": "VACUUM_ANALYZE",
            "status": "success",
            "actor": user.username,
            "details": sql_cmd,
        })
        return {"status": "completed", "command": sql_cmd, "executed_at": now_iso}

    @classmethod
    async def get_overview_telemetry(cls, db: AsyncSession, institution_id: int = 1) -> Dict[str, Any]:
        pg = parse_pg_connection()
        db_size_row = (await db.execute(
            text("SELECT pg_database_size(current_database()) AS size_bytes, pg_size_pretty(pg_database_size(current_database())) AS size_pretty")
        )).one()
        conn_row = (await db.execute(
            text("SELECT count(*) AS total_conns, count(*) FILTER (WHERE state = 'active') AS active_conns FROM pg_stat_activity WHERE datname = current_database()")
        )).one()
        tbl_rows = (await db.execute(
            text("""
                SELECT
                    relname AS table_name,
                    n_live_tup AS live_rows,
                    n_dead_tup AS dead_tuples,
                    pg_total_relation_size(relid) AS total_bytes,
                    pg_size_pretty(pg_total_relation_size(relid)) AS size_pretty,
                    last_vacuum,
                    last_autovacuum,
                    last_analyze
                FROM pg_stat_user_tables
                ORDER BY pg_total_relation_size(relid) DESC
                LIMIT 15
            """)
        )).all()

        backups = cls.list_backups()
        total_backup_bytes = sum(b["size_bytes"] for b in backups)
        verified_backups = [b for b in backups if b.get("verified")]
        latest = verified_backups[0] if verified_backups else (backups[0] if backups else None)
        policy = await cls.get_housekeeping_policy(db, institution_id)
        dead_total = sum(int(r.dead_tuples or 0) for r in tbl_rows)
        storage = cls.get_storage_telemetry()
        alerts_summary = await cls.evaluate_health_alerts(
            db, institution_id, policy=policy, storage=storage, dead_tuples_top15=dead_total, backups=backups
        )

        return {
            "database": {
                "name": pg["dbname"],
                "host": pg["host"],
                "size_bytes": int(db_size_row.size_bytes or 0),
                "size_pretty": db_size_row.size_pretty or "0 bytes",
                "total_connections": int(conn_row.total_conns or 0),
                "active_connections": int(conn_row.active_conns or 0),
                "dead_tuples_top15": dead_total,
            },
            "backups_summary": {
                "total_count": len(backups),
                "verified_count": len(verified_backups),
                "total_size_bytes": total_backup_bytes,
                "total_size_human": f"{total_backup_bytes / (1024 * 1024):.2f} MB",
                "last_backup_date": latest["created_at"] if latest else policy.get("last_backup_date"),
                "last_backup_file": latest["filename"] if latest else policy.get("last_backup_file"),
                "backup_status": (
                    "Verified Healthy" if (latest and latest.get("verified"))
                    else ("Unverified Archive Present" if latest else "No Backup Found")
                ),
            },
            "top_tables": [
                {
                    "table_name": r.table_name,
                    "live_rows": int(r.live_rows or 0),
                    "dead_tuples": int(r.dead_tuples or 0),
                    "total_bytes": int(r.total_bytes or 0),
                    "size_pretty": r.size_pretty,
                    "last_vacuum": (r.last_vacuum or r.last_autovacuum).isoformat() if (r.last_vacuum or r.last_autovacuum) else None,
                    "last_analyze": r.last_analyze.isoformat() if r.last_analyze else None,
                }
                for r in tbl_rows
            ],
            "policy": policy,
            "storage": storage,
            "alerts_summary": alerts_summary,
            "scheduler_commands": {
                "windows_task_scheduler": (
                    f'schtasks /Create /TN "PrathamOne_Nightly_DB_Backup" '
                    f'/TR "python F:\\PrashantAcademy\\scripts\\db_backup.py backup --prune" '
                    f'/SC DAILY /ST {policy.get("backup_time", "02:00")} /F'
                ),
                "linux_cron": (
                    f'0 {str(policy.get("backup_time", "02:00")).split(":")[0].lstrip("0") or "2"} * * * '
                    f'cd /opt/prashantacademy && python3 scripts/db_backup.py backup --prune >> backups/cron.log 2>&1'
                ),
            },
        }

    # ─── Storage Inspection, Orphan Sidecar Cleanup, Log Archival & Health Alerts ───

    @classmethod
    def resolve_safe_log_archive_path(cls, filename: str) -> Path:
        if not VALID_LOG_ARCHIVE_RE.match(filename or ""):
            raise ValueError("Invalid log archive filename. Must end in .jsonl.gz.")
        archives_dir = (resolve_backups_dir() / "archives").resolve()
        archives_dir.mkdir(parents=True, exist_ok=True)
        candidate = (archives_dir / filename).resolve()
        if not candidate.is_relative_to(archives_dir):
            raise ValueError("Path traversal outside approved log archive directory is forbidden.")
        return candidate

    @classmethod
    def get_storage_telemetry(cls) -> Dict[str, Any]:
        backups_dir = resolve_backups_dir()
        legacy_dir = resolve_legacy_backups_dir()
        archives_dir = backups_dir / "archives"
        archives_dir.mkdir(parents=True, exist_ok=True)

        usage = shutil.disk_usage(backups_dir)
        valid_archives = {
            p.name for p in backups_dir.iterdir()
            if p.is_file() and p.suffix in (".edu", ".dump", ".sql")
        }

        breakdown = {
            "edu_bytes": 0,
            "edu_count": 0,
            "raw_dump_sql_bytes": 0,
            "raw_dump_sql_count": 0,
            "legacy_bytes": 0,
            "legacy_count": 0,
            "log_archive_bytes": 0,
            "log_archive_count": 0,
            "orphan_bytes": 0,
            "orphan_count": 0,
        }
        orphan_files: List[Dict[str, Any]] = []

        for entry in sorted(backups_dir.iterdir(), key=lambda p: p.name):
            if not entry.is_file():
                continue
            sz = entry.stat().st_size
            if entry.suffix == ".edu":
                breakdown["edu_bytes"] += sz
                breakdown["edu_count"] += 1
            elif entry.suffix in (".dump", ".sql"):
                breakdown["raw_dump_sql_bytes"] += sz
                breakdown["raw_dump_sql_count"] += 1
            elif entry.name.endswith(".sha256") and entry.name[:-7] not in valid_archives:
                breakdown["orphan_bytes"] += sz
                breakdown["orphan_count"] += 1
                orphan_files.append({"filename": entry.name, "size_bytes": sz, "kind": "orphan_sha256"})
            elif entry.name.endswith(".meta.json") and entry.name[:-10] not in valid_archives:
                breakdown["orphan_bytes"] += sz
                breakdown["orphan_count"] += 1
                orphan_files.append({"filename": entry.name, "size_bytes": sz, "kind": "orphan_meta"})
            elif entry.suffix in (".tmp", ".part"):
                breakdown["orphan_bytes"] += sz
                breakdown["orphan_count"] += 1
                orphan_files.append({"filename": entry.name, "size_bytes": sz, "kind": "temp_file"})

        for entry in legacy_dir.iterdir() if legacy_dir.exists() else []:
            if entry.is_file() and entry.suffix in (".edu", ".dump", ".sql"):
                breakdown["legacy_bytes"] += entry.stat().st_size
                breakdown["legacy_count"] += 1

        log_archives: List[Dict[str, Any]] = []
        for entry in sorted(archives_dir.iterdir(), key=lambda p: p.stat().st_mtime, reverse=True):
            if not entry.is_file() or not entry.name.endswith(".jsonl.gz"):
                continue
            st = entry.stat()
            breakdown["log_archive_bytes"] += st.st_size
            breakdown["log_archive_count"] += 1
            sha_p = Path(str(entry) + ".sha256")
            sha_val = sha_p.read_text(encoding="utf-8", errors="replace").strip().split()[0] if sha_p.exists() else None
            log_archives.append({
                "filename": entry.name,
                "size_bytes": st.st_size,
                "size_human": f"{st.st_size / 1024:.1f} KB",
                "created_at": datetime.fromtimestamp(st.st_mtime, tz=timezone.utc).isoformat(),
                "sha256": sha_val,
            })

        total_disk = max(1, usage.total)
        free_pct = round((usage.free / total_disk) * 100.0, 2)
        return {
            "disk": {
                "path": str(backups_dir),
                "total_bytes": int(usage.total),
                "used_bytes": int(usage.used),
                "free_bytes": int(usage.free),
                "free_percent": free_pct,
                "used_percent": round(100.0 - free_pct, 2),
                "total_human": f"{usage.total / (1024 ** 3):.2f} GB",
                "free_human": f"{usage.free / (1024 ** 3):.2f} GB",
            },
            "breakdown": breakdown,
            "orphan_files": orphan_files,
            "log_archives": log_archives,
        }

    @classmethod
    async def clean_orphan_files(cls, db: AsyncSession, user: User) -> Dict[str, Any]:
        backups_dir = resolve_backups_dir()
        storage = cls.get_storage_telemetry()
        deleted: List[str] = []
        freed_bytes = 0
        for item in storage["orphan_files"]:
            fname = item["filename"]
            candidate = (backups_dir / fname).resolve()
            if not candidate.is_relative_to(backups_dir.resolve()):
                continue
            if candidate.exists() and candidate.is_file():
                freed_bytes += candidate.stat().st_size
                candidate.unlink(missing_ok=True)
                deleted.append(fname)

        db.add(AuditLog(
            user_id=user.id,
            action="HOUSEKEEPING_ORPHANS_CLEANED",
            resource_type="storage_cleanup",
            details=f"Removed {len(deleted)} orphan sidecar/temp file(s), freed {freed_bytes} bytes.",
            severity="INFO",
        ))
        await db.commit()
        _append_history_event({
            "action": "ORPHANS_CLEANED",
            "status": "success",
            "actor": user.username,
            "deleted_count": len(deleted),
            "freed_bytes": freed_bytes,
        })
        return {"deleted": deleted, "freed_bytes": freed_bytes}

    @classmethod
    def _build_log_cleanup_specs(cls, institution_id: int, cutoff: datetime) -> Dict[str, Dict[str, Any]]:
        inst_users = select(User.id).where(
            or_(User.institution_id == institution_id, User.institution_id.is_(None))
        )
        return {
            "navigation_activity": {
                "label": "Navigation Telemetry (UserNavigationActivity)",
                "model": UserNavigationActivity,
                "where": and_(
                    UserNavigationActivity.institution_id == institution_id,
                    UserNavigationActivity.accessed_at < cutoff,
                ),
                "serializer": lambda r: {
                    "id": r.id, "user_id": r.user_id, "institution_id": r.institution_id,
                    "module_key": r.module_key, "route_path": r.route_path,
                    "accessed_at": r.accessed_at.isoformat() if r.accessed_at else None,
                },
            },
            "expired_tokens": {
                "label": "Expired / Revoked Share Tokens (SharedDocumentToken)",
                "model": SharedDocumentToken,
                "where": and_(
                    SharedDocumentToken.institution_id == institution_id,
                    or_(
                        SharedDocumentToken.expires_at < cutoff,
                        and_(SharedDocumentToken.is_revoked.is_(True), SharedDocumentToken.created_at < cutoff),
                    ),
                ),
                "serializer": lambda r: {
                    "id": r.id, "document_type": r.document_type, "record_id": r.record_id,
                    "recipient_name": r.recipient_name, "is_revoked": r.is_revoked,
                    "expires_at": r.expires_at.isoformat() if r.expires_at else None,
                    "created_at": r.created_at.isoformat() if r.created_at else None,
                },
            },
            "communication_logs": {
                "label": "Historical Message Dispatch Logs (CommunicationLog)",
                "model": CommunicationLog,
                "where": and_(
                    CommunicationLog.institution_id == institution_id,
                    CommunicationLog.created_at < cutoff,
                ),
                "serializer": lambda r: {
                    "id": r.id, "channel": r.channel, "recipient_type": r.recipient_type,
                    "recipient_name": r.recipient_name, "recipient_destination": r.recipient_destination,
                    "template_code": r.template_code, "status": r.status,
                    "created_at": r.created_at.isoformat() if r.created_at else None,
                },
            },
            "routine_audit_logs": {
                "label": "Routine Info Audit Logs (AuditLog severity='info', non-system)",
                "model": AuditLog,
                "where": and_(
                    AuditLog.created_at < cutoff,
                    AuditLog.is_system_audit.is_(False),
                    func.lower(AuditLog.severity) == "info",
                    or_(AuditLog.user_id.is_(None), AuditLog.user_id.in_(inst_users)),
                ),
                "serializer": lambda r: {
                    "id": r.id, "user_id": r.user_id, "action": r.action,
                    "resource_type": r.resource_type, "resource_id": r.resource_id,
                    "severity": r.severity, "details": r.details,
                    "created_at": r.created_at.isoformat() if r.created_at else None,
                },
            },
        }

    @classmethod
    async def preview_log_cleanup(
        cls,
        db: AsyncSession,
        institution_id: int = 1,
        retention_days: Optional[int] = None,
        categories: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        policy = await cls.get_housekeeping_policy(db, institution_id)
        days = int(retention_days if retention_days is not None else policy.get("log_retention_days", 90))
        if days < 7:
            raise ValueError("Retention floor violation: retention_days must be at least 7 days.")
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        specs = cls._build_log_cleanup_specs(institution_id, cutoff)
        selected = [c for c in (categories or list(specs.keys())) if c in specs]

        breakdown: List[Dict[str, Any]] = []
        total_eligible = 0
        for key in selected:
            spec = specs[key]
            model = spec["model"]
            cnt = int((await db.execute(select(func.count(model.id)).where(spec["where"]))).scalar() or 0)
            total_eligible += cnt
            breakdown.append({
                "category": key,
                "label": spec["label"],
                "eligible_count": cnt,
            })

        return {
            "retention_days": days,
            "cutoff_at": cutoff.isoformat(),
            "total_eligible": total_eligible,
            "categories": breakdown,
            "protected_guarantee": "Financial ledgers, FeeReceipts, SettingAuditLog, and WARNING/CRITICAL audit records are permanently exempt.",
        }

    @classmethod
    async def execute_log_cleanup(
        cls,
        db: AsyncSession,
        user: User,
        institution_id: int = 1,
        retention_days: Optional[int] = None,
        categories: Optional[List[str]] = None,
        confirm: bool = False,
    ) -> Dict[str, Any]:
        if not confirm:
            raise ValueError("Explicit confirmation (confirm=True) is required before archiving and purging logs.")
        policy = await cls.get_housekeeping_policy(db, institution_id)
        days = int(retention_days if retention_days is not None else policy.get("log_retention_days", 90))
        if days < 7:
            raise ValueError("Retention floor violation: retention_days must be at least 7 days.")

        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        specs = cls._build_log_cleanup_specs(institution_id, cutoff)
        selected = [c for c in (categories or list(specs.keys())) if c in specs]
        if not selected:
            raise ValueError("Select at least one valid log category for cleanup.")

        archives_dir = resolve_backups_dir() / "archives"
        archives_dir.mkdir(parents=True, exist_ok=True)
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        archive_on = bool(policy.get("archive_before_purge", True))

        archived_files: List[Dict[str, Any]] = []
        purged_by_category: Dict[str, int] = {}
        total_purged = 0

        for key in selected:
            spec = specs[key]
            model = spec["model"]
            rows = (await db.execute(select(model).where(spec["where"]).order_by(model.id))).scalars().all()
            if not rows:
                purged_by_category[key] = 0
                continue

            if archive_on:
                arch_name = f"logs_{key}_{ts}.jsonl.gz"
                arch_path = archives_dir / arch_name
                seq = 1
                while arch_path.exists():
                    arch_name = f"logs_{key}_{ts}_{seq:02d}.jsonl.gz"
                    arch_path = archives_dir / arch_name
                    seq += 1
                with gzip.open(arch_path, "wt", encoding="utf-8") as gz:
                    for row in rows:
                        gz.write(json.dumps(spec["serializer"](row), default=str) + "\n")
                sha = compute_sha256(arch_path)
                Path(str(arch_path) + ".sha256").write_text(f"{sha}  {arch_name}\n", encoding="utf-8")
                archived_files.append({
                    "category": key,
                    "filename": arch_name,
                    "row_count": len(rows),
                    "size_bytes": arch_path.stat().st_size,
                    "sha256": sha,
                })

            row_ids = [r.id for r in rows]
            for i in range(0, len(row_ids), 500):
                batch = row_ids[i:i + 500]
                await db.execute(delete(model).where(model.id.in_(batch)))
            purged_by_category[key] = len(row_ids)
            total_purged += len(row_ids)

        db.add(AuditLog(
            user_id=user.id,
            action="HOUSEKEEPING_LOGS_ARCHIVED_AND_PURGED",
            resource_type="log_maintenance",
            details=f"Archived & purged {total_purged} log row(s) older than {days}d across {', '.join(selected)}.",
            severity="WARNING",
        ))
        await db.commit()
        _append_history_event({
            "action": "LOGS_ARCHIVED_PURGED",
            "status": "success",
            "actor": user.username,
            "retention_days": days,
            "total_purged": total_purged,
            "archives": [a["filename"] for a in archived_files],
        })
        return {
            "retention_days": days,
            "cutoff_at": cutoff.isoformat(),
            "total_purged": total_purged,
            "purged_by_category": purged_by_category,
            "archived_files": archived_files,
        }

    @classmethod
    async def evaluate_health_alerts(
        cls,
        db: AsyncSession,
        institution_id: int = 1,
        policy: Optional[Dict[str, Any]] = None,
        storage: Optional[Dict[str, Any]] = None,
        dead_tuples_top15: Optional[int] = None,
        backups: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        pol = policy or await cls.get_housekeeping_policy(db, institution_id)
        stor = storage or cls.get_storage_telemetry()
        bks = backups if backups is not None else cls.list_backups()
        if dead_tuples_top15 is None:
            dead_tuples_top15 = int((await db.execute(
                text("SELECT COALESCE(SUM(n_dead_tup), 0) FROM (SELECT n_dead_tup FROM pg_stat_user_tables ORDER BY pg_total_relation_size(relid) DESC LIMIT 15) t")
            )).scalar() or 0)

        alerts: List[Dict[str, Any]] = []
        now = datetime.now(timezone.utc)
        max_age_h = int(pol.get("alert_max_backup_age_hours", 36) or 36)
        min_free_pct = float(pol.get("alert_min_free_disk_percent", 15) or 15)
        dead_thresh = int(pol.get("dead_tuple_alert_threshold", 10000) or 10000)

        verified_bks = [b for b in bks if b.get("verified")]
        if not verified_bks:
            alerts.append({
                "id": "no_verified_backup",
                "severity": "critical",
                "title": "No Verified Database Backup Found",
                "detail": "Zero verified backups exist in the catalog. Create and verify a POeduOS_*.edu backup immediately.",
                "recommended_tab": "backups",
            })
        else:
            try:
                latest_dt = datetime.fromisoformat(str(verified_bks[0]["created_at"]).replace("Z", "+00:00"))
                if latest_dt.tzinfo is None:
                    latest_dt = latest_dt.replace(tzinfo=timezone.utc)
                age_hours = (now - latest_dt).total_seconds() / 3600.0
                if age_hours >= max_age_h * 2:
                    alerts.append({
                        "id": "backup_critically_stale",
                        "severity": "critical",
                        "title": "Verified Backup Critically Overdue",
                        "detail": f"Latest verified backup is {age_hours:.1f}h old (threshold {max_age_h}h).",
                        "recommended_tab": "backups",
                    })
                elif age_hours >= max_age_h:
                    alerts.append({
                        "id": "backup_stale",
                        "severity": "warning",
                        "title": "Backup Schedule Attention Needed",
                        "detail": f"Latest verified backup is {age_hours:.1f}h old (max threshold {max_age_h}h).",
                        "recommended_tab": "backups",
                    })
            except Exception:
                pass

        unverified_managed = [b for b in bks if b.get("source") == "backups" and not b.get("verified")]
        if unverified_managed:
            alerts.append({
                "id": "unverified_archives",
                "severity": "warning",
                "title": f"{len(unverified_managed)} Unverified Archive(s) in Managed Storage",
                "detail": "Run checksum & TOC verification to confirm restore readiness of older archives.",
                "recommended_tab": "backups",
            })

        free_pct = float(stor["disk"]["free_percent"])
        if free_pct < 5.0:
            alerts.append({
                "id": "disk_critical",
                "severity": "critical",
                "title": "Critical Host Disk Capacity",
                "detail": f"Only {free_pct:.1f}% ({stor['disk']['free_human']}) free on backup volume.",
                "recommended_tab": "maintenance",
            })
        elif free_pct < min_free_pct:
            alerts.append({
                "id": "disk_low",
                "severity": "warning",
                "title": "Low Backup Volume Free Space",
                "detail": f"Free disk space is {free_pct:.1f}% (below {min_free_pct:.0f}% policy floor).",
                "recommended_tab": "maintenance",
            })

        if int(dead_tuples_top15) > dead_thresh:
            alerts.append({
                "id": "tuple_bloat",
                "severity": "warning",
                "title": "PostgreSQL Dead Tuple Bloat Detected",
                "detail": f"{dead_tuples_top15:,} dead tuples detected across top tables (threshold {dead_thresh:,}). Run VACUUM (ANALYZE).",
                "recommended_tab": "maintenance",
            })

        if stor["breakdown"]["orphan_count"] > 0:
            alerts.append({
                "id": "orphan_sidecars",
                "severity": "info",
                "title": f"{stor['breakdown']['orphan_count']} Orphan Sidecar/Temp File(s)",
                "detail": "Dangling .sha256/.meta.json or .tmp files can be cleaned safely without touching backups.",
                "recommended_tab": "maintenance",
            })

        cleanup_prev = await cls.preview_log_cleanup(db, institution_id, retention_days=int(pol.get("log_retention_days", 90) or 90))
        if cleanup_prev["total_eligible"] > 5000:
            alerts.append({
                "id": "log_backlog",
                "severity": "info",
                "title": f"{cleanup_prev['total_eligible']:,} Historical Log Rows Eligible for Archival",
                "detail": f"Logs older than {cleanup_prev['retention_days']} days can be archived to .jsonl.gz and purged.",
                "recommended_tab": "maintenance",
            })

        crit_n = sum(1 for a in alerts if a["severity"] == "critical")
        warn_n = sum(1 for a in alerts if a["severity"] == "warning")
        health_status = "critical" if crit_n > 0 else ("warning" if warn_n > 0 else "healthy")
        return {
            "health_status": health_status,
            "critical_count": crit_n,
            "warning_count": warn_n,
            "total_alerts": len(alerts),
            "evaluated_at": now.isoformat(),
            "items": alerts,
        }

    @classmethod
    async def dispatch_health_alert_notification(
        cls,
        db: AsyncSession,
        user: User,
        institution_id: int = 1,
        recipient_email: Optional[str] = None,
    ) -> Dict[str, Any]:
        policy = await cls.get_housekeeping_policy(db, institution_id)
        alerts = await cls.evaluate_health_alerts(db, institution_id, policy=policy)
        target_email = (recipient_email or policy.get("alert_email") or user.email or "").strip()
        if not target_email or "@" not in target_email:
            raise ValueError("A valid recipient email address is required to dispatch housekeeping alerts.")

        summary_lines = [
            f"PrathamOne EduOS Housekeeping Health Report — Status: {alerts['health_status'].upper()}",
            f"Critical Alerts: {alerts['critical_count']} | Warnings: {alerts['warning_count']}",
            "",
        ]
        for item in alerts["items"]:
            summary_lines.append(f"[{item['severity'].upper()}] {item['title']}: {item['detail']}")
        if not alerts["items"]:
            summary_lines.append("All backup, disk capacity, and PostgreSQL maintenance checks are healthy.")
        body_text = "\n".join(summary_lines)
        subject = f"[PrathamOne EduOS Housekeeping] Health Status: {alerts['health_status'].upper()}"

        ok, dispatch_status, msg_or_err = await ChannelAdapter.dispatch_email(
            recipient_email=target_email,
            subject=subject,
            html_body="<pre>" + body_text + "</pre>",
            plain_text=body_text,
        )
        comm_log = CommunicationLog(
            institution_id=institution_id,
            channel="EMAIL",
            recipient_type="STAFF",
            recipient_id=user.id,
            recipient_name=f"{user.first_name} {user.last_name}".strip() or user.username,
            recipient_destination=target_email,
            template_code="HOUSEKEEPING_ALERT",
            subject=subject,
            content=body_text,
            status=dispatch_status if ok else "FAILED",
            error_message=None if ok else msg_or_err,
            sender_id=user.id,
            sender_name=user.username,
            sent_at=datetime.now(timezone.utc) if ok else None,
        )
        db.add(comm_log)
        db.add(AuditLog(
            user_id=user.id,
            action="HOUSEKEEPING_ALERT_DISPATCHED",
            resource_type="health_alert",
            details=f"Dispatched Housekeeping alert digest to {target_email} ({dispatch_status}).",
            severity="INFO",
        ))
        await db.commit()
        _append_history_event({
            "action": "ALERT_DISPATCHED",
            "status": "success" if ok else "failed",
            "actor": user.username,
            "details": f"Digest to {target_email}: {alerts['health_status']} ({msg_or_err})",
        })
        return {
            "dispatched": ok,
            "status": dispatch_status if ok else "FAILED",
            "recipient": target_email,
            "reference": msg_or_err,
            "health_status": alerts["health_status"],
            "alert_count": alerts["total_alerts"],
        }

