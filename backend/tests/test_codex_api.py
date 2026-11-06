# /**
#  * @file        test_codex_api.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      backend.tests
#  *
#  * @author      Jawahar R. Mallah
#  * @organization AITDL (AI Technology & Development Lab)
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 AITDL
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-06
#  * @updated     2026-11-06
#  *
#  * @description Integration tests for CodeX REST API endpoints, disabled defaults, encoding/decoding and access control.
#  */

import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.security import create_access_token


@pytest.mark.asyncio
async def test_codex_api_endpoints():
    """Verify CodeX REST API endpoints via authenticated admin client."""
    # Generate admin token for UID 1 (Admin)
    token = create_access_token(data={"sub": "1", "role": "admin"})
    headers = {"Authorization": f"Bearer {token}"}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Fetch CodeX Configuration — Verify DISABLED by default
        res = await client.get("/api/v1/codex/config", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert "config" in data
        assert "default_profile" in data
        assert data["config"]["is_master_enabled"] is False  # MANDATORY DEFAULT POLICY

        # 2. Test live encoding
        encode_res = await client.post(
            "/api/v1/codex/encode",
            headers=headers,
            json={"value": 1250}
        )
        assert encode_res.status_code == 200
        encode_data = encode_res.json()
        assert encode_data["encoded_value"] == "CX-AZPQ"

        # 3. Test live decoding
        decode_res = await client.post(
            "/api/v1/codex/decode",
            headers=headers,
            json={"code": "CX-AZPQ"}
        )
        assert decode_res.status_code == 200
        decode_data = decode_res.json()
        assert decode_data["decoded_value"] == 1250.0

        # 4. List profiles
        profiles_res = await client.get("/api/v1/codex/profiles", headers=headers)
        assert profiles_res.status_code == 200
        profiles = profiles_res.json()
        assert len(profiles) >= 1
        assert profiles[0]["profile_code"] == "DEFAULT"

        # 5. User status
        status_res = await client.get("/api/v1/codex/user-status", headers=headers)
        assert status_res.status_code == 200
        status_data = status_res.json()
        assert "is_enabled" in status_data
        assert "visibility_mode" in status_data

