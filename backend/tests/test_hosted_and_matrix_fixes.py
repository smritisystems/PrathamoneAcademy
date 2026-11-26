# /**
#  * @file        test_hosted_and_matrix_fixes.py
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
#  * @created     2026-11-26
#  * @updated     2026-11-26
#  *
#  * @description Regression tests for APP_RUNTIME_TARGET, navigation 423 exemption, fee analytics Evaluation Mode access, and /fees/matrix batched SQL performance.
#  */

from datetime import date
from decimal import Decimal
import sys
import time
from types import SimpleNamespace

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.endpoints import license as license_endpoint
from app.core.config import detect_default_runtime_target
from app.models.academic_year import AcademicYear
from app.models.board import Board
from app.models.division import Division
from app.models.enrollment import StudentEnrollment
from app.models.fee import FeeCategory, FeeInvoice, FeeStructure, StudentFeeAssignment
from app.models.institution import Institution
from app.models.payment import Payment
from app.models.standard import Standard
from app.models.student import Student


def test_runtime_target_defaults_and_frozen_detection(monkeypatch):
    monkeypatch.delenv("APP_RUNTIME_TARGET", raising=False)
    monkeypatch.delenv("PRATHAM_DESKTOP_TOKEN", raising=False)
    monkeypatch.delattr(sys, "frozen", raising=False)
    assert detect_default_runtime_target() == "hosted"

    monkeypatch.setattr(sys, "frozen", True, raising=False)
    assert detect_default_runtime_target() == "desktop"

    monkeypatch.setenv("APP_RUNTIME_TARGET", "hosted")
    assert detect_default_runtime_target() == "hosted"


@pytest.mark.asyncio
async def test_hosted_mode_skips_hardware_machine_trial(
    client: AsyncClient,
    auth_headers: dict,
    monkeypatch,
):
    monkeypatch.setattr(license_endpoint.settings, "APP_RUNTIME_TARGET", "hosted")

    async def should_not_be_called(*_args, **_kwargs):
        raise AssertionError("_load_trial_context must not run in hosted runtime_target")

    monkeypatch.setattr(license_endpoint, "_load_trial_context", should_not_be_called)

    async def fake_get_setting(_db, _inst_id, _key):
        return None

    monkeypatch.setattr(license_endpoint, "_get_setting", fake_get_setting)
    ctx = await license_endpoint._load_license_context(SimpleNamespace(), 1, "PA01")
    assert ctx["mode"] == "unactivated"
    assert ctx["trial"] is None

    res = await client.post(
        "/api/v1/license/trial/start?institution_id=1",
        json={},
        headers={**auth_headers, "X-Data-Environment": "PRODUCTION"},
    )
    assert res.status_code == 409
    assert "Desktop installations" in res.json()["detail"]


@pytest.mark.asyncio
async def test_navigation_telemetry_and_fee_analytics_never_423_in_evaluation_mode(
    client: AsyncClient,
    auth_headers: dict,
    test_academic_year: AcademicYear,
    monkeypatch,
):
    monkeypatch.setattr(license_endpoint.settings, "APP_RUNTIME_TARGET", "hosted")
    monkeypatch.setattr(license_endpoint.settings, "LICENSE_ENFORCEMENT_STAGE", "enforced")

    async def fake_eval_context(_db, _institution_id, _company_binding):
        return {
            "mode": "evaluation",
            "rollout_stage": "enforced",
            "payload": {
                "evaluation_policy": {
                    "allow_dashboard": True,
                    "allow_read_only_records": True,
                    "allow_reports": True,
                    "allow_backups": True,
                    "allow_exports": True,
                    "locked_modules": ["billing", "inventory_transactions", "accounting", "payroll"],
                },
                "entitlements": {
                    "module.administration": False,
                    "module.billing": False,
                },
            },
            "installation_id": "HOSTED-TENANT-1",
            "hardware_fingerprint": "HOSTED-TENANT-1",
            "activation_identifier": None,
            "trial": {"trial_active": False, "trial_expired": True, "days_remaining": 0},
            "error": None,
        }

    monkeypatch.setattr(license_endpoint, "_load_license_context", fake_eval_context)

    from app.main import app as fastapi_app

    prev_override = fastapi_app.dependency_overrides.pop(license_endpoint.enforce_license_request, None)
    try:
        prod_headers = {**auth_headers, "X-Data-Environment": "PRODUCTION"}

        # 1. Telemetry / navigation endpoints must never return 423 Locked regardless of license/trial state
        nav_res = await client.post(
            "/api/v1/navigation/track-activity?institution_id=1",
            json={"module_key": "fees", "route_path": "/fees/matrix", "label": "Batch Fee Matrix"},
            headers=prod_headers,
        )
        assert nav_res.status_code != 423, nav_res.text
        assert nav_res.status_code == 200
        assert "no-store" in nav_res.headers.get("cache-control", "").lower()

        nav_cfg = await client.get("/api/v1/navigation/config?institution_id=1", headers=prod_headers)
        assert nav_cfg.status_code == 200

        # 2. Read-only fee analytics & matrices must remain accessible (HTTP 200) in Evaluation Mode
        for url in (
            f"/api/v1/fees/overview?academic_year_id={test_academic_year.id}&institution_id=1",
            f"/api/v1/fees/student-monthly-pivot?academic_year_id={test_academic_year.id}",
            f"/api/v1/fees/matrix?academic_year_id={test_academic_year.id}",
            f"/api/v1/fees/batch-monthly-matrix?academic_year_id={test_academic_year.id}",
        ):
            resp = await client.get(url, headers=prod_headers)
            assert resp.status_code == 200, f"{url} returned {resp.status_code}: {resp.text}"
            assert "no-store" in resp.headers.get("cache-control", "").lower()

        # 3. Transactional write mutations under billing must still enforce 423 Evaluation lock
        write_cat = await client.post(
            "/api/v1/fees/categories",
            json={"institution_id": 1, "name": "Locked Test Category"},
            headers=prod_headers,
        )
        assert write_cat.status_code == 423

        write_remark = await client.post(
            "/api/v1/fees/student-collection-remark",
            json={"student_id": 1, "remark": "Test follow-up", "priority": "normal"},
            headers=prod_headers,
        )
        assert write_remark.status_code == 423
    finally:
        if prev_override is not None:
            fastapi_app.dependency_overrides[license_endpoint.enforce_license_request] = prev_override


@pytest.mark.asyncio
async def test_fees_matrix_and_pivot_batched_sql_latency_and_pagination(
    client: AsyncClient,
    auth_headers: dict,
    db: AsyncSession,
    test_institution: Institution,
    test_academic_year: AcademicYear,
):
    board = Board(institution_id=test_institution.id, name="Matrix Board", code="MXB")
    standard = Standard(institution_id=test_institution.id, name="Grade 10 Matrix", level=10)
    db.add_all([board, standard])
    await db.flush()

    division = Division(
        standard_id=standard.id,
        board_id=board.id,
        name="Matrix Batch A",
        capacity=100,
    )
    cat = FeeCategory(institution_id=test_institution.id, name="Matrix Tuition", is_active=True)
    db.add_all([division, cat])
    await db.flush()

    fs = FeeStructure(
        institution_id=test_institution.id,
        academic_year_id=test_academic_year.id,
        standard_id=standard.id,
        category_id=cat.id,
        name="Matrix Annual Plan",
        amount=Decimal("24000.00"),
        frequency="annual",
        installments_count=2,
        is_active=True,
    )
    db.add(fs)
    await db.flush()

    # Seed 25 enrolled students with fee assignments, invoices, and payments
    for idx in range(25):
        stu = Student(
            institution_id=test_institution.id,
            admission_number=f"MX-{test_academic_year.id}-{idx:03d}",
            first_name=f"Student{idx:02d}",
            last_name="Matrix",
            date_of_birth=date(2011, 1, 15),
            gender="male" if idx % 2 == 0 else "female",
            admission_date=date(2026, 6, 1),
            is_active=True,
            is_demo=False,
            data_environment="PRODUCTION",
        )
        db.add(stu)
        await db.flush()

        enr = StudentEnrollment(
            student_id=stu.id,
            academic_year_id=test_academic_year.id,
            standard_id=standard.id,
            division_id=division.id,
            enrollment_date=date(2026, 6, 1),
            status="active",
            is_demo=False,
            data_environment="PRODUCTION",
        )
        assign = StudentFeeAssignment(
            student_id=stu.id,
            fee_structure_id=fs.id,
            academic_year_id=test_academic_year.id,
            custom_amount=Decimal("24000.00"),
        )
        db.add_all([enr, assign])
        await db.flush()

        inv = FeeInvoice(
            invoice_number=f"INV-MX-{test_academic_year.id}-{idx:03d}",
            student_id=stu.id,
            assignment_id=assign.id,
            academic_year_id=test_academic_year.id,
            total_amount=Decimal("24000.00"),
            discount_amount=Decimal("0.00"),
            net_amount=Decimal("24000.00"),
            paid_amount=Decimal("12000.00"),
            outstanding_amount=Decimal("12000.00"),
            status="partial",
            issue_date=date(2026, 6, 1),
            due_date=date(2026, 8, 1),
        )
        pay1 = Payment(
            student_id=stu.id,
            academic_year_id=test_academic_year.id,
            amount=Decimal("6000.00"),
            payment_date=date(2026, 6, 10),
            payment_method="UPI",
            status="completed",
            is_demo=False,
            data_environment="PRODUCTION",
        )
        pay2 = Payment(
            student_id=stu.id,
            academic_year_id=test_academic_year.id,
            amount=Decimal("6000.00"),
            payment_date=date(2026, 8, 10),
            payment_method="CASH",
            status="completed",
            is_demo=False,
            data_environment="PRODUCTION",
        )
        db.add_all([inv, pay1, pay2])

    await db.commit()

    prod_headers = {**auth_headers, "X-Data-Environment": "PRODUCTION"}

    # Warmup DB connection & query plans cleanly before timing steady-state matrix latency
    await client.get(f"/api/v1/fees/matrix?academic_year_id={test_academic_year.id}&division_id={division.id}&limit=1&offset=0", headers=prod_headers)
    t0 = time.perf_counter()
    matrix_res = await client.get(
        f"/api/v1/fees/matrix?academic_year_id={test_academic_year.id}&division_id={division.id}&limit=10&offset=5",
        headers=prod_headers,
    )
    matrix_ms = (time.perf_counter() - t0) * 1000.0
    assert matrix_res.status_code == 200, matrix_res.text
    matrix_json = matrix_res.json()
    assert len(matrix_json["students"]) == 10
    assert matrix_json["pagination"]["total"] >= 25
    assert matrix_json["students"][0]["package_fee"] == 24000.0
    assert matrix_json["students"][0]["total_paid"] == 12000.0
    assert matrix_ms < 500.0, f"/api/v1/fees/matrix exceeded 500ms budget ({matrix_ms:.1f}ms)"

    t1 = time.perf_counter()
    pivot_res = await client.get(
        f"/api/v1/fees/student-monthly-pivot?academic_year_id={test_academic_year.id}&division_id={division.id}&limit=10&offset=0",
        headers=prod_headers,
    )
    pivot_ms = (time.perf_counter() - t1) * 1000.0
    assert pivot_res.status_code == 200, pivot_res.text
    pivot_json = pivot_res.json()
    assert len(pivot_json["students"]) == 10
    assert pivot_json["pagination"]["total"] >= 25
    assert pivot_json["students"][0]["months"]["2026-06"]["amount"] == 6000.0
    assert pivot_ms < 500.0, f"/api/v1/fees/student-monthly-pivot exceeded 500ms budget ({pivot_ms:.1f}ms)"
