# /**
#  * @file        001_initial_schema.py
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
#  * @created     2026-11-03
#  * @updated     2026-11-11
#  *
#  * @description Initial database schema migration creating core tables for students, users, courses, and fees.
#  */

"""Prashant Academy schema

Revision ID: 001_initial
Revises:
Create Date: 2024-06-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # institutions
    op.create_table(
        "institutions",
        sa.Column("id", sa.Integer, primary_key=True, index=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("code", sa.String(50), nullable=False, unique=True),
        sa.Column("address", sa.Text, nullable=True),
        sa.Column("city", sa.String(100), nullable=True),
        sa.Column("state", sa.String(100), nullable=True),
        sa.Column("pincode", sa.String(10), nullable=True),
        sa.Column("phone", sa.String(20), nullable=True),
        sa.Column("email", sa.String(200), nullable=True),
        sa.Column("website", sa.String(200), nullable=True),
        sa.Column("logo_url", sa.String(500), nullable=True),
        sa.Column("is_active", sa.Boolean, default=True, nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
    )

    # roles
    op.create_table(
        "roles",
        sa.Column("id", sa.Integer, primary_key=True, index=True),
        sa.Column("name", sa.String(50), nullable=False, unique=True),
        sa.Column("description", sa.String(200), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
    )

    # users
    op.create_table(
        "users",
        sa.Column("id", sa.Integer, primary_key=True, index=True),
        sa.Column("institution_id", sa.Integer, sa.ForeignKey("institutions.id"), nullable=True),
        sa.Column("username", sa.String(100), nullable=False, unique=True, index=True),
        sa.Column("email", sa.String(200), nullable=False, unique=True),
        sa.Column("hashed_password", sa.String(200), nullable=False),
        sa.Column("first_name", sa.String(100), nullable=False),
        sa.Column("last_name", sa.String(100), nullable=False),
        sa.Column("phone", sa.String(20), nullable=True),
        sa.Column("role", sa.String(50), nullable=False, default="staff"),
        sa.Column("role_id", sa.Integer, sa.ForeignKey("roles.id"), nullable=True),
        sa.Column("is_active", sa.Boolean, default=True, nullable=False),
        sa.Column("last_login", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # academic_years
    op.create_table(
        "academic_years",
        sa.Column("id", sa.Integer, primary_key=True, index=True),
        sa.Column("institution_id", sa.Integer, sa.ForeignKey("institutions.id"), nullable=False),
        sa.Column("name", sa.String(50), nullable=False),
        sa.Column("start_date", sa.Date, nullable=False),
        sa.Column("end_date", sa.Date, nullable=False),
        sa.Column("is_current", sa.Boolean, default=False, nullable=False),
        sa.Column("is_active", sa.Boolean, default=True, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # standards
    op.create_table(
        "standards",
        sa.Column("id", sa.Integer, primary_key=True, index=True),
        sa.Column("institution_id", sa.Integer, sa.ForeignKey("institutions.id"), nullable=False),
        sa.Column("name", sa.String(50), nullable=False),
        sa.Column("level", sa.Integer, nullable=False),
        sa.Column("description", sa.String(200), nullable=True),
        sa.Column("is_active", sa.Boolean, default=True, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # divisions
    op.create_table(
        "divisions",
        sa.Column("id", sa.Integer, primary_key=True, index=True),
        sa.Column("standard_id", sa.Integer, sa.ForeignKey("standards.id"), nullable=False),
        sa.Column("name", sa.String(10), nullable=False),
        sa.Column("capacity", sa.Integer, default=40, nullable=False),
        sa.Column("class_teacher_id", sa.Integer, sa.ForeignKey("users.id"), nullable=True),
        sa.Column("is_active", sa.Boolean, default=True, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # students
    op.create_table(
        "students",
        sa.Column("id", sa.Integer, primary_key=True, index=True),
        sa.Column("institution_id", sa.Integer, sa.ForeignKey("institutions.id"), nullable=False),
        sa.Column("admission_number", sa.String(50), nullable=False, unique=True, index=True),
        sa.Column("first_name", sa.String(100), nullable=False),
        sa.Column("last_name", sa.String(100), nullable=False),
        sa.Column("middle_name", sa.String(100), nullable=True),
        sa.Column("date_of_birth", sa.Date, nullable=False),
        sa.Column("gender", sa.String(10), nullable=False),
        sa.Column("blood_group", sa.String(5), nullable=True),
        sa.Column("nationality", sa.String(50), default="Indian"),
        sa.Column("religion", sa.String(50), nullable=True),
        sa.Column("caste", sa.String(50), nullable=True),
        sa.Column("aadhar_number", sa.String(12), nullable=True),
        sa.Column("photo_url", sa.String(500), nullable=True),
        sa.Column("address", sa.Text, nullable=True),
        sa.Column("city", sa.String(100), nullable=True),
        sa.Column("state", sa.String(100), nullable=True),
        sa.Column("pincode", sa.String(10), nullable=True),
        sa.Column("phone", sa.String(20), nullable=True),
        sa.Column("email", sa.String(200), nullable=True),
        sa.Column("admission_date", sa.Date, nullable=False),
        sa.Column("is_active", sa.Boolean, default=True, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # guardians
    op.create_table(
        "guardians",
        sa.Column("id", sa.Integer, primary_key=True, index=True),
        sa.Column("student_id", sa.Integer, sa.ForeignKey("students.id"), nullable=False),
        sa.Column("relation", sa.String(50), nullable=False),
        sa.Column("first_name", sa.String(100), nullable=False),
        sa.Column("last_name", sa.String(100), nullable=False),
        sa.Column("occupation", sa.String(100), nullable=True),
        sa.Column("phone", sa.String(20), nullable=True),
        sa.Column("email", sa.String(200), nullable=True),
        sa.Column("aadhar_number", sa.String(12), nullable=True),
        sa.Column("annual_income", sa.Float, nullable=True),
        sa.Column("is_primary", sa.Boolean, default=False, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # student_enrollments
    op.create_table(
        "student_enrollments",
        sa.Column("id", sa.Integer, primary_key=True, index=True),
        sa.Column("student_id", sa.Integer, sa.ForeignKey("students.id"), nullable=False),
        sa.Column("academic_year_id", sa.Integer, sa.ForeignKey("academic_years.id"), nullable=False),
        sa.Column("standard_id", sa.Integer, sa.ForeignKey("standards.id"), nullable=False),
        sa.Column("division_id", sa.Integer, sa.ForeignKey("divisions.id"), nullable=True),
        sa.Column("roll_number", sa.String(20), nullable=True),
        sa.Column("enrollment_date", sa.Date, nullable=False),
        sa.Column("status", sa.String(20), default="active", nullable=False),
        sa.Column("remarks", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # subjects
    op.create_table(
        "subjects",
        sa.Column("id", sa.Integer, primary_key=True, index=True),
        sa.Column("standard_id", sa.Integer, sa.ForeignKey("standards.id"), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("code", sa.String(20), nullable=True),
        sa.Column("max_marks", sa.Integer, default=100, nullable=False),
        sa.Column("pass_marks", sa.Integer, default=35, nullable=False),
        sa.Column("is_optional", sa.Boolean, default=False, nullable=False),
        sa.Column("is_active", sa.Boolean, default=True, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # fee_categories
    op.create_table(
        "fee_categories",
        sa.Column("id", sa.Integer, primary_key=True, index=True),
        sa.Column("institution_id", sa.Integer, sa.ForeignKey("institutions.id"), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("is_active", sa.Boolean, default=True, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # fee_structures
    op.create_table(
        "fee_structures",
        sa.Column("id", sa.Integer, primary_key=True, index=True),
        sa.Column("institution_id", sa.Integer, sa.ForeignKey("institutions.id"), nullable=False),
        sa.Column("academic_year_id", sa.Integer, sa.ForeignKey("academic_years.id"), nullable=False),
        sa.Column("standard_id", sa.Integer, sa.ForeignKey("standards.id"), nullable=True),
        sa.Column("category_id", sa.Integer, sa.ForeignKey("fee_categories.id"), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("frequency", sa.String(20), default="annual", nullable=False),
        sa.Column("installments_count", sa.Integer, default=1, nullable=False),
        sa.Column("due_day", sa.Integer, nullable=True),
        sa.Column("late_fee_amount", sa.Numeric(12, 2), default=0, nullable=False),
        sa.Column("late_fee_days", sa.Integer, default=0, nullable=False),
        sa.Column("is_active", sa.Boolean, default=True, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # discounts
    op.create_table(
        "discounts",
        sa.Column("id", sa.Integer, primary_key=True, index=True),
        sa.Column("institution_id", sa.Integer, sa.ForeignKey("institutions.id"), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("discount_type", sa.String(20), nullable=False),
        sa.Column("value", sa.Numeric(12, 2), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("is_active", sa.Boolean, default=True, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # scholarships
    op.create_table(
        "scholarships",
        sa.Column("id", sa.Integer, primary_key=True, index=True),
        sa.Column("institution_id", sa.Integer, sa.ForeignKey("institutions.id"), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("is_active", sa.Boolean, default=True, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # student_fee_assignments
    op.create_table(
        "student_fee_assignments",
        sa.Column("id", sa.Integer, primary_key=True, index=True),
        sa.Column("student_id", sa.Integer, sa.ForeignKey("students.id"), nullable=False),
        sa.Column("fee_structure_id", sa.Integer, sa.ForeignKey("fee_structures.id"), nullable=False),
        sa.Column("academic_year_id", sa.Integer, sa.ForeignKey("academic_years.id"), nullable=False),
        sa.Column("discount_id", sa.Integer, sa.ForeignKey("discounts.id"), nullable=True),
        sa.Column("scholarship_id", sa.Integer, sa.ForeignKey("scholarships.id"), nullable=True),
        sa.Column("custom_amount", sa.Numeric(12, 2), nullable=True),
        sa.Column("concession_amount", sa.Numeric(12, 2), default=0, nullable=False),
        sa.Column("remarks", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # fee_invoices
    op.create_table(
        "fee_invoices",
        sa.Column("id", sa.Integer, primary_key=True, index=True),
        sa.Column("invoice_number", sa.String(50), nullable=False, unique=True, index=True),
        sa.Column("student_id", sa.Integer, sa.ForeignKey("students.id"), nullable=False),
        sa.Column("assignment_id", sa.Integer, sa.ForeignKey("student_fee_assignments.id"), nullable=False),
        sa.Column("academic_year_id", sa.Integer, sa.ForeignKey("academic_years.id"), nullable=False),
        sa.Column("total_amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("discount_amount", sa.Numeric(12, 2), default=0, nullable=False),
        sa.Column("net_amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("paid_amount", sa.Numeric(12, 2), default=0, nullable=False),
        sa.Column("outstanding_amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("status", sa.String(20), default="unpaid", nullable=False),
        sa.Column("issue_date", sa.Date, nullable=False),
        sa.Column("due_date", sa.Date, nullable=True),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # fee_invoice_items
    op.create_table(
        "fee_invoice_items",
        sa.Column("id", sa.Integer, primary_key=True, index=True),
        sa.Column("invoice_id", sa.Integer, sa.ForeignKey("fee_invoices.id"), nullable=False),
        sa.Column("fee_structure_id", sa.Integer, sa.ForeignKey("fee_structures.id"), nullable=False),
        sa.Column("description", sa.String(200), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("discount_amount", sa.Numeric(12, 2), default=0, nullable=False),
        sa.Column("net_amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # fee_installments
    op.create_table(
        "fee_installments",
        sa.Column("id", sa.Integer, primary_key=True, index=True),
        sa.Column("invoice_id", sa.Integer, sa.ForeignKey("fee_invoices.id"), nullable=False),
        sa.Column("installment_number", sa.Integer, nullable=False),
        sa.Column("description", sa.String(200), nullable=True),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("paid_amount", sa.Numeric(12, 2), default=0, nullable=False),
        sa.Column("due_date", sa.Date, nullable=False),
        sa.Column("status", sa.String(20), default="unpaid", nullable=False),
        sa.Column("late_fee_applied", sa.Numeric(12, 2), default=0, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # payments
    op.create_table(
        "payments",
        sa.Column("id", sa.Integer, primary_key=True, index=True),
        sa.Column("student_id", sa.Integer, sa.ForeignKey("students.id"), nullable=False),
        sa.Column("academic_year_id", sa.Integer, sa.ForeignKey("academic_years.id"), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("payment_date", sa.Date, nullable=False),
        sa.Column("payment_method", sa.String(30), nullable=False),
        sa.Column("transaction_reference", sa.String(200), nullable=True),
        sa.Column("bank_name", sa.String(100), nullable=True),
        sa.Column("cheque_number", sa.String(50), nullable=True),
        sa.Column("cheque_date", sa.Date, nullable=True),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("status", sa.String(20), default="completed", nullable=False),
        sa.Column("reversed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("reversal_reason", sa.Text, nullable=True),
        sa.Column("reversed_by_id", sa.Integer, sa.ForeignKey("users.id"), nullable=True),
        sa.Column("collected_by_id", sa.Integer, sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # payment_allocations
    op.create_table(
        "payment_allocations",
        sa.Column("id", sa.Integer, primary_key=True, index=True),
        sa.Column("payment_id", sa.Integer, sa.ForeignKey("payments.id"), nullable=False),
        sa.Column("invoice_id", sa.Integer, sa.ForeignKey("fee_invoices.id"), nullable=False),
        sa.Column("installment_id", sa.Integer, sa.ForeignKey("fee_installments.id"), nullable=True),
        sa.Column("allocated_amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # payment_receipts
    op.create_table(
        "payment_receipts",
        sa.Column("id", sa.Integer, primary_key=True, index=True),
        sa.Column("receipt_number", sa.String(50), nullable=False, unique=True, index=True),
        sa.Column("payment_id", sa.Integer, sa.ForeignKey("payments.id"), nullable=False, unique=True),
        sa.Column("student_id", sa.Integer, sa.ForeignKey("students.id"), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("payment_date", sa.Date, nullable=False),
        sa.Column("payment_method", sa.String(30), nullable=False),
        sa.Column("receipt_data", sa.Text, nullable=True),
        sa.Column("generated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # attendances
    op.create_table(
        "attendances",
        sa.Column("id", sa.Integer, primary_key=True, index=True),
        sa.Column("student_id", sa.Integer, sa.ForeignKey("students.id"), nullable=False),
        sa.Column("enrollment_id", sa.Integer, sa.ForeignKey("student_enrollments.id"), nullable=False),
        sa.Column("date", sa.Date, nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("remarks", sa.String(200), nullable=True),
        sa.Column("marked_by_id", sa.Integer, sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # examinations
    op.create_table(
        "examinations",
        sa.Column("id", sa.Integer, primary_key=True, index=True),
        sa.Column("academic_year_id", sa.Integer, sa.ForeignKey("academic_years.id"), nullable=False),
        sa.Column("standard_id", sa.Integer, sa.ForeignKey("standards.id"), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("exam_type", sa.String(50), nullable=False),
        sa.Column("start_date", sa.Date, nullable=True),
        sa.Column("end_date", sa.Date, nullable=True),
        sa.Column("max_marks", sa.Integer, default=100, nullable=False),
        sa.Column("passing_marks", sa.Integer, default=35, nullable=False),
        sa.Column("is_active", sa.Boolean, default=True, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # exam_marks
    op.create_table(
        "exam_marks",
        sa.Column("id", sa.Integer, primary_key=True, index=True),
        sa.Column("examination_id", sa.Integer, sa.ForeignKey("examinations.id"), nullable=False),
        sa.Column("student_id", sa.Integer, sa.ForeignKey("students.id"), nullable=False),
        sa.Column("subject_id", sa.Integer, sa.ForeignKey("subjects.id"), nullable=False),
        sa.Column("marks_obtained", sa.Numeric(6, 2), nullable=True),
        sa.Column("grade", sa.String(5), nullable=True),
        sa.Column("remarks", sa.String(200), nullable=True),
        sa.Column("is_absent", sa.Boolean, default=False, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # audit_logs
    op.create_table(
        "audit_logs",
        sa.Column("id", sa.Integer, primary_key=True, index=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id"), nullable=True),
        sa.Column("action", sa.String(100), nullable=False),
        sa.Column("resource_type", sa.String(100), nullable=False),
        sa.Column("resource_id", sa.Integer, nullable=True),
        sa.Column("old_data", sa.Text, nullable=True),
        sa.Column("new_data", sa.Text, nullable=True),
        sa.Column("ip_address", sa.String(50), nullable=True),
        sa.Column("user_agent", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # permissions
    op.create_table(
        "permissions",
        sa.Column("id", sa.Integer, primary_key=True, index=True),
        sa.Column("role_id", sa.Integer, sa.ForeignKey("roles.id"), nullable=False),
        sa.Column("resource", sa.String(100), nullable=False),
        sa.Column("action", sa.String(20), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Seed baseline institution if none exists
    op.execute("""
        INSERT INTO institutions (id, name, code, address, city, state, pincode, phone, email, website, is_active, created_at, updated_at)
        SELECT 1, 'Prashant Academy', 'PA001', '123 Education Lane, School District', 'Mumbai', 'Maharashtra', '400001', '+91-22-12345678', 'info@example.com', 'https://example.com', true, NOW(), NOW()
        WHERE NOT EXISTS (SELECT 1 FROM institutions WHERE id = 1)
    """)
    op.execute("""
        SELECT setval('institutions_id_seq', (SELECT GREATEST(MAX(id), 1) FROM institutions), true)
    """)


def downgrade() -> None:
    op.drop_table("permissions")
    op.drop_table("audit_logs")
    op.drop_table("exam_marks")
    op.drop_table("examinations")
    op.drop_table("attendances")
    op.drop_table("payment_receipts")
    op.drop_table("payment_allocations")
    op.drop_table("payments")
    op.drop_table("fee_installments")
    op.drop_table("fee_invoice_items")
    op.drop_table("fee_invoices")
    op.drop_table("student_fee_assignments")
    op.drop_table("scholarships")
    op.drop_table("discounts")
    op.drop_table("fee_structures")
    op.drop_table("fee_categories")
    op.drop_table("subjects")
    op.drop_table("student_enrollments")
    op.drop_table("guardians")
    op.drop_table("students")
    op.drop_table("divisions")
    op.drop_table("standards")
    op.drop_table("academic_years")
    op.drop_table("users")
    op.drop_table("roles")
    op.drop_table("institutions")

