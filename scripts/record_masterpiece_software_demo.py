# /**
#  * @file        record_masterpiece_software_demo.py
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
#  * @description Source component for Record Masterpiece Software Demo in the scripts module.
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


def record_masterpiece():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        record_context = browser.new_context(
            storage_state=AUTH_FILE,
            viewport={"width": 1920, "height": 1080},
            record_video_dir=TEMP_DIR,
            record_video_size={"width": 1920, "height": 1080},
        )
        page = record_context.new_page()

        # Step 1: Open Dashboard
        print("Opening dashboard...")
        page.goto("http://localhost:5173/dashboard")
        page.wait_for_selector("text=Hello, Admin", timeout=15000)
        time.sleep(1.0)

        # Mouse hover across KPIs
        page.mouse.move(250, 520, steps=15)
        time.sleep(0.5)
        page.mouse.move(650, 520, steps=15)
        time.sleep(0.5)

        # Click Fee Collection tab
        fee_tab = page.locator("button:has-text('Fee Collection')").first
        if fee_tab.is_visible():
            fee_tab.hover()
            time.sleep(0.3)
            fee_tab.click()
            time.sleep(1.8)

        # Step 2: Open Students Workspace
        print("Navigating to students...")
        page.goto("http://localhost:5173/students")
        page.wait_for_selector("text=Student Enrolment", timeout=15000)
        time.sleep(1.0)

        # Click Master Directory tab
        dir_tab = page.locator("button:has-text('Master Directory')").first
        if dir_tab.is_visible():
            dir_tab.hover()
            time.sleep(0.3)
            dir_tab.click()
            time.sleep(1.2)

        # Search box interaction
        search_box = page.locator("input[placeholder*='Search' i], input[type='search'], input[type='text']").first
        if search_box.is_visible():
            search_box.click()
            search_box.type("Aman", delay=120)
            time.sleep(1.5)

        # Smooth scroll down
        page.evaluate("window.scrollBy({ top: 200, behavior: 'smooth' })")
        time.sleep(1.2)

        video_path = page.video.path()
        record_context.close()
        browser.close()

        target_mp4 = os.path.join(OUTPUT_DIR, "live_software_demo_master.mp4")
        transcode_to_clean_mp4(video_path, target_mp4)
        print("Master recording saved:", target_mp4)


if __name__ == "__main__":
    record_masterpiece()
