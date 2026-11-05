# /**
#  * @file        018_institution_branding_text.py
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
#  * @description Alembic migration expanding institution logo_url and favicon_url from VARCHAR(500) to Text to support data URIs and asset URLs.
#  */

"""Expand institution logo_url and favicon_url to Text

Revision ID: 018_branding_text
Revises: 017_fee_recon
Create Date: 2026-11-05 20:05:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "018_branding_text"
down_revision = "017_fee_recon"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        "institutions",
        "logo_url",
        type_=sa.Text(),
        existing_type=sa.String(500),
        existing_nullable=True,
    )
    op.alter_column(
        "institutions",
        "favicon_url",
        type_=sa.Text(),
        existing_type=sa.String(500),
        existing_nullable=True,
    )


def downgrade() -> None:
    op.alter_column(
        "institutions",
        "logo_url",
        type_=sa.String(500),
        existing_type=sa.Text(),
        existing_nullable=True,
    )
    op.alter_column(
        "institutions",
        "favicon_url",
        type_=sa.String(500),
        existing_type=sa.Text(),
        existing_nullable=True,
    )

