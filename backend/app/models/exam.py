# /**
#  * @file        exam.py
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
#  * @updated     2026-11-09
#  *
#  * @description SQLAlchemy models defining exams, test schedules, subjects, and student score marks.
#  */

from sqlalchemy import (
    String,
    Boolean,
    DateTime,
    ForeignKey,
    func,
    Date,
    Numeric,
    Integer,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime, date
from decimal import Decimal
from app.core.database import Base


class Examination(Base):
    __tablename__ = "examinations"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    academic_year_id: Mapped[int] = mapped_column(
        ForeignKey("academic_years.id"), nullable=False
    )
    standard_id: Mapped[int] = mapped_column(
        ForeignKey("standards.id"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    exam_type: Mapped[str] = mapped_column(String(50), nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=True)
    end_date: Mapped[date] = mapped_column(Date, nullable=True)
    max_marks: Mapped[int] = mapped_column(Integer, default=100)
    passing_marks: Mapped[int] = mapped_column(Integer, default=35)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    marks: Mapped[list["ExamMark"]] = relationship(
        "ExamMark", back_populates="examination"
    )


class ExamMark(Base):
    __tablename__ = "exam_marks"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    examination_id: Mapped[int] = mapped_column(
        ForeignKey("examinations.id"), nullable=False
    )
    student_id: Mapped[int] = mapped_column(
        ForeignKey("students.id"), nullable=False
    )
    subject_id: Mapped[int] = mapped_column(
        ForeignKey("subjects.id"), nullable=False
    )
    subject_mapping_id: Mapped[int | None] = mapped_column(
        ForeignKey("subject_mappings.id", ondelete="SET NULL"), nullable=True, index=True
    )
    marks_obtained: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=True)
    grade: Mapped[str] = mapped_column(String(5), nullable=True)
    remarks: Mapped[str] = mapped_column(String(200), nullable=True)
    is_absent: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    examination: Mapped["Examination"] = relationship(
        "Examination", back_populates="marks"
    )
    student: Mapped["Student"] = relationship(
        "Student", back_populates="exam_marks"
    )
    subject: Mapped["Subject"] = relationship(
        "Subject", back_populates="exam_marks"
    )
    subject_mapping: Mapped["SubjectMapping | None"] = relationship("SubjectMapping")

