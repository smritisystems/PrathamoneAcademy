# /**
#  * @file        test_concession_ledger_regression.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      backend.tests
#  *
#  * @author      Jawahar R. Mallah
#  * @organization AITDL (AI Technology & Development Lab)
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 AITDL
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-10
#  * @updated     2026-11-10
#  *
#  * @description Regression test suite verifying fee concession approval, invoice line-item allocation, anti-duplication guards, and student profile ledger transparency.
#  */

import pytest
from datetime import date
from decimal import Decimal
from sqlalchemy import select
from app.models.fee import (
    FeeConcessionType,
    StudentConcessionApplication,
    FeeConcessionAllocation,
    FeeInvoice,
    FeeInvoiceItem,
)
from app.services.concession_service import ConcessionWorkflowService


class TestConcessionLedgerRegression:
    @pytest.mark.asyncio
    async def test_concession_approval_allocation_and_profile_ledger(
        self, client, auth_headers, test_student, test_academic_year, test_fee_invoice, test_institution, db, admin_user
    ):
        """
        Verify:
        1. Concession approval and invoice allocation updates gross, discount, net, and outstanding amounts.
        2. Line item discount and net amounts reconcile with the invoice header.
        3. Attempting to re-apply raises ValueError (anti-duplication guard).
        4. Student admin profile endpoint (/api/v1/students/{id}/profile) returns full ledger breakdown:
           gross_fees, total_concessions, net_fees, invoices with discount_amount, and concessions list.
        5. Payments correctly reduce the post-concession net outstanding without altering concession amounts.
        """
        invoice = test_fee_invoice["invoice"]
        gross_amount = invoice.total_amount  # Decimal("24000.00")
        concession_benefit = Decimal("6000.00")  # 25% waiver

        # 1. Create Concession Type
        c_type = FeeConcessionType(
            institution_id=test_institution.id,
            code="REG_MERIT",
            name="Regression Merit Scholarship",
            category="merit",
            funding_source="institute",
            calculation_type="fixed_amount",
            default_value=concession_benefit,
            is_active=True,
        )
        db.add(c_type)
        await db.commit()
        await db.refresh(c_type)

        # 2. Create Concession Application
        app = await ConcessionWorkflowService.submit_application(
            db=db,
            institution_id=test_institution.id,
            student_id=test_student.id,
            concession_type_id=c_type.id,
            academic_year_id=test_academic_year.id,
            nominator=admin_user,
            requested_amount=concession_benefit,
            remarks="Regression test merit waiver",
        )
        assert app.status == "pending_approval"
        assert app.requested_amount == concession_benefit

        # 3. Approve and Apply Concession to Invoice
        app_approved = await ConcessionWorkflowService.approve_application(
            db=db,
            application_id=app.id,
            approver=admin_user,
            approved_amount=concession_benefit,
            remarks="Approved by committee",
            auto_apply=True,
        )
        assert app_approved.status == "applied"
        assert app_approved.applied_amount == concession_benefit

        # 4. Verify Invoice Ledger State
        inv_res = await db.execute(select(FeeInvoice).where(FeeInvoice.id == invoice.id))
        reconciled_inv = inv_res.scalar_one()

        assert reconciled_inv.total_amount == gross_amount  # Gross stays ₹24,000
        assert reconciled_inv.discount_amount == concession_benefit  # Discount is ₹6,000
        expected_net = gross_amount - concession_benefit  # Net is ₹18,000
        assert reconciled_inv.net_amount == expected_net
        assert reconciled_inv.paid_amount == Decimal("0.00")
        assert reconciled_inv.outstanding_amount == expected_net

        # 5. Verify Invoice Line Item Reconciliation
        item_res = await db.execute(select(FeeInvoiceItem).where(FeeInvoiceItem.invoice_id == invoice.id))
        items = item_res.scalars().all()
        assert len(items) >= 1
        assert items[0].discount_amount == concession_benefit
        assert items[0].net_amount == expected_net

        # 6. Verify FeeConcessionAllocation
        alloc_res = await db.execute(
            select(FeeConcessionAllocation).where(FeeConcessionAllocation.application_id == app.id)
        )
        allocation = alloc_res.scalar_one_or_none()
        assert allocation is not None
        assert allocation.allocated_amount == concession_benefit
        assert allocation.invoice_id == invoice.id

        # 7. Anti-Duplication Guard: Cannot re-apply already applied concession
        with pytest.raises(ValueError, match="Cannot apply concession in 'applied' status"):
            await ConcessionWorkflowService.apply_concession_to_invoice(
                db=db, application_id=app.id, user=admin_user
            )

        # 8. Verify Student Admin Profile Display Endpoint
        profile_res = await client.get(
            f"/api/v1/students/{test_student.id}/profile",
            headers=auth_headers,
        )
        assert profile_res.status_code == 200
        profile_data = profile_res.json()

        # Check Overview Fee Summary
        fee_sum = profile_data["overview"]["fee_summary"]
        assert fee_sum["gross_fees"] == float(gross_amount)
        assert fee_sum["total_concessions"] == float(concession_benefit)
        assert fee_sum["net_fees"] == float(expected_net)
        assert fee_sum["total_fees"] == float(expected_net)
        assert fee_sum["total_paid"] == 0.0
        assert fee_sum["outstanding"] == float(expected_net)

        # Check Invoices Array
        invoices_list = profile_data["fees"]["invoices"]
        assert len(invoices_list) >= 1
        inv_payload = invoices_list[0]
        assert inv_payload["total_amount"] == float(gross_amount)
        assert inv_payload["discount_amount"] == float(concession_benefit)
        assert inv_payload["net_amount"] == float(expected_net)
        assert inv_payload["outstanding_amount"] == float(expected_net)

        # Check Concessions Array
        concessions_payload = profile_data["fees"]["concessions"]
        assert len(concessions_payload) == 1
        assert concessions_payload[0]["application_number"] == app.application_number
        assert concessions_payload[0]["concession_name"] == "Regression Merit Scholarship"
        assert concessions_payload[0]["applied_amount"] == float(concession_benefit)
        assert concessions_payload[0]["status"] == "applied"

        # 9. Test Payment Integration Against Net Obligation
        pay_res = await client.post(
            "/api/v1/payments/",
            json={
                "student_id": test_student.id,
                "academic_year_id": test_academic_year.id,
                "amount": 10000.0,
                "payment_date": str(date.today()),
                "payment_method": "bank_transfer",
                "action": "post",
                "allocations": [{"invoice_id": invoice.id, "amount": 10000.0}],
            },
            headers=auth_headers,
        )
        assert pay_res.status_code == 201

        # Re-check Profile: Total Paid = 10,000, Outstanding = 8,000 (18,000 - 10,000)
        profile_after_pay = await client.get(
            f"/api/v1/students/{test_student.id}/profile",
            headers=auth_headers,
        )
        assert profile_after_pay.status_code == 200
        pay_fee_sum = profile_after_pay.json()["overview"]["fee_summary"]
        assert pay_fee_sum["total_paid"] == 10000.0
        assert pay_fee_sum["outstanding"] == 8000.0
        assert pay_fee_sum["gross_fees"] == float(gross_amount)
        assert pay_fee_sum["total_concessions"] == float(concession_benefit)
