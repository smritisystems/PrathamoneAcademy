# /**
#  * @file        capture_crm_workspaces.py
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
#  * @description Visual evidence capture tool for all 9 dedicated CRM workspaces.
#  */

import os
import time
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\netma\.gemini\antigravity\brain\f0e72778-27df-4928-92a5-dc51f7834a6e"
FRONTEND_URL = "http://localhost:5173"

PAGES = [
    ("screenshot_23_crm_overview.png", f"{FRONTEND_URL}/leads/overview", "CRM Overview Dashboard"),
    ("screenshot_24_crm_lead_register.png", f"{FRONTEND_URL}/leads/all", "Lead Register Workspace"),
    ("screenshot_25_crm_lead_pipeline.png", f"{FRONTEND_URL}/leads/pipeline", "Lead Pipeline Kanban Workspace"),
    ("screenshot_26_crm_follow_up_centre.png", f"{FRONTEND_URL}/leads/follow-ups", "Follow-up Centre Workspace"),
    ("screenshot_27_crm_counselling_demo.png", f"{FRONTEND_URL}/leads/counselling", "Counselling & Demo Centre Workspace"),
    ("screenshot_28_crm_lead_sources.png", f"{FRONTEND_URL}/leads/sources", "Lead Sources Analytics Workspace"),
    ("screenshot_29_crm_campaigns.png", f"{FRONTEND_URL}/leads/campaigns", "Marketing Campaigns Workspace"),
    ("screenshot_30_crm_reports.png", f"{FRONTEND_URL}/leads/reports", "CRM Reports & Analytics Workspace"),
    ("screenshot_31_crm_settings.png", f"{FRONTEND_URL}/leads/settings", "CRM Configuration & Settings Workspace"),
]

def main():
    print("Starting CRM Workspaces visual capture...")
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
                page.wait_for_timeout(2000)
                out_path = os.path.join(ARTIFACT_DIR, filename)
                page.screenshot(path=out_path)
                print(f"[SUCCESS] Captured: {out_path}")
            except Exception as e:
                print(f"[ERROR] Failed {desc}: {e}")

        browser.close()
    print("All CRM workspaces captured successfully!")

if __name__ == "__main__":
    main()
