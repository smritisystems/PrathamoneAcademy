# /**
#  * @file        safe_delete_service.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      backend.app.services.safe_delete_service
#  *
#  * @author      Jawahar R. Mallah
#  * @organization AITDL (AI Technology & Development Lab)
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 AITDL
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-10
#  * @updated     2026-11-10
#  *
#  * @description Canonical Safe Delete & Data Integrity Service enforcing dependency checks, audit logging, and financial ledger immutability.
#  */

import json
from decimal import Decimal
from dataclasses import dataclass, field, asdict
from typing import Optional, Dict, List, Any
from sqlalchemy import select, func, or_, and_
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from app.models import (
    User, AuditLog, Student, StudentEnrollment, StudentDocument,
    Standard, Division, Subject, CanonicalSubject, SubjectMapping, AcademicYear,
    FeeCategory, FeeStructure, StudentFeeAssignment, FeeInvoice, FeeInvoiceItem,
    Payment, PaymentReceipt, Refund, Attendance, Examination, ExamMark,
    TimetableEntry, StaffProfile, TeacherAssignment, StaffAttendance, StaffLeave,
    TeacherPayroll, TeachingSession, Lead, LeadFollowUp, LeadDemoClass, LookupItem
)


@dataclass
class DeletionEligibilityReport:
    entity_type: str
    entity_id: int | str
    entity_name: str
    is_eligible: bool
    block_category: Optional[str] = None  # 'linked_records', 'transaction_history', 'configuration_dependency', 'system_protected'
    block_reason: Optional[str] = None
    dependent_counts: Dict[str, int] = field(default_factory=dict)
    dependent_details: List[str] = field(default_factory=list)
    can_deactivate: bool = False
    can_archive: bool = False
    recommended_action: str = "delete"  # "delete" | "deactivate" | "archive" | "reversal"
    reversal_guidance: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class SafeDeleteService:
    """
    Single Source of Truth (SSOT) engine for safe deletion, pre-flight dependency audits,
    and data integrity protection across PrathamOne EduOS.
    """

    FINANCIAL_IMMUTABLE_TYPES = {
        "payment_receipt", "refund", "teacher_payroll", "fee_installment"
    }

    @classmethod
    async def check_eligibility(
        cls,
        db: AsyncSession,
        entity_type: str,
        entity_id: int | str,
        current_user: Optional[User] = None,
    ) -> DeletionEligibilityReport:
        """
        Runs comprehensive pre-flight dependency analysis to determine if an entity
        can be safely and permanently deleted or must be blocked / deactivated / archived.
        """
        normalized_type = entity_type.strip().lower()

        # 1. Financial Ledger & Immutable Transaction Protection
        if normalized_type in cls.FINANCIAL_IMMUTABLE_TYPES:
            return DeletionEligibilityReport(
                entity_type=normalized_type,
                entity_id=entity_id,
                entity_name=f"{entity_type.replace('_', ' ').title()} #{entity_id}",
                is_eligible=False,
                block_category="transaction_history",
                block_reason=(
                    f"Permanent deletion prohibited: {entity_type.replace('_', ' ').title()} is a posted financial ledger "
                    "record. In accordance with Single Source of Truth and double-entry accounting standards, "
                    "financial transactions cannot be permanently erased."
                ),
                dependent_counts={"Posted Financial Records": 1},
                dependent_details=["Immutable double-entry accounting transaction record"],
                can_deactivate=False,
                can_archive=False,
                recommended_action="reversal",
                reversal_guidance=(
                    "To correct an error, use the authorized 'Reversal', 'Void', or 'Cancellation' workflow "
                    "which preserves the audit trail while nullifying financial impact."
                )
            )

        # 2. Domain-Specific Dependency Audits
        handler_map = {
            "user": cls._check_user,
            "student": cls._check_student,
            "standard": cls._check_standard,
            "division": cls._check_division,
            "batch": cls._check_division,
            "canonical_subject": cls._check_canonical_subject,
            "subject": cls._check_subject,
            "subject_mapping": cls._check_subject_mapping,
            "fee_category": cls._check_fee_category,
            "fee_structure": cls._check_fee_structure,
            "academic_year": cls._check_academic_year,
            "examination": cls._check_examination,
            "exam": cls._check_examination,
            "lead": cls._check_lead,
            "lookup_item": cls._check_lookup_item,
            "payment": cls._check_payment,
            "fee_invoice": cls._check_fee_invoice,
            "invoice": cls._check_fee_invoice,
        }

        handler = handler_map.get(normalized_type)
        if handler:
            return await handler(db, int(entity_id), current_user)

        # Fallback for unrecognized entity types: block by default to ensure safety
        return DeletionEligibilityReport(
            entity_type=normalized_type,
            entity_id=entity_id,
            entity_name=f"{normalized_type} #{entity_id}",
            is_eligible=False,
            block_category="configuration_dependency",
            block_reason=f"Safe delete rule not configured for entity type '{entity_type}'. Safe delete blocked by default.",
            recommended_action="deactivate",
            can_deactivate=True,
        )

    # ──────────────────────────────────────────────────────────────────────────
    # Entity Handlers
    # ──────────────────────────────────────────────────────────────────────────

    @classmethod
    async def _check_user(cls, db: AsyncSession, user_id: int, current_user: Optional[User]) -> DeletionEligibilityReport:
        user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=404, detail=f"User with ID {user_id} not found")

        name = user.full_name or user.username
        counts: Dict[str, int] = {}
        details: List[str] = []

        if current_user and current_user.id == user_id:
            return DeletionEligibilityReport(
                entity_type="user",
                entity_id=user_id,
                entity_name=name,
                is_eligible=False,
                block_category="system_protected",
                block_reason="Security Policy: You cannot delete your own account.",
                can_deactivate=False,
                recommended_action="deactivate"
            )

        if user.role in ("sysadmin", "super_admin", "superadmin"):
            super_count = (
                await db.execute(
                    select(func.count(User.id)).where(User.role.in_(["sysadmin", "super_admin", "superadmin"]), User.is_active == True)
                )
            ).scalar() or 0
            if super_count <= 1:
                return DeletionEligibilityReport(
                    entity_type="user",
                    entity_id=user_id,
                    entity_name=name,
                    is_eligible=False,
                    block_category="system_protected",
                    block_reason="Security Policy: Cannot delete the sole remaining active System Administrator.",
                    can_deactivate=False,
                    recommended_action="deactivate"
                )

        # Payroll
        p_count = (await db.execute(select(func.count(TeacherPayroll.id)).where(TeacherPayroll.teacher_user_id == user_id))).scalar() or 0
        if p_count > 0:
            counts["Teacher Payroll Records"] = p_count
            details.append(f"{p_count} Teacher Payroll voucher(s)")

        # Teaching Sessions
        s_count = (await db.execute(select(func.count(TeachingSession.id)).where(TeachingSession.teacher_user_id == user_id))).scalar() or 0
        if s_count > 0:
            counts["Teaching Sessions"] = s_count
            details.append(f"{s_count} Teaching Session(s)")

        # Teacher Assignments
        a_count = (await db.execute(select(func.count(TeacherAssignment.id)).where(TeacherAssignment.teacher_user_id == user_id))).scalar() or 0
        if a_count > 0:
            counts["Teacher Assignments"] = a_count
            details.append(f"{a_count} Subject/Batch Assignment(s)")

        # Staff Attendance
        att_count = (await db.execute(select(func.count(StaffAttendance.id)).where(StaffAttendance.user_id == user_id))).scalar() or 0
        if att_count > 0:
            counts["Staff Attendance Records"] = att_count
            details.append(f"{att_count} Staff Attendance log(s)")

        # Staff Leaves
        l_count = (await db.execute(select(func.count(StaffLeave.id)).where(StaffLeave.user_id == user_id))).scalar() or 0
        if l_count > 0:
            counts["Staff Leaves"] = l_count
            details.append(f"{l_count} Staff Leave record(s)")

        # Payments Processed
        pay_count = (await db.execute(
            select(func.count(Payment.id)).where(
                or_(
                    Payment.collected_by_id == user_id,
                    Payment.submitted_by_id == user_id,
                    Payment.approved_by_id == user_id,
                    Payment.posted_by_id == user_id,
                )
            )
        )).scalar() or 0
        if pay_count > 0:
            counts["Payments Processed"] = pay_count
            details.append(f"{pay_count} Processed/Approved Payment record(s)")

        # Divisions where Class Teacher
        div_count = (await db.execute(select(func.count(Division.id)).where(Division.class_teacher_id == user_id))).scalar() or 0
        if div_count > 0:
            counts["Class Teacher Batches"] = div_count
            details.append(f"{div_count} Batch(es) where assigned as Class Teacher")

        # Student Enrollments (if linked)
        if user.student_id:
            enr_count = (await db.execute(select(func.count(StudentEnrollment.id)).where(StudentEnrollment.student_id == user.student_id))).scalar() or 0
            if enr_count > 0:
                counts["Student Enrollments"] = enr_count
                details.append(f"{enr_count} Student Enrollment record(s)")

        is_eligible = len(counts) == 0
        block_category = None
        block_reason = None
        if not is_eligible:
            has_transactions = (p_count > 0 or s_count > 0 or pay_count > 0 or att_count > 0)
            block_category = "transaction_history" if has_transactions else "linked_records"
            block_reason = (
                f"Cannot permanently delete user '{name}'. Active dependencies exist: {', '.join(details)}. "
                "Deactivate the user account instead to preserve audit logs, historical payroll, and attendance history."
            )

        return DeletionEligibilityReport(
            entity_type="user",
            entity_id=user_id,
            entity_name=name,
            is_eligible=is_eligible,
            block_category=block_category,
            block_reason=block_reason,
            dependent_counts=counts,
            dependent_details=details,
            can_deactivate=True,
            can_archive=False,
            recommended_action="delete" if is_eligible else "deactivate"
        )

    @classmethod
    async def _check_student(cls, db: AsyncSession, student_id: int, current_user: Optional[User]) -> DeletionEligibilityReport:
        student = (await db.execute(select(Student).where(Student.id == student_id))).scalar_one_or_none()
        if not student:
            raise HTTPException(status_code=404, detail=f"Student with ID {student_id} not found")

        name = f"{student.first_name} {student.last_name}".strip()
        counts: Dict[str, int] = {}
        details: List[str] = []

        # 1. Enrollments
        enr_count = (await db.execute(select(func.count(StudentEnrollment.id)).where(StudentEnrollment.student_id == student_id))).scalar() or 0
        if enr_count > 0:
            counts["Academic Enrollments"] = enr_count
            details.append(f"{enr_count} Academic Enrollment record(s)")

        # 2. Fee Invoices
        inv_count = (await db.execute(select(func.count(FeeInvoice.id)).where(FeeInvoice.student_id == student_id))).scalar() or 0
        if inv_count > 0:
            counts["Fee Invoices"] = inv_count
            details.append(f"{inv_count} Fee Invoice(s)")

        # 3. Payments
        pay_count = (await db.execute(select(func.count(Payment.id)).where(Payment.student_id == student_id))).scalar() or 0
        if pay_count > 0:
            counts["Payments & Receipts"] = pay_count
            details.append(f"{pay_count} Payment / Receipt record(s)")

        # 4. Attendance
        att_count = (await db.execute(select(func.count(Attendance.id)).where(Attendance.student_id == student_id))).scalar() or 0
        if att_count > 0:
            counts["Attendance Logs"] = att_count
            details.append(f"{att_count} Attendance record(s)")

        # 5. Exam Marks
        marks_count = (await db.execute(select(func.count(ExamMark.id)).where(ExamMark.student_id == student_id))).scalar() or 0
        if marks_count > 0:
            counts["Exam Marks Recorded"] = marks_count
            details.append(f"{marks_count} Examination Mark entry(ies)")

        # 6. Student Documents
        doc_count = (await db.execute(select(func.count(StudentDocument.id)).where(StudentDocument.student_id == student_id))).scalar() or 0
        if doc_count > 0:
            counts["Uploaded Documents"] = doc_count
            details.append(f"{doc_count} Official Student Document(s)")

        # 7. Converted Lead
        lead_count = (await db.execute(select(func.count(Lead.id)).where(Lead.converted_student_id == student_id))).scalar() or 0
        if lead_count > 0:
            counts["CRM Converted Leads"] = lead_count
            details.append(f"{lead_count} CRM Lead record(s)")

        is_eligible = len(counts) == 0
        block_category = None
        block_reason = None
        if not is_eligible:
            has_transactions = (inv_count > 0 or pay_count > 0 or att_count > 0 or marks_count > 0)
            block_category = "transaction_history" if has_transactions else "linked_records"
            block_reason = (
                f"Cannot permanently delete student '{name}' ({student.admission_number}). "
                f"Historical academic and financial records exist: {', '.join(details)}. "
                "Permanent deletion would corrupt historical marks, fees, and audit records. "
                "Use the Student Exit / Withdrawal workflow or deactivate the profile instead."
            )

        return DeletionEligibilityReport(
            entity_type="student",
            entity_id=student_id,
            entity_name=f"{name} ({student.admission_number})",
            is_eligible=is_eligible,
            block_category=block_category,
            block_reason=block_reason,
            dependent_counts=counts,
            dependent_details=details,
            can_deactivate=True,
            can_archive=True,
            recommended_action="delete" if is_eligible else "deactivate"
        )

    @classmethod
    async def _check_standard(cls, db: AsyncSession, standard_id: int, current_user: Optional[User]) -> DeletionEligibilityReport:
        standard = (await db.execute(select(Standard).where(Standard.id == standard_id))).scalar_one_or_none()
        if not standard:
            raise HTTPException(status_code=404, detail=f"Standard with ID {standard_id} not found")

        name = standard.name
        counts: Dict[str, int] = {}
        details: List[str] = []

        # 1. Batches / Divisions
        div_count = (await db.execute(select(func.count(Division.id)).where(Division.standard_id == standard_id))).scalar() or 0
        if div_count > 0:
            counts["Batches / Divisions"] = div_count
            details.append(f"{div_count} Batch / Division(s)")

        # 2. Student Enrollments
        enr_count = (await db.execute(select(func.count(StudentEnrollment.id)).where(StudentEnrollment.standard_id == standard_id))).scalar() or 0
        if enr_count > 0:
            counts["Enrolled Students"] = enr_count
            details.append(f"{enr_count} Enrolled Student(s)")

        # 3. Subject Mappings
        sm_count = (await db.execute(select(func.count(SubjectMapping.id)).where(SubjectMapping.standard_id == standard_id))).scalar() or 0
        if sm_count > 0:
            counts["Subject Mappings"] = sm_count
            details.append(f"{sm_count} Subject Mapping(s)")

        # 4. Fee Structures
        fs_count = (await db.execute(select(func.count(FeeStructure.id)).where(FeeStructure.standard_id == standard_id))).scalar() or 0
        if fs_count > 0:
            counts["Fee Structures"] = fs_count
            details.append(f"{fs_count} Fee Structure(s)")

        # 5. Examinations
        ex_count = (await db.execute(select(func.count(Examination.id)).where(Examination.standard_id == standard_id))).scalar() or 0
        if ex_count > 0:
            counts["Scheduled Examinations"] = ex_count
            details.append(f"{ex_count} Examination(s)")

        is_eligible = len(counts) == 0
        block_category = None
        block_reason = None
        if not is_eligible:
            block_category = "linked_records"
            block_reason = (
                f"Cannot permanently delete Class '{name}'. Active curriculum and batch dependencies exist: {', '.join(details)}. "
                "Deactivate this standard to hide it from future academic years without destroying historical data."
            )

        return DeletionEligibilityReport(
            entity_type="standard",
            entity_id=standard_id,
            entity_name=name,
            is_eligible=is_eligible,
            block_category=block_category,
            block_reason=block_reason,
            dependent_counts=counts,
            dependent_details=details,
            can_deactivate=True,
            can_archive=False,
            recommended_action="delete" if is_eligible else "deactivate"
        )

    @classmethod
    async def _check_division(cls, db: AsyncSession, division_id: int, current_user: Optional[User]) -> DeletionEligibilityReport:
        division = (await db.execute(select(Division).where(Division.id == division_id))).scalar_one_or_none()
        if not division:
            raise HTTPException(status_code=404, detail=f"Batch with ID {division_id} not found")

        name = division.name
        counts: Dict[str, int] = {}
        details: List[str] = []

        # 1. Enrolled Students
        enr_count = (await db.execute(select(func.count(StudentEnrollment.id)).where(StudentEnrollment.division_id == division_id))).scalar() or 0
        if enr_count > 0:
            counts["Enrolled Students"] = enr_count
            details.append(f"{enr_count} Enrolled Student(s)")

        # 2. Timetable Entries
        tt_count = (await db.execute(select(func.count(TimetableEntry.id)).where(TimetableEntry.division_id == division_id))).scalar() or 0
        if tt_count > 0:
            counts["Timetable Entries"] = tt_count
            details.append(f"{tt_count} Timetable Schedule(s)")

        # 3. Teaching Sessions
        sess_count = (await db.execute(select(func.count(TeachingSession.id)).where(TeachingSession.division_id == division_id))).scalar() or 0
        if sess_count > 0:
            counts["Teaching Sessions"] = sess_count
            details.append(f"{sess_count} Conducted Teaching Session(s)")

        # 4. Teacher Assignments
        ta_count = (await db.execute(select(func.count(TeacherAssignment.id)).where(TeacherAssignment.division_id == division_id))).scalar() or 0
        if ta_count > 0:
            counts["Teacher Assignments"] = ta_count
            details.append(f"{ta_count} Teacher Assignment(s)")

        is_eligible = len(counts) == 0
        block_category = None
        block_reason = None
        if not is_eligible:
            has_transactions = sess_count > 0
            block_category = "transaction_history" if has_transactions else "linked_records"
            block_reason = (
                f"Cannot permanently delete Batch '{name}'. Linked operational records exist: {', '.join(details)}. "
                "Archive this batch to preserve historical records, attendance, and teacher logs."
            )

        return DeletionEligibilityReport(
            entity_type="division",
            entity_id=division_id,
            entity_name=name,
            is_eligible=is_eligible,
            block_category=block_category,
            block_reason=block_reason,
            dependent_counts=counts,
            dependent_details=details,
            can_deactivate=True,
            can_archive=True,
            recommended_action="delete" if is_eligible else "archive"
        )

    @classmethod
    async def _check_canonical_subject(cls, db: AsyncSession, cs_id: int, current_user: Optional[User]) -> DeletionEligibilityReport:
        cs = (await db.execute(select(CanonicalSubject).where(CanonicalSubject.id == cs_id))).scalar_one_or_none()
        if not cs:
            raise HTTPException(status_code=404, detail=f"Canonical Subject with ID {cs_id} not found")

        name = cs.name
        counts: Dict[str, int] = {}
        details: List[str] = []

        # 1. Subject Mappings across standards
        sm_count = (await db.execute(select(func.count(SubjectMapping.id)).where(SubjectMapping.canonical_subject_id == cs_id))).scalar() or 0
        if sm_count > 0:
            counts["Standard Subject Mappings"] = sm_count
            details.append(f"{sm_count} Standard Subject Mapping(s)")

        # 2. Legacy Subjects
        leg_count = (await db.execute(select(func.count(Subject.id)).where(Subject.canonical_subject_id == cs_id))).scalar() or 0
        if leg_count > 0:
            counts["Legacy Subject Instances"] = leg_count
            details.append(f"{leg_count} Legacy Subject link(s)")

        is_eligible = len(counts) == 0
        block_category = None
        block_reason = None
        if not is_eligible:
            block_category = "linked_records"
            block_reason = (
                f"Cannot permanently delete Canonical Subject '{name}'. Active curriculum mappings exist: {', '.join(details)}. "
                "Deactivate the canonical master record instead to prevent future mappings."
            )

        return DeletionEligibilityReport(
            entity_type="canonical_subject",
            entity_id=cs_id,
            entity_name=name,
            is_eligible=is_eligible,
            block_category=block_category,
            block_reason=block_reason,
            dependent_counts=counts,
            dependent_details=details,
            can_deactivate=True,
            can_archive=False,
            recommended_action="delete" if is_eligible else "deactivate"
        )

    @classmethod
    async def _check_subject(cls, db: AsyncSession, subject_id: int, current_user: Optional[User]) -> DeletionEligibilityReport:
        subj = (await db.execute(select(Subject).where(Subject.id == subject_id))).scalar_one_or_none()
        if not subj:
            raise HTTPException(status_code=404, detail=f"Subject with ID {subject_id} not found")

        name = subj.name
        counts: Dict[str, int] = {}
        details: List[str] = []

        # 1. Subject Mappings
        sm_count = (await db.execute(select(func.count(SubjectMapping.id)).where(SubjectMapping.legacy_subject_id == subject_id))).scalar() or 0
        if sm_count > 0:
            counts["Subject Mappings"] = sm_count
            details.append(f"{sm_count} Subject Mapping(s)")

        # 2. Teacher Assignments
        ta_count = (await db.execute(select(func.count(TeacherAssignment.id)).where(TeacherAssignment.subject_id == subject_id))).scalar() or 0
        if ta_count > 0:
            counts["Teacher Assignments"] = ta_count
            details.append(f"{ta_count} Teacher Assignment(s)")

        # 3. Timetable Entries
        tt_count = (await db.execute(select(func.count(TimetableEntry.id)).where(TimetableEntry.subject_id == subject_id))).scalar() or 0
        if tt_count > 0:
            counts["Timetable Entries"] = tt_count
            details.append(f"{tt_count} Timetable Schedule(s)")

        # 4. Exam Marks
        em_count = (await db.execute(select(func.count(ExamMark.id)).where(ExamMark.subject_id == subject_id))).scalar() or 0
        if em_count > 0:
            counts["Exam Marks Recorded"] = em_count
            details.append(f"{em_count} Exam Mark entry(ies)")

        # 5. Teaching Sessions
        ts_count = (await db.execute(select(func.count(TeachingSession.id)).where(TeachingSession.subject_id == subject_id))).scalar() or 0
        if ts_count > 0:
            counts["Teaching Sessions"] = ts_count
            details.append(f"{ts_count} Teaching Session(s)")

        is_eligible = len(counts) == 0
        block_category = None
        block_reason = None
        if not is_eligible:
            has_transactions = (em_count > 0 or ts_count > 0)
            block_category = "transaction_history" if has_transactions else "linked_records"
            block_reason = (
                f"Cannot permanently delete Subject '{name}'. Operational records reference this subject: {', '.join(details)}. "
                "Deactivate the subject instead to preserve academic grading and teaching logs."
            )

        return DeletionEligibilityReport(
            entity_type="subject",
            entity_id=subject_id,
            entity_name=name,
            is_eligible=is_eligible,
            block_category=block_category,
            block_reason=block_reason,
            dependent_counts=counts,
            dependent_details=details,
            can_deactivate=True,
            can_archive=False,
            recommended_action="delete" if is_eligible else "deactivate"
        )

    @classmethod
    async def _check_subject_mapping(cls, db: AsyncSession, sm_id: int, current_user: Optional[User]) -> DeletionEligibilityReport:
        sm = (await db.execute(select(SubjectMapping).where(SubjectMapping.id == sm_id))).scalar_one_or_none()
        if not sm:
            raise HTTPException(status_code=404, detail=f"Subject Mapping with ID {sm_id} not found")

        name = sm.display_name or f"Mapping #{sm_id}"
        counts: Dict[str, int] = {}
        details: List[str] = []

        # 1. Exam Marks
        em_count = (await db.execute(select(func.count(ExamMark.id)).where(ExamMark.subject_mapping_id == sm_id))).scalar() or 0
        if em_count > 0:
            counts["Exam Marks Recorded"] = em_count
            details.append(f"{em_count} Exam Mark entry(ies)")

        # 2. Timetable Entries
        tt_count = (await db.execute(select(func.count(TimetableEntry.id)).where(TimetableEntry.subject_mapping_id == sm_id))).scalar() or 0
        if tt_count > 0:
            counts["Timetable Entries"] = tt_count
            details.append(f"{tt_count} Timetable Schedule(s)")

        # 3. Teacher Assignments
        ta_count = (await db.execute(select(func.count(TeacherAssignment.id)).where(TeacherAssignment.subject_mapping_id == sm_id))).scalar() or 0
        if ta_count > 0:
            counts["Teacher Assignments"] = ta_count
            details.append(f"{ta_count} Teacher Assignment(s)")

        is_eligible = len(counts) == 0
        block_category = None
        block_reason = None
        if not is_eligible:
            has_transactions = em_count > 0
            block_category = "transaction_history" if has_transactions else "linked_records"
            block_reason = (
                f"Cannot permanently delete Subject Mapping '{name}'. Active dependencies exist: {', '.join(details)}. "
                "Deactivate the mapping instead."
            )

        return DeletionEligibilityReport(
            entity_type="subject_mapping",
            entity_id=sm_id,
            entity_name=name,
            is_eligible=is_eligible,
            block_category=block_category,
            block_reason=block_reason,
            dependent_counts=counts,
            dependent_details=details,
            can_deactivate=True,
            can_archive=False,
            recommended_action="delete" if is_eligible else "deactivate"
        )

    @classmethod
    async def _check_fee_category(cls, db: AsyncSession, cat_id: int, current_user: Optional[User]) -> DeletionEligibilityReport:
        fc = (await db.execute(select(FeeCategory).where(FeeCategory.id == cat_id))).scalar_one_or_none()
        if not fc:
            raise HTTPException(status_code=404, detail=f"Fee Category with ID {cat_id} not found")

        name = fc.name
        counts: Dict[str, int] = {}
        details: List[str] = []

        fs_count = (await db.execute(select(func.count(FeeStructure.id)).where(FeeStructure.category_id == cat_id))).scalar() or 0
        if fs_count > 0:
            counts["Fee Structures"] = fs_count
            details.append(f"{fs_count} Fee Structure(s)")

        is_eligible = len(counts) == 0
        block_category = None
        block_reason = None
        if not is_eligible:
            block_category = "configuration_dependency"
            block_reason = (
                f"Cannot permanently delete Fee Category '{name}'. It is configured in {fs_count} fee structure(s). "
                "Deactivate this category to prevent future structures from using it."
            )

        return DeletionEligibilityReport(
            entity_type="fee_category",
            entity_id=cat_id,
            entity_name=name,
            is_eligible=is_eligible,
            block_category=block_category,
            block_reason=block_reason,
            dependent_counts=counts,
            dependent_details=details,
            can_deactivate=True,
            can_archive=False,
            recommended_action="delete" if is_eligible else "deactivate"
        )

    @classmethod
    async def _check_fee_structure(cls, db: AsyncSession, fs_id: int, current_user: Optional[User]) -> DeletionEligibilityReport:
        fs = (await db.execute(select(FeeStructure).where(FeeStructure.id == fs_id))).scalar_one_or_none()
        if not fs:
            raise HTTPException(status_code=404, detail=f"Fee Structure with ID {fs_id} not found")

        name = fs.name
        counts: Dict[str, int] = {}
        details: List[str] = []

        # 1. Student Fee Assignments
        sfa_count = (await db.execute(select(func.count(StudentFeeAssignment.id)).where(StudentFeeAssignment.fee_structure_id == fs_id))).scalar() or 0
        if sfa_count > 0:
            counts["Student Fee Assignments"] = sfa_count
            details.append(f"{sfa_count} Student Assignment(s)")

        # 2. Invoiced Line Items
        fii_count = (await db.execute(select(func.count(FeeInvoiceItem.id)).where(FeeInvoiceItem.fee_structure_id == fs_id))).scalar() or 0
        if fii_count > 0:
            counts["Issued Invoices"] = fii_count
            details.append(f"{fii_count} Fee Invoice Item(s)")

        is_eligible = len(counts) == 0
        block_category = None
        block_reason = None
        if not is_eligible:
            has_transactions = fii_count > 0
            block_category = "transaction_history" if has_transactions else "linked_records"
            block_reason = (
                f"Cannot permanently delete Fee Structure '{name}'. Active student fees depend on it: {', '.join(details)}. "
                "Deactivate this fee structure to retain billing history and ledger balance."
            )

        return DeletionEligibilityReport(
            entity_type="fee_structure",
            entity_id=fs_id,
            entity_name=name,
            is_eligible=is_eligible,
            block_category=block_category,
            block_reason=block_reason,
            dependent_counts=counts,
            dependent_details=details,
            can_deactivate=True,
            can_archive=False,
            recommended_action="delete" if is_eligible else "deactivate"
        )

    @classmethod
    async def _check_academic_year(cls, db: AsyncSession, ay_id: int, current_user: Optional[User]) -> DeletionEligibilityReport:
        ay = (await db.execute(select(AcademicYear).where(AcademicYear.id == ay_id))).scalar_one_or_none()
        if not ay:
            raise HTTPException(status_code=404, detail=f"Academic Year with ID {ay_id} not found")

        name = ay.name
        counts: Dict[str, int] = {}
        details: List[str] = []

        enr_count = (await db.execute(select(func.count(StudentEnrollment.id)).where(StudentEnrollment.academic_year_id == ay_id))).scalar() or 0
        if enr_count > 0:
            counts["Student Enrollments"] = enr_count
            details.append(f"{enr_count} Student Enrollment(s)")

        fs_count = (await db.execute(select(func.count(FeeStructure.id)).where(FeeStructure.academic_year_id == ay_id))).scalar() or 0
        if fs_count > 0:
            counts["Fee Structures"] = fs_count
            details.append(f"{fs_count} Fee Structure(s)")

        ex_count = (await db.execute(select(func.count(Examination.id)).where(Examination.academic_year_id == ay_id))).scalar() or 0
        if ex_count > 0:
            counts["Examinations"] = ex_count
            details.append(f"{ex_count} Examination(s)")

        p_count = (await db.execute(select(func.count(TeacherPayroll.id)).where(TeacherPayroll.academic_year_id == ay_id))).scalar() or 0
        if p_count > 0:
            counts["Payroll Records"] = p_count
            details.append(f"{p_count} Teacher Payroll record(s)")

        is_eligible = len(counts) == 0
        block_category = None
        block_reason = None
        if not is_eligible:
            block_category = "configuration_dependency"
            block_reason = (
                f"Cannot permanently delete Academic Year '{name}'. Master academic records reference this session: {', '.join(details)}. "
                "Deactivate the academic year when the session concludes."
            )

        return DeletionEligibilityReport(
            entity_type="academic_year",
            entity_id=ay_id,
            entity_name=name,
            is_eligible=is_eligible,
            block_category=block_category,
            block_reason=block_reason,
            dependent_counts=counts,
            dependent_details=details,
            can_deactivate=True,
            can_archive=False,
            recommended_action="delete" if is_eligible else "deactivate"
        )

    @classmethod
    async def _check_examination(cls, db: AsyncSession, exam_id: int, current_user: Optional[User]) -> DeletionEligibilityReport:
        exam = (await db.execute(select(Examination).where(Examination.id == exam_id))).scalar_one_or_none()
        if not exam:
            raise HTTPException(status_code=404, detail=f"Examination with ID {exam_id} not found")

        name = exam.name
        counts: Dict[str, int] = {}
        details: List[str] = []

        marks_count = (await db.execute(select(func.count(ExamMark.id)).where(ExamMark.examination_id == exam_id))).scalar() or 0
        if marks_count > 0:
            counts["Student Marks Recorded"] = marks_count
            details.append(f"{marks_count} Student Mark record(s)")

        is_eligible = marks_count == 0
        block_category = None
        block_reason = None
        if not is_eligible:
            block_category = "transaction_history"
            block_reason = (
                f"Cannot permanently delete Examination '{name}'. Students have already received marks ({marks_count} recorded). "
                "Permanent deletion would corrupt official report cards and academic performance history."
            )

        return DeletionEligibilityReport(
            entity_type="examination",
            entity_id=exam_id,
            entity_name=name,
            is_eligible=is_eligible,
            block_category=block_category,
            block_reason=block_reason,
            dependent_counts=counts,
            dependent_details=details,
            can_deactivate=True,
            can_archive=False,
            recommended_action="delete" if is_eligible else "deactivate"
        )

    @classmethod
    async def _check_lead(cls, db: AsyncSession, lead_id: int, current_user: Optional[User]) -> DeletionEligibilityReport:
        lead = (await db.execute(select(Lead).where(Lead.id == lead_id))).scalar_one_or_none()
        if not lead:
            raise HTTPException(status_code=404, detail=f"Lead with ID {lead_id} not found")

        name = f"{lead.first_name} {lead.last_name}".strip() or lead.lead_number
        counts: Dict[str, int] = {}
        details: List[str] = []

        if lead.converted_student_id:
            counts["Converted Student Admissions"] = 1
            details.append(f"Converted into Admitted Student #{lead.converted_student_id}")

        f_count = (await db.execute(select(func.count(LeadFollowUp.id)).where(LeadFollowUp.lead_id == lead_id))).scalar() or 0
        if f_count > 0:
            counts["Follow-up Logs"] = f_count
            details.append(f"{f_count} Follow-up Interaction(s)")

        d_count = (await db.execute(select(func.count(LeadDemoClass.id)).where(LeadDemoClass.lead_id == lead_id))).scalar() or 0
        if d_count > 0:
            counts["Demo Classes Attended"] = d_count
            details.append(f"{d_count} Demo Class session(s)")

        is_eligible = len(counts) == 0
        block_category = None
        block_reason = None
        if not is_eligible:
            block_category = "linked_records"
            block_reason = (
                f"Cannot permanently delete CRM Lead '{name}'. Follow-up and conversion history exist: {', '.join(details)}. "
                "Archive the lead instead."
            )

        return DeletionEligibilityReport(
            entity_type="lead",
            entity_id=lead_id,
            entity_name=f"{name} ({lead.lead_number})",
            is_eligible=is_eligible,
            block_category=block_category,
            block_reason=block_reason,
            dependent_counts=counts,
            dependent_details=details,
            can_deactivate=True,
            can_archive=True,
            recommended_action="delete" if is_eligible else "archive"
        )

    @classmethod
    async def _check_lookup_item(cls, db: AsyncSession, lookup_id: int, current_user: Optional[User]) -> DeletionEligibilityReport:
        item = (await db.execute(select(LookupItem).where(LookupItem.id == lookup_id))).scalar_one_or_none()
        if not item:
            raise HTTPException(status_code=404, detail=f"Lookup item with ID {lookup_id} not found")

        name = item.label or item.value
        is_eligible = not item.is_system
        block_category = "system_protected" if item.is_system else None
        block_reason = (
            f"Cannot delete system lookup item '{name}'. Core system drop-down options cannot be deleted. "
            "You may safely deactivate it instead."
        ) if item.is_system else None

        return DeletionEligibilityReport(
            entity_type="lookup_item",
            entity_id=lookup_id,
            entity_name=name,
            is_eligible=is_eligible,
            block_category=block_category,
            block_reason=block_reason,
            dependent_counts={"System Configuration Dependency": 1} if item.is_system else {},
            dependent_details=["Core System Master Setting"] if item.is_system else [],
            can_deactivate=True,
            can_archive=False,
            recommended_action="delete" if is_eligible else "deactivate"
        )

    @classmethod
    async def _check_payment(cls, db: AsyncSession, payment_id: int, current_user: Optional[User]) -> DeletionEligibilityReport:
        stmt = (
            select(Payment)
            .options(
                selectinload(Payment.receipts),
                selectinload(Payment.allocations),
                selectinload(Payment.student),
            )
            .where(Payment.id == payment_id)
        )
        payment = (await db.execute(stmt)).scalar_one_or_none()
        if not payment:
            raise HTTPException(status_code=404, detail=f"Payment with ID {payment_id} not found")

        name = f"Payment #{payment.id} (₹{payment.amount}, Status: {payment.status})"
        counts: Dict[str, int] = {}
        details: List[str] = []

        receipt_count = len(payment.receipts) if payment.receipts else 0
        if receipt_count > 0:
            counts["Issued Payment Receipts"] = receipt_count
            receipt_nums = [r.receipt_number for r in payment.receipts]
            details.append(f"{receipt_count} issued receipt(s): {', '.join(receipt_nums)}")

        # Draft payment with zero receipts is eligible for permanent deletion
        if payment.status == "draft" and receipt_count == 0:
            return DeletionEligibilityReport(
                entity_type="payment",
                entity_id=payment_id,
                entity_name=name,
                is_eligible=True,
                recommended_action="delete",
            )

        # Posted or completed payments
        if payment.status in ("posted", "completed"):
            return DeletionEligibilityReport(
                entity_type="payment",
                entity_id=payment_id,
                entity_name=name,
                is_eligible=False,
                block_category="transaction_history",
                block_reason=(
                    f"Permanent deletion prohibited: Payment #{payment.id} has posted financial ledger entries. "
                    "In accordance with double-entry accounting standards and Global Transaction Governance, "
                    "posted transactions cannot be permanently erased."
                ),
                dependent_counts=counts,
                dependent_details=details,
                can_deactivate=False,
                can_archive=False,
                recommended_action="reversal",
                reversal_guidance=(
                    "Use the authorized 'Payment Reversal' workflow (/api/v1/payments/{payment_id}/reverse) "
                    "which restores invoice balances, marks receipts as voided, and maintains an immutable audit trail."
                ),
            )

        if payment.status == "reversed":
            return DeletionEligibilityReport(
                entity_type="payment",
                entity_id=payment_id,
                entity_name=name,
                is_eligible=False,
                block_category="transaction_history",
                block_reason=(
                    f"Permanent deletion prohibited: Payment #{payment.id} is a reversed transaction. "
                    "Reversal audit records and historical financial ledgers must be permanently preserved."
                ),
                dependent_counts=counts,
                dependent_details=details,
                can_deactivate=False,
                can_archive=False,
                recommended_action="reversal",
                reversal_guidance="This transaction is already reversed and preserved as an immutable audit record.",
            )

        # submitted, approved, or cancelled
        return DeletionEligibilityReport(
            entity_type="payment",
            entity_id=payment_id,
            entity_name=name,
            is_eligible=False,
            block_category="transaction_history",
            block_reason=(
                f"Permanent deletion prohibited: Payment #{payment.id} has status '{payment.status}'. "
                "Only unposted draft payments may be permanently deleted. "
                "For unposted submitted or approved payments, use the Cancellation workflow."
            ),
            dependent_counts=counts,
            dependent_details=details,
            can_deactivate=False,
            can_archive=False,
            recommended_action="cancel",
            reversal_guidance="Use /api/v1/payments/{payment_id}/cancel to cancel unposted workflow items.",
        )

    @classmethod
    async def _check_fee_invoice(cls, db: AsyncSession, invoice_id: int, current_user: Optional[User]) -> DeletionEligibilityReport:
        stmt = (
            select(FeeInvoice)
            .options(
                selectinload(FeeInvoice.payments),
                selectinload(FeeInvoice.items),
                selectinload(FeeInvoice.student),
            )
            .where(FeeInvoice.id == invoice_id)
        )
        invoice = (await db.execute(stmt)).scalar_one_or_none()
        if not invoice:
            raise HTTPException(status_code=404, detail=f"Fee Invoice with ID {invoice_id} not found")

        name = f"Invoice #{invoice.invoice_number} ({invoice.title or 'Fee Invoice'}, Status: {invoice.status})"
        counts: Dict[str, int] = {}
        details: List[str] = []

        payment_count = len(invoice.payments) if invoice.payments else 0
        if payment_count > 0:
            counts["Linked Payment Allocations"] = payment_count
            details.append(f"{payment_count} linked payment transaction(s)")

        if invoice.paid_amount and invoice.paid_amount > Decimal("0"):
            counts["Recorded Paid Amount"] = int(invoice.paid_amount)
            details.append(f"Recorded paid amount of ₹{invoice.paid_amount}")

        # If any payment has been credited against the invoice, deletion is blocked
        if payment_count > 0 or (invoice.paid_amount and invoice.paid_amount > Decimal("0")):
            return DeletionEligibilityReport(
                entity_type="fee_invoice",
                entity_id=invoice_id,
                entity_name=name,
                is_eligible=False,
                block_category="transaction_history",
                block_reason=(
                    f"Permanent deletion prohibited: Invoice #{invoice.invoice_number} has recorded payment credits "
                    f"(Paid: ₹{invoice.paid_amount}). Financial ledgers cannot be deleted while payments reference them."
                ),
                dependent_counts=counts,
                dependent_details=details,
                can_deactivate=False,
                can_archive=False,
                recommended_action="reversal",
                reversal_guidance="Reverse or refund all linked payments before attempting invoice adjustments.",
            )

        # Draft invoice with 0 payments is eligible
        if invoice.status == "draft":
            return DeletionEligibilityReport(
                entity_type="fee_invoice",
                entity_id=invoice_id,
                entity_name=name,
                is_eligible=True,
                recommended_action="delete",
            )

        # Posted/issued invoices with document numbers
        return DeletionEligibilityReport(
            entity_type="fee_invoice",
            entity_id=invoice_id,
            entity_name=name,
            is_eligible=False,
            block_category="transaction_history",
            block_reason=(
                f"Permanent deletion prohibited: Invoice #{invoice.invoice_number} is in '{invoice.status}' state "
                "with an issued document number. Document numbering integrity requires preserving the serial sequence."
            ),
            dependent_counts=counts,
            dependent_details=details,
            can_deactivate=False,
            can_archive=False,
            recommended_action="cancellation",
            reversal_guidance="Use /api/v1/fees/invoices/{invoice_id}/cancel to void the invoice and maintain number auditing.",
        )

    # ──────────────────────────────────────────────────────────────────────────
    # In-Transaction Execution (Permanent Delete, Deactivate, Archive)
    # ──────────────────────────────────────────────────────────────────────────

    @classmethod
    async def execute_safe_delete(
        cls,
        db: AsyncSession,
        entity_type: str,
        entity_id: int,
        current_user: User,
        reason: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Executes permanent deletion strictly inside the transaction after verifying eligibility.
        Prevents race conditions, logs AuditLog, and rolls back atomically on failure.
        """
        report = await cls.check_eligibility(db, entity_type, entity_id, current_user)
        if not report.is_eligible:
            raise HTTPException(
                status_code=400,
                detail=report.to_dict()
            )

        normalized_type = entity_type.strip().lower()

        # Fetch model instance to delete
        target = None
        if normalized_type == "user":
            target = (await db.execute(select(User).where(User.id == entity_id))).scalar_one_or_none()
        elif normalized_type == "student":
            target = (await db.execute(select(Student).where(Student.id == entity_id))).scalar_one_or_none()
        elif normalized_type == "standard":
            target = (await db.execute(select(Standard).where(Standard.id == entity_id))).scalar_one_or_none()
        elif normalized_type in ("division", "batch"):
            target = (await db.execute(select(Division).where(Division.id == entity_id))).scalar_one_or_none()
        elif normalized_type == "canonical_subject":
            target = (await db.execute(select(CanonicalSubject).where(CanonicalSubject.id == entity_id))).scalar_one_or_none()
        elif normalized_type == "subject":
            target = (await db.execute(select(Subject).where(Subject.id == entity_id))).scalar_one_or_none()
        elif normalized_type == "subject_mapping":
            target = (await db.execute(select(SubjectMapping).where(SubjectMapping.id == entity_id))).scalar_one_or_none()
        elif normalized_type == "fee_category":
            target = (await db.execute(select(FeeCategory).where(FeeCategory.id == entity_id))).scalar_one_or_none()
        elif normalized_type == "fee_structure":
            target = (await db.execute(select(FeeStructure).where(FeeStructure.id == entity_id))).scalar_one_or_none()
        elif normalized_type == "academic_year":
            target = (await db.execute(select(AcademicYear).where(AcademicYear.id == entity_id))).scalar_one_or_none()
        elif normalized_type in ("exam", "examination"):
            target = (await db.execute(select(Examination).where(Examination.id == entity_id))).scalar_one_or_none()
        elif normalized_type == "lead":
            target = (await db.execute(select(Lead).where(Lead.id == entity_id))).scalar_one_or_none()
        elif normalized_type == "lookup_item":
            target = (await db.execute(select(LookupItem).where(LookupItem.id == entity_id))).scalar_one_or_none()
        elif normalized_type == "payment":
            target = (
                await db.execute(
                    select(Payment)
                    .options(selectinload(Payment.allocations))
                    .where(Payment.id == entity_id)
                )
            ).scalar_one_or_none()
            if target:
                for alloc in target.allocations:
                    await db.delete(alloc)
        elif normalized_type in ("fee_invoice", "invoice"):
            target = (
                await db.execute(
                    select(FeeInvoice)
                    .options(selectinload(FeeInvoice.items))
                    .where(FeeInvoice.id == entity_id)
                )
            ).scalar_one_or_none()
            if target:
                for item in target.items:
                    await db.delete(item)

        if not target:
            raise HTTPException(status_code=404, detail=f"{entity_type.title()} #{entity_id} not found")

        # Record Audit Log
        audit = AuditLog(
            user_id=current_user.id,
            action=f"permanent_delete_{normalized_type}",
            resource_type=normalized_type,
            resource_id=entity_id,
            old_data=f"{report.entity_name} permanently removed. Reason: {reason or 'Not specified'}",
            details=json.dumps({"action": "permanent_delete", "reason": reason}),
        )
        db.add(audit)

        await db.delete(target)
        await db.commit()

        return {
            "success": True,
            "message": f"{report.entity_name} permanently deleted successfully.",
            "entity_type": normalized_type,
            "entity_id": entity_id,
        }

    @classmethod
    async def execute_safe_deactivate(
        cls,
        db: AsyncSession,
        entity_type: str,
        entity_id: int,
        current_user: User,
        reason: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Safely deactivates an entity (is_active = False or status = 'inactive')
        with comprehensive AuditLog tracking.
        """
        normalized_type = entity_type.strip().lower()
        target = None

        if normalized_type == "user":
            target = (await db.execute(select(User).where(User.id == entity_id))).scalar_one_or_none()
            if target:
                target.is_active = False
                staff_prof = (await db.execute(select(StaffProfile).where(StaffProfile.user_id == entity_id))).scalar_one_or_none()
                if staff_prof:
                    staff_prof.status = "inactive"
        elif normalized_type == "student":
            target = (await db.execute(select(Student).where(Student.id == entity_id))).scalar_one_or_none()
            if target:
                target.is_active = False
        elif normalized_type == "standard":
            target = (await db.execute(select(Standard).where(Standard.id == entity_id))).scalar_one_or_none()
            if target:
                target.is_active = False
        elif normalized_type in ("division", "batch"):
            target = (await db.execute(select(Division).where(Division.id == entity_id))).scalar_one_or_none()
            if target:
                target.is_active = False
                target.status = "inactive"
        elif normalized_type == "canonical_subject":
            target = (await db.execute(select(CanonicalSubject).where(CanonicalSubject.id == entity_id))).scalar_one_or_none()
            if target:
                target.is_active = False
        elif normalized_type == "subject":
            target = (await db.execute(select(Subject).where(Subject.id == entity_id))).scalar_one_or_none()
            if target:
                target.is_active = False
        elif normalized_type == "subject_mapping":
            target = (await db.execute(select(SubjectMapping).where(SubjectMapping.id == entity_id))).scalar_one_or_none()
            if target:
                target.is_active = False
        elif normalized_type == "fee_category":
            target = (await db.execute(select(FeeCategory).where(FeeCategory.id == entity_id))).scalar_one_or_none()
            if target:
                target.is_active = False
        elif normalized_type == "fee_structure":
            target = (await db.execute(select(FeeStructure).where(FeeStructure.id == entity_id))).scalar_one_or_none()
            if target:
                target.is_active = False
        elif normalized_type == "academic_year":
            target = (await db.execute(select(AcademicYear).where(AcademicYear.id == entity_id))).scalar_one_or_none()
            if target:
                target.is_active = False
        elif normalized_type in ("exam", "examination"):
            target = (await db.execute(select(Examination).where(Examination.id == entity_id))).scalar_one_or_none()
            if target:
                target.is_active = False
        elif normalized_type == "lookup_item":
            target = (await db.execute(select(LookupItem).where(LookupItem.id == entity_id))).scalar_one_or_none()
            if target:
                target.is_active = False

        if not target:
            raise HTTPException(status_code=404, detail=f"{entity_type.title()} #{entity_id} not found")

        audit = AuditLog(
            user_id=current_user.id,
            action=f"safe_deactivate_{normalized_type}",
            resource_type=normalized_type,
            resource_id=entity_id,
            old_data=f"{entity_type.title()} #{entity_id} deactivated safely. Reason: {reason or 'Not specified'}",
            details=json.dumps({"action": "safe_deactivate", "reason": reason}),
        )
        db.add(audit)
        await db.commit()

        return {
            "success": True,
            "message": f"{entity_type.title()} #{entity_id} deactivated successfully.",
            "entity_type": normalized_type,
            "entity_id": entity_id,
            "is_active": False,
        }

    @classmethod
    async def execute_safe_archive(
        cls,
        db: AsyncSession,
        entity_type: str,
        entity_id: int,
        current_user: User,
        reason: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Safely archives an entity (e.g. division status='archived', lead stage='lost')
        with comprehensive AuditLog tracking.
        """
        normalized_type = entity_type.strip().lower()
        target = None

        if normalized_type in ("division", "batch"):
            target = (await db.execute(select(Division).where(Division.id == entity_id))).scalar_one_or_none()
            if target:
                target.status = "archived"
                target.is_active = False
        elif normalized_type == "lead":
            target = (await db.execute(select(Lead).where(Lead.id == entity_id))).scalar_one_or_none()
            if target:
                target.is_active = False
                target.stage = "lost"
                target.lost_reason = reason or "ARCHIVED_BY_ADMIN"
        elif normalized_type == "student":
            target = (await db.execute(select(Student).where(Student.id == entity_id))).scalar_one_or_none()
            if target:
                target.is_active = False
                target.exit_reason = reason or "ARCHIVED_BY_ADMIN"

        if not target:
            raise HTTPException(status_code=404, detail=f"{entity_type.title()} #{entity_id} not found or archiving not supported")

        audit = AuditLog(
            user_id=current_user.id,
            action=f"safe_archive_{normalized_type}",
            resource_type=normalized_type,
            resource_id=entity_id,
            old_data=f"{entity_type.title()} #{entity_id} archived safely. Reason: {reason or 'Not specified'}",
            details=json.dumps({"action": "safe_archive", "reason": reason}),
        )
        db.add(audit)
        await db.commit()

        return {
            "success": True,
            "message": f"{entity_type.title()} #{entity_id} archived successfully.",
            "entity_type": normalized_type,
            "entity_id": entity_id,
            "status": "archived",
        }
