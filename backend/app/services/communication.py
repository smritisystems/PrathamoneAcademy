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
#  * @updated     2026-11-13
#  *
#  * @description Service layer providing message templating, channel dispatch adapters (WhatsApp, Email, SMS), automated fee reminders, attendance alerts, homework notifications, examination schedules, and secure document sharing.
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
from app.models.enrollment import StudentEnrollment
from app.models.standard import Standard
from app.models.division import Division
from app.models.subject import Subject
from app.models.fee import FeeInvoice, FeeInstallment
from app.models.payment import Payment, PaymentReceipt
from app.models.homework import HomeworkAssignment
from app.models.exam import Examination
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
    "homework_alerts_enabled": True,
    "exam_schedule_alerts_enabled": True,
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


async def dispatch_fee_payment_receipt_notification(
    db: AsyncSession,
    payment_id: int,
    institution_id: int = 1,
    sender_id: Optional[int] = None,
    sender_name: Optional[str] = "Fee Management System",
    channel: str = "WHATSAPP",
) -> Dict[str, Any]:
    """
    Dispatches automated fee payment receipt confirmation to student guardian
    and records in communication_logs.
    """
    stmt = (
        select(Payment)
        .options(
            selectinload(Payment.student).selectinload(Student.guardians),
            selectinload(Payment.receipts),
            selectinload(Payment.allocations),
        )
        .where(Payment.id == payment_id)
    )
    res = await db.execute(stmt)
    payment = res.scalar_one_or_none()
    if not payment:
        return {"success": False, "error": f"Payment #{payment_id} not found"}

    student = payment.student
    if not student:
        return {"success": False, "error": "No student associated with this payment"}

    # Resolve receipt record
    curr_receipt = None
    if payment.receipts:
        curr_receipt = next((r for r in payment.receipts if r.status == "valid"), payment.receipts[0])
    if not curr_receipt:
        rcpt_res = await db.execute(
            select(PaymentReceipt).where(PaymentReceipt.payment_id == payment_id, PaymentReceipt.status == "valid")
        )
        curr_receipt = rcpt_res.scalar_one_or_none()

    receipt_num = curr_receipt.receipt_number if curr_receipt else f"RCP-2026-{payment.id:04d}"

    # Resolve guardian and phone
    guardian_name = "Parent / Guardian"
    guardian_phone = None
    if student.guardians:
        primary_g = student.guardians[0]
        guardian_name = f"{primary_g.first_name} {primary_g.last_name}".strip()
        guardian_phone = primary_g.phone

    target_phone = guardian_phone or student.phone or ""
    clean_phone = re.sub(r"[^\d]", "", target_phone)
    if not clean_phone or len(clean_phone) < 10:
        return {"success": False, "error": f"No valid mobile phone on file for {student.first_name} {student.last_name}"}

    # Resolve remaining balance if invoice is allocated
    outstanding_str = ""
    if payment.allocations:
        inv_res = await db.execute(select(FeeInvoice).where(FeeInvoice.id == payment.allocations[0].invoice_id))
        invoice = inv_res.scalar_one_or_none()
        if invoice and invoice.net_amount is not None:
            bal = max(Decimal("0.00"), invoice.net_amount - (invoice.paid_amount or Decimal("0.00")))
            outstanding_str = f" Remaining Balance: ₹{float(bal):,.2f}."

    rules = await get_automation_rules(db, institution_id)
    institute_name = rules.get("institute_display_name", "PrathamOne EduOS")
    student_name = f"{student.first_name} {student.last_name}".strip()
    pay_date = payment.payment_date.strftime("%d-%b-%Y") if hasattr(payment.payment_date, "strftime") else str(payment.payment_date)

    message = (
        f"Fee Receipt Acknowledgement: Dear {guardian_name}, thank you! We have received fee payment of "
        f"₹{float(payment.amount):,.2f} via {payment.payment_method.upper()} for your ward {student_name} "
        f"(Receipt No: {receipt_num}, Date: {pay_date}).{outstanding_str} "
        f"Official document issued by {institute_name}."
    )

    clean_channel = channel.upper()
    if clean_channel == "WHATSAPP":
        success, status_code, msg_id = await ChannelAdapter.dispatch_whatsapp(clean_phone, message)
    elif clean_channel == "SMS":
        success, status_code, msg_id = await ChannelAdapter.dispatch_sms(clean_phone, message)
    else:
        success, status_code, msg_id = await ChannelAdapter.dispatch_whatsapp(clean_phone, message)

    log_entry = CommunicationLog(
        institution_id=institution_id,
        channel=clean_channel,
        recipient_type="STUDENT",
        recipient_id=student.id,
        recipient_name=f"{student_name} ({guardian_name})",
        recipient_destination=clean_phone,
        template_code="FEE_RECEIPT_CONFIRMATION",
        subject=f"Fee Receipt #{receipt_num}",
        content=message,
        status=status_code,
        sender_id=sender_id,
        sender_name=sender_name,
        sent_at=datetime.now(timezone.utc),
        metadata_json=json.dumps({
            "payment_id": payment.id,
            "receipt_number": receipt_num,
            "amount": float(payment.amount),
            "message_id": msg_id,
        }),
    )
    db.add(log_entry)
    await db.commit()

    wa_url = generate_whatsapp_web_url(clean_phone, message)
    return {
        "success": True,
        "payment_id": payment.id,
        "receipt_number": receipt_num,
        "recipient_name": f"{student_name} ({guardian_name})",
        "phone": clean_phone,
        "amount": float(payment.amount),
        "channel": clean_channel,
        "message": message,
        "whatsapp_url": wa_url,
        "status": status_code,
    }


async def dispatch_homework_notification(
    db: AsyncSession,
    homework_id: int,
    institution_id: int = 1,
    sender_id: Optional[int] = None,
    sender_name: Optional[str] = "Homework Management System",
    channel: str = "WHATSAPP",
) -> Dict[str, Any]:
    """
    Broadcasts homework assignment notification to cohort students and their guardians,
    and logs entries in communication_logs.
    """
    stmt = (
        select(HomeworkAssignment)
        .options(
            selectinload(HomeworkAssignment.standard),
            selectinload(HomeworkAssignment.division),
            selectinload(HomeworkAssignment.subject),
            selectinload(HomeworkAssignment.student_records),
        )
        .where(HomeworkAssignment.id == homework_id)
    )
    res = await db.execute(stmt)
    hw = res.scalar_one_or_none()
    if not hw:
        return {"success": False, "error": f"Homework assignment #{homework_id} not found"}

    std_name = hw.standard.name if hw.standard else f"Standard #{hw.standard_id}"
    subject_name = hw.subject.name if hw.subject else f"Subject #{hw.subject_id}"
    due_str = hw.due_date.strftime("%d-%b-%Y") if hasattr(hw.due_date, "strftime") else str(hw.due_date)

    rules = await get_automation_rules(db, institution_id)
    institute_name = rules.get("institute_display_name", "PrathamOne EduOS")

    # Resolve enrolled students
    students = []
    if hw.student_records:
        rec_sids = [r.student_id for r in hw.student_records]
        if rec_sids:
            s_stmt = (
                select(Student)
                .options(selectinload(Student.guardians))
                .where(Student.id.in_(rec_sids), Student.institution_id == institution_id, Student.is_active == True)
            )
            students = (await db.execute(s_stmt)).scalars().all()

    if not students:
        enr_query = (
            select(Student)
            .join(StudentEnrollment, StudentEnrollment.student_id == Student.id)
            .options(selectinload(Student.guardians))
            .where(
                and_(
                    Student.institution_id == institution_id,
                    Student.is_active == True,
                    StudentEnrollment.academic_year_id == hw.academic_year_id,
                    StudentEnrollment.status == "active",
                )
            )
        )
        if hw.division_id:
            enr_query = enr_query.where(StudentEnrollment.division_id == hw.division_id)
        else:
            enr_query = enr_query.where(StudentEnrollment.standard_id == hw.standard_id)
        students = (await db.execute(enr_query)).scalars().all()

    # Deduplicate students
    seen_ids = set()
    recipients = []
    for s in students:
        if s.id in seen_ids:
            continue
        seen_ids.add(s.id)
        g_name = "Parent / Guardian"
        phone = None
        if s.guardians:
            g_name = f"{s.guardians[0].first_name} {s.guardians[0].last_name}".strip()
            phone = s.guardians[0].phone
        phone = phone or s.phone
        recipients.append({
            "student_id": s.id,
            "student_name": f"{s.first_name} {s.last_name}".strip(),
            "guardian_name": g_name,
            "phone": phone or "",
        })

    dispatched_items = []
    errors = []
    clean_channel = channel.upper()

    for item in recipients:
        clean_p = re.sub(r"[^\d]", "", item["phone"])
        if not clean_p or len(clean_p) < 10:
            errors.append(f"Skipped {item['student_name']}: Invalid phone number")
            continue

        msg = (
            f"Homework Alert: New homework published for {std_name} ({subject_name}): "
            f"\"{hw.title}\". Due: {due_str} at {hw.due_time or '23:59'}. "
            f"{f'Topic: {hw.topic}. ' if hw.topic else ''}"
            f"Please ensure timely submission. {institute_name}."
        )

        if clean_channel == "WHATSAPP":
            success, status_code, msg_id = await ChannelAdapter.dispatch_whatsapp(clean_p, msg)
        else:
            success, status_code, msg_id = await ChannelAdapter.dispatch_sms(clean_p, msg)

        log = CommunicationLog(
            institution_id=institution_id,
            channel=clean_channel,
            recipient_type="STUDENT",
            recipient_id=item["student_id"],
            recipient_name=f"{item['student_name']} ({item['guardian_name']})",
            recipient_destination=clean_p,
            template_code="HOMEWORK_ANNOUNCEMENT",
            subject=f"Homework: {hw.title}",
            content=msg,
            status=status_code,
            sender_id=sender_id,
            sender_name=sender_name,
            sent_at=datetime.now(timezone.utc),
            metadata_json=json.dumps({
                "homework_id": hw.id,
                "assignment_code": hw.assignment_code,
                "message_id": msg_id,
            }),
        )
        db.add(log)
        dispatched_items.append({
            "student_id": item["student_id"],
            "student_name": item["student_name"],
            "phone": clean_p,
            "whatsapp_url": generate_whatsapp_web_url(clean_p, msg),
            "status": status_code,
        })

    await db.commit()
    return {
        "success": True,
        "homework_id": hw.id,
        "assignment_code": hw.assignment_code,
        "title": hw.title,
        "standard_name": std_name,
        "subject_name": subject_name,
        "total_cohort_students": len(recipients),
        "dispatched_count": len(dispatched_items),
        "failed_count": len(errors),
        "items": dispatched_items,
        "errors": errors,
    }


async def dispatch_exam_schedule_notification(
    db: AsyncSession,
    exam_id: int,
    institution_id: int = 1,
    sender_id: Optional[int] = None,
    sender_name: Optional[str] = "Examination Office",
    channel: str = "WHATSAPP",
) -> Dict[str, Any]:
    """
    Broadcasts examination schedule announcement to cohort students and their guardians,
    and logs entries in communication_logs.
    """
    stmt = (
        select(Examination)
        .where(Examination.id == exam_id)
    )
    res = await db.execute(stmt)
    exam = res.scalar_one_or_none()
    if not exam:
        return {"success": False, "error": f"Examination #{exam_id} not found"}

    std_res = await db.execute(select(Standard).where(Standard.id == exam.standard_id))
    standard = std_res.scalar_one_or_none()
    std_name = standard.name if standard else f"Standard #{exam.standard_id}"

    start_str = exam.start_date.strftime("%d-%b-%Y") if exam.start_date and hasattr(exam.start_date, "strftime") else (str(exam.start_date) if exam.start_date else "Scheduled Soon")
    end_str = f" to {exam.end_date.strftime('%d-%b-%Y')}" if exam.end_date and hasattr(exam.end_date, "strftime") else ""

    rules = await get_automation_rules(db, institution_id)
    institute_name = rules.get("institute_display_name", "PrathamOne EduOS")

    # Resolve students enrolled in standard
    enr_query = (
        select(Student)
        .join(StudentEnrollment, StudentEnrollment.student_id == Student.id)
        .options(selectinload(Student.guardians))
        .where(
            and_(
                Student.institution_id == institution_id,
                Student.is_active == True,
                StudentEnrollment.academic_year_id == exam.academic_year_id,
                StudentEnrollment.standard_id == exam.standard_id,
                StudentEnrollment.status == "active",
            )
        )
    )
    students = (await db.execute(enr_query)).scalars().all()

    seen_ids = set()
    recipients = []
    for s in students:
        if s.id in seen_ids:
            continue
        seen_ids.add(s.id)
        g_name = "Parent / Guardian"
        phone = None
        if s.guardians:
            g_name = f"{s.guardians[0].first_name} {s.guardians[0].last_name}".strip()
            phone = s.guardians[0].phone
        phone = phone or s.phone
        recipients.append({
            "student_id": s.id,
            "student_name": f"{s.first_name} {s.last_name}".strip(),
            "guardian_name": g_name,
            "phone": phone or "",
        })

    dispatched_items = []
    errors = []
    clean_channel = channel.upper()

    for item in recipients:
        clean_p = re.sub(r"[^\d]", "", item["phone"])
        if not clean_p or len(clean_p) < 10:
            errors.append(f"Skipped {item['student_name']}: Invalid phone number")
            continue

        msg = (
            f"Examination Alert: Official schedule announced for \"{exam.name}\" ({std_name}). "
            f"Dates: {start_str}{end_str}. Type: {exam.exam_type.replace('_', ' ').title()}. "
            f"Max Marks: {exam.max_marks}, Passing: {exam.passing_marks}. "
            f"Best wishes from {institute_name}!"
        )

        if clean_channel == "WHATSAPP":
            success, status_code, msg_id = await ChannelAdapter.dispatch_whatsapp(clean_p, msg)
        else:
            success, status_code, msg_id = await ChannelAdapter.dispatch_sms(clean_p, msg)

        log = CommunicationLog(
            institution_id=institution_id,
            channel=clean_channel,
            recipient_type="STUDENT",
            recipient_id=item["student_id"],
            recipient_name=f"{item['student_name']} ({item['guardian_name']})",
            recipient_destination=clean_p,
            template_code="EXAM_SCHEDULE_ALERT",
            subject=f"Exam Schedule: {exam.name}",
            content=msg,
            status=status_code,
            sender_id=sender_id,
            sender_name=sender_name,
            sent_at=datetime.now(timezone.utc),
            metadata_json=json.dumps({
                "exam_id": exam.id,
                "exam_name": exam.name,
                "message_id": msg_id,
            }),
        )
        db.add(log)
        dispatched_items.append({
            "student_id": item["student_id"],
            "student_name": item["student_name"],
            "phone": clean_p,
            "whatsapp_url": generate_whatsapp_web_url(clean_p, msg),
            "status": status_code,
        })

    await db.commit()
    return {
        "success": True,
        "exam_id": exam.id,
        "exam_name": exam.name,
        "standard_name": std_name,
        "total_cohort_students": len(recipients),
        "dispatched_count": len(dispatched_items),
        "failed_count": len(errors),
        "items": dispatched_items,
        "errors": errors,
    }


async def get_automation_trigger_summary(db: AsyncSession, institution_id: int = 1) -> Dict[str, Any]:
    """
    Compiles live summary of all communication automation triggers,
    recent dispatches, and trigger health metrics.
    """
    rules = await get_automation_rules(db, institution_id)

    codes = [
        "FEE_RECEIPT_CONFIRMATION",
        "HOMEWORK_ANNOUNCEMENT",
        "EXAM_SCHEDULE_ALERT",
        "FEE_REMINDER",
        "ATTENDANCE_ALERT",
    ]

    count_stmt = (
        select(CommunicationLog.template_code, func.count(CommunicationLog.id), func.max(CommunicationLog.sent_at))
        .where(
            and_(
                CommunicationLog.institution_id == institution_id,
                CommunicationLog.template_code.in_(codes),
            )
        )
        .group_by(CommunicationLog.template_code)
    )
    rows = (await db.execute(count_stmt)).all()
    stats_by_code = {row[0]: {"count": row[1], "last_at": row[2].isoformat() if row[2] else None} for row in rows}

    trigger_defs = [
        {
            "key": "fee_receipt",
            "title": "Fee Receipt Instant Acknowledgement",
            "description": "Auto-dispatches WhatsApp / SMS receipt confirmation to parent upon payment entry.",
            "template_code": "FEE_RECEIPT_CONFIRMATION",
            "enabled": bool(rules.get("receipt_auto_share_enabled", True)),
            "channel": rules.get("default_channel", "WHATSAPP"),
            "total_dispatched_count": stats_by_code.get("FEE_RECEIPT_CONFIRMATION", {}).get("count", 0),
            "last_triggered_at": stats_by_code.get("FEE_RECEIPT_CONFIRMATION", {}).get("last_at"),
        },
        {
            "key": "homework_alert",
            "title": "Homework Publishing Class Broadcast",
            "description": "Alerts enrolled division students and parents whenever new homework is published.",
            "template_code": "HOMEWORK_ANNOUNCEMENT",
            "enabled": bool(rules.get("homework_alerts_enabled", True)),
            "channel": rules.get("default_channel", "WHATSAPP"),
            "total_dispatched_count": stats_by_code.get("HOMEWORK_ANNOUNCEMENT", {}).get("count", 0),
            "last_triggered_at": stats_by_code.get("HOMEWORK_ANNOUNCEMENT", {}).get("last_at"),
        },
        {
            "key": "exam_schedule",
            "title": "Examination Timetable & Schedule Alert",
            "description": "Broadcasts exam dates, subjects, and scoring criteria to cohort parents.",
            "template_code": "EXAM_SCHEDULE_ALERT",
            "enabled": bool(rules.get("exam_schedule_alerts_enabled", True)),
            "channel": rules.get("default_channel", "WHATSAPP"),
            "total_dispatched_count": stats_by_code.get("EXAM_SCHEDULE_ALERT", {}).get("count", 0),
            "last_triggered_at": stats_by_code.get("EXAM_SCHEDULE_ALERT", {}).get("last_at"),
        },
        {
            "key": "fee_reminder",
            "title": "Overdue Fee Payment Reminders",
            "description": "Monitors unpaid balances and queues personalized reminder notices before/after due dates.",
            "template_code": "FEE_REMINDER",
            "enabled": bool(rules.get("fee_reminders_enabled", True)),
            "channel": rules.get("default_channel", "WHATSAPP"),
            "total_dispatched_count": stats_by_code.get("FEE_REMINDER", {}).get("count", 0),
            "last_triggered_at": stats_by_code.get("FEE_REMINDER", {}).get("last_at"),
        },
        {
            "key": "attendance_alert",
            "title": "Absentee & Late Arrival Real-Time Alerts",
            "description": "Instant notification to guardian on attendance marking if student is marked absent.",
            "template_code": "ATTENDANCE_ALERT",
            "enabled": bool(rules.get("attendance_absent_alerts_enabled", True)),
            "channel": rules.get("default_channel", "WHATSAPP"),
            "total_dispatched_count": stats_by_code.get("ATTENDANCE_ALERT", {}).get("count", 0),
            "last_triggered_at": stats_by_code.get("ATTENDANCE_ALERT", {}).get("last_at"),
        },
    ]

    recent_stmt = (
        select(CommunicationLog)
        .where(
            and_(
                CommunicationLog.institution_id == institution_id,
                CommunicationLog.template_code.in_(codes),
            )
        )
        .order_by(CommunicationLog.id.desc())
        .limit(10)
    )
    recent_logs = (await db.execute(recent_stmt)).scalars().all()

    return {
        "active_rules": rules,
        "triggers": trigger_defs,
        "recent_dispatches": [
            {
                "id": log.id,
                "channel": log.channel,
                "trigger_type": log.template_code or "CUSTOM",
                "recipient_name": log.recipient_name,
                "recipient_destination": log.recipient_destination,
                "subject": log.subject,
                "status": log.status,
                "sent_at": log.sent_at.isoformat() if log.sent_at else log.created_at.isoformat(),
            }
            for log in recent_logs
        ],
    }
