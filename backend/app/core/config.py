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
#  * @updated     2026-11-06
#  *
#  * @description Global application settings, environment variables, security secrets, and CORS policies.
#  */

from pydantic_settings import BaseSettings
from typing import Any, List
import json
import sys

_INSECURE_DEFAULT = "changeme-in-production-use-long-random-string"


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
    VERSION: str = "1.7.0"
    BUILD_NUMBER: str = "2026.11.06-REV-008-v1.7.0-B836163"
    RELEASE_CHANNEL: str = "Stable"
    RELEASE_STATUS: str = "Production Candidate"
    BUILD_DATE: str = "2026-11-06"
    AUTHOR: str = "Jawahar R Mallah"
    ORGANIZATION: str = "AITDL — AI Technology & Development Lab"
    DEBUG: bool = True
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
            if self.SECRET_KEY == _INSECURE_DEFAULT or len(self.SECRET_KEY) < 32:
                print(
                    "FATAL: SECRET_KEY is insecure. "
                    "Set a strong SECRET_KEY in your .env file before running in production.",
                    file=sys.stderr,
                )
                sys.exit(1)

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
settings.validate_security()
