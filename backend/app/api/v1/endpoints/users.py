# /**
#  * @file        users.py
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
#  * @updated     2026-11-04
#  *
#  * @description API endpoints for user account administration, RBAC roles, security scopes, and invitations.
#  */

import json
import secrets
import string
from datetime import datetime, date
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_, desc, asc
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.deps import get_current_active_user, require_role
from app.core.security import get_password_hash
from app.models.user import User, Role, Permission, AuditLog
from app.models.student import Student
from app.models.enrollment import StudentEnrollment
from app.models.division import Division
from app.models.standard import Standard
from app.models.board import Board
from app.models.academic_year import AcademicYear
from app.models.attendance import Attendance
from app.models.exam import Examination, ExamMark
from app.models.fee import FeeInvoice, StudentFeeAssignment
from app.models.payment import Payment, PaymentReceipt

router = APIRouter()

ADMIN_ROLES = ("sysadmin", "super_admin", "superadmin", "admin", "principal")


# ─── Pydantic Schemas ──────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: Optional[str] = None
    first_name: str
    last_name: str
    phone: Optional[str] = None
    role: str = "staff"
    role_id: Optional[int] = None
    institution_id: Optional[int] = None
    student_id: Optional[int] = None
    staff_code: Optional[str] = None
    designation: Optional[str] = None
    scope_type: str = "institute"
    scope_id: Optional[int] = None
    send_invitation: bool = False


class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    role_id: Optional[int] = None
    student_id: Optional[int] = None
    staff_code: Optional[str] = None
    designation: Optional[str] = None
    scope_type: Optional[str] = None
    scope_id: Optional[int] = None
    is_active: Optional[bool] = None


class PasswordResetRequest(BaseModel):
    new_password: Optional[str] = None
    send_notification: bool = False


# ─── Helper Functions ─────────────────────────────────────────────────────────

async def resolve_scope_label(db: AsyncSession, scope_type: str, scope_id: Optional[int]) -> str:
    if scope_type == "institute" or not scope_id:
        return "Global Institute"
    if scope_type == "board":
        b = (await db.execute(select(Board).where(Board.id == scope_id))).scalar_one_or_none()
        return f"Board: {b.name}" if b else f"Board #{scope_id}"
    if scope_type == "standard":
        s = (await db.execute(select(Standard).where(Standard.id == scope_id))).scalar_one_or_none()
        return f"Class: {s.name}" if s else f"Class #{scope_id}"
    if scope_type == "batch":
        d = (await db.execute(select(Division).where(Division.id == scope_id))).scalar_one_or_none()
        return f"Batch: {d.name} ({d.code})" if d and d.code else (f"Batch: {d.name}" if d else f"Batch #{scope_id}")
    return "Global Institute"


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/me")
async def get_current_user_info(current_user: User = Depends(get_current_active_user)):
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "first_name": current_user.first_name,
        "last_name": current_user.last_name,
        "full_name": f"{current_user.first_name} {current_user.last_name}".strip(),
        "phone": current_user.phone,
        "role": current_user.role,
        "student_id": current_user.student_id,
        "institution_id": current_user.institution_id,
        "staff_code": current_user.staff_code,
        "designation": current_user.designation,
        "scope_type": current_user.scope_type,
        "scope_id": current_user.scope_id,
    }


@router.get("/stats")
async def get_user_management_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*ADMIN_ROLES)),
):
    """
    Returns high-level summary cards for the User Management Dashboard:
    Total accounts, Active, Inactive, Pending Invitations, and breakdown by role.
    """
    inst_id = current_user.institution_id or 1

    # Base query for counts
    base_q = select(User).where(or_(User.institution_id == inst_id, User.institution_id.is_(None)))

    all_users = (await db.execute(base_q)).scalars().all()
    total = len(all_users)
    active = sum(1 for u in all_users if u.is_active)
    inactive = total - active
    pending = sum(1 for u in all_users if getattr(u, "invitation_status", "accepted") == "pending")

    role_counts: Dict[str, int] = {}
    for u in all_users:
        r = u.role or "staff"
        role_counts[r] = role_counts.get(r, 0) + 1

    return {
        "total_accounts": total,
        "active_accounts": active,
        "inactive_accounts": inactive,
        "pending_invitations": pending,
        "roles_breakdown": role_counts,
    }


@router.get("/")
async def list_users(
    search: Optional[str] = Query(None, description="Search by name, username, email, phone, staff code, or admission number"),
    role: Optional[str] = Query(None, description="Filter by role"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status: active, inactive, pending"),
    academic_year_id: Optional[int] = Query(None),
    standard_id: Optional[int] = Query(None),
    division_id: Optional[int] = Query(None),
    sort_by: str = Query("created_at", regex="^(name|username|email|role|last_login|created_at)$"),
    sort_dir: str = Query("desc", regex="^(asc|desc)$"),
    page: int = Query(1, ge=1),
    limit: int = Query(15, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*ADMIN_ROLES)),
):
    """
    Paginated user directory with comprehensive search, multi-field filters,
    linked student/staff identification, and role-based access scope.
    """
    inst_id = current_user.institution_id or 1
    offset = (page - 1) * limit

    q = (
        select(User)
        .outerjoin(Student, User.student_id == Student.id)
        .where(or_(User.institution_id == inst_id, User.institution_id.is_(None)))
    )

    # Search filter
    if search:
        s = f"%{search.strip()}%"
        q = q.where(
            or_(
                User.first_name.ilike(s),
                User.last_name.ilike(s),
                User.username.ilike(s),
                User.email.ilike(s),
                User.phone.ilike(s),
                User.staff_code.ilike(s),
                Student.admission_number.ilike(s),
                Student.first_name.ilike(s),
                Student.last_name.ilike(s),
            )
        )

    # Role filter
    if role and role != "all":
        q = q.where(User.role == role.lower())

    # Status filter
    if status_filter:
        if status_filter.lower() == "active":
            q = q.where(User.is_active == True)
        elif status_filter.lower() == "inactive":
            q = q.where(User.is_active == False)
        elif status_filter.lower() == "pending":
            q = q.where(User.invitation_status == "pending")

    # Linked student class/batch/academic year filters
    if division_id or standard_id or academic_year_id:
        q = q.outerjoin(StudentEnrollment, StudentEnrollment.student_id == Student.id)
        if division_id:
            q = q.where(StudentEnrollment.division_id == division_id)
        if standard_id:
            q = q.where(StudentEnrollment.standard_id == standard_id)
        if academic_year_id:
            q = q.where(StudentEnrollment.academic_year_id == academic_year_id)

    # Total count
    count_q = select(func.count(func.distinct(User.id)))
    # Apply same joins and filters without order/limit
    count_q = (
        count_q
        .select_from(User)
        .outerjoin(Student, User.student_id == Student.id)
        .where(or_(User.institution_id == inst_id, User.institution_id.is_(None)))
    )
    if search:
        s = f"%{search.strip()}%"
        count_q = count_q.where(
            or_(
                User.first_name.ilike(s),
                User.last_name.ilike(s),
                User.username.ilike(s),
                User.email.ilike(s),
                User.phone.ilike(s),
                User.staff_code.ilike(s),
                Student.admission_number.ilike(s),
                Student.first_name.ilike(s),
                Student.last_name.ilike(s),
            )
        )
    if role and role != "all":
        count_q = count_q.where(User.role == role.lower())
    if status_filter:
        if status_filter.lower() == "active":
            count_q = count_q.where(User.is_active == True)
        elif status_filter.lower() == "inactive":
            count_q = count_q.where(User.is_active == False)
        elif status_filter.lower() == "pending":
            count_q = count_q.where(User.invitation_status == "pending")
    if division_id or standard_id or academic_year_id:
        count_q = count_q.outerjoin(StudentEnrollment, StudentEnrollment.student_id == Student.id)
        if division_id:
            count_q = count_q.where(StudentEnrollment.division_id == division_id)
        if standard_id:
            count_q = count_q.where(StudentEnrollment.standard_id == standard_id)
        if academic_year_id:
            count_q = count_q.where(StudentEnrollment.academic_year_id == academic_year_id)

    total_count = (await db.execute(count_q)).scalar() or 0

    # Sorting
    sort_column = User.created_at
    if sort_by == "name":
        sort_column = User.first_name
    elif sort_by == "username":
        sort_column = User.username
    elif sort_by == "email":
        sort_column = User.email
    elif sort_by == "role":
        sort_column = User.role
    elif sort_by == "last_login":
        sort_column = User.last_login

    q = q.order_by(asc(sort_column) if sort_dir == "asc" else desc(sort_column))
    q = q.distinct().offset(offset).limit(limit)

    users = (await db.execute(q)).scalars().all()

    # Preload linked data for presentation
    items = []
    for u in users:
        # Resolve linked person
        linked_person = None
        if u.student_id:
            stu = (await db.execute(select(Student).where(Student.id == u.student_id))).scalar_one_or_none()
            if stu:
                # Get current active enrollment
                enr = (
                    await db.execute(
                        select(StudentEnrollment, Standard.name, Division.name)
                        .outerjoin(Standard, StudentEnrollment.standard_id == Standard.id)
                        .outerjoin(Division, StudentEnrollment.division_id == Division.id)
                        .where(StudentEnrollment.student_id == stu.id)
                        .order_by(desc(StudentEnrollment.enrollment_date))
                    )
                ).first()
                std_name = enr[1] if enr else None
                div_name = enr[2] if enr else None

                linked_person = {
                    "type": "student",
                    "id": stu.id,
                    "name": f"{stu.first_name} {stu.last_name}".strip(),
                    "identifier": stu.admission_number,
                    "class_name": std_name,
                    "batch_name": div_name,
                }
        elif u.role in ("teacher", "staff", "coordinator", "principal") or u.staff_code:
            # Check divisions where class teacher
            teacher_batches = (
                await db.execute(select(Division.name, Division.code).where(Division.class_teacher_id == u.id))
            ).all()
            batch_names = [f"{b_name} ({b_code})" if b_code else b_name for b_name, b_code in teacher_batches]

            linked_person = {
                "type": "staff",
                "id": u.id,
                "name": f"{u.first_name} {u.last_name}".strip(),
                "identifier": u.staff_code or f"STAFF-{u.id}",
                "designation": u.designation or u.role.capitalize(),
                "assigned_batches": batch_names,
            }

        # Resolve access scope
        scope_lbl = await resolve_scope_label(db, u.scope_type, u.scope_id)

        items.append({
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "phone": u.phone,
            "first_name": u.first_name,
            "last_name": u.last_name,
            "full_name": f"{u.first_name} {u.last_name}".strip(),
            "role": u.role,
            "is_active": u.is_active,
            "invitation_status": getattr(u, "invitation_status", "accepted"),
            "scope_type": u.scope_type,
            "scope_id": u.scope_id,
            "scope_label": scope_lbl,
            "staff_code": u.staff_code,
            "designation": u.designation,
            "last_login": u.last_login.isoformat() if u.last_login else None,
            "created_at": u.created_at.isoformat() if u.created_at else None,
            "linked_person": linked_person,
        })

    total_pages = (total_count + limit - 1) // limit if limit > 0 else 1

    return {
        "items": items,
        "total": total_count,
        "page": page,
        "limit": limit,
        "pages": total_pages,
    }


@router.get("/{user_id}")
async def get_user_profile_workspace(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Dedicated User Profile Workspace Endpoint.
    Returns complete account data, linked records, role permissions,
    and tab-specific data (Academic, Attendance, Exams, Fees, Activity Log).
    Restricted: Admin roles can view any profile; regular users can only view their own.
    """
    if current_user.role not in ADMIN_ROLES and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Access denied to view this user profile")

    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User account not found")

    # 1. Role & Permissions
    role_obj = None
    if user.role_id:
        role_obj = (await db.execute(select(Role).where(Role.id == user.role_id))).scalar_one_or_none()
    if not role_obj:
        role_obj = (await db.execute(select(Role).where(func.lower(Role.name) == func.lower(user.role)))).scalar_one_or_none()

    permissions = []
    if role_obj:
        perms = (await db.execute(select(Permission).where(Permission.role_id == role_obj.id))).scalars().all()
        permissions = [{"resource": p.resource, "action": p.action} for p in perms]

    scope_label = await resolve_scope_label(db, user.scope_type, user.scope_id)

    # 2. Linked Person Data
    linked_student = None
    academic_data = {"enrollments": [], "assigned_batches": []}
    attendance_data = {"summary": None, "records": []}
    exam_data = {"results": []}
    fee_data = None
    permitted_tabs = ["overview", "profile", "access", "activity"]

    # Student Link Handling
    if user.student_id:
        stu = (await db.execute(select(Student).where(Student.id == user.student_id))).scalar_one_or_none()
        if stu:
            permitted_tabs = ["overview", "profile", "access", "academic", "attendance", "examinations", "activity"]

            # Academic Enrollments
            enrs = (
                await db.execute(
                    select(StudentEnrollment, Standard.name, Board.name, Division.name, AcademicYear.name)
                    .outerjoin(Standard, StudentEnrollment.standard_id == Standard.id)
                    .outerjoin(Division, StudentEnrollment.division_id == Division.id)
                    .outerjoin(Board, Division.board_id == Board.id)
                    .outerjoin(AcademicYear, StudentEnrollment.academic_year_id == AcademicYear.id)
                    .where(StudentEnrollment.student_id == stu.id)
                    .order_by(desc(StudentEnrollment.enrollment_date))
                )
            ).all()

            enrollment_list = []
            for enr, std_name, brd_name, div_name, ay_name in enrs:
                enrollment_list.append({
                    "id": enr.id,
                    "academic_year": ay_name or "Current",
                    "standard_name": std_name or "—",
                    "board_name": brd_name or "—",
                    "batch_name": div_name or "—",
                    "roll_number": enr.roll_number,
                    "enrollment_date": str(enr.enrollment_date) if enr.enrollment_date else None,
                    "status": enr.status,
                })
            academic_data["enrollments"] = enrollment_list

            linked_student = {
                "id": stu.id,
                "admission_number": stu.admission_number,
                "first_name": stu.first_name,
                "last_name": stu.last_name,
                "full_name": f"{stu.first_name} {stu.last_name}".strip(),
                "date_of_birth": str(stu.date_of_birth),
                "gender": stu.gender,
                "blood_group": stu.blood_group,
                "phone": stu.phone,
                "email": stu.email,
                "address": stu.address,
                "city": stu.city,
                "is_active": stu.is_active,
                "current_enrollment": enrollment_list[0] if enrollment_list else None,
            }

            # Attendance Data
            att_rows = (
                await db.execute(
                    select(Attendance)
                    .where(Attendance.student_id == stu.id)
                    .order_by(desc(Attendance.date))
                    .limit(30)
                )
            ).scalars().all()

            total_days = len(att_rows)
            present_days = sum(1 for a in att_rows if a.status == "present")
            absent_days = sum(1 for a in att_rows if a.status == "absent")
            late_days = sum(1 for a in att_rows if a.status == "late")
            rate = round((present_days / total_days * 100), 1) if total_days > 0 else 100.0

            attendance_data = {
                "summary": {
                    "total_days": total_days,
                    "present_days": present_days,
                    "absent_days": absent_days,
                    "late_days": late_days,
                    "rate_percentage": rate,
                },
                "records": [
                    {
                        "id": a.id,
                        "date": str(a.date),
                        "status": a.status,
                        "remarks": a.remarks or "",
                    }
                    for a in att_rows
                ],
            }

            # Examinations Data
            marks_rows = (
                await db.execute(
                    select(ExamMark, Examination.name, Examination.max_marks)
                    .join(Examination, ExamMark.examination_id == Examination.id)
                    .where(ExamMark.student_id == stu.id)
                    .order_by(desc(Examination.start_date))
                )
            ).all()

            exam_results = []
            for mark, ex_name, max_m in marks_rows:
                pct = round((float(mark.marks_obtained) / float(max_m) * 100), 1) if max_m and mark.marks_obtained is not None else 0.0
                exam_results.append({
                    "id": mark.id,
                    "exam_name": ex_name,
                    "marks_obtained": float(mark.marks_obtained) if mark.marks_obtained is not None else 0,
                    "max_marks": float(max_m) if max_m else 100,
                    "percentage": pct,
                    "grade": mark.grade or "",
                    "remarks": mark.remarks or "",
                })
            exam_data["results"] = exam_results

            # Fee Permissions check
            if current_user.role in ("super_admin", "superadmin", "admin", "accountant", "principal") or current_user.id == user_id:
                permitted_tabs.append("fees")
                invoices = (
                    await db.execute(
                        select(FeeInvoice).where(FeeInvoice.student_id == stu.id).order_by(desc(FeeInvoice.created_at))
                    )
                ).scalars().all()

                payments = (
                    await db.execute(
                        select(Payment).where(Payment.student_id == stu.id).order_by(desc(Payment.payment_date))
                    )
                ).scalars().all()

                total_fees = sum(float(inv.total_amount) for inv in invoices)
                total_paid = sum(float(p.amount) for p in payments if p.status == "completed")
                balance = max(0.0, total_fees - total_paid)

                fee_data = {
                    "total_fees": total_fees,
                    "total_paid": total_paid,
                    "outstanding_balance": balance,
                    "invoices": [
                        {
                            "id": inv.id,
                            "invoice_number": inv.invoice_number,
                            "total_amount": float(inv.total_amount),
                            "paid_amount": float(inv.paid_amount),
                            "status": inv.status,
                            "due_date": str(inv.due_date) if inv.due_date else None,
                        }
                        for inv in invoices
                    ],
                    "payments": [
                        {
                            "id": p.id,
                            "amount": float(p.amount),
                            "payment_date": str(p.payment_date),
                            "payment_method": p.payment_method,
                            "transaction_reference": p.transaction_reference,
                            "status": p.status,
                        }
                        for p in payments
                    ],
                }

    # Staff / Teacher Handling
    elif user.role in ("teacher", "staff", "coordinator", "principal") or user.staff_code:
        permitted_tabs = ["overview", "profile", "access", "academic", "activity"]
        divisions = (
            await db.execute(
                select(Division, Standard.name, Board.name)
                .join(Standard, Division.standard_id == Standard.id)
                .outerjoin(Board, Division.board_id == Board.id)
                .where(Division.class_teacher_id == user.id)
            )
        ).all()

        assigned_list = []
        for d, std_name, brd_name in divisions:
            assigned_list.append({
                "id": d.id,
                "batch_name": d.name,
                "batch_code": d.code,
                "standard_name": std_name,
                "board_name": brd_name,
                "room_number": d.room_number,
                "schedule_timing": d.schedule_timing,
                "capacity": d.capacity,
            })
        academic_data["assigned_batches"] = assigned_list

    # 3. Activity / Audit Log (Security audit logs excluded for non-sysadmins)
    log_filters = [
        or_(
            and_(AuditLog.resource_type == "user", AuditLog.resource_id == user.id),
            AuditLog.user_id == user.id,
        )
    ]
    if current_user.role not in ("sysadmin", "superadmin", "super_admin"):
        log_filters.append(AuditLog.is_system_audit == False)

    logs = (
        await db.execute(
            select(AuditLog)
            .where(and_(*log_filters))
            .order_by(desc(AuditLog.created_at))
            .limit(40)
        )
    ).scalars().all()

    activity_logs = [
        {
            "id": l.id,
            "action": l.action,
            "resource_type": l.resource_type,
            "resource_id": l.resource_id,
            "new_data": l.new_data,
            "old_data": l.old_data,
            "created_at": l.created_at.isoformat() if l.created_at else None,
        }
        for l in logs
    ]

    return {
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "phone": user.phone,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "full_name": f"{user.first_name} {user.last_name}".strip(),
            "role": user.role,
            "role_description": role_obj.description if role_obj else user.role.capitalize(),
            "is_active": user.is_active,
            "invitation_status": getattr(user, "invitation_status", "accepted"),
            "invitation_sent_at": user.invitation_sent_at.isoformat() if user.invitation_sent_at else None,
            "scope_type": user.scope_type,
            "scope_id": user.scope_id,
            "scope_label": scope_label,
            "staff_code": user.staff_code,
            "designation": user.designation,
            "student_id": user.student_id,
            "last_login": user.last_login.isoformat() if user.last_login else None,
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "updated_at": user.updated_at.isoformat() if user.updated_at else None,
        },
        "permissions": permissions,
        "linked_student": linked_student,
        "academic": academic_data,
        "attendance": attendance_data,
        "examinations": exam_data,
        "fees": fee_data,
        "activity_logs": activity_logs,
        "permitted_tabs": permitted_tabs,
    }


@router.post("/", status_code=201)
async def create_user(
    data: UserCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*ADMIN_ROLES)),
):
    """
    Creates a new user account with explicit student or staff linkage,
    scoped access permissions, and audit logging.
    """
    # Check username / email uniqueness
    existing = await db.execute(
        select(User).where(or_(User.username == data.username, User.email == data.email))
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Username or email already exists")

    # If password not provided, generate random secure password
    pwd = data.password
    if not pwd:
        pwd = "".join(secrets.choice(string.ascii_letters + string.digits) for _ in range(12))

    hashed = get_password_hash(pwd)
    invitation_status = "pending" if data.send_invitation else "accepted"
    invitation_sent_at = datetime.now() if data.send_invitation else None

    # Resolve role_id if not given
    role_id = data.role_id
    if not role_id:
        r_obj = (await db.execute(select(Role).where(func.lower(Role.name) == func.lower(data.role)))).scalar_one_or_none()
        if r_obj:
            role_id = r_obj.id

    new_user = User(
        institution_id=data.institution_id or current_user.institution_id or 1,
        username=data.username.strip(),
        email=data.email.strip().lower(),
        hashed_password=hashed,
        first_name=data.first_name.strip(),
        last_name=data.last_name.strip(),
        phone=data.phone,
        role=data.role.lower(),
        role_id=role_id,
        student_id=data.student_id,
        staff_code=data.staff_code,
        designation=data.designation,
        scope_type=data.scope_type or "institute",
        scope_id=data.scope_id,
        invitation_status=invitation_status,
        invitation_sent_at=invitation_sent_at,
        is_active=True,
    )
    db.add(new_user)
    await db.flush()

    # Record Audit Log
    audit = AuditLog(
        user_id=current_user.id,
        action="create_user",
        resource_type="user",
        resource_id=new_user.id,
        new_data=json.dumps({
            "username": new_user.username,
            "email": new_user.email,
            "role": new_user.role,
            "student_id": new_user.student_id,
            "staff_code": new_user.staff_code,
            "scope_type": new_user.scope_type,
            "scope_id": new_user.scope_id,
            "invitation_status": new_user.invitation_status,
        }),
    )
    db.add(audit)
    await db.commit()
    await db.refresh(new_user)

    return {
        "id": new_user.id,
        "username": new_user.username,
        "role": new_user.role,
        "invitation_status": new_user.invitation_status,
        "message": "User account created successfully",
    }


@router.put("/{user_id}")
async def update_user(
    user_id: int,
    data: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*ADMIN_ROLES)),
):
    """
    Updates user personal details, contact, role, access scope, and linked student/staff.
    Audits all before/after changes.
    """
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User account not found")

    old_state = {
        "first_name": user.first_name,
        "last_name": user.last_name,
        "email": user.email,
        "phone": user.phone,
        "role": user.role,
        "staff_code": user.staff_code,
        "designation": user.designation,
        "scope_type": user.scope_type,
        "scope_id": user.scope_id,
        "student_id": user.student_id,
        "is_active": user.is_active,
    }

    # Email uniqueness check if changing email
    if data.email and data.email.lower() != user.email.lower():
        existing = await db.execute(
            select(User).where(User.email == data.email.lower(), User.id != user_id)
        )
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Email is already used by another account")
        user.email = data.email.lower()

    if data.first_name is not None:
        user.first_name = data.first_name.strip()
    if data.last_name is not None:
        user.last_name = data.last_name.strip()
    if data.phone is not None:
        user.phone = data.phone.strip() if data.phone else None
    if data.role is not None:
        user.role = data.role.lower()
        # Update role_id
        r_obj = (await db.execute(select(Role).where(func.lower(Role.name) == func.lower(data.role)))).scalar_one_or_none()
        if r_obj:
            user.role_id = r_obj.id
    if data.role_id is not None:
        user.role_id = data.role_id
    if data.student_id is not None:
        user.student_id = data.student_id if data.student_id > 0 else None
    if data.staff_code is not None:
        user.staff_code = data.staff_code.strip() if data.staff_code else None
    if data.designation is not None:
        user.designation = data.designation.strip() if data.designation else None
    if data.scope_type is not None:
        user.scope_type = data.scope_type
    if data.scope_id is not None:
        user.scope_id = data.scope_id if data.scope_id > 0 else None
    if data.is_active is not None:
        if data.is_active is False and user.is_active and user.role in ("sysadmin", "superadmin", "super_admin"):
            super_count = (
                await db.execute(
                    select(func.count(User.id)).where(User.role.in_(["sysadmin", "superadmin", "super_admin"]), User.is_active == True)
                )
            ).scalar() or 0
            if super_count <= 1:
                raise HTTPException(status_code=400, detail="Cannot deactivate the last remaining active System Administrator")
        user.is_active = data.is_active

    # Audit log
    audit = AuditLog(
        user_id=current_user.id,
        action="update_user",
        resource_type="user",
        resource_id=user.id,
        old_data=json.dumps(old_state),
        new_data=json.dumps({
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email": user.email,
            "phone": user.phone,
            "role": user.role,
            "staff_code": user.staff_code,
            "designation": user.designation,
            "scope_type": user.scope_type,
            "scope_id": user.scope_id,
            "student_id": user.student_id,
            "is_active": user.is_active,
        }),
    )
    db.add(audit)
    await db.commit()

    return {"message": "User profile updated successfully", "id": user_id}


@router.post("/{user_id}/reset-password")
async def reset_user_password(
    user_id: int,
    req: PasswordResetRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*ADMIN_ROLES)),
):
    """
    Resets account password with audit logging.
    If new_password is not specified, generates a secure 12-char random temporary password.
    """
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User account not found")

    pwd = req.new_password
    generated = False
    if not pwd:
        pwd = "".join(secrets.choice(string.ascii_letters + string.digits) for _ in range(12))
        generated = True

    user.hashed_password = get_password_hash(pwd)

    audit = AuditLog(
        user_id=current_user.id,
        action="reset_password",
        resource_type="user",
        resource_id=user.id,
        new_data=f"Password reset by {current_user.username}. Generated: {generated}",
    )
    db.add(audit)
    await db.commit()

    response_payload = {
        "success": True,
        "message": "Password reset successfully",
        "temporary_password": pwd if generated else None,
    }
    return response_payload


@router.post("/{user_id}/toggle-status")
async def toggle_user_status(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*ADMIN_ROLES)),
):
    """
    Activates or deactivates a user account.
    Safety: Prevents users from deactivating their own account.
    """
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="You cannot deactivate your own active account")

    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User account not found")

    if user.is_active and user.role in ("sysadmin", "superadmin", "super_admin"):
        super_count = (
            await db.execute(
                select(func.count(User.id)).where(User.role.in_(["sysadmin", "superadmin", "super_admin"]), User.is_active == True)
            )
        ).scalar() or 0
        if super_count <= 1:
            raise HTTPException(status_code=400, detail="Cannot deactivate the last remaining active System Administrator")

    old_status = user.is_active
    user.is_active = not old_status

    audit = AuditLog(
        user_id=current_user.id,
        action="activate_user" if user.is_active else "deactivate_user",
        resource_type="user",
        resource_id=user.id,
        new_data=f"Account status changed from {old_status} to {user.is_active}",
    )
    db.add(audit)
    await db.commit()

    return {
        "id": user.id,
        "is_active": user.is_active,
        "message": f"Account has been {'activated' if user.is_active else 'deactivated'} successfully",
    }


@router.post("/{user_id}/resend-invitation")
async def resend_user_invitation(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*ADMIN_ROLES)),
):
    """
    Resends account activation invitation email/notification.
    Sets invitation_status to 'pending' and records timestamp.
    """
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User account not found")

    user.invitation_status = "pending"
    user.invitation_sent_at = datetime.now()

    audit = AuditLog(
        user_id=current_user.id,
        action="resend_invitation",
        resource_type="user",
        resource_id=user.id,
        new_data=f"Invitation re-sent to {user.email}",
    )
    db.add(audit)
    await db.commit()

    return {
        "success": True,
        "message": f"Invitation re-sent to {user.email}",
        "invitation_sent_at": user.invitation_sent_at.isoformat(),
    }


@router.delete("/{user_id}")
async def delete_user(
    user_id: int,
    permanent: bool = Query(False, description="If true, permanently delete record; otherwise deactivate"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*ADMIN_ROLES)),
):
    """
    Deactivates or permanently deletes a user account with confirmation checks.
    Safety: Cannot delete self. Cannot delete sole active superadmin.
    """
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="You cannot delete your own account")

    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.role in ("sysadmin", "super_admin", "superadmin"):
        super_count = (
            await db.execute(
                select(func.count(User.id)).where(User.role.in_(["sysadmin", "super_admin", "superadmin"]), User.is_active == True)
            )
        ).scalar() or 0
        if super_count <= 1:
            raise HTTPException(status_code=400, detail="Cannot delete the last remaining active System Administrator")

    if permanent:
        # Unlink divisions where class teacher
        divs = (await db.execute(select(Division).where(Division.class_teacher_id == user_id))).scalars().all()
        for d in divs:
            d.class_teacher_id = None

        audit = AuditLog(
            user_id=current_user.id,
            action="permanent_delete_user",
            resource_type="user",
            resource_id=user.id,
            old_data=f"User {user.username} permanently deleted",
        )
        db.add(audit)
        await db.delete(user)
        await db.commit()
        return {"message": f"User {user.username} was permanently deleted"}
    else:
        user.is_active = False
        audit = AuditLog(
            user_id=current_user.id,
            action="deactivate_user",
            resource_type="user",
            resource_id=user.id,
            old_data=f"User {user.username} deactivated",
        )
        db.add(audit)
        await db.commit()
        return {"message": f"User {user.username} deactivated"}
