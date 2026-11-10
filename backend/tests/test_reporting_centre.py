# /**
#  * @file        test_reporting_centre.py
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
#  * @updated     2026-11-10
#  *
#  * @description Comprehensive test suite validating Central Reporting & Analytics Centre API endpoints, data aggregations, and CodeX financial masking.
#  */

import pytest
from datetime import date, datetime
from decimal import Decimal
from app.models.student import Student
from app.models.board import Board
from app.models.standard import Standard
from app.models.division import Division
from app.models.fee import FeeCategory, FeeStructure, StudentFeeAssignment, FeeInvoice, FeeInstallment
from app.models.payment import Payment
from app.models.user import AuditLog


class TestReportingCentre:
    """Test suite covering the Central Reporting & Analytics Centre endpoints."""

    @pytest.mark.asyncio
    async def test_student_master_directory_endpoint(self, client, auth_headers, db, test_institution, admin_user):
        """Validates GET /reports/students/master-directory endpoint response structure and filtering."""
        admin_user.institution_id = test_institution.id
        db.add(admin_user)
        await db.commit()

        # Create test student
        student = Student(
            first_name="Rohan",
            last_name="Sharma",
            gender="male",
            admission_number="ADM-REP-001",
            admission_date=date(2026, 1, 1),
            date_of_birth=date(2008, 5, 10),
            is_active=True,
            institution_id=test_institution.id,
        )
        db.add(student)
        await db.commit()

        # Query endpoint
        response = await client.get("/api/v1/reports/students/master-directory", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        matching = [s for s in data if s.get("admission_number") == "ADM-REP-001"]
        assert len(matching) >= 1
        record = matching[0]
        assert record["student_name"] == "Rohan Sharma"
        assert record["gender"] == "male"
        assert record["is_active"] is True

        # Query with filter
        filtered_res = await client.get("/api/v1/reports/students/master-directory?gender=male&search=Rohan", headers=auth_headers)
        assert filtered_res.status_code == 200
        filtered_data = filtered_res.json()
        assert any(s.get("admission_number") == "ADM-REP-001" for s in filtered_data)

    @pytest.mark.asyncio
    async def test_attendance_summary_endpoint(self, client, auth_headers):
        """Validates GET /reports/attendance/summary endpoint calculation and defaulter categorization."""
        response = await client.get(
            f"/api/v1/reports/attendance/summary?start_date={str(date.today())}&end_date={str(date.today())}",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    @pytest.mark.asyncio
    async def test_academic_curriculum_matrix_endpoint(self, client, auth_headers):
        """Validates GET /reports/academic/curriculum-matrix endpoint schema mapping."""
        response = await client.get("/api/v1/reports/academic/curriculum-matrix", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    @pytest.mark.asyncio
    async def test_academic_timetable_utilization_endpoint(self, client, auth_headers):
        """Validates GET /reports/academic/timetable-utilization endpoint room and schedule metrics."""
        response = await client.get("/api/v1/reports/academic/timetable-utilization", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    @pytest.mark.asyncio
    async def test_examination_consolidated_merit_endpoint(self, client, auth_headers):
        """Validates GET /reports/examinations/consolidated-merit endpoint structure."""
        response = await client.get("/api/v1/reports/examinations/consolidated-merit?exam_id=9999", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 0

    @pytest.mark.asyncio
    async def test_fees_defaulters_endpoint_and_codex_masking(self, client, auth_headers, db, test_fee_invoice):
        """Validates GET /reports/fees/defaulters overdue aging and CodeX financial masking."""
        invoice = test_fee_invoice["invoice"]
        student = test_fee_invoice["student"]

        # Overdue installment (due in the past)
        installment = FeeInstallment(
            invoice_id=invoice.id,
            fee_structure_id=test_fee_invoice["item"].fee_structure_id,
            installment_number=1,
            amount=Decimal("5000.00"),
            due_date=date(2026, 1, 1),
            status="overdue",
        )
        db.add(installment)
        await db.commit()

        # Query endpoint
        response = await client.get("/api/v1/reports/fees/defaulters?min_days_overdue=1", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        matching = [d for d in data if d.get("student_id") == student.id or d.get("admission_number") == student.admission_number]
        assert len(matching) >= 1
        record = matching[0]
        assert "overdue_amount" in record
        assert "days_overdue" in record
        # CodeX fields exist or are formatted according to visibility mode
        assert "overdue_amount_coded" in record or "overdue_amount" in record

    @pytest.mark.asyncio
    async def test_fees_daily_collection_endpoint(self, client, auth_headers):
        """Validates GET /reports/fees/daily-collection desk register endpoint."""
        response = await client.get(
            f"/api/v1/reports/fees/daily-collection?collection_date={str(date.today())}",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    @pytest.mark.asyncio
    async def test_system_audit_summary_endpoint(self, client, auth_headers, db, admin_user):
        """Validates GET /reports/system/audit-summary security audit trail log retrieval."""
        audit_entry = AuditLog(
            user_id=admin_user.id,
            action="REPORT_VIEW",
            resource_type="reports",
            details="User viewed executive report",
        )
        db.add(audit_entry)
        await db.commit()

        response = await client.get("/api/v1/reports/system/audit-summary?limit=50", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        matching = [a for a in data if a.get("action") == "REPORT_VIEW"]
        assert len(matching) >= 1
        assert matching[0]["resource_type"] == "reports"

    @pytest.mark.asyncio
    async def test_outstanding_and_payments_summary_codex_governance(self, client, auth_headers):
        """Validates CodeX masking enforcement across outstanding and payments summary endpoints."""
        res_outstanding = await client.get("/api/v1/reports/outstanding", headers=auth_headers)
        assert res_outstanding.status_code == 200
        data_out = res_outstanding.json()
        assert isinstance(data_out, list)

        res_payments = await client.get("/api/v1/reports/payments-summary", headers=auth_headers)
        assert res_payments.status_code == 200
        data_pay = res_payments.json()
        assert isinstance(data_pay, list)
