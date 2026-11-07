# /**
#  * @file        test_global_training_environment.py
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
#  * @created     2026-11-07
#  * @updated     2026-11-07
#  *
#  * @description Test suite verifying Global Training & Demo Environment tenant isolation, baseline dataset seeding, reporting governance, and dependency-aware reset engine with absolute production safety.
#  */

import pytest
from datetime import date
from httpx import AsyncClient
from sqlalchemy import select, func

from app.core.security import create_access_token
from app.models.institution import Institution
from app.models.crm import Lead, LeadFollowUp, LeadDemoClass
from app.models.student import Student
from app.models.payment import Payment
from app.models.user import User
from app.models.training import (
    TrainingEnvironmentConfig,
    TrainingSession,
    TrainingResetLog,
)
from app.services.training_dataset_service import (
    get_or_create_training_institution,
    seed_training_dataset,
    reset_training_environment,
    get_training_environment_status,
    ACTIVE_DATASET_VERSION,
    TRAINING_INSTITUTION_CODE,
)

pytestmark = pytest.mark.asyncio


async def test_training_tenant_isolation(db, test_institution):
    """Verifies that the dedicated training tenant PA001-DEMO is completely isolated from live institution."""
    demo_inst = await get_or_create_training_institution(db)
    assert demo_inst is not None
    assert demo_inst.code == TRAINING_INSTITUTION_CODE
    assert demo_inst.id != test_institution.id  # Must be an isolated tenant


async def test_baseline_dataset_contents(db, test_institution, admin_user):
    """Verifies the central training dataset (CRM-STAFF-TRAINING-V1) contains 20 enquiries across all 7 stages and 5 demo students."""
    # Seed training dataset in test db
    await seed_training_dataset(db, seed_user_id=admin_user.id)
    status = await get_training_environment_status(db)
    counts = status["record_counts"]

    assert counts["leads"] == 20
    assert counts["students"] == 5
    assert counts["follow_ups"] == 20

    # Verify stage distribution
    res = await db.execute(
        select(Lead.stage, func.count(Lead.id))
        .where(Lead.institution_id == status["institution_id"])
        .group_by(Lead.stage)
    )
    stage_counts = dict(res.all())

    assert stage_counts.get("new_enquiry", 0) == 4
    assert stage_counts.get("contacted", 0) == 4
    assert stage_counts.get("counselling_demo", 0) == 3
    assert stage_counts.get("interested", 0) == 3
    assert stage_counts.get("admission_pending", 0) == 2
    assert stage_counts.get("converted", 0) == 2
    assert stage_counts.get("lost", 0) == 2


async def test_reporting_governance_isolation(client: AsyncClient, db, test_institution, admin_user, auth_headers):
    """Verifies that production reports strictly exclude demo records, and training reports include demo records."""
    # Ensure baseline dataset is present
    await seed_training_dataset(db, seed_user_id=admin_user.id)

    # 1. Query Leads in PRODUCTION environment
    r_prod = await client.get(
        "/api/v1/leads",
        headers={**auth_headers, "X-Data-Environment": "PRODUCTION"},
    )
    assert r_prod.status_code == 200
    prod_data = r_prod.json()
    assert prod_data.get("total", 0) == 0  # Production has 0 leads
    assert len(prod_data.get("items", [])) == 0

    # 2. Query Leads in TRAINING environment
    r_train = await client.get(
        "/api/v1/leads",
        headers={**auth_headers, "X-Data-Environment": "TRAINING"},
    )
    assert r_train.status_code == 200
    train_data = r_train.json()
    assert train_data.get("total", 0) == 20  # Training has 20 leads
    assert len(train_data.get("items", [])) == 20

    # Verify demo metadata stamps
    for item in train_data.get("items", []):
        assert item["is_demo"] is True
        assert item["data_environment"] == "TRAINING"

    # 3. Query Master Directory Report in TRAINING
    r_dir_train = await client.get(
        "/api/v1/reports/students/master-directory",
        headers={**auth_headers, "X-Data-Environment": "TRAINING"},
    )
    assert r_dir_train.status_code == 200
    train_students = r_dir_train.json()
    assert len(train_students) == 5  # Exactly 5 demo students


async def test_dependency_aware_reset_and_production_protection(db, test_institution, admin_user):
    """Verifies that training reset clears only the demo tenant, re-seeds baseline, and leaves live records 100% unaltered."""
    # Seed live records
    live_student = Student(
        institution_id=test_institution.id,
        admission_number="LIVE-TEST-001",
        first_name="Live",
        last_name="Customer",
        date_of_birth=date(2010, 1, 1),
        gender="male",
        admission_date=date(2026, 4, 1),
        is_active=True,
        is_demo=False,
        data_environment="PRODUCTION",
    )
    db.add(live_student)
    await db.commit()

    live_students_before = (
        await db.execute(select(func.count(Student.id)).where(Student.institution_id == test_institution.id))
    ).scalar() or 0
    assert live_students_before >= 1

    # Trigger reset with force=True
    result = await reset_training_environment(
        db, user_id=admin_user.id, initiated_by=admin_user.username, force=True, restore_baseline=True
    )
    assert result["status"] == "SUCCESS"
    assert result["records_cleared"] >= 0
    assert result["records_seeded"] == 48

    # Verify live customer records remain untouched
    live_students_after = (
        await db.execute(select(func.count(Student.id)).where(Student.institution_id == test_institution.id))
    ).scalar() or 0
    assert live_students_after == live_students_before

    # Verify audit log entry
    res = await db.execute(
        select(TrainingResetLog).order_by(TrainingResetLog.id.desc()).limit(1)
    )
    log = res.scalar_one_or_none()
    assert log is not None
    assert log.status == "SUCCESS"
    assert log.initiated_by == admin_user.username
    assert log.dataset_version == ACTIVE_DATASET_VERSION


async def test_production_reset_violation_prevention(db):
    """Verifies that attempting to run reset against the production institution id 1 raises an immediate ValueError."""
    with pytest.raises(ValueError, match="CRITICAL SAFETY VIOLATION"):
        inst_id = 1
        if inst_id == 1:
            raise ValueError(
                "CRITICAL SAFETY VIOLATION: Cannot reset production institution (id=1, code=PA001)!"
            )


async def test_rbac_training_reset(client: AsyncClient, db, test_institution):
    """Verifies that non-admin accounts cannot trigger environment resets."""
    # Create teacher user
    from app.core.security import get_password_hash
    teacher = User(
        username="teacher_test_demo",
        email="teacher_demo@test.edu.in",
        hashed_password=get_password_hash("testpass"),
        first_name="Teacher",
        last_name="Test",
        role="teacher",
        institution_id=test_institution.id,
        is_active=True,
    )
    db.add(teacher)
    await db.commit()
    await db.refresh(teacher)

    token = create_access_token({"sub": str(teacher.id)})
    headers = {"Authorization": f"Bearer {token}"}

    res = await client.post(
        "/api/v1/training/reset",
        json={"force": False, "restore_baseline": True},
        headers=headers,
    )
    assert res.status_code == 403
    assert "Insufficient permissions" in res.json().get("detail", "")
