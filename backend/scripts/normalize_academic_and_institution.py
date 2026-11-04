# /**
#  * @file        normalize_academic_and_institution.py
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
#  * @description Normalizes institution ID to 1 and synchronizes academic years, dates, and attendances for 2026-27.
#  */

import os
import sys
import asyncio
from datetime import date, timedelta
from decimal import Decimal

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import text
from app.core.database import AsyncSessionLocal


async def normalize_data():
    print("=" * 80)
    print("NORMALIZING INSTITUTION ID AND ACADEMIC YEARS")
    print("=" * 80)

    async with AsyncSessionLocal() as session:
        # 1. Update institution ID to 1 if it is 2
        # First check existing institution
        curr_inst = (await session.execute(text("SELECT id, name, code FROM institutions LIMIT 1;"))).fetchone()
        print(f"Current institution: ID={curr_inst[0]}, Name={curr_inst[1]}, Code={curr_inst[2]}")

        if curr_inst[0] != 1:
            print("[Step 1] Migrating institution ID to 1 for universal compatibility...")
            # Disable FK checks temporarily for update
            await session.execute(text("ALTER TABLE academic_years DROP CONSTRAINT IF EXISTS academic_years_institution_id_fkey;"))
            await session.execute(text("ALTER TABLE announcements DROP CONSTRAINT IF EXISTS announcements_institution_id_fkey;"))
            await session.execute(text("ALTER TABLE boards DROP CONSTRAINT IF EXISTS boards_institution_id_fkey;"))
            await session.execute(text("ALTER TABLE fee_categories DROP CONSTRAINT IF EXISTS fee_categories_institution_id_fkey;"))
            await session.execute(text("ALTER TABLE fee_structures DROP CONSTRAINT IF EXISTS fee_structures_institution_id_fkey;"))
            await session.execute(text("ALTER TABLE standards DROP CONSTRAINT IF EXISTS standards_institution_id_fkey;"))
            await session.execute(text("ALTER TABLE students DROP CONSTRAINT IF EXISTS students_institution_id_fkey;"))
            await session.execute(text("ALTER TABLE study_materials DROP CONSTRAINT IF EXISTS study_materials_institution_id_fkey;"))
            await session.execute(text("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_institution_id_fkey;"))

            # Update institutions table
            await session.execute(text("UPDATE institutions SET id = 1 WHERE id = :old_id;"), {"old_id": curr_inst[0]})
            # Update all referencing tables
            for tbl in ["academic_years", "announcements", "boards", "fee_categories", "fee_structures", "standards", "students", "study_materials", "users"]:
                await session.execute(text(f"UPDATE {tbl} SET institution_id = 1 WHERE institution_id = :old_id;"), {"old_id": curr_inst[0]})

            # Restore foreign key constraints
            await session.execute(text("ALTER TABLE academic_years ADD CONSTRAINT academic_years_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE;"))
            await session.execute(text("ALTER TABLE announcements ADD CONSTRAINT announcements_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE;"))
            await session.execute(text("ALTER TABLE boards ADD CONSTRAINT boards_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE;"))
            await session.execute(text("ALTER TABLE fee_categories ADD CONSTRAINT fee_categories_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE;"))
            await session.execute(text("ALTER TABLE fee_structures ADD CONSTRAINT fee_structures_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE;"))
            await session.execute(text("ALTER TABLE standards ADD CONSTRAINT standards_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE;"))
            await session.execute(text("ALTER TABLE students ADD CONSTRAINT students_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE;"))
            await session.execute(text("ALTER TABLE study_materials ADD CONSTRAINT study_materials_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE;"))
            await session.execute(text("ALTER TABLE users ADD CONSTRAINT users_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE;"))

            await session.execute(text("SELECT setval('institutions_id_seq', 1);"))
            print("  -> Institution ID normalized to 1 across all 9 tables.")

        # 2. Normalize Academic Years
        print("\n[Step 2] Aligning Academic Years and Financial Dates...")
        # Clean existing and set up standardized academic years
        # ID 1: Current session 2026-27 (active)
        # ID 2: Historical session 2024-25
        # ID 3: Historical session 2025-26
        await session.execute(text("""
            UPDATE academic_years
            SET name = '2026-27',
                start_date = '2026-04-01',
                end_date = '2027-03-31',
                is_current = true,
                is_active = true,
                institution_id = 1
            WHERE id = 1;
        """))

        # Check if ID 2 exists, otherwise insert
        ay2 = (await session.execute(text("SELECT id FROM academic_years WHERE id = 2;"))).scalar()
        if not ay2:
            await session.execute(text("""
                INSERT INTO academic_years (id, institution_id, name, start_date, end_date, is_current, is_active, created_at, updated_at)
                VALUES (2, 1, '2024-25', '2024-04-01', '2025-03-31', false, true, NOW(), NOW())
                ON CONFLICT (id) DO UPDATE SET name = '2024-25', is_current = false;
            """))
        else:
            await session.execute(text("""
                UPDATE academic_years
                SET name = '2024-25',
                    start_date = '2024-04-01',
                    end_date = '2025-03-31',
                    is_current = false,
                    is_active = true,
                    institution_id = 1
                WHERE id = 2;
            """))

        # Check if ID 3 exists
        ay3 = (await session.execute(text("SELECT id FROM academic_years WHERE id = 3;"))).scalar()
        if not ay3:
            await session.execute(text("""
                INSERT INTO academic_years (id, institution_id, name, start_date, end_date, is_current, is_active, created_at, updated_at)
                VALUES (3, 1, '2025-26', '2025-04-01', '2026-03-31', false, true, NOW(), NOW())
                ON CONFLICT (id) DO UPDATE SET name = '2025-26', is_current = false;
            """))
        else:
            await session.execute(text("""
                UPDATE academic_years
                SET name = '2025-26',
                    start_date = '2025-04-01',
                    end_date = '2026-03-31',
                    is_current = false,
                    is_active = true,
                    institution_id = 1
                WHERE id = 3;
            """))

        await session.execute(text("SELECT setval('academic_years_id_seq', 3);"))
        print("  -> Academic Years aligned: AY 2026-27 (Current, ID 1), AY 2024-25 (ID 2), AY 2025-26 (ID 3).")

        # 3. Synchronize Attendance for Current Session (up to today 2026-11-04)
        print("\n[Step 3] Seeding Attendance up to Today (2026-11-04)...")
        # Check if attendance for today exists
        today_att = (await session.execute(text("SELECT count(*) FROM attendances WHERE date = '2026-11-04';"))).scalar()
        if today_att == 0:
            # Shift / add attendance records for recent 20 dates in Oct-Nov 2026
            # Get all active enrollments
            enrs = (await session.execute(text("SELECT id, student_id FROM student_enrollments WHERE status = 'active';"))).fetchall()
            target_dates = [
                date(2026, 10, 12), date(2026, 10, 14), date(2026, 10, 16), date(2026, 10, 17),
                date(2026, 10, 19), date(2026, 10, 21), date(2026, 10, 23), date(2026, 10, 24),
                date(2026, 10, 26), date(2026, 10, 28), date(2026, 10, 30), date(2026, 10, 31),
                date(2026, 11, 2),  date(2026, 11, 3),  date(2026, 11, 4), # Includes today!
            ]

            att_inserted = 0
            for d in target_dates:
                for enr_id, s_id in enrs:
                    metric = (s_id * 17 + d.day * 13) % 100
                    status = "present" if metric < 92 else ("absent" if metric < 98 else "late")
                    rem = "Present" if status == "present" else ("Medical" if status == "absent" else "Late by 10 mins")

                    await session.execute(text("""
                        INSERT INTO attendances (student_id, enrollment_id, date, status, remarks, marked_by_id, created_at)
                        VALUES (:s_id, :enr_id, :d, :status, :rem, 1, NOW())
                        ON CONFLICT DO NOTHING;
                    """), {"s_id": s_id, "enr_id": enr_id, "d": d, "status": status, "rem": rem})
                    att_inserted += 1

            print(f"  -> Added {att_inserted} attendance records across recent session dates including today (2026-11-04).")

        # 4. Synchronize Examinations to 2026-27 Term
        print("\n[Step 4] Aligning Examinations to 2026-27 Session...")
        await session.execute(text("""
            UPDATE examinations
            SET start_date = start_date + INTERVAL '2 years',
                end_date = end_date + INTERVAL '2 years',
                academic_year_id = 1
            WHERE start_date < '2025-01-01';
        """))
        print("  -> Examination schedule dates shifted to 2026-27 session.")

        await session.commit()
        print("\n" + "=" * 80)
        print("NORMALIZATION COMPLETED SUCCESSFULLY!")
        print("=" * 80)


if __name__ == "__main__":
    asyncio.run(normalize_data())

