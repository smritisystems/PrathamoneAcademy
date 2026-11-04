# /**
#  * @file        test_student_portal.py
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
#  * @description Pytest suite testing student portal authentication, schedule views, and results queries.
#  */

import pytest
from datetime import date
from decimal import Decimal
from sqlalchemy import select
from app.core.security import get_password_hash
from app.models.user import User
from app.models.student import Student, Guardian
from app.models.standard import Standard
from app.models.division import Division
from app.models.board import Board
from app.models.subject import Subject
from app.models.enrollment import StudentEnrollment
from app.models.fee import FeeCategory, FeeStructure, StudentFeeAssignment, FeeInvoice, FeeInvoiceItem
from app.models.payment import Payment, PaymentAllocation, PaymentReceipt
from app.models.attendance import Attendance
from app.models.exam import Examination, ExamMark
from app.models.portal import TimetableEntry, StudyMaterial, Announcement, StudentDocument


@pytest.fixture
async def portal_seed(db, test_institution, test_academic_year):
    import uuid
    suffix = uuid.uuid4().hex[:6]

    # Board
    board = Board(
        institution_id=test_institution.id,
        name=f"ICSE Board {suffix}",
        code=f"ICSE_{suffix}"[:10],
        description="Portal ICSE",
        is_active=True,
    )
    db.add(board)
    await db.flush()

    # Standard
    standard = Standard(
        institution_id=test_institution.id,
        name=f"Class X {suffix}"[:50],
        level=10,
        is_active=True,
    )
    db.add(standard)
    await db.flush()

    # Division
    division = Division(
        standard_id=standard.id,
        board_id=board.id,
        name=f"X_{suffix}"[:10],
        capacity=40,
        is_active=True,
    )
    db.add(division)
    await db.flush()

    # Subject
    subject = Subject(
        standard_id=standard.id,
        name=f"Math_{suffix}",
        code=f"M_{suffix}"[:10],
        max_marks=100,
        pass_marks=35,
    )
    db.add(subject)
    await db.flush()

    # Student 1
    student1 = Student(
        institution_id=test_institution.id,
        admission_number=f"P-STU1-{suffix}",
        first_name="Rohan",
        last_name="Sharma",
        date_of_birth=date(2008, 5, 12),
        gender="male",
        phone="9876543210",
        email=f"rohan_{suffix}@example.com",
        admission_date=date(2024, 6, 1),
        is_active=True,
    )
    db.add(student1)
    await db.flush()

    # Student 2
    student2 = Student(
        institution_id=test_institution.id,
        admission_number=f"P-STU2-{suffix}",
        first_name="Priya",
        last_name="Verma",
        date_of_birth=date(2008, 8, 20),
        gender="female",
        phone="9876543211",
        email=f"priya_{suffix}@example.com",
        admission_date=date(2024, 6, 1),
        is_active=True,
    )
    db.add(student2)
    await db.flush()

    # Enrollments
    enr1 = StudentEnrollment(
        student_id=student1.id,
        academic_year_id=test_academic_year.id,
        standard_id=standard.id,
        division_id=division.id,
        roll_number="X-01",
        enrollment_date=date(2024, 6, 1),
        status="active",
    )
    db.add(enr1)

    enr2 = StudentEnrollment(
        student_id=student2.id,
        academic_year_id=test_academic_year.id,
        standard_id=standard.id,
        division_id=division.id,
        roll_number="X-02",
        enrollment_date=date(2024, 6, 1),
        status="active",
    )
    db.add(enr2)
    await db.flush()

    # Fee Category & Structure
    cat = FeeCategory(institution_id=test_institution.id, name=f"Tuition {suffix}")
    db.add(cat)
    await db.flush()

    struct = FeeStructure(
        institution_id=test_institution.id,
        academic_year_id=test_academic_year.id,
        standard_id=standard.id,
        category_id=cat.id,
        name=f"Fee {suffix}",
        amount=Decimal("40000.00"),
    )
    db.add(struct)
    await db.flush()

    # Fee Assignment & Invoice for Student 1
    assign1 = StudentFeeAssignment(
        student_id=student1.id,
        fee_structure_id=struct.id,
        academic_year_id=test_academic_year.id,
    )
    db.add(assign1)
    await db.flush()

    inv1 = FeeInvoice(
        invoice_number=f"INV-P-{suffix}",
        student_id=student1.id,
        assignment_id=assign1.id,
        academic_year_id=test_academic_year.id,
        total_amount=Decimal("40000.00"),
        discount_amount=Decimal("0.00"),
        net_amount=Decimal("40000.00"),
        paid_amount=Decimal("25000.00"),
        outstanding_amount=Decimal("15000.00"),
        status="partial",
        issue_date=date(2024, 6, 1),
    )
    db.add(inv1)
    await db.flush()

    # Payment for Student 1
    pmt1 = Payment(
        student_id=student1.id,
        academic_year_id=test_academic_year.id,
        amount=Decimal("25000.00"),
        payment_date=date(2024, 6, 10),
        payment_method="upi",
        status="completed",
    )
    db.add(pmt1)
    await db.flush()

    receipt1 = PaymentReceipt(
        receipt_number=f"REC-P-{suffix}",
        payment_id=pmt1.id,
        student_id=student1.id,
        amount=Decimal("25000.00"),
        payment_date=date(2024, 6, 10),
        payment_method="upi",
    )
    db.add(receipt1)

    # Attendance
    att = Attendance(
        student_id=student1.id,
        enrollment_id=enr1.id,
        date=date(2024, 9, 2),
        status="present",
    )
    db.add(att)

    # Exam & Mark
    exam = Examination(
        academic_year_id=test_academic_year.id,
        standard_id=standard.id,
        name=f"Unit Test {suffix}",
        exam_type="Unit Test",
        start_date=date(2024, 8, 15),
        end_date=date(2024, 8, 20),
        max_marks=100,
        passing_marks=35,
    )
    db.add(exam)
    await db.flush()

    mark = ExamMark(
        examination_id=exam.id,
        student_id=student1.id,
        subject_id=subject.id,
        marks_obtained=Decimal("88.00"),
        grade="A",
        remarks="Excellent",
    )
    db.add(mark)

    # Timetable
    tt = TimetableEntry(
        division_id=division.id,
        subject_id=subject.id,
        day_of_week="Monday",
        start_time="09:00",
        end_time="10:00",
        room_number="Room 101",
    )
    db.add(tt)

    # Study Material
    sm = StudyMaterial(
        institution_id=test_institution.id,
        standard_id=standard.id,
        subject_id=subject.id,
        division_id=division.id,
        title=f"Quadratic Notes {suffix}",
        description="Comprehensive formulas and solved examples",
        file_type="PDF",
        file_url=f"/files/quad_{suffix}.pdf",
        file_size_bytes=1048576,
    )
    db.add(sm)

    # Announcement
    ann = Announcement(
        institution_id=test_institution.id,
        standard_id=standard.id,
        title=f"Assessment {suffix}",
        content="Assessments start from 15th next month.",
        category="exam",
        is_pinned=True,
        publish_date=date(2024, 9, 1),
    )
    db.add(ann)

    # Document
    doc = StudentDocument(
        student_id=student1.id,
        title=f"Aadhar Card {suffix}",
        document_type="Aadhar Card",
        file_url=f"/docs/aadhar_{suffix}.pdf",
        status="verified",
    )
    db.add(doc)

    # Student User
    student_user = User(
        username=f"student_{suffix}",
        email=f"stu_{suffix}@test.com",
        hashed_password=get_password_hash("studentpassword"),
        first_name="Rohan",
        last_name="Sharma",
        role="student",
        student_id=student1.id,
    )
    db.add(student_user)

    await db.commit()

    return {
        "suffix": suffix,
        "student1": student1,
        "student2": student2,
        "student_user": student_user,
        "standard": standard,
        "division": division,
        "subject": subject,
        "invoice": inv1,
    }


@pytest.fixture
async def student_auth_headers(client, portal_seed):
    response = await client.post(
        "/api/v1/auth/login",
        data={"username": portal_seed["student_user"].username, "password": "studentpassword"},
    )
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_student_role_portal_dashboard_isolation(client, student_auth_headers, portal_seed):
    """
    Ensure student portal strictly enforces isolation:
    A student can only view their own dashboard, even if requesting another student_id.
    """
    # 1. Access dashboard without student_id
    res = await client.get("/api/v1/student-portal/dashboard", headers=student_auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["student"]["id"] == portal_seed["student1"].id
    assert data["student"]["first_name"] == "Rohan"
    assert data["viewer"]["is_student_user"] is True
    assert data["fee_status"]["total_fees"] == 40000.0
    assert data["fee_status"]["paid_amount"] == 25000.0
    assert data["fee_status"]["outstanding_balance"] == 15000.0
    assert len(data["recent_results"]) >= 1
    assert data["recent_results"][0]["subject_name"] == portal_seed["subject"].name

    # 2. Try to pass another student's ID (student2.id) -> Must still return student1 (isolation)
    other_id = portal_seed["student2"].id
    res_other = await client.get(f"/api/v1/student-portal/dashboard?student_id={other_id}", headers=student_auth_headers)
    assert res_other.status_code == 200
    data_other = res_other.json()
    assert data_other["student"]["id"] == portal_seed["student1"].id


@pytest.mark.asyncio
async def test_admin_student_portal_switcher(client, auth_headers, portal_seed):
    """
    Ensure admin can preview any student's portal using student_id query parameter.
    """
    s1_id = portal_seed["student1"].id
    s2_id = portal_seed["student2"].id

    # Admin requests Student 1
    res1 = await client.get(f"/api/v1/student-portal/dashboard?student_id={s1_id}", headers=auth_headers)
    assert res1.status_code == 200
    assert res1.json()["student"]["id"] == s1_id
    assert res1.json()["student"]["first_name"] == "Rohan"

    # Admin requests Student 2
    res2 = await client.get(f"/api/v1/student-portal/dashboard?student_id={s2_id}", headers=auth_headers)
    assert res2.status_code == 200
    assert res2.json()["student"]["id"] == s2_id
    assert res2.json()["student"]["first_name"] == "Priya"


@pytest.mark.asyncio
async def test_student_portal_tabs(client, student_auth_headers, portal_seed):
    """
    Verify all individual portal tab endpoints:
    classes, timetable, attendance, tests, fees, study-materials, profile.
    """
    # 1. Classes
    res_classes = await client.get("/api/v1/student-portal/classes", headers=student_auth_headers)
    assert res_classes.status_code == 200
    classes_data = res_classes.json()
    assert len(classes_data["enrollments"]) >= 1
    assert classes_data["enrollments"][0]["standard_name"] == portal_seed["standard"].name
    assert len(classes_data["subjects"]) >= 1

    # 2. Timetable
    res_tt = await client.get("/api/v1/student-portal/timetable", headers=student_auth_headers)
    assert res_tt.status_code == 200
    tt_data = res_tt.json()
    assert len(tt_data["timetable"]) >= 1
    assert "Monday" in tt_data["grouped_by_day"]

    # 3. Attendance
    res_att = await client.get("/api/v1/student-portal/attendance", headers=student_auth_headers)
    assert res_att.status_code == 200
    att_data = res_att.json()
    assert att_data["summary"]["present_days"] >= 1

    # 4. Tests
    res_tests = await client.get("/api/v1/student-portal/tests", headers=student_auth_headers)
    assert res_tests.status_code == 200
    tests_data = res_tests.json()
    assert len(tests_data["results"]) >= 1
    assert tests_data["results"][0]["marks_obtained"] == 88.0

    # 5. Fees
    res_fees = await client.get("/api/v1/student-portal/fees", headers=student_auth_headers)
    assert res_fees.status_code == 200
    fees_data = res_fees.json()
    assert fees_data["summary"]["total_fees"] == 40000.0
    assert fees_data["summary"]["paid_amount"] == 25000.0
    assert len(fees_data["invoices"]) >= 1
    assert len(fees_data["payments"]) >= 1

    # 6. Study Materials
    res_sm = await client.get("/api/v1/student-portal/study-materials", headers=student_auth_headers)
    assert res_sm.status_code == 200
    sm_data = res_sm.json()
    assert len(sm_data["materials"]) >= 1
    assert sm_data["materials"][0]["title"] == f"Quadratic Notes {portal_seed['suffix']}"

    # 7. Profile
    res_prof = await client.get("/api/v1/student-portal/profile", headers=student_auth_headers)
    assert res_prof.status_code == 200
    prof_data = res_prof.json()
    assert prof_data["student"]["admission_number"] == portal_seed["student1"].admission_number
    assert len(prof_data["documents"]) >= 1


@pytest.mark.asyncio
async def test_student_portal_profile_update(client, student_auth_headers, portal_seed):
    """
    Test student personal profile updates via portal.
    """
    payload = {
        "phone": "9998887777",
        "city": "Thane West",
        "blood_group": "B+",
    }
    res = await client.put("/api/v1/student-portal/profile", json=payload, headers=student_auth_headers)
    assert res.status_code == 200
    updated = res.json()["student"]
    assert updated["phone"] == "9998887777"
    assert updated["city"] == "Thane West"
    assert updated["blood_group"] == "B+"


@pytest.mark.asyncio
async def test_admin_student_profile_8_tabs_and_documents(client, auth_headers, portal_seed):
    """
    Test Admin comprehensive student profile view aggregating 8 tabs
    and document CRUD operations.
    """
    s1_id = portal_seed["student1"].id

    # 1. Fetch 8-tab profile
    res = await client.get(f"/api/v1/students/{s1_id}/profile", headers=auth_headers)
    assert res.status_code == 200
    profile = res.json()

    # Check that all 8 tabs are populated
    for tab in ["overview", "enrollment", "classes", "attendance", "tests", "fees", "documents", "activity"]:
        assert tab in profile, f"Tab {tab} missing from student profile"

    assert profile["overview"]["admission_number"] == portal_seed["student1"].admission_number
    assert profile["overview"]["fee_summary"]["total_fees"] == 40000.0
    assert len(profile["documents"]) >= 1
    assert len(profile["activity"]) >= 1

    # 2. Add a new document
    doc_payload = {
        "title": "10th Transfer Certificate",
        "document_type": "Transfer Certificate",
        "file_url": "/docs/tc_rohan.pdf",
        "status": "verified",
    }
    doc_res = await client.post(f"/api/v1/students/{s1_id}/documents", json=doc_payload, headers=auth_headers)
    assert doc_res.status_code == 201
    created_doc = doc_res.json()
    assert created_doc["title"] == "10th Transfer Certificate"
    doc_id = created_doc["id"]

    # 3. Delete the document
    del_res = await client.delete(f"/api/v1/students/{s1_id}/documents/{doc_id}", headers=auth_headers)
    assert del_res.status_code == 200
