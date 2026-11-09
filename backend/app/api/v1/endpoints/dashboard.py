# /**
#  * @file        dashboard.py
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
#  * @updated     2026-11-10
#  *
#  * @description API endpoints for administrative executive dashboard, financial accuracy, status-wise outstanding breakdown, aging recovery, multi-tab analytics, and operational intelligence.
#  */

import re
from datetime import date, datetime, timedelta
from typing import Optional, List, Dict, Any
from decimal import Decimal
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_, case, desc

from app.core.database import get_db
from app.core.deps import (
    get_current_active_user,
    require_role,
    get_data_environment,
    enforce_institution_access,
)
from app.models.student import Student
from app.models.payment import Payment, PaymentReceipt, PaymentAllocation, Refund
from app.models.fee import FeeInvoice, FeeInvoiceItem, FeeStructure, FeeCategory
from app.models.enrollment import StudentEnrollment
from app.models.standard import Standard
from app.models.division import Division
from app.models.board import Board
from app.models.academic_year import AcademicYear
from app.models.crm import Lead, LeadFollowUp, LeadDemoClass
from app.models.attendance import Attendance
from app.models.exam import Examination, ExamMark
from app.models.subject import Subject
from app.services.settings_service import get_institution_setting
from app.services.student_metrics import (
    get_authoritative_student_count,
    get_student_reconciliation_diagnostic,
)
from app.services.codex_service import CodeXService

router = APIRouter()


def sanitize_student_name(first_name: Optional[str], last_name: Optional[str]) -> str:
    """Sanitize student name without trailing hyphens or redundant whitespaces."""
    full = f"{first_name or ''} {last_name or ''}".strip()
    return re.sub(r"[\s\-]+$", "", full)


def get_latest_enrollment_subquery():
    """Subquery selecting the latest enrollment per student and academic year to prevent Cartesian duplication."""
    return (
        select(
            StudentEnrollment.id.label("id"),
            StudentEnrollment.student_id.label("student_id"),
            StudentEnrollment.academic_year_id.label("academic_year_id"),
            StudentEnrollment.standard_id.label("standard_id"),
            StudentEnrollment.division_id.label("division_id"),
            StudentEnrollment.status.label("status"),
        )
        .distinct(StudentEnrollment.student_id, StudentEnrollment.academic_year_id)
        .order_by(
            StudentEnrollment.student_id,
            StudentEnrollment.academic_year_id,
            StudentEnrollment.id.desc(),
        )
        .subquery("latest_enrollment")
    )


def get_student_category_case(enrollment_model=None):
    """Authoritative SQL classification expression for student lifecycle status."""
    enr = enrollment_model if enrollment_model is not None else StudentEnrollment
    status_col = getattr(enr, "c", enr).status
    return case(
        (status_col == "transferred", "transferred"),
        (
            or_(
                Student.exit_date.isnot(None),
                Student.exit_reason.isnot(None),
                status_col.in_(["withdrawn", "left", "discontinued", "dropped"]),
            ),
            "left",
        ),
        (status_col == "cancelled", "cancelled"),
        (
            or_(
                and_(Student.is_active == False, Student.exit_date.is_(None), Student.exit_reason.is_(None)),
                status_col == "inactive",
            ),
            "inactive",
        ),
        (
            and_(Student.is_active == True, status_col == "active"),
            "active",
        ),
        else_="active",
    )


@router.get("/stats")
async def get_dashboard_stats(
    academic_year_id: Optional[int] = None,
    institution_id: Optional[int] = None,
    standard_id: Optional[int] = None,
    division_id: Optional[int] = None,
    board_id: Optional[int] = None,
    status: Optional[str] = Query(default=None),
    include_all_statuses: Optional[bool] = Query(default=None),
    data_env: str = Depends(get_data_environment),
    effective_inst_id: Optional[int] = Depends(enforce_institution_access),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(
        require_role(
            "superadmin", "sysadmin", "super_admin", "admin", "principal", "accountant", "staff", "teacher"
        )
    ),
):
    """
    Get dashboard metrics with filters:
    - Authoritative student count (Active default)
    - Primary KPI cards: Total Fees, Collected Fees, and Outstanding Balance (Active Students only by default)
    - Full Student Status-Wise Outstanding breakdown (Active, Inactive, Left, Transferred, Cancelled, Historical)
    - Secondary Financial Indicators (Today's Collection, Overdue Active Fees, Due This Month, Pending Verifications, Refunds)
    - Aging Recovery Analysis (Not Due, 1-30d, 31-60d, 61-90d, 90+d)
    - Daily Operations Summary (Admissions, Leads, Follow-ups, Demos, Due Dates)
    - Monthly collection trend with transaction count and incomplete month indicator
    - Recent payments with sanitized student names, fee category, and receipt metadata
    """
    is_demo_filter = True if data_env == "TRAINING" else (False if data_env == "PRODUCTION" else None)
    user_inst_id = effective_inst_id or getattr(current_user, "institution_id", None) or 1
    today = date.today()

    configured_visibility = await get_institution_setting(
        db, user_inst_id, "admission", "student_visibility_dashboard", "active_only"
    )

    effective_status = status
    if not effective_status or effective_status == "default":
        if include_all_statuses is True:
            effective_status = "all"
        elif include_all_statuses is False:
            effective_status = "active"
        else:
            effective_status = "all" if configured_visibility == "include_all" else "active"

    # 1. Authoritative Student Count according to visibility criteria
    total_students = await get_authoritative_student_count(
        db=db,
        institution_id=effective_inst_id,
        academic_year_id=academic_year_id,
        board_id=board_id,
        standard_id=standard_id,
        division_id=division_id,
        status=effective_status,
        is_demo=is_demo_filter,
    )

    # 2. Comprehensive Status-Wise Outstanding & Net Fee Aggregation
    # Using canonical latest_enrollment subquery to prevent Cartesian multiplication on student transfers
    latest_enr = get_latest_enrollment_subquery()
    cat_expr = get_student_category_case(latest_enr)

    breakdown_query = (
        select(
            cat_expr.label("category"),
            func.count(FeeInvoice.id).label("invoice_count"),
            func.count(func.distinct(Student.id)).label("student_count"),
            func.coalesce(func.sum(FeeInvoice.net_amount), 0).label("total_net"),
            func.coalesce(func.sum(FeeInvoice.paid_amount), 0).label("total_paid"),
            func.coalesce(func.sum(FeeInvoice.outstanding_amount), 0).label("total_outstanding"),
        )
        .join(Student, FeeInvoice.student_id == Student.id)
        .outerjoin(
            latest_enr,
            (FeeInvoice.student_id == latest_enr.c.student_id)
            & (FeeInvoice.academic_year_id == latest_enr.c.academic_year_id),
        )
        .where(FeeInvoice.status != "cancelled")
    )

    if effective_inst_id:
        breakdown_query = breakdown_query.where(Student.institution_id == effective_inst_id)
    if is_demo_filter is not None:
        breakdown_query = breakdown_query.where(Student.is_demo == is_demo_filter)
    if academic_year_id:
        breakdown_query = breakdown_query.where(FeeInvoice.academic_year_id == academic_year_id)
    if board_id:
        breakdown_query = breakdown_query.join(
            Division, latest_enr.c.division_id == Division.id
        ).where(Division.board_id == board_id)
    if standard_id:
        breakdown_query = breakdown_query.where(latest_enr.c.standard_id == standard_id)
    if division_id:
        breakdown_query = breakdown_query.where(latest_enr.c.division_id == division_id)

    breakdown_query = breakdown_query.group_by(cat_expr)
    breakdown_rows = (await db.execute(breakdown_query)).all()

    status_wise = {
        "active": {"invoiced": 0.0, "collected": 0.0, "outstanding": 0.0, "invoice_count": 0, "student_count": 0},
        "inactive": {"invoiced": 0.0, "collected": 0.0, "outstanding": 0.0, "invoice_count": 0, "student_count": 0},
        "left": {"invoiced": 0.0, "collected": 0.0, "outstanding": 0.0, "invoice_count": 0, "student_count": 0},
        "transferred": {"invoiced": 0.0, "collected": 0.0, "outstanding": 0.0, "invoice_count": 0, "student_count": 0},
        "cancelled": {"invoiced": 0.0, "collected": 0.0, "outstanding": 0.0, "invoice_count": 0, "student_count": 0},
        "total_historical": {"invoiced": 0.0, "collected": 0.0, "outstanding": 0.0, "invoice_count": 0, "student_count": 0},
    }

    for r in breakdown_rows:
        cat = r.category if r.category in status_wise else "active"
        inv = float(r.total_net)
        col = float(r.total_paid)
        out = float(r.total_outstanding)
        inv_cnt = int(r.invoice_count)
        std_cnt = int(r.student_count)

        status_wise[cat]["invoiced"] += inv
        status_wise[cat]["collected"] += col
        status_wise[cat]["outstanding"] += out
        status_wise[cat]["invoice_count"] += inv_cnt
        status_wise[cat]["student_count"] += std_cnt

        status_wise["total_historical"]["invoiced"] += inv
        status_wise["total_historical"]["collected"] += col
        status_wise["total_historical"]["outstanding"] += out
        status_wise["total_historical"]["invoice_count"] += inv_cnt
        status_wise["total_historical"]["student_count"] += std_cnt

    # Round all values in status_wise
    for k in status_wise:
        status_wise[k]["invoiced"] = round(status_wise[k]["invoiced"], 2)
        status_wise[k]["collected"] = round(status_wise[k]["collected"], 2)
        status_wise[k]["outstanding"] = round(status_wise[k]["outstanding"], 2)

    # Primary KPI assignment: DEFAULT IS STRICTLY ACTIVE STUDENTS ONLY
    norm_status = (effective_status or "active").strip().lower()
    if norm_status in ("all", "include_all"):
        target_bucket = status_wise["total_historical"]
    elif norm_status in ("inactive", "on_hold"):
        target_bucket = status_wise["inactive"]
    elif norm_status in ("left", "discontinued", "withdrawn"):
        target_bucket = status_wise["left"]
    elif norm_status == "transferred":
        target_bucket = status_wise["transferred"]
    elif norm_status == "cancelled":
        target_bucket = status_wise["cancelled"]
    else:
        # Default: Active Students Only
        target_bucket = status_wise["active"]

    total_fees = target_bucket["invoiced"]
    total_collected = target_bucket["collected"]
    total_outstanding = target_bucket["outstanding"]
    collection_rate = round((total_collected / total_fees) * 100, 1) if total_fees > 0 else 0.0

    # 3. Secondary Financial Indicators
    # A. Today's Collection
    today_col_q = (
        select(func.coalesce(func.sum(Payment.amount), 0))
        .where(Payment.payment_date == today, Payment.status.in_(["posted", "completed"]))
    )
    if effective_inst_id:
        today_col_q = today_col_q.join(Student, Payment.student_id == Student.id).where(
            Student.institution_id == effective_inst_id
        )
    if is_demo_filter is not None:
        today_col_q = today_col_q.where(Payment.is_demo == is_demo_filter)
    if academic_year_id:
        today_col_q = today_col_q.where(Payment.academic_year_id == academic_year_id)
    today_collection = float((await db.execute(today_col_q)).scalar() or 0.0)

    # B. Overdue Fees — Active Students
    overdue_q = (
        select(func.coalesce(func.sum(FeeInvoice.outstanding_amount), 0))
        .join(Student, FeeInvoice.student_id == Student.id)
        .join(
            latest_enr,
            (FeeInvoice.student_id == latest_enr.c.student_id)
            & (FeeInvoice.academic_year_id == latest_enr.c.academic_year_id),
        )
        .where(
            FeeInvoice.status != "cancelled",
            FeeInvoice.outstanding_amount > 0,
            FeeInvoice.due_date < today,
            Student.is_active == True,
            latest_enr.c.status == "active",
        )
    )
    if effective_inst_id:
        overdue_q = overdue_q.where(Student.institution_id == effective_inst_id)
    if academic_year_id:
        overdue_q = overdue_q.where(FeeInvoice.academic_year_id == academic_year_id)
    overdue_active_fees = float((await db.execute(overdue_q)).scalar() or 0.0)

    # C. Fees Due This Month — Active Students
    first_day_month = today.replace(day=1)
    if today.month == 12:
        last_day_month = today.replace(day=31)
    else:
        last_day_month = today.replace(month=today.month + 1, day=1) - timedelta(days=1)

    due_month_q = (
        select(func.coalesce(func.sum(FeeInvoice.outstanding_amount), 0))
        .join(Student, FeeInvoice.student_id == Student.id)
        .join(
            latest_enr,
            (FeeInvoice.student_id == latest_enr.c.student_id)
            & (FeeInvoice.academic_year_id == latest_enr.c.academic_year_id),
        )
        .where(
            FeeInvoice.status != "cancelled",
            FeeInvoice.outstanding_amount > 0,
            FeeInvoice.due_date >= first_day_month,
            FeeInvoice.due_date <= last_day_month,
            Student.is_active == True,
            latest_enr.c.status == "active",
        )
    )
    if effective_inst_id:
        due_month_q = due_month_q.where(Student.institution_id == effective_inst_id)
    if academic_year_id:
        due_month_q = due_month_q.where(FeeInvoice.academic_year_id == academic_year_id)
    due_this_month = float((await db.execute(due_month_q)).scalar() or 0.0)

    # D. Pending Payment Verifications
    pending_pay_q = select(
        func.count(Payment.id).label("count"),
        func.coalesce(func.sum(Payment.amount), 0).label("amount"),
    ).where(Payment.status.in_(["draft", "submitted"]))
    if effective_inst_id:
        pending_pay_q = pending_pay_q.join(Student, Payment.student_id == Student.id).where(
            Student.institution_id == effective_inst_id
        )
    pending_pay_res = (await db.execute(pending_pay_q)).one()
    pending_verification = {
        "count": int(pending_pay_res.count),
        "amount": float(pending_pay_res.amount),
    }

    # E. Pending & Successful Refunds
    pending_ref_q = select(
        func.count(Refund.id).label("count"),
        func.coalesce(func.sum(Refund.amount), 0).label("amount"),
    ).where(Refund.status.in_(["pending", "requested"]))
    if effective_inst_id:
        pending_ref_q = pending_ref_q.where(Refund.institution_id == effective_inst_id)
    pending_ref_res = (await db.execute(pending_ref_q)).one()
    pending_refunds = {
        "count": int(pending_ref_res.count),
        "amount": float(pending_ref_res.amount),
    }

    succ_ref_q = select(
        func.count(Refund.id).label("count"),
        func.coalesce(func.sum(Refund.amount), 0).label("amount"),
    ).where(Refund.status == "completed")
    if effective_inst_id:
        succ_ref_q = succ_ref_q.where(Refund.institution_id == effective_inst_id)
    succ_ref_res = (await db.execute(succ_ref_q)).one()
    successful_refunds = {
        "count": int(succ_ref_res.count),
        "amount": float(succ_ref_res.amount),
    }

    # 4. Aging Recovery Analysis
    days_overdue = func.current_date() - FeeInvoice.due_date
    aging_bucket_case = case(
        (or_(FeeInvoice.due_date.is_(None), FeeInvoice.due_date >= func.current_date()), "not_due"),
        (and_(days_overdue >= 1, days_overdue <= 30), "1_30_days"),
        (and_(days_overdue >= 31, days_overdue <= 60), "31_60_days"),
        (and_(days_overdue >= 61, days_overdue <= 90), "61_90_days"),
        (days_overdue > 90, "90_plus_days"),
        else_="not_due",
    )

    aging_query = (
        select(
            cat_expr.label("category"),
            aging_bucket_case.label("bucket"),
            func.count(FeeInvoice.id).label("count"),
            func.coalesce(func.sum(FeeInvoice.outstanding_amount), 0).label("amount"),
        )
        .join(Student, FeeInvoice.student_id == Student.id)
        .outerjoin(
            latest_enr,
            (FeeInvoice.student_id == latest_enr.c.student_id)
            & (FeeInvoice.academic_year_id == latest_enr.c.academic_year_id),
        )
        .where(FeeInvoice.status != "cancelled", FeeInvoice.outstanding_amount > 0)
    )
    if effective_inst_id:
        aging_query = aging_query.where(Student.institution_id == effective_inst_id)
    if is_demo_filter is not None:
        aging_query = aging_query.where(Student.is_demo == is_demo_filter)
    if academic_year_id:
        aging_query = aging_query.where(FeeInvoice.academic_year_id == academic_year_id)
    if board_id:
        aging_query = aging_query.join(
            Division, latest_enr.c.division_id == Division.id
        ).where(Division.board_id == board_id)
    if standard_id:
        aging_query = aging_query.where(latest_enr.c.standard_id == standard_id)
    if division_id:
        aging_query = aging_query.where(latest_enr.c.division_id == division_id)

    aging_query = aging_query.group_by(cat_expr, aging_bucket_case)
    aging_rows = (await db.execute(aging_query)).all()

    aging_analysis = {
        "active": {
            "not_due": {"amount": 0.0, "count": 0},
            "days_1_30": {"amount": 0.0, "count": 0},
            "days_31_60": {"amount": 0.0, "count": 0},
            "days_61_90": {"amount": 0.0, "count": 0},
            "days_90_plus": {"amount": 0.0, "count": 0},
            "total": {"amount": 0.0, "count": 0},
        },
        "total_historical": {
            "not_due": {"amount": 0.0, "count": 0},
            "days_1_30": {"amount": 0.0, "count": 0},
            "days_31_60": {"amount": 0.0, "count": 0},
            "days_61_90": {"amount": 0.0, "count": 0},
            "days_90_plus": {"amount": 0.0, "count": 0},
            "total": {"amount": 0.0, "count": 0},
        },
    }

    for r in aging_rows:
        c = r.category
        b = r.bucket
        amount = float(r.amount)
        count = int(r.count)

        bucket_key = (
            "not_due"
            if b == "not_due"
            else ("days_1_30" if b == "1_30_days" else ("days_31_60" if b == "31_60_days" else ("days_61_90" if b == "61_90_days" else "days_90_plus")))
        )

        aging_analysis["total_historical"][bucket_key]["amount"] += amount
        aging_analysis["total_historical"][bucket_key]["count"] += count
        aging_analysis["total_historical"]["total"]["amount"] += amount
        aging_analysis["total_historical"]["total"]["count"] += count

        if c == "active":
            aging_analysis["active"][bucket_key]["amount"] += amount
            aging_analysis["active"][bucket_key]["count"] += count
            aging_analysis["active"]["total"]["amount"] += amount
            aging_analysis["active"]["total"]["count"] += count

    # 5. Daily Operations Summary
    # A. Today's Admissions
    adm_q = select(func.count(Student.id)).where(Student.admission_date == today)
    if effective_inst_id:
        adm_q = adm_q.where(Student.institution_id == effective_inst_id)
    today_admissions = int((await db.execute(adm_q)).scalar() or 0)

    # B. New Leads
    leads_q = select(func.count(Lead.id)).where(
        or_(Lead.stage == "new_enquiry", Lead.enquiry_date == today)
    )
    if effective_inst_id:
        leads_q = leads_q.where(Lead.institution_id == effective_inst_id)
    new_leads = int((await db.execute(leads_q)).scalar() or 0)

    # C. Follow-ups Due Today
    start_of_today = datetime.combine(today, datetime.min.time())
    end_of_today = datetime.combine(today, datetime.max.time())
    fu_q = select(func.count(LeadFollowUp.id)).where(
        LeadFollowUp.status == "scheduled",
        LeadFollowUp.scheduled_at <= end_of_today,
    )
    if effective_inst_id:
        fu_q = fu_q.where(LeadFollowUp.institution_id == effective_inst_id)
    follow_ups_due_today = int((await db.execute(fu_q)).scalar() or 0)

    # D. Demo Classes Scheduled
    demos_q = select(func.count(LeadDemoClass.id)).where(
        LeadDemoClass.status == "scheduled",
        LeadDemoClass.scheduled_at >= start_of_today,
    )
    if effective_inst_id:
        demos_q = demos_q.where(LeadDemoClass.institution_id == effective_inst_id)
    demos_scheduled = int((await db.execute(demos_q)).scalar() or 0)

    # E. Upcoming Fee Due Invoices (Next 7 days)
    next_7_days = today + timedelta(days=7)
    upcoming_inv_q = (
        select(func.count(FeeInvoice.id))
        .join(Student, FeeInvoice.student_id == Student.id)
        .where(
            FeeInvoice.status != "cancelled",
            FeeInvoice.outstanding_amount > 0,
            FeeInvoice.due_date >= today,
            FeeInvoice.due_date <= next_7_days,
            Student.is_active == True,
        )
    )
    if effective_inst_id:
        upcoming_inv_q = upcoming_inv_q.where(Student.institution_id == effective_inst_id)
    upcoming_fee_due_invoices = int((await db.execute(upcoming_inv_q)).scalar() or 0)

    daily_operations = {
        "today_admissions": today_admissions,
        "new_leads": new_leads,
        "follow_ups_due_today": follow_ups_due_today,
        "demos_scheduled": demos_scheduled,
        "upcoming_fee_due_invoices": upcoming_fee_due_invoices,
        "pending_payment_verifications": pending_verification["count"],
    }

    # 6. Monthly Collection Trends
    # Robust subquery grouping to avoid postgresql parameter binding mismatch
    trend_subq = (
        select(
            func.to_char(Payment.payment_date, "YYYY-MM").label("month_key"),
            func.to_char(Payment.payment_date, "Mon YYYY").label("month_label"),
            Payment.id.label("payment_id"),
            Payment.amount.label("amount"),
        )
        .where(Payment.status.in_(["posted", "completed"]))
    )
    if academic_year_id:
        trend_subq = trend_subq.where(Payment.academic_year_id == academic_year_id)
    if effective_inst_id:
        trend_subq = trend_subq.join(Student, Payment.student_id == Student.id).where(
            Student.institution_id == effective_inst_id
        )

    trend_subq_alias = trend_subq.subquery("monthly_trend_subq")
    trend_query = (
        select(
            trend_subq_alias.c.month_key,
            trend_subq_alias.c.month_label,
            func.count(trend_subq_alias.c.payment_id).label("transaction_count"),
            func.coalesce(func.sum(trend_subq_alias.c.amount), 0).label("collected"),
        )
        .group_by(trend_subq_alias.c.month_key, trend_subq_alias.c.month_label)
        .order_by(trend_subq_alias.c.month_key.asc())
    )
    trend_rows = (await db.execute(trend_query)).all()
    current_month_key = today.strftime("%Y-%m")

    monthly_trends = [
        {
            "month": row.month_label,
            "month_key": row.month_key,
            "collected": float(row.collected),
            "transaction_count": int(row.transaction_count),
            "is_current_month": (row.month_key == current_month_key),
        }
        for row in trend_rows
    ]

    # 7. Recent Payment Transactions (Up to 15)
    recent_query = (
        select(
            Payment,
            Student,
            PaymentReceipt.receipt_number,
            Division.name.label("batch_name"),
            Standard.name.label("standard_name"),
            FeeCategory.name.label("category_name"),
        )
        .join(Student, Payment.student_id == Student.id)
        .outerjoin(PaymentReceipt, Payment.id == PaymentReceipt.payment_id)
        .outerjoin(
            latest_enr,
            (Payment.student_id == latest_enr.c.student_id)
            & (Payment.academic_year_id == latest_enr.c.academic_year_id),
        )
        .outerjoin(Division, latest_enr.c.division_id == Division.id)
        .outerjoin(Standard, latest_enr.c.standard_id == Standard.id)
        .outerjoin(PaymentAllocation, Payment.id == PaymentAllocation.payment_id)
        .outerjoin(FeeInvoice, PaymentAllocation.invoice_id == FeeInvoice.id)
        .outerjoin(FeeInvoiceItem, FeeInvoice.id == FeeInvoiceItem.invoice_id)
        .outerjoin(FeeStructure, FeeInvoiceItem.fee_structure_id == FeeStructure.id)
        .outerjoin(FeeCategory, FeeStructure.category_id == FeeCategory.id)
        .where(Payment.status != "reversed")
    )
    if academic_year_id:
        recent_query = recent_query.where(Payment.academic_year_id == academic_year_id)
    if effective_inst_id:
        recent_query = recent_query.where(Student.institution_id == effective_inst_id)
    if board_id:
        recent_query = recent_query.where(Division.board_id == board_id)
    if standard_id:
        recent_query = recent_query.where(latest_enr.c.standard_id == standard_id)
    if division_id:
        recent_query = recent_query.where(latest_enr.c.division_id == division_id)

    recent_query = (
        recent_query.group_by(
            Payment.id,
            Student.id,
            PaymentReceipt.receipt_number,
            Division.name,
            Standard.name,
            FeeCategory.name,
        )
        .order_by(Payment.payment_date.desc(), Payment.created_at.desc())
        .limit(15)
    )

    recent_rows = (await db.execute(recent_query)).all()
    recent_payments = [
        {
            "id": p.id,
            "receipt_number": rec_num or f"RCP-{p.id:06d}",
            "student_id": p.student_id,
            "student_name": sanitize_student_name(s.first_name, s.last_name),
            "admission_number": s.admission_number,
            "standard": std_name or "General",
            "batch": (
                f"{std_name} - {b_name}"
                if std_name and b_name
                else (b_name or std_name or "General Batch")
            ),
            "fee_category": cat_name or "Tuition Fee / General",
            "amount": float(p.amount),
            "payment_date": str(p.payment_date),
            "payment_method": p.payment_method,
            "status": p.status,
            "transaction_reference": p.transaction_reference or "—",
            "created_at": p.created_at.isoformat() if p.created_at else None,
        }
        for p, s, rec_num, b_name, std_name, cat_name in recent_rows
    ]

    stats_payload = {
        "total_students": total_students,
        "total_fees": total_fees,
        "total_collected": total_collected,
        "total_outstanding": total_outstanding,
        "collection_rate": collection_rate,
        "status_wise_outstanding": status_wise,
        "secondary_indicators": {
            "today_collection": today_collection,
            "overdue_active_fees": overdue_active_fees,
            "due_this_month": due_this_month,
            "pending_verification": pending_verification,
            "pending_refunds": pending_refunds,
            "successful_refunds": successful_refunds,
        },
        "aging_analysis": aging_analysis,
        "daily_operations": daily_operations,
        "monthly_trends": monthly_trends,
        "recent_payments": recent_payments,
        "status_filter": effective_status,
        "configured_visibility": configured_visibility,
    }

    # Apply backend CodeX access control and bijective presentation masking
    await CodeXService.mask_records_list(
        db=db,
        institution_id=user_inst_id,
        user=current_user,
        records=recent_payments,
        numeric_fields=["amount"],
        module="dashboard",
    )
    await CodeXService.mask_records_list(
        db=db,
        institution_id=user_inst_id,
        user=current_user,
        records=monthly_trends,
        numeric_fields=["collected"],
        module="dashboard",
    )
    return await CodeXService.apply_financial_masking(
        db=db,
        institution_id=user_inst_id,
        user=current_user,
        data=stats_payload,
        numeric_fields=["total_fees", "total_collected", "total_outstanding"],
        module="dashboard",
    )


@router.get("/analytics")
async def get_dashboard_analytics(
    academic_year_id: Optional[int] = None,
    institution_id: Optional[int] = None,
    standard_id: Optional[int] = None,
    division_id: Optional[int] = None,
    board_id: Optional[int] = None,
    data_env: str = Depends(get_data_environment),
    effective_inst_id: Optional[int] = Depends(enforce_institution_access),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(
        require_role(
            "superadmin", "sysadmin", "super_admin", "admin", "principal", "accountant", "staff", "teacher"
        )
    ),
):
    """
    Comprehensive Analytics & Management Insights API providing datasets for all 8 workspace tabs:
    1. Overview (core stats & financial pulse)
    2. Fee Collection (monthly trends, targets, payment methods, fee-heads, daily velocity)
    3. Outstanding Analysis (status breakdown, aging matrix, class-wise, batch-wise, top defaulters)
    4. Student Analysis (unique students deduplicated, status distribution, standard enrollment, batch utilization, retention)
    5. Admissions & CRM (conversion funnel, enquiry-to-admission rate, lead sources, follow-up SLA, demos)
    6. Academic Analysis (standards, divisions, subjects inventory, attendance performance, examination metrics, grade breakdown)
    7. Transactions & Reconciliation (volume, status distribution, payment methods, refunds ledger, balanced ledger audit)
    8. Operations (daily operational summary, recent operational activity feed)
    """
    is_demo_filter = True if data_env == "TRAINING" else (False if data_env == "PRODUCTION" else None)
    user_inst_id = effective_inst_id or getattr(current_user, "institution_id", None) or 1
    today = date.today()

    latest_enr = get_latest_enrollment_subquery()
    cat_expr = get_student_category_case(latest_enr)

    # -------------------------------------------------------------
    # 1. FEE COLLECTION ANALYTICS
    # -------------------------------------------------------------
    # Monthly Trends with target and net collection
    pay_subq = (
        select(
            func.to_char(Payment.payment_date, "YYYY-MM").label("month_key"),
            func.to_char(Payment.payment_date, "Mon YYYY").label("month_label"),
            Payment.id.label("payment_id"),
            Payment.amount.label("amount"),
        )
        .where(Payment.status.in_(["posted", "completed"]))
    )
    if academic_year_id:
        pay_subq = pay_subq.where(Payment.academic_year_id == academic_year_id)
    if effective_inst_id:
        pay_subq = pay_subq.join(Student, Payment.student_id == Student.id).where(
            Student.institution_id == effective_inst_id
        )

    pay_alias = pay_subq.subquery("pay_monthly_subq")
    pay_trend_q = (
        select(
            pay_alias.c.month_key,
            pay_alias.c.month_label,
            func.count(pay_alias.c.payment_id).label("transaction_count"),
            func.coalesce(func.sum(pay_alias.c.amount), 0).label("collected"),
        )
        .group_by(pay_alias.c.month_key, pay_alias.c.month_label)
        .order_by(pay_alias.c.month_key.asc())
    )
    pay_rows = (await db.execute(pay_trend_q)).all()
    current_month_key = today.strftime("%Y-%m")

    # Payment Methods breakdown
    method_q = (
        select(
            Payment.payment_method,
            func.count(Payment.id).label("count"),
            func.coalesce(func.sum(Payment.amount), 0).label("amount"),
        )
        .where(Payment.status.in_(["posted", "completed"]))
    )
    if academic_year_id:
        method_q = method_q.where(Payment.academic_year_id == academic_year_id)
    if effective_inst_id:
        method_q = method_q.join(Student, Payment.student_id == Student.id).where(
            Student.institution_id == effective_inst_id
        )
    method_rows = (await db.execute(method_q.group_by(Payment.payment_method))).all()

    total_collected_all = sum(float(r.amount) for r in method_rows)
    method_labels = {
        "bank_transfer": "Bank Transfer",
        "upi": "UPI",
        "cash": "Cash",
        "cheque": "Cheque",
        "card": "Card / Online",
    }
    payment_methods_data = [
        {
            "method": r.payment_method,
            "label": method_labels.get(r.payment_method, r.payment_method.replace("_", " ").title()),
            "count": int(r.count),
            "amount": float(r.amount),
            "percentage": round((float(r.amount) / total_collected_all * 100), 1) if total_collected_all > 0 else 0.0,
        }
        for r in method_rows
    ]

    # Fee Head Breakdown
    head_q = (
        select(
            FeeCategory.name.label("head_name"),
            func.count(FeeInvoiceItem.id).label("count"),
            func.coalesce(func.sum(FeeInvoiceItem.amount), 0).label("invoiced_amount"),
        )
        .join(FeeStructure, FeeCategory.id == FeeStructure.category_id)
        .join(FeeInvoiceItem, FeeStructure.id == FeeInvoiceItem.fee_structure_id)
        .join(FeeInvoice, FeeInvoiceItem.invoice_id == FeeInvoice.id)
        .where(FeeInvoice.status != "cancelled")
    )
    if academic_year_id:
        head_q = head_q.where(FeeInvoice.academic_year_id == academic_year_id)
    if effective_inst_id:
        head_q = head_q.join(Student, FeeInvoice.student_id == Student.id).where(
            Student.institution_id == effective_inst_id
        )
    head_rows = (await db.execute(head_q.group_by(FeeCategory.name))).all()
    total_heads_amount = sum(float(r.invoiced_amount) for r in head_rows)
    fee_heads_data = [
        {
            "head_name": r.head_name or "Tuition Fee",
            "count": int(r.count),
            "amount": float(r.invoiced_amount),
            "percentage": round((float(r.invoiced_amount) / total_heads_amount * 100), 1) if total_heads_amount > 0 else 0.0,
        }
        for r in head_rows
    ]

    # Daily Pulse (Last 45 days)
    pulse_start = today - timedelta(days=45)
    daily_q = (
        select(
            Payment.payment_date,
            func.count(Payment.id).label("count"),
            func.coalesce(func.sum(Payment.amount), 0).label("amount"),
        )
        .where(
            Payment.status.in_(["posted", "completed"]),
            Payment.payment_date >= pulse_start,
        )
    )
    if effective_inst_id:
        daily_q = daily_q.join(Student, Payment.student_id == Student.id).where(
            Student.institution_id == effective_inst_id
        )
    daily_rows = (await db.execute(daily_q.group_by(Payment.payment_date).order_by(Payment.payment_date.asc()))).all()
    daily_pulse_data = [
        {"date": str(r.payment_date), "count": int(r.count), "amount": float(r.amount)}
        for r in daily_rows
    ]

    fee_collection_tab = {
        "monthly_trends": [
            {
                "month": r.month_label,
                "month_key": r.month_key,
                "collected": float(r.collected),
                "transaction_count": int(r.transaction_count),
                "target": round(float(r.collected) * 1.15, 2),  # Target projection
                "net_collection": float(r.collected),
                "is_current_month": (r.month_key == current_month_key),
            }
            for r in pay_rows
        ],
        "payment_methods": payment_methods_data,
        "fee_heads": fee_heads_data,
        "daily_pulse": daily_pulse_data,
        "total_collected": total_collected_all,
        "net_collection": total_collected_all,
        "reversals_amount": 0.0,
    }

    # -------------------------------------------------------------
    # 2. OUTSTANDING ANALYTICS
    # -------------------------------------------------------------
    # Status-Wise Breakdown
    sw_q = (
        select(
            cat_expr.label("category"),
            func.count(FeeInvoice.id).label("invoice_count"),
            func.count(func.distinct(Student.id)).label("student_count"),
            func.coalesce(func.sum(FeeInvoice.net_amount), 0).label("total_net"),
            func.coalesce(func.sum(FeeInvoice.paid_amount), 0).label("total_paid"),
            func.coalesce(func.sum(FeeInvoice.outstanding_amount), 0).label("total_outstanding"),
        )
        .join(Student, FeeInvoice.student_id == Student.id)
        .outerjoin(
            latest_enr,
            (FeeInvoice.student_id == latest_enr.c.student_id)
            & (FeeInvoice.academic_year_id == latest_enr.c.academic_year_id),
        )
        .where(FeeInvoice.status != "cancelled")
    )
    if effective_inst_id:
        sw_q = sw_q.where(Student.institution_id == effective_inst_id)
    if academic_year_id:
        sw_q = sw_q.where(FeeInvoice.academic_year_id == academic_year_id)

    sw_rows = (await db.execute(sw_q.group_by(cat_expr))).all()
    status_wise_dict = {
        "active": {"invoiced": 0.0, "collected": 0.0, "outstanding": 0.0, "invoice_count": 0, "student_count": 0},
        "inactive": {"invoiced": 0.0, "collected": 0.0, "outstanding": 0.0, "invoice_count": 0, "student_count": 0},
        "left": {"invoiced": 0.0, "collected": 0.0, "outstanding": 0.0, "invoice_count": 0, "student_count": 0},
        "transferred": {"invoiced": 0.0, "collected": 0.0, "outstanding": 0.0, "invoice_count": 0, "student_count": 0},
        "cancelled": {"invoiced": 0.0, "collected": 0.0, "outstanding": 0.0, "invoice_count": 0, "student_count": 0},
        "total_historical": {"invoiced": 0.0, "collected": 0.0, "outstanding": 0.0, "invoice_count": 0, "student_count": 0},
    }
    for r in sw_rows:
        cat = r.category if r.category in status_wise_dict else "active"
        inv = float(r.total_net)
        col = float(r.total_paid)
        out = float(r.total_outstanding)
        inv_cnt = int(r.invoice_count)
        std_cnt = int(r.student_count)

        status_wise_dict[cat]["invoiced"] += inv
        status_wise_dict[cat]["collected"] += col
        status_wise_dict[cat]["outstanding"] += out
        status_wise_dict[cat]["invoice_count"] += inv_cnt
        status_wise_dict[cat]["student_count"] += std_cnt

        status_wise_dict["total_historical"]["invoiced"] += inv
        status_wise_dict["total_historical"]["collected"] += col
        status_wise_dict["total_historical"]["outstanding"] += out
        status_wise_dict["total_historical"]["invoice_count"] += inv_cnt
        status_wise_dict["total_historical"]["student_count"] += std_cnt

    # Class-wise Outstanding
    class_q = (
        select(
            Standard.id.label("standard_id"),
            func.coalesce(Standard.name, "Unassigned").label("standard_name"),
            func.count(FeeInvoice.id).label("invoice_count"),
            func.count(func.distinct(Student.id)).label("student_count"),
            func.coalesce(func.sum(FeeInvoice.net_amount), 0).label("total_invoiced"),
            func.coalesce(func.sum(FeeInvoice.paid_amount), 0).label("total_paid"),
            func.coalesce(func.sum(FeeInvoice.outstanding_amount), 0).label("total_outstanding"),
        )
        .join(Student, FeeInvoice.student_id == Student.id)
        .outerjoin(
            latest_enr,
            (FeeInvoice.student_id == latest_enr.c.student_id)
            & (FeeInvoice.academic_year_id == latest_enr.c.academic_year_id),
        )
        .outerjoin(Standard, latest_enr.c.standard_id == Standard.id)
        .where(
            FeeInvoice.status != "cancelled",
            Student.is_active == True,
            latest_enr.c.status == "active",
        )
    )
    if effective_inst_id:
        class_q = class_q.where(Student.institution_id == effective_inst_id)
    if academic_year_id:
        class_q = class_q.where(FeeInvoice.academic_year_id == academic_year_id)

    class_rows = (await db.execute(class_q.group_by(Standard.id, Standard.name).order_by(desc("total_outstanding")))).all()
    class_wise_data = [
        {
            "standard_id": r.standard_id,
            "standard_name": r.standard_name,
            "invoice_count": int(r.invoice_count),
            "student_count": int(r.student_count),
            "total_invoiced": float(r.total_invoiced),
            "total_paid": float(r.total_paid),
            "total_outstanding": float(r.total_outstanding),
            "collection_rate": round((float(r.total_paid) / float(r.total_invoiced) * 100), 1) if float(r.total_invoiced) > 0 else 0.0,
        }
        for r in class_rows
    ]

    # Batch-wise Outstanding
    batch_q = (
        select(
            Division.id.label("division_id"),
            func.coalesce(Division.name, "Unassigned").label("batch_name"),
            func.coalesce(Standard.name, "—").label("standard_name"),
            func.count(FeeInvoice.id).label("invoice_count"),
            func.count(func.distinct(Student.id)).label("student_count"),
            func.coalesce(func.sum(FeeInvoice.net_amount), 0).label("total_invoiced"),
            func.coalesce(func.sum(FeeInvoice.paid_amount), 0).label("total_paid"),
            func.coalesce(func.sum(FeeInvoice.outstanding_amount), 0).label("total_outstanding"),
        )
        .join(Student, FeeInvoice.student_id == Student.id)
        .outerjoin(
            latest_enr,
            (FeeInvoice.student_id == latest_enr.c.student_id)
            & (FeeInvoice.academic_year_id == latest_enr.c.academic_year_id),
        )
        .outerjoin(Standard, latest_enr.c.standard_id == Standard.id)
        .outerjoin(Division, latest_enr.c.division_id == Division.id)
        .where(
            FeeInvoice.status != "cancelled",
            Student.is_active == True,
            latest_enr.c.status == "active",
        )
    )
    if effective_inst_id:
        batch_q = batch_q.where(Student.institution_id == effective_inst_id)
    if academic_year_id:
        batch_q = batch_q.where(FeeInvoice.academic_year_id == academic_year_id)

    batch_rows = (await db.execute(batch_q.group_by(Division.id, Division.name, Standard.name).order_by(desc("total_outstanding")))).all()
    batch_wise_data = [
        {
            "division_id": r.division_id,
            "batch_name": r.batch_name,
            "standard_name": r.standard_name,
            "invoice_count": int(r.invoice_count),
            "student_count": int(r.student_count),
            "total_invoiced": float(r.total_invoiced),
            "total_paid": float(r.total_paid),
            "total_outstanding": float(r.total_outstanding),
            "collection_rate": round((float(r.total_paid) / float(r.total_invoiced) * 100), 1) if float(r.total_invoiced) > 0 else 0.0,
        }
        for r in batch_rows
    ]

    # Top 10 Defaulters (Active students only)
    top_def_q = (
        select(
            Student.id.label("student_id"),
            Student.first_name,
            Student.last_name,
            Student.admission_number,
            Standard.name.label("standard_name"),
            Division.name.label("batch_name"),
            FeeInvoice.invoice_number,
            FeeInvoice.due_date,
            FeeInvoice.net_amount,
            FeeInvoice.paid_amount,
            FeeInvoice.outstanding_amount,
            (func.current_date() - FeeInvoice.due_date).label("days_overdue"),
        )
        .join(Student, FeeInvoice.student_id == Student.id)
        .outerjoin(
            latest_enr,
            (FeeInvoice.student_id == latest_enr.c.student_id)
            & (FeeInvoice.academic_year_id == latest_enr.c.academic_year_id),
        )
        .outerjoin(Standard, latest_enr.c.standard_id == Standard.id)
        .outerjoin(Division, latest_enr.c.division_id == Division.id)
        .where(
            FeeInvoice.status != "cancelled",
            FeeInvoice.outstanding_amount > 0,
            Student.is_active == True,
            latest_enr.c.status == "active",
        )
        .order_by(desc(FeeInvoice.outstanding_amount))
        .limit(10)
    )
    if effective_inst_id:
        top_def_q = top_def_q.where(Student.institution_id == effective_inst_id)
    if academic_year_id:
        top_def_q = top_def_q.where(FeeInvoice.academic_year_id == academic_year_id)

    top_def_rows = (await db.execute(top_def_q)).all()
    top_defaulters_data = [
        {
            "student_id": r.student_id,
            "student_name": sanitize_student_name(r.first_name, r.last_name),
            "admission_number": r.admission_number,
            "standard": r.standard_name or "—",
            "batch": r.batch_name or "—",
            "invoice_number": r.invoice_number,
            "due_date": str(r.due_date) if r.due_date else None,
            "days_overdue": int(r.days_overdue) if (r.days_overdue and r.days_overdue > 0 and r.due_date and r.due_date < today) else 0,
            "net_amount": float(r.net_amount),
            "paid_amount": float(r.paid_amount),
            "outstanding_amount": float(r.outstanding_amount),
        }
        for r in top_def_rows
    ]

    outstanding_analysis_tab = {
        "status_wise": status_wise_dict,
        "class_wise": class_wise_data,
        "batch_wise": batch_wise_data,
        "top_defaulters": top_defaulters_data,
        "active_outstanding": status_wise_dict["active"]["outstanding"],
        "total_historical_outstanding": status_wise_dict["total_historical"]["outstanding"],
    }

    # -------------------------------------------------------------
    # 3. STUDENT ANALYTICS
    # -------------------------------------------------------------
    # Total unique students in system
    unique_std_q = select(func.count(func.distinct(Student.id)))
    if effective_inst_id:
        unique_std_q = unique_std_q.where(Student.institution_id == effective_inst_id)
    total_unique_students = int((await db.execute(unique_std_q)).scalar() or 0)

    # Status distribution across students
    act_q = select(func.count(Student.id)).where(Student.is_active == True, Student.exit_date.is_(None))
    if effective_inst_id:
        act_q = act_q.where(Student.institution_id == effective_inst_id)
    active_students_count = int((await db.execute(act_q)).scalar() or 0)
    left_students_count = max(0, total_unique_students - active_students_count)
    retention_rate = round((active_students_count / total_unique_students * 100), 1) if total_unique_students > 0 else 100.0

    student_status_distribution = [
        {
            "status": "active",
            "label": "Active Students",
            "count": active_students_count,
            "percentage": round((active_students_count / total_unique_students * 100), 1) if total_unique_students > 0 else 0.0,
        },
        {
            "status": "left",
            "label": "Left / Withdrawn",
            "count": left_students_count,
            "percentage": round((left_students_count / total_unique_students * 100), 1) if total_unique_students > 0 else 0.0,
        },
    ]

    # Standard distribution
    std_dist_q = (
        select(
            Standard.id.label("standard_id"),
            Standard.name.label("standard_name"),
            func.count(latest_enr.c.id).label("student_count"),
        )
        .join(latest_enr, Standard.id == latest_enr.c.standard_id)
        .join(Student, latest_enr.c.student_id == Student.id)
        .where(Student.is_active == True, latest_enr.c.status == "active")
        .group_by(Standard.id, Standard.name)
        .order_by(desc("student_count"))
    )
    if effective_inst_id:
        std_dist_q = std_dist_q.where(Student.institution_id == effective_inst_id)
    std_dist_rows = (await db.execute(std_dist_q)).all()
    standard_distribution_data = [
        {
            "standard_id": r.standard_id,
            "standard_name": r.standard_name,
            "count": int(r.student_count),
            "percentage": round((int(r.student_count) / active_students_count * 100), 1) if active_students_count > 0 else 0.0,
        }
        for r in std_dist_rows
    ]

    # Batch Capacity vs Enrollment Utilization
    batch_util_q = (
        select(
            Division.id.label("division_id"),
            Division.name.label("division_name"),
            Standard.name.label("standard_name"),
            Division.capacity,
            func.count(latest_enr.c.id).label("enrolled_count"),
        )
        .join(Standard, Division.standard_id == Standard.id)
        .outerjoin(
            latest_enr,
            (Division.id == latest_enr.c.division_id) & (latest_enr.c.status == "active"),
        )
        .group_by(Division.id, Division.name, Standard.name, Division.capacity)
        .order_by(Standard.name.asc(), Division.name.asc())
    )
    batch_util_rows = (await db.execute(batch_util_q)).all()
    batch_utilization_data = [
        {
            "division_id": r.division_id,
            "batch_name": r.division_name,
            "standard_name": r.standard_name,
            "capacity": int(r.capacity or 40),
            "enrolled_count": int(r.enrolled_count),
            "utilization_rate": round((int(r.enrolled_count) / int(r.capacity or 40) * 100), 1),
        }
        for r in batch_util_rows
    ]

    # Board Distribution
    board_q = (
        select(
            Board.id.label("board_id"),
            Board.name.label("board_name"),
            func.count(func.distinct(Student.id)).label("count"),
        )
        .join(latest_enr, latest_enr.c.student_id == Student.id)
        .join(Division, latest_enr.c.division_id == Division.id)
        .join(Board, Division.board_id == Board.id)
        .where(Student.is_active == True, latest_enr.c.status == "active")
        .group_by(Board.id, Board.name)
    )
    board_rows = (await db.execute(board_q)).all()
    board_distribution_data = [
        {
            "board_id": r.board_id,
            "board_name": r.board_name,
            "count": int(r.count),
            "percentage": round((int(r.count) / active_students_count * 100), 1) if active_students_count > 0 else 0.0,
        }
        for r in board_rows
    ]

    # Monthly Admissions
    m_adm_subq = (
        select(
            func.to_char(Student.admission_date, "YYYY-MM").label("month_key"),
            func.to_char(Student.admission_date, "Mon YYYY").label("month_label"),
            Student.id.label("student_id"),
        )
        .where(Student.admission_date.isnot(None))
        .subquery("monthly_adm_subq")
    )
    m_adm_q = (
        select(
            m_adm_subq.c.month_key,
            m_adm_subq.c.month_label,
            func.count(m_adm_subq.c.student_id).label("count"),
        )
        .group_by(m_adm_subq.c.month_key, m_adm_subq.c.month_label)
        .order_by(m_adm_subq.c.month_key.asc())
    )
    m_adm_rows = (await db.execute(m_adm_q)).all()
    monthly_admissions_data = [
        {"month": r.month_label, "month_key": r.month_key, "count": int(r.count)}
        for r in m_adm_rows
    ]

    student_analysis_tab = {
        "total_unique_students": total_unique_students,
        "active_students": active_students_count,
        "left_students": left_students_count,
        "retention_rate": retention_rate,
        "status_distribution": student_status_distribution,
        "standard_distribution": standard_distribution_data,
        "batch_utilization": batch_utilization_data,
        "board_distribution": board_distribution_data,
        "monthly_admissions": monthly_admissions_data,
    }

    # -------------------------------------------------------------
    # 4. ADMISSIONS & CRM ANALYTICS
    # -------------------------------------------------------------
    total_leads_q = select(func.count(Lead.id))
    if effective_inst_id:
        total_leads_q = total_leads_q.where(Lead.institution_id == effective_inst_id)
    total_leads = int((await db.execute(total_leads_q)).scalar() or 0)

    stages_q = select(Lead.stage, func.count(Lead.id).label("count")).group_by(Lead.stage)
    if effective_inst_id:
        stages_q = stages_q.where(Lead.institution_id == effective_inst_id)
    stages_rows = dict((await db.execute(stages_q)).all())

    stage_order = [
        ("new_enquiry", "New Enquiry"),
        ("contacted", "Contacted"),
        ("counselling_demo", "Counselling / Demo"),
        ("interested", "Interested"),
        ("admission_pending", "Admission Pending"),
        ("converted", "Converted / Enrolled"),
        ("lost", "Lost / Dropped"),
    ]
    funnel_stages = [
        {
            "stage": s_key,
            "label": s_lbl,
            "count": int(stages_rows.get(s_key, 0)),
            "percentage": round((int(stages_rows.get(s_key, 0)) / total_leads * 100), 1) if total_leads > 0 else 0.0,
        }
        for s_key, s_lbl in stage_order
    ]

    converted_count = int(stages_rows.get("converted", 0))
    crm_conversion_rate = round((converted_count / total_leads * 100), 1) if total_leads > 0 else 0.0

    # Lead Sources
    sources_q = select(Lead.source, func.count(Lead.id).label("count")).group_by(Lead.source).order_by(desc("count"))
    if effective_inst_id:
        sources_q = sources_q.where(Lead.institution_id == effective_inst_id)
    source_rows = (await db.execute(sources_q)).all()
    lead_sources_data = [
        {
            "source": r.source or "Direct / Other",
            "count": int(r.count),
            "percentage": round((int(r.count) / total_leads * 100), 1) if total_leads > 0 else 0.0,
        }
        for r in source_rows
    ]

    # Follow-ups summary
    fu_total_q = select(func.count(LeadFollowUp.id))
    fu_comp_q = select(func.count(LeadFollowUp.id)).where(LeadFollowUp.status == "completed")
    fu_sched_q = select(func.count(LeadFollowUp.id)).where(LeadFollowUp.status == "scheduled")
    if effective_inst_id:
        fu_total_q = fu_total_q.where(LeadFollowUp.institution_id == effective_inst_id)
        fu_comp_q = fu_comp_q.where(LeadFollowUp.institution_id == effective_inst_id)
        fu_sched_q = fu_sched_q.where(LeadFollowUp.institution_id == effective_inst_id)
    total_fu = int((await db.execute(fu_total_q)).scalar() or 0)
    comp_fu = int((await db.execute(fu_comp_q)).scalar() or 0)
    sched_fu = int((await db.execute(fu_sched_q)).scalar() or 0)

    # Demo classes summary
    demo_total_q = select(func.count(LeadDemoClass.id))
    demo_sched_q = select(func.count(LeadDemoClass.id)).where(LeadDemoClass.status == "scheduled")
    demo_comp_q = select(func.count(LeadDemoClass.id)).where(LeadDemoClass.status == "completed")
    if effective_inst_id:
        demo_total_q = demo_total_q.where(LeadDemoClass.institution_id == effective_inst_id)
        demo_sched_q = demo_sched_q.where(LeadDemoClass.institution_id == effective_inst_id)
        demo_comp_q = demo_comp_q.where(LeadDemoClass.institution_id == effective_inst_id)
    total_demos = int((await db.execute(demo_total_q)).scalar() or 0)
    sched_demos = int((await db.execute(demo_sched_q)).scalar() or 0)
    comp_demos = int((await db.execute(demo_comp_q)).scalar() or 0)

    admissions_crm_tab = {
        "total_leads": total_leads,
        "conversion_rate": crm_conversion_rate,
        "converted_count": converted_count,
        "funnel_stages": funnel_stages,
        "lead_sources": lead_sources_data,
        "follow_ups": {
            "total": total_fu,
            "completed": comp_fu,
            "scheduled": sched_fu,
            "completion_rate": round((comp_fu / total_fu * 100), 1) if total_fu > 0 else 100.0,
        },
        "demo_classes": {
            "total": total_demos,
            "scheduled": sched_demos,
            "completed": comp_demos,
        },
    }

    # -------------------------------------------------------------
    # 5. ACADEMIC ANALYTICS
    # -------------------------------------------------------------
    # Academic counts
    std_cnt = int((await db.execute(select(func.count(Standard.id)))).scalar() or 0)
    div_cnt = int((await db.execute(select(func.count(Division.id)))).scalar() or 0)
    sub_cnt = int((await db.execute(select(func.count(Subject.id)))).scalar() or 0)

    # Attendance metrics across 1365 records
    att_q = select(Attendance.status, func.count(Attendance.id).label("count")).group_by(Attendance.status)
    att_rows = dict((await db.execute(att_q)).all())
    total_att = sum(att_rows.values())
    present_att = int(att_rows.get("present", 0))
    absent_att = int(att_rows.get("absent", 0))
    late_att = int(att_rows.get("late", 0))

    attendance_metrics = {
        "total_records": total_att,
        "present_count": present_att,
        "absent_count": absent_att,
        "late_count": late_att,
        "present_percentage": round((present_att / total_att * 100), 1) if total_att > 0 else 0.0,
        "absent_percentage": round((absent_att / total_att * 100), 1) if total_att > 0 else 0.0,
        "late_percentage": round((late_att / total_att * 100), 1) if total_att > 0 else 0.0,
    }

    # Examination performance metrics across 312 records
    exam_stats_q = select(
        func.count(ExamMark.id).label("total_entries"),
        func.coalesce(func.avg(ExamMark.marks_obtained), 0).label("avg_marks"),
        func.coalesce(func.max(ExamMark.marks_obtained), 0).label("max_marks"),
        func.coalesce(func.min(ExamMark.marks_obtained), 0).label("min_marks"),
        func.sum(case((ExamMark.marks_obtained >= 35, 1), else_=0)).label("passed_count"),
    )
    exam_stats_res = (await db.execute(exam_stats_q)).one()
    total_exam_marks = int(exam_stats_res.total_entries)
    passed_exam_marks = int(exam_stats_res.passed_count or 0)
    avg_score = round(float(exam_stats_res.avg_marks), 1)
    max_score = float(exam_stats_res.max_marks)
    pass_pct = round((passed_exam_marks / total_exam_marks * 100), 1) if total_exam_marks > 0 else 0.0

    # Grade breakdown
    grade_q = (
        select(ExamMark.grade, func.count(ExamMark.id).label("count"))
        .where(ExamMark.grade.isnot(None))
        .group_by(ExamMark.grade)
        .order_by(ExamMark.grade.asc())
    )
    grade_rows = (await db.execute(grade_q)).all()
    grade_distribution = [
        {
            "grade": r.grade,
            "count": int(r.count),
            "percentage": round((int(r.count) / total_exam_marks * 100), 1) if total_exam_marks > 0 else 0.0,
        }
        for r in grade_rows
    ]

    total_exams_count = int((await db.execute(select(func.count(Examination.id)))).scalar() or 0)

    academic_analysis_tab = {
        "inventory": {
            "standards_count": std_cnt,
            "divisions_count": div_cnt,
            "subjects_count": sub_cnt,
        },
        "attendance": attendance_metrics,
        "examinations": {
            "total_exams": total_exams_count,
            "total_marks_recorded": total_exam_marks,
            "passed_count": passed_exam_marks,
            "pass_percentage": pass_pct,
            "average_score": avg_score,
            "max_score": max_score,
            "grade_distribution": grade_distribution,
        },
    }

    # -------------------------------------------------------------
    # 6. TRANSACTION & RECONCILIATION ANALYTICS
    # -------------------------------------------------------------
    txn_status_q = select(
        Payment.status,
        func.count(Payment.id).label("count"),
        func.coalesce(func.sum(Payment.amount), 0).label("amount"),
    ).group_by(Payment.status)
    if effective_inst_id:
        txn_status_q = txn_status_q.join(Student, Payment.student_id == Student.id).where(
            Student.institution_id == effective_inst_id
        )
    txn_rows = (await db.execute(txn_status_q)).all()
    total_txns_count = sum(int(r.count) for r in txn_rows)

    txn_status_data = [
        {
            "status": r.status,
            "label": r.status.replace("_", " ").title(),
            "count": int(r.count),
            "amount": float(r.amount),
        }
        for r in txn_rows
    ]

    total_invoiced_all = status_wise_dict["total_historical"]["invoiced"]
    total_outstanding_all = status_wise_dict["total_historical"]["outstanding"]
    total_collected_hist = status_wise_dict["total_historical"]["collected"]
    calculated_balance = round(total_invoiced_all - total_collected_hist, 2)
    ledger_variance = round(abs(total_outstanding_all - calculated_balance), 2)
    is_ledger_reconciled = (ledger_variance == 0.0)

    # Pending verification & refunds
    pending_pay_q = select(
        func.count(Payment.id).label("count"),
        func.coalesce(func.sum(Payment.amount), 0).label("amount"),
    ).where(Payment.status.in_(["draft", "submitted"]))
    if effective_inst_id:
        pending_pay_q = pending_pay_q.join(Student, Payment.student_id == Student.id).where(
            Student.institution_id == effective_inst_id
        )
    pending_pay_res = (await db.execute(pending_pay_q)).one()
    pending_verif_count = int(pending_pay_res.count)
    pending_verif_amount = float(pending_pay_res.amount)

    pending_ref_q = select(
        func.count(Refund.id).label("count"),
        func.coalesce(func.sum(Refund.amount), 0).label("amount"),
    ).where(Refund.status.in_(["pending", "requested"]))
    if effective_inst_id:
        pending_ref_q = pending_ref_q.where(Refund.institution_id == effective_inst_id)
    pending_ref_res = (await db.execute(pending_ref_q)).one()
    pending_ref_count = int(pending_ref_res.count)
    pending_ref_amount = float(pending_ref_res.amount)

    succ_ref_q = select(
        func.count(Refund.id).label("count"),
        func.coalesce(func.sum(Refund.amount), 0).label("amount"),
    ).where(Refund.status == "completed")
    if effective_inst_id:
        succ_ref_q = succ_ref_q.where(Refund.institution_id == effective_inst_id)
    succ_ref_res = (await db.execute(succ_ref_q)).one()
    succ_ref_count = int(succ_ref_res.count)
    succ_ref_amount = float(succ_ref_res.amount)

    transactions_reconciliation_tab = {
        "total_transactions": total_txns_count,
        "total_volume": total_collected_all,
        "status_distribution": txn_status_data,
        "payment_methods": payment_methods_data,
        "refunds": {
            "pending_count": pending_ref_count,
            "pending_amount": pending_ref_amount,
            "completed_count": succ_ref_count,
            "completed_amount": succ_ref_amount,
        },
        "ledger_audit": {
            "total_invoiced": total_invoiced_all,
            "total_collected": total_collected_hist,
            "total_outstanding": total_outstanding_all,
            "calculated_balance": calculated_balance,
            "variance": ledger_variance,
            "is_reconciled": is_ledger_reconciled,
        },
    }

    # -------------------------------------------------------------
    # 7. OPERATIONS ANALYTICS & TIMELINE
    # -------------------------------------------------------------
    adm_today = int((await db.execute(select(func.count(Student.id)).where(Student.admission_date == today))).scalar() or 0)
    leads_today = int((await db.execute(select(func.count(Lead.id)).where(or_(Lead.stage == "new_enquiry", Lead.enquiry_date == today)))).scalar() or 0)

    daily_operations = {
        "today_admissions": adm_today,
        "new_leads": leads_today,
        "follow_ups_due_today": sched_fu,
        "demos_scheduled": sched_demos,
        "upcoming_fee_due_invoices": 0,
        "pending_payment_verifications": pending_verif_count,
    }

    recent_act_q = (
        select(
            Payment.id,
            Payment.amount,
            Payment.payment_date,
            Payment.payment_method,
            Student.first_name,
            Student.last_name,
            Student.admission_number,
            PaymentReceipt.receipt_number,
        )
        .join(Student, Payment.student_id == Student.id)
        .outerjoin(PaymentReceipt, Payment.id == PaymentReceipt.payment_id)
        .order_by(Payment.payment_date.desc(), Payment.id.desc())
        .limit(10)
    )
    if effective_inst_id:
        recent_act_q = recent_act_q.where(Student.institution_id == effective_inst_id)
    recent_act_rows = (await db.execute(recent_act_q)).all()

    operations_tab = {
        "daily_summary": daily_operations,
        "recent_activities": [
            {
                "id": r.id,
                "type": "payment",
                "title": f"Payment Received — ₹{float(r.amount):,.0f}",
                "subtitle": f"{sanitize_student_name(r.first_name, r.last_name)} ({r.admission_number}) • Receipt {r.receipt_number or f'RCP-{r.id:06d}'}",
                "method": r.payment_method,
                "timestamp": str(r.payment_date),
                "link": "/fees/payments",
            }
            for r in recent_act_rows
        ],
    }

    analytics_payload = {
        "academic_year_id": academic_year_id,
        "institution_id": user_inst_id,
        "fee_collection": fee_collection_tab,
        "outstanding_analysis": outstanding_analysis_tab,
        "student_analysis": student_analysis_tab,
        "admissions_crm": admissions_crm_tab,
        "academic_analysis": academic_analysis_tab,
        "transactions_reconciliation": transactions_reconciliation_tab,
        "operations": operations_tab,
    }

    return await CodeXService.apply_financial_masking(
        db=db,
        institution_id=user_inst_id,
        user=current_user,
        data=analytics_payload,
        numeric_fields=[
            "total_collected",
            "net_collection",
            "active_outstanding",
            "total_historical_outstanding",
            "total_volume",
        ],
        module="dashboard",
    )


@router.get("/outstanding-drilldown")
async def get_outstanding_drilldown(
    academic_year_id: Optional[int] = None,
    institution_id: Optional[int] = None,
    standard_id: Optional[int] = None,
    division_id: Optional[int] = None,
    board_id: Optional[int] = None,
    status: Optional[str] = Query(default="active"),
    aging_bucket: Optional[str] = Query(default=None),
    is_overdue: Optional[bool] = Query(default=None),
    search: Optional[str] = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    data_env: str = Depends(get_data_environment),
    effective_inst_id: Optional[int] = Depends(enforce_institution_access),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(
        require_role(
            "superadmin", "sysadmin", "super_admin", "admin", "principal", "accountant", "staff", "teacher"
        )
    ),
):
    """
    Granular drill-down listing of student invoices contributing to outstanding balances,
    filtered by student status (active, inactive, left, transferred, all) and aging buckets.
    Uses canonical latest_enrollment to prevent Cartesian duplicate records.
    """
    user_inst_id = effective_inst_id or getattr(current_user, "institution_id", None) or 1
    today = date.today()

    latest_enr = get_latest_enrollment_subquery()
    cat_expr = get_student_category_case(latest_enr)
    days_overdue_expr = func.current_date() - FeeInvoice.due_date

    aging_expr = case(
        (or_(FeeInvoice.due_date.is_(None), FeeInvoice.due_date >= func.current_date()), "not_due"),
        (and_(days_overdue_expr >= 1, days_overdue_expr <= 30), "1_30_days"),
        (and_(days_overdue_expr >= 31, days_overdue_expr <= 60), "31_60_days"),
        (and_(days_overdue_expr >= 61, days_overdue_expr <= 90), "61_90_days"),
        (days_overdue_expr > 90, "90_plus_days"),
        else_="not_due",
    )

    query = (
        select(
            FeeInvoice,
            Student,
            Standard.name.label("standard_name"),
            Division.name.label("batch_name"),
            cat_expr.label("student_category"),
            aging_expr.label("aging_bucket"),
            days_overdue_expr.label("days_overdue"),
        )
        .join(Student, FeeInvoice.student_id == Student.id)
        .outerjoin(
            latest_enr,
            (FeeInvoice.student_id == latest_enr.c.student_id)
            & (FeeInvoice.academic_year_id == latest_enr.c.academic_year_id),
        )
        .outerjoin(Standard, latest_enr.c.standard_id == Standard.id)
        .outerjoin(Division, latest_enr.c.division_id == Division.id)
        .where(FeeInvoice.status != "cancelled", FeeInvoice.outstanding_amount > 0)
    )

    if effective_inst_id:
        query = query.where(Student.institution_id == effective_inst_id)
    if academic_year_id:
        query = query.where(FeeInvoice.academic_year_id == academic_year_id)
    if board_id:
        query = query.join(Board, Division.board_id == Board.id).where(Board.id == board_id)
    if standard_id:
        query = query.where(latest_enr.c.standard_id == standard_id)
    if division_id:
        query = query.where(latest_enr.c.division_id == division_id)

    # Status scope filter
    norm_status = (status or "active").strip().lower()
    if norm_status in ("active", "enrolled"):
        query = query.where(cat_expr == "active")
    elif norm_status in ("inactive", "on_hold"):
        query = query.where(cat_expr == "inactive")
    elif norm_status in ("left", "discontinued", "withdrawn"):
        query = query.where(cat_expr == "left")
    elif norm_status == "transferred":
        query = query.where(cat_expr == "transferred")
    elif norm_status == "cancelled":
        query = query.where(cat_expr == "cancelled")
    # if "all", do not filter by category

    # Aging filter
    if aging_bucket and aging_bucket != "all":
        query = query.where(aging_expr == aging_bucket)

    # Overdue filter
    if is_overdue is True:
        query = query.where(FeeInvoice.due_date < today)
    elif is_overdue is False:
        query = query.where(or_(FeeInvoice.due_date.is_(None), FeeInvoice.due_date >= today))

    # Search filter
    if search:
        s_term = f"%{search.strip()}%"
        query = query.where(
            or_(
                Student.first_name.ilike(s_term),
                Student.last_name.ilike(s_term),
                Student.admission_number.ilike(s_term),
                FeeInvoice.invoice_number.ilike(s_term),
            )
        )

    # Total aggregate count and outstanding
    count_subquery = query.subquery()
    count_q = select(
        func.count(count_subquery.c.id),
        func.coalesce(func.sum(count_subquery.c.outstanding_amount), 0),
    )
    total_count, total_sum = (await db.execute(count_q)).one()

    # Apply ordering and pagination
    query = query.order_by(FeeInvoice.outstanding_amount.desc(), Student.first_name.asc()).offset(offset).limit(limit)
    rows = (await db.execute(query)).all()

    records = []
    for inv, std, std_name, b_name, cat, aging, overdue_days in rows:
        d_overdue = int(overdue_days) if (overdue_days is not None and overdue_days > 0 and inv.due_date and inv.due_date < today) else 0
        records.append({
            "invoice_id": inv.id,
            "invoice_number": inv.invoice_number,
            "student_id": std.id,
            "student_name": sanitize_student_name(std.first_name, std.last_name),
            "admission_number": std.admission_number,
            "phone": std.phone or "—",
            "class_name": std_name or "—",
            "batch_name": b_name or "—",
            "student_status": cat,
            "aging_bucket": aging,
            "due_date": str(inv.due_date) if inv.due_date else None,
            "days_overdue": d_overdue,
            "is_overdue": bool(d_overdue > 0),
            "total_obligation": float(inv.net_amount),
            "paid_amount": float(inv.paid_amount),
            "outstanding_amount": float(inv.outstanding_amount),
        })

    await CodeXService.mask_records_list(
        db=db,
        institution_id=user_inst_id,
        user=current_user,
        records=records,
        numeric_fields=["total_obligation", "paid_amount", "outstanding_amount"],
        module="dashboard",
    )

    drilldown_payload = {
        "status_scope": norm_status,
        "aging_bucket": aging_bucket or "all",
        "total_count": int(total_count or 0),
        "total_outstanding": float(total_sum or 0.0),
        "records": records,
    }

    return await CodeXService.apply_financial_masking(
        db=db,
        institution_id=user_inst_id,
        user=current_user,
        data=drilldown_payload,
        numeric_fields=["total_outstanding"],
        module="dashboard",
    )


@router.get("/reconciliation")
async def get_dashboard_reconciliation(
    academic_year_id: Optional[int] = None,
    institution_id: Optional[int] = None,
    data_env: str = Depends(get_data_environment),
    effective_inst_id: Optional[int] = Depends(enforce_institution_access),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """
    Produce student count diagnostic reconciliation comparing active enrollments against fee records.
    """
    is_demo_filter = True if data_env == "TRAINING" else (False if data_env == "PRODUCTION" else None)

    return await get_student_reconciliation_diagnostic(
        db=db,
        institution_id=effective_inst_id or institution_id,
        academic_year_id=academic_year_id,
        is_demo=is_demo_filter,
    )
