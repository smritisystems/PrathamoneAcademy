# /**
#  * @file        test_eduboard_system.py
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
#  * @created     2026-11-12
#  * @updated     2026-11-13
#  *
#  * @description Comprehensive backend test suite for PrathamOne EduBoard covering RBAC, teacher scope, PRODUCTION/TRAINING isolation, optimistic concurrency 409 guards, PDF attachment/export via PyMuPDF, CommunicationLog & AuditLog, student historical enrollment continuity, and analytics.
#  */

import io
import json
import uuid
from datetime import date, time
from decimal import Decimal

import fitz
import pytest
from PIL import Image
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token, get_password_hash
from app.models.board import Board
from app.models.communication import CommunicationLog
from app.models.division import Division
from app.models.eduboard import EduBoard, EduBoardAttachment
from app.models.enrollment import StudentEnrollment
from app.models.institution import Institution
from app.models.staff import TeacherAssignment
from app.models.standard import Standard
from app.models.student import Student
from app.models.subject import Subject
from app.models.teacher_payroll import TeachingSession
from app.models.user import AuditLog, Role, User


async def _create_user_with_token(
    db: AsyncSession,
    *,
    role_name: str,
    institution_id: int,
    student_id: int | None = None,
) -> tuple[User, dict]:
    suffix = uuid.uuid4().hex[:6]
    role = (await db.execute(select(Role).where(Role.name == role_name))).scalar_one_or_none()
    if not role:
        role = Role(name=role_name, description=f"Test {role_name}")
        db.add(role)
        await db.flush()
    user = User(
        username=f"{role_name}_{suffix}",
        email=f"{role_name}_{suffix}@test.com",
        hashed_password=get_password_hash("TestPass#2026"),
        first_name=role_name.capitalize(),
        last_name=suffix,
        role=role_name,
        role_id=role.id,
        institution_id=institution_id,
        student_id=student_id,
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    token = create_access_token(
        data={"sub": str(user.id), "role": user.role, "uid": user.id, "inst_id": user.institution_id}
    )
    return user, {"Authorization": f"Bearer {token}"}


async def _setup_academic_context(db: AsyncSession, institution_id: int, academic_year_id: int, teacher_id: int):
    suffix = uuid.uuid4().hex[:6]
    board = Board(institution_id=institution_id, name=f"CBSE-{suffix}", code=f"CB{suffix[:4]}")
    db.add(board)
    await db.flush()

    std = Standard(institution_id=institution_id, name=f"Grade 12-{suffix}", level=120 + int(suffix[:2], 16))
    db.add(std)
    await db.flush()

    div = Division(standard_id=std.id, name=f"Batch EB-{suffix}", code=f"EB-{suffix}")
    db.add(div)
    await db.flush()

    subj = Subject(standard_id=std.id, name=f"Physics-{suffix}", code=f"PHY-{suffix}")
    db.add(subj)
    await db.flush()

    ta = TeacherAssignment(
        academic_year_id=academic_year_id,
        teacher_user_id=teacher_id,
        board_id=board.id,
        standard_id=std.id,
        division_id=div.id,
        subject_id=subj.id,
        is_active=True,
    )
    db.add(ta)
    await db.flush()

    ts = TeachingSession(
        session_code=f"TS-{suffix.upper()}",
        institution_id=institution_id,
        academic_year_id=academic_year_id,
        teacher_user_id=teacher_id,
        division_id=div.id,
        subject_id=subj.id,
        session_date=date(2026, 11, 12),
        scheduled_start_time="09:00",
        scheduled_end_time="10:00",
        calculated_duration_hours=1.0,
        topic_taught="Electromagnetic Induction",
        session_status="scheduled",
    )
    db.add(ts)
    await db.commit()
    await db.refresh(std)
    await db.refresh(div)
    await db.refresh(subj)
    await db.refresh(ts)
    return std, div, subj, ts


def _make_sample_pdf_bytes(num_pages: int = 2) -> bytes:
    doc = fitz.open()
    for i in range(num_pages):
        page = doc.new_page(width=640, height=360)
        page.insert_text((48, 72), f"PrathamOne Slide {i + 1}", fontsize=20)
    data = doc.tobytes()
    doc.close()
    return data


def _make_sample_png_bytes() -> bytes:
    buf = io.BytesIO()
    img = Image.new("RGB", (120, 80), color=(30, 64, 175))
    img.save(buf, format="PNG")
    return buf.getvalue()


@pytest.mark.asyncio
async def test_eduboard_teacher_scope_and_rbac_enforcement(
    client,
    db: AsyncSession,
    auth_headers: dict,
    admin_user: User,
    test_institution: Institution,
    test_academic_year,
):
    """Teachers can create boards only in assigned batches; students cannot mutate."""
    admin_user.institution_id = test_institution.id
    await db.commit()

    teacher_a, teacher_a_hdrs = await _create_user_with_token(
        db, role_name="teacher", institution_id=test_institution.id
    )
    teacher_b, teacher_b_hdrs = await _create_user_with_token(
        db, role_name="teacher", institution_id=test_institution.id
    )

    std, div, subj, ts = await _setup_academic_context(
        db, test_institution.id, test_academic_year.id, teacher_a.id
    )

    student = Student(
        institution_id=test_institution.id,
        admission_number=f"EBSTD-{uuid.uuid4().hex[:5]}",
        first_name="Aarav",
        last_name="Patel",
        date_of_birth=date(2010, 4, 15),
        gender="male",
        admission_date=date(2025, 6, 1),
    )
    db.add(student)
    await db.flush()
    db.add(
        StudentEnrollment(
            student_id=student.id,
            academic_year_id=test_academic_year.id,
            standard_id=std.id,
            division_id=div.id,
            enrollment_date=date(2025, 6, 1),
            status="active",
        )
    )
    await db.flush()
    _, student_hdrs = await _create_user_with_token(
        db, role_name="student", institution_id=test_institution.id, student_id=student.id
    )

    # 1. Teacher A fetches workspace context
    ctx_resp = await client.get("/api/v1/eduboard/context", headers=teacher_a_hdrs)
    assert ctx_resp.status_code == 200
    ctx = ctx_resp.json()
    assert any(s["id"] == ts.id for s in ctx["teaching_sessions"])
    assert any(d["id"] == div.id for d in ctx["divisions"])

    # 2. Student cannot create a board or update settings
    stu_create = await client.post(
        "/api/v1/eduboard/boards",
        json={"title": "Student Hack", "division_id": div.id},
        headers=student_hdrs,
    )
    assert stu_create.status_code == 403

    stu_settings = await client.put(
        "/api/v1/eduboard/settings",
        json={"max_file_size_mb": 99},
        headers=student_hdrs,
    )
    assert stu_settings.status_code == 403

    # 3. Teacher B cannot create board for unassigned batch div
    unauth_create = await client.post(
        "/api/v1/eduboard/boards",
        json={
            "title": "Unassigned Lecture",
            "academic_year_id": test_academic_year.id,
            "division_id": div.id,
            "subject_id": subj.id,
        },
        headers=teacher_b_hdrs,
    )
    assert unauth_create.status_code == 403

    # 4. Teacher A creates EduBoard linked to TeachingSession
    create_resp = await client.post(
        "/api/v1/eduboard/boards",
        json={
            "title": "Faraday's Law Lecture",
            "topic": "Electromagnetic Induction",
            "academic_year_id": test_academic_year.id,
            "standard_id": std.id,
            "division_id": div.id,
            "subject_id": subj.id,
            "teaching_session_id": ts.id,
            "board_mode_default": "classic",
        },
        headers=teacher_a_hdrs,
    )
    assert create_resp.status_code == 201
    board = create_resp.json()
    assert board["teaching_session_id"] == ts.id
    assert board["board_mode_default"] == "classic"
    assert len(board["pages"]) == 1
    assert board["pages"][0]["background_style"] == "blackboard"

    # 5. Teacher B cannot edit Teacher A's board
    other_sync = await client.put(
        f"/api/v1/eduboard/boards/{board['id']}/sync",
        json={"title": "Tampered", "expected_revision_no": 1},
        headers=teacher_b_hdrs,
    )
    assert other_sync.status_code == 403


@pytest.mark.asyncio
async def test_eduboard_environment_and_institution_isolation(
    client,
    db: AsyncSession,
    test_institution: Institution,
    test_academic_year,
):
    """PRODUCTION and TRAINING boards are isolated; cross-institution access returns 404."""
    teacher, t_hdrs = await _create_user_with_token(
        db, role_name="teacher", institution_id=test_institution.id
    )
    std, div, subj, ts = await _setup_academic_context(
        db, test_institution.id, test_academic_year.id, teacher.id
    )

    other_inst = Institution(name="Other Inst", code=f"OI{uuid.uuid4().hex[:5]}", city="Pune")
    db.add(other_inst)
    await db.commit()
    await db.refresh(other_inst)
    _, other_admin_hdrs = await _create_user_with_token(
        db, role_name="admin", institution_id=other_inst.id
    )

    prod_resp = await client.post(
        "/api/v1/eduboard/boards",
        json={
            "title": "Production Physics Board",
            "academic_year_id": test_academic_year.id,
            "division_id": div.id,
            "subject_id": subj.id,
        },
        headers=t_hdrs,
    )
    assert prod_resp.status_code == 201
    prod_id = prod_resp.json()["id"]

    train_inst = (
        await db.execute(select(Institution).where(Institution.code == "PA001-DEMO"))
    ).scalar_one_or_none()
    if not train_inst:
        train_inst = Institution(name="Training Demo Academy", code="PA001-DEMO", city="Demo")
        db.add(train_inst)
        await db.commit()
        await db.refresh(train_inst)
    train_teacher, train_t_hdrs = await _create_user_with_token(
        db, role_name="teacher", institution_id=train_inst.id
    )
    _, train_div, train_subj, _ = await _setup_academic_context(
        db, train_inst.id, test_academic_year.id, train_teacher.id
    )

    train_hdrs = {**train_t_hdrs, "X-Data-Environment": "TRAINING"}
    # Attempting to reference a Production division from Training must fail (404)
    cross_env_attempt = await client.post(
        "/api/v1/eduboard/boards",
        json={
            "title": "Cross Env Leak",
            "academic_year_id": test_academic_year.id,
            "division_id": div.id,
            "subject_id": subj.id,
        },
        headers=train_hdrs,
    )
    assert cross_env_attempt.status_code in (403, 404)

    train_resp = await client.post(
        "/api/v1/eduboard/boards",
        json={
            "title": "Training Sandbox Board",
            "academic_year_id": test_academic_year.id,
            "division_id": train_div.id,
            "subject_id": train_subj.id,
        },
        headers=train_hdrs,
    )
    assert train_resp.status_code == 201
    train_id = train_resp.json()["id"]

    prod_list = (await client.get("/api/v1/eduboard/boards", headers=t_hdrs)).json()
    assert any(b["id"] == prod_id for b in prod_list["items"])
    assert not any(b["id"] == train_id for b in prod_list["items"])

    train_list = (await client.get("/api/v1/eduboard/boards", headers=train_hdrs)).json()
    assert any(b["id"] == train_id for b in train_list["items"])
    assert not any(b["id"] == prod_id for b in train_list["items"])

    # Training call cannot open Production board ID
    assert (await client.get(f"/api/v1/eduboard/boards/{prod_id}", headers=train_hdrs)).status_code == 404
    # Other institution cannot open Production board ID
    assert (await client.get(f"/api/v1/eduboard/boards/{prod_id}", headers=other_admin_hdrs)).status_code == 404


@pytest.mark.asyncio
async def test_eduboard_optimistic_concurrency_revisions_and_restore(
    client,
    db: AsyncSession,
    test_institution: Institution,
    test_academic_year,
):
    """Stale expected_revision_no or page version triggers 409; revision restore restores scene."""
    teacher, t_hdrs = await _create_user_with_token(
        db, role_name="teacher", institution_id=test_institution.id
    )
    std, div, subj, _ = await _setup_academic_context(
        db, test_institution.id, test_academic_year.id, teacher.id
    )

    board = (
        await client.post(
            "/api/v1/eduboard/boards",
            json={
                "title": "Calculus Board",
                "academic_year_id": test_academic_year.id,
                "division_id": div.id,
                "subject_id": subj.id,
                "board_mode_default": "whiteboard",
            },
            headers=t_hdrs,
        )
    ).json()
    bid = board["id"]
    page = board["pages"][0]

    scene_v2 = {
        "schemaVersion": 1,
        "elements": [
            {
                "id": "el_stroke_1",
                "type": "stroke",
                "tool": "pen",
                "points": [10, 20, 120, 80],
                "color": "#2563eb",
                "size": 4,
            }
        ],
    }
    sync1 = await client.put(
        f"/api/v1/eduboard/boards/{bid}/sync",
        json={
            "expected_revision_no": 1,
            "save_type": "manual",
            "note": "Added vector stroke",
            "pages": [
                {
                    "page_uid": page["page_uid"],
                    "page_order": 1,
                    "title": "Derivations",
                    "mode": "whiteboard",
                    "background_style": "grid",
                    "scene_json": scene_v2,
                    "version": page["version"],
                }
            ],
        },
        headers=t_hdrs,
    )
    assert sync1.status_code == 200
    b2 = sync1.json()
    assert b2["latest_revision_no"] == 2
    assert b2["pages"][0]["version"] == 2

    # Stale expected_revision_no returns 409 REVISION_CONFLICT
    stale = await client.put(
        f"/api/v1/eduboard/boards/{bid}/sync",
        json={
            "expected_revision_no": 1,
            "save_type": "autosave",
            "pages": [
                {
                    "page_uid": page["page_uid"],
                    "page_order": 1,
                    "title": "Conflict Attempt",
                    "mode": "whiteboard",
                    "background_style": "white",
                    "scene_json": {"schemaVersion": 1, "elements": []},
                    "version": 1,
                }
            ],
        },
        headers=t_hdrs,
    )
    assert stale.status_code == 409
    assert stale.json()["detail"]["code"] == "REVISION_CONFLICT"

    # Update to revision 3 clearing elements, then restore revision 2
    sync2 = await client.put(
        f"/api/v1/eduboard/boards/{bid}/sync",
        json={
            "expected_revision_no": 2,
            "save_type": "manual",
            "pages": [
                {
                    "page_uid": page["page_uid"],
                    "page_order": 1,
                    "title": "Cleared",
                    "mode": "whiteboard",
                    "background_style": "white",
                    "scene_json": {"schemaVersion": 1, "elements": []},
                    "version": 2,
                }
            ],
        },
        headers=t_hdrs,
    )
    assert sync2.status_code == 200
    assert sync2.json()["latest_revision_no"] == 3

    revs = (await client.get(f"/api/v1/eduboard/boards/{bid}/revisions", headers=t_hdrs)).json()["items"]
    rev2 = next(r for r in revs if r["revision_no"] == 2)
    restored = (
        await client.post(f"/api/v1/eduboard/boards/{bid}/revisions/{rev2['id']}/restore", headers=t_hdrs)
    ).json()
    assert restored["latest_revision_no"] == 4
    restored_scene = json.loads(restored["pages"][0]["scene_json"])
    assert len(restored_scene["elements"]) == 1
    assert restored_scene["elements"][0]["id"] == "el_stroke_1"


@pytest.mark.asyncio
async def test_eduboard_pdf_attachment_validation_and_non_destructive_export(
    client,
    db: AsyncSession,
    test_institution: Institution,
    test_academic_year,
):
    """Rejects PPTX/corrupt PDF, accepts PDF & PNG, renders PNG page fallback, and exports flattened PDF without altering original attachment."""
    teacher, t_hdrs = await _create_user_with_token(
        db, role_name="teacher", institution_id=test_institution.id
    )
    std, div, subj, _ = await _setup_academic_context(
        db, test_institution.id, test_academic_year.id, teacher.id
    )

    board = (
        await client.post(
            "/api/v1/eduboard/boards",
            json={
                "title": "Organic Chemistry Deck",
                "academic_year_id": test_academic_year.id,
                "division_id": div.id,
                "subject_id": subj.id,
                "board_mode_default": "presentation",
            },
            headers=t_hdrs,
        )
    ).json()
    bid = board["id"]

    # Reject .pptx (not installed in Docker baseline -> clean refusal)
    pptx_resp = await client.post(
        f"/api/v1/eduboard/boards/{bid}/attachments",
        files={"file": ("deck.pptx", b"PK\x03\x04fake", "application/vnd.openxmlformats-officedocument.presentationml.presentation")},
        headers=t_hdrs,
    )
    assert pptx_resp.status_code == 400
    assert "PDF" in pptx_resp.json()["detail"]

    # Reject corrupt PDF
    bad_pdf = await client.post(
        f"/api/v1/eduboard/boards/{bid}/attachments",
        files={"file": ("broken.pdf", b"not-a-pdf", "application/pdf")},
        headers=t_hdrs,
    )
    assert bad_pdf.status_code == 400

    # Accept 2-page PDF
    pdf_bytes = _make_sample_pdf_bytes(2)
    ok_pdf = await client.post(
        f"/api/v1/eduboard/boards/{bid}/attachments",
        files={"file": ("lecture_notes.pdf", pdf_bytes, "application/pdf")},
        data={"attachment_role": "source_document", "create_slides": "true"},
        headers=t_hdrs,
    )
    assert ok_pdf.status_code == 201
    att_meta = ok_pdf.json()
    assert att_meta["page_count"] == 2
    assert att_meta["created_pages_count"] == 2
    orig_sha = att_meta["sha256_checksum"]

    # Render PNG fallback via PyMuPDF
    png_render = await client.get(
        f"/api/v1/eduboard/attachments/{att_meta['id']}/pages/1/render",
        headers=t_hdrs,
    )
    assert png_render.status_code == 200
    assert png_render.headers["content-type"].startswith("image/png")

    # Upload PNG attachment as inline image (without creating full slide)
    png_att = await client.post(
        f"/api/v1/eduboard/boards/{bid}/attachments",
        files={"file": ("diagram.png", _make_sample_png_bytes(), "image/png")},
        data={"attachment_role": "inline_image", "create_slides": "false"},
        headers=t_hdrs,
    )
    assert png_att.status_code == 201

    # Annotate slide 1 with shapes & text, then export annotated PDF
    detail = (await client.get(f"/api/v1/eduboard/boards/{bid}", headers=t_hdrs)).json()
    slide_1 = next(p for p in detail["pages"] if p["source_attachment_id"] == att_meta["id"] and p["source_page_number"] == 1)
    updated_scene = {
        "schemaVersion": 1,
        "elements": [
            {"id": "r1", "type": "rect", "x": 40, "y": 40, "width": 200, "height": 80, "color": "#dc2626", "size": 3},
            {"id": "c1", "type": "circle", "x": 350, "y": 140, "width": 80, "height": 80, "color": "#16a34a", "size": 3},
            {"id": "a1", "type": "arrow", "points": [50, 200, 300, 220], "color": "#2563eb", "size": 4},
            {"id": "t1", "type": "text", "x": 80, "y": 60, "text": "Key Exam Formula", "color": "#111827", "fontSize": 22},
        ],
    }
    sync_pages = [
        {
            "page_uid": p["page_uid"],
            "page_order": p["page_order"],
            "title": p["title"],
            "mode": p["mode"],
            "background_style": p["background_style"],
            "source_attachment_id": p["source_attachment_id"],
            "source_page_number": p["source_page_number"],
            "scene_json": updated_scene if p["page_uid"] == slide_1["page_uid"] else p["scene_json"],
            "version": p["version"],
        }
        for p in detail["pages"]
    ]
    sync_res = await client.put(
        f"/api/v1/eduboard/boards/{bid}/sync",
        json={"expected_revision_no": detail["latest_revision_no"], "pages": sync_pages},
        headers=t_hdrs,
    )
    assert sync_res.status_code == 200

    export_resp = await client.get(f"/api/v1/eduboard/boards/{bid}/export-pdf", headers=t_hdrs)
    assert export_resp.status_code == 200
    assert export_resp.headers["content-type"] == "application/pdf"
    assert export_resp.content.startswith(b"%PDF")

    exported_doc = fitz.open(stream=export_resp.content, filetype="pdf")
    assert exported_doc.page_count == len(detail["pages"])
    exported_doc.close()

    # Original attachment remains unchanged on disk
    dl_resp = await client.get(f"/api/v1/eduboard/attachments/{att_meta['id']}/download", headers=t_hdrs)
    assert dl_resp.status_code == 200
    assert dl_resp.content == pdf_bytes
    att_db = (await db.execute(select(EduBoardAttachment).where(EduBoardAttachment.id == att_meta["id"]))).scalar_one()
    assert att_db.sha256_checksum == orig_sha


@pytest.mark.asyncio
async def test_eduboard_publish_student_historical_access_and_audit(
    client,
    db: AsyncSession,
    test_institution: Institution,
    test_academic_year,
):
    """Publishing notifies enrolled students via CommunicationLog, writes AuditLog, preserves access across transfers, and reports summary."""
    teacher, t_hdrs = await _create_user_with_token(
        db, role_name="teacher", institution_id=test_institution.id
    )
    std, div, subj, ts = await _setup_academic_context(
        db, test_institution.id, test_academic_year.id, teacher.id
    )

    # Create another batch for an unrelated student
    other_div = Division(standard_id=std.id, name="Other Batch", code=f"OB-{uuid.uuid4().hex[:5]}")
    db.add(other_div)
    await db.flush()

    stu_enrolled = Student(
        institution_id=test_institution.id,
        admission_number=f"SE-{uuid.uuid4().hex[:5]}",
        first_name="Meera",
        last_name="Joshi",
        date_of_birth=date(2010, 7, 11),
        gender="female",
        admission_date=date(2025, 6, 1),
    )
    stu_other = Student(
        institution_id=test_institution.id,
        admission_number=f"SO-{uuid.uuid4().hex[:5]}",
        first_name="Rohan",
        last_name="Verma",
        date_of_birth=date(2010, 8, 12),
        gender="male",
        admission_date=date(2025, 6, 1),
    )
    db.add_all([stu_enrolled, stu_other])
    await db.flush()

    enr_enrolled = StudentEnrollment(
        student_id=stu_enrolled.id,
        academic_year_id=test_academic_year.id,
        standard_id=std.id,
        division_id=div.id,
        enrollment_date=date(2025, 6, 1),
        status="active",
    )
    enr_other = StudentEnrollment(
        student_id=stu_other.id,
        academic_year_id=test_academic_year.id,
        standard_id=std.id,
        division_id=other_div.id,
        enrollment_date=date(2025, 6, 1),
        status="active",
    )
    db.add_all([enr_enrolled, enr_other])
    await db.flush()

    _, stu_enrolled_hdrs = await _create_user_with_token(
        db, role_name="student", institution_id=test_institution.id, student_id=stu_enrolled.id
    )
    _, stu_other_hdrs = await _create_user_with_token(
        db, role_name="student", institution_id=test_institution.id, student_id=stu_other.id
    )

    board = (
        await client.post(
            "/api/v1/eduboard/boards",
            json={
                "title": "Thermodynamics Revision",
                "academic_year_id": test_academic_year.id,
                "standard_id": std.id,
                "division_id": div.id,
                "subject_id": subj.id,
                "teaching_session_id": ts.id,
                "is_template": True,
                "template_category": "Revision",
            },
            headers=t_hdrs,
        )
    ).json()
    bid = board["id"]

    # Draft board is hidden from enrolled student
    assert (await client.get(f"/api/v1/eduboard/student/boards/{bid}", headers=stu_enrolled_hdrs)).status_code == 403

    # Publish board
    pub_resp = await client.post(f"/api/v1/eduboard/boards/{bid}/publish", headers=t_hdrs)
    assert pub_resp.status_code == 200
    assert pub_resp.json()["notified_students"] == 1

    # Cannot delete published board as teacher
    assert (await client.delete(f"/api/v1/eduboard/boards/{bid}", headers=t_hdrs)).status_code == 403

    # Enrolled student sees published board read-only; unrelated student is denied
    stu_list = (await client.get("/api/v1/eduboard/student/boards", headers=stu_enrolled_hdrs)).json()
    assert any(item["id"] == bid for item in stu_list["items"])

    stu_detail = await client.get(f"/api/v1/eduboard/student/boards/{bid}", headers=stu_enrolled_hdrs)
    assert stu_detail.status_code == 200
    assert stu_detail.json()["read_only"] is True

    other_list = (await client.get("/api/v1/eduboard/student/boards", headers=stu_other_hdrs)).json()
    assert not any(item["id"] == bid for item in other_list["items"])
    assert (await client.get(f"/api/v1/eduboard/student/boards/{bid}", headers=stu_other_hdrs)).status_code == 403

    # Student transfers/exits batch -> historical enrollment still preserves access
    enr_enrolled.status = "transferred"
    await db.commit()
    stu_hist_detail = await client.get(f"/api/v1/eduboard/student/boards/{bid}", headers=stu_enrolled_hdrs)
    assert stu_hist_detail.status_code == 200

    # Template cloning creates an independent draft board
    clone_resp = await client.post(
        "/api/v1/eduboard/boards",
        json={
            "title": "Cloned Revision Board",
            "academic_year_id": test_academic_year.id,
            "division_id": div.id,
            "subject_id": subj.id,
            "from_template_id": bid,
        },
        headers=t_hdrs,
    )
    assert clone_resp.status_code == 201
    clone_id = clone_resp.json()["id"]
    assert clone_id != bid
    # Teacher does not hold eduboard:delete permission -> 403; institutional admin CAN soft-delete draft
    assert (await client.delete(f"/api/v1/eduboard/boards/{clone_id}", headers=t_hdrs)).status_code == 403
    _, inst_admin_hdrs = await _create_user_with_token(
        db, role_name="admin", institution_id=test_institution.id
    )
    assert (await client.delete(f"/api/v1/eduboard/boards/{clone_id}", headers=inst_admin_hdrs)).status_code == 200

    # Verify CommunicationLog notification & AuditLog events & Report summary
    comm = (
        await db.execute(
            select(CommunicationLog).where(CommunicationLog.template_code == f"EB_PUB_{bid}")
        )
    ).scalar_one_or_none()
    assert comm is not None

    audits = (
        await db.execute(
            select(AuditLog.action).where(AuditLog.resource_type == "eduboard", AuditLog.resource_id == bid)
        )
    ).scalars().all()
    assert "EDUBOARD_CREATED" in audits
    assert "EDUBOARD_PUBLISHED" in audits
    assert "EDUBOARD_STUDENT_VIEW" in audits

    rep = await client.get("/api/v1/reports/eduboard-summary", headers=t_hdrs)
    assert rep.status_code == 200
    assert rep.json()["total_boards"] >= 1
    assert rep.json()["published_boards"] >= 1


@pytest.mark.asyncio
async def test_eduboard_context_excludes_inactive_subjects_and_enriches_canonical(
    client,
    db: AsyncSession,
    test_institution: Institution,
    test_academic_year,
):
    """Enforces Rule 011: Context excludes inactive subjects and enriches canonical subject metadata."""
    t_user, t_hdrs = await _create_user_with_token(
        db, role_name="teacher", institution_id=test_institution.id
    )

    std = Standard(institution_id=test_institution.id, name="Test Standard C", level=7)
    db.add(std)
    await db.flush()

    active_sub = Subject(standard_id=std.id, name="Robotics Active", code="ROB_ACT", is_active=True)
    inactive_sub = Subject(standard_id=std.id, name="Robotics Inactive", code="ROB_INACT", is_active=False)
    db.add_all([active_sub, inactive_sub])
    await db.commit()

    ctx_resp = await client.get("/api/v1/eduboard/context", headers=t_hdrs)
    assert ctx_resp.status_code == 200
    body = ctx_resp.json()

    returned_sub_ids = [s["id"] for s in body["subjects"]]
    assert active_sub.id in returned_sub_ids
    assert inactive_sub.id not in returned_sub_ids

    # Enforces standard_name enrichment
    found = next(s for s in body["subjects"] if s["id"] == active_sub.id)
    assert found["standard_name"] == "Test Standard C"
    assert "canonical_name" in found

    # Attempting to create a board with inactive subject fails with 400
    bad_create = await client.post(
        "/api/v1/eduboard/boards",
        json={
            "title": "Bad Inactive Board",
            "academic_year_id": test_academic_year.id,
            "standard_id": std.id,
            "subject_id": inactive_sub.id,
        },
        headers=t_hdrs,
    )
    assert bad_create.status_code == 400
    assert "inactive" in bad_create.json()["detail"].lower()

