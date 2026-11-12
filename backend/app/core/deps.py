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
#  * @updated     2026-11-12
#  *
#  * @description FastAPI dependency injection providers for database sessions and authenticated user context.
#  */

from typing import Optional
from fastapi import Depends, HTTPException, Query, Header, Request, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from jwt.exceptions import InvalidTokenError as JWTError
from app.core.database import get_db
from app.core.security import decode_token

ACCESS_COOKIE_NAME = "prashant_access_token"
REFRESH_COOKIE_NAME = "prashant_refresh_token"

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


async def get_current_user(
    request: Request,
    bearer_token: Optional[str] = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
):
    from app.models.user import RevokedToken, User

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    token = bearer_token or (request.cookies.get(ACCESS_COOKIE_NAME) if request else None)
    if not token:
        raise credentials_exception

    try:
        payload = decode_token(token)
        token_type = payload.get("type")
        if token_type != "access":
            raise credentials_exception
        raw_sub = payload.get("sub")
        user_id = int(raw_sub)
        jti = payload.get("jti")
    except (JWTError, TypeError, ValueError):
        raise credentials_exception

    if jti:
        revoked = (
            await db.execute(select(RevokedToken.id).where(RevokedToken.jti == jti))
        ).scalar_one_or_none()
        if revoked is not None:
            raise credentials_exception

    result = await db.execute(
        select(User).where(User.id == user_id, User.is_active == True)
    )
    user = result.scalar_one_or_none()
    if user is None:
        raise credentials_exception
    return user


SYSADMIN_ROLES = {"sysadmin", "superadmin", "super_admin"}


def is_sysadmin(user) -> bool:
    """Returns True if the given user possesses full system administrator privileges."""
    role = (getattr(user, "role", None) or "").strip().lower()
    return role in {r.lower() for r in SYSADMIN_ROLES}


async def get_current_active_user(current_user=Depends(get_current_user)):
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


def require_role(*roles):
    normalized_roles = set()
    for item in roles:
        if isinstance(item, (list, tuple, set)):
            normalized_roles.update(str(sub).strip().lower() for sub in item if sub is not None)
        elif item is not None:
            normalized_roles.add(str(item).strip().lower())
    normalized_sysadmin = {r.strip().lower() for r in SYSADMIN_ROLES}

    async def role_checker(
        current_user=Depends(get_current_active_user),
    ):
        # Universal superuser authorization: SysAdmin accounts have blanket access across all modules
        user_role = (getattr(current_user, "role", None) or "").strip().lower()
        if user_role in normalized_sysadmin or user_role in normalized_roles:
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


TRAINING_INSTITUTION_CODE = "PA001-DEMO"
TRAINING_ALLOWED_ROLES = {"sysadmin", "superadmin", "super_admin", "admin", "principal", "staff", "accountant", "teacher"}


def get_data_environment(
    x_data_env: Optional[str] = Header(None, alias="X-Data-Environment"),
    data_environment: Optional[str] = Query(None, description="PRODUCTION, TRAINING, or ALL"),
) -> str:
    """
    Resolves active data environment context from X-Data-Environment header or query parameter.
    Defaults strictly to 'PRODUCTION'.
    """
    env = (x_data_env or data_environment or "PRODUCTION").strip().upper()
    if env not in ("PRODUCTION", "TRAINING", "ALL"):
        return "PRODUCTION"
    return env


async def enforce_institution_access(
    institution_id: Optional[int] = Query(None, description="Target institution ID"),
    data_env: str = Depends(get_data_environment),
    current_user=Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> Optional[int]:
    """
    Enforces multi-tenant data isolation and Global Training & Demo Environment routing.
    - If in TRAINING mode:
      - Validates user role/permission for training access.
      - Resolves and binds institution to the isolated Training Tenant ('PA001-DEMO').
    - If in PRODUCTION mode:
      - Standard multi-tenant boundary checks (live tenant only).
      - Strictly forbids routing to or querying training tenant in production context.
    """
    from app.models.institution import Institution

    if data_env == "TRAINING":
        user_role = (getattr(current_user, "role", "") or "").lower()
        if not (is_sysadmin(current_user) or user_role in TRAINING_ALLOWED_ROLES):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access forbidden: You do not have permission to access the Training / Demo Environment.",
            )
        res = await db.execute(
            select(Institution.id).where(Institution.code == TRAINING_INSTITUTION_CODE)
        )
        training_id = res.scalar_one_or_none()
        if not training_id:
            res_any = await db.execute(
                select(Institution.id).where(Institution.code.like("%DEMO%"))
            )
            training_id = res_any.scalar_one_or_none()
        return training_id or 2

    # PRODUCTION mode
    user_inst_id = getattr(current_user, "institution_id", None) or 1

    if is_sysadmin(current_user) or getattr(current_user, "institution_id", None) is None:
        return institution_id or user_inst_id

    if institution_id is not None and institution_id != user_inst_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: You cannot access data outside your assigned institution.",
        )

    return user_inst_id


def check_institution_access(target_institution_id: Optional[int], current_user) -> None:
    """
    Raises HTTP 403 if a non-sysadmin tenant user accesses an unassigned/global
    record or a record outside their assigned institution.
    """
    if is_sysadmin(current_user):
        return
    user_inst_id = getattr(current_user, "institution_id", None)
    if user_inst_id is not None and (target_institution_id is None or target_institution_id != user_inst_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: You cannot access data outside your assigned institution.",
        )


async def get_user_permissions(db: AsyncSession, user) -> set[tuple[str, str]]:
    """
    Retrieves all effective (resource, action) permissions for a user from their role
    and any direct user-specific permission grants.
    """
    if not user:
        return set()

    from app.models.user import Permission, Role
    from sqlalchemy import or_, func

    conditions = []
    if getattr(user, "role_id", None):
        conditions.append(Permission.role_id == user.role_id)
    if getattr(user, "id", None):
        conditions.append(Permission.user_id == user.id)

    # If role_id is unset but role string exists, resolve role_id
    if not getattr(user, "role_id", None) and getattr(user, "role", None):
        role_res = await db.execute(select(Role.id).where(func.lower(Role.name) == func.lower(user.role)))
        rid = role_res.scalar_one_or_none()
        if rid:
            conditions.append(Permission.role_id == rid)

    if not conditions:
        return set()

    stmt = select(Permission.resource, Permission.action).where(or_(*conditions))
    rows = (await db.execute(stmt)).fetchall()
    return {(r, a) for r, a in rows}


async def has_permission(
    db: AsyncSession,
    user,
    resource: str,
    action: str,
    allow_wildcard: bool = True,
) -> bool:
    """
    Checks if a user possesses a specific permission.
    - If allow_wildcard=True:
      - Direct match (resource, action) -> True
      - Role wildcard (*, *) or (resource, *) -> True
      - Sysadmin role -> True
    - If allow_wildcard=False (e.g. for sensitive 'Edit Posted Payments' gate):
      - ONLY direct match (resource, action) in user's permissions -> True
      - Generic sysadmin role or wildcard (*, *) does NOT bypass this check.
    """
    if not user:
        return False

    perms = await get_user_permissions(db, user)

    # 1. Direct explicit match
    if (resource, action) in perms:
        return True

    # 2. Strict non-wildcard check (e.g., payments:edit_posted)
    if not allow_wildcard:
        return False

    # 3. Wildcard permissions
    if ("*", "*") in perms or (resource, "*") in perms:
        return True

    # 4. Blanket superuser role check
    if is_sysadmin(user):
        return True

    return False


def require_permission(resource: str, action: str, allow_wildcard: bool = True):
    """
    FastAPI Dependency to enforce granular permission check on endpoints.
    """
    async def permission_checker(
        current_user=Depends(get_current_active_user),
        db: AsyncSession = Depends(get_db),
    ):
        authorized = await has_permission(
            db, current_user, resource, action, allow_wildcard=allow_wildcard
        )
        if not authorized:
            if not allow_wildcard and action == "edit_posted":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Explicit 'Edit Posted Payments' permission is required to modify a posted financial payment.",
                )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions: requires '{resource}:{action}' privilege.",
            )
        return current_user

    return permission_checker
