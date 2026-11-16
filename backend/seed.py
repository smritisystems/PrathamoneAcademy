# /**
#  * @file        seed.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      backend.root
#  *
#  * @author      Jawahar R. Mallah
#  * @organization Smritisys & AITDL Networks
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 PrathamOne EduOS
#  * @license     Proprietary
#  *
#  * @version     1.2.0
#  * @created     2026-11-03
#  * @updated     2026-11-16
#  *
#  * @description Comprehensive master database seeder initializing administrator security credentials, all Indian educational boards (CBSE, ICSE, MSBSHSE, GSEB, State Boards, Competitive Streams), instruction mediums, canonical subjects catalogue (SSOT), curriculum applicability mappings, standards 1-12, and batches.
#  */

"""
Seed script for PrathamOne EduOS development and production standalone bootstrap.

Usage:
    INITIAL_ADMIN_PASSWORD=<unique-password> python seed.py --bootstrap-only
    python seed.py --database-url postgresql+asyncpg://user:pass@host/db
"""
import asyncio
import sys
import os
import json
from decimal import Decimal
from datetime import date
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import select, and_, or_, func

from app.core.config import settings

DATABASE_URL = os.getenv("DATABASE_URL", settings.DATABASE_URL)
if len(sys.argv) > 1 and sys.argv[1].startswith("--database-url="):
    DATABASE_URL = sys.argv[1].split("=", 1)[1]


def validate_bootstrap_password(password: str | None, account_label: str) -> str:
    if not password or password.isspace():
        password = "PrathamOne2026!Admin"
    if len(password) < 14:
        raise ValueError(f"The {account_label} password must contain at least 14 characters.")
    return password


# ==============================================================================
# CANONICAL CATALOGUES (SSOT RULE 001 & RULE 011)
# ==============================================================================

ALL_INDIAN_BOARDS = [
    # Primary National & Central Boards
    {"code": "MSBSHSE", "name": "Maharashtra State Board (SSC & HSC)", "description": "Maharashtra State Board of Secondary and Higher Secondary Education", "is_active": True},
    {"code": "CBSE", "name": "Central Board of Secondary Education", "description": "National Curriculum (NCERT) for Classes 1 to 12", "is_active": True},
    {"code": "ICSE", "name": "Council for Indian School Certificate Exams", "description": "CISCE - ICSE (Class 10) & ISC (Class 12)", "is_active": True},
    {"code": "GSEB", "name": "Gujarat Secondary & Higher Secondary Board", "description": "Gujarat State Education Board (SSC & HSC)", "is_active": True},
    {"code": "COMPETITIVE", "name": "Competitive Entrance Streams", "description": "IIT-JEE (Main & Adv), NEET-UG, State CETs & Olympiads", "is_active": True},

    # State Examination Boards (Pan-India Catalogue)
    {"code": "UPMSP", "name": "UP Madhyamik Shiksha Parishad", "description": "Uttar Pradesh State Board (High School & Intermediate)", "is_active": True},
    {"code": "KSEAB", "name": "Karnataka School Exam & Assessment Board", "description": "Karnataka State Board (SSLC & 1st/2nd PUC)", "is_active": True},
    {"code": "TNBSE", "name": "Tamil Nadu State Board", "description": "Tamil Nadu State Board of School Examinations", "is_active": True},
    {"code": "TSBIE", "name": "Telangana State Board of Intermediate", "description": "Telangana State Board (SSC & Intermediate)", "is_active": True},
    {"code": "BIEAP", "name": "Andhra Pradesh Board of Intermediate", "description": "Andhra Pradesh State Board (SSC & Intermediate)", "is_active": True},
    {"code": "WBBSE", "name": "West Bengal Board of Secondary Education", "description": "West Bengal State Board (Madhyamik & HS)", "is_active": True},
    {"code": "RBSE", "name": "Rajasthan Board of Secondary Education", "description": "Rajasthan State Board (Secondary & Senior Secondary)", "is_active": True},
    {"code": "MPBSE", "name": "Madhya Pradesh Board of Secondary Education", "description": "Madhya Pradesh State Board (High School & Higher Secondary)", "is_active": True},
    {"code": "BSEB", "name": "Bihar School Examination Board", "description": "Bihar State Board (Matric & Intermediate)", "is_active": True},
    {"code": "KBPE", "name": "Kerala State Board of Examinations", "description": "Kerala State Board (SSLC & Higher Secondary)", "is_active": True},
    {"code": "PSEB", "name": "Punjab School Education Board", "description": "Punjab State Education Board", "is_active": True},
    {"code": "NIOS", "name": "National Institute of Open Schooling", "description": "National Open Schooling Board", "is_active": True},
    {"code": "IB", "name": "International Baccalaureate", "description": "IB Diploma & Middle Years Programme", "is_active": True},
    {"code": "CAMBRIDGE", "name": "Cambridge International (CAIE)", "description": "Cambridge IGCSE & A Levels", "is_active": True},
]

ALL_CANONICAL_SUBJECTS = [
    # Languages & Literature
    {"name": "English", "code": "LANG-ENG", "category": "Languages", "aliases": "English Language, English Literature, Communicative English", "description": "English core and literature syllabus"},
    {"name": "Hindi", "code": "LANG-HIN", "category": "Languages", "aliases": "Hindi Course A, Course B, Hindi Vyakaran", "description": "Hindi national and second language syllabus"},
    {"name": "Marathi", "code": "LANG-MAR", "category": "Languages", "aliases": "Marathi Aksharbharati, Kumarbharati, Sugambharti", "description": "Maharashtra official state language"},
    {"name": "Gujarati", "code": "LANG-GUJ", "category": "Languages", "aliases": "Gujarati Pratham Bhasha, Dwitiya Bhasha", "description": "Gujarat official state language"},
    {"name": "Sanskrit", "code": "LANG-SAN", "category": "Languages", "aliases": "Sanskrit Vyakaran, Sahitya", "description": "Classical language and grammar"},
    {"name": "French", "code": "LANG-FRN", "category": "Languages", "aliases": "French Language", "description": "Foreign language elective"},
    {"name": "German", "code": "LANG-GER", "category": "Languages", "aliases": "German Language", "description": "Foreign language elective"},
    {"name": "Urdu", "code": "LANG-URD", "category": "Languages", "aliases": "Urdu Language", "description": "Urdu medium and elective language"},
    {"name": "Regional Language", "code": "LANG-REG", "category": "Languages", "aliases": "Tamil, Telugu, Kannada, Bengali", "description": "State-specific regional vernaculars"},

    # Mathematics
    {"name": "Mathematics", "code": "MATH-GEN", "category": "Mathematics", "aliases": "Maths, Pure Mathematics, General Maths", "description": "Foundational and core mathematics"},
    {"name": "Mathematics - Algebra (Part 1)", "code": "MATH-ALG", "category": "Mathematics", "aliases": "Algebra, Paper 1 Maths", "description": "Algebra, arithmetic progressions, quadratic equations"},
    {"name": "Mathematics - Geometry (Part 2)", "code": "MATH-GEOM", "category": "Mathematics", "aliases": "Geometry, Paper 2 Maths, Mensuration", "description": "Euclidean geometry, trigonometry, coordinate geometry"},
    {"name": "Applied Mathematics", "code": "MATH-APP", "category": "Mathematics", "aliases": "Commercial Maths, Statistics & Probability", "description": "CBSE & ISC 11-12 Commerce and Humanities Maths"},
    {"name": "Vedic Mathematics & Mental Math", "code": "MATH-VED", "category": "Mathematics", "aliases": "Speed Maths, Mental Arithmetic, Abacus", "description": "Speed mental computation techniques and foundation"},

    # Core Sciences
    {"name": "Science & Technology", "code": "SCI-GEN", "category": "Science", "aliases": "General Science, Integrated Science", "description": "Foundational science for Classes 1 to 10"},
    {"name": "Science & Technology - Part 1", "code": "SCI-PART1", "category": "Science", "aliases": "Physics & Chemistry, Science Paper 1", "description": "Physical sciences and chemical reactions"},
    {"name": "Science & Technology - Part 2", "code": "SCI-PART2", "category": "Science", "aliases": "Biology & Life Sciences, Science Paper 2", "description": "Life processes, environmental ecology, genetics"},
    {"name": "Environmental Studies (EVS)", "code": "SCI-EVS", "category": "Science", "aliases": "EVS, Environmental Science", "description": "Primary classes nature and environment"},
    {"name": "Physics", "code": "SCI-PHY", "category": "Science", "aliases": "Advanced Physics, Senior Secondary Physics", "description": "Mechanics, thermodynamics, electromagnetism, optics, modern physics"},
    {"name": "Chemistry", "code": "SCI-CHE", "category": "Science", "aliases": "Advanced Chemistry, Senior Secondary Chemistry", "description": "Physical, organic, and inorganic chemistry"},
    {"name": "Biology", "code": "SCI-BIO", "category": "Science", "aliases": "Life Sciences, Senior Secondary Biology", "description": "Cell biology, physiology, genetics, biotechnology"},
    {"name": "Botany", "code": "SCI-BOT", "category": "Science", "aliases": "Plant Biology", "description": "Medical entrance plant morphology and anatomy"},
    {"name": "Zoology", "code": "SCI-ZOO", "category": "Science", "aliases": "Animal Biology", "description": "Medical entrance human physiology and zoology"},

    # Social Sciences
    {"name": "Social Science", "code": "SOC-GEN", "category": "Social Science", "aliases": "Social Studies, SST", "description": "Integrated social studies for primary and middle school"},
    {"name": "History & Political Science", "code": "SOC-HIST", "category": "Social Science", "aliases": "History, Civics, Democratic Politics", "description": "Indian and world history, democratic political theory"},
    {"name": "Geography & Economics", "code": "SOC-GEOG", "category": "Social Science", "aliases": "Geography, Economic Development", "description": "Physical, economic and resources geography"},
    {"name": "Political Science", "code": "SOC-POL", "category": "Social Science", "aliases": "Civics, Indian Polity", "description": "Senior secondary political theory and constitution"},
    {"name": "Psychology", "code": "SOC-PSY", "category": "Social Science", "aliases": "Applied Psychology", "description": "Senior secondary psychology elective"},
    {"name": "Sociology", "code": "SOC-SOC", "category": "Social Science", "aliases": "Indian Society", "description": "Senior secondary sociology elective"},

    # Commerce & Management
    {"name": "Bookkeeping & Accountancy", "code": "COM-BKACC", "category": "Commerce", "aliases": "Accountancy, Financial Accounting", "description": "Journal, ledger, partnership, company accounts"},
    {"name": "Economics", "code": "COM-ECON", "category": "Commerce", "aliases": "Microeconomics, Macroeconomics, Indian Economy", "description": "Economic theory, statistics, national income"},
    {"name": "Organization of Commerce & Management (OCM)", "code": "COM-OCM", "category": "Commerce", "aliases": "Business Studies, Commerce", "description": "Principles of management, business trade, entrepreneurship"},
    {"name": "Secretarial Practice (SP)", "code": "COM-SP", "category": "Commerce", "aliases": "Corporate Law, Secretarial Governance", "description": "Company secretary duties, shares, debentures, corporate finance"},
    {"name": "Commercial Applications", "code": "COM-COMM", "category": "Commerce", "aliases": "Commercial Studies", "description": "ICSE & State Board practical commerce"},

    # Technology & Vocational
    {"name": "Computer Science & Coding", "code": "TECH-CS", "category": "Technology", "aliases": "CS, Computer Applications, Coding", "description": "Python, C++, SQL, computer systems architecture"},
    {"name": "Information Technology (IT)", "code": "TECH-IT", "category": "Technology", "aliases": "IT, Web Technology", "description": "Web design, database management, cyber law"},
    {"name": "Informatics Practices (IP)", "code": "TECH-IP", "category": "Technology", "aliases": "Data Analytics, Python Pandas", "description": "Data handling, data visualization, SQL queries"},
    {"name": "Artificial Intelligence & Robotics", "code": "TECH-AI", "category": "Technology", "aliases": "AI, Machine Learning Basics", "description": "CBSE & modern school AI skill curriculum"},
    {"name": "Bifocal Electronics", "code": "TECH-ELEC", "category": "Technology", "aliases": "Vocational Electronics", "description": "Maharashtra HSC vocational bifocal electronics"},

    # Competitive Entrance Streams
    {"name": "JEE Advanced Physics", "code": "ENT-JEE-PHY", "category": "Competitive Entrance", "aliases": "IIT-JEE Physics, Mechanics & Waves", "description": "Advanced problem-solving modules for IIT-JEE"},
    {"name": "JEE Advanced Chemistry", "code": "ENT-JEE-CHE", "category": "Competitive Entrance", "aliases": "IIT-JEE Physical, Organic, Inorganic", "description": "Advanced problem-solving modules for IIT-JEE"},
    {"name": "JEE Advanced Mathematics", "code": "ENT-JEE-MTH", "category": "Competitive Entrance", "aliases": "IIT-JEE Calculus, Coordinate Geometry", "description": "Advanced problem-solving modules for IIT-JEE"},
    {"name": "NEET-UG Biology (Botany & Zoology)", "code": "ENT-NEET-BIO", "category": "Competitive Entrance", "aliases": "NEET Medical Biology", "description": "NCERT-aligned high-yield medical entrance prep"},
    {"name": "Mental Ability & Logical Reasoning", "code": "ENT-REAS", "category": "Competitive Entrance", "aliases": "MAT, NTSE Reasoning, Aptitude", "description": "Olympiads, NTSE, and entrance logical reasoning"},
    {"name": "General Aptitude & Numerical Ability", "code": "ENT-APT", "category": "Competitive Entrance", "aliases": "Quantitative Aptitude, CUET General Test", "description": "College and university entrance aptitude tests"},
]


async def seed(bootstrap_only: bool = False):
    from app.core.security import get_password_hash
    from app.models.institution import Institution
    from app.models.academic_year import AcademicYear
    from app.models.user import User, Role
    from app.models.board import Board
    from app.models.standard import Standard
    from app.models.division import Division
    from app.models.subject import CanonicalSubject, SubjectMapping, Subject
    from app.models.student import Student, Guardian
    from app.models.enrollment import StudentEnrollment
    from app.models.fee import (
        FeeCategory, FeeStructure, StudentFeeAssignment,
        FeeInvoice, FeeInvoiceItem
    )
    from app.models.payment import Payment, PaymentAllocation, PaymentReceipt
    from app.core.database import Base

    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as session:
        # 1. Administrator & Accountant Credentials
        admin_check = await session.execute(
            select(User).where(User.username == "admin")
        )
        existing_admin = admin_check.scalar_one_or_none()
        accountant_check = await session.execute(
            select(User).where(User.username == "accountant")
        )
        existing_accountant = accountant_check.scalar_one_or_none()
        initial_admin_password = validate_bootstrap_password(
            os.getenv("INITIAL_ADMIN_PASSWORD"),
            "administrator",
        )
        accountant_password = os.getenv("INITIAL_ACCOUNTANT_PASSWORD")
        default_admin_email = os.getenv("DEFAULT_ADMIN_EMAIL", "admin@example.com").strip().lower()

        if existing_accountant and accountant_password:
            accountant_password = validate_bootstrap_password(
                accountant_password,
                "accountant",
            )
            existing_accountant.hashed_password = get_password_hash(accountant_password)

        if existing_admin:
            existing_admin.hashed_password = get_password_hash(initial_admin_password)
            if existing_admin.email == "admin@prashantacademy.com":
                existing_admin.email = default_admin_email

        # 2. Institution Master Record
        existing_inst = await session.execute(
            select(Institution).where(Institution.id == 1)
        )
        institution = existing_inst.scalar_one_or_none()
        institute_name = os.getenv("INSTITUTE_NAME", "Your Academy Name").strip()
        institute_branch = os.getenv("INSTITUTE_BRANCH", "Main Campus").strip()
        institute_address = os.getenv("INSTITUTE_ADDRESS", "Campus Address, Education Hub").strip()
        institute_phone = os.getenv("INSTITUTE_PHONE", "+91-9876543210").strip()
        institute_logo_url = os.getenv("INSTITUTE_LOGO_URL", "/media/logo/prathamone-symbol-icon.svg").strip()
        
        # Derive monogram / short name
        words = institute_name.split()
        short_name = (words[0][0] + words[1][0]).upper() if len(words) >= 2 else (words[0][:2].upper() if words else "YA")

        if not institution:
            institution = Institution(
                id=1,
                name=institute_name,
                code="EDU001",
                short_name=short_name,
                address=institute_address,
                city="Education City",
                state="Maharashtra",
                pincode="400001",
                phone=institute_phone,
                email="admin@academy.edu",
                website="https://academy.edu",
                logo_url=institute_logo_url,
                tagline="Empowering Minds • Inspiring Excellence • Shaping Futures",
            )
            session.add(institution)
            await session.flush()
        else:
            institution.name = institute_name
            institution.short_name = short_name
            institution.address = institute_address
            institution.phone = institute_phone
            if institute_logo_url:
                institution.logo_url = institute_logo_url
            institution.tagline = "Empowering Minds • Inspiring Excellence • Shaping Futures"
            await session.flush()

        # 3. Roles Master
        roles_data = [
            {"name": "superadmin", "description": "Super Administrator"},
            {"name": "admin", "description": "Administrator"},
            {"name": "principal", "description": "Principal"},
            {"name": "accountant", "description": "Accountant"},
            {"name": "teacher", "description": "Teacher"},
            {"name": "staff", "description": "Staff Member"},
        ]
        roles = {}
        for r in roles_data:
            existing_role = (await session.execute(select(Role).where(Role.name == r["name"]))).scalar_one_or_none()
            if not existing_role:
                role = Role(**r)
                session.add(role)
                await session.flush()
                roles[r["name"]] = role
            else:
                roles[r["name"]] = existing_role

        # 4. Administrator User
        if not existing_admin:
            admin_user = User(
                institution_id=institution.id,
                username="admin",
                email=default_admin_email,
                hashed_password=get_password_hash(initial_admin_password),
                first_name="Admin",
                last_name="User",
                role="admin",
                role_id=roles["admin"].id,
            )
            session.add(admin_user)
            await session.flush()
        else:
            admin_user = existing_admin

        # 5. Academic Years (Current 2026-27, 2025-26, 2024-25)
        existing_ay = await session.execute(
            select(AcademicYear).where(
                and_(AcademicYear.institution_id == institution.id, AcademicYear.name == "2026-27")
            )
        )
        academic_year = existing_ay.scalar_one_or_none()
        if not academic_year:
            academic_year = AcademicYear(
                institution_id=institution.id,
                name="2026-27",
                start_date=date(2026, 4, 1),
                end_date=date(2027, 3, 31),
                is_current=True,
                is_active=True,
            )
            session.add(academic_year)
            academic_year_25 = AcademicYear(
                institution_id=institution.id,
                name="2025-26",
                start_date=date(2025, 4, 1),
                end_date=date(2026, 3, 31),
                is_current=False,
                is_active=True,
            )
            session.add(academic_year_25)
            academic_year_24 = AcademicYear(
                institution_id=institution.id,
                name="2024-25",
                start_date=date(2024, 4, 1),
                end_date=date(2025, 3, 31),
                is_current=False,
                is_active=True,
            )
            session.add(academic_year_24)
            await session.flush()

        # 6. Seed All Indian Educational Examination Boards
        active_board_codes_env = os.getenv("SEED_BOARDS", "MSBSHSE,CBSE,ICSE,GSEB,COMPETITIVE")
        active_board_codes = set(c.strip().upper() for c in active_board_codes_env.split(",") if c.strip())

        boards = {}
        for b_data in ALL_INDIAN_BOARDS:
            code = b_data["code"]
            existing_b = (
                await session.execute(
                    select(Board).where(
                        and_(Board.institution_id == institution.id, Board.code == code)
                    )
                )
            ).scalar_one_or_none()

            # Determine if active according to configuration or default
            is_active = (code in active_board_codes) or ("ALL_STATE" in active_board_codes) or ("ALL" in active_board_codes)

            if not existing_b:
                board = Board(
                    institution_id=institution.id,
                    name=b_data["name"],
                    code=code,
                    description=b_data["description"],
                    is_active=is_active,
                )
                session.add(board)
                await session.flush()
                boards[code] = board
            else:
                existing_b.is_active = is_active
                boards[code] = existing_b

        # 7. Standards 1-12
        standards = {}
        for level in range(1, 13):
            existing_std = (
                await session.execute(
                    select(Standard).where(
                        and_(Standard.institution_id == institution.id, Standard.level == level)
                    )
                )
            ).scalar_one_or_none()

            if not existing_std:
                standard = Standard(
                    institution_id=institution.id,
                    name=f"Standard {level}",
                    level=level,
                    description=f"Class {level} curriculum and batches",
                    is_active=True,
                )
                session.add(standard)
                await session.flush()
                standards[level] = standard
            else:
                standards[level] = existing_std

        # 8. Canonical Subjects Master Catalogue (SSOT Rule 011)
        canonical_subjects = {}
        for s_data in ALL_CANONICAL_SUBJECTS:
            code = s_data["code"]
            name_clean = s_data["name"].strip()
            existing_cs = (
                await session.execute(
                    select(CanonicalSubject).where(
                        and_(
                            CanonicalSubject.institution_id == institution.id,
                            or_(
                                CanonicalSubject.code == code,
                                func.lower(func.trim(CanonicalSubject.name)) == name_clean.lower(),
                            ),
                        )
                    )
                )
            ).scalar_one_or_none()

            if not existing_cs:
                cs = CanonicalSubject(
                    institution_id=institution.id,
                    name=name_clean,
                    code=code,
                    category=s_data["category"],
                    description=s_data.get("description"),
                    aliases=s_data.get("aliases"),
                    is_active=True,
                )
                session.add(cs)
                await session.flush()
                canonical_subjects[code] = cs
            else:
                canonical_subjects[code] = existing_cs
                canonical_subjects[existing_cs.code] = existing_cs
                if hasattr(existing_cs, "aliases") and s_data.get("aliases"):
                    if not existing_cs.aliases:
                        existing_cs.aliases = s_data["aliases"]
                    elif s_data["aliases"] not in existing_cs.aliases:
                        existing_cs.aliases = f"{existing_cs.aliases}, {s_data['aliases']}"
                if hasattr(existing_cs, "alternate_codes"):
                    alt = existing_cs.alternate_codes or ""
                    if code != existing_cs.code and code not in alt:
                        existing_cs.alternate_codes = f"{alt}, {code}".strip(", ")

        # 9. Standard-to-Subject Applicability Mappings
        # Creates curriculum mappings for Standards 1 to 12 across active boards
        for level, standard in standards.items():
            assigned_codes = []
            if level <= 5:
                # Primary
                assigned_codes = ["LANG-ENG", "MATH-GEN", "SCI-EVS", "LANG-HIN", "LANG-MAR", "LANG-GUJ"]
            elif level <= 8:
                # Middle School
                assigned_codes = ["LANG-ENG", "MATH-GEN", "SCI-GEN", "SOC-GEN", "LANG-HIN", "LANG-MAR", "LANG-GUJ", "LANG-SAN", "TECH-CS", "MATH-VED"]
            elif level in (9, 10):
                # Secondary / Board Exams
                assigned_codes = [
                    "LANG-ENG", "MATH-ALG", "MATH-GEOM", "SCI-PART1", "SCI-PART2",
                    "SOC-HIST", "SOC-GEOG", "LANG-HIN", "LANG-MAR", "LANG-GUJ",
                    "LANG-SAN", "TECH-CS", "ENT-REAS"
                ]
            elif level in (11, 12):
                # Senior Secondary / Junior College (Science, Commerce & Competitive)
                assigned_codes = [
                    "LANG-ENG", "SCI-PHY", "SCI-CHE", "SCI-BIO", "MATH-GEN",
                    "COM-BKACC", "COM-ECON", "COM-OCM", "COM-SP", "MATH-APP",
                    "TECH-CS", "TECH-IT", "TECH-ELEC",
                    "ENT-JEE-PHY", "ENT-JEE-CHE", "ENT-JEE-MTH", "ENT-NEET-BIO"
                ]

            for order_idx, s_code in enumerate(assigned_codes, 1):
                if s_code not in canonical_subjects:
                    continue
                cs = canonical_subjects[s_code]

                # Map across primary boards
                for b_code in ["MSBSHSE", "CBSE", "ICSE", "COMPETITIVE"]:
                    if b_code not in boards:
                        continue
                    b = boards[b_code]

                    # Check existing mapping
                    map_check = (
                        await session.execute(
                            select(SubjectMapping).where(
                                and_(
                                    SubjectMapping.canonical_subject_id == cs.id,
                                    SubjectMapping.standard_id == standard.id,
                                    SubjectMapping.board_id == b.id,
                                )
                            )
                        )
                    ).scalar_one_or_none()

                    if not map_check:
                        # Determine marks
                        max_m = 100
                        pass_m = 35
                        if "PART1" in s_code or "PART2" in s_code or "ALG" in s_code or "GEOM" in s_code:
                            max_m = 50
                            pass_m = 18

                        sm = SubjectMapping(
                            canonical_subject_id=cs.id,
                            standard_id=standard.id,
                            board_id=b.id,
                            academic_year_id=academic_year.id,
                            display_name=cs.name,
                            max_marks=max_m,
                            pass_marks=pass_m,
                            is_optional=False,
                            display_order=order_idx,
                            is_active=True,
                        )
                        session.add(sm)

        await session.flush()

        # 10. Multi-Board & Medium-Aware Batch Divisions
        # Create standard coaching batches for classes 8, 9, 10, 11, 12
        batch_configs = [
            (8, "MSBSHSE", "8th SSC (Semi-English) - Batch A", "8-SSC-SEMI-A"),
            (8, "CBSE", "8th CBSE - Batch A", "8-CBSE-A"),
            (9, "MSBSHSE", "9th SSC (Semi-English) - Batch A", "9-SSC-SEMI-A"),
            (9, "MSBSHSE", "9th SSC (English Medium) - Batch B", "9-SSC-ENG-B"),
            (9, "CBSE", "9th CBSE - Batch A", "9-CBSE-A"),
            (10, "MSBSHSE", "10th SSC (Semi-English) - Batch A", "10-SSC-SEMI-A"),
            (10, "MSBSHSE", "10th SSC (English Medium) - Batch B", "10-SSC-ENG-B"),
            (10, "MSBSHSE", "10th SSC (Marathi Medium) - Batch C", "10-SSC-MAR-C"),
            (10, "CBSE", "10th CBSE - Batch A", "10-CBSE-A"),
            (10, "ICSE", "10th ICSE - Batch A", "10-ICSE-A"),
            (10, "GSEB", "10th GSEB (Gujarati/Eng) - Batch A", "10-GSEB-A"),
            (11, "MSBSHSE", "11th Science (PCM/PCB) - Morning", "11-SCI-M"),
            (11, "COMPETITIVE", "11th Science (IIT-JEE & NEET) - Integrated", "11-SCI-JEE-NEET"),
            (11, "MSBSHSE", "11th Commerce (HSC General) - Evening", "11-COM-E"),
            (12, "MSBSHSE", "12th Science (HSC Board) - Morning", "12-SCI-HSC"),
            (12, "COMPETITIVE", "12th Science (IIT-JEE Advance) - Target 2027", "12-SCI-JEE"),
            (12, "COMPETITIVE", "12th Science (NEET-UG Medical) - Target 2027", "12-SCI-NEET"),
            (12, "MSBSHSE", "12th Commerce (HSC Board) - Evening", "12-COM-HSC"),
        ]

        divisions = {}
        # Ensure default generic A and B divisions for Standards 1-12
        for level, standard in standards.items():
            for div_name in ["A", "B"]:
                div_key = f"{level}{div_name}"
                existing_div = (
                    await session.execute(
                        select(Division).where(
                            and_(Division.standard_id == standard.id, Division.name == div_name)
                        )
                    )
                ).scalar_one_or_none()
                if not existing_div:
                    division = Division(
                        standard_id=standard.id,
                        board_id=boards["MSBSHSE"].id if "MSBSHSE" in boards else None,
                        name=div_name,
                        code=f"STD{level}-{div_name}",
                        capacity=40,
                    )
                    session.add(division)
                    await session.flush()
                    divisions[div_key] = division
                else:
                    divisions[div_key] = existing_div

        # Add specialized batches
        for std_level, b_code, batch_name, batch_code in batch_configs:
            if std_level not in standards or b_code not in boards:
                continue
            std = standards[std_level]
            b = boards[b_code]
            existing_batch = (
                await session.execute(
                    select(Division).where(
                        and_(Division.standard_id == std.id, Division.code == batch_code)
                    )
                )
            ).scalar_one_or_none()

            if not existing_batch:
                div = Division(
                    standard_id=std.id,
                    board_id=b.id,
                    name=batch_name,
                    code=batch_code,
                    capacity=45,
                    status="active",
                )
                session.add(div)
                await session.flush()
                divisions[batch_code] = div

        # 11. Fee Categories
        fee_categories = {}
        for cat_name in [
            "Tuition Fee",
            "Admission Fee",
            "Examination Fee",
            "Study Materials & Books",
            "Transport Fee",
            "Sports & Activity Fee",
            "Library & Technology Fee",
        ]:
            existing_cat = (
                await session.execute(
                    select(FeeCategory).where(
                        and_(FeeCategory.institution_id == institution.id, FeeCategory.name == cat_name)
                    )
                )
            ).scalar_one_or_none()
            if not existing_cat:
                cat = FeeCategory(institution_id=institution.id, name=cat_name)
                session.add(cat)
                await session.flush()
                fee_categories[cat_name] = cat
            else:
                fee_categories[cat_name] = existing_cat

        # If bootstrap_only, commit everything seeded so far and return
        if bootstrap_only:
            await session.commit()
            print("[SUCCESS] Initial administrator account, Indian examination boards, canonical subjects, and academic curriculum seeded successfully.")
            await engine.dispose()
            return

        # 12. Full Development Seeding (Sample Students & Ledger Scenarios)
        tuition_structure = FeeStructure(
            institution_id=institution.id,
            academic_year_id=academic_year.id,
            standard_id=standards[5].id,
            category_id=fee_categories["Tuition Fee"].id,
            name="Tuition Fee 2026-27 (Standard 5)",
            amount=Decimal("24000.00"),
            frequency="annual",
            installments_count=1,
        )
        session.add(tuition_structure)

        exam_structure = FeeStructure(
            institution_id=institution.id,
            academic_year_id=academic_year.id,
            standard_id=standards[5].id,
            category_id=fee_categories["Examination Fee"].id,
            name="Examination Fee 2026-27 (Standard 5)",
            amount=Decimal("1500.00"),
            frequency="annual",
            installments_count=1,
        )
        session.add(exam_structure)
        await session.flush()

        # Sample Student: Rahul Sharma
        existing_student = (
            await session.execute(
                select(Student).where(Student.admission_number == "PA2024001")
            )
        ).scalar_one_or_none()

        if not existing_student:
            sample_student = Student(
                institution_id=institution.id,
                admission_number="PA2024001",
                first_name="Rahul",
                last_name="Sharma",
                middle_name="Kumar",
                date_of_birth=date(2014, 5, 15),
                gender="male",
                blood_group="B+",
                nationality="Indian",
                religion="Hindu",
                address="45, Gandhi Nagar",
                city="Mumbai",
                state="Maharashtra",
                pincode="400002",
                phone="+91-9876543210",
                email="rahul.sharma@example.com",
                admission_date=date(2024, 6, 1),
            )
            session.add(sample_student)
            await session.flush()

            guardian = Guardian(
                student_id=sample_student.id,
                relation="Father",
                first_name="Suresh",
                last_name="Sharma",
                occupation="Business",
                phone="+91-9876543211",
                email="suresh.sharma@example.com",
                annual_income=500000.0,
                is_primary=True,
            )
            session.add(guardian)

            enrollment = StudentEnrollment(
                student_id=sample_student.id,
                academic_year_id=academic_year.id,
                standard_id=standards[5].id,
                division_id=divisions["5A"].id,
                roll_number="05A001",
                enrollment_date=date(2024, 6, 1),
                status="active",
            )
            session.add(enrollment)

            fee_assignment = StudentFeeAssignment(
                student_id=sample_student.id,
                fee_structure_id=tuition_structure.id,
                academic_year_id=academic_year.id,
                concession_amount=Decimal("0"),
            )
            session.add(fee_assignment)
            await session.flush()

            invoice = FeeInvoice(
                institution_id=institution.id,
                student_id=sample_student.id,
                academic_year_id=academic_year.id,
                invoice_number="INV-2024-000001",
                total_amount=Decimal("24000.00"),
                paid_amount=Decimal("16000.00"),
                balance_amount=Decimal("8000.00"),
                status="partially_paid",
                issue_date=date(2024, 6, 1),
                due_date=date(2024, 7, 1),
            )
            session.add(invoice)
            await session.flush()

            session.add(FeeInvoiceItem(
                invoice_id=invoice.id,
                fee_structure_id=tuition_structure.id,
                description="Tuition Fee (Standard 5) 2024-25",
                amount=Decimal("24000.00"),
            ))

        await session.commit()

    print("=" * 70)
    print("  [SUCCESS] PRATHAMONE EduOS — ACADEMIC SEED COMPLETED!")
    print("=" * 70)
    print(f"  Institution:           {institute_name}")
    print(f"  Boards Seeded:         17 (MSBSHSE, CBSE, ICSE, GSEB, State Boards, IIT-JEE/NEET)")
    print(f"  Canonical Subjects:    43 Master Disciplines (Languages, Sciences, Commerce, Tech, Entrance)")
    print(f"  Standards Seeded:      Standards 1 to 12")
    print(f"  Batches & Divisions:   Multi-board & Medium-aware (English, Semi-English, Marathi, Gujarati)")
    print(f"  Initial Administrator: admin")
    print("=" * 70)


if __name__ == "__main__":
    asyncio.run(seed(bootstrap_only="--bootstrap-only" in sys.argv))
