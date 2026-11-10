# /**
#  * @file        test_concession_scheme_settings.py
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
#  * @description Test suite for Concession Scheme Settings, lifecycle updates, deletion immutability, and duplicate application prevention.
#  */

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.security import create_access_token


@pytest.fixture
def admin_headers():
    token = create_access_token(data={"sub": "1", "role": "admin", "user_id": 1})
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_concession_scheme_crud_and_immutability(admin_headers):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. List schemes
        res = await client.get("/api/v1/fees/concessions/types", headers=admin_headers)
        assert res.status_code == 200
        types = res.json()
        assert len(types) >= 1
        assert "applications_count" in types[0]

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
        res_create = await client.post("/api/v1/fees/concessions/types", json=create_payload, headers=admin_headers)
        assert res_create.status_code in (201, 400)
        
        type_id = None
        if res_create.status_code == 201:
            type_id = res_create.json()["id"]
        else:
            # Code already exists, find its ID
            res_all = await client.get("/api/v1/fees/concessions/types", headers=admin_headers)
            match = next((t for t in res_all.json() if t["code"] == "SCIENCE_OLYMPIAD_2026"), None)
            if match:
                type_id = match["id"]

        assert type_id is not None

        # 3. Update scheme
        update_payload = {
            "name": "Science Olympiad Achiever Scholarship (Updated)",
            "default_value": 35.0,
            "is_stackable": False,
        }
        res_update = await client.put(f"/api/v1/fees/concessions/types/{type_id}", json=update_payload, headers=admin_headers)
        assert res_update.status_code == 200

        # 4. Toggle scheme status
        res_toggle = await client.patch(f"/api/v1/fees/concessions/types/{type_id}/toggle-status", headers=admin_headers)
        assert res_toggle.status_code == 200
        assert "is_active" in res_toggle.json()

        # 5. Immutability check: scheme with historical applications cannot be deleted
        res_del_linked = await client.delete("/api/v1/fees/concessions/types/1", headers=admin_headers)
        # Type 1 has linked applications
        assert res_del_linked.status_code == 400
        assert "historical student application" in res_del_linked.json()["detail"].lower()

        # 6. Delete newly created unlinked scheme
        res_del_unused = await client.delete(f"/api/v1/fees/concessions/types/{type_id}", headers=admin_headers)
        assert res_del_unused.status_code == 200


@pytest.mark.asyncio
async def test_duplicate_concession_application_rejection(admin_headers):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Aadya (student_id = 155) already holds Merit Scholarship (type_id = 1)
        duplicate_payload = {
            "student_id": 155,
            "concession_type_id": 1,
            "academic_year_id": 1,
            "requested_percentage": 25.0,
        }
        res = await client.post("/api/v1/fees/concessions/applications", json=duplicate_payload, headers=admin_headers)
        assert res.status_code == 400
        assert "duplicate application prohibited" in res.json()["detail"].lower()
