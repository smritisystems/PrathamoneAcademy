# /**
#  * @file        capture_codex_sidebar_verification.py
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
#  * @description Capture verification screenshots for CodeX removal from sidebar header and placement under Settings.
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
    print("Launching Chromium for verification screenshots...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1440, "height": 900},
            device_scale_factor=1.5
        )
        page = context.new_page()

        print("Navigating to login...")
        page.goto(f"{BASE_URL}/login")
        page.wait_for_selector('input[type="text"], input[name="username"]', timeout=10000)
        time.sleep(1)

        print("Authenticating as Sysadmin...")
        page.fill('input[type="text"], input[name="username"]', "sysadmin")
        page.fill('input[type="password"]', "7)Yaw1dC_uQEfmYqmT")
        page.click('button[type="submit"]')
        page.wait_for_url("**/dashboard", timeout=15000)
        time.sleep(2)

        # 1. Capture Dashboard with Sidebar Header
        print("Capturing Sidebar Brand Header & Dashboard...")
        path_sidebar_artifact = os.path.join(ARTIFACTS_DIR, "codex_removed_from_sidebar_header.png")
        path_sidebar_asset = os.path.join(ASSETS_DIR, "codex_removed_from_sidebar_header.png")
        page.screenshot(path=path_sidebar_artifact)
        page.screenshot(path=path_sidebar_asset)
        print(f"Saved: {path_sidebar_artifact}")

        # 2. Capture Settings with CodeX Configuration Studio
        print("Navigating to Settings -> CodeX Studio...")
        page.goto(f"{BASE_URL}/settings?tab=codex")
        time.sleep(2)
        # If the tab param is not auto-selected, click on the CodeX category button
        codex_tab_btn = page.locator("button:has-text('CodeX Configuration Studio')")
        if codex_tab_btn.count() > 0:
            codex_tab_btn.first.click()
            time.sleep(1)

        # Reset scroll on right pane to top so the header card is 100% visible
        page.evaluate("() => { const panes = document.querySelectorAll('.overflow-y-auto'); panes.forEach(p => p.scrollTop = 0); window.scrollTo(0, 0); }")
        time.sleep(1)

        path_settings_artifact = os.path.join(ARTIFACTS_DIR, "codex_located_under_settings.png")
        path_settings_asset = os.path.join(ASSETS_DIR, "codex_located_under_settings.png")
        page.screenshot(path=path_settings_artifact)
        page.screenshot(path=path_settings_asset)
        print(f"Saved: {path_settings_artifact}")

        browser.close()
        print("Verification screenshot capture complete!")

if __name__ == "__main__":
    run()
