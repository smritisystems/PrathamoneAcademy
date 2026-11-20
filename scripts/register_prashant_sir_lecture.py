# /**
#  * @file        register_prashant_sir_lecture.py
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
#  * @description Registers Dean Prashant Tejam's ICSE Class 9 Mathematics lecture (Mean & Median) into the EduBoard attachments and Student Portal Study Materials.
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
from app.models.standard import Standard
from app.models.subject import Subject


async def register_prashant_lecture():
    video_path = ROOT / "docs" / "assets" / "commercial" / "PrashantAcademy_ICSE_Class9_Mean_Lecture_1080p.mp4"
    if not video_path.exists():
        print(f"[WAIT] Video file not ready yet: {video_path}")
        return

    file_size = video_path.stat().st_size
    with open(video_path, "rb") as f:
        sha256 = hashlib.sha256(f.read()).hexdigest()

    async with AsyncSessionLocal() as db:
        try:
            # Check Board 4 or create board 5 for Class 9 ICSE Maths
            b_res = await db.execute(select(EduBoard).where(EduBoard.title.like("%Statistics%")))
            board = b_res.scalars().first()

            if not board:
                # Use standard_id=9 (Class IX), subject_id=7 (Mathematics)
                board = EduBoard(
                    board_code="EB-PRASHANT-ICSE-IX-MATHS",
                    institution_id=1,
                    is_demo=False,
                    academic_year_id=1,
                    teacher_user_id=1,
                    standard_id=9,
                    division_id=None,
                    subject_id=7,
                    title="ICSE IX • Statistics: Mean, Median & Shift Properties",
                    topic="Arithmetic Mean Formula & Properties",
                    board_mode_default="classic",
                    status="published",
                    is_template=False,
                    page_count=1,
                )
                db.add(board)
                await db.flush()
                print(f"[CREATED] EduBoard id={board.id} for ICSE IX Maths.")

            stored_name = "PrashantAcademy_ICSE_Class9_Mean_Lecture_1080p.mp4"
            att_res = await db.execute(
                select(EduBoardAttachment).where(
                    EduBoardAttachment.board_id == board.id,
                    EduBoardAttachment.stored_filename == stored_name
                )
            )
            att = att_res.scalars().first()

            if not att:
                att = EduBoardAttachment(
                    institution_id=board.institution_id,
                    is_demo=False,
                    board_id=board.id,
                    uploader_user_id=1,
                    attachment_role="recording",
                    original_filename="Prashant_Academy_ICSE_Class9_Mean_Median_Lecture.mp4",
                    stored_filename=stored_name,
                    storage_path=f"/media/commercial/{stored_name}",
                    mime_type="video/mp4",
                    extension=".mp4",
                    file_size_bytes=file_size,
                    sha256_checksum=sha256,
                    is_immutable=True,
                )
                db.add(att)
                print("[CREATED] EduBoardAttachment for Prashant Sir lecture.")
            else:
                att.file_size_bytes = file_size
                att.sha256_checksum = sha256
                print("[UPDATED] EduBoardAttachment record updated.")

            # StudyMaterial for Student Portal
            title = "ICSE Class 9 Maths • Mean & Median: Concept, Calculations & Transformation Properties (Dean Prashant Tejam Masterclass)"
            sm_res = await db.execute(
                select(StudyMaterial).where(
                    StudyMaterial.standard_id == 9,
                    StudyMaterial.subject_id == 7,
                    StudyMaterial.title == title
                )
            )
            sm = sm_res.scalars().first()

            if not sm:
                sm = StudyMaterial(
                    institution_id=1,
                    standard_id=9,
                    subject_id=7,
                    title=title,
                    description="Authentic chalkboard lecture by Dean Prashant Tejam explaining the fundamental definition of arithmetic mean (x-bar), nomenclature (Sigma x / n), observation weights (50, 60, 50, 80 / 4 = 60 kg), and the uniform transformation shift rule (60 + 5 = 65 kg) with live fluorescent highlighter annotation.",
                    file_type="VIDEO",
                    file_url=f"/media/commercial/{stored_name}",
                    file_size_bytes=file_size,
                )
                db.add(sm)
                print("[CREATED] StudyMaterial for ICSE Class 9 Student Portal.")
            else:
                sm.file_size_bytes = file_size
                print("[UPDATED] StudyMaterial for ICSE Class 9 Student Portal.")

            await db.commit()
            print("[SUCCESS] Prashant Sir's lecture recorded and registered in database successfully.")

        except Exception as e:
            await db.rollback()
            print(f"[ERROR] Database registration failed: {e}")
            raise


if __name__ == "__main__":
    asyncio.run(register_prashant_lecture())
