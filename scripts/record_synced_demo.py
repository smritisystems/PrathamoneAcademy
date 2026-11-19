# /**
#  * @file        record_synced_demo.py
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
#  * @description Records an authenticated, read-only Playwright walkthrough paced to each official module voiceover and writes its synchronized timeline.
#  */

import argparse
import json
import os
import re
import shutil
import tempfile
import time
from pathlib import Path
from typing import Any
from urllib.parse import urljoin

from playwright.sync_api import BrowserContext, Page, TimeoutError as PlaywrightTimeoutError, sync_playwright


ROOT = Path(__file__).resolve().parent.parent
TRANSCRIPTS_FILE = Path(__file__).with_name("module_transcripts.json")
MANIFEST_FILE = ROOT / "assets" / "audio" / "modules" / "audio_manifest.json"
TIMELINE_FILE = ROOT / "assets" / "captures" / "synced_timeline.json"
VIDEO_FILE = ROOT / "assets" / "captures" / "synced_demo_recording.webm"
DEFAULT_AUTH_FILE = ROOT / "data" / "temp_commercial_recordings" / "auth_state_director.json"
VIEWPORT = {"width": 1920, "height": 1080}
MAX_REQUEST_AGE_SEC = 15.0
CURSOR_SCRIPT = r"""
(() => {
  if (!document.body || document.getElementById('broadcast-cursor')) return;
  const cursor = document.createElement('div');
  cursor.id = 'broadcast-cursor';
  Object.assign(cursor.style, {
    position: 'fixed', width: '24px', height: '24px', borderRadius: '50%',
    background: 'rgba(241,105,6,.9)', border: '2px solid #fff',
    boxShadow: '0 0 16px rgba(241,105,6,.9),0 3px 8px rgba(0,0,0,.45)',
    pointerEvents: 'none', zIndex: '2147483647', transform: 'translate(-50%,-50%)',
    left: '960px', top: '540px', transition: 'left .08s linear,top .08s linear'
  });
  const style = document.createElement('style');
  style.textContent = `
    @keyframes broadcast-ripple {
      0% { transform: translate(-50%,-50%) scale(.7); opacity: .95; }
      100% { transform: translate(-50%,-50%) scale(3.2); opacity: 0; }
    }
    ::-webkit-scrollbar { width: 0 !important; height: 0 !important; }
  `;
  document.head.appendChild(style);
  document.body.appendChild(cursor);
  window.addEventListener('mousemove', event => {
    cursor.style.left = `${event.clientX}px`;
    cursor.style.top = `${event.clientY}px`;
  }, { passive: true });
  window.addEventListener('mousedown', event => {
    const ripple = document.createElement('div');
    Object.assign(ripple.style, {
      position: 'fixed', left: `${event.clientX}px`, top: `${event.clientY}px`,
      width: '18px', height: '18px', border: '3px solid #F16906',
      borderRadius: '50%', boxShadow: '0 0 10px rgba(241,105,6,.8)',
      transform: 'translate(-50%,-50%)', pointerEvents: 'none',
      zIndex: '2147483646', animation: 'broadcast-ripple .45s ease-out forwards'
    });
    document.body.appendChild(ripple);
    window.setTimeout(() => ripple.remove(), 500);
  }, { passive: true });
})();
"""


def load_inputs() -> tuple[list[dict[str, Any]], dict[str, dict[str, Any]]]:
    modules = json.loads(TRANSCRIPTS_FILE.read_text(encoding="utf-8"))
    manifest = json.loads(MANIFEST_FILE.read_text(encoding="utf-8"))
    transcript_by_id = {item["module_id"]: item for item in modules}
    audio_by_id = {item["module_id"]: item for item in manifest}
    if len(modules) != 20 or len(audio_by_id) != 20 or set(transcript_by_id) != set(audio_by_id):
        raise ValueError("Transcripts and audio manifest must contain the same 20 unique module IDs")
    for module_id, audio in audio_by_id.items():
        wav_path = (ROOT / audio["wav_path"]).resolve()
        if not wav_path.is_relative_to(ROOT) or not wav_path.is_file():
            raise FileNotFoundError(f"Missing or out-of-project WAV for {module_id}: {wav_path}")
        if float(audio["duration_sec"]) <= 0:
            raise ValueError(f"Invalid WAV duration for {module_id}")
        audio["absolute_wav_path"] = wav_path
    return modules, audio_by_id


def authenticate_context(context: BrowserContext, base_url: str, auth_state: Path) -> None:
    if auth_state.is_file():
        return
    username = os.environ.get("PRATHAMONE_DEMO_USERNAME")
    password = os.environ.get("PRATHAMONE_DEMO_PASSWORD")
    if not username or not password:
        raise FileNotFoundError(
            f"No saved session at {auth_state}. Provide a valid storage-state file or set "
            "PRATHAMONE_DEMO_USERNAME and PRATHAMONE_DEMO_PASSWORD."
        )
    page = context.new_page()
    page.goto(urljoin(base_url, "/login"), wait_until="domcontentloaded")
    page.locator("#login-username").fill(username)
    page.locator("#login-password").fill(password)
    page.locator("button[type='submit']").click()
    page.wait_for_url("**/dashboard", timeout=30000)
    auth_state.parent.mkdir(parents=True, exist_ok=True)
    context.storage_state(path=str(auth_state))
    page.close()


def click_matching_button(page: Page, pattern: str) -> bool:
    buttons = page.get_by_role("button", name=re.compile(pattern, re.I))
    for index in range(min(buttons.count(), 12)):
        button = buttons.nth(index)
        if button.is_visible() and button.is_enabled():
            try:
                button.click(timeout=1200)
                return True
            except PlaywrightTimeoutError:
                print(f"Skipped non-actionable optional control matching {pattern!r}")
                return False
    return False


def module_interaction(page: Page, module_id: str) -> None:
    if module_id == "students":
        search = page.locator("input[placeholder*='search' i], input[type='search']").first
        if search.is_visible():
            search.fill("Aarav", timeout=2500)
    elif module_id == "fees":
        click_matching_button(page, r"Fee Collection|Collection Desk")
    elif module_id in {"concessions", "scholarships"}:
        click_matching_button(page, r"^(Concessions|Scholarships|Benefits)$")
    elif module_id == "attendance":
        terminal = page.get_by_role("button", name=re.compile(r"Open QR Attendance Terminal", re.I)).first
        if terminal.is_visible() and terminal.is_enabled():
            terminal.evaluate("(button) => button.click()")
    elif module_id == "eduboard":
        click_matching_button(page, r"Greenboard")
        click_matching_button(page, r"Whiteboard|Digital Whiteboard")
    elif module_id == "forms":
        click_matching_button(page, r"Preview")
    elif module_id == "training":
        click_matching_button(page, r"PA001-DEMO")
    elif module_id == "admissions":
        click_matching_button(page, r"^(Pipeline|Admissions)$")
    elif module_id == "timetable":
        page.evaluate("window.scrollBy({top: 180, behavior: 'smooth'})")


def wait_for_network_idle(
    page: Page,
    pending_requests: dict[Any, float],
    last_request_activity: list[float],
    timeout_ms: int = 60000,
) -> None:
    deadline = time.perf_counter() + timeout_ms / 1000
    while time.perf_counter() < deadline:
        page.wait_for_timeout(100)
        now = time.perf_counter()
        active_requests = [
            request for request, started in pending_requests.items()
            if now - started < MAX_REQUEST_AGE_SEC
        ]
        if not active_requests and now - last_request_activity[0] >= 0.5:
            stalled_count = len(pending_requests)
            if stalled_count:
                print(
                    f"Network became quiet with {stalled_count} request(s) still pending "
                    f"after {MAX_REQUEST_AGE_SEC:.0f}s; continuing with the rendered UI."
                )
            return
    raise TimeoutError(f"Network did not become idle within {timeout_ms} ms")


def navigate_module(
    page: Page,
    base_url: str,
    module: dict[str, Any],
    is_first: bool,
    pending_requests: dict[Any, float],
    last_request_activity: list[float],
) -> None:
    if is_first:
        page.goto(urljoin(base_url, module["route"]), wait_until="domcontentloaded", timeout=60000)
        page.wait_for_load_state("networkidle", timeout=60000)
        return

    last_request_activity[0] = time.perf_counter()
    page.evaluate(
        """route => {
          window.history.pushState({}, '', route);
          window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state }));
        }""",
        module["route"],
    )
    page.wait_for_function("route => window.location.pathname === route", arg=module["route"], timeout=5000)
    wait_for_network_idle(page, pending_requests, last_request_activity)


def pace_module(page: Page, module: dict[str, Any], target_duration: float, start_clock: float) -> None:
    module_interaction(page, module["module_id"])
    page.mouse.move(410, 410, steps=4)
    remaining = target_duration - (time.perf_counter() - start_clock)
    if remaining <= 0:
        return
    page.evaluate(
        """durationMs => {
          const cursor = document.getElementById('broadcast-cursor');
          const started = performance.now();
          const duration = Math.max(0, durationMs);
          let scrollDirection = 1;
          const scrollTimer = window.setInterval(() => {
            window.scrollBy({ top: 120 * scrollDirection, behavior: 'smooth' });
            scrollDirection *= -1;
          }, 2200);
          const moveTimer = window.setInterval(() => {
            const progress = Math.min(1, (performance.now() - started) / duration);
            if (cursor) {
              const x = 360 + progress * 1120;
              const y = 370 + Math.sin(progress * Math.PI * 4) * 145;
              cursor.style.left = `${x}px`;
              cursor.style.top = `${y}px`;
            }
          }, 50);
          window.setTimeout(() => {
            window.clearInterval(moveTimer);
            window.clearInterval(scrollTimer);
          }, duration);
        }""",
        remaining * 1000,
    )
    time.sleep(max(0.0, target_duration - (time.perf_counter() - start_clock) - 0.025))


def record(base_url: str, auth_state: Path) -> Path:
    modules, audio_by_id = load_inputs()
    TIMELINE_FILE.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="prathamone_synced_") as video_temp:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(
                headless=True,
                args=["--kiosk", "--disable-infobars", "--hide-scrollbars"],
            )
            auth_context = browser.new_context(viewport=VIEWPORT)
            authenticate_context(auth_context, base_url, auth_state)
            auth_context.close()

            context = browser.new_context(
                storage_state=str(auth_state),
                viewport=VIEWPORT,
                record_video_dir=video_temp,
                record_video_size=VIEWPORT,
            )
            page = context.new_page()
            recording_anchor = time.perf_counter()
            timeline_modules = []
            pending_requests: dict[Any, float] = {}
            last_request_activity = [time.perf_counter()]

            def on_request(request: Any) -> None:
                now = time.perf_counter()
                pending_requests[request] = now
                last_request_activity[0] = now

            def on_request_done(request: Any) -> None:
                pending_requests.pop(request, None)
                last_request_activity[0] = time.perf_counter()

            page.on("request", on_request)
            page.on("requestfinished", on_request_done)
            page.on("requestfailed", on_request_done)
            try:
                for index, module in enumerate(modules):
                    module_id = module["module_id"]
                    audio = audio_by_id[module_id]
                    navigate_module(
                        page,
                        base_url,
                        module,
                        is_first=index == 0,
                        pending_requests=pending_requests,
                        last_request_activity=last_request_activity,
                    )
                    if page.url.rstrip("/").endswith("/login"):
                        raise RuntimeError(f"Authentication expired while navigating to {module['module_name']}")
                    page.evaluate(CURSOR_SCRIPT)

                    module_start_clock = time.perf_counter()
                    start_sec = module_start_clock - recording_anchor
                    target_duration = float(audio["duration_sec"])
                    pace_module(page, module, target_duration, module_start_clock)
                    actual_duration = time.perf_counter() - module_start_clock
                    if actual_duration > target_duration + 1 / 30:
                        raise RuntimeError(
                            f"Interaction for {module_id} exceeded its voiceover duration "
                            f"({actual_duration:.3f}s > {target_duration:.3f}s)"
                        )
                    end_sec = start_sec + target_duration
                    timeline_modules.append(
                        {
                            "module_id": module_id,
                            "start_sec": round(start_sec, 6),
                            "end_sec": round(end_sec, 6),
                            "wav_path": audio["wav_path"],
                            "badge_title": module["badge_title"],
                            "badge_subtitle": module["badge_subtitle"],
                        }
                    )
                    print(f"[{module_id}] {start_sec:.3f}s - {end_sec:.3f}s ({target_duration:.3f}s)")
            finally:
                video_path = page.video.path()
                context.close()
                browser.close()

        source_video = Path(video_path)
        if not source_video.is_file():
            raise FileNotFoundError(f"Playwright did not produce a video: {source_video}")
        VIDEO_FILE.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source_video, VIDEO_FILE)

    timeline = {
        "recording_path": VIDEO_FILE.relative_to(ROOT).as_posix(),
        "modules": timeline_modules,
    }
    TIMELINE_FILE.write_text(json.dumps(timeline, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Playwright recording: {VIDEO_FILE.relative_to(ROOT).as_posix()}")
    print(f"Synchronized timeline: {TIMELINE_FILE.relative_to(ROOT).as_posix()}")
    return VIDEO_FILE


def main() -> None:
    parser = argparse.ArgumentParser(description="Record the twenty audio-paced PrathamOne EduOS module demonstrations.")
    parser.add_argument("--base-url", default=os.environ.get("PRATHAMONE_DEMO_BASE_URL", "http://localhost:5173"))
    parser.add_argument("--auth-state", type=Path, default=DEFAULT_AUTH_FILE)
    args = parser.parse_args()
    record(args.base_url.rstrip("/") + "/", args.auth_state.resolve())


if __name__ == "__main__":
    main()
