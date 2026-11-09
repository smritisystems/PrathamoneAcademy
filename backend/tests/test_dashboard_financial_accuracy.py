# /**
#  * @file        test_dashboard_financial_accuracy.py
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
#  * @description Comprehensive test suite verifying dashboard financial accuracy, active-only outstanding isolation, status-wise breakdown reconciliation, aging analysis, and drill-down endpoints.
#  */

import pytest
from datetime import date
from decimal import Decimal


class TestDashboardFinancialAccuracy:
    @pytest.mark.asyncio
    async def test_dashboard_stats_and_status_wise_reconciliation(
        self, client, auth_headers, test_fee_invoice, test_institution, test_academic_year
    ):
        """
        Verify:
        1. Default dashboard returns Active Students Outstanding only.
        2. Status-wise breakdown is present and mathematically reconciles to total historical outstanding.
        3. Secondary financial indicators, aging analysis, and daily operations are computed.
        """
        res = await client.get(
            f"/api/v1/dashboard/stats?academic_year_id={test_academic_year.id}&institution_id={test_institution.id}",
            headers=auth_headers,
        )
        assert res.status_code == 200
        data = res.json()

        # Primary KPI cards
        assert "total_students" in data
        assert "total_fees" in data
        assert "total_collected" in data
        assert "total_outstanding" in data
        assert "collection_rate" in data

        # Status-wise breakdown
        assert "status_wise_outstanding" in data
        sw = data["status_wise_outstanding"]
        assert "active" in sw
        assert "inactive" in sw
        assert "left" in sw
        assert "transferred" in sw
        assert "cancelled" in sw
        assert "total_historical" in sw

        # Default total_outstanding must match active outstanding
        assert data["total_outstanding"] == sw["active"]["outstanding"]

        # Mathematical reconciliation guarantee:
        # Sum of categories must equal total_historical outstanding
        category_sum = (
            sw["active"]["outstanding"]
            + sw["inactive"]["outstanding"]
            + sw["left"]["outstanding"]
            + sw["transferred"]["outstanding"]
            + sw["cancelled"]["outstanding"]
        )
        assert round(category_sum, 2) == round(sw["total_historical"]["outstanding"], 2)

        # Secondary financial indicators
        assert "secondary_indicators" in data
        sec = data["secondary_indicators"]
        assert "today_collection" in sec
        assert "overdue_active_fees" in sec
        assert "due_this_month" in sec
        assert "pending_verification" in sec
        assert "pending_refunds" in sec
        assert "successful_refunds" in sec

        # Aging analysis
        assert "aging_analysis" in data
        aging = data["aging_analysis"]
        assert "active" in aging
        assert "total_historical" in aging
        for profile in [aging["active"], aging["total_historical"]]:
            assert "not_due" in profile
            assert "days_1_30" in profile
            assert "days_31_60" in profile
            assert "days_61_90" in profile
            assert "days_90_plus" in profile
            assert "total" in profile

        # Daily operations summary
        assert "daily_operations" in data
        ops = data["daily_operations"]
        assert "today_admissions" in ops
        assert "new_leads" in ops
        assert "follow_ups_due_today" in ops
        assert "demos_scheduled" in ops
        assert "upcoming_fee_due_invoices" in ops
        assert "pending_payment_verifications" in ops

        # Monthly trends
        assert "monthly_trends" in data
        if len(data["monthly_trends"]) > 0:
            trend_item = data["monthly_trends"][0]
            assert "month" in trend_item
            assert "month_key" in trend_item
            assert "collected" in trend_item
            assert "transaction_count" in trend_item

        # Recent payments
        assert "recent_payments" in data
        for p in data["recent_payments"]:
            assert not p["student_name"].endswith("-")
            assert "fee_category" in p
            assert "receipt_number" in p

    @pytest.mark.asyncio
    async def test_outstanding_drilldown_endpoint(
        self, client, auth_headers, test_fee_invoice, test_institution, test_academic_year
    ):
        """
        Verify the granular drilldown endpoint for outstanding balances.
        """
        # Active status drilldown
        res = await client.get(
            f"/api/v1/dashboard/outstanding-drilldown?academic_year_id={test_academic_year.id}&institution_id={test_institution.id}&status=active",
            headers=auth_headers,
        )
        assert res.status_code == 200
        drill = res.json()
        assert drill["status_scope"] == "active"
        assert "total_count" in drill
        assert "total_outstanding" in drill
        assert "records" in drill
        assert isinstance(drill["records"], list)

        if drill["records"]:
            rec = drill["records"][0]
            assert "invoice_id" in rec
            assert "invoice_number" in rec
            assert "student_id" in rec
            assert "student_name" in rec
            assert not rec["student_name"].endswith("-")
            assert "total_obligation" in rec
            assert "paid_amount" in rec
            assert "outstanding_amount" in rec
            assert "aging_bucket" in rec
            assert "student_status" in rec
            assert rec["student_status"] == "active"

