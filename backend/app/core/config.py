# /**
#  * @file        config.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      backend.app.core
#  *
#  * @author      Jawahar R. Mallah
#  * @organization Smritisys & AITDL Networks
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 PrathamOne EduOS
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-03
#  * @updated     2026-11-23
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

PRODUCT_APP_ICON_URL = "/artwork/16112026/001/path8-5-8.png"


class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str = _INSECURE_DEFAULT
    ALGORITHM: str = "HS256"
    # Shortened from 24 h to 60 min for security; use refresh tokens for long sessions
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    APP_NAME: str = "Prashant Academy"
    PRODUCT_NAME: str = "PrathamOne EduOS"
    PRODUCT_DESCRIPTION: str = "PrathamOne EduOS — Education Operating System"
    EDITION: str = "Coaching Institute Edition"
    TAGLINE: str = "COACHING MANAGEMENT. SIMPLIFIED."
    VERSION: str = "1.169.0"
    BUILD_NUMBER: str = "2026.11.22-REV-298-v1.169.0-40197145"
    RELEASE_CHANNEL: str = "Release Candidate"
    RELEASE_STATUS: str = "Minor Release Candidate"
    BUILD_DATE: str = "2026-11-22"
    AUTHOR: str = "Jawahar R Mallah"
    ORGANIZATION: str = "Smritisys & AITDL Networks"
    LICENSE_AUTHORITY_URL: str = "https://smritisys.com"
    LICENSE_PRODUCT_CODE: str = "prathamone-eduos"
    LICENSE_PUBLIC_KEYS_JSON: str = '{"smritisys-ed25519-2026-11":"GWsJlKHUjTYmSDpi8JmsGb43NoR6S1qL1jIy1jzBC4w"}'
    LICENSE_ENFORCEMENT_STAGE: str = "shadow"
    DEBUG: bool = False

    # PRATHAMONE CodeX — Mandatory Default Directives (Opt-in only, System Default: DISABLED)
    CODEX_SYSTEM_DEFAULT: bool = False
    CODEX_AUTO_ACTIVATION: bool = False
    CODEX_NEW_BUSINESS_DEFAULT: bool = False
    CODEX_NEW_USER_DEFAULT: bool = False
    CODEX_AUTO_ENABLE_ON_UPDATE: bool = False
    CODEX_AUTO_ENABLE_ON_INSTALL: bool = False

    # PRATHAMONE Optional Device-Wise Security Binding (Opt-in only, System Default: DISABLED)
    DEVICE_BINDING_SYSTEM_DEFAULT: bool = False
    DEVICE_BINDING_SHADOW_MODE_DEFAULT: bool = True
    DEVICE_BINDING_MAX_DEVICES_DEFAULT: int = 3
    ALLOWED_ORIGINS: Any = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:2026",
        "https://localhost:2026",
        "http://localhost:80",
        "https://localhost:443",
        "http://localhost",
        "https://localhost",
        "http://127.0.0.1:2026",
        "https://127.0.0.1:2026",
        "http://127.0.0.1",
        "https://127.0.0.1",
        "http://prathamone:2026",
        "https://prathamone:2026",
        "http://prathamone",
        "https://prathamone",
        "http://prathamone.local:2026",
        "https://prathamone.local:2026",
        "http://prathamone.local",
        "https://prathamone.local",
        "http://classesname:2026",
        "https://classesname:2026",
        "http://classesname",
        "https://classesname",
        "http://classesname.local:2026",
        "https://classesname.local:2026",
        "http://classesname.local",
        "https://classesname.local",
        "http://aditiacademy:2026",
        "https://aditiacademy:2026",
        "http://aditiacademy",
        "https://aditiacademy",
        "http://aditiacademy.local:2026",
        "https://aditiacademy.local:2026",
        "http://aditiacademy.local",
        "https://aditiacademy.local",
        "http://prashantacademy:2026",
        "https://prashantacademy:2026",
        "http://prashantacademy",
        "https://prashantacademy",
        "http://prashantacademy.local:2026",
        "https://prashantacademy.local:2026",
        "http://prashantacademy.local",
        "https://prashantacademy.local",
    ]

    @property
    def cors_origins(self) -> List[str]:
        v = self.ALLOWED_ORIGINS
        origins: List[str] = []
        if isinstance(v, str):
            v = v.strip()
            if v.startswith("[") and v.endswith("]"):
                try:
                    origins = json.loads(v)
                except Exception:
                    pass
            else:
                origins = [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            origins = [str(i) for i in v]
        else:
            raise ValueError(
                "ALLOWED_ORIGINS is misconfigured. "
                "Set it to a JSON list or comma-separated string of origins."
            )

        canonical = [
            "http://localhost:2026",
            "https://localhost:2026",
            "http://localhost:80",
            "https://localhost:443",
            "http://localhost",
            "https://localhost",
            "http://127.0.0.1:2026",
            "https://127.0.0.1:2026",
            "http://127.0.0.1",
            "https://127.0.0.1",
            "http://prathamone:2026",
            "https://prathamone:2026",
            "http://prathamone",
            "https://prathamone",
            "http://prathamone.local:2026",
            "https://prathamone.local:2026",
            "http://prathamone.local",
            "https://prathamone.local",
            "http://classesname:2026",
            "https://classesname:2026",
            "http://classesname",
            "https://classesname",
            "http://classesname.local:2026",
            "https://classesname.local:2026",
            "http://classesname.local",
            "https://classesname.local",
            "http://aditiacademy:2026",
            "https://aditiacademy:2026",
            "http://aditiacademy",
            "https://aditiacademy",
            "http://aditiacademy.local:2026",
            "https://aditiacademy.local:2026",
            "http://aditiacademy.local",
            "https://aditiacademy.local",
            "http://prashantacademy:2026",
            "https://prashantacademy:2026",
            "http://prashantacademy",
            "https://prashantacademy",
            "http://prashantacademy.local:2026",
            "https://prashantacademy.local:2026",
            "http://prashantacademy.local",
            "https://prashantacademy.local",
        ]
        merged = list(origins)
        for c in canonical:
            if c not in merged:
                merged.append(c)
        return merged

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

    model_config = {"env_file": (".env", "../.env"), "extra": "ignore"}


settings = Settings()
settings.validate_security()
