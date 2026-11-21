# /**
#  * @file        payment_workflow_service.py
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
#  * @created     2026-11-05
#  * @updated     2026-11-21
#  *
#  * @description Service managing payment lifecycle states, ERP approval rules, audited modifications, receipt versioning, and refunds.
#  */

import json
from datetime import datetime, timezone, date
from decimal import Decimal
from typing import Optional, List, Dict, Any
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from fastapi import HTTPException

from app.models.payment import (
    Payment,
    PaymentAllocation,
    PaymentReceipt,
    Refund,
    RefundAllocation,
)
from app.models.fee import FeeInvoice, FeeInstallment
from app.models.student import Student
from app.models.settings import InstitutionSetting
from app.models.user import User, AuditLog
from app.services.sequence import generate_next_receipt_number
from app.services.auto_task_service import resolve_automated_tasks


DEFAULT_WORKFLOW_SETTINGS = {
    "workflow_mode": "simple",  # "simple" or "standard_erp"
    "approval_amount_threshold": Decimal("25000.00"),
    "approval_roles": ["admin", "principal", "sysadmin", "superadmin"],
    "require_approval_methods": ["cheque", "bank_transfer", "demand_draft"],
    "allow_posted_payment_edits": True,
    "refund_approval_required": True,
    "refund_approval_threshold": Decimal("10000.00"),
}


async def get_payment_workflow_settings(
    db: AsyncSession, institution_id: int = 1
) -> Dict[str, Any]:
    """Retrieves authoritative payment workflow configuration for an institution."""
    stmt = select(InstitutionSetting).where(
        and_(
            InstitutionSetting.institution_id == institution_id,
            InstitutionSetting.category.in_(["fees", "payment_workflow"]),
        )
    )
    rows = (await db.execute(stmt)).scalars().all()

    config = dict(DEFAULT_WORKFLOW_SETTINGS)
    for r in rows:
        val = r.value
        if not val:
            continue
        if r.key in ("payment_workflow_mode", "workflow_mode"):
            mode_val = val.strip().lower()
            config["workflow_mode"] = "standard_erp" if mode_val in ("erp", "standard_erp") else "simple"
        elif r.key in ("erp_approval_amount_threshold", "approval_threshold"):
            try:
                config["approval_amount_threshold"] = Decimal(val.strip())
            except Exception:
                pass
        elif r.key == "erp_approval_roles":
            try:
                config["approval_roles"] = json.loads(val)
            except Exception:
                pass
        elif r.key in ("erp_require_approval_methods", "require_approval_methods"):
            try:
                config["require_approval_methods"] = json.loads(val)
            except Exception:
                pass
        elif r.key == "require_cheque_approval":
            is_req = val.strip().lower() in ("true", "1", "yes")
            curr_methods = list(config.get("require_approval_methods") or ["cheque", "bank_transfer", "demand_draft"])
            if is_req and "cheque" not in curr_methods:
                curr_methods.append("cheque")
            elif not is_req and "cheque" in curr_methods:
                curr_methods = [m for m in curr_methods if m != "cheque"]
            config["require_approval_methods"] = curr_methods
        elif r.key == "allow_posted_payment_edits":
            config["allow_posted_payment_edits"] = val.strip().lower() in ("true", "1", "yes")
        elif r.key == "refund_approval_required":
            config["refund_approval_required"] = val.strip().lower() in ("true", "1", "yes")
        elif r.key == "refund_approval_threshold":
            try:
                config["refund_approval_threshold"] = Decimal(val.strip())
            except Exception:
                pass

    return config


def check_requires_erp_approval(
    settings: Dict[str, Any],
    amount: Decimal,
    payment_method: str,
    user_role: str,
) -> bool:
    """Evaluates whether a transaction requires approval under Standard ERP mode."""
    if settings.get("workflow_mode") != "standard_erp":
        return False

    # Check amount threshold
    threshold = settings.get("approval_amount_threshold", Decimal("25000.00"))
    if amount >= threshold:
        return True

    # Check payment method
    req_methods = [m.lower() for m in settings.get("require_approval_methods", [])]
    if payment_method.lower() in req_methods:
        return True

    return False


async def check_financial_period_open(
    db: AsyncSession,
    institution_id: int,
    tx_date: date,
) -> None:
    """Verifies that transaction date is not within a locked financial accounting period."""
    from app.models.payment import FinancialPeriod
    stmt = select(FinancialPeriod).where(
        and_(
            FinancialPeriod.institution_id == institution_id,
            FinancialPeriod.is_closed == True,
            FinancialPeriod.start_date <= tx_date,
            FinancialPeriod.end_date >= tx_date,
        )
    )
    closed = (await db.execute(stmt)).scalar_one_or_none()
    if closed:
        raise HTTPException(
            status_code=400,
            detail=f"Financial period '{closed.name}' is closed. Modifications on {tx_date} are locked."
        )


async def execute_refund_disbursement(
    db: AsyncSession,
    refund: Refund,
    current_user_id: int,
) -> None:
    """
    Executes authoritative financial disbursement of an approved refund:
    1. Sets refund status to 'completed', stamped with processed_by_id.
    2. Synchronizes student FeeInvoice:
       - Decrements invoice.paid_amount by refund amount (minimum 0.00).
       - Increments invoice.outstanding_amount by refund amount (up to net_amount).
       - Recalculates invoice.status ('unpaid' or 'partial').
    3. Records immutable audit entry.
    """
    if refund.status not in ("requested", "approved"):
        raise HTTPException(status_code=400, detail=f"Cannot disburse refund in '{refund.status}' state")
    if refund.payment_id is None:
        raise HTTPException(
            status_code=409,
            detail="Refund has no originating payment and cannot be reconciled.",
        )
    await db.execute(
        select(Payment)
        .where(Payment.id == refund.payment_id)
        .with_for_update(of=Payment)
    )

    refund_allocations = (
        await db.execute(
            select(RefundAllocation)
            .where(RefundAllocation.refund_id == refund.id)
            .order_by(RefundAllocation.id)
            .with_for_update()
        )
    ).scalars().all()
    if not refund_allocations:
        raise HTTPException(
            status_code=409,
            detail=(
                "This refund has no persisted invoice allocation. Historical refund "
                "allocations are not inferred during disbursement."
            ),
        )
    if sum(
        (Decimal(str(allocation.amount)) for allocation in refund_allocations),
        Decimal("0.00"),
    ) != refund.amount:
        raise HTTPException(
            status_code=409,
            detail="Persisted refund allocations do not equal the refund amount.",
        )

    original_allocations: Dict[int, PaymentAllocation] = {}
    refund_by_payment_allocation: Dict[int, Decimal] = {}
    for refund_allocation in refund_allocations:
        original = (
            await db.execute(
                select(PaymentAllocation)
                .where(PaymentAllocation.id == refund_allocation.payment_allocation_id)
                .with_for_update()
            )
        ).scalar_one_or_none()
        if not original or original.payment_id != refund.payment_id:
            raise HTTPException(
                status_code=409,
                detail="Refund allocation does not reference an allocation from its original payment.",
            )
        original_allocations[original.id] = original
        refund_by_payment_allocation[original.id] = (
            refund_by_payment_allocation.get(original.id, Decimal("0.00"))
            + Decimal(str(refund_allocation.amount))
        )

    invoice_amounts: Dict[int, Decimal] = {}
    installment_amounts: Dict[int, Decimal] = {}
    invoice_snapshots: Dict[int, FeeInvoice] = {}
    installment_snapshots: Dict[int, FeeInstallment] = {}
    for allocation_id, amount in refund_by_payment_allocation.items():
        original = original_allocations[allocation_id]
        reserved_total = (
            await db.execute(
                select(func.coalesce(func.sum(RefundAllocation.amount), 0))
                .join(Refund, RefundAllocation.refund_id == Refund.id)
                .where(
                    Refund.payment_id == refund.payment_id,
                    Refund.status.in_(["requested", "approved", "completed"]),
                    RefundAllocation.payment_allocation_id == allocation_id,
                )
            )
        ).scalar_one()
        if Decimal(str(reserved_total or 0)) > original.allocated_amount:
            raise HTTPException(
                status_code=409,
                detail="Active refunds exceed the original payment allocation.",
            )
        invoice_amounts[original.invoice_id] = (
            invoice_amounts.get(original.invoice_id, Decimal("0.00")) + amount
        )
        if original.installment_id is not None:
            installment_amounts[original.installment_id] = (
                installment_amounts.get(
                    original.installment_id, Decimal("0.00")
                )
                + amount
            )

    for invoice_id, amount in invoice_amounts.items():
        invoice = (
            await db.execute(
                select(FeeInvoice)
                .where(FeeInvoice.id == invoice_id)
                .with_for_update(of=FeeInvoice)
            )
        ).scalar_one_or_none()
        if not invoice or invoice.paid_amount < amount:
            raise HTTPException(
                status_code=409,
                detail=f"Refund cannot be reconciled against invoice {invoice_id}'s paid balance.",
            )
        invoice_snapshots[invoice_id] = invoice

    for installment_id, amount in installment_amounts.items():
        installment = (
            await db.execute(
                select(FeeInstallment)
                .where(FeeInstallment.id == installment_id)
                .with_for_update()
            )
        ).scalar_one_or_none()
        if not installment or installment.paid_amount < amount:
            raise HTTPException(
                status_code=409,
                detail=f"Refund cannot be reconciled against installment {installment_id}'s paid balance.",
            )
        installment_snapshots[installment_id] = installment

    for invoice_id, amount in invoice_amounts.items():
        invoice = invoice_snapshots[invoice_id]
        invoice.paid_amount -= amount
        invoice.outstanding_amount = min(
            invoice.net_amount, invoice.outstanding_amount + amount
        )
        if invoice.status not in ("cancelled", "written_off"):
            invoice.status = (
                "unpaid"
                if invoice.paid_amount == Decimal("0.00")
                else "partial"
            )

    for installment_id, amount in installment_amounts.items():
        installment = installment_snapshots[installment_id]
        installment.paid_amount -= amount
        installment.outstanding_amount = min(
            installment.amount, installment.outstanding_amount + amount
        )
        installment.status = (
            "unpaid"
            if installment.paid_amount == Decimal("0.00")
            else "partial"
        )

    now = datetime.now(timezone.utc)
    refund.status = "completed"
    refund.processed_by_id = current_user_id
    refund.updated_at = now

    await log_payment_audit(
        db,
        user_id=current_user_id,
        action="refund_disbursed_and_reconciled",
        payment_id=refund.payment_id or 0,
        old_data={"refund_status": "approved"},
        new_data={
            "refund_id": refund.id,
            "refund_amount": float(refund.amount),
            "invoice_balances": {
                str(invoice_id): {
                    "paid": float(invoice.paid_amount),
                    "outstanding": float(invoice.outstanding_amount),
                }
                for invoice_id, invoice in invoice_snapshots.items()
            },
            "installment_balances": {
                str(installment_id): {
                    "paid": float(installment.paid_amount),
                    "outstanding": float(installment.outstanding_amount),
                }
                for installment_id, installment in installment_snapshots.items()
            },
        },
        reason=f"Refund #{refund.id} disbursed; invoice receivable ledger synchronized",
    )


async def log_payment_audit(
    db: AsyncSession,
    user_id: Optional[int],
    action: str,
    payment_id: int,
    old_data: Optional[Dict[str, Any]],
    new_data: Optional[Dict[str, Any]],
    reason: str,
    severity: str = "info",
) -> None:
    """Records an immutable, audited entry in audit_logs for payment modifications."""
    audit_entry = AuditLog(
        user_id=user_id,
        action=action,
        resource_type="payment",
        resource_id=payment_id,
        old_data=json.dumps(old_data, default=str) if old_data else None,
        new_data=json.dumps(new_data, default=str) if new_data else None,
        details=reason,
        severity=severity,
        is_system_audit=False,
    )
    db.add(audit_entry)


async def execute_payment_posting(
    db: AsyncSession,
    payment: Payment,
    current_user_id: int,
    effective_institution_id: int = 1,
) -> PaymentReceipt:
    """
    Executes authoritative financial posting of an approved or submitted payment:
    1. Deducts amounts from student fee invoices and installments.
    2. Assigns sequential receipt number with PostgreSQL row concurrency lock.
    3. Issues PaymentReceipt record (version 1, valid).
    4. Updates payment status to 'posted'.
    """
    if payment.status in ("posted", "completed"):
        raise HTTPException(status_code=400, detail="Payment is already posted")

    await check_financial_period_open(db, effective_institution_id, payment.payment_date)

    # Load payment allocations
    alloc_res = await db.execute(
        select(PaymentAllocation).where(PaymentAllocation.payment_id == payment.id)
    )
    allocations = alloc_res.scalars().all()
    allocations_by_invoice: Dict[int, List[PaymentAllocation]] = {}
    for allocation in allocations:
        allocations_by_invoice.setdefault(allocation.invoice_id, []).append(allocation)

    for invoice_id, invoice_allocations_for_invoice in allocations_by_invoice.items():
        invoice_wide = [
            allocation
            for allocation in invoice_allocations_for_invoice
            if allocation.installment_id is None
        ]
        if not invoice_wide:
            continue
        invoice = (
            await db.execute(
                select(FeeInvoice)
                .where(FeeInvoice.id == invoice_id)
                .with_for_update(of=FeeInvoice)
            )
        ).scalar_one_or_none()
        if not invoice:
            raise HTTPException(status_code=404, detail=f"Invoice {invoice_id} not found")
        scheduled_installments = (
            await db.execute(
                select(FeeInstallment)
                .where(FeeInstallment.invoice_id == invoice_id)
                .order_by(FeeInstallment.due_date, FeeInstallment.installment_number)
                .with_for_update()
            )
        ).scalars().all()
        if not scheduled_installments:
            continue

        explicit_totals: Dict[int, Decimal] = {}
        for allocation in invoice_allocations_for_invoice:
            if allocation.installment_id is not None:
                explicit_totals[allocation.installment_id] = (
                    explicit_totals.get(
                        allocation.installment_id, Decimal("0.00")
                    )
                    + allocation.allocated_amount
                )
        available = []
        for installment in scheduled_installments:
            remaining = (
                Decimal(str(installment.outstanding_amount))
                - explicit_totals.get(installment.id, Decimal("0.00"))
            )
            if remaining > 0:
                available.append((installment, remaining))
        invoice_wide_amount = sum(
            (allocation.allocated_amount for allocation in invoice_wide),
            Decimal("0.00"),
        )
        if invoice_wide_amount <= 0:
            raise HTTPException(
                status_code=400,
                detail="Payment allocations must be positive currency amounts.",
            )
        if invoice_wide_amount > sum(
            (amount for _, amount in available), Decimal("0.00")
        ):
            raise HTTPException(
                status_code=400,
                detail="Invoice-wide payment exceeds the remaining scheduled installment balances.",
            )

        remaining_to_allocate = invoice_wide_amount
        splits = []
        for installment, available_amount in available:
            if remaining_to_allocate <= 0:
                break
            amount = min(remaining_to_allocate, available_amount)
            splits.append((installment, amount))
            remaining_to_allocate -= amount

        source_allocation = invoice_wide[0]
        source_allocation.installment_id = splits[0][0].id
        source_allocation.allocated_amount = splits[0][1]
        normalized_allocations = []
        for installment, amount in splits[1:]:
            normalized_allocations.append(
                PaymentAllocation(
                    payment_id=payment.id,
                    invoice_id=invoice_id,
                    installment_id=installment.id,
                    allocated_amount=amount,
                )
            )
        db.add_all(normalized_allocations)
        for redundant_allocation in invoice_wide[1:]:
            await db.delete(redundant_allocation)
        allocations = [
            allocation
            for allocation in allocations
            if allocation not in invoice_wide[1:]
        ]
        await db.flush()
        allocations.extend(normalized_allocations)

    if sum((a.allocated_amount for a in allocations), Decimal("0.00")) != payment.amount:
        raise HTTPException(
            status_code=400,
            detail="Payment allocations must equal the payment amount before posting.",
        )

    invoice_allocations: Dict[int, Decimal] = {}
    installment_allocations: Dict[int, Decimal] = {}
    invoices: Dict[int, FeeInvoice] = {}
    installments: Dict[int, FeeInstallment] = {}
    for alloc in allocations:
        if alloc.allocated_amount <= 0 or alloc.allocated_amount != alloc.allocated_amount.quantize(Decimal("0.01")):
            raise HTTPException(status_code=400, detail="Payment allocations must be positive currency amounts.")
        invoice = invoices.get(alloc.invoice_id)
        if invoice is None:
            inv_res = await db.execute(
                select(FeeInvoice)
                .where(FeeInvoice.id == alloc.invoice_id)
                .with_for_update(of=FeeInvoice)
            )
            invoice = inv_res.scalar_one_or_none()
        if not invoice:
            raise HTTPException(status_code=404, detail=f"Invoice {alloc.invoice_id} not found")
        invoices[alloc.invoice_id] = invoice
        if invoice.student_id != payment.student_id:
            raise HTTPException(status_code=400, detail="Payment allocation invoice belongs to another student.")
        if invoice.status in ("cancelled", "written_off"):
            raise HTTPException(status_code=400, detail=f"Invoice {invoice.invoice_number} is not payable.")
        invoice_allocations[alloc.invoice_id] = (
            invoice_allocations.get(alloc.invoice_id, Decimal("0.00"))
            + alloc.allocated_amount
        )

        if alloc.installment_id:
            installment = installments.get(alloc.installment_id)
            if installment is None:
                inst_res = await db.execute(
                    select(FeeInstallment)
                    .where(FeeInstallment.id == alloc.installment_id)
                    .with_for_update()
                )
                installment = inst_res.scalar_one_or_none()
            if not installment or installment.invoice_id != alloc.invoice_id:
                raise HTTPException(
                    status_code=400,
                    detail=f"Installment {alloc.installment_id} does not belong to invoice {alloc.invoice_id}.",
                )
            installments[alloc.installment_id] = installment
            installment_allocations[alloc.installment_id] = (
                installment_allocations.get(alloc.installment_id, Decimal("0.00"))
                + alloc.allocated_amount
            )

    for invoice_id, amount in invoice_allocations.items():
        invoice = invoices[invoice_id]
        if amount > invoice.outstanding_amount:
            raise HTTPException(
                status_code=400,
                detail=f"Allocation exceeds current invoice balance ({invoice.outstanding_amount}).",
            )
        schedule_res = await db.execute(
            select(FeeInstallment.id)
            .where(FeeInstallment.invoice_id == invoice_id)
            .with_for_update()
        )
        scheduled_ids = set(schedule_res.scalars().all())
        has_invoice_wide_allocation = any(
            alloc.invoice_id == invoice_id and alloc.installment_id is None
            for alloc in allocations
        )
        if scheduled_ids and has_invoice_wide_allocation:
            raise HTTPException(
                status_code=400,
                detail="Scheduled invoices require payment allocations linked to installments.",
            )

    for installment_id, amount in installment_allocations.items():
        installment = installments[installment_id]
        if amount > installment.outstanding_amount:
            raise HTTPException(
                status_code=400,
                detail=f"Allocation exceeds current installment balance ({installment.outstanding_amount}).",
            )

    for invoice_id, amount in invoice_allocations.items():
        invoice = invoices[invoice_id]
        invoice.paid_amount += amount
        invoice.outstanding_amount = max(
            Decimal("0.00"), invoice.outstanding_amount - amount
        )
        if invoice.outstanding_amount == Decimal("0.00"):
            invoice.status = "paid"
            # Auto-resolve fee collection tasks to eliminate ghost tasks
            await resolve_automated_tasks(
                db=db,
                institution_id=effective_institution_id,
                source_type="fee_invoice",
                source_record_id=invoice.id,
                resolution_status="completed",
                actor_id=current_user_id,
            )
        elif invoice.paid_amount > Decimal("0.00"):
            invoice.status = "partial"

    for installment_id, amount in installment_allocations.items():
        installment = installments[installment_id]
        installment.paid_amount += amount
        installment.outstanding_amount = max(
            Decimal("0.00"), installment.outstanding_amount - amount
        )
        if installment.outstanding_amount == Decimal("0.00"):
            installment.status = "paid"
        elif installment.paid_amount > Decimal("0.00"):
            installment.status = "partial"

    # Generate sequential receipt number conforming to institute rules
    receipt_number = await generate_next_receipt_number(
        db,
        institution_id=effective_institution_id,
        academic_year_id=payment.academic_year_id,
    )

    # Fetch student demographic for receipt snapshot
    student_res = await db.execute(
        select(Student).where(Student.id == payment.student_id)
    )
    student = student_res.scalar_one_or_none()

    receipt_meta = {
        "receipt_number": receipt_number,
        "payment_id": payment.id,
        "student_name": f"{student.first_name} {student.last_name}" if student else "",
        "admission_number": student.admission_number if student else "",
        "amount": float(payment.amount),
        "payment_date": str(payment.payment_date),
        "payment_method": payment.payment_method,
        "transaction_reference": payment.transaction_reference,
        "bank_name": payment.bank_name,
        "cheque_number": payment.cheque_number,
        "notes": payment.notes,
        "status": "valid",
        "version": 1,
        "allocations": [
            {"invoice_id": a.invoice_id, "installment_id": a.installment_id, "amount": float(a.allocated_amount)}
            for a in allocations
        ],
    }

    receipt = PaymentReceipt(
        receipt_number=receipt_number,
        payment_id=payment.id,
        student_id=payment.student_id,
        amount=payment.amount,
        payment_date=payment.payment_date,
        payment_method=payment.payment_method,
        receipt_data=json.dumps(receipt_meta),
        version=1,
        status="valid",
        reprint_count=0,
    )
    db.add(receipt)

    # Mark payment as posted
    now = datetime.now(timezone.utc)
    payment.status = "posted"
    payment.posted_at = now
    payment.posted_by_id = current_user_id

    return receipt


async def execute_payment_edit(
    db: AsyncSession,
    payment: Payment,
    update_data: Dict[str, Any],
    reason: str,
    current_user: User,
    effective_institution_id: int = 1,
) -> Dict[str, Any]:
    await check_financial_period_open(db, effective_institution_id, payment.payment_date)
    """
    Executes audited edit on a draft, submitted, or posted payment.
    - Draft: edits freely without audit requirement.
    - Submitted: edits with audit log diff.
    - Posted:
        * Minor edit (notes, bank, ref): keeps receipt number, stamps amendment.
        * Financial/Method edit (amount, method, allocations):
          reverts old allocations, applies new allocations, marks old receipt
          as SUPERSEDED, and issues new sequential receipt.
    """
    old_snapshot = {
        "amount": float(payment.amount),
        "payment_date": str(payment.payment_date),
        "payment_method": payment.payment_method,
        "transaction_reference": payment.transaction_reference,
        "bank_name": payment.bank_name,
        "cheque_number": payment.cheque_number,
        "cheque_date": str(payment.cheque_date) if payment.cheque_date else None,
        "notes": payment.notes,
        "status": payment.status,
    }

    now = datetime.now(timezone.utc)

    # ─── CASE 1: DRAFT PAYMENT ────────────────────────────────────────────────
    if payment.status == "draft":
        for field in ("payment_date", "payment_method", "transaction_reference", "bank_name", "cheque_number", "cheque_date", "notes"):
            if field in update_data and update_data[field] is not None:
                setattr(payment, field, update_data[field])

        if "amount" in update_data and update_data["amount"] is not None:
            payment.amount = Decimal(str(update_data["amount"]))

        if "allocations" in update_data and update_data["allocations"] is not None:
            # Recreate allocations
            await db.execute(
                PaymentAllocation.__table__.delete().where(PaymentAllocation.payment_id == payment.id)
            )
            for alloc in update_data["allocations"]:
                db.add(PaymentAllocation(
                    payment_id=payment.id,
                    invoice_id=alloc["invoice_id"],
                    installment_id=alloc.get("installment_id"),
                    allocated_amount=Decimal(str(alloc["amount"])),
                ))

        payment.last_edited_at = now
        payment.last_edited_by_id = current_user.id
        payment.edit_count += 1
        return {"message": "Draft payment updated successfully", "payment_id": payment.id, "status": "draft"}

    # ─── CASE 2: SUBMITTED PAYMENT ────────────────────────────────────────────
    if payment.status in ("submitted", "approved"):
        if not reason or not reason.strip():
            raise HTTPException(status_code=400, detail="Audit reason is required when modifying a submitted payment")

        for field in ("payment_date", "payment_method", "transaction_reference", "bank_name", "cheque_number", "cheque_date", "notes"):
            if field in update_data and update_data[field] is not None:
                setattr(payment, field, update_data[field])

        if "amount" in update_data and update_data["amount"] is not None:
            payment.amount = Decimal(str(update_data["amount"]))

        if "allocations" in update_data and update_data["allocations"] is not None:
            await db.execute(
                PaymentAllocation.__table__.delete().where(PaymentAllocation.payment_id == payment.id)
            )
            for alloc in update_data["allocations"]:
                db.add(PaymentAllocation(
                    payment_id=payment.id,
                    invoice_id=alloc["invoice_id"],
                    installment_id=alloc.get("installment_id"),
                    allocated_amount=Decimal(str(alloc["amount"])),
                ))

        payment.last_edited_at = now
        payment.last_edited_by_id = current_user.id
        payment.edit_count += 1

        new_snapshot = {
            "amount": float(payment.amount),
            "payment_date": str(payment.payment_date),
            "payment_method": payment.payment_method,
            "transaction_reference": payment.transaction_reference,
            "notes": payment.notes,
            "status": payment.status,
        }

        await log_payment_audit(
            db,
            user_id=current_user.id,
            action="payment_edit_submitted",
            payment_id=payment.id,
            old_data=old_snapshot,
            new_data=new_snapshot,
            reason=reason.strip(),
        )

        return {"message": "Submitted payment updated with audit tracking", "payment_id": payment.id, "status": payment.status}

    # ─── CASE 3: POSTED / COMPLETED PAYMENT ───────────────────────────────────
    if payment.status in ("posted", "completed"):
        if not reason or not reason.strip():
            raise HTTPException(status_code=400, detail="Audit reason is strictly required when modifying a posted payment")

        # Determine whether financial or payment-method fields changed
        amount_changed = (
            "amount" in update_data
            and update_data["amount"] is not None
            and Decimal(str(update_data["amount"])) != payment.amount
        )
        method_changed = (
            "payment_method" in update_data
            and update_data["payment_method"] is not None
            and update_data["payment_method"] != payment.payment_method
        )
        allocations_changed = "allocations" in update_data and update_data["allocations"] is not None

        if amount_changed or method_changed or allocations_changed:
            has_refund_allocations = (
                await db.execute(
                    select(RefundAllocation.id)
                    .join(
                        PaymentAllocation,
                        RefundAllocation.payment_allocation_id == PaymentAllocation.id,
                    )
                    .where(PaymentAllocation.payment_id == payment.id)
                    .limit(1)
                )
            ).scalar_one_or_none()
            if has_refund_allocations is not None:
                raise HTTPException(
                    status_code=409,
                    detail=(
                        "A payment with refund allocation history cannot be financially "
                        "edited because its original allocation records are immutable."
                    ),
                )

        # Fetch current valid receipt
        curr_receipt = None
        if "receipts" in payment.__dict__ and payment.receipts:
            for r in payment.receipts:
                if r.status == "valid":
                    curr_receipt = r
                    break
        if not curr_receipt:
            rec_res = await db.execute(
                select(PaymentReceipt).where(
                    and_(PaymentReceipt.payment_id == payment.id, PaymentReceipt.status == "valid")
                )
            )
            curr_receipt = rec_res.scalar_one_or_none()

        old_receipt_num = curr_receipt.receipt_number if curr_receipt else None

        # Subcase 3A: Minor corrections (retains receipt number)
        if not (amount_changed or method_changed or allocations_changed):
            for field in ("payment_date", "transaction_reference", "bank_name", "cheque_number", "cheque_date", "notes"):
                if field in update_data and update_data[field] is not None:
                    setattr(payment, field, update_data[field])

            payment.last_edited_at = now
            payment.last_edited_by_id = current_user.id
            payment.edit_count += 1

            # Append amendment metadata to receipt
            if curr_receipt:
                rdata = json.loads(curr_receipt.receipt_data) if curr_receipt.receipt_data else {}
                amendments = rdata.get("amendments", [])
                amendments.append({
                    "amended_at": now.isoformat(),
                    "amended_by": current_user.username,
                    "reason": reason.strip(),
                })
                rdata["amendments"] = amendments
                curr_receipt.receipt_data = json.dumps(rdata)

            new_snapshot = {
                "payment_date": str(payment.payment_date),
                "transaction_reference": payment.transaction_reference,
                "notes": payment.notes,
                "receipt_number": old_receipt_num,
            }

            await log_payment_audit(
                db,
                user_id=current_user.id,
                action="payment_edit_posted_minor",
                payment_id=payment.id,
                old_data=old_snapshot,
                new_data=new_snapshot,
                reason=reason.strip(),
            )

            return {
                "message": "Minor payment correction saved; receipt number retained",
                "payment_id": payment.id,
                "receipt_number": old_receipt_num,
                "status": payment.status,
                "is_superseded": False,
            }

        # Subcase 3B: Financial / Method correction (regenerate receipt & supersede old)
        # 1. Revert previous allocations on invoices & installments
        old_allocs_res = await db.execute(
            select(PaymentAllocation).where(PaymentAllocation.payment_id == payment.id)
        )
        old_allocs = old_allocs_res.scalars().all()

        for old_a in old_allocs:
            inv_res = await db.execute(
                select(FeeInvoice).where(FeeInvoice.id == old_a.invoice_id)
            )
            inv = inv_res.scalar_one_or_none()
            if inv:
                inv.paid_amount = max(Decimal("0.00"), inv.paid_amount - old_a.allocated_amount)
                inv.outstanding_amount = max(Decimal("0.00"), inv.net_amount - inv.paid_amount)
                inv.status = "unpaid" if inv.paid_amount <= Decimal("0.00") else "partial"

            if old_a.installment_id:
                inst_res = await db.execute(
                    select(FeeInstallment).where(FeeInstallment.id == old_a.installment_id)
                )
                inst = inst_res.scalar_one_or_none()
                if inst:
                    inst.paid_amount = max(Decimal("0.00"), inst.paid_amount - old_a.allocated_amount)
                    inst.outstanding_amount = min(
                        inst.amount, inst.outstanding_amount + old_a.allocated_amount
                    )
                    inst.status = "unpaid" if inst.paid_amount <= Decimal("0.00") else "partial"

        # 2. Update payment attributes
        new_amount = Decimal(str(update_data["amount"])) if amount_changed else payment.amount
        payment.amount = new_amount

        for field in ("payment_date", "payment_method", "transaction_reference", "bank_name", "cheque_number", "cheque_date", "notes"):
            if field in update_data and update_data[field] is not None:
                setattr(payment, field, update_data[field])

        payment.last_edited_at = now
        payment.last_edited_by_id = current_user.id
        payment.edit_count += 1

        # 3. Apply new allocations
        await db.execute(
            PaymentAllocation.__table__.delete().where(PaymentAllocation.payment_id == payment.id)
        )

        new_allocs_input = update_data.get("allocations")
        if not new_allocs_input:
            # If no manual allocations provided, auto-rebalance against existing allocations or active invoice
            if len(old_allocs) == 1:
                # Single invoice allocation: update allocation amount to match new payment amount exactly
                new_allocs_input = [{
                    "invoice_id": old_allocs[0].invoice_id,
                    "installment_id": old_allocs[0].installment_id,
                    "amount": float(new_amount),
                }]
            elif len(old_allocs) > 1:
                # Proportional scaling across existing allocations
                old_total_alloc = sum(a.allocated_amount for a in old_allocs)
                if old_total_alloc > 0:
                    ratio = new_amount / old_total_alloc
                    new_allocs_input = [
                        {
                            "invoice_id": a.invoice_id,
                            "installment_id": a.installment_id,
                            "amount": float(round(a.allocated_amount * ratio, 2)),
                        }
                        for a in old_allocs
                    ]
                    # Adjust rounding difference on the last allocation
                    allocated_so_far = sum(Decimal(str(x["amount"])) for x in new_allocs_input[:-1])
                    new_allocs_input[-1]["amount"] = float(new_amount - allocated_so_far)
                else:
                    new_allocs_input = [
                        {"invoice_id": a.invoice_id, "installment_id": a.installment_id, "amount": float(a.allocated_amount)}
                        for a in old_allocs
                    ]
            else:
                # No old allocations: find student's active invoice
                act_inv_res = await db.execute(
                    select(FeeInvoice).where(
                        FeeInvoice.student_id == payment.student_id,
                        FeeInvoice.status != "cancelled",
                    ).order_by(desc(FeeInvoice.id))
                )
                act_inv = act_inv_res.scalars().first()
                if act_inv:
                    new_allocs_input = [{
                        "invoice_id": act_inv.id,
                        "installment_id": None,
                        "amount": float(new_amount),
                    }]
                else:
                    new_allocs_input = []

        for alloc in new_allocs_input:
            alloc_amt = Decimal(str(alloc["amount"]))
            db.add(PaymentAllocation(
                payment_id=payment.id,
                invoice_id=alloc["invoice_id"],
                installment_id=alloc.get("installment_id"),
                allocated_amount=alloc_amt,
            ))

            inv_res = await db.execute(
                select(FeeInvoice).where(FeeInvoice.id == alloc["invoice_id"])
            )
            inv = inv_res.scalar_one_or_none()
            if inv:
                inv.paid_amount = inv.paid_amount + alloc_amt
                inv.outstanding_amount = max(Decimal("0.00"), inv.net_amount - inv.paid_amount)
                if inv.outstanding_amount <= Decimal("0.01"):
                    inv.status = "paid"
                elif inv.paid_amount > Decimal("0.00"):
                    inv.status = "partial"
                else:
                    inv.status = "unpaid"

            if alloc.get("installment_id"):
                inst_res = await db.execute(
                    select(FeeInstallment).where(FeeInstallment.id == alloc["installment_id"])
                )
                inst = inst_res.scalar_one_or_none()
                if inst:
                    inst.paid_amount = inst.paid_amount + alloc_amt
                    inst.outstanding_amount = max(
                        Decimal("0.00"), inst.outstanding_amount - alloc_amt
                    )
                    if inst.outstanding_amount == Decimal("0.00"):
                        inst.status = "paid"
                    elif inst.paid_amount > Decimal("0.00"):
                        inst.status = "partial"

        # 4. Generate new sequential receipt number
        new_receipt_number = await generate_next_receipt_number(
            db,
            institution_id=effective_institution_id,
            academic_year_id=payment.academic_year_id,
        )

        # 5. Mark previous receipt as superseded
        old_version = 1
        if curr_receipt:
            old_version = curr_receipt.version
            curr_receipt.status = "superseded"
            curr_receipt.superseded_at = now
            curr_receipt.superseded_by_receipt_number = new_receipt_number
            if curr_receipt.receipt_data:
                try:
                    rdata = json.loads(curr_receipt.receipt_data)
                    rdata["status"] = "superseded"
                    rdata["superseded_at"] = now.isoformat()
                    rdata["superseded_by"] = new_receipt_number
                    rdata["supersede_reason"] = reason.strip()
                    curr_receipt.receipt_data = json.dumps(rdata)
                except Exception:
                    pass

        # 6. Issue new receipt
        student_res = await db.execute(select(Student).where(Student.id == payment.student_id))
        student = student_res.scalar_one_or_none()

        new_receipt_meta = {
            "receipt_number": new_receipt_number,
            "previous_receipt_number": old_receipt_num,
            "payment_id": payment.id,
            "student_name": f"{student.first_name} {student.last_name}" if student else "",
            "admission_number": student.admission_number if student else "",
            "amount": float(payment.amount),
            "payment_date": str(payment.payment_date),
            "payment_method": payment.payment_method,
            "transaction_reference": payment.transaction_reference,
            "notes": payment.notes,
            "status": "valid",
            "version": old_version + 1,
            "supersedes": old_receipt_num,
            "supersede_reason": reason.strip(),
        }

        new_receipt = PaymentReceipt(
            receipt_number=new_receipt_number,
            payment_id=payment.id,
            student_id=payment.student_id,
            amount=payment.amount,
            payment_date=payment.payment_date,
            payment_method=payment.payment_method,
            receipt_data=json.dumps(new_receipt_meta),
            version=old_version + 1,
            status="valid",
            reprint_count=0,
        )
        db.add(new_receipt)

        new_snapshot = {
            "amount": float(payment.amount),
            "payment_method": payment.payment_method,
            "old_receipt_number": old_receipt_num,
            "new_receipt_number": new_receipt_number,
            "version": old_version + 1,
        }

        await log_payment_audit(
            db,
            user_id=current_user.id,
            action="payment_edit_posted_financial",
            payment_id=payment.id,
            old_data=old_snapshot,
            new_data=new_snapshot,
            reason=reason.strip(),
            severity="warning",
        )

        return {
            "message": f"Payment updated: previous receipt {old_receipt_num} superseded, new receipt {new_receipt_number} issued",
            "payment_id": payment.id,
            "receipt_number": new_receipt_number,
            "old_receipt_number": old_receipt_num,
            "new_receipt_number": new_receipt_number,
            "version": old_version + 1,
            "is_superseded": True,
        }

    raise HTTPException(status_code=400, detail=f"Cannot edit payment in state '{payment.status}'")

