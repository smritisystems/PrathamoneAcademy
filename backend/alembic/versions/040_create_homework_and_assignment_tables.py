# /**
#  * @file        040_create_homework_and_assignment_tables.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      backend.alembic.versions
#  *
#  * @author      Jawahar R. Mallah
#  * @organization AITDL (AI Technology & Development Lab)
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 AITDL
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-11
#  * @updated     2026-11-11
#  *
#  * @description Schema migration creating homework_assignments, student_homework_records, and homework_audit_logs tables.
#  */

"""create_homework_and_assignment_tables

Revision ID: 040_homework_system
Revises: 039_staff_reporting
Create Date: 2026-11-11 00:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '040_homework_system'
down_revision = '039_staff_reporting'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Create homework_assignments table
    op.create_table(
        'homework_assignments',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('institution_id', sa.Integer(), sa.ForeignKey('institutions.id', ondelete='CASCADE'), nullable=False, server_default='1'),
        sa.Column('academic_year_id', sa.Integer(), sa.ForeignKey('academic_years.id', ondelete='CASCADE'), nullable=False),
        sa.Column('board_id', sa.Integer(), sa.ForeignKey('boards.id', ondelete='SET NULL'), nullable=True),
        sa.Column('standard_id', sa.Integer(), sa.ForeignKey('standards.id', ondelete='CASCADE'), nullable=False),
        sa.Column('subject_id', sa.Integer(), sa.ForeignKey('subjects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('subject_mapping_id', sa.Integer(), sa.ForeignKey('subject_mappings.id', ondelete='SET NULL'), nullable=True),
        sa.Column('division_id', sa.Integer(), sa.ForeignKey('divisions.id', ondelete='SET NULL'), nullable=True),
        sa.Column('teaching_session_id', sa.Integer(), sa.ForeignKey('teaching_sessions.id', ondelete='SET NULL'), nullable=True),
        sa.Column('teacher_user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('assignment_code', sa.String(length=50), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('instructions', sa.Text(), nullable=True),
        sa.Column('chapter', sa.String(length=150), nullable=True),
        sa.Column('topic', sa.String(length=255), nullable=True),
        sa.Column('assigned_date', sa.Date(), nullable=False, server_default=sa.func.current_date()),
        sa.Column('due_date', sa.Date(), nullable=False),
        sa.Column('due_time', sa.String(length=10), nullable=False, server_default='23:59'),
        sa.Column('max_marks', sa.Numeric(precision=6, scale=2), nullable=True),
        sa.Column('difficulty_level', sa.String(length=20), nullable=False, server_default='medium'),
        sa.Column('priority', sa.String(length=20), nullable=False, server_default='normal'),
        sa.Column('submission_method', sa.String(length=30), nullable=False, server_default='physical_notebook'),
        sa.Column('recipient_type', sa.String(length=30), nullable=False, server_default='batch'),
        sa.Column('recipient_batch_ids', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='published'),
        sa.Column('publish_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('attachments', sa.Text(), nullable=True),
        sa.Column('allow_late_submissions', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('is_template', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('template_name', sa.String(length=150), nullable=True),
        sa.Column('created_by_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )
    op.create_index('ix_homework_assignments_id', 'homework_assignments', ['id'])
    op.create_index('ix_homework_assignments_code', 'homework_assignments', ['assignment_code'], unique=True)
    op.create_index('ix_hw_inst_ay', 'homework_assignments', ['institution_id', 'academic_year_id'])
    op.create_index('ix_hw_standard_subject', 'homework_assignments', ['standard_id', 'subject_id'])
    op.create_index('ix_hw_division', 'homework_assignments', ['division_id'])
    op.create_index('ix_hw_teacher', 'homework_assignments', ['teacher_user_id'])
    op.create_index('ix_hw_due_date', 'homework_assignments', ['due_date'])
    op.create_index('ix_hw_status', 'homework_assignments', ['status'])
    op.create_index('ix_hw_is_template', 'homework_assignments', ['is_template'])

    # 2. Create student_homework_records table
    op.create_table(
        'student_homework_records',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('institution_id', sa.Integer(), sa.ForeignKey('institutions.id', ondelete='CASCADE'), nullable=False, server_default='1'),
        sa.Column('assignment_id', sa.Integer(), sa.ForeignKey('homework_assignments.id', ondelete='CASCADE'), nullable=False),
        sa.Column('student_id', sa.Integer(), sa.ForeignKey('students.id', ondelete='CASCADE'), nullable=False),
        sa.Column('enrollment_id', sa.Integer(), sa.ForeignKey('student_enrollments.id', ondelete='SET NULL'), nullable=True),
        sa.Column('division_id', sa.Integer(), sa.ForeignKey('divisions.id', ondelete='SET NULL'), nullable=True),
        sa.Column('publication_time', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('individual_due_date', sa.Date(), nullable=True),
        sa.Column('individual_due_time', sa.String(length=10), nullable=True),
        sa.Column('status', sa.String(length=30), nullable=False, server_default='assigned'),
        sa.Column('viewed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('submission_status', sa.String(length=30), nullable=False, server_default='pending'),
        sa.Column('submission_time', sa.DateTime(timezone=True), nullable=True),
        sa.Column('submission_text', sa.Text(), nullable=True),
        sa.Column('submission_files', sa.Text(), nullable=True),
        sa.Column('review_status', sa.String(length=30), nullable=False, server_default='pending'),
        sa.Column('marks_obtained', sa.Numeric(precision=6, scale=2), nullable=True),
        sa.Column('teacher_remarks', sa.Text(), nullable=True),
        sa.Column('reviewed_by_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('exemption_reason', sa.Text(), nullable=True),
        sa.Column('resubmission_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('resubmission_history', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
        sa.UniqueConstraint('assignment_id', 'student_id', name='uq_student_hw_assignment_student'),
    )
    op.create_index('ix_student_homework_records_id', 'student_homework_records', ['id'])
    op.create_index('ix_student_hw_assignment', 'student_homework_records', ['assignment_id'])
    op.create_index('ix_student_hw_student', 'student_homework_records', ['student_id'])
    op.create_index('ix_student_hw_status', 'student_homework_records', ['status'])
    op.create_index('ix_student_hw_submission', 'student_homework_records', ['submission_status'])
    op.create_index('ix_student_hw_review', 'student_homework_records', ['review_status'])
    op.create_index('ix_student_hw_due_date', 'student_homework_records', ['individual_due_date'])

    # 3. Create homework_audit_logs table
    op.create_table(
        'homework_audit_logs',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('assignment_id', sa.Integer(), sa.ForeignKey('homework_assignments.id', ondelete='CASCADE'), nullable=False),
        sa.Column('student_record_id', sa.Integer(), sa.ForeignKey('student_homework_records.id', ondelete='CASCADE'), nullable=True),
        sa.Column('actor_user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('action', sa.String(length=50), nullable=False),
        sa.Column('previous_status', sa.String(length=30), nullable=True),
        sa.Column('new_status', sa.String(length=30), nullable=True),
        sa.Column('details', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_homework_audit_logs_id', 'homework_audit_logs', ['id'])
    op.create_index('ix_hw_audit_assignment', 'homework_audit_logs', ['assignment_id'])
    op.create_index('ix_hw_audit_record', 'homework_audit_logs', ['student_record_id'])
    op.create_index('ix_hw_audit_actor', 'homework_audit_logs', ['actor_user_id'])
    op.create_index('ix_hw_audit_action', 'homework_audit_logs', ['action'])


def downgrade() -> None:
    op.drop_table('homework_audit_logs')
    op.drop_table('student_homework_records')
    op.drop_table('homework_assignments')

