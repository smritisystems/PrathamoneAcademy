# /**
#  * @file        releases.py
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
#  * @created     2026-11-05
#  * @updated     2026-11-12
#  *
#  * @description API endpoints for Release & Change Management, automated release notes, version tracking, pre-flight validations, and production approvals.
#  */

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, or_
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
import json

from app.core.database import get_db
from app.core.deps import get_current_active_user, require_role
from app.models.release import SystemRelease
from app.models.user import User, AuditLog
from app.services.release_service import ReleaseService

router = APIRouter()


def is_authorized_release_manager(user: User) -> bool:
    role_str = getattr(user, "role", "") or ""
    if hasattr(role_str, "value"):
        role_str = role_str.value
    return role_str.lower() in ("superadmin", "sysadmin", "super_admin", "admin")


# Pydantic Schemas
class ReleaseDraftCreate(BaseModel):
    version: Optional[str] = None
    title: Optional[str] = None
    environment: str = Field(default="production")
    bump_type: str = Field(default="patch")
    is_critical_security: bool = Field(default=False)
    migration_plan: Optional[str] = None


class ReleaseUpdate(BaseModel):
    title: Optional[str] = None
    release_notes_markdown: Optional[str] = None
    release_notes_structured: Optional[Dict[str, List[str]]] = None
    migration_plan: Optional[str] = None
    is_critical_security: Optional[bool] = None


class ReleaseRollbackRequest(BaseModel):
    reason: str = Field(min_length=10, description="Comprehensive justification for rolling back this release")
    target_version: Optional[str] = None


@router.get("/current")
async def get_current_release(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Returns the current authoritative published release, version, and build info.
    """
    await ReleaseService.seed_historical_releases(db, current_user.id)
    return await ReleaseService.get_current_release(db)


@router.get("/pending-changes")
async def get_pending_changes(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("superadmin", "sysadmin", "super_admin", "admin", "principal")),
):
    """
    Inspects repository commits, changed files, and schema migrations
    to calculate pending changes and recommend the next version bump.
    """
    await ReleaseService.seed_historical_releases(db, current_user.id)
    return await ReleaseService.get_pending_changes(db)


@router.get("/")
async def list_releases(
    status_filter: Optional[str] = Query(default=None, alias="status"),
    environment: Optional[str] = None,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Lists release history with pagination, statuses, and author information.
    """
    await ReleaseService.seed_historical_releases(db, current_user.id)

    query = select(SystemRelease)
    if status_filter:
        query = query.where(SystemRelease.status == status_filter)
    if environment:
        query = query.where(SystemRelease.environment == environment)

    count_query = select(func.count(SystemRelease.id))
    if status_filter:
        count_query = count_query.where(SystemRelease.status == status_filter)
    if environment:
        count_query = count_query.where(SystemRelease.environment == environment)

    total = (await db.execute(count_query)).scalar() or 0

    query = query.order_by(desc(SystemRelease.created_at)).offset((page - 1) * limit).limit(limit)
    res = await db.execute(query)
    releases = res.scalars().all()

    items = []
    for r in releases:
        structured = {}
        summary = {}
        try:
            structured = json.loads(r.release_notes_structured) if r.release_notes_structured else {}
            summary = json.loads(r.change_summary) if r.change_summary else {}
        except Exception:
            pass

        items.append({
            "id": r.id,
            "version": r.version,
            "build_number": r.build_number,
            "title": r.title,
            "status": r.status,
            "environment": r.environment,
            "git_branch": r.git_branch,
            "git_tag": r.git_tag,
            "validation_status": r.validation_status,
            "is_critical_security": r.is_critical_security,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "approved_at": r.approved_at.isoformat() if r.approved_at else None,
            "published_at": r.published_at.isoformat() if r.published_at else None,
            "rolled_back_at": r.rolled_back_at.isoformat() if r.rolled_back_at else None,
            "rollback_reason": r.rollback_reason,
            "rollback_target_version": r.rollback_target_version,
            "created_by_id": r.created_by_id,
            "approved_by_id": r.approved_by_id,
            "published_by_id": r.published_by_id,
            "change_summary": summary,
            "structured_notes_counts": {k: len(v) for k, v in structured.items() if isinstance(v, list)},
        })

    return {
        "total": total,
        "page": page,
        "limit": limit,
        "items": items,
    }


@router.post("/generate-draft", status_code=status.HTTP_201_CREATED)
async def generate_release_draft(
    payload: ReleaseDraftCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("superadmin", "admin", "principal")),
):
    """
    Generates a new release candidate draft from unreleased changes.
    """
    await ReleaseService.seed_historical_releases(db, current_user.id)
    release = await ReleaseService.create_release_draft(
        db=db,
        creator=current_user,
        version=payload.version,
        title=payload.title,
        environment=payload.environment,
        bump_type=payload.bump_type,
        is_critical_security=payload.is_critical_security,
        migration_plan=payload.migration_plan,
    )
    return {
        "message": f"Release draft v{release.version} generated successfully.",
        "release_id": release.id,
        "version": release.version,
        "build_number": release.build_number,
        "status": release.status,
    }


@router.get("/{release_id}")
async def get_release_details(
    release_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Returns full details for a specific release, including complete release notes and validation diagnostics.
    """
    rel = await db.get(SystemRelease, release_id)
    if not rel:
        raise HTTPException(status_code=404, detail=f"Release {release_id} not found")

    structured = {}
    summary = {}
    val_results = {}
    try:
        if rel.release_notes_structured:
            structured = json.loads(rel.release_notes_structured)
        if rel.change_summary:
            summary = json.loads(rel.change_summary)
        if rel.validation_results:
            val_results = json.loads(rel.validation_results)
    except Exception:
        pass

    return {
        "id": rel.id,
        "version": rel.version,
        "build_number": rel.build_number,
        "title": rel.title,
        "status": rel.status,
        "environment": rel.environment,
        "git_branch": rel.git_branch,
        "git_commit_start": rel.git_commit_start,
        "git_commit_end": rel.git_commit_end,
        "git_tag": rel.git_tag,
        "release_notes_markdown": rel.release_notes_markdown,
        "release_notes_structured": structured,
        "change_summary": summary,
        "validation_status": rel.validation_status,
        "validation_results": val_results,
        "is_critical_security": rel.is_critical_security,
        "requires_db_backup": rel.requires_db_backup,
        "migration_plan": rel.migration_plan,
        "created_by_id": rel.created_by_id,
        "approved_by_id": rel.approved_by_id,
        "published_by_id": rel.published_by_id,
        "rolled_back_by_id": rel.rolled_back_by_id,
        "rollback_reason": rel.rollback_reason,
        "rollback_target_version": rel.rollback_target_version,
        "created_at": rel.created_at.isoformat() if rel.created_at else None,
        "approved_at": rel.approved_at.isoformat() if rel.approved_at else None,
        "published_at": rel.published_at.isoformat() if rel.published_at else None,
        "rolled_back_at": rel.rolled_back_at.isoformat() if rel.rolled_back_at else None,
    }


@router.put("/{release_id}")
async def update_release_notes(
    release_id: int,
    payload: ReleaseUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("superadmin", "admin")),
):
    """
    Updates the release notes, title, or migration plan. Only permitted in draft or validating status.
    """
    rel = await db.get(SystemRelease, release_id)
    if not rel:
        raise HTTPException(status_code=404, detail="Release not found")

    if rel.status in ("approved", "published", "rolled_back"):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot edit release in '{rel.status}' status. Releases are immutable once approved or published.",
        )

    if payload.title is not None:
        rel.title = payload.title.strip()
    if payload.release_notes_markdown is not None:
        rel.release_notes_markdown = payload.release_notes_markdown
    if payload.release_notes_structured is not None:
        rel.release_notes_structured = json.dumps(payload.release_notes_structured)
    if payload.migration_plan is not None:
        rel.migration_plan = payload.migration_plan.strip()
    if payload.is_critical_security is not None:
        rel.is_critical_security = payload.is_critical_security

    audit = AuditLog(
        user_id=current_user.id,
        action="release_notes_edited",
        resource_type="system_release",
        resource_id=rel.id,
        new_data=json.dumps({"title": rel.title}),
        is_system_audit=True,
        severity="info",
        details=f"Updated release notes for v{rel.version}",
    )
    db.add(audit)
    await db.commit()
    await db.refresh(rel)
    return {"message": "Release updated successfully", "release_id": rel.id}


@router.post("/{release_id}/validate")
async def validate_release(
    release_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("superadmin", "admin")),
):
    """
    Executes pre-flight CI/CD tests and security checks against this release.
    """
    rel = await db.get(SystemRelease, release_id)
    if not rel:
        raise HTTPException(status_code=404, detail="Release not found")

    outcome = await ReleaseService.run_validations(db, rel, current_user)
    return outcome


@router.post("/{release_id}/promote-rc")
async def promote_to_release_candidate(
    release_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("superadmin", "admin")),
):
    """
    Promotes a validated release draft to Release Candidate.
    """
    rel = await db.get(SystemRelease, release_id)
    if not rel:
        raise HTTPException(status_code=404, detail="Release not found")

    try:
        updated = await ReleaseService.promote_to_release_candidate(db, rel, current_user)
        return {
            "message": f"Release v{updated.version} promoted to Release Candidate ({updated.build_number}).",
            "status": updated.status,
            "build_number": updated.build_number,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{release_id}/approve")
async def approve_release(
    release_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("superadmin", "sysadmin", "admin")),
):
    """
    Authoritative production release approval. Requires SuperAdmin / SysAdmin privileges.
    """
    if not is_authorized_release_manager(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Production release approval requires SuperAdmin or SysAdmin authority.",
        )

    rel = await db.get(SystemRelease, release_id)
    if not rel:
        raise HTTPException(status_code=404, detail="Release not found")

    try:
        approved = await ReleaseService.approve_release(db, rel, current_user)
        return {
            "message": f"Release v{approved.version} approved for production deployment.",
            "status": approved.status,
            "approved_at": approved.approved_at.isoformat() if approved.approved_at else None,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{release_id}/publish")
async def publish_release(
    release_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("superadmin", "sysadmin", "admin")),
):
    """
    Deploys / Publishes an approved release to production.
    Strictly forbids unreviewed or unapproved releases.
    """
    if not is_authorized_release_manager(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Publishing releases to production requires SuperAdmin or SysAdmin authority.",
        )

    rel = await db.get(SystemRelease, release_id)
    if not rel:
        raise HTTPException(status_code=404, detail="Release not found")

    try:
        published = await ReleaseService.publish_release(db, rel, current_user)
        return {
            "message": f"Release v{published.version} published and deployed to {published.environment}.",
            "status": published.status,
            "version": published.version,
            "build_number": published.build_number,
            "published_at": published.published_at.isoformat() if published.published_at else None,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{release_id}/rollback")
async def rollback_release(
    release_id: int,
    payload: ReleaseRollbackRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("superadmin", "sysadmin", "admin")),
):
    """
    Rolls back a published release with mandatory reason and target fallback version.
    """
    if not is_authorized_release_manager(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Rolling back releases requires SuperAdmin or SysAdmin authority.",
        )

    rel = await db.get(SystemRelease, release_id)
    if not rel:
        raise HTTPException(status_code=404, detail="Release not found")

    try:
        rolled_back = await ReleaseService.rollback_release(
            db=db,
            release=rel,
            user=current_user,
            reason=payload.reason,
            target_version=payload.target_version,
        )
        return {
            "message": f"Release v{rolled_back.version} rolled back to v{rolled_back.rollback_target_version}.",
            "status": rolled_back.status,
            "rollback_target_version": rolled_back.rollback_target_version,
            "rollback_reason": rolled_back.rollback_reason,
            "rolled_back_at": rolled_back.rolled_back_at.isoformat() if rolled_back.rolled_back_at else None,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{release_id}/audit")
async def get_release_audit_history(
    release_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("superadmin", "sysadmin", "super_admin", "admin", "principal")),
):
    """
    Returns the complete chronological audit log entries recorded for this release.
    """
    stmt = (
        select(AuditLog, User.email, User.first_name, User.last_name)
        .outerjoin(User, AuditLog.user_id == User.id)
        .where(
            AuditLog.resource_type == "system_release",
            AuditLog.resource_id == release_id,
        )
        .order_by(desc(AuditLog.created_at))
    )
    res = await db.execute(stmt)
    records = []
    for log, email, fname, lname in res.all():
        records.append({
            "id": log.id,
            "action": log.action,
            "user_id": log.user_id,
            "user_name": f"{fname or ''} {lname or ''}".strip() or email or "System",
            "severity": log.severity,
            "details": log.details,
            "new_data": log.new_data,
            "created_at": log.created_at.isoformat() if log.created_at else None,
        })

    return records
