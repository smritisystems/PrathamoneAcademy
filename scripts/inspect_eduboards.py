# /**
#  * @file        inspect_eduboards.py
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
#  * @description Inspects eduboard columns and pages in the PostgreSQL database.
#  */

import asyncio
import asyncpg


async def main():
    conn = await asyncpg.connect("postgresql://postgres:postgres@localhost:5432/prashant_academy")
    for tbl in ["edu_boards", "edu_board_pages"]:
        print(f"\n--- Columns in {tbl} ---")
        cols = await conn.fetch(f"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '{tbl}' ORDER BY ordinal_position")
        for c in cols:
            print(f"  {c['column_name']}: {c['data_type']}")

    print("\n--- Current Boards ---")
    boards = await conn.fetch("SELECT id, board_code, title, board_mode_default, latest_revision_no, page_count FROM edu_boards WHERE is_deleted = false")
    for b in boards:
        print(" ", dict(b))

    print("\n--- Current Pages ---")
    pages = await conn.fetch("SELECT id, board_id, page_uid, page_order, title, mode, background_style FROM edu_board_pages ORDER BY id")
    for p in pages:
        print(" ", dict(p))

    await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
