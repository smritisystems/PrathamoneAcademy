# /**
#  * @file        test_report_book_publishing.py
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
#  * @created     2026-11-14
#  * @updated     2026-11-14
#  *
#  * @description Tests report-book validation, institution isolation, and auditable generation endpoints.
#  */

from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import HTTPException
from sqlalchemy import select

from app.api.v1.endpoints.reports import (
    _report_book_institution_id,
    _require_report_book_permission,
    _validate_report_book_configuration,
)
from app.models.user import Role


def report_book_configuration(report_ids=None):
    return {
        "title": "Annual Academic Book",
        "pageSize": "A4",
        "marginMm": 15,
        "chapters": [
            {
                "id": "chapter-1",
                "title": "Academics",
                "kind": "reports",
                "reportIds": report_ids or ["student-master", "student-attendance"],
                "included": True,
                "orientation": "auto",
            }
        ],
    }


def test_report_book_configuration_accepts_multiple_distinct_reports():
    serialized = _validate_report_book_configuration(report_book_configuration())

    assert '"student-master","student-attendance"' in serialized


def test_report_book_configuration_rejects_duplicate_report_references():
    configuration = report_book_configuration(["student-master", "student-master"])

    with pytest.raises(HTTPException) as error:
        _validate_report_book_configuration(configuration)

    assert error.value.status_code == 422


def test_report_book_institution_scope_rejects_unassigned_tenant():
    user = SimpleNamespace(role="teacher", institution_id=None)

    with pytest.raises(HTTPException) as error:
        _report_book_institution_id(7, user)

    assert error.value.status_code == 403


@pytest.mark.asyncio
async def test_report_book_operations_require_their_specific_permission(db):
    role_id = (await db.execute(select(Role.id).where(Role.name == "teacher"))).scalar_one()
    user = SimpleNamespace(role="teacher", role_id=role_id, id=900001)

    with pytest.raises(HTTPException) as error:
        await _require_report_book_permission(db, user, "manage_templates")

    assert error.value.status_code == 403


@pytest.mark.asyncio
async def test_report_book_templates_and_generation_are_audited(client, auth_headers, test_institution):
    institution_id = test_institution.id
    configuration = report_book_configuration(["student-master"])
    template = await client.put(
        f"/api/v1/reports/books/templates?institution_id={institution_id}",
        headers=auth_headers,
        json={"name": "Annual Book", "configuration": configuration},
    )
    assert template.status_code == 200
    assert template.json()["configuration"] == configuration

    listed_templates = await client.get(
        f"/api/v1/reports/books/templates?institution_id={institution_id}",
        headers=auth_headers,
    )
    assert [item["name"] for item in listed_templates.json()] == ["Annual Book"]

    document_id = str(uuid4())
    generated = await client.post(
        f"/api/v1/reports/books/generations?institution_id={institution_id}",
        headers=auth_headers,
        json={
            "document_id": document_id,
            "title": configuration["title"],
            "report_ids": ["student-master"],
            "report_row_counts": {"student-master": 3},
            "page_size": "A4",
            "book_configuration": configuration,
        },
    )
    assert generated.status_code == 201
    assert generated.json()["document_id"] == document_id

    downloaded = await client.post(
        f"/api/v1/reports/books/events?institution_id={institution_id}",
        headers=auth_headers,
        json={"document_id": document_id, "action": "DOWNLOAD"},
    )
    assert downloaded.status_code == 201
    assert downloaded.json() == {"recorded": True}
