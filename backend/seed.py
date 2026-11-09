# /**
#  * @file        seed.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      backend.root
#  *
#  * @author      Jawahar R. Mallah
#  * @organization AITDL (AI Technology & Development Lab)
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 AITDL
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-03
#  * @updated     2026-11-09
#  *
#  * @description Database master seeder initializing superadmin account, demo batches, and curriculum subjects.
#  */

"""
Seed script for Prashant Academy development data.

Usage:
    python seed.py
    python seed.py --database-url postgresql+asyncpg://user:pass@host/db
"""
import asyncio
import sys
from decimal import Decimal
from datetime import date
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

import os
from app.core.config import settings

DATABASE_URL = os.getenv("DATABASE_URL", settings.DATABASE_URL)
if len(sys.argv) > 1 and sys.argv[1].startswith("--database-url="):
    DATABASE_URL = sys.argv[1].split("=", 1)[1]


async def seed():
    from app.core.security import get_password_hash
    from app.models.institution import Institution
    from app.models.academic_year import AcademicYear
    from app.models.user import User, Role
    from app.models.standard import Standard
    from app.models.division import Division
    from app.models.student import Student, Guardian
    from app.models.enrollment import StudentEnrollment
    from app.models.fee import (
        FeeCategory, FeeStructure, StudentFeeAssignment,
        FeeInvoice, FeeInvoiceItem
    )
    from app.models.payment import Payment, PaymentAllocation, PaymentReceipt
    from app.core.database import Base
    import json

    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as session:
        # Check if already seeded
        from sqlalchemy import select
        existing = await session.execute(
            select(Institution).where(Institution.code == "PA001")
        )
        if existing.scalar_one_or_none():
            print("[INFO] Database already seeded. Skipping seed.")
            return

        # --- Institution ---
        institution = Institution(
            name="Prashant Academy",
            code="PA001",
            address="123 Education Lane, School District",
            city="Mumbai",
            state="Maharashtra",
            pincode="400001",
            phone="+91-22-12345678",
            email="info@prashantacademy.edu.in",
            website="https://prashantacademy.edu.in",
        )
        session.add(institution)
        await session.flush()

        # --- Roles ---
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
            role = Role(**r)
            session.add(role)
            await session.flush()
            roles[r["name"]] = role

        # --- Users ---
        admin_user = User(
            institution_id=institution.id,
            username="admin",
            email="admin@prashantacademy.edu.in",
            hashed_password=get_password_hash("admin123"),
            first_name="Admin",
            last_name="User",
            role="admin",
            role_id=roles["admin"].id,
        )
        session.add(admin_user)

        accountant_user = User(
            institution_id=institution.id,
            username="accountant",
            email="accountant@prashantacademy.edu.in",
            hashed_password=get_password_hash("account123"),
            first_name="Rajesh",
            last_name="Sharma",
            role="accountant",
            role_id=roles["accountant"].id,
        )
        session.add(accountant_user)
        await session.flush()

        # --- Academic Years (Current 2026-27, Historical 2025-26 & 2024-25) ---
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

        # --- Standards 1-12 ---
        standards = {}
        for level in range(1, 13):
            standard = Standard(
                institution_id=institution.id,
                name=f"Standard {level}",
                level=level,
            )
            session.add(standard)
            await session.flush()
            standards[level] = standard

        # --- Divisions A and B for each standard ---
        divisions = {}
        for level, standard in standards.items():
            for div_name in ["A", "B"]:
                division = Division(
                    standard_id=standard.id,
                    name=div_name,
                    capacity=40,
                )
                session.add(division)
                await session.flush()
                divisions[f"{level}{div_name}"] = division

        # --- Fee Categories ---
        fee_categories = {}
        for cat_name in [
            "Tuition Fee",
            "Admission Fee",
            "Examination Fee",
            "Transport Fee",
            "Sports Fee",
            "Library Fee",
        ]:
            cat = FeeCategory(institution_id=institution.id, name=cat_name)
            session.add(cat)
            await session.flush()
            fee_categories[cat_name] = cat

        # --- Fee Structure: Standard 5 Tuition ₹24,000 ---
        tuition_structure = FeeStructure(
            institution_id=institution.id,
            academic_year_id=academic_year.id,
            standard_id=standards[5].id,
            category_id=fee_categories["Tuition Fee"].id,
            name="Tuition Fee 2024-25 (Standard 5)",
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
            name="Examination Fee 2024-25 (Standard 5)",
            amount=Decimal("1500.00"),
            frequency="annual",
            installments_count=1,
        )
        session.add(exam_structure)
        await session.flush()

        # --- Sample Student: Rahul Sharma (PA2024001) ---
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

        # --- Fee Invoice: ₹24,000 annual fee ---
        invoice = FeeInvoice(
            invoice_number=f"INV-{academic_year.id}-00001",
            student_id=sample_student.id,
            assignment_id=fee_assignment.id,
            academic_year_id=academic_year.id,
            total_amount=Decimal("24000.00"),
            discount_amount=Decimal("0"),
            net_amount=Decimal("24000.00"),
            paid_amount=Decimal("16000.00"),
            outstanding_amount=Decimal("8000.00"),
            status="partial",
            issue_date=date(2024, 6, 1),
            due_date=date(2025, 3, 31),
        )
        session.add(invoice)
        await session.flush()

        invoice_item = FeeInvoiceItem(
            invoice_id=invoice.id,
            fee_structure_id=tuition_structure.id,
            description="Tuition Fee 2024-25 (Standard 5)",
            amount=Decimal("24000.00"),
            discount_amount=Decimal("0"),
            net_amount=Decimal("24000.00"),
        )
        session.add(invoice_item)


        # --- Payment 1: ₹5,000 (Cash) ---
        payment1 = Payment(
            student_id=sample_student.id,
            academic_year_id=academic_year.id,
            amount=Decimal("5000.00"),
            payment_date=date(2024, 7, 1),
            payment_method="cash",
            notes="First installment",
            status="completed",
            collected_by_id=accountant_user.id,
        )
        session.add(payment1)
        await session.flush()

        session.add(PaymentAllocation(
            payment_id=payment1.id, invoice_id=invoice.id,
            installment_id=installment.id, allocated_amount=Decimal("5000.00"),
        ))
        session.add(PaymentReceipt(
            receipt_number=f"RCP-{academic_year.id}-000001",
            payment_id=payment1.id, student_id=sample_student.id,
            amount=Decimal("5000.00"), payment_date=date(2024, 7, 1),
            payment_method="cash",
            receipt_data=json.dumps({
                "student_name": "Rahul Sharma", "admission_number": "PA2024001",
                "amount": 5000.0, "payment_method": "cash",
                "payment_date": "2024-07-01",
            }),
        ))

        # --- Payment 2: ₹7,000 (UPI) ---
        payment2 = Payment(
            student_id=sample_student.id,
            academic_year_id=academic_year.id,
            amount=Decimal("7000.00"),
            payment_date=date(2024, 9, 5),
            payment_method="upi",
            transaction_reference="UPI123456789",
            notes="Second installment via UPI",
            status="completed",
            collected_by_id=accountant_user.id,
        )
        session.add(payment2)
        await session.flush()

        session.add(PaymentAllocation(
            payment_id=payment2.id, invoice_id=invoice.id,
            installment_id=installment.id, allocated_amount=Decimal("7000.00"),
        ))
        session.add(PaymentReceipt(
            receipt_number=f"RCP-{academic_year.id}-000002",
            payment_id=payment2.id, student_id=sample_student.id,
            amount=Decimal("7000.00"), payment_date=date(2024, 9, 5),
            payment_method="upi",
            receipt_data=json.dumps({
                "student_name": "Rahul Sharma", "admission_number": "PA2024001",
                "amount": 7000.0, "payment_method": "upi",
                "transaction_reference": "UPI123456789",
                "payment_date": "2024-09-05",
            }),
        ))

        # --- Payment 3: ₹4,000 (Bank Transfer) ---
        payment3 = Payment(
            student_id=sample_student.id,
            academic_year_id=academic_year.id,
            amount=Decimal("4000.00"),
            payment_date=date(2024, 11, 1),
            payment_method="bank_transfer",
            transaction_reference="NEFT987654321",
            notes="Third installment via bank transfer",
            status="completed",
            collected_by_id=accountant_user.id,
        )
        session.add(payment3)
        await session.flush()

        session.add(PaymentAllocation(
            payment_id=payment3.id, invoice_id=invoice.id,
            installment_id=installment.id, allocated_amount=Decimal("4000.00"),
        ))
        session.add(PaymentReceipt(
            receipt_number=f"RCP-{academic_year.id}-000003",
            payment_id=payment3.id, student_id=sample_student.id,
            amount=Decimal("4000.00"), payment_date=date(2024, 11, 1),
            payment_method="bank_transfer",
            receipt_data=json.dumps({
                "student_name": "Rahul Sharma", "admission_number": "PA2024001",
                "amount": 4000.0, "payment_method": "bank_transfer",
                "transaction_reference": "NEFT987654321",
                "payment_date": "2024-11-01",
            }),
        ))

        # --- Additional Sample Students ---
        student_data = [
            ("Priya", "Patel", "female", date(2014, 3, 12), 5),
            ("Amit", "Kumar", "male", date(2013, 8, 22), 6),
            ("Sneha", "Gupta", "female", date(2014, 1, 5), 7),
            ("Raj", "Singh", "male", date(2013, 11, 30), 8),
            ("Meera", "Nair", "female", date(2012, 6, 18), 9),
            ("Arjun", "Reddy", "male", date(2015, 2, 28), 4),
            ("Kavya", "Iyer", "female", date(2011, 9, 10), 10),
            ("Rohan", "Mehta", "male", date(2016, 4, 5), 3),
        ]

        for i, (fname, lname, gender, dob, std_level) in enumerate(student_data, 2):
            student = Student(
                institution_id=institution.id,
                admission_number=f"PA2024{i:03d}",
                first_name=fname,
                last_name=lname,
                date_of_birth=dob,
                gender=gender,
                nationality="Indian",
                city="Mumbai",
                state="Maharashtra",
                admission_date=date(2024, 6, 1),
            )
            session.add(student)
            await session.flush()

            enr = StudentEnrollment(
                student_id=student.id,
                academic_year_id=academic_year.id,
                standard_id=standards[std_level].id,
                division_id=divisions[f"{std_level}A"].id,
                roll_number=f"{std_level:02d}A{i:03d}",
                enrollment_date=date(2024, 6, 1),
                status="active",
            )
            session.add(enr)

        await session.commit()

    print("=" * 60)
    print("[SUCCESS] Prashant Academy seed data created successfully!")
    print("=" * 60)
    print(f"  Institution:   Prashant Academy (Mumbai)")
    print(f"  Academic Year: 2024-25 (current)")
    print(f"  Standards:     Standard 1 to Standard 12 (2 divisions each)")
    print()
    print("  Sample student: Rahul Sharma (PA2024001) - Standard 5A")
    print("  Fee scenario:")
    print("    Annual fee:        Rs. 24,000")
    print("    Payment 1 (cash):  Rs.  5,000  -> RCP-1-000001")
    print("    Payment 2 (UPI):   Rs.  7,000  -> RCP-1-000002")
    print("    Payment 3 (NEFT):  Rs.  4,000  -> RCP-1-000003")
    print("    Total paid:        Rs. 16,000")
    print("    Outstanding:       Rs.  8,000")
    print()
    print("  Default credentials:")
    print("    Admin:      admin / admin123")
    print("    Accountant: accountant / account123")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(seed())

