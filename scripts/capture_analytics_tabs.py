# /**
#  * @file        capture_analytics_tabs.py
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
#  * @description Comprehensive Playwright visual evidence capture for all 8 Dashboard Analytics & Insights tabs and the drilldown modal.
#  */

import os
import time
from playwright.sync_api import sync_playwright

BASE_URL = "http://localhost:80"
ARTIFACTS_DIR = r"C:\Users\netma\.gemini\antigravity\brain\f0e72778-27df-4928-92a5-dc51f7834a6e"
ASSETS_DIR = r"docs\assets\screenshots"

os.makedirs(ARTIFACTS_DIR, exist_ok=True)
os.makedirs(ASSETS_DIR, exist_ok=True)

TABS = [
    ("Overview", "tab_1_overview.png"),
    ("Fee Collection", "tab_2_fee_collection.png"),
    ("Outstanding Analysis", "tab_3_outstanding_analysis.png"),
    ("Student Analysis", "tab_4_student_analysis.png"),
    ("Admissions & CRM", "tab_5_admissions_crm.png"),
    ("Academic Analysis", "tab_6_academic_analysis.png"),
    ("Transactions & Reconciliation", "tab_7_transactions_reconciliation.png"),
    ("Operations", "tab_8_operations.png"),
]

def run():
    print("Capturing all 8 Dashboard Analytics & Insights tabs...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1440, "height": 960},
            device_scale_factor=1.5
        )
        page = context.new_page()

        page.goto(f"{BASE_URL}/login")
        page.wait_for_selector('input[type="password"]', timeout=10000)
        page.fill('input[type="text"], input[name="username"]', "sysadmin")
        page.fill('input[type="password"]', "7)Yaw1dC_uQEfmYqmT")
        page.click('button[type="submit"]')
        page.wait_for_url("**/dashboard", timeout=15000)
        time.sleep(3)

        # Loop through all 8 tabs
        for label, filename in TABS:
            print(f"Clicking tab: {label}...")
            # Click tab button by text
            btn = page.locator(f'button:has-text("{label}")').first
            btn.click()
            time.sleep(2)

            # Screenshot viewport
            p_art = os.path.join(ARTIFACTS_DIR, filename)
            p_ast = os.path.join(ASSETS_DIR, filename)
            page.screenshot(path=p_art)
            page.screenshot(path=p_ast)
            print(f"Captured: {filename}")

        # Switch back to Outstanding tab to capture drilldown modal
        print("Capturing Granular Outstanding Drilldown Modal...")
        page.locator('button:has-text("Outstanding Analysis")').first.click()
        time.sleep(1.5)
        drill_btn = page.locator('button:has-text("Open Granular Drill-Down")').first
        drill_btn.click()
        time.sleep(2)
        p_drill_art = os.path.join(ARTIFACTS_DIR, "tab_3_outstanding_drilldown_modal.png")
        p_drill_ast = os.path.join(ASSETS_DIR, "tab_3_outstanding_drilldown_modal.png")
        page.screenshot(path=p_drill_art)
        page.screenshot(path=p_drill_ast)
        print("Captured: tab_3_outstanding_drilldown_modal.png")

        browser.close()
        print("All visual evidence successfully captured!")

if __name__ == "__main__":
    run()
