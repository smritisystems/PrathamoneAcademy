# /**
#  * @file        staff.py
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
#  * @description Comprehensive API endpoints for Teacher & Staff Management, assignments, attendance, leaves, and documents.
#  */

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc, text
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
from datetime import datetime, date
from decimal import Decimal
import json
import secrets

from app.core.database import get_db
from app.core.deps import (
    get_current_active_user,
    require_role,
    is_sysadmin,
    enforce_institution_access,
    check_institution_access,
)
from app.core.security import get_password_hash
from app.models.user import User, Role, Permission, AuditLog
from app.models.staff import (
    StaffProfile,
    StaffDocument,
    TeacherAssignment,
    StaffAttendance,
    StaffLeave,
    StaffLeaveBalance,
    StaffGeneratedDocument,
    StaffBankAccount,
    StaffKeyContact,
    StaffAddress,
    StaffEmploymentHistory,
)
from app.models.academic_year import AcademicYear
from app.models.board import Board
from app.models.standard import Standard
from app.models.division import Division
from app.models.subject import Subject, SubjectMapping
from app.models.institution import Institution
from app.services.workforce_service import (
    get_teacher_workforce_dashboard,
    get_staff_workforce_dashboard,
    update_employee_lifecycle,
    get_employee_activity_history,
)

router = APIRouter()

STAFF_ADMIN_ROLES = ("sysadmin", "superadmin", "super_admin", "admin", "principal")
FINANCIAL_ROLES = ("sysadmin", "superadmin", "super_admin", "admin", "accountant")


# ─── Pydantic Schemas ──────────────────────────────────────────────────────────

class LifecycleUpdateRequest(BaseModel):
    action: str  # activate | put_on_leave | deactivate | resign | terminate | end_contract | rehire
    effective_date: date
    reason: Optional[str] = None
    notes: Optional[str] = None
    rehire_eligible: Optional[bool] = True


class StaffCreateRequest(BaseModel):
    username: str
    email: str
    password: Optional[str] = None
    first_name: str
    last_name: str
    phone: Optional[str] = None
    role: str = "teacher"  # teacher, staff, accountant, admin
    staff_type: str = "Teacher"  # Teacher, Admin, Accountant, Counselor, Receptionist, Other
    department: Optional[str] = "Teaching & Academics"
    gender: Optional[str] = "male"
    date_of_birth: Optional[date] = None
    blood_group: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    emergency_contact_relation: Optional[str] = None
    current_address: Optional[str] = None
    permanent_address: Optional[str] = None
    city: Optional[str] = "Mumbai"
    state: Optional[str] = "Maharashtra"
    pincode: Optional[str] = "400001"
    qualification: Optional[str] = None
    specialization: Optional[str] = None
    experience_years: Optional[float] = 0.0
    joining_date: Optional[date] = None
    employment_type: Optional[str] = "full_time"
    basic_salary: Optional[float] = 0.0
    pan_number: Optional[str] = None
    aadhar_number: Optional[str] = None
    bank_name: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_ifsc: Optional[str] = None
    notes: Optional[str] = None
    reporting_manager_id: Optional[int] = None
    responsibilities: Optional[str] = None


class StaffUpdateRequest(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    staff_type: Optional[str] = None
    gender: Optional[str] = None
    date_of_birth: Optional[date] = None
    blood_group: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    emergency_contact_relation: Optional[str] = None
    current_address: Optional[str] = None
    permanent_address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    qualification: Optional[str] = None
    specialization: Optional[str] = None
    experience_years: Optional[float] = None
    employment_type: Optional[str] = None
    basic_salary: Optional[float] = None
    pan_number: Optional[str] = None
    aadhar_number: Optional[str] = None
    bank_name: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_ifsc: Optional[str] = None
    notes: Optional[str] = None
    reporting_manager_id: Optional[int] = None
    responsibilities: Optional[str] = None


class StaffBankAccountCreateRequest(BaseModel):
    account_holder_name: str
    bank_name: str
    account_number: str
    ifsc_code: str
    branch_name: Optional[str] = None
    account_type: str = "salary"  # salary, savings, reimbursement, current
    is_primary: bool = False
    is_verified: bool = False
    is_active: bool = True


class StaffKeyContactCreateRequest(BaseModel):
    contact_name: str
    relationship: str
    phone_primary: str
    phone_secondary: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    is_primary_emergency: bool = False
    is_nominee: bool = False
    is_active: bool = True
    priority: int = 1


class StaffAddressCreateRequest(BaseModel):
    address_type: str = "current"  # current, permanent, alternate, communication, native
    address_line: str
    city: Optional[str] = "Mumbai"
    state: Optional[str] = "Maharashtra"
    pincode: Optional[str] = "400001"
    country: Optional[str] = "India"
    is_primary: bool = False
    is_active: bool = True


class TeacherAssignmentCreateRequest(BaseModel):
    teacher_user_id: int
    academic_year_id: int
    board_id: int
    standard_id: int
    division_id: int
    subject_id: int
    weekly_hours: Optional[float] = 4.0
    is_class_teacher: Optional[bool] = False
    notes: Optional[str] = None


class StaffAttendanceMarkItem(BaseModel):
    user_id: int
    status: str = "present"  # present, absent, late, half_day, on_leave
    check_in_time: Optional[str] = None
    check_out_time: Optional[str] = None
    hours_worked: Optional[float] = 8.0
    remarks: Optional[str] = None


class StaffAttendanceBulkMarkRequest(BaseModel):
    date: date
    records: List[StaffAttendanceMarkItem]


class StaffLeaveApplyRequest(BaseModel):
    leave_type: str  # casual, sick, earned, maternity, unpaid
    start_date: date
    end_date: date
    days_count: Optional[float] = 1.0
    reason: str


class StaffLeaveActionRequest(BaseModel):
    action: str = "approve"  # approve, reject
    action_remarks: Optional[str] = None


# ─── 1. Staff Directory Endpoints ─────────────────────────────────────────────

@router.get("/")
async def list_staff_members(
    search: Optional[str] = Query(None, description="Search by name, employee ID, email, phone, or specialization"),
    staff_type: Optional[str] = Query(None, description="Filter by staff type: Teacher, Admin, Accountant, Counselor, Receptionist"),
    department: Optional[str] = Query(None, description="Filter by department"),
    employment_type: Optional[str] = Query(None, description="full_time, part_time, visiting, contract"),
    status: Optional[str] = Query(None, description="active, on_leave, resigned, inactive"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    effective_inst_id: int = Depends(enforce_institution_access),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Returns paginated directory of faculty and staff with full filtering and workload aggregation.
    """
    conditions = [
        User.role.in_(["teacher", "staff", "accountant", "admin", "principal", "sysadmin"]),
        StaffProfile.institution_id == effective_inst_id,
    ]

    if status:
        conditions.append(StaffProfile.status == status)
    else:
        # Default to active staff unless specified
        conditions.append(StaffProfile.status.in_(["active", "on_leave"]))

    if staff_type:
        conditions.append(StaffProfile.staff_type == staff_type)
    if department:
        conditions.append(StaffProfile.department == department)
    if employment_type:
        conditions.append(StaffProfile.employment_type == employment_type)

    if search:
        search_fmt = f"%{search.strip()}%"
        conditions.append(
            or_(
                User.first_name.ilike(search_fmt),
                User.last_name.ilike(search_fmt),
                User.email.ilike(search_fmt),
                User.phone.ilike(search_fmt),
                StaffProfile.employee_id.ilike(search_fmt),
                StaffProfile.specialization.ilike(search_fmt),
                StaffProfile.qualification.ilike(search_fmt),
            )
        )

    where_clause = and_(*conditions)

    # Count
    total = (
        await db.execute(
            select(func.count(StaffProfile.id))
            .join(User, StaffProfile.user_id == User.id)
            .where(where_clause)
        )
    ).scalar() or 0

    # Query items
    query = (
        select(StaffProfile, User)
        .join(User, StaffProfile.user_id == User.id)
        .where(where_clause)
        .order_by(StaffProfile.employee_id.asc())
        .offset((page - 1) * limit)
        .limit(limit)
    )
    results = (await db.execute(query)).all()

    items = []
    can_view_salary = current_user.role in FINANCIAL_ROLES

    for prof, u in results:
        # Calculate teaching assignments count and total hours
        workload = (
            await db.execute(
                select(
                    func.count(TeacherAssignment.id),
                    func.coalesce(func.sum(TeacherAssignment.weekly_hours), 0)
                ).where(
                    TeacherAssignment.teacher_user_id == u.id,
                    TeacherAssignment.is_active == True,
                )
            )
        ).first()
        assignments_count = workload[0] if workload else 0
        total_weekly_hours = float(workload[1]) if workload else 0.0

        items.append({
            "profile_id": prof.id,
            "user_id": u.id,
            "employee_id": prof.employee_id,
            "first_name": u.first_name,
            "last_name": u.last_name,
            "full_name": f"{u.first_name} {u.last_name}",
            "username": u.username,
            "email": u.email,
            "phone": u.phone,
            "role": u.role,
            "staff_type": prof.staff_type,
            "department": prof.department,
            "qualification": prof.qualification,
            "specialization": prof.specialization,
            "experience_years": prof.experience_years,
            "employment_type": prof.employment_type,
            "joining_date": prof.joining_date.isoformat() if prof.joining_date else None,
            "status": prof.status,
            "is_active": u.is_active,
            "profile_photo_url": prof.profile_photo_url,
            "basic_salary": float(prof.basic_salary) if can_view_salary else None,
            "assignments_count": assignments_count,
            "total_weekly_hours": total_weekly_hours,
        })

    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit if limit > 0 else 1,
    }


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_staff_member(
    data: StaffCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*STAFF_ADMIN_ROLES)),
):
    """
    Creates a new faculty or staff member account, profile, and default leave balance.
    """
    # 1. Check duplicate username or email
    existing = (
        await db.execute(
            select(User).where(or_(User.username == data.username, User.email == data.email))
        )
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Username or Email already registered in system")

    # 2. Determine target institution ID
    user_inst_id = getattr(current_user, "institution_id", None) or 1

    # 3. Generate Next Employee ID (e.g. TCH-005, STF-001)
    prefix = "TCH" if data.staff_type == "Teacher" else ("ACC" if data.staff_type == "Accountant" else "STF")
    count_existing = (
        await db.execute(
            select(func.count(StaffProfile.id)).where(StaffProfile.employee_id.like(f"{prefix}-%"))
        )
    ).scalar() or 0
    employee_id = f"{prefix}-{count_existing + 1:03d}"

    # 4. Find matching Role ID (safely falling back to 'staff' if role is not recognized)
    target_role = (data.role or "staff").strip().lower()
    role_obj = (
        await db.execute(select(Role).where(Role.name == target_role))
    ).scalar_one_or_none()
    if not role_obj:
        role_obj = (
            await db.execute(select(Role).where(Role.name == "staff"))
        ).scalar_one_or_none()
    if not role_obj:
        role_obj = Role(name="staff", description="Staff Member")
        db.add(role_obj)
        await db.flush()
    role_id = role_obj.id
    actual_role_name = role_obj.name

    # 5. Generate secure random temporary credentials if password omitted
    temp_password = data.password.strip() if (data.password and data.password.strip()) else secrets.token_urlsafe(10)

    # 6. Create User
    new_user = User(
        institution_id=user_inst_id,
        username=data.username.strip().lower(),
        email=data.email.strip().lower(),
        hashed_password=get_password_hash(temp_password),
        first_name=data.first_name.strip(),
        last_name=data.last_name.strip(),
        phone=data.phone,
        role=actual_role_name,
        role_id=role_id,
        scope_type="institute",
        staff_code=employee_id,
        designation=f"{data.staff_type} - {data.department or 'General'}",
        is_active=True,
    )
    db.add(new_user)
    await db.flush()

    # 7. Create Staff Profile
    profile = StaffProfile(
        user_id=new_user.id,
        institution_id=user_inst_id,
        employee_id=employee_id,
        staff_type=data.staff_type,
        department=data.department or "Academics",
        gender=data.gender or "male",
        date_of_birth=data.date_of_birth,
        blood_group=data.blood_group,
        emergency_contact_name=data.emergency_contact_name,
        emergency_contact_phone=data.emergency_contact_phone,
        emergency_contact_relation=data.emergency_contact_relation,
        current_address=data.current_address,
        permanent_address=data.permanent_address,
        city=data.city or "Mumbai",
        state=data.state or "Maharashtra",
        pincode=data.pincode or "400001",
        qualification=data.qualification,
        specialization=data.specialization,
        experience_years=data.experience_years or 0.0,
        joining_date=data.joining_date or date.today(),
        employment_type=data.employment_type or "full_time",
        basic_salary=Decimal(str(data.basic_salary or 0.0)),
        pan_number=data.pan_number,
        aadhar_number=data.aadhar_number,
        bank_name=data.bank_name,
        bank_account_number=data.bank_account_number,
        bank_ifsc=data.bank_ifsc,
        status="active",
        notes=data.notes,
    )
    db.add(profile)

    # 8. Initialize Leave Balance
    ay_res = await db.execute(
        select(AcademicYear.id).where(
            and_(
                AcademicYear.institution_id == user_inst_id,
                AcademicYear.is_active == True,
            )
        ).order_by(AcademicYear.is_current.desc(), AcademicYear.id.desc()).limit(1)
    )
    ay_id = ay_res.scalars().first()

    if not ay_id:
        ay_fallback_res = await db.execute(
            select(AcademicYear.id).where(AcademicYear.is_active == True).order_by(AcademicYear.is_current.desc()).limit(1)
        )
        ay_id = ay_fallback_res.scalars().first()

    if ay_id:
        leave_bal = StaffLeaveBalance(
            user_id=new_user.id,
            academic_year_id=ay_id,
            casual_leave_total=12.0,
            casual_leave_used=0.0,
            sick_leave_total=10.0,
            sick_leave_used=0.0,
            earned_leave_total=15.0,
            earned_leave_used=0.0,
        )
        db.add(leave_bal)

    await db.commit()
    await db.refresh(profile)

    return {
        "success": True,
        "message": f"Staff profile created for {new_user.first_name} {new_user.last_name}",
        "user_id": new_user.id,
        "employee_id": employee_id,
        "username": new_user.username,
        "temporary_password": temp_password,
    }


@router.get("/{user_id}")
async def get_staff_profile(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Retrieves complete staff profile with personal, emergency, qualification, assignment, and document history.
    """
    # Permission: SysAdmin, Admin, Principal, Accountant, or Self
    is_self = current_user.id == user_id
    if not (is_self or current_user.role in STAFF_ADMIN_ROLES or current_user.role in FINANCIAL_ROLES):
        raise HTTPException(status_code=403, detail="Insufficient permissions to access staff profile")

    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    profile = (await db.execute(select(StaffProfile).where(StaffProfile.user_id == user_id))).scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Staff profile not found for this user")

    if not is_self:
        check_institution_access(profile.institution_id, current_user)

    # Assignments with Board and Batch Code disambiguation
    assignments_res = await db.execute(
        select(TeacherAssignment, Standard.name, Division.name, Division.code, Subject.name, Board.name)
        .join(Standard, TeacherAssignment.standard_id == Standard.id)
        .join(Division, TeacherAssignment.division_id == Division.id)
        .join(Subject, TeacherAssignment.subject_id == Subject.id)
        .join(Board, TeacherAssignment.board_id == Board.id)
        .where(TeacherAssignment.teacher_user_id == user_id, TeacherAssignment.is_active == True)
    )
    assignments = []
    for a, std_name, div_name, div_code, sub_name, brd_name in assignments_res.all():
        assignments.append({
            "id": a.id,
            "board_id": a.board_id,
            "board": brd_name,
            "standard_id": a.standard_id,
            "standard": std_name,
            "division_id": a.division_id,
            "batch": div_name,
            "batch_code": div_code,
            "subject_id": a.subject_id,
            "subject": sub_name,
            "weekly_hours": a.weekly_hours,
            "is_class_teacher": a.is_class_teacher,
            "notes": a.notes,
        })

    # Leave balances
    bal = (await db.execute(select(StaffLeaveBalance).where(StaffLeaveBalance.user_id == user_id))).scalar_one_or_none()

    # Bank accounts
    bank_accs = (
        await db.execute(
            select(StaffBankAccount)
            .where(StaffBankAccount.staff_profile_id == profile.id)
            .order_by(desc(StaffBankAccount.is_primary), desc(StaffBankAccount.id))
        )
    ).scalars().all()

    # Key contacts
    contacts = (
        await db.execute(
            select(StaffKeyContact)
            .where(StaffKeyContact.staff_profile_id == profile.id)
            .order_by(desc(StaffKeyContact.is_primary_emergency), desc(StaffKeyContact.id))
        )
    ).scalars().all()

    # Addresses
    addresses_res = await db.execute(
        select(StaffAddress)
        .where(StaffAddress.staff_profile_id == profile.id)
        .order_by(desc(StaffAddress.is_primary), desc(StaffAddress.id))
    )
    addresses = addresses_res.scalars().all()

    # Employment History
    hist_res = await db.execute(
        select(StaffEmploymentHistory)
        .where(StaffEmploymentHistory.staff_profile_id == profile.id)
        .order_by(desc(StaffEmploymentHistory.effective_date), desc(StaffEmploymentHistory.id))
    )
    emp_histories = hist_res.scalars().all()

    # Reporting Manager
    reporting_mgr = None
    if profile.reporting_manager_id:
        reporting_mgr = (await db.execute(select(User).where(User.id == profile.reporting_manager_id))).scalar_one_or_none()

    can_view_sensitive = is_self or current_user.role in FINANCIAL_ROLES or current_user.role in STAFF_ADMIN_ROLES

    return {
        "user_id": user.id,
        "profile_id": profile.id,
        "employee_id": profile.employee_id,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "full_name": f"{user.first_name} {user.last_name}",
        "username": user.username,
        "email": user.email,
        "phone": user.phone,
        "role": user.role,
        "staff_type": profile.staff_type,
        "department": profile.department,
        "gender": profile.gender,
        "date_of_birth": profile.date_of_birth.isoformat() if profile.date_of_birth else None,
        "blood_group": profile.blood_group,
        "emergency_contact_name": profile.emergency_contact_name,
        "emergency_contact_phone": profile.emergency_contact_phone,
        "emergency_contact_relation": profile.emergency_contact_relation,
        "current_address": profile.current_address,
        "permanent_address": profile.permanent_address,
        "city": profile.city,
        "state": profile.state,
        "pincode": profile.pincode,
        "qualification": profile.qualification,
        "specialization": profile.specialization,
        "experience_years": profile.experience_years,
        "employment_type": profile.employment_type,
        "joining_date": profile.joining_date.isoformat() if profile.joining_date else None,
        "contract_start_date": profile.contract_start_date.isoformat() if profile.contract_start_date else None,
        "contract_end_date": profile.contract_end_date.isoformat() if profile.contract_end_date else None,
        "status_effective_date": profile.status_effective_date.isoformat() if profile.status_effective_date else None,
        "exit_date": profile.exit_date.isoformat() if profile.exit_date else None,
        "exit_reason": profile.exit_reason,
        "rehire_eligible": profile.rehire_eligible,
        "status": profile.status,
        "is_active": user.is_active,
        "notes": profile.notes,
        "reporting_manager_id": profile.reporting_manager_id,
        "reporting_manager_name": f"{reporting_mgr.first_name} {reporting_mgr.last_name}" if reporting_mgr else None,
        "responsibilities": profile.responsibilities,
        "basic_salary": float(profile.basic_salary) if can_view_sensitive else None,
        "pan_number": profile.pan_number if can_view_sensitive else None,
        "aadhar_number": profile.aadhar_number if can_view_sensitive else None,
        "bank_name": profile.bank_name if can_view_sensitive else None,
        "bank_account_number": profile.bank_account_number if can_view_sensitive else None,
        "bank_ifsc": profile.bank_ifsc if can_view_sensitive else None,
        "assignments": assignments,
        "addresses": [
            {
                "id": addr.id,
                "address_type": addr.address_type,
                "address_line": addr.address_line,
                "city": addr.city,
                "state": addr.state,
                "pincode": addr.pincode,
                "country": addr.country,
                "is_primary": addr.is_primary,
                "is_active": addr.is_active,
            }
            for addr in addresses
        ],
        "bank_accounts": [
            {
                "id": b.id,
                "account_holder_name": b.account_holder_name,
                "bank_name": b.bank_name,
                "account_number": b.account_number if can_view_sensitive else "••••••••" + b.account_number[-4:],
                "ifsc_code": b.ifsc_code,
                "branch_name": b.branch_name,
                "account_type": b.account_type,
                "is_primary": b.is_primary,
                "is_verified": b.is_verified,
                "is_active": getattr(b, "is_active", True),
            }
            for b in bank_accs
        ],
        "key_contacts": [
            {
                "id": c.id,
                "contact_name": c.contact_name,
                "relationship": c.relation,
                "phone_primary": c.phone_primary,
                "phone_secondary": c.phone_secondary,
                "email": c.email,
                "address": c.address,
                "is_primary_emergency": c.is_primary_emergency,
                "is_nominee": getattr(c, "is_nominee", False),
                "is_active": getattr(c, "is_active", True),
                "priority": getattr(c, "priority", 1),
            }
            for c in contacts
        ],
        "employment_histories": [
            {
                "id": h.id,
                "event_type": h.event_type,
                "old_status": h.old_status,
                "new_status": h.new_status,
                "effective_date": h.effective_date.isoformat() if h.effective_date else None,
                "reason": h.reason,
                "notes": h.notes,
            }
            for h in emp_histories
        ],
        "leave_balance": {
            "casual_total": bal.casual_leave_total if bal else 12.0,
            "casual_used": bal.casual_leave_used if bal else 0.0,
            "sick_total": bal.sick_leave_total if bal else 10.0,
            "sick_used": bal.sick_leave_used if bal else 0.0,
            "earned_total": bal.earned_leave_total if bal else 15.0,
            "earned_used": bal.earned_leave_used if bal else 0.0,
        } if bal else None,
    }


@router.put("/{user_id}")
async def update_staff_profile(
    user_id: int,
    data: StaffUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*STAFF_ADMIN_ROLES)),
):
    """
    Updates staff profile details with administrative access control.
    """
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    profile = (await db.execute(select(StaffProfile).where(StaffProfile.user_id == user_id))).scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Staff profile not found")

    check_institution_access(profile.institution_id, current_user)

    old_dept = profile.department
    old_emp_type = profile.employment_type
    old_status = profile.status

    if data.first_name is not None:
        user.first_name = data.first_name.strip()
    if data.last_name is not None:
        user.last_name = data.last_name.strip()
    if data.phone is not None:
        user.phone = data.phone

    for k, v in data.dict(exclude_unset=True).items():
        if k in ["first_name", "last_name", "phone"]:
            continue
        if k == "basic_salary" and v is not None:
            profile.basic_salary = Decimal(str(v))
        elif hasattr(profile, k) and v is not None:
            setattr(profile, k, v)

    # Automatically record career/profile transition in employment history
    changes = []
    if data.department and data.department != old_dept:
        changes.append(f"Department transferred from '{old_dept}' to '{data.department}'")
    if data.employment_type and data.employment_type != old_emp_type:
        changes.append(f"Employment type changed from '{old_emp_type}' to '{data.employment_type}'")

    if changes:
        history_entry = StaffEmploymentHistory(
            staff_profile_id=profile.id,
            user_id=profile.user_id,
            event_type="role_or_department_update",
            old_status=old_status,
            new_status=profile.status,
            effective_date=date.today(),
            reason="Profile Details Update",
            notes="; ".join(changes),
            recorded_by_id=current_user.id,
        )
        db.add(history_entry)

    await db.commit()
    return {"success": True, "message": "Staff profile updated successfully"}


# ─── Bank Accounts Endpoints ──────────────────────────────────────────────────

@router.get("/{user_id}/bank-accounts")
async def list_staff_bank_accounts(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    profile = (await db.execute(select(StaffProfile).where(StaffProfile.user_id == user_id))).scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Staff profile not found")

    is_self = current_user.id == user_id
    if not is_self and current_user.role not in STAFF_ADMIN_ROLES and current_user.role not in FINANCIAL_ROLES:
        raise HTTPException(status_code=403, detail="Not authorized to view bank accounts")

    check_institution_access(profile.institution_id, current_user)

    accounts = (
        await db.execute(
            select(StaffBankAccount)
            .where(StaffBankAccount.staff_profile_id == profile.id)
            .order_by(desc(StaffBankAccount.is_primary), desc(StaffBankAccount.id))
        )
    ).scalars().all()

    return [
        {
            "id": a.id,
            "staff_profile_id": a.staff_profile_id,
            "account_holder_name": a.account_holder_name,
            "bank_name": a.bank_name,
            "account_number": a.account_number,
            "ifsc_code": a.ifsc_code,
            "branch_name": a.branch_name,
            "account_type": a.account_type,
            "is_primary": a.is_primary,
            "is_verified": a.is_verified,
            "is_active": getattr(a, "is_active", True),
            "created_at": a.created_at.isoformat() if a.created_at else None,
        }
        for a in accounts
    ]


@router.post("/{user_id}/bank-accounts")
async def add_staff_bank_account(
    user_id: int,
    data: StaffBankAccountCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*STAFF_ADMIN_ROLES)),
):
    profile = (await db.execute(select(StaffProfile).where(StaffProfile.user_id == user_id))).scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Staff profile not found")

    check_institution_access(profile.institution_id, current_user)

    if data.is_primary:
        existing_accs = (
            await db.execute(
                select(StaffBankAccount).where(StaffBankAccount.staff_profile_id == profile.id)
            )
        ).scalars().all()
        for a in existing_accs:
            a.is_primary = False

        profile.bank_name = data.bank_name
        profile.bank_account_number = data.account_number
        profile.bank_ifsc = data.ifsc_code

    new_acc = StaffBankAccount(
        staff_profile_id=profile.id,
        account_holder_name=data.account_holder_name,
        bank_name=data.bank_name,
        account_number=data.account_number,
        ifsc_code=data.ifsc_code,
        branch_name=data.branch_name,
        account_type=data.account_type,
        is_primary=data.is_primary,
        is_verified=data.is_verified,
        is_active=data.is_active,
    )
    db.add(new_acc)
    db.add(
        AuditLog(
            user_id=current_user.id,
            action="CREATE",
            resource_type="staff_bank_account",
            resource_id=profile.user_id,
            details=json.dumps({"target_user_id": user_id, "bank_name": new_acc.bank_name, "last4": str(new_acc.account_number)[-4:]}),
        )
    )
    await db.commit()
    await db.refresh(new_acc)
    return {"success": True, "message": "Bank account added successfully", "id": new_acc.id}


@router.put("/{user_id}/bank-accounts/{account_id}/set-primary")
async def set_primary_bank_account(
    user_id: int,
    account_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*STAFF_ADMIN_ROLES)),
):
    profile = (await db.execute(select(StaffProfile).where(StaffProfile.user_id == user_id))).scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Staff profile not found")

    check_institution_access(profile.institution_id, current_user)

    target_acc = (
        await db.execute(
            select(StaffBankAccount).where(
                StaffBankAccount.id == account_id, StaffBankAccount.staff_profile_id == profile.id
            )
        )
    ).scalar_one_or_none()
    if not target_acc:
        raise HTTPException(status_code=404, detail="Bank account not found")

    existing_accs = (
        await db.execute(select(StaffBankAccount).where(StaffBankAccount.staff_profile_id == profile.id))
    ).scalars().all()
    for a in existing_accs:
        a.is_primary = (a.id == account_id)

    profile.bank_name = target_acc.bank_name
    profile.bank_account_number = target_acc.account_number
    profile.bank_ifsc = target_acc.ifsc_code

    db.add(
        AuditLog(
            user_id=current_user.id,
            action="UPDATE",
            resource_type="staff_bank_account",
            resource_id=profile.user_id,
            details=json.dumps({"target_user_id": user_id, "account_id": account_id, "is_primary": True}),
        )
    )
    await db.commit()
    return {"success": True, "message": f"{target_acc.bank_name} account set as primary salary account"}


@router.delete("/{user_id}/bank-accounts/{account_id}")
async def delete_staff_bank_account(
    user_id: int,
    account_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*STAFF_ADMIN_ROLES)),
):
    profile = (await db.execute(select(StaffProfile).where(StaffProfile.user_id == user_id))).scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Staff profile not found")

    check_institution_access(profile.institution_id, current_user)

    target_acc = (
        await db.execute(
            select(StaffBankAccount).where(
                StaffBankAccount.id == account_id, StaffBankAccount.staff_profile_id == profile.id
            )
        )
    ).scalar_one_or_none()
    if not target_acc:
        raise HTTPException(status_code=404, detail="Bank account not found")

    if target_acc.is_primary:
        other_acc = (
            await db.execute(
                select(StaffBankAccount).where(
                    StaffBankAccount.staff_profile_id == profile.id, StaffBankAccount.id != account_id
                )
            )
        ).scalars().first()
        if other_acc:
            other_acc.is_primary = True
            profile.bank_name = other_acc.bank_name
            profile.bank_account_number = other_acc.account_number
            profile.bank_ifsc = other_acc.ifsc_code
        else:
            profile.bank_name = None
            profile.bank_account_number = None
            profile.bank_ifsc = None

    await db.delete(target_acc)
    db.add(
        AuditLog(
            user_id=current_user.id,
            action="DELETE",
            resource_type="staff_bank_account",
            resource_id=profile.user_id,
            details=json.dumps({"target_user_id": user_id, "account_id": account_id, "bank_name": target_acc.bank_name}),
        )
    )
    await db.commit()
    return {"success": True, "message": "Bank account deleted successfully"}


# ─── Key Contacts Endpoints ───────────────────────────────────────────────────

@router.get("/{user_id}/key-contacts")
async def list_staff_key_contacts(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    profile = (await db.execute(select(StaffProfile).where(StaffProfile.user_id == user_id))).scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Staff profile not found")

    is_self = current_user.id == user_id
    if not is_self and current_user.role not in STAFF_ADMIN_ROLES:
        raise HTTPException(status_code=403, detail="Not authorized to view key contacts")

    check_institution_access(profile.institution_id, current_user)

    contacts = (
        await db.execute(
            select(StaffKeyContact)
            .where(StaffKeyContact.staff_profile_id == profile.id)
            .order_by(desc(StaffKeyContact.is_primary_emergency), desc(StaffKeyContact.id))
        )
    ).scalars().all()

    return [
        {
            "id": c.id,
            "staff_profile_id": c.staff_profile_id,
            "contact_name": c.contact_name,
            "relationship": c.relation,
            "phone_primary": c.phone_primary,
            "phone_secondary": c.phone_secondary,
            "email": c.email,
            "address": c.address,
            "is_primary_emergency": c.is_primary_emergency,
            "created_at": c.created_at.isoformat() if c.created_at else None,
        }
        for c in contacts
    ]


@router.post("/{user_id}/key-contacts")
async def add_staff_key_contact(
    user_id: int,
    data: StaffKeyContactCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*STAFF_ADMIN_ROLES)),
):
    profile = (await db.execute(select(StaffProfile).where(StaffProfile.user_id == user_id))).scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Staff profile not found")

    check_institution_access(profile.institution_id, current_user)

    if data.is_primary_emergency:
        existing = (
            await db.execute(
                select(StaffKeyContact).where(StaffKeyContact.staff_profile_id == profile.id)
            )
        ).scalars().all()
        for c in existing:
            c.is_primary_emergency = False

        profile.emergency_contact_name = data.contact_name
        profile.emergency_contact_phone = data.phone_primary
        profile.emergency_contact_relation = data.relationship

    new_contact = StaffKeyContact(
        staff_profile_id=profile.id,
        contact_name=data.contact_name,
        relation=data.relationship,
        phone_primary=data.phone_primary,
        phone_secondary=data.phone_secondary,
        email=data.email,
        address=data.address,
        is_primary_emergency=data.is_primary_emergency,
        is_nominee=data.is_nominee,
        is_active=data.is_active,
        priority=data.priority,
    )
    db.add(new_contact)
    db.add(
        AuditLog(
            user_id=current_user.id,
            action="CREATE",
            resource_type="staff_key_contact",
            resource_id=profile.user_id,
            details=json.dumps({"target_user_id": user_id, "contact_name": new_contact.contact_name, "relationship": new_contact.relation}),
        )
    )
    await db.commit()
    await db.refresh(new_contact)
    return {"success": True, "message": "Key contact added successfully", "id": new_contact.id}


@router.delete("/{user_id}/key-contacts/{contact_id}")
async def delete_staff_key_contact(
    user_id: int,
    contact_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*STAFF_ADMIN_ROLES)),
):
    profile = (await db.execute(select(StaffProfile).where(StaffProfile.user_id == user_id))).scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Staff profile not found")

    check_institution_access(profile.institution_id, current_user)

    target = (
        await db.execute(
            select(StaffKeyContact).where(
                StaffKeyContact.id == contact_id, StaffKeyContact.staff_profile_id == profile.id
            )
        )
    ).scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="Key contact not found")

    if target.is_primary_emergency:
        other = (
            await db.execute(
                select(StaffKeyContact).where(
                    StaffKeyContact.staff_profile_id == profile.id, StaffKeyContact.id != contact_id
                )
            )
        ).scalars().first()
        if other:
            other.is_primary_emergency = True
            profile.emergency_contact_name = other.contact_name
            profile.emergency_contact_phone = other.phone_primary
            profile.emergency_contact_relation = other.relation
        else:
            profile.emergency_contact_name = None
            profile.emergency_contact_phone = None
            profile.emergency_contact_relation = None

    await db.delete(target)
    db.add(
        AuditLog(
            user_id=current_user.id,
            action="DELETE",
            resource_type="staff_key_contact",
            resource_id=profile.user_id,
            details=json.dumps({"target_user_id": user_id, "contact_id": contact_id, "contact_name": target.contact_name}),
        )
    )
    await db.commit()
    return {"success": True, "message": "Key contact deleted successfully"}


# ─── Addresses Endpoints ──────────────────────────────────────────────────────

@router.get("/{user_id}/addresses")
async def list_staff_addresses(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    profile = (await db.execute(select(StaffProfile).where(StaffProfile.user_id == user_id))).scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Staff profile not found")

    is_self = current_user.id == user_id
    if not is_self and current_user.role not in STAFF_ADMIN_ROLES:
        raise HTTPException(status_code=403, detail="Not authorized to view addresses")

    check_institution_access(profile.institution_id, current_user)

    addresses = (
        await db.execute(
            select(StaffAddress)
            .where(StaffAddress.staff_profile_id == profile.id)
            .order_by(desc(StaffAddress.is_primary), desc(StaffAddress.id))
        )
    ).scalars().all()

    return [
        {
            "id": a.id,
            "staff_profile_id": a.staff_profile_id,
            "address_type": a.address_type,
            "address_line": a.address_line,
            "city": a.city,
            "state": a.state,
            "pincode": a.pincode,
            "country": a.country,
            "is_primary": a.is_primary,
            "is_active": a.is_active,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        }
        for a in addresses
    ]


@router.post("/{user_id}/addresses")
async def add_staff_address(
    user_id: int,
    data: StaffAddressCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*STAFF_ADMIN_ROLES)),
):
    profile = (await db.execute(select(StaffProfile).where(StaffProfile.user_id == user_id))).scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Staff profile not found")

    check_institution_access(profile.institution_id, current_user)

    if data.is_primary:
        existing = (
            await db.execute(
                select(StaffAddress).where(StaffAddress.staff_profile_id == profile.id)
            )
        ).scalars().all()
        for a in existing:
            a.is_primary = False

        if data.address_type == "current" or not profile.current_address:
            profile.current_address = data.address_line
            profile.city = data.city or profile.city
            profile.state = data.state or profile.state
            profile.pincode = data.pincode or profile.pincode
        elif data.address_type == "permanent":
            profile.permanent_address = data.address_line

    new_addr = StaffAddress(
        staff_profile_id=profile.id,
        address_type=data.address_type,
        address_line=data.address_line,
        city=data.city or "Mumbai",
        state=data.state or "Maharashtra",
        pincode=data.pincode or "400001",
        country=data.country or "India",
        is_primary=data.is_primary,
        is_active=data.is_active,
    )
    db.add(new_addr)
    db.add(
        AuditLog(
            user_id=current_user.id,
            action="CREATE",
            resource_type="staff_address",
            resource_id=profile.user_id,
            details=json.dumps({"target_user_id": user_id, "address_type": new_addr.address_type, "city": new_addr.city}),
        )
    )
    await db.commit()
    await db.refresh(new_addr)
    return {"success": True, "message": "Address added successfully", "id": new_addr.id}


@router.put("/{user_id}/addresses/{address_id}/set-primary")
async def set_primary_address(
    user_id: int,
    address_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*STAFF_ADMIN_ROLES)),
):
    profile = (await db.execute(select(StaffProfile).where(StaffProfile.user_id == user_id))).scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Staff profile not found")

    check_institution_access(profile.institution_id, current_user)

    target = (
        await db.execute(
            select(StaffAddress).where(
                StaffAddress.id == address_id, StaffAddress.staff_profile_id == profile.id
            )
        )
    ).scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="Address not found")

    existing = (
        await db.execute(select(StaffAddress).where(StaffAddress.staff_profile_id == profile.id))
    ).scalars().all()
    for a in existing:
        a.is_primary = (a.id == address_id)

    profile.current_address = target.address_line
    profile.city = target.city
    profile.state = target.state
    profile.pincode = target.pincode

    db.add(
        AuditLog(
            user_id=current_user.id,
            action="UPDATE",
            resource_type="staff_address",
            resource_id=profile.user_id,
            details=json.dumps({"target_user_id": user_id, "address_id": address_id, "is_primary": True}),
        )
    )
    await db.commit()
    return {"success": True, "message": "Address set as primary successfully"}


@router.delete("/{user_id}/addresses/{address_id}")
async def delete_staff_address(
    user_id: int,
    address_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*STAFF_ADMIN_ROLES)),
):
    profile = (await db.execute(select(StaffProfile).where(StaffProfile.user_id == user_id))).scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Staff profile not found")

    check_institution_access(profile.institution_id, current_user)

    target = (
        await db.execute(
            select(StaffAddress).where(
                StaffAddress.id == address_id, StaffAddress.staff_profile_id == profile.id
            )
        )
    ).scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="Address not found")

    await db.delete(target)
    db.add(
        AuditLog(
            user_id=current_user.id,
            action="DELETE",
            resource_type="staff_address",
            resource_id=profile.user_id,
            details=json.dumps({"target_user_id": user_id, "address_id": address_id, "address_type": target.address_type}),
        )
    )
    await db.commit()
    return {"success": True, "message": "Address deleted successfully"}


# ─── 2. Teacher Academic Assignments Endpoints ────────────────────────────────

@router.get("/assignments/list")
async def list_teacher_assignments(
    teacher_id: Optional[int] = Query(None),
    division_id: Optional[int] = Query(None),
    standard_id: Optional[int] = Query(None),
    subject_id: Optional[int] = Query(None),
    academic_year_id: Optional[int] = Query(1),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Lists teacher subject-batch allocations with workload and division student counts.
    """
    ay_id = academic_year_id if not hasattr(academic_year_id, "default") else 1
    t_id = teacher_id if not hasattr(teacher_id, "default") else None
    d_id = division_id if not hasattr(division_id, "default") else None
    s_id = standard_id if not hasattr(standard_id, "default") else None
    sub_id = subject_id if not hasattr(subject_id, "default") else None

    conditions = [TeacherAssignment.is_active == True]
    if ay_id:
        conditions.append(TeacherAssignment.academic_year_id == ay_id)
    if t_id:
        conditions.append(TeacherAssignment.teacher_user_id == t_id)
    if d_id:
        conditions.append(TeacherAssignment.division_id == d_id)
    if s_id:
        conditions.append(TeacherAssignment.standard_id == s_id)
    if sub_id:
        conditions.append(TeacherAssignment.subject_id == sub_id)

    query = (
        select(
            TeacherAssignment,
            User.first_name,
            User.last_name,
            Standard.name.label("standard_name"),
            Division.name.label("batch_name"),
            Subject.name.label("subject_name"),
            Board.name.label("board_name")
        )
        .join(User, TeacherAssignment.teacher_user_id == User.id)
        .join(Standard, TeacherAssignment.standard_id == Standard.id)
        .join(Division, TeacherAssignment.division_id == Division.id)
        .join(Subject, TeacherAssignment.subject_id == Subject.id)
        .join(Board, TeacherAssignment.board_id == Board.id)
        .where(and_(*conditions))
        .order_by(Standard.level.asc(), Division.name.asc())
    )
    rows = (await db.execute(query)).all()

    items = []
    for a, fname, lname, std_name, div_name, sub_name, brd_name in rows:
        items.append({
            "id": a.id,
            "teacher_user_id": a.teacher_user_id,
            "teacher_name": f"{fname} {lname}",
            "board_id": a.board_id,
            "board_name": brd_name,
            "standard_id": a.standard_id,
            "standard_name": std_name,
            "division_id": a.division_id,
            "batch_name": div_name,
            "subject_id": a.subject_id,
            "subject_name": sub_name,
            "weekly_hours": a.weekly_hours,
            "is_class_teacher": a.is_class_teacher,
            "notes": a.notes,
        })
    return items


@router.post("/assignments/create", status_code=status.HTTP_201_CREATED)
async def create_teacher_assignment(
    data: TeacherAssignmentCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*STAFF_ADMIN_ROLES)),
):
    """
    Creates a new teacher assignment with schedule conflict and duplicate checking.
    """
    # Check duplicate assignment
    dup = (
        await db.execute(
            select(TeacherAssignment).where(
                TeacherAssignment.division_id == data.division_id,
                TeacherAssignment.subject_id == data.subject_id,
                TeacherAssignment.academic_year_id == data.academic_year_id,
                TeacherAssignment.is_active == True,
            )
        )
    ).scalar_one_or_none()
    if dup:
        raise HTTPException(
            status_code=400,
            detail="A teacher is already actively assigned to this subject and batch for the current academic session."
        )

    sm_id = (
        await db.execute(
            select(SubjectMapping.id).where(
                SubjectMapping.legacy_subject_id == data.subject_id
            )
        )
    ).scalar_one_or_none()

    assignment = TeacherAssignment(
        teacher_user_id=data.teacher_user_id,
        academic_year_id=data.academic_year_id,
        board_id=data.board_id,
        standard_id=data.standard_id,
        division_id=data.division_id,
        subject_id=data.subject_id,
        subject_mapping_id=sm_id,
        weekly_hours=data.weekly_hours or 4.0,
        is_class_teacher=data.is_class_teacher or False,
        is_active=True,
        notes=data.notes,
    )
    db.add(assignment)
    await db.commit()
    await db.refresh(assignment)

    return {"success": True, "message": "Teacher assignment recorded successfully", "id": assignment.id}


@router.delete("/assignments/{assignment_id}")
async def delete_teacher_assignment(
    assignment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*STAFF_ADMIN_ROLES)),
):
    """
    Deactivates a teacher assignment.
    """
    assignment = (
        await db.execute(select(TeacherAssignment).where(TeacherAssignment.id == assignment_id))
    ).scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    assignment.is_active = False
    await db.commit()
    return {"success": True, "message": "Assignment successfully unlinked"}


# ─── 3. Staff Attendance Endpoints ────────────────────────────────────────────

@router.get("/attendance/daily")
async def get_daily_staff_attendance(
    attendance_date: date = Query(default_factory=date.today),
    staff_type: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Returns the complete faculty and staff attendance register for a specific date.
    """
    # Fetch all active staff
    staff_query = (
        select(StaffProfile, User)
        .join(User, StaffProfile.user_id == User.id)
        .where(StaffProfile.status.in_(["active", "on_leave"]))
    )
    if staff_type:
        staff_query = staff_query.where(StaffProfile.staff_type == staff_type)
    staff_query = staff_query.order_by(StaffProfile.employee_id.asc())

    staff_list = (await db.execute(staff_query)).all()

    # Fetch marked attendances for this date
    att_query = select(StaffAttendance).where(StaffAttendance.date == attendance_date)
    att_records = {a.user_id: a for a in (await db.execute(att_query)).scalars().all()}

    output = []
    present_cnt = 0
    absent_cnt = 0
    late_cnt = 0
    half_cnt = 0
    leave_cnt = 0

    for prof, u in staff_list:
        rec = att_records.get(u.id)
        st = rec.status if rec else "present"  # Default to present if unrecorded
        if st == "present":
            present_cnt += 1
        elif st == "absent":
            absent_cnt += 1
        elif st == "late":
            late_cnt += 1
        elif st == "half_day":
            half_cnt += 1
        elif st == "on_leave":
            leave_cnt += 1

        output.append({
            "user_id": u.id,
            "employee_id": prof.employee_id,
            "full_name": f"{u.first_name} {u.last_name}",
            "staff_type": prof.staff_type,
            "department": prof.department,
            "date": attendance_date.isoformat(),
            "status": st,
            "check_in_time": rec.check_in_time if rec else "08:45 AM",
            "check_out_time": rec.check_out_time if rec else "04:30 PM",
            "hours_worked": rec.hours_worked if rec else 8.0,
            "remarks": rec.remarks if rec else None,
            "is_marked": rec is not None,
        })

    return {
        "date": attendance_date.isoformat(),
        "total_staff": len(staff_list),
        "present_count": present_cnt,
        "absent_count": absent_cnt,
        "late_count": late_cnt,
        "half_day_count": half_cnt,
        "leave_count": leave_cnt,
        "records": output,
    }


@router.post("/attendance/mark")
async def mark_staff_attendance(
    data: StaffAttendanceBulkMarkRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*STAFF_ADMIN_ROLES)),
):
    """
    Submits daily attendance marks for single or bulk faculty/staff.
    """
    for item in data.records:
        rec = (
            await db.execute(
                select(StaffAttendance).where(
                    StaffAttendance.user_id == item.user_id,
                    StaffAttendance.date == data.date,
                )
            )
        ).scalar_one_or_none()

        if rec:
            rec.status = item.status
            rec.check_in_time = item.check_in_time
            rec.check_out_time = item.check_out_time
            rec.hours_worked = item.hours_worked
            rec.remarks = item.remarks
            rec.marked_by_id = current_user.id
        else:
            new_rec = StaffAttendance(
                user_id=item.user_id,
                date=data.date,
                status=item.status,
                check_in_time=item.check_in_time or "08:45 AM",
                check_out_time=item.check_out_time or "04:30 PM",
                hours_worked=item.hours_worked or 8.0,
                remarks=item.remarks,
                marked_by_id=current_user.id,
            )
            db.add(new_rec)

    await db.commit()
    return {"success": True, "message": f"Recorded attendance for {len(data.records)} staff members"}


# ─── 4. Staff Leave Management Endpoints ──────────────────────────────────────

@router.get("/leaves/list")
async def list_staff_leaves(
    status_filter: Optional[str] = Query(None, alias="status"),
    user_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Lists leave applications with status, dates, and approval details.
    """
    conditions = []
    # Regular teachers/staff only see their own leaves; admins see all
    if current_user.role not in STAFF_ADMIN_ROLES:
        conditions.append(StaffLeave.user_id == current_user.id)
    elif user_id:
        conditions.append(StaffLeave.user_id == user_id)

    if status_filter:
        conditions.append(StaffLeave.status == status_filter)

    query = (
        select(StaffLeave, User.first_name, User.last_name, User.email)
        .join(User, StaffLeave.user_id == User.id)
        .where(and_(*conditions) if conditions else text("1=1"))
        .order_by(StaffLeave.applied_at.desc())
    )
    rows = (await db.execute(query)).all()

    items = []
    for lv, fname, lname, email in rows:
        items.append({
            "id": lv.id,
            "user_id": lv.user_id,
            "staff_name": f"{fname} {lname}",
            "email": email,
            "leave_type": lv.leave_type,
            "start_date": lv.start_date.isoformat(),
            "end_date": lv.end_date.isoformat(),
            "days_count": lv.days_count,
            "reason": lv.reason,
            "status": lv.status,
            "action_remarks": lv.action_remarks,
            "action_date": lv.action_date.isoformat() if lv.action_date else None,
            "applied_at": lv.applied_at.isoformat() if lv.applied_at else None,
        })
    return items


@router.post("/leaves/apply", status_code=status.HTTP_201_CREATED)
async def apply_staff_leave(
    data: StaffLeaveApplyRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Submits a leave application for current staff user.
    """
    leave_app = StaffLeave(
        user_id=current_user.id,
        leave_type=data.leave_type,
        start_date=data.start_date,
        end_date=data.end_date,
        days_count=data.days_count or 1.0,
        reason=data.reason,
        status="pending",
    )
    db.add(leave_app)
    await db.commit()
    await db.refresh(leave_app)

    return {"success": True, "message": "Leave application submitted successfully", "id": leave_app.id}


@router.post("/leaves/{leave_id}/action")
async def action_staff_leave(
    leave_id: int,
    data: StaffLeaveActionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*STAFF_ADMIN_ROLES)),
):
    """
    Approves or rejects a staff leave application, debiting leave balance on approval.
    """
    leave = (await db.execute(select(StaffLeave).where(StaffLeave.id == leave_id))).scalar_one_or_none()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave application not found")

    if data.action == "approve":
        leave.status = "approved"
        # Deduct balance
        bal = (await db.execute(select(StaffLeaveBalance).where(StaffLeaveBalance.user_id == leave.user_id))).scalar_one_or_none()
        if bal:
            if leave.leave_type == "casual":
                bal.casual_leave_used += leave.days_count
            elif leave.leave_type == "sick":
                bal.sick_leave_used += leave.days_count
            elif leave.leave_type == "earned":
                bal.earned_leave_used += leave.days_count
    else:
        leave.status = "rejected"

    leave.approved_by_id = current_user.id
    leave.action_remarks = data.action_remarks or f"Marked {leave.status} by {current_user.first_name}"
    leave.action_date = datetime.utcnow()

    await db.commit()
    return {"success": True, "message": f"Leave application {leave.status} successfully"}


# ─── 5. Role-Based Dashboard Stats ────────────────────────────────────────────

@router.get("/dashboard/stats")
async def get_staff_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Returns contextual metrics customized to the user's role:
    Admin/Principal: Total staff, present today, absent, pending leaves, workload.
    Teacher: Assigned batches, weekly teaching hours, my attendance, upcoming schedule.
    Staff: My attendance, leave balances, duty roster.
    """
    today = date.today()

    if current_user.role in STAFF_ADMIN_ROLES or current_user.role in FINANCIAL_ROLES:
        total_staff = (await db.execute(select(func.count(StaffProfile.id)).where(StaffProfile.status == "active"))).scalar() or 0
        teachers_count = (await db.execute(select(func.count(StaffProfile.id)).where(StaffProfile.staff_type == "Teacher", StaffProfile.status == "active"))).scalar() or 0
        non_teaching = total_staff - teachers_count

        today_att = (await db.execute(
            select(StaffAttendance.status, func.count(StaffAttendance.id))
            .where(StaffAttendance.date == today)
            .group_by(StaffAttendance.status)
        )).all()
        att_map = {row[0]: row[1] for row in today_att}
        present_today = att_map.get("present", 0) + att_map.get("late", 0)

        pending_leaves = (await db.execute(
            select(func.count(StaffLeave.id)).where(StaffLeave.status == "pending")
        )).scalar() or 0

        return {
            "view_mode": "admin",
            "total_staff": total_staff,
            "teachers_count": teachers_count,
            "non_teaching_count": non_teaching,
            "present_today": present_today,
            "absent_today": att_map.get("absent", 0),
            "pending_leaves": pending_leaves,
            "attendance_rate": round((present_today / total_staff * 100), 1) if total_staff > 0 else 100.0,
        }

    elif current_user.role == "teacher":
        assignments = (await db.execute(
            select(TeacherAssignment).where(TeacherAssignment.teacher_user_id == current_user.id, TeacherAssignment.is_active == True)
        )).scalars().all()
        total_hours = sum(a.weekly_hours for a in assignments)

        my_att = (await db.execute(
            select(func.count(StaffAttendance.id)).where(StaffAttendance.user_id == current_user.id, StaffAttendance.status == "present")
        )).scalar() or 0

        bal = (await db.execute(select(StaffLeaveBalance).where(StaffLeaveBalance.user_id == current_user.id))).scalar_one_or_none()

        return {
            "view_mode": "teacher",
            "assigned_batches_count": len(assignments),
            "weekly_teaching_hours": total_hours,
            "classes_completed": my_att * 2,
            "leaves_remaining": (bal.casual_leave_total - bal.casual_leave_used) if bal else 12.0,
        }

    else:
        bal = (await db.execute(select(StaffLeaveBalance).where(StaffLeaveBalance.user_id == current_user.id))).scalar_one_or_none()
        return {
            "view_mode": "staff",
            "shift_hours": 8.0,
            "casual_leaves_available": (bal.casual_leave_total - bal.casual_leave_used) if bal else 12.0,
            "sick_leaves_available": (bal.sick_leave_total - bal.sick_leave_used) if bal else 10.0,
        }


# ─── 6. Staff Documents & Forms Center ────────────────────────────────────────

STAFF_DOCUMENT_CATALOGUE = [
    # Category 1: Onboarding & Staff Registration
    {"id": "staff_registration", "category": "Onboarding", "title": "Staff & Faculty Registration Form", "code": "STF-ONB-01", "description": "Comprehensive employee registration capturing personal details, education, address, and emergency contact."},
    {"id": "faculty_profile_sheet", "category": "Onboarding", "title": "Faculty Academic Profile Sheet", "code": "STF-ONB-02", "description": "Subject specialization, pedagogical experience, publishing history, and coaching credentials."},
    {"id": "joining_report", "category": "Onboarding", "title": "Official Joining & Verification Report", "code": "STF-ONB-03", "description": "Formal first-day service commencement verification signed by Head of Institute."},
    {"id": "appointment_letter", "category": "Onboarding", "title": "Faculty Appointment Letter", "code": "STF-ONB-04", "description": "Formal terms of appointment, role expectations, code of conduct, and remuneration structure."},
    {"id": "employment_agreement", "category": "Onboarding", "title": "Employment & Service Agreement", "code": "STF-ONB-05", "description": "Legally vetted institute-faculty service terms, intellectual property, and confidentiality covenants."},
    {"id": "staff_id_card", "category": "Onboarding", "title": "Staff Identity Badge & Credential Slip", "code": "STF-ONB-06", "description": "Printable pocket credential card with QR reference, blood group, and emergency contact."},
    {"id": "document_submission_checklist", "category": "Onboarding", "title": "Onboarding Document Verification Checklist", "code": "STF-ONB-07", "description": "Audit checklist tracking PAN, Aadhaar, degree certificates, and previous experience letters."},

    # Category 2: Attendance & Leave Management
    {"id": "monthly_attendance_sheet", "category": "Attendance & Leave", "title": "Monthly Faculty Attendance Sheet", "code": "STF-ATT-01", "description": "Comprehensive 31-day attendance matrix with Present, Absent, Late, and Half-Day tallies."},
    {"id": "leave_application_form", "category": "Attendance & Leave", "title": "Staff Leave Application Slip", "code": "STF-ATT-02", "description": "Official printable leave request with balance verification and substitute teacher handover."},
    {"id": "leave_approval_certificate", "category": "Attendance & Leave", "title": "Sanctioned Leave Order Certificate", "code": "STF-ATT-03", "description": "Formal administrative sanction note approving medical, casual, or earned leave."},
    {"id": "daily_sign_in_register", "category": "Attendance & Leave", "title": "Daily Faculty Sign-in / Duty Register", "code": "STF-ATT-04", "description": "Physical desk sign-in/sign-out ledger for lecture halls and laboratory sessions."},
    {"id": "attendance_correction_form", "category": "Attendance & Leave", "title": "Attendance Discrepancy & Correction Form", "code": "STF-ATT-05", "description": "Formal correction petition for missed biometric punch or field assignment duty."},

    # Category 3: Academic & Teaching Assignments
    {"id": "workload_allocation", "category": "Academic & Teaching", "title": "Faculty Workload Allocation Matrix", "code": "STF-ACD-01", "description": "Institutional breakdown of allocated batches, weekly lecture hours, and laboratory sessions."},
    {"id": "batch_assignment_order", "category": "Academic & Teaching", "title": "Class & Batch Assignment Order", "code": "STF-ACD-02", "description": "Official assignment of teacher as Class Teacher / Subject Lead for ICSE/CBSE/SSC batches."},
    {"id": "faculty_timetable_slip", "category": "Academic & Teaching", "title": "Personal Faculty Weekly Timetable", "code": "STF-ACD-03", "description": "Class schedule from Monday to Saturday with hall numbers and subject allocations."},
    {"id": "lesson_plan_template", "category": "Academic & Teaching", "title": "Term Lesson Plan & Syllabus Tracker", "code": "STF-ACD-04", "description": "Weekly pedagogical syllabus delivery targets, test schedules, and practice sheet distribution."},
    {"id": "syllabus_completion_cert", "category": "Academic & Teaching", "title": "Syllabus Completion Certification", "code": "STF-ACD-05", "description": "Sign-off document confirming complete delivery of prescribed board syllabus before exams."},
    {"id": "student_assessment_sheet", "category": "Academic & Teaching", "title": "Batch Internal Assessment & Review Sheet", "code": "STF-ACD-06", "description": "Faculty evaluation form recording student test scores, viva performance, and homework status."},

    # Category 4: Payroll & Employment Proofs
    {"id": "monthly_salary_slip", "category": "Payroll & Employment", "title": "Monthly Salary Slip / Pay Statement", "code": "STF-PAY-01", "description": "Itemized earnings (Basic, HRA, Allowance) and deductions (TDS, PF) with Net Pay figures."},
    {"id": "salary_register", "category": "Payroll & Employment", "title": "Monthly Staff Salary Register Summary", "code": "STF-PAY-02", "description": "Institution-wide payroll disbursement statement with bank account numbers and mode of transfer."},
    {"id": "salary_revision_letter", "category": "Payroll & Employment", "title": "Salary Increment & Appraisal Letter", "code": "STF-PAY-03", "description": "Formal compensation revision letter specifying revised salary structure and effective date."},
    {"id": "experience_certificate", "category": "Payroll & Employment", "title": "Teaching Experience Certificate", "code": "STF-PAY-04", "description": "Institutional testimony of service tenure, role conduct, and academic contributions."},
    {"id": "relieving_letter", "category": "Payroll & Employment", "title": "Official Service Relieving Letter", "code": "STF-PAY-05", "description": "Formal release certificate confirming successful completion of notice period and handover."},
    {"id": "full_final_settlement", "category": "Payroll & Employment", "title": "Full & Final Settlement Statement", "code": "STF-PAY-06", "description": "Comprehensive exit accounting covering outstanding dues, leave encashment, and deductions."},

    # Category 5: HR Governance & Administration
    {"id": "performance_appraisal", "category": "HR Governance", "title": "Annual Faculty Performance Appraisal", "code": "STF-ADM-01", "description": "360-degree evaluation on syllabus delivery, student test performance, and parent feedback."},
    {"id": "asset_handover_slip", "category": "HR Governance", "title": "Institute Asset Handover Slip", "code": "STF-ADM-02", "description": "Inventory clearance for classroom keys, smart board tablets, library books, and course modules."},
    {"id": "warning_memo", "category": "HR Governance", "title": "Administrative Clarification / Warning Memo", "code": "STF-ADM-03", "description": "Formal confidential memo regarding attendance irregularities or compliance matters."},
    {"id": "training_attendance_sheet", "category": "HR Governance", "title": "Faculty Development & Workshop Register", "code": "STF-ADM-04", "description": "Attendance log for pedagogical workshops, syllabus updates, and board exam seminars."},
]


@router.get("/documents-forms/catalogue")
async def get_staff_documents_catalogue(
    category: Optional[str] = Query(None),
    current_user: User = Depends(get_current_active_user),
):
    """
    Returns the comprehensive 28-document templates catalog for faculty & staff.
    """
    if category:
        return [doc for doc in STAFF_DOCUMENT_CATALOGUE if doc["category"].lower() == category.lower()]
    return STAFF_DOCUMENT_CATALOGUE


@router.get("/documents-forms/render/{form_id}")
async def render_staff_document(
    form_id: str,
    user_id: int = Query(...),
    period_month: Optional[str] = Query("October 2026"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Renders an official, printable HTML document prefilled with live staff data and reference codes.
    """
    # Verify permission
    if current_user.id != user_id and current_user.role not in STAFF_ADMIN_ROLES and current_user.role not in FINANCIAL_ROLES:
        raise HTTPException(status_code=403, detail="Unauthorized to render official staff document")

    template = next((d for d in STAFF_DOCUMENT_CATALOGUE if d["id"] == form_id), None)
    if not template:
        raise HTTPException(status_code=404, detail="Requested document template not found in catalogue")

    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    profile = (await db.execute(select(StaffProfile).where(StaffProfile.user_id == user_id))).scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Staff profile not found")

    check_institution_access(profile.institution_id, current_user)

    # Fetch institution & active academic year dynamically
    effective_inst_id = profile.institution_id or 1
    inst = (await db.execute(select(Institution).where(Institution.id == effective_inst_id))).scalar_one_or_none()
    inst_name = inst.name if inst else "PrathamOne Academy"
    inst_address = inst.address if inst else "Vasai Road (W), Palghar - 401202"
    inst_phone = inst.phone if inst else "+91 98765 43210"

    ay_res = await db.execute(
        select(AcademicYear).where(
            AcademicYear.institution_id == effective_inst_id,
            AcademicYear.is_active == True,
        ).limit(1)
    )
    active_ay = ay_res.scalars().first()
    active_ay_name = active_ay.name if active_ay and active_ay.name else "2026-27"

    # Fetch teaching workload
    assignments = (await db.execute(
        select(TeacherAssignment, Standard.name, Division.name, Subject.name, Board.name)
        .join(Standard, TeacherAssignment.standard_id == Standard.id)
        .join(Division, TeacherAssignment.division_id == Division.id)
        .join(Subject, TeacherAssignment.subject_id == Subject.id)
        .join(Board, TeacherAssignment.board_id == Board.id)
        .where(TeacherAssignment.teacher_user_id == user_id, TeacherAssignment.is_active == True)
    )).all()

    ref_number = f"DOC-PA-{datetime.now().strftime('%Y%m')}-{user_id:04d}-{form_id[:4].upper()}"

    # Calculate financial numbers
    basic = float(profile.basic_salary) if profile.basic_salary else 50000.0
    hra = round(basic * 0.30, 2)
    da = round(basic * 0.15, 2)
    allowance = 4500.0
    gross = basic + hra + da + allowance
    pf = round(basic * 0.12, 2)
    pt = 200.0
    tds = round(gross * 0.05, 2)
    total_deductions = pf + pt + tds
    net_pay = gross - total_deductions

    # Build assignments table HTML if applicable
    assignments_rows = ""
    for a, std, div, sub, brd in assignments:
        assignments_rows += f"""
        <tr>
            <td style="padding: 8px; border: 1px solid #e2e8f0;">{brd}</td>
            <td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: 600;">{std} - {div}</td>
            <td style="padding: 8px; border: 1px solid #e2e8f0;">{sub}</td>
            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center;">{a.weekly_hours} hrs/wk</td>
            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center;">{'Yes' if a.is_class_teacher else 'No'}</td>
        </tr>
        """
    if not assignments_rows:
        assignments_rows = "<tr><td colspan='5' style='padding: 8px; text-align: center; color: #64748b;'>No active academic assignments recorded.</td></tr>"

    html_content = f"""
    <div id="staff-doc-print-area" style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; color: #1e293b; background: #ffffff; padding: 32px; max-width: 800px; margin: 0 auto; line-height: 1.5; font-size: 13px;">
        <!-- Header -->
        <div style="border-bottom: 2px solid #1e3a8a; padding-bottom: 16px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
                <h1 style="margin: 0; font-size: 20px; font-weight: 800; color: #1e3a8a; text-transform: uppercase; letter-spacing: 0.5px;">{inst_name}</h1>
                <p style="margin: 2px 0 0; font-size: 11px; color: #475569;">Coaching Institute & Senior Secondary Academic Center</p>
                <p style="margin: 2px 0 0; font-size: 10px; color: #64748b;">{inst_address} | Phone: {inst_phone}</p>
            </div>
            <div style="text-align: right;">
                <span style="display: inline-block; padding: 4px 10px; background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; border-radius: 6px; font-weight: 700; font-size: 11px;">{template['code']}</span>
                <p style="margin: 4px 0 0; font-size: 10px; color: #64748b;">Ref: <strong>{ref_number}</strong></p>
                <p style="margin: 2px 0 0; font-size: 10px; color: #64748b;">Date: {date.today().strftime('%d %B %Y')}</p>
            </div>
        </div>

        <!-- Title -->
        <div style="text-align: center; margin-bottom: 24px;">
            <h2 style="margin: 0; font-size: 16px; font-weight: 700; color: #0f172a; text-transform: uppercase; border-bottom: 1px dashed #cbd5e1; display: inline-block; padding-bottom: 4px;">{template['title']}</h2>
            {f"<p style='margin: 4px 0 0; font-size: 11px; font-weight: 600; color: #2563eb;'>Period: {period_month}</p>" if period_month else ""}
        </div>

        <!-- Staff Particulars Card -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px;">
            <tr>
                <td style="padding: 8px 12px; width: 25%; font-weight: 600; color: #475569;">Employee Name:</td>
                <td style="padding: 8px 12px; width: 25%; font-weight: 700; color: #0f172a;">{user.first_name} {user.last_name}</td>
                <td style="padding: 8px 12px; width: 25%; font-weight: 600; color: #475569;">Employee ID:</td>
                <td style="padding: 8px 12px; width: 25%; font-weight: 700; color: #1d4ed8;">{profile.employee_id}</td>
            </tr>
            <tr>
                <td style="padding: 8px 12px; font-weight: 600; color: #475569;">Staff Designation:</td>
                <td style="padding: 8px 12px; color: #1e293b;">{profile.staff_type} ({profile.department})</td>
                <td style="padding: 8px 12px; font-weight: 600; color: #475569;">Employment Type:</td>
                <td style="padding: 8px 12px; color: #1e293b; text-transform: capitalize;">{profile.employment_type.replace('_', ' ')}</td>
            </tr>
            <tr>
                <td style="padding: 8px 12px; font-weight: 600; color: #475569;">Joining Date:</td>
                <td style="padding: 8px 12px; color: #1e293b;">{profile.joining_date.strftime('%d-%m-%Y') if profile.joining_date else 'N/A'}</td>
                <td style="padding: 8px 12px; font-weight: 600; color: #475569;">Qualifications:</td>
                <td style="padding: 8px 12px; color: #1e293b;">{profile.qualification or 'N/A'}</td>
            </tr>
        </table>

        <!-- Body Content Customized by Category -->
        <div style="margin-bottom: 24px;">
    """

    if template["category"] == "Payroll & Employment":
        html_content += f"""
            <h3 style="font-size: 13px; font-weight: 700; color: #1e3a8a; margin: 0 0 10px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px;">Earnings & Deductions Summary ({period_month})</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 16px;">
                <thead>
                    <tr style="background: #f1f5f9; color: #334155;">
                        <th style="padding: 8px; border: 1px solid #e2e8f0; text-align: left; width: 35%;">Earnings Item</th>
                        <th style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; width: 15%;">Amount (₹)</th>
                        <th style="padding: 8px; border: 1px solid #e2e8f0; text-align: left; width: 35%;">Deduction Item</th>
                        <th style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; width: 15%;">Amount (₹)</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style="padding: 8px; border: 1px solid #e2e8f0;">Basic Remuneration</td>
                        <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right;">₹{basic:,.2f}</td>
                        <td style="padding: 8px; border: 1px solid #e2e8f0;">Provident Fund (PF)</td>
                        <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right;">₹{pf:,.2f}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; border: 1px solid #e2e8f0;">House Rent Allowance (HRA)</td>
                        <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right;">₹{hra:,.2f}</td>
                        <td style="padding: 8px; border: 1px solid #e2e8f0;">Professional Tax (PT)</td>
                        <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right;">₹{pt:,.2f}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; border: 1px solid #e2e8f0;">Dearness Allowance (DA)</td>
                        <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right;">₹{da:,.2f}</td>
                        <td style="padding: 8px; border: 1px solid #e2e8f0;">TDS / Withholding Tax</td>
                        <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right;">₹{tds:,.2f}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; border: 1px solid #e2e8f0;">Special Coaching Allowance</td>
                        <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right;">₹{allowance:,.2f}</td>
                        <td style="padding: 8px; border: 1px solid #e2e8f0; color: #94a3b8;">Other Deductions</td>
                        <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; color: #94a3b8;">₹0.00</td>
                    </tr>
                    <tr style="background: #f8fafc; font-weight: 700;">
                        <td style="padding: 8px; border: 1px solid #e2e8f0;">Gross Earnings</td>
                        <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; color: #166534;">₹{gross:,.2f}</td>
                        <td style="padding: 8px; border: 1px solid #e2e8f0;">Total Deductions</td>
                        <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; color: #991b1b;">₹{total_deductions:,.2f}</td>
                    </tr>
                </tbody>
            </table>
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 12px 16px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center;">
                <span style="font-weight: 700; color: #166534; font-size: 13px;">NET REMUNERATION PAYABLE:</span>
                <span style="font-size: 16px; font-weight: 800; color: #15803d;">₹{net_pay:,.2f}</span>
            </div>
        """
    elif template["category"] == "Academic & Teaching":
        html_content += f"""
            <h3 style="font-size: 13px; font-weight: 700; color: #1e3a8a; margin: 0 0 10px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px;">Assigned Batches & Course Workload</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 16px;">
                <thead>
                    <tr style="background: #f1f5f9; color: #334155;">
                        <th style="padding: 8px; border: 1px solid #e2e8f0; text-align: left;">Board</th>
                        <th style="padding: 8px; border: 1px solid #e2e8f0; text-align: left;">Class & Batch</th>
                        <th style="padding: 8px; border: 1px solid #e2e8f0; text-align: left;">Subject</th>
                        <th style="padding: 8px; border: 1px solid #e2e8f0; text-align: center;">Weekly Hours</th>
                        <th style="padding: 8px; border: 1px solid #e2e8f0; text-align: center;">Class Teacher</th>
                    </tr>
                </thead>
                <tbody>
                    {assignments_rows}
                </tbody>
            </table>
            <p style="font-size: 12px; color: #475569; margin: 8px 0;">This workload allocation has been confirmed by the Academic Steering Committee for the active {active_ay_name} academic session. Faculty members are required to maintain student attendance, deliver syllabus targets, and administer periodic chapter assessments.</p>
        """
    else:
        html_content += f"""
            <p style="font-size: 12px; color: #334155; line-height: 1.6; margin-bottom: 14px;">
                This document certifies the official institutional record for <strong>{user.first_name} {user.last_name}</strong> in the capacity of <strong>{profile.staff_type}</strong> ({profile.department}) at {inst_name}.
            </p>
            <p style="font-size: 12px; color: #334155; line-height: 1.6; margin-bottom: 14px;">
                All duties, rights, service agreements, and institutional code-of-conduct guidelines established under the PrathamOne Academy Governance Manual apply in full force.
            </p>
        """

    html_content += f"""
        </div>

        <!-- Signatures & Authorization Block -->
        <div style="margin-top: 48px; border-top: 1px solid #cbd5e1; padding-top: 24px; display: flex; justify-content: space-between; align-items: flex-end;">
            <div style="text-align: center; width: 200px;">
                <div style="height: 40px;"></div>
                <div style="border-top: 1px solid #475569; padding-top: 6px; font-weight: 600; font-size: 11px;">Staff / Faculty Signature</div>
            </div>
            <div style="text-align: center; width: 140px;">
                <div style="border: 1px solid #94a3b8; border-radius: 50%; width: 64px; height: 64px; margin: 0 auto; display: flex; align-items: center; justify-content: center; font-size: 9px; color: #64748b; font-weight: 700; text-transform: uppercase;">SEAL</div>
                <div style="margin-top: 4px; font-size: 10px; color: #64748b;">Official Institute Seal</div>
            </div>
            <div style="text-align: center; width: 200px;">
                <div style="height: 40px;"></div>
                <div style="border-top: 1px solid #475569; padding-top: 6px; font-weight: 700; font-size: 11px; color: #1e3a8a;">Principal / Director</div>
            </div>
        </div>

        <!-- Canonical Two-Row Global Print Footer Standard -->
        <footer data-testid="pratham-global-print-footer" class="pratham-global-print-footer" style="margin-top: 36px; padding-top: 10px; border-top: 1px solid #cbd5e1; width: 100%; box-sizing: border-box;">
            <!-- Row 1 (Right-Aligned): Standard Readable Dark-Grey Metadata -->
            <div data-testid="print-footer-row-1" style="display: flex; justify-content: flex-end; align-items: center; gap: 6px; font-size: 8pt; color: #475569; font-family: 'Inter', -apple-system, sans-serif; text-align: right; line-height: 1.3;">
                <span>Confidential</span>
                <span style="color: #94a3b8;">·</span>
                <span>Document ID: <strong style="font-family: monospace; font-weight: normal;">{ref_number}</strong></span>
                <span style="color: #94a3b8;">·</span>
                <span>Page 1 of 1</span>
            </div>
            <!-- Row 2 (Center-Aligned): Subtle Software Branding -->
            <div data-testid="print-footer-row-2" style="text-align: center; font-size: 6.5pt; color: #94a3b8; font-family: 'Inter', -apple-system, sans-serif; margin-top: 4px; letter-spacing: 0.015em; line-height: 1.2;">
                Generated by PrathamOne EduOS · © PrathamOne EduOS
            </div>
        </footer>
    </div>
    """

    return {
        "form_id": form_id,
        "title": template["title"],
        "category": template["category"],
        "reference_number": ref_number,
        "staff_name": f"{user.first_name} {user.last_name}",
        "employee_id": profile.employee_id,
        "html_content": html_content,
    }

# ─── 8. Dedicated Workforce & Lifecycle Endpoints ────────────────────────────

@router.get("/teachers/dashboard")
async def get_teacher_dashboard_endpoint(
    academic_year_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Computes dedicated live Teacher Workspace metrics, assignment classifications
    (assigned, unassigned, without timetable), teaching hours, and teacher listings.
    """
    inst_id = current_user.institution_id or 1
    return await get_teacher_workforce_dashboard(db, institution_id=inst_id, academic_year_id=academic_year_id)


@router.get("/non-teaching/dashboard")
async def get_non_teaching_dashboard_endpoint(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Computes dedicated live Staff Workspace metrics, department headcounts,
    designations, and administrative personnel listings.
    """
    inst_id = current_user.institution_id or 1
    return await get_staff_workforce_dashboard(db, institution_id=inst_id)


@router.post("/{user_id}/lifecycle")
async def update_staff_lifecycle_endpoint(
    user_id: int,
    payload: LifecycleUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(list(STAFF_ADMIN_ROLES))),
):
    """
    Executes authoritative employee lifecycle state transition:
    activate, put_on_leave, deactivate, resign, terminate, end_contract, or rehire.
    Records immutable event in StaffEmploymentHistory.
    """
    return await update_employee_lifecycle(
        db=db,
        user_id=user_id,
        action=payload.action,
        effective_date=payload.effective_date,
        reason=payload.reason,
        notes=payload.notes,
        rehire_eligible=payload.rehire_eligible if payload.rehire_eligible is not None else True,
        current_user_id=current_user.id,
    )


@router.get("/{user_id}/activity-history")
async def get_staff_activity_history_endpoint(
    user_id: int,
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Returns a unified, chronological employee activity timeline across status transitions,
    assignments, attendance, leaves, lectures, and payroll.
    """
    return await get_employee_activity_history(db, user_id=user_id, limit=limit)

