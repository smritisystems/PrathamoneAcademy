---
title: "Annual, Board, and Standard/Grade Fee Realization Dimensions"
module: "09_FEES_PAYMENTS"
category: "FEATURE-REPORT"
document_type: "REPORT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-24"
updated_date: "2026-11-24"
author: "Jawahar R Mallah"
organization: "Smritisys & AITDL Networks"
status: "Approved"
tags: ["fees", "dimensions", "annual-yearwise", "board-matrix", "standard-ledger", "enterprise-datatable"]
entities: ["AcademicYear", "Board", "Standard", "Division", "Student", "FeeInvoice", "Payment"]
api_routes: ["/api/v1/fees/dimension-analytics", "/api/v1/fees/month-collection-matrix", "/api/v1/fees/batch-monthly-matrix"]
related_modules: ["03_ACADEMIC_MANAGEMENT", "04_STUDENT_MANAGEMENT", "10_FINANCE_ACCOUNTING"]
---

# Annual, Board, and Standard/Grade Fee Realization Dimensions

## 1. Executive Summary

In response to coaching institute governance requirements, the **PrathamOne EduOS** Fee Management subsystem has been elevated with **5 Multi-Dimensional Financial Control Perspectives**:

1. **👥 By Batch (Cohort 12M Matrix)**: Interactive 12-month cohort daybook with 1-click `[ 🔄 Transpose Grid ]` action to toggle between Months on Rows vs Students on Rows.
2. **📅 By Month (Institute Daybook)**: Institute-wide daybook featuring a 12-month carousel strip (`Apr 2026` to `Mar 2027`) and the canonical **EnterpriseDataTable** Student Collection Roster with interactive sorting and filtering across every column header.
3. **🏫 By Standard / Grade**: Cross-tabulation comparing Class VIII, Class IX, Class X, Std. 11, etc., tracking enrolled counts, agreed package commitments, realized fees, pending dues, and recovery rates.
4. **🏛️ By Board**: Curriculum-level aggregation across ICSE, CBSE, SSC, Maharashtra State Board, and competitive entrance streams.
5. **📈 Annual Year-wise**: Multi-year comparative analysis comparing historical and active academic years (AY 2024-25, AY 2025-26, AY 2026-27).

---

## 2. Global Enterprise DataTable Standards & Header Interactions

The Student Collection Roster embeds the canonical **EnterpriseDataTable**, implementing interactive sorting and filtering on all table headers:
- `Admission #`: Sortable (A-Z, Z-A) and text filterable.
- `Student Name`: Sortable and text search filterable.
- `Batch / Std`: Sortable and multi-select category filterable.
- `Agreed Pkg`: Sortable (numeric currency) and number range filterable.
- `Month Due`: Sortable (numeric currency) and number range filterable.
- `Paid Amount`: Sortable (numeric currency) and number range filterable.
- `Balance Due`: Sortable (numeric currency) and number range filterable.
- `Payment Details`: Sortable and payment mode filterable (UPI, Cash, Bank).
- `Status`: Sortable and status badge filterable (`Paid`, `Partial`, `Overdue`, `Upcoming`).
- `Action`: 1-click Quick Collect Action opening the Fee Collection terminal.

---

## 3. Server-Side Dimensional Engine (`GET /api/v1/fees/dimension-analytics`)

The backend queries existing normalized tables (`academic_years`, `boards`, `standards`, `divisions`, `student_enrollments`, `fee_invoices`, `payments`) with zero schema duplication (Rule 001 & Rule 002):
- **Annual Aggregation**: Computes year-over-year commitments, realized collections, and recovery rates.
- **Board Aggregation**: Aggregates distinct standards, batches, and student debts by educational board.
- **Standard Aggregation**: Evaluates performance and defaulters by class level.

---

## 4. Automated QA Verification

1. **Test Suite**: `backend/tests/test_dimension_analytics.py` validates annual, board, and standard calculations (PASSED 100%).
2. **Attribution & Header Check**: `manage_headers.py check` verified 795 / 795 source files compliant.
3. **Release Hygiene**: `check_release_hygiene.py` confirmed 0 prohibited files in distribution payload.
