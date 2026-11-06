---
title: "Student Lifecycle & Withdrawal Analytics Implementation Report"
module: "04_STUDENT_MANAGEMENT"
category: "IMPLEMENTATION-REPORT"
document_type: "IMPLEMENTATION-REPORT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-05"
updated_date: "2026-11-05"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["04-student-management", "implementation-report"]
entities: ["Student", "StudentEnrollment", "StudentAcademicHistory"]
api_routes: ["/api/v1/students", "/api/v1/admissions"]
related_modules: []
---

# Student Lifecycle & Withdrawal Analytics Implementation Report
**PrathamOne Academy Coaching Institute Management System**  
*Document Version: 1.0.0 | Date: November 5, 2026 | Git Branch: `feat/student-lifecycle-withdrawal-analytics`*

---

## Executive Summary

The **Student Lifecycle & Withdrawal Analytics Blueprint** has been implemented across the full stack of **PrathamOne Academy** on the dedicated Git branch `feat/student-lifecycle-withdrawal-analytics`. 

All implementation objectives across all six phases have been achieved with zero destruction or alteration of existing customer data, complete financial ledger invariance, and full multi-tenant authorization isolation:

1. **Non-Destructive Database Evolution (Alembic Migration 014)**:
   - Added `exit_date`, `exit_reason`, and `exit_notes` to `students`.
   - Added `exit_date`, `exit_reason`, `exit_notes`, `exited_by_id`, and `exited_at` to `student_enrollments`.
   - Created the `refunds` ledger table for recording tracked fee refunds with audit linkages to students, enrollments, invoices, and completed payments.
   - Created the `student_lifecycle_logs` audit trail table tracking all status transitions (`enrolled`, `transferred`, `withdrawn`, `reactivated`).
2. **Controlled Lifecycle Workflows**:
   - `POST /api/v1/students/{id}/exit`: Formal exit transition marking active enrollment as `'withdrawn'`, setting `Student.is_active = false`, logging transition audit records, and validating/processing refunds without exceeding net payments.
   - `POST /api/v1/students/{id}/reactivate`: Reactivation transition verifying inactive status, checking target batch capacity, creating a new active enrollment in the target academic year and class, and reactivating the student master record without duplicate student creation.
   - `GET /api/v1/students/{id}/lifecycle-history`: Chronological audit logs, multi-year enrollment timeline, and refund ledgers.
3. **Student Directory & Profile UI Modernization**:
   - Default active-only student directory with a persistent "Include Inactive Students" toggle (OFF by default).
   - Dynamic status filter (`all`, `active`, `withdrawn`, `inactive`) and visual status badges (`Active` green, `Withdrawn` red, `Inactive` gray).
   - One-click Exit/Withdraw and Reactivation action dialogs (`StudentExitModal` and `StudentReactivateModal`) with full validation and refund entry.
   - Prominent Inactive/Withdrawn warning banner in student profiles and a dedicated **Lifecycle & History** profile tab.
4. **Spreadsheet-Grade Withdrawal Reports & Analytics**:
   - `GET /api/v1/reports/withdrawals`: Tabular report grid supporting multi-column search, column filters, and CSV/Excel exports with paid/unpaid attrition classification, gross fees paid, refunds, net retained collections, and exit balance.
   - `GET /api/v1/reports/withdrawal-analytics`: Visual analytics dashboard featuring KPI cards (Total Enrolled, Active, Withdrawn, Attrition Rate %, Paid vs Unpaid Attrition, Net Retained Revenue, Outstanding at Exit), primary reason breakdown bars, class/batch attrition tables, installment distribution, and monthly withdrawal trends.
5. **Data & Financial Integrity Guarantee**:
   - Customer master student count remains invariant at **39 students**.
   - Completed payments count remains invariant at **170 transactions**, totaling exactly **₹1,819,500.00**.
   - Strict institution authorization enforcement on all endpoints.

---

## 1. Inventory of Modified & Created Files

| File Path | Component | Status | Description |
|---|---|---|---|
| `backend/alembic/versions/014_student_lifecycle_and_withdrawal_analytics.py` | Database Migration | Created | Non-destructive migration adding exit fields, `refunds`, and `student_lifecycle_logs`. |
| `backend/app/models/student.py` | Backend Models | Modified | Added exit fields and relationships to `Student`; defined `StudentLifecycleLog` model. |
| `backend/app/models/enrollment.py` | Backend Models | Modified | Added exit metadata and `exited_by` foreign key to `StudentEnrollment`. |
| `backend/app/models/payment.py` | Backend Models | Modified | Defined `Refund` model with relationships to Student, Invoice, Payment, and User. |
| `backend/app/models/__init__.py` | Backend Models | Modified | Exported `Refund` and `StudentLifecycleLog`. |
| `backend/app/api/v1/endpoints/students.py` | Backend API | Modified | Added `include_inactive` filtering, `exit`, `reactivate`, and `lifecycle-history` endpoints. |
| `backend/app/api/v1/endpoints/reports.py` | Backend API | Modified | Added `withdrawals`, `withdrawal-analytics`, and `withdrawals/export` endpoints. |
| `backend/tests/test_student_lifecycle.py` | Backend Pytest | Created | Regression test suite covering exit, refund cap, reactivation, analytics, CSV export, and isolation. |
| `frontend/src/types/index.ts` | Frontend Types | Modified | Master declarations for lifecycle payloads, refunds, audit logs, and analytics. |
| `frontend/src/api/endpoints.ts` | Frontend API | Modified | Typed API clients for student exit, reactivate, lifecycle history, and withdrawal reports. |
| `frontend/src/components/StudentExitModal.tsx` | Frontend Component | Created | Modal dialog for student withdrawal, reason taxonomy selection, and optional refund entry. |
| `frontend/src/components/StudentReactivateModal.tsx` | Frontend Component | Created | Modal dialog for re-enrolling inactive students into academic years and batches. |
| `frontend/src/pages/Students.tsx` | Frontend Page | Modified | Inactive toggle, status filter, status badges, and action triggers for Exit / Reactivate. |
| `frontend/src/pages/StudentDetail.tsx` | Frontend Page | Modified | Inactive alert banner, Exit/Reactivate actions, and dedicated "Lifecycle & History" tab. |
| `frontend/src/pages/Reports.tsx` | Frontend Page | Modified | Added "Student Withdrawals" (ExcelReportGrid) and "Withdrawal Analytics" dashboard tabs. |
| `frontend/src/test/StudentLifecycle.test.tsx` | Frontend Test | Created | Vitest suite validating lifecycle contracts, formulas, and filter behavior. |

---

## 2. Database Migration Specification (014)

### Migration Details
- **Revision ID**: `014_student_lifecycle`
- **Revises**: `013_repair_staff_roles`
- **Status**: Applied successfully in Docker database (`alembic upgrade head`).

### Schema Additions
```sql
-- 1. Student Master Table Additions
ALTER TABLE students ADD COLUMN exit_date DATE;
ALTER TABLE students ADD COLUMN exit_reason VARCHAR(100);
ALTER TABLE students ADD COLUMN exit_notes TEXT;

-- 2. Enrollment Table Additions
ALTER TABLE student_enrollments ADD COLUMN exit_date DATE;
ALTER TABLE student_enrollments ADD COLUMN exit_reason VARCHAR(100);
ALTER TABLE student_enrollments ADD COLUMN exit_notes TEXT;
ALTER TABLE student_enrollments ADD COLUMN exited_by_id INTEGER REFERENCES users(id);
ALTER TABLE student_enrollments ADD COLUMN exited_at TIMESTAMPTZ;

-- 3. Refunds Table Creation
CREATE TABLE refunds (
    id SERIAL PRIMARY KEY,
    institution_id INTEGER NOT NULL REFERENCES institutions(id),
    student_id INTEGER NOT NULL REFERENCES students(id),
    enrollment_id INTEGER REFERENCES student_enrollments(id),
    payment_id INTEGER REFERENCES payments(id),
    invoice_id INTEGER REFERENCES fee_invoices(id),
    amount NUMERIC(12, 2) NOT NULL,
    refund_date DATE NOT NULL,
    refund_method VARCHAR(30) NOT NULL,
    reference_number VARCHAR(100),
    reason VARCHAR(200),
    status VARCHAR(20) NOT NULL DEFAULT 'completed',
    notes TEXT,
    processed_by_id INTEGER REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Student Lifecycle Audit Log Creation
CREATE TABLE student_lifecycle_logs (
    id SERIAL PRIMARY KEY,
    institution_id INTEGER NOT NULL REFERENCES institutions(id),
    student_id INTEGER NOT NULL REFERENCES students(id),
    enrollment_id INTEGER REFERENCES student_enrollments(id),
    action VARCHAR(50) NOT NULL,
    from_status VARCHAR(30),
    to_status VARCHAR(30) NOT NULL,
    effective_date DATE NOT NULL,
    reason VARCHAR(100),
    notes TEXT,
    performed_by_id INTEGER REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Architectural Preservation of Historical Enrollments
The existing database constraint on `student_enrollments` is:
```sql
CREATE UNIQUE INDEX uq_active_student_academic_year 
ON student_enrollments (student_id, academic_year_id) 
WHERE status = 'active';
```
Because this index is a **partial index** scoped exclusively to `WHERE status = 'active'`, when a student exits and their enrollment status changes to `'withdrawn'`, the unique constraint is released for that academic year. If the student is later reactivated within the same academic year, a new active enrollment record is safely inserted without violating unique keys, preserving the complete historical timeline.

---

## 3. Financial Calculation Definitions & Invariance Rules

All reports and backend services compute financial metrics from authoritative transactional ledgers:

### Formula Definitions
$$\text{Gross Paid} = \sum_{\substack{\text{payments for student} \\ \text{status} = \text{'completed'} \\ \text{reversed\_at IS NULL}}} \text{amount}$$

$$\text{Total Refunds} = \sum_{\substack{\text{refunds for student} \\ \text{status} = \text{'completed'}}} \text{amount}$$

$$\text{Net Retained Collections} = \text{Gross Paid} - \text{Total Refunds}$$

$$\text{Invoiced Obligation} = \sum_{\substack{\text{fee invoices for student} \\ \text{status} \ne \text{'cancelled'}}} \text{net\_amount}$$

$$\text{Outstanding Balance at Exit} = \max(0, \text{Invoiced Obligation} - \text{Gross Paid})$$

$$\text{Attrition Rate (\%)} = \left( \frac{\text{Withdrawn Students}}{\text{Total Enrolled Students}} \right) \times 100$$

### Paid vs Unpaid Classification
- **Paid Attrition**: Student had $\text{Gross Paid} > 0$ prior to exit. Retained funds remain credited to the institute (net of any approved refund).
- **Unpaid Attrition**: Student had $\text{Gross Paid} = 0$ at exit (e.g., student left during trial or before first installment). Retained revenue is ₹0.00.

### Refund Safety Cap
During student exit with refund processing, the backend strictly verifies:
$$\text{Requested Refund Amount} \le \text{Net Paid Amount}$$
If a user attempts to issue a refund exceeding what the student has paid, the transaction is rejected with HTTP 400 (`"Refund amount cannot exceed net payments made by student"`).

---

## 4. Verification & Test Results

### 1. Backend Pytest Suite
- **Student Lifecycle Suite** (`backend/tests/test_student_lifecycle.py`):
  - `test_student_exit_and_refund_workflow`: **PASSED** (Validated enrollment exit, status update, refund ledger creation, and lifecycle audit log generation).
  - `test_exit_refund_amount_validation`: **PASSED** (Proved that refund > net paid returns HTTP 400).
  - `test_student_reactivation_workflow`: **PASSED** (Validated capacity check, active enrollment creation, student reactivation, and audit logging).
  - `test_student_list_inactive_filter`: **PASSED** (Proved active-only default and `include_inactive=true` retrieval).
  - `test_withdrawal_reports_and_analytics`: **PASSED** (Verified KPI calculations, CSV export, and cross-institution tenant isolation).
- **Full Backend Pytest Regression**:
  - **73 Passed, 3 Skipped, 0 Failures** across all 15 test suites.

### 2. Frontend Vitest Suite
- **Student Lifecycle Suite** (`frontend/src/test/StudentLifecycle.test.tsx`):
  - 6 tests: **PASSED** (Validated payload contracts, formula invariance, unpaid classification, aggregate attrition rate calculations, and default filter parameters).
- **Full Frontend Regression**:
  - **21 Test Files, 143 Passed, 0 Failures**.

### 3. Production Build & Docker Health
- **TypeScript Compilation**: `tsc && vite build` succeeded with **0 type errors**.
- **Container Build**: `docker compose build frontend` completed in 36.1s.
- **Docker Compose Status**:
  - `prashant_academy_backend`: **Up (healthy)** (Port 8000)
  - `prashant_academy_db`: **Up (healthy)** (Port 5432)
  - `prashant_academy_frontend`: **Up (healthy)** (Port 80 / 5173)

### 4. Database Invariance Verification
Direct query on `prashant_academy` PostgreSQL database:
```sql
SELECT count(*) AS total_students, 
       count(*) FILTER (WHERE is_active = true) AS active_students, 
       count(*) FILTER (WHERE is_active = false) AS inactive_students 
FROM students;
-- Result: total_students = 39, active_students = 39, inactive_students = 0

SELECT count(*) AS total_payments, sum(amount) AS total_paid FROM payments;
-- Result: total_payments = 170, total_paid = 1819500.00
```
**Conclusion**: Exactly 39 master student records and ₹1,819,500.00 in payments remain 100% unaltered.

### 5. Attribution Header Compliance
- Executed `python scripts/manage_headers.py check`:
  - **Total checked**: 209 files
  - **Passed**: 209 files
  - **Failed**: 0 files

---

## 5. User Operations & Capabilities Summary

### For Center Administrators
1. **Student Directory (`/students`)**:
   - Only active students are displayed by default.
   - Checking "Include Inactive Students" reveals withdrawn and inactive students with distinct visual badges.
   - Filter dropdown allows selecting `All`, `Active`, `Withdrawn`, or `Inactive`.
   - Quick action icon allows exiting active students or reactivating inactive students directly from the roster.
2. **Student Profile Workspace (`/students/:id`)**:
   - Prominent red alert banner is displayed if a student is withdrawn/inactive with exit date, reason, and notes.
   - Top right header features "Exit / Withdraw" (if active) and "Reactivate Student" (if inactive) buttons.
   - Dedicated **Lifecycle & History** tab presents:
     - Current Status & Overview Cards
     - Chronological Lifecycle Audit Log (action, timestamps, performer, reason, notes)
     - Historical Class & Batch Timeline
     - Itemized Refund Transactions
3. **Financial & Academic Reports (`/reports`)**:
   - **Student Withdrawals Tab**: Spreadsheet-grade grid showing admission number, student name, class, batch, exit date, exit reason, paid classification (`Paid Attrition` vs `Unpaid Attrition`), installment at exit, gross paid, refund issued, net retained, and outstanding balance at exit. Summary row computes totals. Supports Excel, CSV, and JSON downloads.
   - **Withdrawal Analytics Tab**: Visual executive dashboard with retention & attrition KPI cards, primary reason distribution progress bars, class/batch attrition analysis, installment-wise distribution, and monthly withdrawal volume charts.

---

## 6. Remaining Risks & Recommendations

1. **Academic Year Rolling Transitions**:
   - When graduating an entire class at year-end, use batch graduation rather than individual student withdrawals to distinguish between natural course completion and premature attrition.
2. **Third-Party Payment Gateway Webhook Refunds**:
   - If an online payment gateway (e.g. Razorpay, Cashfree) issues an automatic refund via webhook, ensure the webhook handler creates a corresponding record in `refunds` to maintain net retained ledger synchronization.
3. **Audit Log Archival**:
   - The `student_lifecycle_logs` table preserves immutable event records. Over multi-year operations, maintain existing indexing on `student_id` and `effective_date` for sub-second query execution.
