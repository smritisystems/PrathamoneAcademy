# /**
#  * @file        012_communication_and_sharing.py
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
#  * @created     2026-11-05
#  * @updated     2026-11-05
#  *
#  * @description Database migration creating message_templates, communication_logs, and shared_document_tokens.
#  */

"""Add message templates, communication logs, and shared document tokens

Revision ID: 012_comm_sharing
Revises: 011_settings_lookups
Create Date: 2026-11-05 02:20:00.000000

"""
from alembic import op
import sqlalchemy as sa
import json


revision = "012_comm_sharing"
down_revision = "011_settings_lookups"
branch_labels = None
depends_on = None

DEFAULT_TEMPLATES = [
    {
        "name": "Payment Receipt Confirmation",
        "code": "PAYMENT_RECEIPT",
        "category": "PAYMENT_RECEIPT",
        "channel": "ALL",
        "subject": "Payment Receipt #{receipt_no} - {institute_name}",
        "body": "Dear {parent_name}, received payment of {currency}{amount} for {student_name} (Class {class_name}, Batch {batch_name}). Receipt No: {receipt_no}. View official receipt: {link}. Thank you, {institute_name}.",
        "variables": json.dumps(["parent_name", "student_name", "currency", "amount", "class_name", "batch_name", "receipt_no", "link", "institute_name"]),
        "is_system": True,
    },
    {
        "name": "Fee Installment Due Reminder",
        "code": "FEE_REMINDER",
        "category": "FEE_REMINDER",
        "channel": "ALL",
        "subject": "Fee Due Reminder for {student_name} - {institute_name}",
        "body": "Dear {parent_name}, fee installment of {currency}{amount} for {student_name} is due on {due_date}. Please ensure timely settlement. For details view: {link}. Regards, {institute_name}.",
        "variables": json.dumps(["parent_name", "student_name", "currency", "amount", "due_date", "link", "institute_name"]),
        "is_system": True,
    },
    {
        "name": "Fee Overdue Urgent Alert",
        "code": "FEE_OVERDUE_ALERT",
        "category": "FEE_REMINDER",
        "channel": "ALL",
        "subject": "URGENT: Outstanding Fee Overdue - {student_name}",
        "body": "Dear {parent_name}, gentle reminder that fee installment of {currency}{amount} for {student_name} is overdue. Kindly settle at your earliest convenience. Link: {link}. Helpline: {contact_phone}.",
        "variables": json.dumps(["parent_name", "student_name", "currency", "amount", "link", "contact_phone", "institute_name"]),
        "is_system": True,
    },
    {
        "name": "Daily Absence Notification",
        "code": "ATTENDANCE_ABSENCE",
        "category": "ATTENDANCE_ALERT",
        "channel": "ALL",
        "subject": "Absence Notification for {student_name}",
        "body": "Dear {parent_name}, your ward {student_name} was marked ABSENT today ({date}) in {batch_name}. For queries, please contact academy office at {contact_phone}. {institute_name}.",
        "variables": json.dumps(["parent_name", "student_name", "date", "batch_name", "contact_phone", "institute_name"]),
        "is_system": True,
    },
    {
        "name": "Exam Result & Report Card Published",
        "code": "EXAM_RESULT",
        "category": "EXAM_RESULT",
        "channel": "ALL",
        "subject": "Exam Results Published: {exam_name} - {student_name}",
        "body": "Dear {parent_name}, results for {exam_name} have been published. {student_name} scored {obtained_marks}/{max_marks} ({percentage}%). View detailed score card: {link}. {institute_name}.",
        "variables": json.dumps(["parent_name", "student_name", "exam_name", "obtained_marks", "max_marks", "percentage", "link", "institute_name"]),
        "is_system": True,
    },
    {
        "name": "Admission Confirmation & Welcome",
        "code": "ADMISSION_CONFIRMATION",
        "category": "ADMISSION",
        "channel": "ALL",
        "subject": "Welcome to {institute_name} - Admission Confirmed",
        "body": "Welcome to {institute_name}! Admission confirmed for {student_name} in Class {class_name}, Roll No: {roll_number}. Student Portal: {link}. Wishing all success!",
        "variables": json.dumps(["institute_name", "student_name", "class_name", "roll_number", "link"]),
        "is_system": True,
    },
    {
        "name": "General Institute Announcement",
        "code": "GENERAL_ANNOUNCEMENT",
        "category": "ANNOUNCEMENT",
        "channel": "ALL",
        "subject": "Notice from {institute_name}: {announcement_title}",
        "body": "Dear Students & Parents, {announcement_title}: {announcement_body}. For queries call {contact_phone}. Regards, {institute_name}.",
        "variables": json.dumps(["institute_name", "announcement_title", "announcement_body", "contact_phone"]),
        "is_system": True,
    },
    {
        "name": "Staff Official Notice",
        "code": "STAFF_NOTICE",
        "category": "STAFF_NOTICE",
        "channel": "ALL",
        "subject": "Staff Notice: {notice_title} - {institute_name}",
        "body": "Dear Faculty & Staff, {notice_title}: {notice_body}. Please note and adhere accordingly. Office of the Principal, {institute_name}.",
        "variables": json.dumps(["institute_name", "notice_title", "notice_body"]),
        "is_system": True,
    },
]


def upgrade() -> None:
    # 1. message_templates
    op.create_table(
        "message_templates",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("institution_id", sa.Integer(), sa.ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("code", sa.String(length=50), nullable=False),
        sa.Column("category", sa.String(length=50), nullable=False),
        sa.Column("channel", sa.String(length=30), nullable=False, server_default="ALL"),
        sa.Column("subject", sa.String(length=255), nullable=True),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("variables", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("is_system", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("institution_id", "code", name="uq_institution_template_code"),
    )
    op.create_index(op.f("ix_message_templates_institution_id"), "message_templates", ["institution_id"], unique=False)
    op.create_index(op.f("ix_message_templates_code"), "message_templates", ["code"], unique=False)
    op.create_index(op.f("ix_message_templates_category"), "message_templates", ["category"], unique=False)

    # 2. communication_logs
    op.create_table(
        "communication_logs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("institution_id", sa.Integer(), sa.ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("channel", sa.String(length=30), nullable=False),
        sa.Column("recipient_type", sa.String(length=30), nullable=False),
        sa.Column("recipient_id", sa.Integer(), nullable=True),
        sa.Column("recipient_name", sa.String(length=150), nullable=False),
        sa.Column("recipient_destination", sa.String(length=255), nullable=False),
        sa.Column("template_code", sa.String(length=50), nullable=True),
        sa.Column("subject", sa.String(length=255), nullable=True),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False, server_default="SENT"),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("metadata_json", sa.Text(), nullable=True),
        sa.Column("sender_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("sender_name", sa.String(length=100), nullable=True),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_communication_logs_institution_id"), "communication_logs", ["institution_id"], unique=False)
    op.create_index(op.f("ix_communication_logs_channel"), "communication_logs", ["channel"], unique=False)
    op.create_index(op.f("ix_communication_logs_status"), "communication_logs", ["status"], unique=False)
    op.create_index(op.f("ix_communication_logs_created_at"), "communication_logs", ["created_at"], unique=False)

    # 3. shared_document_tokens
    op.create_table(
        "shared_document_tokens",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("token", sa.String(length=64), nullable=False),
        sa.Column("institution_id", sa.Integer(), sa.ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("document_type", sa.String(length=50), nullable=False),
        sa.Column("record_id", sa.Integer(), nullable=False),
        sa.Column("access_key", sa.String(length=32), nullable=True),
        sa.Column("recipient_name", sa.String(length=150), nullable=True),
        sa.Column("recipient_phone", sa.String(length=50), nullable=True),
        sa.Column("recipient_email", sa.String(length=150), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("max_views", sa.Integer(), nullable=False, server_default="25"),
        sa.Column("view_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_revoked", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_by_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_shared_document_tokens_token"), "shared_document_tokens", ["token"], unique=True)
    op.create_index(op.f("ix_shared_document_tokens_institution_id"), "shared_document_tokens", ["institution_id"], unique=False)
    op.create_index(op.f("ix_shared_document_tokens_document_type"), "shared_document_tokens", ["document_type"], unique=False)

    # Seed baseline templates for existing institutions
    connection = op.get_bind()
    inst_ids = connection.execute(sa.text("SELECT id FROM institutions")).fetchall()
    for row in inst_ids:
        inst_id = row[0]
        for tpl in DEFAULT_TEMPLATES:
            connection.execute(
                sa.text("""
                    INSERT INTO message_templates
                    (institution_id, name, code, category, channel, subject, body, variables, is_active, is_system, created_at, updated_at)
                    VALUES (:institution_id, :name, :code, :category, :channel, :subject, :body, :variables, true, :is_system, now(), now())
                    ON CONFLICT (institution_id, code) DO NOTHING
                """),
                {
                    "institution_id": inst_id,
                    "name": tpl["name"],
                    "code": tpl["code"],
                    "category": tpl["category"],
                    "channel": tpl["channel"],
                    "subject": tpl["subject"],
                    "body": tpl["body"],
                    "variables": tpl["variables"],
                    "is_system": tpl["is_system"],
                }
            )


def downgrade() -> None:
    op.drop_table("shared_document_tokens")
    op.drop_table("communication_logs")
    op.drop_table("message_templates")

