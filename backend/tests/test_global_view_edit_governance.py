# /**
#  * @file        test_global_view_edit_governance.py
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
#  * @description Comprehensive test suite validating Global View-First & Explicit Edit Mode backend write authorization, role restrictions, historical ledger immutability guards, and audit trail integrity.
#  */

import pytest
from datetime import date
from decimal import Decimal
from sqlalchemy import select
from app.models.student import Student
from app.models.portal import StudentDocument
from app.models.standard import Standard
from app.models.subject import Subject
from app.models.academic_year import AcademicYear
from app.models.user import User, AuditLog
from app.models.teacher_payroll import TeacherPayroll


class TestGlobalViewEditGovernance:
    """Test suite covering backend write authorization, immutability guards, and delete protection."""

    @pytest.mark.asyncio
    async def test_unauthenticated_write_operations_rejected(self, client):
        """Validates that all mutation endpoints reject unauthenticated requests with HTTP 401."""
        # 1. POST creation
        res_post = await client.post("/api/v1/divisions/", json={"name": "Illegal Batch", "standard_id": 1, "capacity": 30})
        assert res_post.status_code == 401

        # 2. PUT modification
        res_put = await client.put("/api/v1/settings/profile", json={"name": "Hacked Academy"})
        assert res_put.status_code == 401

        # 3. DELETE removal
        res_del = await client.delete("/api/v1/students/1/documents/1")
        assert res_del.status_code == 401

    @pytest.mark.asyncio
    async def test_financial_ledger_immutability_no_delete_endpoints(self, client, auth_headers):
        """
        Validates STRICT IMMUTABILITY OF FINANCIAL RECORDS:
        Payments, receipts, fee invoices, and payroll vouchers cannot be hard deleted.
        Endpoints must return 405 Method Not Allowed or 404 (non-existent).
        """
        # Hard deletion on payments endpoint must NOT exist
        res_pay = await client.delete("/api/v1/payments/1", headers=auth_headers)
        assert res_pay.status_code in (404, 405)

        # Hard deletion on fee invoice endpoint must NOT exist
        res_fee = await client.delete("/api/v1/fees/invoices/1", headers=auth_headers)
        assert res_fee.status_code in (404, 405)

        # Hard deletion on teacher payroll endpoint must NOT exist
        res_payroll = await client.delete("/api/v1/teacher-payroll/monthly/1", headers=auth_headers)
        assert res_payroll.status_code in (404, 405)

    @pytest.mark.asyncio
    async def test_standard_soft_delete_preserves_historical_integrity(self, client, auth_headers, db, test_institution):
        """Validates that deleting a standard performs soft deactivation (is_active = False)."""
        std = Standard(
            name="Std 12 Commerce",
            level=12,
            is_active=True,
            institution_id=test_institution.id,
        )
        db.add(std)
        await db.commit()
        await db.refresh(std)

        res = await client.delete(f"/api/v1/standards/{std.id}", headers=auth_headers)
        assert res.status_code == 200
        assert "deactivated successfully" in res.json()["message"]

        # Verify database record still exists and is deactivated
        updated_std = (await db.execute(select(Standard).where(Standard.id == std.id))).scalar_one()
        assert updated_std.is_active is False

    @pytest.mark.asyncio
    async def test_subject_soft_delete_preserves_historical_integrity(self, client, auth_headers, db, test_institution):
        """Validates that deleting a subject performs soft deactivation (is_active = False)."""
        std = Standard(
            name="Std 11 Science",
            level=11,
            is_active=True,
            institution_id=test_institution.id,
        )
        db.add(std)
        await db.commit()
        await db.refresh(std)

        subj = Subject(
            name="Advanced Statistics",
            code="STAT-ADV",
            standard_id=std.id,
            is_active=True,
        )
        db.add(subj)
        await db.commit()
        await db.refresh(subj)

        res = await client.delete(f"/api/v1/subjects/{subj.id}", headers=auth_headers)
        assert res.status_code == 200
        assert "deactivated successfully" in res.json()["message"]

        updated_subj = (await db.execute(select(Subject).where(Subject.id == subj.id))).scalar_one()
        assert updated_subj.is_active is False

    @pytest.mark.asyncio
    async def test_student_document_deletion_creates_audit_log(self, client, auth_headers, db, test_institution):
        """Validates that document removal generates a comprehensive AuditLog entry."""
        student = Student(
            first_name="Priya",
            last_name="Deshmukh",
            gender="female",
            admission_number="ADM-DOC-001",
            admission_date=date(2026, 1, 1),
            date_of_birth=date(2008, 9, 20),
            is_active=True,
            institution_id=test_institution.id,
        )
        db.add(student)
        await db.commit()
        await db.refresh(student)

        doc = StudentDocument(
            student_id=student.id,
            document_type="ID Proof",
            title="Aadhaar Card Copy",
            file_url="/docs/aadhaar_001.pdf",
            status="verified",
        )
        db.add(doc)
        await db.commit()
        await db.refresh(doc)

        # Delete document
        res = await client.delete(f"/api/v1/students/{student.id}/documents/{doc.id}", headers=auth_headers)
        assert res.status_code == 200
        assert res.json()["id"] == doc.id

        # Verify AuditLog created
        audit = (
            await db.execute(
                select(AuditLog).where(
                    AuditLog.action == "delete_student_document",
                    AuditLog.resource_id == doc.id,
                )
            )
        ).scalar_one_or_none()
        assert audit is not None
        assert "title=Aadhaar Card Copy" in audit.old_data

    @pytest.mark.asyncio
    async def test_user_permanent_delete_conflict_protection(self, client, auth_headers, db, test_institution):
        """
        Validates Delete Protection on Users:
        Permanent deletion of a user who has associated historical records (e.g. TeacherPayroll)
        is strictly rejected with HTTP 400 detailing conflict count.
        """
        faculty = User(
            username="prof_sharma",
            email="prof.sharma@prashant.edu",
            first_name="Prof",
            last_name="Sharma",
            role="teacher",
            is_active=True,
            institution_id=test_institution.id,
            hashed_password="hashed_dummy_password",
        )
        db.add(faculty)
        await db.commit()
        await db.refresh(faculty)

        # Create an academic year
        ay = AcademicYear(
            institution_id=test_institution.id,
            name="2026-27",
            start_date=date(2026, 4, 1),
            end_date=date(2027, 3, 31),
            is_current=True,
        )
        db.add(ay)
        await db.commit()
        await db.refresh(ay)

        # Create a teacher payroll record attached to this faculty
        payroll = TeacherPayroll(
            payroll_number=f"PR-TEST-{faculty.id}",
            institution_id=test_institution.id,
            academic_year_id=ay.id,
            teacher_user_id=faculty.id,
            month=5,
            year=2026,
            start_date=date(2026, 5, 1),
            end_date=date(2026, 5, 31),
            payment_method="hourly",
            status="approved",
            base_earnings=Decimal("5000.00"),
            net_payable=Decimal("5000.00"),
        )
        db.add(payroll)
        await db.commit()

        # Attempt permanent delete
        res = await client.delete(f"/api/v1/users/{faculty.id}?permanent=true", headers=auth_headers)
        assert res.status_code == 400
        detail = res.json()["detail"]
        assert "Delete Protection Violation" in detail
        assert "Teacher Payroll" in detail
