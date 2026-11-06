---
title: "PrathamOne Academy — Collapsible Application Footer Report"
module: "17_UI_UX_DESIGN"
category: "IMPLEMENTATION-REPORT"
document_type: "IMPLEMENTATION-REPORT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-05"
updated_date: "2026-11-05"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["17-ui-ux-design", "implementation-report"]
entities: []
api_routes: []
related_modules: []
---

# PrathamOne Academy — Collapsible Application Footer Report

**Author:** Jawahar R. Mallah  
**Organization:** AITDL (AI Technology & Development Lab)  
**Client:** Prashant Academy Coaching Institute  
**Version:** 1.2.0 (Build `2026.11.05-PROD-REL`)  
**Date:** November 5, 2026  
**Status:** Implemented, Fully Tested (17/17 footer tests, 181/181 frontend suite), & Deployed to Production

---

## 1. Overview & Objective

The application footer in PrathamOne Academy has been upgraded to be **collapsible and expandable**. Users can now collapse the detailed footer into an unobtrusive slim status bar to reclaim vertical screen estate for tables, forms, and operational workflows, while retaining one-click access to full institutional, product, role, and AITDL ecosystem telemetry.

---

## 2. Layout & State Specifications

### A. Expanded Footer State (Full Operational View)
Preserves all original sections, links, and design tokens:
- **Tenant Context:** Institute Name (`Prashant Academy`), Tenant Code (`[PA001]`), Branch Name (`Jankalyan Nagar, Malad West`), and Branch Code (`(MALAD-W)`).
- **Workspace Indicator:** Dynamic active route/tab badge (`Workspace: Fees & Payments`, etc.).
- **Product & Ecosystem:** `PrathamOne Academy Management System` · `Enterprise Edition` · `prathamone.com` · Interactive `AITDL Ecosystem` dialog trigger.
- **System Metrics & Role:** Logged-in User ID (`UID: #42`), User Role (`Role: Admin`), Cloud Sync Status (`Online`/`Offline`), and clickable Release Version link (`v6.99.1` -> `/releases`).
- **Organization & Support Bar:** AITDL parent branding (`aitdl.com`), ecosystem links (`PrathamOne`, `SmritiBooks`, `SmritiSys`), and sales/support hotlines (`9323 023 007 | 9324 117 007`).
- **Collapse Toggle Button:** Accessible button with `aria-label="Collapse footer"` and `aria-expanded="true"`.

### B. Collapsed Footer State (Slim Bar View)
Reduces the footer height to a slim single-line bar (~26px):
- **Compact Identifiers:** Institute Name · Active Workspace Badge · Live Cloud Sync dot (`Online`/`Offline`) · Application Version (`v6.99.1`).
- **Expand Toggle Button:** Accessible button with `aria-label="Expand footer"` and `aria-expanded="false"`.
- **Zero Content Clipping:** Positioned as a flex-shrink element below the main scrollable viewport; collapsing the footer immediately increases vertical viewport space for `<main>`, preventing content overlap or scroll clipping.

---

## 3. Responsive Behavior & Persistence Rules

| Device / Viewport | Initial Default (No Saved Preference) | Behavior on Manual Toggle | LocalStorage Key |
|---|---|---|---|
| **Mobile (`< 768px`)** | **Collapsed** by default to maximize mobile screen real estate | Remembers user choice per device | `pratham_footer_collapsed` (`'true'` / `'false'`) |
| **Tablet / Desktop (`>= 768px`)** | **Expanded** by default for complete administrative context | Remembers user choice per device | `pratham_footer_collapsed` (`'true'` / `'false'`) |

- **Keyboard Shortcut:** `Ctrl+Shift+F` (or `Cmd+Shift+F`) instantly toggles the collapsed/expanded state.
- **Screen Resizing:** Viewport width changes do not trigger unexpected jumps if the user has actively toggled the footer.

---

## 4. Verification & Test Outcomes

| Test Suite / Command | Target | Status |
|---|---|---|
| `npm --prefix frontend test -- src/test/Footer.test.tsx` | 17 tests (11 legacy specifications + 6 new collapse/expand, mobile defaults, persistence, and keyboard shortcut tests) | **17 / 17 PASSED (100%)** |
| `npm --prefix frontend test -- --run` | 24 test files (all frontend unit, component, and routing tests) | **181 / 181 PASSED (100%)** |
| `npm --prefix frontend run build` | `tsc && vite build` | **PASSED (0 errors, 10.79s)** |
| `python scripts/manage_headers.py check` | 231 repository source files | **231 / 231 PASSED (100%)** |
| `docker compose build frontend` & restart | Live production Docker container (`prashant_academy_frontend`) | **Healthy on Ports 80 & 5173** |

All changes committed and pushed to `master` (`cc854bf`).
