---
title: "Campus Noticeboard & Quick Schedule Drawer Implementation Report"
module: "17_UI_UX_DESIGN"
category: "IMPLEMENTATION-REPORT"
document_type: "REPORT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-23"
updated_date: "2026-11-23"
author: "Jawahar R Mallah"
organization: "Smritisys & AITDL Networks"
status: "Approved"
tags: ["ui-ux", "login-portal", "noticeboard", "timetable", "rule-014", "rule-015"]
entities: ["CampusNoticeboardDrawer", "Login"]
api_routes: ["/api/v1/communication/notices", "/api/v1/timetable/matrix"]
related_modules: ["03_ACADEMIC_MANAGEMENT", "15_INTEGRATIONS", "17_UI_UX_DESIGN"]
---

# Campus Noticeboard & Quick Schedule Drawer Implementation Report

## 1. Executive Summary
This report documents the architectural enhancement to the PrathamOne EduOS authentication portal (`Login.tsx`). To prevent vertical canvas clutter while fulfilling parental and student demand for immediate institutional circulars and batch schedules, a **Hybrid Ticker & Slide-Over Drawer Architecture** was implemented.

The solution features:
1. An ambient, interactive **1-line announcement ticker** embedded within the top status ribbon of the left canvas.
2. A full-featured, glassmorphic **`CampusNoticeboardDrawer`** that slides in upon user invocation without navigating away from the login window.
3. Strict adherence to **Rule 014 (Anti-Vertical-Bloat Governance)** and **Rule 015 (Operational Data Integrity & Time Schedule Normalization: 06:00 – 22:00)**.

---

## 2. Component Specifications

### 2.1 1-Line Interactive Notice Ticker
- **Location**: Top Status Ribbon (`Login.tsx`), positioned adjacent to the active academic session pill.
- **Rotation Interval**: 4.5 seconds with automated cyclic transitions.
- **Visual Styling**: Glassmorphic rounded pill (`bg-blue-500/10 border-blue-400/20`), pulsing amber indicator, monospace category tag, and chevron hover cue.

### 2.2 CampusNoticeboardDrawer (`frontend/src/components/common/CampusNoticeboardDrawer.tsx`)
- **Drawer Type**: Slide-over sheet from viewport left with `backdrop-blur-sm` overlay.
- **Keyboard & Touch Accessibility**: Closes on `Escape`, backdrop tap, close button (`×`), or explicit `Continue to Login` button.
- **Dual Tab Architecture**:
  - **Tab 1: Public Notices & Circulars**:
    - Real-time search query filter across title, synopsis, and target cohorts.
    - Category pills: `All`, `Examination`, `Academic`, `Holiday`, `Event`.
    - Distinct priority badges and PDF circular attachment tags.
  - **Tab 2: Today's Batch Schedule**:
    - Cohort selector across coaching streams (JEE Advanced, NEET Medical, Class 10 Foundation, Class 9 Olympiad).
    - **Real-Time Operational Radar**: Dynamic `getSlotStatus()` parses start and end times against the client system clock to render:
      - `🟢 Ongoing Now`: Pulsing emerald indicator for active lecture periods.
      - `Upcoming`: Cyan badge for future periods today.
      - `Completed`: Muted slate badge for concluded sessions.
    - **1-Click Schedule Print**: Dedicated `Print Sheet` action invoking native print styling for rapid parent takeaway.
    - **Operating Bounds**: Period slots conforming strictly to operational hours (`06:00` to `22:00` per Rule 015).
    - Venue tagging (Hall A, Lab 02, Library Annex) and mentor initial indicators.

### 2.3 Mobile Header Notice Access (`Login.tsx`)
- On mobile viewports (`< 1024px`), the right pane (`Account Access` header) renders a dedicated `📢 Notices` pill button.
- Enables immediate 1-tap drawer invocation for smartphone and tablet visitors without needing to scroll past the authentication card.

### 2.4 Backend Public API Synchronization (`backend/app/api/v1/endpoints/institutions.py`)
- Route: `GET /api/v1/institutions/public/notices`
- Exposes non-confidential announcements with client-side fallback to ensure zero UI downtime under offline conditions.

---

## 3. Governance & Quality Gates Compliance
1. **Rule 014 (Sleek UI/UX Design System)**: Zero persistent vertical space consumed on the primary login canvas; modal state isolates detailed data grids.
2. **Rule 015 (Timetable Operational Normalization)**: All displayed slots validate strictly between `06:00` and `22:00`.
3. **Attribution Compliance**: 100% compliant across 777 repository source files via `scripts/manage_headers.py`.
4. **Release Hygiene**: 0 forbidden artifacts leaked; production dist payload pruned to 173.46 MB via `scripts/check_release_hygiene.py`.
