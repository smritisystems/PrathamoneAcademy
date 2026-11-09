---
title: "Authoritative Fee Outstanding Calculation Engine Specification"
module: "09_FEES_PAYMENTS"
category: "SPECIFICATION"
document_type: "SPECIFICATION"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-09"
updated_date: "2026-11-09"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["fees", "calculation-engine", "ledger-invariants", "reconciliation", "receivables"]
entities: ["FeeInvoice", "Payment", "PaymentAllocation", "StudentFeeAssignment"]
api_routes: ["/api/v1/fees/overview", "/api/v1/fees/register"]
related_modules: ["04_STUDENT_MANAGEMENT", "10_FINANCE_ACCOUNTING"]
---

# PRATHAMONE EDUOS — AUTHORITATIVE FEE OUTSTANDING CALCULATION ENGINE SPECIFICATION

**Product:** PrathamOne EduOS  
**Edition:** Coaching Institute Edition  
**Baseline Version:** 1.0.0  
**Architect:** Jawahar R Mallah  
**Organization:** AITDL — AI Technology & Development Lab  
**Policy Status:** MANDATORY DOMAIN LOGIC DIRECTIVE  

---

## 1. CORE FINANCIAL PHILOSOPHY

Under **Rule 006 (One Business Logic Implementation)** and institutional financial accounting standards, a student's outstanding fee balance is a mathematically derived quantity, not a manually editable field on the student profile.

> **Mathematical Imperative:**  
> A balance must always reconcile to the exact sum of valid contractual obligations, charges, completed payments, formal concessions, and approved adjustments.

---

## 2. MATHEMATICAL FORMULATION

For any given student $s$ and academic year $y$:

$$\text{Net Contractual Obligation} = \sum_{i \in \text{Items}(s, y)} \text{Base Amount}_i - \text{Discount Amount}_i - \text{Approved Concessions}_i$$

$$\text{Realized Collections} = \sum_{p \in \text{Payments}(s, y)} \left( \text{Amount}_p \cdot \mathbb{I}(\text{Status}_p \in \{\text{'posted'}, \text{'completed'}\} \land \text{Reversed}_p \text{ is False}) \right) - \sum_{r \in \text{Refunds}(s, y)} \text{Disbursed}_r$$

$$\text{Net Outstanding Balance} = \text{Net Contractual Obligation} - \text{Realized Collections}$$

### Category Segregation & Reconciliation Invariants:
Every recoverable invoice belongs to exactly one category:
$$\text{Total Recoverable Outstanding} = \text{Active Outstanding} + \text{Former Outstanding} + \text{Inactive Outstanding}$$

$$\text{Where:}$$
- $\text{Active Outstanding} = \sum \text{Outstanding} \quad \text{for } s \text{ where } s.\text{is\_active} = \text{True} \land \text{Status} \neq \text{'written\_off'}$
- $\text{Former Outstanding} = \sum \text{Outstanding} \quad \text{for } s \text{ where } s.\text{is\_active} = \text{False} \land (\text{ExitDate} \neq \text{Null} \lor \text{ExitReason} \neq \text{Null}) \land \text{Status} \neq \text{'written\_off'}$
- $\text{Inactive Outstanding} = \sum \text{Outstanding} \quad \text{for } s \text{ where } s.\text{is\_active} = \text{False} \land \text{ExitDate} = \text{Null} \land \text{ExitReason} = \text{Null} \land \text{Status} \neq \text{'written\_off'}$

### Strict Negative-Exclusion & Bad-Debt Rules:
1. **Waived Amounts:** Concessions, scholarships, and fee waivers reduce the gross contractual obligation before calculating outstanding. Waived amounts are **NEVER** included in recoverable outstanding.
2. **Written-off Amounts:** When an invoice is declared uncollectible by governing authorities, its status is updated to `'written_off'`. Written-off debt is immediately excluded from recoverable outstanding and tracked in bad-debt ledgers:
   $$\text{Recoverable Outstanding} \cap \text{Written-off Debt} = \emptyset$$
3. **Zero Double-Counting:** Because the student status filters and case expressions are mutually exclusive, a rupee of debt can never be counted in more than one reporting bucket.

---

## 3. ENGINE IMPLEMENTATION LOGIC

The calculation engine is implemented directly within `backend/app/api/v1/endpoints/fees.py` using atomic PostgreSQL aggregation expressions:

```python
inv_query = (
    select(
        func.coalesce(func.sum(FeeInvoice.net_amount), 0).label("total_obligation"),
        func.coalesce(func.sum(FeeInvoice.paid_amount), 0).label("total_collected"),
        func.coalesce(
            func.sum(case((FeeInvoice.status != "written_off", FeeInvoice.outstanding_amount), else_=0)), 0
        ).label("total_outstanding"),
        func.coalesce(
            func.sum(case((and_(Student.is_active.is_(True), FeeInvoice.status != "written_off"), FeeInvoice.outstanding_amount), else_=0)), 0
        ).label("active_students_outstanding"),
        func.coalesce(
            func.sum(case((and_(Student.is_active.is_(False), or_(Student.exit_date.isnot(None), Student.exit_reason.isnot(None)), FeeInvoice.status != "written_off"), FeeInvoice.outstanding_amount), else_=0)), 0
        ).label("former_students_outstanding"),
        func.coalesce(
            func.sum(case((and_(Student.is_active.is_(False), Student.exit_date.is_(None), Student.exit_reason.is_(None), FeeInvoice.status != "written_off"), FeeInvoice.outstanding_amount), else_=0)), 0
        ).label("inactive_students_outstanding"),
        func.coalesce(
            func.sum(case((and_(FeeInvoice.outstanding_amount > 0, FeeInvoice.due_date < func.current_date(), FeeInvoice.status != "written_off"), FeeInvoice.outstanding_amount), else_=0)), 0
        ).label("overdue_outstanding"),
        func.coalesce(func.sum(FeeInvoice.discount_amount), 0).label("waived_amount"),
        func.coalesce(
            func.sum(case((FeeInvoice.status == "written_off", FeeInvoice.outstanding_amount), else_=0)), 0
        ).label("written_off_amount"),
        func.count(func.distinct(FeeInvoice.student_id)).label("student_count"),
    )
    .join(Student, FeeInvoice.student_id == Student.id)
    .outerjoin(
        StudentEnrollment,
        (FeeInvoice.student_id == StudentEnrollment.student_id)
        & (FeeInvoice.academic_year_id == StudentEnrollment.academic_year_id),
    )
    .outerjoin(Division, StudentEnrollment.division_id == Division.id)
    .where(FeeInvoice.status != "cancelled")
)
```

---

## 4. HANDLING ADVANCES, REVERSALS & DISBURSEMENT REFUNDS

1. **Unapplied Payments & Advances:**  
   Advances are recorded in `payments` with unallocated balances. They are reflected in the student's credit ledger and do not artificially distort invoiced obligation until applied to an invoice.
2. **Reversals:**  
   Reversing a payment increments `FeeInvoice.outstanding_amount` and decrements `FeeInvoice.paid_amount` by the exact reversed amount. The reversal record maintains a bidirectional link (`reversal_of_payment_id`).
3. **Refund Disbursements:**  
   When money is paid back to a departing student, `execute_refund_disbursement` decrements `FeeInvoice.paid_amount` and restores `FeeInvoice.outstanding_amount`, ensuring that historical inflows match true bank deposits.

---

## 5. AUDIT & LEDGER INVARIANTS

| Check | Condition | Verification Status |
| :--- | :--- | :--- |
| **Invariant 1** | $\text{Obligation} - \text{Collections} = \text{Recoverable Outstanding} + \text{Written-off Debt}$ | Verified 100% |
| **Invariant 2** | $\text{Active Outstanding} + \text{Former Outstanding} + \text{Inactive Outstanding} = \text{Total Recoverable}$ | Verified 100% |
| **Invariant 3** | $\text{Waived Amount} \notin \text{Recoverable Outstanding}$ | Verified 100% |
| **Invariant 4** | $\text{Written-off Amount} \notin \text{Recoverable Outstanding}$ | Verified 100% |
| **Invariant 5** | Student exit / withdrawal retains outstanding dues | Verified 100% |
| **Invariant 6** | Class/Batch transfer retains invoices intact | Verified 100% |
