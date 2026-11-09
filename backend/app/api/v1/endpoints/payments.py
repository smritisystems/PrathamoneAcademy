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
#  * @updated     2026-11-09
#  *
#  * @description API endpoints for payment workflow lifecycle (Draft, Submitted, Approved, Posted), audited edits, receipt supersession, reprints, and refund workflows.
#  */

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, desc, and_
from sqlalchemy.orm import selectinload
from typing import Optional, List, Dict, Any
from decimal import Decimal
from datetime import date, datetime, timezone
import json

from app.core.database import get_db
from app.core.deps import get_current_active_user, require_role, is_sysadmin, check_institution_access, has_permission, require_permission, get_user_permissions
from app.models.payment import Payment, PaymentAllocation, PaymentReceipt, Refund
from app.models.fee import FeeInvoice, FeeInstallment
from app.models.student import Student
from app.models.enrollment import StudentEnrollment
from app.models.standard import Standard
from app.models.division import Division
from app.models.board import Board
from app.models.user import User, AuditLog
from app.models.academic_year import AcademicYear
from app.models.settings import InstitutionSetting
from app.services.sequence import generate_next_receipt_number
from app.services.codex_service import CodeXService
from app.services.payment_gateway import (
    get_payment_gateway_config,
    update_payment_gateway_config,
    create_gateway_order,
    verify_and_post_gateway_payment,
)
from app.services.payment_workflow_service import (
    get_payment_workflow_settings,
    check_requires_erp_approval,
    execute_payment_posting,
    execute_payment_edit,
    log_payment_audit,
)
from pydantic import BaseModel, Field

router = APIRouter()

APPROVER_ROLES = {"superadmin", "sysadmin", "super_admin", "admin", "principal"}


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
    # Validate allocation total equals payment amount
    total_allocated = sum(a.amount for a in data.allocations)
    if abs(total_allocated - data.amount) > Decimal("0.01"):
        raise HTTPException(
            status_code=400,
            detail=f"Total allocation ({total_allocated}) must equal payment amount ({data.amount})",
        )

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
    if payment.student:
        check_institution_access(payment.student.institution_id, current_user)
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
# 3. APPROVE SUBMITTED PAYMENT (Standard ERP Mode)
# ─────────────────────────────────────────────────────────────────────────────
@router.post("/{payment_id}/approve")
async def approve_payment(
    payment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("superadmin", "admin", "principal")),
):
    """Approves a submitted payment under Standard ERP workflow rules."""
    result = await db.execute(select(Payment).options(selectinload(Payment.student)).where(Payment.id == payment_id))
    payment = result.scalar_one_or_none()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    if payment.student:
        check_institution_access(payment.student.institution_id, current_user)
    if payment.status != "submitted":
        raise HTTPException(status_code=400, detail=f"Cannot approve payment in '{payment.status}' state")

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
    if payment.student:
        check_institution_access(payment.student.institution_id, current_user)

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
    if payment.student:
        check_institution_access(payment.student.institution_id, current_user)

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
    current_user=Depends(get_current_active_user),
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
    pay_res = await db.execute(
        select(Payment).options(selectinload(Payment.allocations), selectinload(Payment.student)).where(Payment.id == payment_id)
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

    now = datetime.now(timezone.utc)
    refund = Refund(
        institution_id=effective_inst_id,
        student_id=payment.student_id,
        payment_id=payment.id,
        invoice_id=payment.allocations[0].invoice_id if payment.allocations else None,
        amount=data.amount,
        refund_date=date.today(),
        refund_method=data.refund_method,
        reference_number=data.reference_number,
        reason=data.reason,
        notes=data.notes,
        status=initial_status,
        requested_by_id=current_user.id,
        processed_by_id=current_user.id if initial_status == "completed" else None,
        approved_by_id=current_user.id if initial_status == "completed" else None,
        approved_at=now if initial_status == "completed" else None,
    )
    db.add(refund)
    await db.flush()

    await log_payment_audit(
        db,
        user_id=current_user.id,
        action=f"refund_{initial_status}",
        payment_id=payment.id,
        old_data=None,
        new_data={"refund_id": refund.id, "amount": float(data.amount), "status": initial_status},
        reason=f"Refund of ₹{data.amount} for payment {payment.id}: {data.reason}",
    )

    await db.commit()

    return {
        "refund_id": refund.id,
        "payment_id": payment.id,
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
    """Approves a requested refund."""
    result = await db.execute(select(Refund).where(Refund.id == refund_id))
    refund = result.scalar_one_or_none()
    if not refund:
        raise HTTPException(status_code=404, detail="Refund record not found")
    check_institution_access(refund.institution_id, current_user)
    if refund.status != "requested":
        raise HTTPException(status_code=400, detail=f"Cannot approve refund in '{refund.status}' state")

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
    result = await db.execute(select(Refund).where(Refund.id == refund_id))
    refund = result.scalar_one_or_none()
    if not refund:
        raise HTTPException(status_code=404, detail="Refund record not found")
    check_institution_access(refund.institution_id, current_user)
    if refund.status not in ("requested", "approved"):
        raise HTTPException(status_code=400, detail=f"Cannot process refund in '{refund.status}' state")

    refund.status = "completed"
    refund.processed_by_id = current_user.id

    await log_payment_audit(
        db,
        user_id=current_user.id,
        action="refund_processed",
        payment_id=refund.payment_id or 0,
        old_data={"status": refund.status},
        new_data={"status": "completed", "refund_id": refund.id},
        reason=f"Refund #{refund.id} marked as disbursed",
    )

    await db.commit()
    return {"message": "Refund disbursed and completed successfully", "refund_id": refund.id, "status": "completed"}


@router.get("/refunds/")
async def list_refunds(
    student_id: Optional[int] = None,
    payment_id: Optional[int] = None,
    status: Optional[str] = None,
    institution_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
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
    current_user=Depends(get_current_active_user),
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
    if payment.student:
        check_institution_access(payment.student.institution_id, current_user)
    
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
    )
    payment = result.scalar_one_or_none()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    if payment.student:
        check_institution_access(payment.student.institution_id, current_user)
    if payment.status == "reversed":
        raise HTTPException(status_code=400, detail="Payment already reversed")

    # Only posted/completed payments affected ledger balances
    if payment.status in ("posted", "completed"):
        for alloc in payment.allocations:
            inv_result = await db.execute(
                select(FeeInvoice).where(FeeInvoice.id == alloc.invoice_id)
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
                    )
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
    total_fee_amount = Decimal(str(receipt_data.get("total_fees") or payment.amount))

    if target_invoice_id:
        inv_res = await db.execute(
            select(FeeInvoice).where(FeeInvoice.id == target_invoice_id)
        )
        invoice = inv_res.scalar_one_or_none()
        if invoice:
            total_fee_amount = invoice.total_amount

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

    current_payment_amount = Decimal(str(payment.amount))
    if payment.status in ("posted", "completed"):
        total_paid_to_date = previous_payments_total + current_payment_amount
    else:
        total_paid_to_date = previous_payments_total

    outstanding_balance = max(Decimal("0.00"), total_fee_amount - total_paid_to_date)

    student = payment.student
    student_name = receipt_data.get("student_name") or (f"{student.first_name} {student.last_name}" if student else "")
    admission_number = receipt_data.get("admission_number") or (student.admission_number if student else "")

    standard_name = receipt_data.get("standard")
    division_name = receipt_data.get("batch") or receipt_data.get("division")
    if not standard_name or not division_name:
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

    res_payload = {
        "receipt_number": receipt.receipt_number,
        "payment_id": payment.id,
        "academic_year": academic_year_name or "2026 – 27",
        "academic_year_id": payment.academic_year_id,
        "student_id": payment.student_id,
        "student_name": student_name,
        "admission_number": admission_number,
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
        # Backward compatibility aliases
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
            numeric_fields=["amount", "total_fees", "total_paid", "outstanding_after", "previous_paid"],
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

    if receipt.payment and receipt.payment.student:
        check_institution_access(receipt.payment.student.institution_id, current_user)
    elif receipt.student_id:
        std = await db.get(Student, receipt.student_id)
        if std:
            check_institution_access(std.institution_id, current_user)

    return await build_receipt_response(db, receipt, current_user=current_user)

# ─────────────────────────────────────────────────────────────────────────────
# ONLINE PAYMENT GATEWAY & UPI ENDPOINTS (Razorpay / UPI)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/online/config")
async def get_online_gateway_config_endpoint(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """Fetches public payment gateway configuration for Razorpay and UPI checkout."""
    inst_id = getattr(current_user, "institution_id", 1) or 1
    config = await get_payment_gateway_config(db, inst_id)
    # Mask secret key for safety
    secret = config.get("razorpay_key_secret", "")
    masked_secret = f"{secret[:4]}••••••••{secret[-4:]}" if len(secret) > 8 else "••••••••"
    safe_config = dict(config)
    safe_config["razorpay_key_secret_masked"] = masked_secret
    safe_config.pop("razorpay_key_secret", None)
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
    inst_id = getattr(current_user, "institution_id", 1) or 1
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
    inst_id = getattr(current_user, "institution_id", 1) or 1
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
    )
    return result


@router.post("/online/webhook")
async def online_payment_webhook_endpoint(
    event: Dict[str, Any],
    db: AsyncSession = Depends(get_db),
):
    """
    Server-to-server webhook callback receiver for asynchronous Razorpay events
    (e.g., payment.captured, order.paid).
    """
    event_type = event.get("event", "")
    payload_data = event.get("payload", {})
    payment_entity = payload_data.get("payment", {}).get("entity", {})
    order_id = payment_entity.get("order_id")
    payment_id = payment_entity.get("id")
    amount_in_paise = payment_entity.get("amount", 0)

    return {
        "status": "received",
        "event": event_type,
        "payment_id": payment_id,
        "order_id": order_id,
        "amount": amount_in_paise / 100 if amount_in_paise else 0,
    }

