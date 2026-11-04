# /**
#  * @file        seed_fees_overview_showcase.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      scripts.database
#  *
#  * @author      Jawahar R. Mallah
#  * @organization AITDL (AI Technology & Development Lab)
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 AITDL
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-04
#  * @updated     2026-11-04
#  *
#  * @description Seed script aligning ICSE Class X Batch A student fees, invoices, payments, and receipts with the flagship financial dashboard showcase.
#  */

import asyncio
import datetime
import json
import sys

sys.path.insert(0, "backend")
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from sqlalchemy import select, update, delete
from app.core.database import AsyncSessionLocal
from app.models.academic_year import AcademicYear
from app.models.student import Student
from app.models.fee import FeeInvoice, StudentFeeAssignment
from app.models.payment import Payment, PaymentAllocation, PaymentReceipt
from app.models.enrollment import StudentEnrollment
from app.api.v1.endpoints.fees import get_fees_overview


async def seed():
    async with AsyncSessionLocal() as session:
        print("[1/5] Updating Academic Year 1 name to '2026 - 27'...")
        await session.execute(
            update(AcademicYear)
            .where(AcademicYear.id == 1)
            .values(name="2026 - 27", is_current=True)
        )

        print("[2/5] Locating 8 students in ICSE Class X Batch A (Division 25)...")
        enrs = (
            await session.execute(
                select(StudentEnrollment).where(StudentEnrollment.division_id == 25)
            )
        ).scalars().all()
        student_ids = [e.student_id for e in enrs]
        print(f"Found {len(student_ids)} students: {student_ids}")

        # Map student first names
        students = (
            await session.execute(
                select(Student).where(Student.id.in_(student_ids))
            )
        ).scalars().all()
        s_by_name = {s.first_name.strip(): s for s in students}
        print(f"Students mapped: {list(s_by_name.keys())}")

        print("[3/5] Cleaning existing payments and receipts for these 8 students...")
        # Delete existing payment receipts for these students
        await session.execute(
            delete(PaymentReceipt).where(PaymentReceipt.student_id.in_(student_ids))
        )
        # Delete existing payment allocations
        pmts = (
            await session.execute(
                select(Payment.id).where(Payment.student_id.in_(student_ids))
            )
        ).scalars().all()
        if pmts:
            await session.execute(
                delete(PaymentAllocation).where(PaymentAllocation.payment_id.in_(pmts))
            )
            await session.execute(
                delete(Payment).where(Payment.student_id.in_(student_ids))
            )

        print("[4/5] Setting up fee invoices (Total Obligation = 192,000)...")
        # Invoices configuration: Total obligation = 8 * 24,000 = 192,000
        # Dues:
        # Shreshta: 16,000 due (Due: 2026-10-15) -> Paid: 8,000
        # Savesh:   12,000 due (Due: 2026-10-15) -> Paid: 12,000
        # Ansh:     12,000 due (Due: 2026-10-15) -> Paid: 12,000
        # Sonakshi:  8,000 due (Due: 2026-11-01) -> Paid: 16,000
        # Rajnees:   8,000 due (Due: 2026-11-15) -> Paid: 16,000
        # Ayaan:     8,000 due (Due: 2026-11-15) -> Paid: 16,000
        # Netham:        0 due (Due: 2026-11-15) -> Paid: 24,000
        # Riddhima:      0 due (Due: 2026-11-15) -> Paid: 24,000
        # Total Due = 16k + 12k + 12k + 8k + 8k + 8k = 64,000!
        # Total Paid = 8k + 12k + 12k + 16k + 16k + 16k + 24k + 24k = 128,000!

        invoice_specs = {
            "Shreshta": {"paid": 8000.0, "due": 16000.0, "due_date": datetime.date(2026, 10, 15), "status": "partial"},
            "Savesh":   {"paid": 12000.0, "due": 12000.0, "due_date": datetime.date(2026, 10, 15), "status": "partial"},
            "Ansh":     {"paid": 12000.0, "due": 12000.0, "due_date": datetime.date(2026, 10, 15), "status": "partial"},
            "Sonakshi": {"paid": 16000.0, "due": 8000.0,  "due_date": datetime.date(2026, 11, 1),  "status": "partial"},
            "Rajnees":  {"paid": 16000.0, "due": 8000.0,  "due_date": datetime.date(2026, 11, 15), "status": "partial"},
            "Ayaan":    {"paid": 16000.0, "due": 8000.0,  "due_date": datetime.date(2026, 11, 15), "status": "partial"},
            "Netham":   {"paid": 24000.0, "due": 0.0,     "due_date": datetime.date(2026, 11, 15), "status": "paid"},
            "Riddhima": {"paid": 24000.0, "due": 0.0,     "due_date": datetime.date(2026, 11, 15), "status": "paid"},
        }

        inv_id_map = {}
        for name, spec in invoice_specs.items():
            st = s_by_name.get(name)
            if not st:
                continue
            # Check or create invoice
            existing_inv = (
                await session.execute(
                    select(FeeInvoice).where(
                        FeeInvoice.student_id == st.id,
                        FeeInvoice.academic_year_id == 1,
                    )
                )
            ).scalars().first()

            if existing_inv:
                existing_inv.total_amount = 24000.0
                existing_inv.discount_amount = 0.0
                existing_inv.net_amount = 24000.0
                existing_inv.paid_amount = spec["paid"]
                existing_inv.outstanding_amount = spec["due"]
                existing_inv.due_date = spec["due_date"]
                existing_inv.status = spec["status"]
                inv_id_map[st.id] = existing_inv.id
            else:
                inv = FeeInvoice(
                    invoice_number=f"INV-2026-X-{st.id:04d}",
                    student_id=st.id,
                    academic_year_id=1,
                    total_amount=24000.0,
                    discount_amount=0.0,
                    net_amount=24000.0,
                    paid_amount=spec["paid"],
                    outstanding_amount=spec["due"],
                    due_date=spec["due_date"],
                    status=spec["status"],
                    issue_date=datetime.date(2026, 6, 1),
                )
                session.add(inv)
                await session.flush()
                inv_id_map[st.id] = inv.id

        print("[5/5] Creating payments and official receipts (Total = 128,000)...")
        # Payment breakdown:
        # UPI: 64,000
        # Cash: 32,000
        # Bank Transfer: 16,000
        # Card: 8,000
        # Cheque: 8,000
        # Total = 128,000
        payment_list = [
            # Recent payments shown in dashboard table:
            {
                "student": "Rajnees",
                "amount": 16000.0,
                "method": "upi",
                "date": datetime.date(2026, 11, 3),
                "receipt": "RCP-001245",
            },
            {
                "student": "Ayaan",
                "amount": 8000.0,
                "method": "cash",
                "date": datetime.date(2026, 11, 2),
                "receipt": "RCP-001244",
            },
            {
                "student": "Netham",
                "amount": 16000.0,
                "method": "bank_transfer",
                "date": datetime.date(2026, 10, 28),
                "receipt": "RCP-001243",
            },
            {
                "student": "Riddhima",
                "amount": 8000.0,
                "method": "cash",
                "date": datetime.date(2026, 10, 25),
                "receipt": "RCP-001242",
            },
            # Previous monthly installments:
            {
                "student": "Netham",
                "amount": 8000.0,
                "method": "upi",
                "date": datetime.date(2026, 9, 15),
                "receipt": "RCP-001230",
            },
            {
                "student": "Ayaan",
                "amount": 8000.0,
                "method": "upi",
                "date": datetime.date(2026, 9, 10),
                "receipt": "RCP-001229",
            },
            {
                "student": "Savesh",
                "amount": 12000.0,
                "method": "upi",
                "date": datetime.date(2026, 8, 5),
                "receipt": "RCP-001220",
            },
            {
                "student": "Ansh",
                "amount": 12000.0,
                "method": "upi",
                "date": datetime.date(2026, 8, 12),
                "receipt": "RCP-001221",
            },
            {
                "student": "Sonakshi",
                "amount": 8000.0,
                "method": "cash",
                "date": datetime.date(2026, 8, 20),
                "receipt": "RCP-001222",
            },
            {
                "student": "Shreshta",
                "amount": 8000.0,
                "method": "card",
                "date": datetime.date(2026, 7, 18),
                "receipt": "RCP-001210",
            },
            {
                "student": "Riddhima",
                "amount": 8000.0,
                "method": "cash",
                "date": datetime.date(2026, 7, 10),
                "receipt": "RCP-001209",
            },
            {
                "student": "Riddhima",
                "amount": 8000.0,
                "method": "upi",
                "date": datetime.date(2026, 6, 8),
                "receipt": "RCP-001201",
            },
            {
                "student": "Sonakshi",
                "amount": 8000.0,
                "method": "cheque",
                "date": datetime.date(2026, 6, 15),
                "receipt": "RCP-001202",
            },
        ]

        for p_item in payment_list:
            st = s_by_name.get(p_item["student"])
            if not st:
                continue
            pmt = Payment(
                student_id=st.id,
                academic_year_id=1,
                amount=p_item["amount"],
                payment_date=p_item["date"],
                payment_method=p_item["method"],
                status="completed",
                transaction_reference=f"TXN-{p_item['receipt']}",
            )
            session.add(pmt)
            await session.flush()

            # Add allocation
            alloc = PaymentAllocation(
                payment_id=pmt.id,
                invoice_id=inv_id_map.get(st.id),
                allocated_amount=p_item["amount"],
            )
            session.add(alloc)

            # Add receipt
            rcp = PaymentReceipt(
                receipt_number=p_item["receipt"],
                payment_id=pmt.id,
                student_id=st.id,
                amount=p_item["amount"],
                payment_date=p_item["date"],
                payment_method=p_item["method"],
                receipt_data=json.dumps({
                    "student_name": f"{st.first_name} {st.last_name}".strip(),
                    "admission_number": st.admission_number,
                    "receipt_number": p_item["receipt"],
                    "amount": p_item["amount"],
                    "payment_date": str(p_item["date"]),
                    "payment_method": p_item["method"],
                }),
            )
            session.add(rcp)

        await session.commit()
        print("\nSeed successfully committed to PostgreSQL!")

        # Verify through overview endpoint
        res = await get_fees_overview(
            academic_year_id=1,
            board_id=1,
            standard_id=10,
            division_id=25,
            institution_id=None,
            db=session,
            current_user=None,
        )
        print("\n=== VERIFIED OVERVIEW METRICS ===")
        print("Summary:", res["summary"])
        print("\nPayment Methods:")
        for m in res["payment_methods"]:
            print(f"  {m['method']}: {m['amount']} ({m['percentage']}%)")
        print("\nTop Overdue Accounts:")
        for o in res["top_overdue"][:4]:
            print(f"  {o['student_name']}: ₹{o['due_amount']} | Due Since: {o['due_date']}")
        print("\nRecent Payments:")
        for p in res["recent_payments"][:4]:
            print(f"  {p['receipt_number']} | {p['payment_date']} | {p['student_name']} | ₹{p['amount']} | {p['payment_method']}")


if __name__ == "__main__":
    asyncio.run(seed())
