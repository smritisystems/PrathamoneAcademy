# /**
#  * @file        test_license_service.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      backend.tests
#  *
#  * @author      Jawahar R. Mallah
#  * @organization AITDL (AI Technology & Development Lab)
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 AITDL
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-16
#  * @updated     2026-11-15
#  *
#  * @description Focused signature validation and license-mode tests.
#  */

import base64
import inspect
import json
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey, Ed25519PublicKey
from starlette.requests import Request

from app.api.v1.endpoints import license as license_endpoint
from app.api.v1.endpoints.license import (
    _enforce_module_entitlement,
    _is_evaluation_read_allowed,
    LicenseActivationRequest,
    LicenseRegistrationRequest,
    OfflineActivationRequest,
    _resolve_license_module,
)
from app.services.license_service import (
    LicenseArtifactError,
    calculate_license_mode,
    create_refresh_keypair,
    decrypt_refresh_private_key,
    encrypt_refresh_private_key,
    sign_refresh_request,
    verify_signed_license_artifact,
)


def _b64url(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).decode("ascii").rstrip("=")


def _signed_artifact():
    private_key = Ed25519PrivateKey.generate()
    public_key = private_key.public_key().public_bytes(
        serialization.Encoding.Raw,
        serialization.PublicFormat.Raw,
    )
    payload = {
        "schema_version": 1,
        "document_id": "artifact-001",
        "product_code": "prathamone-eduos",
        "company_binding": "PA001",
        "installation_id": "installation-001",
        "license_model": "on_premise_subscription",
        "status": "ACTIVE",
        "starts_at": "2026-01-01",
        "expires_at": "2026-11-10",
        "subscription_grace_days": 7,
        "rollout_stage": "enforced",
        "evaluation_policy": {"allow_reports": True},
        "entitlements": {},
        "issued_at": datetime.now(timezone.utc).isoformat(),
    }
    payload_bytes = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    signature = private_key.sign(payload_bytes)
    artifact = {
        "document_id": payload["document_id"],
        "algorithm": "Ed25519",
        "key_id": "test-key",
        "payload": _b64url(payload_bytes),
        "signature": _b64url(signature),
    }
    public_keys = json.dumps({"test-key": _b64url(public_key)})
    return artifact, public_keys, payload


def test_verifies_signed_artifact_with_pinned_public_key():
    artifact, public_keys, expected_payload = _signed_artifact()
    assert verify_signed_license_artifact(artifact, public_keys) == expected_payload


def test_rejects_tampered_signature_and_untrusted_key():
    artifact, public_keys, _ = _signed_artifact()
    tampered = {**artifact, "signature": _b64url(b"x" * 64)}
    with pytest.raises(LicenseArtifactError, match="signature verification failed"):
        verify_signed_license_artifact(tampered, public_keys)
    with pytest.raises(LicenseArtifactError, match="untrusted key"):
        verify_signed_license_artifact(artifact, "{}")


def test_license_mode_preserves_perpetual_operation_and_enforces_subscription_grace():
    now = datetime(2026, 11, 16, tzinfo=timezone.utc)
    perpetual = {
        "license_model": "on_premise_perpetual",
        "status": "ACTIVE",
        "starts_at": "2020-01-01",
        "expires_at": "2020-01-02",
        "issued_at": datetime.now(timezone.utc).isoformat(),
    }
    subscription = {
        "license_model": "on_premise_subscription",
        "status": "EXPIRED",
        "starts_at": "2026-01-01",
        "expires_at": "2026-11-10",
        "subscription_grace_days": 7,
        "issued_at": "2026-11-16T00:00:00+00:00",
    }
    beyond_grace = {**subscription, "expires_at": "2026-11-08"}
    draft_perpetual = {**perpetual, "status": "DRAFT"}
    draft_one_time = {**perpetual, "license_model": "cloud_one_time", "status": "DRAFT"}
    assert calculate_license_mode(perpetual, now) == "active"
    assert calculate_license_mode(draft_perpetual, now) == "evaluation"
    assert calculate_license_mode(draft_one_time, now) == "evaluation"
    assert calculate_license_mode(subscription, now) == "grace"
    assert calculate_license_mode(beyond_grace, now) == "evaluation"


def test_stale_snapshot_enters_evaluation_and_refresh_key_is_encrypted_and_bound_to_institution():
    private_key, public_key = create_refresh_keypair()
    encrypted_key = encrypt_refresh_private_key(private_key, "test-secret", 41)
    assert private_key.hex() not in encrypted_key
    assert decrypt_refresh_private_key(encrypted_key, "test-secret", 41) == private_key
    with pytest.raises(LicenseArtifactError, match="cannot be decrypted"):
        decrypt_refresh_private_key(encrypted_key, "other-secret", 41)
    with pytest.raises(LicenseArtifactError, match="cannot be decrypted"):
        decrypt_refresh_private_key(encrypted_key, "test-secret", 42)

    signature = sign_refresh_request(
        private_key,
        "prathamone-eduos",
        "PA001",
        "installation-001",
        "activation-001",
        1794787200000,
        "nonce-001",
    )
    public_key_bytes = base64.urlsafe_b64decode(public_key + "=" * (-len(public_key) % 4))
    Ed25519PublicKey.from_public_bytes(public_key_bytes).verify(
        base64.urlsafe_b64decode(signature + "=" * (-len(signature) % 4)),
        "\n".join((
            "prathamone-eduos",
            "PA001",
            "installation-001",
            "activation-001",
            "1794787200000",
            "nonce-001",
        )).encode("utf-8"),
    )
    assert len(public_key_bytes) == 32

    stale = {
        "license_model": "on_premise_perpetual",
        "status": "ACTIVE",
        "starts_at": "2020-01-01",
        "expires_at": None,
        "issued_at": "2026-11-08T00:00:00+00:00",
    }
    assert calculate_license_mode(stale, datetime(2026, 11, 16, tzinfo=timezone.utc)) == "evaluation"


def test_offline_snapshot_validity_is_per_artifact_and_legacy_snapshots_keep_seven_days():
    now = datetime(2026, 11, 16, tzinfo=timezone.utc)
    base = {
        "license_model": "on_premise_perpetual",
        "status": "ACTIVE",
        "starts_at": "2020-01-01",
        "expires_at": None,
    }
    recent_90_day = {
        **base,
        "issued_at": (now - timedelta(days=89)).isoformat(),
        "offline_validity_days": 90,
    }
    stale_90_day = {
        **base,
        "issued_at": (now - timedelta(days=91)).isoformat(),
        "offline_validity_days": 90,
    }
    stale_legacy = {
        **base,
        "issued_at": (now - timedelta(days=8)).isoformat(),
    }
    assert calculate_license_mode(recent_90_day, now) == "active"
    assert calculate_license_mode(stale_90_day, now) == "evaluation"
    assert calculate_license_mode(stale_legacy, now) == "evaluation"
    with pytest.raises(LicenseArtifactError, match="freshness"):
        calculate_license_mode({**recent_90_day, "offline_validity_days": 0}, now)


def test_activation_registration_requires_contact_and_institution_details():
    registration = LicenseRegistrationRequest(
        institution_name="Prashant Academy",
        contact_name="Jawahar Mallah",
        contact_email="contact@example.test",
        phone="+91-9876543210",
    )
    request = OfflineActivationRequest(serial_number="SMR-LIC-0123456789ABCDEF0123", registration=registration)
    assert request.registration.contact_email == "contact@example.test"
    with pytest.raises(ValueError):
        LicenseRegistrationRequest(
            institution_name="Prashant Academy",
            contact_name="Jawahar Mallah",
            contact_email="contact@example.test",
        )


@pytest.mark.asyncio
async def test_due_refresh_uses_installation_signature_without_resending_license_key(monkeypatch):
    private_key, _ = create_refresh_keypair()
    encrypted_key = encrypt_refresh_private_key(private_key, license_endpoint.settings.SECRET_KEY, 41)
    issued_at = (datetime.now(timezone.utc) - timedelta(days=2)).isoformat()
    request_payloads = []
    saved_artifacts = []

    class FakeDatabase:
        async def commit(self):
            return None

    class FakeResponse:
        status_code = 200

        def json(self):
            return {"artifact": {"document_id": "refreshed-artifact"}}

    class FakeClient:
        def __init__(self, **kwargs):
            assert kwargs["timeout"].connect == 5.0

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc_value, traceback):
            return None

        async def post(self, url, json):
            assert url.endswith("/api/license/refresh")
            request_payloads.append(json)
            return FakeResponse()

    async def load_context(db, institution_id, company_binding):
        return {
            "payload": {"issued_at": issued_at},
            "installation_id": "installation-001",
            "activation_identifier": "activation-001",
        }

    async def get_setting(db, institution_id, key):
        if key == "license.refresh_private_key":
            return SimpleNamespace(value=encrypted_key)
        return None

    async def save_setting(db, institution_id, user, key, value, description):
        saved_artifacts.append((key, value))

    def verify_artifact(artifact, public_keys_json):
        return {
            "product_code": "prathamone-eduos",
            "installation_id": "installation-001",
            "activation_identifier": "activation-001",
            "company_binding": "ACADEMY-41",
        }

    monkeypatch.setattr(license_endpoint, "_load_license_context", load_context)
    monkeypatch.setattr(license_endpoint, "_get_setting", get_setting)
    monkeypatch.setattr(license_endpoint, "_save_setting", save_setting)
    monkeypatch.setattr(license_endpoint, "verify_signed_license_artifact", verify_artifact)
    monkeypatch.setattr(license_endpoint.httpx, "AsyncClient", FakeClient)
    monkeypatch.setattr(license_endpoint.settings, "LICENSE_AUTHORITY_URL", "https://license.example")

    async def claim_attempt(*args):
        return True

    monkeypatch.setattr(license_endpoint, "_claim_refresh_attempt", claim_attempt)
    result = await license_endpoint._refresh_license_if_due(FakeDatabase(), 41, "ACADEMY-41")

    assert result == "refreshed"
    assert len(request_payloads) == 1
    assert "license_key" not in request_payloads[0]
    assert request_payloads[0]["product_code"] == "prathamone-eduos"
    assert request_payloads[0]["company_binding"] == "ACADEMY-41"
    assert request_payloads[0]["installation_id"] == "installation-001"
    assert request_payloads[0]["activation_identifier"] == "activation-001"
    assert request_payloads[0]["nonce"]
    assert request_payloads[0]["signature"]
    assert saved_artifacts[0][0] == "license.artifact"


def test_license_module_routes_are_mapped_and_unknown_routes_fail_closed():
    assert _resolve_license_module("/api/v1/students") == "students"
    assert _resolve_license_module("/api/v1/students/42") == "students"
    assert _resolve_license_module("/api/v1/reports/intelligence/summary") == "premium_analytics"
    assert _resolve_license_module("/api/v1/license/status") is None
    with pytest.raises(HTTPException) as error:
        _resolve_license_module("/api/v1/unmapped-business-route")
    assert error.value.status_code == 423
    with pytest.raises(HTTPException) as denied:
        _enforce_module_entitlement("/api/v1/students", {"module.students": False})
    assert denied.value.status_code == 423


def test_evaluation_mode_allows_only_configured_read_and_recovery_paths():
    policy = {
        "allow_dashboard": True,
        "allow_read_only_records": True,
        "allow_reports": True,
        "allow_backups": True,
        "allow_exports": True,
    }

    def request(method: str, path: str) -> Request:
        return Request({
            "type": "http",
            "method": method,
            "path": path,
            "headers": [],
            "query_string": b"",
            "server": ("test", 80),
            "client": ("test", 123),
            "scheme": "http",
        })

    assert _is_evaluation_read_allowed(request("GET", "/api/v1/reports"), policy)
    assert _is_evaluation_read_allowed(request("POST", "/api/v1/reports/attendance/generate"), policy)
    assert _is_evaluation_read_allowed(request("POST", "/api/v1/import-export/export"), policy)
    assert _is_evaluation_read_allowed(request("POST", "/api/v1/housekeeping/backups"), policy)
    assert not _is_evaluation_read_allowed(request("POST", "/api/v1/housekeeping/backups/prune"), policy)
    assert not _is_evaluation_read_allowed(request("POST", "/api/v1/students"), policy)


@pytest.mark.asyncio
async def test_license_activation_route_allows_admin_and_sysadmin_roles_only():
    dependency = inspect.signature(license_endpoint.activate_license).parameters["current_user"].default.dependency
    admin = SimpleNamespace(role="admin", is_active=True)
    sysadmin = SimpleNamespace(role="sysadmin", is_active=True)
    staff = SimpleNamespace(role="staff", is_active=True)

    assert await dependency(admin) is admin
    assert await dependency(sysadmin) is sysadmin
    with pytest.raises(HTTPException) as error:
        await dependency(staff)
    assert error.value.status_code == 403


@pytest.mark.asyncio
async def test_institution_admin_cannot_select_another_institution():
    with pytest.raises(HTTPException) as error:
        await license_endpoint.activate_license(
            body=LicenseActivationRequest(license_key="LIC-TEST-KEY"),
            db=SimpleNamespace(),
            current_user=SimpleNamespace(role="admin", institution_id=41),
            institution_id=42,
            data_environment="PRODUCTION",
        )

    assert error.value.status_code == 403
    assert "own institution" in error.value.detail


@pytest.mark.asyncio
async def test_reactivation_refreshes_snapshot_without_changing_installation_identity(monkeypatch):
    stored_settings = {}
    authority_calls = []
    artifact_number = 0

    class FakeDatabase:
        async def get(self, model, key):
            assert model.__name__ == "Institution"
            assert key == 41
            return SimpleNamespace(code="ACADEMY-41", is_active=True)

        async def commit(self):
            return None

    class FakeResponse:
        status_code = 201

        def __init__(self, document_id):
            self.document_id = document_id

        def json(self):
            return {"artifact": {"document_id": self.document_id}}

    class FakeClient:
        def __init__(self, **kwargs):
            assert kwargs["timeout"].connect == 5.0

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc_value, traceback):
            return None

        async def post(self, url, json):
            nonlocal artifact_number
            artifact_number += 1
            authority_calls.append({"url": url, "body": json})
            return FakeResponse(f"artifact-{artifact_number}")

    async def get_setting(db, institution_id, key):
        assert institution_id == 41
        value = stored_settings.get(key)
        return SimpleNamespace(value=value) if value is not None else None

    async def save_setting(db, institution_id, user, key, value, description):
        assert institution_id == 41
        stored_settings[key] = value

    def verify_artifact(artifact, public_keys_json):
        request_body = authority_calls[-1]["body"]
        return {
            "document_id": artifact["document_id"],
            "product_code": request_body["product_code"],
            "installation_id": request_body["installation_id"],
            "activation_identifier": request_body["activation_identifier"],
            "company_binding": request_body["company_binding"],
            "license_model": "on_premise_subscription",
            "status": "ACTIVE",
            "starts_at": "2026-01-01",
            "expires_at": "2027-01-01",
            "issued_at": datetime.now(timezone.utc).isoformat(),
        }

    monkeypatch.setattr(license_endpoint.settings, "LICENSE_AUTHORITY_URL", "https://license.example")
    monkeypatch.setattr(license_endpoint.settings, "LICENSE_PRODUCT_CODE", "prathamone-eduos")
    monkeypatch.setattr(license_endpoint.settings, "LICENSE_PUBLIC_KEYS_JSON", '{"test-key":"public"}')
    monkeypatch.setattr(license_endpoint, "_get_setting", get_setting)
    monkeypatch.setattr(license_endpoint, "_save_setting", save_setting)
    monkeypatch.setattr(license_endpoint, "verify_signed_license_artifact", verify_artifact)
    monkeypatch.setattr(license_endpoint.httpx, "AsyncClient", FakeClient)

    db = FakeDatabase()
    user = SimpleNamespace(id=7, full_name="Test Admin", role="admin", institution_id=41)
    request = LicenseActivationRequest(license_key="LIC-TEST-KEY")

    first = await license_endpoint.activate_license(
        body=request,
        db=db,
        current_user=user,
        institution_id=None,
        data_environment="PRODUCTION",
    )
    first_installation_id = stored_settings["license.installation_id"]
    first_activation_id = stored_settings["license.activation_identifier"]

    second = await license_endpoint.activate_license(
        body=request,
        db=db,
        current_user=user,
        institution_id=None,
        data_environment="PRODUCTION",
    )

    assert first["document_id"] == "artifact-1"
    assert second["document_id"] == "artifact-2"
    assert len(authority_calls) == 2
    assert all(call["url"] == "https://license.example/api/license/activate" for call in authority_calls)
    assert all(call["body"]["license_key"] == "LIC-TEST-KEY" for call in authority_calls)
    assert all(call["body"]["installation_id"] == first_installation_id for call in authority_calls)
    assert all(call["body"]["activation_identifier"] == first_activation_id for call in authority_calls)
    assert all(call["body"]["company_binding"] == "ACADEMY-41" for call in authority_calls)
    assert "LIC-TEST-KEY" not in repr(stored_settings)


@pytest.mark.asyncio
async def test_batch_activation_forwards_registration_and_never_persists_activation_key(monkeypatch):
    stored_settings = {}
    authority_calls = []
    activation_key = "ACT-" + "A" * 48

    class FakeDatabase:
        async def get(self, model, key):
            return SimpleNamespace(code="ACADEMY-41", is_active=True)

        async def commit(self):
            return None

    class FakeResponse:
        status_code = 201

        def json(self):
            return {"artifact": {"document_id": "batch-artifact"}}

    class FakeClient:
        def __init__(self, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc_value, traceback):
            return None

        async def post(self, url, json):
            authority_calls.append({"url": url, "body": json})
            return FakeResponse()

    async def save_setting(db, institution_id, user, key, value, description):
        stored_settings[key] = value

    def verify_artifact(artifact, public_keys_json):
        request_body = authority_calls[-1]["body"]
        return {
            "document_id": artifact["document_id"],
            "product_code": request_body["product_code"],
            "installation_id": request_body["installation_id"],
            "activation_identifier": request_body["activation_identifier"],
            "company_binding": request_body["company_binding"],
            "serial_number": request_body["serial_number"],
            "license_model": "on_premise_subscription",
            "status": "ACTIVE",
            "starts_at": "2026-01-01",
            "expires_at": "2027-01-01",
            "issued_at": datetime.now(timezone.utc).isoformat(),
            "offline_validity_days": 90,
        }

    monkeypatch.setattr(license_endpoint.settings, "LICENSE_AUTHORITY_URL", "https://license.example")
    monkeypatch.setattr(license_endpoint.settings, "LICENSE_PRODUCT_CODE", "prathamone-eduos")
    monkeypatch.setattr(license_endpoint, "_prepare_installation_identity", lambda *args: _identity_result())
    monkeypatch.setattr(license_endpoint, "_save_setting", save_setting)
    monkeypatch.setattr(license_endpoint, "verify_signed_license_artifact", verify_artifact)
    monkeypatch.setattr(license_endpoint.httpx, "AsyncClient", FakeClient)

    async def identity_result():
        return ("installation-001", "activation-001", "public-key")

    async def _identity_result():
        return await identity_result()

    registration = LicenseRegistrationRequest(
        institution_name="Prashant Academy",
        contact_name="Jawahar Mallah",
        contact_email="contact@example.test",
        phone="+91-9876543210",
    )
    response = await license_endpoint.activate_license(
        body=LicenseActivationRequest(
            serial_number="SMR-LIC-" + "B" * 20,
            activation_key=activation_key,
            registration=registration,
        ),
        db=FakeDatabase(),
        current_user=SimpleNamespace(id=9, full_name="Admin", role="admin", institution_id=41, email="admin@example.test"),
        institution_id=None,
        data_environment="PRODUCTION",
    )

    assert response["mode"] == "active"
    assert authority_calls[0]["body"]["serial_number"] == "SMR-LIC-" + "B" * 20
    assert authority_calls[0]["body"]["activation_key"] == activation_key
    assert authority_calls[0]["body"]["registration"]["contact_email"] == "contact@example.test"
    assert "license_key" not in authority_calls[0]["body"]
    assert activation_key not in repr(stored_settings)
    assert stored_settings[_SETTING_SERIAL_NUMBER := "license.serial_number"] == "SMR-LIC-" + "B" * 20


@pytest.mark.asyncio
async def test_offline_request_and_import_are_bound_to_the_pending_installation(monkeypatch):
    saved_settings = []

    class FakeDatabase:
        async def get(self, model, key):
            return SimpleNamespace(code="ACADEMY-41", is_active=True)

        async def commit(self):
            return None

    async def save_setting(db, institution_id, user, key, value, description):
        saved_settings.append((key, value))

    registration = LicenseRegistrationRequest(
        institution_name="Prashant Academy",
        contact_name="Jawahar Mallah",
        contact_email="contact@example.test",
        phone="+91-9876543210",
        address="12 Academy Road",
    )
    async def identity(*args):
        return ("installation-001", "activation-001", "public-key")

    monkeypatch.setattr(license_endpoint, "_prepare_installation_identity", identity)
    monkeypatch.setattr(license_endpoint, "_save_setting", save_setting)
    challenge = await license_endpoint.create_offline_activation_request(
        body=OfflineActivationRequest(
            serial_number="SMR-LIC-" + "C" * 20,
            registration=registration,
        ),
        current_user=SimpleNamespace(id=9, full_name="Admin", role="admin", institution_id=41),
        db=FakeDatabase(),
        institution_id=None,
        data_environment="PRODUCTION",
    )
    assert challenge["request_type"] == "prathamone-offline-activation-request"
    assert challenge["installation_id"] == "installation-001"
    assert challenge["registration"]["contact_email"] == "contact@example.test"
    assert "activation_key" not in challenge
    assert "private_key" not in challenge

    settings = {
        "license.installation_id": "installation-001",
        "license.activation_identifier": "activation-001",
        "license.serial_number": "SMR-LIC-" + "C" * 20,
    }

    async def get_setting(db, institution_id, key):
        value = settings.get(key)
        return SimpleNamespace(value=value) if value else None

    def verify_artifact(artifact, public_keys_json):
        return {
            "document_id": artifact["document_id"],
            "product_code": "prathamone-eduos",
            "installation_id": artifact["installation_id"],
            "activation_identifier": artifact["activation_identifier"],
            "company_binding": "ACADEMY-41",
            "serial_number": artifact["serial_number"],
            "license_model": "on_premise_perpetual",
            "status": "ACTIVE",
            "issued_at": datetime.now(timezone.utc).isoformat(),
            "offline_validity_days": 90,
            "starts_at": "2026-01-01",
            "expires_at": None,
        }

    monkeypatch.setattr(license_endpoint, "_get_setting", get_setting)
    monkeypatch.setattr(license_endpoint, "verify_signed_license_artifact", verify_artifact)
    monkeypatch.setattr(license_endpoint, "calculate_license_mode", lambda payload: "active")
    imported = await license_endpoint.import_offline_activation_artifact(
        body=license_endpoint.OfflineArtifactImportRequest(artifact={
            "document_id": "offline-artifact",
            "installation_id": "installation-001",
            "activation_identifier": "activation-001",
            "serial_number": "SMR-LIC-" + "C" * 20,
        }),
        current_user=SimpleNamespace(id=9, full_name="Admin", role="admin", institution_id=41),
        db=FakeDatabase(),
        institution_id=None,
        data_environment="PRODUCTION",
    )
    assert imported["document_id"] == "offline-artifact"
    assert saved_settings[-1][0] == "license.artifact"

    with pytest.raises(HTTPException) as mismatch:
        await license_endpoint.import_offline_activation_artifact(
            body=license_endpoint.OfflineArtifactImportRequest(artifact={
                "document_id": "wrong-install",
                "installation_id": "other-installation",
                "activation_identifier": "activation-001",
                "serial_number": "SMR-LIC-" + "C" * 20,
            }),
            current_user=SimpleNamespace(id=9, full_name="Admin", role="admin", institution_id=41),
            db=FakeDatabase(),
            institution_id=None,
            data_environment="PRODUCTION",
        )
    assert mismatch.value.status_code == 400
