# /**
#  * @file        capture_refund_workflow.py
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
#  * @description Live browser verification script capturing the Refund and Payment Reversal workflows in PrathamOne EduOS.
#  */

import os
from playwright.sync_api import sync_playwright

BASE_URL = "http://localhost:80"
ADMIN_EMAIL = "admin@prathamone.com"
ADMIN_PASS = "Admin@2026!"
OUTPUT_DIR = r"C:\Users\netma\.gemini\antigravity\brain\22905f1c-8cd0-4587-bdca-ae672361b8c4\refunds_showcase"
os.makedirs(OUTPUT_DIR, exist_ok=True)

def run_refund_capture():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 960})
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

        # Ensure theme is Dark mode
        page.evaluate("""() => {
            const stored = JSON.parse(localStorage.getItem('pratham-appearance') || '{"state":{},"version":1}');
            stored.state = { preference: 'dark' };
            localStorage.setItem('pratham-appearance', JSON.stringify(stored));
            document.documentElement.classList.add('dark');
        }""")
        page.reload()
        page.wait_for_timeout(2500)

        # ── Step 1: Navigate to /payments (View Mode) ──
        print("[STEP 1] Navigating to /payments...")
        page.goto(f"{BASE_URL}/payments")
        page.wait_for_timeout(2500)
        page.screenshot(path=os.path.join(OUTPUT_DIR, "refund_01_payments_ledger_view_mode.png"))
        print("  -> Saved refund_01_payments_ledger_view_mode.png")

        # ── Step 2: Enable Edit Mode ──
        print("[STEP 2] Activating Edit Mode...")
        edit_btn = page.query_selector('button:has-text("Enable Edit Mode")')
        if edit_btn:
            edit_btn.click()
            page.wait_for_timeout(1000)
            page.screenshot(path=os.path.join(OUTPUT_DIR, "refund_02_payments_ledger_edit_mode.png"))
            print("  -> Saved refund_02_payments_ledger_edit_mode.png")

        # ── Step 3: Open Refund Modal ──
        print("[STEP 3] Opening Process Refund modal...")
        refund_btn = page.query_selector('button:has-text("Refund")')
        if refund_btn:
            refund_btn.click()
            page.wait_for_timeout(1500)
            page.screenshot(path=os.path.join(OUTPUT_DIR, "refund_03_process_refund_modal.png"))
            print("  -> Saved refund_03_process_refund_modal.png")
            # Close modal with Cancel or Escape
            page.keyboard.press("Escape")
            page.wait_for_timeout(800)

        # ── Step 4: Open Reverse Modal ──
        print("[STEP 4] Opening Reverse Payment modal...")
        reverse_btn = page.query_selector('button:has-text("Reverse")')
        if reverse_btn:
            reverse_btn.click()
            page.wait_for_timeout(1500)
            page.screenshot(path=os.path.join(OUTPUT_DIR, "refund_04_reverse_payment_modal.png"))
            print("  -> Saved refund_04_reverse_payment_modal.png")
            # Close modal with Cancel or Escape
            page.keyboard.press("Escape")
            page.wait_for_timeout(800)

        # ── Step 5: Scroll to Refund Requests & Disbursement Ledger ──
        print("[STEP 5] Inspecting Refund Requests & Disbursement Ledger...")
        refund_ledger_header = page.query_selector('text=Refund Requests')
        if refund_ledger_header:
            refund_ledger_header.scroll_into_view_if_needed()
            page.wait_for_timeout(1000)
            page.screenshot(path=os.path.join(OUTPUT_DIR, "refund_05_refund_requests_ledger.png"))
            print("  -> Saved refund_05_refund_requests_ledger.png")

        browser.close()
        print("\n[COMPLETE] Refund & Reversal capture finished successfully!")

if __name__ == "__main__":
    run_refund_capture()
