---
title: "EduBoard Canvas Viewport Sizing & PDF Export Cropping Forensic Audit"
module: "03_ACADEMIC_MANAGEMENT"
category: "FORENSIC-AUDIT"
document_type: "REPORT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-13"
updated_date: "2026-11-13"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["eduboard", "canvas", "pdf-export", "viewport-scaling", "aspect-ratio", "cropping"]
entities: ["EduBoard", "EduBoardPage", "EduBoardCanvas"]
api_routes: ["/api/v1/eduboard/boards/{id}/export-pdf"]
related_modules: ["03_ACADEMIC_MANAGEMENT", "14_PRINTING_DOCUMENTS"]
---

# EduBoard Canvas Viewport Sizing & PDF Export Cropping Forensic Audit

## 1. Issue Summary

During interactive teaching and lecture note export on **PrathamOne EduBoard**, two related visual and export defects were reported:
1. **Partial Whiteboard Surface on Screen:** The interactive canvas displayed a white rectangular region on the left, but left a wide gray empty void on the right (~60% of the screen width).
2. **Drawing Bleed & PDF Cropping:** Teachers were able to draw into the gray area with their pen or shape tools, but when exporting to PDF or publishing the lecture board, only drawings inside the white rectangular area were captured; everything drawn in the gray area was cut off.

---

## 2. Deep Root Cause Analysis

### 2.1 The Recursive Height Shrinking Loop (`el.clientHeight - 8`)
- In `frontend/src/components/eduboard/EduBoardCanvas.tsx`:
  ```tsx
  const availH = el.clientHeight > 220 ? el.clientHeight - 8 : Math.round((w * 9) / 16)
  const h = fullscreenFill ? availH : Math.max(360, Math.min(availH, Math.round((w * 9) / 16)))
  ```
- **The Mechanism:** In standard workspace mode, the container element had no explicit CSS height; its height was derived directly from the inner Konva Stage. Each execution of the `ResizeObserver` read `el.clientHeight`, subtracted 8 pixels, and set the new Stage height. This triggered a recursive shrinking loop until the height reached the hard floor of `360px`.
- **The Visual Result:** On a 1200px or 1400px wide monitor, a height of 360px forced the 16:9 board to scale down to `360 * (16 / 9) = 640px` wide. Because `pan.x = 0`, the 640px board was pinned to the left edge, leaving the remaining 600px+ as an unpainted gray Stage background.

### 2.2 Unconstrained Konva Stage Clicks & Coordinate Overflow
- In `EduBoardCanvas.tsx`, the Konva Stage was sized to the full container width (`1200px+`), even though the whiteboard `<Rect>` only covered `640px`.
- `toLogicalCoords(stage)` computed `x = pos.x / effectiveScale` without checking boundaries.
- For a click at `pos.x = 1200px`, the logical coordinate was calculated as `1200 / 0.5 = 2400`.
- Strokes were saved with coordinates well beyond the logical 1280 boundary (`2400 > 1280`), giving the teacher the false impression that the gray area was part of the whiteboard.

### 2.3 Non-Uniform PDF Export & Hardcoded 1280 Bounds
- In `backend/app/services/eduboard_service.py` (`_draw_scene_on_pdf_page`):
  - Scaling was computed strictly as `sx = rect.width / 1280.0` and `sy = rect.height / 720.0`.
  - Points with `x > 1280` fell beyond `rect.width` on the PDF page and were clipped out.
  - The PDF page was created with A4 landscape dimensions (`842 x 595`, aspect ratio 1.415), while the canvas was 16:9 (`1280 x 720`, aspect ratio 1.777), resulting in ~25% vertical distortion.

---

## 3. Implemented Solution Architecture

### 3.1 Frontend Canvas Hardening (`EduBoardCanvas.tsx`)
1. **Eliminated Recursive Shrinking:** Replaced `el.clientHeight - 8` with a stable, viewport-bounded 16:9 height calculation.
2. **Automatic Board Centering:** Calculated `centerOffsetX = (containerWidth - boardPixelW) / 2` and `centerOffsetY = (containerHeight - boardPixelH) / 2` so the whiteboard is always centered.
3. **Strict Drawing Boundary Enforcement:**
   - In `handlePointerDown`: Drawing is rejected if the click initiates outside `[0, 1280]` or `[0, 720]`.
   - In `handlePointerMove`: Coordinates are clamped to the 1280x720 surface.
   - All elements are wrapped in a Konva `<Group clip={{ x: 0, y: 0, width: 1280, height: 720 }}>`.
4. **Visual Board Bezel:** Added a border and soft drop shadow around the `<Rect>` so the active board surface is distinct and professional.

### 3.2 Backend PDF Export Auto-Framing (`eduboard_service.py`)
1. **Dynamic Content Bounding Box:** Computes `content_w = max(1280, max_x + 8)` and `content_h = max(720, max_y + 8)` across all elements.
2. **Uniform Scaling:** Uses `scale = min(rect.width / content_w, rect.height / content_h)` so circles remain circular and aspect ratios are preserved.
3. **Zero-Cropping Protection:** Historical boards with drawings extending past 1280 automatically scale down and center on the PDF page so **100% of all drawings are preserved**.
4. **16:9 Presentation Dimensions:** Exported PDF pages use `842 x 473.625 pt` (exact 16:9 aspect ratio matching the digital whiteboard).

---

## 4. Verification & Testing

- **Backend Pytest:** 10/10 tests in `test_eduboard_system.py` and `test_eduboard_layout_popout.py` passed.
- **Frontend Vitest:** 9/9 tests in `EduBoardWorkspace.test.tsx` and `EduBoardDisplayAndPopout.test.tsx` passed.
- **Header Check:** 100% compliance across 591 files.
- **Build Status:** Vite production build completed with 0 errors.
