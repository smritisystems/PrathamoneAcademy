---
title: "Payment Refunds and Reversals Governance & Operational Workflow Guide"
module: "09_FEES_PAYMENTS"
category: "USER-GUIDE"
document_type: "GUIDE"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-18"
updated_date: "2026-11-18"
author: "Jawahar R Mallah"
organization: "Smritisys & AITDL Networks"
status: "Approved"
tags: ["payments", "refunds", "reversals", "financial-ledger", "audit", "governance"]
entities: ["Payment", "PaymentRefund", "Invoice", "FeeReceipt"]
api_routes: ["/api/v1/payments/{payment_id}/refunds", "/api/v1/payments/{payment_id}/reverse", "/api/v1/payments/refunds/{refund_id}/approve", "/api/v1/payments/refunds/{refund_id}/disburse", "/api/v1/payments/refunds/{refund_id}/reject"]
related_modules: ["09_FEES_PAYMENTS", "10_FINANCE_ACCOUNTING", "12_RBAC_SECURITY"]
---

# PrathamOne EduOS — Payment Refunds & Reversals Operational Workflow Guide

## 1. Executive Summary

In **PrathamOne EduOS**, financial transactions are protected by strict accounting integrity rules, audited ledgers, and Rule 010 (View-First Governance). To maintain non-repudiation and prevent accidental balance alterations, the system strictly distinguishes between two distinct financial operations:

1. **Payment Reversal (`POST /api/v1/payments/{payment_id}/reverse`)**: Correction of operational data-entry errors, bounced cheques, or duplicate collections.
2. **Payment Refund (`POST /api/v1/payments/{payment_id}/refunds`)**: Genuine reimbursement of funds back to a student or parent (e.g., student course withdrawal, scholarship recalculation, or excess tuition deposit).

---

## 2. Core Architectural Principles & SSOT Compliance

### 2.1 Rule 010: Global View-First & Explicit Edit Mode Governance
- The Payment History & Transactions ledger (`/payments`) opens by default in **View Mode (Read-Only Safety Lock)**.
- Reversal and Refund action triggers (`Reverse`, `Refund`) are strictly disabled and hidden until an authorized administrator explicitly clicks **"Enable Edit Mode"**.
- Edit mode activation is ephemeral; route navigation or session expiration immediately locks the workspace back to View Mode.

### 2.2 Reversals vs. Refunds: Decision Matrix

| Capability / Dimension | Audited Payment Reversal | Multi-Stage Payment Refund |
| :--- | :--- | :--- |
| **Typical Use Case** | Bounced cheques, duplicate entries, payment gateway sync error, cashier typo. | Course withdrawal, student drop-out, overpayment return, fee waiver rebate. |
| **Receipt Impact** | Linked receipt (`REC-...`) is marked **VOIDED** with watermark; cannot be re-issued. | Linked receipt remains valid; sequential refund voucher (`REF-...`) is issued. |
| **Invoice Balance Impact** | Restores invoice `outstanding_amount` to its pre-payment state ($+\text{Amount}$). | Adjusts invoice `paid_amount` downward and increments balance ($+\text{Amount}$). |
| **Allowed Scope** | Full transaction only; must be in `posted` or `draft` status. | Partial or Full; cannot exceed original payment or remaining refundable ceiling. |
| **Approval Workflow** | Instant administrative reversal with mandatory audited reason logging. | 3-stage Segregation of Duties: `requested` $\rightarrow$ `approved` $\rightarrow$ `completed`. |
| **Disbursement Channels** | N/A (reversal does not physically transfer money out; cancels receipt record). | Bank Transfer (NEFT/RTGS), Cheque, Cash, UPI, or Original Payment Gateway. |

---

## 3. Step-by-Step Operational Workflows

### 3.1 Audited Payment Reversal Procedure
1. Navigate to **Fees & Payments** $\rightarrow$ **Payments Ledger** (`/payments`).
2. Click **Enable Edit Mode** in the golden banner at the top of the ledger.
3. In the transaction row, locate the target posted payment and click **Reverse** (crimson button).
4. Review the modal warning:
   > *"Reversing receipt RCP-YYYY-XXXX for ₹X will void the receipt and restore the outstanding balance on the student invoice."*
5. Input the mandatory **Audited Reason for Reversal** (minimum 5 characters).
6. Click **Confirm Reversal**.
7. The payment status changes to `reversed`, the receipt is stamped `VOIDED`, and the audit log records the timestamp, user ID, and justification.

### 3.2 Formal Multi-Stage Refund Procedure
1. In active **Edit Mode** on `/payments`, click **Refund** (amber button) on the desired payment row.
2. Inspect the **Refund Limits & Balance Protection** card displaying:
   - Original Payment Amount
   - Maximum Refundable Ceiling ($\sum \text{Refunds} \le \text{Payment Amount}$)
3. Enter the **Refund Amount (₹)**.
4. Select the **Refund Method** (`Bank Transfer (NEFT/RTGS)`, `UPI`, `Cheque`, `Cash`).
5. Enter the **Audited Reason for Refund** (mandatory).
6. Optionally enter the Bank UTR / Cheque Reference number.
7. Click **Submit Refund**.
8. The refund request is queued in the **Refund Requests & Disbursement Ledger** at the bottom of `/payments` under `REQUESTED` status.
9. An authorized accounting officer reviews the request and clicks:
   - **Approve**: Validates institutional entitlement.
   - **Disburse**: Confirms bank execution, generates official voucher `REF-YYYYMMDD-XXXXXX`, and finalizes the ledger entry.
   - **Reject**: Rejects the claim with mandatory audit comments.

---

## 4. API Reference Endpoints

- `POST /api/v1/payments/{payment_id}/refunds`: Creates a new refund request adhering to refundable balance ceilings.
- `POST /api/v1/payments/{payment_id}/reverse`: Voids receipt, updates invoice balance, and sets payment to `reversed`.
- `POST /api/v1/payments/refunds/{refund_id}/approve`: Approves a pending refund request (Accountant/Admin role).
- `POST /api/v1/payments/refunds/{refund_id}/disburse`: Disburses funds and updates the student invoice ledger.
- `POST /api/v1/payments/refunds/{refund_id}/reject`: Rejects the requested refund.

---

*Authored by Jawahar R Mallah | Smritisys & AITDL Networks | PrathamOne EduOS 1.0.0*
