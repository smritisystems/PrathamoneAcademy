# /**
#  * @file        register_prashant_physics_lecture.py
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
#  * @description Registers Dean Prashant Tejam's ICSE Class 10 Physics lecture (Moment of Force & Torque) into the EduBoard attachments and Student Portal Study Materials.
#  */

import os
import sys
import asyncio
import hashlib
from pathlib import Path
from datetime import datetime
from sqlalchemy import select

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.core.database import AsyncSessionLocal
from app.models.eduboard import EduBoard, EduBoardAttachment
from app.models.portal import StudyMaterial


async def register_physics_lecture():
    video_path = ROOT / "docs" / "assets" / "commercial" / "PrashantAcademy_ICSE_Class10_Physics_Moment_Lecture_1080p.mp4"
    if not video_path.exists():
        print(f"[WAIT] Video file not ready: {video_path}")
        return

    file_size = video_path.stat().st_size
    with open(video_path, "rb") as f:
        sha256 = hashlib.sha256(f.read()).hexdigest()

    async with AsyncSessionLocal() as db:
        try:
            # Check or create Board for Class 10 Physics
            b_res = await db.execute(select(EduBoard).where(EduBoard.title.like("%Moment of Force%")))
            board = b_res.scalars().first()

            if not board:
                board = EduBoard(
                    board_code="EB-PRASHANT-ICSE-X-PHYSICS",
                    institution_id=1,
                    is_demo=False,
                    academic_year_id=1,
                    teacher_user_id=1,
                    standard_id=10,  # Class X
                    division_id=None,
                    subject_id=2,    # Physics
                    title="ICSE X • Chapter 1: Moment of Force, Torque & Equilibrium",
                    topic="Moment of Force Formula, Door Handle & Sign Conventions",
                    board_mode_default="classic",
                    status="published",
                    is_template=False,
                    page_count=1,
                )
                db.add(board)
                await db.flush()
                print(f"[CREATED] EduBoard id={board.id} for ICSE X Physics.")
            else:
                print(f"[FOUND] EduBoard id={board.id} already exists.")

            # Register Attachment
            att_res = await db.execute(
                select(EduBoardAttachment).where(
                    EduBoardAttachment.eduboard_id == board.id,
                    EduBoardAttachment.filename == "PrashantAcademy_ICSE_Class10_Physics_Moment_Lecture_1080p.mp4",
                )
            )
            attachment = att_res.scalars().first()

            if not attachment:
                attachment = EduBoardAttachment(
                    eduboard_id=board.id,
                    filename="PrashantAcademy_ICSE_Class10_Physics_Moment_Lecture_1080p.mp4",
                    file_url="/media/commercial/PrashantAcademy_ICSE_Class10_Physics_Moment_Lecture_1080p.mp4",
                    file_type="video",
                    mime_type="video/mp4",
                    file_size_bytes=file_size,
                    sha256_hash=sha256,
                    created_by=1,
                    created_at=datetime.utcnow(),
                )
                db.add(attachment)
                await db.flush()
                print(f"[REGISTERED] EduBoardAttachment id={attachment.id} for EduBoard id={board.id}.")

            # Register Portal Study Material
            mat_res = await db.execute(
                select(StudyMaterial).where(
                    StudyMaterial.file_url == "/media/commercial/PrashantAcademy_ICSE_Class10_Physics_Moment_Lecture_1080p.mp4"
                )
            )
            material = mat_res.scalars().first()

            if not material:
                material = StudyMaterial(
                    institution_id=1,
                    standard_id=10,
                    subject_id=2,
                    title="ICSE Class 10 Physics: Moment of Force & Equilibrium (Dean Prashant Tejam Master Lecture)",
                    description="Full 1080p classroom session with live derivations of tau = F * d, door handle example, dual fluorescent highlighters, and sign conventions by Dean Prashant Tejam.",
                    material_type="video",
                    file_url="/media/commercial/PrashantAcademy_ICSE_Class10_Physics_Moment_Lecture_1080p.mp4",
                    file_size_bytes=file_size,
                    is_published=True,
                    published_at=datetime.utcnow(),
                    view_count=0,
                    download_count=0,
                    created_by=1,
                )
                db.add(material)
                await db.flush()
                print(f"[PUBLISHED] StudyMaterial id={material.id} into Student Portal for Class 10 Physics.")

            await db.commit()
            print("[SUCCESS] All database records committed successfully.")

        except Exception as e:
            await db.rollback()
            print(f"[ERROR] Failed to register: {e}")
            raise


if __name__ == "__main__":
    asyncio.run(register_physics_lecture())
