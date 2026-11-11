# /**
#  * @file        showcase_background_modes.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      00_PRODUCT_OVERVIEW
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
#  * @description Comprehensive showcase capturing screenshots for all Login Canvas Background Modes and Overlay Controls.
#  */

import os
import time
import subprocess
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\netma\.gemini\antigravity\brain\f0e72778-27df-4928-92a5-dc51f7834a6e"
FRONTEND_URL = "http://localhost:5173"

def set_db_background(mode, image_url="", fit="cover", overlay_opacity="60", blur="4", pattern="blueprint", video_type="youtube", video_url="https://youtu.be/9vfhRWq9osE?si=Hf0Jk8"):
    sql = f"""
    INSERT INTO institution_settings (institution_id, category, key, value, created_at, updated_at)
    VALUES 
        (1, 'branding', 'login_bg_mode', '{mode}', NOW(), NOW()),
        (1, 'branding', 'login_bg_image_url', '{image_url}', NOW(), NOW()),
        (1, 'branding', 'login_bg_fit', '{fit}', NOW(), NOW()),
        (1, 'branding', 'login_bg_overlay_opacity', '{overlay_opacity}', NOW(), NOW()),
        (1, 'branding', 'login_bg_blur', '{blur}', NOW(), NOW()),
        (1, 'branding', 'login_bg_pattern', '{pattern}', NOW(), NOW()),
        (1, 'branding', 'login_bg_video_type', '{video_type}', NOW(), NOW()),
        (1, 'branding', 'login_bg_video_url', '{video_url}', NOW(), NOW())
    ON CONFLICT (institution_id, key) DO UPDATE 
    SET value = EXCLUDED.value, category = EXCLUDED.category, updated_at = NOW();
    """
    cmd = ["docker", "exec", "-i", "prashant_academy_db", "psql", "-U", "postgres", "-d", "prashant_academy"]
    subprocess.run(cmd, input=sql, text=True, check=True)
    time.sleep(0.5)

def main():
    print("Starting Background Modes & Overlay Showcase capture...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1920, "height": 1080})
        page = context.new_page()

        # -------------------------------------------------------------
        # 1. Login to Settings
        # -------------------------------------------------------------
        print("Navigating to login to access Settings...")
        page.goto(f"{FRONTEND_URL}/login")
        page.wait_for_selector('input[name="username"]', timeout=10000)
        
        page.fill('input[name="username"]', "admin@example.com")
        page.fill('input[name="password"]', "admin123")
        page.click('button[type="submit"]')
        page.wait_for_timeout(3000)

        print("Opening Settings...")
        page.goto(f"{FRONTEND_URL}/settings")
        page.wait_for_selector("text=Institute Settings", timeout=15000)
        page.wait_for_timeout(1000)

        print("Switching to Branding & Appearance category...")
        page.click("button:has-text('Branding & Appearance')")
        page.wait_for_selector("text=Login Page Canvas & Background Engine", timeout=10000)
        page.wait_for_timeout(1000)

        print("Enabling Scoped Edit Mode...")
        edit_btn = page.locator("button:has-text('Enable Edit Mode')")
        if edit_btn.count() > 0:
            edit_btn.click()
            page.wait_for_timeout(1000)

        # Scroll to Login Page Canvas & Background Engine card
        canvas_card = page.locator("div:has(> div > div > h3:has-text('Login Page Canvas & Background Engine'))").first
        canvas_heading = page.locator("text=Login Page Canvas & Background Engine")
        canvas_heading.scroll_into_view_if_needed()
        page.wait_for_timeout(800)

        # 1A. Ambient Video with Overlay Sliders in Settings
        print("Capturing Ambient Video settings with overlay sliders...")
        video_btn = page.locator("button:has-text('Ambient Video')")
        if video_btn.count() > 0:
            video_btn.click(force=True)
            page.wait_for_timeout(800)
        canvas_heading.scroll_into_view_if_needed()
        path_video_settings = os.path.join(ARTIFACT_DIR, "screenshot_15_settings_ambient_video_overlay_sliders.png")
        page.screenshot(path=path_video_settings)
        print(f"Captured: {path_video_settings}")

        # 1B. Custom Image mode in Settings
        print("Capturing Custom Image settings...")
        img_btn = page.locator("button:has-text('Custom Image')")
        if img_btn.count() > 0:
            img_btn.click(force=True)
            page.wait_for_timeout(800)
        canvas_heading.scroll_into_view_if_needed()
        path_image_settings = os.path.join(ARTIFACT_DIR, "screenshot_16_settings_custom_image_controls.png")
        page.screenshot(path=path_image_settings)
        print(f"Captured: {path_image_settings}")

        # 1C. SVG Pattern mode in Settings
        print("Capturing SVG Pattern settings...")
        svg_btn = page.locator("button:has-text('SVG Pattern')")
        if svg_btn.count() > 0:
            svg_btn.click(force=True)
            page.wait_for_timeout(800)
        canvas_heading.scroll_into_view_if_needed()
        path_svg_settings = os.path.join(ARTIFACT_DIR, "screenshot_17_settings_svg_pattern_controls.png")
        page.screenshot(path=path_svg_settings)
        print(f"Captured: {path_svg_settings}")

        # 1D. Dynamic Waves mode in Settings
        print("Capturing Dynamic Waves settings...")
        waves_btn = page.locator("button:has-text('Dynamic Waves')")
        if waves_btn.count() > 0:
            waves_btn.click(force=True)
            page.wait_for_timeout(800)
        canvas_heading.scroll_into_view_if_needed()
        path_waves_settings = os.path.join(ARTIFACT_DIR, "screenshot_18_settings_dynamic_waves_controls.png")
        page.screenshot(path=path_waves_settings)
        print(f"Captured: {path_waves_settings}")

        context.close()

        # -------------------------------------------------------------
        # 2. Capture Login Screen for All Background Modes
        # -------------------------------------------------------------

        # 2A: Mode: Dynamic Waves (Brand Aurora Mesh)
        print("\nTesting Login Mode: Dynamic Waves...")
        set_db_background(mode="waves")
        ctx = browser.new_context(viewport={"width": 1920, "height": 1080})
        login_page = ctx.new_page()
        # Force clear any cached localStorage branding in browser context
        login_page.goto(f"{FRONTEND_URL}/login")
        login_page.evaluate("() => localStorage.clear()")
        login_page.reload()
        login_page.wait_for_selector('input[name="username"]', timeout=10000)
        login_page.wait_for_timeout(2500)
        path_login_waves = os.path.join(ARTIFACT_DIR, "screenshot_19_login_dynamic_waves_maroon.png")
        login_page.screenshot(path=path_login_waves)
        print(f"Captured: {path_login_waves}")
        ctx.close()

        # 2B: Mode: Custom Campus Image (with 50% overlay and 2px blur)
        print("\nTesting Login Mode: Custom Campus Image...")
        campus_img = "https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=1920&q=80"
        set_db_background(mode="image", image_url=campus_img, fit="cover", overlay_opacity="50", blur="2")
        ctx = browser.new_context(viewport={"width": 1920, "height": 1080})
        login_page = ctx.new_page()
        login_page.goto(f"{FRONTEND_URL}/login")
        login_page.evaluate("() => localStorage.clear()")
        login_page.reload()
        login_page.wait_for_selector('input[name="username"]', timeout=10000)
        login_page.wait_for_timeout(3500) # wait for image download
        path_login_image = os.path.join(ARTIFACT_DIR, "screenshot_20_login_custom_campus_image.png")
        login_page.screenshot(path=path_login_image)
        print(f"Captured: {path_login_image}")
        ctx.close()

        # 2C: Mode: SVG Pattern (Architectural Blueprint)
        print("\nTesting Login Mode: SVG Pattern...")
        set_db_background(mode="svg_pattern", pattern="blueprint")
        ctx = browser.new_context(viewport={"width": 1920, "height": 1080})
        login_page = ctx.new_page()
        login_page.goto(f"{FRONTEND_URL}/login")
        login_page.evaluate("() => localStorage.clear()")
        login_page.reload()
        login_page.wait_for_selector('input[name="username"]', timeout=10000)
        login_page.wait_for_timeout(2500)
        path_login_svg = os.path.join(ARTIFACT_DIR, "screenshot_21_login_svg_blueprint.png")
        login_page.screenshot(path=path_login_svg)
        print(f"Captured: {path_login_svg}")
        ctx.close()

        # 2D: Restore and capture Ambient Video Mode (YouTube) with controlled overlay
        print("\nRestoring and verifying Ambient Video Mode...")
        set_db_background(mode="video", video_type="youtube", video_url="https://youtu.be/9vfhRWq9osE?si=Hf0Jk8", overlay_opacity="40", blur="0")
        ctx = browser.new_context(viewport={"width": 1920, "height": 1080})
        login_page = ctx.new_page()
        login_page.goto(f"{FRONTEND_URL}/login")
        login_page.evaluate("() => localStorage.clear()")
        login_page.reload()
        login_page.wait_for_selector('input[name="username"]', timeout=10000)
        login_page.wait_for_timeout(4000) # wait for iframe embed
        path_login_video = os.path.join(ARTIFACT_DIR, "screenshot_22_login_ambient_video_active.png")
        login_page.screenshot(path=path_login_video)
        print(f"Captured: {path_login_video}")
        ctx.close()

        browser.close()

    print("\nAll background showcase screenshots captured successfully!")

if __name__ == "__main__":
    main()
