# /**
#  * @file        record_studio_modules.py
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
#  * @description Dedicated multi-module browser automation recording 20-24s clean kiosk demo videos for each chapter.
#  */

import os
import time
import av
from pathlib import Path
from playwright.sync_api import sync_playwright

CAPTURES_DIR = Path("data/commercial/captures")
TEMP_DIR = Path("data/temp_commercial_recordings")
AUTH_FILE = Path("data/temp_commercial_recordings/auth_state_director.json")
CAPTURES_DIR.mkdir(parents=True, exist_ok=True)
TEMP_DIR.mkdir(parents=True, exist_ok=True)


def transcode_to_clean_mp4(webm_path: str, mp4_path: Path):
    """Transcodes the recorded WebM to 1080p H.264 MP4."""
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
    print(f"Transcoded clean module video: {mp4_path} ({mp4_path.stat().st_size} bytes)")


def record_all_modules():
    print("=================================================================")
    print("  RECORDING DEDICATED CHAPTER MODULE VIDEOS (20-24s EACH)")
    print("=================================================================")

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

        # Step 0: Ensure valid director auth state
        print("Checking Director authentication status...")
        auth_context = browser.new_context(viewport={"width": 1920, "height": 1080})
        auth_page = auth_context.new_page()
        auth_page.goto("http://localhost:5173/login")
        auth_page.wait_for_selector("#login-username", timeout=10000)
        auth_page.fill("#login-username", "admin@prathamone.com")
        auth_page.fill("#login-password", "Admin@2026!")
        auth_page.click("button[type='submit']")
        auth_page.wait_for_url("**/dashboard", timeout=15000)
        auth_page.wait_for_selector("text=Hello, Dr. Rajesh", timeout=12000)
        auth_context.storage_state(path=str(AUTH_FILE))
        auth_context.close()
        print("Authenticated as Dr. Rajesh Kulkarni (Director) & cached session.")

        def make_context():
            return browser.new_context(
                storage_state=str(AUTH_FILE),
                viewport={"width": 1920, "height": 1080},
                record_video_dir=str(TEMP_DIR),
                record_video_size={"width": 1920, "height": 1080},
            )

        def inject_broadcast_css(page):
            page.add_style_tag(
                content="""
                button:has-text("Install App"), a:has-text("Install App") { display: none !important; }
                div:has-text("Activation"), div:has-text("TOP PICK"), div:has-text("Hold expires") { display: none !important; }
                div:has-text("Read-Only Student"), span:has-text("Read-Only") { display: none !important; }
                ::-webkit-scrollbar { width: 0px; background: transparent; }
                """
            )

        # -----------------------------------------------------------------
        # MODULE 03: Executive Dashboard (22s)
        # -----------------------------------------------------------------
        print("\n[Module 03] Recording Executive Dashboard (22s)...")
        ctx = make_context()
        page = ctx.new_page()
        page.goto("http://localhost:5173/dashboard")
        page.wait_for_selector("text=Hello, Dr. Rajesh", timeout=15000)
        page.wait_for_selector("text=18,60,900", timeout=15000)
        inject_broadcast_css(page)
        time.sleep(2.0)

        # Smooth mouse trajectories across KPI cards and charts
        page.mouse.move(240, 520, steps=25)
        time.sleep(2.5)
        page.mouse.move(620, 520, steps=25)
        time.sleep(2.5)
        page.mouse.move(1020, 520, steps=25)
        time.sleep(2.5)
        page.mouse.move(1420, 520, steps=25)
        time.sleep(2.5)
        page.evaluate("window.scrollBy({ top: 220, behavior: 'smooth' })")
        time.sleep(4.0)
        page.evaluate("window.scrollBy({ top: -220, behavior: 'smooth' })")
        time.sleep(4.0)

        webm_path = page.video.path()
        ctx.close()
        transcode_to_clean_mp4(webm_path, CAPTURES_DIR / "demo_03_dashboard_1080p.mp4")

        # -----------------------------------------------------------------
        # MODULE 04: Master Student Directory & Search (24s)
        # -----------------------------------------------------------------
        print("\n[Module 04] Recording Student Master Directory & Search (24s)...")
        ctx = make_context()
        page = ctx.new_page()
        page.goto("http://localhost:5173/students")
        page.wait_for_selector("text=Student Enrolment", timeout=15000)
        inject_broadcast_css(page)
        time.sleep(1.0)
        dir_tab = page.locator("button:has-text('Master Directory')").first
        if dir_tab.is_visible():
            dir_tab.click()
            time.sleep(1.5)

        # Allow full directory of populated students to settle on screen
        page.mouse.move(500, 360, steps=20)
        time.sleep(2.0)
        page.mouse.move(960, 460, steps=25)
        time.sleep(3.0)

        # Search "Aarav" in the search box
        search_box = page.locator("input[placeholder*='Search' i]").first
        if search_box.is_visible():
            search_box.click()
            time.sleep(0.8)
            search_box.fill("")
            search_box.type("Aarav", delay=140)
            time.sleep(2.5)

        # Hover over Aarav Sharma's action row and View Dossier button
        page.mouse.move(960, 410, steps=20)
        time.sleep(2.5)
        page.mouse.move(1780, 410, steps=25)
        time.sleep(3.0)
        page.evaluate("window.scrollBy({ top: 100, behavior: 'smooth' })")
        time.sleep(2.5)
        page.evaluate("window.scrollBy({ top: -100, behavior: 'smooth' })")
        time.sleep(2.5)

        webm_path = page.video.path()
        ctx.close()
        transcode_to_clean_mp4(webm_path, CAPTURES_DIR / "demo_04_students_1080p.mp4")

        # -----------------------------------------------------------------
        # MODULE 05: Fee Collection & Reconciliation (22s)
        # -----------------------------------------------------------------
        print("\n[Module 05] Recording Fee Collection Analytics (22s)...")
        ctx = make_context()
        page = ctx.new_page()
        page.goto("http://localhost:5173/dashboard")
        page.wait_for_selector("text=Hello, Dr. Rajesh", timeout=15000)
        inject_broadcast_css(page)
        time.sleep(1.0)
        fee_tab = page.locator("button:has-text('Fee Collection')").first
        if fee_tab.is_visible():
            fee_tab.click()
            time.sleep(2.0)

        # Explore Monthly Inflow bar chart and Payment Methods donut
        page.mouse.move(420, 840, steps=30)
        time.sleep(3.5)
        page.mouse.move(680, 840, steps=25)
        time.sleep(3.5)
        page.mouse.move(1420, 840, steps=30)
        time.sleep(4.0)
        page.evaluate("window.scrollBy({ top: 180, behavior: 'smooth' })")
        time.sleep(4.0)
        page.evaluate("window.scrollBy({ top: -180, behavior: 'smooth' })")
        time.sleep(3.0)

        webm_path = page.video.path()
        ctx.close()
        transcode_to_clean_mp4(webm_path, CAPTURES_DIR / "demo_05_fees_1080p.mp4")

        # -----------------------------------------------------------------
        # MODULE 06: EduBoard Interactive Classroom (20s)
        # -----------------------------------------------------------------
        print("\n[Module 06] Recording Fresh EduBoard Workspace (20s)...")
        ctx = make_context()
        page = ctx.new_page()
        page.goto("http://localhost:5173/eduboard/4")
        page.wait_for_selector("text=EduBoard", timeout=15000)
        page.wait_for_selector("canvas", timeout=15000)
        inject_broadcast_css(page)
        time.sleep(2.5)

        # Smooth, deliberate chalk & geometry inspection
        # Move along Resultant Vector R
        page.mouse.move(440, 360, steps=30)
        time.sleep(3.0)
        # Move along Horizontal Component Rx
        page.mouse.move(440, 508, steps=25)
        time.sleep(3.0)
        # Move along Vertical Component Ry
        page.mouse.move(655, 350, steps=25)
        time.sleep(3.0)
        # Move to Analytical Kinematics Formulas Card on the right
        page.mouse.move(1020, 260, steps=30)
        time.sleep(3.5)
        page.mouse.move(1020, 420, steps=25)
        time.sleep(4.0)

        webm_path = page.video.path()
        ctx.close()
        transcode_to_clean_mp4(webm_path, CAPTURES_DIR / "demo_06_eduboard_1080p.mp4")

        # -----------------------------------------------------------------
        # MODULE 07: Attendance Hub & QR Terminal (20s)
        # -----------------------------------------------------------------
        print("\n[Module 07] Recording Attendance Hub & QR Terminal (20s)...")
        ctx = make_context()
        page = ctx.new_page()
        page.goto("http://localhost:5173/attendance")
        page.wait_for_selector("text=Attendance", timeout=15000)
        inject_broadcast_css(page)
        time.sleep(2.0)

        # Move to Open QR Attendance Terminal button and click
        qr_btn = page.locator("button:has-text('Open QR Attendance Terminal')").first
        if qr_btn.is_visible():
            page.mouse.move(1600, 140, steps=25)
            time.sleep(1.0)
            qr_btn.click()
            time.sleep(2.0)

        # Now inside QR Terminal: Find scanner input
        scan_input = page.locator("input[placeholder*='Scan QR' i]").first
        if scan_input.is_visible():
            scan_input.click()
            time.sleep(0.8)
            scan_input.type("PA-2024-000011", delay=120)
            time.sleep(0.5)
            page.keyboard.press("Enter")
            time.sleep(2.5)

        # Hover over the check-in confirmation & live scan stream
        page.mouse.move(960, 520, steps=25)
        time.sleep(3.5)
        page.mouse.move(1400, 520, steps=25)
        time.sleep(4.0)

        webm_path = page.video.path()
        ctx.close()
        transcode_to_clean_mp4(webm_path, CAPTURES_DIR / "demo_07_attendance_1080p.mp4")

        browser.close()
        print("\n=================================================================")
        print("  ALL 5 DEDICATED MODULE VIDEOS RECORDED SUCCESSFULLY!")
        print(f"  Directory: {CAPTURES_DIR.resolve()}")
        print("=================================================================")


if __name__ == "__main__":
    record_all_modules()
