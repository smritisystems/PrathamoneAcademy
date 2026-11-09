# /**
#  * @file        test_dashboard_analytics.py
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
#  * @created     2026-11-10
#  * @updated     2026-11-10
#  *
#  * @description Test suite verifying the comprehensive multi-tab dashboard analytics API, data deduplication, financial integrity, and cross-module metrics.
#  */

import pytest


class TestDashboardAnalytics:
    @pytest.mark.asyncio
    async def test_dashboard_analytics_tabs_payload(
        self, client, auth_headers, test_institution, test_academic_year
    ):
        """
        Verify:
        1. /api/v1/dashboard/analytics returns HTTP 200.
        2. Contains all 7 analytics tab sections:
           - fee_collection
           - outstanding_analysis
           - student_analysis
           - admissions_crm
           - academic_analysis
           - transactions_reconciliation
           - operations
        3. Financial reconciliation holds without Cartesian transfer duplication.
        4. Unique students, attendance, examinations, and CRM metrics are populated with live database data.
        """
        res = await client.get(
            f"/api/v1/dashboard/analytics?academic_year_id={test_academic_year.id}&institution_id={test_institution.id}",
            headers=auth_headers,
        )
        assert res.status_code == 200
        data = res.json()

        # Check all tabs are present
        assert "fee_collection" in data
        assert "outstanding_analysis" in data
        assert "student_analysis" in data
        assert "admissions_crm" in data
        assert "academic_analysis" in data
        assert "transactions_reconciliation" in data
        assert "operations" in data

        # Fee collection checks
        fee_col = data["fee_collection"]
        assert "monthly_trends" in fee_col
        assert "payment_methods" in fee_col
        assert "fee_heads" in fee_col
        assert "daily_pulse" in fee_col
        assert fee_col["total_collected"] >= 0

        # Outstanding analysis checks
        out_ana = data["outstanding_analysis"]
        assert "status_wise" in out_ana
        assert "class_wise" in out_ana
        assert "batch_wise" in out_ana
        assert "top_defaulters" in out_ana
        sw = out_ana["status_wise"]
        assert "active" in sw
        assert "left" in sw
        assert "transferred" in sw
        assert "total_historical" in sw

        # Verify mathematical consistency
        cat_sum = (
            sw["active"]["outstanding"]
            + sw["inactive"]["outstanding"]
            + sw["left"]["outstanding"]
            + sw["transferred"]["outstanding"]
            + sw["cancelled"]["outstanding"]
        )
        assert round(cat_sum, 2) == round(sw["total_historical"]["outstanding"], 2)

        # Student analysis checks
        std_ana = data["student_analysis"]
        assert "total_unique_students" in std_ana
        assert "status_distribution" in std_ana
        assert "standard_distribution" in std_ana
        assert "batch_utilization" in std_ana
        assert "retention_rate" in std_ana
        assert std_ana["total_unique_students"] >= 0

        # Admissions & CRM checks
        crm = data["admissions_crm"]
        assert "total_leads" in crm
        assert "funnel_stages" in crm
        assert "lead_sources" in crm
        assert "follow_ups" in crm
        assert "demo_classes" in crm

        # Academic analysis checks
        acad = data["academic_analysis"]
        assert "inventory" in acad
        assert "attendance" in acad
        assert "examinations" in acad
        assert acad["attendance"]["total_records"] >= 0
        assert acad["examinations"]["total_marks_recorded"] >= 0

        # Transactions & reconciliation checks
        txn = data["transactions_reconciliation"]
        assert "total_transactions" in txn
        assert "status_distribution" in txn
        assert "ledger_audit" in txn
        assert txn["ledger_audit"]["is_reconciled"] is True

        # Operations checks
        ops = data["operations"]
        assert "daily_summary" in ops
        assert "recent_activities" in ops
