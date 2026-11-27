# /**
#  * @file        test_institution_profile_and_branches.py
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
#  * @created     2026-11-27
#  * @updated     2026-11-27
#  *
#  * @description Tests for institution profile setup, neutral defaults (zero dummy leakage), validation, logo sanitization, and multi-branch CRUD.
#  */

import base64
import random
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token, get_password_hash
from app.models.institution import Institution
from app.models.settings import SettingAuditLog
from app.models.user import Role, User


@pytest.fixture
async def profile_admin(db: AsyncSession, test_institution: Institution):
    suffix = random.randint(100000, 999999)
    admin_role = (await db.execute(select(Role).where(Role.name == "admin"))).scalar_one_or_none()
    if not admin_role:
        admin_role = Role(name="admin", description="Administrator")
        db.add(admin_role)
        await db.flush()

    user = User(
        institution_id=test_institution.id,
        username=f"profile_admin_{suffix}",
        email=f"profile_admin_{suffix}@example.edu",
        hashed_password=get_password_hash("Admin@2026!"),
        first_name="Profile",
        last_name="Admin",
        role="admin",
        role_id=admin_role.id,
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    token = create_access_token({"sub": str(user.id), "institution_id": test_institution.id})
    return user, {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_profile_returns_null_for_unset_fields_without_dummy_defaults(
    client: AsyncClient, db: AsyncSession, profile_admin, test_institution: Institution
):
    _, headers = profile_admin
    test_institution.name = "Your Coaching Institute"
    test_institution.phone = None
    test_institution.address = None
    test_institution.email = None
    test_institution.gstin = None
    test_institution.pan = None
    test_institution.tax_id = None
    test_institution.registration_number = None
    test_institution.onboarding_completed = False
    await db.commit()

    res = await client.get("/api/v1/settings/profile", headers=headers)
    assert res.status_code == 200
    body = res.json()
    assert body["phone"] is None
    assert body["address"] is None
    assert body["email"] is None
    assert body["gstin"] is None
    assert body["pan"] is None
    assert body["registration_number"] is None
    assert body["onboarding_completed"] is False
    assert body["is_placeholder_profile"] is True


@pytest.mark.asyncio
async def test_profile_validation_and_logo_sanitization(
    client: AsyncClient, profile_admin
):
    _, headers = profile_admin

    # Invalid Indian PIN starting with 0
    bad_pin = await client.put(
        "/api/v1/settings/profile",
        headers=headers,
        json={"name": "Apex Vidyalaya", "country": "India", "pincode": "012345"},
    )
    assert bad_pin.status_code == 422

    # Hardcoded dummy phone rejected
    bad_phone = await client.put(
        "/api/v1/settings/profile",
        headers=headers,
        json={"name": "Apex Vidyalaya", "phone": "+91 8779 123 007"},
    )
    assert bad_phone.status_code == 422

    # Unrecognized Indian state rejected
    bad_state = await client.put(
        "/api/v1/settings/profile",
        headers=headers,
        json={"name": "Apex Vidyalaya", "country": "India", "state": "InvalidStateXYZ"},
    )
    assert bad_state.status_code == 422

    # Unsafe SVG rejected
    xss_svg = base64.b64encode(b'<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>').decode()
    bad_logo = await client.put(
        "/api/v1/settings/profile",
        headers=headers,
        json={"name": "Apex Vidyalaya", "logo_url": f"data:image/svg+xml;base64,{xss_svg}"},
    )
    assert bad_logo.status_code == 422

    # Valid minimal onboarding succeeds even with optional GSTIN/PAN omitted
    safe_svg = base64.b64encode(b'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4"/></svg>').decode()
    ok_res = await client.put(
        "/api/v1/settings/profile",
        headers=headers,
        json={
            "name": "Apex Science Academy",
            "branch_name": "Kothrud Main",
            "address_line_1": "Plot 12, Paud Road",
            "city": "Pune",
            "district": "Pune",
            "state": "maharashtra",
            "pincode": "411038",
            "country": "India",
            "phone": "9820112345",
            "email": "office@apexscience.example",
            "logo_url": f"data:image/svg+xml;base64,{safe_svg}",
            "onboarding_completed": True,
        },
    )
    assert ok_res.status_code == 200
    profile = ok_res.json()["profile"]
    assert profile["name"] == "Apex Science Academy"
    assert profile["state"] == "Maharashtra"
    assert profile["branch_name"] == "Kothrud Main"
    assert profile["onboarding_completed"] is True
    assert profile["gstin"] is None
    assert profile["pan"] is None


@pytest.mark.asyncio
async def test_multi_branch_crud_duplicate_and_main_branch_guards(
    client: AsyncClient, db: AsyncSession, profile_admin, test_institution: Institution
):
    _, headers = profile_admin

    # Save main branch via profile first
    await client.put(
        "/api/v1/settings/profile",
        headers=headers,
        json={"name": "Horizon Coaching Classes", "branch_name": "Main Branch", "onboarding_completed": True},
    )

    # Create secondary branch
    b2 = await client.post(
        f"/api/v1/institutions/{test_institution.id}/branches",
        headers=headers,
        json={
            "branch_name": "West Wing Campus",
            "branch_code": "WEST01",
            "city": "Pune",
            "state": "Maharashtra",
            "pincode": "411004",
            "phone": "9822001122",
        },
    )
    assert b2.status_code == 201
    b2_id = b2.json()["id"]

    # Duplicate branch name/code rejected -> 409
    dup = await client.post(
        f"/api/v1/institutions/{test_institution.id}/branches",
        headers=headers,
        json={"branch_name": "west wing campus", "branch_code": "WEST02"},
    )
    assert dup.status_code == 409

    # List branches & verify main branch deletion blocked
    listed = await client.get(f"/api/v1/institutions/{test_institution.id}/branches", headers=headers)
    assert listed.status_code == 200
    branches = listed.json()
    assert len(branches) >= 2
    main_id = next(b["id"] for b in branches if b["is_main_branch"])
    del_main = await client.delete(f"/api/v1/institutions/{test_institution.id}/branches/{main_id}", headers=headers)
    assert del_main.status_code == 409

    # Deactivate secondary branch cleanly
    del_b2 = await client.delete(f"/api/v1/institutions/{test_institution.id}/branches/{b2_id}", headers=headers)
    assert del_b2.status_code == 200

    # Verify audit trail recorded branch mutations
    audits = (
        await db.execute(
            select(SettingAuditLog).where(
                SettingAuditLog.institution_id == test_institution.id,
                SettingAuditLog.category == "branches",
            )
        )
    ).scalars().all()
    assert len(audits) >= 2
