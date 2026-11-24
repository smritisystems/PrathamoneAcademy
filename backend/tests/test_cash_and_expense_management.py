# /**
#  * @file        test_cash_and_expense_management.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      backend.tests
#  *
#  * @author      Jawahar R. Mallah
#  * @organization Smritisys & AITDL Networks
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 PrathamOne EduOS
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-24
#  * @updated     2026-11-24
#  *
#  * @description Rigorous automated acceptance test suite for Daily Expense Management and Automated Cash Opening, Closing, and Reconciliation.
#  */

import pytest
import pytest_asyncio
from datetime import date, timedelta
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.core.database import AsyncSessionLocal
from app.models.finance import (
    ExpenseCategory,
    Expense,
    CashRegister,
    DailyCashRegister,
    CashTransaction,
)
from app.models.payment import Payment, Refund
from app.models.student import Student
from app.models.academic_year import AcademicYear
from app.models.user import User
from app.services.finance_service import FinanceService


@pytest.mark.asyncio
async def test_acceptance_scenario_and_cash_lifecycle():
    """
    K. ACCEPTANCE TEST:
    Verify the primary acceptance scenario specified in directive:
    - Opening Cash: ₹5,000
    - Student Cash Collections: ₹12,000
    - Cash Expenses Paid: ₹2,500
    - Expected Closing: ₹14,500
    - Physical Cash: ₹14,300 (Denominations: 20x500 + 15x200 + 10x100 + 6x50)
    - Difference: ₹200 Shortage
    - Mandates explanation for shortage, submits closing, supervisor verifies & locks.
    - Next business day automatically carries forward verified ₹14,300 as Opening Cash!
    """
    async with AsyncSessionLocal() as db:
        # Resolve test user & institution
        user = (await db.execute(select(User).limit(1))).scalar_one()
        student = (await db.execute(select(Student).limit(1))).scalar_one()
        acad_year = (await db.execute(select(AcademicYear).limit(1))).scalar_one()

        test_day_1 = date(2026, 12, 1)
        test_day_2 = date(2026, 12, 2)

        # Cleanup any existing test data for these dates
        await db.execute(delete(DailyCashRegister).where(DailyCashRegister.register_date.in_([test_day_1, test_day_2])))
        await db.execute(delete(Expense).where(Expense.expense_date.in_([test_day_1, test_day_2])))
        await db.execute(delete(Payment).where(Payment.payment_date.in_([test_day_1, test_day_2])))
        await db.execute(delete(CashTransaction).where(CashTransaction.transaction_date.in_([test_day_1, test_day_2])))
        await db.commit()

        # Step 1: Ensure Cash Register exists
        cash_reg = await FinanceService.get_or_create_daily_register(
            db, institution_id=1, register_date=test_day_1, user_id=user.id
        )
        reg_id = cash_reg.cash_register_id

        # Explicitly set Opening Cash = ₹5,000 for Day 1 test baseline
        cash_reg.opening_balance = Decimal("5000.00")
        await db.commit()
        await db.refresh(cash_reg)
        assert cash_reg.opening_balance == Decimal("5000.00")

        # Step 2: Record Student Cash Collection of ₹12,000
        cash_payment = Payment(
            student_id=student.id,
            academic_year_id=acad_year.id,
            amount=Decimal("12000.00"),
            payment_date=test_day_1,
            payment_method="CASH",
            transaction_reference="TEST-FEE-12000",
            status="posted",
            collected_by_id=user.id,
        )
        db.add(cash_payment)
        await db.commit()

        # Step 3: Record Approved Cash Expense of ₹2,500
        cat = (await db.execute(select(ExpenseCategory).limit(1))).scalar_one()
        expense_data = {
            "category_id": cat.id,
            "title": "Classroom Stationery & Test Printing",
            "amount": 2500.00,
            "expense_date": test_day_1,
            "payment_mode": "CASH",
            "paid_to_vendor": "Shree Ganesh Stationers",
            "status": "approved",
        }
        expense = await FinanceService.create_expense(db, 1, expense_data, user.id)
        assert expense.amount == Decimal("2500.00")
        assert expense.status == "approved"

        # Step 4: Sync Live Cash Movements & Verify Expected Closing
        # Expected = 5,000 (Opening) + 12,000 (Inflow) - 2,500 (Outflow) = ₹14,500
        synced_reg = await FinanceService.sync_live_cash_movements(db, cash_reg)
        assert synced_reg.cash_inflows_fees == Decimal("12000.00")
        assert synced_reg.cash_outflows_expenses == Decimal("2500.00")
        assert synced_reg.expected_closing_balance == Decimal("14500.00")

        # Step 5: Test Denomination-wise physical cash count = ₹14,300
        # 20 x 500 = 10,000
        # 15 x 200 = 3,000
        # 10 x 100 = 1,000
        # 6 x 50   = 300
        # Sum = 14,300 (₹200 Shortage)
        denominations = {
            "500": 20,
            "200": 15,
            "100": 10,
            "50": 6,
            "20": 0,
            "10": 0,
            "5": 0,
            "2": 0,
            "1": 0,
        }
        calc_total = FinanceService.calculate_denominations_total(denominations)
        assert calc_total == Decimal("14300.00")

        # Step 5b: Verify Mandatory Explanation Requirement
        # Attempting closing with shortage and empty explanation must raise ValueError
        with pytest.raises(ValueError) as excinfo:
            await FinanceService.submit_daily_closing(
                db=db,
                daily_reg_id=cash_reg.id,
                denominations_dict=denominations,
                difference_reason=None,
                user_id=user.id,
            )
        assert "mandatory explanation is required" in str(excinfo.value)

        # Step 6: Submit closing with valid explanation
        closing_reason = "₹200 coin drawer shortage due to uncollected small change"
        closed_reg = await FinanceService.submit_daily_closing(
            db=db,
            daily_reg_id=cash_reg.id,
            denominations_dict=denominations,
            difference_reason=closing_reason,
            user_id=user.id,
        )
        assert closed_reg.physical_closing_balance == Decimal("14300.00")
        assert closed_reg.difference_amount == Decimal("-200.00")
        assert closed_reg.difference_type == "shortage"
        assert closed_reg.difference_reason == closing_reason
        assert closed_reg.status == "pending_approval"

        # Step 7: Supervisor Verification and Permanent Locking
        verified_reg = await FinanceService.verify_and_lock_daily_closing(
            db=db, daily_reg_id=closed_reg.id, supervisor_user_id=user.id
        )
        assert verified_reg.status == "closed"
        assert verified_reg.is_locked is True

        # Step 8: Verify Next Business Day Automatic Opening Carry-Forward
        # Day 2 must automatically initialize with verified physical closing ₹14,300!
        day_2_reg = await FinanceService.get_or_create_daily_register(
            db=db,
            institution_id=1,
            register_date=test_day_2,
            cash_register_id=reg_id,
            user_id=user.id,
        )
        assert day_2_reg.opening_balance == Decimal("14300.00")
        assert day_2_reg.opening_source_closing_id == verified_reg.id
        assert day_2_reg.status == "open"

        # Step 9: Verify Daily Cash Book Output for Day 1
        cashbook = await FinanceService.get_daily_cashbook(db, 1, test_day_1, reg_id)
        assert cashbook["opening_balance"] == 5000.0
        assert cashbook["total_inflows"] == 12000.0
        assert cashbook["total_outflows"] == 2500.0
        assert cashbook["expected_closing"] == 14500.0
        assert cashbook["physical_closing"] == 14300.0
        assert cashbook["difference"] == -200.0
        assert len(cashbook["entries"]) >= 3  # Opening, Fee payment, Expense

        # Cleanup test records
        await db.execute(delete(DailyCashRegister).where(DailyCashRegister.register_date.in_([test_day_1, test_day_2])))
        await db.execute(delete(Expense).where(Expense.id == expense.id))
        await db.execute(delete(Payment).where(Payment.id == cash_payment.id))
        await db.commit()
