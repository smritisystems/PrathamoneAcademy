# /**
#  * @file        reconcile_student_assignments.py
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
#  * @description Authoritative student class and standard assignment reconciliation engine.
#  */

import os
import sys
import asyncio
from sqlalchemy import text
from app.core.database import AsyncSessionLocal

AUTHORITATIVE_GROUPS = {
    ("ICSE", "Class X", "ICSE-X-A"): [
        "Rajnees", "Ayaan", "Netham", "Shreshta", "Savesh", "Ansh", "Riddhima", "Sonakshi"
    ],
    ("CBSE", "Class X", "CBSE-X-A"): [
        "Raudrita", "Samruddhi", "Aman", "Ashwin", "Keshwa"
    ],
    ("ICSE", "Class IV", "ICSE-IV-A"): [
        "Satnam", "Samud", "Simran", "Kashish", "Vedant", "Khushi", "Mahek", "Johan",
        "Avner", "Apika", "Shrawya", "Afton", "Maahi", "Aadya", "Rida"
    ],
    ("ICSE", "Class VIII", "ICSE-VIII-A"): [
        "Puneeta", "Aliya", "Siddhant", "Shaurya", "Chehek"
    ],
    ("SSC", "Class IX", "SSC-IX-A"): [
        "Siddharth", "Aditya", "Shriya", "Sukhmeet", "Sushmya", "Aaradhya"
    ]
}

ICSE_IV_STUDENT_IDS = [142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 156]

async def reconcile():
    async with AsyncSessionLocal() as session:
        print("[RECONCILE] Beginning student class and standard reconciliation...")

        # 1. Ensure Standard 4 has name 'Class IV'
        await session.execute(text(
            "UPDATE standards SET name = 'Class IV', description = 'Class IV' WHERE id = 4"
        ))
        print("  [OK] Standard ID 4 updated to 'Class IV'")

        # 2. Ensure Division 7 is configured for ICSE Class IV
        # Check if division 7 exists or needs board/code update
        await session.execute(text("""
            UPDATE divisions 
            SET name = 'Batch A (Morning)',
                code = 'ICSE-IV-A',
                board_id = 1,
                room_number = 'Room 1',
                schedule_timing = 'Mon - Fri, 09:15 AM - 11:15 AM',
                status = 'active',
                is_active = true,
                capacity = 40
            WHERE id = 7
        """))
        print("  [OK] Division ID 7 configured as ICSE-IV-A ('Batch A (Morning)')")

        # 3. Update the 15 ICSE IV students enrollments
        for s_id in ICSE_IV_STUDENT_IDS:
            if s_id != 155:
                await session.execute(text(f"""
                    UPDATE student_enrollments
                    SET standard_id = 4,
                        division_id = 7,
                        status = 'active'
                    WHERE student_id = {s_id} AND id = {s_id}
                """))
            else:
                # Aadya has primary enrollment id 155
                await session.execute(text("""
                    UPDATE student_enrollments
                    SET standard_id = 4,
                        division_id = 7,
                        status = 'active'
                    WHERE student_id = 155 AND id = 155
                """))
                # Mark test audit enrollments as transferred
                await session.execute(text("""
                    UPDATE student_enrollments
                    SET status = 'transferred'
                    WHERE student_id = 155 AND id != 155
                """))
        print(f"  [OK] Enrolled 15 students into ICSE Class IV (Division 7)")

        # 4. Clean up Raudrita (137) in CBSE X
        # Primary active in row 171 (CBSE-X-A)
        await session.execute(text("""
            UPDATE student_enrollments
            SET status = 'active'
            WHERE student_id = 137 AND id = 171
        """))
        await session.execute(text("""
            UPDATE student_enrollments
            SET status = 'transferred'
            WHERE student_id = 137 AND id = 172
        """))
        print("  [OK] Reconciled Raudrita (137) in CBSE X (Division 26)")

        # 5. Clean up Aditya (163) and Aaradhya (167) in SSC IX
        await session.execute(text("""
            UPDATE student_enrollments
            SET status = 'active'
            WHERE student_id = 163 AND id = 163
        """))
        await session.execute(text("""
            UPDATE student_enrollments
            SET status = 'active'
            WHERE student_id = 167 AND id = 167
        """))
        await session.execute(text("""
            UPDATE student_enrollments
            SET status = 'transferred'
            WHERE student_id = 167 AND id IN (174, 177)
        """))
        print("  [OK] Reconciled Aditya (163) and Aaradhya (167) in SSC IX (Division 28)")

        # 6. Update fee structure names for the 15 students to reflect Class IV
        await session.execute(text("""
            UPDATE fee_structures
            SET name = REPLACE(name, 'ICSE IX', 'ICSE IV'),
                standard_id = 4
            WHERE id BETWEEN 101 AND 115
        """))
        print("  [OK] Updated Fee Structures 101-115 to ICSE IV")

        await session.commit()
        print("\n[SUCCESS] All student class assignments reconciled and committed successfully.\n")

if __name__ == "__main__":
    asyncio.run(reconcile())

