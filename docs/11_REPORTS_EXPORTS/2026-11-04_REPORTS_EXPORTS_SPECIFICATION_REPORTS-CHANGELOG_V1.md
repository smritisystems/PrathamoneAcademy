---
title: "Reports & Dashboard Changelog"
module: "11_REPORTS_EXPORTS"
category: "SPECIFICATION"
document_type: "SPECIFICATION"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-04"
updated_date: "2026-11-04"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["11-reports-exports", "specification"]
entities: []
api_routes: ["/api/v1/reports"]
related_modules: []
---

# Reports & Dashboard Changelog

## [1.1.0] - 2026-11-03
### Added
- Coaching institute terminology audit and UI rebranding across Dashboard, Sidebar, and Layout.
- Multi-dimensional dashboard filters (`academic_year_id`, `standard_id`, `division_id`).
- Dynamic academic year initialization defaulting to `is_current == True`, with historical selection retention.
- Monthly fee collection trend time-series chart (`monthly_trends`) powered by real payment aggregations.
- Enriched recent payment transactions with receipt number, student name, admission number, batch, method, amount, and date.
- Dedicated navigation routes and UI workflows for Courses, Batches, Subjects, and Examinations.

## [1.0.0] - 2024-01-01
### Added
- Tabbed reporting interface in `Reports.tsx`.
- Fee collection and outstanding balance calculations.
- CSV and Excel export binary downloads.
- Payment method distribution summary.

