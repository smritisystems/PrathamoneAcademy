---
title: "PrathamOne EduOS — Navigation Experience Research and Recommendations"
module: "17_UI_UX_DESIGN"
category: "NAVIGATION-UX-RESEARCH"
document_type: "RESEARCH-REPORT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-17"
updated_date: "2026-11-17"
author: "Jawahar R Mallah"
organization: "Smritisys & AITDL Networks"
status: "Approved"
tags: ["navigation", "sidebar", "mobile", "accessibility", "footer", "ux-research"]
entities: []
api_routes: []
related_modules: ["01_ARCHITECTURE", "12_RBAC_SECURITY", "17_UI_UX_DESIGN", "18_TESTING_QA"]
---

# PrathamOne EduOS — Navigation Experience Research and Recommendations

## Executive recommendation

Keep the responsive, permission-aware sidebar as the way to reach the complete enterprise module hierarchy. Do not replace it with a bottom bar or conduct a broad menu rewrite in one pass.

Make targeted improvements in this order:

1. Make the mobile drawer reliably operable by keyboard and assistive technology.
2. Make the canonical module registry the actual source for the sidebar tree and remove parallel route definitions incrementally.
3. Reduce the initial menu length by opening the active section rather than every section.
4. Put a direct, labeled search control in the mobile header.
5. Keep the footer as product and system context; separate its Notices, Chats, and EduBoard shortcuts from any new primary navigation.
6. Add a dedicated mobile navigation bar only if role-specific usage and usability testing identify a small, stable set of frequently used top-level destinations. Keep the full drawer as the “More” destination.

This is a research/code review, not a usability study or a WCAG conformance audit. No navigation code was changed as part of this report.

## Scope and evidence

The review inspected the existing sidebar and stores, app shell, footer, canonical module registry, and sidebar tests:

- [Sidebar.tsx](../../frontend/src/components/Sidebar.tsx)
- [sidebarStore.ts](../../frontend/src/store/sidebarStore.ts)
- [Layout.tsx](../../frontend/src/components/Layout.tsx)
- [Footer.tsx](../../frontend/src/components/Footer.tsx)
- [BottomBarDrawer.tsx](../../frontend/src/components/common/BottomBarDrawer.tsx)
- [modules.ts](../../frontend/src/config/modules.ts)
- [navigationStore.ts](../../frontend/src/store/navigationStore.ts)
- [Sidebar.test.tsx](../../frontend/src/test/Sidebar.test.tsx)

The review did not use production navigation telemetry, conduct interviews, or perform a live screen-reader/touch audit. Source observations below describe code, not verified behavior across all browsers and assistive technologies.

## Current-state findings

### Navigation structure and consistency

- The canonical module registry already includes categories, routes, permissions, and sub-items, including Planning & Activities.
- The sidebar also defines substantial module and subroute arrays and repeated rendering branches. The registry is imported, but its presence alone does not make it the sole source of the rendered menu; route labels, grouping, and active-state behavior can drift between representations.
- Most sidebar sections default open in the persisted sidebar store. With many groups, this can make the first view long and increase scanning and scrolling.
- The full sidebar and the student-specific sidebar use separate render paths. Any consolidation must preserve each role’s authorized routes and student experience.

### Mobile drawer and accessibility

- The app uses a hamburger-triggered off-canvas sidebar on narrow layouts. Escape, backdrop click, and route changes close it, and current tests cover basic open/close behavior.
- The trigger has a static “Open navigation menu” label, but no explicit `aria-expanded` or `aria-controls` state was found. The drawer does not declare modal semantics or implement an explicit focus-management lifecycle in the inspected code.
- The off-canvas state is primarily expressed with a transform. It should be tested to ensure closed links cannot receive keyboard focus or be reached in the accessibility tree.
- Twelve sidebar flyout containers use `role="menu"`. No corresponding `menuitem` roles or full menu-widget keyboard model were found in the inspected sidebar. Ordinary website navigation generally works better as semantic navigation/list/disclosure controls than as an ARIA menu widget.
- Existing sidebar tests do not cover focus placement/restoration, focus containment, screen-reader announcements, touch-target dimensions, or mobile route discovery.

### Footer and mobile shell

- The existing “bottom bar” is an application footer with `role="contentinfo"`, not a primary navigation tab bar. It combines tenant/product/system context with Notices, Chats, and EduBoard shortcuts.
- The quick actions are repeated in the collapsed and expanded footer branches. Chats and EduBoard open utility drawers while Notices navigates to a route, so the control set mixes different interaction patterns.
- The collapsed quick-action buttons specify a 30px minimum height. This is above WCAG 2.2’s 24px minimum size where that criterion applies, but a larger mobile target is a useful usability goal. Expanded-state controls should also be measured rather than assumed compliant.
- The footer collapse state is persisted in local storage. A stored preference can override the default that collapses the footer on narrow screens.
- Global Search is hidden from the header below the small-screen breakpoint; users can reach search from the sidebar after opening the drawer.
- The shell already accounts for bottom safe-area space and renders a floating drawer. Any fixed mobile navigation bar must be tested with those elements together and must reserve the correct content space.

## Proposed information architecture

Use the existing permission-filtered module registry as the single navigational definition. Prefer one home for each destination; use search, pinned items, or contextual links for secondary discovery rather than duplicating the route in multiple groups.

Suggested desktop sections, subject to role and task validation:

1. **Home** — Dashboard.
2. **Students & Admissions** — student records and admissions/CRM.
3. **Academics & Learning** — academic structure, timetable, examinations, homework, and study materials.
4. **People & Workforce** — teachers, staff, attendance, and payroll.
5. **Finance** — fees, payments, and financial reporting.
6. **Operations** — Planning & Activities, communication, forms, and operational utilities.
7. **Administration & Tools** — users/roles, settings, system administration, and tools, filtered by existing permissions.

The exact grouping and labels should be checked with representatives from administrator, teacher, staff, and student roles. It is not a proposal to duplicate or move business entities, routes, permissions, or APIs.

On desktop, keep the collapsible sidebar and active-route context. Show the current section expanded by default; preserve a user’s explicit section preference if that is important to established workflows. Keep user-pinned/recent destinations, but do not let customization hide the only path to a required destination.

On mobile:

- Keep the hamburger drawer for the complete role-authorized hierarchy.
- Add a clearly labeled Search button in the header so search does not require opening the drawer first.
- Consider a dedicated bottom navigation bar with three or four high-frequency, top-level destinations and a labeled **More** control that opens the drawer. Select destinations per role only after gathering evidence; do not assume one set fits administrators, teachers, and students.
- Use the bar for navigation, not as a container for unrelated actions. Retain the existing shortcuts during any redesign and place them in a clearly named utility surface, such as a toolbar or quick-actions tray.
- If usage research does not identify a stable small set of primary destinations, keep the drawer-only mobile pattern and improve its search and accessibility rather than adding a permanent bar.

## Research basis

- **W3C WCAG 2.2, Target Size (Minimum), SC 2.5.8:** pointer targets should be at least 24 by 24 CSS pixels or meet a stated exception. W3C notes that larger targets improve usability and points to 44 by 44 CSS pixels as the enhanced threshold. Use 44px as a mobile design target where practical, not as a claim that every control must meet it for AA.
- **W3C WCAG 2.2, Reflow, SC 1.4.10:** test ordinary content at a width equivalent to 320 CSS pixels without loss of functionality or two-dimensional scrolling, except for content that inherently requires it.
- **WAI-ARIA APG, Disclosure Navigation:** its example explicitly avoids `role="menu"` for ordinary site navigation unless the more complex menu-widget interactions are implemented. Prefer semantic lists and disclosure buttons with synchronized expanded state; test with real assistive technology.
- **WAI-ARIA APG, Modal Dialog:** if the mobile drawer is intended to be modal, move focus into it on open, keep Tab/Shift+Tab within it, close on Escape, and restore focus to the invoking control. Mark it modal only when background interaction is actually prevented.
- **Apple Human Interface Guidelines, Tab bars:** use tabs for top-level section navigation, not actions; provide labels, favor fewer frequently used sections, and avoid overflow that hides destinations. The HIG recommends five or fewer default tabs when customization is offered.
- **Material Design 3:** its navigation-bar overview positions navigation bars for handheld/smaller screens, while its drawer overview describes access to app destinations on larger devices. This supports a responsive combination, not a requirement to add a bottom bar to every application.

Primary sources, accessed 2026-11-17:

- [WCAG 2.2 — Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
- [WCAG 2.2 — Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html)
- [WAI-ARIA APG — Disclosure Navigation](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/examples/disclosure-navigation/)
- [WAI-ARIA APG — Modal Dialog Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
- [Apple HIG — Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars)
- [Material Design 3 — Navigation bar](https://m3.material.io/components/navigation-bar/overview)
- [Material Design 3 — Navigation drawer](https://m3.material.io/components/navigation-drawer/overview)

## Prioritized implementation and verification

### P0 — Make the mobile drawer predictable and accessible

- Decide whether the drawer is modal. If so, implement focus entry, focus containment, Escape close, focus restoration, background inertness, a visible close control, and accurate trigger state (`aria-expanded`/`aria-controls`). If it is non-modal, remove modal-only behavior and expose the disclosure state accurately.
- Ensure closed mobile navigation is not keyboard-focusable and is not exposed as active navigation to assistive technology.
- Replace menu-widget roles on ordinary link flyouts with semantic disclosure navigation unless the full menu keyboard model is intentionally implemented.
- Add keyboard and accessibility tests; manually test with at least one desktop screen reader and one mobile screen reader.

### P1 — Consolidate navigation definitions

- Render module groups and links from `CANONICAL_MODULE_REGISTRY` and the existing permission filtering.
- Preserve route compatibility, role-specific destinations, active-route styling, menu preferences, and current deep links.
- Add a route-coverage test that verifies each authorized destination is reachable exactly once in the primary hierarchy and that unauthorized destinations are absent.
- Migrate incrementally; do not combine this with unrelated module or route refactoring.

### P1 — Reduce scanning and improve mobile discovery

- Default to the active section open, with other sections collapsed, unless user testing shows a better pattern.
- Add a visible mobile Search control and clear active-route state.
- Keep “More” as a route to the complete drawer if a mobile bar is introduced.

### P2 — Validate whether a bottom bar is warranted

- Collect aggregated, privacy-conscious route-frequency data by role, or use structured task interviews if telemetry is unavailable. Do not collect student-record content for this purpose.
- Test common tasks with representative administrators, teachers, staff, and students on 320px, 390px, and tablet widths.
- Compare task completion, mis-navigation, time to destination, and whether users can find less-frequent destinations.
- Only ship a bottom bar if the selected destinations are stable, permission-safe, and more discoverable than the existing drawer.

### P2 — Simplify footer and utility actions

- Keep product/version/institution context separate from primary navigation.
- Consolidate repeated Notices/Chats/EduBoard markup into one shared rendering path and keep all current shortcuts available during migration.
- Measure all interactive targets in both footer states; aim for at least 44px on touch where layout permits and verify WCAG minimum size/spacing.
- If a fixed mobile bar is introduced, recalculate content padding and safe-area behavior and test it alongside the floating utility drawer and virtual keyboard.

### Release acceptance checks

- Validate 320px reflow, representative phone/tablet/desktop sizes, safe-area insets, 200% zoom, and no clipped or obscured navigation.
- Test keyboard-only open, navigation, Escape close, route transition, and focus restoration.
- Verify accessible names, current-route semantics, expanded state, permission filtering, and equivalent access to every authorized route.
- Measure interactive target bounds in collapsed/expanded footer and mobile navigation states.
- Perform authenticated browser checks for administrator, teacher, staff, and student roles; do not infer role behavior from synthetic screenshots alone.
- Capture before/after screenshots and record task-based usability findings before calling a redesign complete.

## Implementation update — 2026-11-17

### Slice 1: P0 Mobile Drawer Accessibility and Discovery
- The mobile drawer now exposes dialog/modal state only while open, makes the off-canvas drawer inert and hidden from assistive technology while closed, and makes the underlying application content inert while open.
- Opening the drawer moves focus to its close control; Tab and Shift+Tab remain within it; Escape, backdrop, and close-button dismissal restore focus to the trigger. Resizing to desktop closes the drawer.
- The mobile navigation trigger reports `aria-expanded` and `aria-controls`; drawer close controls and the mobile Search button have 44px dimensions.
- The mobile header now exposes direct access to global navigation search.
- Collapsed sidebar flyouts no longer claim the ARIA `menu` widget role without its keyboard model; they are exposed as labeled groups.

### Slice 2: P1 Canonical Module Registry SSOT Consolidation & Compact Auto-Expansion
- **SSOT Module Derivation:** Replaced 12 handwritten sub-item arrays and secondary item lists in `Sidebar.tsx` with dynamic lookups from `CANONICAL_MODULE_REGISTRY` via `getModuleById` and `findModuleByPath`.
- **Compact Default & Active Route Auto-Expansion:** Prevented initial 2000px menu sprawl by defaulting accordion sections in `sidebarStore.ts` to collapsed (`academicOpen: true`), backed by an active-route `useEffect` in `Sidebar.tsx` that automatically expands the matching accordion upon deep-linking or navigation.
- **Footer SSOT Page Title Resolution & Quick Actions:** In `Footer.tsx`, page titles dynamically resolve via `findModuleByPath` and prioritized exact-subitem matching; duplicated Notices, Chats, and EduBoard buttons were unified into a shared `<FooterQuickActions />` component with accessible labels and `min-h-[36px]` mobile touch targets.
- **Verification & Regression Testing:** Full test suite in `Sidebar.test.tsx` expanded to 18 passing tests covering focus trapping, route auto-expansion, SSOT dynamic page titles, and canonical module secondary mapping integrity. 100% corporate header compliance satisfied across all modified files. Production frontend bundle compiled and deployed to the active container.

## Related Planning workspace release gaps

The current Planning architecture review remains at **9.1/10**, not 10/10. The remaining items recorded in [the Planning architecture review](../01_ARCHITECTURE/2026-11-16_ARCHITECTURE_REVIEW_UNIFIED-PLANNING-ACTIVITIES-WORKSPACE_V1.md) include user-friendly linked-record pickers (the current selection is by record type and numeric ID), authenticated-browser verification of the new academic selectors, keyboard/touch end-to-end checks, a full frontend suite rerun after the selector update, and production deployment/monitoring evidence. A legacy full migration rollback blocker is also documented separately. These are distinct from the navigation recommendations above.
