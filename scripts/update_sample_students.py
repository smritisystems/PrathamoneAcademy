# /**
#  * @file        update_sample_students.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      scripts
#  *
#  * @author      Jawahar R. Mallah
#  * @organization Smritisys & AITDL Networks
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 PrathamOne EduOS
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-19
#  * @updated     2026-11-19
#  *
#  * @description Enriches sample student records with realistic Indian names (including Aarav Sharma) and full demographic metadata.
#  */

import asyncio
import asyncpg

STUDENT_UPDATES = [
    (139, "Aarav", "Sharma", "MALE", "CBSEX-11"),
    (129, "Rajveer", "Singhania", "MALE", "ICSEX-01"),
    (130, "Ayaan", "Deshmukh", "MALE", "ICSEX-02"),
    (131, "Nethan", "Kulkarni", "MALE", "ICSEX-03"),
    (132, "Shreshta", "Iyer", "FEMALE", "ICSEX-04"),
    (133, "Sarvesh", "Patel", "MALE", "ICSEX-05"),
    (134, "Ansh", "Verma", "MALE", "ICSEX-06"),
    (135, "Riddhima", "Chopra", "FEMALE", "ICSEX-07"),
    (136, "Sonakshi", "Mehta", "FEMALE", "ICSEX-08"),
    (138, "Samruddhi", "Joshi", "FEMALE", "CBSEX-10"),
    (140, "Ashwin", "Menon", "MALE", "CBSEX-12"),
    (141, "Keshwa", "Nair", "MALE", "CBSEX-13"),
]


async def main():
    conn = await asyncpg.connect("postgresql://postgres:postgres@localhost:5432/prashant_academy")

    for s_id, first, last, gender, roll in STUDENT_UPDATES:
        await conn.execute(
            """
            UPDATE students 
            SET first_name = $1, last_name = $2, gender = $3
            WHERE id = $4
            """,
            first,
            last,
            gender,
            s_id,
        )
        await conn.execute(
            """
            UPDATE student_enrollments
            SET roll_number = $1
            WHERE student_id = $2 AND academic_year_id = 1
            """,
            roll,
            s_id,
        )

    print("Updated 12 sample students with realistic Indian names and roll numbers.")

    # Verify
    rows = await conn.fetch(
        """
        SELECT s.id, s.admission_number, s.first_name, s.last_name, se.roll_number
        FROM students s
        JOIN student_enrollments se ON se.student_id = s.id AND se.academic_year_id = 1
        WHERE s.id = ANY($1::int[])
        ORDER BY s.id
        """,
        [u[0] for u in STUDENT_UPDATES],
    )
    for r in rows:
        print(" ", dict(r))

    await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
