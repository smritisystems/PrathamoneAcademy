# /**
#  * @file        help.py
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
#  * @created     2026-11-11
#  * @updated     2026-11-12
#  *
#  * @description SQLAlchemy ORM models for Help & About Centre documentation, revision history, and customer support ticketing.
#  */

from datetime import datetime
from typing import Optional
from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class HelpCategory(Base):
    """Configuration/Master table organizing Help & About Centre sections and article categories."""

    __tablename__ = "help_categories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    slug: Mapped[str] = mapped_column(String(80), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    section: Mapped[str] = mapped_column(
        String(40), nullable=False, index=True
    )  # getting_started | module_guide | tutorial | faq | legal
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    icon: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    articles: Mapped[list["HelpArticle"]] = relationship(
        "HelpArticle", back_populates="category"
    )


class HelpArticle(Base):
    """Master table storing customer-facing guides, tutorials, FAQs, and legal compliance documents."""

    __tablename__ = "help_articles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    slug: Mapped[str] = mapped_column(String(120), unique=True, nullable=False, index=True)
    category_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("help_categories.id", ondelete="SET NULL"), nullable=True, index=True
    )
    section: Mapped[str] = mapped_column(
        String(40), nullable=False, index=True
    )  # getting_started | module_guide | tutorial | faq | legal
    module_key: Mapped[Optional[str]] = mapped_column(String(60), nullable=True, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    content_markdown: Mapped[str] = mapped_column(Text, nullable=False)
    tags: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON array of keywords
    required_permissions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON array
    related_routes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON array
    related_slugs: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON array
    doc_version: Mapped[str] = mapped_column(String(20), nullable=False, default="1.0")
    status: Mapped[str] = mapped_column(
        String(30), nullable=False, default="published", index=True
    )  # draft | pending_approval | published | unpublished
    approval_status: Mapped[str] = mapped_column(
        String(30), nullable=False, default="approved", index=True
    )  # approved | pending_approval
    approved_by_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    published_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    is_system: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_by_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    updated_by_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    category: Mapped[Optional["HelpCategory"]] = relationship(
        "HelpCategory", back_populates="articles"
    )
    revisions: Mapped[list["HelpArticleRevision"]] = relationship(
        "HelpArticleRevision",
        back_populates="article",
        cascade="all, delete-orphan",
        order_by="desc(HelpArticleRevision.created_at)",
    )


class HelpArticleRevision(Base):
    """Immutable ledger table recording content version and approval history for Help & Legal articles."""

    __tablename__ = "help_article_revisions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    article_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("help_articles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    doc_version: Mapped[str] = mapped_column(String(20), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    content_markdown: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(30), nullable=False)
    approval_status: Mapped[str] = mapped_column(String(30), nullable=False)
    change_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    changed_by_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    changed_by_name: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    article: Mapped["HelpArticle"] = relationship("HelpArticle", back_populates="revisions")


class SupportRequest(Base):
    """Transaction table storing customer support tickets, bug reports, feature requests, and feedback."""

    __tablename__ = "support_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ticket_number: Mapped[str] = mapped_column(String(40), unique=True, nullable=False, index=True)
    institution_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    request_type: Mapped[str] = mapped_column(
        String(30), nullable=False, default="support_request", index=True
    )  # support_request | bug_report | feature_request | feedback
    category: Mapped[str] = mapped_column(String(50), nullable=False, default="general", index=True)
    priority: Mapped[str] = mapped_column(String(20), nullable=False, default="medium")
    subject: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    module_key: Mapped[Optional[str]] = mapped_column(String(60), nullable=True)
    page_route: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    error_reference_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    contact_email: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    contact_phone: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
    status: Mapped[str] = mapped_column(
        String(30), nullable=False, default="open", index=True
    )  # open | in_progress | waiting_on_customer | resolved | closed
    resolution_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    assigned_to_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    user = relationship("User", foreign_keys=[user_id])
    assigned_to = relationship("User", foreign_keys=[assigned_to_id])
    comments: Mapped[list["SupportRequestComment"]] = relationship(
        "SupportRequestComment",
        back_populates="request",
        cascade="all, delete-orphan",
        order_by="SupportRequestComment.created_at",
    )


class SupportRequestComment(Base):
    """Ledger table recording conversation updates and administrative notes on support requests."""

    __tablename__ = "support_request_comments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    request_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("support_requests.id", ondelete="CASCADE"), nullable=False, index=True
    )
    author_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    author_name: Mapped[str] = mapped_column(String(120), nullable=False)
    author_role: Mapped[str] = mapped_column(String(40), nullable=False, default="staff")
    message: Mapped[str] = mapped_column(Text, nullable=False)
    is_internal_note: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    request: Mapped["SupportRequest"] = relationship("SupportRequest", back_populates="comments")
