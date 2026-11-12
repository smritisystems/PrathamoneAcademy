# /**
#  * @file        homework.py
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
#  * @description SQLAlchemy models for Homework Assignments, Student Tracking Records, Attachments, and Audit Logs.
#  */

from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List
from sqlalchemy import (
    String,
    Boolean,
    DateTime,
    ForeignKey,
    func,
    Date,
    Numeric,
    Integer,
    Text,
    Index,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class HomeworkAssignment(Base):
    __tablename__ = "homework_assignments"
    __table_args__ = (
        Index("ix_hw_inst_ay", "institution_id", "academic_year_id"),
        Index("ix_hw_standard_subject", "standard_id", "subject_id"),
        Index("ix_hw_division", "division_id"),
        Index("ix_hw_teacher", "teacher_user_id"),
        Index("ix_hw_due_date", "due_date"),
        Index("ix_hw_status", "status"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    institution_id: Mapped[int] = mapped_column(
        ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, default=1
    )
    academic_year_id: Mapped[int] = mapped_column(
        ForeignKey("academic_years.id", ondelete="CASCADE"), nullable=False, index=True
    )
    board_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("boards.id", ondelete="SET NULL"), nullable=True
    )
    standard_id: Mapped[int] = mapped_column(
        ForeignKey("standards.id", ondelete="CASCADE"), nullable=False, index=True
    )
    subject_id: Mapped[int] = mapped_column(
        ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    subject_mapping_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("subject_mappings.id", ondelete="SET NULL"), nullable=True, index=True
    )
    division_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("divisions.id", ondelete="SET NULL"), nullable=True, index=True
    )
    teaching_session_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("teaching_sessions.id", ondelete="SET NULL"), nullable=True, index=True
    )
    teacher_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    assignment_code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    instructions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    chapter: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    topic: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    assigned_date: Mapped[date] = mapped_column(Date, nullable=False, default=date.today)
    due_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    due_time: Mapped[str] = mapped_column(String(10), default="23:59", nullable=False)

    max_marks: Mapped[Optional[Decimal]] = mapped_column(Numeric(6, 2), nullable=True)
    difficulty_level: Mapped[str] = mapped_column(String(20), default="medium", nullable=False)  # easy, medium, hard
    priority: Mapped[str] = mapped_column(String(20), default="normal", nullable=False)  # low, normal, high, urgent

    # Assignment Classification & Timing
    # homework | classwork | worksheet | project | practice | revision | reading_assignment | test_preparation | custom
    assignment_type: Mapped[str] = mapped_column(String(40), default="homework", nullable=False, index=True)
    estimated_duration_minutes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Submission methods:
    # 1. physical_notebook, 2. photo_upload, 3. pdf_document, 4. online_text, 5. online_quiz, 6. in_class, 7. no_submission
    submission_method: Mapped[str] = mapped_column(String(30), default="physical_notebook", nullable=False)

    # Recipient types: batch | multi_batch | selected_group | selected_students | individual_student | student_group
    recipient_type: Mapped[str] = mapped_column(String(30), default="batch", nullable=False)
    recipient_batch_ids: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON array of division IDs
    original_recipient_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    late_joiner_policy: Mapped[str] = mapped_column(String(30), default="manual", nullable=False)  # manual | auto_include | exclude

    # Status lifecycle: draft | published | scheduled | closed | archived
    status: Mapped[str] = mapped_column(String(20), default="published", nullable=False, index=True)
    publish_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    published_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    closed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    attachments: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON array of attachment dicts
    allow_late_submissions: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    allow_resubmission: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Reusability & Templates (Phase 6)
    is_template: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    template_name: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)

    created_by_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    institution = relationship("Institution")
    academic_year = relationship("AcademicYear")
    board = relationship("Board")
    standard = relationship("Standard")
    subject = relationship("Subject")
    subject_mapping = relationship("SubjectMapping")
    division = relationship("Division")
    teaching_session = relationship("TeachingSession")
    teacher = relationship("User", foreign_keys=[teacher_user_id])
    created_by = relationship("User", foreign_keys=[created_by_id])

    student_records: Mapped[List["StudentHomeworkRecord"]] = relationship(
        "StudentHomeworkRecord", back_populates="assignment", cascade="all, delete-orphan"
    )
    audit_logs: Mapped[List["HomeworkAuditLog"]] = relationship(
        "HomeworkAuditLog", back_populates="assignment", cascade="all, delete-orphan"
    )
    files: Mapped[List["HomeworkFile"]] = relationship(
        "HomeworkFile", back_populates="assignment", cascade="all, delete-orphan"
    )


class StudentHomeworkRecord(Base):
    __tablename__ = "student_homework_records"
    __table_args__ = (
        UniqueConstraint("assignment_id", "student_id", name="uq_student_hw_assignment_student"),
        Index("ix_student_hw_assignment", "assignment_id"),
        Index("ix_student_hw_student", "student_id"),
        Index("ix_student_hw_status", "status"),
        Index("ix_student_hw_submission", "submission_status"),
        Index("ix_student_hw_review", "review_status"),
        Index("ix_student_hw_due_date", "individual_due_date"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    institution_id: Mapped[int] = mapped_column(
        ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, default=1
    )
    assignment_id: Mapped[int] = mapped_column(
        ForeignKey("homework_assignments.id", ondelete="CASCADE"), nullable=False, index=True
    )
    student_id: Mapped[int] = mapped_column(
        ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True
    )
    enrollment_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("student_enrollments.id", ondelete="SET NULL"), nullable=True, index=True
    )
    division_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("divisions.id", ondelete="SET NULL"), nullable=True, index=True
    )

    publication_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    individual_due_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    individual_due_time: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    is_late_addition: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    addition_reason: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    custom_instructions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    custom_attachments: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON array of attachment dicts

    # Lifecycle Status:
    # assigned | viewed | in_progress | pending | submitted | late_submitted | not_submitted | under_evaluation | evaluated | checked | returned | resubmit_required | reopened | completed | overdue | excused
    status: Mapped[str] = mapped_column(String(30), default="assigned", nullable=False, index=True)
    viewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Submission state & version preservation: pending | submitted | late | not_submitted | excused
    submission_status: Mapped[str] = mapped_column(String(30), default="pending", nullable=False, index=True)
    submission_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    submission_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    submission_files: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON array of uploaded file dicts
    submission_version: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    submission_history: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON array preserving every version

    # Review & Evaluation state: pending | under_evaluation | evaluated | done | incomplete | not_done | absent_not_checked | excused | checked | returned
    review_status: Mapped[str] = mapped_column(String(30), default="pending", nullable=False, index=True)
    marks_obtained: Mapped[Optional[Decimal]] = mapped_column(Numeric(6, 2), nullable=True)
    teacher_remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    teacher_feedback_attachments: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON array of attachment dicts
    reviewed_by_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    evaluation_history: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON array of evaluation/correction logs

    # Extensions & Exemption
    exemption_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    resubmission_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    resubmission_history: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON array of history dicts

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    assignment: Mapped["HomeworkAssignment"] = relationship(
        "HomeworkAssignment", back_populates="student_records"
    )
    student = relationship("Student")
    enrollment = relationship("StudentEnrollment")
    division = relationship("Division")
    reviewed_by = relationship("User", foreign_keys=[reviewed_by_id])


class HomeworkAuditLog(Base):
    __tablename__ = "homework_audit_logs"
    __table_args__ = (
        Index("ix_hw_audit_assignment", "assignment_id"),
        Index("ix_hw_audit_record", "student_record_id"),
        Index("ix_hw_audit_actor", "actor_user_id"),
        Index("ix_hw_audit_action", "action"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    assignment_id: Mapped[int] = mapped_column(
        ForeignKey("homework_assignments.id", ondelete="CASCADE"), nullable=False, index=True
    )
    student_record_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("student_homework_records.id", ondelete="CASCADE"), nullable=True, index=True
    )
    actor_user_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    action: Mapped[str] = mapped_column(String(50), nullable=False)
    previous_status: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    new_status: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    details: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    assignment = relationship("HomeworkAssignment", back_populates="audit_logs")
    student_record = relationship("StudentHomeworkRecord")
    actor = relationship("User", foreign_keys=[actor_user_id])


class HomeworkFile(Base):
    """
    Access-controlled uploaded document metadata for homework instructions,
    student-specific attachments, digital submissions, and teacher evaluation feedback.
    """
    __tablename__ = "homework_files"
    __table_args__ = (
        Index("ix_hw_files_institution", "institution_id"),
        Index("ix_hw_files_assignment", "assignment_id"),
        Index("ix_hw_files_record", "student_record_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    institution_id: Mapped[int] = mapped_column(
        ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, default=1
    )
    assignment_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("homework_assignments.id", ondelete="CASCADE"), nullable=True, index=True
    )
    student_record_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("student_homework_records.id", ondelete="CASCADE"), nullable=True, index=True
    )
    uploader_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    context: Mapped[str] = mapped_column(
        String(40), nullable=False, default="assignment_attachment"
    )  # assignment_attachment | student_custom_attachment | submission_file | evaluation_attachment
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    stored_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    storage_path: Mapped[str] = mapped_column(String(500), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(150), nullable=False)
    extension: Mapped[str] = mapped_column(String(20), nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    sha256_checksum: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    assignment = relationship("HomeworkAssignment", back_populates="files")
    student_record = relationship("StudentHomeworkRecord")
    uploader = relationship("User", foreign_keys=[uploader_user_id])

