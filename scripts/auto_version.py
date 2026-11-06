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
#  * @updated     2026-11-06
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


def parse_semver(version_str: str) -> Tuple[int, int, int, Optional[str]]:
    clean = version_str.lstrip("v").strip()
    m = SEMVER_REGEX.match(clean)
    if not m:
        raise ValueError(f"Invalid semantic version: '{version_str}'")
    return int(m.group(1)), int(m.group(2)), int(m.group(3)), m.group(4)


def get_git_revision_history(baseline: str = BASELINE_COMMIT) -> List[Dict[str, Any]]:
    """
    Returns list of commits from baseline to HEAD in chronological order (oldest first).
    """
    commits: List[Dict[str, Any]] = []
    try:
        # Check if baseline commit exists in repo
        check_cmd = ["git", "cat-file", "-t", baseline]
        res = subprocess.run(check_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if res.returncode != 0:
            # Fallback to entire log if baseline commit hash not present
            cmd = ["git", "log", "--reverse", "--pretty=format:%h|%H|%ad|%s", "--date=iso-strict"]
        else:
            cmd = ["git", "log", f"{baseline}..HEAD", "--reverse", "--pretty=format:%h|%H|%ad|%s", "--date=iso-strict"]

        output = subprocess.check_output(cmd, stderr=subprocess.DEVNULL, timeout=10).decode("utf-8", errors="ignore")
        for line in output.strip().split("\n"):
            line = line.strip()
            if not line or "|" not in line:
                continue
            parts = line.split("|", 3)
            if len(parts) == 4:
                short_hash, full_hash, date_str, subject = parts
                task_type = classify_commit_type(subject)
                commits.append({
                    "short_hash": short_hash,
                    "full_hash": full_hash,
                    "date": date_str,
                    "subject": subject,
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


def synchronize_all_version_sources(
    version: str,
    build_number: str,
    root_dir: str = ".",
    dry_run: bool = False,
) -> List[str]:
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

    return updated_files


def run_database_release_sync(version: str, build_number: str, title: str):
    """
    Updates or inserts the active release record in Postgres if container is available.
    """
    python_script = f"""
import asyncio
from app.core.database import AsyncSessionLocal
from app.models.release import SystemRelease
from sqlalchemy import select, desc
from datetime import datetime, timezone

async def sync():
    async with AsyncSessionLocal() as session:
        # Check if release row for this version exists
        res = await session.execute(select(SystemRelease).where(SystemRelease.version == '{version}'))
        existing = res.scalar_one_or_none()
        now = datetime.now(timezone.utc)
        if existing:
            existing.build_number = '{build_number}'
            existing.status = 'published'
            existing.published_at = now
            existing.title = '{title}'
        else:
            rel = SystemRelease(
                version='{version}',
                build_number='{build_number}',
                title='{title}',
                status='published',
                environment='production',
                git_branch='master',
                release_notes_markdown='# Release Notes v{version}\\n\\nAutomated release update generated from revision history.',
                release_notes_structured='{{"added": ["Automated feature release v{version}"]}}',
                change_summary='{{"version": "{version}"}}',
                validation_status='passed',
                created_by_id=1,
                approved_by_id=1,
                published_by_id=1,
                approved_at=now,
                published_at=now,
            )
            session.add(rel)
        await session.commit()
        print("[DB] Release v{version} published in database.")

if __name__ == '__main__':
    asyncio.run(sync())
"""
    try:
        cmd = [
            "docker-compose",
            "exec",
            "-T",
            "backend",
            "python",
            "-c",
            python_script,
        ]
        subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=10)
    except Exception:
        pass


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

    updated = synchronize_all_version_sources(
        version=version,
        build_number=build_num,
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
        release_title = f"Release v{version} — PrathamOne EduOS Platform Updates"
        run_database_release_sync(version, build_num, release_title)

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
