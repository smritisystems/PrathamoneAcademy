# /**
#  * @file        homework_service.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      backend.app.services
#  *
#  * @author      Jawahar R. Mallah
#  * @organization AITDL (AI Technology & Development Lab)
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 AITDL
#  * @license     Proprietary
#  *
#  * @version     1.1.0
#  * @created     2026-11-11
#  * @updated     2026-11-12
#  *
#  * @description Domain service implementing core business logic for Homework & Assignment management, teacher scope authorization, recipient snapshots, late-joiner handling, secure files, submission versioning, evaluation history, notifications, and analytics.
#  */

import hashlib
import json
import os
import re
import uuid
from datetime import datetime, date, timedelta, timezone
from decimal import Decimal
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

from fastapi import UploadFile
from sqlalchemy import and_, asc, desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import get_user_permissions, is_sysadmin
from app.models.attendance import Attendance
from app.models.communication import CommunicationLog
from app.models.division import Division
from app.models.enrollment import StudentEnrollment
from app.models.exam import ExamMark, Examination
from app.models.homework import (
    HomeworkAssignment,
    HomeworkAuditLog,
    HomeworkFile,
    StudentHomeworkRecord,
)
from app.models.portal import TimetableEntry
from app.models.settings import InstitutionSetting
from app.models.staff import TeacherAssignment
from app.models.standard import Standard
from app.models.student import Student
from app.models.subject import Subject
from app.models.teacher_payroll import TeachingSession
from app.models.user import User


import tempfile

DEFAULT_HOMEWORK_UPLOAD_ROOT = Path(__file__).resolve().parents[2] / "uploads" / "homework"
HOMEWORK_UPLOAD_ROOT = Path(os.getenv("HOMEWORK_UPLOAD_ROOT") or DEFAULT_HOMEWORK_UPLOAD_ROOT)


def _get_writable_upload_root() -> Path:
    """Returns configured upload root if writable by the service user, else a writable temp directory."""
    candidates = [HOMEWORK_UPLOAD_ROOT, Path(tempfile.gettempdir()) / "prathamone_uploads" / "homework"]
    for root in candidates:
        try:
            root.mkdir(parents=True, exist_ok=True)
            if os.access(root, os.W_OK):
                return root
        except OSError:
            continue
    return HOMEWORK_UPLOAD_ROOT

DEFAULT_ALLOWED_EXTENSIONS = [
    "pdf",
    "doc",
    "docx",
    "xls",
    "xlsx",
    "ppt",
    "pptx",
    "jpg",
    "jpeg",
    "png",
]

ALLOWED_MIME_PREFIXES = (
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.",
    "application/vnd.ms-excel",
    "application/vnd.ms-powerpoint",
    "image/jpeg",
    "image/png",
    "application/octet-stream",
)

DEFAULT_ASSIGNMENT_TYPES = [
    "homework",
    "classwork",
    "worksheet",
    "project",
    "practice",
    "revision",
    "reading_assignment",
    "test_preparation",
]

ASSIGNMENT_TRANSITIONS: Dict[str, Set[str]] = {
    "draft": {"published", "scheduled", "archived"},
    "scheduled": {"published", "draft", "archived"},
    "published": {"closed", "archived"},
    "closed": {"published", "archived"},
    "archived": {"published"},
}

RECORD_STATUS_SET: Set[str] = {
    "assigned",
    "viewed",
    "in_progress",
    "pending",
    "submitted",
    "late_submitted",
    "not_submitted",
    "overdue",
    "under_evaluation",
    "evaluated",
    "completed",
    "checked",
    "returned",
    "resubmit_required",
    "reopened",
    "excused",
}

STAFF_ADMIN_BYPASS_ROLES = {"admin", "principal", "coordinator"}
ROLE_DEFAULT_HW_ACTIONS: Dict[str, Set[str]] = {
    "admin": {"view", "create", "edit", "publish", "evaluate", "delete", "reports", "settings", "manage_all"},
    "principal": {"view", "create", "edit", "publish", "evaluate", "delete", "reports", "settings", "manage_all"},
    "coordinator": {"view", "create", "edit", "publish", "evaluate", "reports", "manage_all"},
    "teacher": {"view", "create", "edit", "publish", "evaluate", "reports"},
    "staff": {"view", "create", "edit", "reports"},
}


class HomeworkService:

    # ========================================================================
    # PERMISSIONS, SETTINGS & TEACHER SCOPE AUTHORIZATION
    # ========================================================================

    @staticmethod
    async def check_permission(
        db: AsyncSession,
        user: User,
        action: str,
        assignment: Optional[HomeworkAssignment] = None,
    ) -> bool:
        """
        Enforces separated Edit, Delete, Publish, Evaluate, View, Reports, and Settings privileges.
        Uses explicit `homework:*` permissions from DB when configured on the role/user,
        falling back to baseline role defaults when minimal test DBs lack seeded permissions.
        """
        if not user:
            return False
        if is_sysadmin(user):
            return True

        role = (getattr(user, "role", "") or "").strip().lower()
        if role not in ROLE_DEFAULT_HW_ACTIONS:
            return False

        perms = await get_user_permissions(db, user)
        if ("*", "*") in perms or ("homework", "*") in perms:
            return True

        hw_perms = {act for res, act in perms if res == "homework"}
        if hw_perms:
            return action in hw_perms

        # Fallback role defaults if DB role doesn't have seeded homework permission rows
        allowed = ROLE_DEFAULT_HW_ACTIONS.get(role, set())
        if action == "delete" and role == "teacher":
            # Teachers may delete ONLY their own draft assignments unless explicitly granted homework:delete
            return bool(assignment and assignment.status == "draft" and assignment.teacher_user_id == user.id)
        return action in allowed

    @staticmethod
    async def validate_teacher_scope(
        db: AsyncSession,
        user: User,
        institution_id: int,
        standard_id: Optional[int] = None,
        division_id: Optional[int] = None,
        batch_ids: Optional[List[int]] = None,
        subject_id: Optional[int] = None,
        student_ids: Optional[List[int]] = None,
    ) -> None:
        """
        Validates that a teacher is authorized to assign/manage work for the target batches/subjects/students.
        If batch/teacher assignments exist for the teacher or target batch, enforces exact match;
        admins, principals, coordinators, and users with homework:manage_all bypass batch restrictions.
        """
        if is_sysadmin(user):
            return
        role = (getattr(user, "role", "") or "").strip().lower()
        if role in STAFF_ADMIN_BYPASS_ROLES:
            return
        if await HomeworkService.check_permission(db, user, "manage_all"):
            return
        if role != "teacher":
            return

        # Collect teacher's explicit active batch & subject authorizations
        ta_rows = (
            await db.execute(
                select(TeacherAssignment).where(
                    TeacherAssignment.teacher_user_id == user.id,
                    TeacherAssignment.is_active == True,
                )
            )
        ).scalars().all()
        tt_rows = (
            await db.execute(
                select(TimetableEntry).where(
                    TimetableEntry.teacher_id == user.id,
                    TimetableEntry.is_active == True,
                )
            )
        ).scalars().all()
        ct_div_ids = set(
            (
                await db.execute(
                    select(Division.id).where(
                        Division.class_teacher_id == user.id,
                        Division.is_active == True,
                    )
                )
            )
            .scalars()
            .all()
        )
        ts_pairs = set(
            (
                await db.execute(
                    select(TeachingSession.division_id, TeachingSession.subject_id).where(
                        TeachingSession.teacher_user_id == user.id
                    )
                )
            ).all()
        )

        teacher_has_explicit_map = bool(ta_rows or tt_rows or ct_div_ids)
        authorized_div_ids: Set[int] = (
            {r.division_id for r in ta_rows}
            | {r.division_id for r in tt_rows}
            | ct_div_ids
            | {d for d, _ in ts_pairs if d}
        )
        authorized_subj_ids: Set[int] = (
            {r.subject_id for r in ta_rows}
            | {r.subject_id for r in tt_rows}
            | {s for _, s in ts_pairs if s}
        )

        target_divs: List[int] = []
        if division_id:
            target_divs.append(division_id)
        if batch_ids:
            target_divs.extend([b for b in batch_ids if b not in target_divs])

        for d_id in target_divs:
            div_obj = await db.get(Division, d_id)
            if not div_obj:
                raise ValueError(f"Division ID {d_id} not found.")
            # Check if this division itself is locked to another teacher or if teacher has an explicit roster
            other_ta = (
                await db.execute(
                    select(TeacherAssignment.id)
                    .where(
                        TeacherAssignment.division_id == d_id,
                        TeacherAssignment.is_active == True,
                        TeacherAssignment.teacher_user_id != user.id,
                    )
                    .limit(1)
                )
            ).scalar_one_or_none()
            div_has_owner = bool(
                (div_obj.class_teacher_id and div_obj.class_teacher_id != user.id)
                or other_ta is not None
            )
            if (teacher_has_explicit_map or div_has_owner) and d_id not in authorized_div_ids:
                raise PermissionError(
                    f"Teacher is not authorized to assign homework to batch '{div_obj.name}'."
                )

        if subject_id and teacher_has_explicit_map and authorized_subj_ids:
            # Class teachers can oversee subjects in their class, otherwise require subject authorization
            is_class_teacher_for_all_targets = bool(target_divs) and all(d in ct_div_ids for d in target_divs)
            if not is_class_teacher_for_all_targets and subject_id not in authorized_subj_ids:
                subj_other = (
                    await db.execute(
                        select(TeacherAssignment.id)
                        .where(
                            TeacherAssignment.subject_id == subject_id,
                            TeacherAssignment.is_active == True,
                        )
                        .limit(1)
                    )
                ).scalar_one_or_none()
                if subj_other is not None or authorized_subj_ids:
                    raise PermissionError("Teacher is not authorized for the selected subject.")

        if student_ids and target_divs:
            # Verify students actually belong to the authorized batch/institution
            enr_divs = (
                await db.execute(
                    select(StudentEnrollment.division_id).where(
                        StudentEnrollment.student_id.in_(student_ids),
                        StudentEnrollment.status == "active",
                    )
                )
            ).scalars().all()
            for ed in enr_divs:
                if teacher_has_explicit_map and ed and ed not in authorized_div_ids:
                    raise PermissionError("One or more selected students belong to an unauthorized batch.")

    @staticmethod
    async def get_homework_settings(db: AsyncSession, institution_id: int) -> Dict[str, Any]:
        """Loads institutional homework configuration from SSOT InstitutionSetting with safe defaults."""
        defaults: Dict[str, Any] = {
            "allowed_extensions": list(DEFAULT_ALLOWED_EXTENSIONS),
            "max_file_size_mb": 10,
            "custom_assignment_types": [],
            "default_late_joiner_policy": "manual",
            "reminder_hours_before_due": 24,
            "pending_eval_alert_threshold": 5,
            "allow_parent_portal_view": True,
        }
        rows = (
            await db.execute(
                select(InstitutionSetting).where(
                    InstitutionSetting.institution_id == institution_id,
                    InstitutionSetting.category == "homework",
                )
            )
        ).scalars().all()

        for row in rows:
            val: Any = row.value
            if row.data_type == "json" or (isinstance(val, str) and val.startswith("[")):
                try:
                    val = json.loads(val)
                except Exception:
                    pass
            elif row.data_type == "int":
                try:
                    val = int(val)
                except Exception:
                    pass
            elif row.data_type == "bool":
                val = str(val).lower() in ("true", "1", "yes")
            defaults[row.key] = val

        # Always merge configured custom assignment types with core list for consumers
        custom_types = [
            re.sub(r"[^a-z0-9_]+", "_", str(t).strip().lower()).strip("_")
            for t in (defaults.get("custom_assignment_types") or [])
            if str(t).strip()
        ]
        defaults["custom_assignment_types"] = custom_types
        defaults["available_assignment_types"] = DEFAULT_ASSIGNMENT_TYPES + [
            t for t in custom_types if t not in DEFAULT_ASSIGNMENT_TYPES
        ]
        return defaults

    @staticmethod
    async def update_homework_settings(
        db: AsyncSession,
        institution_id: int,
        updates: Dict[str, Any],
        actor_user_id: int,
    ) -> Dict[str, Any]:
        """Persists institutional homework settings into SSOT InstitutionSetting."""
        for key, raw_val in updates.items():
            if raw_val is None:
                continue
            if isinstance(raw_val, (list, dict)):
                data_type = "json"
                serialized = json.dumps(raw_val)
            elif isinstance(raw_val, bool):
                data_type = "bool"
                serialized = "true" if raw_val else "false"
            elif isinstance(raw_val, int):
                data_type = "int"
                serialized = str(raw_val)
            else:
                data_type = "string"
                serialized = str(raw_val).strip()

            existing = (
                await db.execute(
                    select(InstitutionSetting).where(
                        InstitutionSetting.institution_id == institution_id,
                        InstitutionSetting.category == "homework",
                        InstitutionSetting.key == key,
                    )
                )
            ).scalar_one_or_none()
            if existing:
                existing.value = serialized
                existing.data_type = data_type
            else:
                db.add(
                    InstitutionSetting(
                        institution_id=institution_id,
                        category="homework",
                        key=key,
                        value=serialized,
                        data_type=data_type,
                        label=key.replace("_", " ").title(),
                    )
                )

        await db.commit()
        return await HomeworkService.get_homework_settings(db, institution_id)

    # ========================================================================
    # NOTIFICATION ENGINE INTEGRATION (SSOT CommunicationLog)
    # ========================================================================

    @staticmethod
    async def notify_homework_event(
        db: AsyncSession,
        institution_id: int,
        recipient_type: str,  # STUDENT | TEACHER
        recipient_id: int,
        recipient_name: str,
        template_code: str,
        subject: str,
        message: str,
        dedup_key: str,
        sender_user: Optional[User] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> bool:
        """
        Writes a deduplicated in-app notification into the canonical CommunicationLog table.
        Prevents duplicate alerts for identical (institution, template_code, dedup_key).
        """
        existing = (
            await db.execute(
                select(CommunicationLog.id).where(
                    CommunicationLog.institution_id == institution_id,
                    CommunicationLog.channel == "IN_APP",
                    CommunicationLog.recipient_type == recipient_type,
                    CommunicationLog.recipient_id == recipient_id,
                    CommunicationLog.template_code == template_code,
                    CommunicationLog.metadata_json.like(f'%"dedup_key": "{dedup_key}"%'),
                )
                .limit(1)
            )
        ).scalar_one_or_none()
        if existing is not None:
            return False

        meta_payload = dict(metadata or {})
        meta_payload["dedup_key"] = dedup_key
        meta_payload["is_read"] = False

        sender_name = (
            f"{sender_user.first_name} {sender_user.last_name}".strip()
            if sender_user
            else "PrathamOne Academic System"
        )
        log = CommunicationLog(
            institution_id=institution_id,
            channel="IN_APP",
            recipient_type=recipient_type,
            recipient_id=recipient_id,
            recipient_name=(recipient_name or "User")[:150],
            recipient_destination="in_app",
            template_code=template_code[:50],
            subject=subject[:255],
            content=message,
            status="DELIVERED",
            metadata_json=json.dumps(meta_payload),
            sender_id=sender_user.id if sender_user else None,
            sender_name=sender_name[:100],
            sent_at=datetime.now(timezone.utc),
        )
        db.add(log)
        return True

    @staticmethod
    async def _notify_assignment_students(
        db: AsyncSession,
        assignment: HomeworkAssignment,
        records: List[StudentHomeworkRecord],
        template_code: str,
        subject: str,
        message: str,
        dedup_suffix: str,
        sender_user: Optional[User] = None,
    ) -> int:
        if not records:
            return 0
        student_ids = [r.student_id for r in records]
        stu_rows = (
            await db.execute(
                select(Student.id, Student.first_name, Student.last_name).where(Student.id.in_(student_ids))
            )
        ).all()
        name_map = {sid: f"{fn} {ln}".strip() for sid, fn, ln in stu_rows}

        sent = 0
        for r in records:
            created = await HomeworkService.notify_homework_event(
                db=db,
                institution_id=assignment.institution_id,
                recipient_type="STUDENT",
                recipient_id=r.student_id,
                recipient_name=name_map.get(r.student_id, f"Student #{r.student_id}"),
                template_code=template_code,
                subject=subject,
                message=message,
                dedup_key=f"{template_code}:{assignment.id}:{r.id}:{dedup_suffix}",
                sender_user=sender_user,
                metadata={"assignment_id": assignment.id, "record_id": r.id, "assignment_code": assignment.assignment_code},
            )
            if created:
                sent += 1
        return sent

    # ========================================================================
    # SECURE ATTACHMENT STORAGE
    # ========================================================================

    @staticmethod
    async def save_homework_file(
        db: AsyncSession,
        institution_id: int,
        uploader_user: User,
        upload: UploadFile,
        context: str = "assignment_attachment",
        assignment_id: Optional[int] = None,
        student_record_id: Optional[int] = None,
    ) -> HomeworkFile:
        """
        Validates file extension, MIME type, size cap, and persists uploaded document cleanly on disk.
        """
        hw_settings = await HomeworkService.get_homework_settings(db, institution_id)
        allowed_exts = {str(e).lower().lstrip(".") for e in hw_settings.get("allowed_extensions", DEFAULT_ALLOWED_EXTENSIONS)}
        max_bytes = int(hw_settings.get("max_file_size_mb", 10)) * 1024 * 1024

        orig_name = Path(upload.filename or "upload.bin").name
        safe_base = re.sub(r"[^A-Za-z0-9._-]+", "_", orig_name).strip("._") or "attachment"
        ext = Path(safe_base).suffix.lower().lstrip(".")
        if not ext or ext not in allowed_exts:
            raise ValueError(
                f"File extension '.{ext or 'none'}' is not permitted. Allowed formats: {', '.join(sorted(allowed_exts))}."
            )

        mime = (upload.content_type or "application/octet-stream").lower().strip()
        if not any(mime.startswith(prefix) for prefix in ALLOWED_MIME_PREFIXES):
            raise ValueError(f"Unsupported MIME type '{mime}'.")

        content = await upload.read(max_bytes + 1)
        if not content:
            raise ValueError("Uploaded file is empty.")
        if len(content) > max_bytes:
            raise ValueError(f"File exceeds maximum allowed size of {hw_settings.get('max_file_size_mb', 10)} MB.")

        checksum = hashlib.sha256(content).hexdigest()
        inst_dir = _get_writable_upload_root() / str(institution_id)
        inst_dir.mkdir(parents=True, exist_ok=True)
        stored_name = f"{uuid.uuid4().hex}_{safe_base}"
        dest_path = inst_dir / stored_name

        with open(dest_path, "wb") as fp:
            fp.write(content)

        hw_file = HomeworkFile(
            institution_id=institution_id,
            assignment_id=assignment_id,
            student_record_id=student_record_id,
            uploader_user_id=uploader_user.id,
            context=context,
            original_filename=orig_name[:255],
            stored_filename=stored_name[:255],
            storage_path=str(dest_path),
            mime_type=mime[:150],
            extension=ext[:20],
            file_size_bytes=len(content),
            sha256_checksum=checksum,
        )
        db.add(hw_file)
        await db.commit()
        await db.refresh(hw_file)
        return hw_file

    # ========================================================================
    # ASSIGNMENT CREATION, RECIPIENT RESOLUTION, LIFECYCLE & LATE JOINERS
    # ========================================================================

    @staticmethod
    async def generate_assignment_code(db: AsyncSession, institution_id: int) -> str:
        """
        Generates unique, sequential assignment code: HW-YYYY-XXXX with collision safety.
        """
        curr_year = date.today().year
        prefix = f"HW-{curr_year}-"

        stmt = (
            select(HomeworkAssignment.assignment_code)
            .where(HomeworkAssignment.assignment_code.like(f"{prefix}%"))
            .order_by(desc(HomeworkAssignment.id))
            .limit(1)
        )
        res = await db.execute(stmt)
        last_code = res.scalar_one_or_none()

        if last_code:
            try:
                num = int(last_code.replace(prefix, "")) + 1
            except ValueError:
                num = 1
        else:
            num = 1

        while True:
            candidate = f"{prefix}{num:04d}"
            exists_stmt = select(HomeworkAssignment.id).where(HomeworkAssignment.assignment_code == candidate)
            exists = (await db.execute(exists_stmt)).scalar_one_or_none()
            if not exists:
                return candidate
            num += 1

    @staticmethod
    async def preview_recipients(
        db: AsyncSession,
        institution_id: int,
        academic_year_id: int,
        standard_id: int,
        recipient_type: str = "batch",
        division_id: Optional[int] = None,
        recipient_batch_ids: Optional[List[int]] = None,
        selected_student_ids: Optional[List[int]] = None,
    ) -> Dict[str, Any]:
        """Resolves eligible active students before publishing for review and recipient count verification."""
        dummy = HomeworkAssignment(
            institution_id=institution_id,
            academic_year_id=academic_year_id,
            standard_id=standard_id,
            subject_id=1,
            teacher_user_id=1,
            assignment_code="PREVIEW",
            title="Preview",
            due_date=date.today(),
            division_id=division_id,
            recipient_type=recipient_type,
            recipient_batch_ids=json.dumps(recipient_batch_ids) if recipient_batch_ids else None,
        )
        enrollments = await HomeworkService.resolve_recipients(db, dummy, selected_student_ids)
        if not enrollments:
            return {"count": 0, "students": []}

        stu_ids = [e.student_id for e in enrollments]
        div_ids = [e.division_id for e in enrollments if e.division_id]
        stu_map = {
            s.id: s
            for s in (
                await db.execute(select(Student).where(Student.id.in_(stu_ids)))
            ).scalars().all()
        }
        div_map = (
            {
                d.id: d.name
                for d in (
                    await db.execute(select(Division).where(Division.id.in_(div_ids)))
                ).scalars().all()
            }
            if div_ids
            else {}
        )

        students = []
        for e in enrollments:
            st = stu_map.get(e.student_id)
            if not st:
                continue
            students.append({
                "student_id": st.id,
                "enrollment_id": e.id,
                "student_name": f"{st.first_name} {st.last_name}".strip(),
                "admission_number": st.admission_number,
                "roll_number": e.roll_number or "—",
                "division_id": e.division_id,
                "division_name": div_map.get(e.division_id, "Standard-Wide"),
            })
        students.sort(key=lambda x: (x["roll_number"], x["student_name"]))
        return {"count": len(students), "students": students}

    @staticmethod
    async def create_assignment(
        db: AsyncSession,
        payload: Dict[str, Any],
        actor_user_id: int,
        institution_id: int = 1,
        actor_user: Optional[User] = None,
    ) -> HomeworkAssignment:
        """
        Creates a new homework/assignment (draft, scheduled, or published).
        Provisions independent StudentHomeworkRecord rows with zero duplicates and optional per-student overrides.
        """
        assignment_code = payload.get("assignment_code") or await HomeworkService.generate_assignment_code(
            db, institution_id
        )

        recipient_type = payload.get("recipient_type", "batch")
        recipient_batch_ids = payload.get("recipient_batch_ids")
        if isinstance(recipient_batch_ids, list):
            recipient_batch_ids_str = json.dumps(recipient_batch_ids)
        elif isinstance(recipient_batch_ids, str):
            recipient_batch_ids_str = recipient_batch_ids
        else:
            recipient_batch_ids_str = None

        attachments = payload.get("attachments")
        if isinstance(attachments, list):
            attachments_str = json.dumps(attachments)
        elif isinstance(attachments, str):
            attachments_str = attachments
        else:
            attachments_str = None

        target_status = (payload.get("status") or "published").strip().lower()
        now_utc = datetime.now(timezone.utc)

        assignment = HomeworkAssignment(
            institution_id=institution_id,
            academic_year_id=payload["academic_year_id"],
            board_id=payload.get("board_id"),
            standard_id=payload["standard_id"],
            subject_id=payload["subject_id"],
            subject_mapping_id=payload.get("subject_mapping_id"),
            division_id=payload.get("division_id"),
            teaching_session_id=payload.get("teaching_session_id"),
            teacher_user_id=payload["teacher_user_id"],
            assignment_code=assignment_code,
            assignment_type=(payload.get("assignment_type") or "homework").strip().lower(),
            estimated_duration_minutes=payload.get("estimated_duration_minutes"),
            title=payload["title"].strip(),
            description=payload.get("description", "").strip() if payload.get("description") else None,
            instructions=payload.get("instructions", "").strip() if payload.get("instructions") else None,
            chapter=payload.get("chapter", "").strip() if payload.get("chapter") else None,
            topic=payload.get("topic", "").strip() if payload.get("topic") else None,
            assigned_date=payload.get("assigned_date") or date.today(),
            due_date=payload["due_date"],
            due_time=payload.get("due_time", "23:59"),
            max_marks=Decimal(str(payload["max_marks"])) if payload.get("max_marks") is not None else None,
            difficulty_level=payload.get("difficulty_level", "medium"),
            priority=payload.get("priority", "normal"),
            submission_method=payload.get("submission_method", "physical_notebook"),
            recipient_type=recipient_type,
            recipient_batch_ids=recipient_batch_ids_str,
            late_joiner_policy=payload.get("late_joiner_policy", "manual"),
            status=target_status,
            publish_at=payload.get("publish_at"),
            published_at=now_utc if target_status == "published" else None,
            attachments=attachments_str,
            allow_late_submissions=payload.get("allow_late_submissions", True),
            allow_resubmission=payload.get("allow_resubmission", True),
            is_template=payload.get("is_template", False),
            template_name=payload.get("template_name"),
            created_by_id=actor_user_id,
        )

        db.add(assignment)
        await db.flush()

        # Bind uploaded HomeworkFile rows belonging to this assignment if referenced
        await HomeworkService._bind_file_urls_to_assignment(
            db, assignment.id, None, attachments if isinstance(attachments, list) else []
        )

        resolved_students = await HomeworkService.resolve_recipients(
            db, assignment, payload.get("selected_student_ids")
        )
        overrides_map = {
            int(ov["student_id"]): ov
            for ov in (payload.get("student_overrides") or [])
            if ov.get("student_id")
        }

        created_records: List[StudentHomeworkRecord] = []
        for enrollment in resolved_students:
            ov = overrides_map.get(enrollment.student_id, {})
            custom_att = ov.get("attachments")
            custom_att_str = json.dumps(custom_att) if isinstance(custom_att, list) else None
            record = StudentHomeworkRecord(
                institution_id=institution_id,
                assignment_id=assignment.id,
                student_id=enrollment.student_id,
                enrollment_id=enrollment.id,
                division_id=enrollment.division_id,
                publication_time=now_utc,
                individual_due_date=ov.get("due_date") or assignment.due_date,
                individual_due_time=ov.get("due_time") or assignment.due_time,
                custom_instructions=ov.get("instructions"),
                custom_attachments=custom_att_str,
                status="assigned",
                submission_status="pending",
                review_status="pending",
            )
            db.add(record)
            created_records.append(record)

        await db.flush()
        for rec in created_records:
            if rec.custom_attachments:
                try:
                    c_atts = json.loads(rec.custom_attachments)
                    if isinstance(c_atts, list):
                        await HomeworkService._bind_file_urls_to_assignment(db, assignment.id, rec.id, c_atts)
                except Exception:
                    pass
        assignment.original_recipient_count = len(created_records)

        audit = HomeworkAuditLog(
            assignment_id=assignment.id,
            actor_user_id=actor_user_id,
            action="created" if target_status != "draft" else "created_draft",
            previous_status=None,
            new_status=assignment.status,
            details=f"{assignment.assignment_type.title()} {assignment.assignment_code} created ({target_status}) with {len(created_records)} recipients.",
        )
        db.add(audit)

        # Notify students immediately upon publish
        if target_status == "published" and created_records:
            await HomeworkService._notify_assignment_students(
                db=db,
                assignment=assignment,
                records=created_records,
                template_code="HW_PUBLISHED",
                subject=f"New {assignment.assignment_type.replace('_', ' ').title()}: {assignment.title}",
                message=f"'{assignment.title}' ({assignment.assignment_code}) has been published. Due on {assignment.due_date} at {assignment.due_time}.",
                dedup_suffix="initial_publish",
                sender_user=actor_user,
            )

        await db.commit()
        await db.refresh(assignment)
        return assignment

    @staticmethod
    async def _bind_file_urls_to_assignment(
        db: AsyncSession,
        assignment_id: int,
        record_id: Optional[int],
        attachments: List[Dict[str, Any]],
    ) -> None:
        """Links uploaded HomeworkFile rows referenced by ID or URL to their assignment/record."""
        if not attachments:
            return
        file_ids: List[int] = []
        for att in attachments:
            raw_id = att.get("file_id") or att.get("id")
            if raw_id is not None:
                try:
                    file_ids.append(int(raw_id))
                    continue
                except (TypeError, ValueError):
                    pass
            url = str(att.get("file_url") or "")
            m = re.search(r"/homework/files/(\d+)/download", url)
            if m:
                file_ids.append(int(m.group(1)))
        if not file_ids:
            return
        rows = (
            await db.execute(select(HomeworkFile).where(HomeworkFile.id.in_(file_ids)))
        ).scalars().all()
        for f in rows:
            if f.assignment_id is None:
                f.assignment_id = assignment_id
            if record_id is not None and f.student_record_id is None:
                f.student_record_id = record_id

    @staticmethod
    async def publish_assignment(
        db: AsyncSession,
        assignment: HomeworkAssignment,
        actor_user: User,
        selected_student_ids: Optional[List[int]] = None,
        student_overrides: Optional[List[Dict[str, Any]]] = None,
    ) -> HomeworkAssignment:
        """Publishes a draft or scheduled assignment, snapshots recipients, and notifies students."""
        prev_status = assignment.status
        if prev_status == "published":
            return assignment
        if "published" not in ASSIGNMENT_TRANSITIONS.get(prev_status, set()):
            raise ValueError(f"Cannot publish assignment from status '{prev_status}'.")

        now_utc = datetime.now(timezone.utc)
        existing_records = (
            await db.execute(
                select(StudentHomeworkRecord).where(StudentHomeworkRecord.assignment_id == assignment.id)
            )
        ).scalars().all()
        existing_stu_ids = {r.student_id for r in existing_records}

        # Provision records if draft was created with 0 records or new students specified
        resolved = await HomeworkService.resolve_recipients(db, assignment, selected_student_ids)
        overrides_map = {
            int(ov["student_id"]): ov
            for ov in (student_overrides or [])
            if ov.get("student_id")
        }

        newly_created: List[StudentHomeworkRecord] = []
        for enr in resolved:
            if enr.student_id in existing_stu_ids:
                continue
            ov = overrides_map.get(enr.student_id, {})
            custom_att = ov.get("attachments")
            rec = StudentHomeworkRecord(
                institution_id=assignment.institution_id,
                assignment_id=assignment.id,
                student_id=enr.student_id,
                enrollment_id=enr.id,
                division_id=enr.division_id,
                publication_time=now_utc,
                individual_due_date=ov.get("due_date") or assignment.due_date,
                individual_due_time=ov.get("due_time") or assignment.due_time,
                custom_instructions=ov.get("instructions"),
                custom_attachments=json.dumps(custom_att) if isinstance(custom_att, list) else None,
                status="assigned",
                submission_status="pending",
                review_status="pending",
            )
            db.add(rec)
            newly_created.append(rec)

        await db.flush()
        for rec in newly_created:
            if rec.custom_attachments:
                try:
                    c_atts = json.loads(rec.custom_attachments)
                    if isinstance(c_atts, list):
                        await HomeworkService._bind_file_urls_to_assignment(db, assignment.id, rec.id, c_atts)
                except Exception:
                    pass
        all_records = existing_records + newly_created
        if assignment.original_recipient_count == 0:
            assignment.original_recipient_count = len(all_records)
        assignment.status = "published"
        assignment.published_at = now_utc

        db.add(
            HomeworkAuditLog(
                assignment_id=assignment.id,
                actor_user_id=actor_user.id,
                action="published",
                previous_status=prev_status,
                new_status="published",
                details=f"Published to {len(all_records)} students.",
            )
        )

        await HomeworkService._notify_assignment_students(
            db=db,
            assignment=assignment,
            records=all_records,
            template_code="HW_PUBLISHED",
            subject=f"New Assignment: {assignment.title}",
            message=f"'{assignment.title}' ({assignment.assignment_code}) is now published. Due on {assignment.due_date}.",
            dedup_suffix="publish",
            sender_user=actor_user,
        )
        await db.commit()
        await db.refresh(assignment)
        return assignment

    @staticmethod
    async def transition_assignment_status(
        db: AsyncSession,
        assignment: HomeworkAssignment,
        target_status: str,
        actor_user: User,
        reason: Optional[str] = None,
        new_due_date: Optional[date] = None,
    ) -> HomeworkAssignment:
        """Validates and executes assignment status transitions (close, reopen, archive)."""
        target = target_status.strip().lower()
        prev = assignment.status
        if target == prev:
            return assignment
        if target not in ASSIGNMENT_TRANSITIONS.get(prev, set()):
            raise ValueError(f"Invalid assignment status transition: '{prev}' -> '{target}'.")

        now_utc = datetime.now(timezone.utc)
        assignment.status = target
        if target == "closed":
            assignment.closed_at = now_utc
        elif target == "published":
            assignment.closed_at = None
            if new_due_date:
                assignment.due_date = new_due_date

        db.add(
            HomeworkAuditLog(
                assignment_id=assignment.id,
                actor_user_id=actor_user.id,
                action=f"status_{target}",
                previous_status=prev,
                new_status=target,
                details=reason or f"Assignment transitioned from {prev} to {target}.",
            )
        )

        if prev == "closed" and target == "published":
            records = (
                await db.execute(
                    select(StudentHomeworkRecord).where(StudentHomeworkRecord.assignment_id == assignment.id)
                )
            ).scalars().all()
            await HomeworkService._notify_assignment_students(
                db=db,
                assignment=assignment,
                records=records,
                template_code="HW_REOPENED",
                subject=f"Assignment Reopened: {assignment.title}",
                message=f"'{assignment.title}' ({assignment.assignment_code}) has been reopened. Due date: {assignment.due_date}.",
                dedup_suffix=f"reopen_{now_utc.strftime('%Y%m%d%H%M')}",
                sender_user=actor_user,
            )

        await db.commit()
        await db.refresh(assignment)
        return assignment

    @staticmethod
    async def sync_late_joiners(
        db: AsyncSession,
        assignment: HomeworkAssignment,
        actor_user_id: Optional[int],
        student_ids: Optional[List[int]] = None,
        reason: str = "Late batch enrollment inclusion",
        sender_user: Optional[User] = None,
    ) -> Dict[str, Any]:
        """
        Adds eligible newly-joined students to an existing published batch assignment
        while preserving `original_recipient_count` snapshot and logging `is_late_addition=True`.
        """
        existing_stu_ids = set(
            (
                await db.execute(
                    select(StudentHomeworkRecord.student_id).where(
                        StudentHomeworkRecord.assignment_id == assignment.id
                    )
                )
            )
            .scalars()
            .all()
        )
        resolved = await HomeworkService.resolve_recipients(db, assignment, student_ids)
        now_utc = datetime.now(timezone.utc)
        added_records: List[StudentHomeworkRecord] = []

        for enr in resolved:
            if enr.student_id in existing_stu_ids:
                continue
            existing_stu_ids.add(enr.student_id)
            rec = StudentHomeworkRecord(
                institution_id=assignment.institution_id,
                assignment_id=assignment.id,
                student_id=enr.student_id,
                enrollment_id=enr.id,
                division_id=enr.division_id,
                publication_time=now_utc,
                individual_due_date=assignment.due_date,
                individual_due_time=assignment.due_time,
                is_late_addition=True,
                addition_reason=reason[:255],
                status="assigned",
                submission_status="pending",
                review_status="pending",
            )
            db.add(rec)
            added_records.append(rec)

        await db.flush()

        if added_records:
            db.add(
                HomeworkAuditLog(
                    assignment_id=assignment.id,
                    actor_user_id=actor_user_id,
                    action="late_joiners_added",
                    previous_status=assignment.status,
                    new_status=assignment.status,
                    details=f"Added {len(added_records)} late-joined student(s). Reason: {reason}. Original snapshot preserved ({assignment.original_recipient_count}).",
                )
            )
            await HomeworkService._notify_assignment_students(
                db=db,
                assignment=assignment,
                records=added_records,
                template_code="HW_PUBLISHED",
                subject=f"New Assignment Added: {assignment.title}",
                message=f"You have been included in '{assignment.title}' ({assignment.assignment_code}). Due on {assignment.due_date}.",
                dedup_suffix="late_joiner",
                sender_user=sender_user,
            )

        await db.commit()
        return {
            "assignment_id": assignment.id,
            "original_recipient_count": assignment.original_recipient_count,
            "added_count": len(added_records),
            "added_student_ids": [r.student_id for r in added_records],
        }

    @staticmethod
    async def apply_late_joiner_policy_for_enrollment(
        db: AsyncSession,
        enrollment: StudentEnrollment,
        actor_user: Optional[User] = None,
    ) -> int:
        """
        Called when a new student joins or transfers into a batch.
        Automatically attaches active published batch assignments configured with `late_joiner_policy == 'auto_include'`
        while preserving original snapshots and historical records intact.
        """
        if not enrollment.division_id or enrollment.status != "active":
            return 0
        std = await db.get(Standard, enrollment.standard_id)
        inst_id = std.institution_id if std else 1

        stmt = select(HomeworkAssignment).where(
            HomeworkAssignment.institution_id == inst_id,
            HomeworkAssignment.academic_year_id == enrollment.academic_year_id,
            HomeworkAssignment.status == "published",
            HomeworkAssignment.late_joiner_policy == "auto_include",
            HomeworkAssignment.due_date >= date.today(),
            or_(
                HomeworkAssignment.division_id == enrollment.division_id,
                HomeworkAssignment.recipient_batch_ids.like(f"%{enrollment.division_id}%"),
            ),
        )
        assignments = (await db.execute(stmt)).scalars().all()
        added_total = 0
        for hw in assignments:
            # Verify division match cleanly for multi_batch JSON arrays
            if hw.division_id != enrollment.division_id:
                try:
                    batch_list = json.loads(hw.recipient_batch_ids or "[]")
                    if not isinstance(batch_list, list) or enrollment.division_id not in batch_list:
                        continue
                except Exception:
                    continue
            res = await HomeworkService.sync_late_joiners(
                db=db,
                assignment=hw,
                actor_user_id=actor_user.id if actor_user else None,
                student_ids=[enrollment.student_id],
                reason="Auto-included via batch enrollment policy",
                sender_user=actor_user,
            )
            added_total += res["added_count"]
        return added_total

    @staticmethod
    async def resolve_recipients(
        db: AsyncSession,
        assignment: HomeworkAssignment,
        selected_student_ids: Optional[List[int]] = None,
    ) -> List[StudentEnrollment]:
        """
        Resolves active student enrollments for an assignment with strict zero-duplicate guarantee.
        Supports: batch, multi_batch, selected_group (batch subset), selected_students, individual_student.
        """
        recipient_type = assignment.recipient_type

        # 1. Individual / Selected Students / Selected Group
        if (
            recipient_type in ("selected_students", "individual_student", "selected_group", "student_group")
            or selected_student_ids
        ):
            if not selected_student_ids:
                return []
            conditions = [
                StudentEnrollment.student_id.in_(selected_student_ids),
                StudentEnrollment.academic_year_id == assignment.academic_year_id,
                StudentEnrollment.status == "active",
                Student.is_active == True,
                Student.institution_id == assignment.institution_id,
            ]
            if recipient_type == "selected_group" and assignment.division_id:
                conditions.append(StudentEnrollment.division_id == assignment.division_id)
            stmt = (
                select(StudentEnrollment)
                .join(Student, StudentEnrollment.student_id == Student.id)
                .where(and_(*conditions))
            )
            enrollments = (await db.execute(stmt)).scalars().all()
            seen_students: Set[int] = set()
            deduped = []
            for e in enrollments:
                if e.student_id not in seen_students:
                    seen_students.add(e.student_id)
                    deduped.append(e)
            return deduped

        # 2. Multi-batch
        if recipient_type == "multi_batch" and assignment.recipient_batch_ids:
            try:
                batch_ids = json.loads(assignment.recipient_batch_ids)
                if not isinstance(batch_ids, list):
                    batch_ids = []
            except Exception:
                batch_ids = []
            if not batch_ids and assignment.division_id:
                batch_ids = [assignment.division_id]

            stmt = (
                select(StudentEnrollment)
                .join(Student, StudentEnrollment.student_id == Student.id)
                .where(
                    and_(
                        StudentEnrollment.division_id.in_(batch_ids),
                        StudentEnrollment.academic_year_id == assignment.academic_year_id,
                        StudentEnrollment.status == "active",
                        Student.is_active == True,
                        Student.institution_id == assignment.institution_id,
                    )
                )
            )
            enrollments = (await db.execute(stmt)).scalars().all()
            seen_students = set()
            deduped = []
            for e in enrollments:
                if e.student_id not in seen_students:
                    seen_students.add(e.student_id)
                    deduped.append(e)
            return deduped

        # 3. Single Batch (Default)
        if assignment.division_id:
            stmt = (
                select(StudentEnrollment)
                .join(Student, StudentEnrollment.student_id == Student.id)
                .where(
                    and_(
                        StudentEnrollment.division_id == assignment.division_id,
                        StudentEnrollment.academic_year_id == assignment.academic_year_id,
                        StudentEnrollment.status == "active",
                        Student.is_active == True,
                        Student.institution_id == assignment.institution_id,
                    )
                )
            )
            enrollments = (await db.execute(stmt)).scalars().all()
            seen_students = set()
            deduped = []
            for e in enrollments:
                if e.student_id not in seen_students:
                    seen_students.add(e.student_id)
                    deduped.append(e)
            return deduped

        # 4. Standard-wide (if no specific division)
        stmt = (
            select(StudentEnrollment)
            .join(Student, StudentEnrollment.student_id == Student.id)
            .where(
                and_(
                    StudentEnrollment.standard_id == assignment.standard_id,
                    StudentEnrollment.academic_year_id == assignment.academic_year_id,
                    StudentEnrollment.status == "active",
                    Student.is_active == True,
                    Student.institution_id == assignment.institution_id,
                )
            )
        )
        enrollments = (await db.execute(stmt)).scalars().all()
        seen_students = set()
        deduped = []
        for e in enrollments:
            if e.student_id not in seen_students:
                seen_students.add(e.student_id)
                deduped.append(e)
        return deduped

    # ========================================================================
    # EVALUATION & CHECKING REGISTER
    # ========================================================================

    @staticmethod
    async def check_physical_homework(
        db: AsyncSession,
        assignment_id: int,
        items: List[Dict[str, Any]],
        reviewer_user_id: int,
        reviewer_user: Optional[User] = None,
    ) -> Dict[str, Any]:
        """
        Executes physical homework checking and digital evaluation operations.
        Validates marks against assignment max_marks, preserves evaluation_history & audit logs,
        and notifies evaluated students without duplicates.
        """
        assignment = (
            await db.execute(select(HomeworkAssignment).where(HomeworkAssignment.id == assignment_id))
        ).scalar_one_or_none()
        if not assignment:
            raise ValueError(f"Homework Assignment ID {assignment_id} not found.")

        updated_count = 0
        now = datetime.now(timezone.utc)
        reviewer_name = (
            f"{reviewer_user.first_name} {reviewer_user.last_name}".strip()
            if reviewer_user
            else f"User #{reviewer_user_id}"
        )

        evaluated_records: List[StudentHomeworkRecord] = []

        for item in items:
            record_id = item.get("record_id")
            student_id = item.get("student_id")
            review_status = item.get("review_status", "done")
            remarks = item.get("teacher_remarks")
            marks = item.get("marks_obtained")
            exemption_reason = item.get("exemption_reason")
            feedback_attachments = item.get("teacher_feedback_attachments")
            correction_requested = bool(item.get("correction_requested", False))

            if marks is not None:
                marks_dec = Decimal(str(marks))
                if marks_dec < Decimal("0"):
                    raise ValueError("Marks obtained cannot be negative.")
                if assignment.max_marks is not None and marks_dec > assignment.max_marks:
                    raise ValueError(
                        f"Marks obtained ({marks_dec}) cannot exceed maximum marks ({assignment.max_marks})."
                    )
            else:
                marks_dec = None

            rec_stmt = select(StudentHomeworkRecord).where(
                and_(
                    StudentHomeworkRecord.assignment_id == assignment_id,
                    or_(
                        StudentHomeworkRecord.id == record_id if record_id else False,
                        StudentHomeworkRecord.student_id == student_id if student_id else False,
                    ),
                )
            )
            record = (await db.execute(rec_stmt)).scalar_one_or_none()
            if not record:
                continue

            prev_status = record.status
            prev_review = record.review_status

            record.review_status = review_status
            record.reviewed_by_id = reviewer_user_id
            record.reviewed_at = now
            if remarks is not None:
                record.teacher_remarks = remarks
            if marks is not None:
                record.marks_obtained = marks_dec
            if feedback_attachments is not None:
                record.teacher_feedback_attachments = (
                    json.dumps(feedback_attachments)
                    if isinstance(feedback_attachments, list)
                    else str(feedback_attachments)
                )

            if review_status in ("done", "evaluated", "checked"):
                record.status = "evaluated" if review_status == "evaluated" else "completed"
                record.submission_status = "submitted" if record.submission_status == "pending" else record.submission_status
            elif review_status == "under_evaluation":
                record.status = "under_evaluation"
            elif review_status == "returned":
                record.status = "returned"
                record.submission_status = "pending"
            elif review_status == "incomplete" or correction_requested:
                record.status = "resubmit_required"
            elif review_status == "not_done":
                record.status = "not_submitted"
                record.submission_status = "not_submitted"
            elif review_status == "absent_not_checked":
                record.status = "assigned"
            elif review_status == "excused":
                record.status = "excused"
                record.submission_status = "excused"
                if exemption_reason:
                    record.exemption_reason = exemption_reason

            # Append immutable evaluation history snapshot
            try:
                eval_hist = json.loads(record.evaluation_history) if record.evaluation_history else []
            except Exception:
                eval_hist = []
            eval_hist.append({
                "evaluator_id": reviewer_user_id,
                "evaluator_name": reviewer_name,
                "evaluated_at": now.isoformat(),
                "review_status": record.review_status,
                "status": record.status,
                "marks_obtained": float(marks_dec) if marks_dec is not None else None,
                "max_marks": float(assignment.max_marks) if assignment.max_marks is not None else None,
                "teacher_remarks": remarks,
                "feedback_attachments": feedback_attachments or [],
                "correction_requested": correction_requested,
            })
            record.evaluation_history = json.dumps(eval_hist)

            db.add(
                HomeworkAuditLog(
                    assignment_id=assignment_id,
                    student_record_id=record.id,
                    actor_user_id=reviewer_user_id,
                    action="evaluated" if review_status in ("evaluated", "returned") else "checked",
                    previous_status=f"{prev_status}:{prev_review}",
                    new_status=f"{record.status}:{record.review_status}",
                    details=f"Evaluation updated to {review_status}. Marks: {marks_dec if marks_dec is not None else 'N/A'}. Remarks: {remarks or 'None'}",
                )
            )
            evaluated_records.append(record)
            updated_count += 1

        if evaluated_records:
            await HomeworkService._notify_assignment_students(
                db=db,
                assignment=assignment,
                records=evaluated_records,
                template_code="HW_EVALUATED",
                subject=f"Homework Evaluated: {assignment.title}",
                message=f"Your submission for '{assignment.title}' ({assignment.assignment_code}) has been reviewed and feedback is available.",
                dedup_suffix=now.strftime("%Y%m%d%H%M"),
                sender_user=reviewer_user,
            )

        await db.commit()
        return {"success": True, "updated_count": updated_count}

    # ========================================================================
    # STUDENT DIGITAL SUBMISSIONS, VIEW TRACKING & RESUBMISSION HISTORY
    # ========================================================================

    @staticmethod
    async def mark_student_viewed(
        db: AsyncSession,
        record_id: int,
        user: User,
    ) -> StudentHomeworkRecord:
        """Marks an assignment record as viewed by the student."""
        rec = (
            await db.execute(select(StudentHomeworkRecord).where(StudentHomeworkRecord.id == record_id))
        ).scalar_one_or_none()
        if not rec:
            raise ValueError(f"Student homework record ID {record_id} not found.")
        role = (user.role or "").strip().lower()
        if role == "student" and user.student_id != rec.student_id:
            raise PermissionError("Access denied.")
        if rec.viewed_at is None:
            rec.viewed_at = datetime.now(timezone.utc)
        if rec.status == "assigned":
            prev = rec.status
            rec.status = "viewed"
            db.add(
                HomeworkAuditLog(
                    assignment_id=rec.assignment_id,
                    student_record_id=rec.id,
                    actor_user_id=user.id,
                    action="viewed",
                    previous_status=prev,
                    new_status="viewed",
                    details="Student opened assignment details.",
                )
            )
        await db.commit()
        await db.refresh(rec)
        return rec

    @staticmethod
    async def submit_digital_homework(
        db: AsyncSession,
        record_id: int,
        student_user: User,
        payload: Dict[str, Any],
    ) -> StudentHomeworkRecord:
        """
        Allows students to submit or resubmit homework digitally with version history preservation.
        Enforces student isolation, assignment status, allow_late_submissions, and allow_resubmission.
        """
        stmt = (
            select(StudentHomeworkRecord)
            .options(selectinload(StudentHomeworkRecord.assignment))
            .where(StudentHomeworkRecord.id == record_id)
        )
        record = (await db.execute(stmt)).scalar_one_or_none()
        if not record:
            raise ValueError(f"Student homework record ID {record_id} not found.")

        assignment = record.assignment
        if student_user.role == "student" and student_user.student_id != record.student_id:
            raise PermissionError("Access denied: You cannot submit work for another student.")

        if assignment.status in ("draft", "archived"):
            raise ValueError("Cannot submit work for an unpublished or archived assignment.")
        if assignment.status == "closed" and record.status not in ("resubmit_required", "returned", "reopened"):
            raise ValueError("This assignment is closed for new submissions.")
        if (
            record.submission_version >= 1
            and not assignment.allow_resubmission
            and record.status not in ("resubmit_required", "returned", "reopened")
        ):
            raise ValueError("Resubmission is not permitted unless reopened by the teacher.")

        now = datetime.now(timezone.utc)
        today = date.today()
        effective_due_date = record.individual_due_date or assignment.due_date
        is_late = (today > effective_due_date) and (record.status not in ("reopened",))
        if is_late and not assignment.allow_late_submissions and record.status not in ("resubmit_required", "returned", "reopened"):
            raise ValueError("Submission deadline has passed and late submissions are disabled.")

        submission_text = payload.get("submission_text")
        submission_files = payload.get("submission_files")
        if isinstance(submission_files, list):
            submission_files_list = submission_files
            submission_files_str = json.dumps(submission_files)
        elif isinstance(submission_files, str):
            try:
                submission_files_list = json.loads(submission_files)
            except Exception:
                submission_files_list = []
            submission_files_str = submission_files
        else:
            submission_files_list = []
            submission_files_str = None

        # Preserve prior submission versions chronologically (never overwrite silently!)
        try:
            sub_history = json.loads(record.submission_history) if record.submission_history else []
        except Exception:
            sub_history = []
        # Backfill legacy v1 if previous submission existed without submission_history
        if not sub_history and record.submission_time and (record.submission_text or record.submission_files):
            try:
                prev_files = json.loads(record.submission_files) if record.submission_files else []
            except Exception:
                prev_files = []
            sub_history.append({
                "version": max(1, record.submission_version or 1),
                "submitted_at": record.submission_time.isoformat(),
                "submission_text": record.submission_text,
                "submission_files": prev_files,
                "is_late": record.submission_status == "late",
            })

        new_version = len(sub_history) + 1
        sub_history.append({
            "version": new_version,
            "submitted_at": now.isoformat(),
            "submission_text": submission_text,
            "submission_files": submission_files_list,
            "is_late": is_late,
        })

        prev_status = record.status
        record.submission_text = submission_text
        record.submission_files = submission_files_str
        record.submission_time = now
        record.submission_version = new_version
        record.submission_history = json.dumps(sub_history)
        if record.viewed_at is None:
            record.viewed_at = now

        if is_late:
            record.status = "late_submitted"
            record.submission_status = "late"
        else:
            record.status = "submitted"
            record.submission_status = "submitted"
        record.review_status = "under_evaluation"

        await HomeworkService._bind_file_urls_to_assignment(
            db, record.assignment_id, record.id, submission_files_list
        )

        db.add(
            HomeworkAuditLog(
                assignment_id=record.assignment_id,
                student_record_id=record.id,
                actor_user_id=student_user.id,
                action="submitted" if new_version == 1 else "resubmitted",
                previous_status=prev_status,
                new_status=record.status,
                details=f"Digital submission v{new_version} received ({'Late' if is_late else 'On-time'}).",
            )
        )

        # Notify assigned teacher
        teacher_obj = await db.get(User, assignment.teacher_user_id)
        stu_obj = await db.get(Student, record.student_id)
        stu_name = f"{stu_obj.first_name} {stu_obj.last_name}".strip() if stu_obj else f"Student #{record.student_id}"
        if teacher_obj:
            event_code = "HW_LATE_SUBMITTED" if is_late else "HW_SUBMITTED"
            await HomeworkService.notify_homework_event(
                db=db,
                institution_id=assignment.institution_id,
                recipient_type="TEACHER",
                recipient_id=teacher_obj.id,
                recipient_name=f"{teacher_obj.first_name} {teacher_obj.last_name}".strip(),
                template_code=event_code,
                subject=f"{'Late ' if is_late else ''}Submission v{new_version}: {assignment.title}",
                message=f"{stu_name} submitted work (v{new_version}) for '{assignment.title}' ({assignment.assignment_code}).",
                dedup_key=f"{event_code}:{record.id}:v{new_version}",
                sender_user=student_user,
                metadata={"assignment_id": assignment.id, "record_id": record.id},
            )

        await db.commit()
        await db.refresh(record)
        return record

    @staticmethod
    async def request_resubmission(
        db: AsyncSession,
        record_id: int,
        teacher_user_id: int,
        remarks: str,
        extended_due_date: Optional[date] = None,
        teacher_user: Optional[User] = None,
    ) -> StudentHomeworkRecord:
        """
        Teachers request resubmission when work is incomplete or unsatisfactory,
        preserving submission/evaluation history and notifying the student.
        """
        record = (
            await db.execute(
                select(StudentHomeworkRecord)
                .options(selectinload(StudentHomeworkRecord.assignment))
                .where(StudentHomeworkRecord.id == record_id)
            )
        ).scalar_one_or_none()
        if not record:
            raise ValueError(f"Record {record_id} not found.")

        now = datetime.now(timezone.utc)
        history_item = {
            "resubmission_number": record.resubmission_count + 1,
            "previous_submission_time": record.submission_time.isoformat() if record.submission_time else None,
            "previous_text": record.submission_text,
            "previous_files": record.submission_files,
            "teacher_remarks": remarks,
            "requested_at": now.isoformat(),
        }

        curr_history = []
        if record.resubmission_history:
            try:
                curr_history = json.loads(record.resubmission_history)
            except Exception:
                curr_history = []
        curr_history.append(history_item)

        prev_status = record.status
        record.resubmission_history = json.dumps(curr_history)
        record.resubmission_count += 1
        record.status = "resubmit_required"
        record.submission_status = "pending"
        record.review_status = "returned"
        record.teacher_remarks = remarks
        if extended_due_date:
            record.individual_due_date = extended_due_date

        db.add(
            HomeworkAuditLog(
                assignment_id=record.assignment_id,
                student_record_id=record.id,
                actor_user_id=teacher_user_id,
                action="resubmission_requested",
                previous_status=prev_status,
                new_status="resubmit_required",
                details=f"Resubmission #{record.resubmission_count} requested. Reason: {remarks}",
            )
        )

        if record.assignment:
            await HomeworkService._notify_assignment_students(
                db=db,
                assignment=record.assignment,
                records=[record],
                template_code="HW_REOPENED",
                subject=f"Resubmission Requested: {record.assignment.title}",
                message=f"Teacher requested revision on '{record.assignment.title}': {remarks}",
                dedup_suffix=f"resub_{record.resubmission_count}",
                sender_user=teacher_user,
            )

        await db.commit()
        await db.refresh(record)
        return record

    @staticmethod
    async def extend_due_date(
        db: AsyncSession,
        record_id: int,
        teacher_user_id: int,
        new_due_date: date,
        reason: Optional[str] = None,
        teacher_user: Optional[User] = None,
    ) -> StudentHomeworkRecord:
        """Extends individual due date for a student and sends deduplicated notification."""
        record = (
            await db.execute(
                select(StudentHomeworkRecord)
                .options(selectinload(StudentHomeworkRecord.assignment))
                .where(StudentHomeworkRecord.id == record_id)
            )
        ).scalar_one_or_none()
        if not record:
            raise ValueError(f"Record {record_id} not found.")

        old_date = record.individual_due_date
        record.individual_due_date = new_due_date
        if record.status in ("overdue", "not_submitted"):
            record.status = "reopened"

        db.add(
            HomeworkAuditLog(
                assignment_id=record.assignment_id,
                student_record_id=record.id,
                actor_user_id=teacher_user_id,
                action="extended_due_date",
                previous_status=str(old_date),
                new_status=str(new_due_date),
                details=f"Due date extended from {old_date} to {new_due_date}. Reason: {reason or 'Not specified'}",
            )
        )
        if record.assignment:
            await HomeworkService._notify_assignment_students(
                db=db,
                assignment=record.assignment,
                records=[record],
                template_code="HW_DUE_CHANGED",
                subject=f"Due Date Extended: {record.assignment.title}",
                message=f"Your due date for '{record.assignment.title}' has been updated to {new_due_date}.",
                dedup_suffix=f"ext_{new_due_date}",
                sender_user=teacher_user,
            )

        await db.commit()
        await db.refresh(record)
        return record

    @staticmethod
    async def exempt_student(
        db: AsyncSession,
        record_id: int,
        teacher_user_id: int,
        reason: str,
    ) -> StudentHomeworkRecord:
        """Exempts an individual student from an assignment."""
        record = (
            await db.execute(select(StudentHomeworkRecord).where(StudentHomeworkRecord.id == record_id))
        ).scalar_one_or_none()
        if not record:
            raise ValueError(f"Record {record_id} not found.")

        prev_status = record.status
        record.status = "excused"
        record.submission_status = "excused"
        record.review_status = "excused"
        record.exemption_reason = reason

        db.add(
            HomeworkAuditLog(
                assignment_id=record.assignment_id,
                student_record_id=record.id,
                actor_user_id=teacher_user_id,
                action="excused",
                previous_status=prev_status,
                new_status="excused",
                details=f"Student excused from homework. Reason: {reason}",
            )
        )
        await db.commit()
        await db.refresh(record)
        return record

    # ========================================================================
    # REMINDERS, SUMMARIES, REPORTS & ANALYTICS
    # ========================================================================

    @staticmethod
    async def run_reminders_and_alerts(
        db: AsyncSession,
        institution_id: int,
        actor_user: Optional[User] = None,
    ) -> Dict[str, Any]:
        """
        Triggers deduplicated reminders for approaching due dates (students & teachers)
        and high pending-evaluation queues (teachers).
        """
        hw_settings = await HomeworkService.get_homework_settings(db, institution_id)
        hours_ahead = int(hw_settings.get("reminder_hours_before_due", 24))
        eval_threshold = int(hw_settings.get("pending_eval_alert_threshold", 5))

        today = date.today()
        cutoff_date = today + timedelta(days=max(1, (hours_ahead + 23) // 24))
        date_bucket = today.isoformat()

        # 1. Approaching due dates
        due_soon_assignments = (
            await db.execute(
                select(HomeworkAssignment).where(
                    HomeworkAssignment.institution_id == institution_id,
                    HomeworkAssignment.status == "published",
                    HomeworkAssignment.due_date >= today,
                    HomeworkAssignment.due_date <= cutoff_date,
                )
            )
        ).scalars().all()

        student_reminders_sent = 0
        teacher_reminders_sent = 0
        for hw in due_soon_assignments:
            pending_recs = (
                await db.execute(
                    select(StudentHomeworkRecord).where(
                        StudentHomeworkRecord.assignment_id == hw.id,
                        StudentHomeworkRecord.submission_status == "pending",
                        StudentHomeworkRecord.status != "excused",
                    )
                )
            ).scalars().all()
            if pending_recs:
                student_reminders_sent += await HomeworkService._notify_assignment_students(
                    db=db,
                    assignment=hw,
                    records=pending_recs,
                    template_code="HW_DUE_REMINDER",
                    subject=f"Deadline Approaching: {hw.title}",
                    message=f"Reminder: '{hw.title}' ({hw.assignment_code}) is due on {hw.due_date} at {hw.due_time}.",
                    dedup_suffix=date_bucket,
                    sender_user=actor_user,
                )
                t_obj = await db.get(User, hw.teacher_user_id)
                if t_obj:
                    ok = await HomeworkService.notify_homework_event(
                        db=db,
                        institution_id=institution_id,
                        recipient_type="TEACHER",
                        recipient_id=t_obj.id,
                        recipient_name=f"{t_obj.first_name} {t_obj.last_name}".strip(),
                        template_code="HW_DEADLINE_APPROACHING",
                        subject=f"Deadline Approaching: {hw.title}",
                        message=f"{len(pending_recs)} student(s) still pending for '{hw.title}' due {hw.due_date}.",
                        dedup_key=f"HW_DEADLINE_APPROACHING:{hw.id}:{date_bucket}",
                        sender_user=actor_user,
                        metadata={"assignment_id": hw.id},
                    )
                    if ok:
                        teacher_reminders_sent += 1

        # 2. Pending evaluations backlog per teacher
        backlog_rows = (
            await db.execute(
                select(
                    HomeworkAssignment.teacher_user_id,
                    func.count(StudentHomeworkRecord.id).label("cnt"),
                )
                .join(HomeworkAssignment, StudentHomeworkRecord.assignment_id == HomeworkAssignment.id)
                .where(
                    HomeworkAssignment.institution_id == institution_id,
                    StudentHomeworkRecord.submission_status.in_(["submitted", "late"]),
                    StudentHomeworkRecord.review_status.in_(["pending", "under_evaluation"]),
                )
                .group_by(HomeworkAssignment.teacher_user_id)
            )
        ).all()
        for t_id, cnt in backlog_rows:
            if cnt >= eval_threshold:
                t_obj = await db.get(User, t_id)
                if t_obj:
                    ok = await HomeworkService.notify_homework_event(
                        db=db,
                        institution_id=institution_id,
                        recipient_type="TEACHER",
                        recipient_id=t_obj.id,
                        recipient_name=f"{t_obj.first_name} {t_obj.last_name}".strip(),
                        template_code="HW_PENDING_EVALUATIONS",
                        subject="Pending Homework Evaluations Alert",
                        message=f"You have {cnt} submitted assignment record(s) awaiting evaluation.",
                        dedup_key=f"HW_PENDING_EVAL:{t_id}:{date_bucket}",
                        sender_user=actor_user,
                    )
                    if ok:
                        teacher_reminders_sent += 1

        await db.commit()
        return {
            "success": True,
            "student_reminders_sent": student_reminders_sent,
            "teacher_reminders_sent": teacher_reminders_sent,
        }

    @staticmethod
    async def get_assignment_summary(db: AsyncSession, assignment_id: int) -> Dict[str, Any]:
        """Computes real-time completion, checking, submission, late, and evaluation KPIs."""
        records = (
            await db.execute(
                select(StudentHomeworkRecord).where(StudentHomeworkRecord.assignment_id == assignment_id)
            )
        ).scalars().all()

        total = len(records)
        completed = sum(
            1
            for r in records
            if r.status in ("completed", "evaluated", "checked")
            or r.review_status in ("done", "evaluated", "checked")
        )
        submitted = sum(1 for r in records if r.submission_status in ("submitted", "late"))
        late_submitted = sum(1 for r in records if r.submission_status == "late" or r.status == "late_submitted")
        pending_check = sum(
            1
            for r in records
            if r.review_status in ("pending", "under_evaluation") and r.status != "excused"
        )
        checked = sum(
            1
            for r in records
            if r.review_status in ("done", "evaluated", "incomplete", "not_done", "excused", "checked", "returned")
        )
        excused = sum(1 for r in records if r.status == "excused" or r.review_status == "excused")
        late_additions = sum(1 for r in records if r.is_late_addition)

        today = date.today()
        overdue = sum(
            1
            for r in records
            if r.status not in ("completed", "evaluated", "checked", "excused")
            and r.submission_status not in ("submitted", "late")
            and (r.individual_due_date or today) < today
        )

        completion_pct = round((completed / total * 100), 1) if total > 0 else 0.0

        return {
            "total_recipients": total,
            "completed_count": completed,
            "submitted_count": submitted,
            "late_submitted_count": late_submitted,
            "pending_check_count": pending_check,
            "checked_count": checked,
            "overdue_count": overdue,
            "excused_count": excused,
            "late_addition_count": late_additions,
            "completion_percentage": completion_pct,
        }

    @staticmethod
    async def get_institute_analytics(
        db: AsyncSession,
        institution_id: int,
        standard_id: Optional[int] = None,
        subject_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Phase 10 Institute Reports: strictly DB-derived analytics across subjects, teachers, batches,
        submission rate, late rate, and average evaluation turnaround hours.
        """
        conditions = [HomeworkAssignment.institution_id == institution_id, HomeworkAssignment.is_template == False]
        if standard_id:
            conditions.append(HomeworkAssignment.standard_id == standard_id)
        if subject_id:
            conditions.append(HomeworkAssignment.subject_id == subject_id)

        rows = (
            await db.execute(
                select(
                    StudentHomeworkRecord,
                    HomeworkAssignment,
                    Subject.name.label("subject_name"),
                    func.concat(User.first_name, " ", User.last_name).label("teacher_name"),
                    Division.name.label("division_name"),
                )
                .join(HomeworkAssignment, StudentHomeworkRecord.assignment_id == HomeworkAssignment.id)
                .join(Subject, HomeworkAssignment.subject_id == Subject.id)
                .join(User, HomeworkAssignment.teacher_user_id == User.id)
                .outerjoin(Division, HomeworkAssignment.division_id == Division.id)
                .where(and_(*conditions))
            )
        ).all()

        total_records = len(rows)
        submitted_total = 0
        late_total = 0
        evaluated_total = 0
        turnaround_hours: List[float] = []

        subj_agg: Dict[str, Dict[str, Any]] = {}
        teacher_agg: Dict[str, Dict[str, Any]] = {}
        batch_agg: Dict[str, Dict[str, Any]] = {}

        for rec, hw, s_name, t_name, d_name in rows:
            is_sub = rec.submission_status in ("submitted", "late")
            is_late = rec.submission_status == "late" or rec.status == "late_submitted"
            is_eval = rec.review_status in ("done", "evaluated", "checked") or rec.status in ("completed", "evaluated")

            if is_sub:
                submitted_total += 1
            if is_late:
                late_total += 1
            if is_eval:
                evaluated_total += 1
            if rec.submission_time and rec.reviewed_at and rec.reviewed_at >= rec.submission_time:
                delta_h = (rec.reviewed_at - rec.submission_time).total_seconds() / 3600.0
                turnaround_hours.append(delta_h)

            for bucket_map, key in (
                (subj_agg, s_name),
                (teacher_agg, t_name),
                (batch_agg, d_name or "Standard-Wide / Multi-Batch"),
            ):
                b = bucket_map.setdefault(
                    key,
                    {"name": key, "assignment_ids": set(), "total_records": 0, "submitted": 0, "late": 0, "evaluated": 0},
                )
                b["assignment_ids"].add(hw.id)
                b["total_records"] += 1
                if is_sub:
                    b["submitted"] += 1
                if is_late:
                    b["late"] += 1
                if is_eval:
                    b["evaluated"] += 1

        def _finalize(bucket_map: Dict[str, Dict[str, Any]]) -> List[Dict[str, Any]]:
            out = []
            for item in bucket_map.values():
                tr = item["total_records"]
                out.append({
                    "name": item["name"],
                    "assignments_count": len(item["assignment_ids"]),
                    "total_records": tr,
                    "submitted_count": item["submitted"],
                    "late_count": item["late"],
                    "evaluated_count": item["evaluated"],
                    "submission_rate_pct": round((item["submitted"] / tr) * 100, 1) if tr else 0.0,
                    "completion_rate_pct": round((item["evaluated"] / tr) * 100, 1) if tr else 0.0,
                })
            out.sort(key=lambda x: x["assignments_count"], reverse=True)
            return out

        return {
            "total_records": total_records,
            "student_submission_rate_pct": round((submitted_total / total_records) * 100, 1) if total_records else 0.0,
            "late_submission_rate_pct": round((late_total / total_records) * 100, 1) if total_records else 0.0,
            "evaluation_completion_rate_pct": round((evaluated_total / total_records) * 100, 1) if total_records else 0.0,
            "avg_evaluation_turnaround_hours": round(sum(turnaround_hours) / len(turnaround_hours), 1) if turnaround_hours else 0.0,
            "subject_wise": _finalize(subj_agg),
            "teacher_wise": _finalize(teacher_agg),
            "batch_wise": _finalize(batch_agg),
        }

    @staticmethod
    async def get_unified_academic_activity_register(
        db: AsyncSession,
        student_id: int,
    ) -> List[Dict[str, Any]]:
        """
        Chronological unified student academic activity register uniting:
        Homework Assignments, Examinations & Score Marks, and Attendance Records.
        """
        activities: List[Dict[str, Any]] = []

        hw_stmt = (
            select(
                StudentHomeworkRecord,
                HomeworkAssignment.title.label("hw_title"),
                HomeworkAssignment.assignment_code.label("hw_code"),
                Subject.name.label("subject_name"),
                HomeworkAssignment.due_date.label("hw_due_date"),
                HomeworkAssignment.max_marks.label("hw_max_marks"),
            )
            .join(HomeworkAssignment, StudentHomeworkRecord.assignment_id == HomeworkAssignment.id)
            .join(Subject, HomeworkAssignment.subject_id == Subject.id)
            .where(
                StudentHomeworkRecord.student_id == student_id,
                HomeworkAssignment.status != "draft",
            )
            .order_by(desc(StudentHomeworkRecord.created_at))
        )
        hw_res = await db.execute(hw_stmt)
        for r, title, code, subj, due_dt, max_m in hw_res.all():
            score_str = (
                f"{float(r.marks_obtained):.1f}/{float(max_m):.1f}"
                if r.marks_obtained is not None and max_m
                else (str(r.marks_obtained) if r.marks_obtained is not None else None)
            )
            activities.append({
                "id": f"hw-{r.id}",
                "type": "HOMEWORK",
                "activity_type": "homework",
                "timestamp": r.reviewed_at or r.submission_time or r.created_at,
                "date": str(due_dt),
                "time": r.individual_due_time or "",
                "title": f"Homework: {title} ({code})",
                "subject": subj,
                "subject_name": subj,
                "status": r.status,
                "review_status": r.review_status,
                "marks_obtained": float(r.marks_obtained) if r.marks_obtained is not None else None,
                "max_marks": float(max_m) if max_m is not None else None,
                "score": score_str,
                "remarks": r.teacher_remarks,
                "badge_color": "emerald" if r.status in ("completed", "evaluated") else "amber" if r.status == "assigned" else "red",
            })

        exam_stmt = (
            select(
                ExamMark,
                Examination.name.label("exam_name"),
                Examination.exam_type,
                Subject.name.label("subject_name"),
                Examination.max_marks.label("exam_max_marks"),
            )
            .join(Examination, ExamMark.examination_id == Examination.id)
            .join(Subject, ExamMark.subject_id == Subject.id)
            .where(ExamMark.student_id == student_id)
            .order_by(desc(ExamMark.created_at))
        )
        exam_res = await db.execute(exam_stmt)
        for mark, exam_name, exam_type, subj, max_m in exam_res.all():
            score_str = (
                f"{float(mark.marks_obtained):.1f}/{float(max_m):.1f}"
                if mark.marks_obtained is not None and max_m
                else (str(mark.marks_obtained) if mark.marks_obtained is not None else None)
            )
            activities.append({
                "id": f"exam-{mark.id}",
                "type": "EXAMINATION",
                "activity_type": "exam",
                "timestamp": mark.created_at,
                "date": str(mark.created_at.date() if mark.created_at else date.today()),
                "time": mark.created_at.strftime("%I:%M %p") if mark.created_at else "",
                "title": f"{exam_name} ({exam_type})",
                "subject": subj,
                "subject_name": subj,
                "status": "Absent" if mark.is_absent else f"Grade {mark.grade or 'N/A'}",
                "review_status": "Graded",
                "marks_obtained": float(mark.marks_obtained) if mark.marks_obtained is not None else None,
                "max_marks": float(max_m) if max_m is not None else None,
                "score": score_str,
                "remarks": mark.remarks,
                "badge_color": "indigo",
            })

        att_stmt = (
            select(Attendance)
            .where(Attendance.student_id == student_id)
            .order_by(desc(Attendance.date))
            .limit(20)
        )
        att_res = await db.execute(att_stmt)
        for att in att_res.scalars().all():
            activities.append({
                "id": f"att-{att.id}",
                "type": "ATTENDANCE",
                "activity_type": "attendance",
                "timestamp": att.created_at,
                "date": str(att.date),
                "time": "",
                "title": f"Daily Attendance — {att.status.capitalize()}",
                "subject": "General Presence",
                "subject_name": "General Presence",
                "status": att.status,
                "review_status": "Recorded",
                "marks_obtained": None,
                "max_marks": None,
                "score": None,
                "remarks": att.remarks,
                "badge_color": "emerald" if att.status == "present" else "red" if att.status == "absent" else "amber",
            })

        activities.sort(key=lambda x: str(x["timestamp"]), reverse=True)
        return activities
