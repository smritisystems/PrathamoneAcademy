# /**
#  * @file        capture_recording_screenshots.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      00_PRODUCT_OVERVIEW
#  *
#  * @author      Jawahar R. Mallah
#  * @organization Smritisys & AITDL Networks
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 PrathamOne EduOS
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-20
#  * @updated     2026-11-21
#  *
#  * @description High-resolution screenshot capture of Native In-App EduBoard Lecture Recording workflows.
#  */

import os
import shutil
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
AUTH_STATE = ROOT / "data" / "temp_commercial_recordings" / "auth_state_director.json"
OUTPUT_DIR = ROOT / "docs" / "assets" / "commercial" / "recording_screenshots"
ARTIFACTS_DIR = Path(r"C:\Users\netma\.gemini\antigravity\brain\0d532662-f973-4d13-b3ec-a0c67bb58f2e")

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def capture_recording_suite():
    print("[INIT] Launching Chromium with WebRTC synthetic media and fake devices...")
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=[
                "--use-fake-ui-for-media-stream",
                "--use-fake-device-for-media-stream",
                "--no-sandbox",
                "--disable-gpu",
                "--window-size=1920,1080",
            ],
        )

        context = browser.new_context(
            storage_state=str(AUTH_STATE) if AUTH_STATE.exists() else None,
            viewport={"width": 1920, "height": 1080},
            device_scale_factor=1,
            permissions=["microphone", "camera"],
        )

        page = context.new_page()

        # Step 1: Open EduBoard #4 directly
        print("[STEP 1] Navigating directly to EduBoard #4 (CBSE XII Vector Kinematics)...")
        page.goto("http://localhost:5173/eduboard/4", wait_until="networkidle", timeout=30000)
        page.wait_for_timeout(3000)

        # Check if login redirected
        if "/login" in page.url:
            print("[AUTH] Re-authenticating...")
            page.fill('input[type="text"], input[name="username"]', "director")
            page.fill('input[type="password"]', "Admin@123456")
            page.click('button[type="submit"]')
            page.wait_for_timeout(3000)
            page.goto("http://localhost:5173/eduboard/4", wait_until="networkidle", timeout=30000)
            page.wait_for_timeout(3000)

        # Wait for the canvas to render
        page.wait_for_selector(".konvajs-content canvas", timeout=15000)
        page.wait_for_timeout(2000)

        # Step 1.2: Enable Edit Mode so the EduBoard Toolbar and drawing tools are active
        print("[STEP 1.2] Activating Edit Mode for EduBoard Workspace...")
        edit_btn = page.query_selector('button:has-text("Enable Edit Mode")')
        if edit_btn:
            edit_btn.click()
            page.wait_for_timeout(1500)

        # Activate the Highlighter Tool
        print("[STEP 1.3] Activating the Highlighter Tool (Shortcut H)...")
        page.keyboard.press("h")
        page.wait_for_timeout(1000)

        # Capture Clean Workspace with Highlighter tool active and structured lecture
        ws_ready_path = OUTPUT_DIR / "01_eduboard_workspace_ready.png"
        page.screenshot(path=str(ws_ready_path), full_page=False)
        print(f"[CAPTURED] {ws_ready_path.name}")

        # Step 2: Trigger Lecture Recording
        print("[STEP 2] Triggering 'Record Lecture' button...")
        record_btn = page.wait_for_selector('button:has-text("Record Lecture")', timeout=10000)
        if record_btn:
            record_btn.click()
            print("[CLICKED] Record Lecture button clicked.")
            page.wait_for_timeout(2500)

        # Toggle Camera PiP in the modal so the teacher presence is enabled
        print("[STEP 2.1] Enabling Camera PiP in the recording modal...")
        pip_btn = page.query_selector('button:has-text("Camera PiP Off")')
        if pip_btn:
            pip_btn.click()
            page.wait_for_timeout(2000)

        # Capture Active Recording Modal screenshot with Camera PiP On
        modal_path = OUTPUT_DIR / "02_eduboard_recording_modal_active.png"
        page.screenshot(path=str(modal_path), full_page=False)
        print(f"[CAPTURED] {modal_path.name}")

        # Step 3: Minimize/Close Modal to see EduBoard Canvas with Active Recording Pill & Clean Notes
        print("[STEP 3] Closing modal to view canvas with active recording pill...")
        close_modal_btn = page.query_selector('button[aria-label="Close"], div.fixed button:has(svg.lucide-x)')
        if close_modal_btn:
            close_modal_btn.click()
            page.wait_for_timeout(2000)
        else:
            page.keyboard.press("Escape")
            page.wait_for_timeout(2000)

        canvas_rec_path = OUTPUT_DIR / "03_eduboard_recording_active_canvas.png"
        page.screenshot(path=str(canvas_rec_path), full_page=False)
        print(f"[CAPTURED] {canvas_rec_path.name}")

        # Step 4: Stop Recording and capture Completion & Publishing state
        print("[STEP 4] Stopping recording to view publish modal...")
        stop_btn = page.query_selector('button[title*="Stop"], button:has(svg.lucide-square)')
        if stop_btn:
            stop_btn.click()
            page.wait_for_timeout(3000)

        finish_modal_path = OUTPUT_DIR / "04_eduboard_recording_completed_publish.png"
        page.screenshot(path=str(finish_modal_path), full_page=False)
        print(f"[CAPTURED] {finish_modal_path.name}")

        # Step 5: Capture Courses lecture playback
        print("[STEP 5] Navigating to Courses lecture playback...")
        page.goto("http://localhost:5173/courses", wait_until="networkidle", timeout=30000)
        page.wait_for_timeout(3000)
        courses_path = OUTPUT_DIR / "05_courses_recorded_lecture_portal.png"
        page.screenshot(path=str(courses_path), full_page=False)
        print(f"[CAPTURED] {courses_path.name}")

        # Copy captured screenshots to Artifacts Directory
        for img_path in [ws_ready_path, modal_path, canvas_rec_path, finish_modal_path, courses_path]:
            if img_path.exists():
                art_target = ARTIFACTS_DIR / img_path.name
                shutil.copy2(img_path, art_target)
                print(f"[COPIED TO ARTIFACTS] {art_target.name}")

        context.close()
        browser.close()
        print("[DONE] Recording screenshots capture completed successfully.")


if __name__ == "__main__":
    capture_recording_suite()
