---
title: "Promotional Video Showcase: Half-Width Split Hero Layout & Capability Highlights"
module: "17_UI_UX_DESIGN"
category: "IMPLEMENTATION-REPORT"
document_type: "REPORT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.135.1"
doc_version: "1.0"
created_date: "2026-11-19"
updated_date: "2026-11-19"
author: "Jawahar R Mallah"
organization: "Smritisys & AITDL Networks"
status: "Approved"
tags: ["video", "help-centre", "layout", "responsive", "split-hero", "branding"]
entities: ["ProductVideoTourCard", "HelpCentre"]
api_routes: ["/api/v1/help"]
related_modules: ["13_SYSADMIN_SETTINGS", "00_PRODUCT_OVERVIEW"]
---

# Promotional Video Showcase: Half-Width Split Hero Layout & Capability Highlights

## 1. Executive Summary & Design Directive

### User Feedback:
> *"video is too big to be professional . suggest on these will be small means half part of width of page or recommend"*

### Adopted Solution:
- Replaced the full-bleed, oversized video card with a **50/50 Half-Page Split Hero** layout.
- The video player is now constrained to 50% of the desktop card width (`lg:col-span-6`), rendering in crisp 16:9 widescreen format (~320px vertical height on 1080p displays).
- Paired side-by-side with a dedicated **"Unified Platform Highlights"** panel (`lg:col-span-6`) featuring 4 structured capability cards and quick-start links.

---

## 2. Technical Implementation Details

### 2.1 Component Architecture (`frontend/src/components/help/ProductVideoTourCard.tsx`)
- **Grid Layout**: Built using a responsive 12-column CSS Grid (`grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-stretch`).
- **Left Column (Video Player - 50% width)**:
  - 16:9 widescreen player with local high-performance streaming (`H.264 / AAC`).
  - Dual-cut selector tabs: **20s Cinematic Cut** vs **10s Fast Tour**.
  - Top-left format indicators: `720p HD · 16:9` and duration badge.
  - Bottom-right official **PrathamOne** vector watermark badge overlay.
  - Sub-video encoding specifications row.
- **Right Column (Unified Platform Highlights - 50% width)**:
  - Interactive capability highlights:
    1. **Admissions & CRM Engine**: Lead capture, follow-up scheduler, counselling logs, and instant student admission.
    2. **Automated Fee Counter**: Instant A4/A5 vouchers, concession schemes, aging receivables, and ledger audit trails.
    3. **Academics & Analytics**: Live attendance, batch timetable matrix, exam tracking, and graphical student report cards.
    4. **Multi-Path Cloud Backups**: Zero-data-loss fail-safe with USB, office NAS, Google Drive, and Cloudflare R2 / AWS S3.
  - Bottom action bar with zero-data-loss status indicator and direct navigation link to user guides (`/help?section=getting_started`).

---

## 3. Verification & Quality Assurance

- **Vitest Unit & Integration Suites**: `src/test/HelpCentre.test.tsx` passed all 10/10 tests.
- **Corporate Header Compliance**: `python scripts/manage_headers.py check` passed 674/674 files (100%).
- **Documentation Index Integrity**: `python tools/docs_manager.py validate` passed with 557/557 documents validated (0 errors, 0 warnings).
- **Production Asset Build**: Compiled with Vite 8.3.8 (10.19s) and synced to the running Nginx container `prashant_academy_frontend`.
- **Live Visual Verification**: Verified in Google Chrome DevTools at `http://localhost:5173/help`, with high-resolution screenshot stored at `screenshots/22_video_half_width_split_layout.png`.
