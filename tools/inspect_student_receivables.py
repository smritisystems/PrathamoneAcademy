# /**
#  * @file        inspect_student_receivables.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      tools
#  *
#  * @author      Jawahar R. Mallah
#  * @organization AITDL (AI Technology & Development Lab)
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 AITDL
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-09
#  * @updated     2026-11-09
#  *
#  * @description Forensic inspection of student columns, statuses, enrollments, leaving history, and fee receivables.
#  */

import asyncio
import asyncpg
import json
import os

DB_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/prashant_academy")

async def run_inspection():
    conn = await asyncpg.connect(DB_URL)
    
    # Check student_lifecycle_logs schema and data
    lifecycle_cols = await conn.fetch("""
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'student_lifecycle_logs' 
        ORDER BY ordinal_position
    """)
    print("Lifecycle log columns:", [r["column_name"] for r in lifecycle_cols])
    lifecycle_rows = await conn.fetch("SELECT * FROM student_lifecycle_logs")
    print(f"Total lifecycle logs: {len(lifecycle_rows)}")
    for r in lifecycle_rows:
        print("  Lifecycle row:", dict(r))
        
    # Check invoice statuses
    invoice_statuses = await conn.fetch("SELECT status, count(id), sum(outstanding_amount) FROM fee_invoices GROUP BY status")
    print("\nInvoice statuses:")
    for r in invoice_statuses:
        print(" ", dict(r))

    # Check former / discontinued students and their invoices
    exited_students = await conn.fetch("""
        SELECT s.id, s.admission_number, s.first_name, s.last_name, s.is_active, s.exit_date, s.exit_reason,
               fi.id as invoice_id, fi.invoice_number, fi.total_amount, fi.paid_amount, fi.outstanding_amount, fi.status as invoice_status
        FROM students s
        LEFT JOIN fee_invoices fi ON fi.student_id = s.id
        WHERE s.is_active = FALSE OR s.exit_date IS NOT NULL
    """)
    print("\nExited / Inactive students:")
    for r in exited_students:
        print(" ", dict(r))

    # Check student enrollment statuses
    enr_statuses = await conn.fetch("SELECT status, count(id) FROM student_enrollments GROUP BY status")
    print("\nEnrollment statuses:")
    for r in enr_statuses:
        print(" ", dict(r))

    # Check outstanding breakdown:
    # 1. Active students (is_active = TRUE)
    active_outstanding = await conn.fetchval("""
        SELECT COALESCE(SUM(fi.outstanding_amount), 0)
        FROM fee_invoices fi
        JOIN students s ON fi.student_id = s.id
        WHERE s.is_active = TRUE AND fi.status != 'cancelled'
    """)
    # 2. Former students (is_active = FALSE)
    former_outstanding = await conn.fetchval("""
        SELECT COALESCE(SUM(fi.outstanding_amount), 0)
        FROM fee_invoices fi
        JOIN students s ON fi.student_id = s.id
        WHERE s.is_active = FALSE AND fi.status != 'cancelled'
    """)
    total_outstanding = await conn.fetchval("""
        SELECT COALESCE(SUM(fi.outstanding_amount), 0)
        FROM fee_invoices fi
        WHERE fi.status != 'cancelled'
    """)
    # 3. Overdue outstanding
    overdue_outstanding = await conn.fetchval("""
        SELECT COALESCE(SUM(fi.outstanding_amount), 0)
        FROM fee_invoices fi
        WHERE fi.status != 'cancelled' AND fi.outstanding_amount > 0 AND fi.due_date < CURRENT_DATE
    """)
    
    # 4. Concessions & Waivers
    waived_amount = await conn.fetchval("""
        SELECT COALESCE(SUM(concession_amount), 0)
        FROM student_fee_assignments
    """)
    
    # 5. Written-off invoices
    written_off_amount = await conn.fetchval("""
        SELECT COALESCE(SUM(outstanding_amount), 0)
        FROM fee_invoices
        WHERE status = 'written_off'
    """)

    print(f"\nLive Balances:")
    print(f"  Active Students Outstanding:   INR {active_outstanding}")
    print(f"  Former Students Outstanding:   INR {former_outstanding}")
    print(f"  Total Invoiced Outstanding:    INR {total_outstanding}")
    print(f"  Overdue Outstanding:           INR {overdue_outstanding}")
    print(f"  Waived / Concession Amount:    INR {waived_amount}")
    print(f"  Written-off Amount:            INR {written_off_amount}")
    print(f"  Reconciliation Check:          {active_outstanding + former_outstanding == total_outstanding}")

    await conn.close()

if __name__ == "__main__":
    asyncio.run(run_inspection())
