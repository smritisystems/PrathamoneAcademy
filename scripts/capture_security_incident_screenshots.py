# /**
#  * @file        capture_security_incident_screenshots.py
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
#  * @created     2026-11-19
#  * @updated     2026-11-19
#  *
#  * @description Visual verification capture script for Trusted Device Management, Kill-Switch Session Revocation, and Security Incident Center.
#  */

import asyncio
import os
from playwright.async_api import async_playwright

ARTIFACT_DIR = r"C:\Users\netma\.gemini\antigravity\brain\a9342623-369b-4ae4-8a7c-df1a1c576eeb"
FRONTEND_URL = "http://localhost:80"


async def main():
    os.makedirs(ARTIFACT_DIR, exist_ok=True)
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={"width": 1440, "height": 960},
            device_scale_factor=1.5,
        )
        page = await context.new_page()

        print("[1] Navigating to login page...")
        await page.goto(f"{FRONTEND_URL}/login")
        await page.wait_for_selector('input[name="username"]', timeout=15000)
        await page.fill('input[name="username"]', "admin@prathamone.com")
        await page.fill('input[name="password"]', "Admin@2026!")
        await page.click('button[type="submit"]')
        await page.wait_for_timeout(3000)

        print("[2] Navigating to Settings -> Security & Device Binding...")
        await page.goto(f"{FRONTEND_URL}/settings?category=security")
        await page.wait_for_selector('text=Device-Wise Security Binding', timeout=15000)
        await page.wait_for_timeout(2000)

        # Activate Edit Mode to show trust actions & session kill switches
        print("[3] Activating Scoped Edit Mode...")
        edit_toggle = page.locator('button:has-text("Enable Edit Mode")')
        if await edit_toggle.count() > 0:
            await edit_toggle.first.click()
            await page.wait_for_timeout(1000)

        # 1. Capture Hardware Inventory Table with Trusted badges and Kill Session buttons
        print("[4] Scrolling to Registered Devices Inventory...")
        inventory_el = page.locator('text=Registered Devices Inventory')
        if await inventory_el.count() > 0:
            await inventory_el.scroll_into_view_if_needed()
            await page.wait_for_timeout(1000)

        shot12 = os.path.join(ARTIFACT_DIR, "12_device_binding_trusted_devices_inventory.png")
        await page.screenshot(path=shot12, full_page=False)
        print(f"[SUCCESS] Captured Trusted Inventory: {shot12}")

        # 2. Switch to Security Incident Center tab
        print("[5] Switching to Security Incident Center tab...")
        incident_tab = page.locator('button:has-text("Security Incident Center")')
        if await incident_tab.count() > 0:
            await incident_tab.first.click()
            await page.wait_for_timeout(1500)

        shot13 = os.path.join(ARTIFACT_DIR, "13_security_incident_center_overview.png")
        await page.screenshot(path=shot13, full_page=False)
        print(f"[SUCCESS] Captured Security Incident Center: {shot13}")

        # 3. Filter by Critical Incidents
        print("[6] Filtering by Critical severity...")
        critical_btn = page.locator('button:has-text("critical")')
        if await critical_btn.count() > 0:
            await critical_btn.first.click()
            await page.wait_for_timeout(1000)

        shot14 = os.path.join(ARTIFACT_DIR, "14_security_incident_critical_filter.png")
        await page.screenshot(path=shot14, full_page=False)
        print(f"[SUCCESS] Captured Critical Incidents Filter: {shot14}")

        # 4. Open Terminate User Sessions modal
        print("[7] Opening Terminate User Sessions Kill-Switch Modal...")
        kill_user_btn = page.locator('button:has-text("Terminate User Sessions")')
        if await kill_user_btn.count() > 0:
            await kill_user_btn.first.click()
            await page.wait_for_timeout(800)

        shot15 = os.path.join(ARTIFACT_DIR, "15_terminate_user_sessions_modal.png")
        await page.screenshot(path=shot15, full_page=False)
        print(f"[SUCCESS] Captured Terminate User Sessions Modal: {shot15}")

        await browser.close()
        print("[DONE] All visual evidence screenshots captured.")


if __name__ == "__main__":
    asyncio.run(main())
