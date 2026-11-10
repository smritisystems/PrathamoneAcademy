# /**
#  * @file        test_report_intelligence.py
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
#  * @updated     2026-11-11
#  *
#  * @description Pytest test suite for Universal Report Calculation & Intelligence Engine,
#  */

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.report_intelligence_service import SafeMath, ReportIntelligenceService


def test_safe_math_primitives():
    """Verify SafeMath handles normal operations and zero-denominators without exceptions."""
    # 1. Safe Divide
    assert SafeMath.divide(50, 100, multiplier=100.0) == 50.0
    assert SafeMath.divide(0, 100, multiplier=100.0) == 0.0
    assert SafeMath.divide(100, 0, multiplier=100.0) == 0.0  # Zero denominator protection
    assert SafeMath.divide(None, 100, multiplier=100.0) == 0.0
    assert SafeMath.divide(100, None, multiplier=100.0) == 0.0
    assert SafeMath.divide(1, 3, multiplier=100.0, precision=2) == 33.33

    # 2. Variance
    assert SafeMath.variance(82.5, 75.0) == 7.5
    assert SafeMath.variance(60.0, 75.0) == -15.0

    # 3. Growth Rate
    assert SafeMath.growth_rate(120, 100) == 20.0
    assert SafeMath.growth_rate(80, 100) == -20.0
    assert SafeMath.growth_rate(100, 0) == 0.0  # Zero previous baseline


def test_calculation_registry_definitions():
    """Verify canonical calculation definitions catalog contains required formulas and rules."""
    defs = ReportIntelligenceService.get_all_calculation_definitions()
    assert len(defs) >= 7

    calc_ids = [d["id"] for d in defs]
    assert "calc_attendance_rate" in calc_ids
    assert "calc_homework_completion_rate" in calc_ids
    assert "calc_fee_realization_rate" in calc_ids
    assert "calc_exam_pass_rate" in calc_ids
    assert "calc_batch_occupancy_rate" in calc_ids
    assert "calc_teaching_delivery_rate" in calc_ids
    assert "calc_student_attrition_rate" in calc_ids

    # Verify structural integrity of each definition
    for d in defs:
        assert "formula" in d
        assert "numerator_label" in d
        assert "denominator_label" in d
        assert "inclusion_rules" in d and len(d["inclusion_rules"]) > 0
        assert "exclusion_rules" in d
        assert "explanation" in d
        assert "target" in d


@pytest.mark.asyncio
async def test_compute_attendance_intelligence(db: AsyncSession):
    """Verify attendance intelligence computes mathematical explanations and insights."""
    res = await ReportIntelligenceService.compute_intelligence(
        db=db,
        institution_id=1,
        report_id="student-attendance",
    )

    assert res["report_id"] == "student-attendance"
    assert "kpis" in res
    assert len(res["kpis"]) >= 2
    assert "insights" in res
    assert "comparisons" in res

    # Verify KPI explanation structure
    attendance_kpi = next((k for k in res["kpis"] if k["id"] == "attendance_rate"), None)
    assert attendance_kpi is not None
    assert "explanation" in attendance_kpi
    assert "formula" in attendance_kpi["explanation"]
    assert "numerator" in attendance_kpi["explanation"]
    assert "denominator" in attendance_kpi["explanation"]
    assert "plain_text" in attendance_kpi["explanation"]


@pytest.mark.asyncio
async def test_compute_fees_and_homework_intelligence(db: AsyncSession):
    """Verify fees and homework intelligence calculations."""
    # 1. Fee collection intelligence
    fee_res = await ReportIntelligenceService.compute_intelligence(
        db=db,
        institution_id=1,
        report_id="collection",
    )
    assert fee_res["report_id"] == "collection"
    realization_kpi = next((k for k in fee_res["kpis"] if k["id"] == "fee_realization_rate"), None)
    assert realization_kpi is not None
    assert realization_kpi["unit"] == "%"

    # 2. Homework register intelligence
    hw_res = await ReportIntelligenceService.compute_intelligence(
        db=db,
        institution_id=1,
        report_id="homework-register",
    )
    assert hw_res["report_id"] == "homework-register"
    hw_kpi = next((k for k in hw_res["kpis"] if k["id"] == "hw_completion_rate"), None)
    assert hw_kpi is not None


@pytest.mark.asyncio
async def test_intelligence_api_endpoints(client: AsyncClient, auth_headers: dict):
    """Verify REST API endpoints for calculation registry, metrics, and thresholds."""
    # 1. Definitions endpoint
    r_def = await client.get("/api/v1/reports/intelligence/definitions", headers=auth_headers)
    assert r_def.status_code == 200
    data_def = r_def.json()
    assert data_def["total"] >= 7
    assert len(data_def["items"]) >= 7

    # 2. Metrics endpoint
    r_metrics = await client.get("/api/v1/reports/intelligence/metrics/student-attendance", headers=auth_headers)
    assert r_metrics.status_code == 200
    data_metrics = r_metrics.json()
    assert data_metrics["report_id"] == "student-attendance"
    assert len(data_metrics["kpis"]) >= 2
    assert len(data_metrics["insights"]) >= 1

    # 3. Thresholds GET & PUT endpoint
    r_thresh = await client.get("/api/v1/reports/intelligence/thresholds", headers=auth_headers)
    assert r_thresh.status_code == 200
    thresh_data = r_thresh.json()
    assert "thresholds" in thresh_data
    assert thresh_data["thresholds"]["attendance_target"] == 75.0

    # Update threshold as admin
    r_update = await client.put(
        "/api/v1/reports/intelligence/thresholds",
        json={"attendance_target": 80.0, "fee_collection_target": 90.0},
        headers=auth_headers,
    )
    assert r_update.status_code == 200
    updated_data = r_update.json()
    assert updated_data["success"] is True
    assert updated_data["thresholds"]["attendance_target"] == 80.0
    assert updated_data["thresholds"]["fee_collection_target"] == 90.0

