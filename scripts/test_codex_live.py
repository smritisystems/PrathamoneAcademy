# /**
#  * @file        test_codex_live.py
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
#  * @updated     2026-11-14
#  *
#  * @description Automated visual and API verification script for CodeX Studio and dashboard endpoints.
#  */

import asyncio
import os
from playwright.async_api import async_playwright

async def test_codex_page():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 1440, "height": 900})
        
        errors = []
        page.on("console", lambda msg: errors.append(f"[{msg.type}] {msg.text}") if msg.type in ("error", "warning") else None)
        page.on("pageerror", lambda err: errors.append(f"[pageerror] {err}"))
        
        await page.goto("http://localhost/login")
        await page.wait_for_timeout(1000)
        await page.fill("input[name='username']", "admin@example.com")
        await page.fill("input[name='password']", os.environ["TEST_ADMIN_PASSWORD"])
        await page.click("button[type='submit']")
        await page.wait_for_timeout(2000)
        
        # 1. Test Dashboard
        print("Testing /dashboard...")
        dash_resp = await page.goto("http://localhost/dashboard")
        await page.wait_for_timeout(3000)
        print("  Dashboard HTTP Status:", dash_resp.status)
        await page.screenshot(path="C:/Users/netma/.gemini/antigravity/brain/f0e72778-27df-4928-92a5-dc51f7834a6e/live_dashboard_verified.png", full_page=True)
        
        # 2. Test CodeX
        print("Testing /codex...")
        codex_resp = await page.goto("http://localhost/codex")
        await page.wait_for_timeout(3000)
        print("  CodeX HTTP Status:", codex_resp.status)
        await page.screenshot(path="C:/Users/netma/.gemini/antigravity/brain/f0e72778-27df-4928-92a5-dc51f7834a6e/live_codex_studio.png", full_page=True)
        
        print("\n--- Console Summary ---")
        print(f"Total error/warning events: {len(errors)}")
        for e in errors[:10]:
            print(" ", e[:180])
            
        await browser.close()

if __name__ == "__main__":
    asyncio.run(test_codex_page())

