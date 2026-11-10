# /**
#  * @file        capture_aadya_profile.py
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
#  * @description Visual verification capture script for Aadya's reconciled fee ledger and transparent concession display.
#  */

import os
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\netma\.gemini\antigravity\brain\f0e72778-27df-4928-92a5-dc51f7834a6e"
FRONTEND_URL = "http://localhost:80"

def capture():
    os.makedirs(ARTIFACT_DIR, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 960})
        page = context.new_page()

        print("1. Logging in as admin...")
        page.goto(f"{FRONTEND_URL}/login")
        page.wait_for_selector('input[name="username"]', timeout=15000)
        page.fill('input[name="username"]', "admin@prashantacademy.edu.in")
        page.fill('input[name="password"]', "admin123")
        page.click('button[type="submit"]')
        page.wait_for_timeout(3000)

        print("2. Navigating to Aadya's profile (/students/155)...")
        page.goto(f"{FRONTEND_URL}/students/155")
        page.wait_for_timeout(3000)

        # Click Fees tab
        print("3. Switching to Fees tab...")
        fees_tab = page.query_selector('button:has-text("Fees")')
        if fees_tab:
            fees_tab.click()
            page.wait_for_timeout(2000)

        out_path = os.path.join(ARTIFACT_DIR, "live_aadya_fees_transparent.png")
        page.screenshot(path=out_path)
        print(f"Captured: {out_path}")

        browser.close()

if __name__ == "__main__":
    capture()

