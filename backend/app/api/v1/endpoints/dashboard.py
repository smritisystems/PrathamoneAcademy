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
#  * @updated     2026-11-05
#  *
#  * @description API endpoints for administrative and coaching institute executive dashboard analytics.
#  */

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional
from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.models.student import Student
from app.models.payment import Payment, PaymentReceipt
from app.models.fee import FeeInvoice
from app.models.enrollment import StudentEnrollment
from app.models.standard import Standard
from app.models.division import Division
from app.services.settings_service import get_institution_setting
from app.services.student_metrics import (
    get_authoritative_student_count,
    get_student_reconciliation_diagnostic,
)

router = APIRouter()


@router.get("/stats")
async def get_dashboard_stats(
    academic_year_id: Optional[int] = None,
    institution_id: Optional[int] = None,
    standard_id: Optional[int] = None,
    division_id: Optional[int] = None,
    board_id: Optional[int] = None,
    status: Optional[str] = Query(default=None),
    include_all_statuses: Optional[bool] = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """
    Get dashboard metrics with filters:
    - Authoritative active student count
    - Total fees, collected fees, outstanding fees, and collection rate
    - Monthly collection trend
    - Recent payments with receipt, student, batch, method, and date
    """
    # Verify institution_id validity; if client passed an ID with 0 students (e.g. stale client state), fallback
    effective_inst_id = institution_id
    if institution_id:
        inst_count = (await db.execute(select(func.count(Student.id)).where(Student.institution_id == institution_id))).scalar() or 0
        if inst_count == 0:
            effective_inst_id = None

    # Resolve student visibility mode from settings or explicit user override
    user_inst_id = effective_inst_id or getattr(current_user, "institution_id", None) or 1
    configured_visibility = await get_institution_setting(
        db, user_inst_id, "admission", "student_visibility_dashboard", "active_only"
    )

    effective_status = status
    if not effective_status:
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
    )

    # 2. Fee Stats (Total Fees, Total Collected, Outstanding)
    invoice_query = select(
        func.coalesce(func.sum(FeeInvoice.net_amount), 0).label("total_fees"),
        func.coalesce(func.sum(FeeInvoice.paid_amount), 0).label("total_collected"),
        func.coalesce(func.sum(FeeInvoice.outstanding_amount), 0).label("total_outstanding"),
    ).where(FeeInvoice.status != "cancelled")

    if effective_inst_id:
        invoice_query = invoice_query.join(Student, FeeInvoice.student_id == Student.id).where(
            Student.institution_id == effective_inst_id
        )
    if academic_year_id:
        invoice_query = invoice_query.where(FeeInvoice.academic_year_id == academic_year_id)
    if board_id or standard_id or division_id:
        invoice_query = invoice_query.join(
            StudentEnrollment,
            (FeeInvoice.student_id == StudentEnrollment.student_id)
            & (FeeInvoice.academic_year_id == StudentEnrollment.academic_year_id),
        )
        if board_id:
            invoice_query = invoice_query.join(
                Division, StudentEnrollment.division_id == Division.id
            ).where(Division.board_id == board_id)
        if standard_id:
            invoice_query = invoice_query.where(StudentEnrollment.standard_id == standard_id)
        if division_id:
            invoice_query = invoice_query.where(StudentEnrollment.division_id == division_id)

    fee_stats = (await db.execute(invoice_query)).one()
    total_fees = float(fee_stats.total_fees)
    total_collected = float(fee_stats.total_collected)
    total_outstanding = float(fee_stats.total_outstanding)
    collection_rate = round((total_collected / total_fees) * 100, 1) if total_fees > 0 else 0.0

    # 3. Monthly Collection Trends
    month_col = func.to_char(Payment.payment_date, "YYYY-MM")
    month_label_col = func.to_char(Payment.payment_date, "Mon YYYY")
    trend_query = (
        select(
            month_col.label("month_key"),
            month_label_col.label("month_label"),
            func.coalesce(func.sum(Payment.amount), 0).label("collected"),
        )
        .where(Payment.status != "reversed")
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
    monthly_trends = [
        {"month": row.month_label, "collected": float(row.collected)}
        for row in trend_rows
    ]

    # 4. Recent Payments (Last 10)
    recent_query = (
        select(
            Payment,
            Student,
            PaymentReceipt.receipt_number,
            Division.name.label("batch_name"),
            Standard.name.label("standard_name"),
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

    recent_query = recent_query.order_by(
        Payment.payment_date.desc(), Payment.created_at.desc()
    ).limit(10)

    recent_rows = (await db.execute(recent_query)).all()
    recent_payments = [
        {
            "id": p.id,
            "receipt_number": rec_num or f"RCP-{p.id:06d}",
            "student_id": p.student_id,
            "student_name": f"{s.first_name} {s.last_name}",
            "admission_number": s.admission_number,
            "batch": (
                f"{std_name} - {b_name}"
                if std_name and b_name
                else (b_name or std_name or "General Batch")
            ),
            "amount": float(p.amount),
            "payment_date": str(p.payment_date),
            "payment_method": p.payment_method,
            "status": p.status,
        }
        for p, s, rec_num, b_name, std_name in recent_rows
    ]

    return {
        "total_students": total_students,
        "total_fees": total_fees,
        "total_collected": total_collected,
        "total_outstanding": total_outstanding,
        "collection_rate": collection_rate,
        "monthly_trends": monthly_trends,
        "recent_payments": recent_payments,
        "status_filter": effective_status,
        "configured_visibility": configured_visibility,
    }


@router.get("/reconciliation")
async def get_dashboard_reconciliation(
    academic_year_id: Optional[int] = None,
    institution_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """
    Produce student count diagnostic reconciliation comparing active enrollments against fee records.
    """
    effective_inst_id = institution_id
    if institution_id:
        inst_count = (await db.execute(select(func.count(Student.id)).where(Student.institution_id == institution_id))).scalar() or 0
        if inst_count == 0:
            effective_inst_id = None

    return await get_student_reconciliation_diagnostic(
        db=db,
        institution_id=effective_inst_id,
        academic_year_id=academic_year_id,
    )
