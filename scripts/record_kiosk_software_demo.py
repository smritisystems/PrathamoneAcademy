# /**
#  * @file        record_kiosk_software_demo.py
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
#  * @description Automated kiosk-mode browser recording capturing settled UI states, animated orange broadcast cursor, and event logging for Dashboard, Student Directory, Fee Collection, fresh EduBoard, and Attendance QR Terminal.
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
EVENTS_FILE = Path("assets/captures/kiosk_demo_events.json")
COMMERCIAL_EVENTS = Path("data/commercial/kiosk_demo_events.json")

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
            100% { transform: translate(-50%, -50%) scale(3.5); opacity: 0; }
        }
        button:has-text("Install App"), a:has-text("Install App") { display: none !important; }
        div:has-text("Activation"), div:has-text("TOP PICK"), div:has-text("Hold expires") { display: none !important; }
        div:has-text("Read-Only Student"), span:has-text("Read-Only") { display: none !important; }
        ::-webkit-scrollbar { width: 0px; background: transparent; }
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


def record_kiosk_demo():
    print("=================================================================")
    print("  RECORDING V2 CLEAN KIOSK DEMOS WITH BROADCAST CURSOR & EVENTS")
    print("=================================================================")

    events_log = []

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

        def make_context():
            return browser.new_context(
                storage_state=str(AUTH_FILE),
                viewport={"width": 1920, "height": 1080},
                record_video_dir=str(TEMP_DIR),
                record_video_size={"width": 1920, "height": 1080},
            )

        # -----------------------------------------------------------------
        # MODULE 03: Executive Dashboard (22s)
        # -----------------------------------------------------------------
        print("\n[Module 03] Recording Executive Dashboard...")
        ctx = make_context()
        page = ctx.new_page()
        page.goto("http://localhost:5173/dashboard")
        page.wait_for_load_state("networkidle")
        page.wait_for_selector("text=Hello, Dr. Rajesh", timeout=15000)
        page.wait_for_selector("text=18,60,900", timeout=15000)
        page.evaluate(CURSOR_SCRIPT)
        time.sleep(1.0)
        events_log.append({"event": "dashboard_settled", "t": 1.0})

        # Hover over live KPIs
        page.mouse.move(240, 520, steps=25)
        events_log.append({"event": "dashboard_kpi_collections", "t": 2.5})
        time.sleep(2.5)
        page.mouse.move(620, 520, steps=25)
        events_log.append({"event": "dashboard_kpi_attendance", "t": 5.5})
        time.sleep(2.5)
        page.mouse.move(1020, 520, steps=25)
        time.sleep(2.5)
        page.mouse.move(1420, 520, steps=25)
        time.sleep(2.5)
        page.evaluate("window.scrollBy({ top: 220, behavior: 'smooth' })")
        time.sleep(4.0)
        page.evaluate("window.scrollBy({ top: -220, behavior: 'smooth' })")
        time.sleep(3.0)

        webm_path = page.video.path()
        ctx.close()
        out_dash = OUTPUT_DIR / "demo_03_dashboard_1080p.mp4"
        transcode_to_clean_mp4(webm_path, out_dash)
        (COMMERCIAL_CAPTURES / "demo_03_dashboard_1080p.mp4").write_bytes(out_dash.read_bytes())

        # -----------------------------------------------------------------
        # MODULE 04: Master Student Directory & Search (24s)
        # -----------------------------------------------------------------
        print("\n[Module 04] Recording Student Master Directory & Search...")
        ctx = make_context()
        page = ctx.new_page()
        page.goto("http://localhost:5173/students")
        page.wait_for_load_state("networkidle")
        page.wait_for_selector("text=Student Enrolment", timeout=15000)
        page.evaluate(CURSOR_SCRIPT)
        time.sleep(0.8)

        dir_tab = page.locator("button:has-text('Master Directory')").first
        if dir_tab.is_visible():
            dir_tab.click()
            page.wait_for_selector("text=PA-2024-", timeout=12000)
            time.sleep(1.0)

        events_log.append({"event": "students_directory_settled", "t": 1.0})

        # Allow 8+ sample student records to be clearly seen
        page.mouse.move(500, 360, steps=20)
        time.sleep(2.0)
        page.mouse.move(960, 460, steps=25)
        time.sleep(3.0)

        # Search "Aarav"
        search_box = page.locator("input[placeholder*='Search' i]").first
        if search_box.is_visible():
            search_box.click()
            time.sleep(0.8)
            search_box.fill("")
            events_log.append({"event": "student_search_start", "t": 7.0})
            search_box.type("Aarav", delay=140)
            events_log.append({"event": "student_search_aarav_filtered", "t": 9.5})
            time.sleep(2.5)

        # Hover over Aarav Sharma row
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
        out_stud = OUTPUT_DIR / "demo_04_students_1080p.mp4"
        transcode_to_clean_mp4(webm_path, out_stud)
        (COMMERCIAL_CAPTURES / "demo_04_students_1080p.mp4").write_bytes(out_stud.read_bytes())

        # -----------------------------------------------------------------
        # MODULE 05: Fee Collection & Reconciliation (22s)
        # -----------------------------------------------------------------
        print("\n[Module 05] Recording Fee Collection Analytics...")
        ctx = make_context()
        page = ctx.new_page()
        page.goto("http://localhost:5173/dashboard")
        page.wait_for_load_state("networkidle")
        page.wait_for_selector("text=Hello, Dr. Rajesh", timeout=15000)
        page.evaluate(CURSOR_SCRIPT)
        time.sleep(1.0)

        fee_tab = page.locator("button:has-text('Fee Collection')").first
        if fee_tab.is_visible():
            fee_tab.click()
            page.wait_for_selector("text=Monthly Fee Inflow", timeout=12000)
            time.sleep(1.5)

        events_log.append({"event": "fee_tab_settled", "t": 1.5})

        # Hover over monthly inflow bar chart & payment methods donut
        page.mouse.move(420, 840, steps=30)
        events_log.append({"event": "fee_inflow_chart_hover", "t": 4.0})
        time.sleep(3.5)
        page.mouse.move(680, 840, steps=25)
        time.sleep(3.5)
        page.mouse.move(1420, 840, steps=30)
        events_log.append({"event": "fee_payment_donut_hover", "t": 11.5})
        time.sleep(4.0)
        page.evaluate("window.scrollBy({ top: 180, behavior: 'smooth' })")
        time.sleep(4.0)
        page.evaluate("window.scrollBy({ top: -180, behavior: 'smooth' })")
        time.sleep(2.5)

        webm_path = page.video.path()
        ctx.close()
        out_fees = OUTPUT_DIR / "demo_05_fees_1080p.mp4"
        transcode_to_clean_mp4(webm_path, out_fees)
        (COMMERCIAL_CAPTURES / "demo_05_fees_1080p.mp4").write_bytes(out_fees.read_bytes())

        # -----------------------------------------------------------------
        # MODULE 06: Fresh EduBoard Interactive Classroom (20s)
        # -----------------------------------------------------------------
        print("\n[Module 06] Recording Fresh EduBoard Workspace...")
        ctx = make_context()
        page = ctx.new_page()
        page.goto("http://localhost:5173/eduboard/4")
        page.wait_for_load_state("networkidle")
        page.wait_for_selector("text=EduBoard", timeout=15000)
        page.wait_for_selector("canvas", timeout=15000)
        page.evaluate(CURSOR_SCRIPT)
        time.sleep(2.5)

        events_log.append({"event": "eduboard_canvas_settled", "t": 1.0})

        # Smooth, deliberate chalk & geometry inspection
        # Move along Resultant Vector R
        page.mouse.move(440, 360, steps=30)
        events_log.append({"event": "eduboard_vector_r_hover", "t": 3.5})
        time.sleep(3.0)
        # Move along Horizontal Component Rx
        page.mouse.move(440, 508, steps=25)
        time.sleep(3.0)
        # Move along Vertical Component Ry
        page.mouse.move(655, 350, steps=25)
        time.sleep(3.0)
        # Move to Analytical Kinematics Formulas Card on the right
        page.mouse.move(1020, 260, steps=30)
        events_log.append({"event": "eduboard_formulae_hover", "t": 12.5})
        time.sleep(3.5)
        page.mouse.move(1020, 420, steps=25)
        time.sleep(4.0)

        webm_path = page.video.path()
        ctx.close()
        out_edu = OUTPUT_DIR / "demo_06_eduboard_1080p.mp4"
        transcode_to_clean_mp4(webm_path, out_edu)
        (COMMERCIAL_CAPTURES / "demo_06_eduboard_1080p.mp4").write_bytes(out_edu.read_bytes())

        # -----------------------------------------------------------------
        # MODULE 07: Attendance Hub & QR Terminal (20s)
        # -----------------------------------------------------------------
        print("\n[Module 07] Recording Attendance Hub & QR Terminal...")
        ctx = make_context()
        page = ctx.new_page()
        page.goto("http://localhost:5173/attendance")
        page.wait_for_load_state("networkidle")
        page.wait_for_selector("text=Attendance", timeout=15000)
        page.evaluate(CURSOR_SCRIPT)
        time.sleep(2.0)

        events_log.append({"event": "attendance_overview_settled", "t": 1.0})

        # Move to Open QR Attendance Terminal button and click
        qr_btn = page.locator("button:has-text('Open QR Attendance Terminal')").first
        if qr_btn.is_visible():
            page.mouse.move(1600, 140, steps=25)
            time.sleep(1.0)
            qr_btn.click()
            events_log.append({"event": "attendance_qr_modal_opened", "t": 4.5})
            time.sleep(2.0)

        # Inside QR Terminal: Scan student PA-2024-000011 (Aarav Sharma)
        scan_input = page.locator("input[placeholder*='Scan QR' i]").first
        if scan_input.is_visible():
            scan_input.click()
            time.sleep(0.8)
            scan_input.type("PA-2024-000011", delay=120)
            time.sleep(0.5)
            page.keyboard.press("Enter")
            events_log.append({"event": "attendance_qr_scan_complete", "t": 9.0})
            time.sleep(2.5)

        # Hover over check-in confirmation & live scan stream
        page.mouse.move(960, 520, steps=25)
        time.sleep(3.5)
        page.mouse.move(1400, 520, steps=25)
        time.sleep(4.0)

        webm_path = page.video.path()
        ctx.close()
        out_att = OUTPUT_DIR / "demo_07_attendance_1080p.mp4"
        transcode_to_clean_mp4(webm_path, out_att)
        (COMMERCIAL_CAPTURES / "demo_07_attendance_1080p.mp4").write_bytes(out_att.read_bytes())

        browser.close()

    # Save synchronized event logs
    EVENTS_FILE.write_text(json.dumps(events_log, indent=2), encoding="utf-8")
    COMMERCIAL_EVENTS.write_text(json.dumps(events_log, indent=2), encoding="utf-8")
    print(f"\nSaved synchronized UI event log: {EVENTS_FILE} ({len(events_log)} events)")

    print("\n=================================================================")
    print("  ALL V2 CLEAN KIOSK DEMO CAPTURES RECORDED SUCCESSFULLY!")
    print(f"  Primary Dir : {OUTPUT_DIR.resolve()}")
    print(f"  Events File : {EVENTS_FILE.resolve()}")
    print("=================================================================")


if __name__ == "__main__":
    record_kiosk_demo()
