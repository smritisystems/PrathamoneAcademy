# /**
#  * @file        test_safe_delete_policy.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      backend.tests.test_safe_delete_policy
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
#  * @description Test suite verifying Global Safe Delete & Data Integrity Policy across all entities.
#  */

import pytest
from fastapi import HTTPException
from sqlalchemy import select
from app.models import (
    Standard, Division, User, AuditLog
)
from app.services.safe_delete_service import SafeDeleteService


@pytest.mark.asyncio
async def test_financial_records_permanent_delete_strictly_blocked(db):
    """
    POLICY RULE 6: Never permanently delete posted payments, receipts, invoices, refunds,
    or ledger entries. They must be permanently blocked with reversal guidance.
    """
    immutable_types = ["payment", "payment_receipt", "fee_invoice", "refund", "teacher_payroll"]

    for f_type in immutable_types:
        report = await SafeDeleteService.check_eligibility(db, f_type, 9999)
        assert report.is_eligible is False, f"{f_type} must not be eligible for permanent delete"
        assert report.block_category == "transaction_history"
        assert report.recommended_action == "reversal"
        assert "financial" in report.block_reason.lower()
        assert report.reversal_guidance is not None


@pytest.mark.asyncio
async def test_eligible_unreferenced_record_deletion(db, admin_user, test_institution):
    """
    POLICY RULE 2 & 4: Unreferenced records with ZERO dependencies may be permanently deleted.
    Action is audited and record is removed.
    """
    # Create an unreferenced Standard
    std = Standard(
        institution_id=test_institution.id,
        name="Test Class Standalone",
        level=91,
        is_active=True,
    )
    db.add(std)
    await db.commit()
    await db.refresh(std)

    # 1. Pre-flight check
    report = await SafeDeleteService.check_eligibility(db, "standard", std.id, admin_user)
    assert report.is_eligible is True
    assert report.block_category is None
    assert len(report.dependent_counts) == 0

    # 2. In-transaction execution
    result = await SafeDeleteService.execute_safe_delete(
        db, "standard", std.id, admin_user, reason="Clean up unused test standard"
    )
    assert result["success"] is True
    assert result["entity_id"] == std.id

    # 3. Verify record was removed
    stmt = select(Standard).where(Standard.id == std.id)
    assert (await db.execute(stmt)).scalar_one_or_none() is None

    # 4. Verify Audit Log was recorded
    audit_stmt = select(AuditLog).where(
        AuditLog.action == "permanent_delete_standard",
        AuditLog.resource_id == std.id
    )
    audit = (await db.execute(audit_stmt)).scalar_one_or_none()
    assert audit is not None
    assert audit.user_id == admin_user.id


@pytest.mark.asyncio
async def test_blocked_record_with_linked_records(db, admin_user, test_institution):
    """
    POLICY RULE 3 & 5: If any dependency exists, permanent delete MUST be blocked on backend,
    leave data unchanged, and report exact counts.
    """
    # Create Standard with a linked Division
    std = Standard(
        institution_id=test_institution.id,
        name="Standard With Batches",
        level=92,
        is_active=True,
    )
    db.add(std)
    await db.commit()
    await db.refresh(std)

    div = Division(
        standard_id=std.id,
        name="Batch Alpha",
        code="BA-01",
        is_active=True,
    )
    db.add(div)
    await db.commit()
    await db.refresh(div)

    # 1. Pre-flight check
    report = await SafeDeleteService.check_eligibility(db, "standard", std.id, admin_user)
    assert report.is_eligible is False
    assert report.block_category == "linked_records"
    assert "Batches / Divisions" in report.dependent_counts
    assert report.dependent_counts["Batches / Divisions"] == 1
    assert report.can_deactivate is True

    # 2. In-transaction permanent delete attempt MUST raise HTTPException 400
    with pytest.raises(HTTPException) as exc_info:
        await SafeDeleteService.execute_safe_delete(db, "standard", std.id, admin_user)

    assert exc_info.value.status_code == 400
    assert exc_info.value.detail["is_eligible"] is False
    assert "Batches / Divisions" in exc_info.value.detail["dependent_counts"]

    # 3. Verify Standard still exists unharmed
    stmt = select(Standard).where(Standard.id == std.id)
    persisted = (await db.execute(stmt)).scalar_one_or_none()
    assert persisted is not None


@pytest.mark.asyncio
async def test_safe_deactivate_and_archive_workflows(db, admin_user, test_institution):
    """
    POLICY RULE 7: Distinct 3-tier actions: Deactivate and Archive alternatives.
    """
    # 1. Test Safe Deactivate
    std = Standard(
        institution_id=test_institution.id,
        name="Class To Deactivate",
        level=93,
        is_active=True,
    )
    db.add(std)
    await db.commit()
    await db.refresh(std)

    deact_res = await SafeDeleteService.execute_safe_deactivate(
        db, "standard", std.id, admin_user, reason="Academic year concluded"
    )
    assert deact_res["success"] is True
    assert deact_res["is_active"] is False

    await db.refresh(std)
    assert std.is_active is False

    # 2. Test Safe Archive on Batch/Division
    div = Division(
        standard_id=std.id,
        name="Batch To Archive",
        status="active",
        is_active=True,
    )
    db.add(div)
    await db.commit()
    await db.refresh(div)

    arch_res = await SafeDeleteService.execute_safe_archive(
        db, "division", div.id, admin_user, reason="Batch graduated"
    )
    assert arch_res["success"] is True
    assert arch_res["status"] == "archived"

    await db.refresh(div)
    assert div.status == "archived"
    assert div.is_active is False


@pytest.mark.asyncio
async def test_self_account_delete_protection(db, admin_user):
    """
    POLICY RULE 2 & Security: An admin cannot delete their own active account.
    """
    report = await SafeDeleteService.check_eligibility(db, "user", admin_user.id, admin_user)
    assert report.is_eligible is False
    assert report.block_category == "system_protected"
    assert "cannot delete your own account" in report.block_reason.lower()


@pytest.mark.asyncio
async def test_governance_api_endpoints(client, auth_headers, test_institution):
    """
    POLICY RULE 4 & 5: REST API /api/v1/governance/safe-delete routes function correctly.
    """
    # 1. Check endpoint for immutable financial type
    resp = await client.get(
        "/api/v1/governance/safe-delete/check",
        params={"entity_type": "payment", "entity_id": 101},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["is_eligible"] is False
    assert data["block_category"] == "transaction_history"
    assert data["recommended_action"] == "reversal"

    # 2. Audit logs endpoint
    audit_resp = await client.get(
        "/api/v1/governance/safe-delete/audit-logs",
        headers=auth_headers,
    )
    assert audit_resp.status_code == 200
    assert isinstance(audit_resp.json(), list)
