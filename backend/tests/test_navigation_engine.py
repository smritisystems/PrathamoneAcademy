# /**
#  * @file        test_navigation_engine.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      backend.tests
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
#  * @description Test suite for User-Defined Menu & Intelligent Adaptive Navigation Engine.
#  */

import pytest


class TestNavigationEngine:
    @pytest.mark.asyncio
    async def test_get_navigation_config(
        self, client, auth_headers, test_institution
    ):
        """Verify fetching effective navigation configuration and policy defaults."""
        res = await client.get(
            f"/api/v1/navigation/config?institution_id={test_institution.id}",
            headers=auth_headers,
        )
        assert res.status_code == 200
        data = res.json()
        assert "institution_policy" in data
        assert "effective_mode" in data
        assert "user_preferences" in data
        assert "role_defaults" in data
        assert "authorized_modules" in data
        assert len(data["authorized_modules"]) > 0

    @pytest.mark.asyncio
    async def test_update_and_reset_user_preferences(
        self, client, auth_headers, test_institution
    ):
        """Verify saving personal menu customizations (pins, hides, groups, and modes)."""
        payload = {
            "navigation_mode": "hybrid",
            "pinned_items": ["dashboard", "fees", "students"],
            "hidden_items": ["releases"],
            "custom_groups": [
                {
                    "id": "grp_daily",
                    "name": "Daily Operations",
                    "items": ["fees", "students"],
                }
            ],
            "item_order": ["dashboard", "fees", "students"],
        }
        res = await client.put(
            f"/api/v1/navigation/preferences?institution_id={test_institution.id}",
            json=payload,
            headers=auth_headers,
        )
        assert res.status_code == 200
        data = res.json()
        pref = data["user_preferences"]
        assert pref["navigation_mode"] == "hybrid"
        assert "fees" in pref["pinned_items"]
        assert "releases" in pref["hidden_items"]
        assert len(pref["custom_groups"]) == 1
        assert pref["custom_groups"][0]["name"] == "Daily Operations"

        # Verify Reset Preferences restores default state
        reset_res = await client.post(
            f"/api/v1/navigation/reset-preferences?institution_id={test_institution.id}",
            headers=auth_headers,
        )
        assert reset_res.status_code == 200
        reset_data = reset_res.json()
        assert reset_data["user_preferences"]["navigation_mode"] == "standard"

    @pytest.mark.asyncio
    async def test_activity_tracking_and_suggestions(
        self, client, auth_headers, test_institution
    ):
        """Verify telemetry recording and intelligent suggestion engine."""
        # 1. Track activity
        track_res = await client.post(
            f"/api/v1/navigation/track-activity?institution_id={test_institution.id}",
            json={
                "module_key": "fees",
                "route_path": "/fees/collection",
                "label": "Collection Desk",
            },
            headers=auth_headers,
        )
        assert track_res.status_code == 200
        assert track_res.json()["status"] == "success"

        # 2. Get recent visits
        recent_res = await client.get(
            f"/api/v1/navigation/recent?institution_id={test_institution.id}",
            headers=auth_headers,
        )
        assert recent_res.status_code == 200
        recents = recent_res.json()["recent_visits"]
        assert len(recents) > 0
        assert recents[0]["module_key"] == "fees"

        # 3. Get suggestions
        sug_res = await client.get(
            f"/api/v1/navigation/suggestions?institution_id={test_institution.id}",
            headers=auth_headers,
        )
        assert sug_res.status_code == 200
        assert "suggestions" in sug_res.json()

    @pytest.mark.asyncio
    async def test_admin_policy_management(
        self, client, auth_headers, test_institution
    ):
        """Verify institute admin policy updates and setting audit logging."""
        # 1. Get policy
        pol_res = await client.get(
            f"/api/v1/navigation/admin/policy?institution_id={test_institution.id}",
            headers=auth_headers,
        )
        assert pol_res.status_code == 200
        assert "policy" in pol_res.json()

        # 2. Update policy
        update_res = await client.put(
            f"/api/v1/navigation/admin/policy?institution_id={test_institution.id}",
            json={
                "enable_user_customization": True,
                "default_navigation_mode": "hybrid",
                "allow_my_menu_only": True,
                "reason": "Test institute policy upgrade",
            },
            headers=auth_headers,
        )
        assert update_res.status_code == 200
        updated = update_res.json()["policy"]
        assert updated["default_navigation_mode"] == "hybrid"
