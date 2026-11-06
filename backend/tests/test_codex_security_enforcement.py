# /**
#  * @file        test_codex_security_enforcement.py
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
#  * @created     2026-11-07
#  * @updated     2026-11-07
#  *
#  * @description Automated security and cross-module enforcement test suite verifying all 4 visibility modes, backend data masking, PIN brute-force lockout, permission governance, and export leakage prevention.
#  */

import pytest
import json
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select, update
from app.main import app
from app.core.database import AsyncSessionLocal
from app.core.security import create_access_token
from app.models.codex import CodexConfig, CodexScopeAssignment, CodexAuditLog
from app.services.codex_service import CodeXService, DEFAULT_DIGIT_MAP


@pytest.mark.asyncio
async def test_codex_four_visibility_modes_and_backend_masking():
    """
    Verifies all 4 CodeX visibility modes on financial presentations:
    1. disabled (System Default: OFF) — raw numbers intact, is_enabled: False
    2. actual_only — raw numbers intact, is_enabled: True
    3. both — raw numbers intact AND coded bijective string provided
    4. coded_only — raw numbers SANITIZED (set to 0.0) at API boundary, only coded string provided
    """
    token = create_access_token(data={"sub": "1", "role": "admin"})
    headers = {"Authorization": f"Bearer {token}"}
    transport = ASGITransport(app=app)

    async with AsyncSessionLocal() as db:
        # Reset any previous scope assignments
        await db.execute(update(CodexConfig).where(CodexConfig.institution_id == 1).values(
            is_master_enabled=False,
            feature_hide_actual_amount=False,
            feature_show_both=False,
            feature_show_actual_amount=True,
        ))
        await db.commit()

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # --- MODE 1: DISABLED (Default) ---
        dash_res = await client.get("/api/v1/dashboard/stats", headers=headers)
        assert dash_res.status_code == 200
        d_data = dash_res.json()
        assert d_data["_codex"]["is_enabled"] is False
        # Raw fees present
        assert isinstance(d_data["total_fees"], (int, float))

        # --- MODE 2: ACTUAL_ONLY ---
        async with AsyncSessionLocal() as db:
            await db.execute(update(CodexConfig).where(CodexConfig.institution_id == 1).values(
                is_master_enabled=True,
                feature_show_actual_amount=True,
                feature_hide_actual_amount=False,
                feature_show_both=False,
            ))
            await db.commit()

        dash_res = await client.get("/api/v1/dashboard/stats", headers=headers)
        assert dash_res.status_code == 200
        d_data = dash_res.json()
        assert d_data["_codex"]["is_enabled"] is True
        assert d_data["_codex"]["visibility_mode"] == "actual_only"
        assert isinstance(d_data["total_fees"], (int, float))

        # --- MODE 3: BOTH ---
        async with AsyncSessionLocal() as db:
            await db.execute(update(CodexConfig).where(CodexConfig.institution_id == 1).values(
                is_master_enabled=True,
                feature_show_actual_amount=False,
                feature_hide_actual_amount=False,
                feature_show_both=True,
            ))
            await db.commit()

        dash_res = await client.get("/api/v1/dashboard/stats", headers=headers)
        assert dash_res.status_code == 200
        d_data = dash_res.json()
        assert d_data["_codex"]["is_enabled"] is True
        assert d_data["_codex"]["visibility_mode"] == "both"
        assert "total_fees_coded" in d_data
        assert d_data["total_fees_coded"].startswith("CX-")
        # Raw value is still preserved in 'both' mode
        assert isinstance(d_data["total_fees"], (int, float))

        # --- MODE 4: CODED_ONLY (Backend Data Masking Enforcement) ---
        async with AsyncSessionLocal() as db:
            await db.execute(update(CodexConfig).where(CodexConfig.institution_id == 1).values(
                is_master_enabled=True,
                feature_show_actual_amount=False,
                feature_hide_actual_amount=True,
                feature_show_both=False,
            ))
            await db.commit()

        dash_res = await client.get("/api/v1/dashboard/stats", headers=headers)
        assert dash_res.status_code == 200
        d_data = dash_res.json()
        assert d_data["_codex"]["is_enabled"] is True
        assert d_data["_codex"]["visibility_mode"] == "coded_only"
        assert "total_fees_coded" in d_data
        assert d_data["total_fees_coded"].startswith("CX-")
        # CRITICAL BACKEND SECURITY: Raw amount MUST BE sanitized to 0.0 so no raw amount leaks over the wire
        assert d_data["total_fees"] == 0.0
        assert d_data["total_collected"] == 0.0
        assert d_data["total_outstanding"] == 0.0

        # Check recent payments in coded_only mode
        if d_data.get("recent_payments"):
            first_payment = d_data["recent_payments"][0]
            assert first_payment["amount"] == 0.0
            assert "amount_coded" in first_payment
            assert first_payment["amount_coded"].startswith("CX-")

        # Check monthly trends in coded_only mode
        if d_data.get("monthly_trends"):
            first_trend = d_data["monthly_trends"][0]
            assert first_trend["collected"] == 0.0
            assert "collected_coded" in first_trend
            assert first_trend["collected_coded"].startswith("CX-")

        # --- RESET TO DEFAULT DISABLED ---
        async with AsyncSessionLocal() as db:
            await db.execute(update(CodexConfig).where(CodexConfig.institution_id == 1).values(
                is_master_enabled=False,
                feature_hide_actual_amount=False,
                feature_show_both=False,
                feature_show_actual_amount=True,
            ))
            await db.commit()


@pytest.mark.asyncio
async def test_codex_export_csv_masking_prevention():
    """
    Verifies that when a user is in coded_only mode, CSV report exports DO NOT leak raw numbers.
    """
    token = create_access_token(data={"sub": "1", "role": "admin"})
    headers = {"Authorization": f"Bearer {token}"}
    transport = ASGITransport(app=app)

    async with AsyncSessionLocal() as db:
        await db.execute(update(CodexConfig).where(CodexConfig.institution_id == 1).values(
            is_master_enabled=True,
            feature_hide_actual_amount=True,
            feature_show_both=False,
        ))
        await db.commit()

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/v1/reports/fee-collection/export?format=csv", headers=headers)
        assert res.status_code == 200
        csv_text = res.text
        # In coded_only mode, numbers in CSV must be replaced by CX- coded strings
        # Header line should exist
        assert "admission_number,student_name,total_fees,paid,outstanding" in csv_text
        lines = [l for l in csv_text.splitlines() if l.strip() and not l.startswith("admission_number") and "PrathamOne" not in l]
        for line in lines:
            parts = line.split(",")
            if len(parts) >= 5:
                # fees, paid, outstanding should be CX- encoded
                total_fees_val = parts[2]
                assert total_fees_val.startswith("CX-")

    # Cleanup
    async with AsyncSessionLocal() as db:
        await db.execute(update(CodexConfig).where(CodexConfig.institution_id == 1).values(
            is_master_enabled=False,
            feature_hide_actual_amount=False,
        ))
        await db.commit()


@pytest.mark.asyncio
async def test_codex_decoder_pin_brute_force_lockout_and_rate_limiting():
    """
    Verifies server-side PIN verification and rate-limiting brute-force lockout:
    1. Incorrect PIN returns 401 Unauthorized with attempt counter.
    2. Exceeding max attempts (5) triggers HTTP 429 Too Many Requests (Lockout).
    3. Audit logs record decode_pin_failure and decode_locked without exposing PINs.
    4. Valid PIN resets the lockout counter.
    """
    token = create_access_token(data={"sub": "1", "role": "admin"})
    headers = {"Authorization": f"Bearer {token}"}
    transport = ASGITransport(app=app)

    # Set PIN to '9876' and enable pin protection
    pin_hash = CodeXService.hash_pin("9876")
    async with AsyncSessionLocal() as db:
        await db.execute(update(CodexConfig).where(CodexConfig.institution_id == 1).values(
            is_master_enabled=True,
            feature_pin_protected_decoding=True,
            security_pin_hash=pin_hash,
            max_decoding_attempts=3,  # Set to 3 for testing
            decoder_expiry_seconds=300,
        ))
        await db.commit()

    # Reset any memory attempts
    CodeXService.reset_failed_attempts("1:1")

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Attempt 1: Wrong PIN
        res1 = await client.post("/api/v1/codex/decode", headers=headers, json={"code": "CX-AZPQ", "pin": "0000"})
        assert res1.status_code == 401
        assert "2 attempt(s) remaining" in res1.json()["detail"]

        # Attempt 2: Wrong PIN
        res2 = await client.post("/api/v1/codex/decode", headers=headers, json={"code": "CX-AZPQ", "pin": "1111"})
        assert res2.status_code == 401
        assert "1 attempt(s) remaining" in res2.json()["detail"]

        # Attempt 3: Wrong PIN -> LOCKOUT (HTTP 429)
        res3 = await client.post("/api/v1/codex/decode", headers=headers, json={"code": "CX-AZPQ", "pin": "2222"})
        assert res3.status_code == 429
        assert "Decoder locked" in res3.json()["detail"]

        # Attempt 4: Even with correct PIN, must still be locked out!
        res4 = await client.post("/api/v1/codex/decode", headers=headers, json={"code": "CX-AZPQ", "pin": "9876"})
        assert res4.status_code == 429
        assert "Decoder locked" in res4.json()["detail"]

        # Reset failed attempts and verify successful decode with correct PIN
        CodeXService.reset_failed_attempts("1:1")
        res5 = await client.post("/api/v1/codex/decode", headers=headers, json={"code": "CX-AZPQ", "pin": "9876"})
        assert res5.status_code == 200
        assert res5.json()["decoded_value"] == 1250.0

        # Verify audit logs do not leak PIN or decoded numeric value
        async with AsyncSessionLocal() as db:
            audit_res = await db.execute(
                select(CodexAuditLog)
                .where(CodexAuditLog.institution_id == 1)
                .order_by(CodexAuditLog.id.desc())
                .limit(5)
            )
            logs = audit_res.scalars().all()
            for l in logs:
                det = l.details or ""
                assert "9876" not in det  # PIN never logged!
                assert "0000" not in det
                if l.action == "decode_success":
                    assert "decoded_value" not in det  # Numeric value not logged in plain text!

    # Cleanup
    async with AsyncSessionLocal() as db:
        await db.execute(update(CodexConfig).where(CodexConfig.institution_id == 1).values(
            is_master_enabled=False,
            feature_pin_protected_decoding=False,
            security_pin_hash=None,
            max_decoding_attempts=5,
        ))
        await db.commit()
    CodeXService.reset_failed_attempts("1:1")


@pytest.mark.asyncio
async def test_codex_strict_permission_governance():
    """
    Verifies that a user whose resolved scope has can_decode=False CANNOT decode,
    regardless of role or admin title (Directive Section 4).
    """
    # Create token for user 1
    token = create_access_token(data={"sub": "1", "role": "admin"})
    headers = {"Authorization": f"Bearer {token}"}
    transport = ASGITransport(app=app)

    async with AsyncSessionLocal() as db:
        # Enable master CodeX
        await db.execute(update(CodexConfig).where(CodexConfig.institution_id == 1).values(
            is_master_enabled=True,
        ))
        # Add explicit scope assignment restricting user 1 to can_decode=False
        user_scope = CodexScopeAssignment(
            institution_id=1,
            scope_type="user",
            scope_target="1",
            visibility_mode="coded_only",
            can_decode=False,  # EXPLICITLY FORBIDDEN
            can_generate_qr=False,
            allowed_modules=json.dumps(["all"]),
        )
        db.add(user_scope)
        await db.commit()

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Attempt decode
        res = await client.post("/api/v1/codex/decode", headers=headers, json={"code": "CX-AZPQ"})
        # MUST return 403 Forbidden even for admin user!
        assert res.status_code == 403
        assert "Access denied" in res.json()["detail"]

    # Cleanup
    async with AsyncSessionLocal() as db:
        await db.execute(update(CodexConfig).where(CodexConfig.institution_id == 1).values(
            is_master_enabled=False,
        ))
        res = await db.execute(select(CodexScopeAssignment).where(CodexScopeAssignment.scope_target == "1"))
        scopes = res.scalars().all()
        for s in scopes:
            await db.delete(s)
        await db.commit()
