# /**
#  * @file        061_repair_cross_tenant_fee_assignments.py
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
#  * @created     2026-11-28
#  * @updated     2026-11-28
#  *
#  * @description Idempotent migration repairing legacy student_fee_assignments rows whose academic_year_id or fee_structure_id drifted across institutions.
#  */

"""Repair cross-tenant student_fee_assignments academic year and fee structure references

Revision ID: 061_repair_fee_assignments
Revises: 060_inst_profile_branches
Create Date: 2026-11-28
"""

import re
from alembic import op
import sqlalchemy as sa


revision = "061_repair_fee_assignments"
down_revision = "060_inst_profile_branches"
branch_labels = None
depends_on = None

_DEMO_SUFFIX_RE = re.compile(r"\s*\(demo\)\s*$", re.IGNORECASE)


def _strip_demo_suffix(name: str) -> str:
    return _DEMO_SUFFIX_RE.sub("", (name or "").strip()).strip() or (name or "").strip()


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())
    if not {"student_fee_assignments", "students", "academic_years", "fee_structures"}.issubset(tables):
        return

    rows = bind.execute(
        sa.text(
            """
            SELECT
                sfa.id AS sfa_id,
                sfa.student_id,
                s.institution_id AS student_inst_id,
                sfa.academic_year_id AS cur_ay_id,
                ay.institution_id AS ay_inst_id,
                ay.name AS ay_name,
                sfa.fee_structure_id AS cur_fs_id,
                fs.institution_id AS fs_inst_id,
                fs.academic_year_id AS fs_ay_id,
                fs.name AS fs_name,
                fs.amount AS fs_amount,
                fs.frequency AS fs_freq,
                fs.installments_count AS fs_inst_cnt,
                fs.due_day AS fs_due_day,
                fs.late_fee_amount AS fs_late_amt,
                fs.late_fee_days AS fs_late_days,
                fs.standard_id AS fs_std_id,
                fs.category_id AS fs_cat_id
            FROM student_fee_assignments sfa
            JOIN students s ON s.id = sfa.student_id
            JOIN academic_years ay ON ay.id = sfa.academic_year_id
            JOIN fee_structures fs ON fs.id = sfa.fee_structure_id
            WHERE ay.institution_id <> s.institution_id
               OR fs.institution_id <> s.institution_id
               OR fs.academic_year_id <> ay.id
            ORDER BY sfa.id
            """
        )
    ).mappings().all()

    for row in rows:
        sfa_id = row["sfa_id"]
        if "fee_invoices" in tables:
            has_active_inv = bind.execute(
                sa.text(
                    "SELECT 1 FROM fee_invoices WHERE assignment_id = :aid AND status <> 'cancelled' LIMIT 1"
                ),
                {"aid": sfa_id},
            ).scalar_one_or_none()
            if has_active_inv:
                continue

        student_inst_id = row["student_inst_id"]
        target_ay_id = row["cur_ay_id"]

        if row["ay_inst_id"] != student_inst_id:
            resolved_ay = None
            if "student_enrollments" in tables:
                resolved_ay = bind.execute(
                    sa.text(
                        """
                        SELECT se.academic_year_id
                        FROM student_enrollments se
                        JOIN academic_years ay2 ON ay2.id = se.academic_year_id
                        WHERE se.student_id = :sid
                          AND ay2.institution_id = :inst_id
                          AND ay2.is_active = TRUE
                        ORDER BY CASE WHEN se.status = 'active' THEN 0 ELSE 1 END, se.id DESC
                        LIMIT 1
                        """
                    ),
                    {"sid": row["student_id"], "inst_id": student_inst_id},
                ).scalar_one_or_none()

            if resolved_ay is None:
                resolved_ay = bind.execute(
                    sa.text(
                        """
                        SELECT id FROM academic_years
                        WHERE institution_id = :inst_id
                          AND LOWER(name) = LOWER(:ay_name)
                          AND is_active = TRUE
                        ORDER BY id DESC LIMIT 1
                        """
                    ),
                    {"inst_id": student_inst_id, "ay_name": _strip_demo_suffix(row["ay_name"])},
                ).scalar_one_or_none()

            if resolved_ay is None:
                resolved_ay = bind.execute(
                    sa.text(
                        """
                        SELECT id FROM academic_years
                        WHERE institution_id = :inst_id AND is_active = TRUE
                        ORDER BY is_current DESC, id DESC LIMIT 1
                        """
                    ),
                    {"inst_id": student_inst_id},
                ).scalar_one_or_none()

            if resolved_ay is not None:
                target_ay_id = resolved_ay

        target_fs_id = row["cur_fs_id"]
        if row["fs_inst_id"] != student_inst_id or row["fs_ay_id"] != target_ay_id:
            clean_fs_name = _strip_demo_suffix(row["fs_name"])
            matched_fs = bind.execute(
                sa.text(
                    """
                    SELECT id FROM fee_structures
                    WHERE institution_id = :inst_id
                      AND academic_year_id = :ay_id
                      AND LOWER(name) = LOWER(:fname)
                      AND is_active = TRUE
                    ORDER BY id LIMIT 1
                    """
                ),
                {"inst_id": student_inst_id, "ay_id": target_ay_id, "fname": clean_fs_name},
            ).scalar_one_or_none()

            if matched_fs is not None:
                target_fs_id = matched_fs
            else:
                # Resolve target category_id within student_inst_id
                src_cat_name = bind.execute(
                    sa.text("SELECT name FROM fee_categories WHERE id = :cid"),
                    {"cid": row["fs_cat_id"]},
                ).scalar_one_or_none()
                clean_cat_name = _strip_demo_suffix(src_cat_name or "Tuition Fee")
                target_cat_id = bind.execute(
                    sa.text(
                        """
                        SELECT id FROM fee_categories
                        WHERE institution_id = :inst_id AND LOWER(name) = LOWER(:cname)
                        ORDER BY id LIMIT 1
                        """
                    ),
                    {"inst_id": student_inst_id, "cname": clean_cat_name},
                ).scalar_one_or_none()
                if target_cat_id is None:
                    target_cat_id = bind.execute(
                        sa.text(
                            "SELECT id FROM fee_categories WHERE institution_id = :inst_id ORDER BY id LIMIT 1"
                        ),
                        {"inst_id": student_inst_id},
                    ).scalar_one_or_none()
                if target_cat_id is None:
                    target_cat_id = bind.execute(
                        sa.text(
                            """
                            INSERT INTO fee_categories (institution_id, name, is_active)
                            VALUES (:inst_id, :cname, TRUE)
                            RETURNING id
                            """
                        ),
                        {"inst_id": student_inst_id, "cname": clean_cat_name},
                    ).scalar_one()

                # Map standard_id if an identically named standard exists in target institution
                target_std_id = None
                if row["fs_std_id"] is not None and "standards" in tables:
                    src_std_name = bind.execute(
                        sa.text("SELECT name FROM standards WHERE id = :std_id"),
                        {"std_id": row["fs_std_id"]},
                    ).scalar_one_or_none()
                    if src_std_name:
                        target_std_id = bind.execute(
                            sa.text(
                                """
                                SELECT id FROM standards
                                WHERE institution_id = :inst_id AND LOWER(name) = LOWER(:sname)
                                ORDER BY id LIMIT 1
                                """
                            ),
                            {"inst_id": student_inst_id, "sname": src_std_name},
                        ).scalar_one_or_none()

                target_fs_id = bind.execute(
                    sa.text(
                        """
                        INSERT INTO fee_structures (
                            institution_id, academic_year_id, standard_id, category_id,
                            name, amount, frequency, installments_count, due_day,
                            late_fee_amount, late_fee_days, is_active
                        )
                        VALUES (
                            :inst_id, :ay_id, :std_id, :cat_id,
                            :fname, :amount, :freq, :inst_cnt, :due_day,
                            :late_amt, :late_days, TRUE
                        )
                        RETURNING id
                        """
                    ),
                    {
                        "inst_id": student_inst_id,
                        "ay_id": target_ay_id,
                        "std_id": target_std_id,
                        "cat_id": target_cat_id,
                        "fname": clean_fs_name,
                        "amount": row["fs_amount"],
                        "freq": row["fs_freq"] or "annual",
                        "inst_cnt": row["fs_inst_cnt"] or 1,
                        "due_day": row["fs_due_day"],
                        "late_amt": row["fs_late_amt"] or 0,
                        "late_days": row["fs_late_days"] or 0,
                    },
                ).scalar_one()

        can_move_ay = target_ay_id == row["cur_ay_id"] or (
            bind.execute(
                sa.text(
                    """
                    SELECT 1 FROM student_fee_assignments
                    WHERE student_id = :sid AND academic_year_id = :ay_id AND id <> :sfa_id
                    LIMIT 1
                    """
                ),
                {"sid": row["student_id"], "ay_id": target_ay_id, "sfa_id": sfa_id},
            ).scalar_one_or_none()
            is None
        )

        if can_move_ay:
            bind.execute(
                sa.text(
                    """
                    UPDATE student_fee_assignments
                    SET academic_year_id = :ay_id, fee_structure_id = :fs_id
                    WHERE id = :sfa_id
                    """
                ),
                {"ay_id": target_ay_id, "fs_id": target_fs_id, "sfa_id": sfa_id},
            )
        else:
            bind.execute(
                sa.text(
                    """
                    UPDATE student_fee_assignments
                    SET fee_structure_id = :fs_id
                    WHERE id = :sfa_id
                    """
                ),
                {"fs_id": target_fs_id, "sfa_id": sfa_id},
            )


def downgrade() -> None:
    # Data repair migration is non-destructive and intentionally irreversible.
    pass
