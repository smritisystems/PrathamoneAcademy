---
title: "Theme and Branding Test Criteria"
module: "18_TESTING_QA"
category: "TEST-PLAN"
document_type: "TEST-CRITERIA"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-17"
updated_date: "2026-11-17"
author: "Jawahar R Mallah"
organization: "Smritisys & AITDL Networks"
status: "Draft"
tags: ["testing", "theme", "branding", "regression"]
entities: ["DesignToken", "UserAppearancePreference", "TenantBranding"]
api_routes: []
related_modules: ["17_UI_UX_DESIGN", "18_TESTING_QA"]
---

# Theme and Branding Test Criteria

## Test levels

### Unit tests

- Resolve default/missing, valid, and invalid appearance values.
- `system` mode follows current OS preference and responds to OS changes.
- Explicit light/dark selections override OS preference.
- Theme application updates one canonical document-root state and does not mutate tenant brand configuration.
- Tenant branding prehydration and post-hydration produce the same approved CSS variable set.

### Component/integration tests

- Shared buttons, inputs, badges, cards, modals, pagination, layout, and sidebar render all required states in both modes.
- Keyboard use and focus visibility for theme selector, modal, and navigation drawer.
- Theme selection persists after reload; browser-local storage unavailable/invalid falls back safely to light with visible diagnostics only when repository convention requires.
- Login, tenant logo, cached branding, logout, and account/navigation transitions do not reset or corrupt the appearance preference.
- Existing View/Edit state reset behavior remains unchanged.

### Visual and accessibility tests

- Capture approved viewport set from the responsive audit in both light and dark.
- Measure all semantic text and meaningful component foreground/background pairs against WCAG AA thresholds.
- Check chart labels, series, gridlines, tooltip, legends, status colors, SVG icon states, and selected/disabled/focus states.
- Perform keyboard-only and screen-reader spot checks; check 200% zoom and narrow reflow.

### Print/export tests

- Receipt preview, browser print, and generated PDF are equivalent in light/dark interactive modes.
- Verify page breaks, clipping, grayscale, page count, logo, totals, and data preservation.
- Verify EduBoard exports retain their own chosen canvas appearance.

## Existing project test tooling

Vitest is present in the frontend package configuration. No axe/pa11y/Lighthouse dependency was identified in the inspected dependency inventory. Prefer existing test tooling and add no packages without a demonstrated gap and approval.

## Release gates

1. Brand decision (exact approved red and tenant precedence) recorded.
2. All existing tests pass; focused theme tests pass.
3. Token contrast checks pass for every approved semantic pair.
4. No business/API/database changes are introduced without separate review.
5. Visual test matrix has no unresolved P0/P1 regressions.
6. Print/PDF and tenant-brand behavior are verified in both modes.
