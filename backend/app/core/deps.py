# /**
#  * @file        deps.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      backend.app.core
#  *
#  * @author      Jawahar R. Mallah
#  * @organization AITDL (AI Technology & Development Lab)
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 AITDL
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-03
#  * @updated     2026-11-04
#  *
#  * @description FastAPI dependency injection providers for database sessions and authenticated user context.
#  */

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from jose import JWTError
from app.core.database import get_db
from app.core.security import decode_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
):
    from app.models.user import User

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(token)
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    result = await db.execute(
        select(User).where(User.id == int(user_id), User.is_active == True)
    )
    user = result.scalar_one_or_none()
    if user is None:
        raise credentials_exception
    return user


SYSADMIN_ROLES = {"sysadmin", "superadmin", "super_admin"}


def is_sysadmin(user) -> bool:
    """Returns True if the given user possesses full system administrator privileges."""
    return getattr(user, "role", None) in SYSADMIN_ROLES


async def get_current_active_user(current_user=Depends(get_current_user)):
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


def require_role(*roles: str):
    async def role_checker(
        current_user=Depends(get_current_active_user),
    ):
        # Universal superuser authorization: SysAdmin accounts have blanket access across all modules
        if current_user.role in SYSADMIN_ROLES or current_user.role in roles:
            return current_user

        raise HTTPException(
            status_code=403, detail="Insufficient permissions"
        )

    return role_checker


def require_sysadmin(
    current_user=Depends(get_current_active_user),
):
    """Restricts endpoint access exclusively to System Administrators."""
    if not is_sysadmin(current_user):
        raise HTTPException(
            status_code=403, detail="System Administrator (SysAdmin) privileges required"
        )
    return current_user

