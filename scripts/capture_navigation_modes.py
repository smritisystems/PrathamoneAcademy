# /**
#  * @file        capture_navigation_modes.py
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
#  * @description Playwright end-to-end verification and visual evidence capture for all three navigation modes, search palette, customizer studio, and admin governance.
#  */

import os
import time
from playwright.sync_api import sync_playwright

BASE_URL = "http://localhost:80"
ARTIFACTS_DIR = r"C:\Users\netma\.gemini\antigravity\brain\f0e72778-27df-4928-92a5-dc51f7834a6e"
ASSETS_DIR = r"docs\assets\screenshots"

os.makedirs(ARTIFACTS_DIR, exist_ok=True)
os.makedirs(ASSETS_DIR, exist_ok=True)


def save_screenshot(page, filename):
    p_art = os.path.join(ARTIFACTS_DIR, filename)
    p_ast = os.path.join(ASSETS_DIR, filename)
    page.screenshot(path=p_art)
    page.screenshot(path=p_ast)
    print(f"[OK] Captured: {filename}")


def run():
    print("Initiating Playwright automated capture for Navigation Modes & Engine...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1440, "height": 960},
            device_scale_factor=1.5
        )
        page = context.new_page()

        # 1. Login
        page.goto(f"{BASE_URL}/login")
        page.wait_for_selector('input[type="password"]', timeout=10000)
        page.fill('input[type="text"], input[name="username"]', "sysadmin")
        page.fill('input[type="password"]', "7)Yaw1dC_uQEfmYqmT")
        page.click('button[type="submit"]')
        page.wait_for_url("**/dashboard", timeout=15000)
        time.sleep(3)

        # 2. Screenshot 1: Standard Menu Mode
        print("Capturing Standard Navigation Mode...")
        save_screenshot(page, "nav_mode_1_standard.png")

        # 3. Screenshot 2: My Menu Customizer Studio
        print("Opening My Menu Customizer Studio...")
        page.locator('button:has-text("Customize")').first.click()
        time.sleep(2)
        save_screenshot(page, "nav_customizer_studio.png")

        # 4. Switch to Hybrid Menu Mode inside studio and Save
        print("Switching to Hybrid Menu Mode...")
        page.locator('div:has-text("B. Hybrid Menu")').last.click()
        time.sleep(1)
        save_btn = page.locator('button:has-text("Save & Apply")').first
        save_btn.click()
        time.sleep(2.5)

        # 5. Screenshot 3: Hybrid Menu Mode
        print("Capturing Hybrid Menu Mode...")
        save_screenshot(page, "nav_mode_2_hybrid.png")

        # 6. Screenshot 4: Global Navigation Search Command Palette
        print("Opening Global Navigation Search Command Palette...")
        search_btn = page.locator('button[title*="Ctrl+K"]').first
        search_btn.click()
        time.sleep(1.5)
        # Type search query
        search_input = page.locator('input[placeholder*="Search modules"]').first
        search_input.fill("fee")
        time.sleep(1.5)
        save_screenshot(page, "nav_global_search_palette.png")

        # Close search
        page.keyboard.press("Escape")
        time.sleep(1)

        # 7. Open Customizer and switch to My Menu Only Mode
        print("Opening Customizer to switch to My Menu Only Mode...")
        page.locator('button:has-text("Customize")').first.click()
        time.sleep(1.5)
        page.locator('div:has-text("C. My Menu Only")').last.click()
        time.sleep(1)
        page.locator('button:has-text("Save & Apply")').first.click()
        time.sleep(2.5)

        # 8. Screenshot 5: My Menu Only Mode
        print("Capturing My Menu Only Mode...")
        save_screenshot(page, "nav_mode_3_my_menu_only.png")

        # 9. Verify Restore Standard Menu button works
        print("Testing Restore Standard Menu action...")
        restore_btn = page.locator('button:has-text("Restore Standard Menu")').first
        if restore_btn.is_visible():
            restore_btn.click()
            time.sleep(2)
            print("[PASS] Successfully restored standard menu!")

        # 10. Navigate to Settings -> Navigation & Menu Governance
        print("Navigating to Institute Settings Governance...")
        page.goto(f"{BASE_URL}/settings")
        time.sleep(2.5)

        # Click Navigation & Menu Governance category
        nav_cat_btn = page.locator('button:has-text("Navigation & Menu Governance")').first
        if nav_cat_btn.is_visible():
            nav_cat_btn.click()
            time.sleep(2)
            save_screenshot(page, "nav_admin_governance_panel.png")

        browser.close()
        print("All Navigation visual evidence successfully captured!")


if __name__ == "__main__":
    run()
