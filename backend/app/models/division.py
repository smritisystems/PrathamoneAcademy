# /**
#  * @file        division.py
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
#  * @description SQLAlchemy model defining batch/division sections, classroom capacity, and assigned faculty.
#  */

from sqlalchemy import String, Boolean, DateTime, ForeignKey, func, Integer, Index, text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from app.core.database import Base


class Division(Base):
    __tablename__ = "divisions"
    __table_args__ = (
        Index(
            "uq_divisions_standard_board_code",
            "standard_id",
            "board_id",
            "code",
            unique=True,
            postgresql_where=text("is_active = true AND code IS NOT NULL"),
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    standard_id: Mapped[int] = mapped_column(
        ForeignKey("standards.id"), nullable=False
    )
    board_id: Mapped[int | None] = mapped_column(
        ForeignKey("boards.id"), nullable=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    room_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    schedule_timing: Mapped[str | None] = mapped_column(String(100), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="active", server_default="active")
    capacity: Mapped[int] = mapped_column(Integer, default=40)
    class_teacher_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    standard: Mapped["Standard"] = relationship(
        "Standard", back_populates="divisions"
    )
    board: Mapped["Board | None"] = relationship(
        "Board", back_populates="divisions"
    )
    class_teacher: Mapped["User | None"] = relationship(
        "User", foreign_keys=[class_teacher_id]
    )
    enrollments: Mapped[list["StudentEnrollment"]] = relationship(
        "StudentEnrollment", back_populates="division"
    )

