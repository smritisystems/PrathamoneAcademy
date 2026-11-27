# /**
#  * @file        060_institution_profile_and_branches.py
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
#  * @created     2026-11-27
#  * @updated     2026-11-27
#  *
#  * @description Extend institutions with structured profile/legal/onboarding columns and add normalized institution_branches table without overwriting existing profiles.
#  */

"""Extend institution profile fields and add normalized institution_branches table

Revision ID: 060_inst_profile_branches
Revises: 059_budgeting_and_forecasting
Create Date: 2026-11-27
"""

import re
from alembic import op
import sqlalchemy as sa


revision = "060_inst_profile_branches"
down_revision = "059_budgeting_and_forecasting"
branch_labels = None
depends_on = None

_PLACEHOLDER_NAMES = ("Your Academy Name", "Your Coaching Institute", "Coaching Institute", "PrathamOne Academy", "")
_DUMMY_PHONES = ("+91 8779 123 007", "8779123007")
_DUMMY_ADDRESSES = (
    "Campus Address, Education Hub",
    "123 Education Lane, School District",
    "123 Education Hub, MG Road",
    "Vasai Road (W), Palghar - 401202",
)
_PAN_RE = re.compile(r"^[A-Z]{5}[0-9]{4}[A-Z]$")
_GSTIN_RE = re.compile(r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$")


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())

    if "institutions" in existing_tables:
        cols = {c["name"] for c in inspector.get_columns("institutions")}
        additions = [
            ("address_line_2", sa.Column("address_line_2", sa.String(length=255), nullable=True)),
            ("area_locality", sa.Column("area_locality", sa.String(length=150), nullable=True)),
            ("district", sa.Column("district", sa.String(length=100), nullable=True)),
            ("country", sa.Column("country", sa.String(length=100), nullable=True)),
            ("alternate_phone", sa.Column("alternate_phone", sa.String(length=30), nullable=True)),
            ("gstin", sa.Column("gstin", sa.String(length=20), nullable=True)),
            ("pan", sa.Column("pan", sa.String(length=20), nullable=True)),
            (
                "onboarding_completed",
                sa.Column(
                    "onboarding_completed",
                    sa.Boolean(),
                    nullable=False,
                    server_default=sa.text("false"),
                ),
            ),
            ("onboarding_completed_at", sa.Column("onboarding_completed_at", sa.DateTime(timezone=True), nullable=True)),
        ]
        for col_name, col_def in additions:
            if col_name not in cols:
                op.add_column("institutions", col_def)

        # Preserve existing customized customer profiles and mark them onboarded;
        # clear dummy leaked defaults only on unconfigured placeholder rows.
        rows = bind.execute(
            sa.text(
                "SELECT id, name, address, city, state, pincode, phone, email, tax_id, registration_number, onboarding_completed "
                "FROM institutions"
            )
        ).mappings().all()

        for row in rows:
            inst_id = row["id"]
            name = (row["name"] or "").strip()
            phone = (row["phone"] or "").strip()
            address = (row["address"] or "").strip()
            email = (row["email"] or "").strip()
            tax_id = (row["tax_id"] or "").strip().upper()

            is_placeholder = name in _PLACEHOLDER_NAMES
            has_real_contact = (phone not in ("", *_DUMMY_PHONES)) or (address not in ("", *_DUMMY_ADDRESSES))
            is_configured_existing = (not is_placeholder) or has_real_contact

            if is_configured_existing and not row["onboarding_completed"]:
                pan_val = tax_id if (_PAN_RE.fullmatch(tax_id) and tax_id != "AABCP1234K") else None
                gstin_val = tax_id if _GSTIN_RE.fullmatch(tax_id) else None
                bind.execute(
                    sa.text(
                        "UPDATE institutions "
                        "SET onboarding_completed = true, "
                        "    onboarding_completed_at = COALESCE(onboarding_completed_at, NOW()), "
                        "    pan = COALESCE(pan, :pan_val), "
                        "    gstin = COALESCE(gstin, :gstin_val) "
                        "WHERE id = :inst_id"
                    ),
                    {"pan_val": pan_val, "gstin_val": gstin_val, "inst_id": inst_id},
                )
            elif is_placeholder and not has_real_contact:
                # Scrub synthetic seed placeholders on unconfigured fresh/empty records
                bind.execute(
                    sa.text(
                        "UPDATE institutions "
                        "SET address = CASE WHEN address IN :dummy_addr THEN NULL ELSE address END, "
                        "    phone = CASE WHEN phone IN :dummy_phone THEN NULL ELSE phone END, "
                        "    email = CASE WHEN email IN ('admin@academy.edu', 'info@prathamoneacademy.in') THEN NULL ELSE email END, "
                        "    tax_id = CASE WHEN tax_id = 'AABCP1234K' THEN NULL ELSE tax_id END, "
                        "    registration_number = CASE WHEN registration_number = 'MH-COACH-2018-0157' THEN NULL ELSE registration_number END, "
                        "    city = CASE WHEN city = 'Education City' THEN NULL ELSE city END, "
                        "    pincode = CASE WHEN city = 'Education City' AND pincode = '400001' THEN NULL ELSE pincode END "
                        "WHERE id = :inst_id"
                    ).bindparams(
                        sa.bindparam("dummy_addr", expanding=True),
                        sa.bindparam("dummy_phone", expanding=True),
                    ),
                    {
                        "dummy_addr": list(_DUMMY_ADDRESSES),
                        "dummy_phone": list(_DUMMY_PHONES),
                        "inst_id": inst_id,
                    },
                )

    if "institution_branches" not in existing_tables:
        op.create_table(
            "institution_branches",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("institution_id", sa.Integer(), sa.ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False),
            sa.Column("branch_name", sa.String(length=150), nullable=False),
            sa.Column("branch_code", sa.String(length=50), nullable=False),
            sa.Column("is_main_branch", sa.Boolean(), nullable=False, server_default=sa.text("false")),
            sa.Column("address_line_1", sa.Text(), nullable=True),
            sa.Column("address_line_2", sa.String(length=255), nullable=True),
            sa.Column("area_locality", sa.String(length=150), nullable=True),
            sa.Column("city", sa.String(length=100), nullable=True),
            sa.Column("district", sa.String(length=100), nullable=True),
            sa.Column("state", sa.String(length=100), nullable=True),
            sa.Column("pincode", sa.String(length=20), nullable=True),
            sa.Column("country", sa.String(length=100), nullable=True),
            sa.Column("phone", sa.String(length=30), nullable=True),
            sa.Column("alternate_phone", sa.String(length=30), nullable=True),
            sa.Column("email", sa.String(length=200), nullable=True),
            sa.Column("gstin", sa.String(length=20), nullable=True),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.UniqueConstraint("institution_id", "branch_code", name="uq_institution_branch_code"),
        )
        op.create_index("ix_institution_branches_institution_id", "institution_branches", ["institution_id"])
        op.execute(
            sa.text(
                "CREATE UNIQUE INDEX IF NOT EXISTS uq_institution_single_main_branch "
                "ON institution_branches (institution_id) "
                "WHERE is_main_branch = true AND is_active = true"
            )
        )

    # Backfill Main Branch per institution if missing
    if "institutions" in existing_tables:
        inst_rows = bind.execute(
            sa.text(
                "SELECT id, address, address_line_2, area_locality, city, district, state, pincode, country, phone, alternate_phone, email, gstin "
                "FROM institutions"
            )
        ).mappings().all()
        for inst in inst_rows:
            has_branch = bind.execute(
                sa.text("SELECT id FROM institution_branches WHERE institution_id = :inst_id LIMIT 1"),
                {"inst_id": inst["id"]},
            ).first()
            if not has_branch:
                bind.execute(
                    sa.text(
                        "INSERT INTO institution_branches ("
                        "  institution_id, branch_name, branch_code, is_main_branch,"
                        "  address_line_1, address_line_2, area_locality, city, district, state, pincode, country,"
                        "  phone, alternate_phone, email, gstin, is_active"
                        ") VALUES ("
                        "  :institution_id, 'Main Branch', 'MAIN', true,"
                        "  :address_line_1, :address_line_2, :area_locality, :city, :district, :state, :pincode, :country,"
                        "  :phone, :alternate_phone, :email, :gstin, true"
                        ")"
                    ),
                    {
                        "institution_id": inst["id"],
                        "address_line_1": inst["address"],
                        "address_line_2": inst["address_line_2"],
                        "area_locality": inst["area_locality"],
                        "city": inst["city"],
                        "district": inst["district"],
                        "state": inst["state"],
                        "pincode": inst["pincode"],
                        "country": inst["country"],
                        "phone": inst["phone"],
                        "alternate_phone": inst["alternate_phone"],
                        "email": inst["email"],
                        "gstin": inst["gstin"],
                    },
                )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())

    if "institution_branches" in existing_tables:
        op.execute(sa.text("DROP INDEX IF EXISTS uq_institution_single_main_branch"))
        op.drop_index("ix_institution_branches_institution_id", table_name="institution_branches")
        op.drop_table("institution_branches")

    if "institutions" in existing_tables:
        cols = {c["name"] for c in inspector.get_columns("institutions")}
        for col_name in (
            "onboarding_completed_at",
            "onboarding_completed",
            "pan",
            "gstin",
            "alternate_phone",
            "country",
            "district",
            "area_locality",
            "address_line_2",
        ):
            if col_name in cols:
                op.drop_column("institutions", col_name)
