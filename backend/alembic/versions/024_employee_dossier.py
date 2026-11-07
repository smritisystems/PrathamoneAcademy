# /**
#  * @file        024_employee_dossier.py
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
#  * @description Alembic migration adding staff_addresses table and extending staff_bank_accounts and staff_key_contacts.
#  */

"""Employee Dossier Enhancements: Multiple Addresses, Nominees, and Bank Account Status

Revision ID: 024_employee_dossier
Revises: 023_workforce_extensions
Create Date: 2026-11-07 12:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector

revision = "024_employee_dossier"
down_revision = "023_workforce_extensions"
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    existing_tables = set(inspector.get_table_names())

    # 1. Create staff_addresses table if not exists
    if "staff_addresses" not in existing_tables:
        op.create_table(
            "staff_addresses",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column(
                "staff_profile_id",
                sa.Integer(),
                sa.ForeignKey("staff_profiles.id", ondelete="CASCADE"),
                nullable=False,
                index=True,
            ),
            sa.Column("address_type", sa.String(30), nullable=False, server_default="current"),  # current, permanent, alternate, communication, native
            sa.Column("address_line", sa.Text(), nullable=False),
            sa.Column("city", sa.String(100), nullable=False, server_default="Mumbai"),
            sa.Column("state", sa.String(100), nullable=False, server_default="Maharashtra"),
            sa.Column("pincode", sa.String(20), nullable=False, server_default="400001"),
            sa.Column("country", sa.String(50), nullable=False, server_default="India"),
            sa.Column("is_primary", sa.Boolean(), nullable=False, server_default="false"),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        )

        # Backfill current and permanent addresses from staff_profiles
        conn.execute(sa.text("""
            INSERT INTO staff_addresses (staff_profile_id, address_type, address_line, city, state, pincode, is_primary, is_active)
            SELECT 
                sp.id, 
                'current', 
                COALESCE(sp.current_address, 'Not specified'),
                COALESCE(sp.city, 'Mumbai'),
                COALESCE(sp.state, 'Maharashtra'),
                COALESCE(sp.pincode, '400001'),
                true,
                true
            FROM staff_profiles sp
            WHERE sp.current_address IS NOT NULL AND sp.current_address != '';
        """))

        conn.execute(sa.text("""
            INSERT INTO staff_addresses (staff_profile_id, address_type, address_line, city, state, pincode, is_primary, is_active)
            SELECT 
                sp.id, 
                'permanent', 
                COALESCE(sp.permanent_address, 'Not specified'),
                COALESCE(sp.city, 'Mumbai'),
                COALESCE(sp.state, 'Maharashtra'),
                COALESCE(sp.pincode, '400001'),
                false,
                true
            FROM staff_profiles sp
            WHERE sp.permanent_address IS NOT NULL AND sp.permanent_address != '';
        """))

    # 2. Add is_active column to staff_bank_accounts if missing
    bank_cols = [c["name"] for c in inspector.get_columns("staff_bank_accounts")]
    if "is_active" not in bank_cols:
        op.add_column("staff_bank_accounts", sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"))

    # 3. Add is_nominee, is_active, and priority columns to staff_key_contacts if missing
    contact_cols = [c["name"] for c in inspector.get_columns("staff_key_contacts")]
    if "is_nominee" not in contact_cols:
        op.add_column("staff_key_contacts", sa.Column("is_nominee", sa.Boolean(), nullable=False, server_default="false"))
    if "is_active" not in contact_cols:
        op.add_column("staff_key_contacts", sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"))
    if "priority" not in contact_cols:
        op.add_column("staff_key_contacts", sa.Column("priority", sa.Integer(), nullable=False, server_default="1"))


def downgrade():
    op.drop_table("staff_addresses")
    op.drop_column("staff_bank_accounts", "is_active")
    op.drop_column("staff_key_contacts", "is_nominee")
    op.drop_column("staff_key_contacts", "is_active")
    op.drop_column("staff_key_contacts", "priority")
