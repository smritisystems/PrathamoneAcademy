---
title: "Global Software-Governed Logo Sizing Architecture & Print Hygiene"
module: "14_PRINTING_DOCUMENTS"
category: "POLICY-AND-AUDIT"
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
tags: ["printing", "logo-sizing", "software-governance", "dockets", "receipts", "rule-014"]
entities: ["Institution", "TimetableDocket", "PaymentReceipt"]
api_routes: ["/api/v1/timetable/export/docket", "/api/v1/fees/receipt/{id}"]
related_modules: ["03_ACADEMIC_MANAGEMENT", "09_FEES_PAYMENTS", "17_UI_UX_DESIGN"]
---

# Global Software-Governed Logo Sizing Architecture & Print Hygiene

## 1. Executive Directive

**POLICY STATEMENT:**  
All institutional logos, emblems, and visual assets rendered across PrathamOne EduOS (in on-screen modal previews, printable vouchers, academic dockets, fee receipts, student ID cards, certificates, and report books) must have their dimensions **strictly governed by software layout rules**, completely independent of the uploaded image's intrinsic pixel dimensions.

**Rule Violation Eliminated:** Uploading high-resolution or raw SVG/PNG institutional logos must **NEVER** deform printable layouts or blow up preview modals ("if big it prints big"). The software must enforce strict, proportional bounding boxes (`object-fit: contain`) across both screen previews and `@media print` printouts.

---

## 2. Root Cause Analysis

### 2.1 The Modal Preview Unstyled Class Bug
In `frontend/src/pages/AcademicWorkspace.tsx`:
- The Timetable Docket modal rendered `<div className="tt-logo-box"><img src={logo_url} className="tt-logo-img" /></div>`.
- However, `.tt-logo-box` and `.tt-logo-img` were defined exclusively inside a print stylesheet function (`getTimetableDocketPrintStyles()`) which was only loaded inside a hidden print iframe.
- In `index.css`, zero rules existed for `.tt-logo-box` and `.tt-logo-img`.
- Consequently, inside the on-screen preview modal, the browser rendered the `<img>` tag at its raw intrinsic pixel dimensions (e.g., 1000px × 800px), pushing the institutional title, contact strip, and timetable table completely out of view.

### 2.2 The Print Engine Cloned Element Gap
- In `handlePrintIsolatedDocket`, an ad-hoc iframe was dynamically injected without importing `getTimetableDocketPrintStyles()` or clamping images.
- In `printLayoutEngine.ts`, universal print stylesheets lacked global maximum constraints on header and receipt logos, permitting raw images with inline SVG viewports to expand unconstrained under certain browser print drivers.

---

## 3. Engineering Implementation

### 3.1 Global Logo Bounding Architecture (`frontend/src/index.css`)
Universal rules were injected into `frontend/src/index.css` governing both on-screen previews and `@media print`:

```css
/* ==========================================================================
   GLOBAL INSTITUTION LOGO BOUNDING & DOCKET PREVIEW ARCHITECTURE
   Guarantees software-governed logo sizing on screen and in modals.
   Raw image pixel dimensions NEVER blow up modals, vouchers, or dockets.
   ========================================================================== */
.tt-logo-box,
.print-logo-container,
.receipt-logo-container,
.brand-logo-plate {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  overflow: hidden !important;
  flex-shrink: 0 !important;
}

.tt-logo-box {
  width: 38px !important;
  height: 38px !important;
  min-width: 38px !important;
  min-height: 38px !important;
  max-width: 38px !important;
  max-height: 38px !important;
  border: 1.5px solid #d4af37 !important;
  border-radius: 4px !important;
  background: #0b1e36 !important;
  padding: 1.5px !important;
}

.tt-logo-img {
  width: 34px !important;
  height: 34px !important;
  max-width: 34px !important;
  max-height: 34px !important;
  object-fit: contain !important;
  display: block !important;
}

@media print {
  img {
    max-width: 100% !important;
    object-fit: contain !important;
  }
  .tt-logo-box {
    width: 38px !important;
    height: 38px !important;
    max-width: 38px !important;
    max-height: 38px !important;
  }
  .tt-logo-img {
    width: 34px !important;
    height: 34px !important;
    max-width: 34px !important;
    max-height: 34px !important;
    object-fit: contain !important;
  }
  #receipt-print-area img,
  .receipt-header img,
  .receipt-logo-img {
    max-width: 48px !important;
    max-height: 48px !important;
    width: auto !important;
    height: auto !important;
    object-fit: contain !important;
  }
  [data-testid="print-document-header"] img,
  header.print-header img,
  .print-document-logo {
    max-height: 56px !important;
    max-width: 160px !important;
    width: auto !important;
    height: auto !important;
    object-fit: contain !important;
  }
}
```

### 3.2 Modal Preview Style Injection (`frontend/src/pages/AcademicWorkspace.tsx`)
1. Injected `<style>{getTimetableDocketPrintStyles()}</style>` directly into the modal container so the preview matches the certificate layout identically.
2. Added defensive inline style clamps on `.tt-logo-box` (`width: 38px, height: 38px, overflow: hidden`) and `.tt-logo-img` (`width: 34px, height: 34px, objectFit: contain`).
3. Replaced ad-hoc iframe printing in `handlePrintIsolatedDocket` with the canonical `printTimetableDocketElement` engine from `printTimetableDocket.ts`.

### 3.3 Component-Level Defense (`PrintDocumentBranding.tsx` & `PaymentReceiptView.tsx`)
- In `PrintDocumentBranding.tsx`: Wrapped all logo images in bounded container divs (`max-w-[44px]` compact / `max-w-[56px]` standard) with `object-fit: contain`.
- In `PaymentReceiptView.tsx`: Enforced `receipt-logo-container` with explicit `48px × 48px` max bounding box.
- In `printLayoutEngine.ts`: Injected automatic image clamping during DOM node cloning for universal printing.

---

## 4. Verification & Evidence

- **Browser Subagent Audit:** Successfully verified on `http://localhost:5173/academic/timetable`:
  - Clicked **Print** button in Timetable Studio.
  - Inspected the open **Official Academic Timetable Docket** modal.
  - Confirmed logo is strictly bounded inside the gold-bordered `38px` box, rendering at `34px` with `object-fit: contain`.
  - Confirmed header typography (`MY NO.1 ACADEMY`, tagline, contact details, official gold ribbon, AY badge, Docket ID) is perfectly aligned.
- **Evidence Artifacts:**
  - `timetable_docket_logo_fixed.png`: High-resolution close-up of the bounded 38px logo and certificate header.
  - `timetable_docket_viewport_fixed.png`: Full viewport context of the complete docket modal.
- **Header & Integrity Audits:**
  - `python scripts/manage_headers.py check` ➔ 774 / 774 files passed (100%).
  - `python tools/docs_manager.py validate` ➔ 735 / 735 documents passed (0 errors, 0 warnings).
