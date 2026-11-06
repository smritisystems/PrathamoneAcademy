---
title: "System Acceptance Criteria and Test Verification Matrix"
module: "18_TESTING_QA"
category: "SPECIFICATION"
document_type: "SPECIFICATION"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-04"
updated_date: "2026-11-04"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["18-testing-qa", "specification"]
entities: []
api_routes: []
related_modules: []
---

# System Acceptance Criteria and Test Verification Matrix
**Document ID**: AC-001  
**Version**: 1.0-DRAFT  
**Parent Framework**: CIPF-001  
**Status**: APPROVED DEFAULT ARCHITECTURE / TEST SUITE SPECIFICATION  
**Target System**: Prashant Academy SMS / Coaching Management System  

---

## 1. Scope & Test Methodology

This document specifies the exact, testable acceptance criteria across Prashant Academy's full-stack architecture. All criteria are mapped to automated unit/integration tests in `backend/tests/` and `frontend/src/test/`.

---

## 2. Benchmark Financial Scenarios (Fee Management)

### Scenario 1: Multi-Payment Fee Invoicing (The ₹24,000 Canonical Flow)
- **Feature ID**: AC-FEE-001
- **Target Test**: `backend/tests/test_payments.py::test_three_payment_scenario`

```gherkin
Scenario: Student makes three partial payments against an annual invoice
  Given a student is enrolled with an annual fee invoice of ₹24,000.00
  And the invoice status is "unpaid" with outstanding amount ₹24,000.00
  When the student pays ₹5,000.00 via "cash"
  Then payment #1 is recorded with amount ₹5,000.00
  And receipt "RCP-1-000001" is generated for ₹5,000.00
  And invoice paid amount becomes ₹5,000.00 and outstanding becomes ₹19,000.00
  And invoice status becomes "partial"
  
  When the student pays ₹7,000.00 via "upi"
  Then payment #2 is recorded with amount ₹7,000.00
  And receipt "RCP-1-000002" is generated for ₹7,000.00
  And invoice paid amount becomes ₹12,000.00 and outstanding becomes ₹12,000.00
  And invoice status remains "partial"

  When the student pays ₹4,000.00 via "bank_transfer"
  Then payment #3 is recorded with amount ₹4,000.00
  And receipt "RCP-1-000003" is generated for ₹4,000.00
  And invoice paid amount becomes ₹16,000.00 and outstanding becomes ₹8,000.00
  And all three receipts exist independently with unique numbers
```

### Scenario 2: Prevention of Overpayment and Over-Allocation
- **Feature ID**: AC-FEE-002
- **Target Test**: `backend/tests/test_payments.py::test_overpayment_rejected`

```gherkin
Scenario: Cashier attempts to allocate more than the invoice outstanding balance
  Given an invoice with outstanding balance of ₹8,000.00
  When a payment is submitted with an allocation amount of ₹8,001.00
  Then the API rejects the request with HTTP 400 Bad Request
  And the error message specifies "exceeds outstanding"
  And no payment or receipt records are committed to the database
```

### Scenario 3: Allocation Mismatch Prevention
- **Feature ID**: AC-FEE-003
- **Target Test**: `backend/tests/test_payments.py::test_allocation_mismatch_rejected`

```gherkin
Scenario: Payment total amount does not match sum of individual allocations
  When a payment request is submitted with total amount ₹10,000.00
  And allocations sum to ₹9,500.00
  Then the API rejects the request with HTTP 400 Bad Request
  And the error message states "Total allocation must equal payment amount"
```

### Scenario 4: Payment Reversal and Balance Restoration
- **Feature ID**: AC-FEE-004
- **Target Test**: `backend/tests/test_payments.py::test_payment_reversal`

```gherkin
Scenario: An authorized accountant reverses a bounced cheque payment
  Given an invoice of ₹24,000.00 with ₹16,000.00 paid and ₹8,000.00 outstanding
  And a completed payment #3 of ₹4,000.00
  When the accountant calls POST /api/v1/payments/{payment_id}/reverse with reason "Cheque bounced"
  Then payment #3 status changes to "reversed"
  And the invoice paid amount is restored to ₹12,000.00
  And the invoice outstanding amount is restored to ₹12,000.00
  And when another reversal is attempted on payment #3, the API rejects it with HTTP 400 "already reversed"
```

---

## 3. Academic & Student Management Acceptance Criteria

### Scenario 5: Unique Admission Number Sequence
- **Feature ID**: AC-ADM-001
- **Criteria**:
  1. Admission number must conform to regex pattern `^PA-\d{4}-\d{6}$`.
  2. Sequential numbers do not collide across concurrent user requests.
  3. Deleting or archiving a student does not cause the number to be reissued.

### Scenario 6: Mandatory Guardian Relationship
- **Feature ID**: AC-ADM-002
- **Criteria**:
  1. Student registration without a guardian object returns HTTP 422 Unprocessable Entity.
  2. Guardian must have valid 10-digit Indian phone number (`/^\d{10}$/`).

### Scenario 7: Bulk Attendance Integrity
- **Feature ID**: AC-ATT-001
- **Criteria**:
  1. Marking attendance creates or updates records for all students in the division.
  2. Marking is idempotent for the same `(enrollment_id, date)`.
  3. Allowed statuses are strictly constrained to `present`, `absent`, `late`, `half_day`.

---

## 4. Coaching Institute Dashboard & Navigation Acceptance Criteria

### Scenario 8: Coaching Institute Terminology & Dynamic Academic Year Default
- **Feature ID**: AC-DASH-001
- **Criteria**:
  1. Top header and sidebar display coaching institute branding ("Prashant Academy Coaching Institute" and "Coaching Institute Management System").
  2. Academic Year dropdown automatically initializes to current academic year (`is_current == True`).
  3. If user selects a historical academic year, this selection is preserved without premature reset.

### Scenario 9: Real-time Multi-Dimensional Filter Aggregation
- **Feature ID**: AC-DASH-002
- **Target Test**: `backend/tests/test_dashboard.py::test_dashboard_stats_endpoint`
- **Criteria**:
  1. Dashboard metrics reflect real database figures for `total_students`, `total_fees`, `total_collected`, `total_outstanding`, and `collection_rate`.
  2. Filtering by `academic_year_id`, `standard_id`, and `division_id` cascades accurately across student counts and fee computations.
  3. Fee calculations strictly sum active `FeeInvoice` objects (`status != 'cancelled'`) and active non-reversed payments.

### Scenario 10: Monthly Fee Collection Trends & Recent Payment Records
- **Feature ID**: AC-DASH-003
- **Criteria**:
  1. Time-series chart displays monthly collections (`monthly_trends`) grouped by calendar month instead of repeating summary card values.
  2. Recent payment table displays receipt number, student name, admission number, batch name, payment method, formatted currency amount, and payment date.
  3. Quick actions navigate directly to functional workflows (`/students/add`, `/fees`, `/attendance`, `/reports`, `/batches`, `/standards`).

---

## 5. Test Verification Matrix

| Test Identifier | Category | Target Module | File Location | Status |
|---|---|---|---|:---:|
| `test_dashboard_stats_endpoint` | Integration | Dashboard & Metrics | `backend/tests/test_dashboard.py` | Automated |
| `test_full_payment` | Integration | Payments & Receipts | `backend/tests/test_payments.py` | Automated |
| `test_partial_payment` | Integration | Payments & Invoices | `backend/tests/test_payments.py` | Automated |
| `test_three_payments_scenario` | Integration | Multi-Payment Ledger | `backend/tests/test_payments.py` | Automated |
| `test_overpayment_rejected` | Negative | Validation & Safety | `backend/tests/test_payments.py` | Automated |
| `test_allocation_mismatch_rejected` | Negative | Allocation Integrity | `backend/tests/test_payments.py` | Automated |
| `test_payment_reversal` | Integration | Ledger Reversal | `backend/tests/test_payments.py` | Automated |
| `test_double_reversal_rejected` | Negative | Safety Guardrails | `backend/tests/test_payments.py` | Automated |
| `test_unique_receipt_per_payment` | Integration | Receipts Sequencing | `backend/tests/test_payments.py` | Automated |
| `test_receipt_retrieval` | Unit | Receipt API | `backend/tests/test_payments.py` | Automated |
| `test_payment_history_preserved` | Audit | Ledger Immutability | `backend/tests/test_payments.py` | Automated |
| `test_board_records_exist` | Integration | Academic Hierarchy | `backend/tests/test_board_class_structure.py` | Automated |
| `test_board_endpoints` | API | Boards API | `backend/tests/test_board_class_structure.py` | Automated |
| `test_division_board_linkage` | Integration | Batches & Boards | `backend/tests/test_board_class_structure.py` | Automated |
| `test_student_role_portal_dashboard_isolation` | Security | Student Data Isolation | `backend/tests/test_student_portal.py` | Automated |
| `test_admin_student_portal_switcher` | Feature | Admin Portal Preview Switcher | `backend/tests/test_student_portal.py` | Automated |
| `test_student_portal_tabs` | API | 8 Portal Endpoints | `backend/tests/test_student_portal.py` | Automated |
| `test_student_portal_profile_update` | API | Student Contact Profile Update | `backend/tests/test_student_portal.py` | Automated |
| `test_admin_student_profile_8_tabs_and_documents` | Integration | Admin Profile 8 Tabs & Documents | `backend/tests/test_student_portal.py` | Automated |
| `Badge.test.tsx` | Unit | UI Components | `frontend/src/test/Badge.test.tsx` | Automated |
| `StudentPortal.test.tsx` | Unit | Portal UI & Tab Specification | `frontend/src/test/StudentPortal.test.tsx` | Automated |

---

## 6. Board, Class & Student Roster Scenarios

### Scenario 11: Board & Class Mapping Verification
- **Feature ID**: AC-BRD-001
- **Criteria**:
  1. Board records exist for `ICSE`, `CBSE`, and `SSC`.
  2. Classes (Standards) are configured for levels 8 (`Class VIII`), 9 (`Class IX`), and 10 (`Class X`).
  3. Batches (`divisions`) map explicitly to Board and Class combinations:
     - `ICSE X`: Board `ICSE`, Class `X` (Standard 10)
     - `CBSE X`: Board `CBSE`, Class `X` (Standard 10)
     - `ICSE IX`: Board `ICSE`, Class `IX` (Standard 9)
     - `ICSE VIII`: Board `ICSE`, Class `VIII` (Standard 8)
     - `SSC IX`: Board `SSC`, Class `IX` (Standard 9)
  4. All 39 listed students are registered under their exact assigned board and class without duplicates or orphaned financial records.

---

## 7. Student Dashboard & Student Profile Scenarios

### Scenario 12: Student Portal Data Isolation
- **Feature ID**: AC-PORTAL-001
- **Target Test**: `backend/tests/test_student_portal.py::test_student_role_portal_dashboard_isolation`
- **Criteria**:
  1. A student authenticated with `role="student"` receives strictly their own academic and financial records.
  2. Query parameters targeting another student (`?student_id={other}`) are overridden by `current_user.student_id`.
  3. All fee obligation, collection, and balance numbers are read-only for students.

### Scenario 13: 8-Tab Student Portal Navigation
- **Feature ID**: AC-PORTAL-002
- **Target Test**: `backend/tests/test_student_portal.py::test_student_portal_tabs`
- **Criteria**:
  1. Navigation includes all 8 tabs: `Home`, `My Classes`, `Timetable`, `Attendance`, `Tests & Results`, `Fees`, `Study Materials`, `Profile`.
  2. Real database data drives each tab (active enrollments, weekly timetable, attendance rates, exam scorecards, fee invoices, payments, study materials, documents).
  3. Students can update permitted demographic and contact fields (`phone`, `email`, `blood_group`, `address`, `city`, `pincode`).

### Scenario 14: 8-Tab Admin/Teacher Student Profile & Documents
- **Feature ID**: AC-PORTAL-003
- **Target Test**: `backend/tests/test_student_portal.py::test_admin_student_profile_8_tabs_and_documents`
- **Criteria**:
  1. Administrative profile provides 8 tabs: `Overview`, `Enrollment`, `Classes`, `Attendance`, `Tests`, `Fees`, `Documents`, `Activity`.
  2. Administrators can upload and delete student verification documents.
  3. Activity timeline synthesizes admissions, payment events, and audit logs.
  4. Administrators can preview any student's portal using the live student switcher.

### Scenario 15: Full Administrative Student Profile Editing & Consequential Change Safeguards
- **Feature ID**: AC-STUDENT-004
- **Target Test**: `backend/tests/test_student_profile_edit.py`, `frontend/src/test/StudentProfileEdit.test.tsx`
- **Criteria**:
  1. Only authorized administrative roles (`superadmin`, `admin`, `principal`) may perform unrestricted profile edits; non-administrative roles (e.g., `staff`, `teacher`, `student`) receive HTTP 403 Forbidden.
  2. Master student fields across personal info, contact info, address, identity, and demographics can be edited and saved.
  3. Guardian records (primary and secondary) can be added, updated, or removed with primary contact designation.
  4. Academic and batch assignments can be updated.
  5. Any consequential changes (e.g., standard level or batch transfer) trigger a warning callout, require an administrative transfer reason, and demand explicit checkbox confirmation.
  6. Financial integrity is preserved: fee obligations, invoices, installments, payment transactions, receipts, and attendance history are never silently altered or deleted during profile or batch updates.
  7. All modifications create an immutable `AuditLog` entry documenting changed fields, administrator identity, and timestamp.

---

*End of ACCEPTANCE_CRITERIA.md*

