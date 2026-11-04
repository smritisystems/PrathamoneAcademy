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
#  * @updated     2026-11-04
#  *
#  * @description Pytest suite validating dashboard KPI metrics calculations and active student counters.
#  */

import pytest
from decimal import Decimal
from datetime import date


class TestDashboardStats:
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

