---
title: "Design Token Specification for Official Branding and Themes"
module: "17_UI_UX_DESIGN"
category: "DESIGN-SYSTEM"
document_type: "SPECIFICATION"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-17"
updated_date: "2026-11-17"
author: "Jawahar R Mallah"
organization: "Smritisys & AITDL Networks"
status: "Approved for Initial Implementation"
tags: ["design-tokens", "branding", "theme", "accessibility"]
entities: ["DesignToken", "TenantBranding"]
api_routes: []
related_modules: ["17_UI_UX_DESIGN", "13_SYSADMIN_SETTINGS"]
---

# Design Token Specification

## Approved initial scope

The user approved Light/Dark/System, browser-local preference storage, preservation of tenant accent customization, and the partial refactoring roadmap. “Continue with orange” was implemented using the exact orange `#F16906` specified in the original branding request. The accessible orange treatment is `#C85200` on light surfaces and `#FDBA74` on dark surfaces.

## Implemented token values

| Role | Light | Dark | State |
|---|---|---|---|
| Product navy | `#0B2D6B` | `#0B2D6B` | Existing brand color; use context-specific contrast checks |
| Product accent | `#F16906` | `#F16906` | Approved product default; tenant accent remains independent |
| Accessible orange treatment | `#C85200` | `#FDBA74` | Text/focus treatment, not a replacement logo color |
| Page background | `#F5F7FA` | `#081426` | Approved targets |
| Primary surface | `#FFFFFF` | `#10223B` | Implemented |
| Subtle surface | `#F1F5F9` | `#142943` | Implemented |
| Primary text | `#111827` | `#F3F6FB` | Implemented |
| Secondary text | `#475569` | `#B8C6D9` | Implemented |
| Border/divider | `#E2E8F0` | `#31445F` | Implemented |
| Focus token | `#C85200` | `#FDBA74` | Token defined; audit all control states |
| Success / warning / danger / info | Existing status palettes | Existing status palettes | Preserve meaning; remaining modules need review |

`#F16906` measures approximately 3.10:1 against white and is not suitable for normal-sized text on white. `#C85200` measures approximately 4.50:1 against white; verify actual foreground/background pairings and retain margin where possible.

## Naming and layering proposal

Use semantic names (`--color-page`, `--color-surface`, `--color-text`, `--color-border`, `--color-focus`, `--color-action`) as the stable component contract. Keep raw palette values in a small primitive layer and map them to semantic tokens per light/dark mode. Keep tenant customization as a distinct layer with allowlisted brand variables; never let a tenant override page text, danger, focus, or contrast-critical tokens without validation.

Tailwind should consume semantic CSS variables rather than hardcoding product colors in multiple extensions. Preserve the existing dynamic tenant palette and utility compatibility during migration; deprecate old names only after all callers have moved.

## Acceptance conditions

1. User-approved product accent and tenant precedence are preserved.
2. Token pairings are verified at 4.5:1 for normal text, 3:1 for large text and meaningful non-text controls, and focus visibility is checked.
3. Every supported semantic role has light and dark values; status roles remain distinguishable without color alone.
4. Tenant branding, prehydration, favicon, and browser theme-color behavior remain intact.
5. Print/PDF and EduBoard behavior are verified independently before release.
