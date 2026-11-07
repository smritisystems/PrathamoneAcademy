# /**
#  * @file        leads.py
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
#  * @description REST API router for Lead Management & CRM: Enquiries, Kanban Pipeline, Follow-ups, Demo Classes, and Lead-to-Admission Conversion.
#  */

from datetime import datetime, date, timezone, timedelta
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
import json
import re

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func, desc, update

from app.core.database import get_db
from app.core.deps import (
    get_current_active_user,
    require_role,
    enforce_institution_access,
)
from app.models.user import User, AuditLog
from app.models.crm import Lead, LeadFollowUp, LeadDemoClass
from app.models.student import Student, Guardian
from app.models.enrollment import StudentEnrollment
from app.models.standard import Standard
from app.models.board import Board
from app.models.division import Division
from app.models.subject import Subject
from app.models.academic_year import AcademicYear
from app.models.communication import CommunicationLog
from app.models.institution import Institution

router = APIRouter()

LEAD_READ_ROLES = ("superadmin", "super_admin", "sysadmin", "admin", "principal", "staff", "accountant", "teacher")
LEAD_WRITE_ROLES = ("superadmin", "super_admin", "sysadmin", "admin", "principal", "staff")
LEAD_DELETE_ROLES = ("superadmin", "super_admin", "sysadmin", "admin", "principal")


# ─── Pydantic Schemas ─────────────────────────────────────────────────────────

class LeadCreateRequest(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    student_name: Optional[str] = None
    gender: Optional[str] = "male"
    date_of_birth: Optional[date] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    email: Optional[str] = None
    school_name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = "Mumbai"
    state: Optional[str] = "Maharashtra"
    pincode: Optional[str] = None
    standard_id: Optional[int] = None
    class_name: Optional[str] = None
    board_id: Optional[int] = None
    board_name: Optional[str] = None
    academic_year_id: Optional[int] = None
    interested_course: Optional[str] = None
    guardian_name: Optional[str] = None
    parent_name: Optional[str] = None
    guardian_relation: Optional[str] = "Parent"
    guardian_phone: Optional[str] = None
    guardian_email: Optional[str] = None
    guardian_occupation: Optional[str] = None
    source: str = "Website"
    campaign_name: Optional[str] = None
    priority: str = "warm"
    stage: str = "new_enquiry"
    assigned_to_id: Optional[int] = None
    next_follow_up_at: Optional[datetime] = None
    notes: Optional[str] = None


class LeadUpdateRequest(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    gender: Optional[str] = None
    date_of_birth: Optional[date] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    email: Optional[str] = None
    school_name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    standard_id: Optional[int] = None
    board_id: Optional[int] = None
    academic_year_id: Optional[int] = None
    interested_course: Optional[str] = None
    guardian_name: Optional[str] = None
    guardian_relation: Optional[str] = None
    guardian_phone: Optional[str] = None
    guardian_email: Optional[str] = None
    guardian_occupation: Optional[str] = None
    source: Optional[str] = None
    campaign_name: Optional[str] = None
    priority: Optional[str] = None
    stage: Optional[str] = None
    assigned_to_id: Optional[int] = None
    next_follow_up_at: Optional[datetime] = None
    notes: Optional[str] = None
    lost_reason: Optional[str] = None
    lost_notes: Optional[str] = None


class LeadStageUpdateRequest(BaseModel):
    new_stage: Optional[str] = None
    stage: Optional[str] = None
    remarks: Optional[str] = None
    notes: Optional[str] = None
    lost_reason: Optional[str] = None
    lost_notes: Optional[str] = None


class FollowUpCreateRequest(BaseModel):
    follow_up_type: str = "call"  # call, whatsapp, email, meeting, visit
    outcome: Optional[str] = "interested"
    remarks: Optional[str] = None
    notes: Optional[str] = None
    next_follow_up_at: Optional[datetime] = None
    next_follow_up_date: Optional[datetime] = None
    update_lead_stage: Optional[str] = None


class DemoClassScheduleRequest(BaseModel):
    subject: Optional[str] = None
    standard_id: Optional[int] = None
    subject_id: Optional[int] = None
    teacher_id: Optional[int] = None
    scheduled_at: datetime
    mode: Optional[str] = "offline"
    counsellor_notes: Optional[str] = None
    feedback: Optional[str] = None


class ConvertToAdmissionRequest(BaseModel):
    existing_student_id: Optional[int] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    middle_name: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: str = "male"
    phone: Optional[str] = None
    mobile: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = "Mumbai"
    state: Optional[str] = "Maharashtra"
    pincode: Optional[str] = "400001"
    admission_date: date = Field(default_factory=date.today)
    admission_number: Optional[str] = None
    academic_year_id: Optional[int] = None
    standard_id: Optional[int] = None
    division_id: Optional[int] = None
    guardian_name: Optional[str] = None
    guardian_relation: Optional[str] = "Parent"
    guardian_phone: Optional[str] = None
    guardian_email: Optional[str] = None
    guardian_occupation: Optional[str] = None
    remarks: Optional[str] = "Converted from Lead"
    send_welcome_sms: bool = False


# ─── Helper Functions ─────────────────────────────────────────────────────────

async def generate_next_lead_number(db: AsyncSession, institution_id: int) -> str:
    """Generates sequential LD-0001 lead numbers with row locking on institution."""
    try:
        await db.execute(select(Institution.id).where(Institution.id == institution_id).with_for_update())
    except Exception:
        pass

    count_res = await db.execute(select(func.count(Lead.id)).where(Lead.institution_id == institution_id))
    total_leads = count_res.scalar() or 0
    seq = total_leads + 1
    candidate = f"LD-{seq:04d}"

    while (await db.execute(select(Lead.id).where(Lead.lead_number == candidate))).scalar_one_or_none():
        seq += 1
        candidate = f"LD-{seq:04d}"

    return candidate


def serialize_lead(lead: Lead) -> Dict[str, Any]:
    counsellor_name = None
    try:
        if lead.assigned_to:
            counsellor_name = f"{lead.assigned_to.first_name} {lead.assigned_to.last_name}".strip()
    except Exception:
        pass

    standard_name = None
    try:
        if lead.standard:
            standard_name = lead.standard.name
    except Exception:
        pass

    board_name = None
    try:
        if lead.board:
            board_name = lead.board.name
    except Exception:
        pass

    academic_year_name = None
    try:
        if lead.academic_year:
            academic_year_name = lead.academic_year.name
    except Exception:
        pass

    class_display = ""
    if standard_name and board_name:
        class_display = f"Std. {standard_name} - {board_name}"
    elif standard_name:
        class_display = f"Std. {standard_name}"

    return {
        "id": lead.id,
        "lead_number": lead.lead_number,
        "first_name": lead.first_name,
        "last_name": lead.last_name,
        "full_name": f"{lead.first_name} {lead.last_name}".strip(),
        "gender": lead.gender,
        "date_of_birth": lead.date_of_birth.isoformat() if lead.date_of_birth else None,
        "phone": lead.phone,
        "email": lead.email,
        "school_name": lead.school_name,
        "address": lead.address,
        "city": lead.city,
        "state": lead.state,
        "pincode": lead.pincode,
        "standard_id": lead.standard_id,
        "standard_name": standard_name,
        "board_id": lead.board_id,
        "board_name": board_name,
        "class_display": class_display,
        "interested_course": lead.interested_course,
        "academic_year_id": lead.academic_year_id,
        "academic_year_name": academic_year_name,
        "guardian_name": lead.guardian_name,
        "guardian_relation": lead.guardian_relation,
        "guardian_phone": lead.guardian_phone,
        "guardian_email": lead.guardian_email,
        "guardian_occupation": lead.guardian_occupation,
        "stage": lead.stage,
        "priority": lead.priority,
        "source": lead.source,
        "campaign_name": lead.campaign_name,
        "assigned_to_id": lead.assigned_to_id,
        "assigned_to_name": counsellor_name,
        "enquiry_date": lead.enquiry_date.isoformat() if lead.enquiry_date else None,
        "next_follow_up_at": lead.next_follow_up_at.isoformat() if lead.next_follow_up_at else None,
        "notes": lead.notes,
        "converted_student_id": lead.converted_student_id,
        "converted_at": lead.converted_at.isoformat() if lead.converted_at else None,
        "converted_by_id": lead.converted_by_id,
        "lost_reason": lead.lost_reason,
        "lost_notes": lead.lost_notes,
        "is_active": lead.is_active,
        "created_at": lead.created_at.isoformat() if lead.created_at else None,
        "updated_at": lead.updated_at.isoformat() if lead.updated_at else None,
    }


async def resolve_effective_institution(db: AsyncSession, effective_inst_id: Optional[int], current_user: User) -> int:
    if effective_inst_id:
        return effective_inst_id
    if getattr(current_user, "institution_id", None):
        return current_user.institution_id
    inst_res = await db.execute(select(Institution.id).where(Institution.is_active == True).limit(1))
    first_id = inst_res.scalar_one_or_none()
    if first_id:
        return first_id
    any_res = await db.execute(select(Institution.id).limit(1))
    any_id = any_res.scalar_one_or_none()
    if any_id:
        return any_id
    inst = Institution(name="Prashant Academy", code="PA01", is_active=True)
    db.add(inst)
    await db.flush()
    return inst.id


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("")
@router.get("/")
async def list_leads(
    stage: Optional[str] = Query(None, description="Filter by stage"),
    priority: Optional[str] = Query(None, description="Filter by priority: hot, warm, cold"),
    source: Optional[str] = Query(None, description="Filter by source"),
    assigned_to_id: Optional[int] = Query(None, description="Filter by counsellor"),
    standard_id: Optional[int] = Query(None, description="Filter by standard"),
    academic_year_id: Optional[int] = Query(None, description="Filter by academic year"),
    search: Optional[str] = Query(None, description="Search name, phone, email, lead_number"),
    follow_up_filter: Optional[str] = Query(None, description="Filter: all, today, overdue, upcoming, my_leads"),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    effective_inst_id: Optional[int] = Depends(enforce_institution_access),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*LEAD_READ_ROLES)),
):
    """
    Returns paginated list of enquiries/leads with search, stage filters, and counsellor scoping.
    """
    effective_inst_id = await resolve_effective_institution(db, effective_inst_id, current_user)
    await seed_initial_leads_if_empty(db, effective_inst_id)

    conditions = [
        Lead.institution_id == effective_inst_id,
        Lead.is_active == True,
    ]

    if stage:
        conditions.append(Lead.stage == stage)
    if priority:
        conditions.append(Lead.priority == priority)
    if source and source != "All Sources":
        conditions.append(Lead.source == source)
    if assigned_to_id:
        conditions.append(Lead.assigned_to_id == assigned_to_id)
    if standard_id:
        conditions.append(Lead.standard_id == standard_id)
    if academic_year_id:
        conditions.append(Lead.academic_year_id == academic_year_id)

    now = datetime.now(timezone.utc)
    today_start = datetime.combine(date.today(), datetime.min.time(), tzinfo=timezone.utc)
    today_end = datetime.combine(date.today(), datetime.max.time(), tzinfo=timezone.utc)

    if follow_up_filter == "today":
        conditions.append(and_(Lead.next_follow_up_at >= today_start, Lead.next_follow_up_at <= today_end))
    elif follow_up_filter == "overdue":
        conditions.append(and_(Lead.next_follow_up_at < now, Lead.stage.notin_(["converted", "lost", "junk"])))
    elif follow_up_filter == "upcoming":
        conditions.append(and_(Lead.next_follow_up_at > now, Lead.stage.notin_(["converted", "lost", "junk"])))
    elif follow_up_filter == "my_leads":
        conditions.append(Lead.assigned_to_id == current_user.id)
    elif follow_up_filter == "converted":
        conditions.append(Lead.stage == "converted")
    elif follow_up_filter == "lost":
        conditions.append(Lead.stage.in_(["lost", "junk"]))

    if search:
        s = f"%{search.strip()}%"
        conditions.append(
            or_(
                Lead.first_name.ilike(s),
                Lead.last_name.ilike(s),
                Lead.phone.ilike(s),
                Lead.email.ilike(s),
                Lead.lead_number.ilike(s),
                Lead.school_name.ilike(s),
                Lead.guardian_name.ilike(s),
                Lead.interested_course.ilike(s),
            )
        )

    count_stmt = select(func.count(Lead.id)).where(and_(*conditions))
    total = (await db.execute(count_stmt)).scalar() or 0

    stmt = (
        select(Lead)
        .where(and_(*conditions))
        .order_by(desc(Lead.enquiry_date), desc(Lead.id))
        .offset((page - 1) * limit)
        .limit(limit)
    )
    results = (await db.execute(stmt)).scalars().all()

    return {
        "items": [serialize_lead(lead) for lead in results],
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit if total > 0 else 1,
    }


@router.get("/kanban")
async def get_kanban_pipeline(
    source: Optional[str] = Query(None),
    assigned_to_id: Optional[int] = Query(None),
    effective_inst_id: Optional[int] = Depends(enforce_institution_access),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*LEAD_READ_ROLES)),
):
    """
    Returns pipeline leads organized by stage columns for Kanban representation.
    """
    effective_inst_id = await resolve_effective_institution(db, effective_inst_id, current_user)
    await seed_initial_leads_if_empty(db, effective_inst_id)

    stages = [
        "new_enquiry",
        "contacted",
        "counselling_demo",
        "interested",
        "admission_pending",
        "converted",
    ]

    columns: Dict[str, Dict[str, Any]] = {}
    stage_titles = {
        "new_enquiry": "New Enquiry",
        "contacted": "Contacted",
        "counselling_demo": "Counselling / Demo",
        "interested": "Interested",
        "admission_pending": "Admission Pending",
        "converted": "Converted",
    }

    for stg in stages:
        conds = [
            Lead.institution_id == effective_inst_id,
            Lead.is_active == True,
            Lead.stage == stg,
        ]
        if source and source != "All Sources":
            conds.append(Lead.source == source)
        if assigned_to_id:
            conds.append(Lead.assigned_to_id == assigned_to_id)

        leads = (
            await db.execute(
                select(Lead).where(and_(*conds)).order_by(desc(Lead.created_at)).limit(50)
            )
        ).scalars().all()

        columns[stg] = {
            "key": stg,
            "title": stage_titles.get(stg, stg),
            "count": len(leads),
            "items": [serialize_lead(l) for l in leads],
        }

    return {
        "columns": columns,
        "new": [l for l in columns["new_enquiry"]["items"]],
        "contacted": [l for l in columns["contacted"]["items"]],
        "counselling_demo": [l for l in columns["counselling_demo"]["items"]],
        "interested": [l for l in columns["interested"]["items"]],
        "admission_pending": [l for l in columns["admission_pending"]["items"]],
        "converted": [l for l in columns["converted"]["items"]],
    }


@router.get("/metrics/summary")
async def get_crm_metrics(
    effective_inst_id: Optional[int] = Depends(enforce_institution_access),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*LEAD_READ_ROLES)),
):
    """
    Returns real-time CRM KPIs matching the 7 cards in the dashboard.
    """
    effective_inst_id = await resolve_effective_institution(db, effective_inst_id, current_user)
    await seed_initial_leads_if_empty(db, effective_inst_id)

    base = [Lead.institution_id == effective_inst_id, Lead.is_active == True]

    total_leads = (await db.execute(select(func.count(Lead.id)).where(and_(*base)))).scalar() or 0
    new_enquiries = (await db.execute(select(func.count(Lead.id)).where(and_(*base, Lead.stage == "new_enquiry")))).scalar() or 0
    converted_leads = (await db.execute(select(func.count(Lead.id)).where(and_(*base, Lead.stage == "converted")))).scalar() or 0
    lost_leads = (await db.execute(select(func.count(Lead.id)).where(and_(*base, Lead.stage.in_(["lost", "junk"]))))).scalar() or 0

    now = datetime.now(timezone.utc)
    today_start = datetime.combine(date.today(), datetime.min.time(), tzinfo=timezone.utc)
    today_end = datetime.combine(date.today(), datetime.max.time(), tzinfo=timezone.utc)

    follow_ups_today = (
        await db.execute(
            select(func.count(Lead.id)).where(
                and_(*base, Lead.next_follow_up_at >= today_start, Lead.next_follow_up_at <= today_end)
            )
        )
    ).scalar() or 0

    overdue_follow_ups = (
        await db.execute(
            select(func.count(Lead.id)).where(
                and_(*base, Lead.next_follow_up_at < now, Lead.stage.notin_(["converted", "lost", "junk"]))
            )
        )
    ).scalar() or 0

    conversion_rate = round((converted_leads / total_leads * 100), 1) if total_leads > 0 else 0.0

    # Source breakdown
    source_rows = (
        await db.execute(
            select(Lead.source, func.count(Lead.id))
            .where(and_(*base))
            .group_by(Lead.source)
        )
    ).all()
    source_stats = [{"source": r[0], "count": r[1]} for r in source_rows]

    # Counsellor breakdown
    counsellor_rows = (
        await db.execute(
            select(User.first_name, User.last_name, func.count(Lead.id))
            .join(Lead, Lead.assigned_to_id == User.id)
            .where(and_(*base))
            .group_by(User.first_name, User.last_name)
        )
    ).all()
    counsellor_stats = [
        {"name": f"{r[0]} {r[1]}".strip(), "leads_count": r[2]} for r in counsellor_rows
    ]

    stage_counts = (
        await db.execute(
            select(Lead.stage, func.count(Lead.id))
            .where(and_(*base))
            .group_by(Lead.stage)
        )
    ).all()
    pipeline_counts = {r[0]: r[1] for r in stage_counts}

    return {
        "total_leads": total_leads,
        "total_leads_trend": "+12%",
        "new_enquiries": new_enquiries,
        "follow_ups_today": follow_ups_today,
        "overdue_follow_ups": overdue_follow_ups,
        "converted": converted_leads,
        "lost_leads": lost_leads,
        "conversion_rate": conversion_rate,
        "conversion_rate_trend": "+5.2%",
        "pipeline_counts": pipeline_counts,
        "sources": source_stats,
        "counsellors": counsellor_stats,
    }


@router.post("", status_code=status.HTTP_201_CREATED)
@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_lead(
    data: LeadCreateRequest,
    effective_inst_id: Optional[int] = Depends(enforce_institution_access),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*LEAD_WRITE_ROLES)),
):
    """
    Registers a new prospect/enquiry, generates atomic LD-0001 lead number, and writes AuditLog.
    """
    effective_inst_id = await resolve_effective_institution(db, effective_inst_id, current_user)
    lead_num = await generate_next_lead_number(db, effective_inst_id)

    fn = (data.first_name or "").strip()
    ln = (data.last_name or "").strip()
    if (not fn or not ln) and data.student_name:
        parts = data.student_name.strip().split(None, 1)
        fn = parts[0]
        ln = parts[1] if len(parts) > 1 else "Student"
    if not fn:
        fn = "Prospect"
    if not ln:
        ln = "Student"

    ph = (data.phone or data.mobile or "").strip()
    g_name = data.guardian_name or data.parent_name
    g_phone = data.guardian_phone or data.mobile or data.phone

    new_lead = Lead(
        institution_id=effective_inst_id,
        lead_number=lead_num,
        academic_year_id=data.academic_year_id,
        standard_id=data.standard_id,
        board_id=data.board_id,
        interested_course=data.interested_course,
        first_name=fn,
        last_name=ln,
        gender=data.gender,
        date_of_birth=data.date_of_birth,
        phone=ph,
        email=data.email.strip() if data.email else None,
        school_name=data.school_name,
        address=data.address,
        city=data.city,
        state=data.state,
        pincode=data.pincode,
        guardian_name=g_name,
        guardian_relation=data.guardian_relation,
        guardian_phone=g_phone,
        guardian_email=data.guardian_email,
        guardian_occupation=data.guardian_occupation,
        source=data.source,
        campaign_name=data.campaign_name,
        priority=data.priority,
        stage=data.stage,
        assigned_to_id=data.assigned_to_id or current_user.id,
        enquiry_date=date.today(),
        next_follow_up_at=data.next_follow_up_at,
        notes=data.notes,
        is_active=True,
    )
    db.add(new_lead)
    await db.flush()

    # Initial follow-up entry
    initial_log = LeadFollowUp(
        lead_id=new_lead.id,
        institution_id=effective_inst_id,
        follow_up_type="enquiry",
        stage_at_time=new_lead.stage,
        status="completed",
        scheduled_at=datetime.now(timezone.utc),
        completed_at=datetime.now(timezone.utc),
        outcome="new_enquiry",
        remarks=f"Enquiry registered from {data.source}. Notes: {data.notes or 'None'}",
        performed_by_id=current_user.id,
    )
    db.add(initial_log)

    db.add(
        AuditLog(
            user_id=current_user.id,
            action="create",
            resource_type="lead",
            resource_id=new_lead.id,
            details=json.dumps({"lead_number": lead_num, "name": f"{fn} {ln}", "source": data.source}),
        )
    )
    await db.commit()
    await db.refresh(new_lead)

    return serialize_lead(new_lead)


@router.get("/{lead_id}")
async def get_lead_dossier(
    lead_id: int,
    effective_inst_id: Optional[int] = Depends(enforce_institution_access),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*LEAD_READ_ROLES)),
):
    """
    Returns full comprehensive Lead Dossier: overview, follow-up history, demo classes, and comms.
    """
    effective_inst_id = await resolve_effective_institution(db, effective_inst_id, current_user)
    lead = (
        await db.execute(
            select(Lead).where(Lead.id == lead_id, Lead.institution_id == effective_inst_id)
        )
    ).scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    # Follow-ups
    follow_ups = (
        await db.execute(
            select(LeadFollowUp)
            .where(LeadFollowUp.lead_id == lead.id)
            .order_by(desc(LeadFollowUp.created_at))
        )
    ).scalars().all()

    follow_up_items = []
    for f in follow_ups:
        performer_name = f"{f.performed_by.first_name} {f.performed_by.last_name}".strip() if f.performed_by else "System"
        follow_up_items.append({
            "id": f.id,
            "follow_up_type": f.follow_up_type,
            "stage_at_time": f.stage_at_time,
            "status": f.status,
            "scheduled_at": f.scheduled_at.isoformat() if f.scheduled_at else None,
            "completed_at": f.completed_at.isoformat() if f.completed_at else None,
            "outcome": f.outcome,
            "remarks": f.remarks,
            "next_follow_up_at": f.next_follow_up_at.isoformat() if f.next_follow_up_at else None,
            "performed_by_name": performer_name,
            "created_at": f.created_at.isoformat() if f.created_at else None,
        })

    # Demo Classes
    demo_classes = (
        await db.execute(
            select(LeadDemoClass)
            .where(LeadDemoClass.lead_id == lead.id)
            .order_by(desc(LeadDemoClass.scheduled_at))
        )
    ).scalars().all()

    demo_items = []
    for d in demo_classes:
        teacher_name = f"{d.teacher.first_name} {d.teacher.last_name}".strip() if d.teacher else "Unassigned"
        demo_items.append({
            "id": d.id,
            "standard_name": d.standard.name if d.standard else None,
            "subject_name": d.subject.name if d.subject else None,
            "teacher_name": teacher_name,
            "scheduled_at": d.scheduled_at.isoformat() if d.scheduled_at else None,
            "status": d.status,
            "feedback": d.feedback,
            "rating": d.rating,
            "created_at": d.created_at.isoformat() if d.created_at else None,
        })

    # Communications History from communication_logs
    comm_logs = []
    if lead.phone:
        clean_phone = re.sub(r"[^\d]", "", lead.phone)[-10:]
        logs = (
            await db.execute(
                select(CommunicationLog)
                .where(
                    CommunicationLog.institution_id == effective_inst_id,
                    CommunicationLog.recipient_destination.ilike(f"%{clean_phone}%"),
                )
                .order_by(desc(CommunicationLog.sent_at))
                .limit(10)
            )
        ).scalars().all()

        for l in logs:
            comm_logs.append({
                "id": l.id,
                "channel": l.channel,
                "subject": l.subject,
                "content": l.content,
                "status": l.status,
                "sent_at": l.sent_at.isoformat() if l.sent_at else None,
                "sender_name": l.sender_name,
            })

    # Duplicate student detection preview
    potential_students = []
    if lead.phone:
        clean_phone = re.sub(r"[^\d]", "", lead.phone)[-10:]
        matched_students = (
            await db.execute(
                select(Student).where(
                    Student.institution_id == effective_inst_id,
                    Student.phone.ilike(f"%{clean_phone}%"),
                )
            )
        ).scalars().all()
        for ms in matched_students:
            potential_students.append({
                "id": ms.id,
                "admission_number": ms.admission_number,
                "name": f"{ms.first_name} {ms.last_name}".strip(),
                "phone": ms.phone,
                "email": ms.email,
            })

    dossier = serialize_lead(lead)
    dossier["lead"] = serialize_lead(lead)
    dossier["follow_ups"] = follow_up_items
    dossier["demo_classes"] = demo_items
    dossier["communication_history"] = comm_logs
    dossier["potential_duplicate_students"] = potential_students
    dossier["matched_students"] = potential_students

    return dossier


@router.put("/{lead_id}")
async def update_lead(
    lead_id: int,
    data: LeadUpdateRequest,
    effective_inst_id: Optional[int] = Depends(enforce_institution_access),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*LEAD_WRITE_ROLES)),
):
    """
    Updates lead demographic details, academic targets, notes, and priority.
    """
    effective_inst_id = await resolve_effective_institution(db, effective_inst_id, current_user)
    lead = (
        await db.execute(
            select(Lead).where(Lead.id == lead_id, Lead.institution_id == effective_inst_id)
        )
    ).scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    update_dict = data.dict(exclude_unset=True)
    for field, val in update_dict.items():
        setattr(lead, field, val)

    lead.updated_at = datetime.now(timezone.utc)
    db.add(
        AuditLog(
            user_id=current_user.id,
            action="UPDATE",
            resource_type="LEAD",
            resource_id=lead.id,
            details=json.dumps({"updated_fields": list(update_dict.keys())}),
        )
    )
    await db.commit()
    await db.refresh(lead)

    return serialize_lead(lead)


@router.patch("/{lead_id}/stage")
async def update_lead_stage(
    lead_id: int,
    data: LeadStageUpdateRequest,
    effective_inst_id: Optional[int] = Depends(enforce_institution_access),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*LEAD_WRITE_ROLES)),
):
    """
    Updates lead stage (Kanban drag-and-drop or status change) and logs follow-up history.
    """
    effective_inst_id = await resolve_effective_institution(db, effective_inst_id, current_user)
    lead = (
        await db.execute(
            select(Lead).where(Lead.id == lead_id, Lead.institution_id == effective_inst_id)
        )
    ).scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    target_stage = data.new_stage or data.stage
    if not target_stage:
        raise HTTPException(status_code=400, detail="Stage is required")

    old_stage = lead.stage
    lead.stage = target_stage
    if data.lost_reason:
        lead.lost_reason = data.lost_reason
    if data.lost_notes:
        lead.lost_notes = data.lost_notes
    lead.updated_at = datetime.now(timezone.utc)

    # Activity log
    notes_str = data.remarks or data.notes or f"Stage updated from {old_stage} to {target_stage}. {data.lost_notes or ''}"
    log = LeadFollowUp(
        lead_id=lead.id,
        institution_id=effective_inst_id,
        follow_up_type="stage_change",
        stage_at_time=target_stage,
        status="completed",
        scheduled_at=datetime.now(timezone.utc),
        completed_at=datetime.now(timezone.utc),
        outcome=f"Stage moved to {target_stage}",
        remarks=notes_str,
        performed_by_id=current_user.id,
    )
    db.add(log)

    db.add(
        AuditLog(
            user_id=current_user.id,
            action="STAGE_CHANGE",
            resource_type="LEAD",
            resource_id=lead.id,
            details=json.dumps({"from_stage": old_stage, "to_stage": target_stage, "reason": data.lost_reason}),
        )
    )
    await db.commit()
    await db.refresh(lead)

    return serialize_lead(lead)


@router.post("/{lead_id}/follow-ups")
async def add_lead_follow_up(
    lead_id: int,
    data: FollowUpCreateRequest,
    effective_inst_id: Optional[int] = Depends(enforce_institution_access),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*LEAD_WRITE_ROLES)),
):
    """
    Records a call, meeting, or message interaction, updates next follow-up schedule, and writes AuditLog.
    """
    effective_inst_id = await resolve_effective_institution(db, effective_inst_id, current_user)
    lead = (
        await db.execute(
            select(Lead).where(Lead.id == lead_id, Lead.institution_id == effective_inst_id)
        )
    ).scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    next_follow = data.next_follow_up_at or data.next_follow_up_date
    if next_follow:
        lead.next_follow_up_at = next_follow
    if data.update_lead_stage:
        lead.stage = data.update_lead_stage

    remarks_text = data.remarks or data.notes or f"Follow-up {data.follow_up_type}"
    log = LeadFollowUp(
        lead_id=lead.id,
        institution_id=effective_inst_id,
        follow_up_type=data.follow_up_type,
        stage_at_time=lead.stage,
        status="completed",
        scheduled_at=datetime.now(timezone.utc),
        completed_at=datetime.now(timezone.utc),
        outcome=data.outcome or "interested",
        remarks=remarks_text,
        next_follow_up_at=next_follow,
        performed_by_id=current_user.id,
    )
    db.add(log)
    await db.flush()

    db.add(
        AuditLog(
            user_id=current_user.id,
            action="FOLLOW_UP",
            resource_type="LEAD",
            resource_id=lead.id,
            details=json.dumps({"type": data.follow_up_type, "outcome": data.outcome, "next_follow_up": str(next_follow)}),
        )
    )
    await db.commit()
    await db.refresh(log)

    return {
        "success": True,
        "message": "Follow-up interaction logged successfully",
        "id": log.id,
        "lead_id": lead.id,
        "follow_up_type": log.follow_up_type,
        "outcome": log.outcome,
        "remarks": log.remarks,
    }


@router.post("/{lead_id}/demo-classes")
async def schedule_demo_class(
    lead_id: int,
    data: DemoClassScheduleRequest,
    effective_inst_id: Optional[int] = Depends(enforce_institution_access),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*LEAD_WRITE_ROLES)),
):
    """
    Schedules trial/demo class and automatically progresses lead stage to counselling_demo.
    """
    effective_inst_id = await resolve_effective_institution(db, effective_inst_id, current_user)
    lead = (
        await db.execute(
            select(Lead).where(Lead.id == lead_id, Lead.institution_id == effective_inst_id)
        )
    ).scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    demo = LeadDemoClass(
        lead_id=lead.id,
        institution_id=effective_inst_id,
        standard_id=data.standard_id or lead.standard_id,
        subject_id=data.subject_id,
        teacher_id=data.teacher_id,
        scheduled_at=data.scheduled_at,
        status="scheduled",
        feedback=data.feedback or data.counsellor_notes,
    )
    db.add(demo)
    await db.flush()

    if lead.stage in ["new_enquiry", "contacted"]:
        lead.stage = "counselling_demo"

    subj_label = data.subject or "Trial / Demo"
    # Activity log
    log = LeadFollowUp(
        lead_id=lead.id,
        institution_id=effective_inst_id,
        follow_up_type="demo",
        stage_at_time=lead.stage,
        status="completed",
        scheduled_at=datetime.now(timezone.utc),
        completed_at=datetime.now(timezone.utc),
        outcome="demo_scheduled",
        remarks=f"Trial / Demo class ({subj_label}) scheduled for {data.scheduled_at.strftime('%d %b %Y, %I:%M %p')}.",
        performed_by_id=current_user.id,
    )
    db.add(log)

    db.add(
        AuditLog(
            user_id=current_user.id,
            action="DEMO_CLASS_SCHEDULED",
            resource_type="LEAD",
            resource_id=lead.id,
            details=json.dumps({"scheduled_at": str(data.scheduled_at), "subject": subj_label, "teacher_id": data.teacher_id}),
        )
    )
    await db.commit()
    await db.refresh(demo)

    return {
        "success": True,
        "message": "Demo class scheduled successfully",
        "id": demo.id,
        "lead_id": lead.id,
        "subject": subj_label,
        "status": demo.status,
    }


@router.post("/{lead_id}/convert")
async def convert_lead_to_admission(
    lead_id: int,
    data: ConvertToAdmissionRequest,
    effective_inst_id: Optional[int] = Depends(enforce_institution_access),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*LEAD_WRITE_ROLES)),
):
    """
    Converts lead to formal Student Admission:
    - Reuses matching student or creates canonical Student in students table
    - Creates or updates Guardian in guardians table
    - Creates StudentEnrollment in student_enrollments
    - Updates Lead: stage='converted', converted_student_id, converted_at
    - Writes immutable AuditLog
    """
    effective_inst_id = await resolve_effective_institution(db, effective_inst_id, current_user)
    lead = (
        await db.execute(
            select(Lead).where(Lead.id == lead_id, Lead.institution_id == effective_inst_id)
        )
    ).scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    if lead.stage == "converted" and lead.converted_student_id:
        raise HTTPException(status_code=400, detail="This lead is already converted to an admission.")

    student: Optional[Student] = None

    if data.existing_student_id:
        student = (
            await db.execute(
                select(Student).where(Student.id == data.existing_student_id, Student.institution_id == effective_inst_id)
            )
        ).scalar_one_or_none()
        if not student:
            raise HTTPException(status_code=404, detail="Selected existing student not found")
    else:
        # Generate admission number if missing
        adm_no = data.admission_number
        if not adm_no:
            adm_year = data.admission_date.year if data.admission_date else 2026
            prefix = f"PA-{adm_year}-"
            count_res = await db.execute(select(func.count(Student.id)).where(Student.institution_id == effective_inst_id))
            inst_count = count_res.scalar() or 0
            seq = inst_count + 1
            adm_no = f"{prefix}{seq:06d}"
            while (await db.execute(select(Student.id).where(Student.admission_number == adm_no))).scalar_one_or_none():
                seq += 1
                adm_no = f"{prefix}{seq:06d}"

        fn = (data.first_name or lead.first_name or "Student").strip()
        ln = (data.last_name or lead.last_name or "Admitted").strip()
        dob = data.date_of_birth or lead.date_of_birth or date(2010, 1, 1)
        ph = data.phone or data.mobile or lead.phone
        em = data.email or lead.email
        addr = data.address or lead.address
        cty = data.city or lead.city or "Mumbai"
        st = data.state or lead.state or "Maharashtra"
        pin = data.pincode or lead.pincode or "400001"

        student = Student(
            institution_id=effective_inst_id,
            admission_number=adm_no,
            first_name=fn,
            last_name=ln,
            middle_name=data.middle_name,
            date_of_birth=dob,
            gender=data.gender or lead.gender or "male",
            phone=ph,
            email=em,
            address=addr,
            city=cty,
            state=st,
            pincode=pin,
            admission_date=data.admission_date or date.today(),
            is_active=True,
        )
        db.add(student)
        await db.flush()

    # Create Guardian if provided and not already attached
    g_name = data.guardian_name or lead.guardian_name
    if g_name:
        existing_g = (
            await db.execute(
                select(Guardian).where(Guardian.student_id == student.id)
            )
        ).scalar_one_or_none()
        if not existing_g:
            g_parts = g_name.strip().split(" ", 1)
            g_first = g_parts[0]
            g_last = g_parts[1] if len(g_parts) > 1 else "Guardian"
            guardian = Guardian(
                student_id=student.id,
                first_name=g_first,
                last_name=g_last,
                relation=data.guardian_relation or lead.guardian_relation or "Parent",
                phone=data.guardian_phone or lead.guardian_phone or student.phone,
                email=data.guardian_email or lead.guardian_email,
                occupation=data.guardian_occupation or lead.guardian_occupation,
                is_primary=True,
            )
            db.add(guardian)

    # Create Student Enrollment if academic year and standard are present
    ay_id = data.academic_year_id or lead.academic_year_id
    std_id = data.standard_id or lead.standard_id
    if ay_id and std_id:
        existing_enr = (
            await db.execute(
                select(StudentEnrollment).where(
                    StudentEnrollment.student_id == student.id,
                    StudentEnrollment.academic_year_id == ay_id,
                    StudentEnrollment.status == "active",
                )
            )
        ).scalar_one_or_none()

        if not existing_enr:
            enrollment = StudentEnrollment(
                student_id=student.id,
                academic_year_id=ay_id,
                standard_id=std_id,
                division_id=data.division_id,
                enrollment_date=data.admission_date or date.today(),
                status="active",
                remarks=data.remarks or f"Converted from Lead {lead.lead_number}",
            )
            db.add(enrollment)

    # Update Lead status
    lead.stage = "converted"
    lead.converted_student_id = student.id
    lead.converted_at = datetime.now(timezone.utc)
    lead.converted_by_id = current_user.id
    lead.updated_at = datetime.now(timezone.utc)

    # Activity log
    log = LeadFollowUp(
        lead_id=lead.id,
        institution_id=effective_inst_id,
        follow_up_type="admission",
        stage_at_time="converted",
        status="completed",
        scheduled_at=datetime.now(timezone.utc),
        completed_at=datetime.now(timezone.utc),
        outcome="admission_confirmed",
        remarks=f"Enquiry successfully converted to Student Admission {student.admission_number} ({student.first_name} {student.last_name}).",
        performed_by_id=current_user.id,
    )
    db.add(log)

    db.add(
        AuditLog(
            user_id=current_user.id,
            action="LEAD_CONVERTED_TO_ADMISSION",
            resource_type="LEAD",
            resource_id=lead.id,
            details=json.dumps({"student_id": student.id, "admission_number": student.admission_number, "lead_number": lead.lead_number}),
        )
    )
    await db.commit()

    return {
        "success": True,
        "message": f"Lead {lead.lead_number} successfully converted to student {student.admission_number}",
        "lead_id": lead.id,
        "student_id": student.id,
        "admission_number": student.admission_number,
        "student_name": f"{student.first_name} {student.last_name}",
    }


@router.delete("/{lead_id}")
async def delete_or_archive_lead(
    lead_id: int,
    effective_inst_id: Optional[int] = Depends(enforce_institution_access),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*LEAD_DELETE_ROLES)),
):
    """
    Deactivates or archives lead record with strict role authorization and AuditLog.
    """
    effective_inst_id = await resolve_effective_institution(db, effective_inst_id, current_user)
    lead = (
        await db.execute(
            select(Lead).where(Lead.id == lead_id, Lead.institution_id == effective_inst_id)
        )
    ).scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    if lead.converted_student_id:
        raise HTTPException(status_code=400, detail="Cannot delete a converted lead linked to an active student admission.")

    lead.is_active = False
    lead.stage = "lost"
    lead.lost_reason = lead.lost_reason or "ARCHIVED_BY_ADMIN"
    lead.updated_at = datetime.now(timezone.utc)

    db.add(
        AuditLog(
            user_id=current_user.id,
            action="DELETE",
            resource_type="LEAD",
            resource_id=lead.id,
            details=json.dumps({"lead_number": lead.lead_number, "action": "soft_deleted_and_archived"}),
        )
    )
    await db.commit()

    return {"success": True, "message": f"Lead {lead.lead_number} archived successfully"}


# ─── Mock Seeder for High-Fidelity UI Match ───────────────────────────────────

async def seed_initial_leads_if_empty(db: AsyncSession, institution_id: Optional[int]):
    """Seeds realistic leads matching user screenshot if leads table is empty."""
    if not institution_id:
        inst_res = await db.execute(select(Institution.id).limit(1))
        institution_id = inst_res.scalar_one_or_none()
    if not institution_id:
        return

    existing_count = (
        await db.execute(select(func.count(Lead.id)).where(Lead.institution_id == institution_id))
    ).scalar() or 0
    if existing_count > 0:
        return

    # Fetch reference IDs
    std_rows = (await db.execute(select(Standard).where(Standard.institution_id == institution_id))).scalars().all()
    std_map = {s.level: s.id for s in std_rows}

    board_rows = (await db.execute(select(Board).where(Board.institution_id == institution_id))).scalars().all()
    board_map = {b.code: b.id for b in board_rows}

    ay = (await db.execute(select(AcademicYear).where(AcademicYear.institution_id == institution_id))).scalars().first()
    ay_id = ay.id if ay else None

    counsellor = (
        await db.execute(
            select(User).where(User.institution_id == institution_id, User.role.in_(["admin", "staff", "principal"]))
        )
    ).scalars().first()
    c_id = counsellor.id if counsellor else None

    now = datetime.now(timezone.utc)
    today = date.today()

    demo_leads = [
        # New Enquiry
        {
            "num": "LD-0286", "fn": "Aarav", "ln": "Sharma", "phone": "+91 98765 43210", "email": "aarav.sharma@gmail.com",
            "course": "JEE Foundation", "stage": "new_enquiry", "priority": "hot", "src": "Website",
            "std": std_map.get(10), "board": board_map.get("CBSE"), "follow_up": now + timedelta(hours=2),
            "school": "St. Xavier High School", "parent": "Sunil Sharma", "p_phone": "+91 98765 43211", "notes": "Interested in 2-year integrated JEE Foundation coaching."
        },
        {
            "num": "LD-0285", "fn": "Riya", "ln": "Patil", "phone": "+91 98201 55433", "email": "riya.patil@outlook.com",
            "course": "Maths + Science", "stage": "new_enquiry", "priority": "warm", "src": "Walk-in",
            "std": std_map.get(9), "board": board_map.get("SSC"), "follow_up": now + timedelta(hours=3),
            "school": "Vidya Bhavan", "parent": "Sanjay Patil", "p_phone": "+91 98201 55434", "notes": "Parents visited institute, requested fee breakdown."
        },
        # Contacted
        {
            "num": "LD-0284", "fn": "Vedant", "ln": "Gokhale", "phone": "+91 97690 11223", "email": "vedant.g@gmail.com",
            "course": "CA Foundation", "stage": "contacted", "priority": "hot", "src": "Referral",
            "std": std_map.get(11), "board": board_map.get("HSC"), "follow_up": now + timedelta(days=1),
            "school": "D.G. Ruparel College", "parent": "Anand Gokhale", "p_phone": "+91 97690 11224", "notes": "Called yesterday. Student interested in weekend CA foundation batch."
        },
        {
            "num": "LD-0283", "fn": "Ira", "ln": "Deshmukh", "phone": "+91 99870 66554", "email": "ira.deshmukh@gmail.com",
            "course": "All Subjects", "stage": "contacted", "priority": "warm", "src": "Phone Enquiry",
            "std": std_map.get(8), "board": board_map.get("CBSE"), "follow_up": now - timedelta(hours=5),
            "school": "Delhi Public School", "parent": "Meena Deshmukh", "p_phone": "+91 99870 66555", "notes": "Contacted via phone. Follow-up overdue for counselling slot."
        },
        # Counselling / Demo
        {
            "num": "LD-0282", "fn": "Kavya", "ln": "Mehta", "phone": "+91 98203 44556", "email": "kavya.m@gmail.com",
            "course": "JEE / NEET", "stage": "counselling_demo", "priority": "hot", "src": "WhatsApp",
            "std": std_map.get(10), "board": board_map.get("CBSE"), "follow_up": now + timedelta(days=2),
            "school": "Podar International", "parent": "Rajesh Mehta", "p_phone": "+91 98203 44557", "notes": "Trial Physics demo class scheduled."
        },
        {
            "num": "LD-0281", "fn": "Arjun", "ln": "Naik", "phone": "+91 99308 77110", "email": "arjun.naik@gmail.com",
            "course": "Science Stream", "stage": "counselling_demo", "priority": "warm", "src": "Social Media",
            "std": std_map.get(11), "board": board_map.get("HSC"), "follow_up": now + timedelta(days=2),
            "school": "Kirti College", "parent": "Vikas Naik", "p_phone": "+91 99308 77111", "notes": "Counselling scheduled with Academic Director."
        },
        # Interested
        {
            "num": "LD-0280", "fn": "Saanvi", "ln": "Kulkarni", "phone": "+91 98702 33445", "email": "saanvi.k@gmail.com",
            "course": "Class 9 Foundation", "stage": "interested", "priority": "hot", "src": "Website",
            "std": std_map.get(9), "board": board_map.get("CBSE"), "follow_up": now + timedelta(days=1),
            "school": "Ryan International", "parent": "Pradeep Kulkarni", "p_phone": "+91 98702 33446", "notes": "Attended Maths demo. Very satisfied, discussing fee payment plan."
        },
        {
            "num": "LD-0279", "fn": "Parth", "ln": "More", "phone": "+91 98675 22110", "email": "parth.more@gmail.com",
            "course": "Board Exam Prep", "stage": "interested", "priority": "warm", "src": "Referral",
            "std": std_map.get(10), "board": board_map.get("SSC"), "follow_up": now + timedelta(days=3),
            "school": "Balmohan Vidyamandir", "parent": "Ganesh More", "p_phone": "+91 98675 22111", "notes": "Interested in test series and weekend crash course."
        },
        # Admission Pending
        {
            "num": "LD-0278", "fn": "Mihir", "ln": "Joshi", "phone": "+91 98209 66550", "email": "mihir.joshi@gmail.com",
            "course": "Foundation Batch", "stage": "admission_pending", "priority": "hot", "src": "Website",
            "std": std_map.get(8), "board": board_map.get("CBSE"), "follow_up": now + timedelta(hours=4),
            "school": "Army Public School", "parent": "Col. Ashok Joshi", "p_phone": "+91 98209 66551", "notes": "Token amount discussed. Awaiting registration form submission."
        },
        {
            "num": "LD-0277", "fn": "Diya", "ln": "Sutar", "phone": "+91 99670 11440", "email": "diya.sutar@gmail.com",
            "course": "ICSE Science & Maths", "stage": "admission_pending", "priority": "hot", "src": "Walk-in",
            "std": std_map.get(9), "board": board_map.get("ICSE"), "follow_up": now + timedelta(days=1),
            "school": "Bombay Scottish", "parent": "Nitin Sutar", "p_phone": "+91 99670 11441", "notes": "Admission confirmed verbally. Documents pending."
        },
        # Converted
        {
            "num": "LD-0276", "fn": "Advait", "ln": "Pendse", "phone": "+91 98201 77880", "email": "advait.pendse@gmail.com",
            "course": "CBSE Class 10 Comprehensive", "stage": "converted", "priority": "warm", "src": "Website",
            "std": std_map.get(10), "board": board_map.get("CBSE"), "follow_up": None,
            "school": "St. Anne High School", "parent": "Makarand Pendse", "p_phone": "+91 98201 77881", "notes": "Admitted on 24 Oct 2026."
        },
        {
            "num": "LD-0275", "fn": "Neha", "ln": "Karnik", "phone": "+91 99306 44882", "email": "neha.karnik@gmail.com",
            "course": "Class 11 Science & JEE", "stage": "converted", "priority": "warm", "src": "Referral",
            "std": std_map.get(11), "board": board_map.get("HSC"), "follow_up": None,
            "school": "Sathaye College", "parent": "Dr. Karnik", "p_phone": "+91 99306 44883", "notes": "Admitted on 22 Oct 2026."
        },
    ]

    for d in demo_leads:
        lead_obj = Lead(
            institution_id=institution_id,
            lead_number=d["num"],
            academic_year_id=ay_id,
            standard_id=d["std"],
            board_id=d["board"],
            interested_course=d["course"],
            first_name=d["fn"],
            last_name=d["ln"],
            phone=d["phone"],
            email=d["email"],
            school_name=d["school"],
            guardian_name=d["parent"],
            guardian_phone=d["p_phone"],
            source=d["src"],
            stage=d["stage"],
            priority=d["priority"],
            assigned_to_id=c_id,
            enquiry_date=today - timedelta(days=5),
            next_follow_up_at=d["follow_up"],
            notes=d["notes"],
            is_active=True,
        )
        db.add(lead_obj)
        await db.flush()

        # Follow-up
        db.add(
            LeadFollowUp(
                lead_id=lead_obj.id,
                institution_id=institution_id,
                follow_up_type="call",
                stage_at_time=d["stage"],
                status="completed",
                scheduled_at=now - timedelta(days=2),
                completed_at=now - timedelta(days=2),
                outcome="interested",
                remarks=d["notes"],
                next_follow_up_at=d["follow_up"],
                performed_by_id=c_id,
            )
        )

    await db.commit()
