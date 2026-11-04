# /**
#  * @file        bootstrap_sysadmin.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      backend.scripts
#  *
#  * @author      Jawahar R. Mallah
#  * @organization AITDL (AI Technology & Development Lab)
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 AITDL
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-04
#  * @updated     2026-11-04
#  *
#  * @description Secure bootstrap and provisioning script for System Administrator (SysAdmin) superuser.
#  */

import os
import sys
import secrets
import string
import asyncio

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import text, select
from app.core.database import AsyncSessionLocal
from app.core.security import get_password_hash
from app.models.user import User, Role, Permission, AuditLog


def generate_secure_password(length: int = 18) -> str:
    """Generates a high-entropy, compliant password."""
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*()-_=+"
    while True:
        pwd = "".join(secrets.choice(alphabet) for _ in range(length))
        if (any(c.islower() for c in pwd)
                and any(c.isupper() for c in pwd)
                and any(c.isdigit() for c in pwd)
                and any(c in "!@#$%^&*()-_=+" for c in pwd)):
            return pwd


async def bootstrap_sysadmin():
    print("=" * 80)
    print("PRATHAMONE ACADEMY - SYSADMIN SUPERUSER BOOTSTRAPPER")
    print("=" * 80)

    username = os.environ.get("SYSADMIN_USERNAME", "sysadmin").strip().lower()
    email = os.environ.get("SYSADMIN_EMAIL", "sysadmin@prashantacademy.edu.in").strip().lower()
    provided_password = os.environ.get("SYSADMIN_PASSWORD", "").strip()

    generated = False
    if not provided_password:
        password = generate_secure_password(18)
        generated = True
    else:
        password = provided_password

    async with AsyncSessionLocal() as session:
        # 1. Update Audit Log Table Schema with Protected Columns
        print("\n[Step 1/5] Updating Audit Log schema with security audit isolation...")
        await session.execute(text("ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS is_system_audit BOOLEAN DEFAULT FALSE;"))
        await session.execute(text("ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS severity VARCHAR(20) DEFAULT 'info';"))
        await session.execute(text("ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS details TEXT;"))
        await session.execute(text("CREATE INDEX IF NOT EXISTS ix_audit_logs_is_system_audit ON audit_logs (is_system_audit);"))
        await session.execute(text("CREATE INDEX IF NOT EXISTS ix_audit_logs_created_at ON audit_logs (created_at DESC);"))
        await session.commit()
        print("  -> Audit log schema upgraded with isolated security audit attributes.")

        # 2. Provision or Synchronize SysAdmin Role
        print("\n[Step 2/5] Ensuring 'sysadmin' role exists in RBAC system...")
        role_res = await session.execute(text("SELECT id, name FROM roles WHERE name = 'sysadmin';"))
        sys_role = role_res.fetchone()

        if not sys_role:
            ins_res = await session.execute(text("""
                INSERT INTO roles (name, description, created_at)
                VALUES ('sysadmin', 'System Administrator - Universal Superuser & Security Officer', NOW())
                RETURNING id;
            """))
            sysadmin_role_id = ins_res.scalar_one()
            print(f"  -> Created role 'sysadmin' with ID: {sysadmin_role_id}")
        else:
            sysadmin_role_id = sys_role[0]
            print(f"  -> Existing role 'sysadmin' found with ID: {sysadmin_role_id}")
        await session.commit()

        # 3. Ensure Full Universal Permissions for sysadmin
        print("\n[Step 3/5] Assigning wildcard system permissions to 'sysadmin' role...")
        perm_res = await session.execute(text("""
            SELECT id FROM permissions WHERE role_id = :role_id AND resource = '*' AND action = '*';
        """), {"role_id": sysadmin_role_id})
        perm = perm_res.fetchone()
        if not perm:
            await session.execute(text("""
                INSERT INTO permissions (role_id, resource, action, created_at)
                VALUES (:role_id, '*', '*', NOW());
            """), {"role_id": sysadmin_role_id})
            print("  -> Wildcard (*:*) permissions assigned to sysadmin.")
        else:
            print("  -> Wildcard (*:*) permissions already active.")
        await session.commit()

        # 4. Provision or Update SysAdmin User Account
        print(f"\n[Step 4/5] Provisioning SysAdmin account (Username: {username}, Email: {email})...")
        user_res = await session.execute(text("SELECT id, username, email, role, is_active FROM users WHERE username = :u OR email = :e;"), {"u": username, "e": email})
        user = user_res.fetchone()

        hashed_pwd = get_password_hash(password)

        if not user:
            # Create fresh SysAdmin account
            await session.execute(text("""
                INSERT INTO users (
                    institution_id, username, email, hashed_password, first_name, last_name,
                    phone, role, role_id, invitation_status, scope_type, is_active, created_at, updated_at
                ) VALUES (
                    1, :username, :email, :pwd, 'System', 'Administrator',
                    '+91 99999 00000', 'sysadmin', :role_id, 'accepted', 'system', true, NOW(), NOW()
                );
            """), {
                "username": username,
                "email": email,
                "pwd": hashed_pwd,
                "role_id": sysadmin_role_id,
            })
            print("  -> SysAdmin account created successfully.")
            account_action = "created"
        else:
            # Update existing account to ensure it has sysadmin role, role_id, active status, and password
            user_id = user[0]
            await session.execute(text("""
                UPDATE users
                SET role = 'sysadmin',
                    role_id = :role_id,
                    hashed_password = :pwd,
                    is_active = true,
                    scope_type = 'system',
                    updated_at = NOW()
                WHERE id = :id;
            """), {
                "id": user_id,
                "role_id": sysadmin_role_id,
                "pwd": hashed_pwd,
            })
            print(f"  -> Existing account (ID: {user_id}) promoted and synced to 'sysadmin'.")
            account_action = "updated"

        # 5. Log Action into Security Audit Log
        print("\n[Step 5/5] Registering security audit entry...")
        admin_id_res = await session.execute(text("SELECT id FROM users WHERE username = :u;"), {"u": username})
        admin_id = admin_id_res.scalar_one()

        await session.execute(text("""
            INSERT INTO audit_logs (
                user_id, action, resource_type, resource_id, old_data, new_data,
                is_system_audit, severity, details, created_at
            ) VALUES (
                :uid, 'sysadmin_provision', 'user', :uid, NULL,
                'SysAdmin superuser account provisioned via bootstrap utility',
                true, 'critical', 'System Administrator account provisioned/synchronized with full superuser privileges', NOW()
            );
        """), {"uid": admin_id})
        await session.commit()

        print("\n" + "=" * 80)
        print("SYSADMIN SUPERUSER PROVISIONING COMPLETE")
        print("=" * 80)
        print(f"Username : {username}")
        print(f"Email    : {email}")
        print(f"Role     : sysadmin (Universal Superuser)")
        if generated:
            print("-" * 80)
            print(f"PASSWORD : {password}")
            print("NOTE     : Please save this password immediately in your secure credentials manager.")
            print("-" * 80)
        else:
            print("PASSWORD : [Set from environment variable SYSADMIN_PASSWORD]")
        print("=" * 80)


if __name__ == "__main__":
    asyncio.run(bootstrap_sysadmin())
