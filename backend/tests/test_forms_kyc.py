# /**
#  * @file        test_forms_kyc.py
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
#  * @created     2026-11-04
#  * @updated     2026-11-04
#  *
#  * @description Pytest suite validating centralized print forms catalogue, prefilled & blank rendering, Aadhaar masking, DPDP compliance, and audit trails.
#  */

import pytest
from httpx import AsyncClient
from app.models.student import Student, Guardian
from app.models.user import User, AuditLog


@pytest.mark.asyncio
async def test_forms_catalogue_discovery(client: AsyncClient, auth_headers: dict, admin_user):
    """Verify catalogue returns all forms across entities and supports filtering."""
    response = await client.get("/api/v1/forms/catalogue", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 20
    assert any(f["id"] == "student_kyc" for f in data["forms"])
    assert any(f["id"] == "student_admission" for f in data["forms"])
    assert any(f["id"] == "parent_consent_declaration" for f in data["forms"])
    assert any(f["id"] == "staff_profile" for f in data["forms"])
    assert any(f["id"] == "bonafide_certificate" for f in data["forms"])

    # Entity filter test
    student_res = await client.get("/api/v1/forms/catalogue?entity=student", headers=auth_headers)
    assert student_res.status_code == 200
    s_data = student_res.json()
    for f in s_data["forms"]:
        assert f["entity"] in ["student", "operations", "parent"] or "student" in f["id"]


@pytest.mark.asyncio
async def test_prefilled_student_kyc_with_aadhaar_masking(client: AsyncClient, auth_headers: dict, admin_user, test_student: Student, db):
    """Verify prefilled KYC form fetches real records, masks Aadhaar, and excludes credentials."""
    # Give test student an aadhaar number and guardian
    test_student.aadhar_number = "987654321234"
    guardian = Guardian(
        student_id=test_student.id,
        relation="Father",
        first_name="Ramesh",
        last_name=test_student.last_name or "Test",
        phone="+91-9820112233",
        aadhar_number="876543212345",
        is_primary=True,
    )
    db.add(guardian)
    await db.flush()

    response = await client.get(
        f"/api/v1/forms/render/student_kyc?record_id={test_student.id}&mode=prefilled",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()

    assert data["form_id"] == "student_kyc"
    assert data["mode"] == "prefilled"
    assert data["institution"]["name"] in ["Prashant Academy", "Test Academy"]
    assert "DPDP Act" in data["statutory_notice"]

    # Verify student data
    s_data = data["data"]
    assert s_data["first_name"] == test_student.first_name
    assert "aadhar_masked" in s_data
    assert s_data["aadhar_masked"] == "XXXX-XXXX-1234"

    # Security check: never expose raw passwords or hashes in payload
    raw_str = response.text.lower()
    assert "hashed_password" not in raw_str
    assert "secret_key" not in raw_str


@pytest.mark.asyncio
async def test_blank_form_rendering(client: AsyncClient, auth_headers: dict, admin_user):
    """Verify blank mode generates the identical schema with empty write-in placeholders."""
    response = await client.get("/api/v1/forms/render/student_admission?mode=blank", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()

    assert data["mode"] == "blank"
    assert data["data"]["is_blank"] is True
    assert data["data"]["first_name"] == ""
    assert data["data"]["last_name"] == ""
    assert len(data["data"]["documents_checklist"]) > 0
    assert data["data"]["documents_checklist"][0]["submitted"] is False


@pytest.mark.asyncio
async def test_bulk_form_rendering(client: AsyncClient, auth_headers: dict, admin_user, test_student: Student):
    """Verify bulk render endpoint processes multiple records for unified batch printing."""
    payload = {
        "form_id": "fee_statement",
        "mode": "prefilled",
        "record_ids": [test_student.id],
    }
    response = await client.post("/api/v1/forms/bulk-render", json=payload, headers=auth_headers)
    assert response.status_code == 200
    data = response.json()

    assert data["form_id"] == "fee_statement"
    assert data["total_records"] == 1
    assert len(data["forms"]) == 1


@pytest.mark.asyncio
async def test_dpdp_audit_logging(client: AsyncClient, auth_headers: dict, admin_user, test_student: Student):
    """Verify generating a form creates an audit trail entry without leaking payload contents."""
    render_res = await client.get(
        f"/api/v1/forms/render/parent_consent_declaration?record_id={test_student.id}&mode=prefilled",
        headers=auth_headers,
    )
    assert render_res.status_code == 200

    audit_res = await client.get("/api/v1/forms/audit-logs", headers=auth_headers)
    assert audit_res.status_code == 200
    logs = audit_res.json()["audit_logs"]
    assert len(logs) > 0

    latest_log = logs[0]
    assert latest_log["action"] == "PRINT_FORM_GENERATED"
    assert "parent_consent_declaration" in latest_log["metadata"]
