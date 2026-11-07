# /**
#  * @file        test_staff_mutation_security.py
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
#  * @description Backend security test suite for staff mutation endpoints (addresses, bank accounts, key contacts) verifying Rule 010, authentication (401), role authorization (403), and audit log creation.
#  */

import uuid
import pytest
from sqlalchemy import select

from app.core.security import get_password_hash
from app.models.user import User, Role, AuditLog
from app.models.staff import StaffProfile

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
    assert resp.status_code == 200
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


async def test_staff_mutation_unauthenticated_returns_401(client, db, test_institution):
    """Verifies that unauthenticated callers are rejected with 401 across all mutation routes."""
    inst_id = test_institution.id
    target_user = await create_user_with_role(db, "teacher", inst_id)

    # 1. Address mutations without auth
    res_add_addr = await client.post(
        f"/api/v1/staff/{target_user.id}/addresses",
        json={"address_line": "123 Main St", "city": "Pune", "state": "MH", "pincode": "411001"},
    )
    assert res_add_addr.status_code == 401

    res_del_addr = await client.delete(f"/api/v1/staff/{target_user.id}/addresses/999")
    assert res_del_addr.status_code == 401

    # 2. Bank account mutations without auth
    res_add_bank = await client.post(
        f"/api/v1/staff/{target_user.id}/bank-accounts",
        json={"account_holder_name": "Test", "bank_name": "HDFC", "account_number": "1234567890", "ifsc_code": "HDFC0001234"},
    )
    assert res_add_bank.status_code == 401

    res_del_bank = await client.delete(f"/api/v1/staff/{target_user.id}/bank-accounts/999")
    assert res_del_bank.status_code == 401

    # 3. Key contact mutations without auth
    res_add_contact = await client.post(
        f"/api/v1/staff/{target_user.id}/key-contacts",
        json={"contact_name": "Emergency Person", "relationship": "Spouse", "phone_primary": "9822012345"},
    )
    assert res_add_contact.status_code == 401

    res_del_contact = await client.delete(f"/api/v1/staff/{target_user.id}/key-contacts/999")
    assert res_del_contact.status_code == 401


async def test_staff_mutation_unauthorized_role_returns_403(client, db, test_institution):
    """Verifies that non-admin roles (e.g., student, teacher) are rejected with 403 Forbidden."""
    inst_id = test_institution.id
    teacher = await create_user_with_role(db, "teacher", inst_id)
    student = await create_user_with_role(db, "student", inst_id)

    # Setup profile for teacher
    profile = StaffProfile(
        user_id=teacher.id,
        institution_id=inst_id,
        employee_id="TCH-SEC-01",
        staff_type="Teacher",
        department="Science",
        status="active",
    )
    db.add(profile)
    await db.commit()

    teacher_headers = await get_headers_for_user(client, teacher)
    student_headers = await get_headers_for_user(client, student)

    for headers in [teacher_headers, student_headers]:
        # Address add
        r = await client.post(
            f"/api/v1/staff/{teacher.id}/addresses",
            json={"address_line": "456 Side Rd", "city": "Mumbai", "state": "MH", "pincode": "400001"},
            headers=headers,
        )
        assert r.status_code == 403, f"Expected 403 for address add, got {r.status_code}"

        # Address delete
        r = await client.delete(f"/api/v1/staff/{teacher.id}/addresses/1", headers=headers)
        assert r.status_code == 403, f"Expected 403 for address delete, got {r.status_code}"

        # Bank add
        r = await client.post(
            f"/api/v1/staff/{teacher.id}/bank-accounts",
            json={"account_holder_name": "Test", "bank_name": "SBI", "account_number": "98765432101", "ifsc_code": "SBIN0001234"},
            headers=headers,
        )
        assert r.status_code == 403, f"Expected 403 for bank add, got {r.status_code}"

        # Bank delete
        r = await client.delete(f"/api/v1/staff/{teacher.id}/bank-accounts/1", headers=headers)
        assert r.status_code == 403, f"Expected 403 for bank delete, got {r.status_code}"

        # Key contact add
        r = await client.post(
            f"/api/v1/staff/{teacher.id}/key-contacts",
            json={"contact_name": "Father", "relationship": "Father", "phone_primary": "9876500000"},
            headers=headers,
        )
        assert r.status_code == 403, f"Expected 403 for contact add, got {r.status_code}"

        # Key contact delete
        r = await client.delete(f"/api/v1/staff/{teacher.id}/key-contacts/1", headers=headers)
        assert r.status_code == 403, f"Expected 403 for contact delete, got {r.status_code}"


async def test_staff_address_mutation_authorized_admin_and_audit_log(client, db, test_institution):
    """Verifies that an authorized admin can create, set primary, and delete addresses, recording AuditLog entries."""
    inst_id = test_institution.id
    admin = await create_user_with_role(db, "admin", inst_id)
    admin_headers = await get_headers_for_user(client, admin)

    target_teacher = await create_user_with_role(db, "teacher", inst_id)
    profile = StaffProfile(
        user_id=target_teacher.id,
        institution_id=inst_id,
        employee_id="TCH-ADDR-01",
        staff_type="Teacher",
        department="English",
        status="active",
    )
    db.add(profile)
    await db.commit()

    # 1. Add Address
    addr_payload = {
        "address_type": "current",
        "address_line": "Flat 402, Sunshine Heights",
        "city": "Pune",
        "state": "Maharashtra",
        "pincode": "411038",
        "is_primary": True,
    }
    create_res = await client.post(
        f"/api/v1/staff/{target_teacher.id}/addresses",
        json=addr_payload,
        headers=admin_headers,
    )
    assert create_res.status_code in [200, 201]
    created_addr = create_res.json()
    addr_id = created_addr["id"]

    # Verify AuditLog for CREATE
    audit_create = (
        await db.execute(
            select(AuditLog).where(
                AuditLog.resource_type == "staff_address",
                AuditLog.action == "CREATE",
                AuditLog.resource_id == target_teacher.id,
            )
        )
    ).scalar_one_or_none()
    assert audit_create is not None
    assert audit_create.user_id == admin.id

    # 2. Add Second Address and Set as Primary
    addr2_payload = {
        "address_type": "permanent",
        "address_line": "House 10, Civil Lines",
        "city": "Nagpur",
        "state": "Maharashtra",
        "pincode": "440001",
        "is_primary": False,
    }
    res2 = await client.post(
        f"/api/v1/staff/{target_teacher.id}/addresses",
        json=addr2_payload,
        headers=admin_headers,
    )
    assert res2.status_code in [200, 201]
    addr2_id = res2.json()["id"]

    set_primary_res = await client.put(
        f"/api/v1/staff/{target_teacher.id}/addresses/{addr2_id}/set-primary",
        headers=admin_headers,
    )
    assert set_primary_res.status_code == 200

    # Verify AuditLog for UPDATE
    audit_update = (
        await db.execute(
            select(AuditLog).where(
                AuditLog.resource_type == "staff_address",
                AuditLog.action == "UPDATE",
                AuditLog.resource_id == target_teacher.id,
            )
        )
    ).scalar_one_or_none()
    assert audit_update is not None
    assert audit_update.user_id == admin.id

    # 3. Delete First Address
    del_res = await client.delete(
        f"/api/v1/staff/{target_teacher.id}/addresses/{addr_id}",
        headers=admin_headers,
    )
    assert del_res.status_code == 200

    # Verify AuditLog for DELETE
    audit_del = (
        await db.execute(
            select(AuditLog).where(
                AuditLog.resource_type == "staff_address",
                AuditLog.action == "DELETE",
                AuditLog.resource_id == target_teacher.id,
            )
        )
    ).scalar_one_or_none()
    assert audit_del is not None
    assert audit_del.user_id == admin.id


async def test_staff_bank_account_mutation_authorized_admin_and_audit_log(client, db, test_institution):
    """Verifies that an authorized admin can create, set primary, and delete bank accounts, recording AuditLog entries."""
    inst_id = test_institution.id
    admin = await create_user_with_role(db, "admin", inst_id)
    admin_headers = await get_headers_for_user(client, admin)

    target_teacher = await create_user_with_role(db, "teacher", inst_id)
    profile = StaffProfile(
        user_id=target_teacher.id,
        institution_id=inst_id,
        employee_id="TCH-BANK-01",
        staff_type="Teacher",
        department="Physics",
        status="active",
    )
    db.add(profile)
    await db.commit()

    # 1. Add Bank Account
    bank_payload = {
        "account_holder_name": "Ramesh Kulkarni",
        "bank_name": "State Bank of India",
        "account_number": "123456789012",
        "ifsc_code": "SBIN0001234",
        "branch_name": "Kothrud",
        "account_type": "savings",
        "is_primary": True,
    }
    create_res = await client.post(
        f"/api/v1/staff/{target_teacher.id}/bank-accounts",
        json=bank_payload,
        headers=admin_headers,
    )
    assert create_res.status_code in [200, 201]
    acc_id = create_res.json()["id"]

    # Verify AuditLog for CREATE
    audit_create = (
        await db.execute(
            select(AuditLog).where(
                AuditLog.resource_type == "staff_bank_account",
                AuditLog.action == "CREATE",
                AuditLog.resource_id == target_teacher.id,
            )
        )
    ).scalar_one_or_none()
    assert audit_create is not None
    assert audit_create.user_id == admin.id

    # 2. Add Second Bank Account and Set as Primary
    bank2_payload = {
        "account_holder_name": "Ramesh Kulkarni",
        "bank_name": "HDFC Bank",
        "account_number": "987654321098",
        "ifsc_code": "HDFC0005678",
        "branch_name": "Shivaji Nagar",
        "account_type": "salary",
        "is_primary": False,
    }
    res2 = await client.post(
        f"/api/v1/staff/{target_teacher.id}/bank-accounts",
        json=bank2_payload,
        headers=admin_headers,
    )
    assert res2.status_code in [200, 201]
    acc2_id = res2.json()["id"]

    set_primary_res = await client.put(
        f"/api/v1/staff/{target_teacher.id}/bank-accounts/{acc2_id}/set-primary",
        headers=admin_headers,
    )
    assert set_primary_res.status_code == 200

    # Verify AuditLog for UPDATE
    audit_update = (
        await db.execute(
            select(AuditLog).where(
                AuditLog.resource_type == "staff_bank_account",
                AuditLog.action == "UPDATE",
                AuditLog.resource_id == target_teacher.id,
            )
        )
    ).scalar_one_or_none()
    assert audit_update is not None
    assert audit_update.user_id == admin.id

    # 3. Delete First Bank Account
    del_res = await client.delete(
        f"/api/v1/staff/{target_teacher.id}/bank-accounts/{acc_id}",
        headers=admin_headers,
    )
    assert del_res.status_code == 200

    # Verify AuditLog for DELETE
    audit_del = (
        await db.execute(
            select(AuditLog).where(
                AuditLog.resource_type == "staff_bank_account",
                AuditLog.action == "DELETE",
                AuditLog.resource_id == target_teacher.id,
            )
        )
    ).scalar_one_or_none()
    assert audit_del is not None
    assert audit_del.user_id == admin.id


async def test_staff_key_contact_mutation_authorized_admin_and_audit_log(client, db, test_institution):
    """Verifies that an authorized admin can create and delete key contacts, recording AuditLog entries."""
    inst_id = test_institution.id
    admin = await create_user_with_role(db, "admin", inst_id)
    admin_headers = await get_headers_for_user(client, admin)

    target_teacher = await create_user_with_role(db, "teacher", inst_id)
    profile = StaffProfile(
        user_id=target_teacher.id,
        institution_id=inst_id,
        employee_id="TCH-CONT-01",
        staff_type="Teacher",
        department="Chemistry",
        status="active",
    )
    db.add(profile)
    await db.commit()

    # 1. Add Key Contact
    contact_payload = {
        "contact_name": "Sunita Kulkarni",
        "relationship": "Spouse",
        "phone_primary": "9822012345",
        "email": "sunita@example.com",
        "is_primary_emergency": True,
    }
    create_res = await client.post(
        f"/api/v1/staff/{target_teacher.id}/key-contacts",
        json=contact_payload,
        headers=admin_headers,
    )
    assert create_res.status_code in [200, 201]
    contact_id = create_res.json()["id"]

    # Verify AuditLog for CREATE
    audit_create = (
        await db.execute(
            select(AuditLog).where(
                AuditLog.resource_type == "staff_key_contact",
                AuditLog.action == "CREATE",
                AuditLog.resource_id == target_teacher.id,
            )
        )
    ).scalar_one_or_none()
    assert audit_create is not None
    assert audit_create.user_id == admin.id

    # 2. Delete Key Contact
    del_res = await client.delete(
        f"/api/v1/staff/{target_teacher.id}/key-contacts/{contact_id}",
        headers=admin_headers,
    )
    assert del_res.status_code == 200

    # Verify AuditLog for DELETE
    audit_del = (
        await db.execute(
            select(AuditLog).where(
                AuditLog.resource_type == "staff_key_contact",
                AuditLog.action == "DELETE",
                AuditLog.resource_id == target_teacher.id,
            )
        )
    ).scalar_one_or_none()
    assert audit_del is not None
    assert audit_del.user_id == admin.id
