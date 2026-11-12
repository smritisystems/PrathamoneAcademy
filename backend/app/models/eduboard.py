# /**
#  * @file        eduboard.py
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
#  * @created     2026-11-12
#  * @updated     2026-11-12
#  *
#  * @description SQLAlchemy ORM models for PrathamOne EduBoard (boards, multi-page vector scenes, revisions, and authenticated attachments).
#  */

from datetime import datetime
from typing import Optional, List
from sqlalchemy import (
    String,
    Boolean,
    DateTime,
    ForeignKey,
    func,
    Integer,
    Text,
    Index,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class EduBoard(Base):
    """
    Master Classroom Teaching Board entity bound to existing Institution,
    AcademicYear, Standard, Division, Subject, TeachingSession, and Teacher User.
    Supports Classic Chalkboard, Digital Whiteboard, and PDF Presentation modes.
    """

    __tablename__ = "edu_boards"
    __table_args__ = (
        Index("ix_eduboard_inst_env", "institution_id", "is_demo"),
        Index("ix_eduboard_ay_div", "academic_year_id", "division_id"),
        Index("ix_eduboard_teacher", "teacher_user_id"),
        Index("ix_eduboard_session", "teaching_session_id"),
        Index("ix_eduboard_status", "status"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    board_code: Mapped[str] = mapped_column(String(60), unique=True, nullable=False, index=True)
    institution_id: Mapped[int] = mapped_column(
        ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, default=1
    )
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false", nullable=False, index=True)

    # Academic Spine References (SSOT — Reuse Existing Masters)
    academic_year_id: Mapped[int] = mapped_column(
        ForeignKey("academic_years.id", ondelete="CASCADE"), nullable=False, index=True
    )
    teaching_session_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("teaching_sessions.id", ondelete="SET NULL"), nullable=True, index=True
    )
    timetable_entry_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("timetable_entries.id", ondelete="SET NULL"), nullable=True, index=True
    )
    teacher_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    standard_id: Mapped[int] = mapped_column(
        ForeignKey("standards.id", ondelete="CASCADE"), nullable=False, index=True
    )
    division_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("divisions.id", ondelete="SET NULL"), nullable=True, index=True
    )
    subject_id: Mapped[int] = mapped_column(
        ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    subject_mapping_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("subject_mappings.id", ondelete="SET NULL"), nullable=True, index=True
    )

    # Board Metadata & Mode
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    topic: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    # classic | whiteboard | presentation
    board_mode_default: Mapped[str] = mapped_column(String(30), default="whiteboard", nullable=False)
    # draft | active | published | closed | archived
    status: Mapped[str] = mapped_column(String(30), default="draft", nullable=False, index=True)

    is_template: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false", nullable=False, index=True)
    template_category: Mapped[Optional[str]] = mapped_column(String(60), nullable=True)

    # Opt-in collaboration flag & temporary student drawing permission scaffolding
    collaboration_enabled: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false", nullable=False)
    published_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    published_by_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    # Revision & Concurrency Spine
    latest_revision_no: Mapped[int] = mapped_column(Integer, default=1, server_default="1", nullable=False)
    page_count: Mapped[int] = mapped_column(Integer, default=1, server_default="1", nullable=False)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false", nullable=False, index=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    institution = relationship("Institution")
    academic_year = relationship("AcademicYear")
    teaching_session = relationship("TeachingSession")
    timetable_entry = relationship("TimetableEntry")
    teacher = relationship("User", foreign_keys=[teacher_user_id])
    published_by = relationship("User", foreign_keys=[published_by_id])
    standard = relationship("Standard")
    division = relationship("Division")
    subject = relationship("Subject")
    subject_mapping = relationship("SubjectMapping")

    pages: Mapped[List["EduBoardPage"]] = relationship(
        "EduBoardPage",
        back_populates="board",
        cascade="all, delete-orphan",
        order_by="EduBoardPage.page_order",
    )
    revisions: Mapped[List["EduBoardRevision"]] = relationship(
        "EduBoardRevision",
        back_populates="board",
        cascade="all, delete-orphan",
        order_by="EduBoardRevision.revision_no.desc()",
    )
    attachments: Mapped[List["EduBoardAttachment"]] = relationship(
        "EduBoardAttachment",
        back_populates="board",
        cascade="all, delete-orphan",
    )


class EduBoardPage(Base):
    """
    Ordered canvas page storing board mode, background surface, immutable source PDF reference
    (when in Presentation Mode), Konva/freehand vector scene JSON, and optimistic lock version.
    """

    __tablename__ = "edu_board_pages"
    __table_args__ = (
        UniqueConstraint("board_id", "page_uid", name="uq_eduboard_page_uid"),
        Index("ix_eduboard_pages_board_order", "board_id", "page_order"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    board_id: Mapped[int] = mapped_column(
        ForeignKey("edu_boards.id", ondelete="CASCADE"), nullable=False, index=True
    )
    page_uid: Mapped[str] = mapped_column(String(64), nullable=False)
    page_order: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    title: Mapped[str] = mapped_column(String(150), default="Page 1", nullable=False)
    # classic | whiteboard | presentation
    mode: Mapped[str] = mapped_column(String(30), default="whiteboard", nullable=False)
    # blackboard | greenboard | white | grid | notebook | pdf_slide
    background_style: Mapped[str] = mapped_column(String(30), default="white", nullable=False)

    # Immutable source document link (PDF slide overlay without mutating original document)
    source_attachment_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("edu_board_attachments.id", ondelete="SET NULL"), nullable=True, index=True
    )
    source_page_number: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # JSON vector scene payload: {"schemaVersion":1,"elements":[...],"viewport":{...}}
    scene_json: Mapped[str] = mapped_column(Text, default='{"schemaVersion":1,"elements":[]}', nullable=False)
    version: Mapped[int] = mapped_column(Integer, default=1, server_default="1", nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    board: Mapped["EduBoard"] = relationship("EduBoard", back_populates="pages")
    source_attachment: Mapped[Optional["EduBoardAttachment"]] = relationship(
        "EduBoardAttachment", foreign_keys=[source_attachment_id]
    )


class EduBoardRevision(Base):
    """
    Immutable revision history snapshot preserving board states across manual saves,
    debounced autosaves, publishes, and restores.
    """

    __tablename__ = "edu_board_revisions"
    __table_args__ = (
        UniqueConstraint("board_id", "revision_no", name="uq_eduboard_revision_no"),
        Index("ix_eduboard_rev_board_created", "board_id", "created_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    board_id: Mapped[int] = mapped_column(
        ForeignKey("edu_boards.id", ondelete="CASCADE"), nullable=False, index=True
    )
    revision_no: Mapped[int] = mapped_column(Integer, nullable=False)
    # autosave | manual | publish | restore
    save_type: Mapped[str] = mapped_column(String(30), default="manual", nullable=False)
    created_by_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    snapshot_json: Mapped[str] = mapped_column(Text, nullable=False)
    note: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    board: Mapped["EduBoard"] = relationship("EduBoard", back_populates="revisions")
    created_by = relationship("User", foreign_keys=[created_by_id])


class EduBoardAttachment(Base):
    """
    Access-controlled document/image store for EduBoard presentations and canvas media.
    Enforces MIME, extension, SHA-256 checksum, tenant/demo isolation, and immutability.
    """

    __tablename__ = "edu_board_attachments"
    __table_args__ = (
        Index("ix_eb_att_inst_env", "institution_id", "is_demo"),
        Index("ix_eb_att_board", "board_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    institution_id: Mapped[int] = mapped_column(
        ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, default=1
    )
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false", nullable=False, index=True)
    board_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("edu_boards.id", ondelete="CASCADE"), nullable=True, index=True
    )
    uploader_user_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    # source_document | canvas_image | exported_pdf
    attachment_role: Mapped[str] = mapped_column(String(40), default="source_document", nullable=False)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    stored_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    storage_path: Mapped[str] = mapped_column(String(500), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(150), nullable=False)
    extension: Mapped[str] = mapped_column(String(20), nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    sha256_checksum: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    page_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    is_immutable: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    board: Mapped[Optional["EduBoard"]] = relationship("EduBoard", back_populates="attachments")
    uploader = relationship("User", foreign_keys=[uploader_user_id])

