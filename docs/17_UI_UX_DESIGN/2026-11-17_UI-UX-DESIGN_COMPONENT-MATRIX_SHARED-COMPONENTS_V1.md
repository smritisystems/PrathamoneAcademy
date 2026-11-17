---
title: "Shared Component Theme and Branding Audit Matrix"
module: "17_UI_UX_DESIGN"
category: "COMPONENT-AUDIT"
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
tags: ["components", "theme", "branding", "audit"]
entities: ["SharedComponent", "DesignToken"]
api_routes: []
related_modules: ["17_UI_UX_DESIGN"]
---

# Shared Component Theme and Branding Audit Matrix

## Purpose

This matrix informs an incremental implementation after approval. It is not a request to rewrite functioning components. Representative files were inspected; this is not an exhaustive component-by-component visual test.

| Area/component | Current evidence | Classification | Proposed treatment |
|---|---|---|---|
| Global styles | [index.css](../../frontend/src/index.css) defines Tailwind layers and shared `.btn-*`, `.card`, `.input`, and badge classes; light-oriented neutral colors are embedded | Partially implemented / inconsistent | Preserve class API; migrate values to semantic tokens in small batches |
| Tailwind | [tailwind.config.js](../../frontend/tailwind.config.js) has dynamic primary/brand palette; no explicit `darkMode` declaration | Partially implemented | Retain palette extension; after choosing a class-based strategy, set explicit dark mode and map tokens |
| Layout shell | [Layout.tsx](../../frontend/src/components/Layout.tsx) contains responsive shell/header behavior and hardcoded neutral utility classes | Partially implemented | Keep shell behavior and breakpoints; replace color utilities with semantic roles |
| Sidebar | [Sidebar.tsx](../../frontend/src/components/Sidebar.tsx) implements existing navigation and responsive state | Preserve behavior; style needs token audit | Retain navigation state, active item, and drawer behavior; map visuals to tokens |
| Modal | [Modal.tsx](../../frontend/src/components/Modal.tsx) is an existing shared modal | Preserve and adapt | Reuse for confirmation; theme surfaces, overlay, border, and focus treatment |
| Pagination | [Pagination.tsx](../../frontend/src/components/Pagination.tsx) is shared | Preserve and adapt | Tokenize states and disabled contrast; preserve interaction semantics |
| Badge | [Badge.tsx](../../frontend/src/components/Badge.tsx) is shared | Preserve and adapt | Map semantic status variants; do not encode status with color alone |
| Stat card | [StatCard.tsx](../../frontend/src/components/StatCard.tsx) is shared | Preserve and adapt | Tokenize background, text, border, and metric emphasis |
| Login | Login page uses branded and neutral styling; no cross-mode selector/provider was found | Partial | Preserve authentication and tenant logo; validate contrast and mode behavior |
| Dashboard | Dashboard composition uses repeated card/chart styling patterns | Partial / likely inconsistent | Map shared surfaces and text; do not alter dashboard data or chart logic |
| Tenant appearance controls | [Settings.tsx](../../frontend/src/pages/Settings.tsx) exposes tenant Branding & Appearance | Correct for tenant branding, not user theme | Keep the distinction between institute branding and personal app appearance |
| Navigation dark utilities | Six files use `dark:` utilities under implicit Tailwind media strategy | Inconsistent / partial | Audit each usage; align with explicit app preference and avoid changing feature behavior |
| EduBoard | [EduBoardCanvas.tsx](../../frontend/src/components/eduboard/EduBoardCanvas.tsx) supports editor-specific canvas/background choices | Preserve independent subsystem | Keep board palette and grid/blackboard choices separate from application mode |
| Charts | Recharts is present; chart-specific colors are distributed in implementation | Partial / needs visual inventory | Centralize chart series/status palette; check labels, grids, legends, and tooltip contrast in both modes |
| Icons/SVG | Lucide React and SVG assets are present; SVG fills/strokes can bypass CSS tokens | Partial | Prefer `currentColor` where suitable; retain brand/illustration colors when intentional |
| Print/PDF | Dedicated receipt, report PDF, and print paths exist | Preserve independent rendering | Explicitly test print media and exported artifacts in both app modes |

## Migration sequencing

1. Introduce semantic tokens without removing existing class names or tenant-variable names.
2. Convert shared component primitives first (buttons, inputs, cards, badges, modal, pagination).
3. Convert the shell and high-traffic pages.
4. Convert module-specific charts/SVGs and editor-adjacent views after their color semantics are mapped.
5. Delete obsolete styles only after repository-wide usage checks and visual/regression validation.

## Guardrails

- Do not create a second theme provider or parallel component library.
- Do not alter navigation, business calculations, data, API contracts, or tenant branding behavior as part of color migration.
- A component is not considered migrated solely because it renders in dark mode; keyboard focus, disabled/selected states, loading, empty, and error states must also be checked.
