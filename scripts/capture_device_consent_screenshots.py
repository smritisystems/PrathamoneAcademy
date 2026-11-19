# /**
#  * @file        capture_device_consent_screenshots.py
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
#  * @description Visual verification capture script for Login Device Name Customization, DPDP Act 2023 Consent, and Authorization Modal.
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
        await page.wait_for_timeout(1500)

        # 1. Capture Login Page with Device Security Badge
        print("[2] Capturing Login Page with Device Security Badge...")
        shot16 = os.path.join(ARTIFACT_DIR, "16_login_device_consent_badge.png")
        await page.screenshot(path=shot16, full_page=False)
        print(f"[SUCCESS] Captured Login Badge: {shot16}")

        # 2. Click "Review Device Name" button to open Consent Modal
        print("[3] Clicking 'Review Device Name' to trigger Consent Modal...")
        review_btn = page.locator('button:has-text("Review Device Name")')
        if await review_btn.count() > 0:
            await review_btn.first.click()
            await page.wait_for_timeout(800)

        # 3. Capture Device Registration & Consent Modal (DPDP Act 2023)
        print("[4] Capturing Device Registration & Consent Modal...")
        shot17 = os.path.join(ARTIFACT_DIR, "17_device_registration_consent_modal.png")
        await page.screenshot(path=shot17, full_page=False)
        print(f"[SUCCESS] Captured Consent Modal: {shot17}")

        await browser.close()
        print("[DONE] All device consent screenshots captured.")


if __name__ == "__main__":
    asyncio.run(main())
