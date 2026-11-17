# /**
#  * @file        capture_live_showcase_v2.py
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
#  * @description Visual showcase capture script validating true adaptive dual-mode sidebar in Light and Dark modes.
#  */

import os
import asyncio
from playwright.async_api import async_playwright

ARTIFACT_DIR = r"C:\Users\netma\.gemini\antigravity\brain\22905f1c-8cd0-4587-bdca-ae672361b8c4"
os.makedirs(ARTIFACT_DIR, exist_ok=True)

async def capture_showcase():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1440, "height": 960})
        page = await context.new_page()

        # 1. Login Page
        print("[1/5] Capturing Login Page...")
        await page.goto("http://localhost:80/login")
        await page.wait_for_timeout(1500)
        login_img = os.path.join(ARTIFACT_DIR, "01_login_enterprise_wave.png")
        await page.screenshot(path=login_img, full_page=False)
        print(f"Saved: {login_img}")

        # Perform Login
        print("Logging in with admin@prathamone.com / Admin@2026!...")
        await page.fill("input[name='username']", "admin@prathamone.com")
        await page.fill("input[type='password']", "Admin@2026!")
        await page.click("button[type='submit']")
        await page.wait_for_timeout(3500)
        print("Navigated to:", page.url)

        # Force Light Mode explicitly first
        await page.evaluate("""() => {
            document.documentElement.classList.remove('dark');
            document.documentElement.dataset.theme = 'light';
            try {
                const raw = localStorage.getItem('pratham-appearance') || '{}';
                const parsed = JSON.parse(raw);
                parsed.state = { ...(parsed.state || {}), preference: 'light' };
                localStorage.setItem('pratham-appearance', JSON.stringify(parsed));
            } catch(e) {}
        }""")
        await page.wait_for_timeout(1000)

        # 2. Main Executive Dashboard - Light Mode (With New Adaptive Light Sidebar!)
        print("[2/5] Capturing Executive Dashboard (Light Mode with Light Sidebar)...")
        dash_light_img = os.path.join(ARTIFACT_DIR, "02_dashboard_modern_light.png")
        await page.screenshot(path=dash_light_img, full_page=False)
        print(f"Saved: {dash_light_img}")

        # 3. Sidebar Appearance Controls Detail in Light Mode
        print("[3/5] Capturing Light Sidebar...")
        sidebar_el = page.locator("aside#app-sidebar")
        sidebar_img = os.path.join(ARTIFACT_DIR, "03_sidebar_navigation_light.png")
        if await sidebar_el.count() > 0:
            await sidebar_el.screenshot(path=sidebar_img)
            print(f"Saved: {sidebar_img}")

        # 4. Toggle to Dark Mode
        print("[4/5] Toggling Dark Mode...")
        await page.evaluate("""() => {
            document.documentElement.classList.add('dark');
            document.documentElement.dataset.theme = 'dark';
            try {
                const raw = localStorage.getItem('pratham-appearance') || '{}';
                const parsed = JSON.parse(raw);
                parsed.state = { ...(parsed.state || {}), preference: 'dark' };
                localStorage.setItem('pratham-appearance', JSON.stringify(parsed));
            } catch(e) {}
        }""")
        await page.wait_for_timeout(1500)

        dash_dark_img = os.path.join(ARTIFACT_DIR, "04_dashboard_modern_dark.png")
        await page.screenshot(path=dash_dark_img, full_page=False)
        print(f"Saved: {dash_dark_img}")

        # 5. Settings / Theme & Appearance Page in Dark Mode
        print("[5/5] Capturing Settings & Appearance in Dark Mode...")
        await page.goto("http://localhost:80/settings")
        await page.wait_for_timeout(2500)
        # Ensure dark mode retained
        await page.evaluate("() => { document.documentElement.classList.add('dark'); document.documentElement.dataset.theme = 'dark'; }")
        await page.wait_for_timeout(1000)
        settings_dark_img = os.path.join(ARTIFACT_DIR, "05_settings_appearance_dark.png")
        await page.screenshot(path=settings_dark_img, full_page=False)
        print(f"Saved: {settings_dark_img}")

        await browser.close()
        print("Showcase capture complete!")

if __name__ == "__main__":
    asyncio.run(capture_showcase())
