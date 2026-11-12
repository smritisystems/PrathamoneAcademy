# /**
#  * @file        import_register.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      backend.app.api.v1.endpoints
#  *
#  * @author      Jawahar R. Mallah
#  * @organization AITDL (AI Technology & Development Lab)
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 AITDL
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-04
#  * @updated     2026-11-12
#  *
#  * @description API endpoints for legacy fee register spreadsheet parsing and ledger migration.
#  */

import os
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.deps import require_role
from app.models.import_log import FeeRegisterImport
from app.services.fee_register_importer import (
    parse_fee_register_workbook,
    execute_fee_register_import,
)
from pydantic import BaseModel

router = APIRouter()

DEFAULT_WORKBOOK_PATH = r"F:\Smriti-Clients Data\Prashant Academy\Book1.xlsx"
MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB upper bound for uploaded spreadsheets
REGISTER_IMPORT_ROLES = ("superadmin", "sysadmin", "super_admin")


class ImportExecuteRequest(BaseModel):
    replace_demo_data: bool = True
    file_path: Optional[str] = DEFAULT_WORKBOOK_PATH


@router.get("/preview")
async def preview_default_register(
    current_user=Depends(require_role(*REGISTER_IMPORT_ROLES)),
):
    """
    Stage 1 & 2: Preview default uploaded fee register (Book1.xlsx).
    Returns parsed groups, student records, payments, and balance discrepancy analysis.
    """
    if not os.path.exists(DEFAULT_WORKBOOK_PATH):
        raise HTTPException(
            status_code=404,
            detail=f"Fee register workbook not found at: {DEFAULT_WORKBOOK_PATH}",
        )

    with open(DEFAULT_WORKBOOK_PATH, "rb") as f:
        content = f.read()

    file_name = os.path.basename(DEFAULT_WORKBOOK_PATH)
    return parse_fee_register_workbook(content, file_name)


@router.post("/preview-upload")
async def preview_uploaded_register(
    file: UploadFile = File(...),
    current_user=Depends(require_role(*REGISTER_IMPORT_ROLES)),
):
    """Stage 1 & 2: Preview an uploaded Excel fee register workbook."""
    filename = file.filename or ""
    if not filename.lower().endswith((".xlsx", ".xls")):
        raise HTTPException(
            status_code=400, detail="Invalid file format. Please upload an Excel .xlsx workbook."
        )

    content = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413, detail="Uploaded workbook exceeds the 10 MB safety limit."
        )
    return parse_fee_register_workbook(content, filename)


@router.post("/execute")
async def execute_register_import(
    request: ImportExecuteRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role(*REGISTER_IMPORT_ROLES)),
):
    """
    Stage 4 & 5: Execute verified database import in an atomic transaction.
    Guards against duplicates using SHA-256 fingerprinting.
    """
    file_path = request.file_path or DEFAULT_WORKBOOK_PATH
    if os.path.realpath(file_path) != os.path.realpath(DEFAULT_WORKBOOK_PATH):
        raise HTTPException(
            status_code=403,
            detail="Arbitrary server filesystem paths are not allowed. Use upload preview or authorized baseline path.",
        )
    if not os.path.exists(DEFAULT_WORKBOOK_PATH):
        raise HTTPException(
            status_code=404, detail=f"Workbook file not found at: {DEFAULT_WORKBOOK_PATH}"
        )

    with open(DEFAULT_WORKBOOK_PATH, "rb") as f:
        content = f.read()

    file_name = os.path.basename(DEFAULT_WORKBOOK_PATH)
    result = await execute_fee_register_import(
        db=db,
        user_id=current_user.id,
        file_bytes=content,
        file_name=file_name,
        replace_demo_data=request.replace_demo_data,
    )
    return result


@router.get("/status")
async def get_import_status(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role(*REGISTER_IMPORT_ROLES)),
):
    """Returns import history and check if default workbook has already been imported."""
    result = await db.execute(
        select(FeeRegisterImport).order_by(FeeRegisterImport.created_at.desc())
    )
    imports = result.scalars().all()

    default_file_hash = None
    default_imported = False
    if os.path.exists(DEFAULT_WORKBOOK_PATH):
        with open(DEFAULT_WORKBOOK_PATH, "rb") as f:
            import hashlib
            default_file_hash = hashlib.sha256(f.read()).hexdigest()
            default_imported = any(i.file_hash == default_file_hash for i in imports)

    return {
        "default_file_path": DEFAULT_WORKBOOK_PATH,
        "default_file_exists": os.path.exists(DEFAULT_WORKBOOK_PATH),
        "default_file_hash": default_file_hash,
        "is_default_imported": default_imported,
        "import_history": [
            {
                "id": i.id,
                "file_name": i.file_name,
                "file_hash": i.file_hash,
                "imported_students_count": i.imported_students_count,
                "imported_payments_count": i.imported_payments_count,
                "total_fees": float(i.total_fees),
                "total_collected": float(i.total_collected),
                "total_outstanding": float(i.total_outstanding),
                "created_at": i.created_at.isoformat() if i.created_at else None,
                "status": i.status,
            }
            for i in imports
        ],
    }

