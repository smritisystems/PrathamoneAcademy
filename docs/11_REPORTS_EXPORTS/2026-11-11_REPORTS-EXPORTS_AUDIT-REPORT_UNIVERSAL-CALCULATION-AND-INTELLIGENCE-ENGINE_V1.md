---
title: "Universal Report Calculation & Intelligence Engine — Comprehensive Audit & Gap Analysis"
module: "11_REPORTS_EXPORTS"
category: "AUDIT-REPORT"
document_type: "REPORT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-11"
updated_date: "2026-11-11"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["reports", "calculations", "kpi", "intelligence", "formulas", "audit", "decision-support"]
entities: ["ReportCalculationDefinition", "ReportMetric", "ReportInsight", "Student", "FeeInvoice", "Payment", "Attendance", "HomeworkAssignment", "Examination", "TeacherMonthlyPayroll", "Lead"]
api_routes: ["/api/v1/reports/*", "/api/v1/reports/intelligence/*", "/api/v1/homework/reports/*", "/api/v1/teacher-payroll/reports/*", "/api/v1/examinations/*"]
related_modules: ["03_ACADEMIC_MANAGEMENT", "04_STUDENT_MANAGEMENT", "05_TEACHER_MANAGEMENT", "06_TEACHER_PAYROLL", "07_ATTENDANCE", "08_EXAMINATION", "09_FEES_PAYMENTS", "10_FINANCE_ACCOUNTING", "12_RBAC_SECURITY"]
---

# PRATHAMONE EduOS — UNIVERSAL REPORT CALCULATION & INTELLIGENCE ENGINE
## Comprehensive System-Wide Audit & Gap Analysis Report (v1.0.0)

**Product:** PrathamOne EduOS  
**Edition:** Coaching Institute Edition  
**Baseline Version:** 1.0.0  
**Product Architect:** Jawahar R Mallah  
**Organization:** AITDL — AI Technology & Development Lab  
**Policy Status:** MANDATORY COMPLIANCE — SSOT & EXPLAINABLE CALCULATION GOVERNANCE  

---

## 1. EXECUTIVE SUMMARY & STRATEGIC MANDATE

### 1.1 The Operational Problem
Traditional management information systems produce static rows and columns of raw numbers. In educational coaching institutions, administrators, principals, and academic coordinators frequently encounter reports with summary figures that lack:
1. **Mathematical Provenance**: No visible explanation of how a percentage or total was computed.
2. **Contextual Denominators**: Confusion between gross students, active enrollments, and eligible attendees.
3. **Comparative Baselines**: Numbers presented without prior-month, prior-year, or institutional target comparisons.
4. **Actionable Insights**: No deterministic guidance explaining *why* the number matters or *what specific operational action* must be taken to resolve deficiencies.
5. **Traceability**: Inability to click a summary figure and drill down to the exact underlying records.

### 1.2 Core Governance Principle
> **"Every important report must explain: WHAT happened, HOW MUCH, HOW IT WAS CALCULATED, COMPARED TO WHAT, WHY IT MATTERS, AND WHAT ACTION IS REQUIRED."**

This is not a cosmetic dashboard add-on, but an institution-wide computational intelligence engine powering every report across all 20 functional domains.

---

## 2. COMPLETE REPORT INVENTORY ACROSS ALL APPLICATION DOMAINS

We have conducted a full-stack forensic inventory of all 26 existing reports, registers, and analytical views across the system:

| # | Domain / Module | Report Name | Existing Data Source | Current Calculations | Identified Gaps & Missing Calculations | Required Intelligence Upgrade |
|---|---|---|---|---|---|---|
| **1** | **Students & Admissions** | Student Master Directory | `students`, `enrollments` | Row count | Missing gender ratio, category breakdown, active enrollment % | Add demographic distribution, active vs inactive ratio, guardian contact audit |
| **2** | **Attendance** | Student Attendance Summary & Defaulters | `attendances` | Total, present, absent days | Missing eligible student-days, chronic defaulter rate (<75%), attendance trend | Explain formula (Present/Eligible*100), alert on chronic defaulters, deep-link to parent SMS |
| **3** | **Students** | Student Withdrawals & Exit Ledger | `student_exits`, `refunds` | Retained vs refunded fees | Missing institutional retention %, attrition velocity by standard | Explain attrition formula, cohort comparison, alert if attrition > 10% |
| **4** | **Students** | Student Attrition Analytics | `student_exits` | Monthly exit count | Missing reason distribution %, cohort survival rate | Add exit reason Pareto analysis, comparison with previous academic year |
| **5** | **Academics** | Batch Capacity & Occupancy Analysis | `divisions`, `enrollments` | Capacity, enrolled count | Missing occupancy %, seat utilization variance | Explain formula (Enrolled/Capacity*100), flag under-utilized batches (<50%) and over-capacity (>100%) |
| **6** | **Academics** | Board & Standard Distribution | `standards`, `boards` | Student counts | Missing board share %, standard intake growth | Add standard progression rate, intake comparison |
| **7** | **Academics** | Subject & Curriculum Matrix | `canonical_subjects`, `divisions` | Subject count | Missing weekly instructional hours, faculty allocation ratio | Calculate instructional workload per subject, flag unassigned subjects |
| **8** | **Academics** | Timetable Room Utilization | `timetable_slots`, `divisions` | Weekly slot count | Missing room occupancy rate %, prime-time utilization | Compute room efficiency % (Booked Slots / Total Operating Slots * 100) |
| **9** | **Fees & Payments** | Fee Collection Register | `fee_invoices`, `payments` | Total invoiced, paid, balance | Missing realization rate %, concession impact % | Explain Net Receivables vs Gross, Realization % formula, payment collection trend |
| **10** | **Fees & Payments** | Outstanding Dues & Aging | `fee_invoices` | Outstanding balance | Missing overdue aging buckets (0-30, 31-60, 60+ days), recovery velocity | Explain aging formula, alert on high-risk receivables, action to dispatch fee notices |
| **11** | **Fees & Payments** | Consolidated Fee Defaulters | `fee_invoices`, `students` | Overdue sum | Missing defaulter percentage of student body, chronic non-payment flags | Compute defaulter ratio, compare with institute collection target (default 85%) |
| **12** | **Fees & Payments** | Daily Payment Cashier Ledger | `payments` | Daily collection total | Missing mode distribution %, cashier reconciliation | Compute cash vs digital ratio, cashier deposit reconciliation |
| **13** | **Fees & Payments** | Payment Gateways & Volume | `payments` | Method count, volume | Missing gateway fee impact, digital adoption % | Show digital payment share % (UPI+Card+NetBanking vs Cash) |
| **14** | **Finance** | Financial Reconciliation Ledger | `fee_invoices`, `payments`, `refunds` | Invoiced vs Collected | Missing variance between ledger debits and credits | True ledger reconciliation balancing debits, credits, and unallocated refunds |
| **15** | **Workforce** | Faculty Teaching Load Audit | `teaching_sessions`, `users` | Weekly session count | Missing planned vs actual teaching hours, student load ratio | Explain teaching load formula, flag overloaded (>30 hrs/wk) or underloaded faculty |
| **16** | **Workforce** | Monthly Teacher Payroll Register | `teacher_payroll_monthly` | Gross, deductions, net | Missing hourly compensation rate, bonus variance % | Reconcile lecture bonuses vs base salary, link to payment voucher status |
| **17** | **Workforce** | Teaching Hours Delivery Report | `teaching_sessions` | Total conducted hours | Missing planned vs conducted delivery %, syllabus completion pace | Explain session delivery % (Conducted / Scheduled * 100) |
| **18** | **Workforce** | Batch-wise Teaching Cost | `teaching_sessions`, `payroll` | Cost per batch | Missing cost per student, batch contribution margin | Compute instructional cost per enrolled student (Batch Cost / Enrolled Students) |
| **19** | **Workforce** | Subject-wise Teaching Cost | `teaching_sessions`, `payroll` | Cost per subject | Missing departmental budget variance | Instructional cost distribution across subjects |
| **20** | **Workforce** | Disbursement Voucher Register | `teacher_payroll_monthly` | Voucher amount | Missing payment execution latency (days from approval to payout) | Audited payout timeline and banking reference tracking |
| **21** | **Workforce** | Annual Payroll Cost Summary | `teacher_payroll_monthly` | Monthly expenditure | Missing month-over-month growth %, annual budget variance | Year-over-year payroll comparison, seasonal coaching cost fluctuations |
| **22** | **Examinations** | Consolidated Marks & Merit Roster | `exam_marks`, `examinations` | Total marks, rank | Missing weighted percentage, subject pass/fail count | Explain weighted mark calculation (Sum(marks) / Sum(max_marks) * 100), grade distribution |
| **23** | **Examinations** | Exam Analytics & Pass Distribution | `exam_marks`, `examinations` | Average score, pass count | Missing median score, standard deviation, question-level difficulty | Pass % formula, comparison against previous term assessment |
| **24** | **System & Audit** | Security & Access Audit Trail | `audit_logs` | Event count | Missing failed login spike detection, privileged action frequency | Severity breakdown, security risk indicator |
| **25** | **Homework** | Daily Homework Checking Register | `homework_assignments`, `student_homework_records` | Assigned, done count | Missing batch completion rate %, late submission rate % | Explain completion % (Done / Total Eligible * 100), alert on low submission rates |
| **26** | **Admissions & CRM** | Enquiry Conversion & Pipeline | `leads` | Lead count by status | Missing enquiry-to-admission conversion rate %, source ROI | Conversion % formula (Admissions / Qualified Leads * 100), source conversion analysis |

---

## 3. UNIVERSAL CALCULATION ENGINE FORMULARY SPECIFICATIONS

To avoid duplicated and divergent hardcoded logic across components, all calculations are standardized under the Universal Calculation Engine:

### 3.1 Attendance Calculation Standards
$$\text{Attendance Rate (\%)} = \frac{\text{Present Student-Days}}{\text{Total Eligible Student-Days}} \times 100$$
- **Eligible Student-Days Numerator**: Roll call records marked as `present` or `late`.
- **Eligible Student-Days Denominator**: All scheduled institute working days for the enrolled student cohort, excluding institutional holidays and approved medical/administrative exemptions (`status != 'excused'`).
- **Defaulter Condition**: Any student where $\text{Attendance Rate} < 75.0\%$ (configurable via `InstitutionSetting`).

### 3.2 Homework & Assignment Completion Standards
$$\text{Homework Completion Rate (\%)} = \frac{\text{Completed Eligible Student Assignments}}{\text{Total Eligible Student Assignments}} \times 100$$
- **Numerator**: Verified checking records marked as `completed` or `checked` with status `done`.
- **Denominator**: Total active students assigned the homework, excluding approved student exemptions (`is_exempted = True`).
- **Late Rate (\%)} = \frac{\text{Late Submissions}}{\text{Total Submissions}} \times 100$$.

### 3.3 Fee Collection & Realization Standards
$$\text{Fee Realization Rate (\%)} = \frac{\text{Realized Bank Collections}}{\text{Net Invoiced Receivables}} \times 100$$
- **Net Invoiced Receivables**: $\text{Gross Fees} - \text{Approved Concessions/Discounts} - \text{Approved Waivers}$.
- **Realized Collections**: Settled payment records in status `posted` or `approved`, minus processed `refunds`.
- **Outstanding Deficit**: $\text{Net Invoiced} - \text{Realized Collections}$.
- **Deficit Rate (\%)} = \frac{\text{Outstanding Deficit}}{\text{Net Invoiced Receivables}} \times 100$$.

### 3.4 Examination Weighted Performance Standards
$$\text{Weighted Student Percentage (\%)} = \frac{\sum \text{Marks Obtained across all subjects}}{\sum \text{Maximum Applicable Marks across all subjects}} \times 100$$
- **Pass Rate (\%)} = \frac{\text{Students Scoring } \ge \text{Passing Threshold in all required subjects}}{\text{Total Appeared Students}} \times 100$$.
- Absent and exempted papers are excluded from the pass/fail denominator but tracked in absentee rates.

### 3.5 Teaching Delivery & Syllabus Coverage Standards
$$\text{Teaching Delivery Rate (\%)} = \frac{\text{Conducted Instructional Hours}}{\text{Scheduled Instructional Hours}} \times 100$$
$$\text{Syllabus Coverage (\%)} = \frac{\text{Topics Marked Completed}}{\text{Total Planned Curriculum Topics}} \times 100$$

### 3.6 Enquiry-to-Admission Conversion Standards
$$\text{Admission Conversion Rate (\%)} = \frac{\text{Admitted Students from Enquiries}}{\text{Total Qualified Enquiries}} \times 100$$
- Excludes duplicate enquiries and cold non-qualified contacts.

---

## 4. UNIVERSAL REPORT PRESENTATION STANDARD

Every upgraded report implements the 6 mandatory sections:
1. **Report Summary KPIs**: High-level metrics with visual badges and trend variance.
2. **"How It Was Calculated" Inspector**: Mathematical provenance modal disclosing exact formulas, numerators, denominators, inclusions, exclusions, and natural-language explanations.
3. **Data Visualization**: Context-appropriate chart rendering (Bar, Line, Pie/Donut).
4. **Period-over-Period & Target Comparison**: Percentage changes vs prior term and variance against institutional benchmarks.
5. **Deterministic Report Insights**: Plain-English diagnoses based on deterministic business thresholds (Critical, Warning, Positive, Neutral).
6. **Recommended Actions**: Deep-link navigation buttons routing the user directly to resolving the underlying records.

---

## 5. RECONCILIATION & TESTING METHODOLOGY

All calculations must be verified by automated tests ensuring:
1. Zero denominator protection (yields `0.0%` with explicit `"Zero Denominator"` explanation, preventing server crashes).
2. Strict distinction between zero (`0.00`) and missing data (`N/A` / `"Insufficient Data"`).
3. Precision rounding (2 decimal places standard).
4. Strict multi-tenant and academic-year scoping.
5. Exact matching between screen summary figures, drill-down row counts, and exported Excel/PDF registers.

