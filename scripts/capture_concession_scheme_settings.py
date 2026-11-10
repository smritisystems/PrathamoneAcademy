# /**
#  * @file        capture_concession_scheme_settings.py
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
#  * @description Playwright automation to capture visual verification for Concession Scheme Settings and the Add Scheme Modal.
#  */

import os
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\netma\.gemini\antigravity\brain\f0e72778-27df-4928-92a5-dc51f7834a6e"

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        # 1. Login
        print("Navigating to login...")
        page.goto("http://localhost:80/login", wait_until="networkidle")
        page.wait_for_selector('input[name="username"]', timeout=15000)
        page.fill('input[name="username"]', "admin@prashantacademy.edu.in")
        page.fill('input[name="password"]', "admin123")
        page.click('button[type="submit"]')
        page.wait_for_timeout(3000)

        # 2. Go to Fees / Concessions
        print("Navigating to Fees & Payments -> Concessions...")
        page.goto("http://localhost:80/fees/concessions", wait_until="networkidle")
        page.wait_for_timeout(2000)

        # 3. Click "Concession Scheme Settings" sub-tab
        print("Clicking Concession Scheme Settings sub-tab...")
        page.locator("button:has-text('Concession Scheme Settings')").first.click()
        page.wait_for_timeout(1500)

        # Capture view
        schemes_path = os.path.join(ARTIFACT_DIR, "live_concession_scheme_settings.png")
        page.screenshot(path=schemes_path)
        print(f"Captured: {schemes_path}")

        # Scroll down to table and capture
        table = page.locator("table").first
        table.scroll_into_view_if_needed()
        page.wait_for_timeout(1000)

        table_path = os.path.join(ARTIFACT_DIR, "live_concession_schemes_table.png")
        page.screenshot(path=table_path)
        print(f"Captured: {table_path}")

        # 4. Enable Edit Mode
        print("Enabling Edit Mode...")
        edit_mode_btn = page.locator("button:has-text('Enable Edit Mode')").first
        if edit_mode_btn.is_visible():
            edit_mode_btn.click()
            page.wait_for_timeout(1000)

        # 5. Click "+ Add Scheme"
        print("Opening Add Scheme modal...")
        page.locator("button:has-text('Add Scheme')").first.click()
        page.wait_for_timeout(1500)

        # Capture modal view
        modal_path = os.path.join(ARTIFACT_DIR, "live_add_concession_scheme_modal.png")
        page.screenshot(path=modal_path, full_page=True)
        print(f"Captured: {modal_path}")

        browser.close()

if __name__ == "__main__":
    run()
