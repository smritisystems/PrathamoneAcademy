# /**
#  * @file        test_user_management.py
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
#  * @description Pytest suite testing user account management, role assignments, and permission boundaries.
#  */

import pytest
import secrets
from httpx import AsyncClient
from sqlalchemy import select
from app.models.user import User, AuditLog
from app.models.student import Student


@pytest.mark.asyncio
async def test_get_user_stats(client: AsyncClient, auth_headers: dict, admin_user):
    res = await client.get("/api/v1/users/stats", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert "total_accounts" in data
    assert "active_accounts" in data
    assert "inactive_accounts" in data
    assert "pending_invitations" in data
    assert "roles_breakdown" in data
    assert data["total_accounts"] >= 1
    assert data["active_accounts"] >= 1


@pytest.mark.asyncio
async def test_list_users_search_and_filters(client: AsyncClient, auth_headers: dict, admin_user, test_student: Student, db):
    # Create a user linked to test_student
    st_user = User(
        username=f"stu_user_{test_student.id}",
        email=f"stu_user_{test_student.id}@test.com",
        first_name="StudentFirst",
        last_name="StudentLast",
        role="student",
        student_id=test_student.id,
        hashed_password="hashedpassword",
        is_active=True,
    )
    db.add(st_user)

    # Create a teacher user
    tch_user = User(
        username=f"tch_user_{test_student.id}",
        email=f"tch_user_{test_student.id}@test.com",
        first_name="Prof",
        last_name="Kapoor",
        staff_code="TCH-999",
        designation="Physics Master",
        role="teacher",
        hashed_password="hashedpassword",
        is_active=False,
    )
    db.add(tch_user)
    await db.commit()

    # 1. Search by student admission number
    search_res = await client.get(
        f"/api/v1/users/?search={test_student.admission_number}",
        headers=auth_headers,
    )
    assert search_res.status_code == 200
    items = search_res.json()["items"]
    assert len(items) >= 1
    matched = next((u for u in items if u["id"] == st_user.id), None)
    assert matched is not None
    assert matched["linked_person"]["type"] == "student"
    assert matched["linked_person"]["identifier"] == test_student.admission_number

    # 2. Search by staff code
    tch_res = await client.get("/api/v1/users/?search=TCH-999", headers=auth_headers)
    assert tch_res.status_code == 200
    tch_items = tch_res.json()["items"]
    assert len(tch_items) >= 1
    assert tch_items[0]["staff_code"] == "TCH-999"

    # 3. Filter by role
    role_res = await client.get("/api/v1/users/?role=teacher", headers=auth_headers)
    assert role_res.status_code == 200
    for u in role_res.json()["items"]:
        assert u["role"] == "teacher"

    # 4. Filter by status (inactive)
    inact_res = await client.get("/api/v1/users/?status=inactive", headers=auth_headers)
    assert inact_res.status_code == 200
    for u in inact_res.json()["items"]:
        assert u["is_active"] is False


@pytest.mark.asyncio
async def test_get_user_profile_workspace(client: AsyncClient, auth_headers: dict, admin_user, test_student: Student, db):
    # Create student user
    stu_user = User(
        username=f"profile_stu_{test_student.id}",
        email=f"profile_stu_{test_student.id}@test.com",
        first_name="Aarav",
        last_name="Student",
        role="student",
        student_id=test_student.id,
        hashed_password="hashedpassword",
        is_active=True,
    )
    db.add(stu_user)

    # Create teacher user
    tch_user = User(
        username=f"profile_tch_{test_student.id}",
        email=f"profile_tch_{test_student.id}@test.com",
        first_name="Meera",
        last_name="Nair",
        staff_code="TCH-NAIR",
        designation="Senior Chemistry Lecturer",
        role="teacher",
        hashed_password="hashedpassword",
        is_active=True,
    )
    db.add(tch_user)
    await db.commit()

    # 1. Inspect Student Profile Workspace
    res_stu = await client.get(f"/api/v1/users/{stu_user.id}", headers=auth_headers)
    assert res_stu.status_code == 200
    data_stu = res_stu.json()
    assert data_stu["user"]["id"] == stu_user.id
    assert data_stu["linked_student"]["admission_number"] == test_student.admission_number
    # Check permitted tabs
    assert "fees" in data_stu["permitted_tabs"]
    assert "attendance" in data_stu["permitted_tabs"]
    assert "examinations" in data_stu["permitted_tabs"]
    assert "academic" in data_stu["permitted_tabs"]

    # 2. Inspect Teacher Profile Workspace
    res_tch = await client.get(f"/api/v1/users/{tch_user.id}", headers=auth_headers)
    assert res_tch.status_code == 200
    data_tch = res_tch.json()
    assert data_tch["user"]["staff_code"] == "TCH-NAIR"
    assert data_tch["user"]["designation"] == "Senior Chemistry Lecturer"
    # Teacher should NOT have fees or exam marks tab
    assert "fees" not in data_tch["permitted_tabs"]
    assert "examinations" not in data_tch["permitted_tabs"]
    assert "academic" in data_tch["permitted_tabs"]
    assert "activity" in data_tch["permitted_tabs"]


@pytest.mark.asyncio
async def test_user_crud_actions_and_audit_logging(client: AsyncClient, auth_headers: dict, admin_user, db):
    # 1. Create User
    new_username = f"user_crud_{secrets.token_hex(4)}"
    create_payload = {
        "username": new_username,
        "email": f"{new_username}@test.com",
        "first_name": "Sanjay",
        "last_name": "Joshi",
        "phone": "9876543210",
        "role": "counselor",
        "staff_code": "STF-JOSHI",
        "designation": "Career Counselor",
        "send_invitation": True,
    }
    create_res = await client.post("/api/v1/users/", json=create_payload, headers=auth_headers)
    assert create_res.status_code == 201
    created_id = create_res.json()["id"]
    assert create_res.json()["invitation_status"] == "pending"

    # Verify audit log exists
    audit_create = (
        await db.execute(
            select(AuditLog).where(AuditLog.resource_type == "user", AuditLog.resource_id == created_id, AuditLog.action == "create_user")
        )
    ).scalar_one_or_none()
    assert audit_create is not None

    # 2. Update Profile
    update_res = await client.put(
        f"/api/v1/users/{created_id}",
        json={"first_name": "Sanjay Updated", "designation": "Senior Counselor"},
        headers=auth_headers,
    )
    assert update_res.status_code == 200

    u_after = (await db.execute(select(User).where(User.id == created_id))).scalar_one_or_none()
    assert u_after.first_name == "Sanjay Updated"
    assert u_after.designation == "Senior Counselor"

    # 3. Reset Password
    reset_res = await client.post(
        f"/api/v1/users/{created_id}/reset-password",
        json={"new_password": "NewSecurePassword123!"},
        headers=auth_headers,
    )
    assert reset_res.status_code == 200
    assert reset_res.json()["success"] is True

    # 4. Toggle Status (Deactivate / Reactivate)
    toggle_res = await client.post(f"/api/v1/users/{created_id}/toggle-status", headers=auth_headers)
    assert toggle_res.status_code == 200
    assert toggle_res.json()["is_active"] is False

    # Prevent self-deactivation
    self_res = await client.post(f"/api/v1/users/{admin_user.id}/toggle-status", headers=auth_headers)
    assert self_res.status_code == 400
    assert "cannot deactivate your own" in self_res.json()["detail"].lower()

    # 5. Resend Invitation
    invite_res = await client.post(f"/api/v1/users/{created_id}/resend-invitation", headers=auth_headers)
    assert invite_res.status_code == 200
    assert invite_res.json()["success"] is True

    # 6. Delete User with confirmation protection
    # Cannot delete self
    del_self = await client.delete(f"/api/v1/users/{admin_user.id}", headers=auth_headers)
    assert del_self.status_code == 400

    # Permanent delete target user
    del_res = await client.delete(f"/api/v1/users/{created_id}?permanent=true", headers=auth_headers)
    assert del_res.status_code == 200

    u_deleted = (await db.execute(select(User).where(User.id == created_id))).scalar_one_or_none()
    assert u_deleted is None
