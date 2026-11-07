---
title: "PrathamOne EduOS Official Brand Identity & Logo Assets Specification"
module: "00_PRODUCT_OVERVIEW"
category: "SPECIFICATION"
document_type: "SPECIFICATION"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-07"
updated_date: "2026-11-07"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["branding", "logo", "assets", "identity", "design-system", "prathamone"]
entities: ["PrathamOneEduOS", "BrandingConfig", "LogoAssets"]
api_routes: []
related_modules: ["17_UI_UX_DESIGN", "14_PRINTING_DOCUMENTS"]
---

# PrathamOne EduOS — Official Brand Identity & Logo Assets Specification

## 1. Executive Summary & Brand Mark Identity

**PrathamOne EduOS** (Coaching Institute Edition) is the flagship education operating system engineered by **AITDL (AI Technology & Development Lab)** under Chief Product Architect **Jawahar R. Mallah**.

The official brand identity combines elegance, cognitive power, and software reliability:
- **The "P" Elephant Emblem:** The letter **P** in *PrathamOne* is ingeniously formed by a stylized elephant silhouette. In Indian cultural and educational heritage, the elephant represents supreme wisdom, memory (*Smriti*), intelligence, and unstoppable momentum. The circular ear and eye shape the upper bowl of the 'P', while the curved trunk gracefully extends downward to establish the letter's authoritative vertical stem.
- **Wordmark ("ratham"):** Rendered in clean, geometric sans-serif deep navy blue typography, completing the sacred Sanskrit root *Pratham* (First / Foremost).
- **Suffix ("One"):** Rendered in vibrant, energetic saffron orange, signifying enterprise unity, all-in-one comprehensiveness, and educational excellence.
- **Sub-Brand ("EduOS"):** Displayed prominently underneath in bold, high-contrast capital deep navy blue, establishing the platform as the foundational operating system for coaching institutes.

---

## 2. Official Color Palette & Chromatic Specifications

The brand employs a dual-tone enterprise chromatic system:

| Swatch | Color Name | Hex Code | RGB | HSL | CMYK (Print) | Primary Usage |
|---|---|---|---|---|---|---|
| <span style="display:inline-block;width:16px;height:16px;background:#1A1A50;border-radius:3px;"></span> | **Pratham Navy** | `#1A1A50` | `rgb(26, 26, 80)` | `240°, 51%, 21%` | `68%, 68%, 0%, 69%` | Elephant Emblem, "ratham", "EduOS", Sidebar, Top Navbar |
| <span style="display:inline-block;width:16px;height:16px;background:#EB8B3A;border-radius:3px;"></span> | **Pratham Orange** | `#EB8B3A` | `rgb(235, 139, 58)` | `27°, 82%, 57%` | `0%, 41%, 75%, 8%` | "One" Wordmark, Action Accents, Badges, Highlights |
| <span style="display:inline-block;width:16px;height:16px;background:#FFFFFF;border:1px solid #ccc;border-radius:3px;"></span> | **Pure White** | `#FFFFFF` | `rgb(255, 255, 255)` | `0°, 0%, 100%` | `0%, 0%, 0%, 0%` | Tusk Accent, Eye, Negative Space, Light Backgrounds |

---

## 3. Canonical Repository Asset Inventory

All official logo variants have been mastered, optimized, and saved into canonical repository directories:

### 3.1 Web Application Assets (`frontend/public/media/logo/`)
- `frontend/public/media/logo/prathamone-eduos-logo-original.jpg`: Unmodified master photograph/source render.
- `frontend/public/media/logo/prathamone-eduos-logo.png`: Lossless, high-resolution master PNG with clean background.
- `frontend/public/media/logo/prathamone-eduos-logo-transparent.png`: Transparent alpha-keyed PNG optimized for both light and dark backgrounds.
- `frontend/public/media/logo/prathamone-eduos-mark.png`: Cropped, centered square avatar emblem of the Elephant "P" mark.
- `frontend/public/media/logo/prathamone-eduos-mark-transparent.png`: Transparent square emblem for favicons and avatars.
- `frontend/public/media/logo/prathamone-app-icon-512.png`: 512×512 PWA / App Store launcher icon.
- `frontend/public/media/logo/prathamone-app-icon-192.png`: 192×192 mobile home screen touch icon.

### 3.2 Documentation & Archival Assets (`docs/assets/branding/`)
- `docs/assets/branding/prathamone-eduos-logo-original.jpg`
- `docs/assets/branding/prathamone-eduos-logo.png`
- `docs/assets/branding/prathamone-eduos-logo-transparent.png`
- `docs/assets/branding/prathamone-eduos-mark.png`
- `docs/assets/branding/prathamone-eduos-mark-transparent.png`
- `docs/assets/branding/prathamone-app-icon-512.png`
- `docs/assets/branding/prathamone-app-icon-192.png`

---

## 4. Software Usage & Recommended Implementations

### Recommendation 1: Application Sidebar Header
- **Expanded Sidebar:** Display `prathamone-eduos-logo-transparent.png` at `h-9` alongside institute name.
- **Collapsed Sidebar:** Display `prathamone-eduos-mark-transparent.png` inside an elegant `w-10 h-10` rounded container as the persistent collapsed brand mark.

### Recommendation 2: Authentication & Login Screen
- Position the full `prathamone-eduos-logo.png` above the credential form at `w-56` to establish instant corporate trust and visual authority.

### Recommendation 3: Global Print & PDF Standard Footers
- Incorporate the brand mark into physical A4 and A5 document outputs:
  - Canonical 2-row bottom footer: `Generated by PrathamOne EduOS · © PrathamOne EduOS`
  - Optional subtle monochrome watermarking in official student transcripts and report cards.

### Recommendation 4: Progressive Web App (PWA) Icons
- Use `prathamone-app-icon-512.png` and `prathamone-app-icon-192.png` in `frontend/public/manifest.json` for high-density Android and iOS mobile home-screen touch installation.

---

## 5. TypeScript Integration Code Reference

In `frontend/src/config/branding.ts`, access logo assets via standard hooks:

```typescript
import { useBranding } from '../config/branding'

export function MyComponent() {
  const branding = useBranding()
  
  return (
    <img 
      src={branding.assets.prathamOneLogoTransparentUrl} 
      alt="PrathamOne EduOS" 
      className="h-9 w-auto" 
    />
  )
}
```
