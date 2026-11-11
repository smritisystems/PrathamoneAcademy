# /**
#  * @file        training_dataset_service.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      backend.app.services
#  *
#  * @author      Jawahar R. Mallah
#  * @organization AITDL (AI Technology & Development Lab)
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 AITDL
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-07
#  * @updated     2026-11-11
#  *
#  * @description Service managing the Central Training Dataset (CRM-STAFF-TRAINING-V1), isolated demo tenant seeding, and dependency-aware training reset engine with strict production safety locks.
#  */

import time
import logging
from datetime import datetime, date, timedelta
from typing import Optional, Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete, and_, or_

from app.models.institution import Institution
from app.models.academic_year import AcademicYear
from app.models.board import Board
from app.models.standard import Standard
from app.models.division import Division
from app.models.subject import Subject
from app.models.user import User
from app.models.student import Student, Guardian
from app.models.enrollment import StudentEnrollment
from app.models.fee import FeeCategory, FeeStructure, FeeInvoice, FeeInvoiceItem
from app.models.payment import Payment, PaymentReceipt, PaymentAllocation
from app.models.attendance import Attendance
from app.models.exam import Examination, ExamMark
from app.models.communication import CommunicationLog
from app.models.crm import Lead, LeadFollowUp, LeadDemoClass
from app.models.training import (
    TrainingEnvironmentConfig,
    TrainingSession,
    TrainingResetLog,
)

logger = logging.getLogger(__name__)

ACTIVE_DATASET_VERSION = "CRM-STAFF-TRAINING-V1"
TRAINING_INSTITUTION_CODE = "PA001-DEMO"


async def get_or_create_training_institution(db: AsyncSession) -> Institution:
    """Retrieves or provisions the authoritative isolated training tenant."""
    res = await db.execute(
        select(Institution).where(Institution.code == TRAINING_INSTITUTION_CODE)
    )
    inst = res.scalar_one_or_none()
    if not inst:
        inst = Institution(
            name="Prashant Academy (Training & Demo Environment)",
            code=TRAINING_INSTITUTION_CODE,
            short_name="PA-DEMO",
            tagline="Staff Training • Sample Data • Isolated Environment",
            institute_type="Coaching Institute (Training)",
            establishment_year=2026,
            registration_number="MH-TRAIN-2026-0001",
            tax_id="DEMO12345T",
            description="Dedicated training and simulation tenant for staff practice and workflow verification.",
            primary_color="#D97706",
            secondary_color="#F59E0B",
            accent_color="#B45309",
            favicon_url="/favicon.svg",
            timezone="Asia/Kolkata",
            default_language="en",
            is_active=True,
        )
        db.add(inst)
        await db.flush()
    return inst


async def get_training_environment_status(db: AsyncSession) -> Dict[str, Any]:
    """Returns real-time status, record counts, active sessions, and reset policy."""
    inst = await get_or_create_training_institution(db)
    cfg_res = await db.execute(select(TrainingEnvironmentConfig).limit(1))
    cfg = cfg_res.scalar_one_or_none()

    # Calculate training counts
    leads_count = (
        await db.execute(
            select(func.count(Lead.id)).where(Lead.institution_id == inst.id)
        )
    ).scalar() or 0

    students_count = (
        await db.execute(
            select(func.count(Student.id)).where(Student.institution_id == inst.id)
        )
    ).scalar() or 0

    receipts_count = (
        await db.execute(
            select(func.count(PaymentReceipt.id)).where(
                PaymentReceipt.receipt_number.like("DEMO-%")
            )
        )
    ).scalar() or 0

    followups_count = (
        await db.execute(
            select(func.count(LeadFollowUp.id)).where(LeadFollowUp.institution_id == inst.id)
        )
    ).scalar() or 0

    # Active sessions in last 30 minutes
    cutoff = datetime.utcnow() - timedelta(minutes=30)
    sessions_res = await db.execute(
        select(TrainingSession)
        .where(
            and_(
                TrainingSession.is_active == True,
                TrainingSession.last_active_at >= cutoff,
            )
        )
        .order_by(TrainingSession.last_active_at.desc())
    )
    active_sessions = sessions_res.scalars().all()

    last_reset = None
    if cfg and cfg.last_reset_at:
        last_reset = {
            "timestamp": cfg.last_reset_at.isoformat(),
            "status": cfg.last_reset_status,
            "version": cfg.active_dataset_version,
        }

    return {
        "is_enabled": cfg.is_enabled if cfg else True,
        "reset_policy": cfg.reset_policy if cfg else "manual_only",
        "inactivity_timeout_minutes": cfg.inactivity_timeout_minutes if cfg else 60,
        "daily_reset_time": cfg.daily_reset_time if cfg else "03:00",
        "dataset_version": cfg.active_dataset_version if cfg else ACTIVE_DATASET_VERSION,
        "institution_id": inst.id,
        "institution_code": inst.code,
        "record_counts": {
            "leads": leads_count,
            "students": students_count,
            "receipts": receipts_count,
            "follow_ups": followups_count,
        },
        "active_sessions_count": len(active_sessions),
        "active_sessions": [
            {
                "id": s.id,
                "user_id": s.user_id,
                "started_at": s.started_at.isoformat() if s.started_at else None,
                "last_active_at": s.last_active_at.isoformat() if s.last_active_at else None,
            }
            for s in active_sessions
        ],
        "last_reset": last_reset,
    }


async def register_training_activity(db: AsyncSession, user_id: int) -> TrainingSession:
    """Records user activity inside training session context."""
    res = await db.execute(
        select(TrainingSession).where(
            and_(
                TrainingSession.user_id == user_id,
                TrainingSession.is_active == True,
            )
        )
    )
    session = res.scalar_one_or_none()
    now = datetime.utcnow()
    if session:
        session.last_active_at = now
    else:
        session = TrainingSession(
            user_id=user_id,
            started_at=now,
            last_active_at=now,
            is_active=True,
        )
        db.add(session)
    await db.flush()
    return session


async def end_training_session(db: AsyncSession, user_id: int) -> None:
    """Marks user training session inactive upon exit or logout."""
    res = await db.execute(
        select(TrainingSession).where(
            and_(
                TrainingSession.user_id == user_id,
                TrainingSession.is_active == True,
            )
        )
    )
    sessions = res.scalars().all()
    now = datetime.utcnow()
    for s in sessions:
        s.is_active = False
        s.ended_at = now
    await db.flush()


async def seed_training_dataset(
    db: AsyncSession,
    dataset_version: str = ACTIVE_DATASET_VERSION,
    seed_user_id: Optional[int] = None,
) -> Dict[str, int]:
    """
    Seeds the central baseline training dataset (CRM-STAFF-TRAINING-V1).
    All records are stamped with institution_id = training_inst.id, is_demo = True, data_environment = 'TRAINING'.
    """
    inst = await get_or_create_training_institution(db)
    inst_id = inst.id

    # 1. Academic Year (Demo)
    ay_res = await db.execute(
        select(AcademicYear).where(
            and_(
                AcademicYear.institution_id == inst_id,
                AcademicYear.name == "2026-27 (Demo)",
            )
        )
    )
    ay = ay_res.scalar_one_or_none()
    if not ay:
        ay = AcademicYear(
            institution_id=inst_id,
            name="2026-27 (Demo)",
            start_date=date(2026, 4, 1),
            end_date=date(2027, 3, 31),
            is_current=True,
        )
        db.add(ay)
        await db.flush()

    # 2. Boards (Demo)
    boards = {}
    for b_code, b_name in [("CBSE", "CBSE (Demo)"), ("ICSE", "ICSE (Demo)"), ("STATE", "State Board (Demo)")]:
        b_res = await db.execute(
            select(Board).where(
                and_(Board.institution_id == inst_id, Board.code == b_code)
            )
        )
        b_obj = b_res.scalar_one_or_none()
        if not b_obj:
            b_obj = Board(institution_id=inst_id, name=b_name, code=b_code)
            db.add(b_obj)
            await db.flush()
        boards[b_code] = b_obj

    # 3. Standards (Demo)
    standards = {}
    std_specs = [
        ("Std. 8", 8, "Middle School"),
        ("Std. 9", 9, "Secondary"),
        ("Std. 10", 10, "Secondary Board"),
        ("Std. 11 Science", 11, "Higher Secondary Science"),
        ("Std. 11 Commerce", 12, "Higher Secondary Commerce"),
    ]
    for std_name, std_level, std_desc in std_specs:
        s_res = await db.execute(
            select(Standard).where(
                and_(Standard.institution_id == inst_id, Standard.level == std_level)
            )
        )
        s_obj = s_res.scalar_one_or_none()
        if not s_obj:
            s_obj = Standard(
                institution_id=inst_id,
                name=std_name,
                level=std_level,
                description=std_desc,
                is_active=True,
            )
            db.add(s_obj)
            await db.flush()
        standards[std_name] = s_obj

    # 4. Subjects (Demo)
    sub_res = await db.execute(
        select(Subject).where(
            and_(Subject.standard_id == standards["Std. 10"].id, Subject.code == "MATH-10-DEMO")
        )
    )
    demo_subject = sub_res.scalar_one_or_none()
    if not demo_subject:
        demo_subject = Subject(
            standard_id=standards["Std. 10"].id,
            name="Mathematics (Demo)",
            code="MATH-10-DEMO",
            max_marks=100,
            pass_marks=35,
            is_active=True,
        )
        db.add(demo_subject)
        await db.flush()

    # 5. Counsellor / Staff Assignment User
    counsellor_res = await db.execute(
        select(User).where(User.is_active == True).order_by(User.id.asc()).limit(1)
    )
    counsellor = counsellor_res.scalar_one_or_none()
    counsellor_id = counsellor.id if counsellor else None

    # 6. Sample Demo Students (5 students: 2 for converted leads, 3 existing)
    student_specs = [
        {
            "adm": "DEMO-ADM-2026-0001",
            "first_name": "Advait",
            "last_name": "Pendse",
            "gender": "male",
            "dob": date(2010, 5, 14),
            "phone": "+91 98201 77880",
            "email": "advait.pendse@demo.example.com",
            "standard": standards["Std. 10"],
            "parent": "Suresh Pendse",
            "parent_phone": "+91 98201 77881",
        },
        {
            "adm": "DEMO-ADM-2026-0002",
            "first_name": "Neha",
            "last_name": "Karnik",
            "gender": "female",
            "dob": date(2009, 8, 22),
            "phone": "+91 99306 44882",
            "email": "neha.karnik@demo.example.com",
            "standard": standards["Std. 11 Science"],
            "parent": "Rajesh Karnik",
            "parent_phone": "+91 99306 44883",
        },
        {
            "adm": "DEMO-ADM-2026-0003",
            "first_name": "Tanay",
            "last_name": "Deshmukh",
            "gender": "male",
            "dob": date(2010, 3, 10),
            "phone": "+91 98204 11223",
            "email": "tanay.deshmukh@demo.example.com",
            "standard": standards["Std. 10"],
            "parent": "Vikram Deshmukh",
            "parent_phone": "+91 98204 11224",
        },
        {
            "adm": "DEMO-ADM-2026-0004",
            "first_name": "Shreya",
            "last_name": "Kadam",
            "gender": "female",
            "dob": date(2011, 11, 5),
            "phone": "+91 98199 55441",
            "email": "shreya.kadam@demo.example.com",
            "standard": standards["Std. 9"],
            "parent": "Anand Kadam",
            "parent_phone": "+91 98199 55442",
        },
        {
            "adm": "DEMO-ADM-2026-0005",
            "first_name": "Yash",
            "last_name": "Patil",
            "gender": "male",
            "dob": date(2012, 7, 19),
            "phone": "+91 98202 66778",
            "email": "yash.patil@demo.example.com",
            "standard": standards["Std. 8"],
            "parent": "Ganesh Patil",
            "parent_phone": "+91 98202 66779",
        },
    ]

    demo_students = {}
    for s_data in student_specs:
        st_res = await db.execute(
            select(Student).where(Student.admission_number == s_data["adm"])
        )
        st_obj = st_res.scalar_one_or_none()
        if not st_obj:
            st_obj = Student(
                institution_id=inst_id,
                admission_number=s_data["adm"],
                first_name=s_data["first_name"],
                last_name=s_data["last_name"],
                date_of_birth=s_data["dob"],
                gender=s_data["gender"],
                phone=s_data["phone"],
                email=s_data["email"],
                address="102, Shanti Heights, M.G. Road",
                city="Mumbai",
                state="Maharashtra",
                pincode="400001",
                admission_date=date(2026, 4, 15),
                is_active=True,
                is_demo=True,
                data_environment="TRAINING",
                demo_dataset_id=dataset_version,
            )
            db.add(st_obj)
            await db.flush()

            # Add Guardian
            g_obj = Guardian(
                student_id=st_obj.id,
                first_name=s_data["parent"].split()[0],
                last_name=s_data["parent"].split()[1] if len(s_data["parent"].split()) > 1 else "",
                relation="Father",
                phone=s_data["parent_phone"],
                email=f"parent.{st_obj.first_name.lower()}@demo.example.com",
                is_primary=True,
                is_demo=True,
                data_environment="TRAINING",
                demo_dataset_id=dataset_version,
            )
            db.add(g_obj)

            # Add Enrollment
            enr_obj = StudentEnrollment(
                student_id=st_obj.id,
                academic_year_id=ay.id,
                standard_id=s_data["standard"].id,
                status="active",
                enrollment_date=date(2026, 4, 15),
                is_demo=True,
                data_environment="TRAINING",
                demo_dataset_id=dataset_version,
            )
            db.add(enr_obj)
            await db.flush()

        demo_students[s_data["adm"]] = st_obj

    # 7. Seed 20 Realistic Sample Leads across All 7 Stages
    today = date.today()
    lead_definitions = [
        # Stage 1: new_enquiry (4 leads)
        {
            "num": "DEMO-LD-0001", "first": "Aarav", "last": "Sharma", "gender": "male",
            "phone": "+91 98765 43210", "email": "aarav.sharma@gmail.com",
            "std": standards["Std. 10"], "board": boards["CBSE"], "course": "Std. 10 CBSE — JEE Foundation",
            "stage": "new_enquiry", "priority": "hot", "source": "Website",
            "g_name": "Sunil Sharma", "g_phone": "+91 98765 43211", "g_rel": "Father",
            "follow_up_days": 1, "notes": "Registered online via coaching institute website. High intent for JEE coaching.",
        },
        {
            "num": "DEMO-LD-0002", "first": "Riya", "last": "Patil", "gender": "female",
            "phone": "+91 98201 55433", "email": "riya.patil@outlook.com",
            "std": standards["Std. 9"], "board": boards["STATE"], "course": "Std. 9 State Board — Maths & Science",
            "stage": "new_enquiry", "priority": "warm", "source": "Walk-in",
            "g_name": "Deepak Patil", "g_phone": "+91 98201 55434", "g_rel": "Father",
            "follow_up_days": 1, "notes": "Visited reception with mother. Inquired about weekend batch timings.",
        },
        {
            "num": "DEMO-LD-0003", "first": "Rohan", "last": "Kulkarni", "gender": "male",
            "phone": "+91 98190 22334", "email": "rohan.kulkarni@yahoo.com",
            "std": standards["Std. 8"], "board": boards["ICSE"], "course": "Std. 8 ICSE — Foundation Master",
            "stage": "new_enquiry", "priority": "hot", "source": "Website",
            "g_name": "Meera Kulkarni", "g_phone": "+91 98190 22335", "g_rel": "Mother",
            "follow_up_days": 2, "notes": "Looking for personalized attention in Mathematics and Physics.",
        },
        {
            "num": "DEMO-LD-0004", "first": "Aniket", "last": "Joshi", "gender": "male",
            "phone": "+91 99670 11223", "email": "aniket.joshi@gmail.com",
            "std": standards["Std. 11 Science"], "board": boards["STATE"], "course": "Std. 11 Science — MHT-CET Crash",
            "stage": "new_enquiry", "priority": "warm", "source": "Social Media",
            "g_name": "Prakash Joshi", "g_phone": "+91 99670 11224", "g_rel": "Father",
            "follow_up_days": 2, "notes": "Responded to Instagram ad regarding MHT-CET coaching batch.",
        },

        # Stage 2: contacted (4 leads)
        {
            "num": "DEMO-LD-0005", "first": "Vedant", "last": "Gokhale", "gender": "male",
            "phone": "+91 97690 11223", "email": "vedant.gokhale@gmail.com",
            "std": standards["Std. 11 Commerce"], "board": boards["CBSE"], "course": "Std. 11 Commerce — CA Foundation",
            "stage": "contacted", "priority": "warm", "source": "Referral",
            "g_name": "Nitin Gokhale", "g_phone": "+91 97690 11224", "g_rel": "Father",
            "follow_up_days": 1, "notes": "Counsellor called student. Parent requested fee breakdown on WhatsApp.",
        },
        {
            "num": "DEMO-LD-0006", "first": "Ira", "last": "Deshmukh", "gender": "female",
            "phone": "+91 99870 66554", "email": "ira.deshmukh@gmail.com",
            "std": standards["Std. 8"], "board": boards["CBSE"], "course": "Std. 8 CBSE — Maths Booster",
            "stage": "contacted", "priority": "hot", "source": "Walk-in",
            "g_name": "Smita Deshmukh", "g_phone": "+91 99870 66555", "g_rel": "Mother",
            "follow_up_days": 1, "notes": "Spoke to mother. She confirmed student's interest, visiting on Saturday.",
        },
        {
            "num": "DEMO-LD-0007", "first": "Tanvi", "last": "Shah", "gender": "female",
            "phone": "+91 98200 88991", "email": "tanvi.shah@gmail.com",
            "std": standards["Std. 10"], "board": boards["ICSE"], "course": "Std. 10 ICSE — Board Prep",
            "stage": "contacted", "priority": "hot", "source": "WhatsApp",
            "g_name": "Bhavin Shah", "g_phone": "+91 98200 88992", "g_rel": "Father",
            "follow_up_days": 2, "notes": "Sent syllabus brochure and previous year topper results via WhatsApp.",
        },
        {
            "num": "DEMO-LD-0008", "first": "Aditya", "last": "Verma", "gender": "male",
            "phone": "+91 98331 44556", "email": "aditya.verma@gmail.com",
            "std": standards["Std. 9"], "board": boards["CBSE"], "course": "Std. 9 CBSE — Science Olympiad",
            "stage": "contacted", "priority": "warm", "source": "Phone Enquiry",
            "g_name": "Kavita Verma", "g_phone": "+91 98331 44557", "g_rel": "Mother",
            "follow_up_days": 2, "notes": "Introductory phone call completed. Needs guidance on batch timing conflicts.",
        },

        # Stage 3: counselling_demo (3 leads)
        {
            "num": "DEMO-LD-0009", "first": "Kavya", "last": "Mehta", "gender": "female",
            "phone": "+91 98203 44556", "email": "kavya.mehta@gmail.com",
            "std": standards["Std. 10"], "board": boards["CBSE"], "course": "Std. 10 Science — JEE / NEET Track",
            "stage": "counselling_demo", "priority": "hot", "source": "WhatsApp",
            "g_name": "Rajiv Mehta", "g_phone": "+91 98203 44557", "g_rel": "Father",
            "follow_up_days": 1, "notes": "Mathematics demo class scheduled with Prof. Priya Mehta for tomorrow.",
        },
        {
            "num": "DEMO-LD-0010", "first": "Arjun", "last": "Naik", "gender": "male",
            "phone": "+91 99308 77110", "email": "arjun.naik@gmail.com",
            "std": standards["Std. 11 Science"], "board": boards["STATE"], "course": "Std. 11 Science — NEET Target",
            "stage": "counselling_demo", "priority": "hot", "source": "Walk-in",
            "g_name": "Manohar Naik", "g_phone": "+91 99308 77111", "g_rel": "Father",
            "follow_up_days": 1, "notes": "1-on-1 academic counselling completed. Demo session scheduled.",
        },
        {
            "num": "DEMO-LD-0011", "first": "Ananya", "last": "Sen", "gender": "female",
            "phone": "+91 98209 11220", "email": "ananya.sen@gmail.com",
            "std": standards["Std. 10"], "board": boards["ICSE"], "course": "Std. 10 ICSE — Full Course",
            "stage": "counselling_demo", "priority": "warm", "source": "Website",
            "g_name": "Debashis Sen", "g_phone": "+91 98209 11221", "g_rel": "Father",
            "follow_up_days": 2, "notes": "Demo session attended; feedback was exceptionally positive (Rating 5/5).",
        },

        # Stage 4: interested (3 leads)
        {
            "num": "DEMO-LD-0012", "first": "Saanvi", "last": "Kulkarni", "gender": "female",
            "phone": "+91 98702 33445", "email": "saanvi.kulkarni@gmail.com",
            "std": standards["Std. 9"], "board": boards["CBSE"], "course": "Std. 9 CBSE — Comprehensive",
            "stage": "interested", "priority": "hot", "source": "Website",
            "g_name": "Sachin Kulkarni", "g_phone": "+91 98702 33446", "g_rel": "Father",
            "follow_up_days": 1, "notes": "Attended demo class. Highly satisfied. Discussing installment options with father.",
        },
        {
            "num": "DEMO-LD-0013", "first": "Parth", "last": "More", "gender": "male",
            "phone": "+91 98675 22110", "email": "parth.more@gmail.com",
            "std": standards["Std. 10"], "board": boards["STATE"], "course": "Std. 10 State Board — Board Master",
            "stage": "interested", "priority": "hot", "source": "Referral",
            "g_name": "Ashok More", "g_phone": "+91 98675 22111", "g_rel": "Father",
            "follow_up_days": 2, "notes": "Friend studies in Class 10. Ready to enroll, requested batch timing confirmation.",
        },
        {
            "num": "DEMO-LD-0014", "first": "Ishaan", "last": "Gupta", "gender": "male",
            "phone": "+91 98205 77889", "email": "ishaan.gupta@gmail.com",
            "std": standards["Std. 11 Commerce"], "board": boards["CBSE"], "course": "Std. 11 Commerce — Accounts & Eco",
            "stage": "interested", "priority": "warm", "source": "Phone Enquiry",
            "g_name": "Ramesh Gupta", "g_phone": "+91 98205 77890", "g_rel": "Father",
            "follow_up_days": 2, "notes": "Interested in Accountancy faculty. Verified study materials and past question banks.",
        },

        # Stage 5: admission_pending (2 leads)
        {
            "num": "DEMO-LD-0015", "first": "Mihir", "last": "Joshi", "gender": "male",
            "phone": "+91 98209 66550", "email": "mihir.joshi@gmail.com",
            "std": standards["Std. 8"], "board": boards["CBSE"], "course": "Std. 8 CBSE — Foundation Batch",
            "stage": "admission_pending", "priority": "hot", "source": "Website",
            "g_name": "Anil Joshi", "g_phone": "+91 98209 66551", "g_rel": "Father",
            "follow_up_days": 1, "notes": "Admission form filled. Token payment of Rs. 5,000 promised by tomorrow.",
        },
        {
            "num": "DEMO-LD-0016", "first": "Diya", "last": "Sutar", "gender": "female",
            "phone": "+91 99670 11440", "email": "diya.sutar@gmail.com",
            "std": standards["Std. 9"], "board": boards["ICSE"], "course": "Std. 9 ICSE — Complete Package",
            "stage": "admission_pending", "priority": "hot", "source": "Walk-in",
            "g_name": "Santosh Sutar", "g_phone": "+91 99670 11441", "g_rel": "Father",
            "follow_up_days": 1, "notes": "Documents and photos received. Awaiting approval of 3-installment payment plan.",
        },

        # Stage 6: converted (2 leads - linked to demo students!)
        {
            "num": "DEMO-LD-0017", "first": "Advait", "last": "Pendse", "gender": "male",
            "phone": "+91 98201 77880", "email": "advait.pendse@demo.example.com",
            "std": standards["Std. 10"], "board": boards["CBSE"], "course": "Std. 10 CBSE — JEE Foundation",
            "stage": "converted", "priority": "hot", "source": "Website",
            "g_name": "Suresh Pendse", "g_phone": "+91 98201 77881", "g_rel": "Father",
            "converted_student_adm": "DEMO-ADM-2026-0001",
            "notes": "Admission successfully converted! Linked student profile created and first term fees paid.",
        },
        {
            "num": "DEMO-LD-0018", "first": "Neha", "last": "Karnik", "gender": "female",
            "phone": "+91 99306 44882", "email": "neha.karnik@demo.example.com",
            "std": standards["Std. 11 Science"], "board": boards["STATE"], "course": "Std. 11 Science — NEET Booster",
            "stage": "converted", "priority": "hot", "source": "Referral",
            "g_name": "Rajesh Karnik", "g_phone": "+91 99306 44883", "g_rel": "Father",
            "converted_student_adm": "DEMO-ADM-2026-0002",
            "notes": "Converted from enquiry to active student admission. ID card and welcome kit issued.",
        },

        # Stage 7: lost (2 leads)
        {
            "num": "DEMO-LD-0019", "first": "Sameer", "last": "Khan", "gender": "male",
            "phone": "+91 98200 33221", "email": "sameer.khan@gmail.com",
            "std": standards["Std. 10"], "board": boards["CBSE"], "course": "Std. 10 CBSE — Board Prep",
            "stage": "lost", "priority": "cold", "source": "Website",
            "g_name": "Farooq Khan", "g_phone": "+91 98200 33222", "g_rel": "Father",
            "lost_reason": "Fee budget exceeded",
            "lost_notes": "Offered 10% merit scholarship, but parent decided to opt for local home tuition.",
            "notes": "Closed enquiry due to fee constraints.",
        },
        {
            "num": "DEMO-LD-0020", "first": "Priya", "last": "Nair", "gender": "female",
            "phone": "+91 98199 44332", "email": "priya.nair@gmail.com",
            "std": standards["Std. 9"], "board": boards["STATE"], "course": "Std. 9 State Board",
            "stage": "lost", "priority": "cold", "source": "Walk-in",
            "g_name": "Gopalan Nair", "g_phone": "+91 98199 44333", "g_rel": "Father",
            "lost_reason": "Relocation to another city",
            "lost_notes": "Family relocating to Pune next month due to father's company transfer.",
            "notes": "Disqualified enquiry due to distance/relocation.",
        },
    ]

    leads_created = 0
    follow_ups_created = 0
    demo_classes_created = 0

    for l_data in lead_definitions:
        l_res = await db.execute(
            select(Lead).where(Lead.lead_number == l_data["num"])
        )
        lead_obj = l_res.scalar_one_or_none()
        if not lead_obj:
            converted_student = None
            if "converted_student_adm" in l_data:
                converted_student = demo_students.get(l_data["converted_student_adm"])

            next_fu_at = None
            if "follow_up_days" in l_data:
                next_fu_at = datetime.utcnow() + timedelta(days=l_data["follow_up_days"])

            lead_obj = Lead(
                institution_id=inst_id,
                lead_number=l_data["num"],
                academic_year_id=ay.id,
                standard_id=l_data["std"].id,
                board_id=l_data["board"].id,
                interested_course=l_data["course"],
                first_name=l_data["first"],
                last_name=l_data["last"],
                gender=l_data["gender"],
                phone=l_data["phone"],
                email=l_data["email"],
                guardian_name=l_data["g_name"],
                guardian_relation=l_data["g_rel"],
                guardian_phone=l_data["g_phone"],
                stage=l_data["stage"],
                priority=l_data["priority"],
                source=l_data["source"],
                assigned_to_id=counsellor_id,
                enquiry_date=today - timedelta(days=3),
                next_follow_up_at=next_fu_at,
                notes=l_data["notes"],
                converted_student_id=converted_student.id if converted_student else None,
                converted_at=datetime.utcnow() - timedelta(days=1) if converted_student else None,
                converted_by_id=counsellor_id if converted_student else None,
                lost_reason=l_data.get("lost_reason"),
                lost_notes=l_data.get("lost_notes"),
                is_active=True,
                is_demo=True,
                data_environment="TRAINING",
                demo_dataset_id=dataset_version,
            )
            db.add(lead_obj)
            await db.flush()
            leads_created += 1

            # Create Follow-up records
            fu_obj = LeadFollowUp(
                lead_id=lead_obj.id,
                institution_id=inst_id,
                follow_up_type="call" if l_data["source"] != "WhatsApp" else "whatsapp",
                stage_at_time=l_data["stage"],
                status="completed",
                completed_at=datetime.utcnow() - timedelta(days=1),
                outcome="interested" if l_data["stage"] not in ("lost", "junk") else "lost",
                remarks=f"Initial contact completed: {l_data['notes']}",
                next_follow_up_at=next_fu_at,
                performed_by_id=counsellor_id,
                is_demo=True,
                data_environment="TRAINING",
                demo_dataset_id=dataset_version,
            )
            db.add(fu_obj)
            follow_ups_created += 1

            # Create Demo Class for counselling_demo stage
            if l_data["stage"] == "counselling_demo":
                dc_obj = LeadDemoClass(
                    lead_id=lead_obj.id,
                    institution_id=inst_id,
                    standard_id=l_data["std"].id,
                    subject_id=demo_subject.id if demo_subject else None,
                    teacher_id=counsellor_id,
                    scheduled_at=datetime.utcnow() + timedelta(days=1),
                    status="scheduled",
                    feedback="Student is keen on interactive problem-solving techniques.",
                    rating=5,
                    is_demo=True,
                    data_environment="TRAINING",
                    demo_dataset_id=dataset_version,
                )
                db.add(dc_obj)
                demo_classes_created += 1

            # Create Communication Log entry
            comm_log = CommunicationLog(
                institution_id=inst_id,
                lead_id=lead_obj.id,
                channel="WHATSAPP" if l_data["source"] == "WhatsApp" else "SMS",
                recipient_type="LEAD",
                recipient_name=f"{l_data['first']} {l_data['last']}",
                recipient_destination=l_data["phone"],
                subject="Welcome to Prashant Academy",
                content=f"Dear {l_data['first']}, thank you for enquiring about {l_data['course']}. Our counsellor will connect with you shortly.",
                status="DELIVERED",
                sender_id=counsellor_id,
                is_demo=True,
                data_environment="TRAINING",
                demo_dataset_id=dataset_version,
            )
            db.add(comm_log)

    await db.commit()
    logger.info(
        f"Training dataset '{dataset_version}' seeded: {leads_created} leads, "
        f"{follow_ups_created} follow-ups, {demo_classes_created} demo classes, "
        f"{len(demo_students)} demo students."
    )
    return {
        "leads_created": leads_created,
        "follow_ups_created": follow_ups_created,
        "demo_classes_created": demo_classes_created,
        "demo_students": len(demo_students),
    }


async def reset_training_environment(
    db: AsyncSession,
    user_id: Optional[int] = None,
    initiated_by: str = "admin",
    force: bool = False,
    restore_baseline: bool = True,
) -> Dict[str, Any]:
    """
    Dependency-aware reset engine that wipes ONLY the isolated training tenant (PA001-DEMO)
    and cleanly restores the canonical baseline dataset.
    ABSOLUTE PRODUCTION SAFETY: Raises ValueError if attempted on production institution id 1.
    """
    start_time = time.time()
    inst = await get_or_create_training_institution(db)
    inst_id = inst.id

    # CRITICAL PRODUCTION SAFETY LOCK
    if inst_id == 1 or inst.code != TRAINING_INSTITUTION_CODE:
        raise ValueError(
            f"CRITICAL SAFETY VIOLATION: Cannot reset production institution (id={inst_id}, code={inst.code})!"
        )

    # Check active training sessions
    if not force:
        cutoff = datetime.utcnow() - timedelta(minutes=15)
        active_sess_count = (
            await db.execute(
                select(func.count(TrainingSession.id)).where(
                    and_(
                        TrainingSession.is_active == True,
                        TrainingSession.last_active_at >= cutoff,
                        TrainingSession.user_id != user_id if user_id else True,
                    )
                )
            )
        ).scalar() or 0

        if active_sess_count > 0:
            raise ValueError(
                f"Cannot reset training environment: {active_sess_count} other user session(s) are currently active. "
                "Use force=True if authorized to override."
            )

    records_cleared = 0

    # 1. Clear Training Communication Logs
    del_comm = await db.execute(
        delete(CommunicationLog).where(
            or_(
                CommunicationLog.institution_id == inst_id,
                CommunicationLog.is_demo == True,
            )
        )
    )
    records_cleared += del_comm.rowcount or 0

    # 2. Clear Demo Classes
    del_dc = await db.execute(
        delete(LeadDemoClass).where(
            or_(
                LeadDemoClass.institution_id == inst_id,
                LeadDemoClass.is_demo == True,
            )
        )
    )
    records_cleared += del_dc.rowcount or 0

    # 3. Clear Follow-ups
    del_fu = await db.execute(
        delete(LeadFollowUp).where(
            or_(
                LeadFollowUp.institution_id == inst_id,
                LeadFollowUp.is_demo == True,
            )
        )
    )
    records_cleared += del_fu.rowcount or 0

    # 4. Clear Leads
    del_leads = await db.execute(
        delete(Lead).where(
            or_(
                Lead.institution_id == inst_id,
                Lead.is_demo == True,
            )
        )
    )
    records_cleared += del_leads.rowcount or 0

    # 5. Clear Demo Students and all child dependencies
    demo_st_ids_res = await db.execute(
        select(Student.id).where(
            or_(Student.institution_id == inst_id, Student.is_demo == True)
        )
    )
    demo_st_ids = demo_st_ids_res.scalars().all()

    if demo_st_ids:
        del_rcp = await db.execute(
            delete(PaymentReceipt).where(
                or_(
                    PaymentReceipt.student_id.in_(demo_st_ids),
                    PaymentReceipt.receipt_number.like("DEMO-%"),
                )
            )
        )
        records_cleared += del_rcp.rowcount or 0

        del_pay = await db.execute(
            delete(Payment).where(
                or_(
                    Payment.student_id.in_(demo_st_ids),
                    Payment.is_demo == True,
                )
            )
        )
        records_cleared += del_pay.rowcount or 0

        del_enr = await db.execute(
            delete(StudentEnrollment).where(
                StudentEnrollment.student_id.in_(demo_st_ids)
            )
        )
        records_cleared += del_enr.rowcount or 0

        del_guard = await db.execute(
            delete(Guardian).where(
                Guardian.student_id.in_(demo_st_ids)
            )
        )
        records_cleared += del_guard.rowcount or 0

        del_st = await db.execute(
            delete(Student).where(Student.id.in_(demo_st_ids))
        )
        records_cleared += del_st.rowcount or 0

    # 7. Close all active training sessions
    await db.execute(
        delete(TrainingSession).where(TrainingSession.is_active == True)
    )

    await db.flush()

    records_seeded = 0
    if restore_baseline:
        seed_result = await seed_training_dataset(
            db, dataset_version=ACTIVE_DATASET_VERSION, seed_user_id=user_id
        )
        records_seeded = (
            seed_result.get("leads_created", 0)
            + seed_result.get("follow_ups_created", 0)
            + seed_result.get("demo_classes_created", 0)
            + seed_result.get("demo_students", 0)
        )

    duration_ms = int((time.time() - start_time) * 1000)

    # 8. Record in training_reset_logs
    reset_log = TrainingResetLog(
        user_id=user_id,
        initiated_by=initiated_by,
        dataset_version=ACTIVE_DATASET_VERSION,
        records_cleared=records_cleared,
        records_seeded=records_seeded,
        duration_ms=duration_ms,
        status="SUCCESS",
    )
    db.add(reset_log)

    # Update config
    cfg_res = await db.execute(select(TrainingEnvironmentConfig).limit(1))
    cfg = cfg_res.scalar_one_or_none()
    if cfg:
        cfg.last_reset_at = datetime.utcnow()
        cfg.last_reset_by_id = user_id
        cfg.last_reset_status = "SUCCESS"

    await db.commit()
    logger.info(
        f"Training environment reset completed successfully in {duration_ms}ms: "
        f"{records_cleared} records cleared, {records_seeded} records seeded."
    )

    return {
        "status": "SUCCESS",
        "dataset_version": ACTIVE_DATASET_VERSION,
        "records_cleared": records_cleared,
        "records_seeded": records_seeded,
        "duration_ms": duration_ms,
        "timestamp": datetime.utcnow().isoformat(),
    }
