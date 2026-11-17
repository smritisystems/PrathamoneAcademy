# /**
#  * @file        verify_planning_reschedule_acceptance.py
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
#  * @created     2026-11-17
#  * @updated     2026-11-17
#  *
#  * @description Live browser verification script for Single-Occurrence Rescheduling in Planning Workspace.
#  */

import json
import os
import shutil
import sys
import time
import urllib.parse
import urllib.request
from playwright.sync_api import sync_playwright

BASE_URL = "http://localhost:80"
API_URL = "http://localhost:8000/api/v1"
ARTIFACTS_DIR = r"C:\Users\netma\.gemini\antigravity\brain\d80f407d-b71e-4c0b-86a6-a8f64e74ae9e"
DOCS_ASSETS_DIR = r"F:\PrashantAcademy\docs\assets"
PASSWORD = "7)Yaw1dC_uQEfmYqmT"
ADMIN_EMAIL = "admin@example.com"

os.makedirs(ARTIFACTS_DIR, exist_ok=True)
os.makedirs(DOCS_ASSETS_DIR, exist_ok=True)


def get_auth_token():
    data = urllib.parse.urlencode({"username": ADMIN_EMAIL, "password": PASSWORD}).encode("utf-8")
    req = urllib.request.Request(f"{API_URL}/auth/login", data=data, method="POST")
    req.add_header("Content-Type", "application/x-www-form-urlencoded")
    with urllib.request.urlopen(req, timeout=10) as resp:
        body = json.loads(resp.read().decode("utf-8"))
        return body["access_token"]


def seed_recurring_activity(token, suffix):
    payload = {
        "institution_id": 1,
        "title": f"Faculty Standup {suffix}",
        "description": "Daily standup for secondary division teachers and coordinators.",
        "activity_type": "event",
        "category": "academic",
        "start_at": "2026-11-18T09:30:00+05:30",
        "end_at": "2026-11-18T10:15:00+05:30",
        "timezone": "Asia/Kolkata",
        "visibility": "institution",
        "is_published": True,
        "priority": "high",
        "status": "todo",
        "location": f"Room {suffix}",
        "recurrence": {
            "frequency": "daily",
            "interval": 1,
            "until": "2026-11-30",
            "weekdays": [],
        },
    }
    req = urllib.request.Request(
        f"{API_URL}/planning/activities",
        data=json.dumps(payload).encode("utf-8"),
        method="POST",
    )
    req.add_header("Authorization", f"Bearer {token}")
    req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req, timeout=10) as resp:
        body = json.loads(resp.read().decode("utf-8"))
        item = body["item"]
        print(f"[SEED] Created recurring test activity id={item['id']} title='{item['title']}'")
        return item["id"]


def save_screenshot(page, filename):
    dest1 = os.path.join(ARTIFACTS_DIR, filename)
    dest2 = os.path.join(DOCS_ASSETS_DIR, filename)
    page.screenshot(path=dest1, full_page=False)
    shutil.copy2(dest1, dest2)
    print(f"[SCREENSHOT] Saved: {filename}")


def run_acceptance_suite():
    print("=" * 80)
    print("PRATHAMONE EduOS — PLANNING WORKSPACE RESCHEDULE ACCEPTANCE AUDIT")
    print("=" * 80)

    token = get_auth_token()
    suffix = str(int(time.time()))[-4:]
    title = f"Faculty Standup {suffix}"
    activity_id = seed_recurring_activity(token, suffix)
    card_selector = f'button:has-text("{title}")'

    results = {
        "view_mode_readonly": False,
        "edit_mode_unlock": False,
        "reschedule_modal_open": False,
        "occurrence_rescheduled": False,
        "badge_and_restore_action": False,
        "mobile_responsive_agenda": False,
    }

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        # -------------------------------------------------------------
        # STEP 1: DESKTOP SESSION — VIEW MODE GOVERNANCE
        # -------------------------------------------------------------
        print("\n[STEP 1] Testing Desktop View Mode Default (1440x900)...")
        ctx = browser.new_context(viewport={"width": 1440, "height": 900})
        page = ctx.new_page()

        page.goto(f"{BASE_URL}/login")
        page.wait_for_selector('input[name="username"]', timeout=15000)
        page.fill('input[name="username"]', ADMIN_EMAIL)
        page.fill('input[name="password"]', PASSWORD)
        page.click('button[type="submit"]')

        page.wait_for_url("**/dashboard", timeout=20000)
        print("[AUTH] Successfully logged in as Admin")

        # Navigate to Planning Workspace
        page.goto(f"{BASE_URL}/planning")
        page.wait_for_selector('h1:has-text("Planning & Activities")', timeout=15000)
        time.sleep(1.5)

        # Switch to Agenda view to easily spot the activity
        page.click('button:has-text("Agenda")')
        time.sleep(1)

        # Verify View Mode is active (default)
        page.wait_for_selector(card_selector, timeout=10000)
        page.click(card_selector)
        time.sleep(0.5)

        # In View Mode, 'Reschedule occurrence' button must NOT exist (RULE 010)
        has_reschedule_in_view_mode = page.query_selector('button:has-text("Reschedule occurrence")') is not None
        if not has_reschedule_in_view_mode:
            print("[CHECK PASS] View Mode correctly enforces read-only state (no Reschedule button)")
            results["view_mode_readonly"] = True
            save_screenshot(page, "planning_reschedule_step1_view_mode.png")
        else:
            print("[CHECK FAIL] Reschedule button was visible in View Mode!")

        # Close detail modal
        page.click('button:has-text("Close")')
        time.sleep(0.5)

        # -------------------------------------------------------------
        # STEP 2: ACTIVATE EDIT MODE & OPEN RESCHEDULE MODAL
        # -------------------------------------------------------------
        print("\n[STEP 2] Activating Scoped Edit Mode & Launching Reschedule Modal...")
        enable_edit_btn = page.query_selector('button:has-text("Enable Edit Mode")')
        if enable_edit_btn:
            enable_edit_btn.click()
            time.sleep(0.8)
            print("[EDIT MODE] Scoped Edit Mode unlocked")
            results["edit_mode_unlock"] = True

        # Click the card again in Edit Mode
        page.click(card_selector)
        time.sleep(0.5)

        # Verify 'Reschedule occurrence' button is now available
        reschedule_btn = page.wait_for_selector('button:has-text("Reschedule occurrence")', timeout=5000)
        if reschedule_btn:
            print("[CHECK PASS] 'Reschedule occurrence' button available in Edit Mode")
            reschedule_btn.click()
            time.sleep(0.5)

            # Verify Reschedule Modal header and notice callout
            page.wait_for_selector('text=Rescheduling Single Occurrence', timeout=5000)
            print("[CHECK PASS] Reschedule Modal opened with warning callout")
            results["reschedule_modal_open"] = True

            # Enter new date and time
            # Target date: 2026-11-20, start 15:30, end 16:15
            date_input = page.wait_for_selector('input[aria-label="New date"]')
            time_start_input = page.wait_for_selector('input[aria-label="Start time"]')
            time_end_input = page.wait_for_selector('input[aria-label="End time"]')

            date_input.fill("2026-11-20")
            time_start_input.fill("15:30")
            time_end_input.fill("16:15")
            time.sleep(0.5)

            save_screenshot(page, "planning_reschedule_step2_modal_active.png")

            # Submit reschedule
            page.click('button:has-text("Save reschedule")')
            time.sleep(2)
            print("[SUBMIT] Saved single-occurrence reschedule")

        # -------------------------------------------------------------
        # STEP 3: VERIFY RESCHEDULED PROJECTION & BADGES
        # -------------------------------------------------------------
        print("\n[STEP 3] Verifying Rescheduled Card Badge & Detail View...")
        page.wait_for_selector('text=Rescheduled', timeout=10000)
        print("[CHECK PASS] Amber 'Rescheduled' badge visible on rescheduled card in Agenda view")
        results["occurrence_rescheduled"] = True
        save_screenshot(page, "planning_reschedule_step3_card_badge.png")

        # Click on the rescheduled occurrence (the card that has the 'Rescheduled' badge)
        rescheduled_card = page.wait_for_selector(f'button:has-text("{title}"):has-text("Rescheduled")', timeout=5000)
        rescheduled_card.click()
        time.sleep(0.8)

        # Check elevated badge in modal and 'Restore original schedule' button
        detail_badge = page.query_selector('[data-testid="rescheduled-badge"]')
        restore_btn = page.query_selector('button:has-text("Restore original schedule")')
        if detail_badge and restore_btn:
            print(f"[CHECK PASS] Detail badge text: '{detail_badge.inner_text().strip()}'")
            print("[CHECK PASS] 'Restore original schedule' button available")
            results["badge_and_restore_action"] = True
            save_screenshot(page, "planning_reschedule_step4_detail_and_restore.png")

        # Close modal
        page.click('button:has-text("Close")')
        time.sleep(0.5)

        # -------------------------------------------------------------
        # STEP 4: MOBILE RESPONSIVE EXPERIENCE (375x667)
        # -------------------------------------------------------------
        print("\n[STEP 4] Testing Mobile Viewport & Agenda Presentation (375x667)...")
        mobile_ctx = browser.new_context(
            viewport={"width": 375, "height": 667},
            is_mobile=True,
            user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15",
        )
        mobile_page = mobile_ctx.new_page()

        mobile_page.goto(f"{BASE_URL}/login")
        mobile_page.wait_for_selector('input[name="username"]', timeout=15000)
        mobile_page.fill('input[name="username"]', ADMIN_EMAIL)
        mobile_page.fill('input[name="password"]', PASSWORD)
        mobile_page.click('button[type="submit"]')
        mobile_page.wait_for_url("**/dashboard", timeout=20000)

        mobile_page.goto(f"{BASE_URL}/planning")
        mobile_page.wait_for_selector('h1:has-text("Planning & Activities")', timeout=15000)
        time.sleep(1.5)

        # On mobile, verify Agenda view default and rescheduled card badge
        mobile_rescheduled_card = mobile_page.wait_for_selector(f'button:has-text("{title}"):has-text("Rescheduled")', timeout=10000)
        mobile_badge = mobile_page.wait_for_selector('text=Rescheduled', timeout=5000)
        if mobile_rescheduled_card and mobile_badge:
            print("[CHECK PASS] Mobile Agenda displays rescheduled occurrence with amber badge")
            results["mobile_responsive_agenda"] = True
            save_screenshot(mobile_page, "planning_reschedule_step5_mobile_agenda.png")

        # Click card on mobile to view modal
        mobile_rescheduled_card.click()
        time.sleep(0.8)
        save_screenshot(mobile_page, "planning_reschedule_step6_mobile_detail.png")

        mobile_ctx.close()
        ctx.close()
        browser.close()

    print("\n" + "=" * 80)
    print("ACCEPTANCE AUDIT RESULTS SUMMARY:")
    print("=" * 80)
    for key, passed in results.items():
        status = "PASSED" if passed else "FAILED"
        print(f" - {key:35s}: {status}")

    all_passed = all(results.values())
    print("\nOVERALL STATUS: " + ("ALL CHECKS PASSED (6/6)" if all_passed else "SOME CHECKS FAILED"))
    return all_passed


if __name__ == "__main__":
    success = run_acceptance_suite()
    sys.exit(0 if success else 1)
