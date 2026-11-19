# /**
#  * @file        update_admin_profile.py
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
#  * @description Updates administrative display persona to Dr. Rajesh Kulkarni (Director) for broadcast presentation authenticity.
#  */

import sys
from pathlib import Path
sys.path.insert(0, str(Path("backend").resolve()))

import asyncio
from app.core.database import AsyncSessionLocal
from sqlalchemy import text

async def main():
    async with AsyncSessionLocal() as db:
        await db.execute(
            text(
                "UPDATE users SET first_name = :first, last_name = :last, designation = :desig WHERE email = :email"
            ),
            {"first": "Dr. Rajesh", "last": "Kulkarni", "desig": "Director & Founder", "email": "admin@prathamone.com"}
        )
        await db.commit()
        res = await db.execute(
            text("SELECT id, username, first_name, last_name, role, designation FROM users WHERE email = :email"),
            {"email": "admin@prathamone.com"}
        )
        row = res.fetchone()
        print("Updated Admin User Profile:", row)

if __name__ == "__main__":
    asyncio.run(main())
