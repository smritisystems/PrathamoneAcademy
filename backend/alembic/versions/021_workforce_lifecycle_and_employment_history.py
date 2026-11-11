# /**
#  * @file        021_workforce_lifecycle_and_employment_history.py
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
#  * @created     2026-11-06
#  * @updated     2026-11-11
#  *
#  * @description Alembic migration adding workforce lifecycle fields to staff_profiles and creating staff_employment_histories.
#  */

"""Workforce Lifecycle and Employment History

Revision ID: 021_workforce_lifecycle
Revises: 020_teacher_payroll
Create Date: 2026-11-06 15:30:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "021_workforce_lifecycle"
down_revision = "020_teacher_payroll"
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = set(inspector.get_table_names())

    # 1. Add lifecycle columns to staff_profiles
    if "staff_profiles" in existing_tables:
        existing_cols = {c["name"] for c in inspector.get_columns("staff_profiles")}
        if "contract_start_date" not in existing_cols:
            op.add_column("staff_profiles", sa.Column("contract_start_date", sa.Date(), nullable=True))
        if "contract_end_date" not in existing_cols:
            op.add_column("staff_profiles", sa.Column("contract_end_date", sa.Date(), nullable=True))
        if "status_effective_date" not in existing_cols:
            op.add_column("staff_profiles", sa.Column("status_effective_date", sa.Date(), nullable=True))
        if "exit_date" not in existing_cols:
            op.add_column("staff_profiles", sa.Column("exit_date", sa.Date(), nullable=True))
        if "exit_reason" not in existing_cols:
            op.add_column("staff_profiles", sa.Column("exit_reason", sa.String(255), nullable=True))
        if "rehire_eligible" not in existing_cols:
            op.add_column("staff_profiles", sa.Column("rehire_eligible", sa.Boolean(), nullable=False, server_default="true"))
        if "approved_by_id" not in existing_cols:
            op.add_column(
                "staff_profiles",
                sa.Column("approved_by_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
            )

    # 2. Create staff_employment_histories table
    if "staff_employment_histories" not in existing_tables:
        op.create_table(
        "staff_employment_histories",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column(
            "staff_profile_id",
            sa.Integer(),
            sa.ForeignKey("staff_profiles.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("event_type", sa.String(50), nullable=False),
        sa.Column("old_status", sa.String(30), nullable=True),
        sa.Column("new_status", sa.String(30), nullable=False),
        sa.Column("effective_date", sa.Date(), nullable=False, server_default=sa.func.current_date()),
        sa.Column("reason", sa.String(255), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "recorded_by_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_staff_emp_hist_user_created",
        "staff_employment_histories",
        ["user_id", "created_at"],
    )


def downgrade():
    op.drop_index("ix_staff_emp_hist_user_created", table_name="staff_employment_histories")
    op.drop_table("staff_employment_histories")
    op.drop_column("staff_profiles", "approved_by_id")
    op.drop_column("staff_profiles", "rehire_eligible")
    op.drop_column("staff_profiles", "exit_reason")
    op.drop_column("staff_profiles", "exit_date")
    op.drop_column("staff_profiles", "status_effective_date")
    op.drop_column("staff_profiles", "contract_end_date")
    op.drop_column("staff_profiles", "contract_start_date")
