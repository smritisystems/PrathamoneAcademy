---
title: "PrathamOne EduOS — Enterprise KPI Strategy & Metrics Specification"
module: "11_REPORTS_EXPORTS"
category: "STRATEGY-REPORT"
document_type: "REPORT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-18"
updated_date: "2026-11-18"
author: "Jawahar R Mallah"
organization: "Smritisys & AITDL Networks"
status: "Approved"
tags: ["kpi-strategy", "executive-scorecard", "decision-framework", "metrics-catalog", "analytics-governance"]
entities: ["Student", "FeeInvoice", "Payment", "Attendance", "Examination", "HomeworkAssignment", "Lead", "StaffProfile", "TeacherPayroll", "TeachingSession", "CommunicationLog"]
api_routes: ["/api/v1/dashboard/*", "/api/v1/reports/*", "/api/v1/reports/intelligence/*"]
related_modules: ["00_PRODUCT_OVERVIEW", "01_ARCHITECTURE", "03_ACADEMIC_MANAGEMENT", "04_STUDENT_MANAGEMENT", "06_TEACHER_PAYROLL", "07_ATTENDANCE", "08_EXAMINATION", "09_FEES_PAYMENTS", "10_FINANCE_ACCOUNTING", "11_REPORTS_EXPORTS", "12_RBAC_SECURITY"]
---

# PRATHAMONE EduOS — ENTERPRISE KPI STRATEGY & DECISION METRICS FRAMEWORK

**Product:** PrathamOne EduOS  
**Edition:** Coaching Institute Edition  
**Baseline Version:** 1.0.0  
**Product Architect:** Jawahar R Mallah  
**Organization:** Smritisys & AITDL Networks  
**Policy Status:** MANDATORY ARCHITECTURAL SPECIFICATION  

---

## EXECUTIVE SUMMARY & GOVERNANCE DIRECTIVE

This document establishes the canonical Key Performance Indicator (KPI) Strategy and Decision Intelligence Framework for **PrathamOne EduOS**. Designed specifically for high-performance coaching institutes and modern K-12 educational academies, this framework bridges raw database transactions with executive, operational, and pedagogical decision-making.

Every KPI defined in this specification adheres to strict architectural principles:
1. **Zero Vanity Metrics:** Every metric must directly drive an institutional action (e.g., intervene with a student, collect an aging fee, optimize teacher scheduling, reallocate marketing budget).
2. **Canonical Single Source of Truth (SSOT):** Numbers are derived from authoritative transactional ledgers without duplicate business calculation logic.
3. **Deterministic Mathematical Integrity:** Explicit formulas with documented numerators, denominators, zero-denominator protections, and historical ledger immutability.
4. **Role-Scoped Visibility (RBAC):** Restrict sensitive financial margins, staff payroll, and student demographics strictly to authorized roles.

---

## SECTION 1: ARCHITECTURAL DATA FOUNDATION & SYSTEM AUDIT

A rigorous forensic audit of the PrathamOne EduOS backend schema (105 relational tables) reveals the existing data assets, partial aggregations, and data gaps:

| Functional Domain | Primary Database Tables | Production Data Availability | Existing API Surface |
| :--- | :--- | :--- | :--- |
| **Executive Dashboard** | Aggregated from core ledgers | Fully Available | `/api/v1/dashboard/stats`, `/collection-trends`, `/analytics`, `/reconciliation` |
| **Student Management** | `students`, `student_enrollments`, `student_lifecycle_logs`, `guardians` | Fully Available | `/api/v1/students/`, `/api/v1/reports/students/master-directory`, `/withdrawals` |
| **Fees & Finance** | `fee_invoices`, `fee_invoice_installments`, `payments`, `payment_allocations`, `refunds`, `fee_concession_applications` | Fully Available | `/api/v1/fees/overview`, `/api/v1/reports/fee-collection`, `/outstanding`, `/payments-summary` |
| **Attendance** | `attendances`, `staff_attendances` | Fully Available | `/api/v1/attendance/`, `/api/v1/reports/attendance/summary`, `/api/v1/staff/attendance` |
| **Examinations** | `examinations`, `exam_marks` | Fully Available | `/api/v1/examinations/`, `/api/v1/reports/examinations/consolidated-merit` |
| **Homework & Prep** | `homework_assignments`, `student_homework_records`, `homework_files` | Fully Available | `/api/v1/homework/`, `/api/v1/reports/homework-register` |
| **Academics & Scheduling** | `standards`, `divisions`, `subjects`, `canonical_subjects`, `subject_mappings`, `timetable_entries`, `activities` | Fully Available | `/api/v1/standards/`, `/timetable/`, `/reports/academic/batch-capacity`, `/curriculum-matrix` |
| **Admissions (CRM)** | `leads`, `lead_follow_ups`, `lead_demo_classes` | Fully Available | `/api/v1/leads/`, `/api/v1/reports/crm-enquiries` |
| **Staff & HR** | `users`, `staff_profiles`, `staff_leaves`, `teacher_assignments`, `teacher_payment_profiles`, `teacher_payrolls`, `teaching_sessions` | Fully Available | `/api/v1/staff/`, `/api/v1/teacher-payroll/`, `/api/v1/reports/academic/faculty-load` |
| **Communication** | `communication_logs`, `announcements`, `chat_rooms`, `chat_messages` | Fully Available | `/api/v1/communication/`, `/api/v1/chat/` |
| **Reporting & Audits** | `report_book_generations`, `report_book_templates`, `audit_logs`, `data_import_logs` | Fully Available | `/api/v1/reports/`, `/api/v1/reports/intelligence/*`, `/api/v1/reports/system/audit-summary` |

---

## SECTION 2: TOP 10 EXECUTIVE KPIS FOR SCHOOL MANAGEMENT

For institute directors, trustees, and executive principals, these 10 KPIs represent the vital signs of institutional sustainability, academic excellence, and operational velocity:

| Rank | KPI Name | Primary Domain | Core Calculation | Decision / Intervention Driven | Review Cadence |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **01** | **Net Fee Realization Rate** | Finance | $\frac{\text{Posted Collections} - \text{Refunds}}{\text{Net Invoiced Receivables}} \times 100$ | Working capital runway, automated reminder escalation, cashflow forecasting. | Daily |
| **02** | **Student Retention Rate** | Students | $\frac{\text{Active Enrollments}}{\text{Total Enrolled} + \text{Withdrawn}} \times 100$ | Customer satisfaction, curriculum efficacy, faculty retention intervention. | Monthly |
| **03** | **Lead-to-Admission Conversion Rate** | Admissions | $\frac{\text{Converted Leads}}{\text{Total Qualified Inquiries}} \times 100$ | Marketing campaign ROI, counselor performance, sales funnel friction. | Weekly |
| **04** | **Cohort Attendance Defaulter Ratio** | Attendance | $\frac{\text{Students with } < 75\% \text{ Attendance}}{\text{Total Active Enrolled Students}} \times 100$ | Mandatory regulatory compliance, drop-out prevention, parent alerts. | Weekly |
| **05** | **Batch Seating Capacity Occupancy** | Academics | $\frac{\text{Active Enrolled Students}}{\sum \text{Batch Maximum Seating Capacity}} \times 100$ | Batch consolidation, infrastructure expansion, branch profitability. | Term / Monthly |
| **06** | **Cohort Examination Pass Rate** | Academics | $\frac{\text{Students Passing All Core Subjects}}{\text{Appeared Students}} \times 100$ | Remedial batch scheduling, teacher instructional quality, academic audits. | Post-Exam |
| **07** | **Aging Receivables Risk Exposure (>60 Days)** | Finance | $\sum \text{Overdue Installments with Due Date } > 60 \text{ Days}$ | Bad-debt provisioning, management escalation, scholarship re-evaluation. | Weekly |
| **08** | **Instructional Delivery Compliance Rate** | HR / Faculty | $\frac{\text{Verified Conducted Hours}}{\text{Scheduled Timetable Hours}} \times 100$ | Missed syllabus recovery, faculty attendance compliance, payroll audits. | Bi-Weekly |
| **09** | **Homework Submission Compliance Rate** | Academics | $\frac{\text{Completed Student Submissions}}{\text{Eligible Assigned Records}} \times 100$ | Student academic discipline, continuous internal evaluation readiness. | Weekly |
| **10** | **Parent Communication Reach & Delivery Rate** | Operations | $\frac{\text{Successfully Delivered Messages}}{\text{Total Dispatched Dispatches}} \times 100$ | Critical emergency alerts reach, fee notice compliance, carrier health. | Daily |

---

## SECTION 3: ROLE-BASED DASHBOARD RECOMMENDATIONS

PrathamOne EduOS strictly enforces role-based access control (RBAC). Dashboards must present only actionable, role-relevant metrics while preserving data privacy and financial immutability.

### 3.1 School Owner / Management (Executive Strategic Cockpit)
- **Primary Objective:** Enterprise solvency, revenue growth, branch capacity, and institutional reputation.
- **Top Metrics:** Net Fee Realization Rate, Total Cash Collected vs Target, Aging Dues (>60d, >90d), Student Retention Rate, Lead Conversion Efficiency, Batch Seat Occupancy, Overall Faculty Cost to Invoiced Revenue Ratio.
- **Restricted Access:** Full institute visibility, cross-branch comparison, CodeX financial masking toggle.

### 3.2 Principal / Academic Director (Pedagogical & Operations Cockpit)
- **Primary Objective:** Academic merit, faculty delivery, student attendance compliance, syllabus pacing, and parent satisfaction.
- **Top Metrics:** Institute Daily Attendance %, Chronic Defaulter Count (<75%), Examination Cohort Pass Rate, Subject-wise Score Deviation, Instructional Delivery Rate %, Teacher Absenteeism Rate, Homework Evaluation Turnaround Time, Student Withdrawal Attrition.
- **Restricted Access:** Academic and operational data; excludes raw financial GL balances and individual staff salary sheets.

### 3.3 Accountant / Bursar (Treasury & Ledger Cockpit)
- **Primary Objective:** Cash intake integrity, fee realization, invoice reconciliation, aging recovery, and payment auditability.
- **Top Metrics:** Daily Intake by Payment Method (Cash, UPI, Bank, Cheque), Invoiced vs Collected vs Outstanding, Aging Defaulters Register (1-30, 31-60, 61-90, 90+), Pending Cheque Clearances, Concession & Waiver Burn, Reversal & Refund Volume, Bank Reconciliation Suspense.
- **Restricted Access:** Complete financial access; restricted from altering student grades or curriculum settings.

### 3.4 Teacher / Faculty Member (Classroom & Instruction Cockpit)
- **Primary Objective:** Classroom attendance, daily homework compliance, exam marks entry, and student doubt resolution.
- **Top Metrics:** Assigned Batch Today's Attendance %, Pending Homework Notebooks to Review, Exam Marks Submission Deadline Status, Unresolved Student Doubts in Chat, Weekly Completed Teaching Hours vs Target.
- **Restricted Access:** Strictly scoped to assigned batches and subjects (`teacher_assignments`); zero access to student fee dues or other teachers' salaries.

### 3.5 Academic Coordinator / HOD (Curriculum & Timetable Cockpit)
- **Primary Objective:** Timetable slot utilization, teacher substitution coverage, syllabus completion pace, and batch balance.
- **Top Metrics:** Timetable Slot Saturation %, Teacher Absence & Substitution Fulfillment Rate %, Syllabus Coverage Milestone Progress, Batch Roll Balance Variance, Consolidated Unit Test Pass Rates.
- **Restricted Access:** Academic operations, timetable, curriculum, and faculty allocations.

### 3.6 Admission & Counseling Team (CRM & Pipeline Cockpit)
- **Primary Objective:** Lead capture velocity, follow-up discipline, demo class attendance, and enrollment conversion.
- **Top Metrics:** Today's Follow-ups Due, New Inquiries Captured (Today/MTD), Pipeline Stage Distribution (Kanban), Demo Class Attendance & Rating %, Lead-to-Admission Conversion %, Counselor Sales Velocity (Days to Close), Unattended Leads (>24 hrs).
- **Restricted Access:** CRM pipeline and prospect contact data; zero access to accounting ledgers or faculty payroll.

### 3.7 HR & Staff Administrator (Workforce & Operations Cockpit)
- **Primary Objective:** Staff attendance compliance, leave utilization, biometric reconciliation, payroll generation velocity, and teacher contract tracking.
- **Top Metrics:** Staff Present vs Absent Today, Teacher Punctuality & Late Punch Rate, Pending Leave Approvals, Monthly Payroll Calculation & Approval Status, Teacher Contract Expiry Alerts, Faculty Teaching Load Distribution.
- **Restricted Access:** Staff directory, employment contracts, attendance, leave, and payroll processing.

---

## SECTION 4: CANONICAL FORMULAS & GOVERNANCE RULES

### Safe Math & Zero-Denominator Governance
1. If $\text{Denominator} = 0$, output $\text{Value} = 0.0$, Status = `ZERO_DENOMINATOR`, Explanation = `"No eligible records for selected cohort"`.
2. Financial rounding is fixed to 2 decimal places (`NUMERIC(12, 2)`). Counts are integers. Percentages are formatted to 1 or 2 decimals.
3. Cancelled fee invoices (`status = 'cancelled'`), reversed payments (`status = 'reversed'`), and draft leads (`is_active = False`) are strictly excluded from realization numerators and denominators.

---

## SECTION 5: IMPLEMENTATION ROADMAP & PHASED EXECUTION

- **Phase 1: Production Verified KPIs (Current Release v1.129.0):**
  - Implement full visual KPI cards on Dashboard and Reports workspaces for existing verified database fields (Fees, Invoices, Attendance, Leads, Enrollments, Homework, Payroll).
- **Phase 2: Composite & Multi-Touch Attribution KPIs (Next Minor Release):**
  - Surface Cohort Standard Deviation, Teacher Evaluation TAT, Counselor Sales Cycle Velocity, and Subject-wise Risk Vulnerability.
- **Phase 3: Extended Architecture & Enterprise Analytics (Future Release):**
  - Introduce OpEx/Expense ledger tables for Net Institutional Operating Margin, automated multi-branch consolidation, and real-time biometric IoT stream ingestion.
