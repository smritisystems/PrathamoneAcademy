# /**
#  * @file        record_students_only.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      scripts
#  *
#  * @author      Jawahar R. Mallah
#  * @organization Smritisys & AITDL Networks
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 PrathamOne EduOS
#  * @license     Proprietary
#  *
#  * @version     2.0.0
#  * @created     2026-11-19
#  * @updated     2026-11-19
#  *
#  * @description High-fidelity re-recording of Module 04 (Master Student Directory & Live Instant Search) with broadcast cursor and real tabular filtering.
#  */

import os
import time
import json
from pathlib import Path
import av
from playwright.sync_api import sync_playwright

OUTPUT_DIR = Path("assets/captures")
COMMERCIAL_CAPTURES = Path("data/commercial/captures")
TEMP_DIR = Path("data/temp_commercial_recordings")
AUTH_FILE = Path("data/temp_commercial_recordings/auth_state_director.json")

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
COMMERCIAL_CAPTURES.mkdir(parents=True, exist_ok=True)
TEMP_DIR.mkdir(parents=True, exist_ok=True)

CURSOR_SCRIPT = """
(() => {
    if (document.getElementById('broadcast-cursor')) return;
    const cursor = document.createElement('div');
    cursor.id = 'broadcast-cursor';
    cursor.style.position = 'fixed';
    cursor.style.width = '24px';
    cursor.style.height = '24px';
    cursor.style.borderRadius = '50%';
    cursor.style.backgroundColor = 'rgba(241, 105, 6, 0.88)';
    cursor.style.border = '2.5px solid #ffffff';
    cursor.style.boxShadow = '0 0 14px rgba(241, 105, 6, 0.9), 0 3px 8px rgba(0,0,0,0.5)';
    cursor.style.pointerEvents = 'none';
    cursor.style.zIndex = '9999999';
    cursor.style.transform = 'translate(-50%, -50%)';
    cursor.style.transition = 'transform 0.06s ease-out';
    cursor.style.left = '960px';
    cursor.style.top = '540px';
    document.body.appendChild(cursor);

    const style = document.createElement('style');
    style.textContent = `
        @keyframes cursorRipple {
            0% { transform: translate(-50%, -50%) scale(0.8); opacity: 1; }
            100% { transform: translate(-50%, -50%) scale(2.6); opacity: 0; }
        }
    `;
    document.head.appendChild(style);

    window.addEventListener('mousemove', (e) => {
        cursor.style.left = e.clientX + 'px';
        cursor.style.top = e.clientY + 'px';
    });

    window.addEventListener('mousedown', (e) => {
        const ripple = document.createElement('div');
        ripple.style.position = 'fixed';
        ripple.style.left = e.clientX + 'px';
        ripple.style.top = e.clientY + 'px';
        ripple.style.width = '18px';
        ripple.style.height = '18px';
        ripple.style.borderRadius = '50%';
        ripple.style.border = '3px solid #F16906';
        ripple.style.boxShadow = '0 0 8px rgba(241, 105, 6, 0.8)';
        ripple.style.transform = 'translate(-50%, -50%) scale(1)';
        ripple.style.pointerEvents = 'none';
        ripple.style.zIndex = '9999998';
        ripple.style.animation = 'cursorRipple 0.45s ease-out forwards';
        document.body.appendChild(ripple);
        setTimeout(() => ripple.remove(), 500);
    });
})();
"""


def transcode_to_clean_mp4(webm_path: str, mp4_path: Path):
    """Transcodes the recorded WebM to clean 1080p H.264 MP4."""
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


def main():
    print("Recording Module 04: Master Student Directory & Live Search...")
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

        ctx = browser.new_context(
            storage_state=str(AUTH_FILE),
            viewport={"width": 1920, "height": 1080},
            record_video_dir=str(TEMP_DIR),
            record_video_size={"width": 1920, "height": 1080},
        )
        page = ctx.new_page()
        page.goto("http://localhost:5173/students/directory")
        page.wait_for_load_state("networkidle")
        page.wait_for_selector("text=Master Student Directory", timeout=15000)
        page.wait_for_selector("text=PA-2024-", timeout=15000)
        page.evaluate(CURSOR_SCRIPT)
        time.sleep(1.2)

        # 1. Hover over initial student table rows (showing 10 canonical students)
        page.mouse.move(500, 480, steps=20)
        time.sleep(2.0)
        page.mouse.move(960, 520, steps=25)
        time.sleep(2.5)

        # 2. Click Search Box and type "Aarav"
        search_box = page.locator("input[placeholder*='Search' i]").first
        if search_box.is_visible():
            search_box.click()
            time.sleep(0.6)
            search_box.fill("")
            search_box.type("Aarav", delay=140)
            time.sleep(2.0)

        # 3. Hover over filtered Aarav Sharma row
        page.mouse.move(300, 480, steps=20)
        time.sleep(2.0)
        page.mouse.move(960, 480, steps=25)
        time.sleep(2.5)
        page.mouse.move(1780, 480, steps=25)
        time.sleep(3.0)

        # 4. Clear search box to show entire directory returning smoothly
        search_box.click()
        time.sleep(0.5)
        search_box.fill("")
        time.sleep(3.0)

        webm_path = page.video.path()
        ctx.close()
        browser.close()

        out_stud = OUTPUT_DIR / "demo_04_students_1080p.mp4"
        transcode_to_clean_mp4(webm_path, out_stud)
        (COMMERCIAL_CAPTURES / "demo_04_students_1080p.mp4").write_bytes(out_stud.read_bytes())
        print("Module 04 recording and sync complete!")


if __name__ == "__main__":
    main()
