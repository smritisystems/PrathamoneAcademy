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
#  * @version     1.0.0
#  * @created     2026-11-11
#  * @updated     2026-11-11
#  *
#  * @description Domain service implementing core business logic for Homework creation, recipient resolution, physical checking, digital submissions, and academic activity tracking.
#  */

import json
from datetime import datetime, date, timezone
from decimal import Decimal
from typing import Dict, Any, List, Optional, Set
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc, asc
from sqlalchemy.orm import selectinload

from app.models.homework import HomeworkAssignment, StudentHomeworkRecord, HomeworkAuditLog
from app.models.student import Student
from app.models.enrollment import StudentEnrollment
from app.models.standard import Standard
from app.models.division import Division
from app.models.subject import Subject
from app.models.user import User
from app.models.teacher_payroll import TeachingSession
from app.models.exam import Examination, ExamMark
from app.models.attendance import Attendance


class HomeworkService:

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

        # Collision verification loop
        while True:
            candidate = f"{prefix}{num:04d}"
            exists_stmt = select(HomeworkAssignment.id).where(HomeworkAssignment.assignment_code == candidate)
            exists = (await db.execute(exists_stmt)).scalar_one_or_none()
            if not exists:
                return candidate
            num += 1

    @staticmethod
    async def create_assignment(
        db: AsyncSession,
        payload: Dict[str, Any],
        actor_user_id: int,
        institution_id: int = 1,
    ) -> HomeworkAssignment:
        """
        Creates a new homework assignment and automatically provisions independent
        student tracking records for all eligible recipients.
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
            status=payload.get("status", "published"),
            publish_at=payload.get("publish_at"),
            attachments=attachments_str,
            allow_late_submissions=payload.get("allow_late_submissions", True),
            is_template=payload.get("is_template", False),
            template_name=payload.get("template_name"),
            created_by_id=actor_user_id,
        )

        db.add(assignment)
        await db.flush()

        # Provision Student Tracking Records if status is 'published' or 'scheduled'
        resolved_students = await HomeworkService.resolve_recipients(
            db, assignment, payload.get("selected_student_ids")
        )

        for enrollment in resolved_students:
            record = StudentHomeworkRecord(
                institution_id=institution_id,
                assignment_id=assignment.id,
                student_id=enrollment.student_id,
                enrollment_id=enrollment.id,
                division_id=enrollment.division_id,
                publication_time=datetime.now(timezone.utc),
                individual_due_date=assignment.due_date,
                individual_due_time=assignment.due_time,
                status="assigned",
                submission_status="pending",
                review_status="pending",
            )
            db.add(record)

        # Audit log
        audit = HomeworkAuditLog(
            assignment_id=assignment.id,
            actor_user_id=actor_user_id,
            action="created",
            previous_status=None,
            new_status=assignment.status,
            details=f"Assignment {assignment.assignment_code} created with {len(resolved_students)} recipients.",
        )
        db.add(audit)

        await db.commit()
        await db.refresh(assignment)
        return assignment

    @staticmethod
    async def resolve_recipients(
        db: AsyncSession,
        assignment: HomeworkAssignment,
        selected_student_ids: Optional[List[int]] = None,
    ) -> List[StudentEnrollment]:
        """
        Resolves the list of active student enrollments for an assignment,
        guaranteeing zero duplicates across multiple recipient batches.
        """
        recipient_type = assignment.recipient_type

        # 1. Specific student IDs provided
        if recipient_type in ("selected_students", "individual_student") or selected_student_ids:
            if not selected_student_ids:
                return []
            stmt = (
                select(StudentEnrollment)
                .join(Student, StudentEnrollment.student_id == Student.id)
                .where(
                    and_(
                        StudentEnrollment.student_id.in_(selected_student_ids),
                        StudentEnrollment.academic_year_id == assignment.academic_year_id,
                        StudentEnrollment.status == "active",
                        Student.is_active == True,
                    )
                )
            )
            res = await db.execute(stmt)
            enrollments = res.scalars().all()
            # Deduplicate by student_id
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
                    )
                )
            )
            res = await db.execute(stmt)
            enrollments = res.scalars().all()
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
                    )
                )
            )
            res = await db.execute(stmt)
            return res.scalars().all()

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
                )
            )
        )
        res = await db.execute(stmt)
        enrollments = res.scalars().all()
        seen_students = set()
        deduped = []
        for e in enrollments:
            if e.student_id not in seen_students:
                seen_students.add(e.student_id)
                deduped.append(e)
        return deduped

    @staticmethod
    async def check_physical_homework(
        db: AsyncSession,
        assignment_id: int,
        items: List[Dict[str, Any]],
        reviewer_user_id: int,
    ) -> Dict[str, Any]:
        """
        Executes physical homework checking register operations:
        Mark Done, Incomplete, Not Done, Absent / Not Checked, Excused,
        along with marks and remarks.
        """
        stmt = select(HomeworkAssignment).where(HomeworkAssignment.id == assignment_id)
        res = await db.execute(stmt)
        assignment = res.scalar_one_or_none()
        if not assignment:
            raise ValueError(f"Homework Assignment ID {assignment_id} not found.")

        updated_count = 0
        now = datetime.now(timezone.utc)

        for item in items:
            record_id = item.get("record_id")
            student_id = item.get("student_id")
            review_status = item.get("review_status", "done")  # done | incomplete | not_done | absent_not_checked | excused
            remarks = item.get("teacher_remarks")
            marks = item.get("marks_obtained")
            exemption_reason = item.get("exemption_reason")

            rec_stmt = select(StudentHomeworkRecord).where(
                and_(
                    StudentHomeworkRecord.assignment_id == assignment_id,
                    or_(
                        StudentHomeworkRecord.id == record_id if record_id else False,
                        StudentHomeworkRecord.student_id == student_id if student_id else False,
                    )
                )
            )
            rec_res = await db.execute(rec_stmt)
            record = rec_res.scalar_one_or_none()

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
                record.marks_obtained = Decimal(str(marks))

            if review_status == "done":
                record.status = "completed"
                record.submission_status = "submitted"
            elif review_status == "incomplete":
                record.status = "resubmit_required"
            elif review_status == "not_done":
                record.status = "pending"
                record.submission_status = "not_submitted"
            elif review_status == "absent_not_checked":
                record.status = "assigned"
            elif review_status == "excused":
                record.status = "excused"
                record.submission_status = "excused"
                if exemption_reason:
                    record.exemption_reason = exemption_reason

            audit = HomeworkAuditLog(
                assignment_id=assignment_id,
                student_record_id=record.id,
                actor_user_id=reviewer_user_id,
                action="checked",
                previous_status=f"{prev_status}:{prev_review}",
                new_status=f"{record.status}:{record.review_status}",
                details=f"Review updated to {review_status}. Remarks: {remarks or 'None'}",
            )
            db.add(audit)
            updated_count += 1

        await db.commit()
        return {"success": True, "updated_count": updated_count}

    @staticmethod
    async def submit_digital_homework(
        db: AsyncSession,
        record_id: int,
        student_user: User,
        payload: Dict[str, Any],
    ) -> StudentHomeworkRecord:
        """
        Allows students to digitally submit homework (photos, PDF files, text).
        Enforces student isolation and checks due dates.
        """
        stmt = (
            select(StudentHomeworkRecord)
            .options(selectinload(StudentHomeworkRecord.assignment))
            .where(StudentHomeworkRecord.id == record_id)
        )
        res = await db.execute(stmt)
        record = res.scalar_one_or_none()
        if not record:
            raise ValueError(f"Student homework record ID {record_id} not found.")

        # Security check: if role is student, must own the record
        if student_user.role == "student" and student_user.student_id != record.student_id:
            raise PermissionError("Access denied: You cannot submit work for another student.")

        now = datetime.now(timezone.utc)
        today = date.today()

        submission_text = payload.get("submission_text")
        submission_files = payload.get("submission_files")
        if isinstance(submission_files, list):
            submission_files_str = json.dumps(submission_files)
        elif isinstance(submission_files, str):
            submission_files_str = submission_files
        else:
            submission_files_str = None

        record.submission_text = submission_text
        record.submission_files = submission_files_str
        record.submission_time = now

        # Determine late submission
        effective_due_date = record.individual_due_date or record.assignment.due_date
        is_late = today > effective_due_date

        if is_late:
            record.status = "late_submitted"
            record.submission_status = "late"
        else:
            record.status = "submitted"
            record.submission_status = "submitted"

        audit = HomeworkAuditLog(
            assignment_id=record.assignment_id,
            student_record_id=record.id,
            actor_user_id=student_user.id,
            action="submitted",
            previous_status="pending",
            new_status=record.status,
            details=f"Digital submission received ({'Late' if is_late else 'On-time'}).",
        )
        db.add(audit)
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
    ) -> StudentHomeworkRecord:
        """
        Teachers request resubmission when work is incomplete or unsatisfactory,
        preserving history and incrementing resubmission counter.
        """
        stmt = select(StudentHomeworkRecord).where(StudentHomeworkRecord.id == record_id)
        res = await db.execute(stmt)
        record = res.scalar_one_or_none()
        if not record:
            raise ValueError(f"Record {record_id} not found.")

        history_item = {
            "resubmission_number": record.resubmission_count + 1,
            "previous_submission_time": record.submission_time.isoformat() if record.submission_time else None,
            "previous_text": record.submission_text,
            "previous_files": record.submission_files,
            "teacher_remarks": remarks,
            "requested_at": datetime.now(timezone.utc).isoformat(),
        }

        curr_history = []
        if record.resubmission_history:
            try:
                curr_history = json.loads(record.resubmission_history)
            except Exception:
                curr_history = []
        curr_history.append(history_item)

        record.resubmission_history = json.dumps(curr_history)
        record.resubmission_count += 1
        record.status = "resubmit_required"
        record.submission_status = "pending"
        record.review_status = "incomplete"
        record.teacher_remarks = remarks
        if extended_due_date:
            record.individual_due_date = extended_due_date

        audit = HomeworkAuditLog(
            assignment_id=record.assignment_id,
            student_record_id=record.id,
            actor_user_id=teacher_user_id,
            action="resubmission_requested",
            previous_status=record.status,
            new_status="resubmit_required",
            details=f"Resubmission #{record.resubmission_count} requested. Reason: {remarks}",
        )
        db.add(audit)
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
    ) -> StudentHomeworkRecord:
        """
        Extends the individual due date for a student.
        """
        stmt = select(StudentHomeworkRecord).where(StudentHomeworkRecord.id == record_id)
        res = await db.execute(stmt)
        record = res.scalar_one_or_none()
        if not record:
            raise ValueError(f"Record {record_id} not found.")

        old_date = record.individual_due_date
        record.individual_due_date = new_due_date
        if record.status == "overdue":
            record.status = "assigned"

        audit = HomeworkAuditLog(
            assignment_id=record.assignment_id,
            student_record_id=record.id,
            actor_user_id=teacher_user_id,
            action="extended_due_date",
            previous_status=str(old_date),
            new_status=str(new_due_date),
            details=f"Due date extended from {old_date} to {new_due_date}. Reason: {reason or 'Not specified'}",
        )
        db.add(audit)
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
        """
        Exempts an individual student from an assignment.
        """
        stmt = select(StudentHomeworkRecord).where(StudentHomeworkRecord.id == record_id)
        res = await db.execute(stmt)
        record = res.scalar_one_or_none()
        if not record:
            raise ValueError(f"Record {record_id} not found.")

        record.status = "excused"
        record.submission_status = "excused"
        record.review_status = "excused"
        record.exemption_reason = reason

        audit = HomeworkAuditLog(
            assignment_id=record.assignment_id,
            student_record_id=record.id,
            actor_user_id=teacher_user_id,
            action="excused",
            previous_status=record.status,
            new_status="excused",
            details=f"Student excused from homework. Reason: {reason}",
        )
        db.add(audit)
        await db.commit()
        await db.refresh(record)
        return record

    @staticmethod
    async def get_assignment_summary(db: AsyncSession, assignment_id: int) -> Dict[str, Any]:
        """
        Computes accurate real-time completion, checking, and submission KPIs.
        """
        stmt = select(StudentHomeworkRecord).where(StudentHomeworkRecord.assignment_id == assignment_id)
        res = await db.execute(stmt)
        records = res.scalars().all()

        total = len(records)
        completed = sum(1 for r in records if r.status == "completed" or r.review_status == "done")
        submitted = sum(1 for r in records if r.submission_status in ("submitted", "late"))
        pending_check = sum(1 for r in records if r.review_status == "pending" and r.status != "excused")
        checked = sum(1 for r in records if r.review_status in ("done", "incomplete", "not_done", "excused"))
        excused = sum(1 for r in records if r.status == "excused" or r.review_status == "excused")
        
        today = date.today()
        overdue = sum(
            1 for r in records
            if r.status not in ("completed", "excused")
            and r.submission_status != "submitted"
            and (r.individual_due_date or today) < today
        )

        completion_pct = round((completed / total * 100), 1) if total > 0 else 0.0

        return {
            "total_recipients": total,
            "completed_count": completed,
            "submitted_count": submitted,
            "pending_check_count": pending_check,
            "checked_count": checked,
            "overdue_count": overdue,
            "excused_count": excused,
            "completion_percentage": completion_pct,
        }

    @staticmethod
    async def get_unified_academic_activity_register(
        db: AsyncSession,
        student_id: int,
    ) -> List[Dict[str, Any]]:
        """
        Phase 8: Unified chronological student academic activity register uniting:
        1. Homework Assignments & Checking Records
        2. Examinations & Score Marks
        3. Teaching Sessions
        4. Attendance Records
        """
        activities: List[Dict[str, Any]] = []

        # 1. Homework Records
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
            .where(StudentHomeworkRecord.student_id == student_id)
            .order_by(desc(StudentHomeworkRecord.created_at))
        )
        hw_res = await db.execute(hw_stmt)
        for r, title, code, subj, due_dt, max_m in hw_res.all():
            activities.append({
                "type": "HOMEWORK",
                "timestamp": r.reviewed_at or r.submission_time or r.created_at,
                "date": str(due_dt),
                "title": f"Homework: {title} ({code})",
                "subject": subj,
                "status": r.status,
                "review_status": r.review_status,
                "marks_obtained": float(r.marks_obtained) if r.marks_obtained is not None else None,
                "max_marks": float(max_m) if max_m is not None else None,
                "remarks": r.teacher_remarks,
                "badge_color": "emerald" if r.status == "completed" else "amber" if r.status == "assigned" else "red",
            })

        # 2. Exam Marks
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
            activities.append({
                "type": "EXAMINATION",
                "timestamp": mark.created_at,
                "date": str(mark.created_at.date() if mark.created_at else date.today()),
                "title": f"{exam_name} ({exam_type})",
                "subject": subj,
                "status": "Absent" if mark.is_absent else f"Grade {mark.grade or 'N/A'}",
                "review_status": "Graded",
                "marks_obtained": float(mark.marks_obtained) if mark.marks_obtained is not None else None,
                "max_marks": float(max_m) if max_m is not None else None,
                "remarks": mark.remarks,
                "badge_color": "indigo",
            })

        # 3. Attendance Records (Recent sample)
        att_stmt = (
            select(Attendance)
            .where(Attendance.student_id == student_id)
            .order_by(desc(Attendance.date))
            .limit(20)
        )
        att_res = await db.execute(att_stmt)
        for att in att_res.scalars().all():
            activities.append({
                "type": "ATTENDANCE",
                "timestamp": att.created_at,
                "date": str(att.date),
                "title": f"Daily Attendance — {att.status.capitalize()}",
                "subject": "General Presence",
                "status": att.status,
                "review_status": "Recorded",
                "marks_obtained": None,
                "max_marks": None,
                "remarks": att.remarks,
                "badge_color": "emerald" if att.status == "present" else "red" if att.status == "absent" else "amber",
            })

        # Sort all chronological descending
        activities.sort(key=lambda x: str(x["timestamp"]), reverse=True)
        return activities
