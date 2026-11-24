# /**
#  * @file        test_concession_scheme_settings.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      backend.tests
#  *
#  * @author      Jawahar R. Mallah
#  * @organization Smritisys & AITDL Networks
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 PrathamOne EduOS
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-10
#  * @updated     2026-11-25
#  *
#  * @description Test suite for Concession Scheme Settings, lifecycle updates, deletion immutability, and duplicate application prevention.
#  */

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.security import create_access_token


@pytest.mark.asyncio
async def test_concession_scheme_crud_and_immutability(client, auth_headers):
    # 1. List schemes
    res = await client.get("/api/v1/fees/concessions/types", headers=auth_headers)
    assert res.status_code == 200
    assert isinstance(res.json(), list)

    # 2. Create new scheme
    create_payload = {
        "code": "SCIENCE_OLYMPIAD_2026",
        "name": "Science Olympiad Achiever Scholarship",
        "category": "merit",
        "description": "Scholarship awarded to state-level Olympiad rankers",
        "funding_source": "institute",
        "calculation_type": "percentage",
        "default_value": 30.0,
        "max_discount_amount": 25000.0,
        "is_stackable": True,
        "requires_documents": True,
        "is_active": True,
    }
    res_create = await client.post("/api/v1/fees/concessions/types", json=create_payload, headers=auth_headers)
    assert res_create.status_code in (201, 400)
    
    type_id = None
    if res_create.status_code == 201:
        type_id = res_create.json()["id"]
    else:
        # Code already exists, find its ID
        res_all = await client.get("/api/v1/fees/concessions/types", headers=auth_headers)
        match = next((t for t in res_all.json() if t["code"] == "SCIENCE_OLYMPIAD_2026"), None)
        if match:
            type_id = match["id"]

    assert type_id is not None

    # Verify listing contains applications_count
    res_list = await client.get("/api/v1/fees/concessions/types", headers=auth_headers)
    assert res_list.status_code == 200
    types = res_list.json()
    assert len(types) >= 1
    assert "applications_count" in types[0]

    # 3. Update scheme
    update_payload = {
        "name": "Science Olympiad Achiever Scholarship (Updated)",
        "default_value": 35.0,
        "is_stackable": False,
    }
    res_update = await client.put(f"/api/v1/fees/concessions/types/{type_id}", json=update_payload, headers=auth_headers)
    assert res_update.status_code == 200

    # 4. Toggle scheme status
    res_toggle = await client.patch(f"/api/v1/fees/concessions/types/{type_id}/toggle-status", headers=auth_headers)
    assert res_toggle.status_code == 200
    assert "is_active" in res_toggle.json()

    # 5. Delete newly created unlinked scheme
    res_del_unused = await client.delete(f"/api/v1/fees/concessions/types/{type_id}", headers=auth_headers)
    assert res_del_unused.status_code == 200


@pytest.mark.asyncio
async def test_duplicate_concession_application_rejection(client, auth_headers, test_student, test_academic_year):
    # 1. Create a concession type for testing duplicate prevention
    scheme_payload = {
        "code": "DUP_TEST_SCHEME_2026",
        "name": "Duplicate Prevention Scholarship",
        "category": "merit",
        "funding_source": "institute",
        "calculation_type": "percentage",
        "default_value": 25.0,
        "is_stackable": True,
        "requires_documents": False,
        "is_active": True,
    }
    res_scheme = await client.post("/api/v1/fees/concessions/types", json=scheme_payload, headers=auth_headers)
    if res_scheme.status_code == 201:
        scheme_id = res_scheme.json()["id"]
    else:
        res_all = await client.get("/api/v1/fees/concessions/types", headers=auth_headers)
        scheme_id = next(t["id"] for t in res_all.json() if t["code"] == "DUP_TEST_SCHEME_2026")

    # 2. Submit initial valid application
    first_payload = {
        "student_id": test_student.id,
        "concession_type_id": scheme_id,
        "academic_year_id": test_academic_year.id,
        "requested_percentage": 25.0,
    }
    res_first = await client.post("/api/v1/fees/concessions/applications", json=first_payload, headers=auth_headers)
    assert res_first.status_code in (201, 400)

    # 3. Submit duplicate application for the same student and scheme
    res_dup = await client.post("/api/v1/fees/concessions/applications", json=first_payload, headers=auth_headers)
    assert res_dup.status_code == 400
    assert "duplicate application prohibited" in res_dup.json()["detail"].lower()

    # 4. Immutability check: scheme with historical applications cannot be deleted
    res_del_linked = await client.delete(f"/api/v1/fees/concessions/types/{scheme_id}", headers=auth_headers)
    assert res_del_linked.status_code == 400
    assert "historical student application" in res_del_linked.json()["detail"].lower()

