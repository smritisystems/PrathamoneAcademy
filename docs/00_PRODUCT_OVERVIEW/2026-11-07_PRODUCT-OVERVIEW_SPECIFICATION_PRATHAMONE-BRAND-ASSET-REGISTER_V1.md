---
title: "PrathamOne & PrathamOne EduOS Brand Asset Register & Master Specifications"
module: "00_PRODUCT_OVERVIEW"
category: "SPECIFICATION"
document_type: "SPECIFICATION"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-07"
updated_date: "2026-11-14"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["branding", "asset-register", "logo-specifications", "pwa-icons", "eduos-brand-refresh"]
entities: ["PrathamOne", "PrathamOne EduOS", "AITDL"]
api_routes: ["/media/logo/*", "/icons/*"]
related_modules: ["frontend.config", "frontend.components", "17_UI_UX_DESIGN"]
---

# PrathamOne & PrathamOne EduOS Brand Asset Register & Master Specifications

**Product Architect:** Jawahar R Mallah  
**Organization:** AITDL — AI Technology & Development Lab  
**Client Organization:** Prashant Academy Coaching Institute  
**Master File Reference:** `POlogo.png` (2752 × 1536 Master Artwork)  
**Effective Date:** 2026-11-07  

---

## 1. Master Artwork Provenance & Coordinates

The authoritative brand assets are derived with pixel-perfect precision directly from the official master artwork `POlogo.png` (Native resolution: 2752 × 1536 px, RGB, sRGB color space).

### Pixel Bounding Box Analysis
Forensic image scanning identified exact non-white bounding coordinates across all logo sub-components:

| Component Identifier | Top-Left (X1, Y1) | Bottom-Right (X2, Y2) | Dimensions (W × H) | Primary Palette |
| :--- | :--- | :--- | :--- | :--- |
| **Full Combined Artwork** | `(436, 142)` | `(2292, 1417)` | 1856 × 1275 px | Navy `#1A1A50` + Orange `#EE8B36` |
| **Top Section: PrathamOne** | `(436, 142)` | `(2292, 995)` | 1856 × 853 px | Navy `#1A1A50` + Orange `#EE8B36` |
| **Elephant Emblem ('P')** | `(436, 142)` | `(823, 989)` | 387 × 847 px | Deep Navy `#1A1A50` (White Inner Accents) |
| **Wordmark: "ratham"** | `(860, 488)` | `(1765, 995)` | 905 × 507 px | Deep Navy `#1A1A50` |
| **Wordmark: "One"** | `(1781, 488)` | `(2289, 995)` | 508 × 507 px | Energy Orange `#EE8B36` |
| **Bottom Section: "EduOS"** | `(490, 1045)` | `(2279, 1417)` | 1789 × 372 px | Deep Navy `#1A1A50` |

> [!IMPORTANT]
> The vertical dividing corridor at `Y = 996` contains zero colored pixels, enabling mathematical crop separation between the parent brand (`PrathamOne`) and the operating system descriptor (`EduOS`) without interpolation artifacts.

---

## 2. Canonical Asset Directory Inventory

All master assets are versioned and stored under `frontend/public/media/logo/`, `frontend/public/icons/`, and archived in `docs/assets/branding/`.

### 2.1 Parent Brand: PrathamOne Master Logos
Master corporate branding for overarching portals, corporate documentation, and ecosystem showcases:

- **`prathamone-master-logo.png`**  
  *Dimensions:* 1856 × 853 px | *Format:* PNG-24 (Solid White Background)  
  *Composition:* Elephant 'P' mark + "ratham" (Navy `#1A1A50`) + "One" (Orange `#EE8B36`).
- **`prathamone-master-logo-transparent.png`**  
  *Dimensions:* 1856 × 853 px | *Format:* PNG-32 (Alpha Transparency)  
  *Preservation:* Preserves all 734 internal white pixels (elephant eye, ear fold, tusk outline).
- **`prathamone-master-logo-dark.png`**  
  *Dimensions:* 1856 × 853 px | *Format:* PNG-32 (Dark Mode Optimized)  
  *Composition:* Navy glyphs remapped to crisp `#FFFFFF`, "One" preserved in vibrant `#EE8B36`.

### 2.2 Product Brand: PrathamOne EduOS Stacked Primary Logos
Primary product branding for splash screens, login containers, system about modals, and promotional banners:

- **`prathamone-eduos-primary.png`**  
  *Dimensions:* 1856 × 1276 px | *Format:* PNG-24 (Solid White Background)  
  *Composition:* Full stacked mark with "PrathamOne" above and uppercase block "EduOS" below.
- **`prathamone-eduos-primary-transparent.png`**  
  *Dimensions:* 1856 × 1276 px | *Format:* PNG-32 (Alpha Transparency).
- **`prathamone-eduos-primary-dark.png`**  
  *Dimensions:* 1856 × 1276 px | *Format:* PNG-32 (Dark Mode Optimized)  
  *Composition:* White "ratham" and white "EduOS", with vibrant `#EE8B36` "One".

### 2.3 Product Brand: PrathamOne EduOS Horizontal Lockups
Optimized horizontal layout for application navigation bars, portal headers, official stationery, and letterheads:

- **`prathamone-eduos-horizontal.png`**  
  *Dimensions:* 3538 × 853 px | *Format:* PNG-24 (Solid White Background)  
  *Composition:* Master "PrathamOne" on the left, vertical dividing hairline, and prominent "EduOS" on the right.
- **`prathamone-eduos-horizontal-transparent.png`**  
  *Dimensions:* 3538 × 853 px | *Format:* PNG-32 (Alpha Transparency).
- **`prathamone-eduos-horizontal-dark.png`**  
  *Dimensions:* 3538 × 853 px | *Format:* PNG-32 (Dark Mode Optimized).

### 2.4 Emblem / Symbol Marks
Compact emblem for collapsed sidebars, mobile headers, avatars, and watermarks:

- **`prathamone-symbol-icon.png`**  
  *Dimensions:* 387 × 847 px | *Format:* PNG-24 (White Background).
- **`prathamone-symbol-icon-transparent.png`**  
  *Dimensions:* 387 × 847 px | *Format:* PNG-32 (Alpha Transparency).
- **`prathamone-symbol-icon-dark.png`**  
  *Dimensions:* 387 × 847 px | *Format:* PNG-32 (White Emblem with Navy accents).

### 2.5 Favicons & Progressive Web App (PWA) Icons
Cross-platform app icons supporting high-DPI displays, modern browsers, Android PWA, and iOS Home Screen:

- **`frontend/public/favicon.ico`**  
  *Type:* Multi-resolution ICO container containing 16×16, 32×32, 48×48, and 64×64 mipmaps.
- **`frontend/public/favicon.svg`**  
  *Type:* Scalable Vector Graphics container embedding high-res emblem with rounded squircle.
- **`frontend/public/icons/icon-512x512.png`**  
  *Dimensions:* 512 × 512 px | *Purpose:* Master high-res PWA launch icon.
- **`frontend/public/icons/icon-192x192.png`**  
  *Dimensions:* 192 × 192 px | *Purpose:* Standard mobile PWA home screen icon.
- **`frontend/public/icons/icon-maskable-512x512.png`**  
  *Dimensions:* 512 × 512 px | *Purpose:* Android adaptive icon with safe-zone padding.
- **`frontend/public/icons/apple-touch-icon.png`**  
  *Dimensions:* 180 × 180 px | *Purpose:* iOS Safari home screen bookmark icon.

---

## 3. Color Token Standards

The official corporate chromatic specification is permanently codified:

```typescript
export const BRAND_COLORS = {
  // Master Primary Brand Colors
  prathamNavy: '#1A1A50',     // RGB(26, 26, 80)   - Deep Imperial Academic Navy
  prathamOrange: '#EE8B36',   // RGB(238, 139, 54) - Vibrant Energy Orange

  // UI Accents and Neutrals
  darkCanvasBg: '#0F172A',    // Slate-900 Dark Mode Surface
  midnightNavy: '#071739',    // Midnight Gradient Tone
  brandWhite: '#FFFFFF',      // Pure Contrast White
  subtleBorder: '#E2E8F0',    // Slate-200 Divider Border
} as const;
```

---

## 4. PrathamOne EduOS Software Branding Refresh

The software shell and installable application now use the supplied EduOS artwork in
`frontend/public/artwork/PrathamOne_EduOS_Brand_Assets/`. These product assets do not replace
the PrathamOne corporate master artwork above or an institute's tenant-specific academy logo.

| Asset | Dimensions | Purpose |
| :--- | :--- | :--- |
| `PrathamOne_EduOS_Logo_Transparent.png` | 1128 × 454 px | Horizontal product lockup for the software shell and product identity surfaces |
| `PrathamOne_EduOS_App_Icon.png` | 1024 × 1024 px | Canonical square app-symbol source |
| `frontend/public/icons/icon-192x192.png` | 192 × 192 px | Standard PWA icon and browser favicon |
| `frontend/public/icons/icon-512x512.png` | 512 × 512 px | High-resolution PWA icon |
| `frontend/public/icons/icon-maskable-512x512.png` | 512 × 512 px | Maskable Android PWA icon |
| `frontend/public/icons/apple-touch-icon.png` | 180 × 180 px | iOS home-screen icon |

Use the horizontal transparent lockup for product branding and the square app icon for browser,
PWA, and home-screen identity. Continue to show institution-provided logos in tenant-specific
branding areas; do not substitute the product mark for an institute's own identity.
