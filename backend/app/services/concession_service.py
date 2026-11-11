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
#  * @updated     2026-11-11
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
    SponsorSettlement,
    StudentFeeAssignment,
    FeeInvoice,
    FeeInvoiceItem,
    FeeStructure,
)
from app.models.student import Student, Guardian
from app.models.user import User, AuditLog
from app.models.academic_year import AcademicYear
from app.models.exam import ExamMark, Examination
from app.models.attendance import Attendance
from app.services.sequence import (
    generate_next_concession_number,
    generate_next_concession_txn_ref,
    generate_next_sponsor_settlement_ref,
)
from app.services.financial_governance_service import FinancialGovernanceService


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

        # 1. Anti-Duplication Rule: Check duplicate active/pending application for the same concession scheme
        same_scheme_stmt = (
            select(StudentConcessionApplication)
            .where(
                StudentConcessionApplication.student_id == student_id,
                StudentConcessionApplication.academic_year_id == academic_year_id,
                StudentConcessionApplication.concession_type_id == new_concession_type.id,
                StudentConcessionApplication.status.in_([
                    "draft", "submitted", "under_verification", "pending_approval", "approved", "applied", "partially_applied"
                ]),
            )
        )
        if exclude_application_id:
            same_scheme_stmt = same_scheme_stmt.where(StudentConcessionApplication.id != exclude_application_id)

        existing_duplicate = (await db.execute(same_scheme_stmt)).scalars().first()
        if existing_duplicate:
            return False, f"Duplicate application prohibited: Student already has an active or pending '{new_concession_type.name}' application (#{existing_duplicate.application_number}, status: {existing_duplicate.status}). Multiple applications of the same scheme to the same student are not permitted."

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
        fee_category_id: Optional[int] = None,
        valid_until: Optional[date] = None,
        idempotency_key: Optional[str] = None,
    ) -> StudentConcessionApplication:
        # Idempotency check to prevent duplicate submissions on network retries
        if idempotency_key and idempotency_key.strip():
            existing_idem = (
                await db.execute(
                    select(StudentConcessionApplication).where(
                        StudentConcessionApplication.institution_id == institution_id,
                        StudentConcessionApplication.idempotency_key == idempotency_key.strip(),
                    )
                )
            ).scalar_one_or_none()
            if existing_idem:
                return existing_idem

        if valid_until and valid_until < date.today():
            raise ValueError("Concession validity expiry date cannot be in the past.")

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
                FeeInvoice.status != "cancelled",
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
        btype, waiver_scope = FinancialGovernanceService.resolve_benefit_classification(
            ctype.category, funding_src, ctype.calculation_type, getattr(ctype, "benefit_type", None)
        )
        if btype == "fee_waiver" and invoice and calc_amt < invoice.total_amount:
            waiver_scope = "partial_waiver"
        sponsor_status = "pending" if funding_src in ("external_sponsor", "government") else "not_applicable"

        app = StudentConcessionApplication(
            institution_id=institution_id,
            application_number=app_number,
            student_id=student_id,
            academic_year_id=academic_year_id,
            concession_type_id=concession_type_id,
            invoice_id=invoice.id if invoice else None,
            assignment_id=invoice.assignment_id if invoice else None,
            fee_category_id=fee_category_id,
            requested_amount=calc_amt,
            requested_percentage=calc_pct,
            approved_amount=Decimal("0.00"),
            applied_amount=Decimal("0.00"),
            reversed_amount=Decimal("0.00"),
            benefit_type=btype,
            waiver_scope=waiver_scope,
            funding_source=funding_src,
            sponsor_name=sponsor_name or (ctype.name if funding_src in ("external_sponsor", "government") else None),
            sponsor_reference=sponsor_reference,
            sponsor_sanctioned_amount=sponsor_sanctioned_amount or (calc_amt if funding_src in ("external_sponsor", "government") else None),
            sponsor_received_amount=Decimal("0.00"),
            sponsor_settlement_status=sponsor_status,
            idempotency_key=idempotency_key.strip() if idempotency_key else None,
            valid_until=valid_until,
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
                "benefit_type": btype,
                "funding_source": funding_src,
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

    @staticmethod
    async def _reconcile_invoice_items_discount(
        db: AsyncSession, invoice: FeeInvoice, new_discount: Decimal, precision: int = 2
    ) -> None:
        """Distributes total invoice discount proportionally across invoice line items."""
        items_res = await db.execute(select(FeeInvoiceItem).where(FeeInvoiceItem.invoice_id == invoice.id))
        items = items_res.scalars().all()
        if not items:
            return
        if len(items) == 1:
            items[0].discount_amount = new_discount
            items[0].net_amount = max(Decimal("0.00"), items[0].amount - new_discount)
            return

        total_item_amount = sum(Decimal(str(it.amount or 0)) for it in items)
        if total_item_amount <= 0:
            return
        allocated_so_far = Decimal("0.00")
        q_fmt = Decimal("1" if precision <= 0 else f"0.{'0' * precision}")
        for idx, it in enumerate(items):
            if idx == len(items) - 1:
                it_disc = max(Decimal("0.00"), new_discount - allocated_so_far)
            else:
                it_disc = (new_discount * (Decimal(str(it.amount)) / total_item_amount)).quantize(
                    q_fmt, rounding=ROUND_HALF_UP
                )
                allocated_so_far += it_disc
            it.discount_amount = it_disc
            it.net_amount = max(Decimal("0.00"), it.amount - it_disc)

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
            .with_for_update(of=StudentConcessionApplication)
        )
        app = app_res.scalar_one_or_none()
        if not app:
            raise ValueError("Application not found")

        if app.status not in ["pending_approval", "under_verification"]:
            raise ValueError(f"Application #{app.application_number} is already in '{app.status}' status")

        if app.valid_until and app.valid_until < date.today():
            app.status = "expired"
            app.expired_at = datetime.now(timezone.utc)
            db.add(AuditLog(
                user_id=approver.id,
                action="CONCESSION_APPLICATION_EXPIRED",
                resource_type="concession_application",
                resource_id=app.id,
                details=f"Concession #{app.application_number} expired on {app.valid_until} before approval.",
                severity="WARNING",
            ))
            await db.commit()
            raise ValueError(f"Concession #{app.application_number} expired on {app.valid_until} and cannot be approved.")

        # Segregation of duties: prevent unauthorized self-approval unless superadmin/admin
        if app.nominator_id == approver.id and approver.role not in ["superadmin", "admin"]:
            raise ValueError("Segregation of duties: You cannot approve your own nominated concession application.")

        final_amt = approved_amount if approved_amount is not None and approved_amount > 0 else app.requested_amount
        if app.concession_type and app.concession_type.max_discount_amount and final_amt > app.concession_type.max_discount_amount:
            final_amt = app.concession_type.max_discount_amount

        app.approved_amount = final_amt
        app.approver_id = approver.id
        app.approved_at = datetime.now(timezone.utc)
        app.approval_remarks = remarks or "Approved per executive administrative committee resolution"
        app.status = "approved"
        if app.funding_source in ("external_sponsor", "government") and not app.sponsor_sanctioned_amount:
            app.sponsor_sanctioned_amount = final_amt

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

        app_res = await db.execute(
            select(StudentConcessionApplication)
            .where(StudentConcessionApplication.id == application_id)
            .with_for_update(of=StudentConcessionApplication)
        )
        app = app_res.scalar_one_or_none()
        if not app:
            raise ValueError("Application not found")

        if app.status in ["approved", "partially_applied", "applied", "posted", "cancelled", "reversed"]:
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
        allocation_amount: Optional[Decimal] = None,
        invoice_item_id: Optional[int] = None,
    ) -> FeeConcessionAllocation:
        """
        Atomically posts an approved (or partially_applied) concession/waiver/scholarship to the student's FeeInvoice.
        Enforces row-level locks, validity expiration checks, anti-double-posting guards,
        immutable transaction referencing, line-item sync, and over-payment credit calculation.
        """
        app_res = await db.execute(
            select(StudentConcessionApplication)
            .options(
                selectinload(StudentConcessionApplication.concession_type),
                selectinload(StudentConcessionApplication.student),
            )
            .where(StudentConcessionApplication.id == application_id)
            .with_for_update(of=StudentConcessionApplication)
        )
        app = app_res.scalar_one_or_none()
        if not app:
            raise ValueError("Application not found")

        if app.status not in ("approved", "partially_applied"):
            raise ValueError(f"Cannot apply concession in '{app.status}' status. Application must be approved first.")

        if app.valid_until and app.valid_until < date.today():
            app.status = "expired"
            app.expired_at = datetime.now(timezone.utc)
            db.add(AuditLog(
                user_id=user.id,
                action="CONCESSION_APPLICATION_EXPIRED",
                resource_type="concession_application",
                resource_id=app.id,
                details=f"Concession #{app.application_number} expired on {app.valid_until} before invoice posting.",
                severity="WARNING",
            ))
            await db.flush()
            raise ValueError(f"Concession #{app.application_number} expired on {app.valid_until} and cannot be applied.")

        remaining_to_apply = max(Decimal("0.00"), Decimal(str(app.approved_amount or 0)) - Decimal(str(app.applied_amount or 0)))
        if remaining_to_apply <= Decimal("0.00"):
            raise ValueError(f"Concession #{app.application_number} has already been fully allocated.")

        alloc_amt = remaining_to_apply if allocation_amount is None else Decimal(str(allocation_amount))
        if alloc_amt <= Decimal("0.00") or alloc_amt > remaining_to_apply:
            raise ValueError(
                f"Allocation amount (₹{alloc_amt:,.2f}) must be between ₹0.01 and remaining approved balance ₹{remaining_to_apply:,.2f}."
            )

        # Find & lock target FeeInvoice
        inv_stmt = (
            select(FeeInvoice)
            .where(
                FeeInvoice.student_id == app.student_id,
                FeeInvoice.academic_year_id == app.academic_year_id,
                FeeInvoice.status != "cancelled",
            )
            .order_by(desc(FeeInvoice.id))
            .limit(1)
            .with_for_update(of=FeeInvoice)
        )
        invoice = (await db.execute(inv_stmt)).scalar_one_or_none()
        if not invoice:
            raise ValueError(f"No active fee invoice found for Student #{app.student_id}")

        # Prevent duplicate full allocation on same invoice while active posted row already covers it
        if allocation_amount is None:
            existing_alloc = (
                await db.execute(
                    select(FeeConcessionAllocation).where(
                        FeeConcessionAllocation.application_id == app.id,
                        FeeConcessionAllocation.invoice_id == invoice.id,
                        FeeConcessionAllocation.posting_status == "posted",
                    )
                )
            ).scalars().first()
            if existing_alloc and app.status == "applied":
                raise ValueError(f"Concession #{app.application_number} has already been allocated to Invoice #{invoice.invoice_number}")

        max_invoice_headroom = max(Decimal("0.00"), invoice.total_amount - invoice.discount_amount)
        if alloc_amt > max_invoice_headroom:
            alloc_amt = max_invoice_headroom

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

        await cls._reconcile_invoice_items_discount(db, invoice, new_discount)

        # Synchronize StudentFeeAssignment concession_amount
        assign_stmt = (
            select(StudentFeeAssignment)
            .where(
                StudentFeeAssignment.student_id == app.student_id,
                StudentFeeAssignment.academic_year_id == app.academic_year_id,
            )
            .order_by(desc(StudentFeeAssignment.id))
            .limit(1)
        )
        assignment = (await db.execute(assign_stmt)).scalar_one_or_none()
        if assignment:
            assignment.concession_amount = Decimal(str(assignment.concession_amount or 0)) + alloc_amt

        txn_ref = await generate_next_concession_txn_ref(db, app.institution_id, app.academic_year_id)
        txn_type = app.benefit_type or "fee_concession"
        if credit_surplus > 0 and invoice.paid_amount > new_net:
            # Main allocation records benefit type and tracks credit_adjustment_amount explicitly
            pass

        allocation = FeeConcessionAllocation(
            transaction_ref=txn_ref,
            application_id=app.id,
            invoice_id=invoice.id,
            fee_category_id=app.fee_category_id,
            invoice_item_id=invoice_item_id,
            transaction_type=txn_type,
            posting_status="posted",
            effective_date=date.today(),
            allocated_amount=alloc_amt,
            allocated_by_id=user.id,
            notes=f"[{txn_ref}] Allocated from approved application #{app.application_number} ({app.concession_type.name if app.concession_type else 'Concession'})",
            credit_adjustment_amount=credit_surplus,
        )
        db.add(allocation)

        new_applied_total = Decimal(str(app.applied_amount or 0)) + alloc_amt
        app.applied_amount = new_applied_total
        app.status = "applied" if new_applied_total >= app.approved_amount else "partially_applied"
        app.invoice_id = invoice.id

        audit = AuditLog(
            user_id=user.id,
            action="CONCESSION_APPLIED_TO_INVOICE",
            resource_type="concession_allocation",
            resource_id=app.id,
            old_data=json.dumps({"invoice_id": invoice.id, "old_discount": float(invoice.discount_amount - alloc_amt)}),
            new_data=json.dumps({
                "transaction_ref": txn_ref,
                "invoice_number": invoice.invoice_number,
                "concession_allocated": float(alloc_amt),
                "total_applied": float(new_applied_total),
                "new_net": float(new_net),
                "new_outstanding": float(new_outstanding),
                "credit_surplus": float(credit_surplus),
            }),
            details=f"Concession #{app.application_number} ({txn_ref}) posted to Invoice #{invoice.invoice_number}: -₹{alloc_amt:,.2f}. Credit surplus: ₹{credit_surplus:,.2f}",
            severity="INFO",
        )
        db.add(audit)
        await db.flush()
        return allocation

    @classmethod
    async def _reverse_posted_allocations(
        cls,
        db: AsyncSession,
        app: StudentConcessionApplication,
        user: User,
        reason: str,
        target_status: str,
    ) -> Decimal:
        """
        Immutable reversal helper: marks active posted allocations as 'reversed',
        appends negative reversal ledger rows referencing original allocations,
        restores FeeInvoice, FeeInvoiceItem, and StudentFeeAssignment balances.
        NEVER physically deletes financial ledger rows.
        """
        restored_total = Decimal("0.00")
        now = datetime.now(timezone.utc)
        active_allocs = [
            al for al in (app.allocations or [])
            if getattr(al, "posting_status", "posted") == "posted" and getattr(al, "transaction_type", "") != "reversal"
        ]

        for alloc in active_allocs:
            inv_res = await db.execute(
                select(FeeInvoice)
                .where(FeeInvoice.id == alloc.invoice_id)
                .with_for_update(of=FeeInvoice)
            )
            invoice = inv_res.scalar_one_or_none()
            amt = Decimal(str(alloc.allocated_amount or 0))
            if invoice and amt > 0:
                reverted_discount = max(Decimal("0.00"), invoice.discount_amount - amt)
                reverted_net = max(Decimal("0.00"), invoice.total_amount - reverted_discount)
                reverted_outstanding = max(Decimal("0.00"), reverted_net - invoice.paid_amount)
                invoice.discount_amount = reverted_discount
                invoice.net_amount = reverted_net
                invoice.outstanding_amount = reverted_outstanding
                invoice.status = (
                    "paid"
                    if reverted_outstanding <= Decimal("0.01") and invoice.net_amount > 0
                    else ("partial" if invoice.paid_amount > 0 else "unpaid")
                )
                invoice.notes = (invoice.notes or "") + f" | Concession #{app.application_number} {target_status} (+₹{amt:,.2f})"
                await cls._reconcile_invoice_items_discount(db, invoice, reverted_discount)

            assign_res = await db.execute(
                select(StudentFeeAssignment).where(
                    StudentFeeAssignment.student_id == app.student_id,
                    StudentFeeAssignment.academic_year_id == app.academic_year_id,
                )
            )
            assign = assign_res.scalar_one_or_none()
            if assign:
                assign.concession_amount = max(Decimal("0.00"), assign.concession_amount - amt)

            # Mark original allocation immutable as reversed
            alloc.posting_status = "reversed"
            alloc.reversed_by_id = user.id
            alloc.reversed_at = now
            alloc.reversal_reason = reason

            # Insert immutable paired reversal ledger entry (negative offset)
            rev_ref = await generate_next_concession_txn_ref(db, app.institution_id, app.academic_year_id)
            rev_entry = FeeConcessionAllocation(
                transaction_ref=rev_ref,
                application_id=app.id,
                invoice_id=alloc.invoice_id,
                fee_category_id=alloc.fee_category_id,
                invoice_item_id=alloc.invoice_item_id,
                transaction_type="reversal",
                posting_status="reversed",
                effective_date=date.today(),
                allocated_amount=-amt,
                allocated_by_id=user.id,
                reversed_by_id=user.id,
                reversed_at=now,
                reversal_reason=reason,
                reversal_of_allocation_id=alloc.id,
                notes=f"[{rev_ref}] Immutable reversal of {alloc.transaction_ref or f'CTXN-{alloc.id:04d}'}: {reason}",
                credit_adjustment_amount=Decimal("0.00"),
            )
            db.add(rev_entry)
            restored_total += amt

        app.reversed_amount = Decimal(str(app.reversed_amount or 0)) + restored_total
        app.applied_amount = max(Decimal("0.00"), Decimal(str(app.applied_amount or 0)) - restored_total)
        return restored_total

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
            .with_for_update(of=StudentConcessionApplication)
        )
        app = app_res.scalar_one_or_none()
        if not app:
            raise ValueError("Application not found")

        if app.status in ("withdrawn", "cancelled", "reversed"):
            raise ValueError(f"Application #{app.application_number} is already in '{app.status}' status.")

        restored = await cls._reverse_posted_allocations(
            db, app, user, withdrawal_reason.strip(), "withdrawn"
        )
        app.status = "reversed" if restored > 0 else "withdrawn"
        app.withdrawal_reason = withdrawal_reason.strip()

        db.add(AuditLog(
            user_id=user.id,
            action="CONCESSION_APPLICATION_WITHDRAWN" if restored == 0 else "CONCESSION_POSTING_REVERSED",
            resource_type="concession_application",
            resource_id=app.id,
            new_data=json.dumps({"restored_balance": float(restored), "status": app.status}),
            details=f"Concession #{app.application_number} {app.status} by {user.username} (restored ₹{restored:,.2f}): {withdrawal_reason}",
            severity="WARNING",
        ))
        await db.commit()
        await db.refresh(app)
        return app

    @classmethod
    async def reverse_concession(
        cls,
        db: AsyncSession,
        application_id: int,
        user: User,
        reversal_reason: str,
    ) -> StudentConcessionApplication:
        """Explicitly reverses a posted concession allocation, restoring invoice & net fee balances immutably."""
        if not (reversal_reason or "").strip():
            raise ValueError("A clear audit reversal reason is required.")

        app = (
            await db.execute(
                select(StudentConcessionApplication)
                .options(selectinload(StudentConcessionApplication.allocations))
                .where(StudentConcessionApplication.id == application_id)
                .with_for_update(of=StudentConcessionApplication)
            )
        ).scalar_one_or_none()
        if not app:
            raise ValueError("Application not found")
        if app.status not in ("applied", "posted", "partially_applied"):
            raise ValueError(f"Only posted/applied concessions can be reversed (current status: '{app.status}').")

        restored = await cls._reverse_posted_allocations(
            db, app, user, reversal_reason.strip(), "reversed"
        )
        app.status = "reversed"
        app.withdrawal_reason = reversal_reason.strip()

        db.add(AuditLog(
            user_id=user.id,
            action="CONCESSION_POSTING_REVERSED",
            resource_type="concession_application",
            resource_id=app.id,
            new_data=json.dumps({"restored_balance": float(restored), "status": "reversed"}),
            details=f"Concession #{app.application_number} reversed by {user.username} (+₹{restored:,.2f} invoice balance restored): {reversal_reason}",
            severity="WARNING",
        ))
        await db.commit()
        await db.refresh(app)
        return app

    @classmethod
    async def cancel_application(
        cls,
        db: AsyncSession,
        application_id: int,
        user: User,
        cancellation_reason: str,
    ) -> StudentConcessionApplication:
        """Cancels an application; if posted, immutably reverses allocations first so cancelled items never stay active."""
        if not (cancellation_reason or "").strip():
            raise ValueError("A clear cancellation reason is strictly required.")

        app = (
            await db.execute(
                select(StudentConcessionApplication)
                .options(selectinload(StudentConcessionApplication.allocations))
                .where(StudentConcessionApplication.id == application_id)
                .with_for_update(of=StudentConcessionApplication)
            )
        ).scalar_one_or_none()
        if not app:
            raise ValueError("Application not found")
        if app.status == "cancelled":
            raise ValueError(f"Application #{app.application_number} is already cancelled.")

        restored = await cls._reverse_posted_allocations(
            db, app, user, cancellation_reason.strip(), "cancelled"
        )
        now = datetime.now(timezone.utc)
        app.status = "cancelled"
        app.cancelled_by_id = user.id
        app.cancelled_at = now
        app.cancellation_reason = cancellation_reason.strip()

        db.add(AuditLog(
            user_id=user.id,
            action="CONCESSION_APPLICATION_CANCELLED",
            resource_type="concession_application",
            resource_id=app.id,
            new_data=json.dumps({"restored_balance": float(restored), "status": "cancelled"}),
            details=f"Concession #{app.application_number} cancelled by {user.username} (restored ₹{restored:,.2f}): {cancellation_reason}",
            severity="WARNING",
        ))
        await db.commit()
        await db.refresh(app)
        return app

    @classmethod
    async def expire_stale_applications(
        cls,
        db: AsyncSession,
        institution_id: int,
        user: Optional[User] = None,
    ) -> int:
        """Transitions all unposted applications past valid_until into immutable 'expired' state."""
        today = date.today()
        now = datetime.now(timezone.utc)
        res = await db.execute(
            select(StudentConcessionApplication).where(
                StudentConcessionApplication.institution_id == institution_id,
                StudentConcessionApplication.status.in_(["draft", "submitted", "under_verification", "pending_approval", "approved"]),
                StudentConcessionApplication.valid_until.isnot(None),
                StudentConcessionApplication.valid_until < today,
            )
        )
        apps = res.scalars().all()
        for app in apps:
            app.status = "expired"
            app.expired_at = now
            db.add(AuditLog(
                user_id=user.id if user else None,
                action="CONCESSION_APPLICATION_EXPIRED",
                resource_type="concession_application",
                resource_id=app.id,
                details=f"Concession #{app.application_number} automatically expired after valid_until {app.valid_until}.",
                severity="INFO",
                is_system_audit=(user is None),
            ))
        if apps:
            await db.commit()
        return len(apps)

    @classmethod
    async def record_sponsor_settlement(
        cls,
        db: AsyncSession,
        application_id: int,
        user: User,
        amount: Decimal,
        received_date: date,
        payment_method: str = "bank_transfer",
        reference_number: Optional[str] = None,
        remarks: Optional[str] = None,
    ) -> SponsorSettlement:
        """Records external sponsor/government fund recovery against sanctioned scholarship."""
        if amount <= Decimal("0.00"):
            raise ValueError("Settlement amount must be strictly positive.")

        app = (
            await db.execute(
                select(StudentConcessionApplication)
                .where(StudentConcessionApplication.id == application_id)
                .with_for_update(of=StudentConcessionApplication)
            )
        ).scalar_one_or_none()
        if not app:
            raise ValueError("Concession / Scholarship application not found.")
        if app.funding_source not in ("external_sponsor", "government"):
            raise ValueError("Only external sponsor or government-funded applications accept sponsor settlements.")
        if app.status not in ("approved", "partially_applied", "applied", "posted"):
            raise ValueError(f"Cannot record sponsor settlement in '{app.status}' status.")

        sanctioned = Decimal(str(app.sponsor_sanctioned_amount or app.approved_amount or 0))
        already_received = Decimal(str(app.sponsor_received_amount or 0))
        if already_received + amount > sanctioned + Decimal("0.01"):
            raise ValueError(
                f"Settlement ₹{amount:,.2f} exceeds pending sponsor receivable ₹{max(Decimal('0.00'), sanctioned - already_received):,.2f}."
            )

        s_ref = await generate_next_sponsor_settlement_ref(db, app.institution_id, app.academic_year_id)
        settlement = SponsorSettlement(
            institution_id=app.institution_id,
            application_id=app.id,
            settlement_ref=s_ref,
            amount=amount,
            received_date=received_date,
            payment_method=payment_method,
            reference_number=reference_number,
            remarks=remarks,
            recorded_by_id=user.id,
            status="completed",
        )
        db.add(settlement)

        new_received = already_received + amount
        app.sponsor_received_amount = new_received
        app.sponsor_settlement_status = (
            "settled" if new_received >= sanctioned - Decimal("0.01") else "partial"
        )

        db.add(AuditLog(
            user_id=user.id,
            action="SPONSOR_SETTLEMENT_RECORDED",
            resource_type="sponsor_settlement",
            resource_id=app.id,
            new_data=json.dumps({
                "settlement_ref": s_ref,
                "amount": float(amount),
                "total_received": float(new_received),
                "settlement_status": app.sponsor_settlement_status,
            }),
            details=f"Sponsor settlement {s_ref} recorded for #{app.application_number} ({app.sponsor_name or 'Sponsor'}): ₹{amount:,.2f}",
            severity="INFO",
        ))
        await db.commit()
        await db.refresh(settlement)
        return settlement

