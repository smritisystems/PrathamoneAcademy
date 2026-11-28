# /**
#  * @file        063_default_india_network_login_bg.py
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
#  * @description Normalize legacy login_bg_mode defaults ('waves' or unconfigured 'video') to 'india_network' and infer YouTube video type when a YouTube URL is stored.
#  */

"""Set India Network as default login background and normalize video type metadata

Revision ID: 063_default_india_network
Revises: 062_repair_baseline_perms
Create Date: 2026-11-28
"""

from alembic import op
import sqlalchemy as sa


revision = "063_default_india_network"
down_revision = "062_repair_baseline_perms"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()

    # Promote legacy 'waves' / blank / broken 'video' defaults to 'india_network'
    conn.execute(
        sa.text(
            """
            UPDATE institution_settings
            SET value = 'india_network', updated_at = NOW()
            WHERE category = 'branding'
              AND key IN ('login_bg_mode', 'login_bg_style')
              AND (value IS NULL OR TRIM(value) = '' OR LOWER(TRIM(value)) IN ('waves', 'wave_gradient', 'video'))
            """
        )
    )

    # Ensure institutions without any login_bg_mode row receive explicit 'india_network'
    conn.execute(
        sa.text(
            """
            INSERT INTO institution_settings (institution_id, category, key, value, data_type, is_encrypted, created_at, updated_at)
            SELECT i.id, 'branding', 'login_bg_mode', 'india_network', 'string', FALSE, NOW(), NOW()
            FROM institutions i
            WHERE NOT EXISTS (
                SELECT 1
                FROM institution_settings s
                WHERE s.institution_id = i.id
                  AND s.key = 'login_bg_mode'
            )
            """
        )
    )

    # Normalize video_type = 'youtube' when a YouTube link is stored in login_bg_video_url
    conn.execute(
        sa.text(
            """
            INSERT INTO institution_settings (institution_id, category, key, value, data_type, is_encrypted, created_at, updated_at)
            SELECT s.institution_id, 'branding', 'login_bg_video_type', 'youtube', 'string', FALSE, NOW(), NOW()
            FROM institution_settings s
            WHERE s.key = 'login_bg_video_url'
              AND (LOWER(s.value) LIKE '%youtu.be/%' OR LOWER(s.value) LIKE '%youtube.com/%')
              AND NOT EXISTS (
                  SELECT 1
                  FROM institution_settings vt
                  WHERE vt.institution_id = s.institution_id
                    AND vt.key = 'login_bg_video_type'
              )
            """
        )
    )
    conn.execute(
        sa.text(
            """
            UPDATE institution_settings vt
            SET value = 'youtube', updated_at = NOW()
            FROM institution_settings vu
            WHERE vt.institution_id = vu.institution_id
              AND vt.key = 'login_bg_video_type'
              AND vu.key = 'login_bg_video_url'
              AND (LOWER(vu.value) LIKE '%youtu.be/%' OR LOWER(vu.value) LIKE '%youtube.com/%')
            """
        )
    )


def downgrade() -> None:
    pass
