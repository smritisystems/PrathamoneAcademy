---
title: "Forensic Audit & Architectural Root Cause: Khushi Fee Commitment, Invoice Allocation & Receipt Reconciliation"
module: "09_FEES_PAYMENTS"
category: "AUDIT-REPORT"
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
tags: ["fees", "reconciliation", "audit", "invoices", "receipts", "allocations", "khushi"]
entities: ["Student", "FeeInvoice", "Payment", "PaymentAllocation", "PaymentReceipt", "StudentFeeAssignment"]
api_routes: ["/api/v1/payments", "/api/v1/fees/students/{student_id}/adjust-fees", "/api/v1/students/{student_id}"]
related_modules: ["04_STUDENT_MANAGEMENT", "10_FINANCE_ACCOUNTING"]
---

# FORENSIC AUDIT REPORT: STUDENT FEE COMMITMENT, INVOICE & RECEIPT RECONCILIATION

**Case Subject:** Khushi (`PA-2024-000019`, Database `student_id = 147`)  
**Target Invoice:** `INV-2026-0147` (`id = 29`)  
**Target Receipts:** `RCP-2026-0180` (₹20,000) and `RCP-2026-0181` (₹17,000)  
**System Baseline:** PrathamOne EduOS 1.0.0  
**Audit Date:** 2026-11-10  
**Auditor:** Jawahar R Mallah, Lead Product Architect, AITDL  

---

## 1. EXECUTIVE SUMMARY & ANOMALY STATEMENT

An urgent discrepancy was detected on the client deployment within the **Student Dossier (Fees Tab)** for Khushi:

| Metric | Amount Reported | Source in UI |
|---|---:|---|
| **Total Fee Obligation / Invoice Total** | ₹85,000 | `FeeInvoice.net_amount` / `student_fee_assignments` |
| **Dossier Summary Paid** | ₹37,000 | Sum of active posted `payments.amount` |
| **Dossier Summary Outstanding** | ₹48,000 | Difference: ₹85,000 - ₹37,000 |
| **Invoice Paid Amount** | ₹24,900 | Column `FeeInvoice.paid_amount` |
| **Invoice Outstanding Amount** | ₹60,100 | Column `FeeInvoice.outstanding_amount` |
| **Receipt #1 (`RCP-2026-0180`)** | ₹20,000 | Superseding receipt for Payment #1 |
| **Receipt #2 (`RCP-2026-0181`)** | ₹17,000 | Superseding receipt for Payment #2 |
| **Sum of Receipts** | **₹37,000** | $\sum(\text{Receipts})$ |
| **Unexplained Invoice Gap** | **₹12,100** | ₹37,000 - ₹24,900 |

Additionally, administrative adjustments to the student fee package appeared in the summary cards and dashboard but did not propagate into the invoice ledger line items.

---

## 2. PHASE 1: DATA FLOW & FORENSIC TRACING

### 2.1 The Baseline Database Record (Import from `Padata.xlsx`)
- **Student Master:** Khushi (`id = 147`, `admission_number = 'PA-2024-000019'`, Class IX).
- **Fee Assignment:** `student_fee_assignments` (`id = 29`):
  - `custom_amount = 85000.00`
  - `concession_amount = 0.00`
- **Initial Invoice:** `fee_invoices` (`id = 29`, `invoice_number = 'INV-2026-0147'`):
  - `total_amount = 85000.00`
  - `discount_amount = 0.00`
  - `net_amount = 85000.00`
  - `paid_amount = 24900.00`
  - `outstanding_amount = 60100.00`
  - `status = 'partial'`
- **Original Payments Imported:**
  - Payment #69: `amount = 16400.00`, Receipt `RCP-2026-0069`.
  - Payment #83: `amount = 8500.00`, Receipt `RCP-2026-0083`.
  - Sum of Original Payments = $16,400 + 8,500 = \mathbf{₹24,900.00}$.
- **Original Payment Allocations:**
  - Allocation #69: Payment #69 $\rightarrow$ Invoice #29 = ₹16,400.00.
  - Allocation #83: Payment #83 $\rightarrow$ Invoice #29 = ₹8,500.00.
  - Total Allocated to Invoice #29 = **₹24,900.00**.

### 2.2 The Client Place Payment Correction
At the client location, the administration identified that Khushi's actual payments were ₹20,000 and ₹17,000 (totaling ₹37,000). The user opened the Payments Register and executed an audited edit on the two payments:
- Payment #69 edited from ₹16,400.00 $\rightarrow$ **₹20,000.00**.
- Payment #83 edited from ₹8,500.00 $\rightarrow$ **₹17,000.00**.

Because financial fields changed, the backend executed Subcase 3B of `execute_payment_edit`:
- Receipt `RCP-2026-0069` was superseded by `RCP-2026-0180` (₹20,000).
- Receipt `RCP-2026-0083` was superseded by `RCP-2026-0181` (₹17,000).
- Payment records in `payments` table were updated to ₹20,000 and ₹17,000.

---

## 3. PHASE 2: ROOT CAUSE DETERMINATION

### Root Cause 1: The Allocation Reapplication Bug in `execute_payment_edit`
In `frontend/src/pages/Payments.tsx` (lines 398–410), the payment edit modal submits:
```typescript
{
  amount: Number(editForm.amount),
  payment_date: editForm.payment_date,
  payment_method: editForm.payment_method,
  transaction_reference: editForm.transaction_reference,
  notes: editForm.notes,
  reason: editForm.edit_reason.trim()
}
```
Notice that `allocations` is omitted from the submission payload.

In `backend/app/services/payment_workflow_service.py` lines 580–584:
```python
new_allocs_input = update_data.get("allocations") or [
    {"invoice_id": a.invoice_id, "installment_id": a.installment_id, "amount": float(a.allocated_amount)}
    for a in old_allocs
]
```
When `update_data.get("allocations")` was `None`, the backend defaulted to copying `a.allocated_amount` from the `old_allocs`!
- Old allocation for Payment #1 was **₹16,400.00**.
- Old allocation for Payment #2 was **₹8,500.00**.

**The Mathematical Disconnect:**
1. Payment #1 was increased to ₹20,000.00, but its allocation was frozen at ₹16,400.00 ($₹3,600.00$ unallocated advance).
2. Payment #2 was increased to ₹17,000.00, but its allocation was frozen at ₹8,500.00 ($₹8,500.00$ unallocated advance).
3. Total Unallocated Amount = $₹3,600.00 + ₹8,500.00 = \mathbf{₹12,100.00}$.
4. Invoice #29 received only $₹16,400.00 + ₹8,500.00 = \mathbf{₹24,900.00}$.
5. Invoice Outstanding remained $₹85,000.00 - ₹24,900.00 = \mathbf{₹60,100.00}$.

### Root Cause 2: Calculation Model Discrepancy between Dossier Summary and Invoice Table
In `backend/app/api/v1/endpoints/students.py` lines 903–905:
```python
total_fees = sum(float(i.net_amount) for i in invoices)
total_paid = sum(float(p.amount) for p in payments if p.status in ("completed", "posted"))
outstanding = max(0.0, total_fees - total_paid)
```
- The Dossier Summary Card calculated `total_paid` dynamically from the `payments` table ($₹20,000 + ₹17,000 = \mathbf{₹37,000.00}$), yielding outstanding $₹85,000 - ₹37,000 = \mathbf{₹48,000.00}$.
- The Invoices Table below it rendered static database columns `FeeInvoice.paid_amount` ($\mathbf{₹24,900.00}$) and `FeeInvoice.outstanding_amount` ($\mathbf{₹60,100.00}$).
- This exposed an irreconcilable visual conflict on the same screen: ₹37,000 paid at the top vs ₹24,900 paid in the row below, exactly explaining the **₹12,100 gap**.

### Root Cause 3: Frontend/Backend Contract Mismatch & Invoice Item Desynchronization
When an administrator adjusted student fees via the "Adjust Fees & Concessions" modal:
1. **Contract Key Mismatch:**
   - Backend `GET /fees/students/{student_id}/fee-details` returned `{ "custom_amount", "assigned_structure", "invoice" }`.
   - Frontend `StudentDetail.tsx` read `custom_package_amount`, `current_structure`, and `current_invoice`.
   - Because the keys differed, the modal defaulted to ₹0 package amount and failed to render the existing invoice snapshot or calculate the live balance preview.
2. **Missing Line Item Sync:**
   - In `backend/app/api/v1/endpoints/fees.py` (`adjust_student_fees`), updating the student fee updated `FeeInvoice.total_amount` and `net_amount`, but never touched `FeeInvoiceItem`. Line items remained at legacy amounts.
3. **Query Invalidation Incompleteness:**
   - On adjustment success, `StudentDetail.tsx` invalidated `student-admin-profile` but did not invalidate `student-fees` or `student-invoices`, leaving stale invoice data on the screen until browser cache was bypassed.

---

## 4. PHASE 3: GLOBAL SYSTEM AUDIT RESULTS (ALL 39 STUDENTS)

A diagnostic run across all 39 enrolled students in the database revealed:
1. **Unallocated Payments:** 0 in local production database (all existing imported payments match allocations).
2. **Reversed Payment Allocation Artifacts:**
   - In `Keshwa` (`id = 141`, `INV-2026-0141`): Payment #107 (₹10,000) was reversed. `FeeInvoice.paid_amount` was decremented to ₹40,000, but `PaymentAllocation` #107 remained in the database with status omitted in naive join queries.
   - In `Aadya` (`id = 155`, `INV-2026-0155`): Voided test payments #175 (₹11.00) and #176 (₹1.00) have historical allocation records.
3. **Conclusion:** The allocation engine requires strict status-aware join logic (`payments.status IN ('completed', 'posted')`) and automatic allocation synchronization during payment editing.

---

## 5. PHASE 4: ARCHITECTURAL RECONCILIATION PLAN

### Step 1: Backend Automatic Allocation Rebalancing in `execute_payment_edit`
When a payment amount is modified and no explicit custom split is supplied:
1. If the payment is linked to a single invoice (standard case), automatically reallocate the payment amount against that invoice up to the invoice net balance.
2. If the new payment amount exceeds the invoice balance, allocate up to the net balance and record the surplus as unallocated advance credit.
3. Synchronize `FeeInvoice.paid_amount` and `FeeInvoice.outstanding_amount`.

### Step 2: Harmonize Frontend and Backend Data Contracts
Update `fees.py` (`get_student_fee_details`) and `StudentDetail.tsx` to dual-bind all property names:
- `custom_amount` AND `custom_package_amount`.
- `assigned_structure` AND `current_structure`.
- `invoice` AND `current_invoice`.

### Step 3: Implement Synchronized Invoice Line Items in `adjust_student_fees`
When an invoice is adjusted:
- Update `FeeInvoice.total_amount`, `discount_amount`, `net_amount`, `outstanding_amount`.
- Upsert or adjust the primary `FeeInvoiceItem` record so that line item totals equal invoice net amount.
- Invalidate all query keys: `['student-fees']`, `['student-invoices']`, `['student-admin-profile']`, `['dashboard-metrics']`.

### Step 4: Authoritative SSOT Display in Student Dossier
Display transparently in the Dossier Fees Tab:
- **Total Invoiced Obligation:** ₹85,000.00
- **Total Paid:** ₹37,000.00
- **Allocated Against Invoices:** ₹37,000.00 (once reallocated)
- **Unallocated Advance:** ₹0.00
- **Net Recoverable Outstanding:** ₹48,000.00

---

## 6. PHASE 5: BEFORE & AFTER RECONCILIATION FOR KHUSHI

| Record Field | Before Reconciliation | After Reconciliation Plan |
|---|---:|---:|
| **Student Commitment** | ₹85,000.00 | ₹85,000.00 |
| **Invoice #29 Net Amount** | ₹85,000.00 | ₹85,000.00 |
| **Payment #69 / RCP-2026-0180** | ₹20,000.00 | ₹20,000.00 |
| **Payment #83 / RCP-2026-0181** | ₹17,000.00 | ₹17,000.00 |
| **Total Receipts Issued** | ₹37,000.00 | ₹37,000.00 |
| **Allocation #69** | ₹16,400.00 (stale) | **₹20,000.00** |
| **Allocation #83** | ₹8,500.00 (stale) | **₹17,000.00** |
| **Total Allocated to Invoice #29** | ₹24,900.00 | **₹37,000.00** |
| **Invoice #29 Paid Amount** | ₹24,900.00 | **₹37,000.00** |
| **Invoice #29 Outstanding Amount** | ₹60,100.00 | **₹48,000.00** |
| **Unallocated Discrepancy** | **₹12,100.00** | **₹0.00** (Resolved) |
| **Dossier vs Invoice Discrepancy** | **₹12,100.00** | **₹0.00** (Resolved) |

---

## 7. POLICY COMPLIANCE & AUTHORIZATION NOTICE

In strict compliance with **PrathamOne EduOS AI Agent Directive (Section 2, Rule 010 & Accidental Data Loss Prevention)**:
- **NO FINANCIAL RECORDS HAVE BEEN MODIFIED.**
- The root cause has been mathematically proven and architecture verified.
- Execution of database reconciliation for Khushi (`PA-2024-000019`) and engine code fixes awaits explicit user authorization.

