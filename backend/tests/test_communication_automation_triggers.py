# /**
#  * @file        test_communication_automation_triggers.py
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
#  * @created     2026-11-13
#  * @updated     2026-11-13
#  *
#  * @description Pytest test suite validating automated communication dispatch triggers for Fee Receipts, Homework Assignments, and Examination Schedules.
#  */

import pytest
from datetime import date, datetime, timezone
from decimal import Decimal

from app.models.standard import Standard
from app.models.subject import Subject
from app.models.division import Division
from app.models.student import Student, Guardian
from app.models.enrollment import StudentEnrollment
from app.models.fee import FeeInvoice
from app.models.payment import Payment, PaymentReceipt, PaymentAllocation
from app.models.homework import HomeworkAssignment, StudentHomeworkRecord
from app.models.exam import Examination
from app.models.communication import CommunicationLog


@pytest.mark.asyncio
async def test_communication_automation_triggers_lifecycle(
    db, client, test_institution, test_academic_year, admin_user, auth_headers
):
    admin_user.institution_id = test_institution.id
    await db.commit()
    await db.refresh(admin_user)

    # 1. Verify GET /api/v1/communication/automation/triggers
    resp = await client.get("/api/v1/communication/automation/triggers", headers=auth_headers)
    assert resp.status_code == 200
    triggers_data = resp.json()
    assert "triggers" in triggers_data
    assert "active_rules" in triggers_data
    trigger_keys = [t["key"] for t in triggers_data["triggers"]]
    assert "fee_receipt" in trigger_keys
    assert "homework_alert" in trigger_keys
    assert "exam_schedule" in trigger_keys

    # 2. Setup Academic Hierarchy: Standard, Division, Subject
    standard = Standard(
        institution_id=test_institution.id,
        name="Grade 10 - ICSE",
        level=10,
    )
    db.add(standard)
    await db.flush()

    division = Division(
        standard_id=standard.id,
        name="Section A",
        room_number="Room 201",
    )
    db.add(division)

    subject = Subject(
        standard_id=standard.id,
        name="Computer Applications",
        code="CS-10",
        max_marks=100,
        pass_marks=35,
    )
    db.add(subject)
    await db.flush()

    # 3. Setup Student with Guardian and Enrollment
    student = Student(
        institution_id=test_institution.id,
        admission_number=f"ADM-COMM-{datetime.now().strftime('%M%S')}",
        first_name="Aarav",
        last_name="Sharma",
        date_of_birth=date(2010, 5, 15),
        gender="male",
        admission_date=date(2026, 4, 1),
        phone="9876543210",
        is_active=True,
    )
    db.add(student)
    await db.flush()

    guardian = Guardian(
        student_id=student.id,
        first_name="Vikram",
        last_name="Sharma",
        relation="Father",
        phone="9876543210",
        is_primary=True,
    )
    db.add(guardian)

    enrollment = StudentEnrollment(
        student_id=student.id,
        academic_year_id=test_academic_year.id,
        standard_id=standard.id,
        division_id=division.id,
        enrollment_date=date.today(),
        status="active",
    )
    db.add(enrollment)
    await db.commit()

    # 4. Test Fee Receipt Dispatch Trigger
    payment = Payment(
        student_id=student.id,
        academic_year_id=test_academic_year.id,
        amount=Decimal("10000.00"),
        payment_date=date.today(),
        payment_method="upi",
        transaction_reference="UPI/2026/TX9988",
        status="posted",
        collected_by_id=admin_user.id,
    )
    db.add(payment)
    await db.flush()

    receipt = PaymentReceipt(
        receipt_number=f"RCP-COMM-{payment.id}",
        payment_id=payment.id,
        student_id=student.id,
        amount=payment.amount,
        payment_date=payment.payment_date,
        payment_method=payment.payment_method,
        status="valid",
    )
    db.add(receipt)
    await db.commit()

    # Dispatch receipt confirmation
    rcpt_resp = await client.post(
        f"/api/v1/communication/automation/dispatch-payment-receipt/{payment.id}",
        json={"channel": "WHATSAPP"},
        headers=auth_headers,
    )
    assert rcpt_resp.status_code == 200
    rcpt_body = rcpt_resp.json()
    assert rcpt_body["status"] == "success"
    assert "RCP-COMM" in rcpt_body["receipt"]["receipt_number"]
    assert "https://wa.me/" in rcpt_body["receipt"]["whatsapp_url"]
    assert "9876543210" in rcpt_body["receipt"]["phone"]

    # 5. Test Homework Notification Trigger
    hw = HomeworkAssignment(
        institution_id=test_institution.id,
        academic_year_id=test_academic_year.id,
        standard_id=standard.id,
        subject_id=subject.id,
        division_id=division.id,
        teacher_user_id=admin_user.id,
        assignment_code=f"HW-COMM-{student.id}",
        title="Chapter 4: Binary Trees & Algorithmic Sorting",
        description="Solve exercises 4.1 to 4.5 in textbook",
        due_date=date(2026, 11, 20),
        due_time="18:00",
        max_marks=Decimal("25.00"),
        status="published",
        created_by_id=admin_user.id,
    )
    db.add(hw)
    await db.commit()

    hw_resp = await client.post(
        f"/api/v1/communication/automation/dispatch-homework/{hw.id}",
        json={"channel": "WHATSAPP"},
        headers=auth_headers,
    )
    assert hw_resp.status_code == 200
    hw_body = hw_resp.json()
    assert hw_body["status"] == "success"
    assert hw_body["summary"]["dispatched_count"] >= 1
    assert "Binary Trees" in hw_body["summary"]["title"]

    # 6. Test Examination Schedule Announcement Trigger
    exam = Examination(
        academic_year_id=test_academic_year.id,
        standard_id=standard.id,
        name="Mid-Term Assessment 2026",
        exam_type="mid_term",
        start_date=date(2026, 12, 10),
        end_date=date(2026, 12, 20),
        max_marks=100,
        passing_marks=35,
        is_active=True,
    )
    db.add(exam)
    await db.commit()

    exam_resp = await client.post(
        f"/api/v1/communication/automation/dispatch-exam-schedule/{exam.id}",
        json={"channel": "WHATSAPP"},
        headers=auth_headers,
    )
    assert exam_resp.status_code == 200
    exam_body = exam_resp.json()
    assert exam_body["status"] == "success"
    assert exam_body["summary"]["dispatched_count"] >= 1
    assert "Mid-Term Assessment 2026" in exam_body["summary"]["exam_name"]

    # 7. Verify triggers summary now reflects recent dispatches
    updated_triggers_resp = await client.get("/api/v1/communication/automation/triggers", headers=auth_headers)
    assert updated_triggers_resp.status_code == 200
    updated_data = updated_triggers_resp.json()
    assert len(updated_data["recent_dispatches"]) >= 3
