---
title: "Universal Report Calculation & Intelligence Engine — Formula Registry & Business Rules Specification"
module: "11_REPORTS_EXPORTS"
category: "SPECIFICATION"
document_type: "SPECIFICATION"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-11"
updated_date: "2026-11-11"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["calculation-registry", "formulas", "business-rules", "kpi", "intelligence", "governance"]
entities: ["ReportCalculationDefinition", "InstitutionSetting", "Attendance", "HomeworkAssignment", "FeeInvoice", "Payment", "ExamMark", "TeachingSession"]
api_routes: ["/api/v1/reports/intelligence/*"]
related_modules: ["03_ACADEMIC_MANAGEMENT", "04_STUDENT_MANAGEMENT", "06_TEACHER_PAYROLL", "07_ATTENDANCE", "08_EXAMINATION", "09_FEES_PAYMENTS"]
---

# PRATHAMONE EduOS — CALCULATION REGISTRY & BUSINESS RULES SPECIFICATION

**Product:** PrathamOne EduOS  
**Edition:** Coaching Institute Edition  
**Baseline Version:** 1.0.0  
**Product Architect:** Jawahar R Mallah  
**Organization:** AITDL — AI Technology & Development Lab  
**Policy Status:** MANDATORY CANONICAL SPECIFICATION  

---

## 1. CALCULATION REGISTRY DIRECTORY

The Universal Calculation Engine maintains an authoritative in-memory and database-backed registry of all mathematical formulas, rules, and calculation metadata.

### 1.1 Calculation Definition Model
Every calculation registered in the system adheres to the following contract:
```typescript
interface CalculationDefinition {
  id: string                     // Canonical ID (e.g. 'calc_attendance_rate')
  name: string                   // Display Name (e.g. 'Attendance Percentage')
  reportId: string               // Associated Report (e.g. 'student-attendance')
  domain: string                 // Domain category ('attendance', 'fees', 'academics', etc.)
  formulaText: string            // Human-readable formula (e.g. 'Present Days / Eligible Days * 100')
  formulaMath: string            // LaTeX formula (e.g. '\\frac{D_{present}}{D_{eligible}} \\times 100')
  numeratorLabel: string         // e.g. 'Present Student-Days'
  denominatorLabel: string       // e.g. 'Total Eligible Student-Days'
  unit: string                   // '%', '₹', 'hours', 'students', 'count'
  precision: number              // Decimal places (default 2)
  inclusionRules: string[]       // What is counted
  exclusionRules: string[]       // What is filtered out
  explanationTemplate: string    // Plain-English explanation
  defaultTarget?: number         // e.g. 75.0
  severityRules: {               // Deterministic insight rules
    criticalThreshold?: number
    warningThreshold?: number
    direction: 'higher_is_better' | 'lower_is_better'
  }
}
```

---

## 2. CANONICAL CALCULATION DEFINITIONS

### 2.1 Domain: Attendance (`student-attendance`)
- **ID**: `calc_attendance_rate`
- **Name**: Student Attendance Rate
- **Formula**: $\frac{\text{Present Student-Days}}{\text{Total Eligible Student-Days}} \times 100$
- **Numerator**: Total session records where `status = 'present'` or `status = 'late'`.
- **Denominator**: Total active student session records where `status != 'excused'`.
- **Inclusions**: Daily roll call check-ins, scheduled batch teaching periods.
- **Exclusions**: Approved medical/leave exemptions (`status = 'excused'`), gazetted institute holidays, cancelled sessions.
- **Default Target**: 75.0%
- **Severity**: Critical if $< 60.0\%$, Warning if $< 75.0\%$, Positive if $\ge 85.0\%$.
- **Action**: Alert coordinators, dispatch automated guardian SMS, flag student as chronic defaulter.

### 2.2 Domain: Homework & Assignments (`homework-register`)
- **ID**: `calc_homework_completion_rate`
- **Name**: Homework Completion Rate
- **Formula**: $\frac{\text{Completed Student Assignments}}{\text{Total Eligible Student Assignments}} \times 100$
- **Numerator**: Tracking records where `status` is `completed` or `checked` and checking status is `done`.
- **Denominator**: Total assigned records where `is_exempted = False`.
- **Inclusions**: Physical notebook evaluations, digital uploads, text submissions.
- **Exclusions**: Exempted students (`is_exempted = True`), cancelled homework assignments.
- **Default Target**: 80.0%
- **Severity**: Critical if $< 50.0\%$, Warning if $< 80.0\%$, Positive if $\ge 90.0\%$.
- **Action**: Open pending homework checking register, notify teachers of overdue submissions.

### 2.3 Domain: Fees & Collections (`collection`, `outstanding`, `fee-defaulters`)
- **ID**: `calc_fee_realization_rate`
- **Name**: Fee Collection Realization Rate
- **Formula**: $\frac{\text{Realized Banking Collections}}{\text{Net Invoiced Receivables}} \times 100$
- **Numerator**: Total payments where `status = 'posted'` minus approved `refunds`.
- **Denominator**: Total fee invoices where `status != 'cancelled'`, minus approved concessions and waivers.
- **Inclusions**: Bank transfers, UPI, cheques, cash receipts with valid receipt numbers.
- **Exclusions**: Cancelled invoices, draft payments, bounced cheques, uncommitted fees.
- **Default Target**: 85.0%
- **Severity**: Critical if $< 70.0\%$, Warning if $< 85.0\%$, Positive if $\ge 95.0\%$.
- **Action**: Generate fee reminder notices, escalate aging defaulters (>30 days).

### 2.4 Domain: Examinations & Performance (`exam-merit`, `exam-analytics`)
- **ID**: `calc_exam_pass_rate`
- **Name**: Examination Cohort Pass Rate
- **Formula**: $\frac{\text{Students Scoring } \ge \text{Pass Mark in All Core Subjects}}{\text{Total Appeared Students}} \times 100$
- **Numerator**: Count of students with passing marks across every mandatory subject in the examination.
- **Denominator**: Total students who attended at least one subject paper (`is_absent = False`).
- **Inclusions**: Regular exams, term finals, unit assessments.
- **Exclusions**: Absent students (`is_absent = True`), exempted subjects.
- **Default Target**: 80.0%
- **Severity**: Critical if $< 60.0\%$, Warning if $< 80.0\%$, Positive if $\ge 90.0\%$.
- **Action**: View failed students list, schedule remedial coaching sessions.

### 2.5 Domain: Batch Capacity & Scheduling (`batch-capacity`, `timetable-utilization`)
- **ID**: `calc_batch_occupancy_rate`
- **Name**: Batch Seat Occupancy Rate
- **Formula**: $\frac{\text{Active Enrolled Students}}{\text{Batch Maximum Seating Capacity}} \times 100$
- **Numerator**: Distinct active student enrollments assigned to the division.
- **Denominator**: Configured `max_students` capacity of the division.
- **Inclusions**: Verified enrolled students with active status.
- **Exclusions**: Withdrawn students, completed alumni.
- **Default Target**: 85.0%
- **Severity**: Critical if $> 100.0\%$ (Overcrowded) or $< 40.0\%$ (Severely under-utilized).
- **Action**: Rebalance student division allocations or combine low-intake batches.

### 2.6 Domain: Teaching Hours & Syllabus (`payroll-teaching-hours`, `faculty-load`)
- **ID**: `calc_teaching_delivery_rate`
- **Name**: Instructional Session Delivery Rate
- **Formula**: $\frac{\text{Conducted Teaching Hours}}{\text{Scheduled Timetable Hours}} \times 100$
- **Numerator**: Verified teaching sessions where `approval_status = 'approved'`.
- **Denominator**: Total timetable scheduled slots allocated for the period.
- **Inclusions**: Verified faculty lecture hours, approved substitute sessions.
- **Exclusions**: Cancelled sessions, rejected session logs.
- **Default Target**: 95.0%
- **Severity**: Warning if $< 90.0\%$, Critical if $< 80.0\%$.
- **Action**: Audit missed faculty sessions and schedule compensatory lectures.

---

## 3. ZERO-DENOMINATOR AND SAFE MATH GOVERNANCE

To prevent runtime errors, divide-by-zero crashes, and misleading zero metrics:
1. When `denominator == 0` or `None`:
   - Computed value is returned as `0.0`.
   - Calculation status flag is set to `"ZERO_DENOMINATOR"` or `"NO_ELIGIBLE_DATA"`.
   - Display explanation explicitly states: *"No eligible records found for this period or cohort (Denominator is zero). Calculation is not applicable."*
2. Distinguish `0.00` from `None`:
   - A score of `0.00` means a student scored zero marks.
   - A value of `None` means the student did not appear or was not evaluated (`"N/A"`).
3. Consistent rounding:
   - Currency: Rounded to nearest whole rupee or 2 decimals (configurable).
   - Percentages: Rounded strictly to 2 decimal places with trailing zero preservation (`85.50%`).

