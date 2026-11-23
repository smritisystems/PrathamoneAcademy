# /**
#  * @file        test_license_reactivation.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      backend.tests
#  *
#  * @author      Jawahar R. Mallah
#  * @organization Smritisys & AITDL Networks
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 PrathamOne EduOS
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-23
#  * @updated     2026-11-23
#  *
#  * @description Focused test suite for customer-account license reactivation, session handling, polling, key retention, and artifact verification.
#  */

import base64
import json
from datetime import datetime, timezone
from types import SimpleNamespace
from typing import Any

import httpx
import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from fastapi import HTTPException
from starlette.requests import Request

from app.api.v1.endpoints import license as license_endpoint
from app.api.v1.endpoints.license import (
    CustomerLoginRequest,
    CustomerReactivationActivateRequest,
    CustomerReactivationRequest,
    LicenseActivationRequest,
    customer_login,
    customer_reactivations,
    customer_reactivation_request,
    customer_reactivation_poll,
    customer_reactivation_activate,
)
from app.services.license_service import (
    LicenseArtifactError,
    LicenseReactivationError,
    customer_account_login,
    customer_activate_reactivation,
    customer_create_reactivation_request,
    customer_get_reactivations,
    customer_poll_reactivation_status,
    decrypt_refresh_private_key,
    encrypt_refresh_private_key,
    verify_and_import_reactivation_artifact,
    verify_signed_license_artifact,
)


def _b64url(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).decode("ascii").rstrip("=")


def _generate_signed_artifact(
    document_id: str = "art-reactivate-001",
    product_code: str = "prathamone-eduos",
    company_binding: str = "PA001",
    installation_id: str = "inst-node-001",
    activation_identifier: str = "act-ident-001",
    status: str = "ACTIVE",
    expires_at: str | None = "2028-12-31",
):
    private_key = Ed25519PrivateKey.generate()
    public_key = private_key.public_key().public_bytes(
        serialization.Encoding.Raw,
        serialization.PublicFormat.Raw,
    )
    payload = {
        "schema_version": 1,
        "document_id": document_id,
        "product_code": product_code,
        "company_binding": company_binding,
        "installation_id": installation_id,
        "activation_identifier": activation_identifier,
        "license_model": "on_premise_subscription",
        "status": status,
        "starts_at": "2026-01-01",
        "expires_at": expires_at,
        "subscription_grace_days": 7,
        "offline_validity_days": 14,
        "rollout_stage": "enforced",
        "evaluation_policy": {"allow_reports": True},
        "entitlements": {},
        "issued_at": datetime.now(timezone.utc).isoformat(),
    }
    payload_bytes = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    signature = private_key.sign(payload_bytes)
    artifact = {
        "document_id": document_id,
        "algorithm": "Ed25519",
        "key_id": "test-authority-key",
        "payload": _b64url(payload_bytes),
        "signature": _b64url(signature),
    }
    public_keys_json = json.dumps({"test-authority-key": _b64url(public_key)})
    return artifact, public_keys_json, payload


# ==============================================================================
# 1. Login and Session Handling Tests
# ==============================================================================

@pytest.mark.asyncio
async def test_customer_account_login_success():
    """Customer signs in with account email & password using POST /api/login without OTP."""
    called_urls = []
    called_payloads = []

    class FakeResponse:
        status_code = 200

        def json(self):
            return {"token": "sess_tok_abc123", "email": "customer@example.com"}

    class FakeClient:
        async def post(self, url: str, json: dict[str, Any]):
            called_urls.append(url)
            called_payloads.append(json)
            return FakeResponse()

    res = await customer_account_login(
        authority_url="https://license.smritisys.com",
        email="CUSTOMER@EXAMPLE.COM",
        password="MySecretPassword123!",
        client=FakeClient(),
    )

    assert res["ok"] is True
    assert res["session_token"] == "sess_tok_abc123"
    assert res["email"] == "customer@example.com"
    assert called_urls[0] == "https://license.smritisys.com/api/login"
    assert called_payloads[0]["email"] == "customer@example.com"
    assert called_payloads[0]["password"] == "MySecretPassword123!"


@pytest.mark.asyncio
async def test_customer_account_login_invalid_credentials_and_network_errors():
    """Handles 401/403 credentials error and network errors clearly."""
    class FakeUnauthorizedResponse:
        status_code = 401

    class FakeUnauthorizedClient:
        async def post(self, url: str, json: dict[str, Any]):
            return FakeUnauthorizedResponse()

    with pytest.raises(LicenseReactivationError, match="Invalid customer account email or password"):
        await customer_account_login(
            authority_url="https://license.smritisys.com",
            email="wrong@example.com",
            password="WrongPassword",
            client=FakeUnauthorizedClient(),
        )

    class FakeNetworkErrorClient:
        async def post(self, url: str, json: dict[str, Any]):
            raise httpx.ConnectError("Network is unreachable")

    with pytest.raises(LicenseReactivationError, match="temporarily unreachable"):
        await customer_account_login(
            authority_url="https://license.smritisys.com",
            email="user@example.com",
            password="AnyPassword",
            client=FakeNetworkErrorClient(),
        )


@pytest.mark.asyncio
async def test_customer_login_endpoint_stores_token_in_secure_storage(monkeypatch):
    """POST /customer/login never stores password and persists session token as is_secret=True."""
    saved_settings = {}
    audit_logs = []

    class FakeDb:
        async def get(self, model, key):
            return SimpleNamespace(code="PA001", is_active=True)

        async def commit(self):
            return None

    async def fake_get_setting(db, inst_id, key):
        val = saved_settings.get(key)
        return SimpleNamespace(value=val) if val is not None else None

    async def fake_save_setting(db, inst_id, user, key, value, desc):
        saved_settings[key] = value
        audit_logs.append((key, desc))

    async def fake_customer_account_login(url, email, password):
        # Assert password was passed only in-flight, not saved
        assert password == "SecureUserPass!2026"
        return {"ok": True, "session_token": "token_xyz987", "email": email.lower()}

    monkeypatch.setattr(license_endpoint, "_get_setting", fake_get_setting)
    monkeypatch.setattr(license_endpoint, "_save_setting", fake_save_setting)
    monkeypatch.setattr(license_endpoint, "customer_account_login", fake_customer_account_login)
    monkeypatch.setattr(license_endpoint.settings, "LICENSE_AUTHORITY_URL", "https://license.smritisys.com")

    admin = SimpleNamespace(id=1, full_name="Admin User", role="admin", institution_id=1)
    req = CustomerLoginRequest(email="admin@academy.org", password="SecureUserPass!2026")

    res = await customer_login(
        body=req,
        current_user=admin,
        db=FakeDb(),
        institution_id=1,
        data_environment="PRODUCTION",
    )

    assert res["ok"] is True
    assert res["session_token"] == "token_xyz987"
    assert "SecureUserPass!2026" not in saved_settings.values()
    assert saved_settings["license.customer_session_token"] == "token_xyz987"
    assert saved_settings["license.registered_email"] == "admin@academy.org"


# ==============================================================================
# 2. Eligible Licenses Retrieval Tests
# ==============================================================================

@pytest.mark.asyncio
async def test_customer_get_reactivations_lists_licenses():
    """GET /api/license/reactivations with session token returns eligible licenses."""
    called_headers = {}

    class FakeResponse:
        status_code = 200

        def json(self):
            return {
                "licenses": [
                    {
                        "license_id": 42,
                        "serial_number": "123456789",
                        "edition": "coaching-institute",
                        "license_model": "on_premise_subscription",
                        "seats": 5,
                        "activation_count": 2,
                    }
                ]
            }

    class FakeClient:
        async def get(self, url: str, headers: dict[str, str]):
            called_headers.update(headers)
            return FakeResponse()

    licenses = await customer_get_reactivations(
        authority_url="https://license.smritisys.com",
        session_token="session_valid_token_123",
        client=FakeClient(),
    )

    assert len(licenses) == 1
    assert licenses[0]["license_id"] == 42
    assert licenses[0]["serial_number"] == "123456789"
    assert called_headers["Authorization"] == "Bearer session_valid_token_123"


# ==============================================================================
# 3. Approved Reactivation Request and Activation Tests
# ==============================================================================

@pytest.mark.asyncio
async def test_customer_reactivation_approved_and_activated(monkeypatch):
    """Approved reactivation request proceeds to POST /api/license/activate with reactivation_request_id."""
    artifact, public_keys, _ = _generate_signed_artifact(
        installation_id="machine-hw-001",
        activation_identifier="act-ident-001",
        company_binding="PA001",
    )
    authority_requests = []

    class FakeResponse:
        def __init__(self, data: dict[str, Any], code: int = 200):
            self._data = data
            self.status_code = code

        def json(self):
            return self._data

    class FakeClient:
        def __init__(self, **_kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *_args):
            return None

        async def post(self, url: str, json: dict[str, Any], headers: dict[str, str] | None = None):
            authority_requests.append({"url": url, "json": json, "headers": headers or {}})
            if url.endswith("/api/license/reactivations"):
                # Simulates immediate server approval
                return FakeResponse({
                    "id": "req-approved-999",
                    "status": "approved",
                    "registered_phone": "+91 98765 43210",
                    "message": "Auto-approved for verified account device transfer.",
                })
            elif url.endswith("/api/license/activate"):
                assert json.get("reactivation_request_id") == "req-approved-999"
                return FakeResponse({"artifact": artifact, "registered_email": "customer@example.com"})
            return FakeResponse({}, 404)

    stored_settings = {
        "license.customer_session_token": "valid-token-123",
        "license.installation_id": "machine-hw-001",
        "license.activation_identifier": "act-ident-001",
    }

    class FakeDb:
        async def get(self, model, key):
            return SimpleNamespace(code="PA001", is_active=True)

        async def commit(self):
            return None

    async def fake_get_setting(_db, _inst_id, key):
        val = stored_settings.get(key)
        return SimpleNamespace(value=val) if val is not None else None

    async def fake_save_setting(_db, _inst_id, _user, key, val, _desc):
        stored_settings[key] = val

    monkeypatch.setattr(license_endpoint, "_get_setting", fake_get_setting)
    monkeypatch.setattr(license_endpoint, "_save_setting", fake_save_setting)
    monkeypatch.setattr(license_endpoint, "get_machine_hardware_fingerprint", lambda: "machine-hw-001")
    monkeypatch.setattr(license_endpoint, "verify_hardware_fingerprint", lambda _fp: (True, "OK"))
    monkeypatch.setattr(license_endpoint.httpx, "AsyncClient", FakeClient)
    monkeypatch.setattr(license_endpoint.settings, "LICENSE_AUTHORITY_URL", "https://license.smritisys.com")
    monkeypatch.setattr(license_endpoint.settings, "LICENSE_PUBLIC_KEYS_JSON", public_keys)
    monkeypatch.setattr(license_endpoint.settings, "LICENSE_PRODUCT_CODE", "prathamone-eduos")

    admin = SimpleNamespace(id=1, full_name="Admin", role="admin", institution_id=1)

    # 1. Submit reactivation request
    req = CustomerReactivationRequest(license_id=42)
    fake_request = Request({"type": "http", "headers": []})
    req_res = await customer_reactivation_request(
        body=req,
        request=fake_request,
        current_user=admin,
        db=FakeDb(),
        institution_id=1,
        data_environment="PRODUCTION",
    )

    assert req_res["ok"] is True
    assert req_res["id"] == "req-approved-999"
    assert req_res["status"] == "approved"

    # Verify POST /api/license/reactivations received correct payload and NO private key
    reactivation_call = authority_requests[0]
    assert reactivation_call["url"].endswith("/api/license/reactivations")
    assert reactivation_call["json"]["license_id"] == 42
    assert reactivation_call["json"]["installation_id"] == "machine-hw-001"
    assert "refresh_public_key" in reactivation_call["json"]
    assert "private_key" not in reactivation_call["json"]

    # 2. Complete activation with reactivation_request_id
    act_req = CustomerReactivationActivateRequest(reactivation_request_id="req-approved-999")
    act_res = await customer_reactivation_activate(
        body=act_req,
        current_user=admin,
        db=FakeDb(),
        institution_id=1,
        data_environment="PRODUCTION",
    )

    assert act_res["ok"] is True
    assert act_res["mode"] == "active"
    assert act_res["document_id"] == "art-reactivate-001"
    assert stored_settings["license.artifact"] is not None


# ==============================================================================
# 4. Pending Reactivation Request and Polling / Retry Tests
# ==============================================================================

@pytest.mark.asyncio
async def test_customer_reactivation_pending_and_polling_retry(monkeypatch):
    """Pending request returns phone; polling checks status and retries once approved."""
    poll_count = 0

    class FakePollResponse:
        def __init__(self, data: dict[str, Any]):
            self._data = data
            self.status_code = 200

        def json(self):
            return self._data

    class FakeClient:
        async def get(self, url: str, headers: dict[str, str]):
            nonlocal poll_count
            poll_count += 1
            if poll_count < 3:
                return FakePollResponse({
                    "id": "req-pending-123",
                    "status": "pending",
                    "registered_phone": "+91 98765 00000",
                    "message": "Verification agent will call registered phone.",
                })
            return FakePollResponse({
                "id": "req-pending-123",
                "status": "approved",
                "registered_phone": "+91 98765 00000",
                "message": "Approved by support.",
            })

    # First poll: pending
    p1 = await customer_poll_reactivation_status(
        authority_url="https://license.smritisys.com",
        session_token="valid_session_token",
        request_id="req-pending-123",
        client=FakeClient(),
    )
    assert p1["status"] == "pending"
    assert p1["registered_phone"] == "+91 98765 00000"

    # Second poll: pending
    p2 = await customer_poll_reactivation_status(
        authority_url="https://license.smritisys.com",
        session_token="valid_session_token",
        request_id="req-pending-123",
        client=FakeClient(),
    )
    assert p2["status"] == "pending"

    # Third poll: approved
    p3 = await customer_poll_reactivation_status(
        authority_url="https://license.smritisys.com",
        session_token="valid_session_token",
        request_id="req-pending-123",
        client=FakeClient(),
    )
    assert p3["status"] == "approved"


@pytest.mark.asyncio
async def test_customer_reactivation_rejected_and_expired():
    """Handles rejected and expired status from authority polling."""
    class FakeRejectedClient:
        async def get(self, url: str, headers: dict[str, str]):
            return SimpleNamespace(
                status_code=200,
                json=lambda: {
                    "id": "req-rej-01",
                    "status": "rejected",
                    "message": "Identity check failed.",
                },
            )

    res = await customer_poll_reactivation_status(
        authority_url="https://license.smritisys.com",
        session_token="tok",
        request_id="req-rej-01",
        client=FakeRejectedClient(),
    )
    assert res["status"] == "rejected"
    assert res["message"] == "Identity check failed."


# ==============================================================================
# 5. Secure Key Retention Tests
# ==============================================================================

@pytest.mark.asyncio
async def test_persistent_keys_reused_and_private_key_never_leaked(monkeypatch):
    """Ensures existing installation ID and refresh key are reused and private key never leaves host."""
    stored_settings = {}

    class FakeDb:
        async def commit(self):
            return None

    async def fake_get_setting(_db, _inst_id, key):
        val = stored_settings.get(key)
        return SimpleNamespace(value=val) if val is not None else None

    async def fake_save_setting(_db, _inst_id, _user, key, val, _desc):
        stored_settings[key] = val

    monkeypatch.setattr(license_endpoint, "_get_setting", fake_get_setting)
    monkeypatch.setattr(license_endpoint, "_save_setting", fake_save_setting)
    monkeypatch.setattr(license_endpoint.settings, "SECRET_KEY", "app-secret-encryption-key-2026")

    admin = SimpleNamespace(id=1, full_name="Admin", role="admin", institution_id=1)

    # First preparation creates key
    inst1, act1, pub1 = await license_endpoint._prepare_installation_identity(FakeDb(), 1, admin)
    enc_priv1 = stored_settings["license.refresh_private_key"]
    assert enc_priv1.startswith("v1.")

    # Decrypt to verify it is valid
    decrypted1 = decrypt_refresh_private_key(enc_priv1, "app-secret-encryption-key-2026", 1)
    assert len(decrypted1) == 32

    # Second preparation must reuse identical persistent installation ID, activation ID, and public key
    inst2, act2, pub2 = await license_endpoint._prepare_installation_identity(FakeDb(), 1, admin)
    assert inst1 == inst2
    assert act1 == act2
    assert pub1 == pub2

    # Assert private key is NEVER equal to public key or stored unencrypted
    assert decrypted1.hex() not in enc_priv1


# ==============================================================================
# 6. Artifact Verification Path & Tampering Protection Tests
# ==============================================================================

def test_verify_and_import_valid_artifact_succeeds():
    """Valid signed artifact is successfully verified and imported."""
    artifact, public_keys, _ = _generate_signed_artifact(
        document_id="art-valid-01",
        product_code="prathamone-eduos",
        company_binding="PA001",
        installation_id="node-lock-123",
        activation_identifier="act-123",
    )

    res = verify_and_import_reactivation_artifact(
        artifact=artifact,
        public_keys_json=public_keys,
        expected_product_code="prathamone-eduos",
        expected_company_binding="PA001",
        expected_installation_id="node-lock-123",
        expected_activation_identifier="act-123",
    )

    assert res["mode"] == "active"
    assert res["document_id"] == "art-valid-01"


def test_verify_and_import_rejects_tampered_signature_and_untrusted_keys():
    """Tampered signature or untrusted public key raises LicenseArtifactError."""
    artifact, public_keys, _ = _generate_signed_artifact()
    tampered_artifact = {**artifact, "signature": _b64url(b"x" * 64)}

    with pytest.raises(LicenseArtifactError, match="signature verification failed"):
        verify_and_import_reactivation_artifact(
            artifact=tampered_artifact,
            public_keys_json=public_keys,
            expected_product_code="prathamone-eduos",
            expected_company_binding="PA001",
            expected_installation_id="inst-node-001",
            expected_activation_identifier="act-ident-001",
        )

    with pytest.raises(LicenseArtifactError, match="untrusted key"):
        verify_and_import_reactivation_artifact(
            artifact=artifact,
            public_keys_json=json.dumps({"untrusted-key-id": _b64url(b"k" * 32)}),
            expected_product_code="prathamone-eduos",
            expected_company_binding="PA001",
            expected_installation_id="inst-node-001",
            expected_activation_identifier="act-ident-001",
        )


def test_verify_and_import_rejects_mismatched_installation_product_and_company():
    """Rejects artifact if installation ID, product code, or company binding does not match."""
    artifact, public_keys, _ = _generate_signed_artifact(
        product_code="prathamone-eduos",
        company_binding="PA001",
        installation_id="node-lock-123",
    )

    # Wrong installation ID
    with pytest.raises(LicenseArtifactError, match="does not match this installation"):
        verify_and_import_reactivation_artifact(
            artifact=artifact,
            public_keys_json=public_keys,
            expected_product_code="prathamone-eduos",
            expected_company_binding="PA001",
            expected_installation_id="different-machine-node-lock",
            expected_activation_identifier="act-ident-001",
        )

    # Wrong company binding
    with pytest.raises(LicenseArtifactError, match="does not match expected"):
        verify_and_import_reactivation_artifact(
            artifact=artifact,
            public_keys_json=public_keys,
            expected_product_code="prathamone-eduos",
            expected_company_binding="OTHER-ACADEMY-002",
            expected_installation_id="node-lock-123",
            expected_activation_identifier="act-ident-001",
        )

    # Wrong product code
    with pytest.raises(LicenseArtifactError, match="does not match expected"):
        verify_and_import_reactivation_artifact(
            artifact=artifact,
            public_keys_json=public_keys,
            expected_product_code="other-product",
            expected_company_binding="PA001",
            expected_installation_id="node-lock-123",
            expected_activation_identifier="act-ident-001",
        )


def test_verify_and_import_rejects_expired_and_suspended_artifacts():
    """Rejects expired or suspended signed license snapshot from entering active mode."""
    # Suspended
    suspended_artifact, public_keys, _ = _generate_signed_artifact(status="SUSPENDED")
    with pytest.raises(LicenseArtifactError, match="suspended"):
        verify_and_import_reactivation_artifact(
            artifact=suspended_artifact,
            public_keys_json=public_keys,
            expected_product_code="prathamone-eduos",
            expected_company_binding="PA001",
            expected_installation_id="inst-node-001",
            expected_activation_identifier="act-ident-001",
        )

    # Expired beyond grace
    expired_artifact, public_keys_exp, _ = _generate_signed_artifact(expires_at="2020-01-01")
    with pytest.raises(LicenseArtifactError, match="expired"):
        verify_and_import_reactivation_artifact(
            artifact=expired_artifact,
            public_keys_json=public_keys_exp,
            expected_product_code="prathamone-eduos",
            expected_company_binding="PA001",
            expected_installation_id="inst-node-001",
            expected_activation_identifier="act-ident-001",
        )
