# /**
#  * @file        verify_mobile_responsive.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      scripts
#  *
#  * @author      Jawahar R. Mallah
#  * @organization Smritisys & AITDL Networks
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 PrathamOne EduOS
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-18
#  * @updated     2026-11-18
#  *
#  * @description Mobile responsive and drawer navigation verification across Light and 10/10 Dark Mode.
#  */

import os
from playwright.sync_api import sync_playwright

BASE_URL = "http://localhost:80"
ADMIN_EMAIL = "admin@prathamone.com"
ADMIN_PASS = "Admin@2026!"
OUTPUT_DIR = r"C:\Users\netma\.gemini\antigravity\brain\22905f1c-8cd0-4587-bdca-ae672361b8c4\mobile_audit"
os.makedirs(OUTPUT_DIR, exist_ok=True)

def run_mobile_audit():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Mobile viewport (iPhone 14 / modern Android dimension: 390 x 844)
        context = browser.new_context(
            viewport={"width": 390, "height": 844},
            is_mobile=True,
            has_touch=True,
            user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1"
        )
        page = context.new_page()

        print("[AUTH] Logging in on Mobile Viewport (390x844)...")
        page.goto(f"{BASE_URL}/login")
        page.wait_for_selector('input[name="username"]', timeout=15000)
        page.fill('input[name="username"]', ADMIN_EMAIL)
        page.fill('input[type="password"]', ADMIN_PASS)
        page.click('button[type="submit"]')
        page.wait_for_url("**/dashboard", timeout=15000)
        page.wait_for_timeout(2000)
        print("  -> Logged in successfully.")

        # ── Test 1: Mobile Dashboard in Dark Mode ──
        page.evaluate("""() => {
            const stored = JSON.parse(localStorage.getItem('pratham-appearance') || '{"state":{},"version":1}');
            stored.state = { preference: 'dark' };
            localStorage.setItem('pratham-appearance', JSON.stringify(stored));
            document.documentElement.classList.add('dark');
        }""")
        page.reload()
        page.wait_for_timeout(2500)
        page.screenshot(path=os.path.join(OUTPUT_DIR, "mobile_01_dashboard_dark.png"))
        print("  -> Saved mobile_01_dashboard_dark.png")

        # ── Test 2: Mobile Navigation Drawer in Dark Mode ──
        menu_btn = page.query_selector('button[aria-label="Open navigation menu"], button:has(svg.lucide-menu), header button:first-child')
        if menu_btn:
            menu_btn.click()
            page.wait_for_timeout(1000)
            page.screenshot(path=os.path.join(OUTPUT_DIR, "mobile_02_drawer_dark.png"))
            print("  -> Saved mobile_02_drawer_dark.png")
            # Close drawer by close button or escape
            close_btn = page.query_selector('button:has(svg.lucide-x), #app-sidebar button:has(svg)')
            if close_btn:
                close_btn.click()
            else:
                page.keyboard.press("Escape")
            page.wait_for_timeout(800)

        # ── Test 3: Mobile Fees Page in Dark Mode ──
        page.goto(f"{BASE_URL}/fees")
        page.wait_for_timeout(2500)
        page.screenshot(path=os.path.join(OUTPUT_DIR, "mobile_03_fees_dark.png"))
        print("  -> Saved mobile_03_fees_dark.png")

        # ── Test 4: Mobile Attendance Page in Dark Mode ──
        page.goto(f"{BASE_URL}/attendance")
        page.wait_for_timeout(2500)
        page.screenshot(path=os.path.join(OUTPUT_DIR, "mobile_04_attendance_dark.png"))
        print("  -> Saved mobile_04_attendance_dark.png")

        # ── Test 5: Mobile Dashboard in Light Mode ──
        page.evaluate("""() => {
            const stored = JSON.parse(localStorage.getItem('pratham-appearance') || '{"state":{},"version":1}');
            stored.state = { preference: 'light' };
            localStorage.setItem('pratham-appearance', JSON.stringify(stored));
            document.documentElement.classList.remove('dark');
        }""")
        page.goto(f"{BASE_URL}/dashboard")
        page.wait_for_timeout(2500)
        page.screenshot(path=os.path.join(OUTPUT_DIR, "mobile_05_dashboard_light.png"))
        print("  -> Saved mobile_05_dashboard_light.png")

        # ── Test 6: Mobile Navigation Drawer in Light Mode ──
        menu_btn_light = page.query_selector('button[aria-label="Open navigation menu"], button:has(svg.lucide-menu), header button:first-child')
        if menu_btn_light:
            menu_btn_light.click()
            page.wait_for_timeout(1000)
            page.screenshot(path=os.path.join(OUTPUT_DIR, "mobile_06_drawer_light.png"))
            print("  -> Saved mobile_06_drawer_light.png")

        browser.close()
        print("\n[COMPLETE] Mobile responsive verification complete!")

if __name__ == "__main__":
    run_mobile_audit()
