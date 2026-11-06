---
title: "PrathamOne Academy — Intuitive 1-Click Fee & Receipt Editing"
module: "09_FEES_PAYMENTS"
category: "USER-MANUAL"
document_type: "USER-MANUAL"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-06"
updated_date: "2026-11-06"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["09-fees-payments", "user-manual"]
entities: ["FeeStructure", "FeePlan", "StudentFee", "Payment"]
api_routes: ["/api/v1/fees", "/api/v1/payments"]
related_modules: []
---

# PrathamOne Academy — Intuitive 1-Click Fee & Receipt Editing

> [!NOTE]
> **Status:** All 3 UX fixes have been fully implemented, deployed to the live container environment, verified with 100% automated test coverage (backend & frontend), and pushed to repository branch `master` (Commit `3fea8a7`).

---

## Overview of Implemented Enhancements

To eliminate confusion and remove unnecessary friction for administrators and non-technical institute staff, the application now offers **direct, intuitive 1-click edit options** right where users naturally look for them:

| Fix | Location | Action Button | Capability |
| :--- | :--- | :--- | :--- |
| **Fix 1** | `/fees?tab=receipts` | **"Edit"** on each receipt row | Direct modal to modify receipt amount, date, payment method, cheque details, or transaction references with mandatory audit justification. |
| **Fix 2** | `/fees?tab=plans` | **"Edit"** on each Fee Plan row | 1-click modal to update plan name, category, frequency, installment count, and total amount without needing the Universal Records Editor. |
| **Fix 3** | `/students/{id}` (Fees tab) | **"Adjust Student Fees"** | Prominent action header to adjust agreed package fee, grant concessions/scholarships, switch master plans, and auto-sync active invoices. |

---

## 1. Fix 1: Direct "Edit Receipt" on Receipts Register (`/fees?tab=receipts`)

### Where to Find It
Navigate to **Fees & Payments** &rarr; **Receipts** tab (`http://localhost:80/fees?tab=receipts`).

![Fix 1: Receipts Register with Direct Edit Buttons](/C:/Users/netma/.gemini/antigravity/brain/f0e72778-27df-4928-92a5-dc51f7834a6e/fix1_receipts_with_edit_button.png)

### How It Works
1. Next to the standard **"View & Print"** button on every row, administrators and SysAdmins see an amber **"Edit"** button.
2. Clicking **"Edit"** opens the **Audited Financial Modification** modal:
   - **Amount (₹)**
   - **Payment Date**
   - **Payment Method** (Cash, UPI / Online, Cheque, Card, Net Banking)
   - **Transaction Reference** (Cheque Bank & Number when Cheque is chosen)
   - **Mandatory Audit Reason** (required by strict financial compliance)
3. For SysAdmins, modifying a posted receipt automatically verifies authorization and supersedes the receipt if the amount or method changes.

![Fix 1: Direct Receipt Edit Modal](/C:/Users/netma/.gemini/antigravity/brain/f0e72778-27df-4928-92a5-dc51f7834a6e/fix1_receipt_edit_modal.png)

---

## 2. Fix 2: Direct "Edit Plan" on Fee Structure Catalog (`/fees?tab=plans`)

### Where to Find It
Navigate to **Fees & Payments** &rarr; **Fee Plans** tab (`http://localhost:80/fees?tab=plans`).

![Fix 2: Fee Plans Catalog with Action Column and Edit Buttons](/C:/Users/netma/.gemini/antigravity/brain/f0e72778-27df-4928-92a5-dc51f7834a6e/fix2_fee_plans_with_edit_button.png)

### How It Works
1. The table now includes a dedicated **Action** column with an **"Edit"** button on every fee plan row.
2. Clicking **"Edit"** opens the **Edit Fee Structure** modal:
   - **Plan Name**
   - **Fee Category**
   - **Billing Frequency** (Annual, Term, Monthly, One Time)
   - **Installments Count**
   - **Total Amount (₹)**
   - **Active Status Toggle**
3. Changes save instantly and invalidate catalog caches without requiring manual SQL or Universal Editor navigation.

![Fix 2: Fee Plan Edit Modal](/C:/Users/netma/.gemini/antigravity/brain/f0e72778-27df-4928-92a5-dc51f7834a6e/fix2_fee_plan_edit_modal.png)

---

## 3. Fix 3: "Adjust Student Fees" inside Student Profile (`/students/{id}`)

### Where to Find It
Navigate to any student profile (e.g. **Students** &rarr; select student &rarr; click the **"Fees"** tab).

![Fix 3: Student Profile Fees Tab with Action Header](/C:/Users/netma/.gemini/antigravity/brain/f0e72778-27df-4928-92a5-dc51f7834a6e/fix3_student_profile_fees_tab.png)

### How It Works
1. A prominent blue banner displays **"Student Fee Commitment & Ledger"** with a direct **"Adjust Student Fees"** button.
2. Clicking **"Adjust Student Fees"** opens the **Adjust Student Fee Obligation** dialog:
   - **Live Account Snapshot**: Current Net Fee, Amount Paid so far, and Outstanding Balance.
   - **Assigned Fee Structure Plan**: Dropdown to change the student's base package plan.
   - **Agreed Package Amount (₹)**: Allows custom negotiated tuition fees.
   - **Concession / Scholarship (₹)**: Direct discount input.
   - **Live Calculation Banner**: Previews `New Net Fee = Package - Concession` and `New Outstanding = Net Fee - Paid So Far`.
   - **Mandatory Audit Reason**: Mandatory explanation permanently recorded in compliance logs.
3. Upon submission:
   - The student's `StudentFeeAssignment` is updated.
   - The active `FeeInvoice` is updated (`total_amount`, `discount_amount`, `net_amount`, and recalculated `outstanding_amount`).
   - A permanent `STUDENT_FEE_ADJUSTMENT` audit record is stored.
   - All profile views immediately reflect the new balance.

![Fix 3: Adjust Student Fees Modal Dialog](/C:/Users/netma/.gemini/antigravity/brain/f0e72778-27df-4928-92a5-dc51f7834a6e/fix3_adjust_student_fees_modal.png)

---

## Verification & Test Results

```
Backend Test Suite:
tests/test_sysadmin_fees_permissions.py ....... [ 53%]
tests/test_sysadmin_rbac_remediation.py ......  [100%]
======================= 13 passed in 24.90s =======================

Frontend Test Suite:
Test Files: 24 passed (24)
Tests:      186 passed (186)
Duration:   54.32s

Attribution Compliance:
Total checked: 246 files | Passed: 246 files | Failed: 0
```
