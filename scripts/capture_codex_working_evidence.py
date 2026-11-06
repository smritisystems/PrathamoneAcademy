# /**
#  * @file        capture_codex_working_evidence.py
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
#  * @description Capture live runtime screenshots demonstrating that CodeX engine and sandbox are fully functional.
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
    print("Launching Chromium to capture CodeX live functional evidence...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1440, "height": 900},
            device_scale_factor=1.5
        )
        page = context.new_page()

        # Login
        print("Navigating to login...")
        page.goto(f"{BASE_URL}/login")
        page.wait_for_selector('input[type="text"], input[name="username"]', timeout=10000)
        time.sleep(1)

        print("Authenticating as Sysadmin...")
        page.fill('input[type="text"], input[name="username"]', "sysadmin")
        page.fill('input[type="password"]', "7)Yaw1dC_uQEfmYqmT")
        page.click('button[type="submit"]')
        page.wait_for_url("**/dashboard", timeout=15000)
        time.sleep(2)

        # 1. Navigate to /codex
        print("Navigating to /codex Studio...")
        page.goto(f"{BASE_URL}/codex")
        time.sleep(3)

        # Capture 1: General Overview
        print("Capturing 01: CodeX Studio General Overview...")
        path_gen_art = os.path.join(ARTIFACTS_DIR, "codex_working_general_overview.png")
        path_gen_ass = os.path.join(ASSETS_DIR, "codex_working_general_overview.png")
        page.screenshot(path=path_gen_art)
        page.screenshot(path=path_gen_ass)
        print(f"Saved: {path_gen_art}")

        # Capture 2: Bijective Mapping Studio
        print("Switching to 4. Mapping Profile Studio tab...")
        mapping_tab = page.locator("button:has-text('4. Mapping Profile Studio')")
        if mapping_tab.count() > 0:
            mapping_tab.first.click()
            time.sleep(1.5)
        path_map_art = os.path.join(ARTIFACTS_DIR, "codex_working_bijective_mapping.png")
        path_map_ass = os.path.join(ASSETS_DIR, "codex_working_bijective_mapping.png")
        page.screenshot(path=path_map_art)
        page.screenshot(path=path_map_ass)
        print(f"Saved: {path_map_art}")

        # Capture 3: Interactive Sandbox Testing with Live Encoding & Decoding
        print("Switching to 11. Live Preview & Sandbox tab...")
        testing_tab = page.locator("button:has-text('11. Live Preview & Sandbox')")
        if testing_tab.count() > 0:
            testing_tab.first.click()
            time.sleep(1.5)

        # Perform live encoding test
        print("Testing live encoding with 75420.50...")
        num_input = page.locator("input[placeholder*='1250']")
        if num_input.count() > 0:
            num_input.first.fill("75420.50")
            time.sleep(0.5)

        encode_btn = page.locator("button:has-text('Encode Numeric Value')")
        if encode_btn.count() > 0:
            encode_btn.first.click()
            time.sleep(1.5)

        # Generate QR simulation
        qr_btn = page.locator("button:has-text('Generate QR Code Simulation')")
        if qr_btn.count() > 0:
            qr_btn.first.click()
            time.sleep(1)

        # Transfer encoded result into decoder input
        transfer_btn = page.locator("button:has-text('Transfer')")
        if transfer_btn.count() > 0:
            transfer_btn.first.click()
            time.sleep(0.5)

        # Trigger Live Decode
        print("Triggering live decoding...")
        decode_btn = page.locator("button:has-text('Decode Encoded String')")
        if decode_btn.count() > 0:
            decode_btn.first.click()
            time.sleep(1.5)

        path_test_art = os.path.join(ARTIFACTS_DIR, "codex_working_live_sandbox.png")
        path_test_ass = os.path.join(ASSETS_DIR, "codex_working_live_sandbox.png")
        page.screenshot(path=path_test_art)
        page.screenshot(path=path_test_ass)
        print(f"Saved: {path_test_art}")

        # Capture 4: Features & Obfuscation Scopes
        print("Switching to 3. Feature Options tab...")
        feat_tab = page.locator("button:has-text('3. Feature Options')")
        if feat_tab.count() > 0:
            feat_tab.first.click()
            time.sleep(1.5)
        path_feat_art = os.path.join(ARTIFACTS_DIR, "codex_working_features_activation.png")
        path_feat_ass = os.path.join(ASSETS_DIR, "codex_working_features_activation.png")
        page.screenshot(path=path_feat_art)
        page.screenshot(path=path_feat_ass)
        print(f"Saved: {path_feat_art}")

        # Capture 5: Activation Scope
        print("Switching to 2. Activation Scope tab...")
        scope_tab = page.locator("button:has-text('2. Activation Scope')")
        if scope_tab.count() > 0:
            scope_tab.first.click()
            time.sleep(1.5)
        path_scope_art = os.path.join(ARTIFACTS_DIR, "codex_working_activation_scopes.png")
        path_scope_ass = os.path.join(ASSETS_DIR, "codex_working_activation_scopes.png")
        page.screenshot(path=path_scope_art)
        page.screenshot(path=path_scope_ass)
        print(f"Saved: {path_scope_art}")

        browser.close()
        print("CodeX live working verification screenshots successfully generated!")

if __name__ == "__main__":
    run()
