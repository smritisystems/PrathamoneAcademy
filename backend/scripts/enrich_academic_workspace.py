# /**
#  * @file        enrich_academic_workspace.py
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
#  * @description Database utility populating comprehensive academic structure, batches, and timetable sessions.
#  */

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import asyncio
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.core.security import get_password_hash
from app.models.user import User
from app.models.board import Board
from app.models.standard import Standard
from app.models.division import Division
from app.models.institution import Institution
from app.models.portal import TimetableEntry
from app.models.subject import Subject

async def enrich():
    async with AsyncSessionLocal() as session:
        inst = (await session.execute(select(Institution))).scalars().first()
        inst_id = inst.id if inst else 1

        # 1. Ensure Teachers exist
        teachers_data = [
            {"username": "rahul.desai", "first_name": "Rahul", "last_name": "Desai", "role": "teacher"},
            {"username": "priya.mehta", "first_name": "Priya", "last_name": "Mehta", "role": "teacher"},
            {"username": "amit.patil", "first_name": "Amit", "last_name": "Patil", "role": "teacher"},
            {"username": "neha.kulkarni", "first_name": "Neha", "last_name": "Kulkarni", "role": "teacher"},
        ]
        teachers = {}
        for t in teachers_data:
            existing = (await session.execute(select(User).where(User.username == t["username"]))).scalar_one_or_none()
            if not existing:
                existing = User(
                    institution_id=inst_id,
                    username=t["username"],
                    email=f"{t['username']}@prashantacademy.in",
                    hashed_password=get_password_hash("Teacher@2024"),
                    first_name=t["first_name"],
                    last_name=t["last_name"],
                    role="teacher",
                    is_active=True,
                )
                session.add(existing)
                await session.flush()
            teachers[t["first_name"]] = existing

        # 2. Enrich existing 5 batches with codes, rooms, timings, status, and teachers
        div_updates = [
            (25, "Batch A (Morning)", "ICSE-X-A", "Room 1", "Mon - Fri, 07:00 AM - 09:00 AM", "active", teachers["Rahul"].id),
            (26, "Batch A (Morning)", "CBSE-X-A", "Room 2", "Mon - Fri, 07:00 AM - 09:00 AM", "active", teachers["Priya"].id),
            (27, "Batch A (Morning)", "ICSE-IX-A", "Room 1", "Mon - Fri, 09:15 AM - 11:15 AM", "active", teachers["Amit"].id),
            (28, "Batch A (Morning)", "SSC-IX-A", "Room 3", "Mon - Fri, 07:00 AM - 09:00 AM", "active", teachers["Neha"].id),
            (29, "Batch A (Morning)", "ICSE-VIII-A", "Room 2", "Mon - Fri, 09:15 AM - 11:15 AM", "active", teachers["Rahul"].id),
        ]
        for div_id, name, code, room, timing, status, teacher_id in div_updates:
            div = (await session.execute(select(Division).where(Division.id == div_id))).scalar_one_or_none()
            if div:
                div.name = name
                div.code = code
                div.room_number = room
                div.schedule_timing = timing
                div.status = status
                div.class_teacher_id = teacher_id

        # 3. Add planned / additional batches matching workspace screenshot
        # Find standards and boards
        std_x = (await session.execute(select(Standard).where(Standard.level == 10))).scalars().first()
        std_ix = (await session.execute(select(Standard).where(Standard.level == 9))).scalars().first()
        std_viii = (await session.execute(select(Standard).where(Standard.level == 8))).scalars().first()

        brd_icse = (await session.execute(select(Board).where(Board.code == "ICSE"))).scalars().first()
        brd_cbse = (await session.execute(select(Board).where(Board.code == "CBSE"))).scalars().first()
        brd_ssc = (await session.execute(select(Board).where(Board.code == "SSC"))).scalars().first()

        additional_batches = [
            # ICSE Class X: Batch B, Batch C, Batch D
            {"standard_id": std_x.id, "board_id": brd_icse.id, "name": "Batch B (Morning)", "code": "ICSE-X-B", "room_number": "Room 2", "schedule_timing": "Mon - Fri, 09:15 AM - 11:15 AM", "capacity": 40, "status": "active", "class_teacher_id": teachers["Priya"].id},
            {"standard_id": std_x.id, "board_id": brd_icse.id, "name": "Batch C (Evening)", "code": "ICSE-X-C", "room_number": "Room 3", "schedule_timing": "Mon - Fri, 04:00 PM - 06:00 PM", "capacity": 40, "status": "active", "class_teacher_id": teachers["Amit"].id},
            {"standard_id": std_x.id, "board_id": brd_icse.id, "name": "Batch D (Weekend)", "code": "ICSE-X-D", "room_number": "Room 1", "schedule_timing": "Sat - Sun, 10:00 AM - 01:00 PM", "capacity": 40, "status": "planned", "class_teacher_id": teachers["Neha"].id},
            # ICSE Class IX: Batch B, Batch C
            {"standard_id": std_ix.id, "board_id": brd_icse.id, "name": "Batch B (Evening)", "code": "ICSE-IX-B", "room_number": "Room 2", "schedule_timing": "Mon - Fri, 04:00 PM - 06:00 PM", "capacity": 40, "status": "active", "class_teacher_id": teachers["Rahul"].id},
            {"standard_id": std_ix.id, "board_id": brd_icse.id, "name": "Batch C (Weekend)", "code": "ICSE-IX-C", "room_number": "Room 3", "schedule_timing": "Sat - Sun, 09:00 AM - 12:00 PM", "capacity": 40, "status": "planned", "class_teacher_id": teachers["Amit"].id},
            # CBSE Class X: Batch B, Batch C
            {"standard_id": std_x.id, "board_id": brd_cbse.id, "name": "Batch B (Evening)", "code": "CBSE-X-B", "room_number": "Room 1", "schedule_timing": "Mon - Fri, 04:00 PM - 06:00 PM", "capacity": 40, "status": "active", "class_teacher_id": teachers["Priya"].id},
            {"standard_id": std_x.id, "board_id": brd_cbse.id, "name": "Batch C (Weekend)", "code": "CBSE-X-C", "room_number": "Room 2", "schedule_timing": "Sat - Sun, 10:00 AM - 01:00 PM", "capacity": 40, "status": "planned", "class_teacher_id": teachers["Neha"].id},
            # CBSE Class IX: Batch A, Batch B
            {"standard_id": std_ix.id, "board_id": brd_cbse.id, "name": "Batch A (Morning)", "code": "CBSE-IX-A", "room_number": "Room 3", "schedule_timing": "Mon - Fri, 07:00 AM - 09:00 AM", "capacity": 40, "status": "active", "class_teacher_id": teachers["Amit"].id},
            {"standard_id": std_ix.id, "board_id": brd_cbse.id, "name": "Batch B (Evening)", "code": "CBSE-IX-B", "room_number": "Room 1", "schedule_timing": "Mon - Fri, 04:00 PM - 06:00 PM", "capacity": 40, "status": "planned", "class_teacher_id": teachers["Rahul"].id},
            # SSC Class IX: Batch B, Batch C
            {"standard_id": std_ix.id, "board_id": brd_ssc.id, "name": "Batch B (Evening)", "code": "SSC-IX-B", "room_number": "Room 2", "schedule_timing": "Mon - Fri, 04:00 PM - 06:00 PM", "capacity": 40, "status": "active", "class_teacher_id": teachers["Neha"].id},
            {"standard_id": std_ix.id, "board_id": brd_ssc.id, "name": "Batch C (Weekend)", "code": "SSC-IX-C", "room_number": "Room 3", "schedule_timing": "Sat - Sun, 09:00 AM - 12:00 PM", "capacity": 40, "status": "planned", "class_teacher_id": teachers["Priya"].id},
            # SSC Class X: Batch A, Batch B, Batch C
            {"standard_id": std_x.id, "board_id": brd_ssc.id, "name": "Batch A (Morning)", "code": "SSC-X-A", "room_number": "Room 1", "schedule_timing": "Mon - Fri, 07:00 AM - 09:00 AM", "capacity": 40, "status": "active", "class_teacher_id": teachers["Rahul"].id},
            {"standard_id": std_x.id, "board_id": brd_ssc.id, "name": "Batch B (Evening)", "code": "SSC-X-B", "room_number": "Room 2", "schedule_timing": "Mon - Fri, 04:00 PM - 06:00 PM", "capacity": 40, "status": "active", "class_teacher_id": teachers["Amit"].id},
            {"standard_id": std_x.id, "board_id": brd_ssc.id, "name": "Batch C (Weekend)", "code": "SSC-X-C", "room_number": "Room 3", "schedule_timing": "Sat - Sun, 10:00 AM - 01:00 PM", "capacity": 40, "status": "planned", "class_teacher_id": teachers["Neha"].id},
        ]

        for b in additional_batches:
            existing = (await session.execute(
                select(Division).where(
                    Division.standard_id == b["standard_id"],
                    Division.board_id == b["board_id"],
                    Division.code == b["code"],
                )
            )).scalar_one_or_none()
            if not existing:
                div = Division(
                    standard_id=b["standard_id"],
                    board_id=b["board_id"],
                    name=b["name"],
                    code=b["code"],
                    room_number=b["room_number"],
                    schedule_timing=b["schedule_timing"],
                    capacity=b["capacity"],
                    status=b["status"],
                    class_teacher_id=b["class_teacher_id"],
                    is_active=True,
                )
                session.add(div)

        # 4. Timetable Entries for batches so Weekly Sessions metric and Schedule modal are populated
        # Check timetable entries count
        tt_count = (await session.execute(select(TimetableEntry))).scalars().all()
        if len(tt_count) < 50:
            # Add sample schedule slots across Monday to Saturday for the active batches
            active_divs = (await session.execute(select(Division).where(Division.is_active == True))).scalars().all()
            subjects = (await session.execute(select(Subject))).scalars().all()
            subjs_by_std = {}
            for s in subjects:
                subjs_by_std.setdefault(s.standard_id, []).append(s)

            for d in active_divs:
                if d.id in [25, 26, 27, 28, 29]:
                    continue # already has entries
                std_subjs = subjs_by_std.get(d.standard_id, [])
                if not std_subjs:
                    continue
                # Add 4-6 slots per week
                days = ["Monday", "Wednesday", "Friday"] if "Morning" in d.name else ["Tuesday", "Thursday", "Saturday"]
                for i, day in enumerate(days):
                    subj = std_subjs[i % len(std_subjs)]
                    t_entry = TimetableEntry(
                        division_id=d.id,
                        subject_id=subj.id,
                        day_of_week=day,
                        start_time="07:00" if "Morning" in d.name else "16:00",
                        end_time="09:00" if "Morning" in d.name else "18:00",
                        room_number=d.room_number or "Room 1",
                        is_active=True,
                    )
                    session.add(t_entry)

        await session.commit()
        print("[SUCCESS] Academic structure and batches enriched successfully!")

if __name__ == "__main__":
    asyncio.run(enrich())

