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
#  * @updated     2026-11-11
#  *
#  * @description Synchronizes system release baseline in PostgreSQL, archives legacy pre-release versions, and enforces active release publication.
#  */

import os
import sys
import json
import asyncio
from datetime import datetime, timezone

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import select, update
from app.core.database import AsyncSessionLocal
from app.models.release import SystemRelease
from app.core.config import settings


async def sync_release_baseline():
    print("[SYNC] Synchronizing authoritative release baseline in database...")

    manifest_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "app", "release_manifest.json"))
    target_version = settings.VERSION
    target_build = f"2026.11.10-REV-137-v{target_version}-C31CC0B"
    target_title = f"Release v{target_version} — Academic Homework & Universal Report Intelligence Engine"

    if os.path.exists(manifest_path):
        try:
            with open(manifest_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                target_version = data.get("version", target_version)
                target_build = data.get("build_number", target_build)
                if target_version == "1.76.0":
                    target_title = "Release v1.76.0 — Academic Homework & Universal Report Intelligence Engine"
        except Exception as e:
            print(f"  [WARN] Could not parse release_manifest.json: {e}")

    async with AsyncSessionLocal() as session:
        # 1. Archive legacy 6.99.x records
        await session.execute(
            update(SystemRelease)
            .where(SystemRelease.version.like("6.99%"))
            .values(status="archived")
        )

        # 2. Check or insert/update target active release
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
                release_notes_structured='{"added": ["Universal Report Calculation & Intelligence Engine", "Homework & Assignment Management System"]}',
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
