# /**
#  * @file        import_export.py
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
#  * @updated     2026-11-04
#  *
#  * @description API endpoints for bulk spreadsheet import/export, template generation, and async job tracking.
#  */

import json
from datetime import date
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form, Response
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc

from app.core.database import get_db
from app.core.deps import get_current_active_user, require_role
from app.models.user import User
from app.models.import_log import DataImportLog
from app.services.data_importer import (
    ENTITY_CONFIGS,
    generate_entity_template,
    parse_uploaded_file_rows,
    parse_pasted_grid_text,
    validate_and_preview_import,
    execute_verified_import,
)
from app.services.data_exporter import export_entity_data

router = APIRouter()


class GridPreviewRequest(BaseModel):
    entity_type: str
    headers: Optional[List[str]] = None
    raw_rows: Optional[List[List[Any]]] = None
    raw_text: Optional[str] = None
    column_mapping: Optional[Dict[str, str]] = None
    mode: str = "create_only"
    academic_year_id: Optional[int] = None


class ImportExecuteRequest(BaseModel):
    entity_type: str
    validated_rows: List[Dict[str, Any]]
    mode: str = "create_only"
    source_type: str = "paste_grid"
    file_name: Optional[str] = None
    academic_year_id: Optional[int] = None


@router.get("/entities")
async def list_supported_entities(
    current_user: User = Depends(get_current_active_user),
):
    """
    Returns metadata for all entities supported by the import/export engine,
    including available fields, labels, required flags, types, and descriptions.
    """
    result = []
    for key, cfg in ENTITY_CONFIGS.items():
        result.append({
            "key": key,
            "label": cfg["label"],
            "unique_key": cfg["unique_key"],
            "fields": cfg["fields"],
        })
    return result


@router.get("/template")
async def download_import_template(
    entity_type: str = Query(..., description="Target entity type, e.g. students, batches"),
    file_format: str = Query("xlsx", regex="^(xlsx|csv)$", description="File format: xlsx or csv"),
    current_user: User = Depends(get_current_active_user),
):
    """
    Generates and returns an import template (.xlsx or .csv) containing
    expected column headers, field guidelines, and a valid sample row.
    """
    try:
        content, filename, media_type = generate_entity_template(entity_type, file_format)
        return Response(
            content=content,
            media_type=media_type,
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Access-Control-Expose-Headers": "Content-Disposition",
            },
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate template: {str(e)}")


@router.post("/preview-file")
async def preview_file_import(
    file: UploadFile = File(...),
    entity_type: str = Form(...),
    mode: str = Form("create_only"),
    academic_year_id: Optional[int] = Form(None),
    current_user: User = Depends(require_role("super_admin", "admin", "staff")),
    db: AsyncSession = Depends(get_db),
):
    """
    Parses an uploaded .xlsx or .csv file, validates data rows against database rules,
    detects duplicates, and returns preview statistics before execution.
    """
    if not file.filename.lower().endswith((".xlsx", ".xls", ".csv")):
        raise HTTPException(status_code=400, detail="Only .xlsx, .xls, and .csv files are supported.")

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    try:
        headers, data_rows = parse_uploaded_file_rows(file_bytes, file.filename)
        if not headers or not data_rows:
            raise HTTPException(status_code=400, detail="File contains no parseable header or data rows.")

        preview = await validate_and_preview_import(
            entity_type=entity_type,
            headers=headers,
            raw_rows=data_rows,
            mode=mode,
            institution_id=current_user.institution_id or 1,
            academic_year_id=academic_year_id,
            db=db,
        )
        preview["file_name"] = file.filename
        return preview
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse file: {str(e)}")


@router.post("/preview-grid")
async def preview_grid_import(
    req: GridPreviewRequest,
    current_user: User = Depends(require_role("super_admin", "admin", "staff")),
    db: AsyncSession = Depends(get_db),
):
    """
    Validates spreadsheet grid data (either tab-delimited pasted text or explicit matrix),
    resolves column mappings, checks foreign keys and duplicate records in real-time.
    """
    try:
        headers = req.headers or []
        raw_rows = req.raw_rows or []

        if req.raw_text and not raw_rows:
            parsed_headers, parsed_rows = parse_pasted_grid_text(req.raw_text)
            if parsed_headers:
                headers = parsed_headers
            if parsed_rows:
                raw_rows = parsed_rows

        if not headers and not raw_rows:
            raise HTTPException(status_code=400, detail="No headers or data rows provided.")

        preview = await validate_and_preview_import(
            entity_type=req.entity_type,
            headers=headers,
            raw_rows=raw_rows,
            column_mapping=req.column_mapping,
            mode=req.mode,
            institution_id=current_user.institution_id or 1,
            academic_year_id=req.academic_year_id,
            db=db,
        )
        return preview
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Validation failed: {str(e)}")


@router.post("/execute")
async def execute_import(
    req: ImportExecuteRequest,
    current_user: User = Depends(require_role("super_admin", "admin", "staff")),
    db: AsyncSession = Depends(get_db),
):
    """
    Executes validated records into the database atomically.
    Supports 'create_only' and 'update_existing' modes.
    Logs transaction in data_import_logs and audit_logs.
    """
    if not req.validated_rows:
        raise HTTPException(status_code=400, detail="No validated rows provided for import.")

    try:
        result = await execute_verified_import(
            entity_type=req.entity_type,
            validated_rows=req.validated_rows,
            mode=req.mode,
            source_type=req.source_type,
            file_name=req.file_name,
            institution_id=current_user.institution_id or 1,
            academic_year_id=req.academic_year_id,
            user_id=current_user.id,
            db=db,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Import execution error: {str(e)}")


@router.get("/export")
async def export_data(
    entity_type: str = Query(..., description="Entity to export (e.g. students, payments)"),
    file_format: str = Query("xlsx", regex="^(xlsx|csv)$"),
    academic_year_id: Optional[int] = Query(None),
    board_id: Optional[int] = Query(None),
    standard_id: Optional[int] = Query(None),
    division_id: Optional[int] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    status_filter: Optional[str] = Query(None),
    current_user: User = Depends(require_role("super_admin", "admin", "staff", "teacher")),
    db: AsyncSession = Depends(get_db),
):
    """
    Exports filtered live database records to formatted Excel (.xlsx) or CSV (.csv)
    with formula injection protection applied to every cell.
    """
    try:
        content, filename, media_type = await export_entity_data(
            entity_type=entity_type,
            export_format=file_format,
            institution_id=current_user.institution_id or 1,
            academic_year_id=academic_year_id,
            board_id=board_id,
            standard_id=standard_id,
            division_id=division_id,
            start_date=start_date,
            end_date=end_date,
            status_filter=status_filter,
            db=db,
        )
        return Response(
            content=content,
            media_type=media_type,
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Access-Control-Expose-Headers": "Content-Disposition",
            },
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")


@router.get("/history")
async def get_import_history(
    entity_type: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(require_role("super_admin", "admin", "staff")),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns historical import logs with status, row metrics, and summary data.
    """
    q = (
        select(DataImportLog, User.first_name, User.last_name, User.username)
        .outerjoin(User, DataImportLog.imported_by_id == User.id)
        .where(DataImportLog.institution_id == (current_user.institution_id or 1))
    )
    if entity_type:
        q = q.where(DataImportLog.entity_type == entity_type.lower())

    q = q.order_by(desc(DataImportLog.created_at)).offset(offset).limit(limit)
    rows = (await db.execute(q)).all()

    items = []
    for log, first_name, last_name, username in rows:
        reconciliation = None
        if log.reconciliation_data:
            try:
                reconciliation = json.loads(log.reconciliation_data)
            except Exception:
                pass

        user_display = f"{first_name or ''} {last_name or ''}".strip() or username or "System"

        items.append({
            "id": log.id,
            "entity_type": log.entity_type,
            "import_mode": log.import_mode,
            "source_type": log.source_type,
            "file_name": log.file_name,
            "total_rows": log.total_rows,
            "successful_rows": log.successful_rows,
            "failed_rows": log.failed_rows,
            "status": log.status,
            "created_at": log.created_at.isoformat() if log.created_at else None,
            "imported_by": user_display,
            "reconciliation": reconciliation,
        })

    # Total count
    count_q = select(func.count(DataImportLog.id)).where(DataImportLog.institution_id == (current_user.institution_id or 1))
    if entity_type:
        count_q = count_q.where(DataImportLog.entity_type == entity_type.lower())
    total_count = (await db.execute(count_q)).scalar() or 0

    return {
        "items": items,
        "total": total_count,
        "limit": limit,
        "offset": offset,
    }


@router.get("/history/{import_id}")
async def get_import_history_details(
    import_id: int,
    current_user: User = Depends(require_role("super_admin", "admin", "staff")),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns full details for a specific import job including row-level errors.
    """
    q = (
        select(DataImportLog, User.first_name, User.last_name, User.username)
        .outerjoin(User, DataImportLog.imported_by_id == User.id)
        .where(DataImportLog.id == import_id, DataImportLog.institution_id == (current_user.institution_id or 1))
    )
    row = (await db.execute(q)).first()
    if not row:
        raise HTTPException(status_code=404, detail="Import record not found")

    log, first_name, last_name, username = row
    errors = []
    reconciliation = None

    if log.error_summary:
        try:
            errors = json.loads(log.error_summary)
        except Exception:
            errors = [{"raw": log.error_summary}]

    if log.reconciliation_data:
        try:
            reconciliation = json.loads(log.reconciliation_data)
        except Exception:
            pass

    user_display = f"{first_name or ''} {last_name or ''}".strip() or username or "System"

    return {
        "id": log.id,
        "entity_type": log.entity_type,
        "import_mode": log.import_mode,
        "source_type": log.source_type,
        "file_name": log.file_name,
        "total_rows": log.total_rows,
        "successful_rows": log.successful_rows,
        "failed_rows": log.failed_rows,
        "status": log.status,
        "created_at": log.created_at.isoformat() if log.created_at else None,
        "imported_by": user_display,
        "errors": errors,
        "reconciliation": reconciliation,
    }
