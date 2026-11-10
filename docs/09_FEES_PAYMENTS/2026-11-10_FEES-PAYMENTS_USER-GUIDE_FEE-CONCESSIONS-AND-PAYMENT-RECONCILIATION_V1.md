---
title: "Fee Concession Application and Payment Reconciliation User Guide"
module: "09_FEES_PAYMENTS"
category: "USER-GUIDE"
document_type: "MANUAL"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-10"
updated_date: "2026-11-10"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["fees", "concessions", "scholarships", "view-mode", "reconciliation"]
entities: ["FeeConcession", "FeeInvoice", "PaymentAllocation", "Student"]
api_routes: ["/api/v1/students/{id}/fees/adjustment", "/api/v1/concessions"]
related_modules: ["04_STUDENT_MANAGEMENT", "10_FINANCE_ACCOUNTING"]
---

# Fee Concession Application & Payment Reconciliation Guide

## 1. Executive Root-Cause Analysis: Khushi's Remote Payment Edit Issue

### 1.1 The Incident Observed on Remote Client Software
On the remote client software instance, the user noticed a financial discrepancy in the Student Dossier for student **Khushi** (Admission No: `PA-2024-000019`, Invoice: `INV-2026-0147`):
- **Top Dashboard Cards:**
  - Total Fee Obligation: **₹85,000**
  - Total Paid Amount: **₹37,000**
  - Outstanding Balance: **₹48,000**
- **Invoices Table (`INV-2026-0147`):**
  - Total Net: **₹85,000**
  - Paid Amount: **₹24,900**
  - Outstanding Amount: **₹60,100**
- **Payments & Receipts Table:**
  - `RCP-2026-0180` (Txn `TXN-2026-0083`): **₹20,000**
  - `RCP-2026-0181` (Txn `TXN-2026-0069`): **₹17,000**
  - **Sum of Receipts:** ₹20,000 + ₹17,000 = **₹37,000**

There was an unexplained gap of **₹12,100** between the Receipts/Payment records (₹37,000) and the Invoice Paid amount (₹24,900).

---

### 1.2 Forensic Technical Diagnosis
The discrepancy arose because the user on the remote client software edited the payment amounts directly via the Payments interface:
1. Originally, Payment #69 was recorded as ₹16,400 and Payment #83 as ₹8,500 (totaling ₹24,900).
2. The user edited the payment amounts to **₹20,000** and **₹17,000** to reflect corrected receipt collections.
3. In legacy backend logic (`execute_payment_edit` in `payment_workflow_service.py`), when a payment amount was updated without explicit allocation payload, the system retained the *existing* `PaymentAllocation` records (₹16,400 and ₹8,500).
4. The top summary cards dynamically aggregated all payments (`sum(payments.amount) = ₹37,000`), whereas the Invoices table displayed the static `FeeInvoice.paid_amount` derived from invoice allocations (`₹16,400 + ₹8,500 = ₹24,900`).
5. This left $₹3,600 + ₹8,500 = \mathbf{₹12,100}$ as unallocated funds, creating the visual and accounting gap.

---

### 1.3 Permanent Architectural & Data Fix Applied
To prevent this issue permanently:
1. **Automated Allocation Rebalancing Engine:**
   In `backend/app/services/payment_workflow_service.py`, `execute_payment_edit` was enhanced. Whenever a payment amount is modified and allocations are not manually passed, the service automatically detects the delta and rebalances the payment's allocations against the linked invoice up to its net outstanding amount. The invoice's `paid_amount` and `outstanding_amount` are atomically recomputed.
2. **Database Migration `037_reconcile_khushi_allocations`:**
   An automated Alembic migration was deployed that reconciled Khushi's exact payment allocations:
   - Payment #69 (`RCP-2026-0181`): reallocated to **₹17,000.00**
   - Payment #83 (`RCP-2026-0180`): reallocated to **₹20,000.00**
   - Invoice `INV-2026-0147`: updated to `paid_amount = ₹37,000.00`, `outstanding_amount = ₹48,000.00`.
   - Result: 0 discrepancy.

---

## 2. PrathamOne EduOS View-First Governance (Rule 010)

PrathamOne EduOS enforces strict **View-First Governance** across all workspaces:
- By default, all pages, profiles, and financial tabs load in **View Mode Active (Read-Only Safety Lock)**.
- Sensitive action buttons (such as `Adjust Student Fees`, `Edit Student`, `Delete Record`) are disabled and visually tagged as `(LOCKED)`.
- Users cannot perform unintended modifications.
- To execute any fee adjustment, waiver, concession, or edit, an authorized administrator must explicitly click the orange **"Enable Edit Mode"** toggle in the top-right banner.
- Navigating away from the page or logging out automatically reverts the system to View Mode.

---

## 3. Step-by-Step Procedure: How to Give Fee Concessions

PrathamOne EduOS provides two distinct methods for granting fee concessions:
1. **Method A: Direct Student Fee Adjustment** (Directly in Student Dossier for customized concessions, sibling discounts, or package fee adjustments).
2. **Method B: Institutional Concession & Scholarship Module** (Centralized policy-driven scholarships with multi-tier approval under `/fees`).

---

### Method A: Direct Student Fee Adjustment (Student Dossier)

#### Step 1: Navigate to Student Dossier & Observe View Mode
1. Go to **Students** in the navigation menu.
2. Search and select the student (e.g., **Khushi**).
3. Click on the **Fees** tab.
4. Notice the top banner: `VIEW MODE ACTIVE • Read-Only Safety Lock`.
5. Under **Student Fee Commitment & Ledger**, observe that the button reads **"Adjust Student Fees (LOCKED)"**.

![Step 1: View Mode Active](file:///C:/Users/netma/.gemini/antigravity/brain/f0e72778-27df-4928-92a5-dc51f7834a6e/concession_step1_view_mode.png)

---

#### Step 2: Enable Edit Mode
1. Move your cursor to the top-right header of the screen.
2. Click the orange button: **"Enable Edit Mode"**.
3. The top banner turns into `EDIT MODE ACTIVE`, and mutation controls are unlocked.
4. The button under Fee Commitment changes from locked to an active blue button: **"Adjust Student Fees"**.

![Step 2: Edit Mode Unlocked](file:///C:/Users/netma/.gemini/antigravity/brain/f0e72778-27df-4928-92a5-dc51f7834a6e/concession_step2_edit_mode_unlocked.png)

---

#### Step 3: Open the Adjustment Modal & Apply Concession
1. Click the **"Adjust Student Fees"** button.
2. The modal **"Adjust Student Fee Commitment & Concessions"** appears.
3. Review the **Account Snapshot**:
   - Current Net Fee: e.g., ₹85,000
   - Paid So Far: e.g., ₹37,000
   - Outstanding Balance: e.g., ₹48,000
4. In the form fields:
   - **Agreed Package Amount (₹):** Enter or verify the total tuition commitment (e.g., `85000`).
   - **Concession / Discount (₹):** Enter the concession amount (e.g., `10000` for a ₹10,000 sibling or merit concession).
5. Review the **Live Calculation Preview**:
   - *New Net Fee:* ₹75,000 (calculated as ₹85,000 - ₹10,000)
   - *New Outstanding Balance:* ₹38,000 (calculated as ₹75,000 - ₹37,000 paid)
6. Enter a **Mandatory Reason for Adjustment** (e.g., *"Approved sibling concession as per management directive"*).
7. Click **"Apply Adjustment"**.

![Step 3: Adjustment Modal](file:///C:/Users/netma/.gemini/antigravity/brain/f0e72778-27df-4928-92a5-dc51f7834a6e/concession_step3_adjust_modal.png)

---

#### Step 4: Verification & Audit Trail
- The system atomically adjusts the invoice net total and registers an audit trail record in the student's lifecycle history.
- Historical receipts and existing payment allocations remain 100% intact and immutable.
- The new outstanding balance is updated immediately across both the Student Dossier and the accounting ledgers.

---

### Method B: Institutional Concession & Scholarship Engine

For institutional-level policies where students submit applications or qualify based on rules:
1. Navigate to **Fees & Accounting** (`/fees`) from the main sidebar.
2. Click on the **Concessions & Scholarships** tab.
3. **Configure Categories:** Define policies such as:
   - *Merit Scholarship* (e.g., 25% for >90% score)
   - *Sibling Discount* (e.g., flat ₹5,000 discount)
   - *Staff-Child Concession* (e.g., 50% waiver)
   - *Need-Based Assistance*
4. **Submit Application:** Link the student to the policy with supporting verification documents.
5. **Multi-Level Approval:** An authorized Super Admin / Accountant reviews and approves the application.
6. Once approved, the concession automatically applies against the student's next generated invoice or creates a credit memo ledger entry.

---

## 4. Client Software Deployment Instructions

To apply these fixes and features on the remote client server:
1. Open terminal on the remote host:
   ```bash
   cd /path/to/PrashantAcademy
   git pull origin master
   ```
2. Run database migrations:
   ```bash
   docker exec prashant_academy_backend alembic upgrade head
   ```
3. Restart frontend/backend containers if required:
   ```bash
   docker compose restart
   ```
All reconciliations, auto-balancing engines, and View-First concession workflows will be live immediately.
