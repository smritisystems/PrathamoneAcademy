---
title: "Inline Quick Fee Collection & Receipt Generation in Batch Monthly Fee Collection Matrix"
module: "09_FEES_PAYMENTS"
category: "FEATURE-REPORT"
document_type: "REPORT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-25"
updated_date: "2026-11-25"
author: "Jawahar R Mallah"
organization: "Smritisys & AITDL Networks"
status: "Approved"
tags: ["fees", "payments", "receipts", "batch-matrix", "inline-collection", "ssot"]
entities: ["Payment", "PaymentAllocation", "PaymentReceipt", "FeeInvoice", "FeeInvoiceInstallment", "FeeCategory", "LookupItem"]
api_routes: ["/api/v1/payments/", "/api/v1/payments/receipts/{receipt_number}", "/api/v1/payments/receipts/{receipt_number}/reprint", "/api/v1/payments/receipts/{receipt_number}/pdf", "/api/v1/fees/invoices", "/api/v1/fees/invoices/{invoice_id}", "/api/v1/fees/categories", "/api/v1/fees/student-monthly-pivot", "/api/v1/settings/lookups"]
related_modules: ["09_FEES_PAYMENTS", "14_PRINTING_DOCUMENTS", "12_RBAC_SECURITY"]
---

# Inline Quick Fee Collection & Receipt Generation

## 1. Audit Summary

Prior to implementation, the **Batch Monthly Fee Collection Matrix** (`StudentMonthlyFeePivot.tsx`, hosted inside `BatchMonthlyFeeMatrix.tsx` under `/fees/matrix`) opened a **Receive Fee Payment** modal (`quickCollectData`) that only displayed the student summary and redirected operators to `/fees/collection` (Collection Desk) or `/fees/collect/:studentId` (Collection Terminal).

Key audit findings across the authoritative payment and receipt engines:
- **Authoritative Payment API (`POST /api/v1/payments/`)**: Already enforces role-based access (`superadmin`, `admin`, `accountant`, `staff`, `principal`, plus `sysadmin`), institution scoping, closed financial period checks, PostgreSQL row-level locks (`with_for_update`), `idempotency_key` deduplication, strict allocation sum equality, and sequential receipt generation (`execute_payment_posting`).
- **Overpayment & Advance Policy**: The backend strictly rejects payments exceeding `FeeInvoice.outstanding_amount` (HTTP 400) because all `PaymentAllocation` rows require a non-null `invoice_id` and there is no unallocated student credit wallet. Accordingly, **Advance Payment** allocates ahead toward future scheduled installments or remaining active invoice balance, while overpayment beyond outstanding dues is blocked.
- **Audit Trail Gap Identified**: `create_payment` in `backend/app/api/v1/endpoints/payments.py` previously did not write an `AuditLog` record on direct `post`, `submit`, or `draft` creation (only `post_payment` and `update_payment` did). This was resolved.
- **Invoice Item Fee Head Exposure**: `GET /api/v1/fees/invoices/{invoice_id}` did not include `fee_structure_id`, `fee_category_name`, or `structure_name` on returned `items`. These existing `FeeInvoiceItem` columns were exposed without schema changes.

## 2. Files Modified & Created

### Backend
- `backend/app/api/v1/endpoints/payments.py`: Added `log_payment_audit` entries (`payment_draft_created`, `payment_submitted`, `payment_submitted_for_approval`, `payment_posted`) inside `create_payment` capturing actor, timestamp, amount, payment method, references, receipt number, and allocations.
- `backend/app/api/v1/endpoints/fees.py`: Exposed `fee_structure_id`, `fee_category_name`, and `structure_name` on `FeeInvoiceItem` payloads in `get_invoice`.
- `backend/tests/test_inline_quick_fee_collection.py`: Added end-to-end backend tests covering partial payments, multiple installments, advance payments, previous dues, Cash/UPI/Bank Transfer/Cheque modes, payment date separate from fee period, idempotent duplicate submission, overpayment/invalid amount rejection, PDF generation, receipt reprinting without duplicate payment creation, pivot refresh, and RBAC restriction.

### Frontend
- `frontend/src/components/fees/InlineQuickFeeCollectionModal.tsx`: New modular inline quick-collection & receipt preview modal reusing `Modal`, `PaymentReceiptView`, `printReceiptElement`, and existing APIs.
- `frontend/src/components/fees/StudentMonthlyFeePivot.tsx`: Replaced the redirect-only modal with `InlineQuickFeeCollectionModal`, wired in-place matrix refresh (`refetch()` + query invalidation), and enabled audited reprint support on the matrix receipt modal.
- `frontend/src/components/PaymentReceiptView.tsx`: Added optional `showReprintButton` and `onReceiptUpdated` props triggering `POST /api/v1/payments/receipts/{receipt_number}/reprint` and printing the duplicate copy without creating a new payment.
- `frontend/src/api/endpoints.ts`: Extended `paymentsApi.create` TypeScript signature with `cheque_date` and `idempotency_key` fields already accepted by the backend.
- `frontend/src/test/InlineQuickFeeCollection.test.tsx`: Added Vitest component/integration tests covering configuration-driven dropdowns, live calculations, validation, multi-installment allocation, previous dues, advance payment, inline receipt preview, print, PDF download, reprint, matrix refresh, and View-First / RBAC locks.

## 3. Workflow & Financial Safeguards

1. **Configuration-Driven Options**: Payment modes are loaded dynamically from `GET /api/v1/settings/lookups?category=PAYMENT_METHOD` (with fallback to `student-monthly-pivot` `filter_options.payment_methods`). Fee allocation options and fee heads are derived from the student's `FeeInvoice` records, `FeeInstallment` schedules, `FeeInvoiceItem` records, and `GET /api/v1/fees/categories`.
2. **Live Payment Calculations**: Displays Existing Realized, Current Pending Balance, Entered Payment Amount, Remaining Balance After Payment, and Post-Collection Status (`PAID`, `PARTIAL`, `UNPAID`, or `OVERPAYMENT`).
3. **Commit-Before-Receipt Guarantee**: Inline receipt preview (`PaymentReceiptView`) is rendered only after `POST /api/v1/payments/` commits and returns `receipt_number` (or shows an approval-pending notice in Standard ERP mode when `status === 'submitted'`).
4. **View-First & RBAC Governance**: Enforces `finance:fees` Edit Mode (with an inline unlock action for authorized collectors) and blocks non-collector roles on both frontend and backend.
5. **Secondary Workflows Retained**: Links to Collection Desk (`Current Tab`) and Collection Terminal (`New Window`) remain available in the modal footer.
