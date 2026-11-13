---
title: "Accounting Engine Capability Assessment for Institutional Books"
module: "10_FINANCE_ACCOUNTING"
category: "CAPABILITY-ASSESSMENT"
document_type: "ASSESSMENT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-14"
updated_date: "2026-11-14"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Pending Review"
tags: ["accounting", "double-entry", "trial-balance", "financial-statements", "capability-assessment"]
entities: ["FeeInvoice", "Payment", "PaymentAllocation", "Refund", "TeacherPayroll", "TeacherPaymentVoucher", "FinancialPeriod"]
api_routes: ["/api/v1/fees/*", "/api/v1/payments/*", "/api/v1/teacher-payroll/*"]
related_modules: ["06_TEACHER_PAYROLL", "09_FEES_PAYMENTS", "11_REPORTS_EXPORTS", "12_RBAC_SECURITY", "16_DATABASE_API"]
---

# Accounting Engine Capability Assessment

## 1. Decision

**Finding: BLOCKED — no general double-entry accounting engine was found in the repository source audit.**

PrathamOne EduOS has meaningful operational financial records and fee-ledger governance. Those capabilities are not equivalent to double-entry accounting. Do not generate or label a Trial Balance, General Ledger, Profit & Loss, Balance Sheet, or statutory financial statement from fee collections and payroll totals.

This is a source-code assessment only. It does not assert which external accounting software the institute uses, and it does not verify the live production schema.

## 2. Evidence reviewed

The model inventory includes:

- Fee obligation and invoice entities: `FeeCategory`, `FeeStructure`, `StudentFeeAssignment`, `FeeInvoice`, `FeeInvoiceItem`, and concession/sponsor entities in [`fee.py`](../../backend/app/models/fee.py).
- Collection entities: `Payment`, `PaymentAllocation`, `PaymentReceipt`, `Refund`, and `FinancialPeriod` in [`payment.py`](../../backend/app/models/payment.py).
- Teacher payroll and payroll-specific vouchers in [`teacher_payroll.py`](../../backend/app/models/teacher_payroll.py).
- Audit and actor records in [`user.py`](../../backend/app/models/user.py).

The API and services reviewed include [`payment_workflow_service.py`](../../backend/app/services/payment_workflow_service.py), [`financial_governance_service.py`](../../backend/app/services/financial_governance_service.py), [`payments.py`](../../backend/app/api/v1/endpoints/payments.py), [`fees.py`](../../backend/app/api/v1/endpoints/fees.py), and [`teacher_payroll.py`](../../backend/app/api/v1/endpoints/teacher_payroll.py).

The source inventory did not identify a chart-of-accounts master, journal header and journal-line models, debit/credit posting rules, a general-ledger query, period-end accounting balances, or an accounting statement API. The reviewed financial integrity migration creates `financial_periods`; it does not establish a general-ledger engine.

## 3. Capability matrix

| Accounting capability | Status | Reason |
|---|---|---|
| Student receivable / fee obligation tracking | PARTIAL | Invoice-level balances and payment allocations exist. This is a fee subledger with its own status and concession rules. |
| Receipt and collection lifecycle | PARTIAL | Payments, receipts, approvals, reversals, and refund workflow records exist. They do not by themselves prove cash custody or bank settlement. |
| Fee/concession reconciliation | PARTIAL | Existing service verifies fee/invoice/payment/allocation/concession invariants. It does not reconcile all accounting books. |
| Payroll register and payment vouchers | PARTIAL | Payroll calculations and teacher vouchers exist. No chart-of-accounts posting link was identified. |
| Cash Book | BLOCKED | No authoritative cash account, opening/closing cash balance, cash movement ledger, deposit, or withdrawal source identified. |
| Bank Book and bank reconciliation | BLOCKED | Payment references and staff bank details are not institutional bank accounts, statement imports, matched bank lines, or bank balances. |
| General expense and purchase posting | NOT IMPLEMENTED | No general expense/purchase transaction source identified. |
| Inventory and fixed-asset accounting | NOT IMPLEMENTED | No asset register, stock movement, depreciation, or asset posting source identified. |
| Chart of accounts and journal posting | NOT IMPLEMENTED | No source model or posting service identified. |
| General Ledger and Trial Balance | BLOCKED | Cannot be calculated without chart-of-accounts balances and balanced, auditable debit/credit entries. |
| Profit & Loss and Balance Sheet | BLOCKED | Revenue/expense recognition, liabilities, assets, and period balances are not available as a complete accounting ledger. |

## 4. Safe product language until this changes

Use descriptive terms such as **Fee Collection Register**, **Student Receivables Summary**, **Payment-Mode Summary**, **Teacher Payroll Register**, or **Operational Financial Summary** when those reports are backed by their actual source records.

Do not label those outputs “Cash Book,” “Bank Book,” “General Ledger,” “Trial Balance,” “Profit & Loss,” or “Balance Sheet.” Do not imply that a gross payment amount equals settled bank funds, that a payroll voucher is a posted accounting expense, or that a fee ledger is the institution's complete accounting ledger.

## 5. Recommended path

1. Keep the requested books initiative reporting-only for existing authoritative operational sources.
2. Make unsupported accounting reports explicitly unavailable, with the missing source capability named.
3. Ask the owner to choose either an existing accounting-product integration or a separately reviewed accounting-engine project. Do not create a second accounting system as an incidental reporting feature.
4. If an integration is selected, define account mapping, posting trigger, idempotency, debit/credit balancing, corrections/reversals, period close, currency precision, tenant boundaries, and source-to-journal traceability before coding.
5. Reassess this capability against the approved design and test evidence before exposing any financial statement.

## 6. Verification still required

- Confirm whether the deployment has an external accounting platform and whether its API/data is in scope.
- Inspect the live database schema in an approved read-only environment.
- Confirm actual operational data completeness and any offline cash/bank records.
- Do not use prior documentation snapshots that state historical row counts as current evidence; those counts were not revalidated in this audit.
