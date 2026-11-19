# /**
#  * @file        test_director_view.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      scripts
#  *
#  * @author      Jawahar R. Mallah
#  * @organization Smritisys & AITDL Networks
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 PrathamOne EduOS
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-19
#  * @updated     2026-11-19
#  *
#  * @description Test verification of Dr. Rajesh Kulkarni director persona and kiosk clean-bar styling.
#  */

import os
import time
import json
from playwright.sync_api import sync_playwright

AUTH_PATH = "data/temp_commercial_recordings/director_auth.json"

with open(AUTH_PATH) as f:
    auth_data = json.load(f)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1920, "height": 1080})
    context.add_cookies([{
        "name": "prashant_access_token",
        "value": auth_data["state"]["token"],
        "domain": "localhost",
        "path": "/"
    }])
    page = context.new_page()
    page.goto("http://localhost:5173/")
    page.evaluate("authStr => window.localStorage.setItem('prashant-auth', authStr)", json.dumps(auth_data))
    page.goto("http://localhost:5173/dashboard")
    page.wait_for_selector("text=Hello", timeout=10000)
    page.add_style_tag(content="button:has-text('Install App') { display: none !important; }")
    time.sleep(2)
    page.screenshot(path="temp_inspect/director_dashboard_check.png")
    browser.close()

print("Director dashboard screenshot saved!")
