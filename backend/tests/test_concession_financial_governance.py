# /**
#  * @file        test_concession_financial_governance.py
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
#  * @created     2026-11-11
#  * @updated     2026-11-11
#  *
#  * @description Comprehensive 20-scenario verification suite for Centralized Concessions, Fee Waivers, Scholarships, Sponsor Funding, Reversals, Cancellations, RBAC, 20 Reports, and Single Source of Truth Reconciliation.
#  */

import uuid
from datetime import date, timedelta
from decimal import Decimal
import pytest
from sqlalchemy import select

from app.core.security import get_password_hash
from app.models.academic_year import AcademicYear
from app.models.fee import (
    FeeCategory,
    FeeStructure,
    StudentFeeAssignment,
    FeeInvoice,
    FeeInvoiceItem,
    FeeConcessionType,
    StudentConcessionApplication,
    FeeConcessionAllocation,
    SponsorSettlement,
)
from app.models.institution import Institution
from app.models.student import Student
from app.models.user import User, Role
from app.services.concession_service import ConcessionWorkflowService
from app.services.financial_governance_service import (
    FinancialGovernanceService,
    FinancialFilter,
    CONCESSION_REPORT_DEFINITIONS,
)


async def _make_user_with_role(db, role_name: str, institution_id: int) -> tuple[User, dict]:
    suffix = uuid.uuid4().hex[:8]
    role = (await db.execute(select(Role).where(Role.name == role_name))).scalar_one_or_none()
    user = User(
        username=f"{role_name}_{suffix}",
        email=f"{role_name}_{suffix}@test.com",
        hashed_password=get_password_hash("testpassword"),
        first_name=role_name.capitalize(),
        last_name="Tester",
        role=role_name,
        role_id=role.id if role else None,
        institution_id=institution_id,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user, {"username": user.username, "password": "testpassword"}


async def _login_headers(client, creds: dict) -> dict:
    res = await client.post("/api/v1/auth/login", data=creds)
    assert res.status_code == 200, res.text
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


async def _make_student_and_invoice(
    db,
    institution_id: int,
    academic_year_id: int,
    gross: Decimal = Decimal("20000.00"),
    item_splits: list[tuple[str, Decimal]] | None = None,
):
    suffix = uuid.uuid4().hex[:8]
    student = Student(
        institution_id=institution_id,
        admission_number=f"GOV{suffix}",
        first_name="Gov",
        last_name=f"Student{suffix[:4]}",
        date_of_birth=date(2012, 5, 10),
        gender="female",
        admission_date=date(2024, 6, 1),
        is_demo=False,
    )
    db.add(student)
    await db.flush()

    cat = FeeCategory(institution_id=institution_id, name=f"Tuition-{suffix}")
    db.add(cat)
    await db.flush()

    structure = FeeStructure(
        institution_id=institution_id,
        academic_year_id=academic_year_id,
        category_id=cat.id,
        name=f"CourseFee-{suffix}",
        amount=gross,
        frequency="annual",
    )
    db.add(structure)
    await db.flush()

    assignment = StudentFeeAssignment(
        student_id=student.id,
        fee_structure_id=structure.id,
        academic_year_id=academic_year_id,
        custom_amount=gross,
        concession_amount=Decimal("0.00"),
    )
    db.add(assignment)
    await db.flush()

    invoice = FeeInvoice(
        invoice_number=f"INV-GOV-{suffix}",
        student_id=student.id,
        assignment_id=assignment.id,
        academic_year_id=academic_year_id,
        total_amount=gross,
        discount_amount=Decimal("0.00"),
        net_amount=gross,
        paid_amount=Decimal("0.00"),
        outstanding_amount=gross,
        issue_date=date.today(),
        due_date=date.today() + timedelta(days=90),
        status="unpaid",
    )
    db.add(invoice)
    await db.flush()

    splits = item_splits or [("Annual Tuition", gross)]
    for desc, amt in splits:
        db.add(FeeInvoiceItem(
            invoice_id=invoice.id,
            fee_structure_id=structure.id,
            description=desc,
            amount=amt,
            discount_amount=Decimal("0.00"),
            net_amount=amt,
        ))
    await db.commit()
    await db.refresh(student)
    await db.refresh(invoice)
    return student, invoice, structure, cat


async def _make_scheme(
    db,
    institution_id: int,
    *,
    category: str = "merit",
    benefit_type: str = "fee_concession",
    funding_source: str = "institute",
    calculation_type: str = "fixed_amount",
    default_value: Decimal = Decimal("2000.00"),
    max_discount_amount: Decimal | None = None,
    is_stackable: bool = True,
):
    suffix = uuid.uuid4().hex[:6]
    ctype = FeeConcessionType(
        institution_id=institution_id,
        code=f"SCH_{suffix}",
        name=f"Scheme {benefit_type} {suffix}",
        category=category,
        benefit_type=benefit_type,
        funding_source=funding_source,
        calculation_type=calculation_type,
        default_value=default_value,
        max_discount_amount=max_discount_amount,
        is_stackable=is_stackable,
        requires_documents=False,
        is_active=True,
    )
    db.add(ctype)
    await db.commit()
    await db.refresh(ctype)
    return ctype


class TestConcessionFinancialGovernance:
    @pytest.mark.asyncio
    async def test_scenarios_1_to_8_benefit_types_approval_posting_and_sponsors(
        self, client, db, admin_user, test_institution, test_academic_year
    ):
        """
        Covers Scenarios:
        1. Fixed concession: approved != applied until explicitly posted.
        2. Percentage concession.
        3. Full fee waiver (100% -> ₹0 net, invoice paid/settled).
        4. Partial fee waiver with multi-item pro-rata installment sync.
        5. Academy-funded scholarship.
        6. External sponsor-funded scholarship + partial & full settlement recovery.
        7. Government grant funding.
        8. Approved-but-unapplied benefit tracked separately & never lowers outstanding.
        """
        admin_user.institution_id = test_institution.id
        await db.commit()
        headers = await _login_headers(client, {"username": admin_user.username, "password": "testpassword"})

        # Scenario 1 & 8: Fixed concession approved ONLY (auto_apply=False), verify invoice unchanged, then apply
        s1, inv1, _, _ = await _make_student_and_invoice(db, test_institution.id, test_academic_year.id, Decimal("20000.00"))
        sch_fixed = await _make_scheme(db, test_institution.id, category="need_based", benefit_type="fee_concession", calculation_type="fixed_amount", default_value=Decimal("5000.00"))

        app1 = await ConcessionWorkflowService.submit_application(
            db, test_institution.id, s1.id, sch_fixed.id, test_academic_year.id, admin_user, requested_amount=Decimal("5000.00")
        )
        await ConcessionWorkflowService.approve_application(db, app1.id, admin_user, auto_apply=False)
        await db.refresh(inv1)
        assert inv1.discount_amount == Decimal("0.00")
        assert inv1.net_amount == Decimal("20000.00")
        assert inv1.outstanding_amount == Decimal("20000.00")

        # Verify governance summary reflects Approved Unapplied = 5000, Posted = 0
        gov1 = await FinancialGovernanceService.get_governed_summary(
            db, FinancialFilter(institution_id=test_institution.id, student_id=s1.id, is_demo=False)
        )
        assert gov1["financials"]["approved_concessions_total"] == 5000.0
        assert gov1["financials"]["posted_concessions_total"] == 0.0
        assert gov1["financials"]["approved_unapplied"] == 5000.0
        assert gov1["financials"]["total_outstanding"] == 20000.0

        # Now apply/post explicitly
        await ConcessionWorkflowService.apply_concession_to_invoice(db, app1.id, admin_user)
        await db.commit()
        await db.refresh(inv1)
        assert inv1.discount_amount == Decimal("5000.00")
        assert inv1.net_amount == Decimal("15000.00")
        assert inv1.outstanding_amount == Decimal("15000.00")

        # Scenario 2: Percentage concession (25% of 20000 = 5000)
        s2, inv2, _, _ = await _make_student_and_invoice(db, test_institution.id, test_academic_year.id, Decimal("20000.00"))
        sch_pct = await _make_scheme(db, test_institution.id, category="sibling", benefit_type="fee_concession", calculation_type="percentage", default_value=Decimal("25.00"))
        app2 = await ConcessionWorkflowService.submit_application(
            db, test_institution.id, s2.id, sch_pct.id, test_academic_year.id, admin_user
        )
        await ConcessionWorkflowService.approve_application(db, app2.id, admin_user, auto_apply=True)
        await db.refresh(inv2)
        assert inv2.discount_amount == Decimal("5000.00")
        assert inv2.net_amount == Decimal("15000.00")

        # Scenario 3: Full Fee Waiver (100%)
        s3, inv3, _, _ = await _make_student_and_invoice(db, test_institution.id, test_academic_year.id, Decimal("18000.00"))
        sch_full = await _make_scheme(db, test_institution.id, category="fee_waiver", benefit_type="fee_waiver", calculation_type="full_waiver", default_value=Decimal("100.00"))
        app3 = await ConcessionWorkflowService.submit_application(
            db, test_institution.id, s3.id, sch_full.id, test_academic_year.id, admin_user
        )
        await ConcessionWorkflowService.approve_application(db, app3.id, admin_user, auto_apply=True)
        await db.refresh(inv3)
        assert app3.waiver_scope == "full_waiver"
        assert inv3.net_amount == Decimal("0.00")
        assert inv3.outstanding_amount == Decimal("0.00")
        assert inv3.status == "paid"

        # Scenario 4: Partial Fee Waiver + pro-rata invoice item sync
        s4, inv4, _, _ = await _make_student_and_invoice(
            db, test_institution.id, test_academic_year.id, Decimal("10000.00"),
            item_splits=[("Term 1", Decimal("6000.00")), ("Term 2", Decimal("4000.00"))],
        )
        sch_part = await _make_scheme(db, test_institution.id, category="fee_waiver", benefit_type="fee_waiver", calculation_type="fixed_amount", default_value=Decimal("3000.00"))
        app4 = await ConcessionWorkflowService.submit_application(
            db, test_institution.id, s4.id, sch_part.id, test_academic_year.id, admin_user, requested_amount=Decimal("3000.00")
        )
        await ConcessionWorkflowService.approve_application(db, app4.id, admin_user, auto_apply=True)
        await db.refresh(inv4)
        assert app4.waiver_scope == "partial_waiver"
        items4 = (await db.execute(select(FeeInvoiceItem).where(FeeInvoiceItem.invoice_id == inv4.id))).scalars().all()
        assert sum(it.discount_amount for it in items4) == Decimal("3000.00")
        assert sum(it.net_amount for it in items4) == Decimal("7000.00")

        # Scenario 5, 6, 7: Academy scholarship, External Sponsor scholarship (+ settlement), Government grant
        s5, inv5, _, _ = await _make_student_and_invoice(db, test_institution.id, test_academic_year.id, Decimal("30000.00"))
        sch_acad = await _make_scheme(db, test_institution.id, category="merit", benefit_type="scholarship", funding_source="institute", calculation_type="fixed_amount", default_value=Decimal("6000.00"))
        app5 = await ConcessionWorkflowService.submit_application(
            db, test_institution.id, s5.id, sch_acad.id, test_academic_year.id, admin_user, requested_amount=Decimal("6000.00")
        )
        await ConcessionWorkflowService.approve_application(db, app5.id, admin_user, auto_apply=True)

        s6, inv6, _, _ = await _make_student_and_invoice(db, test_institution.id, test_academic_year.id, Decimal("40000.00"))
        sch_sponsor = await _make_scheme(db, test_institution.id, category="sponsor", benefit_type="sponsor_funding", funding_source="external_sponsor", calculation_type="fixed_amount", default_value=Decimal("10000.00"))
        app6 = await ConcessionWorkflowService.submit_application(
            db, test_institution.id, s6.id, sch_sponsor.id, test_academic_year.id, admin_user,
            requested_amount=Decimal("10000.00"), sponsor_name="Tata Foundation", sponsor_reference="TF-2026", sponsor_sanctioned_amount=Decimal("10000.00")
        )
        await ConcessionWorkflowService.approve_application(db, app6.id, admin_user, auto_apply=True)
        assert app6.sponsor_settlement_status == "pending"

        # Partial settlement via API endpoint (₹6,000 of ₹10,000), then remaining ₹4,000
        settle_res1 = await client.post(
            f"/api/v1/fees/concessions/applications/{app6.id}/sponsor-settlement",
            json={"amount": 6000, "payment_method": "neft", "reference_number": "UTR1"},
            headers=headers,
        )
        assert settle_res1.status_code == 201, settle_res1.text
        await db.refresh(app6)
        assert app6.sponsor_settlement_status == "partial"

        settle_res2 = await client.post(
            f"/api/v1/fees/concessions/applications/{app6.id}/sponsor-settlement",
            json={"amount": 4000, "payment_method": "neft", "reference_number": "UTR2"},
            headers=headers,
        )
        assert settle_res2.status_code == 201, settle_res2.text
        await db.refresh(app6)
        assert app6.sponsor_settlement_status == "settled"
        assert app6.sponsor_received_amount == Decimal("10000.00")

        s7, inv7, _, _ = await _make_student_and_invoice(db, test_institution.id, test_academic_year.id, Decimal("25000.00"))
        sch_govt = await _make_scheme(db, test_institution.id, category="government_scheme", benefit_type="sponsor_funding", funding_source="government", calculation_type="fixed_amount", default_value=Decimal("8000.00"))
        app7 = await ConcessionWorkflowService.submit_application(
            db, test_institution.id, s7.id, sch_govt.id, test_academic_year.id, admin_user,
            requested_amount=Decimal("8000.00"), sponsor_name="State MahaDBT", sponsor_reference="DBT-001"
        )
        await ConcessionWorkflowService.approve_application(db, app7.id, admin_user, auto_apply=True)

        # Verify distinct benefit_type totals in institutional governance summary & zero reconciliation variance
        rec = await FinancialGovernanceService.reconcile_financial_ledgers(
            db, FinancialFilter(institution_id=test_institution.id, is_demo=False)
        )
        assert rec["is_reconciled"] is True
        assert rec["ledger_audit"]["variance"] == 0.0
        fin_sum = rec["summary"]
        assert fin_sum["posted_fee_concessions"] == 10000.0       # s1 5000 + s2 5000
        assert fin_sum["posted_fee_waivers"] == 21000.0           # s3 18000 + s4 3000
        assert fin_sum["academy_scholarships"] == 6000.0          # s5 6000
        assert fin_sum["sponsor_funded_scholarships"] == 18000.0  # s6 10000 + s7 8000

    @pytest.mark.asyncio
    async def test_scenarios_9_to_13_expiry_cancellation_reversal_refund_and_adjustment(
        self, client, db, admin_user, test_institution, test_academic_year
    ):
        """
        Covers Scenarios:
        9. Expired benefit blocked & transitioned cleanly via /expire-stale.
        10. Cancelled posted benefit restores invoice & never deletes ledger rows.
        11. Reversed posted benefit creates paired negative reversal allocation & restores invoice.
        12. Payment + subsequent concession overpayment credit + Refund approval/disbursement SoD & idempotency.
        13. Manual student fee adjustment via /fees/students/{id}/adjust-fees tracked under manual_adjustments & synced to items.
        """
        admin_user.institution_id = test_institution.id
        await db.commit()
        admin_headers = await _login_headers(client, {"username": admin_user.username, "password": "testpassword"})

        # Second approver for refund SoD test
        acc_user, acc_creds = await _make_user_with_role(db, "accountant", test_institution.id)
        acc_headers = await _login_headers(client, acc_creds)

        # Scenario 9: Expiry check — create application valid today, then push valid_until into the past to test expiration
        s9, inv9, _, _ = await _make_student_and_invoice(db, test_institution.id, test_academic_year.id, Decimal("15000.00"))
        sch = await _make_scheme(db, test_institution.id, default_value=Decimal("2000.00"))
        app9 = await ConcessionWorkflowService.submit_application(
            db, test_institution.id, s9.id, sch.id, test_academic_year.id, admin_user,
            requested_amount=Decimal("2000.00"), valid_until=date.today() + timedelta(days=5)
        )
        app9.valid_until = date.today() - timedelta(days=2)
        await db.commit()

        exp_res = await client.post(
            f"/api/v1/fees/concessions/expire-stale?institution_id={test_institution.id}",
            headers=admin_headers,
        )
        assert exp_res.status_code == 200
        assert exp_res.json()["expired_count"] >= 1
        await db.refresh(app9)
        assert app9.status == "expired"
        assert app9.expired_at is not None

        # Scenario 10: Cancelled posted concession restores invoice immutably
        s10, inv10, _, _ = await _make_student_and_invoice(db, test_institution.id, test_academic_year.id, Decimal("12000.00"))
        app10 = await ConcessionWorkflowService.submit_application(
            db, test_institution.id, s10.id, sch.id, test_academic_year.id, admin_user, requested_amount=Decimal("4000.00")
        )
        await ConcessionWorkflowService.approve_application(db, app10.id, admin_user, auto_apply=True)
        await db.refresh(inv10)
        assert inv10.net_amount == Decimal("8000.00")

        can_res = await client.post(
            f"/api/v1/fees/concessions/applications/{app10.id}/cancel",
            json={"cancellation_reason": "Student shifted batch"},
            headers=admin_headers,
        )
        assert can_res.status_code == 200, can_res.text
        await db.refresh(inv10)
        await db.refresh(app10)
        assert app10.status == "cancelled"
        assert inv10.discount_amount == Decimal("0.00")
        assert inv10.net_amount == Decimal("12000.00")
        assert inv10.outstanding_amount == Decimal("12000.00")

        # Confirm zero physical delete: original posted + negative reversal rows both exist
        allocs10 = (await db.execute(select(FeeConcessionAllocation).where(FeeConcessionAllocation.application_id == app10.id))).scalars().all()
        assert len(allocs10) == 2
        assert any(a.allocated_amount == Decimal("-4000.00") and a.transaction_type == "reversal" for a in allocs10)

        # Scenario 11: Reversed posted concession
        s11, inv11, _, _ = await _make_student_and_invoice(db, test_institution.id, test_academic_year.id, Decimal("16000.00"))
        app11 = await ConcessionWorkflowService.submit_application(
            db, test_institution.id, s11.id, sch.id, test_academic_year.id, admin_user, requested_amount=Decimal("3000.00")
        )
        await ConcessionWorkflowService.approve_application(db, app11.id, admin_user, auto_apply=True)
        rev_res = await client.post(
            f"/api/v1/fees/concessions/applications/{app11.id}/reverse",
            json={"reversal_reason": "Audit correction - document invalid"},
            headers=admin_headers,
        )
        assert rev_res.status_code == 200, rev_res.text
        await db.refresh(inv11)
        await db.refresh(app11)
        assert app11.status == "reversed"
        assert app11.reversed_amount == Decimal("3000.00")
        assert inv11.net_amount == Decimal("16000.00")
        assert inv11.outstanding_amount == Decimal("16000.00")

        # Scenario 12: Payment paid in full -> Concession applied creates overpayment credit -> Refund workflow with SoD & idempotency
        s12, inv12, _, _ = await _make_student_and_invoice(db, test_institution.id, test_academic_year.id, Decimal("10000.00"))
        pay_res = await client.post(
            "/api/v1/payments/",
            json={
                "student_id": s12.id,
                "academic_year_id": test_academic_year.id,
                "amount": 10000,
                "payment_date": date.today().isoformat(),
                "payment_method": "upi",
                "allocations": [{"invoice_id": inv12.id, "amount": 10000}],
                "action": "post",
            },
            headers=admin_headers,
        )
        assert pay_res.status_code == 201, pay_res.text
        payment_id = pay_res.json()["payment_id"]

        app12 = await ConcessionWorkflowService.submit_application(
            db, test_institution.id, s12.id, sch.id, test_academic_year.id, admin_user, requested_amount=Decimal("2500.00")
        )
        await ConcessionWorkflowService.approve_application(db, app12.id, admin_user, auto_apply=True)
        alloc12 = (await db.execute(
            select(FeeConcessionAllocation).where(FeeConcessionAllocation.application_id == app12.id)
        )).scalar_one()
        assert alloc12.credit_adjustment_amount == Decimal("2500.00")

        # Accountant requests refund with idempotency key; duplicate call returns same refund_id
        ref_payload = {
            "amount": 2500,
            "refund_method": "bank_transfer",
            "reason": "Post-payment concession credit refund",
            "idempotency_key": f"IDEM-{uuid.uuid4().hex[:8]}",
        }
        r1 = await client.post(f"/api/v1/payments/{payment_id}/refunds", json=ref_payload, headers=acc_headers)
        r2 = await client.post(f"/api/v1/payments/{payment_id}/refunds", json=ref_payload, headers=acc_headers)
        assert r1.status_code == 200, r1.text
        assert r2.status_code == 200
        assert r1.json()["refund_id"] == r2.json()["refund_id"]
        refund_id = r1.json()["refund_id"]

        # Accountant cannot approve own refund (SoD 403), Admin approves and disburses
        r_sod = await client.post(f"/api/v1/payments/refunds/{refund_id}/approve", headers=acc_headers)
        assert r_sod.status_code == 403
        r_app = await client.post(f"/api/v1/payments/refunds/{refund_id}/approve", headers=admin_headers)
        assert r_app.status_code == 200
        r_proc = await client.post(f"/api/v1/payments/refunds/{refund_id}/process", headers=admin_headers)
        assert r_proc.status_code == 200

        # Scenario 13: Manual fee adjustment synced to invoice & tracked separately in governance summary
        s13, inv13, struct13, _ = await _make_student_and_invoice(db, test_institution.id, test_academic_year.id, Decimal("20000.00"))
        adj_res = await client.post(
            f"/api/v1/fees/students/{s13.id}/adjust-fees",
            json={
                "fee_structure_id": struct13.id,
                "custom_amount": 20000,
                "concession_amount": 1500,
                "reason": "Sibling fee adjustment without scheme",
            },
            headers=admin_headers,
        )
        assert adj_res.status_code == 200, adj_res.text
        await db.refresh(inv13)
        assert inv13.discount_amount == Decimal("1500.00")
        assert inv13.net_amount == Decimal("18500.00")

        gov_adj = await FinancialGovernanceService.get_governed_summary(
            db, FinancialFilter(institution_id=test_institution.id, student_id=s13.id, is_demo=False)
        )
        assert gov_adj["financials"]["manual_fee_adjustments"] == 1500.0
        assert gov_adj["financials"]["posted_concessions_total"] == 0.0

        rec = await FinancialGovernanceService.reconcile_financial_ledgers(
            db, FinancialFilter(institution_id=test_institution.id, is_demo=False)
        )
        assert rec["is_reconciled"] is True
        assert rec["ledger_audit"]["variance"] == 0.0

    @pytest.mark.asyncio
    async def test_scenarios_14_to_20_stacking_bulk_multiyear_overlimit_rbac_and_all_20_reports(
        self, client, db, admin_user, test_institution, test_academic_year
    ):
        """
        Covers Scenarios:
        14. Multiple stackable concessions vs non-stackable block vs cumulative ceiling guard.
        15. Multiple students in bulk + SoD restriction preventing non-admin auto_approve.
        16. Student across multiple academic years isolated cleanly by academic_year_id.
        17. Zero-payment 100% waived student reconciliation.
        18. Over-adjusted benefit allocation > remaining approved blocked.
        19. RBAC unauthorized actions (teacher blocked from approve/reverse/reports).
        20. All 20 concession reports, CSV & XLSX exports, transaction chain tracing, and Student/Portal ledger APIs.
        """
        admin_user.institution_id = test_institution.id
        await db.commit()
        admin_headers = await _login_headers(client, {"username": admin_user.username, "password": "testpassword"})

        teacher_user, teacher_creds = await _make_user_with_role(db, "teacher", test_institution.id)
        teacher_headers = await _login_headers(client, teacher_creds)
        acc_user, acc_creds = await _make_user_with_role(db, "accountant", test_institution.id)
        acc_headers = await _login_headers(client, acc_creds)

        # Scenario 14: Stackable + Exclusive + Over-gross ceiling
        s14, inv14, _, _ = await _make_student_and_invoice(db, test_institution.id, test_academic_year.id, Decimal("10000.00"))
        sch_s1 = await _make_scheme(db, test_institution.id, is_stackable=True, default_value=Decimal("4000.00"))
        sch_s2 = await _make_scheme(db, test_institution.id, is_stackable=True, default_value=Decimal("3000.00"))
        sch_excl = await _make_scheme(db, test_institution.id, is_stackable=False, default_value=Decimal("2000.00"))

        a1 = await ConcessionWorkflowService.submit_application(
            db, test_institution.id, s14.id, sch_s1.id, test_academic_year.id, admin_user, requested_amount=Decimal("4000.00")
        )
        await ConcessionWorkflowService.approve_application(db, a1.id, admin_user, auto_apply=True)

        # Combining a second stackable scheme within 10000 ceiling succeeds (4000 + 3000 = 7000)
        a2 = await ConcessionWorkflowService.submit_application(
            db, test_institution.id, s14.id, sch_s2.id, test_academic_year.id, admin_user, requested_amount=Decimal("3000.00")
        )
        await ConcessionWorkflowService.approve_application(db, a2.id, admin_user, auto_apply=True)
        await db.refresh(inv14)
        assert inv14.net_amount == Decimal("3000.00")

        # Non-stackable scheme must be blocked
        with pytest.raises(ValueError, match="exclusive"):
            await ConcessionWorkflowService.submit_application(
                db, test_institution.id, s14.id, sch_excl.id, test_academic_year.id, admin_user, requested_amount=Decimal("2000.00")
            )

        # Over-gross stackable attempt must be blocked (7000 + 5000 > 10000)
        sch_s3 = await _make_scheme(db, test_institution.id, is_stackable=True, default_value=Decimal("5000.00"))
        with pytest.raises(ValueError, match="exceed total fee obligation"):
            await ConcessionWorkflowService.submit_application(
                db, test_institution.id, s14.id, sch_s3.id, test_academic_year.id, admin_user, requested_amount=Decimal("5000.00")
            )

        # Scenario 15 & 19: Bulk apply + SoD / RBAC
        s15a, _, _, _ = await _make_student_and_invoice(db, test_institution.id, test_academic_year.id, Decimal("20000.00"))
        s15b, _, _, _ = await _make_student_and_invoice(db, test_institution.id, test_academic_year.id, Decimal("20000.00"))
        sch_bulk = await _make_scheme(db, test_institution.id, default_value=Decimal("2500.00"))

        # Accountant cannot bulk auto_approve (SoD guard -> 403)
        acc_bulk = await client.post(
            "/api/v1/fees/concessions/applications/bulk",
            json={"student_ids": [s15a.id, s15b.id], "concession_type_id": sch_bulk.id, "auto_approve": True},
            headers=acc_headers,
        )
        assert acc_bulk.status_code == 403

        # Admin can bulk auto_approve + auto_apply
        adm_bulk = await client.post(
            "/api/v1/fees/concessions/applications/bulk",
            json={"student_ids": [s15a.id, s15b.id], "concession_type_id": sch_bulk.id, "auto_approve": True, "auto_apply": True},
            headers=admin_headers,
        )
        assert adm_bulk.status_code == 201, adm_bulk.text
        assert adm_bulk.json()["successful_count"] == 2

        # Teacher RBAC check (Scenario 19): teacher can nominate but cannot approve/reverse/read reports
        nom_res = await client.post(
            "/api/v1/fees/concessions/applications",
            json={"student_id": s15a.id, "concession_type_id": sch_s1.id, "requested_amount": 1000},
            headers=teacher_headers,
        )
        assert nom_res.status_code == 201, nom_res.text
        t_app_id = nom_res.json()["id"]

        t_app_res = await client.post(f"/api/v1/fees/concessions/applications/{t_app_id}/approve", json={}, headers=teacher_headers)
        assert t_app_res.status_code == 403
        t_rev_res = await client.post(
            f"/api/v1/fees/concessions/applications/{t_app_id}/reverse", json={"reversal_reason": "Try"}, headers=teacher_headers
        )
        assert t_rev_res.status_code == 403
        t_rep_res = await client.get("/api/v1/reports/concessions/complete-concession-register", headers=teacher_headers)
        assert t_rep_res.status_code == 403

        # Scenario 18: Over-allocation blocked
        await ConcessionWorkflowService.approve_application(db, t_app_id, admin_user, approved_amount=Decimal("1000.00"), auto_apply=False)
        with pytest.raises(ValueError, match="between"):
            await ConcessionWorkflowService.apply_concession_to_invoice(
                db, t_app_id, admin_user, allocation_amount=Decimal("1500.00")
            )

        # Scenario 16: Multi-academic-year isolation
        ay2 = AcademicYear(
            institution_id=test_institution.id,
            name="2025-26",
            start_date=date(2025, 6, 1),
            end_date=date(2026, 3, 31),
            is_current=False,
            is_active=True,
        )
        db.add(ay2)
        await db.commit()
        await db.refresh(ay2)

        # Scenario 17: Student across ay2 with zero payment and 100% full waiver
        cat_ay2 = FeeCategory(institution_id=test_institution.id, name="Tuition-AY2")
        db.add(cat_ay2)
        await db.flush()
        fs_ay2 = FeeStructure(
            institution_id=test_institution.id, academic_year_id=ay2.id, category_id=cat_ay2.id,
            name="AY2 Annual", amount=Decimal("15000.00"), frequency="annual",
        )
        db.add(fs_ay2)
        await db.flush()
        asg_ay2 = StudentFeeAssignment(
            student_id=s14.id, fee_structure_id=fs_ay2.id, academic_year_id=ay2.id,
            custom_amount=Decimal("15000.00"), concession_amount=Decimal("0.00"),
        )
        db.add(asg_ay2)
        await db.flush()
        inv_ay2 = FeeInvoice(
            invoice_number="INV-AY2-001", student_id=s14.id, assignment_id=asg_ay2.id,
            academic_year_id=ay2.id, total_amount=Decimal("15000.00"), discount_amount=Decimal("0.00"),
            net_amount=Decimal("15000.00"), paid_amount=Decimal("0.00"), outstanding_amount=Decimal("15000.00"),
            issue_date=date(2025, 6, 1), due_date=date(2026, 3, 31), status="unpaid",
        )
        db.add(inv_ay2)
        await db.commit()

        sch_ay2_waiver = await _make_scheme(db, test_institution.id, category="fee_waiver", benefit_type="fee_waiver", calculation_type="full_waiver", default_value=Decimal("100.00"))
        a_ay2 = await ConcessionWorkflowService.submit_application(
            db, test_institution.id, s14.id, sch_ay2_waiver.id, ay2.id, admin_user
        )
        await ConcessionWorkflowService.approve_application(db, a_ay2.id, admin_user, auto_apply=True)

        # Confirm academic year separation
        sum_y1 = await FinancialGovernanceService.get_governed_summary(
            db, FinancialFilter(institution_id=test_institution.id, academic_year_id=test_academic_year.id, student_id=s14.id, is_demo=False)
        )
        sum_y2 = await FinancialGovernanceService.get_governed_summary(
            db, FinancialFilter(institution_id=test_institution.id, academic_year_id=ay2.id, student_id=s14.id, is_demo=False)
        )
        assert sum_y1["financials"]["posted_concessions_total"] == 7000.0
        assert sum_y2["financials"]["posted_concessions_total"] == 15000.0
        assert sum_y2["financials"]["total_outstanding"] == 0.0

        # Scenario 20: All 20 Phase 5 Reports + CSV + XLSX + Trace + Student Profile + Dashboard
        cat_res = await client.get("/api/v1/reports/concessions/catalog", headers=admin_headers)
        assert cat_res.status_code == 200
        assert len(cat_res.json()) == 20

        for rep_id in CONCESSION_REPORT_DEFINITIONS.keys():
            r_res = await client.get(f"/api/v1/reports/concessions/{rep_id}", headers=admin_headers)
            assert r_res.status_code == 200, f"Report {rep_id} failed: {r_res.text}"
            r_body = r_res.json()
            assert r_body["report_id"] == rep_id
            assert "rows" in r_body and "summary" in r_body and "columns" in r_body

        csv_res = await client.get("/api/v1/reports/concessions/complete-concession-register/export?format=csv", headers=admin_headers)
        assert csv_res.status_code == 200
        assert "application/csv" in csv_res.headers.get("content-type", "") or "text/csv" in csv_res.headers.get("content-type", "")

        xlsx_res = await client.get("/api/v1/reports/concessions/complete-concession-register/export?format=xlsx", headers=admin_headers)
        assert xlsx_res.status_code == 200
        assert len(xlsx_res.content) > 100

        trace_res = await client.get(f"/api/v1/fees/concessions/trace/student/{s14.id}", headers=admin_headers)
        assert trace_res.status_code == 200, trace_res.text
        trace_data = trace_res.json()
        assert len(trace_data["invoices"]) == 2
        assert len(trace_data["applications"]) >= 2

        prof_res = await client.get(f"/api/v1/students/{s14.id}/profile", headers=admin_headers)
        assert prof_res.status_code == 200, prof_res.text
        prof_data = prof_res.json()
        assert "fees" in prof_data
        assert prof_data["fees"]["summary"]["applied_concessions"] >= 7000.0
        assert "governance" in prof_data["fees"]

        dash_res = await client.get(f"/api/v1/dashboard/stats?institution_id={test_institution.id}", headers=admin_headers)
        assert dash_res.status_code == 200, dash_res.text
        assert "concession_governance" in dash_res.json()

        rec_final = await FinancialGovernanceService.reconcile_financial_ledgers(
            db, FinancialFilter(institution_id=test_institution.id, is_demo=False)
        )
        assert rec_final["is_reconciled"] is True
        assert rec_final["ledger_audit"]["variance"] == 0.0

    @pytest.mark.asyncio
    async def test_additional_phase10_pending_rejected_full_concession_and_multibranch(
        self, client, db, admin_user, test_institution, test_academic_year
    ):
        """
        Explicitly verifies remaining Phase 10 acceptance items & cross-dashboard consistency:
        - Pending approval & Rejected applications never alter FeeInvoice balances.
        - Full 100% fee concession remains classified under fee_concession (distinct from fee_waiver).
        - Multi-branch (multi-institution) isolation & reconciliation accuracy.
        - Identical totals across Dashboard Stats, Fees Overview, Concessions Analytics, Reconciliation, and Student Statement.
        """
        admin_user.institution_id = test_institution.id
        await db.commit()
        headers = await _login_headers(client, {"username": admin_user.username, "password": "testpassword"})

        # 1. Pending approval & Rejected applications must NOT reduce invoice
        s_pend, inv_pend, _, _ = await _make_student_and_invoice(db, test_institution.id, test_academic_year.id, Decimal("22000.00"))
        s_rej, inv_rej, _, _ = await _make_student_and_invoice(db, test_institution.id, test_academic_year.id, Decimal("22000.00"))
        sch_gen = await _make_scheme(db, test_institution.id, category="need_based", benefit_type="fee_concession", default_value=Decimal("4000.00"))

        app_pend = await ConcessionWorkflowService.submit_application(
            db, test_institution.id, s_pend.id, sch_gen.id, test_academic_year.id, admin_user, requested_amount=Decimal("4000.00")
        )
        assert app_pend.status == "pending_approval"
        await db.refresh(inv_pend)
        assert inv_pend.discount_amount == Decimal("0.00")
        assert inv_pend.outstanding_amount == Decimal("22000.00")

        app_rej = await ConcessionWorkflowService.submit_application(
            db, test_institution.id, s_rej.id, sch_gen.id, test_academic_year.id, admin_user, requested_amount=Decimal("4000.00")
        )
        rej_res = await client.post(
            f"/api/v1/fees/concessions/applications/{app_rej.id}/reject",
            json={"rejection_reason": "Income certificate verification failed"},
            headers=headers,
        )
        assert rej_res.status_code == 200, rej_res.text
        await db.refresh(inv_rej)
        await db.refresh(app_rej)
        assert app_rej.status == "rejected"
        assert inv_rej.outstanding_amount == Decimal("22000.00")

        rep_pend = await client.get("/api/v1/reports/concessions/pending-approval", headers=headers)
        assert rep_pend.status_code == 200
        assert any(r["application_number"] == app_pend.application_number for r in rep_pend.json()["rows"])

        # 2. Full 100% Fee Concession (distinct from fee_waiver classification)
        s_fullc, inv_fullc, _, _ = await _make_student_and_invoice(db, test_institution.id, test_academic_year.id, Decimal("14000.00"))
        sch_fullc = await _make_scheme(db, test_institution.id, category="staff_ward", benefit_type="fee_concession", calculation_type="percentage", default_value=Decimal("100.00"))
        app_fullc = await ConcessionWorkflowService.submit_application(
            db, test_institution.id, s_fullc.id, sch_fullc.id, test_academic_year.id, admin_user
        )
        await ConcessionWorkflowService.approve_application(db, app_fullc.id, admin_user, auto_apply=True)
        await db.refresh(inv_fullc)
        assert inv_fullc.net_amount == Decimal("0.00")
        assert inv_fullc.outstanding_amount == Decimal("0.00")

        sum_fullc = await FinancialGovernanceService.get_governed_summary(
            db, FinancialFilter(institution_id=test_institution.id, student_id=s_fullc.id, is_demo=False)
        )
        assert sum_fullc["financials"]["posted_fee_concessions"] == 14000.0
        assert sum_fullc["financials"]["posted_fee_waivers"] == 0.0

        # 3. Multiple Branches (Branch B isolated from Branch A)
        branch_b = Institution(name="Prashant Academy Branch B", code=f"BRB{uuid.uuid4().hex[:6]}", city="Pune")
        db.add(branch_b)
        await db.commit()
        await db.refresh(branch_b)
        ay_b = AcademicYear(
            institution_id=branch_b.id,
            name="2024-25",
            start_date=date(2024, 6, 1),
            end_date=date(2025, 3, 31),
            is_current=True,
            is_active=True,
        )
        db.add(ay_b)
        await db.commit()
        await db.refresh(ay_b)

        branch_b_admin, branch_b_creds = await _make_user_with_role(db, "superadmin", branch_b.id)
        branch_b_headers = await _login_headers(client, branch_b_creds)

        s_b, inv_b, _, _ = await _make_student_and_invoice(db, branch_b.id, ay_b.id, Decimal("30000.00"))
        sch_b = await _make_scheme(db, branch_b.id, category="merit", benefit_type="scholarship", default_value=Decimal("7500.00"))
        app_b = await ConcessionWorkflowService.submit_application(
            db, branch_b.id, s_b.id, sch_b.id, ay_b.id, branch_b_admin, requested_amount=Decimal("7500.00")
        )
        await ConcessionWorkflowService.approve_application(db, app_b.id, branch_b_admin, auto_apply=True)

        sum_a = await FinancialGovernanceService.get_governed_summary(
            db, FinancialFilter(institution_id=test_institution.id, is_demo=False)
        )
        sum_b = await FinancialGovernanceService.get_governed_summary(
            db, FinancialFilter(institution_id=branch_b.id, is_demo=False)
        )
        assert sum_b["financials"]["gross_fee_assessed"] == 30000.0
        assert sum_b["financials"]["scholarships_awarded"] == 7500.0
        assert sum_b["financials"]["net_fee_due"] == 22500.0
        assert sum_a["counts"]["rejected_applications"] >= 1
        assert sum_b["counts"]["rejected_applications"] == 0

        # 4. Cross-Module SSOT Numeric Parity across Dashboards, Fees Overview, Analytics, and Reconciliation for Branch B
        d_stats = (await client.get(f"/api/v1/dashboard/stats?institution_id={branch_b.id}", headers=branch_b_headers)).json()
        f_over = (await client.get(f"/api/v1/fees/overview?institution_id={branch_b.id}", headers=branch_b_headers)).json()
        c_gov = (await client.get(f"/api/v1/fees/concessions/governance-summary?institution_id={branch_b.id}", headers=branch_b_headers)).json()
        c_rec = (await client.get(f"/api/v1/fees/concessions/reconciliation?institution_id={branch_b.id}", headers=branch_b_headers)).json()

        assert d_stats["concession_governance"]["financials"]["net_fee_due"] == 22500.0
        assert f_over["governance"]["financials"]["net_fee_due"] == 22500.0
        assert c_gov["financials"]["net_fee_due"] == 22500.0
        assert c_rec["is_reconciled"] is True
        assert c_rec["ledger_audit"]["variance"] == 0.0
        assert c_rec["summary"]["scholarships_awarded"] == 7500.0
