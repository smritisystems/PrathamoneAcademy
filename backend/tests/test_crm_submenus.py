# /**
#  * @file        test_crm_submenus.py
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
#  * @created     2026-11-08
#  * @updated     2026-11-08
#  *
#  * @description Test suite for dedicated CRM submenu endpoints: Follow-up Centre, Counselling & Demo, Sources, Campaigns, Reports Analytics, and Configuration Settings.
#  */

import pytest
from datetime import datetime, timezone, timedelta

pytestmark = pytest.mark.asyncio


async def test_crm_follow_ups_endpoint(client, auth_headers, test_institution):
    """Verifies GET /api/v1/leads/follow-ups endpoint returns items and KPI summary."""
    resp = await client.get("/api/v1/leads/follow-ups", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "items" in data
    assert "total" in data
    assert "summary" in data
    assert "overdue_count" in data["summary"]
    assert "today_count" in data["summary"]
    assert "upcoming_count" in data["summary"]
    assert "completed_count" in data["summary"]


async def test_crm_demo_classes_endpoints(client, auth_headers, test_institution):
    """Verifies GET and PUT for /api/v1/leads/demo-classes."""
    # 1. First create a lead to schedule a demo on
    create_payload = {
        "student_name": "Demo Attendee",
        "mobile": "9876501234",
        "source": "Website",
        "priority": "hot",
        "stage": "counselling_demo",
    }
    create_resp = await client.post("/api/v1/leads", json=create_payload, headers=auth_headers)
    assert create_resp.status_code in (200, 201)
    lead_id = create_resp.json()["id"]

    # 2. Schedule a demo class
    demo_payload = {
        "scheduled_at": (datetime.now(timezone.utc) + timedelta(days=2)).isoformat(),
        "mode": "offline",
        "feedback": "Interested in Physics Demo",
    }
    sched_resp = await client.post(f"/api/v1/leads/{lead_id}/demo-classes", json=demo_payload, headers=auth_headers)
    assert sched_resp.status_code == 200

    # 3. GET /api/v1/leads/demo-classes
    get_resp = await client.get("/api/v1/leads/demo-classes", headers=auth_headers)
    assert get_resp.status_code == 200
    demo_data = get_resp.json()
    assert "items" in demo_data
    assert "summary" in demo_data
    assert demo_data["summary"]["total_count"] >= 1
    found = [d for d in demo_data["items"] if d["lead_id"] == lead_id]
    assert len(found) >= 1
    demo_id = found[0]["id"]

    # 4. PUT /api/v1/leads/demo-classes/{id}
    update_payload = {
        "status": "attended",
        "rating": 5,
        "feedback": "Excellent lecture, decided to proceed with admission",
    }
    put_resp = await client.put(f"/api/v1/leads/demo-classes/{demo_id}", json=update_payload, headers=auth_headers)
    assert put_resp.status_code == 200
    assert put_resp.json()["success"] is True
    assert put_resp.json()["demo"]["status"] == "attended"
    assert put_resp.json()["demo"]["rating"] == 5


async def test_crm_sources_summary_endpoint(client, auth_headers, test_institution):
    """Verifies GET /api/v1/leads/sources/summary aggregates channel metrics."""
    resp = await client.get("/api/v1/leads/sources/summary", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "total_leads" in data
    assert "items" in data
    assert isinstance(data["items"], list)
    if len(data["items"]) > 0:
        item = data["items"][0]
        assert "source" in item
        assert "total_leads" in item
        assert "conversion_rate" in item
        assert "share_percentage" in item


async def test_crm_campaigns_summary_endpoint(client, auth_headers, test_institution):
    """Verifies GET /api/v1/leads/campaigns/summary returns campaign metrics."""
    resp = await client.get("/api/v1/leads/campaigns/summary", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "items" in data
    assert "total_campaigns" in data


async def test_crm_reports_analytics_endpoint(client, auth_headers, test_institution):
    """Verifies GET /api/v1/leads/reports/analytics computes monthly trajectory, loss Pareto, and counsellor matrix."""
    resp = await client.get("/api/v1/leads/reports/analytics", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "monthly_trajectories" in data
    assert "lost_reasons" in data
    assert "counsellors_matrix" in data
    assert "stage_funnel" in data
    assert len(data["monthly_trajectories"]) == 6


async def test_crm_settings_config_endpoints(client, auth_headers, test_institution):
    """Verifies GET and PUT for /api/v1/leads/settings/config."""
    # 1. GET default or current config
    get_resp = await client.get("/api/v1/leads/settings/config", headers=auth_headers)
    assert get_resp.status_code == 200
    cfg = get_resp.json()
    assert "pipeline_stages" in cfg
    assert "sla_follow_up_hours" in cfg
    assert "loss_reasons" in cfg
    assert "source_channels" in cfg

    # 2. PUT updated config
    update_data = {
        "sla_follow_up_hours": 36,
        "notify_on_new_enquiry": True,
    }
    put_resp = await client.put("/api/v1/leads/settings/config", json=update_data, headers=auth_headers)
    assert put_resp.status_code == 200
    assert put_resp.json()["success"] is True
    assert put_resp.json()["config"]["sla_follow_up_hours"] == 36
