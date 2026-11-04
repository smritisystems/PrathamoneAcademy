# /**
#  * @file        seed_student_kyc_data.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      scripts
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
#  * @description Seed rich KYC, guardian, document, and demographic data for existing students to power prefilled forms.
#  */

import sys
import os
import asyncio
from datetime import date, datetime

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.student import Student, Guardian
from app.models.portal import StudentDocument
from app.models.user import User

LAST_NAMES = [
    "Sharma", "Verma", "Patil", "Deshmukh", "Kulkarni", "Joshi", "Mehta", "Shah",
    "Pawar", "Bhide", "Chavan", "Tambe", "Mistry", "Bhatia", "Kapoor", "Malhotra",
    "Sawant", "Gokhale", "Gadgil", "Nair", "Iyer", "Rao", "Shetty", "Kamath"
]

MUMBAI_AREAS = [
    ("Dadar West, Near Shivaji Park", "Mumbai", "Maharashtra", "400028"),
    ("Bandra West, Linking Road", "Mumbai", "Maharashtra", "400050"),
    ("Andheri East, Chakala", "Mumbai", "Maharashtra", "400069"),
    ("Thane West, Naupada", "Thane", "Maharashtra", "400602"),
    ("Vashi, Sector 17", "Navi Mumbai", "Maharashtra", "400703"),
    ("Borivali West, Shimpoli Road", "Mumbai", "Maharashtra", "400092"),
    ("Chembur, Diamond Garden", "Mumbai", "Maharashtra", "400071"),
    ("Ghatkopar East, Tilak Road", "Mumbai", "Maharashtra", "400077"),
]

OCCUPATIONS = [
    "Software Engineer", "Business Executive", "Chartered Accountant", "Doctor",
    "Civil Architect", "Professor", "Government Officer", "Commercial Banker"
]

DOC_TYPES = [
    ("Aadhaar Card Copy", "AADHAAR", "verified"),
    ("Birth Certificate", "BIRTH_CERT", "verified"),
    ("Previous School Marksheet", "MARKSHEET", "verified"),
    ("Address Proof (Electricity Bill)", "ADDRESS_PROOF", "verified"),
    ("Passport Photo", "PHOTO", "verified"),
]

async def seed_kyc_data():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(Student).order_by(Student.id))
        students = res.scalars().all()
        print(f"Found {len(students)} existing students.")

        for idx, student in enumerate(students):
            lname = LAST_NAMES[idx % len(LAST_NAMES)]
            if not student.last_name or student.last_name.strip() == "":
                student.last_name = lname

            area, city, state, pin = MUMBAI_AREAS[idx % len(MUMBAI_AREAS)]
            if not student.address:
                student.address = f"Flat {101 + idx}, Building A, {area}"
                student.city = city
                student.state = state
                student.pincode = pin

            if not student.phone:
                student.phone = f"+91-9820{idx+1:02d}4411"

            if not student.email:
                student.email = f"{student.first_name.lower()}.{lname.lower()}{student.id}@example.com"

            if not student.aadhar_number:
                # 12-digit Aadhaar for testing masking
                student.aadhar_number = f"48123984{1000 + idx}"

            if not student.blood_group:
                b_groups = ["O+", "A+", "B+", "AB+", "O-"]
                student.blood_group = b_groups[idx % len(b_groups)]

            if not student.date_of_birth or student.date_of_birth == date(2008, 1, 1):
                # Class X roughly 15-16, IV roughly 9-10
                birth_year = 2010 if "Class X" in student.admission_number or idx < 13 else 2016
                student.date_of_birth = date(birth_year, ((idx % 12) + 1), ((idx % 27) + 1))

            # Seed primary guardian (Father) and secondary guardian (Mother) if none exist
            g_res = await db.execute(select(Guardian).where(Guardian.student_id == student.id))
            guardians = g_res.scalars().all()
            if not guardians:
                father = Guardian(
                    student_id=student.id,
                    relation="Father",
                    first_name=f"Rajendra",
                    last_name=student.last_name,
                    occupation=OCCUPATIONS[idx % len(OCCUPATIONS)],
                    phone=f"+91-9819{idx+1:02d}8822",
                    email=f"father.{student.first_name.lower()}@example.com",
                    aadhar_number=f"56781234{2000 + idx}",
                    annual_income=1200000.0 + (idx * 50000),
                    is_primary=True,
                )
                mother = Guardian(
                    student_id=student.id,
                    relation="Mother",
                    first_name=f"Sunita",
                    last_name=student.last_name,
                    occupation=OCCUPATIONS[(idx + 2) % len(OCCUPATIONS)],
                    phone=f"+91-9819{idx+1:02d}8823",
                    email=f"mother.{student.first_name.lower()}@example.com",
                    aadhar_number=f"56781234{3000 + idx}",
                    annual_income=850000.0 + (idx * 40000),
                    is_primary=False,
                )
                db.add(father)
                db.add(mother)

            # Seed verified student documents if none exist
            doc_res = await db.execute(select(StudentDocument).where(StudentDocument.student_id == student.id))
            docs = doc_res.scalars().all()
            if not docs:
                for doc_title, doc_code, doc_status in DOC_TYPES:
                    doc = StudentDocument(
                        student_id=student.id,
                        title=f"{student.first_name}'s {doc_title}",
                        document_type=doc_code,
                        file_url=f"/uploads/documents/{student.admission_number}_{doc_code.lower()}.pdf",
                        status=doc_status,
                    )
                    db.add(doc)

        # Check Staff Users and give them staff_code and designation if missing
        staff_res = await db.execute(select(User).where(User.role.in_(["teacher", "accountant", "admin"])))
        staff_users = staff_res.scalars().all()
        for idx, u in enumerate(staff_users):
            if not u.staff_code:
                u.staff_code = f"PA-STF-{idx+1:03d}"
            if not u.phone:
                u.phone = f"+91-9870{idx+1:02d}1122"

        await db.commit()
        print("Successfully enriched students and staff records with KYC and guardian data!")

if __name__ == "__main__":
    asyncio.run(seed_kyc_data())

