---
title: "Print Branding Governance Update: Standardized Powered By Attribution"
module: "14_PRINTING_DOCUMENTS"
category: "IMPLEMENTATION-REPORT"
document_type: "REPORT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-19"
updated_date: "2026-11-19"
author: "Jawahar R Mallah"
organization: "Smritisys & AITDL Networks"
status: "Approved"
tags: ["printing", "branding", "print-footer", "governance", "invoicing", "receipts"]
entities: ["PrintFooter", "PrintBrandingFooter", "FeeInvoice"]
api_routes: ["/api/v1/fees/invoices"]
related_modules: ["09_FEES_PAYMENTS", "17_UI_UX_DESIGN"]
---

# Print Branding Governance Update: Standardized Powered By Attribution

## 1. Executive Summary & Directive

This engineering update strictly enforces print branding privacy and standardizes software attribution across all printable outputs in **PrathamOne EduOS (Coaching Institute Edition)**.

### Directives Addressed:
1. **Elimination of Parent Corporate Identity on Student Documents:**
   - Any printable document (fee invoices, payment receipts, academic report cards, timetable dockets, and student identity credentials) must **never** print internal corporate identity text: `" · Powered and managed by SmritiSys & AITDL Networks"`.
   - Instead, print footers must display: `" · Powered and managed by "` followed immediately by the official **PrathamOne EduOS Brand Logo** image.
2. **Replacement of Legacy "Created by" Text:**
   - Replaced all legacy `"Created by"` attribution across the platform with `"Powered by"`.
   - The canonical `PRINT_FOOTER_BRANDING_TEXT` constant is now standardized to `'Powered by'`.

---

## 2. Technical Modifications

### 2.1 Centralized Branding Configuration (`frontend/src/config/branding.ts`)
- Updated `PRINT_FOOTER_BRANDING_TEXT` from `'Created by'` to `'Powered by'`.
- Exported canonical constants:
  - `PRINT_POWERED_BY_TEXT = 'Powered by'`
  - `PRINT_POWERED_AND_MANAGED_BY_TEXT = ' · Powered and managed by'`
- Updated `PRINT_SHARE_BRANDING` object with `poweredBy` and `poweredAndManagedBy` attributes.

### 2.2 Global Print Footer Components
- **`PrintFooter.tsx`**: Updated props, defaults, and architectural comments from `'Created by'` to `'Powered by'`. In both single-row and stacked two-row layouts, the software attribution displays `Powered by [PrathamOne EduOS Logo]`.
- **`PrintDocumentBranding.tsx`**: Integrated `PRINT_FOOTER_BRANDING_TEXT` seamlessly into `PrintBrandingFooter` and `PrintDocumentSignatory`.
- **`Fees.tsx`**: Updated fee invoice footer from `customText="PrathamOne EduOS · Coaching Institute Edition · Powered and managed by SmritiSys & AITDL Networks"` to `customText="PrathamOne EduOS · Coaching Institute Edition · Powered and managed by"`, rendering the text cleanly alongside the vector logo mark.

### 2.3 Automated Print Engine & PDF Generator
- **`printLayoutEngine.ts`**: Automatically inherits `PRINT_FOOTER_BRANDING_TEXT` (`'Powered by'`) when dynamically injecting canonical print footers into arbitrary cloned DOM nodes.
- **`reportBookPdf.ts`**: High-resolution vector PDF engine draws `'Powered by'` beside the embedded software logo.

---

## 3. Verification & Quality Assurance

- **Vitest Test Suite**: 5 test files, 71 tests passed (100% success rate):
  - `UniversalPrintEngine.test.tsx` (15/15 passed)
  - `FeesDedicatedSubmenus.test.tsx` (13/13 passed)
  - `PrintDocumentBranding.test.tsx` (10/10 passed)
  - `PrintFooterAndGovernance.test.tsx` (10/10 passed)
  - `ReceiptPrint.test.tsx` (all passed)
- **Corporate Header Compliance**: `python scripts/manage_headers.py check` verified 674/674 files (100% compliant).
- **Documentation Index Integrity**: `python tools/docs_manager.py validate` passed with 554/554 documents validated (0 errors, 0 warnings).
- **Production Asset Build**: Compiled with Vite 8.3.8 and deployed into Docker container `prashant_academy_frontend`.
