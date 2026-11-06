# /**
#  * @file        capture_dashboard_coded_only.py
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
#  * @description Capture live dashboard screenshot in coded_only mode showing fully obfuscated numbers.
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
    print("Launching Chromium to capture Dashboard in coded_only mode...")
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

        # 1. Ensure CodeX is active and assign coded_only scope
        print("Setting sysadmin scope to coded_only...")
        page.evaluate("""async () => {
            const token = localStorage.getItem('token');
            // Ensure master switch is ON
            await fetch('/api/v1/codex/config', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ is_master_enabled: true })
            });
            // Add or update scope for sysadmin to coded_only
            await fetch('/api/v1/codex/scopes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    institution_id: 1,
                    scope_type: 'role',
                    scope_target: 'sysadmin',
                    visibility_mode: 'coded_only',
                    can_decode: true,
                    can_generate_qr: true,
                    allowed_modules: '["all"]'
                })
            });
        }""")
        time.sleep(1.5)

        # 2. Navigate to Dashboard to see fully masked numbers
        print("Navigating to /dashboard in coded_only mode...")
        page.goto(f"{BASE_URL}/dashboard")
        time.sleep(3)

        path_masked_art = os.path.join(ARTIFACTS_DIR, "dashboard_codex_masked_coded_only.png")
        path_masked_ass = os.path.join(ASSETS_DIR, "dashboard_codex_masked_coded_only.png")
        page.screenshot(path=path_masked_art)
        page.screenshot(path=path_masked_ass)
        print(f"Saved: {path_masked_art}")

        # 3. Clean up: reset scope back to actual_only
        print("Cleaning up scope back to actual_only...")
        page.evaluate("""async () => {
            const token = localStorage.getItem('token');
            // Remove sysadmin coded_only scope
            const scopesRes = await fetch('/api/v1/codex/scopes', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const scopes = await scopesRes.json();
            for (const s of scopes) {
                if (s.scope_target === 'sysadmin') {
                    await fetch(`/api/v1/codex/scopes/${s.id}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                }
            }
        }""")
        time.sleep(1)

        browser.close()
        print("Dashboard coded_only verification screenshot captured successfully!")

if __name__ == "__main__":
    run()
