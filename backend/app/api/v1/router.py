# /**
#  * @file        router.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      backend.app.api.v1
#  *
#  * @author      Jawahar R. Mallah
#  * @organization AITDL (AI Technology & Development Lab)
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 AITDL
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-03
#  * @updated     2026-11-11
#  *
#  * @description Central v1 API router registering all domain endpoint routers.
#  */

from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth,
    institutions,
    academic_years,
    boards,
    standards,
    divisions,
    students,
    subjects,
    attendance,
    fees,
    payments,
    users,
    dashboard,
    reports,
    examinations,
    import_register,
    student_portal,
    import_export,
    timetable,
    enrollments,
    forms,
    staff,
    sysadmin,
    settings,
    communication,
    releases,
    teacher_payroll,
    codex,
    leads,
    training,
    study_materials,
    navigation,
    governance,
    concessions,
    homework,
    report_intelligence,
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(
    institutions.router, prefix="/institutions", tags=["institutions"]
)
api_router.include_router(
    academic_years.router, prefix="/academic-years", tags=["academic-years"]
)
api_router.include_router(boards.router, prefix="/boards", tags=["boards"])
api_router.include_router(
    standards.router, prefix="/standards", tags=["standards"]
)
api_router.include_router(
    divisions.router, prefix="/divisions", tags=["divisions"]
)
api_router.include_router(students.router, prefix="/students", tags=["students"])
api_router.include_router(subjects.router, prefix="/subjects", tags=["subjects"])
api_router.include_router(
    attendance.router, prefix="/attendance", tags=["attendance"]
)
api_router.include_router(fees.router, prefix="/fees", tags=["fees"])
api_router.include_router(concessions.router, prefix="/fees/concessions", tags=["fee-concessions"])
api_router.include_router(payments.router, prefix="/payments", tags=["payments"])
api_router.include_router(
    report_intelligence.router, prefix="/reports/intelligence", tags=["report-intelligence"]
)
api_router.include_router(reports.router, prefix="/reports", tags=["reports"])
api_router.include_router(
    examinations.router, prefix="/examinations", tags=["examinations"]
)
api_router.include_router(
    import_register.router, prefix="/import/fee-register", tags=["import"]
)
api_router.include_router(
    student_portal.router, prefix="/student-portal", tags=["student-portal"]
)
api_router.include_router(
    import_export.router, prefix="/import-export", tags=["import-export"]
)
api_router.include_router(timetable.router, prefix="/timetable", tags=["timetable"])
api_router.include_router(enrollments.router, prefix="/enrollments", tags=["enrollments"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(forms.router, prefix="/forms", tags=["forms"])
api_router.include_router(staff.router, prefix="/staff", tags=["staff"])
api_router.include_router(sysadmin.router, prefix="/sysadmin", tags=["sysadmin"])
api_router.include_router(settings.router, prefix="/settings", tags=["settings"])
api_router.include_router(communication.router, prefix="/communication", tags=["communication"])
api_router.include_router(releases.router, prefix="/releases", tags=["releases"])

api_router.include_router(teacher_payroll.router, prefix="/teacher-payroll", tags=["teacher-payroll"])
api_router.include_router(codex.router, prefix="/codex", tags=["codex"])
api_router.include_router(leads.router, prefix="/leads", tags=["leads"])
api_router.include_router(training.router, prefix="/training", tags=["training"])
api_router.include_router(study_materials.router, prefix="/study-materials", tags=["study-materials"])
api_router.include_router(navigation.router, prefix="/navigation", tags=["navigation"])
api_router.include_router(governance.router, prefix="/governance", tags=["governance"])
api_router.include_router(homework.router, prefix="/homework", tags=["homework"])

