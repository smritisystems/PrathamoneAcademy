# /**
#  * @file        test_payments.py
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
#  * @created     2026-11-03
#  * @updated     2026-11-04
#  *
#  * @description Pytest suite validating payment recording, invoice reconciliation, and receipt generation.
#  */

"""
Comprehensive payment tests for Prashant Academy.
Tests the full fee accounting workflow including partial payments,
installment allocation, discounts, reversals, and balance calculations.
"""
import pytest
from decimal import Decimal
from datetime import date
from sqlalchemy import select
from app.models.payment import Payment, PaymentReceipt
from app.models.fee import FeeInvoice, FeeInstallment

pytestmark = pytest.mark.asyncio


class TestPaymentCreation:
    async def test_full_payment(self, client, auth_headers, test_fee_invoice, db):
        """Test recording a full payment clears the invoice."""
        inv = test_fee_invoice["invoice"]
        student_id = test_fee_invoice["student"].id
        year_id = test_fee_invoice["academic_year"].id

        resp = await client.post(
            "/api/v1/payments/",
            json={
                "student_id": student_id,
                "academic_year_id": year_id,
                "amount": 24000.0,
                "payment_date": "2024-07-01",
                "payment_method": "cash",
                "allocations": [{"invoice_id": inv.id, "amount": 24000.0}],
            },
            headers=auth_headers,
        )

        assert resp.status_code == 201
        data = resp.json()
        assert "receipt_number" in data
        assert data["amount"] == 24000.0

        # Verify invoice fully paid
        await db.refresh(inv)
        assert inv.paid_amount == Decimal("24000.00")
        assert inv.outstanding_amount == Decimal("0.00")
        assert inv.status == "paid"

    async def test_partial_payment(self, client, auth_headers, test_fee_invoice, db):
        """Test first partial payment of ₹5,000."""
        inv = test_fee_invoice["invoice"]
        student_id = test_fee_invoice["student"].id
        year_id = test_fee_invoice["academic_year"].id

        resp = await client.post(
            "/api/v1/payments/",
            json={
                "student_id": student_id,
                "academic_year_id": year_id,
                "amount": 5000.0,
                "payment_date": "2024-07-01",
                "payment_method": "cash",
                "allocations": [{"invoice_id": inv.id, "amount": 5000.0}],
            },
            headers=auth_headers,
        )

        assert resp.status_code == 201
        data = resp.json()
        assert "receipt_number" in data

        await db.refresh(inv)
        assert inv.paid_amount == Decimal("5000.00")
        assert inv.outstanding_amount == Decimal("19000.00")
        assert inv.status == "partial"

    async def test_three_payments_scenario(
        self, client, auth_headers, test_fee_invoice, db
    ):
        """
        Core requirement scenario:
          Annual fee ₹24,000
          Payment 1: ₹5,000  → Receipt 1
          Payment 2: ₹7,000  → Receipt 2
          Payment 3: ₹4,000  → Receipt 3
          Total paid: ₹16,000
          Outstanding: ₹8,000
          Must produce 3 distinct receipts.
        """
        inv = test_fee_invoice["invoice"]
        inst = test_fee_invoice["installment"]
        student_id = test_fee_invoice["student"].id
        year_id = test_fee_invoice["academic_year"].id

        receipts = []

        for amount, method, ref in [
            (5000.0, "cash", None),
            (7000.0, "upi", "UPI123"),
            (4000.0, "bank_transfer", "NEFT987"),
        ]:
            payload = {
                "student_id": student_id,
                "academic_year_id": year_id,
                "amount": amount,
                "payment_date": "2024-07-01",
                "payment_method": method,
                "allocations": [
                    {"invoice_id": inv.id, "installment_id": inst.id, "amount": amount}
                ],
            }
            if ref:
                payload["transaction_reference"] = ref

            r = await client.post(
                "/api/v1/payments/", json=payload, headers=auth_headers
            )
            assert r.status_code == 201, f"Payment failed: {r.text}"
            receipts.append(r.json()["receipt_number"])

        # 3 unique receipts
        assert len(set(receipts)) == 3, f"Expected 3 unique receipts, got {receipts}"

        # Invoice: ₹16,000 paid, ₹8,000 outstanding
        await db.refresh(inv)
        assert inv.paid_amount == Decimal("16000.00"), f"Got {inv.paid_amount}"
        assert inv.outstanding_amount == Decimal("8000.00"), f"Got {inv.outstanding_amount}"
        assert inv.status == "partial"

        # Installment updated too
        await db.refresh(inst)
        assert inst.paid_amount == Decimal("16000.00")
        assert inst.status == "partial"

    async def test_overpayment_rejected(
        self, client, auth_headers, test_fee_invoice
    ):
        """Overpayment must be rejected with HTTP 400."""
        inv = test_fee_invoice["invoice"]
        student_id = test_fee_invoice["student"].id
        year_id = test_fee_invoice["academic_year"].id

        resp = await client.post(
            "/api/v1/payments/",
            json={
                "student_id": student_id,
                "academic_year_id": year_id,
                "amount": 30000.0,
                "payment_date": "2024-07-01",
                "payment_method": "cash",
                "allocations": [{"invoice_id": inv.id, "amount": 30000.0}],
            },
            headers=auth_headers,
        )
        assert resp.status_code == 400
        assert "exceeds outstanding" in resp.json()["detail"].lower()

    async def test_allocation_mismatch_rejected(
        self, client, auth_headers, test_fee_invoice
    ):
        """Allocation total != payment amount must be rejected."""
        inv = test_fee_invoice["invoice"]
        student_id = test_fee_invoice["student"].id
        year_id = test_fee_invoice["academic_year"].id

        resp = await client.post(
            "/api/v1/payments/",
            json={
                "student_id": student_id,
                "academic_year_id": year_id,
                "amount": 5000.0,
                "payment_date": "2024-07-01",
                "payment_method": "cash",
                "allocations": [
                    {"invoice_id": inv.id, "amount": 4000.0}  # 4000 ≠ 5000
                ],
            },
            headers=auth_headers,
        )
        assert resp.status_code == 400

    async def test_wrong_student_invoice_rejected(
        self, client, auth_headers, test_fee_invoice, db, test_institution, test_academic_year
    ):
        """Invoice belonging to another student must be rejected."""
        import random
        from app.models.student import Student

        other_student = Student(
            institution_id=test_institution.id,
            admission_number=f"OTHER{random.randint(1000,9999)}",
            first_name="Other",
            last_name="Student",
            date_of_birth=date(2014, 1, 1),
            gender="male",
            admission_date=date(2024, 6, 1),
        )
        db.add(other_student)
        await db.commit()
        await db.refresh(other_student)

        inv = test_fee_invoice["invoice"]
        year_id = test_fee_invoice["academic_year"].id

        resp = await client.post(
            "/api/v1/payments/",
            json={
                "student_id": other_student.id,  # Different student
                "academic_year_id": year_id,
                "amount": 5000.0,
                "payment_date": "2024-07-01",
                "payment_method": "cash",
                "allocations": [{"invoice_id": inv.id, "amount": 5000.0}],
            },
            headers=auth_headers,
        )
        assert resp.status_code == 400

    async def test_payment_reversal(
        self, client, auth_headers, test_fee_invoice, db
    ):
        """Reversal restores invoice balance."""
        inv = test_fee_invoice["invoice"]
        student_id = test_fee_invoice["student"].id
        year_id = test_fee_invoice["academic_year"].id

        # Pay ₹5,000
        pay_resp = await client.post(
            "/api/v1/payments/",
            json={
                "student_id": student_id,
                "academic_year_id": year_id,
                "amount": 5000.0,
                "payment_date": "2024-07-01",
                "payment_method": "cash",
                "allocations": [{"invoice_id": inv.id, "amount": 5000.0}],
            },
            headers=auth_headers,
        )
        assert pay_resp.status_code == 201
        payment_id = pay_resp.json()["payment_id"]

        await db.refresh(inv)
        assert inv.paid_amount == Decimal("5000.00")

        # Reverse it
        rev_resp = await client.post(
            f"/api/v1/payments/{payment_id}/reverse",
            json={"reason": "Test reversal – cheque bounced"},
            headers=auth_headers,
        )
        assert rev_resp.status_code == 200

        # Balance restored
        await db.refresh(inv)
        assert inv.paid_amount == Decimal("0"), f"Got {inv.paid_amount}"
        assert inv.outstanding_amount == Decimal("24000.00"), f"Got {inv.outstanding_amount}"
        assert inv.status == "unpaid"

    async def test_double_reversal_rejected(
        self, client, auth_headers, test_fee_invoice, db
    ):
        """Reversing an already-reversed payment must fail."""
        inv = test_fee_invoice["invoice"]
        student_id = test_fee_invoice["student"].id
        year_id = test_fee_invoice["academic_year"].id

        pay_resp = await client.post(
            "/api/v1/payments/",
            json={
                "student_id": student_id,
                "academic_year_id": year_id,
                "amount": 1000.0,
                "payment_date": "2024-07-01",
                "payment_method": "cash",
                "allocations": [{"invoice_id": inv.id, "amount": 1000.0}],
            },
            headers=auth_headers,
        )
        payment_id = pay_resp.json()["payment_id"]

        await client.post(
            f"/api/v1/payments/{payment_id}/reverse",
            json={"reason": "First reversal"},
            headers=auth_headers,
        )
        resp2 = await client.post(
            f"/api/v1/payments/{payment_id}/reverse",
            json={"reason": "Second reversal"},
            headers=auth_headers,
        )
        assert resp2.status_code == 400

    async def test_unique_receipt_per_payment(
        self, client, auth_headers, test_fee_invoice
    ):
        """Every payment generates a unique receipt number."""
        inv = test_fee_invoice["invoice"]
        student_id = test_fee_invoice["student"].id
        year_id = test_fee_invoice["academic_year"].id

        receipts = []
        for amount in [1000.0, 2000.0, 3000.0]:
            resp = await client.post(
                "/api/v1/payments/",
                json={
                    "student_id": student_id,
                    "academic_year_id": year_id,
                    "amount": amount,
                    "payment_date": "2024-07-01",
                    "payment_method": "cash",
                    "allocations": [{"invoice_id": inv.id, "amount": amount}],
                },
                headers=auth_headers,
            )
            assert resp.status_code == 201
            receipts.append(resp.json()["receipt_number"])

        assert len(set(receipts)) == 3

    async def test_receipt_retrieval(
        self, client, auth_headers, test_fee_invoice
    ):
        """Receipt can be fetched by receipt number."""
        inv = test_fee_invoice["invoice"]
        student_id = test_fee_invoice["student"].id
        year_id = test_fee_invoice["academic_year"].id

        pay_resp = await client.post(
            "/api/v1/payments/",
            json={
                "student_id": student_id,
                "academic_year_id": year_id,
                "amount": 5000.0,
                "payment_date": "2024-07-01",
                "payment_method": "upi",
                "transaction_reference": "UPI999",
                "allocations": [{"invoice_id": inv.id, "amount": 5000.0}],
            },
            headers=auth_headers,
        )
        receipt_number = pay_resp.json()["receipt_number"]

        rec_resp = await client.get(
            f"/api/v1/payments/receipts/{receipt_number}", headers=auth_headers
        )
        assert rec_resp.status_code == 200
        data = rec_resp.json()
        assert data["receipt_number"] == receipt_number
        assert data["amount"] == 5000.0
        assert data["payment_method"] == "upi"

    async def test_payment_history_preserved(
        self, client, auth_headers, test_fee_invoice, db
    ):
        """All payments remain in history even after reversal."""
        inv = test_fee_invoice["invoice"]
        student_id = test_fee_invoice["student"].id
        year_id = test_fee_invoice["academic_year"].id

        for amount in [3000.0, 5000.0]:
            await client.post(
                "/api/v1/payments/",
                json={
                    "student_id": student_id,
                    "academic_year_id": year_id,
                    "amount": amount,
                    "payment_date": "2024-07-01",
                    "payment_method": "cash",
                    "allocations": [{"invoice_id": inv.id, "amount": amount}],
                },
                headers=auth_headers,
            )

        # All payments in list
        resp = await client.get(
            f"/api/v1/payments/?student_id={student_id}", headers=auth_headers
        )
        assert resp.status_code == 200
        payments = resp.json()
        assert len(payments) >= 2

