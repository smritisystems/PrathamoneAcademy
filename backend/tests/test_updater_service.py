# /**
#  * @file        test_updater_service.py
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
#  * @created     2026-11-18
#  * @updated     2026-11-25
#  *
#  * @description Test suite for automated 1-click update engine and zero-data-loss rollback protection.
#  */

import hashlib
from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.endpoints import releases as releases_endpoint
from app.services.updater_service import UpdateProgressState, UpdaterService, update_tracker


@pytest.mark.asyncio
async def test_update_progress_state_transitions():
    """Verify progress tracking state updates and log appending."""
    state = UpdateProgressState()
    initial = await state.get_state()
    assert initial["status"] == "idle"
    assert initial["progress_percent"] == 0
    assert len(initial["logs"]) == 0

    await state.update(
        percent=25,
        step="database_snapshot",
        step_num=2,
        msg="Creating backup snapshot",
        log_entry="Snapshot created: snapshot_test.sql",
        status="in_progress",
    )

    updated = await state.get_state()
    assert updated["progress_percent"] == 25
    assert updated["current_step"] == "database_snapshot"
    assert updated["step_number"] == 2
    assert updated["status"] == "in_progress"
    assert len(updated["logs"]) == 1
    assert "snapshot_test.sql" in updated["logs"][0]


@pytest.mark.asyncio
async def test_package_integrity_sha256(tmp_path):
    """Verify SHA-256 package verification logic."""
    test_file = tmp_path / "update_pkg.tar.gz"
    content = b"PrathamOne EduOS Update Payload 1.134.0"
    test_file.write_bytes(content)

    correct_sha = hashlib.sha256(content).hexdigest()
    wrong_sha = "0000000000000000000000000000000000000000000000000000000000000000"

    # Valid SHA should return True
    assert UpdaterService.verify_package_integrity(test_file, correct_sha) is True
    # Invalid SHA should return False
    assert UpdaterService.verify_package_integrity(test_file, wrong_sha) is False


@pytest.mark.asyncio
async def test_updater_service_check_for_updates(db: AsyncSession):
    """Verify update check returns expected schema and versions."""
    res = await UpdaterService.check_available_update(db)
    assert "current_version" in res
    assert "latest_version" in res
    assert "update_available" in res
    assert "backup_engine_ready" in res
    assert res["backup_engine_ready"] is True
    assert res["can_auto_update"] is False


@pytest.mark.asyncio
async def test_updater_api_endpoints(client: AsyncClient, auth_headers: dict):
    """Verify update status, check, and reset endpoints via REST."""
    # 1. Check update status endpoint
    res_status = await client.get("/api/v1/releases/update-status", headers=auth_headers)
    assert res_status.status_code == 200
    status_data = res_status.json()
    assert "status" in status_data
    assert "progress_percent" in status_data
    assert "logs" in status_data

    # 2. Check for updates endpoint
    res_check = await client.get("/api/v1/releases/check-update", headers=auth_headers)
    assert res_check.status_code == 200
    check_data = res_check.json()
    assert "current_version" in check_data
    assert "latest_version" in check_data
    assert "update_available" in check_data
    assert check_data["can_auto_update"] is False

    # 3. Reset update status endpoint
    res_reset = await client.post("/api/v1/releases/reset-update-status", headers=auth_headers)
    assert res_reset.status_code == 200
    reset_data = res_reset.json()
    assert reset_data["message"] == "Update status reset successfully."


@pytest.mark.asyncio
async def test_apply_update_endpoint_returns_503_until_verification_is_ready(monkeypatch):
    monkeypatch.setattr(releases_endpoint, "AUTO_UPDATE_VERIFICATION_READY", False)
    monkeypatch.setattr(releases_endpoint, "is_authorized_release_manager", lambda _user: True)

    with pytest.raises(HTTPException) as unavailable:
        await releases_endpoint.apply_system_update(
            payload=releases_endpoint.ApplyUpdateRequest(target_version="1.134.1"),
            current_user=SimpleNamespace(id=1, role="sysadmin"),
        )

    assert unavailable.value.status_code == 503
    assert "signed release metadata" in unavailable.value.detail


@pytest.mark.asyncio
async def test_run_update_pipeline_fails_closed_without_verified_release_package():
    await UpdaterService.run_update_pipeline(
        target_version="1.134.1",
        user_id=1,
    )
    state = await update_tracker.get_state()
    assert state["status"] == "failed"
    assert state["progress_percent"] == 0
    assert state["snapshot_path"] is None
    assert "signed release metadata" in state["error"]

