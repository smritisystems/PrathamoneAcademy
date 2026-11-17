---
title: "Module Update Matrix for Theme Readiness"
module: "17_UI_UX_DESIGN"
category: "MODULE-IMPACT"
document_type: "MATRIX"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-17"
updated_date: "2026-11-17"
author: "Jawahar R Mallah"
organization: "Smritisys & AITDL Networks"
status: "Draft"
tags: ["module-matrix", "theme", "impact", "migration"]
entities: ["FrontendModule", "DesignToken"]
api_routes: []
related_modules: ["17_UI_UX_DESIGN", "03_ACADEMIC_MANAGEMENT", "04_STUDENT_MANAGEMENT", "08_EXAMINATION", "09_FEES_PAYMENTS"]
---

# Module Update Matrix for Theme Readiness

## Scope note

This is an implementation-impact estimate based on architecture and representative page inspection, not a completed per-screen visual inventory. Specific pages must be enumerated by a source search and then checked in running UI during the implementation phase.

| Surface/module | Expected scope | Primary concerns | Priority |
|---|---|---|---|
| Application shell, header, sidebar | Shared components | Page/surface/text tokens, active/hover states, focus, drawer overlay | P0 |
| Login and authentication | Login and initial route | Tenant logo, prehydration, form errors, contrast, pre-auth mode behavior | P0 |
| Shared controls | Buttons, inputs, badges, cards, modal, pagination | Default/hover/focus/disabled/loading/error states | P0 |
| Dashboard and analytics | Dashboard/cards/charts | Recharts series, axes, grid, tooltip, legends, status colors | P1 |
| Student and user management | Tables, forms, profile | Dense table borders/selection, form validation, permission states | P1 |
| Academic and examination | Data tables, marks, schedules | Status/grade meaning, data density, print/export parity | P1 |
| Fees and finance | Payment/receipt views and reports | Ledger and receipt legibility; immutable history; print isolation | P1 |
| Attendance | Status indicators and tables | Distinguish states without color alone; contrast | P1 |
| Settings and tenant branding | Existing branding controls/preferences | Preserve tenant configuration; distinguish product brand vs user theme | P1 |
| Reports and PDF/export | Browser print and generated artifacts | White-paper output, page breaks, tables, footer/header, logo | P1 |
| EduBoard | Canvas/editor | Keep board background/palette independent of application mode | P2 |
| Navigation customization/search | Existing `dark:` usage among six files | Replace media-only assumptions with explicit user mode; retain preference semantics | P1 |
| Remaining module pages | Inventory required | Replace hardcoded color classes by semantic roles incrementally | P2 |

## File families likely to change after approval

- `frontend/src/index.css` and `frontend/tailwind.config.js`
- `frontend/src/main.tsx` only if a root integration change is necessary; avoid a second provider
- `frontend/public/prehydrate-brand.js`
- `frontend/src/config/branding.ts` and `frontend/src/store/authStore.ts` only to consolidate existing brand application paths while preserving behavior
- `frontend/src/components/Layout.tsx`, `Sidebar.tsx`, and shared components such as `Modal.tsx`, `Pagination.tsx`, `Badge.tsx`, `StatCard.tsx`
- Pages containing the existing six-file `dark:` usage and then the remaining pages found by measured inventory
- Chart, SVG, report, and editor files only where their colors are app-theme colors rather than intentional domain/editor palettes

## Non-goals

No backend model/API change, database migration, business-logic change, data migration, or dependency addition is required by the proposed browser-local theme system. A separate cross-device preference feature would require a new approved design.
