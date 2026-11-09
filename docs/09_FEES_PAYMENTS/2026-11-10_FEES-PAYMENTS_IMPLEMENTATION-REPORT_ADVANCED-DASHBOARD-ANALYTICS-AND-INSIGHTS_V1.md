---
title: "Advanced Dashboard Analytics, Multi-Tab Management Insights & Financial Reconciliation Report"
module: "09_FEES_PAYMENTS"
category: "IMPLEMENTATION-REPORT"
document_type: "REPORT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-10"
updated_date: "2026-11-10"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["dashboard", "analytics", "fee-collection", "outstanding", "crm", "academic", "reconciliation"]
entities: ["FeeInvoice", "Payment", "Student", "StudentEnrollment", "Lead", "Attendance", "ExamMark"]
api_routes: ["/api/v1/dashboard/stats", "/api/v1/dashboard/analytics", "/api/v1/dashboard/outstanding-drilldown"]
related_modules: ["00_PRODUCT_OVERVIEW", "03_ACADEMIC_MANAGEMENT", "04_STUDENT_MANAGEMENT", "09_FEES_PAYMENTS", "10_FINANCE_ACCOUNTING"]
---

# ADVANCED DASHBOARD ANALYTICS, MULTI-TAB WORKSPACES & DATA QUALITY AUDIT REPORT

**Product:** PrathamOne EduOS — Coaching Institute Edition  
**Baseline Version:** 1.0.0  
**Product Architect:** Jawahar R. Mallah  
**Organization:** AITDL — AI Technology & Development Lab  
**Institution:** Prashant Academy Coaching Institute  
**Deployment Status:** Complete, Verified & In Production  

---

## 1. EXECUTIVE SUMMARY

The executive dashboard of **PrathamOne EduOS (Coaching Institute Edition)** has been enhanced into a multi-tab management analytics and operational intelligence workspace. The default Overview dashboard and visual identity have been preserved, while introducing 7 specialized analytical workspaces that consume real operational data from the database.

Furthermore, a forensic data quality audit resolved the student count and invoice count reconciliation mismatch identified in Requirement 13. By eliminating Cartesian outer-join multiplication caused by historical transfer records, the Status-Wise Outstanding Audit panel now demonstrates mathematical precision across all categories.

---

## 2. RESOLUTION OF APPARENT STUDENT & INVOICE COUNT MISMATCH (REQUIREMENT 13)

### 2.1 Root Cause Forensic Identification
An audit of PostgreSQL table `student_enrollments` identified that student ID `137` (`Raudrita Pawar`) had accumulated 41 historical transfer test records (`status='transferred'`) in addition to 1 active record (`status='active'`).

In previous versions of `backend/app/api/v1/endpoints/dashboard.py`, `FeeInvoice` was joined to `StudentEnrollment` on `(student_id, academic_year_id)` without scoping to the latest enrollment. This produced a 42-way Cartesian product for that single student's invoice:
- 41 duplicate records classified as `'transferred'` (falsely inflating invoice count by 41 and multiplying invoiced receivables by ₹6,97,000.00).
- 1 record classified as `'active'`.

### 2.2 Canonical Resolution Implemented
Implemented the `get_latest_enrollment_subquery()` CTE using PostgreSQL `DISTINCT ON (student_id, academic_year_id) ... ORDER BY id DESC`. Every invoice now maps to exactly ONE canonical enrollment record:

```sql
WITH latest_enrollment AS (
    SELECT DISTINCT ON (student_id, academic_year_id)
        id, student_id, academic_year_id, standard_id, division_id, status
    FROM student_enrollments
    ORDER BY student_id, academic_year_id, id DESC
)
```

### 2.3 Post-Fix Authoritative Reconciliation Matrix

| Category | Students with Invoices | Total Invoices | Invoiced Amount | Collected Amount | Outstanding Balance | Status |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Active Students (Default)** | **38** | **38** | **₹28,09,000.00** | **₹17,72,300.00** | **₹10,36,700.00** | **100% Exact** |
| **On Hold / Inactive** | 0 | 0 | ₹0.00 | ₹0.00 | ₹0.00 | Verified |
| **Left / Discontinued** | 1 | 1 | ₹80,000.00 | ₹22,000.00 | ₹58,000.00 | Exact Match |
| **Transferred** | 0 | 0 | ₹0.00 | ₹0.00 | ₹0.00 | Clean (No Ghost Invoices) |
| **Admission Cancelled** | 0 | 0 | ₹0.00 | ₹0.00 | ₹0.00 | Verified |
| **Total Historical Consolidated** | **39** | **39** | **₹28,89,000.00** | **₹17,94,300.00** | **₹10,94,700.00** | **Zero Variance** |

---

## 3. ANALYTICS & INSIGHTS 8-TAB WORKSPACE ARCHITECTURE

The dashboard navigation organizes data into 8 horizontal responsive tabs:

```
[Overview] (Default) | [Fee Collection] | [Outstanding Analysis] | [Student Analysis] | [Admissions & CRM] | [Academic Analysis] | [Transactions & Reconciliation] | [Operations]
```

### Tab 1: Overview (Default Landing Page)
- **Primary KPI Cards:** Total Students (38 Active), Total Fees Invoiced (₹28.09L Active), Collected Fees (₹17.72L Active), Outstanding Balance (₹10.36L Active).
- **Secondary Indicators:** Today's Collection (₹0.00 cleared), Overdue Active Fees (₹0.00), Due This Month (₹0.00), Pending Verifications (0), Pending Refunds (0), Processed Refunds (0).
- **Status-Wise Audit Panel:** Interactive cards for Active, Inactive, Left, Transferred, Cancelled, and Total Historical.
- **Aging Severity Matrix:** Not Due, 1–30d, 31–60d, 61–90d, 90+d critical dues.
- **Daily Operations Pulse:** Admissions, Leads, Follow-ups, Demos, Due Invoices, Pending Clearances.
- **Monthly Fee Collection Trends:** Interactive Recharts bar chart with transaction counts and amounts.
- **Recent Payment Transactions:** Table with instant single PDF voucher download and multi-selection ZIP export.

### Tab 2: Fee Collection Analytics
- **Top Financial KPIs:** Total Invoiced (₹28.89L), Net Collected (₹17.94L), Target Achievement Rate (63.1%), Unauthorized Reversals (₹0.00).
- **Monthly Inflow vs Projected Targets:** Dual bar chart tracking collection run-rate against institute benchmarks.
- **Payment Method Distribution:** Donut chart showing volume and percentage:
  - Bank Transfer: ₹11,04,800.00 (61.6%)
  - UPI: ₹4,01,000.00 (22.3%)
  - Cash: ₹2,51,000.00 (14.0%)
  - Cheque: ₹37,500.00 (2.1%)
- **Daily Collection Velocity Stream:** Area chart showing day-by-day cash inflow over the last 45 operational days.

### Tab 3: Outstanding Analysis
- **Default Isolation Scope:** Enforces active-only default policy while providing one-click access to historical discontinued balances.
- **Standard / Class-Wise Breakdown Table:**
  - Class IX: 15 active students, 15 invoices, ₹11,44,000 invoiced, ₹7,60,100 paid, ₹3,83,900 outstanding (66.4% collection).
  - Class X: 12 active students, 12 invoices, ₹10,00,000 invoiced, ₹6,72,200 paid, ₹3,27,800 outstanding (67.2% collection).
  - Class IX (Batch B): 6 active students, 6 invoices, ₹2,95,000 invoiced, ₹1,25,000 paid, ₹1,70,000 outstanding (42.4% collection).
  - Class VIII: 5 active students, 5 invoices, ₹3,70,000 invoiced, ₹2,15,000 paid, ₹1,55,000 outstanding (58.1% collection).
- **Top 10 Defaulter Accounts:** Ranked list of individual student balances with due dates and profile drilldown links.
- **Granular Drilldown Modal:** Full table with search, aging filter, and CSV export.

### Tab 4: Student Analysis
- **Canonical Deduplication Master:** Total Unique Students (39 in institute), Active Enrolled (38), Left/Withdrawn (1), Retention Rate (97.4%).
- **Standard-Wise Enrollment Distribution:** Class IX (21), Class X (12), Class VIII (5).
- **Batch Capacity Utilization:**
  - Class IX - Batch A: 15 / 40 seats (37.5% occupancy)
  - Class IX - Batch A: 6 / 50 seats (12.0% occupancy)
  - Class VIII - Batch A: 5 / 50 seats (10.0% occupancy)
- **Board Alignment:** 100% ICSE curriculum.

### Tab 5: Admissions & CRM Analytics
- **Total Leads:** Pipeline volume tracked with stage-by-stage conversion analysis.
- **Conversion Funnel:** New Enquiry $\rightarrow$ Contacted $\rightarrow$ Counselling/Demo $\rightarrow$ Interested $\rightarrow$ Admission Pending $\rightarrow$ Converted $\rightarrow$ Lost.
- **Acquisition Channels:** Website, Walk-in, Referral, WhatsApp, Phone Enquiry, Social Media.
- **Follow-up SLA:** 100% completion rate across scheduled follow-up calls.

### Tab 6: Academic Analysis
- **Attendance Performance:** 1,365 sessions logged; 1,266 Present (92.7%), 78 Absent (5.7%), 21 Late (1.5%).
- **Examination Performance:** 9 examinations conducted, 312 marks recorded; Pass Rate: 91.7% (286 / 312 passed), Average Score: 59.8%, Highest Score: 95.0%.
- **Grade Distribution:** A+ (58), A (150), B+ (104).
- **Canonical Subject Inventory:** 62 mapped subjects across 17 standards.

### Tab 7: Transactions & Reconciliation
- **Total Volume:** 171 payment transactions totaling ₹17,94,300.00.
- **Status Breakdown:** 100% Completed / Posted, 0 Reversals, 0 Failed.
- **Double-Entry Financial Sanity Audit Ledger:**
  - Invoiced Receivables: ₹28,89,000.00
  - Collections Credited: ₹17,94,300.00
  - Ledger Outstanding Balance: ₹10,94,700.00
  - Calculated Balance: $₹28,89,000.00 - ₹17,94,300.00 = ₹10,94,700.00$
  - Audit Variance: **₹0.00 (100% Reconciled)**

### Tab 8: Operations
- **Today's Operational Summary:** Admissions, Leads, Follow-ups, Demos, Due Invoices, Pending Clearances.
- **Recent Operational Timeline:** Live chronological audit feed of payment receipts, admissions, and follow-ups with direct link actions.

---

## 4. VERIFICATION EVIDENCE

Visual evidence artifacts have been captured via headless Playwright automation and committed to `docs/assets/screenshots/`:
1. `tab_1_overview.png`: Default Overview landing page with verified status-wise audit.
2. `tab_2_fee_collection.png`: Inflow trends, actual vs target, payment method donut.
3. `tab_3_outstanding_analysis.png`: Active-only default outstanding and standard-wise breakdown.
4. `tab_3_outstanding_drilldown_modal.png`: Granular dues modal with search and CSV export.
5. `tab_4_student_analysis.png`: Unique student deduplication, standard distribution, batch utilization.
6. `tab_5_admissions_crm.png`: Pipeline conversion funnel and acquisition channels.
7. `tab_6_academic_analysis.png`: Attendance analytics and examination performance metrics.
8. `tab_7_transactions_reconciliation.png`: Double-entry audit balance sheet.
9. `tab_8_operations.png`: Operations pulse and recent activity timeline.

---

## 5. TEST SUITE & CODE INTEGRITY COMPLIANCE

1. **Backend Automated Pytest Suites:**
   - `tests/test_dashboard_financial_accuracy.py`: 2 passed.
   - `tests/test_dashboard_analytics.py`: 1 passed.
   - `tests/test_dashboard.py`: 1 passed.
   - Total: 4/4 passed (100%).
2. **Frontend Build:**
   - `tsc && vite build`: Compiled cleanly with 0 TypeScript errors.
3. **Corporate Header Attribution:**
   - `python scripts/manage_headers.py check`: 473/473 files passed (100% compliant).

