# /**
#  * @file        check_release_hygiene.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      scripts.check_release_hygiene
#  *
#  * @author      Jawahar R. Mallah
#  * @organization Smritisys & AITDL Networks
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 PrathamOne EduOS
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-20
#  * @updated     2026-11-21
#  *
#  * @description Automated pre-release audit scanner. Inspects build artifacts and distribution
#  */

import argparse
import json
import os
import re
import sys
from pathlib import Path
from typing import List, Dict, Any, Tuple


ROOT_DIR = Path(__file__).resolve().parent.parent
WHITELIST_FILE = ROOT_DIR / "installer" / "release_whitelist.json"


def load_whitelist() -> Dict[str, Any]:
    """Loads authoritative whitelist and forbidden patterns specification."""
    if WHITELIST_FILE.exists():
        try:
            with open(WHITELIST_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as exc:
            print(f"[WARN] Could not parse {WHITELIST_FILE}: {exc}")

    # Fallback built-in rules
    return {
        "forbidden": {
            "extensions": [
                ".log", ".tmp", ".bak", ".pdb", ".map", ".md", ".pyc", ".pyo",
                ".mp4", ".mov", ".avi", ".wmv", ".mkv", ".zip", ".tar.gz", ".rar",
                ".psd", ".ai", ".pptx", ".docx", ".DS_Store", "Thumbs.db", "desktop.ini"
            ],
            "directories": [
                "media/commercial", "media/studio", "media/motion", "Final_Selected",
                "New folder", "tests", ".pytest_cache", "__pycache__", "htmlcov"
            ],
            "file_patterns": [r"^\.env.*$", r"^.*Master Logo.*\.png$"],
            "max_file_size_mb": 15.0
        }
    }


def scan_directory(target_dir: Path, rules: Dict[str, Any]) -> Tuple[List[Dict[str, Any]], int, float]:
    """
    Scans target directory against forbidden extensions, directories, and patterns.
    Returns: (violations, total_file_count, total_size_mb)
    """
    violations = []
    total_files = 0
    total_bytes = 0

    forbidden_exts = set(ext.lower() for ext in rules.get("forbidden", {}).get("extensions", []))
    forbidden_dirs = [d.replace("/", os.sep).lower() for d in rules.get("forbidden", {}).get("directories", [])]
    forbidden_patterns = [re.compile(p, re.IGNORECASE) for p in rules.get("forbidden", {}).get("file_patterns", [])]
    max_size_mb = float(rules.get("forbidden", {}).get("max_file_size_mb", 15.0))

    if not target_dir.exists():
        return violations, 0, 0.0

    for root, dirs, files in os.walk(target_dir):
        rel_root = os.path.relpath(root, target_dir)

        # Check directory-level forbidden patterns
        for fdir in forbidden_dirs:
            if fdir in rel_root.lower().split(os.sep):
                for f in files:
                    file_path = Path(root) / f
                    violations.append({
                        "file": str(file_path.relative_to(ROOT_DIR)),
                        "rule": f"Forbidden Directory: '{fdir}'",
                        "size_kb": file_path.stat().st_size / 1024,
                    })

        for file_name in files:
            file_path = Path(root) / file_name
            total_files += 1
            file_size = file_path.stat().st_size
            total_bytes += file_size
            file_size_mb = file_size / (1024 * 1024)

            # 1. Check forbidden extensions
            ext = file_path.suffix.lower()
            if ext in forbidden_exts or file_name.lower() in ("thumbs.db", ".ds_store", "desktop.ini"):
                violations.append({
                    "file": str(file_path.relative_to(ROOT_DIR)),
                    "rule": f"Forbidden Extension: '{ext or file_name}'",
                    "size_kb": file_size / 1024,
                })
                continue

            # 2. Check regex patterns
            for pat in forbidden_patterns:
                if pat.search(file_name):
                    violations.append({
                        "file": str(file_path.relative_to(ROOT_DIR)),
                        "rule": f"Matched Forbidden Pattern: '{pat.pattern}'",
                        "size_kb": file_size / 1024,
                    })
                    break

            # 3. Check individual file size threshold
            if file_size_mb > max_size_mb:
                violations.append({
                    "file": str(file_path.relative_to(ROOT_DIR)),
                    "rule": f"Exceeds Max Size Limit ({file_size_mb:.2f} MB > {max_size_mb} MB)",
                    "size_kb": file_size / 1024,
                })

    return violations, total_files, total_bytes / (1024 * 1024)


def auto_prune_violations(violations: List[Dict[str, Any]]) -> int:
    """Removes detected forbidden files from disk."""
    pruned_count = 0
    for v in violations:
        file_path = ROOT_DIR / v["file"]
        if file_path.exists() and file_path.is_file():
            try:
                file_path.unlink()
                pruned_count += 1
            except Exception as exc:
                print(f"[ERROR] Failed to prune {file_path}: {exc}")
    return pruned_count


def run_audit(fix: bool = False) -> bool:
    """Executes the pre-release hygiene audit."""
    whitelist_spec = load_whitelist()
    frontend_dist = ROOT_DIR / "frontend" / "dist"

    print("\n" + "=" * 76)
    print("  PRATHAMONE EduOS — PRE-RELEASE HYGIENE & FILE TRACKING AUDITOR")
    print("=" * 76)
    print(f"Authoritative Whitelist: {WHITELIST_FILE.relative_to(ROOT_DIR)}")
    print(f"Scanning Production Target: {frontend_dist.relative_to(ROOT_DIR)}")
    print("-" * 76)

    if not frontend_dist.exists():
        print(f"[NOTICE] Target '{frontend_dist}' does not exist yet. Run 'npm run build' first.")
        print("=" * 76 + "\n")
        return True

    violations, total_files, total_mb = scan_directory(frontend_dist, whitelist_spec)

    print(f"Total Distribution Files Scanned: {total_files}")
    print(f"Total Distribution Payload Size:  {total_mb:.2f} MB")
    print("-" * 76)

    if not violations:
        print("\n✅ [PASS] 100% CLEAN RELEASE PAYLOAD!")
        print("   Zero forbidden extensions, bloat directories, raw recordings, or secrets found.")
        print(f"   Payload size ({total_mb:.2f} MB) satisfies lean enterprise distribution limits.")
        print("=" * 76 + "\n")
        return True

    print(f"\n❌ [FAIL] DETECTED {len(violations)} HYGIENE VIOLATION(S) IN DISTRIBUTION PAYLOAD:\n")
    print(f"{'FILE PATH':<55} | {'VIOLATION RULE':<32} | {'SIZE'}")
    print("-" * 98)
    for v in violations[:25]:
        print(f"{v['file'][:54]:<55} | {v['rule'][:31]:<32} | {v['size_kb']:>7.1f} KB")

    if len(violations) > 25:
        print(f"... and {len(violations) - 25} more violation(s).")

    if fix:
        print("\n[AUTO-PRUNE] Running automatic cleanup on detected violations...")
        pruned = auto_prune_violations(violations)
        print(f"[AUTO-PRUNE SUCCESS] Removed {pruned} non-essential file(s) from distribution.")
        # Re-verify
        remaining_violations, _, new_mb = scan_directory(frontend_dist, whitelist_spec)
        if not remaining_violations:
            print(f"✅ [RESOLVED] All violations resolved. Clean distribution payload: {new_mb:.2f} MB.")
            print("=" * 76 + "\n")
            return True

    print("\n[ACTION REQUIRED] Clean up or prune the non-essential files above before packaging.")
    print("=" * 76 + "\n")
    return False


def main():
    parser = argparse.ArgumentParser(description="PrathamOne EduOS Pre-Release Hygiene Scanner")
    parser.add_argument("--fix", action="store_true", help="Automatically delete forbidden files from distribution directory")
    args = parser.parse_args()

    success = run_audit(fix=args.fix)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
