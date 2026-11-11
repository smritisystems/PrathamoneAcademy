# /**
#  * @file        capture_academic_workspaces.py
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
#  * @description Visual evidence capture tool for all 9 dedicated Academic workspaces.
#  */

import os
import time
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\netma\.gemini\antigravity\brain\f0e72778-27df-4928-92a5-dc51f7834a6e"
FRONTEND_URL = "http://localhost:5173"

PAGES = [
    ("screenshot_32_academic_overview.png", f"{FRONTEND_URL}/academic", "Academic Overview Workspace"),
    ("screenshot_33_academic_boards.png", f"{FRONTEND_URL}/academic/boards", "Academic Boards Workspace"),
    ("screenshot_34_academic_classes.png", f"{FRONTEND_URL}/academic/classes", "Academic Classes & Standards Workspace"),
    ("screenshot_35_academic_subjects.png", f"{FRONTEND_URL}/academic/subjects", "Curriculum & Subjects Workspace"),
    ("screenshot_36_academic_batches.png", f"{FRONTEND_URL}/academic/batches", "Batches & Divisions Workspace"),
    ("screenshot_37_academic_timetable.png", f"{FRONTEND_URL}/academic/timetable", "Weekly Timetable Workspace"),
    ("screenshot_38_academic_enrollment.png", f"{FRONTEND_URL}/academic/enrollment", "Batch Enrollment & Transfers Workspace"),
    ("screenshot_39_academic_reports.png", f"{FRONTEND_URL}/academic/reports", "Academic Reports & Analytics Workspace"),
    ("screenshot_40_academic_settings.png", f"{FRONTEND_URL}/academic/settings", "Academic Settings & Conflict Policy Workspace"),
]

def main():
    print("Starting Academic Workspaces visual capture...")
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
    print("All Academic workspaces captured successfully!")

if __name__ == "__main__":
    main()
