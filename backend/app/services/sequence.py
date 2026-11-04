# /**
#  * @file        sequence.py
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
#  * @created     2026-11-05
#  * @updated     2026-11-05
#  *
#  * @description Authoritative sequential number generator for receipts, admissions, and official documents.
#  */

import re
from datetime import date
from typing import Optional
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.payment import PaymentReceipt
from app.models.academic_year import AcademicYear
from app.models.settings import InstitutionSetting


async def generate_next_receipt_number(
    db: AsyncSession,
    institution_id: int = 1,
    academic_year_id: Optional[int] = None,
) -> str:
    """
    Generates the next sequential receipt number according to configured format rules.
    Default format: {PREFIX}-{YYYY}-{SEQ:04d} (e.g. RCP-2026-0171).
    """
    # 1. Fetch prefix and format from settings
    settings_rows = (
        await db.execute(
            select(InstitutionSetting).where(
                and_(
                    InstitutionSetting.institution_id == institution_id,
                    InstitutionSetting.category == "fees",
                    InstitutionSetting.key.in_(["receipt_prefix", "receipt_number_format"]),
                )
            )
        )
    ).scalars().all()

    prefix = "RCP"
    fmt_spec = "{PREFIX}-{YYYY}-{SEQ:4}"
    for row in settings_rows:
        if row.key == "receipt_prefix" and row.value:
            prefix = row.value.strip()
        elif row.key == "receipt_number_format" and row.value:
            fmt_spec = row.value.strip()

    # 2. Determine Year
    year_str = str(date.today().year)
    if academic_year_id:
        ay_row = (
            await db.execute(
                select(AcademicYear).where(AcademicYear.id == academic_year_id)
            )
        ).scalar_one_or_none()
        if ay_row and ay_row.name:
            m = re.search(r"(\d{4})", ay_row.name)
            if m:
                year_str = m.group(1)

    # 3. Find highest existing sequence matching the prefix and year
    pattern = f"{prefix}-{year_str}-%"
    res = await db.execute(
        select(PaymentReceipt.receipt_number).where(
            PaymentReceipt.receipt_number.like(pattern)
        )
    )
    receipt_numbers = res.scalars().all()

    max_seq = 0
    for r_num in receipt_numbers:
        parts = r_num.split("-")
        if parts:
            last_part = parts[-1]
            if last_part.isdigit():
                val = int(last_part)
                if val > max_seq:
                    max_seq = val

    next_seq = max_seq + 1

    def _format(seq: int) -> str:
        return (
            fmt_spec.replace("{PREFIX}", prefix)
            .replace("{YYYY}", year_str)
            .replace("{SEQ:4}", f"{seq:04d}")
            .replace("{SEQ:04d}", f"{seq:04d}")
            .replace("{SEQ:6}", f"{seq:06d}")
            .replace("{SEQ:06d}", f"{seq:06d}")
            .replace("{SEQ}", str(seq))
        )

    formatted = _format(next_seq)

    # Double check uniqueness against database
    existing = (
        await db.execute(
            select(PaymentReceipt).where(PaymentReceipt.receipt_number == formatted)
        )
    ).scalar_one_or_none()

    while existing:
        next_seq += 1
        formatted = _format(next_seq)
        existing = (
            await db.execute(
                select(PaymentReceipt).where(PaymentReceipt.receipt_number == formatted)
            )
        ).scalar_one_or_none()

    return formatted
