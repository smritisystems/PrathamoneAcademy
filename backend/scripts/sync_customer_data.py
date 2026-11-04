# /**
#  * @file        sync_customer_data.py
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
#  * @description Cross-platform synchronization engine comparing customer database state with authoritative production dataset.
#  */

import os
import sys
import argparse
import asyncio
from datetime import datetime

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import text
from app.core.database import AsyncSessionLocal

TARGET_METRICS = {
    "students": 39,
    "student_enrollments": 39,
    "guardians": 78,
    "student_documents": 195,
    "divisions": 5,
    "timetable_entries": 38,
    "fee_invoices": 36,
    "payments": 170,
    "payment_receipts": 170,
    "examinations": 9,
    "exam_marks": 312,
    "attendances": 780,
    "study_materials": 10,
    "announcements": 4,
    "standards": 12,
    "subjects": 20,
    "users": 45,
}


async def preview_and_sync(execute: bool = False, force: bool = False):
    print("=" * 80)
    print("PRATHAMONE ACADEMY: CUSTOMER DATABASE SYNCHRONIZATION INSPECTOR")
    print("=" * 80)

    async with AsyncSessionLocal() as session:
        print(f"\n{'Table Name':<26} | {'Customer Count':>14} | {'Target Count':>14} | {'Status':<14}")
        print("-" * 75)

        missing_total = 0
        current_counts = {}

        for table, expected in sorted(TARGET_METRICS.items()):
            try:
                res = await session.execute(text(f"SELECT count(*) FROM {table};"))
                cur = res.scalar() or 0
            except Exception:
                cur = 0

            current_counts[table] = cur
            diff = expected - cur

            if cur == 0 and expected > 0:
                status = f"MISSING ({expected})"
                missing_total += 1
            elif diff > 0:
                status = f"+{diff} to add"
                missing_total += 1
            elif diff < 0:
                status = f"Delta ({diff})"
            else:
                status = "ALIGNED"

            print(f"{table:<26} | {cur:>14} | {expected:>14} | {status:<14}")

        print("=" * 75)

        if not execute:
            print(f"\n[PREVIEW MODE] Found {missing_total} table(s) requiring synchronization.")
            print("Run with --execute to apply the authoritative production dataset.")
            return

        print("\n[EXECUTE MODE] Authoritative synchronization requested.")
        print("Please use the companion shell script or Docker one-liner to perform transactional SQL load:")
        print("  Windows: powershell -ExecutionPolicy Bypass -File .\\sync_deployment.ps1")
        print("  Linux:   ./sync_deployment.sh")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Synchronize customer deployment database.")
    parser.add_argument("--preview", action="store_true", help="Display comparison preview only")
    parser.add_argument("--execute", action="store_true", help="Execute synchronization")
    parser.add_argument("--force", action="store_true", help="Bypass confirmation prompt")
    args = parser.parse_args()

    asyncio.run(preview_and_sync(execute=args.execute, force=args.force))
