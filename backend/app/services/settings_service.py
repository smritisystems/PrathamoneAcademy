# /**
#  * @file        settings_service.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      backend.app.services
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
#  * @description Service helper for retrieving institution-scoped configuration settings with schema defaults.
#  */

from typing import Any, Optional, Dict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import json

from app.models.settings import InstitutionSetting


# Authoritative fallback defaults for student visibility & admission policies
DEFAULT_STUDENT_VISIBILITY = {
    "student_visibility_dashboard": "active_only",
    "student_visibility_reports": "include_all",
    "student_visibility_lists": "active_only",
}


async def get_institution_setting(
    db: AsyncSession,
    institution_id: Optional[int],
    category: str,
    key: str,
    default: Any = None,
) -> Any:
    """
    Retrieve a setting value for an institution with fallback to defaults.
    """
    if institution_id:
        stmt = select(InstitutionSetting).where(
            InstitutionSetting.institution_id == institution_id,
            InstitutionSetting.category == category,
            InstitutionSetting.key == key,
        )
        row = (await db.execute(stmt)).scalar_one_or_none()
        if row and row.value is not None:
            val = row.value
            if row.data_type == "boolean":
                return val.lower() in ("true", "1")
            elif row.data_type == "number":
                try:
                    return float(val) if "." in val else int(val)
                except Exception:
                    return val
            elif row.data_type == "json":
                try:
                    return json.loads(val)
                except Exception:
                    return val
            return val

    # Fallback to predefined student visibility defaults if matching key
    if key in DEFAULT_STUDENT_VISIBILITY:
        return DEFAULT_STUDENT_VISIBILITY[key]

    return default


async def get_student_visibility_settings(
    db: AsyncSession,
    institution_id: Optional[int],
) -> Dict[str, str]:
    """
    Get all three student visibility configuration parameters for an institution:
    - dashboard: 'active_only' | 'include_all'
    - reports: 'include_all' | 'active_only'
    - lists: 'active_only' | 'include_all'
    """
    dashboard_vis = await get_institution_setting(
        db, institution_id, "admission", "student_visibility_dashboard", "active_only"
    )
    reports_vis = await get_institution_setting(
        db, institution_id, "admission", "student_visibility_reports", "include_all"
    )
    lists_vis = await get_institution_setting(
        db, institution_id, "admission", "student_visibility_lists", "active_only"
    )
    return {
        "dashboard": dashboard_vis,
        "reports": reports_vis,
        "lists": lists_vis,
    }

