---
title: "Fee Invoicing Workflow Remediation and Completion Plan"
module: "09_FEES_PAYMENTS"
category: "IMPLEMENTATION-PLAN"
document_type: "PLAN"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-18"
updated_date: "2026-11-18"
author: "Jawahar R Mallah"
organization: "Smritisys & AITDL Networks"
status: "Implemented"
tags: ["fees", "invoicing", "installments", "refunds", "concessions", "migration"]
entities: ["FeeInvoice", "FeeInvoiceItem", "FeeInvoiceInstallment", "Payment", "PaymentAllocation", "PaymentReceipt", "Refund", "RefundAllocation", "StudentConcessionApplication"]
api_routes: ["/api/v1/fees", "/api/v1/fees/concessions", "/api/v1/payments"]
related_modules: ["04_STUDENT_MANAGEMENT", "10_FINANCE_ACCOUNTING", "12_RBAC_SECURITY", "16_DATABASE_API", "18_TESTING_QA"]
---

# Fee Invoicing Workflow Remediation and Completion Plan

## Status and scope

**Status: Implementation complete; staging and deployment preflight pending.**

Implementation approval was subsequently granted. The existing Fees workspace and canonical financial entities have been remediated against this plan, and local validation is complete. An additive migration revision is ready for environment-specific preflight; migration 054 has not been applied to any database, and no existing financial records have been modified by a migration.

The plan completes the existing Fees workspace and canonical fee/payment workflows. It does not propose a second fee module, a parallel invoice ledger, or replacement receipt workflow.

The code-level findings are based on the [existing Fee Invoicing audit](2026-11-18_FEES-PAYMENTS_AUDIT-REPORT_EXISTING-FEE-INVOICING-IMPLEMENTATION_V1.md). Migration state must still be preflighted separately in each deployment environment before applying revision 054.

### Implementation status

- The existing Fees workspace issues invoices through the shared invoice service and requires an explicit persisted schedule. Lead conversion uses that service as well.
- Scheduled payments are validated against invoice and installment balances; invoice-wide allocations are assigned oldest-due-first, including legacy/gateway allocations at posting. Refunds record proportional allocations against original payment allocations and reconcile each affected invoice and schedule.
- The governed concession service remains authoritative and reconciles the invoice, item discounts, and installment schedule using exact-cent allocation. A concession may reduce a schedule row to zero; newly issued schedule rows must be positive before a concession is applied.
- Historical invoices without schedules and legacy refund requests without allocation details remain supported as historical records. No missing schedule or refund allocation is fabricated.
- Revision 054 is authored with schema/head preflight and guarded downgrade behavior. It remains unapplied pending staging and environment-specific preflight.
- Local verification passed: 18 payment workflow/gateway tests, frontend production build, Python compilation, documentation validation, and all 667 corporate source-header checks. Production-like staging migration and reconciliation remain rollout gates.

### Principles approved in principle

- Preserve the existing Fees workspace and canonical financial entities; add no duplicate module or parallel financial workflow.
- Every newly issued invoice must have at least one valid persisted schedule. Historical invoices without schedules remain supported as invoice-level payables.
- Allocate invoice-wide payments oldest due date first, then installment number.
- When no invoice is selected, allocate refunds proportionally across the original posted payment allocations.
- Apply approved concessions consistently to schedules with exact backend rounding.
- Never fabricate historical schedules or refund-allocation detail.
- Preserve invoice numbers, receipt snapshots, financial records, and audit history.
- Make revision 054 conditional on verified deployed schema and Alembic-head preflight.

## 1. Current architecture and dependencies

### Canonical entities and workflows

- `FeeCategory`, `FeeStructure`, and `StudentFeeAssignment` are the existing fee master, configuration, and student-assignment entities.
- `FeeInvoice` is the canonical student payable. `FeeInvoiceItem` represents invoice lines, not installment schedule entries.
- `Payment` and `PaymentAllocation` represent payment transactions and invoice allocations. Posting is handled by the existing payment workflow service.
- `PaymentReceipt` is a separate receipt snapshot linked to a payment. It must remain distinct from invoices and must continue to be issued only under the existing posting and authorization rules.
- `Refund` is separate from invoices and payments. Its current invoice association cannot accurately represent a payment originally allocated across multiple invoices.
- The governed concession workflow uses `FeeConcessionType`, `StudentConcessionApplication`, `FeeConcessionAllocation`, and `concession_service.py`. The legacy assignment discount/scholarship fields and stub routes are not a second concession source.
- Invoice numbering is provided by the existing sequence service. All invoice-generation paths must use that service rather than implementing a second numbering scheme.

### Confirmed implementation gaps

1. `POST /api/v1/fees/invoices` contains stale references to fields removed from `StudentFeeAssignment` by migration 031 and an undefined `student` reference. The existing `invoicesApi.create` wrapper has no call site in the Fees UI.
2. The Fee Invoicing view is currently a register; it does not provide the normal invoice-generation flow.
3. `FeeInstallment` is a compatibility alias over `FeeInvoiceItem`; its installment-like values are transient. There is no persisted invoice installment schedule. Some API response paths nevertheless iterate `inv.installments`, and a report path treats an invoice ID as an installment ID.
4. The current payment allocation model is invoice-level. Legacy `installment_id` support is retired or ignored and cannot reliably settle a particular installment.
5. Refund handling associates a refund with only the first allocation of a payment, so refunds of payments spanning multiple invoices can be reconciled against the wrong invoice.
6. Assignment creation and related legacy code still refer to retired discount/scholarship fields instead of relying exclusively on the governed concession workflow.
7. The migration chain currently ends at revision `053_recurrence_reschedule`. Any schema work must be a new forward revision after the active head; migration 031 is historical and must not be rewritten.
8. Invoice records currently use `unpaid`, `partial`, `paid`, and `cancelled`; reporting also recognizes `written_off`, while overdue is calculated from balances and dates. The delete route treats an unpaid invoice as a draft even though the model has no distinct draft/issued state. This ambiguity must be removed so an issued invoice number and history cannot be deleted.

## 2. Recommended architecture and decision

**Recommendation: complete the existing Fee Management workflow with two narrowly scoped, additive financial relationships. Do not create a separate Fee Invoicing module.**

The invoice, payment, receipt, refund, and concession entities already exist and are the canonical sources. Two gaps cannot be addressed correctly by reusing invoice line items or a single refund-to-invoice pointer:

1. **Persisted invoice installment schedule** — add a child schedule entity owned by an invoice. Each row records a numbered due obligation, due date, and scheduled amount. It is not a copy of a fee structure or invoice line item.
2. **Refund allocation detail** — add child allocations linking a refund to the original payment allocations it reverses. This preserves the refund’s actual invoice (and, when applicable, installment) distribution without overloading `Refund.invoice_id`.

The existing `PaymentAllocation` should gain a nullable link to the persisted installment entity. Null remains valid for legacy invoice-level allocations. The payment service—not the UI—must enforce allocation totals and balances. Avoid storing independently editable installment paid/outstanding totals; compute them from posted allocations and refund allocations, or treat any cache strictly as a rebuildable projection maintained by the same financial service.

`FeeInvoiceItem` remains the itemized billed content. `PaymentReceipt` remains a separate immutable receipt snapshot. No new master fee, receipt, concession, or invoice table is proposed.

### Invoice lifecycle (separate from payment lifecycle)

The invoice is issued atomically when its validated invoice and at least one valid persisted schedule are created; invoice numbering continues to use the existing sequence service. No new invoice Draft/Submitted/Posted states are proposed. Those are payment transaction states and must never be copied onto invoices.

The existing invoice status is the invoice-side state and must be documented/enforced as follows:

- `unpaid`: issued, no net posted payment allocation, and a positive outstanding balance.
- `partial`: issued, some net posted payment allocation, and a positive outstanding balance.
- `paid`: issued and fully settled; the balance is zero.
- `cancelled`: terminal; retain the invoice number and record/reason/audit history. Cancellation is allowed only after there are no unreversed posted allocations and the remaining balance is not being silently discarded.
- `written_off`: preserve as an existing reporting state, but do not change or newly assign it until an authorized write-off workflow and its accounting semantics are confirmed.
- `overdue`: a derived presentation condition, not a stored invoice status. For scheduled invoices, derive it from outstanding schedule amounts whose due dates have passed; for historical unscheduled invoices, retain the existing invoice-due-date calculation.

Only a posted payment (or an approved refund/reversal) changes settlement status. Draft/submitted payments do not. Refunds/reversals may move an invoice from `paid`/`partial` back to `partial`/`unpaid`, with the existing audit history preserved. An issued invoice is never permanently deleted; the current delete route’s “unpaid means draft” assumption must be removed. If a distinct pre-issuance invoice-draft workflow is required, it needs separate business approval and an explicit state/number-reservation design; it is not part of this plan.

## 3. File-by-file implementation plan

Paths are relative to the repository root. Files marked “new” are conditional on approval of the additive schema design above.

| File | Planned work |
|---|---|
| `backend/app/models/fee.py` | Add a persisted invoice-installment model with invoice relationship, sequence number, due date, and amount; replace transient installment compatibility behavior only after all callers have been migrated. Keep invoice items semantically separate. Document/enforce the invoice status transitions above without conflating them with Payment status. |
| `backend/app/models/payment.py` | Add nullable `PaymentAllocation.installment_id` relationship and a refund-allocation child entity linked to a refund and original payment allocation. Preserve legacy refund invoice references for compatibility; do not reinterpret historical records. |
| `backend/app/models/__init__.py` | Export/register the new models so SQLAlchemy metadata and Alembic include them. |
| `backend/alembic/versions/054_fee_invoice_installment_refund_allocation.py` (conditional; only if preflight confirms a clean 053 head) | Add the installment and refund-allocation tables, nullable FK, indexes, uniqueness and non-negative/positive amount constraints as appropriate. Include data preflight and safe upgrade/downgrade behavior. If deployed/repository heads differ, do not force revision 054 or rewrite migration 031/053; determine the correct forward revision from the verified graph first. |
| `backend/app/services/fee_invoice_service.py` (new if no suitable existing service is found at implementation time) | Centralize canonical invoice creation and validation used by the API and existing invoice-creation call sites. Reuse invoice numbering and concession services; enforce schedule totals equal the final invoice net amount and record audit events. Create this service only after confirming no existing shared service already owns the responsibility. |
| `backend/app/services/payment_workflow_service.py` | Enforce invoice and installment remaining balances during payment creation/posting; allocate invoice-wide payments oldest-due-first, then by installment number; persist allocations transactionally; when no invoice is selected, distribute refunds proportionally across the original eligible posted payment allocations with deterministic minor-unit rounding; retain posting, reversal, and audit behavior. |
| `backend/app/services/concession_service.py` | Reuse the governed concession application/allocation lifecycle during invoice calculation. Ensure legacy fields cannot bypass approval, and coordinate approved concession amounts with the invoice schedule without duplicating concession calculations. Allocate schedule concession cents in one backend operation using a deterministic exact-total rounding method. |
| `backend/app/services/fee_register_importer.py` | Keep historical invoice import on the canonical invoice service where compatible. Preserve imported historical data and do not invent installment schedules or refund splits when source data does not contain them. |
| `backend/app/services/communication.py` | Update due-reminder selection to read persisted installment due dates for scheduled invoices, while retaining invoice-level due-date handling for historical unscheduled invoices. |
| `backend/app/api/v1/endpoints/fees.py` | Repair invoice creation using canonical assignment/student lookups; reject retired assignment discount/scholarship inputs; expose persisted schedules in invoice detail/list/student fee responses; make the existing installment endpoint return actual records; enforce the invoice status transitions above; prohibit deletion of any issued invoice and retain authorized cancellation with number/history. |
| `backend/app/api/v1/endpoints/payments.py` | Validate invoice/installment allocation requests, expose refund allocation detail/preview, and preserve the existing payment Draft → Submitted → Posted authorization lifecycle. Keep receipt routes separate. |
| `backend/app/api/v1/endpoints/reports.py` | Replace the incorrect invoice-ID-as-installment-ID mapping with persisted schedule identifiers and schedule-aware balances. |
| `backend/app/api/v1/endpoints/students.py` and `backend/app/api/v1/endpoints/student_portal.py` | Update fee-detail serializers that currently iterate transient `inv.installments`; expose only persisted schedule rows and preserve invoice-level history for unscheduled legacy invoices. |
| `backend/app/api/v1/endpoints/leads.py` | Route lead-conversion invoice creation through shared validation/numbering/schedule logic without changing admission behavior or generating duplicate invoices. |
| `frontend/src/types/index.ts` | Define persisted installment, allocation, and refund-allocation response types; remove obsolete installment/legacy discount fields only after all API callers are updated. |
| `frontend/src/api/endpoints.ts` | Correct invoice-create and installment/refund API payloads and responses; continue using the existing fee/payment routes. |
| `frontend/src/pages/Fees.tsx` | Connect the existing Fee Invoicing workspace to invoice generation and management APIs; show schedules, invoice status, due dates, and outstanding amounts. Reuse shared forms/selectors and keep read-only mode as the default. |
| `frontend/src/pages/FeeCollection.tsx` and `frontend/src/pages/Payments.tsx` | Select invoice or installment for collection, show remaining balances and server allocation preview, and present refund invoice splits before submission/approval. Do not calculate authoritative financial totals in the client. |
| `frontend/src/components/OnlinePaymentModal.tsx` | Remove or correctly bind retired installment identifiers; submit only API-supported invoice/installment selection and display server-calculated payable amounts. |
| `frontend/src/components/Badge.tsx` | Align displayed invoice/payment status labels with backend lifecycle values; remove unsupported status states unless backed by an API contract. |
| `backend/tests/conftest.py` and relevant payment/fee fixtures | Replace transient installment fixture assumptions with persisted test schedule rows and include multi-invoice allocations/refund fixtures. |
| `backend/tests/test_payments.py`, `backend/tests/test_payment_workflow.py`, `backend/tests/test_payment_gateway.py` | Cover schedule-aware partial/full posting, exact balance updates, installment-target validation, refund allocation reconciliation, and gateway compatibility. |
| `backend/tests/test_concession_financial_governance.py` and relevant fee endpoint tests | Verify only approved canonical concessions affect invoice totals and schedule totals; reject retired payload fields. |
| `backend/tests/test_fee_register_import.py`, `backend/tests/test_transaction_governance.py`, `backend/tests/test_global_view_edit_governance.py` | Protect historical imports and existing invoice/payment authorization, cancellation, audit, and view/edit rules. |
| `frontend/src/test/FeesModule.test.tsx`, `frontend/src/test/OnlinePaymentGateway.test.tsx`, `frontend/src/test/ConcessionGovernanceUI.test.tsx`, `frontend/src/test/ReceiptPrint.test.tsx` | Verify invoice generation and schedule display, server allocation preview, concession visibility, and that receipt rendering remains separate and unchanged. |

`PaymentReceiptView.tsx` and receipt PDF/snapshot generation are expected to remain unchanged unless contract tests show a required additive display field. No receipt should be regenerated from a live invoice join.

## 4. Database and migration impact

### Proposed additive schema

Subject to preflight:

- **`fee_invoice_installments`** — relationship/transaction child of `fee_invoices`; fields include primary key, `invoice_id`, positive `installment_number`, `due_date`, amount, stored paid/outstanding balance projection, status, and timestamps. Add a unique constraint on `(invoice_id, installment_number)` and a nonnegative amount check. New schedules are positive and total the invoice payable at issuance; approved concessions may later reduce individual schedule rows to zero. The schedule total is reconciled in the transactional invoice/concession services because a cross-row SQL check is not portable.
- **`payment_allocations.installment_id`** — nullable FK to `fee_invoice_installments`. Existing invoice-level records remain valid. New schedule-aware payments persist exact installment-level allocation rows.
- **`refund_allocations`** — relationship/ledger child of `refunds` and original `payment_allocations`; proposed fields: refund ID, original payment-allocation ID, amount, and audit timestamps. A refund may have several rows; the sum must equal the refund amount. Prevent cumulative refunds from exceeding the refundable amount of the original allocation.

No separate payment receipt table, concession master, or replacement invoice table is required. `FeeInvoiceItem` is not repurposed as an installment schedule.

### Data preflight and migration behavior

Before creating revision 054:

1. Confirm the repository and deployed Alembic heads and schemas are actually at 053 in every target environment; inspect for branch divergence or a different head. Create revision 054 only if the verified migration graph has a clean 053 head. Otherwise stop and select a collision-free forward revision from the actual graph; do not force or fake the revision.
2. Produce read-only counts and samples for invoices, allocations, refunds, legacy installment references, duplicate sequence numbers, negative/zero amounts, and invoice totals that do not reconcile. Do not include student-identifying values in migration logs.
3. Check whether any target database still has pre-031 `fee_installments`, `payment_allocations.installment_id`, or discount/scholarship columns. Their existence must not be assumed from current ORM code.
4. Do not infer installment dates or amounts from `FeeStructure.installments_count`, invoice line items, or current due dates. Historical invoices without an authoritative schedule remain invoice-level and unscheduled.
5. Do not infer past refund splits from `Refund.invoice_id` when the payment had multiple allocations. Retain the historical refund and legacy link unchanged; new detail records apply only when the split is evidenced or for refunds created after deployment.
6. If a surviving legacy schedule table or import source contains relevant rows, export and reconcile them first. Backfill only where a deterministic, unique invoice match and exact amount/date source are demonstrated; quarantine ambiguous rows for explicit business review rather than silently dropping or fabricating data.
7. Run migration in a staging copy, verify row counts and financial invariants, then snapshot/backup and apply through the established deployment process.

The migration should be forward-only in normal production operation. A downgrade must not silently delete newly recorded schedules or refund allocations; document it as blocked after data is written unless a verified export-and-restore procedure is available.

## 5. API and UI behavior changes

### Invoice generation and management

- Repair and test the existing `POST /api/v1/fees/invoices`; do not add a competing invoice-generation endpoint.
- Validate the student, assignment, academic year, institution scope, and fee structure from canonical records. Do not pass stale assignment fields through to ORM constructors.
- Accept explicit invoice-line and schedule data (or an already governed schedule source, if one is found during implementation). Reject missing, non-positive, mismatched, or duplicate schedule entries; do not generate amounts or dates from hardcoded business defaults.
- Reuse `generate_next_invoice_number` and its concurrency protection.
- Apply the invoice lifecycle defined in section 2: valid creation issues the invoice; `unpaid`/`partial`/`paid` reflect settlement; `cancelled` is terminal; overdue is derived. Payment Draft → Submitted → Posted remains a separate transaction lifecycle.
- Do not allow permanent deletion of an issued invoice. If pre-issuance invoice drafts are later required, obtain separate approval for their state, numbering, and deletion rules.
- Existing invoice creation from lead conversion, adjustment, and register import must use the same validation and numbering rules where applicable. Preserve each path’s distinct business purpose and idempotency behavior.
- No general update endpoint for issued invoices is proposed. Schedule changes after issuance should use existing authorized cancellation/reissue or a governed adjustment workflow, preserving audit history.

### Payments, allocations, refunds, and receipts

- Keep `PaymentAllocation.invoice_id` as the invoice-level boundary and optionally attach a persisted installment.
- For a payment explicitly targeted at an installment, reject amounts above its remaining balance. For invoice-wide payments, allocate oldest due date first, then installment number, and persist each resulting installment allocation. Use backend decimal/minor-unit arithmetic and reject any over-allocation.
- Preserve draft/submitted behavior: no receivable changes and no receipt issuance before posting. Posting must be authorized and atomic across the payment, allocations, invoice/installment balances, audit events, and separate receipt snapshot.
- Refund request/approval/disbursement must reconcile against the original posted payment allocations, cap at each allocation’s remaining refundable amount after prior refunds, and produce auditable child allocations. With no selected invoice, distribute proportionally over eligible original posted allocations using deterministic minor-unit rounding. An explicit selected invoice is refunded only against that invoice’s original allocation.
- The UI should display a server-generated allocation preview before the refund is submitted or approved. It must not choose the first invoice as a silent fallback.
- Retain legacy `Refund.invoice_id` compatibility for existing records and single-invoice API consumers, but make new multi-invoice detail authoritative in refund allocations.
- Keep `PaymentReceipt` independent. Posting creates/updates the receipt under existing policy; refunding or changing an invoice must not rewrite a historical receipt snapshot.

### Concessions and view/edit governance

- Calculate concessions through the approved `StudentConcessionApplication` and `FeeConcessionAllocation` workflow. Assignment create/update payloads must not accept legacy discount/scholarship IDs.
- Schedule amounts must reconcile exactly to the invoice net after approved concessions. Calculate the concession once through the governed backend service, then allocate its installment impact proportionally over eligible scheduled gross amounts using integer minor units and a largest-remainder method; break ties by due date then installment number. This guarantees exact totals without floating-point drift. If a concession is restricted by fee category or waiver scope, apply it only to eligible billed amounts; reject or hold invoice generation if the current schedule input cannot represent that scope. Never recalculate concessions in the frontend.
- Preserve global View Mode as the default. Creation, schedule changes, payment/refund actions, and cancellation require explicit scoped Edit Mode plus existing role authorization and confirmation requirements.

## 6. Data integrity and backward compatibility

- The invoice remains the source of the student’s total payable; schedule rows partition that payable and must sum exactly to its net amount.
- Posted payment allocations and refund allocations are the auditable basis for schedule-level settlement. Any cached paid/outstanding values are projections, not independent ledgers.
- Enforce institution/student/invoice consistency, currency precision, no over-allocation, no over-refund, unique installment numbering, and transaction-level atomicity.
- Leave historical unscheduled invoices and historical refunds intact. New UI/API responses must distinguish “no schedule recorded” from “no balance due.”
- Preserve existing invoice numbers, receipts, payment records, status history, and audit events. No financial record is deleted or rewritten to fit the new schema.
- If existing clients send retired installment or discount fields, return a clear validation response or support a narrowly scoped deprecation window; never silently accept and ignore a field that affects financial meaning.
- Verify API response compatibility for student portal, reports, payment gateway, communications, exports, and imports before removing the `FeeInstallment` compatibility alias.

## 7. Test and verification plan

### Backend functional tests

1. **Invoice creation:** valid assignment/student/institution; invoice number uniqueness under concurrent creation; explicit due date and schedule; exact sum of line totals, approved concession, net invoice amount, and installments.
2. **Invalid invoice input:** missing/foreign assignment, stale discount/scholarship fields, duplicate installment number, invalid date/amount, schedule-total mismatch, and duplicate/idempotent request behavior.
3. **Installments:** multiple due dates; invoice-level payment distributed oldest-due-first; explicit installment payment; partial and full settlement; overpayment rejected; exact cent rounding; late/overdue display derived from persisted schedule.
4. **Independent lifecycles:** invoice creation issues only after schedule validation; test `unpaid → partial → paid`, refund/reversal returning settlement to `partial`/`unpaid`, cancellation guards, immutable invoice numbers, and prohibition on deleting issued invoices. Separately verify draft/submitted payments do not update outstanding balances or issue receipts, and authorized posting updates settlement and creates the separate receipt atomically.
5. **Multiple invoices:** one payment distributed across invoices and installments; all allocations reconcile to payment amount and balances update only for the correct student/institution.
6. **Refunds:** partial/full refund of a payment spanning multiple invoices; explicit invoice-scoped refund; deterministic proportional rounding; repeated refunds capped at original allocation net; unposted/reversed payments are not refundable; state transitions and audit records remain consistent.
7. **Concessions:** pending/rejected applications do not reduce invoices; approved canonical allocation is applied once; installment allocation uses exact minor-unit rounding and totals reconcile; category/scope-limited concessions affect only eligible amounts; reversals preserve totals; legacy assignment fields cannot bypass governance.
8. **Back-compat/import:** historical invoices without schedule remain usable for invoice-level collections; legacy refund records remain readable; historical imports do not fabricate schedules or splits.
9. **Authorization and audit:** institution scope, role permissions, explicit Edit Mode, cancellation confirmation, no deletion of posted financial history, and complete before/after audit trail.

### Frontend and integration tests

- Fees workspace creates invoices through the existing API and displays the saved invoice/schedule response rather than optimistic client-generated records.
- Invoice and installment selectors show server balances; API validation errors are surfaced without success-shaped fallback.
- Collection preview and submitted allocations match the posted backend results.
- Refund preview shows all affected invoices and the approval workflow preserves the server allocation.
- Student and portal fee views correctly render both scheduled current invoices and unscheduled historical invoices.
- Receipt printing/reprint/cancel behavior remains independent from invoices and is covered by existing receipt tests.
- Run targeted fee/payment backend and frontend suites, then the full relevant backend/frontend checks, migration upgrade/downgrade checks, documentation validation, and source-header validation after implementation.

## 8. Risks and rollback strategy

| Risk | Mitigation |
|---|---|
| Production databases differ from expected revision 053 or retain pre-031 schema/data | Read-only schema/head preflight per environment. Create revision 054 only for a verified clean 053 head; otherwise resolve the migration graph before authoring a forward revision. Stage against a recent sanitized backup; stop on unexpected heads or data. |
| Current invoice status conflates settlement and terminal/document states, and unpaid is treated as a deletable draft | Define and enforce the invoice status transitions in section 2; issue only after schedule validation; prohibit deletion after invoice numbering/issuance; retain cancellation and status audit history. |
| Legacy schedules cannot be matched to a unique invoice | Do not auto-map; preserve/export evidence and require business reconciliation. Historical invoices remain invoice-level. |
| Refund allocations cannot be reconstructed | Keep existing refund records and links unchanged; only enforce detailed allocations for new refunds unless source evidence proves a historical split. |
| Rounding causes allocation totals to drift | Use decimal/minor-unit arithmetic in one backend service and deterministic remainder assignment; test multi-row and repeated partial-payment cases. |
| Invoice creation paths diverge | Route applicable paths through the shared invoice service and test normal API, lead conversion, adjustment, and historical import independently. |
| Payment or refund transactions partially persist | Use a single database transaction for ledger rows, balances/projections, receipt, and audit events; add rollback tests and avoid external side effects inside the transaction. |
| Frontend callers still rely on transient alias fields | Migrate and test all API serializers and consumers before removing compatibility aliases or response fields. |
| Downgrade would destroy new financial detail | Treat downgrade after write as blocked; take verified backups and use forward corrective migrations instead of deleting ledger rows. |

**Rollback sequence:** stop new invoice/payment/refund writes if a severe integrity defect is detected; preserve database and application logs; restore the pre-deployment backup only under the organization’s approved recovery procedure, or deploy a forward corrective migration. Do not delete posted transactions or reconstruct receipts from mutable invoices. Reconcile invoice, payment, refund, receipt, and audit totals before reopening writes.

## 9. Remaining business rules and migration risks for review

The following items were not settled by the in-principle approval and must be confirmed before implementation:

1. **Pre-issuance invoice drafts:** Current invoice creation assigns a number and creates an `unpaid` row; there is no distinct invoice draft state. This plan recommends that successful creation issue the invoice immediately and that no invoice draft workflow be added. If users need drafts, define when numbers are reserved, who may edit/issue/delete, and how draft schedules are validated before adding that behavior.
2. **Invoice-level due date with multiple installments:** Define whether `FeeInvoice.due_date` means the first installment due date, final installment due date, or another documented date. Schedule-level overdue calculations will use each installment’s own due date regardless.
3. **Concession eligibility across schedules:** The backend must use the governed approval amount and apply the exact rounding method described above. Confirm whether category-/waiver-scoped concessions can be allocated from the supplied schedule inputs; if they cannot, determine whether schedule rows need an explicit link to eligible invoice items before implementation.
4. **`written_off` semantics:** Reporting recognizes this status, but the reviewed implementation did not establish the write-off transition, authorization, or whether the balance is reduced or only classified. Preserve existing records and do not add new write-off behavior until the accounting owner confirms it.
5. **Cancellation after historical/reversed allocations:** Confirm the required evidence when payment allocations exist but have been fully reversed/refunded. Recommended guard: cancellation only after no unreversed posted allocation and no unresolved refund, with a reason and immutable audit trail.
6. **Migration variance:** Deployed schema may be ahead, behind, branched, or partially migrated compared with repository revision 053; historical pre-031 columns/tables may differ by environment. Revision 054 is conditional, not a command to force all environments to that revision.
7. **Refund rounding and atomicity:** Proportional refund allocation is approved in principle; confirm the largest-remainder tie-break (original payment-allocation ID as stable final tie-break) and ensure concurrent refund requests lock the original allocations so cumulative refunds cannot exceed refundable amounts.
8. **Operational migration gate:** Confirm sanitized staging backup/restore test, per-environment read-only schema preflight, post-migration financial reconciliation, and a write freeze or equivalent deployment coordination window.

The following policies are recorded as approved in principle and are not open questions: required schedules on new invoices, oldest-due-first invoice-wide payment allocation, proportional refunds when no invoice is selected, exact backend concession rounding, no fabricated historical detail, preservation of canonical entities and financial history, and conditional migration authoring after schema/head preflight.

Implementation is authorized under this plan. Do not apply migration 054 to a live or configured database as part of code validation; deployment still requires verified head/schema preflight, a tested staging copy, and operational approval.
