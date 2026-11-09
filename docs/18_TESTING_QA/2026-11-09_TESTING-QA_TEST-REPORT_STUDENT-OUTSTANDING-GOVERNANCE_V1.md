---
title: "Student Outstanding & Former Receivables Test Suite Report"
module: "18_TESTING_QA"
category: "TEST-REPORT"
document_type: "REPORT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-09"
updated_date: "2026-11-09"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["testing", "qa", "pytest", "student-outstanding", "receivables", "vitest"]
entities: ["FeeInvoice", "Payment", "Student"]
api_routes: ["/api/v1/fees/overview", "/api/v1/fees/register", "/api/v1/fees/former-students-recovery", "/api/v1/students/{id}/exit"]
related_modules: ["04_STUDENT_MANAGEMENT", "09_FEES_PAYMENTS"]
---

# PRATHAMONE EDUOS — STUDENT OUTSTANDING & FORMER RECEIVABLES TEST SUITE REPORT

**Product:** PrathamOne EduOS  
**Edition:** Coaching Institute Edition  
**Baseline Version:** 1.0.0  
**Test Suite:** `backend/tests/test_student_outstanding_governance.py` & `frontend/src/test/FeesDedicatedSubmenus.test.tsx`  
**Test Framework:** Pytest 9.2.0 (AsyncIO) & Vitest 1.6.1  
**Architect:** Jawahar R Mallah  
**Organization:** AITDL — AI Technology & Development Lab  
**Policy Status:** VERIFIED & PASSED  

---

## 1. TEST SUITE EXECUTION SUMMARY

To ensure complete verification of student receivables segregation, former-student recovery, transfer continuity, and dashboard balancing, a specialized automated test suite was constructed and executed.

### Backend Execution Results (`pytest tests/test_student_outstanding_governance.py`):
```text
platform win32 -- Python 3.11.9, pytest-9.2.0, pluggy-1.7.0
plugins: anyio-4.15.1, asyncio-1.4.1
collecting ... collected 5 items

tests/test_student_outstanding_governance.py::test_fees_overview_receivables_segregation_and_reconciliation PASSED [ 20%]
tests/test_student_outstanding_governance.py::test_former_students_recovery_register PASSED [ 40%]
tests/test_student_outstanding_governance.py::test_fee_register_student_status_filters PASSED [ 60%]
tests/test_student_outstanding_governance.py::test_student_exit_preserves_financial_liability PASSED [ 80%]
tests/test_student_outstanding_governance.py::test_enrollment_transfer_preserves_invoice_and_obligations PASSED [100%]

============================= 5 passed in 17.03s =============================
```

### Payment Workflow Regression Results (`pytest tests/test_payment_workflow.py`):
```text
tests/test_payment_workflow.py::test_payment_draft_lifecycle_and_balance_isolation PASSED [ 10%]
tests/test_payment_workflow.py::test_simple_mode_payment_posting PASSED  [ 20%]
tests/test_payment_workflow.py::test_standard_erp_mode_approval_gates PASSED [ 30%]
tests/test_payment_workflow.py::test_posted_payment_minor_edit_retains_receipt PASSED [ 40%]
tests/test_payment_workflow.py::test_posted_payment_financial_edit_supersedes_receipt PASSED [ 50%]
tests/test_payment_workflow.py::test_receipt_reprint_and_duplicate_copy PASSED [ 60%]
tests/test_payment_workflow.py::test_refund_workflow_and_balance_integrity PASSED [ 70%]
tests/test_payment_workflow.py::test_client_idempotency_key_prevents_duplicate_payment PASSED [ 80%]
tests/test_payment_workflow.py::test_receipt_cancellation_immutable_lifecycle PASSED [ 90%]
tests/test_payment_workflow.py::test_financial_period_locking_blocks_mutation PASSED [100%]

============================= 10 passed in 26.79s =============================
```

### Frontend Workspace Verification (`vitest run FeesDedicatedSubmenus.test.tsx`):
```text
Test Files  1 passed (1)
     Tests  12 passed (12)
  Duration  23.75s
```

---

## 2. DETAILED TEST CASE BREAKDOWN

### Test Case 1: Overview Receivables Segregation & Balancing
- **Function:** `test_fees_overview_receivables_segregation_and_reconciliation`
- **Objective:** Verify that `get_fees_overview` computes `active_students_outstanding` and `former_students_outstanding` separately and reconciles to `total_recoverable_outstanding`.
- **Assertion:**
  - `active_students_outstanding == 24000.0`
  - `former_students_outstanding == 35000.0`
  - `total_recoverable_outstanding == 59000.0`
  - `active + former + inactive == total_recoverable`
- **Result:** **PASSED**

### Test Case 2: Former Students Recovery Register
- **Function:** `test_former_students_recovery_register`
- **Objective:** Verify that `GET /api/v1/fees/former-students-recovery` returns all departed students with unpaid debt.
- **Assertion:**
  - `debtors_count >= 1`
  - `total_recoverable_outstanding >= 35000.0`
  - Record contains exact admission number, exit reason (`Discontinued / Relocated`), and exit date.
- **Result:** **PASSED**

### Test Case 3: Fee Register Student Status Filters
- **Function:** `test_fee_register_student_status_filters`
- **Objective:** Verify that `GET /api/v1/fees/register?student_status=active` and `student_status=former` accurately isolate student records without cross-contamination.
- **Assertion:**
  - Active filter returns only students with `is_former == False` and `student_is_active == True`.
  - Former filter returns only students with `is_former == True` and `student_is_active == False`.
- **Result:** **PASSED**

### Test Case 4: Student Exit Preserves Financial Liability
- **Function:** `test_student_exit_preserves_financial_liability`
- **Objective:** Verify that executing an exit on an active student via `POST /api/v1/students/{id}/exit` changes their enrollment state but **leaves their invoice and outstanding balance 100% intact**.
- **Assertion:**
  - Exit returns HTTP 200.
  - `invoice.outstanding_amount` after exit equals initial outstanding balance.
  - Invoice status is NOT cancelled.
  - Student is immediately reflected as former in the fee register with debt preserved.
- **Result:** **PASSED**

### Test Case 5: Class/Batch Transfer Continuity
- **Function:** `test_enrollment_transfer_preserves_invoice_and_obligations`
- **Objective:** Verify that reallocating an enrolled student to a new division/batch retains all existing invoices intact.
- **Assertion:**
  - Invoices for transferred students remain active and valid.
  - Outstanding balances do not change upon enrollment transition.
- **Result:** **PASSED**

---

## 3. QA CONCLUSION

All 5 core backend tests, 10 payment workflow regression tests, and 12 frontend UI tests executed successfully with **100% pass rate**. The student receivables governance system is verified for production deployment.

