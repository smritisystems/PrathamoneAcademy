---
title: "Print and PDF Theme Isolation Plan"
module: "17_UI_UX_DESIGN"
category: "PRINT-PDF"
document_type: "IMPLEMENTATION-PLAN"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-17"
updated_date: "2026-11-17"
author: "Jawahar R Mallah"
organization: "Smritisys & AITDL Networks"
status: "Draft"
tags: ["print", "pdf", "receipts", "theme-isolation"]
entities: ["Receipt", "ReportDocument", "PDFExport"]
api_routes: []
related_modules: ["14_PRINTING_DOCUMENTS", "09_FEES_PAYMENTS", "11_REPORTS_EXPORTS", "17_UI_UX_DESIGN"]
---

# Print and PDF Theme Isolation Plan

## Existing paths to preserve

- Global print styles in [index.css](../../frontend/src/index.css).
- Receipt printing via [printReceipt.ts](../../frontend/src/utils/printReceipt.ts) and [PaymentReceiptView.tsx](../../frontend/src/components/PaymentReceiptView.tsx).
- PDF output through [reportBookPdf.ts](../../frontend/src/components/reports/reportBookPdf.ts).
- Browser printing and report/export paths elsewhere in the frontend.
- EduBoard canvas rendering is a separate output surface and retains user-selected board appearance.

## Proposed policy

Interactive light/dark mode must not change the visual or financial content of receipts, issued invoices, historical snapshots, or generated PDFs. Printed financial and academic records remain immutable outputs. Print templates should explicitly resolve to their intended paper background/foreground and logo treatment rather than relying on the current app theme or user-agent background printing.

## Validation matrix

| Output | Light app | Dark app | Required check |
|---|---|---|---|
| Receipt iframe | Verify | Verify | Same monetary/data content, readable white-paper output, no dark page background |
| Browser print report | Verify | Verify | Page breaks, table headers, margins, logo, grayscale legibility |
| Generated report PDF | Verify | Verify | Text/vector contrast, page count, clipping, export parity |
| EduBoard print/export | Verify | Verify | Board palette preserved intentionally; app shell colors excluded |

## Regression guardrails

- No dark-theme filters or root styles applied to isolated print documents unless explicitly designed.
- Do not modify receipt calculations, persisted snapshots, ledger content, or report business logic as part of theme work.
- Test print preview and generated files, not only DOM screenshots.
- Check that colored backgrounds are not required for meaning and that financial totals remain prominent.
- Preserve existing tenant logo/branding without allowing a user theme to mutate the underlying record.

## Approval scope

Only CSS/theme isolation and rendering fixes directly required for parity should be included. If an output is intentionally branded with a colored background, document the specific template and obtain product approval before changing it.
