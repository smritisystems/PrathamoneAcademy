# /**
#  * @file        capture_dashboard_codex_active.py
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
#  * @created     2026-11-07
#  * @updated     2026-11-07
#  *
#  * @description Capture live dashboard screenshot demonstrating active CodeX obfuscation and on-demand decoder.
#  */

import os
import sys
import time
from playwright.sync_api import sync_playwright

BASE_URL = "http://localhost:80"
ARTIFACTS_DIR = r"C:\Users\netma\.gemini\antigravity\brain\f0e72778-27df-4928-92a5-dc51f7834a6e"
ASSETS_DIR = r"docs\assets\screenshots"

os.makedirs(ARTIFACTS_DIR, exist_ok=True)
os.makedirs(ASSETS_DIR, exist_ok=True)

def run():
    print("Launching Chromium to capture Dashboard with ACTIVE CodeX...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1440, "height": 900},
            device_scale_factor=1.5
        )
        page = context.new_page()

        # Login as SysAdmin
        print("Authenticating as SysAdmin...")
        page.goto(f"{BASE_URL}/login")
        page.wait_for_selector('input[type="text"], input[name="username"]', timeout=10000)
        time.sleep(1)
        page.fill('input[type="text"], input[name="username"]', "sysadmin")
        page.fill('input[type="password"]', "7)Yaw1dC_uQEfmYqmT")
        page.click('button[type="submit"]')
        page.wait_for_url("**/dashboard", timeout=15000)
        time.sleep(2)

        # 1. Activate CodeX in /codex
        print("Navigating to /codex to activate master switch...")
        page.goto(f"{BASE_URL}/codex")
        time.sleep(2)
        activate_btn = page.locator("button:has-text('Activate CodeX')")
        if activate_btn.count() > 0:
            activate_btn.first.click()
            time.sleep(2)
            print("CodeX Activated.")

        # 2. Open Dashboard to show CodeX active
        print("Navigating to /dashboard with CodeX active...")
        page.goto(f"{BASE_URL}/dashboard")
        time.sleep(3)

        # Capture Dashboard showing CodeX active badges on KPIs and transactions
        path_dash_art = os.path.join(ARTIFACTS_DIR, "dashboard_codex_active.png")
        path_dash_ass = os.path.join(ASSETS_DIR, "dashboard_codex_active.png")
        page.screenshot(path=path_dash_art)
        page.screenshot(path=path_dash_ass)
        print(f"Saved: {path_dash_art}")

        # 3. Click the CodeX pill on Total Fees Invoiced to open QuickDecoderModal
        print("Opening QuickDecoderModal directly from dashboard KPI badge...")
        codex_badge_btn = page.locator("button:has-text('CX-ZTTRQQQ')")
        if codex_badge_btn.count() > 0:
            codex_badge_btn.first.click()
            time.sleep(1)

            # Click decode button inside modal to reveal authentic value
            decode_btn = page.locator("button[type='submit']:has-text('Decode Coded Value')")
            if decode_btn.count() > 0:
                decode_btn.first.click()
                time.sleep(1.5)

            path_modal_art = os.path.join(ARTIFACTS_DIR, "dashboard_codex_decoder_modal.png")
            path_modal_ass = os.path.join(ASSETS_DIR, "dashboard_codex_decoder_modal.png")
            page.screenshot(path=path_modal_art)
            page.screenshot(path=path_modal_ass)
            print(f"Saved: {path_modal_art}")

        browser.close()
        print("Dashboard CodeX active verification screenshots captured successfully!")

if __name__ == "__main__":
    run()
