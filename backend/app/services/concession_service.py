# /**
#  * @file        concession_service.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      backend.app.services.concession_service
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
#  * @description Authoritative business logic engine for fee concessions, merit scholarships, eligibility evaluation, stacking rules, and ledger synchronization.
#  */

import json
from datetime import datetime, date, timezone
from decimal import Decimal, ROUND_HALF_UP
from typing import Optional, Dict, Any, List, Tuple

from sqlalchemy import select, and_, or_, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.fee import (
    FeeConcessionType,
    StudentConcessionApplication,
    FeeConcessionAllocation,
    StudentFeeAssignment,
    FeeInvoice,
    FeeStructure,
)
from app.models.student import Student, Guardian
from app.models.user import User, AuditLog
from app.models.academic_year import AcademicYear
from app.models.exam import ExamMark, Examination
from app.models.attendance import Attendance
from app.services.sequence import generate_next_concession_number


class ConcessionEligibilityService:
    """
    Evaluates student record against concession scheme conditions.
    Supports Merit, Need-Based, Sibling, Staff-Ward, Admission Window, and Attendance criteria.
    """

    @classmethod
    async def evaluate_student_eligibility(
        cls,
        db: AsyncSession,
        student_id: int,
        concession_type_id: int,
        academic_year_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        student_res = await db.execute(
            select(Student)
            .options(
                selectinload(Student.guardians),
                selectinload(Student.enrollments),
            )
            .where(Student.id == student_id)
        )
        student = student_res.scalar_one_or_none()
        if not student:
            return {"eligible": False, "summary": "Student not found", "criteria": []}

        type_res = await db.execute(
            select(FeeConcessionType).where(FeeConcessionType.id == concession_type_id)
        )
        ctype = type_res.scalar_one_or_none()
        if not ctype:
            return {"eligible": False, "summary": "Concession type not found", "criteria": []}

        criteria_list = []
        is_eligible = True
        cat = ctype.category.lower().strip()

        # 1. Active Student Check
        is_active = student.is_active
        criteria_list.append({
            "name": "Active Enrollment",
            "required": "Student must have active enrollment status",
            "observed": "Active" if is_active else "Inactive",
            "passed": is_active,
        })
        if not is_active:
            is_eligible = False

        # 2. Category-Specific Evaluations
        if cat == "merit":
            # Check exam marks in academic year
            exam_stmt = (
                select(ExamMark.marks_obtained, Examination.max_marks)
                .join(Examination, Examination.id == ExamMark.examination_id)
                .where(
                    ExamMark.student_id == student_id,
                    ExamMark.is_absent == False,
                )
            )
            exam_rows = (await db.execute(exam_stmt)).all()
            total_obt = sum(float(r[0] or 0) for r in exam_rows)
            total_max = sum(float(r[1] or 0) for r in exam_rows)
            avg_pct = (total_obt / total_max * 100.0) if total_max > 0 else 0.0

            # Parse benchmark from eligibility_rules or default 75%
            benchmark = 75.0
            if ctype.eligibility_rules:
                try:
                    rules = json.loads(ctype.eligibility_rules)
                    benchmark = float(rules.get("min_exam_percentage", 75.0))
                except Exception:
                    pass

            passed_merit = (avg_pct >= benchmark) or (total_max == 0 and True)  # If no exams yet, eligible on admission basis
            criteria_list.append({
                "name": "Academic Merit Benchmark",
                "required": f"Average exam performance >= {benchmark:.1f}%",
                "observed": f"{avg_pct:.1f}% (across {len(exam_rows)} recorded papers)" if total_max > 0 else "New admission (qualifying entrance exempt)",
                "passed": passed_merit,
            })
            if not passed_merit:
                is_eligible = False

        elif cat == "need_based":
            # Check family income from primary guardian
            primary_guardian = next((g for g in student.guardians if g.is_primary), None) or (student.guardians[0] if student.guardians else None)
            annual_inc = float(primary_guardian.annual_income or 0.0) if primary_guardian else 0.0
            inc_limit = 350000.0
            if ctype.eligibility_rules:
                try:
                    rules = json.loads(ctype.eligibility_rules)
                    inc_limit = float(rules.get("max_annual_income", 350000.0))
                except Exception:
                    pass

            income_recorded = annual_inc > 0
            passed_income = income_recorded and (annual_inc <= inc_limit)
            criteria_list.append({
                "name": "Family Annual Income Threshold",
                "required": f"Verified annual income <= ₹{inc_limit:,.2f}",
                "observed": f"₹{annual_inc:,.2f}" if income_recorded else "Income documentation pending",
                "passed": passed_income or not income_recorded,  # Allow nomination with pending verification
            })
            if income_recorded and not passed_income:
                is_eligible = False

        elif cat == "sibling":
            # Match guardian phone / email / aadhar with another active student
            sibling_found = False
            sibling_name = "None"
            if student.guardians:
                g_phones = [g.phone.strip() for g in student.guardians if g.phone and g.phone.strip()]
                g_aadhars = [g.aadhar_number.strip() for g in student.guardians if g.aadhar_number and g.aadhar_number.strip()]

                conditions = []
                if g_phones:
                    conditions.append(Guardian.phone.in_(g_phones))
                if g_aadhars:
                    conditions.append(Guardian.aadhar_number.in_(g_aadhars))

                if conditions:
                    sib_stmt = (
                        select(Student.first_name, Student.last_name, Student.admission_number)
                        .join(Guardian, Guardian.student_id == Student.id)
                        .where(
                            Student.id != student_id,
                            Student.institution_id == student.institution_id,
                            Student.is_active == True,
                            or_(*conditions),
                        )
                        .limit(1)
                    )
                    sib_row = (await db.execute(sib_stmt)).first()
                    if sib_row:
                        sibling_found = True
                        sibling_name = f"{sib_row[0]} {sib_row[1]} ({sib_row[2]})"

            criteria_list.append({
                "name": "Co-Enrolled Sibling Verification",
                "required": "Another active ward enrolled in the institute sharing primary guardian contact",
                "observed": f"Sibling identified: {sibling_name}" if sibling_found else "No co-enrolled sibling automatically matched",
                "passed": sibling_found,
            })
            if not sibling_found:
                # Still allow discretionary staff nomination
                is_eligible = False

        elif cat == "staff_child":
            # Match guardian phone or email with active staff/faculty User
            staff_found = False
            staff_name = "None"
            if student.guardians:
                g_phones = [g.phone.strip() for g in student.guardians if g.phone and g.phone.strip()]
                g_emails = [g.email.strip().lower() for g in student.guardians if g.email and g.email.strip()]

                user_conditions = []
                if g_phones:
                    user_conditions.append(User.phone.in_(g_phones))
                if g_emails:
                    user_conditions.append(func.lower(User.email).in_(g_emails))

                if user_conditions:
                    staff_stmt = select(User.first_name, User.last_name, User.role, User.designation).where(
                        User.institution_id == student.institution_id,
                        User.is_active == True,
                        User.role.in_(["teacher", "staff", "admin", "accountant", "principal"]),
                        or_(*user_conditions),
                    ).limit(1)
                    staff_row = (await db.execute(staff_stmt)).first()
                    if staff_row:
                        staff_found = True
                        staff_name = f"{staff_row[0]} {staff_row[1]} ({staff_row[2].title()} - {staff_row[3] or 'Staff'})"

            criteria_list.append({
                "name": "Parent Institute Employment Link",
                "required": "Guardian must be an active faculty or staff member of the institute",
                "observed": f"Faculty/Staff parent identified: {staff_name}" if staff_found else "No staff record matched with guardian details",
                "passed": staff_found,
            })
            if not staff_found:
                is_eligible = False

        # Attendance check across all applications
        att_stmt = select(Attendance.status, func.count(Attendance.id)).where(
            Attendance.student_id == student_id
        ).group_by(Attendance.status)
        att_rows = dict((await db.execute(att_stmt)).all())
        total_att = sum(att_rows.values())
        present_count = att_rows.get("present", 0) + att_rows.get("late", 0)
        att_pct = (present_count / total_att * 100.0) if total_att > 0 else 100.0

        criteria_list.append({
            "name": "Minimum Attendance Compliance",
            "required": "Attendance >= 75.0%",
            "observed": f"{att_pct:.1f}% ({present_count}/{total_att} sessions)" if total_att > 0 else "New session / Exempt",
            "passed": att_pct >= 75.0,
        })
        if att_pct < 75.0 and total_att > 10:
            is_eligible = False

        summary = "Student meets all automated eligibility conditions." if is_eligible else "One or more automated eligibility benchmarks were not satisfied. Discretionary approval required."

        return {
            "eligible": is_eligible,
            "student_id": student_id,
            "concession_type_id": concession_type_id,
            "concession_name": ctype.name,
            "category": ctype.category,
            "summary": summary,
            "criteria": criteria_list,
        }


class ConcessionCalculationService:
    """
    Computes exact monetary concession benefit, enforces percentage caps,
    checks max discount ceilings, and validates multi-scheme stacking.
    """

    @classmethod
    def calculate_benefit(
        cls,
        concession_type: FeeConcessionType,
        gross_obligation: Decimal,
        requested_amount: Optional[Decimal] = None,
        requested_percentage: Optional[Decimal] = None,
    ) -> Tuple[Decimal, Decimal]:
        """
        Returns (computed_amount, computed_percentage).
        Strictly enforces max_discount_amount ceiling and caps at gross obligation.
        """
        gross = max(Decimal("0.00"), gross_obligation)
        if gross == Decimal("0.00"):
            return Decimal("0.00"), Decimal("0.00")

        calc_type = concession_type.calculation_type.lower().strip()

        if calc_type == "full_waiver":
            return gross, Decimal("100.00")

        if calc_type == "percentage":
            pct = requested_percentage if requested_percentage is not None and requested_percentage > 0 else concession_type.default_value
            pct = min(Decimal("100.00"), max(Decimal("0.00"), pct))
            calc_amt = (gross * (pct / Decimal("100.00"))).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        else:  # fixed_amount
            amt = requested_amount if requested_amount is not None and requested_amount > 0 else concession_type.default_value
            calc_amt = min(gross, max(Decimal("0.00"), amt))
            pct = ((calc_amt / gross) * Decimal("100.00")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

        # Enforce scheme maximum ceiling
        if concession_type.max_discount_amount and concession_type.max_discount_amount > 0:
            if calc_amt > concession_type.max_discount_amount:
                calc_amt = concession_type.max_discount_amount
                pct = ((calc_amt / gross) * Decimal("100.00")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

        # Never exceed gross obligation
        calc_amt = min(gross, calc_amt)
        return calc_amt, pct

    @classmethod
    async def validate_stacking_rules(
        cls,
        db: AsyncSession,
        student_id: int,
        academic_year_id: int,
        new_concession_type: FeeConcessionType,
        proposed_amount: Decimal,
        gross_obligation: Decimal,
        exclude_application_id: Optional[int] = None,
    ) -> Tuple[bool, str]:
        """
        Validates stacking combinations against existing active/applied concessions.
        Ensures non-stackable concessions are not mixed, and total benefit <= 100% of obligation.
        """
        stmt = (
            select(StudentConcessionApplication)
            .options(selectinload(StudentConcessionApplication.concession_type))
            .where(
                StudentConcessionApplication.student_id == student_id,
                StudentConcessionApplication.academic_year_id == academic_year_id,
                StudentConcessionApplication.status.in_(["approved", "applied", "partially_applied"]),
            )
        )
        if exclude_application_id:
            stmt = stmt.where(StudentConcessionApplication.id != exclude_application_id)

        active_apps = (await db.execute(stmt)).scalars().all()

        if not active_apps:
            return True, "No existing concessions active; stacking valid."

        # Check if new scheme allows stacking
        if not new_concession_type.is_stackable:
            return False, f"Concession scheme '{new_concession_type.name}' is exclusive and cannot be combined with existing concessions."

        # Check if any existing active scheme forbids stacking
        for a in active_apps:
            if a.concession_type and not a.concession_type.is_stackable:
                return False, f"Student already holds exclusive concession '{a.concession_type.name}' (Application #{a.application_number}) which cannot be stacked."

        # Check total combined amount ceiling
        existing_total = sum(a.approved_amount for a in active_apps)
        combined_total = existing_total + proposed_amount
        if combined_total > gross_obligation:
            return False, f"Cumulative concessions (₹{combined_total:,.2f}) exceed total fee obligation (₹{gross_obligation:,.2f})."

        return True, f"Stacking permitted. Combined concession: ₹{combined_total:,.2f} on gross ₹{gross_obligation:,.2f}."


class ConcessionWorkflowService:
    """
    State machine for concession applications:
    draft -> submitted -> under_verification -> pending_approval -> approved -> applied / rejected / withdrawn / cancelled.
    Enforces segregation of duties, multi-stage approval, and immutable ledger synchronization.
    """

    @classmethod
    async def submit_application(
        cls,
        db: AsyncSession,
        institution_id: int,
        student_id: int,
        concession_type_id: int,
        academic_year_id: int,
        nominator: User,
        requested_amount: Optional[Decimal] = None,
        requested_percentage: Optional[Decimal] = None,
        applicant_type: str = "staff_nomination",
        sponsor_name: Optional[str] = None,
        sponsor_reference: Optional[str] = None,
        sponsor_sanctioned_amount: Optional[Decimal] = None,
        supporting_document_url: Optional[str] = None,
        remarks: Optional[str] = None,
    ) -> StudentConcessionApplication:
        # Load student, concession type, and active invoice
        student_res = await db.execute(select(Student).where(Student.id == student_id))
        student = student_res.scalar_one_or_none()
        if not student:
            raise ValueError(f"Student #{student_id} not found")

        type_res = await db.execute(select(FeeConcessionType).where(FeeConcessionType.id == concession_type_id))
        ctype = type_res.scalar_one_or_none()
        if not ctype or not ctype.is_active:
            raise ValueError("Concession scheme is inactive or invalid")

        inv_res = await db.execute(
            select(FeeInvoice).where(
                FeeInvoice.student_id == student_id,
                FeeInvoice.academic_year_id == academic_year_id,
            ).order_by(desc(FeeInvoice.id)).limit(1)
        )
        invoice = inv_res.scalar_one_or_none()
        gross = invoice.total_amount if invoice else Decimal("50000.00")

        # Calculate benefit amount
        calc_amt, calc_pct = ConcessionCalculationService.calculate_benefit(
            ctype, gross, requested_amount, requested_percentage
        )

        # Validate stacking
        stack_ok, stack_msg = await ConcessionCalculationService.validate_stacking_rules(
            db, student_id, academic_year_id, ctype, calc_amt, gross
        )
        if not stack_ok:
            raise ValueError(stack_msg)

        # Evaluate eligibility snapshot
        eligibility = await ConcessionEligibilityService.evaluate_student_eligibility(
            db, student_id, concession_type_id, academic_year_id
        )

        app_number = await generate_next_concession_number(db, institution_id, academic_year_id)

        # Determine initial status: if documents required -> under_verification; else pending_approval
        initial_status = "under_verification" if ctype.requires_documents and not supporting_document_url else "pending_approval"

        funding_src = ctype.funding_source
        app = StudentConcessionApplication(
            institution_id=institution_id,
            application_number=app_number,
            student_id=student_id,
            academic_year_id=academic_year_id,
            concession_type_id=concession_type_id,
            invoice_id=invoice.id if invoice else None,
            assignment_id=invoice.assignment_id if invoice else None,
            requested_amount=calc_amt,
            requested_percentage=calc_pct,
            approved_amount=Decimal("0.00"),
            applied_amount=Decimal("0.00"),
            funding_source=funding_src,
            sponsor_name=sponsor_name or (ctype.name if funding_src == "external_sponsor" else None),
            sponsor_reference=sponsor_reference,
            sponsor_sanctioned_amount=sponsor_sanctioned_amount or (calc_amt if funding_src == "external_sponsor" else None),
            sponsor_received_amount=Decimal("0.00"),
            status=initial_status,
            applicant_type=applicant_type,
            nominator_id=nominator.id,
            approval_remarks=remarks,
            supporting_document_url=supporting_document_url,
            eligibility_snapshot=json.dumps(eligibility),
        )
        db.add(app)
        await db.flush()

        # Audit log
        audit = AuditLog(
            user_id=nominator.id,
            action="CONCESSION_APPLICATION_SUBMITTED",
            resource_type="concession_application",
            resource_id=app.id,
            new_data=json.dumps({
                "application_number": app_number,
                "student_id": student_id,
                "concession_type": ctype.name,
                "requested_amount": float(calc_amt),
                "status": initial_status,
            }),
            details=f"Concession application {app_number} submitted for Student #{student_id} ({student.first_name} {student.last_name}): ₹{calc_amt:,.2f}",
            severity="INFO",
        )
        db.add(audit)
        await db.commit()
        await db.refresh(app)
        return app

    @classmethod
    async def verify_application(
        cls,
        db: AsyncSession,
        application_id: int,
        verifier: User,
        notes: str,
        document_url: Optional[str] = None,
    ) -> StudentConcessionApplication:
        app_res = await db.execute(
            select(StudentConcessionApplication)
            .options(selectinload(StudentConcessionApplication.concession_type))
            .where(StudentConcessionApplication.id == application_id)
        )
        app = app_res.scalar_one_or_none()
        if not app:
            raise ValueError("Application not found")

        if app.status not in ["draft", "submitted", "under_verification"]:
            raise ValueError(f"Cannot verify application in '{app.status}' status")

        app.verifier_id = verifier.id
        app.verified_at = datetime.now(timezone.utc)
        app.verification_notes = notes
        if document_url:
            app.supporting_document_url = document_url
        app.status = "pending_approval"

        audit = AuditLog(
            user_id=verifier.id,
            action="CONCESSION_APPLICATION_VERIFIED",
            resource_type="concession_application",
            resource_id=app.id,
            details=f"Application {app.application_number} verified by {verifier.username}: {notes}",
            severity="INFO",
        )
        db.add(audit)
        await db.commit()
        await db.refresh(app)
        return app

    @classmethod
    async def approve_application(
        cls,
        db: AsyncSession,
        application_id: int,
        approver: User,
        approved_amount: Optional[Decimal] = None,
        remarks: Optional[str] = None,
        auto_apply: bool = True,
    ) -> StudentConcessionApplication:
        app_res = await db.execute(
            select(StudentConcessionApplication)
            .options(
                selectinload(StudentConcessionApplication.concession_type),
                selectinload(StudentConcessionApplication.student),
            )
            .where(StudentConcessionApplication.id == application_id)
        )
        app = app_res.scalar_one_or_none()
        if not app:
            raise ValueError("Application not found")

        if app.status not in ["pending_approval", "under_verification"]:
            raise ValueError(f"Application #{app.application_number} is already in '{app.status}' status")

        # Segregation of duties: prevent unauthorized self-approval if nominator is approver, unless superadmin/admin
        if app.nominator_id == approver.id and approver.role not in ["superadmin", "admin"]:
            raise ValueError("Segregation of duties: You cannot approve your own nominated concession application.")

        final_amt = approved_amount if approved_amount is not None and approved_amount > 0 else app.requested_amount
        app.approved_amount = final_amt
        app.approver_id = approver.id
        app.approved_at = datetime.now(timezone.utc)
        app.approval_remarks = remarks or "Approved per executive administrative committee resolution"
        app.status = "approved"

        audit = AuditLog(
            user_id=approver.id,
            action="CONCESSION_APPLICATION_APPROVED",
            resource_type="concession_application",
            resource_id=app.id,
            details=f"Concession #{app.application_number} approved for ₹{final_amt:,.2f} by {approver.username}",
            severity="INFO",
        )
        db.add(audit)
        await db.flush()

        if auto_apply:
            await cls.apply_concession_to_invoice(db, app.id, approver)

        await db.commit()
        await db.refresh(app)
        return app

    @classmethod
    async def reject_application(
        cls,
        db: AsyncSession,
        application_id: int,
        user: User,
        rejection_reason: str,
    ) -> StudentConcessionApplication:
        if not (rejection_reason or "").strip():
            raise ValueError("A clear, auditable rejection reason is strictly required.")

        app_res = await db.execute(select(StudentConcessionApplication).where(StudentConcessionApplication.id == application_id))
        app = app_res.scalar_one_or_none()
        if not app:
            raise ValueError("Application not found")

        if app.status in ["approved", "applied", "cancelled"]:
            raise ValueError(f"Cannot reject application in '{app.status}' status")

        app.status = "rejected"
        app.rejection_reason = rejection_reason.strip()
        app.approver_id = user.id
        app.approved_at = datetime.now(timezone.utc)

        audit = AuditLog(
            user_id=user.id,
            action="CONCESSION_APPLICATION_REJECTED",
            resource_type="concession_application",
            resource_id=app.id,
            details=f"Concession #{app.application_number} rejected by {user.username}: {rejection_reason}",
            severity="WARNING",
        )
        db.add(audit)
        await db.commit()
        await db.refresh(app)
        return app

    @classmethod
    async def apply_concession_to_invoice(
        cls,
        db: AsyncSession,
        application_id: int,
        user: User,
    ) -> FeeConcessionAllocation:
        """
        Applies an approved concession to the student's active FeeInvoice.
        Reconciles discount_amount, net_amount, and outstanding_amount.
        If invoice is already paid, calculates credit balance without modifying receipts!
        """
        app_res = await db.execute(
            select(StudentConcessionApplication)
            .options(
                selectinload(StudentConcessionApplication.concession_type),
                selectinload(StudentConcessionApplication.student),
            )
            .where(StudentConcessionApplication.id == application_id)
        )
        app = app_res.scalar_one_or_none()
        if not app:
            raise ValueError("Application not found")

        if app.status != "approved":
            raise ValueError(f"Cannot apply concession in '{app.status}' status. Application must be approved first.")

        # Find target FeeInvoice
        inv_stmt = select(FeeInvoice).where(
            FeeInvoice.student_id == app.student_id,
            FeeInvoice.academic_year_id == app.academic_year_id,
        ).order_by(desc(FeeInvoice.id)).limit(1)
        invoice = (await db.execute(inv_stmt)).scalar_one_or_none()

        if not invoice:
            raise ValueError(f"No active fee invoice found for Student #{app.student_id}")

        alloc_amt = app.approved_amount

        # Check existing allocations to avoid double application
        existing_alloc = (await db.execute(
            select(FeeConcessionAllocation).where(
                FeeConcessionAllocation.application_id == app.id,
                FeeConcessionAllocation.invoice_id == invoice.id,
            )
        )).scalar_one_or_none()

        if existing_alloc:
            raise ValueError(f"Concession #{app.application_number} has already been allocated to Invoice #{invoice.invoice_number}")

        # Compute new invoice amounts
        new_discount = invoice.discount_amount + alloc_amt
        new_net = max(Decimal("0.00"), invoice.total_amount - new_discount)

        credit_surplus = Decimal("0.00")
        if invoice.paid_amount > new_net:
            credit_surplus = invoice.paid_amount - new_net
            new_outstanding = Decimal("0.00")
            new_status = "paid"
        else:
            new_outstanding = new_net - invoice.paid_amount
            new_status = "paid" if new_outstanding == Decimal("0.00") else ("partial" if invoice.paid_amount > Decimal("0.00") else "unpaid")

        invoice.discount_amount = new_discount
        invoice.net_amount = new_net
        invoice.outstanding_amount = new_outstanding
        invoice.status = new_status
        invoice.notes = (invoice.notes or "") + f" | Concession #{app.application_number} applied (-₹{alloc_amt:,.2f})"

        # Also update StudentFeeAssignment concession_amount
        assign_stmt = select(StudentFeeAssignment).where(
            StudentFeeAssignment.student_id == app.student_id,
            StudentFeeAssignment.academic_year_id == app.academic_year_id,
        ).order_by(desc(StudentFeeAssignment.id)).limit(1)
        assignment = (await db.execute(assign_stmt)).scalar_one_or_none()
        if assignment:
            assignment.concession_amount = assignment.concession_amount + alloc_amt

        allocation = FeeConcessionAllocation(
            application_id=app.id,
            invoice_id=invoice.id,
            allocated_amount=alloc_amt,
            allocated_by_id=user.id,
            notes=f"Allocated from approved application #{app.application_number} ({app.concession_type.name if app.concession_type else 'Concession'})",
            credit_adjustment_amount=credit_surplus,
        )
        db.add(allocation)

        app.applied_amount = alloc_amt
        app.status = "applied"
        app.invoice_id = invoice.id

        audit = AuditLog(
            user_id=user.id,
            action="CONCESSION_APPLIED_TO_INVOICE",
            resource_type="concession_allocation",
            resource_id=app.id,
            old_data=json.dumps({"invoice_id": invoice.id, "old_discount": float(invoice.discount_amount - alloc_amt)}),
            new_data=json.dumps({
                "invoice_number": invoice.invoice_number,
                "concession_allocated": float(alloc_amt),
                "new_net": float(new_net),
                "new_outstanding": float(new_outstanding),
                "credit_surplus": float(credit_surplus),
            }),
            details=f"Concession #{app.application_number} applied to Invoice #{invoice.invoice_number}: -₹{alloc_amt:,.2f}. Credit surplus: ₹{credit_surplus:,.2f}",
            severity="INFO",
        )
        db.add(audit)
        await db.flush()
        return allocation

    @classmethod
    async def withdraw_application(
        cls,
        db: AsyncSession,
        application_id: int,
        user: User,
        withdrawal_reason: str,
    ) -> StudentConcessionApplication:
        if not (withdrawal_reason or "").strip():
            raise ValueError("A clear withdrawal reason is required.")

        app_res = await db.execute(
            select(StudentConcessionApplication)
            .options(
                selectinload(StudentConcessionApplication.allocations),
                selectinload(StudentConcessionApplication.invoice),
            )
            .where(StudentConcessionApplication.id == application_id)
        )
        app = app_res.scalar_one_or_none()
        if not app:
            raise ValueError("Application not found")

        # If already applied, reverse the allocation from FeeInvoice
        if app.status == "applied" and app.allocations:
            for alloc in app.allocations:
                inv_res = await db.execute(select(FeeInvoice).where(FeeInvoice.id == alloc.invoice_id))
                invoice = inv_res.scalar_one_or_none()
                if invoice:
                    reverted_discount = max(Decimal("0.00"), invoice.discount_amount - alloc.allocated_amount)
                    reverted_net = invoice.total_amount - reverted_discount
                    reverted_outstanding = max(Decimal("0.00"), reverted_net - invoice.paid_amount)
                    invoice.discount_amount = reverted_discount
                    invoice.net_amount = reverted_net
                    invoice.outstanding_amount = reverted_outstanding
                    invoice.status = "paid" if reverted_outstanding == Decimal("0.00") else ("partial" if invoice.paid_amount > 0 else "unpaid")
                    invoice.notes = (invoice.notes or "") + f" | Concession #{app.application_number} withdrawn (+₹{alloc.allocated_amount:,.2f})"

                # Also adjust StudentFeeAssignment
                assign_res = await db.execute(
                    select(StudentFeeAssignment).where(
                        StudentFeeAssignment.student_id == app.student_id,
                        StudentFeeAssignment.academic_year_id == app.academic_year_id,
                    )
                )
                assign = assign_res.scalar_one_or_none()
                if assign:
                    assign.concession_amount = max(Decimal("0.00"), assign.concession_amount - alloc.allocated_amount)

                # Delete allocation record
                await db.delete(alloc)

        app.status = "withdrawn"
        app.withdrawal_reason = withdrawal_reason.strip()

        audit = AuditLog(
            user_id=user.id,
            action="CONCESSION_APPLICATION_WITHDRAWN",
            resource_type="concession_application",
            resource_id=app.id,
            details=f"Concession #{app.application_number} withdrawn by {user.username}: {withdrawal_reason}",
            severity="WARNING",
        )
        db.add(audit)
        await db.commit()
        await db.refresh(app)
        return app

