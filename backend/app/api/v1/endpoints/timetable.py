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
#  * @updated     2026-11-13
#  *
#  * @description API endpoints for class timetable scheduling, room allocation, and collision detection.
#  */

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from datetime import datetime, timedelta

from app.core.database import get_db
from app.core.deps import get_current_active_user, require_role, check_institution_access, is_sysadmin
from app.models.portal import TimetableEntry
from app.models.division import Division
from app.models.subject import Subject, SubjectMapping
from app.models.standard import Standard
from app.models.board import Board
from app.models.user import User
from app.models.institution import Institution
from app.models.academic_year import AcademicYear

router = APIRouter()


class TimetableEntryCreate(BaseModel):
    division_id: int
    subject_id: int
    day_of_week: str
    start_time: str
    end_time: str
    room_number: Optional[str] = "Room 101"
    teacher_id: Optional[int] = None


class TimetableEntryUpdate(BaseModel):
    subject_id: Optional[int] = None
    day_of_week: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    room_number: Optional[str] = None
    teacher_id: Optional[int] = None
    is_active: Optional[bool] = None


class ConflictCheckRequest(BaseModel):
    room_number: Optional[str] = None
    day_of_week: str
    start_time: str
    end_time: str
    division_id: Optional[int] = None
    teacher_id: Optional[int] = None
    exclude_entry_id: Optional[int] = None


class BatchSlotGenerationRequest(BaseModel):
    division_id: int
    subject_id: int
    teacher_id: Optional[int] = None
    room_number: Optional[str] = "Room 101"
    period_duration_mins: int = 45
    start_time: str = "08:30"
    number_of_periods: int = 4
    break_after_period: int = 2
    break_duration_mins: int = 15
    days: List[str] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]


async def _query_timetable_entries(
    db: AsyncSession,
    current_user,
    division_id: Optional[int] = None,
    standard_id: Optional[int] = None,
    board_id: Optional[int] = None,
    day_of_week: Optional[str] = None,
    room_number: Optional[str] = None,
    teacher_id: Optional[int] = None,
) -> List[Dict[str, Any]]:
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
        .outerjoin(User, func.coalesce(TimetableEntry.teacher_id, Division.class_teacher_id) == User.id)
        .where(TimetableEntry.is_active == True)
    )

    if not is_sysadmin(current_user):
        inst_id = getattr(current_user, "institution_id", None)
        if inst_id is None:
            raise HTTPException(status_code=403, detail="Institution context required")
        query = query.where(Standard.institution_id == inst_id)

    if teacher_id is not None:
        query = query.where(
            or_(
                TimetableEntry.teacher_id == teacher_id,
                and_(TimetableEntry.teacher_id.is_(None), Division.class_teacher_id == teacher_id),
            )
        )
    if division_id is not None:
        query = query.where(TimetableEntry.division_id == division_id)
    if standard_id is not None:
        query = query.where(Division.standard_id == standard_id)
    if board_id is not None:
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
            "teacher_id": tt.teacher_id,
            "teacher_name": f"{t_first} {t_last}".strip() if t_first else "Unassigned",
            "is_active": tt.is_active,
        })

    results.sort(key=lambda r: (day_order.get(r["day_of_week"], 99), r["start_time"]))
    return results


@router.get("/")
async def list_timetable_entries(
    division_id: Optional[int] = Query(None),
    standard_id: Optional[int] = Query(None),
    board_id: Optional[int] = Query(None),
    day_of_week: Optional[str] = Query(None),
    room_number: Optional[str] = Query(None),
    teacher_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    return await _query_timetable_entries(
        db=db,
        current_user=current_user,
        division_id=division_id,
        standard_id=standard_id,
        board_id=board_id,
        day_of_week=day_of_week,
        room_number=room_number,
        teacher_id=teacher_id,
    )


@router.get("/rooms")
async def list_distinct_rooms(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    query = (
        select(TimetableEntry.room_number)
        .join(Division, TimetableEntry.division_id == Division.id)
        .join(Standard, Division.standard_id == Standard.id)
        .where(TimetableEntry.is_active == True, TimetableEntry.room_number.isnot(None))
    )
    if not is_sysadmin(current_user):
        inst_id = getattr(current_user, "institution_id", None)
        if inst_id is None:
            raise HTTPException(status_code=403, detail="Institution context required")
        query = query.where(Standard.institution_id == inst_id)
    query = query.distinct().order_by(TimetableEntry.room_number)
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
    inst_filter_id = None
    if not is_sysadmin(current_user):
        inst_filter_id = getattr(current_user, "institution_id", None)
        if inst_filter_id is None:
            raise HTTPException(status_code=403, detail="Institution context required")

    if req.division_id:
        div_std = (
            await db.execute(
                select(Standard.institution_id)
                .join(Division, Division.standard_id == Standard.id)
                .where(Division.id == req.division_id)
            )
        ).first()
        if not div_std:
            raise HTTPException(status_code=404, detail="Division not found")
        check_institution_access(div_std[0], current_user)

    # 1. Room conflict check
    if req.room_number and req.day_of_week:
        room_stmt = (
            select(TimetableEntry, Division)
            .join(Division, TimetableEntry.division_id == Division.id)
            .join(Standard, Division.standard_id == Standard.id)
            .where(
                TimetableEntry.room_number.ilike(req.room_number),
                TimetableEntry.day_of_week.ilike(req.day_of_week),
                TimetableEntry.is_active == True,
            )
        )
        if inst_filter_id is not None:
            room_stmt = room_stmt.where(Standard.institution_id == inst_filter_id)
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
            .join(Division, TimetableEntry.division_id == Division.id)
            .join(Standard, Division.standard_id == Standard.id)
            .where(
                TimetableEntry.division_id == req.division_id,
                TimetableEntry.day_of_week.ilike(req.day_of_week),
                TimetableEntry.is_active == True,
            )
        )
        if inst_filter_id is not None:
            batch_stmt = batch_stmt.where(Standard.institution_id == inst_filter_id)
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
            .join(Standard, Division.standard_id == Standard.id)
            .outerjoin(User, func.coalesce(TimetableEntry.teacher_id, Division.class_teacher_id) == User.id)
            .where(
                func.coalesce(TimetableEntry.teacher_id, Division.class_teacher_id) == check_teacher_id,
                TimetableEntry.day_of_week.ilike(req.day_of_week),
                TimetableEntry.is_active == True,
            )
        )
        if inst_filter_id is not None:
            teacher_stmt = teacher_stmt.where(Standard.institution_id == inst_filter_id)
        if req.exclude_entry_id:
            teacher_stmt = teacher_stmt.where(TimetableEntry.id != req.exclude_entry_id)
        if req.division_id:
            teacher_stmt = teacher_stmt.where(TimetableEntry.division_id != req.division_id)

        teacher_entries = (await db.execute(teacher_stmt)).all()
        for tt, div, teacher in teacher_entries:
            if not (req.end_time <= tt.start_time or req.start_time >= tt.end_time):
                t_name = f"{teacher.first_name} {teacher.last_name}".strip() if teacher else "Faculty"
                return {
                    "has_conflict": True,
                    "conflict_type": "teacher",
                    "details": f"Faculty '{t_name}' is already assigned to {div.name} on {req.day_of_week} ({tt.start_time} - {tt.end_time}).",
                }

    return {"has_conflict": False, "conflict_type": None, "details": None}


async def _compute_timetable_matrix(
    db: AsyncSession,
    current_user,
    division_id: Optional[int] = None,
    standard_id: Optional[int] = None,
    teacher_id: Optional[int] = None,
    room_number: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Computes weekly schedule matrix organized by Days and unique Time Slots.
    """
    entries = await _query_timetable_entries(
        db=db,
        current_user=current_user,
        division_id=division_id,
        standard_id=standard_id,
        teacher_id=teacher_id,
        room_number=room_number,
        day_of_week="all",
    )
    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

    # Extract distinct sorted time slots
    slot_set = set((e["start_time"], e["end_time"]) for e in entries)
    sorted_slots = sorted(list(slot_set), key=lambda x: x[0])
    slots_list = [
        {"start_time": s[0], "end_time": s[1], "slot_key": f"{s[0]}-{s[1]}"}
        for s in sorted_slots
    ]

    matrix: Dict[str, Dict[str, Any]] = {d: {} for d in days}
    for e in entries:
        d = e["day_of_week"]
        if d in matrix:
            key = f"{e['start_time']}-{e['end_time']}"
            matrix[d][key] = e

    total_minutes = 0
    for e in entries:
        try:
            t1 = datetime.strptime(e["start_time"], "%H:%M")
            t2 = datetime.strptime(e["end_time"], "%H:%M")
            total_minutes += int((t2 - t1).total_seconds() / 60)
        except Exception:
            pass

    unique_teachers = len(set(e["teacher_name"] for e in entries if e["teacher_name"] != "Unassigned"))
    unique_subjects = len(set(e["subject_name"] for e in entries))
    unique_rooms = len(set(e["room_number"] for e in entries if e["room_number"]))

    scope_info: Dict[str, Any] = {}
    if division_id:
        div = await db.get(Division, division_id)
        if div:
            std = await db.get(Standard, div.standard_id)
            scope_info = {
                "type": "division",
                "id": div.id,
                "name": div.name,
                "code": div.code,
                "standard_name": std.name if std else "",
                "room_number": div.room_number,
            }
    elif teacher_id:
        teacher = await db.get(User, teacher_id)
        if teacher:
            scope_info = {
                "type": "teacher",
                "id": teacher.id,
                "name": f"{teacher.first_name} {teacher.last_name}".strip(),
                "email": teacher.email,
            }

    return {
        "scope": scope_info,
        "days": days,
        "slots": slots_list,
        "matrix": matrix,
        "entries": entries,
        "summary": {
            "total_sessions": len(entries),
            "total_hours": round(total_minutes / 60, 1),
            "unique_teachers": unique_teachers,
            "unique_subjects": unique_subjects,
            "rooms_used": unique_rooms,
        },
    }


@router.get("/matrix")
async def get_timetable_matrix(
    division_id: Optional[int] = Query(None),
    standard_id: Optional[int] = Query(None),
    teacher_id: Optional[int] = Query(None),
    room_number: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """
    Returns weekly schedule matrix organized by Days and unique Time Slots.
    Ideal for class timetable displays, teacher load matrices, and room grid views.
    """
    return await _compute_timetable_matrix(
        db=db,
        current_user=current_user,
        division_id=division_id,
        standard_id=standard_id,
        teacher_id=teacher_id,
        room_number=room_number,
    )


@router.get("/export/docket")
async def get_timetable_export_docket(
    division_id: Optional[int] = Query(None),
    teacher_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """
    Returns complete printable timetable docket data including institute branding,
    division/teacher details, weekly grid, room allocation, and authorized footer.
    """
    inst_id = getattr(current_user, "institution_id", 1) or 1
    inst = await db.get(Institution, inst_id)
    matrix_data = await _compute_timetable_matrix(
        db=db,
        current_user=current_user,
        division_id=division_id,
        teacher_id=teacher_id,
    )

    ay = (
        await db.execute(
            select(AcademicYear).where(
                AcademicYear.institution_id == inst_id,
                AcademicYear.is_current == True,
            )
        )
    ).scalar_one_or_none()
    ay_name = ay.name if ay else "2026-27"

    inst_header = {
        "name": inst.name if inst else "Prashant Academy",
        "code": inst.code if inst else "PA01",
        "tagline": inst.tagline if (inst and inst.tagline) else "Empowering Young Minds for Academic Excellence",
        "address": (
            f"{inst.address or ''}, {inst.city or ''}, {inst.state or ''} {inst.pincode or ''}".strip(", ")
            if inst
            else "Ghatkopar East, Mumbai 400077"
        ),
        "phone": inst.phone if (inst and inst.phone) else "+91 98200 00000",
        "email": inst.email if (inst and inst.email) else "contact@prashantacademy.in",
        "website": inst.website if (inst and inst.website) else "www.prashantacademy.in",
        "logo_url": inst.logo_url if (inst and inst.logo_url) else None,
    }

    return {
        "institution": inst_header,
        "academic_year": ay_name,
        "docket_type": "division" if division_id else ("teacher" if teacher_id else "master"),
        "scope": matrix_data["scope"],
        "days": matrix_data["days"],
        "slots": matrix_data["slots"],
        "matrix": matrix_data["matrix"],
        "summary": matrix_data["summary"],
        "signatures": {
            "prepared_by": "Academic Coordinator",
            "verified_by": "Head of Department",
            "approved_by": "Principal / Director",
        },
        "generated_at": datetime.now().isoformat(),
    }


@router.post("/batch-generate-slots", status_code=status.HTTP_201_CREATED)
async def batch_generate_default_slots(
    data: BatchSlotGenerationRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("superadmin", "admin", "principal")),
):
    """
    Automates generation of recurring period schedule slots for a division across weekdays.
    """
    div = await db.get(Division, data.division_id)
    if not div:
        raise HTTPException(status_code=404, detail="Division not found")
    std = await db.get(Standard, div.standard_id)
    check_institution_access(std.institution_id if std else None, current_user)

    sub = await db.get(Subject, data.subject_id)
    if not sub:
        raise HTTPException(status_code=404, detail="Subject not found")

    sm_id = (
        await db.execute(
            select(SubjectMapping.id).where(
                SubjectMapping.legacy_subject_id == data.subject_id
            )
        )
    ).scalar_one_or_none()

    # Calculate time slots
    curr_time = datetime.strptime(data.start_time, "%H:%M")
    created_count = 0

    for period_idx in range(1, data.number_of_periods + 1):
        slot_start = curr_time.strftime("%H:%M")
        curr_time += timedelta(minutes=data.period_duration_mins)
        slot_end = curr_time.strftime("%H:%M")

        for day in data.days:
            # Check for conflict
            conflict = await check_conflict(
                ConflictCheckRequest(
                    room_number=data.room_number,
                    day_of_week=day,
                    start_time=slot_start,
                    end_time=slot_end,
                    division_id=data.division_id,
                    teacher_id=data.teacher_id,
                ),
                db=db,
                current_user=current_user,
            )
            if not conflict["has_conflict"]:
                entry = TimetableEntry(
                    division_id=data.division_id,
                    subject_id=data.subject_id,
                    subject_mapping_id=sm_id,
                    teacher_id=data.teacher_id,
                    day_of_week=day,
                    start_time=slot_start,
                    end_time=slot_end,
                    room_number=data.room_number,
                )
                db.add(entry)
                created_count += 1

        if period_idx == data.break_after_period:
            curr_time += timedelta(minutes=data.break_duration_mins)

    await db.commit()
    return {
        "message": f"Successfully created {created_count} timetable sessions across {len(data.days)} days.",
        "created_count": created_count,
    }


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_timetable_entry(
    data: TimetableEntryCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("superadmin", "admin", "principal")),
):
    div = await db.get(Division, data.division_id)
    if not div:
        raise HTTPException(status_code=404, detail="Division not found")
    std = await db.get(Standard, div.standard_id)
    check_institution_access(std.institution_id if std else None, current_user)

    sub = await db.get(Subject, data.subject_id)
    if not sub:
        raise HTTPException(status_code=404, detail="Subject not found")
    sub_std = await db.get(Standard, sub.standard_id)
    check_institution_access(sub_std.institution_id if sub_std else None, current_user)

    # Validate conflict
    conflict_check = await check_conflict(
        ConflictCheckRequest(
            room_number=data.room_number,
            day_of_week=data.day_of_week,
            start_time=data.start_time,
            end_time=data.end_time,
            division_id=data.division_id,
            teacher_id=data.teacher_id,
        ),
        db=db,
        current_user=current_user,
    )
    if conflict_check["has_conflict"]:
        raise HTTPException(status_code=400, detail=conflict_check["details"])

    sm_id = (
        await db.execute(
            select(SubjectMapping.id).where(
                SubjectMapping.legacy_subject_id == data.subject_id
            )
        )
    ).scalar_one_or_none()

    entry = TimetableEntry(
        division_id=data.division_id,
        subject_id=data.subject_id,
        subject_mapping_id=sm_id,
        teacher_id=data.teacher_id,
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

    div = await db.get(Division, entry.division_id)
    std = await db.get(Standard, div.standard_id) if div else None
    check_institution_access(std.institution_id if std else None, current_user)

    if data.subject_id is not None:
        sub = await db.get(Subject, data.subject_id)
        if not sub:
            raise HTTPException(status_code=404, detail="Subject not found")
        sub_std = await db.get(Standard, sub.standard_id)
        check_institution_access(sub_std.institution_id if sub_std else None, current_user)

    new_room = data.room_number if data.room_number is not None else entry.room_number
    new_day = data.day_of_week if data.day_of_week is not None else entry.day_of_week
    new_start = data.start_time if data.start_time is not None else entry.start_time
    new_end = data.end_time if data.end_time is not None else entry.end_time
    new_teacher = data.teacher_id if data.teacher_id is not None else entry.teacher_id

    # Conflict check
    conflict_check = await check_conflict(
        ConflictCheckRequest(
            room_number=new_room,
            day_of_week=new_day,
            start_time=new_start,
            end_time=new_end,
            division_id=entry.division_id,
            teacher_id=new_teacher,
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

    div = await db.get(Division, entry.division_id)
    std = await db.get(Standard, div.standard_id) if div else None
    check_institution_access(std.institution_id if std else None, current_user)

    entry.is_active = False
    await db.commit()
    return {"id": entry.id, "message": "Schedule session removed successfully"}

