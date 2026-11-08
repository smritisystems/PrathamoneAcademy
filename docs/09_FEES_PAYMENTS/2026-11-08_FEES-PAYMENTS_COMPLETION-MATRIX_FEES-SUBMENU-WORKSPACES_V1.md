---
title: "Fees & Payments Submenu Dedicated Workspaces Completion Matrix"
module: "09_FEES_PAYMENTS"
category: "COMPLETION-MATRIX"
document_type: "REPORT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-08"
updated_date: "2026-11-08"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["fees", "payments", "receipts", "ledger", "workspaces", "view-first"]
entities: ["FeeInvoice", "Payment", "FeeStructure", "FeeCategory"]
api_routes: ["/api/v1/fees/overview", "/api/v1/fees/register", "/api/v1/payments/", "/api/v1/payments/receipts"]
related_modules: ["04_STUDENT_MANAGEMENT", "10_FINANCE_ACCOUNTING"]
---

# Fees & Payments Submenu Dedicated Workspaces Completion Matrix

**Product:** PrathamOne EduOS  
**Edition:** Coaching Institute Edition  
**Baseline Version:** 1.0.0  
**Product Architect:** Jawahar R. Mallah  
**Organization:** AITDL — AI Technology & Development Lab  
**Date:** 2026-11-08  
**Governance Status:** FULLY COMPLIANT (SSOT Rules 001–010 & Global View-First Enforced)

---

## 1. Executive Summary

All 8 submenus under **Fees & Payments** have been transformed into first-class dedicated workspaces with dedicated browser URLs, contextual headers, adaptive action buttons, View-First safety locks, and persistent URL history.

### Dedicated Workspaces Overview
1. **Overview** (`/fees/overview` & `/fees`): Financial KPI Dashboard, collection trends, board/batch breakdown, payment mode distribution, and quick action launchpad.
2. **Fee Register** (`/fees/register`): Canonical student-wise fee ledger, installments, concessions, overdue balances, and batch filters.
3. **Collect Fees** (`/fees/collect`): Fee collection terminal, live student account lookup, invoice itemization, custom concessions, receipt generation, and payment recording.
4. **Payments** (`/fees/payments`): Transaction register of all processed payments, payment methods (UPI, Cash, Card, Bank Transfer, Cheque), and settlement statuses.
5. **Receipts** (`/fees/receipts`): Receipts and invoicing journal with official receipt numbering, print duplicates, and tax invoice generation.
6. **Fee Plans** (`/fees/plans`): Fee structure definitions, standard/course templates, installment schedules, and late fine configurations.
7. **Reports** (`/fees/reports`): Financial reports, collection summaries, overdue aging reports, and export ledgers.
8. **Settings** (`/fees/settings`): Fee settings, receipt prefixes, starting sequence numbers, grace periods, and late fee policies.

---

## 2. Workspaces Completion Matrix

| # | Submenu & Route | Page Title & Subtitle | Primary Action | View-First Governance | Backend SSOT APIs | Test Status | Visual Evidence |
|---|----------------|----------------------|----------------|----------------------|-------------------|-------------|-----------------|
| 1 | `/fees/overview` | **Fees & Payments**<br>*Manage student fees, collections, payments, and receipts* | `Record Payment` | View-First Safe | `GET /api/v1/fees/overview` | PASS (Vitest) | `screenshot_41` |
| 2 | `/fees/register` | **Student Fee Register**<br>*Comprehensive student-wise fee ledger, installments, concessions, and balance tracking* | `Collect Fee` | View-First Safe | `GET /api/v1/fees/register` | PASS (Vitest) | `screenshot_42` |
| 3 | `/fees/collect` | **Fee Collection Terminal**<br>*Select student account, calculate outstanding balance, apply waivers, and record payments* | `Reset Terminal` | Mutation scoped | `GET /api/v1/students/search`<br>`POST /api/v1/payments/` | PASS (Vitest) | `screenshot_43` |
| 4 | `/fees/payments` | **Payment Transactions**<br>*Audit log of all processed payment transactions, settlement modes, and references* | `Record Payment` | View-First Safe | `GET /api/v1/payments/` | PASS (Vitest) | `screenshot_44` |
| 5 | `/fees/receipts` | **Receipts & Invoicing Journal**<br>*Official numbered money receipts, print duplicates, and tax invoice generation* | `Search Receipt` | View-First Safe | `GET /api/v1/payments/receipts` | PASS (Vitest) | `screenshot_45` |
| 6 | `/fees/plans` | **Fee Structures & Plans**<br>*Standard-wise fee templates, component categories, installment schedules, and late fees* | `Create Fee Plan` | **Locked in View Mode**<br>(Requires `finance:fees`) | `GET /api/v1/fee-structures/`<br>`POST /api/v1/fee-structures/` | PASS (Vitest) | `screenshot_46` |
| 7 | `/fees/reports` | **Fee Reports & Financial Analytics**<br>*Collection summaries, aging overdue statements, fee category breakdowns, and export ledgers* | `Export Report` | View-First Safe | `GET /api/v1/reports/fees` | PASS (Vitest) | `screenshot_47` |
| 8 | `/fees/settings` | **Fee Settings & Accounting Policies**<br>*Financial year defaults, receipt numbering prefixes, GST taxation, and discount rules* | `Save Preferences` | **Locked in View Mode**<br>(Requires `finance:fees`) | `GET /api/v1/settings/all`<br>`POST /api/v1/settings/batch` | PASS (Vitest) | `screenshot_48` |

---

## 3. Architecture & Anti-Duplication (SSOT Compliance)

- **RULE 001 & 002 (Single Source of Truth & Mandatory Reuse):** No duplicate tables or parallel stores created. Reused canonical financial tables: `fee_invoices`, `payments`, `fee_structures`, `fee_categories`, `institution_settings`.
- **RULE 006 (One Business Logic Implementation):** Calculations for outstanding amounts, installment penalties, collection rates, and Indian Rupee format (`fmt`, `numberToWordsINR`) remain unified and centralized in domain services.
- **RULE 010 (View-First Governance):** All 8 workspaces default strictly to View Mode. Administrative modifications (such as creating fee plans or altering receipt prefixes) require explicit scoped Edit Mode (`finance:fees`).

---

## 4. Test Suite Verification

1. `frontend/src/test/FeesDedicatedSubmenus.test.tsx`: 9 / 9 tests passing.
2. `frontend/src/test/FeesModule.test.tsx`: 8 / 8 tests passing.
3. `frontend/src/test/Sidebar.test.tsx`: 13 / 13 tests passing.
4. Total Frontend Suite: 30 / 30 tests green.
5. Production Build: `tsc && vite build` built in 22.84s with 0 errors.
