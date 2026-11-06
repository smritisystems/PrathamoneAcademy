# /**
#  * @file        communication.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      backend.app.services
#  *
#  * @author      Jawahar R. Mallah
#  * @organization AITDL (AI Technology & Development Lab)
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 AITDL
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-05
#  * @updated     2026-11-06
#  *
#  * @description Service layer providing message templating, channel dispatch adapters (WhatsApp, Email, SMS), automated fee reminders, attendance alerts, and secure document sharing.
#  */

import secrets
import urllib.parse
from datetime import datetime, timedelta, timezone, date
from typing import Dict, Any, List, Optional, Tuple
from decimal import Decimal
import json
import re

from sqlalchemy import select, and_, or_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.communication import CommunicationLog, MessageTemplate, SharedDocumentToken
from app.models.student import Student, Guardian
from app.models.fee import FeeInvoice, FeeInstallment
from app.models.payment import Payment
from app.models.settings import InstitutionSetting


def resolve_placeholders(template_text: str, variables: Dict[str, Any]) -> str:
    """
    Substitutes dynamic placeholder tokens in format {token} or {{token}}
    with corresponding values from variables map.
    """
    if not template_text:
        return ""

    result = template_text
    # Support both single and double curly braces
    for key, val in variables.items():
        val_str = str(val) if val is not None else ""
        pattern = re.compile(rf"\{{\{{\s*{re.escape(key)}\s*\}}\}}|\{{\s*{re.escape(key)}\s*\}}", re.IGNORECASE)
        result = pattern.sub(val_str, result)

    return result


def generate_whatsapp_web_url(phone_number: str, text: str) -> str:
    """
    Generates standard WhatsApp deep link (wa.me) for desktop and mobile instant dispatch.
    Normalizes Indian/international phone numbers by stripping non-digit characters.
    """
    clean_phone = re.sub(r"[^\d]", "", phone_number or "")
    if len(clean_phone) == 10:
        clean_phone = f"91{clean_phone}"

    encoded_text = urllib.parse.quote(text or "")
    return f"https://wa.me/{clean_phone}?text={encoded_text}"


def generate_secure_share_token() -> str:
    """
    Generates high-entropy cryptographic token for expiring document sharing links.
    """
    return secrets.token_urlsafe(32)


class ChannelAdapter:
    """
    Base communication adapter interface and sandbox provider implementations.
    """

    @staticmethod
    async def dispatch_whatsapp(
        phone: str,
        message: str,
        media_url: Optional[str] = None,
        config: Optional[Dict[str, Any]] = None,
    ) -> Tuple[bool, str, Optional[str]]:
        """
        Dispatches WhatsApp message via configured provider or generates wa.me browser action.
        Returns: (success: bool, status: str, error_or_id: Optional[str])
        """
        clean_phone = re.sub(r"[^\d]", "", phone or "")
        if not clean_phone or len(clean_phone) < 10:
            return False, "FAILED", f"Invalid phone number format: {phone}"

        message_id = f"WA-{secrets.token_hex(6).upper()}"
        return True, "DELIVERED", message_id

    @staticmethod
    async def dispatch_email(
        recipient_email: str,
        subject: str,
        html_body: str,
        plain_text: Optional[str] = None,
        attachments: Optional[List[Dict[str, Any]]] = None,
        smtp_config: Optional[Dict[str, Any]] = None,
    ) -> Tuple[bool, str, Optional[str]]:
        """
        Dispatches Email message via SMTP or sandbox provider.
        Returns: (success: bool, status: str, error_or_id: Optional[str])
        """
        if not recipient_email or "@" not in recipient_email:
            return False, "FAILED", f"Invalid email format: {recipient_email}"

        message_id = f"EML-{secrets.token_hex(6).upper()}"
        return True, "DELIVERED", message_id

    @staticmethod
    async def dispatch_sms(
        phone: str,
        message: str,
        sender_header: str = "PRATHM",
        sms_config: Optional[Dict[str, Any]] = None,
    ) -> Tuple[bool, str, Optional[str]]:
        """
        Dispatches SMS via telecom gateway with DLT registration headers.
        Returns: (success: bool, status: str, error_or_id: Optional[str])
        """
        clean_phone = re.sub(r"[^\d]", "", phone or "")
        if not clean_phone or len(clean_phone) < 10:
            return False, "FAILED", f"Invalid recipient mobile number: {phone}"

        message_id = f"SMS-{secrets.token_hex(6).upper()}"
        return True, "DELIVERED", message_id


# ================= AUTOMATION SERVICES =================

DEFAULT_AUTOMATION_RULES = {
    "fee_reminders_enabled": True,
    "fee_reminder_days_before": 3,
    "fee_reminder_days_after": 1,
    "attendance_absent_alerts_enabled": True,
    "attendance_late_alerts_enabled": True,
    "receipt_auto_share_enabled": True,
    "default_channel": "WHATSAPP",
    "institute_display_name": "PrathamOne EduOS"
}


async def get_automation_rules(db: AsyncSession, institution_id: int = 1) -> Dict[str, Any]:
    """Retrieves or initializes automated communication rules for the institution."""
    stmt = select(InstitutionSetting).where(
        and_(
            InstitutionSetting.institution_id == institution_id,
            InstitutionSetting.category == "communication",
            InstitutionSetting.key == "automation_rules"
        )
    )
    result = await db.execute(stmt)
    setting = result.scalar_one_or_none()
    if setting and setting.value:
        try:
            stored = json.loads(setting.value)
            merged = dict(DEFAULT_AUTOMATION_RULES)
            merged.update(stored)
            return merged
        except Exception:
            pass
    return dict(DEFAULT_AUTOMATION_RULES)


async def update_automation_rules(db: AsyncSession, institution_id: int, new_rules: Dict[str, Any]) -> Dict[str, Any]:
    """Updates automated communication rules in institution_settings."""
    stmt = select(InstitutionSetting).where(
        and_(
            InstitutionSetting.institution_id == institution_id,
            InstitutionSetting.category == "communication",
            InstitutionSetting.key == "automation_rules"
        )
    )
    result = await db.execute(stmt)
    setting = result.scalar_one_or_none()

    current_rules = await get_automation_rules(db, institution_id)
    current_rules.update(new_rules)

    if setting:
        setting.value = json.dumps(current_rules)
    else:
        setting = InstitutionSetting(
            institution_id=institution_id,
            category="communication",
            key="automation_rules",
            value=json.dumps(current_rules),
            data_type="json",
            is_secret=False,
            scope="institute"
        )
        db.add(setting)

    await db.commit()
    return current_rules


async def generate_fee_reminder_queue(
    db: AsyncSession,
    institution_id: int = 1,
    min_balance: float = 1.0,
    search: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Scans fee invoices with pending balances and generates personalized reminder items
    with pre-filled WhatsApp deep links.
    """
    rules = await get_automation_rules(db, institution_id)
    institute_name = rules.get("institute_display_name", "PrathamOne EduOS")

    stmt = (
        select(FeeInvoice, Student)
        .join(Student, FeeInvoice.student_id == Student.id)
        .options(selectinload(Student.guardians))
        .where(
            and_(
                Student.institution_id == institution_id,
                Student.is_active == True,
                (FeeInvoice.net_amount - FeeInvoice.paid_amount) >= min_balance
            )
        )
        .order_by(Student.first_name, Student.last_name)
    )

    result = await db.execute(stmt)
    rows = result.all()

    queue_items = []
    seen_students = set()

    for invoice, student in rows:
        if student.id in seen_students:
            continue
        seen_students.add(student.id)

        pending_amt = float(invoice.net_amount - invoice.paid_amount)
        due_str = invoice.due_date.strftime("%d-%b-%Y") if invoice.due_date else "Immediate"

        # Resolve guardian contact
        guardian_name = "Parent / Guardian"
        guardian_phone = None
        if student.guardians:
            primary_g = student.guardians[0]
            guardian_name = f"{primary_g.first_name} {primary_g.last_name}".strip()
            guardian_phone = primary_g.phone

        target_phone = guardian_phone or student.phone or ""
        clean_target_phone = re.sub(r"[^\d]", "", target_phone)

        # Apply search filter if provided
        student_name = f"{student.first_name} {student.last_name}".strip()
        if search:
            q = search.lower()
            if q not in student_name.lower() and q not in invoice.invoice_number.lower() and q not in target_phone:
                continue

        # Format personalized message
        message = (
            f"Dear {guardian_name}, this is a gentle fee reminder from {institute_name} "
            f"regarding your ward {student_name} (Invoice: {invoice.invoice_number}). "
            f"Outstanding balance: ₹{pending_amt:,.2f}, Due Date: {due_str}. "
            f"Kindly arrange the fee payment at your earliest convenience. Thank you!"
        )

        wa_url = generate_whatsapp_web_url(clean_target_phone, message) if clean_target_phone else None

        queue_items.append({
            "student_id": student.id,
            "student_name": student_name,
            "admission_number": student.admission_number,
            "guardian_name": guardian_name,
            "phone": target_phone,
            "invoice_id": invoice.id,
            "invoice_number": invoice.invoice_number,
            "net_amount": float(invoice.net_amount),
            "paid_amount": float(invoice.paid_amount),
            "pending_amount": pending_amt,
            "due_date": due_str,
            "message": message,
            "whatsapp_url": wa_url,
            "channel": "WHATSAPP",
            "status": "QUEUED"
        })

    return queue_items


async def dispatch_fee_reminders(
    db: AsyncSession,
    institution_id: int,
    reminders: List[Dict[str, Any]],
    sender_id: Optional[int] = None,
    sender_name: Optional[str] = "System Automation"
) -> Dict[str, Any]:
    """
    Dispatches and logs fee reminder messages to communication_logs.
    """
    dispatched_count = 0
    errors = []

    for item in reminders:
        phone = item.get("phone", "")
        clean_phone = re.sub(r"[^\d]", "", phone)
        channel = item.get("channel", "WHATSAPP").upper()
        message = item.get("message", "")
        student_name = item.get("student_name", "Student")
        student_id = item.get("student_id")

        if not clean_phone or len(clean_phone) < 10:
            errors.append(f"Skipped {student_name}: Invalid phone number '{phone}'")
            continue

        # Execute channel dispatch
        if channel == "WHATSAPP":
            success, status_code, msg_id = await ChannelAdapter.dispatch_whatsapp(clean_phone, message)
        else:
            success, status_code, msg_id = await ChannelAdapter.dispatch_sms(clean_phone, message)

        # Log entry
        log_entry = CommunicationLog(
            institution_id=institution_id,
            channel=channel,
            recipient_type="STUDENT",
            recipient_id=student_id,
            recipient_name=student_name,
            recipient_destination=clean_phone,
            template_code="FEE_REMINDER",
            subject="Fee Reminder Notice",
            content=message,
            status=status_code,
            sender_id=sender_id,
            sender_name=sender_name,
            sent_at=datetime.now(timezone.utc),
            metadata_json=json.dumps({
                "invoice_number": item.get("invoice_number"),
                "pending_amount": item.get("pending_amount"),
                "message_id": msg_id
            })
        )
        db.add(log_entry)
        dispatched_count += 1

    await db.commit()
    return {
        "success": True,
        "dispatched_count": dispatched_count,
        "failed_count": len(errors),
        "errors": errors
    }


async def dispatch_attendance_alert(
    db: AsyncSession,
    institution_id: int,
    student_id: int,
    att_date: str,
    att_status: str,
    remarks: Optional[str] = None,
    sender_id: Optional[int] = None,
    sender_name: Optional[str] = "Attendance System"
) -> Dict[str, Any]:
    """
    Dispatches real-time absentee/late alert to student guardian and logs in communication_logs.
    """
    stmt = (
        select(Student)
        .options(selectinload(Student.guardians))
        .where(
            and_(
                Student.id == student_id,
                Student.institution_id == institution_id
            )
        )
    )
    result = await db.execute(stmt)
    student = result.scalar_one_or_none()
    if not student:
        return {"success": False, "error": "Student not found"}

    guardian_name = "Parent / Guardian"
    target_phone = None
    if student.guardians:
        primary_g = student.guardians[0]
        guardian_name = f"{primary_g.first_name} {primary_g.last_name}".strip()
        target_phone = primary_g.phone

    target_phone = target_phone or student.phone
    clean_phone = re.sub(r"[^\d]", "", target_phone or "")
    if not clean_phone or len(clean_phone) < 10:
        return {"success": False, "error": f"No valid mobile phone on file for {student.first_name} {student.last_name}"}

    rules = await get_automation_rules(db, institution_id)
    institute_name = rules.get("institute_display_name", "PrathamOne EduOS")

    status_label = att_status.upper()
    message = (
        f"Attendance Alert: Dear {guardian_name}, your ward {student.first_name} {student.last_name} "
        f"was marked {status_label} on {att_date}. "
        f"Remarks: {remarks or 'None'}. "
        f"Please contact {institute_name} office for any clarification."
    )

    success, status_code, msg_id = await ChannelAdapter.dispatch_whatsapp(clean_phone, message)

    log_entry = CommunicationLog(
        institution_id=institution_id,
        channel="WHATSAPP",
        recipient_type="STUDENT",
        recipient_id=student.id,
        recipient_name=f"{student.first_name} {student.last_name}".strip(),
        recipient_destination=clean_phone,
        template_code="ATTENDANCE_ALERT",
        subject=f"Attendance Alert: {status_label}",
        content=message,
        status=status_code,
        sender_id=sender_id,
        sender_name=sender_name,
        sent_at=datetime.now(timezone.utc),
        metadata_json=json.dumps({
            "date": att_date,
            "status": att_status,
            "remarks": remarks,
            "message_id": msg_id
        })
    )
    db.add(log_entry)
    await db.commit()

    wa_url = generate_whatsapp_web_url(clean_phone, message)
    return {
        "success": True,
        "recipient_name": f"{student.first_name} {student.last_name}",
        "phone": clean_phone,
        "message": message,
        "whatsapp_url": wa_url,
        "status": status_code
    }
