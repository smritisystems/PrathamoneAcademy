# /**
#  * @file        finance.py
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
#  * @created     2026-11-24
#  * @updated     2026-11-26
#  *
#  * @description REST API router for Institute Daily Expense Management, Cash Registers, Cash Closing, and Daily Cash Book.
#  */

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc
from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.core.deps import get_current_active_user, enforce_institution_access
from app.models.user import User
from app.models.finance import Expense, ExpenseCategory, CashRegister, DailyCashRegister, CashTransaction
from app.services.finance_service import FinanceService

router = APIRouter()


# ------------------------------------------------------------------------------
# Pydantic Schemas
# ------------------------------------------------------------------------------
class ExpenseCreate(BaseModel):
    category_id: int
    title: str = Field(..., max_length=200)
    amount: float = Field(..., gt=0)
    expense_date: Optional[date] = None
    payment_mode: str = Field("CASH", description="CASH | UPI | BANK_TRANSFER | CARD | CHEQUE")
    paid_to_vendor: str = Field(..., max_length=150)
    vendor_contact: Optional[str] = None
    invoice_reference: Optional[str] = None
    description: Optional[str] = None
    attachment_url: Optional[str] = None
    attachment_name: Optional[str] = None
    status: str = Field("submitted", description="draft | submitted | approved | paid")
    is_recurring: bool = False
    recurring_frequency: Optional[str] = None
    notes: Optional[str] = None


class ExpenseUpdate(BaseModel):
    category_id: Optional[int] = None
    title: Optional[str] = None
    amount: Optional[float] = None
    expense_date: Optional[date] = None
    payment_mode: Optional[str] = None
    paid_to_vendor: Optional[str] = None
    vendor_contact: Optional[str] = None
    invoice_reference: Optional[str] = None
    description: Optional[str] = None
    attachment_url: Optional[str] = None
    attachment_name: Optional[str] = None
    status: Optional[str] = None
    is_recurring: Optional[bool] = None
    recurring_frequency: Optional[str] = None
    notes: Optional[str] = None


class CashClosingSubmit(BaseModel):
    daily_register_id: int
    denominations: Dict[str, int] = Field(
        ...,
        description="Denomination counts for Indian currency: {'500': 10, '200': 5, ...}",
    )
    difference_reason: Optional[str] = None


class CashClosingVerify(BaseModel):
    daily_register_id: int


class CashClosingReopen(BaseModel):
    daily_register_id: int
    reason: str = Field(..., min_length=5)


class CashTransactionCreate(BaseModel):
    cash_register_id: Optional[int] = None
    transaction_date: Optional[date] = None
    transaction_type: str = Field(
        ...,
        description="bank_deposit | bank_withdrawal | transfer_in | transfer_out | other_receipt | other_payment",
    )
    amount: float = Field(..., gt=0)
    reference_number: Optional[str] = None
    description: Optional[str] = None
    destination_or_source: Optional[str] = None


# ------------------------------------------------------------------------------
# Expense Endpoints
# ------------------------------------------------------------------------------
@router.get("/expenses/overview")
async def get_expense_overview(
    effective_inst_id: int = Depends(enforce_institution_access),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Returns top-level KPIs and monthly category breakdown for expenses."""
    return await FinanceService.get_expense_dashboard_metrics(db, effective_inst_id or 1)


@router.get("/expenses/categories")
async def list_expense_categories(
    effective_inst_id: int = Depends(enforce_institution_access),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Lists all active expense categories."""
    stmt = (
        select(ExpenseCategory)
        .where(
            and_(
                ExpenseCategory.institution_id == (effective_inst_id or 1),
                ExpenseCategory.is_active == True,
            )
        )
        .order_by(ExpenseCategory.name)
    )
    categories = (await db.execute(stmt)).scalars().all()
    return [
        {
            "id": c.id,
            "name": c.name,
            "code": c.code,
            "description": c.description,
            "is_active": c.is_active,
        }
        for c in categories
    ]


@router.get("/expenses")
async def list_expenses(
    effective_inst_id: int = Depends(enforce_institution_access),
    search: Optional[str] = None,
    category_id: Optional[int] = None,
    payment_mode: Optional[str] = None,
    status: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Search and filter the complete institutional Expense Register."""
    query = (
        select(Expense, ExpenseCategory, User)
        .join(ExpenseCategory, Expense.category_id == ExpenseCategory.id)
        .outerjoin(User, Expense.recorded_by_id == User.id)
        .where(Expense.institution_id == (effective_inst_id or 1))
    )

    if search:
        s = f"%{search.strip()}%"
        query = query.where(
            or_(
                Expense.title.ilike(s),
                Expense.expense_number.ilike(s),
                Expense.paid_to_vendor.ilike(s),
                Expense.invoice_reference.ilike(s),
                Expense.description.ilike(s),
            )
        )

    if category_id:
        query = query.where(Expense.category_id == category_id)

    if payment_mode:
        query = query.where(func.upper(Expense.payment_mode) == payment_mode.upper())

    if status:
        query = query.where(Expense.status == status)

    if date_from:
        query = query.where(Expense.expense_date >= date_from)

    if date_to:
        query = query.where(Expense.expense_date <= date_to)

    total_stmt = select(func.count()).select_from(query.subquery())
    total = (await db.execute(total_stmt)).scalar() or 0

    query = query.order_by(desc(Expense.expense_date), desc(Expense.id)).offset(skip).limit(limit)
    rows = (await db.execute(query)).all()

    items = []
    for exp, cat, rec in rows:
        items.append({
            "id": exp.id,
            "expense_number": exp.expense_number,
            "expense_date": str(exp.expense_date),
            "title": exp.title,
            "description": exp.description,
            "amount": float(exp.amount),
            "category_id": cat.id,
            "category_name": cat.name,
            "payment_mode": exp.payment_mode,
            "paid_to_vendor": exp.paid_to_vendor,
            "vendor_contact": exp.vendor_contact,
            "invoice_reference": exp.invoice_reference,
            "attachment_url": exp.attachment_url,
            "attachment_name": exp.attachment_name,
            "status": exp.status,
            "is_recurring": exp.is_recurring,
            "recurring_frequency": exp.recurring_frequency,
            "recorded_by_name": f"{rec.first_name} {rec.last_name or ''}".strip() if rec else None,
            "created_at": exp.created_at.isoformat() if exp.created_at else None,
        })

    return {
        "total": total,
        "items": items,
        "skip": skip,
        "limit": limit,
    }


@router.post("/expenses", status_code=status.HTTP_201_CREATED)
async def create_expense(
    payload: ExpenseCreate,
    effective_inst_id: int = Depends(enforce_institution_access),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Record a new institutional expense."""
    expense = await FinanceService.create_expense(
        db=db,
        institution_id=effective_inst_id or 1,
        data=payload.model_dump(),
        recorded_by_id=current_user.id,
    )
    return {"message": "Expense recorded successfully", "id": expense.id, "expense_number": expense.expense_number}


@router.get("/expenses/{id}")
async def get_expense(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Retrieve expense details."""
    stmt = (
        select(Expense, ExpenseCategory)
        .join(ExpenseCategory, Expense.category_id == ExpenseCategory.id)
        .where(Expense.id == id)
    )
    res = (await db.execute(stmt)).first()
    if not res:
        raise HTTPException(status_code=404, detail="Expense not found")
    exp, cat = res
    return {
        "id": exp.id,
        "expense_number": exp.expense_number,
        "expense_date": str(exp.expense_date),
        "title": exp.title,
        "description": exp.description,
        "amount": float(exp.amount),
        "category_id": cat.id,
        "category_name": cat.name,
        "payment_mode": exp.payment_mode,
        "paid_to_vendor": exp.paid_to_vendor,
        "vendor_contact": exp.vendor_contact,
        "invoice_reference": exp.invoice_reference,
        "attachment_url": exp.attachment_url,
        "attachment_name": exp.attachment_name,
        "status": exp.status,
        "is_recurring": exp.is_recurring,
        "recurring_frequency": exp.recurring_frequency,
        "notes": exp.notes,
    }


@router.put("/expenses/{id}")
async def update_expense(
    id: int,
    payload: ExpenseUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Update an existing expense."""
    expense = await FinanceService.update_expense(
        db=db, expense_id=id, data=payload.model_dump(exclude_unset=True), user_id=current_user.id
    )
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    return {"message": "Expense updated successfully", "id": expense.id}


@router.delete("/expenses/{id}")
async def delete_expense(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Cancel or remove an unapproved expense."""
    stmt = select(Expense).where(Expense.id == id)
    exp = (await db.execute(stmt)).scalar_one_or_none()
    if not exp:
        raise HTTPException(status_code=404, detail="Expense not found")
    if exp.status == "paid":
        raise HTTPException(status_code=400, detail="Paid expenses cannot be deleted. Use cancellation or adjustment.")
    
    await db.delete(exp)
    await db.commit()
    return {"message": "Expense deleted successfully"}


@router.post("/expenses/{id}/approve")
async def approve_expense(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Approve a submitted expense."""
    exp = await FinanceService.approve_expense(db, id, current_user.id)
    if not exp:
        raise HTTPException(status_code=404, detail="Expense not found")
    return {"message": "Expense approved successfully", "id": exp.id, "status": exp.status}


@router.post("/expenses/{id}/pay")
async def pay_expense(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Mark an approved expense as paid."""
    exp = await FinanceService.pay_expense(db, id, current_user.id)
    if not exp:
        raise HTTPException(status_code=404, detail="Expense not found")
    return {"message": "Expense marked as paid", "id": exp.id, "status": exp.status}


# ------------------------------------------------------------------------------
# Daily Cash Register & Closing Endpoints
# ------------------------------------------------------------------------------
@router.get("/cash-register/current")
async def get_current_cash_register(
    institution_id: int = 1,
    target_date: Optional[date] = None,
    register_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Returns today's active live cash register session with automatic opening carry-forward
    and live real-time cash movement aggregation.
    """
    selected_date = target_date or date.today()
    daily_reg = await FinanceService.get_or_create_daily_register(
        db=db,
        institution_id=institution_id,
        register_date=selected_date,
        cash_register_id=register_id,
        user_id=current_user.id,
    )

    denominations_data = {}
    if daily_reg.denominations:
        try:
            import json
            denominations_data = json.loads(daily_reg.denominations)
        except Exception:
            pass

    reg_name = "Main Front Desk Counter"
    cr_res = (await db.execute(select(CashRegister.name).where(CashRegister.id == daily_reg.cash_register_id))).scalar_one_or_none()
    if cr_res:
        reg_name = cr_res

    return {
        "id": daily_reg.id,
        "cash_register_id": daily_reg.cash_register_id,
        "register_name": reg_name,
        "register_date": str(daily_reg.register_date),
        "status": daily_reg.status,
        "business_day_start_time": daily_reg.business_day_start_time,
        "opening_balance": float(daily_reg.opening_balance),
        "opening_notes": daily_reg.opening_notes,
        "opening_adjusted": daily_reg.opening_adjusted,
        # Live inflows
        "cash_inflows_fees": float(daily_reg.cash_inflows_fees),
        "cash_inflows_other": float(daily_reg.cash_inflows_other),
        "cash_inflows_bank_withdrawal": float(daily_reg.cash_inflows_bank_withdrawal),
        "cash_inflows_transfers": float(daily_reg.cash_inflows_transfers),
        "total_cash_inflows": float(daily_reg.total_cash_inflows),
        # Live outflows
        "cash_outflows_expenses": float(daily_reg.cash_outflows_expenses),
        "cash_outflows_refunds": float(daily_reg.cash_outflows_refunds),
        "cash_outflows_bank_deposit": float(daily_reg.cash_outflows_bank_deposit),
        "cash_outflows_transfers": float(daily_reg.cash_outflows_transfers),
        "total_cash_outflows": float(daily_reg.total_cash_outflows),
        # Balance & reconciliation
        "expected_closing_balance": float(daily_reg.expected_closing_balance),
        "physical_closing_balance": float(daily_reg.physical_closing_balance),
        "difference_amount": float(daily_reg.difference_amount),
        "difference_type": daily_reg.difference_type,
        "difference_reason": daily_reg.difference_reason,
        "denominations": denominations_data,
        "is_locked": daily_reg.is_locked,
        "closed_at": daily_reg.closed_at.isoformat() if daily_reg.closed_at else None,
        "verified_at": daily_reg.verified_at.isoformat() if daily_reg.verified_at else None,
    }


@router.post("/cash-register/close")
async def submit_daily_closing(
    payload: CashClosingSubmit,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Submits physical denomination counts at end of business day, calculates difference,
    enforces explanation requirements for shortages/excesses, and transitions to pending approval.
    """
    try:
        updated_reg = await FinanceService.submit_daily_closing(
            db=db,
            daily_reg_id=payload.daily_register_id,
            denominations_dict=payload.denominations,
            difference_reason=payload.difference_reason,
            user_id=current_user.id,
        )
        return {
            "message": "Daily cash count submitted successfully for supervisor approval",
            "daily_register_id": updated_reg.id,
            "status": updated_reg.status,
            "expected_closing": float(updated_reg.expected_closing_balance),
            "physical_closing": float(updated_reg.physical_closing_balance),
            "difference": float(updated_reg.difference_amount),
            "difference_type": updated_reg.difference_type,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/cash-register/verify")
async def verify_and_lock_daily_closing(
    payload: CashClosingVerify,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Supervisor verifies the cash closing and permanently locks the daily register."""
    try:
        updated_reg = await FinanceService.verify_and_lock_daily_closing(
            db=db, daily_reg_id=payload.daily_register_id, supervisor_user_id=current_user.id
        )
        return {
            "message": "Daily cash register verified and locked. Ready for next business day.",
            "daily_register_id": updated_reg.id,
            "status": updated_reg.status,
            "is_locked": updated_reg.is_locked,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/cash-register/reopen")
async def reopen_daily_closing(
    payload: CashClosingReopen,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Authorized supervisor reopening of a locked cash register with audit justification."""
    try:
        updated_reg = await FinanceService.reopen_daily_closing(
            db=db,
            daily_reg_id=payload.daily_register_id,
            reason=payload.reason,
            supervisor_user_id=current_user.id,
        )
        return {
            "message": "Cash register reopened for authorized adjustments",
            "daily_register_id": updated_reg.id,
            "status": updated_reg.status,
            "is_locked": updated_reg.is_locked,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/cash-register/history")
async def get_cash_register_history(
    institution_id: int = 1,
    limit: int = 30,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Returns chronological register history of daily cash opening and closing records."""
    stmt = (
        select(DailyCashRegister, User, CashRegister)
        .join(CashRegister, DailyCashRegister.cash_register_id == CashRegister.id)
        .outerjoin(User, DailyCashRegister.verified_by_id == User.id)
        .where(DailyCashRegister.institution_id == institution_id)
        .order_by(desc(DailyCashRegister.register_date))
        .limit(limit)
    )
    rows = (await db.execute(stmt)).all()

    return [
        {
            "id": r[0].id,
            "register_name": r[2].name,
            "register_date": str(r[0].register_date),
            "status": r[0].status,
            "opening_balance": float(r[0].opening_balance),
            "total_inflows": float(r[0].total_cash_inflows),
            "total_outflows": float(r[0].total_cash_outflows),
            "expected_closing": float(r[0].expected_closing_balance),
            "physical_closing": float(r[0].physical_closing_balance),
            "difference": float(r[0].difference_amount),
            "difference_type": r[0].difference_type,
            "difference_reason": r[0].difference_reason,
            "is_locked": r[0].is_locked,
            "verified_by": f"{r[1].first_name} {r[1].last_name or ''}".strip() if r[1] else None,
        }
        for r in rows
    ]


@router.get("/cash-register/cashbook")
async def get_daily_cashbook(
    institution_id: int = 1,
    target_date: Optional[date] = None,
    register_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Returns the complete chronological Daily Cash Book with running balances for the target date.
    """
    selected_date = target_date or date.today()
    return await FinanceService.get_daily_cashbook(
        db=db,
        institution_id=institution_id,
        target_date=selected_date,
        register_id=register_id,
    )


@router.post("/cash-transactions", status_code=status.HTTP_201_CREATED)
async def create_cash_transaction(
    payload: CashTransactionCreate,
    institution_id: int = 1,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Records an ancillary cash movement (e.g. Bank deposit, withdrawal, counter transfer)."""
    reg_id = payload.cash_register_id
    if not reg_id:
        active_reg = await FinanceService.get_or_create_daily_register(
            db, institution_id, payload.transaction_date or date.today()
        )
        reg_id = active_reg.cash_register_id

    txn = CashTransaction(
        institution_id=institution_id,
        cash_register_id=reg_id,
        transaction_date=payload.transaction_date or date.today(),
        transaction_type=payload.transaction_type,
        amount=Decimal(str(payload.amount)),
        reference_number=payload.reference_number,
        description=payload.description,
        destination_or_source=payload.destination_or_source,
        performed_by_id=current_user.id,
    )
    db.add(txn)
    await db.commit()
    await db.refresh(txn)

    # Trigger live sync on daily cash register
    await FinanceService.get_or_create_daily_register(
        db, institution_id, txn.transaction_date, reg_id
    )

    return {"message": "Cash movement recorded successfully", "id": txn.id}
