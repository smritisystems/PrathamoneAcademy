# /**
#  * @file        verify_releases_ui.py
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
#  * @updated     2026-11-11
#  *
#  * @description Automated visual verification script for Release Management UI.
#  */

import asyncio
from playwright.async_api import async_playwright

async def check_releases():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 1440, "height": 900})
        
        await page.goto("http://localhost/login")
        await page.wait_for_timeout(1000)
        await page.fill("input[name='username']", "admin@example.com")
        await page.fill("input[name='password']", "admin123")
        await page.click("button[type='submit']")
        await page.wait_for_timeout(2000)
        
        print("Navigating to /releases...")
        resp = await page.goto("http://localhost/releases")
        await page.wait_for_timeout(3000)
        print("Releases HTTP status:", resp.status)
        await page.screenshot(path="C:/Users/netma/.gemini/antigravity/brain/f0e72778-27df-4928-92a5-dc51f7834a6e/live_releases_screen_now.png", full_page=True)
        
        # Check active version card
        active_version_badge = await page.locator("text=ACTIVE VERSION").locator("..").inner_text()
        print("=== ACTIVE VERSION BADGE ===\n", active_version_badge)
        
        # Check pending pipeline
        pending = await page.locator("text=Pending Repository Changes").locator("..").inner_text()
        print("=== PENDING PIPELINE ===\n", pending)

        # Check footer
        footer_el = page.locator("div.fixed.bottom-0")
        if await footer_el.count() > 0:
            print("=== BOTTOM FOOTER ===\n", await footer_el.first.inner_text())
        else:
            print("=== BOTTOM FOOTER === Not found")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(check_releases())
