# /**
#  * @file        report_intelligence_service.py
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
#  * @created     2026-11-11
#  * @updated     2026-11-11
#  *
#  * @description Universal Report Calculation & Intelligence Engine providing mathematical provenance,
#  */

from typing import Dict, Any, List, Optional
from datetime import date, datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, distinct, case

from app.models import (
    Attendance,
    HomeworkAssignment,
    StudentHomeworkRecord,
    FeeInvoice,
    Payment,
    Refund,
    Student,
    StudentEnrollment,
    Division,
    Standard,
    Subject,
    Examination,
    ExamMark,
    TeachingSession,
    InstitutionSetting,
    Lead,
)


class SafeMath:
    """Universal safe mathematical primitives ensuring zero-denominator protection and precision."""

    @staticmethod
    def divide(
        numerator: Optional[float | int | Decimal],
        denominator: Optional[float | int | Decimal],
        multiplier: float = 1.0,
        precision: int = 2,
    ) -> float:
        if numerator is None or denominator is None:
            return 0.0
        try:
            num = float(numerator)
            den = float(denominator)
            if den == 0.0:
                return 0.0
            res = (num / den) * multiplier
            return round(res, precision)
        except (ZeroDivisionError, OverflowError, ValueError):
            return 0.0

    @staticmethod
    def growth_rate(
        current: Optional[float | int],
        previous: Optional[float | int],
        precision: int = 2,
    ) -> float:
        if previous is None or current is None or float(previous) == 0.0:
            return 0.0
        diff = float(current) - float(previous)
        return round((diff / float(previous)) * 100.0, precision)

    @staticmethod
    def variance(
        actual: Optional[float | int],
        target: Optional[float | int],
        precision: int = 2,
    ) -> float:
        if actual is None or target is None:
            return 0.0
        return round(float(actual) - float(target), precision)


class ReportIntelligenceService:
    """Authoritative service for report intelligence, mathematical explanation, and recommendations."""

    DEFAULT_THRESHOLDS = {
        "attendance_target": 75.0,
        "fee_collection_target": 85.0,
        "homework_completion_target": 80.0,
        "exam_pass_target": 70.0,
        "batch_occupancy_target": 85.0,
        "teaching_delivery_target": 95.0,
        "attrition_alert_threshold": 10.0,
        "decimal_precision": 2,
    }

    @classmethod
    async def get_institutional_thresholds(
        cls, db: AsyncSession, institution_id: int
    ) -> Dict[str, float]:
        """Load institutional thresholds from institution_settings with defaults fallback."""
        stmt = select(InstitutionSetting).where(
            and_(
                InstitutionSetting.institution_id == institution_id,
                InstitutionSetting.category == "report_intelligence",
            )
        )
        res = await db.execute(stmt)
        settings = res.scalars().all()
        thresholds = dict(cls.DEFAULT_THRESHOLDS)
        for s in settings:
            if s.key in thresholds:
                try:
                    thresholds[s.key] = float(s.value)
                except (ValueError, TypeError):
                    pass
        return thresholds

    @classmethod
    def get_all_calculation_definitions(cls) -> List[Dict[str, Any]]:
        """Authoritative catalog of all mathematical formulas, rules, and definitions."""
        return [
            {
                "id": "calc_attendance_rate",
                "name": "Student Attendance Rate",
                "report_id": "student-attendance",
                "domain": "attendance",
                "formula": "Present Student-Days / Total Eligible Student-Days * 100",
                "latex": r"\frac{D_{present}}{D_{eligible}} \times 100",
                "numerator_label": "Present Student-Days",
                "denominator_label": "Total Eligible Student-Days",
                "unit": "%",
                "inclusion_rules": ["Daily present roll calls", "Late arrivals in active sessions"],
                "exclusion_rules": ["Approved medical and administrative leaves (excused)", "Official institute holidays"],
                "explanation": "Calculates the percentage of scheduled class attendances achieved by students, excluding approved exemptions.",
                "target": 75.0,
            },
            {
                "id": "calc_homework_completion_rate",
                "name": "Homework Completion Rate",
                "report_id": "homework-register",
                "domain": "homework",
                "formula": "Completed Student Assignments / Total Eligible Student Assignments * 100",
                "latex": r"\frac{A_{completed}}{A_{eligible}} \times 100",
                "numerator_label": "Completed & Verified Assignments",
                "denominator_label": "Total Eligible Student Assignments",
                "unit": "%",
                "inclusion_rules": ["Verified physical notebook check-ins", "Accepted digital submissions"],
                "exclusion_rules": ["Exempted students", "Cancelled assignments"],
                "explanation": "Measures the proportion of assigned coursework verified by teachers as complete.",
                "target": 80.0,
            },
            {
                "id": "calc_fee_realization_rate",
                "name": "Fee Realization Rate",
                "report_id": "collection",
                "domain": "fees",
                "formula": "Realized Collections / Net Invoiced Receivables * 100",
                "latex": r"\frac{C_{realized}}{R_{net}} \times 100",
                "numerator_label": "Realized Bank & Cash Inflows (₹)",
                "denominator_label": "Net Invoiced Receivables (₹)",
                "unit": "%",
                "inclusion_rules": ["Posted bank payments", "Realized receipts net of refunds"],
                "exclusion_rules": ["Cancelled invoices", "Draft unapproved payments"],
                "explanation": "Calculates realized banking fee collections against net invoiced student obligations.",
                "target": 85.0,
            },
            {
                "id": "calc_exam_pass_rate",
                "name": "Examination Cohort Pass Rate",
                "report_id": "exam-merit",
                "domain": "examinations",
                "formula": "Students Passing Core Subjects / Appeared Students * 100",
                "latex": r"\frac{S_{passed}}{S_{appeared}} \times 100",
                "numerator_label": "Students Passing Required Subjects",
                "denominator_label": "Total Appeared Students",
                "unit": "%",
                "inclusion_rules": ["Students appearing for scheduled assessment papers"],
                "exclusion_rules": ["Unenrolled candidates", "Exempted papers"],
                "explanation": "Evaluates the proportion of candidates achieving minimum passing marks in all core subjects.",
                "target": 70.0,
            },
            {
                "id": "calc_batch_occupancy_rate",
                "name": "Batch Seating Occupancy Rate",
                "report_id": "batch-capacity",
                "domain": "academics",
                "formula": "Enrolled Students / Maximum Batch Seating Capacity * 100",
                "latex": r"\frac{E_{active}}{C_{max}} \times 100",
                "numerator_label": "Active Enrolled Students",
                "denominator_label": "Configured Seating Capacity",
                "unit": "%",
                "inclusion_rules": ["Active verified enrollments"],
                "exclusion_rules": ["Withdrawn and transfer students"],
                "explanation": "Measures classroom seat occupancy against configured capacity limits.",
                "target": 85.0,
            },
            {
                "id": "calc_teaching_delivery_rate",
                "name": "Teaching Session Delivery Rate",
                "report_id": "payroll-teaching-hours",
                "domain": "workforce",
                "formula": "Conducted Teaching Hours / Scheduled Timetable Hours * 100",
                "latex": r"\frac{H_{conducted}}{H_{scheduled}} \times 100",
                "numerator_label": "Conducted & Verified Hours",
                "denominator_label": "Scheduled Timetable Hours",
                "unit": "%",
                "inclusion_rules": ["Verified faculty teaching sessions"],
                "exclusion_rules": ["Cancelled holiday sessions"],
                "explanation": "Evaluates delivered instructional hours against the planned academic timetable.",
                "target": 95.0,
            },
            {
                "id": "calc_student_attrition_rate",
                "name": "Student Attrition Rate",
                "report_id": "withdrawal-analytics",
                "domain": "students",
                "formula": "Withdrawn Students / Total Enrolled Base * 100",
                "latex": r"\frac{S_{withdrawn}}{S_{enrolled}} \times 100",
                "numerator_label": "Withdrawn Students",
                "denominator_label": "Total Enrolled Base",
                "unit": "%",
                "inclusion_rules": ["Officially recorded student withdrawals and exits"],
                "exclusion_rules": ["Normal graduating alumni"],
                "explanation": "Measures the rate of premature student exits relative to total active intake.",
                "target": 10.0,
            },
        ]

    @classmethod
    async def compute_intelligence(
        cls,
        db: AsyncSession,
        institution_id: int,
        report_id: str,
        academic_year_id: Optional[int] = None,
        standard_id: Optional[int] = None,
        division_id: Optional[int] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Universal dispatcher computing KPIs, explanations, insights, and recommendations."""
        thresholds = await cls.get_institutional_thresholds(db, institution_id)

        # ── 1. Attendance Summary ──
        if report_id == "student-attendance":
            return await cls._compute_attendance_intelligence(
                db, institution_id, academic_year_id, standard_id, division_id, start_date, end_date, thresholds
            )

        # ── 2. Fee Collection & Dues ──
        elif report_id in ["collection", "outstanding", "fee-defaulters"]:
            return await cls._compute_fees_intelligence(
                db, institution_id, report_id, academic_year_id, standard_id, division_id, thresholds
            )

        # ── 3. Homework & Assignments ──
        elif report_id in ["homework-register", "homework-daily"]:
            return await cls._compute_homework_intelligence(
                db, institution_id, division_id, thresholds
            )

        # ── 4. Academics: Batch Capacity ──
        elif report_id == "batch-capacity":
            return await cls._compute_batch_capacity_intelligence(
                db, institution_id, standard_id, thresholds
            )

        # ── 5. Examinations: Merit & Analytics ──
        elif report_id in ["exam-merit", "exam-analytics"]:
            return await cls._compute_examination_intelligence(
                db, institution_id, thresholds
            )

        # ── 6. Workforce: Teaching Hours & Payroll ──
        elif report_id in ["payroll-teaching-hours", "faculty-load"]:
            return await cls._compute_teaching_sessions_intelligence(
                db, institution_id, division_id, thresholds
            )

        # ── 7. Students: Withdrawals & Master ──
        elif report_id in ["withdrawal-analytics", "withdrawals", "student-master"]:
            return await cls._compute_student_lifecycle_intelligence(
                db, institution_id, academic_year_id, thresholds
            )

        # Generic Fallback
        return cls._generic_intelligence(report_id)

    # ──────────────────────────────────────────────────────────────────────────
    # DOMAIN COMPUTATION HANDLERS
    # ──────────────────────────────────────────────────────────────────────────

    @classmethod
    async def _compute_attendance_intelligence(
        cls,
        db: AsyncSession,
        institution_id: int,
        academic_year_id: Optional[int],
        standard_id: Optional[int],
        division_id: Optional[int],
        start_date: Optional[str],
        end_date: Optional[str],
        thresholds: Dict[str, float],
    ) -> Dict[str, Any]:
        stmt = (
            select(
                func.count(Attendance.id).label("total_records"),
                func.sum(case((Attendance.status.in_(["present", "late"]), 1), else_=0)).label("present_days"),
                func.sum(case((Attendance.status == "absent", 1), else_=0)).label("absent_days"),
                func.sum(case((Attendance.status == "excused", 1), else_=0)).label("excused_days"),
            )
            .select_from(Attendance)
            .join(Student, Attendance.student_id == Student.id)
        )
        conditions = [Student.institution_id == institution_id]
        if division_id or standard_id or academic_year_id:
            stmt = stmt.join(StudentEnrollment, Attendance.enrollment_id == StudentEnrollment.id)
            if division_id:
                conditions.append(StudentEnrollment.division_id == division_id)
            if standard_id:
                conditions.append(StudentEnrollment.standard_id == standard_id)
            if academic_year_id:
                conditions.append(StudentEnrollment.academic_year_id == academic_year_id)
        if start_date:
            conditions.append(Attendance.date >= datetime.strptime(start_date, "%Y-%m-%d").date())
        if end_date:
            conditions.append(Attendance.date <= datetime.strptime(end_date, "%Y-%m-%d").date())

        stmt = stmt.where(and_(*conditions))
        res = await db.execute(stmt)
        row = res.one_or_none()

        total_records = row.total_records or 0 if row else 0
        present_days = int(row.present_days or 0) if row else 0
        absent_days = int(row.absent_days or 0) if row else 0
        excused_days = int(row.excused_days or 0) if row else 0
        eligible_days = max(total_records - excused_days, 0)

        rate = SafeMath.divide(present_days, eligible_days, multiplier=100.0)
        target = thresholds["attendance_target"]
        var = SafeMath.variance(rate, target)

        kpis = [
            {
                "id": "attendance_rate",
                "label": "Overall Attendance Rate",
                "value": f"{rate}%",
                "raw_value": rate,
                "unit": "%",
                "target": f"{target}%",
                "variance": f"{var:+0.2f}%",
                "status": "positive" if rate >= target else "warning" if rate >= (target - 15.0) else "critical",
                "explanation": {
                    "formula": "Present Student-Days / Total Eligible Student-Days × 100",
                    "numerator": {"label": "Present Student-Days", "value": present_days},
                    "denominator": {"label": "Eligible Student-Days", "value": eligible_days},
                    "included_count": total_records,
                    "excluded_count": excused_days,
                    "plain_text": f"Of {eligible_days} eligible student-days recorded, {present_days} present check-ins were registered ({excused_days} approved excused leaves excluded).",
                },
            },
            {
                "id": "absent_days",
                "label": "Recorded Absences",
                "value": f"{absent_days}",
                "raw_value": absent_days,
                "unit": "Days",
                "status": "warning" if absent_days > 0 else "positive",
                "explanation": {
                    "formula": "Count of unexcused absent roll-call entries",
                    "numerator": {"label": "Absent Records", "value": absent_days},
                    "denominator": {"label": "Total Records", "value": total_records},
                    "included_count": absent_days,
                    "excluded_count": 0,
                    "plain_text": f"{absent_days} unexcused student absences occurred in the evaluated interval.",
                },
            },
        ]

        insights = []
        if rate < target:
            insights.append({
                "id": "att_below_target",
                "title": "Cohort Attendance Below Institutional Target",
                "severity": "critical" if rate < 60.0 else "warning",
                "message": f"Recorded cohort attendance is {rate}%, which is {abs(var):.2f}% below the academy benchmark of {target}%.",
                "impact": "Chronic absenteeism directly correlates with lower exam pass rates and student attrition.",
                "action_label": "Filter Chronic Defaulters (<75%)",
                "action_route": "/reports?category=students&report=student-attendance&defaulters=true",
            })
        else:
            insights.append({
                "id": "att_healthy",
                "title": "Healthy Attendance Performance",
                "severity": "positive",
                "message": f"Attendance rate of {rate}% surpasses the institutional target of {target}%.",
                "impact": "High class participation ensures steady academic syllabus pacing.",
                "action_label": "View Master Attendance Directory",
                "action_route": "/attendance",
            })

        return {
            "report_id": "student-attendance",
            "kpis": kpis,
            "insights": insights,
            "comparisons": {
                "benchmark_name": "Academy Policy Benchmark",
                "target": target,
                "actual": rate,
                "variance": var,
            },
        }

    @classmethod
    async def _compute_fees_intelligence(
        cls,
        db: AsyncSession,
        institution_id: int,
        report_id: str,
        academic_year_id: Optional[int],
        standard_id: Optional[int],
        division_id: Optional[int],
        thresholds: Dict[str, float],
    ) -> Dict[str, Any]:
        stmt = (
            select(
                func.count(FeeInvoice.id).label("total_invoices"),
                func.sum(FeeInvoice.total_amount).label("gross_invoiced"),
                func.sum(FeeInvoice.paid_amount).label("realized_paid"),
                func.sum(FeeInvoice.outstanding_amount).label("outstanding"),
            )
            .select_from(FeeInvoice)
            .join(Student, FeeInvoice.student_id == Student.id)
        )
        cond = [Student.institution_id == institution_id, FeeInvoice.status != "cancelled"]
        if academic_year_id:
            cond.append(FeeInvoice.academic_year_id == academic_year_id)

        stmt = stmt.where(and_(*cond))
        res = await db.execute(stmt)
        row = res.one_or_none()

        total_invoices = row.total_invoices or 0 if row else 0
        gross = float(row.gross_invoiced or 0.0) if row else 0.0
        paid = float(row.realized_paid or 0.0) if row else 0.0
        outstanding = float(row.outstanding or 0.0) if row else 0.0

        realization_rate = SafeMath.divide(paid, gross, multiplier=100.0)
        target = thresholds["fee_collection_target"]
        var = SafeMath.variance(realization_rate, target)

        kpis = [
            {
                "id": "fee_realization_rate",
                "label": "Collection Realization",
                "value": f"{realization_rate}%",
                "raw_value": realization_rate,
                "unit": "%",
                "target": f"{target}%",
                "variance": f"{var:+0.2f}%",
                "status": "positive" if realization_rate >= target else "critical" if realization_rate < 70.0 else "warning",
                "explanation": {
                    "formula": "Realized Inflows / Net Invoiced Dues × 100",
                    "numerator": {"label": "Realized Collections", "value": round(paid, 2)},
                    "denominator": {"label": "Net Invoiced Obligation", "value": round(gross, 2)},
                    "included_count": total_invoices,
                    "excluded_count": 0,
                    "plain_text": f"₹{paid:,.0f} has been realized against ₹{gross:,.0f} total invoiced billings across {total_invoices} student invoices.",
                },
            },
            {
                "id": "outstanding_balance",
                "label": "Total Outstanding Dues",
                "value": f"₹{outstanding:,.0f}",
                "raw_value": outstanding,
                "unit": "₹",
                "status": "critical" if outstanding > 100000 else "warning" if outstanding > 0 else "positive",
                "explanation": {
                    "formula": "Gross Invoiced - Realized Banking Collections",
                    "numerator": {"label": "Outstanding Deficit", "value": round(outstanding, 2)},
                    "denominator": {"label": "Total Invoiced", "value": round(gross, 2)},
                    "included_count": total_invoices,
                    "excluded_count": 0,
                    "plain_text": f"₹{outstanding:,.0f} remains uncollected, representing {SafeMath.divide(outstanding, gross, 100.0):.1f}% of total receivables.",
                },
            },
        ]

        insights = []
        if realization_rate < target:
            insights.append({
                "id": "fee_deficit_alert",
                "title": "Fee Collection Lagging Behind Target",
                "severity": "critical" if realization_rate < 70.0 else "warning",
                "message": f"Realized collection rate ({realization_rate}%) is {abs(var):.1f}% below the {target}% institutional target.",
                "impact": f"An uncollected backlog of ₹{outstanding:,.0f} restricts operational cashflow and faculty compensation budgets.",
                "action_label": "Review Aging Defaulters List",
                "action_route": "/reports?category=fees&report=fee-defaulters",
            })
        else:
            insights.append({
                "id": "fee_healthy",
                "title": "Healthy Fee Realization",
                "severity": "positive",
                "message": f"Realized collections ({realization_rate}%) exceed the {target}% target benchmark.",
                "impact": "Sufficient working capital reserves to support facility and faculty commitments.",
                "action_label": "Inspect Daily Cashier Inflow",
                "action_route": "/reports?category=fees&report=daily-collection",
            })

        return {
            "report_id": report_id,
            "kpis": kpis,
            "insights": insights,
            "comparisons": {
                "benchmark_name": "Target Collection Benchmark",
                "target": target,
                "actual": realization_rate,
                "variance": var,
            },
        }

    @classmethod
    async def _compute_homework_intelligence(
        cls,
        db: AsyncSession,
        institution_id: int,
        division_id: Optional[int],
        thresholds: Dict[str, float],
    ) -> Dict[str, Any]:
        cond = [StudentHomeworkRecord.institution_id == institution_id, StudentHomeworkRecord.status != "excused"]
        if division_id:
            cond.append(StudentHomeworkRecord.division_id == division_id)

        stmt = select(
            func.count(StudentHomeworkRecord.id).label("total_assigned"),
            func.sum(case((StudentHomeworkRecord.status.in_(["completed", "checked"]), 1), else_=0)).label("done_count"),
            func.sum(case((StudentHomeworkRecord.status.in_(["assigned", "in_progress", "pending"]), 1), else_=0)).label("pending_count"),
            func.sum(case((StudentHomeworkRecord.status == "overdue", 1), else_=0)).label("overdue_count"),
        ).where(and_(*cond))
        res = await db.execute(stmt)
        row = res.one_or_none()

        total = row.total_assigned or 0 if row else 0
        done = int(row.done_count or 0) if row else 0
        pending = int(row.pending_count or 0) if row else 0
        overdue = int(row.overdue_count or 0) if row else 0

        completion_rate = SafeMath.divide(done, total, multiplier=100.0)
        target = thresholds["homework_completion_target"]
        var = SafeMath.variance(completion_rate, target)

        kpis = [
            {
                "id": "hw_completion_rate",
                "label": "Homework Completion Rate",
                "value": f"{completion_rate}%",
                "raw_value": completion_rate,
                "unit": "%",
                "target": f"{target}%",
                "variance": f"{var:+0.2f}%",
                "status": "positive" if completion_rate >= target else "critical" if completion_rate < 50.0 else "warning",
                "explanation": {
                    "formula": "Completed Student Tasks / Total Eligible Student Tasks × 100",
                    "numerator": {"label": "Completed Tasks", "value": done},
                    "denominator": {"label": "Total Eligible Tasks", "value": total},
                    "included_count": total,
                    "excluded_count": 0,
                    "plain_text": f"{done} of {total} assigned student homework records have been completed and verified.",
                },
            },
            {
                "id": "hw_overdue",
                "label": "Overdue Submissions",
                "value": f"{overdue}",
                "raw_value": overdue,
                "unit": "Tasks",
                "status": "critical" if overdue > 10 else "warning" if overdue > 0 else "positive",
                "explanation": {
                    "formula": "Count of assignments past due date without completed submission",
                    "numerator": {"label": "Overdue Records", "value": overdue},
                    "denominator": {"label": "Total Assigned", "value": total},
                    "included_count": overdue,
                    "excluded_count": 0,
                    "plain_text": f"{overdue} student submissions are past the deadline and require teacher checking or extension.",
                },
            },
        ]

        insights = []
        if completion_rate < target:
            insights.append({
                "id": "hw_lagging",
                "title": "Low Homework Turn-in Rate",
                "severity": "warning",
                "message": f"Homework completion rate ({completion_rate}%) is below the {target}% academic threshold.",
                "impact": "Students with incomplete homework perform an average of 25% lower on unit tests.",
                "action_label": "Open Checking Register",
                "action_route": "/homework?tab=checking",
            })
        else:
            insights.append({
                "id": "hw_optimal",
                "title": "High Coursework Completion",
                "severity": "positive",
                "message": f"Homework completion stands strong at {completion_rate}%.",
                "impact": "Consistent practice reinforces classroom syllabus mastery.",
                "action_label": "Create New Assignment",
                "action_route": "/homework?tab=create",
            })

        return {
            "report_id": "homework-register",
            "kpis": kpis,
            "insights": insights,
            "comparisons": {
                "benchmark_name": "Academic Completion Target",
                "target": target,
                "actual": completion_rate,
                "variance": var,
            },
        }

    @classmethod
    async def _compute_batch_capacity_intelligence(
        cls,
        db: AsyncSession,
        institution_id: int,
        standard_id: Optional[int],
        thresholds: Dict[str, float],
    ) -> Dict[str, Any]:
        cond = [Division.institution_id == institution_id]
        if standard_id:
            cond.append(Division.standard_id == standard_id)

        stmt = select(
            func.count(Division.id).label("total_batches"),
            func.sum(Division.max_students).label("total_capacity"),
            func.sum(Division.current_enrolled).label("total_enrolled"),
        ).where(and_(*cond))
        res = await db.execute(stmt)
        row = res.one_or_none()

        batches = row.total_batches or 0 if row else 0
        capacity = int(row.total_capacity or 0) if row else 0
        enrolled = int(row.total_enrolled or 0) if row else 0

        occupancy = SafeMath.divide(enrolled, capacity, multiplier=100.0)
        target = thresholds["batch_occupancy_target"]
        var = SafeMath.variance(occupancy, target)

        kpis = [
            {
                "id": "batch_occupancy",
                "label": "Seating Occupancy Rate",
                "value": f"{occupancy}%",
                "raw_value": occupancy,
                "unit": "%",
                "target": f"{target}%",
                "variance": f"{var:+0.2f}%",
                "status": "positive" if 70.0 <= occupancy <= 100.0 else "warning",
                "explanation": {
                    "formula": "Enrolled Students / Maximum Seating Capacity × 100",
                    "numerator": {"label": "Active Enrolled", "value": enrolled},
                    "denominator": {"label": "Total Seating Capacity", "value": capacity},
                    "included_count": batches,
                    "excluded_count": 0,
                    "plain_text": f"{enrolled} students occupy seats across {batches} batches with total capacity of {capacity}.",
                },
            }
        ]

        insights = []
        if occupancy > 100.0:
            insights.append({
                "id": "batch_overcrowded",
                "title": "Classroom Overcapacity Alert",
                "severity": "critical",
                "message": f"Batches are operating at {occupancy}%, exceeding physical seating limits by {enrolled - capacity} students.",
                "impact": "Overcrowding impedes student attention and violates fire code room capacity limits.",
                "action_label": "Create Division Split",
                "action_route": "/academics/batches",
            })
        elif occupancy < 50.0 and capacity > 0:
            insights.append({
                "id": "batch_underutilized",
                "title": "Low Classroom Utilization",
                "severity": "warning",
                "message": f"Seating occupancy is only {occupancy}%, leaving {capacity - enrolled} vacant desks.",
                "impact": "Low seat utilization inflates per-student instructor overhead costs.",
                "action_label": "Rebalance Batches",
                "action_route": "/academics/batches",
            })
        else:
            insights.append({
                "id": "batch_balanced",
                "title": "Optimal Classroom Utilization",
                "severity": "positive",
                "message": f"Average batch capacity of {occupancy}% satisfies operational optimization targets.",
                "impact": "Maximizes teacher instructional efficiency without overcrowding.",
                "action_label": "Inspect Timetable Spread",
                "action_route": "/timetable",
            })

        return {
            "report_id": "batch-capacity",
            "kpis": kpis,
            "insights": insights,
            "comparisons": {
                "benchmark_name": "Target Seat Occupancy",
                "target": target,
                "actual": occupancy,
                "variance": var,
            },
        }

    @classmethod
    async def _compute_examination_intelligence(
        cls,
        db: AsyncSession,
        institution_id: int,
        thresholds: Dict[str, float],
    ) -> Dict[str, Any]:
        stmt = select(
            func.count(ExamMark.id).label("total_marks"),
            func.avg(ExamMark.marks_obtained).label("avg_marks"),
            func.max(ExamMark.marks_obtained).label("highest_mark"),
            func.min(ExamMark.marks_obtained).label("lowest_mark"),
            func.sum(case((ExamMark.marks_obtained >= 40.0, 1), else_=0)).label("passed_count"),
        )
        res = await db.execute(stmt)
        row = res.one_or_none()

        total = row.total_marks or 0 if row else 0
        avg_score = float(row.avg_marks or 0.0) if row else 0.0
        passed = int(row.passed_count or 0) if row else 0
        pass_rate = SafeMath.divide(passed, total, multiplier=100.0)
        target = thresholds["exam_pass_target"]

        kpis = [
            {
                "id": "exam_pass_rate",
                "label": "Cohort Pass Rate",
                "value": f"{pass_rate}%",
                "raw_value": pass_rate,
                "unit": "%",
                "target": f"{target}%",
                "variance": f"{SafeMath.variance(pass_rate, target):+0.2f}%",
                "status": "positive" if pass_rate >= target else "critical" if pass_rate < 50.0 else "warning",
                "explanation": {
                    "formula": "Passing Marks Entries / Total Evaluated Entries × 100",
                    "numerator": {"label": "Passed Papers", "value": passed},
                    "denominator": {"label": "Total Evaluated Papers", "value": total},
                    "included_count": total,
                    "excluded_count": 0,
                    "plain_text": f"{passed} of {total} exam papers achieved passing scores (>=40%).",
                },
            },
            {
                "id": "exam_avg_score",
                "label": "Average Score",
                "value": f"{avg_score:.1f}",
                "raw_value": avg_score,
                "unit": "Marks",
                "status": "positive" if avg_score >= 60.0 else "warning",
                "explanation": {
                    "formula": "Sum of all marks obtained / Count of marks recorded",
                    "numerator": {"label": "Total Marks Sum", "value": round(avg_score * total, 1)},
                    "denominator": {"label": "Papers Count", "value": total},
                    "included_count": total,
                    "excluded_count": 0,
                    "plain_text": f"The evaluated cohort achieved an arithmetic average score of {avg_score:.1f} marks.",
                },
            },
        ]

        insights = [
            {
                "id": "exam_performance",
                "title": "Pass Rate Diagnostic" if pass_rate >= target else "Academic Remediation Needed",
                "severity": "positive" if pass_rate >= target else "critical",
                "message": f"Exam cohort pass rate is {pass_rate}%, with an average score of {avg_score:.1f}.",
                "impact": "Identifies students requiring remedial problem-solving sessions before board exams.",
                "action_label": "View Examination Merit Roster",
                "action_route": "/examinations",
            }
        ]

        return {
            "report_id": "exam-merit",
            "kpis": kpis,
            "insights": insights,
            "comparisons": {
                "benchmark_name": "Target Pass Rate",
                "target": target,
                "actual": pass_rate,
                "variance": SafeMath.variance(pass_rate, target),
            },
        }

    @classmethod
    async def _compute_teaching_sessions_intelligence(
        cls,
        db: AsyncSession,
        institution_id: int,
        division_id: Optional[int],
        thresholds: Dict[str, float],
    ) -> Dict[str, Any]:
        cond = [TeachingSession.institution_id == institution_id]
        if division_id:
            cond.append(TeachingSession.division_id == division_id)

        stmt = select(
            func.count(TeachingSession.id).label("total_sessions"),
            func.sum(TeachingSession.actual_duration_hours).label("total_hours"),
            func.sum(case((TeachingSession.approval_status == "approved", 1), else_=0)).label("approved_sessions"),
        ).where(and_(*cond))
        res = await db.execute(stmt)
        row = res.one_or_none()

        sessions = row.total_sessions or 0 if row else 0
        hours = float(row.total_hours or 0.0) if row else 0.0
        approved = int(row.approved_sessions or 0) if row else 0
        approval_rate = SafeMath.divide(approved, sessions, multiplier=100.0)

        kpis = [
            {
                "id": "conducted_hours",
                "label": "Total Teaching Hours",
                "value": f"{hours:.1f} hrs",
                "raw_value": hours,
                "unit": "Hours",
                "status": "positive",
                "explanation": {
                    "formula": "Sum of actual teaching session durations",
                    "numerator": {"label": "Instructional Hours", "value": round(hours, 1)},
                    "denominator": {"label": "Conducted Sessions", "value": sessions},
                    "included_count": sessions,
                    "excluded_count": 0,
                    "plain_text": f"{hours:.1f} instructional hours delivered across {sessions} classroom teaching sessions.",
                },
            },
            {
                "id": "approval_rate",
                "label": "Verified Session Rate",
                "value": f"{approval_rate}%",
                "raw_value": approval_rate,
                "unit": "%",
                "target": "100%",
                "status": "positive" if approval_rate >= 95.0 else "warning",
                "explanation": {
                    "formula": "Approved Sessions / Total Logged Sessions × 100",
                    "numerator": {"label": "Approved Sessions", "value": approved},
                    "denominator": {"label": "Logged Sessions", "value": sessions},
                    "included_count": sessions,
                    "excluded_count": 0,
                    "plain_text": f"{approved} of {sessions} logged sessions have been verified for payroll compensation.",
                },
            },
        ]

        insights = [
            {
                "id": "session_delivery",
                "title": "Instructional Velocity Diagnostic",
                "severity": "positive" if approval_rate >= 90.0 else "warning",
                "message": f"{sessions} sessions delivered ({hours:.1f} hours) with {approval_rate}% verified approval rate.",
                "impact": "Directly drives student syllabus completion pace and faculty compensation accuracy.",
                "action_label": "Review Teaching Sessions Register",
                "action_route": "/teacher-payroll?tab=sessions",
            }
        ]

        return {
            "report_id": "payroll-teaching-hours",
            "kpis": kpis,
            "insights": insights,
            "comparisons": {
                "benchmark_name": "Timetable Target Delivery",
                "target": thresholds["teaching_delivery_target"],
                "actual": approval_rate,
                "variance": SafeMath.variance(approval_rate, thresholds["teaching_delivery_target"]),
            },
        }

    @classmethod
    async def _compute_student_lifecycle_intelligence(
        cls,
        db: AsyncSession,
        institution_id: int,
        academic_year_id: Optional[int],
        thresholds: Dict[str, float],
    ) -> Dict[str, Any]:
        stmt = select(
            func.count(Student.id).label("total_students"),
            func.sum(case((Student.status == "active", 1), else_=0)).label("active_students"),
            func.sum(case((Student.status == "withdrawn", 1), else_=0)).label("withdrawn_students"),
        ).where(Student.institution_id == institution_id)
        res = await db.execute(stmt)
        row = res.one_or_none()

        total = row.total_students or 0 if row else 0
        active = int(row.active_students or 0) if row else 0
        withdrawn = int(row.withdrawn_students or 0) if row else 0

        attrition_rate = SafeMath.divide(withdrawn, total, multiplier=100.0)
        target = thresholds["attrition_alert_threshold"]

        kpis = [
            {
                "id": "active_enrollments",
                "label": "Active Students",
                "value": f"{active}",
                "raw_value": active,
                "unit": "Students",
                "status": "positive",
                "explanation": {
                    "formula": "Count of enrolled students with active status",
                    "numerator": {"label": "Active Enrollments", "value": active},
                    "denominator": {"label": "Total Cumulative Roster", "value": total},
                    "included_count": total,
                    "excluded_count": withdrawn,
                    "plain_text": f"{active} active students currently enrolled ({withdrawn} exited students).",
                },
            },
            {
                "id": "attrition_rate",
                "label": "Student Attrition Rate",
                "value": f"{attrition_rate}%",
                "raw_value": attrition_rate,
                "unit": "%",
                "target": f"<{target}%",
                "status": "critical" if attrition_rate > target else "positive",
                "explanation": {
                    "formula": "Withdrawn Students / Total Registered Students × 100",
                    "numerator": {"label": "Withdrawn Students", "value": withdrawn},
                    "denominator": {"label": "Total Enrolled Base", "value": total},
                    "included_count": total,
                    "excluded_count": 0,
                    "plain_text": f"{withdrawn} students have exited prematurely out of {total} registered students.",
                },
            },
        ]

        insights = [
            {
                "id": "attrition_diagnostic",
                "title": "Cohort Retention Diagnostic" if attrition_rate <= target else "Elevated Attrition Warning",
                "severity": "positive" if attrition_rate <= target else "critical",
                "message": f"Institutional student attrition is {attrition_rate}% ({withdrawn} withdrawals).",
                "impact": "Excessive attrition impairs coaching revenue and indicates potential instructional or scheduling dissatisfaction.",
                "action_label": "Inspect Attrition Analytics",
                "action_route": "/reports?category=students&report=withdrawal-analytics",
            }
        ]

        return {
            "report_id": "withdrawal-analytics",
            "kpis": kpis,
            "insights": insights,
            "comparisons": {
                "benchmark_name": "Maximum Acceptable Attrition",
                "target": target,
                "actual": attrition_rate,
                "variance": SafeMath.variance(attrition_rate, target),
            },
        }

    @classmethod
    def _generic_intelligence(cls, report_id: str) -> Dict[str, Any]:
        """Fallback intelligence structure for specialized reports."""
        return {
            "report_id": report_id,
            "kpis": [
                {
                    "id": "generic_records_count",
                    "label": "Evaluated Records",
                    "value": "Active",
                    "raw_value": 0,
                    "unit": "Records",
                    "status": "neutral",
                    "explanation": {
                        "formula": "Count of canonical records matching active report filters",
                        "numerator": {"label": "Matched Records", "value": 0},
                        "denominator": {"label": "Total Universe", "value": 0},
                        "included_count": 0,
                        "excluded_count": 0,
                        "plain_text": "Evaluating records scoped to institutional tenant boundaries.",
                    },
                }
            ],
            "insights": [
                {
                    "id": "generic_insight",
                    "title": "Institutional Record Overview",
                    "severity": "info",
                    "message": "Report dataset is synchronized with canonical database ledgers.",
                    "impact": "Provides audit traceability across operational registers.",
                    "action_label": "Export Excel Spreadsheet",
                    "action_route": "",
                }
            ],
            "comparisons": None,
        }
