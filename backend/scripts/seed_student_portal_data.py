# /**
#  * @file        seed_student_portal_data.py
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
#  * @description Database seeding utility creating test student accounts, credentials, and academic history.
#  */

"""
Seed realistic database records for Student Portal & Profile:
1. Core subjects for Standards 8, 9, and 10.
2. Timetable schedules for the 5 batches (ICSE X, CBSE X, ICSE IX, ICSE VIII, SSC IX).
3. Examinations (Unit Tests, Mid-Term, Pre-Boards) and Exam Marks for students.
4. Dated Attendance records (August to November 2024).
5. Study Materials (PDF notes, formula sheets, assignments).
6. Institute and batch Announcements.
7. Student Documents (Aadhaar, Marksheets, Admission forms).
8. Student User accounts for portal login.
"""

import asyncio
import os
import sys
from datetime import date, datetime, timedelta
from decimal import Decimal
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import select

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.security import get_password_hash
from app.models.institution import Institution
from app.models.academic_year import AcademicYear
from app.models.board import Board
from app.models.standard import Standard
from app.models.division import Division
from app.models.subject import Subject
from app.models.student import Student
from app.models.enrollment import StudentEnrollment
from app.models.exam import Examination, ExamMark
from app.models.attendance import Attendance
from app.models.portal import TimetableEntry, StudyMaterial, Announcement, StudentDocument
from app.models.user import User

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/prashant_academy")


async def seed_data():
    engine = create_async_engine(DATABASE_URL, echo=False)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with session_factory() as session:
        async with session.begin():
            # 1. Institution & Academic Year
            inst = (await session.execute(select(Institution))).scalars().first()
            ay = (await session.execute(select(AcademicYear).where(AcademicYear.is_current == True))).scalars().first()

            # 2. Standards & Divisions
            stds = {s.level: s for s in (await session.execute(select(Standard))).scalars().all()}
            divs = {d.name: d for d in (await session.execute(select(Division))).scalars().all()}

            # 3. Subjects
            SUBJECTS_DATA = [
                # Standard 10
                {"level": 10, "name": "Mathematics", "code": "MATH-10", "max_marks": 100, "pass_marks": 35},
                {"level": 10, "name": "Physics", "code": "PHYS-10", "max_marks": 100, "pass_marks": 35},
                {"level": 10, "name": "Chemistry", "code": "CHEM-10", "max_marks": 100, "pass_marks": 35},
                {"level": 10, "name": "Biology", "code": "BIO-10", "max_marks": 100, "pass_marks": 35},
                {"level": 10, "name": "English Language & Lit", "code": "ENG-10", "max_marks": 100, "pass_marks": 35},
                {"level": 10, "name": "Social Science", "code": "SST-10", "max_marks": 100, "pass_marks": 35},
                # Standard 9
                {"level": 9, "name": "Mathematics", "code": "MATH-9", "max_marks": 100, "pass_marks": 35},
                {"level": 9, "name": "Physics", "code": "PHYS-9", "max_marks": 100, "pass_marks": 35},
                {"level": 9, "name": "Chemistry", "code": "CHEM-9", "max_marks": 100, "pass_marks": 35},
                {"level": 9, "name": "Biology", "code": "BIO-9", "max_marks": 100, "pass_marks": 35},
                {"level": 9, "name": "English Language", "code": "ENG-9", "max_marks": 100, "pass_marks": 35},
                {"level": 9, "name": "Social Science", "code": "SST-9", "max_marks": 100, "pass_marks": 35},
                # Standard 8
                {"level": 8, "name": "Mathematics", "code": "MATH-8", "max_marks": 100, "pass_marks": 35},
                {"level": 8, "name": "Science", "code": "SCI-8", "max_marks": 100, "pass_marks": 35},
                {"level": 8, "name": "English", "code": "ENG-8", "max_marks": 100, "pass_marks": 35},
                {"level": 8, "name": "Social Studies", "code": "SST-8", "max_marks": 100, "pass_marks": 35},
            ]

            subjects_by_key = {}
            for s_info in SUBJECTS_DATA:
                std = stds.get(s_info["level"])
                if not std:
                    continue
                existing_sub = (await session.execute(
                    select(Subject).where(Subject.standard_id == std.id, Subject.code == s_info["code"])
                )).scalar_one_or_none()
                if not existing_sub:
                    sub = Subject(
                        standard_id=std.id,
                        name=s_info["name"],
                        code=s_info["code"],
                        max_marks=s_info["max_marks"],
                        pass_marks=s_info["pass_marks"],
                        is_active=True,
                    )
                    session.add(sub)
                    await session.flush()
                    subjects_by_key[(s_info["level"], s_info["name"])] = sub
                else:
                    subjects_by_key[(s_info["level"], s_info["name"])] = existing_sub

            # 4. Timetable Entries
            SCHEDULE_SLOTS = [
                ("Monday", "16:00", "17:30", "Mathematics", "Room 101"),
                ("Monday", "17:45", "19:15", "Physics", "Room 101"),
                ("Wednesday", "16:00", "17:30", "Chemistry", "Room 102"),
                ("Wednesday", "17:45", "19:15", "Biology", "Room 102"),
                ("Friday", "16:00", "17:30", "English Language & Lit", "Room 101"),
                ("Friday", "17:45", "19:15", "Social Science", "Room 101"),
                ("Saturday", "09:00", "11:00", "Mathematics", "Hall A"),
                ("Saturday", "11:15", "13:00", "Physics", "Lab 1"),
            ]

            for div_name in ["ICSE X", "CBSE X", "ICSE IX", "ICSE VIII", "SSC IX"]:
                div = divs.get(div_name)
                if not div:
                    continue
                existing_tt = (await session.execute(
                    select(TimetableEntry).where(TimetableEntry.division_id == div.id)
                )).scalars().all()
                if not existing_tt:
                    std_lvl = 10 if "X" in div_name else (9 if "IX" in div_name else 8)
                    for day, start, end, sub_name, room in SCHEDULE_SLOTS:
                        # Match closest subject
                        sub = subjects_by_key.get((std_lvl, sub_name)) or subjects_by_key.get((std_lvl, "Mathematics"))
                        if sub:
                            tt = TimetableEntry(
                                division_id=div.id,
                                subject_id=sub.id,
                                day_of_week=day,
                                start_time=start,
                                end_time=end,
                                room_number=room,
                                is_active=True,
                            )
                            session.add(tt)

            # 5. Examinations
            EXAMS_DATA = [
                {"std_lvl": 10, "name": "Unit Test 1 (Term 1)", "type": "Unit Test", "start": date(2024, 7, 20), "end": date(2024, 7, 28), "max": 50, "pass": 18},
                {"std_lvl": 10, "name": "Mid-Term Examination 2024", "type": "Semester Exam", "start": date(2024, 9, 25), "end": date(2024, 10, 8), "max": 100, "pass": 35},
                {"std_lvl": 10, "name": "Pre-Board Test Series 1", "type": "Model Exam", "start": date(2024, 12, 10), "end": date(2024, 12, 22), "max": 100, "pass": 35},
                {"std_lvl": 9, "name": "Unit Test 1 (Term 1)", "type": "Unit Test", "start": date(2024, 7, 22), "end": date(2024, 7, 30), "max": 50, "pass": 18},
                {"std_lvl": 9, "name": "Mid-Term Examination 2024", "type": "Semester Exam", "start": date(2024, 9, 26), "end": date(2024, 10, 9), "max": 100, "pass": 35},
                {"std_lvl": 8, "name": "Diagnostic Test 2024", "type": "Diagnostic", "start": date(2024, 7, 15), "end": date(2024, 7, 20), "max": 50, "pass": 18},
                {"std_lvl": 8, "name": "Mid-Term Examination 2024", "type": "Semester Exam", "start": date(2024, 9, 25), "end": date(2024, 10, 5), "max": 100, "pass": 35},
            ]

            created_exams = []
            for ex in EXAMS_DATA:
                std = stds.get(ex["std_lvl"])
                if not std:
                    continue
                existing_ex = (await session.execute(
                    select(Examination).where(
                        Examination.academic_year_id == ay.id,
                        Examination.standard_id == std.id,
                        Examination.name == ex["name"],
                    )
                )).scalar_one_or_none()
                if not existing_ex:
                    new_ex = Examination(
                        academic_year_id=ay.id,
                        standard_id=std.id,
                        name=ex["name"],
                        exam_type=ex["type"],
                        start_date=ex["start"],
                        end_date=ex["end"],
                        max_marks=ex["max"],
                        passing_marks=ex["pass"],
                        is_active=True,
                    )
                    session.add(new_ex)
                    await session.flush()
                    created_exams.append((new_ex, ex["std_lvl"]))
                else:
                    created_exams.append((existing_ex, ex["std_lvl"]))

            # 6. Exam Marks for Students
            students = (await session.execute(select(Student))).scalars().all()
            enrs = {e.student_id: e for e in (await session.execute(select(StudentEnrollment))).scalars().all()}

            existing_marks_count = (await session.execute(select(ExamMark))).scalars().all()
            if len(existing_marks_count) == 0:
                for s in students:
                    enr = enrs.get(s.id)
                    if not enr:
                        continue
                    # Standard level
                    std_obj = [st for st in stds.values() if st.id == enr.standard_id]
                    if not std_obj:
                        continue
                    lvl = std_obj[0].level

                    # Find exams for this level
                    matching_exams = [e for e, l in created_exams if l == lvl and e.start_date and e.start_date <= date(2024, 10, 15)]
                    for ex in matching_exams:
                        # Add marks for 3 subjects
                        for sub_name in ["Mathematics", "Physics", "Chemistry"] if lvl >= 9 else ["Mathematics", "Science", "English"]:
                            sub = subjects_by_key.get((lvl, sub_name))
                            if not sub:
                                continue
                            # Compute realistic marks based on student ID
                            base_pct = 65 + ((s.id * 7) % 30)
                            marks_val = Decimal(str(round((base_pct / 100) * ex.max_marks, 1)))
                            grade = "A+" if base_pct >= 90 else ("A" if base_pct >= 75 else ("B+" if base_pct >= 60 else "B"))
                            em = ExamMark(
                                examination_id=ex.id,
                                student_id=s.id,
                                subject_id=sub.id,
                                marks_obtained=marks_val,
                                grade=grade,
                                remarks="Well prepared" if base_pct >= 75 else "Satisfactory performance",
                                is_absent=False,
                            )
                            session.add(em)

            # 7. Dated Attendance Records (30 dates from Aug to Nov 2024)
            existing_att = (await session.execute(select(Attendance))).scalars().first()
            if not existing_att:
                curr_dt = date(2024, 8, 1)
                end_dt = date(2024, 11, 2)
                att_dates = []
                while curr_dt <= end_dt:
                    if curr_dt.weekday() in [0, 2, 4, 5]: # Mon, Wed, Fri, Sat
                        att_dates.append(curr_dt)
                    curr_dt += timedelta(days=1)

                for dt in att_dates[-25:]: # last 25 class days
                    for s in students:
                        enr = enrs.get(s.id)
                        if not enr:
                            continue
                        # Deterministic attendance: 90% present
                        is_absent = ((s.id * 13 + dt.day) % 15 == 0)
                        status_str = "absent" if is_absent else "present"
                        att = Attendance(
                            student_id=s.id,
                            enrollment_id=enr.id,
                            date=dt,
                            status=status_str,
                            remarks="Medical leave" if is_absent else "On time",
                            marked_by_id=1,
                        )
                        session.add(att)

            # 8. Study Materials
            existing_sm = (await session.execute(select(StudyMaterial))).scalars().first()
            if not existing_sm:
                MATERIALS = [
                    {"lvl": 10, "sub": "Mathematics", "title": "Quadratic Equations & AP Master Notes", "type": "Formula Sheet", "url": "/materials/math10_quadratics.pdf", "size": 1450000},
                    {"lvl": 10, "sub": "Physics", "title": "Light & Optics Ray Diagrams & Numerical Bank", "type": "Notes", "url": "/materials/phys10_optics.pdf", "size": 2800000},
                    {"lvl": 10, "sub": "Chemistry", "title": "Periodic Table & Chemical Bonding Quick Revision", "type": "Revision", "url": "/materials/chem10_bonding.pdf", "size": 1900000},
                    {"lvl": 9, "sub": "Mathematics", "title": "Polynomials & Coordinate Geometry Workbook", "type": "Assignment", "url": "/materials/math9_polynomials.pdf", "size": 1250000},
                    {"lvl": 9, "sub": "Physics", "title": "Laws of Motion & Gravitation Solved Numerical Set", "type": "Notes", "url": "/materials/phys9_motion.pdf", "size": 2100000},
                    {"lvl": 8, "sub": "Mathematics", "title": "Linear Equations & Algebraic Identities Worksheet", "type": "Assignment", "url": "/materials/math8_algebra.pdf", "size": 950000},
                ]
                for m in MATERIALS:
                    std = stds.get(m["lvl"])
                    sub = subjects_by_key.get((m["lvl"], m["sub"]))
                    if std and sub:
                        sm = StudyMaterial(
                            institution_id=inst.id,
                            standard_id=std.id,
                            subject_id=sub.id,
                            title=m["title"],
                            description=f"Comprehensive coaching notes and exam practice sheet for {m['sub']}.",
                            file_type=m["type"],
                            file_url=m["url"],
                            file_size_bytes=m["size"],
                        )
                        session.add(sm)

            # 9. Announcements
            existing_ann = (await session.execute(select(Announcement))).scalars().first()
            if not existing_ann:
                ANNS = [
                    {"title": "Diwali Vacation & Special Revision Schedule", "cat": "holiday", "pin": True, "date": date(2024, 10, 28), "content": "The institute will remain closed for regular classes from Oct 31 to Nov 4. Doubt clearance sessions will be conducted online via Microsoft Teams."},
                    {"title": "Term 2 Pre-Board Test Series Announced", "cat": "exam", "pin": True, "date": date(2024, 10, 20), "content": "Pre-Board Test Series 1 for Standard 10 will commence on December 10, 2024. Detailed subject syllabus and seating layout have been uploaded under Tests tab."},
                    {"title": "Mathematics Extra Problem-Solving Workshop", "cat": "academic", "pin": False, "date": date(2024, 10, 15), "content": "Special weekend workshop on Trigonometric Proofs & Coordinate Geometry this Saturday at 10:00 AM in Hall A."},
                ]
                for a in ANNS:
                    ann = Announcement(
                        institution_id=inst.id,
                        title=a["title"],
                        category=a["cat"],
                        is_pinned=a["pin"],
                        publish_date=a["date"],
                        content=a["content"],
                    )
                    session.add(ann)

            # 10. Student Documents
            existing_doc = (await session.execute(select(StudentDocument))).scalars().first()
            if not existing_doc:
                for s in students[:10]:
                    doc1 = StudentDocument(
                        student_id=s.id,
                        title="Admission & Enrollment Form 2024-25",
                        document_type="Admission Form",
                        file_url=f"/documents/admission_{s.admission_number}.pdf",
                        status="verified",
                    )
                    doc2 = StudentDocument(
                        student_id=s.id,
                        title="Aadhaar Card Copy (Verified)",
                        document_type="Aadhaar",
                        file_url=f"/documents/aadhaar_{s.admission_number}.pdf",
                        status="verified",
                    )
                    session.add_all([doc1, doc2])

            # 11. Student Portal User Accounts
            # Create user account for Rajnees (id=10) and Siddharth (id=43) for student testing
            for s_adm, u_name, s_id in [("PA-2024-000001", "rajnees", 10), ("PA-2024-000034", "siddharth", 43)]:
                existing_u = (await session.execute(select(User).where(User.username == u_name))).scalar_one_or_none()
                if not existing_u:
                    st_obj = await session.get(Student, s_id)
                    u = User(
                        institution_id=inst.id,
                        student_id=s_id,
                        username=u_name,
                        email=f"{u_name}@prashantacademy.edu.in",
                        hashed_password=get_password_hash("student123"),
                        first_name=st_obj.first_name if st_obj else u_name.title(),
                        last_name="",
                        role="student",
                        is_active=True,
                    )
                    session.add(u)

    await engine.dispose()
    print("[SUCCESS] Seeded realistic student portal & profile data successfully.")


if __name__ == "__main__":
    asyncio.run(seed_data())

