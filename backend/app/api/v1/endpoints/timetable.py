# /**
#  * @file        timetable.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      backend.app.api.v1.endpoints
#  *
#  * @author      Jawahar R. Mallah
#  * @organization AITDL (AI Technology & Development Lab)
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 AITDL
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-04
#  * @updated     2026-11-06
#  *
#  * @description API endpoints for class timetable scheduling, room allocation, and collision detection.
#  */

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime

from app.core.database import get_db
from app.core.deps import get_current_active_user, require_role
from app.models.portal import TimetableEntry
from app.models.division import Division
from app.models.subject import Subject
from app.models.standard import Standard
from app.models.board import Board
from app.models.user import User

router = APIRouter()


class TimetableEntryCreate(BaseModel):
    division_id: int
    subject_id: int
    day_of_week: str
    start_time: str
    end_time: str
    room_number: Optional[str] = "Room 101"


class TimetableEntryUpdate(BaseModel):
    subject_id: Optional[int] = None
    day_of_week: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    room_number: Optional[str] = None
    is_active: Optional[bool] = None


class ConflictCheckRequest(BaseModel):
    room_number: Optional[str] = None
    day_of_week: str
    start_time: str
    end_time: str
    division_id: Optional[int] = None
    teacher_id: Optional[int] = None
    exclude_entry_id: Optional[int] = None


@router.get("/")
async def list_timetable_entries(
    division_id: Optional[int] = Query(None),
    standard_id: Optional[int] = Query(None),
    board_id: Optional[int] = Query(None),
    day_of_week: Optional[str] = Query(None),
    room_number: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    query = (
        select(
            TimetableEntry,
            Division.name.label("division_name"),
            Division.code.label("division_code"),
            Subject.name.label("subject_name"),
            Subject.code.label("subject_code"),
            Standard.name.label("standard_name"),
            Board.code.label("board_code"),
            User.first_name.label("teacher_first_name"),
            User.last_name.label("teacher_last_name"),
        )
        .join(Division, TimetableEntry.division_id == Division.id)
        .join(Subject, TimetableEntry.subject_id == Subject.id)
        .join(Standard, Division.standard_id == Standard.id)
        .outerjoin(Board, Division.board_id == Board.id)
        .outerjoin(User, Division.class_teacher_id == User.id)
        .where(TimetableEntry.is_active == True)
    )

    if division_id:
        query = query.where(TimetableEntry.division_id == division_id)
    if standard_id:
        query = query.where(Division.standard_id == standard_id)
    if board_id:
        query = query.where(Division.board_id == board_id)
    if day_of_week and day_of_week.lower() != "all":
        query = query.where(TimetableEntry.day_of_week.ilike(day_of_week))
    if room_number and room_number.lower() != "all":
        query = query.where(TimetableEntry.room_number.ilike(room_number))

    rows = (await db.execute(query.order_by(TimetableEntry.day_of_week, TimetableEntry.start_time))).all()

    # Day of week sort order
    day_order = {"Monday": 1, "Tuesday": 2, "Wednesday": 3, "Thursday": 4, "Friday": 5, "Saturday": 6, "Sunday": 7}

    results = []
    for (
        tt,
        div_name,
        div_code,
        sub_name,
        sub_code,
        std_name,
        brd_code,
        t_first,
        t_last,
    ) in rows:
        results.append({
            "id": tt.id,
            "division_id": tt.division_id,
            "division_name": div_name,
            "division_code": div_code,
            "subject_id": tt.subject_id,
            "subject_name": sub_name,
            "subject_code": sub_code,
            "standard_name": std_name,
            "board_code": brd_code,
            "day_of_week": tt.day_of_week,
            "start_time": tt.start_time,
            "end_time": tt.end_time,
            "room_number": tt.room_number or "Room 1",
            "teacher_name": f"{t_first} {t_last}".strip() if t_first else "Unassigned",
            "is_active": tt.is_active,
        })

    results.sort(key=lambda r: (day_order.get(r["day_of_week"], 99), r["start_time"]))
    return results


@router.get("/rooms")
async def list_distinct_rooms(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    query = (
        select(TimetableEntry.room_number)
        .where(TimetableEntry.is_active == True, TimetableEntry.room_number.isnot(None))
        .distinct()
        .order_by(TimetableEntry.room_number)
    )
    rooms = (await db.execute(query)).scalars().all()
    # Add common rooms if not present
    default_rooms = ["Room 101", "Room 102", "Room 103", "Hall A", "Lab 1"]
    all_rooms = sorted(list(set(rooms + default_rooms)))
    return all_rooms


@router.post("/check-conflict")
async def check_conflict(
    req: ConflictCheckRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    # 1. Room conflict check
    if req.room_number and req.day_of_week:
        room_stmt = (
            select(TimetableEntry, Division)
            .join(Division, TimetableEntry.division_id == Division.id)
            .where(
                TimetableEntry.room_number.ilike(req.room_number),
                TimetableEntry.day_of_week.ilike(req.day_of_week),
                TimetableEntry.is_active == True,
            )
        )
        if req.exclude_entry_id:
            room_stmt = room_stmt.where(TimetableEntry.id != req.exclude_entry_id)

        entries = (await db.execute(room_stmt)).all()
        for tt, div in entries:
            # Overlap condition: not (new_end <= existing_start or new_start >= existing_end)
            if not (req.end_time <= tt.start_time or req.start_time >= tt.end_time):
                return {
                    "has_conflict": True,
                    "conflict_type": "room",
                    "details": f"Room '{req.room_number}' is already occupied by {div.name} on {req.day_of_week} ({tt.start_time} - {tt.end_time}).",
                }

    # 2. Batch conflict check (same batch cannot have two classes simultaneously)
    if req.division_id and req.day_of_week:
        batch_stmt = (
            select(TimetableEntry, Subject)
            .join(Subject, TimetableEntry.subject_id == Subject.id)
            .where(
                TimetableEntry.division_id == req.division_id,
                TimetableEntry.day_of_week.ilike(req.day_of_week),
                TimetableEntry.is_active == True,
            )
        )
        if req.exclude_entry_id:
            batch_stmt = batch_stmt.where(TimetableEntry.id != req.exclude_entry_id)

        batch_entries = (await db.execute(batch_stmt)).all()
        for tt, sub in batch_entries:
            if not (req.end_time <= tt.start_time or req.start_time >= tt.end_time):
                return {
                    "has_conflict": True,
                    "conflict_type": "batch",
                    "details": f"This batch already has a {sub.name} class scheduled on {req.day_of_week} ({tt.start_time} - {tt.end_time}).",
                }

    # 3. Teacher conflict check (same teacher cannot teach two batches at the same time)
    check_teacher_id = req.teacher_id
    if not check_teacher_id and req.division_id:
        div_rec = (await db.execute(select(Division).where(Division.id == req.division_id))).scalar_one_or_none()
        if div_rec and div_rec.class_teacher_id:
            check_teacher_id = div_rec.class_teacher_id

    if check_teacher_id and req.day_of_week:
        teacher_stmt = (
            select(TimetableEntry, Division, User)
            .join(Division, TimetableEntry.division_id == Division.id)
            .join(User, Division.class_teacher_id == User.id)
            .where(
                Division.class_teacher_id == check_teacher_id,
                TimetableEntry.day_of_week.ilike(req.day_of_week),
                TimetableEntry.is_active == True,
            )
        )
        if req.exclude_entry_id:
            teacher_stmt = teacher_stmt.where(TimetableEntry.id != req.exclude_entry_id)
        if req.division_id:
            teacher_stmt = teacher_stmt.where(TimetableEntry.division_id != req.division_id)

        teacher_entries = (await db.execute(teacher_stmt)).all()
        for tt, div, teacher in teacher_entries:
            if not (req.end_time <= tt.start_time or req.start_time >= tt.end_time):
                return {
                    "has_conflict": True,
                    "conflict_type": "teacher",
                    "details": f"Faculty {teacher.first_name} {teacher.last_name} is already assigned to {div.name} on {req.day_of_week} ({tt.start_time} - {tt.end_time}).",
                }

    return {"has_conflict": False, "conflict_type": None, "details": None}


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_timetable_entry(
    data: TimetableEntryCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("superadmin", "admin", "principal")),
):
    # Validate conflict
    conflict_check = await check_conflict(
        ConflictCheckRequest(
            room_number=data.room_number,
            day_of_week=data.day_of_week,
            start_time=data.start_time,
            end_time=data.end_time,
            division_id=data.division_id,
        ),
        db=db,
        current_user=current_user,
    )
    if conflict_check["has_conflict"]:
        raise HTTPException(status_code=400, detail=conflict_check["details"])

    entry = TimetableEntry(
        division_id=data.division_id,
        subject_id=data.subject_id,
        day_of_week=data.day_of_week,
        start_time=data.start_time,
        end_time=data.end_time,
        room_number=data.room_number,
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return {"id": entry.id, "message": "Class schedule session added successfully"}


@router.put("/{entry_id}")
async def update_timetable_entry(
    entry_id: int,
    data: TimetableEntryUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("superadmin", "admin", "principal")),
):
    entry = (
        await db.execute(select(TimetableEntry).where(TimetableEntry.id == entry_id))
    ).scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Schedule session not found")

    new_room = data.room_number if data.room_number is not None else entry.room_number
    new_day = data.day_of_week if data.day_of_week is not None else entry.day_of_week
    new_start = data.start_time if data.start_time is not None else entry.start_time
    new_end = data.end_time if data.end_time is not None else entry.end_time

    # Conflict check
    conflict_check = await check_conflict(
        ConflictCheckRequest(
            room_number=new_room,
            day_of_week=new_day,
            start_time=new_start,
            end_time=new_end,
            division_id=entry.division_id,
            exclude_entry_id=entry.id,
        ),
        db=db,
        current_user=current_user,
    )
    if conflict_check["has_conflict"]:
        raise HTTPException(status_code=400, detail=conflict_check["details"])

    update_dict = data.model_dump(exclude_unset=True)
    for k, v in update_dict.items():
        if hasattr(entry, k) and v is not None:
            setattr(entry, k, v)

    await db.commit()
    await db.refresh(entry)
    return {"id": entry.id, "message": "Schedule session updated successfully"}


@router.delete("/{entry_id}")
async def delete_timetable_entry(
    entry_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("superadmin", "admin", "principal")),
):
    entry = (
        await db.execute(select(TimetableEntry).where(TimetableEntry.id == entry_id))
    ).scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Schedule session not found")

    entry.is_active = False
    await db.commit()
    return {"id": entry.id, "message": "Schedule session removed successfully"}

