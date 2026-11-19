# /**
#  * @file        record_software_demonstrations.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      scripts
#  *
#  * @author      Jawahar R. Mallah
#  * @organization Smritisys & AITDL Networks
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 PrathamOne EduOS
#  * @license     Proprietary
#  *
#  * @version     1.141.0
#  * @created     2026-11-19
#  * @updated     2026-11-19
#  *
#  * @description Automated browser automation and screen-recording engine capturing authentic live demonstrations of PrathamOne EduOS workflows.
#  */

import os
import json
import time
import shutil
import av
from playwright.sync_api import sync_playwright

OUTPUT_DIR = "frontend/public/media/studio/recordings"
TEMP_DIR = "data/temp_recordings"

AUTH_DATA = {
    "state": {
        "user": {
            "id": 1,
            "username": "admin",
            "email": "admin@prathamone.com",
            "first_name": "Administrator",
            "role": "admin",
            "institution_id": 1,
            "permissions": ["all"],
        },
        "selectedInstitutionId": 1,
        "selectedAcademicYearId": 1,
    },
    "version": 0,
}

AUTH_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbiIsInJvbGUiOiJhZG1pbiIsImV4cCI6MTc5NTEzNTUzMSwidHlwZSI6ImFjY2VzcyIsImp0aSI6IjZ2dmExQmhXdWNCWHdMRWE5Uy0ySncifQ.vmj6NJ5A2ZJbRTfZNIlOrgBfoEPp6lmcEvktfgfx_6U"


def transcode_to_mp4(input_path: str, output_path: str):
    """
    Transcodes Playwright WebM recording to broadcast-standard H.264 MP4 using PyAV.
    """
    in_container = av.open(input_path)
    out_container = av.open(output_path, mode="w")

    in_video = in_container.streams.video[0]
    out_video = out_container.add_stream("h264", rate=30)
    out_video.width = in_video.width
    out_video.height = in_video.height
    out_video.pix_fmt = "yuv420p"
    out_video.bit_rate = 6000000  # 6 Mbps

    for frame in in_container.decode(in_video):
        for packet in out_video.encode(frame):
            out_container.mux(packet)

    for packet in out_video.encode():
        out_container.mux(packet)

    out_container.close()
    in_container.close()
    print(f"Transcoded MP4 saved: {output_path} ({os.path.getsize(output_path)} bytes)")


def setup_authenticated_context(browser, record_dir: str):
    context = browser.new_context(
        viewport={"width": 1920, "height": 1080},
        record_video_dir=record_dir,
        record_video_size={"width": 1920, "height": 1080},
    )
    context.add_cookies([
        {
            "name": "prashant_access_token",
            "value": AUTH_TOKEN,
            "domain": "localhost",
            "path": "/",
        }
    ])
    page = context.new_page()
    page.goto("http://localhost/", wait_until="domcontentloaded")
    page.evaluate(
        "authStr => window.localStorage.setItem('prashant-auth', authStr)",
        json.dumps(AUTH_DATA),
    )
    return context, page


def record_student_workflow(browser):
    """
    Demonstrates: Student Directory -> Real Search -> Open Dossier -> Tab Walkthrough -> Privacy Masking
    """
    print("Starting Student Workflow Recording...")
    temp_dir = os.path.join(TEMP_DIR, "students")
    os.makedirs(temp_dir, exist_ok=True)

    context, page = setup_authenticated_context(browser, temp_dir)

    page.goto("http://localhost/students")
    time.sleep(3)

    # 1. Search for student
    try:
        search_box = page.locator("input[placeholder*='Search'], input[type='search']").first
        if search_box.is_visible():
            search_box.click()
            search_box.type("Aman", delay=120)
            time.sleep(2)
    except Exception as e:
        print("Search interaction note:", e)

    # 2. Click on student row or link
    try:
        student_row = page.locator("table tbody tr, [data-testid*='student-row']").first
        if student_row.is_visible():
            student_row.click()
            time.sleep(3)
    except Exception as e:
        print("Row click note:", e)

    # 3. If navigated to dossier or still on page, explore tabs
    try:
        tabs = page.locator("nav button, [role='tab'], .tab-button")
        count = min(tabs.count(), 4)
        for i in range(count):
            tab = tabs.nth(i)
            if tab.is_visible():
                tab.click()
                time.sleep(1.5)
    except Exception as e:
        print("Tab exploration note:", e)

    # Smooth scroll down and up
    page.evaluate("window.scrollBy({ top: 350, behavior: 'smooth' })")
    time.sleep(2)
    page.evaluate("window.scrollBy({ top: -350, behavior: 'smooth' })")
    time.sleep(2)

    video_path = page.video.path()
    context.close()

    # Transcode
    final_output = os.path.join(OUTPUT_DIR, "demo_student_workflow.mp4")
    transcode_to_mp4(video_path, final_output)


def record_fees_workflow(browser):
    """
    Demonstrates: Fees Workspace -> Fee Structures -> Collection Desk -> Payment Modes
    """
    print("Starting Fees Workflow Recording...")
    temp_dir = os.path.join(TEMP_DIR, "fees")
    os.makedirs(temp_dir, exist_ok=True)

    context, page = setup_authenticated_context(browser, temp_dir)

    page.goto("http://localhost/fees")
    time.sleep(3)

    # Explore Fee structures or overview
    page.evaluate("window.scrollBy({ top: 300, behavior: 'smooth' })")
    time.sleep(2)
    page.evaluate("window.scrollBy({ top: -300, behavior: 'smooth' })")
    time.sleep(1.5)

    # Navigate to collection desk
    try:
        page.goto("http://localhost/fees/collection")
        time.sleep(3)
        student_input = page.locator("input[placeholder*='Student'], input[placeholder*='Search']").first
        if student_input.is_visible():
            student_input.click()
            student_input.type("Avner", delay=120)
            time.sleep(2)
    except Exception as e:
        print("Collection desk interaction note:", e)

    video_path = page.video.path()
    context.close()

    final_output = os.path.join(OUTPUT_DIR, "demo_fees_workflow.mp4")
    transcode_to_mp4(video_path, final_output)


def record_attendance_workflow(browser):
    """
    Demonstrates: Attendance Register -> Roll Call Grid -> QR Terminal Mode
    """
    print("Starting Attendance Workflow Recording...")
    temp_dir = os.path.join(TEMP_DIR, "attendance")
    os.makedirs(temp_dir, exist_ok=True)

    context, page = setup_authenticated_context(browser, temp_dir)

    page.goto("http://localhost/attendance")
    time.sleep(3)

    # Scroll through attendance grid
    page.evaluate("window.scrollBy({ top: 250, behavior: 'smooth' })")
    time.sleep(2)
    page.evaluate("window.scrollBy({ top: -250, behavior: 'smooth' })")
    time.sleep(1.5)

    # Click on QR Terminal or daily roll call if available
    try:
        qr_btn = page.locator("a:has-text('QR Terminal'), button:has-text('QR')").first
        if qr_btn.is_visible():
            qr_btn.click()
            time.sleep(3)
    except Exception as e:
        print("QR terminal navigation note:", e)

    video_path = page.video.path()
    context.close()

    final_output = os.path.join(OUTPUT_DIR, "demo_attendance_workflow.mp4")
    transcode_to_mp4(video_path, final_output)


def record_eduboard_workflow(browser):
    """
    Demonstrates: EduBoard Classroom -> Chalkboard Canvas -> PDF Slide Presentation
    """
    print("Starting EduBoard Workflow Recording...")
    temp_dir = os.path.join(TEMP_DIR, "eduboard")
    os.makedirs(temp_dir, exist_ok=True)

    context, page = setup_authenticated_context(browser, temp_dir)

    page.goto("http://localhost/eduboard")
    time.sleep(3)

    # Interact with chalkboard canvas
    try:
        canvas = page.locator("canvas").first
        if canvas.is_visible():
            box = canvas.bounding_box()
            if box:
                # Simulate smooth drawing strokes on board
                cx = box["x"] + box["width"] / 2
                cy = box["y"] + box["height"] / 2
                page.mouse.move(cx - 100, cy - 50)
                page.mouse.down()
                page.mouse.move(cx + 100, cy - 50, steps=10)
                page.mouse.move(cx, cy + 80, steps=10)
                page.mouse.move(cx - 100, cy - 50, steps=10)
                page.mouse.up()
                time.sleep(2)
    except Exception as e:
        print("Canvas drawing note:", e)

    video_path = page.video.path()
    context.close()

    final_output = os.path.join(OUTPUT_DIR, "demo_eduboard_workflow.mp4")
    transcode_to_mp4(video_path, final_output)


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    os.makedirs(TEMP_DIR, exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        print("Playwright launched Chromium. Executing demonstration recordings...")

        record_student_workflow(browser)
        record_fees_workflow(browser)
        record_attendance_workflow(browser)
        record_eduboard_workflow(browser)

        browser.close()

    print("All live demonstration workflow recordings completed successfully!")


if __name__ == "__main__":
    main()
