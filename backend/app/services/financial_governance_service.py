# /**
#  * @file        financial_governance_service.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      backend.app.services.financial_governance
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
#  * @description Centralized Single Source of Truth (SSOT) Financial Governance Engine unifying Concessions, Fee Waivers, Scholarships, Sponsor Funding, Collections, Refunds, Reversals, 7 Dashboards, 20 Governed Reports, Reconciliation, and Drill-Down Traceability.
#  */

from dataclasses import dataclass
from datetime import date, datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Dict, List, Optional, Tuple
import csv
import io

from sqlalchemy import select, func, and_, or_, case, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.academic_year import AcademicYear
from app.models.board import Board
from app.models.division import Division
from app.models.enrollment import StudentEnrollment
from app.models.fee import (
    FeeCategory,
    FeeConcessionAllocation,
    FeeConcessionType,
    FeeInvoice,
    FeeInvoiceItem,
    FeeStructure,
    SponsorSettlement,
    StudentConcessionApplication,
    StudentFeeAssignment,
)
from app.models.institution import Institution
from app.models.payment import Payment, PaymentAllocation, PaymentReceipt, Refund
from app.models.settings import InstitutionSetting
from app.models.standard import Standard
from app.models.student import Student
from app.models.user import AuditLog, User


POSTED_CONCESSION_STATUSES = ("applied", "posted", "partially_applied")
APPROVED_CONCESSION_STATUSES = ("approved", "applied", "posted", "partially_applied")
PENDING_CONCESSION_STATUSES = ("draft", "submitted", "under_verification", "pending_approval")
INACTIVE_CANCELLED_STATUSES = ("cancelled", "withdrawn")


CONCESSION_REPORT_DEFINITIONS: Dict[str, Dict[str, str]] = {
    "complete-concession-register": {
        "title": "Complete Concession Register",
        "category": "Concessions & Scholarships",
    },
    "complete-fee-waiver-register": {
        "title": "Complete Fee Waiver Register",
        "category": "Concessions & Scholarships",
    },
    "student-concession-statement": {
        "title": "Student-wise Concession Statement",
        "category": "Concessions & Scholarships",
    },
    "class-wise-concession": {
        "title": "Class-wise Concession Report",
        "category": "Concessions & Scholarships",
    },
    "division-wise-concession": {
        "title": "Division-wise Concession Report",
        "category": "Concessions & Scholarships",
    },
    "scheme-wise-scholarship": {
        "title": "Scheme-wise Scholarship Report",
        "category": "Concessions & Scholarships",
    },
    "approved-vs-applied": {
        "title": "Approved vs Applied Concession Report",
        "category": "Concessions & Scholarships",
    },
    "pending-approval": {
        "title": "Pending Approval Report",
        "category": "Concessions & Scholarships",
    },
    "full-fee-waiver": {
        "title": "Full Fee Waiver Report",
        "category": "Concessions & Scholarships",
    },
    "partial-fee-waiver": {
        "title": "Partial Fee Waiver Report",
        "category": "Concessions & Scholarships",
    },
    "sponsor-funded-scholarship": {
        "title": "Sponsor-funded Scholarship Report",
        "category": "Concessions & Scholarships",
    },
    "expired-benefits": {
        "title": "Expired Benefits Report",
        "category": "Concessions & Scholarships",
    },
    "cancelled-benefits": {
        "title": "Cancelled Benefits Report",
        "category": "Concessions & Scholarships",
    },
    "reversal-adjustment": {
        "title": "Reversal and Adjustment Report",
        "category": "Concessions & Scholarships",
    },
    "installment-wise-concession": {
        "title": "Installment-wise Concession Report",
        "category": "Concessions & Scholarships",
    },
    "fee-collection-vs-concession": {
        "title": "Fee Collection vs Concession Reconciliation",
        "category": "Concessions & Scholarships",
    },
    "academic-year-comparison": {
        "title": "Academic Year Comparison",
        "category": "Concessions & Scholarships",
    },
    "user-wise-approval-audit": {
        "title": "User-wise Approval Audit Report",
        "category": "Concessions & Scholarships",
    },
    "concession-eligibility-utilization": {
        "title": "Concession Eligibility and Utilization Report",
        "category": "Concessions & Scholarships",
    },
    "complete-student-benefit-register": {
        "title": "Complete Student Benefit Register",
        "category": "Concessions & Scholarships",
    },
}


@dataclass
class FinancialFilter:
    institution_id: Optional[int] = None
    academic_year_id: Optional[int] = None
    standard_id: Optional[int] = None
    division_id: Optional[int] = None
    board_id: Optional[int] = None
    student_id: Optional[int] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    search: Optional[str] = None
    status: Optional[str] = None
    funding_source: Optional[str] = None
    benefit_type: Optional[str] = None
    student_status: Optional[str] = None  # 'active' | 'all' | 'left' | etc.
    is_demo: Optional[bool] = False


def _quantize(val: Any, precision: int = 2) -> float:
    d = Decimal(str(val or 0))
    fmt = "1" if precision <= 0 else f"0.{'0' * precision}"
    return float(d.quantize(Decimal(fmt), rounding=ROUND_HALF_UP))


def _latest_enrollment_sq():
    return (
        select(
            StudentEnrollment.id.label("id"),
            StudentEnrollment.student_id.label("student_id"),
            StudentEnrollment.academic_year_id.label("academic_year_id"),
            StudentEnrollment.standard_id.label("standard_id"),
            StudentEnrollment.division_id.label("division_id"),
            StudentEnrollment.status.label("status"),
            StudentEnrollment.enrollment_date.label("enrollment_date"),
        )
        .distinct(StudentEnrollment.student_id, StudentEnrollment.academic_year_id)
        .order_by(
            StudentEnrollment.student_id,
            StudentEnrollment.academic_year_id,
            StudentEnrollment.id.desc(),
        )
        .subquery("gov_latest_enr")
    )


def _active_student_category_case(enr_sq):
    st_col = enr_sq.c.status
    return case(
        (st_col == "transferred", "transferred"),
        (
            or_(
                Student.exit_date.isnot(None),
                Student.exit_reason.isnot(None),
                st_col.in_(["withdrawn", "left", "discontinued", "dropped"]),
            ),
            "left",
        ),
        (st_col == "cancelled", "cancelled"),
        (
            or_(
                and_(Student.is_active == False, Student.exit_date.is_(None), Student.exit_reason.is_(None)),
                st_col == "inactive",
            ),
            "inactive",
        ),
        else_="active",
    )


class FinancialGovernanceService:
    """
    Canonical SSOT financial governance service.
    Guarantees every dashboard, report, student dossier, and ledger reconciliation
    derives metrics from the exact same database definitions and transaction states.
    """

    @staticmethod
    async def get_currency_config(db: AsyncSession, institution_id: Optional[int] = 1) -> Dict[str, Any]:
        inst_id = institution_id or 1
        rows = (
            await db.execute(
                select(InstitutionSetting).where(
                    InstitutionSetting.institution_id == inst_id,
                    InstitutionSetting.key.in_(["currency_code", "currency_symbol", "currency_precision"]),
                )
            )
        ).scalars().all()
        cfg = {"code": "INR", "symbol": "₹", "precision": 2}
        for r in rows:
            if r.key == "currency_code" and r.value:
                cfg["code"] = r.value.strip()
            elif r.key == "currency_symbol" and r.value:
                cfg["symbol"] = r.value.strip()
            elif r.key == "currency_precision" and r.value and r.value.isdigit():
                cfg["precision"] = max(0, min(4, int(r.value)))
        return cfg

    @staticmethod
    def resolve_benefit_classification(
        category: Optional[str],
        funding_source: Optional[str],
        calculation_type: Optional[str],
        explicit_benefit_type: Optional[str] = None,
    ) -> Tuple[str, Optional[str]]:
        """
        Determines governed transaction classification & waiver scope:
        Returns (benefit_type, waiver_scope).
        """
        if funding_source in ("external_sponsor", "government") or category == "external_sponsor":
            return "sponsor_funding", None
        if explicit_benefit_type in ("fee_concession", "fee_waiver", "scholarship", "sponsor_funding"):
            btype = explicit_benefit_type
        elif category == "fee_waiver" or calculation_type == "full_waiver":
            btype = "fee_waiver"
        elif category == "merit":
            btype = "scholarship"
        else:
            btype = "fee_concession"

        waiver_scope = None
        if btype == "fee_waiver":
            waiver_scope = "full_waiver" if calculation_type == "full_waiver" else "partial_waiver"
        return btype, waiver_scope

    @classmethod
    def _apply_student_academic_filters(cls, stmt, latest_enr, flt: FinancialFilter, has_division: bool = False):
        if flt.institution_id:
            stmt = stmt.where(Student.institution_id == flt.institution_id)
        if flt.is_demo is not None:
            stmt = stmt.where(Student.is_demo == flt.is_demo)
        if flt.student_id:
            stmt = stmt.where(Student.id == flt.student_id)
        if flt.standard_id:
            stmt = stmt.where(latest_enr.c.standard_id == flt.standard_id)
        if flt.division_id:
            stmt = stmt.where(latest_enr.c.division_id == flt.division_id)
        if flt.board_id:
            if not has_division:
                stmt = stmt.outerjoin(Division, latest_enr.c.division_id == Division.id)
            stmt = stmt.where(Division.board_id == flt.board_id)
        if flt.search and flt.search.strip():
            s = f"%{flt.search.strip()}%"
            stmt = stmt.where(
                or_(
                    Student.first_name.ilike(s),
                    Student.last_name.ilike(s),
                    Student.admission_number.ilike(s),
                )
            )
        if flt.student_status and flt.student_status not in ("all", "default", "include_all"):
            cat_expr = _active_student_category_case(latest_enr)
            norm = flt.student_status.strip().lower()
            if norm in ("active", "enrolled"):
                stmt = stmt.where(cat_expr == "active")
            elif norm in ("left", "withdrawn", "discontinued"):
                stmt = stmt.where(cat_expr == "left")
            elif norm in ("inactive", "on_hold", "transferred", "cancelled"):
                stmt = stmt.where(cat_expr == norm.replace("on_hold", "inactive"))
        return stmt

    @classmethod
    async def get_governed_summary(
        cls,
        db: AsyncSession,
        flt: FinancialFilter,
    ) -> Dict[str, Any]:
        """
        Unified transactional financial summary shared across ALL dashboards and reports.
        Zero client math, zero hardcoded numbers, zero unapplied concession pollution.
        """
        currency = await cls.get_currency_config(db, flt.institution_id)
        prec = currency["precision"]
        latest_enr = _latest_enrollment_sq()

        # 1. Invoice Assessment, Reductions, Paid, Outstanding (status != 'cancelled')
        inv_stmt = (
            select(
                func.count(FeeInvoice.id).label("invoice_count"),
                func.count(func.distinct(FeeInvoice.student_id)).label("billed_students"),
                func.coalesce(func.sum(FeeInvoice.total_amount), 0).label("gross_assessed"),
                func.coalesce(func.sum(FeeInvoice.discount_amount), 0).label("invoice_discounts"),
                func.coalesce(func.sum(FeeInvoice.net_amount), 0).label("net_due"),
                func.coalesce(func.sum(FeeInvoice.paid_amount), 0).label("invoice_paid"),
                func.coalesce(
                    func.sum(case((FeeInvoice.status != "written_off", FeeInvoice.outstanding_amount), else_=0)), 0
                ).label("outstanding_due"),
                func.coalesce(
                    func.sum(case((FeeInvoice.status == "written_off", FeeInvoice.outstanding_amount), else_=0)), 0
                ).label("written_off_amount"),
            )
            .join(Student, FeeInvoice.student_id == Student.id)
            .outerjoin(
                latest_enr,
                (FeeInvoice.student_id == latest_enr.c.student_id)
                & (FeeInvoice.academic_year_id == latest_enr.c.academic_year_id),
            )
            .where(FeeInvoice.status != "cancelled")
        )
        if flt.academic_year_id:
            inv_stmt = inv_stmt.where(FeeInvoice.academic_year_id == flt.academic_year_id)
        if flt.start_date:
            inv_stmt = inv_stmt.where(FeeInvoice.issue_date >= flt.start_date)
        if flt.end_date:
            inv_stmt = inv_stmt.where(FeeInvoice.issue_date <= flt.end_date)
        inv_stmt = cls._apply_student_academic_filters(inv_stmt, latest_enr, flt)
        inv_row = (await db.execute(inv_stmt)).one()

        # 2. Valid Receipts & Reversals from Payment Ledger
        pay_stmt = (
            select(
                func.coalesce(
                    func.sum(case((Payment.status.in_(["posted", "completed"]), Payment.amount), else_=0)), 0
                ).label("valid_collections"),
                func.count(case((Payment.status.in_(["posted", "completed"]), Payment.id))).label("valid_payment_count"),
                func.coalesce(
                    func.sum(case((Payment.status == "reversed", Payment.amount), else_=0)), 0
                ).label("reversed_payments_amount"),
                func.count(case((Payment.status == "reversed", Payment.id))).label("reversed_payments_count"),
                func.coalesce(
                    func.sum(case((Payment.status.in_(["draft", "submitted"]), Payment.amount), else_=0)), 0
                ).label("pending_payment_amount"),
                func.count(case((Payment.status.in_(["draft", "submitted"]), Payment.id))).label("pending_payment_count"),
            )
            .join(Student, Payment.student_id == Student.id)
            .outerjoin(
                latest_enr,
                (Payment.student_id == latest_enr.c.student_id)
                & (Payment.academic_year_id == latest_enr.c.academic_year_id),
            )
        )
        if flt.academic_year_id:
            pay_stmt = pay_stmt.where(Payment.academic_year_id == flt.academic_year_id)
        if flt.start_date:
            pay_stmt = pay_stmt.where(Payment.payment_date >= flt.start_date)
        if flt.end_date:
            pay_stmt = pay_stmt.where(Payment.payment_date <= flt.end_date)
        pay_stmt = cls._apply_student_academic_filters(pay_stmt, latest_enr, flt)
        pay_row = (await db.execute(pay_stmt)).one()

        # 3. Refunds Ledger (Completed vs Pending — never counted as collections)
        ref_stmt = (
            select(
                func.coalesce(
                    func.sum(case((Refund.status == "completed", Refund.amount), else_=0)), 0
                ).label("completed_refunds"),
                func.count(case((Refund.status == "completed", Refund.id))).label("completed_refunds_count"),
                func.coalesce(
                    func.sum(case((Refund.status.in_(["requested", "pending", "approved"]), Refund.amount), else_=0)), 0
                ).label("pending_refunds"),
                func.count(case((Refund.status.in_(["requested", "pending", "approved"]), Refund.id))).label("pending_refunds_count"),
            )
            .join(Student, Refund.student_id == Student.id)
            .outerjoin(FeeInvoice, Refund.invoice_id == FeeInvoice.id)
            .outerjoin(
                latest_enr,
                (Refund.student_id == latest_enr.c.student_id)
                & (FeeInvoice.academic_year_id == latest_enr.c.academic_year_id),
            )
        )
        if flt.academic_year_id:
            ref_stmt = ref_stmt.where(
                or_(FeeInvoice.academic_year_id == flt.academic_year_id, FeeInvoice.academic_year_id.is_(None))
            )
        if flt.start_date:
            ref_stmt = ref_stmt.where(Refund.refund_date >= flt.start_date)
        if flt.end_date:
            ref_stmt = ref_stmt.where(Refund.refund_date <= flt.end_date)
        ref_stmt = cls._apply_student_academic_filters(ref_stmt, latest_enr, flt)
        ref_row = (await db.execute(ref_stmt)).one()

        # 4. Concession / Waiver / Scholarship / Sponsor Application Lifecycle Breakdown
        app_stmt = (
            select(
                StudentConcessionApplication,
                FeeConcessionType,
                Student.is_active.label("stu_active"),
                latest_enr.c.standard_id.label("std_id"),
                latest_enr.c.division_id.label("div_id"),
            )
            .join(FeeConcessionType, StudentConcessionApplication.concession_type_id == FeeConcessionType.id)
            .join(Student, StudentConcessionApplication.student_id == Student.id)
            .outerjoin(
                latest_enr,
                (StudentConcessionApplication.student_id == latest_enr.c.student_id)
                & (StudentConcessionApplication.academic_year_id == latest_enr.c.academic_year_id),
            )
        )
        if flt.academic_year_id:
            app_stmt = app_stmt.where(StudentConcessionApplication.academic_year_id == flt.academic_year_id)
        if flt.funding_source:
            app_stmt = app_stmt.where(StudentConcessionApplication.funding_source == flt.funding_source)
        if flt.benefit_type:
            app_stmt = app_stmt.where(StudentConcessionApplication.benefit_type == flt.benefit_type)
        app_stmt = cls._apply_student_academic_filters(app_stmt, latest_enr, flt)
        app_rows = (await db.execute(app_stmt)).all()

        # 5. Active Allocation Transactions (posted & reversed) for Invoice Allocations Reconciliation
        alloc_stmt = (
            select(FeeConcessionAllocation, StudentConcessionApplication, FeeConcessionType)
            .join(StudentConcessionApplication, FeeConcessionAllocation.application_id == StudentConcessionApplication.id)
            .join(FeeConcessionType, StudentConcessionApplication.concession_type_id == FeeConcessionType.id)
            .join(Student, StudentConcessionApplication.student_id == Student.id)
            .outerjoin(
                latest_enr,
                (StudentConcessionApplication.student_id == latest_enr.c.student_id)
                & (StudentConcessionApplication.academic_year_id == latest_enr.c.academic_year_id),
            )
        )
        if flt.academic_year_id:
            alloc_stmt = alloc_stmt.where(StudentConcessionApplication.academic_year_id == flt.academic_year_id)
        if flt.start_date:
            alloc_stmt = alloc_stmt.where(
                or_(
                    FeeConcessionAllocation.effective_date >= flt.start_date,
                    and_(FeeConcessionAllocation.effective_date.is_(None), func.date(FeeConcessionAllocation.allocated_at) >= flt.start_date),
                )
            )
        if flt.end_date:
            alloc_stmt = alloc_stmt.where(
                or_(
                    FeeConcessionAllocation.effective_date <= flt.end_date,
                    and_(FeeConcessionAllocation.effective_date.is_(None), func.date(FeeConcessionAllocation.allocated_at) <= flt.end_date),
                )
            )
        alloc_stmt = cls._apply_student_academic_filters(alloc_stmt, latest_enr, flt)
        alloc_rows = (await db.execute(alloc_stmt)).all()

        # 6. Sponsor Settlements
        settle_stmt = (
            select(func.coalesce(func.sum(SponsorSettlement.amount), 0))
            .join(StudentConcessionApplication, SponsorSettlement.application_id == StudentConcessionApplication.id)
            .join(Student, StudentConcessionApplication.student_id == Student.id)
            .outerjoin(
                latest_enr,
                (StudentConcessionApplication.student_id == latest_enr.c.student_id)
                & (StudentConcessionApplication.academic_year_id == latest_enr.c.academic_year_id),
            )
            .where(SponsorSettlement.status == "completed")
        )
        if flt.academic_year_id:
            settle_stmt = settle_stmt.where(StudentConcessionApplication.academic_year_id == flt.academic_year_id)
        settle_stmt = cls._apply_student_academic_filters(settle_stmt, latest_enr, flt)
        sponsor_settlement_ledger_total = Decimal(str((await db.execute(settle_stmt)).scalar() or 0))

        # Aggregate exact buckets using Decimal
        requested_total = Decimal("0.00")
        approved_total = Decimal("0.00")
        approved_unapplied = Decimal("0.00")
        pending_amount = Decimal("0.00")
        pending_count = 0
        rejected_amount = Decimal("0.00")
        rejected_count = 0
        expired_amount = Decimal("0.00")
        expired_count = 0
        cancelled_amount = Decimal("0.00")
        cancelled_count = 0
        reversed_apps_amount = Decimal("0.00")
        reversed_apps_count = 0

        sponsor_sanctioned = Decimal("0.00")
        sponsor_received_app = Decimal("0.00")
        sponsor_posted = Decimal("0.00")

        admission_concessions_total = Decimal("0.00")
        sibling_discounts_total = Decimal("0.00")
        promotional_offers_total = Decimal("0.00")
        admission_scholarships_total = Decimal("0.00")
        beneficiary_student_ids = set()

        today = date.today()
        for app, ctype, _, _, _ in app_rows:
            btype, waiver_scope = cls.resolve_benefit_classification(
                ctype.category, app.funding_source, ctype.calculation_type, getattr(app, "benefit_type", None)
            )
            st = (app.status or "").lower().strip()
            # Automatically classify unposted past valid_until as expired in reporting visibility
            if st in PENDING_CONCESSION_STATUSES or st == "approved":
                if app.valid_until and app.valid_until < today:
                    st = "expired"

            requested_total += Decimal(str(app.requested_amount or 0))

            if st in PENDING_CONCESSION_STATUSES:
                pending_amount += Decimal(str(app.requested_amount or 0))
                pending_count += 1
            elif st in APPROVED_CONCESSION_STATUSES:
                app_amt = Decimal(str(app.approved_amount or 0))
                apl_amt = Decimal(str(app.applied_amount or 0))
                approved_total += app_amt
                approved_unapplied += max(Decimal("0.00"), app_amt - apl_amt)
                beneficiary_student_ids.add(app.student_id)
                if app.funding_source in ("external_sponsor", "government"):
                    sponsor_sanctioned += Decimal(str(app.sponsor_sanctioned_amount or app_amt))
                    sponsor_received_app += Decimal(str(app.sponsor_received_amount or 0))
                if st in POSTED_CONCESSION_STATUSES:
                    if app.funding_source in ("external_sponsor", "government"):
                        sponsor_posted += apl_amt
                    cat_low = (ctype.category or "").lower()
                    if cat_low == "admission":
                        admission_concessions_total += apl_amt
                    elif cat_low == "sibling":
                        sibling_discounts_total += apl_amt
                    elif cat_low == "promotional":
                        promotional_offers_total += apl_amt
                    elif cat_low == "merit" and app.applicant_type == "admission_intake":
                        admission_scholarships_total += apl_amt
            elif st == "rejected":
                rejected_amount += Decimal(str(app.requested_amount or 0))
                rejected_count += 1
            elif st == "expired":
                expired_amount += Decimal(str(app.approved_amount or app.requested_amount or 0))
                expired_count += 1
            elif st in INACTIVE_CANCELLED_STATUSES:
                cancelled_amount += Decimal(str(app.approved_amount or app.requested_amount or 0))
                cancelled_count += 1
            elif st == "reversed":
                reversed_apps_amount += Decimal(str(app.reversed_amount or app.approved_amount or 0))
                reversed_apps_count += 1

        # Aggregate Posted vs Reversed Allocations strictly from FeeConcessionAllocation ledger
        posted_concessions = Decimal("0.00")
        posted_waivers = Decimal("0.00")
        full_waivers_total = Decimal("0.00")
        partial_waivers_total = Decimal("0.00")
        posted_scholarships = Decimal("0.00")
        posted_sponsor_funding = Decimal("0.00")
        credit_adjustments_total = Decimal("0.00")
        allocation_reversals_total = Decimal("0.00")
        tracked_posted_total = Decimal("0.00")

        for alloc, app, ctype in alloc_rows:
            amt = Decimal(str(alloc.allocated_amount or 0))
            p_status = (getattr(alloc, "posting_status", None) or "posted").lower()
            t_type = (getattr(alloc, "transaction_type", None) or "fee_concession").lower()

            if t_type == "reversal":
                allocation_reversals_total += abs(amt)
                continue
            if p_status != "posted":
                continue

            tracked_posted_total += amt
            credit_adjustments_total += Decimal(str(alloc.credit_adjustment_amount or 0))

            btype, waiver_scope = cls.resolve_benefit_classification(
                ctype.category, app.funding_source, ctype.calculation_type, getattr(app, "benefit_type", None)
            )
            if btype == "fee_waiver":
                posted_waivers += amt
                if waiver_scope == "full_waiver":
                    full_waivers_total += amt
                else:
                    partial_waivers_total += amt
            elif btype == "scholarship":
                posted_scholarships += amt
            elif btype == "sponsor_funding":
                posted_sponsor_funding += amt
            else:
                posted_concessions += amt

        gross_assessed = Decimal(str(inv_row.gross_assessed or 0))
        invoice_discounts = Decimal(str(inv_row.invoice_discounts or 0))
        net_due = Decimal(str(inv_row.net_due or 0))
        invoice_paid = Decimal(str(inv_row.invoice_paid or 0))
        outstanding_due = Decimal(str(inv_row.outstanding_due or 0))
        written_off_amount = Decimal(str(inv_row.written_off_amount or 0))

        # Manual fee adjustments on invoices that were not routed through concession allocations
        manual_fee_adjustments = max(Decimal("0.00"), invoice_discounts - tracked_posted_total)

        valid_collections = Decimal(str(pay_row.valid_collections or 0))
        reversed_payments = Decimal(str(pay_row.reversed_payments_amount or 0))
        completed_refunds = Decimal(str(ref_row.completed_refunds or 0))
        pending_refunds = Decimal(str(ref_row.pending_refunds or 0))
        net_collections = max(Decimal("0.00"), valid_collections - completed_refunds)

        effective_sponsor_received = max(sponsor_received_app, sponsor_settlement_ledger_total)
        sponsor_outstanding = max(Decimal("0.00"), sponsor_sanctioned - effective_sponsor_received)

        collection_rate = (
            round(float((invoice_paid / net_due) * 100), 1) if net_due > 0 else 0.0
        )

        # Total posted reductions = tracked benefits (concessions + waivers + scholarships + sponsor) + manual adjustments
        total_posted_benefits = tracked_posted_total + manual_fee_adjustments
        reversals_total = reversed_payments + allocation_reversals_total

        return {
            "currency": currency,
            "counts": {
                "invoices": int(inv_row.invoice_count or 0),
                "billed_students": int(inv_row.billed_students or 0),
                "beneficiary_students": len(beneficiary_student_ids),
                "valid_payments": int(pay_row.valid_payment_count or 0),
                "pending_payments": int(pay_row.pending_payment_count or 0),
                "reversed_payments": int(pay_row.reversed_payments_count or 0),
                "pending_approvals": pending_count,
                "rejected_applications": rejected_count,
                "expired_benefits": expired_count,
                "cancelled_benefits": cancelled_count,
                "reversed_benefits": reversed_apps_count,
                "completed_refunds": int(ref_row.completed_refunds_count or 0),
                "pending_refunds": int(ref_row.pending_refunds_count or 0),
            },
            "financials": {
                "gross_fee_assessed": _quantize(gross_assessed, prec),
                "approved_concessions_total": _quantize(approved_total, prec),
                "approved_unapplied": _quantize(approved_unapplied, prec),
                "posted_concessions_total": _quantize(tracked_posted_total, prec),
                "posted_fee_concessions": _quantize(posted_concessions, prec),
                "posted_fee_waivers": _quantize(posted_waivers, prec),
                "full_fee_waivers": _quantize(full_waivers_total, prec),
                "partial_fee_waivers": _quantize(partial_waivers_total, prec),
                "scholarships_awarded": _quantize(posted_scholarships + posted_sponsor_funding, prec),
                "academy_scholarships": _quantize(posted_scholarships, prec),
                "sponsor_funded_scholarships": _quantize(posted_sponsor_funding, prec),
                "manual_fee_adjustments": _quantize(manual_fee_adjustments, prec),
                "total_posted_reductions": _quantize(total_posted_benefits, prec),
                "net_fee_due": _quantize(net_due, prec),
                "total_collections": _quantize(invoice_paid, prec),
                "gross_payment_receipts": _quantize(valid_collections, prec),
                "refunds_completed": _quantize(completed_refunds, prec),
                "refunds_pending": _quantize(pending_refunds, prec),
                "net_collections": _quantize(net_collections, prec),
                "total_outstanding": _quantize(outstanding_due, prec),
                "written_off_amount": _quantize(written_off_amount, prec),
                "collection_percentage": collection_rate,
                "credit_adjustments": _quantize(credit_adjustments_total, prec),
                "reversals_total": _quantize(reversals_total, prec),
                "reversed_payments_amount": _quantize(reversed_payments, prec),
                "reversed_concessions_amount": _quantize(allocation_reversals_total, prec),
                "pending_payments_amount": _quantize(pay_row.pending_payment_amount, prec),
            },
            "lifecycle": {
                "requested": _quantize(requested_total, prec),
                "pending_approval": _quantize(pending_amount, prec),
                "approved": _quantize(approved_total, prec),
                "posted": _quantize(tracked_posted_total, prec),
                "utilized": _quantize(tracked_posted_total, prec),
                "remaining_approved": _quantize(approved_unapplied, prec),
                "rejected": _quantize(rejected_amount, prec),
                "expired": _quantize(expired_amount, prec),
                "reversed": _quantize(reversed_apps_amount or allocation_reversals_total, prec),
                "cancelled": _quantize(cancelled_amount, prec),
            },
            "sponsors": {
                "total_sanctioned": _quantize(sponsor_sanctioned, prec),
                "total_posted": _quantize(sponsor_posted, prec),
                "total_received": _quantize(effective_sponsor_received, prec),
                "outstanding_sponsor_funding": _quantize(sponsor_outstanding, prec),
                "settlement_rate": (
                    round(float((effective_sponsor_received / sponsor_sanctioned) * 100), 1)
                    if sponsor_sanctioned > 0
                    else 0.0
                ),
            },
            "admission_breakdown": {
                "admission_concessions": _quantize(admission_concessions_total, prec),
                "promotional_offers": _quantize(promotional_offers_total, prec),
                "sibling_discounts": _quantize(sibling_discounts_total, prec),
                "new_admission_scholarships": _quantize(admission_scholarships_total, prec),
            },
        }

    @classmethod
    async def get_fee_management_concession_breakdown(
        cls,
        db: AsyncSession,
        flt: FinancialFilter,
    ) -> Dict[str, Any]:
        """Phase 4B breakdown: Student-wise, Installment/Item-wise, and Fee-Head-wise concession distributions."""
        currency = await cls.get_currency_config(db, flt.institution_id)
        prec = currency["precision"]
        latest_enr = _latest_enrollment_sq()

        stmt = (
            select(
                StudentConcessionApplication,
                FeeConcessionType,
                Student,
                FeeInvoice,
                Standard.name.label("standard_name"),
                Division.name.label("division_name"),
                FeeCategory.name.label("fee_category_name"),
            )
            .join(FeeConcessionType, StudentConcessionApplication.concession_type_id == FeeConcessionType.id)
            .join(Student, StudentConcessionApplication.student_id == Student.id)
            .outerjoin(FeeInvoice, StudentConcessionApplication.invoice_id == FeeInvoice.id)
            .outerjoin(FeeCategory, StudentConcessionApplication.fee_category_id == FeeCategory.id)
            .outerjoin(
                latest_enr,
                (StudentConcessionApplication.student_id == latest_enr.c.student_id)
                & (StudentConcessionApplication.academic_year_id == latest_enr.c.academic_year_id),
            )
            .outerjoin(Standard, latest_enr.c.standard_id == Standard.id)
            .outerjoin(Division, latest_enr.c.division_id == Division.id)
        )
        if flt.academic_year_id:
            stmt = stmt.where(StudentConcessionApplication.academic_year_id == flt.academic_year_id)
        stmt = cls._apply_student_academic_filters(stmt, latest_enr, flt, has_division=True)
        rows = (await db.execute(stmt.order_by(desc(StudentConcessionApplication.id)))).all()

        student_map: Dict[int, Dict[str, Any]] = {}
        head_map: Dict[str, Dict[str, Any]] = {}

        for app, ctype, stu, inv, std_name, div_name, cat_name in rows:
            app_amt = Decimal(str(app.approved_amount or 0))
            pos_amt = Decimal(str(app.applied_amount or 0))
            btype, _ = cls.resolve_benefit_classification(
                ctype.category, app.funding_source, ctype.calculation_type, getattr(app, "benefit_type", None)
            )
            if stu.id not in student_map:
                student_map[stu.id] = {
                    "student_id": stu.id,
                    "student_name": f"{stu.first_name} {stu.last_name}".strip(),
                    "admission_number": stu.admission_number,
                    "standard_name": std_name or "—",
                    "division_name": div_name or "—",
                    "gross_fee": _quantize(inv.total_amount if inv else 0, prec),
                    "approved_amount": 0.0,
                    "posted_amount": 0.0,
                    "remaining_approved": 0.0,
                    "net_payable": _quantize(inv.net_amount if inv else 0, prec),
                    "applications_count": 0,
                }
            sm = student_map[stu.id]
            sm["applications_count"] += 1
            if app.status in APPROVED_CONCESSION_STATUSES:
                sm["approved_amount"] = _quantize(Decimal(str(sm["approved_amount"])) + app_amt, prec)
                sm["posted_amount"] = _quantize(Decimal(str(sm["posted_amount"])) + pos_amt, prec)
                sm["remaining_approved"] = _quantize(
                    max(0.0, sm["approved_amount"] - sm["posted_amount"]), prec
                )

            head_label = cat_name or ctype.name
            if head_label not in head_map:
                head_map[head_label] = {
                    "fee_head": head_label,
                    "benefit_type": btype,
                    "approved_amount": 0.0,
                    "posted_amount": 0.0,
                    "applications_count": 0,
                }
            hm = head_map[head_label]
            hm["applications_count"] += 1
            if app.status in APPROVED_CONCESSION_STATUSES:
                hm["approved_amount"] = _quantize(Decimal(str(hm["approved_amount"])) + app_amt, prec)
                hm["posted_amount"] = _quantize(Decimal(str(hm["posted_amount"])) + pos_amt, prec)

        # Installment / Line-Item Breakdown from FeeInvoiceItem
        item_stmt = (
            select(
                FeeInvoiceItem,
                FeeInvoice.invoice_number,
                Student.id.label("student_id"),
                Student.first_name,
                Student.last_name,
                Student.admission_number,
                FeeCategory.name.label("head_name"),
            )
            .join(FeeInvoice, FeeInvoiceItem.invoice_id == FeeInvoice.id)
            .join(Student, FeeInvoice.student_id == Student.id)
            .outerjoin(FeeStructure, FeeInvoiceItem.fee_structure_id == FeeStructure.id)
            .outerjoin(FeeCategory, FeeStructure.category_id == FeeCategory.id)
            .outerjoin(
                latest_enr,
                (FeeInvoice.student_id == latest_enr.c.student_id)
                & (FeeInvoice.academic_year_id == latest_enr.c.academic_year_id),
            )
            .where(FeeInvoice.status != "cancelled", FeeInvoiceItem.discount_amount > 0)
        )
        if flt.academic_year_id:
            item_stmt = item_stmt.where(FeeInvoice.academic_year_id == flt.academic_year_id)
        item_stmt = cls._apply_student_academic_filters(item_stmt, latest_enr, flt)
        item_rows = (await db.execute(item_stmt.order_by(desc(FeeInvoiceItem.discount_amount)))).all()

        installment_wise = [
            {
                "invoice_item_id": it.id,
                "invoice_number": inv_no,
                "student_id": sid,
                "student_name": f"{fn or ''} {ln or ''}".strip(),
                "admission_number": adm_no,
                "fee_head": head_name or it.description,
                "description": it.description,
                "gross_amount": _quantize(it.amount, prec),
                "concession_allocated": _quantize(it.discount_amount, prec),
                "net_amount": _quantize(it.net_amount, prec),
            }
            for it, inv_no, sid, fn, ln, adm_no, head_name in item_rows
        ]

        return {
            "currency": currency,
            "student_wise": list(student_map.values()),
            "fee_head_wise": list(head_map.values()),
            "installment_wise": installment_wise,
        }

    @classmethod
    async def get_academic_concession_distribution(
        cls,
        db: AsyncSession,
        flt: FinancialFilter,
    ) -> Dict[str, Any]:
        """Phase 4E breakdown: Class-wise & Division-wise concessions, beneficiaries, avg concession, gross vs net."""
        currency = await cls.get_currency_config(db, flt.institution_id)
        prec = currency["precision"]
        latest_enr = _latest_enrollment_sq()

        inv_stmt = (
            select(
                Standard.id.label("standard_id"),
                func.coalesce(Standard.name, "Unassigned").label("standard_name"),
                Division.id.label("division_id"),
                func.coalesce(Division.name, "Unassigned").label("division_name"),
                func.count(func.distinct(FeeInvoice.student_id)).label("total_students"),
                func.count(
                    func.distinct(case((FeeInvoice.discount_amount > 0, FeeInvoice.student_id), else_=None))
                ).label("beneficiaries"),
                func.coalesce(func.sum(FeeInvoice.total_amount), 0).label("gross_fee"),
                func.coalesce(func.sum(FeeInvoice.discount_amount), 0).label("total_concessions"),
                func.coalesce(func.sum(FeeInvoice.net_amount), 0).label("net_fee"),
            )
            .join(Student, FeeInvoice.student_id == Student.id)
            .outerjoin(
                latest_enr,
                (FeeInvoice.student_id == latest_enr.c.student_id)
                & (FeeInvoice.academic_year_id == latest_enr.c.academic_year_id),
            )
            .outerjoin(Standard, latest_enr.c.standard_id == Standard.id)
            .outerjoin(Division, latest_enr.c.division_id == Division.id)
            .where(FeeInvoice.status != "cancelled")
        )
        if flt.academic_year_id:
            inv_stmt = inv_stmt.where(FeeInvoice.academic_year_id == flt.academic_year_id)
        inv_stmt = cls._apply_student_academic_filters(inv_stmt, latest_enr, flt, has_division=True)
        inv_stmt = inv_stmt.group_by(Standard.id, Standard.name, Division.id, Division.name)
        inv_rows = (await db.execute(inv_stmt)).all()

        # Benefit type breakdown per class/division from applications
        app_stmt = (
            select(
                latest_enr.c.standard_id,
                latest_enr.c.division_id,
                StudentConcessionApplication.benefit_type,
                func.coalesce(func.sum(StudentConcessionApplication.applied_amount), 0).label("posted_amt"),
            )
            .join(Student, StudentConcessionApplication.student_id == Student.id)
            .outerjoin(
                latest_enr,
                (StudentConcessionApplication.student_id == latest_enr.c.student_id)
                & (StudentConcessionApplication.academic_year_id == latest_enr.c.academic_year_id),
            )
            .where(StudentConcessionApplication.status.in_(POSTED_CONCESSION_STATUSES))
        )
        if flt.academic_year_id:
            app_stmt = app_stmt.where(StudentConcessionApplication.academic_year_id == flt.academic_year_id)
        app_stmt = cls._apply_student_academic_filters(app_stmt, latest_enr, flt)
        app_stmt = app_stmt.group_by(
            latest_enr.c.standard_id, latest_enr.c.division_id, StudentConcessionApplication.benefit_type
        )
        app_rows = (await db.execute(app_stmt)).all()

        btype_by_div: Dict[Tuple[Any, Any], Dict[str, float]] = {}
        btype_by_std: Dict[Any, Dict[str, float]] = {}
        for std_id, div_id, btype, p_amt in app_rows:
            val = float(p_amt or 0)
            btype_by_div.setdefault((std_id, div_id), {}).setdefault(btype, 0.0)
            btype_by_div[(std_id, div_id)][btype] += val
            btype_by_std.setdefault(std_id, {}).setdefault(btype, 0.0)
            btype_by_std[std_id][btype] += val

        class_map: Dict[Any, Dict[str, Any]] = {}
        division_rows = []
        for r in inv_rows:
            ben = int(r.beneficiaries or 0)
            conc = float(r.total_concessions or 0)
            div_b = btype_by_div.get((r.standard_id, r.division_id), {})
            scholarships_val = _quantize(div_b.get("scholarship", 0) + div_b.get("sponsor_funding", 0), prec)
            waivers_val = _quantize(div_b.get("fee_waiver", 0), prec)

            division_rows.append({
                "standard_id": r.standard_id,
                "standard_name": r.standard_name,
                "division_id": r.division_id,
                "division_name": r.division_name,
                "total_students": int(r.total_students or 0),
                "beneficiaries": ben,
                "gross_fee": _quantize(r.gross_fee, prec),
                "total_concessions": _quantize(conc, prec),
                "scholarships_total": scholarships_val,
                "waivers_total": waivers_val,
                "net_fee": _quantize(r.net_fee, prec),
                "average_concession_per_student": _quantize(conc / ben if ben > 0 else 0.0, prec),
            })

            ckey = r.standard_id
            if ckey not in class_map:
                std_b = btype_by_std.get(r.standard_id, {})
                class_map[ckey] = {
                    "standard_id": r.standard_id,
                    "standard_name": r.standard_name,
                    "total_students": 0,
                    "beneficiaries": 0,
                    "gross_fee": 0.0,
                    "total_concessions": 0.0,
                    "scholarships_total": _quantize(std_b.get("scholarship", 0) + std_b.get("sponsor_funding", 0), prec),
                    "waivers_total": _quantize(std_b.get("fee_waiver", 0), prec),
                    "net_fee": 0.0,
                }
            cm = class_map[ckey]
            cm["total_students"] += int(r.total_students or 0)
            cm["beneficiaries"] += ben
            cm["gross_fee"] = _quantize(cm["gross_fee"] + float(r.gross_fee or 0), prec)
            cm["total_concessions"] = _quantize(cm["total_concessions"] + conc, prec)
            cm["net_fee"] = _quantize(cm["net_fee"] + float(r.net_fee or 0), prec)

        class_rows = []
        for cm in class_map.values():
            cm["average_concession_per_student"] = _quantize(
                cm["total_concessions"] / cm["beneficiaries"] if cm["beneficiaries"] > 0 else 0.0, prec
            )
            class_rows.append(cm)

        return {
            "currency": currency,
            "class_wise": sorted(class_rows, key=lambda x: x["standard_name"]),
            "division_wise": sorted(division_rows, key=lambda x: (x["standard_name"], x["division_name"])),
        }

    @classmethod
    async def reconcile_financial_ledgers(
        cls,
        db: AsyncSession,
        flt: FinancialFilter,
    ) -> Dict[str, Any]:
        """
        Phase 7 Authoritative Ledger Reconciliation.
        Verifies parity across:
        1. Gross Fee - Invoice Discounts = Net Fee
        2. Net Fee - Invoice Paid = Invoice Outstanding
        3. Valid Payments - Completed Refunds = Invoice Paid
        4. Active Payment Allocations == Invoice Paid (flags reversed allocation leaks)
        5. Tracked Concession Allocations + Manual Adjustments == Invoice Discounts
        6. Sponsor Sanctioned - Sponsor Settlements = Sponsor Outstanding
        """
        summary = await cls.get_governed_summary(db, flt)
        fin = summary["financials"]
        prec = summary["currency"]["precision"]
        latest_enr = _latest_enrollment_sq()

        # Check active payment allocations joined to valid payments vs raw allocations
        pa_stmt = (
            select(
                func.coalesce(func.sum(PaymentAllocation.allocated_amount), 0).label("all_alloc"),
                func.coalesce(
                    func.sum(
                        case(
                            (Payment.status.in_(["posted", "completed"]), PaymentAllocation.allocated_amount),
                            else_=0,
                        )
                    ),
                    0,
                ).label("valid_alloc"),
            )
            .join(Payment, PaymentAllocation.payment_id == Payment.id)
            .join(Student, Payment.student_id == Student.id)
            .outerjoin(
                latest_enr,
                (Payment.student_id == latest_enr.c.student_id)
                & (Payment.academic_year_id == latest_enr.c.academic_year_id),
            )
        )
        if flt.academic_year_id:
            pa_stmt = pa_stmt.where(Payment.academic_year_id == flt.academic_year_id)
        pa_stmt = cls._apply_student_academic_filters(pa_stmt, latest_enr, flt)
        pa_row = (await db.execute(pa_stmt)).one()

        gross = fin["gross_fee_assessed"]
        discounts = fin["total_posted_reductions"]
        net = fin["net_fee_due"]
        paid = fin["total_collections"]
        outstanding = fin["total_outstanding"]
        written_off = fin["written_off_amount"]
        net_payments = fin["net_collections"]

        variance_gross_net = _quantize(abs((gross - discounts) - net), prec)
        variance_net_out = _quantize(abs((net - paid - written_off) - outstanding), prec)
        variance_pay_inv = _quantize(abs(net_payments - paid), prec)
        reversed_alloc_leak = _quantize(float(pa_row.all_alloc or 0) - float(pa_row.valid_alloc or 0), prec)

        # Student-level mismatch check
        inv_chk = (
            select(FeeInvoice, Student.first_name, Student.last_name, Student.admission_number)
            .join(Student, FeeInvoice.student_id == Student.id)
            .outerjoin(
                latest_enr,
                (FeeInvoice.student_id == latest_enr.c.student_id)
                & (FeeInvoice.academic_year_id == latest_enr.c.academic_year_id),
            )
            .where(
                FeeInvoice.status != "cancelled",
                or_(
                    func.abs((FeeInvoice.total_amount - FeeInvoice.discount_amount) - FeeInvoice.net_amount) > Decimal("0.01"),
                    func.abs((FeeInvoice.net_amount - FeeInvoice.paid_amount) - FeeInvoice.outstanding_amount) > Decimal("0.01"),
                ),
            )
        )
        if flt.academic_year_id:
            inv_chk = inv_chk.where(FeeInvoice.academic_year_id == flt.academic_year_id)
        inv_chk = cls._apply_student_academic_filters(inv_chk, latest_enr, flt)
        broken_invoices = (await db.execute(inv_chk)).all()

        total_variance = _quantize(variance_gross_net + variance_net_out, prec)
        return {
            "currency": summary["currency"],
            "is_reconciled": total_variance == 0.0 and len(broken_invoices) == 0,
            "ledger_audit": {
                "gross_assessed": gross,
                "posted_reductions": discounts,
                "tracked_benefits": fin["posted_concessions_total"],
                "manual_adjustments": fin["manual_fee_adjustments"],
                "total_invoiced": net,
                "net_invoiced": net,
                "total_collected": paid,
                "net_payment_cashflow": net_payments,
                "total_outstanding": outstanding,
                "written_off": written_off,
                "calculated_balance": _quantize(net - paid - written_off, prec),
                "variance": total_variance,
                "payment_vs_invoice_variance": variance_pay_inv,
                "reversed_allocation_excluded": reversed_alloc_leak,
                "is_reconciled": total_variance == 0.0 and len(broken_invoices) == 0,
            },
            "broken_invoices": [
                {
                    "invoice_id": inv.id,
                    "invoice_number": inv.invoice_number,
                    "student_id": inv.student_id,
                    "student_name": f"{fn or ''} {ln or ''}".strip(),
                    "admission_number": adm_no,
                    "total_amount": float(inv.total_amount),
                    "discount_amount": float(inv.discount_amount),
                    "net_amount": float(inv.net_amount),
                    "paid_amount": float(inv.paid_amount),
                    "outstanding_amount": float(inv.outstanding_amount),
                }
                for inv, fn, ln, adm_no in broken_invoices
            ],
            "sponsors": summary["sponsors"],
            "summary": fin,
            "lifecycle": summary["lifecycle"],
        }

    @classmethod
    async def trace_transaction_chain(
        cls,
        db: AsyncSession,
        entity_type: str,
        entity_id: int,
    ) -> Dict[str, Any]:
        """
        Phase 7 End-to-End Traceability Chain:
        Student -> Fee Invoice -> Concession/Adjustment Application & Allocations -> Approvals -> Sponsor Settlements -> Audit History.
        Supports entity_type: 'application', 'allocation', 'invoice', 'student'.
        """
        student_id: Optional[int] = None
        invoice_id: Optional[int] = None
        application_id: Optional[int] = None

        if entity_type == "application":
            app = (await db.execute(
                select(StudentConcessionApplication).where(StudentConcessionApplication.id == entity_id)
            )).scalar_one_or_none()
            if not app:
                raise ValueError(f"Concession application #{entity_id} not found")
            application_id = app.id
            student_id = app.student_id
            invoice_id = app.invoice_id
        elif entity_type == "allocation":
            alloc = (await db.execute(
                select(FeeConcessionAllocation).where(FeeConcessionAllocation.id == entity_id)
            )).scalar_one_or_none()
            if not alloc:
                raise ValueError(f"Concession allocation #{entity_id} not found")
            application_id = alloc.application_id
            invoice_id = alloc.invoice_id
            app = (await db.execute(
                select(StudentConcessionApplication).where(StudentConcessionApplication.id == alloc.application_id)
            )).scalar_one_or_none()
            student_id = app.student_id if app else None
        elif entity_type == "invoice":
            inv = (await db.execute(select(FeeInvoice).where(FeeInvoice.id == entity_id))).scalar_one_or_none()
            if not inv:
                raise ValueError(f"Invoice #{entity_id} not found")
            invoice_id = inv.id
            student_id = inv.student_id
        elif entity_type == "student":
            student_id = entity_id
        else:
            raise ValueError(f"Unsupported trace entity_type: {entity_type}")

        student = (await db.execute(select(Student).where(Student.id == student_id))).scalar_one_or_none()
        if not student:
            raise ValueError("Student record not found")

        inv_q = select(FeeInvoice).options(selectinload(FeeInvoice.items)).where(FeeInvoice.student_id == student.id)
        if invoice_id:
            inv_q = inv_q.where(FeeInvoice.id == invoice_id)
        invoices = (await db.execute(inv_q.order_by(desc(FeeInvoice.id)))).scalars().all()

        app_q = (
            select(StudentConcessionApplication)
            .options(
                selectinload(StudentConcessionApplication.concession_type),
                selectinload(StudentConcessionApplication.allocations),
                selectinload(StudentConcessionApplication.sponsor_settlements),
            )
            .where(StudentConcessionApplication.student_id == student.id)
        )
        if application_id:
            app_q = app_q.where(StudentConcessionApplication.id == application_id)
        apps = (await db.execute(app_q.order_by(desc(StudentConcessionApplication.id)))).scalars().all()

        # Fetch all user names referenced in nominator/verifier/approver/cancelled/allocated/reversed
        user_ids = set()
        for a in apps:
            for uid in (a.nominator_id, a.verifier_id, a.approver_id, a.cancelled_by_id):
                if uid:
                    user_ids.add(uid)
            for al in a.allocations:
                if al.allocated_by_id:
                    user_ids.add(al.allocated_by_id)
                if al.reversed_by_id:
                    user_ids.add(al.reversed_by_id)
        user_names: Dict[int, str] = {}
        if user_ids:
            urows = (await db.execute(select(User).where(User.id.in_(user_ids)))).scalars().all()
            user_names = {u.id: f"{u.first_name} {u.last_name} (@{u.username})".strip() for u in urows}

        app_ids = [a.id for a in apps]
        audit_q = (
            select(AuditLog, User.username)
            .outerjoin(User, AuditLog.user_id == User.id)
            .where(
                or_(
                    and_(AuditLog.resource_type.in_(["concession_application", "concession_allocation", "sponsor_settlement"]), AuditLog.resource_id.in_(app_ids or [-1])),
                    and_(AuditLog.resource_type == "student_fee", AuditLog.resource_id == student.id),
                )
            )
            .order_by(desc(AuditLog.id))
            .limit(100)
        )
        audit_rows = (await db.execute(audit_q)).all()

        return {
            "trace_root": {"entity_type": entity_type, "entity_id": entity_id},
            "student": {
                "id": student.id,
                "name": f"{student.first_name} {student.last_name}".strip(),
                "admission_number": student.admission_number,
                "institution_id": student.institution_id,
            },
            "invoices": [
                {
                    "id": inv.id,
                    "invoice_number": inv.invoice_number,
                    "academic_year_id": inv.academic_year_id,
                    "gross_amount": float(inv.total_amount),
                    "discount_amount": float(inv.discount_amount),
                    "net_amount": float(inv.net_amount),
                    "paid_amount": float(inv.paid_amount),
                    "outstanding_amount": float(inv.outstanding_amount),
                    "status": inv.status,
                    "issue_date": str(inv.issue_date),
                }
                for inv in invoices
            ],
            "applications": [
                {
                    "id": a.id,
                    "application_number": a.application_number,
                    "scheme_name": a.concession_type.name if a.concession_type else "Scheme",
                    "scheme_code": a.concession_type.code if a.concession_type else "",
                    "benefit_type": a.benefit_type,
                    "funding_source": a.funding_source,
                    "sponsor_name": a.sponsor_name,
                    "sponsor_reference": a.sponsor_reference,
                    "sponsor_sanctioned_amount": float(a.sponsor_sanctioned_amount or 0),
                    "sponsor_received_amount": float(a.sponsor_received_amount or 0),
                    "sponsor_settlement_status": a.sponsor_settlement_status,
                    "requested_amount": float(a.requested_amount),
                    "approved_amount": float(a.approved_amount),
                    "applied_amount": float(a.applied_amount),
                    "reversed_amount": float(a.reversed_amount or 0),
                    "remaining_approved": max(0.0, float(a.approved_amount - a.applied_amount)),
                    "status": a.status,
                    "valid_until": str(a.valid_until) if a.valid_until else None,
                    "created_by": user_names.get(a.nominator_id, "System") if a.nominator_id else "System",
                    "verified_by": user_names.get(a.verifier_id) if a.verifier_id else None,
                    "approved_by": user_names.get(a.approver_id) if a.approver_id else None,
                    "approved_at": a.approved_at.isoformat() if a.approved_at else None,
                    "cancelled_by": user_names.get(a.cancelled_by_id) if a.cancelled_by_id else None,
                    "cancellation_reason": a.cancellation_reason,
                    "allocations": [
                        {
                            "id": al.id,
                            "transaction_ref": al.transaction_ref or f"CTXN-{al.id:04d}",
                            "invoice_id": al.invoice_id,
                            "transaction_type": al.transaction_type,
                            "posting_status": al.posting_status,
                            "allocated_amount": float(al.allocated_amount),
                            "credit_adjustment_amount": float(al.credit_adjustment_amount or 0),
                            "effective_date": str(al.effective_date or al.allocated_at.date()),
                            "posted_by": user_names.get(al.allocated_by_id, f"User #{al.allocated_by_id}"),
                            "reversed_by": user_names.get(al.reversed_by_id) if al.reversed_by_id else None,
                            "reversed_at": al.reversed_at.isoformat() if al.reversed_at else None,
                            "reversal_reason": al.reversal_reason,
                            "reversal_of_allocation_id": al.reversal_of_allocation_id,
                            "notes": al.notes,
                        }
                        for al in a.allocations
                    ],
                    "sponsor_settlements": [
                        {
                            "id": ss.id,
                            "settlement_ref": ss.settlement_ref,
                            "amount": float(ss.amount),
                            "received_date": str(ss.received_date),
                            "payment_method": ss.payment_method,
                            "reference_number": ss.reference_number,
                            "status": ss.status,
                        }
                        for ss in a.sponsor_settlements
                    ],
                }
                for a in apps
            ],
            "audit_history": [
                {
                    "id": aud.id,
                    "action": aud.action,
                    "resource_type": aud.resource_type,
                    "resource_id": aud.resource_id,
                    "username": uname or "system",
                    "details": aud.details,
                    "severity": aud.severity,
                    "created_at": aud.created_at.isoformat() if aud.created_at else None,
                }
                for aud, uname in audit_rows
            ],
        }

    # ─── PHASE 5: ALL 20 GOVERNED CONCESSION / WAIVER / SCHOLARSHIP REPORTS ───

    @classmethod
    async def generate_concession_report(
        cls,
        db: AsyncSession,
        report_id: str,
        flt: FinancialFilter,
    ) -> Dict[str, Any]:
        if report_id not in CONCESSION_REPORT_DEFINITIONS:
            raise ValueError(f"Unknown governed concession report '{report_id}'")

        meta = CONCESSION_REPORT_DEFINITIONS[report_id]
        currency = await cls.get_currency_config(db, flt.institution_id)
        prec = currency["precision"]
        latest_enr = _latest_enrollment_sq()
        today = date.today()
        generated_at = datetime.now(timezone.utc).isoformat()
        reporting_period = (
            f"{flt.start_date or 'Start'} to {flt.end_date or 'Present'}"
            if (flt.start_date or flt.end_date)
            else "All Active Dates"
        )

        # Fetch canonical joined dataset shared across application/student/allocation reports
        base_stmt = (
            select(
                StudentConcessionApplication,
                FeeConcessionType,
                Student,
                FeeInvoice,
                AcademicYear.name.label("ay_name"),
                Standard.name.label("std_name"),
                Division.name.label("div_name"),
                Institution.name.label("inst_name"),
            )
            .join(FeeConcessionType, StudentConcessionApplication.concession_type_id == FeeConcessionType.id)
            .join(Student, StudentConcessionApplication.student_id == Student.id)
            .join(AcademicYear, StudentConcessionApplication.academic_year_id == AcademicYear.id)
            .join(Institution, StudentConcessionApplication.institution_id == Institution.id)
            .outerjoin(FeeInvoice, StudentConcessionApplication.invoice_id == FeeInvoice.id)
            .outerjoin(
                latest_enr,
                (StudentConcessionApplication.student_id == latest_enr.c.student_id)
                & (StudentConcessionApplication.academic_year_id == latest_enr.c.academic_year_id),
            )
            .outerjoin(Standard, latest_enr.c.standard_id == Standard.id)
            .outerjoin(Division, latest_enr.c.division_id == Division.id)
        )
        if flt.academic_year_id:
            base_stmt = base_stmt.where(StudentConcessionApplication.academic_year_id == flt.academic_year_id)
        if flt.start_date:
            base_stmt = base_stmt.where(func.date(StudentConcessionApplication.created_at) >= flt.start_date)
        if flt.end_date:
            base_stmt = base_stmt.where(func.date(StudentConcessionApplication.created_at) <= flt.end_date)
        if flt.status and flt.status != "all":
            base_stmt = base_stmt.where(StudentConcessionApplication.status == flt.status)
        if flt.funding_source and flt.funding_source != "all":
            base_stmt = base_stmt.where(StudentConcessionApplication.funding_source == flt.funding_source)
        base_stmt = cls._apply_student_academic_filters(base_stmt, latest_enr, flt, has_division=True)
        base_rows = (await db.execute(base_stmt.order_by(desc(StudentConcessionApplication.id)))).all()

        def _app_record(app, ctype, stu, inv, ay_name, std_name, div_name, inst_name):
            btype, waiver_scope = cls.resolve_benefit_classification(
                ctype.category, app.funding_source, ctype.calculation_type, app.benefit_type
            )
            st = (app.status or "").lower()
            if st in (*PENDING_CONCESSION_STATUSES, "approved") and app.valid_until and app.valid_until < today:
                st = "expired"
            app_amt = float(app.approved_amount or 0)
            pos_amt = float(app.applied_amount or 0)
            return {
                "application_id": app.id,
                "student_id": stu.id,
                "invoice_id": inv.id if inv else None,
                "application_number": app.application_number,
                "student_name": f"{stu.first_name} {stu.last_name}".strip(),
                "admission_number": stu.admission_number,
                "branch": inst_name,
                "academic_year": ay_name,
                "class_name": std_name or "—",
                "division_name": div_name or "—",
                "scheme_code": ctype.code,
                "scheme_name": ctype.name,
                "category": ctype.category,
                "benefit_type": btype,
                "waiver_scope": waiver_scope or "—",
                "funding_source": app.funding_source,
                "sponsor_name": app.sponsor_name or "—",
                "invoice_number": inv.invoice_number if inv else "—",
                "gross_fee": _quantize(inv.total_amount if inv else 0, prec),
                "requested_amount": _quantize(app.requested_amount, prec),
                "approved_amount": _quantize(app_amt, prec),
                "posted_amount": _quantize(pos_amt, prec),
                "remaining_approved": _quantize(max(0.0, app_amt - pos_amt), prec),
                "reversed_amount": _quantize(app.reversed_amount or 0, prec),
                "net_fee": _quantize(inv.net_amount if inv else 0, prec),
                "outstanding_fee": _quantize(inv.outstanding_amount if inv else 0, prec),
                "status": st,
                "valid_until": str(app.valid_until) if app.valid_until else "—",
                "created_date": app.created_at.strftime("%Y-%m-%d") if app.created_at else "—",
                "approved_date": app.approved_at.strftime("%Y-%m-%d") if app.approved_at else "—",
            }

        all_app_records = [_app_record(*r) for r in base_rows]
        cols_std = [
            {"key": "application_number", "label": "App #"},
            {"key": "admission_number", "label": "Adm No"},
            {"key": "student_name", "label": "Student Name"},
            {"key": "class_name", "label": "Class"},
            {"key": "division_name", "label": "Division"},
            {"key": "scheme_name", "label": "Scheme / Policy"},
            {"key": "benefit_type", "label": "Benefit Type"},
            {"key": "funding_source", "label": "Funding Source"},
            {"key": "gross_fee", "label": "Gross Fee", "type": "currency"},
            {"key": "approved_amount", "label": "Approved", "type": "currency"},
            {"key": "posted_amount", "label": "Posted", "type": "currency"},
            {"key": "remaining_approved", "label": "Remaining", "type": "currency"},
            {"key": "status", "label": "Status"},
        ]

        rows: List[Dict[str, Any]] = []
        columns: List[Dict[str, str]] = cols_std
        summary: Dict[str, Any] = {}

        if report_id == "complete-concession-register":
            rows = all_app_records
        elif report_id == "complete-fee-waiver-register":
            rows = [r for r in all_app_records if r["benefit_type"] == "fee_waiver"]
        elif report_id == "full-fee-waiver":
            rows = [r for r in all_app_records if r["benefit_type"] == "fee_waiver" and r["waiver_scope"] == "full_waiver"]
        elif report_id == "partial-fee-waiver":
            rows = [r for r in all_app_records if r["benefit_type"] == "fee_waiver" and r["waiver_scope"] == "partial_waiver"]
        elif report_id == "approved-vs-applied":
            rows = [r for r in all_app_records if r["status"] in ("approved", "partially_applied", "applied", "posted")]
        elif report_id == "pending-approval":
            rows = [r for r in all_app_records if r["status"] in PENDING_CONCESSION_STATUSES]
        elif report_id == "expired-benefits":
            rows = [r for r in all_app_records if r["status"] == "expired"]
        elif report_id == "cancelled-benefits":
            rows = [r for r in all_app_records if r["status"] in INACTIVE_CANCELLED_STATUSES]
        elif report_id == "sponsor-funded-scholarship":
            rows = []
            for app, ctype, stu, inv, ay_name, std_name, div_name, inst_name in base_rows:
                if app.funding_source not in ("external_sponsor", "government"):
                    continue
                sanctioned = float(app.sponsor_sanctioned_amount or app.approved_amount or 0)
                received = float(app.sponsor_received_amount or 0)
                rec = _app_record(app, ctype, stu, inv, ay_name, std_name, div_name, inst_name)
                rec["sponsor_reference"] = app.sponsor_reference or "—"
                rec["sponsor_sanctioned"] = _quantize(sanctioned, prec)
                rec["sponsor_received"] = _quantize(received, prec)
                rec["sponsor_outstanding"] = _quantize(max(0.0, sanctioned - received), prec)
                rec["settlement_status"] = app.sponsor_settlement_status
                rows.append(rec)
            columns = [
                {"key": "application_number", "label": "App #"},
                {"key": "student_name", "label": "Student"},
                {"key": "class_name", "label": "Class"},
                {"key": "sponsor_name", "label": "Sponsor / Agency"},
                {"key": "sponsor_reference", "label": "Sanction Ref"},
                {"key": "sponsor_sanctioned", "label": "Sanctioned", "type": "currency"},
                {"key": "approved_amount", "label": "Approved", "type": "currency"},
                {"key": "posted_amount", "label": "Posted", "type": "currency"},
                {"key": "sponsor_received", "label": "Recovered", "type": "currency"},
                {"key": "sponsor_outstanding", "label": "Sponsor Outstanding", "type": "currency"},
                {"key": "settlement_status", "label": "Settlement Status"},
            ]
        elif report_id == "student-concession-statement":
            mgmt = await cls.get_fee_management_concession_breakdown(db, flt)
            rows = mgmt["student_wise"]
            columns = [
                {"key": "admission_number", "label": "Adm No"},
                {"key": "student_name", "label": "Student Name"},
                {"key": "standard_name", "label": "Class"},
                {"key": "division_name", "label": "Division"},
                {"key": "gross_fee", "label": "Gross Fee", "type": "currency"},
                {"key": "approved_amount", "label": "Approved Benefits", "type": "currency"},
                {"key": "posted_amount", "label": "Posted Benefits", "type": "currency"},
                {"key": "remaining_approved", "label": "Remaining Approved", "type": "currency"},
                {"key": "net_payable", "label": "Net Payable", "type": "currency"},
                {"key": "applications_count", "label": "Applications"},
            ]
        elif report_id in ("class-wise-concession", "division-wise-concession"):
            acad = await cls.get_academic_concession_distribution(db, flt)
            if report_id == "class-wise-concession":
                rows = acad["class_wise"]
                columns = [
                    {"key": "standard_name", "label": "Class / Standard"},
                    {"key": "total_students", "label": "Students"},
                    {"key": "beneficiaries", "label": "Beneficiaries"},
                    {"key": "gross_fee", "label": "Gross Fee", "type": "currency"},
                    {"key": "total_concessions", "label": "Posted Reductions", "type": "currency"},
                    {"key": "scholarships_total", "label": "Scholarships", "type": "currency"},
                    {"key": "waivers_total", "label": "Fee Waivers", "type": "currency"},
                    {"key": "net_fee", "label": "Net Fee", "type": "currency"},
                    {"key": "average_concession_per_student", "label": "Avg / Beneficiary", "type": "currency"},
                ]
            else:
                rows = acad["division_wise"]
                columns = [
                    {"key": "standard_name", "label": "Class"},
                    {"key": "division_name", "label": "Division"},
                    {"key": "total_students", "label": "Students"},
                    {"key": "beneficiaries", "label": "Beneficiaries"},
                    {"key": "gross_fee", "label": "Gross Fee", "type": "currency"},
                    {"key": "total_concessions", "label": "Posted Reductions", "type": "currency"},
                    {"key": "scholarships_total", "label": "Scholarships", "type": "currency"},
                    {"key": "waivers_total", "label": "Fee Waivers", "type": "currency"},
                    {"key": "net_fee", "label": "Net Fee", "type": "currency"},
                    {"key": "average_concession_per_student", "label": "Avg / Beneficiary", "type": "currency"},
                ]
        elif report_id in ("scheme-wise-scholarship", "concession-eligibility-utilization"):
            scheme_map: Dict[int, Dict[str, Any]] = {}
            t_stmt = select(FeeConcessionType)
            if flt.institution_id:
                t_stmt = t_stmt.where(FeeConcessionType.institution_id == flt.institution_id)
            all_types = (await db.execute(t_stmt.order_by(FeeConcessionType.name))).scalars().all()
            for ct in all_types:
                scheme_map[ct.id] = {
                    "scheme_code": ct.code,
                    "scheme_name": ct.name,
                    "benefit_type": ct.benefit_type,
                    "funding_source": ct.funding_source,
                    "applications_count": 0,
                    "approved_count": 0,
                    "rejected_count": 0,
                    "requested_amount": 0.0,
                    "approved_amount": 0.0,
                    "posted_amount": 0.0,
                    "utilization_pct": 0.0,
                }
            for app, ctype, *_ in base_rows:
                sm = scheme_map.setdefault(
                    ctype.id,
                    {
                        "scheme_code": ctype.code,
                        "scheme_name": ctype.name,
                        "benefit_type": ctype.benefit_type,
                        "funding_source": app.funding_source,
                        "applications_count": 0,
                        "approved_count": 0,
                        "rejected_count": 0,
                        "requested_amount": 0.0,
                        "approved_amount": 0.0,
                        "posted_amount": 0.0,
                        "utilization_pct": 0.0,
                    },
                )
                sm["applications_count"] += 1
                sm["requested_amount"] = _quantize(sm["requested_amount"] + float(app.requested_amount or 0), prec)
                if app.status in APPROVED_CONCESSION_STATUSES:
                    sm["approved_count"] += 1
                    sm["approved_amount"] = _quantize(sm["approved_amount"] + float(app.approved_amount or 0), prec)
                    sm["posted_amount"] = _quantize(sm["posted_amount"] + float(app.applied_amount or 0), prec)
                elif app.status == "rejected":
                    sm["rejected_count"] += 1
            for sm in scheme_map.values():
                sm["utilization_pct"] = (
                    round((sm["posted_amount"] / sm["approved_amount"]) * 100, 1)
                    if sm["approved_amount"] > 0
                    else 0.0
                )
            rows = list(scheme_map.values())
            if report_id == "scheme-wise-scholarship":
                rows = [r for r in rows if r["benefit_type"] in ("scholarship", "sponsor_funding") or r["applications_count"] > 0]
            columns = [
                {"key": "scheme_code", "label": "Scheme Code"},
                {"key": "scheme_name", "label": "Scheme Name"},
                {"key": "benefit_type", "label": "Classification"},
                {"key": "funding_source", "label": "Funding Source"},
                {"key": "applications_count", "label": "Applications"},
                {"key": "approved_count", "label": "Approved Cnt"},
                {"key": "rejected_count", "label": "Rejected Cnt"},
                {"key": "requested_amount", "label": "Requested", "type": "currency"},
                {"key": "approved_amount", "label": "Approved", "type": "currency"},
                {"key": "posted_amount", "label": "Posted", "type": "currency"},
                {"key": "utilization_pct", "label": "Utilization %"},
            ]
        elif report_id == "reversal-adjustment":
            # Allocations where reversal, credit adjustment, or reversed status occurred + payment reversals
            alloc_q = (
                select(FeeConcessionAllocation, StudentConcessionApplication, Student, FeeInvoice)
                .join(StudentConcessionApplication, FeeConcessionAllocation.application_id == StudentConcessionApplication.id)
                .join(Student, StudentConcessionApplication.student_id == Student.id)
                .join(FeeInvoice, FeeConcessionAllocation.invoice_id == FeeInvoice.id)
                .outerjoin(
                    latest_enr,
                    (Student.id == latest_enr.c.student_id) & (FeeInvoice.academic_year_id == latest_enr.c.academic_year_id),
                )
                .where(
                    or_(
                        FeeConcessionAllocation.posting_status == "reversed",
                        FeeConcessionAllocation.transaction_type == "reversal",
                        FeeConcessionAllocation.credit_adjustment_amount > 0,
                    )
                )
            )
            if flt.academic_year_id:
                alloc_q = alloc_q.where(FeeInvoice.academic_year_id == flt.academic_year_id)
            alloc_q = cls._apply_student_academic_filters(alloc_q, latest_enr, flt)
            for al, app, stu, inv in (await db.execute(alloc_q.order_by(desc(FeeConcessionAllocation.id)))).all():
                rows.append({
                    "application_id": app.id,
                    "student_id": stu.id,
                    "invoice_id": inv.id,
                    "transaction_ref": al.transaction_ref or f"CTXN-{al.id:04d}",
                    "application_number": app.application_number,
                    "invoice_number": inv.invoice_number,
                    "student_name": f"{stu.first_name} {stu.last_name}".strip(),
                    "admission_number": stu.admission_number,
                    "transaction_type": al.transaction_type,
                    "posting_status": al.posting_status,
                    "amount": _quantize(al.allocated_amount, prec),
                    "credit_adjustment": _quantize(al.credit_adjustment_amount or 0, prec),
                    "reason": al.reversal_reason or al.notes or "—",
                    "effective_date": str(al.effective_date or al.allocated_at.date()),
                })
            # Also include audited payment reversals
            pr_q = (
                select(Payment, Student)
                .join(Student, Payment.student_id == Student.id)
                .outerjoin(
                    latest_enr,
                    (Payment.student_id == latest_enr.c.student_id)
                    & (Payment.academic_year_id == latest_enr.c.academic_year_id),
                )
                .where(Payment.status == "reversed")
            )
            if flt.academic_year_id:
                pr_q = pr_q.where(Payment.academic_year_id == flt.academic_year_id)
            pr_q = cls._apply_student_academic_filters(pr_q, latest_enr, flt)
            for pay, stu in (await db.execute(pr_q)).all():
                rows.append({
                    "application_id": None,
                    "student_id": stu.id,
                    "invoice_id": None,
                    "transaction_ref": f"PAY-REV-{pay.id:04d}",
                    "application_number": "—",
                    "invoice_number": "—",
                    "student_name": f"{stu.first_name} {stu.last_name}".strip(),
                    "admission_number": stu.admission_number,
                    "transaction_type": "payment_reversal",
                    "posting_status": "reversed",
                    "amount": _quantize(-pay.amount, prec),
                    "credit_adjustment": 0.0,
                    "reason": pay.reversal_reason or "Payment Reversed",
                    "effective_date": str(pay.reversed_at.date() if pay.reversed_at else pay.payment_date),
                })
            columns = [
                {"key": "transaction_ref", "label": "Transaction Ref"},
                {"key": "application_number", "label": "App #"},
                {"key": "invoice_number", "label": "Invoice #"},
                {"key": "admission_number", "label": "Adm No"},
                {"key": "student_name", "label": "Student"},
                {"key": "transaction_type", "label": "Type"},
                {"key": "posting_status", "label": "Status"},
                {"key": "amount", "label": "Amount", "type": "currency"},
                {"key": "credit_adjustment", "label": "Credit Surplus", "type": "currency"},
                {"key": "reason", "label": "Reason / Audit Note"},
                {"key": "effective_date", "label": "Effective Date"},
            ]
        elif report_id == "installment-wise-concession":
            mgmt = await cls.get_fee_management_concession_breakdown(db, flt)
            rows = mgmt["installment_wise"]
            columns = [
                {"key": "invoice_number", "label": "Invoice #"},
                {"key": "admission_number", "label": "Adm No"},
                {"key": "student_name", "label": "Student"},
                {"key": "fee_head", "label": "Fee Head"},
                {"key": "description", "label": "Item / Installment"},
                {"key": "gross_amount", "label": "Gross Amount", "type": "currency"},
                {"key": "concession_allocated", "label": "Concession Allocated", "type": "currency"},
                {"key": "net_amount", "label": "Net Amount", "type": "currency"},
            ]
        elif report_id in ("fee-collection-vs-concession", "complete-student-benefit-register"):
            # All billed invoices reconciled with concessions, collections, and outstanding
            st_inv_stmt = (
                select(FeeInvoice, Student, Standard.name.label("std_name"), Division.name.label("div_name"), AcademicYear.name.label("ay_name"))
                .join(Student, FeeInvoice.student_id == Student.id)
                .join(AcademicYear, FeeInvoice.academic_year_id == AcademicYear.id)
                .outerjoin(
                    latest_enr,
                    (FeeInvoice.student_id == latest_enr.c.student_id)
                    & (FeeInvoice.academic_year_id == latest_enr.c.academic_year_id),
                )
                .outerjoin(Standard, latest_enr.c.standard_id == Standard.id)
                .outerjoin(Division, latest_enr.c.division_id == Division.id)
                .where(FeeInvoice.status != "cancelled")
            )
            if flt.academic_year_id:
                st_inv_stmt = st_inv_stmt.where(FeeInvoice.academic_year_id == flt.academic_year_id)
            st_inv_stmt = cls._apply_student_academic_filters(st_inv_stmt, latest_enr, flt, has_division=True)
            inv_list = (await db.execute(st_inv_stmt.order_by(Student.first_name))).all()

            by_stu_ay: Dict[Tuple[int, int], Dict[str, Any]] = {}
            for r in all_app_records:
                key = (r["student_id"], flt.academic_year_id or 0)
                if key not in by_stu_ay:
                    by_stu_ay[key] = {"approved": 0.0, "posted": 0.0, "schemes": [], "btypes": set()}
                if r["status"] in ("approved", "partially_applied", "applied", "posted"):
                    by_stu_ay[key]["approved"] += r["approved_amount"]
                    by_stu_ay[key]["posted"] += r["posted_amount"]
                    by_stu_ay[key]["schemes"].append(r["scheme_name"])
                    by_stu_ay[key]["btypes"].add(r["benefit_type"])

            for inv, stu, std_name, div_name, ay_name in inv_list:
                binfo = by_stu_ay.get((stu.id, flt.academic_year_id or 0))
                if not binfo and not flt.academic_year_id:
                    # Also lookup across any AY for student
                    matching = [r for r in all_app_records if r["student_id"] == stu.id and r["status"] in ("approved", "partially_applied", "applied", "posted")]
                    binfo = {
                        "approved": sum(m["approved_amount"] for m in matching),
                        "posted": sum(m["posted_amount"] for m in matching),
                        "schemes": [m["scheme_name"] for m in matching],
                        "btypes": {m["benefit_type"] for m in matching},
                    }
                app_val = _quantize(binfo["approved"] if binfo else 0.0, prec)
                rows.append({
                    "student_id": stu.id,
                    "invoice_id": inv.id,
                    "invoice_number": inv.invoice_number,
                    "admission_number": stu.admission_number,
                    "student_name": f"{stu.first_name} {stu.last_name}".strip(),
                    "class_name": std_name or "—",
                    "division_name": div_name or "—",
                    "academic_year": ay_name,
                    "schemes": ", ".join(binfo["schemes"]) if binfo and binfo["schemes"] else "None",
                    "gross_fee": _quantize(inv.total_amount, prec),
                    "approved_benefits": app_val,
                    "posted_reductions": _quantize(inv.discount_amount, prec),
                    "net_payable": _quantize(inv.net_amount, prec),
                    "collected": _quantize(inv.paid_amount, prec),
                    "outstanding": _quantize(inv.outstanding_amount, prec),
                    "status": inv.status,
                })
            if report_id == "complete-student-benefit-register":
                rows = [r for r in rows if r["approved_benefits"] > 0 or r["posted_reductions"] > 0]
            columns = [
                {"key": "invoice_number", "label": "Invoice #"},
                {"key": "admission_number", "label": "Adm No"},
                {"key": "student_name", "label": "Student Name"},
                {"key": "class_name", "label": "Class"},
                {"key": "schemes", "label": "Benefits / Schemes"},
                {"key": "gross_fee", "label": "Gross Fee", "type": "currency"},
                {"key": "approved_benefits", "label": "Approved Benefits", "type": "currency"},
                {"key": "posted_reductions", "label": "Posted Reductions", "type": "currency"},
                {"key": "net_payable", "label": "Net Fee Due", "type": "currency"},
                {"key": "collected", "label": "Collected", "type": "currency"},
                {"key": "outstanding", "label": "Outstanding", "type": "currency"},
            ]
        elif report_id == "academic-year-comparison":
            ays = (await db.execute(select(AcademicYear).order_by(AcademicYear.name))).scalars().all()
            for ay in ays:
                ay_flt = FinancialFilter(
                    institution_id=flt.institution_id,
                    academic_year_id=ay.id,
                    standard_id=flt.standard_id,
                    division_id=flt.division_id,
                    is_demo=flt.is_demo,
                )
                ay_sum = await cls.get_governed_summary(db, ay_flt)
                fin = ay_sum["financials"]
                rows.append({
                    "academic_year_id": ay.id,
                    "academic_year": ay.name,
                    "billed_students": ay_sum["counts"]["billed_students"],
                    "beneficiaries": ay_sum["counts"]["beneficiary_students"],
                    "gross_fee": fin["gross_fee_assessed"],
                    "approved_concessions": fin["approved_concessions_total"],
                    "posted_concessions": fin["posted_concessions_total"],
                    "fee_waivers": fin["posted_fee_waivers"],
                    "scholarships": fin["scholarships_awarded"],
                    "net_fee": fin["net_fee_due"],
                    "collected": fin["total_collections"],
                    "outstanding": fin["total_outstanding"],
                })
            columns = [
                {"key": "academic_year", "label": "Academic Year"},
                {"key": "billed_students", "label": "Billed Students"},
                {"key": "beneficiaries", "label": "Beneficiaries"},
                {"key": "gross_fee", "label": "Gross Assessed", "type": "currency"},
                {"key": "approved_concessions", "label": "Approved Benefits", "type": "currency"},
                {"key": "posted_concessions", "label": "Posted Benefits", "type": "currency"},
                {"key": "fee_waivers", "label": "Fee Waivers", "type": "currency"},
                {"key": "scholarships", "label": "Scholarships", "type": "currency"},
                {"key": "net_fee", "label": "Net Due", "type": "currency"},
                {"key": "collected", "label": "Collected", "type": "currency"},
                {"key": "outstanding", "label": "Outstanding", "type": "currency"},
            ]
        elif report_id == "user-wise-approval-audit":
            approver_ids = {app.approver_id for app, *_ in base_rows if app.approver_id}
            users_map: Dict[int, User] = {}
            if approver_ids:
                urows = (await db.execute(select(User).where(User.id.in_(approver_ids)))).scalars().all()
                users_map = {u.id: u for u in urows}
            by_user: Dict[int, Dict[str, Any]] = {}
            for app, *_ in base_rows:
                uid = app.approver_id or app.nominator_id or 0
                u = users_map.get(uid)
                if uid not in by_user:
                    by_user[uid] = {
                        "user_id": uid,
                        "username": u.username if u else "Pending / System",
                        "full_name": f"{u.first_name} {u.last_name}".strip() if u else "Unassigned",
                        "role": u.role if u else "—",
                        "approved_count": 0,
                        "rejected_count": 0,
                        "cancelled_count": 0,
                        "approved_amount": 0.0,
                        "posted_amount": 0.0,
                    }
                bu = by_user[uid]
                if app.status in APPROVED_CONCESSION_STATUSES:
                    bu["approved_count"] += 1
                    bu["approved_amount"] = _quantize(bu["approved_amount"] + float(app.approved_amount or 0), prec)
                    bu["posted_amount"] = _quantize(bu["posted_amount"] + float(app.applied_amount or 0), prec)
                elif app.status == "rejected":
                    bu["rejected_count"] += 1
                elif app.status in INACTIVE_CANCELLED_STATUSES:
                    bu["cancelled_count"] += 1
            rows = list(by_user.values())
            columns = [
                {"key": "full_name", "label": "Approver / User"},
                {"key": "username", "label": "Username"},
                {"key": "role", "label": "Role"},
                {"key": "approved_count", "label": "Approved"},
                {"key": "rejected_count", "label": "Rejected"},
                {"key": "cancelled_count", "label": "Cancelled"},
                {"key": "approved_amount", "label": "Approved Value", "type": "currency"},
                {"key": "posted_amount", "label": "Posted Value", "type": "currency"},
            ]

        if not summary:
            summary = {
                "record_count": len(rows),
                "total_approved": _quantize(sum(float(r.get("approved_amount", r.get("approved_concessions", 0)) or 0) for r in rows), prec),
                "total_posted": _quantize(sum(float(r.get("posted_amount", r.get("posted_concessions", r.get("total_concessions", 0))) or 0) for r in rows), prec),
            }

        return {
            "report_id": report_id,
            "title": meta["title"],
            "category": meta["category"],
            "generated_at": generated_at,
            "reporting_period": reporting_period,
            "currency": currency,
            "summary": summary,
            "columns": columns,
            "rows": rows,
        }

    @staticmethod
    def export_report_csv(report_data: Dict[str, Any]) -> bytes:
        buf = io.StringIO()
        writer = csv.writer(buf)
        writer.writerow([f"{report_data['title']} | Generated: {report_data['generated_at']} | Period: {report_data['reporting_period']}"])
        cols = report_data.get("columns", [])
        writer.writerow([c["label"] for c in cols])
        for row in report_data.get("rows", []):
            writer.writerow([row.get(c["key"], "") for c in cols])
        return buf.getvalue().encode("utf-8-sig")

    @staticmethod
    def export_report_xlsx(report_data: Dict[str, Any]) -> bytes:
        from openpyxl import Workbook
        from openpyxl.styles import Font, PatternFill

        wb = Workbook()
        ws = wb.active
        ws.title = report_data["title"][:30]

        ws.append([report_data["title"]])
        ws.append([f"Generated: {report_data['generated_at']}", f"Period: {report_data['reporting_period']}"])
        ws.append([])

        cols = report_data.get("columns", [])
        ws.append([c["label"] for c in cols])
        header_fill = PatternFill(start_color="1E40AF", end_color="1E40AF", fill_type="solid")
        header_font = Font(color="FFFFFF", bold=True)
        for cell in ws[4]:
            cell.fill = header_fill
            cell.font = header_font

        for row in report_data.get("rows", []):
            ws.append([row.get(c["key"], "") for c in cols])

        stream = io.BytesIO()
        wb.save(stream)
        return stream.getvalue()

