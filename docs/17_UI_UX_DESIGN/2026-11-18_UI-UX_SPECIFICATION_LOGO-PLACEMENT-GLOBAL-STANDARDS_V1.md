---
title: "Logo Placement & Global Branding Standards — PrathamOne EduOS"
module: "17_UI_UX_DESIGN"
category: "BRANDING-STANDARDS"
document_type: "RESEARCH-RECOMMENDATION"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "2.0"
created_date: "2026-11-18"
updated_date: "2026-11-18"
author: "Jawahar R Mallah"
organization: "Smritisys & AITDL Networks"
client: "Prashant Academy Coaching Institute"
status: "Approved"
tags: ["branding", "logo", "ui-ux", "global-standards", "erp", "artwork", "18112026", "icons", "design-system"]
entities: ["Institution", "BrandingConfig", "AppLayout", "PrintDocument"]
api_routes: ["/institutions/public/branding"]
related_modules: ["00_PRODUCT_OVERVIEW", "17_UI_UX_DESIGN", "12_RBAC_SECURITY", "14_PRINTING_DOCUMENTS"]
---

# Logo Placement & Global Branding Standards
## PrathamOne EduOS — Coaching Institute Edition
### Comprehensive Multi-Family Artwork Audit, ERP Placement Directive & Canonical Asset Mapping

**Research Date:** 2026-11-18  
**Artwork Batches Analysed:** `frontend/public/artwork/18112026/03/`, `frontend/public/artwork/18112026/`, `frontend/public/artwork/16112026/2/`  
**Analyst:** Jawahar R Mallah, Smritisys & AITDL Networks  
**Client:** Prashant Academy Coaching Institute  
**Baseline Version:** `1.0.0` (Build `v1.132.0`, commit `e9d350b`)

---

## 1. EXECUTIVE SUMMARY & ARTIFACT INVENTORY

A complete forensic visual inspection and SVG structural audit was conducted across all newly added artwork directories in `frontend/public/artwork/18112026/` and `18112026/03/`. 

Previously, only the horizontal bicolour lockup (`batch_g2`) and its monochrome variants were available, leaving critical gaps (missing standalone icon, missing stacked logo, missing compact navigation logo). **With the newly added files, the brand asset collection is now a complete, enterprise-grade, multi-orientation logo system.**

### 1.1 Core Brand Emblem Anatomy

Across all families, the brand emblem represents **PrathamOne EduOS**:
- **Open Academic Book:** Denoting educational institutional foundation and curriculum knowledge.
- **Left Page (3-Slice Pie Chart):** Denoting academic analytics, student batch distributions, and operational intelligence.
- **Right Page (4-Bar Growth Chart with Upward Trend Arrow):** Denoting student progress, institutional score trajectories, and performance metrics.
- **Floating Graduation Mortarboard Cap:** Hovering above the open book with an amber tassel, symbolizing academic excellence, degree completion, and student success.

---

## 2. THE 7 LOGO FAMILIES & COMPLETE ASSET INVENTORY

The 18112026 artwork release provides **7 distinct asset families**, each engineered for specific display contexts, viewport constraints, and surface contrast requirements:

### Family A: Full Horizontal Lockup (With Tagline)
**Anatomy:** `[Emblem] | PrathamOne — EduOS — / — Educational ERP, Simplified.`  
*Aspect Ratio:* ~3.5:1 (Ultra-wide horizontal)

| Asset File | Format | Dimensions | Palette | Recommended Placement |
|---|---|---|---|---|
| `batch_g2.svg` | SVG (Vector) | `809.8 × 230.5 mm` | 🎨 Navy `#0E3259` + Amber `#F5B025` | **Primary Brand Master**: High-res screen UI, web headers, SVG components |
| `batch_g2.png` | Raster PNG | `16,324 × 4,647 px` | 🎨 Navy `#0E3259` + Amber `#F5B025` | **Print Master**: High-DPI offset printing, signage, exhibition banners |
| `batch_path2-2-1.png` | Raster PNG | `8,121 × 2,323 px` | 🎨 Navy `#0E3259` + Amber `#F5B025` | **Web Retina**: Standard web master, email headers, marketing embeds |
| `batch_path3-8-8.svg/.png` | SVG / PNG | `16,324 × 4,641 px` | ⬛ Black Monochrome (`#000000`) | **B&W Print**: Thermal fee receipts, black-and-white exam sheets, fax |
| `batch_path3-8-8-1.svg/.png` | SVG / PNG | `16,324 × 4,641 px` | ⬜ Solid White (`#FFFFFF`) | **White Reverse**: Dark backgrounds, dark navigation bar, blue footer |
| `batch_path3-8-8-2.svg/.png` | SVG / PNG | `16,324 × 4,641 px` | 🟡 Amber Gold (`#F5B025`) | **Amber Accent**: On deep navy `#0B2D6B` containers for high-contrast |
| `batch_path3-8-8-6.svg/.png` | SVG / PNG | `16,324 × 4,641 px` | 🔵 Navy Monochrome (`#0E3259`) | **Stationery Master**: Single-colour corporate letterheads, official seals |

---

### Family B: Compact Horizontal Lockup (Without Tagline)
**Anatomy:** `[Emblem] | PrathamOne — EduOS —`  
*Aspect Ratio:* ~4.4:1 (Compact horizontal)

| Asset File | Format | Dimensions | Palette | Recommended Placement |
|---|---|---|---|---|
| `batch_path3-8-7.png` | Raster PNG | `6,429 × 1,462 px` | 🎨 Navy `#0E3259` + Amber `#F5B025` | **Compact App Navbar**: Top sticky header (32px-48px height) where a tagline is unreadable |

> [!TIP]
> **Why Family B is Essential:** When a horizontal logo is scaled down to a typical 36px application navbar, a 3-line tagline becomes less than 5px tall and renders as blurred illegible noise. `batch_path3-8-7.png` omits the tagline, allowing "PrathamOne" and "— EduOS —" to remain razor-sharp and legible even at 28px navbar height.

---

### Family C: Vertical / Stacked Logo Suite
**Anatomy:**
```
     [📖🎓]
   PRATHAMONE
     EDUOS
— Educational ERP, Simplified. —
```
*Aspect Ratio:* ~1.2:1 (Slightly taller than square)

| Asset File | Format | Dimensions | Palette | Recommended Placement |
|---|---|---|---|---|
| `batch_path1-1-6.svg` | SVG (Vector) | `558.8 × 456.4 mm` | 🔵 Deep Navy (`#003380` / `#0E3259`) | **Centered Login Screen**: Auth card header, mobile splash screen, brochure cover |
| `batch_path1-1-6.png` | Raster PNG | `23,758 × 19,405 px` | 🔵 Deep Navy (`#003380` / `#0E3259`) | **Ultra-HD Print Master**: Prospectus title page, annual report cover |
| `batch_path1-1-84.svg` | SVG (Vector) | `558.8 × 456.4 mm` | ⬜ Solid White (`#FFFFFF`) | **Dark Mode Stacked**: Splash screen on dark blue/black background, dark auth |
| `batch_path1-1-84.png` | Raster PNG | `23,758 × 19,405 px` | ⬜ Solid White (`#FFFFFF`) | **High-Res Dark Print**: Merchandise, dark tote bags, dark vehicle decals |
| `batch_path1-1.png/.svg`| SVG / PNG | `23,758 × 19,405 px` | ⬛ Solid Black (`#000000`) | **Mono Document Covers**: Monochrome manual cover, official filing reports |

---

### Family D: Standalone Emblem / Icon Mark Suite
**Anatomy:** `[📖🎓]` (Book + Graduation Cap with Pie & Bar Charts, NO typography)  
*Aspect Ratio:* ~1.55:1 (`558.8 × 361.2 mm`)

| Asset File | Format | Dimensions | Palette | Recommended Placement |
|---|---|---|---|---|
| `batch_path1-9.svg` | SVG (Vector) | `558.8 × 361.2 mm` | 🔵 Deep Navy (`#003380`) | **Canonical App Icon**: Favicon vector, collapsed sidebar icon, watermark |
| `batch_path1-8.svg` | SVG (Vector) | `558.8 × 361.2 mm` | ⬜ Solid White (`#FFFFFF`) | **Dark Nav Icon**: Collapsed sidebar in dark theme, dark badge icon |
| `batch_path1.svg` | SVG (Vector) | `558.8 × 361.2 mm` | ⬛ Black Monochrome (`#000000`) | **Mono Icon**: Black & white watermark, document stamp, monochrome favicon |
| `batch_path1.png` | Raster PNG | `23,758 × 15,357 px` | ⬛ Black Monochrome (`#000000`) | **Master Icon Source**: Base raster from which 32px, 180px, 192px, 512px icons are generated |

> [!IMPORTANT]
> **Resolution of Missing Icon Asset:** The previous report identified the absence of a standalone emblem mark as a critical gap. `batch_path1-9.svg` (Navy) and `batch_path1-8.svg` (White) provide the pure, unencumbered vector mark, completely resolving this gap without requiring manual cropping.

---

### Family E: Integrated Badge / Encapsulated Lockup
**Anatomy:** Full horizontal logo integrated into a solid, rounded backdrop box.

| Asset File | Format | Dimensions | Backdrop Box | Text Palette | Recommended Placement |
|---|---|---|---|---|---|
| `LOGO.PNG` | Raster PNG | `2,662 × 887 px` | 🔵 Deep Navy (`#0E3259`) Box | White & Amber Gold | **Third-Party LMS Badges**: Email signatures, partner directories, LMS integrations |
| `LOGO2.PNG.png` | Raster PNG | `2,662 × 887 px` | ⬛ Solid Black (`#000000`) Box | White & Amber Gold | **High-Contrast Badges**: Dark themed external portal widgets, monochrome co-branding |

---

### Family F: App Store & OS Tile Badges
**Anatomy:** 1:1 Square rounded tile container with full brand composition inside.

| Asset File | Format | Dimensions | Style | Recommended Placement |
|---|---|---|---|---|
| `batch_rect6-1.svg` | SVG (Vector) | `617.6 × 617.6 mm` (1:1 Square) | 🔵 Deep Navy (`#003380`) Tile | **PWA App Tile / Android Splash**: Homescreen app tile, desktop shortcut icon |
| `batch_rect6-4.svg` | SVG (Vector) | `617.6 × 617.6 mm` (1:1 Square) | ⬜ Solid White (`#FFFFFF`) Tile | **Light App Tile / Inverted PWA**: iOS light icon variant, Windows app store tile |

---

### Family G: Standalone Typography & Taglines
**Anatomy:** Pure typography without emblem.

| Asset File | Format | Dimensions | Palette | Recommended Placement |
|---|---|---|---|---|
| `batch_text6-1.png` | Raster PNG | `4,240 × 271 px` | 🟡 Amber Gold (`#F5B025`) | **Marketing Sub-Footers**: Landing page tagline banners, trade-show booth lower thirds |

---

### Family H: Motion Graphics & Video Suite
**Anatomy:** Full 3D kinetic motion graphic featuring particle convergence, academic emblem materialization, brand typography reveal, multi-module ecosystem network expansion (Dashboard, Mobile Apps, Fee Counter, Academic Analytics), and bold closing title slate.

| Asset File | Format | Duration & Resolution | Aspect Ratio | Audio / Style | Recommended Placement |
|---|---|---|---|---|---|
| `V1.mp4` | MP4 Video (H.264 / AAC) | `10.03s`, `1280 × 720 px` (720p HD) | 16:9 Widescreen | Stereo Audio, 3D Kinetic Motion Graphics | **Product Tour / System Overview**: "About PrathamOne EduOS" modal (`/help/version`), Admin first-run onboarding welcome walkthrough, Login portal "Watch Overview" media trigger |

---

## 3. GLOBAL ERP MULTI-TENANT BRANDING ARCHITECTURE

In enterprise multi-tenant Education ERP systems (such as SAP Student Lifecycle Management, Ellucian Banner, PowerSchool, and Oracle PeopleSoft Campus Solutions), **two distinct branding layers must be strictly segregated**:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        TWO-TIER BRANDING HIERARCHY                     │
├────────────────────────────────────────────────────────────────────────┤
│  LAYER 1: TENANT IDENTITY (Prashant Academy Coaching Institute)        │
│  - Primary visual anchor for users (Students, Teachers, Parents, Admin)│
│  - Appears on: Sidebar Top, Page Headers, Fee Receipts, Report Cards   │
│  - Controlled dynamically via Institute Settings / Database            │
├────────────────────────────────────────────────────────────────────────┤
│  LAYER 2: PLATFORM / VENDOR IDENTITY (PrathamOne EduOS by SmritiSys)   │
│  - Attribution, governance, copyright, and technology provenance       │
│  - Appears on: App Footer, Print Document Footers, Login Watermark,    │
│    About Modal, License & RBAC Headers, Browser Favicon / PWA Manifest │
│  - Controlled statically via branding.ts Single Source of Truth        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. GLOBAL ERP TOUCHPOINT PLACEMENT MATRIX

| # | System Touchpoint | UI Surface Context | Target Logo Family | Recommended File | Maximum Height | Notes |
|---|---|---|---|---|---|---|
| **1** | **Main App Header / Topbar** | Sticky navigation (Light theme) | Family B (Compact Horiz) | `batch_path3-8-7.png` | `32px – 40px` | No tagline, high clarity |
| **2** | **Main App Header / Topbar** | Sticky navigation (Dark theme) | Family A (White Reverse) | `batch_path3-8-8-1.svg` | `32px – 40px` | Clean white vector |
| **3** | **Sidebar (Expanded State)** | Top-left primary brand anchor | Tenant Academy Logo | `/media/logo/prashant-academy-logo.svg` | `48px` | Tenant takes precedence |
| **4** | **Sidebar (Collapsed State)** | 64px width icon-only rail | Family D (Navy Icon) | `batch_path1-9.svg` | `36px` | Vector emblem fits rail perfectly |
| **5** | **Login Screen (Primary Card)** | Centered authorization modal | Family C (Vertical Stacked) | `batch_path1-1-6.svg` | `100px – 120px` | Dignified centered vertical stack |
| **6** | **Login Screen (Dark Hero/Split)**| Left dark brand hero banner | Family C (White Stacked) | `batch_path1-1-84.svg` | `120px – 160px` | White vector on navy backdrop |
| **7** | **Application Footer** | Desktop & tablet viewport bottom | Family A (Primary Horiz) | `batch_g2.svg` | `24px` | Accompanied by version string |
| **8** | **Official Print Footer** | Bottom of printed receipts / cards | Family A (Navy Mono) | `batch_path3-8-8-6.svg` | `14px – 18px` | "Created by PrathamOne EduOS" |
| **9** | **Thermal Receipt / POS** | 80mm B&W thermal roll | Family A (Black Mono) | `batch_path3-8-8.svg` | `24px` | Pure black, 0% grey halftones |
| **10**| **Browser Favicon** | Browser tab 16px / 32px | Family D (Navy Icon) | `/icons/icon-32.png` (from `batch_path1-9.svg`)| `32px` | High-contrast favicon |
| **11**| **PWA Mobile Homescreen** | Mobile launcher icon | Family F (1:1 App Tile) | `batch_rect6-1.svg` / `/icons/icon-512.png` | `512px` | Complies with Android & iOS maskable spec |
| **12**| **PDF Report Book Cover** | Front cover title sheet | Tenant Crest + Family C | `batch_path1-1-6.svg` | `80px` | Academic dignity |
| **13**| **External LMS / Partner Embed**| Partner directories, email | Family E (Navy Badge) | `LOGO.PNG` | `48px` | Self-contained navy container |
| **14**| **System Watermark / Loading** | Full-screen spinner backdrop | Family D (Navy Icon 10%) | `batch_path1-9.svg` | `240px` | Low-opacity background watermark |
| **15**| **Product Tour & About System** | `/help/version` About system dialog | Family H (Motion Video) | `V1.mp4` | 16:9 Responsive (720p) | 10s 3D motion graphic platform overview |
| **16**| **Admin Onboarding Walkthrough** | First-run institute setup wizard | Family H (Motion Video) | `V1.mp4` | 16:9 Responsive (720p) | Introduces multi-module interconnected ERP |
| **17**| **Login Portal Media Showcase** | Left pane product tour link / modal | Family H (Motion Video) | `V1.mp4` | 16:9 Modal / Drawer | High-conversion promotional preview |

---

## 5. SINGLE SOURCE OF TRUTH (SSOT) INTEGRATION IN `branding.ts`

To respect **RULE 001** and **RULE 009** of the PrathamOne EduOS Engineering Directives, all asset paths must be centralized in `frontend/src/config/branding.ts`:

```typescript
// Canonical Asset Root for 18112026 Batch
const PRODUCT_BRAND_ASSET_ROOT = '/artwork/18112026/03'
const PRODUCT_BRAND_SHARED_ROOT = '/artwork/18112026'

// Canonical Logo URIs
export const BRAND_ASSETS = {
  // Horizontal Lockups
  horizontalMaster:      `${PRODUCT_BRAND_ASSET_ROOT}/batch_g2.svg`,
  horizontalMasterPng:   `${PRODUCT_BRAND_ASSET_ROOT}/batch_g2.png`,
  horizontalRetina:      `${PRODUCT_BRAND_ASSET_ROOT}/batch_path2-2-1.png`,
  horizontalCompact:     `${PRODUCT_BRAND_SHARED_ROOT}/batch_path3-8-7.png`,
  horizontalBlackMono:   `${PRODUCT_BRAND_ASSET_ROOT}/batch_path3-8-8.svg`,
  horizontalWhiteReverse:`${PRODUCT_BRAND_ASSET_ROOT}/batch_path3-8-8-1.svg`,
  horizontalAmberMono:   `${PRODUCT_BRAND_ASSET_ROOT}/batch_path3-8-8-2.svg`,
  horizontalNavyMono:    `${PRODUCT_BRAND_ASSET_ROOT}/batch_path3-8-8-6.svg`,

  // Vertical / Stacked Lockups
  stackedNavy:           `${PRODUCT_BRAND_ASSET_ROOT}/batch_path1-1-6.svg`,
  stackedNavyPng:        `${PRODUCT_BRAND_ASSET_ROOT}/batch_path1-1-6.png`,
  stackedWhite:          `${PRODUCT_BRAND_ASSET_ROOT}/batch_path1-1-84.svg`,
  stackedWhitePng:       `${PRODUCT_BRAND_ASSET_ROOT}/batch_path1-1-84.png`,
  stackedBlackMono:      `${PRODUCT_BRAND_ASSET_ROOT}/batch_path1-1.png`,

  // Standalone Icon Marks (No text)
  iconNavy:              `${PRODUCT_BRAND_ASSET_ROOT}/batch_path1-9.svg`,
  iconWhite:             `${PRODUCT_BRAND_ASSET_ROOT}/batch_path1-8.svg`,
  iconBlackMono:         `${PRODUCT_BRAND_ASSET_ROOT}/batch_path1.svg`,

  // Integrated Badges & Tiles
  badgeNavy:             `${PRODUCT_BRAND_SHARED_ROOT}/LOGO.PNG`,
  badgeBlack:            `${PRODUCT_BRAND_SHARED_ROOT}/LOGO2.PNG.png`,
  appTileNavy:           `${PRODUCT_BRAND_SHARED_ROOT}/batch_rect6-1.svg`,
  appTileWhite:          `${PRODUCT_BRAND_SHARED_ROOT}/batch_rect6-4.svg`,

  // Typography Tagline
  taglineAmber:          `${PRODUCT_BRAND_SHARED_ROOT}/batch_text6-1.png`,

  // Motion Graphics & Video Assets
  promotionalVideo:      '/artwork/VIDEOS/V1.mp4',
} as const
```

---

## 6. RESOLVED GAPS & VERIFICATION RECORD

| Previous Gap Status | Finding in 18112026 Batch | Status |
|---|---|---|
| ❌ Missing standalone emblem/icon | Found `batch_path1-9.svg` (Navy) & `batch_path1-8.svg` (White) | ✅ **100% RESOLVED** |
| ❌ Missing vertical/stacked logo | Found `batch_path1-1-6.svg` (Navy) & `batch_path1-1-84.svg` (White) | ✅ **100% RESOLVED** |
| ❌ Missing compact navbar logo | Found `batch_path3-8-7.png` (Navy + Amber, No Tagline) | ✅ **100% RESOLVED** |
| ❌ Missing 1:1 square app store tile | Found `batch_rect6-1.svg` (Navy) & `batch_rect6-4.svg` (White) | ✅ **100% RESOLVED** |
| ❌ Missing encapsulated external badge | Found `LOGO.PNG` (Navy Box) & `LOGO2.PNG.png` (Black Box) | ✅ **100% RESOLVED** |
| ❌ Missing dynamic promotional video | Found `V1.mp4` (10s 3D motion graphic, 720p HD, 16:9) | ✅ **100% RESOLVED** |
| ⚠️ Corrupted `batch_g6.png` in 16112026/2 | Superseded by `batch_g2.png` and `batch_path2-2-1.png` | ✅ **RESOLVED (Replaced)** |

---

## 7. NEXT IMPLEMENTATION PHASES

1. **Step 1:** Update `frontend/src/config/branding.ts` to export all new canonical keys.
2. **Step 2:** Generate optimized raster icons (`icon-32.png`, `icon-180.png`, `icon-192.png`, `icon-512.png`, `favicon.ico`) in `frontend/public/icons/`.
3. **Step 3:** Update `frontend/index.html` and `manifest.json` to link the new favicon and PWA icons.
4. **Step 4:** Verify corporate header compliance across all touched files using `python scripts/manage_headers.py check`.
5. **Step 5:** Reindex documentation using `python tools/docs_manager.py reindex`.
