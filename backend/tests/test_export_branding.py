# /**
#  * @file        test_export_branding.py
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
#  * @created     2026-11-05
#  * @updated     2026-11-05
#  *
#  * @description Unit tests verifying consistent, understated PrathamOne branding in Excel and CSV exports.
#  */

import io
import openpyxl
import pytest
from app.services.data_exporter import create_excel_workbook, create_csv_content

EXPECTED_BRANDING = "PrathamOne Coaching Institutes Enterprise Suite · prathamone.com"


def test_create_excel_workbook_branding_footer():
    headers = ["ID", "Name", "Score"]
    rows = [
        [1, "Student Alpha", 95],
        [2, "Student Beta", 88],
    ]
    excel_bytes = create_excel_workbook("TestSheet", headers, rows)
    assert excel_bytes is not None and len(excel_bytes) > 0

    wb = openpyxl.load_workbook(io.BytesIO(excel_bytes))
    ws = wb.active
    assert ws is not None

    # Verify print page footer in Excel metadata
    assert EXPECTED_BRANDING in ws.oddFooter.center.text

    # Verify trailing branding row in worksheet cell
    found_in_sheet = False
    for r in range(1, ws.max_row + 1):
        cell_val = str(ws.cell(row=r, column=1).value or "")
        if EXPECTED_BRANDING in cell_val:
            found_in_sheet = True
            break
    assert found_in_sheet is True, "Expected branding row not found in worksheet rows"


def test_create_csv_content_branding_footer():
    headers = ["ID", "Name", "Score"]
    rows = [
        [1, "Student Alpha", 95],
        [2, "Student Beta", 88],
    ]
    csv_bytes = create_csv_content(headers, rows)
    csv_text = csv_bytes.decode("utf-8-sig")

    assert EXPECTED_BRANDING in csv_text
    lines = [l.strip() for l in csv_text.strip().splitlines() if l.strip()]
    assert EXPECTED_BRANDING in lines[-1]

