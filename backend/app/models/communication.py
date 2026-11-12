# /**
#  * @file        communication.py
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
#  * @created     2026-11-05
#  * @updated     2026-11-12
#  *
#  * @description SQLAlchemy ORM models for Message Templates, Communication Logs, and Expiring Shared Document Tokens.
#  */

from sqlalchemy import String, Text, Boolean, Integer, DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from typing import Optional
from app.core.database import Base


class MessageTemplate(Base):
    __tablename__ = "message_templates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    institution_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    code: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    channel: Mapped[str] = mapped_column(String(30), nullable=False, default="ALL")
    subject: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    variables: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON array of tokens
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    is_system: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    institution = relationship("Institution", back_populates="message_templates")

    __table_args__ = (
        UniqueConstraint("institution_id", "code", name="uq_institution_template_code"),
    )


class CommunicationLog(Base):
    __tablename__ = "communication_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    institution_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    channel: Mapped[str] = mapped_column(String(30), nullable=False, index=True)  # WHATSAPP, EMAIL, SMS, DIRECT_LINK, DOWNLOAD, PRINT
    recipient_type: Mapped[str] = mapped_column(String(30), nullable=False)  # STUDENT, PARENT, STAFF, CLASS, BATCH, CUSTOM
    recipient_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    recipient_name: Mapped[str] = mapped_column(String(150), nullable=False)
    recipient_destination: Mapped[str] = mapped_column(String(255), nullable=False)  # Phone or Email
    template_code: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    subject: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="SENT", index=True)  # QUEUED, SENT, DELIVERED, FAILED
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    metadata_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    sender_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    sender_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    lead_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("leads.id", ondelete="SET NULL"), nullable=True, index=True
    )
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    data_environment: Mapped[str] = mapped_column(String(20), default="PRODUCTION", nullable=False, index=True)
    demo_dataset_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    scheduled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )

    institution = relationship("Institution", back_populates="communication_logs")
    sender = relationship("User", foreign_keys=[sender_id])
    lead = relationship("Lead", back_populates="communications", lazy="selectin")


class SharedDocumentToken(Base):
    __tablename__ = "shared_document_tokens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    token: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    institution_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    document_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)  # RECEIPT, REPORT_CARD, KYC_FORM, FEE_STATEMENT, etc.
    record_id: Mapped[int] = mapped_column(Integer, nullable=False)
    access_key: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    recipient_name: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    recipient_phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    recipient_email: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    max_views: Mapped[int] = mapped_column(Integer, nullable=False, default=25)
    view_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_revoked: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_by_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    institution = relationship("Institution")
    created_by = relationship("User", foreign_keys=[created_by_id])

