# /**
#  * @file        test_license_certificate.py
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
#  * @created     2026-11-24
#  * @updated     2026-11-24
#  *
#  * @description Source component for Test License Certificate in the backend.tests module.
#  */

from app.api.v1.endpoints.license import _license_certificate_fields, _license_verification_url
from app.core.config import settings


def test_certificate_fields_come_only_from_the_verified_snapshot(monkeypatch):
    monkeypatch.setattr(settings, "LICENSE_AUTHORITY_URL", "https://smritisys.com/")
    payload = {
        "document_id": "123e4567-e89b-42d3-a456-426614174000",
        "license_id": "1042",
        "status": "ACTIVE",
        "entitlements": {"users": 25},
        "customer_id": "not-returned",
        "installation_id": "not-returned",
    }

    assert _license_certificate_fields(payload) == {
        "license_id": "1042",
        "license_status": "ACTIVE",
        "entitlements": {"users": 25},
        "verification_url": "https://smritisys.com/api/license/verify?document_id=123e4567-e89b-42d3-a456-426614174000",
    }


def test_certificate_fields_are_empty_without_a_verified_snapshot(monkeypatch):
    monkeypatch.setattr(settings, "LICENSE_AUTHORITY_URL", "https://smritisys.com")
    assert _license_certificate_fields(None) == {
        "license_id": None,
        "license_status": None,
        "entitlements": None,
        "verification_url": None,
    }
    assert _license_verification_url(None) is None
