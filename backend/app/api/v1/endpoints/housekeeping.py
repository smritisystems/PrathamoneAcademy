# /**
#  * @file        housekeeping.py
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
#  * @created     2026-11-11
#  * @updated     2026-11-11
#  *
#  * @description Protected REST API endpoints for the Housekeeping Module: DB backups, verification, retention pruning, sandbox restore drills, guarded production restore, vacuum maintenance, and backup schedules.
#  */

from typing import List, Optional
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import has_permission, require_role
from app.models.user import User
from app.services.financial_governance_service import FinancialFilter, FinancialGovernanceService
from app.services.housekeeping_service import HousekeepingService, read_history_events

router = APIRouter(tags=["housekeeping"])


async def _require_housekeeping_access(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("superadmin", "admin", "sysadmin")),
) -> User:
    allowed = await has_permission(db, current_user, "system", "housekeeping")
    if not allowed and (current_user.role or "").lower() not in ("superadmin", "super_admin", "sysadmin", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions: Housekeeping requires admin/sysadmin authority or 'system:housekeeping' privilege.",
        )
    return current_user


class CreateBackupRequest(BaseModel):
    label: str = Field(default="manual", max_length=40)
    backup_format: str = Field(default="edu")  # edu | edu_sql | custom | plain_sql
    notes: Optional[str] = Field(default=None, max_length=500)
    mirror_dir: Optional[str] = None


class VerifyBackupRequest(BaseModel):
    source: str = Field(default="backups")


class PruneBackupsRequest(BaseModel):
    retain_daily: int = Field(default=7, ge=1, le=90)
    retain_weekly: int = Field(default=4, ge=0, le=52)
    retain_monthly: int = Field(default=6, ge=0, le=36)


class RestoreDrillRequest(BaseModel):
    filename: str
    source: str = Field(default="backups")


class RestoreExecuteRequest(BaseModel):
    filename: str
    source: str = Field(default="backups")
    confirmation_phrase: str
    reason: str = Field(min_length=10, max_length=500)


class VacuumRequest(BaseModel):
    tables: Optional[List[str]] = None


class PolicyUpdateRequest(BaseModel):
    backup_frequency: Optional[str] = None
    backup_time: Optional[str] = None
    backup_format: Optional[str] = None
    backup_destination: Optional[str] = None
    offsite_mirror_path: Optional[str] = None
    retain_daily: Optional[int] = Field(default=None, ge=1, le=90)
    retain_weekly: Optional[int] = Field(default=None, ge=0, le=52)
    retain_monthly: Optional[int] = Field(default=None, ge=0, le=36)
    auto_vacuum_enabled: Optional[bool] = None
    log_retention_days: Optional[int] = Field(default=None, ge=7, le=3650)
    reason: str = Field(default="Housekeeping policy updated")


@router.get("/overview")
async def get_housekeeping_overview(
    institution_id: Optional[int] = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(_require_housekeeping_access),
):
    inst_id = institution_id or current_user.institution_id or 1
    return await HousekeepingService.get_overview_telemetry(db, inst_id)


@router.get("/backups")
async def list_database_backups(
    _current_user: User = Depends(_require_housekeeping_access),
):
    return {"backups": HousekeepingService.list_backups()}


@router.post("/backups", status_code=status.HTTP_201_CREATED)
async def create_database_backup(
    payload: CreateBackupRequest,
    institution_id: Optional[int] = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(_require_housekeeping_access),
):
    if payload.backup_format not in ("edu", "edu_sql", "custom", "plain_sql"):
        raise HTTPException(status_code=400, detail="backup_format must be 'edu', 'edu_sql', 'custom', or 'plain_sql'")
    inst_id = institution_id or current_user.institution_id or 1
    try:
        policy = await HousekeepingService.get_housekeeping_policy(db, inst_id)
        mirror = payload.mirror_dir if payload.mirror_dir is not None else policy.get("offsite_mirror_path")
        return await HousekeepingService.create_backup(
            db=db,
            user=current_user,
            label=payload.label,
            backup_format=payload.backup_format,
            notes=payload.notes,
            mirror_dir=mirror or None,
            institution_id=inst_id,
        )
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/backups/{filename}/verify")
async def verify_database_backup(
    filename: str,
    source: str = Query(default="backups"),
    current_user: User = Depends(_require_housekeeping_access),
):
    try:
        return await HousekeepingService.verify_backup(filename, source=source, user=current_user)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/backups/{filename}/download")
async def download_database_backup(
    filename: str,
    source: str = Query(default="backups"),
    _current_user: User = Depends(_require_housekeeping_access),
):
    try:
        file_path = HousekeepingService.resolve_safe_path(filename, source)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Backup file not found")
    return FileResponse(
        path=str(file_path),
        filename=file_path.name,
        media_type="application/octet-stream",
    )


@router.post("/backups/upload", status_code=status.HTTP_201_CREATED)
async def upload_database_backup(
    file: UploadFile = File(...),
    current_user: User = Depends(_require_housekeeping_access),
):
    raw = await file.read()
    try:
        return await HousekeepingService.save_uploaded_backup(file.filename or "upload.dump", raw, user=current_user)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/backups/prune")
async def prune_database_backups(
    payload: PruneBackupsRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(_require_housekeeping_access),
):
    return await HousekeepingService.prune_backups(
        db=db,
        user=current_user,
        retain_daily=payload.retain_daily,
        retain_weekly=payload.retain_weekly,
        retain_monthly=payload.retain_monthly,
    )


@router.post("/restore/drill")
async def run_sandbox_restore_drill(
    payload: RestoreDrillRequest,
    current_user: User = Depends(_require_housekeeping_access),
):
    try:
        return await HousekeepingService.run_restore_drill(payload.filename, payload.source, user=current_user)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/restore")
async def execute_live_database_restore(
    payload: RestoreExecuteRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(_require_housekeeping_access),
):
    try:
        return await HousekeepingService.restore_backup(
            db=db,
            filename=payload.filename,
            source=payload.source,
            user=current_user,
            confirmation_phrase=payload.confirmation_phrase,
            reason=payload.reason,
        )
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/maintenance/vacuum")
async def run_database_vacuum(
    payload: VacuumRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(_require_housekeeping_access),
):
    try:
        return await HousekeepingService.run_vacuum_analyze(db, user=current_user, tables=payload.tables)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/maintenance/reconcile")
async def run_housekeeping_reconciliation(
    institution_id: Optional[int] = Query(default=None),
    is_demo: Optional[bool] = Query(default=False),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(_require_housekeeping_access),
):
    inst_id = institution_id or current_user.institution_id or 1
    return await FinancialGovernanceService.reconcile_financial_ledgers(
        db,
        FinancialFilter(institution_id=inst_id, is_demo=is_demo),
    )


@router.get("/policy")
async def get_housekeeping_policy(
    institution_id: Optional[int] = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(_require_housekeeping_access),
):
    inst_id = institution_id or current_user.institution_id or 1
    return await HousekeepingService.get_housekeeping_policy(db, inst_id)


@router.put("/policy")
async def update_housekeeping_policy(
    payload: PolicyUpdateRequest,
    institution_id: Optional[int] = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(_require_housekeeping_access),
):
    inst_id = institution_id or current_user.institution_id or 1
    updates = payload.model_dump(exclude_unset=True)
    reason = updates.pop("reason", "Housekeeping policy updated")
    return await HousekeepingService.update_housekeeping_policy(
        db=db,
        user=current_user,
        institution_id=inst_id,
        updates=updates,
        reason=reason,
    )


@router.get("/history")
async def get_housekeeping_history(
    limit: int = Query(default=50, ge=1, le=200),
    _current_user: User = Depends(_require_housekeeping_access),
):
    return {"events": read_history_events(limit=limit)}

