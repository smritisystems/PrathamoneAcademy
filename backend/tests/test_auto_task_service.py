# /**
#  * @file        test_auto_task_service.py
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
#  * @created     2026-11-21
#  * @updated     2026-11-21
#  *
#  * @description Forensic test suite for Universal Task Management Engine, automated task generation, idempotency, and resolution.
#  */

from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.fee import FeeInvoice, StudentFeeAssignment
from app.models.planning import Activity, ActivityReference
from app.services.auto_task_service import (
    create_automated_task,
    get_task_metrics_summary,
    resolve_automated_tasks,
    sync_overdue_fee_tasks,
)


@pytest.mark.asyncio
async def test_create_automated_task_and_references(db: AsyncSession, test_institution, admin_user):
    """Verifies creation of an automated task with polymorphic reference."""
    inst_id = test_institution.id
    now = datetime.now(timezone.utc)
    due = now + timedelta(days=2)

    activity, is_new = await create_automated_task(
        db=db,
        institution_id=inst_id,
        title="Follow up on CRM Inquiry #101",
        description="Prospective student inquiry awaiting batch confirmation.",
        due_at=due,
        source_type="lead",
        source_record_id=101,
        priority="high",
        assignee_user_ids=[admin_user.id],
        created_by_id=admin_user.id,
    )
    await db.commit()

    assert is_new is True
    assert activity.id is not None
    assert activity.institution_id == inst_id
    assert activity.title == "Follow up on CRM Inquiry #101"
    assert activity.priority == "high"
    assert activity.status == "todo"

    # Verify reference was created
    ref_stmt = select(ActivityReference).where(ActivityReference.activity_id == activity.id)
    ref = (await db.execute(ref_stmt)).scalar_one()
    assert ref.source_type == "lead"
    assert ref.source_record_id == 101


@pytest.mark.asyncio
async def test_create_automated_task_idempotency_anti_spam(db: AsyncSession, test_institution, admin_user):
    """Verifies Rule 001 SSOT & Idempotency: duplicate task creation calls return existing record."""
    inst_id = test_institution.id
    due = datetime.now(timezone.utc) + timedelta(days=3)

    act1, is_new1 = await create_automated_task(
        db=db,
        institution_id=inst_id,
        title="Call Parent for Lead #202",
        description="First attempt scheduled.",
        due_at=due,
        source_type="lead",
        source_record_id=202,
        priority="normal",
        created_by_id=admin_user.id,
    )
    await db.commit()
    assert is_new1 is True

    # Call again with same source entity
    earlier_due = datetime.now(timezone.utc) + timedelta(days=1)
    act2, is_new2 = await create_automated_task(
        db=db,
        institution_id=inst_id,
        title="Call Parent for Lead #202 (Updated)",
        description="Second attempt scheduled.",
        due_at=earlier_due,
        source_type="lead",
        source_record_id=202,
        priority="urgent",
        created_by_id=admin_user.id,
    )
    await db.commit()

    # Must be the exact same activity record, not duplicated
    assert is_new2 is False
    assert act2.id == act1.id
    assert act2.priority == "urgent"


@pytest.mark.asyncio
async def test_resolve_automated_tasks_eliminates_ghost_tasks(db: AsyncSession, test_institution, admin_user):
    """Verifies auto-resolution of active tasks when source entity completes/closes."""
    inst_id = test_institution.id

    act, is_new = await create_automated_task(
        db=db,
        institution_id=inst_id,
        title="Fee Follow-up Inv #909",
        source_type="fee_invoice",
        source_record_id=909,
        priority="high",
        created_by_id=admin_user.id,
    )
    await db.commit()
    assert is_new is True
    assert act.status == "todo"

    # Trigger resolution
    resolved_count = await resolve_automated_tasks(
        db=db,
        institution_id=inst_id,
        source_type="fee_invoice",
        source_record_id=909,
        resolution_status="completed",
        actor_id=admin_user.id,
    )
    await db.commit()

    assert resolved_count == 1
    # Refresh activity
    await db.refresh(act)
    assert act.status == "completed"


@pytest.mark.asyncio
async def test_get_task_metrics_summary(db: AsyncSession, test_institution, admin_user):
    """Verifies aggregated task metrics calculation."""
    inst_id = test_institution.id

    # Create 1 todo and 1 urgent
    await create_automated_task(
        db=db,
        institution_id=inst_id,
        title="Metric Test Task 1",
        source_type="student",
        source_record_id=501,
        priority="normal",
        created_by_id=admin_user.id,
    )
    await create_automated_task(
        db=db,
        institution_id=inst_id,
        title="Metric Test Task 2",
        source_type="student",
        source_record_id=502,
        priority="urgent",
        created_by_id=admin_user.id,
    )
    await db.commit()

    metrics = await get_task_metrics_summary(db, inst_id)
    assert metrics["total_tasks"] >= 2
    assert metrics["todo"] >= 2
    assert metrics["urgent"] >= 1


@pytest.mark.asyncio
async def test_api_planning_tasks_summary_endpoint(client: AsyncClient, auth_headers, test_institution):
    """Tests GET /api/v1/planning/tasks/summary."""
    res = await client.get("/api/v1/planning/tasks/summary", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert "total_tasks" in data
    assert "todo" in data
    assert "completed" in data
    assert "urgent" in data
    assert "overdue" in data


@pytest.mark.asyncio
async def test_api_planning_tasks_sync_overdue_endpoint(client: AsyncClient, auth_headers, test_institution):
    """Tests POST /api/v1/planning/tasks/sync-fee-overdue."""
    res = await client.post("/api/v1/planning/tasks/sync-fee-overdue", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert "overdue_invoices_scanned" in data
    assert "tasks_created" in data
    assert "tasks_already_active" in data
