# /**
#  * @file        record_live_authenticated_demo.py
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
#  * @description Source component for Record Live Authenticated Demo in the scripts module.
#  */

import os
import time
import av
from playwright.sync_api import sync_playwright

OUTPUT_DIR = "frontend/public/media/commercial"
TEMP_DIR = "data/temp_commercial_recordings"
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
    out_video.bit_rate = 8000000  # 8 Mbps crisp quality

    for frame in in_container.decode(in_video):
        # Scale to 1080p if needed
        if frame.width != 1920 or frame.height != 1080:
            frame = frame.reformat(width=1920, height=1080, format="yuv420p")
        for packet in out_video.encode(frame):
            out_container.mux(packet)

    for packet in out_video.encode():
        out_container.mux(packet)

    out_container.close()
    in_container.close()
    print(f"Transcoded clean MP4: {mp4_path} ({os.path.getsize(mp4_path)} bytes)")


def record_live_demo():
    print("Recording live authenticated PrathamOne EduOS interaction...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1920, "height": 1080},
            record_video_dir=TEMP_DIR,
            record_video_size={"width": 1920, "height": 1080},
        )
        page = context.new_page()

        # Step 1: Login
        page.goto("http://localhost:5173/login")
        page.locator("input#username, input[type='text'], input[placeholder*='email' i], input[placeholder*='username' i]").first.fill("admin@prathamone.com")
        page.locator("input[type='password']").first.fill("Admin@2026!")
        page.locator("button[type='submit'], button:has-text('Sign in')").first.click()
        page.wait_for_load_state("networkidle")
        time.sleep(2)

        # Step 2: Dashboard Overview & Tab Inspection
        page.mouse.move(960, 400, steps=25)
        time.sleep(1)
        
        # Click "Fee Collection" tab on dashboard
        fee_tab = page.locator("button:has-text('Fee Collection'), [role='tab']:has-text('Fee Collection')").first
        if fee_tab.is_visible():
            fee_tab.hover()
            time.sleep(0.5)
            fee_tab.click()
            time.sleep(1.5)

        # Step 3: Navigate to Students Directory
        student_nav = page.locator("button:has-text('Students'), a[href*='/students']").first
        if student_nav.is_visible():
            student_nav.hover()
            time.sleep(0.5)
            student_nav.click()
            time.sleep(1.5)

        # Step 4: Search for a student
        search_input = page.locator("input[placeholder*='Search' i], input[type='search']").first
        if search_input.is_visible():
            search_input.click()
            search_input.type("Aman", delay=120)
            time.sleep(2)

        # Step 5: Smooth scroll down to inspect results
        page.evaluate("window.scrollBy({ top: 250, behavior: 'smooth' })")
        time.sleep(1.5)
        page.evaluate("window.scrollBy({ top: -250, behavior: 'smooth' })")
        time.sleep(1.5)

        video_path = page.video.path()
        context.close()
        browser.close()

        target_mp4 = os.path.join(OUTPUT_DIR, "live_software_demo_raw.mp4")
        transcode_to_clean_mp4(video_path, target_mp4)


if __name__ == "__main__":
    record_live_demo()
