# /**
#  * @file        auth.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      backend.app.api.v1.endpoints
#  *
#  * @author      Jawahar R. Mallah
#  * @organization AITDL (AI Technology & Development Lab)
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 AITDL
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-03
#  * @updated     2026-11-12
#  *
#  * @description API endpoints for user authentication, password verification, and JWT session issuance.
#  */

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from datetime import datetime, timezone
from jwt.exceptions import InvalidTokenError as JWTError
from app.core.config import settings
from app.core.database import get_db
from app.core.deps import (
    ACCESS_COOKIE_NAME,
    REFRESH_COOKIE_NAME,
    get_user_permissions,
    oauth2_scheme,
)
from app.core.security import (
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.models.user import RevokedToken, User
from app.core.limiter import limiter

router = APIRouter()


class RefreshRequest(BaseModel):
    refresh_token: Optional[str] = None


def _set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    is_secure = not settings.DEBUG
    response.set_cookie(
        key=ACCESS_COOKIE_NAME,
        value=access_token,
        httponly=True,
        samesite="lax",
        secure=is_secure,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
    )
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=refresh_token,
        httponly=True,
        samesite="lax",
        secure=is_secure,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        path="/api/v1/auth",
    )


def _clear_auth_cookies(response: Response) -> None:
    response.delete_cookie(key=ACCESS_COOKIE_NAME, path="/", samesite="lax")
    response.delete_cookie(key=REFRESH_COOKIE_NAME, path="/api/v1/auth", samesite="lax")


async def _revoke_raw_token(db: AsyncSession, raw_token: Optional[str]) -> None:
    if not raw_token:
        return
    try:
        payload = decode_token(raw_token)
    except (JWTError, TypeError, ValueError):
        return
    jti = payload.get("jti")
    exp = payload.get("exp")
    if not jti or not exp:
        return
    existing = (
        await db.execute(select(RevokedToken.id).where(RevokedToken.jti == jti))
    ).scalar_one_or_none()
    if existing is not None:
        return
    user_id = None
    try:
        if payload.get("sub") is not None:
            user_id = int(payload["sub"])
    except (TypeError, ValueError):
        user_id = None
    db.add(
        RevokedToken(
            jti=jti,
            user_id=user_id,
            expires_at=datetime.fromtimestamp(exp, tz=timezone.utc),
        )
    )


@router.post("/login")
@limiter.limit("5/minute")
async def login(
    request: Request,
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User).where(
            (User.username == form_data.username)
            | (User.email == form_data.username),
            User.is_active == True,
        )
    )
    user = result.scalar_one_or_none()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    await db.execute(
        update(User)
        .where(User.id == user.id)
        .values(last_login=datetime.now(timezone.utc))
    )
    await db.commit()

    access_token = create_access_token(data={"sub": str(user.id)})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})
    _set_auth_cookies(response, access_token, refresh_token)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "role": user.role,
            "institution_id": user.institution_id,
            "permissions": [f"{r}:{a}" for r, a in await get_user_permissions(db, user)],
        },
    }


@router.post("/refresh")
@limiter.limit("10/minute")
async def refresh_session(
    request: Request,
    response: Response,
    body: Optional[RefreshRequest] = None,
    db: AsyncSession = Depends(get_db),
):
    raw_refresh = (body.refresh_token if body and body.refresh_token else None) or request.cookies.get(REFRESH_COOKIE_NAME)
    if not raw_refresh:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token missing")

    try:
        payload = decode_token(raw_refresh)
        if payload.get("type") != "refresh":
            raise ValueError("Invalid token type")
        user_id = int(payload["sub"])
        jti = payload.get("jti")
    except (JWTError, KeyError, TypeError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token")

    if jti:
        revoked = (
            await db.execute(select(RevokedToken.id).where(RevokedToken.jti == jti))
        ).scalar_one_or_none()
        if revoked is not None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token has been revoked")

    user = (
        await db.execute(select(User).where(User.id == user_id, User.is_active == True))
    ).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User inactive or not found")

    await _revoke_raw_token(db, raw_refresh)
    new_access = create_access_token(data={"sub": str(user.id)})
    new_refresh = create_refresh_token(data={"sub": str(user.id)})
    await db.commit()
    _set_auth_cookies(response, new_access, new_refresh)
    return {
        "access_token": new_access,
        "refresh_token": new_refresh,
        "token_type": "bearer",
    }


@router.post("/logout")
async def logout(
    request: Request,
    response: Response,
    bearer_token: Optional[str] = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
):
    await _revoke_raw_token(db, bearer_token)
    await _revoke_raw_token(db, request.cookies.get(ACCESS_COOKIE_NAME))
    await _revoke_raw_token(db, request.cookies.get(REFRESH_COOKIE_NAME))
    await db.commit()
    _clear_auth_cookies(response)
    return {"message": "Logged out successfully"}
