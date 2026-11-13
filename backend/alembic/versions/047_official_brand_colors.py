# /**
#  * @file        047_official_brand_colors.py
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
#  * @created     2026-11-13
#  * @updated     2026-11-13
#  *
#  * @description Migrates institution default colors to official PrathamOne brand artwork specifications (#0B2D6B Navy, #071C44 Prussian Blue, #F57C00 Saffron Orange).
#  */

"""migrate institution default colors to official PrathamOne brand palette

Revision ID: 047_official_brand_colors
Revises: 046_create_eduboard_tables
Create Date: 2026-11-13
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "047_official_brand_colors"
down_revision: Union[str, None] = "046_create_eduboard_tables"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    # 1. Update server defaults on institutions table
    try:
        op.alter_column("institutions", "primary_color", server_default="#0B2D6B")
        op.alter_column("institutions", "secondary_color", server_default="#071C44")
        op.alter_column("institutions", "accent_color", server_default="#F57C00")
    except Exception as e:
        print(f"Warning: could not alter server defaults: {e}")

    # 2. Update default institution (id = 1) if using legacy royal blue
    conn.execute(
        sa.text(
            """
            UPDATE institutions 
            SET primary_color = '#0B2D6B', 
                secondary_color = '#071C44', 
                accent_color = '#F57C00'
            WHERE id = 1 AND (primary_color = '#1E40AF' OR primary_color IS NULL);
            """
        )
    )

    # 3. Update institution_settings for institution 1
    conn.execute(
        sa.text(
            """
            UPDATE institution_settings 
            SET value = '#0B2D6B', updated_at = now() 
            WHERE institution_id = 1 AND key = 'primary_color' AND (value = '#1E40AF' OR value IS NULL);
            """
        )
    )
    conn.execute(
        sa.text(
            """
            UPDATE institution_settings 
            SET value = '#071C44', updated_at = now() 
            WHERE institution_id = 1 AND key = 'secondary_color' AND (value = '#3B82F6' OR value IS NULL);
            """
        )
    )
    conn.execute(
        sa.text(
            """
            UPDATE institution_settings 
            SET value = '#F57C00', updated_at = now() 
            WHERE institution_id = 1 AND key = 'accent_color' AND (value = '#8B5CF6' OR value IS NULL);
            """
        )
    )
    conn.execute(
        sa.text(
            """
            UPDATE institution_settings 
            SET value = 'Pratham Navy & Saffron', updated_at = now() 
            WHERE institution_id = 1 AND key = 'theme_preset' AND (value = 'Royal Blue & Indigo' OR value IS NULL);
            """
        )
    )


def downgrade() -> None:
    conn = op.get_bind()
    try:
        op.alter_column("institutions", "primary_color", server_default="#1E40AF")
        op.alter_column("institutions", "secondary_color", server_default="#3B82F6")
        op.alter_column("institutions", "accent_color", server_default="#8B5CF6")
    except Exception:
        pass

    conn.execute(
        sa.text(
            """
            UPDATE institutions 
            SET primary_color = '#1E40AF', 
                secondary_color = '#3B82F6', 
                accent_color = '#8B5CF6'
            WHERE id = 1 AND primary_color = '#0B2D6B';
            """
        )
    )
    conn.execute(
        sa.text(
            """
            UPDATE institution_settings 
            SET value = '#1E40AF', updated_at = now() 
            WHERE institution_id = 1 AND key = 'primary_color' AND value = '#0B2D6B';
            """
        )
    )
    conn.execute(
        sa.text(
            """
            UPDATE institution_settings 
            SET value = '#3B82F6', updated_at = now() 
            WHERE institution_id = 1 AND key = 'secondary_color' AND value = '#071C44';
            """
        )
    )
    conn.execute(
        sa.text(
            """
            UPDATE institution_settings 
            SET value = '#8B5CF6', updated_at = now() 
            WHERE institution_id = 1 AND key = 'accent_color' AND value = '#F57C00';
            """
        )
    )
    conn.execute(
        sa.text(
            """
            UPDATE institution_settings 
            SET value = 'Royal Blue & Indigo', updated_at = now() 
            WHERE institution_id = 1 AND key = 'theme_preset' AND value = 'Pratham Navy & Saffron';
            """
        )
    )
