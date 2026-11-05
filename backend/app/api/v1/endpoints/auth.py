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
#  * @updated     2026-11-06
#  *
#  * @description API endpoints for user authentication, password verification, and JWT session issuance.
#  */

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from datetime import datetime, timezone
from app.core.database import get_db
from app.core.deps import get_user_permissions
from app.core.security import verify_password, create_access_token, create_refresh_token
from app.models.user import User
from app.core.limiter import limiter

router = APIRouter()


@router.post("/login")
@limiter.limit("5/minute")
async def login(
    request: Request,
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


@router.post("/logout")
async def logout():
    # Token invalidation: tokens expire per ACCESS_TOKEN_EXPIRE_MINUTES in config.
    # For a stateless JWT setup, the client must discard its token.
    # A full server-side blocklist requires Redis; see ROADMAP for planned implementation.
    return {"message": "Logged out successfully"}
