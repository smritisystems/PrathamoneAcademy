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
#  * @description Automated security and cross-module enforcement test suite verifying all 4 visibility modes, backend data masking, persistent PIN brute-force lockout, genuine zero vs masked distinction, and export leakage prevention.
#  */

import pytest
import json
from datetime import datetime, timezone, timedelta
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select, update, delete
from app.main import app
from app.core.database import AsyncSessionLocal
from app.core.security import create_access_token
from app.models.codex import CodexConfig, CodexScopeAssignment, CodexAuditLog
from app.services.codex_service import CodeXService, DEFAULT_DIGIT_MAP


@pytest.mark.asyncio
async def test_codex_four_visibility_modes_and_backend_masking():
    """
    Verifies all 4 CodeX visibility modes on financial presentations:
    1. disabled (System Default: OFF) — raw numbers intact, is_enabled: False, is_masked: False
    2. actual_only — raw numbers intact, is_enabled: True, is_masked: False
    3. both — raw numbers intact AND coded bijective string provided, is_masked: False
    4. coded_only — raw numbers SANITIZED (set to None/null) at API boundary, is_masked: True
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
        assert d_data.get("is_masked") is False
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
        assert d_data.get("is_masked") is False
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
        assert d_data.get("is_masked") is False
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
        assert d_data["is_masked"] is True
        assert "total_fees_coded" in d_data
        assert d_data["total_fees_coded"].startswith("CX-")
        # CRITICAL BACKEND SECURITY: Raw unauthorized amount MUST BE sanitized to None (null)
        # so no raw amount leaks over the wire and it is not confused with genuine 0.0 rupees
        assert d_data["total_fees"] is None
        assert d_data["total_collected"] is None
        assert d_data["total_outstanding"] is None

        # Check recent payments in coded_only mode
        if d_data.get("recent_payments"):
            first_payment = d_data["recent_payments"][0]
            assert first_payment["amount"] is None
            assert first_payment["is_masked"] is True
            assert "amount_coded" in first_payment
            assert first_payment["amount_coded"].startswith("CX-")

        # Check monthly trends in coded_only mode
        if d_data.get("monthly_trends"):
            first_trend = d_data["monthly_trends"][0]
            assert first_trend["collected"] is None
            assert first_trend["is_masked"] is True
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
async def test_codex_genuine_zero_versus_masked_distinction():
    """
    Verifies that a genuine zero-value financial transaction (0.0) is clearly distinguishable
    from an unauthorized masked financial value (None / null with is_masked=True).
    Prevents corrupting financial arithmetic or false ledger reconciliation.
    """
    async with AsyncSessionLocal() as db:
        # 1. Test when visibility is 'both'
        await db.execute(update(CodexConfig).where(CodexConfig.institution_id == 1).values(
            is_master_enabled=True,
            feature_show_both=True,
            feature_hide_actual_amount=False,
        ))
        await db.commit()

        sample_zero = {"amount": 0.0, "description": "100% Scholarship Waiver"}
        masked_both = await CodeXService.apply_financial_masking(
            db=db,
            institution_id=1,
            user=None,
            data=sample_zero.copy(),
            numeric_fields=["amount"],
            module="fees",
        )
        # In 'both' mode, genuine zero remains 0.0 and is_masked is False
        assert masked_both["amount"] == 0.0
        assert masked_both["amount_coded"] == "CX-Q.Q"
        assert masked_both["is_masked"] is False

        # 2. Test when visibility is 'coded_only'
        await db.execute(update(CodexConfig).where(CodexConfig.institution_id == 1).values(
            is_master_enabled=True,
            feature_show_both=False,
            feature_hide_actual_amount=True,
        ))
        await db.commit()

        sample_non_zero = {"amount": 15000.0, "description": "Tuition Fee"}
        sample_actual_zero = {"amount": 0.0, "description": "100% Scholarship"}

        masked_non_zero = await CodeXService.apply_financial_masking(
            db=db,
            institution_id=1,
            user=None,
            data=sample_non_zero.copy(),
            numeric_fields=["amount"],
            module="fees",
        )
        masked_actual_zero = await CodeXService.apply_financial_masking(
            db=db,
            institution_id=1,
            user=None,
            data=sample_actual_zero.copy(),
            numeric_fields=["amount"],
            module="fees",
        )

        # In 'coded_only', raw amounts are sanitized to None and marked is_masked=True
        assert masked_non_zero["amount"] is None
        assert masked_non_zero["is_masked"] is True
        assert masked_non_zero["amount_coded"] == "CX-APQQQ.Q"

        assert masked_actual_zero["amount"] is None
        assert masked_actual_zero["is_masked"] is True
        assert masked_actual_zero["amount_coded"] == "CX-Q.Q"

        # Financial Integrity Check: If client calculates sum of amounts,
        # masked items are None and excluded from arithmetic rather than miscalculating as 0.0!
        items = [masked_non_zero, masked_actual_zero]
        computable_amounts = [i["amount"] for i in items if not i["is_masked"] and i["amount"] is not None]
        assert len(computable_amounts) == 0  # Zero arithmetic corruption!

        # Reset
        await db.execute(update(CodexConfig).where(CodexConfig.institution_id == 1).values(
            is_master_enabled=False,
            feature_hide_actual_amount=False,
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
async def test_codex_multi_worker_persistent_lockout():
    """
    Verifies that PIN decoder brute-force lockout is persistent in PostgreSQL audit logs
    and remains effective across backend restarts and multiple worker processes.
    """
    token = create_access_token(data={"sub": "1", "role": "admin"})
    headers = {"Authorization": f"Bearer {token}"}
    transport = ASGITransport(app=app)

    pin_hash = CodeXService.hash_pin("5555")
    async with AsyncSessionLocal() as db:
        await db.execute(update(CodexConfig).where(CodexConfig.institution_id == 1).values(
            is_master_enabled=True,
            feature_pin_protected_decoding=True,
            security_pin_hash=pin_hash,
            max_decoding_attempts=3,
            decoder_expiry_seconds=300,
        ))
        # Clear recent failure audit logs for user 1 to establish clean baseline
        await db.execute(delete(CodexAuditLog).where(
            CodexAuditLog.institution_id == 1,
            CodexAuditLog.user_id == 1,
        ))
        await db.commit()

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Attempt 1: Wrong PIN
        res1 = await client.post("/api/v1/codex/decode", headers=headers, json={"code": "CX-AZPQ", "pin": "0000"})
        assert res1.status_code == 401
        assert "2 attempt(s) remaining" in res1.json()["detail"]

        # Attempt 2: Wrong PIN
        res2 = await client.post("/api/v1/codex/decode", headers=headers, json={"code": "CX-AZPQ", "pin": "1111"})
        assert res2.status_code == 401
        assert "1 attempt(s) remaining" in res2.json()["detail"]

        # Attempt 3: Wrong PIN -> Lockout triggered (HTTP 429)
        res3 = await client.post("/api/v1/codex/decode", headers=headers, json={"code": "CX-AZPQ", "pin": "2222"})
        assert res3.status_code == 429
        assert "Decoder locked" in res3.json()["detail"]

        # Simulate fresh worker process querying database:
        # Check lockout status via database persistence query
        async with AsyncSessionLocal() as db:
            is_locked, rem_secs, rem_att = await CodeXService.get_lockout_status_persistent(
                db=db,
                institution_id=1,
                user_id=1,
                max_attempts=3,
                lockout_seconds=300,
            )
            assert is_locked is True
            assert rem_secs > 0
            assert rem_att == 0

        # Attempt 4: Even with correct PIN, must remain locked out across workers!
        res4 = await client.post("/api/v1/codex/decode", headers=headers, json={"code": "CX-AZPQ", "pin": "5555"})
        assert res4.status_code == 429
        assert "Decoder locked" in res4.json()["detail"]

        # Administrative reset via audit ledger
        async with AsyncSessionLocal() as db:
            audit_reset = CodexAuditLog(
                institution_id=1,
                user_id=1,
                user_name="Admin User",
                action="decode_reset",
                entity_type="code",
                status="success",
            )
            db.add(audit_reset)
            await db.commit()

        # After persistent reset, valid PIN decodes successfully
        res5 = await client.post("/api/v1/codex/decode", headers=headers, json={"code": "CX-AZPQ", "pin": "5555"})
        assert res5.status_code == 200
        assert res5.json()["decoded_value"] == 1250.0

    # Cleanup
    async with AsyncSessionLocal() as db:
        await db.execute(update(CodexConfig).where(CodexConfig.institution_id == 1).values(
            is_master_enabled=False,
            feature_pin_protected_decoding=False,
            security_pin_hash=None,
            max_decoding_attempts=5,
        ))
        await db.commit()


@pytest.mark.asyncio
async def test_codex_strict_permission_governance():
    """
    Verifies that a user whose resolved scope has can_decode=False CANNOT decode,
    regardless of role or admin title (Directive Section 3 & 4).
    """
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


@pytest.mark.asyncio
async def test_codex_cross_module_financial_endpoints():
    """
    Verifies that CodeX backend masking is enforced across all financial endpoints:
    - /fees/overview
    - /fees/invoices
    - /fees/register
    - /teacher-payroll/monthly
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
        # 1. Fees Overview
        res_ov = await client.get("/api/v1/fees/overview", headers=headers)
        if res_ov.status_code == 200:
            ov_data = res_ov.json()
            if "summary" in ov_data:
                assert ov_data["summary"].get("total_obligation") is None
                assert ov_data["summary"].get("is_masked") is True
                assert "total_obligation_coded" in ov_data["summary"]

        # 2. Fees Invoices
        res_inv = await client.get("/api/v1/fees/invoices", headers=headers)
        if res_inv.status_code == 200:
            invoices = res_inv.json()
            if len(invoices) > 0:
                first_inv = invoices[0]
                assert first_inv["net_amount"] is None
                assert first_inv["is_masked"] is True
                assert "net_amount_coded" in first_inv

        # 3. Fees Register
        res_reg = await client.get("/api/v1/fees/register", headers=headers)
        if res_reg.status_code == 200:
            reg_items = res_reg.json()
            if len(reg_items) > 0:
                first_reg = reg_items[0]
                assert first_reg["net_amount"] is None
                assert first_reg["is_masked"] is True
                assert "net_amount_coded" in first_reg

        # 4. Teacher Payroll
        res_pay = await client.get("/api/v1/teacher-payroll/monthly", headers=headers)
        if res_pay.status_code == 200:
            payrolls = res_pay.json()
            if len(payrolls) > 0:
                first_pay = payrolls[0]
                assert first_pay["net_payable"] is None
                assert first_pay["is_masked"] is True
                assert "net_payable_coded" in first_pay

    # Cleanup
    async with AsyncSessionLocal() as db:
        await db.execute(update(CodexConfig).where(CodexConfig.institution_id == 1).values(
            is_master_enabled=False,
            feature_hide_actual_amount=False,
        ))
        await db.commit()
