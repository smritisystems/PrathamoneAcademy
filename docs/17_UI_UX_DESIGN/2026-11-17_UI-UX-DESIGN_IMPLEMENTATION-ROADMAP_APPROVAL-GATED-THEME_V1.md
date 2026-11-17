---
title: "Approved Theme and Branding Implementation Roadmap"
module: "17_UI_UX_DESIGN"
category: "IMPLEMENTATION-ROADMAP"
document_type: "ROADMAP"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-17"
updated_date: "2026-11-17"
author: "Jawahar R Mallah"
organization: "Smritisys & AITDL Networks"
status: "In Progress"
tags: ["roadmap", "theme", "branding", "approval"]
entities: ["DesignToken", "UserAppearancePreference", "TenantBranding"]
api_routes: []
related_modules: ["17_UI_UX_DESIGN", "18_TESTING_QA", "14_PRINTING_DOCUMENTS"]
---

# Approved Theme and Branding Implementation Roadmap

## Recommendation

**Partial theme architecture refactoring** is recommended. Current CSS variables, shared classes, dynamic brand palette, tenant-aware branding, responsive shell, and dedicated print/PDF paths are valuable working foundations. The missing global mode preference, implicit media-driven dark utility behavior, overlapping brand CSS mutation paths, and scattered colors justify a focused refactor, not a full component rewrite.

## Phases and status

| Phase | Deliverable | Status / gate |
|---|---|---|
| 0. Product decisions | Product orange, tenant accent precedence, Light/Dark/System, browser-local persistence | Approved; orange mapped to original `#F16906` request |
| 1. Baseline inventory | Existing code architecture, colors, preferences, print paths | Audit package complete |
| 2. Token foundation | Semantic light/dark tokens and explicit Tailwind strategy | Implemented; full contrast review remains |
| 3. Theme preference | Zustand preference, prehydration coordination, sidebar selector | Implemented; browser verified for light/dark/system |
| 4. Shared shell/components | Layout, sidebar, common CSS primitives | Initial pass complete; route-level verification remains |
| 5. High-traffic modules | Login, dashboard, user/student/academic/fees/attendance pages; charts and SVG inventory | Login updated; remaining route/chart coverage is follow-up |
| 6. Special rendering | Print/receipt/PDF and EduBoard isolation | Existing behavior preserved; artifact parity test remains |
| 7. Rollout and cleanup | Full route review, cleanup, updated guidance | Pending product visual acceptance |

## Proposed scope exclusions

- No new dependency or UI framework.
- No backend, database schema, API, authentication, business logic, or financial ledger changes.
- No changes to tenant branding semantics without explicit decision.
- No migration of EduBoard editor palettes into app theme tokens.
- No rework of unrelated visual or interaction defects.

## Approval record and remaining gates

- [x] Partial theme architecture refactoring approved.
- [x] Orange selected, implemented as the original requested `#F16906`; tenant accent customizations preserved.
- [x] Light/Dark/System approved; first-visit default Light.
- [x] Browser-local preference approved; no schema or API migration.
- [x] Implementation authorized.
- [ ] Complete authenticated route, chart, responsive, accessibility, and print/PDF visual acceptance.

The current implementation is the initial approved phase, not a claim that every route and rendered artifact has completed final visual acceptance.
