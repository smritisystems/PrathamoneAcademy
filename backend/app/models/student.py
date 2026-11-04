# /**
#  * @file        student.py
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
#  * @updated     2026-11-04
#  *
#  * @description SQLAlchemy model defining student personal profile, contact information, and parent records.
#  */

from sqlalchemy import String, Boolean, DateTime, ForeignKey, func, Date, Text, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime, date
from app.core.database import Base


class Student(Base):
    __tablename__ = "students"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    institution_id: Mapped[int] = mapped_column(
        ForeignKey("institutions.id"), nullable=False
    )
    admission_number: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False, index=True
    )
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    middle_name: Mapped[str] = mapped_column(String(100), nullable=True)
    date_of_birth: Mapped[date] = mapped_column(Date, nullable=False)
    gender: Mapped[str] = mapped_column(String(10), nullable=False)
    blood_group: Mapped[str] = mapped_column(String(5), nullable=True)
    nationality: Mapped[str] = mapped_column(String(50), default="Indian")
    religion: Mapped[str] = mapped_column(String(50), nullable=True)
    caste: Mapped[str] = mapped_column(String(50), nullable=True)
    aadhar_number: Mapped[str] = mapped_column(String(12), nullable=True)
    photo_url: Mapped[str] = mapped_column(String(500), nullable=True)
    address: Mapped[str] = mapped_column(Text, nullable=True)
    city: Mapped[str] = mapped_column(String(100), nullable=True)
    state: Mapped[str] = mapped_column(String(100), nullable=True)
    pincode: Mapped[str] = mapped_column(String(10), nullable=True)
    phone: Mapped[str] = mapped_column(String(20), nullable=True)
    email: Mapped[str] = mapped_column(String(200), nullable=True)
    admission_date: Mapped[date] = mapped_column(Date, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    guardians: Mapped[list["Guardian"]] = relationship(
        "Guardian", back_populates="student", cascade="all, delete-orphan"
    )
    enrollments: Mapped[list["StudentEnrollment"]] = relationship(
        "StudentEnrollment", back_populates="student"
    )
    fee_assignments: Mapped[list["StudentFeeAssignment"]] = relationship(
        "StudentFeeAssignment", back_populates="student"
    )
    payments: Mapped[list["Payment"]] = relationship(
        "Payment", back_populates="student"
    )
    attendances: Mapped[list["Attendance"]] = relationship(
        "Attendance", back_populates="student"
    )
    exam_marks: Mapped[list["ExamMark"]] = relationship(
        "ExamMark", back_populates="student"
    )
    documents: Mapped[list["StudentDocument"]] = relationship(
        "StudentDocument", back_populates="student", cascade="all, delete-orphan"
    )


class Guardian(Base):
    __tablename__ = "guardians"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    student_id: Mapped[int] = mapped_column(
        ForeignKey("students.id"), nullable=False
    )
    relation: Mapped[str] = mapped_column(String(50), nullable=False)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    occupation: Mapped[str] = mapped_column(String(100), nullable=True)
    phone: Mapped[str] = mapped_column(String(20), nullable=True)
    email: Mapped[str] = mapped_column(String(200), nullable=True)
    aadhar_number: Mapped[str] = mapped_column(String(12), nullable=True)
    annual_income: Mapped[float] = mapped_column(Float, nullable=True)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    student: Mapped["Student"] = relationship(
        "Student", back_populates="guardians"
    )

