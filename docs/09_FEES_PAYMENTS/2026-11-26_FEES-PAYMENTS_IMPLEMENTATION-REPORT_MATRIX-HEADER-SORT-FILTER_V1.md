---
title: "Fees & Payments In-Header Sorting and Filtering Enhancement"
module: "09_FEES_PAYMENTS"
category: "IMPLEMENTATION-REPORT"
document_type: "REPORT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-26"
updated_date: "2026-11-26"
author: "Jawahar R Mallah"
organization: "Smritisys & AITDL Networks"
status: "Approved"
tags: ["fees", "matrix", "sorting", "filtering", "ssot", "ui-ux"]
entities: ["StudentMonthlyFeePivot", "BatchMonthlyFeeMatrix", "SortableHeader"]
api_routes: ["/api/v1/fees/student-monthly-pivot", "/api/v1/fees/batch-monthly-matrix"]
related_modules: ["09_FEES_PAYMENTS", "17_UI_UX_DESIGN"]
---

# Fees & Payments In-Header Sorting & Filtering Enhancement

## Overview
Extended Single Source of Truth (SSOT) table sorting and column-header filtering across Fees & Payments, with primary coverage on the Student-wise Monthly Fee Collection Pivot Matrix, Multi-Dimensional Batch Fee Matrix breakdowns, and Payments/Receipts tables.

## Architecture & SSOT Reuse
1. **Column Filter Hook (`frontend/src/hooks/useTableColumnFilters.ts`)**
   - Unified filter types: `text`, `select` (multi-select checklist), `number_range` (`min`/`max`), and `date_range` (`from`/`to`).
   - Helper `buildSelectOptionsFromRows` derives distinct sorted filter options with row counts dynamically from active data.
2. **Upgraded `SortableHeader` (`frontend/src/components/common/SortableHeader.tsx`)**
   - Added portal-rendered floating filter popover (`ReactDOM.createPortal` -> `document.body`) preventing clipping inside `overflow-x-auto` and sticky matrix headers.
   - Supports optional `secondaryFacet` checklists (used for **Follow-up Priority** alongside **Student Name** inside `Student Name & Priority`), quick sort state indicator, `Clear`/`Select All`/`Reset` actions, and outside-click / `Escape` dismissal.
   - Preserves 100% backwards compatibility with all existing sort-only `<SortableHeader />` callers.
3. **Batch Monthly Fee Collection Matrix (`StudentMonthlyFeePivot.tsx`)**
   - Enabled in-header sorting and filtering on:
     - `Student Name & Priority` (text search + `Urgent` / `High` / `Normal` Priority facet)
     - `Admission #` (alphanumeric sort + text filter)
     - `Board`, `Grade`, `Batch` (string sort + dynamic multi-select checklist)
     - `Agreed Pkg (₹)` (numeric sort + min/max range filter)
     - All 12 academic month columns (`Apr`..`Mar`, numeric sort + min/max range filter)
     - `Total Realized (₹)`, `Balance (₹)`, `Recovery %` (numeric sort + min/max range filter)
     - `Status` (`PAID`, `PARTIAL`, `OVERDUE`, `UPCOMING` checklist + sort)
   - Dynamically recalculates Summary Metrics Ribbon cards, sticky `INSTITUTE TOTALS` footer row, monthly column totals, and Excel/CSV exports based on filtered & sorted rows.
4. **Multi-Perspective Matrix & Fees Workspace (`BatchMonthlyFeeMatrix.tsx`, `Fees.tsx`)**
   - Split `studentRosterColumns` into distinct sortable & filterable `Board`, `Grade`, and `Batch` columns inside `EnterpriseDataTable`.
   - Upgraded custom matrix tables (Batch Transposed, Standard Breakdown, Board Breakdown, Annual Breakdown, and Annual 12M Pivot) plus `Fees.tsx` tables (`Recent Payments`, `Payments Ledger`, `Receipts Ledger`) with in-header filtering and sorting.

## Verification
- `npx tsc --noEmit`: 0 errors
- `npx vitest run src/test/FeesMatrixHeaderSortFilter.test.tsx src/test/InlineQuickFeeCollection.test.tsx src/test/FeesDedicatedSubmenus.test.tsx src/test/FeesModule.test.tsx src/test/GlobalTableSort.test.tsx src/test/ReceiptPrint.test.tsx`: 6 files, 66/66 tests passed
- `python scripts/manage_headers.py check`: 810/810 files compliant
