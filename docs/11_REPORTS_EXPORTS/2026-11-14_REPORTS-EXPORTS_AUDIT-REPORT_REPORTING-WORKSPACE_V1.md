---
title: "Reporting Workspace Audit and Fix Report"
module: "11_REPORTS_EXPORTS"
category: "AUDIT-REPORT"
document_type: "REPORT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-14"
updated_date: "2026-11-14"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["reports", "audit", "data-mapping", "regression"]
entities: ["Student", "StudentEnrollment", "FeeInvoice", "Payment"]
api_routes: ["/api/v1/reports/*", "/api/v1/fees/overview"]
related_modules: ["09_FEES_PAYMENTS", "10_FINANCE_ACCOUNTING", "16_DATABASE_API"]
---

# Reporting Workspace Audit and Fix Report

## Executive summary

The Reporting & Analytics Centre catalog contains 49 reports across seven categories, including 20 concession-governance reports. A live, authenticated API and UI review found that several reports returned populated data but displayed blank or zero-valued cells because the frontend used field names that differed from established API payloads. Deep links also did not select the report named in their query parameters. Both withdrawal report endpoints returned HTTP 500 for applicable records.

The confirmed field mappings and withdrawal failures have been corrected. Report navigation now follows `category` and `report` query parameters and updates them when a user changes reports. Active report-query failures are displayed with a retry action rather than appearing as an empty result set.

## Findings and remediation

| Report surface | Finding | Correction |
|---|---|---|
| Report deep links | `?category=fees&report=fee-defaulters` was ignored; the page defaulted to Student Master. | Initialize selection from validated URL parameters, follow browser URL changes, and keep parameters synchronized with report navigation. |
| Financial Audit & Reconciliation Ledger | Batch API fields are `total_fees`, `collected`, `outstanding`, and `rate`; the grid expected different names and displayed zeros. | Bind the grid to the API's canonical `BatchBreakdown` fields. |
| Batch Capacity & Occupancy Analysis | API fields are `capacity`, `enrolled`, and `occupancy_percentage`; the grid expected `total_capacity`, `enrolled_count`, and `occupancy_rate`. | Bind the table to the returned capacity, enrollment, and occupancy fields. |
| Board & Standard Distribution Audit | API emits `occupancy_percentage`; the table read `occupancy_rate`. | Use `occupancy_percentage` in the table. |
| Faculty Teaching Load & Mentorship Audit | API returns `designation`, `weekly_sessions_count`, and `total_students`; the table expected department and non-existent hours/student keys. | Use the returned fields and label the count as weekly sessions rather than hours. |
| Withdrawal reports | Analytics called the route function with FastAPI `Query` defaults instead of concrete optional values. A second failure compared an unmapped legacy fee-item `due_date` property in SQL. | Pass explicit `None` filter values when reusing the report function; count persisted invoice due dates, and label the result as an invoice milestone rather than inventing installment dates. |
| Withdrawal analytics | UI summary used a prior schema (`withdrawn_students`, `gross_paid`, etc.), while the API emits `total_withdrawn`, `total_gross_paid`, and related aggregate names. | Bind KPI cards and the frontend response type to the current API summary contract. |
| Communication Dispatch Logs | UI expected `recipient_contact` and `template_title`; the API returns `recipient_destination`, `template_code`, and `subject`. | Display the returned contact, message type, and subject fields. |
| Import History | UI expected `success_rows` and `error_rows`; API returns `successful_rows` and `failed_rows`. | Bind the grid to the response schema. |
| Report query failures | Failed requests could leave a report looking empty or partially rendered. | Show an explicit active-report error with a retry action. |

## Validation evidence

- Reviewed the 49-report catalog, its category/query selection, shared concession-report response handling, and report-table mappings.
- Checked the live report APIs for payload keys and status. The fee-defaulters API returned an empty list because there were no invoices with persisted due dates before the report date; this is a valid zero-record result, not a missing-data mapping.
- Reproduced the financial reconciliation mismatch with nonzero batch data and aligned the UI to the backend response contract.
- Added frontend regression tests for deep-link selection, financial reconciliation, batch capacity, board distribution, faculty load, withdrawal analytics, communication logs, and import history.
- Added backend regression coverage for withdrawal report and analytics behavior, including the absence of a persisted invoice due date.

## Interpretation of empty reports

An empty result can be correct when the selected filters match no source records. For example, fee defaulters are selected by persisted invoice due date and overdue status. A report should only be classified as defective when its source API has matching rows or values but the UI fails to render them, or when the API fails. The audit corrected both kinds of defects without creating replacement data or changing financial source records.

## Remaining data-dependent cases

Reports such as examination merit, homework activity, import history, and CRM analytics may be empty when their respective source records do not exist for the selected scope. Their successful empty responses should not be mistaken for rendering failures. The shared concession reports derive their columns from the API response, so their mapping is data-driven rather than duplicated in the frontend.
