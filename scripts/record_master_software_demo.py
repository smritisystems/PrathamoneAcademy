# /**
#  * @file        record_master_software_demo.py
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
#  * @description Comprehensive Playwright kiosk-mode software recording across all core chapters with automated event telemetry emission.
#  */

import os
import time
import json
import av
from pathlib import Path
from playwright.sync_api import sync_playwright

OUTPUT_DIR = Path("frontend/public/media/commercial")
TEMP_DIR = Path("data/temp_commercial_recordings")
EVENTS_FILE = Path("data/commercial/kiosk_demo_events.json")
AUTH_FILE = Path("data/temp_commercial_recordings/auth_state_director.json")
TARGET_MP4 = OUTPUT_DIR / "live_software_demo_master.mp4"

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
TEMP_DIR.mkdir(parents=True, exist_ok=True)
EVENTS_FILE.parent.mkdir(parents=True, exist_ok=True)


def transcode_to_clean_mp4(webm_path: str, mp4_path: str):
    """Transcodes the recorded WebM to broadcast 1080p H.264 MP4."""
    in_container = av.open(webm_path)
    out_container = av.open(str(mp4_path), mode="w")

    in_video = in_container.streams.video[0]
    out_video = out_container.add_stream("h264", rate=30)
    out_video.width = 1920
    out_video.height = 1080
    out_video.pix_fmt = "yuv420p"
    out_video.bit_rate = 8500000

    for frame in in_container.decode(in_video):
        if frame.width != 1920 or frame.height != 1080:
            frame = frame.reformat(width=1920, height=1080, format="yuv420p")
        for packet in out_video.encode(frame):
            out_container.mux(packet)

    for packet in out_video.encode():
        out_container.mux(packet)

    out_container.close()
    in_container.close()
    print(f"Transcoded clean master software MP4: {mp4_path} ({os.path.getsize(mp4_path)} bytes)")


def record_master_software_demo():
    print("=================================================================")
    print("  PRATHAMONE EduOS — MASTER SOFTWARE RECORDING SUITE")
    print("=================================================================")

    events = []
    start_time = 0.0

    def log_event(event_name: str, description: str):
        elapsed = time.time() - start_time
        events.append({"event": event_name, "t": round(elapsed, 2), "description": description})
        print(f"  [EVENT @ {elapsed:05.2f}s] {event_name}: {description}")

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=[
                "--start-fullscreen",
                "--kiosk",
                "--disable-infobars",
                "--hide-scrollbars",
            ],
        )

        record_context = browser.new_context(
            storage_state=str(AUTH_FILE) if AUTH_FILE.exists() else None,
            viewport={"width": 1920, "height": 1080},
            record_video_dir=str(TEMP_DIR),
            record_video_size={"width": 1920, "height": 1080},
        )
        page = record_context.new_page()

        # Step 0: Login if auth state does not exist
        if not AUTH_FILE.exists():
            print("Authenticating as Dr. Rajesh Kulkarni (Director)...")
            page.goto("http://localhost:5173/login")
            page.fill("input[type='text'], input[type='email']", "admin@prathamone.com")
            page.fill("input[type='password']", "Admin@2026!")
            page.click("button[type='submit']")
            page.wait_for_url("**/dashboard", timeout=15000)
            record_context.storage_state(path=str(AUTH_FILE))

        # Begin Official Timeline Recording
        start_time = time.time()
        print("\nBeginning synchronized capture timeline...")

        # CHAPTER 03: Executive Pulse & Real-Time Dashboard
        print("\n[Chapter 03] Loading Executive Dashboard...")
        page.goto("http://localhost:5173/dashboard")
        page.wait_for_selector("text=Hello, Dr. Rajesh", timeout=15000)
        page.wait_for_selector("text=18,60,900", timeout=15000)

        # Inject clean broadcast CSS
        page.add_style_tag(
            content="""
            button:has-text("Install App"), a:has-text("Install App") { display: none !important; }
            ::-webkit-scrollbar { width: 0px; background: transparent; }
            """
        )
        time.sleep(1.0)
        log_event("dashboard_pulse_ready", "Executive Dashboard loaded with Rs. 18.6L Collections & 92.8% Attendance")

        # Smooth cursor trajectory across KPI metrics
        page.mouse.move(240, 520, steps=20)
        time.sleep(1.2)
        page.mouse.move(620, 520, steps=20)
        time.sleep(1.0)
        page.mouse.move(1020, 520, steps=20)
        time.sleep(1.0)

        # CHAPTER 05: Zero-Leakage Fee Counter & Revenue Inflow
        print("\n[Chapter 05] Switching to Fee Collection Analytics...")
        fee_tab = page.locator("button:has-text('Fee Collection')").first
        if fee_tab.is_visible():
            fee_tab.hover()
            time.sleep(0.3)
            fee_tab.click()
            page.wait_for_selector("text=Monthly Fee Inflow", timeout=8000)
            time.sleep(0.8)
            log_event("fee_counter_ready", "Fee Collection tab open with Rs. 28.5L Invoiced & Split Modes")

        page.mouse.move(420, 840, steps=20)
        time.sleep(1.2)
        log_event("fee_donut_methods", "Hovering Payment Methods Donut (UPI 24.6%, Bank 59.3%)")
        page.mouse.move(1420, 840, steps=20)
        time.sleep(1.2)

        # CHAPTER 04: Master Student Directory & DPDP Act Compliance
        print("\n[Chapter 04] Navigating to Student Master Directory...")
        page.goto("http://localhost:5173/students")
        page.wait_for_selector("text=Student Enrolment", timeout=15000)
        page.add_style_tag(
            content="""
            button:has-text("Install App"), a:has-text("Install App") { display: none !important; }
            ::-webkit-scrollbar { width: 0px; background: transparent; }
            """
        )
        time.sleep(0.8)
        log_event("students_view_lock", "Students workspace loaded with Rule 010 View-Mode Safety Lock")

        dir_tab = page.locator("button:has-text('Master Directory')").first
        if dir_tab.is_visible():
            dir_tab.hover()
            time.sleep(0.3)
            dir_tab.click()
            page.wait_for_selector("text=PA-2024-", timeout=12000)
            time.sleep(0.8)

        search_box = page.locator("input[placeholder*='Search' i]").first
        if search_box.is_visible():
            search_box.click()
            search_box.fill("")
            search_box.type("Aman", delay=120)
            page.wait_for_selector("text=PA-2024-000011", timeout=8000)
            time.sleep(1.0)
            log_event("student_search_aman", "Sub-second student search filtered record PA-2024-000011 Aman")

        # CHAPTER 06: EduBoard Interactive Classroom
        print("\n[Chapter 06] Navigating to EduBoard Workspace...")
        page.goto("http://localhost:5173/eduboard")
        page.wait_for_selector("text=EduBoard", timeout=15000)
        page.add_style_tag(
            content="""
            button:has-text("Install App"), a:has-text("Install App") { display: none !important; }
            ::-webkit-scrollbar { width: 0px; background: transparent; }
            """
        )
        time.sleep(1.5)
        log_event("eduboard_workspace_ready", "EduBoard tactile digital greenboard canvas and tools initialized")
        page.mouse.move(960, 540, steps=25)
        time.sleep(1.5)

        # CHAPTER 07: Attendance & QR Terminal
        print("\n[Chapter 07] Navigating to Attendance Hub...")
        page.goto("http://localhost:5173/attendance")
        page.wait_for_selector("text=Attendance", timeout=15000)
        page.add_style_tag(
            content="""
            button:has-text("Install App"), a:has-text("Install App") { display: none !important; }
            ::-webkit-scrollbar { width: 0px; background: transparent; }
            """
        )
        time.sleep(1.5)
        log_event("attendance_terminal", "Attendance hub and instant QR check-in terminal displayed")
        page.mouse.move(720, 480, steps=20)
        time.sleep(1.5)

        video_path = page.video.path()
        record_context.close()
        browser.close()

        # Save Events File
        EVENTS_FILE.write_text(json.dumps(events, indent=2), encoding="utf-8")
        print(f"\nWrote synchronized events manifest: {EVENTS_FILE} ({len(events)} events)")

        # Transcode clean MP4
        transcode_to_clean_mp4(video_path, str(TARGET_MP4))
        print("Master Software Demo Recording Finished Successfully!")


if __name__ == "__main__":
    record_master_software_demo()
