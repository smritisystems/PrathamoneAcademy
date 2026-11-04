# /**
#  * @file        import_log.py
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
#  * @created     2026-11-04
#  * @updated     2026-11-04
#  *
#  * @description SQLAlchemy model defining data import/export job logs, statuses, and error summaries.
#  */

from sqlalchemy import String, Boolean, DateTime, ForeignKey, func, Numeric, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime
from decimal import Decimal
from app.core.database import Base


class FeeRegisterImport(Base):
    __tablename__ = "fee_register_imports"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    academic_year_id: Mapped[int] = mapped_column(ForeignKey("academic_years.id"), nullable=False)
    institution_id: Mapped[int] = mapped_column(ForeignKey("institutions.id"), nullable=False)
    imported_students_count: Mapped[int] = mapped_column(Integer, default=0)
    imported_payments_count: Mapped[int] = mapped_column(Integer, default=0)
    total_fees: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    total_collected: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    total_outstanding: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    reconciliation_summary: Mapped[str] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="completed")
    imported_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class DataImportLog(Base):
    __tablename__ = "data_import_logs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    institution_id: Mapped[int] = mapped_column(ForeignKey("institutions.id"), nullable=False)
    academic_year_id: Mapped[int | None] = mapped_column(ForeignKey("academic_years.id"), nullable=True)
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    import_mode: Mapped[str] = mapped_column(String(30), default="create_only")
    source_type: Mapped[str] = mapped_column(String(20), default="file")
    file_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    total_rows: Mapped[int] = mapped_column(Integer, default=0)
    successful_rows: Mapped[int] = mapped_column(Integer, default=0)
    failed_rows: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(30), default="completed")
    error_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    reconciliation_data: Mapped[str | None] = mapped_column(Text, nullable=True)
    imported_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

