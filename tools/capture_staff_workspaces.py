# /**
#  * @file        capture_staff_workspaces.py
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
#  * @updated     2026-11-14
#  *
#  * @description Visual evidence capture tool for all 8 dedicated Staff & HR Directory workspaces.
#  */

import os
import time
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\netma\.gemini\antigravity\brain\f0e72778-27df-4928-92a5-dc51f7834a6e"
FRONTEND_URL = "http://localhost:5173"

PAGES = [
    ("screenshot_80_staff_overview.png", f"{FRONTEND_URL}/staff/overview", "Staff HR Operations Overview Workspace"),
    ("screenshot_81_staff_directory.png", f"{FRONTEND_URL}/staff/directory", "Master Staff Personnel Directory Workspace"),
    ("screenshot_82_staff_onboarding.png", f"{FRONTEND_URL}/staff/onboarding", "New Staff Onboarding & Profile Creation Workspace"),
    ("screenshot_83_staff_duties.png", f"{FRONTEND_URL}/staff/duties", "Operational Duties & Department Allocations Workspace"),
    ("screenshot_84_staff_attendance.png", f"{FRONTEND_URL}/staff/attendance", "Daily Duty Register & Attendance Roll Call Workspace"),
    ("screenshot_85_staff_leaves.png", f"{FRONTEND_URL}/staff/leaves", "Leave Applications & Approvals Workspace"),
    ("screenshot_86_staff_documents.png", f"{FRONTEND_URL}/staff/documents", "HR Letters & Official Documentation Studio Workspace"),
    ("screenshot_87_staff_settings.png", f"{FRONTEND_URL}/staff/settings", "Institute Employment & HR Policies Workspace"),
]

def main():
    print("Starting Staff Workspaces visual capture...")
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
                print(f"Error capturing {desc}: {e}")

        browser.close()
        print("Visual capture for all 8 Staff workspaces completed!")

if __name__ == "__main__":
    main()
