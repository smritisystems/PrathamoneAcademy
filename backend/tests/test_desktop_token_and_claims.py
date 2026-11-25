# /**
#  * @file        test_desktop_token_and_claims.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      backend.tests
#  *
#  * @author      Jawahar R. Mallah
#  * @organization Smritisys & AITDL Networks
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 PrathamOne EduOS
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-25
#  * @updated     2026-11-26
#  *
#  * @description Unit and integration tests for cryptographic WebView2 desktop IPC token middleware
#  */

import os
import pytest
from httpx import AsyncClient, ASGITransport
from starlette.requests import Request
from app.main import app
from app.services.license_service import get_verified_lease_claims


@pytest.mark.asyncio
async def test_desktop_token_loopback_unauthorized_blocked(monkeypatch):
    """When PRATHAM_DESKTOP_TOKEN is set, direct loopback access without token must return 403."""
    test_token = "deadbeef" * 8
    monkeypatch.setenv("PRATHAM_DESKTOP_TOKEN", test_token)

    transport = ASGITransport(app=app, client=("127.0.0.1", 50000))
    async with AsyncClient(transport=transport, base_url="http://127.0.0.1:2026") as client:
        # 1. Healthcheck is exempt
        resp_health = await client.get("/health")
        assert resp_health.status_code == 200

        # 2. Root SPA / without token must be blocked (403)
        resp_root = await client.get("/")
        assert resp_root.status_code == 403
        data = resp_root.json()
        assert "Direct loopback access forbidden" in data.get("detail", "")


@pytest.mark.asyncio
async def test_desktop_token_loopback_header_and_cookie_bridge(monkeypatch):
    """When PRATHAM_DESKTOP_TOKEN is provided via X-Pratham-Client-Token, request succeeds and sets cookie."""
    test_token = "cafebabe" * 8
    monkeypatch.setenv("PRATHAM_DESKTOP_TOKEN", test_token)

    transport = ASGITransport(app=app, client=("127.0.0.1", 50000))
    async with AsyncClient(transport=transport, base_url="http://127.0.0.1:2026") as client:
        # Request with X-Pratham-Client-Token header
        resp = await client.get("/", headers={"X-Pratham-Client-Token": test_token})
        assert resp.status_code == 200
        # Verify HttpOnly cookie bridge was set
        cookies = resp.cookies
        assert "pratham_client_token" in cookies
        assert cookies["pratham_client_token"] == test_token

        # Subsequent subresource request with cookie succeeds without header
        resp_sub = await client.get("/", cookies={"pratham_client_token": test_token})
        assert resp_sub.status_code == 200


@pytest.mark.asyncio
async def test_desktop_token_lan_access(monkeypatch):
    """Private LAN clients (e.g. 192.168.1.50) are permitted when LAN access is enabled."""
    test_token = "abcd1234" * 8
    monkeypatch.setenv("PRATHAM_DESKTOP_TOKEN", test_token)
    monkeypatch.setenv("PRATHAM_ALLOW_LAN_ACCESS", "true")

    transport = ASGITransport(app=app, client=("192.168.1.50", 50000))
    async with AsyncClient(transport=transport, base_url="http://192.168.1.10:2026") as client:
        resp = await client.get("/")
        assert resp.status_code == 200


@pytest.mark.asyncio
async def test_get_verified_lease_claims_dependency():
    """get_verified_lease_claims extracts tamper-proof claims bound to request.state."""
    scope = {
        "type": "http",
        "method": "GET",
        "path": "/api/v1/test",
        "headers": [],
    }
    req = Request(scope)
    expected_claims = {
        "company_binding": "PA001",
        "max_students": 500,
        "max_staff": 50,
        "seats": 5,
        "active_modules": ["academic", "finance"],
        "installation_id": "PRATHAM-1234-5678",
        "expires_at": "2027-01-01T00:00:00Z",
    }
    req.state.verified_lease_claims = expected_claims

    extracted = get_verified_lease_claims(req)
    assert extracted == expected_claims
    assert extracted["company_binding"] == "PA001"
    assert extracted["max_students"] == 500
