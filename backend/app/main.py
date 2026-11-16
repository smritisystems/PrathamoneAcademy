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
#  * @updated     2026-11-16
#  *
#  * @description FastAPI application entry point, CORS middleware, exception handlers, and v1 router mounting.
#  */

import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from app.core.config import settings
from app.core.limiter import limiter
from app.api.v1.router import api_router, auth_router

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

app.include_router(auth_router, prefix="/api/v1")
app.include_router(api_router, prefix="/api/v1")


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
        return FileResponse(index_file)
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


@app.get("/health")
async def health():
    return {"status": "healthy"}


if os.path.isdir(STATIC_DIR) and os.path.isfile(os.path.join(STATIC_DIR, "index.html")):
    assets_dir = os.path.join(STATIC_DIR, "assets")
    if os.path.isdir(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="spa_assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(request: Request, full_path: str):
        if full_path.startswith("api/") or full_path == "health":
            return None
        candidate = os.path.join(STATIC_DIR, full_path)
        if os.path.isfile(candidate):
            return FileResponse(candidate)
        return FileResponse(os.path.join(STATIC_DIR, "index.html"))
