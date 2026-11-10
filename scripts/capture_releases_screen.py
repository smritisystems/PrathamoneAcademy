# /**
#  * @file        capture_releases_screen.py
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
#  * @description Visual capture verification script for Release & Change Governance dashboard.
#  */

import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 1440, "height": 900})
        await page.goto("http://localhost/login")
        await page.wait_for_timeout(1000)
        await page.fill("input[name='username']", "admin@prashantacademy.edu.in")
        await page.fill("input[type='password']", "admin123")
        await page.click("button[type='submit']")
        await page.wait_for_timeout(2000)
        
        await page.goto("http://localhost/releases")
        await page.wait_for_timeout(3000)
        
        # 1. Main Dashboard
        out_path = "C:/Users/netma/.gemini/antigravity/brain/f0e72778-27df-4928-92a5-dc51f7834a6e/live_releases_dashboard.png"
        await page.screenshot(path=out_path, full_page=True)
        print("Captured main dashboard:", out_path)

        # 2. Click 'Current Release Notes (GA)'
        await page.click("button:has-text('Current Release Notes')")
        await page.wait_for_timeout(1000)
        out_notes = "C:/Users/netma/.gemini/antigravity/brain/f0e72778-27df-4928-92a5-dc51f7834a6e/live_releases_notes.png"
        await page.screenshot(path=out_notes, full_page=True)
        print("Captured release notes:", out_notes)

        # 3. Click 'Release History'
        await page.click("button:has-text('Release History')")
        await page.wait_for_timeout(1000)
        out_history = "C:/Users/netma/.gemini/antigravity/brain/f0e72778-27df-4928-92a5-dc51f7834a6e/live_releases_history.png"
        await page.screenshot(path=out_history, full_page=True)
        print("Captured release history:", out_history)
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
