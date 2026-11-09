---
title: "Financial Permissions and Approval Matrix"
module: "12_RBAC_SECURITY"
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
tags: ["rbac", "permissions", "approval-matrix", "security", "financial-controls", "view-first"]
entities: ["User", "Role", "Permission", "Payment", "Refund", "AuditLog"]
api_routes: ["/api/v1/payments", "/api/v1/fees"]
related_modules: ["09_FEES_PAYMENTS", "10_FINANCE_ACCOUNTING"]
---

# Financial Permissions and Approval Matrix
## Role-Based Access Control, Separation of Duties, and View-First Governance

**Product:** PrathamOne EduOS  
**Edition:** Coaching Institute Edition  
**Baseline Version:** 1.0.0  
**Product Architect:** Jawahar R Mallah  
**Organization:** AITDL — AI Technology & Development Lab  
**Policy Status:** MANDATORY SECURITY GOVERNANCE  

---

## 1. VIEW-FIRST & EXPLICIT EDIT MODE GOVERNANCE (RULE 010)

PrathamOne EduOS enforces strict **View-First Governance** across all financial workspaces, pages, tabs, and student dossiers:
1. **Default View Mode:** All financial screens (Overview, Structures, Invoicing, Collection Desk, Defaulters, Concessions, Online Gateway, Reports) render in read-only View Mode by default.
2. **Scoped Edit Mode:** No user—regardless of role—may create vouchers, edit amounts, alter allocations, or issue refunds without explicitly toggling the scoped Edit Mode.
3. **Session Auto-Reset:** Navigation to another workspace, browser refresh, tab switch, or session timeout immediately resets state back to read-only View Mode.
4. **Separate Reversal & Deletion Authorization:** Deleting a draft or executing a financial reversal strictly requires:
   - Active scoped Edit Mode.
   - Specific RBAC entitlement (`payments:reverse` / `payments:delete_draft`).
   - Modal confirmation with mandatory audit justification (minimum 10 characters).
   - Permanent recording in `audit_logs`.

---

## 2. GRANULAR ROLE-BASED ACCESS CONTROL (RBAC) MATRIX

| Financial Capability / Operation | Super Admin | Sys Admin | Admin | Principal | Accountant | Cashier / Front-Desk | Teacher | Student / Parent |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **View Fee Invoices & Obligations** | Yes | Yes | Yes | Yes | Yes | Yes | Own Batch | Self Only |
| **View Collection Daybook & Reports** | Yes | Yes | Yes | Yes | Yes | Own Shift | No | No |
| **Create Draft Collection Voucher** | Yes | Yes | Yes | Yes | Yes | Yes | No | No |
| **Edit Draft Collection Voucher** | Yes | Yes | Yes | Yes | Yes | Own Drafts | No | No |
| **Delete Draft Collection Voucher** | Yes | Yes | Yes | Yes | Yes | No | No | No |
| **Direct Post Payment (< ₹25,000)** | Yes | Yes | Yes | Yes | Yes | Yes | No | No |
| **Submit Payment for Approval ($\ge$ ₹25,000)**| Yes | Yes | Yes | Yes | Yes | Yes | No | No |
| **Approve ERP Payment Voucher** | Yes | Yes | Yes | Yes | No | No | No | No |
| **Post Approved ERP Payment Voucher** | Yes | Yes | Yes | No | Yes | No | No | No |
| **Minor Edit Posted Payment (Notes/Ref)**| Yes | Yes | Yes | Yes | Yes | No | No | No |
| **Financial Correction on Posted Payment**| Yes | Yes | Yes | No | Yes (Explicit) | No | No | No |
| **Execute Payment Reversal** | Yes | Yes | Yes | Yes | No | No | No | No |
| **Request Refund** | Yes | Yes | Yes | Yes | Yes | Yes | No | No |
| **Approve Refund** | Yes | Yes | Yes | Yes | No | No | No | No |
| **Disburse & Process Refund** | Yes | Yes | Yes | No | Yes | No | No | No |
| **Reprint Duplicate Receipt** | Yes | Yes | Yes | Yes | Yes | Yes | No | Self (Print) |
| **Lock / Unlock Accounting Period** | Yes | Yes | No | No | No | No | No | No |

---

## 3. SEPARATION OF DUTIES & TWO-PERSON INTEGRITY RULES

To prevent insider fraud and inadvertent balance distortion, the following cryptographic and workflow separation boundaries are enforced:

### Rule 1: Segregation of Payment Submission & Approval
$$\text{Submitter}(\text{Voucher}) \ne \text{Approver}(\text{Voucher})$$
A cashier or staff user who submits a payment voucher exceeding ₹25,000 cannot approve their own voucher. The backend verifies `current_user.id != payment.submitted_by_id`.

### Rule 2: Segregation of Refund Approval & Disbursement
$$\text{Approver}(\text{Refund}) \ne \text{Processor}(\text{Refund})$$
The administrator who approves a student refund cannot be the sole processor marking fund disbursement in cash or bank ledger, unless superadmin override is explicitly logged.

### Rule 3: Reversal Authorization Barrier
Reversals can only be executed by administrators, principals, or designated senior accountants. Cashiers and front-desk staff have zero reversal privileges.

---

## 4. AUDIT TRAIL LOGGING ENFORCEMENT

Every transition generates an immutable record in `audit_logs` containing:
- `user_id`: Canonical person ID of the actor.
- `action`: Specific standardized action string (e.g., `payment_posted`, `payment_reversed`, `refund_approved`, `receipt_reprinted`).
- `resource_type`: `payment`, `receipt`, `refund`, `invoice`.
- `resource_id`: Primary key of the affected entity.
- `old_data`: JSON snapshot of prior state.
- `new_data`: JSON snapshot of updated state.
- `details`: Mandatory user-supplied reason string.
- `severity`: `info`, `warning`, `critical`.
- `is_system_audit`: Boolean distinguishing automated system jobs from user actions.
