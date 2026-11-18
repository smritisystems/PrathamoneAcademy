---
title: "Existing Fee Invoicing Implementation Audit"
module: "09_FEES_PAYMENTS"
category: "AUDIT-REPORT"
document_type: "REPORT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-18"
updated_date: "2026-11-18"
author: "Jawahar R Mallah"
organization: "Smritisys & AITDL Networks"
status: "Review"
tags: ["fees", "invoicing", "audit", "ssot", "payments", "ledger"]
entities: ["FeeCategory", "FeeStructure", "StudentFeeAssignment", "FeeInvoice", "FeeInvoiceItem", "Payment", "PaymentAllocation", "PaymentReceipt", "Refund", "StudentConcessionApplication"]
api_routes: ["/api/v1/fees", "/api/v1/fees/concessions", "/api/v1/payments"]
related_modules: ["04_STUDENT_MANAGEMENT", "10_FINANCE_ACCOUNTING", "12_RBAC_SECURITY", "16_DATABASE_API"]
---

# Existing Fee Invoicing Implementation Audit

## Scope and method

Read-only inspection of current ORM models, Alembic migrations, fee/payment/concession endpoints and services, frontend routes and screens, API wrappers, and relevant tests/documentation. No application code, database, migration, API, UI, or existing record was changed. No live database query or runtime test was performed; conclusions about operation are code-level findings.

Existing SSOT references reviewed include the [financial transaction lifecycle audit](2026-11-09_FEES-PAYMENTS_ARCHITECTURE-AUDIT_FINANCIAL-TRANSACTION-LIFECYCLE_V1.md) and [fee table/field reuse matrix](2026-11-09_FEES-PAYMENTS_DATA-DICTIONARY_TABLE-AND-FIELD-REUSE-MATRIX_V1.md). Their historical row counts are not treated as current database measurements.

## Executive conclusion

**Fee invoicing is partially implemented, not absent.** The application already has a fee workspace and canonical fee structures, assignments, invoice ledger, payment/allocation workflow, separate receipt snapshots, outstanding balances, and concession/refund workflows. However, the normal invoice creation endpoint is inconsistent with the consolidated schema, and installment scheduling is represented by transient compatibility properties rather than persisted installment records. The frontend’s “Fee Invoicing” tab is a register, not an invoice-generation form.

**A separate Fee Invoicing module is not necessary.** The existing Fees workspace and canonical `/api/v1/fees` and `/api/v1/payments` routes should remain the SSOT. The immediate need is correction and completion of those workflows—not another set of tables, endpoints, or screens.

## Findings by capability

| Capability | Status | Evidence and assessment |
|---|---|---|
| Fee categories and fee structures | **EXISTS** | `fee_categories` and `fee_structures` are canonical models. Structures include academic year, standard, category, amount, frequency, installment count, due-day and late-fee configuration. The Fees screen has a Fee Structures workspace. See [fee.py](../../backend/app/models/fee.py#L39) and [Fees.tsx](../../frontend/src/pages/Fees.tsx#L81). |
| Student fee assignments | **PARTIALLY EXISTS / NEEDS IMPROVEMENT** | `student_fee_assignments` links a student, structure, and academic year. However, `FeeAssignmentCreate` still carries legacy `discount_id` and `scholarship_id`, and `POST /assignments` passes the full payload to the model. Those fields are absent from the current model and were dropped by migration 031. See [fees.py](../../backend/app/api/v1/endpoints/fees.py#L150) and [031_fee_schema_consolidation.py](../../backend/alembic/versions/031_fee_schema_consolidation.py#L19). |
| Fee invoice / demand generation | **PARTIALLY EXISTS / NEEDS IMPROVEMENT** | `fee_invoices`, invoice-number generation, a `POST /invoices` endpoint, and invoice creation during lead-to-admission conversion exist. The importer also creates historical invoices. But the normal invoice endpoint references removed assignment fields and uses `student` without loading or defining it in that function. The frontend API wrapper exposes `invoicesApi.create`, but no frontend call site uses it. Thus the user-facing Fee Invoicing tab does not generate invoices. See [fees.py](../../backend/app/api/v1/endpoints/fees.py#L739), [leads.py](../../backend/app/api/v1/endpoints/leads.py#L2183), [fee_register_importer.py](../../backend/app/services/fee_register_importer.py#L510), and [endpoints.ts](../../frontend/src/api/endpoints.ts#L524). |
| Invoice number and due date | **PARTIALLY EXISTS** | `FeeInvoice` persists a unique invoice number, issue date, and nullable due date. `generate_next_invoice_number` provides sequential numbering; lead conversion sets a due date. The ordinary invoice endpoint is defective, and the adjustment fallback creates an invoice without setting `due_date`. See [fee.py](../../backend/app/models/fee.py#L137), [sequence.py](../../backend/app/services/sequence.py#L160), and [fees.py](../../backend/app/api/v1/endpoints/fees.py#L550). |
| Student-wise payables and outstanding tracking | **EXISTS** | Invoice rows persist total, discount, net, paid, outstanding, status, and due date. `/invoices`, `/students/{student_id}/fee-details`, `/register`, `/overview`, and former-student recovery expose these balances; the UI has a searchable invoice register and defaulter views. See [fees.py](../../backend/app/api/v1/endpoints/fees.py#L414) and [fees.py register](../../backend/app/api/v1/endpoints/fees.py#L1662). |
| Full and partial payments | **EXISTS at invoice level; installment allocation is not reliable** | Payments are separate transactions allocated to invoices. Posting updates invoice paid/outstanding/status balances and issues a receipt; full and partial payment test cases exist. The `installment_id` compatibility path is retired and ignored by `PaymentAllocation`, so this does not establish persistent installment-level settlement. See [payment.py](../../backend/app/models/payment.py#L38), [payment_workflow_service.py](../../backend/app/services/payment_workflow_service.py#L239), and [test_payments.py](../../backend/tests/test_payments.py#L36). |
| Fee receipts | **EXISTS; correctly separate from invoices** | `PaymentReceipt` is its own table/model, linked to `Payment`, with a unique receipt number, version/status, reprint and cancellation metadata. Receipt retrieval, PDF/export, reprint, and cancellation endpoints and printable UI components exist. Receipts are not invoice rows. See [payment.py](../../backend/app/models/payment.py#L165), [payments.py](../../backend/app/api/v1/endpoints/payments.py#L926), and [PaymentReceiptView.tsx](../../frontend/src/components/PaymentReceiptView.tsx). |
| Concessions and scholarships | **EXISTS through the current concession workflow; legacy endpoints are misleading** | Current canonical entities include concession types, student applications, invoice allocations, and sponsor settlements, with eligibility, verification, approval, application, reversal, and sponsor-settlement workflows. Scholarship is a benefit type in this engine. In contrast, the old `/fees/discounts` and `/fees/scholarships` APIs are stubs (empty lists/acknowledgment responses), not working masters. See [fee.py](../../backend/app/models/fee.py#L265), [concessions.py](../../backend/app/api/v1/endpoints/concessions.py#L572), and [concession_service.py](../../backend/app/services/concession_service.py#L718). |
| Refunds | **PARTIALLY EXISTS / NEEDS IMPROVEMENT** | Refund records have request, approval, processing, rejection, and balance-reconciliation logic. However, a refund created for a payment with allocations across multiple invoices is linked to only the first allocation’s invoice; disbursement then adjusts that invoice by the full refund amount. This can misstate invoice-level balances for multi-invoice payments. See [payments.py](../../backend/app/api/v1/endpoints/payments.py#L1024) and [payment_workflow_service.py](../../backend/app/services/payment_workflow_service.py#L158). |
| Adjustments and cancellations | **PARTIALLY EXISTS** | Student fee adjustment can create/update an invoice with an audit reason; invoice deletion is restricted and cancellation retains the numbered invoice; payments can be cancelled/reversed; receipts can be cancelled without deleting history. Invoice cancellation reason/date are appended to notes/audit rather than represented as dedicated invoice cancellation fields. See [fees.py](../../backend/app/api/v1/endpoints/fees.py#L493), [fees.py cancellation](../../backend/app/api/v1/endpoints/fees.py#L997), and [payments.py](../../backend/app/api/v1/endpoints/payments.py#L966). |
| Installment schedules | **PARTIALLY EXISTS / NEEDS IMPROVEMENT** | `FeeStructure.installments_count` is stored, but migration 031 drops `fee_installments`. `FeeInstallment` is now an alias of `FeeInvoiceItem`; its installment number, due date, paid amount, and status are Python properties, not persisted columns. `GET /installments` returns a blank due date and hard-codes `paid_amount` to the item amount. The invoice detail serializer also reads `late_fee_applied`, which the model does not define. See [fee.py](../../backend/app/models/fee.py#L195), [fee.py compatibility alias](../../backend/app/models/fee.py), [031_fee_schema_consolidation.py](../../backend/alembic/versions/031_fee_schema_consolidation.py#L68), and [fees.py](../../backend/app/api/v1/endpoints/fees.py#L870). |

## Existing tables and entity boundaries

Current canonical fee/payment tables are defined by the models and migrations:

- **Masters:** `fee_categories`, `fee_structures`
- **Relationship:** `student_fee_assignments`, `payment_allocations`
- **Receivable ledger:** `fee_invoices`, `fee_invoice_items`
- **Collection transactions and snapshots:** `payments`, `payment_receipts`
- **Refund transactions and controls:** `refunds`, `financial_periods`
- **Concession ledger:** `fee_concession_types`, `fee_concession_applications`, `fee_concession_allocations`, `sponsor_settlements`

Migration 031 explicitly retires the legacy `fee_installments`, `discounts`, and `scholarships` tables and removes the old assignment/payment-allocation foreign keys. Do not recreate those tables as parallel masters or ledgers. Invoice and receipt are separate entities (`fee_invoices` versus `payment_receipts`), joined indirectly through payment allocations/payment records.

## Existing API surface

The routers are registered under `/api/v1` in [router.py](../../backend/app/api/v1/router.py#L93).

- **Fees:** `/fees/categories`, `/fees/structures`, `/fees/assignments`, `/fees/students/{id}/fee-details`, `/fees/students/{id}/adjust-fees`, `/fees/invoices`, `/fees/invoices/{id}`, `/fees/invoices/{id}/cancel`, `/fees/installments`, `/fees/overview`, `/fees/register`, `/fees/former-students-recovery`.
- **Concessions:** `/fees/concessions/types`, `/applications`, and application verify/approve/reject/apply/withdraw/reverse/cancel/sponsor-settlement actions.
- **Payments/receipts/refunds:** `/payments/`, payment submit/approve/post/edit/cancel/reverse, `/payments/receipts-list`, receipt retrieval/PDF/reprint/cancel, refund request/approve/process/reject/list, plus gateway and financial-period routes.

The invoice API wrapper includes `list`, `get`, and `create`; the current Fees UI uses invoice listing for registers and collection but has no invoice-create call. The `Fee Invoicing` tab renders the invoice register rather than an issuance workflow. See [Fees.tsx register](../../frontend/src/pages/Fees.tsx#L3556) and [invoice API wrapper](../../frontend/src/api/endpoints.ts#L526).

## Reuse and overlap

- The canonical workflow is already shared: the Fees workspace, dedicated Fee Collection page, Payments ledger, and Receipt page call the same fee/payment APIs and reuse receipt components.
- The main Fees workspace includes collection, payment, and receipt tabs while separate `/fees/collect/:studentId`, `/payments`, and `/receipts/...` pages also exist. These are overlapping entry points, not duplicate databases; avoid adding another fee screen before clarifying the intended navigation.
- `FeeInvoiceItem` is currently used both as invoice line item and as a compatibility substitute for installments. This conflates itemization and schedule semantics; invoice creation can add a full-fee item and additional installment-shaped items to the same table.
- The prior data-dictionary matrix correctly identifies retired tables, but the live code still contains stale compatibility fields/endpoints. The current model and migrations should govern any future work.

## Final recommendation

1. **Is Fee Invoicing already implemented?** **Partially.** Invoice ledger records, numbering, listing, balances, and some event-driven creation paths exist. The ordinary create endpoint and installment lifecycle have material correctness gaps; the UI does not provide invoice generation.
2. **Is a separate Fee Invoicing module necessary?** **No.** The existing Fees workspace already has a Fee Invoicing tab and the application already has canonical entities and routes.
3. **What needs improvement?** Correct the existing assignment/invoice API contract against migration 031; provide a usable invoice-demand issuance workflow in the existing Fees workspace; define whether installments are real persisted schedules or invoice line items and remove the current mixed representation; make refund reconciliation allocation-aware; and retire or redirect the old discount/scholarship stubs to the governed concession workflow.
4. **Can this be supported without duplicate tables/APIs/screens?** **Yes.** Reuse `fee_invoices`, `fee_invoice_items` (for line items only), `student_fee_assignments`, `payment_allocations`, `payments`, `payment_receipts`, and the current concession/refund ledgers. Any installment data requirement should first be resolved against the existing schema consolidation and SSOT rules rather than recreating the retired table by default.

No implementation plan is included in this audit. Await approval before proposing implementation details.
