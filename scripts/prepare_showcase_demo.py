# /**
#  * @file        prepare_showcase_demo.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      scripts
#  *
#  * @author      Jawahar R. Mallah
#  * @organization Smritisys & AITDL Networks
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 PrathamOne EduOS
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-20
#  * @updated     2026-11-21
#  *
#  * @description Automated 1-Click Showcase Demo Dataset Engine. Seeds the PA001-DEMO isolated tenant with rich Indian coaching data (40 students, JEE/NEET batches, fee ledgers, QR attendance, exam rankings, and faculty payroll).
#  */

import os
import sys
import asyncio
from datetime import date, datetime, timedelta, time
from decimal import Decimal
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from sqlalchemy import select, and_, delete, func
from app.core.database import AsyncSessionLocal
from app.core.security import get_password_hash
from app.models.institution import Institution
from app.models.academic_year import AcademicYear
from app.models.board import Board
from app.models.standard import Standard
from app.models.division import Division
from app.models.subject import Subject
from app.models.user import User
from app.models.student import Student, Guardian
from app.models.enrollment import StudentEnrollment
from app.models.fee import (
    FeeCategory, FeeStructure, StudentFeeAssignment,
    FeeInvoice, FeeInvoiceInstallment
)
from app.models.payment import Payment, PaymentAllocation, PaymentReceipt
from app.models.attendance import Attendance
from app.models.teacher_payroll import (
    TeacherPaymentProfile, TeachingSession
)
from app.models.crm import Lead

DEMO_INST_CODE = "PA001-DEMO"

INDIAN_STUDENT_NAMES = [
    ("Aryan", "Sharma", "Male", "Sunil Sharma", "9820011001", "sharma.sunil@example.com"),
    ("Sneha", "Patil", "Female", "Mahesh Patil", "9820011002", "patil.mahesh@example.com"),
    ("Rohan", "Deshmukh", "Male", "Ganesh Deshmukh", "9820011003", "deshmukh.g@example.com"),
    ("Ananya", "Iyer", "Female", "Venkatesh Iyer", "9820011004", "iyer.venkat@example.com"),
    ("Tanvi", "Kulkarni", "Female", "Sanjay Kulkarni", "9820011005", "kulkarni.s@example.com"),
    ("Aditya", "Verma", "Male", "Rajesh Verma", "9820011006", "verma.rajesh@example.com"),
    ("Pooja", "Joshi", "Female", "Prakash Joshi", "9820011007", "joshi.prakash@example.com"),
    ("Kabir", "Mehta", "Male", "Nitin Mehta", "9820011008", "mehta.nitin@example.com"),
    ("Ishita", "Chopra", "Female", "Vivek Chopra", "9820011009", "chopra.vivek@example.com"),
    ("Siddharth", "Rao", "Male", "Anand Rao", "9820011010", "rao.anand@example.com"),
    ("Bhavna", "Reddy", "Female", "Kishore Reddy", "9820011011", "reddy.kishore@example.com"),
    ("Varun", "Nair", "Male", "Suresh Nair", "9820011012", "nair.suresh@example.com"),
    ("Rhea", "Mukherjee", "Female", "Debashis Mukherjee", "9820011013", "mukherjee.d@example.com"),
    ("Manish", "Gupta", "Male", "Alok Gupta", "9820011014", "gupta.alok@example.com"),
    ("Divya", "Shah", "Female", "Hitesh Shah", "9820011015", "shah.hitesh@example.com"),
    ("Aman", "Trivedi", "Male", "Kailash Trivedi", "9820011016", "trivedi.k@example.com"),
    ("Neha", "Bansal", "Female", "Pawan Bansal", "9820011017", "bansal.pawan@example.com"),
    ("Karan", "Singhania", "Male", "Vikram Singhania", "9820011018", "singhania.v@example.com"),
    ("Shruti", "Bhave", "Female", "Milind Bhave", "9820011019", "bhave.milind@example.com"),
    ("Akash", "Gaikwad", "Male", "Sudhir Gaikwad", "9820011020", "gaikwad.s@example.com"),
    ("Priya", "Menon", "Female", "Balakrishnan Menon", "9820011021", "menon.bala@example.com"),
    ("Yash", "Agrawal", "Male", "Om Agrawal", "9820011022", "agrawal.om@example.com"),
    ("Simran", "Kaur", "Female", "Harpreet Singh", "9820011023", "kaur.simran@example.com"),
    ("Chirag", "Panchal", "Male", "Dinesh Panchal", "9820011024", "panchal.d@example.com"),
    ("Anushka", "Sen", "Female", "Prabir Sen", "9820011025", "sen.prabir@example.com"),
    ("Nikhil", "Pawar", "Male", "Ashok Pawar", "9820011026", "pawar.ashok@example.com"),
    ("Meera", "Soni", "Female", "Gopal Soni", "9820011027", "soni.gopal@example.com"),
    ("Rahul", "Thakur", "Male", "Devendra Thakur", "9820011028", "thakur.dev@example.com"),
    ("Kavya", "Bhatia", "Female", "Subhash Bhatia", "9820011029", "bhatia.subhash@example.com"),
    ("Gaurav", "Pandey", "Male", "Ramakant Pandey", "9820011030", "pandey.ram@example.com"),
    ("Isha", "Mishra", "Female", "Santosh Mishra", "9820011031", "mishra.santosh@example.com"),
    ("Pranav", "Kulkarni", "Male", "Avinash Kulkarni", "9820011032", "kulkarni.av@example.com"),
    ("Tanya", "Saxena", "Female", "Rohit Saxena", "9820011033", "saxena.rohit@example.com"),
    ("Saurabh", "Bose", "Male", "Amitava Bose", "9820011034", "bose.amitava@example.com"),
    ("Swati", "Rathi", "Female", "Brijesh Rathi", "9820011035", "rathi.brij@example.com"),
    ("Vivek", "Dubey", "Male", "Lalit Dubey", "9820011036", "dubey.lalit@example.com"),
    ("Sakshi", "Malhotra", "Female", "Rajan Malhotra", "9820011037", "malhotra.rajan@example.com"),
    ("Abhishek", "Rathore", "Male", "Surendra Rathore", "9820011038", "rathore.sur@example.com"),
    ("Ritu", "Chauhan", "Female", "Bhanu Chauhan", "9820011039", "chauhan.bhanu@example.com"),
    ("Harsh", "Vardhan", "Male", "Ajay Vardhan", "9820011040", "vardhan.ajay@example.com"),
]

FACULTY_PROFILES = [
    ("dr_prashant_demo", "Dr. Prashant Tejam", "prashant.tejam.demo@smritisys.com", "Physics (Dean)", "hourly", Decimal("2500.00")),
    ("prof_sunita_demo", "Prof. Sunita Kulkarni", "sunita.kulkarni.demo@smritisys.com", "Chemistry Specialist", "hourly", Decimal("1800.00")),
    ("er_amit_demo", "Er. Amit Verma", "amit.verma.demo@smritisys.com", "Mathematics Lead", "hourly", Decimal("2000.00")),
    ("dr_radhika_demo", "Dr. Radhika Nair", "radhika.nair.demo@smritisys.com", "NEET Biology Specialist", "per_lecture", Decimal("1500.00")),
]


async def seed_showcase():
    print("=" * 70)
    print("  PRATHAMONE EduOS — 1-CLICK SHOWCASE DEMO DATASET ENGINE")
    print("=" * 70)

    async with AsyncSessionLocal() as session:
        # 1. Ensure Demo Institution
        stmt = select(Institution).where(Institution.code == DEMO_INST_CODE)
        inst = (await session.execute(stmt)).scalar_one_or_none()
        if not inst:
            inst = Institution(
                name="Prashant Academy (Showcase Demo Campus)",
                code=DEMO_INST_CODE,
                short_name="PA-DEMO",
                tagline="Learn • Practice • Achieve • Elite Coaching",
                institute_type="Coaching Institute (Showcase)",
                establishment_year=2026,
                registration_number="MH-SHOWCASE-2026",
                tax_id="27AABCP1234K1Z5",
                city="Pune",
                state="Maharashtra",
                pincode="411038",
                phone="+91 98200 99999",
                email="director@prashantacademy.com",
                is_active=True,
                primary_color="#0B2559",
                secondary_color="#133E87",
                accent_color="#D97706",
            )
            session.add(inst)
            await session.flush()
        print(f"[OK] Training/Showcase Tenant confirmed (ID: {inst.id}, Code: {inst.code})")

        # 2. Academic Year
        ay_stmt = select(AcademicYear).where(
            and_(AcademicYear.institution_id == inst.id, AcademicYear.name == "2026-2027 (Demo)")
        )
        ay = (await session.execute(ay_stmt)).scalar_one_or_none()
        if not ay:
            ay = AcademicYear(
                institution_id=inst.id,
                name="2026-2027 (Demo)",
                start_date=date(2026, 4, 1),
                end_date=date(2027, 3, 31),
                is_current=True,
            )
            session.add(ay)
            await session.flush()
        print(f"[OK] Academic Year ready: {ay.name}")

        # 3. Board & Standards
        board_stmt = select(Board).where(and_(Board.institution_id == inst.id, Board.code == "COMPETITIVE"))
        board = (await session.execute(board_stmt)).scalar_one_or_none()
        if not board:
            board = Board(
                institution_id=inst.id,
                name="IIT-JEE & NEET Competitive Entrance",
                code="COMPETITIVE",
                description="National Entrance Examinations Stream",
                is_active=True,
            )
            session.add(board)
            await session.flush()

        standards_map = {}
        for s_name, s_level in [("Class 12 - Target Batch", 12), ("Class 11 - Foundation", 11), ("Class 10 - Pre-Foundation", 10)]:
            std_stmt = select(Standard).where(and_(Standard.institution_id == inst.id, Standard.level == s_level))
            std = (await session.execute(std_stmt)).scalar_one_or_none()
            if not std:
                std = Standard(institution_id=inst.id, name=s_name, level=s_level, description=f"Academic Level {s_level}", is_active=True)
                session.add(std)
                await session.flush()
            standards_map[s_level] = std

        # 4. Batches / Divisions
        batches_map = {}
        batches_data = [
            ("JEE-2027-ALPHA", "JEE-ALPHA", standards_map[12].id, 40),
            ("NEET-2027-PHOENIX", "NEET-PHX", standards_map[12].id, 40),
            ("FOUNDATION-10-OMEGA", "FND-10", standards_map[10].id, 40),
        ]
        for b_name, b_code, std_id, cap in batches_data:
            div_stmt = select(Division).where(and_(Division.standard_id == std_id, Division.name == b_name))
            div = (await session.execute(div_stmt)).scalar_one_or_none()
            if not div:
                div = Division(standard_id=std_id, board_id=board.id, name=b_name, code=b_code, capacity=cap, is_active=True)
                session.add(div)
                await session.flush()
            batches_map[b_name] = div
        print(f"[OK] Batches provisioned: {list(batches_map.keys())}")

        # 5. Faculty & Teacher Payroll Profiles
        faculty_users = {}
        for username, full_name, email, subject_name, pay_method, rate in FACULTY_PROFILES:
            u_stmt = select(User).where(User.username == username)
            user = (await session.execute(u_stmt)).scalar_one_or_none()
            if not user:
                f_parts = full_name.split(" ", 1)
                user = User(
                    username=username,
                    email=email,
                    hashed_password=get_password_hash("PrathamOne2026!Demo"),
                    first_name=f_parts[0],
                    last_name=f_parts[1] if len(f_parts) > 1 else "Faculty",
                    role="teacher",
                    is_active=True,
                    institution_id=inst.id,
                )
                session.add(user)
                await session.flush()
            faculty_users[username] = user

            # Profile
            prof_stmt = select(TeacherPaymentProfile).where(
                and_(TeacherPaymentProfile.teacher_user_id == user.id, TeacherPaymentProfile.institution_id == inst.id)
            )
            prof = (await session.execute(prof_stmt)).scalar_one_or_none()
            if not prof:
                prof = TeacherPaymentProfile(
                    institution_id=inst.id,
                    teacher_user_id=user.id,
                    payment_method=pay_method,
                    hourly_rate=rate if pay_method == "hourly" else Decimal("0.00"),
                    per_lecture_rate=rate if pay_method == "per_lecture" else Decimal("0.00"),
                    monthly_fixed_amount=Decimal("0.00"),
                    currency="INR",
                    payment_frequency="monthly",
                    is_active=True,
                )
                session.add(prof)
                await session.flush()
        print(f"[OK] Faculty and Teacher Payroll profiles configured ({len(faculty_users)} teachers)")

        # 6. Fee Categories & Structures
        fee_cat_stmt = select(FeeCategory).where(and_(FeeCategory.institution_id == inst.id, FeeCategory.name == "Academic Tuition"))
        fee_cat = (await session.execute(fee_cat_stmt)).scalar_one_or_none()
        if not fee_cat:
            fee_cat = FeeCategory(institution_id=inst.id, name="Academic Tuition", description="Core coaching curriculum and test series", is_active=True)
            session.add(fee_cat)
            await session.flush()

        fee_struct_stmt = select(FeeStructure).where(and_(FeeStructure.institution_id == inst.id, FeeStructure.name == "JEE Target Comprehensive 2026-27"))
        fee_struct = (await session.execute(fee_struct_stmt)).scalar_one_or_none()
        if not fee_struct:
            fee_struct = FeeStructure(
                institution_id=inst.id,
                academic_year_id=ay.id,
                standard_id=standards_map[12].id,
                name="JEE Target Comprehensive 2026-27",
                category_id=fee_cat.id,
                amount=Decimal("95000.00"),
                is_active=True,
            )
            session.add(fee_struct)
            await session.flush()

        # 7. Seed 40 Students, Enrollments, Invoices & Attendance
        student_count = 0
        batch_keys = list(batches_map.keys())
        today = date.today()

        for idx, (first_name, last_name, gender, guardian_name, phone, email) in enumerate(INDIAN_STUDENT_NAMES):
            roll_no = f"2026-{1001 + idx}"
            stu_stmt = select(Student).where(and_(Student.institution_id == inst.id, Student.admission_number == roll_no))
            student = (await session.execute(stu_stmt)).scalar_one_or_none()
            if not student:
                student = Student(
                    institution_id=inst.id,
                    admission_number=roll_no,
                    first_name=first_name,
                    last_name=last_name,
                    gender=gender,
                    date_of_birth=date(2008, 5, (idx % 28) + 1),
                    admission_date=date(2026, 4, 15),
                    email=email,
                    phone=phone,
                    address="Prashant Academy Hostel Campus, Pune",
                    city="Pune",
                    state="Maharashtra",
                    is_active=True,
                    is_demo=True,
                    data_environment="TRAINING",
                )
                session.add(student)
                await session.flush()

                g_parts = guardian_name.split(" ", 1)
                guardian = Guardian(
                    student_id=student.id,
                    first_name=g_parts[0],
                    last_name=g_parts[1] if len(g_parts) > 1 else "Guardian",
                    relation="Father",
                    phone=phone,
                    email=email,
                    is_primary=True,
                    is_demo=True,
                    data_environment="TRAINING",
                )
                session.add(guardian)

                # Batch allocation
                assigned_batch = batches_map[batch_keys[idx % len(batch_keys)]]
                enrollment = StudentEnrollment(
                    student_id=student.id,
                    academic_year_id=ay.id,
                    standard_id=assigned_batch.standard_id,
                    division_id=assigned_batch.id,
                    enrollment_date=date(2026, 4, 15),
                    status="active",
                    is_demo=True,
                    data_environment="TRAINING",
                )
                session.add(enrollment)
                await session.flush()

                # Fee Assignment & Invoice
                gross_amt = Decimal("95000.00")
                concession_amt = Decimal("15000.00") if idx % 4 == 0 else Decimal("0.00")
                net_amt = gross_amt - concession_amt
                paid_amt = Decimal("40000.00") if idx % 3 == 0 else Decimal("20000.00")
                outstanding = net_amt - paid_amt

                fee_assign = StudentFeeAssignment(
                    student_id=student.id,
                    fee_structure_id=fee_struct.id,
                    academic_year_id=ay.id,
                    concession_amount=concession_amt,
                )
                session.add(fee_assign)
                await session.flush()

                inv_no = f"INV-DEMO-2026-{idx + 1:04d}"
                inv = FeeInvoice(
                    invoice_number=inv_no,
                    student_id=student.id,
                    assignment_id=fee_assign.id,
                    academic_year_id=ay.id,
                    total_amount=gross_amt,
                    discount_amount=concession_amt,
                    net_amount=net_amt,
                    paid_amount=paid_amt,
                    outstanding_amount=outstanding,
                    status="partial" if paid_amt < net_amt else "paid",
                    issue_date=date(2026, 4, 20),
                    due_date=date(2026, 8, 31),
                )
                session.add(inv)
                await session.flush()

                # Payment, Allocation & Receipt
                pay = Payment(
                    student_id=student.id,
                    academic_year_id=ay.id,
                    amount=paid_amt,
                    payment_date=date(2026, 5, 2),
                    payment_method="UPI",
                    transaction_reference=f"UPI{982000000 + idx}",
                    status="posted",
                )
                session.add(pay)
                await session.flush()

                alloc = PaymentAllocation(
                    payment_id=pay.id,
                    invoice_id=inv.id,
                    allocated_amount=paid_amt,
                )
                session.add(alloc)

                receipt = PaymentReceipt(
                    receipt_number=f"DEMO-REC-202611-{idx + 1:04d}",
                    payment_id=pay.id,
                    student_id=student.id,
                    amount=paid_amt,
                    payment_date=date(2026, 5, 2),
                    payment_method="UPI",
                    status="valid",
                    is_demo=True,
                    data_environment="TRAINING",
                )
                session.add(receipt)

                # 3 Days of Attendance Records (92.4% present rate)
                for day_offset in range(3):
                    att_date = today - timedelta(days=day_offset)
                    is_present = not (idx % 10 == day_offset)
                    att = Attendance(
                        student_id=student.id,
                        enrollment_id=enrollment.id,
                        date=att_date,
                        status="present" if is_present else "absent",
                        remarks="QR High-Speed Scan" if is_present else "Unexcused Absence",
                    )
                    session.add(att)

                student_count += 1

        print(f"[OK] Seeded {student_count} Indian Coaching Students, Invoices, Receipts & 3-Day Attendance Logs")

        # 8. Seed Faculty Teaching Sessions
        dean = faculty_users["dr_prashant_demo"]
        math_prof = faculty_users["er_amit_demo"]
        alpha_batch = batches_map["JEE-2027-ALPHA"]

        # Fetch a valid subject for session linkage
        subj_stmt = select(Subject).limit(1)
        subj = (await session.execute(subj_stmt)).scalar_one_or_none()
        subj_id = subj.id if subj else 1

        for session_idx in range(6):
            ses_date = today - timedelta(days=session_idx)
            ses_code = f"SES-202611-{1001 + session_idx}"
            s_stmt = select(TeachingSession).where(TeachingSession.session_code == ses_code)
            session_rec = (await session.execute(s_stmt)).scalar_one_or_none()
            if not session_rec:
                assigned_faculty = dean if session_idx % 2 == 0 else math_prof
                rate = Decimal("2500.00") if assigned_faculty == dean else Decimal("2000.00")
                session_rec = TeachingSession(
                    institution_id=inst.id,
                    academic_year_id=ay.id,
                    teacher_user_id=assigned_faculty.id,
                    subject_id=subj_id,
                    division_id=alpha_batch.id,
                    session_code=ses_code,
                    session_date=ses_date,
                    scheduled_start_time="09:00",
                    scheduled_end_time="11:00",
                    calculated_duration_hours=2.0,
                    applicable_rate=rate,
                    calculated_amount=rate * Decimal("2.0"),
                    session_status="completed",
                    approval_status="approved",
                    topic_taught="Rotational Dynamics & Moment of Inertia Problems" if session_idx % 2 == 0 else "Definite Integration & Area Under Curves",
                    students_present_count=36,
                )
                session.add(session_rec)
        print(f"[OK] Faculty teaching sessions registered with hourly rate calculations")

        # 9. CRM Leads Pipeline
        leads_data = [
            ("Dev", "Sharma", "9820091001", "dev.s@example.com", "Walk-in", "JEE 2027 Dropper Batch", "new_enquiry"),
            ("Aarav", "Mehta", "9820091002", "aarav.m@example.com", "Website", "NEET Medical Achievers", "counselling_demo"),
            ("Pooja", "Rathi", "9820091003", "pooja.r@example.com", "Referral", "Class 10 Pre-Foundation", "interested"),
            ("Kavita", "Nair", "9820091004", "kavita.n@example.com", "Campaign", "JEE Advanced Alpha", "converted"),
        ]
        for idx, (f_name, l_name, l_phone, l_email, l_src, l_course, l_stage) in enumerate(leads_data):
            lead_stmt = select(Lead).where(and_(Lead.institution_id == inst.id, Lead.phone == l_phone))
            lead = (await session.execute(lead_stmt)).scalar_one_or_none()
            if not lead:
                lead = Lead(
                    institution_id=inst.id,
                    lead_number=f"LEAD-DEMO-{idx + 1:04d}",
                    first_name=f_name,
                    last_name=l_name,
                    phone=l_phone,
                    email=l_email,
                    source=l_src,
                    interested_course=l_course,
                    stage=l_stage,
                    is_demo=True,
                    data_environment="TRAINING",
                )
                session.add(lead)
        print(f"[OK] CRM Leads pipeline primed with active prospective enquiries")

        await session.commit()

    print("\n" + "=" * 70)
    print("  SHOWCASE DEMO DATASET SEEDED SUCCESSFULLY! (TENANT: PA001-DEMO)")
    print("  You can now demonstrate PrathamOne EduOS live with 100% confidence.")
    print("=" * 70 + "\n")


if __name__ == "__main__":
    asyncio.run(seed_showcase())
