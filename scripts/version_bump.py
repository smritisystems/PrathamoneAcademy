#!/usr/bin/env python3
# /**
#  * @file        version_bump.py
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
#  * @created     2026-11-04
#  * @updated     2026-11-04
#  *
#  * @description Semantic versioning manager updating version numbers across packages and configurations.
#  */

import os
import sys
import re
import json
import argparse
import subprocess

# Ensure UTF-8 output encoding on Windows consoles
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

SEMVER_REGEX = r'^(\d+)\.(\d+)\.(\d+)(?:-([a-zA-Z0-9.]+))?$'

def parse_semver(version_str: str):
    m = re.match(SEMVER_REGEX, version_str.strip())
    if not m:
        raise ValueError(f"Invalid semver version: '{version_str}'")
    major = int(m.group(1))
    minor = int(m.group(2))
    patch = int(m.group(3))
    prerelease = m.group(4)
    return major, minor, patch, prerelease

def compute_next_version(current: str, bump_type: str) -> str:
    major, minor, patch, prerelease = parse_semver(current)
    if bump_type == 'major':
        return f"{major + 1}.0.0"
    elif bump_type == 'minor':
        return f"{major}.{minor + 1}.0"
    elif bump_type == 'patch':
        return f"{major}.{minor}.{patch + 1}"
    else:
        # Explicit target version
        parse_semver(bump_type)
        return bump_type

def get_current_version(root_dir: str = ".") -> str:
    # Try reading from frontend/package.json
    frontend_pkg = os.path.join(root_dir, "frontend", "package.json")
    if os.path.isfile(frontend_pkg):
        with open(frontend_pkg, "r", encoding="utf-8") as fp:
            data = json.load(fp)
            if "version" in data:
                return data["version"]

    # Try reading from root package.json
    root_pkg = os.path.join(root_dir, "package.json")
    if os.path.isfile(root_pkg):
        with open(root_pkg, "r", encoding="utf-8") as fp:
            data = json.load(fp)
            if "version" in data:
                return data["version"]

    return "1.0.0"

def update_file(path: str, pattern: str, replacement: str, dry_run: bool = False) -> bool:
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

def main():
    parser = argparse.ArgumentParser(description="Prashant Academy Semantic Version Manager")
    parser.add_argument("bump", choices=["major", "minor", "patch"], nargs="?", default="patch",
                        help="Type of bump: major (breaking), minor (features), patch (fixes).")
    parser.add_argument("--set", dest="explicit_version", help="Set explicit semver version (e.g. 1.2.0).")
    parser.add_argument("--dry-run", action="store_true", help="Preview version changes without writing files.")
    parser.add_argument("--git-tag", action="store_true", help="Create an annotated Git tag for the new version.")
    args = parser.parse_args()

    curr_version = get_current_version()
    if args.explicit_version:
        next_version = compute_next_version(curr_version, args.explicit_version)
    else:
        next_version = compute_next_version(curr_version, args.bump)

    print("\n=================== Semantic Version Bump ===================")
    print(f"Current Version: v{curr_version}")
    print(f"Next Version:    v{next_version}")
    print(f"Mode:            {'DRY RUN (no changes written)' if args.dry_run else 'APPLY CHANGES'}")
    print("=============================================================")

    targets = [
        ("frontend/package.json", r'"version":\s*"[^"]+"', f'"version": "{next_version}"'),
        ("package.json", r'"version":\s*"[^"]+"', f'"version": "{next_version}"'),
        ("backend/app/core/config.py", r'VERSION:\s*str\s*=\s*"[^"]+"', f'VERSION: str = "{next_version}"'),
    ]

    modified_targets = []
    for rel_path, pat, repl in targets:
        if os.path.isfile(rel_path):
            updated = update_file(rel_path, pat, repl, dry_run=args.dry_run)
            if updated:
                print(f"  [OK] Updated {rel_path} -> {next_version}")
                modified_targets.append(rel_path)
            else:
                print(f"  [--] Pattern match not found in {rel_path}")

    if args.git_tag and not args.dry_run:
        try:
            tag_name = f"v{next_version}"
            subprocess.run(["git", "tag", "-a", tag_name, "-m", f"Release {tag_name}"], check=True)
            print(f"  [OK] Created Git tag: {tag_name}")
        except Exception as e:
            print(f"  [WARN] Failed to create git tag: {e}")

    print("\n[SUCCESS] Version management task complete.\n")

if __name__ == "__main__":
    main()
