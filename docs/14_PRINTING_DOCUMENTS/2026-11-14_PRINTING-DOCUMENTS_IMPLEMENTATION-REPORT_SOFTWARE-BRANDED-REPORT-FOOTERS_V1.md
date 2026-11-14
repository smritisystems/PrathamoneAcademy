---
title: "PrathamOne EduOS Software-Branded Report Footers"
module: "14_PRINTING_DOCUMENTS"
category: "IMPLEMENTATION-REPORT"
document_type: "REPORT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-14"
updated_date: "2026-11-14"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Implemented"
tags: ["printing", "reports", "software-branding", "pdf"]
entities: []
api_routes: []
related_modules: ["Reports", "Printing Documents"]
---

# Software-Branded Report Footers

## Design

Printable reports use the label "Created by" followed by the full PrathamOne
logo lockup, including its icon and wordmark. A thin divider separates the
footer from report content; the footer stays at the bottom of printed pages.
Institution logos and institution identity remain separate and continue to be
rendered in document headers.

The shared footer exposes `showSoftwareLogo` so statutory or contractual
documents can retain text-only branding or suppress the software attribution
using the existing `showSoftwareBranding` option.

## Coverage

- The Reports workspace appends the shared footer to report printouts.
- The Report Book PDF generator embeds the full software logo independently
  from the institution logo and draws it beside the footer attribution on each
  page.
- Existing shared `PrintFooter` consumers inherit the full logo lockup.
- CSV and spreadsheet exports retain their existing text-only branding. Their
  data content and export behavior are unchanged.

## Product artwork

The software logo and app icon now use the supplied `frontend/public/artwork/14112026`
assets. The full lockup is sourced from `batch_g1-4_1080.svg` (with its PNG
export for image-only consumers); the square app icon and favicon use
`batch_rect1-1-8-6_10802.svg` and its 337 × 337 PNG export. PWA manifests,
browser icons, install UI, report footers, and the Report Book use the shared
branding configuration or these same canonical assets.

Institution logos remain tenant-specific. Institution-specific favicon
overrides are preserved, while legacy software-default favicon paths resolve to
the new product icon.

## Verification

- Focused print-footer, Reports workspace, and Report Book PDF tests: 24 passed.
- Branding tests verify the new logo/icon mapping and preservation of tenant
  logo and favicon overrides.
- Frontend production TypeScript/Vite build: passed.
- No report calculations, data filters, financial logic, or source reports were
  changed.
- No migration or deployment was performed.
