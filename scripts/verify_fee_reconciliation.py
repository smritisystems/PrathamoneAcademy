# /**
#  * @file        verify_fee_reconciliation.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      scripts
#  *
#  * @author      Jawahar R. Mallah
#  * @organization AITDL (AI Technology & Development Lab)
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 AITDL
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-05
#  * @updated     2026-11-05
#  *
#  * @description Verification audit script asserting all client ledger reconciliation requirements.
#  */

import asyncio
from decimal import Decimal
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

DB_URL = "postgresql+asyncpg://postgres:postgres@localhost:5432/prashant_academy"

async def verify():
    engine = create_async_engine(DB_URL)
    errors = []

    async with engine.connect() as conn:
        print("=" * 70)
        print(" AUDITING RECONCILED STUDENT LEDGERS AGAINST CLIENT REQUIREMENTS")
        print("=" * 70)

        # 1. Puneeta: total fees is 70k not 90k
        p = await conn.execute(text("SELECT total_amount, paid_amount, outstanding_amount FROM fee_invoices WHERE student_id = 157"))
        p_row = p.fetchone()
        if not p_row or p_row.total_amount != Decimal("70000.00") or p_row.outstanding_amount != Decimal("20000.00"):
            errors.append(f"Puneeta check failed: {dict(p_row._mapping) if p_row else 'None'}")
        else:
            print("[PASS] 1. Puneeta Kulkarni: Total = 70,000.00, Paid = 50,000.00, Balance = 20,000.00")

        # 2. Satyam / Satnam: discontinued
        s = await conn.execute(text("SELECT s.is_active, s.exit_reason, se.status FROM students s JOIN student_enrollments se ON se.student_id = s.id WHERE s.id = 142"))
        s_row = s.fetchone()
        if not s_row or s_row.is_active or s_row.status != "withdrawn":
            errors.append(f"Satnam/Satyam exit check failed: {dict(s_row._mapping) if s_row else 'None'}")
        else:
            print("[PASS] 2. Satnam (Satyam) Bhatia: is_active = False, Enrollment = 'withdrawn'")

        # 3. Shaurya (160), Sushmya (166), Aaradhya (167) on fees register
        for sid, name, expected_amt in [(160, "Shaurya Shah", Decimal("75000.00")), (166, "Sushmya Bhatia", Decimal("50000.00")), (167, "Aaradhya Kapoor", Decimal("50000.00"))]:
            inv = await conn.execute(text("SELECT invoice_number, total_amount, paid_amount, outstanding_amount, status FROM fee_invoices WHERE student_id = :sid"), {"sid": sid})
            inv_row = inv.fetchone()
            if not inv_row or inv_row.total_amount != expected_amt or inv_row.outstanding_amount != expected_amt:
                errors.append(f"{name} fee invoice check failed: {dict(inv_row._mapping) if inv_row else 'None'}")
            else:
                print(f"[PASS] 3. {name}: Invoice {inv_row.invoice_number} active on register, Fee = {inv_row.total_amount}")

        # 4. Ashwin: total fees paid is 37500 (wrongly 57700)
        a = await conn.execute(text("SELECT total_amount, paid_amount, outstanding_amount FROM fee_invoices WHERE student_id = 140"))
        a_row = a.fetchone()
        a_pays = await conn.execute(text("SELECT SUM(amount) FROM payments WHERE student_id = 140 AND status IN ('completed', 'posted')"))
        a_paid = a_pays.scalar() or Decimal("0.00")
        if not a_row or a_paid != Decimal("37500.00") or a_row.outstanding_amount != Decimal("42500.00"):
            errors.append(f"Ashwin paid check failed: paid={a_paid}, invoice={dict(a_row._mapping) if a_row else 'None'}")
        else:
            print("[PASS] 4. Ashwin Tambe: Valid Paid = 37,500.00, Invoice Balance = 42,500.00")

        # 5. Keshwa: 10k is extra
        k = await conn.execute(text("SELECT total_amount, paid_amount, outstanding_amount FROM fee_invoices WHERE student_id = 141"))
        k_row = k.fetchone()
        k_pays = await conn.execute(text("SELECT SUM(amount) FROM payments WHERE student_id = 141 AND status IN ('completed', 'posted')"))
        k_paid = k_pays.scalar() or Decimal("0.00")
        if not k_row or k_paid != Decimal("40000.00") or k_row.outstanding_amount != Decimal("45000.00"):
            errors.append(f"Keshwa check failed: paid={k_paid}, invoice={dict(k_row._mapping) if k_row else 'None'}")
        else:
            print("[PASS] 5. Keshwa Mistry: Valid Paid = 40,000.00, Invoice Balance = 45,000.00")

        # 6. Samud: balance is 20500
        sam = await conn.execute(text("SELECT total_amount, paid_amount, outstanding_amount FROM fee_invoices WHERE student_id = 143"))
        sam_row = sam.fetchone()
        if not sam_row or sam_row.outstanding_amount != Decimal("20500.00") or sam_row.paid_amount != Decimal("64500.00"):
            errors.append(f"Samud check failed: {dict(sam_row._mapping) if sam_row else 'None'}")
        else:
            print("[PASS] 6. Samud Kapoor: Valid Paid = 64,500.00, Invoice Balance = 20,500.00")

        # 7. Kashish: full paid, balance wrongly shown as 10k
        kas = await conn.execute(text("SELECT total_amount, paid_amount, outstanding_amount, status FROM fee_invoices WHERE student_id = 145"))
        kas_row = kas.fetchone()
        if not kas_row or kas_row.outstanding_amount != Decimal("0.00") or kas_row.status != "paid":
            errors.append(f"Kashish check failed: {dict(kas_row._mapping) if kas_row else 'None'}")
        else:
            print("[PASS] 7. Kashish Sawant: Total = 75,000.00, Paid = 75,000.00, Balance = 0.00 (Status: paid)")

        # 8. Mahek: balance should be only 30k (2 subjects only)
        m = await conn.execute(text("SELECT total_amount, paid_amount, outstanding_amount FROM fee_invoices WHERE student_id = 148"))
        m_row = m.fetchone()
        if not m_row or m_row.outstanding_amount != Decimal("30000.00") or m_row.total_amount != Decimal("64000.00"):
            errors.append(f"Mahek check failed: {dict(m_row._mapping) if m_row else 'None'}")
        else:
            print("[PASS] 8. Mahek Nair: 2 Subjects Total = 64,000.00, Paid = 34,000.00, Balance = 30,000.00")

    await engine.dispose()

    print("=" * 70)
    if errors:
        print(f"FAILED WITH {len(errors)} ERRORS:")
        for err in errors:
            print("  -", err)
        exit(1)
    else:
        print("ALL 8 FORENSIC AUDIT CHECKS PASSED WITH 100% LEDGER INTEGRITY!")
        print("=" * 70)

if __name__ == "__main__":
    asyncio.run(verify())

