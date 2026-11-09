# /**
#  * @file        capture_dashboard_sections.py
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
#  * @description Capture multi-section dashboard screenshots covering top KPIs, fee trends, aging analysis, recent transactions, and the drilldown modal.
#  */

import os
import time
from playwright.sync_api import sync_playwright

BASE_URL = "http://localhost:80"
ARTIFACTS_DIR = r"C:\Users\netma\.gemini\antigravity\brain\f0e72778-27df-4928-92a5-dc51f7834a6e"
ASSETS_DIR = r"docs\assets\screenshots"

os.makedirs(ARTIFACTS_DIR, exist_ok=True)
os.makedirs(ASSETS_DIR, exist_ok=True)

def run():
    print("Capturing full multi-section dashboard evidence...")
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

        # 1. Top Section (Primary KPIs, Secondary Indicators, Status-wise reconciliation)
        p_top = os.path.join(ARTIFACTS_DIR, "dashboard_view_top.png")
        page.screenshot(path=p_top)
        page.screenshot(path=os.path.join(ASSETS_DIR, "dashboard_view_top.png"))
        print(f"Saved: {p_top}")

        # 2. Middle Section (Fee Collection Trends Chart & Aging Recovery Analysis)
        page.evaluate("""() => {
            const m = document.querySelector('main') || document.documentElement;
            m.scrollTo({ top: 520, behavior: 'instant' });
        }""")
        time.sleep(1.5)
        p_mid = os.path.join(ARTIFACTS_DIR, "dashboard_view_middle.png")
        page.screenshot(path=p_mid)
        page.screenshot(path=os.path.join(ASSETS_DIR, "dashboard_view_middle.png"))
        print(f"Saved: {p_mid}")

        # 3. Bottom Section (Daily Operations Pulse & Recent Payment Transactions Table)
        page.evaluate("""() => {
            const m = document.querySelector('main') || document.documentElement;
            m.scrollTo({ top: 1100, behavior: 'instant' });
        }""")
        time.sleep(1.5)
        p_bot = os.path.join(ARTIFACTS_DIR, "dashboard_view_bottom.png")
        page.screenshot(path=p_bot)
        page.screenshot(path=os.path.join(ASSETS_DIR, "dashboard_view_bottom.png"))
        print(f"Saved: {p_bot}")

        # 4. Outstanding Drilldown Modal
        page.evaluate("""() => {
            const m = document.querySelector('main') || document.documentElement;
            m.scrollTo({ top: 0, behavior: 'instant' });
        }""")
        time.sleep(1)

        # Click on the status card containing '38 active invoice(s)'
        card = page.locator("text=38 active invoice(s)").first
        card.click()
        time.sleep(2.5)

        p_mod = os.path.join(ARTIFACTS_DIR, "dashboard_view_drilldown_modal.png")
        page.screenshot(path=p_mod)
        page.screenshot(path=os.path.join(ASSETS_DIR, "dashboard_view_drilldown_modal.png"))
        print(f"Saved: {p_mod}")

        browser.close()
        print("Completed capturing all dashboard sections!")

if __name__ == "__main__":
    run()
