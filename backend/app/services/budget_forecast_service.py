# /**
#  * @file        budget_forecast_service.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      backend.app.services
#  *
#  * @author      Jawahar R. Mallah
#  * @organization Smritisys & AITDL Networks
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 PrathamOne EduOS
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-27
#  * @updated     2026-11-28
#  *
#  * @description Domain service for Institutional Budgeting, Live Budget-vs-Actuals Variance, Expense Guardrails, and Deterministic 3-Driver Cashflow Forecasting (Rule 006).
#  */

import calendar
import json
import uuid
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import and_, desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.academic_year import AcademicYear
from app.models.budgeting import (
    BudgetLineItem,
    BudgetPlan,
    ForecastPeriodProjection,
    ForecastScenario,
)
from app.models.crm import Lead
from app.models.division import Division
from app.models.enrollment import StudentEnrollment
from app.models.fee import (
    FeeCategory,
    FeeInvoice,
    FeeInvoiceInstallment,
    FeeInvoiceItem,
    FeeStructure,
    StudentFeeAssignment,
)
from app.models.finance import DailyCashRegister, Expense, ExpenseCategory
from app.models.payment import FinancialPeriod, Payment, PaymentAllocation, Refund, RefundAllocation
from app.models.portal import TimetableEntry
from app.models.staff import StaffProfile
from app.models.standard import Standard
from app.models.student import Student
from app.models.teacher_payroll import (
    TeacherContractMilestone,
    TeacherPaymentProfile,
    TeacherPayroll,
)
from app.services.report_intelligence_service import SafeMath


def _q2(val: Decimal | float | int | None) -> Decimal:
    """Quantize numeric values deterministically to 2 decimal places."""
    if val is None:
        return Decimal("0.00")
    return Decimal(str(val)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _add_months(anchor: date, months: int) -> date:
    """Shift a date forward by N calendar months preserving first-of-month or clamped day."""
    total_months = (anchor.year * 12 + (anchor.month - 1)) + months
    year = total_months // 12
    month = (total_months % 12) + 1
    last_day = calendar.monthrange(year, month)[1]
    return date(year, month, min(anchor.day, last_day))


def _month_bounds(year: int, month: int) -> Tuple[date, date]:
    last_day = calendar.monthrange(year, month)[1]
    return date(year, month, 1), date(year, month, last_day)


def _default_fy_dates(ref: Optional[date] = None) -> Tuple[date, date, str]:
    """Return Indian Financial Year (Apr 1 - Mar 31) start, end, and label."""
    today = ref or date.today()
    fy_start_year = today.year if today.month >= 4 else today.year - 1
    fy_end_year = fy_start_year + 1
    return (
        date(fy_start_year, 4, 1),
        date(fy_end_year, 3, 31),
        f"FY {fy_start_year}-{str(fy_end_year)[-2:]}",
    )


def _generate_period_windows(
    start_date: date, end_date: date, granularity: str
) -> List[Dict[str, Any]]:
    """Build deterministic period windows within [start_date, end_date]."""
    windows: List[Dict[str, Any]] = []
    cur = date(start_date.year, start_date.month, 1)
    if granularity == "annual":
        return [{
            "period_start": start_date,
            "period_end": end_date,
            "period_label": f"{start_date.strftime('%b %Y')} - {end_date.strftime('%b %Y')}",
        }]

    step = 3 if granularity == "quarterly" else 1
    q_idx = 1
    while cur <= end_date:
        p_start = max(cur, start_date)
        end_anchor = _add_months(cur, step - 1)
        _, month_last = _month_bounds(end_anchor.year, end_anchor.month)
        p_end = min(month_last, end_date)
        label = f"Q{q_idx} ({p_start.strftime('%b')}-{p_end.strftime('%b %y')})" if step == 3 else cur.strftime("%b %Y")
        windows.append({
            "period_start": p_start,
            "period_end": p_end,
            "period_label": label,
        })
        cur = _add_months(cur, step)
        q_idx += 1
    return windows


def _parse_hhmm_hours(start_time: str, end_time: str) -> Decimal:
    """Calculate decimal duration hours from HH:MM strings with bounds validation."""
    try:
        sh, sm = [int(p) for p in start_time.strip().split(":")[:2]]
        eh, em = [int(p) for p in end_time.strip().split(":")[:2]]
        start_mins = sh * 60 + sm
        end_mins = eh * 60 + em
        if end_mins <= start_mins:
            return Decimal("1.00")
        return Decimal(str(round((end_mins - start_mins) / 60.0, 2)))
    except Exception:
        return Decimal("1.00")


class BudgetForecastService:
    """Authoritative domain service for Budgeting, Variance Analysis, Guardrails, and Cashflow Forecasting."""

    DEFAULT_ASSUMPTIONS: Dict[str, float] = {
        "fee_realization_pct": 90.0,
        "aging_30d_recovery_pct": 75.0,
        "aging_60d_recovery_pct": 50.0,
        "aging_90d_recovery_pct": 20.0,
        "lead_conversion_pct": 25.0,
        "avg_annual_fee_per_student": 0.0,  # 0 = auto-derive from FeeStructure
        "expected_refund_rate_pct": 2.0,
        "extra_concession_pct": 0.0,
        "expense_inflation_pct": 3.0,
        "extra_monthly_payroll": 0.0,
        "extra_monthly_opex": 0.0,
    }

    @classmethod
    def normalize_assumptions(cls, raw: Optional[Dict[str, Any]], scenario_type: str = "baseline") -> Dict[str, float]:
        base = dict(cls.DEFAULT_ASSUMPTIONS)
        if scenario_type == "conservative":
            base.update({
                "fee_realization_pct": 78.0,
                "aging_30d_recovery_pct": 60.0,
                "aging_60d_recovery_pct": 35.0,
                "aging_90d_recovery_pct": 10.0,
                "lead_conversion_pct": 15.0,
                "expense_inflation_pct": 6.0,
            })
        elif scenario_type == "optimistic":
            base.update({
                "fee_realization_pct": 95.0,
                "aging_30d_recovery_pct": 85.0,
                "aging_60d_recovery_pct": 65.0,
                "aging_90d_recovery_pct": 35.0,
                "lead_conversion_pct": 35.0,
                "expense_inflation_pct": 1.0,
            })
        if raw:
            for k, v in raw.items():
                if k in base and v is not None:
                    try:
                        base[k] = float(v)
                    except (TypeError, ValueError):
                        pass
        return base

    # --------------------------------------------------------------------------
    # 1. BUDGET PLAN LIFECYCLE & ALLOCATION MANAGEMENT
    # --------------------------------------------------------------------------
    @classmethod
    async def list_budget_plans(cls, db: AsyncSession, institution_id: int) -> List[Dict[str, Any]]:
        stmt = (
            select(BudgetPlan)
            .where(BudgetPlan.institution_id == institution_id)
            .order_by(desc(BudgetPlan.start_date), desc(BudgetPlan.version_number), desc(BudgetPlan.id))
        )
        plans = (await db.execute(stmt)).scalars().all()
        if not plans:
            return []

        plan_ids = [p.id for p in plans]
        totals_stmt = (
            select(
                BudgetLineItem.budget_plan_id,
                BudgetLineItem.line_direction,
                func.coalesce(func.sum(BudgetLineItem.planned_amount), Decimal("0.00")),
                func.count(BudgetLineItem.id),
            )
            .where(BudgetLineItem.budget_plan_id.in_(plan_ids))
            .group_by(BudgetLineItem.budget_plan_id, BudgetLineItem.line_direction)
        )
        totals_map: Dict[int, Dict[str, Any]] = {
            pid: {"planned_inflow": 0.0, "planned_outflow": 0.0, "line_count": 0}
            for pid in plan_ids
        }
        for pid, direction, total_amt, cnt in (await db.execute(totals_stmt)).all():
            totals_map[pid]["line_count"] += int(cnt or 0)
            if direction == "inflow_target":
                totals_map[pid]["planned_inflow"] = float(_q2(total_amt))
            else:
                totals_map[pid]["planned_outflow"] = float(_q2(total_amt))

        return [
            {
                "id": p.id,
                "institution_id": p.institution_id,
                "branch_id": p.branch_id,
                "academic_year_id": p.academic_year_id,
                "fiscal_year_label": p.fiscal_year_label,
                "name": p.name,
                "plan_type": p.plan_type,
                "granularity": p.granularity,
                "start_date": p.start_date.isoformat(),
                "end_date": p.end_date.isoformat(),
                "version_number": p.version_number,
                "parent_plan_id": p.parent_plan_id,
                "status": p.status,
                "enforcement_mode": p.enforcement_mode,
                "notes": p.notes,
                "planned_inflow": totals_map[p.id]["planned_inflow"],
                "planned_outflow": totals_map[p.id]["planned_outflow"],
                "planned_net_surplus": round(
                    totals_map[p.id]["planned_inflow"] - totals_map[p.id]["planned_outflow"], 2
                ),
                "line_count": totals_map[p.id]["line_count"],
                "approved_at": p.approved_at.isoformat() if p.approved_at else None,
                "locked_at": p.locked_at.isoformat() if p.locked_at else None,
                "created_at": p.created_at.isoformat() if p.created_at else None,
            }
            for p in plans
        ]

    @classmethod
    async def create_budget_plan(
        cls,
        db: AsyncSession,
        institution_id: int,
        data: Dict[str, Any],
        user_id: int,
    ) -> BudgetPlan:
        start_d = data.get("start_date")
        end_d = data.get("end_date")
        fy_label = (data.get("fiscal_year_label") or "").strip()
        ay_id = data.get("academic_year_id")

        if ay_id and (not start_d or not end_d):
            ay = (await db.execute(
                select(AcademicYear).where(
                    and_(AcademicYear.id == ay_id, AcademicYear.institution_id == institution_id)
                )
            )).scalar_one_or_none()
            if ay:
                start_d = start_d or ay.start_date
                end_d = end_d or ay.end_date
                fy_label = fy_label or ay.name

        if not start_d or not end_d:
            d_start, d_end, d_label = _default_fy_dates()
            start_d = start_d or d_start
            end_d = end_d or d_end
            fy_label = fy_label or d_label
        if not fy_label:
            fy_label = f"{start_d.strftime('%b %Y')} - {end_d.strftime('%b %Y')}"

        if end_d < start_d:
            raise ValueError("Budget end_date must be on or after start_date.")

        plan = BudgetPlan(
            institution_id=institution_id,
            branch_id=data.get("branch_id", 1),
            academic_year_id=ay_id,
            fiscal_year_label=fy_label,
            name=data["name"].strip(),
            plan_type=data.get("plan_type", "operating"),
            granularity=data.get("granularity", "monthly"),
            start_date=start_d,
            end_date=end_d,
            version_number=1,
            status="draft",
            enforcement_mode=data.get("enforcement_mode", "soft_warn"),
            notes=data.get("notes"),
            created_by_id=user_id,
        )
        db.add(plan)
        await db.flush()

        if data.get("seed_default_lines", True):
            await cls._seed_canonical_lines(db, institution_id, plan)

        await db.commit()
        await db.refresh(plan)
        return plan

    @classmethod
    async def _seed_canonical_lines(
        cls, db: AsyncSession, institution_id: int, plan: BudgetPlan
    ) -> None:
        """Auto-generate initial draft lines mapped strictly to canonical SSOT masters."""
        windows = _generate_period_windows(plan.start_date, plan.end_date, plan.granularity)
        fp_rows = (await db.execute(
            select(FinancialPeriod).where(FinancialPeriod.institution_id == institution_id)
        )).scalars().all()

        def _match_fp_id(p_start: date, p_end: date) -> Optional[int]:
            for fp in fp_rows:
                if fp.start_date == p_start and fp.end_date == p_end:
                    return fp.id
            return None

        exp_cats = (await db.execute(
            select(ExpenseCategory).where(
                and_(ExpenseCategory.institution_id == institution_id, ExpenseCategory.is_active == True)
            ).order_by(ExpenseCategory.name)
        )).scalars().all()

        fee_cats = (await db.execute(
            select(FeeCategory).where(
                and_(FeeCategory.institution_id == institution_id, FeeCategory.is_active == True)
            ).order_by(FeeCategory.name)
        )).scalars().all()

        for win in windows:
            fp_id = _match_fp_id(win["period_start"], win["period_end"])
            # Fee targets (reuse FeeCategory master or fallback canonical Fee Collections target)
            if fee_cats:
                for fc in fee_cats:
                    db.add(BudgetLineItem(
                        budget_plan_id=plan.id,
                        financial_period_id=fp_id,
                        period_start=win["period_start"],
                        period_end=win["period_end"],
                        period_label=win["period_label"],
                        line_direction="inflow_target",
                        source_domain="fee_category",
                        fee_category_id=fc.id,
                        line_label=fc.name,
                        planned_amount=Decimal("0.00"),
                    ))
            else:
                db.add(BudgetLineItem(
                    budget_plan_id=plan.id,
                    financial_period_id=fp_id,
                    period_start=win["period_start"],
                    period_end=win["period_end"],
                    period_label=win["period_label"],
                    line_direction="inflow_target",
                    source_domain="fee_category",
                    line_label="Student Fee Collections",
                    planned_amount=Decimal("0.00"),
                ))

            # Faculty Payroll canonical line (from teacher_payrolls)
            db.add(BudgetLineItem(
                budget_plan_id=plan.id,
                financial_period_id=fp_id,
                period_start=win["period_start"],
                period_end=win["period_end"],
                period_label=win["period_label"],
                line_direction="outflow_cap",
                source_domain="faculty_payroll",
                line_label="Faculty Payroll & Visiting Remuneration",
                planned_amount=Decimal("0.00"),
            ))

            # Expense Category caps (reuse ExpenseCategory master; map SAL cleanly as staff_payroll)
            for ec in exp_cats:
                is_sal = (ec.code or "").strip().upper() == "SAL"
                db.add(BudgetLineItem(
                    budget_plan_id=plan.id,
                    financial_period_id=fp_id,
                    period_start=win["period_start"],
                    period_end=win["period_end"],
                    period_label=win["period_label"],
                    line_direction="outflow_cap",
                    source_domain="staff_payroll" if is_sal else "expense_category",
                    expense_category_id=ec.id,
                    line_label=ec.name,
                    planned_amount=Decimal("0.00"),
                ))

            # Scholarship & Concession cap
            db.add(BudgetLineItem(
                budget_plan_id=plan.id,
                financial_period_id=fp_id,
                period_start=win["period_start"],
                period_end=win["period_end"],
                period_label=win["period_label"],
                line_direction="outflow_cap",
                source_domain="concession",
                line_label="Scholarships & Concessions Cap",
                planned_amount=Decimal("0.00"),
            ))

    @classmethod
    async def upsert_budget_lines(
        cls,
        db: AsyncSession,
        institution_id: int,
        plan_id: int,
        lines_data: List[Dict[str, Any]],
    ) -> BudgetPlan:
        plan = (await db.execute(
            select(BudgetPlan).where(
                and_(BudgetPlan.id == plan_id, BudgetPlan.institution_id == institution_id)
            )
        )).scalar_one_or_none()
        if not plan:
            raise LookupError("Budget plan not found.")
        if plan.status != "draft":
            raise ValueError(
                f"Budget plan is '{plan.status}' and immutable. Create a Revised Estimate (RE) instead."
            )

        existing_lines = (await db.execute(
            select(BudgetLineItem).where(BudgetLineItem.budget_plan_id == plan.id)
        )).scalars().all()
        by_id = {ln.id: ln for ln in existing_lines}
        by_key = {
            (
                ln.period_start,
                ln.source_domain,
                ln.expense_category_id,
                ln.fee_category_id,
                ln.standard_id,
                ln.division_id,
                ln.line_label,
            ): ln
            for ln in existing_lines
        }

        for row in lines_data:
            amt = _q2(row.get("planned_amount", 0))
            if amt < Decimal("0.00"):
                raise ValueError("Planned budget amount cannot be negative.")
            warn_pct = _q2(row.get("warning_threshold_pct", Decimal("85.00")))

            line_id = row.get("id")
            if line_id and line_id in by_id:
                target = by_id[line_id]
                target.planned_amount = amt
                target.warning_threshold_pct = warn_pct
                if row.get("notes") is not None:
                    target.notes = row["notes"]
                if row.get("line_label"):
                    target.line_label = row["line_label"].strip()
                continue

            p_start = row["period_start"]
            p_end = row["period_end"]
            label = (row.get("line_label") or "Custom Allocation").strip()
            src_domain = row.get("source_domain", "custom")
            exp_cat_id = row.get("expense_category_id")
            fee_cat_id = row.get("fee_category_id")
            std_id = row.get("standard_id")
            div_id = row.get("division_id")
            key = (p_start, src_domain, exp_cat_id, fee_cat_id, std_id, div_id, label)

            if key in by_key:
                target = by_key[key]
                target.planned_amount = amt
                target.warning_threshold_pct = warn_pct
                if row.get("notes") is not None:
                    target.notes = row["notes"]
            else:
                new_ln = BudgetLineItem(
                    budget_plan_id=plan.id,
                    period_start=p_start,
                    period_end=p_end,
                    period_label=row.get("period_label") or p_start.strftime("%b %Y"),
                    line_direction=row.get("line_direction", "outflow_cap"),
                    source_domain=src_domain,
                    expense_category_id=exp_cat_id,
                    fee_category_id=fee_cat_id,
                    standard_id=std_id,
                    division_id=div_id,
                    line_label=label,
                    planned_amount=amt,
                    warning_threshold_pct=warn_pct,
                    notes=row.get("notes"),
                )
                db.add(new_ln)
                by_key[key] = new_ln

        await db.commit()
        await db.refresh(plan)
        return plan

    @classmethod
    async def transition_budget_plan(
        cls,
        db: AsyncSession,
        institution_id: int,
        plan_id: int,
        action: str,
        user_id: int,
        notes: Optional[str] = None,
    ) -> BudgetPlan:
        plan = (await db.execute(
            select(BudgetPlan).where(
                and_(BudgetPlan.id == plan_id, BudgetPlan.institution_id == institution_id)
            )
        )).scalar_one_or_none()
        if not plan:
            raise LookupError("Budget plan not found.")

        now_utc = datetime.now(timezone.utc)
        if action == "submit":
            if plan.status != "draft":
                raise ValueError("Only draft budgets can be submitted.")
            plan.status = "submitted"
        elif action == "approve":
            if plan.status not in {"draft", "submitted"}:
                raise ValueError("Only draft or submitted budgets can be approved.")
            plan.status = "approved"
            plan.approved_by_id = user_id
            plan.approved_at = now_utc
        elif action == "lock":
            if plan.status != "approved":
                raise ValueError("Only approved budgets can be permanently locked.")
            plan.status = "locked"
            plan.locked_at = now_utc
        elif action == "revise":
            if plan.status not in {"approved", "locked"}:
                raise ValueError("Only approved or locked budgets can spawn a Revised Estimate.")
            src_lines = (await db.execute(
                select(BudgetLineItem).where(BudgetLineItem.budget_plan_id == plan.id)
            )).scalars().all()
            rev_num = plan.version_number + 1
            base_name = plan.name.split(" (RE v")[0]
            revised = BudgetPlan(
                institution_id=plan.institution_id,
                branch_id=plan.branch_id,
                academic_year_id=plan.academic_year_id,
                fiscal_year_label=plan.fiscal_year_label,
                name=f"{base_name} (RE v{rev_num})",
                plan_type=plan.plan_type,
                granularity=plan.granularity,
                start_date=plan.start_date,
                end_date=plan.end_date,
                version_number=rev_num,
                parent_plan_id=plan.id,
                status="draft",
                enforcement_mode=plan.enforcement_mode,
                notes=notes or f"Revised Estimate cloned from v{plan.version_number}",
                created_by_id=user_id,
            )
            db.add(revised)
            await db.flush()
            for ln in src_lines:
                db.add(BudgetLineItem(
                    budget_plan_id=revised.id,
                    financial_period_id=ln.financial_period_id,
                    period_start=ln.period_start,
                    period_end=ln.period_end,
                    period_label=ln.period_label,
                    line_direction=ln.line_direction,
                    source_domain=ln.source_domain,
                    expense_category_id=ln.expense_category_id,
                    fee_category_id=ln.fee_category_id,
                    standard_id=ln.standard_id,
                    division_id=ln.division_id,
                    line_label=ln.line_label,
                    planned_amount=ln.planned_amount,
                    warning_threshold_pct=ln.warning_threshold_pct,
                    notes=ln.notes,
                ))
            plan.status = "superseded"
            await db.commit()
            await db.refresh(revised)
            return revised
        else:
            raise ValueError(f"Unsupported budget transition action: {action}")

        if notes:
            plan.notes = notes
        await db.commit()
        await db.refresh(plan)
        return plan

    # --------------------------------------------------------------------------
    # 2. REAL-TIME BUDGET VS. ACTUALS VARIANCE ENGINE
    # --------------------------------------------------------------------------
    @classmethod
    async def compute_plan_variance(
        cls,
        db: AsyncSession,
        institution_id: int,
        plan_id: int,
        data_environment: str = "PRODUCTION",
    ) -> Dict[str, Any]:
        plan = (await db.execute(
            select(BudgetPlan).where(
                and_(BudgetPlan.id == plan_id, BudgetPlan.institution_id == institution_id)
            )
        )).scalar_one_or_none()
        if not plan:
            raise LookupError("Budget plan not found.")

        lines = (await db.execute(
            select(BudgetLineItem)
            .where(BudgetLineItem.budget_plan_id == plan.id)
            .order_by(BudgetLineItem.period_start, BudgetLineItem.line_direction, BudgetLineItem.id)
        )).scalars().all()

        is_demo = data_environment == "TRAINING"

        # A. Expenses (approved/paid vs pending submitted) scoped to [start_date, end_date]
        exp_rows = (await db.execute(
            select(Expense.expense_date, Expense.category_id, Expense.amount, Expense.status)
            .where(
                and_(
                    Expense.institution_id == institution_id,
                    Expense.expense_date >= plan.start_date,
                    Expense.expense_date <= plan.end_date,
                    Expense.status.in_(["approved", "paid", "submitted"]),
                )
            )
        )).all()

        # B. Payments net of Refunds (attribute proportionally via PaymentAllocation -> FeeInvoice -> FeeInvoiceItem -> FeeStructure, falling back to StudentFeeAssignment)
        base_pays = (await db.execute(
            select(
                Payment.id,
                Payment.student_id,
                Payment.academic_year_id,
                Payment.payment_date,
                Payment.amount,
            )
            .join(Student, Payment.student_id == Student.id)
            .where(
                and_(
                    Student.institution_id == institution_id,
                    Student.is_demo == is_demo,
                    Payment.payment_date >= plan.start_date,
                    Payment.payment_date <= plan.end_date,
                    Payment.status.in_(["posted", "completed"]),
                )
            )
        )).all()

        pay_ids = [r[0] for r in base_pays]
        alloc_by_pay: Dict[int, List[Tuple[int, Decimal]]] = {}
        inv_ids: set[int] = set()
        if pay_ids:
            alloc_rows = (await db.execute(
                select(
                    PaymentAllocation.payment_id,
                    PaymentAllocation.invoice_id,
                    PaymentAllocation.allocated_amount,
                ).where(PaymentAllocation.payment_id.in_(pay_ids))
            )).all()
            for pid_val, iid_val, a_amt in alloc_rows:
                alloc_by_pay.setdefault(pid_val, []).append((iid_val, _q2(a_amt)))
                inv_ids.add(iid_val)

        inv_item_weights: Dict[int, List[Tuple[Optional[int], Decimal]]] = {}
        if inv_ids:
            item_rows = (await db.execute(
                select(
                    FeeInvoiceItem.invoice_id,
                    FeeStructure.category_id,
                    FeeInvoiceItem.net_amount,
                )
                .join(FeeStructure, FeeInvoiceItem.fee_structure_id == FeeStructure.id)
                .where(FeeInvoiceItem.invoice_id.in_(list(inv_ids)))
            )).all()
            grouped_items: Dict[int, Dict[Optional[int], Decimal]] = {}
            for iid_val, cat_id_val, net_amt in item_rows:
                bucket = grouped_items.setdefault(iid_val, {})
                bucket[cat_id_val] = bucket.get(cat_id_val, Decimal("0.00")) + _q2(net_amt)
            for iid_val, cat_map in grouped_items.items():
                total_net = sum(cat_map.values(), Decimal("0.00"))
                if total_net > Decimal("0.00"):
                    inv_item_weights[iid_val] = [
                        (cid_v, amt_v / total_net) for cid_v, amt_v in cat_map.items()
                    ]
                elif cat_map:
                    first_cid = next(iter(cat_map.keys()))
                    inv_item_weights[iid_val] = [(first_cid, Decimal("1.0"))]

        # Assignment fallback for payments lacking invoice allocations
        assign_cat_map: Dict[Tuple[int, int], Optional[int]] = {}
        unallocated_pairs = {
            (sid_v, ay_v)
            for pid_v, sid_v, ay_v, _, _ in base_pays
            if pid_v not in alloc_by_pay
        }
        if unallocated_pairs:
            assign_rows = (await db.execute(
                select(
                    StudentFeeAssignment.student_id,
                    StudentFeeAssignment.academic_year_id,
                    FeeStructure.category_id,
                )
                .join(FeeStructure, StudentFeeAssignment.fee_structure_id == FeeStructure.id)
                .where(
                    StudentFeeAssignment.student_id.in_([s for s, _ in unallocated_pairs])
                )
            )).all()
            for sid_v, ay_v, cat_id_v in assign_rows:
                assign_cat_map[(sid_v, ay_v)] = cat_id_v

        pay_rows: List[Tuple[date, Decimal, Optional[int]]] = []
        pay_primary_cat: Dict[int, Optional[int]] = {}
        for pid_v, sid_v, ay_v, pdate, pamt in base_pays:
            amt_dec = _q2(pamt)
            allocs = alloc_by_pay.get(pid_v)
            if allocs:
                remaining = amt_dec
                for iid_val, a_amt in allocs:
                    weights = inv_item_weights.get(iid_val)
                    if weights:
                        for cat_id_v, ratio in weights:
                            part = _q2(a_amt * ratio)
                            pay_rows.append((pdate, part, cat_id_v))
                            pay_primary_cat.setdefault(pid_v, cat_id_v)
                            remaining -= part
                    else:
                        fallback_cat = assign_cat_map.get((sid_v, ay_v))
                        pay_rows.append((pdate, a_amt, fallback_cat))
                        pay_primary_cat.setdefault(pid_v, fallback_cat)
                        remaining -= a_amt
                if remaining > Decimal("0.01"):
                    pay_rows.append((pdate, _q2(remaining), pay_primary_cat.get(pid_v)))
            else:
                fallback_cat = assign_cat_map.get((sid_v, ay_v))
                pay_rows.append((pdate, amt_dec, fallback_cat))
                pay_primary_cat[pid_v] = fallback_cat

        raw_refunds = (await db.execute(
            select(
                Refund.id,
                Refund.refund_date,
                Refund.amount,
                Refund.invoice_id,
                Refund.payment_id,
            )
            .join(Student, Refund.student_id == Student.id)
            .where(
                and_(
                    Refund.institution_id == institution_id,
                    Student.is_demo == is_demo,
                    Refund.refund_date >= plan.start_date,
                    Refund.refund_date <= plan.end_date,
                    Refund.status == "completed",
                )
            )
        )).all()

        ref_inv_ids = {r[3] for r in raw_refunds if r[3] is not None and r[3] not in inv_item_weights}
        if ref_inv_ids:
            extra_item_rows = (await db.execute(
                select(FeeInvoiceItem.invoice_id, FeeStructure.category_id)
                .join(FeeStructure, FeeInvoiceItem.fee_structure_id == FeeStructure.id)
                .where(FeeInvoiceItem.invoice_id.in_(list(ref_inv_ids)))
            )).all()
            for iid_val, cid_val in extra_item_rows:
                inv_item_weights.setdefault(iid_val, [(cid_val, Decimal("1.0"))])

        refund_rows: List[Tuple[int, date, Decimal, Optional[int]]] = []
        for rid, rdate, ramt, r_inv_id, r_pay_id in raw_refunds:
            r_cat: Optional[int] = None
            if r_inv_id and r_inv_id in inv_item_weights and inv_item_weights[r_inv_id]:
                r_cat = inv_item_weights[r_inv_id][0][0]
            elif r_pay_id and r_pay_id in pay_primary_cat:
                r_cat = pay_primary_cat[r_pay_id]
            refund_rows.append((rid, rdate, _q2(ramt), r_cat))

        # C. Faculty Payroll (authoritative TeacherPayroll; excludes cancelled/rejected)
        tp_rows = (await db.execute(
            select(TeacherPayroll.year, TeacherPayroll.month, TeacherPayroll.net_payable)
            .where(
                and_(
                    TeacherPayroll.institution_id == institution_id,
                    TeacherPayroll.status.notin_(["cancelled", "rejected"]),
                )
            )
        )).all()

        # D. Concessions granted on active FeeInvoices inside period
        conc_rows = (await db.execute(
            select(FeeInvoice.issue_date, FeeInvoice.discount_amount)
            .join(Student, FeeInvoice.student_id == Student.id)
            .where(
                and_(
                    Student.institution_id == institution_id,
                    Student.is_demo == is_demo,
                    FeeInvoice.issue_date >= plan.start_date,
                    FeeInvoice.issue_date <= plan.end_date,
                    FeeInvoice.status != "cancelled",
                    FeeInvoice.discount_amount > 0,
                )
            )
        )).all()

        deducted_refund_ids: set[int] = set()

        def _sum_line_actuals(ln: BudgetLineItem) -> Tuple[Decimal, Decimal]:
            actual = Decimal("0.00")
            pending = Decimal("0.00")
            p0, p1 = ln.period_start, ln.period_end

            if ln.source_domain in {"expense_category", "staff_payroll"}:
                for edate, cat_id, amt, st in exp_rows:
                    if p0 <= edate <= p1 and (ln.expense_category_id is None or cat_id == ln.expense_category_id):
                        if st == "submitted":
                            pending += amt
                        else:
                            actual += amt
            elif ln.source_domain == "faculty_payroll":
                for yr, mo, net_amt in tp_rows:
                    m_start, m_end = _month_bounds(yr, mo)
                    if m_start <= p1 and m_end >= p0:
                        actual += net_amt or Decimal("0.00")
            elif ln.source_domain == "fee_category":
                for pdate, amt, fcat_id in pay_rows:
                    if p0 <= pdate <= p1 and (ln.fee_category_id is None or fcat_id == ln.fee_category_id):
                        actual += amt or Decimal("0.00")
                for rid, rdate, ramt, rcat_id in refund_rows:
                    if not (p0 <= rdate <= p1) or rid in deducted_refund_ids:
                        continue
                    if ln.fee_category_id is None or rcat_id == ln.fee_category_id or rcat_id is None:
                        actual -= ramt or Decimal("0.00")
                        deducted_refund_ids.add(rid)
            elif ln.source_domain == "concession":
                for idate, damt in conc_rows:
                    if p0 <= idate <= p1:
                        actual += damt or Decimal("0.00")
            return _q2(max(actual, Decimal("0.00"))), _q2(pending)

        line_results: List[Dict[str, Any]] = []
        period_buckets: Dict[str, Dict[str, Any]] = {}
        total_rev_budget = Decimal("0.00")
        total_rev_actual = Decimal("0.00")
        total_cost_budget = Decimal("0.00")
        total_cost_actual = Decimal("0.00")
        total_cost_pending = Decimal("0.00")

        for ln in lines:
            actual, pending = _sum_line_actuals(ln)
            planned = _q2(ln.planned_amount)
            warn_pct = float(ln.warning_threshold_pct or Decimal("85.00"))

            if ln.line_direction == "inflow_target":
                variance = actual - planned  # positive = exceeded target (favorable)
                util_pct = SafeMath.divide(float(actual), float(planned), multiplier=100.0, precision=1)
                if planned == Decimal("0.00") and actual == Decimal("0.00"):
                    health = "unbudgeted"
                elif actual >= planned:
                    health = "favorable"
                elif util_pct >= warn_pct:
                    health = "on_track"
                else:
                    health = "behind"
                total_rev_budget += planned
                total_rev_actual += actual
            else:
                variance = planned - actual  # positive = under budget (favorable)
                util_pct = SafeMath.divide(float(actual), float(planned), multiplier=100.0, precision=1)
                if planned == Decimal("0.00") and actual == Decimal("0.00"):
                    health = "unbudgeted"
                elif actual > planned:
                    health = "overrun"
                elif util_pct >= warn_pct:
                    health = "warning"
                else:
                    health = "on_track"
                total_cost_budget += planned
                total_cost_actual += actual
                total_cost_pending += pending

            line_results.append({
                "id": ln.id,
                "period_start": ln.period_start.isoformat(),
                "period_end": ln.period_end.isoformat(),
                "period_label": ln.period_label,
                "line_direction": ln.line_direction,
                "source_domain": ln.source_domain,
                "expense_category_id": ln.expense_category_id,
                "fee_category_id": ln.fee_category_id,
                "line_label": ln.line_label,
                "planned_amount": float(planned),
                "actual_amount": float(actual),
                "pending_amount": float(pending),
                "variance_amount": float(_q2(variance)),
                "utilization_pct": util_pct,
                "warning_threshold_pct": warn_pct,
                "status": health,
                "notes": ln.notes,
            })

            pk = ln.period_start.isoformat()
            if pk not in period_buckets:
                period_buckets[pk] = {
                    "period_start": pk,
                    "period_label": ln.period_label,
                    "revenue_budget": 0.0,
                    "revenue_actual": 0.0,
                    "cost_budget": 0.0,
                    "cost_actual": 0.0,
                    "cost_pending": 0.0,
                }
            if ln.line_direction == "inflow_target":
                period_buckets[pk]["revenue_budget"] = round(
                    period_buckets[pk]["revenue_budget"] + float(planned), 2
                )
                period_buckets[pk]["revenue_actual"] = round(
                    period_buckets[pk]["revenue_actual"] + float(actual), 2
                )
            else:
                period_buckets[pk]["cost_budget"] = round(
                    period_buckets[pk]["cost_budget"] + float(planned), 2
                )
                period_buckets[pk]["cost_actual"] = round(
                    period_buckets[pk]["cost_actual"] + float(actual), 2
                )
                period_buckets[pk]["cost_pending"] = round(
                    period_buckets[pk]["cost_pending"] + float(pending), 2
                )

        period_summary = sorted(period_buckets.values(), key=lambda x: x["period_start"])
        for pb in period_summary:
            pb["net_budget"] = round(pb["revenue_budget"] - pb["cost_budget"], 2)
            pb["net_actual"] = round(pb["revenue_actual"] - pb["cost_actual"], 2)

        return {
            "plan": {
                "id": plan.id,
                "name": plan.name,
                "fiscal_year_label": plan.fiscal_year_label,
                "plan_type": plan.plan_type,
                "granularity": plan.granularity,
                "version_number": plan.version_number,
                "status": plan.status,
                "enforcement_mode": plan.enforcement_mode,
                "start_date": plan.start_date.isoformat(),
                "end_date": plan.end_date.isoformat(),
            },
            "summary": {
                "revenue_budget": float(_q2(total_rev_budget)),
                "revenue_actual": float(_q2(total_rev_actual)),
                "revenue_realization_pct": SafeMath.divide(
                    float(total_rev_actual), float(total_rev_budget), multiplier=100.0, precision=1
                ),
                "cost_budget": float(_q2(total_cost_budget)),
                "cost_actual": float(_q2(total_cost_actual)),
                "cost_pending": float(_q2(total_cost_pending)),
                "cost_utilization_pct": SafeMath.divide(
                    float(total_cost_actual), float(total_cost_budget), multiplier=100.0, precision=1
                ),
                "net_margin_budget": float(_q2(total_rev_budget - total_cost_budget)),
                "net_margin_actual": float(_q2(total_rev_actual - total_cost_actual)),
            },
            "period_summary": period_summary,
            "lines": line_results,
        }

    # --------------------------------------------------------------------------
    # 3. EXPENSE BUDGET GUARDRAIL HOOK (Advisory / Soft Warn / Hard Limit)
    # --------------------------------------------------------------------------
    @classmethod
    async def check_expense_budget_guardrail(
        cls,
        db: AsyncSession,
        institution_id: int,
        category_id: int,
        expense_date: date,
        new_amount: Decimal,
        branch_id: Optional[int] = None,
        exclude_expense_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Evaluate an expense against all active approved/locked budgets covering expense_date (strictest policy wins)."""
        conds = [
            BudgetPlan.institution_id == institution_id,
            BudgetPlan.status.in_(["approved", "locked"]),
            BudgetLineItem.expense_category_id == category_id,
            BudgetLineItem.period_start <= expense_date,
            BudgetLineItem.period_end >= expense_date,
            BudgetLineItem.planned_amount > 0,
        ]
        if branch_id is not None:
            conds.append(or_(BudgetPlan.branch_id.is_(None), BudgetPlan.branch_id == branch_id))

        line_stmt = (
            select(BudgetLineItem, BudgetPlan)
            .join(BudgetPlan, BudgetLineItem.budget_plan_id == BudgetPlan.id)
            .where(and_(*conds))
            .order_by(desc(BudgetPlan.version_number), desc(BudgetPlan.id))
        )
        hits = (await db.execute(line_stmt)).all()
        if not hits:
            return {"has_budget": False, "alert_level": "none"}

        mode_rank = {"hard_limit": 3, "soft_warn": 2, "advisory": 1}
        alert_rank = {"overrun": 3, "warning": 2, "ok": 1}
        best_result: Optional[Dict[str, Any]] = None
        best_score: Tuple[int, int, float] = (-1, -1, -1.0)
        spent_cache: Dict[Tuple[date, date], Decimal] = {}

        for line, plan in hits:
            span = (line.period_start, line.period_end)
            if span not in spent_cache:
                spent_stmt = select(func.coalesce(func.sum(Expense.amount), Decimal("0.00"))).where(
                    and_(
                        Expense.institution_id == institution_id,
                        Expense.category_id == category_id,
                        Expense.expense_date >= line.period_start,
                        Expense.expense_date <= line.period_end,
                        Expense.status.in_(["approved", "paid", "submitted"]),
                    )
                )
                if exclude_expense_id:
                    spent_stmt = spent_stmt.where(Expense.id != exclude_expense_id)
                spent_cache[span] = _q2((await db.execute(spent_stmt)).scalar() or Decimal("0.00"))

            spent_before = spent_cache[span]
            projected = _q2(spent_before + _q2(new_amount))
            planned = _q2(line.planned_amount)
            util_pct = SafeMath.divide(float(projected), float(planned), multiplier=100.0, precision=1)

            alert_level = "ok"
            message = None
            if projected > planned:
                alert_level = "overrun"
                message = (
                    f"{line.line_label} ({line.period_label}) projected spend "
                    f"{projected} exceeds budget cap {planned} ({util_pct}%)."
                )
            elif Decimal(str(util_pct)) >= (line.warning_threshold_pct or Decimal("85.00")):
                alert_level = "warning"
                message = (
                    f"{line.line_label} ({line.period_label}) reaches {util_pct}% "
                    f"of budget cap {planned}."
                )

            candidate = {
                "has_budget": True,
                "plan_id": plan.id,
                "plan_name": plan.name,
                "enforcement_mode": plan.enforcement_mode,
                "period_label": line.period_label,
                "line_label": line.line_label,
                "budgeted": float(planned),
                "spent_before": float(spent_before),
                "projected_total": float(projected),
                "utilization_pct": util_pct,
                "alert_level": alert_level,
                "message": message,
            }
            score = (
                alert_rank.get(alert_level, 0),
                mode_rank.get(plan.enforcement_mode, 0),
                util_pct,
            )
            if score > best_score:
                best_score = score
                best_result = candidate

        return best_result or {"has_budget": False, "alert_level": "none"}

    # --------------------------------------------------------------------------
    # 4. DETERMINISTIC 3-DRIVER CASHFLOW & MARGIN FORECAST ENGINE
    # --------------------------------------------------------------------------
    @classmethod
    async def list_scenarios(cls, db: AsyncSession, institution_id: int) -> List[Dict[str, Any]]:
        stmt = (
            select(ForecastScenario)
            .where(ForecastScenario.institution_id == institution_id)
            .order_by(desc(ForecastScenario.is_default), desc(ForecastScenario.id))
        )
        scenarios = (await db.execute(stmt)).scalars().all()
        out: List[Dict[str, Any]] = []
        for sc in scenarios:
            try:
                assumptions = json.loads(sc.assumptions_json or "{}")
            except Exception:
                assumptions = {}
            out.append({
                "id": sc.id,
                "institution_id": sc.institution_id,
                "academic_year_id": sc.academic_year_id,
                "linked_budget_plan_id": sc.linked_budget_plan_id,
                "name": sc.name,
                "scenario_type": sc.scenario_type,
                "horizon_months": sc.horizon_months,
                "opening_bank_balance": float(_q2(sc.opening_bank_balance)),
                "opening_cash_override": float(_q2(sc.opening_cash_override)) if sc.opening_cash_override is not None else None,
                "assumptions": cls.normalize_assumptions(assumptions, sc.scenario_type),
                "is_default": sc.is_default,
                "created_at": sc.created_at.isoformat() if sc.created_at else None,
            })
        return out

    @classmethod
    async def create_scenario(
        cls,
        db: AsyncSession,
        institution_id: int,
        data: Dict[str, Any],
        user_id: int,
    ) -> ForecastScenario:
        s_type = data.get("scenario_type", "baseline")
        assumptions = cls.normalize_assumptions(data.get("assumptions"), s_type)
        horizon = int(data.get("horizon_months", 6))
        if horizon not in (3, 6, 12):
            horizon = max(1, min(24, horizon))

        scenario = ForecastScenario(
            institution_id=institution_id,
            academic_year_id=data.get("academic_year_id"),
            linked_budget_plan_id=data.get("linked_budget_plan_id"),
            name=data["name"].strip(),
            scenario_type=s_type,
            horizon_months=horizon,
            opening_bank_balance=_q2(data.get("opening_bank_balance", 0)),
            opening_cash_override=(
                _q2(data["opening_cash_override"])
                if data.get("opening_cash_override") is not None
                else None
            ),
            assumptions_json=json.dumps(assumptions),
            is_default=bool(data.get("is_default", False)),
            created_by_id=user_id,
        )
        db.add(scenario)
        await db.commit()
        await db.refresh(scenario)
        return scenario

    @classmethod
    async def compute_forecast(
        cls,
        db: AsyncSession,
        institution_id: int,
        scenario_id: Optional[int] = None,
        overrides: Optional[Dict[str, Any]] = None,
        horizon_months: Optional[int] = None,
        opening_bank_balance: Optional[float] = None,
        persist_snapshot: bool = True,
        data_environment: str = "PRODUCTION",
    ) -> Dict[str, Any]:
        """Compute deterministic N-month 3-driver forecast from SSOT ledgers without black-box guesses."""
        scenario: Optional[ForecastScenario] = None
        if scenario_id is not None:
            scenario = (await db.execute(
                select(ForecastScenario).where(
                    and_(ForecastScenario.id == scenario_id, ForecastScenario.institution_id == institution_id)
                )
            )).scalar_one_or_none()
            if not scenario:
                raise LookupError("Forecast scenario not found.")

        scenario_type = scenario.scenario_type if scenario else "baseline"
        stored_assumptions = {}
        if scenario and scenario.assumptions_json:
            try:
                stored_assumptions = json.loads(scenario.assumptions_json)
            except Exception:
                stored_assumptions = {}
        merged_raw = dict(stored_assumptions)
        if overrides:
            merged_raw.update(overrides)
        assumptions = cls.normalize_assumptions(merged_raw, scenario_type)

        months = int(horizon_months or (scenario.horizon_months if scenario else 6))
        months = max(1, min(24, months))
        is_demo = data_environment == "TRAINING"
        today = date.today()
        anchor_start = date(today.year, today.month, 1)
        horizon_end = _month_bounds(
            _add_months(anchor_start, months - 1).year,
            _add_months(anchor_start, months - 1).month,
        )[1]

        # ------------------------------------------------------------------
        # Starting Liquidity: DailyCashRegister physical closing + Bank balance
        # ------------------------------------------------------------------
        if scenario and scenario.opening_cash_override is not None:
            physical_cash = _q2(scenario.opening_cash_override)
        else:
            cash_row = (await db.execute(
                select(DailyCashRegister.physical_closing_balance, DailyCashRegister.expected_closing_balance, DailyCashRegister.status)
                .where(DailyCashRegister.institution_id == institution_id)
                .order_by(desc(DailyCashRegister.register_date), desc(DailyCashRegister.id))
                .limit(1)
            )).first()
            if cash_row:
                physical_cash = _q2(
                    cash_row[0] if cash_row[0] and cash_row[0] > 0 else cash_row[1]
                )
            else:
                physical_cash = Decimal("0.00")

        bank_bal = _q2(
            opening_bank_balance
            if opening_bank_balance is not None
            else (scenario.opening_bank_balance if scenario else Decimal("0.00"))
        )
        running_liquidity = physical_cash + bank_bal
        starting_liquidity = running_liquidity

        # ------------------------------------------------------------------
        # Driver 1A: Scheduled Receivables (FeeInvoiceInstallment + aging)
        # ------------------------------------------------------------------
        inst_rows = (await db.execute(
            select(FeeInvoiceInstallment.due_date, FeeInvoiceInstallment.outstanding_amount)
            .join(FeeInvoice, FeeInvoiceInstallment.invoice_id == FeeInvoice.id)
            .join(Student, FeeInvoice.student_id == Student.id)
            .where(
                and_(
                    Student.institution_id == institution_id,
                    Student.is_demo == is_demo,
                    FeeInvoice.status != "cancelled",
                    FeeInvoiceInstallment.outstanding_amount > 0,
                )
            )
        )).all()

        realization_factor = Decimal(str(assumptions["fee_realization_pct"])) / Decimal("100")
        b_1_30 = Decimal("0.00")
        b_31_60 = Decimal("0.00")
        b_60_plus = Decimal("0.00")
        future_by_ym: Dict[Tuple[int, int], Decimal] = {}

        for due_d, out_amt in inst_rows:
            amt = _q2(out_amt)
            if due_d < anchor_start:
                days_late = (today - due_d).days
                if days_late <= 30:
                    b_1_30 += amt
                elif days_late <= 60:
                    b_31_60 += amt
                else:
                    b_60_plus += amt
            elif due_d <= horizon_end:
                ym = (due_d.year, due_d.month)
                future_by_ym[ym] = future_by_ym.get(ym, Decimal("0.00")) + amt

        recoverable_overdue = (
            b_1_30 * (Decimal(str(assumptions["aging_30d_recovery_pct"])) / Decimal("100"))
            + b_31_60 * (Decimal(str(assumptions["aging_60d_recovery_pct"])) / Decimal("100"))
            + b_60_plus * (Decimal(str(assumptions["aging_90d_recovery_pct"])) / Decimal("100"))
        )

        # ------------------------------------------------------------------
        # Driver 1B: CRM Pipeline Admissions bounded by Batch Open Capacity
        # ------------------------------------------------------------------
        open_leads_count = (await db.execute(
            select(func.count(Lead.id)).where(
                and_(
                    Lead.institution_id == institution_id,
                    Lead.is_active == True,
                    Lead.is_demo == is_demo,
                    Lead.stage.in_(["interested", "counselling_demo", "admission_pending", "contacted"]),
                )
            )
        )).scalar() or 0

        cap_total = (await db.execute(
            select(func.coalesce(func.sum(Division.capacity), 0))
            .join(Standard, Division.standard_id == Standard.id)
            .where(
                and_(
                    Standard.institution_id == institution_id,
                    Division.is_active == True,
                )
            )
        )).scalar() or 0

        enrolled_active = (await db.execute(
            select(func.count(StudentEnrollment.id))
            .join(Student, StudentEnrollment.student_id == Student.id)
            .where(
                and_(
                    Student.institution_id == institution_id,
                    Student.is_demo == is_demo,
                    StudentEnrollment.status == "active",
                )
            )
        )).scalar() or 0

        open_seats = max(0, int(cap_total) - int(enrolled_active)) if cap_total > 0 else int(open_leads_count)
        expected_admissions = min(
            Decimal(str(open_leads_count)) * (Decimal(str(assumptions["lead_conversion_pct"])) / Decimal("100")),
            Decimal(str(open_seats)),
        )

        current_ay_id = (await db.execute(
            select(AcademicYear.id)
            .where(AcademicYear.institution_id == institution_id, AcademicYear.is_active == True)
            .order_by(desc(AcademicYear.is_current), desc(AcademicYear.id))
            .limit(1)
        )).scalar_one_or_none()

        avg_fee = Decimal(str(assumptions["avg_annual_fee_per_student"]))
        if avg_fee <= Decimal("0.00"):
            fs_stmt = select(func.avg(FeeStructure.amount)).where(
                and_(FeeStructure.institution_id == institution_id, FeeStructure.is_active == True)
            )
            avg_fee_row = None
            if current_ay_id:
                avg_fee_row = (await db.execute(fs_stmt.where(FeeStructure.academic_year_id == current_ay_id))).scalar()
            if not avg_fee_row:
                avg_fee_row = (await db.execute(fs_stmt)).scalar()
            avg_fee = _q2(avg_fee_row) if avg_fee_row else Decimal("0.00")

        total_pipeline_value = _q2(expected_admissions * avg_fee)
        pipeline_spread_months = min(3, months)
        monthly_pipeline_amt = (
            _q2(total_pipeline_value / Decimal(str(pipeline_spread_months)))
            if pipeline_spread_months > 0
            else Decimal("0.00")
        )

        # ------------------------------------------------------------------
        # Driver 2A: Faculty Payroll Forecast (Retainers + Timetable + Milestones)
        # ------------------------------------------------------------------
        profiles = (await db.execute(
            select(TeacherPaymentProfile).where(
                and_(
                    TeacherPaymentProfile.institution_id == institution_id,
                    TeacherPaymentProfile.is_active == True,
                )
            )
        )).scalars().all()
        profile_by_teacher = {p.teacher_user_id: p for p in profiles}

        tt_rows = (await db.execute(
            select(TimetableEntry.teacher_id, TimetableEntry.start_time, TimetableEntry.end_time)
            .join(Division, TimetableEntry.division_id == Division.id)
            .join(Standard, Division.standard_id == Standard.id)
            .where(
                and_(
                    Standard.institution_id == institution_id,
                    TimetableEntry.is_active == True,
                    TimetableEntry.teacher_id.is_not(None),
                )
            )
        )).all()

        weekly_hours_by_teacher: Dict[int, Decimal] = {}
        weekly_slots_by_teacher: Dict[int, int] = {}
        for t_id, st, et in tt_rows:
            weekly_hours_by_teacher[t_id] = weekly_hours_by_teacher.get(t_id, Decimal("0.00")) + _parse_hhmm_hours(st, et)
            weekly_slots_by_teacher[t_id] = weekly_slots_by_teacher.get(t_id, 0) + 1

        base_monthly_faculty = Decimal("0.00")
        for tid, prof in profile_by_teacher.items():
            method = (prof.payment_method or "hourly").lower()
            if method in {"monthly_fixed", "fixed_contract", "mixed"}:
                base_monthly_faculty += prof.monthly_fixed_amount or Decimal("0.00")
            if method in {"hourly", "mixed"}:
                hrs_month = weekly_hours_by_teacher.get(tid, Decimal("0.00")) * Decimal("4.33")
                base_monthly_faculty += hrs_month * (prof.hourly_rate or Decimal("0.00"))
            elif method == "per_lecture":
                lecs_month = Decimal(str(weekly_slots_by_teacher.get(tid, 0))) * Decimal("4.33")
                base_monthly_faculty += lecs_month * (prof.per_lecture_rate or Decimal("0.00"))

        milestones = (await db.execute(
            select(TeacherContractMilestone.due_date, TeacherContractMilestone.amount)
            .join(TeacherPaymentProfile, TeacherContractMilestone.payment_profile_id == TeacherPaymentProfile.id)
            .where(
                and_(
                    TeacherPaymentProfile.institution_id == institution_id,
                    TeacherContractMilestone.status.in_(["pending", "achieved", "approved"]),
                    TeacherContractMilestone.due_date.is_not(None),
                    TeacherContractMilestone.due_date >= anchor_start,
                    TeacherContractMilestone.due_date <= horizon_end,
                )
            )
        )).all()
        milestone_by_ym: Dict[Tuple[int, int], Decimal] = {}
        for md, mamt in milestones:
            ym = (md.year, md.month)
            milestone_by_ym[ym] = milestone_by_ym.get(ym, Decimal("0.00")) + _q2(mamt)

        # ------------------------------------------------------------------
        # Driver 2B: Non-Teaching Staff Payroll + Recurring & Variable OpEx
        # ------------------------------------------------------------------
        staff_sal_sum = (await db.execute(
            select(func.coalesce(func.sum(StaffProfile.basic_salary), Decimal("0.00"))).where(
                and_(
                    StaffProfile.institution_id == institution_id,
                    StaffProfile.status == "active",
                    StaffProfile.staff_type != "teacher",
                )
            )
        )).scalar() or Decimal("0.00")

        sal_cat_ids = {
            cid for (cid,) in (await db.execute(
                select(ExpenseCategory.id).where(
                    and_(
                        ExpenseCategory.institution_id == institution_id,
                        func.upper(ExpenseCategory.code) == "SAL",
                    )
                )
            )).all()
        }

        lookback_start = today - timedelta(days=90)
        recent_expenses = (await db.execute(
            select(Expense.expense_date, Expense.category_id, Expense.amount, Expense.is_recurring, Expense.recurring_frequency)
            .where(
                and_(
                    Expense.institution_id == institution_id,
                    Expense.expense_date >= lookback_start,
                    Expense.expense_date <= today,
                    Expense.status.in_(["approved", "paid", "submitted"]),
                )
            )
            .order_by(Expense.expense_date.asc(), Expense.id.asc())
        )).all()

        # Deduplicate recurring streams by (category_id, frequency) using latest entry; normalize 90-day variable spend / 3.0
        latest_recurring: Dict[Tuple[int, str], Decimal] = {}
        var_total = Decimal("0.00")
        sal_expense_sum = Decimal("0.00")

        for edate, cat_id, amt, is_rec, freq in recent_expenses:
            if cat_id in sal_cat_ids:
                sal_expense_sum += amt
                continue
            if is_rec:
                f = (freq or "monthly").lower()
                latest_recurring[(cat_id, f)] = _q2(amt)
            else:
                var_total += amt

        monthly_recurring_opex = sum(
            (amt for (_, f), amt in latest_recurring.items() if f not in {"quarterly", "yearly"}),
            Decimal("0.00"),
        )
        quarterly_recurring_opex = sum(
            (amt for (_, f), amt in latest_recurring.items() if f == "quarterly"),
            Decimal("0.00"),
        )
        yearly_recurring_opex = sum(
            (amt for (_, f), amt in latest_recurring.items() if f == "yearly"),
            Decimal("0.00"),
        )

        if staff_sal_sum == Decimal("0.00") and sal_expense_sum > Decimal("0.00"):
            staff_sal_sum = _q2(sal_expense_sum / Decimal("3.0"))

        monthly_recurring_opex = _q2(monthly_recurring_opex)
        base_variable_opex = _q2(var_total / Decimal("3.0")) if var_total > 0 else Decimal("0.00")
        inflation_factor = Decimal("1.00") + (Decimal(str(assumptions["expense_inflation_pct"])) / Decimal("100"))

        refund_rate = Decimal(str(assumptions["expected_refund_rate_pct"])) / Decimal("100")
        concession_rate = Decimal(str(assumptions["extra_concession_pct"])) / Decimal("100")
        extra_payroll = _q2(assumptions["extra_monthly_payroll"])
        extra_opex = _q2(assumptions["extra_monthly_opex"])

        run_batch_id = str(uuid.uuid4())
        projections: List[Dict[str, Any]] = []
        total_inflows = Decimal("0.00")
        total_outflows = Decimal("0.00")
        trough_period: Optional[Dict[str, Any]] = None
        low_liquidity = running_liquidity
        high_liquidity = running_liquidity

        for idx in range(months):
            p_start = _add_months(anchor_start, idx)
            _, p_end = _month_bounds(p_start.year, p_start.month)
            ym = (p_start.year, p_start.month)

            # Inflows
            sched_inflow = future_by_ym.get(ym, Decimal("0.00")) * realization_factor
            if idx == 0:
                sched_inflow += recoverable_overdue * Decimal("0.60")
            elif idx == 1:
                sched_inflow += recoverable_overdue * Decimal("0.40")
            sched_inflow = _q2(sched_inflow)

            pipe_inflow = monthly_pipeline_amt if idx < pipeline_spread_months else Decimal("0.00")
            gross_inflow = sched_inflow + pipe_inflow
            proj_concessions = _q2(gross_inflow * concession_rate)
            proj_refunds = _q2(gross_inflow * refund_rate)

            # Outflows
            proj_faculty = _q2(base_monthly_faculty + milestone_by_ym.get(ym, Decimal("0.00")) + extra_payroll)
            proj_staff = _q2(staff_sal_sum)
            rec_opex = monthly_recurring_opex
            if (idx % 3) == 0 and quarterly_recurring_opex > 0:
                rec_opex += _q2(quarterly_recurring_opex)
            if (idx % 12) == 0 and yearly_recurring_opex > 0:
                rec_opex += _q2(yearly_recurring_opex)
            rec_opex = _q2(rec_opex)
            compounded_inf = inflation_factor ** (idx + 1) if inflation_factor != Decimal("1.00") else Decimal("1.00")
            var_opex = _q2((base_variable_opex * compounded_inf) + extra_opex)

            net_in = gross_inflow - proj_concessions - proj_refunds
            net_out = proj_faculty + proj_staff + rec_opex + var_opex
            net_cf = _q2(net_in - net_out)
            running_liquidity = _q2(running_liquidity + net_cf)

            # Cumulative Confidence band: low = -12% inflow / +5% outflow; high = +8% inflow / -3% outflow
            low_cf = _q2((net_in * Decimal("0.88")) - (net_out * Decimal("1.05")))
            high_cf = _q2((net_in * Decimal("1.08")) - (net_out * Decimal("0.97")))
            low_liquidity = _q2(low_liquidity + low_cf)
            high_liquidity = _q2(high_liquidity + high_cf)

            total_inflows += net_in
            total_outflows += net_out

            row_dict = {
                "period_start": p_start.isoformat(),
                "period_end": p_end.isoformat(),
                "period_label": p_start.strftime("%b %Y"),
                "projected_fee_collections": float(sched_inflow),
                "projected_pipeline_admissions": float(pipe_inflow),
                "projected_concessions": float(proj_concessions),
                "projected_refunds": float(proj_refunds),
                "projected_total_inflows": float(_q2(net_in)),
                "projected_faculty_payroll": float(proj_faculty),
                "projected_staff_payroll": float(proj_staff),
                "projected_recurring_opex": float(rec_opex),
                "projected_variable_opex": float(var_opex),
                "projected_total_outflows": float(_q2(net_out)),
                "projected_net_cashflow": float(net_cf),
                "projected_ending_liquidity": float(running_liquidity),
                "confidence_low": float(low_liquidity),
                "confidence_high": float(high_liquidity),
            }
            projections.append(row_dict)

            if trough_period is None or row_dict["projected_ending_liquidity"] < trough_period["projected_ending_liquidity"]:
                trough_period = row_dict

            if persist_snapshot and scenario is not None:
                db.add(ForecastPeriodProjection(
                    scenario_id=scenario.id,
                    run_batch_id=run_batch_id,
                    period_start=p_start,
                    period_end=p_end,
                    period_label=row_dict["period_label"],
                    projected_fee_collections=sched_inflow,
                    projected_pipeline_admissions=pipe_inflow,
                    projected_concessions=proj_concessions,
                    projected_refunds=proj_refunds,
                    projected_faculty_payroll=proj_faculty,
                    projected_staff_payroll=proj_staff,
                    projected_recurring_opex=rec_opex,
                    projected_variable_opex=var_opex,
                    projected_net_cashflow=net_cf,
                    projected_ending_liquidity=running_liquidity,
                    confidence_low=_q2(row_dict["confidence_low"]),
                    confidence_high=_q2(row_dict["confidence_high"]),
                    provenance_summary_json=json.dumps({
                        "open_leads": open_leads_count,
                        "open_seats": open_seats,
                        "overdue_1_30": float(b_1_30),
                        "overdue_31_60": float(b_31_60),
                        "overdue_60_plus": float(b_60_plus),
                    }),
                ))

        if persist_snapshot and scenario is not None:
            await db.commit()

        runway_months: Optional[float] = None
        if starting_liquidity <= Decimal("0.00") and projections and projections[0]["projected_ending_liquidity"] <= 0:
            runway_months = 0.0
        else:
            prev_liq = float(starting_liquidity)
            for idx, p_row in enumerate(projections):
                cur_liq = float(p_row["projected_ending_liquidity"])
                if cur_liq <= 0:
                    denom = prev_liq - cur_liq
                    frac = (prev_liq / denom) if denom > 0 and prev_liq > 0 else 0.0
                    runway_months = round(idx + frac, 1)
                    break
                prev_liq = cur_liq

        return {
            "scenario": {
                "id": scenario.id if scenario else None,
                "name": scenario.name if scenario else "Ad-hoc Simulation",
                "scenario_type": scenario_type,
                "horizon_months": months,
                "assumptions": assumptions,
            },
            "run_batch_id": run_batch_id,
            "summary": {
                "starting_cash_register": float(physical_cash),
                "opening_bank_balance": float(bank_bal),
                "starting_liquidity": float(starting_liquidity),
                "total_projected_inflows": float(_q2(total_inflows)),
                "total_projected_outflows": float(_q2(total_outflows)),
                "net_projected_surplus": float(_q2(total_inflows - total_outflows)),
                "ending_liquidity": float(running_liquidity),
                "trough_month": trough_period["period_label"] if trough_period else None,
                "trough_liquidity": trough_period["projected_ending_liquidity"] if trough_period else float(starting_liquidity),
                "runway_months": runway_months,
                "runway_status": "self_sustaining" if runway_months is None else ("healthy" if runway_months >= 6 else "watch"),
            },
            "drivers_context": {
                "overdue_receivables_1_30d": float(b_1_30),
                "overdue_receivables_31_60d": float(b_31_60),
                "overdue_receivables_60d_plus": float(b_60_plus),
                "open_qualified_leads": open_leads_count,
                "open_batch_seats": open_seats,
                "avg_annual_fee_basis": float(avg_fee),
                "monthly_faculty_retainer_and_schedule": float(_q2(base_monthly_faculty)),
                "monthly_staff_payroll_basis": float(_q2(staff_sal_sum)),
            },
            "projections": projections,
        }
