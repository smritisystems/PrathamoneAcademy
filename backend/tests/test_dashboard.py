# /**
#  * @file        test_dashboard.py
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
#  * @created     2026-11-03
#  * @updated     2026-11-14
#  *
#  * @description Pytest suite validating dashboard KPI metrics calculations and active student counters.
#  */

import pytest
from decimal import Decimal
from datetime import date


class TestDashboardStats:
    @pytest.mark.asyncio
    async def test_dashboard_collection_trends_support_calendar_periods(
        self, client, auth_headers, test_fee_invoice, test_institution, test_academic_year
    ):
        """Collection trends group the same posted payment by day, month, and year."""
        invoice = test_fee_invoice["invoice"]
        student = test_fee_invoice["student"]
        payment_date = date.today()
        payment_response = await client.post(
            "/api/v1/payments/",
            headers=auth_headers,
            json={
                "student_id": student.id,
                "academic_year_id": test_academic_year.id,
                "amount": 1234.0,
                "payment_date": str(payment_date),
                "payment_method": "upi",
                "allocations": [
                    {
                        "invoice_id": invoice.id,
                        "installment_id": test_fee_invoice["installment"].id,
                        "amount": 1234.0,
                    }
                ],
            },
        )
        assert payment_response.status_code == 201, payment_response.text

        params = {
            "academic_year_id": test_academic_year.id,
            "institution_id": test_institution.id,
        }
        daily_response = await client.get(
            "/api/v1/dashboard/collection-trends",
            params={**params, "granularity": "day", "month": payment_date.strftime("%Y-%m")},
            headers=auth_headers,
        )
        monthly_response = await client.get(
            "/api/v1/dashboard/collection-trends",
            params={**params, "granularity": "month"},
            headers=auth_headers,
        )
        yearly_response = await client.get(
            "/api/v1/dashboard/collection-trends",
            params={**params, "granularity": "year"},
            headers=auth_headers,
        )

        assert daily_response.status_code == 200, daily_response.text
        assert monthly_response.status_code == 200, monthly_response.text
        assert yearly_response.status_code == 200, yearly_response.text
        for response, key in [
            (daily_response, payment_date.strftime("%Y-%m-%d")),
            (monthly_response, payment_date.strftime("%Y-%m")),
            (yearly_response, payment_date.strftime("%Y")),
        ]:
            data = response.json()
            matching_period = next(record for record in data["records"] if record["period_key"] == key)
            assert matching_period["collected"] >= 1234.0
            assert matching_period["transaction_count"] >= 1

        missing_month = await client.get(
            "/api/v1/dashboard/collection-trends",
            params={**params, "granularity": "day"},
            headers=auth_headers,
        )
        assert missing_month.status_code == 422

    @pytest.mark.asyncio
    async def test_dashboard_stats_endpoint(
        self, client, auth_headers, test_fee_invoice, test_institution, test_academic_year
    ):
        """Test dashboard stats endpoint returns correct calculations and structure."""
        # 1. Fetch initial stats
        response = await client.get(
            f"/api/v1/dashboard/stats?academic_year_id={test_academic_year.id}&institution_id={test_institution.id}",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert "total_students" in data
        assert "total_fees" in data
        assert "total_collected" in data
        assert "total_outstanding" in data
        assert "collection_rate" in data
        assert "monthly_trends" in data
        assert "recent_payments" in data

        assert data["total_fees"] >= 24000.0
        assert data["total_outstanding"] >= 24000.0

        # 2. Make a payment
        invoice = test_fee_invoice["invoice"]
        student = test_fee_invoice["student"]
        pay_res = await client.post(
            "/api/v1/payments/",
            headers=auth_headers,
            json={
                "student_id": student.id,
                "academic_year_id": test_academic_year.id,
                "amount": 10000.0,
                "payment_date": str(date.today()),
                "payment_method": "upi",
                "allocations": [
                    {
                        "invoice_id": invoice.id,
                        "installment_id": test_fee_invoice["installment"].id,
                        "amount": 10000.0,
                    }
                ],
            },
        )
        assert pay_res.status_code == 201
        receipt_num = pay_res.json()["receipt_number"]

        # 3. Check updated stats
        updated_res = await client.get(
            f"/api/v1/dashboard/stats?academic_year_id={test_academic_year.id}&institution_id={test_institution.id}",
            headers=auth_headers,
        )
        assert updated_res.status_code == 200
        updated = updated_res.json()
        assert updated["total_collected"] >= 10000.0
        assert updated["total_outstanding"] <= updated["total_fees"] - 10000.0
        assert updated["collection_rate"] > 0

        # Check recent payments contains receipt number
        assert len(updated["recent_payments"]) > 0
        latest_payment = updated["recent_payments"][0]
        assert latest_payment["receipt_number"] == receipt_num
        assert latest_payment["student_name"] == f"{student.first_name} {student.last_name}"
        assert latest_payment["amount"] == 10000.0
        assert latest_payment["payment_method"] == "upi"
        assert "batch" in latest_payment

        # Check monthly trend exists
        assert len(updated["monthly_trends"]) > 0
        trend_months = [t["month"] for t in updated["monthly_trends"]]
        assert any(t["collected"] >= 10000.0 for t in updated["monthly_trends"])
