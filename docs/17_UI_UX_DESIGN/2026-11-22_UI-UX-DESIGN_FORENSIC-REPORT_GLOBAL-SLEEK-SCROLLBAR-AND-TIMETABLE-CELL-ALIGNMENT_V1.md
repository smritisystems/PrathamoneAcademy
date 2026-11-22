---
title: "Global Sleek Scrollbar Architecture & Timetable Grid Cell Normalization"
module: "17_UI_UX_DESIGN"
category: "FORENSIC-REPORT"
document_type: "REPORT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-22"
updated_date: "2026-11-22"
author: "Jawahar R Mallah"
organization: "Smritisys & AITDL Networks"
status: "Approved"
tags: ["ui-ux", "scrollbar", "linear-grade", "timetable", "rule-014", "rule-015"]
entities: ["TimetableEntry", "AcademicWorkspace"]
api_routes: ["/api/v1/timetable/matrix"]
related_modules: ["03_ACADEMIC_MANAGEMENT", "17_UI_UX_DESIGN"]
---

# Global Sleek Scrollbar Architecture & Timetable Grid Cell Normalization

## 1. Executive Summary

This forensic design and engineering audit addresses two critical visual and ergonomic defects identified in the **PrathamOne EduOS** Academic Workspace:
1. **The Native OS Scrollbar Regression:** Under Windows Chromium (Chrome, Edge, Electron), scrollbars reverted to chunky 17px Windows 95/XP-style gray bars equipped with beveled triangle arrow buttons (`<` and `>`), directly violating **RULE 014 (Global Sleek UI/UX Design System)**.
2. **Timetable Cell Content Collision:** Inside weekly schedule matrix cells, room allocation chips and lecture timestamps collided into multi-line wrapped text fragments (e.g., `Room 1` colliding into `09:15 - 10:15`), causing severe text illegibility.

Both issues have been comprehensively diagnosed, engineered to Linear/Raycast/macOS standards, deployed, and visually verified across live production containers.

---

## 2. Root Cause Analysis

### 2.1 The Windows Chromium Scrollbar Bug
In Chromium version 121+ (CSS Scrollbars Module Level 1 implementation):
- When the standard CSS properties `scrollbar-width: thin` or `scrollbar-color: ...` are declared on the universal selector `*`, Chromium immediately **disables all vendor-prefixed `::-webkit-scrollbar-*` pseudo-elements**.
- On Windows systems, Chromium delegates scrollbar painting to the operating system's theme engine (`uxtheme` / classic win32).
- The Windows OS theme engine draws:
  - Chunky 17px gray track (`#F0F0F0`).
  - Square thumb slider.
  - **Beveled triangle arrow buttons at both terminals (`<` and `>` or `^` and `v`)**.
  - Declarations such as `::-webkit-scrollbar-button { display: none !important; }` are ignored by Chromium because WebKit scrollbar styling is inactive.

### 2.2 Timetable Matrix Card Wrap Collision
Inside `frontend/src/pages/AcademicWorkspace.tsx`:
- The period columns were constrained to `min-w-[140px]`.
- Inside each session card, the bottom row rendered both `{session.room_number}` (~50px badge) and `{slot.start_time} - {slot.end_time}` (13 monospace characters, ~80px) in a flex container (`flex items-center justify-between`) without sufficient breathing room.
- With container and card padding (`28px`), available width was only `112px`.
- `130px` of content inside `112px` of width forced the time range to wrap into two vertical lines (`09:15 -` on top, `10:15` below), crashing directly into the room badge.

---

## 3. Engineering Implementation

### 3.1 Global Ultra-Sleek Scrollbar Architecture (`frontend/src/index.css`)
To prevent Chromium from disabling custom WebKit scrollbars on Windows:
1. Standard properties (`scrollbar-width`, `scrollbar-color`) are now strictly gated behind `@supports not selector(::-webkit-scrollbar)` so that only non-WebKit engines (Firefox) receive them.
2. WebKit/Chromium engines execute pure custom scrollbars with:
   - 6px width / 6px height (global) and 5px (`.custom-scrollbar`).
   - `::-webkit-scrollbar-button` strictly suppressed with `display: none !important; width: 0 !important; height: 0 !important; -webkit-appearance: none !important;`.
   - 9999px fully rounded pill thumb with transparent borders and subtle hover/active states.
   - 100% transparent track.

```css
/* Standard CSS ONLY for browsers lacking ::-webkit-scrollbar support (e.g. Firefox) */
@supports not selector(::-webkit-scrollbar) {
  * {
    scrollbar-width: thin;
    scrollbar-color: rgba(148, 163, 184, 0.4) transparent;
  }
  :root.dark * {
    scrollbar-color: rgba(100, 116, 139, 0.4) transparent;
  }
}

/* WebKit / Chromium / Edge / Safari / Electron / OS Engine Scrollbars */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-button {
  display: none !important;
  width: 0 !important;
  height: 0 !important;
  -webkit-appearance: none !important;
}
::-webkit-scrollbar-corner {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background-color: rgba(148, 163, 184, 0.35);
  border-radius: 9999px;
  border: 1px solid transparent;
  background-clip: padding-box;
  transition: background-color 0.15s ease-in-out;
}
::-webkit-scrollbar-thumb:hover {
  background-color: rgba(100, 116, 139, 0.65);
}
```

### 3.2 Cell Normalization & Collision Shield (`frontend/src/pages/AcademicWorkspace.tsx`)
1. **Column Width Expansion:** Increased period column header `min-w` from `140px` to `155px` (`bg-slate-50/80`).
2. **Redundant Timestamp Elimination:** The full time range (`09:15 - 10:15`) is already displayed in the column header immediately above the column. The card footer now renders:
   - Left: Truncation-safe room badge with `MapPin` icon (`max-w-[90px]`).
   - Right: Clean start timestamp (`slot.start_time`, e.g. `09:15`, 5 chars).
   - This consumes only `85px` of `125px` available width, providing `40px` of buffer and completely eliminating line wraps.
3. **RULE 014 Empty State Marker:** Empty periods render a centered monospace dash `—` (`text-xs font-mono text-slate-300/80`) inside a soft dashed container.

---

## 4. Verification & Evidence

- **Browser UI Subagent Audit:** Confirmed complete elimination of Windows native triangular arrow buttons and verified pill scrollbars on both horizontal and vertical axes.
- **Card Collision Verification:** Verified Mathematics, Science, Advanced Robotics & AI, Chemistry, and Physics cards. Zero overlapping text detected.
- **Evidence Artifacts:**
  - `sleek_scrollbar_fixed.png`: Full-width 1600x1200 overview of the normalized timetable studio.
  - `sleek_scrollbar_detail.png`: Detailed close-up of the active 5px rounded pill scrollbar and collision-free session cards.
- **Header & Integrity Audits:**
  - `python scripts/manage_headers.py check` ➔ 774 / 774 files passed (100%).
  - `python tools/docs_manager.py validate` ➔ 734 / 734 documents passed (0 errors, 0 warnings).
