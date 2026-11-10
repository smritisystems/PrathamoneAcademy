# /**
#  * @file        standards.py
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
#  * @updated     2026-11-10
#  *
#  * @description API endpoints for standards/classes management, board associations, and settings.
#  */

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from typing import Optional
from app.core.database import get_db
from app.core.deps import get_current_active_user, require_role
from app.models.standard import Standard
from app.models.division import Division
from app.models.board import Board
from app.models.enrollment import StudentEnrollment
from app.models.student import Student
from app.models.portal import TimetableEntry
from app.models.subject import Subject
from app.models.settings import InstitutionSetting
from app.services.safe_delete_service import SafeDeleteService
import json
from pathlib import Path
from pydantic import BaseModel

router = APIRouter()

SETTINGS_FILE = Path(__file__).resolve().parent.parent.parent.parent / "academic_settings.json"

DEFAULT_ACADEMIC_SETTINGS = {
    "defaultBatchCapacity": 40,
    "enforceCapacityStrict": True,
    "preventTimetableConflicts": True,
    "academicYearName": "AY 2024–25 (Current)",
    "autoRollNumberFormat": "STD-DIV-SEQ",
}


class AcademicSettingsSchema(BaseModel):
    defaultBatchCapacity: int = 40
    enforceCapacityStrict: bool = True
    preventTimetableConflicts: bool = True
    academicYearName: str = "AY 2024–25 (Current)"
    autoRollNumberFormat: str = "STD-DIV-SEQ"


@router.get("/academic-settings")
async def get_academic_settings(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    user_inst_id = getattr(current_user, "institution_id", None) or 1
    # Check database institution_settings first
    rows = (await db.execute(
        select(InstitutionSetting).where(
            and_(
                InstitutionSetting.institution_id == user_inst_id,
                InstitutionSetting.category == "academic",
            )
        )
    )).scalars().all()

    if rows:
        conf = {**DEFAULT_ACADEMIC_SETTINGS}
        for r in rows:
            if r.key == "batch_capacity_warning" and r.value:
                try:
                    conf["defaultBatchCapacity"] = int(r.value)
                except ValueError:
                    pass
            elif r.key == "enforce_capacity_strict" and r.value:
                conf["enforceCapacityStrict"] = r.value.lower() in ("true", "1")
            elif r.key == "prevent_timetable_conflicts" and r.value:
                conf["preventTimetableConflicts"] = r.value.lower() in ("true", "1")
            elif r.key == "auto_roll_number_format" and r.value:
                conf["autoRollNumberFormat"] = r.value
        return conf

    if SETTINGS_FILE.exists():
        try:
            with open(SETTINGS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return DEFAULT_ACADEMIC_SETTINGS


@router.put("/academic-settings")
async def update_academic_settings(
    data: AcademicSettingsSchema,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("superadmin", "admin", "principal")),
):
    settings_dict = data.model_dump()
    user_inst_id = getattr(current_user, "institution_id", None) or 1

    # Persist to database institution_settings
    key_map = {
        "batch_capacity_warning": str(data.defaultBatchCapacity),
        "enforce_capacity_strict": str(data.enforceCapacityStrict).lower(),
        "prevent_timetable_conflicts": str(data.preventTimetableConflicts).lower(),
        "auto_roll_number_format": data.autoRollNumberFormat,
    }
    for k, v in key_map.items():
        existing = (await db.execute(
            select(InstitutionSetting).where(
                and_(
                    InstitutionSetting.institution_id == user_inst_id,
                    InstitutionSetting.key == k,
                )
            )
        )).scalar_one_or_none()
        if existing:
            existing.value = v
            existing.category = "academic"
            existing.updated_by_id = current_user.id
        else:
            db.add(InstitutionSetting(
                institution_id=user_inst_id,
                category="academic",
                key=k,
                value=v,
                data_type="number" if k == "batch_capacity_warning" else ("boolean" if "strict" in k or "conflicts" in k else "string"),
                updated_by_id=current_user.id,
            ))
    await db.commit()

    try:
        with open(SETTINGS_FILE, "w", encoding="utf-8") as f:
            json.dump(settings_dict, f, indent=2)
    except Exception:
        pass

    return {
        "settings": settings_dict,
        "message": "Academic workspace settings saved successfully",
    }


class StandardCreate(BaseModel):
    institution_id: int = 1
    name: str
    level: int
    description: Optional[str] = None


class StandardUpdate(BaseModel):
    name: Optional[str] = None
    level: Optional[int] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


@router.get("/academic-overview")
async def get_academic_overview(
    institution_id: Optional[int] = Query(None),
    academic_year_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    # 1. Total Students
    student_count_stmt = select(func.count(Student.id)).where(Student.is_active == True)
    total_students = (await db.execute(student_count_stmt)).scalar() or 0

    # 2. Total Standards / Classes
    standards_count_stmt = select(func.count(Standard.id)).where(Standard.is_active == True)
    total_classes = (await db.execute(standards_count_stmt)).scalar() or 0

    # 3. Active Batches
    active_batches_stmt = select(func.count(Division.id)).where(
        Division.is_active == True, Division.status == "active"
    )
    active_batches = (await db.execute(active_batches_stmt)).scalar() or 0

    # 4. Enrolled vs Total Seats
    active_divs_stmt = select(Division.id, Division.capacity).where(
        Division.is_active == True, Division.status == "active"
    )
    active_divs = (await db.execute(active_divs_stmt)).all()
    total_seats = sum(d[1] or 40 for d in active_divs)

    active_div_ids = [d[0] for d in active_divs]
    enrolled_seats = 0
    if active_div_ids:
        enr_stmt = select(func.count(StudentEnrollment.id)).where(
            StudentEnrollment.division_id.in_(active_div_ids),
            StudentEnrollment.status == "active",
        )
        enrolled_seats = (await db.execute(enr_stmt)).scalar() or 0

    occupancy_pct = round((enrolled_seats / total_seats) * 100) if total_seats > 0 else 0

    # 5. Weekly Class Sessions
    weekly_sessions_stmt = select(func.count(TimetableEntry.id)).where(TimetableEntry.is_active == True)
    weekly_sessions = (await db.execute(weekly_sessions_stmt)).scalar() or 0

    # 6. Academic Tree Structure: Boards -> Classes/Standards -> Batch count & Student count
    boards_stmt = select(Board).where(Board.is_active == True).order_by(Board.name)
    boards = (await db.execute(boards_stmt)).scalars().all()

    # Pre-fetch counts
    batch_counts_by_brd_std = {}
    divs_all_stmt = select(Division.board_id, Division.standard_id, func.count(Division.id)).where(
        Division.is_active == True
    ).group_by(Division.board_id, Division.standard_id)
    for b_id, s_id, cnt in (await db.execute(divs_all_stmt)).all():
        batch_counts_by_brd_std[(b_id, s_id)] = cnt

    student_counts_by_brd_std = {}
    std_enr_stmt = (
        select(Division.board_id, Division.standard_id, func.count(StudentEnrollment.id))
        .join(StudentEnrollment, Division.id == StudentEnrollment.division_id)
        .where(StudentEnrollment.status == "active")
        .group_by(Division.board_id, Division.standard_id)
    )
    for b_id, s_id, cnt in (await db.execute(std_enr_stmt)).all():
        student_counts_by_brd_std[(b_id, s_id)] = cnt

    standards_all_stmt = select(Standard).where(Standard.is_active == True).order_by(Standard.level)
    standards_all = (await db.execute(standards_all_stmt)).scalars().all()

    structure_tree = []
    for brd in boards:
        classes = []
        for std in standards_all:
            batches_cnt = batch_counts_by_brd_std.get((brd.id, std.id), 0)
            students_cnt = student_counts_by_brd_std.get((brd.id, std.id), 0)
            if batches_cnt > 0 or std.level in [8, 9, 10]:
                classes.append({
                    "standard_id": std.id,
                    "standard_name": std.name,
                    "standard_level": std.level,
                    "batch_count": batches_cnt,
                    "student_count": students_cnt,
                })

        structure_tree.append({
            "board_id": brd.id,
            "board_name": brd.name,
            "board_code": brd.code,
            "classes": classes,
        })

    return {
        "metrics": {
            "total_students": total_students,
            "total_classes": total_classes,
            "active_batches": active_batches,
            "enrolled_seats": enrolled_seats,
            "total_seats": total_seats,
            "occupancy_percentage": occupancy_pct,
            "weekly_sessions": weekly_sessions,
        },
        "structure_tree": structure_tree,
    }


@router.get("/")
async def list_standards(
    institution_id: Optional[int] = None,
    board_id: Optional[int] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    query = select(Standard).where(Standard.is_active == True)
    if institution_id:
        query = query.where(Standard.institution_id == institution_id)
    if board_id:
        query = (
            query.join(Division, Division.standard_id == Standard.id)
            .where(Division.board_id == board_id, Division.is_active == True)
            .distinct()
        )
    if search and search.strip():
        s = f"%{search.strip()}%"
        query = query.where(Standard.name.ilike(s))

    result = await db.execute(query.order_by(Standard.level))
    standards = result.scalars().all()
    std_ids = [s.id for s in standards]

    batches_by_std = {}
    students_by_std = {}
    subjects_by_std = {}

    if std_ids:
        # Batches count
        b_stmt = select(Division.standard_id, func.count(Division.id)).where(
            Division.standard_id.in_(std_ids), Division.is_active == True
        ).group_by(Division.standard_id)
        batches_by_std = dict((await db.execute(b_stmt)).all())

        # Students count
        s_stmt = (
            select(Division.standard_id, func.count(StudentEnrollment.id))
            .join(StudentEnrollment, Division.id == StudentEnrollment.division_id)
            .where(Division.standard_id.in_(std_ids), StudentEnrollment.status == "active")
            .group_by(Division.standard_id)
        )
        students_by_std = dict((await db.execute(s_stmt)).all())

        # Subjects count
        sub_stmt = select(Subject.standard_id, func.count(Subject.id)).where(
            Subject.standard_id.in_(std_ids), Subject.is_active == True
        ).group_by(Subject.standard_id)
        subjects_by_std = dict((await db.execute(sub_stmt)).all())

    return [
        {
            "id": s.id,
            "name": s.name,
            "level": s.level,
            "institution_id": s.institution_id,
            "description": s.description,
            "batches_count": batches_by_std.get(s.id, 0),
            "students_count": students_by_std.get(s.id, 0),
            "subjects_count": subjects_by_std.get(s.id, 0),
        }
        for s in standards
    ]


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_standard(
    data: StandardCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("superadmin", "admin", "principal")),
):
    d = data.model_dump()
    if not d.get("institution_id"):
        d["institution_id"] = getattr(current_user, "institution_id", None) or 1

    # Check duplicate level per institution
    existing = (
        await db.execute(
            select(Standard).where(
                Standard.institution_id == d["institution_id"],
                Standard.level == d["level"],
                Standard.is_active == True,
            )
        )
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Class with level '{data.level}' already exists",
        )

    standard = Standard(**d)
    db.add(standard)
    await db.commit()
    await db.refresh(standard)
    return {
        "id": standard.id,
        "name": standard.name,
        "level": standard.level,
        "message": f"Class '{standard.name}' created successfully",
    }


@router.get("/{standard_id}")
async def get_standard(
    standard_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    result = await db.execute(select(Standard).where(Standard.id == standard_id))
    standard = result.scalar_one_or_none()
    if not standard:
        raise HTTPException(status_code=404, detail="Standard not found")

    batches_cnt = (
        await db.execute(
            select(func.count(Division.id)).where(Division.standard_id == standard.id, Division.is_active == True)
        )
    ).scalar() or 0

    students_cnt = (
        await db.execute(
            select(func.count(StudentEnrollment.id))
            .join(Division, StudentEnrollment.division_id == Division.id)
            .where(Division.standard_id == standard.id, StudentEnrollment.status == "active")
        )
    ).scalar() or 0

    subjects_cnt = (
        await db.execute(
            select(func.count(Subject.id)).where(Subject.standard_id == standard.id, Subject.is_active == True)
        )
    ).scalar() or 0

    return {
        "id": standard.id,
        "name": standard.name,
        "level": standard.level,
        "description": standard.description,
        "batches_count": batches_cnt,
        "students_count": students_cnt,
        "subjects_count": subjects_cnt,
    }


@router.put("/{standard_id}")
async def update_standard(
    standard_id: int,
    data: StandardUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("superadmin", "admin", "principal")),
):
    result = await db.execute(select(Standard).where(Standard.id == standard_id))
    standard = result.scalar_one_or_none()
    if not standard:
        raise HTTPException(status_code=404, detail="Standard not found")

    update_dict = data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        if hasattr(standard, key) and value is not None:
            setattr(standard, key, value)

    await db.commit()
    await db.refresh(standard)
    return {
        "id": standard.id,
        "name": standard.name,
        "level": standard.level,
        "message": f"Class '{standard.name}' updated successfully",
    }


@router.delete("/{standard_id}")
async def delete_standard(
    standard_id: int,
    permanent: bool = Query(False, description="If true, permanently delete record if eligible; otherwise deactivate safely"),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("superadmin", "admin", "principal")),
):
    if permanent:
        return await SafeDeleteService.execute_safe_delete(
            db=db, entity_type="standard", entity_id=standard_id, current_user=current_user
        )
    return await SafeDeleteService.execute_safe_deactivate(
        db=db, entity_type="standard", entity_id=standard_id, current_user=current_user
    )

