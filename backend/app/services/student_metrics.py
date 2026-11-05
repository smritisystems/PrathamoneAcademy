# /**
#  * @file        student_metrics.py
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
#  * @created     2026-11-05
#  * @updated     2026-11-05
#  *
#  * @description Authoritative student metrics and counting service ensuring consistent active enrollment counts across dashboards.
#  */

from typing import Optional, Dict, Tuple, List, Any
from sqlalchemy import select, func, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.student import Student
from app.models.enrollment import StudentEnrollment
from app.models.division import Division
from app.models.standard import Standard
from app.models.board import Board
from app.models.fee import FeeInvoice



def apply_student_status_filter(query, status: Optional[str] = None, include_inactive: bool = False):
    """
    Applies authoritative student & enrollment status criteria.
    Supports: active, inactive, withdrawn, completed, graduated, and all.
    """
    if status:
        st = status.strip().lower()
        if st == "active":
            return query.where(Student.is_active == True, StudentEnrollment.status == "active")
        elif st == "inactive":
            return query.where(or_(Student.is_active == False, StudentEnrollment.status == "inactive"))
        elif st == "withdrawn":
            return query.where(
                or_(
                    StudentEnrollment.status == "withdrawn",
                    and_(Student.is_active == False, Student.exit_date.isnot(None)),
                )
            )
        elif st == "completed":
            return query.where(StudentEnrollment.status == "completed")
        elif st == "graduated":
            return query.where(StudentEnrollment.status == "graduated")
        elif st in ("all", "include_all"):
            return query
        else:
            return query.where(StudentEnrollment.status == st)
    elif not include_inactive:
        return query.where(Student.is_active == True, StudentEnrollment.status == "active")
    return query

async def get_authoritative_student_count(
    db: AsyncSession,
    institution_id: Optional[int] = None,
    academic_year_id: Optional[int] = None,
    board_id: Optional[int] = None,
    standard_id: Optional[int] = None,
    division_id: Optional[int] = None,
    status: Optional[str] = None,
    include_inactive: bool = False,
) -> int:
    """
    Authoritative student count rule:
    Computes the exact number of distinct students with valid, active enrollments
    in the specified institution and academic year, subject to board, class (standard),
    and batch (division) filters.

    Guarantees:
    - Students are counted once regardless of multiple joins or enrollments (COUNT DISTINCT).
    - Inactive students (is_active=False) and non-active enrollments (withdrawn, transferred) are excluded.
    - Students WITHOUT fee records are correctly included in the count.
    - Consistent institution and academic-year filtering across all dashboards.
    """
    query = (
        select(func.count(func.distinct(Student.id)))
        .join(StudentEnrollment, Student.id == StudentEnrollment.student_id)
    )
    query = apply_student_status_filter(query, status=status, include_inactive=include_inactive)

    if institution_id:
        query = query.where(Student.institution_id == institution_id)

    if academic_year_id:
        query = query.where(StudentEnrollment.academic_year_id == academic_year_id)

    if board_id:
        query = query.join(Division, StudentEnrollment.division_id == Division.id).where(
            Division.board_id == board_id
        )

    if standard_id:
        query = query.where(StudentEnrollment.standard_id == standard_id)

    if division_id:
        query = query.where(StudentEnrollment.division_id == division_id)

    result = await db.execute(query)
    return result.scalar() or 0


async def get_authoritative_student_counts_by_board(
    db: AsyncSession,
    institution_id: Optional[int] = None,
    academic_year_id: Optional[int] = None,
    board_id: Optional[int] = None,
    standard_id: Optional[int] = None,
    division_id: Optional[int] = None,
) -> Dict[str, int]:
    """
    Compute authoritative active enrolled student counts grouped by Board name.
    """
    query = (
        select(
            func.coalesce(Board.name, "General").label("board_name"),
            func.count(func.distinct(Student.id)).label("count"),
        )
        .join(StudentEnrollment, Student.id == StudentEnrollment.student_id)
        .outerjoin(Division, StudentEnrollment.division_id == Division.id)
        .outerjoin(Board, Division.board_id == Board.id)
        .where(
            Student.is_active == True,
            StudentEnrollment.status == "active",
        )
    )

    if institution_id:
        query = query.where(Student.institution_id == institution_id)
    if academic_year_id:
        query = query.where(StudentEnrollment.academic_year_id == academic_year_id)
    if board_id:
        query = query.where(Division.board_id == board_id)
    if standard_id:
        query = query.where(StudentEnrollment.standard_id == standard_id)
    if division_id:
        query = query.where(StudentEnrollment.division_id == division_id)

    query = query.group_by(Board.name)
    rows = (await db.execute(query)).all()
    return {r.board_name: r.count for r in rows}


async def get_authoritative_student_counts_by_batch(
    db: AsyncSession,
    institution_id: Optional[int] = None,
    academic_year_id: Optional[int] = None,
    board_id: Optional[int] = None,
    standard_id: Optional[int] = None,
    division_id: Optional[int] = None,
) -> Dict[Tuple[str, str, str], int]:
    """
    Compute authoritative active enrolled student counts grouped by (batch_name, standard_name, board_name).
    """
    query = (
        select(
            func.coalesce(Division.name, "Unassigned").label("batch_name"),
            func.coalesce(Standard.name, "General").label("standard_name"),
            func.coalesce(Board.name, "General").label("board_name"),
            func.count(func.distinct(Student.id)).label("count"),
        )
        .join(StudentEnrollment, Student.id == StudentEnrollment.student_id)
        .outerjoin(Division, StudentEnrollment.division_id == Division.id)
        .outerjoin(Standard, StudentEnrollment.standard_id == Standard.id)
        .outerjoin(Board, Division.board_id == Board.id)
        .where(
            Student.is_active == True,
            StudentEnrollment.status == "active",
        )
    )

    if institution_id:
        query = query.where(Student.institution_id == institution_id)
    if academic_year_id:
        query = query.where(StudentEnrollment.academic_year_id == academic_year_id)
    if board_id:
        query = query.where(Division.board_id == board_id)
    if standard_id:
        query = query.where(StudentEnrollment.standard_id == standard_id)
    if division_id:
        query = query.where(StudentEnrollment.division_id == division_id)

    query = query.group_by(Division.name, Standard.name, Board.name)
    rows = (await db.execute(query)).all()
    return {(r.batch_name, r.standard_name, r.board_name): r.count for r in rows}


async def get_student_reconciliation_diagnostic(
    db: AsyncSession,
    institution_id: Optional[int] = None,
    academic_year_id: Optional[int] = None,
) -> List[Dict[str, Any]]:
    """
    Produces complete student reconciliation comparing active enrollments against fee invoice records.
    """
    query = (
        select(
            Student.id,
            Student.admission_number,
            Student.first_name,
            Student.last_name,
            Student.institution_id,
            StudentEnrollment.status.label("enrollment_status"),
            StudentEnrollment.academic_year_id,
            Standard.name.label("standard_name"),
            Division.name.label("division_name"),
            Board.name.label("board_name"),
            func.count(func.distinct(FeeInvoice.id)).label("invoice_count"),
        )
        .join(StudentEnrollment, Student.id == StudentEnrollment.student_id)
        .outerjoin(Standard, StudentEnrollment.standard_id == Standard.id)
        .outerjoin(Division, StudentEnrollment.division_id == Division.id)
        .outerjoin(Board, Division.board_id == Board.id)
        .outerjoin(
            FeeInvoice,
            (Student.id == FeeInvoice.student_id)
            & (StudentEnrollment.academic_year_id == FeeInvoice.academic_year_id)
            & (FeeInvoice.status != "cancelled"),
        )
        .where(
            Student.is_active == True,
        )
    )

    if institution_id:
        query = query.where(Student.institution_id == institution_id)
    if academic_year_id:
        query = query.where(StudentEnrollment.academic_year_id == academic_year_id)

    query = query.group_by(
        Student.id,
        Student.admission_number,
        Student.first_name,
        Student.last_name,
        Student.institution_id,
        StudentEnrollment.status,
        StudentEnrollment.academic_year_id,
        Standard.name,
        Division.name,
        Board.name,
    ).order_by(Student.id)

    rows = (await db.execute(query)).all()
    diagnostic = []
    for r in rows:
        has_fee = r.invoice_count > 0
        diagnostic.append({
            "student_id": r.id,
            "admission_number": r.admission_number,
            "student_name": f"{r.first_name} {r.last_name}".strip(),
            "institution_id": r.institution_id,
            "academic_year_id": r.academic_year_id,
            "enrollment_status": r.enrollment_status,
            "class_name": r.standard_name or "Unassigned",
            "board_name": r.board_name or "General",
            "batch_name": r.division_name or "Unassigned",
            "has_fee_record": has_fee,
            "included_in_main_dashboard": r.enrollment_status == "active",
            "included_in_fees_dashboard": has_fee,
            "discrepancy_reason": (
                "Matches across both dashboards"
                if (has_fee and r.enrollment_status == "active")
                else ("Excluded in Fees dashboard: lacks active FeeInvoice record" if not has_fee else "Excluded: non-active enrollment")
            ),
        })
    return diagnostic

