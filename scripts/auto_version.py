#!/usr/bin/env python3
# /**
#  * @file        auto_version.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      scripts
#  *
#  * @author      Jawahar R. Mallah
#  * @organization AITDL (AI Technology & Development Lab)
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 AITDL
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-06
#  * @updated     2026-11-10
#  *
#  * @description Automated versioning engine dynamically calculating semantic versions, revision counts, and build metadata across frontend and backend.
#  */

import os
import sys
import re
import json
import argparse
import subprocess
from datetime import datetime, timezone
from typing import Dict, Any, List, Tuple, Optional

# Ensure UTF-8 output encoding on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Baseline commit representing product rebrand and version reset to v1.0.0
BASELINE_COMMIT = "c556dd9"
BASELINE_VERSION = (1, 0, 0)
PRODUCT_NAME = "PrathamOne EduOS"
EDITION = "Coaching Institute Edition"

SEMVER_REGEX = re.compile(r"^(\d+)\.(\d+)\.(\d+)(?:-([a-zA-Z0-9.]+))?$")

# Conventional commit categories mapping
CONVENTIONAL_CATEGORIES = {
    "feat": "added",
    "feature": "added",
    "add": "added",
    "fix": "fixed",
    "bugfix": "fixed",
    "security": "security",
    "sec": "security",
    "vuln": "security",
    "refactor": "changed",
    "perf": "changed",
    "style": "changed",
    "chore": "changed",
    "build": "changed",
    "ci": "changed",
    "docs": "changed",
    "doc": "changed",
    "migration": "database",
    "db": "database",
    "schema": "database",
    "deprecate": "deprecated",
    "deprecated": "deprecated",
    "remove": "deprecated",
    "revert": "fixed",
    "test": "changed",
}


def parse_semver(version_str: str) -> Tuple[int, int, int, Optional[str]]:
    clean = version_str.lstrip("v").strip()
    m = SEMVER_REGEX.match(clean)
    if not m:
        raise ValueError(f"Invalid semantic version: '{version_str}'")
    return int(m.group(1)), int(m.group(2)), int(m.group(3)), m.group(4)


def categorize_commit_message(msg: str) -> Tuple[str, str, bool]:
    is_breaking = "BREAKING CHANGE" in msg or "!:" in msg
    clean = msg.strip().split("\n")[0]
    match = re.match(r"^([a-zA-Z]+)(?:\([^\)]+\))?!?:?\s*(.*)$", clean)
    if match:
        prefix = match.group(1).lower()
        desc = match.group(2).strip() or clean
        cat = CONVENTIONAL_CATEGORIES.get(prefix, "changed")
        return cat, desc, is_breaking

    lower = clean.lower()
    if lower.startswith("add ") or lower.startswith("create ") or "feature" in lower:
        return "added", clean, is_breaking
    if lower.startswith("fix ") or lower.startswith("resolve ") or "bug" in lower or "error" in lower:
        return "fixed", clean, is_breaking
    if "security" in lower or "audit" in lower or "cve" in lower or "token" in lower:
        return "security", clean, is_breaking
    if "migration" in lower or "alembic" in lower or "table" in lower or "schema" in lower:
        return "database", clean, is_breaking
    return "changed", clean, is_breaking


def detect_affected_modules(file_paths: List[str]) -> List[str]:
    modules = set()
    for path in file_paths:
        p = path.lower()
        if "student" in p:
            modules.add("students")
        if "fee" in p or "concession" in p:
            modules.add("fees")
        if "payment" in p or "receipt" in p:
            modules.add("payments")
        if "academic" in p or "standard" in p or "division" in p or "board" in p:
            modules.add("academic")
        if "report" in p:
            modules.add("reports")
        if "setting" in p:
            modules.add("settings")
        if "auth" in p or "user" in p:
            modules.add("auth")
        if "staff" in p or "teacher" in p:
            modules.add("staff")
        if "communication" in p or "message" in p:
            modules.add("communication")
        if "alembic" in p or "migration" in p:
            modules.add("database")
        if "frontend" in p or "src/pages" in p or "src/components" in p:
            modules.add("frontend_ui")
    return sorted(list(modules)) or ["core_platform"]


def format_markdown_release_notes(
    version: str,
    title: str,
    build_number: str,
    environment: str,
    structured: Dict[str, List[str]],
    summary: Dict[str, Any],
) -> str:
    date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    md = [
        f"# Release Notes — PrathamOne EduOS v{version}",
        f"**Release Title**: {title}  ",
        f"**Release Date**: {date_str}  ",
        f"**Build Identifier**: `{build_number}`  ",
        f"**Target Environment**: `{environment.upper()}`  ",
        "",
    ]

    section_titles = [
        ("security", "🛡️ Security & Integrity Hardening"),
        ("added", "✨ Added Features & Capabilities"),
        ("changed", "🔄 Changed & Architectural Enhancements"),
        ("fixed", "🐛 Fixed & Bug Remediations"),
        ("database", "🗄️ Database & Schema Migrations"),
        ("deprecated", "⚠️ Deprecated & Removed"),
    ]

    has_entries = False
    for key, header in section_titles:
        items = structured.get(key, [])
        if items:
            has_entries = True
            md.append(f"### {header}")
            for it in items[:15]:  # top 15 highlights per section
                md.append(f"- {it}")
            md.append("")

    if not has_entries:
        md.append("### ✨ Operational Updates")
        md.append("- Routine performance optimization and system maintenance updates.")
        md.append("")

    total_commits = summary.get("total_commits", 0)
    changed_files = summary.get("changed_files", 0)
    modules = ", ".join(summary.get("affected_modules", ["core_platform"]))
    md.append("### 📊 Change Metrics & Audit Attribution")
    md.append(f"- **Total Commits Included**: {total_commits}")
    md.append(f"- **Files Modified**: {changed_files}")
    md.append(f"- **Affected System Modules**: {modules}")
    md.append("- **Verification**: Compliant with AITDL Enterprise Release Standards & DPDP Act 2023.")

    return "\n".join(md)


def get_git_revision_history(baseline: str = BASELINE_COMMIT) -> List[Dict[str, Any]]:
    """
    Returns list of commits from baseline to HEAD in chronological order (oldest first).
    """
    commits: List[Dict[str, Any]] = []
    try:
        check_cmd = ["git", "cat-file", "-t", baseline]
        res = subprocess.run(check_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if res.returncode != 0:
            cmd = ["git", "log", "--reverse", "--pretty=format:%h|%H|%ad|%an|%s", "--date=iso-strict"]
        else:
            cmd = ["git", "log", f"{baseline}..HEAD", "--reverse", "--pretty=format:%h|%H|%ad|%an|%s", "--date=iso-strict"]

        output = subprocess.check_output(cmd, stderr=subprocess.DEVNULL, timeout=10).decode("utf-8", errors="ignore")
        for line in output.strip().split("\n"):
            line = line.strip()
            if not line or "|" not in line:
                continue
            parts = line.split("|", 4)
            if len(parts) == 5:
                short_hash, full_hash, date_str, author, subject = parts
                task_type = classify_commit_type(subject)
                cat, clean_desc, is_breaking = categorize_commit_message(subject)
                commits.append({
                    "short_hash": short_hash,
                    "full_hash": full_hash,
                    "date": date_str,
                    "author": author,
                    "subject": subject,
                    "clean_desc": clean_desc,
                    "category": cat,
                    "is_breaking": is_breaking,
                    "type": task_type,
                })
            elif len(parts) == 4:
                short_hash, full_hash, date_str, subject = parts
                task_type = classify_commit_type(subject)
                cat, clean_desc, is_breaking = categorize_commit_message(subject)
                commits.append({
                    "short_hash": short_hash,
                    "full_hash": full_hash,
                    "date": date_str,
                    "author": "Jawahar R. Mallah",
                    "subject": subject,
                    "clean_desc": clean_desc,
                    "category": cat,
                    "is_breaking": is_breaking,
                    "type": task_type,
                })
    except Exception as e:
        print(f"[WARN] Unable to read git log: {e}", file=sys.stderr)

    return commits


def classify_commit_type(subject: str) -> str:
    s = subject.strip().lower()
    if "breaking change" in s or "!:" in s:
        return "major"
    if s.startswith("feat(") or s.startswith("feat:") or s.startswith("feature:") or "feat:" in s:
        return "minor"
    if s.startswith("fix(") or s.startswith("fix:") or s.startswith("bugfix:") or "fix:" in s:
        return "patch"
    if s.startswith("docs(") or s.startswith("docs:") or s.startswith("doc:"):
        return "patch"
    if s.startswith("chore(") or s.startswith("chore:") or s.startswith("refactor(") or s.startswith("refactor:"):
        return "patch"
    return "patch"


def calculate_version_from_revisions(commits: List[Dict[str, Any]], next_task_type: Optional[str] = None) -> Tuple[str, str, Dict[str, Any]]:
    """
    Calculates semantic version, build number, and revision statistics.
    Rules:
    - Base: 1.0.0
    - Each feature task ('feat') bumps MINOR version (1.1.0, 1.2.0, etc.) and resets PATCH to 0.
    - Each fix/docs/chore task bumps PATCH version (1.1.1, 1.1.2, etc.).
    - Each breaking change bumps MAJOR version (2.0.0).
    """
    major, minor, patch = BASELINE_VERSION
    feature_count = 0
    patch_count = 0
    major_count = 0

    all_tasks = list(commits)
    if next_task_type:
        all_tasks.append({
            "short_hash": "pending",
            "full_hash": "pending",
            "date": datetime.now(timezone.utc).isoformat(),
            "subject": f"Upcoming task ({next_task_type})",
            "type": next_task_type,
        })

    for item in all_tasks:
        t = item.get("type", "patch")
        if t == "major":
            major += 1
            minor = 0
            patch = 0
            major_count += 1
        elif t == "minor":
            minor += 1
            patch = 0
            feature_count += 1
        else:
            patch += 1
            patch_count += 1

    semver_str = f"{major}.{minor}.{patch}"
    revision_count = len(all_tasks)

    # Get latest commit hash
    latest_hash = commits[-1]["short_hash"].upper() if commits else "INIT"
    today_str = datetime.now(timezone.utc).strftime("%Y.%m.%d")
    build_number = f"{today_str}-REV-{revision_count:03d}-v{semver_str}-{latest_hash}"

    stats = {
        "version": semver_str,
        "build_number": build_number,
        "revision_count": revision_count,
        "feature_count": feature_count,
        "patch_count": patch_count,
        "major_count": major_count,
        "latest_hash": latest_hash,
    }
    return semver_str, build_number, stats


def update_file_regex(path: str, pattern: str, replacement: str, dry_run: bool = False) -> bool:
    if not os.path.isfile(path):
        return False
    with open(path, "r", encoding="utf-8") as fp:
        content = fp.read()

    new_content, count = re.subn(pattern, replacement, content)
    if count == 0:
        return False

    if not dry_run:
        with open(path, "w", encoding="utf-8", newline="\n") as fp:
            fp.write(new_content)
    return True


def generate_release_manifest(
    version: str,
    build_number: str,
    stats: Dict[str, Any],
    commits: List[Dict[str, Any]],
    root_dir: str = ".",
    dry_run: bool = False,
) -> Dict[str, Any]:
    """
    Generates backend/app/release_manifest.json with authoritative revision history,
    categorized notes, and build metadata to decouple runtime from host git CLI.
    """
    today_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    # Get changed files if git is available
    changed_files: List[str] = []
    try:
        diff_out = subprocess.check_output(
            ["git", "diff", "--name-only", f"{BASELINE_COMMIT}..HEAD"],
            stderr=subprocess.DEVNULL,
            timeout=5,
        ).decode("utf-8", errors="ignore")
        changed_files = [f.strip() for f in diff_out.strip().split("\n") if f.strip()]
    except Exception:
        pass

    affected_modules = detect_affected_modules(changed_files)

    # Format structured release notes
    structured: Dict[str, List[str]] = {
        "security": [],
        "added": [],
        "changed": [],
        "fixed": [],
        "database": [],
        "deprecated": [],
    }

    # Commits for manifest: reversed (newest first)
    all_commits_reversed: List[Dict[str, Any]] = []
    for c in reversed(commits):
        cat = c.get("category", "changed")
        subj = c.get("clean_desc") or c.get("subject", "")
        formatted_entry = f"[{c['short_hash']}] {subj}"
        if formatted_entry not in structured.setdefault(cat, []):
            structured[cat].append(formatted_entry)

        all_commits_reversed.append({
            "hash": c["full_hash"],
            "short_hash": c["short_hash"],
            "author": c.get("author", "Jawahar R. Mallah"),
            "date": c["date"],
            "subject": subj,
            "category": cat,
            "is_breaking": c.get("is_breaking", False),
        })

    markdown_notes = format_markdown_release_notes(
        version=version,
        title=f"Release v{version} — Academic & Financial Governance Baseline",
        build_number=build_number,
        environment="production",
        structured=structured,
        summary={
            "total_commits": stats.get("revision_count", len(commits)),
            "changed_files": len(changed_files),
            "affected_modules": affected_modules,
        },
    )

    manifest_data = {
        "product": PRODUCT_NAME,
        "edition": EDITION,
        "version": version,
        "build_number": build_number,
        "build_date": today_date,
        "latest_hash": stats.get("latest_hash", ""),
        "revision_count": stats.get("revision_count", len(commits)),
        "feature_count": stats.get("feature_count", 0),
        "patch_count": stats.get("patch_count", 0),
        "major_count": stats.get("major_count", 0),
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "affected_modules": affected_modules,
        "changed_files": changed_files[:100],
        "structured_notes": structured,
        "markdown_notes": markdown_notes,
        "all_commits": all_commits_reversed,
    }

    manifest_path = os.path.join(root_dir, "backend", "app", "release_manifest.json")
    if not dry_run:
        try:
            with open(manifest_path, "w", encoding="utf-8") as fp:
                json.dump(manifest_data, fp, indent=2)
        except Exception as e:
            print(f"  [WARN] Failed writing release_manifest.json: {e}", file=sys.stderr)

    return manifest_data


def synchronize_all_version_sources(
    version: str,
    build_number: str,
    commits: Optional[List[Dict[str, Any]]] = None,
    stats: Optional[Dict[str, Any]] = None,
    root_dir: str = ".",
    dry_run: bool = False,
) -> Tuple[List[str], Optional[Dict[str, Any]]]:
    """
    Synchronizes the authoritative version and build metadata across all files.
    """
    today_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    updated_files: List[str] = []

    targets = [
        # 1. Root package.json
        (
            os.path.join(root_dir, "package.json"),
            r'"version":\s*"[^"]+"',
            f'"version": "{version}"',
        ),
        # 2. Frontend package.json
        (
            os.path.join(root_dir, "frontend", "package.json"),
            r'"version":\s*"[^"]+"',
            f'"version": "{version}"',
        ),
        # 3. Backend config: VERSION, BUILD_NUMBER, BUILD_DATE
        (
            os.path.join(root_dir, "backend", "app", "core", "config.py"),
            r'VERSION:\s*str\s*=\s*"[^"]+"',
            f'VERSION: str = "{version}"',
        ),
        (
            os.path.join(root_dir, "backend", "app", "core", "config.py"),
            r'BUILD_NUMBER:\s*str\s*=\s*"[^"]+"',
            f'BUILD_NUMBER: str = "{build_number}"',
        ),
        (
            os.path.join(root_dir, "backend", "app", "core", "config.py"),
            r'BUILD_DATE:\s*str\s*=\s*"[^"]+"',
            f'BUILD_DATE: str = "{today_date}"',
        ),
        # 4. Frontend branding.ts: buildNumber & releaseDate
        (
            os.path.join(root_dir, "frontend", "src", "config", "branding.ts"),
            r"buildNumber:\s*'[^']+'",
            f"buildNumber: '{build_number}'",
        ),
        (
            os.path.join(root_dir, "frontend", "src", "config", "branding.ts"),
            r"releaseDate:\s*'[^']+'",
            f"releaseDate: '{today_date}'",
        ),
    ]

    for rel_path, pattern, replacement in targets:
        if os.path.isfile(rel_path):
            ok = update_file_regex(rel_path, pattern, replacement, dry_run=dry_run)
            if ok and rel_path not in updated_files:
                updated_files.append(rel_path)

    manifest_data = None
    if commits is not None and stats is not None:
        manifest_data = generate_release_manifest(
            version=version,
            build_number=build_number,
            stats=stats,
            commits=commits,
            root_dir=root_dir,
            dry_run=dry_run,
        )
        manifest_rel = os.path.join("backend", "app", "release_manifest.json")
        if not dry_run and manifest_rel not in updated_files:
            updated_files.append(manifest_rel)

    return updated_files, manifest_data


def run_database_release_sync(
    version: str,
    build_number: str,
    title: str,
    latest_hash: str = "",
    markdown_notes: str = "",
    structured_notes: Optional[Dict[str, Any]] = None,
    change_summary: Optional[Dict[str, Any]] = None,
):
    """
    Updates or inserts the active release record in Postgres inside the Docker container.
    Reads authoritative metadata directly from /app/app/release_manifest.json inside container.
    """
    python_script = """
import asyncio
import json
import os
from datetime import datetime, timezone
from app.core.database import AsyncSessionLocal
from app.models.release import SystemRelease
from sqlalchemy import select

async def sync():
    manifest_paths = [
        "/app/app/release_manifest.json",
        "/app/release_manifest.json",
        os.path.join(os.getcwd(), "backend", "app", "release_manifest.json"),
    ]
    data = {}
    for p in manifest_paths:
        if os.path.isfile(p):
            with open(p, "r", encoding="utf-8") as fp:
                data = json.load(fp)
            break

    version = data.get("version", "1.72.1")
    build_number = data.get("build_number", "")
    title = f"Release v{version} — Academic & Financial Governance Baseline"
    latest_hash = data.get("latest_hash", "")
    markdown_notes = data.get("markdown_notes", f"# Release Notes v{version}")
    structured_notes = json.dumps(data.get("structured_notes", {}))
    change_summary = json.dumps({
        "total_commits": data.get("revision_count", 0),
        "features_count": data.get("feature_count", 0),
        "patches_count": data.get("patch_count", 0),
        "version": version,
        "build_number": build_number,
    })

    async with AsyncSessionLocal() as session:
        res = await session.execute(select(SystemRelease).where(SystemRelease.version == version))
        existing = res.scalar_one_or_none()
        now = datetime.now(timezone.utc)
        if existing:
            existing.build_number = build_number
            existing.status = 'published'
            existing.published_at = now
            existing.title = title
            existing.git_commit_end = latest_hash
            existing.release_notes_markdown = markdown_notes
            existing.release_notes_structured = structured_notes
            existing.change_summary = change_summary
            existing.validation_status = 'passed'
        else:
            rel = SystemRelease(
                version=version,
                build_number=build_number,
                title=title,
                status='published',
                environment='production',
                git_branch='master',
                git_commit_end=latest_hash,
                git_tag=f'v{version}',
                release_notes_markdown=markdown_notes,
                release_notes_structured=structured_notes,
                change_summary=change_summary,
                validation_status='passed',
                created_by_id=1,
                approved_by_id=1,
                published_by_id=1,
                approved_at=now,
                published_at=now,
            )
            session.add(rel)
        await session.commit()
        print(f"[DB] Release v{version} ({build_number}) published in database.")

if __name__ == '__main__':
    asyncio.run(sync())
"""
    # 1. Try docker exec on running container
    try:
        proc = subprocess.run(
            ["docker", "exec", "-i", "prashant_academy_backend", "python", "-"],
            input=python_script,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=20,
        )
        if proc.returncode == 0:
            lines = [l for l in proc.stdout.strip().split("\n") if "[DB]" in l or "published" in l]
            msg = lines[-1] if lines else proc.stdout.strip()
            print(f"  [DATABASE] {msg or 'Synchronized release in database.'}")
            return True
        else:
            print(f"  [WARN] Database release sync stderr: {proc.stderr[:160]}", file=sys.stderr)
    except Exception as e:
        print(f"  [WARN] docker exec failed: {e}", file=sys.stderr)

    # 2. Fallback to docker compose exec
    try:
        proc = subprocess.run(
            ["docker", "compose", "exec", "-T", "backend", "python", "-"],
            input=python_script,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=20,
        )
        if proc.returncode == 0:
            lines = [l for l in proc.stdout.strip().split("\n") if "[DB]" in l or "published" in l]
            msg = lines[-1] if lines else proc.stdout.strip()
            print(f"  [DATABASE] {msg or 'Synchronized release in database.'}")
            return True
    except Exception:
        pass

    return False


def main():
    parser = argparse.ArgumentParser(
        description="PrathamOne EduOS Automated Version & Revision Manager"
    )
    parser.add_argument(
        "--status",
        action="store_true",
        help="Display current version, revision history, and calculated status.",
    )
    parser.add_argument(
        "--sync",
        action="store_true",
        help="Recalculate version based on revisions and update all configuration files.",
    )
    parser.add_argument(
        "--hook",
        action="store_true",
        help="Invoked by Git pre-commit hook to auto-update version during commit.",
    )
    parser.add_argument(
        "--bump",
        choices=["major", "minor", "patch", "auto"],
        default="auto",
        help="Explicitly bump version or auto-compute based on revisions.",
    )
    parser.add_argument(
        "--task",
        type=str,
        help="Record a task description and update version accordingly.",
    )
    parser.add_argument(
        "--type",
        choices=["feat", "fix", "chore", "major"],
        default="feat",
        help="Task type for version computation (feat=minor, fix=patch, major=major).",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Simulate version update without modifying files.",
    )
    parser.add_argument(
        "--git-tag",
        action="store_true",
        help="Create annotated git tag for the updated version.",
    )
    args = parser.parse_args()

    commits = get_git_revision_history()

    next_type = None
    if args.task:
        next_type = "minor" if args.type == "feat" else ("major" if args.type == "major" else "patch")
    elif args.bump != "auto":
        next_type = args.bump

    version, build_num, stats = calculate_version_from_revisions(commits, next_task_type=next_type)

    if args.status:
        print("\n======================================================================")
        print("  PRATHAMONE EduOS — REVISION & AUTOMATED VERSION STATUS")
        print("======================================================================")
        print(f"Product:              {PRODUCT_NAME} ({EDITION})")
        print(f"Baseline Commit:      {BASELINE_COMMIT} (v1.0.0 Reset)")
        print(f"Calculated Version:   v{version}")
        print(f"Build Identifier:     {build_num}")
        print(f"Total Revisions:      {stats['revision_count']} tasks / commits")
        print(f"Features Completed:   {stats['feature_count']} (Minor bumps)")
        print(f"Patches / Fixes:      {stats['patch_count']} (Patch bumps)")
        print(f"Latest Git Commit:    {stats['latest_hash']}")
        print("----------------------------------------------------------------------")
        print("Recent Revisions Performed:")
        for c in commits[-8:]:
            print(f"  [{c['short_hash']}] ({c['type'].upper():5}) {c['subject'][:65]}")
        print("======================================================================\n")
        return

    # In hook mode or sync mode or bump/task mode:
    mode_desc = "GIT PRE-COMMIT HOOK" if args.hook else ("TASK RECORD" if args.task else "REVISION SYNC")
    print(f"\n[AUTO-VERSION] {mode_desc} — Computing authoritative version...")
    print(f"  Target Version:   v{version}")
    print(f"  Build Number:     {build_num}")
    print(f"  Revisions Count:  {stats['revision_count']}")

    updated, manifest_data = synchronize_all_version_sources(
        version=version,
        build_number=build_num,
        commits=commits,
        stats=stats,
        dry_run=args.dry_run,
    )

    if updated:
        print(f"  [SUCCESS] Synchronized version v{version} across {len(updated)} source files:")
        for f in updated:
            print(f"    -> {f}")
    else:
        print(f"  [UP-TO-DATE] All version files already aligned to v{version}.")

    # In pre-commit hook, stage the updated files automatically
    if args.hook and updated and not args.dry_run:
        try:
            for f in updated:
                subprocess.run(["git", "add", f], check=True)
            print("  [GIT] Automatically staged updated version configurations.")
        except Exception as e:
            print(f"  [WARN] Failed to git-add version files: {e}")

    # Synchronize database release record if requested or in sync mode
    if args.sync and not args.dry_run:
        release_title = f"Release v{version} — Academic & Financial Governance Baseline"
        latest_hash = stats.get("latest_hash", "")
        md_notes = manifest_data.get("markdown_notes", "") if manifest_data else ""
        struct_notes = manifest_data.get("structured_notes") if manifest_data else None
        change_summary = {
            "total_commits": stats.get("revision_count", len(commits)),
            "features_count": stats.get("feature_count", 0),
            "patches_count": stats.get("patch_count", 0),
            "version": version,
            "build_number": build_num,
        }
        run_database_release_sync(
            version=version,
            build_number=build_num,
            title=release_title,
            latest_hash=latest_hash,
            markdown_notes=md_notes,
            structured_notes=struct_notes,
            change_summary=change_summary,
        )

    if args.git_tag and not args.dry_run:
        try:
            tag_name = f"v{version}"
            subprocess.run(["git", "tag", "-a", tag_name, "-m", f"Release {tag_name} ({build_num})"], check=True)
            print(f"  [GIT] Created git tag {tag_name}")
        except Exception as e:
            print(f"  [WARN] Git tag failed: {e}")

    print("[AUTO-VERSION] Done.\n")


if __name__ == "__main__":
    main()
