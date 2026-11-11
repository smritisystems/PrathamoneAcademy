# /**
#  * @file        039_add_staff_reporting_manager_and_responsibilities.py
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
#  * @created     2026-11-10
#  * @updated     2026-11-11
#  *
#  * @description Schema reconciliation adding missing reporting_manager_id and responsibilities columns to staff_profiles table.
#  */

"""add_staff_reporting_manager_and_responsibilities

Revision ID: 039_staff_reporting
Revises: 038_nethan_receipt_typo
Create Date: 2026-11-10 19:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '039_staff_reporting'
down_revision = '038_nethan_receipt_typo'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = set(inspector.get_table_names())

    if "staff_profiles" in existing_tables:
        existing_cols = {c["name"] for c in inspector.get_columns("staff_profiles")}
        # 1. Add reporting_manager_id column and foreign key constraint
        if 'reporting_manager_id' not in existing_cols:
            op.add_column(
                'staff_profiles',
                sa.Column('reporting_manager_id', sa.Integer(), nullable=True)
            )
            op.create_foreign_key(
                'fk_staff_profiles_reporting_manager_id',
                'staff_profiles',
                'users',
                ['reporting_manager_id'],
                ['id'],
                ondelete='SET NULL'
            )

        # 2. Add responsibilities column
        if 'responsibilities' not in existing_cols:
            op.add_column(
                'staff_profiles',
                sa.Column('responsibilities', sa.Text(), nullable=True)
            )


def downgrade() -> None:
    op.drop_constraint('fk_staff_profiles_reporting_manager_id', 'staff_profiles', type_='foreignkey')
    op.drop_column('staff_profiles', 'responsibilities')
    op.drop_column('staff_profiles', 'reporting_manager_id')

