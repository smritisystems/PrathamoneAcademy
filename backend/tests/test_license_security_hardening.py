# /**
#  * @file        test_license_security_hardening.py
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
#  * @description Security regression tests for Rule 016 hardening: DB-clone node-lock rejection,
#  */

import hashlib
from types import SimpleNamespace

import pytest
from starlette.requests import Request

import run_server
from app.api.v1.endpoints import license as license_endpoint
from app.core import hardware


@pytest.mark.asyncio
async def test_hardware_bound_license_rejects_db_cloning_fallback(monkeypatch):
    """Cloning license.artifact + license.installation_id onto another host must fail closed."""
    cloned_hw = "PRATHAM-AAAA-BBBB-CCCC-DDDD"
    settings_by_key = {
        "license.artifact": SimpleNamespace(value='{"document_id":"cloned-doc"}'),
        "license.installation_id": SimpleNamespace(value=cloned_hw),
        "license.activation_identifier": SimpleNamespace(value="act-cloned-01"),
    }

    async def fake_get_setting(_db, _inst_id, key):
        return settings_by_key.get(key)

    monkeypatch.setattr(license_endpoint, "_get_setting", fake_get_setting)
    monkeypatch.setattr(
        license_endpoint,
        "verify_signed_license_artifact",
        lambda _a, _k: {
            "document_id": "cloned-doc",
            "product_code": "prathamone-eduos",
            "installation_id": cloned_hw,
            "company_binding": "PA001",
            "rollout_stage": "enforced",
        },
    )
    monkeypatch.setattr(
        license_endpoint,
        "verify_hardware_fingerprint",
        lambda _fp: (False, "Hardware mismatch detected!"),
    )
    monkeypatch.setattr(license_endpoint.settings, "LICENSE_ENFORCEMENT_STAGE", "enforced")
    monkeypatch.setattr(license_endpoint.settings, "LICENSE_PRODUCT_CODE", "prathamone-eduos")
    monkeypatch.setattr(license_endpoint.settings, "APP_RUNTIME_TARGET", "desktop")

    ctx = await license_endpoint._load_license_context(SimpleNamespace(), 1, "PA001")
    assert ctx["mode"] == "invalid"
    assert "Node-Lock Mismatch" in (ctx["error"] or "")


@pytest.mark.asyncio
async def test_training_environment_claims_are_bounded(monkeypatch):
    """TRAINING environment must enforce bounded sandbox limits rather than 999999."""
    async def fake_enforce_inst(**_kwargs):
        return 1

    monkeypatch.setattr(license_endpoint, "enforce_institution_access", fake_enforce_inst)
    req = Request({"type": "http", "path": "/api/v1/students", "query_string": b"", "headers": []})
    user = SimpleNamespace(id=1, role="admin", institution_id=1)

    await license_endpoint.enforce_license_request(
        request=req,
        current_user=user,
        db=SimpleNamespace(),
        data_environment="TRAINING",
    )
    claims = req.state.verified_lease_claims
    assert claims["max_students"] == 50
    assert claims["max_staff"] == 20
    assert claims["seats"] == 10


def test_dev_master_wildcard_disabled_by_default(monkeypatch):
    """PRATHAM-DEV-MASTER-ALL must be rejected unless opt-in env flag is explicitly enabled."""
    monkeypatch.delenv("PRATHAM_ALLOW_DEV_MASTER_LICENSE", raising=False)
    ok_default, _ = hardware.verify_hardware_fingerprint("PRATHAM-DEV-MASTER-ALL")
    assert ok_default is False

    monkeypatch.setenv("PRATHAM_ALLOW_DEV_MASTER_LICENSE", "1")
    ok_opt_in, _ = hardware.verify_hardware_fingerprint("PRATHAM-DEV-MASTER-ALL")
    assert ok_opt_in is True


def test_pyd_integrity_manifest_rejects_tampered_binary(tmp_path, monkeypatch):
    """Runtime binary integrity verification must fail when a .pyd file hash is modified."""
    core_dir = tmp_path / "app" / "core"
    core_dir.mkdir(parents=True)
    fake_pyd = core_dir / "security.pyd"
    fake_pyd.write_bytes(b"original-compiled-bytes")
    good_hash = hashlib.sha256(b"original-compiled-bytes").hexdigest()

    monkeypatch.setattr(run_server, "BACKEND_DIR", tmp_path)
    monkeypatch.setattr(run_server, "_EXPECTED_PYD_MANIFEST", {"app/core/security.pyd": good_hash})
    run_server._verify_pyd_integrity()

    fake_pyd.write_bytes(b"tampered-bytes")
    with pytest.raises(SystemExit, match="Runtime integrity mismatch"):
        run_server._verify_pyd_integrity()


def test_offline_30_day_trial_anchor_persists_across_db_wipe_and_expires(tmp_path, monkeypatch):
    """30-day machine trial binds strictly to host hardware, detects rollback, and reverts to evaluation at Day 31."""
    from datetime import datetime, timedelta, timezone
    from app.services import license_service

    monkeypatch.setenv("PRATHAM_TRIAL_ANCHOR_DIR", str(tmp_path))
    hw_id = "PRATHAM-1111-2222-3333-4444"
    start = datetime(2026, 11, 1, 10, 0, tzinfo=timezone.utc)
    rec = license_service.build_trial_record(hw_id, "prathamone-eduos", "PA001", now=start)
    env = license_service.sign_trial_record(rec)
    license_service.write_machine_trial_anchors(env, hw_id)

    # Reading anchor recovers signed 30-day state even without PostgreSQL row
    anchors = license_service.read_machine_trial_anchors(hw_id)
    assert len(anchors) == 1
    strict = license_service.merge_strictest_trial_records(anchors)

    day_10 = license_service.evaluate_machine_trial(strict, now=start + timedelta(days=10))
    assert day_10["mode"] == "trial"
    assert day_10["trial_active"] is True
    assert day_10["days_remaining"] == 20

    # Rolling clock backward before last_seen triggers evaluation lock
    rollback = license_service.evaluate_machine_trial(strict, now=start - timedelta(hours=2))
    assert rollback["mode"] == "evaluation"
    assert rollback["trial_expired"] is True
    assert rollback["error"] is not None

    # Day 31 cleanly expires back into read-only Evaluation Mode
    day_31 = license_service.evaluate_machine_trial(strict, now=start + timedelta(days=30, minutes=1))
    assert day_31["mode"] == "evaluation"
    assert day_31["trial_expired"] is True
    assert day_31["days_remaining"] == 0

    # Other hardware cannot verify the signed anchor
    assert license_service.read_machine_trial_anchors("PRATHAM-9999-8888-7777-6666") == []


@pytest.mark.asyncio
async def test_trial_node_lock_rejects_db_clone_and_enforces_student_staff_caps(tmp_path, monkeypatch):
    """Cloning a trial artifact onto another host fails closed, and quota guard stops inserts at limit."""
    from fastapi import HTTPException
    from app.services import license_service

    monkeypatch.setenv("PRATHAM_TRIAL_ANCHOR_DIR", str(tmp_path))
    other_hw = "PRATHAM-DEAD-BEEF-CAFE-BABE"
    other_rec = license_service.build_trial_record(other_hw, "prathamone-eduos", "PA001")
    other_env = license_service.sign_trial_record(other_rec)

    import json
    settings_by_key = {
        "license.trial_artifact": SimpleNamespace(value=json.dumps(other_env)),
    }

    async def fake_get_setting(_db, _inst_id, key):
        return settings_by_key.get(key)

    monkeypatch.setattr(license_endpoint, "_get_setting", fake_get_setting)
    monkeypatch.setattr(license_endpoint, "verify_hardware_fingerprint", lambda _fp: (False, "Hardware mismatch!"))
    monkeypatch.setattr(license_endpoint.settings, "LICENSE_ENFORCEMENT_STAGE", "enforced")
    monkeypatch.setattr(license_endpoint.settings, "LICENSE_PRODUCT_CODE", "prathamone-eduos")
    monkeypatch.setattr(license_endpoint.settings, "APP_RUNTIME_TARGET", "desktop")

    ctx = await license_endpoint._load_license_context(SimpleNamespace(), 1, "PA001")
    assert ctx["mode"] == "invalid"
    assert "Node-Lock Mismatch" in (ctx["error"] or "")

    # Verify enforce_lease_quota blocks at TRIAL_MAX_STUDENTS (100) and TRIAL_MAX_STAFF (25)
    class FakeResult:
        def __init__(self, count):
            self._count = count
        def scalar(self):
            return self._count

    class FakeDb:
        def __init__(self, count):
            self._count = count
        async def execute(self, _stmt):
            return FakeResult(self._count)

    req = Request({"type": "http", "path": "/api/v1/students", "query_string": b"", "headers": []})
    req.state.verified_lease_claims = {
        "mode": "trial",
        "max_students": license_service.TRIAL_MAX_STUDENTS,
        "max_staff": license_service.TRIAL_MAX_STAFF,
        "seats": license_service.TRIAL_SEATS,
    }
    await license_service.enforce_lease_quota(req, FakeDb(99), 1, resource_type="student", add_count=1)
    with pytest.raises(HTTPException) as exc_stu:
        await license_service.enforce_lease_quota(req, FakeDb(100), 1, resource_type="student", add_count=1)
    assert exc_stu.value.status_code == 423
    assert "100" in exc_stu.value.detail

    with pytest.raises(HTTPException) as exc_stf:
        await license_service.enforce_lease_quota(req, FakeDb(25), 1, resource_type="staff", add_count=1)
    assert exc_stf.value.status_code == 423
    assert "25" in exc_stf.value.detail
