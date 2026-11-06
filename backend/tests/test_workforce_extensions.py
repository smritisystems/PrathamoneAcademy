# /**
#  * @file        test_workforce_extensions.py
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
#  * @description Pytest test suite for Workforce Extensions: Delete Protection, Multiple Bank Accounts, Key Contacts, Dual Addresses, and Employee Dossier.
#  */

import pytest
from datetime import date
from decimal import Decimal
from fastapi import HTTPException
from sqlalchemy import select

from app.models.user import User
from app.models.staff import (
    StaffProfile,
    StaffBankAccount,
    StaffKeyContact,
    TeacherAssignment,
)
from app.models.standard import Standard
from app.models.division import Division
from app.models.subject import Subject
from app.models.board import Board
from app.api.v1.endpoints.users import delete_user
from app.api.v1.endpoints.staff import (
    list_staff_bank_accounts,
    add_staff_bank_account,
    set_primary_bank_account,
    delete_staff_bank_account,
    list_staff_key_contacts,
    add_staff_key_contact,
    delete_staff_key_contact,
    StaffBankAccountCreateRequest,
    StaffKeyContactCreateRequest,
)
from app.services.form_renderer import FormRendererEngine


@pytest.mark.asyncio
async def test_delete_protection_prevents_hard_delete_when_dependencies_exist(
    db, test_institution, test_academic_year, admin_user
):
    """Verifies that permanent delete is blocked when active academic assignments exist."""
    # 1. Create a Teacher User & Profile
    teacher = User(
        institution_id=test_institution.id,
        username="teacher_protected_test",
        email="protected_teacher@prashantacademy.com",
        hashed_password="hashed_pwd_123",
        first_name="Anjali",
        last_name="Verma",
        role="teacher",
        staff_code="TCH-PROT-01",
        is_active=True,
    )
    db.add(teacher)
    await db.flush()

    profile = StaffProfile(
        user_id=teacher.id,
        institution_id=test_institution.id,
        employee_id="TCH-PROT-01",
        staff_type="teacher",
        department="Mathematics",
        status="active",
        joining_date=date.today(),
    )
    db.add(profile)

    # 2. Add an Academic Structure and Assignment
    board = Board(institution_id=test_institution.id, name="CBSE-PROT", code="CBSE-P")
    db.add(board)
    await db.flush()

    standard = Standard(institution_id=test_institution.id, name="Grade 10", level=10, is_active=True)
    db.add(standard)
    await db.flush()

    division = Division(standard_id=standard.id, board_id=board.id, name="Section A", is_active=True)
    db.add(division)
    await db.flush()

    subject = Subject(standard_id=standard.id, name="Mathematics", code="MATH-P", is_active=True)
    db.add(subject)
    await db.flush()

    assignment = TeacherAssignment(
        teacher_user_id=teacher.id,
        academic_year_id=test_academic_year.id,
        board_id=board.id,
        standard_id=standard.id,
        division_id=division.id,
        subject_id=subject.id,
        weekly_hours=5.0,
        is_active=True,
    )
    db.add(assignment)
    await db.commit()

    # 3. Attempt permanent deletion — Delete Protection MUST raise HTTPException 400
    with pytest.raises(HTTPException) as exc_info:
        await delete_user(
            user_id=teacher.id,
            permanent=True,
            db=db,
            current_user=admin_user,
        )

    assert exc_info.value.status_code == 400
    assert "Delete Protection Violation" in exc_info.value.detail
    assert "Subject/Batch Assignment" in exc_info.value.detail


@pytest.mark.asyncio
async def test_delete_protection_soft_deactivation_syncs_staff_status(
    db, test_institution, admin_user
):
    """Verifies that soft delete deactivates user and updates staff profile to inactive."""
    teacher = User(
        institution_id=test_institution.id,
        username="teacher_deactivate_test",
        email="deactivate_teacher@prashantacademy.com",
        hashed_password="hashed_pwd_123",
        first_name="Karan",
        last_name="Malhotra",
        role="teacher",
        staff_code="TCH-DEACT-01",
        is_active=True,
    )
    db.add(teacher)
    await db.flush()

    profile = StaffProfile(
        user_id=teacher.id,
        institution_id=test_institution.id,
        employee_id="TCH-DEACT-01",
        staff_type="teacher",
        department="Science",
        status="active",
        joining_date=date.today(),
    )
    db.add(profile)
    await db.commit()

    # Soft delete
    res = await delete_user(
        user_id=teacher.id,
        permanent=False,
        db=db,
        current_user=admin_user,
    )

    assert "deactivated" in res["message"]
    await db.refresh(teacher)
    await db.refresh(profile)

    assert teacher.is_active is False
    assert profile.status == "inactive"


@pytest.mark.asyncio
async def test_multiple_bank_accounts_and_ssot_sync(
    db, test_institution, admin_user
):
    """Verifies adding multiple bank accounts and promoting one to primary updates StaffProfile SSOT."""
    user = User(
        institution_id=test_institution.id,
        username="staff_bank_test",
        email="bank_test@prashantacademy.com",
        hashed_password="hashed_pwd_123",
        first_name="Sunil",
        last_name="Mehta",
        role="staff",
        is_active=True,
    )
    db.add(user)
    await db.flush()

    profile = StaffProfile(
        user_id=user.id,
        institution_id=test_institution.id,
        employee_id="STF-BANK-01",
        staff_type="admin",
        department="Operations",
        bank_name="Initial Bank",
        bank_account_number="1111111111",
        bank_ifsc="INIT0000001",
    )
    db.add(profile)
    await db.commit()

    # 1. Add Secondary Bank Account
    acc2_req = StaffBankAccountCreateRequest(
        account_holder_name="Sunil Mehta",
        bank_name="Axis Bank",
        account_number="2222222222",
        ifsc_code="UTIB0000222",
        account_type="reimbursement",
        is_primary=False,
    )
    add_res = await add_staff_bank_account(user.id, acc2_req, db, admin_user)
    assert add_res["success"] is True
    acc2_id = add_res["id"]

    # 2. Add Primary Salary Bank Account
    acc3_req = StaffBankAccountCreateRequest(
        account_holder_name="Sunil Mehta",
        bank_name="HDFC Bank",
        account_number="3333333333",
        ifsc_code="HDFC0000333",
        account_type="salary",
        is_primary=True,
    )
    add_res3 = await add_staff_bank_account(user.id, acc3_req, db, admin_user)
    acc3_id = add_res3["id"]

    # Verify StaffProfile SSOT synchronized to HDFC Bank
    await db.refresh(profile)
    assert profile.bank_name == "HDFC Bank"
    assert profile.bank_account_number == "3333333333"
    assert profile.bank_ifsc == "HDFC0000333"

    # 3. Promote Axis Bank to Primary
    set_res = await set_primary_bank_account(user.id, acc2_id, db, admin_user)
    assert set_res["success"] is True

    await db.refresh(profile)
    assert profile.bank_name == "Axis Bank"
    assert profile.bank_account_number == "2222222222"

    # 4. List Accounts
    accounts = await list_staff_bank_accounts(user.id, db, admin_user)
    assert len(accounts) >= 2
    assert accounts[0]["is_primary"] is True


@pytest.mark.asyncio
async def test_key_contacts_and_emergency_sync(
    db, test_institution, admin_user
):
    """Verifies adding key contacts and primary emergency sync to StaffProfile."""
    user = User(
        institution_id=test_institution.id,
        username="staff_contact_test",
        email="contact_test@prashantacademy.com",
        hashed_password="hashed_pwd_123",
        first_name="Pooja",
        last_name="Nair",
        role="teacher",
        is_active=True,
    )
    db.add(user)
    await db.flush()

    profile = StaffProfile(
        user_id=user.id,
        institution_id=test_institution.id,
        employee_id="STF-CNT-01",
        staff_type="teacher",
        department="Academics",
    )
    db.add(profile)
    await db.commit()

    # Add Primary Emergency Contact
    c_req = StaffKeyContactCreateRequest(
        contact_name="Vinod Nair",
        relationship="Spouse",
        phone_primary="+91 98200 99887",
        is_primary_emergency=True,
    )
    res = await add_staff_key_contact(user.id, c_req, db, admin_user)
    assert res["success"] is True

    # Verify SSOT synchronization
    await db.refresh(profile)
    assert profile.emergency_contact_name == "Vinod Nair"
    assert profile.emergency_contact_phone == "+91 98200 99887"
    assert profile.emergency_contact_relation == "Spouse"


@pytest.mark.asyncio
async def test_employee_dossier_form_generation(
    db, test_institution, test_academic_year, admin_user
):
    """Verifies that employee_dossier template aggregates dual addresses, contacts, and banking info."""
    user = User(
        institution_id=test_institution.id,
        username="prof_dossier_test",
        email="dossier_test@prashantacademy.com",
        hashed_password="hashed_pwd_123",
        first_name="Vikram",
        last_name="Sethi",
        role="teacher",
        is_active=True,
    )
    db.add(user)
    await db.flush()

    profile = StaffProfile(
        user_id=user.id,
        institution_id=test_institution.id,
        employee_id="TCH-DOS-01",
        staff_type="teacher",
        department="Physics",
        current_address="Flat 101, Lake View, Powai",
        permanent_address="House 45, Civil Lines, Nagpur",
        city="Mumbai",
        state="Maharashtra",
        pincode="400076",
        bank_name="ICICI Bank",
        bank_account_number="987654321012",
        bank_ifsc="ICIC0000987",
        emergency_contact_name="Sangeeta Sethi",
        emergency_contact_phone="+91 98111 22334",
    )
    db.add(profile)
    await db.commit()

    # Generate Dossier
    doc = await FormRendererEngine.render(
        db=db,
        form_id="employee_dossier",
        record_id=user.id,
        mode="prefilled",
        current_user=admin_user,
    )

    assert doc["form_id"] == "employee_dossier"
    data = doc["data"]
    assert data["full_name"] == "Vikram Sethi"
    assert data["current_address"] == "Flat 101, Lake View, Powai"
    assert data["permanent_address"] == "House 45, Civil Lines, Nagpur"
    assert len(data["bank_accounts"]) >= 1
    assert len(data["key_contacts"]) >= 1
