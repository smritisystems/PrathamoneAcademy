# /**
#  * @file        test_communication.py
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
#  * @created     2026-11-05
#  * @updated     2026-11-05
#  *
#  * @description Test suite for Communication Center, templates CRUD, expiring shared links, dispatch adapters, and delivery logs.
#  */

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.institution import Institution
from app.models.user import User, Role
from app.models.student import Student
from app.models.communication import MessageTemplate, CommunicationLog, SharedDocumentToken
from app.core.security import create_access_token, get_password_hash


@pytest.fixture
async def admin_user(db: AsyncSession, test_institution: Institution):
    import random
    suffix = random.randint(100000, 999999)
    admin_role = (await db.execute(select(Role).where(Role.name == "admin"))).scalar_one_or_none()
    if not admin_role:
        admin_role = Role(name="admin", description="Administrator")
        db.add(admin_role)
        await db.flush()

    user = User(
        institution_id=test_institution.id,
        username=f"test_comm_admin_{suffix}",
        email=f"test_comm_admin_{suffix}@prashantacademy.edu.in",
        hashed_password=get_password_hash("Admin@2026!"),
        first_name="Communication",
        last_name="Manager",
        role="admin",
        role_id=admin_role.id,
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@pytest.mark.asyncio
async def test_message_templates_lifecycle(client: AsyncClient, admin_user: User, test_institution: Institution):
    token = create_access_token({"sub": str(admin_user.id), "institution_id": test_institution.id})
    headers = {"Authorization": f"Bearer {token}"}

    # 1. List templates
    list_res = await client.get("/api/v1/communication/templates", headers=headers)
    assert list_res.status_code == 200
    templates = list_res.json()
    assert isinstance(templates, list)

    # 2. Create custom template
    new_template = {
        "name": "Custom Fee Receipt Follow-up",
        "code": "CUSTOM_RECEIPT_FOLLOWUP",
        "category": "PAYMENT_RECEIPT",
        "channel": "WHATSAPP",
        "subject": "Follow-up",
        "body": "Hello {parent_name}, thank you for paying {amount} for {student_name}.",
        "variables": ["parent_name", "student_name", "amount"],
        "is_active": True,
    }
    create_res = await client.post("/api/v1/communication/templates", headers=headers, json=new_template)
    assert create_res.status_code == 201
    created_id = create_res.json()["template"]["id"]

    # 3. Update template
    update_res = await client.put(
        f"/api/v1/communication/templates/{created_id}",
        headers=headers,
        json={"body": "Hello {parent_name}, we appreciate your payment of {amount} for {student_name}."},
    )
    assert update_res.status_code == 200

    # 4. Delete template
    del_res = await client.delete(f"/api/v1/communication/templates/{created_id}", headers=headers)
    assert del_res.status_code == 200


@pytest.mark.asyncio
async def test_document_share_token_generation_and_resolution(
    client: AsyncClient, admin_user: User, test_institution: Institution
):
    token = create_access_token({"sub": str(admin_user.id), "institution_id": test_institution.id})
    headers = {"Authorization": f"Bearer {token}"}

    # Generate share link
    share_payload = {
        "document_type": "RECEIPT",
        "record_id": 167,
        "recipient_name": "Puneeta Kulkarni",
        "recipient_phone": "+91 98765 43210",
        "expires_in_hours": 72,
    }
    share_res = await client.post("/api/v1/communication/share-document", headers=headers, json=share_payload)
    assert share_res.status_code == 200
    data = share_res.json()
    assert "token" in data
    assert "share_url" in data
    assert "whatsapp_share_url" in data
    doc_token = data["token"]

    # Resolve token publicly
    resolve_res = await client.get(f"/api/v1/communication/shared-doc/{doc_token}")
    assert resolve_res.status_code == 200
    resolve_data = resolve_res.json()
    assert resolve_data["status"] == "valid"
    assert resolve_data["document_type"] == "RECEIPT"
    assert resolve_data["record_id"] == 167
    assert resolve_data["view_count"] == 1


@pytest.mark.asyncio
async def test_send_communication_messages_and_logs(
    client: AsyncClient, admin_user: User, test_institution: Institution
):
    token = create_access_token({"sub": str(admin_user.id), "institution_id": test_institution.id})
    headers = {"Authorization": f"Bearer {token}"}

    # Dispatch messages
    send_payload = {
        "channel": "ALL",
        "template_code": "PAYMENT_RECEIPT",
        "subject": "Receipt Confirmation for {student_name}",
        "message": "Dear {parent_name}, received payment for {student_name}. Thank you, {institute_name}.",
        "recipients": [
            {
                "recipient_type": "PARENT",
                "name": "Kulkarni Parent",
                "destination": "+91 98765 43210",
                "variables": {"student_name": "Puneeta Kulkarni", "amount": "7,000"},
            }
        ],
    }
    send_res = await client.post("/api/v1/communication/send", headers=headers, json=send_payload)
    assert send_res.status_code == 200
    res_data = send_res.json()
    assert res_data["status"] == "success"
    assert res_data["dispatched_count"] >= 1
    assert len(res_data["whatsapp_links"]) >= 1

    # Check delivery logs
    logs_res = await client.get("/api/v1/communication/logs?limit=10", headers=headers)
    assert logs_res.status_code == 200
    logs_data = logs_res.json()
    assert "items" in logs_data
    assert logs_data["total"] >= 1
    first_log_id = logs_data["items"][0]["id"]

    # Retry log
    retry_res = await client.post(f"/api/v1/communication/logs/{first_log_id}/retry", headers=headers)
    assert retry_res.status_code == 200
    assert retry_res.json()["status"] == "success"


@pytest.mark.asyncio
async def test_diagnostics_endpoints(client: AsyncClient, admin_user: User, test_institution: Institution):
    token = create_access_token({"sub": str(admin_user.id), "institution_id": test_institution.id})
    headers = {"Authorization": f"Bearer {token}"}

    # Get diagnostics overview
    diag_res = await client.get("/api/v1/communication/diagnostics", headers=headers)
    assert diag_res.status_code == 200
    diag_data = diag_res.json()
    assert "channels" in diag_data
    assert "whatsapp" in diag_data["channels"]
    assert "email" in diag_data["channels"]
    assert "sms" in diag_data["channels"]

    # Test test dispatch
    test_res = await client.post(
        "/api/v1/communication/diagnostics/test",
        headers=headers,
        json={"channel": "WHATSAPP", "destination": "+91 98765 43210", "message": "Test ping"},
    )
    assert test_res.status_code == 200
    assert test_res.json()["status"] == "success"

@pytest.mark.asyncio
async def test_search_communication_recipients(client: AsyncClient, admin_user: User, test_institution: Institution):
    token = create_access_token({"sub": str(admin_user.id), "institution_id": test_institution.id})
    headers = {"Authorization": f"Bearer {token}"}

    for target in ["ALL", "STUDENT", "PARENT", "STAFF", "BATCH"]:
        res = await client.get(f"/api/v1/communication/recipients/search?query=&target_type={target}", headers=headers)
        assert res.status_code == 200
        items = res.json()
        assert isinstance(items, list)

