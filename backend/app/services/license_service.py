# /**
#  * @file        license_service.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      backend.app.services
#  *
#  * @author      Jawahar R. Mallah
#  * @organization Smritisys & AITDL Networks
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 PrathamOne EduOS
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-16
#  * @updated     2026-11-24
#  *
#  * @description Verifies signed license artifacts and calculates local entitlement state.
#  */

import base64
import binascii
import hashlib
import hmac
import json
import os
import re
from datetime import date, datetime, timedelta, timezone
from typing import Any

import httpx
from cryptography.exceptions import InvalidSignature, InvalidTag
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey, Ed25519PublicKey

LICENSE_REFRESH_INTERVAL = timedelta(hours=24)
LICENSE_REFRESH_RETRY_INTERVAL = timedelta(hours=1)
LICENSE_OFFLINE_GRACE = timedelta(days=7)
LICENSE_DEFAULT_OFFLINE_VALIDITY_DAYS = 14
LICENSE_LEGACY_OFFLINE_VALIDITY_DAYS = 7
LICENSE_CLOCK_ROLLBACK_TOLERANCE = timedelta(minutes=5)
LICENSE_CLOCK_CHECKPOINT_INTERVAL = timedelta(minutes=15)
_REFRESH_KEY_VERSION = "v1"
_CLOCK_CHECKPOINT_PREFIX = "prathamone-license-clock-v1"

class LicenseArtifactError(ValueError):
    """Raised when a signed license artifact cannot be trusted."""


def _decode_base64url(value: Any) -> bytes:
    if not isinstance(value, str) or not re.fullmatch(r"[A-Za-z0-9_-]+", value):
        raise LicenseArtifactError("License artifact contains invalid base64url data.")
    try:
        return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))
    except (ValueError, binascii.Error) as exc:
        raise LicenseArtifactError("License artifact contains invalid base64url data.") from exc


def _encode_base64url(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).decode("ascii").rstrip("=")


def create_refresh_keypair() -> tuple[bytes, str]:
    private_key = Ed25519PrivateKey.generate()
    private_bytes = private_key.private_bytes(
        serialization.Encoding.Raw,
        serialization.PrivateFormat.Raw,
        serialization.NoEncryption(),
    )
    return private_bytes, refresh_public_key(private_bytes)


def refresh_public_key(private_key_bytes: bytes) -> str:
    try:
        public_bytes = Ed25519PrivateKey.from_private_bytes(private_key_bytes).public_key().public_bytes(
            serialization.Encoding.Raw,
            serialization.PublicFormat.Raw,
        )
    except ValueError as exc:
        raise LicenseArtifactError("Installation refresh private key is invalid.") from exc
    return _encode_base64url(public_bytes)


def encrypt_refresh_private_key(private_key: bytes, application_secret: str, institution_id: int) -> str:
    if len(private_key) != 32:
        raise LicenseArtifactError("Installation refresh private key has an invalid length.")
    encryption_key = hashlib.sha256(
        b"prathamone-license-refresh-v1:" + application_secret.encode("utf-8")
    ).digest()
    nonce = os.urandom(12)
    associated_data = f"prathamone-license-refresh:{institution_id}".encode("ascii")
    encrypted = AESGCM(encryption_key).encrypt(nonce, private_key, associated_data)
    return f"{_REFRESH_KEY_VERSION}.{_encode_base64url(nonce + encrypted)}"


def decrypt_refresh_private_key(value: str, application_secret: str, institution_id: int) -> bytes:
    try:
        version, encoded = value.split(".", 1)
        if version != _REFRESH_KEY_VERSION:
            raise ValueError("Unsupported key version.")
        encrypted = _decode_base64url(encoded)
        if len(encrypted) < 12 + 16:
            raise ValueError("Encrypted key is truncated.")
        encryption_key = hashlib.sha256(
            b"prathamone-license-refresh-v1:" + application_secret.encode("utf-8")
        ).digest()
        associated_data = f"prathamone-license-refresh:{institution_id}".encode("ascii")
        private_key = AESGCM(encryption_key).decrypt(encrypted[:12], encrypted[12:], associated_data)
        if len(private_key) != 32:
            raise ValueError("Private key has an invalid length.")
        return private_key
    except (ValueError, InvalidTag, UnicodeEncodeError) as exc:
        raise LicenseArtifactError("Installation refresh key cannot be decrypted; reactivate the license.") from exc


def sign_refresh_request(
    private_key_bytes: bytes,
    product_code: str,
    company_binding: str,
    installation_id: str,
    activation_identifier: str,
    timestamp: int,
    nonce: str,
) -> str:
    message = "\n".join((
        product_code,
        company_binding,
        installation_id,
        activation_identifier,
        str(timestamp),
        nonce,
    )).encode("utf-8")
    try:
        return _encode_base64url(Ed25519PrivateKey.from_private_bytes(private_key_bytes).sign(message))
    except ValueError as exc:
        raise LicenseArtifactError("Installation refresh private key is invalid.") from exc


def sign_license_management_request(
    private_key_bytes: bytes,
    action: str,
    product_code: str,
    company_binding: str,
    installation_id: str,
    activation_identifier: str,
    timestamp: int,
    nonce: str,
) -> str:
    if action != "deactivate":
        raise LicenseArtifactError("Unsupported license management action.")
    message = "\n".join((
        "license-management-v1",
        action,
        product_code,
        company_binding,
        installation_id,
        activation_identifier,
        str(timestamp),
        nonce,
    )).encode("utf-8")
    try:
        return _encode_base64url(Ed25519PrivateKey.from_private_bytes(private_key_bytes).sign(message))
    except ValueError as exc:
        raise LicenseArtifactError("Installation refresh private key is invalid.") from exc


def create_license_clock_checkpoint(
    institution_id: int,
    timestamp: datetime,
    application_secret: str,
) -> str:
    if institution_id < 1 or timestamp.tzinfo is None or not application_secret:
        raise LicenseArtifactError("License clock checkpoint inputs are invalid.")
    normalized_time = timestamp.astimezone(timezone.utc).isoformat()
    message = f"{_CLOCK_CHECKPOINT_PREFIX}\n{institution_id}\n{normalized_time}".encode("utf-8")
    signature = hmac.new(application_secret.encode("utf-8"), message, hashlib.sha256).hexdigest()
    return f"{normalized_time}.{signature}"


def verify_license_clock_checkpoint(
    institution_id: int,
    checkpoint: str,
    application_secret: str,
) -> datetime:
    try:
        normalized_time, signature = checkpoint.rsplit(".", 1)
        timestamp = datetime.fromisoformat(normalized_time)
        if timestamp.tzinfo is None:
            raise ValueError("Checkpoint time must include a timezone.")
        expected = create_license_clock_checkpoint(institution_id, timestamp, application_secret).rsplit(".", 1)[1]
        if not hmac.compare_digest(signature, expected):
            raise ValueError("Checkpoint signature does not match.")
        return timestamp.astimezone(timezone.utc)
    except (AttributeError, TypeError, ValueError, UnicodeEncodeError) as exc:
        raise LicenseArtifactError("License clock checkpoint is invalid.") from exc


def verify_signed_license_artifact(
    artifact: dict[str, Any],
    public_keys_json: str,
) -> dict[str, Any]:
    if not isinstance(artifact, dict) or artifact.get("algorithm") != "Ed25519":
        raise LicenseArtifactError("Unsupported license signature algorithm.")
    key_id = artifact.get("key_id")
    if not isinstance(key_id, str) or not re.fullmatch(r"[A-Za-z0-9._-]{1,128}", key_id):
        raise LicenseArtifactError("License artifact has an invalid key identifier.")
    try:
        public_keys = json.loads(public_keys_json or "{}")
    except (TypeError, json.JSONDecodeError) as exc:
        raise LicenseArtifactError("License verification keys are misconfigured.") from exc
    if not isinstance(public_keys, dict) or key_id not in public_keys:
        raise LicenseArtifactError("License artifact was signed by an untrusted key.")

    payload_bytes = _decode_base64url(artifact.get("payload"))
    signature = _decode_base64url(artifact.get("signature"))
    public_key_bytes = _decode_base64url(public_keys[key_id])
    if len(public_key_bytes) != 32 or len(signature) != 64:
        raise LicenseArtifactError("License artifact has an invalid key or signature length.")
    try:
        Ed25519PublicKey.from_public_bytes(public_key_bytes).verify(signature, payload_bytes)
    except (InvalidSignature, ValueError) as exc:
        raise LicenseArtifactError("License artifact signature verification failed.") from exc

    try:
        payload = json.loads(payload_bytes)
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise LicenseArtifactError("License artifact payload is invalid.") from exc
    if not isinstance(payload, dict) or payload.get("schema_version") != 1:
        raise LicenseArtifactError("Unsupported license artifact schema.")
    if payload.get("document_id") != artifact.get("document_id"):
        raise LicenseArtifactError("License artifact document identifier does not match.")
    if (
        not isinstance(payload.get("license_model"), str)
        or not isinstance(payload.get("status"), str)
        or not isinstance(payload.get("product_code"), str)
        or not isinstance(payload.get("installation_id"), str)
        or not isinstance(payload.get("company_binding"), str)
        or not isinstance(payload.get("entitlements"), dict)
        or not isinstance(payload.get("evaluation_policy"), dict)
        or payload.get("rollout_stage") not in {"shadow", "enforced"}
        or not isinstance(payload.get("issued_at"), str)
    ):
        raise LicenseArtifactError("License artifact payload is incomplete.")
    if "serial_number" in payload and not isinstance(payload["serial_number"], str):
        raise LicenseArtifactError("License artifact serial number is invalid.")
    offline_validity_days = payload.get("offline_validity_days", LICENSE_LEGACY_OFFLINE_VALIDITY_DAYS)
    if type(offline_validity_days) is not int or not 1 <= offline_validity_days <= 365:
        raise LicenseArtifactError("License artifact offline validity is invalid.")
    try:
        issued_at = datetime.fromisoformat(payload["issued_at"].replace("Z", "+00:00"))
        if issued_at.tzinfo is None:
            raise ValueError("Issue time must include a timezone.")
    except (TypeError, ValueError) as exc:
        raise LicenseArtifactError("License artifact issue time is invalid.") from exc
    return payload


def calculate_license_mode(
    payload: dict[str, Any],
    now: datetime | None = None,
) -> str:
    model = payload.get("license_model")
    status = payload.get("status")
    current_time = now or datetime.now(timezone.utc)
    today = current_time.date()
    issued_at = payload.get("issued_at")
    try:
        issued_time = datetime.fromisoformat(issued_at.replace("Z", "+00:00"))
        if issued_time.tzinfo is None:
            raise ValueError("Issue time must include a timezone.")
        if issued_time > current_time + timedelta(minutes=5):
            raise ValueError("Issue time is in the future.")
        offline_validity_days = payload.get("offline_validity_days", LICENSE_LEGACY_OFFLINE_VALIDITY_DAYS)
        if type(offline_validity_days) is not int or not 1 <= offline_validity_days <= 365:
            raise LicenseArtifactError("License snapshot offline validity is invalid.")
        snapshot_age = current_time - issued_time
        if snapshot_age > timedelta(days=offline_validity_days) + LICENSE_OFFLINE_GRACE:
            return "evaluation"
        offline_grace = snapshot_age > timedelta(days=offline_validity_days)
    except (AttributeError, TypeError, ValueError) as exc:
        raise LicenseArtifactError("License snapshot freshness is invalid.") from exc
    starts_at = payload.get("starts_at")
    try:
        if starts_at and date.fromisoformat(starts_at) > today:
            return "evaluation"
    except (TypeError, ValueError) as exc:
        raise LicenseArtifactError("License start date is invalid.") from exc
    if status in {"DRAFT", "SUSPENDED", "CANCELLED"}:
        return "evaluation"
    if model in {"on_premise_perpetual", "cloud_one_time"}:
        if status != "ACTIVE":
            return "evaluation"
        return "grace" if offline_grace else "active"

    expires_at = payload.get("expires_at")
    try:
        if not expires_at or date.fromisoformat(expires_at) >= today:
            return "grace" if offline_grace else "active"
        expiry_day = date.fromisoformat(expires_at)
    except (TypeError, ValueError) as exc:
        raise LicenseArtifactError("License validity dates are invalid.") from exc

    grace_days = payload.get("subscription_grace_days", 7)
    if not isinstance(grace_days, int) or not 0 <= grace_days <= 30:
        raise LicenseArtifactError("License grace period is invalid.")
    return "grace" if (today - expiry_day).days <= grace_days else "evaluation"


class LicenseReactivationError(ValueError):
    """Raised when customer-account license reactivation fails."""


def _authority_error_message(response: httpx.Response, fallback: str) -> str:
    try:
        data = response.json()
    except (AttributeError, ValueError, json.JSONDecodeError):
        return fallback
    if not isinstance(data, dict):
        return fallback
    for key in ("detail", "message", "error"):
        value = data.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return fallback


async def customer_account_login(
    authority_url: str,
    email: str,
    password: str,
    client: httpx.AsyncClient | None = None,
) -> dict[str, Any]:
    """Authenticates the customer using POST /api/login without OTP. Never stores the password."""
    norm_url = authority_url.strip().rstrip("/")
    if not norm_url:
        raise LicenseReactivationError("License authority URL is not configured.")
    payload = {"email": email.strip().lower(), "password": password}

    async def _post(c: httpx.AsyncClient):
        return await c.post(f"{norm_url}/api/login", json=payload)

    try:
        if client:
            response = await _post(client)
        else:
            async with httpx.AsyncClient(timeout=httpx.Timeout(10.0, connect=5.0)) as c:
                response = await _post(c)
    except httpx.RequestError as exc:
        raise LicenseReactivationError("License authority is temporarily unreachable.") from exc

    if response.status_code in {401, 403}:
        raise LicenseReactivationError(
            _authority_error_message(response, "Invalid customer account email or password.")
        )
    if response.status_code >= 400:
        raise LicenseReactivationError(
            _authority_error_message(response, f"License authority rejected login (status {response.status_code}).")
        )

    try:
        data = response.json()
    except (ValueError, json.JSONDecodeError) as exc:
        raise LicenseReactivationError("License authority returned an invalid login response.") from exc

    token = data.get("token") or data.get("session_token") or data.get("access_token")
    if not token or not isinstance(token, str):
        raise LicenseReactivationError("License authority login did not return a valid session token.")

    return {
        "ok": True,
        "session_token": token,
        "email": email.strip().lower(),
    }


async def customer_get_reactivations(
    authority_url: str,
    session_token: str,
    client: httpx.AsyncClient | None = None,
) -> list[dict[str, Any]]:
    """Retrieves eligible licenses for reactivation using GET /api/license/reactivations."""
    norm_url = authority_url.strip().rstrip("/")
    if not norm_url:
        raise LicenseReactivationError("License authority URL is not configured.")
    if not session_token:
        raise LicenseReactivationError("Customer session token is required to list reactivations.")

    headers = {"Authorization": f"Bearer {session_token}"}

    async def _get(c: httpx.AsyncClient):
        return await c.get(f"{norm_url}/api/license/reactivations", headers=headers)

    try:
        if client:
            response = await _get(client)
        else:
            async with httpx.AsyncClient(timeout=httpx.Timeout(10.0, connect=5.0)) as c:
                response = await _get(c)
    except httpx.RequestError as exc:
        raise LicenseReactivationError("License authority is temporarily unreachable.") from exc

    if response.status_code in {401, 403}:
        raise LicenseReactivationError("Customer session has expired. Please sign in again.")
    if response.status_code >= 400:
        raise LicenseReactivationError(
            _authority_error_message(response, f"Failed to retrieve eligible licenses (status {response.status_code}).")
        )

    try:
        data = response.json()
    except (ValueError, json.JSONDecodeError) as exc:
        raise LicenseReactivationError("License authority returned an invalid reactivations response.") from exc

    licenses = data if isinstance(data, list) else (
        data.get("licenses") or data.get("items") or data.get("data")
        if isinstance(data, dict)
        else None
    )
    if not isinstance(licenses, list):
        raise LicenseReactivationError("License authority returned an invalid reactivations response.")

    normalized = []
    for license in licenses:
        if not isinstance(license, dict):
            raise LicenseReactivationError("License authority returned an invalid license option.")
        active_count = license.get("activation_count", license.get("active_activation_count"))
        if not isinstance(active_count, int) or isinstance(active_count, bool) or active_count < 0:
            raise LicenseReactivationError("License authority returned an invalid active-device count.")
        normalized.append({**license, "activation_count": active_count})
    return normalized


async def customer_create_reactivation_request(
    authority_url: str,
    session_token: str,
    license_id: int,
    installation_id: str,
    activation_identifier: str,
    refresh_public_key: str,
    surrender_confirmed: bool = False,
    surrender_reason: str | None = None,
    surrendered_activation_id: int | None = None,
    client: httpx.AsyncClient | None = None,
) -> dict[str, Any]:
    """Submits a license reactivation request using POST /api/license/reactivations.
    Keeps private key on installation and sends only refresh_public_key.
    """
    norm_url = authority_url.strip().rstrip("/")
    if not norm_url:
        raise LicenseReactivationError("License authority URL is not configured.")
    if not session_token:
        raise LicenseReactivationError("Customer session token is required.")

    headers = {"Authorization": f"Bearer {session_token}"}
    payload = {
        "license_id": license_id,
        "installation_id": installation_id,
        "activation_identifier": activation_identifier,
        "refresh_public_key": refresh_public_key,
        "surrender_confirmed": surrender_confirmed,
    }
    if surrender_confirmed:
        if not surrender_reason or len(surrender_reason.strip()) < 10:
            raise LicenseReactivationError("A surrender reason of at least 10 characters is required.")
        if not isinstance(surrendered_activation_id, int) or surrendered_activation_id < 1:
            raise LicenseReactivationError("A previously released activation must be selected for a surrender claim.")
        payload["surrender_reason"] = surrender_reason.strip()
        payload["surrendered_activation_id"] = surrendered_activation_id
    elif surrendered_activation_id is not None:
        raise LicenseReactivationError("A surrendered activation can only be sent with a surrender claim.")

    async def _post(c: httpx.AsyncClient):
        return await c.post(f"{norm_url}/api/license/reactivations", json=payload, headers=headers)

    try:
        if client:
            response = await _post(client)
        else:
            async with httpx.AsyncClient(timeout=httpx.Timeout(10.0, connect=5.0)) as c:
                response = await _post(c)
    except httpx.RequestError as exc:
        raise LicenseReactivationError("License authority is temporarily unreachable.") from exc

    if response.status_code in {401, 403}:
        raise LicenseReactivationError("Customer session has expired. Please sign in again.")
    if response.status_code >= 400:
        raise LicenseReactivationError(
            _authority_error_message(response, "Reactivation request rejected by server.")
        )

    try:
        data = response.json()
    except (ValueError, json.JSONDecodeError) as exc:
        raise LicenseReactivationError("Invalid reactivation response format from server.") from exc

    req_id = data.get("id") or data.get("reactivation_request_id")
    status = data.get("status", "pending")
    phone = data.get("registered_phone") or data.get("phone") or data.get("support_phone")
    message = data.get("message")
    return {
        "id": str(req_id) if req_id is not None else None,
        "status": status,
        "registered_phone": phone,
        "message": message,
        "raw": data,
    }


async def customer_poll_reactivation_status(
    authority_url: str,
    session_token: str,
    request_id: str,
    client: httpx.AsyncClient | None = None,
) -> dict[str, Any]:
    """Polls the status of a reactivation request using GET /api/license/reactivations/<id>."""
    norm_url = authority_url.strip().rstrip("/")
    if not norm_url:
        raise LicenseReactivationError("License authority URL is not configured.")
    if not session_token:
        raise LicenseReactivationError("Customer session token is required.")

    headers = {"Authorization": f"Bearer {session_token}"}

    async def _get(c: httpx.AsyncClient):
        return await c.get(f"{norm_url}/api/license/reactivations/{request_id}", headers=headers)

    try:
        if client:
            response = await _get(client)
        else:
            async with httpx.AsyncClient(timeout=httpx.Timeout(10.0, connect=5.0)) as c:
                response = await _get(c)
    except httpx.RequestError as exc:
        raise LicenseReactivationError("License authority is temporarily unreachable.") from exc

    if response.status_code in {401, 403}:
        raise LicenseReactivationError("Customer session has expired. Please sign in again.")
    if response.status_code == 404:
        raise LicenseReactivationError("Reactivation request not found.")
    if response.status_code >= 400:
        raise LicenseReactivationError(
            _authority_error_message(response, f"Reactivation status check failed (status {response.status_code}).")
        )

    try:
        data = response.json()
    except (ValueError, json.JSONDecodeError) as exc:
        raise LicenseReactivationError("Invalid status response format from server.") from exc

    status = data.get("status", "pending")
    phone = data.get("registered_phone") or data.get("phone")
    message = data.get("message")
    return {
        "id": str(request_id),
        "status": status,
        "registered_phone": phone,
        "message": message,
        "raw": data,
    }


async def customer_activate_reactivation(
    authority_url: str,
    reactivation_request_id: str,
    product_code: str,
    company_binding: str,
    installation_id: str,
    activation_identifier: str,
    refresh_public_key: str | None = None,
    session_token: str | None = None,
    client: httpx.AsyncClient | None = None,
) -> dict[str, Any]:
    """Calls POST /api/license/activate with reactivation_request_id once approved."""
    norm_url = authority_url.strip().rstrip("/")
    if not norm_url:
        raise LicenseReactivationError("License authority URL is not configured.")

    payload = {
        "reactivation_request_id": reactivation_request_id,
        "product_code": product_code,
        "company_binding": company_binding,
        "installation_id": installation_id,
        "activation_identifier": activation_identifier,
    }
    if refresh_public_key:
        payload["refresh_public_key"] = refresh_public_key

    headers = {"Authorization": f"Bearer {session_token}"} if session_token else None

    async def _post(c: httpx.AsyncClient):
        return await c.post(f"{norm_url}/api/license/activate", json=payload, headers=headers)

    try:
        if client:
            response = await _post(client)
        else:
            async with httpx.AsyncClient(timeout=httpx.Timeout(10.0, connect=5.0)) as c:
                response = await _post(c)
    except httpx.RequestError as exc:
        raise LicenseReactivationError("License authority is temporarily unreachable.") from exc

    if response.status_code >= 400:
        raise LicenseReactivationError(
            _authority_error_message(
                response,
                "License authority could not activate the approved reactivation request.",
            )
        )

    try:
        data = response.json()
    except (ValueError, json.JSONDecodeError) as exc:
        raise LicenseReactivationError("License authority returned an invalid activation response.") from exc

    artifact = data.get("artifact") if isinstance(data, dict) else None
    if not isinstance(artifact, dict):
        raise LicenseReactivationError("Missing signed license artifact in activation response.")

    return {
        "ok": True,
        "artifact": artifact,
        "registered_email": data.get("registered_email"),
        "raw": data,
    }


def verify_and_import_reactivation_artifact(
    artifact: dict[str, Any],
    public_keys_json: str,
    expected_product_code: str,
    expected_company_binding: str,
    expected_installation_id: str,
    expected_activation_identifier: str,
) -> dict[str, Any]:
    """Verifies and validates the returned license artifact using Ed25519 verification.
    Never bypasses signature, product, company, or installation checks.
    """
    # 1. Cryptographic Ed25519 signature & structure verification
    payload = verify_signed_license_artifact(artifact, public_keys_json)

    # 2. Binding checks
    if payload.get("product_code") != expected_product_code:
        raise LicenseArtifactError(
            f"Artifact product '{payload.get('product_code')}' does not match expected '{expected_product_code}'."
        )
    if payload.get("company_binding") != expected_company_binding:
        raise LicenseArtifactError(
            f"Artifact company binding '{payload.get('company_binding')}' does not match expected '{expected_company_binding}'."
        )
    if payload.get("installation_id") != expected_installation_id:
        raise LicenseArtifactError(
            f"Artifact installation ID '{payload.get('installation_id')}' does not match this installation '{expected_installation_id}'."
        )
    if payload.get("activation_identifier") != expected_activation_identifier:
        raise LicenseArtifactError(
            "Artifact activation identifier does not match this installation."
        )

    # 3. Mode calculation & expiration verification
    mode = calculate_license_mode(payload)
    if mode == "evaluation":
        status = payload.get("status")
        if status in {"SUSPENDED", "CANCELLED", "DRAFT"}:
            raise LicenseArtifactError(f"The reactivated license is {status.lower()}.")
        raise LicenseArtifactError("The reactivated license is expired or outside its offline validity window.")

    return {
        "mode": mode,
        "payload": payload,
        "document_id": payload["document_id"],
        "license_model": payload.get("license_model"),
        "edition": payload.get("edition"),
        "expires_at": payload.get("expires_at"),
        "issued_at": payload.get("issued_at"),
    }
