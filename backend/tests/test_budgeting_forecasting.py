# /**
#  * @file        test_budgeting_forecasting.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      backend.tests
#  *
#  * @author      Jawahar R. Mallah
#  * @organization Smritisys & AITDL Networks
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 PrathamOne EduOS
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-27
#  * @updated     2026-11-28
#  *
#  * @description Integration and mathematical tests for Institutional Budgeting, Live Variance, Guardrails, and 3-Driver Cashflow Forecasting.
#  */

from datetime import date, timedelta
from decimal import Decimal
import uuid

import pytest
from starlette.requests import Request

from app.api.v1.endpoints.license import _is_evaluation_read_allowed
from app.core.security import get_password_hash
from app.models.academic_year import AcademicYear
from app.models.crm import Lead
from app.models.division import Division
from app.models.fee import (
    FeeCategory,
    FeeInvoice,
    FeeInvoiceInstallment,
    FeeStructure,
    StudentFeeAssignment,
)
from app.models.finance import CashRegister, DailyCashRegister, Expense, ExpenseCategory
from app.models.payment import Payment, Refund
from app.models.standard import Standard
from app.models.student import Student
from app.models.teacher_payroll import TeacherPaymentProfile, TeacherPayroll
from app.models.user import Role, User


@pytest.mark.asyncio
async def test_budget_lifecycle_immutability_and_revisions(
    client, db, auth_headers, test_institution, test_academic_year
):
    """Approved/locked plans refuse direct edits and spawn versioned Revised Estimates cleanly."""
    inst_id = test_institution.id
    db.add(ExpenseCategory(institution_id=inst_id, name="Marketing & Ads", code="MKT", is_active=True))
    db.add(FeeCategory(institution_id=inst_id, name="Tuition Fees", is_active=True))
    await db.commit()

    create_res = await client.post(
        "/api/v1/finance/budgets",
        headers=auth_headers,
        params={"institution_id": inst_id},
        json={
            "name": "FY Operating Plan",
            "fiscal_year_label": "FY 2026-27",
            "plan_type": "operating",
            "granularity": "quarterly",
            "start_date": "2026-04-01",
            "end_date": "2027-03-31",
            "enforcement_mode": "soft_warn",
            "seed_default_lines": True,
        },
    )
    assert create_res.status_code == 201
    plan_id = create_res.json()["id"]
    assert create_res.json()["version_number"] == 1

    var_res = await client.get(
        f"/api/v1/finance/budgets/{plan_id}/variance",
        headers=auth_headers,
        params={"institution_id": inst_id},
    )
    assert var_res.status_code == 200
    lines = var_res.json()["lines"]
    assert len(lines) >= 12  # 4 quarters * (fee + faculty + exp_cat + concession)

    first_outflow = next(ln for ln in lines if ln["source_domain"] == "expense_category")
    put_res = await client.put(
        f"/api/v1/finance/budgets/{plan_id}/lines",
        headers=auth_headers,
        params={"institution_id": inst_id},
        json={"lines": [{"id": first_outflow["id"], "planned_amount": 50000}]},
    )
    assert put_res.status_code == 200

    assert (await client.post(
        f"/api/v1/finance/budgets/{plan_id}/submit",
        headers=auth_headers,
        params={"institution_id": inst_id},
    )).status_code == 200

    assert (await client.post(
        f"/api/v1/finance/budgets/{plan_id}/approve",
        headers=auth_headers,
        params={"institution_id": inst_id},
    )).status_code == 200

    assert (await client.post(
        f"/api/v1/finance/budgets/{plan_id}/lock",
        headers=auth_headers,
        params={"institution_id": inst_id},
    )).status_code == 200

    # Direct edit after lock/approval must fail (Rule 011 immutability)
    blocked_put = await client.put(
        f"/api/v1/finance/budgets/{plan_id}/lines",
        headers=auth_headers,
        params={"institution_id": inst_id},
        json={"lines": [{"id": first_outflow["id"], "planned_amount": 90000}]},
    )
    assert blocked_put.status_code == 400

    # Spawning Revised Estimate (RE v2) succeeds and unlocks draft v2 while superseding v1
    rev_res = await client.post(
        f"/api/v1/finance/budgets/{plan_id}/revise",
        headers=auth_headers,
        params={"institution_id": inst_id},
        json={"notes": "Mid-year marketing adjustment"},
    )
    assert rev_res.status_code == 200
    assert rev_res.json()["version_number"] == 2
    assert rev_res.json()["status"] == "draft"


@pytest.mark.asyncio
async def test_budget_variance_zero_double_counting_and_env_isolation(
    client, db, auth_headers, test_institution, test_academic_year, admin_user
):
    """Variance accurately isolates PRODUCTION actuals from TRAINING demo rows and tracks pending expenses."""
    inst_id = test_institution.id
    today = date.today()
    p_start = today.replace(day=1)
    p_end = today

    exp_cat = ExpenseCategory(institution_id=inst_id, name="Utilities", code="UTL", is_active=True)
    fee_cat = FeeCategory(institution_id=inst_id, name="Course Fee", is_active=True)
    db.add_all([exp_cat, fee_cat])
    await db.flush()

    fs = FeeStructure(
        institution_id=inst_id,
        academic_year_id=test_academic_year.id,
        category_id=fee_cat.id,
        name="Standard Tuition",
        amount=Decimal("24000.00"),
    )
    db.add(fs)
    await db.flush()

    prod_stu = Student(
        institution_id=inst_id,
        admission_number=f"PROD-{uuid.uuid4().hex[:6]}",
        first_name="Aarav",
        last_name="Verma",
        date_of_birth=date(2009, 5, 1),
        gender="male",
        admission_date=today,
        is_demo=False,
        data_environment="PRODUCTION",
    )
    demo_stu = Student(
        institution_id=inst_id,
        admission_number=f"DEMO-{uuid.uuid4().hex[:6]}",
        first_name="Demo",
        last_name="Trainee",
        date_of_birth=date(2009, 6, 1),
        gender="female",
        admission_date=today,
        is_demo=True,
        data_environment="TRAINING",
    )
    db.add_all([prod_stu, demo_stu])
    await db.flush()

    db.add(StudentFeeAssignment(student_id=prod_stu.id, fee_structure_id=fs.id, academic_year_id=test_academic_year.id))
    db.add(Payment(student_id=prod_stu.id, academic_year_id=test_academic_year.id, amount=Decimal("15000.00"), payment_date=today, payment_method="UPI", status="posted", is_demo=False))
    db.add(Payment(student_id=demo_stu.id, academic_year_id=test_academic_year.id, amount=Decimal("99000.00"), payment_date=today, payment_method="UPI", status="posted", is_demo=True))

    db.add(Expense(
        institution_id=inst_id, category_id=exp_cat.id, expense_number=f"EXP-{uuid.uuid4().hex[:8]}",
        expense_date=today, title="Electricity Bill", amount=Decimal("4000.00"), payment_mode="UPI",
        paid_to_vendor="MSEDCL", status="paid", recorded_by_id=admin_user.id,
    ))
    db.add(Expense(
        institution_id=inst_id, category_id=exp_cat.id, expense_number=f"EXP-{uuid.uuid4().hex[:8]}",
        expense_date=today, title="Internet Pending", amount=Decimal("1500.00"), payment_mode="UPI",
        paid_to_vendor="FiberNet", status="submitted", recorded_by_id=admin_user.id,
    ))
    db.add(TeacherPayroll(
        institution_id=inst_id, teacher_user_id=admin_user.id, academic_year_id=test_academic_year.id,
        payroll_number=f"TP-{uuid.uuid4().hex[:8]}", month=today.month, year=today.year,
        start_date=p_start, end_date=p_start + timedelta(days=27), payment_method="monthly_fixed",
        net_payable=Decimal("20000.00"), status="approved",
    ))
    await db.commit()

    plan_res = await client.post(
        "/api/v1/finance/budgets",
        headers=auth_headers,
        params={"institution_id": inst_id},
        json={
            "name": "Monthly Variance Test",
            "fiscal_year_label": "FY 2026-27",
            "plan_type": "operating",
            "granularity": "monthly",
            "start_date": p_start.isoformat(),
            "end_date": (p_start + timedelta(days=27)).isoformat(),
            "seed_default_lines": False,
        },
    )
    plan_id = plan_res.json()["id"]

    await client.put(
        f"/api/v1/finance/budgets/{plan_id}/lines",
        headers=auth_headers,
        params={"institution_id": inst_id},
        json={
            "lines": [
                {
                    "period_start": p_start.isoformat(),
                    "period_end": (p_start + timedelta(days=27)).isoformat(),
                    "period_label": p_start.strftime("%b %Y"),
                    "line_direction": "inflow_target",
                    "source_domain": "fee_category",
                    "fee_category_id": fee_cat.id,
                    "line_label": "Course Fee",
                    "planned_amount": 10000,
                },
                {
                    "period_start": p_start.isoformat(),
                    "period_end": (p_start + timedelta(days=27)).isoformat(),
                    "period_label": p_start.strftime("%b %Y"),
                    "line_direction": "outflow_cap",
                    "source_domain": "expense_category",
                    "expense_category_id": exp_cat.id,
                    "line_label": "Utilities",
                    "planned_amount": 5000,
                },
                {
                    "period_start": p_start.isoformat(),
                    "period_end": (p_start + timedelta(days=27)).isoformat(),
                    "period_label": p_start.strftime("%b %Y"),
                    "line_direction": "outflow_cap",
                    "source_domain": "faculty_payroll",
                    "line_label": "Faculty Payroll",
                    "planned_amount": 25000,
                },
            ]
        },
    )

    var_res = await client.get(
        f"/api/v1/finance/budgets/{plan_id}/variance",
        headers={**auth_headers, "X-Data-Environment": "PRODUCTION"},
        params={"institution_id": inst_id},
    )
    assert var_res.status_code == 200
    body = var_res.json()
    # Demo payment 99000 must be excluded in PRODUCTION
    assert body["summary"]["revenue_actual"] == 15000.0
    assert body["summary"]["cost_actual"] == 24000.0  # 4000 paid utility + 20000 teacher payroll
    assert body["summary"]["cost_pending"] == 1500.0
    util_line = next(ln for ln in body["lines"] if ln["source_domain"] == "expense_category")
    assert util_line["actual_amount"] == 4000.0
    assert util_line["pending_amount"] == 1500.0
    assert util_line["variance_amount"] == 1000.0


@pytest.mark.asyncio
async def test_expense_budget_guardrail_soft_warn_and_hard_limit(
    client, db, auth_headers, test_institution
):
    """Hard-limit approved budgets reject overruns unless budget_override_reason is supplied."""
    inst_id = test_institution.id
    today = date.today()
    p_start = today.replace(day=1)
    p_end = today + timedelta(days=25)

    exp_cat = ExpenseCategory(institution_id=inst_id, name="Printables", code="PRT", is_active=True)
    db.add(exp_cat)
    await db.commit()

    plan_res = await client.post(
        "/api/v1/finance/budgets",
        headers=auth_headers,
        params={"institution_id": inst_id},
        json={
            "name": "Strict Cap Plan",
            "fiscal_year_label": "FY 2026-27",
            "start_date": p_start.isoformat(),
            "end_date": p_end.isoformat(),
            "enforcement_mode": "hard_limit",
            "seed_default_lines": False,
        },
    )
    plan_id = plan_res.json()["id"]
    await client.put(
        f"/api/v1/finance/budgets/{plan_id}/lines",
        headers=auth_headers,
        params={"institution_id": inst_id},
        json={
            "lines": [{
                "period_start": p_start.isoformat(),
                "period_end": p_end.isoformat(),
                "period_label": p_start.strftime("%b %Y"),
                "line_direction": "outflow_cap",
                "source_domain": "expense_category",
                "expense_category_id": exp_cat.id,
                "line_label": "Printables",
                "planned_amount": 3000,
            }]
        },
    )
    await client.post(
        f"/api/v1/finance/budgets/{plan_id}/approve",
        headers=auth_headers,
        params={"institution_id": inst_id},
    )

    blocked = await client.post(
        "/api/v1/finance/expenses",
        headers=auth_headers,
        params={"institution_id": inst_id},
        json={
            "category_id": exp_cat.id,
            "title": "Bulk Study Modules",
            "amount": 3500,
            "expense_date": today.isoformat(),
            "payment_mode": "UPI",
            "paid_to_vendor": "PrintHouse",
            "status": "approved",
        },
    )
    assert blocked.status_code == 400
    assert "Budget hard limit exceeded" in blocked.json()["detail"]

    overridden = await client.post(
        "/api/v1/finance/expenses",
        headers=auth_headers,
        params={"institution_id": inst_id},
        json={
            "category_id": exp_cat.id,
            "title": "Bulk Study Modules",
            "amount": 3500,
            "expense_date": today.isoformat(),
            "payment_mode": "UPI",
            "paid_to_vendor": "PrintHouse",
            "status": "approved",
            "budget_override_reason": "Director approved extra batch print run",
        },
    )
    assert overridden.status_code == 201
    assert overridden.json()["budget_alert"]["alert_level"] == "overrun"


@pytest.mark.asyncio
async def test_forecast_engine_three_driver_determinism_and_what_if(
    client, db, auth_headers, test_institution, test_academic_year, admin_user
):
    """3-driver forecast computes deterministic inflows, outflows, liquidity, and What-If overrides."""
    inst_id = test_institution.id
    today = date.today()
    next_month = (today.replace(day=1) + timedelta(days=32)).replace(day=15)

    reg = CashRegister(institution_id=inst_id, name="Drawer", code=f"CR-{uuid.uuid4().hex[:6]}", is_default=True)
    db.add(reg)
    await db.flush()
    db.add(DailyCashRegister(
        institution_id=inst_id, cash_register_id=reg.id, register_date=today,
        status="closed", opening_balance=Decimal("10000.00"), physical_closing_balance=Decimal("25000.00"),
    ))

    fee_cat = FeeCategory(institution_id=inst_id, name="Annual Coaching", is_active=True)
    exp_cat = ExpenseCategory(institution_id=inst_id, name="Facility Rent", code="RNT", is_active=True)
    std = Standard(institution_id=inst_id, name="Class 12 Science", level=12)
    db.add_all([fee_cat, exp_cat, std])
    await db.flush()

    div = Division(standard_id=std.id, name="Batch Alpha", capacity=50, is_active=True)
    fs = FeeStructure(
        institution_id=inst_id, academic_year_id=test_academic_year.id,
        standard_id=std.id, category_id=fee_cat.id, name="12th Package", amount=Decimal("40000.00"),
    )
    stu = Student(
        institution_id=inst_id,
        admission_number=f"FC-{uuid.uuid4().hex[:6]}",
        first_name="Riya",
        last_name="Patel",
        date_of_birth=date(2009, 4, 10),
        gender="female",
        admission_date=today,
    )
    db.add_all([div, fs, stu])
    await db.flush()

    assign = StudentFeeAssignment(student_id=stu.id, fee_structure_id=fs.id, academic_year_id=test_academic_year.id)
    db.add(assign)
    await db.flush()

    inv = FeeInvoice(
        invoice_number=f"INV-{uuid.uuid4().hex[:6]}", student_id=stu.id, assignment_id=assign.id,
        academic_year_id=test_academic_year.id, total_amount=Decimal("20000.00"),
        net_amount=Decimal("20000.00"), outstanding_amount=Decimal("20000.00"), issue_date=today,
    )
    db.add(inv)
    await db.flush()
    db.add(FeeInvoiceInstallment(
        invoice_id=inv.id, installment_number=1, description="Inst 1",
        amount=Decimal("20000.00"), outstanding_amount=Decimal("20000.00"), due_date=next_month, status="unpaid",
    ))

    db.add(Lead(
        institution_id=inst_id, lead_number=f"LD-{uuid.uuid4().hex[:6]}",
        first_name="Karan", last_name="Mehta", stage="interested", is_active=True, is_demo=False,
    ))
    db.add(TeacherPaymentProfile(
        institution_id=inst_id, teacher_user_id=admin_user.id, payment_method="monthly_fixed",
        monthly_fixed_amount=Decimal("15000.00"), is_active=True,
    ))
    db.add(Expense(
        institution_id=inst_id, category_id=exp_cat.id, expense_number=f"EXP-{uuid.uuid4().hex[:8]}",
        expense_date=today, title="Rent", amount=Decimal("9000.00"), payment_mode="BANK_TRANSFER",
        paid_to_vendor="Landlord", status="paid", is_recurring=True, recurring_frequency="monthly",
    ))
    await db.commit()

    sc_res = await client.post(
        "/api/v1/finance/forecasts/scenarios",
        headers=auth_headers,
        params={"institution_id": inst_id},
        json={
            "name": "6M Base Liquidity",
            "scenario_type": "baseline",
            "horizon_months": 6,
            "opening_bank_balance": 100000.0,
        },
    )
    assert sc_res.status_code == 201
    sc_id = sc_res.json()["id"]

    comp = await client.post(
        f"/api/v1/finance/forecasts/scenarios/{sc_id}/compute",
        headers=auth_headers,
        params={"institution_id": inst_id},
        json={"persist_snapshot": True},
    )
    assert comp.status_code == 200
    data = comp.json()
    assert data["summary"]["starting_cash_register"] == 25000.0
    assert data["summary"]["opening_bank_balance"] == 100000.0
    assert data["summary"]["starting_liquidity"] == 125000.0
    assert len(data["projections"]) == 6
    # Month 2 (next_month) reflects 90% of 20000 scheduled installment = 18000
    assert data["projections"][1]["projected_fee_collections"] == 18000.0
    for row in data["projections"]:
        assert row["confidence_low"] <= row["projected_ending_liquidity"] <= row["confidence_high"]

    sim = await client.post(
        "/api/v1/finance/forecasts/simulate",
        headers=auth_headers,
        params={"institution_id": inst_id},
        json={
            "horizon_months": 3,
            "opening_bank_balance": 50000.0,
            "overrides": {"extra_monthly_payroll": 10000.0},
        },
    )
    assert sim.status_code == 200
    assert sim.json()["projections"][0]["projected_faculty_payroll"] == 25000.0


@pytest.mark.asyncio
async def test_budget_rbac_and_evaluation_read_policy(client, db, test_institution):
    """Teachers cannot read/mutate budgets (403); Evaluation read-only policy permits overview & variance GETs."""
    teacher_role = (await db.execute(select_role := __import__("sqlalchemy").select(Role).where(Role.name == "teacher"))).scalar_one_or_none()
    t_user = User(
        username=f"t_{uuid.uuid4().hex[:6]}",
        email=f"t_{uuid.uuid4().hex[:6]}@test.com",
        hashed_password=get_password_hash("testpassword"),
        first_name="Teacher",
        last_name="Only",
        role="teacher",
        role_id=teacher_role.id if teacher_role else None,
        institution_id=test_institution.id,
    )
    db.add(t_user)
    await db.commit()

    login_res = await client.post(
        "/api/v1/auth/login",
        data={"username": t_user.username, "password": "testpassword"},
    )
    headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}
    res = await client.get(
        "/api/v1/finance/budgets/overview",
        headers=headers,
        params={"institution_id": test_institution.id},
    )
    assert res.status_code == 403

    req_var = Request({"type": "http", "method": "GET", "path": "/api/v1/finance/budgets/1/variance", "headers": []})
    req_list = Request({"type": "http", "method": "GET", "path": "/api/v1/finance/budgets", "headers": []})
    req_fc = Request({"type": "http", "method": "GET", "path": "/api/v1/finance/forecasts/overview", "headers": []})
    req_scen = Request({"type": "http", "method": "GET", "path": "/api/v1/finance/forecasts/scenarios", "headers": []})
    req_post = Request({"type": "http", "method": "POST", "path": "/api/v1/finance/budgets", "headers": []})
    policy = {"allow_reports": True, "allow_dashboard": True, "allow_read_only_records": True}
    assert _is_evaluation_read_allowed(req_var, policy) is True
    assert _is_evaluation_read_allowed(req_list, policy) is True
    assert _is_evaluation_read_allowed(req_fc, policy) is True
    assert _is_evaluation_read_allowed(req_scen, policy) is True
    assert _is_evaluation_read_allowed(req_post, policy) is False

    from app.api.v1.endpoints.license import _resolve_license_module
    assert _resolve_license_module("/api/v1/finance/budgets") == "reports"
    assert _resolve_license_module("/api/v1/finance/budgets/1/variance") == "reports"
    assert _resolve_license_module("/api/v1/finance/forecasts/scenarios") == "reports"
    assert _resolve_license_module("/api/v1/finance/expenses") == "accounting"


@pytest.mark.asyncio
async def test_principal_cannot_mutate_budget_lines_and_expense_lifecycle_guardrail_enforced(
    client, db, auth_headers, test_institution
):
    """Principal is blocked (403) from PUT /budgets/{id}/lines; draft->approve and PUT /expenses enforce hard_limit."""
    inst_id = test_institution.id
    today = date.today()
    p_start = today.replace(day=1)
    p_end = today + timedelta(days=25)

    exp_cat = ExpenseCategory(institution_id=inst_id, name="Lab Consumables", code="LABC", is_active=True)
    db.add(exp_cat)
    await db.flush()

    principal_role = (await db.execute(__import__("sqlalchemy").select(Role).where(Role.name == "principal"))).scalar_one_or_none()
    p_user = User(
        username=f"p_{uuid.uuid4().hex[:6]}",
        email=f"p_{uuid.uuid4().hex[:6]}@test.com",
        hashed_password=get_password_hash("testpassword"),
        first_name="Prin",
        last_name="User",
        role="principal",
        role_id=principal_role.id if principal_role else None,
        institution_id=inst_id,
    )
    db.add(p_user)
    await db.commit()

    login_p = await client.post("/api/v1/auth/login", data={"username": p_user.username, "password": "testpassword"})
    p_headers = {"Authorization": f"Bearer {login_p.json()['access_token']}"}

    plan_res = await client.post(
        "/api/v1/finance/budgets",
        headers=auth_headers,
        params={"institution_id": inst_id},
        json={
            "name": "Lifecycle Guardrail Plan",
            "fiscal_year_label": "FY 2026-27",
            "start_date": p_start.isoformat(),
            "end_date": p_end.isoformat(),
            "enforcement_mode": "hard_limit",
            "seed_default_lines": False,
        },
    )
    plan_id = plan_res.json()["id"]

    # Principal view-only role MUST receive 403 on line mutation
    p_put = await client.put(
        f"/api/v1/finance/budgets/{plan_id}/lines",
        headers=p_headers,
        params={"institution_id": inst_id},
        json={
            "lines": [{
                "period_start": p_start.isoformat(),
                "period_end": p_end.isoformat(),
                "line_direction": "outflow_cap",
                "source_domain": "expense_category",
                "expense_category_id": exp_cat.id,
                "line_label": "Lab Consumables",
                "planned_amount": 2000,
            }]
        },
    )
    assert p_put.status_code == 403

    await client.put(
        f"/api/v1/finance/budgets/{plan_id}/lines",
        headers=auth_headers,
        params={"institution_id": inst_id},
        json={
            "lines": [{
                "period_start": p_start.isoformat(),
                "period_end": p_end.isoformat(),
                "line_direction": "outflow_cap",
                "source_domain": "expense_category",
                "expense_category_id": exp_cat.id,
                "line_label": "Lab Consumables",
                "planned_amount": 2000,
            }]
        },
    )
    await client.post(f"/api/v1/finance/budgets/{plan_id}/approve", headers=auth_headers, params={"institution_id": inst_id})

    # Create draft (does not block draft creation), then attempt approve/update overrun without override -> blocked 400
    draft_res = await client.post(
        "/api/v1/finance/expenses",
        headers=auth_headers,
        params={"institution_id": inst_id},
        json={
            "category_id": exp_cat.id,
            "title": "Microscopes",
            "amount": 2500,
            "expense_date": today.isoformat(),
            "payment_mode": "UPI",
            "paid_to_vendor": "SciEquip",
            "status": "draft",
        },
    )
    assert draft_res.status_code == 201
    exp_id = draft_res.json()["id"]

    blk_approve = await client.post(f"/api/v1/finance/expenses/{exp_id}/approve", headers=auth_headers, params={"institution_id": inst_id})
    assert blk_approve.status_code == 400
    assert "Budget hard limit exceeded" in blk_approve.json()["detail"]

    blk_put = await client.put(
        f"/api/v1/finance/expenses/{exp_id}",
        headers=auth_headers,
        params={"institution_id": inst_id},
        json={"status": "submitted"},
    )
    assert blk_put.status_code == 400

    ok_approve = await client.post(
        f"/api/v1/finance/expenses/{exp_id}/approve",
        headers=auth_headers,
        params={"institution_id": inst_id},
        json={"budget_override_reason": "Urgent replacement"},
    )
    assert ok_approve.status_code == 200
    assert ok_approve.json()["budget_alert"]["alert_level"] == "overrun"


@pytest.mark.asyncio
async def test_variance_nets_refunds_on_seeded_category_and_forecast_deduplicates_recurring_rent(
    client, db, auth_headers, test_institution, test_academic_year, admin_user
):
    """Per-category fee variance nets completed Refunds; monthly recurring expenses are not divided by 3."""
    inst_id = test_institution.id
    today = date.today()
    p_start = today.replace(day=1)
    p_end = today + timedelta(days=25)

    fee_cat = FeeCategory(institution_id=inst_id, name="Tuition Core", is_active=True)
    exp_cat = ExpenseCategory(institution_id=inst_id, name="Center Lease", code="LSE", is_active=True)
    db.add_all([fee_cat, exp_cat])
    await db.flush()

    fs = FeeStructure(
        institution_id=inst_id, academic_year_id=test_academic_year.id,
        category_id=fee_cat.id, name="Annual Batch", amount=Decimal("20000.00"),
    )
    stu = Student(
        institution_id=inst_id, admission_number=f"RF-{uuid.uuid4().hex[:6]}",
        first_name="Meera", last_name="Nair", date_of_birth=date(2009, 8, 1), gender="female", admission_date=today,
    )
    db.add_all([fs, stu])
    await db.flush()

    assign = StudentFeeAssignment(student_id=stu.id, fee_structure_id=fs.id, academic_year_id=test_academic_year.id)
    db.add(assign)
    await db.flush()
    pay = Payment(
        student_id=stu.id, academic_year_id=test_academic_year.id,
        amount=Decimal("20000.00"), payment_date=today, payment_method="upi", status="posted", is_demo=False,
    )
    db.add(pay)
    await db.flush()
    db.add(Refund(
        institution_id=inst_id, student_id=stu.id, payment_id=pay.id,
        amount=Decimal("4000.00"), refund_date=today, refund_method="upi", status="completed",
    ))
    db.add(Expense(
        institution_id=inst_id, category_id=exp_cat.id, expense_number=f"EXP-{uuid.uuid4().hex[:8]}",
        expense_date=today, title="Monthly Rent", amount=Decimal("9000.00"), payment_mode="BANK_TRANSFER",
        paid_to_vendor="Owner", status="paid", is_recurring=True, recurring_frequency="monthly",
    ))
    await db.commit()

    plan_res = await client.post(
        "/api/v1/finance/budgets",
        headers=auth_headers,
        params={"institution_id": inst_id},
        json={
            "name": "Refund Netting Check",
            "fiscal_year_label": "FY 2026-27",
            "start_date": p_start.isoformat(),
            "end_date": p_end.isoformat(),
            "seed_default_lines": False,
        },
    )
    plan_id = plan_res.json()["id"]
    await client.put(
        f"/api/v1/finance/budgets/{plan_id}/lines",
        headers=auth_headers,
        params={"institution_id": inst_id},
        json={
            "lines": [{
                "period_start": p_start.isoformat(),
                "period_end": p_end.isoformat(),
                "line_direction": "inflow_target",
                "source_domain": "fee_category",
                "fee_category_id": fee_cat.id,
                "line_label": "Tuition Core",
                "planned_amount": 20000,
            }]
        },
    )
    v = await client.get(
        f"/api/v1/finance/budgets/{plan_id}/variance",
        headers={**auth_headers, "X-Data-Environment": "PRODUCTION"},
        params={"institution_id": inst_id},
    )
    assert v.status_code == 200
    assert v.json()["summary"]["revenue_actual"] == 16000.0

    fc = await client.get(
        "/api/v1/finance/forecasts/overview",
        headers=auth_headers,
        params={"institution_id": inst_id, "horizon_months": 3},
    )
    assert fc.status_code == 200
    assert fc.json()["projections"][0]["projected_recurring_opex"] == 9000.0
