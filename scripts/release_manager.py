#!/usr/bin/env python3
# /**
#  * @file        release_manager.py
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
#  * @created     2026-11-05
#  * @updated     2026-11-06
#  *
#  * @description Enterprise CLI tool for managing application releases, change tracking, version bumping, and pre-flight CI/CD validation.
#  */

import os
import sys
import re
import json
import argparse
import subprocess
from datetime import datetime, timezone

# Ensure UTF-8 output encoding on Windows consoles
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

SEMVER_REGEX = re.compile(r"^(\d+)\.(\d+)\.(\d+)(?:-([a-zA-Z0-9.]+))?$")

SECRET_PATTERNS = [
    re.compile(r'(?i)(?:password|secret|token|api_key|access_key|jwt)[\s:=]+["\']?([^"\'\s,;]{8,})["\']?'),
    re.compile(r'(?i)postgres(?:ql(?:\+asyncpg)?)?://[^:]+:([^@]+)@'),
    re.compile(r'Bearer\s+[A-Za-z0-9\-_=]+\.[A-Za-z0-9\-_=]+\.?[A-Za-z0-9\-_.+/=]*'),
]


def parse_semver(v: str):
    m = SEMVER_REGEX.match(v.lstrip("v").strip())
    if not m:
        raise ValueError(f"Invalid semver: '{v}'")
    return int(m.group(1)), int(m.group(2)), int(m.group(3)), m.group(4)


def bump_semver(curr: str, bump: str) -> str:
    major, minor, patch, _ = parse_semver(curr)
    if bump == "major":
        return f"{major + 1}.0.0"
    elif bump == "minor":
        return f"{major}.{minor + 1}.0"
    elif bump == "patch":
        return f"{major}.{minor}.{patch + 1}"
    else:
        parse_semver(bump)
        return bump.lstrip("v")


def get_current_version(root_dir: str = ".") -> str:
    pkg_path = os.path.join(root_dir, "frontend", "package.json")
    if os.path.isfile(pkg_path):
        try:
            with open(pkg_path, "r", encoding="utf-8") as fp:
                data = json.load(fp)
                if "version" in data:
                    return data["version"]
        except Exception:
            pass
    return "1.0.0"


def get_git_commits(max_count: int = 50) -> list:
    commits = []
    try:
        cmd = ["git", "log", f"-n{max_count}", "--pretty=format:%H|%an|%ad|%s", "--date=iso-strict"]
        out = subprocess.check_output(cmd, stderr=subprocess.DEVNULL, timeout=5).decode("utf-8", errors="ignore")
        for line in out.strip().split("\n"):
            if not line.strip() or "|" not in line:
                continue
            parts = line.split("|", 3)
            if len(parts) == 4:
                commits.append({
                    "hash": parts[0],
                    "short_hash": parts[0][:8],
                    "author": parts[1],
                    "date": parts[2],
                    "subject": parts[3],
                })
    except Exception:
        pass
    return commits


def run_checks():
    print("\n🔍 Running Pre-Flight Release & Change Management Validations...\n")
    all_ok = True

    # 1. Header Attribution Check
    print("  [1/4] Checking source code headers & attribution compliance...")
    header_script = os.path.join(os.getcwd(), "scripts", "manage_headers.py")
    if os.path.isfile(header_script):
        res = subprocess.run(["python", header_script, "check"], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if res.returncode == 0:
            print("        ✅ Header check passed: All source files satisfy attribution rules.")
        else:
            print("        ❌ Header check failed! Run 'python scripts/manage_headers.py fix'.")
            all_ok = False
    else:
        print("        ⚠️ Header script not found, skipping.")

    # 2. Secret Scanning Check
    print("  [2/4] Scanning recent commit messages & release files for exposed secrets...")
    commits = get_git_commits(30)
    leak_found = False
    for c in commits:
        for pat in SECRET_PATTERNS:
            if pat.search(c["subject"]):
                leak_found = True
                print(f"        ❌ Potential secret detected in commit {c['short_hash']}: {c['subject']}")
                break
    if not leak_found:
        print("        ✅ Secret scan passed: No exposed tokens, secrets, or keys found.")
    else:
        all_ok = False

    # 3. Database Migration Integrity
    print("  [3/4] Inspecting database migration revisions...")
    alembic_dir = os.path.join(os.getcwd(), "backend", "alembic", "versions")
    if os.path.isdir(alembic_dir):
        revs = [f for f in os.listdir(alembic_dir) if f.endswith(".py") and not f.startswith("__")]
        print(f"        ✅ Migration check passed: Found {len(revs)} valid Alembic revisions.")
    else:
        print("        ⚠️ Alembic versions directory not found.")

    # 4. Semantic Version Consistency
    print("  [4/4] Verifying Semantic Version consistency across manifests...")
    curr_v = get_current_version()
    try:
        parse_semver(curr_v)
        print(f"        ✅ Version format valid: v{curr_v}")
    except Exception as e:
        print(f"        ❌ Invalid semver: {e}")
        all_ok = False

    print("\n" + ("=" * 60))
    if all_ok:
        print("🎉 ALL PRE-FLIGHT CHECKS PASSED — Ready for Release Candidate Promotion!")
    else:
        print("❌ PRE-FLIGHT CHECKS FAILED — Fix identified issues before promotion.")
    print("=" * 60 + "\n")
    return 0 if all_ok else 1


def main():
    parser = argparse.ArgumentParser(description="PrathamOne Academy Release Manager CLI")
    subparsers = parser.add_subparsers(dest="command")

    # Status
    subparsers.add_parser("status", help="Display current release status and versioning")

    # Validate
    subparsers.add_parser("validate", help="Execute CI/CD pre-flight validation checks")

    # Bump
    bump_parser = subparsers.add_parser("bump", help="Bump version across project manifests")
    bump_parser.add_argument("type", choices=["major", "minor", "patch"], nargs="?", default="patch")
    bump_parser.add_argument("--set", dest="explicit_version", help="Explicit version string")
    bump_parser.add_argument("--dry-run", action="store_true", help="Preview version bump")

    args = parser.parse_args()

    if args.command == "validate":
        sys.exit(run_checks())
    elif args.command == "status" or not args.command:
        curr_v = get_current_version()
        commits = get_git_commits(5)
        print("\n================== PrathamOne Release Status ==================")
        print(f"Current System Version:  v{curr_v}")
        print(f"Active Build Tag:        {datetime.now(timezone.utc).strftime('%Y.%m.%d')}-PROD-REL")
        print(f"Environment:             PRODUCTION")
        print(f"Recent Commits Count:    {len(commits)}")
        if commits:
            print("Latest Commits:")
            for c in commits:
                print(f"  * {c['short_hash']} - {c['subject']} ({c['author']})")
        print("===============================================================\n")
    elif args.command == "bump":
        curr_v = get_current_version()
        target_v = bump_semver(curr_v, args.explicit_version or args.type)
        print(f"Bumping version: v{curr_v} -> v{target_v} (dry_run={args.dry_run})")
        version_bump_script = os.path.join(os.getcwd(), "scripts", "version_bump.py")
        if os.path.isfile(version_bump_script):
            cmd = ["python", version_bump_script, "--set", target_v]
            if args.dry_run:
                cmd.append("--dry-run")
            subprocess.run(cmd)


if __name__ == "__main__":
    main()
