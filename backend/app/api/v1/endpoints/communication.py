# /**
#  * @file        communication.py
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
#  * @updated     2026-11-05
#  *
#  * @description REST API router for Communication Center, message templates, universal document sharing, and delivery tracking.
#  */

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc, update, delete
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
from datetime import datetime, timedelta, timezone
import json

from app.core.database import get_db
from app.core.deps import get_current_active_user, require_role
from app.models.institution import Institution
from app.models.user import User
from app.models.student import Student, Guardian
from app.models.staff import StaffProfile
from app.models.division import Division
from app.models.standard import Standard
from app.models.payment import PaymentReceipt, Payment
from app.models.communication import MessageTemplate, CommunicationLog, SharedDocumentToken
from app.services.communication import (
    resolve_placeholders,
    generate_whatsapp_web_url,
    generate_secure_share_token,
    ChannelAdapter,
)

router = APIRouter()


# ─── Pydantic Request Models ──────────────────────────────────────────────────

class TemplateCreate(BaseModel):
    name: str = Field(..., max_length=100)
    code: str = Field(..., max_length=50)
    category: str = Field(..., max_length=50)
    channel: str = Field(default="ALL", max_length=30)
    subject: Optional[str] = Field(default=None, max_length=255)
    body: str
    variables: Optional[List[str]] = None
    is_active: bool = True


class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    channel: Optional[str] = None
    subject: Optional[str] = None
    body: Optional[str] = None
    variables: Optional[List[str]] = None
    is_active: Optional[bool] = None


class RecipientPayload(BaseModel):
    recipient_type: str = "STUDENT"  # STUDENT, PARENT, STAFF, CUSTOM
    recipient_id: Optional[int] = None
    name: str
    destination: str  # Phone or Email
    variables: Optional[Dict[str, Any]] = None


class SendMessageRequest(BaseModel):
    channel: str = "WHATSAPP"  # WHATSAPP, EMAIL, SMS, ALL
    template_code: Optional[str] = None
    subject: Optional[str] = None
    message: str
    recipients: List[RecipientPayload]
    document_attachment: Optional[Dict[str, Any]] = None  # { document_type, record_id, title }
    scheduled_at: Optional[datetime] = None


class ShareDocumentRequest(BaseModel):
    document_type: str  # RECEIPT, REPORT_CARD, FEE_STATEMENT, STUDENT_PROFILE, ATTENDANCE_SUMMARY, STAFF_DOCUMENT, FORM
    record_id: int
    recipient_name: Optional[str] = None
    recipient_phone: Optional[str] = None
    recipient_email: Optional[str] = None
    expires_in_hours: int = 168  # 7 days default
    access_key: Optional[str] = None


class DiagnosticsTestRequest(BaseModel):
    channel: str  # WHATSAPP, EMAIL, SMS
    destination: str
    message: Optional[str] = "PrathamOne Academy channel diagnostics verification."


# ─── 1. Message Templates Endpoints ───────────────────────────────────────────

@router.get("/templates")
async def list_message_templates(
    category: Optional[str] = None,
    channel: Optional[str] = None,
    institution_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    target_id = institution_id or current_user.institution_id or 1
    query = select(MessageTemplate).where(MessageTemplate.institution_id == target_id)

    if category and category != "ALL":
        query = query.where(MessageTemplate.category == category)
    if channel and channel != "ALL":
        query = query.where(or_(MessageTemplate.channel == channel, MessageTemplate.channel == "ALL"))

    query = query.order_by(MessageTemplate.category.asc(), MessageTemplate.name.asc())
    result = await db.execute(query)
    templates = result.scalars().all()

    return [
        {
            "id": t.id,
            "name": t.name,
            "code": t.code,
            "category": t.category,
            "channel": t.channel,
            "subject": t.subject,
            "body": t.body,
            "variables": json.loads(t.variables) if t.variables else [],
            "is_active": t.is_active,
            "is_system": t.is_system,
            "created_at": t.created_at.isoformat(),
            "updated_at": t.updated_at.isoformat(),
        }
        for t in templates
    ]


@router.post("/templates", status_code=status.HTTP_201_CREATED)
async def create_message_template(
    data: TemplateCreate,
    institution_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin", "principal", "sysadmin")),
):
    target_id = institution_id or current_user.institution_id or 1
    code_clean = data.code.strip().upper()

    # Check duplicate
    stmt = select(MessageTemplate).where(
        MessageTemplate.institution_id == target_id,
        MessageTemplate.code == code_clean,
    )
    existing = (await db.execute(stmt)).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Template with code '{code_clean}' already exists for this institution.",
        )

    template = MessageTemplate(
        institution_id=target_id,
        name=data.name.strip(),
        code=code_clean,
        category=data.category.strip(),
        channel=data.channel.strip().upper(),
        subject=data.subject.strip() if data.subject else None,
        body=data.body.strip(),
        variables=json.dumps(data.variables) if data.variables else None,
        is_active=data.is_active,
        is_system=False,
    )
    db.add(template)
    await db.commit()
    await db.refresh(template)

    return {
        "status": "success",
        "message": "Template created successfully",
        "template": {
            "id": template.id,
            "name": template.name,
            "code": template.code,
            "category": template.category,
            "channel": template.channel,
            "body": template.body,
        },
    }


@router.put("/templates/{template_id}")
async def update_message_template(
    template_id: int,
    data: TemplateUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin", "principal", "sysadmin")),
):
    stmt = select(MessageTemplate).where(MessageTemplate.id == template_id)
    template = (await db.execute(stmt)).scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Message template not found")

    if data.name is not None:
        template.name = data.name.strip()
    if data.category is not None:
        template.category = data.category.strip()
    if data.channel is not None:
        template.channel = data.channel.strip().upper()
    if data.subject is not None:
        template.subject = data.subject.strip()
    if data.body is not None:
        template.body = data.body.strip()
    if data.variables is not None:
        template.variables = json.dumps(data.variables)
    if data.is_active is not None:
        template.is_active = data.is_active

    await db.commit()
    await db.refresh(template)
    return {"status": "success", "message": "Template updated successfully"}


@router.delete("/templates/{template_id}")
async def delete_message_template(
    template_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin", "principal", "sysadmin")),
):
    stmt = select(MessageTemplate).where(MessageTemplate.id == template_id)
    template = (await db.execute(stmt)).scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Message template not found")

    if template.is_system:
        template.is_active = False
        await db.commit()
        return {"status": "success", "message": "System template deactivated safely"}

    await db.delete(template)
    await db.commit()
    return {"status": "success", "message": "Template deleted successfully"}


# ─── 2. Universal Document Sharing & Expiring Links ──────────────────────────

@router.post("/share-document")
async def create_document_share_link(
    payload: ShareDocumentRequest,
    institution_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    target_id = institution_id or current_user.institution_id or 1
    token_str = generate_secure_share_token()
    now_utc = datetime.now(timezone.utc)
    expires_at = now_utc + timedelta(hours=payload.expires_in_hours or 168)

    shared_token = SharedDocumentToken(
        token=token_str,
        institution_id=target_id,
        document_type=payload.document_type.upper(),
        record_id=payload.record_id,
        access_key=payload.access_key,
        recipient_name=payload.recipient_name,
        recipient_phone=payload.recipient_phone,
        recipient_email=payload.recipient_email,
        expires_at=expires_at,
        created_by_id=current_user.id,
    )
    db.add(shared_token)
    await db.commit()
    await db.refresh(shared_token)

    # Resolve document display text for WhatsApp sharing
    doc_title = f"{payload.document_type.replace('_', ' ').title()} #{payload.record_id}"
    share_url = f"/shared-doc/{token_str}"
    
    # Message for direct WhatsApp sharing
    whatsapp_text = (
        f"Official document from PrathamOne Academy: {doc_title}. "
        f"Secure Link: {share_url} (Valid for {payload.expires_in_hours // 24} days)."
    )
    whatsapp_url = generate_whatsapp_web_url(payload.recipient_phone or "", whatsapp_text)

    # Log document sharing action
    log = CommunicationLog(
        institution_id=target_id,
        channel="DIRECT_LINK",
        recipient_type="STUDENT",
        recipient_id=payload.record_id,
        recipient_name=payload.recipient_name or "Authorized Recipient",
        recipient_destination=payload.recipient_phone or payload.recipient_email or "Secure Token Link",
        subject=f"Shared Document: {doc_title}",
        content=whatsapp_text,
        status="DELIVERED",
        metadata_json=json.dumps({
            "token": token_str,
            "document_type": payload.document_type,
            "record_id": payload.record_id,
            "expires_at": expires_at.isoformat(),
        }),
        sender_id=current_user.id,
        sender_name=f"{current_user.first_name} {current_user.last_name}".strip(),
        sent_at=now_utc,
    )
    db.add(log)
    await db.commit()

    return {
        "status": "success",
        "token": token_str,
        "share_url": share_url,
        "expires_at": expires_at.isoformat(),
        "whatsapp_share_url": whatsapp_url,
        "document_type": payload.document_type,
        "record_id": payload.record_id,
    }


@router.get("/shared-doc/{token}")
async def resolve_shared_document(
    token: str,
    pin: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(SharedDocumentToken).where(SharedDocumentToken.token == token)
    shared = (await db.execute(stmt)).scalar_one_or_none()
    if not shared:
        raise HTTPException(status_code=404, detail="Shared document link is invalid or has expired.")

    if shared.is_revoked:
        raise HTTPException(status_code=410, detail="This shared document link has been revoked by administration.")

    now_utc = datetime.now(timezone.utc)
    if shared.expires_at < now_utc:
        raise HTTPException(status_code=410, detail="This shared document link has expired.")

    if shared.view_count >= shared.max_views:
        raise HTTPException(status_code=403, detail="Maximum view limit reached for this secure document link.")

    if shared.access_key and shared.access_key != pin:
        return {
            "status": "pin_required",
            "message": "PIN or access code required to view this confidential document.",
            "document_type": shared.document_type,
            "recipient_name": shared.recipient_name,
        }

    # Increment view count
    shared.view_count += 1
    await db.commit()

    return {
        "status": "valid",
        "document_type": shared.document_type,
        "record_id": shared.record_id,
        "recipient_name": shared.recipient_name,
        "recipient_phone": shared.recipient_phone,
        "view_count": shared.view_count,
        "max_views": shared.max_views,
        "expires_at": shared.expires_at.isoformat(),
    }


# ─── 3. Message Dispatch & Bulk Communication Center ─────────────────────────

@router.post("/send")
async def send_communication_messages(
    payload: SendMessageRequest,
    institution_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin", "principal", "sysadmin", "accountant", "teacher")),
):
    target_id = institution_id or current_user.institution_id or 1
    now_utc = datetime.now(timezone.utc)
    sender_display = f"{current_user.first_name} {current_user.last_name}".strip()

    # Fetch institution identity for baseline variables
    inst_stmt = select(Institution).where(Institution.id == target_id)
    inst = (await db.execute(inst_stmt)).scalar_one_or_none()
    inst_name = inst.name if inst else "PrathamOne Academy"
    inst_phone = inst.phone if inst else "+91 98765 43210"

    results = []
    whatsapp_dispatch_links = []

    for r in payload.recipients:
        # Merge placeholder variables
        vars_map = {
            "student_name": r.name,
            "parent_name": r.name,
            "institute_name": inst_name,
            "contact_phone": inst_phone,
            "date": now_utc.strftime("%d %b %Y"),
        }
        if r.variables:
            vars_map.update(r.variables)

        # Interpolate content
        final_body = resolve_placeholders(payload.message, vars_map)
        final_subject = resolve_placeholders(payload.subject or f"Notification from {inst_name}", vars_map)

        channel_target = payload.channel.upper()
        channels_to_send = [channel_target] if channel_target != "ALL" else ["WHATSAPP", "EMAIL", "SMS"]

        for ch in channels_to_send:
            success = True
            log_status = "DELIVERED"
            error_msg = None

            if ch == "WHATSAPP":
                success, log_status, resp_id = await ChannelAdapter.dispatch_whatsapp(r.destination, final_body)
                wa_link = generate_whatsapp_web_url(r.destination, final_body)
                whatsapp_dispatch_links.append({
                    "recipient_name": r.name,
                    "phone": r.destination,
                    "url": wa_link,
                })
            elif ch == "EMAIL":
                success, log_status, resp_id = await ChannelAdapter.dispatch_email(
                    r.destination, final_subject, final_body, final_body
                )
            elif ch == "SMS":
                success, log_status, resp_id = await ChannelAdapter.dispatch_sms(r.destination, final_body)

            if not success:
                error_msg = resp_id

            # Save communication log
            log = CommunicationLog(
                institution_id=target_id,
                channel=ch,
                recipient_type=r.recipient_type,
                recipient_id=r.recipient_id,
                recipient_name=r.name,
                recipient_destination=r.destination,
                template_code=payload.template_code,
                subject=final_subject,
                content=final_body,
                status=log_status,
                error_message=error_msg,
                metadata_json=json.dumps(payload.document_attachment) if payload.document_attachment else None,
                sender_id=current_user.id,
                sender_name=sender_display,
                scheduled_at=payload.scheduled_at,
                sent_at=now_utc if not payload.scheduled_at else None,
            )
            db.add(log)
            results.append({
                "recipient": r.name,
                "channel": ch,
                "status": log_status,
                "destination": r.destination,
            })

    await db.commit()

    return {
        "status": "success",
        "message": f"Successfully processed {len(results)} communication dispatch(es).",
        "dispatched_count": len(results),
        "results": results,
        "whatsapp_links": whatsapp_dispatch_links,
    }


# ─── 4. Recipient Search for Communication Center ─────────────────────────────

@router.get("/recipients/search")
async def search_communication_recipients(
    query: Optional[str] = None,
    target_type: str = "ALL",  # ALL, STUDENT, PARENT, STAFF, BATCH
    institution_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    target_id = institution_id or current_user.institution_id or 1
    q_str = f"%{query.strip().lower()}%" if query else "%"

    results = []

    # 1. Students & Parents
    if target_type in ("ALL", "STUDENT", "PARENT"):
        stmt = (
            select(Student)
            .where(
                Student.institution_id == target_id,
                Student.is_active == True,
                or_(
                    func.lower(Student.first_name).like(q_str),
                    func.lower(Student.last_name).like(q_str),
                    func.lower(Student.admission_number).like(q_str),
                    func.lower(Student.contact_number).like(q_str),
                ),
            )
            .limit(20)
        )
        students = (await db.execute(stmt)).scalars().all()
        for s in students:
            full_name = f"{s.first_name} {s.last_name}".strip()
            # Student entry
            if target_type in ("ALL", "STUDENT") and (s.contact_number or s.email):
                results.append({
                    "id": s.id,
                    "type": "STUDENT",
                    "name": full_name,
                    "subtitle": f"Student • Adm: {s.admission_number}",
                    "phone": s.contact_number,
                    "email": s.email,
                    "admission_number": s.admission_number,
                })
            # Parent entry
            if target_type in ("ALL", "PARENT") and s.emergency_contact_phone:
                results.append({
                    "id": s.id,
                    "type": "PARENT",
                    "name": f"Parent of {full_name}",
                    "subtitle": f"Guardian • Student: {full_name}",
                    "phone": s.emergency_contact_phone,
                    "email": s.email,
                    "admission_number": s.admission_number,
                })

    # 2. Staff & Faculty
    if target_type in ("ALL", "STAFF"):
        staff_stmt = (
            select(StaffProfile)
            .where(
                StaffProfile.institution_id == target_id,
                StaffProfile.is_active == True,
                or_(
                    func.lower(StaffProfile.full_name).like(q_str),
                    func.lower(StaffProfile.employee_id).like(q_str),
                    func.lower(StaffProfile.primary_phone).like(q_str),
                ),
            )
            .limit(15)
        )
        staff_members = (await db.execute(staff_stmt)).scalars().all()
        for st in staff_members:
            results.append({
                "id": st.id,
                "type": "STAFF",
                "name": st.full_name,
                "subtitle": f"{st.staff_type} • ID: {st.employee_id}",
                "phone": st.primary_phone,
                "email": st.email,
                "employee_id": st.employee_id,
            })

    # 3. Batches (for Bulk Batch selection)
    if target_type in ("ALL", "BATCH"):
        div_stmt = (
            select(Division)
            .join(Standard)
            .where(
                Standard.institution_id == target_id,
                Division.is_active == True,
                or_(
                    func.lower(Division.name).like(q_str),
                    func.lower(Division.code).like(q_str),
                ),
            )
            .limit(10)
        )
        batches = (await db.execute(div_stmt)).scalars().all()
        for b in batches:
            results.append({
                "id": b.id,
                "type": "BATCH",
                "name": f"Batch: {b.name}",
                "subtitle": f"Batch Code: {b.code} (Capacity: {b.capacity})",
                "phone": None,
                "email": None,
                "batch_code": b.code,
            })

    return results


# ─── 5. Delivery History & Audit Logs ─────────────────────────────────────────

@router.get("/logs")
async def list_communication_logs(
    channel: Optional[str] = None,
    status: Optional[str] = None,
    recipient_type: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
    institution_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin", "principal", "sysadmin", "accountant", "teacher")),
):
    target_id = institution_id or current_user.institution_id or 1
    offset = (page - 1) * limit

    query = select(CommunicationLog).where(CommunicationLog.institution_id == target_id)

    if channel and channel != "ALL":
        query = query.where(CommunicationLog.channel == channel)
    if status and status != "ALL":
        query = query.where(CommunicationLog.status == status)
    if recipient_type and recipient_type != "ALL":
        query = query.where(CommunicationLog.recipient_type == recipient_type)
    if search:
        s_term = f"%{search.strip().lower()}%"
        query = query.where(
            or_(
                func.lower(CommunicationLog.recipient_name).like(s_term),
                func.lower(CommunicationLog.recipient_destination).like(s_term),
                func.lower(CommunicationLog.content).like(s_term),
                func.lower(CommunicationLog.subject).like(s_term),
            )
        )

    # Count
    count_stmt = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_stmt)).scalar() or 0

    # Paginated rows
    query = query.order_by(CommunicationLog.created_at.desc()).offset(offset).limit(limit)
    rows = (await db.execute(query)).scalars().all()

    return {
        "items": [
            {
                "id": r.id,
                "channel": r.channel,
                "recipient_type": r.recipient_type,
                "recipient_name": r.recipient_name,
                "recipient_destination": r.recipient_destination,
                "template_code": r.template_code,
                "subject": r.subject,
                "content": r.content,
                "status": r.status,
                "error_message": r.error_message,
                "sender_name": r.sender_name,
                "created_at": r.created_at.isoformat(),
                "sent_at": r.sent_at.isoformat() if r.sent_at else None,
            }
            for r in rows
        ],
        "total": total,
        "page": page,
        "limit": limit,
    }


@router.post("/logs/{log_id}/retry")
async def retry_failed_communication(
    log_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin", "principal", "sysadmin")),
):
    stmt = select(CommunicationLog).where(CommunicationLog.id == log_id)
    log = (await db.execute(stmt)).scalar_one_or_none()
    if not log:
        raise HTTPException(status_code=404, detail="Communication log entry not found")

    now_utc = datetime.now(timezone.utc)
    ch = log.channel.upper()
    success = True
    error_msg = None

    if ch == "WHATSAPP":
        success, log_status, resp_id = await ChannelAdapter.dispatch_whatsapp(log.recipient_destination, log.content)
    elif ch == "EMAIL":
        success, log_status, resp_id = await ChannelAdapter.dispatch_email(
            log.recipient_destination, log.subject or "Notification", log.content
        )
    elif ch == "SMS":
        success, log_status, resp_id = await ChannelAdapter.dispatch_sms(log.recipient_destination, log.content)
    else:
        success = True
        log_status = "DELIVERED"

    if success:
        log.status = "DELIVERED"
        log.error_message = None
        log.sent_at = now_utc
    else:
        log.status = "FAILED"
        log.error_message = resp_id

    await db.commit()
    return {"status": "success", "message": f"Retry processed. New status: {log.status}"}


# ─── 6. Diagnostics & Connection Verification ─────────────────────────────────

@router.get("/diagnostics")
async def get_channel_diagnostics(
    current_user: User = Depends(require_role("admin", "principal", "sysadmin")),
):
    return {
        "status": "ready",
        "channels": {
            "whatsapp": {
                "name": "WhatsApp Business Platform",
                "adapter": "Meta Cloud API & Web Direct Link",
                "status": "active",
                "features": ["Instant wa.me Deep Links", "Media PDF Attachment Links", "Template Messaging"],
            },
            "email": {
                "name": "SMTP Email Service",
                "adapter": "Async SMTP / Standard Mail Gateway",
                "status": "active",
                "features": ["HTML Formatting", "Official Header & Footer", "Audit Logging"],
            },
            "sms": {
                "name": "DLT Registered Telecom SMS",
                "adapter": "Telecom Gateway Header (PRATHM)",
                "status": "active",
                "features": ["Transactional SMS", "Absence Alerts", "Payment Confirmations"],
            },
            "document_sharing": {
                "name": "Cryptographic Expiring Links",
                "adapter": "Token-Secured Access with View Caps",
                "status": "active",
                "features": ["7-Day Auto Expiry", "Optional PIN Protection", "Public Isolation"],
            },
        },
    }


@router.post("/diagnostics/test")
async def run_diagnostics_test(
    payload: DiagnosticsTestRequest,
    current_user: User = Depends(require_role("admin", "principal", "sysadmin")),
):
    ch = payload.channel.upper()
    dest = payload.destination.strip()
    msg = payload.message or "PrathamOne Academy channel diagnostics verification."

    if ch == "WHATSAPP":
        success, log_status, resp_id = await ChannelAdapter.dispatch_whatsapp(dest, msg)
    elif ch == "EMAIL":
        success, log_status, resp_id = await ChannelAdapter.dispatch_email(dest, "Channel Diagnostics Test", msg)
    elif ch == "SMS":
        success, log_status, resp_id = await ChannelAdapter.dispatch_sms(dest, msg)
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported test channel: {payload.channel}")

    return {
        "status": "success" if success else "failed",
        "channel": ch,
        "destination": dest,
        "dispatch_status": log_status,
        "reference_id": resp_id,
    }

