# /**
#  * @file        attendance.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      backend.app.api.v1.endpoints
#  *
#  * @author      Jawahar R. Mallah
#  * @organization AITDL (AI Technology & Development Lab)
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 AITDL
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-03
#  * @updated     2026-11-06
#  *
#  * @description API endpoints for student attendance tracking, session marking, and absenteeism reporting.
#  */

import logging
from typing import Optional, List
from datetime import date
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.core.database import get_db
from app.core.deps import (
    get_current_active_user,
    enforce_institution_access,
    is_sysadmin,
)
from app.models.attendance import Attendance
from app.models.student import Student
from app.services.communication import get_automation_rules, dispatch_attendance_alert

logger = logging.getLogger(__name__)

router = APIRouter()


class AttendanceEntry(BaseModel):
    student_id: int
    enrollment_id: int
    status: str
    remarks: Optional[str] = None


class AttendanceBulk(BaseModel):
    date: date
    entries: List[AttendanceEntry]


@router.post("/bulk")
async def mark_attendance_bulk(
    data: AttendanceBulk,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    user_inst_id = getattr(current_user, "institution_id", None) or 1
    if not is_sysadmin(current_user) and data.entries:
        student_ids = [entry.student_id for entry in data.entries]
        foreign_students = (
            await db.execute(
                select(Student.id).where(
                    and_(
                        Student.id.in_(student_ids),
                        Student.institution_id != user_inst_id,
                    )
                )
            )
        ).scalars().all()
        if foreign_students:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access forbidden: You cannot mark attendance for students outside your institution.",
            )

    for entry in data.entries:
        existing = await db.execute(
            select(Attendance).where(
                and_(
                    Attendance.student_id == entry.student_id,
                    Attendance.date == data.date,
                )
            )
        )
        att = existing.scalar_one_or_none()
        if att:
            att.status = entry.status
            att.remarks = entry.remarks
        else:
            att = Attendance(
                student_id=entry.student_id,
                enrollment_id=entry.enrollment_id,
                date=data.date,
                status=entry.status,
                remarks=entry.remarks,
                marked_by_id=current_user.id,
            )
            db.add(att)
    await db.commit()

    # Automated Real-Time Absentee / Late Alerts
    alerts_dispatched = 0
    try:
        rules = await get_automation_rules(db, user_inst_id)
        if rules.get("attendance_alerts_enabled", True):
            for entry in data.entries:
                if str(entry.status).lower() in ("absent", "late"):
                    await dispatch_attendance_alert(
                        db=db,
                        institution_id=user_inst_id,
                        student_id=entry.student_id,
                        att_date=str(data.date),
                        att_status=entry.status,
                        remarks=entry.remarks,
                        sender_id=current_user.id,
                        sender_name=f"{getattr(current_user, 'first_name', '')} {getattr(current_user, 'last_name', '')}".strip() or "Attendance System",
                    )
                    alerts_dispatched += 1
    except Exception as exc:
        logger.warning("Automated attendance alert dispatch encountered non-blocking error: %s", exc)

    return {
        "message": f"Attendance marked for {len(data.entries)} students",
        "alerts_dispatched": alerts_dispatched,
    }


@router.get("/")
async def get_attendance(
    student_id: Optional[int] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    effective_inst_id: int = Depends(enforce_institution_access),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    query = select(Attendance).join(Student, Attendance.student_id == Student.id)
    if effective_inst_id:
        query = query.where(Student.institution_id == effective_inst_id)
    if student_id:
        query = query.where(Attendance.student_id == student_id)
    if date_from:
        query = query.where(Attendance.date >= date_from)
    if date_to:
        query = query.where(Attendance.date <= date_to)
    result = await db.execute(query.order_by(Attendance.date.desc()))
    records = result.scalars().all()
    return [
        {
            "id": a.id,
            "student_id": a.student_id,
            "date": str(a.date),
            "status": a.status,
            "remarks": a.remarks,
        }
        for a in records
    ]
