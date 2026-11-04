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
#  * @updated     2026-11-04
#  *
#  * @description API endpoints for academic, attendance, faculty load, and fee collection reporting.
#  */

from fastapi import APIRouter, Depends, Response, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from typing import Optional
import io
import csv
from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.models.payment import Payment
from app.models.fee import FeeInvoice
from app.models.student import Student
from app.models.division import Division
from app.models.standard import Standard
from app.models.board import Board
from app.models.enrollment import StudentEnrollment
from app.models.portal import TimetableEntry
from app.models.user import User

router = APIRouter()


@router.get("/fee-collection")
async def fee_collection_report(
    academic_year_id: Optional[int] = None,
    institution_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
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

    if academic_year_id:
        query = query.where(FeeInvoice.academic_year_id == academic_year_id)
    if institution_id:
        query = query.where(Student.institution_id == institution_id)

    result = await db.execute(query)
    rows = result.all()

    return [
        {
            "admission_number": r.admission_number,
            "student_name": f"{r.first_name} {r.last_name}",
            "total_fees": float(r.total_fees),
            "paid": float(r.paid),
            "outstanding": float(r.outstanding),
        }
        for r in rows
    ]


@router.get("/fee-collection/export")
async def export_fee_collection(
    format: str = "csv",
    academic_year_id: Optional[int] = None,
    institution_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    data = await fee_collection_report(
        academic_year_id=academic_year_id,
        institution_id=institution_id,
        db=db,
        current_user=current_user,
    )

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
        writer.writerows(data)
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
        headers = [
            "Admission No.",
            "Student Name",
            "Total Fees",
            "Paid",
            "Outstanding",
        ]
        ws.append(headers)
        for row in data:
            ws.append(
                [
                    row["admission_number"],
                    row["student_name"],
                    row["total_fees"],
                    row["paid"],
                    row["outstanding"],
                ]
            )
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
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    query = select(FeeInvoice, Student).join(
        Student, FeeInvoice.student_id == Student.id
    ).where(FeeInvoice.outstanding_amount > 0)
    
    if academic_year_id:
        query = query.where(FeeInvoice.academic_year_id == academic_year_id)
    if institution_id:
        query = query.where(Student.institution_id == institution_id)
    
    result = await db.execute(query)
    rows = result.all()
    return [
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


@router.get("/payments-summary")
async def payments_summary(
    academic_year_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    query = select(
        Payment.payment_method,
        func.count(Payment.id).label("count"),
        func.coalesce(func.sum(Payment.amount), 0).label("total"),
    ).where(Payment.status == "completed")

    if academic_year_id:
        query = query.where(Payment.academic_year_id == academic_year_id)

    query = query.group_by(Payment.payment_method)
    result = await db.execute(query)
    rows = result.all()
    return [
        {
            "payment_method": r.payment_method,
            "count": r.count,
            "total": float(r.total),
        }
        for r in rows
    ]


# ─── Academic Reports ──────────────────────────────────────────────────────────

@router.get("/academic/batch-capacity")
async def batch_capacity_report(
    academic_year_id: Optional[int] = Query(None),
    board_id: Optional[int] = Query(None),
    standard_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    query = (
        select(Division, Standard, Board, User)
        .join(Standard, Division.standard_id == Standard.id)
        .outerjoin(Board, Division.board_id == Board.id)
        .outerjoin(User, Division.class_teacher_id == User.id)
        .where(Division.is_active == True)
    )

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
    current_user=Depends(get_current_active_user),
):
    boards = (await db.execute(select(Board).where(Board.is_active == True).order_by(Board.name))).scalars().all()
    standards = (await db.execute(select(Standard).where(Standard.is_active == True).order_by(Standard.level))).scalars().all()

    # Enrolled count by board and standard
    enr_stmt = (
        select(Division.board_id, Division.standard_id, func.count(StudentEnrollment.id))
        .join(StudentEnrollment, Division.id == StudentEnrollment.division_id)
        .where(StudentEnrollment.status == "active")
        .group_by(Division.board_id, Division.standard_id)
    )
    enr_rows = (await db.execute(enr_stmt)).all()
    enr_map = {(b_id, s_id): cnt for b_id, s_id, cnt in enr_rows}

    # Batch count and total capacity by board and standard
    div_stmt = (
        select(Division.board_id, Division.standard_id, func.count(Division.id), func.sum(Division.capacity))
        .where(Division.is_active == True)
        .group_by(Division.board_id, Division.standard_id)
    )
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
    current_user=Depends(get_current_active_user),
):
    users = (
        await db.execute(
            select(User).where(User.role.in_(["teacher", "faculty", "staff", "admin"]), User.is_active == True)
        )
    ).scalars().all()

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
    current_user=Depends(get_current_active_user),
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

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


