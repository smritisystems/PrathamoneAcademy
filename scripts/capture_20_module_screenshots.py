# /**
#  * @file        capture_20_module_screenshots.py
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
#  * @created     2026-11-19
#  * @updated     2026-11-19
#  *
#  * @description Captures unmodified module screenshots from the live application.
#  */

import argparse
import json
import os
from pathlib import Path
from typing import Any
from urllib.parse import urljoin, urlsplit

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
TRANSCRIPTS = ROOT / "scripts" / "module_transcripts.json"
DEFAULT_AUTH_STATE = ROOT / "data" / "temp_commercial_recordings" / "auth_state_director.json"
OUTPUT = ROOT / "docs" / "assets" / "commercial" / "module_screenshots"
SAFE_POST_PATHS = (
    "/communication/automation/fee-reminders/preview",
)
VIEWPORT = {"width": 1920, "height": 1080}
SCREENSHOT_ROUTES = {
    "students": "/students",
    "fees": "/fees/overview",
    "staff": "/staff",
    "courses": "/courses",
    "results": "/examinations/analytics",
    "settings": "/settings?category=branding",
    "eduboard": "/eduboard",
}


def _assert_live_mode(page: Any, module_id: str) -> None:
    environment = page.evaluate(
        """() => {
          try {
            const stored = JSON.parse(localStorage.getItem('prashant-environment') || '{}');
            return stored.state?.dataEnvironment || null;
          } catch {
            return null;
          }
        }"""
    )
    if environment and environment.upper() != "PRODUCTION":
        raise RuntimeError(
            f"Non-production data environment {environment!r} was detected on {module_id}."
        )


def _assert_production_requests(
    requests: list[tuple[str, str, str | None]], module_id: str
) -> None:
    unexpected = [
        request
        for request in requests
        if request[2] and request[2].upper() != "PRODUCTION"
    ]
    if unexpected:
        raise RuntimeError(
            f"A non-production API request occurred on {module_id}: {unexpected[0]}"
        )


def _save_original_screenshot(page: Any, image_path: Path) -> None:
    page.screenshot(path=str(image_path), type="png")


def _is_safe_post(method: str, url: str) -> bool:
    if method != "POST":
        return False
    if any(path in url for path in SAFE_POST_PATHS):
        return True
    path = urlsplit(url).path
    prefix = "/api/v1/eduboard/boards/"
    suffix = "/ws-ticket"
    if path.startswith(prefix) and path.endswith(suffix):
        return path[len(prefix) : -len(suffix)].isdigit()
    return False


def _is_navigation_telemetry(method: str, url: str) -> bool:
    return method == "POST" and "/api/v1/navigation/track-activity" in url


def _guard_live_write(
    route: Any,
    blocked_writes: list[tuple[str, str]],
    blocked_telemetry: list[str],
) -> None:
    request = route.request
    if _is_navigation_telemetry(request.method, request.url):
        blocked_telemetry.append(request.url)
        route.abort()
        return
    if request.method in {"POST", "PUT", "PATCH", "DELETE"} and not _is_safe_post(
        request.method, request.url
    ):
        blocked_writes.append((request.method, request.url))
        route.abort()
        return
    route.continue_()


def capture(base_url: str, auth_state: Path, confirm_live_unredacted: bool) -> None:
    if not confirm_live_unredacted:
        raise PermissionError(
            "Live unredacted capture requires --confirm-live-unredacted."
        )
    if not auth_state.is_file():
        raise FileNotFoundError(f"Saved authenticated session not found: {auth_state}")

    modules = json.loads(TRANSCRIPTS.read_text(encoding="utf-8"))
    if len(modules) != 20:
        raise ValueError(f"Expected 20 module routes, found {len(modules)}")

    OUTPUT.mkdir(parents=True, exist_ok=True)
    observed_api_requests: list[tuple[str, str, str | None]] = []
    blocked_writes: list[tuple[str, str]] = []
    blocked_telemetry: list[str] = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        context = browser.new_context(
            storage_state=str(auth_state),
            viewport=VIEWPORT,
            device_scale_factor=1,
        )
        context.route(
            "**/api/v1/**",
            lambda route: _guard_live_write(
                route, blocked_writes, blocked_telemetry
            ),
        )
        page = context.new_page()
        page.on(
            "request",
            lambda request: observed_api_requests.append(
                (
                    request.method,
                    request.url,
                    request.headers.get("x-data-environment"),
                )
            )
            if "/api/v1/" in request.url
            else None,
        )

        page.goto(urljoin(base_url, "/dashboard"), wait_until="domcontentloaded", timeout=60000)
        if page.url.rstrip("/").endswith("/login"):
            raise RuntimeError("The saved session has expired; no screenshots were captured.")
        page.wait_for_timeout(1500)
        _assert_live_mode(page, "dashboard")
        _assert_production_requests(observed_api_requests, "dashboard")
        if blocked_writes:
            raise RuntimeError(
                f"Blocked unexpected live write before capture: {blocked_writes[0]}"
            )

        for module in modules:
            module_id = module["module_id"]
            route = SCREENSHOT_ROUTES.get(module_id, module["route"])
            page.goto(
                urljoin(base_url, route.lstrip("/")),
                wait_until="domcontentloaded",
                timeout=60000,
            )
            if page.url.rstrip("/").endswith("/login"):
                raise RuntimeError(f"Authentication expired while opening {module_id}.")
            page.wait_for_timeout(6000 if module_id == "settings" else 4000)
            _assert_live_mode(page, module_id)
            _assert_production_requests(observed_api_requests, module_id)
            if blocked_writes:
                raise RuntimeError(
                    f"Blocked unexpected live write while opening {module_id}: {blocked_writes[0]}"
                )
            image_path = OUTPUT / f"{module_id}.png"
            _save_original_screenshot(page, image_path)
            print(f"[{module_id}] {image_path.relative_to(ROOT).as_posix()}")

        writes = [
            (method, url, environment)
            for method, url, environment in observed_api_requests
            if method in {"POST", "PUT", "PATCH", "DELETE"}
        ]
        unexpected_writes = [
            request
            for request in writes
            if not _is_safe_post(request[0], request[1])
            and not _is_navigation_telemetry(request[0], request[1])
        ]
        if unexpected_writes:
            raise RuntimeError(
                "An unexpected data-changing request occurred during read-only capture: "
                f"{unexpected_writes[0]}"
            )
        print(
            "Verified production API traffic:",
            len(observed_api_requests),
            "requests;",
            len(writes),
            "safe POST requests;",
            len(blocked_telemetry),
            "navigation telemetry requests blocked.",
        )
        context.close()
        browser.close()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Capture unmodified live module screenshots for an access-controlled deck."
    )
    parser.add_argument(
        "--base-url",
        default=os.environ.get("PRATHAMONE_LIVE_BASE_URL", "http://localhost:5173"),
    )
    parser.add_argument("--auth-state", type=Path, default=DEFAULT_AUTH_STATE)
    parser.add_argument(
        "--confirm-live-unredacted",
        action="store_true",
        help="Confirm that live personal data may appear unredacted in the local deck.",
    )
    args = parser.parse_args()
    capture(
        args.base_url.rstrip("/") + "/",
        args.auth_state.resolve(),
        args.confirm_live_unredacted,
    )


if __name__ == "__main__":
    main()
