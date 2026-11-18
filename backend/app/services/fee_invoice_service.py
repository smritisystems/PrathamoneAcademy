# /**
#  * @file        fee_invoice_service.py
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
#  * @created     2026-11-18
#  * @updated     2026-11-18
#  *
#  * @description Creates canonical issued fee invoices with persisted schedules.
#  */

from datetime import date
from dataclasses import dataclass
from decimal import Decimal
import json
from typing import Any, Sequence

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.fee import (
    FeeInvoice,
    FeeInvoiceInstallment,
    FeeInvoiceItem,
    FeeStructure,
    StudentFeeAssignment,
)
from app.models.student import Student
from app.models.user import AuditLog, User
from app.services.sequence import generate_next_invoice_number


CENT = Decimal("0.01")


@dataclass(frozen=True)
class FeeInvoiceScheduleInput:
    description: str
    due_date: date
    amount: Decimal


async def issue_fee_invoice(
    db: AsyncSession,
    *,
    student: Student,
    assignment: StudentFeeAssignment,
    structure: FeeStructure,
    issue_date: date,
    installments: Sequence[Any],
    notes: str | None,
    actor: User,
) -> FeeInvoice:
    """Create one issued invoice and its explicit schedule without committing."""
    if not installments:
        raise HTTPException(
            status_code=422,
            detail="At least one installment schedule is required to issue an invoice.",
        )

    gross_amount = Decimal(
        str(
            assignment.custom_amount
            if assignment.custom_amount is not None
            else structure.amount
        )
    )
    if gross_amount <= 0 or gross_amount != gross_amount.quantize(CENT):
        raise HTTPException(
            status_code=422,
            detail="The assigned fee amount must be a positive currency amount.",
        )

    schedule_total = sum(
        (Decimal(str(installment.amount)) for installment in installments),
        Decimal("0.00"),
    )
    if schedule_total != gross_amount:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Installment schedule total ({schedule_total}) must equal the "
                f"invoice payable amount ({gross_amount})."
            ),
        )
    if any(
        Decimal(str(installment.amount)) <= 0
        or Decimal(str(installment.amount))
        != Decimal(str(installment.amount)).quantize(CENT)
        for installment in installments
    ):
        raise HTTPException(
            status_code=422,
            detail="Each installment amount must be a positive currency amount.",
        )

    invoice_number = await generate_next_invoice_number(
        db,
        institution_id=student.institution_id,
        academic_year_id=assignment.academic_year_id,
    )
    schedule_rows = [
        FeeInvoiceInstallment(
            installment_number=index,
            description=installment.description.strip(),
            amount=Decimal(str(installment.amount)),
            paid_amount=Decimal("0.00"),
            outstanding_amount=Decimal(str(installment.amount)),
            due_date=installment.due_date,
            status="unpaid",
        )
        for index, installment in enumerate(installments, 1)
    ]
    invoice = FeeInvoice(
        invoice_number=invoice_number,
        student_id=student.id,
        assignment_id=assignment.id,
        academic_year_id=assignment.academic_year_id,
        total_amount=gross_amount,
        discount_amount=Decimal("0.00"),
        net_amount=gross_amount,
        paid_amount=Decimal("0.00"),
        outstanding_amount=gross_amount,
        status="unpaid",
        issue_date=issue_date,
        due_date=min(installment.due_date for installment in installments),
        notes=notes,
        installments=schedule_rows,
    )
    db.add(invoice)
    await db.flush()

    db.add(
        FeeInvoiceItem(
            institution_id=student.institution_id,
            invoice_id=invoice.id,
            fee_structure_id=structure.id,
            structure_name=structure.name,
            description=structure.name,
            amount=gross_amount,
            discount_amount=Decimal("0.00"),
            net_amount=gross_amount,
        )
    )

    db.add(
        AuditLog(
            user_id=actor.id,
            institution_id=student.institution_id,
            action="create_fee_invoice",
            resource_type="fee_invoice",
            resource_id=invoice.id,
            new_data=json.dumps(
                {
                    "invoice_number": invoice_number,
                    "student_id": student.id,
                    "net_amount": str(gross_amount),
                    "installment_count": len(schedule_rows),
                }
            ),
            details=f"Issued fee invoice {invoice_number} with a persisted schedule.",
        )
    )
    return invoice
