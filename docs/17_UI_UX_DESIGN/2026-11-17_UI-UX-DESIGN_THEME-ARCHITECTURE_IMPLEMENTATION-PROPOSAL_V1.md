---
title: "Theme Architecture and Preference Behavior"
module: "17_UI_UX_DESIGN"
category: "THEME-ARCHITECTURE"
document_type: "PROPOSAL"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-17"
updated_date: "2026-11-17"
author: "Jawahar R Mallah"
organization: "Smritisys & AITDL Networks"
status: "In Progress"
tags: ["theme", "architecture", "preferences", "dark-mode"]
entities: ["UserAppearancePreference", "DesignToken"]
api_routes: []
related_modules: ["17_UI_UX_DESIGN", "13_SYSADMIN_SETTINGS"]
---

# Proposed Theme Architecture and Preference Behavior

## Current state

There is no app-level theme provider at [main.tsx](../../frontend/src/main.tsx), no first-class user Light/Dark/System selector, and no generic persisted theme preference. Tailwind `dark:` utilities occur in `NavigationSettingsPanel.tsx`, `MenuCustomizerModal.tsx`, `GlobalNavigationSearch.tsx`, `Users.tsx`, `UserProfile.tsx`, and `ImportExport.tsx`; with the current Tailwind v3 configuration, they follow the default media-query strategy. This creates a mixed experience if the app later adds a user override.

Brand application currently exists in three overlapping paths: [prehydrate-brand.js](../../frontend/public/prehydrate-brand.js), `applyGlobalBrandTheme` in [branding.ts](../../frontend/src/config/branding.ts), and cached-brand handling in [authStore.ts](../../frontend/src/store/authStore.ts). Consolidation must preserve pre-paint branding and tenant behavior.

## Recommended approach

- Keep a single source of theme state in the existing frontend state-management pattern (Zustand); do not introduce a UI framework or duplicate provider.
- Store a small appearance preference (`light`, `dark`, or `system`) in browser-local storage initially. Resolve `system` against `prefers-color-scheme`; recommend `light` as the first-visit default to preserve current appearance.
- Apply one resolved mode to the document root before first paint where possible, using the existing prehydration entry point rather than adding an independent theme bootstrap. Hydrate the same preference store on app startup and keep it synchronized on explicit user action and OS preference changes when `system` is selected.
- Make Tailwind dark mode explicit and ensure the `.dark` root class and CSS semantic tokens use the same resolved state.
- Keep personal appearance preference distinct from tenant branding settings and from existing navigation preferences.
- Offer the mode selector in a globally available user-facing control. Placement should be confirmed during approval; do not assume the tenant Branding & Appearance panel is appropriate for a per-user setting.

## State and precedence

1. Explicit saved user preference (`light` or `dark`) wins.
2. Saved `system` follows OS preference.
3. Missing/invalid preference falls back to light for first-release behavior compatibility.
4. Tenant brand values customize only the approved brand token layer; they do not choose app appearance or override semantic accessibility tokens.

## Persistence and migration

No database migration or API change is required for a browser-local preference. The repository's `/api/v1/navigation/preferences` and `UserNavigationPreference` are navigation-specific and should not be repurposed as theme storage. If cross-device preference synchronization is a product requirement, it needs a separate approved data/API design and is explicitly out of current scope.

## Boundary conditions

- Navigation/logout resets View/Edit business state as required by existing governance; the visual theme preference should not be coupled to business edit mode.
- Print, receipt iframe, and PDF output should use explicit print/export colors rather than inheriting the interactive theme.
- EduBoard's user-selected canvas theme remains independent.
- Branding prehydration must avoid a flash of unbranded content and avoid a flash of the wrong theme; test both with cache present and absent.

## Implementation status and remaining rollout risks

- Implemented in the existing Zustand pattern without a new provider or dependency.
- The preference selector is in the sidebar footer; browser-local persistence and Light/Dark/System were approved.
- Pre-hydration mode restoration and OS preference changes were verified in a local browser preview.
- Remaining checks include shared-device privacy expectations, storage-denial behavior, authenticated route coverage, and theme/brand cache interaction across tenants.
