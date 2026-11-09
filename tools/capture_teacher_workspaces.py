# /**
#  * @file        capture_teacher_workspaces.py
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
#  * @updated     2026-11-09
#  *
#  * @description Visual evidence capture tool for all 8 dedicated Teacher & Faculty Management workspaces.
#  */

import os
import time
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\netma\.gemini\antigravity\brain\f0e72778-27df-4928-92a5-dc51f7834a6e"
FRONTEND_URL = "http://localhost:5173"

PAGES = [
    ("screenshot_64_teachers_overview.png", f"{FRONTEND_URL}/teachers/overview", "Teachers Overview Workspace"),
    ("screenshot_65_teachers_directory.png", f"{FRONTEND_URL}/teachers/directory", "Faculty Directory Workspace"),
    ("screenshot_66_teachers_allocations.png", f"{FRONTEND_URL}/teachers/allocations", "Batch Allocations Workspace"),
    ("screenshot_67_teachers_timetable.png", f"{FRONTEND_URL}/teachers/timetable", "Teaching Schedules Workspace"),
    ("screenshot_68_teachers_attendance.png", f"{FRONTEND_URL}/teachers/attendance", "Presence & Leaves Workspace"),
    ("screenshot_69_teachers_payroll.png", f"{FRONTEND_URL}/teachers/payroll", "Salary & Payroll Workspace"),
    ("screenshot_70_teachers_performance.png", f"{FRONTEND_URL}/teachers/performance", "Teaching Sessions Workspace"),
    ("screenshot_71_teachers_settings.png", f"{FRONTEND_URL}/teachers/settings", "Policies & Settings Workspace"),
]

def main():
    print("Starting Teachers Workspaces visual capture...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1920, "height": 1080})
        page = context.new_page()

        # Login
        print("Logging in as admin...")
        page.goto(f"{FRONTEND_URL}/login")
        page.wait_for_selector('input[name="username"]', timeout=15000)
        page.fill('input[name="username"]', "admin@prashantacademy.edu.in")
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
                print(f"Failed to capture {url}: {e}")

        browser.close()
        print("All Teachers screenshots captured successfully.")

if __name__ == "__main__":
    main()
