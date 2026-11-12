# /**
#  * @file        eduboard.py
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
#  * @created     2026-11-12
#  * @updated     2026-11-12
#  *
#  * @description FastAPI REST router exposing /api/v1/eduboard endpoints for interactive teaching boards, autosave/concurrency sync, PDF attachments & export, revisions, analytics, and read-only Student Portal access.
#  */

import os
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Response, UploadFile, status
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import enforce_institution_access, get_current_active_user, get_data_environment
from app.models.eduboard import EduBoard, EduBoardRevision
from app.models.user import User
from app.services.eduboard_service import EduBoardService, RevisionConflictError

router = APIRouter()


class EduBoardCreateSchema(BaseModel):
    title: str
    topic: Optional[str] = None
    academic_year_id: Optional[int] = None
    standard_id: Optional[int] = None
    division_id: Optional[int] = None
    subject_id: Optional[int] = None
    subject_mapping_id: Optional[int] = None
    teaching_session_id: Optional[int] = None
    timetable_entry_id: Optional[int] = None
    teacher_user_id: Optional[int] = None
    board_mode_default: str = "whiteboard"
    is_template: bool = False
    template_category: Optional[str] = None
    collaboration_enabled: bool = False
    from_template_id: Optional[int] = None


class EduBoardPageSyncSchema(BaseModel):
    page_uid: str
    page_order: int = 1
    title: str = "Page 1"
    mode: str = "whiteboard"
    background_style: str = "white"
    source_attachment_id: Optional[int] = None
    source_page_number: Optional[int] = None
    scene_json: Any = '{"schemaVersion":1,"elements":[]}'
    version: Optional[int] = None


class EduBoardSyncSchema(BaseModel):
    title: Optional[str] = None
    topic: Optional[str] = None
    board_mode_default: Optional[str] = None
    is_template: Optional[bool] = None
    template_category: Optional[str] = None
    collaboration_enabled: Optional[bool] = None
    expected_revision_no: Optional[int] = None
    force_overwrite: bool = False
    save_type: str = "manual"
    note: Optional[str] = None
    replace_pages: bool = True
    pages: Optional[List[EduBoardPageSyncSchema]] = None


class EduBoardSettingsSchema(BaseModel):
    max_file_size_mb: Optional[int] = None
    allowed_extensions: Optional[List[str]] = None
    autosave_interval_ms: Optional[int] = None
    default_board_mode: Optional[str] = None
    notify_students_on_publish: Optional[bool] = None


def _serialize_board_summary(b: EduBoard) -> Dict[str, Any]:
    return {
        "id": b.id,
        "board_code": b.board_code,
        "institution_id": b.institution_id,
        "is_demo": b.is_demo,
        "academic_year_id": b.academic_year_id,
        "academic_year_name": b.academic_year.name if b.academic_year else None,
        "teaching_session_id": b.teaching_session_id,
        "session_code": b.teaching_session.session_code if b.teaching_session else None,
        "session_date": b.teaching_session.session_date.isoformat() if b.teaching_session and b.teaching_session.session_date else None,
        "timetable_entry_id": b.timetable_entry_id,
        "teacher_user_id": b.teacher_user_id,
        "teacher_name": b.teacher.full_name if b.teacher else None,
        "standard_id": b.standard_id,
        "standard_name": b.standard.name if b.standard else None,
        "division_id": b.division_id,
        "division_name": b.division.name if b.division else None,
        "subject_id": b.subject_id,
        "subject_name": b.subject.name if b.subject else None,
        "subject_mapping_id": b.subject_mapping_id,
        "title": b.title,
        "topic": b.topic,
        "board_mode_default": b.board_mode_default,
        "status": b.status,
        "is_template": b.is_template,
        "template_category": b.template_category,
        "collaboration_enabled": b.collaboration_enabled,
        "published_at": b.published_at.isoformat() if b.published_at else None,
        "latest_revision_no": b.latest_revision_no,
        "page_count": b.page_count,
        "created_at": b.created_at.isoformat() if b.created_at else None,
        "updated_at": b.updated_at.isoformat() if b.updated_at else None,
    }


def _serialize_board_detail(b: EduBoard) -> Dict[str, Any]:
    out = _serialize_board_summary(b)
    out["pages"] = [
        {
            "id": p.id,
            "page_uid": p.page_uid,
            "page_order": p.page_order,
            "title": p.title,
            "mode": p.mode,
            "background_style": p.background_style,
            "source_attachment_id": p.source_attachment_id,
            "source_page_number": p.source_page_number,
            "scene_json": p.scene_json,
            "version": p.version,
            "updated_at": p.updated_at.isoformat() if p.updated_at else None,
        }
        for p in sorted(b.pages, key=lambda x: x.page_order)
    ]
    out["attachments"] = [
        {
            "id": a.id,
            "attachment_role": a.attachment_role,
            "original_filename": a.original_filename,
            "mime_type": a.mime_type,
            "extension": a.extension,
            "file_size_bytes": a.file_size_bytes,
            "page_count": a.page_count,
            "is_immutable": a.is_immutable,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        }
        for a in b.attachments
    ]
    return out


# =========================================================================
# WORKSPACE CONTEXT & SETTINGS
# =========================================================================

@router.get("/context")
async def get_eduboard_context(
    academic_year_id: Optional[int] = None,
    institution_id: int = Depends(enforce_institution_access),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await EduBoardService.require_permission_or_403(db, current_user, "view")
    return await EduBoardService.get_teacher_context(db, current_user, institution_id, academic_year_id=academic_year_id)


@router.get("/settings")
async def get_eduboard_settings(
    institution_id: int = Depends(enforce_institution_access),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await EduBoardService.require_permission_or_403(db, current_user, "view")
    return await EduBoardService.get_settings(db, institution_id)


@router.put("/settings")
async def update_eduboard_settings(
    payload: EduBoardSettingsSchema,
    institution_id: int = Depends(enforce_institution_access),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    role = (getattr(current_user, "role", "") or "").lower()
    if role not in {"superadmin", "sysadmin", "super_admin", "admin", "principal"}:
        raise HTTPException(status_code=403, detail="Only administrators may update EduBoard settings.")
    return await EduBoardService.update_settings(db, institution_id, current_user, payload.model_dump(exclude_none=True))


# =========================================================================
# TEACHER / STAFF BOARD ENDPOINTS
# =========================================================================

@router.get("/boards")
async def list_eduboards(
    academic_year_id: Optional[int] = None,
    division_id: Optional[int] = None,
    subject_id: Optional[int] = None,
    teaching_session_id: Optional[int] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    is_template: Optional[bool] = None,
    search: Optional[str] = None,
    institution_id: int = Depends(enforce_institution_access),
    data_env: str = Depends(get_data_environment),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    boards = await EduBoardService.list_boards(
        db,
        current_user,
        institution_id,
        data_env,
        academic_year_id=academic_year_id,
        division_id=division_id,
        subject_id=subject_id,
        teaching_session_id=teaching_session_id,
        status_filter=status_filter,
        is_template=is_template,
        search=search,
    )
    return {"items": [_serialize_board_summary(b) for b in boards], "total": len(boards)}


@router.post("/boards", status_code=status.HTTP_201_CREATED)
async def create_eduboard(
    payload: EduBoardCreateSchema,
    institution_id: int = Depends(enforce_institution_access),
    data_env: str = Depends(get_data_environment),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    board = await EduBoardService.create_board(db, current_user, institution_id, data_env, payload.model_dump())
    return _serialize_board_detail(board)


@router.get("/boards/{board_id}")
async def get_eduboard_detail(
    board_id: int,
    institution_id: int = Depends(enforce_institution_access),
    data_env: str = Depends(get_data_environment),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    is_demo = data_env == "TRAINING"
    board = await EduBoardService.get_board_or_404(db, board_id, institution_id, is_demo=is_demo)
    role = (getattr(current_user, "role", "") or "").lower()
    if role == "student":
        board = await EduBoardService.get_student_board_detail(db, current_user, institution_id, data_env, board_id)
    else:
        await EduBoardService.require_permission_or_403(db, current_user, "view", board=board)
    return _serialize_board_detail(board)


@router.put("/boards/{board_id}/sync")
async def sync_eduboard(
    board_id: int,
    payload: EduBoardSyncSchema,
    institution_id: int = Depends(enforce_institution_access),
    data_env: str = Depends(get_data_environment),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        board = await EduBoardService.sync_board(
            db, current_user, institution_id, data_env, board_id, payload.model_dump(exclude_unset=True)
        )
        return _serialize_board_detail(board)
    except RevisionConflictError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "REVISION_CONFLICT",
                "message": str(exc),
                "latest_revision_no": exc.latest_revision_no,
                "server_page_versions": exc.server_page_versions,
            },
        )


@router.post("/boards/{board_id}/publish")
async def publish_eduboard(
    board_id: int,
    institution_id: int = Depends(enforce_institution_access),
    data_env: str = Depends(get_data_environment),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    res = await EduBoardService.publish_board(db, current_user, institution_id, data_env, board_id)
    return {"board": _serialize_board_detail(res["board"]), "notified_students": res["notified_students"]}


@router.post("/boards/{board_id}/status")
async def update_eduboard_status(
    board_id: int,
    new_status: str = Query(...),
    institution_id: int = Depends(enforce_institution_access),
    data_env: str = Depends(get_data_environment),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    board = await EduBoardService.change_status(db, current_user, institution_id, data_env, board_id, new_status)
    return _serialize_board_summary(board)


@router.delete("/boards/{board_id}")
async def delete_eduboard(
    board_id: int,
    institution_id: int = Depends(enforce_institution_access),
    data_env: str = Depends(get_data_environment),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await EduBoardService.soft_delete_board(db, current_user, institution_id, data_env, board_id)
    return {"success": True, "deleted_id": board_id}


@router.get("/boards/{board_id}/revisions")
async def list_eduboard_revisions(
    board_id: int,
    institution_id: int = Depends(enforce_institution_access),
    data_env: str = Depends(get_data_environment),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    is_demo = data_env == "TRAINING"
    board = await EduBoardService.get_board_or_404(db, board_id, institution_id, is_demo=is_demo)
    await EduBoardService.require_permission_or_403(db, current_user, "view", board=board)
    revs = (
        await db.execute(
            select(EduBoardRevision)
            .where(EduBoardRevision.board_id == board.id)
            .order_by(desc(EduBoardRevision.revision_no))
            .limit(50)
        )
    ).scalars().all()
    return {
        "board_id": board.id,
        "latest_revision_no": board.latest_revision_no,
        "items": [
            {
                "id": r.id,
                "revision_no": r.revision_no,
                "save_type": r.save_type,
                "note": r.note,
                "created_by_id": r.created_by_id,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in revs
        ],
    }


@router.post("/boards/{board_id}/revisions/{revision_id}/restore")
async def restore_eduboard_revision(
    board_id: int,
    revision_id: int,
    institution_id: int = Depends(enforce_institution_access),
    data_env: str = Depends(get_data_environment),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    board = await EduBoardService.restore_revision(db, current_user, institution_id, data_env, board_id, revision_id)
    return _serialize_board_detail(board)


# =========================================================================
# ATTACHMENTS & PDF RENDERING / EXPORT
# =========================================================================

@router.post("/boards/{board_id}/attachments", status_code=status.HTTP_201_CREATED)
async def upload_eduboard_attachment(
    board_id: int,
    file: UploadFile = File(...),
    attachment_role: str = Form("source_document"),
    create_slides: bool = Form(True),
    institution_id: int = Depends(enforce_institution_access),
    data_env: str = Depends(get_data_environment),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    res = await EduBoardService.upload_attachment(
        db,
        current_user,
        institution_id,
        data_env,
        board_id,
        file,
        attachment_role=attachment_role,
        create_slides=create_slides,
    )
    att = res["attachment"]
    return {
        "id": att.id,
        "attachment_role": att.attachment_role,
        "original_filename": att.original_filename,
        "mime_type": att.mime_type,
        "extension": att.extension,
        "file_size_bytes": att.file_size_bytes,
        "page_count": att.page_count,
        "sha256_checksum": att.sha256_checksum,
        "created_pages_count": res["created_pages_count"],
    }


@router.get("/attachments/{attachment_id}/download")
async def download_eduboard_attachment(
    attachment_id: int,
    institution_id: int = Depends(enforce_institution_access),
    data_env: str = Depends(get_data_environment),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    att = await EduBoardService.get_attachment_for_access(db, current_user, institution_id, data_env, attachment_id)
    if not os.path.isfile(att.storage_path):
        raise HTTPException(status_code=404, detail="Stored file not found.")
    return FileResponse(path=att.storage_path, media_type=att.mime_type, filename=att.original_filename)


@router.get("/attachments/{attachment_id}/pages/{page_number}/render")
async def render_eduboard_pdf_page(
    attachment_id: int,
    page_number: int,
    institution_id: int = Depends(enforce_institution_access),
    data_env: str = Depends(get_data_environment),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    att = await EduBoardService.get_attachment_for_access(db, current_user, institution_id, data_env, attachment_id)
    png_bytes = EduBoardService.render_pdf_page_png_bytes(att, page_number)
    return Response(content=png_bytes, media_type="image/png", headers={"Cache-Control": "private, max-age=3600"})


@router.get("/boards/{board_id}/export-pdf")
@router.post("/boards/{board_id}/export-pdf")
async def export_eduboard_pdf(
    board_id: int,
    institution_id: int = Depends(enforce_institution_access),
    data_env: str = Depends(get_data_environment),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    pdf_bytes, filename = await EduBoardService.export_board_pdf(db, current_user, institution_id, data_env, board_id)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# =========================================================================
# STUDENT PORTAL READ-ONLY & REPORTS
# =========================================================================

@router.get("/student/boards")
async def list_student_published_eduboards(
    student_id: Optional[int] = None,
    institution_id: int = Depends(enforce_institution_access),
    data_env: str = Depends(get_data_environment),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await EduBoardService.require_permission_or_403(db, current_user, "view")
    boards = await EduBoardService.get_student_published_boards(
        db, current_user, institution_id, data_env, requested_student_id=student_id
    )
    return {"items": [_serialize_board_summary(b) for b in boards], "total": len(boards)}


@router.get("/student/boards/{board_id}")
async def get_student_published_eduboard_detail(
    board_id: int,
    student_id: Optional[int] = None,
    institution_id: int = Depends(enforce_institution_access),
    data_env: str = Depends(get_data_environment),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await EduBoardService.require_permission_or_403(db, current_user, "view")
    board = await EduBoardService.get_student_board_detail(
        db, current_user, institution_id, data_env, board_id, requested_student_id=student_id
    )
    out = _serialize_board_detail(board)
    out["read_only"] = True
    return out


@router.get("/reports/summary")
async def get_eduboard_reports_summary(
    academic_year_id: Optional[int] = None,
    institution_id: int = Depends(enforce_institution_access),
    data_env: str = Depends(get_data_environment),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    role = (getattr(current_user, "role", "") or "").lower()
    if role == "student":
        raise HTTPException(status_code=403, detail="Students cannot access institute EduBoard analytics.")
    await EduBoardService.require_permission_or_403(db, current_user, "view")
    return await EduBoardService.get_reports_summary(db, institution_id, data_env, academic_year_id=academic_year_id)
