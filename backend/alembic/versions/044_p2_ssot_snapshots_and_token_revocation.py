# /**
#  * @file        044_p2_ssot_snapshots_and_token_revocation.py
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
#  * @created     2026-11-12
#  * @updated     2026-11-12
#  *
#  * @description Adds revoked_tokens table, tenant/snapshot columns on audit_logs, exam_marks, and fee_invoice_items, and widens shared_document_tokens.access_key.
#  */

"""Sprint 3 SSOT Snapshots and Token Revocation

Revision ID: 044_p2_ssot_snapshots
Revises: 043_help_about_centre
Create Date: 2026-11-12 14:46:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector

revision = "044_p2_ssot_snapshots"
down_revision = "043_help_about_centre"
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    existing_tables = set(inspector.get_table_names())

    if "revoked_tokens" not in existing_tables:
        op.create_table(
            "revoked_tokens",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("jti", sa.String(length=64), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=True),
            sa.Column("revoked_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_revoked_tokens_id", "revoked_tokens", ["id"])
        op.create_index("ix_revoked_tokens_jti", "revoked_tokens", ["jti"], unique=True)
        op.create_index("ix_revoked_tokens_user_id", "revoked_tokens", ["user_id"])
        op.create_index("ix_revoked_tokens_expires_at", "revoked_tokens", ["expires_at"])

    audit_cols = {c["name"] for c in inspector.get_columns("audit_logs")} if "audit_logs" in existing_tables else set()
    if "audit_logs" in existing_tables and "institution_id" not in audit_cols:
        op.add_column("audit_logs", sa.Column("institution_id", sa.Integer(), nullable=True))
        op.create_index("ix_audit_logs_institution_id", "audit_logs", ["institution_id"])
        op.create_foreign_key(
            "fk_audit_logs_institution_id",
            "audit_logs",
            "institutions",
            ["institution_id"],
            ["id"],
            ondelete="SET NULL",
        )
        op.execute(
            sa.text(
                "UPDATE audit_logs a SET institution_id = u.institution_id "
                "FROM users u WHERE a.user_id = u.id AND a.institution_id IS NULL"
            )
        )

    exam_mark_cols = {c["name"] for c in inspector.get_columns("exam_marks")} if "exam_marks" in existing_tables else set()
    if "exam_marks" in existing_tables:
        if "institution_id" not in exam_mark_cols:
            op.add_column("exam_marks", sa.Column("institution_id", sa.Integer(), nullable=True))
            op.create_index("ix_exam_marks_institution_id", "exam_marks", ["institution_id"])
            op.create_foreign_key(
                "fk_exam_marks_institution_id",
                "exam_marks",
                "institutions",
                ["institution_id"],
                ["id"],
                ondelete="SET NULL",
            )
        if "max_marks" not in exam_mark_cols:
            op.add_column("exam_marks", sa.Column("max_marks", sa.Numeric(precision=6, scale=2), nullable=True))
        if "subject_name" not in exam_mark_cols:
            op.add_column("exam_marks", sa.Column("subject_name", sa.String(length=200), nullable=True))
        if "exam_name" not in exam_mark_cols:
            op.add_column("exam_marks", sa.Column("exam_name", sa.String(length=200), nullable=True))
        op.execute(
            sa.text(
                "UPDATE exam_marks m SET "
                "max_marks = COALESCE(m.max_marks, e.max_marks), "
                "exam_name = COALESCE(m.exam_name, e.name) "
                "FROM examinations e "
                "WHERE m.examination_id = e.id"
            )
        )
        op.execute(
            sa.text(
                "UPDATE exam_marks m SET "
                "institution_id = COALESCE(m.institution_id, st.institution_id) "
                "FROM students st "
                "WHERE m.student_id = st.id"
            )
        )
        op.execute(
            sa.text(
                "UPDATE exam_marks m SET "
                "max_marks = COALESCE(s.max_marks, m.max_marks), "
                "subject_name = COALESCE(m.subject_name, s.name) "
                "FROM subjects s "
                "WHERE m.subject_id = s.id"
            )
        )

    invoice_item_cols = {c["name"] for c in inspector.get_columns("fee_invoice_items")} if "fee_invoice_items" in existing_tables else set()
    if "fee_invoice_items" in existing_tables:
        if "institution_id" not in invoice_item_cols:
            op.add_column("fee_invoice_items", sa.Column("institution_id", sa.Integer(), nullable=True))
            op.create_index("ix_fee_invoice_items_institution_id", "fee_invoice_items", ["institution_id"])
            op.create_foreign_key(
                "fk_fee_invoice_items_institution_id",
                "fee_invoice_items",
                "institutions",
                ["institution_id"],
                ["id"],
                ondelete="SET NULL",
            )
        if "structure_name" not in invoice_item_cols:
            op.add_column("fee_invoice_items", sa.Column("structure_name", sa.String(length=200), nullable=True))
        if "fee_category_name" not in invoice_item_cols:
            op.add_column("fee_invoice_items", sa.Column("fee_category_name", sa.String(length=200), nullable=True))
        op.execute(
            sa.text(
                "UPDATE fee_invoice_items i SET "
                "institution_id = COALESCE(i.institution_id, st.institution_id) "
                "FROM fee_invoices fi, students st "
                "WHERE i.invoice_id = fi.id AND fi.student_id = st.id"
            )
        )
        op.execute(
            sa.text(
                "UPDATE fee_invoice_items i SET "
                "structure_name = COALESCE(i.structure_name, fs.name) "
                "FROM fee_structures fs "
                "WHERE i.fee_structure_id = fs.id"
            )
        )

    if "shared_document_tokens" in existing_tables:
        op.alter_column(
            "shared_document_tokens",
            "access_key",
            existing_type=sa.String(length=32),
            type_=sa.String(length=128),
            existing_nullable=True,
        )


def downgrade():
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    existing_tables = set(inspector.get_table_names())

    if "shared_document_tokens" in existing_tables:
        op.alter_column(
            "shared_document_tokens",
            "access_key",
            existing_type=sa.String(length=128),
            type_=sa.String(length=32),
            existing_nullable=True,
        )

    if "fee_invoice_items" in existing_tables:
        cols = {c["name"] for c in inspector.get_columns("fee_invoice_items")}
        if "fee_category_name" in cols:
            op.drop_column("fee_invoice_items", "fee_category_name")
        if "structure_name" in cols:
            op.drop_column("fee_invoice_items", "structure_name")
        if "institution_id" in cols:
            op.drop_constraint("fk_fee_invoice_items_institution_id", "fee_invoice_items", type_="foreignkey")
            op.drop_index("ix_fee_invoice_items_institution_id", table_name="fee_invoice_items")
            op.drop_column("fee_invoice_items", "institution_id")

    if "exam_marks" in existing_tables:
        cols = {c["name"] for c in inspector.get_columns("exam_marks")}
        if "exam_name" in cols:
            op.drop_column("exam_marks", "exam_name")
        if "subject_name" in cols:
            op.drop_column("exam_marks", "subject_name")
        if "max_marks" in cols:
            op.drop_column("exam_marks", "max_marks")
        if "institution_id" in cols:
            op.drop_constraint("fk_exam_marks_institution_id", "exam_marks", type_="foreignkey")
            op.drop_index("ix_exam_marks_institution_id", table_name="exam_marks")
            op.drop_column("exam_marks", "institution_id")

    if "audit_logs" in existing_tables:
        cols = {c["name"] for c in inspector.get_columns("audit_logs")}
        if "institution_id" in cols:
            op.drop_constraint("fk_audit_logs_institution_id", "audit_logs", type_="foreignkey")
            op.drop_index("ix_audit_logs_institution_id", table_name="audit_logs")
            op.drop_column("audit_logs", "institution_id")

    if "revoked_tokens" in existing_tables:
        op.drop_index("ix_revoked_tokens_expires_at", table_name="revoked_tokens")
        op.drop_index("ix_revoked_tokens_user_id", table_name="revoked_tokens")
        op.drop_index("ix_revoked_tokens_jti", table_name="revoked_tokens")
        op.drop_index("ix_revoked_tokens_id", table_name="revoked_tokens")
        op.drop_table("revoked_tokens")
