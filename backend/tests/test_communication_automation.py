# /**
#  * @file        test_communication_automation.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      backend.tests
#  *
#  * @author      Jawahar R. Mallah
#  * @organization AITDL (AI Technology & Development Lab)
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 AITDL
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-06
#  * @updated     2026-11-06
#  *
#  * @description Test suite for real-time automated communication, fee reminders queue, and attendance alerts.
#  */

import pytest
from httpx import AsyncClient
from decimal import Decimal
from datetime import date, datetime, timezone

from app.models.student import Student, Guardian
from app.models.fee import FeeInvoice
from app.models.communication import CommunicationLog
from app.services.communication import (
    get_automation_rules,
    update_automation_rules,
    generate_fee_reminder_queue,
    dispatch_fee_reminders,
    dispatch_attendance_alert,
    generate_whatsapp_web_url,
)


@pytest.mark.asyncio
async def test_automation_rules_get_and_update(db, test_institution):
    """Verifies default automation rules and persisting custom configuration."""
    rules = await get_automation_rules(db, institution_id=test_institution.id)
    assert rules is not None
    assert rules["fee_reminders_enabled"] is True
    assert rules["default_channel"] == "WHATSAPP"

    # Update rules
    updated = await update_automation_rules(
        db, institution_id=test_institution.id, new_rules={"fee_reminder_days_before": 5, "fee_reminders_enabled": True}
    )
    assert updated["fee_reminder_days_before"] == 5

    # Refetch
    refetched = await get_automation_rules(db, institution_id=test_institution.id)
    assert refetched["fee_reminder_days_before"] == 5


@pytest.mark.asyncio
async def test_fee_reminders_queue_and_dispatch(db, test_institution, test_student, test_fee_invoice, admin_user):
    """Verifies fee reminder queue generation and batch dispatch logging."""
    guardian = Guardian(
        student_id=test_student.id,
        relation="Father",
        first_name="Suresh",
        last_name="Deshmukh",
        phone="+91-9892011223",
    )
    db.add(guardian)
    await db.commit()

    # Generate queue
    queue = await generate_fee_reminder_queue(db, institution_id=test_institution.id, min_balance=100.0)
    assert len(queue) >= 1
    target_item = next((item for item in queue if item["student_id"] == test_student.id), None)
    assert target_item is not None
    assert target_item["pending_amount"] == 24000.0
    assert "Suresh Deshmukh" in target_item["guardian_name"]
    assert "https://wa.me/919892011223" in target_item["whatsapp_url"]
    assert "24,000.00" in target_item["message"]

    # Dispatch reminder
    dispatch_res = await dispatch_fee_reminders(
        db, institution_id=test_institution.id, reminders=[target_item], sender_id=admin_user.id, sender_name="Test Runner"
    )
    assert dispatch_res["success"] is True
    assert dispatch_res["dispatched_count"] == 1


@pytest.mark.asyncio
async def test_attendance_absent_alert_dispatch(db, test_institution, test_student, admin_user):
    """Verifies instant absentee alert generation and logging."""
    guardian = Guardian(
        student_id=test_student.id,
        relation="Mother",
        first_name="Sunita",
        last_name="Kadam",
        phone="+91-9820099887",
    )
    db.add(guardian)
    await db.commit()

    alert_res = await dispatch_attendance_alert(
        db,
        institution_id=test_institution.id,
        student_id=test_student.id,
        att_date="2026-11-06",
        att_status="absent",
        remarks="Unannounced absence",
        sender_id=admin_user.id,
        sender_name="Class Teacher",
    )
    assert alert_res["success"] is True
    assert test_student.first_name in alert_res["recipient_name"]
    assert alert_res["phone"] == "919820099887"
    assert "ABSENT" in alert_res["message"]
    assert "https://wa.me/919820099887" in alert_res["whatsapp_url"]
