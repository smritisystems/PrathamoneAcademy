---
title: "Switchable Month-Centric Fee Collection Matrix and Institute Daybook"
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
tags: ["fees", "collection-matrix", "month-daybook", "cross-tabulation", "transposed-grid"]
entities: ["FeeInvoice", "Payment", "Division", "Standard", "Board", "Student"]
api_routes: ["/api/v1/fees/month-collection-matrix", "/api/v1/fees/batch-monthly-matrix"]
related_modules: ["04_STUDENT_MANAGEMENT", "10_FINANCE_ACCOUNTING"]
---

# Switchable Month-Centric Fee Collection Matrix & Institute Daybook

## 1. Executive Summary

As part of the continuous refinement of **PrathamOne EduOS** (Coaching Institute Edition), the **Batch Monthly Fee Collection Matrix** (`/fees/matrix`) has been enhanced into a dual-perspective financial command center:

1. **Perspective A — By Batch (Cohort 12M Grid)**: Allows executive drilldown into specific student batches with standard 12-month cross-tabulation and a 1-click **[ 🔄 Transpose Grid ]** toggle to flip axes (Students on Rows, Months on Columns) for dense cohort rosters.
2. **Perspective B — By Month (Institute Daybook)**: Provides an institute-wide daybook organized by academic month (April 2026 to March 2027) with recovery rate health badges, 4 executive KPIs, Batch Performance Cross-Tabulation, and an operational Student Collection Roster with search and 1-click collection/receipt actions.

---

## 2. Architecture & SSOT Principles

All calculations are executed server-side via canonical REST endpoints with zero database schema duplication:
- **Canonical Ingestion**: Fee commitments are sourced directly from `fee_invoices` (`net_amount` divided into 12 academic installments).
- **Live Receipts**: Collections are aggregated dynamically from `payments` linked to enrolled students.
- **Data Deduplication (Rule 011)**: Shared academic boards, standards, and divisions are reused across cohorts without duplicate records.
- **RFC-4180 Universal Export**: Excel (`.xlsx`) and CSV exports use UTF-8 BOM (`\uFEFF`) and cell formatting for seamless spreadsheet import.

---

## 3. UI/UX & Functional Capabilities

### 3.1 Perspective Switcher & Command Deck
- **Perspective Toggle**: Pill switcher toggles instantly between `[ 👥 By Batch ]` and `[ 📅 By Month ]`.
- **Transpose Grid**: In Batch view, allows users to view Students on Rows and Months on Columns, solving horizontal scrolling on wide screens.

### 3.2 12-Month Academic Carousel
- Displays 12 horizontal month pills (`Apr 2026` ... `Mar 2027`).
- Each pill displays the month name, realization rate %, and dynamic color badge:
  - 🟢 **Emerald**: ≥ 80% Realization.
  - 🟡 **Amber**: 40% – 79.9% Realization.
  - 🔴 **Rose**: < 40% Realization for overdue/past months.
  - ⚪ **Slate**: Upcoming academic months.

### 3.3 Executive Monthly KPIs
- **Month Target**: Aggregated expected installment dues for the selected month.
- **Realized Collections**: Actual cash, UPI, and bank receipts realized in that month.
- **Pending Receivables**: Uncollected balance for the active month.
- **Mode Breakdown**: Live split across UPI, Cash, and Bank/NEFT transfers.

### 3.4 Batch Performance Cross-Tabulation
- Comprehensive table listing every active batch with Enrolled Students, Target Amount, Collected Amount, Pending Receivables, Recovery Rate %, Defaulters Count, and 1-click filter button.

### 3.5 Student Collection Roster
- Instant search by student name, admission number, or receipt number.
- Batch filter dropdown and Status filter (`All`, `Paid`, `Partial`, `Overdue`, `Upcoming`).
- 1-click "Collect Fee" action opening the collection terminal or modal.

---

## 4. Verification & Automated QA

1. **Pytest Acceptance**: `tests/test_month_collection_matrix.py` validates 12 academic months, KPI consistency, batch summaries, and student rosters (PASSED 100%).
2. **Hygiene & Attribution**: 100% compliance across 794 tracked source files verified with `manage_headers.py`.
3. **Release Hygiene**: Verified clean via `check_release_hygiene.py`.
