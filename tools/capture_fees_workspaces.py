# /**
#  * @file        capture_fees_workspaces.py
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
#  * @description Visual evidence capture tool for all 8 dedicated Fees & Payments workspaces.
#  */

import os
import time
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\netma\.gemini\antigravity\brain\f0e72778-27df-4928-92a5-dc51f7834a6e"
FRONTEND_URL = "http://localhost:5173"

PAGES = [
    ("screenshot_112_fees_overview.png", f"{FRONTEND_URL}/fees/overview", "Fees & Payments Overview & Analytics Dashboard"),
    ("screenshot_113_fees_structures.png", f"{FRONTEND_URL}/fees/structures", "Fee Structures, Slabs & Policies Workspace"),
    ("screenshot_114_fees_invoicing.png", f"{FRONTEND_URL}/fees/invoicing", "Student Fee Invoicing & Master Register Workspace"),
    ("screenshot_115_fees_collection.png", f"{FRONTEND_URL}/fees/collection", "Fee Collection Desk & Cash Counter POS Terminal"),
    ("screenshot_116_fees_defaulters.png", f"{FRONTEND_URL}/fees/defaulters", "Fee Defaulters & Overdue Aging Analysis Workspace"),
    ("screenshot_117_fees_concessions.png", f"{FRONTEND_URL}/fees/concessions", "Fee Concessions & Scholarship Waivers Workspace"),
    ("screenshot_118_fees_online_gateway.png", f"{FRONTEND_URL}/fees/online-gateway", "Online Payments & Instant BharatQR Gateway Desk"),
    ("screenshot_119_fees_reports.png", f"{FRONTEND_URL}/fees/reports", "Financial Daybook & Fee Analytics Reports Workspace"),
]

def main():
    print("Starting Fees & Payments Workspaces visual capture...")
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
        print("Visual capture for all 8 Fees & Payments workspaces completed!")

if __name__ == "__main__":
    main()
