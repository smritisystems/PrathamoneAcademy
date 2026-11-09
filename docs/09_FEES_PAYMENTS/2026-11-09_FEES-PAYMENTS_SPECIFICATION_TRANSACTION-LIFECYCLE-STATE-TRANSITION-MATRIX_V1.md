---
title: "Transaction Lifecycle and State Transition Matrix"
module: "09_FEES_PAYMENTS"
category: "SPECIFICATION"
document_type: "MATRIX"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-09"
updated_date: "2026-11-09"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["lifecycle", "state-machine", "matrix", "payments", "refunds", "receipts", "invariants"]
entities: ["Payment", "PaymentReceipt", "FeeInvoice", "Refund", "AuditLog"]
api_routes: ["/api/v1/payments", "/api/v1/payments/{id}/reverse", "/api/v1/payments/{id}/refunds"]
related_modules: ["10_FINANCE_ACCOUNTING", "12_RBAC_SECURITY"]
---

# Transaction Lifecycle and State Transition Matrix
## Formal State Machine, Pre-conditions, Invariants, and Ledger Impact Rules

**Product:** PrathamOne EduOS  
**Edition:** Coaching Institute Edition  
**Baseline Version:** 1.0.0  
**Product Architect:** Jawahar R Mallah  
**Organization:** AITDL — AI Technology & Development Lab  
**Policy Status:** STRICT LIFECYCLE GOVERNANCE  

---

## 1. TRANSACTION STATE MACHINE OVERVIEW

Every monetary transaction in **PrathamOne EduOS** executes under an explicit, deterministic finite-state automaton (DFA). Financial records never transition implicitly. Every state change strictly requires:
1. **Valid current state** adhering to the transition graph.
2. **Actor role authorization** verified via backend RBAC.
3. **Mandatory business validation** (amount limits, refundable balance checks).
4. **Ledger balance recalculation** executed within an atomic database transaction.
5. **Immutable audit log generation** capturing actor, timestamp, IP, old state, and new state.

```
                   ┌───────────────────────────────────────────────┐
                   │               PAYMENT LIFECYCLE               │
                   └───────────────────────────────────────────────┘
                                           │
                                     [Operator Entry]
                                           │
                                           ▼
                                      ┌─────────┐
                                      │  Draft  │
                                      └─────────┘
                                     /     │     \
                     [Direct Post]  /      │      \ [Delete Draft]
             (Simple Mode < ₹25k)  /       │       \
                                  │   [Submit ERP]  ▼
                                  │        │     [DELETED]
                                  │        ▼    (No Ledger Impact)
                                  │   ┌───────────┐
                                  │   │ Submitted │
                                  │   └───────────┘
                                  │        │
                                  │   [Admin Approve]
                                  │        │
                                  │        ▼
                                  │   ┌──────────┐
                                  │   │ Approved │
                                  │   └──────────┘
                                  │        │
                                  │   [Post Voucher]
                                  ▼        ▼
                               ┌─────────────────┐
                               │ Posted / Valid  │ ◄─── (Deducts Invoice Outstanding,
                               └─────────────────┘       Issues Sequential Receipt)
                                        │
                                  ┌─────┴─────┐
                     [Financial Amendment]    [Reversal Request]
                                  │                   │
                                  ▼                   ▼
                         ┌─────────────────┐ ┌─────────────────┐
                         │   Superseded    │ │    Reversed     │
                         │ (Issues Ver N+1)│ │ (Restores Dues, │
                         └─────────────────┘ │  Voids Receipt) │
                                             └─────────────────┘
```

---

## 2. PAYMENT LIFECYCLE STATE TRANSITIONS

| Current State | Target State | Trigger Event / Endpoint | Authorized Roles | Pre-conditions & Validations | Ledger & Invariant Impact |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **None** | `draft` | `POST /payments/` (`action='draft'`) | Cashier, Accountant, Admin | Positive amount, valid `student_id`, valid `academic_year_id` | Zero ledger impact. Invoices untouched. No receipt generated. |
| **None** | `posted` | `POST /payments/` (`action='post'`) | Cashier, Accountant, Admin | Valid Simple Mode criteria (amount < threshold, allowed method) | Invoices decremented. Sequential receipt issued (`REC-...`). |
| **None** | `submitted` | `POST /payments/` (`action='submit'`) | Cashier, Accountant | Valid ERP Mode criteria ($\ge$ threshold or cheque/bank method) | Zero ledger impact. Awaiting administrative review. |
| `draft` | **DELETED** | `DELETE /payments/{id}` | Creator, Admin, Sysadmin | Transaction must be in `draft` status | Voucher removed. Zero impact on invoice balances. Audit entry created. |
| `draft` | `draft` | `PUT /payments/{id}` | Creator, Admin, Sysadmin | Any draft fields may be modified | Invoices untouched. Edit count incremented. |
| `draft` | `submitted` | `POST /payments/{id}/submit` | Cashier, Accountant, Admin | Allocation amounts must equal payment amount | Awaiting approval. Invoices untouched. |
| `draft` | `posted` | `POST /payments/{id}/post` | Accountant, Admin | Simple Mode criteria met; active academic year | Invoices decremented. Sequential receipt issued. |
| `submitted` | `approved` | `POST /payments/{id}/approve` | Admin, Principal, Sysadmin | Two-person segregation: Approver $\ne$ Submitter | Verification complete. Ready for financial posting. |
| `submitted` | `draft` | `POST /payments/{id}/reject` | Admin, Principal, Sysadmin | Mandatory rejection reason provided | Returned to staff queue for data correction. |
| `approved` | `posted` | `POST /payments/{id}/post` | Accountant, Admin | Approved status confirmed | Invoices decremented. Sequential receipt issued. |
| `posted` | `posted` (minor) | `PUT /payments/{id}` | Accountant, Admin | Non-financial change only (`notes`, `ref`, `bank_name`) | Receipt retained. Amendment stamped in receipt JSON. |
| `posted` | `posted` (financial) | `PUT /payments/{id}` | Accountant, Admin | Mandatory audit reason. Valid new allocations. | Old allocations reverted. New allocations posted. Old receipt marked `superseded`. New receipt $N+1$ issued. |
| `posted` | `reversed` | `POST /payments/{id}/reverse` | Admin, Principal, Sysadmin | Active Edit Mode. Mandatory reversal justification. | Invoice dues restored. Receipt marked `voided`. Original payment retained with `reversed_at`. |
| `reversed` | *Terminal* | *None* | *None* | Reversal is immutable | Reversals cannot be undone or re-reversed. |

---

## 3. RECEIPT LIFECYCLE & SUPERSEDING MATRIX

Receipt numbers in PrathamOne EduOS are strictly unique and sequentially generated by the atomic PostgreSQL sequence engine.

| Receipt State | Meaning | Trigger | Printable? | Re-use Permitted? |
| :--- | :--- | :--- | :---: | :---: |
| `valid` | Authoritative original receipt | Initial payment posting | YES (Original Copy) | NO |
| `valid` (reprint) | Physical copy reprint | Operator reprint request | YES ("DUPLICATE COPY" watermark) | NO |
| `superseded` | Replaced by corrected version | Financial correction on posted payment | NO (Watermarked "SUPERSEDED") | NEVER |
| `voided` | Invalidated due to reversal | Payment reversal transaction | NO (Watermarked "VOIDED / CANCELLED") | NEVER |
| `cancelled` | Explicitly cancelled voucher | Admission cancellation / Bad debt | NO (Watermarked "CANCELLED") | NEVER |

---

## 4. REFUND LIFECYCLE STATE TRANSITIONS

Refunds manage the return of collected funds to students or sponsors. Every refund voucher is explicitly tied to an original `payment_id` and student invoice.

| Current State | Target State | Trigger Event / Endpoint | Authorized Roles | Pre-conditions & Validations | Ledger & Invariant Impact |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **None** | `requested` | `POST /payments/{id}/refunds` | Accountant, Cashier, Admin | Refund amount $\le$ (Payment Amount - Prior Non-Rejected Refunds) | Refund voucher created. Dues and payments untouched. |
| `requested` | `approved` | `POST /refunds/{id}/approve` | Admin, Principal, Sysadmin | Verification of student eligibility and bank details | Approved for disbursement. |
| `requested` | `rejected` | `POST /refunds/{id}/reject` | Admin, Principal, Sysadmin | Mandatory rejection reason | Refund closed without disbursement. |
| `approved` | `completed` | `POST /refunds/{id}/process` | Accountant, Cashier | Outward disbursement reference (UTR / Cheque) recorded | **Invoice `paid_amount` decremented by refund amount.** `outstanding_amount` increased. |
| `completed` | *Terminal* | *None* | *None* | Completed refund is immutable | Ledger permanently updated. |

---

## 5. INVARIANT VIOLATION PREVENTION RULES

1. **Rule of Positive Amounts:** All payment and refund inputs must satisfy $\text{amount} > 0.00$. Zero or negative values are rejected with HTTP 400.
2. **Rule of Allocation Parity:** In every posting or modification, $\sum \text{allocated\_amount} \equiv \text{payment\_amount}$. Orphan unallocated values are rejected.
3. **Rule of Refund Ceiling:** For any payment $P$:
   $$\sum_{i=1}^{k} \text{Refund}_i \le P.\text{amount}$$
   Attempting to refund even ₹0.01 above the remaining collection balance is rejected.
4. **Rule of Reversal Finality:** A payment with status `reversed` cannot be reversed again, edited, or refunded.
5. **Rule of Receipt Number Permanence:** Once issued, a receipt number (`REC-YYYYMMDD-XXXXXX`) is permanently associated with its version snapshot. Cancelled or superseded receipt numbers are never recycled or reassigned.
