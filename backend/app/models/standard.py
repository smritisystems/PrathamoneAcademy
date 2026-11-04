# /**
#  * @file        standard.py
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
#  * @description SQLAlchemy model defining standard/class levels associated with education boards.
#  */

from sqlalchemy import String, Boolean, DateTime, ForeignKey, func, Integer, Index, text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from app.core.database import Base


class Standard(Base):
    __tablename__ = "standards"
    __table_args__ = (
        Index(
            "uq_standards_institution_level",
            "institution_id",
            "level",
            unique=True,
            postgresql_where=text("is_active = true"),
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    institution_id: Mapped[int] = mapped_column(
        ForeignKey("institutions.id"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    level: Mapped[int] = mapped_column(Integer, nullable=False)
    description: Mapped[str] = mapped_column(String(200), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    institution: Mapped["Institution"] = relationship(
        "Institution", back_populates="standards"
    )
    divisions: Mapped[list["Division"]] = relationship(
        "Division", back_populates="standard"
    )
    subjects: Mapped[list["Subject"]] = relationship(
        "Subject", back_populates="standard"
    )

