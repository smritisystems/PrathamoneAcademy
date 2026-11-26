# /**
#  * @file        057_repair_teacher_assignments.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      backend.alembic.versions
#  *
#  * @author      Jawahar R. Mallah
#  * @organization Smritisys & AITDL Networks
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 PrathamOne EduOS
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-26
#  * @updated     2026-11-26
#  *
#  * @description Idempotent migration aligning teacher_assignments columns on fresh installations with the TeacherAssignment SQLAlchemy model.
#  */

"""Repair missing teacher_assignments columns from fresh schema bootstrap

Revision ID: 057_repair_teacher_assignments
Revises: 056_expense_and_cash_register
Create Date: 2026-11-26
"""

from alembic import op
import sqlalchemy as sa


revision = "057_repair_teacher_assignments"
down_revision = "056_expense_and_cash_register"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    if "teacher_assignments" not in set(inspector.get_table_names()):
        return

    existing_cols = {col["name"] for col in inspector.get_columns("teacher_assignments")}

    if "board_id" not in existing_cols:
        op.add_column(
            "teacher_assignments",
            sa.Column(
                "board_id",
                sa.Integer(),
                sa.ForeignKey("boards.id", ondelete="CASCADE"),
                nullable=True,
            ),
        )

    if "standard_id" not in existing_cols:
        op.add_column(
            "teacher_assignments",
            sa.Column(
                "standard_id",
                sa.Integer(),
                sa.ForeignKey("standards.id", ondelete="CASCADE"),
                nullable=True,
            ),
        )

    if "weekly_hours" not in existing_cols:
        op.add_column(
            "teacher_assignments",
            sa.Column(
                "weekly_hours",
                sa.Float(),
                nullable=False,
                server_default=sa.text("4.0"),
            ),
        )

    if "is_class_teacher" not in existing_cols:
        op.add_column(
            "teacher_assignments",
            sa.Column(
                "is_class_teacher",
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("false"),
            ),
        )

    if "notes" not in existing_cols:
        op.add_column(
            "teacher_assignments",
            sa.Column("notes", sa.String(255), nullable=True),
        )

    # Backfill standard_id and board_id for any legacy rows before enforcing NOT NULL
    conn.execute(
        sa.text(
            """
            UPDATE teacher_assignments ta
            SET standard_id = COALESCE(
                    ta.standard_id,
                    (SELECT d.standard_id FROM divisions d WHERE d.id = ta.division_id),
                    (SELECT s.standard_id FROM subjects s WHERE s.id = ta.subject_id),
                    (SELECT st.id FROM standards st ORDER BY st.id LIMIT 1)
                ),
                board_id = COALESCE(
                    ta.board_id,
                    (SELECT d.board_id FROM divisions d WHERE d.id = ta.division_id),
                    (SELECT sm.board_id FROM subject_mappings sm WHERE sm.id = ta.subject_mapping_id),
                    (SELECT b.id FROM boards b ORDER BY b.id LIMIT 1)
                )
            WHERE ta.standard_id IS NULL OR ta.board_id IS NULL
            """
        )
    )

    null_standard = conn.execute(
        sa.text("SELECT COUNT(*) FROM teacher_assignments WHERE standard_id IS NULL")
    ).scalar() or 0
    if null_standard == 0:
        op.alter_column("teacher_assignments", "standard_id", existing_type=sa.Integer(), nullable=False)

    null_board = conn.execute(
        sa.text("SELECT COUNT(*) FROM teacher_assignments WHERE board_id IS NULL")
    ).scalar() or 0
    if null_board == 0:
        op.alter_column("teacher_assignments", "board_id", existing_type=sa.Integer(), nullable=False)


def downgrade() -> None:
    pass
