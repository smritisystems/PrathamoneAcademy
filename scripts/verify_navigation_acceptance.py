# /**
#  * @file        verify_navigation_acceptance.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      scripts
#  *
#  * @author      Jawahar R. Mallah
#  * @organization Smritisys & AITDL Networks
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 PrathamOne EduOS
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-17
#  * @updated     2026-11-17
#  *
#  * @description Comprehensive end-to-end multi-role browser acceptance verification for Navigation & Mobile Experience.
#  */

import os
import sys
import time
from playwright.sync_api import sync_playwright

BASE_URL = "http://localhost:80"
ARTIFACTS_DIR = r"C:\Users\netma\.gemini\antigravity\brain\d80f407d-b71e-4c0b-86a6-a8f64e74ae9e"
PASSWORD = "7)Yaw1dC_uQEfmYqmT"

os.makedirs(ARTIFACTS_DIR, exist_ok=True)


def verify_navigation_suite():
    print("=" * 80)
    print("PRATHAMONE EduOS — NAVIGATION & MOBILE EXPERIENCE ACCEPTANCE AUDIT")
    print("=" * 80)

    summary = {
        "admin_desktop_compact_policy": False,
        "admin_desktop_auto_expansion": False,
        "admin_desktop_footer_ssot": False,
        "admin_mobile_search_launcher": False,
        "admin_mobile_drawer_accessibility": False,
        "teacher_role_navigation": False,
        "student_portal_navigation": False,
    }

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        # -------------------------------------------------------------
        # STEP 1: ADMIN DESKTOP SESSION
        # -------------------------------------------------------------
        print("\n[STEP 1] Testing Admin Desktop Navigation (1440x900)...")
        ctx = browser.new_context(viewport={"width": 1440, "height": 900})
        page = ctx.new_page()

        page.goto(f"{BASE_URL}/login")
        page.wait_for_selector('input[name="username"]', timeout=15000)
        page.fill('input[name="username"]', "admin@example.com")
        page.fill('input[name="password"]', PASSWORD)
        page.click('button[type="submit"]')
        page.wait_for_url("**/dashboard", timeout=15000)
        page.wait_for_timeout(2000)

        # Verify compact initial accordion policy
        academic_btn = page.query_selector('button[aria-label="Academic Workspace"]')
        is_academic_expanded = academic_btn.get_attribute("aria-expanded") if academic_btn else None
        print(f"  -> Academic accordion initial aria-expanded: {is_academic_expanded}")

        crm_btn = page.query_selector('button[aria-label="Lead Management & CRM"]')
        is_crm_expanded = crm_btn.get_attribute("aria-expanded") if crm_btn else None
        print(f"  -> CRM accordion initial aria-expanded: {is_crm_expanded}")

        if is_academic_expanded == "true" and is_crm_expanded == "false":
            summary["admin_desktop_compact_policy"] = True
            print("  [PASS] Compact initial accordion policy verified (Academic open, others collapsed).")
        else:
            print("  [WARN] Accordion initial state differs from policy default.")

        # Test active route auto-expansion: Navigate to /leads/pipeline
        print("  -> Navigating to /leads/pipeline...")
        page.goto(f"{BASE_URL}/leads/pipeline")
        page.wait_for_timeout(2000)

        crm_btn_after = page.query_selector('button[aria-label="Lead Management & CRM"]')
        is_crm_expanded_after = crm_btn_after.get_attribute("aria-expanded") if crm_btn_after else None
        print(f"  -> CRM accordion aria-expanded after navigating: {is_crm_expanded_after}")

        if is_crm_expanded_after == "true":
            summary["admin_desktop_auto_expansion"] = True
            print("  [PASS] Active route auto-expansion verified on /leads/pipeline.")

        # Test footer SSOT page title resolution
        footer_el = page.query_selector('footer[role="contentinfo"]')
        footer_text = footer_el.inner_text() if footer_el else ""
        if "Lead Pipeline" in footer_text or "Admissions & CRM" in footer_text:
            summary["admin_desktop_footer_ssot"] = True
            print(f"  [PASS] Dynamic footer title resolution verified: found 'Lead Pipeline' in footer.")

        # Screenshot Admin Desktop
        desktop_snap = os.path.join(ARTIFACTS_DIR, "nav_acceptance_admin_desktop.png")
        page.screenshot(path=desktop_snap)
        print(f"  -> Saved artifact: {desktop_snap}")

        ctx.close()

        # -------------------------------------------------------------
        # STEP 2: ADMIN MOBILE SESSION (390x844)
        # -------------------------------------------------------------
        print("\n[STEP 2] Testing Admin Mobile Navigation (390x844)...")
        mobile_ctx = browser.new_context(
            viewport={"width": 390, "height": 844},
            user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
        )
        mobile_page = mobile_ctx.new_page()

        mobile_page.goto(f"{BASE_URL}/login")
        mobile_page.wait_for_selector('input[name="username"]', timeout=15000)
        mobile_page.fill('input[name="username"]', "admin@example.com")
        mobile_page.fill('input[name="password"]', PASSWORD)
        mobile_page.click('button[type="submit"]')
        mobile_page.wait_for_url("**/dashboard", timeout=15000)
        mobile_page.wait_for_timeout(2000)

        # Verify mobile search launcher in header
        search_btn = mobile_page.query_selector('button[aria-label="Search navigation"]')
        if search_btn and search_btn.is_visible():
            summary["admin_mobile_search_launcher"] = True
            print("  [PASS] Mobile search launcher button is directly accessible in header.")
            # Click search launcher
            search_btn.click()
            mobile_page.wait_for_timeout(500)
            search_modal = mobile_page.query_selector('input[placeholder*="Search" i]')
            if search_modal:
                print("  [PASS] Global Navigation Search modal opened from mobile launcher.")
                mobile_page.keyboard.press("Escape")
                mobile_page.wait_for_timeout(500)

        # Verify mobile drawer and focus containment
        menu_btn = mobile_page.query_selector('button[aria-label="Open navigation menu"]')
        if menu_btn:
            print("  -> Opening mobile drawer...")
            menu_btn.click()
            mobile_page.wait_for_timeout(600)

            drawer = mobile_page.query_selector('aside[role="dialog"][aria-modal="true"], #app-sidebar')
            is_modal = drawer.get_attribute("aria-modal") if drawer else None
            is_inert = drawer.get_attribute("inert") if drawer else None

            print(f"  -> Drawer aria-modal: {is_modal}, inert: {is_inert}")
            if is_modal == "true" and is_inert is None:
                summary["admin_mobile_drawer_accessibility"] = True
                print("  [PASS] Mobile drawer dialog modal semantics verified.")

            # Capture mobile drawer open state
            mobile_snap = os.path.join(ARTIFACTS_DIR, "nav_acceptance_admin_mobile_drawer.png")
            mobile_page.screenshot(path=mobile_snap)
            print(f"  -> Saved artifact: {mobile_snap}")

            # Close drawer via Escape
            mobile_page.keyboard.press("Escape")
            mobile_page.wait_for_timeout(500)

        mobile_ctx.close()

        # -------------------------------------------------------------
        # STEP 3: TEACHER SESSION (1440x900)
        # -------------------------------------------------------------
        print("\n[STEP 3] Testing Teacher Navigation (rahul.desai)...")
        teacher_ctx = browser.new_context(viewport={"width": 1440, "height": 900})
        teacher_page = teacher_ctx.new_page()

        teacher_page.goto(f"{BASE_URL}/login")
        teacher_page.wait_for_selector('input[name="username"]', timeout=15000)
        teacher_page.fill('input[name="username"]', "rahul.desai@prashantacademy.in")
        teacher_page.fill('input[name="password"]', PASSWORD)
        teacher_page.click('button[type="submit"]')
        teacher_page.wait_for_url("**/dashboard", timeout=15000)
        teacher_page.wait_for_timeout(2000)

        teacher_sidebar = teacher_page.query_selector('#app-sidebar, aside[aria-label="Main Navigation"], nav')
        teacher_nav_text = teacher_sidebar.inner_text() if teacher_sidebar else ""

        has_academic = "Academic" in teacher_nav_text or "Timetable" in teacher_nav_text
        has_sysadmin = "SysAdmin" in teacher_nav_text or "Universal Data Editor" in teacher_nav_text

        print(f"  -> Teacher has Academic/Teaching routes: {has_academic}")
        print(f"  -> Teacher has SysAdmin routes (must be False): {has_sysadmin}")

        if has_academic and not has_sysadmin:
            summary["teacher_role_navigation"] = True
            print("  [PASS] Teacher RBAC navigation successfully filtered.")

        teacher_snap = os.path.join(ARTIFACTS_DIR, "nav_acceptance_teacher_desktop.png")
        teacher_page.screenshot(path=teacher_snap)
        print(f"  -> Saved artifact: {teacher_snap}")

        teacher_ctx.close()

        # -------------------------------------------------------------
        # STEP 4: STUDENT PORTAL SESSION (1440x900)
        # -------------------------------------------------------------
        print("\n[STEP 4] Testing Student Portal Navigation (ayaan2)...")
        student_ctx = browser.new_context(viewport={"width": 1440, "height": 900})
        student_page = student_ctx.new_page()

        student_page.goto(f"{BASE_URL}/login")
        student_page.wait_for_selector('input[name="username"]', timeout=15000)
        student_page.fill('input[name="username"]', "ayaan2@prashantacademy.in")
        student_page.fill('input[name="password"]', PASSWORD)
        student_page.click('button[type="submit"]')
        student_page.wait_for_timeout(3000)

        student_nav = student_page.query_selector('nav[aria-label="Student Navigation"], nav:has-text("Student Portal")')
        student_page_text = student_page.content()

        is_student_portal = "Student Portal" in student_page_text or "Student Dashboard" in student_page_text
        print(f"  -> Student Portal active: {is_student_portal}")

        if is_student_portal:
            summary["student_portal_navigation"] = True
            print("  [PASS] Dedicated Student Portal navigation verified.")

        student_snap = os.path.join(ARTIFACTS_DIR, "nav_acceptance_student_portal.png")
        student_page.screenshot(path=student_snap)
        print(f"  -> Saved artifact: {student_snap}")

        student_ctx.close()
        browser.close()

    print("\n" + "=" * 80)
    print("ACCEPTANCE VERIFICATION SUMMARY")
    print("=" * 80)
    all_passed = True
    for test_name, status in summary.items():
        state_str = "PASS" if status else "FAIL"
        print(f"  - {test_name:38}: {state_str}")
        if not status:
            all_passed = False

    print("=" * 80)
    if all_passed:
        print("ALL ACCEPTANCE CHECKS PASSED SUCCESSFULLY (7/7)")
    else:
        print("SOME CHECKS DID NOT PASS — PLEASE INSPECT LOGS ABOVE")
    print("=" * 80)


if __name__ == "__main__":
    verify_navigation_suite()
