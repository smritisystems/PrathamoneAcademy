# /**
#  * @file        capture_studio_preview.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      scripts
#  *
#  * @author      Jawahar R. Mallah
#  * @organization Smritisys & AITDL Networks
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 PrathamOne EduOS
#  * @license     Proprietary
#  *
#  * @version     1.141.0
#  * @created     2026-11-19
#  * @updated     2026-11-19
#  *
#  * @description Automated visual test script capturing high-resolution live screenshots of PrathamOne Video Studio interface.
#  */

import json
import time
from playwright.sync_api import sync_playwright

auth_data = {
    "state": {
        "user": {
            "id": 1,
            "username": "admin",
            "email": "admin@prathamone.com",
            "first_name": "Administrator",
            "role": "admin",
            "institution_id": 1,
            "permissions": ["all"],
        },
        "selectedInstitutionId": 1,
        "selectedAcademicYearId": 1,
    },
    "version": 0,
}

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1920, "height": 1080})

    # Set authentication cookie
    context.add_cookies([
        {
            "name": "prashant_access_token",
            "value": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbiIsInJvbGUiOiJhZG1pbiIsImV4cCI6MTc5NTEzNTUzMSwidHlwZSI6ImFjY2VzcyIsImp0aSI6IjZ2dmExQmhXdWNCWHdMRWE5Uy0ySncifQ.vmj6NJ5A2ZJbRTfZNIlOrgBfoEPp6lmcEvktfgfx_6U",
            "domain": "localhost",
            "path": "/",
        }
    ])

    page = context.new_page()

    # Pre-seed localStorage before route navigation
    page.goto("http://localhost/", wait_until="domcontentloaded")
    page.evaluate(
        "authStr => window.localStorage.setItem('prashant-auth', authStr)",
        json.dumps(auth_data),
    )

    # Navigate to Video Studio
    print("Navigating to Video Studio...")
    page.goto("http://localhost/video-studio")
    time.sleep(3)

    print("Current URL:", page.url)

    # 1. Main Studio Interface Screenshot
    screenshot_main = "docs/assets/screenshots/video_studio_live_interface.png"
    page.screenshot(path=screenshot_main)
    print("Captured Main Studio:", screenshot_main)

    # 2. Open AI Director Modal Screenshot
    try:
        page.locator("button:has-text('AI Director')").first.click()
        time.sleep(1)
        screenshot_director = "docs/assets/screenshots/video_studio_ai_director_modal.png"
        page.screenshot(path=screenshot_director)
        print("Captured AI Director Modal:", screenshot_director)
        page.keyboard.press("Escape")
        time.sleep(0.5)
    except Exception as e:
        print("Director error:", e)

    # 3. Open Export Modal Screenshot
    try:
        page.locator("button:has-text('Export Video')").first.click()
        time.sleep(1)
        screenshot_export = "docs/assets/screenshots/video_studio_export_modal.png"
        page.screenshot(path=screenshot_export)
        print("Captured Export Modal:", screenshot_export)
        page.keyboard.press("Escape")
        time.sleep(0.5)
    except Exception as e:
        print("Export error:", e)

    # 4. Open Library Modal Screenshot
    try:
        page.locator("button:has-text('Library')").first.click()
        time.sleep(1)
        screenshot_library = "docs/assets/screenshots/video_studio_library_modal.png"
        page.screenshot(path=screenshot_library)
        print("Captured Library Modal:", screenshot_library)
        page.keyboard.press("Escape")
        time.sleep(0.5)
    except Exception as e:
        print("Library error:", e)

    browser.close()
    print("All studio visual test screenshots captured successfully!")
