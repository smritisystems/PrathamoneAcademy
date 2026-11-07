# /**
#  * @file        test_lead_management_crm.py
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
#  * @created     2026-11-07
#  * @updated     2026-11-07
#  *
#  * @description Comprehensive integration test suite for Lead Management & CRM module verifying atomic sequential numbering, Kanban pipeline, follow-ups, demo classes, Lead Dossier, Lead-to-Admission conversion, and RBAC/Audit security.
#  */

import uuid
from datetime import datetime, timezone, timedelta
import pytest
from sqlalchemy import select

from app.core.security import get_password_hash
from app.models.user import User, Role, AuditLog
from app.models.crm import Lead, LeadFollowUp, LeadDemoClass
from app.models.academic_year import AcademicYear
from app.models.standard import Standard
from app.models.student import Student

pytestmark = pytest.mark.asyncio


async def create_user_with_role(db, role_name: str, institution_id: int):
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


async def test_crm_metrics_summary(client, auth_headers, test_institution):
    resp = await client.get("/api/v1/leads/metrics/summary", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "total_leads" in data
    assert "new_enquiries" in data
    assert "follow_ups_today" in data
    assert "overdue_follow_ups" in data
    assert "converted" in data
    assert "lost_leads" in data
    assert "conversion_rate" in data
    assert "pipeline_counts" in data


async def test_create_lead_and_sequential_numbering(client, auth_headers, test_institution):
    payload1 = {
        "student_name": "Rohan Deshmukh",
        "parent_name": "Suresh Deshmukh",
        "mobile": "9812345670",
        "email": "rohan.deshmukh@example.com",
        "class_name": "Std. 10",
        "board_name": "CBSE",
        "interested_course": "Foundation Batch",
        "source": "Walk-in",
        "priority": "hot",
    }
    resp1 = await client.post("/api/v1/leads", json=payload1, headers=auth_headers)
    assert resp1.status_code in (200, 201)
    lead1 = resp1.json()
    assert lead1["lead_number"].startswith("LD-")
    assert "Rohan" in lead1["first_name"]
    assert lead1["priority"] == "hot"

    payload2 = {
        "student_name": "Meera Joshi",
        "parent_name": "Sunil Joshi",
        "mobile": "9812345671",
        "email": "meera.joshi@example.com",
        "class_name": "Std. 9",
        "board_name": "ICSE",
        "interested_course": "Maths + Science",
        "source": "Website",
        "priority": "warm",
    }
    resp2 = await client.post("/api/v1/leads", json=payload2, headers=auth_headers)
    assert resp2.status_code in (200, 201)
    lead2 = resp2.json()
    assert lead2["lead_number"].startswith("LD-")
    # Verify sequential increment
    num1 = int(lead1["lead_number"].split("-")[1])
    num2 = int(lead2["lead_number"].split("-")[1])
    assert num2 > num1


async def test_get_leads_and_kanban(client, auth_headers, test_institution):
    # Test lead list with search
    resp = await client.get("/api/v1/leads?search=Rohan", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "items" in data
    assert "total" in data
    assert any("Rohan" in l["first_name"] for l in data["items"])

    # Test Kanban grouped view
    resp_kanban = await client.get("/api/v1/leads/kanban", headers=auth_headers)
    assert resp_kanban.status_code == 200
    kanban = resp_kanban.json()
    assert "columns" in kanban
    assert "new" in kanban
    assert "contacted" in kanban
    assert "counselling_demo" in kanban
    assert "interested" in kanban
    assert "admission_pending" in kanban
    assert "converted" in kanban
    assert any("Rohan" in l["first_name"] for l in kanban["new"])


async def test_lead_dossier_detail(client, auth_headers, test_institution):
    # Create a lead
    resp = await client.post(
        "/api/v1/leads",
        json={"student_name": "Ananya Kulkarni", "mobile": "9823456789"},
        headers=auth_headers,
    )
    assert resp.status_code in (200, 201)
    lead_id = resp.json()["id"]

    # Get dossier
    resp_dossier = await client.get(f"/api/v1/leads/{lead_id}", headers=auth_headers)
    assert resp_dossier.status_code == 200
    dossier = resp_dossier.json()
    assert dossier["lead"]["id"] == lead_id
    assert "follow_ups" in dossier
    assert "demo_classes" in dossier
    assert "matched_students" in dossier


async def test_update_stage_and_follow_up(client, auth_headers, test_institution):
    # Create lead
    resp = await client.post(
        "/api/v1/leads",
        json={"student_name": "Vikram Seth", "mobile": "9876543299"},
        headers=auth_headers,
    )
    assert resp.status_code in (200, 201)
    lead_id = resp.json()["id"]

    # Update stage to contacted
    resp_stage = await client.patch(
        f"/api/v1/leads/{lead_id}/stage",
        json={"new_stage": "contacted", "notes": "Called parent, discussed timings"},
        headers=auth_headers,
    )
    assert resp_stage.status_code == 200
    assert resp_stage.json()["stage"] == "contacted"

    # Add follow-up
    tomorrow = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
    resp_fu = await client.post(
        f"/api/v1/leads/{lead_id}/follow-ups",
        json={
            "follow_up_type": "call",
            "notes": "Parent interested, scheduled demo class",
            "next_follow_up_date": tomorrow,
            "outcome": "positive",
        },
        headers=auth_headers,
    )
    assert resp_fu.status_code == 200
    fu_data = resp_fu.json()
    assert fu_data["lead_id"] == lead_id
    assert fu_data["follow_up_type"] == "call"


async def test_schedule_demo_class(client, auth_headers, test_institution):
    resp = await client.post(
        "/api/v1/leads",
        json={"student_name": "Tanvi Rao", "mobile": "9867012345"},
        headers=auth_headers,
    )
    assert resp.status_code in (200, 201)
    lead_id = resp.json()["id"]

    demo_time = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()
    resp_demo = await client.post(
        f"/api/v1/leads/{lead_id}/demo-classes",
        json={
            "subject": "Physics - Ray Optics",
            "scheduled_at": demo_time,
            "mode": "offline",
            "counsellor_notes": "Trial class with Prof. Mehta",
        },
        headers=auth_headers,
    )
    assert resp_demo.status_code == 200
    demo_data = resp_demo.json()
    assert demo_data["lead_id"] == lead_id
    assert demo_data["subject"] == "Physics - Ray Optics"
    assert demo_data["status"] == "scheduled"


async def test_lead_to_admission_conversion(client, auth_headers, db, test_institution):
    # Create academic year and standard with institution_id
    ay = AcademicYear(
        name=f"AY-{uuid.uuid4().hex[:6]}",
        start_date=datetime.now(timezone.utc).date(),
        end_date=(datetime.now(timezone.utc) + timedelta(days=365)).date(),
        is_active=True,
        is_current=True,
        institution_id=test_institution.id,
    )
    db.add(ay)
    await db.flush()

    std = Standard(
        name="Standard 10",
        level=10,
        institution_id=test_institution.id,
    )
    db.add(std)
    await db.flush()

    await db.commit()

    # Create lead
    resp = await client.post(
        "/api/v1/leads",
        json={
            "student_name": "Gaurav More",
            "parent_name": "Prakash More",
            "mobile": "9833445566",
            "email": "gaurav.more@example.com",
            "class_name": "Standard 10",
            "standard_id": std.id,
            "academic_year_id": ay.id,
        },
        headers=auth_headers,
    )
    assert resp.status_code in (200, 201)
    lead_id = resp.json()["id"]

    # Convert lead to admission
    resp_conv = await client.post(
        f"/api/v1/leads/{lead_id}/convert",
        json={
            "academic_year_id": ay.id,
            "standard_id": std.id,
            "send_welcome_sms": False,
        },
        headers=auth_headers,
    )
    assert resp_conv.status_code == 200
    conv_data = resp_conv.json()
    assert conv_data["success"] is True
    assert conv_data["lead_id"] == lead_id
    assert conv_data["student_id"] is not None
    assert conv_data["admission_number"].startswith("PA-")

    # Verify student exists in db
    student_res = await db.execute(select(Student).where(Student.id == conv_data["student_id"]))
    student = student_res.scalar_one_or_none()
    assert student is not None
    assert student.first_name == "Gaurav"
    assert student.last_name == "More"
    assert student.phone == "9833445566"

    # Verify lead status updated
    lead_res = await db.execute(select(Lead).where(Lead.id == lead_id))
    lead = lead_res.scalar_one_or_none()
    assert lead.stage == "converted"
    assert lead.converted_student_id == student.id


async def test_crm_security_and_permissions(client, db, test_institution):
    # 1. Unauthenticated request must return 401
    resp_unauth = await client.post(
        "/api/v1/leads/",
        json={"student_name": "Unauthorized Lead", "mobile": "9999999999"},
    )
    assert resp_unauth.status_code == 401

    # 2. Student role must return 403 on mutations
    student_user = await create_user_with_role(db, "student", institution_id=test_institution.id)
    student_headers = await get_headers_for_user(client, student_user)

    resp_forbidden = await client.post(
        "/api/v1/leads/",
        json={"student_name": "Student Created Lead", "mobile": "9999999999"},
        headers=student_headers,
    )
    assert resp_forbidden.status_code == 403

    # 3. Admin mutation creates AuditLog entry
    admin_user = await create_user_with_role(db, "admin", institution_id=test_institution.id)
    admin_headers = await get_headers_for_user(client, admin_user)

    resp_admin = await client.post(
        "/api/v1/leads/",
        json={"student_name": "Audited Lead", "mobile": "9898989898"},
        headers=admin_headers,
    )
    assert resp_admin.status_code in (200, 201)
    created_lead_id = resp_admin.json()["id"]

    audit_res = await db.execute(
        select(AuditLog)
        .where(
            AuditLog.resource_id == created_lead_id,
        )
    )
    audit = audit_res.scalar_one_or_none()
    assert audit is not None
    assert audit.user_id == admin_user.id
