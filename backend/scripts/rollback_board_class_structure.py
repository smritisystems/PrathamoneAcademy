# /**
#  * @file        rollback_board_class_structure.py
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
#  * @description Database migration rollback utility reverting educational board table schema changes.
#  */

"""
Prashant Academy — Rollback Plan Script for Board, Class, and Student Enrollment Update.

Reverts:
1. Division 'ICSE IX' back to 'ICSE 9th' (if desired).
2. Clears board_id links on divisions.
3. Restores FeeStructure names to 'Coaching Fee - ICSE 9th'.
"""

import asyncio
import os
import sys
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import select, update

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.models.division import Division
from app.models.fee import FeeStructure

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/prashant_academy")


async def rollback():
    print("[INFO] Executing rollback plan inside database transaction...")
    engine = create_async_engine(DATABASE_URL, echo=False)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with session_factory() as session:
        async with session.begin():
            # 1. Rename ICSE IX back to ICSE 9th
            res = await session.execute(select(Division).where(Division.name == "ICSE IX"))
            div = res.scalar_one_or_none()
            if div:
                div.name = "ICSE 9th"
                print("  Reverted division 'ICSE IX' -> 'ICSE 9th'")

            # 2. Clear board_id on divisions
            all_divs = (await session.execute(select(Division))).scalars().all()
            for d in all_divs:
                d.board_id = None
            print("  Cleared board_id linkages on divisions")

            # 3. Restore FeeStructure name
            fee_structs = (await session.execute(
                select(FeeStructure).where(FeeStructure.name.like("%ICSE IX%"))
            )).scalars().all()
            for fs in fee_structs:
                fs.name = fs.name.replace("ICSE IX", "ICSE 9th")
                print("  Restored FeeStructure name to include 'ICSE 9th'")

    await engine.dispose()
    print("[SUCCESS] Rollback completed safely.")


if __name__ == "__main__":
    asyncio.run(rollback())

