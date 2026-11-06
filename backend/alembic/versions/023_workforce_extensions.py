# /**
#  * @file        023_workforce_extensions.py
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
#  * @created     2026-11-07
#  * @updated     2026-11-07
#  *
#  * @description Alembic migration creating workforce extensions for multiple bank accounts and key contacts.
#  */

"""Workforce Extensions: Multiple Bank Accounts and Key Contacts

Revision ID: 023_workforce_extensions
Revises: 022_codex_engine
Create Date: 2026-11-07 02:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector

revision = "023_workforce_extensions"
down_revision = "022_codex_engine"
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    existing_tables = set(inspector.get_table_names())

    # 1. staff_bank_accounts
    if "staff_bank_accounts" not in existing_tables:
        op.create_table(
            "staff_bank_accounts",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column(
                "staff_profile_id",
                sa.Integer(),
                sa.ForeignKey("staff_profiles.id", ondelete="CASCADE"),
                nullable=False,
                index=True,
            ),
            sa.Column("account_holder_name", sa.String(150), nullable=False),
            sa.Column("bank_name", sa.String(100), nullable=False),
            sa.Column("account_number", sa.String(50), nullable=False),
            sa.Column("ifsc_code", sa.String(20), nullable=False),
            sa.Column("branch_name", sa.String(100), nullable=True),
            sa.Column("account_type", sa.String(30), nullable=False, server_default="salary"),
            sa.Column("is_primary", sa.Boolean(), nullable=False, server_default="false"),
            sa.Column("is_verified", sa.Boolean(), nullable=False, server_default="false"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        )

    # 2. staff_key_contacts
    if "staff_key_contacts" not in existing_tables:
        op.create_table(
            "staff_key_contacts",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column(
                "staff_profile_id",
                sa.Integer(),
                sa.ForeignKey("staff_profiles.id", ondelete="CASCADE"),
                nullable=False,
                index=True,
            ),
            sa.Column("contact_name", sa.String(100), nullable=False),
            sa.Column("relationship", sa.String(50), nullable=False),
            sa.Column("phone_primary", sa.String(20), nullable=False),
            sa.Column("phone_secondary", sa.String(20), nullable=True),
            sa.Column("email", sa.String(150), nullable=True),
            sa.Column("address", sa.Text(), nullable=True),
            sa.Column("is_primary_emergency", sa.Boolean(), nullable=False, server_default="false"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        )

    # 3. Seed existing primary bank accounts and emergency contacts into new tables (SSOT Backfill)
    conn.execute(sa.text("""
        INSERT INTO staff_bank_accounts (staff_profile_id, account_holder_name, bank_name, account_number, ifsc_code, account_type, is_primary, is_verified)
        SELECT 
            sp.id, 
            COALESCE(u.first_name || ' ' || u.last_name, 'Account Holder'),
            COALESCE(sp.bank_name, 'Primary Bank'),
            COALESCE(sp.bank_account_number, '0000000000'),
            COALESCE(sp.bank_ifsc, 'DEFAULT0001'),
            'salary',
            true,
            true
        FROM staff_profiles sp
        JOIN users u ON sp.user_id = u.id
        WHERE sp.bank_account_number IS NOT NULL AND sp.bank_account_number != ''
        ON CONFLICT DO NOTHING;
    """))

    conn.execute(sa.text("""
        INSERT INTO staff_key_contacts (staff_profile_id, contact_name, relationship, phone_primary, is_primary_emergency)
        SELECT 
            sp.id, 
            sp.emergency_contact_name,
            COALESCE(sp.emergency_contact_relation, 'Family'),
            COALESCE(sp.emergency_contact_phone, '0000000000'),
            true
        FROM staff_profiles sp
        WHERE sp.emergency_contact_name IS NOT NULL AND sp.emergency_contact_name != ''
        ON CONFLICT DO NOTHING;
    """))


def downgrade():
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    existing_tables = set(inspector.get_table_names())

    if "staff_key_contacts" in existing_tables:
        op.drop_table("staff_key_contacts")
    if "staff_bank_accounts" in existing_tables:
        op.drop_table("staff_bank_accounts")
