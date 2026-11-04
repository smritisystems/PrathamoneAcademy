# /**
#  * @file        main.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      backend.app
#  *
#  * @author      Jawahar R. Mallah
#  * @organization AITDL (AI Technology & Development Lab)
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 AITDL
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-03
#  * @updated     2026-11-04
#  *
#  * @description FastAPI application entry point, CORS middleware, exception handlers, and v1 router mounting.
#  */

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from app.core.config import settings
from app.core.limiter import limiter
from app.api.v1.router import api_router

app = FastAPI(
    title=settings.APP_NAME,
    description="Prashant Academy – Coaching Institute Management System API",
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

app.include_router(api_router, prefix="/api/v1")


@app.get("/")
async def root():
    return {
        "message": "Prashant Academy API",
        "version": "1.0.0",
        "docs": "/api/docs" if settings.DEBUG else "Docs disabled in production.",
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}
