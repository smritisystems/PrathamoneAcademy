# /**
#  * @file        test_live_login.py
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
#  * @description Source component for Test Live Login in the scripts module.
#  */

import time
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1920, "height": 1080})
    page.goto("http://localhost:5173/login")
    print("Page title:", page.title())
    
    # Fill login form
    page.locator("input#username, input[type='text'], input[placeholder*='email' i], input[placeholder*='username' i]").first.fill("admin@prathamone.com")
    page.locator("input[type='password']").first.fill("Admin@2026!")
    page.locator("button[type='submit'], button:has-text('Sign in')").first.click()
    
    time.sleep(3)
    print("Current URL after login:", page.url)
    page.screenshot(path="temp_inspect/after_login.png")
    browser.close()

print("Login test done!")
