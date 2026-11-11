# /**
#  * @file        test_help_and_about.py
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
#  * @created     2026-11-11
#  * @updated     2026-11-12
#  *
#  * @description Automated backend tests for Help & About Centre: seeding completeness, exclusion enforcement, search, contextual routing, support ticketing, RBAC, and CMS governance.
#  */

import json
import random
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import get_password_hash
from app.models.user import Role, User
from app.services.help_seed_data import validate_customer_safe_content


pytestmark = pytest.mark.asyncio


async def _create_role_user(
    client: AsyncClient,
    db: AsyncSession,
    role_name: str,
    institution_id: int,
):
    suffix = random.randint(100000, 999999)
    role_res = await db.execute(select(Role).where(Role.name == role_name))
    role_obj = role_res.scalar_one_or_none()
    username = f"{role_name}_{suffix}"
    user = User(
        username=username,
        email=f"{username}@test.com",
        hashed_password=get_password_hash("testpassword"),
        first_name="Test",
        last_name=role_name.title(),
        role=role_name,
        role_id=role_obj.id if role_obj else None,
        institution_id=institution_id,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    res = await client.post(
        "/api/v1/auth/login",
        data={"username": username, "password": "testpassword"},
    )
    assert res.status_code == 200
    token = res.json()["access_token"]
    return user, {"Authorization": f"Bearer {token}"}


class TestHelpAndAboutCentre:

    async def test_seeded_catalog_counts_and_structure(self, client: AsyncClient, auth_headers: dict):
        cat_res = await client.get("/api/v1/help/categories", headers=auth_headers)
        assert cat_res.status_code == 200
        cats = cat_res.json()["items"]
        assert {c["section"] for c in cats} == {"getting_started", "module_guide", "tutorial", "faq", "legal"}

        art_res = await client.get("/api/v1/help/articles", headers=auth_headers)
        assert art_res.status_code == 200
        items = art_res.json()["items"]

        by_section = {}
        for item in items:
            by_section.setdefault(item["section"], []).append(item)

        assert len(by_section.get("getting_started", [])) == 9
        assert len(by_section.get("module_guide", [])) == 14
        assert len(by_section.get("tutorial", [])) == 13
        assert len(by_section.get("faq", [])) == 12
        assert len(by_section.get("legal", [])) == 6

        # Every legal baseline document must remain pending approval until management sign-off
        for legal_item in by_section["legal"]:
            assert legal_item["approval_status"] == "pending_approval"

        # Every module guide must contain all 8 required documentation subsections
        required_headings = [
            "Module Introduction",
            "Purpose and Functionality",
            "Available Operations",
            "Step-by-Step Instructions",
            "Required Permissions",
            "Related Workflows",
            "Common Mistakes",
            "Troubleshooting",
        ]
        for guide in by_section["module_guide"]:
            detail = await client.get(f"/api/v1/help/articles/{guide['slug']}", headers=auth_headers)
            assert detail.status_code == 200
            md = detail.json()["content_markdown"]
            for heading in required_headings:
                assert heading in md, f"Missing heading '{heading}' in {guide['slug']}"

    async def test_zero_forbidden_github_or_installation_content(self, client: AsyncClient, auth_headers: dict):
        art_res = await client.get("/api/v1/help/articles", headers=auth_headers)
        assert art_res.status_code == 200
        for item in art_res.json()["items"]:
            detail = await client.get(f"/api/v1/help/articles/{item['slug']}", headers=auth_headers)
            assert detail.status_code == 200
            body = detail.json()
            combined = f"{body['title']}\n{body.get('summary', '')}\n{body['content_markdown']}"
            assert validate_customer_safe_content(combined) == [], f"Forbidden pattern in {item['slug']}"
            assert "c31cc0b" not in combined.lower()

        prod_res = await client.get("/api/v1/help/product-info", headers=auth_headers)
        assert prod_res.status_code == 200
        prod_blob = json.dumps(prod_res.json())
        assert validate_customer_safe_content(prod_blob) == []
        assert "github" not in prod_blob.lower()

        sys_res = await client.get("/api/v1/help/system-info", headers=auth_headers)
        assert sys_res.status_code == 200
        sys_blob = json.dumps(sys_res.json())
        assert validate_customer_safe_content(sys_blob) == []
        assert "git_commit" not in sys_blob
        assert "c31cc0b" not in sys_blob.lower()

    async def test_unified_search_and_contextual_help(self, client: AsyncClient, auth_headers: dict):
        # Search across articles & static About destinations
        s1 = await client.get("/api/v1/help/search", params={"q": "concession"}, headers=auth_headers)
        assert s1.status_code == 200
        slugs_1 = [r["slug"] for r in s1.json()["results"]]
        assert "guide-concessions" in slugs_1

        s2 = await client.get("/api/v1/help/search", params={"q": "SMRITI"}, headers=auth_headers)
        assert s2.status_code == 200
        assert any(r["slug"] == "about-company" for r in s2.json()["results"])

        # Contextual route resolution must point directly to module guides
        ctx_cases = [
            ("/fees/concessions", "guide-concessions"),
            ("/fees", "guide-fees"),
            ("/examinations/report-cards", "guide-results"),
            ("/academic/timetable", "guide-timetable"),
            ("/students", "guide-students"),
            ("/attendance", "guide-attendance"),
        ]
        for route_path, expected_slug in ctx_cases:
            c_res = await client.get("/api/v1/help/contextual", params={"route": route_path}, headers=auth_headers)
            assert c_res.status_code == 200
            data = c_res.json()
            assert data["article"]["slug"] == expected_slug
            assert data["help_route"] == f"/help/article/{expected_slug}"

    async def test_product_company_and_dynamic_version_accuracy(
        self, client: AsyncClient, auth_headers: dict, test_institution
    ):
        res = await client.get("/api/v1/help/product-info", headers=auth_headers)
        assert res.status_code == 200
        data = res.json()

        assert data["about_product"]["product_name"] == settings.PRODUCT_NAME
        assert data["about_product"]["product_category"] == "Education Management Operating System"
        assert len(data["about_product"]["available_modules"]) == 14

        company = data["about_company"]
        assert company["smriti_systems"]["company_name"] == "SMRITI Systems"
        assert company["smriti_systems"]["verification_status"] == "pending_management_verification"
        assert company["aitdl"]["official_website"] == "https://aitdl.com"
        assert "support@prathamone.com" == company["aitdl"]["support_email"]
        assert "identity_separation_notice" in company["subscribing_institution"]

        vinfo = data["version_info"]
        assert vinfo["product_name"] == settings.PRODUCT_NAME
        assert vinfo["product_edition"] == settings.EDITION
        assert vinfo["version_number"]  # dynamically sourced, non-empty
        assert vinfo["build_number"]

    async def test_system_info_strictly_admin_only_and_secret_safe(
        self, client: AsyncClient, db: AsyncSession, auth_headers: dict, test_institution
    ):
        _, teacher_headers = await _create_role_user(client, db, "teacher", test_institution.id)
        forbidden = await client.get("/api/v1/help/system-info", headers=teacher_headers)
        assert forbidden.status_code == 403

        admin_res = await client.get("/api/v1/help/system-info", headers=auth_headers)
        assert admin_res.status_code == 200
        body = admin_res.json()
        assert body["application_health"]["status"] in ("Healthy", "Degraded")
        assert body["database_connectivity"]["status"] == "Connected"
        assert len(body["module_availability"]) == 14
        assert "last_successful_backup" in body
        assert "deployment_information" in body

        serialized = json.dumps(body).lower()
        for sensitive in ("secret_key", "hashed_password", "postgresql+asyncpg", "postgres://", "password"):
            assert sensitive not in serialized

    async def test_support_ticket_lifecycle_and_user_isolation(
        self, client: AsyncClient, db: AsyncSession, auth_headers: dict, test_institution
    ):
        _, teacher_headers = await _create_role_user(client, db, "teacher", test_institution.id)
        _, staff_headers = await _create_role_user(client, db, "staff", test_institution.id)

        # Teacher submits a bug report
        create_res = await client.post(
            "/api/v1/help/support-requests",
            json={
                "request_type": "bug_report",
                "category": "attendance",
                "priority": "high",
                "subject": "Attendance register export filter issue",
                "description": "When filtering division B monthly attendance, export button stays busy.",
                "module_key": "attendance",
                "page_route": "/attendance",
                "error_reference_id": "ERR-20261111-DEMO",
            },
            headers=teacher_headers,
        )
        assert create_res.status_code == 201
        ticket = create_res.json()
        assert ticket["ticket_number"].startswith("SUP-")
        assert ticket["status"] == "open"
        ticket_id = ticket["id"]

        # Another non-admin user must NOT view teacher's support ticket
        other_list = await client.get("/api/v1/help/support-requests", headers=staff_headers)
        assert other_list.status_code == 200
        assert all(t["id"] != ticket_id for t in other_list.json()["items"])

        other_detail = await client.get(f"/api/v1/help/support-requests/{ticket_id}", headers=staff_headers)
        assert other_detail.status_code == 403

        # Teacher cannot resolve their own ticket via admin status endpoint
        teacher_patch = await client.patch(
            f"/api/v1/help/support-requests/{ticket_id}/status",
            json={"status": "resolved"},
            headers=teacher_headers,
        )
        assert teacher_patch.status_code == 403

        # Admin adds an internal note + public reply and resolves
        internal_comment = await client.post(
            f"/api/v1/help/support-requests/{ticket_id}/comments",
            json={"message": "Internal triage verified filter state.", "is_internal_note": True},
            headers=auth_headers,
        )
        assert internal_comment.status_code == 201

        public_comment = await client.post(
            f"/api/v1/help/support-requests/{ticket_id}/comments",
            json={"message": "Please retry after clearing division selection.", "is_internal_note": False},
            headers=auth_headers,
        )
        assert public_comment.status_code == 201

        resolve_res = await client.patch(
            f"/api/v1/help/support-requests/{ticket_id}/status",
            json={"status": "resolved", "resolution_notes": "Guided user on Academic Year & Division reset."},
            headers=auth_headers,
        )
        assert resolve_res.status_code == 200
        assert resolve_res.json()["status"] == "resolved"

        # Teacher sees only the public comment, NEVER the internal note
        teacher_view = await client.get(f"/api/v1/help/support-requests/{ticket_id}", headers=teacher_headers)
        assert teacher_view.status_code == 200
        messages = [c["message"] for c in teacher_view.json()["comments"]]
        assert "Please retry after clearing division selection." in messages
        assert "Internal triage verified filter state." not in messages

    async def test_help_governance_rbac_revisions_legal_approval_and_safety_blocker(
        self, client: AsyncClient, db: AsyncSession, auth_headers: dict, test_institution
    ):
        _, teacher_headers = await _create_role_user(client, db, "teacher", test_institution.id)

        # Non-admin blocked from creating Help articles or updating product metadata
        denied = await client.post(
            "/api/v1/help/articles",
            json={
                "slug": "unauth-test-article",
                "section": "faq",
                "title": "Unauthorized Article",
                "content_markdown": "## Test\nShould be blocked by RBAC.",
            },
            headers=teacher_headers,
        )
        assert denied.status_code == 403

        # Safety guardrail blocks GitHub or installation content even for admin
        unsafe = await client.post(
            "/api/v1/help/articles",
            json={
                "slug": "unsafe-article-blocked",
                "category_slug": "faq-troubleshooting",
                "section": "faq",
                "title": "Unsafe Setup Article",
                "content_markdown": "Run docker compose up and visit https://github.com/org/repo",
            },
            headers=auth_headers,
        )
        assert unsafe.status_code == 400

        # Admin creates valid custom FAQ article
        slug = f"custom-faq-{random.randint(1000, 9999)}"
        created = await client.post(
            "/api/v1/help/articles",
            json={
                "slug": slug,
                "category_slug": "faq-troubleshooting",
                "section": "faq",
                "title": "Exam Hall Seating FAQ",
                "summary": "Guidance on room capacity verification before scheduled exams.",
                "content_markdown": "# Exam Hall Seating\nEnsure division room capacity matches total active learners.",
                "tags": ["faq", "seating"],
                "doc_version": "1.0",
                "status": "published",
            },
            headers=auth_headers,
        )
        assert created.status_code == 201
        article_id = created.json()["id"]

        # Admin updates article to v1.1 and verifies revision log
        updated = await client.put(
            f"/api/v1/help/articles/{article_id}",
            json={
                "doc_version": "1.1",
                "content_markdown": "# Exam Hall Seating\nConfirm room capacity and attendance roster prior to exam.",
                "change_note": "Clarified roster verification step.",
            },
            headers=auth_headers,
        )
        assert updated.status_code == 200
        assert updated.json()["doc_version"] == "1.1"

        revs = await client.get(f"/api/v1/help/articles/{article_id}/revisions", headers=auth_headers)
        assert revs.status_code == 200
        versions = [r["doc_version"] for r in revs.json()["items"]]
        assert "1.0" in versions and "1.1" in versions

        # Publishing legal doc without approval must fail cleanly
        legal_detail = await client.get("/api/v1/help/articles/terms-and-conditions", headers=auth_headers)
        legal_id = legal_detail.json()["id"]
        unapproved_pub = await client.patch(
            f"/api/v1/help/articles/{legal_id}/publish",
            json={"publish": True},
            headers=auth_headers,
        )
        assert unapproved_pub.status_code == 400
