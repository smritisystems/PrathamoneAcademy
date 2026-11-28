# /**
#  * @file        permissions_seed.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      backend.app.core
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
#  * @description Single Source of Truth (SSOT) baseline roles and granular module permissions seeded during bootstrap and migrations.
#  */

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

STANDARD_ROLES: tuple[tuple[str, str], ...] = (
    ("superadmin", "Super Administrator"),
    ("sysadmin", "System Administrator"),
    ("admin", "Administrator"),
    ("principal", "Principal"),
    ("accountant", "Accountant"),
    ("teacher", "Teacher"),
    ("staff", "Staff Member"),
    ("coordinator", "Academic Coordinator"),
    ("counselor", "Admissions Counselor"),
    ("counsellor", "Admissions Counsellor"),
    ("receptionist", "Front Desk Receptionist"),
    ("student", "Student Account"),
)


def _expand_role_permissions() -> list[tuple[str, str, str]]:
    """Return canonical baseline (role_name, resource, action) tuples across all 8 permission modules."""
    entries: list[tuple[str, str, str]] = []

    # 1. System / Superuser wildcards (Segregation of Duties: never auto-grant 'sysadmin' 'payments:edit_posted')
    for role_name in ("superadmin", "sysadmin"):
        entries.append((role_name, "*", "*"))

    # 2. Fees, Payments Workflow & Refunds (019)
    for role_name in ("superadmin", "sysadmin", "admin"):
        for resource, action in (
            ("fees", "view"),
            ("payments", "view"),
            ("payments", "draft"),
            ("payments", "edit_submitted"),
            ("fee_workflow", "configure"),
            ("payments", "refund_process"),
            ("payments", "refund_approve"),
            ("payments", "view_audit"),
        ):
            entries.append((role_name, resource, action))
    for role_name in ("superadmin", "admin"):
        entries.append((role_name, "payments", "edit_posted"))
    for resource, action in (
        ("fees", "view"),
        ("payments", "view"),
        ("payments", "draft"),
        ("payments", "edit_submitted"),
        ("payments", "refund_process"),
        ("payments", "view_audit"),
    ):
        entries.append(("accountant", resource, action))

    # 3. Teacher Payroll, Sessions & Rates (020)
    for role_name in ("superadmin", "admin"):
        for resource, action in (
            ("teacher_payroll", "view"),
            ("teacher_payroll", "calculate"),
            ("teacher_payroll", "approve"),
            ("teacher_payroll", "finalize"),
            ("teacher_payroll", "pay"),
            ("teacher_payroll", "export"),
            ("teaching_sessions", "view"),
            ("teaching_sessions", "create"),
            ("teaching_sessions", "edit"),
            ("teaching_sessions", "approve"),
            ("teaching_sessions", "reject"),
            ("teaching_sessions", "substitute"),
            ("teacher_rates", "view"),
            ("teacher_rates", "edit"),
        ):
            entries.append((role_name, resource, action))
    for resource, action in (
        ("teacher_payroll", "view"),
        ("teacher_payroll", "approve"),
        ("teacher_payroll", "finalize"),
        ("teacher_payroll", "export"),
        ("teaching_sessions", "view"),
        ("teaching_sessions", "approve"),
        ("teaching_sessions", "reject"),
        ("teaching_sessions", "substitute"),
        ("teacher_rates", "view"),
    ):
        entries.append(("principal", resource, action))
    for resource, action in (
        ("teacher_payroll", "view"),
        ("teacher_payroll", "calculate"),
        ("teacher_payroll", "pay"),
        ("teacher_payroll", "export"),
        ("teaching_sessions", "view"),
        ("teacher_rates", "view"),
    ):
        entries.append(("accountant", resource, action))
    for resource, action in (
        ("teacher_payroll", "view_own"),
        ("teaching_sessions", "view_own"),
        ("teaching_sessions", "create_own"),
    ):
        entries.append(("teacher", resource, action))

    # 4. CRM Leads & Admission Conversion (029)
    crm_actions = (
        "read", "create", "update", "assign", "followup",
        "communicate", "manage_pipeline", "reports", "delete",
    )
    for role_name in ("superadmin", "admin", "principal"):
        for act in crm_actions:
            entries.append((role_name, "leads", act))
        entries.append((role_name, "students", "admission"))
    for role_name in ("staff", "counselor", "counsellor", "receptionist"):
        for act in (
            "read", "create", "update", "assign", "followup",
            "communicate", "manage_pipeline", "reports",
        ):
            entries.append((role_name, "leads", act))
    for act in ("read", "reports"):
        entries.append(("accountant", "leads", act))

    # 5. Concessions & Scholarships Governance (042)
    concession_all = (
        "view", "nominate", "verify", "approve", "apply",
        "reverse", "cancel", "reports", "sponsor_settle",
    )
    for role_name in ("superadmin", "admin"):
        for act in concession_all:
            entries.append((role_name, "concessions", act))
    for act in ("view", "nominate", "verify", "approve", "apply", "reports"):
        entries.append(("principal", "concessions", act))
    for act in ("view", "nominate", "verify", "apply", "reverse", "reports", "sponsor_settle"):
        entries.append(("accountant", "concessions", act))
    for role_name in ("teacher", "staff"):
        for act in ("view", "nominate"):
            entries.append((role_name, "concessions", act))

    # 6. Homework & Assignments (045)
    for role_name in ("superadmin", "admin", "principal"):
        for act in ("view", "create", "edit", "publish", "evaluate", "delete", "reports", "settings", "manage_all"):
            entries.append((role_name, "homework", act))
    for act in ("view", "create", "edit", "publish", "evaluate", "reports", "manage_all"):
        entries.append(("coordinator", "homework", act))
    for act in ("view", "create", "edit", "publish", "evaluate", "reports"):
        entries.append(("teacher", "homework", act))
    for act in ("view", "create", "edit", "reports"):
        entries.append(("staff", "homework", act))

    # 7. EduBoard Digital Classroom (046)
    eduboard_all = ("view", "create", "edit", "delete", "publish", "download", "manage_templates", "collaborate")
    for role_name in ("superadmin", "sysadmin", "admin", "principal"):
        for act in eduboard_all:
            entries.append((role_name, "eduboard", act))
    for role_name in ("coordinator", "teacher"):
        for act in ("view", "create", "edit", "publish", "download", "manage_templates", "collaborate"):
            entries.append((role_name, "eduboard", act))
    for role_name in ("staff", "student"):
        for act in ("view", "download"):
            entries.append((role_name, "eduboard", act))

    # 8. Reporting Centre & Saved Report Books (049)
    for role_name in (
        "superadmin", "super_admin", "sysadmin", "admin", "principal",
        "accountant", "teacher", "staff", "counselor", "counsellor", "receptionist",
    ):
        for act in ("view", "generate_books", "download", "print"):
            entries.append((role_name, "reports", act))
    for role_name in ("superadmin", "super_admin", "sysadmin", "admin", "principal"):
        entries.append((role_name, "reports", "manage_templates"))

    # 9. Tasks & Planning Center (051)
    planning_perms = {
        "view": (
            "superadmin", "super_admin", "sysadmin", "admin", "principal",
            "teacher", "staff", "coordinator", "accountant", "counselor",
            "counsellor", "receptionist",
        ),
        "view_all": ("superadmin", "super_admin", "sysadmin", "admin", "principal"),
        "create": (
            "superadmin", "super_admin", "sysadmin", "admin", "principal",
            "teacher", "staff", "coordinator", "receptionist",
        ),
        "edit": (
            "superadmin", "super_admin", "sysadmin", "admin", "principal",
            "teacher", "staff", "coordinator", "receptionist",
        ),
        "edit_any": ("superadmin", "super_admin", "sysadmin", "admin", "principal"),
        "complete": (
            "superadmin", "super_admin", "sysadmin", "admin", "principal",
            "teacher", "staff", "coordinator", "receptionist",
        ),
        "assign": ("superadmin", "super_admin", "sysadmin", "admin", "principal", "coordinator"),
        "publish": ("superadmin", "super_admin", "sysadmin", "admin", "principal"),
        "cancel": ("superadmin", "super_admin", "sysadmin", "admin", "principal"),
        "delete": ("superadmin", "super_admin", "sysadmin", "admin", "principal"),
        "view_audit": ("superadmin", "super_admin", "sysadmin", "admin", "principal"),
    }
    for act, rnames in planning_perms.items():
        for role_name in rnames:
            entries.append((role_name, "planning", act))

    return list(dict.fromkeys(entries))


BASELINE_ROLE_PERMISSIONS: tuple[tuple[str, str, str], ...] = tuple(_expand_role_permissions())


def ensure_baseline_role_permissions_sync(connection) -> None:
    """Idempotently ensure standard roles and baseline role permissions exist using a sync DBAPI/SQLAlchemy connection."""
    for rname, desc in STANDARD_ROLES:
        connection.execute(
            text(
                """
                INSERT INTO roles (name, description, created_at)
                SELECT CAST(:rname AS VARCHAR), CAST(:desc AS VARCHAR), NOW()
                WHERE NOT EXISTS (SELECT 1 FROM roles WHERE LOWER(name) = LOWER(CAST(:rname AS VARCHAR)));
                """
            ),
            {"rname": rname, "desc": desc},
        )

    for role_name, resource, action in BASELINE_ROLE_PERMISSIONS:
        connection.execute(
            text(
                """
                INSERT INTO permissions (role_id, resource, action, created_at)
                SELECT r.id, CAST(:res AS VARCHAR), CAST(:act AS VARCHAR), NOW()
                FROM roles r
                WHERE LOWER(r.name) = LOWER(CAST(:rname AS VARCHAR))
                AND NOT EXISTS (
                    SELECT 1 FROM permissions p
                    WHERE p.role_id = r.id
                      AND p.resource = CAST(:res AS VARCHAR)
                      AND p.action = CAST(:act AS VARCHAR)
                );
                """
            ),
            {"rname": role_name, "res": resource, "act": action},
        )


async def ensure_baseline_role_permissions(session: AsyncSession) -> None:
    """Idempotently ensure standard roles and baseline role permissions exist within an async SQLAlchemy session."""
    from app.models.user import Permission, Role

    role_rows = (await session.execute(select(Role))).scalars().all()
    role_by_name = {(r.name or "").strip().lower(): r for r in role_rows if r.name}

    for rname, desc in STANDARD_ROLES:
        if rname not in role_by_name:
            new_role = Role(name=rname, description=desc)
            session.add(new_role)
            await session.flush()
            role_by_name[rname] = new_role

    existing_rows = (
        await session.execute(select(Permission.role_id, Permission.resource, Permission.action).where(Permission.role_id.is_not(None)))
    ).all()
    existing_set = {(rid, res, act) for rid, res, act in existing_rows}

    for role_name, resource, action in BASELINE_ROLE_PERMISSIONS:
        role_obj = role_by_name.get(role_name)
        if not role_obj:
            continue
        key = (role_obj.id, resource, action)
        if key not in existing_set:
            session.add(Permission(role_id=role_obj.id, resource=resource, action=action))
            existing_set.add(key)

    await session.flush()
