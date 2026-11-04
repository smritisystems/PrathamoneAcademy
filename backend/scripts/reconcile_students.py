# /**
#  * @file        reconcile_students.py
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
#  * @description Diagnostic and reconciliation script verifying student board and standard assignments.
#  */

import os
import sys
import asyncio
from sqlalchemy import text
from app.core.database import AsyncSessionLocal

# Authoritative student assignments:
AUTHORITATIVE = {
    ("ICSE", "X"): [
        "Rajnees", "Ayaan", "Netham", "Shreshta", "Savesh", "Ansh", "Riddhima", "Sonakshi"
    ],
    ("CBSE", "X"): [
        "Raudrita", "Samruddhi", "Aman", "Ashwin", "Keshwa"
    ],
    ("ICSE", "IV"): [
        "Satnam", "Samud", "Simran", "Kashish", "Vedant", "Khushi", "Mahek", "Johan",
        "Avner", "Apika", "Shrawya", "Afton", "Maahi", "Aadya", "Rida"
    ],
    ("ICSE", "VIII"): [
        "Puneeta", "Aliya", "Siddhant", "Shaurya", "Chehek"
    ],
    ("SSC", "IX"): [
        "Siddharth", "Aditya", "Shriya", "Sukhmeet", "Sushmya", "Aaradhya"
    ]
}

async def inspect_current_state():
    async with AsyncSessionLocal() as session:
        # 1. Fetch all boards
        res_boards = await session.execute(text("SELECT id, name, code FROM boards ORDER BY id"))
        boards = {row.id: {"name": row.name, "code": row.code} for row in res_boards.fetchall()}
        print("=== BOARDS ===")
        for bid, binfo in boards.items():
            print(f"  Board ID {bid}: {binfo['name']} ({binfo['code']})")

        # 2. Fetch all standards
        res_standards = await session.execute(
            text("SELECT s.id, s.name, s.board_id, b.code as board_code, b.name as board_name "
                 "FROM standards s LEFT JOIN boards b ON s.board_id = b.id ORDER BY s.id")
        )
        standards = {}
        for row in res_standards.fetchall():
            standards[row.id] = {
                "name": row.name,
                "board_id": row.board_id,
                "board_code": row.board_code,
                "board_name": row.board_name
            }
        print("\n=== STANDARDS / CLASSES ===")
        for sid, sinfo in standards.items():
            print(f"  Standard ID {sid}: {sinfo['name']} | Board: {sinfo['board_name']} ({sinfo['board_code']})")

        # 3. Fetch all batches/divisions
        res_divs = await session.execute(
            text("SELECT d.id, d.name, d.standard_id, s.name as standard_name "
                 "FROM divisions d LEFT JOIN standards s ON d.standard_id = s.id ORDER BY d.id")
        )
        divisions = {}
        for row in res_divs.fetchall():
            divisions[row.id] = {
                "name": row.name,
                "standard_id": row.standard_id,
                "standard_name": row.standard_name
            }
        print("\n=== BATCHES / DIVISIONS ===")
        for did, dinfo in divisions.items():
            print(f"  Division ID {did}: {dinfo['name']} | Standard: {dinfo['standard_name']} (Std ID: {dinfo['standard_id']})")

        # 4. Fetch all students
        res_students = await session.execute(
            text("SELECT s.id, s.first_name, s.last_name, s.admission_number, s.standard_id, s.board_id, "
                 "st.name as standard_name, b.code as board_code, b.name as board_name "
                 "FROM students s "
                 "LEFT JOIN standards st ON s.standard_id = st.id "
                 "LEFT JOIN boards b ON s.board_id = b.id "
                 "ORDER BY s.id")
        )
        students = res_students.fetchall()
        print(f"\n=== TOTAL STUDENTS IN DB: {len(students)} ===")
        for s in students:
            print(f"  Student {s.id}: {s.first_name} {s.last_name or ''} (Adm: {s.admission_number}) | "
                  f"Board: {s.board_code} (ID: {s.board_id}) | Standard: {s.standard_name} (ID: {s.standard_id})")

        # 5. Fetch enrollments
        res_enr = await session.execute(
            text("SELECT e.id, e.student_id, e.standard_id, e.division_id, e.academic_year_id, e.status, "
                 "s.first_name, st.name as standard_name, d.name as division_name "
                 "FROM enrollments e "
                 "LEFT JOIN students s ON e.student_id = s.id "
                 "LEFT JOIN standards st ON e.standard_id = st.id "
                 "LEFT JOIN divisions d ON e.division_id = d.id "
                 "ORDER BY e.student_id, e.id")
        )
        enrollments = res_enr.fetchall()
        print(f"\n=== TOTAL ENROLLMENTS IN DB: {len(enrollments)} ===")
        for e in enrollments:
            print(f"  Enr {e.id}: Student {e.student_id} ({e.first_name}) | "
                  f"Std: {e.standard_name} (ID: {e.standard_id}) | "
                  f"Div: {e.division_name} (ID: {e.division_id}) | Status: {e.status}")

if __name__ == "__main__":
    asyncio.run(inspect_current_state())
