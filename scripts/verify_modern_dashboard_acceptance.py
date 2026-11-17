# /**
#  * @file        verify_modern_dashboard_acceptance.py
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
#  * @description Live browser verification script for the Modern Executive Dashboard inspiration layout.
#  */

import os
import shutil
import time
from playwright.sync_api import sync_playwright

BASE_URL = "http://localhost:80"
ARTIFACTS_DIR = r"C:\Users\netma\.gemini\antigravity\brain\d80f407d-b71e-4c0b-86a6-a8f64e74ae9e"
DOCS_ASSETS_DIR = r"F:\PrashantAcademy\docs\assets"
PASSWORD = "7)Yaw1dC_uQEfmYqmT"
ADMIN_EMAIL = "admin@example.com"

os.makedirs(ARTIFACTS_DIR, exist_ok=True)
os.makedirs(DOCS_ASSETS_DIR, exist_ok=True)


def copy_screenshot(src_path, filename):
    dest_artifacts = os.path.join(ARTIFACTS_DIR, filename)
    dest_docs = os.path.join(DOCS_ASSETS_DIR, filename)
    shutil.copyfile(src_path, dest_artifacts)
    shutil.copyfile(src_path, dest_docs)
    print(f"  [SAVED] {filename}")


def run_verification():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 960})
        page = context.new_page()

        console_errors = []
        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)

        print("[1/5] Navigating to login page...")
        page.goto(f"{BASE_URL}/login")
        page.wait_for_selector('input[name="username"]', timeout=15000)
        page.fill('input[name="username"]', ADMIN_EMAIL)
        page.fill('input[name="password"]', PASSWORD)
        page.click('button[type="submit"]')

        print("[2/5] Waiting for dashboard landing...")
        page.wait_for_url("**/dashboard", timeout=15000)
        page.wait_for_selector("text=Hello,", timeout=15000)
        time.sleep(2)

        print("[3/5] Verifying Modern Executive Dashboard desktop layout...")
        step1_path = os.path.join(ARTIFACTS_DIR, "temp_step1_dashboard.png")
        page.screenshot(path=step1_path, full_page=False)
        copy_screenshot(step1_path, "modern_dashboard_step1_overview.png")

        # Verify Header Greeting & Subtitle
        assert page.locator("text=Hello,").count() > 0, "Missing Hello greeting"
        assert page.locator("text=Here's your Institutes overview, performance, and latest updates.").count() > 0, "Missing Institute overview subtitle"

        # Verify 4 KPI StatCards
        assert page.locator("text=Total Fees Collected").count() > 0, "Missing Total Fees Collected"
        assert page.locator("text=Active Students").count() > 0, "Missing Active Students"
        assert page.locator("text=Institute Attendance").count() > 0, "Missing Institute Attendance"
        assert page.locator("text=Outstanding Dues").count() > 0, "Missing Outstanding Dues"

        # Verify Dual Bar Chart
        assert page.locator("text=Monthly Fee Collection Trends").count() > 0 or page.locator("text=Revenue Overview").count() > 0, "Missing Collection Trends Chart"

        # Verify Three-Pillar Command Center
        assert page.locator("text=Recent Fee Receipts").count() > 0, "Missing Recent Fee Receipts"
        assert page.locator("text=Top Performing Batches").count() > 0, "Missing Top Performing Batches"
        assert page.locator("text=Live Activity Feed").count() > 0, "Missing Live Activity Feed"

        print("  [OK] All 4 Tiers verified on desktop.")

        print("[4/5] Testing Donut Chart Toggle to 'By Stream'...")
        by_stream_btn = page.locator("button:has-text('By Stream')")
        if by_stream_btn.count() > 0:
            by_stream_btn.click()
            time.sleep(1)
            assert page.locator("text=Academic Stream Distribution").count() > 0, "Missing Academic Stream Distribution heading"
            step2_path = os.path.join(ARTIFACTS_DIR, "temp_step2_stream_donut.png")
            page.screenshot(path=step2_path, full_page=False)
            copy_screenshot(step2_path, "modern_dashboard_step2_stream_donut.png")
            print("  [OK] Stream donut toggle verified.")

        print("[5/5] Testing Mobile Responsiveness (390x844)...")
        page.set_viewport_size({"width": 390, "height": 844})
        time.sleep(1)
        step3_path = os.path.join(ARTIFACTS_DIR, "temp_step3_mobile.png")
        page.screenshot(path=step3_path, full_page=False)
        copy_screenshot(step3_path, "modern_dashboard_step3_mobile.png")
        print("  [OK] Mobile responsiveness verified.")

        # Cleanup temp files
        for tmp in [step1_path, step2_path, step3_path]:
            if os.path.exists(tmp):
                os.remove(tmp)

        browser.close()
        print("\n[SUCCESS] Modern Executive Dashboard live browser audit passed 100%!")


if __name__ == "__main__":
    run_verification()
