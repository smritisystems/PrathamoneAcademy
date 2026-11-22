# /**
#  * @file        catalogue.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      backend.app.api.v1.endpoints
#  *
#  * @author      Jawahar R. Mallah
#  * @organization Smritisys & AITDL Networks
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 PrathamOne EduOS
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-22
#  * @updated     2026-11-22
#  *
#  * @description API endpoints for Centralized Master Catalogues Hub, master telemetry, and relational integrity health scanner.
#  */

from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from typing import Optional, Dict, Any, List
from app.core.database import get_db
from app.core.deps import get_current_active_user, require_role, is_sysadmin
from app.models.board import Board
from app.models.standard import Standard
from app.models.division import Division
from app.models.subject import CanonicalSubject, SubjectMapping
from app.models.student import Student
from app.models.enrollment import StudentEnrollment
from app.models.user import User
from app.models.fee import FeeCategory, FeeStructure
from app.models.academic_year import AcademicYear

router = APIRouter()


@router.get("/overview")
async def get_catalogue_overview(
    institution_id: Optional[int] = Query(None),
    academic_year_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Dict[str, Any]:
    """
    Returns unified Master Catalogues telemetry, category breakdown,
    setup dependency progress, and real-time relational integrity alerts.
    """
    user_inst_id = institution_id or getattr(current_user, "institution_id", None) or 1

    # 1. Metric Counts
    # Boards
    boards_cnt = (await db.execute(
        select(func.count(Board.id)).where(Board.institution_id == user_inst_id, Board.is_active == True)
    )).scalar() or 0

    # Standards
    standards_cnt = (await db.execute(
        select(func.count(Standard.id)).where(Standard.institution_id == user_inst_id, Standard.is_active == True)
    )).scalar() or 0

    # Batches / Divisions
    batches_q = (
        select(func.count(Division.id))
        .join(Standard, Division.standard_id == Standard.id)
        .where(Standard.institution_id == user_inst_id, Division.is_active == True)
    )
    batches_cnt = (await db.execute(batches_q)).scalar() or 0

    # Total batch capacity
    cap_q = (
        select(func.coalesce(func.sum(Division.capacity), 0))
        .join(Standard, Division.standard_id == Standard.id)
        .where(Standard.institution_id == user_inst_id, Division.is_active == True)
    )
    total_capacity = (await db.execute(cap_q)).scalar() or 0

    # Canonical Subjects
    canonical_subjects_cnt = (await db.execute(
        select(func.count(CanonicalSubject.id)).where(CanonicalSubject.is_active == True)
    )).scalar() or 0

    # Subject Mappings
    mappings_q = (
        select(func.count(SubjectMapping.id))
        .join(Standard, SubjectMapping.standard_id == Standard.id)
        .where(Standard.institution_id == user_inst_id, SubjectMapping.is_active == True)
    )
    subject_mappings_cnt = (await db.execute(mappings_q)).scalar() or 0

    # Students (Active & Inactive)
    active_students_cnt = (await db.execute(
        select(func.count(Student.id)).where(Student.institution_id == user_inst_id, Student.is_active == True)
    )).scalar() or 0

    inactive_students_cnt = (await db.execute(
        select(func.count(Student.id)).where(Student.institution_id == user_inst_id, Student.is_active == False)
    )).scalar() or 0

    # Faculty & Staff
    teachers_cnt = (await db.execute(
        select(func.count(User.id)).where(
            User.role.in_(["teacher", "faculty"]),
            User.is_active == True,
        )
    )).scalar() or 0

    staff_cnt = (await db.execute(
        select(func.count(User.id)).where(
            User.role.in_(["staff", "admin", "accountant", "principal"]),
            User.is_active == True,
        )
    )).scalar() or 0

    # Fee Structures & Categories
    fee_categories_cnt = (await db.execute(
        select(func.count(FeeCategory.id)).where(FeeCategory.institution_id == user_inst_id, FeeCategory.is_active == True)
    )).scalar() or 0

    fee_structures_cnt = (await db.execute(
        select(func.count(FeeStructure.id)).where(FeeStructure.institution_id == user_inst_id, FeeStructure.is_active == True)
    )).scalar() or 0

    # Academic Years
    academic_years_cnt = (await db.execute(
        select(func.count(AcademicYear.id)).where(AcademicYear.institution_id == user_inst_id)
    )).scalar() or 0

    # 2. Relational Integrity Health Scanner
    integrity_warnings: List[Dict[str, Any]] = []

    # Check A: Orphaned Batches (Batches where board_id IS NULL)
    orphan_batches_q = (
        select(Division.id, Division.name, Standard.name.label("standard_name"))
        .join(Standard, Division.standard_id == Standard.id)
        .where(
            Standard.institution_id == user_inst_id,
            Division.board_id == None,
            Division.is_active == True,
        )
    )
    orphan_batches = (await db.execute(orphan_batches_q)).all()
    if orphan_batches:
        integrity_warnings.append({
            "code": "ORPHAN_BATCHES",
            "severity": "warning",
            "title": f"{len(orphan_batches)} Batch(es) missing Board affiliation",
            "description": "Batches without an assigned board cannot be filtered accurately in multi-curriculum views.",
            "count": len(orphan_batches),
            "items": [{"id": row.id, "name": row.name, "standard": row.standard_name} for row in orphan_batches[:5]],
            "action_route": "/academic/batches",
        })

    # Check B: Unallocated Active Students (Active enrollment but division_id IS NULL)
    unassigned_enr_q = (
        select(Student.id, Student.admission_number, Student.first_name, Student.last_name, Standard.name.label("standard_name"))
        .join(StudentEnrollment, Student.id == StudentEnrollment.student_id)
        .join(Standard, StudentEnrollment.standard_id == Standard.id)
        .where(
            Student.institution_id == user_inst_id,
            Student.is_active == True,
            StudentEnrollment.status == "active",
            StudentEnrollment.division_id == None,
        )
    )
    unassigned_enr = (await db.execute(unassigned_enr_q)).all()
    if unassigned_enr:
        integrity_warnings.append({
            "code": "UNALLOCATED_STUDENTS",
            "severity": "info",
            "title": f"{len(unassigned_enr)} Student(s) awaiting Batch allocation",
            "description": "Students enrolled in a standard but not yet assigned to an active classroom batch.",
            "count": len(unassigned_enr),
            "items": [
                {"id": r.id, "adm_no": r.admission_number, "name": f"{r.first_name} {r.last_name}", "standard": r.standard_name}
                for r in unassigned_enr[:5]
            ],
            "action_route": "/students/allocations",
        })

    # Check C: Standards without Subject Mappings
    mapped_std_ids = (await db.execute(
        select(SubjectMapping.standard_id).where(SubjectMapping.is_active == True).distinct()
    )).scalars().all()
    unmapped_stds_q = (
        select(Standard.id, Standard.name, Standard.level)
        .where(
            Standard.institution_id == user_inst_id,
            Standard.is_active == True,
            Standard.id.not_in(mapped_std_ids) if mapped_std_ids else True,
        )
    )
    unmapped_stds = (await db.execute(unmapped_stds_q)).all()
    if unmapped_stds:
        integrity_warnings.append({
            "code": "UNMAPPED_STANDARDS",
            "severity": "warning",
            "title": f"{len(unmapped_stds)} Standard(s) without Subject Mappings",
            "description": "Curriculum subjects must be mapped to each standard to enable timetable and examination scheduling.",
            "count": len(unmapped_stds),
            "items": [{"id": s.id, "name": s.name, "level": s.level} for s in unmapped_stds[:5]],
            "action_route": "/academic/subjects",
        })

    # 3. Step-by-Step Onboarding Pipeline Progress
    pipeline_steps = [
        {"step": 1, "key": "academic_year", "label": "Academic Year Setup", "completed": academic_years_cnt > 0, "count": academic_years_cnt},
        {"step": 2, "key": "boards", "label": "Educational Boards", "completed": boards_cnt > 0, "count": boards_cnt},
        {"step": 3, "key": "standards", "label": "Standards / Classes", "completed": standards_cnt > 0, "count": standards_cnt},
        {"step": 4, "key": "subjects", "label": "Canonical Subjects & Mappings", "completed": canonical_subjects_cnt > 0 and subject_mappings_cnt > 0, "count": canonical_subjects_cnt},
        {"step": 5, "key": "batches", "label": "Classroom Batches", "completed": batches_cnt > 0, "count": batches_cnt},
        {"step": 6, "key": "faculty", "label": "Teachers & Staff", "completed": teachers_cnt > 0, "count": teachers_cnt},
        {"step": 7, "key": "fees", "label": "Fee Structures", "completed": fee_structures_cnt > 0, "count": fee_structures_cnt},
        {"step": 8, "key": "admissions", "label": "Student Admissions", "completed": active_students_cnt > 0, "count": active_students_cnt},
    ]
    completed_steps_count = sum(1 for s in pipeline_steps if s["completed"])
    pipeline_percentage = round((completed_steps_count / len(pipeline_steps)) * 100)

    return {
        "institution_id": user_inst_id,
        "counts": {
            "boards": boards_cnt,
            "standards": standards_cnt,
            "batches": batches_cnt,
            "total_capacity": total_capacity,
            "canonical_subjects": canonical_subjects_cnt,
            "subject_mappings": subject_mappings_cnt,
            "active_students": active_students_cnt,
            "inactive_students": inactive_students_cnt,
            "total_students": active_students_cnt + inactive_students_cnt,
            "teachers": teachers_cnt,
            "staff": staff_cnt,
            "fee_categories": fee_categories_cnt,
            "fee_structures": fee_structures_cnt,
            "academic_years": academic_years_cnt,
        },
        "integrity_warnings": integrity_warnings,
        "pipeline": {
            "completed_steps": completed_steps_count,
            "total_steps": len(pipeline_steps),
            "percentage": pipeline_percentage,
            "steps": pipeline_steps,
        },
    }
