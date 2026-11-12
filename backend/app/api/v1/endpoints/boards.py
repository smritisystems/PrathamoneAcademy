# /**
#  * @file        boards.py
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
#  * @updated     2026-11-12
#  *
#  * @description API endpoints for educational boards management, standards mapping, and academic hierarchy.
#  */

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from typing import Optional, List
from pydantic import BaseModel

from app.core.database import get_db
from app.core.deps import get_current_active_user, require_role, check_institution_access, is_sysadmin
from app.models.board import Board
from app.models.division import Division
from app.models.enrollment import StudentEnrollment
from app.models.standard import Standard

router = APIRouter()


class BoardCreate(BaseModel):
    institution_id: int = 1
    name: str
    code: str
    description: Optional[str] = None


class BoardUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


@router.get("/")
async def list_boards(
    institution_id: Optional[int] = Query(None),
    include_inactive: bool = Query(False),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    if institution_id is not None:
        check_institution_access(institution_id, current_user)
    target_inst = institution_id if institution_id is not None else (
        None if is_sysadmin(current_user) else getattr(current_user, "institution_id", None)
    )
    query = select(Board)
    if not include_inactive:
        query = query.where(Board.is_active == True)
    if target_inst is not None:
        query = query.where(Board.institution_id == target_inst)
    if search and search.strip():
        s = f"%{search.strip()}%"
        query = query.where(or_(Board.name.ilike(s), Board.code.ilike(s)))

    boards = (await db.execute(query.order_by(Board.name))).scalars().all()

    # Pre-fetch counts for batches and students
    board_ids = [b.id for b in boards]
    batches_by_board = {}
    classes_by_board = {}
    students_by_board = {}

    if board_ids:
        # Batches count
        div_stmt = (
            select(Division.board_id, func.count(Division.id))
            .where(Division.board_id.in_(board_ids), Division.is_active == True)
            .group_by(Division.board_id)
        )
        batches_by_board = dict((await db.execute(div_stmt)).all())

        # Distinct classes count
        cls_stmt = (
            select(Division.board_id, func.count(func.distinct(Division.standard_id)))
            .where(Division.board_id.in_(board_ids), Division.is_active == True)
            .group_by(Division.board_id)
        )
        classes_by_board = dict((await db.execute(cls_stmt)).all())

        # Enrolled students count
        enr_stmt = (
            select(Division.board_id, func.count(StudentEnrollment.id))
            .join(StudentEnrollment, Division.id == StudentEnrollment.division_id)
            .where(Division.board_id.in_(board_ids), StudentEnrollment.status == "active")
            .group_by(Division.board_id)
        )
        students_by_board = dict((await db.execute(enr_stmt)).all())

    return [
        {
            "id": b.id,
            "institution_id": b.institution_id,
            "name": b.name,
            "code": b.code,
            "description": b.description,
            "is_active": b.is_active,
            "created_at": str(b.created_at) if b.created_at else None,
            "classes_count": classes_by_board.get(b.id, 0),
            "batches_count": batches_by_board.get(b.id, 0),
            "students_count": students_by_board.get(b.id, 0),
        }
        for b in boards
    ]


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_board(
    data: BoardCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("superadmin", "admin", "principal")),
):
    # Check duplicate code
    existing = (
        await db.execute(select(Board).where(Board.code.ilike(data.code)))
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail=f"Board with code '{data.code}' already exists")

    d = data.model_dump()
    if not d.get("institution_id"):
        d["institution_id"] = getattr(current_user, "institution_id", None) or 1
    check_institution_access(d["institution_id"], current_user)
    board = Board(**d)
    db.add(board)
    await db.commit()
    await db.refresh(board)
    return {
        "id": board.id,
        "name": board.name,
        "code": board.code,
        "message": f"Board '{board.name}' created successfully",
    }


@router.get("/{board_id}")
async def get_board(
    board_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    result = await db.execute(select(Board).where(Board.id == board_id))
    b = result.scalar_one_or_none()
    if not b:
        raise HTTPException(status_code=404, detail="Board not found")
    check_institution_access(b.institution_id, current_user)

    batches_cnt = (
        await db.execute(
            select(func.count(Division.id)).where(Division.board_id == b.id, Division.is_active == True)
        )
    ).scalar() or 0

    students_cnt = (
        await db.execute(
            select(func.count(StudentEnrollment.id))
            .join(Division, StudentEnrollment.division_id == Division.id)
            .where(Division.board_id == b.id, StudentEnrollment.status == "active")
        )
    ).scalar() or 0

    return {
        "id": b.id,
        "institution_id": b.institution_id,
        "name": b.name,
        "code": b.code,
        "description": b.description,
        "is_active": b.is_active,
        "batches_count": batches_cnt,
        "students_count": students_cnt,
    }


@router.put("/{board_id}")
async def update_board(
    board_id: int,
    data: BoardUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("superadmin", "admin", "principal")),
):
    result = await db.execute(select(Board).where(Board.id == board_id))
    board = result.scalar_one_or_none()
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    check_institution_access(board.institution_id, current_user)

    update_dict = data.model_dump(exclude_unset=True)
    for k, v in update_dict.items():
        if hasattr(board, k) and v is not None:
            setattr(board, k, v)

    await db.commit()
    await db.refresh(board)
    return {
        "id": board.id,
        "name": board.name,
        "code": board.code,
        "is_active": board.is_active,
        "message": f"Board '{board.name}' updated successfully",
    }


@router.put("/{board_id}/toggle-status")
async def toggle_board_status(
    board_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("superadmin", "admin", "principal")),
):
    result = await db.execute(select(Board).where(Board.id == board_id))
    board = result.scalar_one_or_none()
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    check_institution_access(board.institution_id, current_user)

    board.is_active = not board.is_active
    await db.commit()
    status_str = "activated" if board.is_active else "deactivated"
    return {
        "id": board.id,
        "is_active": board.is_active,
        "message": f"Board '{board.name}' {status_str} successfully",
    }
