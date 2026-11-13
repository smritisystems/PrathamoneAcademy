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
#  * @updated     2026-11-13
#  *
#  * @description API endpoints dedicated to authenticated student dashboard views, digital homework, attendance calendar, and report cards.
#  */

import calendar
import json
import uuid
from decimal import Decimal
from datetime import date, datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc, case
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.deps import get_current_active_user, check_institution_access, is_sysadmin
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
from app.models.homework import HomeworkAssignment, StudentHomeworkRecord, HomeworkAuditLog
from app.models.institution import Institution
from app.services.exam_reports import get_student_report_card, GRADING_SCALES
from app.models.fee import (
    FeeInvoice,
    FeeInvoiceItem,
    FeeInstallment,
    StudentFeeAssignment,
    FeeConcessionType,
    StudentConcessionApplication,
    FeeConcessionAllocation,
)
from app.models.payment import Payment, PaymentAllocation, PaymentReceipt, Refund
from app.services.financial_governance_service import FinancialGovernanceService, FinancialFilter
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


class HomeworkSubmissionPayload(BaseModel):
    submission_text: Optional[str] = None
    submission_file_url: Optional[str] = None
    submission_files: Optional[List[Dict[str, Any]]] = None


class StudentOnlinePaymentPayload(BaseModel):
    invoice_id: int
    amount: float
    payment_method: str = "online_upi"
    transaction_reference: Optional[str] = None
    notes: Optional[str] = None


PORTAL_STAFF_ROLES = {
    "superadmin",
    "sysadmin",
    "super_admin",
    "admin",
    "principal",
    "teacher",
    "staff",
    "coordinator",
    "counselor",
    "counsellor",
    "accountant",
}


async def get_effective_student(
    db: AsyncSession,
    current_user: User,
    requested_student_id: Optional[int] = None,
) -> Student:
    """
    Enforces student isolation and multi-tenant scoping:
    - If user is role 'student', strictly binds to user.student_id.
    - If user is authorized staff, validates requested_student_id belongs to
      current_user.institution_id (unless sysadmin) or defaults within that tenant.
    """
    role = (getattr(current_user, "role", "") or "").strip().lower()
    if role == "student":
        if not current_user.student_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No student profile is linked to this student account.",
            )
        target_id = current_user.student_id
    else:
        if not is_sysadmin(current_user) and role not in PORTAL_STAFF_ROLES:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to access student portal.",
            )
        if requested_student_id:
            target_id = requested_student_id
        else:
            first_student_stmt = select(Student.id).where(Student.is_active == True)
            if not is_sysadmin(current_user) and getattr(current_user, "institution_id", None):
                first_student_stmt = first_student_stmt.where(
                    Student.institution_id == current_user.institution_id
                )
            first_student_stmt = first_student_stmt.order_by(Student.id).limit(1)
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
    check_institution_access(student.institution_id, current_user)
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
            .where(Subject.standard_id.in_(list(enrolled_standard_ids)), Subject.is_active == True)
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

    today = date.today()
    sel_year = year or today.year
    sel_month = month or today.month

    # All-time statistics
    all_att_stmt = (
        select(
            func.count(Attendance.id).label("total"),
            func.count(case((Attendance.status == "present", 1))).label("present"),
            func.count(case((Attendance.status == "absent", 1))).label("absent"),
            func.count(case((Attendance.status == "late", 1))).label("late"),
            func.count(case((Attendance.status == "excused", 1))).label("excused"),
        )
        .where(Attendance.student_id == student.id)
    )
    stats = (await db.execute(all_att_stmt)).one()
    total = stats.total or 0
    present = stats.present or 0
    absent = stats.absent or 0
    late = stats.late or 0
    excused = stats.excused or 0
    pct = round((present / total) * 100, 1) if total > 0 else 100.0

    # Query records for selected month
    month_query = (
        select(Attendance)
        .where(
            Attendance.student_id == student.id,
            func.extract("year", Attendance.date) == sel_year,
            func.extract("month", Attendance.date) == sel_month,
        )
        .order_by(Attendance.date.asc())
    )
    month_records = (await db.execute(month_query)).scalars().all()
    record_map = {r.date.day: r for r in month_records}

    # Build monthly calendar days
    _, num_days = calendar.monthrange(sel_year, sel_month)
    weekday_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    calendar_days = []
    month_present = 0
    month_absent = 0
    month_late = 0
    month_excused = 0

    for day_num in range(1, num_days + 1):
        cur_date = date(sel_year, sel_month, day_num)
        wkday = cur_date.weekday()
        day_rec = record_map.get(day_num)

        if day_rec:
            st = day_rec.status.lower()
            rem = day_rec.remarks or ("Present" if st == "present" else "Absent" if st == "absent" else st.capitalize())
            if st == "present":
                month_present += 1
            elif st == "absent":
                month_absent += 1
            elif st == "late":
                month_late += 1
            elif st == "excused":
                month_excused += 1
        elif wkday == 6:
            st = "weekend"
            rem = "Sunday Holiday"
        elif cur_date > today:
            st = "upcoming"
            rem = "Scheduled Session"
        else:
            st = "holiday" if wkday == 5 else "not_marked"
            rem = "Institute Holiday" if wkday == 5 else "Session Completed"

        calendar_days.append({
            "day": day_num,
            "date": str(cur_date),
            "day_name": weekday_names[wkday],
            "is_weekend": wkday in (5, 6),
            "status": st,
            "remarks": rem,
        })

    month_total_working = month_present + month_absent + month_late + month_excused
    month_pct = round((month_present / month_total_working) * 100, 1) if month_total_working > 0 else 100.0

    # Absentee log: absences for student with remarks and acknowledgement
    abs_stmt = (
        select(Attendance)
        .where(Attendance.student_id == student.id, Attendance.status == "absent")
        .order_by(desc(Attendance.date))
        .limit(30)
    )
    abs_records = (await db.execute(abs_stmt)).scalars().all()
    absentee_log = [
        {
            "id": r.id,
            "date": str(r.date),
            "status": "absent",
            "remarks": r.remarks or "Absent without leave",
            "parent_acknowledged": True,
        }
        for r in abs_records
    ]

    # All records for the raw table (prefer month if available, else recent)
    all_fallback = (
        select(Attendance)
        .where(Attendance.student_id == student.id)
        .order_by(desc(Attendance.date))
        .limit(50)
    )
    all_recs = month_records if month_records else (await db.execute(all_fallback)).scalars().all()

    return {
        "summary": {
            "total_days": total,
            "present_days": present,
            "absent_days": absent,
            "late_days": late,
            "excused_days": excused,
            "attendance_percentage": pct,
            "monthly_present": month_present,
            "monthly_absent": month_absent,
            "monthly_late": month_late,
            "monthly_excused": month_excused,
            "monthly_working_days": month_total_working,
            "monthly_percentage": month_pct,
        },
        "month": sel_month,
        "year": sel_year,
        "month_name": calendar.month_name[sel_month],
        "calendar_days": calendar_days,
        "absentee_log": absentee_log,
        "records": [
            {
                "id": r.id,
                "date": str(r.date),
                "status": r.status,
                "remarks": r.remarks or "",
            }
            for r in all_recs
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

    # Invoices (excluding cancelled)
    inv_stmt = (
        select(FeeInvoice)
        .options(
            selectinload(FeeInvoice.items),
        )
        .where(FeeInvoice.student_id == student.id, FeeInvoice.status != "cancelled")
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

    refunds_completed = float(
        (
            await db.execute(
                select(func.coalesce(func.sum(Refund.amount), 0)).where(
                    Refund.student_id == student.id,
                    Refund.status == "completed",
                )
            )
        ).scalar()
        or 0.0
    )

    original_fee = sum(float(inv.total_amount) for inv in invoices)
    total_fees = sum(float(inv.net_amount) for inv in invoices)
    gross_paid = sum(float(p.amount) for p in payments if p.status in ("completed", "posted"))
    total_paid = max(0.0, gross_paid - refunds_completed)
    outstanding = sum(float(inv.outstanding_amount) for inv in invoices if inv.status != "written_off")

    conc_rows = (
        await db.execute(
            select(StudentConcessionApplication, FeeConcessionType)
            .join(FeeConcessionType, StudentConcessionApplication.concession_type_id == FeeConcessionType.id)
            .options(selectinload(StudentConcessionApplication.allocations))
            .where(StudentConcessionApplication.student_id == student.id)
            .order_by(desc(StudentConcessionApplication.id))
        )
    ).all()

    benefits = []
    waiver_history = []
    approval_history = []
    for c_app, c_type in conc_rows:
        item = {
            "id": c_app.id,
            "application_number": c_app.application_number,
            "concession_name": c_type.name,
            "concession_type_code": c_type.code,
            "category": c_type.category,
            "benefit_type": c_app.benefit_type or getattr(c_type, "benefit_type", "fee_concession"),
            "waiver_scope": c_app.waiver_scope,
            "funding_source": c_app.funding_source,
            "sponsor_name": c_app.sponsor_name,
            "requested_amount": float(c_app.requested_amount),
            "approved_amount": float(c_app.approved_amount),
            "applied_amount": float(c_app.applied_amount),
            "reversed_amount": float(getattr(c_app, "reversed_amount", 0) or 0),
            "status": c_app.status,
            "valid_until": c_app.valid_until.isoformat() if getattr(c_app, "valid_until", None) else None,
            "approved_at": c_app.approved_at.isoformat() if c_app.approved_at else None,
            "remarks": c_app.approval_remarks or c_app.rejection_reason or c_app.withdrawal_reason or c_app.cancellation_reason,
            "allocations": [
                {
                    "id": al.id,
                    "transaction_ref": getattr(al, "transaction_ref", None),
                    "transaction_type": getattr(al, "transaction_type", None),
                    "posting_status": getattr(al, "posting_status", "posted"),
                    "allocated_amount": float(al.allocated_amount),
                    "effective_date": al.effective_date.isoformat() if getattr(al, "effective_date", None) else None,
                }
                for al in (c_app.allocations or [])
            ],
        }
        benefits.append(item)
        if item["benefit_type"] == "fee_waiver":
            waiver_history.append(item)
        approval_history.append(item)

    stu_gov = await FinancialGovernanceService.get_governed_summary(
        db,
        FinancialFilter(
            institution_id=student.institution_id,
            student_id=student.id,
            is_demo=None,
        ),
    )
    stu_fin = stu_gov["financials"]

    status_str = "Paid" if outstanding <= 0 and total_fees > 0 else "Partially Paid" if total_paid > 0 else "Unpaid"

    return {
        "student_id": student.id,
        "summary": {
            "original_fee": original_fee,
            "approved_benefits": stu_fin["approved_concessions_total"],
            "approved_unapplied": stu_fin["approved_unapplied"],
            "applied_concessions": stu_fin["posted_concessions_total"],
            "fee_waivers": stu_fin["posted_fee_waivers"],
            "scholarships": stu_fin["scholarships_awarded"],
            "sponsor_funding": stu_fin["sponsor_funded_scholarships"],
            "net_fee_payable": total_fees,
            "total_fees": total_fees,
            "gross_paid": gross_paid,
            "refunds_completed": refunds_completed,
            "paid_amount": total_paid,
            "outstanding_balance": outstanding,
            "status": status_str,
            "collection_percentage": round((total_paid / total_fees) * 100, 1) if total_fees > 0 else 100.0,
        },
        "governance": stu_gov,
        "benefits": benefits,
        "waiver_history": waiver_history,
        "approval_history": approval_history,
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

    # Class teacher details from division
    class_teacher_name = "Not Assigned"
    if enr_rows and enr_rows[0][2]:
        div_obj = enr_rows[0][2]
        if getattr(div_obj, "class_teacher_id", None):
            ct = await db.get(User, div_obj.class_teacher_id)
            if ct:
                class_teacher_name = f"{ct.first_name} {ct.last_name}"

    primary_guardian = next((g for g in guardians if g.get("is_primary")), guardians[0] if guardians else None)

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
            "class_teacher_name": class_teacher_name,
        },
        "guardians": guardians,
        "primary_guardian": primary_guardian,
        "emergency_contact": {
            "name": f"{primary_guardian['first_name']} {primary_guardian['last_name']}" if primary_guardian else "Academy Office",
            "relation": primary_guardian.get("relation", "Guardian") if primary_guardian else "Office",
            "phone": primary_guardian.get("phone", "9323 023 007") if primary_guardian else "9323 023 007",
        },
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


# ─── DIGITAL HOMEWORK SUBMISSION & REVIEW ──────────────────────────────────────

@router.get("/homework")
async def get_student_portal_homework(
    student_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Retrieves all homework assignments, submission states, grades, and teacher feedback for the student."""
    student = await get_effective_student(db, current_user, student_id)

    # Enrollments
    enr_stmt = (
        select(StudentEnrollment)
        .where(StudentEnrollment.student_id == student.id)
        .order_by(StudentEnrollment.id.desc())
    )
    enrollments = (await db.execute(enr_stmt)).scalars().all()
    standard_ids = [e.standard_id for e in enrollments if e.standard_id]
    division_ids = [e.division_id for e in enrollments if e.division_id]

    rec_stmt = (
        select(StudentHomeworkRecord, HomeworkAssignment, Subject, Standard, Division, User)
        .join(HomeworkAssignment, StudentHomeworkRecord.assignment_id == HomeworkAssignment.id)
        .join(Subject, HomeworkAssignment.subject_id == Subject.id)
        .join(Standard, HomeworkAssignment.standard_id == Standard.id)
        .outerjoin(Division, HomeworkAssignment.division_id == Division.id)
        .outerjoin(User, HomeworkAssignment.teacher_user_id == User.id)
        .where(StudentHomeworkRecord.student_id == student.id)
    )
    if status_filter:
        rec_stmt = rec_stmt.where(StudentHomeworkRecord.status == status_filter)
    rec_stmt = rec_stmt.order_by(desc(HomeworkAssignment.due_date), desc(StudentHomeworkRecord.id))

    rows = (await db.execute(rec_stmt)).all()
    items = []
    seen_assignment_ids = set()
    for rec, hw, subj, std, div, teacher in rows:
        seen_assignment_ids.add(hw.id)
        attachments = []
        if hw.attachments:
            try:
                attachments = json.loads(hw.attachments) if isinstance(hw.attachments, str) else hw.attachments
            except Exception:
                attachments = []
        sub_files = []
        if rec.submission_files:
            try:
                sub_files = json.loads(rec.submission_files) if isinstance(rec.submission_files, str) else rec.submission_files
            except Exception:
                sub_files = []

        items.append({
            "id": rec.id,
            "record_id": rec.id,
            "assignment_id": hw.id,
            "assignment_code": hw.assignment_code,
            "title": hw.title,
            "description": hw.description or "",
            "instructions": hw.instructions or "",
            "chapter": hw.chapter or "",
            "topic": hw.topic or "",
            "subject_id": subj.id,
            "subject_name": subj.name,
            "subject_code": subj.code or "",
            "standard_id": std.id,
            "standard_name": std.name,
            "division_id": div.id if div else None,
            "division_name": div.name if div else "All Batches",
            "teacher_id": teacher.id if teacher else None,
            "teacher_name": f"{teacher.first_name} {teacher.last_name}" if teacher else "Faculty",
            "assigned_date": str(hw.assigned_date),
            "due_date": str(rec.individual_due_date or hw.due_date),
            "due_time": rec.individual_due_time or hw.due_time or "23:59",
            "max_marks": float(hw.max_marks) if hw.max_marks else None,
            "difficulty_level": hw.difficulty_level,
            "priority": hw.priority,
            "assignment_type": hw.assignment_type,
            "submission_method": hw.submission_method,
            "allow_late_submissions": hw.allow_late_submissions,
            "allow_resubmission": hw.allow_resubmission,
            "status": rec.status,
            "submission_status": rec.submission_status,
            "submission_time": rec.submission_time.isoformat() if rec.submission_time else None,
            "submission_text": rec.submission_text or "",
            "submission_files": sub_files,
            "submission_version": rec.submission_version,
            "review_status": rec.review_status,
            "marks_obtained": float(rec.marks_obtained) if rec.marks_obtained is not None else None,
            "teacher_remarks": rec.teacher_remarks or "",
            "attachments": attachments,
        })

    # Auto-register untracked active homework for student cohort
    if standard_ids:
        hw_untracked_stmt = (
            select(HomeworkAssignment, Subject, Standard, Division, User)
            .join(Subject, HomeworkAssignment.subject_id == Subject.id)
            .join(Standard, HomeworkAssignment.standard_id == Standard.id)
            .outerjoin(Division, HomeworkAssignment.division_id == Division.id)
            .outerjoin(User, HomeworkAssignment.teacher_user_id == User.id)
            .where(
                and_(
                    HomeworkAssignment.standard_id.in_(standard_ids),
                    HomeworkAssignment.status == "published",
                    or_(
                        HomeworkAssignment.division_id.is_(None),
                        HomeworkAssignment.division_id.in_(division_ids) if division_ids else False,
                    ),
                )
            )
        )
        if seen_assignment_ids:
            hw_untracked_stmt = hw_untracked_stmt.where(~HomeworkAssignment.id.in_(list(seen_assignment_ids)))
        hw_untracked = (await db.execute(hw_untracked_stmt)).all()
        for hw, subj, std, div, teacher in hw_untracked:
            new_rec = StudentHomeworkRecord(
                institution_id=student.institution_id or 1,
                assignment_id=hw.id,
                student_id=student.id,
                enrollment_id=enrollments[0].id if enrollments else None,
                division_id=div.id if div else (enrollments[0].division_id if enrollments else None),
                status="assigned",
                submission_status="pending",
                review_status="pending",
                submission_version=0,
            )
            db.add(new_rec)
            await db.flush()
            items.append({
                "id": new_rec.id,
                "record_id": new_rec.id,
                "assignment_id": hw.id,
                "assignment_code": hw.assignment_code,
                "title": hw.title,
                "description": hw.description or "",
                "instructions": hw.instructions or "",
                "chapter": hw.chapter or "",
                "topic": hw.topic or "",
                "subject_id": subj.id,
                "subject_name": subj.name,
                "subject_code": subj.code or "",
                "standard_id": std.id,
                "standard_name": std.name,
                "division_id": div.id if div else None,
                "division_name": div.name if div else "All Batches",
                "teacher_id": teacher.id if teacher else None,
                "teacher_name": f"{teacher.first_name} {teacher.last_name}" if teacher else "Faculty",
                "assigned_date": str(hw.assigned_date),
                "due_date": str(hw.due_date),
                "due_time": hw.due_time or "23:59",
                "max_marks": float(hw.max_marks) if hw.max_marks else None,
                "difficulty_level": hw.difficulty_level,
                "priority": hw.priority,
                "assignment_type": hw.assignment_type,
                "submission_method": hw.submission_method,
                "allow_late_submissions": hw.allow_late_submissions,
                "allow_resubmission": hw.allow_resubmission,
                "status": "assigned",
                "submission_status": "pending",
                "submission_time": None,
                "submission_text": "",
                "submission_files": [],
                "submission_version": 0,
                "review_status": "pending",
                "marks_obtained": None,
                "teacher_remarks": "",
                "attachments": json.loads(hw.attachments) if hw.attachments and isinstance(hw.attachments, str) else (hw.attachments or []),
            })
        if hw_untracked:
            await db.commit()

    return {
        "student_id": student.id,
        "total": len(items),
        "items": items,
    }


@router.post("/homework/{record_id}/submit")
async def submit_student_homework_portal(
    record_id: int,
    payload: HomeworkSubmissionPayload,
    student_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Submits or resubmits digital homework solution with typed response or file attachments."""
    student = await get_effective_student(db, current_user, student_id)
    rec = await db.get(StudentHomeworkRecord, record_id)
    if not rec or rec.student_id != student.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Homework record #{record_id} not found for student.",
        )

    assignment = await db.get(HomeworkAssignment, rec.assignment_id)
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found.",
        )

    today = date.today()
    due_d = rec.individual_due_date or assignment.due_date
    is_late = today > due_d
    if is_late and not assignment.allow_late_submissions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Late submissions are disabled for this assignment.",
        )

    prev_status = rec.status
    new_sub_status = "late_submitted" if is_late else "submitted"

    files_list = payload.submission_files or []
    if payload.submission_file_url and not files_list:
        files_list = [{"url": payload.submission_file_url, "name": "Submission Attachment"}]

    rec.submission_text = payload.submission_text or rec.submission_text
    rec.submission_files = json.dumps(files_list)
    rec.submission_status = new_sub_status
    rec.status = new_sub_status
    rec.submission_time = datetime.now()
    rec.submission_version = (rec.submission_version or 0) + 1
    rec.review_status = "pending"

    # Audit log
    audit = HomeworkAuditLog(
        assignment_id=assignment.id,
        student_record_id=rec.id,
        actor_user_id=current_user.id,
        action="student_submitted",
        previous_status=prev_status,
        new_status=new_sub_status,
        details=f"Version {rec.submission_version} submitted by {student.first_name} {student.last_name}",
    )
    db.add(audit)
    await db.commit()
    await db.refresh(rec)

    return {
        "success": True,
        "message": "Homework submitted successfully.",
        "record_id": rec.id,
        "submission_status": rec.submission_status,
        "submission_version": rec.submission_version,
        "submitted_at": rec.submission_time.isoformat() if rec.submission_time else None,
    }


# ─── MULTI-CURRICULUM REPORT CARD DOSSIER ──────────────────────────────────────

@router.get("/report-cards")
async def get_student_report_cards(
    student_id: Optional[int] = Query(None),
    scale: Optional[str] = Query(None, description="Grading scale: STANDARD_6_POINT, CBSE_9_POINT, ICSE_PERCENTAGE, etc."),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Lists all official examination report cards compiled for the student."""
    student = await get_effective_student(db, current_user, student_id)

    # Find examinations where student has marks or is enrolled
    enr_stmt = select(StudentEnrollment.standard_id).where(StudentEnrollment.student_id == student.id)
    std_ids = (await db.execute(enr_stmt)).scalars().all()

    exam_ids_with_marks = (
        await db.execute(select(ExamMark.examination_id).where(ExamMark.student_id == student.id).distinct())
    ).scalars().all()

    all_target_exam_ids = set(exam_ids_with_marks)
    if std_ids:
        std_exams = (
            await db.execute(select(Examination.id).where(Examination.standard_id.in_(std_ids), Examination.is_active == True))
        ).scalars().all()
        all_target_exam_ids.update(std_exams)

    report_cards = []
    if all_target_exam_ids:
        exams_stmt = (
            select(Examination)
            .where(Examination.id.in_(list(all_target_exam_ids)))
            .order_by(desc(Examination.start_date))
        )
        exams = (await db.execute(exams_stmt)).scalars().all()
        for ex in exams:
            rc = await get_student_report_card(
                db, exam_id=ex.id, student_id=student.id, institution_id=student.institution_id or 1, scale=scale
            )
            if rc:
                report_cards.append(rc)

    return {
        "student_id": student.id,
        "total_report_cards": len(report_cards),
        "report_cards": report_cards,
    }


@router.get("/report-cards/{exam_id}")
async def get_single_student_report_card(
    exam_id: int,
    student_id: Optional[int] = Query(None),
    scale: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Retrieves full official printable report card dossier for a specific examination."""
    student = await get_effective_student(db, current_user, student_id)
    rc = await get_student_report_card(
        db, exam_id=exam_id, student_id=student.id, institution_id=student.institution_id or 1, scale=scale
    )
    if not rc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report card for examination #{exam_id} could not be generated.",
        )
    return rc


# ─── FEE PAYMENT & RECEIPT CENTER ──────────────────────────────────────────────

@router.post("/fees/pay-online")
async def pay_student_fees_online(
    payload: StudentOnlinePaymentPayload,
    student_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Executes online fee payment checkout against student invoice and issues official receipt."""
    student = await get_effective_student(db, current_user, student_id)

    invoice = await db.get(FeeInvoice, payload.invoice_id)
    if not invoice or invoice.student_id != student.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Invoice #{payload.invoice_id} not found for student.",
        )
    if invoice.status == "cancelled":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot pay against cancelled invoice.",
        )
    if float(invoice.outstanding_amount) <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invoice has already been fully settled.",
        )
    if payload.amount <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment amount must be greater than zero.",
        )
    if payload.amount > float(invoice.outstanding_amount) + 0.01:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Payment amount ({payload.amount}) exceeds outstanding balance ({invoice.outstanding_amount}).",
        )

    # Active academic year
    ay_id = invoice.academic_year_id
    if not ay_id:
        enr_stmt = (
            select(StudentEnrollment.academic_year_id)
            .where(StudentEnrollment.student_id == student.id)
            .order_by(StudentEnrollment.id.desc())
            .limit(1)
        )
        ay_id = (await db.execute(enr_stmt)).scalar() or 1

    txn_ref = payload.transaction_reference or f"TXN-PORTAL-{uuid.uuid4().hex[:8].upper()}"
    amt_decimal = Decimal(str(round(payload.amount, 2)))

    payment = Payment(
        student_id=student.id,
        academic_year_id=ay_id,
        amount=amt_decimal,
        payment_date=date.today(),
        payment_method=payload.payment_method or "online_upi",
        transaction_reference=txn_ref,
        notes=payload.notes or "Self-service online payment via Student Portal",
        status="completed",
        collected_by_id=current_user.id if current_user.role != "student" else None,
    )
    db.add(payment)
    await db.flush()

    # Create allocation
    allocation = PaymentAllocation(
        payment_id=payment.id,
        invoice_id=invoice.id,
        allocated_amount=amt_decimal,
    )
    db.add(allocation)

    # Update invoice amounts
    invoice.paid_amount = (invoice.paid_amount or Decimal(0)) + amt_decimal
    invoice.outstanding_amount = max(Decimal(0), (invoice.outstanding_amount or Decimal(0)) - amt_decimal)
    if invoice.outstanding_amount <= Decimal("0.01"):
        invoice.status = "paid"
        invoice.outstanding_amount = Decimal(0)
    else:
        invoice.status = "partially_paid"

    # Generate official receipt
    rc_num = f"REC-PORTAL-{date.today().strftime('%Y%m%d')}-{payment.id}"
    receipt = PaymentReceipt(
        receipt_number=rc_num,
        payment_id=payment.id,
        student_id=student.id,
        amount=amt_decimal,
        payment_date=date.today(),
        payment_method=payment.payment_method,
        status="valid",
    )
    db.add(receipt)
    await db.commit()
    await db.refresh(payment)

    return {
        "success": True,
        "message": f"Payment of ₹{payload.amount} processed successfully. Receipt #{rc_num} generated.",
        "payment_id": payment.id,
        "receipt_number": rc_num,
        "amount": float(payment.amount),
        "payment_method": payment.payment_method,
        "transaction_reference": payment.transaction_reference,
        "payment_date": str(payment.payment_date),
        "invoice_id": invoice.id,
        "invoice_number": invoice.invoice_number,
        "invoice_status": invoice.status,
        "remaining_outstanding": float(invoice.outstanding_amount),
    }


@router.get("/fees/receipts/{receipt_identifier}/voucher")
async def get_student_portal_receipt_voucher(
    receipt_identifier: str,
    student_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Compiles printable official fee payment receipt voucher with institutional authorization."""
    student = await get_effective_student(db, current_user, student_id)

    query = (
        select(PaymentReceipt, Payment)
        .join(Payment, PaymentReceipt.payment_id == Payment.id)
        .options(
            selectinload(Payment.allocations).selectinload(PaymentAllocation.invoice),
        )
        .where(PaymentReceipt.student_id == student.id)
    )
    if receipt_identifier.isdigit():
        query = query.where(
            or_(
                PaymentReceipt.id == int(receipt_identifier),
                PaymentReceipt.payment_id == int(receipt_identifier),
                PaymentReceipt.receipt_number == receipt_identifier,
            )
        )
    else:
        query = query.where(PaymentReceipt.receipt_number == receipt_identifier)

    res = (await db.execute(query)).first()
    if not res:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Payment receipt '{receipt_identifier}' not found for student.",
        )
    rc, pmt = res

    # Institution details
    inst_stmt = select(Institution).where(Institution.id == (student.institution_id or 1))
    inst = (await db.execute(inst_stmt)).scalar_one_or_none()

    # Active enrollment details
    enr_stmt = (
        select(StudentEnrollment, Standard, Division, AcademicYear)
        .join(Standard, StudentEnrollment.standard_id == Standard.id)
        .outerjoin(Division, StudentEnrollment.division_id == Division.id)
        .join(AcademicYear, StudentEnrollment.academic_year_id == AcademicYear.id)
        .where(StudentEnrollment.student_id == student.id)
        .order_by(StudentEnrollment.id.desc())
    )
    enr_row = (await db.execute(enr_stmt)).first()
    std_name = enr_row[1].name if enr_row else "Standard"
    div_name = enr_row[2].name if enr_row and enr_row[2] else "General"
    ay_name = enr_row[3].name if enr_row else "Academic Year"
    roll_no = enr_row[0].roll_number if enr_row and enr_row[0].roll_number else "N/A"

    allocations = [
        {
            "invoice_id": al.invoice_id,
            "invoice_number": al.invoice.invoice_number if al.invoice else f"INV-{al.invoice_id}",
            "amount": float(al.allocated_amount),
        }
        for al in pmt.allocations
    ]

    return {
        "voucher": {
            "receipt_number": rc.receipt_number,
            "payment_id": pmt.id,
            "payment_date": str(pmt.payment_date),
            "amount": float(pmt.amount),
            "payment_method": pmt.payment_method,
            "transaction_reference": pmt.transaction_reference or "N/A",
            "notes": pmt.notes or "",
            "status": rc.status,
            "institution": {
                "name": inst.name if inst else "Prashant Academy Coaching Institute",
                "tagline": getattr(inst, "tagline", "Coaching Institute Management System"),
                "address": getattr(inst, "address", "Thane, Maharashtra"),
                "phone": getattr(inst, "phone", "9323 023 007"),
                "email": getattr(inst, "email", "support@prashantacademy.com"),
                "registration_number": getattr(inst, "registration_number", "MH-COACH-2018-0157"),
            },
            "student": {
                "id": student.id,
                "admission_number": student.admission_number,
                "full_name": f"{student.first_name} {student.last_name}",
                "standard": std_name,
                "division": div_name,
                "roll_number": roll_no,
                "academic_year": ay_name,
            },
            "allocations": allocations,
            "generated_at": str(rc.generated_at or datetime.now()),
        }
    }

