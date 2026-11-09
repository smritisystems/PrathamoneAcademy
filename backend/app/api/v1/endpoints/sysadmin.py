# /**
#  * @file        sysadmin.py
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
#  * @updated     2026-11-09
#  *
#  * @description SysAdmin superuser API endpoints for security audits, universal records editing, and system governance.
#  */

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc, text
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
from datetime import datetime, date
import json

from app.core.database import get_db
from app.core.deps import get_current_active_user, require_sysadmin, is_sysadmin
from app.models.user import User, Role, Permission, AuditLog
from app.models.student import Student
from app.models.staff import StaffProfile
from app.models.fee import FeeStructure, FeeInvoice
from app.models.payment import Payment
from app.models.division import Division
from app.models.standard import Standard
from app.models.academic_year import AcademicYear
from app.models.institution import Institution

router = APIRouter()


class UniversalEditRequest(BaseModel):
    model_config = {"protected_namespaces": ()}

    model_name: str = Field(..., description="Target model: student, staff, user, fee_structure, division, standard, institution")
    record_id: int = Field(..., description="Primary key identifier of record")
    fields: Dict[str, Any] = Field(..., description="Dictionary of field-value pairs to update")
    reason: Optional[str] = Field(None, description="Administrative justification for the change")


class SystemSettingsUpdate(BaseModel):
    site_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    maintenance_mode: Optional[bool] = False
    session_timeout_minutes: Optional[int] = 60
    enable_mfa_requirement: Optional[bool] = False
    allow_self_registration: Optional[bool] = False


@router.get("/overview")
async def get_sysadmin_overview(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_sysadmin),
):
    """
    Returns global system infrastructure, security posture, and database statistics.
    Accessible exclusively to System Administrators.
    """
    # 1. Accounts & Roles Breakdown
    users_count = (await db.execute(select(func.count(User.id)))).scalar() or 0
    active_users = (await db.execute(select(func.count(User.id)).where(User.is_active == True))).scalar() or 0
    sysadmin_count = (await db.execute(select(func.count(User.id)).where(User.role.in_(["sysadmin", "superadmin", "super_admin"]), User.is_active == True))).scalar() or 0

    roles_res = await db.execute(
        select(User.role, func.count(User.id)).group_by(User.role)
    )
    roles_breakdown = {r[0] or "unknown": r[1] for r in roles_res.fetchall()}

    # 2. Academy Core Entities
    students_count = (await db.execute(select(func.count(Student.id)).where(Student.is_active == True))).scalar() or 0
    staff_count = (await db.execute(select(func.count(StaffProfile.id)).where(StaffProfile.status == "active"))).scalar() or 0
    batches_count = (await db.execute(select(func.count(Division.id)).where(Division.is_active == True))).scalar() or 0

    # 3. Financial Metrics
    total_invoiced = (await db.execute(select(func.coalesce(func.sum(FeeInvoice.total_amount), 0)).where(FeeInvoice.status != "cancelled"))).scalar() or 0
    total_collected = (await db.execute(select(func.coalesce(func.sum(Payment.amount), 0)).where(Payment.status == "success"))).scalar() or 0
    total_outstanding = (await db.execute(select(func.coalesce(func.sum(FeeInvoice.outstanding_amount), 0)).where(FeeInvoice.status != "cancelled"))).scalar() or 0

    # 4. Audit Log Statistics
    total_audits = (await db.execute(select(func.count(AuditLog.id)))).scalar() or 0
    security_audits = (await db.execute(select(func.count(AuditLog.id)).where(AuditLog.is_system_audit == True))).scalar() or 0
    recent_critical_audits = (await db.execute(
        select(func.count(AuditLog.id)).where(AuditLog.severity.in_(["warning", "critical"]))
    )).scalar() or 0

    return {
        "status": "operational",
        "timestamp": datetime.utcnow().isoformat(),
        "current_sysadmin": {
            "id": current_user.id,
            "username": current_user.username,
            "email": current_user.email,
            "role": current_user.role,
        },
        "users_summary": {
            "total_accounts": users_count,
            "active_accounts": active_users,
            "active_sysadmins": sysadmin_count,
            "roles_breakdown": roles_breakdown,
        },
        "academic_summary": {
            "active_students": students_count,
            "active_faculty_staff": staff_count,
            "active_batches": batches_count,
        },
        "financial_summary": {
            "total_invoiced": float(total_invoiced),
            "total_collected": float(total_collected),
            "total_outstanding": float(total_outstanding),
        },
        "security_audit_summary": {
            "total_logs": total_audits,
            "security_audits": security_audits,
            "critical_events": recent_critical_audits,
        },
    }


@router.get("/security-audit-logs")
async def list_security_audit_logs(
    user_id: Optional[int] = Query(None, description="Filter by actor ID"),
    resource_type: Optional[str] = Query(None, description="Filter by resource type: user, student, staff, fee, system"),
    severity: Optional[str] = Query(None, description="Filter by severity: info, warning, critical"),
    is_system_only: bool = Query(True, description="When true, show only protected system security logs"),
    search: Optional[str] = Query(None, description="Search details, action or data"),
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_sysadmin),
):
    """
    Returns the protected security audit trail.
    Strictly isolated and inaccessible to ordinary staff, teachers, or students.
    """
    conditions = []
    if is_system_only:
        conditions.append(AuditLog.is_system_audit == True)
    if user_id:
        conditions.append(AuditLog.user_id == user_id)
    if resource_type:
        conditions.append(AuditLog.resource_type == resource_type)
    if severity:
        conditions.append(AuditLog.severity == severity)
    if from_date:
        conditions.append(AuditLog.created_at >= datetime.combine(from_date, datetime.min.time()))
    if to_date:
        conditions.append(AuditLog.created_at <= datetime.combine(to_date, datetime.max.time()))
    if search:
        search_fmt = f"%{search.strip()}%"
        conditions.append(
            or_(
                AuditLog.action.ilike(search_fmt),
                AuditLog.resource_type.ilike(search_fmt),
                AuditLog.details.ilike(search_fmt),
                AuditLog.new_data.ilike(search_fmt),
            )
        )

    where_clause = and_(*conditions) if conditions else text("1=1")

    # Count total matching records
    total = (await db.execute(select(func.count(AuditLog.id)).where(where_clause))).scalar() or 0

    # Paginated select with user join
    query = (
        select(AuditLog, User.username, User.first_name, User.last_name, User.role)
        .outerjoin(User, AuditLog.user_id == User.id)
        .where(where_clause)
        .order_by(desc(AuditLog.created_at))
        .offset((page - 1) * limit)
        .limit(limit)
    )
    result = await db.execute(query)
    rows = result.all()

    logs = []
    for log, uname, fname, lname, urole in rows:
        actor_name = f"{fname or ''} {lname or ''}".strip() or uname or "System Automation"
        logs.append({
            "id": log.id,
            "user_id": log.user_id,
            "actor_username": uname,
            "actor_name": actor_name,
            "actor_role": urole,
            "action": log.action,
            "resource_type": log.resource_type,
            "resource_id": log.resource_id,
            "old_data": log.old_data,
            "new_data": log.new_data,
            "details": log.details,
            "severity": log.severity,
            "is_system_audit": log.is_system_audit,
            "ip_address": log.ip_address,
            "user_agent": log.user_agent,
            "created_at": log.created_at.isoformat() if log.created_at else None,
        })

    return {
        "items": logs,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit if limit > 0 else 1,
    }


# Explicit Field-level Allowlists for Universal Record Editor
MODEL_FIELD_ALLOWLIST: Dict[str, set] = {
    "student": {
        "first_name", "last_name", "middle_name", "date_of_birth", "gender",
        "blood_group", "nationality", "religion", "caste", "aadhar_number",
        "photo_url", "address", "city", "state", "pincode", "phone", "email",
        "is_active", "exit_date", "exit_reason", "exit_notes"
    },
    "staff": {
        "first_name", "last_name", "designation", "department", "qualification",
        "experience_years", "phone", "email", "address", "status", "joining_date",
        "specialization"
    },
    "user": {
        "first_name", "last_name", "email", "phone", "role", "is_active"
    },
    "fee_structure": {
        "name", "description", "total_amount", "is_active"
    },
    "division": {
        "name", "code", "room_number", "capacity", "schedule_timing", "status",
        "is_active", "class_teacher_id"
    },
    "batch": {
        "name", "code", "room_number", "capacity", "schedule_timing", "status",
        "is_active", "class_teacher_id"
    },
    "standard": {
        "name", "level", "description", "is_active"
    },
    "institution": {
        "name", "tagline", "address", "city", "state", "pincode", "phone",
        "email", "website", "logo_url", "favicon_url", "primary_color",
        "secondary_color", "accent_color", "description", "is_active"
    },
}


@router.post("/universal-edit")
async def execute_universal_edit(
    req: UniversalEditRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_sysadmin),
):
    """
    Universal Administrative Edit Endpoint.
    Enables authorized SysAdmin superusers to update editable fields across application entities.
    Enforces strict field allowlists to protect primary keys, passwords, foreign keys, and tenant isolation.
    Automatically maintains comprehensive before/after security audit logging.
    """
    model_name = req.model_name.lower().strip()
    record_id = req.record_id
    fields = req.fields
    reason = req.reason or "Direct SysAdmin Administrative Modification"

    if model_name not in MODEL_FIELD_ALLOWLIST:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Model '{model_name}' is not supported for universal editing. Supported models: {sorted(list(MODEL_FIELD_ALLOWLIST.keys()))}",
        )

    allowed_fields = MODEL_FIELD_ALLOWLIST[model_name]
    disallowed_fields = [k for k in fields.keys() if k not in allowed_fields]
    if disallowed_fields:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Field(s) {disallowed_fields} are protected or not permissible for direct universal edit on model '{model_name}'. "
                f"Permissible fields: {sorted(list(allowed_fields))}"
            ),
        )

    filtered_fields = {k: v for k, v in fields.items() if k in allowed_fields}
    if not filtered_fields:
        raise HTTPException(status_code=400, detail="No permissible fields supplied for edit.")

    old_values = {}
    new_values = {}

    if model_name == "student":
        target = (await db.execute(select(Student).where(Student.id == record_id))).scalar_one_or_none()
        if not target:
            raise HTTPException(status_code=404, detail=f"Student ID {record_id} not found")
        for k, v in filtered_fields.items():
            if hasattr(target, k):
                old_values[k] = str(getattr(target, k))
                setattr(target, k, v)
                new_values[k] = str(v)

    elif model_name == "staff":
        target = (await db.execute(select(StaffProfile).where(StaffProfile.id == record_id))).scalar_one_or_none()
        if not target:
            raise HTTPException(status_code=404, detail=f"Staff Profile ID {record_id} not found")
        for k, v in filtered_fields.items():
            if hasattr(target, k):
                old_values[k] = str(getattr(target, k))
                setattr(target, k, v)
                new_values[k] = str(v)

    elif model_name == "user":
        target = (await db.execute(select(User).where(User.id == record_id))).scalar_one_or_none()
        if not target:
            raise HTTPException(status_code=404, detail=f"User ID {record_id} not found")
        # Prevent last sysadmin deactivation via universal edit
        if "is_active" in filtered_fields and filtered_fields["is_active"] is False and target.role in ["sysadmin", "superadmin", "super_admin"]:
            active_super = (await db.execute(select(func.count(User.id)).where(User.role.in_(["sysadmin", "superadmin", "super_admin"]), User.is_active == True))).scalar() or 0
            if active_super <= 1:
                raise HTTPException(status_code=400, detail="Cannot deactivate the last remaining active System Administrator")
        for k, v in filtered_fields.items():
            if hasattr(target, k):
                old_values[k] = str(getattr(target, k))
                setattr(target, k, v)
                new_values[k] = str(v)

    elif model_name == "fee_structure":
        target = (await db.execute(select(FeeStructure).where(FeeStructure.id == record_id))).scalar_one_or_none()
        if not target:
            raise HTTPException(status_code=404, detail=f"FeeStructure ID {record_id} not found")
        for k, v in filtered_fields.items():
            if hasattr(target, k):
                old_values[k] = str(getattr(target, k))
                setattr(target, k, v)
                new_values[k] = str(v)

    elif model_name == "division" or model_name == "batch":
        target = (await db.execute(select(Division).where(Division.id == record_id))).scalar_one_or_none()
        if not target:
            raise HTTPException(status_code=404, detail=f"Batch/Division ID {record_id} not found")
        for k, v in filtered_fields.items():
            if hasattr(target, k):
                old_values[k] = str(getattr(target, k))
                setattr(target, k, v)
                new_values[k] = str(v)

    elif model_name == "standard":
        target = (await db.execute(select(Standard).where(Standard.id == record_id))).scalar_one_or_none()
        if not target:
            raise HTTPException(status_code=404, detail=f"Standard ID {record_id} not found")
        for k, v in filtered_fields.items():
            if hasattr(target, k):
                old_values[k] = str(getattr(target, k))
                setattr(target, k, v)
                new_values[k] = str(v)

    elif model_name == "institution":
        target = (await db.execute(select(Institution).where(Institution.id == record_id))).scalar_one_or_none()
        if not target:
            raise HTTPException(status_code=404, detail=f"Institution ID {record_id} not found")
        for k, v in filtered_fields.items():
            if hasattr(target, k):
                old_values[k] = str(getattr(target, k))
                setattr(target, k, v)
                new_values[k] = str(v)
    else:
        raise HTTPException(status_code=400, detail=f"Model '{model_name}' is not supported for universal editing.")

    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")

    # Record protected security audit entry
    audit = AuditLog(
        user_id=current_user.id,
        action=f"universal_edit_{model_name}",
        resource_type=model_name,
        resource_id=record_id,
        old_data=json.dumps(old_values),
        new_data=json.dumps(new_values),
        details=f"Universal Administrative Edit. Reason: {reason}",
        severity="warning",
        is_system_audit=True,
        ip_address=client_ip,
        user_agent=user_agent[:490],
    )
    db.add(audit)
    await db.commit()

    return {
        "success": True,
        "message": f"Successfully updated {model_name} (ID: {record_id})",
        "model_name": model_name,
        "record_id": record_id,
        "updated_fields": list(new_values.keys()),
        "audit_id": audit.id,
    }


@router.get("/system-settings")
async def get_system_settings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_sysadmin),
):
    """
    Returns application configuration, operational flags, and security parameters.
    """
    inst = (await db.execute(select(Institution).where(Institution.id == 1))).scalar_one_or_none()
    return {
        "institution_name": inst.name if inst else "Prashant Academy",
        "institution_code": inst.code if inst else "PAC-001",
        "contact_phone": inst.phone if inst else "+91 98765 43210",
        "contact_email": inst.email if inst else "admin@prashantacademy.edu.in",
        "maintenance_mode": False,
        "session_timeout_minutes": 60,
        "enable_mfa_requirement": False,
        "allow_self_registration": False,
        "security_audit_logging_active": True,
        "system_version": settings.VERSION,
        "app_environment": "production",
    }


@router.put("/system-settings")
async def update_system_settings(
    data: SystemSettingsUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_sysadmin),
):
    """
    Updates core institute and system configurations with security audit tracking.
    """
    inst = (await db.execute(select(Institution).where(Institution.id == 1))).scalar_one_or_none()
    if inst:
        if data.site_name:
            inst.name = data.site_name
        if data.contact_email:
            inst.email = data.contact_email
        if data.contact_phone:
            inst.phone = data.contact_phone

    audit = AuditLog(
        user_id=current_user.id,
        action="update_system_settings",
        resource_type="system",
        resource_id=1,
        details=f"System configurations updated by {current_user.username}",
        severity="critical",
        is_system_audit=True,
        ip_address=request.client.host if request.client else "unknown",
        user_agent=request.headers.get("user-agent", "unknown")[:490],
    )
    db.add(audit)
    await db.commit()

    return {
        "success": True,
        "message": "System settings updated successfully",
        "data": data.dict(exclude_none=True),
    }


class ToggleEditPostedRequest(BaseModel):
    role_name: str = "sysadmin"
    granted: bool
    reason: str


@router.get("/permissions/edit-posted-status")
async def get_edit_posted_status(
    role_name: str = "sysadmin",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_sysadmin),
):
    """Checks whether the specified role has explicit payments:edit_posted permission."""
    role_res = await db.execute(select(Role).where(func.lower(Role.name) == role_name.lower().strip()))
    role = role_res.scalar_one_or_none()
    if not role:
        raise HTTPException(status_code=404, detail=f"Role '{role_name}' not found")

    perm_res = await db.execute(
        select(Permission).where(
            Permission.role_id == role.id,
            Permission.resource == "payments",
            Permission.action == "edit_posted",
        )
    )
    perm = perm_res.scalar_one_or_none()
    return {
        "role_name": role.name,
        "role_id": role.id,
        "has_edit_posted_permission": perm is not None,
        "permission_id": perm.id if perm else None,
    }


@router.post("/permissions/toggle-edit-posted")
async def toggle_edit_posted_permission(
    req: ToggleEditPostedRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_sysadmin),
):
    """
    Grants or revokes the explicit 'payments:edit_posted' permission for a role.
    Maintains an immutable audit log entry of this security change.
    """
    if not req.reason or not req.reason.strip():
        raise HTTPException(status_code=400, detail="Administrative reason is required for permission modification.")

    role_res = await db.execute(select(Role).where(func.lower(Role.name) == req.role_name.lower().strip()))
    role = role_res.scalar_one_or_none()
    if not role:
        raise HTTPException(status_code=404, detail=f"Role '{req.role_name}' not found")

    perm_res = await db.execute(
        select(Permission).where(
            Permission.role_id == role.id,
            Permission.resource == "payments",
            Permission.action == "edit_posted",
        )
    )
    existing_perm = perm_res.scalar_one_or_none()

    if req.granted and not existing_perm:
        new_perm = Permission(role_id=role.id, resource="payments", action="edit_posted")
        db.add(new_perm)
        action_name = "permission_granted"
    elif not req.granted and existing_perm:
        await db.delete(existing_perm)
        action_name = "permission_revoked"
    else:
        action_name = "permission_unchanged"

    # Log to audit trail
    audit = AuditLog(
        user_id=current_user.id,
        action=f"sysadmin_permission_{action_name}",
        resource_type="permission",
        resource_id=role.id,
        old_data=json.dumps({"has_edit_posted": existing_perm is not None}),
        new_data=json.dumps({"has_edit_posted": req.granted}),
        details=f"SysAdmin toggled 'payments:edit_posted' for role '{role.name}' to {req.granted}. Reason: {req.reason}",
        severity="critical",
        is_system_audit=True,
    )
    db.add(audit)
    await db.commit()

    return {
        "success": True,
        "role_name": role.name,
        "edit_posted_granted": req.granted,
        "action": action_name,
        "message": f"Successfully {'granted' if req.granted else 'revoked'} 'payments:edit_posted' for role '{role.name}'",
    }

@router.get("/audit-timeline")
async def get_unified_audit_timeline(
    domain: Optional[str] = Query(None, description="Filter by domain (SECURITY_SYSTEM, SETTINGS, COMMUNICATION, CODEX_SECURITY, STUDENT_ACADEMIC)"),
    search: Optional[str] = Query(None, description="Search keyword in action or details"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_sysadmin),
):
    """
    Unified cross-domain audit log query endpoint accessing the canonical v_unified_audit_logs view.
    """
    where_clauses = []
    params = {"skip": skip, "limit": limit}

    if domain:
        where_clauses.append("domain = :domain")
        params["domain"] = domain
    if search:
        where_clauses.append("(action ILIKE :search OR details ILIKE :search)")
        params["search"] = f"%{search}%"

    where_sql = ("WHERE " + " AND ".join(where_clauses)) if where_clauses else ""

    count_query = text(f"SELECT count(*) FROM v_unified_audit_logs {where_sql}")
    total = (await db.execute(count_query, params)).scalar() or 0

    data_query = text(f"""
        SELECT source_table, source_id, domain, action, entity_type, entity_id, actor_user_id, details, status, ip_address, created_at
        FROM v_unified_audit_logs
        {where_sql}
        ORDER BY created_at DESC
        OFFSET :skip LIMIT :limit
    """)
    rows = (await db.execute(data_query, params)).fetchall()

    items = [
        {
            "source_table": r[0],
            "source_id": r[1],
            "domain": r[2],
            "action": r[3],
            "entity_type": r[4],
            "entity_id": r[5],
            "actor_user_id": r[6],
            "details": r[7],
            "status": r[8],
            "ip_address": r[9],
            "created_at": r[10].isoformat() if r[10] else None,
        }
        for r in rows
    ]

    return {
        "status": "success",
        "total": total,
        "skip": skip,
        "limit": limit,
        "items": items,
    }
