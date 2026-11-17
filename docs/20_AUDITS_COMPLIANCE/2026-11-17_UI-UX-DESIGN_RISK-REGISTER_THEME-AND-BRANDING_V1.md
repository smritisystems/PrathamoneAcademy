---
title: "Theme and Branding Refactoring Risk Register"
module: "20_AUDITS_COMPLIANCE"
category: "RISK-REGISTER"
document_type: "REGISTER"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-17"
updated_date: "2026-11-17"
author: "Jawahar R Mallah"
organization: "Smritisys & AITDL Networks"
status: "In Progress"
tags: ["risk", "theme", "branding", "migration"]
entities: ["TenantBranding", "UserAppearancePreference", "DesignToken"]
api_routes: []
related_modules: ["17_UI_UX_DESIGN", "12_RBAC_SECURITY", "14_PRINTING_DOCUMENTS"]
---

# Theme and Branding Refactoring Risk Register

| ID | Risk | Likelihood / impact | Mitigation and release gate |
|---|---|---|---|
| R1 | User intended a different orange hex than the original request's `#F16906` | Low / Medium | Initial implementation uses `#F16906`; confirm only if a different value was intended |
| R2 | Tenant `accent_color` behavior is overwritten while consolidating brand application paths | Medium / High | Tenant precedence is preserved; add broader cached/fresh tenant parity tests |
| R3 | Theme flashes during startup because brand and appearance initialize at different times | Medium / Medium | Prehydration and browser startup were verified; repeat across tenant cache/no-cache cases |
| R4 | Existing media-based `dark:` utilities conflict with explicit saved preference | Medium / Medium | Class-based strategy is explicit; validate every identified file and remaining route |
| R5 | Hardcoded colors remain in uninspected or rarely visited pages, creating hybrid UI | High / Medium | Build an exhaustive color/page inventory and use visual route coverage; phase rollout |
| R6 | Low-contrast text, focus, disabled, or status state in one mode | Medium / High | Semantic palette review, automated pair checks, keyboard/manual accessibility sign-off |
| R7 | Charts/SVGs use literal colors and become unreadable or semantically misleading | Medium / High | Chart/SVG inventory and mode-specific visual tests; retain domain palette where intentional |
| R8 | Dark mode changes receipt/PDF content presentation or historical record meaning | Low / High | Isolate print/export styles; verify actual PDF/print artifacts in both modes |
| R9 | Browser-local preference does not synchronize across users/devices | Medium / Low | Declare as product scope; require separate approval before DB/API synchronization |
| R10 | EduBoard canvas colors are inadvertently tied to app tokens | Medium / Medium | Keep editor theme independent and add export checks |
| R11 | Theme state is confused with View/Edit governance or survives a business state transition incorrectly | Low / High | Keep appearance state separate; test existing navigation/logout Edit reset behavior |
| R12 | Broad token migration breaks custom classes or dynamic Tailwind palette usage | Medium / Medium | Preserve compatibility aliases during migration; verify production build and search consumers before removal |

## Potentially breaking changes requiring explicit notice

- Switching from OS-only dark utilities to a user-selectable class-based theme changes `dark:` behavior.
- Replacing or renaming CSS variables can affect tenant custom branding and prehydration.
- Changing accent default affects buttons, focus, active navigation, and tenant appearance preview.
- Dark page/surface values can affect all app routes and embedded/portal rendering.
- Print CSS changes can alter business documents and should be tested separately from screen theme.

## No backend/database risk under approved scope

Browser-local appearance preference does not require schema or API changes. Cross-device persistence, if requested later, introduces separate privacy, authorization, API, and migration concerns and is not included here.
