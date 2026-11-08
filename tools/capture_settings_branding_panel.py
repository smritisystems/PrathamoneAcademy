# /**
#  * @file        capture_settings_branding_panel.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      tools
#  *
#  * @author      Jawahar R. Mallah
#  * @organization AITDL (AI Technology & Development Lab)
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 AITDL
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-08
#  * @updated     2026-11-08
#  *
#  * @description Visual evidence capture tool for Settings Branding & Canvas Engine Controls.
#  */

import os
import time
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\netma\.gemini\antigravity\brain\f0e72778-27df-4928-92a5-dc51f7834a6e"
FRONTEND_URL = "http://localhost:5173"

def main():
    print("Capturing Settings Branding & Canvas Engine panel...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1920, "height": 1080})
        page = context.new_page()

        page.goto(f"{FRONTEND_URL}/login")
        page.fill('input[name="username"]', "admin@prashantacademy.edu.in")
        page.fill('input[name="password"]', "admin123")
        page.click('button[type="submit"]')
        page.wait_for_timeout(3500)

        page.goto(f"{FRONTEND_URL}/settings")
        page.wait_for_timeout(2500)

        # Click "Branding & Appearance" category button in Settings
        branding_tab = page.locator('button:has-text("Branding & Appearance")')
        if branding_tab.count() > 0:
            branding_tab.first.click()
            page.wait_for_timeout(2000)
            print("Clicked Branding & Appearance category")

        # Scroll to "Login Page Canvas & Background Engine"
        canvas_header = page.locator('text=Login Page Canvas & Background Engine')
        if canvas_header.count() > 0:
            canvas_header.scroll_into_view_if_needed()
            page.wait_for_timeout(1500)
            out_path = os.path.join(ARTIFACT_DIR, "screenshot_settings_canvas_engine.png")
            page.screenshot(path=out_path)
            print(f"Captured: {out_path}")

        browser.close()

if __name__ == "__main__":
    main()
