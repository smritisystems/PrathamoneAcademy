# /**
#  * @file        record_clean_software_demo.py
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
#  * @description Source component for Record Clean Software Demo in the scripts module.
#  */

import os
import time
import av
from playwright.sync_api import sync_playwright

OUTPUT_DIR = "frontend/public/media/commercial"
TEMP_DIR = "data/temp_commercial_recordings"
AUTH_FILE = "data/temp_commercial_recordings/auth_state.json"
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(TEMP_DIR, exist_ok=True)


def transcode_to_clean_mp4(webm_path: str, mp4_path: str):
    """Transcodes the recorded WebM to clean 1080p H.264 MP4."""
    in_container = av.open(webm_path)
    out_container = av.open(mp4_path, mode="w")

    in_video = in_container.streams.video[0]
    out_video = out_container.add_stream("h264", rate=30)
    out_video.width = 1920
    out_video.height = 1080
    out_video.pix_fmt = "yuv420p"
    out_video.bit_rate = 8000000

    for frame in in_container.decode(in_video):
        if frame.width != 1920 or frame.height != 1080:
            frame = frame.reformat(width=1920, height=1080, format="yuv420p")
        for packet in out_video.encode(frame):
            out_container.mux(packet)

    for packet in out_video.encode():
        out_container.mux(packet)

    out_container.close()
    in_container.close()
    print(f"Transcoded clean MP4: {mp4_path} ({os.path.getsize(mp4_path)} bytes)")


def record_authenticated_showcase():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        # Phase 1: Login and save authenticated state
        print("Phase 1: Authenticating admin session...")
        auth_context = browser.new_context(viewport={"width": 1920, "height": 1080})
        page = auth_context.new_page()
        page.goto("http://localhost:5173/login")
        page.locator("input#username, input[type='text'], input[placeholder*='email' i]").first.fill("admin@prathamone.com")
        page.locator("input[type='password']").first.fill("Admin@2026!")
        page.locator("button[type='submit'], button:has-text('Sign in')").first.click()
        page.wait_for_selector("text=Hello, Admin", timeout=15000)
        time.sleep(2)
        auth_context.storage_state(path=AUTH_FILE)
        auth_context.close()
        print("Authenticated state saved.")

        # Phase 2: Record with clean session
        print("Phase 2: Recording clean live software interaction...")
        record_context = browser.new_context(
            storage_state=AUTH_FILE,
            viewport={"width": 1920, "height": 1080},
            record_video_dir=TEMP_DIR,
            record_video_size={"width": 1920, "height": 1080},
        )
        rec_page = record_context.new_page()

        # Step 1: Open Dashboard (already authenticated)
        rec_page.goto("http://localhost:5173/dashboard")
        rec_page.wait_for_selector("text=Hello, Admin", timeout=15000)
        time.sleep(1.5)

        # Smooth mouse motion over KPIs
        rec_page.mouse.move(250, 520, steps=15)
        time.sleep(0.6)
        rec_page.mouse.move(500, 520, steps=15)
        time.sleep(0.6)

        # Switch to Fee Collection tab
        fee_tab = rec_page.locator("button:has-text('Fee Collection')").first
        if fee_tab.is_visible():
            fee_tab.hover()
            time.sleep(0.4)
            fee_tab.click()
            time.sleep(2.0)

        # Step 2: Navigate directly to Students Directory
        rec_page.goto("http://localhost:5173/students")
        rec_page.wait_for_load_state("networkidle")
        time.sleep(1.5)

        # Step 3: Search for a student in real-time
        search_box = rec_page.locator("input[placeholder*='Search' i], input[type='search'], input[type='text']").first
        if search_box.is_visible():
            search_box.click()
            search_box.type("Aman", delay=140)
            time.sleep(1.8)

        # Step 4: Scroll down smoothly to show results table
        rec_page.evaluate("window.scrollBy({ top: 220, behavior: 'smooth' })")
        time.sleep(1.5)

        video_path = rec_page.video.path()
        record_context.close()
        browser.close()

        final_mp4 = os.path.join(OUTPUT_DIR, "live_software_demo_clean.mp4")
        transcode_to_clean_mp4(video_path, final_mp4)
        print("Live software recording complete!")


if __name__ == "__main__":
    record_authenticated_showcase()
