# /**
#  * @file        exam_reports.py
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
#  * @created     2026-11-06
#  * @updated     2026-11-12
#  *
#  * @description Domain service for exam marks management, grade calculation, cohort analytics, and official report cards.
#  */

import logging
from typing import Optional, Dict, Any, List
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from sqlalchemy.orm import selectinload

from app.models.exam import Examination, ExamMark
from app.models.subject import Subject, SubjectMapping
from app.models.student import Student, Guardian
from app.models.enrollment import StudentEnrollment
from app.models.standard import Standard
from app.models.division import Division
from app.models.institution import Institution
from app.models.academic_year import AcademicYear

logger = logging.getLogger(__name__)


def calculate_grade(marks: Optional[float], max_marks: float) -> str:
    """Calculates standardized grade letter from score and maximum marks."""
    if marks is None or max_marks <= 0:
        return "F"
    pct = (float(marks) / float(max_marks)) * 100.0
    if pct >= 90.0:
        return "A+"
    elif pct >= 80.0:
        return "A"
    elif pct >= 70.0:
        return "B"
    elif pct >= 60.0:
        return "C"
    elif pct >= 35.0:
        return "D"
    else:
        return "F"


async def get_exam_marks_sheet(
    db: AsyncSession, exam_id: int
) -> Optional[Dict[str, Any]]:
    """Retrieves marks entry spreadsheet dataset for an examination."""
    stmt = (
        select(Examination)
        .options(selectinload(Examination.marks))
        .where(Examination.id == exam_id)
    )
    res = await db.execute(stmt)
    exam = res.scalar_one_or_none()
    if not exam:
        return None

    # Fetch subjects for this exam's standard
    subj_stmt = (
        select(Subject)
        .where(
            and_(
                Subject.standard_id == exam.standard_id,
                Subject.is_active == True,
            )
        )
        .order_by(Subject.name)
    )
    subj_res = await db.execute(subj_stmt)
    subjects = subj_res.scalars().all()

    # Fetch enrolled students
    stu_stmt = (
        select(Student)
        .join(StudentEnrollment, Student.id == StudentEnrollment.student_id)
        .options(selectinload(Student.enrollments))
        .where(
            and_(
                StudentEnrollment.standard_id == exam.standard_id,
                StudentEnrollment.status == "active",
                Student.is_active == True,
            )
        )
        .order_by(StudentEnrollment.roll_number, Student.first_name)
    )
    stu_res = await db.execute(stu_stmt)
    students = stu_res.scalars().all()

    # Map existing marks: (student_id, subject_id) -> mark
    marks_map = {
        (m.student_id, m.subject_id): {
            "id": m.id,
            "marks_obtained": float(m.marks_obtained) if m.marks_obtained is not None else None,
            "grade": m.grade,
            "remarks": m.remarks,
            "is_absent": m.is_absent,
        }
        for m in exam.marks
    }

    students_data = []
    for s in students:
        active_enr = next((e for e in s.enrollments if e.status == "active"), None)
        scores = {}
        for sub in subjects:
            score_data = marks_map.get((s.id, sub.id), {
                "id": None,
                "marks_obtained": None,
                "grade": None,
                "remarks": None,
                "is_absent": False,
            })
            scores[sub.id] = score_data

        students_data.append({
            "student_id": s.id,
            "admission_number": s.admission_number,
            "name": f"{s.first_name} {s.last_name}",
            "roll_number": active_enr.roll_number if active_enr and active_enr.roll_number else "N/A",
            "scores": scores,
        })

    return {
        "exam": {
            "id": exam.id,
            "name": exam.name,
            "exam_type": exam.exam_type,
            "standard_id": exam.standard_id,
            "max_marks": exam.max_marks,
            "passing_marks": exam.passing_marks,
            "start_date": str(exam.start_date) if exam.start_date else None,
            "end_date": str(exam.end_date) if exam.end_date else None,
        },
        "subjects": [
            {
                "id": sub.id,
                "name": sub.name,
                "code": sub.code,
                "max_marks": sub.max_marks or exam.max_marks,
                "pass_marks": sub.pass_marks or exam.passing_marks,
            }
            for sub in subjects
        ],
        "students": students_data,
    }


async def save_exam_marks_bulk(
    db: AsyncSession,
    exam_id: int,
    entries: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """Bulk records student examination scores, computes letter grades and updates existing records."""
    exam = await db.scalar(select(Examination).where(Examination.id == exam_id))
    if not exam:
        raise ValueError(f"Examination #{exam_id} not found")
    from app.models.standard import Standard
    exam_inst_id = await db.scalar(
        select(Standard.institution_id).where(Standard.id == exam.standard_id)
    )

    # Fetch subjects max marks, names, and canonical subject_mapping_id lookup
    subj_res = await db.execute(
        select(Subject.id, Subject.max_marks, SubjectMapping.id, Subject.name)
        .outerjoin(SubjectMapping, SubjectMapping.legacy_subject_id == Subject.id)
        .where(Subject.standard_id == exam.standard_id)
    )
    subj_rows = subj_res.all()
    subj_max_map = {row[0]: row[1] or exam.max_marks for row in subj_rows}
    subj_map_map = {row[0]: row[2] for row in subj_rows}
    subj_name_map = {row[0]: row[3] for row in subj_rows}

    saved_count = 0
    for item in entries:
        student_id = item["student_id"]
        subject_id = item["subject_id"]
        marks_obtained = item.get("marks_obtained")
        is_absent = bool(item.get("is_absent", False))
        remarks = item.get("remarks")

        sub_max = subj_max_map.get(subject_id, exam.max_marks)

        grade = None
        if is_absent:
            grade = "AB"
            marks_obtained = Decimal("0.00")
        elif marks_obtained is not None:
            marks_decimal = Decimal(str(marks_obtained))
            grade = calculate_grade(float(marks_decimal), float(sub_max))
            marks_obtained = marks_decimal

        mapping_id = subj_map_map.get(subject_id)
        existing = await db.scalar(
            select(ExamMark).where(
                and_(
                    ExamMark.examination_id == exam_id,
                    ExamMark.student_id == student_id,
                    ExamMark.subject_id == subject_id,
                )
            )
        )
        if existing:
            existing.marks_obtained = marks_obtained
            existing.grade = grade
            existing.is_absent = is_absent
            existing.remarks = remarks
            existing.institution_id = existing.institution_id or exam_inst_id
            existing.max_marks = existing.max_marks or Decimal(str(sub_max))
            existing.subject_name = existing.subject_name or subj_name_map.get(subject_id)
            existing.exam_name = existing.exam_name or exam.name
            if mapping_id and not existing.subject_mapping_id:
                existing.subject_mapping_id = mapping_id
        else:
            new_mark = ExamMark(
                institution_id=exam_inst_id,
                examination_id=exam_id,
                student_id=student_id,
                subject_id=subject_id,
                subject_mapping_id=mapping_id,
                max_marks=Decimal(str(sub_max)),
                subject_name=subj_name_map.get(subject_id),
                exam_name=exam.name,
                marks_obtained=marks_obtained,
                grade=grade,
                is_absent=is_absent,
                remarks=remarks,
            )
            db.add(new_mark)

        saved_count += 1

    await db.commit()
    return {"status": "success", "saved_count": saved_count}


async def get_exam_analytics(
    db: AsyncSession, exam_id: int
) -> Optional[Dict[str, Any]]:
    """Calculates comprehensive class examination analytics, grade frequencies, and rankings."""
    exam = await db.scalar(select(Examination).where(Examination.id == exam_id))
    if not exam:
        return None

    # Fetch all marks for this exam
    stmt = (
        select(ExamMark, Student.first_name, Student.last_name, Student.admission_number, Subject.name.label("subject_name"), Subject.max_marks.label("sub_max"))
        .join(Student, ExamMark.student_id == Student.id)
        .join(Subject, ExamMark.subject_id == Subject.id)
        .where(ExamMark.examination_id == exam_id)
    )
    res = await db.execute(stmt)
    rows = res.all()

    if not rows:
        return {
            "examination_id": exam_id,
            "exam_name": exam.name,
            "total_candidates": 0,
            "appeared_candidates": 0,
            "pass_count": 0,
            "fail_count": 0,
            "pass_percentage": 0.0,
            "class_average": 0.0,
            "highest_score": 0.0,
            "lowest_score": 0.0,
            "grade_distribution": {"A+": 0, "A": 0, "B": 0, "C": 0, "D": 0, "F": 0},
            "subject_analytics": [],
            "leaderboard": [],
        }

    # Aggregate per-student totals
    student_scores: Dict[int, Dict[str, Any]] = {}
    subject_marks: Dict[int, List[float]] = {}
    subject_names: Dict[int, str] = {}

    for mark, fn, ln, adm, sub_name, sub_max in rows:
        sid = mark.student_id
        if sid not in student_scores:
            student_scores[sid] = {
                "student_id": sid,
                "name": f"{fn} {ln}",
                "admission_number": adm,
                "total_obtained": 0.0,
                "total_max": 0.0,
                "has_fail": False,
                "is_absent": False,
            }

        effective_max = float(sub_max or exam.max_marks)
        student_scores[sid]["total_max"] += effective_max

        sub_id = mark.subject_id
        subject_names[sub_id] = sub_name
        if sub_id not in subject_marks:
            subject_marks[sub_id] = []

        if mark.is_absent:
            student_scores[sid]["is_absent"] = True
            student_scores[sid]["has_fail"] = True
        elif mark.marks_obtained is not None:
            obtained = float(mark.marks_obtained)
            student_scores[sid]["total_obtained"] += obtained
            subject_marks[sub_id].append(obtained)
            if obtained < float(exam.passing_marks):
                student_scores[sid]["has_fail"] = True

    # Calculate student percentages & ranks
    student_summaries = []
    grade_dist = {"A+": 0, "A": 0, "B": 0, "C": 0, "D": 0, "F": 0}

    for sid, sdata in student_scores.items():
        tot_max = sdata["total_max"]
        tot_obt = sdata["total_obtained"]
        pct = (tot_obt / tot_max * 100.0) if tot_max > 0 else 0.0
        grd = calculate_grade(tot_obt, tot_max)

        if sdata["has_fail"] or grd == "F":
            result_status = "FAIL"
            grade_dist["F"] += 1
        else:
            result_status = "PASS"
            if grd in grade_dist:
                grade_dist[grd] += 1

        student_summaries.append({
            "student_id": sid,
            "name": sdata["name"],
            "admission_number": sdata["admission_number"],
            "total_obtained": round(tot_obt, 2),
            "total_max": round(tot_max, 2),
            "percentage": round(pct, 2),
            "grade": grd,
            "result": result_status,
        })

    # Sort by percentage descending for ranking
    student_summaries.sort(key=lambda x: x["percentage"], reverse=True)
    for idx, s in enumerate(student_summaries):
        s["rank"] = idx + 1

    total_candidates = len(student_summaries)
    appeared = [s for s in student_summaries if s["total_obtained"] > 0]
    pass_count = sum(1 for s in student_summaries if s["result"] == "PASS")
    fail_count = total_candidates - pass_count
    pass_pct = round((pass_count / total_candidates * 100.0), 2) if total_candidates > 0 else 0.0

    percentages = [s["percentage"] for s in student_summaries]
    class_avg = round(sum(percentages) / len(percentages), 2) if percentages else 0.0
    highest = max(percentages) if percentages else 0.0
    lowest = min(percentages) if percentages else 0.0

    # Subject Analytics
    subject_analytics = []
    for sub_id, scores in subject_marks.items():
        sub_avg = round(sum(scores) / len(scores), 2) if scores else 0.0
        sub_high = max(scores) if scores else 0.0
        sub_low = min(scores) if scores else 0.0
        subject_analytics.append({
            "subject_id": sub_id,
            "subject_name": subject_names.get(sub_id, "Subject"),
            "candidates_count": len(scores),
            "average_marks": sub_avg,
            "highest_marks": sub_high,
            "lowest_marks": sub_low,
        })

    return {
        "examination_id": exam_id,
        "exam_name": exam.name,
        "total_candidates": total_candidates,
        "appeared_candidates": len(appeared),
        "pass_count": pass_count,
        "fail_count": fail_count,
        "pass_percentage": pass_pct,
        "class_average": class_avg,
        "highest_score": highest,
        "lowest_score": lowest,
        "grade_distribution": grade_dist,
        "subject_analytics": subject_analytics,
        "leaderboard": student_summaries[:5],  # Top 5
    }


async def get_student_report_card(
    db: AsyncSession, exam_id: int, student_id: int, institution_id: int
) -> Optional[Dict[str, Any]]:
    """Compiles comprehensive individual student report card with subject breakdown and class rank."""
    exam = await db.scalar(select(Examination).where(Examination.id == exam_id))
    if not exam:
        return None

    # Fetch student and active enrollment
    stu_stmt = (
        select(Student)
        .options(
            selectinload(Student.guardians),
            selectinload(Student.enrollments),
        )
        .where(
            and_(
                Student.id == student_id,
                Student.institution_id == institution_id,
            )
        )
    )
    student = await db.scalar(stu_stmt)
    if not student:
        return None

    active_enr = next((e for e in student.enrollments if e.status == "active"), None)
    standard_name = "N/A"
    division_name = "N/A"
    roll_number = "N/A"

    if active_enr:
        roll_number = active_enr.roll_number or "N/A"
        if active_enr.standard_id:
            standard_name = (
                await db.scalar(select(Standard.name).where(Standard.id == active_enr.standard_id))
            ) or "N/A"
        if active_enr.division_id:
            division_name = (
                await db.scalar(select(Division.name).where(Division.id == active_enr.division_id))
            ) or "N/A"

    # Institution branding
    inst = await db.scalar(select(Institution).where(Institution.id == institution_id))

    # Fetch marks for this student
    marks_stmt = (
        select(ExamMark, Subject.name, Subject.code, Subject.max_marks, Subject.pass_marks)
        .join(Subject, ExamMark.subject_id == Subject.id)
        .where(
            and_(
                ExamMark.examination_id == exam_id,
                ExamMark.student_id == student_id,
            )
        )
        .order_by(Subject.name)
    )
    marks_res = await db.execute(marks_stmt)
    marks_rows = marks_res.all()

    total_obtained = 0.0
    total_max = 0.0
    has_failed = False
    subjects_table = []

    for mark, sname, scode, smax, spass in marks_rows:
        effective_max = float(smax or exam.max_marks)
        effective_pass = float(spass or exam.passing_marks)
        total_max += effective_max

        if mark.is_absent:
            obt_str = "AB"
            obt_val = 0.0
            grade = "AB"
            status_str = "ABSENT"
            has_failed = True
        elif mark.marks_obtained is not None:
            obt_val = float(mark.marks_obtained)
            obt_str = f"{obt_val:.1f}"
            total_obtained += obt_val
            grade = mark.grade or calculate_grade(obt_val, effective_max)
            status_str = "PASS" if obt_val >= effective_pass else "FAIL"
            if status_str == "FAIL":
                has_failed = True
        else:
            obt_str = "N/A"
            obt_val = 0.0
            grade = "N/A"
            status_str = "PENDING"

        pct = (obt_val / effective_max * 100.0) if effective_max > 0 else 0.0

        subjects_table.append({
            "subject_id": mark.subject_id,
            "subject_name": sname,
            "subject_code": scode or "",
            "max_marks": effective_max,
            "passing_marks": effective_pass,
            "marks_obtained": obt_str,
            "percentage": round(pct, 1),
            "grade": grade,
            "status": status_str,
            "remarks": mark.remarks or "",
        })

    overall_pct = round((total_obtained / total_max * 100.0), 2) if total_max > 0 else 0.0
    overall_grade = calculate_grade(total_obtained, total_max)
    final_result = "FAIL" if (has_failed or overall_grade == "F") else "PASS"

    # Compute class rank
    analytics = await get_exam_analytics(db, exam_id)
    rank = "N/A"
    total_in_class = 0
    if analytics:
        total_in_class = analytics.get("total_candidates", 0)
        # Find rank from all candidates
        for item in analytics.get("leaderboard", []):
            if item.get("student_id") == student_id:
                rank = f"#{item.get('rank', 'N/A')}"
                break

    primary_guardian = None
    if student.guardians:
        primary_guardian = next((g for g in student.guardians if g.is_primary), student.guardians[0])

    return {
        "student": {
            "id": student.id,
            "admission_number": student.admission_number,
            "full_name": f"{student.first_name} {student.last_name}",
            "photo_url": student.photo_url,
            "standard_name": standard_name,
            "division_name": division_name,
            "roll_number": roll_number,
            "guardian_name": f"{primary_guardian.first_name} {primary_guardian.last_name}" if primary_guardian else "N/A",
            "guardian_phone": primary_guardian.phone if primary_guardian else "N/A",
        },
        "examination": {
            "id": exam.id,
            "name": exam.name,
            "exam_type": exam.exam_type,
            "start_date": str(exam.start_date) if exam.start_date else None,
            "end_date": str(exam.end_date) if exam.end_date else None,
        },
        "institution": {
            "name": inst.name if inst else "Prashant Academy Coaching Institute",
            "short_name": getattr(inst, "short_name", "PA") or "PA",
            "tagline": getattr(inst, "tagline", "Learn • Practice • Achieve") or "Learn • Practice • Achieve",
            "address": inst.address if inst else "",
            "city": inst.city if inst else "",
            "phone": inst.phone if inst else "",
            "logo_url": getattr(inst, "logo_url", None),
        },
        "subjects": subjects_table,
        "summary": {
            "total_max_marks": total_max,
            "total_obtained": round(total_obtained, 2),
            "percentage": overall_pct,
            "grade": overall_grade,
            "result": final_result,
            "class_rank": rank,
            "total_candidates": total_in_class,
        },
    }
