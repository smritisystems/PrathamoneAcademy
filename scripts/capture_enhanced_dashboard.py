# /**
#  * @file        capture_enhanced_dashboard.py
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
#  * @created     2026-11-10
#  * @updated     2026-11-10
#  *
#  * @description Capture high-resolution visual evidence of the upgraded executive dashboard, status-wise reconciliation, aging recovery matrix, and drilldown modal.
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
    print("Launching Chromium to capture upgraded executive dashboard...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1440, "height": 960},
            device_scale_factor=1.5
        )
        page = context.new_page()

        # 1. Login as SysAdmin
        print("Authenticating as SysAdmin...")
        page.goto(f"{BASE_URL}/login")
        page.wait_for_selector('input[type="text"], input[name="username"]', timeout=10000)
        time.sleep(1)
        page.fill('input[type="text"], input[name="username"]', "sysadmin")
        page.fill('input[type="password"]', "7)Yaw1dC_uQEfmYqmT")
        page.click('button[type="submit"]')
        page.wait_for_url("**/dashboard", timeout=15000)
        print("Logged in, waiting for dashboard data to load...")
        time.sleep(3)

        # 2. Viewport Hero Screenshot
        hero_art = os.path.join(ARTIFACTS_DIR, "dashboard_enhanced_hero_viewport.png")
        hero_ass = os.path.join(ASSETS_DIR, "dashboard_enhanced_hero_viewport.png")
        page.screenshot(path=hero_art)
        page.screenshot(path=hero_ass)
        print(f"Saved: {hero_art}")

        # 3. Full-page Scrollable Screenshot
        full_art = os.path.join(ARTIFACTS_DIR, "dashboard_enhanced_full_page.png")
        full_ass = os.path.join(ASSETS_DIR, "dashboard_enhanced_full_page.png")
        page.screenshot(path=full_art, full_page=True)
        page.screenshot(path=full_ass, full_page=True)
        print(f"Saved: {full_art}")

        # 4. Open Outstanding Drilldown Modal
        print("Opening Outstanding Drilldown Modal...")
        drilldown_btn = page.query_selector("button:has-text('View Drilldown'), button:has-text('Drilldown')")
        if drilldown_btn:
            drilldown_btn.click()
            time.sleep(2)
            modal_art = os.path.join(ARTIFACTS_DIR, "dashboard_outstanding_drilldown_modal.png")
            modal_ass = os.path.join(ASSETS_DIR, "dashboard_outstanding_drilldown_modal.png")
            page.screenshot(path=modal_art)
            page.screenshot(path=modal_ass)
            print(f"Saved: {modal_art}")
        else:
            print("Drilldown button not found directly, trying card click...")
            card = page.query_selector("div:has-text('Outstanding Balance')")
            if card:
                card.click()
                time.sleep(2)
                modal_art = os.path.join(ARTIFACTS_DIR, "dashboard_outstanding_drilldown_modal.png")
                page.screenshot(path=modal_art)
                print(f"Saved: {modal_art}")

        browser.close()
        print("All dashboard screenshots captured successfully!")

if __name__ == "__main__":
    run()
