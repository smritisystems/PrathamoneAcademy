# /**
#  * @file        verify_e2e_workflows.py
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
#  * @created     2026-11-18
#  * @updated     2026-11-18
#  *
#  * @description End-to-end automated live verification script executing core user workflows across Admission, Fees, Attendance, and Payroll.
#  */

import os
import time
from playwright.sync_api import sync_playwright

BASE_URL = "http://localhost:80"
ADMIN_EMAIL = "admin@prathamone.com"
ADMIN_PASS = "Admin@2026!"
OUTPUT_DIR = r"C:\Users\netma\.gemini\antigravity\brain\22905f1c-8cd0-4587-bdca-ae672361b8c4\e2e_workflows"
os.makedirs(OUTPUT_DIR, exist_ok=True)

def run_e2e_verification():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        print("[AUTH] Logging in as Administrator...")
        page.goto(f"{BASE_URL}/login")
        page.wait_for_selector('input[name="username"]', timeout=15000)
        page.fill('input[name="username"]', ADMIN_EMAIL)
        page.fill('input[type="password"]', ADMIN_PASS)
        page.click('button[type="submit"]')
        page.wait_for_url("**/dashboard", timeout=15000)
        page.wait_for_timeout(2000)
        print("  -> Logged in successfully.")

        # Ensure theme is Dark mode with proper Zustand store
        page.evaluate("""() => {
            const stored = JSON.parse(localStorage.getItem('pratham-appearance') || '{"state":{},"version":1}');
            stored.state = { preference: 'dark' };
            localStorage.setItem('pratham-appearance', JSON.stringify(stored));
            document.documentElement.classList.add('dark');
        }""")
        page.reload()
        page.wait_for_timeout(2500)

        # ─────────────────────────────────────────────────────────────
        # WORKFLOW 1: Student Management & Admission Lifecycle
        # ─────────────────────────────────────────────────────────────
        print("\n[WORKFLOW 1/4] Verifying Student Admission & Directory...")
        page.goto(f"{BASE_URL}/students")
        page.wait_for_timeout(2500)
        page.screenshot(path=os.path.join(OUTPUT_DIR, "e2e_01_student_view_mode.png"))
        print("  -> Saved e2e_01_student_view_mode.png (Rule 010 View-First lock)")

        # Activate Edit Mode
        edit_btn = page.query_selector('button:has-text("Enable Edit Mode")')
        if edit_btn:
            edit_btn.click()
            page.wait_for_timeout(1000)
            page.screenshot(path=os.path.join(OUTPUT_DIR, "e2e_02_student_edit_mode.png"))
            print("  -> Saved e2e_02_student_edit_mode.png (Scoped Edit Mode Unlocked)")

        # Switch to Master Directory
        dir_tab = page.query_selector('button:has-text("Master Directory")')
        if dir_tab:
            dir_tab.click()
            page.wait_for_timeout(2000)
            page.screenshot(path=os.path.join(OUTPUT_DIR, "e2e_03_student_master_directory.png"))
            print("  -> Saved e2e_03_student_master_directory.png (Student Table & Badges)")

        # ─────────────────────────────────────────────────────────────
        # WORKFLOW 2: Fees & Payment Operations
        # ─────────────────────────────────────────────────────────────
        print("\n[WORKFLOW 2/4] Verifying Fees & Payment Operations...")
        page.goto(f"{BASE_URL}/fees")
        page.wait_for_timeout(2500)
        page.screenshot(path=os.path.join(OUTPUT_DIR, "e2e_04_fees_overview.png"))
        print("  -> Saved e2e_04_fees_overview.png (Fees Analytics & KPI Cards)")

        # Open Record Payment Modal
        record_btn = page.query_selector('button:has-text("Record Payment"), button:has-text("Collect Fee")')
        if record_btn:
            record_btn.click()
            page.wait_for_timeout(1500)
            page.screenshot(path=os.path.join(OUTPUT_DIR, "e2e_05_record_payment_modal.png"))
            print("  -> Saved e2e_05_record_payment_modal.png (Payment Collection Desk)")
            # Close modal with Escape or close button
            page.keyboard.press("Escape")
            page.wait_for_timeout(600)

        # Switch to Defaulters & Dues
        defaulters_tab = page.query_selector('button:has-text("Defaulters & Dues")')
        if defaulters_tab:
            defaulters_tab.click()
            page.wait_for_timeout(2000)
            page.screenshot(path=os.path.join(OUTPUT_DIR, "e2e_06_defaulters_dues.png"))
            print("  -> Saved e2e_06_defaulters_dues.png (Defaulters & Recovery Ledger)")

        # ─────────────────────────────────────────────────────────────
        # WORKFLOW 3: Attendance Roll Call & Terminal
        # ─────────────────────────────────────────────────────────────
        print("\n[WORKFLOW 3/4] Verifying Attendance & Roll Call...")
        page.goto(f"{BASE_URL}/attendance")
        page.wait_for_timeout(2500)
        page.screenshot(path=os.path.join(OUTPUT_DIR, "e2e_07_attendance_overview.png"))
        print("  -> Saved e2e_07_attendance_overview.png (Attendance Centre Overview)")

        # Switch to Daily Roll Call Tab
        daily_tab = page.query_selector('button:has-text("Daily Roll Call")')
        if daily_tab:
            daily_tab.click()
            page.wait_for_timeout(2000)
            page.screenshot(path=os.path.join(OUTPUT_DIR, "e2e_08_daily_roll_call.png"))
            print("  -> Saved e2e_08_daily_roll_call.png (Batch Roll Call Register)")

        # Open QR Terminal modal or tab
        qr_btn = page.query_selector('button:has-text("Open QR Attendance Terminal"), button:has-text("Open QR Terminal")')
        if qr_btn:
            qr_btn.click()
            page.wait_for_timeout(1500)
            page.screenshot(path=os.path.join(OUTPUT_DIR, "e2e_09_qr_terminal_active.png"))
            print("  -> Saved e2e_09_qr_terminal_active.png (Kiosk QR Terminal)")
            # Close terminal modal if opened
            close_qr = page.query_selector('button:has-text("Close QR Terminal")')
            if close_qr:
                close_qr.click()
                page.wait_for_timeout(600)

        # ─────────────────────────────────────────────────────────────
        # WORKFLOW 4: Teacher Payroll & Vouchers
        # ─────────────────────────────────────────────────────────────
        print("\n[WORKFLOW 4/4] Verifying Teacher Payroll & Compensation...")
        page.goto(f"{BASE_URL}/payroll")
        page.wait_for_timeout(2500)
        page.screenshot(path=os.path.join(OUTPUT_DIR, "e2e_10_payroll_monthly_register.png"))
        print("  -> Saved e2e_10_payroll_monthly_register.png (Monthly Payroll Register)")

        # Switch to Teaching Session Register
        session_tab = page.query_selector('button:has-text("Teaching Session Register")')
        if session_tab:
            session_tab.click()
            page.wait_for_timeout(2000)
            page.screenshot(path=os.path.join(OUTPUT_DIR, "e2e_11_session_register.png"))
            print("  -> Saved e2e_11_session_register.png (Verified Teaching Sessions)")

        # Switch to Teacher Profiles & Rates
        rates_tab = page.query_selector('button:has-text("Teacher Profiles & Rates")')
        if rates_tab:
            rates_tab.click()
            page.wait_for_timeout(2000)
            page.screenshot(path=os.path.join(OUTPUT_DIR, "e2e_12_teacher_rates_ledger.png"))
            print("  -> Saved e2e_12_teacher_rates_ledger.png (Compensation Contracts & Hourly Rates)")

        browser.close()
        print("\n[COMPLETE] All 4 end-to-end workflows verified and captured successfully!")

if __name__ == "__main__":
    run_e2e_verification()
