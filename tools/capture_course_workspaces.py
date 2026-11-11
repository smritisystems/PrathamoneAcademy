# /**
#  * @file        capture_course_workspaces.py
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
#  * @description Visual evidence capture tool for all 8 dedicated Study Materials & Digital Content workspaces.
#  */

import os
import time
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\netma\.gemini\antigravity\brain\f0e72778-27df-4928-92a5-dc51f7834a6e"
FRONTEND_URL = "http://localhost:5173"

PAGES = [
    ("screenshot_88_courses_overview.png", f"{FRONTEND_URL}/courses/overview", "Study Materials & Digital Content Overview Workspace"),
    ("screenshot_89_courses_repository.png", f"{FRONTEND_URL}/courses/repository", "Master Content Library & Subject Explorer Workspace"),
    ("screenshot_90_courses_upload.png", f"{FRONTEND_URL}/courses/upload", "Digital Content Upload & File Registration Workspace"),
    ("screenshot_91_courses_notes.png", f"{FRONTEND_URL}/courses/notes", "Chapter Notes, Theory Handouts & Study Guides Workspace"),
    ("screenshot_92_courses_question_banks.png", f"{FRONTEND_URL}/courses/question-banks", "Question Banks, DPPs & Model Test Papers Workspace"),
    ("screenshot_93_courses_video_lectures.png", f"{FRONTEND_URL}/courses/video-lectures", "Recorded Lectures & Video Stream Centre Workspace"),
    ("screenshot_94_courses_syllabi.png", f"{FRONTEND_URL}/courses/syllabi", "Curriculum Syllabi & Academic Streams Workspace"),
    ("screenshot_95_courses_settings.png", f"{FRONTEND_URL}/courses/settings", "Storage Policies, File Formats & Quotas Workspace"),
]

def main():
    print("Starting Study Materials Workspaces visual capture...")
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
        print("Visual capture for all 8 Study Materials workspaces completed!")

if __name__ == "__main__":
    main()
