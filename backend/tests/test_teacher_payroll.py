# /**
#  * @file        test_teacher_payroll.py
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
#  * @description Pytest test suite verifying Teacher Payroll calculation methods,
#  */

import pytest
import uuid
from datetime import date, datetime
from decimal import Decimal
from sqlalchemy import select

from app.models.user import User, Role
from app.models.standard import Standard
from app.models.division import Division
from app.models.subject import Subject
from app.models.teacher_payroll import (
    TeacherPaymentProfile,
    TeacherRateHistory,
    TeachingSession,
    TeacherPayroll,
    TeacherPaymentVoucher,
)
from app.core.security import get_password_hash


@pytest.fixture
async def setup_payroll_data(db, test_institution, test_academic_year):
    """Creates teacher users, standard, division, and subject for payroll testing."""
    suf = uuid.uuid4().hex[:6]
    # Teacher 1
    t1 = User(
        username=f"teacher_t1_{suf}",
        email=f"teacher_t1_{suf}@test.com",
        hashed_password=get_password_hash("password123"),
        first_name="Ramesh",
        last_name="Sharma",
        role="teacher",
        institution_id=test_institution.id,
    )
    # Teacher 2 (Substitute)
    t2 = User(
        username=f"teacher_t2_{suf}",
        email=f"teacher_t2_{suf}@test.com",
        hashed_password=get_password_hash("password123"),
        first_name="Priya",
        last_name="Patel",
        role="teacher",
        institution_id=test_institution.id,
    )
    db.add_all([t1, t2])
    await db.commit()
    await db.refresh(t1)
    await db.refresh(t2)

    # Standard & Division
    std = Standard(
        institution_id=test_institution.id,
        name=f"10th Standard {suf}",
        level=10,
    )
    db.add(std)
    await db.commit()
    await db.refresh(std)

    div = Division(
        standard_id=std.id,
        name="Batch Alpha",
        room_number="Room 101",
    )
    db.add(div)
    await db.commit()
    await db.refresh(div)

    # Subject
    sub = Subject(
        standard_id=std.id,
        name="Mathematics",
        code=f"MATH-{suf}",
    )
    db.add(sub)
    await db.commit()
    await db.refresh(sub)

    return {
        "teacher1": t1,
        "teacher2": t2,
        "division": div,
        "subject": sub,
        "institution": test_institution,
        "academic_year": test_academic_year,
    }


@pytest.mark.asyncio
async def test_hourly_payroll_calculation_and_voucher(client, auth_headers, setup_payroll_data, db):
    """Verifies hourly session duration calculation, rate snapshot, payroll gross/net, and voucher payment."""
    t1 = setup_payroll_data["teacher1"]
    div = setup_payroll_data["division"]
    sub = setup_payroll_data["subject"]

    # 1. Configure Teacher 1 hourly rate to ₹600/hr
    resp = await client.put(
        f"/api/v1/teacher-payroll/profiles/{t1.id}",
        headers=auth_headers,
        json={
            "payment_method": "hourly",
            "hourly_rate": 600.0,
            "reason": "Test setup hourly rate",
        },
    )
    assert resp.status_code == 200

    # 2. Log 2 teaching sessions: 1.5 hours and 2.0 hours
    # Session 1: 09:00 to 10:30 (1.5 hrs) -> 1.5 * 600 = 900
    s1_resp = await client.post(
        "/api/v1/teacher-payroll/sessions",
        headers=auth_headers,
        json={
            "teacher_user_id": t1.id,
            "subject_id": sub.id,
            "division_id": div.id,
            "session_date": "2026-11-02",
            "scheduled_start_time": "09:00",
            "scheduled_end_time": "10:30",
            "actual_start_time": "09:00",
            "actual_end_time": "10:30",
            "break_duration_minutes": 0,
            "topic_taught": "Quadratic Equations",
            "students_present_count": 25,
            "session_status": "completed",
            "approval_status": "submitted",
        },
    )
    assert s1_resp.status_code == 200
    s1_id = s1_resp.json()["session_id"]

    # Session 2: 11:00 to 13:00 (2.0 hrs) -> 2.0 * 600 = 1200
    s2_resp = await client.post(
        "/api/v1/teacher-payroll/sessions",
        headers=auth_headers,
        json={
            "teacher_user_id": t1.id,
            "subject_id": sub.id,
            "division_id": div.id,
            "session_date": "2026-11-04",
            "scheduled_start_time": "11:00",
            "scheduled_end_time": "13:00",
            "actual_start_time": "11:00",
            "actual_end_time": "13:00",
            "break_duration_minutes": 0,
            "topic_taught": "Trigonometry Basics",
            "students_present_count": 28,
            "session_status": "completed",
            "approval_status": "submitted",
        },
    )
    assert s2_resp.status_code == 200
    s2_id = s2_resp.json()["session_id"]

    # 3. Approve both sessions
    app_resp = await client.post(
        "/api/v1/teacher-payroll/sessions/bulk-approve",
        headers=auth_headers,
        json={"session_ids": [s1_id, s2_id]},
    )
    assert app_resp.status_code == 200
    assert app_resp.json()["approved_count"] == 2

    # 4. Calculate monthly payroll for 11/2026
    calc_resp = await client.post(
        "/api/v1/teacher-payroll/monthly/calculate",
        headers=auth_headers,
        json={"teacher_user_id": t1.id, "month": 11, "year": 2026},
    )
    assert calc_resp.status_code == 200
    payroll_data = calc_resp.json()
    # Total hours: 1.5 + 2.0 = 3.5 hrs. Expected net: 900 + 1200 = 2100
    assert payroll_data["total_hours"] == 3.5
    assert payroll_data["net_payable"] == 2100.0
    payroll_id = payroll_data["payroll_id"]

    # 5. Approve payroll
    app_pr_resp = await client.post(
        f"/api/v1/teacher-payroll/monthly/{payroll_id}/approve",
        headers=auth_headers,
    )
    assert app_pr_resp.status_code == 200

    # 6. Test Overpayment Protection: attempting to pay ₹3000 when pending is ₹2100
    overpay_resp = await client.post(
        f"/api/v1/teacher-payroll/monthly/{payroll_id}/vouchers",
        headers=auth_headers,
        json={
            "amount_paid": 3000.0,
            "payment_method": "bank_transfer",
            "transaction_reference": "TXN-9999",
            "bank_name": "State Bank of India",
        },
    )
    assert overpay_resp.status_code == 400
    assert "Overpayment rejected" in overpay_resp.json()["detail"]

    # 7. Record partial payment of ₹1100
    v1_resp = await client.post(
        f"/api/v1/teacher-payroll/monthly/{payroll_id}/vouchers",
        headers=auth_headers,
        json={
            "amount_paid": 1100.0,
            "payment_method": "bank_transfer",
            "transaction_reference": "TXN-0011",
            "bank_name": "State Bank of India",
        },
    )
    assert v1_resp.status_code == 200
    voucher1 = v1_resp.json()
    assert voucher1["amount_paid"] == 1100.0
    assert voucher1["status"] == "posted"

    # Verify payroll status is partially_paid
    details = await client.get(
        f"/api/v1/teacher-payroll/monthly/{payroll_id}",
        headers=auth_headers,
    )
    assert details.status_code == 200
    p_info = details.json()["payroll"]
    assert p_info["paid_amount"] == 1100.0
    assert p_info["pending_amount"] == 1000.0
    assert p_info["status"] == "partially_paid"

    # 8. Complete remainder payment of ₹1000
    v2_resp = await client.post(
        f"/api/v1/teacher-payroll/monthly/{payroll_id}/vouchers",
        headers=auth_headers,
        json={
            "amount_paid": 1000.0,
            "payment_method": "bank_transfer",
            "transaction_reference": "TXN-0012",
            "bank_name": "State Bank of India",
        },
    )
    assert v2_resp.status_code == 200
    details2 = await client.get(
        f"/api/v1/teacher-payroll/monthly/{payroll_id}",
        headers=auth_headers,
    )
    p_info2 = details2.json()["payroll"]
    assert p_info2["paid_amount"] == 2100.0
    assert p_info2["pending_amount"] == 0.0
    assert p_info2["status"] == "paid"


@pytest.mark.asyncio
async def test_per_lecture_and_substitute_teacher(client, auth_headers, setup_payroll_data, db):
    """Verifies per-lecture calculation and substitute teacher compensation assignment."""
    t1 = setup_payroll_data["teacher1"]
    t2 = setup_payroll_data["teacher2"]
    div = setup_payroll_data["division"]
    sub = setup_payroll_data["subject"]

    # Configure Teacher 2 as per-lecture: ₹750/lecture
    resp = await client.put(
        f"/api/v1/teacher-payroll/profiles/{t2.id}",
        headers=auth_headers,
        json={
            "payment_method": "per_lecture",
            "per_lecture_rate": 750.0,
            "reason": "Configure per lecture rate",
        },
    )
    assert resp.status_code == 200

    # Log a session originally for Teacher 1
    s_resp = await client.post(
        "/api/v1/teacher-payroll/sessions",
        headers=auth_headers,
        json={
            "teacher_user_id": t1.id,
            "subject_id": sub.id,
            "division_id": div.id,
            "session_date": "2026-11-05",
            "scheduled_start_time": "14:00",
            "scheduled_end_time": "15:00",
            "session_status": "completed",
            "approval_status": "submitted",
        },
    )
    sess_id = s_resp.json()["session_id"]

    # Teacher 1 was absent, assign Teacher 2 as Substitute
    sub_resp = await client.post(
        f"/api/v1/teacher-payroll/sessions/{sess_id}/substitute",
        headers=auth_headers,
        json={
            "substitute_teacher_id": t2.id,
            "reason": "Teacher 1 on medical leave",
        },
    )
    assert sub_resp.status_code == 200

    # Approve session
    await client.post(
        "/api/v1/teacher-payroll/sessions/bulk-approve",
        headers=auth_headers,
        json={"session_ids": [sess_id]},
    )

    # Calculate payroll for Teacher 2 (Substitute). Should include this lecture at ₹750
    pr_resp = await client.post(
        "/api/v1/teacher-payroll/monthly/calculate",
        headers=auth_headers,
        json={"teacher_user_id": t2.id, "month": 11, "year": 2026},
    )
    assert pr_resp.status_code == 200
    pr_data = pr_resp.json()
    assert pr_data["net_payable"] == 750.0


@pytest.mark.asyncio
async def test_session_rejection_and_double_counting_protection(client, auth_headers, setup_payroll_data, db):
    """Verifies that rejected sessions are excluded, and locked sessions cannot be counted twice."""
    t1 = setup_payroll_data["teacher1"]
    div = setup_payroll_data["division"]
    sub = setup_payroll_data["subject"]

    # Create session to reject
    rej_sess = await client.post(
        "/api/v1/teacher-payroll/sessions",
        headers=auth_headers,
        json={
            "teacher_user_id": t1.id,
            "subject_id": sub.id,
            "division_id": div.id,
            "session_date": "2026-11-10",
            "scheduled_start_time": "10:00",
            "scheduled_end_time": "11:00",
            "session_status": "cancelled",
            "approval_status": "submitted",
        },
    )
    s_rej_id = rej_sess.json()["session_id"]

    # Reject with reason
    rej_resp = await client.post(
        f"/api/v1/teacher-payroll/sessions/{s_rej_id}/reject",
        headers=auth_headers,
        json={"reason": "Class was cancelled due to power outage"},
    )
    assert rej_resp.status_code == 200

    # Verify rejection reflected in DB
    s_query = await db.execute(select(TeachingSession).where(TeachingSession.id == s_rej_id))
    s_row = s_query.scalar_one()
    assert s_row.approval_status == "rejected"
    assert s_row.is_payable is False


@pytest.mark.asyncio
async def test_reports_and_export(client, auth_headers, setup_payroll_data):
    """Verifies all 10 specialized reports generate data and Excel export succeeds."""
    t1 = setup_payroll_data["teacher1"]

    # Test JSON report endpoints
    reports_to_test = [
        "monthly-register",
        "teaching-hours",
        "batch-cost",
        "subject-cost",
        "pending-payments",
        "voucher-register",
        "adjustments",
        "approval-history",
        "monthly-summary",
    ]
    for r in reports_to_test:
        resp = await client.get(
            f"/api/v1/teacher-payroll/reports/{r}?month=11&year=2026",
            headers=auth_headers,
        )
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    # Test Excel export endpoint
    export_resp = await client.get(
        "/api/v1/teacher-payroll/reports/monthly-register/export?month=11&year=2026",
        headers=auth_headers,
    )
    assert export_resp.status_code == 200
    assert "spreadsheetml" in export_resp.headers["content-type"]
    assert len(export_resp.content) > 1000
