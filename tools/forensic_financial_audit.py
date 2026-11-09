# /**
#  * @file        forensic_financial_audit.py
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
#  * @description Comprehensive forensic audit of all financial tables, schemas, constraints, and ledger sums.
#  */

import asyncio
import asyncpg
import json
import os

DB_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/prashant_academy")

async def run_audit():
    conn = await asyncpg.connect(DB_URL)
    
    tables_to_check = [
        'payments',
        'payment_receipts',
        'payment_allocations',
        'fee_invoices',
        'fee_invoice_items',
        'student_fee_assignments',
        'fee_structures',
        'fee_categories',
        'refunds',
        'advance_payments',
        'audit_logs',
        'financial_periods',
        'receipt_sequences',
        'invoice_sequences'
    ]
    
    report = {
        "tables": {},
        "payments_summary": {},
        "invoices_summary": {},
        "receipts_summary": {},
        "allocations_summary": {},
        "foreign_keys": [],
        "constraints": []
    }
    
    for t in tables_to_check:
        exists = await conn.fetchval(
            "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1)",
            t
        )
        if exists:
            count = await conn.fetchval(f"SELECT COUNT(*) FROM {t}")
            cols = await conn.fetch(
                "SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position",
                t
            )
            report["tables"][t] = {
                "exists": True,
                "count": count,
                "columns": [
                    {
                        "name": r["column_name"],
                        "type": r["data_type"],
                        "nullable": r["is_nullable"],
                        "default": r["column_default"]
                    }
                    for r in cols
                ]
            }
        else:
            report["tables"][t] = {"exists": False, "count": 0, "columns": []}

    # Payments deep dive
    if report["tables"].get("payments", {}).get("exists"):
        total_payments = await conn.fetchval("SELECT SUM(amount) FROM payments")
        report["payments_summary"]["total_amount"] = float(total_payments) if total_payments is not None else 0.0
        
        statuses = await conn.fetch("SELECT status, count(*), sum(amount) as total FROM payments GROUP BY status")
        report["payments_summary"]["by_status"] = [
            {"status": str(r["status"]), "count": r["count"], "total": float(r["total"] or 0)}
            for r in statuses
        ]
        
        methods = await conn.fetch("SELECT payment_method, count(*), sum(amount) as total FROM payments GROUP BY payment_method")
        report["payments_summary"]["by_method"] = [
            {"method": str(r["payment_method"]), "count": r["count"], "total": float(r["total"] or 0)}
            for r in methods
        ]

    # Invoices deep dive
    if report["tables"].get("fee_invoices", {}).get("exists"):
        total_inv = await conn.fetchval("SELECT SUM(total_amount) FROM fee_invoices")
        paid_inv = await conn.fetchval("SELECT SUM(paid_amount) FROM fee_invoices")
        report["invoices_summary"]["total_invoiced"] = float(total_inv or 0)
        report["invoices_summary"]["total_paid"] = float(paid_inv or 0)
        inv_statuses = await conn.fetch("SELECT status, count(*), sum(total_amount) as total, sum(paid_amount) as paid FROM fee_invoices GROUP BY status")
        report["invoices_summary"]["by_status"] = [
            {"status": str(r["status"]), "count": r["count"], "total": float(r["total"] or 0), "paid": float(r["paid"] or 0)}
            for r in inv_statuses
        ]

    # Receipts deep dive
    if report["tables"].get("payment_receipts", {}).get("exists"):
        distinct_numbers = await conn.fetchval("SELECT COUNT(DISTINCT receipt_number) FROM payment_receipts")
        total_receipts = await conn.fetchval("SELECT COUNT(*) FROM payment_receipts")
        report["receipts_summary"]["total_receipts"] = total_receipts
        report["receipts_summary"]["distinct_receipt_numbers"] = distinct_numbers
        report["receipts_summary"]["has_duplicates"] = distinct_numbers != total_receipts

    # Foreign keys for payments and receipts
    fks = await conn.fetch("""
        SELECT
            tc.table_name, 
            kcu.column_name, 
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name 
        FROM 
            information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
              AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' 
          AND tc.table_name IN ('payments', 'payment_receipts', 'payment_allocations', 'fee_invoices', 'fee_invoice_items', 'refunds')
    """)
    report["foreign_keys"] = [
        {
            "table": r["table_name"],
            "column": r["column_name"],
            "foreign_table": r["foreign_table_name"],
            "foreign_column": r["foreign_column_name"]
        }
        for r in fks
    ]

    await conn.close()
    
    with open("tools/forensic_financial_audit_output.json", "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
    print("Forensic audit completed successfully. Output written to tools/forensic_financial_audit_output.json")

if __name__ == "__main__":
    asyncio.run(run_audit())
