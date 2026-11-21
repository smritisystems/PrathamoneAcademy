# /**
#  * @file        test_flexible_matrix_report.py
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
#  * @created     2026-11-21
#  * @updated     2026-11-21
#  *
#  * @description Test suite for GET /reports/students/flexible-matrix endpoint validating multidimensional student telemetry.
#  */

import pytest
from datetime import date
from decimal import Decimal
from app.models.student import Student, Guardian
from app.models.board import Board
from app.models.standard import Standard
from app.models.division import Division
from app.models.enrollment import StudentEnrollment


class TestFlexibleMatrixReport:
    """Test suite covering the flexible multi-dimensional student reporting endpoint."""

    @pytest.mark.asyncio
    async def test_flexible_matrix_endpoint_success(self, client, auth_headers, db, test_institution, test_academic_year, admin_user):
        """Validates GET /reports/students/flexible-matrix returns enriched student records."""
        admin_user.institution_id = test_institution.id
        db.add(admin_user)
        await db.commit()

        # 1. Create Board
        board = Board(
            name="Central Board of Secondary Education",
            code="CBSE-FLEX",
            institution_id=test_institution.id,
            is_active=True,
        )
        db.add(board)
        await db.flush()

        # 2. Create Standard
        std = Standard(
            name="10th Standard",
            level=10,
            institution_id=test_institution.id,
            is_active=True,
        )
        db.add(std)
        await db.flush()

        # 3. Create Division (Batch)
        batch = Division(
            name="Morning Batch Alpha",
            code="BATCH-10-A",
            standard_id=std.id,
            board_id=board.id,
            capacity=40,
            is_active=True,
        )
        db.add(batch)
        await db.flush()

        # 4. Create Student
        student = Student(
            first_name="Aarav",
            last_name="Patel",
            gender="male",
            admission_number="ADM-FLEX-001",
            admission_date=date(2026, 1, 15),
            date_of_birth=date(2010, 6, 20),
            phone="9876543210",
            email="aarav.patel@example.com",
            city="Mumbai",
            is_active=True,
            institution_id=test_institution.id,
        )
        db.add(student)
        await db.flush()

        # 5. Create Guardian
        guardian = Guardian(
            student_id=student.id,
            first_name="Rajesh",
            last_name="Patel",
            relation="Father",
            phone="9876543211",
            is_primary=True,
        )
        db.add(guardian)
        await db.flush()

        # 6. Create Enrollment
        enr = StudentEnrollment(
            student_id=student.id,
            academic_year_id=test_academic_year.id,
            standard_id=std.id,
            division_id=batch.id,
            roll_number="101",
            enrollment_date=date(2026, 1, 15),
            status="active",
        )
        db.add(enr)
        await db.commit()

        # 7. Call endpoint
        response = await client.get("/api/v1/reports/students/flexible-matrix", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

        # 8. Assert student record attributes
        match = next((s for s in data if s["admission_number"] == "ADM-FLEX-001"), None)
        assert match is not None
        assert match["student_name"] == "Aarav Patel"
        assert match["board_name"] == "Central Board of Secondary Education"
        assert match["standard_name"] == "10th Standard"
        assert match["division_name"] == "Morning Batch Alpha"
        assert match["guardian_name"] == "Rajesh Patel"
        assert match["guardian_phone"] == "9876543211"
        assert "attendance_percentage" in match
        assert "balance_fees" in match
        assert "payment_status" in match
        assert "exam_percentage" in match
