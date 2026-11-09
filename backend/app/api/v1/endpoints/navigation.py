# /**
#  * @file        navigation.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      backend.app.api.v1.endpoints
#  *
#  * @author      Jawahar R. Mallah
#  * @organization AITDL (AI Technology & Development Lab)
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 AITDL
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-10
#  * @updated     2026-11-10
#  *
#  * @description REST API endpoints for user menu personalization, navigation modes, telemetry tracking, and suggestions.
#  */

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
import json

from app.core.database import get_db
from app.core.deps import get_current_active_user, require_role
from app.models.user import User
from app.models.settings import InstitutionSetting, SettingAuditLog
from app.models.navigation import UserNavigationPreference
from app.services.navigation_service import NavigationService

router = APIRouter()


class CustomGroupPayload(BaseModel):
    id: Optional[str] = None
    name: str
    items: List[str] = Field(default_factory=list)


class UserPreferencesUpdate(BaseModel):
    navigation_mode: str = Field(default="standard")  # standard | hybrid | my_menu_only
    pinned_items: List[str] = Field(default_factory=list)
    hidden_items: List[str] = Field(default_factory=list)
    custom_groups: List[CustomGroupPayload] = Field(default_factory=list)
    item_order: List[str] = Field(default_factory=list)


class ActivityTrackPayload(BaseModel):
    module_key: str
    route_path: str
    label: Optional[str] = None


class DismissSuggestionPayload(BaseModel):
    suggestion_id: str


class AdminPolicyUpdate(BaseModel):
    enable_user_customization: Optional[bool] = None
    default_navigation_mode: Optional[str] = None
    allow_my_menu_only: Optional[bool] = None
    allow_reordering: Optional[bool] = None
    allow_hiding: Optional[bool] = None
    enable_usage_recommendations: Optional[bool] = None
    usage_analysis_period_days: Optional[int] = None
    role_default_menus: Optional[Dict[str, List[str]]] = None
    reason: Optional[str] = None


@router.get("/config")
async def get_navigation_config(
    institution_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Returns effective navigation configuration for the authenticated user,
    including role defaults, active navigation mode, and authorized modules.
    """
    target_inst_id = institution_id or current_user.institution_id or 1
    return await NavigationService.get_user_navigation_config(db, current_user, target_inst_id)


@router.put("/preferences")
async def update_user_preferences(
    payload: UserPreferencesUpdate,
    institution_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Updates the logged-in user's personal menu preferences (pinned items, hidden items,
    navigation mode, and custom group categories).
    """
    target_inst_id = institution_id or current_user.institution_id or 1
    try:
        return await NavigationService.save_user_preferences(
            db, current_user, target_inst_id, payload.model_dump()
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/reset-preferences")
async def reset_user_preferences(
    institution_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Resets the current user's navigation preferences to institute/role defaults.
    """
    target_inst_id = institution_id or current_user.institution_id or 1
    return await NavigationService.reset_user_preferences(db, current_user, target_inst_id)


@router.post("/track-activity")
async def track_navigation_activity(
    payload: ActivityTrackPayload,
    institution_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Records a privacy-preserving navigation event for intelligent adaptive suggestions.
    Throttled to avoid counting rapid page refreshes.
    """
    target_inst_id = institution_id or current_user.institution_id or 1
    recorded = await NavigationService.track_activity(
        db, current_user, target_inst_id, payload.module_key, payload.route_path, payload.label
    )
    return {"status": "success", "recorded": recorded}


@router.get("/suggestions")
async def get_navigation_suggestions(
    institution_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Returns intelligent usage-based suggestions based on 7, 30, and 90-day activity.
    """
    target_inst_id = institution_id or current_user.institution_id or 1
    suggestions = await NavigationService.get_intelligent_suggestions(db, current_user, target_inst_id)
    return {"suggestions": suggestions}


@router.post("/dismiss-suggestion")
async def dismiss_suggestion(
    payload: DismissSuggestionPayload,
    institution_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Dismisses a recommendation so it does not reappear for the current user.
    """
    target_inst_id = institution_id or current_user.institution_id or 1
    await NavigationService.dismiss_suggestion(db, current_user, target_inst_id, payload.suggestion_id)
    return {"status": "success", "message": "Suggestion dismissed"}


@router.get("/recent")
async def get_recent_visits(
    limit: int = Query(default=8, ge=1, le=20),
    institution_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Returns top recently visited unique modules and routes for the current user.
    """
    target_inst_id = institution_id or current_user.institution_id or 1
    visits = await NavigationService.get_recent_visits(db, current_user, target_inst_id, limit)
    return {"recent_visits": visits}


# =========================================================================
# INSTITUTE ADMINISTRATION ENDPOINTS
# =========================================================================

@router.get("/admin/policy")
async def get_institute_navigation_policy(
    institution_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin", "principal")),
):
    """
    Returns institute-wide navigation settings and role-based default menus.
    """
    target_inst_id = institution_id or current_user.institution_id or 1
    policy = await NavigationService.get_institution_policy(db, target_inst_id)
    return {"policy": policy}


@router.put("/admin/policy")
async def update_institute_navigation_policy(
    payload: AdminPolicyUpdate,
    institution_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin", "principal")),
):
    """
    Updates institute-wide navigation governance rules and logs to SettingAuditLog.
    """
    target_inst_id = institution_id or current_user.institution_id or 1
    updates = payload.model_dump(exclude_unset=True)
    reason = updates.pop("reason", "Updated via Navigation Administration Workspace")

    for k, v in updates.items():
        data_type = "string"
        serialized_val = ""
        if isinstance(v, bool):
            data_type = "boolean"
            serialized_val = "true" if v else "false"
        elif isinstance(v, (int, float)):
            data_type = "number"
            serialized_val = str(v)
        elif isinstance(v, (dict, list)):
            data_type = "json"
            serialized_val = json.dumps(v)
        else:
            serialized_val = str(v) if v is not None else ""

        stmt = select(InstitutionSetting).where(
            InstitutionSetting.institution_id == target_inst_id,
            InstitutionSetting.category == "navigation",
            InstitutionSetting.key == k,
        )
        existing = (await db.execute(stmt)).scalar_one_or_none()
        old_val = existing.value if existing else None

        if existing:
            existing.value = serialized_val
            existing.data_type = data_type
            existing.updated_by_id = current_user.id
        else:
            item = InstitutionSetting(
                institution_id=target_inst_id,
                category="navigation",
                key=k,
                value=serialized_val,
                data_type=data_type,
                updated_by_id=current_user.id,
            )
            db.add(item)

        if old_val != serialized_val:
            audit = SettingAuditLog(
                institution_id=target_inst_id,
                setting_key=f"navigation.{k}",
                category="navigation",
                previous_value=old_val,
                new_value=serialized_val,
                changed_by_id=current_user.id,
                changed_by_name=f"{current_user.first_name} {current_user.last_name}".strip(),
                reason=reason,
            )
            db.add(audit)

    await db.commit()
    return {
        "status": "success",
        "message": "Institute navigation policy updated successfully",
        "policy": await NavigationService.get_institution_policy(db, target_inst_id),
    }


@router.post("/admin/reset-all-users")
async def reset_all_user_preferences(
    institution_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin", "principal")),
):
    """
    Administrative action: resets all users' custom navigation preferences in the institute
    back to the institute defaults.
    """
    target_inst_id = institution_id or current_user.institution_id or 1
    stmt = delete(UserNavigationPreference).where(
        UserNavigationPreference.institution_id == target_inst_id
    )
    result = await db.execute(stmt)
    await db.commit()

    # Log action to SettingAuditLog
    audit = SettingAuditLog(
        institution_id=target_inst_id,
        setting_key="navigation.reset_all_users",
        category="navigation",
        previous_value=None,
        new_value=f"Reset {result.rowcount} user menu preference records to defaults",
        changed_by_id=current_user.id,
        changed_by_name=f"{current_user.first_name} {current_user.last_name}".strip(),
        reason="Administrative reset of all user navigation preferences to institute defaults",
    )
    db.add(audit)
    await db.commit()

    return {
        "status": "success",
        "message": f"Successfully reset navigation preferences for all users ({result.rowcount} records cleared).",
    }
