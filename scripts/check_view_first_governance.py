# /**
#  * @file        check_view_first_governance.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      12_RBAC_SECURITY
#  *
#  * @author      Jawahar R. Mallah
#  * @organization AITDL (AI Technology & Development Lab)
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 AITDL
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-07
#  * @updated     2026-11-07
#  *
#  * @description Automated verification and audit engine for Rule 010 View-First
#  */

import os
import re
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

REPO_ROOT = Path(__file__).resolve().parent.parent
PAGES_DIR = REPO_ROOT / "frontend" / "src" / "pages"
LAYOUT_FILE = REPO_ROOT / "frontend" / "src" / "components" / "Layout.tsx"
STORE_FILE = REPO_ROOT / "frontend" / "src" / "store" / "editModeStore.ts"

READ_ONLY_PAGES = {
    "Dashboard.tsx": "Executive reporting and analytics dashboard (Read-Only)",
    "StudentDashboard.tsx": "Student/Parent academic and attendance portal view (Read-Only)",
    "Reports.tsx": "Reporting & Analytics Centre with export engines (Read-Only)",
    "Receipt.tsx": "Printable transaction receipt visualizer (Read-Only)",
    "Login.tsx": "Authentication gateway (Non-workspace)",
    "NotFound.tsx": "404 Not Found error view (System)",
    "InstallApp.tsx": "PWA installation guidance view (Utility)",
}

EDIT_SCOPE_REGEX = re.compile(r'const\s+editScope\s*=\s*[\'"`]([^\'"`]+)[\'"`]')
DIRECT_SCOPE_REGEX = re.compile(r'<EditModeBar[^>]*\bscope=[\'"]([^\'"]+)[\'"]')


def check_store():
    print("\n[STEP 1] Auditing Global Edit Mode Store (editModeStore.ts)...")
    if not STORE_FILE.exists():
        print(f"  [FAIL] Store file not found at {STORE_FILE}")
        return False

    content = STORE_FILE.read_text(encoding="utf-8")
    if "scopes: {}" not in content:
        print("  [FAIL] scopes initial state missing or non-empty.")
        return False

    if "resetAll:" not in content and "resetAll: () =>" not in content and "resetAll" not in content:
        print("  [FAIL] resetAll method missing in store.")
        return False

    if "isEditMode:" not in content and "isEditMode" not in content:
        print("  [FAIL] isEditMode selector missing in store.")
        return False

    print("  [PASS] Store defaults to View Mode (scopes: {}) with resetAll capability.")
    return True


def check_layout():
    print("\n[STEP 2] Auditing Navigation Route Reset in Layout.tsx...")
    if not LAYOUT_FILE.exists():
        print(f"  [FAIL] Layout file not found at {LAYOUT_FILE}")
        return False

    content = LAYOUT_FILE.read_text(encoding="utf-8")
    if "useEditModeStore.getState().resetAll()" not in content:
        print("  [FAIL] Layout does not invoke resetAll() on route location change.")
        return False

    print("  [PASS] Layout enforces automatic View Mode reset on every route transition.")
    return True


def check_pages():
    print("\n[STEP 3] Auditing Frontend Workspace Pages...")
    all_pages = sorted(list(PAGES_DIR.glob("*.tsx")))
    if not all_pages:
        print("  [FAIL] No pages found in frontend/src/pages")
        return False

    passed = 0
    failed = 0
    audit_table = []

    for page_path in all_pages:
        page_name = page_path.name
        content = page_path.read_text(encoding="utf-8")

        if page_name in READ_ONLY_PAGES:
            audit_table.append({
                "page": page_name,
                "type": "Read-Only / View-Only",
                "scope": "N/A (Read-Only)",
                "bar": "Exempt",
                "guard": "Exempt",
                "status": "PASS (Exempt)"
            })
            passed += 1
            continue

        # Mutation-capable page checks
        has_bar_import = "EditModeBar" in content
        has_store_import = "useEditModeStore" in content
        has_bar_render = "<EditModeBar" in content
        has_guard = (
            "isEditMode" in content or
            "scopes[editScope]" in content or
            "useEditModeStore.getState().isEditMode" in content
        )

        scope_str = None
        scope_match = EDIT_SCOPE_REGEX.search(content)
        if scope_match:
            scope_str = scope_match.group(1)
        else:
            direct_match = DIRECT_SCOPE_REGEX.search(content)
            if direct_match:
                scope_str = direct_match.group(1)

        errors = []
        if not has_bar_import:
            errors.append("Missing EditModeBar import")
        if not has_store_import:
            errors.append("Missing useEditModeStore import")
        if not has_bar_render:
            errors.append("Missing <EditModeBar render")
        if not has_guard:
            errors.append("Missing isEditMode evaluation/guard")
        if not scope_str:
            errors.append("No valid scope detected")

        if errors:
            status = f"FAIL: {', '.join(errors)}"
            failed += 1
        else:
            status = "PASS"
            passed += 1

        audit_table.append({
            "page": page_name,
            "type": "Mutation-Capable Workspace",
            "scope": scope_str or "None",
            "bar": "Rendered" if has_bar_render else "Missing",
            "guard": "Guarded" if has_guard else "Missing",
            "status": status
        })

    # Print Table
    print(f"\n{'Page':<24} | {'Type':<26} | {'Scope':<32} | {'EditModeBar':<11} | {'Status'}")
    print("-" * 115)
    for row in audit_table:
        print(f"{row['page']:<24} | {row['type']:<26} | {row['scope']:<32} | {row['bar']:<11} | {row['status']}")
    print("-" * 115)
    print(f"Total Pages Checked: {len(all_pages)} | Passed: {passed} | Failed: {failed}")

    return failed == 0


def main():
    print("=" * 70)
    print("PrathamOne EduOS — Rule 010 Global View-First Governance Audit")
    print("=" * 70)

    store_ok = check_store()
    layout_ok = check_layout()
    pages_ok = check_pages()

    if store_ok and layout_ok and pages_ok:
        print("\n[SUCCESS] 100% Rule 010 View-First Governance Compliance Verified!")
        sys.exit(0)
    else:
        print("\n[ERROR] Rule 010 View-First Governance Compliance Violations Detected!")
        sys.exit(1)


if __name__ == "__main__":
    main()
