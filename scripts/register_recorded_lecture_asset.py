# /**
#  * @file        register_recorded_lecture_asset.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      00_PRODUCT_OVERVIEW
#  *
#  * @author      Jawahar R. Mallah
#  * @organization Smritisys & AITDL Networks
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 PrathamOne EduOS
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-20
#  * @updated     2026-11-21
#  *
#  * @description Registers the 1-minute 1080p EduBoard recorded lecture as a verified EduBoardAttachment and StudyMaterial in the PostgreSQL database.
#  */

import os
import sys
import asyncio
import hashlib
from pathlib import Path
from datetime import datetime
from sqlalchemy import select

# Set backend path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.core.database import AsyncSessionLocal
from app.models.eduboard import EduBoard, EduBoardAttachment
from app.models.portal import StudyMaterial


async def register_recording():
    video_path = ROOT / "docs" / "assets" / "commercial" / "PrathamOne_EduBoard_1Min_Physics_Lecture_1080p.mp4"
    if not video_path.exists():
        print(f"[ERROR] Video file does not exist yet: {video_path}")
        return

    file_size = video_path.stat().st_size
    with open(video_path, "rb") as f:
        sha256 = hashlib.sha256(f.read()).hexdigest()

    async with AsyncSessionLocal() as db:
        try:
            # Check board 4
            result = await db.execute(select(EduBoard).where(EduBoard.id == 4))
            board = result.scalars().first()
            if not board:
                print("[WARN] Board 4 not found.")
                return

            print(f"[FOUND] EduBoard id={board.id}, title='{board.title}'")

            # Check existing attachment
            stored_name = "PrathamOne_EduBoard_1Min_Physics_Lecture_1080p.mp4"
            att_result = await db.execute(
                select(EduBoardAttachment).where(
                    EduBoardAttachment.board_id == board.id,
                    EduBoardAttachment.stored_filename == stored_name
                )
            )
            att = att_result.scalars().first()

            if not att:
                att = EduBoardAttachment(
                    institution_id=board.institution_id,
                    is_demo=False,
                    board_id=board.id,
                    uploader_user_id=board.teacher_user_id,
                    attachment_role="recording",
                    original_filename="CBSE_XII_Physics_Projectile_Motion_1Min_Lecture.mp4",
                    stored_filename=stored_name,
                    storage_path=f"/media/commercial/{stored_name}",
                    mime_type="video/mp4",
                    extension=".mp4",
                    file_size_bytes=file_size,
                    sha256_checksum=sha256,
                    is_immutable=True,
                )
                db.add(att)
                print("[CREATED] EduBoardAttachment for lecture recording.")
            else:
                att.file_size_bytes = file_size
                att.sha256_checksum = sha256
                print("[UPDATED] EduBoardAttachment record updated.")

            # Check StudyMaterial for student portal
            title = "CBSE XII • Physics: Projectile Motion & 2D Kinematics (Masterclass Recording)"
            sm_result = await db.execute(
                select(StudyMaterial).where(
                    StudyMaterial.standard_id == board.standard_id,
                    StudyMaterial.subject_id == board.subject_id,
                    StudyMaterial.title == title
                )
            )
            sm = sm_result.scalars().first()

            if not sm:
                sm = StudyMaterial(
                    institution_id=board.institution_id,
                    standard_id=board.standard_id,
                    subject_id=board.subject_id,
                    subject_mapping_id=board.subject_mapping_id,
                    division_id=board.division_id,
                    title=title,
                    description="High-definition 1080p chalkboard lecture recording with full derivations: Time of flight (T), Maximum Height (H_max), Horizontal Range (R), and optimal angle (theta = 45 deg) with real-time fluorescent highlighter annotation.",
                    file_type="VIDEO",
                    file_url=f"/media/commercial/{stored_name}",
                    file_size_bytes=file_size,
                )
                db.add(sm)
                print("[CREATED] StudyMaterial for Student Portal.")
            else:
                sm.file_size_bytes = file_size
                print("[UPDATED] StudyMaterial for Student Portal.")

            await db.commit()
            print("[SUCCESS] Lecture recording registered in database successfully.")

        except Exception as e:
            await db.rollback()
            print(f"[ERROR] Database registration failed: {e}")
            raise


if __name__ == "__main__":
    asyncio.run(register_recording())
