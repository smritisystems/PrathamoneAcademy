# /**
#  * @file        test_fee_register_import.py
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
#  * @created     2026-11-04
#  * @updated     2026-11-04
#  *
#  * @description Pytest suite testing fee register spreadsheet parsing, validation rules, and error handling.
#  */

import pytest
import os
import re
from decimal import Decimal
from app.services.fee_register_importer import (
    parse_payment_cell,
    parse_fee_register_workbook,
    execute_fee_register_import,
)
from app.models.student import Student
from app.models.fee import FeeInvoice
from app.models.payment import Payment, PaymentReceipt
from app.models.import_log import FeeRegisterImport
from sqlalchemy import select, func

WORKBOOK_PATH = r"F:\Smriti-Clients Data\Prashant Academy\Book1.xlsx"


class TestFeeRegisterParsing:
    def test_parse_payment_cell_multi_payments(self):
        """Test detection and parsing of multiple payments in a single cell."""
        # Case 1: Comma-separated
        cell1 = "3 May ₹10,000 , 30 May ₹10,000\n"
        res1 = parse_payment_cell(cell1, col_idx=8)
        assert len(res1) == 2
        assert res1[0]["amount"] == Decimal("10000")
        assert res1[0]["day"] == 3
        assert res1[0]["month"] == 5
        assert res1[1]["amount"] == Decimal("10000")
        assert res1[1]["day"] == 30
        assert res1[1]["month"] == 5

        # Case 2: Newline-separated with dates
        cell2 = "2 July\n₹9,500\n \n30 July\n₹9,500"
        res2 = parse_payment_cell(cell2, col_idx=12)
        assert len(res2) == 2
        assert res2[0]["amount"] == Decimal("9500")
        assert res2[0]["day"] == 2
        assert res2[0]["month"] == 7
        assert res2[1]["amount"] == Decimal("9500")
        assert res2[1]["day"] == 30
        assert res2[1]["month"] == 7

        # Case 3: Explicit year in string
        cell3 = "9 March 2026 ₹7000"
        res3 = parse_payment_cell(cell3, col_idx=4)
        assert len(res3) == 1
        assert res3[0]["amount"] == Decimal("7000")
        assert res3[0]["year"] == 2026
        assert res3[0]["day"] == 9
        assert res3[0]["month"] == 3

    @pytest.mark.skipif(not os.path.exists(WORKBOOK_PATH), reason="Workbook not found in test environment")
    def test_workbook_full_reconciliation(self):
        """Test full parsing and reconciliation on the actual workbook."""
        assert os.path.exists(WORKBOOK_PATH), f"Workbook not found at {WORKBOOK_PATH}"

        with open(WORKBOOK_PATH, "rb") as f:
            content = f.read()

        parsed = parse_fee_register_workbook(content, "Book1.xlsx")
        summary = parsed["summary"]

        assert summary["total_students"] == 39
        assert summary["total_payments_count"] == 170
        assert summary["total_fees"] == 2935000.0
        assert summary["total_collected"] == 1819500.0
        assert summary["total_outstanding"] == 1115500.0
        assert summary["match_count"] == 16
        assert summary["discrepancy_count"] == 19
        assert summary["unclear_count"] == 3
        assert summary["blank_count"] == 1

        # Check groups
        group_names = [g["name"] for g in parsed["groups"]]
        assert "ICSE X" in group_names
        assert "CBSE X" in group_names
        assert "ICSE IV" in group_names
        assert "ICSE VIII" in group_names
        assert "SSC IX" in group_names


class TestFeeRegisterImportExecution:
    @pytest.mark.skipif(not os.path.exists(WORKBOOK_PATH), reason="Workbook not found in test environment")
    @pytest.mark.asyncio
    async def test_preview_and_execute_import(self, client, auth_headers, test_institution, test_academic_year, db):
        """Test preview endpoint and atomic database import execution."""
        # 1. Preview
        prev_res = await client.get("/api/v1/import/fee-register/preview", headers=auth_headers)
        assert prev_res.status_code == 200
        prev_data = prev_res.json()
        assert prev_data["summary"]["total_students"] == 39
        assert prev_data["summary"]["total_fees"] == 2935000.0

        # 2. Execute import
        exec_res = await client.post(
            "/api/v1/import/fee-register/execute",
            headers=auth_headers,
            json={"replace_demo_data": True, "file_path": WORKBOOK_PATH},
        )
        assert exec_res.status_code == 200
        exec_data = exec_res.json()
        assert exec_data["status"] == "success"
        assert exec_data["summary"]["total_students"] == 39

        # 3. Verify students in database
        students = (await db.execute(
            select(Student).where(Student.admission_number.like("PA-2024-%"))
        )).scalars().all()
        assert len(students) == 39
        for s in students:
            assert re.match(r"^PA-\d{4}-\d{6}$", s.admission_number)

        # 4. Verify invoices and payments in database
        invoices = (await db.execute(
            select(FeeInvoice).where(FeeInvoice.invoice_number.like("INV-2024-%"))
        )).scalars().all()
        assert len(invoices) == 39
        total_inv_fees = sum(float(i.net_amount) for i in invoices)
        total_inv_paid = sum(float(i.paid_amount) for i in invoices)
        total_inv_outstanding = sum(float(i.outstanding_amount) for i in invoices)

        assert total_inv_fees == 2935000.0
        assert total_inv_paid == 1819500.0
        assert total_inv_outstanding == 1115500.0

        payments_count = (await db.execute(select(func.count(Payment.id)))).scalar()
        assert payments_count >= 170

        receipts_count = (await db.execute(select(func.count(PaymentReceipt.id)))).scalar()
        assert receipts_count >= 170

        # 5. Verify import log recorded
        import_logs = (await db.execute(select(FeeRegisterImport))).scalars().all()
        assert len(import_logs) >= 1
        assert import_logs[0].imported_students_count == 39
        assert import_logs[0].imported_payments_count == 170

    @pytest.mark.skipif(not os.path.exists(WORKBOOK_PATH), reason="Workbook not found in test environment")
    @pytest.mark.asyncio
    async def test_duplicate_import_prevention(self, client, auth_headers):
        """Test that attempting to re-import the same file is blocked by SHA-256 fingerprint."""
        dup_res = await client.post(
            "/api/v1/import/fee-register/execute",
            headers=auth_headers,
            json={"replace_demo_data": False, "file_path": WORKBOOK_PATH},
        )
        assert dup_res.status_code == 400
        assert "Duplicate Import Detected" in dup_res.json()["detail"]
