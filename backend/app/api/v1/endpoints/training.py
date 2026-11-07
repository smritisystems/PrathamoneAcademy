# /**
#  * @file        training.py
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
#  * @created     2026-11-07
#  * @updated     2026-11-07
#  *
#  * @description API endpoints for Global Training & Demo Environment management, session tracking, and reset operations.
#  */

from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.deps import (
    get_current_active_user,
    require_role,
    is_sysadmin,
)
from app.models.user import User
from app.models.training import (
    TrainingEnvironmentConfig,
    TrainingResetLog,
)
from app.services.training_dataset_service import (
    get_training_environment_status,
    register_training_activity,
    end_training_session,
    reset_training_environment,
    seed_training_dataset,
    ACTIVE_DATASET_VERSION,
)

router = APIRouter()

ADMIN_ROLES = ("sysadmin", "superadmin", "super_admin", "admin", "principal")
STAFF_ROLES = ("sysadmin", "superadmin", "super_admin", "admin", "principal", "staff", "accountant", "teacher")


class TrainingResetRequest(BaseModel):
    force: bool = False
    restore_baseline: bool = True
    dataset_version: Optional[str] = ACTIVE_DATASET_VERSION


class TrainingConfigUpdateRequest(BaseModel):
    is_enabled: Optional[bool] = None
    reset_policy: Optional[str] = None
    inactivity_timeout_minutes: Optional[int] = None
    daily_reset_time: Optional[str] = None


@router.get("/status")
async def get_status(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*STAFF_ROLES)),
):
    """Returns training environment status, active dataset version, active sessions, and record metrics."""
    return await get_training_environment_status(db)


@router.post("/session/ping")
async def ping_session(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*STAFF_ROLES)),
):
    """Registers user heartbeat inside training session context."""
    session = await register_training_activity(db, current_user.id)
    return {
        "status": "ACTIVE",
        "session_id": session.id,
        "last_active_at": session.last_active_at.isoformat(),
    }


@router.post("/session/exit")
async def exit_session(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*STAFF_ROLES)),
):
    """Terminates active training session for current user."""
    await end_training_session(db, current_user.id)
    return {"status": "EXITED"}


@router.post("/reset")
async def reset_environment(
    req: TrainingResetRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*ADMIN_ROLES)),
):
    """
    Administrator-authorized action to wipe isolated demo tenant and restore clean baseline dataset.
    Has absolute production safety locks preventing deletion of real customer data.
    """
    try:
        result = await reset_training_environment(
            db=db,
            user_id=current_user.id,
            initiated_by=current_user.username or "admin",
            force=req.force,
            restore_baseline=req.restore_baseline,
        )
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post("/seed")
async def seed_dataset(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*ADMIN_ROLES)),
):
    """Seeds or supplements the central baseline training dataset."""
    result = await seed_training_dataset(
        db=db,
        dataset_version=ACTIVE_DATASET_VERSION,
        seed_user_id=current_user.id,
    )
    return {"status": "SUCCESS", "details": result}


@router.get("/reset-logs")
async def get_reset_logs(
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*ADMIN_ROLES)),
):
    """Retrieves audit trail of training environment resets."""
    res = await db.execute(
        select(TrainingResetLog)
        .order_by(TrainingResetLog.created_at.desc())
        .limit(limit)
    )
    logs = res.scalars().all()
    return [
        {
            "id": l.id,
            "initiated_by": l.initiated_by,
            "dataset_version": l.dataset_version,
            "records_cleared": l.records_cleared,
            "records_seeded": l.records_seeded,
            "duration_ms": l.duration_ms,
            "status": l.status,
            "error_message": l.error_message,
            "created_at": l.created_at.isoformat() if l.created_at else None,
        }
        for l in logs
    ]


@router.put("/config")
async def update_config(
    req: TrainingConfigUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*ADMIN_ROLES)),
):
    """Updates training environment configuration and automated reset policies."""
    res = await db.execute(select(TrainingEnvironmentConfig).limit(1))
    cfg = res.scalar_one_or_none()
    if not cfg:
        cfg = TrainingEnvironmentConfig()
        db.add(cfg)

    if req.is_enabled is not None:
        cfg.is_enabled = req.is_enabled
    if req.reset_policy is not None:
        if req.reset_policy not in ("manual_only", "after_session", "inactivity_timeout", "daily_scheduled", "never"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid reset policy. Must be one of: manual_only, after_session, inactivity_timeout, daily_scheduled, never.",
            )
        cfg.reset_policy = req.reset_policy
    if req.inactivity_timeout_minutes is not None:
        cfg.inactivity_timeout_minutes = max(5, min(1440, req.inactivity_timeout_minutes))
    if req.daily_reset_time is not None:
        cfg.daily_reset_time = req.daily_reset_time

    await db.commit()
    return {
        "status": "SUCCESS",
        "is_enabled": cfg.is_enabled,
        "reset_policy": cfg.reset_policy,
        "inactivity_timeout_minutes": cfg.inactivity_timeout_minutes,
        "daily_reset_time": cfg.daily_reset_time,
    }
