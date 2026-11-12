# /**
#  * @file        payments.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      backend.app.api.v1.endpoints
#  *
#  * @author      Jawahar R. Mallah
#  * @organization AITDL (AI Technology & Development Lab)
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 AITDL
#  * @license     Proprietary
#  *
#  * @version     2.0.0
#  * @created     2026-11-03
#  * @updated     2026-11-12
#  *
#  * @description API endpoints for payment workflow lifecycle (Draft, Submitted, Approved, Posted), audited edits, receipt supersession, reprints, and refund workflows.
#  */

from fastapi import APIRouter, Depends, HTTPException, status, Query, Response, Request, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, desc, and_
from sqlalchemy.orm import selectinload
from typing import Optional, List, Dict, Any
from decimal import Decimal
from datetime import date, datetime, timezone
import json
import re

from app.core.database import get_db
from app.core.deps import get_current_active_user, require_role, is_sysadmin, check_institution_access, has_permission, require_permission, get_user_permissions
from app.models.payment import Payment, PaymentAllocation, PaymentReceipt, Refund, FinancialPeriod
from app.models.fee import FeeInvoice, FeeInstallment
from app.models.student import Student
from app.models.enrollment import StudentEnrollment
from app.models.standard import Standard
from app.models.division import Division
from app.models.board import Board
from app.models.user import User, AuditLog
from app.models.academic_year import AcademicYear
from app.models.institution import Institution
from app.models.settings import InstitutionSetting
from app.services.sequence import generate_next_receipt_number, generate_next_refund_number, log_sequence_gap
from app.services.codex_service import CodeXService
from app.services.receipt_pdf_service import ReceiptPdfService, sanitize_receipt_filename
from app.services.payment_gateway import (
    get_payment_gateway_config,
    update_payment_gateway_config,
    create_gateway_order,
    verify_and_post_gateway_payment,
    verify_webhook_signature,
)
from app.services.payment_workflow_service import (
    get_payment_workflow_settings,
    check_requires_erp_approval,
    execute_payment_posting,
    execute_payment_edit,
    log_payment_audit,
    execute_refund_disbursement,
    check_financial_period_open,
)
from pydantic import BaseModel, Field

router = APIRouter()

APPROVER_ROLES = {"superadmin", "sysadmin", "super_admin", "admin", "principal"}
PAYMENT_STAFF_VIEW_ROLES = (
    "superadmin",
    "sysadmin",
    "super_admin",
    "admin",
    "principal",
    "accountant",
    "staff",
    "counselor",
    "counsellor",
    "receptionist",
)
PAYMENT_EXPORT_ROLES = (
    "superadmin",
    "sysadmin",
    "super_admin",
    "admin",
    "principal",
    "accountant",
    "staff",
)


def _authorize_payment_record_access(
    record_student_id: Optional[int],
    record_institution_id: Optional[int],
    current_user,
) -> None:
    """Enforces role/self ownership and multi-tenant scoping for payment & receipt reads."""
    role = (getattr(current_user, "role", "") or "").strip().lower()
    if role == "student":
        if not record_student_id or getattr(current_user, "student_id", None) != record_student_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access forbidden: Students can only access their own payment receipts.",
            )
    elif not is_sysadmin(current_user) and role not in PAYMENT_STAFF_VIEW_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
    if record_institution_id is not None:
        check_institution_access(record_institution_id, current_user)


class FinancialPeriodCreate(BaseModel):
    name: str
    academic_year_id: int
    start_date: date
    end_date: date
    period_type: Optional[str] = "monthly"


class AllocationInput(BaseModel):
    invoice_id: int
    installment_id: Optional[int] = None
    amount: Decimal


class PaymentCreate(BaseModel):
    student_id: int
    academic_year_id: int
    amount: Decimal
    payment_date: date
    payment_method: str
    transaction_reference: Optional[str] = None
    bank_name: Optional[str] = None
    cheque_number: Optional[str] = None
    cheque_date: Optional[date] = None
    notes: Optional[str] = None
    allocations: List[AllocationInput]
    action: Optional[str] = "post"  # "draft" | "submit" | "post"
    idempotency_key: Optional[str] = None


class PaymentUpdate(BaseModel):
    amount: Optional[Decimal] = None
    payment_date: Optional[date] = None
    payment_method: Optional[str] = None
    transaction_reference: Optional[str] = None
    bank_name: Optional[str] = None
    cheque_number: Optional[str] = None
    cheque_date: Optional[date] = None
    notes: Optional[str] = None
    allocations: Optional[List[AllocationInput]] = None
    reason: Optional[str] = None  # Mandatory when modifying submitted or posted payments
    edit_reason: Optional[str] = None


class ReversalRequest(BaseModel):
    reason: str


class RefundRequest(BaseModel):
    amount: Decimal
    refund_method: str = "bank_transfer"
    reason: str
    reference_number: Optional[str] = None
    notes: Optional[str] = None
    process_now: Optional[bool] = False
    idempotency_key: Optional[str] = None


class RefundRejectRequest(BaseModel):
    reason: str


class OnlineOrderCreate(BaseModel):
    invoice_id: int
    amount: Decimal
    installment_id: Optional[int] = None


class OnlinePaymentVerify(BaseModel):
    order_id: str
    payment_id: str
    signature: str
    invoice_id: int
    amount: Decimal
    installment_id: Optional[int] = None


class GatewayConfigUpdate(BaseModel):
    is_enabled: Optional[bool] = None
    mode: Optional[str] = None
    razorpay_key_id: Optional[str] = None
    razorpay_key_secret: Optional[str] = None
    upi_vpa: Optional[str] = None
    merchant_name: Optional[str] = None
    auto_generate_receipt: Optional[bool] = None


class WorkflowConfigUpdate(BaseModel):
    payment_workflow_mode: Optional[str] = None  # "simple" | "standard_erp"
    erp_approval_amount_threshold: Optional[Decimal] = None
    erp_approval_roles: Optional[List[str]] = None
    erp_require_approval_methods: Optional[List[str]] = None
    allow_posted_payment_edits: Optional[bool] = None
    refund_approval_required: Optional[bool] = None


# ─────────────────────────────────────────────────────────────────────────────
# 0. RESOLVED PERMISSIONS FOR CURRENT USER
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/my-permissions")
async def get_my_payment_permissions(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """
    Returns the resolved, fine-grained permission capabilities for the authenticated user
    in the Fees & Payments module.
    """
    can_view_all = await has_permission(db, current_user, "payments", "view")
    can_draft = await has_permission(db, current_user, "payments", "draft")
    can_delete_draft = (
        await has_permission(db, current_user, "payments", "draft_delete")
        or await has_permission(db, current_user, "payments", "delete")
        or current_user.role in APPROVER_ROLES
    )
    can_cancel = (
        await has_permission(db, current_user, "payments", "cancel")
        or current_user.role in APPROVER_ROLES
    )
    can_reverse = (
        await has_permission(db, current_user, "payments", "reverse")
        or current_user.role in (APPROVER_ROLES | {"accountant"})
    )
    can_edit_submitted = await has_permission(db, current_user, "payments", "edit_submitted")
    can_edit_posted = await has_permission(db, current_user, "payments", "edit_posted", allow_wildcard=False)
    can_config = await has_permission(db, current_user, "fee_workflow", "configure")
    can_process_refund = await has_permission(db, current_user, "payments", "refund_process")
    can_approve_refund = await has_permission(db, current_user, "payments", "refund_approve")
    can_view_audit = await has_permission(db, current_user, "payments", "view_audit")

    perms = await get_user_permissions(db, current_user)

    return {
        "user_id": current_user.id,
        "username": current_user.username,
        "role": current_user.role,
        "can_view_all": can_view_all,
        "can_create_draft": can_draft,
        "can_edit_draft": can_draft,
        "can_delete_draft": can_delete_draft,
        "can_cancel": can_cancel,
        "can_reverse": can_reverse,
        "can_edit_submitted": can_edit_submitted,
        "can_edit_posted": can_edit_posted,
        "can_configure_workflow": can_config,
        "can_process_refund": can_process_refund,
        "can_approve_refund": can_approve_refund,
        "can_view_audit": can_view_audit,
        "permissions": [f"{r}:{a}" for r, a in perms],
    }


# ─────────────────────────────────────────────────────────────────────────────
# 1. RECORD / CREATE PAYMENT (Draft, Submit, or Post)
# ─────────────────────────────────────────────────────────────────────────────
@router.post("/", status_code=201)
async def create_payment(
    data: PaymentCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("superadmin", "admin", "accountant", "staff", "principal")),
):
    """
    Records a payment transaction conforming to configured workflow mode:
    - 'draft': Saves unposted draft voucher. Does NOT impact student balance or assign receipt.
    - 'submit': Submits payment for review / approval.
    - 'post': Posts directly in Simple Mode; evaluates approval gates in Standard ERP Mode.
    """
    # 0. Check client idempotency key
    if data.idempotency_key:
        stmt = select(Payment).where(
            and_(
                Payment.student_id == data.student_id,
                Payment.idempotency_key == data.idempotency_key,
            )
        )
        existing_pay = (await db.execute(stmt)).scalar_one_or_none()
        if existing_pay:
            rec = (await db.execute(select(PaymentReceipt).where(PaymentReceipt.payment_id == existing_pay.id))).scalars().first()
            return {
                "message": "Payment already processed (idempotent submission)",
                "payment_id": existing_pay.id,
                "status": existing_pay.status,
                "amount": float(existing_pay.amount),
                "receipt_number": rec.receipt_number if rec else None,
            }

    # 1. Validate allocation total equals payment amount
    total_allocated = sum(a.amount for a in data.allocations)
    if abs(total_allocated - data.amount) > Decimal("0.01"):
        raise HTTPException(
            status_code=400,
            detail=f"Total allocation ({total_allocated}) must equal payment amount ({data.amount})",
        )

    effective_inst_id = getattr(current_user, "institution_id", None) or 1
    await check_financial_period_open(db, effective_inst_id, data.payment_date)

    # Verify student exists and belongs to authorized institution
    target_student = await db.get(Student, data.student_id)
    if not target_student:
        raise HTTPException(status_code=404, detail="Student not found")
    check_institution_access(target_student.institution_id, current_user)

    # Validate each allocation against invoice & installment
    for alloc in data.allocations:
        inv_result = await db.execute(
            select(FeeInvoice).where(FeeInvoice.id == alloc.invoice_id)
        )
        invoice = inv_result.scalar_one_or_none()
        if not invoice:
            raise HTTPException(status_code=404, detail=f"Invoice {alloc.invoice_id} not found")
        if invoice.student_id != data.student_id:
            raise HTTPException(status_code=400, detail="Invoice does not belong to this student")
        if alloc.amount > invoice.outstanding_amount + Decimal("0.01"):
            raise HTTPException(
                status_code=400,
                detail=f"Allocation amount {alloc.amount} exceeds outstanding balance {invoice.outstanding_amount}",
            )

        if alloc.installment_id:
            inst_result = await db.execute(
                select(FeeInstallment).where(
                    FeeInstallment.id == alloc.installment_id,
                    FeeInstallment.invoice_id == alloc.invoice_id,
                )
            )
            installment = inst_result.scalar_one_or_none()
            if not installment:
                raise HTTPException(status_code=404, detail=f"Installment {alloc.installment_id} not found")
            remaining = installment.amount - installment.paid_amount
            if alloc.amount > remaining + Decimal("0.01"):
                raise HTTPException(
                    status_code=400,
                    detail=f"Allocation exceeds installment balance ({remaining})",
                )

    effective_inst_id = getattr(current_user, "institution_id", None) or 1
    settings = await get_payment_workflow_settings(db, institution_id=effective_inst_id)

    requested_action = (data.action or "post").lower()
    now = datetime.now(timezone.utc)

    # ─── CASE A: DRAFT PAYMENT ───────────────────────────────────────────────
    if requested_action == "draft":
        payment_dict = data.model_dump(exclude={"allocations", "action"})
        payment = Payment(
            **payment_dict,
            status="draft",
            collected_by_id=current_user.id,
        )
        db.add(payment)
        await db.flush()

        for alloc in data.allocations:
            db.add(PaymentAllocation(
                payment_id=payment.id,
                invoice_id=alloc.invoice_id,
                installment_id=alloc.installment_id,
                allocated_amount=alloc.amount,
            ))

        await db.commit()
        return {
            "payment_id": payment.id,
            "status": "draft",
            "amount": float(payment.amount),
            "payment_date": str(payment.payment_date),
            "message": "Payment draft created successfully. Balance will be decremented upon posting.",
        }

    # ─── CASE B: SUBMIT PAYMENT ──────────────────────────────────────────────
    if requested_action == "submit":
        payment_dict = data.model_dump(exclude={"allocations", "action"})
        payment = Payment(
            **payment_dict,
            status="submitted",
            submitted_at=now,
            submitted_by_id=current_user.id,
            collected_by_id=current_user.id,
        )
        db.add(payment)
        await db.flush()

        for alloc in data.allocations:
            db.add(PaymentAllocation(
                payment_id=payment.id,
                invoice_id=alloc.invoice_id,
                installment_id=alloc.installment_id,
                allocated_amount=alloc.amount,
            ))

        await db.commit()
        return {
            "payment_id": payment.id,
            "status": "submitted",
            "amount": float(payment.amount),
            "payment_date": str(payment.payment_date),
            "message": "Payment submitted successfully. Awaiting review and posting.",
        }

    # ─── CASE C: POST DIRECTLY (Standard Path) ───────────────────────────────
    # In Standard ERP Mode: evaluate whether transaction requires approval
    requires_approval = check_requires_erp_approval(
        settings,
        amount=data.amount,
        payment_method=data.payment_method,
        user_role=getattr(current_user, "role", "staff"),
    )

    if requires_approval and getattr(current_user, "role", None) not in APPROVER_ROLES:
        # Route through submitted state awaiting approval
        payment_dict = data.model_dump(exclude={"allocations", "action"})
        payment = Payment(
            **payment_dict,
            status="submitted",
            submitted_at=now,
            submitted_by_id=current_user.id,
            collected_by_id=current_user.id,
        )
        db.add(payment)
        await db.flush()

        for alloc in data.allocations:
            db.add(PaymentAllocation(
                payment_id=payment.id,
                invoice_id=alloc.invoice_id,
                installment_id=alloc.installment_id,
                allocated_amount=alloc.amount,
            ))

        await db.commit()
        return {
            "payment_id": payment.id,
            "status": "submitted",
            "amount": float(payment.amount),
            "payment_date": str(payment.payment_date),
            "requires_approval": True,
            "message": "Payment submitted for approval under Standard ERP workflow rules.",
        }

    # Immediate posting: create payment in submitted state and execute posting
    payment_dict = data.model_dump(exclude={"allocations", "action"})
    payment = Payment(
        **payment_dict,
        status="submitted",
        submitted_at=now,
        submitted_by_id=current_user.id,
        collected_by_id=current_user.id,
    )
    db.add(payment)
    await db.flush()

    for alloc in data.allocations:
        db.add(PaymentAllocation(
            payment_id=payment.id,
            invoice_id=alloc.invoice_id,
            installment_id=alloc.installment_id,
            allocated_amount=alloc.amount,
        ))

    receipt = await execute_payment_posting(
        db,
        payment=payment,
        current_user_id=current_user.id,
        effective_institution_id=effective_inst_id,
    )

    await db.commit()

    return {
        "payment_id": payment.id,
        "receipt_number": receipt.receipt_number,
        "amount": float(payment.amount),
        "payment_method": payment.payment_method,
        "payment_date": str(payment.payment_date),
        "status": payment.status,
        "message": "Payment recorded and posted successfully",
    }


# ─────────────────────────────────────────────────────────────────────────────
# 2. SUBMIT DRAFT PAYMENT
# ─────────────────────────────────────────────────────────────────────────────
@router.post("/{payment_id}/submit")
async def submit_draft_payment(
    payment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("superadmin", "admin", "accountant", "staff", "principal")),
):
    """Submits a draft payment voucher for review, approval, or posting."""
    result = await db.execute(select(Payment).options(selectinload(Payment.student)).where(Payment.id == payment_id))
    payment = result.scalar_one_or_none()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    _authorize_payment_record_access(
        payment.student_id,
        payment.student.institution_id if payment.student else None,
        current_user,
    )
    if payment.status != "draft":
        raise HTTPException(status_code=400, detail=f"Cannot submit payment in '{payment.status}' state")

    now = datetime.now(timezone.utc)
    payment.status = "submitted"
    payment.submitted_at = now
    payment.submitted_by_id = current_user.id

    await log_payment_audit(
        db,
        user_id=current_user.id,
        action="payment_submitted",
        payment_id=payment.id,
        old_data={"status": "draft"},
        new_data={"status": "submitted"},
        reason="Payment draft submitted for posting",
    )

    await db.commit()
    return {"message": "Payment submitted successfully", "payment_id": payment.id, "status": "submitted"}


# ─────────────────────────────────────────────────────────────────────────────
# 2B. SAFE DELETE DRAFT PAYMENT (Transaction Deletion Policy)
# ─────────────────────────────────────────────────────────────────────────────
@router.delete("/{payment_id}")
async def delete_payment(
    payment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """
    Permanently deletes an unposted, unsubmitted draft payment.
    Permanent deletion is strictly blocked for any submitted, approved, posted, completed,
    or reversed payment to preserve historical financial ledger integrity and document sequences.
    """
    can_delete = (
        await has_permission(db, current_user, "payments", "draft_delete")
        or await has_permission(db, current_user, "payments", "delete")
        or current_user.role in APPROVER_ROLES
    )
    if not can_delete:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions: requires 'payments:draft_delete' privilege.",
        )

    result = await db.execute(
        select(Payment)
        .options(
            selectinload(Payment.allocations),
            selectinload(Payment.receipts),
            selectinload(Payment.student),
        )
        .where(Payment.id == payment_id)
    )
    payment = result.scalar_one_or_none()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment record not found")

    if payment.student:
        check_institution_access(payment.student.institution_id, current_user)

    # Permanent deletion allowed ONLY for unsubmitted, unposted drafts
    if payment.status != "draft":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Permanent deletion blocked: Payment #{payment.id} has status '{payment.status}'. "
                "In accordance with Global Transaction Governance, only unposted draft transactions "
                "with zero ledger and document impact may be permanently deleted. "
                "For posted transactions, use the authorized Reversal (/reverse) or Cancellation (/cancel) workflow."
            ),
        )

    # Check if any receipt was ever generated
    if payment.receipts and len(payment.receipts) > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Permanent deletion blocked: Official receipt(s) have been generated for Payment #{payment.id}.",
        )

    # Delete allocations first
    for alloc in payment.allocations:
        await db.delete(alloc)

    # Record audit log before deleting
    audit = AuditLog(
        user_id=current_user.id,
        action="delete_draft_payment",
        resource_type="payment",
        resource_id=payment.id,
        old_data=f"Draft payment #{payment.id} for student #{payment.student_id} (Amount: {payment.amount}) permanently deleted.",
        details=json.dumps({
            "action": "delete_draft_payment",
            "payment_id": payment.id,
            "student_id": payment.student_id,
            "amount": str(payment.amount),
            "status": "draft",
        }),
    )
    db.add(audit)

    await db.delete(payment)
    await db.commit()

    return {
        "success": True,
        "message": f"Draft payment #{payment_id} permanently deleted successfully.",
        "payment_id": payment_id,
    }


# ─────────────────────────────────────────────────────────────────────────────
# 2C. CANCEL UNPOSTED PAYMENT TRANSACTION
# ─────────────────────────────────────────────────────────────────────────────
@router.post("/{payment_id}/cancel")
async def cancel_payment(
    payment_id: int,
    data: ReversalRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("superadmin", "admin", "accountant", "principal")),
):
    """
    Cancels an unposted submitted or approved payment transaction.
    For posted payments that have affected ledger balances, use /reverse instead.
    """
    result = await db.execute(
        select(Payment)
        .options(
            selectinload(Payment.allocations),
            selectinload(Payment.receipts),
            selectinload(Payment.student),
        )
        .where(Payment.id == payment_id)
    )
    payment = result.scalar_one_or_none()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment record not found")

    if payment.student:
        check_institution_access(payment.student.institution_id, current_user)

    if payment.status in ("posted", "completed"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot cancel a posted payment using /cancel. Use /reverse to restore invoice balances and void receipts.",
        )
    if payment.status == "cancelled":
        raise HTTPException(status_code=400, detail="Payment is already cancelled")
    if payment.status == "reversed":
        raise HTTPException(status_code=400, detail="Payment is already reversed")

    old_status = payment.status
    now = datetime.now(timezone.utc)
    payment.status = "cancelled"
    payment.reversal_reason = data.reason
    payment.reversed_at = now
    payment.reversed_by_id = current_user.id

    await log_payment_audit(
        db,
        user_id=current_user.id,
        action="payment_cancelled",
        payment_id=payment.id,
        old_data={"status": old_status},
        new_data={"status": "cancelled", "reason": data.reason},
        reason=data.reason,
        severity="warning",
    )
    await db.commit()

    return {
        "success": True,
        "message": f"Payment #{payment.id} cancelled successfully",
        "payment_id": payment.id,
        "status": "cancelled",
    }


# ─────────────────────────────────────────────────────────────────────────────
# 3. APPROVE SUBMITTED PAYMENT (Standard ERP Mode)
# ─────────────────────────────────────────────────────────────────────────────
@router.post("/{payment_id}/approve")
async def approve_payment(
    payment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("superadmin", "admin", "principal")),
):
    """Approves a submitted payment under Standard ERP workflow rules with Segregation of Duties."""
    result = await db.execute(select(Payment).options(selectinload(Payment.student)).where(Payment.id == payment_id))
    payment = result.scalar_one_or_none()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    _authorize_payment_record_access(
        payment.student_id,
        payment.student.institution_id if payment.student else None,
        current_user,
    )
    if payment.status != "submitted":
        raise HTTPException(status_code=400, detail=f"Cannot approve payment in '{payment.status}' state")

    # POLICY RULE F: Segregation of Duties - Submitter cannot approve their own transaction
    if payment.submitted_by_id and payment.submitted_by_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Segregation of Duties Violation: You cannot approve a payment transaction you submitted yourself.",
        )

    now = datetime.now(timezone.utc)
    payment.status = "approved"
    payment.approved_at = now
    payment.approved_by_id = current_user.id

    await log_payment_audit(
        db,
        user_id=current_user.id,
        action="payment_approved",
        payment_id=payment.id,
        old_data={"status": "submitted"},
        new_data={"status": "approved"},
        reason="Payment approved by authorized reviewer",
    )

    await db.commit()
    return {"message": "Payment approved successfully", "payment_id": payment.id, "status": "approved"}


# ─────────────────────────────────────────────────────────────────────────────
# 4. POST APPROVED OR SUBMITTED PAYMENT
# ─────────────────────────────────────────────────────────────────────────────
@router.post("/{payment_id}/post")
async def post_payment(
    payment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("superadmin", "admin", "accountant", "principal")),
):
    """Executes ledger posting for submitted or approved payments."""
    result = await db.execute(
        select(Payment).options(selectinload(Payment.allocations), selectinload(Payment.student)).where(Payment.id == payment_id)
    )
    payment = result.scalar_one_or_none()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    _authorize_payment_record_access(
        payment.student_id,
        payment.student.institution_id if payment.student else None,
        current_user,
    )

    effective_inst_id = getattr(current_user, "institution_id", None) or 1
    settings = await get_payment_workflow_settings(db, institution_id=effective_inst_id)

    # In Standard ERP Mode, if approval is required, check that payment is approved
    if settings.get("workflow_mode") == "standard_erp":
        req_approval = check_requires_erp_approval(
            settings,
            amount=payment.amount,
            payment_method=payment.payment_method,
            user_role=getattr(current_user, "role", "staff"),
        )
        if req_approval and payment.status != "approved" and getattr(current_user, "role", None) not in APPROVER_ROLES:
            raise HTTPException(
                status_code=400,
                detail="Payment requires approval before posting under Standard ERP rules",
            )

    receipt = await execute_payment_posting(
        db,
        payment=payment,
        current_user_id=current_user.id,
        effective_institution_id=effective_inst_id,
    )

    await log_payment_audit(
        db,
        user_id=current_user.id,
        action="payment_posted",
        payment_id=payment.id,
        old_data={"status": "submitted"},
        new_data={"status": "posted", "receipt_number": receipt.receipt_number},
        reason="Payment ledger posting executed",
    )

    await db.commit()

    return {
        "message": "Payment posted successfully",
        "payment_id": payment.id,
        "receipt_number": receipt.receipt_number,
        "status": payment.status,
    }


# ─────────────────────────────────────────────────────────────────────────────
# 5. AUDITED EDIT PAYMENT (Draft, Submitted, or Posted)
# ─────────────────────────────────────────────────────────────────────────────
@router.put("/{payment_id}")
async def update_payment(
    payment_id: int,
    data: PaymentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("superadmin", "admin", "accountant", "staff", "principal")),
):
    """
    Audited modification of a draft, submitted, or posted payment.
    - Draft: freely editable by authorized staff/accountant.
    - Submitted: editable with mandatory audit reason.
    - Posted: editable only by Admins/SysAdmins with mandatory audit reason.
      Minor changes keep receipt #; financial/method changes supersede previous receipt.
    """
    result = await db.execute(
        select(Payment)
        .options(
            selectinload(Payment.allocations),
            selectinload(Payment.receipts),
            selectinload(Payment.student),
        )
        .where(Payment.id == payment_id)
    )
    payment = result.scalar_one_or_none()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    _authorize_payment_record_access(
        payment.student_id,
        payment.student.institution_id if payment.student else None,
        current_user,
    )

    effective_reason = (data.reason or data.edit_reason or "").strip()
    # Mandatory audit reason validation for submitted or posted payments
    if payment.status in ("submitted", "approved", "posted", "completed"):
        if not effective_reason:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"A mandatory audit reason is strictly required when modifying a {payment.status} payment transaction.",
            )

    # Permission check for draft payments
    if payment.status == "draft":
        can_draft = await has_permission(db, current_user, "payments", "draft")
        if not can_draft:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions: requires 'payments:draft' privilege to edit payment drafts.",
            )

    # Permission check for submitted or approved payments
    if payment.status in ("submitted", "approved"):
        can_edit_submitted = await has_permission(db, current_user, "payments", "edit_submitted")
        if not can_edit_submitted:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions: requires 'payments:edit_submitted' privilege to edit submitted payments.",
            )

    # Strict explicit permission check for posted payments (allow_wildcard=False)
    if payment.status in ("posted", "completed"):
        can_edit_posted = await has_permission(db, current_user, "payments", "edit_posted", allow_wildcard=False)
        if not can_edit_posted:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Explicit 'Edit Posted Payments' permission is required to modify a posted financial payment.",
            )

    update_dict = data.model_dump(exclude_unset=True, exclude={"reason", "edit_reason"})
    if "allocations" in update_dict and update_dict["allocations"]:
        update_dict["allocations"] = [a.model_dump() for a in data.allocations]

    effective_inst_id = getattr(current_user, "institution_id", None) or 1

    edit_res = await execute_payment_edit(
        db,
        payment=payment,
        update_data=update_dict,
        reason=effective_reason,
        current_user=current_user,
        effective_institution_id=effective_inst_id,
    )

    await db.commit()
    return edit_res


# ─────────────────────────────────────────────────────────────────────────────
# 6. REPRINT RECEIPT (Duplicate Copy Watermark)
# ─────────────────────────────────────────────────────────────────────────────
@router.post("/receipts/{receipt_number}/reprint")
async def reprint_receipt(
    receipt_number: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role(*PAYMENT_EXPORT_ROLES)),
):
    """Increments reprint count and records duplicate copy issuance."""
    result = await db.execute(
        select(PaymentReceipt).options(selectinload(PaymentReceipt.payment).selectinload(Payment.student)).where(PaymentReceipt.receipt_number == receipt_number)
    )
    receipt = result.scalar_one_or_none()
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")
    if receipt.payment and receipt.payment.student:
        check_institution_access(receipt.payment.student.institution_id, current_user)
    elif receipt.student_id:
        std = await db.get(Student, receipt.student_id)
        if std:
            check_institution_access(std.institution_id, current_user)

    receipt.reprint_count += 1
    await log_payment_audit(
        db,
        user_id=current_user.id,
        action="receipt_reprinted",
        payment_id=receipt.payment_id,
        old_data=None,
        new_data={"receipt_number": receipt.receipt_number, "reprint_count": receipt.reprint_count},
        reason=f"Receipt reprint #{receipt.reprint_count} requested by {current_user.username}",
    )
    await db.commit()

    return {
        "receipt_number": receipt.receipt_number,
        "reprint_count": receipt.reprint_count,
        "is_duplicate": True,
        "message": f"Duplicate copy issued (Reprint #{receipt.reprint_count})",
    }


@router.post("/receipts/{receipt_number}/cancel")
async def cancel_receipt(
    receipt_number: str,
    data: ReversalRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("superadmin", "admin", "principal", "sysadmin")),
):
    """Explicitly marks an issued receipt voucher as cancelled without deleting the historical record."""
    result = await db.execute(
        select(PaymentReceipt)
        .options(selectinload(PaymentReceipt.payment).selectinload(Payment.student))
        .where(PaymentReceipt.receipt_number == receipt_number)
    )
    receipt = result.scalar_one_or_none()
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")
    if receipt.payment and receipt.payment.student:
        check_institution_access(receipt.payment.student.institution_id, current_user)
    elif receipt.student_id:
        std = await db.get(Student, receipt.student_id)
        if std:
            check_institution_access(std.institution_id, current_user)
    if receipt.status == "cancelled":
        raise HTTPException(status_code=400, detail="Receipt is already cancelled")

    now = datetime.now(timezone.utc)
    receipt.status = "cancelled"
    receipt.cancelled_at = now
    receipt.cancelled_by_id = current_user.id
    receipt.cancellation_reason = data.reason

    await log_payment_audit(
        db,
        user_id=current_user.id,
        action="receipt_cancelled",
        payment_id=receipt.payment_id,
        old_data={"status": receipt.status, "receipt_number": receipt_number},
        new_data={"status": "cancelled", "reason": data.reason},
        reason=data.reason,
        severity="warning",
    )
    await db.commit()

    return {
        "message": f"Receipt {receipt_number} cancelled successfully",
        "receipt_number": receipt_number,
        "status": "cancelled",
        "refund_guidance": (
            "Receipt cancellation invalidates the issued proof of payment but does NOT constitute financial disbursement. "
            "If funds were physically received and must be remitted back to the student/parent, initiate an official "
            "Refund Workflow via /api/v1/payments/{payment_id}/refunds."
        ),
    }


# ─────────────────────────────────────────────────────────────────────────────
# 7. REFUND WORKFLOW ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────
@router.post("/{payment_id}/refunds")
async def create_payment_refund(
    payment_id: int,
    data: RefundRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    can_refund = await has_permission(db, current_user, "payments", "refund_process")
    if not can_refund:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions: requires 'payments:refund_process' privilege.",
        )
    """
    Creates a refund request linked directly to an existing posted payment.
    Enforces that refund cannot exceed remaining refundable collection balance.
    """
    # 0. Idempotency check
    if data.idempotency_key:
        idem_res = await db.execute(
            select(Refund).where(
                Refund.payment_id == payment_id,
                Refund.idempotency_key == data.idempotency_key,
            )
        )
        existing_refund = idem_res.scalar_one_or_none()
        if existing_refund:
            return {
                "refund_id": existing_refund.id,
                "payment_id": existing_refund.payment_id,
                "reference_number": existing_refund.reference_number,
                "amount": float(existing_refund.amount),
                "status": existing_refund.status,
                "message": "Idempotent duplicate refund request returned safely",
            }

    pay_res = await db.execute(
        select(Payment)
        .options(selectinload(Payment.allocations), selectinload(Payment.student))
        .where(Payment.id == payment_id)
        .with_for_update(of=Payment)
    )
    payment = pay_res.scalar_one_or_none()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment record not found")
    if payment.student:
        check_institution_access(payment.student.institution_id, current_user)
    if payment.status not in ("posted", "completed"):
        raise HTTPException(status_code=400, detail="Refunds can only be processed on posted payments")

    if data.amount <= Decimal("0.00"):
        raise HTTPException(status_code=400, detail="Refund amount must be greater than zero")

    # Calculate existing non-rejected refunds for this payment
    ref_res = await db.execute(
        select(func.coalesce(func.sum(Refund.amount), 0)).where(
            Refund.payment_id == payment_id,
            Refund.status.in_(["requested", "approved", "completed"]),
        )
    )
    existing_refunds_sum = Decimal(str(ref_res.scalar() or 0))
    max_refundable = payment.amount - existing_refunds_sum

    if data.amount > max_refundable + Decimal("0.01"):
        raise HTTPException(
            status_code=400,
            detail=f"Requested refund (₹{data.amount}) exceeds remaining refundable balance (₹{max_refundable})",
        )

    effective_inst_id = getattr(current_user, "institution_id", None) or 1
    settings = await get_payment_workflow_settings(db, institution_id=effective_inst_id)

    # Determine initial status: if user is admin and process_now is true, process immediately
    is_admin = getattr(current_user, "role", None) in APPROVER_ROLES
    initial_status = "completed" if (is_admin and data.process_now) else "requested"

    # Sequential refund reference number generation conforming to Immutable Numbering Policy
    ref_num = data.reference_number
    if not ref_num:
        ref_num = await generate_next_refund_number(
            db, institution_id=effective_inst_id, academic_year_id=payment.academic_year_id
        )

    now = datetime.now(timezone.utc)
    refund = Refund(
        institution_id=effective_inst_id,
        student_id=payment.student_id,
        payment_id=payment.id,
        invoice_id=payment.allocations[0].invoice_id if payment.allocations else None,
        amount=data.amount,
        refund_date=date.today(),
        refund_method=data.refund_method,
        reference_number=ref_num,
        reason=data.reason,
        notes=data.notes,
        status=initial_status,
        idempotency_key=data.idempotency_key,
        requested_by_id=current_user.id,
        processed_by_id=current_user.id if initial_status == "completed" else None,
        approved_by_id=current_user.id if initial_status == "completed" else None,
        approved_at=now if initial_status == "completed" else None,
    )
    db.add(refund)
    await db.flush()

    if initial_status == "completed":
        refund.status = "approved"
        await execute_refund_disbursement(db, refund, current_user.id)
    else:
        await log_payment_audit(
            db,
            user_id=current_user.id,
            action=f"refund_{initial_status}",
            payment_id=payment.id,
            old_data=None,
            new_data={"refund_id": refund.id, "amount": float(data.amount), "status": initial_status, "reference_number": ref_num},
            reason=f"Refund of ₹{data.amount} for payment {payment.id}: {data.reason}",
        )

    await db.commit()

    return {
        "refund_id": refund.id,
        "payment_id": payment.id,
        "reference_number": ref_num,
        "amount": float(refund.amount),
        "status": refund.status,
        "message": "Refund processed successfully" if initial_status == "completed" else "Refund requested for approval",
    }


@router.post("/refunds/{refund_id}/approve")
async def approve_refund(
    refund_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    can_approve = await has_permission(db, current_user, "payments", "refund_approve")
    if not can_approve:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions: requires 'payments:refund_approve' privilege.",
        )
    """Approves a requested refund with Segregation of Duties."""
    result = await db.execute(select(Refund).where(Refund.id == refund_id).with_for_update(of=Refund))
    refund = result.scalar_one_or_none()
    if not refund:
        raise HTTPException(status_code=404, detail="Refund record not found")
    check_institution_access(refund.institution_id, current_user)
    if refund.status != "requested":
        raise HTTPException(status_code=400, detail=f"Cannot approve refund in '{refund.status}' state")

    # POLICY RULE F: Segregation of Duties - Requester cannot approve their own refund
    if refund.requested_by_id and refund.requested_by_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Segregation of Duties Violation: You cannot approve a refund request you submitted yourself.",
        )

    now = datetime.now(timezone.utc)
    refund.status = "approved"
    refund.approved_by_id = current_user.id
    refund.approved_at = now

    await log_payment_audit(
        db,
        user_id=current_user.id,
        action="refund_approved",
        payment_id=refund.payment_id or 0,
        old_data={"status": "requested"},
        new_data={"status": "approved", "refund_id": refund.id},
        reason=f"Refund #{refund.id} approved by {current_user.username}",
    )

    await db.commit()
    return {"message": "Refund approved successfully", "refund_id": refund.id, "status": "approved"}


@router.post("/refunds/{refund_id}/process")
async def process_refund(
    refund_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    can_process = await has_permission(db, current_user, "payments", "refund_process")
    if not can_process:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions: requires 'payments:refund_process' privilege.",
        )
    """Processes disbursement for an approved refund."""
    result = await db.execute(select(Refund).where(Refund.id == refund_id).with_for_update(of=Refund))
    refund = result.scalar_one_or_none()
    if not refund:
        raise HTTPException(status_code=404, detail="Refund record not found")
    check_institution_access(refund.institution_id, current_user)
    if refund.status not in ("requested", "approved"):
        raise HTTPException(status_code=400, detail=f"Cannot process refund in '{refund.status}' state")

    await execute_refund_disbursement(db, refund, current_user.id)
    await db.commit()
    return {"message": "Refund disbursed and completed successfully", "refund_id": refund.id, "status": "completed"}


@router.post("/refunds/{refund_id}/reject")
async def reject_refund(
    refund_id: int,
    data: RefundRejectRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    can_approve = await has_permission(db, current_user, "payments", "refund_approve")
    if not can_approve:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions: requires 'payments:refund_approve' privilege.",
        )
    result = await db.execute(select(Refund).where(Refund.id == refund_id).with_for_update(of=Refund))
    refund = result.scalar_one_or_none()
    if not refund:
        raise HTTPException(status_code=404, detail="Refund record not found")
    check_institution_access(refund.institution_id, current_user)
    if refund.status not in ("requested", "approved"):
        raise HTTPException(status_code=400, detail=f"Cannot reject refund in '{refund.status}' state")

    old_status = refund.status
    refund.status = "rejected"
    refund.notes = f"{refund.notes + ' | ' if refund.notes else ''}Rejected: {data.reason}"
    await log_payment_audit(
        db,
        user_id=current_user.id,
        action="refund_rejected",
        payment_id=refund.payment_id or 0,
        old_data={"status": old_status},
        new_data={"status": "rejected", "refund_id": refund.id},
        reason=data.reason,
        severity="warning",
    )
    await db.commit()
    return {"message": "Refund request rejected", "refund_id": refund.id, "status": "rejected"}


@router.get("/refunds/")
async def list_refunds(
    student_id: Optional[int] = None,
    payment_id: Optional[int] = None,
    status: Optional[str] = None,
    institution_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role(*PAYMENT_STAFF_VIEW_ROLES)),
):
    """Lists refund records with student and payment metadata."""
    if institution_id is not None:
        check_institution_access(institution_id, current_user)
        effective_inst_id = institution_id
    elif not is_sysadmin(current_user):
        effective_inst_id = getattr(current_user, "institution_id", None)
    else:
        effective_inst_id = None

    query = (
        select(Refund, Student, PaymentReceipt.receipt_number)
        .join(Student, Refund.student_id == Student.id)
        .outerjoin(PaymentReceipt, Refund.payment_id == PaymentReceipt.payment_id)
    )
    if effective_inst_id is not None:
        query = query.where(Refund.institution_id == effective_inst_id)
    if student_id:
        query = query.where(Refund.student_id == student_id)
    if payment_id:
        query = query.where(Refund.payment_id == payment_id)
    if status:
        query = query.where(Refund.status == status)

    query = query.order_by(desc(Refund.refund_date), desc(Refund.id))
    rows = (await db.execute(query)).all()

    return [
        {
            "id": r.id,
            "student_id": r.student_id,
            "student_name": f"{s.first_name} {s.last_name}",
            "admission_number": s.admission_number,
            "payment_id": r.payment_id,
            "receipt_number": rec_num,
            "amount": float(r.amount),
            "refund_date": str(r.refund_date),
            "refund_method": r.refund_method,
            "reason": r.reason,
            "status": r.status,
            "reference_number": r.reference_number,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r, s, rec_num in rows
    ]


# ─────────────────────────────────────────────────────────────────────────────
# 8. PAYMENT AUDIT TRAIL
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/{payment_id}/audit-trail")
async def get_payment_audit_trail(
    payment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """Returns chronological audit records for a payment."""
    can_audit = await has_permission(db, current_user, "payments", "view_audit")
    if not can_audit:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions: requires 'payments:view_audit' privilege to inspect audit trails.",
        )
    pay_res = await db.execute(select(Payment).options(selectinload(Payment.student)).where(Payment.id == payment_id))
    payment = pay_res.scalar_one_or_none()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    if payment.student:
        check_institution_access(payment.student.institution_id, current_user)

    query = (
        select(AuditLog, User.username, User.first_name, User.last_name)
        .outerjoin(User, AuditLog.user_id == User.id)
        .where(AuditLog.resource_type == "payment", AuditLog.resource_id == payment_id)
        .order_by(desc(AuditLog.created_at))
    )
    rows = (await db.execute(query)).all()

    return [
        {
            "id": log.id,
            "action": log.action,
            "actor": f"{fn or ''} {ln or ''}".strip() or uname or "System",
            "old_data": json.loads(log.old_data) if log.old_data else None,
            "new_data": json.loads(log.new_data) if log.new_data else None,
            "reason": log.details,
            "severity": log.severity,
            "created_at": log.created_at.isoformat() if log.created_at else None,
        }
        for log, uname, fn, ln in rows
    ]


# ─────────────────────────────────────────────────────────────────────────────
# 9. WORKFLOW CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/workflow/config")
async def get_workflow_config(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """Returns current institute payment workflow configuration."""
    can_cfg = await has_permission(db, current_user, "fee_workflow", "configure")
    if not can_cfg:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions: requires 'fee_workflow:configure' privilege.",
        )
    effective_inst_id = getattr(current_user, "institution_id", None) or 1
    settings = await get_payment_workflow_settings(db, institution_id=effective_inst_id)
    return {
        "workflow_mode": settings["workflow_mode"],
        "approval_amount_threshold": float(settings["approval_amount_threshold"]),
        "approval_roles": settings["approval_roles"],
        "require_approval_methods": settings["require_approval_methods"],
        "allow_posted_payment_edits": settings["allow_posted_payment_edits"],
        "refund_approval_required": settings["refund_approval_required"],
    }


@router.put("/workflow/config")
async def update_workflow_config(
    data: WorkflowConfigUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """Updates payment workflow configuration."""
    can_cfg = await has_permission(db, current_user, "fee_workflow", "configure")
    if not can_cfg:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions: requires 'fee_workflow:configure' privilege.",
        )
    effective_inst_id = getattr(current_user, "institution_id", None) or 1

    mapping = {
        "payment_workflow_mode": data.payment_workflow_mode,
        "erp_approval_amount_threshold": str(data.erp_approval_amount_threshold) if data.erp_approval_amount_threshold is not None else None,
        "erp_approval_roles": json.dumps(data.erp_approval_roles) if data.erp_approval_roles is not None else None,
        "erp_require_approval_methods": json.dumps(data.erp_require_approval_methods) if data.erp_require_approval_methods is not None else None,
        "allow_posted_payment_edits": str(data.allow_posted_payment_edits).lower() if data.allow_posted_payment_edits is not None else None,
        "refund_approval_required": str(data.refund_approval_required).lower() if data.refund_approval_required is not None else None,
    }

    for key, val in mapping.items():
        if val is None:
            continue
        stmt = select(InstitutionSetting).where(
            and_(
                InstitutionSetting.institution_id == effective_inst_id,
                InstitutionSetting.category == "fees",
                InstitutionSetting.key == key,
            )
        )
        row = (await db.execute(stmt)).scalar_one_or_none()
        if row:
            row.value = val
        else:
            db.add(InstitutionSetting(
                institution_id=effective_inst_id,
                category="fees",
                key=key,
                value=val,
                updated_by_id=current_user.id,
            ))

    await db.commit()
    return {"message": "Payment workflow settings updated successfully"}


# ─────────────────────────────────────────────────────────────────────────────
# 10. LIST & GET PAYMENTS (Existing endpoints updated for new lifecycle)
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/")
async def list_payments(
    student_id: Optional[int] = None,
    academic_year_id: Optional[int] = None,
    board_id: Optional[int] = None,
    standard_id: Optional[int] = None,
    division_id: Optional[int] = None,
    status: Optional[str] = None,
    institution_id: Optional[int] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    role = (getattr(current_user, "role", "") or "").strip().lower()
    if role == "student":
        linked_student_id = getattr(current_user, "student_id", None)
        if not linked_student_id:
            raise HTTPException(status_code=403, detail="No student profile linked to this account.")
        if student_id is not None and student_id != linked_student_id:
            raise HTTPException(status_code=403, detail="Students can only list their own payments.")
        student_id = linked_student_id
    elif not is_sysadmin(current_user) and role not in PAYMENT_STAFF_VIEW_ROLES:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    if institution_id is not None:
        check_institution_access(institution_id, current_user)
        effective_inst_id = institution_id
    elif not is_sysadmin(current_user):
        effective_inst_id = getattr(current_user, "institution_id", None)
    else:
        effective_inst_id = None

    query = (
        select(
            Payment,
            Student,
            PaymentReceipt.receipt_number,
            Division.name.label("batch_name"),
            Standard.name.label("standard_name"),
            Board.name.label("board_name"),
        )
        .join(Student, Payment.student_id == Student.id)
        .outerjoin(
            PaymentReceipt,
            (Payment.id == PaymentReceipt.payment_id) & (PaymentReceipt.status == "valid"),
        )
        .outerjoin(
            StudentEnrollment,
            (Payment.student_id == StudentEnrollment.student_id)
            & (Payment.academic_year_id == StudentEnrollment.academic_year_id),
        )
        .outerjoin(Division, StudentEnrollment.division_id == Division.id)
        .outerjoin(Standard, StudentEnrollment.standard_id == Standard.id)
        .outerjoin(Board, Division.board_id == Board.id)
    )
    if effective_inst_id is not None:
        query = query.where(Student.institution_id == effective_inst_id)
    if student_id:
        query = query.where(Payment.student_id == student_id)
    if academic_year_id:
        query = query.where(Payment.academic_year_id == academic_year_id)
    if board_id:
        query = query.where(Division.board_id == board_id)
    if standard_id:
        query = query.where(StudentEnrollment.standard_id == standard_id)
    if division_id:
        query = query.where(StudentEnrollment.division_id == division_id)
    if status:
        if status in ("posted", "completed"):
            query = query.where(Payment.status.in_(["posted", "completed"]))
        else:
            query = query.where(Payment.status == status)
    if search:
        search_term = f"%{search.strip()}%"
        query = query.where(
            or_(
                Student.first_name.ilike(search_term),
                Student.last_name.ilike(search_term),
                Student.admission_number.ilike(search_term),
                PaymentReceipt.receipt_number.ilike(search_term),
                Payment.transaction_reference.ilike(search_term),
            )
        )

    query = query.order_by(desc(Payment.payment_date), desc(Payment.created_at))
    rows = (await db.execute(query)).all()

    return [
        {
            "id": p.id,
            "student_id": p.student_id,
            "student_name": f"{s.first_name} {s.last_name}",
            "admission_number": s.admission_number,
            "board_name": b_name or "General",
            "standard_name": std_name or "—",
            "batch_name": bch_name or "Unassigned",
            "amount": float(p.amount),
            "payment_date": str(p.payment_date),
            "payment_method": p.payment_method,
            "transaction_reference": p.transaction_reference or "N/A",
            "status": "posted" if p.status == "completed" else p.status,
            "edit_count": getattr(p, "edit_count", 0),
            "notes": p.notes or "",
            "receipt_number": rec_num or (f"RCP-2026-{p.id:04d}" if p.status in ("posted", "completed") else None),
        }
        for p, s, rec_num, bch_name, std_name, b_name in rows
    ]


@router.get("/receipts-list")
async def list_receipts(
    academic_year_id: Optional[int] = None,
    board_id: Optional[int] = None,
    standard_id: Optional[int] = None,
    division_id: Optional[int] = None,
    institution_id: Optional[int] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role(*PAYMENT_STAFF_VIEW_ROLES)),
):
    if institution_id is not None:
        check_institution_access(institution_id, current_user)
        effective_inst_id = institution_id
    elif not is_sysadmin(current_user):
        effective_inst_id = getattr(current_user, "institution_id", None)
    else:
        effective_inst_id = None

    query = (
        select(
            PaymentReceipt,
            Payment,
            Student,
            Division.name.label("batch_name"),
            Standard.name.label("standard_name"),
            Board.name.label("board_name"),
        )
        .join(Payment, PaymentReceipt.payment_id == Payment.id)
        .join(Student, PaymentReceipt.student_id == Student.id)
        .outerjoin(
            StudentEnrollment,
            (Payment.student_id == StudentEnrollment.student_id)
            & (Payment.academic_year_id == StudentEnrollment.academic_year_id),
        )
        .outerjoin(Division, StudentEnrollment.division_id == Division.id)
        .outerjoin(Standard, StudentEnrollment.standard_id == Standard.id)
        .outerjoin(Board, Division.board_id == Board.id)
    )
    if effective_inst_id is not None:
        query = query.where(Student.institution_id == effective_inst_id)
    if academic_year_id:
        query = query.where(Payment.academic_year_id == academic_year_id)
    if board_id:
        query = query.where(Division.board_id == board_id)
    if standard_id:
        query = query.where(StudentEnrollment.standard_id == standard_id)
    if division_id:
        query = query.where(StudentEnrollment.division_id == division_id)
    if search:
        search_term = f"%{search.strip()}%"
        query = query.where(
            or_(
                Student.first_name.ilike(search_term),
                Student.last_name.ilike(search_term),
                Student.admission_number.ilike(search_term),
                PaymentReceipt.receipt_number.ilike(search_term),
            )
        )

    query = query.order_by(desc(PaymentReceipt.payment_date), desc(PaymentReceipt.id))
    rows = (await db.execute(query)).all()

    receipts = []
    for r, p, s, bch_name, std_name, b_name in rows:
        receipt_meta = {}
        if r.receipt_data:
            try:
                receipt_meta = json.loads(r.receipt_data)
            except Exception:
                pass

        is_voided = p.status == "reversed" or r.status == "voided" or receipt_meta.get("status") == "voided"
        is_superseded = r.status == "superseded" or receipt_meta.get("status") == "superseded"

        receipt_status = "voided" if is_voided else ("superseded" if is_superseded else "valid")

        receipts.append({
            "id": r.id,
            "receipt_number": r.receipt_number,
            "payment_id": p.id,
            "student_id": s.id,
            "student_name": f"{s.first_name} {s.last_name}",
            "admission_number": s.admission_number,
            "board_name": b_name or "General",
            "standard_name": std_name or "—",
            "batch_name": bch_name or "Unassigned",
            "amount": float(r.amount),
            "payment_date": str(r.payment_date),
            "payment_method": r.payment_method,
            "status": receipt_status,
            "is_voided": is_voided,
            "is_superseded": is_superseded,
            "version": r.version,
            "reprint_count": r.reprint_count,
            "generated_at": r.generated_at.isoformat() if r.generated_at else None,
            "details": receipt_meta,
        })

    user_inst_id = effective_inst_id or getattr(current_user, "institution_id", None) or 1
    return await CodeXService.mask_records_list(
        db=db,
        institution_id=user_inst_id,
        user=current_user,
        records=receipts,
        numeric_fields=["amount"],
        module="fees",
    )


@router.get("/{payment_id}")
async def get_payment(
    payment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    result = await db.execute(
        select(Payment)
        .options(
            selectinload(Payment.allocations),
            selectinload(Payment.receipts),
            selectinload(Payment.student),
        )
        .where(Payment.id == payment_id)
    )
    payment = result.scalar_one_or_none()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    _authorize_payment_record_access(
        payment.student_id,
        payment.student.institution_id if payment.student else None,
        current_user,
    )
    
    curr_rec = next((r for r in payment.receipts if r.status == "valid"), None) if payment.receipts else None
    return {
        "id": payment.id,
        "student_id": payment.student_id,
        "amount": float(payment.amount),
        "payment_date": str(payment.payment_date),
        "payment_method": payment.payment_method,
        "transaction_reference": payment.transaction_reference,
        "status": "posted" if payment.status == "completed" else payment.status,
        "notes": payment.notes,
        "receipt_number": curr_rec.receipt_number if curr_rec else None,
        "version": curr_rec.version if curr_rec else 1,
        "edit_count": payment.edit_count,
        "submitted_at": payment.submitted_at.isoformat() if payment.submitted_at else None,
        "approved_at": payment.approved_at.isoformat() if payment.approved_at else None,
        "posted_at": payment.posted_at.isoformat() if payment.posted_at else None,
        "last_edited_at": payment.last_edited_at.isoformat() if payment.last_edited_at else None,
        "allocations": [
            {
                "id": a.id,
                "invoice_id": a.invoice_id,
                "installment_id": a.installment_id,
                "allocated_amount": float(a.allocated_amount),
            }
            for a in payment.allocations
        ],
    }


@router.post("/{payment_id}/reverse")
async def reverse_payment(
    payment_id: int,
    data: ReversalRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("superadmin", "admin", "accountant", "principal")),
):
    """Reverse a payment, restore invoice balances, and mark receipt as voided."""
    result = await db.execute(
        select(Payment)
        .options(selectinload(Payment.allocations), selectinload(Payment.receipts), selectinload(Payment.student))
        .where(Payment.id == payment_id)
        .with_for_update(of=Payment)
    )
    payment = result.scalar_one_or_none()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    _authorize_payment_record_access(
        payment.student_id,
        payment.student.institution_id if payment.student else None,
        current_user,
    )
    if payment.status == "reversed":
        raise HTTPException(status_code=400, detail="Payment already reversed")

    # Only posted/completed payments affected ledger balances
    if payment.status in ("posted", "completed"):
        for alloc in payment.allocations:
            inv_result = await db.execute(
                select(FeeInvoice).where(FeeInvoice.id == alloc.invoice_id).with_for_update(of=FeeInvoice)
            )
            invoice = inv_result.scalar_one_or_none()
            if invoice:
                invoice.paid_amount = max(
                    invoice.paid_amount - alloc.allocated_amount, Decimal("0")
                )
                invoice.outstanding_amount = invoice.net_amount - invoice.paid_amount
                if invoice.paid_amount <= Decimal("0"):
                    invoice.status = "unpaid"
                else:
                    invoice.status = "partial"

            if alloc.installment_id:
                inst_result = await db.execute(
                    select(FeeInstallment).where(
                        FeeInstallment.id == alloc.installment_id
                    ).with_for_update(of=FeeInstallment)
                )
                installment = inst_result.scalar_one_or_none()
                if installment:
                    installment.paid_amount = max(
                        installment.paid_amount - alloc.allocated_amount, Decimal("0")
                    )
                    if installment.paid_amount <= Decimal("0"):
                        installment.status = "unpaid"
                    else:
                        installment.status = "partial"

    payment.status = "reversed"
    payment.reversed_at = datetime.now(timezone.utc)
    payment.reversal_reason = data.reason
    payment.reversed_by_id = current_user.id

    # Mark all associated receipts as voided
    for receipt in payment.receipts:
        receipt.status = "voided"
        if receipt.receipt_data:
            try:
                rdata = json.loads(receipt.receipt_data)
                rdata["status"] = "voided"
                rdata["voided_at"] = payment.reversed_at.isoformat()
                rdata["void_reason"] = data.reason
                receipt.receipt_data = json.dumps(rdata)
            except Exception:
                pass

    await log_payment_audit(
        db,
        user_id=current_user.id,
        action="payment_reversed",
        payment_id=payment.id,
        old_data={"status": "posted"},
        new_data={"status": "reversed"},
        reason=data.reason,
        severity="warning",
    )

    await db.commit()
    return {"message": "Payment reversed successfully", "payment_id": payment_id}


async def build_receipt_response(
    db: AsyncSession,
    receipt: PaymentReceipt,
    payment: Optional[Payment] = None,
    current_user: Optional[User] = None,
) -> dict:
    """
    Constructs an authoritative receipt payload containing current transaction details,
    historical successful payments for the same fee obligation, reconciled fee ledger summary,
    and versioning metadata (superseded status, duplicate reprint copy, amendments).
    """
    if not payment:
        pay_res = await db.execute(
            select(Payment)
            .options(
                selectinload(Payment.allocations).selectinload(PaymentAllocation.invoice),
                selectinload(Payment.student),
            )
            .where(Payment.id == receipt.payment_id)
        )
        payment = pay_res.scalar_one_or_none()

    if not payment:
        raise HTTPException(status_code=404, detail="Payment record for receipt not found")

    receipt_data = json.loads(receipt.receipt_data) if receipt.receipt_data else {}

    # Scope to the same fee obligation (invoice)
    target_invoice_id = None
    if payment.allocations:
        target_invoice_id = payment.allocations[0].invoice_id
    elif "invoice_id" in receipt_data:
        target_invoice_id = receipt_data["invoice_id"]
    elif "invoice_number" in receipt_data:
        inv_by_num = (await db.execute(
            select(FeeInvoice.id).where(FeeInvoice.invoice_number == receipt_data["invoice_number"])
        )).scalar_one_or_none()
        target_invoice_id = inv_by_num

    # Fallback to active invoice for student & academic year
    if not target_invoice_id:
        inv_active = (await db.execute(
            select(FeeInvoice.id).where(
                FeeInvoice.student_id == payment.student_id,
                FeeInvoice.academic_year_id == payment.academic_year_id,
            ).order_by(FeeInvoice.id.desc()).limit(1)
        )).scalar_one_or_none()
        target_invoice_id = inv_active

    invoice = None
    historical_payments = []
    previous_payments_total = Decimal("0.00")
    gross_fee_amount = Decimal(str(receipt_data.get("gross_fee") or receipt_data.get("total_fees") or payment.amount))
    concession_amt = Decimal(str(receipt_data.get("concession_amount") or "0.00"))
    total_fee_amount = Decimal(str(receipt_data.get("total_fees") or payment.amount))

    if target_invoice_id:
        inv_res = await db.execute(
            select(FeeInvoice).where(FeeInvoice.id == target_invoice_id)
        )
        invoice = inv_res.scalar_one_or_none()
        if invoice:
            gross_fee_amount = Decimal(str(invoice.total_amount or 0))
            concession_amt = Decimal(str(invoice.discount_amount or 0))
            total_fee_amount = (
                Decimal(str(invoice.net_amount))
                if invoice.net_amount is not None
                else max(Decimal("0.00"), gross_fee_amount - concession_amt)
            )

        # Query all completed previous payments allocated to this same invoice
        hist_stmt = (
            select(Payment, PaymentReceipt)
            .join(PaymentAllocation, PaymentAllocation.payment_id == Payment.id)
            .outerjoin(PaymentReceipt, (PaymentReceipt.payment_id == Payment.id) & (PaymentReceipt.status == "valid"))
            .where(
                PaymentAllocation.invoice_id == target_invoice_id,
                Payment.status.in_(["posted", "completed"]),
                Payment.id != payment.id,
                or_(
                    Payment.payment_date < payment.payment_date,
                    and_(
                        Payment.payment_date == payment.payment_date,
                        Payment.id < payment.id,
                    ),
                ),
            )
            .distinct()
            .order_by(Payment.payment_date.asc(), Payment.id.asc())
        )
        hist_rows = (await db.execute(hist_stmt)).all()

        seen_payment_ids = set()
        for p_hist, pr_hist in hist_rows:
            if p_hist.id in seen_payment_ids:
                continue
            seen_payment_ids.add(p_hist.id)

            hist_receipt_no = pr_hist.receipt_number if pr_hist else f"RCP-2026-{p_hist.id:04d}"
            p_amt = Decimal(str(p_hist.amount))
            previous_payments_total += p_amt
            historical_payments.append({
                "payment_id": p_hist.id,
                "receipt_number": hist_receipt_no,
                "date": str(p_hist.payment_date),
                "payment_method": p_hist.payment_method,
                "amount": float(p_amt),
                "transaction_reference": p_hist.transaction_reference,
            })

    # Fallback to all completed previous payments for this student if invoice allocations were missing or empty
    if not historical_payments and payment.student_id:
        hist_student_stmt = (
            select(Payment, PaymentReceipt)
            .outerjoin(PaymentReceipt, (PaymentReceipt.payment_id == Payment.id) & (PaymentReceipt.status == "valid"))
            .where(
                Payment.student_id == payment.student_id,
                Payment.status.in_(["posted", "completed"]),
                Payment.id != payment.id,
                or_(
                    Payment.payment_date < payment.payment_date,
                    and_(
                        Payment.payment_date == payment.payment_date,
                        Payment.id < payment.id,
                    ),
                ),
            )
            .distinct()
            .order_by(Payment.payment_date.asc(), Payment.id.asc())
        )
        if payment.academic_year_id:
            hist_student_stmt = hist_student_stmt.where(Payment.academic_year_id == payment.academic_year_id)

        hist_student_rows = (await db.execute(hist_student_stmt)).all()
        seen_student_payment_ids = set()
        for p_hist, pr_hist in hist_student_rows:
            if p_hist.id in seen_student_payment_ids:
                continue
            seen_student_payment_ids.add(p_hist.id)

            hist_receipt_no = pr_hist.receipt_number if pr_hist else f"RCP-2026-{p_hist.id:04d}"
            p_amt = Decimal(str(p_hist.amount))
            previous_payments_total += p_amt
            historical_payments.append({
                "payment_id": p_hist.id,
                "receipt_number": hist_receipt_no,
                "date": str(p_hist.payment_date),
                "payment_method": p_hist.payment_method,
                "amount": float(p_amt),
                "transaction_reference": p_hist.transaction_reference,
            })

    # Reconcile from receipt_data if provided
    if previous_payments_total == Decimal("0.00") and receipt_data.get("previous_paid"):
        previous_payments_total = Decimal(str(receipt_data.get("previous_paid")))
    elif previous_payments_total == Decimal("0.00") and receipt_data.get("fee_summary", {}).get("previous_payments_total"):
        previous_payments_total = Decimal(str(receipt_data["fee_summary"]["previous_payments_total"]))

    current_payment_amount = Decimal(str(payment.amount))
    if payment.status in ("posted", "completed"):
        total_paid_to_date = previous_payments_total + current_payment_amount
    else:
        total_paid_to_date = previous_payments_total

    outstanding_balance = max(Decimal("0.00"), total_fee_amount - total_paid_to_date)

    all_installments = list(historical_payments)
    if payment.status in ("posted", "completed"):
        all_installments.append({
            "payment_id": payment.id,
            "receipt_number": receipt.receipt_number,
            "date": str(payment.payment_date),
            "payment_method": payment.payment_method,
            "amount": float(current_payment_amount),
            "transaction_reference": payment.transaction_reference,
            "is_current_receipt": True,
        })

    student = payment.student
    if student:
        canonical_student_name = f"{student.first_name or ''} {student.last_name or ''}".strip()
        student_name = re.sub(r"[\s\-_]+$", "", canonical_student_name).strip() or canonical_student_name
    else:
        raw_student_name = receipt_data.get("student_name") or ""
        student_name = re.sub(r"[\s\-_]+$", "", (raw_student_name or "").strip()) or raw_student_name
    admission_number = (student.admission_number if student else None) or receipt_data.get("admission_number") or ""

    standard_name = receipt_data.get("standard")
    division_name = receipt_data.get("batch") or receipt_data.get("division")
    roll_number = receipt_data.get("roll_number")
    board_name = receipt_data.get("board")
    guardian_name = receipt_data.get("guardian_name")
    guardian_phone = receipt_data.get("guardian_phone")
    student_phone = receipt_data.get("student_phone")

    if not standard_name or not division_name or not roll_number:
        enr_stmt = (
            select(StudentEnrollment)
            .options(
                selectinload(StudentEnrollment.standard),
                selectinload(StudentEnrollment.division),
            )
            .where(
                StudentEnrollment.student_id == payment.student_id,
                StudentEnrollment.academic_year_id == payment.academic_year_id,
            )
            .order_by(StudentEnrollment.id.desc())
            .limit(1)
        )
        enr = (await db.execute(enr_stmt)).scalar_one_or_none()
        if enr:
            if not standard_name and enr.standard:
                standard_name = enr.standard.name
            if not division_name and enr.division:
                division_name = enr.division.name
            if not roll_number and enr.roll_number:
                roll_number = enr.roll_number

    if student:
        if not student_phone and student.phone:
            student_phone = student.phone
        if not guardian_name or not guardian_phone:
            from app.models.student import Guardian
            guard_stmt = (
                select(Guardian)
                .where(Guardian.student_id == student.id)
                .order_by(Guardian.is_primary.desc())
            )
            guard = (await db.execute(guard_stmt)).scalars().first()
            if guard:
                if not guardian_name:
                    guardian_name = f"{guard.first_name or ''} {guard.last_name or ''}".strip()
                if not guardian_phone:
                    guardian_phone = guard.phone or guard.email

    collected_by = receipt_data.get("collected_by")
    if not collected_by and payment.collected_by_id:
        user_res = await db.execute(select(User).where(User.id == payment.collected_by_id))
        collector_user = user_res.scalar_one_or_none()
        if collector_user:
            collected_by = f"{collector_user.first_name or ''} {collector_user.last_name or ''}".strip()
    if not collected_by:
        collected_by = "Staff"

    invoice_number = (
        (invoice.invoice_number if invoice else None)
        or receipt_data.get("invoice_number")
        or (f"INV-{payment.academic_year_id}-{payment.student_id:04d}")
    )

    fee_summary = {
        "total_fee_amount": float(total_fee_amount),
        "previous_payments_total": float(previous_payments_total),
        "current_payment_amount": float(current_payment_amount),
        "total_paid_to_date": float(total_paid_to_date),
        "outstanding_balance": float(outstanding_balance),
    }

    allocations_list = []
    if payment.allocations:
        for a in payment.allocations:
            allocations_list.append({
                "id": a.id,
                "invoice_id": a.invoice_id,
                "installment_id": a.installment_id,
                "installment_number": getattr(a.installment, "installment_number", None) if a.installment else None,
                "amount": float(a.allocated_amount),
            })
    elif "allocations" in receipt_data:
        allocations_list = receipt_data["allocations"]

    academic_year_name = receipt_data.get("academic_year")
    if not academic_year_name and payment.academic_year_id:
        ay_res = await db.execute(select(AcademicYear.name).where(AcademicYear.id == payment.academic_year_id))
        academic_year_name = ay_res.scalar_one_or_none()

    is_superseded = receipt.status == "superseded"
    is_voided = payment.status == "reversed" or receipt.status == "voided"

    inst_id = (student.institution_id if student else None) or getattr(payment, "institution_id", 1) or 1
    inst_dict = await get_institution_dict(db, inst_id)

    res_payload = {
        "institution": inst_dict,
        "receipt_number": receipt.receipt_number,
        "payment_id": payment.id,
        "academic_year": academic_year_name or "2026 – 27",
        "academic_year_id": payment.academic_year_id,
        "student_id": payment.student_id,
        "student_name": student_name,
        "admission_number": admission_number,
        "roll_number": roll_number or "—",
        "guardian_name": guardian_name or "—",
        "guardian_phone": guardian_phone or student_phone or "—",
        "student_phone": student_phone or "—",
        "board": board_name or "ICSE",
        "standard": standard_name or "—",
        "division": division_name or "—",
        "batch": division_name or "—",
        "amount": float(current_payment_amount),
        "payment_date": str(payment.payment_date),
        "payment_method": payment.payment_method,
        "transaction_reference": payment.transaction_reference,
        "bank_name": payment.bank_name,
        "cheque_number": payment.cheque_number,
        "cheque_date": str(payment.cheque_date) if payment.cheque_date else None,
        "notes": payment.notes,
        "status": payment.status,
        "is_reversed": is_voided,
        "reversed_at": payment.reversed_at.isoformat() if payment.reversed_at else None,
        "reversal_reason": payment.reversal_reason,
        "invoice_id": invoice.id if invoice else target_invoice_id,
        "invoice_number": invoice_number,
        "historical_payments": historical_payments,
        "all_installments": all_installments,
        "fee_summary": fee_summary,
        "allocations": allocations_list,
        "collected_by": collected_by,
        "generated_at": receipt.generated_at.isoformat(),
        # Versioning & Workflow Extensions
        "version": receipt.version,
        "receipt_status": receipt.status,
        "is_superseded": is_superseded,
        "superseded_at": receipt.superseded_at.isoformat() if receipt.superseded_at else None,
        "superseded_by_receipt_number": receipt.superseded_by_receipt_number,
        "supersede_reason": receipt_data.get("supersede_reason"),
        "reprint_count": receipt.reprint_count,
        "is_duplicate": receipt.reprint_count > 0,
        "amendments": receipt_data.get("amendments", []),
        # Backward compatibility & SSOT Concession Breakdown
        "gross_fee": float(gross_fee_amount),
        "concession_amount": float(concession_amt),
        "total_fees": float(total_fee_amount),
        "total_paid": float(total_paid_to_date),
        "outstanding_after": float(outstanding_balance),
        "previous_paid": float(previous_payments_total),
    }

    if current_user:
        user_inst = getattr(current_user, "institution_id", None) or (receipt.payment.student.institution_id if receipt.payment and receipt.payment.student else 1)
        res_payload = await CodeXService.apply_financial_masking(
            db=db,
            institution_id=user_inst,
            user=current_user,
            data=res_payload,
            numeric_fields=["amount", "gross_fee", "concession_amount", "total_fees", "total_paid", "outstanding_after", "previous_paid"],
            module="fees",
        )
        if "fee_summary" in res_payload and isinstance(res_payload["fee_summary"], dict):
            res_payload["fee_summary"] = await CodeXService.apply_financial_masking(
                db=db,
                institution_id=user_inst,
                user=current_user,
                data=res_payload["fee_summary"],
                numeric_fields=["total_fee_amount", "previous_payments_total", "current_payment_amount", "total_paid_to_date", "outstanding_balance"],
                module="fees",
            )
    return res_payload


@router.get("/receipts/{receipt_number}")
async def get_receipt(
    receipt_number: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    result = await db.execute(
        select(PaymentReceipt).options(selectinload(PaymentReceipt.payment).selectinload(Payment.student)).where(PaymentReceipt.receipt_number == receipt_number)
    )
    receipt = result.scalar_one_or_none()

    if not receipt and receipt_number.isdigit():
        result = await db.execute(
            select(PaymentReceipt).options(selectinload(PaymentReceipt.payment).selectinload(Payment.student)).where(
                PaymentReceipt.payment_id == int(receipt_number),
                PaymentReceipt.status == "valid",
            )
        )
        receipt = result.scalar_one_or_none()
        if not receipt:
            result = await db.execute(
                select(PaymentReceipt).options(selectinload(PaymentReceipt.payment).selectinload(Payment.student)).where(PaymentReceipt.payment_id == int(receipt_number))
            )
            receipt = result.scalar_one_or_none()

    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")

    rec_inst_id = None
    rec_stu_id = receipt.student_id or (receipt.payment.student_id if receipt.payment else None)
    if receipt.payment and receipt.payment.student:
        rec_inst_id = receipt.payment.student.institution_id
    elif receipt.student_id:
        std = await db.get(Student, receipt.student_id)
        if std:
            rec_inst_id = std.institution_id
    _authorize_payment_record_access(rec_stu_id, rec_inst_id, current_user)

    return await build_receipt_response(db, receipt, current_user=current_user)


async def get_institution_dict(db: AsyncSession, institution_id: Optional[int]) -> Dict[str, Any]:
    inst_id = institution_id or 1
    inst = await db.get(Institution, inst_id)
    if not inst and inst_id != 1:
        inst = await db.get(Institution, 1)

    # Centralized SSOT lookup for Documents & Print settings (Default: False for trims/seals, True for software branding)
    print_logo = True
    print_tagline = False
    print_software_branding = True
    print_sovereign_trim = False
    print_verification_seal = False
    signatory_title = None
    signatory_name = None
    disclaimer_text = None
    try:
        stmt = select(InstitutionSetting).where(
            InstitutionSetting.institution_id == inst_id,
            InstitutionSetting.category == "documents",
            InstitutionSetting.key.in_([
                "print_receipt_logo",
                "print_receipt_tagline",
                "print_software_branding",
                "print_sovereign_trim",
                "print_verification_seal",
                "signatory_title",
                "signatory_name",
                "disclaimer_text",
            ]),
        )
        res = await db.execute(stmt)
        for row in res.scalars().all():
            raw_val = str(row.value or "").strip()
            val = raw_val.lower()
            if row.key == "print_receipt_logo":
                print_logo = val in ("true", "1", "yes")
            elif row.key == "print_receipt_tagline":
                print_tagline = val in ("true", "1", "yes")
            elif row.key == "print_software_branding":
                print_software_branding = val in ("true", "1", "yes")
            elif row.key == "print_sovereign_trim":
                print_sovereign_trim = val in ("true", "1", "yes")
            elif row.key == "print_verification_seal":
                print_verification_seal = val in ("true", "1", "yes")
            elif row.key == "signatory_title" and raw_val:
                signatory_title = raw_val
            elif row.key == "signatory_name" and raw_val:
                signatory_name = raw_val
            elif row.key == "disclaimer_text" and raw_val:
                disclaimer_text = raw_val
    except Exception:
        pass

    if inst:
        return {
            "id": inst.id,
            "name": inst.name,
            "code": inst.code,
            "address": inst.address,
            "city": inst.city,
            "state": inst.state,
            "pincode": inst.pincode,
            "phone": inst.phone,
            "email": inst.email,
            "website": inst.website,
            "tagline": inst.tagline,
            "tax_id": inst.tax_id,
            "logo_url": inst.logo_url,
            "print_receipt_logo": print_logo,
            "print_receipt_tagline": print_tagline,
            "print_software_branding": print_software_branding,
            "print_sovereign_trim": print_sovereign_trim,
            "print_verification_seal": print_verification_seal,
            "signatory_title": signatory_title,
            "signatory_name": signatory_name,
            "disclaimer_text": disclaimer_text,
        }
    return {
        "name": "Prashant Academy",
        "tagline": "Premier Coaching Institute for Academic & Competitive Excellence",
        "address": "Shop No16, 14, 12, Aquarius Taurus Building, Jankalyan Nagar, Malad West",
        "city": "Mumbai",
        "state": "Maharashtra",
        "pincode": "400095",
        "phone": "+91-7021789907",
        "email": "tejam.prashnat@gmail.com",
        "tax_id": "AABCP1234K",
        "print_receipt_logo": print_logo,
        "print_receipt_tagline": print_tagline,
        "print_software_branding": print_software_branding,
        "print_sovereign_trim": print_sovereign_trim,
        "print_verification_seal": print_verification_seal,
    }


class BulkReceiptPdfRequest(BaseModel):
    receipt_numbers: List[str]
    print_logo: Optional[bool] = None
    print_tagline: Optional[bool] = None
    print_software_branding: Optional[bool] = None
    print_sovereign_trim: Optional[bool] = None
    print_verification_seal: Optional[bool] = None


@router.get("/receipts/{receipt_number}/pdf")
async def get_receipt_pdf(
    receipt_number: str,
    print_logo: Optional[bool] = Query(None, description="Override print logo setting"),
    print_tagline: Optional[bool] = Query(None, description="Override print tagline setting"),
    print_software_branding: Optional[bool] = Query(None, description="Override print software branding setting"),
    print_sovereign_trim: Optional[bool] = Query(None, description="Override print sovereign trim setting"),
    print_verification_seal: Optional[bool] = Query(None, description="Override print verification seal setting"),
    paper_size: str = Query("A5", pattern="^(A5|A4)$", description="Target paper format: A5 or A4"),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """
    Generates and returns an authoritative A5 portrait PDF document for a fee receipt.
    Enforces strict filename convention: StudentName_ReceiptNo.pdf.
    """
    result = await db.execute(
        select(PaymentReceipt)
        .options(selectinload(PaymentReceipt.payment).selectinload(Payment.student))
        .where(PaymentReceipt.receipt_number == receipt_number)
    )
    receipt = result.scalar_one_or_none()

    if not receipt and receipt_number.isdigit():
        result = await db.execute(
            select(PaymentReceipt)
            .options(selectinload(PaymentReceipt.payment).selectinload(Payment.student))
            .where(
                PaymentReceipt.payment_id == int(receipt_number),
                PaymentReceipt.status == "valid",
            )
        )
        receipt = result.scalar_one_or_none()
        if not receipt:
            result = await db.execute(
                select(PaymentReceipt)
                .options(selectinload(PaymentReceipt.payment).selectinload(Payment.student))
                .where(PaymentReceipt.payment_id == int(receipt_number))
            )
            receipt = result.scalar_one_or_none()

    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")

    student_inst_id = None
    rec_stu_id = receipt.student_id or (receipt.payment.student_id if receipt.payment else None)
    if receipt.payment and receipt.payment.student:
        student_inst_id = receipt.payment.student.institution_id or 1
    elif receipt.student_id:
        std = await db.get(Student, receipt.student_id)
        if std:
            student_inst_id = std.institution_id or 1
    _authorize_payment_record_access(rec_stu_id, student_inst_id, current_user)
    student_inst_id = student_inst_id or 1

    receipt_payload = await build_receipt_response(db, receipt, current_user=current_user)
    institution_dict = await get_institution_dict(db, student_inst_id)
    # Match software preview visually by default unless explicitly suppressed by query params.
    institution_dict["print_receipt_logo"] = True if print_logo is None else print_logo
    institution_dict["print_receipt_tagline"] = True if print_tagline is None else print_tagline
    if print_software_branding is not None:
        institution_dict["print_software_branding"] = print_software_branding
    if print_sovereign_trim is not None:
        institution_dict["print_sovereign_trim"] = print_sovereign_trim
    if print_verification_seal is not None:
        institution_dict["print_verification_seal"] = print_verification_seal

    pdf_bytes = ReceiptPdfService.generate_receipt_pdf(receipt_payload, institution_dict, paper_size=paper_size)
    filename = sanitize_receipt_filename(receipt_payload.get("student_name") or "Student", receipt.receipt_number)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "X-Receipt-Number": receipt.receipt_number,
        },
    )


@router.post("/receipts/bulk-pdf-zip")
async def export_bulk_receipts_zip(
    payload: BulkReceiptPdfRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role(*PAYMENT_EXPORT_ROLES)),
):
    """
    Generates individual PDFs for all selected receipts and returns a ZIP archive
    containing StudentName_ReceiptNo.pdf files.
    """
    if not payload.receipt_numbers:
        raise HTTPException(status_code=400, detail="No receipt numbers provided for bulk export.")

    receipt_items = []
    failed_receipts = []

    for r_num in payload.receipt_numbers:
        res = await db.execute(
            select(PaymentReceipt)
            .options(selectinload(PaymentReceipt.payment).selectinload(Payment.student))
            .where(PaymentReceipt.receipt_number == r_num)
        )
        receipt = res.scalar_one_or_none()
        if not receipt:
            failed_receipts.append(r_num)
            continue

        student_inst_id = None
        if receipt.payment and receipt.payment.student:
            student_inst_id = receipt.payment.student.institution_id
        elif receipt.student_id:
            std = await db.get(Student, receipt.student_id)
            if std:
                student_inst_id = std.institution_id

        try:
            check_institution_access(student_inst_id, current_user)
        except HTTPException:
            failed_receipts.append(r_num)
            continue
        student_inst_id = student_inst_id or 1

        r_payload = await build_receipt_response(db, receipt, current_user=current_user)
        inst_dict = await get_institution_dict(db, student_inst_id)
        # Match software preview visually by default unless explicitly suppressed in bulk request.
        inst_dict["print_receipt_logo"] = True if payload.print_logo is None else payload.print_logo
        inst_dict["print_receipt_tagline"] = True if payload.print_tagline is None else payload.print_tagline
        if payload.print_software_branding is not None:
            inst_dict["print_software_branding"] = payload.print_software_branding
        if payload.print_sovereign_trim is not None:
            inst_dict["print_sovereign_trim"] = payload.print_sovereign_trim
        if payload.print_verification_seal is not None:
            inst_dict["print_verification_seal"] = payload.print_verification_seal
        receipt_items.append((r_payload, inst_dict))

    if not receipt_items:
        raise HTTPException(status_code=404, detail="No valid receipts found or accessible for bulk export.")

    zip_bytes = ReceiptPdfService.generate_bulk_receipts_zip(receipt_items)
    batch_timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    zip_filename = f"Receipts_Batch_{batch_timestamp}.zip"

    return Response(
        content=zip_bytes,
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="{zip_filename}"',
            "X-Processed-Count": str(len(receipt_items)),
            "X-Failed-Count": str(len(failed_receipts)),
        },
    )

# ─────────────────────────────────────────────────────────────────────────────
# ONLINE PAYMENT GATEWAY & UPI ENDPOINTS (Razorpay / UPI)
# ─────────────────────────────────────────────────────────────────────────────

ONLINE_CHECKOUT_ROLES = {
    "student",
    "superadmin",
    "sysadmin",
    "super_admin",
    "admin",
    "principal",
    "accountant",
    "staff",
}


async def _authorize_online_invoice_access(
    db: AsyncSession,
    invoice_id: int,
    current_user,
) -> int:
    """Validates role, tenant isolation, and student ownership before online payment operations."""
    role = (getattr(current_user, "role", "") or "").strip().lower()
    if role not in ONLINE_CHECKOUT_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Role not authorized for online fee checkout.",
        )
    invoice = await db.get(FeeInvoice, invoice_id)
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Fee invoice #{invoice_id} not found.",
        )
    student = await db.get(Student, invoice.student_id)
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student record linked to invoice was not found.",
        )
    check_institution_access(student.institution_id, current_user)
    if role == "student" and getattr(current_user, "student_id", None) != invoice.student_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Students can only access payments for their own fee invoices.",
        )
    return student.institution_id


@router.get("/online/config")
async def get_online_gateway_config_endpoint(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """Fetches public payment gateway configuration for Razorpay and UPI checkout."""
    inst_id = getattr(current_user, "institution_id", 1) or 1
    config = await get_payment_gateway_config(db, inst_id)
    # Mask secret keys for safety
    secret = config.get("razorpay_key_secret", "")
    masked_secret = f"{secret[:4]}••••••••{secret[-4:]}" if len(secret) > 8 else "••••••••"
    safe_config = dict(config)
    safe_config["razorpay_key_secret_masked"] = masked_secret
    safe_config.pop("razorpay_key_secret", None)
    safe_config.pop("razorpay_webhook_secret", None)
    return safe_config


@router.put("/online/config")
async def update_online_gateway_config_endpoint(
    payload: GatewayConfigUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role(["superadmin", "sysadmin", "admin", "principal"])),
):
    """Updates Razorpay credentials and UPI VPA settings for the institution."""
    inst_id = getattr(current_user, "institution_id", 1) or 1
    updates = payload.model_dump(exclude_unset=True)
    updated = await update_payment_gateway_config(db, inst_id, updates)
    return {
        "status": "success",
        "message": "Payment gateway configuration updated successfully.",
        "config": updated,
    }


@router.post("/online/create-order")
async def create_online_order_endpoint(
    payload: OnlineOrderCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """
    Creates a verified online checkout order for a fee invoice.
    Returns Razorpay order parameters, dynamic UPI payment link, and high-contrast SVG QR code.
    """
    inst_id = await _authorize_online_invoice_access(db, payload.invoice_id, current_user)
    order_data = await create_gateway_order(
        db=db,
        invoice_id=payload.invoice_id,
        amount=payload.amount,
        installment_id=payload.installment_id,
        institution_id=inst_id,
    )
    return order_data


@router.post("/online/verify")
async def verify_online_payment_endpoint(
    payload: OnlinePaymentVerify,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """
    Cryptographically verifies the Razorpay/UPI payment signature and executes
    authoritative posting: updates fee invoice balances and generates an official receipt.
    """
    inst_id = await _authorize_online_invoice_access(db, payload.invoice_id, current_user)
    result = await verify_and_post_gateway_payment(
        db=db,
        order_id=payload.order_id,
        payment_id=payload.payment_id,
        signature=payload.signature,
        invoice_id=payload.invoice_id,
        amount=payload.amount,
        installment_id=payload.installment_id,
        current_user_id=current_user.id,
        institution_id=inst_id,
        require_order_record=True,
    )
    return result


@router.post("/online/webhook")
async def online_payment_webhook_endpoint(
    request: Request,
    x_razorpay_signature: Optional[str] = Header(default=None, alias="X-Razorpay-Signature"),
    db: AsyncSession = Depends(get_db),
):
    """
    Server-to-server webhook callback receiver for asynchronous Razorpay events
    (e.g., payment.captured, order.paid), strictly protected by HMAC-SHA256 verification.
    """
    if not x_razorpay_signature:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing X-Razorpay-Signature webhook header.",
        )

    raw_body = await request.body()
    try:
        event = json.loads(raw_body.decode("utf-8"))
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid JSON webhook payload.",
        )

    event_type = event.get("event", "")
    payload_data = event.get("payload", {})
    payment_entity = payload_data.get("payment", {}).get("entity", {})
    order_id = payment_entity.get("order_id")
    payment_id = payment_entity.get("id")
    amount_in_paise = payment_entity.get("amount", 0)

    inst_id = None
    if order_id:
        order_log = (
            await db.execute(
                select(AuditLog)
                .where(
                    and_(
                        AuditLog.action == "ONLINE_PAYMENT_ORDER_CREATED",
                        AuditLog.resource_type == "gateway_order",
                        AuditLog.details == str(order_id),
                    )
                )
                .order_by(AuditLog.id.desc())
                .limit(1)
            )
        ).scalar_one_or_none()
        if order_log and order_log.new_data:
            try:
                inst_id = int(json.loads(order_log.new_data).get("institution_id") or 0) or None
            except Exception:
                inst_id = None

    if inst_id is None:
        raw_inv_id = (payment_entity.get("notes") or {}).get("invoice_id")
        if raw_inv_id is not None and str(raw_inv_id).isdigit():
            inv_row = await db.get(FeeInvoice, int(raw_inv_id))
            if inv_row:
                stu_row = await db.get(Student, inv_row.student_id)
                if stu_row and stu_row.institution_id:
                    inst_id = stu_row.institution_id

    inst_id = inst_id or 1

    config = await get_payment_gateway_config(db, inst_id)
    webhook_secret = config.get("razorpay_webhook_secret") or config.get("razorpay_key_secret", "")
    if not verify_webhook_signature(raw_body, x_razorpay_signature, webhook_secret):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid webhook cryptographic signature.",
        )

    return {
        "status": "received",
        "event": event_type,
        "payment_id": payment_id,
        "order_id": order_id,
        "amount": amount_in_paise / 100 if amount_in_paise else 0,
    }


# ─────────────────────────────────────────────────────────────────────────────
# 9. FINANCIAL ACCOUNTING PERIODS (Period Locking Governance)
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/periods/")
async def list_financial_periods(
    institution_id: Optional[int] = None,
    academic_year_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role(*PAYMENT_STAFF_VIEW_ROLES)),
):
    """Lists accounting financial periods with closure status."""
    if institution_id is not None:
        check_institution_access(institution_id, current_user)
    effective_inst_id = institution_id or getattr(current_user, "institution_id", None) or 1
    stmt = select(FinancialPeriod).where(FinancialPeriod.institution_id == effective_inst_id).order_by(FinancialPeriod.start_date.desc())
    if academic_year_id:
        stmt = stmt.where(FinancialPeriod.academic_year_id == academic_year_id)
    periods = (await db.execute(stmt)).scalars().all()
    return [
        {
            "id": p.id,
            "name": p.name,
            "period_type": p.period_type,
            "start_date": str(p.start_date),
            "end_date": str(p.end_date),
            "is_closed": p.is_closed,
            "closed_at": p.closed_at.isoformat() if p.closed_at else None,
        }
        for p in periods
    ]


@router.post("/periods/", status_code=201)
async def create_financial_period(
    data: FinancialPeriodCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("superadmin", "admin", "sysadmin")),
):
    """Creates a new financial accounting period."""
    effective_inst_id = getattr(current_user, "institution_id", None) or 1
    period = FinancialPeriod(
        institution_id=effective_inst_id,
        academic_year_id=data.academic_year_id,
        name=data.name,
        period_type=data.period_type or "monthly",
        start_date=data.start_date,
        end_date=data.end_date,
        is_closed=False,
    )
    db.add(period)
    await db.commit()
    await db.refresh(period)
    return {"message": "Financial period created", "period_id": period.id, "name": period.name}


@router.post("/periods/{period_id}/close")
async def close_financial_period(
    period_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("superadmin", "admin", "sysadmin")),
):
    """Locks a financial accounting period to prevent backdated modifications."""
    period = (await db.execute(select(FinancialPeriod).where(FinancialPeriod.id == period_id))).scalar_one_or_none()
    if not period:
        raise HTTPException(status_code=404, detail="Financial period not found")
    check_institution_access(period.institution_id, current_user)
    if period.is_closed:
        raise HTTPException(status_code=400, detail="Financial period is already closed")

    now = datetime.now(timezone.utc)
    period.is_closed = True
    period.closed_at = now
    period.closed_by_id = current_user.id
    await db.commit()
    return {"message": f"Financial period '{period.name}' successfully closed and locked", "period_id": period.id}


@router.post("/periods/{period_id}/reopen")
async def reopen_financial_period(
    period_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("superadmin", "sysadmin")),
):
    """Reopens a locked financial accounting period (Superadmin only)."""
    period = (await db.execute(select(FinancialPeriod).where(FinancialPeriod.id == period_id))).scalar_one_or_none()
    if not period:
        raise HTTPException(status_code=404, detail="Financial period not found")
    check_institution_access(period.institution_id, current_user)
    if not period.is_closed:
        raise HTTPException(status_code=400, detail="Financial period is already open")

    period.is_closed = False
    period.closed_at = None
    period.closed_by_id = None
    await db.commit()
    return {"message": f"Financial period '{period.name}' reopened", "period_id": period.id}


