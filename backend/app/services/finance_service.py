# /**
#  * @file        finance_service.py
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
#  * @created     2026-11-24
#  * @updated     2026-11-27
#  *
#  * @description Domain service implementing Daily Expense Management, Live Cash Movements, Denomination Counting, and Daily Cash Opening and Closing.
#  */

import json
from datetime import datetime, date, timezone
from decimal import Decimal
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc, text

from app.models.finance import (
    ExpenseCategory,
    Expense,
    CashRegister,
    DailyCashRegister,
    CashTransaction,
)
from app.models.payment import Payment, Refund
from app.models.student import Student
from app.models.user import User


class FinanceService:
    DENOMINATIONS = [500, 200, 100, 50, 20, 10, 5, 2, 1]

    # --------------------------------------------------------------------------
    # 1. EXPENSE MANAGEMENT
    # --------------------------------------------------------------------------
    @staticmethod
    async def generate_expense_number(db: AsyncSession, institution_id: int) -> str:
        """Generate a globally unique expense number (uq_expense_number is global across tenants)."""
        current_year = date.today().year
        prefix = f"EXP-{current_year}-"
        stmt = select(Expense.expense_number).where(
            Expense.expense_number.like(f"{prefix}%")
        )
        existing = (await db.execute(stmt)).scalars().all()
        max_seq = 0
        existing_set = set(existing)
        for code in existing_set:
            tail = code[len(prefix):]
            if tail.isdigit():
                max_seq = max(max_seq, int(tail))
        next_seq = max_seq + 1
        candidate = f"{prefix}{next_seq:04d}"
        while candidate in existing_set:
            next_seq += 1
            candidate = f"{prefix}{next_seq:04d}"
        return candidate

    @staticmethod
    async def create_expense(
        db: AsyncSession,
        institution_id: int,
        data: Dict[str, Any],
        recorded_by_id: int,
    ) -> Expense:
        expense_number = await FinanceService.generate_expense_number(db, institution_id)
        expense = Expense(
            institution_id=institution_id,
            branch_id=data.get("branch_id", 1),
            category_id=data["category_id"],
            expense_number=expense_number,
            expense_date=data.get("expense_date", date.today()),
            title=data["title"],
            description=data.get("description"),
            amount=Decimal(str(data["amount"])),
            payment_mode=data.get("payment_mode", "CASH").upper(),
            paid_to_vendor=data["paid_to_vendor"],
            vendor_contact=data.get("vendor_contact"),
            invoice_reference=data.get("invoice_reference"),
            attachment_url=data.get("attachment_url"),
            attachment_name=data.get("attachment_name"),
            status=data.get("status", "submitted"),
            is_recurring=data.get("is_recurring", False),
            recurring_frequency=data.get("recurring_frequency"),
            recorded_by_id=recorded_by_id,
            notes=data.get("notes"),
        )
        if expense.status == "approved":
            expense.approved_by_id = recorded_by_id
            expense.approved_at = datetime.now(timezone.utc)
        if expense.status == "paid":
            expense.paid_at = datetime.now(timezone.utc)
            if not expense.approved_at:
                expense.approved_by_id = recorded_by_id
                expense.approved_at = datetime.now(timezone.utc)

        db.add(expense)
        await db.commit()
        await db.refresh(expense)
        return expense

    @staticmethod
    async def create_expense_with_budget_check(
        db: AsyncSession,
        institution_id: int,
        data: Dict[str, Any],
        recorded_by_id: int,
    ) -> Tuple[Expense, Dict[str, Any]]:
        """Create expense after evaluating active approved budget guardrails."""
        from app.services.budget_forecast_service import BudgetForecastService

        exp_date = data.get("expense_date") or date.today()
        guardrail = await BudgetForecastService.check_expense_budget_guardrail(
            db=db,
            institution_id=institution_id,
            category_id=int(data["category_id"]),
            expense_date=exp_date,
            new_amount=Decimal(str(data["amount"])),
        )
        if (
            guardrail.get("has_budget")
            and guardrail.get("enforcement_mode") == "hard_limit"
            and guardrail.get("alert_level") == "overrun"
            and not (data.get("budget_override_reason") or "").strip()
        ):
            raise ValueError(
                f"Budget hard limit exceeded: {guardrail.get('message')} Provide budget_override_reason to override."
            )
        expense = await FinanceService.create_expense(db, institution_id, data, recorded_by_id)
        return expense, guardrail

    @staticmethod
    async def update_expense(
        db: AsyncSession,
        expense_id: int,
        data: Dict[str, Any],
        user_id: int,
    ) -> Optional[Expense]:
        stmt = select(Expense).where(Expense.id == expense_id)
        expense = (await db.execute(stmt)).scalar_one_or_none()
        if not expense:
            return None

        for field in [
            "title", "description", "category_id", "expense_date", "payment_mode",
            "paid_to_vendor", "vendor_contact", "invoice_reference", "attachment_url",
            "attachment_name", "status", "is_recurring", "recurring_frequency", "notes"
        ]:
            if field in data and data[field] is not None:
                if field == "payment_mode":
                    setattr(expense, field, str(data[field]).upper())
                else:
                    setattr(expense, field, data[field])

        if "amount" in data and data["amount"] is not None:
            expense.amount = Decimal(str(data["amount"]))

        if data.get("status") == "approved" and not expense.approved_at:
            expense.approved_by_id = user_id
            expense.approved_at = datetime.now(timezone.utc)
        elif data.get("status") == "paid" and not expense.paid_at:
            expense.paid_at = datetime.now(timezone.utc)

        await db.commit()
        await db.refresh(expense)
        return expense

    @staticmethod
    async def approve_expense(
        db: AsyncSession, expense_id: int, approved_by_id: int
    ) -> Optional[Expense]:
        stmt = select(Expense).where(Expense.id == expense_id)
        expense = (await db.execute(stmt)).scalar_one_or_none()
        if not expense:
            return None

        expense.status = "approved"
        expense.approved_by_id = approved_by_id
        expense.approved_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(expense)
        return expense

    @staticmethod
    async def pay_expense(
        db: AsyncSession, expense_id: int, paid_by_id: int
    ) -> Optional[Expense]:
        stmt = select(Expense).where(Expense.id == expense_id)
        expense = (await db.execute(stmt)).scalar_one_or_none()
        if not expense:
            return None

        expense.status = "paid"
        expense.paid_at = datetime.now(timezone.utc)
        if not expense.approved_at:
            expense.approved_by_id = paid_by_id
            expense.approved_at = datetime.now(timezone.utc)

        await db.commit()
        await db.refresh(expense)
        return expense

    @staticmethod
    async def get_expense_dashboard_metrics(
        db: AsyncSession, institution_id: int, branch_id: Optional[int] = None
    ) -> Dict[str, Any]:
        today = date.today()
        first_day_month = today.replace(day=1)

        # 1. Today's Expenses
        today_stmt = select(
            func.coalesce(func.sum(Expense.amount), Decimal("0.00")),
            func.count(Expense.id),
        ).where(
            and_(
                Expense.institution_id == institution_id,
                Expense.expense_date == today,
                Expense.status.in_(["approved", "paid", "submitted"]),
            )
        )
        today_row = (await db.execute(today_stmt)).one()
        today_sum, today_count = today_row[0], today_row[1]

        # 2. Month's Expenses
        month_stmt = select(
            func.coalesce(func.sum(Expense.amount), Decimal("0.00")),
            func.count(Expense.id),
        ).where(
            and_(
                Expense.institution_id == institution_id,
                Expense.expense_date >= first_day_month,
                Expense.expense_date <= today,
                Expense.status.in_(["approved", "paid", "submitted"]),
            )
        )
        month_row = (await db.execute(month_stmt)).one()
        month_sum, month_count = month_row[0], month_row[1]

        # 3. Pending Approval
        pending_stmt = select(
            func.coalesce(func.sum(Expense.amount), Decimal("0.00")),
            func.count(Expense.id),
        ).where(
            and_(
                Expense.institution_id == institution_id,
                Expense.status == "submitted",
            )
        )
        pending_row = (await db.execute(pending_stmt)).one()
        pending_sum, pending_count = pending_row[0], pending_row[1]

        # 4. Total count of transactions
        total_stmt = select(func.count(Expense.id)).where(Expense.institution_id == institution_id)
        total_transactions = (await db.execute(total_stmt)).scalar() or 0

        # 5. Category breakdown
        cat_stmt = (
            select(
                ExpenseCategory.name,
                func.coalesce(func.sum(Expense.amount), Decimal("0.00")).label("cat_total"),
                func.count(Expense.id).label("cat_count"),
            )
            .join(ExpenseCategory, Expense.category_id == ExpenseCategory.id)
            .where(
                and_(
                    Expense.institution_id == institution_id,
                    Expense.expense_date >= first_day_month,
                    Expense.status.in_(["approved", "paid", "submitted"]),
                )
            )
            .group_by(ExpenseCategory.name)
            .order_by(desc("cat_total"))
        )
        cat_rows = (await db.execute(cat_stmt)).all()

        categories_breakdown = []
        month_float = float(month_sum) if month_sum > 0 else 1.0
        for r in cat_rows:
            cat_val = float(r[1])
            pct = round((cat_val / month_float) * 100, 1) if month_float > 0 else 0.0
            categories_breakdown.append({
                "category": r[0],
                "amount": cat_val,
                "count": r[2],
                "percentage": pct,
            })

        return {
            "today_expenses": float(today_sum),
            "today_count": today_count,
            "this_month_expenses": float(month_sum),
            "month_count": month_count,
            "pending_approval_amount": float(pending_sum),
            "pending_approval_count": pending_count,
            "total_transactions": total_transactions,
            "categories_breakdown": categories_breakdown,
        }

    # --------------------------------------------------------------------------
    # 2. DAILY AUTOMATED CASH OPENING & CLOSING MANAGEMENT
    # --------------------------------------------------------------------------
    @staticmethod
    async def get_or_create_daily_register(
        db: AsyncSession,
        institution_id: int,
        register_date: date,
        cash_register_id: Optional[int] = None,
        user_id: Optional[int] = None,
    ) -> DailyCashRegister:
        # 1. Resolve default cash register if not provided
        if not cash_register_id:
            reg_stmt = select(CashRegister).where(
                and_(
                    CashRegister.institution_id == institution_id,
                    CashRegister.is_active == True,
                    CashRegister.is_default == True,
                )
            ).limit(1)
            active_reg = (await db.execute(reg_stmt)).scalar_one_or_none()
            if not active_reg:
                active_reg = CashRegister(
                    institution_id=institution_id,
                    branch_id=1,
                    name="Main Front Desk Counter",
                    code="CASH-REG-01",
                    description="Primary admissions and fee collection cash drawer",
                    is_active=True,
                    is_default=True,
                )
                db.add(active_reg)
                await db.commit()
                await db.refresh(active_reg)
            cash_register_id = active_reg.id

        # 2. Check if daily register exists for this date
        stmt = select(DailyCashRegister).where(
            and_(
                DailyCashRegister.cash_register_id == cash_register_id,
                DailyCashRegister.register_date == register_date,
            )
        )
        daily_reg = (await db.execute(stmt)).scalar_one_or_none()

        if not daily_reg:
            # Look up previous day's verified closing
            prev_stmt = (
                select(DailyCashRegister)
                .where(
                    and_(
                        DailyCashRegister.cash_register_id == cash_register_id,
                        DailyCashRegister.register_date < register_date,
                    )
                )
                .order_by(desc(DailyCashRegister.register_date))
                .limit(1)
            )
            prev_reg = (await db.execute(prev_stmt)).scalar_one_or_none()

            opening_balance = Decimal("0.00")
            source_closing_id = None
            initial_status = "open"
            opening_notes = None

            if prev_reg:
                source_closing_id = prev_reg.id
                if prev_reg.status in ["closed", "pending_approval"]:
                    # Carry forward verified physical closing if available, else expected
                    opening_balance = prev_reg.physical_closing_balance if prev_reg.physical_closing_balance > 0 else prev_reg.expected_closing_balance
                else:
                    # Previous day was never closed!
                    initial_status = "pending_reconciliation"
                    opening_balance = prev_reg.expected_closing_balance
                    opening_notes = (
                        f"Previous business day ({prev_reg.register_date}) was not formally closed and locked. "
                        "Cash drawer requires physical reconciliation."
                    )

            daily_reg = DailyCashRegister(
                institution_id=institution_id,
                cash_register_id=cash_register_id,
                register_date=register_date,
                status=initial_status,
                opening_balance=opening_balance,
                opening_source_closing_id=source_closing_id,
                opened_by_id=user_id,
                opened_at=datetime.now(timezone.utc),
                opening_notes=opening_notes,
                business_day_start_time="08:00",
            )
            db.add(daily_reg)
            await db.commit()
            await db.refresh(daily_reg)

        # 3. Synchronize live cash movements and recalculate
        await FinanceService.sync_live_cash_movements(db, daily_reg)
        return daily_reg

    @staticmethod
    async def sync_live_cash_movements(
        db: AsyncSession, daily_reg: DailyCashRegister
    ) -> DailyCashRegister:
        reg_date = daily_reg.register_date
        inst_id = daily_reg.institution_id

        # A. Cash Fee Collections (payments table where payment_method = 'CASH' and status in ('posted', 'completed'))
        fees_stmt = select(func.coalesce(func.sum(Payment.amount), Decimal("0.00"))).where(
            and_(
                func.upper(Payment.payment_method) == "CASH",
                Payment.payment_date == reg_date,
                Payment.status.in_(["posted", "completed"]),
            )
        )
        cash_fees = (await db.execute(fees_stmt)).scalar() or Decimal("0.00")

        # B. Cash Expenses Paid (expenses table where payment_mode = 'CASH' and status in ('approved', 'paid'))
        exp_stmt = select(func.coalesce(func.sum(Expense.amount), Decimal("0.00"))).where(
            and_(
                Expense.institution_id == inst_id,
                func.upper(Expense.payment_mode) == "CASH",
                Expense.expense_date == reg_date,
                Expense.status.in_(["approved", "paid"]),
            )
        )
        cash_expenses = (await db.execute(exp_stmt)).scalar() or Decimal("0.00")

        # C. Cash Refunds (refunds table where refund_method = 'CASH' and status = 'completed')
        ref_stmt = select(func.coalesce(func.sum(Refund.amount), Decimal("0.00"))).where(
            and_(
                Refund.institution_id == inst_id,
                func.upper(Refund.refund_method) == "CASH",
                Refund.refund_date == reg_date,
                Refund.status == "completed",
            )
        )
        cash_refunds = (await db.execute(ref_stmt)).scalar() or Decimal("0.00")

        # D. Ancillary Cash Transactions (bank withdrawals/deposits, transfers)
        txn_stmt = select(
            CashTransaction.transaction_type,
            func.coalesce(func.sum(CashTransaction.amount), Decimal("0.00")),
        ).where(
            and_(
                CashTransaction.cash_register_id == daily_reg.cash_register_id,
                CashTransaction.transaction_date == reg_date,
            )
        ).group_by(CashTransaction.transaction_type)
        txn_rows = (await db.execute(txn_stmt)).all()

        bank_withdrawals = Decimal("0.00")
        bank_deposits = Decimal("0.00")
        transfers_in = Decimal("0.00")
        transfers_out = Decimal("0.00")
        other_inflows = Decimal("0.00")

        for t_type, t_amt in txn_rows:
            if t_type == "bank_withdrawal":
                bank_withdrawals += t_amt
            elif t_type == "bank_deposit":
                bank_deposits += t_amt
            elif t_type == "transfer_in":
                transfers_in += t_amt
            elif t_type == "transfer_out":
                transfers_out += t_amt
            elif t_type == "other_receipt":
                other_inflows += t_amt

        # Update Live Aggregates
        daily_reg.cash_inflows_fees = cash_fees
        daily_reg.cash_inflows_other = other_inflows
        daily_reg.cash_inflows_bank_withdrawal = bank_withdrawals
        daily_reg.cash_inflows_transfers = transfers_in
        daily_reg.total_cash_inflows = (
            cash_fees + other_inflows + bank_withdrawals + transfers_in
        )

        daily_reg.cash_outflows_expenses = cash_expenses
        daily_reg.cash_outflows_refunds = cash_refunds
        daily_reg.cash_outflows_bank_deposit = bank_deposits
        daily_reg.cash_outflows_transfers = transfers_out
        daily_reg.total_cash_outflows = (
            cash_expenses + cash_refunds + bank_deposits + transfers_out
        )

        # Expected Closing = Opening + Total Inflows - Total Outflows
        expected = daily_reg.opening_balance + daily_reg.total_cash_inflows - daily_reg.total_cash_outflows
        daily_reg.expected_closing_balance = expected

        # If register is not yet locked, re-evaluate difference
        if not daily_reg.is_locked and daily_reg.physical_closing_balance > 0:
            diff = daily_reg.physical_closing_balance - daily_reg.expected_closing_balance
            daily_reg.difference_amount = diff
            if diff < 0:
                daily_reg.difference_type = "shortage"
            elif diff > 0:
                daily_reg.difference_type = "excess"
            else:
                daily_reg.difference_type = "none"

        await db.commit()
        await db.refresh(daily_reg)
        return daily_reg

    @staticmethod
    def calculate_denominations_total(denominations_dict: Dict[str, Any]) -> Decimal:
        total = Decimal("0.00")
        for denom in FinanceService.DENOMINATIONS:
            key = str(denom)
            count = int(denominations_dict.get(key, 0) or 0)
            if count > 0:
                total += Decimal(str(denom * count))
        return total

    @staticmethod
    async def submit_daily_closing(
        db: AsyncSession,
        daily_reg_id: int,
        denominations_dict: Dict[str, Any],
        difference_reason: Optional[str],
        user_id: int,
    ) -> DailyCashRegister:
        stmt = select(DailyCashRegister).where(DailyCashRegister.id == daily_reg_id)
        daily_reg = (await db.execute(stmt)).scalar_one_or_none()
        if not daily_reg:
            raise ValueError(f"Daily cash register with ID {daily_reg_id} not found")

        if daily_reg.is_locked:
            raise ValueError("This cash register has already been closed and locked by supervisor.")

        # Sync live movements first
        await FinanceService.sync_live_cash_movements(db, daily_reg)

        # Calculate physical cash total from denomination count
        physical_total = FinanceService.calculate_denominations_total(denominations_dict)
        difference = physical_total - daily_reg.expected_closing_balance

        diff_type = "none"
        if difference < 0:
            diff_type = "shortage"
        elif difference > 0:
            diff_type = "excess"

        # Mandatory explanation rule for differences
        if diff_type != "none" and not difference_reason:
            raise ValueError(
                f"A mandatory explanation is required for a cash {diff_type} of ₹{abs(difference):,.2f}."
            )

        daily_reg.denominations = json.dumps(denominations_dict)
        daily_reg.physical_closing_balance = physical_total
        daily_reg.difference_amount = difference
        daily_reg.difference_type = diff_type
        daily_reg.difference_reason = difference_reason
        daily_reg.closed_by_id = user_id
        daily_reg.closed_at = datetime.now(timezone.utc)
        daily_reg.status = "pending_approval"

        await db.commit()
        await db.refresh(daily_reg)
        return daily_reg

    @staticmethod
    async def verify_and_lock_daily_closing(
        db: AsyncSession, daily_reg_id: int, supervisor_user_id: int
    ) -> DailyCashRegister:
        stmt = select(DailyCashRegister).where(DailyCashRegister.id == daily_reg_id)
        daily_reg = (await db.execute(stmt)).scalar_one_or_none()
        if not daily_reg:
            raise ValueError(f"Daily cash register with ID {daily_reg_id} not found")

        daily_reg.status = "closed"
        daily_reg.is_locked = True
        daily_reg.verified_by_id = supervisor_user_id
        daily_reg.verified_at = datetime.now(timezone.utc)

        await db.commit()
        await db.refresh(daily_reg)
        return daily_reg

    @staticmethod
    async def reopen_daily_closing(
        db: AsyncSession,
        daily_reg_id: int,
        reason: str,
        supervisor_user_id: int,
    ) -> DailyCashRegister:
        if not reason or len(reason.strip()) < 5:
            raise ValueError("A formal audit reason is required to reopen a closed cash register.")

        stmt = select(DailyCashRegister).where(DailyCashRegister.id == daily_reg_id)
        daily_reg = (await db.execute(stmt)).scalar_one_or_none()
        if not daily_reg:
            raise ValueError(f"Daily cash register with ID {daily_reg_id} not found")

        daily_reg.status = "reopened"
        daily_reg.is_locked = False
        daily_reg.reopened_by_id = supervisor_user_id
        daily_reg.reopened_at = datetime.now(timezone.utc)
        daily_reg.reopening_reason = reason.strip()

        await db.commit()
        await db.refresh(daily_reg)
        return daily_reg

    @staticmethod
    async def get_daily_cashbook(
        db: AsyncSession,
        institution_id: int,
        target_date: date,
        register_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Generates a chronological, unified Daily Cash Book combining:
        - Opening cash balance
        - Student cash fee collections (payments)
        - Cash expenses paid (expenses)
        - Cash student refunds (refunds)
        - Cash bank transactions (cash_transactions)
        - Running cumulative cash balance
        """
        daily_reg = await FinanceService.get_or_create_daily_register(
            db, institution_id, target_date, register_id
        )

        entries = []

        # 1. Opening Balance Entry
        running_balance = daily_reg.opening_balance
        entries.append({
            "timestamp": f"{target_date} 08:00:00",
            "type": "OPENING",
            "category": "Opening Balance",
            "reference": f"OPEN-{target_date}",
            "description": f"Verified opening cash in hand (carried forward from previous close)",
            "inflow": float(daily_reg.opening_balance),
            "outflow": 0.0,
            "running_balance": float(running_balance),
        })

        # 2. Student Cash Fee Collections
        fee_stmt = (
            select(Payment, Student)
            .join(Student, Payment.student_id == Student.id)
            .where(
                and_(
                    func.upper(Payment.payment_method) == "CASH",
                    Payment.payment_date == target_date,
                    Payment.status.in_(["posted", "completed"]),
                )
            )
            .order_by(Payment.created_at)
        )
        fee_rows = (await db.execute(fee_stmt)).all()
        for p, s in fee_rows:
            inflow = float(p.amount)
            running_balance += p.amount
            time_str = p.created_at.strftime("%H:%M:%S") if p.created_at else "09:00:00"
            entries.append({
                "timestamp": f"{target_date} {time_str}",
                "type": "FEE_RECEIPT",
                "category": "Student Fee Collection",
                "reference": p.transaction_reference or f"FEE-PAY-{p.id}",
                "description": f"Fee payment received from {s.first_name} {s.last_name or ''} (Adm: {s.admission_number or 'N/A'})",
                "inflow": inflow,
                "outflow": 0.0,
                "running_balance": float(running_balance),
            })

        # 3. Cash Expenses
        exp_stmt = (
            select(Expense, ExpenseCategory)
            .join(ExpenseCategory, Expense.category_id == ExpenseCategory.id)
            .where(
                and_(
                    Expense.institution_id == institution_id,
                    func.upper(Expense.payment_mode) == "CASH",
                    Expense.expense_date == target_date,
                    Expense.status.in_(["approved", "paid"]),
                )
            )
            .order_by(Expense.created_at)
        )
        exp_rows = (await db.execute(exp_stmt)).all()
        for exp, cat in exp_rows:
            outflow = float(exp.amount)
            running_balance -= exp.amount
            time_str = exp.created_at.strftime("%H:%M:%S") if exp.created_at else "11:00:00"
            entries.append({
                "timestamp": f"{target_date} {time_str}",
                "type": "EXPENSE_PAID",
                "category": cat.name,
                "reference": exp.expense_number,
                "description": f"Paid to {exp.paid_to_vendor} — {exp.title}",
                "inflow": 0.0,
                "outflow": outflow,
                "running_balance": float(running_balance),
            })

        # 4. Cash Refunds
        ref_stmt = (
            select(Refund, Student)
            .join(Student, Refund.student_id == Student.id)
            .where(
                and_(
                    Refund.institution_id == institution_id,
                    func.upper(Refund.refund_method) == "CASH",
                    Refund.refund_date == target_date,
                    Refund.status == "completed",
                )
            )
            .order_by(Refund.created_at)
        )
        ref_rows = (await db.execute(ref_stmt)).all()
        for ref, s in ref_rows:
            outflow = float(ref.amount)
            running_balance -= ref.amount
            time_str = ref.created_at.strftime("%H:%M:%S") if ref.created_at else "14:00:00"
            entries.append({
                "timestamp": f"{target_date} {time_str}",
                "type": "REFUND_PAID",
                "category": "Student Fee Refund",
                "reference": ref.reference_number or f"REF-{ref.id}",
                "description": f"Cash refund issued to {s.first_name} {s.last_name or ''} — {ref.reason or 'Fee Refund'}",
                "inflow": 0.0,
                "outflow": outflow,
                "running_balance": float(running_balance),
            })

        # 5. Ancillary Cash Movements
        txn_stmt = (
            select(CashTransaction)
            .where(
                and_(
                    CashTransaction.cash_register_id == daily_reg.cash_register_id,
                    CashTransaction.transaction_date == target_date,
                )
            )
            .order_by(CashTransaction.created_at)
        )
        txn_rows = (await db.execute(txn_stmt)).scalars().all()
        for t in txn_rows:
            t_amt = float(t.amount)
            time_str = t.created_at.strftime("%H:%M:%S") if t.created_at else "16:00:00"
            if t.transaction_type in ["bank_withdrawal", "transfer_in", "other_receipt"]:
                running_balance += t.amount
                inflow, outflow = t_amt, 0.0
            else:
                running_balance -= t.amount
                inflow, outflow = 0.0, t_amt

            entries.append({
                "timestamp": f"{target_date} {time_str}",
                "type": t.transaction_type.upper(),
                "category": t.transaction_type.replace("_", " ").title(),
                "reference": t.reference_number or f"CTXN-{t.id}",
                "description": f"{t.description or ''} ({t.destination_or_source or 'Cash Drawer'})",
                "inflow": inflow,
                "outflow": outflow,
                "running_balance": float(running_balance),
            })

        # Sort entries chronologically
        entries.sort(key=lambda x: x["timestamp"])

        return {
            "register_date": str(target_date),
            "cash_register_id": daily_reg.cash_register_id,
            "opening_balance": float(daily_reg.opening_balance),
            "total_inflows": float(daily_reg.total_cash_inflows),
            "total_outflows": float(daily_reg.total_cash_outflows),
            "expected_closing": float(daily_reg.expected_closing_balance),
            "physical_closing": float(daily_reg.physical_closing_balance),
            "difference": float(daily_reg.difference_amount),
            "status": daily_reg.status,
            "is_locked": daily_reg.is_locked,
            "entries_count": len(entries),
            "entries": entries,
        }
