# /**
#  * @file        sync_release_baseline.py
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
#  * @created     2026-11-09
#  * @updated     2026-11-09
#  *
#  * @description Synchronizes system release baseline in PostgreSQL, archives legacy pre-release versions, and enforces v1.52.1 publication.
#  */

import os
import sys
import asyncio
from datetime import datetime, timezone

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import select, update
from app.core.database import AsyncSessionLocal
from app.models.release import SystemRelease


async def sync_release_baseline():
    print("[SYNC] Synchronizing authoritative release baseline in database...")
    async with AsyncSessionLocal() as session:
        # 1. Archive legacy 6.99.x records
        await session.execute(
            update(SystemRelease)
            .where(SystemRelease.version.like("6.99%"))
            .values(status="archived")
        )

        # 2. Check or insert/update v1.52.1
        target_version = "1.52.1"
        target_build = "2026.11.09-REV-092-v1.52.1-E11B82E"
        target_title = "Release v1.52.1 — Fee Receipt PDF Generation & Bulk Sharing Engine"

        res = await session.execute(
            select(SystemRelease).where(SystemRelease.version == target_version)
        )
        existing = res.scalar_one_or_none()
        now = datetime.now(timezone.utc)

        if existing:
            existing.status = "published"
            existing.build_number = target_build
            existing.title = target_title
            existing.published_at = now
            print(f"  [OK] System release v{target_version} updated to published ({target_build}).")
        else:
            rel = SystemRelease(
                version=target_version,
                build_number=target_build,
                title=target_title,
                status="published",
                environment="production",
                git_branch="master",
                release_notes_markdown=f"# {target_title}\n\nAutomated production baseline synchronization.",
                release_notes_structured='{"added": ["Fee Receipt PDF Export", "Bulk ZIP Export", "Direct Sharing"]}',
                change_summary=f'{{"version": "{target_version}"}}',
                validation_status="passed",
                created_by_id=1,
                approved_by_id=1,
                published_by_id=1,
                approved_at=now,
                published_at=now,
            )
            session.add(rel)
            print(f"  [OK] System release v{target_version} inserted and published ({target_build}).")

        await session.commit()
    print("[SUCCESS] Release baseline synchronization complete.")


if __name__ == "__main__":
    asyncio.run(sync_release_baseline())
