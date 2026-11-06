# /**
#  * @file        capture_actual_values_verification.py
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
#  * @description Verify that actual raw financial and student values are visible across the software when CodeX is disabled.
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
    print("Launching Chromium to verify actual raw values display...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1440, "height": 900},
            device_scale_factor=1.5
        )
        page = context.new_page()

        # 1. Login as SysAdmin / Admin
        print("Authenticating as SysAdmin...")
        page.goto(f"{BASE_URL}/login")
        page.wait_for_selector('input[type="text"], input[name="username"]', timeout=10000)
        time.sleep(1)
        page.fill('input[type="text"], input[name="username"]', "sysadmin")
        page.fill('input[type="password"]', "7)Yaw1dC_uQEfmYqmT")
        page.click('button[type="submit"]')
        page.wait_for_url("**/dashboard", timeout=15000)
        time.sleep(2)

        # Capture SysAdmin Dashboard showing actual figures
        print("Capturing 01: SysAdmin Dashboard showing actual raw financial values...")
        path_admin_dash_art = os.path.join(ARTIFACTS_DIR, "actual_values_admin_dashboard.png")
        path_admin_dash_ass = os.path.join(ASSETS_DIR, "actual_values_admin_dashboard.png")
        page.screenshot(path=path_admin_dash_art)
        page.screenshot(path=path_admin_dash_ass)
        print(f"Saved: {path_admin_dash_art}")

        # Capture Fees & Payments showing actual fees register
        print("Navigating to Fees & Payments...")
        page.goto(f"{BASE_URL}/fees")
        time.sleep(2)
        print("Capturing 02: Fees & Payments Ledger showing actual student fee amounts...")
        path_fees_art = os.path.join(ARTIFACTS_DIR, "actual_values_fees_ledger.png")
        path_fees_ass = os.path.join(ASSETS_DIR, "actual_values_fees_ledger.png")
        page.screenshot(path=path_fees_art)
        page.screenshot(path=path_fees_ass)
        print(f"Saved: {path_fees_art}")

        # 2. Logout and Login as Accountant
        print("Logging out...")
        page.goto(f"{BASE_URL}/login")
        # Clear storage / cookies
        context.clear_cookies()
        page.evaluate("() => localStorage.clear()")
        page.reload()
        page.wait_for_selector('input[type="text"], input[name="username"]', timeout=10000)
        time.sleep(1)

        print("Authenticating as Accountant (Rajesh Sharma)...")
        page.fill('input[type="text"], input[name="username"]', "accountant")
        page.fill('input[type="password"]', "account123")
        page.click('button[type="submit"]')
        page.wait_for_url("**/dashboard", timeout=15000)
        time.sleep(2)

        # Capture Accountant Dashboard showing actual figures
        print("Capturing 03: Accountant Dashboard showing actual raw financial figures...")
        path_acc_dash_art = os.path.join(ARTIFACTS_DIR, "actual_values_accountant_dashboard.png")
        path_acc_dash_ass = os.path.join(ASSETS_DIR, "actual_values_accountant_dashboard.png")
        page.screenshot(path=path_acc_dash_art)
        page.screenshot(path=path_acc_dash_ass)
        print(f"Saved: {path_acc_dash_art}")

        browser.close()
        print("Actual values verification screenshots captured successfully!")

if __name__ == "__main__":
    run()

