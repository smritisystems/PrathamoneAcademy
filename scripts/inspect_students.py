# /**
#  * @file        inspect_students.py
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
#  * @description Inspects student enrollments and academic year filters.
#  */

import asyncio
import asyncpg


async def main():
    conn = await asyncpg.connect("postgresql://postgres:postgres@localhost:5432/prashant_academy")
    tables = await conn.fetch("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%enroll%'")
    for t in tables:
        tbl = t["table_name"]
        cnt = await conn.fetchval(f"SELECT count(*) FROM {tbl}")
        print(f"Table {tbl}: {cnt} rows")

    # Check student_enrollments columns
    se_cols = await conn.fetch("SELECT column_name FROM information_schema.columns WHERE table_name = 'student_enrollments'")
    print("Columns in student_enrollments:", [c["column_name"] for c in se_cols])

    # Check academic years
    ay = await conn.fetch("SELECT id, name, is_current FROM academic_years")
    print("Academic years:", [dict(a) for a in ay])

    await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
