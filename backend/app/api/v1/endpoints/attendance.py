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
#  * @updated     2026-11-04
#  *
#  * @description API endpoints for student attendance tracking, session marking, and absenteeism reporting.
#  */

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from typing import Optional, List
from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.models.attendance import Attendance
from pydantic import BaseModel
from datetime import date

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
    return {"message": f"Attendance marked for {len(data.entries)} students"}


@router.get("/")
async def get_attendance(
    student_id: Optional[int] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    query = select(Attendance)
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

