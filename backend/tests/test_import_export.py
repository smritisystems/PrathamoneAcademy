# /**
#  * @file        test_import_export.py
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
#  * @description Pytest suite verifying Excel and CSV template generation, column mapping, and import jobs.
#  */

import pytest
import io
import openpyxl
from datetime import date
from httpx import AsyncClient
from sqlalchemy import select
from app.models.student import Student
from app.models.import_log import DataImportLog


@pytest.mark.asyncio
async def test_get_supported_entities(client: AsyncClient, auth_headers: dict):
    res = await client.get("/api/v1/import-export/entities", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    keys = [item["key"] for item in data]
    assert "students" in keys
    assert "batches" in keys
    assert "payments" in keys
    assert "attendance" in keys


@pytest.mark.asyncio
async def test_download_template_xlsx_and_csv(client: AsyncClient, auth_headers: dict):
    # Test Excel template
    res_xlsx = await client.get(
        "/api/v1/import-export/template?entity_type=students&file_format=xlsx",
        headers=auth_headers,
    )
    assert res_xlsx.status_code == 200
    assert "application/vnd.openxmlformats" in res_xlsx.headers["content-type"]
    assert "students" in res_xlsx.headers["content-disposition"]
    wb = openpyxl.load_workbook(io.BytesIO(res_xlsx.content))
    assert len(wb.sheetnames) >= 1

    # Test CSV template
    res_csv = await client.get(
        "/api/v1/import-export/template?entity_type=batches&file_format=csv",
        headers=auth_headers,
    )
    assert res_csv.status_code == 200
    assert "text/csv" in res_csv.headers["content-type"]
    assert "batches" in res_csv.headers["content-disposition"]
    text = res_csv.content.decode("utf-8-sig")
    assert "Batch Name" in text or "batch_name" in text.lower()


@pytest.mark.asyncio
async def test_preview_grid_tsv_paste(client: AsyncClient, auth_headers: dict, admin_user, test_student: Student, db):
    admin_user.institution_id = test_student.institution_id
    await db.commit()

    # TSV text copied from Excel
    # Contains:
    # 1. Existing student (test_student.admission_number)
    # 2. Brand new student
    # 3. Invalid row (missing DOB)
    raw_tsv = (
        "Admission Number\tFirst Name\tLast Name\tDate of Birth\tGender\n"
        f"{test_student.admission_number}\tTest\tExisting\t2014-01-01\tmale\n"
        "IMP-TEST-001\tRohan\tVerma\t2012-08-20\tmale\n"
        "IMP-TEST-002\tInvalidRow\tStudent\t\tfemale\n"
    )

    req_payload = {
        "entity_type": "students",
        "raw_text": raw_tsv,
        "mode": "create_only",
    }
    res = await client.post(
        "/api/v1/import-export/preview-grid",
        json=req_payload,
        headers=auth_headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["total_rows"] == 3
    assert data["duplicates_found"] == 1  # test_student already exists
    assert data["invalid_rows"] in (1, 2)    # IMP-TEST-002 missing DOB
    assert data["valid_rows"] in (1, 2)      # valid rows

    # Check row actions in create_only mode
    rows = data["row_previews"]
    row1 = next(r for r in rows if r["data"]["admission_number"] == test_student.admission_number)
    assert row1["action"] == "skip_duplicate"
    assert row1["is_duplicate"] is True

    row2 = next(r for r in rows if r["data"]["admission_number"] == "IMP-TEST-001")
    assert row2["action"] == "create"
    assert row2["is_valid"] is True

    row3 = next(r for r in rows if r["data"]["admission_number"] == "IMP-TEST-002")
    assert row3["is_valid"] is False
    assert len(row3["errors"]) > 0


@pytest.mark.asyncio
async def test_execute_import_and_history(client: AsyncClient, auth_headers: dict, db):
    # Validate and execute import for a new student
    adm_num = f"EXEC-STU-{date.today().strftime('%Y%m%d%H%M%S')}"
    valid_rows = [
        {
            "row_number": 1,
            "is_valid": True,
            "action": "create",
            "data": {
                "admission_number": adm_num,
                "first_name": "Kavita",
                "last_name": "Patil",
                "gender": "female",
                "date_of_birth": "2013-05-10",
                "phone": "9820011223",
                "email": "kavita.patil@test.com",
            },
        }
    ]

    exec_res = await client.post(
        "/api/v1/import-export/execute",
        json={
            "entity_type": "students",
            "validated_rows": valid_rows,
            "mode": "create_only",
            "source_type": "paste_grid",
        },
        headers=auth_headers,
    )
    assert exec_res.status_code == 200
    result = exec_res.json()
    assert result["success"] is True
    assert result["created_count"] == 1
    assert result["failed_count"] == 0
    import_id = result["import_id"]

    # Verify student exists in db
    stu = (await db.execute(select(Student).where(Student.admission_number == adm_num))).scalar_one_or_none()
    assert stu is not None
    assert stu.first_name == "Kavita"

    # Verify import log exists in history
    hist_res = await client.get("/api/v1/import-export/history", headers=auth_headers)
    assert hist_res.status_code == 200
    hist_data = hist_res.json()
    assert hist_data["total"] >= 1
    item = next((it for it in hist_data["items"] if it["id"] == import_id), None)
    assert item is not None
    assert item["entity_type"] == "students"
    assert item["successful_rows"] == 1

    # Verify history details endpoint
    detail_res = await client.get(f"/api/v1/import-export/history/{import_id}", headers=auth_headers)
    assert detail_res.status_code == 200
    detail_data = detail_res.json()
    assert detail_data["id"] == import_id
    assert detail_data["reconciliation"]["created"] == 1


@pytest.mark.asyncio
async def test_export_formula_injection_protection(client: AsyncClient, auth_headers: dict, admin_user, test_institution, db):
    admin_user.institution_id = test_institution.id
    await db.commit()

    # Insert student with potentially malicious formula name
    malicious_adm = f"MAL-STU-{date.today().strftime('%Y%m%d%H%M%S')}"
    evil_student = Student(
        institution_id=test_institution.id,
        admission_number=malicious_adm,
        first_name="=HYPERLINK(\"http://evil.com\")",
        last_name="+cmd|' /C calc'!A0",
        date_of_birth=date(2011, 2, 2),
        admission_date=date(2024, 4, 1),
        gender="male",
    )
    db.add(evil_student)
    await db.commit()

    # Export CSV
    res_csv = await client.get(
        "/api/v1/import-export/export?entity_type=students&file_format=csv",
        headers=auth_headers,
    )
    assert res_csv.status_code == 200
    csv_text = res_csv.content.decode("utf-8-sig")
    assert malicious_adm in csv_text
    # Formula characters must be sanitized with leading apostrophe
    assert "'=HYPERLINK" in csv_text
    assert "'+cmd|" in csv_text
