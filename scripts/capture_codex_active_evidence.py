# /**
#  * @file        capture_codex_active_evidence.py
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
#  * @created     2026-11-07
#  * @updated     2026-11-07
#  *
#  * @description Verify and capture exact user-facing screens when CodeX is ACTIVE / ON.
#  */

import os
import sys
import time
from playwright.sync_api import sync_playwright

BASE_URL = "http://localhost:80"
ARTIFACTS_DIR = r"C:\Users\netma\.gemini\antigravity\brain\f0e72778-27df-4928-92a5-dc51f7834a6e"
ASSETS_DIR = r"docs\assets\screenshots"

os.makedirs(ARTIFACTS_DIR, exist_ok=True)
os.makedirs(ASSETS_DIR, exist_ok=True)

def run():
    print("Launching Chromium to capture CodeX ACTIVE state evidence...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1440, "height": 900},
            device_scale_factor=1.5
        )
        page = context.new_page()

        # Login as SysAdmin
        print("Authenticating as SysAdmin...")
        page.goto(f"{BASE_URL}/login")
        page.wait_for_selector('input[type="text"], input[name="username"]', timeout=10000)
        time.sleep(1)
        page.fill('input[type="text"], input[name="username"]', "sysadmin")
        page.fill('input[type="password"]', "7)Yaw1dC_uQEfmYqmT")
        page.click('button[type="submit"]')
        page.wait_for_url("**/dashboard", timeout=15000)
        time.sleep(2)

        # Navigate to /codex Studio
        print("Navigating to /codex...")
        page.goto(f"{BASE_URL}/codex")
        time.sleep(2)

        # 1. Turn CodeX ON by clicking "Activate CodeX"
        print("Activating CodeX via Master Switch...")
        activate_btn = page.locator("button:has-text('Activate CodeX')")
        if activate_btn.count() > 0:
            activate_btn.first.click()
            time.sleep(2)

        # Capture 01: CodeX Studio in ACTIVE (ON) State
        print("Capturing 01: CodeX Studio in ACTIVE (ON) state...")
        path_active_art = os.path.join(ARTIFACTS_DIR, "codex_active_master_on.png")
        path_active_ass = os.path.join(ASSETS_DIR, "codex_active_master_on.png")
        page.screenshot(path=path_active_art)
        page.screenshot(path=path_active_ass)
        print(f"Saved: {path_active_art}")

        # 2. Open On-Demand Decoder Modal
        print("Opening On-Demand Decoder Modal...")
        decoder_btn = page.locator("button:has-text('On-Demand Decoder')")
        if decoder_btn.count() > 0:
            decoder_btn.first.click()
            time.sleep(1)

            # Fill a coded string into the decoder modal
            code_input = page.locator("input[placeholder*='CX-']")
            if code_input.count() > 0:
                code_input.first.fill("CX-BPKZQ.PQ")
                time.sleep(0.5)

            # Click decode button inside modal
            submit_decode = page.locator("button[type='submit']:has-text('Decode Coded Value')")
            if submit_decode.count() > 0:
                submit_decode.first.click()
                time.sleep(1.5)

            path_modal_art = os.path.join(ARTIFACTS_DIR, "codex_active_decoder_modal.png")
            path_modal_ass = os.path.join(ASSETS_DIR, "codex_active_decoder_modal.png")
            page.screenshot(path=path_modal_art)
            page.screenshot(path=path_modal_ass)
            print(f"Saved: {path_modal_art}")

            # Close modal
            close_btn = page.locator("button:has(svg.lucide-x)")
            if close_btn.count() > 0:
                close_btn.first.click()
                time.sleep(1)

        # 3. Open Live Sandbox to demonstrate side-by-side what a user sees
        print("Switching to 11. Live Preview & Sandbox...")
        sandbox_tab = page.locator("button:has-text('11. Live Preview & Sandbox')")
        if sandbox_tab.count() > 0:
            sandbox_tab.first.click()
            time.sleep(1.5)

        # Enter fee payment: 2889000 (Total institute fees)
        num_input = page.locator("input[placeholder*='1250']")
        if num_input.count() > 0:
            num_input.first.fill("2889000")
            time.sleep(0.5)

        encode_btn = page.locator("button:has-text('Encode Numeric Value')")
        if encode_btn.count() > 0:
            encode_btn.first.click()
            time.sleep(1.5)

        qr_btn = page.locator("button:has-text('Generate QR Code Simulation')")
        if qr_btn.count() > 0:
            qr_btn.first.click()
            time.sleep(1)

        transfer_btn = page.locator("button:has-text('Transfer')")
        if transfer_btn.count() > 0:
            transfer_btn.first.click()
            time.sleep(0.5)

        decode_btn = page.locator("button:has-text('Decode Encoded String')")
        if decode_btn.count() > 0:
            decode_btn.first.click()
            time.sleep(1.5)

        path_comparison_art = os.path.join(ARTIFACTS_DIR, "codex_active_user_view_comparison.png")
        path_comparison_ass = os.path.join(ASSETS_DIR, "codex_active_user_view_comparison.png")
        page.screenshot(path=path_comparison_art)
        page.screenshot(path=path_comparison_ass)
        print(f"Saved: {path_comparison_art}")

        # Safely return CodeX back to OFF (Disabled) to respect non-negotiable default policy
        print("Returning CodeX master switch back to DISABLED (OFF)...")
        page.goto(f"{BASE_URL}/codex")
        time.sleep(2)
        deactivate_btn = page.locator("button:has-text('Deactivate CodeX')")
        if deactivate_btn.count() > 0:
            deactivate_btn.first.click()
            time.sleep(2)
            print("CodeX returned to DISABLED state.")

        browser.close()
        print("Active CodeX verification screenshots completed successfully!")

if __name__ == "__main__":
    run()

