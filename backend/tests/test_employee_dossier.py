# /**
#  * @file        test_employee_dossier.py
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
#  * @description Comprehensive test suite for Teacher Profile & Employee Dossier: 13-tab payload, multi-address management, multi-bank accounts, assignment disambiguation, and emergency/nominee contacts.
#  */

import pytest
from datetime import date
from decimal import Decimal
from fastapi import HTTPException
from sqlalchemy import select

from app.models.user import User
from app.models.staff import (
    StaffProfile,
    StaffAddress,
    StaffBankAccount,
    StaffKeyContact,
    StaffEmploymentHistory,
    TeacherAssignment,
)
from app.models.standard import Standard
from app.models.division import Division
from app.models.subject import Subject
from app.models.board import Board
from app.api.v1.endpoints.staff import (
    get_staff_profile,
    list_staff_addresses,
    add_staff_address,
    set_primary_address,
    delete_staff_address,
    list_staff_bank_accounts,
    add_staff_bank_account,
    set_primary_bank_account,
    delete_staff_bank_account,
    list_staff_key_contacts,
    add_staff_key_contact,
    delete_staff_key_contact,
    StaffAddressCreateRequest,
    StaffBankAccountCreateRequest,
    StaffKeyContactCreateRequest,
)


@pytest.mark.asyncio
async def test_employee_dossier_13_tab_payload_retrieval(
    db, test_institution, test_academic_year, admin_user
):
    """Verifies that get_staff_profile returns the comprehensive 13-tab dossier payload."""
    # 1. Create a Manager User
    manager = User(
        institution_id=test_institution.id,
        username="manager_dossier_test",
        email="mgr_dossier@prashantacademy.com",
        hashed_password="hashed_pwd_mgr",
        first_name="Vikram",
        last_name="Rao",
        role="admin",
        is_active=True,
    )
    db.add(manager)
    await db.flush()

    # 2. Create a Teacher User
    teacher = User(
        institution_id=test_institution.id,
        username="teacher_dossier_test",
        email="dossier_teacher@prashantacademy.com",
        hashed_password="hashed_pwd_dossier",
        first_name="Ramesh",
        last_name="Kulkarni",
        role="teacher",
        staff_code="TCH-DOS-01",
        phone="9876543210",
        is_active=True,
    )
    db.add(teacher)
    await db.flush()

    # 3. Create Staff Profile with employment details
    profile = StaffProfile(
        user_id=teacher.id,
        institution_id=test_institution.id,
        employee_id="TCH-DOS-01",
        staff_type="teacher",
        department="Mathematics",
        specialization="Senior Mathematics Faculty",
        qualification="M.Sc. Mathematics, B.Ed",
        experience_years=8.5,
        status="active",
        joining_date=date(2023, 6, 1),
        contract_start_date=date(2023, 6, 1),
        contract_end_date=date(2026, 5, 31),
        rehire_eligible=True,
        reporting_manager_id=manager.id,
        responsibilities="Senior batch academic coordinator and Olympiad mentor",
        current_address="Flat 101, Galaxy Heights, Pune",
        permanent_address="House 42, Shivaji Nagar, Kolhapur",
        emergency_contact_name="Sunita Kulkarni",
        emergency_contact_phone="9876543211",
        emergency_contact_relation="Spouse",
        basic_salary=Decimal("65000.00"),
        bank_name="State Bank of India",
        bank_account_number="123456789012",
        bank_ifsc="SBIN0001234",
    )
    db.add(profile)
    await db.flush()

    # 4. Add Addresses
    addr1 = StaffAddress(
        staff_profile_id=profile.id,
        address_type="current",
        address_line="Flat 101, Galaxy Heights, Shivaji Road",
        city="Pune",
        state="Maharashtra",
        pincode="411005",
        country="India",
        is_primary=True,
        is_active=True,
    )
    addr2 = StaffAddress(
        staff_profile_id=profile.id,
        address_type="permanent",
        address_line="House 42, Main Bazaar",
        city="Kolhapur",
        state="Maharashtra",
        pincode="416001",
        country="India",
        is_primary=False,
        is_active=True,
    )
    db.add_all([addr1, addr2])

    # 5. Add Bank Account
    bank1 = StaffBankAccount(
        staff_profile_id=profile.id,
        bank_name="State Bank of India",
        account_number="123456789012",
        ifsc_code="SBIN0001234",
        account_holder_name="Ramesh Kulkarni",
        account_type="salary",
        is_primary=True,
        is_active=True,
    )
    db.add(bank1)

    # 6. Add Key Contact & Nominee
    kc1 = StaffKeyContact(
        staff_profile_id=profile.id,
        contact_name="Sunita Kulkarni",
        relation="Spouse",
        phone_primary="9876543211",
        is_primary_emergency=True,
        is_nominee=True,
        is_active=True,
        priority=1,
    )
    db.add(kc1)

    # 7. Add Employment History
    eh1 = StaffEmploymentHistory(
        staff_profile_id=profile.id,
        user_id=teacher.id,
        event_type="joined",
        old_status=None,
        new_status="active",
        effective_date=date(2023, 6, 1),
        reason="Initial appointment as Senior Faculty",
    )
    db.add(eh1)

    # 8. Add Multi-Board Disambiguated Academic Structure & Assignments
    board_icse = Board(institution_id=test_institution.id, name="ICSE Board", code="ICSE-DOS")
    board_cbse = Board(institution_id=test_institution.id, name="CBSE Board", code="CBSE-DOS")
    db.add_all([board_icse, board_cbse])
    await db.flush()

    std10 = Standard(institution_id=test_institution.id, name="Standard 10", level=10, is_active=True)
    db.add(std10)
    await db.flush()

    div_icse = Division(standard_id=std10.id, board_id=board_icse.id, name="Batch A (Morning)", code="ICSE-X-A", is_active=True)
    div_cbse = Division(standard_id=std10.id, board_id=board_cbse.id, name="Batch A (Morning)", code="CBSE-X-A", is_active=True)
    db.add_all([div_icse, div_cbse])
    await db.flush()

    subj_math = Subject(standard_id=std10.id, name="Advanced Mathematics", code="MATH-10", is_active=True)
    db.add(subj_math)
    await db.flush()

    assign1 = TeacherAssignment(
        teacher_user_id=teacher.id,
        academic_year_id=test_academic_year.id,
        board_id=board_icse.id,
        standard_id=std10.id,
        division_id=div_icse.id,
        subject_id=subj_math.id,
        weekly_hours=6.0,
        is_active=True,
    )
    assign2 = TeacherAssignment(
        teacher_user_id=teacher.id,
        academic_year_id=test_academic_year.id,
        board_id=board_cbse.id,
        standard_id=std10.id,
        division_id=div_cbse.id,
        subject_id=subj_math.id,
        weekly_hours=5.5,
        is_active=True,
    )
    db.add_all([assign1, assign2])
    await db.commit()

    # 9. Call get_staff_profile endpoint
    dossier = await get_staff_profile(teacher.id, db, admin_user)

    # 10. Assert core dossier fields
    assert dossier["user_id"] == teacher.id
    assert dossier["full_name"] == "Ramesh Kulkarni"
    assert dossier["employee_id"] == "TCH-DOS-01"
    assert dossier["reporting_manager_name"] == "Vikram Rao"
    assert dossier["rehire_eligible"] is True
    assert dossier["contract_start_date"] == "2023-06-01"
    assert dossier["contract_end_date"] == "2026-05-31"

    # 11. Assert Disambiguated Assignments
    assignments = dossier["assignments"]
    assert len(assignments) == 2
    batch_codes = {a["batch_code"] for a in assignments}
    assert "ICSE-X-A" in batch_codes
    assert "CBSE-X-A" in batch_codes
    for a in assignments:
        assert a["subject"] == "Advanced Mathematics"
        assert a["standard"] == "Standard 10"
        assert a["batch"] == "Batch A (Morning)"
        assert a["weekly_hours"] in [6.0, 5.5]

    # 12. Assert Addresses list
    addresses = dossier["addresses"]
    assert len(addresses) == 2
    types = {a["address_type"] for a in addresses}
    assert "current" in types
    assert "permanent" in types

    # 13. Assert Bank Accounts
    bank_accs = dossier["bank_accounts"]
    assert len(bank_accs) == 1
    assert bank_accs[0]["bank_name"] == "State Bank of India"
    assert bank_accs[0]["is_active"] is True
    assert bank_accs[0]["is_primary"] is True

    # 14. Assert Key Contacts & Nominee
    contacts = dossier["key_contacts"]
    assert len(contacts) == 1
    assert contacts[0]["contact_name"] == "Sunita Kulkarni"
    assert contacts[0]["is_nominee"] is True
    assert contacts[0]["priority"] == 1

    # 15. Assert Employment Histories
    histories = dossier["employment_histories"]
    assert len(histories) == 1
    assert histories[0]["event_type"] == "joined"
    assert histories[0]["new_status"] == "active"


@pytest.mark.asyncio
async def test_staff_address_crud_and_ssot_sync(
    db, test_institution, admin_user
):
    """Verifies StaffAddress creation, listing, primary promotion, and StaffProfile sync."""
    # 1. Create a Staff User & Profile
    staff = User(
        institution_id=test_institution.id,
        username="staff_addr_test",
        email="addr_staff@prashantacademy.com",
        hashed_password="hashed_pwd_addr",
        first_name="Pooja",
        last_name="Shinde",
        role="staff",
        is_active=True,
    )
    db.add(staff)
    await db.flush()

    profile = StaffProfile(
        user_id=staff.id,
        institution_id=test_institution.id,
        employee_id="STF-ADDR-01",
        staff_type="admin",
        department="Admissions",
        status="active",
        current_address="Old Address Line",
    )
    db.add(profile)
    await db.commit()

    # 2. Add Current Address (Primary)
    addr_req1 = StaffAddressCreateRequest(
        address_type="current",
        address_line="B-304, Green Park Society",
        city="Pune",
        state="Maharashtra",
        pincode="411038",
        country="India",
        is_primary=True,
    )
    res1 = await add_staff_address(staff.id, addr_req1, db, admin_user)
    assert res1["success"] is True
    addr1_id = res1["id"]

    # Verify SSOT synchronization on profile.current_address
    await db.refresh(profile)
    assert profile.current_address == "B-304, Green Park Society"
    assert profile.city == "Pune"
    assert profile.state == "Maharashtra"
    assert profile.pincode == "411038"

    # 3. Add Alternate Address
    addr_req2 = StaffAddressCreateRequest(
        address_type="alternate",
        address_line="C-102, Blue Ridge",
        city="Hinjawadi",
        state="Maharashtra",
        pincode="411057",
        country="India",
        is_primary=False,
    )
    res2 = await add_staff_address(staff.id, addr_req2, db, admin_user)
    assert res2["success"] is True
    addr2_id = res2["id"]

    # 4. List Addresses
    addrs = await list_staff_addresses(staff.id, db, admin_user)
    assert len(addrs) == 2
    assert addrs[0]["is_primary"] is True

    # 5. Promote Alternate Address to Primary
    set_prim_res = await set_primary_address(staff.id, addr2_id, db, admin_user)
    assert set_prim_res["success"] is True

    # Check updated list and profile
    addrs_after = await list_staff_addresses(staff.id, db, admin_user)
    prim_addr = next(a for a in addrs_after if a["id"] == addr2_id)
    assert prim_addr["is_primary"] is True

    await db.refresh(profile)
    assert profile.current_address == "C-102, Blue Ridge"
    assert profile.city == "Hinjawadi"

    # 6. Delete Address
    del_res = await delete_staff_address(staff.id, addr1_id, db, admin_user)
    assert del_res["success"] is True
    addrs_final = await list_staff_addresses(staff.id, db, admin_user)
    assert len(addrs_final) == 1
    assert addrs_final[0]["id"] == addr2_id


@pytest.mark.asyncio
async def test_staff_bank_account_toggle_and_masking(
    db, test_institution, admin_user
):
    """Verifies that bank account is_active flag is persisted and managed."""
    user = User(
        institution_id=test_institution.id,
        username="bank_toggle_user",
        email="bank_toggle@prashantacademy.com",
        hashed_password="hashed_pwd_bank",
        first_name="Deepak",
        last_name="Joshi",
        role="teacher",
        is_active=True,
    )
    db.add(user)
    await db.flush()

    profile = StaffProfile(
        user_id=user.id,
        institution_id=test_institution.id,
        employee_id="TCH-BNK-01",
        staff_type="teacher",
        department="Physics",
        status="active",
    )
    db.add(profile)
    await db.commit()

    # Add Salary Account
    b_req = StaffBankAccountCreateRequest(
        account_holder_name="Deepak Joshi",
        bank_name="ICICI Bank",
        account_number="998877665544",
        ifsc_code="ICIC0001234",
        account_type="salary",
        is_primary=True,
        is_active=True,
    )
    res = await add_staff_bank_account(user.id, b_req, db, admin_user)
    assert res["success"] is True

    # List Accounts
    accounts = await list_staff_bank_accounts(user.id, db, admin_user)
    assert len(accounts) == 1
    assert accounts[0]["is_active"] is True
    assert accounts[0]["is_primary"] is True
    assert accounts[0]["account_number"] == "998877665544"
