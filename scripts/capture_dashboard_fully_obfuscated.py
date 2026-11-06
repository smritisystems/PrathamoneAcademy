# /**
#  * @file        capture_dashboard_fully_obfuscated.py
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
#  * @description Capture live dashboard screenshot with feature_hide_actual_amount active, demonstrating complete numeric obfuscation.
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
    print("Launching Chromium to capture fully obfuscated Dashboard...")
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

        # Set config to: is_master_enabled=True, feature_hide_actual_amount=True, feature_show_actual_amount=False
        print("Enabling feature_hide_actual_amount via API...")
        page.evaluate("""async () => {
            const token = localStorage.getItem('token');
            await fetch('/api/v1/codex/config', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    is_master_enabled: true,
                    feature_hide_actual_amount: true,
                    feature_show_actual_amount: false,
                    feature_show_both: false
                })
            });
        }""")
        time.sleep(1.5)

        # Reload /dashboard
        print("Loading /dashboard in fully obfuscated mode...")
        page.goto(f"{BASE_URL}/dashboard")
        time.sleep(3)

        path_obf_art = os.path.join(ARTIFACTS_DIR, "dashboard_codex_fully_obfuscated.png")
        path_obf_ass = os.path.join(ASSETS_DIR, "dashboard_codex_fully_obfuscated.png")
        page.screenshot(path=path_obf_art)
        page.screenshot(path=path_obf_ass)
        print(f"Saved: {path_obf_art}")

        browser.close()
        print("Fully obfuscated dashboard captured successfully!")

if __name__ == "__main__":
    run()

