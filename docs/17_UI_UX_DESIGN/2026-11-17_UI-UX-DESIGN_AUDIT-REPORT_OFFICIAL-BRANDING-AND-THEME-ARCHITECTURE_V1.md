---
title: "Existing UI and Theme Architecture Audit — Official Branding and Light/Dark Theme"
module: "17_UI_UX_DESIGN"
category: "ARCHITECTURE-AUDIT"
document_type: "AUDIT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-17"
updated_date: "2026-11-17"
author: "Jawahar R Mallah"
organization: "Smritisys & AITDL Networks"
status: "For Approval"
tags: ["ui-ux", "branding", "theme", "dark-mode", "accessibility", "audit"]
entities: ["Branding", "ThemePreference"]
api_routes: ["/api/v1/navigation/preferences"]
related_modules: ["17_UI_UX_DESIGN", "13_SYSADMIN_SETTINGS", "11_REPORTS_EXPORTS", "14_PRINTING_DOCUMENTS"]
---

# Existing UI and Theme Architecture Audit

## Executive decision

**Recommendation: Partial theme architecture refactoring.**

The application already has a working Tailwind-based UI, tenant-aware brand configuration, CSS custom properties, reusable global utility classes, and a substantial print system. Replacing those systems wholesale would be unnecessary and risky. However, the existing dynamic brand-color pipeline is duplicated and incomplete, while dark-mode utilities currently operate only in a small set of screens and follow the operating-system preference implicitly. There is no application-wide light/dark preference or semantic surface-token system.

The recommended scope is to consolidate the existing brand-token application path, add a single explicit theme preference mechanism, and incrementally move high-impact application-shell and shared UI colors to semantic tokens. Preserve tenant branding, role/business logic, print behavior, and EduBoard's independent board-surface modes.

**Audit only:** no application code, database schema, or production configuration was changed. This document and the companion approval documents are assessment deliverables.

## 1. Audit scope and evidence

Reviewed the frontend package/configuration, application entry and routing, global CSS, brand resolver and pre-hydration bootstrap, settings and navigation preferences, shell/sidebar/login/dashboard, representative chart and SVG code, print/PDF paths, plus a source scan of frontend TypeScript, JavaScript, and CSS files.

The literal-hex inventory below scans 181 non-test source files. It found **617 hex-like literal occurrences in 28 files, representing 102 distinct values**. It includes values in source strings/comments and drawing/print code; not every occurrence is a visible application color. The inventory is therefore a refactoring map, not an instruction to replace every value.

## 2. Current architecture overview

| Area | Current implementation | Evidence |
|---|---|---|
| UI foundation | React 18, Tailwind CSS 3.4.4, utility-first styles, one application stylesheet, and reusable global classes such as `.btn-primary`, `.card`, `.input`, and status badges. | [package.json](../../frontend/package.json), [tailwind.config.js](../../frontend/tailwind.config.js), [index.css](../../frontend/src/index.css) |
| App composition | `main.tsx` mounts `App` beneath React Strict Mode, React Query, and BrowserRouter, and renders `react-hot-toast`. There is no theme provider in the composition. | [main.tsx](../../frontend/src/main.tsx), [App.tsx](../../frontend/src/App.tsx) |
| Brand identity | `BRANDING_CONFIG` defines product/institute identity and colors. `resolveBranding` resolves active-institution data, cached branding, and defaults; `useBranding` supplies it to UI and document components. | [branding.ts](../../frontend/src/config/branding.ts) |
| CSS brand tokens | `applyGlobalBrandTheme` writes brand, legacy `--color-*`, gradient, RGB, and derived primary shades to the document root; Tailwind `primary` and `brand` palettes consume some of those variables. | [branding.ts](../../frontend/src/config/branding.ts), [tailwind.config.js](../../frontend/tailwind.config.js), [index.css](../../frontend/src/index.css) |
| App shell | The main content background and header are fixed to light Tailwind colors. Sidebar surfaces use fixed dark slate colors and tenant primary for active navigation. | [Layout.tsx](../../frontend/src/components/Layout.tsx), [Sidebar.tsx](../../frontend/src/components/Sidebar.tsx) |
| Login | Purpose-built light form plus branded navy gradient/illustration panel. It uses both resolved tenant colors and numerous fixed brand/cyan values. | [Login.tsx](../../frontend/src/pages/Login.tsx) |
| Charts and visual editors | Recharts colors and axis/tooltip styling are frequently specified inline. Konva/EduBoard has its own persistent drawing colors and whiteboard/greenboard/blackboard surface modes. | [Dashboard.tsx](../../frontend/src/pages/Dashboard.tsx), [Fees.tsx](../../frontend/src/pages/Fees.tsx), [EduBoardCanvas.tsx](../../frontend/src/components/eduboard/EduBoardCanvas.tsx) |
| Print and PDF | Global `@media print` rules coexist with dedicated receipt/ID-card print utilities, print-branding components, a print-layout service, and direct `pdf-lib` report-book drawing. | [index.css](../../frontend/src/index.css), [printReceipt.ts](../../frontend/src/utils/printReceipt.ts), [printLayoutEngine.ts](../../frontend/src/services/printLayoutEngine.ts), [reportBookPdf.ts](../../frontend/src/components/reports/reportBookPdf.ts) |

### Third-party UI and visual libraries

No separate component-framework theme system (for example MUI, Chakra, or Ant Design) was found in the frontend dependencies. UI styling is primarily Tailwind and application classes. The relevant visual libraries are:

- `lucide-react`: icons generally inherit color from `currentColor` and surrounding utilities.
- `recharts`: chart color, axes, grid, tooltip, and legend styling is configured at individual chart call sites.
- `konva` / `react-konva`: canvas/whiteboard rendering uses explicit drawing colors; these are document/tool surface colors, not ordinary application surfaces.
- `react-hot-toast`: globally mounted with only a shared font-size option; its visual theme is not aligned through the app's semantic tokens.
- `pdf-lib` and PDF.js: PDF generation/rendering includes explicit document colors and must retain print/document output semantics.

No Monaco, Quill, or Tiptap editor dependency was found.

## 3. Existing theme implementation and persistence

### Brand customization (implemented)

- Default brand primary is `#0B2D6B`; current accent is `#F57C00`; secondary is `#071C44`.
- Institution settings include a **Branding & Appearance** area with logo and color controls, custom tenant colors, and five curated brand palettes. The current preset called “Pratham Navy & Saffron (Official)” uses `#F57C00`.
- Brand resolver values are cached in tenant-scoped and general `localStorage` entries. `prehydrate-brand.js` synchronously applies cached institution branding before React mounts; React later resolves server/current-institution branding.
- Institution switching and logout also apply cached brand values in `authStore`.
- The brand resolver updates the browser `theme-color` metadata and favicon.
- This is **tenant identity/brand persistence**, not a user-selected light/dark appearance preference.

### Light/dark mode (partially implemented)

- `tailwind.config.js` does not set `darkMode`. With the installed Tailwind v3 configuration, `dark:` variants use the media strategy by default and react to `prefers-color-scheme`.
- Dark variants occur in six frontend source files: `NavigationSettingsPanel.tsx`, `MenuCustomizerModal.tsx`, `GlobalNavigationSearch.tsx`, `Users.tsx`, `UserProfile.tsx`, and `ImportExport.tsx`.
- No application-wide theme provider, root `.dark` state controller, light/dark/system toggle, or persisted application theme preference was found.
- Most shell, dashboard, login, student, financial, and print surfaces are light-only. A dark-preferring OS can therefore see isolated dark-styled regions amid a light application.
- `Settings` provides institute brand-color presets; it does not provide an app appearance-mode preference.

### Existing server preferences

The application already stores **navigation-only** user preferences through `UserNavigationPreference` and `/api/v1/navigation/preferences`. That model currently covers menu/navigation choices, not general UI appearance. It is not evidence that theme choice is already persisted, and should not be overloaded without an explicit cross-device preference requirement.

## 4. Official branding comparison

| Requested token | Current source evidence | Assessment |
|---|---|---|
| Navy `#0B2D6B` | `BRANDING_CONFIG.colors.primary` and multiple brand utilities/defaults | **Match.** This is already the primary default. |
| Orange `#F16906` | Defaults and official-named preset use `#F57C00` | **Mismatch.** Current accent is a different orange and appears in 78 source literals. |
| White `#FFFFFF` | Commonly used for surfaces, controls, icons, print sheets | **Match**, but global shell surfaces are primarily hard-coded Tailwind white/gray rather than tokens. |
| Accessible orange `#C85200` | Not present in the scanned source inventory | **Missing.** No separately named accessible orange/action token exists. |
| Light background `#F5F7FA` | Global body uses Tailwind `gray-50` (approximately `#F9FAFB`); many areas use `slate-50`/`gray-50`/white | **Mismatch / fragmented.** No semantic app background token represents the requested value. |
| Dark background `#081426` | Not present in the scanned source inventory. Dark variants use Tailwind slate shades and other ad hoc values. | **Missing as a canonical token.** |

Approximate WCAG contrast ratios calculated from the specified values:

| Foreground/background pair | Contrast | Implication |
|---|---:|---|
| Navy `#0B2D6B` on white | 13.11:1 | Passes WCAG AA normal-text contrast. |
| Official orange `#F16906` on white | 3.10:1 | Fails normal text (4.5:1); narrowly passes large text (3:1). Use the requested accessible orange for small text or white-on-orange controls. |
| Current orange `#F57C00` on white | 2.70:1 | Fails normal and large-text contrast; avoid as a text foreground or white-text small control background. |
| Accessible orange `#C85200` on white | 4.50:1 | Meets the normal-text AA threshold at the specified value; verify contrast after opacity, hover, or tenant overrides. |
| Light background `#F5F7FA` against white | 1.07:1 | Suitable as a subtle surface distinction, not a component boundary by itself. |

These are color-pair calculations, not a complete rendered-page WCAG audit. Text size/weight, opacity, state, and surrounding colors still matter.

## 5. Hardcoded color inventory

### Most frequent literal values

Occurrences across the 181 non-test source files:

| Value | Count | Typical use / note |
|---|---:|---|
| `#F57C00` | 78 | Current accent/default/preset, login, and branded controls. |
| `#0F172A` | 69 | Dark text, QR/SVG artwork, and dark sidebar/student surfaces. |
| `#0B2D6B` | 57 | Current primary and brand fallbacks. |
| `#FFFFFF` | 49 | White surfaces, text, and print/document output. |
| `#071C44` | 32 | Secondary brand and dark-shell/login styling. |
| `#64748B` | 28 | Text, chart labels, borders, and print metadata. |
| `#94A3B8` | 23 | Muted text, chart series, and print details. |
| `#10B981` | 16 | Success/status and chart values. |
| `#F1F5F9` | 14 | Light grid/surface colors. |
| `#E2E8F0` | 13 | Borders and chart grid. |
| `#CBD5E1`, `#F59E0B`, `#111827` | 10 each | Borders, warning/chart color, and dark text. |

### Files with literal hex colors (28)

- **Global brand and app chrome:** `frontend/src/index.css`, `frontend/src/config/branding.ts`, `frontend/src/components/Sidebar.tsx`, `frontend/src/components/Footer.tsx`, `frontend/src/components/StatCard.tsx`, `frontend/src/components/common/BottomBarDrawer.tsx`.
- **Entry/auth and settings:** `frontend/src/pages/Login.tsx`, `frontend/src/pages/Settings.tsx`.
- **Dashboards and analytics:** `frontend/src/pages/Dashboard.tsx`, `frontend/src/pages/Fees.tsx`, `frontend/src/pages/Reports.tsx`, `frontend/src/pages/TeacherManagement.tsx`.
- **Other workflows with explicit values:** `frontend/src/pages/AcademicWorkspace.tsx`, `frontend/src/pages/Communication.tsx`, `frontend/src/pages/Payments.tsx`, `frontend/src/components/navigation/MenuCustomizerModal.tsx`, `frontend/src/components/ReportCardModal.tsx`.
- **Print/PDF/document outputs:** `frontend/src/utils/printReceipt.ts`, `frontend/src/utils/printIDCard.ts`, `frontend/src/services/printLayoutEngine.ts`, `frontend/src/components/PaymentReceiptView.tsx`, `frontend/src/components/printing/PrintFooter.tsx`.
- **Canvas, console, and utility values:** `frontend/src/components/eduboard/EduBoardCanvas.tsx`, `frontend/src/components/eduboard/EduBoardToolbar.tsx`, `frontend/src/components/common/QuickEduBoardCanvas.tsx`, `frontend/src/utils/consoleBanner.ts`, `frontend/src/utils/errorTaxonomy.ts`, `frontend/src/store/eduboardDisplayStore.ts`.

### Complete distinct hex-like literal set

Values below are the complete 102-value scan inventory; values representing QR modules, stored drawing colors, PDF ink, or status/chart series are not automatically app-theme candidates.

```text
#005C4B, #022C22, #0256B9, #0284C7, #047857, #051535, #051632, #059669, #065F46, #06B6D4
#071C44, #082354, #093524, #0A2540, #0B0E14, #0B141A, #0B2B5C, #0B2D6B, #0B4EA2, #0D2852
#0EA5E9, #0F172A, #0F4C35, #10B981, #111827, #131720, #155E42, #16428F, #16A34A, #172554
#17458F, #182229, #1B382B, #1C2230, #1D4ED8, #1E293B, #1E3A8A, #1E40AF, #1E6B4D, #202C33
#22C55E, #2563EB, #263042, #2A3942, #334155, #34D399, #3730A3, #38BDF8, #3B82F6, #456
#475569, #4C0519, #4F46E5, #60A5FA, #6366F1, #64748B, #67E8F9, #7C3AED, #818CF8, #86EFAC
#881337, #8B5CF6, #9333EA, #93C5FD, #94A3B8, #991B1B, #A78BFA, #A855F7, #B91C1C, #BE123C
#BFDBFE, #CBD5E1, #D4AF37, #DBEAFE, #DC2626, #E11D48, #E2E8F0, #E9EDEF, #EA580C, #EAB308
#EC4899, #ECFDF5, #EF4444, #EFF6FF, #F1F5F9, #F43F5E, #F57C00, #F59E0B, #F8FAFC, #F97316
#F9A8D4, #FB7185, #FBBF24, #FCA5A5, #FDA4AF, #FDE047, #FEF2F2, #FFA726, #FFD279, #FFF
#FFF1F2, #FFFFFF
```

## 6. Findings classified A–E

### A. Already implemented correctly — preserve

- One existing brand resolver and central `BRANDING_CONFIG`; reuse it rather than creating another brand provider.
- CSS custom properties already expose primary/secondary/accent plus derived primary shades to Tailwind and global button utilities.
- Institution logos, custom tenant colors, tenant branding cache, and browser theme-color metadata are intentional existing capabilities.
- Sidebar has responsive desktop/mobile states, keyboard/focus handling, and tenant-primary active items; preserve its navigation behavior.
- Print has a global baseline plus purpose-built receipt/document/PDF flows. Keep print output independent from interactive dark mode.
- EduBoard's independent palette and surface selection (whiteboard, greenboard, blackboard, grid) is an editor feature and should not be silently remapped to app dark mode.

### B. Partially implemented — improve

- The brand token system exists, but global neutrals, text, border, surface, focus, and semantic colors are mostly Tailwind defaults or local literals.
- Some modules use `dark:` variants, but there is no app-level selection or consistent coverage; Login and the main application shell are intentionally/currently light.
- Brand color controls and preset colors work, but the “Official” orange differs from the requested value, and no separate accessible-orange role is exposed.
- Chart components use brand color in some places and fixed palette/axis colors in others.
- Print styling is substantial but relies on selected fixed colors and cloned CSS; print/PDF output needs explicit regression checks during theme work.

### C. Duplicated or inconsistent — consolidate

1. **Brand CSS injection is implemented in three places:** `prehydrate-brand.js`, `applyGlobalBrandTheme` in `config/branding.ts`, and two direct cached-brand branches in `authStore.ts`. They set overlapping but non-identical variable sets. The pre-hydration path, for example, substitutes the primary itself for hover/light/dark shades, while the central helper derives them.
2. **Token aliases overlap:** `--brand-*` and legacy `--color-*` values coexist; Tailwind defines overlapping `primary` and `brand` palettes. Consolidation should retain compatibility aliases while callers are migrated.
3. **Brand values are repeated** in Settings presets, Login, dashboards, charts, global CSS, and print/document code; several surfaces therefore bypass the central branding resolver.
4. **Light and dark color logic is mixed per page:** a subset of files has paired `dark:` utilities while adjacent app-shell and shared components use only light utilities.

### D. Missing — implement if approved

- One app-wide theme mode (`light`, `dark`, and optionally `system`) with a defined default and user control.
- Persisted application appearance preference, separate from tenant brand colors.
- Semantic UI tokens for page/surface levels, text, muted text, borders, inputs, focus, overlays, and semantic status colors in both modes.
- Dark styling for application shell, shared components, authentication policy (whether login participates), and core modules.
- Contrast-safe interaction rules for orange: distinguish decorative/large-brand orange from the accessible orange used for text and small controls.
- A chart token/palette policy that remains distinguishable in either theme and does not rely on color alone for meaning.
- Toast styling aligned to the active theme, or a confirmed decision to keep the toast library defaults.

### E. Potentially breaking changes — document before modification

- Changing Tailwind's dark strategy from implicit `media` to explicit `class` stops the six current dark-variant areas from following OS mode unless the new state sets the class correctly.
- A global token or Tailwind class change can alter dozens of forms, tables, dialogs, sidebars, login elements, and brand-preview surfaces at once.
- Replacing tenant colors with fixed product colors would remove existing institute customization; preserve that capability unless separately approved.
- Introducing accessible contrast handling may change current orange text/button appearance, especially in the settings previews and login flow.
- Dark mode can leak into receipts, printed forms, and generated PDFs if print styles do not force document-safe surfaces/colors.
- Dynamic theme bootstrap, tenant switching/logout, favicon, PWA/browser theme color, and first paint must stay synchronized to avoid incorrect-tenant branding flashes.
- Chart/print/SVG output may not inherit CSS variables and requires explicit adaptation, not only global CSS changes.

## 7. Accessibility observations

- The requested primary navy on white is strong (13.11:1); current orange `#F57C00` on white is about 2.70:1 and fails WCAG AA text contrast. The requested `#F16906` on white is about 3.10:1, suitable only for large text/graphics; `#C85200` is approximately 4.50:1 for normal text on white.
- Since tenant colors are administrator-configurable, runtime contrast may vary. A theme implementation should validate or choose foregrounds against the resolved background rather than assume the default palette.
- Some shared controls already use Tailwind focus rings, and mobile sidebar code includes focus management. Audit all migrated interactive states to preserve visible keyboard focus in both modes.
- Color-coded chart series and statuses should retain visible labels/legends and must not use color as the only distinction.
- Login includes a `prefers-reduced-motion` override, which should be retained; theme transitions should also avoid motion when reduced motion is requested.
- This review was static and did not run a full WCAG/axe scan or inspect every rendered screen. Contrast findings above cover the specified brand colors only.

## 8. Modules and files requiring updates if approved

### Shared foundation — first

- `frontend/src/index.css`
- `frontend/tailwind.config.js`
- `frontend/src/config/branding.ts`
- `frontend/public/prehydrate-brand.js`
- `frontend/src/store/authStore.ts` (remove duplicated partial brand application only after bootstrap behavior is preserved)
- `frontend/src/main.tsx` only if a root-level initialization hook is required; a second theme provider is not recommended.

### Shared shell, login, and preference entry point

- `frontend/src/components/Layout.tsx`
- `frontend/src/components/Sidebar.tsx`
- `frontend/src/pages/Login.tsx`
- `frontend/src/pages/Settings.tsx` (currently the existing institutional branding and appearance workspace; distinguish institute-brand controls from personal app mode).
- Existing navigation preference area in `frontend/src/components/settings/NavigationSettingsPanel.tsx` is an alternative place for a user-facing appearance control, subject to UX approval.

### Module rollout candidates

- Dashboards and charts: `Dashboard.tsx`, `StudentDashboard.tsx`, `Reports.tsx`, `Fees.tsx`, `TeacherManagement.tsx`.
- Academic/operations and forms: `AcademicWorkspace.tsx`, `Communication.tsx`, `Payments.tsx`, plus shared forms, tables, modal, and status components as identified by rendered review.
- User/admin surfaces: `Users.tsx`, `UserProfile.tsx`, `ImportExport.tsx`, and the three navigation/settings components that currently contain `dark:` variants.
- Print/PDF: `PaymentReceiptView.tsx`, `PrintDocumentBranding.tsx`, `PrintFooter.tsx`, `printReceipt.ts`, `printIDCard.ts`, `printLayoutEngine.ts`, and `reportBookPdf.ts`; migrate only colors that are meant to be theme-aware and preserve the appearance of official documents.
- Keep EduBoard's authored canvas colors and persistent drawing palette out of the global app-theme sweep unless a separate editor-specific requirement is approved.

The 28-file literal inventory in section 5 is the complete initial source list from the scan. A broader class-level/rendered pass is required during approved implementation because Tailwind utility colors are not all hex literals.

## 9. Database migration requirements

**No database migration is needed for the recommended initial implementation** if the selected theme mode is a browser-local user preference stored using the existing frontend persistence pattern. It is appearance state, not institute business data.

The backend already has user/institution-scoped navigation preferences at `/api/v1/navigation/preferences`, but the corresponding model is specifically navigation-oriented and does not currently store theme. If cross-device/cross-session theme synchronization is required, first decide whether to extend an existing canonical user-preference/settings mechanism; only then scope a migration. Do not create a duplicate preferences table just for theme.

## 10. Proposed implementation plan (approval required)

1. **Confirm policy choices:** default mode (recommended: preserve current light appearance), whether to offer `system`, whether login follows the app choice, and whether theme is browser-local or cross-device.
2. **Consolidate branding bootstrap:** make one canonical application of dynamic tenant brand variables while preserving pre-hydration/no-flash behavior and backward-compatible `--color-*` aliases. Keep product identity tokens distinct from tenant customization.
3. **Add semantic theme tokens and one preference state:** introduce only the smallest theme-state mechanism consistent with the existing Zustand pattern; avoid a second provider and avoid adding dependencies. Recommended initial preference: explicit `light`/`dark`/`system`, persisted locally; default to light to preserve current UX.
4. **Implement shared shell and shared components:** migrate app background, header, sidebar, inputs, cards, dialogs, tables, focus, overlay, and toast surfaces to semantic tokens. Explicitly decide whether login remains its existing branded light page.
5. **Migrate feature modules in bounded batches:** dashboards and chart components first, then settings/admin/user and operational modules; preserve status semantics, tenant colors, and business behavior. Treat charts as an explicit palette/axis/tooltip task.
6. **Keep print and editor modes isolated:** pin print/PDF to validated document colors and preserve EduBoard's own surface/color settings.
7. **Validate before release:** test each theme across login, tenant switching, authenticated/student views, navigation, core tables/forms/modals, charts, and mobile sidebar; verify persistence/reload, first paint, browser theme-color, print/PDF parity, keyboard focus, reduced motion, and WCAG contrast. Run existing frontend tests/build and add focused theme coverage.

### Approval gate

No application implementation should begin until this audit and proposed plan are reviewed and approved. Any requirement for cross-device persistence, altering tenant color customization, or dark-themed printed artifacts should be treated as a scope change and confirmed separately.

## 11. Evidence index

- Brand values, persistence, runtime injection, and metadata: [branding.ts](../../frontend/src/config/branding.ts), [prehydrate-brand.js](../../frontend/public/prehydrate-brand.js), [authStore.ts](../../frontend/src/store/authStore.ts).
- Tailwind and global light/print styles: [tailwind.config.js](../../frontend/tailwind.config.js), [index.css](../../frontend/src/index.css).
- Root composition and shell: [main.tsx](../../frontend/src/main.tsx), [Layout.tsx](../../frontend/src/components/Layout.tsx), [Sidebar.tsx](../../frontend/src/components/Sidebar.tsx).
- Institutional branding controls and existing preference behavior: [Settings.tsx](../../frontend/src/pages/Settings.tsx), [navigation.py](../../backend/app/api/v1/endpoints/navigation.py), [navigation.py model](../../backend/app/models/navigation.py).
- Charts, SVGs, and print output: [Dashboard.tsx](../../frontend/src/pages/Dashboard.tsx), [PaymentReceiptView.tsx](../../frontend/src/components/PaymentReceiptView.tsx), [printReceipt.ts](../../frontend/src/utils/printReceipt.ts), [reportBookPdf.ts](../../frontend/src/components/reports/reportBookPdf.ts).

## 12. Branding decision update

The expanded brief reported a newer blood-red logo but did not include its hex value. The user subsequently directed the work to “continue with orange.” Since the original branding request specified orange `#F16906`, that value was used as the approved product-default interpretation. The user also confirmed preserving tenant accent customization; tenant `accent_color` continues to take precedence when present. `#C85200` is used as the accessible orange treatment on light surfaces, while the official accent remains `#F16906`.

The selection and implementation do not replace tenant-specific colors. If “continue with orange” was intended to identify a different hex, the product accent should be adjusted before broader rollout. See the [Branding Decision Record](2026-11-17_UI-UX-DESIGN_BRANDING-DECISION_BLOOD-RED-ACCENT_V1.md).

## 13. Implementation status after approval

The user approved Light/Dark/System, browser-local preference storage, preservation of tenant accents, and implementation. The initial theme foundation is implemented: one Zustand preference store, pre-hydration mode restoration, explicit class-based Tailwind mode, semantic page/surface/text/border tokens, an appearance selector in the existing sidebar, dark-mode compatibility mappings for neutral utilities, and dark login styling. Product-default orange and accessible orange treatments were aligned. No API, database schema, or migration changes were made.

Validation completed: focused appearance/branding/settings tests passed (22 tests); the frontend TypeScript/production build passed; source-header check passed for 659/659 files. Build output still contains warnings for print CSS selectors and large chunks. The full frontend suite reported 585 passed and 3 failed: one EduBoard color-state assertion (the focused EduBoard suite passed when rerun alone) and two route-title expectation mismatches in Footer and Releases. Those unrelated expectations were not changed. Browser preview verified light/dark initialization and live System-mode response; a complete authenticated route, chart, and print/PDF visual audit remains a rollout task.
