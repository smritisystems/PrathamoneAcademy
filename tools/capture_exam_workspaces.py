# /**
#  * @file        capture_exam_workspaces.py
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
#  * @updated     2026-11-14
#  *
#  * @description Visual evidence capture tool for all 7 dedicated Examination Centre workspaces.
#  */

import os
import time
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\netma\.gemini\antigravity\brain\f0e72778-27df-4928-92a5-dc51f7834a6e"
FRONTEND_URL = "http://localhost:5173"

PAGES = [
    ("screenshot_49_examinations_overview.png", f"{FRONTEND_URL}/examinations/overview", "Examinations Overview Workspace"),
    ("screenshot_50_examinations_schedules.png", f"{FRONTEND_URL}/examinations/schedules", "Exam Schedules & Timetable Workspace"),
    ("screenshot_51_examinations_marks_entry.png", f"{FRONTEND_URL}/examinations/marks-entry", "Marks Entry Centre Workspace"),
    ("screenshot_52_examinations_analytics.png", f"{FRONTEND_URL}/examinations/analytics", "Exam Performance Analytics Workspace"),
    ("screenshot_53_examinations_report_cards.png", f"{FRONTEND_URL}/examinations/report-cards", "Report Cards & Transcripts Workspace"),
    ("screenshot_54_examinations_papers.png", f"{FRONTEND_URL}/examinations/papers", "Question Papers & Blueprints Workspace"),
    ("screenshot_55_examinations_settings.png", f"{FRONTEND_URL}/examinations/settings", "Examination Settings & Grading Scales Workspace"),
]

def main():
    print("Starting Examination Workspaces visual capture...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1920, "height": 1080})
        page = context.new_page()

        # Login
        print("Logging in as admin...")
        page.goto(f"{FRONTEND_URL}/login")
        page.wait_for_selector('input[name="username"]', timeout=15000)
        page.fill('input[name="username"]', "admin@example.com")
        page.fill('input[name="password"]', os.environ["TEST_ADMIN_PASSWORD"])
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
                print(f"Failed to capture {url}: {e}")

        browser.close()
        print("All Examination screenshots captured successfully.")

if __name__ == "__main__":
    main()
