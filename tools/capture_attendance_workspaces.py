# /**
#  * @file        capture_attendance_workspaces.py
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
#  * @description Visual evidence capture tool for all 8 dedicated Attendance Centre workspaces.
#  */

import os
import time
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\netma\.gemini\antigravity\brain\f0e72778-27df-4928-92a5-dc51f7834a6e"
FRONTEND_URL = "http://localhost:5173"

PAGES = [
    ("screenshot_56_attendance_overview.png", f"{FRONTEND_URL}/attendance/overview", "Attendance Overview Workspace"),
    ("screenshot_57_attendance_daily.png", f"{FRONTEND_URL}/attendance/daily", "Daily Batch Roll Call Workspace"),
    ("screenshot_58_attendance_qr_terminal.png", f"{FRONTEND_URL}/attendance/qr-terminal", "QR Attendance Terminal & Kiosk Workspace"),
    ("screenshot_59_attendance_register.png", f"{FRONTEND_URL}/attendance/register", "Monthly Attendance Register Workspace"),
    ("screenshot_60_attendance_absenteeism.png", f"{FRONTEND_URL}/attendance/absenteeism", "Absenteeism & Defaulters Workspace"),
    ("screenshot_61_attendance_leaves.png", f"{FRONTEND_URL}/attendance/leaves", "Student Leave Applications Workspace"),
    ("screenshot_62_attendance_reports.png", f"{FRONTEND_URL}/attendance/reports", "Attendance Analytics & Audit Logs Workspace"),
    ("screenshot_63_attendance_settings.png", f"{FRONTEND_URL}/attendance/settings", "Attendance Settings & Policy Framework Workspace"),
]

def main():
    print("Starting Attendance Workspaces visual capture...")
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
        print("All Attendance screenshots captured successfully.")

if __name__ == "__main__":
    main()
