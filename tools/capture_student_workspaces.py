# /**
#  * @file        capture_student_workspaces.py
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
#  * @description Visual evidence capture tool for all 8 dedicated Students & Admissions Centre workspaces.
#  */

import os
import time
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\netma\.gemini\antigravity\brain\f0e72778-27df-4928-92a5-dc51f7834a6e"
FRONTEND_URL = "http://localhost:5173"

PAGES = [
    ("screenshot_72_students_overview.png", f"{FRONTEND_URL}/students/overview", "Student Enrolment Overview Workspace"),
    ("screenshot_73_students_directory.png", f"{FRONTEND_URL}/students/directory", "Master Student Directory Workspace"),
    ("screenshot_74_students_admission.png", f"{FRONTEND_URL}/students/admission", "New Admission & KYC Application Workspace"),
    ("screenshot_75_students_allocations.png", f"{FRONTEND_URL}/students/allocations", "Batch & Division Allocations Workspace"),
    ("screenshot_76_students_id_cards.png", f"{FRONTEND_URL}/students/id-cards", "Student ID Cards & Biometric Badges Workspace"),
    ("screenshot_77_students_history.png", f"{FRONTEND_URL}/students/history", "Disciplinary & Activity History Workspace"),
    ("screenshot_78_students_reactivation.png", f"{FRONTEND_URL}/students/reactivation", "Reactivation & Archive Workspace"),
    ("screenshot_79_students_settings.png", f"{FRONTEND_URL}/students/settings", "Admission Policies & Settings Workspace"),
]

def main():
    print("Starting Students Workspaces visual capture...")
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
        print("Visual capture for all 8 Students workspaces completed!")

if __name__ == "__main__":
    main()
