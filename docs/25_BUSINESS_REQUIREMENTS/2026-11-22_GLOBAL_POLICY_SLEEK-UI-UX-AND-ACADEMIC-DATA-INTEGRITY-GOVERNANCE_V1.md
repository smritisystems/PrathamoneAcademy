---
title: "Global Policy: Sleek UI/UX Design System, Anti-Vertical-Bloat, and Academic Data Integrity Governance (Rules 014 & 015)"
module: "25_BUSINESS_REQUIREMENTS"
category: "POLICY"
document_type: "POLICY"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-22"
updated_date: "2026-11-22"
author: "Jawahar R Mallah"
organization: "Smritisys & AITDL Networks"
status: "Approved"
tags: ["ui-ux", "design-system", "anti-bloat", "scrollbar", "timetable", "data-integrity", "rule-014", "rule-015"]
entities: ["TimetableEntry", "WorkspaceLayout", "ScrollbarSystem"]
api_routes: ["/api/v1/timetable/matrix", "/api/v1/timetable/"]
related_modules: ["03_ACADEMIC_MANAGEMENT", "17_UI_UX_DESIGN", "16_DATABASE_API"]
---

# GLOBAL POLICY: SLEEK UI/UX DESIGN SYSTEM & ACADEMIC DATA INTEGRITY (RULES 014 & 015)

**Product:** PrathamOne EduOS  
**Edition:** Coaching Institute Edition  
**Baseline Version:** 1.0.0  
**Product Architect:** Jawahar R Mallah  
**Organization:** Smritisys & AITDL Networks  
**Policy Status:** MANDATORY — ALL REPOSITORY WORKFLOWS & CODING AGENTS  

---

## 1. EXECUTIVE SUMMARY & PURPOSE

During early iterations of complex enterprise workspaces (e.g. Academic Timetable, Institute Settings), interfaces inadvertently accumulated multiple stacked layers of headers, banners, duplicate search bars, oversized metric cards, unstyled floating taglines, and native chunky Windows scrollbars. Furthermore, dirty test records (such as midnight `00:30` lecture slots) distorted automated period matrix computations.

This policy establishes **RULE 014** (Global Sleek UI/UX Design System & Anti-Vertical-Bloat Governance) and **RULE 015** (Operational Data Integrity & Time Schedule Normalization Governance) as non-negotiable architectural mandates to ensure enterprise elegance, above-the-fold productivity, and data purity across all present and future modules.

---

## 2. RULE 014 — SLEEK UI/UX & ANTI-VERTICAL-BLOAT GOVERNANCE

### 2.1 Viewport Primacy & Above-The-Fold Law
All operational workspaces (Timetable, Admissions, Fee Collection, Attendance, Gradebook, CRM Pipeline) must render their primary operational grid, table, or ledger above the fold on standard desktop resolutions (`1920x1080` and `1366x768`).

### 2.2 Maximum Two Header Layers (≤ 120px Total Combined Height)
No workspace may stack more than two horizontal control bars:
1. **Layer 1: Global Application Header:**
   - Maximum height: `48px` (`h-12`).
   - Contents: Collapsible sidebar trigger, Institute selector pill, Academic Session pill, Mode badge (Live/Training), Search shortcut (`Ctrl+K`), and User Profile / Install app.
   - **Strict Prohibition:** Never insert unstyled raw text taglines, marketing slogans, or floating paragraph elements into the header.
2. **Layer 2: Workspace Command Deck:**
   - Maximum height: `≤ 72px`.
   - Contents: Clean workspace title, live entity count badge, conflict/integrity status pill, segmented view toggle, primary actions, and context-relevant inline filters.
   - Combined height of Layer 1 + Layer 2 must **never exceed 120px**.

### 2.3 Single-Surface Telemetry Ribbon (≤ 44px Height)
Metric KPIs, capacity percentages, room allocations, and live collision radars must never be rendered as separate, multi-tiered 100px vertical card stacks. Instead, they must be unified into a single high-density dark or neutral telemetry ribbon with a height of `≤ 44px`.

### 2.4 Prohibition of Out-Of-Context Controls
Sub-tabs must never inherit out-of-context buttons or filter bars. For example, a `+ Create Batch` button belonging to the Batch Directory must never be rendered inside the Timetable or Enrollment tabs.

### 2.5 Global Ultra-Thin Scrollbar Standard (macOS / Linear / Raycast Grade)
Native Windows classic chunky gray scrollbars with triangle arrow buttons (`◄ ═══════ ►`) are strictly forbidden across all workspaces, modals, sidebars, and data tables.
1. All elements must implement a global `6px` floating scrollbar:
   - Width / Height: `6px` (`5px` in `.custom-scrollbar`).
   - Track: Completely transparent (`background: transparent`).
   - Buttons: Completely removed (`::-webkit-scrollbar-button { display: none !important; width: 0; height: 0; }`).
   - Thumb: Rounded pill (`border-radius: 9999px`) with subtle neutral tint (`rgba(148, 163, 184, 0.35)`), smoothly transitioning to `0.65` opacity on hover.
   - Modern CSS: Mandatory `scrollbar-width: thin;` and `scrollbar-color: rgba(...) transparent;` for standard cross-browser compliance.

### 2.6 Linear/Stripe SaaS Aesthetic & Micro-Typography
- Use soft pastel tints for categorical backgrounds (`bg-indigo-50/70`, `bg-emerald-50/70`, `bg-amber-50/70`) with matching subtle border lines (`border-indigo-200/90`).
- Heavy, loud left-accent borders (`border-l-4`) and high-saturation primary fills are prohibited on data cards.
- Monospace typography (`font-mono`) must be used for timing ranges, roll numbers, currency figures, and time slots.
- Empty states inside scheduling grids or matrix cells must use a minimalist monospace dash (`—`) rather than bulky italic placeholder text.

---

## 3. RULE 015 — OPERATIONAL DATA INTEGRITY & TIME NORMALIZATION GOVERNANCE

### 3.1 Standard Institutional Operating Hours (06:00 – 22:00)
All lecture entries, faculty assignments, and exam sessions stored in `timetable_entries` must adhere strictly to legitimate coaching operational hours:
- Earliest permitted lecture start: `06:00 AM`.
- Latest permitted lecture end: `22:00 PM`.
- Minimum session duration: `15 minutes`.
- Maximum single session duration: `240 minutes` (4 hours).

### 3.2 Anti-Midnight-Period Rule
Database migrations, test seeds, mock fixtures, and user forms must strictly validate and reject midnight (`00:xx`) or inverted time ranges (e.g. `start_time >= end_time`). No test session may commit dummy timestamps that skew dynamic matrix slot generators.

### 3.3 Dynamic Schedule Matrix Resilience
Dynamic matrix endpoints and frontend schedule builders must:
1. Enforce ascending chronological ordering on all period slots (`ORDER BY start_time ASC`).
2. Assert that Period 1 starts at legitimate academic daytime hours.
3. Automatically flag any anomalous or overlapping slot entries with non-blocking collision warnings.

---

## 4. ENFORCEMENT & COMPLIANCE PROTOCOLS

1. **Pre-Commit Linting:** Any frontend component introducing stacked multi-tier headers or native unstyled scrollbars will be rejected during UI audits.
2. **Attribution & Header Check:** `python scripts/manage_headers.py check` must report 100% compliance.
3. **Documentation Integrity:** `python tools/docs_manager.py validate` must verify that this policy and its references remain unbroken.
4. **AI Agent Directives:** Every coding agent working on `frontend/` or `backend/` is bound by Rules 014 & 015 as codified in `AGENTS.md` and `GEMINI.md`.
