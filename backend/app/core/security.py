# /**
#  * @file        security.py
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
#  * @description Cryptographic hashing, password salt verification, and JWT access token encoders.
#  */

from datetime import datetime, timedelta, timezone
from typing import Optional
import hashlib
import secrets
import jwt
from jwt.exceptions import InvalidTokenError as JWTError
import bcrypt
from app.core.config import settings

_LONG_PW_PREFIX = "sha256$"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        pw_bytes = plain_password.encode("utf-8")
        if hashed_password.startswith(_LONG_PW_PREFIX):
            digest = hashlib.sha256(pw_bytes).hexdigest().encode("ascii")
            return bcrypt.checkpw(
                digest,
                hashed_password[len(_LONG_PW_PREFIX):].encode("utf-8"),
            )
        return bcrypt.checkpw(
            pw_bytes,
            hashed_password.encode("utf-8"),
        )
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    pw_bytes = password.encode("utf-8")
    salt = bcrypt.gensalt()
    if len(pw_bytes) > 72:
        # Avoid bcrypt's silent 72-byte truncation by pre-hashing long passwords with SHA-256.
        digest = hashlib.sha256(pw_bytes).hexdigest().encode("ascii")
        return _LONG_PW_PREFIX + bcrypt.hashpw(digest, salt).decode("utf-8")
    return bcrypt.hashpw(pw_bytes, salt).decode("utf-8")


def create_access_token(
    data: dict, expires_delta: Optional[timedelta] = None
) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta
        or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire, "type": "access", "jti": secrets.token_urlsafe(16)})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(
        days=settings.REFRESH_TOKEN_EXPIRE_DAYS
    )
    to_encode.update({"exp": expire, "type": "refresh", "jti": secrets.token_urlsafe(16)})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> dict:
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
