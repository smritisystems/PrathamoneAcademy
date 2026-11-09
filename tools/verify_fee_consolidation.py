# /**
#  * @file        verify_fee_consolidation.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      tools
#  *
#  * @author      Jawahar R. Mallah
#  * @organization AITDL (AI Technology & Development Lab)
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 AITDL
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-09
#  * @updated     2026-11-09
#  *
#  * @description Verify fee consolidation results and ledger sum immutability.
#  */

import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def check():
    engine = create_async_engine('postgresql+asyncpg://postgres:postgres@db:5432/prashant_academy')
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'"))
        total = res.scalar()
        print(f"Total tables in public schema: {total}")

        res_pay = await conn.execute(text("SELECT count(*), sum(amount) FROM payments"))
        p_row = res_pay.fetchone()
        print(f"Payments Ledger: {p_row[0]} rows, Total Sum = Rs. {p_row[1]:,}")

        res_assign = await conn.execute(text("SELECT count(*) FROM student_fee_assignments"))
        print(f"Student Fee Assignments: {res_assign.scalar()} rows")

        # Verify discounts, scholarships, fee_installments do not exist
        res_tables = await conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_name IN ('discounts', 'scholarships', 'fee_installments')"))
        dropped = res_tables.fetchall()
        print(f"Remaining duplicate tables in DB: {dropped}")

if __name__ == '__main__':
    asyncio.run(check())
