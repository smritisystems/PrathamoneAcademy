# /**
#  * @file        clean_production_data.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      backend.scripts
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
#  * @description Source component for Clean Production Data in the backend.scripts module.
#  */

"""
File:         clean_production_data.py
Project:      PrathamOne Academy Coaching Institute Management System
Module:       backend.scripts
Author:       Jawahar R. Mallah
Organization: AITDL (AI Technology & Development Lab)
Client:       Prashant Academy Coaching Institute
Copyright:    Copyright (c) 2026 AITDL
License:      Proprietary
Version:      1.0.0
Created:      2026-11-04
Updated:      2026-11-04

Description:  Production database cleanup script removing demo, test, and unlinked artifacts
              while preserving the 39 authoritative students and complete financial ledger.
"""

import argparse
import asyncio
import os
import sys
import asyncpg

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/prashant_academy"
)
# Convert asyncpg compatible URL
if DATABASE_URL.startswith("postgresql+asyncpg://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")


async def execute_cleanup(option: int = 1, dry_run: bool = False):
    print("=" * 75)
    print("      PRATHAMONE ACADEMY — CLEAN PRODUCTION DATA RESTORATION")
    print(f"      Mode: {'DRY RUN (Preview Only)' if dry_run else 'LIVE EXECUTION'}")
    print(f"      Batch Isolation Strategy: Option {option}")
    print("=" * 75)

    conn = await asyncpg.connect(DATABASE_URL)
    tr = conn.transaction()
    await tr.start()

    try:
        # Pre-cleanup count snapshots
        initial_students = await conn.fetchval("SELECT count(*) FROM students;")
        initial_enrollments = await conn.fetchval("SELECT count(*) FROM student_enrollments;")
        initial_guardians = await conn.fetchval("SELECT count(*) FROM guardians;")
        initial_documents = await conn.fetchval("SELECT count(*) FROM student_documents;")
        initial_invoices = await conn.fetchval("SELECT count(*) FROM fee_invoices;")
        initial_payments = await conn.fetchval("SELECT count(*) FROM payments;")
        initial_divisions = await conn.fetchval("SELECT count(*) FROM divisions;")
        initial_timetable = await conn.fetchval("SELECT count(*) FROM timetable_entries;")
        initial_announcements = await conn.fetchval("SELECT count(*) FROM announcements;")
        initial_exams = await conn.fetchval("SELECT count(*) FROM examinations;")
        initial_materials = await conn.fetchval("SELECT count(*) FROM study_materials;")

        print("\n[Step 1/5] Removing 6 test transfer enrollment artifacts...")
        res_enroll = await conn.execute("""
            DELETE FROM student_enrollments
            WHERE status != 'active' AND id IN (168, 169, 170, 172, 205, 206);
        """)
        print(f"  -> {res_enroll}")

        print("\n[Step 2/5] Removing demo notice board announcements...")
        res_ann = await conn.execute("DELETE FROM announcements WHERE id IN (1, 2, 3);")
        print(f"  -> {res_ann}")

        print("\n[Step 3/5] Removing demo examinations (0 marks recorded)...")
        res_exam = await conn.execute("DELETE FROM examinations WHERE id IN (1, 2, 3, 4, 5, 6, 7);")
        print(f"  -> {res_exam}")

        print("\n[Step 4/5] Removing demo study materials with mock URLs...")
        res_mat = await conn.execute("DELETE FROM study_materials WHERE id IN (1, 2, 3, 4, 5, 6);")
        print(f"  -> {res_mat}")

        print("\n[Step 5/5] Pruning unassigned sections & empty batches...")
        # Generic unassigned sections (Standard 1 A/B ... Standard 12 A/B without board)
        generic_div_ids = [1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]

        # 1. Always delete demo timetable entries on generic unassigned sections
        del_tt_gen = await conn.execute(
            "DELETE FROM timetable_entries WHERE division_id = ANY($1::int[]);",
            generic_div_ids
        )
        print(f"  -> Removed demo timetable entries on generic sections: {del_tt_gen}")

        # 2. Always delete generic unassigned divisions
        del_div_gen = await conn.execute(
            "DELETE FROM divisions WHERE id = ANY($1::int[]);",
            generic_div_ids
        )
        print(f"  -> Removed generic unassigned sections: {del_div_gen}")

        if option == 1:
            # Option 1: Strict Roster Isolation (Also prune 15 empty coaching batches)
            empty_coaching_batch_ids = [27, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43]
            del_tt_empty = await conn.execute(
                "DELETE FROM timetable_entries WHERE division_id = ANY($1::int[]);",
                empty_coaching_batch_ids
            )
            print(f"  -> Option 1: Removed timetable entries on empty batches: {del_tt_empty}")

            del_div_empty = await conn.execute(
                "DELETE FROM divisions WHERE id = ANY($1::int[]);",
                empty_coaching_batch_ids
            )
            print(f"  -> Option 1: Removed empty coaching batches: {del_div_empty}")
        else:
            # Option 2: Retain 20 coaching batches, prune demo timetable slots on empty batches
            empty_coaching_batch_ids = [27, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43]
            del_tt_empty = await conn.execute(
                "DELETE FROM timetable_entries WHERE division_id = ANY($1::int[]);",
                empty_coaching_batch_ids
            )
            print(f"  -> Option 2: Pruned sample timetable slots from empty batches: {del_tt_empty}")

        # Final Post-Cleanup Verification Assertions
        final_students = await conn.fetchval("SELECT count(*) FROM students;")
        final_enrollments = await conn.fetchval("SELECT count(*) FROM student_enrollments;")
        final_invoices = await conn.fetchval("SELECT count(*) FROM fee_invoices;")
        final_inv_sum = await conn.fetchval("SELECT sum(total_amount) FROM fee_invoices;")
        final_paid_sum = await conn.fetchval("SELECT sum(paid_amount) FROM fee_invoices;")
        final_out_sum = await conn.fetchval("SELECT sum(outstanding_amount) FROM fee_invoices;")
        final_payments = await conn.fetchval("SELECT count(*) FROM payments;")
        final_pay_sum = await conn.fetchval("SELECT sum(amount) FROM payments;")
        final_receipts = await conn.fetchval("SELECT count(*) FROM payment_receipts;")
        final_divisions = await conn.fetchval("SELECT count(*) FROM divisions;")
        final_timetable = await conn.fetchval("SELECT count(*) FROM timetable_entries;")

        print("\n" + "=" * 75)
        print("                 POST-CLEANUP VERIFICATION ASSERTIONS")
        print("=" * 75)
        print(f"  Active Students    : {final_students} (Expected: 39) -> {'PASS' if final_students == 39 else 'FAIL'}")
        print(f"  Active Enrollments : {final_enrollments} (Expected: 39) -> {'PASS' if final_enrollments == 39 else 'FAIL'}")
        print(f"  Total Invoices     : {final_invoices} (Expected: 36) -> {'PASS' if final_invoices == 36 else 'FAIL'}")
        print(f"  Invoice Billed Sum : Rs. {final_inv_sum:,.2f} (Expected: Rs. 2,770,000.00)")
        print(f"  Payment Collected  : Rs. {final_pay_sum:,.2f} (Expected: Rs. 1,819,500.00)")
        print(f"  Outstanding Balance: Rs. {final_out_sum:,.2f} (Expected: Rs. 950,500.00)")
        print(f"  Payment Vouchers   : {final_payments} payments, {final_receipts} receipts (Expected: 170 each)")
        print(f"  Remaining Batches  : {final_divisions} divisions")
        print(f"  Active Timetable   : {final_timetable} schedule slots")
        print("=" * 75)

        assert final_students == 39, f"Expected 39 students, found {final_students}"
        assert final_enrollments == 39, f"Expected 39 enrollments, found {final_enrollments}"
        assert float(final_inv_sum) == 2770000.0, f"Expected 2,770,000.00 invoices, found {final_inv_sum}"
        assert float(final_pay_sum) == 1819500.0, f"Expected 1,819,500.00 payments, found {final_pay_sum}"
        assert final_payments == 170, f"Expected 170 payments, found {final_payments}"

        if dry_run:
            await tr.rollback()
            print("\n[DRY RUN] Transaction rolled back cleanly. No changes committed.")
        else:
            await tr.commit()
            print("\n[SUCCESS] Transaction committed! Database is now a clean production environment.")

    except Exception as exc:
        await tr.rollback()
        print(f"\n[ERROR] An error occurred during cleanup: {exc}")
        print("[ABORT] Transaction rolled back. Zero changes made to the database.")
        raise
    finally:
        await conn.close()


def main():
    parser = argparse.ArgumentParser(description="PrathamOne Academy - Clean Production Data Restoration")
    parser.add_argument("--option", type=int, choices=[1, 2], default=1, help="1 = Strict 5 Active Batches, 2 = Retain 20 Coaching Batches")
    parser.add_argument("--dry-run", action="store_true", help="Perform dry run without committing changes")
    args = parser.parse_args()

    asyncio.run(execute_cleanup(option=args.option, dry_run=args.dry_run))


if __name__ == "__main__":
    main()
