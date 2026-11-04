# /**
#  * @file        enrollments.py
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
#  * @updated     2026-11-04
#  *
#  * @description API endpoints for student course and batch enrollment, transfers, and status tracking.
#  */

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc
from typing import Optional, List
from pydantic import BaseModel
from datetime import date, datetime

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.models.enrollment import StudentEnrollment
from app.models.student import Student
from app.models.division import Division
from app.models.standard import Standard
from app.models.board import Board
from app.models.academic_year import AcademicYear
from app.models.user import User, AuditLog

router = APIRouter()


class EnrollmentCreate(BaseModel):
    student_id: int
    academic_year_id: int = 1
    standard_id: int
    division_id: Optional[int] = None
    roll_number: Optional[str] = None
    enrollment_date: Optional[date] = None
    remarks: Optional[str] = None


class BatchTransferRequest(BaseModel):
    enrollment_id: int
    new_division_id: int
    transfer_reason: Optional[str] = "Academic batch transfer"
    new_roll_number: Optional[str] = None


class EnrollmentUpdate(BaseModel):
    roll_number: Optional[str] = None
    division_id: Optional[int] = None
    status: Optional[str] = None
    remarks: Optional[str] = None


@router.get("/stats")
async def get_enrollment_stats(
    academic_year_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    ay_id = academic_year_id or 1

    # Active enrollments
    enr_stmt = select(func.count(StudentEnrollment.id)).where(
        StudentEnrollment.academic_year_id == ay_id,
        StudentEnrollment.status == "active",
    )
    total_active = (await db.execute(enr_stmt)).scalar() or 0

    # Total student master count
    stu_stmt = select(func.count(Student.id)).where(Student.is_active == True)
    total_students = (await db.execute(stu_stmt)).scalar() or 0

    unassigned_count = max(0, total_students - total_active)

    # Total batch capacity
    div_stmt = select(Division.id, Division.capacity).where(
        Division.is_active == True, Division.status == "active"
    )
    divs = (await db.execute(div_stmt)).all()
    total_capacity = sum(d[1] or 40 for d in divs)
    available_seats = max(0, total_capacity - total_active)

    # Batches at or near capacity (>= 90%)
    batches_at_capacity = 0
    for d_id, cap in divs:
        cnt = (
            await db.execute(
                select(func.count(StudentEnrollment.id)).where(
                    StudentEnrollment.division_id == d_id,
                    StudentEnrollment.status == "active",
                )
            )
        ).scalar() or 0
        if cap and (cnt / cap) >= 0.9:
            batches_at_capacity += 1

    return {
        "total_active_enrollments": total_active,
        "total_students": total_students,
        "unassigned_students": unassigned_count,
        "total_capacity": total_capacity,
        "available_seats": available_seats,
        "batches_at_capacity": batches_at_capacity,
    }


@router.get("/")
async def list_enrollments(
    academic_year_id: Optional[int] = Query(None),
    board_id: Optional[int] = Query(None),
    standard_id: Optional[int] = Query(None),
    division_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    query = (
        select(
            StudentEnrollment,
            Student.first_name,
            Student.last_name,
            Student.admission_number,
            Student.phone,
            Standard.name.label("standard_name"),
            Board.id.label("board_id"),
            Board.name.label("board_name"),
            Board.code.label("board_code"),
            Division.name.label("division_name"),
            Division.code.label("division_code"),
            AcademicYear.name.label("academic_year_name"),
        )
        .join(Student, StudentEnrollment.student_id == Student.id)
        .join(Standard, StudentEnrollment.standard_id == Standard.id)
        .join(AcademicYear, StudentEnrollment.academic_year_id == AcademicYear.id)
        .outerjoin(Division, StudentEnrollment.division_id == Division.id)
        .outerjoin(Board, Division.board_id == Board.id)
    )

    if academic_year_id:
        query = query.where(StudentEnrollment.academic_year_id == academic_year_id)
    if board_id:
        query = query.where(Division.board_id == board_id)
    if standard_id:
        query = query.where(StudentEnrollment.standard_id == standard_id)
    if division_id:
        query = query.where(StudentEnrollment.division_id == division_id)
    if status_filter and status_filter.lower() != "all":
        query = query.where(StudentEnrollment.status == status_filter.lower())

    if search and search.strip():
        s = f"%{search.strip()}%"
        query = query.where(
            or_(
                Student.first_name.ilike(s),
                Student.last_name.ilike(s),
                Student.admission_number.ilike(s),
                StudentEnrollment.roll_number.ilike(s),
            )
        )

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    # Paginate
    query = query.order_by(desc(StudentEnrollment.enrollment_date), StudentEnrollment.roll_number)
    query = query.offset((page - 1) * limit).limit(limit)

    rows = (await db.execute(query)).all()

    items = []
    for (
        enr,
        first_name,
        last_name,
        admission_number,
        phone,
        std_name,
        brd_id,
        brd_name,
        brd_code,
        div_name,
        div_code,
        ay_name,
    ) in rows:
        items.append({
            "id": enr.id,
            "student_id": enr.student_id,
            "student_name": f"{first_name} {last_name}".strip(),
            "admission_number": admission_number,
            "phone": phone,
            "academic_year_id": enr.academic_year_id,
            "academic_year_name": ay_name,
            "standard_id": enr.standard_id,
            "standard_name": std_name,
            "board_id": brd_id,
            "board_name": brd_name,
            "board_code": brd_code,
            "division_id": enr.division_id,
            "division_name": div_name or "Unassigned",
            "division_code": div_code,
            "roll_number": enr.roll_number or "—",
            "enrollment_date": str(enr.enrollment_date) if enr.enrollment_date else None,
            "status": enr.status,
            "remarks": enr.remarks,
        })

    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit if total > 0 else 1,
    }


@router.get("/unassigned")
async def list_unassigned_students(
    academic_year_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    ay_id = academic_year_id or 1

    # Active enrolled student IDs
    active_enr_subq = (
        select(StudentEnrollment.student_id)
        .where(
            StudentEnrollment.academic_year_id == ay_id,
            StudentEnrollment.status == "active",
        )
    )

    query = select(Student).where(
        Student.is_active == True,
        ~Student.id.in_(active_enr_subq),
    )

    if search and search.strip():
        s = f"%{search.strip()}%"
        query = query.where(
            or_(
                Student.first_name.ilike(s),
                Student.last_name.ilike(s),
                Student.admission_number.ilike(s),
            )
        )

    students = (await db.execute(query.order_by(Student.first_name).limit(50))).scalars().all()
    return [
        {
            "id": s.id,
            "admission_number": s.admission_number,
            "full_name": f"{s.first_name} {s.last_name or ''}".strip(),
            "gender": s.gender,
            "phone": s.phone,
            "email": s.email,
        }
        for s in students
    ]


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_enrollment(
    data: EnrollmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    # 1. Prevent duplicate active enrollment in same academic year
    existing_active = (
        await db.execute(
            select(StudentEnrollment).where(
                StudentEnrollment.student_id == data.student_id,
                StudentEnrollment.academic_year_id == data.academic_year_id,
                StudentEnrollment.status == "active",
            )
        )
    ).scalar_one_or_none()
    if existing_active:
        raise HTTPException(
            status_code=400,
            detail="Student already has an active enrollment in this academic year. Please use Batch Transfer instead.",
        )

    # 2. Check batch capacity if division assigned
    if data.division_id:
        div = (
            await db.execute(select(Division).where(Division.id == data.division_id))
        ).scalar_one_or_none()
        if not div:
            raise HTTPException(status_code=404, detail="Batch / Division not found")

        current_enrolled = (
            await db.execute(
                select(func.count(StudentEnrollment.id)).where(
                    StudentEnrollment.division_id == data.division_id,
                    StudentEnrollment.status == "active",
                )
            )
        ).scalar() or 0

        if div.capacity and current_enrolled >= div.capacity:
            raise HTTPException(
                status_code=400,
                detail=f"Batch '{div.name}' is already at full capacity ({div.capacity}/{div.capacity} students).",
            )

    enrollment = StudentEnrollment(
        student_id=data.student_id,
        academic_year_id=data.academic_year_id,
        standard_id=data.standard_id,
        division_id=data.division_id,
        roll_number=data.roll_number,
        enrollment_date=data.enrollment_date or date.today(),
        status="active",
        remarks=data.remarks,
    )
    db.add(enrollment)
    await db.flush()

    # Audit log
    audit = AuditLog(
        user_id=current_user.id,
        action="enrollment_created",
        resource_type="student_enrollment",
        resource_id=enrollment.id,
        new_data=f"Enrolled student #{data.student_id} into division #{data.division_id}",
    )
    db.add(audit)

    await db.commit()
    await db.refresh(enrollment)
    return {"id": enrollment.id, "message": "Student enrolled successfully"}


@router.post("/transfer")
async def transfer_batch(
    req: BatchTransferRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    enr = (
        await db.execute(select(StudentEnrollment).where(StudentEnrollment.id == req.enrollment_id))
    ).scalar_one_or_none()
    if not enr:
        raise HTTPException(status_code=404, detail="Enrollment record not found")

    if enr.status != "active":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot transfer an enrollment with status '{enr.status}'. Only active enrollments can be transferred.",
        )

    if enr.division_id == req.new_division_id:
        raise HTTPException(status_code=400, detail="Student is already in this batch")

    # Target batch capacity check
    target_div = (
        await db.execute(select(Division).where(Division.id == req.new_division_id))
    ).scalar_one_or_none()
    if not target_div:
        raise HTTPException(status_code=404, detail="Target batch not found")

    target_enrolled = (
        await db.execute(
            select(func.count(StudentEnrollment.id)).where(
                StudentEnrollment.division_id == req.new_division_id,
                StudentEnrollment.status == "active",
            )
        )
    ).scalar() or 0

    if target_div.capacity and target_enrolled >= target_div.capacity:
        raise HTTPException(
            status_code=400,
            detail=f"Target batch '{target_div.name}' is already at full capacity ({target_div.capacity} students).",
        )

    old_div_id = enr.division_id

    # Close old enrollment as transferred to preserve history
    enr.status = "transferred"
    enr.remarks = f"Transferred to {target_div.name}. Reason: {req.transfer_reason or 'Batch re-allocation'}"
    await db.flush()

    # Create new active enrollment
    new_enr = StudentEnrollment(
        student_id=enr.student_id,
        academic_year_id=enr.academic_year_id,
        standard_id=target_div.standard_id,
        division_id=target_div.id,
        roll_number=req.new_roll_number or enr.roll_number,
        enrollment_date=date.today(),
        status="active",
        remarks=f"Transferred from batch #{old_div_id}. Reason: {req.transfer_reason or 'Batch re-allocation'}",
    )
    db.add(new_enr)

    # Audit log
    audit = AuditLog(
        user_id=current_user.id,
        action="batch_transfer",
        resource_type="student_enrollment",
        resource_id=enr.id,
        old_data=f"division_id={old_div_id}",
        new_data=f"division_id={target_div.id}, reason={req.transfer_reason}",
    )
    db.add(audit)

    await db.commit()
    await db.refresh(new_enr)
    return {
        "new_enrollment_id": new_enr.id,
        "message": f"Student successfully transferred to batch '{target_div.name}'. Historical enrollment preserved.",
    }


@router.put("/{enrollment_id}")
async def update_enrollment(
    enrollment_id: int,
    data: EnrollmentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    enr = (
        await db.execute(select(StudentEnrollment).where(StudentEnrollment.id == enrollment_id))
    ).scalar_one_or_none()
    if not enr:
        raise HTTPException(status_code=404, detail="Enrollment record not found")

    update_dict = data.model_dump(exclude_unset=True)
    for k, v in update_dict.items():
        if hasattr(enr, k) and v is not None:
            setattr(enr, k, v)

    await db.commit()
    await db.refresh(enr)
    return {"id": enr.id, "message": "Enrollment record updated successfully"}


@router.delete("/{enrollment_id}")
async def delete_enrollment(
    enrollment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    enr = (
        await db.execute(select(StudentEnrollment).where(StudentEnrollment.id == enrollment_id))
    ).scalar_one_or_none()
    if not enr:
        raise HTTPException(status_code=404, detail="Enrollment record not found")

    enr.status = "archived"
    await db.commit()
    return {"id": enr.id, "message": "Enrollment record archived"}

