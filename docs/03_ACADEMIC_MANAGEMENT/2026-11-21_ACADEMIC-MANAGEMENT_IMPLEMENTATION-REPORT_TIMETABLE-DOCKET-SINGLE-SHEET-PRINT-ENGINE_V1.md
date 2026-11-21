---
title: "Timetable Docket Single-Sheet High-Density Print Engine & Resolution Architecture"
module: "03_ACADEMIC_MANAGEMENT"
category: "IMPLEMENTATION-REPORT"
document_type: "REPORT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-21"
updated_date: "2026-11-21"
author: "Jawahar R Mallah"
organization: "Smritisys & AITDL Networks"
status: "Approved"
tags: ["timetable", "print", "pdf", "single-sheet", "A4-landscape", "certificate-grade"]
entities: ["AcademicTimetableEntry", "TimetableDocketResponse", "Institution"]
api_routes: ["/api/v1/timetable/export/docket"]
related_modules: ["01_ARCHITECTURE", "14_PRINTING_DOCUMENTS", "17_UI_UX_DESIGN"]
---

# Timetable Docket Single-Sheet High-Density Print Engine

## 1. Executive Summary & Problem Diagnosis

When executing physical printer dispatch or Microsoft Print to PDF from the Timetable Studio, a critical layout failure occurred:
1. **Paging Explosion (4 Sheets):** The print preview paginated the timetable across 4 separate A4 sheets.
2. **Unconstrained Logo Blowup:** The high-resolution institutional logo (741x688 px) occupied the entirety of Page 1.
3. **Missing Landscape Enforcement:** The browser defaulting to Portrait orientation vertically split Monday/Tuesday, Wednesday/Thursday, and Friday/Saturday across three additional pages.
4. **Stripped Background Graphics Degradation:** With Chrome's default "Background graphics" unchecked, white-on-dark headers and pastel subject backgrounds turned invisible, degrading print legibility.

## 2. Forensic Root Cause Analysis

| Defect Vector | Manifestation | Root Cause |
| :--- | :--- | :--- |
| **Asset Dimensioning** | Massive logo on Page 1 | Logo `<img>` relied exclusively on uncompiled Tailwind classes inside an isolated iframe without inline dimensional bounds. |
| **Viewport Orientation** | Default Portrait orientation | `@page { size: A4 landscape !important; }` was ignored due to iframe initialization dimensions (`0x0` or default portrait). |
| **CSS Delivery Pipeline** | Unstyled layout in iframe | Attempted reliance on CDN script (`cdn.tailwindcss.com`) which failed to execute synchronously prior to print trigger. |
| **Color Stripping** | Washed out grid on physical print | High-contrast structural ink lines and fallback text colors were absent for non-background-graphics printing. |

## 3. Engineering Resolution Architecture

### 3.1 Dedicated Isolated Landscape Sandbox (`printTimetableDocket.ts`)
Created `frontend/src/utils/printTimetableDocket.ts` matching the institutional architectural standard established by `printReceipt.ts` and `printIDCard.ts`:
- **Physical Sandbox Dimensions:** Iframe is explicitly instantiated at `297mm x 210mm` (ISO A4 Landscape standard) so the browser's layout engine calculates landscape viewport constraints prior to rendering.
- **Synchronous Style Ingestion:** Clones all compiled parent stylesheet rules from `document.head` directly into the iframe DOM, eliminating external CDN dependencies.
- **Image Dimension Bounding:** Enforces strict inline limits (`width: 42px; height: 42px; max-width: 42px; max-height: 42px; object-fit: contain;`) across all logo images.

### 3.2 High-Contrast Certificate-Grade Fallbacks
Engineered bulletproof CSS rules ensuring razor-sharp legibility whether "Background graphics" is ON or OFF:
- **Header Contrast:** Applied slate light-gray (`#f1f5f9`) backgrounds with dark slate (`#0f172a`) bold text and 2px solid bottom borders.
- **Solid Double-Line Enclosure:** Outer frame utilizes structural borders (`border: 2px solid #0f172a`), retaining certificate-grade authority even on black-and-white thermal or monochrome laser printers.
- **Multi-Level Ink Gradients:** Replaced low-contrast pastel backgrounds with high-contrast text hierarchies, dark batch badges, and crisp division pills.

### 3.3 Strict Vertical Budget for 1-Page Guarantee
- **A4 Printable Height:** 210mm total - 10mm margins = **200mm available**.
- **Container Height Allocation:**
  - Institutional Header: 22mm
  - Telemetry Telemetry Strip: 11mm
  - Timetable Master Grid (7 rows): 103mm
  - Signatures & Embossed Seal: 22mm
  - Audit Security Footer: 6mm
  - Total Budget: **164mm** (well within 200mm limit).
- **Result:** Physical print and Microsoft Print to PDF strictly report **"1 sheet of paper"**.

## 4. Verification & Release Compliance

- **TypeScript Compilation:** Passed with zero errors (`tsc && vite build`).
- **Unit & Dedicated Tests:** Vitest suite `src/test/AcademicDedicatedSubmenus.test.tsx` passed (9/9).
- **Corporate Attribution:** Passed with 100% compliance across 768 files (`python scripts/manage_headers.py check`).
- **Release Hygiene (Rule 012):** Validated clean 42.79 MB production distribution payload (`python scripts/check_release_hygiene.py`).
- **Docker Container Sync:** Hot-deployed to `prashant_academy_frontend` via `docker cp`.
