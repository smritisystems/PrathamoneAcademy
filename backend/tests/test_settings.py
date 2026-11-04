# /**
#  * @file        test_settings.py
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
#  * @description Test suite for Institute Settings workspace, profile updates, batch configuration, and lookups CRUD.
#  */

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.institution import Institution
from app.models.user import User, Role
from app.models.settings import LookupItem, InstitutionSetting, SettingAuditLog
from app.core.security import create_access_token, get_password_hash


@pytest.fixture
async def admin_user(db: AsyncSession, test_institution: Institution):
    import random
    suffix = random.randint(100000, 999999)
    admin_role = (await db.execute(select(Role).where(Role.name == "admin"))).scalar_one_or_none()
    if not admin_role:
        admin_role = Role(name="admin", description="Administrator")
        db.add(admin_role)
        await db.flush()

    user = User(
        institution_id=test_institution.id,
        username=f"test_admin_{suffix}",
        email=f"test_admin_{suffix}@prashantacademy.edu.in",
        hashed_password=get_password_hash("Admin@2026!"),
        first_name="Admin",
        last_name="Test",
        role="admin",
        role_id=admin_role.id,
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@pytest.mark.asyncio
async def test_get_and_update_profile(client: AsyncClient, admin_user: User, test_institution: Institution):
    token = create_access_token({"sub": str(admin_user.id), "institution_id": test_institution.id})
    headers = {"Authorization": f"Bearer {token}"}

    # Fetch profile
    response = await client.get("/api/v1/settings/profile", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "name" in data
    assert "short_name" in data

    # Update profile
    payload = {
        "name": "PrathamOne Academy - Test Campus",
        "short_name": "PO-TEST",
        "tagline": "Learn • Practice • Excel",
        "primary_color": "#1E3A8A",
        "secondary_color": "#2563EB",
        "accent_color": "#7C3AED",
        "default_language": "en",
        "timezone": "Asia/Kolkata",
    }
    put_res = await client.put("/api/v1/settings/profile", headers=headers, json=payload)
    assert put_res.status_code == 200
    res_data = put_res.json()
    assert res_data["status"] == "success"
    assert res_data["profile"]["name"] == "PrathamOne Academy - Test Campus"
    assert res_data["profile"]["short_name"] == "PO-TEST"
    assert res_data["profile"]["tagline"] == "Learn • Practice • Excel"


@pytest.mark.asyncio
async def test_get_and_update_batch_settings(client: AsyncClient, admin_user: User, test_institution: Institution):
    token = create_access_token({"sub": str(admin_user.id), "institution_id": test_institution.id})
    headers = {"Authorization": f"Bearer {token}"}

    # Fetch all settings
    get_res = await client.get("/api/v1/settings/all", headers=headers)
    assert get_res.status_code == 200
    settings = get_res.json()
    assert "academic" in settings
    assert "fees" in settings
    assert "admission" in settings

    # Batch update settings
    batch_payload = {
        "category": "fees",
        "settings": {
            "receipt_prefix": "TEST-RCP",
            "next_receipt_number": 999,
            "currency_symbol": "₹",
        },
        "reason": "Automated test configuration",
    }
    post_res = await client.put("/api/v1/settings/batch", headers=headers, json=batch_payload)
    assert post_res.status_code == 200
    res_json = post_res.json()
    assert res_json["status"] == "success"

    # Verify updated values
    verify_res = await client.get("/api/v1/settings/all", headers=headers)
    assert verify_res.status_code == 200
    updated_settings = verify_res.json()
    assert updated_settings["fees"]["receipt_prefix"] == "TEST-RCP"
    assert updated_settings["fees"]["next_receipt_number"] == 999


@pytest.mark.asyncio
async def test_lookups_crud_workflow(client: AsyncClient, admin_user: User, test_institution: Institution):
    token = create_access_token({"sub": str(admin_user.id), "institution_id": test_institution.id})
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Fetch lookups
    get_res = await client.get("/api/v1/settings/lookups?category=payment_modes", headers=headers)
    assert get_res.status_code == 200
    res_data = get_res.json()
    assert "categories" in res_data
    assert "items" in res_data
    assert isinstance(res_data["items"], list)

    # 2. Create new lookup
    new_lookup = {
        "category": "test_modes",
        "code": "TEST_CARD",
        "label": "Test Credit Card",
        "description": "Custom credit card gateway",
        "sort_order": 1,
        "is_active": True,
    }
    create_res = await client.post("/api/v1/settings/lookups", headers=headers, json=new_lookup)
    assert create_res.status_code == 201
    res_data = create_res.json()
    assert res_data["status"] == "success"
    created_item = res_data["item"]
    assert created_item["code"] == "TEST_CARD"
    item_id = created_item["id"]

    # 3. Update lookup
    update_payload = {
        "label": "Test Credit Card Updated",
        "sort_order": 2,
    }
    update_res = await client.put(f"/api/v1/settings/lookups/{item_id}", headers=headers, json=update_payload)
    assert update_res.status_code == 200
    assert update_res.json()["item"]["label"] == "Test Credit Card Updated"

    # 4. Delete lookup
    del_res = await client.delete(f"/api/v1/settings/lookups/{item_id}", headers=headers)
    assert del_res.status_code == 200


@pytest.mark.asyncio
async def test_audit_logs_and_reset_defaults(client: AsyncClient, admin_user: User, test_institution: Institution):
    token = create_access_token({"sub": str(admin_user.id), "institution_id": test_institution.id})
    headers = {"Authorization": f"Bearer {token}"}

    # Fetch audit logs
    audit_res = await client.get("/api/v1/settings/audit-logs?limit=10", headers=headers)
    assert audit_res.status_code == 200
    logs = audit_res.json()
    assert isinstance(logs, list)

    # Reset defaults for a category
    reset_res = await client.post("/api/v1/settings/reset-defaults?category=academic", headers=headers)
    assert reset_res.status_code == 200
    assert reset_res.json()["status"] == "success"
