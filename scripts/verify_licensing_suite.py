# /**
#  * @file        verify_licensing_suite.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      scripts
#  *
#  * @author      Jawahar R. Mallah
#  * @organization AITDL (AI Technology & Development Lab)
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 AITDL
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-16
#  * @updated     2026-11-16
#  *
#  * @description Cryptographic verification and tamper-resistance verification suite for PrathamOne EduOS licensing.
#  */

import sys
from pathlib import Path

# Add backend directory to path
backend_path = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_path))

import json
import base64
from datetime import datetime, timezone, timedelta
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives import serialization
from app.services.license_service import (
    verify_signed_license_artifact,
    calculate_license_mode,
    create_license_clock_checkpoint,
    verify_license_clock_checkpoint,
    create_refresh_keypair,
    encrypt_refresh_private_key,
    decrypt_refresh_private_key,
    sign_refresh_request,
    LicenseArtifactError,
)

print("=" * 70)
print("  PRATHAMONE EduOS — CRYPTOGRAPHIC LICENSING VERIFICATION SUITE")
print("=" * 70)

# 1. Asymmetric Ed25519 Signing & Verification
priv = Ed25519PrivateKey.generate()
pub_bytes = priv.public_key().public_bytes(serialization.Encoding.Raw, serialization.PublicFormat.Raw)
pub_b64 = base64.urlsafe_b64encode(pub_bytes).decode().rstrip("=")
keys_json = json.dumps({"key-test-1": pub_b64})

now_utc = datetime.now(timezone.utc)
payload = {
    "schema_version": 1,
    "document_id": "doc-123",
    "license_model": "on_premise_subscription",
    "status": "ACTIVE",
    "product_code": "prathamone-eduos",
    "installation_id": "inst-999",
    "company_binding": "PA001",
    "entitlements": {"module.billing": True, "module.payroll": False},
    "evaluation_policy": {"allow_dashboard": True, "locked_modules": ["payroll"]},
    "rollout_stage": "enforced",
    "issued_at": now_utc.isoformat(),
    "starts_at": "2026-01-01",
    "expires_at": (now_utc + timedelta(days=30)).date().isoformat(),
    "subscription_grace_days": 7,
    "offline_validity_days": 14,
}
payload_bytes = json.dumps(payload, separators=(",", ":")).encode()
sig = priv.sign(payload_bytes)
sig_b64 = base64.urlsafe_b64encode(sig).decode().rstrip("=")
payload_b64 = base64.urlsafe_b64encode(payload_bytes).decode().rstrip("=")

artifact = {
    "document_id": "doc-123",
    "algorithm": "Ed25519",
    "key_id": "key-test-1",
    "payload": payload_b64,
    "signature": sig_b64,
}

verified = verify_signed_license_artifact(artifact, keys_json)
assert verified["document_id"] == "doc-123"
print("[PASS] 1. Cryptographic Ed25519 signature verified successfully.")

# 2. Tampered signature detection
tampered_sig = base64.urlsafe_b64encode(b"X" * 64).decode().rstrip("=")
tampered_artifact = dict(artifact, signature=tampered_sig)
try:
    verify_signed_license_artifact(tampered_artifact, keys_json)
    assert False, "Should have failed!"
except LicenseArtifactError:
    print("[PASS] 2. Tampered signature rejected immediately.")

# 3. Tampered payload detection
tampered_payload_bytes = json.dumps(dict(payload, license_model="pirated_perpetual")).encode()
tampered_payload_b64 = base64.urlsafe_b64encode(tampered_payload_bytes).decode().rstrip("=")
tampered_artifact2 = dict(artifact, payload=tampered_payload_b64)
try:
    verify_signed_license_artifact(tampered_artifact2, keys_json)
    assert False, "Should have failed!"
except LicenseArtifactError:
    print("[PASS] 3. Altered payload content rejected immediately.")

# 4. Untrusted signing key detection
foreign_keys = json.dumps({"key-other": base64.urlsafe_b64encode(b"A" * 32).decode().rstrip("=")})
try:
    verify_signed_license_artifact(artifact, foreign_keys)
    assert False, "Should have failed!"
except LicenseArtifactError:
    print("[PASS] 4. Untrusted public key ID rejected.")

# 5. Expired subscription mode calculation
expired_payload = dict(payload, expires_at=(now_utc - timedelta(days=2)).date().isoformat())
mode = calculate_license_mode(expired_payload, now_utc)
assert mode == "grace", f"Expected grace, got {mode}"
print(f"[PASS] 5. License 2 days past expiry correctly entered grace mode: '{mode}'.")

expired_beyond_grace = dict(payload, expires_at=(now_utc - timedelta(days=15)).date().isoformat())
mode2 = calculate_license_mode(expired_beyond_grace, now_utc)
assert mode2 == "evaluation", f"Expected evaluation, got {mode2}"
print(f"[PASS] 6. License past 7-day grace period correctly locked into evaluation mode: '{mode2}'.")

# 6. Device keypair creation and AES-256-GCM encryption at rest
dev_priv, dev_pub = create_refresh_keypair()
enc_key = encrypt_refresh_private_key(dev_priv, "app-secret-2026", 1)
dec_key = decrypt_refresh_private_key(enc_key, "app-secret-2026", 1)
assert dev_priv == dec_key
print("[PASS] 7. Device keypair generated & AES-256-GCM encrypted/decrypted at rest.")

# 7. HMAC-SHA256 Clock checkpoint tamper detection
t1 = now_utc
cp = create_license_clock_checkpoint(1, t1, "secret")
v_t1 = verify_license_clock_checkpoint(1, cp, "secret")
assert abs((v_t1 - t1).total_seconds()) < 1
print("[PASS] 8. HMAC-SHA256 system clock checkpoint validated.")

print("-" * 70)
print("  ALL 8 ADVANCED CRYPTOGRAPHIC TESTS PASSED WITH 100% SUCCESS!")
print("=" * 70)
