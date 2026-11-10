# /**
#  * @file        governance.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      backend.app.api.v1.endpoints.governance
#  *
#  * @author      Jawahar R. Mallah
#  * @organization AITDL (AI Technology & Development Lab)
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 AITDL
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-10
#  * @updated     2026-11-10
#  *
#  * @description API router for Global Safe Delete, Pre-flight Dependency Auditing, and Data Integrity Governance.
#  */

from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.deps import get_current_active_user, require_role
from app.models.user import User, AuditLog
from app.services.safe_delete_service import SafeDeleteService

router = APIRouter()

GOVERNANCE_ADMIN_ROLES = ["superadmin", "super_admin", "admin", "principal"]


# ─── Pydantic Request Models ──────────────────────────────────────────────────

class SafeDeleteRequest(BaseModel):
    entity_type: str = Field(..., description="Entity category: user, student, standard, division, subject, fee_structure, etc.")
    entity_id: int = Field(..., description="Target primary key ID")
    reason: Optional[str] = Field(None, description="Optional explanation or audit reason for deletion")


class SafeDeactivateRequest(BaseModel):
    entity_type: str = Field(..., description="Entity category")
    entity_id: int = Field(..., description="Target primary key ID")
    reason: Optional[str] = Field(None, description="Reason for deactivation")


class SafeArchiveRequest(BaseModel):
    entity_type: str = Field(..., description="Entity category")
    entity_id: int = Field(..., description="Target primary key ID")
    reason: Optional[str] = Field(None, description="Reason for archiving")


# ─── Pre-flight Dependency Check Endpoint ─────────────────────────────────────

@router.get("/safe-delete/check")
async def check_delete_eligibility(
    entity_type: str = Query(..., description="Entity type to check (e.g., student, standard, division, subject, user, payment)"),
    entity_id: int = Query(..., description="Primary key identifier of the entity"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Performs real-time, pre-flight dependency inspection for a target entity.
    Returns whether the entity is eligible for permanent deletion, exact reasons if blocked,
    counts of referencing records, and recommended alternative actions (deactivate/archive/reversal).
    """
    report = await SafeDeleteService.check_eligibility(
        db=db,
        entity_type=entity_type,
        entity_id=entity_id,
        current_user=current_user,
    )
    return report.to_dict()


# ─── In-Transaction Safe Deletion Execution ───────────────────────────────────

@router.post("/safe-delete/execute")
async def execute_safe_delete(
    payload: SafeDeleteRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*GOVERNANCE_ADMIN_ROLES)),
):
    """
    Executes permanent deletion strictly within a database transaction after re-verifying
    eligibility. Records an AuditLog and safely rolls back if dependencies are detected.
    """
    result = await SafeDeleteService.execute_safe_delete(
        db=db,
        entity_type=payload.entity_type,
        entity_id=payload.entity_id,
        current_user=current_user,
        reason=payload.reason,
    )
    return result


# ─── Safe Deactivation Execution ──────────────────────────────────────────────

@router.post("/safe-delete/deactivate")
async def execute_safe_deactivate(
    payload: SafeDeactivateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*GOVERNANCE_ADMIN_ROLES)),
):
    """
    Safely deactivates an entity (is_active = False) preserving all historical records,
    financial ledgers, and audit trails.
    """
    result = await SafeDeleteService.execute_safe_deactivate(
        db=db,
        entity_type=payload.entity_type,
        entity_id=payload.entity_id,
        current_user=current_user,
        reason=payload.reason,
    )
    return result


# ─── Safe Archive Execution ───────────────────────────────────────────────────

@router.post("/safe-delete/archive")
async def execute_safe_archive(
    payload: SafeArchiveRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*GOVERNANCE_ADMIN_ROLES)),
):
    """
    Safely archives an operational entity (e.g., division/batch status='archived', lead stage='lost')
    removing it from active lists while preserving historical reporting access.
    """
    result = await SafeDeleteService.execute_safe_archive(
        db=db,
        entity_type=payload.entity_type,
        entity_id=payload.entity_id,
        current_user=current_user,
        reason=payload.reason,
    )
    return result


# ─── Governance Audit Logs ────────────────────────────────────────────────────

@router.get("/safe-delete/audit-logs")
async def list_governance_audit_logs(
    resource_type: Optional[str] = Query(None, description="Filter by resource type"),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*GOVERNANCE_ADMIN_ROLES)),
):
    """
    Lists audit log entries for all governance deletions, deactivations, and archiving events.
    """
    query = select(AuditLog).where(
        AuditLog.action.in_([
            "permanent_delete_user", "safe_deactivate_user",
            "permanent_delete_student", "safe_deactivate_student", "safe_archive_student",
            "permanent_delete_standard", "safe_deactivate_standard",
            "permanent_delete_division", "safe_deactivate_division", "safe_archive_division",
            "permanent_delete_canonical_subject", "safe_deactivate_canonical_subject",
            "permanent_delete_subject", "safe_deactivate_subject",
            "permanent_delete_subject_mapping", "safe_deactivate_subject_mapping",
            "permanent_delete_fee_category", "safe_deactivate_fee_category",
            "permanent_delete_fee_structure", "safe_deactivate_fee_structure",
            "permanent_delete_academic_year", "safe_deactivate_academic_year",
            "permanent_delete_examination", "safe_deactivate_examination",
            "permanent_delete_lead", "safe_archive_lead",
            "permanent_delete_lookup_item", "safe_deactivate_lookup_item",
        ])
    )
    if resource_type:
        query = query.where(AuditLog.resource_type == resource_type.strip().lower())

    query = query.options(selectinload(AuditLog.user)).order_by(desc(AuditLog.created_at)).limit(limit)
    logs = (await db.execute(query)).scalars().all()

    return [
        {
            "id": log.id,
            "action": log.action,
            "resource_type": log.resource_type,
            "resource_id": log.resource_id,
            "user_id": log.user_id,
            "user_name": log.user.full_name if log.user else None,
            "old_data": log.old_data,
            "details": log.details,
            "created_at": log.created_at.isoformat() if log.created_at else None,
        }
        for log in logs
    ]
