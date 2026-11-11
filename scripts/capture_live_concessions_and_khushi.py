# /**
#  * @file        capture_live_concessions_and_khushi.py
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
#  * @updated     2026-11-11
#  *
#  * @description Visual verification capture script for the updated Concession Application modal and Khushi's reconciled fee profile.
#  */

import os
import time
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\netma\.gemini\antigravity\brain\f0e72778-27df-4928-92a5-dc51f7834a6e"
FRONTEND_URL = "http://localhost:80"

def capture():
    os.makedirs(ARTIFACT_DIR, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        print("1. Logging in as admin...")
        page.goto(f"{FRONTEND_URL}/login")
        page.wait_for_selector('input[name="username"]', timeout=15000)
        page.fill('input[name="username"]', "admin@example.com")
        page.fill('input[name="password"]', "admin123")
        page.click('button[type="submit"]')
        page.wait_for_timeout(3000)

        # 2. Go to Fees Concessions Tab
        print("2. Navigating to Fees Concessions...")
        page.goto(f"{FRONTEND_URL}/fees/concessions")
        page.wait_for_timeout(3000)

        # Click Enable Edit Mode
        print("3. Enabling Edit Mode...")
        edit_btn = page.query_selector('button:has-text("Enable Edit Mode")')
        if edit_btn:
            edit_btn.click()
            page.wait_for_timeout(1000)

        # Click + Apply Concession
        print("4. Opening Apply Concession modal...")
        apply_btn = page.query_selector('button:has-text("Apply Concession")')
        if apply_btn:
            apply_btn.click()
            page.wait_for_timeout(1500)

            # Search Khushi in student dropdown
            search_input = page.query_selector('input[placeholder*="Search student by name"]')
            if search_input:
                search_input.fill("Khushi")
                page.wait_for_timeout(1000)
                # Click the first search result
                first_result = page.query_selector('button:has-text("Khushi")')
                if first_result:
                    first_result.click()
                    page.wait_for_timeout(1500)

            # Screenshot Single mode modal
            single_path = os.path.join(ARTIFACT_DIR, "live_concession_modal_single.png")
            page.screenshot(path=single_path)
            print(f"Captured Single Concession Modal: {single_path}")

            # Switch to Bulk mode
            bulk_tab = page.query_selector('button:has-text("Bulk / Batch Concession")')
            if bulk_tab:
                bulk_tab.click()
                page.wait_for_timeout(1000)
                bulk_path = os.path.join(ARTIFACT_DIR, "live_concession_modal_bulk.png")
                page.screenshot(path=bulk_path)
                print(f"Captured Bulk Concession Modal: {bulk_path}")

        # 5. Navigate to Khushi's profile to verify reconciled invoices
        print("5. Navigating to Khushi profile...")
        page.goto(f"{FRONTEND_URL}/students/147")
        page.wait_for_timeout(3000)

        # Click Fees tab
        fees_tab = page.query_selector('button:has-text("Fees")')
        if fees_tab:
            fees_tab.click()
            page.wait_for_timeout(2000)

        khushi_path = os.path.join(ARTIFACT_DIR, "live_khushi_fees_reconciled.png")
        page.screenshot(path=khushi_path)
        print(f"Captured Khushi Reconciled Fees: {khushi_path}")

        browser.close()
        print("Done!")

if __name__ == "__main__":
    capture()

