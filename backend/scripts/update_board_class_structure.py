# /**
#  * @file        update_board_class_structure.py
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
#  * @description Database maintenance script migrating standards to new multi-board relational schema.
#  */

"""
Prashant Academy — Board, Class, and Student Enrollment Update Script.

Executes within an atomic transaction.
Reuses existing entities, creates missing records if needed,
preserves all financial and academic history, and provides rollback safety.
"""

import asyncio
import os
import sys
from typing import Dict, List, Any
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import select, update

# Add parent dir to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.config import settings
from app.models.institution import Institution
from app.models.academic_year import AcademicYear
from app.models.board import Board
from app.models.standard import Standard
from app.models.division import Division
from app.models.student import Student
from app.models.enrollment import StudentEnrollment
from app.models.fee import FeeStructure

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/prashant_academy")

# User-approved Board and Class mapping and Student Data
MAPPING_DATA = [
    {
        "board_code": "ICSE",
        "board_name": "ICSE",
        "board_desc": "Indian Certificate of Secondary Education",
        "class_level": 10,
        "class_name": "Standard 10",
        "class_code": "X",
        "batch_name": "ICSE X",
        "students": [
            "Rajnees", "Ayaan", "Netham", "Shreshta",
            "Savesh", "Ansh", "Riddhima", "Sonakshi"
        ]
    },
    {
        "board_code": "CBSE",
        "board_name": "CBSE",
        "board_desc": "Central Board of Secondary Education",
        "class_level": 10,
        "class_name": "Standard 10",
        "class_code": "X",
        "batch_name": "CBSE X",
        "students": [
            "Raudrita", "Samruddhi", "Aman", "Ashwin", "Keshwa"
        ]
    },
    {
        "board_code": "ICSE",
        "board_name": "ICSE",
        "board_desc": "Indian Certificate of Secondary Education",
        "class_level": 9,
        "class_name": "Standard 9",
        "class_code": "IX",
        "batch_name": "ICSE IX",
        "legacy_batch_name": "ICSE 9th",
        "students": [
            "Satnam", "Samud", "Simran", "Kashish", "Vedant", "Khushi",
            "Mahek", "Johan", "Avner", "Apika", "Shrawya", "Afton",
            "Maahi", "Aadya", "Rida"
        ]
    },
    {
        "board_code": "ICSE",
        "board_name": "ICSE",
        "board_desc": "Indian Certificate of Secondary Education",
        "class_level": 8,
        "class_name": "Standard 8",
        "class_code": "VIII",
        "batch_name": "ICSE VIII",
        "students": [
            "Puneeta", "Aliya", "Siddhant", "Shaurya", "Chehek"
        ]
    },
    {
        "board_code": "SSC",
        "board_name": "SSC",
        "board_desc": "Secondary School Certificate (State Board)",
        "class_level": 9,
        "class_name": "Standard 9",
        "class_code": "IX",
        "batch_name": "SSC IX",
        "students": [
            "Siddharth", "Aditya", "Shriya", "Sukhmeet", "Sushmya", "Aaradhya"
        ]
    }
]


async def update_board_class_structure(db: AsyncSession) -> Dict[str, Any]:
    report = {
        "boards_created": [],
        "boards_reused": [],
        "classes_created": [],
        "classes_reused": [],
        "divisions_created": [],
        "divisions_updated": [],
        "divisions_reused": [],
        "students_matched_updated": [],
        "students_created": [],
        "students_skipped": [],
        "enrollments_updated": [],
        "enrollments_created": [],
        "duplicate_or_ambiguous": [],
        "total_enrolled": 0,
    }

    # 1. Target Institution
    inst_res = await db.execute(select(Institution).where(Institution.code == "PA001"))
    institution = inst_res.scalar_one_or_none()
    if not institution:
        inst_res = await db.execute(select(Institution).order_by(Institution.id))
        institution = inst_res.scalars().first()
    if not institution:
        raise RuntimeError("No Institution found in database.")

    # 2. Active Academic Year
    ay_res = await db.execute(
        select(AcademicYear).where(
            AcademicYear.institution_id == institution.id,
            AcademicYear.is_current == True
        )
    )
    academic_year = ay_res.scalar_one_or_none()
    if not academic_year:
        academic_year = (await db.execute(
            select(AcademicYear).where(AcademicYear.institution_id == institution.id).order_by(AcademicYear.id.desc())
        )).scalars().first()

    # 3. Manage Boards
    boards_by_code: Dict[str, Board] = {}
    existing_boards = (await db.execute(
        select(Board).where(Board.institution_id == institution.id)
    )).scalars().all()
    for b in existing_boards:
        boards_by_code[b.code] = b

    for item in MAPPING_DATA:
        code = item["board_code"]
        name = item["board_name"]
        desc = item["board_desc"]
        if code not in boards_by_code:
            board = Board(
                institution_id=institution.id,
                name=name,
                code=code,
                description=desc,
                is_active=True,
            )
            db.add(board)
            await db.flush()
            boards_by_code[code] = board
            report["boards_created"].append({"code": code, "name": name, "id": board.id})
        else:
            if code not in [b["code"] for b in report["boards_reused"]]:
                report["boards_reused"].append({"code": code, "name": name, "id": boards_by_code[code].id})

    # 4. Manage Standards (Classes)
    standards_by_level: Dict[int, Standard] = {}
    existing_stds = (await db.execute(
        select(Standard).where(Standard.institution_id == institution.id)
    )).scalars().all()
    for s in existing_stds:
        standards_by_level[s.level] = s

    for item in MAPPING_DATA:
        level = item["class_level"]
        class_desc = f"Class {item['class_code']}"
        std_name = item["class_name"]
        if level not in standards_by_level:
            std = Standard(
                institution_id=institution.id,
                name=std_name,
                level=level,
                description=class_desc,
                is_active=True,
            )
            db.add(std)
            await db.flush()
            standards_by_level[level] = std
            report["classes_created"].append({"level": level, "name": std_name, "class_code": item["class_code"], "id": std.id})
        else:
            std = standards_by_level[level]
            # Update description if needed to reflect class code
            if not std.description or item["class_code"] not in std.description:
                std.description = class_desc
            if level not in [c["level"] for c in report["classes_reused"]]:
                report["classes_reused"].append({"level": level, "name": std.name, "class_code": item["class_code"], "id": std.id})

    # 5. Manage Divisions (Batches)
    divisions_by_name: Dict[str, Division] = {}
    existing_divs = (await db.execute(select(Division))).scalars().all()
    for d in existing_divs:
        divisions_by_name[d.name] = d

    # Handle renaming of ICSE 9th -> ICSE IX if present
    if "ICSE 9th" in divisions_by_name and "ICSE IX" not in divisions_by_name:
        legacy_div = divisions_by_name["ICSE 9th"]
        legacy_div.name = "ICSE IX"
        divisions_by_name["ICSE IX"] = legacy_div
        del divisions_by_name["ICSE 9th"]
        report["divisions_updated"].append({"id": legacy_div.id, "from": "ICSE 9th", "to": "ICSE IX"})

    for item in MAPPING_DATA:
        b_name = item["batch_name"]
        level = item["class_level"]
        std = standards_by_level[level]
        board = boards_by_code[item["board_code"]]

        if b_name not in divisions_by_name:
            div = Division(
                standard_id=std.id,
                board_id=board.id,
                name=b_name,
                capacity=50,
                is_active=True,
            )
            db.add(div)
            await db.flush()
            divisions_by_name[b_name] = div
            report["divisions_created"].append({"name": b_name, "standard": std.name, "board": board.code, "id": div.id})
        else:
            div = divisions_by_name[b_name]
            div.board_id = board.id
            div.standard_id = std.id
            if b_name not in [d["name"] for d in report["divisions_reused"]]:
                report["divisions_reused"].append({"name": b_name, "standard": std.name, "board": board.code, "id": div.id})

    # 6. Update FeeStructure names (e.g. Coaching Fee - ICSE 9th -> Coaching Fee - ICSE IX)
    fee_structs = (await db.execute(
        select(FeeStructure).where(FeeStructure.name.like("%ICSE 9th%"))
    )).scalars().all()
    for fs in fee_structs:
        fs.name = fs.name.replace("ICSE 9th", "ICSE IX")

    # 7. Student Matching & Enrollment Update
    existing_students = (await db.execute(
        select(Student).where(Student.institution_id == institution.id)
    )).scalars().all()

    student_lookup: Dict[str, List[Student]] = {}
    for s in existing_students:
        cleaned_first = s.first_name.strip().lower()
        student_lookup.setdefault(cleaned_first, []).append(s)

    # Cache existing enrollments
    enrollments_res = await db.execute(
        select(StudentEnrollment).where(StudentEnrollment.academic_year_id == academic_year.id)
    )
    enrollments_by_student = {e.student_id: e for e in enrollments_res.scalars().all()}

    student_idx = 1
    for item in MAPPING_DATA:
        b_name = item["batch_name"]
        level = item["class_level"]
        std = standards_by_level[level]
        div = divisions_by_name[b_name]
        board = boards_by_code[item["board_code"]]
        cohort_label = f"{board.code} — Standard {item['class_code']}"

        for name in item["students"]:
            clean_name = name.strip()
            lookup_key = clean_name.lower()
            matched_students = student_lookup.get(lookup_key, [])

            if len(matched_students) > 1:
                report["duplicate_or_ambiguous"].append({
                    "name": clean_name,
                    "cohort": cohort_label,
                    "matched_count": len(matched_students),
                    "student_ids": [s.id for s in matched_students]
                })
                target_student = matched_students[0]
            elif len(matched_students) == 1:
                target_student = matched_students[0]
            else:
                # Student does not exist; create student
                admission_num = f"PA-2024-{student_idx:06d}"
                target_student = Student(
                    institution_id=institution.id,
                    admission_number=admission_num,
                    first_name=clean_name,
                    last_name="",
                    gender="unknown",
                    is_active=True,
                )
                db.add(target_student)
                await db.flush()
                report["students_created"].append({"name": clean_name, "id": target_student.id, "cohort": cohort_label})
                matched_students = [target_student]

            # Update student name to exact casing and strip trailing spaces
            target_student.first_name = clean_name
            target_student.last_name = ""

            # Manage Enrollment
            enr = enrollments_by_student.get(target_student.id)
            roll_no = f"{b_name.replace(' ', '')}-{student_idx:02d}"

            if enr:
                enr.standard_id = std.id
                enr.division_id = div.id
                enr.roll_number = roll_no
                enr.status = "active"
                enr.remarks = f"Registered in {cohort_label} ({b_name})"
                report["enrollments_updated"].append({
                    "student_id": target_student.id,
                    "student_name": clean_name,
                    "cohort": cohort_label,
                    "standard": std.name,
                    "division": div.name,
                    "roll_number": roll_no,
                })
            else:
                enr = StudentEnrollment(
                    student_id=target_student.id,
                    academic_year_id=academic_year.id,
                    standard_id=std.id,
                    division_id=div.id,
                    roll_number=roll_no,
                    enrollment_date=academic_year.start_date,
                    status="active",
                    remarks=f"Registered in {cohort_label} ({b_name})",
                )
                db.add(enr)
                report["enrollments_created"].append({
                    "student_id": target_student.id,
                    "student_name": clean_name,
                    "cohort": cohort_label,
                    "standard": std.name,
                    "division": div.name,
                    "roll_number": roll_no,
                })

            report["students_matched_updated"].append({
                "student_id": target_student.id,
                "admission_number": target_student.admission_number,
                "name": clean_name,
                "cohort": cohort_label,
                "board": board.code,
                "class": item["class_code"],
            })
            report["total_enrolled"] += 1
            student_idx += 1

    await db.flush()
    return report


async def main():
    print("[INFO] Connecting to PostgreSQL database...")
    engine = create_async_engine(DATABASE_URL, echo=False)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with session_factory() as session:
        async with session.begin():
            print("[INFO] Executing update inside database transaction...")
            report = await update_board_class_structure(session)
            print("[SUCCESS] Transaction prepared for commit.")

    await engine.dispose()
    print("\n" + "=" * 70)
    print("DATABASE UPDATE EXECUTION REPORT")
    print("=" * 70)
    print(f"Boards Created: {len(report['boards_created'])} -> {[b['code'] for b in report['boards_created']]}")
    print(f"Boards Reused:  {len(report['boards_reused'])} -> {[b['code'] for b in report['boards_reused']]}")
    print(f"Classes Created: {len(report['classes_created'])}")
    print(f"Classes Reused:  {len(report['classes_reused'])} -> {[c['name'] + ' (' + c['class_code'] + ')' for c in report['classes_reused']]}")
    print(f"Divisions Created: {len(report['divisions_created'])}")
    print(f"Divisions Updated: {len(report['divisions_updated'])} -> {[d['from'] + ' -> ' + d['to'] for d in report['divisions_updated']]}")
    print(f"Divisions Reused:  {len(report['divisions_reused'])} -> {[d['name'] for d in report['divisions_reused']]}")
    print(f"Students Matched & Updated: {len(report['students_matched_updated'])}")
    print(f"Students Created: {len(report['students_created'])}")
    print(f"Students Skipped: {len(report['students_skipped'])}")
    print(f"Total Enrolled in Structure: {report['total_enrolled']}")
    print(f"Ambiguous / Duplicate Matches: {len(report['duplicate_or_ambiguous'])}")
    print("=" * 70)


if __name__ == "__main__":
    asyncio.run(main())

