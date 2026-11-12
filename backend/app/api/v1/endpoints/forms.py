# /**
#  * @file        forms.py
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
#  * @description API endpoints for form catalog discovery, single & bulk form rendering, DPDP consent, and audit logs.
#  */

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_active_user, is_sysadmin, check_institution_access
from app.models.user import User, AuditLog
from app.models.enrollment import StudentEnrollment
from app.models.standard import Standard
from app.models.division import Division
from app.models.student import Student
from app.services.form_catalog import list_form_definitions, get_form_definition
from app.services.form_renderer import FormRendererEngine, log_form_audit_event

router = APIRouter()


class BulkRenderRequest(BaseModel):
    form_id: str
    mode: str = Field(default="prefilled", description="'prefilled' or 'blank'")
    record_ids: Optional[List[int]] = None
    division_id: Optional[int] = None
    standard_id: Optional[int] = None
    sections: Optional[List[str]] = None


@router.get("/catalogue")
async def get_catalogue(
    entity: Optional[str] = Query(None, description="Filter by entity: student, staff, parent, user, operations"),
    category: Optional[str] = Query(None, description="Filter by category: KYC, Academic, Fees, HR, Operations"),
    current_user: User = Depends(get_current_active_user),
):
    """Retrieve full forms catalogue with legal references, permissions, and configurable sections."""
    forms = list_form_definitions(entity=entity, category=category)
    return {
        "total": len(forms),
        "forms": forms,
    }


@router.get("/render/{form_id}")
async def render_single_form(
    form_id: str,
    request: Request,
    record_id: Optional[int] = Query(None, description="Target record ID (student_id, user_id, guardian_id)"),
    mode: str = Query("prefilled", description="'prefilled' or 'blank'"),
    sections: Optional[str] = Query(None, description="Comma-separated list of enabled section keys"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Render a single printable form payload in prefilled or blank write-in format."""
    try:
        form_def = get_form_definition(form_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

    # RBAC Check
    req_roles = [r.lower() for r in form_def.get("required_roles", [])]
    user_role = (current_user.role or "").strip().lower()
    if req_roles and user_role not in req_roles and not is_sysadmin(current_user) and user_role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied. Generating '{form_def['title']}' requires one of the following roles: {', '.join(req_roles)}.",
        )

    section_list = [s.strip() for s in sections.split(",")] if sections else None

    if user_role == "student" and (form_def["entity"] == "student" or form_def["category"] in ["Fees", "Academic"]):
        if record_id is not None and record_id != getattr(current_user, "student_id", None):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Students may only render forms for their own student record.",
            )
        if mode == "prefilled" and not record_id:
            record_id = getattr(current_user, "student_id", None)
    elif mode == "prefilled" and not record_id:
        if form_def["entity"] == "student" or form_def["category"] in ["Fees", "Academic"]:
            stmt = select(Student.id)
            if not is_sysadmin(current_user) and current_user.institution_id:
                stmt = stmt.where(Student.institution_id == current_user.institution_id)
            s_res = await db.execute(stmt.order_by(Student.id).limit(1))
            first_s_id = s_res.scalar_one_or_none()
            record_id = first_s_id
        elif form_def["entity"] in ["staff", "user"]:
            record_id = current_user.id

    if record_id and (form_def["entity"] == "student" or form_def["category"] in ["Fees", "Academic"]):
        stu = await db.get(Student, record_id)
        if stu:
            check_institution_access(stu.institution_id, current_user)
    elif record_id and form_def["entity"] in ["staff", "user"]:
        if not is_sysadmin(current_user) and user_role not in ("admin", "principal") and record_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot render another user's staff form")
        target_usr = await db.get(User, record_id)
        if target_usr:
            check_institution_access(target_usr.institution_id, current_user)

    rendered = await FormRendererEngine.render(
        db=db,
        form_id=form_id,
        record_id=record_id,
        mode=mode,
        sections=section_list,
        current_user=current_user,
    )

    # Log audit event for DPDP and compliance tracking
    ip_addr = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent", "")
    await log_form_audit_event(
        db=db,
        user=current_user,
        form_id=form_id,
        form_title=form_def["title"],
        record_id=record_id,
        mode=mode,
        count=1,
        ip_address=ip_addr,
        user_agent=user_agent[:490] if user_agent else None,
    )

    return rendered


@router.post("/bulk-render")
async def bulk_render_forms(
    payload: BulkRenderRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Render multiple records in bulk for class-level or batch printing with page break segments."""
    try:
        form_def = get_form_definition(payload.form_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

    # RBAC Check: Bulk print restricted to authorized staff/admins (never students)
    req_roles = [r.lower() for r in form_def.get("required_roles", [])]
    user_role = (current_user.role or "").strip().lower()
    if user_role == "student" or (req_roles and user_role not in req_roles and not is_sysadmin(current_user) and user_role != "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied for bulk form printing.",
        )

    target_ids: List[int] = []
    if payload.record_ids:
        target_ids = payload.record_ids
        if not is_sysadmin(current_user) and form_def["entity"] == "student":
            stus = (await db.execute(select(Student.id, Student.institution_id).where(Student.id.in_(target_ids)))).all()
            for _, inst_id in stus:
                check_institution_access(inst_id, current_user)
    elif payload.division_id:
        if not is_sysadmin(current_user):
            div_inst = (
                await db.execute(
                    select(Standard.institution_id)
                    .join(Division, Division.standard_id == Standard.id)
                    .where(Division.id == payload.division_id)
                )
            ).scalar_one_or_none()
            if div_inst is not None:
                check_institution_access(div_inst, current_user)
        # Fetch active students enrolled in this division
        enr_stmt = (
            select(StudentEnrollment.student_id)
            .join(Student, Student.id == StudentEnrollment.student_id)
            .where(StudentEnrollment.division_id == payload.division_id)
            .where(StudentEnrollment.status == "active")
        )
        if not is_sysadmin(current_user) and current_user.institution_id:
            enr_stmt = enr_stmt.where(Student.institution_id == current_user.institution_id)
        enr_res = await db.execute(enr_stmt)
        target_ids = list(enr_res.scalars().all())
    elif payload.standard_id:
        if not is_sysadmin(current_user):
            std_obj = await db.get(Standard, payload.standard_id)
            if std_obj:
                check_institution_access(std_obj.institution_id, current_user)
        # Fetch active students enrolled in any division belonging to this standard
        enr_stmt = (
            select(StudentEnrollment.student_id)
            .join(Student, Student.id == StudentEnrollment.student_id)
            .join(StudentEnrollment.division)
            .where(StudentEnrollment.division.has(standard_id=payload.standard_id))
            .where(StudentEnrollment.status == "active")
        )
        if not is_sysadmin(current_user) and current_user.institution_id:
            enr_stmt = enr_stmt.where(Student.institution_id == current_user.institution_id)
        enr_res = await db.execute(enr_stmt)
        target_ids = list(enr_res.scalars().all())
    else:
        # Default to current tenant's students if student form, limit to 25 for safe single batch print
        if form_def["entity"] == "student":
            s_stmt = select(Student.id)
            if not is_sysadmin(current_user) and current_user.institution_id:
                s_stmt = s_stmt.where(Student.institution_id == current_user.institution_id)
            s_res = await db.execute(s_stmt.order_by(Student.id).limit(25))
            target_ids = list(s_res.scalars().all())

    if not target_ids and payload.mode == "prefilled":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No target records found matching the requested division or student criteria.",
        )

    rendered_forms = []
    if payload.mode == "blank":
        # In blank mode, output N copies if specified, default 1
        copies = len(target_ids) if target_ids else 1
        for _ in range(max(1, min(copies, 50))):
            rendered = await FormRendererEngine.render(
                db=db,
                form_id=payload.form_id,
                record_id=None,
                mode="blank",
                sections=payload.sections,
                current_user=current_user,
            )
            rendered_forms.append(rendered)
    else:
        for r_id in target_ids:
            rendered = await FormRendererEngine.render(
                db=db,
                form_id=payload.form_id,
                record_id=r_id,
                mode="prefilled",
                sections=payload.sections,
                current_user=current_user,
            )
            rendered_forms.append(rendered)

    # Log consolidated audit entry
    ip_addr = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent", "")
    await log_form_audit_event(
        db=db,
        user=current_user,
        form_id=payload.form_id,
        form_title=form_def["title"],
        record_id=target_ids[0] if target_ids else None,
        mode=payload.mode,
        count=len(rendered_forms),
        ip_address=ip_addr,
        user_agent=user_agent[:490] if user_agent else None,
    )

    return {
        "form_id": payload.form_id,
        "title": form_def["title"],
        "mode": payload.mode,
        "total_records": len(rendered_forms),
        "forms": rendered_forms,
    }


@router.get("/audit-logs")
async def get_form_audit_logs(
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Retrieve audit trail of recent form generations (restricted to admin and compliance officers)."""
    if not is_sysadmin(current_user) and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can review form generation and DPDP audit logs.",
        )

    audit_stmt = select(AuditLog).where(AuditLog.action == "PRINT_FORM_GENERATED")
    if not is_sysadmin(current_user) and current_user.institution_id:
        audit_stmt = audit_stmt.join(User, AuditLog.user_id == User.id).where(
            User.institution_id == current_user.institution_id
        )
    res = await db.execute(
        audit_stmt.order_by(desc(AuditLog.created_at)).limit(limit)
    )
    logs = res.scalars().all()

    output = []
    for log in logs:
        output.append({
            "id": log.id,
            "user_id": log.user_id,
            "action": log.action,
            "resource_id": log.resource_id,
            "metadata": log.new_data,
            "ip_address": log.ip_address,
            "created_at": log.created_at.strftime("%d %b %Y, %I:%M %p") if log.created_at else "",
        })

    return {
        "total": len(output),
        "audit_logs": output,
    }
