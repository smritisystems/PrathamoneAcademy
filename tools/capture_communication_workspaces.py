# /**
#  * @file        capture_communication_workspaces.py
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
#  * @created     2026-11-09
#  * @updated     2026-11-11
#  *
#  * @description Visual evidence capture tool for all 8 dedicated Communication Center workspaces.
#  */

import os
import time
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\netma\.gemini\antigravity\brain\f0e72778-27df-4928-92a5-dc51f7834a6e"
FRONTEND_URL = "http://localhost:5173"

PAGES = [
    ("screenshot_96_communication_overview.png", f"{FRONTEND_URL}/communication/overview", "Communication Overview & Multi-Channel Dispatch Hub"),
    ("screenshot_97_communication_broadcasts.png", f"{FRONTEND_URL}/communication/broadcasts", "Broadcast Composer & Recipient Selector Workspace"),
    ("screenshot_98_communication_whatsapp.png", f"{FRONTEND_URL}/communication/whatsapp", "WhatsApp Stream & Direct Web Chat Launcher Workspace"),
    ("screenshot_99_communication_templates.png", f"{FRONTEND_URL}/communication/templates", "Message Templates Catalogue & Regulatory Tag Editor Workspace"),
    ("screenshot_100_communication_history.png", f"{FRONTEND_URL}/communication/history", "Delivery History, Dispatch Logs & Audited Trail Workspace"),
    ("screenshot_101_communication_automations.png", f"{FRONTEND_URL}/communication/automations", "Reminder Queues & Overdue Fee Automations Workspace"),
    ("screenshot_102_communication_gateways.png", f"{FRONTEND_URL}/communication/gateways", "Gateway Diagnostics & Telecom Channel Health Workspace"),
    ("screenshot_103_communication_settings.png", f"{FRONTEND_URL}/communication/settings", "Channel Configuration & Regulatory Policies Workspace"),
]

def main():
    print("Starting Communication Center Workspaces visual capture...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1920, "height": 1080})
        page = context.new_page()

        # Login
        print("Logging in as admin...")
        page.goto(f"{FRONTEND_URL}/login")
        page.wait_for_selector('input[name="username"]', timeout=15000)
        page.fill('input[name="username"]', "admin@example.com")
        page.fill('input[name="password"]', "admin123")
        page.click('button[type="submit"]')
        page.wait_for_timeout(3500)

        for filename, url, desc in PAGES:
            print(f"Navigating to {desc} ({url})...")
            try:
                page.goto(url)
                page.wait_for_timeout(2500)
                out_path = os.path.join(ARTIFACT_DIR, filename)
                page.screenshot(path=out_path)
                print(f"Captured {filename} -> {out_path}")
            except Exception as e:
                print(f"Error capturing {desc}: {e}")

        browser.close()
        print("Visual capture for all 8 Communication Center workspaces completed!")

if __name__ == "__main__":
    main()
