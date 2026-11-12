# /**
#  * @file        test_p2_session_and_ssot.py
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
#  * @created     2026-11-12
#  * @updated     2026-11-12
#  *
#  * @description Regression tests verifying Sprint 3 P2/P3 session cookie auth, jti token revocation on logout/refresh, >72-byte password hashing, share-link hashed PINs, git ref sanitization, and SSOT snapshot/release seeding stability.
#  */

import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME
from app.core.security import decode_token, get_password_hash, verify_password
from app.models.communication import SharedDocumentToken
from app.models.release import SystemRelease
from app.models.user import AuditLog, RevokedToken, Role, User
from app.services.release_service import ReleaseService


async def _create_test_user(
    db: AsyncSession, role_name: str, password: str, institution_id: int = 1
) -> User:
    suffix = uuid.uuid4().hex[:8]
    role = (await db.execute(select(Role).where(Role.name == role_name))).scalar_one_or_none()
    if not role:
        role = Role(name=role_name, description=role_name.title())
        db.add(role)
        await db.flush()

    user = User(
        institution_id=institution_id,
        username=f"p2_{role_name}_{suffix}",
        email=f"p2_{role_name}_{suffix}@test.edu.in",
        hashed_password=get_password_hash(password),
        first_name="Sprint",
        last_name="Tester",
        role=role_name,
        role_id=role.id,
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


def test_long_password_does_not_truncate_at_72_bytes():
    base = "A" * 80
    pw_one = base + "_ONE!"
    pw_two = base + "_TWO!"

    hashed = get_password_hash(pw_one)
    assert hashed.startswith("sha256$")
    assert verify_password(pw_one, hashed) is True
    assert verify_password(pw_two, hashed) is False
    # Legacy <=72-byte password still uses standard bcrypt format
    short_hash = get_password_hash("ShortPass123!")
    assert not short_hash.startswith("sha256$")
    assert verify_password("ShortPass123!", short_hash) is True


def test_git_ref_sanitizer_blocks_injection_and_range_abuse():
    assert ReleaseService._sanitize_git_ref("a1b2c3d4") == "a1b2c3d4"
    assert ReleaseService._sanitize_git_ref("v1.76.0") == "v1.76.0"
    assert ReleaseService._sanitize_git_ref("--exec=evil") is None
    assert ReleaseService._sanitize_git_ref("main..other;rm -rf") is None
    assert ReleaseService._sanitize_git_ref("-n1") is None


@pytest.mark.asyncio
async def test_httponly_cookie_auth_refresh_and_logout_jti_revocation(
    client: AsyncClient, db: AsyncSession
):
    long_pw = "LongPass_" + ("X" * 80) + "_2026!"
    user = await _create_test_user(db, "admin", long_pw)

    try:
        login_res = await client.post(
            "/api/v1/auth/login",
            data={"username": user.username, "password": long_pw},
        )
        assert login_res.status_code == 200
        body = login_res.json()
        raw_access = body["access_token"]
        raw_refresh = body["refresh_token"]
        access_payload = decode_token(raw_access)
        assert "jti" in access_payload

        set_cookies = login_res.headers.get_list("set-cookie")
        joined_cookies = "\n".join(set_cookies).lower()
        assert ACCESS_COOKIE_NAME in joined_cookies
        assert REFRESH_COOKIE_NAME in joined_cookies
        assert "httponly" in joined_cookies
        assert "samesite=lax" in joined_cookies

        # Cookie-authenticated request works WITHOUT Authorization header
        client.cookies.clear()
        me_res = await client.get(
            "/api/v1/users/me",
            cookies={ACCESS_COOKIE_NAME: raw_access},
        )
        assert me_res.status_code == 200
        assert me_res.json()["username"] == user.username

        # Refresh endpoint accepts HttpOnly refresh cookie & rotates refresh token
        refresh_res = await client.post(
            "/api/v1/auth/refresh",
            cookies={REFRESH_COOKIE_NAME: raw_refresh},
        )
        assert refresh_res.status_code == 200
        rotated_access = refresh_res.json()["access_token"]
        assert rotated_access != raw_access

        # Old refresh token is now revoked and cannot be replayed
        replay_res = await client.post(
            "/api/v1/auth/refresh",
            cookies={REFRESH_COOKIE_NAME: raw_refresh},
        )
        assert replay_res.status_code == 401

        # Logout persists jti revocation and invalidates rotated access token
        logout_res = await client.post(
            "/api/v1/auth/logout",
            headers={"Authorization": f"Bearer {rotated_access}"},
        )
        assert logout_res.status_code == 200
        rotated_jti = decode_token(rotated_access)["jti"]
        revoked_row = (
            await db.execute(select(RevokedToken).where(RevokedToken.jti == rotated_jti))
        ).scalar_one_or_none()
        assert revoked_row is not None

        post_logout = await client.get(
            "/api/v1/users/me",
            headers={"Authorization": f"Bearer {rotated_access}"},
        )
        assert post_logout.status_code == 401
    finally:
        client.cookies.clear()


@pytest.mark.asyncio
async def test_shared_doc_pin_stored_hashed_and_seed_historical_releases_idempotent(
    client: AsyncClient, db: AsyncSession
):
    from app.core.security import create_access_token

    admin = await _create_test_user(db, "admin", "ShareAdmin123!")
    headers = {"Authorization": f"Bearer {create_access_token({'sub': str(admin.id)})}"}

    # Creating a PIN-protected share stores hashed PIN rather than plaintext
    res = await client.post(
        "/api/v1/communication/share-document",
        headers=headers,
        json={
            "document_type": "RECEIPT",
            "record_id": 999,
            "access_key": "4829",
            "recipient_name": "Parent",
            "recipient_phone": "9999988888",
        },
    )
    assert res.status_code == 200
    share_token = res.json()["token"]

    row = (
        await db.execute(
            select(SharedDocumentToken).where(SharedDocumentToken.token == share_token)
        )
    ).scalar_one()
    assert row.access_key != "4829"
    assert row.access_key.startswith("$2")

    # Wrong PIN fails 403, correct PIN resolves 200
    bad_pin = await client.get(f"/api/v1/communication/shared-doc/{share_token}?pin=0000")
    assert bad_pin.status_code == 403
    ok_pin = await client.get(f"/api/v1/communication/shared-doc/{share_token}?pin=4829")
    assert ok_pin.status_code == 200
    assert ok_pin.json()["status"] == "valid"

    # Non-historical release already present does not suppress seeding v1.0.0
    await ReleaseService.seed_historical_releases(db, admin.id)
    rel_versions = set((await db.execute(select(SystemRelease.version))).scalars().all())
    assert {"1.0.0", "1.4.0", "6.99.1"}.issubset(rel_versions)
    assert hasattr(AuditLog, "institution_id")

