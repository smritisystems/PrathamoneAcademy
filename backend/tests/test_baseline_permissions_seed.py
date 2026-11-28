# /**
#  * @file        test_baseline_permissions_seed.py
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
#  * @created     2026-11-28
#  * @updated     2026-11-28
#  *
#  * @description Regression tests verifying baseline roles/permissions backfill across planning, concessions, payments, reports, CRM, eduboard, homework, and payroll.
#  */

import pytest
from sqlalchemy import delete, select

from app.core.permissions_seed import ensure_baseline_role_permissions
from app.models.user import Permission, Role


@pytest.mark.asyncio
async def test_ensure_baseline_role_permissions_backfills_all_modules_idempotently(db):
    original_rows = [
        (p.role_id, p.resource, p.action)
        for p in (await db.execute(select(Permission).where(Permission.role_id.is_not(None)))).scalars().all()
    ]
    try:
        # Clear existing role permissions to mimic fresh desktop bootstrap before repair
        await db.execute(delete(Permission).where(Permission.role_id.is_not(None)))
        await db.commit()

        await ensure_baseline_role_permissions(db)
        await db.commit()

        admin_role = (await db.execute(select(Role).where(Role.name == "admin"))).scalar_one()
        sys_role = (await db.execute(select(Role).where(Role.name == "sysadmin"))).scalar_one()

        admin_perms = {
            (p.resource, p.action)
            for p in (await db.execute(select(Permission).where(Permission.role_id == admin_role.id))).scalars().all()
        }
        sys_perms = {
            (p.resource, p.action)
            for p in (await db.execute(select(Permission).where(Permission.role_id == sys_role.id))).scalars().all()
        }

        assert ("planning", "view") in admin_perms
        assert ("planning", "create") in admin_perms
        assert ("planning", "publish") in admin_perms
        assert ("concessions", "nominate") in admin_perms
        assert ("concessions", "approve") in admin_perms
        assert ("reports", "manage_templates") in admin_perms
        assert ("leads", "read") in admin_perms
        assert ("students", "admission") in admin_perms
        assert ("homework", "manage_all") in admin_perms
        assert ("eduboard", "edit") in admin_perms
        assert ("teacher_payroll", "approve") in admin_perms
        assert ("payments", "view") in admin_perms

        # Segregation of Duties preserved: sysadmin does not receive payments:edit_posted automatically
        assert ("*", "*") in sys_perms
        assert ("payments", "edit_posted") not in sys_perms

        # Idempotency check
        before_count = len((await db.execute(select(Permission).where(Permission.role_id == admin_role.id))).scalars().all())
        await ensure_baseline_role_permissions(db)
        await db.commit()
        after_count = len((await db.execute(select(Permission).where(Permission.role_id == admin_role.id))).scalars().all())
        assert after_count == before_count
    finally:
        await db.execute(delete(Permission).where(Permission.role_id.is_not(None)))
        for role_id, resource, action in original_rows:
            db.add(Permission(role_id=role_id, resource=resource, action=action))
        await db.commit()


@pytest.mark.asyncio
async def test_admin_can_access_planning_reports_concessions_and_auth_me(
    client, db, auth_headers, test_institution
):
    original_rows = [
        (p.role_id, p.resource, p.action)
        for p in (await db.execute(select(Permission).where(Permission.role_id.is_not(None)))).scalars().all()
    ]
    try:
        await ensure_baseline_role_permissions(db)
        await db.commit()

        me_res = await client.get("/api/v1/auth/me", headers=auth_headers)
        assert me_res.status_code == 200
        me = me_res.json()
        assert "planning:view" in me["permissions"]
        assert "reports:view" in me["permissions"]

        inst_id = test_institution.id
        for url in (
            f"/api/v1/planning/activities?start=2026-11-01&end=2026-12-12&institution_id={inst_id}",
            f"/api/v1/planning/tasks/summary?institution_id={inst_id}",
            f"/api/v1/reports/books/templates?institution_id={inst_id}",
            "/api/v1/payments/my-permissions",
            "/api/v1/fees/concessions/applications",
        ):
            resp = await client.get(url, headers=auth_headers)
            assert resp.status_code == 200, f"Unexpected status {resp.status_code} on {url}: {resp.text}"
    finally:
        await db.execute(delete(Permission).where(Permission.role_id.is_not(None)))
        for role_id, resource, action in original_rows:
            db.add(Permission(role_id=role_id, resource=resource, action=action))
        await db.commit()
