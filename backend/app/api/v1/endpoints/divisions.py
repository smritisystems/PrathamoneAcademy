# /**
#  * @file        divisions.py
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
#  * @created     2026-11-03
#  * @updated     2026-11-06
#  *
#  * @description API endpoints for batch/division management, teacher allocation, capacity, and scheduling.
#  */

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime

from app.core.database import get_db
from app.core.deps import get_current_active_user, require_role
from app.services.settings_service import get_institution_setting
from app.models.division import Division
from app.models.standard import Standard
from app.models.board import Board
from app.models.user import User, AuditLog
from app.models.subject import Subject
from app.models.enrollment import StudentEnrollment
from app.models.student import Student
from app.models.fee import FeeInvoice
from app.models.payment import PaymentAllocation
from app.models.portal import TimetableEntry

router = APIRouter()


class DivisionCreate(BaseModel):
    standard_id: int
    board_id: Optional[int] = None
    name: str
    code: Optional[str] = None
    capacity: int = 40
    room_number: Optional[str] = None
    schedule_timing: Optional[str] = None
    status: str = "active"
    class_teacher_id: Optional[int] = None


class DivisionUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    capacity: Optional[int] = None
    room_number: Optional[str] = None
    schedule_timing: Optional[str] = None
    status: Optional[str] = None
    class_teacher_id: Optional[int] = None
    standard_id: Optional[int] = None
    board_id: Optional[int] = None
    is_active: Optional[bool] = None


class ConflictCheckRequest(BaseModel):
    teacher_id: Optional[int] = None
    room_number: Optional[str] = None
    day_of_week: Optional[str] = None
    start_time: str
    end_time: str
    exclude_division_id: Optional[int] = None


@router.get("/")
async def list_divisions(
    standard_id: Optional[int] = Query(None),
    board_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    query = (
        select(Division, Standard, Board, User)
        .join(Standard, Division.standard_id == Standard.id)
        .outerjoin(Board, Division.board_id == Board.id)
        .outerjoin(User, Division.class_teacher_id == User.id)
    )

    if isinstance(status_filter, str) and status_filter.strip() and status_filter.lower() != "all":
        query = query.where(Division.status == status_filter.lower())
    else:
        query = query.where(Division.is_active == True)

    if isinstance(standard_id, int):
        query = query.where(Division.standard_id == standard_id)
    if isinstance(board_id, int):
        query = query.where(Division.board_id == board_id)
    if isinstance(search, str) and search.strip():
        s = f"%{search.strip()}%"
        query = query.where(
            or_(
                Division.name.ilike(s),
                Division.code.ilike(s),
                Division.room_number.ilike(s),
                Division.schedule_timing.ilike(s),
                User.first_name.ilike(s),
                User.last_name.ilike(s),
            )
        )

    query = query.order_by(Standard.level, Division.name)
    rows = (await db.execute(query)).all()

    # Pre-fetch enrollments count per division
    enrollment_counts_query = (
        select(StudentEnrollment.division_id, func.count(StudentEnrollment.id))
        .where(StudentEnrollment.status == "active")
        .group_by(StudentEnrollment.division_id)
    )
    enr_counts = dict((await db.execute(enrollment_counts_query)).all())

    # Pre-fetch subjects per standard
    subjects_query = select(Subject).where(Subject.is_active == True)
    all_subjs = (await db.execute(subjects_query)).scalars().all()
    subjs_by_std = {}
    for sub in all_subjs:
        subjs_by_std.setdefault(sub.standard_id, []).append(sub.name)

    results = []
    for d, std, brd, teacher in rows:
        enrolled = enr_counts.get(d.id, 0)
        cap = d.capacity or 40
        occ_pct = round((enrolled / cap) * 100) if cap > 0 else 0
        teacher_name = f"{teacher.first_name} {teacher.last_name}".strip() if teacher else None

        results.append({
            "id": d.id,
            "name": d.name,
            "code": d.code or f"{brd.code if brd else 'BAT'}-{std.level}-{d.name[:1]}",
            "standard_id": d.standard_id,
            "standard_name": std.name,
            "standard_level": std.level,
            "board_id": d.board_id,
            "board_name": brd.name if brd else None,
            "board_code": brd.code if brd else None,
            "capacity": cap,
            "room_number": d.room_number or "Room 1",
            "schedule_timing": d.schedule_timing or "Mon - Fri, 07:00 AM - 09:00 AM",
            "status": d.status or "active",
            "is_active": d.is_active,
            "class_teacher_id": d.class_teacher_id,
            "class_teacher_name": teacher_name or "Unassigned",
            "enrolled_count": enrolled,
            "available_seats": max(0, cap - enrolled),
            "occupancy_percentage": occ_pct,
            "subjects": subjs_by_std.get(d.standard_id, ["General Coaching"]),
        })

    return results


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_division(
    data: DivisionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("superadmin", "admin", "principal")),
):
    # Check if duplicate code exists under same standard and board
    if data.code:
        dup_stmt = select(Division).where(
            Division.standard_id == data.standard_id,
            Division.code == data.code,
            Division.is_active == True,
        )
        if data.board_id:
            dup_stmt = dup_stmt.where(Division.board_id == data.board_id)
        dup = (await db.execute(dup_stmt)).scalar_one_or_none()
        if dup:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Batch code '{data.code}' already exists in this standard.",
            )

    division = Division(
        standard_id=data.standard_id,
        board_id=data.board_id,
        name=data.name,
        code=data.code,
        capacity=data.capacity,
        room_number=data.room_number,
        schedule_timing=data.schedule_timing,
        status=data.status,
        class_teacher_id=data.class_teacher_id,
        is_active=True,
    )
    db.add(division)

    # Log audit
    audit = AuditLog(
        user_id=current_user.id,
        action="create",
        resource_type="division",
        resource_id=0,
        new_data=f"Created batch '{division.name}' ({division.code})",
    )
    db.add(audit)

    await db.commit()
    await db.refresh(division)
    audit.resource_id = division.id
    await db.commit()

    return {
        "id": division.id,
        "name": division.name,
        "code": division.code,
        "standard_id": division.standard_id,
        "board_id": division.board_id,
        "capacity": division.capacity,
        "status": division.status,
    }


@router.get("/{division_id}")
async def get_division(
    division_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    query = (
        select(Division, Standard, Board, User)
        .join(Standard, Division.standard_id == Standard.id)
        .outerjoin(Board, Division.board_id == Board.id)
        .outerjoin(User, Division.class_teacher_id == User.id)
        .where(Division.id == division_id)
    )
    row = (await db.execute(query)).first()
    if not row:
        raise HTTPException(status_code=404, detail="Batch / Division not found")

    d, std, brd, teacher = row

    enrolled = (
        await db.execute(
            select(func.count(StudentEnrollment.id)).where(
                StudentEnrollment.division_id == d.id,
                StudentEnrollment.status == "active",
            )
        )
    ).scalar() or 0

    subjects_query = select(Subject.name).where(
        Subject.standard_id == d.standard_id, Subject.is_active == True
    )
    subjects = (await db.execute(subjects_query)).scalars().all()

    return {
        "id": d.id,
        "name": d.name,
        "code": d.code,
        "standard_id": d.standard_id,
        "standard_name": std.name,
        "standard_level": std.level,
        "board_id": d.board_id,
        "board_name": brd.name if brd else None,
        "board_code": brd.code if brd else None,
        "capacity": d.capacity,
        "room_number": d.room_number,
        "schedule_timing": d.schedule_timing,
        "status": d.status,
        "is_active": d.is_active,
        "class_teacher_id": d.class_teacher_id,
        "class_teacher_name": f"{teacher.first_name} {teacher.last_name}" if teacher else None,
        "enrolled_count": enrolled,
        "available_seats": max(0, d.capacity - enrolled),
        "occupancy_percentage": round((enrolled / d.capacity) * 100) if d.capacity else 0,
        "subjects": subjects,
    }


@router.put("/{division_id}")
async def update_division(
    division_id: int,
    data: DivisionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("superadmin", "admin", "principal")),
):
    division = (
        await db.execute(select(Division).where(Division.id == division_id))
    ).scalar_one_or_none()
    if not division:
        raise HTTPException(status_code=404, detail="Batch / Division not found")

    old_data = f"name={division.name}, code={division.code}, capacity={division.capacity}, status={division.status}"

    update_dict = data.model_dump(exclude_unset=True)
    for field, val in update_dict.items():
        if hasattr(division, field) and val is not None:
            setattr(division, field, val)

    audit = AuditLog(
        user_id=current_user.id,
        action="update",
        resource_type="division",
        resource_id=division.id,
        old_data=old_data,
        new_data=str(update_dict),
    )
    db.add(audit)

    await db.commit()
    await db.refresh(division)
    return {"id": division.id, "name": division.name, "status": division.status}


@router.put("/{division_id}/archive")
async def archive_division(
    division_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("superadmin", "admin", "principal")),
):
    division = (
        await db.execute(select(Division).where(Division.id == division_id))
    ).scalar_one_or_none()
    if not division:
        raise HTTPException(status_code=404, detail="Batch not found")

    division.status = "archived"
    division.is_active = False

    audit = AuditLog(
        user_id=current_user.id,
        action="archive",
        resource_type="division",
        resource_id=division.id,
        new_data=f"Batch '{division.name}' archived",
    )
    db.add(audit)
    await db.commit()

    return {"id": division.id, "status": "archived", "message": f"Batch '{division.name}' successfully archived."}


@router.get("/{division_id}/roster")
async def get_division_roster(
    division_id: int,
    status: Optional[str] = Query(default=None),
    include_inactive: Optional[bool] = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    div_query = (
        select(Division, Standard, Board)
        .join(Standard, Division.standard_id == Standard.id)
        .outerjoin(Board, Division.board_id == Board.id)
        .where(Division.id == division_id)
    )
    div_row = (await db.execute(div_query)).first()
    if not div_row:
        raise HTTPException(status_code=404, detail="Batch not found")
    div, std, brd = div_row

    user_inst_id = getattr(current_user, "institution_id", None) or 1
    configured_list_mode = await get_institution_setting(
        db, user_inst_id, "admission", "student_visibility_lists", "active_only"
    )

    # Query enrolled students respecting status criteria & institute settings
    roster_query = (
        select(Student, StudentEnrollment)
        .join(StudentEnrollment, Student.id == StudentEnrollment.student_id)
        .where(StudentEnrollment.division_id == division_id)
    )

    if status:
        st = status.strip().lower()
        if st == "active":
            roster_query = roster_query.where(StudentEnrollment.status == "active", Student.is_active == True)
        elif st == "inactive":
            roster_query = roster_query.where(or_(StudentEnrollment.status == "inactive", Student.is_active == False))
        elif st == "withdrawn":
            roster_query = roster_query.where(
                or_(
                    StudentEnrollment.status == "withdrawn",
                    and_(Student.is_active == False, Student.exit_date.isnot(None)),
                )
            )
        elif st == "completed":
            roster_query = roster_query.where(StudentEnrollment.status == "completed")
        elif st == "graduated":
            roster_query = roster_query.where(StudentEnrollment.status == "graduated")
        elif st in ("all", "include_all"):
            pass
        else:
            roster_query = roster_query.where(StudentEnrollment.status == st)
    elif include_inactive is not None:
        if not include_inactive:
            roster_query = roster_query.where(StudentEnrollment.status == "active", Student.is_active == True)
    else:
        if configured_list_mode != "include_all":
            roster_query = roster_query.where(StudentEnrollment.status == "active", Student.is_active == True)

    roster_query = roster_query.order_by(StudentEnrollment.roll_number, Student.first_name)
    rows = (await db.execute(roster_query)).all()

    # Pre-fetch fee obligations and payments
    student_ids = [s.id for s, _ in rows]
    fees_by_student = {}
    paid_by_student = {}

    if student_ids:
        invoices_query = (
            select(FeeInvoice.student_id, func.sum(FeeInvoice.total_amount))
            .where(FeeInvoice.student_id.in_(student_ids), FeeInvoice.status != "cancelled")
            .group_by(FeeInvoice.student_id)
        )
        fees_by_student = dict((await db.execute(invoices_query)).all())

        allocations_query = (
            select(FeeInvoice.student_id, func.sum(PaymentAllocation.allocated_amount))
            .join(PaymentAllocation, FeeInvoice.id == PaymentAllocation.invoice_id)
            .where(FeeInvoice.student_id.in_(student_ids))
            .group_by(FeeInvoice.student_id)
        )
        paid_by_student = dict((await db.execute(allocations_query)).all())

    students_list = []
    for s, enr in rows:
        tot_fee = float(fees_by_student.get(s.id, 0.0) or 0.0)
        tot_paid = float(paid_by_student.get(s.id, 0.0) or 0.0)
        outstanding = max(0.0, tot_fee - tot_paid)
        fee_label = "Paid" if outstanding <= 0 and tot_paid > 0 else ("Partially Paid" if tot_paid > 0 else "Unpaid")

        students_list.append({
            "id": s.id,
            "enrollment_id": enr.id,
            "roll_number": enr.roll_number or "-",
            "admission_number": s.admission_number,
            "first_name": s.first_name,
            "last_name": s.last_name or "",
            "status": enr.status,
            "is_active": s.is_active,
            "full_name": f"{s.first_name} {s.last_name or ''}".strip(),
            "gender": s.gender,
            "phone": s.phone,
            "email": s.email,
            "status": "active" if s.is_active else "inactive",
            "enrollment_date": str(enr.enrollment_date) if enr.enrollment_date else None,
            "total_fee": tot_fee,
            "total_paid": tot_paid,
            "outstanding_balance": outstanding,
            "fee_status": fee_label,
        })

    return {
        "batch_id": div.id,
        "batch_name": div.name,
        "batch_code": div.code,
        "standard_name": std.name,
        "board_name": brd.name if brd else None,
        "capacity": div.capacity,
        "enrolled_count": len(students_list),
        "available_seats": max(0, div.capacity - len(students_list)),
        "students": students_list,
        "configured_visibility": configured_list_mode,
        "effective_status": status or ("all" if include_inactive or configured_list_mode == "include_all" else "active"),
    }


@router.post("/check-conflict")
async def check_conflict(
    req: ConflictCheckRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    # Check if room is booked at overlapping times on same day
    if req.room_number and req.day_of_week:
        room_stmt = select(TimetableEntry, Division).join(
            Division, TimetableEntry.division_id == Division.id
        ).where(
            TimetableEntry.room_number == req.room_number,
            TimetableEntry.day_of_week.ilike(req.day_of_week),
            TimetableEntry.is_active == True,
        )
        if req.exclude_division_id:
            room_stmt = room_stmt.where(TimetableEntry.division_id != req.exclude_division_id)
        
        entries = (await db.execute(room_stmt)).all()
        for tt, div in entries:
            # Overlap check
            if not (req.end_time <= tt.start_time or req.start_time >= tt.end_time):
                return {
                    "has_conflict": True,
                    "conflict_type": "room",
                    "details": f"Room '{req.room_number}' is already occupied by {div.name} on {req.day_of_week} ({tt.start_time} - {tt.end_time}).",
                }

    return {"has_conflict": False, "conflict_type": None, "details": None}
