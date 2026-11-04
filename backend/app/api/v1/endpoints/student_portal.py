# /**
#  * @file        student_portal.py
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
#  * @created     2026-11-04
#  * @updated     2026-11-04
#  *
#  * @description API endpoints dedicated to authenticated student dashboard views, timetables, and grades.
#  */

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc, case
from sqlalchemy.orm import selectinload
from typing import Optional, List, Dict, Any
from datetime import date, datetime
from pydantic import BaseModel

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.models.user import User
from app.models.student import Student, Guardian
from app.models.enrollment import StudentEnrollment
from app.models.standard import Standard
from app.models.division import Division
from app.models.board import Board
from app.models.subject import Subject
from app.models.academic_year import AcademicYear
from app.models.attendance import Attendance
from app.models.exam import Examination, ExamMark
from app.models.fee import FeeInvoice, FeeInvoiceItem, FeeInstallment, StudentFeeAssignment
from app.models.payment import Payment, PaymentAllocation, PaymentReceipt
from app.models.portal import TimetableEntry, StudyMaterial, Announcement, StudentDocument

router = APIRouter()


class StudentProfileUpdate(BaseModel):
    phone: Optional[str] = None
    email: Optional[str] = None
    blood_group: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None


async def get_effective_student(
    db: AsyncSession,
    current_user: User,
    requested_student_id: Optional[int] = None,
) -> Student:
    """
    Enforces student isolation:
    - If user is role 'student', strictly binds to user.student_id.
    - If user is admin/teacher/staff, allows viewing a requested student_id
      or defaults to the first active student.
    """
    if current_user.role == "student":
        if not current_user.student_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No student profile is linked to this student account.",
            )
        target_id = current_user.student_id
    else:
        if requested_student_id:
            target_id = requested_student_id
        else:
            first_student_stmt = select(Student.id).where(Student.is_active == True).order_by(Student.id).limit(1)
            first_id = (await db.execute(first_student_stmt)).scalar()
            if not first_id:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="No active students found in system.",
                )
            target_id = first_id

    result = await db.execute(
        select(Student)
        .options(
            selectinload(Student.guardians),
            selectinload(Student.enrollments),
            selectinload(Student.documents),
        )
        .where(Student.id == target_id)
    )
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student ID {target_id} not found.",
        )
    return student


@router.get("/dashboard")
async def get_student_dashboard(
    student_id: Optional[int] = Query(None, description="Admin student switcher ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    student = await get_effective_student(db, current_user, student_id)

    # 1. Active enrollment with Standard, Division, Board
    enrollment_stmt = (
        select(StudentEnrollment, Standard, Division, Board, AcademicYear)
        .join(Standard, StudentEnrollment.standard_id == Standard.id)
        .outerjoin(Division, StudentEnrollment.division_id == Division.id)
        .outerjoin(Board, Division.board_id == Board.id)
        .join(AcademicYear, StudentEnrollment.academic_year_id == AcademicYear.id)
        .where(StudentEnrollment.student_id == student.id)
        .order_by(StudentEnrollment.id.desc())
    )
    enrollment_res = (await db.execute(enrollment_stmt)).first()

    active_enrollment = None
    division_id = None
    standard_id = None
    if enrollment_res:
        enr, std, div, brd, ay = enrollment_res
        division_id = div.id if div else None
        standard_id = std.id if std else None
        active_enrollment = {
            "id": enr.id,
            "roll_number": enr.roll_number or "N/A",
            "academic_year": ay.name,
            "standard_name": std.name,
            "standard_level": std.level,
            "division_name": div.name if div else "Unassigned",
            "board_name": brd.name if brd else "General",
            "board_code": brd.code if brd else "GEN",
            "status": enr.status,
            "enrollment_date": str(enr.enrollment_date),
        }

    # 2. Upcoming Classes (Timetable)
    upcoming_classes = []
    if division_id:
        day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        today_name = day_names[date.today().weekday()]

        tt_stmt = (
            select(TimetableEntry, Subject)
            .join(Subject, TimetableEntry.subject_id == Subject.id)
            .where(
                and_(
                    TimetableEntry.division_id == division_id,
                    TimetableEntry.is_active == True,
                )
            )
            .order_by(
                case((TimetableEntry.day_of_week == today_name, 0), else_=1),
                TimetableEntry.start_time,
            )
            .limit(5)
        )
        tt_rows = (await db.execute(tt_stmt)).all()
        for tt, subj in tt_rows:
            upcoming_classes.append({
                "id": tt.id,
                "day_of_week": tt.day_of_week,
                "start_time": tt.start_time,
                "end_time": tt.end_time,
                "room_number": tt.room_number or "Room 101",
                "subject_name": subj.name,
                "subject_code": subj.code or "",
                "is_today": tt.day_of_week.lower() == today_name.lower(),
            })

    # 3. Attendance Summary
    att_stats_stmt = (
        select(
            func.count(Attendance.id).label("total_days"),
            func.count(case((Attendance.status == "present", 1))).label("present_days"),
            func.count(case((Attendance.status == "absent", 1))).label("absent_days"),
            func.count(case((Attendance.status == "late", 1))).label("late_days"),
        )
        .where(Attendance.student_id == student.id)
    )
    att_stats = (await db.execute(att_stats_stmt)).one()
    total_days = att_stats.total_days or 0
    present_days = att_stats.present_days or 0
    absent_days = att_stats.absent_days or 0
    late_days = att_stats.late_days or 0
    attendance_pct = round((present_days / total_days) * 100, 1) if total_days > 0 else 100.0

    attendance_summary = {
        "total_days": total_days,
        "present_days": present_days,
        "absent_days": absent_days,
        "late_days": late_days,
        "attendance_percentage": attendance_pct,
    }

    # 4. Fee Status
    fee_stmt = (
        select(
            func.coalesce(func.sum(FeeInvoice.net_amount), 0).label("total_fees"),
            func.coalesce(func.sum(FeeInvoice.paid_amount), 0).label("total_paid"),
            func.coalesce(func.sum(FeeInvoice.outstanding_amount), 0).label("outstanding"),
        )
        .where(FeeInvoice.student_id == student.id)
    )
    fee_row = (await db.execute(fee_stmt)).one()
    total_fee_val = float(fee_row.total_fees)
    paid_fee_val = float(fee_row.total_paid)
    outstanding_fee_val = float(fee_row.outstanding)

    fee_status_label = "Paid"
    if outstanding_fee_val > 0 and paid_fee_val > 0:
        fee_status_label = "Partially Paid"
    elif outstanding_fee_val > 0 and paid_fee_val == 0:
        fee_status_label = "Unpaid"

    fee_status = {
        "total_fees": total_fee_val,
        "paid_amount": paid_fee_val,
        "outstanding_balance": outstanding_fee_val,
        "status": fee_status_label,
        "collection_rate": round((paid_fee_val / total_fee_val) * 100, 1) if total_fee_val > 0 else 100.0,
    }

    # 5. Recent Results
    recent_marks_stmt = (
        select(ExamMark, Examination, Subject)
        .join(Examination, ExamMark.examination_id == Examination.id)
        .join(Subject, ExamMark.subject_id == Subject.id)
        .where(ExamMark.student_id == student.id)
        .order_by(desc(Examination.start_date), desc(ExamMark.id))
        .limit(5)
    )
    recent_marks = (await db.execute(recent_marks_stmt)).all()
    recent_results = []
    for mark, exam, subj in recent_marks:
        marks_obt = float(mark.marks_obtained) if mark.marks_obtained is not None else 0.0
        max_m = exam.max_marks or 100
        pct = round((marks_obt / max_m) * 100, 1) if max_m > 0 else 0.0
        recent_results.append({
            "id": mark.id,
            "exam_name": exam.name,
            "exam_type": exam.exam_type,
            "subject_name": subj.name,
            "marks_obtained": marks_obt,
            "max_marks": max_m,
            "percentage": pct,
            "grade": mark.grade or ("A+" if pct >= 90 else "A" if pct >= 80 else "B" if pct >= 70 else "C" if pct >= 50 else "D"),
            "remarks": mark.remarks or "Good performance",
            "is_absent": mark.is_absent,
            "exam_date": str(exam.start_date) if exam.start_date else None,
        })

    # 6. Announcements (pinned or recent)
    announcements_stmt = (
        select(Announcement)
        .where(
            or_(
                Announcement.institution_id == student.institution_id,
                Announcement.standard_id == standard_id,
                Announcement.division_id == division_id,
            )
        )
        .order_by(desc(Announcement.is_pinned), desc(Announcement.publish_date))
        .limit(4)
    )
    announcements_rows = (await db.execute(announcements_stmt)).scalars().all()
    announcements = [
        {
            "id": a.id,
            "title": a.title,
            "content": a.content,
            "category": a.category,
            "is_pinned": a.is_pinned,
            "publish_date": str(a.publish_date),
        }
        for a in announcements_rows
    ]

    # 7. Study Materials count
    study_materials_count = 0
    if standard_id:
        sm_count_stmt = select(func.count(StudyMaterial.id)).where(StudyMaterial.standard_id == standard_id)
        study_materials_count = (await db.execute(sm_count_stmt)).scalar() or 0

    # 8. Real enrolled subjects count (from enrolled standard IDs)
    enr_std_ids_stmt = select(StudentEnrollment.standard_id).where(StudentEnrollment.student_id == student.id)
    enr_std_ids = (await db.execute(enr_std_ids_stmt)).scalars().all()
    enrolled_subjects_count = 0
    if enr_std_ids:
        subj_count_stmt = select(func.count(Subject.id)).where(Subject.standard_id.in_(list(enr_std_ids)))
        enrolled_subjects_count = (await db.execute(subj_count_stmt)).scalar() or 0

    # 9. Real upcoming tests count (exams for enrolled standards with future start_date)
    upcoming_tests_count = 0
    if enr_std_ids:
        upcoming_tests_stmt = select(func.count(Examination.id)).where(
            and_(
                Examination.standard_id.in_(list(enr_std_ids)),
                Examination.is_active == True,
                Examination.start_date >= date.today(),
            )
        )
        upcoming_tests_count = (await db.execute(upcoming_tests_stmt)).scalar() or 0

    return {
        "student": {
            "id": student.id,
            "admission_number": student.admission_number,
            "first_name": student.first_name,
            "last_name": student.last_name,
            "full_name": f"{student.first_name} {student.last_name}",
            "gender": student.gender,
            "phone": student.phone or "N/A",
            "email": student.email or "N/A",
            "photo_url": student.photo_url,
            "is_active": student.is_active,
        },
        "active_enrollment": active_enrollment,
        "upcoming_classes": upcoming_classes,
        "attendance_summary": attendance_summary,
        "fee_status": fee_status,
        "recent_results": recent_results,
        "announcements": announcements,
        "stats": {
            "enrolled_subjects_count": enrolled_subjects_count,
            "study_materials_count": study_materials_count,
            "upcoming_tests_count": upcoming_tests_count,
            "attendance_rate": attendance_pct,
        },
        "viewer": {
            "user_id": current_user.id,
            "user_role": current_user.role,
            "is_student_user": current_user.role == "student",
        },
    }


@router.get("/classes")
async def get_student_classes(
    student_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    student = await get_effective_student(db, current_user, student_id)

    # Enrollments
    enrollment_stmt = (
        select(StudentEnrollment, Standard, Division, Board, AcademicYear)
        .join(Standard, StudentEnrollment.standard_id == Standard.id)
        .outerjoin(Division, StudentEnrollment.division_id == Division.id)
        .outerjoin(Board, Division.board_id == Board.id)
        .join(AcademicYear, StudentEnrollment.academic_year_id == AcademicYear.id)
        .where(StudentEnrollment.student_id == student.id)
        .order_by(desc(StudentEnrollment.id))
    )
    enrollments_data = []
    enrolled_standard_ids = set()
    rows = (await db.execute(enrollment_stmt)).all()
    for enr, std, div, brd, ay in rows:
        enrolled_standard_ids.add(std.id)
        enrollments_data.append({
            "id": enr.id,
            "roll_number": enr.roll_number or "N/A",
            "academic_year": ay.name,
            "standard_id": std.id,
            "standard_name": std.name,
            "standard_level": std.level,
            "division_id": div.id if div else None,
            "division_name": div.name if div else "Unassigned",
            "board_id": brd.id if brd else None,
            "board_name": brd.name if brd else "General Board",
            "board_code": brd.code if brd else "GEN",
            "status": enr.status,
            "enrollment_date": str(enr.enrollment_date),
            "remarks": enr.remarks,
        })

    # Subjects for enrolled standards
    subjects_data = []
    if enrolled_standard_ids:
        subj_stmt = (
            select(Subject)
            .where(Subject.standard_id.in_(list(enrolled_standard_ids)))
            .order_by(Subject.name)
        )
        subj_rows = (await db.execute(subj_stmt)).scalars().all()
        subjects_data = [
            {
                "id": s.id,
                "name": s.name,
                "code": s.code,
                "standard_id": s.standard_id,
                "max_marks": s.max_marks,
                "pass_marks": s.pass_marks,
                "is_optional": s.is_optional,
            }
            for s in subj_rows
        ]

    return {
        "student_id": student.id,
        "enrollments": enrollments_data,
        "subjects": subjects_data,
    }


@router.get("/timetable")
async def get_student_timetable(
    student_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    student = await get_effective_student(db, current_user, student_id)

    # Find student's division
    enr_stmt = (
        select(StudentEnrollment.division_id, Division.name)
        .outerjoin(Division, StudentEnrollment.division_id == Division.id)
        .where(
            and_(
                StudentEnrollment.student_id == student.id,
                StudentEnrollment.status == "active",
            )
        )
        .order_by(StudentEnrollment.id.desc())
    )
    enr_row = (await db.execute(enr_stmt)).first()
    division_id = enr_row[0] if enr_row else None
    batch_name = enr_row[1] if enr_row else "Default Batch"

    timetable = []
    if division_id:
        tt_stmt = (
            select(TimetableEntry, Subject)
            .join(Subject, TimetableEntry.subject_id == Subject.id)
            .where(
                and_(
                    TimetableEntry.division_id == division_id,
                    TimetableEntry.is_active == True,
                )
            )
            .order_by(TimetableEntry.day_of_week, TimetableEntry.start_time)
        )
        tt_rows = (await db.execute(tt_stmt)).all()
        for tt, subj in tt_rows:
            timetable.append({
                "id": tt.id,
                "day_of_week": tt.day_of_week,
                "start_time": tt.start_time,
                "end_time": tt.end_time,
                "room_number": tt.room_number or "Room 101",
                "subject_id": subj.id,
                "subject_name": subj.name,
                "subject_code": subj.code or "",
                "is_active": tt.is_active,
            })

    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    grouped_by_day = {d: [] for d in days}
    for item in timetable:
        day = item["day_of_week"]
        if day in grouped_by_day:
            grouped_by_day[day].append(item)
        else:
            grouped_by_day.setdefault(day, []).append(item)

    return {
        "student_id": student.id,
        "division_id": division_id,
        "batch_name": batch_name,
        "timetable": timetable,
        "grouped_by_day": grouped_by_day,
    }


@router.get("/attendance")
async def get_student_attendance(
    student_id: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
    year: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    student = await get_effective_student(db, current_user, student_id)

    query = select(Attendance).where(Attendance.student_id == student.id)
    if year:
        query = query.where(func.extract("year", Attendance.date) == year)
    if month:
        query = query.where(func.extract("month", Attendance.date) == month)

    query = query.order_by(desc(Attendance.date))
    records_rows = (await db.execute(query)).scalars().all()

    # Total counts
    all_att_stmt = (
        select(
            func.count(Attendance.id).label("total"),
            func.count(case((Attendance.status == "present", 1))).label("present"),
            func.count(case((Attendance.status == "absent", 1))).label("absent"),
            func.count(case((Attendance.status == "late", 1))).label("late"),
        )
        .where(Attendance.student_id == student.id)
    )
    stats = (await db.execute(all_att_stmt)).one()
    total = stats.total or 0
    present = stats.present or 0
    absent = stats.absent or 0
    late = stats.late or 0
    pct = round((present / total) * 100, 1) if total > 0 else 100.0

    return {
        "summary": {
            "total_days": total,
            "present_days": present,
            "absent_days": absent,
            "late_days": late,
            "attendance_percentage": pct,
        },
        "records": [
            {
                "id": r.id,
                "date": str(r.date),
                "status": r.status,
                "remarks": r.remarks or "",
            }
            for r in records_rows
        ],
    }


@router.get("/tests")
async def get_student_tests(
    student_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    student = await get_effective_student(db, current_user, student_id)

    # 1. Upcoming tests
    enr_stmt = select(StudentEnrollment.standard_id).where(StudentEnrollment.student_id == student.id)
    std_ids = (await db.execute(enr_stmt)).scalars().all()

    upcoming_tests = []
    if std_ids:
        exams_stmt = (
            select(Examination)
            .where(
                and_(
                    Examination.standard_id.in_(std_ids),
                    Examination.is_active == True,
                )
            )
            .order_by(Examination.start_date)
        )
        exam_rows = (await db.execute(exams_stmt)).scalars().all()
        upcoming_tests = [
            {
                "id": ex.id,
                "name": ex.name,
                "exam_type": ex.exam_type,
                "start_date": str(ex.start_date) if ex.start_date else None,
                "end_date": str(ex.end_date) if ex.end_date else None,
                "max_marks": ex.max_marks,
                "passing_marks": ex.passing_marks,
            }
            for ex in exam_rows
        ]

    # 2. Results history
    marks_stmt = (
        select(ExamMark, Examination, Subject)
        .join(Examination, ExamMark.examination_id == Examination.id)
        .join(Subject, ExamMark.subject_id == Subject.id)
        .where(ExamMark.student_id == student.id)
        .order_by(desc(Examination.start_date), Subject.name)
    )
    marks_rows = (await db.execute(marks_stmt)).all()
    results = []
    for mark, exam, subj in marks_rows:
        obt = float(mark.marks_obtained) if mark.marks_obtained is not None else 0.0
        max_m = exam.max_marks or 100
        pct = round((obt / max_m) * 100, 1) if max_m > 0 else 0.0
        results.append({
            "id": mark.id,
            "exam_id": exam.id,
            "exam_name": exam.name,
            "exam_type": exam.exam_type,
            "exam_date": str(exam.start_date) if exam.start_date else None,
            "subject_id": subj.id,
            "subject_name": subj.name,
            "marks_obtained": obt,
            "max_marks": max_m,
            "percentage": pct,
            "grade": mark.grade or ("A+" if pct >= 90 else "A" if pct >= 80 else "B" if pct >= 70 else "C" if pct >= 50 else "D"),
            "remarks": mark.remarks or "Completed",
            "is_absent": mark.is_absent,
        })

    return {
        "student_id": student.id,
        "upcoming_tests": upcoming_tests,
        "results": results,
    }


@router.get("/fees")
async def get_student_fees(
    student_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    student = await get_effective_student(db, current_user, student_id)

    # Invoices
    inv_stmt = (
        select(FeeInvoice)
        .options(
            selectinload(FeeInvoice.items),
            selectinload(FeeInvoice.installments),
        )
        .where(FeeInvoice.student_id == student.id)
        .order_by(desc(FeeInvoice.id))
    )
    invoices = (await db.execute(inv_stmt)).scalars().all()

    # Payments with receipts
    pmt_stmt = (
        select(Payment)
        .options(
            selectinload(Payment.receipt),
            selectinload(Payment.allocations),
        )
        .where(Payment.student_id == student.id)
        .order_by(desc(Payment.payment_date), desc(Payment.id))
    )
    payments = (await db.execute(pmt_stmt)).scalars().all()

    total_fees = sum(float(inv.net_amount) for inv in invoices)
    total_paid = sum(float(p.amount) for p in payments if p.status == "completed")
    outstanding = max(0.0, total_fees - total_paid)

    status_str = "Paid" if outstanding <= 0 and total_fees > 0 else "Partially Paid" if total_paid > 0 else "Unpaid"

    return {
        "student_id": student.id,
        "summary": {
            "total_fees": total_fees,
            "paid_amount": total_paid,
            "outstanding_balance": outstanding,
            "status": status_str,
            "collection_percentage": round((total_paid / total_fees) * 100, 1) if total_fees > 0 else 100.0,
        },
        "invoices": [
            {
                "id": inv.id,
                "invoice_number": inv.invoice_number,
                "issue_date": str(inv.issue_date),
                "due_date": str(inv.due_date) if inv.due_date else None,
                "total_amount": float(inv.total_amount),
                "discount_amount": float(inv.discount_amount),
                "net_amount": float(inv.net_amount),
                "paid_amount": float(inv.paid_amount),
                "outstanding_amount": float(inv.outstanding_amount),
                "status": inv.status,
                "notes": inv.notes,
                "items": [
                    {
                        "id": it.id,
                        "description": it.description,
                        "amount": float(it.amount),
                    }
                    for it in inv.items
                ],
                "installments": [
                    {
                        "id": inst.id,
                        "installment_number": inst.installment_number,
                        "due_date": str(inst.due_date),
                        "amount": float(inst.amount),
                        "paid_amount": float(inst.paid_amount),
                        "status": inst.status,
                    }
                    for inst in inv.installments
                ],
            }
            for inv in invoices
        ],
        "payments": [
            {
                "id": p.id,
                "receipt_number": p.receipt.receipt_number if p.receipt else f"REC-{p.id}",
                "payment_date": str(p.payment_date),
                "amount": float(p.amount),
                "payment_method": p.payment_method,
                "transaction_reference": p.transaction_reference or "N/A",
                "notes": p.notes or "",
                "status": p.status,
            }
            for p in payments
        ],
    }


@router.get("/study-materials")
async def get_student_study_materials(
    student_id: Optional[int] = Query(None),
    subject_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    student = await get_effective_student(db, current_user, student_id)

    # Student's enrolled standards
    enr_stmt = select(StudentEnrollment.standard_id).where(StudentEnrollment.student_id == student.id)
    std_ids = (await db.execute(enr_stmt)).scalars().all()

    query = (
        select(StudyMaterial, Subject, Standard)
        .join(Subject, StudyMaterial.subject_id == Subject.id)
        .join(Standard, StudyMaterial.standard_id == Standard.id)
    )
    if std_ids:
        query = query.where(StudyMaterial.standard_id.in_(std_ids))
    if subject_id:
        query = query.where(StudyMaterial.subject_id == subject_id)

    query = query.order_by(desc(StudyMaterial.created_at))
    rows = (await db.execute(query)).all()

    materials = []
    for sm, subj, std in rows:
        materials.append({
            "id": sm.id,
            "title": sm.title,
            "description": sm.description or "",
            "file_type": sm.file_type,
            "file_url": sm.file_url,
            "file_size_bytes": sm.file_size_bytes,
            "subject_id": subj.id,
            "subject_name": subj.name,
            "standard_name": std.name,
            "created_at": str(sm.created_at),
        })

    return {
        "student_id": student.id,
        "materials": materials,
    }


@router.get("/profile")
async def get_student_profile(
    student_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    student = await get_effective_student(db, current_user, student_id)

    # Guardians
    guardians = [
        {
            "id": g.id,
            "relation": g.relation,
            "first_name": g.first_name,
            "last_name": g.last_name,
            "phone": g.phone,
            "email": g.email,
            "occupation": g.occupation,
            "is_primary": g.is_primary,
        }
        for g in student.guardians
    ]

    # Documents
    documents = [
        {
            "id": d.id,
            "title": d.title,
            "document_type": d.document_type,
            "file_url": d.file_url,
            "status": d.status,
            "uploaded_at": str(d.uploaded_at),
        }
        for d in student.documents
    ]

    # Enrollments
    enr_stmt = (
        select(StudentEnrollment, Standard, Division, Board, AcademicYear)
        .join(Standard, StudentEnrollment.standard_id == Standard.id)
        .outerjoin(Division, StudentEnrollment.division_id == Division.id)
        .outerjoin(Board, Division.board_id == Board.id)
        .join(AcademicYear, StudentEnrollment.academic_year_id == AcademicYear.id)
        .where(StudentEnrollment.student_id == student.id)
        .order_by(desc(StudentEnrollment.id))
    )
    enr_rows = (await db.execute(enr_stmt)).all()
    enrollments = [
        {
            "id": e.id,
            "academic_year": ay.name,
            "standard_name": std.name,
            "division_name": div.name if div else "Unassigned",
            "board_name": brd.name if brd else "General Board",
            "roll_number": e.roll_number or "N/A",
            "status": e.status,
            "enrollment_date": str(e.enrollment_date),
        }
        for e, std, div, brd, ay in enr_rows
    ]

    return {
        "student": {
            "id": student.id,
            "admission_number": student.admission_number,
            "first_name": student.first_name,
            "last_name": student.last_name,
            "middle_name": student.middle_name,
            "full_name": f"{student.first_name} {student.last_name}",
            "gender": student.gender,
            "date_of_birth": str(student.date_of_birth),
            "blood_group": student.blood_group,
            "nationality": student.nationality,
            "religion": student.religion,
            "caste": student.caste,
            "aadhar_number": student.aadhar_number,
            "phone": student.phone,
            "email": student.email,
            "address": student.address,
            "city": student.city,
            "state": student.state,
            "pincode": student.pincode,
            "admission_date": str(student.admission_date),
            "photo_url": student.photo_url,
            "is_active": student.is_active,
        },
        "guardians": guardians,
        "documents": documents,
        "enrollments": enrollments,
    }


@router.put("/profile")
async def update_student_portal_profile(
    data: StudentProfileUpdate,
    student_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    student = await get_effective_student(db, current_user, student_id)

    # Permit updating non-critical personal contact fields only
    update_data = data.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        if hasattr(student, field):
            setattr(student, field, val)

    await db.commit()
    await db.refresh(student)

    return {
        "message": "Student profile updated successfully.",
        "student": {
            "id": student.id,
            "phone": student.phone,
            "email": student.email,
            "blood_group": student.blood_group,
            "address": student.address,
            "city": student.city,
            "state": student.state,
            "pincode": student.pincode,
        },
    }

