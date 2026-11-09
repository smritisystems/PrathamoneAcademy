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
#  * @description API endpoints for administrative and coaching institute executive dashboard analytics, status-wise outstanding breakdown, aging recovery, and daily operations.
#  */

import re
from datetime import date, datetime, timedelta
from typing import Optional, List, Dict, Any
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


def get_student_category_case():
    """Authoritative SQL classification expression for student lifecycle status."""
    return case(
        (StudentEnrollment.status == "transferred", "transferred"),
        (
            or_(
                Student.exit_date.isnot(None),
                Student.exit_reason.isnot(None),
                StudentEnrollment.status.in_(["withdrawn", "left", "discontinued", "dropped"]),
            ),
            "left",
        ),
        (StudentEnrollment.status == "cancelled", "cancelled"),
        (
            or_(
                and_(Student.is_active == False, Student.exit_date.is_(None), Student.exit_reason.is_(None)),
                StudentEnrollment.status == "inactive",
            ),
            "inactive",
        ),
        (
            and_(Student.is_active == True, StudentEnrollment.status == "active"),
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
    cat_expr = get_student_category_case()
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
            StudentEnrollment,
            (FeeInvoice.student_id == StudentEnrollment.student_id)
            & (FeeInvoice.academic_year_id == StudentEnrollment.academic_year_id),
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
            Division, StudentEnrollment.division_id == Division.id
        ).where(Division.board_id == board_id)
    if standard_id:
        breakdown_query = breakdown_query.where(StudentEnrollment.standard_id == standard_id)
    if division_id:
        breakdown_query = breakdown_query.where(StudentEnrollment.division_id == division_id)

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
            StudentEnrollment,
            (FeeInvoice.student_id == StudentEnrollment.student_id)
            & (FeeInvoice.academic_year_id == StudentEnrollment.academic_year_id),
        )
        .where(
            FeeInvoice.status != "cancelled",
            FeeInvoice.outstanding_amount > 0,
            FeeInvoice.due_date < today,
            Student.is_active == True,
            StudentEnrollment.status == "active",
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
            StudentEnrollment,
            (FeeInvoice.student_id == StudentEnrollment.student_id)
            & (FeeInvoice.academic_year_id == StudentEnrollment.academic_year_id),
        )
        .where(
            FeeInvoice.status != "cancelled",
            FeeInvoice.outstanding_amount > 0,
            FeeInvoice.due_date >= first_day_month,
            FeeInvoice.due_date <= last_day_month,
            Student.is_active == True,
            StudentEnrollment.status == "active",
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
            aging_bucket_case.label("bucket"),
            cat_expr.label("student_category"),
            func.count(FeeInvoice.id).label("count"),
            func.coalesce(func.sum(FeeInvoice.outstanding_amount), 0).label("outstanding"),
        )
        .join(Student, FeeInvoice.student_id == Student.id)
        .outerjoin(
            StudentEnrollment,
            (FeeInvoice.student_id == StudentEnrollment.student_id)
            & (FeeInvoice.academic_year_id == StudentEnrollment.academic_year_id),
        )
        .where(FeeInvoice.status != "cancelled", FeeInvoice.outstanding_amount > 0)
    )
    if effective_inst_id:
        aging_query = aging_query.where(Student.institution_id == effective_inst_id)
    if academic_year_id:
        aging_query = aging_query.where(FeeInvoice.academic_year_id == academic_year_id)
    aging_query = aging_query.group_by(aging_bucket_case, cat_expr)
    aging_rows = (await db.execute(aging_query)).all()

    empty_aging_profile = lambda: {
        "not_due": {"amount": 0.0, "count": 0},
        "days_1_30": {"amount": 0.0, "count": 0},
        "days_31_60": {"amount": 0.0, "count": 0},
        "days_61_90": {"amount": 0.0, "count": 0},
        "days_90_plus": {"amount": 0.0, "count": 0},
        "total": {"amount": 0.0, "count": 0},
    }

    aging_analysis = {
        "active": empty_aging_profile(),
        "total_historical": empty_aging_profile(),
    }

    for b, c, cnt, out in aging_rows:
        amount = float(out)
        count = int(cnt)
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
    month_col = func.to_char(Payment.payment_date, "YYYY-MM")
    month_label_col = func.to_char(Payment.payment_date, "Mon YYYY")
    trend_query = (
        select(
            month_col.label("month_key"),
            month_label_col.label("month_label"),
            func.count(Payment.id).label("transaction_count"),
            func.coalesce(func.sum(Payment.amount), 0).label("collected"),
        )
        .where(Payment.status.in_(["posted", "completed"]))
    )
    if academic_year_id:
        trend_query = trend_query.where(Payment.academic_year_id == academic_year_id)
    if effective_inst_id or board_id or standard_id or division_id:
        trend_query = trend_query.join(Student, Payment.student_id == Student.id)
        if effective_inst_id:
            trend_query = trend_query.where(Student.institution_id == effective_inst_id)
        if board_id or standard_id or division_id:
            trend_query = trend_query.join(
                StudentEnrollment,
                (Payment.student_id == StudentEnrollment.student_id)
                & (Payment.academic_year_id == StudentEnrollment.academic_year_id),
            )
            if board_id:
                trend_query = trend_query.join(
                    Division, StudentEnrollment.division_id == Division.id
                ).where(Division.board_id == board_id)
            if standard_id:
                trend_query = trend_query.where(StudentEnrollment.standard_id == standard_id)
            if division_id:
                trend_query = trend_query.where(StudentEnrollment.division_id == division_id)

    trend_query = trend_query.group_by(month_col, month_label_col).order_by(month_col.asc())
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
            StudentEnrollment,
            (Payment.student_id == StudentEnrollment.student_id)
            & (Payment.academic_year_id == StudentEnrollment.academic_year_id),
        )
        .outerjoin(Division, StudentEnrollment.division_id == Division.id)
        .outerjoin(Standard, StudentEnrollment.standard_id == Standard.id)
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
        recent_query = recent_query.where(StudentEnrollment.standard_id == standard_id)
    if division_id:
        recent_query = recent_query.where(StudentEnrollment.division_id == division_id)

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
    """
    user_inst_id = effective_inst_id or getattr(current_user, "institution_id", None) or 1
    today = date.today()

    cat_expr = get_student_category_case()
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
            StudentEnrollment,
            (FeeInvoice.student_id == StudentEnrollment.student_id)
            & (FeeInvoice.academic_year_id == StudentEnrollment.academic_year_id),
        )
        .outerjoin(Standard, StudentEnrollment.standard_id == Standard.id)
        .outerjoin(Division, StudentEnrollment.division_id == Division.id)
        .where(FeeInvoice.status != "cancelled", FeeInvoice.outstanding_amount > 0)
    )

    if effective_inst_id:
        query = query.where(Student.institution_id == effective_inst_id)
    if academic_year_id:
        query = query.where(FeeInvoice.academic_year_id == academic_year_id)
    if board_id:
        query = query.join(Board, Division.board_id == Board.id).where(Board.id == board_id)
    if standard_id:
        query = query.where(StudentEnrollment.standard_id == standard_id)
    if division_id:
        query = query.where(StudentEnrollment.division_id == division_id)

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
