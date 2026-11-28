# /**
#  * @file        main.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      backend.app
#  *
#  * @author      Jawahar R. Mallah
#  * @organization Smritisys & AITDL Networks
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 PrathamOne EduOS
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-03
#  * @updated     2026-11-28
#  *
#  * @description FastAPI application entry point, CORS middleware, exception handlers, and v1 router mounting.
#  */

import ipaddress
import os
from http.cookies import SimpleCookie
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.datastructures import MutableHeaders
from starlette.types import ASGIApp, Message, Receive, Scope, Send
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from app.core.config import settings
from app.core.limiter import limiter
from app.api.v1.router import api_router, auth_router, ws_router

app = FastAPI(
    title=f"{settings.PRODUCT_NAME} — {settings.EDITION}",
    description=f"{settings.PRODUCT_DESCRIPTION} API",
    version=settings.VERSION,
    # Disable interactive docs in production
    docs_url="/api/docs" if settings.DEBUG else None,
    redoc_url="/api/redoc" if settings.DEBUG else None,
)

# Attach limiter to app state and error handler
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class NoCacheApiMiddleware:
    """Pure ASGI middleware appending strict no-store headers on API and health responses."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        path = scope.get("path") or ""
        if not (path.startswith("/api/") or path == "/health" or path.startswith("/health/")):
            await self.app(scope, receive, send)
            return

        async def send_with_no_cache(message: Message) -> None:
            if message["type"] == "http.response.start":
                headers = MutableHeaders(scope=message)
                headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
                headers["Pragma"] = "no-cache"
                headers["Expires"] = "0"
            await send(message)

        await self.app(scope, receive, send_with_no_cache)


class DesktopIpcTokenMiddleware:
    """Pure ASGI middleware enforcing PRATHAM_DESKTOP_TOKEN loopback IPC & LAN rules without BaseHTTPMiddleware TaskGroup wrapping."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        desktop_token = os.getenv("PRATHAM_DESKTOP_TOKEN")
        if not desktop_token:
            await self.app(scope, receive, send)
            return

        path = scope.get("path") or ""
        if path == "/health" or path.startswith("/health/"):
            await self.app(scope, receive, send)
            return

        client = scope.get("client")
        client_host = client[0] if client else "127.0.0.1"

        is_loopback = False
        is_private_lan = False
        try:
            ip_obj = ipaddress.ip_address(client_host)
            is_loopback = ip_obj.is_loopback
            is_private_lan = ip_obj.is_private and not ip_obj.is_loopback
        except ValueError:
            is_loopback = client_host in ("127.0.0.1", "::1", "localhost")

        if is_loopback:
            raw_headers = scope.get("headers") or []
            token_hdr = None
            cookie_header = None
            for k, v in raw_headers:
                kl = k.lower()
                if kl == b"x-pratham-client-token":
                    token_hdr = v.decode("latin-1")
                elif kl == b"cookie":
                    cookie_header = v.decode("latin-1")

            cookie_token = None
            if cookie_header:
                try:
                    jar = SimpleCookie()
                    jar.load(cookie_header)
                    if "pratham_client_token" in jar:
                        cookie_token = jar["pratham_client_token"].value
                except Exception:
                    cookie_token = None

            token_valid = (token_hdr == desktop_token) or (cookie_token == desktop_token)
            if not token_valid:
                resp = JSONResponse(
                    status_code=403,
                    content={
                        "detail": "Direct loopback access forbidden. Please launch PrathamOne EduOS via the native desktop application."
                    },
                )
                await resp(scope, receive, send)
                return

            should_set_cookie = (token_hdr == desktop_token) and (cookie_token != desktop_token)
            if not should_set_cookie:
                await self.app(scope, receive, send)
                return

            is_secure = scope.get("scheme", "http") == "https"

            async def send_with_ipc_cookie(message: Message) -> None:
                if message["type"] == "http.response.start":
                    headers = MutableHeaders(scope=message)
                    cookie_parts = [
                        f"pratham_client_token={desktop_token}",
                        "HttpOnly",
                        "Path=/",
                        "SameSite=lax",
                    ]
                    if is_secure:
                        cookie_parts.append("Secure")
                    headers.append("Set-Cookie", "; ".join(cookie_parts))
                await send(message)

            await self.app(scope, receive, send_with_ipc_cookie)
            return

        allow_lan = os.getenv("PRATHAM_ALLOW_LAN_ACCESS", "true").lower() in ("true", "1", "yes")
        if is_private_lan:
            if allow_lan:
                await self.app(scope, receive, send)
                return
            resp = JSONResponse(
                status_code=403,
                content={"detail": "LAN network access is disabled by institute administrator."},
            )
            await resp(scope, receive, send)
            return

        resp = JSONResponse(
            status_code=403,
            content={"detail": "External untrusted network access forbidden."},
        )
        await resp(scope, receive, send)


app.add_middleware(NoCacheApiMiddleware)
app.add_middleware(DesktopIpcTokenMiddleware)

app.include_router(auth_router, prefix="/api/v1")
app.include_router(ws_router, prefix="/api/v1")
app.include_router(api_router, prefix="/api/v1")


@app.on_event("startup")
async def on_startup():
    from pathlib import Path
    for dir_path in [Path("/app/backups"), Path("/app/data/backups")]:
        try:
            if dir_path.exists():
                hist = dir_path / "housekeeping_history.jsonl"
                if hist.exists():
                    try:
                        os.chmod(hist, 0o666)
                    except Exception:
                        pass
        except Exception:
            pass

    # Launch autonomous operational task sync daemon
    import asyncio
    try:
        from app.services.auto_task_service import run_daily_autonomous_sync_daemon
        asyncio.create_task(run_daily_autonomous_sync_daemon())
    except Exception as daemon_err:
        pass


# ------------------------------------------------------------------------------
# Single Page Application (SPA) Static Serving (Standalone Windows / Desktop)
# ------------------------------------------------------------------------------
STATIC_DIR = os.getenv(
    "STATIC_DIR",
    os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "frontend", "dist"),
)
if not os.path.isdir(STATIC_DIR):
    alt_static = os.path.join(os.path.dirname(__file__), "static")
    if os.path.isdir(alt_static):
        STATIC_DIR = alt_static


@app.get("/")
async def root():
    index_file = os.path.join(STATIC_DIR, "index.html")
    if os.path.isdir(STATIC_DIR) and os.path.isfile(index_file):
        return FileResponse(
            index_file,
            headers={
                "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
                "Pragma": "no-cache",
            },
        )
    return {
        "product": settings.PRODUCT_NAME,
        "description": settings.PRODUCT_DESCRIPTION,
        "edition": settings.EDITION,
        "version": settings.VERSION,
        "build_number": settings.BUILD_NUMBER,
        "tagline": settings.TAGLINE,
        "organization": settings.ORGANIZATION,
        "author": settings.AUTHOR,
        "docs": "/api/docs" if settings.DEBUG else "Docs disabled in production.",
    }


def _resolve_alembic_head() -> str:
    try:
        from pathlib import Path
        from alembic.config import Config
        from alembic.script import ScriptDirectory

        backend_root = Path(__file__).resolve().parent.parent
        alembic_ini = backend_root / "alembic.ini"
        if alembic_ini.is_file():
            cfg = Config(str(alembic_ini))
            cfg.set_main_option("script_location", str(backend_root / "alembic"))
            heads = ScriptDirectory.from_config(cfg).get_heads()
            if heads:
                return heads[0]
    except Exception:
        pass
    return "058_fee_matrix_composite_indexes"


_ALEMBIC_HEAD = _resolve_alembic_head()


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "product": settings.PRODUCT_NAME,
        "version": settings.VERSION,
        "alembic_head": _ALEMBIC_HEAD,
    }


if os.path.isdir(STATIC_DIR) and os.path.isfile(os.path.join(STATIC_DIR, "index.html")):
    assets_dir = os.path.join(STATIC_DIR, "assets")
    if os.path.isdir(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="spa_assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(request: Request, full_path: str):
        if full_path == "api" or full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="API endpoint not found")
        if full_path == "health":
            return {"status": "healthy"}
        candidate = os.path.join(STATIC_DIR, full_path)
        if os.path.isfile(candidate):
            return FileResponse(candidate)
        return FileResponse(
            os.path.join(STATIC_DIR, "index.html"),
            headers={
                "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
                "Pragma": "no-cache",
            },
        )
