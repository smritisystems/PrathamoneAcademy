---
title: "Universal CSV and Excel Export Governance — UTF-8 BOM and RFC-4180 Hardening"
module: "09_FEES_PAYMENTS"
category: "IMPLEMENTATION-REPORT"
document_type: "REPORT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-21"
updated_date: "2026-11-21"
author: "Jawahar R Mallah"
organization: "Smritisys & AITDL Networks"
status: "Approved"
tags: ["fees", "payments", "csv", "xlsx", "export", "utf8", "bom", "encoding", "rfc4180"]
entities: ["BatchMonthlyFeeMatrix", "FeeRegister", "PaymentsLedger", "AcademicReports", "CrmReports"]
api_routes: ["/api/v1/fees/batch-monthly-matrix", "/api/v1/reports/fee-collection", "/api/v1/reports/academic-reports", "/api/v1/reports/withdrawals"]
related_modules: ["03_ACADEMIC_MANAGEMENT", "09_FEES_PAYMENTS", "10_FINANCE_ACCOUNTING", "11_REPORTS_EXPORTS", "15_INTEGRATIONS"]
---

# Universal CSV and Excel Export Governance — UTF-8 BOM & RFC-4180 Hardening Report

## 1. Executive Summary & Forensic Root Cause Analysis

When exporting financial registers, daybook matrices, and administrative reports to CSV on Windows workstations, client users reported two severe rendering defects in Microsoft Excel:
1. **Character Mojibake (`â‚¹` and `â€”`):** Currency signs (`₹` - `\u20B9`) and em-dashes (`—` - `\u2014`) rendered as mangled character sequences `â‚¹` and `â€”`.
2. **Column Shifting & Cell Splitting:** Formatted numeric amounts like `95 (₹95,000)` and `₹66,500` were broken at the thousands separator comma, shifting `95 (₹95` into one cell and `000)` into the adjacent cell, scrambling all student records.

### Root Cause
- **Windows-1252 ANSI Default in Excel:** Microsoft Excel on Windows defaults to interpreting plain CSV files as ANSI (Windows-1252) unless explicitly directed by a leading **UTF-8 Byte Order Mark (`\uFEFF` / `0xEF 0xBB 0xBF`)**. In Windows-1252, the UTF-8 bytes for `₹` (`0xE2 0x82 0xB9`) map directly to `â` + `‚` + `¹`.
- **Missing RFC-4180 Double-Quote Encapsulation:** When cells containing internal commas are joined with comma delimiters without RFC-4180 double-quote escaping (`"95 (₹95,000)"`), CSV parsers treat the internal comma as a column break.

---

## 2. Platform-Wide Remediation & Architecture

### 2.1 Centralized Engine (`frontend/src/utils/reportExport.ts`)
- **`downloadCsvRows(filename, rows)`:**
  1. Prepends `\uFEFF` (UTF-8 BOM) at byte 0 so Excel immediately boots in native UTF-8 Unicode mode.
  2. Runs every cell through `sanitizeCsvValue()`, which unwraps preexisting quotes, escapes internal quotes (`""`), neutralizes formula injection risks (`=`, `+`, `-`, `@`, `\t`, `\r`), and encapsulates the final string in double quotes (`"..."`).
  3. Joins rows with standard `\r\n` (CRLF) for native Windows Excel compliance.
- **`downloadTextCsv(filename, rawCsvContent)`:**
  Guarantees that raw CSV strings received from REST endpoints always have the `\uFEFF` BOM attached before triggering browser download.
- **`handleExportXlsx` in `BatchMonthlyFeeMatrix.tsx`:**
  Provides native styled Microsoft Excel (`.xlsx`) generation with green highlighted payment cells (`#065F46` / `#ECFDF5`), bold headers, and red package summaries.

### 2.2 Synchronized Modules (Frontend & Backend)
1. `BatchMonthlyFeeMatrix.tsx`: Dual export buttons: **Export Excel (.xlsx)** and **Export CSV (.csv)** with zero Mojibake.
2. `Fees.tsx`: `handleExportRegister` and financial reports now route via `downloadCsvRows`.
3. `Payments.tsx`: `handleExport` (Transactions Ledger) now routes via `downloadCsvRows`.
4. `AcademicWorkspace.tsx`: Timetable and academic distribution exports route via `downloadCsvRows` & `downloadTextCsv`.
5. `Dashboard.tsx`: Outstanding receivables drilldown routes via `downloadCsvRows`.
6. `DeviceBindingSettingsPanel.tsx`: Security audit incidents export routes via `downloadCsvRows`.
7. `CrmReportsPage.tsx` & `LeadRegisterPage.tsx`: Lead intake and CRM performance matrix route via `downloadCsvRows`.
8. `Reports.tsx` & `ImportExport.tsx`: Template downloads and dynamic report queries now enforce `\uFEFF` BOM.
9. `backend/app/api/v1/endpoints/reports.py`: Fee collection, academic reports, and withdrawal analytics endpoints now return `.encode("utf-8-sig")` with `media_type="text/csv; charset=utf-8"`.

---

## 3. Verification & Compliance Checklist

- [x] **Mojibake Elimination:** All currency signs (`₹`) and em-dashes (`—`) render natively in Microsoft Excel and Google Sheets without encoding glitches.
- [x] **RFC-4180 Strict Quoting:** Cells with commas remain intact in their designated column.
- [x] **Release Hygiene (Rule 012):** Payload size verified at 173.25 MB with 0 violations.
- [x] **Header Compliance:** 100% (769/769 source files).
- [x] **View-First Governance (Rule 010):** All download actions are read-only exports that do not alter state or require scoped edit mode.
