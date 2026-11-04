# /**
#  * @file        populate_all_modules.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      backend.scripts
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
#  * @description Comprehensive module data populator generating realistic attendance, examinations, results, and study materials for 39 students.
#  */

import os
import sys
import asyncio
from decimal import Decimal
from datetime import date, timedelta

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import select, delete
from app.core.database import AsyncSessionLocal
from app.models.institution import Institution
from app.models.academic_year import AcademicYear
from app.models.standard import Standard
from app.models.division import Division
from app.models.subject import Subject
from app.models.student import Student
from app.models.enrollment import StudentEnrollment
from app.models.exam import Examination, ExamMark
from app.models.attendance import Attendance
from app.models.portal import StudyMaterial, Announcement


async def populate_modules():
    print("=" * 80)
    print("POPULATING APPLICATION MODULES FOR 39 VERIFIED STUDENTS")
    print("=" * 80)

    async with AsyncSessionLocal() as session:
        # 1. Base references
        inst = (await session.execute(select(Institution))).scalars().first()
        ay = (await session.execute(select(AcademicYear).where(AcademicYear.is_current == True))).scalars().first()
        if not ay:
            ay = (await session.execute(select(AcademicYear))).scalars().first()

        print(f"Institution: {inst.name} (ID: {inst.id})")
        print(f"Academic Year: {ay.name} (ID: {ay.id})")

        # 2. Get Standards, Divisions, Subjects, Students, and Enrollments
        standards = {s.id: s for s in (await session.execute(select(Standard))).scalars().all()}
        divisions = {d.id: d for d in (await session.execute(select(Division))).scalars().all()}
        subjects = (await session.execute(select(Subject))).scalars().all()
        subjects_by_std = {}
        for sub in subjects:
            subjects_by_std.setdefault(sub.standard_id, []).append(sub)

        enrollments = (await session.execute(select(StudentEnrollment).where(StudentEnrollment.status == "active"))).scalars().all()
        students_by_id = {s.id: s for s in (await session.execute(select(Student))).scalars().all()}
        print(f"Active Enrollments found: {len(enrollments)}")

        # -------------------------------------------------------------
        # 3. Announcements
        # -------------------------------------------------------------
        print("\n[Step 1] Seeding Announcements...")
        existing_ann_count = len((await session.execute(select(Announcement))).scalars().all())
        if existing_ann_count == 0:
            announcements_data = [
                {
                    "title": "Annual Term Examination 2024-25 Schedule Announced",
                    "content": "The Term 1 examinations for ICSE, CBSE, and SSC batches will commence from October 15, 2024. Hall tickets and seating layout are available on the student notice board.",
                    "category": "examination",
                    "is_pinned": True,
                    "publish_date": date(2024, 9, 25),
                },
                {
                    "title": "Parent-Teacher Interactive Meeting & Progress Report Release",
                    "content": "Quarterly Parent-Teacher Meeting will be held this Saturday between 10:00 AM and 1:00 PM. Parents are requested to collect student academic performance portfolios.",
                    "category": "general",
                    "is_pinned": True,
                    "publish_date": date(2024, 10, 5),
                },
                {
                    "title": "Diwali Vacation & Special Board Revision Batch",
                    "content": "The academy will observe Diwali break from October 30 to November 5, 2024. Standard X ICSE and CBSE fast-track revision lectures will continue online.",
                    "category": "holiday",
                    "is_pinned": True,
                    "publish_date": date(2024, 10, 20),
                },
                {
                    "title": "Trigonometry & Calculus Masterclass Workshop",
                    "content": "Intensive problem-solving workshop covering trigonometric identities and height & distance numericals for Standard X students this Sunday in Hall 101.",
                    "category": "academic",
                    "is_pinned": False,
                    "publish_date": date(2024, 10, 12),
                },
            ]
            for a_item in announcements_data:
                ann = Announcement(
                    institution_id=inst.id,
                    title=a_item["title"],
                    content=a_item["content"],
                    category=a_item["category"],
                    is_pinned=a_item["is_pinned"],
                    publish_date=a_item["publish_date"],
                )
                session.add(ann)
            await session.flush()
            print("  -> Created 4 academy announcements.")
        else:
            print(f"  -> Announcements already present ({existing_ann_count}).")

        # -------------------------------------------------------------
        # 4. Examinations & Exam Marks
        # -------------------------------------------------------------
        print("\n[Step 2] Seeding Examinations and Student Marks...")
        existing_exams = (await session.execute(select(Examination))).scalars().all()
        exam_records = {}

        if len(existing_exams) == 0:
            exams_to_create = [
                # Standard 4
                {"std_id": 4, "name": "Unit Test 1 (Term 1)", "type": "Unit Test", "start": date(2024, 7, 22), "end": date(2024, 7, 26), "max": 50, "pass": 18},
                {"std_id": 4, "name": "Mid-Term Examination 2024", "type": "Semester Exam", "start": date(2024, 9, 20), "end": date(2024, 9, 28), "max": 100, "pass": 35},
                # Standard 8
                {"std_id": 8, "name": "Unit Test 1 (Term 1)", "type": "Unit Test", "start": date(2024, 7, 22), "end": date(2024, 7, 26), "max": 50, "pass": 18},
                {"std_id": 8, "name": "Mid-Term Examination 2024", "type": "Semester Exam", "start": date(2024, 9, 20), "end": date(2024, 9, 28), "max": 100, "pass": 35},
                # Standard 9
                {"std_id": 9, "name": "Unit Test 1 (Term 1)", "type": "Unit Test", "start": date(2024, 7, 22), "end": date(2024, 7, 27), "max": 50, "pass": 18},
                {"std_id": 9, "name": "Mid-Term Examination 2024", "type": "Semester Exam", "start": date(2024, 9, 20), "end": date(2024, 9, 30), "max": 100, "pass": 35},
                # Standard 10
                {"std_id": 10, "name": "Unit Test 1 (Term 1)", "type": "Unit Test", "start": date(2024, 7, 20), "end": date(2024, 7, 28), "max": 50, "pass": 18},
                {"std_id": 10, "name": "Mid-Term Examination 2024", "type": "Semester Exam", "start": date(2024, 9, 20), "end": date(2024, 10, 1), "max": 100, "pass": 35},
                {"std_id": 10, "name": "Pre-Board Mock Series 1", "type": "Model Exam", "start": date(2024, 11, 20), "end": date(2024, 12, 2), "max": 100, "pass": 35},
            ]
            for ex_def in exams_to_create:
                ex = Examination(
                    academic_year_id=ay.id,
                    standard_id=ex_def["std_id"],
                    name=ex_def["name"],
                    exam_type=ex_def["type"],
                    start_date=ex_def["start"],
                    end_date=ex_def["end"],
                    max_marks=ex_def["max"],
                    passing_marks=ex_def["pass"],
                    is_active=True,
                )
                session.add(ex)
                await session.flush()
                exam_records.setdefault(ex_def["std_id"], []).append(ex)
            print(f"  -> Created {len(exams_to_create)} examinations.")
        else:
            for ex in existing_exams:
                exam_records.setdefault(ex.standard_id, []).append(ex)
            print(f"  -> Examinations already present ({len(existing_exams)}).")

        # Exam Marks for enrolled students
        existing_marks_count = len((await session.execute(select(ExamMark))).scalars().all())
        if existing_marks_count == 0:
            marks_added = 0
            for enr in enrollments:
                std_id = enr.standard_id
                std_exams = exam_records.get(std_id, [])
                std_subjects = subjects_by_std.get(std_id, [])

                # Take first 4 subjects for exam marks
                exam_subjects = std_subjects[:4] if len(std_subjects) >= 4 else std_subjects

                for ex in std_exams:
                    # Score only completed exams
                    if ex.start_date > date(2024, 11, 1):
                        continue
                    for sub in exam_subjects:
                        # Deterministic realistic score (65% to 96%)
                        base_score = 65 + ((enr.student_id * 11 + sub.id * 7) % 31)
                        marks_val = Decimal(str(round((base_score / 100.0) * float(ex.max_marks), 1)))
                        grade = "A+" if base_score >= 90 else ("A" if base_score >= 75 else ("B+" if base_score >= 60 else "B"))
                        remarks = "Outstanding conceptual clarity" if base_score >= 85 else ("Good progress, keep practicing" if base_score >= 70 else "Needs revision in numericals")

                        mark = ExamMark(
                            examination_id=ex.id,
                            student_id=enr.student_id,
                            subject_id=sub.id,
                            marks_obtained=marks_val,
                            grade=grade,
                            remarks=remarks,
                            is_absent=False,
                        )
                        session.add(mark)
                        marks_added += 1

            await session.flush()
            print(f"  -> Added {marks_added} examination mark entries across all 39 students.")
        else:
            print(f"  -> Examination marks already present ({existing_marks_count}).")

        # -------------------------------------------------------------
        # 5. Attendance Records
        # -------------------------------------------------------------
        print("\n[Step 3] Seeding Attendance Records...")
        existing_att_count = len((await session.execute(select(Attendance))).scalars().all())
        if existing_att_count == 0:
            # Generate 20 dates between Aug 1, 2024 and Oct 25, 2024 (Mondays, Wednesdays, Fridays, Saturdays)
            curr = date(2024, 8, 1)
            target_dates = []
            while len(target_dates) < 20 and curr <= date(2024, 10, 31):
                if curr.weekday() in [0, 2, 4, 5]: # Mon, Wed, Fri, Sat
                    target_dates.append(curr)
                curr += timedelta(days=1)

            att_added = 0
            for d in target_dates:
                for enr in enrollments:
                    # 92% present, 6% absent, 2% late
                    metric = (enr.student_id * 17 + d.day * 13) % 100
                    if metric < 92:
                        status = "present"
                        rem = "Present"
                    elif metric < 98:
                        status = "absent"
                        rem = "Parent notified - Medical"
                    else:
                        status = "late"
                        rem = "Late by 10 mins"

                    att = Attendance(
                        student_id=enr.student_id,
                        enrollment_id=enr.id,
                        date=d,
                        status=status,
                        remarks=rem,
                        marked_by_id=1,
                    )
                    session.add(att)
                    att_added += 1

            await session.flush()
            print(f"  -> Created {att_added} dated attendance records for 39 students across 20 class sessions.")
        else:
            print(f"  -> Attendance records already present ({existing_att_count}).")

        # -------------------------------------------------------------
        # 6. Study Materials
        # -------------------------------------------------------------
        print("\n[Step 4] Seeding Study Materials...")
        existing_sm_count = len((await session.execute(select(StudyMaterial))).scalars().all())
        if existing_sm_count == 0:
            materials_data = [
                # Standard 10
                {"std_id": 10, "code": "MATH-10", "title": "Class X Mathematics - Complete Formula Booklet & Theorems", "type": "Formula Sheet", "url": "/materials/math10_formulas.pdf", "size": 1850000},
                {"std_id": 10, "code": "MATH-10", "title": "Class X Quadratic Equations & Arithmetic Progressions Solved Bank", "type": "Question Bank", "url": "/materials/math10_quadratics_ap.pdf", "size": 3200000},
                {"std_id": 10, "code": "PHYS-10", "title": "Class X Physics - Light, Electricity & Magnetism Numerical Handbook", "type": "Notes", "url": "/materials/phys10_numerical_bank.pdf", "size": 2750000},
                {"std_id": 10, "code": "CHEM-10", "title": "Class X Chemistry - Chemical Reactions & Periodic Classification Chart", "type": "Revision", "url": "/materials/chem10_periodic_chart.pdf", "size": 1950000},
                # Standard 9
                {"std_id": 9, "code": "MATH-9", "title": "Class IX Polynomials & Coordinate Geometry Practice Problems", "type": "Assignment", "url": "/materials/math9_polynomials.pdf", "size": 1400000},
                {"std_id": 9, "code": "PHYS-9", "title": "Class IX Laws of Motion & Gravitation Derivations & Solutions", "type": "Notes", "url": "/materials/phys9_motion_gravitation.pdf", "size": 2200000},
                # Standard 8
                {"std_id": 8, "code": "MATH-8", "title": "Class VIII Rational Numbers & Algebraic Identities Workbook", "type": "Workbook", "url": "/materials/math8_algebra_workbook.pdf", "size": 1150000},
                {"std_id": 8, "code": "SCI-8", "title": "Class VIII Force & Pressure Experimental Concepts & Diagrams", "type": "Notes", "url": "/materials/sci8_force_pressure.pdf", "size": 1650000},
                # Standard 4
                {"std_id": 4, "code": "MATH-4", "title": "Class IV Primary Mathematics - Fractions & Decimals Illustrated Guide", "type": "Worksheet", "url": "/materials/math4_fractions_guide.pdf", "size": 890000},
                {"std_id": 4, "code": "SCI-4", "title": "Class IV Environmental Science - Living Things & Habitats Notes", "type": "Notes", "url": "/materials/sci4_living_things.pdf", "size": 940000},
            ]

            subs_by_code = {s.code: s for s in subjects}
            sm_added = 0
            for m_item in materials_data:
                sub = subs_by_code.get(m_item["code"])
                if not sub:
                    continue
                sm = StudyMaterial(
                    institution_id=inst.id,
                    standard_id=m_item["std_id"],
                    subject_id=sub.id,
                    title=m_item["title"],
                    description=f"Comprehensive coaching notes, concept maps, and practice questions for {sub.name}.",
                    file_type=m_item["type"],
                    file_url=m_item["url"],
                    file_size_bytes=m_item["size"],
                )
                session.add(sm)
                sm_added += 1

            await session.flush()
            print(f"  -> Created {sm_added} comprehensive study material modules.")
        else:
            print(f"  -> Study materials already present ({existing_sm_count}).")

        await session.commit()
        print("\n" + "=" * 80)
        print("MODULE POPULATION COMPLETED SUCCESSFULLY!")
        print("=" * 80)


if __name__ == "__main__":
    asyncio.run(populate_modules())

