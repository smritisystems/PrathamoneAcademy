# /**
#  * @file        test_crm_rbac_separation.py
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
#  * @created     2026-11-08
#  * @updated     2026-11-08
#  *
#  * @description Forensic integration test suite verifying strict RBAC separation between CRM Lead operations and formal Student Admission conversion authorization.
#  */

import uuid
from datetime import datetime, timezone
import pytest
from sqlalchemy import select

from app.core.security import get_password_hash
from app.models.user import User, Role, Permission
from app.models.crm import Lead
from app.models.student import Student

pytestmark = pytest.mark.asyncio


async def create_user_with_custom_permissions(db, role_name: str, institution_id: int, permissions: list[tuple[str, str]]):
    """Creates an isolated user with explicit direct permissions."""
    role_res = await db.execute(select(Role).where(Role.name == role_name))
    role_obj = role_res.scalar_one_or_none()
    if not role_obj:
        role_obj = Role(name=role_name, description=f"{role_name} test role")
        db.add(role_obj)
        await db.flush()

    uid = uuid.uuid4().hex[:8]
    user = User(
        username=f"{role_name}_{uid}",
        email=f"{role_name}_{uid}@test.edu.in",
        hashed_password=get_password_hash("TestPassword123!"),
        first_name="Test",
        last_name=role_name.capitalize(),
        role=role_name,
        role_id=role_obj.id,
        institution_id=institution_id,
        is_active=True,
    )
    db.add(user)
    await db.flush()

    for res, act in permissions:
        perm = Permission(user_id=user.id, resource=res, action=act)
        db.add(perm)

    await db.commit()
    await db.refresh(user)
    return user


async def get_headers_for_user(client, user, password="TestPassword123!"):
    resp = await client.post(
        "/api/v1/auth/login",
        data={"username": user.username, "password": password},
    )
    assert resp.status_code == 200, f"Login failed for {user.username}: {resp.text}"
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


# ─── TEST ROLE A: COUNSELLOR (CRM PERMISSIONS WITHOUT STUDENTS:ADMISSION) ──────

async def test_counsellor_can_perform_crm_operations_but_cannot_convert_admission(client, db, test_institution):
    """
    Role A: Counsellor with CRM permissions but without 'students:admission':
    - Can open CRM (list, kanban, metrics, dossier).
    - Can create and edit leads.
    - Can schedule follow-ups and demo classes.
    - Can record communications.
    - Can update pipeline stages.
    - CANNOT convert a lead into a student (strictly rejected with HTTP 403 Forbidden).
    """
    counsellor = await create_user_with_custom_permissions(
        db,
        role_name="staff",
        institution_id=test_institution.id,
        permissions=[
            ("leads", "read"),
            ("leads", "create"),
            ("leads", "update"),
            ("leads", "assign"),
            ("leads", "followup"),
            ("leads", "communicate"),
            ("leads", "manage_pipeline"),
            ("leads", "reports"),
            # NOTE: Explicitly NO 'students:admission' or 'admissions:create'
        ],
    )
    headers = await get_headers_for_user(client, counsellor)

    # 1. Can open CRM metrics
    resp_metrics = await client.get("/api/v1/leads/metrics/summary", headers=headers)
    assert resp_metrics.status_code == 200

    # 2. Can create a new lead
    create_payload = {
        "student_name": "Nikhil Deshpande",
        "parent_name": "Ramesh Deshpande",
        "mobile": "9812349911",
        "email": "nikhil.d@test.edu.in",
        "class_name": "Std. 10",
        "board_name": "CBSE",
        "interested_course": "Foundation Batch",
        "source": "Walk-in",
        "priority": "hot",
    }
    resp_create = await client.post("/api/v1/leads", json=create_payload, headers=headers)
    assert resp_create.status_code in (200, 201)
    lead_data = resp_create.json()
    lead_id = lead_data["id"]

    # 3. Can update pipeline stage
    resp_stage = await client.patch(
        f"/api/v1/leads/{lead_id}/stage",
        json={"stage": "counselling_demo", "reason": "Parent attended counselling"},
        headers=headers,
    )
    assert resp_stage.status_code == 200
    assert resp_stage.json()["stage"] == "counselling_demo"

    # 4. Can schedule a follow-up
    resp_followup = await client.post(
        f"/api/v1/leads/{lead_id}/follow-ups",
        json={
            "follow_up_type": "call",
            "scheduled_at": datetime.now(timezone.utc).isoformat(),
            "notes": "Discuss test schedule with student",
        },
        headers=headers,
    )
    assert resp_followup.status_code == 200
    assert resp_followup.json()["success"] is True

    # 5. Can record communication log
    resp_comm = await client.post(
        f"/api/v1/leads/{lead_id}/communications",
        json={
            "channel": "whatsapp",
            "content": "Follow-up message sent regarding counselling",
            "subject": "Counselling follow-up",
        },
        headers=headers,
    )
    assert resp_comm.status_code == 200
    assert resp_comm.json()["success"] is True

    # 6. CANNOT convert lead into student admission (Strict 403 Forbidden check)
    resp_convert = await client.post(
        f"/api/v1/leads/{lead_id}/convert",
        json={"confirm_duplicate": True},
        headers=headers,
    )
    assert resp_convert.status_code == 403
    assert "Admission conversion requires separate Student Admission authorization" in resp_convert.json()["detail"]


# ─── TEST ROLE B: ADMISSION OFFICER (CONVERT LEADS WITH REQUIRED PERMISSIONS) ─

async def test_admission_officer_can_convert_leads_to_admission(client, db, test_institution):
    """
    Role B: Admission Officer with 'students:admission' and CRM access:
    - Can access CRM.
    - Can successfully convert prospect enquiry into a formal student admission.
    """
    admission_officer = await create_user_with_custom_permissions(
        db,
        role_name="staff",
        institution_id=test_institution.id,
        permissions=[
            ("leads", "read"),
            ("leads", "create"),
            ("leads", "update"),
            ("students", "admission"),  # Independent Student Admission Privilege
        ],
    )
    headers = await get_headers_for_user(client, admission_officer)

    # 1. Create a lead to convert
    lead_payload = {
        "student_name": "Pooja Hegde",
        "parent_name": "Suresh Hegde",
        "mobile": "9820011223",
        "email": "pooja.hegde@test.edu.in",
        "class_name": "Std. 10",
        "board_name": "CBSE",
        "interested_course": "Science Stream",
        "source": "Website",
        "priority": "hot",
    }
    resp_create = await client.post("/api/v1/leads", json=lead_payload, headers=headers)
    assert resp_create.status_code in (200, 201)
    lead_id = resp_create.json()["id"]

    # 2. Convert to admission (must succeed)
    resp_convert = await client.post(
        f"/api/v1/leads/{lead_id}/convert",
        json={"confirm_duplicate": True},
        headers=headers,
    )
    assert resp_convert.status_code == 200
    res_data = resp_convert.json()
    assert res_data["success"] is True
    assert res_data["student_id"] is not None
    assert res_data["admission_number"] is not None

    # Verify student is in database
    student_res = await db.execute(select(Student).where(Student.id == res_data["student_id"]))
    student = student_res.scalar_one_or_none()
    assert student is not None
    assert student.first_name == "Pooja"
    assert student.last_name == "Hegde"


# ─── TEST ROLE C: ADMINISTRATOR FULL ACCESS ───────────────────────────────────

async def test_administrator_full_crm_and_admission_governance(client, db, test_institution):
    """
    Role C: Administrator:
    - Full CRM and admission management authority.
    """
    admin_user = await create_user_with_custom_permissions(
        db,
        role_name="admin",
        institution_id=test_institution.id,
        permissions=[("*", "*")],
    )
    headers = await get_headers_for_user(client, admin_user)

    resp_create = await client.post(
        "/api/v1/leads",
        json={"student_name": "Aditi Rao", "mobile": "9811122233"},
        headers=headers,
    )
    assert resp_create.status_code in (200, 201)
    lead_id = resp_create.json()["id"]

    resp_convert = await client.post(
        f"/api/v1/leads/{lead_id}/convert",
        json={"confirm_duplicate": True},
        headers=headers,
    )
    assert resp_convert.status_code == 200
    assert resp_convert.json()["success"] is True


# ─── TEST ROLE D: UNAUTHORIZED USER ───────────────────────────────────────────

async def test_unauthorized_user_cannot_access_crm_or_perform_operations(client, db, test_institution):
    """
    Role D: Unauthorized User (e.g. Student account without CRM permissions):
    - Completely rejected from CRM endpoints (HTTP 403).
    """
    student_user = await create_user_with_custom_permissions(
        db,
        role_name="student",
        institution_id=test_institution.id,
        permissions=[],
    )
    headers = await get_headers_for_user(client, student_user)

    # Cannot read CRM
    resp_get = await client.get("/api/v1/leads", headers=headers)
    assert resp_get.status_code == 403

    # Cannot create lead
    resp_post = await client.post(
        "/api/v1/leads",
        json={"student_name": "Unauthorized Lead", "mobile": "9999988888"},
        headers=headers,
    )
    assert resp_post.status_code == 403
