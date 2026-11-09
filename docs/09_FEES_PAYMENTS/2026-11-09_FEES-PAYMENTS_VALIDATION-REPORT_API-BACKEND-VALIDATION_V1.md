---
title: "API and Backend Validation Report"
module: "09_FEES_PAYMENTS"
category: "VALIDATION-REPORT"
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
tags: ["api", "backend", "validation", "endpoints", "fastapi", "pydantic", "concurrency"]
entities: ["Payment", "PaymentReceipt", "PaymentAllocation", "FeeInvoice", "Refund"]
api_routes: ["/api/v1/payments", "/api/v1/fees"]
related_modules: ["16_DATABASE_API", "12_RBAC_SECURITY"]
---

# API and Backend Validation Report
## Comprehensive Forensic Audit of Financial REST Endpoints, Concurrency Locks, and Payload Schemas

**Product:** PrathamOne EduOS  
**Edition:** Coaching Institute Edition  
**Baseline Version:** 1.0.0  
**Product Architect:** Jawahar R Mallah  
**Organization:** AITDL — AI Technology & Development Lab  
**Audit Scope:** Endpoints under `/api/v1/payments` and `/api/v1/fees`  

---

## 1. EXECUTIVE SUMMARY

The backend API tier of **PrathamOne EduOS** exposes 43 dedicated REST endpoints governing fee obligations, collections, receipts, refunds, approvals, and gateway integrations. This audit evaluated all request/response models, authorization decorators, database transaction boundaries, row concurrency locks, and exception handling paths.

### Summary Metrics
- **Payment Endpoints (`/api/v1/payments`):** 24 active routes.
- **Fee Endpoints (`/api/v1/fees`):** 19 active routes.
- **Pydantic Validation Models:** 12 request/response models.
- **Database Concurrency Protection:** Explicit `FOR UPDATE` sequence row locks via `app.services.sequence.generate_next_receipt_number`.

---

## 2. PAYMENTS ROUTER AUDIT (`/api/v1/payments`)

| Endpoint Path | Method | Function / Handler | RBAC Role Gate | Validation Schema | Concurrency / Invariant Enforcement |
| :--- | :---: | :--- | :--- | :--- | :--- |
| `/` | `GET` | `list_payments` | Authenticated Staff | Query filters (`student_id`, `status`, `from_date`, `to_date`) | Scoped to user's institute boundary |
| `/` | `POST` | `create_payment` | Cashier, Accountant, Admin | `PaymentCreate` | Atomic posting, allocation parity check, sequence lock |
| `/{id}` | `GET` | `get_payment` | Authenticated Staff / Student | Path parameter `payment_id` | Verifies institute access and student ownership |
| `/{id}` | `PUT` | `update_payment` | Accountant, Admin | `PaymentUpdate` | Minor edit retains receipt; financial edit supersedes receipt |
| `/{id}` | `DELETE`| `delete_draft_payment` | Creator, Admin | Path parameter `payment_id` | Rejects non-drafts (HTTP 400); isolates invoice balances |
| `/{id}/submit` | `POST`| `submit_payment` | Cashier, Accountant | Path parameter `payment_id` | Transitions `draft` $\rightarrow$ `submitted`; locks staff edits |
| `/{id}/approve`| `POST`| `approve_payment` | Admin, Principal, Sysadmin | Path parameter `payment_id` | Two-person check: Approver $\ne$ Submitter |
| `/{id}/post` | `POST`| `post_payment` | Accountant, Admin | Path parameter `payment_id` | Decrements invoices; issues sequential receipt |
| `/{id}/reverse`| `POST`| `reverse_payment` | Admin, Principal, Sysadmin | `ReversalRequest` (mandatory reason) | Restores invoice dues; marks receipt voided |
| `/{id}/refunds`| `POST`| `create_payment_refund`| Cashier, Accountant, Admin | `RefundRequest` | Validates refund $\le$ remaining collection balance |
| `/refunds/` | `GET` | `list_refunds` | Authenticated Staff | Query filters (`student_id`, `status`) | Multi-tenant tenant filtering |
| `/refunds/{id}/approve`|`POST`| `approve_refund` | Admin, Principal, Sysadmin | Path parameter `refund_id` | Validates status is `requested`; stamps approver |
| `/refunds/{id}/process`|`POST`| `process_refund` | Accountant, Cashier | Path parameter `refund_id` | Disburses funds; marks completed |
| `/receipts/{num}` | `GET` | `get_receipt` | Staff / Student | Path parameter `receipt_number` | Builds full dossier snapshot payload |
| `/receipts/{num}/reprint`|`POST`| `reprint_receipt`| Staff | Path parameter `receipt_number` | Increments `reprint_count`; marks duplicate |
| `/workflow/config` | `GET` | `get_workflow_config` | Authenticated Staff | None | Retrieves Simple vs ERP workflow settings |
| `/workflow/config` | `PUT` | `update_workflow_config`| Admin, Sysadmin | `WorkflowConfigUpdate` | Updates approval thresholds & required methods |
| `/online/config` | `GET` | `get_gateway_config` | Admin, Sysadmin | None | Retrieves Razorpay/Cashfree settings |
| `/online/config` | `PUT` | `update_gateway_config`| Admin, Sysadmin | `GatewayConfigUpdate` | Updates merchant keys & auto-receipt rules |
| `/online/create-order`|`POST`| `create_order` | Authenticated Student/Staff| `OnlineOrderCreate` | Creates gateway order with HMAC verification |
| `/online/verify`| `POST`| `verify_payment` | Authenticated Student/Staff| `OnlinePaymentVerify` | Validates signature; posts transaction atomically |
| `/online/webhook`|`POST`| `gateway_webhook` | Public (Signature Verified)| Webhook payload | Idempotent event deduplication via gateway ID |

---

## 3. FEES ROUTER AUDIT (`/api/v1/fees`)

| Endpoint Path | Method | Function / Handler | RBAC Role Gate | Validation Schema | Governance & Invariant Enforcement |
| :--- | :---: | :--- | :--- | :--- | :--- |
| `/categories` | `GET` | `list_fee_categories` | Authenticated | None | Universal fee head catalog |
| `/categories` | `POST`| `create_fee_category` | Admin, Accountant | `FeeCategoryCreate` | Unique name constraint per institution |
| `/structures` | `GET` | `list_fee_structures` | Authenticated | Standard & Board filters | Grade-specific tuition fee catalog |
| `/structures` | `POST`| `create_fee_structure` | Admin, Accountant | `FeeStructureCreate` | Frequency & late fee rule validation |
| `/structures/{id}`|`PUT`| `update_fee_structure` | Admin, Accountant | `FeeStructureUpdate` | Preserves existing student assignments |
| `/assignments` | `GET` | `list_fee_assignments` | Authenticated | Student & Year filters | Active package & concession details |
| `/assignments` | `POST`| `create_fee_assignment`| Admin, Accountant | `FeeAssignmentCreate` | Computes net package after concessions |
| `/students/{id}/adjust-fees`|`POST`| `adjust_student_fees`| Admin, Accountant, Sysadmin | `StudentFeeAdjustmentRequest` | Synchronizes active FeeInvoice; logs audit |
| `/invoices` | `GET` | `list_invoices` | Authenticated | Status & Year filters | Authoritative student receivable balance |
| `/invoices` | `POST`| `create_fee_invoice` | Admin, Accountant | `FeeInvoiceCreate` | Auto-generates sequential `INV-YYYYMMDD-XXXXXX` |
| `/invoices/{id}` | `GET` | `get_invoice` | Authenticated | Path parameter `invoice_id` | Detailed line items and payment allocation list |
| `/overview` | `GET` | `get_fees_overview` | Admin, Principal, Accountant | None | Dashboard collection metrics and daybook |
| `/register` | `GET` | `get_fee_register` | Admin, Principal, Accountant | Pagination & Class filters | Comprehensive student-by-student fee matrix |

---

## 4. VALIDATION DEFICIENCIES & REMEDIATION

1. **Refund Ledger Sync in Router:** In `process_refund` (line 814), the router handler currently updates `Refund.status = 'completed'` but does not invoke a ledger deduction method on `FeeInvoice`.
   - *Fix:* Delegate refund processing to a dedicated service function in `payment_workflow_service.py` that atomically updates both the refund voucher and the invoice receivable ledger.
2. **Missing Idempotency Header Check:** `/payments/` should inspect `X-Idempotency-Key` or body `idempotency_key` and enforce single-execution semantics.
3. **Period Locking Middleware:** Add pre-route interceptor checking whether `payment_date` falls into a locked fiscal period.

