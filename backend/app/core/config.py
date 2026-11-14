# /**
#  * @file        config.py
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
#  * @updated     2026-11-14
#  *
#  * @description Global application settings, environment variables, security secrets, and CORS policies.
#  */

from pydantic_settings import BaseSettings
from typing import Any, List
import json
import sys

_INSECURE_DEFAULT = "changeme-in-production-use-long-random-string"
_INSECURE_SECRETS = {
    _INSECURE_DEFAULT,
    "prashant_academy_super_secure_jwt_secret_key_change_in_production_2024",
    "REPLACE_WITH_RANDOM_64_CHAR_HEX_SECRET",
}

PRODUCT_APP_ICON_URL = "/artwork/14112026/batch_rect1-1-8-6_10802.png"


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/prashant_academy"
    SECRET_KEY: str = _INSECURE_DEFAULT
    ALGORITHM: str = "HS256"
    # Shortened from 24 h to 60 min for security; use refresh tokens for long sessions
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    APP_NAME: str = "Prashant Academy"
    PRODUCT_NAME: str = "PrathamOne EduOS"
    PRODUCT_DESCRIPTION: str = "PrathamOne EduOS — Education Operating System"
    EDITION: str = "Coaching Institute Edition"
    TAGLINE: str = "The Power of Enterprise Education. The Simplicity of WhatsApp."
    VERSION: str = "1.100.0"
    BUILD_NUMBER: str = "2026.11.14-REV-183-v1.100.0-FFCFFA6"
    RELEASE_CHANNEL: str = "Release Candidate"
    RELEASE_STATUS: str = "Minor Release Candidate"
    BUILD_DATE: str = "2026-11-14"
    AUTHOR: str = "Jawahar R Mallah"
    ORGANIZATION: str = "AITDL — AI Technology & Development Lab"
    DEBUG: bool = False

    # PRATHAMONE CodeX — Mandatory Default Directives (Opt-in only, System Default: DISABLED)
    CODEX_SYSTEM_DEFAULT: bool = False
    CODEX_AUTO_ACTIVATION: bool = False
    CODEX_NEW_BUSINESS_DEFAULT: bool = False
    CODEX_NEW_USER_DEFAULT: bool = False
    CODEX_AUTO_ENABLE_ON_UPDATE: bool = False
    CODEX_AUTO_ENABLE_ON_INSTALL: bool = False
    ALLOWED_ORIGINS: Any = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:80",
        "http://localhost",
    ]

    @property
    def cors_origins(self) -> List[str]:
        v = self.ALLOWED_ORIGINS
        if isinstance(v, str):
            v = v.strip()
            if v.startswith("[") and v.endswith("]"):
                try:
                    return json.loads(v)
                except Exception:
                    pass
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return [str(i) for i in v]
        # Never silently allow wildcard origins — raise instead
        raise ValueError(
            "ALLOWED_ORIGINS is misconfigured. "
            "Set it to a JSON list or comma-separated string of origins."
        )

    def validate_security(self) -> None:
        """Fail fast in production when insecure defaults are detected."""
        if not self.DEBUG:
            if self.SECRET_KEY in _INSECURE_SECRETS or len(self.SECRET_KEY) < 32:
                print(
                    "FATAL: SECRET_KEY is insecure. "
                    "Set a strong SECRET_KEY in your .env file before running in production.",
                    file=sys.stderr,
                )
                sys.exit(1)

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
settings.validate_security()
