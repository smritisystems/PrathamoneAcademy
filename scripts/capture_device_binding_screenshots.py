# /**
#  * @file        capture_device_binding_screenshots.py
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
#  * @description Visual verification capture script for Optional Device-Wise Security Binding in View and Edit modes.
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

        # 1. Capture View Mode Overview (Default Disabled)
        shot1 = os.path.join(ARTIFACT_DIR, "01_device_binding_view_mode.png")
        await page.screenshot(path=shot1, full_page=True)
        print(f"[SUCCESS] Captured View Mode: {shot1}")

        # 2. Activate Edit Mode
        print("[3] Activating Scoped Edit Mode...")
        edit_toggle = page.locator('button:has-text("Enable Edit Mode")')
        if await edit_toggle.count() > 0:
            await edit_toggle.first.click()
            await page.wait_for_timeout(1000)

        shot2 = os.path.join(ARTIFACT_DIR, "02_device_binding_edit_mode.png")
        await page.screenshot(path=shot2, full_page=True)
        print(f"[SUCCESS] Captured Edit Mode: {shot2}")

        # 3. Click on 'Registered Devices Only' policy mode card
        print("[4] Selecting Registered Devices Only policy mode...")
        card_reg = page.locator('text=3. Registered Devices Only')
        if await card_reg.count() > 0:
            await card_reg.first.click(force=True)
            await page.wait_for_timeout(1000)

        shot3 = os.path.join(ARTIFACT_DIR, "03_device_binding_policies_configured.png")
        await page.screenshot(path=shot3, full_page=True)
        print(f"[SUCCESS] Captured Configured Policy: {shot3}")

        # 4. Scroll down to inventory and safe disablement
        print("[5] Capturing Registered Devices Inventory & Safe Disable Guarantee...")
        inventory_el = page.locator('text=Registered Devices Inventory')
        if await inventory_el.count() > 0:
            await inventory_el.scroll_into_view_if_needed()
            await page.wait_for_timeout(800)

        shot4 = os.path.join(ARTIFACT_DIR, "04_device_binding_inventory_and_safe_disable.png")
        await page.screenshot(path=shot4, full_page=False)
        print(f"[SUCCESS] Captured Inventory & Safe Disable: {shot4}")

        await browser.close()
        print("[DONE] All visual evidence screenshots captured.")


if __name__ == "__main__":
    asyncio.run(main())
