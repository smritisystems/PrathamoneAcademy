# /**
#  * @file        test_student_portal_v2.py
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
#  * @description Pytest suite validating student portal digital homework submission, attendance calendar, report cards, and online fee checkout.
#  */

import uuid
import pytest
from datetime import date, datetime, timedelta
from decimal import Decimal
from app.core.security import get_password_hash
from app.models.user import User
from app.models.student import Student, Guardian
from app.models.standard import Standard
from app.models.division import Division
from app.models.board import Board
from app.models.subject import Subject
from app.models.enrollment import StudentEnrollment
from app.models.attendance import Attendance
from app.models.exam import Examination, ExamMark
from app.models.fee import FeeCategory, FeeStructure, StudentFeeAssignment, FeeInvoice
from app.models.payment import Payment, PaymentAllocation, PaymentReceipt
from app.models.homework import HomeworkAssignment, StudentHomeworkRecord


@pytest.fixture
async def portal_v2_seed(db, test_institution, test_academic_year, admin_user):
    suffix = uuid.uuid4().hex[:6]

    # Teacher user
    teacher = User(
        username=f"teacher_{suffix}",
        email=f"teacher_{suffix}@test.com",
        hashed_password=get_password_hash("password123"),
        first_name="Prof",
        last_name="Kulkarni",
        role="teacher",
        institution_id=test_institution.id,
    )
    db.add(teacher)
    await db.flush()

    # Board & Standard
    board = Board(
        institution_id=test_institution.id,
        name=f"State Board {suffix}",
        code=f"SB_{suffix}"[:10],
        is_active=True,
    )
    db.add(board)
    await db.flush()

    standard = Standard(
        institution_id=test_institution.id,
        name=f"Std 12 {suffix}"[:50],
        level=12,
        is_active=True,
    )
    db.add(standard)
    await db.flush()

    division = Division(
        standard_id=standard.id,
        board_id=board.id,
        name=f"Batch_A_{suffix}"[:10],
        capacity=35,
        is_active=True,
        class_teacher_id=teacher.id,
    )
    db.add(division)
    await db.flush()

    subject = Subject(
        standard_id=standard.id,
        name=f"Physics_{suffix}",
        code=f"PHY_{suffix}"[:10],
        max_marks=100,
        pass_marks=35,
    )
    db.add(subject)
    await db.flush()

    # Student
    student = Student(
        institution_id=test_institution.id,
        admission_number=f"ADM-V2-{suffix}",
        first_name="Aarav",
        last_name="Deshmukh",
        date_of_birth=date(2007, 4, 10),
        gender="male",
        phone="9820011223",
        email=f"aarav_{suffix}@example.com",
        admission_date=date(2024, 6, 1),
        address="102 Emerald Heights",
        city="Thane",
        state="Maharashtra",
        pincode="400602",
        blood_group="O+",
        is_active=True,
    )
    db.add(student)
    await db.flush()

    guardian = Guardian(
        student_id=student.id,
        relation="Father",
        first_name="Sanjay",
        last_name="Deshmukh",
        phone="9820099887",
        email=f"sanjay_{suffix}@example.com",
        is_primary=True,
    )
    db.add(guardian)

    enrollment = StudentEnrollment(
        student_id=student.id,
        academic_year_id=test_academic_year.id,
        standard_id=standard.id,
        division_id=division.id,
        roll_number="12-A-05",
        enrollment_date=date(2024, 6, 1),
        status="active",
    )
    db.add(enrollment)
    await db.flush()

    # Attendance records
    today = date.today()
    att_present = Attendance(
        student_id=student.id,
        enrollment_id=enrollment.id,
        date=today - timedelta(days=1),
        status="present",
        remarks="Attended physics session",
    )
    att_absent = Attendance(
        student_id=student.id,
        enrollment_id=enrollment.id,
        date=today - timedelta(days=2),
        status="absent",
        remarks="Medical appointment with notice",
    )
    db.add_all([att_present, att_absent])

    # Homework Assignment & Record
    hw = HomeworkAssignment(
        institution_id=test_institution.id,
        academic_year_id=test_academic_year.id,
        standard_id=standard.id,
        subject_id=subject.id,
        division_id=division.id,
        teacher_user_id=teacher.id,
        assignment_code=f"HW-V2-{suffix}",
        title="Electromagnetic Induction Numerical Set",
        description="Solve 10 numerical problems from NCERT Chapter 6",
        assigned_date=today - timedelta(days=3),
        due_date=today + timedelta(days=2),
        due_time="20:00",
        max_marks=Decimal("20.00"),
        status="published",
        submission_method="online_text",
        allow_late_submissions=True,
        allow_resubmission=True,
    )
    db.add(hw)
    await db.flush()

    hw_record = StudentHomeworkRecord(
        institution_id=test_institution.id,
        assignment_id=hw.id,
        student_id=student.id,
        enrollment_id=enrollment.id,
        division_id=division.id,
        status="assigned",
        submission_status="pending",
        review_status="pending",
        submission_version=0,
    )
    db.add(hw_record)

    # Examination & Mark
    exam = Examination(
        academic_year_id=test_academic_year.id,
        standard_id=standard.id,
        name=f"Mid-Term Exam {suffix}",
        exam_type="Term 1",
        start_date=today - timedelta(days=10),
        end_date=today - timedelta(days=5),
        max_marks=100,
        passing_marks=35,
        is_active=True,
    )
    db.add(exam)
    await db.flush()

    mark = ExamMark(
        examination_id=exam.id,
        student_id=student.id,
        subject_id=subject.id,
        marks_obtained=Decimal("92.00"),
        grade="A+",
        remarks="Outstanding conceptual clarity",
    )
    db.add(mark)

    # Fee Invoice & Assignment
    cat = FeeCategory(institution_id=test_institution.id, name=f"Coaching Fee {suffix}")
    db.add(cat)
    await db.flush()

    struct = FeeStructure(
        institution_id=test_institution.id,
        academic_year_id=test_academic_year.id,
        standard_id=standard.id,
        category_id=cat.id,
        name=f"Annual Fee {suffix}",
        amount=Decimal("50000.00"),
    )
    db.add(struct)
    await db.flush()

    assign = StudentFeeAssignment(
        student_id=student.id,
        fee_structure_id=struct.id,
        academic_year_id=test_academic_year.id,
    )
    db.add(assign)
    await db.flush()

    inv = FeeInvoice(
        invoice_number=f"INV-V2-{suffix}",
        student_id=student.id,
        assignment_id=assign.id,
        academic_year_id=test_academic_year.id,
        total_amount=Decimal("50000.00"),
        discount_amount=Decimal("5000.00"),
        net_amount=Decimal("45000.00"),
        paid_amount=Decimal("15000.00"),
        outstanding_amount=Decimal("30000.00"),
        status="partially_paid",
        issue_date=today - timedelta(days=30),
    )
    db.add(inv)
    await db.flush()

    # Initial payment
    pmt = Payment(
        student_id=student.id,
        academic_year_id=test_academic_year.id,
        amount=Decimal("15000.00"),
        payment_date=today - timedelta(days=25),
        payment_method="online_upi",
        transaction_reference=f"TXN-INIT-{suffix}",
        status="completed",
    )
    db.add(pmt)
    await db.flush()

    rc = PaymentReceipt(
        receipt_number=f"REC-INIT-{suffix}",
        payment_id=pmt.id,
        student_id=student.id,
        amount=Decimal("15000.00"),
        payment_date=pmt.payment_date,
        payment_method="online_upi",
        status="valid",
    )
    db.add(rc)

    # Student portal user
    student_user = User(
        username=f"aarav_{suffix}",
        email=f"aarav_user_{suffix}@test.com",
        hashed_password=get_password_hash("aaravpass"),
        first_name="Aarav",
        last_name="Deshmukh",
        role="student",
        student_id=student.id,
        institution_id=test_institution.id,
    )
    db.add(student_user)
    await db.commit()

    return {
        "suffix": suffix,
        "student": student,
        "student_user": student_user,
        "teacher": teacher,
        "standard": standard,
        "division": division,
        "subject": subject,
        "exam": exam,
        "invoice": inv,
        "hw_record": hw_record,
        "hw": hw,
        "receipt": rc,
    }


@pytest.fixture
async def v2_student_headers(client, portal_v2_seed):
    resp = await client.post(
        "/api/v1/auth/login",
        data={"username": portal_v2_seed["student_user"].username, "password": "aaravpass"},
    )
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_student_portal_attendance_calendar_and_absentee(client, v2_student_headers, portal_v2_seed):
    """Verifies monthly calendar days breakdown, absentee log, and summary statistics."""
    resp = await client.get("/api/v1/student-portal/attendance", headers=v2_student_headers)
    assert resp.status_code == 200
    data = resp.json()

    assert "summary" in data
    assert "calendar_days" in data
    assert "absentee_log" in data
    assert data["summary"]["total_days"] >= 2
    assert data["summary"]["present_days"] >= 1
    assert data["summary"]["absent_days"] >= 1
    assert len(data["calendar_days"]) >= 28  # At least 28 days in any month

    # Verify absentee log details
    absentees = data["absentee_log"]
    assert len(absentees) >= 1
    assert absentees[0]["status"] == "absent"
    assert "Medical" in absentees[0]["remarks"]


@pytest.mark.asyncio
async def test_student_portal_digital_homework_flow(client, v2_student_headers, portal_v2_seed):
    """Verifies listing assigned homework and submitting digital solution with text and file URL."""
    # 1. Fetch homework list
    list_resp = await client.get("/api/v1/student-portal/homework", headers=v2_student_headers)
    assert list_resp.status_code == 200
    hw_data = list_resp.json()
    assert hw_data["total"] >= 1
    target_hw = next((h for h in hw_data["items"] if h["assignment_id"] == portal_v2_seed["hw"].id), None)
    assert target_hw is not None
    assert target_hw["assignment_code"] == portal_v2_seed["hw"].assignment_code
    assert target_hw["submission_status"] == "pending"

    # 2. Submit solution
    sub_payload = {
        "submission_text": "Completed all 10 numerical problems. Flux formula phi = B*A*cos(theta) verified.",
        "submission_file_url": "/uploads/homework/solutions_set6.pdf",
    }
    rec_id = target_hw["record_id"]
    sub_resp = await client.post(
        f"/api/v1/student-portal/homework/{rec_id}/submit",
        json=sub_payload,
        headers=v2_student_headers,
    )
    assert sub_resp.status_code == 200
    sub_res = sub_resp.json()
    assert sub_res["success"] is True
    assert sub_res["submission_status"] == "submitted"
    assert sub_res["submission_version"] == 1

    # 3. Verify updated state in homework list
    verify_resp = await client.get("/api/v1/student-portal/homework", headers=v2_student_headers)
    assert verify_resp.status_code == 200
    updated_items = verify_resp.json()["items"]
    updated_hw = next((h for h in updated_items if h["record_id"] == rec_id), None)
    assert updated_hw is not None
    assert updated_hw["submission_status"] == "submitted"
    assert "Completed all 10 numerical problems" in updated_hw["submission_text"]


@pytest.mark.asyncio
async def test_student_portal_multi_curriculum_report_card(client, v2_student_headers, portal_v2_seed):
    """Verifies report card compilation with marks, grade, GPA, and subject breakdown."""
    # 1. List report cards
    list_resp = await client.get("/api/v1/student-portal/report-cards", headers=v2_student_headers)
    assert list_resp.status_code == 200
    cards_data = list_resp.json()
    assert cards_data["total_report_cards"] >= 1

    # 2. Detailed single report card
    exam_id = portal_v2_seed["exam"].id
    rc_resp = await client.get(f"/api/v1/student-portal/report-cards/{exam_id}", headers=v2_student_headers)
    assert rc_resp.status_code == 200
    rc = rc_resp.json()
    assert rc["student"]["full_name"] == "Aarav Deshmukh"
    assert rc["summary"]["grade"] in ("A+", "A")
    assert rc["summary"]["gpa"] is not None
    assert len(rc["subjects"]) >= 1
    assert float(rc["subjects"][0]["marks_obtained"]) == 92.0


@pytest.mark.asyncio
async def test_student_portal_online_fee_checkout_and_voucher(client, v2_student_headers, portal_v2_seed):
    """Verifies instant online fee payment execution and printable receipt voucher retrieval."""
    inv = portal_v2_seed["invoice"]
    pay_payload = {
        "invoice_id": inv.id,
        "amount": 10000.0,
        "payment_method": "online_upi",
        "notes": "Term 2 tuition installment paid online via UPI",
    }
    pay_resp = await client.post(
        "/api/v1/student-portal/fees/pay-online",
        json=pay_payload,
        headers=v2_student_headers,
    )
    assert pay_resp.status_code == 200
    res = pay_resp.json()
    assert res["success"] is True
    assert res["amount"] == 10000.0
    rc_num = res["receipt_number"]
    assert rc_num.startswith("REC-PORTAL-")
    assert res["remaining_outstanding"] == 20000.0

    # Retrieve official printable receipt voucher
    voucher_resp = await client.get(
        f"/api/v1/student-portal/fees/receipts/{rc_num}/voucher",
        headers=v2_student_headers,
    )
    assert voucher_resp.status_code == 200
    voucher_data = voucher_resp.json()["voucher"]
    assert voucher_data["receipt_number"] == rc_num
    assert voucher_data["amount"] == 10000.0
    assert voucher_data["student"]["full_name"] == "Aarav Deshmukh"
    assert voucher_data["institution"]["name"] != ""


@pytest.mark.asyncio
async def test_student_portal_profile_class_teacher_and_emergency(client, v2_student_headers, portal_v2_seed):
    """Verifies profile returns class teacher name, primary guardian, and emergency contact."""
    prof_resp = await client.get("/api/v1/student-portal/profile", headers=v2_student_headers)
    assert prof_resp.status_code == 200
    prof = prof_resp.json()

    assert prof["student"]["class_teacher_name"] == "Prof Kulkarni"
    assert prof["emergency_contact"]["name"] == "Sanjay Deshmukh"
    assert prof["emergency_contact"]["relation"] == "Father"
    assert prof["primary_guardian"] is not None
