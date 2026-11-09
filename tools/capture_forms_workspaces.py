# /**
#  * @file        capture_forms_workspaces.py
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
#  * @description Visual evidence capture tool for all 8 dedicated Print Forms Studio & KYC workspaces.
#  */

import os
import time
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\netma\.gemini\antigravity\brain\f0e72778-27df-4928-92a5-dc51f7834a6e"
FRONTEND_URL = "http://localhost:5173"

PAGES = [
    ("screenshot_104_forms_overview.png", f"{FRONTEND_URL}/forms/overview", "Print Forms Studio Overview & Template Showcase"),
    ("screenshot_105_forms_admissions.png", f"{FRONTEND_URL}/forms/admissions", "Admission & KYC Application Dossiers Workspace"),
    ("screenshot_106_forms_id_cards.png", f"{FRONTEND_URL}/forms/id-cards", "Student & Staff Identity Cards & Badges Workspace"),
    ("screenshot_107_forms_financial.png", f"{FRONTEND_URL}/forms/financial", "Fee Payment Receipts & Dues Notices Workspace"),
    ("screenshot_108_forms_academic.png", f"{FRONTEND_URL}/forms/academic", "Examination Hall Tickets & Transcripts Workspace"),
    ("screenshot_109_forms_certificates.png", f"{FRONTEND_URL}/forms/certificates", "Institutional Leaving & Experience Certificates Workspace"),
    ("screenshot_110_forms_bulk_print.png", f"{FRONTEND_URL}/forms/bulk-print", "High-Volume Batch Print Spooler Workspace"),
    ("screenshot_111_forms_audit_logs.png", f"{FRONTEND_URL}/forms/audit-logs", "DPDP Act 2023 Audited Print Trail Workspace"),
]

def main():
    print("Starting Print Forms Studio Workspaces visual capture...")
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
                print(f"Error capturing {desc}: {e}")

        browser.close()
        print("Visual capture for all 8 Print Forms Studio workspaces completed!")

if __name__ == "__main__":
    main()
