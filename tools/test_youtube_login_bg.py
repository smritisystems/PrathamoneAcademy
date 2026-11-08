# /**
#  * @file        test_youtube_login_bg.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      tools
#  *
#  * @author      Jawahar R. Mallah
#  * @organization AITDL (AI Technology & Development Lab)
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 AITDL
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-08
#  * @updated     2026-11-08
#  *
#  * @description Test and capture visual evidence for Ambient YouTube Video Background on the Login Portal.
#  */

import os
import json
import time
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\netma\.gemini\antigravity\brain\f0e72778-27df-4928-92a5-dc51f7834a6e"
FRONTEND_URL = "http://localhost:5173"
YOUTUBE_URL = "https://youtu.be/9vfhRWq9osE?si=Hf5Q48Xq3o8t3N0y"

def main():
    print("Testing YouTube Background on Login Portal...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1920, "height": 1080})
        page = context.new_page()

        # Navigate to login
        page.goto(f"{FRONTEND_URL}/login")
        page.wait_for_load_state("networkidle")

        # Inject YouTube video branding into localStorage
        branding_payload = {
            "academyName": "Prashant Academy",
            "tagline": "Excellence in Coaching & Mentorship",
            "monogram": "PA",
            "background": {
                "mode": "video",
                "videoType": "youtube",
                "videoUrl": YOUTUBE_URL,
                "overlayOpacity": 30,
                "blur": 0
            }
        }

        page.evaluate(f"""() => {{
            const payload = {json.dumps(branding_payload)};
            localStorage.setItem('pratham_active_branding', JSON.stringify(payload));
            localStorage.setItem('pratham_branding_inst_1', JSON.stringify(payload));
        }}""")

        # Reload to activate the new branding
        page.reload()
        page.wait_for_timeout(5000)

        # Verify iframe exists
        iframe = page.locator('iframe[title="Login Background Video"]')
        is_visible = iframe.count() > 0
        src = iframe.get_attribute("src") if is_visible else "NOT_FOUND"

        print(f"YouTube Background Iframe Present: {is_visible}")
        print(f"Iframe Source: {src}")

        # Capture screenshot
        out_path = os.path.join(ARTIFACT_DIR, "screenshot_youtube_login_bg.png")
        page.screenshot(path=out_path)
        print(f"Captured screenshot to: {out_path}")

        browser.close()
        print("Test completed.")

if __name__ == "__main__":
    main()
