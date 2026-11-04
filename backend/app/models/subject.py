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
#  * @updated     2026-11-04
#  *
#  * @description SQLAlchemy model defining academic curriculum subjects and standard associations.
#  */

from sqlalchemy import String, Boolean, DateTime, ForeignKey, func, Integer, Index, text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from app.core.database import Base


class Subject(Base):
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
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    code: Mapped[str] = mapped_column(String(20), nullable=True)
    max_marks: Mapped[int] = mapped_column(Integer, default=100)
    pass_marks: Mapped[int] = mapped_column(Integer, default=35)
    is_optional: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    standard: Mapped["Standard"] = relationship(
        "Standard", back_populates="subjects"
    )
    exam_marks: Mapped[list["ExamMark"]] = relationship(
        "ExamMark", back_populates="subject"
    )

