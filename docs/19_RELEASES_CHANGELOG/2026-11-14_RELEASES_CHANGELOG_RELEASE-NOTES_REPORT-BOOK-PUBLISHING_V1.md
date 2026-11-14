---
title: "Report Book Publishing Release Notes"
module: "19_RELEASES_CHANGELOG"
category: "RELEASE-NOTES"
document_type: "RELEASE-NOTES"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-14"
updated_date: "2026-11-14"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Review Required"
tags: ["report-book", "reports", "pdf", "release-notes"]
entities: ["ReportBookTemplate", "ReportBookGeneration", "ReportBookGenerationEvent"]
api_routes: ["/api/v1/reports/books/templates", "/api/v1/reports/books/generations", "/api/v1/reports/books/events"]
related_modules: ["11_REPORTS_EXPORTS", "12_RBAC_SECURITY", "14_PRINTING_DOCUMENTS"]
---

# Report Book Publishing — Release Notes

## Summary

Introduces a composition and publishing workflow in the existing Reports module. Report books reuse authorized source report APIs and do not duplicate report calculations or financial transactions.

## Added

- View-first report-book builder with chapter/subchapter ordering, per-report inclusion, title/divider/note/appendix pages, and reusable templates.
- Eleven predefined book configurations covering academics, attendance, exams, homework, fees, concessions, admissions, teacher/staff payroll, annual reporting, and year closing.
- A4, A5, Letter, and custom page dimensions; portrait/landscape sections; branded PDF cover, dynamically paginated contents, bookmarks, and continuous page numbering.
- Selected-book, chapter, and individual-report PDF downloads, plus browser print preview.
- Institution-scoped template and generation audit metadata with document IDs and recorded download/print events.
- Granular `reports:view`, `reports:manage_templates`, `reports:generate_books`, `reports:download`, and `reports:print` permissions.

## Governance

- Existing report APIs remain authoritative for data, calculations, source permissions, institution scope, and supported filters.
- Generated books display their filter scope and identify filters not applied by a source report.
- Generation snapshots store report IDs, row counts, filters, layout configuration, and server generation time; they do not archive report rows or mutate financial transactions.
- Apply migrations `048_report_book_publishing` and `049_report_book_permissions` only after release approval.
- No deployment or migration execution was performed as part of this implementation.

## Verification

- Frontend production build: passed.
- Focused frontend report-book/report/print tests: 22 passed.
- Focused backend book-publishing and source-report tests: 14 passed.
- Generated multi-page A5 PDF parsed successfully in tests with both portrait and landscape sections.

## Known limits / release gates

- Optional Excel attachments are not included; existing source report exports remain available.
- Production-scale book stress testing and visual review of exact contents destinations/printer output remain required before release.
- Status remains **Review Required** pending those checks and explicit deployment approval.
