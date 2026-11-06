# /**
#  * @file        id_card.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      backend.app.services
#  *
#  * @author      Jawahar R. Mallah
#  * @organization AITDL (AI Technology & Development Lab)
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 AITDL
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-06
#  * @updated     2026-11-06
#  *
#  * @description Service generating digital student ID cards with high-contrast vector SVG QR codes and batch export support.
#  */

import io
import json
import logging
from typing import Optional, Dict, Any, List
from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload

import qrcode
import qrcode.image.svg

from app.models.student import Student, Guardian
from app.models.enrollment import StudentEnrollment
from app.models.institution import Institution
from app.models.standard import Standard
from app.models.division import Division
from app.models.academic_year import AcademicYear

logger = logging.getLogger(__name__)


def generate_student_qr_svg(payload: str) -> str:
    """Generates a high-contrast vector SVG QR code string."""
    qr = qrcode.QRCode(
        image_factory=qrcode.image.svg.SvgPathImage,
        box_size=10,
        border=1,
    )
    qr.add_data(payload)
    qr.make(fit=True)
    img = qr.make_image()
    buf = io.BytesIO()
    img.save(buf)
    return buf.getvalue().decode("utf-8")


async def get_student_id_card_data(
    db: AsyncSession, student_id: int, institution_id: int
) -> Optional[Dict[str, Any]]:
    """Retrieves full student demographic, academic enrollment, and institute branding payload

    along with generated SVG QR code for digital ID card rendering.
    """
    stmt = (
        select(Student)
        .options(
            selectinload(Student.guardians),
            selectinload(Student.enrollments),
        )
        .where(
            and_(
                Student.id == student_id,
                Student.institution_id == institution_id,
            )
        )
    )
    res = await db.execute(stmt)
    student = res.scalar_one_or_none()
    if not student:
        return None

    # Resolve primary guardian
    primary_guardian = None
    if student.guardians:
        primary_guardian = next(
            (g for g in student.guardians if g.is_primary), student.guardians[0]
        )

    # Resolve active enrollment
    active_enrollment = None
    if student.enrollments:
        active_enrollment = next(
            (e for e in student.enrollments if e.status == "active"),
            student.enrollments[0],
        )

    # Standard and division details
    standard_name = "N/A"
    division_name = "N/A"
    academic_year_name = "2024-25"

    if active_enrollment:
        if active_enrollment.standard_id:
            std_res = await db.execute(
                select(Standard.name).where(Standard.id == active_enrollment.standard_id)
            )
            standard_name = std_res.scalar_one_or_none() or "N/A"

        if active_enrollment.division_id:
            div_res = await db.execute(
                select(Division.name).where(Division.id == active_enrollment.division_id)
            )
            division_name = div_res.scalar_one_or_none() or "N/A"

        if active_enrollment.academic_year_id:
            ay_res = await db.execute(
                select(AcademicYear.name).where(
                    AcademicYear.id == active_enrollment.academic_year_id
                )
            )
            academic_year_name = ay_res.scalar_one_or_none() or "2024-25"

    # Institution branding
    inst_res = await db.execute(
        select(Institution).where(Institution.id == institution_id)
    )
    inst = inst_res.scalar_one_or_none()

    # Canonical QR Code Verification payload
    qr_payload = json.dumps(
        {
            "adm": student.admission_number,
            "id": student.id,
            "inst": institution_id,
            "v": "1.0",
        },
        separators=(",", ":"),
    )

    qr_svg = generate_student_qr_svg(qr_payload)

    return {
        "student_id": student.id,
        "admission_number": student.admission_number,
        "first_name": student.first_name,
        "last_name": student.last_name,
        "full_name": f"{student.first_name} {student.last_name}",
        "date_of_birth": str(student.date_of_birth) if student.date_of_birth else "N/A",
        "blood_group": student.blood_group or "N/A",
        "photo_url": student.photo_url,
        "phone": student.phone or (primary_guardian.phone if primary_guardian else "N/A"),
        "email": student.email,
        "address": student.address,
        "city": student.city,
        "standard_name": standard_name,
        "division_name": division_name,
        "roll_number": active_enrollment.roll_number if active_enrollment and active_enrollment.roll_number else "N/A",
        "academic_year": academic_year_name,
        "guardian_name": f"{primary_guardian.first_name} {primary_guardian.last_name}" if primary_guardian else "N/A",
        "guardian_phone": primary_guardian.phone if primary_guardian else "N/A",
        "guardian_relation": primary_guardian.relation if primary_guardian else "Guardian",
        "institution": {
            "id": inst.id if inst else institution_id,
            "name": inst.name if inst else "Prashant Academy Coaching Institute",
            "code": inst.code if inst else "PA",
            "short_name": getattr(inst, "short_name", "PA") or "PA",
            "tagline": getattr(inst, "tagline", "Learn • Practice • Achieve") or "Learn • Practice • Achieve",
            "address": inst.address if inst else "",
            "city": inst.city if inst else "",
            "phone": inst.phone if inst else "",
            "logo_url": getattr(inst, "logo_url", None),
            "primary_color": getattr(inst, "primary_color", "#1E40AF") or "#1E40AF",
        },
        "qr_payload": qr_payload,
        "qr_svg": qr_svg,
        "valid_until": "May 2025",
    }


async def get_batch_id_card_data(
    db: AsyncSession,
    institution_id: int,
    standard_id: Optional[int] = None,
    division_id: Optional[int] = None,
) -> List[Dict[str, Any]]:
    """Retrieves list of student ID card datasets for an entire standard or division."""
    query = (
        select(Student.id)
        .join(StudentEnrollment, Student.id == StudentEnrollment.student_id)
        .where(
            and_(
                Student.institution_id == institution_id,
                Student.is_active == True,
                StudentEnrollment.status == "active",
            )
        )
    )
    if standard_id:
        query = query.where(StudentEnrollment.standard_id == standard_id)
    if division_id:
        query = query.where(StudentEnrollment.division_id == division_id)

    query = query.order_by(StudentEnrollment.roll_number, Student.first_name)
    res = await db.execute(query)
    student_ids = res.scalars().all()

    cards = []
    for sid in student_ids:
        card = await get_student_id_card_data(db, student_id=sid, institution_id=institution_id)
        if card:
            cards.append(card)

    return cards
