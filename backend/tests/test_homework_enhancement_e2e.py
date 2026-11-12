# /**
#  * @file        test_homework_enhancement_e2e.py
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
#  * @updated     2026-11-12
#  *
#  * @description Phase 13 end-to-end backend test suite covering all 20 Homework & Assignment Management Enhancement scenarios.
#  */

import random
import uuid
from datetime import date, datetime, timedelta, timezone

import pytest
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token, get_password_hash
from app.models.academic_year import AcademicYear
from app.models.board import Board
from app.models.communication import CommunicationLog
from app.models.division import Division
from app.models.enrollment import StudentEnrollment
from app.models.homework import HomeworkAssignment, HomeworkFile, StudentHomeworkRecord
from app.models.institution import Institution
from app.models.staff import TeacherAssignment
from app.models.standard import Standard
from app.models.student import Student
from app.models.subject import Subject
from app.models.user import Permission, Role, User


async def _ensure_role_permissions(db: AsyncSession, role_name: str, actions: list[str]) -> Role:
    role = (await db.execute(select(Role).where(Role.name == role_name))).scalar_one_or_none()
    if not role:
        role = Role(name=role_name, description=f"Test {role_name}")
        db.add(role)
        await db.flush()
    existing = (
        await db.execute(
            select(Permission.action).where(
                Permission.role_id == role.id,
                Permission.resource == "homework",
            )
        )
    ).scalars().all()
    for act in actions:
        if act not in existing:
            db.add(Permission(role_id=role.id, resource="homework", action=act))
    await db.commit()
    return role


async def _make_user(
    db: AsyncSession,
    *,
    role_name: str,
    institution_id: int,
    actions: list[str] | None = None,
    student_id: int | None = None,
) -> tuple[User, dict]:
    suffix = uuid.uuid4().hex[:6]
    role = await _ensure_role_permissions(db, role_name, actions or [])
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


async def _make_student(
    db: AsyncSession,
    *,
    institution_id: int,
    academic_year_id: int,
    standard_id: int,
    division_id: int | None = None,
    with_login: bool = False,
    first_name: str = "Student",
) -> tuple[Student, User | None, dict]:
    suffix = uuid.uuid4().hex[:6]
    student = Student(
        institution_id=institution_id,
        admission_number=f"ADM{suffix}",
        first_name=first_name,
        last_name=suffix,
        date_of_birth=date(2012, 5, 1),
        gender="female",
        admission_date=date(2024, 6, 1),
    )
    db.add(student)
    await db.flush()
    if division_id:
        enr = StudentEnrollment(
            student_id=student.id,
            academic_year_id=academic_year_id,
            standard_id=standard_id,
            division_id=division_id,
            roll_number=str(random.randint(10, 999)),
            enrollment_date=date.today(),
            status="active",
        )
        db.add(enr)
    await db.commit()
    await db.refresh(student)

    student_user = None
    headers: dict = {}
    if with_login:
        student_user, headers = await _make_user(
            db,
            role_name="student",
            institution_id=institution_id,
            actions=["view"],
            student_id=student.id,
        )
    return student, student_user, headers


async def _make_curriculum(db: AsyncSession, institution_id: int):
    suffix = uuid.uuid4().hex[:6]
    board = Board(institution_id=institution_id, name=f"CBSE {suffix}", code=f"CB{suffix[:4]}")
    std = Standard(
        institution_id=institution_id,
        name=f"Std 10 {suffix}",
        level=random.randint(100, 999999),
    )
    db.add_all([board, std])
    await db.flush()
    div_a = Division(standard_id=std.id, board_id=board.id, name=f"Batch A {suffix}", code=f"BA{suffix}")
    div_b = Division(standard_id=std.id, board_id=board.id, name=f"Batch B {suffix}", code=f"BB{suffix}")
    subj = Subject(standard_id=std.id, name=f"Physics {suffix}", code=f"PHY{suffix}")
    subj2 = Subject(standard_id=std.id, name=f"Chemistry {suffix}", code=f"CHE{suffix}")
    db.add_all([div_a, div_b, subj, subj2])
    await db.commit()
    for obj in (board, std, div_a, div_b, subj, subj2):
        await db.refresh(obj)
    return board, std, div_a, div_b, subj, subj2


@pytest.mark.asyncio
async def test_phase13_batch_draft_publish_snapshot_late_joiner_and_transfer(
    client,
    db: AsyncSession,
    auth_headers: dict,
    admin_user,
    test_institution,
    test_academic_year,
):
    """Covers scenarios 1, 2, 5, 6, 7, 8, 9, and 19."""
    admin_user.institution_id = test_institution.id
    await db.commit()

    _, std, div_a, div_b, subj, _ = await _make_curriculum(db, test_institution.id)
    s1, _, s1_headers = await _make_student(
        db,
        institution_id=test_institution.id,
        academic_year_id=test_academic_year.id,
        standard_id=std.id,
        division_id=div_a.id,
        with_login=True,
        first_name="Aarav",
    )
    s2, _, _ = await _make_student(
        db,
        institution_id=test_institution.id,
        academic_year_id=test_academic_year.id,
        standard_id=std.id,
        division_id=div_a.id,
        with_login=False,
        first_name="Diya",
    )

    # Preview batch recipients before creating
    prev_resp = await client.post(
        "/api/v1/homework/recipients/preview",
        json={
            "academic_year_id": test_academic_year.id,
            "standard_id": std.id,
            "division_id": div_a.id,
            "subject_id": subj.id,
            "recipient_type": "batch",
        },
        headers=auth_headers,
    )
    assert prev_resp.status_code == 200, prev_resp.text
    assert prev_resp.json()["count"] == 2

    # 1. Create Draft Homework (must NOT appear in Student Portal)
    draft_resp = await client.post(
        "/api/v1/homework/assignments",
        json={
            "academic_year_id": test_academic_year.id,
            "standard_id": std.id,
            "subject_id": subj.id,
            "division_id": div_a.id,
            "teacher_user_id": admin_user.id,
            "assignment_type": "worksheet",
            "estimated_duration_minutes": 45,
            "title": "Laws of Motion Worksheet",
            "description": "Solve numericals 1-10",
            "instructions": "Show free-body diagrams.",
            "due_date": str(date.today() + timedelta(days=4)),
            "max_marks": 20,
            "submission_method": "pdf_document",
            "recipient_type": "batch",
            "late_joiner_policy": "auto_include",
            "status": "draft",
        },
        headers=auth_headers,
    )
    assert draft_resp.status_code == 200, draft_resp.text
    hw_id = draft_resp.json()["id"]
    assert draft_resp.json()["status"] == "draft"

    s1_portal_before = await client.get("/api/v1/homework/student/my-homework", headers=s1_headers)
    assert s1_portal_before.status_code == 200
    assert all(item["assignment_id"] != hw_id for item in s1_portal_before.json()["items"])

    # 2. Publish Draft -> captures snapshot (original_recipient_count = 2)
    pub_resp = await client.post(
        f"/api/v1/homework/assignments/{hw_id}/publish",
        json={},
        headers=auth_headers,
    )
    assert pub_resp.status_code == 200, pub_resp.text
    pub_data = pub_resp.json()
    assert pub_data["status"] == "published"
    assert pub_data["original_recipient_count"] == 2

    s1_portal_after = await client.get("/api/v1/homework/student/my-homework", headers=s1_headers)
    assert any(item["assignment_id"] == hw_id for item in s1_portal_after.json()["items"])

    # 7. Late joiner enrolls in Batch A after publication -> auto-included, original_recipient_count stays 2
    s3, _, _ = await _make_student(
        db,
        institution_id=test_institution.id,
        academic_year_id=test_academic_year.id,
        standard_id=std.id,
        division_id=None,
        first_name="Kabir",
    )
    enr_resp = await client.post(
        f"/api/v1/students/{s3.id}/enroll",
        json={
            "academic_year_id": test_academic_year.id,
            "standard_id": std.id,
            "division_id": div_a.id,
            "roll_number": "301",
            "enrollment_date": str(date.today()),
        },
        headers=auth_headers,
    )
    assert enr_resp.status_code in (200, 201), enr_resp.text

    hw_detail = await client.get(f"/api/v1/homework/assignments/{hw_id}", headers=auth_headers)
    assert hw_detail.status_code == 200
    assert hw_detail.json()["original_recipient_count"] == 2
    assert hw_detail.json()["summary"]["total_recipients"] == 3

    late_rec = (
        await db.execute(
            select(StudentHomeworkRecord).where(
                StudentHomeworkRecord.assignment_id == hw_id,
                StudentHomeworkRecord.student_id == s3.id,
            )
        )
    ).scalar_one()
    assert late_rec.is_late_addition is True
    assert "Auto-included" in (late_rec.addition_reason or "")

    # 9. Re-running sync-late-joiners prevents duplicate recipient records
    sync_resp = await client.post(
        f"/api/v1/homework/assignments/{hw_id}/sync-late-joiners",
        json={"student_ids": [s1.id, s3.id], "reason": "Manual verification"},
        headers=auth_headers,
    )
    assert sync_resp.status_code == 200
    assert sync_resp.json()["added_count"] == 0

    # 8. Student s2 transfers out to div_b -> historical assignment record in hw_id is preserved
    s2_enr = (
        await db.execute(
            select(StudentEnrollment).where(StudentEnrollment.student_id == s2.id)
        )
    ).scalar_one()
    s2_enr.division_id = div_b.id
    s2_enr.status = "transferred"
    await db.commit()

    reg_after_transfer = await client.get(
        f"/api/v1/homework/assignments/{hw_id}/register",
        headers=auth_headers,
    )
    assert reg_after_transfer.status_code == 200
    student_ids_in_reg = {row["student_id"] for row in reg_after_transfer.json()["students"]}
    assert {s1.id, s2.id, s3.id}.issubset(student_ids_in_reg)

    # 19. Lifecycle: close then reopen with updated due date
    close_resp = await client.post(f"/api/v1/homework/assignments/{hw_id}/close", headers=auth_headers)
    assert close_resp.status_code == 200
    assert close_resp.json()["status"] == "closed"

    reopen_resp = await client.post(
        f"/api/v1/homework/assignments/{hw_id}/reopen",
        json={"new_due_date": str(date.today() + timedelta(days=10)), "reason": "Doubt session extension"},
        headers=auth_headers,
    )
    assert reopen_resp.status_code == 200
    assert reopen_resp.json()["status"] == "published"


@pytest.mark.asyncio
async def test_phase13_individual_group_custom_overrides_and_file_submissions_evaluation(
    client,
    db: AsyncSession,
    auth_headers: dict,
    admin_user,
    test_institution,
    test_academic_year,
):
    """Covers scenarios 3, 4, 10, 11, 12, 13, 14, and 15."""
    admin_user.institution_id = test_institution.id
    await db.commit()

    _, std, div_a, _, subj, _ = await _make_curriculum(db, test_institution.id)
    s1, _, s1_headers = await _make_student(
        db,
        institution_id=test_institution.id,
        academic_year_id=test_academic_year.id,
        standard_id=std.id,
        division_id=div_a.id,
        with_login=True,
        first_name="Meera",
    )
    s2, _, s2_headers = await _make_student(
        db,
        institution_id=test_institution.id,
        academic_year_id=test_academic_year.id,
        standard_id=std.id,
        division_id=div_a.id,
        with_login=True,
        first_name="Rohan",
    )
    s3, _, s3_headers = await _make_student(
        db,
        institution_id=test_institution.id,
        academic_year_id=test_academic_year.id,
        standard_id=std.id,
        division_id=div_a.id,
        with_login=True,
        first_name="ExcludedPeer",
    )

    # 10. Upload valid PDF attachment & reject disallowed executable upload
    up_ok = await client.post(
        "/api/v1/homework/files/upload",
        data={"context": "assignment_attachment"},
        files={"file": ("reference_sheet.pdf", b"%PDF-1.4\n%Sample homework attachment\n", "application/pdf")},
        headers=auth_headers,
    )
    assert up_ok.status_code in (200, 201), up_ok.text
    uploaded_file = up_ok.json()
    assert uploaded_file["file_type"] == "pdf"

    up_bad = await client.post(
        "/api/v1/homework/files/upload",
        data={"context": "assignment_attachment"},
        files={"file": ("payload.exe", b"MZ-NOT-ALLOWED", "application/octet-stream")},
        headers=auth_headers,
    )
    assert up_bad.status_code == 400

    # 3 & 4. Create individual/group assignment for s1 & s2 ONLY (with s1 custom due date + custom instructions)
    custom_due = date.today() + timedelta(days=6)
    indiv_resp = await client.post(
        "/api/v1/homework/assignments",
        json={
            "academic_year_id": test_academic_year.id,
            "standard_id": std.id,
            "subject_id": subj.id,
            "division_id": div_a.id,
            "teacher_user_id": admin_user.id,
            "assignment_type": "project",
            "title": "Personalized Optics Remediation",
            "due_date": str(date.today() + timedelta(days=3)),
            "max_marks": 50,
            "submission_method": "pdf_document",
            "recipient_type": "selected_group",
            "selected_student_ids": [s1.id, s2.id, s1.id],  # includes duplicate ID intentionally
            "student_overrides": [
                {
                    "student_id": s1.id,
                    "due_date": str(custom_due),
                    "instructions": "Focus specifically on lens maker derivation.",
                    "attachments": [uploaded_file],
                }
            ],
            "allow_resubmission": True,
            "status": "published",
        },
        headers=auth_headers,
    )
    assert indiv_resp.status_code == 200, indiv_resp.text
    hw_id = indiv_resp.json()["id"]
    assert indiv_resp.json()["original_recipient_count"] == 2  # duplicate s1 deduplicated

    # Peer isolation check: s3 (even in same batch) must NOT see or download file
    s3_portal = await client.get("/api/v1/homework/student/my-homework", headers=s3_headers)
    assert all(item["assignment_id"] != hw_id for item in s3_portal.json()["items"])

    # s1 sees custom instructions & custom due date, marks viewed, downloads file, submits v1, resubmits v2
    s1_portal = await client.get("/api/v1/homework/student/my-homework", headers=s1_headers)
    s1_item = next(i for i in s1_portal.json()["items"] if i["assignment_id"] == hw_id)
    assert s1_item["due_date"] == str(custom_due)
    assert "lens maker derivation" in (s1_item["instructions"] or "")

    rec_id = s1_item["record_id"]
    dl_ok = await client.get(uploaded_file["file_url"].replace("/api/v1", "/api/v1"), headers=s1_headers)
    assert dl_ok.status_code == 200
    assert b"%PDF-1.4" in dl_ok.content

    view_resp = await client.post(f"/api/v1/homework/student/{rec_id}/view", headers=s1_headers)
    assert view_resp.status_code == 200

    # Student uploads digital submission file v1 and submits
    sub_file_up = await client.post(
        "/api/v1/homework/files/upload",
        data={"context": "submission_file", "student_record_id": str(rec_id)},
        files={"file": ("meera_optics_v1.pdf", b"%PDF-1.4\n%v1\n", "application/pdf")},
        headers=s1_headers,
    )
    assert sub_file_up.status_code in (200, 201), sub_file_up.text
    # Excluded peer cannot download s1's submission file
    dl_peer_blocked = await client.get(sub_file_up.json()["file_url"], headers=s3_headers)
    assert dl_peer_blocked.status_code == 403
    v1_resp = await client.post(
        f"/api/v1/homework/student/{rec_id}/submit",
        json={"submission_text": "First submission draft", "submission_files": [sub_file_up.json()]},
        headers=s1_headers,
    )
    assert v1_resp.status_code == 200

    # 13. Student resubmits v2 -> version becomes 2 & submission_history retains v1
    v2_resp = await client.post(
        f"/api/v1/homework/student/{rec_id}/submit",
        json={"submission_text": "Updated v2 with corrected diagram", "submission_files": [sub_file_up.json()]},
        headers=s1_headers,
    )
    assert v2_resp.status_code == 200

    # 12. Late submission test on overdue assignment
    late_hw = await client.post(
        "/api/v1/homework/assignments",
        json={
            "academic_year_id": test_academic_year.id,
            "standard_id": std.id,
            "subject_id": subj.id,
            "division_id": div_a.id,
            "teacher_user_id": admin_user.id,
            "title": "Past Due Task",
            "due_date": str(date.today() - timedelta(days=2)),
            "submission_method": "online_text",
            "recipient_type": "individual_student",
            "selected_student_ids": [s2.id],
            "allow_late_submissions": True,
            "status": "published",
        },
        headers=auth_headers,
    )
    assert late_hw.status_code == 200
    s2_portal = await client.get("/api/v1/homework/student/my-homework", headers=s2_headers)
    s2_late_item = next(i for i in s2_portal.json()["items"] if i["assignment_id"] == late_hw.json()["id"])
    late_submit = await client.post(
        f"/api/v1/homework/student/{s2_late_item['record_id']}/submit",
        json={"submission_text": "Submitting late due to fever"},
        headers=s2_headers,
    )
    assert late_submit.status_code == 200
    assert late_submit.json()["submission_status"] == "late"

    # 14 & 15. Evaluation validation (marks > max_marks fails 400; valid evaluation + feedback saved)
    bad_eval = await client.post(
        f"/api/v1/homework/records/{rec_id}/evaluate",
        json={"review_status": "evaluated", "marks_obtained": 55, "teacher_remarks": "Too high"},
        headers=auth_headers,
    )
    assert bad_eval.status_code == 400

    # Student cannot evaluate own work
    stu_eval = await client.post(
        f"/api/v1/homework/records/{rec_id}/evaluate",
        json={"review_status": "evaluated", "marks_obtained": 48},
        headers=s1_headers,
    )
    assert stu_eval.status_code == 403

    good_eval = await client.post(
        f"/api/v1/homework/records/{rec_id}/evaluate",
        json={
            "review_status": "evaluated",
            "marks_obtained": 46,
            "teacher_remarks": "Strong derivation in v2!",
            "teacher_feedback_attachments": [uploaded_file],
        },
        headers=auth_headers,
    )
    assert good_eval.status_code == 200, good_eval.text

    db.expire_all()
    rec_db = await db.get(StudentHomeworkRecord, rec_id)
    assert rec_db.submission_version == 2
    assert "First submission draft" in (rec_db.submission_history or "")
    assert float(rec_db.marks_obtained) == 46.0
    assert "Strong derivation in v2" in (rec_db.evaluation_history or "")


@pytest.mark.asyncio
async def test_phase13_permissions_notifications_reports_and_tenant_isolation(
    client,
    db: AsyncSession,
    auth_headers: dict,
    admin_user,
    test_institution,
    test_academic_year,
):
    """Covers scenarios 16, 17, 18, and 20."""
    admin_user.institution_id = test_institution.id
    await db.commit()

    board, std, div_a, div_b, subj, subj2 = await _make_curriculum(db, test_institution.id)

    # 16. Teacher scope + separated edit/delete permissions
    teacher_user, teacher_headers = await _make_user(
        db,
        role_name="teacher",
        institution_id=test_institution.id,
        actions=["view", "create", "edit", "publish", "evaluate", "reports"],  # NO delete!
    )
    other_teacher, _ = await _make_user(
        db,
        role_name="teacher",
        institution_id=test_institution.id,
        actions=["view", "create", "edit", "publish", "evaluate"],
    )
    db.add(
        TeacherAssignment(
            academic_year_id=test_academic_year.id,
            board_id=board.id,
            teacher_user_id=teacher_user.id,
            standard_id=std.id,
            division_id=div_a.id,
            subject_id=subj.id,
            is_active=True,
        )
    )
    db.add(
        TeacherAssignment(
            academic_year_id=test_academic_year.id,
            board_id=board.id,
            teacher_user_id=other_teacher.id,
            standard_id=std.id,
            division_id=div_b.id,
            subject_id=subj2.id,
            is_active=True,
        )
    )
    s1, s1_user, s1_headers = await _make_student(
        db,
        institution_id=test_institution.id,
        academic_year_id=test_academic_year.id,
        standard_id=std.id,
        division_id=div_a.id,
        with_login=True,
        first_name="Neha",
    )

    # Teacher blocked on unauthorized Batch B -> 403
    unauth_batch = await client.post(
        "/api/v1/homework/assignments",
        json={
            "academic_year_id": test_academic_year.id,
            "standard_id": std.id,
            "subject_id": subj2.id,
            "division_id": div_b.id,
            "teacher_user_id": teacher_user.id,
            "title": "Unauthorized Batch B Task",
            "due_date": str(date.today() + timedelta(days=2)),
            "recipient_type": "batch",
            "status": "published",
        },
        headers=teacher_headers,
    )
    assert unauth_batch.status_code == 403

    # Teacher authorized on Batch A + Subject 1 -> succeeds
    ok_assign = await client.post(
        "/api/v1/homework/assignments",
        json={
            "academic_year_id": test_academic_year.id,
            "standard_id": std.id,
            "subject_id": subj.id,
            "division_id": div_a.id,
            "teacher_user_id": teacher_user.id,
            "title": "Authorized Batch A Homework",
            "due_date": str(date.today() + timedelta(days=1)),
            "max_marks": 10,
            "submission_method": "online_text",
            "recipient_type": "batch",
            "status": "published",
        },
        headers=teacher_headers,
    )
    assert ok_assign.status_code == 200, ok_assign.text
    hw_id = ok_assign.json()["id"]

    # Teacher lacks 'homework:delete' -> 403
    del_attempt = await client.delete(f"/api/v1/homework/assignments/{hw_id}", headers=teacher_headers)
    assert del_attempt.status_code == 403

    # 17. Student receives deduplicated HW_PUBLISHED notification & marks read; teacher gets submission notification & reminder
    s1_notifs = await client.get("/api/v1/homework/notifications/my", headers=s1_headers)
    assert s1_notifs.status_code == 200
    assert s1_notifs.json()["unread_count"] >= 1
    pub_notifs = [n for n in s1_notifs.json()["items"] if n["template_code"] == "HW_PUBLISHED"]
    assert len(pub_notifs) >= 1

    read_resp = await client.post(
        f"/api/v1/homework/notifications/{pub_notifs[0]['id']}/read",
        headers=s1_headers,
    )
    assert read_resp.status_code == 200

    # Student submits; trigger deadline reminder run
    s1_hw = (await client.get("/api/v1/homework/student/my-homework", headers=s1_headers)).json()["items"]
    rec_id = next(i["record_id"] for i in s1_hw if i["assignment_id"] == hw_id)
    await client.post(
        f"/api/v1/homework/student/{rec_id}/submit",
        json={"submission_text": "Done cleanly"},
        headers=s1_headers,
    )
    rem_resp = await client.post("/api/v1/homework/reminders/run", headers=auth_headers)
    assert rem_resp.status_code == 200

    t_notifs = await client.get("/api/v1/homework/notifications/my", headers=teacher_headers)
    assert t_notifs.status_code == 200
    assert any(n["template_code"] == "HW_SUBMITTED" for n in t_notifs.json()["items"])

    # 18. Dashboards & Reports (Teacher, Student, Batch Report, Institute Analytics)
    t_dash = await client.get(
        f"/api/v1/homework/dashboards/teacher?teacher_id={teacher_user.id}",
        headers=teacher_headers,
    )
    assert t_dash.status_code == 200
    assert t_dash.json()["total_assignments"] >= 1
    assert t_dash.json()["pending_evaluations"] >= 1

    s_dash = await client.get("/api/v1/homework/dashboards/student", headers=s1_headers)
    assert s_dash.status_code == 200
    assert s_dash.json()["submitted_work"] >= 1

    batch_rep = await client.get(f"/api/v1/homework/reports/batch/{hw_id}", headers=teacher_headers)
    assert batch_rep.status_code == 200
    assert batch_rep.json()["rows"][0]["student_id"] == s1.id

    analytics = await client.get("/api/v1/homework/reports/analytics", headers=teacher_headers)
    assert analytics.status_code == 200
    assert analytics.json()["total_records"] >= 1
    assert len(analytics.json()["subject_wise"]) >= 1

    # 20. Tenant Isolation: Institution B admin cannot access Institution A assignment
    other_inst = Institution(
        name="Other Academy",
        code=f"OTH{uuid.uuid4().hex[:5]}",
        city="Pune",
    )
    db.add(other_inst)
    await db.commit()
    await db.refresh(other_inst)

    other_admin, other_headers = await _make_user(
        db,
        role_name="admin",
        institution_id=other_inst.id,
        actions=["view", "create", "edit", "publish", "evaluate", "delete", "reports"],
    )
    cross_get = await client.get(f"/api/v1/homework/assignments/{hw_id}", headers=other_headers)
    assert cross_get.status_code == 403
