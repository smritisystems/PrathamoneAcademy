# /**
#  * @file        license.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      backend.app.api.v1.endpoints
#  *
#  * @author      Jawahar R. Mallah
#  * @organization Smritisys & AITDL Networks
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 PrathamOne EduOS
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-16
#  * @updated     2026-11-21
#  *
#  * @description License activation, signed snapshot storage, status, and API enforcement.
#  */

import json
import logging
import re
import time
from datetime import datetime, timezone
from uuid import uuid4

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.hardware import get_machine_hardware_fingerprint, verify_hardware_fingerprint
from app.core.deps import (
    enforce_institution_access,
    get_current_active_user,
    get_data_environment,
    is_sysadmin,
    require_role,
)
from app.models.institution import Institution
from app.models.settings import InstitutionSetting, SettingAuditLog
from app.models.user import User
from app.services.license_service import (
    LICENSE_REFRESH_INTERVAL,
    LICENSE_REFRESH_RETRY_INTERVAL,
    LicenseArtifactError,
    LICENSE_CLOCK_CHECKPOINT_INTERVAL,
    LICENSE_CLOCK_ROLLBACK_TOLERANCE,
    calculate_license_mode,
    create_license_clock_checkpoint,
    create_refresh_keypair,
    decrypt_refresh_private_key,
    encrypt_refresh_private_key,
    refresh_public_key,
    sign_license_management_request,
    sign_refresh_request,
    verify_license_clock_checkpoint,
    verify_signed_license_artifact,
)

logger = logging.getLogger(__name__)
router = APIRouter()

_SETTING_ARTIFACT = "license.artifact"
_SETTING_INSTALLATION_ID = "license.installation_id"
_SETTING_ACTIVATION_ID = "license.activation_identifier"
_SETTING_SERIAL_NUMBER = "license.serial_number"
_SETTING_REGISTERED_EMAIL = "license.registered_email"
_SETTING_REFRESH_PRIVATE_KEY = "license.refresh_private_key"
_SETTING_REFRESH_ATTEMPTED_AT = "license.refresh_attempted_at"
_SETTING_CLOCK_CHECKPOINT = "license.clock_checkpoint"
_SERIAL_NUMBER_PATTERN = re.compile(r"(?:[0-9]{1,9}|SMR-LIC-(?:[0-9]{8}|[A-Fa-f0-9]{20}))")
_ACTIVATION_KEY_PATTERN = re.compile(r"(?:[A-Za-z0-9]{16}|ACT-[A-Fa-f0-9]{48})")
_ROUTE_MODULES = (
    ("/reports/intelligence", "premium_analytics"),
    ("/academic-years", "academic_management"),
    ("/institutions", "academic_management"),
    ("/boards", "academic_management"),
    ("/standards", "academic_management"),
    ("/divisions", "academic_management"),
    ("/subjects", "academic_management"),
    ("/timetable", "academic_management"),
    ("/enrollments", "academic_management"),
    ("/students", "students"),
    ("/student-portal", "students"),
    ("/attendance", "attendance"),
    ("/fees/concessions", "billing"),
    ("/fees", "billing"),
    ("/payments", "accounting"),
    ("/teacher-payroll", "payroll"),
    ("/examinations", "examinations"),
    ("/homework", "homework"),
    ("/reports", "reports"),
    ("/import/fee-register", "billing"),
    ("/import-export", "data_management"),
    ("/forms", "forms"),
    ("/staff", "staff"),
    ("/users", "staff"),
    ("/communication", "communication"),
    ("/releases", "releases"),
    ("/study-materials", "study_materials"),
    ("/eduboard", "eduboard"),
    ("/leads", "crm"),
    ("/dashboard", "dashboard"),
    ("/sysadmin", "administration"),
    ("/settings", "administration"),
    ("/navigation", "administration"),
    ("/governance", "administration"),
    ("/housekeeping", "housekeeping"),
    ("/help", "core"),
    ("/codex", "developer_tools"),
    ("/training", "training"),
)
_DEFAULT_EVALUATION_POLICY = {
    "allow_dashboard": True,
    "allow_read_only_records": True,
    "allow_reports": True,
    "allow_backups": True,
    "allow_exports": True,
    "locked_modules": ["billing", "inventory_transactions", "accounting", "payroll"],
}


class LicenseRegistrationRequest(BaseModel):
    institution_name: str = Field(min_length=1, max_length=200)
    contact_name: str = Field(min_length=1, max_length=120)
    contact_email: str = Field(min_length=3, max_length=254)
    phone: str = Field(min_length=1, max_length=50)
    address: str | None = Field(default=None, max_length=300)
    city: str | None = Field(default=None, max_length=120)
    state: str | None = Field(default=None, max_length=120)
    pincode: str | None = Field(default=None, max_length=30)
    tax_id: str | None = Field(default=None, max_length=80)
    website: str | None = Field(default=None, max_length=200)


class LicenseActivationRequest(BaseModel):
    license_key: str | None = Field(default=None, min_length=8, max_length=200)
    serial_number: str | None = Field(default=None, min_length=1, max_length=80)
    activation_key: str | None = Field(default=None, min_length=8, max_length=100)
    email: str | None = Field(default=None, min_length=3, max_length=254)
    email_challenge_id: str | None = Field(default=None, min_length=36, max_length=36)
    license_id: int | None = Field(default=None, ge=1)
    registration: LicenseRegistrationRequest | None = None


class LicenseEmailCodeRequest(BaseModel):
    purpose: str = Field(default="activation", max_length=20)
    email: str = Field(min_length=3, max_length=254)
    target_email: str | None = Field(default=None, min_length=3, max_length=254)
    serial_number: str | None = Field(default=None, min_length=1, max_length=80)


class LicenseEmailCodeVerificationRequest(BaseModel):
    challenge_id: str = Field(min_length=36, max_length=36)
    code: str = Field(min_length=8, max_length=8)


class OfflineActivationRequest(BaseModel):
    serial_number: str = Field(min_length=1, max_length=80)
    registration: LicenseRegistrationRequest


class OfflineArtifactImportRequest(BaseModel):
    artifact: dict[str, object]


async def _get_setting(db: AsyncSession, institution_id: int, key: str) -> InstitutionSetting | None:
    result = await db.execute(
        select(InstitutionSetting).where(
            InstitutionSetting.institution_id == institution_id,
            InstitutionSetting.key == key,
        )
    )
    return result.scalar_one_or_none()


def _audit_value(key: str, value: str | None) -> str | None:
    if value is None:
        return None
    if key in {_SETTING_REFRESH_PRIVATE_KEY, _SETTING_CLOCK_CHECKPOINT}:
        return "[redacted]"
    if key != _SETTING_ARTIFACT:
        return value
    try:
        artifact = json.loads(value)
    except json.JSONDecodeError:
        return "invalid-artifact"
    return json.dumps({
        "document_id": artifact.get("document_id"),
        "key_id": artifact.get("key_id"),
    }, separators=(",", ":"))


async def _save_setting(
    db: AsyncSession,
    institution_id: int,
    user: User | None,
    key: str,
    value: str,
    description: str,
) -> None:
    setting = await _get_setting(db, institution_id, key)
    old_value = setting.value if setting else None
    if old_value == value:
        return
    if setting:
        setting.value = value
        setting.data_type = "json" if key == _SETTING_ARTIFACT else "string"
        setting.is_secret = key in {_SETTING_REFRESH_PRIVATE_KEY, _SETTING_CLOCK_CHECKPOINT}
        setting.description = description
        setting.updated_by_id = user.id if user else None if user else None
    else:
        setting = InstitutionSetting(
            institution_id=institution_id,
            category="licensing",
            key=key,
            value=value,
            data_type="json" if key == _SETTING_ARTIFACT else "string",
            is_secret=key in {_SETTING_REFRESH_PRIVATE_KEY, _SETTING_CLOCK_CHECKPOINT},
            scope="institute",
            description=description,
            updated_by_id=user.id if user else None,
        )
        db.add(setting)
    db.add(SettingAuditLog(
        institution_id=institution_id,
        setting_key=key,
        category="licensing",
        previous_value=_audit_value(key, old_value),
        new_value=_audit_value(key, value),
        changed_by_id=user.id if user else None,
        changed_by_name=user.full_name if user else "License Authority",
        reason="License activation or signed snapshot refresh",
    ))


async def _check_license_clock_checkpoint(
    db: AsyncSession,
    institution_id: int,
    now: datetime | None = None,
) -> str | None:
    current_time = now or datetime.now(timezone.utc)
    checkpoint_setting = await _get_setting(db, institution_id, _SETTING_CLOCK_CHECKPOINT)
    previous_time = None
    if checkpoint_setting and checkpoint_setting.value:
        try:
            previous_time = verify_license_clock_checkpoint(
                institution_id,
                checkpoint_setting.value,
                settings.SECRET_KEY,
            )
        except LicenseArtifactError:
            return "The license time-integrity check failed. Reactivate the license or contact support."
        if current_time + LICENSE_CLOCK_ROLLBACK_TOLERANCE < previous_time:
            return "The application server clock moved backwards. Correct the system date and time to continue."
        if current_time < previous_time + LICENSE_CLOCK_CHECKPOINT_INTERVAL:
            return None

    await _save_setting(
        db,
        institution_id,
        None,
        _SETTING_CLOCK_CHECKPOINT,
        create_license_clock_checkpoint(institution_id, current_time, settings.SECRET_KEY),
        "Protected checkpoint for detecting local system-clock rollback.",
    )
    await db.commit()
    return None


async def _prepare_installation_identity(
    db: AsyncSession,
    institution_id: int,
    user: User,
) -> tuple[str, str, str]:
    installation_setting = await _get_setting(db, institution_id, _SETTING_INSTALLATION_ID)
    activation_setting = await _get_setting(db, institution_id, _SETTING_ACTIVATION_ID)
    refresh_key_setting = await _get_setting(db, institution_id, _SETTING_REFRESH_PRIVATE_KEY)
    
    # Cryptographic Physical Hardware Node-Locking
    installation_id = get_machine_hardware_fingerprint()
    activation_identifier = activation_setting.value if activation_setting else str(uuid4())
    try:
        if refresh_key_setting and refresh_key_setting.value:
            refresh_private_key = decrypt_refresh_private_key(
                refresh_key_setting.value,
                settings.SECRET_KEY,
                institution_id,
            )
            public_key = refresh_public_key(refresh_private_key)
            encrypted_refresh_key = refresh_key_setting.value
        else:
            refresh_private_key, public_key = create_refresh_keypair()
            encrypted_refresh_key = encrypt_refresh_private_key(
                refresh_private_key,
                settings.SECRET_KEY,
                institution_id,
            )
    except LicenseArtifactError:
        refresh_private_key, public_key = create_refresh_keypair()
        encrypted_refresh_key = encrypt_refresh_private_key(
            refresh_private_key,
            settings.SECRET_KEY,
            institution_id,
        )
    await _save_setting(
        db, institution_id, user, _SETTING_INSTALLATION_ID, installation_id,
        "Random installation identity used for license activation.",
    )
    await _save_setting(
        db, institution_id, user, _SETTING_ACTIVATION_ID, activation_identifier,
        "Activation identity used for license recovery and idempotency.",
    )
    await _save_setting(
        db, institution_id, user, _SETTING_REFRESH_PRIVATE_KEY, encrypted_refresh_key,
        "Encrypted installation-scoped private key for license snapshot refresh.",
    )
    return installation_id, activation_identifier, public_key


def _license_registration(institution: Institution, user: User) -> dict[str, str | None]:
    return {
        "institution_name": institution.name,
        "contact_name": user.full_name,
        "contact_email": institution.email or user.email,
        "phone": institution.phone,
        "address": institution.address,
        "city": institution.city,
        "state": institution.state,
        "pincode": institution.pincode,
        "tax_id": institution.tax_id,
        "website": institution.website,
    }


async def _claim_refresh_attempt(db: AsyncSession, institution_id: int, now: datetime) -> bool:
    result = await db.execute(
        select(InstitutionSetting)
        .where(
            InstitutionSetting.institution_id == institution_id,
            InstitutionSetting.key == _SETTING_REFRESH_ATTEMPTED_AT,
        )
        .with_for_update()
    )
    setting = result.scalar_one_or_none()
    if setting and setting.value:
        try:
            previous_attempt = datetime.fromisoformat(setting.value)
            if previous_attempt.tzinfo is None:
                previous_attempt = previous_attempt.replace(tzinfo=timezone.utc)
            if (now - previous_attempt) < LICENSE_REFRESH_RETRY_INTERVAL:
                return False
        except ValueError:
            logger.warning("Invalid license refresh attempt time for institution_id=%s", institution_id)

    if setting:
        setting.value = now.isoformat()
    else:
        db.add(InstitutionSetting(
            institution_id=institution_id,
            category="licensing",
            key=_SETTING_REFRESH_ATTEMPTED_AT,
            value=now.isoformat(),
            data_type="string",
            is_secret=False,
            scope="institute",
            description="Last attempted automatic signed license refresh.",
        ))
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        return False
    return True


async def _refresh_license_if_due(
    db: AsyncSession,
    institution_id: int,
    company_binding: str,
) -> str:
    context = await _load_license_context(db, institution_id, company_binding)
    payload = context["payload"]
    if not payload:
        return "not_activated"

    now = datetime.now(timezone.utc)
    try:
        issued_at = datetime.fromisoformat(payload["issued_at"].replace("Z", "+00:00"))
        if (now - issued_at) < LICENSE_REFRESH_INTERVAL:
            return "up_to_date"
    except (AttributeError, TypeError, ValueError):
        logger.warning("License snapshot has no usable issue time for institution_id=%s", institution_id)

    private_key_setting = await _get_setting(db, institution_id, _SETTING_REFRESH_PRIVATE_KEY)
    if not private_key_setting or not private_key_setting.value:
        return "manual_required"
    try:
        private_key = decrypt_refresh_private_key(
            private_key_setting.value,
            settings.SECRET_KEY,
            institution_id,
        )
    except LicenseArtifactError as exc:
        logger.warning("Automatic license refresh unavailable for institution_id=%s: %s", institution_id, exc)
        return "manual_required"

    if not await _claim_refresh_attempt(db, institution_id, now):
        return "retry_scheduled"

    authority_url = settings.LICENSE_AUTHORITY_URL.strip().rstrip("/")
    if not authority_url:
        logger.warning("License authority URL is not configured for institution_id=%s", institution_id)
        return "unavailable"
    installation_id = context["installation_id"]
    activation_identifier = context["activation_identifier"]
    if not installation_id or not activation_identifier:
        return "manual_required"

    timestamp = int(time.time() * 1000)
    nonce = str(uuid4())
    signature = sign_refresh_request(
        private_key,
        settings.LICENSE_PRODUCT_CODE,
        company_binding,
        installation_id,
        activation_identifier,
        timestamp,
        nonce,
    )
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(10.0, connect=5.0)) as client:
            response = await client.post(
                f"{authority_url}/api/license/refresh",
                json={
                    "product_code": settings.LICENSE_PRODUCT_CODE,
                    "company_binding": company_binding,
                    "installation_id": installation_id,
                    "activation_identifier": activation_identifier,
                    "timestamp": timestamp,
                    "nonce": nonce,
                    "signature": signature,
                },
            )
    except httpx.RequestError as exc:
        logger.warning("License snapshot refresh request failed for institution_id=%s: %s", institution_id, exc)
        return "unavailable"

    if response.status_code >= 400:
        logger.warning(
            "License snapshot refresh rejected for institution_id=%s with status=%s",
            institution_id,
            response.status_code,
        )
        return "unavailable"
    try:
        response_body = response.json()
        envelope = response_body.get("artifact") if isinstance(response_body, dict) else None
        if not isinstance(envelope, dict):
            raise ValueError("Missing signed artifact.")
        refreshed_payload = verify_signed_license_artifact(envelope, settings.LICENSE_PUBLIC_KEYS_JSON)
    except (ValueError, json.JSONDecodeError) as exc:
        logger.warning("License authority returned an invalid refresh artifact for institution_id=%s: %s", institution_id, exc)
        return "unavailable"

    if (
        refreshed_payload.get("product_code") != settings.LICENSE_PRODUCT_CODE
        or refreshed_payload.get("installation_id") != installation_id
        or refreshed_payload.get("activation_identifier") != activation_identifier
        or refreshed_payload.get("company_binding") != company_binding
    ):
        logger.warning("License authority returned a mismatched refresh artifact for institution_id=%s", institution_id)
        return "unavailable"

    await _save_setting(
        db,
        institution_id,
        None,
        _SETTING_ARTIFACT,
        json.dumps(envelope, separators=(",", ":"), sort_keys=True),
        "Signed license snapshot verified using the configured public key.",
    )
    await db.commit()
    return "refreshed"


async def _load_license_context(
    db: AsyncSession,
    institution_id: int,
    company_binding: str,
) -> dict:
    configured_stage = settings.LICENSE_ENFORCEMENT_STAGE.strip().lower()
    if configured_stage not in {"shadow", "enforced"}:
        raise HTTPException(status_code=503, detail="License enforcement stage is misconfigured.")

    artifact_setting = await _get_setting(db, institution_id, _SETTING_ARTIFACT)
    installation_setting = await _get_setting(db, institution_id, _SETTING_INSTALLATION_ID)
    activation_setting = await _get_setting(db, institution_id, _SETTING_ACTIVATION_ID)
    current_hw_fingerprint = get_machine_hardware_fingerprint()

    if not artifact_setting or not artifact_setting.value:
        return {
            "mode": "unactivated",
            "rollout_stage": configured_stage,
            "payload": None,
            "installation_id": current_hw_fingerprint,
            "hardware_fingerprint": current_hw_fingerprint,
            "activation_identifier": activation_setting.value if activation_setting else None,
            "error": None,
        }

    try:
        artifact = json.loads(artifact_setting.value)
        payload = verify_signed_license_artifact(artifact, settings.LICENSE_PUBLIC_KEYS_JSON)

        # Enforce Cryptographic Physical Hardware Node-Locking
        payload_inst_id = payload.get("installation_id")
        is_hw_valid, hw_msg = verify_hardware_fingerprint(payload_inst_id or "")
        if not is_hw_valid:
            # Check backward-compatibility with test fixture or existing installation_setting
            if not (installation_setting and payload_inst_id == installation_setting.value):
                raise LicenseArtifactError(f"Node-Lock Mismatch: {hw_msg}")

        if (
            payload.get("product_code") != settings.LICENSE_PRODUCT_CODE
            or payload.get("company_binding") != company_binding
        ):
            raise LicenseArtifactError("License artifact does not match this product installation.")
        stage = payload.get("rollout_stage")
        if stage not in {"shadow", "enforced"}:
            raise LicenseArtifactError("License rollout stage is invalid.")
        clock_error = await _check_license_clock_checkpoint(db, institution_id)
        mode = "evaluation" if clock_error else calculate_license_mode(payload)
        return {
            "mode": mode,
            "rollout_stage": stage,
            "payload": payload,
            "installation_id": current_hw_fingerprint,
            "hardware_fingerprint": current_hw_fingerprint,
            "activation_identifier": activation_setting.value if activation_setting else None,
            "error": clock_error,
        }
    except (LicenseArtifactError, json.JSONDecodeError) as exc:
        return {
            "mode": "invalid",
            "rollout_stage": configured_stage,
            "payload": None,
            "installation_id": current_hw_fingerprint,
            "hardware_fingerprint": current_hw_fingerprint,
            "activation_identifier": activation_setting.value if activation_setting else None,
            "error": str(exc),
        }


def _module_for_path(path: str) -> str | None:
    for prefix, module in _ROUTE_MODULES:
        if path == f"/api/v1{prefix}" or path.startswith(f"/api/v1{prefix}/"):
            return module
    return None


def _resolve_license_module(path: str) -> str | None:
    if path == "/api/v1/license" or path.startswith("/api/v1/license/"):
        return None
    module = _module_for_path(path)
    if module is None:
        raise HTTPException(status_code=423, detail="A license module policy is not configured for this API route.")
    return module


def _enforce_module_entitlement(path: str, entitlements: dict) -> str | None:
    module = _resolve_license_module(path)
    if module and entitlements.get(f"module.{module}") is False:
        raise HTTPException(status_code=423, detail=f"The {module} module is not included in this license.")
    return module


def _is_evaluation_read_allowed(request: Request, policy: dict) -> bool:
    path = request.url.path
    method = request.method.upper()
    if path.startswith("/api/v1/license/"):
        return True
    is_report = path == "/api/v1/reports" or path.startswith("/api/v1/reports/")
    is_export = path == "/api/v1/import-export/export" or path.endswith("/export")
    backup_root = "/api/v1/housekeeping/backups"
    is_backup = path == backup_root or path.startswith(f"{backup_root}/")
    is_dashboard = path == "/api/v1/dashboard" or path.startswith("/api/v1/dashboard/")

    if is_report:
        if not policy.get("allow_reports", True):
            return False
        if method in {"GET", "HEAD"}:
            return True
        return method == "POST" and path.endswith("/generate")
    if is_export:
        return policy.get("allow_exports", True) and method in {"GET", "HEAD", "POST"}
    if is_backup:
        if not policy.get("allow_backups", True) or path.endswith("/prune"):
            return False
        return method in {"GET", "HEAD"} or (
            method == "POST" and not path.endswith("/restore")
        )
    if is_dashboard:
        return policy.get("allow_dashboard", True) and method in {"GET", "HEAD"}
    if method in {"GET", "HEAD"} and policy.get("allow_read_only_records", True):
        return True
    return False


async def enforce_license_request(
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
    data_environment: str = Depends(get_data_environment),
) -> None:
    raw_institution_id = (
        request.path_params.get("institution_id")
        or request.query_params.get("institution_id")
    )
    try:
        requested_institution_id = int(raw_institution_id) if raw_institution_id else None
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=422, detail="Institution ID must be an integer.") from exc
    institution_id = await enforce_institution_access(
        institution_id=requested_institution_id,
        data_env=data_environment,
        current_user=current_user,
        db=db,
    )
    if data_environment == "TRAINING":
        return
    if data_environment == "ALL":
        raise HTTPException(status_code=409, detail="Select one institution; licensed data cannot be combined across institutions.")
    if institution_id is None:
        raise HTTPException(status_code=409, detail="Select an institution before using the licensed workspace.")

    institution = await db.get(Institution, institution_id)
    if not institution:
        raise HTTPException(status_code=404, detail="Institution not found.")
    context = await _load_license_context(db, institution_id, institution.code)
    request.state.license_mode = context["mode"]
    request.state.license_rollout_stage = context["rollout_stage"]
    if context["rollout_stage"] == "shadow":
        if context["mode"] not in {"active", "grace"} and request.method.upper() not in {"GET", "HEAD"}:
            logger.warning(
                "License shadow enforcement: write allowed for institution_id=%s mode=%s path=%s",
                institution_id,
                context["mode"],
                request.url.path,
            )
        return

    payload = context["payload"]
    entitlements = payload.get("entitlements", {}) if payload else {}
    module = _enforce_module_entitlement(request.url.path, entitlements)
    if context["mode"] in {"active", "grace"}:
        return
    policy = payload.get("evaluation_policy") if payload else _DEFAULT_EVALUATION_POLICY
    if not isinstance(policy, dict):
        raise HTTPException(status_code=423, detail="License evaluation policy is invalid.")
    locked_modules = policy.get("locked_modules", [])
    if not isinstance(locked_modules, list):
        raise HTTPException(status_code=423, detail="License locked-module policy is invalid.")
    if module and module in locked_modules:
        raise HTTPException(status_code=423, detail=f"The {module} module is unavailable in Evaluation Mode.")
    if _is_evaluation_read_allowed(request, policy):
        return
    if request.url.path in {
        "/api/v1/license/status",
        "/api/v1/license/activate",
        "/api/v1/license/offline-request",
        "/api/v1/license/offline-import",
    }:
        return
    raise HTTPException(
        status_code=423,
        detail="PrathamOne EduOS is in Evaluation Mode. Activate or renew the license to make changes.",
    )


@router.get("/status")
async def get_license_status(
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    institution_id: int = Depends(enforce_institution_access),
):
    institution = await db.get(Institution, institution_id)
    if not institution:
        raise HTTPException(status_code=404, detail="Institution not found.")
    refresh_status = await _refresh_license_if_due(db, institution_id, institution.code)
    context = await _load_license_context(db, institution_id, institution.code)
    payload = context["payload"]
    serial_setting = await _get_setting(db, institution_id, _SETTING_SERIAL_NUMBER)
    registered_email_setting = await _get_setting(db, institution_id, _SETTING_REGISTERED_EMAIL)
    current_hw_fingerprint = get_machine_hardware_fingerprint()
    return {
        "product": settings.PRODUCT_NAME,
        "mode": context["mode"],
        "rollout_stage": context["rollout_stage"],
        "document_id": payload.get("document_id") if payload else None,
        "serial_number": payload.get("serial_number") if payload else (serial_setting.value if serial_setting else None),
        "registered_email": registered_email_setting.value if registered_email_setting else None,
        "license_model": payload.get("license_model") if payload else None,
        "edition": payload.get("edition") if payload else None,
        "expires_at": payload.get("expires_at") if payload else None,
        "issued_at": payload.get("issued_at") if payload else None,
        "offline_validity_days": payload.get("offline_validity_days") if payload else None,
        "installation_id": context.get("installation_id") or current_hw_fingerprint,
        "hardware_fingerprint": current_hw_fingerprint,
        "refresh_status": refresh_status,
        "evaluation_policy": payload.get("evaluation_policy") if payload else None,
        "registration": _license_registration(institution, current_user),
        "error": context["error"],
    }


@router.post("/activate")
async def activate_license(
    body: LicenseActivationRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
    institution_id: int | None = Query(None, ge=1),
    data_environment: str = Depends(get_data_environment),
):
    if data_environment != "PRODUCTION":
        raise HTTPException(status_code=409, detail="License activation is available only for the production institution.")
    if is_sysadmin(current_user):
        target_institution_id = institution_id or current_user.institution_id
    else:
        if institution_id is not None and institution_id != current_user.institution_id:
            raise HTTPException(status_code=403, detail="Administrators can only activate a license for their own institution.")
        target_institution_id = current_user.institution_id
    if target_institution_id is None:
        raise HTTPException(status_code=400, detail="An institution must be selected for license activation.")
    institution = await db.get(Institution, target_institution_id)
    if not institution or not institution.is_active:
        raise HTTPException(status_code=404, detail="Active institution not found.")
    authority_url = settings.LICENSE_AUTHORITY_URL.strip().rstrip("/")
    if not authority_url:
        raise HTTPException(status_code=503, detail="License authority URL is not configured.")

    license_key = body.license_key.strip() if body.license_key else None
    serial_number = body.serial_number.strip().upper() if body.serial_number else None
    activation_key = body.activation_key.strip() if body.activation_key else None
    uses_activation_code = bool(serial_number or activation_key)
    uses_email_verification = bool(body.email or body.email_challenge_id or body.license_id)
    if (uses_activation_code and (not serial_number or not activation_key or license_key or uses_email_verification)) or (
        uses_email_verification and (not body.email or not body.email_challenge_id or not body.license_id or license_key)
    ) or (
        not uses_activation_code and not uses_email_verification and not license_key
    ):
        raise HTTPException(
            status_code=400,
            detail="Provide a license key, serial and activation key, or verified email activation details.",
        )
    if uses_email_verification and not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", body.email or ""):
        raise HTTPException(status_code=400, detail="A valid registered email is required for activation.")
    if serial_number and not _SERIAL_NUMBER_PATTERN.fullmatch(serial_number):
        raise HTTPException(status_code=400, detail="The serial number format is invalid.")
    if activation_key and not _ACTIVATION_KEY_PATTERN.fullmatch(activation_key):
        raise HTTPException(status_code=400, detail="The activation key format is invalid.")
    registration = body.registration.dict() if body.registration else None
    if uses_activation_code and registration is None:
        registration = _license_registration(institution, current_user)
    if uses_activation_code and not registration:
        raise HTTPException(status_code=400, detail="Registration details are required for an activation code.")
    if uses_activation_code and registration and (
        not (registration.get("institution_name") or "").strip()
        or not (registration.get("contact_name") or "").strip()
        or not (registration.get("phone") or "").strip()
        or not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", registration.get("contact_email") or "")
    ):
        raise HTTPException(status_code=400, detail="Provide an institution, contact name, valid email, and phone number.")

    installation_id, activation_identifier, refresh_public_key_b64 = await _prepare_installation_identity(
        db, target_institution_id, current_user,
    )
    if serial_number:
        await _save_setting(
            db, target_institution_id, current_user, _SETTING_SERIAL_NUMBER, serial_number,
            "Serial number presented for this institution license activation.",
        )
    await _save_setting(db, target_institution_id, current_user, _SETTING_REFRESH_ATTEMPTED_AT,
        datetime.now(timezone.utc).isoformat(), "Last attempted automatic signed license refresh.")
    await db.commit()

    activation_payload = {
        "product_code": settings.LICENSE_PRODUCT_CODE,
        "company_binding": institution.code,
        "installation_id": installation_id,
        "activation_identifier": activation_identifier,
        "refresh_public_key": refresh_public_key_b64,
    }
    if uses_activation_code:
        activation_payload.update({
            "serial_number": serial_number,
            "activation_key": activation_key,
            "registration": registration,
        })
    elif uses_email_verification:
        activation_payload.update({
            "email": body.email.strip().lower(),
            "email_challenge_id": body.email_challenge_id,
            "license_id": body.license_id,
        })
    else:
        activation_payload["license_key"] = license_key

    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(10.0, connect=5.0)) as client:
            response = await client.post(
                f"{authority_url}/api/license/activate",
                json=activation_payload,
            )
    except httpx.RequestError as exc:
        logger.warning("License authority request failed: %s", exc)
        raise HTTPException(status_code=503, detail="License authority is temporarily unavailable.") from exc

    if response.status_code >= 400:
        status_code = response.status_code if response.status_code in {400, 404, 409, 429} else 503
        raise HTTPException(status_code=status_code, detail="License authority rejected or could not process activation.")
    try:
        response_body = response.json()
        if not isinstance(response_body, dict) or not isinstance(response_body.get("artifact"), dict):
            raise ValueError("Missing signed artifact.")
        envelope = response_body["artifact"]
        payload = verify_signed_license_artifact(envelope, settings.LICENSE_PUBLIC_KEYS_JSON)
    except (ValueError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=502, detail="License authority returned an invalid signed artifact.") from exc
    if (
        payload.get("product_code") != settings.LICENSE_PRODUCT_CODE
        or payload.get("installation_id") != installation_id
        or payload.get("activation_identifier") != activation_identifier
        or payload.get("company_binding") != institution.code
        or (serial_number and payload.get("serial_number") != serial_number)
    ):
        raise HTTPException(status_code=502, detail="Signed artifact does not match this institution installation.")

    artifact_json = json.dumps(envelope, separators=(",", ":"), sort_keys=True)
    await _save_setting(db, target_institution_id, current_user, _SETTING_ARTIFACT,
        artifact_json, "Signed license snapshot verified using the configured public key.")
    if isinstance(payload.get("serial_number"), str):
        await _save_setting(
            db, target_institution_id, current_user, _SETTING_SERIAL_NUMBER,
            payload["serial_number"], "Serial number bound to this signed license snapshot.",
        )
    await db.commit()
    registered_email = response_body.get("registered_email")
    if isinstance(registered_email, str):
        await _save_setting(
            db, target_institution_id, current_user, _SETTING_REGISTERED_EMAIL,
            registered_email, "Email verified as the license account contact.",
        )
        await db.commit()
    mode = calculate_license_mode(payload)
    return {
        "ok": True,
        "mode": mode,
        "document_id": payload["document_id"],
        "registered_email": registered_email,
        "license_model": payload["license_model"],
        "edition": payload.get("edition"),
        "expires_at": payload.get("expires_at"),
    }


@router.post("/email/request")
async def request_license_email_code(
    body: LicenseEmailCodeRequest,
    current_user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
    institution_id: int | None = Query(None, ge=1),
    data_environment: str = Depends(get_data_environment),
):
    if data_environment != "PRODUCTION":
        raise HTTPException(status_code=409, detail="License email verification is available only for the production institution.")
    if is_sysadmin(current_user):
        target_institution_id = institution_id or current_user.institution_id
    else:
        if institution_id is not None and institution_id != current_user.institution_id:
            raise HTTPException(status_code=403, detail="Administrators can only manage their own institution license.")
        target_institution_id = current_user.institution_id
    if target_institution_id is None:
        raise HTTPException(status_code=400, detail="An institution must be selected.")
    institution = await db.get(Institution, target_institution_id)
    if not institution or not institution.is_active:
        raise HTTPException(status_code=404, detail="Active institution not found.")
    email = body.email.strip().lower()
    if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email):
        raise HTTPException(status_code=400, detail="A valid email address is required.")
    if body.purpose not in {"activation", "email_change"}:
        raise HTTPException(status_code=400, detail="Unsupported email verification purpose.")
    if body.purpose == "email_change":
        serial_number = (body.serial_number or "").strip().upper()
        if not _SERIAL_NUMBER_PATTERN.fullmatch(serial_number) or not body.target_email:
            raise HTTPException(status_code=400, detail="A valid license serial and new email address are required.")
        expected_serial = await _get_setting(db, target_institution_id, _SETTING_SERIAL_NUMBER)
        if not expected_serial or expected_serial.value != serial_number:
            raise HTTPException(status_code=409, detail="The serial number does not match this institution's license.")
        target_email = body.target_email.strip().lower()
        if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", target_email) or target_email == email:
            raise HTTPException(status_code=400, detail="A different valid new email address is required.")
    else:
        serial_number = None
        target_email = None

    authority_url = settings.LICENSE_AUTHORITY_URL.strip().rstrip("/")
    if not authority_url:
        raise HTTPException(status_code=503, detail="License authority URL is not configured.")
    request_payload = {
        "purpose": body.purpose,
        "email": email,
        "target_email": target_email,
        "serial_number": serial_number,
        "product_code": settings.LICENSE_PRODUCT_CODE,
        "company_binding": institution.code,
    }
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(10.0, connect=5.0)) as client:
            response = await client.post(f"{authority_url}/api/license/email/request", json=request_payload)
    except httpx.RequestError as exc:
        logger.warning("License email verification request failed: %s", exc)
        raise HTTPException(status_code=503, detail="License authority is temporarily unavailable.") from exc
    if response.status_code >= 400:
        raise HTTPException(status_code=503, detail="License authority could not process email verification.")
    try:
        response_body = response.json()
    except ValueError as exc:
        raise HTTPException(status_code=502, detail="License authority returned an invalid verification response.") from exc
    return {
        "ok": True,
        "challenge_id": response_body.get("challenge_id"),
        "message": response_body.get("message"),
    }


@router.post("/email/verify")
async def verify_license_email_code(
    body: LicenseEmailCodeVerificationRequest,
    current_user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
    institution_id: int | None = Query(None, ge=1),
    data_environment: str = Depends(get_data_environment),
):
    if data_environment != "PRODUCTION":
        raise HTTPException(status_code=409, detail="License email verification is available only for the production institution.")
    if is_sysadmin(current_user):
        target_institution_id = institution_id or current_user.institution_id
    else:
        if institution_id is not None and institution_id != current_user.institution_id:
            raise HTTPException(status_code=403, detail="Administrators can only manage their own institution license.")
        target_institution_id = current_user.institution_id
    if target_institution_id is None:
        raise HTTPException(status_code=400, detail="An institution must be selected.")
    institution = await db.get(Institution, target_institution_id)
    if not institution or not institution.is_active:
        raise HTTPException(status_code=404, detail="Active institution not found.")
    authority_url = settings.LICENSE_AUTHORITY_URL.strip().rstrip("/")
    if not authority_url:
        raise HTTPException(status_code=503, detail="License authority URL is not configured.")
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(10.0, connect=5.0)) as client:
            response = await client.post(
                f"{authority_url}/api/license/email/verify",
                json={"challenge_id": body.challenge_id, "code": body.code},
            )
    except httpx.RequestError as exc:
        logger.warning("License email verification failed: %s", exc)
        raise HTTPException(status_code=503, detail="License authority is temporarily unavailable.") from exc
    if response.status_code >= 400:
        raise HTTPException(status_code=400, detail="The email verification code is invalid or expired.")
    try:
        response_body = response.json()
    except ValueError as exc:
        raise HTTPException(status_code=502, detail="License authority returned an invalid verification response.") from exc
    if response_body.get("stage") == "complete" and isinstance(response_body.get("registered_email"), str):
        await _save_setting(
            db, target_institution_id, current_user, _SETTING_REGISTERED_EMAIL,
            response_body["registered_email"], "Email verified as the license account contact.",
        )
        await db.commit()
    return response_body


@router.post("/deactivate")
async def deactivate_license(
    current_user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
    institution_id: int | None = Query(None, ge=1),
    data_environment: str = Depends(get_data_environment),
):
    if data_environment != "PRODUCTION":
        raise HTTPException(status_code=409, detail="License deactivation is available only for the production institution.")
    if is_sysadmin(current_user):
        target_institution_id = institution_id or current_user.institution_id
    else:
        if institution_id is not None and institution_id != current_user.institution_id:
            raise HTTPException(status_code=403, detail="Administrators can only deactivate their own institution license.")
        target_institution_id = current_user.institution_id
    if target_institution_id is None:
        raise HTTPException(status_code=400, detail="An institution must be selected.")
    institution = await db.get(Institution, target_institution_id)
    if not institution or not institution.is_active:
        raise HTTPException(status_code=404, detail="Active institution not found.")
    context = await _load_license_context(db, target_institution_id, institution.code)
    payload = context["payload"]
    if not payload:
        raise HTTPException(status_code=409, detail="A verified active license is required for deactivation.")
    installation_setting = await _get_setting(db, target_institution_id, _SETTING_INSTALLATION_ID)
    activation_setting = await _get_setting(db, target_institution_id, _SETTING_ACTIVATION_ID)
    refresh_key_setting = await _get_setting(db, target_institution_id, _SETTING_REFRESH_PRIVATE_KEY)
    if not installation_setting or not activation_setting or not refresh_key_setting or not refresh_key_setting.value:
        raise HTTPException(status_code=409, detail="Installation management credentials are not available.")
    try:
        private_key = decrypt_refresh_private_key(
            refresh_key_setting.value, settings.SECRET_KEY, target_institution_id,
        )
    except LicenseArtifactError as exc:
        raise HTTPException(status_code=409, detail="Installation management credentials cannot be verified.") from exc
    authority_url = settings.LICENSE_AUTHORITY_URL.strip().rstrip("/")
    if not authority_url:
        raise HTTPException(status_code=503, detail="License authority URL is not configured.")
    timestamp = int(time.time() * 1000)
    nonce = str(uuid4())
    signature = sign_license_management_request(
        private_key,
        "deactivate",
        settings.LICENSE_PRODUCT_CODE,
        institution.code,
        installation_setting.value,
        activation_setting.value,
        timestamp,
        nonce,
    )
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(10.0, connect=5.0)) as client:
            response = await client.post(
                f"{authority_url}/api/license/manage",
                json={
                    "action": "deactivate",
                    "product_code": settings.LICENSE_PRODUCT_CODE,
                    "company_binding": institution.code,
                    "installation_id": installation_setting.value,
                    "activation_identifier": activation_setting.value,
                    "timestamp": timestamp,
                    "nonce": nonce,
                    "signature": signature,
                },
            )
    except httpx.RequestError as exc:
        logger.warning("License deactivation request failed: %s", exc)
        raise HTTPException(status_code=503, detail="License authority is temporarily unavailable; this installation remains activated.") from exc
    if response.status_code == 429:
        try:
            response_body = response.json()
        except ValueError:
            response_body = {}
        detail = response_body.get("error") if isinstance(response_body, dict) else None
        raise HTTPException(
            status_code=429,
            detail=detail if isinstance(detail, str) else "License transfer is temporarily rate-limited.",
        )
    if response.status_code >= 400:
        raise HTTPException(status_code=409, detail="License authority rejected the deactivation request.")

    for key, description in (
        (_SETTING_ARTIFACT, "Cleared after verified online license deactivation."),
        (_SETTING_INSTALLATION_ID, "Cleared after verified online license deactivation."),
        (_SETTING_ACTIVATION_ID, "Cleared after verified online license deactivation."),
        (_SETTING_REFRESH_PRIVATE_KEY, "Cleared after verified online license deactivation."),
        (_SETTING_REFRESH_ATTEMPTED_AT, "Cleared after verified online license deactivation."),
        (_SETTING_CLOCK_CHECKPOINT, "Cleared after verified online license deactivation."),
    ):
        await _save_setting(db, target_institution_id, current_user, key, "", description)
    await db.commit()
    return {"ok": True, "deactivated": True}


@router.post("/offline-request")
async def create_offline_activation_request(
    body: OfflineActivationRequest,
    current_user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
    institution_id: int | None = Query(None, ge=1),
    data_environment: str = Depends(get_data_environment),
):
    if data_environment != "PRODUCTION":
        raise HTTPException(status_code=409, detail="Offline license activation is available only for the production institution.")
    if is_sysadmin(current_user):
        target_institution_id = institution_id or current_user.institution_id
    else:
        if institution_id is not None and institution_id != current_user.institution_id:
            raise HTTPException(status_code=403, detail="Administrators can only activate a license for their own institution.")
        target_institution_id = current_user.institution_id
    if target_institution_id is None:
        raise HTTPException(status_code=400, detail="An institution must be selected for license activation.")
    institution = await db.get(Institution, target_institution_id)
    if not institution or not institution.is_active:
        raise HTTPException(status_code=404, detail="Active institution not found.")

    serial_number = body.serial_number.strip().upper()
    if not _SERIAL_NUMBER_PATTERN.fullmatch(serial_number):
        raise HTTPException(status_code=400, detail="The serial number format is invalid.")
    registration = body.registration.dict()
    if (
        not registration["institution_name"].strip()
        or not registration["contact_name"].strip()
        or not registration["phone"].strip()
        or not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", registration["contact_email"])
    ):
        raise HTTPException(status_code=400, detail="Provide an institution, contact name, valid email, and phone number.")
    installation_id, activation_identifier, public_key = await _prepare_installation_identity(
        db, target_institution_id, current_user,
    )
    await _save_setting(
        db, target_institution_id, current_user, _SETTING_SERIAL_NUMBER, serial_number,
        "Serial number presented for this institution license activation.",
    )
    await _save_setting(
        db, target_institution_id, current_user, _SETTING_REFRESH_ATTEMPTED_AT,
        datetime.now(timezone.utc).isoformat(), "Last attempted automatic signed license refresh.",
    )
    await db.commit()
    return {
        "schema_version": 1,
        "request_type": "prathamone-offline-activation-request",
        "serial_number": serial_number,
        "product_code": settings.LICENSE_PRODUCT_CODE,
        "company_binding": institution.code,
        "installation_id": installation_id,
        "activation_identifier": activation_identifier,
        "refresh_public_key": public_key,
        "registration": registration,
    }


@router.post("/offline-import")
async def import_offline_activation_artifact(
    body: OfflineArtifactImportRequest,
    current_user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
    institution_id: int | None = Query(None, ge=1),
    data_environment: str = Depends(get_data_environment),
):
    if data_environment != "PRODUCTION":
        raise HTTPException(status_code=409, detail="Offline license activation is available only for the production institution.")
    if is_sysadmin(current_user):
        target_institution_id = institution_id or current_user.institution_id
    else:
        if institution_id is not None and institution_id != current_user.institution_id:
            raise HTTPException(status_code=403, detail="Administrators can only activate a license for their own institution.")
        target_institution_id = current_user.institution_id
    if target_institution_id is None:
        raise HTTPException(status_code=400, detail="An institution must be selected for license activation.")
    institution = await db.get(Institution, target_institution_id)
    if not institution or not institution.is_active:
        raise HTTPException(status_code=404, detail="Active institution not found.")

    installation_setting = await _get_setting(db, target_institution_id, _SETTING_INSTALLATION_ID)
    activation_setting = await _get_setting(db, target_institution_id, _SETTING_ACTIVATION_ID)
    serial_setting = await _get_setting(db, target_institution_id, _SETTING_SERIAL_NUMBER)
    if not installation_setting or not activation_setting or not serial_setting:
        raise HTTPException(status_code=409, detail="Create an offline activation request for this serial number first.")
    try:
        payload = verify_signed_license_artifact(body.artifact, settings.LICENSE_PUBLIC_KEYS_JSON)
        if (
            payload.get("product_code") != settings.LICENSE_PRODUCT_CODE
            or payload.get("installation_id") != installation_setting.value
            or payload.get("activation_identifier") != activation_setting.value
            or payload.get("company_binding") != institution.code
            or payload.get("serial_number") != serial_setting.value
        ):
            raise LicenseArtifactError("Signed artifact does not match this offline activation request.")
        mode = calculate_license_mode(payload)
        if mode == "evaluation":
            raise LicenseArtifactError("Signed artifact is expired or outside its offline validity window.")
    except LicenseArtifactError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    artifact_json = json.dumps(body.artifact, separators=(",", ":"), sort_keys=True)
    await _save_setting(
        db, target_institution_id, current_user, _SETTING_ARTIFACT, artifact_json,
        "Offline signed license snapshot verified using the configured public key.",
    )
    await db.commit()
    return {
        "ok": True,
        "mode": mode,
        "document_id": payload["document_id"],
        "license_model": payload["license_model"],
        "edition": payload.get("edition"),
        "expires_at": payload.get("expires_at"),
    }
