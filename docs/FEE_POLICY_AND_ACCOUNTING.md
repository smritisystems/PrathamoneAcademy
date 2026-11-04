# Fee Policy and Accounting Standard
**Document ID**: FPA-001  
**Version**: 1.0-DRAFT  
**Parent Framework**: CIPF-001  
**Status**: APPROVED DEFAULT ARCHITECTURE / DRAFT POLICIES PENDING OWNER CONFIRMATION  
**Target System**: Prashant Academy SMS / Coaching Management System  

---

## 1. Objectives & Executive Summary

This document governs all financial operations, fee structuring, billing, collection, installment schedules, concession workflows, and ledger accounting for Prashant Academy. 

Prashant Academy operates on a **strict transaction ledger architecture**. Financial records are immutable:
- Historical transactions and generated receipts are **never overwritten or hard deleted**.
- Corrections are executed strictly via **audited payment reversals** that automatically re-adjust ledger balances.
- Partial payments, installment splits, and overpayment prevention are strictly enforced at the database transaction layer.

---

## 2. Organization Fee Hierarchy & Structures

```
Institution
  └── Academic Year (e.g., 2024–25)
        └── Fee Categories (Tuition, Admission, Examination, Library, Transport, Lab)
              └── Fee Structures (by Standard / Course / Frequency)
                    └── Student Fee Assignment (with approved Discounts / Scholarships)
                          └── Fee Invoice (Immutable Obligation)
                                ├── Fee Invoice Items (Breakdown by Category)
                                └── Fee Installments (Time-bound Milestones)
                                      └── Payment Allocations ← Payments (Ledger Entries)
                                            └── Payment Receipts (Official Auditable Slips)
```

### 2.1 Fee Categories
Fee Categories categorize the nature of institutional charges:
- `tuition`: Base instructional and coaching fees
- `admission`: One-time enrollment fee (non-refundable)
- `examination`: Term assessments and test-series charges
- `transport`: Route-based conveyance charges
- `library`: Reference books and digital portal subscriptions
- `sports`: Co-curricular facilities
- `other`: Specialized lab kits, competitive study material, ID cards

### 2.2 Payment Frequencies
1. `annually`: Single upfront invoice for the complete academic year.
2. `half_yearly`: Split into two equal or scheduled installments (June and November).
3. `quarterly`: Split into 4 quarterly installments (Q1: June, Q2: September, Q3: December, Q4: February).
4. `monthly`: 10 to 12 monthly installments due on the 10th of every calendar month.
5. `custom`: Custom date and amount milestones tailored to student agreements.

---

## 3. The Benchmark Scenario: ₹24,000 Partial Payment Workflow

To guarantee accounting integrity across all clients and reports, the system implements and tests the following canonical multi-payment workflow:

| Stage | Action / Event | Transaction Amount | Cumulative Paid | Outstanding Balance | System Invoice Status | Receipt Generated |
|---|---|---:|---:|---:|:---:|:---:|
| **0** | Annual Invoice Created | ₹24,000.00 | ₹0.00 | ₹24,000.00 | `unpaid` | — |
| **1** | First Installment / Partial Payment | ₹5,000.00 | ₹5,000.00 | ₹19,000.00 | `partial` | `RCP-2024-000001` |
| **2** | Second Payment | ₹7,000.00 | ₹12,000.00 | ₹12,000.00 | `partial` | `RCP-2024-000002` |
| **3** | Third Payment | ₹4,000.00 | ₹16,000.00 | ₹8,000.00 | `partial` | `RCP-2024-000003` |

### Accounting Ledger Guarantees:
1. **Three Distinct Payment Records**: Stored in `payments` table with IDs, timestamps, payment methods, and user attributions.
2. **Three Unique Receipts**: Stored in `payment_receipts` table with immutable JSON snapshot of invoice state at time of payment.
3. **Allocation Traceability**: Each payment is linked to the specific invoice and installment via `payment_allocations`.
4. **Atomic Balance Updates**:
   $$\text{Outstanding Balance} = \text{Net Invoiced Amount} - \sum(\text{Allocated Payments})$$
   $$\text{Outstanding Balance} = ₹24,000.00 - ₹16,000.00 = ₹8,000.00$$

---

## 4. Formal Fee Business Rules

### FPA-RUL-001: Overpayment and Over-Allocation Prevention
- **Rule**: No payment allocation may exceed the remaining outstanding balance of an invoice or installment.
- **Precondition**: Payment creation requested with allocation list.
- **System Behavior**:
  $$\sum \text{Allocation Amount} == \text{Total Payment Amount}$$
  $$\forall a \in \text{Allocations}: a.\text{amount} \le \text{Invoice}.\text{outstanding\_amount}$$
  If $a.\text{amount} > \text{Invoice}.\text{outstanding\_amount}$, the transaction is rejected with HTTP 400 (`Overpayment not permitted`).
- **Audit**: Failed overpayment attempts logged with student ID and requested amount.

### FPA-RUL-002: Immutable Receipts & Sequential Numbering
- **Rule**: Every successful payment generates exactly one official receipt with format `RCP-{academic_year_id}-{sequence:06d}`.
- **System Behavior**: Generated using a database sequence or locking counter. Receipt payload includes student name, admission number, invoice number, line-item allocations, payment method, reference, and collection officer.
- **Audit**: Receipts cannot be updated or deleted. If a payment is reversed, the receipt status is marked `reversed`.

### FPA-RUL-003: Payment Reversals and Balance Restoration
- **Rule**: Payments may only be reversed by an authorized `Accountant`, `Institute Admin`, or `Super Admin` with a documented mandatory reason.
- **System Behavior**:
  1. Payment status changes to `reversed`.
  2. `reversed_at`, `reversed_by_id`, and `reversal_reason` are stamped.
  3. All allocations under the payment are reversed:
     $$\text{Invoice}.\text{paid\_amount} \leftarrow \max(0, \text{Invoice}.\text{paid\_amount} - \text{Allocation}.\text{amount})$$
     $$\text{Invoice}.\text{outstanding\_amount} \leftarrow \text{Invoice}.\text{net\_amount} - \text{Invoice}.\text{paid\_amount}$$
  4. Corresponding installment balances are restored.
  5. If paid amount returns to ₹0, invoice status reverts to `unpaid`; if $>0$, reverts to `partial`.
  6. Double reversals are strictly rejected with HTTP 400.

### FPA-RUL-004: Concessions, Discounts, and Scholarships
- **Rule**: Concessions may be percentage-based or flat amount deductions applied before invoice generation.
- **Approval Requirement**:
  - Up to 10%: Admission Counselor / Academic Coordinator
  - 11% to 25%: Institute Administrator
  - > 25% or 100% Scholarship: Requires explicit Super Admin / Owner approval in `POLICY_DECISION_REGISTER.md`.

### FPA-RUL-005: Late Fees and Grace Periods
- **Default Policy `[PROPOSED]`**:
  - Grace Period: 7 days post due date (`late_fee_days = 7`).
  - Late Fee Penalty: Flat ₹50 per week or ₹200 one-time fine (`late_fee_amount`).
  - Automated Nightly Batch identifies installments where $\text{current\_date} > \text{due\_date} + 7$ and updates status to `overdue`.

---

## 5. Refunds & Mid-Term Withdrawal Calculations

`[OPEN DECISION: PDR-008]` Proposed refund schedule for student withdrawal:
1. **Prior to Class Commencement**: 100% tuition refund (Admission fee of ₹1,000 retained as processing fee).
2. **Within 15 Days of Commencement**: 80% pro-rata refund of unutilized tuition fees.
3. **Within 16 to 30 Days**: 50% pro-rata refund of unutilized tuition fees.
4. **Beyond 30 Days**: No refund permitted except on medical/compassionate grounds approved directly by the Institute Owner.

---

## 6. Payment Modes & Reconciliation

The system supports:
- `cash`: Verified and reconciled against daily cash drawer limit.
- `upi`: Reconciled using UTR / Transaction Reference number.
- `bank_transfer`: Direct NEFT/RTGS/IMPS with bank reference.
- `cheque`: Recorded with Cheque Number, Bank Name, and Cheque Date. Status tracked from `pending_clearance` to `completed` or `reversed` (bounced).

---

*End of FEE_POLICY_AND_ACCOUNTING.md*

