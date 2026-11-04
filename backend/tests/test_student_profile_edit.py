# /**
#  * @file        test_student_profile_edit.py
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
#  * @description Pytest suite verifying administrative editing across all student master profile fields.
#  */

import pytest
import json
from datetime import date
from decimal import Decimal
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.security import get_password_hash
from app.models.user import User, AuditLog
from app.models.student import Student, Guardian
from app.models.standard import Standard
from app.models.division import Division
from app.models.board import Board
from app.models.enrollment import StudentEnrollment
from app.models.fee import FeeCategory, FeeStructure, StudentFeeAssignment, FeeInvoice, FeeInvoiceItem, FeeInstallment
from app.models.payment import Payment, PaymentAllocation, PaymentReceipt


@pytest.fixture
async def edit_profile_seed(db, test_institution, test_academic_year):
    import uuid
    suffix = uuid.uuid4().hex[:6]

    # Boards
    board1 = Board(
        institution_id=test_institution.id,
        name=f"ICSE Board {suffix}",
        code=f"ICSE_{suffix}"[:10],
        is_active=True,
    )
    board2 = Board(
        institution_id=test_institution.id,
        name=f"CBSE Board {suffix}",
        code=f"CBSE_{suffix}"[:10],
        is_active=True,
    )
    db.add_all([board1, board2])
    await db.flush()

    # Standards
    std_9 = Standard(
        institution_id=test_institution.id,
        name=f"Class IX {suffix}"[:50],
        level=9,
        is_active=True,
    )
    std_10 = Standard(
        institution_id=test_institution.id,
        name=f"Class X {suffix}"[:50],
        level=10,
        is_active=True,
    )
    db.add_all([std_9, std_10])
    await db.flush()

    # Divisions (Batches)
    batch_9a = Division(
        standard_id=std_9.id,
        board_id=board1.id,
        name=f"9A_{suffix}"[:10],
        capacity=30,
        is_active=True,
    )
    batch_10a = Division(
        standard_id=std_10.id,
        board_id=board2.id,
        name=f"10A_{suffix}"[:10],
        capacity=30,
        is_active=True,
    )
    db.add_all([batch_9a, batch_10a])
    await db.flush()

    # Student
    student = Student(
        institution_id=test_institution.id,
        admission_number=f"ADM_{suffix}"[:20],
        first_name="Rohan",
        last_name="Sharma",
        middle_name="Kumar",
        date_of_birth=date(2009, 5, 15),
        gender="male",
        blood_group="B+",
        nationality="Indian",
        religion="Hindu",
        caste="General",
        aadhar_number="123456789012",
        phone="9876543210",
        email=f"rohan_{suffix}@example.com",
        address="123 MG Road",
        city="Pune",
        state="Maharashtra",
        pincode="411001",
        admission_date=date(2024, 6, 1),
        is_active=True,
    )
    db.add(student)
    await db.flush()

    # Initial Guardian
    guardian = Guardian(
        student_id=student.id,
        relation="Father",
        first_name="Suresh",
        last_name="Sharma",
        phone="9876543211",
        email="suresh@example.com",
        occupation="Engineer",
        annual_income=1200000.0,
        is_primary=True,
    )
    db.add(guardian)
    await db.flush()

    # Active Enrollment
    enrollment = StudentEnrollment(
        student_id=student.id,
        academic_year_id=test_academic_year.id,
        standard_id=std_9.id,
        division_id=batch_9a.id,
        roll_number="09-01",
        enrollment_date=date(2024, 6, 1),
        status="active",
        remarks="Initial enrollment",
    )
    db.add(enrollment)
    await db.flush()

    # Financial obligation: Fee Invoice + Installment + Payment
    category = FeeCategory(institution_id=test_institution.id, name=f"Tuition {suffix}")
    db.add(category)
    await db.flush()

    structure = FeeStructure(
        institution_id=test_institution.id,
        academic_year_id=test_academic_year.id,
        category_id=category.id,
        name=f"Full Course {suffix}",
        amount=Decimal("45000.00"),
        frequency="annual",
    )
    db.add(structure)
    await db.flush()

    assignment = StudentFeeAssignment(
        student_id=student.id,
        fee_structure_id=structure.id,
        academic_year_id=test_academic_year.id,
        concession_amount=Decimal("0"),
    )
    db.add(assignment)
    await db.flush()

    invoice = FeeInvoice(
        invoice_number=f"INV-{suffix}",
        student_id=student.id,
        assignment_id=assignment.id,
        academic_year_id=test_academic_year.id,
        total_amount=Decimal("45000.00"),
        discount_amount=Decimal("0"),
        net_amount=Decimal("45000.00"),
        paid_amount=Decimal("20000.00"),
        outstanding_amount=Decimal("25000.00"),
        issue_date=date(2024, 6, 1),
        status="partially_paid",
    )
    db.add(invoice)
    await db.flush()

    payment = Payment(
        student_id=student.id,
        academic_year_id=test_academic_year.id,
        amount=Decimal("20000.00"),
        payment_date=date(2024, 6, 5),
        payment_method="bank_transfer",
        transaction_reference=f"TXN-{suffix}",
        status="completed",
    )
    db.add(payment)
    await db.flush()

    receipt = PaymentReceipt(
        payment_id=payment.id,
        student_id=student.id,
        receipt_number=f"REC-{suffix}",
        amount=Decimal("20000.00"),
        payment_date=date(2024, 6, 5),
        payment_method="bank_transfer",
    )
    db.add(receipt)

    # Non-admin user (Teacher/Staff)
    staff_user = User(
        username=f"staff_{suffix}",
        email=f"staff_{suffix}@test.com",
        hashed_password=get_password_hash("testpassword"),
        first_name="Staff",
        last_name="Member",
        role="staff",
        is_active=True,
    )
    db.add(staff_user)

    await db.commit()
    await db.refresh(student)
    await db.refresh(enrollment)
    await db.refresh(invoice)
    await db.refresh(payment)
    await db.refresh(staff_user)

    return {
        "student": student,
        "guardian": guardian,
        "enrollment": enrollment,
        "std_9": std_9,
        "std_10": std_10,
        "batch_9a": batch_9a,
        "batch_10a": batch_10a,
        "invoice": invoice,
        "payment": payment,
        "staff_user": staff_user,
    }


async def test_admin_can_update_master_profile_fields(client, auth_headers, edit_profile_seed, db):
    student = edit_profile_seed["student"]

    payload = {
        "first_name": "Rohan-Updated",
        "last_name": "Sharma-Updated",
        "middle_name": "K.",
        "date_of_birth": "2009-08-20",
        "gender": "male",
        "blood_group": "O+",
        "phone": "9998887776",
        "email": "rohan.updated@example.com",
        "address": "456 FC Road, Deccan",
        "city": "Pune",
        "state": "Maharashtra",
        "pincode": "411004",
        "aadhar_number": "987654321098",
        "nationality": "Indian",
        "religion": "Hindu",
        "caste": "OBC",
        "is_active": True,
    }

    res = await client.put(f"/api/v1/students/{student.id}", json=payload, headers=auth_headers)
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["message"] == "Student profile updated successfully"
    assert data["action"] == "student_profile_updated"
    assert "first_name" in data["changes"]
    assert "blood_group" in data["changes"]

    # Verify database state
    await db.refresh(student)
    assert student.first_name == "Rohan-Updated"
    assert student.blood_group == "O+"
    assert student.phone == "9998887776"
    assert student.pincode == "411004"

    # Verify audit log was recorded
    audit_stmt = (
        select(AuditLog)
        .where(AuditLog.resource_type == "student", AuditLog.resource_id == student.id)
        .order_by(AuditLog.id.desc())
    )
    audit = (await db.execute(audit_stmt)).scalars().first()
    assert audit is not None
    assert audit.action == "student_profile_updated"
    assert audit.old_data is not None
    assert audit.new_data is not None


async def test_non_admin_cannot_update_student_profile(client, edit_profile_seed):
    student = edit_profile_seed["student"]
    staff_user = edit_profile_seed["staff_user"]

    # Login as staff
    login_res = await client.post(
        "/api/v1/auth/login",
        data={"username": staff_user.username, "password": "testpassword"},
    )
    assert login_res.status_code == 200
    staff_token = login_res.json()["access_token"]
    staff_headers = {"Authorization": f"Bearer {staff_token}"}

    payload = {"first_name": "UnauthorizedChange"}
    res = await client.put(f"/api/v1/students/{student.id}", json=payload, headers=staff_headers)
    assert res.status_code == 403
    assert "Insufficient permissions" in res.json()["detail"]


async def test_admin_can_update_guardians(client, auth_headers, edit_profile_seed, db):
    student = edit_profile_seed["student"]
    guardian = edit_profile_seed["guardian"]

    payload = {
        "guardians": [
            {
                "id": guardian.id,
                "relation": "Father",
                "first_name": "Suresh",
                "last_name": "Sharma",
                "phone": "9876500000",  # Updated phone
                "email": "suresh.new@example.com",
                "occupation": "Senior Architect",
                "annual_income": 1500000.0,
                "is_primary": True,
            },
            {
                "relation": "Mother",
                "first_name": "Sunita",
                "last_name": "Sharma",
                "phone": "9876500001",
                "email": "sunita@example.com",
                "occupation": "Professor",
                "annual_income": 900000.0,
                "is_primary": False,
            },
        ]
    }

    res = await client.put(f"/api/v1/students/{student.id}", json=payload, headers=auth_headers)
    assert res.status_code == 200, res.text

    # Verify guardians in database
    g_res = await db.execute(select(Guardian).where(Guardian.student_id == student.id))
    guardians = g_res.scalars().all()
    assert len(guardians) == 2
    names = {g.first_name for g in guardians}
    assert "Suresh" in names
    assert "Sunita" in names

    father = next(g for g in guardians if g.first_name == "Suresh")
    assert father.phone == "9876500000"
    assert father.occupation == "Senior Architect"


async def test_batch_transfer_and_enrollment_update(client, auth_headers, edit_profile_seed, db):
    student = edit_profile_seed["student"]
    std_10 = edit_profile_seed["std_10"]
    batch_10a = edit_profile_seed["batch_10a"]
    invoice = edit_profile_seed["invoice"]
    payment = edit_profile_seed["payment"]

    payload = {
        "enrollment": {
            "standard_id": std_10.id,
            "division_id": batch_10a.id,
            "roll_number": "10-42",
            "status": "active",
        },
        "transfer_reason": "Promoted to Class X Batch 10A after evaluation",
    }

    res = await client.put(f"/api/v1/students/{student.id}", json=payload, headers=auth_headers)
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["action"] == "batch_transfer"
    assert "standard_id" in data["changes"]
    assert "division_id" in data["changes"]

    # Verify enrollment updated
    enr_stmt = select(StudentEnrollment).where(
        StudentEnrollment.student_id == student.id, StudentEnrollment.status == "active"
    )
    enr = (await db.execute(enr_stmt)).scalar_one()
    assert enr.standard_id == std_10.id
    assert enr.division_id == batch_10a.id
    assert enr.roll_number == "10-42"
    assert "Batch Transfer: Promoted to Class X" in enr.remarks

    # Financial Integrity: Existing Fee Invoices, Installments, Payments are completely untouched!
    await db.refresh(invoice)
    await db.refresh(payment)
    assert invoice.net_amount == Decimal("45000.00")
    assert invoice.paid_amount == Decimal("20000.00")
    assert invoice.outstanding_amount == Decimal("25000.00")
    assert payment.amount == Decimal("20000.00")
    assert payment.status == "completed"

    # Profile view reflects the transfer and logs activity
    prof_res = await client.get(f"/api/v1/students/{student.id}/profile", headers=auth_headers)
    assert prof_res.status_code == 200
    prof = prof_res.json()
    assert prof["overview"]["active_standard"] == std_10.name
    assert prof["overview"]["active_batch"] == batch_10a.name

    # Check activity timeline has batch transfer
    activities = prof["activity"]
    transfer_activity = next((a for a in activities if a["action"] == "batch_transfer"), None)
    assert transfer_activity is not None
    assert "Promoted to Class X" in transfer_activity["description"]
