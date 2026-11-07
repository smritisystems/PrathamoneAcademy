# /**
#  * @file        subject.py
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
#  * @updated     2026-11-07
#  *
#  * @description SQLAlchemy models defining canonical academic subject catalogue, standard/board mappings, and legacy subject associations.
#  */

from sqlalchemy import String, Boolean, DateTime, ForeignKey, func, Integer, Index, text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from typing import Optional, List
from app.core.database import Base


class CanonicalSubject(Base):
    """
    Authoritative single source of truth for an academic subject identity.
    A subject (e.g., 'Mathematics', 'English') exists once in this master catalogue
    regardless of how many standards, boards, or divisions teach it.
    """
    __tablename__ = "canonical_subjects"
    __table_args__ = (
        Index(
            "uq_canonical_subjects_code",
            "institution_id",
            "code",
            unique=True,
            postgresql_where=text("is_active = true"),
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    institution_id: Mapped[int] = mapped_column(
        ForeignKey("institutions.id"), nullable=False, default=1
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    code: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(50), nullable=False, default="General")
    description: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    aliases: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    institution: Mapped["Institution"] = relationship("Institution")
    mappings: Mapped[List["SubjectMapping"]] = relationship(
        "SubjectMapping", back_populates="canonical_subject", cascade="all, delete-orphan"
    )
    legacy_subjects: Mapped[List["Subject"]] = relationship(
        "Subject", back_populates="canonical_subject"
    )


class SubjectMapping(Base):
    """
    Curriculum-level applicability mapping defining how a canonical subject
    is taught within a specific standard, board, and academic year.
    """
    __tablename__ = "subject_mappings"
    __table_args__ = (
        Index(
            "uq_subject_mapping_canonical_std_board_yr",
            "canonical_subject_id",
            "standard_id",
            "board_id",
            "academic_year_id",
            unique=True,
            postgresql_where=text("is_active = true"),
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    canonical_subject_id: Mapped[int] = mapped_column(
        ForeignKey("canonical_subjects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    standard_id: Mapped[int] = mapped_column(
        ForeignKey("standards.id", ondelete="CASCADE"), nullable=False, index=True
    )
    board_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("boards.id", ondelete="SET NULL"), nullable=True, index=True
    )
    academic_year_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("academic_years.id", ondelete="SET NULL"), nullable=True, index=True
    )
    curriculum_code: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    display_name: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    max_marks: Mapped[int] = mapped_column(Integer, default=100)
    pass_marks: Mapped[int] = mapped_column(Integer, default=35)
    is_optional: Mapped[bool] = mapped_column(Boolean, default=False)
    display_order: Mapped[int] = mapped_column(Integer, default=1)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    legacy_subject_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    canonical_subject: Mapped["CanonicalSubject"] = relationship(
        "CanonicalSubject", back_populates="mappings"
    )
    standard: Mapped["Standard"] = relationship("Standard")
    board: Mapped[Optional["Board"]] = relationship("Board")
    academic_year: Mapped[Optional["AcademicYear"]] = relationship("AcademicYear")
    legacy_subject: Mapped[Optional["Subject"]] = relationship("Subject")


class Subject(Base):
    """
    Standard-associated subject record maintained for legacy backward compatibility.
    References canonical_subjects.id to ensure authoritative identity while preserving
    existing foreign key integrity with exam_marks, timetable, and study materials.
    """
    __tablename__ = "subjects"
    __table_args__ = (
        Index(
            "uq_subjects_standard_code",
            "standard_id",
            "code",
            unique=True,
            postgresql_where=text("is_active = true"),
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    standard_id: Mapped[int] = mapped_column(
        ForeignKey("standards.id"), nullable=False
    )
    canonical_subject_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("canonical_subjects.id", ondelete="SET NULL"), nullable=True, index=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    code: Mapped[str] = mapped_column(String(20), nullable=True)
    max_marks: Mapped[int] = mapped_column(Integer, default=100)
    pass_marks: Mapped[int] = mapped_column(Integer, default=35)
    is_optional: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    canonical_subject: Mapped[Optional["CanonicalSubject"]] = relationship(
        "CanonicalSubject", back_populates="legacy_subjects"
    )
    standard: Mapped["Standard"] = relationship(
        "Standard", back_populates="subjects"
    )
    exam_marks: Mapped[list["ExamMark"]] = relationship(
        "ExamMark", back_populates="subject"
    )
