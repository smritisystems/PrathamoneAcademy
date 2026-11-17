---
title: "Branding Decision Record: Official Orange Accent"
module: "17_UI_UX_DESIGN"
category: "BRANDING-DECISION"
document_type: "DECISION-RECORD"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-17"
updated_date: "2026-11-17"
author: "Jawahar R Mallah"
organization: "Smritisys & AITDL Networks"
status: "Approved for Initial Implementation"
tags: ["branding", "accent-color", "decision", "accessibility"]
entities: ["ProductBranding", "TenantBranding"]
api_routes: []
related_modules: ["17_UI_UX_DESIGN", "13_SYSADMIN_SETTINGS"]
---

# Branding Decision Record: Official Orange Accent

## Decision status

**Approved for initial implementation.** The user responded “continue with orange” and approved implementation. This was mapped to `#F16906`, the exact product orange in the original branding request. The response did not separately provide a hex value; if another orange was intended, that value should be supplied before broader rollout.

## Evidence reviewed

- The prior canonical default was `#F57C00`; the implementation now uses `#F16906` as the product default.
- The app icon is blue/white; the separate transparent wordmark asset visually contains orange.
- `#F16906` is the approved product-default interpretation; tenant-specific `accent_color` remains unchanged and takes precedence when present.
- Contrast estimates against white: navy `#0B2D6B` ≈13.11:1; `#F16906` ≈3.10:1; `#C85200` ≈4.50:1. Use `#C85200` for accessible orange treatments on light surfaces and `#FDBA74` for dark surfaces, not as logo substitutions.

## Decisions recorded

- Product default: `#F16906` (interpreted from the original specified orange).
- Accessible orange treatment: `#C85200` for light surfaces and `#FDBA74` for dark surfaces.
- Tenant precedence: preserve tenant `accent_color` customizations.
- Appearance: Light/Dark/System, default Light, browser-local preference.

## Release note

No database or API change was made. A full route-level contrast and artwork review remains necessary before a broad release.
