# /**
#  * @file        enrollment.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      backend.app.models
#  *
#  * @author      Jawahar R. Mallah
#  * @organization AITDL (AI Technology & Development Lab)
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 AITDL
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-03
#  * @updated     2026-11-05
#  *
#  * @description SQLAlchemy model defining student enrollment in classes, batches, and academic years.
#  */

from sqlalchemy import String, Boolean, DateTime, ForeignKey, func, Date, Index, text, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime, date
from app.core.database import Base


class StudentEnrollment(Base):
    __tablename__ = "student_enrollments"
    __table_args__ = (
        Index(
            "uq_active_student_academic_year",
            "student_id",
            "academic_year_id",
            unique=True,
            postgresql_where=text("status = 'active'"),
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    student_id: Mapped[int] = mapped_column(
        ForeignKey("students.id"), nullable=False
    )
    academic_year_id: Mapped[int] = mapped_column(
        ForeignKey("academic_years.id"), nullable=False
    )
    standard_id: Mapped[int] = mapped_column(
        ForeignKey("standards.id"), nullable=False
    )
    division_id: Mapped[int] = mapped_column(
        ForeignKey("divisions.id"), nullable=True
    )
    roll_number: Mapped[str] = mapped_column(String(20), nullable=True)
    enrollment_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="active")
    remarks: Mapped[str] = mapped_column(String(500), nullable=True)
    exit_date: Mapped[date] = mapped_column(Date, nullable=True)
    exit_reason: Mapped[str] = mapped_column(String(100), nullable=True)
    exit_notes: Mapped[str] = mapped_column(Text, nullable=True)
    exited_by_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )
    exited_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    student: Mapped["Student"] = relationship(
        "Student", back_populates="enrollments"
    )
    academic_year: Mapped["AcademicYear"] = relationship(
        "AcademicYear", back_populates="enrollments"
    )
    standard: Mapped["Standard"] = relationship("Standard")
    division: Mapped["Division"] = relationship(
        "Division", back_populates="enrollments"
    )
    exited_by: Mapped["User"] = relationship("User", foreign_keys=[exited_by_id])

