# /**
#  * @file        capture_all_login_background_modes.py
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
#  * @updated     2026-11-11
#  *
#  * @description Capture all 4 background modes of the Login Canvas Engine and the Settings control panel overlay.
#  */

import os
import json
import time
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\netma\.gemini\antigravity\brain\f0e72778-27df-4928-92a5-dc51f7834a6e"
FRONTEND_URL = "http://localhost:5173"

def set_branding(page, bg_config):
    payload = {
        "academyName": "Prashant Academy",
        "tagline": "Excellence in Coaching & Mentorship",
        "monogram": "PA",
        "background": bg_config
    }
    page.evaluate(f"""() => {{
        const payload = {json.dumps(payload)};
        localStorage.setItem('pratham_active_branding', JSON.stringify(payload));
        localStorage.setItem('pratham_branding_inst_1', JSON.stringify(payload));
    }}""")

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1920, "height": 1080})
        page = context.new_page()

        # 1. Mode: Dynamic Waves (Brand Aurora Glow)
        print("Capturing Mode 1: Dynamic Waves...")
        page.goto(f"{FRONTEND_URL}/login")
        set_branding(page, {
            "mode": "waves",
            "overlayOpacity": 60,
            "blur": 4
        })
        page.reload()
        page.wait_for_timeout(2500)
        page.screenshot(path=os.path.join(ARTIFACT_DIR, "screenshot_login_mode1_dynamic_waves.png"))

        # 2. Mode: Custom Campus Image with Glassmorphism
        print("Capturing Mode 2: Custom Campus Image...")
        set_branding(page, {
            "mode": "image",
            "imageUrl": "https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=1920&q=80",
            "fit": "cover",
            "overlayOpacity": 55,
            "blur": 4
        })
        page.reload()
        page.wait_for_timeout(2500)
        page.screenshot(path=os.path.join(ARTIFACT_DIR, "screenshot_login_mode2_custom_image.png"))

        # 3. Mode: Educational SVG Pattern (Blueprint)
        print("Capturing Mode 3: SVG Blueprint Pattern...")
        set_branding(page, {
            "mode": "svg_pattern",
            "pattern": "blueprint",
            "overlayOpacity": 50,
            "blur": 0
        })
        page.reload()
        page.wait_for_timeout(2500)
        page.screenshot(path=os.path.join(ARTIFACT_DIR, "screenshot_login_mode3_svg_pattern.png"))

        # 4. Settings Control Panel Overlay
        print("Capturing Settings Canvas & Background Engine Control Overlay...")
        page.goto(f"{FRONTEND_URL}/login")
        page.fill('input[name="username"]', "admin@example.com")
        page.fill('input[name="password"]', "admin123")
        page.click('button[type="submit"]')
        page.wait_for_timeout(3000)

        page.goto(f"{FRONTEND_URL}/settings?tab=branding")
        page.wait_for_timeout(2500)
        # Scroll to Canvas Engine
        canvas_section = page.locator('text=Login Page Canvas & Background Engine')
        if canvas_section.count() > 0:
            canvas_section.scroll_into_view_if_needed()
            page.wait_for_timeout(1000)
            page.screenshot(path=os.path.join(ARTIFACT_DIR, "screenshot_canvas_engine_settings_panel.png"))
            print("Captured Canvas Engine Settings Panel!")

        browser.close()
        print("All visual evidence captured successfully.")

if __name__ == "__main__":
    main()
