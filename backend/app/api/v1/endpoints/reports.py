# /**
#  * @file        reports.py
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
#  * @updated     2026-11-14
#  *
#  * @description API endpoints for academic, attendance, faculty load, and fee collection reporting.
#  */

from fastapi import APIRouter, Depends, HTTPException, Response, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_, desc
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from decimal import Decimal
import io
import csv
from app.core.database import get_db
from app.services.settings_service import get_institution_setting
from app.models.institution import Institution
from app.core.deps import (
    get_current_active_user,
    require_role,
    is_sysadmin,
    enforce_institution_access,
    check_institution_access,
    get_data_environment,
    has_permission,
    TRAINING_INSTITUTION_CODE,
)

REPORT_STAFF_ROLES = (
    "superadmin",
    "sysadmin",
    "super_admin",
    "admin",
    "principal",
    "accountant",
    "teacher",
    "staff",
    "counselor",
    "counsellor",
    "receptionist",
)
AUDIT_REPORT_ROLES = ("superadmin", "sysadmin", "super_admin", "admin", "principal")
from app.services.financial_governance_service import (
    FinancialGovernanceService,
    FinancialFilter,
    CONCESSION_REPORT_DEFINITIONS,
)

async def resolve_report_institution_id(db: AsyncSession, current_user, data_env: str) -> int:
    if data_env == "TRAINING":
        res = await db.execute(
            select(Institution.id).where(Institution.code == TRAINING_INSTITUTION_CODE)
        )
        t_id = res.scalar_one_or_none()
        if not t_id:
            res_any = await db.execute(
                select(Institution.id).where(Institution.code.like("%DEMO%"))
            )
            t_id = res_any.scalar_one_or_none()
        return t_id or 2
    return getattr(current_user, "institution_id", None) or 1


def apply_report_environment_filter(query, model, data_env: str):
    if data_env == "TRAINING":
        return query.where(model.is_demo == True)
    elif data_env == "PRODUCTION":
        return query.where(model.is_demo == False)
    return query
from app.models.payment import Payment, PaymentReceipt, Refund
from app.models.fee import FeeInvoice
from app.models.student import Student
from app.models.division import Division
from app.models.standard import Standard
from app.models.board import Board
from app.models.enrollment import StudentEnrollment
from app.models.academic_year import AcademicYear
from app.models.portal import TimetableEntry
from app.models.attendance import Attendance
from app.models.exam import Examination, ExamMark
from app.models.subject import Subject
from app.models.staff import TeacherAssignment
from app.models.user import User, AuditLog
from app.services.codex_service import CodeXService

router = APIRouter()


@router.get("/fee-collection")
async def fee_collection_report(
    academic_year_id: Optional[int] = None,
    institution_id: Optional[int] = None,
    status: Optional[str] = Query(default=None),
    include_inactive: Optional[bool] = Query(default=None),
    data_env: str = Depends(get_data_environment),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role(*REPORT_STAFF_ROLES)),
):
    if institution_id is not None:
        check_institution_access(institution_id, current_user)
    target_inst_id = institution_id if institution_id is not None else (
        None if is_sysadmin(current_user) else getattr(current_user, "institution_id", None)
    )
    query = (
        select(
            Student.admission_number,
            Student.first_name,
            Student.last_name,
            func.coalesce(func.sum(FeeInvoice.net_amount), 0).label("total_fees"),
            func.coalesce(func.sum(FeeInvoice.paid_amount), 0).label("paid"),
            func.coalesce(func.sum(FeeInvoice.outstanding_amount), 0).label(
                "outstanding"
            ),
        )
        .join(FeeInvoice, Student.id == FeeInvoice.student_id)
        .group_by(
            Student.id,
            Student.admission_number,
            Student.first_name,
            Student.last_name,
        )
    )

    user_inst_id = institution_id or getattr(current_user, "institution_id", None) or 1
    configured_report_mode = await get_institution_setting(
        db, user_inst_id, "admission", "student_visibility_reports", "include_all"
    )

    if academic_year_id:
        query = query.where(FeeInvoice.academic_year_id == academic_year_id)
    if target_inst_id is not None:
        query = query.where(Student.institution_id == target_inst_id)

    # Student visibility criteria
    if status:
        st = status.strip().lower()
        if st == "active":
            query = query.where(Student.is_active == True)
        elif st == "inactive":
            query = query.where(Student.is_active == False)
        elif st == "withdrawn":
            query = query.where(
                or_(
                    and_(Student.is_active == False, Student.exit_date.isnot(None)),
                    Student.enrollments.any(StudentEnrollment.status == "withdrawn"),
                )
            )
        elif st == "completed":
            query = query.where(Student.enrollments.any(StudentEnrollment.status == "completed"))
        elif st == "graduated":
            query = query.where(Student.enrollments.any(StudentEnrollment.status == "graduated"))
        elif st in ("all", "include_all"):
            pass
        else:
            query = query.where(Student.enrollments.any(StudentEnrollment.status == st))
    elif include_inactive is not None:
        if not include_inactive:
            query = query.where(Student.is_active == True)
    else:
        if configured_report_mode == "active_only":
            query = query.where(Student.is_active == True)

    query = apply_report_environment_filter(query, Student, data_env)

    result = await db.execute(query)
    rows = result.all()

    raw_rows = [
        {
            "admission_number": r.admission_number,
            "student_name": f"{r.first_name} {r.last_name}",
            "total_fees": float(r.total_fees),
            "paid": float(r.paid),
            "outstanding": float(r.outstanding),
        }
        for r in rows
    ]
    return await CodeXService.mask_records_list(
        db=db,
        institution_id=user_inst_id,
        user=current_user,
        records=raw_rows,
        numeric_fields=["total_fees", "paid", "outstanding"],
        module="reports",
    )


@router.get("/fee-collection/export")
async def export_fee_collection(
    format: str = "csv",
    academic_year_id: Optional[int] = None,
    institution_id: Optional[int] = None,
    status: Optional[str] = Query(default=None),
    include_inactive: Optional[bool] = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role(*REPORT_STAFF_ROLES)),
):
    data = await fee_collection_report(
        academic_year_id=academic_year_id,
        institution_id=institution_id,
        status=status,
        include_inactive=include_inactive,
        db=db,
        current_user=current_user,
    )

    user_inst_id = institution_id or getattr(current_user, "institution_id", None) or 1
    scope_res = await CodeXService.resolve_scope(db, user_inst_id, current_user, module="reports")
    is_coded_only = scope_res.get("is_enabled") and scope_res.get("visibility_mode") == "coded_only"

    export_rows = []
    for d in data:
        row_dict = dict(d)
        if is_coded_only:
            row_dict["total_fees"] = d.get("total_fees_coded", "CX-Q")
            row_dict["paid"] = d.get("paid_coded", "CX-Q")
            row_dict["outstanding"] = d.get("outstanding_coded", "CX-Q")
        export_rows.append({
            "admission_number": row_dict.get("admission_number", ""),
            "student_name": row_dict.get("student_name", ""),
            "total_fees": row_dict.get("total_fees", 0.0),
            "paid": row_dict.get("paid", 0.0),
            "outstanding": row_dict.get("outstanding", 0.0),
        })

    if format == "csv":
        import csv

        output = io.StringIO()
        writer = csv.DictWriter(
            output,
            fieldnames=[
                "admission_number",
                "student_name",
                "total_fees",
                "paid",
                "outstanding",
            ],
        )
        writer.writeheader()
        writer.writerows(export_rows)
        output.write("\nPrathamOne Coaching Institutes Enterprise Suite · prathamone.com\n")
        return Response(
            content=output.getvalue(),
            media_type="text/csv",
            headers={
                "Content-Disposition": "attachment; filename=fee_collection.csv"
            },
        )
    elif format == "excel":
        import openpyxl

        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Fee Collection"
        # Print page footer
        ws.oddFooter.center.text = "PrathamOne Coaching Institutes Enterprise Suite · prathamone.com"
        ws.oddFooter.center.size = 8
        ws.oddFooter.center.color = "888888"
        headers = [
            "Admission No.",
            "Student Name",
            "Total Fees",
            "Paid",
            "Outstanding",
        ]
        ws.append(headers)
        for row in export_rows:
            ws.append(
                [
                    row["admission_number"],
                    row["student_name"],
                    row["total_fees"],
                    row["paid"],
                    row["outstanding"],
                ]
            )
        ws.append([])
        ws.append(["PrathamOne Coaching Institutes Enterprise Suite · prathamone.com"])
        output = io.BytesIO()
        wb.save(output)
        output.seek(0)
        return Response(
            content=output.getvalue(),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": "attachment; filename=fee_collection.xlsx"
            },
        )
    else:
        return {"error": "Unsupported format. Use csv or excel."}


@router.get("/outstanding")
async def outstanding_report(
    academic_year_id: Optional[int] = None,
    institution_id: Optional[int] = None,
    status: Optional[str] = Query(default=None),
    include_inactive: Optional[bool] = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role(*REPORT_STAFF_ROLES)),
):
    if institution_id is not None:
        check_institution_access(institution_id, current_user)
    target_inst_id = institution_id if institution_id is not None else (
        None if is_sysadmin(current_user) else getattr(current_user, "institution_id", None)
    )
    user_inst_id = institution_id or getattr(current_user, "institution_id", None) or 1
    configured_report_mode = await get_institution_setting(
        db, user_inst_id, "admission", "student_visibility_reports", "include_all"
    )

    query = select(FeeInvoice, Student).join(
        Student, FeeInvoice.student_id == Student.id
    ).where(FeeInvoice.outstanding_amount > 0)
    
    if academic_year_id:
        query = query.where(FeeInvoice.academic_year_id == academic_year_id)
    if target_inst_id is not None:
        query = query.where(Student.institution_id == target_inst_id)

    if status:
        st = status.strip().lower()
        if st == "active":
            query = query.where(Student.is_active == True)
        elif st == "inactive":
            query = query.where(Student.is_active == False)
        elif st == "withdrawn":
            query = query.where(
                or_(
                    and_(Student.is_active == False, Student.exit_date.isnot(None)),
                    Student.enrollments.any(StudentEnrollment.status == "withdrawn"),
                )
            )
        elif st == "completed":
            query = query.where(Student.enrollments.any(StudentEnrollment.status == "completed"))
        elif st == "graduated":
            query = query.where(Student.enrollments.any(StudentEnrollment.status == "graduated"))
        elif st in ("all", "include_all"):
            pass
        else:
            query = query.where(Student.enrollments.any(StudentEnrollment.status == st))
    elif include_inactive is not None:
        if not include_inactive:
            query = query.where(Student.is_active == True)
    else:
        if configured_report_mode == "active_only":
            query = query.where(Student.is_active == True)
    
    result = await db.execute(query)
    rows = result.all()
    records = [
        {
            "invoice_id": inv.id,
            "invoice_number": inv.invoice_number,
            "student_id": inv.student_id,
            "student_name": f"{s.first_name} {s.last_name}",
            "admission_number": s.admission_number,
            "net_amount": float(inv.net_amount),
            "paid_amount": float(inv.paid_amount),
            "outstanding": float(inv.outstanding_amount),
            "due_date": str(inv.due_date) if inv.due_date else None,
            "status": inv.status,
        }
        for inv, s in rows
    ]
    user_inst_id = institution_id or getattr(current_user, "institution_id", None) or 1
    return await CodeXService.mask_records_list(
        db=db,
        institution_id=user_inst_id,
        user=current_user,
        records=records,
        numeric_fields=["net_amount", "paid_amount", "outstanding"],
        module="reports",
    )


@router.get("/payments-summary")
async def payments_summary(
    academic_year_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role(*REPORT_STAFF_ROLES)),
):
    query = (
        select(
            Payment.payment_method,
            func.count(Payment.id).label("count"),
            func.coalesce(func.sum(Payment.amount), 0).label("total"),
        )
        .join(Student, Payment.student_id == Student.id)
        .where(Payment.status.in_(["completed", "posted"]))
    )

    if not is_sysadmin(current_user) and getattr(current_user, "institution_id", None):
        query = query.where(Student.institution_id == current_user.institution_id)
    if academic_year_id:
        query = query.where(Payment.academic_year_id == academic_year_id)

    query = query.group_by(Payment.payment_method)
    result = await db.execute(query)
    rows = result.all()
    records = [
        {
            "payment_method": r.payment_method,
            "count": r.count,
            "total": float(r.total),
        }
        for r in rows
    ]
    user_inst_id = getattr(current_user, "institution_id", None) or 1
    return await CodeXService.mask_records_list(
        db=db,
        institution_id=user_inst_id,
        user=current_user,
        records=records,
        numeric_fields=["total"],
        module="reports",
    )


# ─── Academic Reports ──────────────────────────────────────────────────────────

@router.get("/academic/batch-capacity")
async def batch_capacity_report(
    academic_year_id: Optional[int] = Query(None),
    board_id: Optional[int] = Query(None),
    standard_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role(*REPORT_STAFF_ROLES)),
):
    query = (
        select(Division, Standard, Board, User)
        .join(Standard, Division.standard_id == Standard.id)
        .outerjoin(Board, Division.board_id == Board.id)
        .outerjoin(User, Division.class_teacher_id == User.id)
        .where(Division.is_active == True)
    )
    if not is_sysadmin(current_user) and getattr(current_user, "institution_id", None):
        query = query.where(Standard.institution_id == current_user.institution_id)

    if board_id:
        query = query.where(Division.board_id == board_id)
    if standard_id:
        query = query.where(Division.standard_id == standard_id)

    rows = (await db.execute(query.order_by(Standard.level, Division.name))).all()

    # Pre-fetch enrollments count per batch
    enr_counts_stmt = (
        select(StudentEnrollment.division_id, func.count(StudentEnrollment.id))
        .where(StudentEnrollment.status == "active")
        .group_by(StudentEnrollment.division_id)
    )
    enr_counts = dict((await db.execute(enr_counts_stmt)).all())

    results = []
    for div, std, brd, teacher in rows:
        enrolled = enr_counts.get(div.id, 0)
        cap = div.capacity or 40
        occ_pct = round((enrolled / cap) * 100) if cap else 0
        available = max(0, cap - enrolled)

        results.append({
            "batch_id": div.id,
            "batch_name": div.name,
            "batch_code": div.code,
            "standard_id": std.id,
            "standard_name": std.name,
            "board_id": brd.id if brd else None,
            "board_name": brd.name if brd else "—",
            "capacity": cap,
            "enrolled": enrolled,
            "available_seats": available,
            "occupancy_percentage": occ_pct,
            "status": div.status,
            "teacher_name": f"{teacher.first_name} {teacher.last_name}" if teacher else "Unassigned",
            "room_number": div.room_number or "Room 1",
            "schedule_timing": div.schedule_timing or "—",
        })

    return results


@router.get("/academic/distribution")
async def academic_distribution_report(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role(*REPORT_STAFF_ROLES)),
):
    scoped_inst_id = None if is_sysadmin(current_user) else getattr(current_user, "institution_id", None)
    board_stmt = select(Board).where(Board.is_active == True)
    std_stmt = select(Standard).where(Standard.is_active == True)
    if scoped_inst_id is not None:
        board_stmt = board_stmt.where(Board.institution_id == scoped_inst_id)
        std_stmt = std_stmt.where(Standard.institution_id == scoped_inst_id)
    boards = (await db.execute(board_stmt.order_by(Board.name))).scalars().all()
    standards = (await db.execute(std_stmt.order_by(Standard.level))).scalars().all()

    # Enrolled count by board and standard
    enr_stmt = (
        select(Division.board_id, Division.standard_id, func.count(StudentEnrollment.id))
        .join(StudentEnrollment, Division.id == StudentEnrollment.division_id)
        .join(Standard, Division.standard_id == Standard.id)
        .where(StudentEnrollment.status == "active")
        .group_by(Division.board_id, Division.standard_id)
    )
    if scoped_inst_id is not None:
        enr_stmt = enr_stmt.where(Standard.institution_id == scoped_inst_id)
    enr_rows = (await db.execute(enr_stmt)).all()
    enr_map = {(b_id, s_id): cnt for b_id, s_id, cnt in enr_rows}

    # Batch count and total capacity by board and standard
    div_stmt = (
        select(Division.board_id, Division.standard_id, func.count(Division.id), func.sum(Division.capacity))
        .join(Standard, Division.standard_id == Standard.id)
        .where(Division.is_active == True)
        .group_by(Division.board_id, Division.standard_id)
    )
    if scoped_inst_id is not None:
        div_stmt = div_stmt.where(Standard.institution_id == scoped_inst_id)
    div_rows = (await db.execute(div_stmt)).all()
    div_map = {}
    for b_id, s_id, cnt, cap in div_rows:
        div_map[(b_id, s_id)] = {"batches_count": cnt, "total_capacity": cap or 0}

    results = []
    for brd in boards:
        for std in standards:
            info = div_map.get((brd.id, std.id), {"batches_count": 0, "total_capacity": 0})
            enrolled = enr_map.get((brd.id, std.id), 0)
            if info["batches_count"] > 0 or enrolled > 0:
                cap = info["total_capacity"]
                occ_pct = round((enrolled / cap) * 100) if cap else 0
                results.append({
                    "board_id": brd.id,
                    "board_name": brd.name,
                    "board_code": brd.code,
                    "standard_id": std.id,
                    "standard_name": std.name,
                    "standard_level": std.level,
                    "batches_count": info["batches_count"],
                    "total_capacity": cap,
                    "enrolled_count": enrolled,
                    "available_seats": max(0, cap - enrolled),
                    "occupancy_percentage": occ_pct,
                })

    return results


@router.get("/academic/faculty-load")
async def faculty_load_report(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role(*REPORT_STAFF_ROLES)),
):
    user_stmt = select(User).where(User.role.in_(["teacher", "faculty", "staff", "admin"]), User.is_active == True)
    if not is_sysadmin(current_user) and getattr(current_user, "institution_id", None):
        user_stmt = user_stmt.where(User.institution_id == current_user.institution_id)
    users = (await db.execute(user_stmt)).scalars().all()

    # Pre-fetch divisions where teacher is in charge
    div_stmt = (
        select(Division.class_teacher_id, func.count(Division.id), func.sum(Division.capacity))
        .where(Division.is_active == True, Division.class_teacher_id.isnot(None))
        .group_by(Division.class_teacher_id)
    )
    div_stats = {t_id: cnt for t_id, cnt, _ in (await db.execute(div_stmt)).all()}

    # Timetable sessions count for teacher's batches
    tt_stmt = (
        select(Division.class_teacher_id, func.count(TimetableEntry.id))
        .join(TimetableEntry, Division.id == TimetableEntry.division_id)
        .where(TimetableEntry.is_active == True, Division.class_teacher_id.isnot(None))
        .group_by(Division.class_teacher_id)
    )
    tt_stats = {t_id: cnt for t_id, cnt in (await db.execute(tt_stmt)).all()}

    # Total enrolled students in teacher's batches
    stu_stmt = (
        select(Division.class_teacher_id, func.count(StudentEnrollment.id))
        .join(StudentEnrollment, Division.id == StudentEnrollment.division_id)
        .where(StudentEnrollment.status == "active", Division.class_teacher_id.isnot(None))
        .group_by(Division.class_teacher_id)
    )
    stu_stats = {t_id: cnt for t_id, cnt in (await db.execute(stu_stmt)).all()}

    results = []
    for u in users:
        batches_cnt = div_stats.get(u.id, 0)
        sessions_cnt = tt_stats.get(u.id, 0)
        students_cnt = stu_stats.get(u.id, 0)

        results.append({
            "user_id": u.id,
            "teacher_name": f"{u.first_name} {u.last_name}".strip(),
            "username": u.username,
            "email": u.email,
            "staff_code": u.staff_code or "—",
            "designation": u.designation or u.role.capitalize(),
            "assigned_batches_count": batches_cnt,
            "weekly_sessions_count": sessions_cnt,
            "total_students": students_cnt,
        })

    results.sort(key=lambda r: (r["assigned_batches_count"], r["weekly_sessions_count"]), reverse=True)
    return results


@router.get("/academic/export")
async def export_academic_report(
    report_type: str = Query("batch-capacity"),
    board_id: Optional[int] = Query(None),
    standard_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role(*REPORT_STAFF_ROLES)),
):
    output = io.StringIO()

    if report_type == "batch-capacity":
        data = await batch_capacity_report(board_id=board_id, standard_id=standard_id, db=db, current_user=current_user)
        writer = csv.DictWriter(
            output,
            fieldnames=[
                "batch_id", "batch_name", "batch_code", "board_name", "standard_name",
                "capacity", "enrolled", "available_seats", "occupancy_percentage",
                "status", "teacher_name", "room_number", "schedule_timing"
            ],
            extrasaction="ignore",
        )
        writer.writeheader()
        writer.writerows(data)
        filename = "batch_capacity_report.csv"
    elif report_type == "distribution":
        data = await academic_distribution_report(db=db, current_user=current_user)
        writer = csv.DictWriter(
            output,
            fieldnames=[
                "board_name", "board_code", "standard_name", "standard_level",
                "batches_count", "total_capacity", "enrolled_count",
                "available_seats", "occupancy_percentage"
            ],
            extrasaction="ignore",
        )
        writer.writeheader()
        writer.writerows(data)
        filename = "academic_distribution_report.csv"
    else:
        data = await faculty_load_report(db=db, current_user=current_user)
        writer = csv.DictWriter(
            output,
            fieldnames=[
                "user_id", "teacher_name", "staff_code", "designation",
                "assigned_batches_count", "weekly_sessions_count", "total_students"
            ],
            extrasaction="ignore",
        )
        writer.writeheader()
        writer.writerows(data)
        filename = "faculty_load_report.csv"

    output.write("\nPrathamOne Coaching Institutes Enterprise Suite · prathamone.com\n")
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


# ── Student Lifecycle & Withdrawal Analytics Reports ──


@router.get("/withdrawals")
async def student_withdrawals_report(
    academic_year_id: Optional[int] = None,
    standard_id: Optional[int] = None,
    division_id: Optional[int] = None,
    paid_status: Optional[str] = Query(None, description="all, paid, unpaid"),
    reason: Optional[str] = None,
    search: Optional[str] = None,
    effective_inst_id: int = Depends(enforce_institution_access),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role(*REPORT_STAFF_ROLES)),
):
    """
    Detailed Student Withdrawal Report providing student metadata, class & batch allocation,
    exit date & reasons, paid/unpaid status, gross payments, refunds, net retained, and outstanding dues.
    """
    query = (
        select(StudentEnrollment, Student, Standard, Division, AcademicYear, User)
        .join(Student, StudentEnrollment.student_id == Student.id)
        .join(Standard, StudentEnrollment.standard_id == Standard.id)
        .outerjoin(Division, StudentEnrollment.division_id == Division.id)
        .join(AcademicYear, StudentEnrollment.academic_year_id == AcademicYear.id)
        .outerjoin(User, StudentEnrollment.exited_by_id == User.id)
        .where(
            or_(
                StudentEnrollment.status == "withdrawn",
                and_(Student.is_active == False, Student.exit_date.isnot(None)),
            )
        )
    )

    if effective_inst_id:
        query = query.where(Student.institution_id == effective_inst_id)
    if academic_year_id:
        query = query.where(StudentEnrollment.academic_year_id == academic_year_id)
    if standard_id:
        query = query.where(StudentEnrollment.standard_id == standard_id)
    if division_id:
        query = query.where(StudentEnrollment.division_id == division_id)
    if reason:
        query = query.where(
            or_(
                StudentEnrollment.exit_reason.ilike(f"%{reason}%"),
                Student.exit_reason.ilike(f"%{reason}%"),
            )
        )
    if search:
        query = query.where(
            or_(
                Student.first_name.ilike(f"%{search}%"),
                Student.last_name.ilike(f"%{search}%"),
                Student.admission_number.ilike(f"%{search}%"),
            )
        )

    query = query.order_by(desc(StudentEnrollment.exit_date), desc(StudentEnrollment.id))
    rows = (await db.execute(query)).all()

    report_items = []
    for enr, std, standard, div, ay, user in rows:
        # 1. Total invoiced for this student in this academic year
        inv_stmt = select(
            func.coalesce(func.sum(FeeInvoice.net_amount), 0).label("invoiced"),
            func.coalesce(func.sum(FeeInvoice.paid_amount), 0).label("paid"),
            func.coalesce(func.sum(FeeInvoice.outstanding_amount), 0).label("outstanding"),
        ).where(
            FeeInvoice.student_id == std.id,
            FeeInvoice.academic_year_id == enr.academic_year_id,
        )
        inv_res = (await db.execute(inv_stmt)).one()
        invoiced_amount = float(inv_res.invoiced or 0)
        invoice_outstanding = float(inv_res.outstanding or 0)

        # 2. Authoritative gross completed payments (excluding reversed/failed)
        pmt_stmt = select(
            func.coalesce(func.sum(Payment.amount), 0)
        ).where(
            Payment.student_id == std.id,
            Payment.academic_year_id == enr.academic_year_id,
            Payment.status.in_(["completed", "posted"]),
            Payment.reversed_at.is_(None),
        )
        gross_paid = float((await db.execute(pmt_stmt)).scalar() or 0)

        # 3. Authoritative refunds processed for this student
        ref_stmt = select(
            func.coalesce(func.sum(Refund.amount), 0)
        ).where(
            Refund.student_id == std.id,
            Refund.status.in_(["completed", "processed"]),
        )
        refund_amount = float((await db.execute(ref_stmt)).scalar() or 0)

        # 4. Net Retained Collections & Outstanding at Exit
        net_retained = max(0.0, round(gross_paid - refund_amount, 2))
        outstanding_at_exit = max(0.0, round(invoiced_amount - net_retained, 2)) if invoiced_amount > 0 else invoice_outstanding

        # 5. Paid / Unpaid classification
        classification = "Paid" if gross_paid > 0 else "Unpaid"
        if paid_status:
            p_lower = paid_status.lower()
            if p_lower == "paid" and classification != "Paid":
                continue
            elif p_lower == "unpaid" and classification != "Unpaid":
                continue

        # 6. Count invoice due dates; fee-item due dates are not persisted.
        effective_exit = enr.exit_date or std.exit_date or date.today()
        due_invoice_stmt = (
            select(func.count(FeeInvoice.id))
            .where(
                FeeInvoice.student_id == std.id,
                FeeInvoice.academic_year_id == enr.academic_year_id,
                FeeInvoice.due_date <= effective_exit,
            )
        )
        due_invoice_count = (await db.execute(due_invoice_stmt)).scalar() or 0
        invoice_label = (
            f"Invoice #{due_invoice_count}"
            if due_invoice_count > 0
            else "No invoice due by exit"
        )

        duration_days = (
            (effective_exit - enr.enrollment_date).days
            if effective_exit and enr.enrollment_date
            else 0
        )

        report_items.append({
            "enrollment_id": enr.id,
            "student_id": std.id,
            "admission_number": std.admission_number,
            "student_name": f"{std.first_name} {std.last_name}",
            "standard_id": standard.id,
            "standard_name": standard.name,
            "division_id": div.id if div else None,
            "division_name": div.name if div else "Unassigned",
            "academic_year_id": ay.id,
            "academic_year_name": ay.name,
            "enrollment_date": str(enr.enrollment_date),
            "exit_date": str(effective_exit),
            "duration_days": max(0, duration_days),
            "exit_reason": enr.exit_reason or std.exit_reason or "Personal / Relocation",
            "exit_notes": enr.exit_notes or std.exit_notes or "",
            "exited_by_name": f"{user.first_name} {user.last_name}" if user else "Administration",
            "paid_classification": classification,
            "installment_at_exit": invoice_label,
            "total_invoiced": invoiced_amount,
            "gross_paid": gross_paid,
            "refund_amount": refund_amount,
            "net_retained": net_retained,
            "outstanding_at_exit": outstanding_at_exit,
        })

    return report_items


@router.get("/withdrawal-analytics")
async def withdrawal_analytics_report(
    academic_year_id: Optional[int] = None,
    standard_id: Optional[int] = None,
    division_id: Optional[int] = None,
    effective_inst_id: int = Depends(enforce_institution_access),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role(*REPORT_STAFF_ROLES)),
):
    """
    Comprehensive Analytics Blueprint endpoint providing aggregate KPIs, Attrition Rate,
    Reason Distributions, Class/Batch breakdown, Installment-wise attrition, and Monthly Trends.
    """
    items = await student_withdrawals_report(
        academic_year_id=academic_year_id,
        standard_id=standard_id,
        division_id=division_id,
        paid_status=None,
        reason=None,
        search=None,
        effective_inst_id=effective_inst_id,
        db=db,
        current_user=current_user,
    )

    # Total enrolled count across selected scope
    enr_count_stmt = select(func.count(StudentEnrollment.id)).join(
        Student, StudentEnrollment.student_id == Student.id
    )
    if effective_inst_id:
        enr_count_stmt = enr_count_stmt.where(Student.institution_id == effective_inst_id)
    if academic_year_id:
        enr_count_stmt = enr_count_stmt.where(StudentEnrollment.academic_year_id == academic_year_id)
    if standard_id:
        enr_count_stmt = enr_count_stmt.where(StudentEnrollment.standard_id == standard_id)
    if division_id:
        enr_count_stmt = enr_count_stmt.where(StudentEnrollment.division_id == division_id)

    total_enrolled = (await db.execute(enr_count_stmt)).scalar() or 0
    total_withdrawn = len(items)
    attrition_rate = round((total_withdrawn / total_enrolled) * 100, 2) if total_enrolled > 0 else 0.0

    # Summary Financials
    paid_count = sum(1 for i in items if i["paid_classification"] == "Paid")
    unpaid_count = total_withdrawn - paid_count
    total_gross = round(sum(i["gross_paid"] for i in items), 2)
    total_refunds = round(sum(i["refund_amount"] for i in items), 2)
    total_net = round(sum(i["net_retained"] for i in items), 2)
    total_outstanding = round(sum(i["outstanding_at_exit"] for i in items), 2)

    # Group by Reason
    reason_map = {}
    for i in items:
        r = i["exit_reason"]
        if r not in reason_map:
            reason_map[r] = {"count": 0, "net_retained": 0.0}
        reason_map[r]["count"] += 1
        reason_map[r]["net_retained"] += i["net_retained"]

    by_reason = [
        {
            "reason": r,
            "count": data["count"],
            "percentage": round((data["count"] / total_withdrawn) * 100, 1) if total_withdrawn > 0 else 0.0,
            "net_retained": round(data["net_retained"], 2),
        }
        for r, data in sorted(reason_map.items(), key=lambda x: x[1]["count"], reverse=True)
    ]

    # Group by Class & Batch
    batch_map = {}
    for i in items:
        key = f"{i['standard_name']} - {i['division_name']}"
        if key not in batch_map:
            batch_map[key] = {
                "standard_name": i["standard_name"],
                "division_name": i["division_name"],
                "withdrawals": 0,
                "net_retained": 0.0,
            }
        batch_map[key]["withdrawals"] += 1
        batch_map[key]["net_retained"] += i["net_retained"]

    by_class_batch = [
        {
            "standard_name": data["standard_name"],
            "division_name": data["division_name"],
            "withdrawals": data["withdrawals"],
            "net_retained": round(data["net_retained"], 2),
        }
        for key, data in sorted(batch_map.items(), key=lambda x: x[1]["withdrawals"], reverse=True)
    ]

    # Group by Installment
    installment_map = {}
    for i in items:
        inst = i["installment_at_exit"]
        if inst not in installment_map:
            installment_map[inst] = {"count": 0, "gross_collected": 0.0, "net_retained": 0.0}
        installment_map[inst]["count"] += 1
        installment_map[inst]["gross_collected"] += i["gross_paid"]
        installment_map[inst]["net_retained"] += i["net_retained"]

    by_installment = [
        {
            "installment": inst,
            "count": data["count"],
            "gross_collected": round(data["gross_collected"], 2),
            "net_retained": round(data["net_retained"], 2),
        }
        for inst, data in sorted(installment_map.items(), key=lambda x: x[0])
    ]

    # Monthly Trends
    month_map = {}
    for i in items:
        m = i["exit_date"][:7] if i["exit_date"] else "Unknown"
        if m not in month_map:
            month_map[m] = {"count": 0, "gross_collected": 0.0, "refunds": 0.0, "net_retained": 0.0}
        month_map[m]["count"] += 1
        month_map[m]["gross_collected"] += i["gross_paid"]
        month_map[m]["refunds"] += i["refund_amount"]
        month_map[m]["net_retained"] += i["net_retained"]

    trends_monthly = [
        {
            "month": m,
            "count": data["count"],
            "gross_collected": round(data["gross_collected"], 2),
            "refunds": round(data["refunds"], 2),
            "net_retained": round(data["net_retained"], 2),
        }
        for m, data in sorted(month_map.items(), key=lambda x: x[0])
    ]

    return {
        "summary": {
            "total_enrolled": total_enrolled,
            "total_active": max(0, total_enrolled - total_withdrawn),
            "total_withdrawn": total_withdrawn,
            "attrition_rate": attrition_rate,
            "paid_withdrawals": paid_count,
            "unpaid_withdrawals": unpaid_count,
            "total_gross_paid": total_gross,
            "total_refunds": total_refunds,
            "total_net_retained": total_net,
            "total_outstanding_at_exit": total_outstanding,
        },
        "by_reason": by_reason,
        "by_class_batch": by_class_batch,
        "by_installment": by_installment,
        "trends_monthly": trends_monthly,
    }


@router.get("/withdrawals/export")
async def export_student_withdrawals_report(
    academic_year_id: Optional[int] = None,
    standard_id: Optional[int] = None,
    division_id: Optional[int] = None,
    effective_inst_id: int = Depends(enforce_institution_access),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role(*REPORT_STAFF_ROLES)),
):
    data = await student_withdrawals_report(
        academic_year_id=academic_year_id,
        standard_id=standard_id,
        division_id=division_id,
        paid_status=None,
        reason=None,
        search=None,
        effective_inst_id=effective_inst_id,
        db=db,
        current_user=current_user,
    )
    output = io.StringIO()
    writer = csv.DictWriter(
        output,
        fieldnames=[
            "admission_number", "student_name", "standard_name", "division_name",
            "academic_year_name", "enrollment_date", "exit_date", "duration_days",
            "exit_reason", "paid_classification", "installment_at_exit",
            "total_invoiced", "gross_paid", "refund_amount", "net_retained",
            "outstanding_at_exit", "exit_notes", "exited_by_name"
        ],
        extrasaction="ignore",
    )
    writer.writeheader()
    writer.writerows(data)
    output.write("\nPrathamOne Coaching Institutes Enterprise Suite · prathamone.com\n")

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=student_withdrawals_report.csv"},
    )


# ============================================================================
# 5. NEW CENTRAL REPORTING & ANALYTICS MODULE-WISE ENDPOINTS
# ============================================================================

@router.get("/students/master-directory")
async def student_master_directory_report(
    academic_year_id: Optional[int] = None,
    board_id: Optional[int] = None,
    standard_id: Optional[int] = None,
    division_id: Optional[int] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    data_env: str = Depends(get_data_environment),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*REPORT_STAFF_ROLES)),
):
    """
    Exportable Demographic Roster of all enrolled students with academic allocations,
    guardian contact, and status.
    """
    inst_id = await resolve_report_institution_id(db, current_user, data_env)
    query = (
        select(Student, StudentEnrollment, Standard, Division, Board)
        .outerjoin(
            StudentEnrollment,
            (Student.id == StudentEnrollment.student_id)
            & (
                (StudentEnrollment.academic_year_id == academic_year_id)
                if academic_year_id
                else (StudentEnrollment.status == "enrolled")
            ),
        )
        .outerjoin(Standard, StudentEnrollment.standard_id == Standard.id)
        .outerjoin(Division, StudentEnrollment.division_id == Division.id)
        .outerjoin(Board, Division.board_id == Board.id)
        .where(Student.institution_id == inst_id)
    )

    if board_id:
        query = query.where(Board.id == board_id)
    if standard_id:
        query = query.where(Standard.id == standard_id)
    if division_id:
        query = query.where(Division.id == division_id)
    if status and status != "all":
        query = query.where(StudentEnrollment.status == status)
    if search:
        s_term = f"%{search}%"
        query = query.where(
            or_(
                Student.first_name.ilike(s_term),
                Student.last_name.ilike(s_term),
                Student.admission_number.ilike(s_term),
                Student.phone.ilike(s_term),
            )
        )

    query = apply_report_environment_filter(query, Student, data_env)

    res = await db.execute(query.order_by(Student.admission_number))
    rows = res.all()

    return [
        {
            "id": s.id,
            "admission_number": s.admission_number,
            "student_name": f"{s.first_name} {s.last_name}",
            "first_name": s.first_name,
            "last_name": s.last_name,
            "gender": s.gender or "N/A",
            "date_of_birth": s.date_of_birth.isoformat() if s.date_of_birth else None,
            "phone": s.phone,
            "email": s.email,
            "blood_group": getattr(s, "blood_group", None) or "N/A",
            "emergency_contact": getattr(s, "emergency_contact", None) or s.phone,
            "standard_name": std.name if std else "Unassigned",
            "division_name": div.name if div else "Unassigned",
            "batch_code": div.code if div else None,
            "board_name": brd.name if brd else "N/A",
            "admission_date": s.admission_date.isoformat() if s.admission_date else None,
            "status": enr.status if enr else ("active" if s.is_active else "inactive"),
            "is_active": s.is_active,
            "city": s.city or "Mumbai",
            "address": getattr(s, "current_address", None) or s.city or "",
        }
        for s, enr, std, div, brd in rows
    ]


@router.get("/attendance/summary")
async def student_attendance_summary_report(
    academic_year_id: Optional[int] = None,
    standard_id: Optional[int] = None,
    division_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    defaulters_only: bool = Query(False),
    data_env: str = Depends(get_data_environment),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*REPORT_STAFF_ROLES)),
):
    """
    Cohort and batch-level student attendance summary with percentage computation
    and chronic defaulter (<75%) identification.
    """
    inst_id = await resolve_report_institution_id(db, current_user, data_env)

    enr_query = (
        select(Student, StudentEnrollment, Standard, Division)
        .join(StudentEnrollment, Student.id == StudentEnrollment.student_id)
        .join(Standard, StudentEnrollment.standard_id == Standard.id)
        .join(Division, StudentEnrollment.division_id == Division.id)
        .where(Student.institution_id == inst_id)
    )
    if academic_year_id:
        enr_query = enr_query.where(StudentEnrollment.academic_year_id == academic_year_id)
    if standard_id:
        enr_query = enr_query.where(Standard.id == standard_id)
    if division_id:
        enr_query = enr_query.where(Division.id == division_id)

    students_res = await db.execute(enr_query)
    student_records = students_res.all()

    att_conditions = [Student.institution_id == inst_id]
    if start_date:
        att_conditions.append(Attendance.date >= start_date)
    if end_date:
        att_conditions.append(Attendance.date <= end_date)

    att_query = (
        select(
            Attendance.student_id,
            func.count(Attendance.id).label("total_days"),
            func.count(func.nullif(Attendance.status.notin_(["present", "late"]), True)).label("present_days"),
            func.count(func.nullif(Attendance.status != "absent", True)).label("absent_days"),
            func.count(func.nullif(Attendance.status != "late", True)).label("late_days"),
        )
        .join(Student, Attendance.student_id == Student.id)
        .where(and_(*att_conditions))
        .group_by(Attendance.student_id)
    )
    att_res = await db.execute(att_query)
    att_map = {row.student_id: row for row in att_res.all()}

    output = []
    for s, enr, std, div in student_records:
        att = att_map.get(s.id)
        tot = att.total_days if att else 0
        pres = att.present_days if att else 0
        ab = att.absent_days if att else 0
        lt = att.late_days if att else 0
        pct = round((pres / tot) * 100, 1) if tot > 0 else 100.0
        is_def = tot > 0 and pct < 75.0

        if defaulters_only and not is_def:
            continue

        output.append({
            "student_id": s.id,
            "admission_number": s.admission_number,
            "student_name": f"{s.first_name} {s.last_name}",
            "standard_name": std.name,
            "division_name": div.name,
            "total_days": tot,
            "present_days": pres,
            "absent_days": ab,
            "late_days": lt,
            "attendance_percentage": pct,
            "is_defaulter": is_def,
            "status": "Defaulter (<75%)" if is_def else ("Good" if pct >= 85.0 else "Average"),
        })

    return output


@router.get("/academic/curriculum-matrix")
async def academic_curriculum_matrix_report(
    board_id: Optional[int] = None,
    standard_id: Optional[int] = None,
    data_env: str = Depends(get_data_environment),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*REPORT_STAFF_ROLES)),
):
    """
    Cross-tabulation matrix of subjects taught per standard and board,
    weekly instructional workload, and assigned faculty members.
    """
    inst_id = await resolve_report_institution_id(db, current_user, data_env)
    query = (
        select(Subject, Standard)
        .join(Standard, Subject.standard_id == Standard.id)
        .where(Standard.institution_id == inst_id)
    )
    if standard_id:
        query = query.where(Standard.id == standard_id)
    if board_id:
        query = query.where(
            Standard.id.in_(
                select(Division.standard_id).where(Division.board_id == board_id)
            )
        )

    res = await db.execute(query.order_by(Standard.level, Subject.name))
    rows = res.all()

    # Map standards to their boards via divisions
    div_boards_res = await db.execute(
        select(Division.standard_id, Board.name)
        .join(Board, Division.board_id == Board.id)
        .distinct()
    )
    std_board_map: Dict[int, List[str]] = {}
    for sid, bname in div_boards_res.all():
        std_board_map.setdefault(sid, []).append(bname)

    assign_query = (
        select(TeacherAssignment.subject_id, User.first_name, User.last_name)
        .join(User, TeacherAssignment.teacher_user_id == User.id)
        .where(TeacherAssignment.is_active == True)
    )
    assign_res = await db.execute(assign_query)
    teacher_map: Dict[int, List[str]] = {}
    for sub_id, fn, ln in assign_res.all():
        teacher_map.setdefault(sub_id, []).append(f"{fn} {ln}")

    return [
        {
            "subject_id": sub.id,
            "subject_name": sub.name,
            "subject_code": sub.code or "N/A",
            "standard_name": std.name,
            "board_name": ", ".join(std_board_map.get(std.id, ["All Boards"])),
            "weekly_hours": getattr(sub, "weekly_hours", 4.0) or 4.0,
            "assigned_teachers_count": len(teacher_map.get(sub.id, [])),
            "teachers_list": ", ".join(set(teacher_map.get(sub.id, []))) or "Unassigned",
        }
        for sub, std in rows
    ]


@router.get("/academic/timetable-utilization")
async def timetable_utilization_report(
    division_id: Optional[int] = None,
    day_of_week: Optional[str] = None,
    data_env: str = Depends(get_data_environment),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*REPORT_STAFF_ROLES)),
):
    """
    Weekly schedule occupancy analysis showing room utilization, weekday distribution,
    and instructional session coverage.
    """
    inst_id = await resolve_report_institution_id(db, current_user, data_env)
    query = (
        select(TimetableEntry, Division, Subject, User)
        .join(Division, TimetableEntry.division_id == Division.id)
        .join(Subject, TimetableEntry.subject_id == Subject.id)
        .outerjoin(User, TimetableEntry.teacher_id == User.id)
        .join(Standard, Division.standard_id == Standard.id)
        .where(Standard.institution_id == inst_id)
    )
    if division_id:
        query = query.where(Division.id == division_id)
    if day_of_week:
        query = query.where(TimetableEntry.day_of_week.ilike(day_of_week))

    res = await db.execute(query.order_by(TimetableEntry.day_of_week, TimetableEntry.start_time))
    rows = res.all()

    return [
        {
            "id": te.id,
            "day_of_week": te.day_of_week,
            "start_time": te.start_time,
            "end_time": te.end_time,
            "room_number": te.room_number or "Room A1",
            "batch_name": div.name,
            "batch_code": div.code or div.name,
            "subject_name": sub.name,
            "teacher_name": f"{u.first_name} {u.last_name}" if u else "Unassigned",
            "is_active": te.is_active,
        }
        for te, div, sub, u in rows
    ]


@router.get("/examinations/consolidated-merit")
async def exam_consolidated_merit_report(
    exam_id: Optional[int] = None,
    academic_year_id: Optional[int] = None,
    standard_id: Optional[int] = None,
    data_env: str = Depends(get_data_environment),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*REPORT_STAFF_ROLES)),
):
    """
    Consolidated cohort exam merit ranking and performance register
    with aggregate marks, percentage, letter grades, and ranks.
    """
    inst_id = await resolve_report_institution_id(db, current_user, data_env)

    target_exam_id = exam_id
    if not target_exam_id:
        exam_q = (
            select(Examination.id)
            .join(Standard, Examination.standard_id == Standard.id)
            .where(Standard.institution_id == inst_id)
        )
        if academic_year_id:
            exam_q = exam_q.where(Examination.academic_year_id == academic_year_id)
        if standard_id:
            exam_q = exam_q.where(Examination.standard_id == standard_id)
        target_exam_id = (await db.execute(exam_q.order_by(Examination.id.desc()).limit(1))).scalar_one_or_none()

    if not target_exam_id:
        return []

    exam = (await db.execute(select(Examination).where(Examination.id == target_exam_id))).scalar_one_or_none()
    if not exam:
        return []
    exam_std = await db.get(Standard, exam.standard_id)
    if exam_std:
        check_institution_access(exam_std.institution_id, current_user)

    marks_query = (
        select(ExamMark, Student, Subject)
        .join(Student, ExamMark.student_id == Student.id)
        .join(Subject, ExamMark.subject_id == Subject.id)
        .where(ExamMark.examination_id == target_exam_id)
    )
    if inst_id:
        marks_query = marks_query.where(Student.institution_id == inst_id)
    marks_res = await db.execute(marks_query)
    marks_rows = marks_res.all()

    student_marks_map: Dict[int, Dict[str, Any]] = {}
    for m, s, sub in marks_rows:
        if s.id not in student_marks_map:
            student_marks_map[s.id] = {
                "student_id": s.id,
                "admission_number": s.admission_number,
                "student_name": f"{s.first_name} {s.last_name}",
                "exam_name": exam.name,
                "marks_obtained": Decimal("0.00"),
                "max_marks": Decimal("0.00"),
                "subject_count": 0,
                "has_failed_subject": False,
            }
        sm = student_marks_map[s.id]
        obt = m.marks_obtained or Decimal("0.00")
        sm["marks_obtained"] += obt
        sm["max_marks"] += Decimal(str(exam.max_marks))
        sm["subject_count"] += 1
        if obt < Decimal(str(exam.passing_marks)):
            sm["has_failed_subject"] = True

    results = []
    for sm in student_marks_map.values():
        max_m = float(sm["max_marks"]) if sm["max_marks"] > 0 else 100.0
        obt_m = float(sm["marks_obtained"])
        pct = round((obt_m / max_m) * 100, 1)

        if pct >= 90:
            grade = "A+"
        elif pct >= 80:
            grade = "A"
        elif pct >= 70:
            grade = "B"
        elif pct >= 60:
            grade = "C"
        elif pct >= 50:
            grade = "D"
        else:
            grade = "E"

        status = "Pass" if not sm["has_failed_subject"] and pct >= 35.0 else "Fail"

        results.append({
            "student_id": sm["student_id"],
            "admission_number": sm["admission_number"],
            "student_name": sm["student_name"],
            "exam_name": sm["exam_name"],
            "marks_obtained": obt_m,
            "max_marks": max_m,
            "percentage": pct,
            "grade": grade,
            "status": status,
            "subject_count": sm["subject_count"],
        })

    results.sort(key=lambda x: x["percentage"], reverse=True)
    for idx, r in enumerate(results, 1):
        r["rank"] = idx

    return results


@router.get("/fees/defaulters")
async def fee_defaulters_aging_report(
    academic_year_id: Optional[int] = None,
    standard_id: Optional[int] = None,
    division_id: Optional[int] = None,
    institution_id: Optional[int] = None,
    min_days_overdue: int = Query(0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*REPORT_STAFF_ROLES)),
):
    """
    Consolidated overdue fee aging register with guardian contacts, days overdue,
    and CodeX privacy masking.
    """
    if institution_id is not None:
        check_institution_access(institution_id, current_user)
    inst_id = institution_id or (None if is_sysadmin(current_user) else getattr(current_user, "institution_id", None))
    today = date.today()

    query = (
        select(FeeInvoice, Student, StudentEnrollment, Standard, Division)
        .join(Student, FeeInvoice.student_id == Student.id)
        .outerjoin(
            StudentEnrollment,
            (Student.id == StudentEnrollment.student_id)
            & (
                (StudentEnrollment.academic_year_id == academic_year_id)
                if academic_year_id
                else (StudentEnrollment.status == "enrolled")
            ),
        )
        .outerjoin(Standard, StudentEnrollment.standard_id == Standard.id)
        .outerjoin(Division, StudentEnrollment.division_id == Division.id)
        .where(
            FeeInvoice.status.in_(["unpaid", "overdue", "partially_paid", "partial"]),
            FeeInvoice.due_date < today,
        )
    )

    if inst_id:
        query = query.where(Student.institution_id == inst_id)

    if academic_year_id:
        query = query.where(FeeInvoice.academic_year_id == academic_year_id)
    if standard_id:
        query = query.where(Standard.id == standard_id)
    if division_id:
        query = query.where(Division.id == division_id)

    res = await db.execute(query.order_by(FeeInvoice.due_date))
    rows = res.all()

    records = []
    for inv, s, enr, std, div in rows:
        days = (today - inv.due_date).days if inv.due_date else 0
        if days < min_days_overdue:
            continue

        records.append({
            "installment_id": inv.id,
            "invoice_id": inv.id,
            "student_id": s.id,
            "admission_number": s.admission_number,
            "student_name": f"{s.first_name} {s.last_name}",
            "standard_name": std.name if std else "N/A",
            "division_name": div.name if div else "N/A",
            "guardian_phone": s.phone or "N/A",
            "installment_name": f"Invoice {inv.invoice_number}",
            "due_date": inv.due_date.isoformat() if inv.due_date else None,
            "days_overdue": days,
            "overdue_amount": float(inv.outstanding_amount),
            "total_outstanding": float(inv.outstanding_amount),
            "status": "Severely Overdue" if days > 60 else ("Overdue" if days > 30 else "Grace Period"),
        })

    return await CodeXService.mask_records_list(
        db=db,
        institution_id=inst_id or 1,
        user=current_user,
        records=records,
        numeric_fields=["overdue_amount", "total_outstanding"],
        module="reports",
    )


@router.get("/fees/daily-collection")
async def daily_payment_collection_report(
    date_val: Optional[date] = Query(None, alias="date"),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    payment_mode: Optional[str] = None,
    data_env: str = Depends(get_data_environment),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*REPORT_STAFF_ROLES)),
):
    """
    Day-wise cashier intake register showing receipt numbers, student admissions,
    payment modes, and transaction references with CodeX masking.
    """
    inst_id = await resolve_report_institution_id(db, current_user, data_env)
    today = date.today()

    s_date = start_date or date_val or today
    e_date = end_date or date_val or today

    latest_receipt_id = (
        select(PaymentReceipt.id)
        .where(PaymentReceipt.payment_id == Payment.id)
        .order_by(PaymentReceipt.version.desc(), PaymentReceipt.id.desc())
        .limit(1)
        .correlate(Payment)
        .scalar_subquery()
    )

    query = (
        select(Payment, Student, User, PaymentReceipt)
        .join(Student, Payment.student_id == Student.id)
        .outerjoin(User, Payment.collected_by_id == User.id)
        .outerjoin(PaymentReceipt, PaymentReceipt.id == latest_receipt_id)
        .where(
            Student.institution_id == inst_id,
            Payment.status.in_(["completed", "posted"]),
            Payment.payment_date >= s_date,
            Payment.payment_date <= e_date,
        )
    )

    if payment_mode and payment_mode != "all":
        query = query.where(Payment.payment_method == payment_mode)

    res = await db.execute(query.order_by(Payment.payment_date.desc(), Payment.id.desc()))
    rows = res.all()

    records = []
    for p, s, u, receipt in rows:
        receipt_is_valid = receipt is not None and receipt.status == "valid"
        records.append({
            "payment_id": p.id,
            "receipt_number": receipt.receipt_number if receipt_is_valid else None,
            "receipt_status": receipt.status if receipt else "missing",
            "payment_date": p.payment_date.isoformat() if p.payment_date else None,
            "admission_number": s.admission_number,
            "student_name": f"{s.first_name} {s.last_name}",
            "amount": float(p.amount),
            "payment_mode": p.payment_method or "cash",
            "transaction_reference": p.transaction_reference or "N/A",
            "collector_name": f"{u.first_name} {u.last_name}" if u else "Self/Online",
            "status": p.status,
        })

    return await CodeXService.mask_records_list(
        db=db,
        institution_id=inst_id,
        user=current_user,
        records=records,
        numeric_fields=["amount"],
        module="reports",
    )


@router.get("/system/audit-summary")
async def system_audit_summary_report(
    severity: Optional[str] = None,
    resource_type: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    limit: int = Query(100, le=500),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*AUDIT_REPORT_ROLES)),
):
    """
    Institutional user activity, login, and authorization verification audit log.
    """
    query = (
        select(AuditLog, User)
        .outerjoin(User, AuditLog.user_id == User.id)
    )

    conditions = []
    if not is_sysadmin(current_user) and getattr(current_user, "institution_id", None):
        conditions.append(User.institution_id == current_user.institution_id)
    if severity:
        conditions.append(AuditLog.severity == severity)
    if resource_type:
        conditions.append(AuditLog.resource_type == resource_type)
    if start_date:
        conditions.append(AuditLog.created_at >= datetime.combine(start_date, datetime.min.time()))
    if end_date:
        conditions.append(AuditLog.created_at <= datetime.combine(end_date, datetime.max.time()))

    if conditions:
        query = query.where(and_(*conditions))

    res = await db.execute(query.order_by(AuditLog.created_at.desc()).limit(limit))
    rows = res.all()

    return [
        {
            "id": a.id,
            "timestamp": a.created_at.isoformat() if a.created_at else None,
            "actor_name": f"{u.first_name} {u.last_name}" if u else "System / Anonymous",
            "action": a.action,
            "resource_type": a.resource_type,
            "resource_id": a.resource_id,
            "severity": a.severity or "info",
            "ip_address": a.ip_address or "127.0.0.1",
            "details": a.details or a.new_data or "N/A",
        }
        for a, u in rows
    ]


# ─────────────────────────────────────────────────────────────────────────────
# CONCESSION, FEE WAIVER & SCHOLARSHIP GOVERNANCE REPORTS (20 REPORTS)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/concessions/catalog")
async def get_concession_reports_catalog(
    current_user: User = Depends(require_role(*REPORT_STAFF_ROLES)),
):
    """Returns metadata catalog of all 20 governed concession, waiver, and scholarship reports."""
    return [
        {"id": key, "title": meta["title"], "category": meta["category"]}
        for key, meta in CONCESSION_REPORT_DEFINITIONS.items()
    ]


@router.get("/concessions/{report_id}")
async def get_concession_governance_report(
    report_id: str,
    academic_year_id: Optional[int] = None,
    institution_id: Optional[int] = None,
    standard_id: Optional[int] = None,
    division_id: Optional[int] = None,
    student_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    funding_source: Optional[str] = None,
    benefit_type: Optional[str] = None,
    search: Optional[str] = None,
    data_env: str = Depends(get_data_environment),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*REPORT_STAFF_ROLES)),
):
    can_rep = await has_permission(db, current_user, "concessions", "reports")
    if not can_rep and current_user.role not in ("superadmin", "admin", "accountant", "principal"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions: requires 'concessions:reports' privilege.",
        )
    if report_id not in CONCESSION_REPORT_DEFINITIONS:
        raise HTTPException(status_code=404, detail=f"Unknown concession report '{report_id}'")

    if institution_id is not None:
        check_institution_access(institution_id, current_user)
    inst_id = institution_id or await resolve_report_institution_id(db, current_user, data_env)
    is_demo_filter = True if data_env == "TRAINING" else (False if data_env == "PRODUCTION" else None)

    flt = FinancialFilter(
        institution_id=inst_id,
        academic_year_id=academic_year_id,
        standard_id=standard_id,
        division_id=division_id,
        student_id=student_id,
        start_date=start_date,
        end_date=end_date,
        search=search,
        status=status_filter if status_filter != "all" else None,
        funding_source=funding_source if funding_source != "all" else None,
        benefit_type=benefit_type if benefit_type != "all" else None,
        is_demo=is_demo_filter,
    )
    return await FinancialGovernanceService.generate_concession_report(db, report_id, flt)


@router.get("/concessions/{report_id}/export")
async def export_concession_governance_report(
    report_id: str,
    format: str = Query("xlsx", regex="^(csv|xlsx)$"),
    academic_year_id: Optional[int] = None,
    institution_id: Optional[int] = None,
    standard_id: Optional[int] = None,
    division_id: Optional[int] = None,
    student_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    funding_source: Optional[str] = None,
    benefit_type: Optional[str] = None,
    search: Optional[str] = None,
    data_env: str = Depends(get_data_environment),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*REPORT_STAFF_ROLES)),
):
    can_rep = await has_permission(db, current_user, "concessions", "reports")
    if not can_rep and current_user.role not in ("superadmin", "admin", "accountant", "principal"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions: requires 'concessions:reports' privilege.",
        )
    if report_id not in CONCESSION_REPORT_DEFINITIONS:
        raise HTTPException(status_code=404, detail=f"Unknown concession report '{report_id}'")

    if institution_id is not None:
        check_institution_access(institution_id, current_user)
    inst_id = institution_id or await resolve_report_institution_id(db, current_user, data_env)
    is_demo_filter = True if data_env == "TRAINING" else (False if data_env == "PRODUCTION" else None)

    flt = FinancialFilter(
        institution_id=inst_id,
        academic_year_id=academic_year_id,
        standard_id=standard_id,
        division_id=division_id,
        student_id=student_id,
        start_date=start_date,
        end_date=end_date,
        search=search,
        status=status_filter if status_filter != "all" else None,
        funding_source=funding_source if funding_source != "all" else None,
        benefit_type=benefit_type if benefit_type != "all" else None,
        is_demo=is_demo_filter,
    )
    report_data = await FinancialGovernanceService.generate_concession_report(db, report_id, flt)
    ts = datetime.now().strftime("%Y%m%d")

    if format == "csv":
        content = FinancialGovernanceService.export_report_csv(report_data)
        return StreamingResponse(
            io.BytesIO(content),
            media_type="text/csv; charset=utf-8",
            headers={"Content-Disposition": f'attachment; filename="{report_id}_{ts}.csv"'},
        )

    xlsx_bytes = FinancialGovernanceService.export_report_xlsx(report_data)
    return StreamingResponse(
        io.BytesIO(xlsx_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{report_id}_{ts}.xlsx"'},
    )


@router.get("/eduboard-summary")
async def get_eduboard_summary_report(
    academic_year_id: Optional[int] = None,
    institution_id: int = Depends(enforce_institution_access),
    data_env: str = Depends(get_data_environment),
    current_user: User = Depends(require_role(*REPORT_STAFF_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    """Classroom EduBoard adoption, publication, and PDF export analytics summary."""
    from app.services.eduboard_service import EduBoardService

    await EduBoardService.require_permission_or_403(db, current_user, "view")
    return await EduBoardService.get_reports_summary(
        db, institution_id, data_env, academic_year_id=academic_year_id
    )


