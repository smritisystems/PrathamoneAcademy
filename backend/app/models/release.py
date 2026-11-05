# /**
#  * @file        release.py
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
#  * @updated     2026-11-05
#  *
#  * @description SQLAlchemy ORM models for application releases, version management, change tracking, and deployment lifecycles.
#  */

from datetime import datetime
from sqlalchemy import (
    String,
    Text,
    Boolean,
    DateTime,
    ForeignKey,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class SystemRelease(Base):
    """
    Authoritative record for an application release, tracking change notes,
    semantic versioning, build metadata, validation outcomes, and approval lifecycles.
    """
    __tablename__ = "system_releases"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    version: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False, index=True
    )
    build_number: Mapped[str] = mapped_column(String(100), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    
    # Lifecycle: 'draft' -> 'validating' -> 'release_candidate' -> 'approved' -> 'published' (or 'rolled_back')
    status: Mapped[str] = mapped_column(
        String(30), nullable=False, default="draft", index=True
    )
    environment: Mapped[str] = mapped_column(
        String(30), nullable=False, default="production"
    )

    # Git & Change Tracking
    git_branch: Mapped[str | None] = mapped_column(String(100), nullable=True)
    git_commit_start: Mapped[str | None] = mapped_column(String(50), nullable=True)
    git_commit_end: Mapped[str | None] = mapped_column(String(50), nullable=True)
    git_tag: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Change Documentation & Grouping
    release_notes_markdown: Mapped[str] = mapped_column(Text, nullable=False)
    # JSON containing: { added: [], changed: [], fixed: [], security: [], database: [], deprecated: [] }
    release_notes_structured: Mapped[str] = mapped_column(
        Text, nullable=False, default="{}"
    )
    # JSON containing: { total_commits: int, changed_files: int, migrations: int, affected_modules: [] }
    change_summary: Mapped[str] = mapped_column(Text, nullable=False, default="{}")

    # CI/CD & Pre-flight Validation
    validation_status: Mapped[str] = mapped_column(
        String(30), nullable=False, default="pending"
    )  # 'pending', 'in_progress', 'passed', 'failed'
    validation_results: Mapped[str] = mapped_column(
        Text, nullable=False, default="{}"
    )  # JSON dict with detailed test, lint, header, secret check metrics
    is_critical_security: Mapped[bool] = mapped_column(Boolean, default=False)
    requires_db_backup: Mapped[bool] = mapped_column(Boolean, default=True)
    migration_plan: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Authoritative Governance & RBAC Audit
    created_by_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"), nullable=False
    )
    approved_by_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )
    published_by_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )
    rolled_back_by_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )
    rollback_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    rollback_target_version: Mapped[str | None] = mapped_column(
        String(50), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    approved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    published_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    rolled_back_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    created_by: Mapped["User"] = relationship(
        "User", foreign_keys=[created_by_id]
    )
    approved_by: Mapped["User | None"] = relationship(
        "User", foreign_keys=[approved_by_id]
    )
    published_by: Mapped["User | None"] = relationship(
        "User", foreign_keys=[published_by_id]
    )
    rolled_back_by: Mapped["User | None"] = relationship(
        "User", foreign_keys=[rolled_back_by_id]
    )
