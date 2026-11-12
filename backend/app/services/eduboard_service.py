# /**
#  * @file        eduboard_service.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      backend.app.services
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
#  * @description Domain service for PrathamOne EduBoard: RBAC & scope enforcement, PRODUCTION/TRAINING isolation, page & revision concurrency, attachment storage, PyMuPDF rendering/PDF export, notifications, and analytics.
#  */

import hashlib
import io
import json
import os
import re
import tempfile
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

import fitz  # PyMuPDF 1.24.5
import jwt
from fastapi import HTTPException, UploadFile, status
from jwt.exceptions import InvalidTokenError as JWTError
from sqlalchemy import and_, desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.deps import get_user_permissions, is_sysadmin
from app.models.academic_year import AcademicYear
from app.models.communication import CommunicationLog
from app.models.division import Division
from app.models.institution import Institution
from app.models.eduboard import (
    EduBoard,
    EduBoardAttachment,
    EduBoardPage,
    EduBoardRevision,
)
from app.models.enrollment import StudentEnrollment
from app.models.portal import TimetableEntry
from app.models.settings import InstitutionSetting
from app.models.staff import TeacherAssignment
from app.models.standard import Standard
from app.models.student import Student
from app.models.subject import CanonicalSubject, Subject, SubjectMapping
from app.models.teacher_payroll import TeachingSession
from app.models.user import AuditLog, User
from app.services.homework_service import HomeworkService, _get_writable_upload_root

EDUBOARD_ALLOWED_EXTENSIONS: Set[str] = {"pdf", "png", "jpg", "jpeg", "webp"}
EDUBOARD_MIME_PREFIXES: Tuple[str, ...] = (
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/webp",
    "application/octet-stream",
)
EDUBOARD_BOARD_MODES: Set[str] = {"classic", "whiteboard", "presentation"}
EDUBOARD_PAGE_BACKGROUNDS: Set[str] = {
    "blackboard",
    "greenboard",
    "white",
    "grid",
    "notebook",
    "pdf_slide",
}
EDUBOARD_BOARD_STATUSES: Set[str] = {"draft", "active", "published", "closed", "archived"}
EDUBOARD_WORKSPACE_MODES: Set[str] = {"standard", "focus", "fullscreen"}
EDUBOARD_TOOLBAR_STATES: Set[str] = {"expanded", "compact", "hidden"}
EDUBOARD_TOOLBAR_POSITIONS: Set[str] = {"top", "left", "right", "bottom", "floating"}
EDUBOARD_POPOUT_MODES: Set[str] = {"teacher_edit", "presentation", "collaborator"}

SYSTEM_DEFAULT_DISPLAY_PREFS: Dict[str, Any] = {
    "default_workspace_mode": "standard",
    "default_board_appearance": "white",
    "toolbar_state": "expanded",
    "toolbar_position": "top",
    "pages_panel_open": True,
    "saved_boards_panel_open": True,
    "hide_app_header": False,
    "hide_status_bar": False,
}

MAX_SCENE_JSON_BYTES = 5 * 1024 * 1024  # 5 MB per page safety cap
MAX_AUTOSAVE_REVISIONS = 25
LOGICAL_CANVAS_W = 1280.0
LOGICAL_CANVAS_H = 720.0

ADMIN_ROLES: Set[str] = {"admin", "principal", "coordinator"}
ROLE_DEFAULT_EB_ACTIONS: Dict[str, Set[str]] = {
    "admin": {"view", "create", "edit", "delete", "publish", "download", "manage_templates", "collaborate"},
    "principal": {"view", "create", "edit", "delete", "publish", "download", "manage_templates", "collaborate"},
    "coordinator": {"view", "create", "edit", "publish", "download", "manage_templates", "collaborate"},
    "teacher": {"view", "create", "edit", "publish", "download", "manage_templates", "collaborate"},
    "staff": {"view", "download"},
    "student": {"view", "download"},
}


class RevisionConflictError(Exception):
    """Raised when incoming sync/save fails optimistic concurrency check."""

    def __init__(self, message: str, latest_revision_no: int, server_page_versions: Dict[str, int]):
        super().__init__(message)
        self.latest_revision_no = latest_revision_no
        self.server_page_versions = server_page_versions


def _resolve_eduboard_upload_root() -> Path:
    """Reuses the writable Docker upload volume root under /app/uploads/eduboard."""
    base = _get_writable_upload_root().parent / "eduboard"
    try:
        base.mkdir(parents=True, exist_ok=True)
        if os.access(base, os.W_OK):
            return base
    except OSError:
        pass
    fallback = Path(tempfile.gettempdir()) / "prathamone_uploads" / "eduboard"
    fallback.mkdir(parents=True, exist_ok=True)
    return fallback


def _hex_to_rgb01(color: Optional[str], fallback: Tuple[float, float, float] = (0.07, 0.09, 0.15)) -> Tuple[float, float, float]:
    if not color or not isinstance(color, str):
        return fallback
    s = color.strip().lstrip("#")
    if len(s) == 3:
        s = "".join(c * 2 for c in s)
    if len(s) != 6:
        return fallback
    try:
        return (int(s[0:2], 16) / 255.0, int(s[2:4], 16) / 255.0, int(s[4:6], 16) / 255.0)
    except ValueError:
        return fallback


class EduBoardService:
    # =========================================================================
    # PERMISSIONS, SETTINGS & ACADEMIC CONTEXT
    # =========================================================================

    @staticmethod
    async def check_permission(
        db: AsyncSession,
        user: User,
        action: str,
        board: Optional[EduBoard] = None,
    ) -> bool:
        if not user:
            return False
        if is_sysadmin(user):
            return True

        role = (getattr(user, "role", "") or "").strip().lower()
        if role not in ROLE_DEFAULT_EB_ACTIONS:
            return False

        perms = await get_user_permissions(db, user)
        if ("*", "*") in perms or ("eduboard", "*") in perms:
            permitted = True
        else:
            eb_perms = {act for res, act in perms if res == "eduboard"}
            if eb_perms:
                permitted = action in eb_perms
            else:
                permitted = action in ROLE_DEFAULT_EB_ACTIONS.get(role, set())

        if not permitted:
            return False

        # Teacher ownership constraints on mutations
        if board is not None and role == "teacher" and action in {"edit", "publish", "delete"}:
            if board.teacher_user_id != user.id:
                return False
            if action == "delete" and board.status == "published":
                return False

        return True

    @staticmethod
    async def require_permission_or_403(
        db: AsyncSession,
        user: User,
        action: str,
        board: Optional[EduBoard] = None,
    ) -> None:
        if not await EduBoardService.check_permission(db, user, action, board=board):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: requires 'eduboard:{action}'.",
            )

    @staticmethod
    async def get_settings(db: AsyncSession, institution_id: int) -> Dict[str, Any]:
        row = (
            await db.execute(
                select(InstitutionSetting).where(
                    InstitutionSetting.institution_id == institution_id,
                    InstitutionSetting.category == "eduboard",
                    InstitutionSetting.key == "workspace_config",
                )
            )
        ).scalar_one_or_none()
        defaults: Dict[str, Any] = {
            "max_file_size_mb": 25,
            "allowed_extensions": sorted(EDUBOARD_ALLOWED_EXTENSIONS),
            "autosave_interval_ms": 3500,
            "pptx_conversion_enabled": False,
            "default_board_mode": "whiteboard",
            "notify_students_on_publish": True,
            **SYSTEM_DEFAULT_DISPLAY_PREFS,
            "allow_user_display_overrides": True,
            "allow_collaborator_mode": True,
            "allow_popout_window": True,
        }
        if row and row.value:
            try:
                parsed = json.loads(row.value)
                defaults.update(parsed)
            except json.JSONDecodeError:
                pass
        return defaults

    @staticmethod
    async def update_settings(
        db: AsyncSession,
        institution_id: int,
        actor: User,
        payload: Dict[str, Any],
    ) -> Dict[str, Any]:
        curr = await EduBoardService.get_settings(db, institution_id)
        allowed_keys = (
            "max_file_size_mb",
            "allowed_extensions",
            "autosave_interval_ms",
            "default_board_mode",
            "notify_students_on_publish",
            "default_workspace_mode",
            "default_board_appearance",
            "toolbar_state",
            "toolbar_position",
            "pages_panel_open",
            "saved_boards_panel_open",
            "hide_app_header",
            "hide_status_bar",
            "allow_user_display_overrides",
            "allow_collaborator_mode",
            "allow_popout_window",
        )
        for k in allowed_keys:
            if k in payload and payload[k] is not None:
                val = payload[k]
                if k == "default_workspace_mode" and val not in EDUBOARD_WORKSPACE_MODES:
                    continue
                if k == "default_board_appearance" and val not in EDUBOARD_PAGE_BACKGROUNDS:
                    continue
                if k == "toolbar_state" and val not in EDUBOARD_TOOLBAR_STATES:
                    continue
                if k == "toolbar_position" and val not in EDUBOARD_TOOLBAR_POSITIONS:
                    continue
                curr[k] = val
        # Force PPTX flag off cleanly unless backend has converter
        curr["pptx_conversion_enabled"] = False
        row = (
            await db.execute(
                select(InstitutionSetting).where(
                    InstitutionSetting.institution_id == institution_id,
                    InstitutionSetting.category == "eduboard",
                    InstitutionSetting.key == "workspace_config",
                )
            )
        ).scalar_one_or_none()
        if row:
            row.value = json.dumps(curr)
            row.updated_by_id = actor.id
        else:
            db.add(
                InstitutionSetting(
                    institution_id=institution_id,
                    category="eduboard",
                    key="workspace_config",
                    value=json.dumps(curr),
                    data_type="json",
                    description="PrathamOne EduBoard workspace & upload settings",
                    updated_by_id=actor.id,
                )
            )
        await EduBoardService.write_audit_log(
            db,
            user_id=actor.id,
            institution_id=institution_id,
            action="EDUBOARD_SETTINGS_UPDATED",
            resource_id=None,
            details=json.dumps(curr),
        )
        await db.commit()
        return curr

    @staticmethod
    async def write_audit_log(
        db: AsyncSession,
        user_id: Optional[int],
        institution_id: Optional[int],
        action: str,
        resource_id: Optional[int],
        details: Optional[str] = None,
        old_data: Optional[str] = None,
        new_data: Optional[str] = None,
        ip_address: Optional[str] = None,
    ) -> None:
        db.add(
            AuditLog(
                user_id=user_id,
                institution_id=institution_id,
                action=action,
                resource_type="eduboard",
                resource_id=resource_id,
                old_data=old_data,
                new_data=new_data,
                details=details,
                ip_address=ip_address,
            )
        )

    @staticmethod
    async def validate_scope(
        db: AsyncSession,
        user: User,
        institution_id: int,
        standard_id: Optional[int] = None,
        division_id: Optional[int] = None,
        subject_id: Optional[int] = None,
        teaching_session_id: Optional[int] = None,
    ) -> Optional[TeachingSession]:
        """Reuses HomeworkService.validate_teacher_scope and verifies TeachingSession ownership."""
        session_obj: Optional[TeachingSession] = None
        if teaching_session_id:
            session_obj = (
                await db.execute(
                    select(TeachingSession).where(
                        TeachingSession.id == teaching_session_id,
                        TeachingSession.institution_id == institution_id,
                    )
                )
            ).scalar_one_or_none()
            if not session_obj:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="TeachingSession not found in this institution.",
                )
            role = (getattr(user, "role", "") or "").strip().lower()
            if role == "teacher" and session_obj.teacher_user_id != user.id and session_obj.substitute_teacher_id != user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access forbidden: TeachingSession belongs to another instructor.",
                )
            division_id = division_id or session_obj.division_id
            subject_id = subject_id or session_obj.subject_id

        try:
            await HomeworkService.validate_teacher_scope(
                db=db,
                user=user,
                institution_id=institution_id,
                standard_id=standard_id,
                division_id=division_id,
                subject_id=subject_id,
            )
        except PermissionError as exc:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))
        return session_obj

    @staticmethod
    async def get_teacher_context(
        db: AsyncSession,
        user: User,
        institution_id: int,
        academic_year_id: Optional[int] = None,
        data_env: str = "PRODUCTION",
    ) -> Dict[str, Any]:
        """Returns authorized academic years, standards, divisions, subjects, and recent TeachingSessions."""
        ay_rows = (
            await db.execute(
                select(AcademicYear)
                .where(AcademicYear.institution_id == institution_id)
                .order_by(AcademicYear.is_current.desc(), AcademicYear.id.desc())
            )
        ).scalars().all()
        target_ay = academic_year_id or next((a.id for a in ay_rows if a.is_current), ay_rows[0].id if ay_rows else None)

        std_rows = (
            await db.execute(
                select(Standard).where(Standard.institution_id == institution_id).order_by(Standard.level, Standard.id)
            )
        ).scalars().all()
        std_ids = [s.id for s in std_rows]

        div_query = select(Division).order_by(Division.name)
        if std_ids:
            div_query = div_query.where(Division.standard_id.in_(std_ids))
        else:
            div_query = div_query.where(Division.id == -1)
        div_rows = (await db.execute(div_query)).scalars().all()

        sub_query = select(Subject).order_by(Subject.name)
        if std_ids:
            sub_query = sub_query.where(Subject.standard_id.in_(std_ids))
        else:
            sub_query = sub_query.where(Subject.id == -1)
        sub_rows = (await db.execute(sub_query)).scalars().all()

        # Filter Teacher scope cleanly when role == 'teacher'
        role = (getattr(user, "role", "") or "").strip().lower()
        sessions_query = (
            select(TeachingSession)
            .where(TeachingSession.institution_id == institution_id)
            .order_by(TeachingSession.session_date.desc(), TeachingSession.id.desc())
            .limit(40)
        )
        if target_ay:
            sessions_query = sessions_query.where(TeachingSession.academic_year_id == target_ay)
        if role == "teacher":
            sessions_query = sessions_query.where(
                or_(
                    TeachingSession.teacher_user_id == user.id,
                    TeachingSession.substitute_teacher_id == user.id,
                )
            )
        ts_rows = (await db.execute(sessions_query)).scalars().all()

        # Look up boards linked to sessions
        session_ids = [s.id for s in ts_rows]
        session_board_map: Dict[int, int] = {}
        if session_ids:
            eb_rows = (
                await db.execute(
                    select(EduBoard.teaching_session_id, EduBoard.id).where(
                        EduBoard.teaching_session_id.in_(session_ids),
                        EduBoard.is_deleted == False,
                    )
                )
            ).all()
            for sid, bid in eb_rows:
                if sid:
                    session_board_map[sid] = bid

        div_map = {d.id: d for d in div_rows}
        sub_map = {s.id: s for s in sub_rows}
        std_map = {s.id: s for s in std_rows}

        is_demo = (data_env or "PRODUCTION").upper() == "TRAINING"
        tpl_rows = (
            await db.execute(
                select(EduBoard)
                .where(
                    EduBoard.institution_id == institution_id,
                    EduBoard.is_demo == is_demo,
                    EduBoard.is_template == True,
                    EduBoard.is_deleted == False,
                )
                .order_by(EduBoard.updated_at.desc(), EduBoard.id.desc())
                .limit(50)
            )
        ).scalars().all()

        return {
            "academic_years": [{"id": a.id, "name": a.name, "is_current": a.is_current} for a in ay_rows],
            "standards": [{"id": s.id, "name": s.name, "level": s.level} for s in std_rows],
            "divisions": [
                {
                    "id": d.id,
                    "name": d.name,
                    "standard_id": d.standard_id,
                    "standard_name": std_map[d.standard_id].name if d.standard_id in std_map else "",
                }
                for d in div_rows
            ],
            "subjects": [{"id": s.id, "name": s.name, "code": s.code, "standard_id": s.standard_id} for s in sub_rows],
            "teaching_sessions": [
                {
                    "id": ts.id,
                    "session_code": ts.session_code,
                    "session_date": ts.session_date.isoformat(),
                    "scheduled_start_time": ts.scheduled_start_time,
                    "scheduled_end_time": ts.scheduled_end_time,
                    "division_id": ts.division_id,
                    "division_name": div_map[ts.division_id].name if ts.division_id in div_map else "",
                    "standard_id": div_map[ts.division_id].standard_id if ts.division_id in div_map else None,
                    "subject_id": ts.subject_id,
                    "subject_name": sub_map[ts.subject_id].name if ts.subject_id in sub_map else "",
                    "teacher_user_id": ts.teacher_user_id,
                    "topic_taught": ts.topic_taught,
                    "linked_board_id": session_board_map.get(ts.id),
                }
                for ts in ts_rows
            ],
            "templates": [
                {
                    "id": tpl.id,
                    "title": tpl.title,
                    "topic": tpl.topic,
                    "template_category": tpl.template_category,
                    "board_mode_default": tpl.board_mode_default,
                    "page_count": tpl.page_count,
                }
                for tpl in tpl_rows
            ],
        }

    # =========================================================================
    # BOARD LIFECYCLE & OPTIMISTIC CONCURRENCY SYNC
    # =========================================================================

    @staticmethod
    async def create_board(
        db: AsyncSession,
        user: User,
        institution_id: int,
        data_env: str,
        payload: Dict[str, Any],
    ) -> EduBoard:
        await EduBoardService.require_permission_or_403(db, user, "create")

        ts_id = payload.get("teaching_session_id")
        session_obj = await EduBoardService.validate_scope(
            db,
            user,
            institution_id,
            standard_id=payload.get("standard_id"),
            division_id=payload.get("division_id"),
            subject_id=payload.get("subject_id"),
            teaching_session_id=ts_id,
        )

        ay_id = payload.get("academic_year_id") or (session_obj.academic_year_id if session_obj else None)
        if not ay_id:
            ay_row = (
                await db.execute(
                    select(AcademicYear)
                    .where(AcademicYear.institution_id == institution_id)
                    .order_by(AcademicYear.is_current.desc(), AcademicYear.id.desc())
                    .limit(1)
                )
            ).scalar_one_or_none()
            if not ay_row:
                raise HTTPException(status_code=400, detail="No Academic Year found for institution.")
            ay_id = ay_row.id

        division_id = payload.get("division_id") or (session_obj.division_id if session_obj else None)
        subject_id = payload.get("subject_id") or (session_obj.subject_id if session_obj else None)
        standard_id = payload.get("standard_id")
        if division_id and not standard_id:
            div = (await db.execute(select(Division).where(Division.id == division_id))).scalar_one_or_none()
            if div:
                standard_id = div.standard_id
        if not standard_id or not subject_id:
            raise HTTPException(status_code=400, detail="standard_id and subject_id are required to create an EduBoard.")

        # Validate division belongs to standard in same institution
        if division_id:
            div_check = (
                await db.execute(
                    select(Division)
                    .join(Standard, Standard.id == Division.standard_id)
                    .where(Division.id == division_id, Standard.institution_id == institution_id)
                )
            ).scalar_one_or_none()
            if not div_check:
                raise HTTPException(status_code=404, detail="Selected batch/division not found in this institution.")

        # Validate subject mapping if supplied or resolve automatically
        subject_mapping_id = payload.get("subject_mapping_id") or (session_obj.subject_mapping_id if session_obj else None)
        mode_default = (payload.get("board_mode_default") or "whiteboard").lower()
        if mode_default not in EDUBOARD_BOARD_MODES:
            mode_default = "whiteboard"

        bg_default = "blackboard" if mode_default == "classic" else "white"
        is_demo = data_env == "TRAINING"

        # If template cloning requested
        initial_pages_payload: Optional[List[Dict[str, Any]]] = None
        template_id = payload.get("from_template_id")
        if template_id:
            tpl = (
                await db.execute(
                    select(EduBoard)
                    .options(selectinload(EduBoard.pages))
                    .where(
                        EduBoard.id == template_id,
                        EduBoard.institution_id == institution_id,
                        EduBoard.is_demo == is_demo,
                        EduBoard.is_deleted == False,
                    )
                )
            ).scalar_one_or_none()
            if tpl and tpl.pages:
                initial_pages_payload = [
                    {
                        "page_uid": uuid.uuid4().hex[:12],
                        "page_order": p.page_order,
                        "title": p.title,
                        "mode": p.mode,
                        "background_style": p.background_style,
                        "scene_json": p.scene_json,
                    }
                    for p in tpl.pages
                ]

        board_code = f"EB-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
        teacher_uid = payload.get("teacher_user_id") or (session_obj.teacher_user_id if session_obj else user.id)
        if (getattr(user, "role", "") or "").lower() == "teacher":
            teacher_uid = user.id

        board = EduBoard(
            board_code=board_code,
            institution_id=institution_id,
            is_demo=is_demo,
            academic_year_id=ay_id,
            teaching_session_id=ts_id,
            timetable_entry_id=payload.get("timetable_entry_id") or (session_obj.timetable_entry_id if session_obj else None),
            teacher_user_id=teacher_uid,
            standard_id=standard_id,
            division_id=division_id,
            subject_id=subject_id,
            subject_mapping_id=subject_mapping_id,
            title=(payload.get("title") or (session_obj.topic_taught if session_obj and session_obj.topic_taught else "Classroom Lecture Board")).strip()[:255],
            topic=(payload.get("topic") or (session_obj.topic_taught if session_obj else None)),
            board_mode_default=mode_default,
            status="draft",
            is_template=bool(payload.get("is_template", False)),
            template_category=payload.get("template_category"),
            collaboration_enabled=bool(payload.get("collaboration_enabled", False)),
            latest_revision_no=1,
            page_count=len(initial_pages_payload) if initial_pages_payload else 1,
        )
        db.add(board)
        await db.flush()

        pages_to_add = initial_pages_payload or [
            {
                "page_uid": uuid.uuid4().hex[:12],
                "page_order": 1,
                "title": "Page 1",
                "mode": mode_default,
                "background_style": bg_default,
                "scene_json": json.dumps({"schemaVersion": 1, "elements": []}),
            }
        ]
        snapshot_pages = []
        for idx, pd in enumerate(pages_to_add, start=1):
            pg = EduBoardPage(
                board_id=board.id,
                page_uid=pd["page_uid"],
                page_order=idx,
                title=pd["title"],
                mode=pd["mode"],
                background_style=pd["background_style"],
                scene_json=pd["scene_json"],
                version=1,
            )
            db.add(pg)
            snapshot_pages.append(
                {
                    "page_uid": pg.page_uid,
                    "page_order": pg.page_order,
                    "title": pg.title,
                    "mode": pg.mode,
                    "background_style": pg.background_style,
                    "scene_json": pg.scene_json,
                }
            )

        db.add(
            EduBoardRevision(
                board_id=board.id,
                revision_no=1,
                save_type="manual",
                created_by_id=user.id,
                snapshot_json=json.dumps({"title": board.title, "topic": board.topic, "pages": snapshot_pages}),
                note="Initial EduBoard created",
            )
        )
        await EduBoardService.write_audit_log(
            db,
            user_id=user.id,
            institution_id=institution_id,
            action="EDUBOARD_CREATED",
            resource_id=board.id,
            details=json.dumps({"board_code": board.board_code, "teaching_session_id": ts_id, "mode": mode_default}),
        )
        await db.commit()
        return await EduBoardService.get_board_or_404(db, board.id, institution_id, is_demo=is_demo)

    @staticmethod
    async def get_board_or_404(
        db: AsyncSession,
        board_id: int,
        institution_id: int,
        is_demo: Optional[bool] = None,
    ) -> EduBoard:
        stmt = (
            select(EduBoard)
            .options(
                selectinload(EduBoard.pages),
                selectinload(EduBoard.attachments),
                selectinload(EduBoard.teacher),
                selectinload(EduBoard.standard),
                selectinload(EduBoard.division),
                selectinload(EduBoard.subject),
                selectinload(EduBoard.academic_year),
                selectinload(EduBoard.teaching_session),
            )
            .where(
                EduBoard.id == board_id,
                EduBoard.institution_id == institution_id,
                EduBoard.is_deleted == False,
            )
        )
        if is_demo is not None:
            stmt = stmt.where(EduBoard.is_demo == is_demo)
        stmt = stmt.execution_options(populate_existing=True)
        board = (await db.execute(stmt)).scalar_one_or_none()
        if not board:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="EduBoard not found.")
        return board

    @staticmethod
    async def list_boards(
        db: AsyncSession,
        user: User,
        institution_id: int,
        data_env: str,
        *,
        academic_year_id: Optional[int] = None,
        division_id: Optional[int] = None,
        subject_id: Optional[int] = None,
        teaching_session_id: Optional[int] = None,
        status_filter: Optional[str] = None,
        is_template: Optional[bool] = None,
        search: Optional[str] = None,
    ) -> List[EduBoard]:
        await EduBoardService.require_permission_or_403(db, user, "view")
        is_demo = data_env == "TRAINING"

        stmt = (
            select(EduBoard)
            .options(
                selectinload(EduBoard.teacher),
                selectinload(EduBoard.standard),
                selectinload(EduBoard.division),
                selectinload(EduBoard.subject),
                selectinload(EduBoard.academic_year),
                selectinload(EduBoard.teaching_session),
            )
            .where(
                EduBoard.institution_id == institution_id,
                EduBoard.is_demo == is_demo,
                EduBoard.is_deleted == False,
            )
            .order_by(EduBoard.updated_at.desc(), EduBoard.id.desc())
        )
        role = (getattr(user, "role", "") or "").strip().lower()
        if role == "teacher" and not is_sysadmin(user):
            # Teachers see their own boards plus institution templates
            stmt = stmt.where(or_(EduBoard.teacher_user_id == user.id, EduBoard.is_template == True))

        if academic_year_id:
            stmt = stmt.where(EduBoard.academic_year_id == academic_year_id)
        if division_id:
            stmt = stmt.where(EduBoard.division_id == division_id)
        if subject_id:
            stmt = stmt.where(EduBoard.subject_id == subject_id)
        if teaching_session_id:
            stmt = stmt.where(EduBoard.teaching_session_id == teaching_session_id)
        if status_filter:
            stmt = stmt.where(EduBoard.status == status_filter)
        if is_template is not None:
            stmt = stmt.where(EduBoard.is_template == is_template)
        if search:
            pat = f"%{search.strip()}%"
            stmt = stmt.where(or_(EduBoard.title.ilike(pat), EduBoard.topic.ilike(pat), EduBoard.board_code.ilike(pat)))

        return list((await db.execute(stmt)).scalars().all())

    @staticmethod
    async def sync_board(
        db: AsyncSession,
        user: User,
        institution_id: int,
        data_env: str,
        board_id: int,
        payload: Dict[str, Any],
    ) -> EduBoard:
        """
        Handles debounced autosave and manual snapshot sync with strict optimistic concurrency
        using both board.latest_revision_no and per-page version numbers.
        """
        is_demo = data_env == "TRAINING"
        board = await EduBoardService.get_board_or_404(db, board_id, institution_id, is_demo=is_demo)

        popout_token = payload.get("popout_token")
        if popout_token:
            claims = EduBoardService.decode_scoped_token(str(popout_token), "eduboard_popout")
            if (
                str(claims.get("sub")) != str(user.id)
                or int(claims.get("inst", -1)) != int(institution_id)
                or claims.get("env") != data_env
                or int(claims.get("board_id", -1)) != int(board_id)
            ):
                raise HTTPException(status_code=403, detail="Detached pop-out token scope mismatch.")
            p_mode = str(claims.get("mode") or "presentation")
            if p_mode == "presentation":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Presentation mode is strictly read-only and cannot mutate board state.",
                )
            elif p_mode == "collaborator":
                inst_settings = await EduBoardService.get_settings(db, institution_id)
                if not bool(inst_settings.get("allow_collaborator_mode", True)):
                    raise HTTPException(status_code=403, detail="Collaborator mode is disabled by policy.")
                await EduBoardService.require_permission_or_403(db, user, "collaborate", board=board)
                role = (getattr(user, "role", "") or "").lower()
                is_owner_or_admin = is_sysadmin(user) or role in ADMIN_ROLES or board.teacher_user_id == user.id
                if not board.collaboration_enabled and not is_owner_or_admin:
                    raise HTTPException(status_code=403, detail="Collaboration is currently disabled on this board.")
            else:
                await EduBoardService.require_permission_or_403(db, user, "edit", board=board)
        else:
            await EduBoardService.require_permission_or_403(db, user, "edit", board=board)

        if board.status == "closed":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This EduBoard is closed. Reopen or create a new lecture board to edit.",
            )

        expected_rev = payload.get("expected_revision_no")
        force_overwrite = bool(payload.get("force_overwrite", False))
        existing_pages_by_uid: Dict[str, EduBoardPage] = {p.page_uid: p for p in board.pages}
        server_page_versions = {uid: p.version for uid, p in existing_pages_by_uid.items()}

        if not force_overwrite and expected_rev is not None and int(expected_rev) != board.latest_revision_no:
            raise RevisionConflictError(
                f"Board was updated remotely (server revision {board.latest_revision_no}, client expected {expected_rev}).",
                latest_revision_no=board.latest_revision_no,
                server_page_versions=server_page_versions,
            )

        if payload.get("title"):
            board.title = str(payload["title"]).strip()[:255]
        if "topic" in payload:
            board.topic = (str(payload["topic"]).strip()[:255] if payload["topic"] else None)
        if payload.get("board_mode_default") in EDUBOARD_BOARD_MODES:
            board.board_mode_default = payload["board_mode_default"]
        if "collaboration_enabled" in payload and payload["collaboration_enabled"] is not None:
            if await EduBoardService.check_permission(db, user, "collaborate", board=board):
                board.collaboration_enabled = bool(payload["collaboration_enabled"])
        if "is_template" in payload and payload["is_template"] is not None:
            if await EduBoardService.check_permission(db, user, "manage_templates", board=board):
                board.is_template = bool(payload["is_template"])
                board.template_category = payload.get("template_category")

        if board.status == "draft":
            board.status = "active"

        incoming_pages: Optional[List[Dict[str, Any]]] = payload.get("pages")
        if incoming_pages is not None:
            if len(incoming_pages) == 0:
                raise HTTPException(status_code=400, detail="An EduBoard must retain at least 1 page.")

            kept_uids: Set[str] = set()
            for idx, p_in in enumerate(incoming_pages, start=1):
                p_uid = str(p_in.get("page_uid") or uuid.uuid4().hex[:12])[:64]
                kept_uids.add(p_uid)
                scene_raw = p_in.get("scene_json")
                if isinstance(scene_raw, dict):
                    scene_str = json.dumps(scene_raw)
                else:
                    scene_str = str(scene_raw or '{"schemaVersion":1,"elements":[]}')
                if len(scene_str.encode("utf-8")) > MAX_SCENE_JSON_BYTES:
                    raise HTTPException(status_code=413, detail=f"Page '{p_uid}' exceeds 5 MB scene size limit.")

                mode = str(p_in.get("mode") or board.board_mode_default)
                if mode not in EDUBOARD_BOARD_MODES:
                    mode = "whiteboard"
                bg = str(p_in.get("background_style") or "white")
                if bg not in EDUBOARD_PAGE_BACKGROUNDS:
                    bg = "white"

                src_att_id = p_in.get("source_attachment_id")
                src_page_no = p_in.get("source_page_number")

                if p_uid in existing_pages_by_uid:
                    pg = existing_pages_by_uid[p_uid]
                    in_ver = p_in.get("version")
                    if not force_overwrite and in_ver is not None and int(in_ver) != pg.version:
                        raise RevisionConflictError(
                            f"Page '{p_uid}' was modified elsewhere (server v{pg.version}, client v{in_ver}).",
                            latest_revision_no=board.latest_revision_no,
                            server_page_versions=server_page_versions,
                        )
                    pg.page_order = idx
                    pg.title = str(p_in.get("title") or pg.title)[:150]
                    pg.mode = mode
                    pg.background_style = bg
                    pg.source_attachment_id = src_att_id
                    pg.source_page_number = src_page_no
                    pg.scene_json = scene_str
                    pg.version += 1
                else:
                    pg = EduBoardPage(
                        board_id=board.id,
                        page_uid=p_uid,
                        page_order=idx,
                        title=str(p_in.get("title") or f"Page {idx}")[:150],
                        mode=mode,
                        background_style=bg,
                        source_attachment_id=src_att_id,
                        source_page_number=src_page_no,
                        scene_json=scene_str,
                        version=1,
                    )
                    db.add(pg)

            if payload.get("replace_pages", True):
                for old_uid, old_pg in list(existing_pages_by_uid.items()):
                    if old_uid not in kept_uids:
                        await db.delete(old_pg)

            board.page_count = len(incoming_pages)

        await db.flush()
        # Reload ordered pages to snapshot cleanly
        ordered_pages = (
            await db.execute(
                select(EduBoardPage).where(EduBoardPage.board_id == board.id).order_by(EduBoardPage.page_order)
            )
        ).scalars().all()

        save_type = str(payload.get("save_type") or "manual").lower()
        if save_type not in {"autosave", "manual"}:
            save_type = "manual"

        board.latest_revision_no += 1
        snap_payload = {
            "title": board.title,
            "topic": board.topic,
            "pages": [
                {
                    "page_uid": p.page_uid,
                    "page_order": p.page_order,
                    "title": p.title,
                    "mode": p.mode,
                    "background_style": p.background_style,
                    "source_attachment_id": p.source_attachment_id,
                    "source_page_number": p.source_page_number,
                    "scene_json": p.scene_json,
                }
                for p in ordered_pages
            ],
        }
        db.add(
            EduBoardRevision(
                board_id=board.id,
                revision_no=board.latest_revision_no,
                save_type=save_type,
                created_by_id=user.id,
                snapshot_json=json.dumps(snap_payload),
                note=str(payload.get("note") or ("Debounced autosave" if save_type == "autosave" else "Manual save"))[:255],
            )
        )

        # Bound noisy autosave rows while permanently keeping manual/publish/restore revisions
        if save_type == "autosave":
            old_autos = (
                await db.execute(
                    select(EduBoardRevision)
                    .where(
                        EduBoardRevision.board_id == board.id,
                        EduBoardRevision.save_type == "autosave",
                    )
                    .order_by(EduBoardRevision.revision_no.desc())
                    .offset(MAX_AUTOSAVE_REVISIONS)
                )
            ).scalars().all()
            for o in old_autos:
                await db.delete(o)

        if save_type == "manual":
            await EduBoardService.write_audit_log(
                db,
                user_id=user.id,
                institution_id=institution_id,
                action="EDUBOARD_MANUAL_SAVE",
                resource_id=board.id,
                details=json.dumps({"revision_no": board.latest_revision_no, "page_count": board.page_count}),
            )

        await db.commit()
        db.expire(board)
        return await EduBoardService.get_board_or_404(db, board_id, institution_id, is_demo=is_demo)

    @staticmethod
    async def restore_revision(
        db: AsyncSession,
        user: User,
        institution_id: int,
        data_env: str,
        board_id: int,
        revision_id: int,
    ) -> EduBoard:
        is_demo = data_env == "TRAINING"
        board = await EduBoardService.get_board_or_404(db, board_id, institution_id, is_demo=is_demo)
        await EduBoardService.require_permission_or_403(db, user, "edit", board=board)

        rev = (
            await db.execute(
                select(EduBoardRevision).where(
                    EduBoardRevision.id == revision_id,
                    EduBoardRevision.board_id == board.id,
                )
            )
        ).scalar_one_or_none()
        if not rev:
            raise HTTPException(status_code=404, detail="Revision not found for this board.")

        snap = json.loads(rev.snapshot_json)
        pages = snap.get("pages") or []
        if not pages:
            raise HTTPException(status_code=400, detail="Selected revision contains no pages to restore.")

        for p in list(board.pages):
            await db.delete(p)
        await db.flush()

        for idx, pdata in enumerate(pages, start=1):
            db.add(
                EduBoardPage(
                    board_id=board.id,
                    page_uid=str(pdata.get("page_uid") or uuid.uuid4().hex[:12])[:64],
                    page_order=idx,
                    title=str(pdata.get("title") or f"Page {idx}")[:150],
                    mode=str(pdata.get("mode") or "whiteboard"),
                    background_style=str(pdata.get("background_style") or "white"),
                    source_attachment_id=pdata.get("source_attachment_id"),
                    source_page_number=pdata.get("source_page_number"),
                    scene_json=str(pdata.get("scene_json") or '{"schemaVersion":1,"elements":[]}'),
                    version=1,
                )
            )

        board.latest_revision_no += 1
        board.page_count = len(pages)
        db.add(
            EduBoardRevision(
                board_id=board.id,
                revision_no=board.latest_revision_no,
                save_type="restore",
                created_by_id=user.id,
                snapshot_json=rev.snapshot_json,
                note=f"Restored from revision #{rev.revision_no}",
            )
        )
        await EduBoardService.write_audit_log(
            db,
            user_id=user.id,
            institution_id=institution_id,
            action="EDUBOARD_RESTORE_REVISION",
            resource_id=board.id,
            details=json.dumps({"restored_from_revision_no": rev.revision_no, "new_revision_no": board.latest_revision_no}),
        )
        await db.commit()
        db.expire(board)
        return await EduBoardService.get_board_or_404(db, board_id, institution_id, is_demo=is_demo)

    @staticmethod
    async def publish_board(
        db: AsyncSession,
        user: User,
        institution_id: int,
        data_env: str,
        board_id: int,
    ) -> Dict[str, Any]:
        is_demo = data_env == "TRAINING"
        board = await EduBoardService.get_board_or_404(db, board_id, institution_id, is_demo=is_demo)
        await EduBoardService.require_permission_or_403(db, user, "publish", board=board)

        prev_status = board.status
        board.status = "published"
        board.published_at = datetime.now(timezone.utc)
        board.published_by_id = user.id

        snap_pages = [
            {
                "page_uid": p.page_uid,
                "page_order": p.page_order,
                "title": p.title,
                "mode": p.mode,
                "background_style": p.background_style,
                "source_attachment_id": p.source_attachment_id,
                "source_page_number": p.source_page_number,
                "scene_json": p.scene_json,
            }
            for p in board.pages
        ]
        board.latest_revision_no += 1
        db.add(
            EduBoardRevision(
                board_id=board.id,
                revision_no=board.latest_revision_no,
                save_type="publish",
                created_by_id=user.id,
                snapshot_json=json.dumps({"title": board.title, "topic": board.topic, "pages": snap_pages}),
                note="Published to Student Portal",
            )
        )

        # Notify eligible students in this batch & academic year via CommunicationLog
        notified_count = 0
        settings = await EduBoardService.get_settings(db, institution_id)
        if settings.get("notify_students_on_publish", True) and board.division_id:
            enr_rows = (
                await db.execute(
                    select(StudentEnrollment, Student)
                    .join(Student, Student.id == StudentEnrollment.student_id)
                    .where(
                        StudentEnrollment.division_id == board.division_id,
                        StudentEnrollment.academic_year_id == board.academic_year_id,
                        StudentEnrollment.status == "active",
                        Student.is_active == True,
                    )
                )
            ).all()
            tpl_code = f"EB_PUB_{board.id}"
            sender_name = user.full_name or user.username
            for _, stu in enr_rows:
                existing_log = (
                    await db.execute(
                        select(CommunicationLog.id).where(
                            CommunicationLog.institution_id == institution_id,
                            CommunicationLog.template_code == tpl_code,
                            CommunicationLog.recipient_id == stu.id,
                        )
                    )
                ).first()
                if existing_log:
                    continue
                db.add(
                    CommunicationLog(
                        institution_id=institution_id,
                        channel="IN_APP",
                        recipient_type="STUDENT",
                        recipient_id=stu.id,
                        recipient_name=f"{stu.first_name} {stu.last_name}".strip(),
                        recipient_destination=stu.email or stu.phone or f"student:{stu.id}",
                        template_code=tpl_code,
                        subject=f"New Lecture Board Published: {board.title}",
                        content=f"{sender_name} published lecture board notes for '{board.title}' ({board.board_code}).",
                        status="SENT",
                        metadata_json=json.dumps({"board_id": board.id, "board_code": board.board_code}),
                        sender_id=user.id,
                        sender_name=sender_name,
                        is_demo=is_demo,
                        data_environment=data_env,
                        sent_at=datetime.now(timezone.utc),
                    )
                )
                notified_count += 1

        await EduBoardService.write_audit_log(
            db,
            user_id=user.id,
            institution_id=institution_id,
            action="EDUBOARD_PUBLISHED",
            resource_id=board.id,
            old_data=json.dumps({"status": prev_status}),
            new_data=json.dumps({"status": "published", "notified_students": notified_count}),
        )
        await db.commit()
        refreshed = await EduBoardService.get_board_or_404(db, board.id, institution_id, is_demo=is_demo)
        return {"board": refreshed, "notified_students": notified_count}

    @staticmethod
    async def change_status(
        db: AsyncSession,
        user: User,
        institution_id: int,
        data_env: str,
        board_id: int,
        new_status: str,
    ) -> EduBoard:
        is_demo = data_env == "TRAINING"
        board = await EduBoardService.get_board_or_404(db, board_id, institution_id, is_demo=is_demo)
        await EduBoardService.require_permission_or_403(db, user, "edit", board=board)
        if new_status not in {"draft", "active", "closed", "archived"}:
            raise HTTPException(status_code=400, detail=f"Invalid target status '{new_status}'.")
        prev = board.status
        board.status = new_status
        await EduBoardService.write_audit_log(
            db,
            user_id=user.id,
            institution_id=institution_id,
            action="EDUBOARD_STATUS_CHANGED",
            resource_id=board.id,
            old_data=json.dumps({"status": prev}),
            new_data=json.dumps({"status": new_status}),
        )
        await db.commit()
        return await EduBoardService.get_board_or_404(db, board.id, institution_id, is_demo=is_demo)

    @staticmethod
    async def soft_delete_board(
        db: AsyncSession,
        user: User,
        institution_id: int,
        data_env: str,
        board_id: int,
    ) -> None:
        is_demo = data_env == "TRAINING"
        board = await EduBoardService.get_board_or_404(db, board_id, institution_id, is_demo=is_demo)
        await EduBoardService.require_permission_or_403(db, user, "delete", board=board)
        board.is_deleted = True
        await EduBoardService.write_audit_log(
            db,
            user_id=user.id,
            institution_id=institution_id,
            action="EDUBOARD_DELETED",
            resource_id=board.id,
            details=json.dumps({"board_code": board.board_code, "title": board.title}),
        )
        await db.commit()

    # =========================================================================
    # ATTACHMENTS, PYMUPDF SLIDE IMPORT & PDF EXPORT
    # =========================================================================

    @staticmethod
    async def upload_attachment(
        db: AsyncSession,
        user: User,
        institution_id: int,
        data_env: str,
        board_id: int,
        upload: UploadFile,
        attachment_role: str = "source_document",
        create_slides: bool = True,
    ) -> Dict[str, Any]:
        is_demo = data_env == "TRAINING"
        board = await EduBoardService.get_board_or_404(db, board_id, institution_id, is_demo=is_demo)
        await EduBoardService.require_permission_or_403(db, user, "edit", board=board)

        settings = await EduBoardService.get_settings(db, institution_id)
        allowed_exts = {str(e).lower().lstrip(".") for e in settings.get("allowed_extensions", EDUBOARD_ALLOWED_EXTENSIONS)}
        max_bytes = int(settings.get("max_file_size_mb", 25)) * 1024 * 1024

        orig_name = Path(upload.filename or "upload.pdf").name
        safe_base = re.sub(r"[^A-Za-z0-9._-]+", "_", orig_name).strip("._") or "document"
        ext = Path(safe_base).suffix.lower().lstrip(".")

        if ext in {"ppt", "pptx"}:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="PPT/PPTX conversion is deferred in this release because LibreOffice is not deployed. Please export your deck to PDF or PNG/JPG images first.",
            )
        if not ext or ext not in allowed_exts:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file extension '.{ext or 'none'}'. Allowed: {', '.join(sorted(allowed_exts))}.",
            )

        mime = (upload.content_type or "application/octet-stream").lower().strip()
        if not any(mime.startswith(prefix) for prefix in EDUBOARD_MIME_PREFIXES):
            raise HTTPException(status_code=400, detail=f"Unsupported MIME type '{mime}'.")

        content = await upload.read(max_bytes + 1)
        if not content:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")
        if len(content) > max_bytes:
            raise HTTPException(
                status_code=413,
                detail=f"File exceeds configured maximum size ({settings.get('max_file_size_mb', 25)} MB).",
            )

        page_count: Optional[int] = None
        if ext == "pdf":
            try:
                pdf_doc = fitz.open(stream=content, filetype="pdf")
                page_count = pdf_doc.page_count
                pdf_doc.close()
                if page_count <= 0:
                    raise ValueError("PDF has zero pages")
            except Exception as exc:
                raise HTTPException(status_code=400, detail=f"Invalid or corrupted PDF file: {exc}")

        checksum = hashlib.sha256(content).hexdigest()
        inst_dir = _resolve_eduboard_upload_root() / str(institution_id)
        inst_dir.mkdir(parents=True, exist_ok=True)
        stored_name = f"{uuid.uuid4().hex}_{safe_base}"
        dest_path = inst_dir / stored_name

        with open(dest_path, "wb") as fp:
            fp.write(content)

        att = EduBoardAttachment(
            institution_id=institution_id,
            is_demo=is_demo,
            board_id=board.id,
            uploader_user_id=user.id,
            attachment_role=attachment_role if attachment_role in {"source_document", "canvas_image", "exported_pdf"} else "source_document",
            original_filename=orig_name[:255],
            stored_filename=stored_name[:255],
            storage_path=str(dest_path),
            mime_type=mime[:150],
            extension=ext[:20],
            file_size_bytes=len(content),
            sha256_checksum=checksum,
            page_count=page_count,
            is_immutable=True,
        )
        db.add(att)
        await db.flush()

        created_pages: List[EduBoardPage] = []
        if ext == "pdf" and create_slides and page_count:
            max_order = max((p.page_order for p in board.pages), default=0)
            max_slides = min(page_count, 60)  # safety ceiling per upload
            for p_num in range(1, max_slides + 1):
                pg = EduBoardPage(
                    board_id=board.id,
                    page_uid=uuid.uuid4().hex[:12],
                    page_order=max_order + p_num,
                    title=f"{orig_name[:40]} — Slide {p_num}",
                    mode="presentation",
                    background_style="pdf_slide",
                    source_attachment_id=att.id,
                    source_page_number=p_num,
                    scene_json=json.dumps({"schemaVersion": 1, "elements": []}),
                    version=1,
                )
                db.add(pg)
                created_pages.append(pg)
            board.board_mode_default = "presentation"
            board.page_count = max_order + len(created_pages)

        await EduBoardService.write_audit_log(
            db,
            user_id=user.id,
            institution_id=institution_id,
            action="EDUBOARD_ATTACHMENT_UPLOADED",
            resource_id=board.id,
            details=json.dumps({
                "attachment_id": att.id,
                "filename": att.original_filename,
                "page_count": page_count,
                "sha256": checksum,
                "slides_created": len(created_pages),
            }),
        )
        await db.commit()
        await db.refresh(att)
        return {
            "attachment": att,
            "created_pages_count": len(created_pages),
        }

    @staticmethod
    async def get_attachment_for_access(
        db: AsyncSession,
        user: User,
        institution_id: int,
        data_env: str,
        attachment_id: int,
    ) -> EduBoardAttachment:
        is_demo = data_env == "TRAINING"
        att = (
            await db.execute(
                select(EduBoardAttachment)
                .options(selectinload(EduBoardAttachment.board))
                .where(
                    EduBoardAttachment.id == attachment_id,
                    EduBoardAttachment.institution_id == institution_id,
                    EduBoardAttachment.is_demo == is_demo,
                )
            )
        ).scalar_one_or_none()
        if not att or not att.board or att.board.is_deleted:
            raise HTTPException(status_code=404, detail="Attachment not found.")

        role = (getattr(user, "role", "") or "").strip().lower()
        if role == "student":
            # Verify student access to published board (active or historical enrollment)
            await EduBoardService.get_student_board_detail(db, user, institution_id, data_env, att.board.id, log_audit=False)
        else:
            await EduBoardService.require_permission_or_403(db, user, "download", board=att.board)

        return att

    @staticmethod
    def render_pdf_page_png_bytes(att: EduBoardAttachment, page_number: int) -> bytes:
        if att.extension.lower() != "pdf":
            raise HTTPException(status_code=400, detail="Page rendering applies only to PDF attachments.")
        if not os.path.isfile(att.storage_path):
            raise HTTPException(status_code=404, detail="Attachment file missing on server storage.")
        doc = fitz.open(att.storage_path)
        try:
            if page_number < 1 or page_number > doc.page_count:
                raise HTTPException(status_code=404, detail=f"Page {page_number} out of range (1..{doc.page_count}).")
            page = doc.load_page(page_number - 1)
            pix = page.get_pixmap(matrix=fitz.Matrix(2.0, 2.0), alpha=False)
            return pix.tobytes("png")
        finally:
            doc.close()

    @staticmethod
    def _draw_scene_on_pdf_page(
        pdf_page: fitz.Page,
        scene_json: str,
        att_lookup: Dict[int, EduBoardAttachment],
    ) -> None:
        """Draws Konva/freehand vector elements cleanly onto a PyMuPDF page."""
        try:
            scene = json.loads(scene_json or "{}")
        except json.JSONDecodeError:
            return
        elements = scene.get("elements") or []
        rect = pdf_page.rect
        sx = rect.width / LOGICAL_CANVAS_W
        sy = rect.height / LOGICAL_CANVAS_H
        scale_stroke = (sx + sy) / 2.0

        for el in elements:
            kind = el.get("type")
            color = _hex_to_rgb01(el.get("stroke") or el.get("color"))
            width = max(0.5, float(el.get("strokeWidth", 3)) * scale_stroke)
            opacity = float(el.get("opacity", 1.0))

            if kind in {"stroke", "pen", "chalk", "marker", "highlighter", "eraser"}:
                if kind == "eraser":
                    continue
                pts = el.get("points") or []
                if len(pts) < 4:
                    continue
                shape = pdf_page.new_shape()
                if isinstance(pts[0], (list, tuple)):
                    flat = [v for pair in pts for v in pair]
                else:
                    flat = pts
                p0 = fitz.Point(flat[0] * sx, flat[1] * sy)
                shape.draw_polyline([fitz.Point(flat[i] * sx, flat[i + 1] * sy) for i in range(0, len(flat) - 1, 2)])
                shape.finish(color=color, width=width, stroke_opacity=opacity, lineCap=1, lineJoin=1)
                shape.commit()

            elif kind == "line" or kind == "arrow":
                pts = el.get("points") or []
                if len(pts) >= 4:
                    x1, y1, x2, y2 = float(pts[0]) * sx, float(pts[1]) * sy, float(pts[2]) * sx, float(pts[3]) * sy
                    shape = pdf_page.new_shape()
                    shape.draw_line(fitz.Point(x1, y1), fitz.Point(x2, y2))
                    shape.finish(color=color, width=width, stroke_opacity=opacity)
                    shape.commit()

            elif kind == "rect":
                x = float(el.get("x", 0)) * sx
                y = float(el.get("y", 0)) * sy
                w = float(el.get("width", 0)) * sx
                h = float(el.get("height", 0)) * sy
                fill_col = _hex_to_rgb01(el["fill"]) if el.get("fill") and el.get("fill") != "transparent" else None
                shape = pdf_page.new_shape()
                shape.draw_rect(fitz.Rect(x, y, x + w, y + h))
                shape.finish(color=color, fill=fill_col, width=width, stroke_opacity=opacity)
                shape.commit()

            elif kind == "circle":
                cx = float(el.get("x", 0)) * sx
                cy = float(el.get("y", 0)) * sy
                r = float(el.get("radius", 20)) * scale_stroke
                shape = pdf_page.new_shape()
                shape.draw_circle(fitz.Point(cx, cy), max(1.0, r))
                shape.finish(color=color, width=width, stroke_opacity=opacity)
                shape.commit()

            elif kind == "text":
                txt = str(el.get("text") or "").strip()
                if txt:
                    tx = float(el.get("x", 40)) * sx
                    ty = float(el.get("y", 40)) * sy + float(el.get("fontSize", 20)) * sy
                    tcol = _hex_to_rgb01(el.get("fill") or el.get("color"))
                    fsize = max(8.0, float(el.get("fontSize", 20)) * scale_stroke)
                    pdf_page.insert_text(fitz.Point(tx, ty), txt, fontsize=fsize, color=tcol)

            elif kind == "image":
                att_id = el.get("attachmentId")
                if att_id and int(att_id) in att_lookup:
                    img_att = att_lookup[int(att_id)]
                    if os.path.isfile(img_att.storage_path):
                        ix = float(el.get("x", 40)) * sx
                        iy = float(el.get("y", 40)) * sy
                        iw = float(el.get("width", 240)) * sx
                        ih = float(el.get("height", 160)) * sy
                        try:
                            pdf_page.insert_image(fitz.Rect(ix, iy, ix + iw, iy + ih), filename=img_att.storage_path)
                        except Exception:
                            pass

    @staticmethod
    async def export_board_pdf(
        db: AsyncSession,
        user: User,
        institution_id: int,
        data_env: str,
        board_id: int,
    ) -> Tuple[bytes, str]:
        is_demo = data_env == "TRAINING"
        board = await EduBoardService.get_board_or_404(db, board_id, institution_id, is_demo=is_demo)
        role = (getattr(user, "role", "") or "").strip().lower()
        if role == "student":
            await EduBoardService.get_student_board_detail(db, user, institution_id, data_env, board_id, log_audit=False)
        else:
            await EduBoardService.require_permission_or_403(db, user, "download", board=board)

        att_lookup: Dict[int, EduBoardAttachment] = {a.id: a for a in board.attachments}
        opened_pdfs: Dict[int, fitz.Document] = {}
        out_doc = fitz.open()

        try:
            for pg in board.pages:
                if pg.source_attachment_id and pg.source_page_number and pg.source_attachment_id in att_lookup:
                    src_att = att_lookup[pg.source_attachment_id]
                    if os.path.isfile(src_att.storage_path):
                        if src_att.id not in opened_pdfs:
                            opened_pdfs[src_att.id] = fitz.open(src_att.storage_path)
                        src_doc = opened_pdfs[src_att.id]
                        pidx = max(0, min(src_doc.page_count - 1, pg.source_page_number - 1))
                        out_doc.insert_pdf(src_doc, from_page=pidx, to_page=pidx)
                        out_page = out_doc[-1]
                        EduBoardService._draw_scene_on_pdf_page(out_page, pg.scene_json, att_lookup)
                        continue

                # Blank / Classic / Whiteboard page
                out_page = out_doc.new_page(width=842, height=595)  # A4 Landscape
                if pg.background_style == "blackboard":
                    bg_col = (0.09, 0.10, 0.12)
                elif pg.background_style == "greenboard":
                    bg_col = (0.09, 0.25, 0.17)
                else:
                    bg_col = (1.0, 1.0, 1.0)
                if bg_col != (1.0, 1.0, 1.0):
                    sh = out_page.new_shape()
                    sh.draw_rect(out_page.rect)
                    sh.finish(fill=bg_col, color=bg_col)
                    sh.commit()
                EduBoardService._draw_scene_on_pdf_page(out_page, pg.scene_json, att_lookup)

            pdf_bytes = out_doc.tobytes(deflate=True)
        finally:
            out_doc.close()
            for d in opened_pdfs.values():
                d.close()

        await EduBoardService.write_audit_log(
            db,
            user_id=user.id,
            institution_id=institution_id,
            action="EDUBOARD_EXPORT_PDF",
            resource_id=board.id,
            details=json.dumps({"board_code": board.board_code, "page_count": len(board.pages), "role": role}),
        )
        await db.commit()
        safe_title = re.sub(r"[^A-Za-z0-9._-]+", "_", board.title or board.board_code).strip("_")[:60]
        filename = f"{board.board_code}_{safe_title}.pdf"
        return pdf_bytes, filename

    # =========================================================================
    # STUDENT PORTAL READ-ONLY ACCESS (PRESERVING HISTORICAL ENROLLMENTS)
    # =========================================================================

    @staticmethod
    async def _resolve_student_and_enrollments(
        db: AsyncSession,
        user: User,
        institution_id: int,
        requested_student_id: Optional[int] = None,
    ) -> Tuple[Student, List[StudentEnrollment]]:
        role = (getattr(user, "role", "") or "").strip().lower()
        if role == "student":
            if not user.student_id:
                raise HTTPException(status_code=403, detail="Student profile is not linked to this user.")
            sid = user.student_id
        else:
            sid = requested_student_id
            if not sid:
                raise HTTPException(status_code=400, detail="student_id is required when viewing as staff.")

        stu = (
            await db.execute(
                select(Student).where(
                    Student.id == sid,
                    Student.institution_id == institution_id,
                )
            )
        ).scalar_one_or_none()
        if not stu:
            raise HTTPException(status_code=404, detail="Student not found in this institution.")

        # Retrieve ALL enrollments (active + historical transferred/completed/withdrawn) so lecture history persists
        enrs = (
            await db.execute(
                select(StudentEnrollment).where(StudentEnrollment.student_id == stu.id)
            )
        ).scalars().all()
        return stu, list(enrs)

    @staticmethod
    async def get_student_published_boards(
        db: AsyncSession,
        user: User,
        institution_id: int,
        data_env: str,
        requested_student_id: Optional[int] = None,
    ) -> List[EduBoard]:
        is_demo = data_env == "TRAINING"
        _, enrs = await EduBoardService._resolve_student_and_enrollments(
            db, user, institution_id, requested_student_id=requested_student_id
        )
        if not enrs:
            return []

        pairs = [(e.academic_year_id, e.division_id) for e in enrs if e.division_id]
        std_pairs = [(e.academic_year_id, e.standard_id) for e in enrs if not e.division_id]
        filters = []
        for ay_id, div_id in set(pairs):
            filters.append(and_(EduBoard.academic_year_id == ay_id, EduBoard.division_id == div_id))
        for ay_id, std_id in set(std_pairs):
            filters.append(and_(EduBoard.academic_year_id == ay_id, EduBoard.standard_id == std_id, EduBoard.division_id.is_(None)))

        if not filters:
            return []

        stmt = (
            select(EduBoard)
            .options(
                selectinload(EduBoard.teacher),
                selectinload(EduBoard.standard),
                selectinload(EduBoard.division),
                selectinload(EduBoard.subject),
                selectinload(EduBoard.academic_year),
                selectinload(EduBoard.teaching_session),
            )
            .where(
                EduBoard.institution_id == institution_id,
                EduBoard.is_demo == is_demo,
                EduBoard.status == "published",
                EduBoard.is_deleted == False,
                or_(*filters),
            )
            .order_by(EduBoard.published_at.desc(), EduBoard.id.desc())
        )
        return list((await db.execute(stmt)).scalars().all())

    @staticmethod
    async def get_student_board_detail(
        db: AsyncSession,
        user: User,
        institution_id: int,
        data_env: str,
        board_id: int,
        requested_student_id: Optional[int] = None,
        log_audit: bool = True,
    ) -> EduBoard:
        is_demo = data_env == "TRAINING"
        stu, enrs = await EduBoardService._resolve_student_and_enrollments(
            db, user, institution_id, requested_student_id=requested_student_id
        )
        board = await EduBoardService.get_board_or_404(db, board_id, institution_id, is_demo=is_demo)
        if board.status != "published":
            raise HTTPException(status_code=403, detail="Access denied: Board is not published to students.")

        authorized = False
        for e in enrs:
            if e.academic_year_id == board.academic_year_id:
                if board.division_id and e.division_id == board.division_id:
                    authorized = True
                    break
                if not board.division_id and e.standard_id == board.standard_id:
                    authorized = True
                    break
        if not authorized:
            raise HTTPException(status_code=403, detail="Access denied: You are not enrolled in this class batch.")

        if log_audit:
            await EduBoardService.write_audit_log(
                db,
                user_id=user.id,
                institution_id=institution_id,
                action="EDUBOARD_STUDENT_VIEW",
                resource_id=board.id,
                details=json.dumps({"student_id": stu.id, "board_code": board.board_code}),
            )
            await db.commit()
        return board

    # =========================================================================
    # ANALYTICS & REPORTS (DB-DERIVED ONLY)
    # =========================================================================

    @staticmethod
    async def get_reports_summary(
        db: AsyncSession,
        institution_id: int,
        data_env: str,
        academic_year_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        is_demo = data_env == "TRAINING"
        base_cond = [
            EduBoard.institution_id == institution_id,
            EduBoard.is_demo == is_demo,
            EduBoard.is_deleted == False,
        ]
        if academic_year_id:
            base_cond.append(EduBoard.academic_year_id == academic_year_id)

        total_boards = (await db.execute(select(func.count(EduBoard.id)).where(*base_cond))).scalar() or 0
        published_boards = (
            await db.execute(select(func.count(EduBoard.id)).where(*base_cond, EduBoard.status == "published"))
        ).scalar() or 0
        draft_boards = (
            await db.execute(select(func.count(EduBoard.id)).where(*base_cond, EduBoard.status == "draft"))
        ).scalar() or 0
        templates_count = (
            await db.execute(select(func.count(EduBoard.id)).where(*base_cond, EduBoard.is_template == True))
        ).scalar() or 0
        total_pages = int(
            (await db.execute(select(func.coalesce(func.sum(EduBoard.page_count), 0)).where(*base_cond))).scalar() or 0
        )
        total_pdf_attachments = (
            await db.execute(
                select(func.count(EduBoardAttachment.id))
                .join(EduBoard, EduBoard.id == EduBoardAttachment.board_id)
                .where(*base_cond, EduBoardAttachment.extension == "pdf")
            )
        ).scalar() or 0
        lectures_linked = (
            await db.execute(select(func.count(EduBoard.id)).where(*base_cond, EduBoard.teaching_session_id.is_not(None)))
        ).scalar() or 0

        student_views = (
            await db.execute(
                select(func.count(AuditLog.id)).where(
                    AuditLog.institution_id == institution_id,
                    AuditLog.resource_type == "eduboard",
                    AuditLog.action == "EDUBOARD_STUDENT_VIEW",
                )
            )
        ).scalar() or 0
        pdf_exports = (
            await db.execute(
                select(func.count(AuditLog.id)).where(
                    AuditLog.institution_id == institution_id,
                    AuditLog.resource_type == "eduboard",
                    AuditLog.action == "EDUBOARD_EXPORT_PDF",
                )
            )
        ).scalar() or 0

        by_teacher_rows = (
            await db.execute(
                select(
                    User.id,
                    func.concat(User.first_name, " ", User.last_name).label("teacher_name"),
                    func.count(EduBoard.id).label("total_boards"),
                    func.coalesce(func.sum(EduBoard.page_count), 0).label("total_pages"),
                )
                .join(EduBoard, EduBoard.teacher_user_id == User.id)
                .where(*base_cond)
                .group_by(User.id, User.first_name, User.last_name)
                .order_by(desc(func.count(EduBoard.id)))
            )
        ).all()

        by_subject_rows = (
            await db.execute(
                select(
                    Subject.id,
                    Subject.name,
                    func.count(EduBoard.id).label("total_boards"),
                )
                .join(EduBoard, EduBoard.subject_id == Subject.id)
                .where(*base_cond)
                .group_by(Subject.id, Subject.name)
                .order_by(desc(func.count(EduBoard.id)))
            )
        ).all()

        mode_rows = (
            await db.execute(
                select(EduBoard.board_mode_default, func.count(EduBoard.id))
                .where(*base_cond)
                .group_by(EduBoard.board_mode_default)
            )
        ).all()
        mode_breakdown = {str(m or "whiteboard"): int(cnt or 0) for m, cnt in mode_rows}

        recent_board_rows = (
            await db.execute(
                select(EduBoard)
                .where(*base_cond)
                .order_by(EduBoard.updated_at.desc(), EduBoard.id.desc())
                .limit(50)
            )
        ).scalars().all()

        return {
            "total_boards": total_boards,
            "published_boards": published_boards,
            "draft_boards": draft_boards,
            "total_pages": total_pages,
            "total_pdf_attachments": total_pdf_attachments,
            "templates_count": templates_count,
            "lectures_linked": lectures_linked,
            "student_views": student_views,
            "pdf_exports": pdf_exports,
            "mode_breakdown": mode_breakdown,
            "recent_boards": [
                {
                    "id": b.id,
                    "board_code": b.board_code,
                    "title": b.title,
                    "status": b.status,
                    "mode": b.board_mode_default,
                    "page_count": int(b.page_count or 0),
                    "updated_at": b.updated_at.isoformat() if b.updated_at else None,
                }
                for b in recent_board_rows
            ],
            "by_teacher": [
                {"teacher_id": r[0], "teacher_name": (r[1] or "").strip(), "boards": r[2], "pages": int(r[3] or 0)}
                for r in by_teacher_rows
            ],
            "by_subject": [{"subject_id": r[0], "subject_name": r[1], "boards": r[2]} for r in by_subject_rows],
        }

    # =========================================================================
    # DISPLAY PREFERENCES (System Default -> Institution Default -> User)
    # =========================================================================

    @staticmethod
    def _sanitize_display_prefs(raw: Dict[str, Any]) -> Dict[str, Any]:
        cleaned: Dict[str, Any] = {}
        if raw.get("default_workspace_mode") in EDUBOARD_WORKSPACE_MODES:
            cleaned["default_workspace_mode"] = raw["default_workspace_mode"]
        if raw.get("default_board_appearance") in EDUBOARD_PAGE_BACKGROUNDS:
            cleaned["default_board_appearance"] = raw["default_board_appearance"]
        if raw.get("toolbar_state") in EDUBOARD_TOOLBAR_STATES:
            cleaned["toolbar_state"] = raw["toolbar_state"]
        if raw.get("toolbar_position") in EDUBOARD_TOOLBAR_POSITIONS:
            cleaned["toolbar_position"] = raw["toolbar_position"]
        for bool_k in ("pages_panel_open", "saved_boards_panel_open", "hide_app_header", "hide_status_bar"):
            if bool_k in raw and raw[bool_k] is not None:
                cleaned[bool_k] = bool(raw[bool_k])
        return cleaned

    @staticmethod
    async def get_display_preferences(
        db: AsyncSession,
        user: User,
        institution_id: int,
    ) -> Dict[str, Any]:
        inst_settings = await EduBoardService.get_settings(db, institution_id)
        inst_defaults = {k: inst_settings.get(k, v) for k, v in SYSTEM_DEFAULT_DISPLAY_PREFS.items()}
        allow_overrides = bool(inst_settings.get("allow_user_display_overrides", True))
        allow_collaborator = bool(inst_settings.get("allow_collaborator_mode", True))
        allow_popout = bool(inst_settings.get("allow_popout_window", True))

        pref_key = f"eduboard_user_pref:{user.id}"
        row = (
            await db.execute(
                select(InstitutionSetting).where(
                    InstitutionSetting.institution_id == institution_id,
                    InstitutionSetting.category == "eduboard_user_pref",
                    InstitutionSetting.key == pref_key,
                )
            )
        ).scalar_one_or_none()

        user_overrides: Dict[str, Any] = {}
        if row and row.value:
            try:
                user_overrides = EduBoardService._sanitize_display_prefs(json.loads(row.value))
            except json.JSONDecodeError:
                user_overrides = {}

        effective = dict(SYSTEM_DEFAULT_DISPLAY_PREFS)
        effective.update(inst_defaults)
        if allow_overrides or is_sysadmin(user) or (getattr(user, "role", "") or "").lower() in ADMIN_ROLES:
            effective.update(user_overrides)

        return {
            "system_defaults": dict(SYSTEM_DEFAULT_DISPLAY_PREFS),
            "institution_defaults": inst_defaults,
            "user_overrides": user_overrides,
            "effective": effective,
            "allow_user_display_overrides": allow_overrides,
            "allow_collaborator_mode": allow_collaborator,
            "allow_popout_window": allow_popout,
            "locked_by_institution": not allow_overrides
            and not (is_sysadmin(user) or (getattr(user, "role", "") or "").lower() in ADMIN_ROLES),
        }

    @staticmethod
    async def update_display_preferences(
        db: AsyncSession,
        user: User,
        institution_id: int,
        payload: Dict[str, Any],
    ) -> Dict[str, Any]:
        inst_settings = await EduBoardService.get_settings(db, institution_id)
        is_privileged = is_sysadmin(user) or (getattr(user, "role", "") or "").lower() in ADMIN_ROLES
        if not bool(inst_settings.get("allow_user_display_overrides", True)) and not is_privileged:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Display layout preferences are locked by your institution administrator.",
            )

        pref_key = f"eduboard_user_pref:{user.id}"
        row = (
            await db.execute(
                select(InstitutionSetting).where(
                    InstitutionSetting.institution_id == institution_id,
                    InstitutionSetting.category == "eduboard_user_pref",
                    InstitutionSetting.key == pref_key,
                )
            )
        ).scalar_one_or_none()

        current_overrides: Dict[str, Any] = {}
        if row and row.value:
            try:
                current_overrides = EduBoardService._sanitize_display_prefs(json.loads(row.value))
            except json.JSONDecodeError:
                current_overrides = {}

        sanitized_patch = EduBoardService._sanitize_display_prefs(payload)
        current_overrides.update(sanitized_patch)

        if row:
            row.value = json.dumps(current_overrides)
            row.updated_by_id = user.id
        else:
            db.add(
                InstitutionSetting(
                    institution_id=institution_id,
                    category="eduboard_user_pref",
                    key=pref_key,
                    value=json.dumps(current_overrides),
                    data_type="json",
                    scope="user",
                    description=f"EduBoard personal display preferences for user {user.id}",
                    updated_by_id=user.id,
                )
            )
        await db.commit()
        return await EduBoardService.get_display_preferences(db, user, institution_id)

    @staticmethod
    async def reset_display_preferences(
        db: AsyncSession,
        user: User,
        institution_id: int,
    ) -> Dict[str, Any]:
        pref_key = f"eduboard_user_pref:{user.id}"
        row = (
            await db.execute(
                select(InstitutionSetting).where(
                    InstitutionSetting.institution_id == institution_id,
                    InstitutionSetting.category == "eduboard_user_pref",
                    InstitutionSetting.key == pref_key,
                )
            )
        ).scalar_one_or_none()
        if row:
            await db.delete(row)
            await db.commit()
        return await EduBoardService.get_display_preferences(db, user, institution_id)

    # =========================================================================
    # POP-OUT SCOPED SESSION & WEBSOCKET TICKET AUTHORIZATION
    # =========================================================================

    @staticmethod
    def _encode_scoped_token(payload: Dict[str, Any], ttl_minutes: int) -> str:
        now = datetime.now(timezone.utc)
        claims = {
            **payload,
            "iat": now,
            "exp": now + timedelta(minutes=ttl_minutes),
            "jti": uuid.uuid4().hex,
        }
        return jwt.encode(claims, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

    @staticmethod
    def decode_scoped_token(token: str, expected_type: str) -> Dict[str, Any]:
        try:
            claims = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        except JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Pop-out / sync token is invalid or expired. Launch the board window again.",
            )
        if claims.get("type") != expected_type:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid scoped launch token type.",
            )
        return claims

    @staticmethod
    async def create_popout_session(
        db: AsyncSession,
        user: User,
        institution_id: int,
        data_env: str,
        board_id: int,
        payload: Dict[str, Any],
    ) -> Dict[str, Any]:
        is_demo = data_env == "TRAINING"
        board = await EduBoardService.get_board_or_404(db, board_id, institution_id, is_demo=is_demo)
        inst_settings = await EduBoardService.get_settings(db, institution_id)

        if not bool(inst_settings.get("allow_popout_window", True)):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Detached pop-out windows are disabled by institution policy.",
            )

        launch_mode = str(payload.get("launch_mode") or "teacher_edit").strip().lower()
        if launch_mode not in EDUBOARD_POPOUT_MODES:
            raise HTTPException(status_code=400, detail=f"Unsupported pop-out mode '{launch_mode}'.")

        role = (getattr(user, "role", "") or "").lower()
        if launch_mode == "teacher_edit":
            if role == "student":
                raise HTTPException(status_code=403, detail="Students cannot open Teacher Edit mode.")
            await EduBoardService.require_permission_or_403(db, user, "edit", board=board)
        elif launch_mode == "presentation":
            if role == "student":
                board = await EduBoardService.get_student_board_detail(db, user, institution_id, data_env, board_id)
            else:
                await EduBoardService.require_permission_or_403(db, user, "view", board=board)
        elif launch_mode == "collaborator":
            if not bool(inst_settings.get("allow_collaborator_mode", True)):
                raise HTTPException(status_code=403, detail="Collaborator mode is disabled by institution policy.")
            await EduBoardService.require_permission_or_403(db, user, "collaborate", board=board)
            is_owner_or_admin = (
                is_sysadmin(user)
                or role in ADMIN_ROLES
                or board.teacher_user_id == user.id
            )
            if not board.collaboration_enabled and not is_owner_or_admin:
                raise HTTPException(
                    status_code=403,
                    detail="Collaboration must be enabled on this board before opening Collaborator mode.",
                )

        surface = payload.get("surface")
        if surface and surface not in EDUBOARD_PAGE_BACKGROUNDS:
            surface = None

        compact_tools = bool(payload.get("compact_tools", launch_mode != "presentation"))
        show_branding = bool(payload.get("show_branding", True))
        hide_toolbar = bool(payload.get("hide_toolbar", launch_mode == "presentation"))

        ttl_minutes = 15
        launch_token = EduBoardService._encode_scoped_token(
            {
                "type": "eduboard_popout",
                "sub": str(user.id),
                "inst": institution_id,
                "env": data_env,
                "board_id": board.id,
                "mode": launch_mode,
                "surface": surface,
                "compact_tools": compact_tools,
                "show_branding": show_branding,
                "hide_toolbar": hide_toolbar,
            },
            ttl_minutes=ttl_minutes,
        )

        await EduBoardService.write_audit_log(
            db,
            user_id=user.id,
            institution_id=institution_id,
            action="EDUBOARD_POPOUT_LAUNCHED",
            resource_id=board.id,
            details=json.dumps({"mode": launch_mode, "surface": surface, "is_demo": is_demo}),
        )
        await db.commit()

        return {
            "launch_token": launch_token,
            "expires_in_seconds": ttl_minutes * 60,
            "launch_url": f"/eduboard/window?launch={launch_token}",
            "mode": launch_mode,
            "board_id": board.id,
        }

    @staticmethod
    async def resolve_popout_session(
        db: AsyncSession,
        user: User,
        institution_id: int,
        data_env: str,
        launch_token: str,
    ) -> Dict[str, Any]:
        claims = EduBoardService.decode_scoped_token(launch_token, "eduboard_popout")
        if str(claims.get("sub")) != str(user.id):
            raise HTTPException(status_code=403, detail="Launch token does not belong to the signed-in user.")
        if int(claims.get("inst", -1)) != int(institution_id) or claims.get("env") != data_env:
            raise HTTPException(
                status_code=403,
                detail="Environment or institution mismatch for detached EduBoard launch token.",
            )

        board_id = int(claims["board_id"])
        is_demo = data_env == "TRAINING"
        board = await EduBoardService.get_board_or_404(db, board_id, institution_id, is_demo=is_demo)
        inst_settings = await EduBoardService.get_settings(db, institution_id)
        if not bool(inst_settings.get("allow_popout_window", True)):
            raise HTTPException(status_code=403, detail="Detached pop-out windows are disabled by policy.")

        mode = str(claims.get("mode") or "presentation")
        role = (getattr(user, "role", "") or "").lower()
        can_edit = False

        if mode == "teacher_edit":
            if role == "student":
                raise HTTPException(status_code=403, detail="Students cannot edit classroom boards.")
            await EduBoardService.require_permission_or_403(db, user, "edit", board=board)
            can_edit = board.status != "closed"
        elif mode == "collaborator":
            if not bool(inst_settings.get("allow_collaborator_mode", True)):
                raise HTTPException(status_code=403, detail="Collaborator mode is disabled by policy.")
            await EduBoardService.require_permission_or_403(db, user, "collaborate", board=board)
            can_edit = board.status != "closed" and (
                board.collaboration_enabled
                or is_sysadmin(user)
                or role in ADMIN_ROLES
                or board.teacher_user_id == user.id
            )
            if not can_edit and board.status != "closed":
                raise HTTPException(status_code=403, detail="Collaboration is currently disabled on this board.")
        else:
            mode = "presentation"
            if role == "student":
                board = await EduBoardService.get_student_board_detail(db, user, institution_id, data_env, board_id)
            else:
                await EduBoardService.require_permission_or_403(db, user, "view", board=board)
            can_edit = False

        inst_name = (
            await db.execute(select(Institution.name).where(Institution.id == institution_id))
        ).scalar_one_or_none() or "PrathamOne Academy"

        ws_token = EduBoardService.mint_ws_token(user, institution_id, data_env, board.id, mode)
        can_publish = can_edit and await EduBoardService.check_permission(db, user, "publish", board=board)
        can_download = await EduBoardService.check_permission(db, user, "download", board=board)

        return {
            "board": board,
            "effective_mode": mode,
            "institution_name": inst_name,
            "teacher_name": board.teacher.full_name if board.teacher else user.full_name,
            "permissions": {
                "can_edit": can_edit,
                "can_publish": can_publish,
                "can_download": can_download,
            },
            "ui_config": {
                "surface": claims.get("surface"),
                "compact_tools": bool(claims.get("compact_tools", mode != "presentation")),
                "show_branding": bool(claims.get("show_branding", True)),
                "hide_toolbar": bool(claims.get("hide_toolbar", mode == "presentation")),
            },
            "ws_token": ws_token,
        }

    @staticmethod
    def mint_ws_token(
        user: User,
        institution_id: int,
        data_env: str,
        board_id: int,
        mode: str = "teacher_edit",
    ) -> str:
        return EduBoardService._encode_scoped_token(
            {
                "type": "eduboard_ws",
                "sub": str(user.id),
                "inst": institution_id,
                "env": data_env,
                "board_id": board_id,
                "mode": mode if mode in EDUBOARD_POPOUT_MODES else "presentation",
            },
            ttl_minutes=60,
        )
