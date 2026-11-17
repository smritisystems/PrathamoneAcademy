# /**
#  * @file        capture_dark_audit.py
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
#  * @description Dark mode audit: captures screenshots across all major pages to identify text/bg contrast issues.
#  */

import os
import asyncio
from playwright.async_api import async_playwright

ARTIFACT_DIR = r"C:\Users\netma\.gemini\antigravity\brain\22905f1c-8cd0-4587-bdca-ae672361b8c4\dark_audit"
os.makedirs(ARTIFACT_DIR, exist_ok=True)

PAGES = [
    ("dashboard",        "/dashboard",           "dark_01_dashboard.png"),
    ("students",         "/students",            "dark_02_students.png"),
    ("teachers",         "/teachers",            "dark_03_teachers.png"),
    ("fees",             "/fees",                "dark_04_fees.png"),
    ("attendance",       "/attendance",          "dark_05_attendance.png"),
    ("examinations",     "/examinations",        "dark_06_examinations.png"),
    ("reports",          "/reports",             "dark_07_reports.png"),
    ("settings",         "/settings",            "dark_08_settings.png"),
    ("communication",    "/communication",       "dark_09_communication.png"),
    ("payroll",          "/payroll",             "dark_10_payroll.png"),
]

async def capture_audit():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1440, "height": 900})
        page = await context.new_page()

        # Login
        print("Logging in...")
        await page.goto("http://localhost:80/login")
        await page.wait_for_timeout(1500)
        await page.fill("input[name='username']", "admin@prathamone.com")
        await page.fill("input[type='password']", "Admin@2026!")
        await page.click("button[type='submit']")
        await page.wait_for_timeout(3500)
        print("Logged in. URL:", page.url)

        # Enable Dark Mode — set Zustand store in localStorage so React hydrates correctly
        await page.evaluate("""() => {
            const stored = JSON.parse(localStorage.getItem('pratham-appearance') || '{"state":{},"version":1}');
            stored.state = { preference: 'dark' };
            localStorage.setItem('pratham-appearance', JSON.stringify(stored));
            document.documentElement.classList.add('dark');
        }""")
        await page.reload()
        await page.wait_for_timeout(2500)
        print("Dark mode enabled (store + DOM).")

        # Capture each page
        for name, path, filename in PAGES:
            print(f"Navigating to {path}...")
            await page.goto(f"http://localhost:80{path}")
            await page.wait_for_timeout(2200)
            # Re-enforce dark mode after navigation (store persists, but add class safety)
            await page.evaluate("""() => {
                document.documentElement.classList.add('dark');
            }""")
            await page.wait_for_timeout(400)
            out = os.path.join(ARTIFACT_DIR, filename)
            await page.screenshot(path=out, full_page=False)
            print(f"  Saved: {out}")

        await browser.close()
        print("\nDark mode audit capture complete!")

asyncio.run(capture_audit())
