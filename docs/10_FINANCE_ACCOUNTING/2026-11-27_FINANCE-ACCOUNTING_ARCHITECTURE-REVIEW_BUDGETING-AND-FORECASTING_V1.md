---
title: "Budgeting & Forecasting Module — Deep Architecture Research, SSOT Integration & Implementation Blueprint"
module: "10_FINANCE_ACCOUNTING"
category: "ARCHITECTURE-REVIEW"
document_type: "RESEARCH-REPORT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-27"
updated_date: "2026-11-27"
author: "Jawahar R Mallah"
organization: "Smritisys & AITDL Networks"
status: "Pending Review"
tags: ["budgeting", "forecasting", "cashflow", "variance-analysis", "ssot", "financial-planning", "fpa"]
entities: ["BudgetPlan", "BudgetLineItem", "ForecastScenario", "ForecastPeriodProjection", "FinancialPeriod", "Expense", "ExpenseCategory", "FeeInvoiceInstallment", "Payment", "Refund", "TeacherPayroll", "TeacherPaymentProfile", "DailyCashRegister"]
api_routes: ["/api/v1/finance/budgets/*", "/api/v1/finance/forecasts/*", "/api/v1/finance/variance/*"]
related_modules: ["06_TEACHER_PAYROLL", "09_FEES_PAYMENTS", "10_FINANCE_ACCOUNTING", "11_REPORTS_EXPORTS", "12_RBAC_SECURITY", "17_UI_UX_DESIGN"]
---

# Budgeting & Forecasting Module — Deep Architecture Research & SSOT Blueprint

**Product:** PrathamOne EduOS (`Coaching Institute Edition`)  
**Scope:** Pre-implementation architectural research, SSOT reuse audit, coaching-institute FP&A domain design, deterministic forecasting math, governance guardrails, and phased delivery plan.  
**Status:** Research & Design Proposal (no schema or code changes applied yet).

---

## 1. Executive Summary

Indian coaching institutes experience sharp seasonal cashflow asymmetry: large fee inflows cluster around April–July admissions and installment milestones, while faculty payroll, rent, utilities, and marketing outflows occur continuously across all 12 months.

Adding **Budgeting & Forecasting (FP&A)** directly on top of PrathamOne EduOS's existing ledgers transforms the platform from **backward-looking bookkeeping** into **forward-looking treasury and margin control**—without introducing a duplicate accounting engine (complying with Rules 001–011 and the Phase 3 Institutional Books boundaries).

### Key Research Findings
1. **80% of Required Actuals & Forward Signals Already Exist:** PrathamOne already captures installment due dates (`fee_invoice_installments`), realized cash/digital collections (`payments`, `refunds`), concession burn (`fee_concession_allocations`), categorized & recurring expenses (`expenses`, `expense_categories`), physical cash drawer closings (`daily_cash_registers`), scheduled teaching hours + faculty pay rates (`timetable_entries`, `teacher_payment_profiles`, `teacher_contract_milestones`), and admissions pipeline capacity (`leads`, `divisions.capacity`).
2. **Critical SSOT Gaps to Guard Against Before Building:**
   - **No General Bank Balance Ledger:** `daily_cash_registers` tracks physical drawer cash only; digital/bank liquidity must rely on an explicit verified **Opening Bank Balance assumption** rather than summing `payments`.
   - **Non-Teaching Staff Salary Double-Counting Risk:** `staff_profiles.basic_salary` exists on staff records, whereas actual salary payouts may currently be booked inside `expenses` (`expense_categories`), while teacher compensation sits in `teacher_payrolls`. Budget actuals mapping must cleanly separate Faculty Payroll (`teacher_payrolls`) vs. Admin Payroll (`expenses` salary category or future HR payroll) so salaries are never double-counted.
   - **Fiscal Year vs. Academic Year Alignment:** Indian statutory accounting runs April 1 – March 31, while coaching batches span academic sessions (`academic_years`). Budget calendars must anchor to `financial_periods` with configurable Fiscal vs. Academic alignment.
   - **Immutable Approved Baselines (Rule 011):** Once a Budget Estimate (BE) is approved/locked, adjustments must create versioned **Revised Estimates (RE / v2)** rather than mutating historical approved targets.

---

## 2. Codebase SSOT Audit: Existing Assets vs. Gaps

Before creating any new tables or services (Rule 002), every data stream for Budgeting & Forecasting maps to existing canonical tables:

### 2.1 Revenue, Collection & Concession Sources
| Forecasting / Budget Signal | Canonical Table(s) | Key Fields Reused | Source Status |
|---|---|---|---|
| **Contracted Future Fee Inflows** | `fee_invoice_installments` (`fee.py`) | `due_date`, `outstanding_amount`, `status`, `late_fee_applied` | Production Ready (indexed on `due_date`) |
| **Invoiced Demand & Realized Cash** | `fee_invoices` (`fee.py`), `payments`, `payment_allocations`, `refunds` (`payment.py`) | `net_amount`, `paid_amount`, `status`, `payment_method`, `payment_date` | Production Ready (exclude `cancelled` / `reversed`) |
| **Scholarship / Discount Budget Burn** | `fee_concession_applications`, `fee_concession_allocations` (`fee.py`) | Approved discount totals per `academic_year_id` & category | Production Ready |
| **Admissions & Batch Capacity Ceiling** | `leads`, `lead_follow_ups`, `lead_demo_classes` (`crm.py`), `divisions` (`division.py`), `fee_structures` | Qualified pipeline stages, `divisions.capacity`, current enrolled count | Production Ready |

### 2.2 Outflow, Cost & Payroll Sources
| Cost / Outflow Stream | Canonical Table(s) | Key Fields Reused | Source Status & Caveats |
|---|---|---|---|
| **Operating Expenses (OpEx)** | `expense_categories`, `expenses` (`finance.py`) | `category_id`, `amount`, `expense_date`, `status` (`approved`, `paid`), `is_recurring`, `recurring_frequency` (`monthly`, `quarterly`, `yearly`) | Production Ready (`FinanceService` in `finance_service.py`) |
| **Faculty Teaching Payroll** | `teacher_payment_profiles`, `teacher_contract_milestones`, `timetable_entries`, `teaching_sessions`, `teacher_payrolls`, `teacher_payment_vouchers` (`teacher_payroll.py`) | `payment_method` (`hourly`, `per_lecture`, `monthly_fixed`, `fixed_contract`, `mixed`), `hourly_rate`, `per_lecture_rate`, `monthly_fixed_amount`, milestone `due_date`, `debit_account` | Production Ready — enables deterministic timetable-driven payroll forecasting |
| **Admin / Non-Teaching Staff Pay** | `staff_profiles` (`staff.py`), `expenses` (`finance.py`) | `basic_salary`, `staff_type`, `status = 'active'` | **Partial / Caution:** No separate non-teaching payroll voucher table; payouts may be recorded in `expenses` |
| **Physical Cash Liquidity** | `cash_registers`, `daily_cash_registers`, `cash_transactions` (`finance.py`) | `physical_closing_balance`, `expected_closing_balance`, `register_date` | Production Ready (physical cash only; bank balance needs manual opening baseline) |
| **Calendar Boundaries** | `academic_years` (`academic_year.py`), `financial_periods` (`payment.py`) | `start_date`, `end_date`, `period_type`, `is_closed` | Production Ready |

### 2.3 Reusable Backend & Frontend Infrastructure
- **Backend Math & Telemetry:** `SafeMath` and institutional threshold patterns in `backend/app/services/report_intelligence_service.py` (Rule 006: all calculations remain server-side in `Decimal`/`Numeric(14,2)` precision).
- **Existing Finance Router & Service:** Extend `/api/v1/finance/*` (`backend/app/api/v1/endpoints/finance.py`) and `FinanceService` / a dedicated `BudgetForecastService` (`backend/app/services/`) rather than duplicating expense or fee queries.
- **License & RBAC Governance:** Extend route mapping in `backend/app/api/v1/endpoints/license.py` (`accounting` / `reports` / `premium_analytics` so read-only variance & forecasts can honor Evaluation `allow_reports` rules while mutations require active license + View-First Edit Mode).
- **Frontend UI Components:** Reuse `ExcelReportGrid`, existing Recharts (`vendor-charts`), CSV/XLSX export helpers, print footer/templates, and `FinanceExpenseWorkspace.tsx` / `Reports.tsx` navigation structure (Rule 008 & Rule 014).

---

## 3. Coaching-Institute Domain Design (Target Capabilities)

Generic ERP budgeting tools fail coaching institutes because they miss batch economics and installment timing. PrathamOne's module should address **five institute-specific pillars**:

### Pillar 1: Budget Planning & Versioned Baselines
- **Plan Types:**
  - `operating`: Revenue targets + Faculty Payroll + Staff Payroll + Rent/Marketing/Admin OpEx.
  - `cashflow`: Month-by-month cash inflows/outflows (ignoring non-cash accruals).
  - `capex`: Smartboards, lab equipment, branch expansion, furniture.
  - `batch_or_department`: Optional profitability budgets scoped by `standard_id`, `division_id`, or `department` (e.g., *JEE Wing*, *NEET Wing*, *Foundation 9th–10th*).
- **Zero-Duplicate Line Item Mapping (Rule 011):** Budget lines reference canonical masters (`expense_categories.id`, `fee_categories.id`, `standards.id`, `divisions.id`) instead of creating new parallel category names.
- **Draft -> Approval -> Lock Lifecycle (Rule 010 & 011):**
  - `draft` -> `submitted` -> `approved` -> `locked` -> `superseded`.
  - Editing an approved annual budget requires creating **Version N+1 (Revised Estimate)** linked via `parent_plan_id`, preserving the original baseline (**Budget Estimate v1**) for year-end audit comparisons.

### Pillar 2: Automated Budget-vs-Actuals & Variance Engine
Live server-side variance computed dynamically from authoritative subledgers (never mutating `payments` or `expenses`):
$$\text{Variance (OpEx)} = \text{Budgeted Amount} - \text{Actual Approved/Paid Spend}$$
$$\text{Variance (Revenue)} = \text{Actual Net Collections} - \text{Budgeted Target}$$
$$\text{Utilization \%} = \frac{\text{Actual}}{\text{Budgeted}} \times 100 \quad (\text{SafeMath zero-denominator guard})$$
- **Favorable vs. Unfavorable Semantics:** Revenue above budget = **Favorable (Emerald)**; Expense above budget = **Unfavorable (Rose/Amber)**.
- **Commitment-Aware Burn (Optional Toggle):** Separately show `Paid/Approved` vs. `Submitted/Pending Approval` so pending expense bills aren't invisible until after budget overrun.

### Pillar 3: Soft Guardrails During Expense & Payroll Workflows
- When creating/approving an `Expense` in `FinanceService` or approving a `TeacherPayroll` batch:
  - Compare `MTD/Period Category Spend + New Amount` against active approved `budget_line_items.planned_amount`.
  - **85%+ Threshold:** Amber warning banner (*"Marketing OpEx reaches 92% of Nov budget"*).
  - **100%+ Threshold:** Configurable per institution: **Soft Warn (require override note)** vs. **Hard Block (require Director/SuperAdmin approval)**—never silently failing or blocking emergency payouts unless Director policy enables hard limits.

### Pillar 4: Deterministic 3-Driver Cashflow & Margin Forecasting
Rather than naive linear trendlines, compute rolling **3-month, 6-month, and 12-month** projections from live operational signals:

1. **Inflow Forecast (Collections + Admissions):**
   - **Scheduled Installments (`fee_invoice_installments`):** Group unpaid installments by `due_date` month, weighted by historical realization & aging bucket (`upcoming = Net Fee Realization Rate`, `1–30d overdue = ~75%`, `31–60d = ~50%`, `60d+ = ~20%`—all tunable in scenario assumptions).
   - **CRM Admissions Pipeline (`leads`):** Qualified open leads × stage conversion rate (or trailing `Lead-to-Admission Conversion Rate`), capped by remaining `divisions.capacity - active_enrollments` × average batch `fee_structures` fee!
   - **Refund & Concession Drag:** Subtract historical refund rate + approved `fee_concession_applications` impact.
2. **Outflow Forecast (Faculty + Staff + Recurring + Variable OpEx):**
   - **Deterministic Faculty Cost:** Sum `monthly_fixed_amount` (active `teacher_payment_profiles`) + upcoming scheduled `timetable_entries` sessions × `hourly_rate` / `per_lecture_rate` + upcoming `teacher_contract_milestones.due_date`.
   - **Recurring OpEx:** Extrapolate `expenses` flagged `is_recurring = True` according to `recurring_frequency` (`monthly`, `quarterly`, `yearly`)—e.g., Rent, Internet, Security, Software AMC.
   - **Variable OpEx Baseline:** Trailing 3–6 month average for non-recurring categories (Printing, Electricity, Events) adjusted by optional inflation/seasonality multiplier.
3. **Liquidity & Runway Projection:**
   - `Starting Liquidity = Latest verified daily_cash_registers.physical_closing_balance + scenario.opening_bank_balance`.
   - Month-by-month cumulative cash curve highlights **Cash Trough Months** (e.g., Feb–Mar pre-admission lean months) and **Months of Runway**.

### Pillar 5: Scenario Modeling & "What-If" Simulator
Allow management to clone a baseline forecast into non-destructive scenarios (`Baseline`, `Conservative`, `Optimistic`, `Expansion Stress Test`) to answer real executive questions:
- *"What happens to net margin & Aug cash balance if we give an extra 5% merit concession?"*
- *"Can we afford 2 senior faculty hires at ₹85,000/month before the new JEE batch reaches 65% occupancy?"*
- *"If installment realization drops from 88% to 72%, which month turns cash-negative?"*

---

## 4. Proposed Data Model (Strict Rule 004 Classification)

All entities strictly inherit `institution_id`, `data_environment` scoping (where applicable), `created_by_id`, `created_at`, `updated_at`, and `Numeric(14, 2)` precision:

| Table | Rule 004 Class | Purpose & Key Columns |
|---|---|---|
| `budget_plans` | **Master / Plan** | `id`, `institution_id`, `branch_id`, `academic_year_id`, `fiscal_year_label` (e.g. `FY 2026-27`), `name`, `plan_type` (`operating \| cashflow \| capex`), `granularity` (`monthly \| quarterly \| annual`), `version_number`, `parent_plan_id` (self-FK for RE revisions), `status` (`draft \| submitted \| approved \| locked \| superseded`), `enforcement_mode` (`advisory \| soft_warn \| hard_limit`), `approved_by_id`, `approved_at`, `locked_at` |
| `budget_line_items` | **Configuration / Relationship** | `id`, `budget_plan_id` (FK), `financial_period_id` (nullable FK -> `financial_periods.id`), `period_start`, `period_end`, `line_direction` (`inflow_target \| outflow_cap`), `source_domain` (`fee_category \| expense_category \| faculty_payroll \| staff_payroll \| concession \| custom`), `expense_category_id` (nullable FK), `fee_category_id` (nullable FK), `standard_id` (nullable FK), `division_id` (nullable FK), `planned_amount` (`Numeric(14,2)`), `warning_threshold_pct` (`Numeric(5,2)`, default `85.00`), `notes` |
| `forecast_scenarios` | **Configuration / Plan** | `id`, `institution_id`, `academic_year_id`, `name`, `scenario_type` (`baseline \| conservative \| optimistic \| what_if`), `horizon_months` (3/6/12), `opening_cash_override` (`Numeric(14,2)` nullable), `opening_bank_balance` (`Numeric(14,2)` default `0`), `assumptions_json` (JSONB: realization weights, aging haircuts, lead conversion %, attrition %, inflation %), `linked_budget_plan_id` (nullable FK), `is_default` |
| `forecast_period_projections` | **Snapshot** | Immutable generated output snapshot per run: `id`, `scenario_id` (FK), `run_batch_id` (UUID), `period_start`, `period_end`, `period_label`, `projected_fee_collections`, `projected_pipeline_admissions`, `projected_concessions`, `projected_refunds`, `projected_faculty_payroll`, `projected_staff_payroll`, `projected_recurring_opex`, `projected_variable_opex`, `projected_net_cashflow`, `projected_ending_liquidity`, `confidence_low`, `confidence_high`, `provenance_summary_json`, `computed_at` |

### Key Anti-Duplication & Integrity Constraints
1. **No Duplicate Categories:** Do NOT create a separate `budget_categories` master; map `outflow_cap` rows directly to `expense_categories.id` and `inflow_target` rows to `fee_categories.id` (with `source_domain` enum for faculty/staff payroll & concessions).
2. **Unique Line Scope Constraint:** Prevent accidental duplicate rows for the same `(budget_plan_id, period_start, source_domain, expense_category_id, fee_category_id, division_id)` using a normalized uniqueness constraint / service guard.
3. **Zero Client Persistence Math (Rule 006):** Variance totals, runway, and scenario projections are computed solely by `BudgetForecastService` on the backend.

---

## 5. API & Security Architecture

### 5.1 Proposed API Surface (Extending `/api/v1/finance/` per Rule 007)
- `GET /api/v1/finance/budgets` & `POST /api/v1/finance/budgets` — List/create budget plans (`View Mode` vs `Edit Mode`).
- `GET /api/v1/finance/budgets/{id}` & `PUT /api/v1/finance/budgets/{id}/lines` — Fetch/upsert period allocations (`draft` only).
- `POST /api/v1/finance/budgets/{id}/submit|approve|lock|revise` — Workflow transitions & versioned `Revised Estimate (RE)` cloning.
- `GET /api/v1/finance/budgets/{id}/variance` — Live period-by-period Budget vs. Actuals matrix with drill-down links to source `expenses`, `payments`, and `teacher_payrolls`.
- `GET/POST /api/v1/finance/forecasts/scenarios` & `POST /api/v1/finance/forecasts/scenarios/{id}/compute` — Compute & snapshot multi-month cashflow + what-if curves.
- `GET /api/v1/finance/forecasts/overview` — Single lightweight KPI summary powering the dashboard/workspace ribbon (`<300ms` latency target).

### 5.2 RBAC, CodeX & License Integration
- **Role Matrix:**
  - **SuperAdmin / Director / Accountant:** Full create/edit/approve/lock/scenario-simulate access.
  - **Principal / Academic Director:** View-only budget & batch margin + submit departmental OpEx budget requests; individual teacher salary rows masked or aggregated when **CodeX Financial Masking** is active.
  - **Teacher / Receptionist / Counselor:** Zero access to institutional budgets, margins, or cash runway (`403 Forbidden`).
- **License Guard ([license.py](file:///F:/PrashantAcademy/backend/app/api/v1/endpoints/license.py)):**
  - Read-only `GET /api/v1/finance/budgets/*/variance` and `GET /api/v1/finance/forecasts/*` should map to `reports` / `allow_reports` so users can audit numbers even in Evaluation mode, while `POST`/`PUT`/`lock` mutations require active `accounting` entitlement.

---

## 6. Sleek UI/UX Layout (Rule 014 Compliance)

To avoid vertical header bloat (`<= 120px` combined header + command deck) and keep navigation intuitive:
1. **Navigation Placement:** Add a dedicated sub-module tab group under Finance (or extend `Finance & Accounting` module alongside `Daily Expenses & Cash` -> `Budgets & Targets`, `Cashflow Forecast`, `Variance Matrix`).
2. **Single-Surface KPI Ribbon (44px):** `Annual Revenue Target`, `YTD Realized %`, `OpEx Budget Utilization %`, `Projected 90-Day Net Cash`, `Cash Runway (Months)`.
3. **Interactive Budget Allocation & Variance Grid:** Reuse `ExcelReportGrid` with 12 monthly columns (`Apr..Mar`), inline Edit Mode entry (Rule 010), "Copy Across All Months" / "Apply +5% Growth" helpers, and color-coded variance pills.
4. **Forecast Fan Chart & What-If Drawer:** Recharts area/line visualization showing `Projected Inflows vs. Outflows` + `Baseline vs. Conservative/Optimistic` liquidity band, plus interactive sliders that recalculate projections server-side without overwriting saved baseline plans.

---

## 7. Phased Delivery Roadmap

| Phase | Scope | Exit Evidence |
|---|---|---|
| **Phase 1: Core Budgeting & Variance** | `budget_plans` + `budget_line_items` migration, `BudgetForecastService` actuals rollup (`payments`, `expenses`, `teacher_payrolls`, `fee_concession_allocations`), Apr–Mar grid UI, View-First Edit Mode, CSV/XLSX export. | Multi-tenant tests, zero double-counting of payroll vs. expenses, `verify_market_readiness.py` green. |
| **Phase 2: Deterministic Cashflow & Scenario Forecast** | `forecast_scenarios` + `forecast_period_projections`, 3-driver inflow/outflow math (`fee_invoice_installments`, `leads` + `divisions.capacity`, `timetable_entries` × `teacher_payment_profiles`, `expenses.is_recurring`), What-If simulator UI. | Snapshot accuracy tests on installment aging + recurring OpEx + payroll schedule math. |
| **Phase 3: Budget Guardrails & Batch P&L** | Optional 85%/100% alert/override hooks in `FinanceService.create_expense()` & `TeacherPayroll`, plus Batch/Standard contribution margin (`division_id` / `standard_id` fee revenue vs. direct faculty cost). | Threshold enforcement tests + role-scoped CodeX masking audit. |

---

## 8. Owner Decisions Required Before Phase 1 Coding

1. **Primary Budget Calendar:** Should budgets run strictly on the **Indian Financial Year (`Apr 1 – Mar 31`)**, strictly on **`academic_years`**, or let the institute choose per plan?
2. **Admin Staff Salaries Reconciliation:** Today, `staff_profiles.basic_salary` exists on staff profiles, while salary payouts may be entered as `expenses`. Should Phase 1 map non-teaching staff actuals purely from a designated `ExpenseCategory` (e.g., `SAL`) until a dedicated Staff Payroll module is added?
3. **Expense Guardrail Behavior:** When an expense pushes a category over 100% of its monthly budget, do you want **Warning Only**, **Soft Override (mandatory reason)**, or **Hard Block requiring Director approval**?
4. **Opening Bank Balance:** Since PrathamOne currently tracks physical drawer cash (`daily_cash_registers`) without an institutional Bank Book, is an optional manual **"Opening Bank Balance"** field inside Forecasting sufficient for Phase 1–2?
5. **Multi-Branch Scope:** Should Phase 1 budgets aggregate per `institution_id` (with optional `branch_id`), or also roll up across multiple `institutions`?
