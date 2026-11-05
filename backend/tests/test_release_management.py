# /**
#  * @file        test_release_management.py
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
#  * @created     2026-11-05
#  * @updated     2026-11-05
#  *
#  * @description Comprehensive test suite verifying release change tracking, automated release notes, semver management, CI/CD validation, and approval lifecycles.
#  */

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.release import SystemRelease
from app.models.user import User, Role
from app.services.release_service import (
    sanitize_sensitive_data,
    bump_semver,
    parse_semver,
    categorize_commit_message,
    ReleaseService,
)


def test_sanitize_sensitive_data():
    """Requirement 1: Verify secrets and tokens are masked."""
    text_with_secret = "fix: update db connection postgresql+asyncpg://admin:SuperSecretPass123!@db:5432/prashant"
    sanitized = sanitize_sensitive_data(text_with_secret)
    assert "SuperSecretPass123!" not in sanitized
    assert "***REDACTED***" in sanitized

    jwt_text = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIn0.sig"
    sanitized_jwt = sanitize_sensitive_data(jwt_text)
    assert "eyJhbGci" not in sanitized_jwt
    assert "[REDACTED_SECRET]" in sanitized_jwt


def test_semver_bumping_and_parsing():
    """Requirement 3: Verify semantic versioning scheme."""
    major, minor, patch, pre = parse_semver("6.99.1")
    assert (major, minor, patch) == (6, 99, 1)

    assert bump_semver("6.99.1", "patch") == "6.99.2"
    assert bump_semver("6.99.1", "minor") == "6.100.0"
    assert bump_semver("6.99.1", "major") == "7.0.0"
    assert bump_semver("6.99.1", "7.1.0") == "7.1.0"


def test_conventional_commit_categorization():
    """Requirement 1 & 2: Categorize commits into standard groups."""
    cat, desc, breaking = categorize_commit_message("feat(students): add withdrawal reason and exit analytics")
    assert cat == "added"
    assert "withdrawal reason" in desc
    assert not breaking

    cat2, desc2, breaking2 = categorize_commit_message("fix(receipt): resolve printing layout clipping")
    assert cat2 == "fixed"

    cat3, desc3, breaking3 = categorize_commit_message("security: enforce secret key startup validation")
    assert cat3 == "security"

    cat4, desc4, breaking4 = categorize_commit_message("migration: add system_releases table")
    assert cat4 == "database"


@pytest.mark.asyncio
async def test_get_current_release_and_seed_history(
    client: AsyncClient,
    auth_headers: dict,
):
    """
    Requirement 3: Display current release & maintain release history.
    """
    # 1. Fetch current release
    res_curr = await client.get("/api/v1/releases/current", headers=auth_headers)
    assert res_curr.status_code == 200
    curr_data = res_curr.json()
    assert "version" in curr_data
    assert "build_number" in curr_data
    assert curr_data["status"] == "published"

    # 2. List release history
    res_list = await client.get("/api/v1/releases/", headers=auth_headers)
    assert res_list.status_code == 200
    history = res_list.json()
    assert history["total"] >= 1
    versions = [item["version"] for item in history["items"]]
    assert "6.99.1" in versions


@pytest.mark.asyncio
async def test_pending_changes_inspection(
    client: AsyncClient,
    auth_headers: dict,
):
    """
    Requirement 1 & 2: Track unreleased commits, modified files, and migrations.
    """
    res = await client.get("/api/v1/releases/pending-changes", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert "last_published_version" in data
    assert "next_version" in data
    assert "recommended_bump" in data
    assert "structured_notes" in data
    assert isinstance(data["migrations"], list)


@pytest.mark.asyncio
async def test_full_release_lifecycle(
    client: AsyncClient,
    auth_headers: dict,
    db: AsyncSession,
):
    """
    Requirement 4, 5, 6, 7:
    Draft -> Validating -> Release Candidate -> Approved -> Published -> Rolled Back
    """
    # 1. Generate a new release draft
    draft_payload = {
        "version": "7.0.0",
        "title": "Release v7.0.0 — Major Architecture & Operational Governance",
        "environment": "production",
        "bump_type": "major",
        "is_critical_security": False,
        "migration_plan": "Backward-compatible table addition with zero downtime.",
    }
    res_draft = await client.post("/api/v1/releases/generate-draft", headers=auth_headers, json=draft_payload)
    assert res_draft.status_code == 201
    draft_data = res_draft.json()
    release_id = draft_data["release_id"]
    assert draft_data["status"] == "draft"
    assert draft_data["version"] == "7.0.0"

    # 2. Get Release Details & Update Notes
    res_detail = await client.get(f"/api/v1/releases/{release_id}", headers=auth_headers)
    assert res_detail.status_code == 200
    detail_data = res_detail.json()
    assert detail_data["status"] == "draft"

    update_payload = {
        "title": "Release v7.0.0 — Enterprise Release Management & Governance Suite",
        "release_notes_markdown": "# Release v7.0.0 Notes\n\n### Added\n- Automated Change Tracking\n- CI/CD Pre-Flight Checks",
    }
    res_update = await client.put(f"/api/v1/releases/{release_id}", headers=auth_headers, json=update_payload)
    assert res_update.status_code == 200

    # 3. Attempt to promote to RC before validation -> Must fail
    res_premature_rc = await client.post(f"/api/v1/releases/{release_id}/promote-rc", headers=auth_headers)
    assert res_premature_rc.status_code == 400

    # 4. Run Pre-flight CI/CD Validations
    res_val = await client.post(f"/api/v1/releases/{release_id}/validate", headers=auth_headers)
    assert res_val.status_code == 200
    val_data = res_val.json()
    assert val_data["validation_status"] == "passed"
    assert val_data["checks"]["semver_format"]["status"] == "passed"
    assert val_data["checks"]["secret_scan"]["status"] == "passed"

    # 5. Promote to Release Candidate
    res_rc = await client.post(f"/api/v1/releases/{release_id}/promote-rc", headers=auth_headers)
    assert res_rc.status_code == 200
    assert res_rc.json()["status"] == "release_candidate"

    # 6. Attempt to publish before approval -> Must fail
    res_unapproved_pub = await client.post(f"/api/v1/releases/{release_id}/publish", headers=auth_headers)
    assert res_unapproved_pub.status_code == 400

    # 7. Approve Release Candidate
    res_app = await client.post(f"/api/v1/releases/{release_id}/approve", headers=auth_headers)
    assert res_app.status_code == 200
    assert res_app.json()["status"] == "approved"

    # 8. Publish / Deploy to Production
    res_pub = await client.post(f"/api/v1/releases/{release_id}/publish", headers=auth_headers)
    assert res_pub.status_code == 200
    assert res_pub.json()["status"] == "published"

    # Verify current release now reflects the new version
    res_curr_check = await client.get("/api/v1/releases/current", headers=auth_headers)
    assert res_curr_check.json()["version"] == "7.0.0"

    # 9. Rollback Release
    rollback_payload = {
        "reason": "Emergency stability test rollback to previous baseline version.",
        "target_version": "6.99.1",
    }
    res_rb = await client.post(f"/api/v1/releases/{release_id}/rollback", headers=auth_headers, json=rollback_payload)
    assert res_rb.status_code == 200
    rb_data = res_rb.json()
    assert rb_data["status"] == "rolled_back"
    assert rb_data["rollback_target_version"] == "6.99.1"

    # 10. Verify Audit History
    res_audit = await client.get(f"/api/v1/releases/{release_id}/audit", headers=auth_headers)
    assert res_audit.status_code == 200
    audit_events = res_audit.json()
    actions = [a["action"] for a in audit_events]
    assert "release_draft_created" in actions
    assert "release_validated" in actions
    assert "release_promoted_rc" in actions
    assert "release_approved" in actions
    assert "release_published" in actions
    assert "release_rolled_back" in actions
