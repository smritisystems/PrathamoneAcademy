# /**
#  * @file        migrate_theme_tokens.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      tools
#  *
#  * @author      Jawahar R. Mallah
#  * @organization AITDL (AI Technology & Development Lab)
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 AITDL
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-08
#  * @updated     2026-11-08
#  *
#  * @description Source component for Migrate Theme Tokens in the tools module.
#  */

"""
tools/migrate_theme_tokens.py

Automated theme token normalizer and auditing utility for PrathamOne EduOS.
Scans the frontend codebase to detect hardcoded legacy blue/indigo utility classes
and provides automated migration to canonical semantic primary/brand tokens.

Author: Jawahar R. Mallah
Organization: AITDL (AI Technology & Development Lab)
Project: PrathamOne EduOS
"""

import os
import re
import sys
import argparse

REPLACEMENTS = [
    # Backgrounds
    (r'\bbg-blue-600\b', 'bg-primary-600'),
    (r'\bbg-indigo-600\b', 'bg-primary-600'),
    (r'\bbg-blue-700\b', 'bg-primary-700'),
    (r'\bbg-indigo-700\b', 'bg-primary-700'),
    (r'\bbg-blue-50\b', 'bg-primary-50'),
    (r'\bbg-indigo-50\b', 'bg-primary-50'),
    (r'\bbg-blue-100\b', 'bg-primary-100'),
    (r'\bbg-indigo-100\b', 'bg-primary-100'),
    (r'\bbg-blue-500\b', 'bg-primary-500'),
    (r'\bbg-indigo-500\b', 'bg-primary-500'),

    # Hover Backgrounds
    (r'\bhover:bg-blue-700\b', 'hover:bg-primary-700'),
    (r'\bhover:bg-indigo-700\b', 'hover:bg-primary-700'),
    (r'\bhover:bg-blue-800\b', 'hover:bg-primary-800'),
    (r'\bhover:bg-indigo-800\b', 'hover:bg-primary-800'),
    (r'\bhover:bg-blue-50\b', 'hover:bg-primary-50'),
    (r'\bhover:bg-indigo-50\b', 'hover:bg-primary-50'),

    # Text Colors
    (r'\btext-blue-600\b', 'text-primary-600'),
    (r'\btext-indigo-600\b', 'text-primary-600'),
    (r'\btext-blue-700\b', 'text-primary-700'),
    (r'\btext-indigo-700\b', 'text-primary-700'),
    (r'\btext-blue-800\b', 'text-primary-800'),
    (r'\btext-indigo-800\b', 'text-primary-800'),
    (r'\btext-blue-900\b', 'text-primary-900'),
    (r'\btext-indigo-900\b', 'text-primary-900'),
    (r'\btext-blue-500\b', 'text-primary-500'),
    (r'\btext-indigo-500\b', 'text-primary-500'),

    # Borders & Rings
    (r'\bborder-blue-500\b', 'border-primary-500'),
    (r'\bborder-indigo-500\b', 'border-primary-500'),
    (r'\bborder-blue-600\b', 'border-primary-600'),
    (r'\bborder-indigo-600\b', 'border-primary-600'),
    (r'\bfocus:ring-blue-500\b', 'focus:ring-primary-500'),
    (r'\bfocus:ring-indigo-500\b', 'focus:ring-primary-500'),
    (r'\bfocus:border-blue-500\b', 'focus:border-primary-500'),
    (r'\bfocus:border-indigo-500\b', 'focus:border-primary-500'),
]

def audit_or_migrate(dry_run=True, target_dir="frontend/src"):
    print(f"\n=======================================================")
    print(f"  PRATHAMONE EduOS — THEME TOKEN AUDIT & MIGRATION")
    print(f"  Target: {target_dir} | Mode: {'AUDIT (Dry Run)' if dry_run else 'MIGRATE (Write)'}")
    print(f"=======================================================\n")

    total_files = 0
    matched_files = 0
    total_replacements = 0

    for root, _, files in os.walk(target_dir):
        for file in files:
            if not file.endswith(('.tsx', '.ts')):
                continue
            filepath = os.path.join(root, file)
            total_files += 1

            with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()

            new_content = content
            file_replacements = 0

            for pattern, repl in REPLACEMENTS:
                matches = re.findall(pattern, new_content)
                if matches:
                    file_replacements += len(matches)
                    if not dry_run:
                        new_content = re.sub(pattern, repl, new_content)

            if file_replacements > 0:
                matched_files += 1
                total_replacements += file_replacements
                print(f"  [{'FOUND' if dry_run else 'MIGRATED'}] {os.path.relpath(filepath, target_dir)}: {file_replacements} occurrences")

                if not dry_run:
                    with open(filepath, 'w', encoding='utf-8') as f:
                        f.write(new_content)

    print(f"\n-------------------------------------------------------")
    print(f"Summary: {total_replacements} legacy tokens across {matched_files} of {total_files} files.")
    if dry_run:
        print("Run with '--write' to execute permanent codebase refactoring.")
    else:
        print("Migration complete. All tokens normalized to 'primary-*'.")
    print(f"-------------------------------------------------------\n")
    return total_replacements

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Theme Token Normalizer")
    parser.add_argument('--write', action='store_true', help="Perform actual replacements in files")
    parser.add_argument('--dir', default="frontend/src", help="Target source directory")
    args = parser.parse_args()

    audit_or_migrate(dry_run=not args.write, target_dir=args.dir)
