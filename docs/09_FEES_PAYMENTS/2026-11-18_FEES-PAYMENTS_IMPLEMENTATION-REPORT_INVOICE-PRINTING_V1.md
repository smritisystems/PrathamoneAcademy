---
title: "Fee Invoice Preview and Printing Implementation Report"
module: "09_FEES_PAYMENTS"
category: "IMPLEMENTATION-REPORT"
document_type: "REPORT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-18"
updated_date: "2026-11-18"
author: "Jawahar R Mallah"
organization: "Smritisys & AITDL Networks"
status: "Implemented"
tags: ["fees", "invoice", "print", "reprint", "view-first"]
entities: ["FeeInvoice", "FeeInvoiceItem", "FeeInvoiceInstallment", "Student"]
api_routes: ["/api/v1/fees/invoices", "/api/v1/fees/invoices/{invoice_id}"]
related_modules: ["04_STUDENT_MANAGEMENT", "16_DATABASE_API", "17_UI_UX_DESIGN", "18_TESTING_QA"]
---

# Fee Invoice Preview and Printing

## Delivered

The existing Fee Invoicing workspace now has an **Issued Invoices** view alongside the student fee register. Staff can search and filter issued invoices, open a read-only preview, and print or reprint the selected invoice on A4 or A5 paper through separate browser print actions.

The premium preview uses the institute logo and a navy/indigo brand header with clear invoice metadata, student details, itemized amounts and concessions, a highlighted balance due, persisted installment schedule when available, and invoice notes. The footer includes the canonical PrathamOne EduOS logo and “ · Powered and managed by [Brand Logo]” attribution (without exposing internal parent corporate entities on student-facing documents). A dedicated print-safe footer class and iframe print rule keep this branding visible in print output. Legacy invoices without line items remain printable using their stored invoice totals.

The supplied print-to-PDF samples showed A4 on one page but A5 split across two pages. The A5 iframe viewport is 148 mm wide, with 136 mm available for content; both are narrower than Tailwind's 640 px `sm` breakpoint. As a result, the responsive header, student/invoice details, and totals grids reverted to stacked mobile layouts and made the invoice too tall. The isolated print stylesheet now applies A5-specific two-column rules to those invoice sections. This keeps A5 print layout paper-aware without changing the on-screen preview or A4 layout.

## Data and governance

- Uses the existing `FeeInvoice`, `FeeInvoiceItem`, and `FeeInvoiceInstallment` records and existing invoice list/detail APIs; no duplicate invoice entity or schema migration was added.
- Invoice totals, line items, and schedules come from the stored invoice record. Student name, admission number, and phone are read from the canonical `students` master, so these identity fields reflect the current profile rather than a historical identity snapshot.
- Previewing and printing are view-only. Issuing a new invoice continues to require explicit Edit Mode; printing does not create, issue, or modify an invoice.
- Receipt printing remains separate and unchanged.

## Verification

Focused frontend tests cover A4/A5 selection, A5 print layout rules, footer branding, the issued-invoice list, invoice detail identity fields, and read-only preview. Repository source-header compliance and documentation indexing/validation are required release checks.
