---
title: "PrathamOne EduOS Official Brand Identity & Software Logo System Specification"
module: "17_UI_UX_DESIGN"
category: "DESIGN-SPECIFICATION"
document_type: "SPECIFICATION"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-08"
updated_date: "2026-11-08"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["branding", "logo", "ui-ux", "design-system", "assets", "eduos"]
entities: ["BrandingConfig", "LogoSystem", "TenantIdentity"]
api_routes: ["/api/v1/institutions/public-branding"]
related_modules: ["00_PRODUCT_OVERVIEW", "13_SYSADMIN_SETTINGS", "14_PRINTING_DOCUMENTS", "17_UI_UX_DESIGN"]
---

# PRATHAMONE EduOS — OFFICIAL BRAND IDENTITY & SOFTWARE LOGO SYSTEM

**Product:** PrathamOne EduOS  
**Edition:** Coaching Institute Edition (Coaching Institutes Suite)  
**Parent Brand:** PrathamOne  
**Corporate Group:** AITDL — AI Technology & Development Lab  
**Product Architect:** Jawahar R Mallah  
**Document Status:** Approved Architectural Specification  

---

## 1. EXECUTIVE VERDICT & STRATEGIC RECOMMENDATION

The newly supplied visual identity assets establish an authoritative, enterprise-grade brand standard for **PrathamOne EduOS**.

### Strategic Assessment:
1. **Distinct Enterprise Pedigree:** The circular emblem integrates the Pratham elephant motif, curling ear forming the letter **'P'**, wisdom leaves, and celestial sparks into a cohesive academic seal.
2. **Clear Brand Hierarchy:**
   - **Parent Brand:** `PRATHAM ONE` (Navy + Orange)
   - **Product Brand:** `EduOS` (Deep Navy)
   - **Product Edition:** `COACHING INSTITUTES SUITE` (Orange pill capsule badge)
   - **Software Emblem:** Standalone Circular Seal
3. **Multi-Tenant Coexistence:** The design distinctly identifies the underlying operating system while allowing tenant coaching institutes (such as Prashant Academy) to preserve their institutional brand dominance on student-facing documents and fee receipts.

---

## 2. OFFICIAL LOGO INVENTORY & RECOMMENDED ROLES

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 ASSET SYSTEM MATRIX                                    │
├──────────────────┬─────────────────────────────┬───────────────────────────────────────┤
│ Asset Variant    │ Composition                 │ Recommended Software Deployment       │
├──────────────────┼─────────────────────────────┼───────────────────────────────────────┤
│ 1. Full Lockup   │ Circular Seal + Wordmark    │ • Login Screen Hero Card & Banner     │
│    (Horizontal)  │ + "COACHING INSTITUTES" Pill│ • Platform Settings / About EduOS     │
│                  │                             │ • Software Splash & PWA Launch        │
│                  │                             │ • Documentation Covers & Blueprints   │
│                  │                             │ • Software Release Notes Header       │
├──────────────────┼─────────────────────────────┼───────────────────────────────────────┤
│ 2. Circular Seal │ Standalone Circular Emblem  │ • Browser Favicon (16x16, 32x32)      │
│    (Icon / Mark) │ (Elephant + Flora + Sparks) │ • PWA App Icons (192x192, 512x512)    │
│                  │                             │ • Collapsed Sidebar State (Icon-only) │
│                  │                             │ • Topbar "Powered by EduOS" Monogram  │
│                  │                             │ • Official Certificate Watermarks     │
├──────────────────┼─────────────────────────────┼───────────────────────────────────────┤
│ 3. Compact Brand │ Circular Seal + "EduOS"     │ • Expanded Sidebar Bottom Badge       │
│    (Medium)      │ Typography                  │ • Modal Header Software Attribution   │
│                  │                             │ • Application Status Bar              │
├──────────────────┼─────────────────────────────┼───────────────────────────────────────┤
│ 4. Document      │ Clean Text Endorsement +    │ • Global Print Footer Row 2           │
│    Endorsement   │ Micro Seal (7–8px height)   │ • A4/A5 Fee Receipts & Ledger Exports │
│                  │                             │ • Teacher Payroll Statements          │
└──────────────────┴─────────────────────────────┴───────────────────────────────────────┘
```

---

## 3. COLOR PALETTE DEFINITION

Extracted directly from the official graphics:

| Token Name | Hex Code | RGB | Role / Usage |
|---|---|---|---|
| `--color-pratham-navy` | `#161C3B` | `rgb(22, 28, 59)` | Primary brand color, circular ring, elephant body, `PRATHAM`, `EduOS` |
| `--color-pratham-orange` | `#F47B20` | `rgb(244, 123, 32)` | Brand accent, `ONE`, suite pill capsule, accent flora |
| `--color-pratham-gold` | `#F89D2B` | `rgb(248, 157, 43)` | Celestial sparks, secondary leaf highlights |
| `--color-pratham-white` | `#FFFFFF` | `rgb(255, 255, 255)` | Emblem field, pill text, clean document contrast |
| `--color-pratham-surface`| `#F8FAFC` | `rgb(248, 250, 252)` | Neutral canvas & card surfaces |

---

## 4. UI/UX PLACEMENT GUIDELINES

### 4.1 Login & Authentication Experience (`frontend/src/pages/Login.tsx`)
- **Right Login Card:** Display the Full Horizontal Lockup prominently above the sign-in form to reinforce platform trust and enterprise credibility.
- **Left Hero Panel:** Display the Circular Emblem watermark in high-resolution with the corporate mission:
  > *"PrathamOne EduOS — Enterprise Education Platform powered by AITDL"*

### 4.2 Sidebar & Application Header (`frontend/src/components/layout/`)
- **Expanded Sidebar:** Show Institute Name (`Prashant Academy`) at top, and at bottom show a compact endorsement card featuring the Circular Seal with `PrathamOne EduOS · Coaching Institutes Suite`.
- **Collapsed Sidebar:** Replace the wide logo with the 36x36px Circular Seal icon.
- **Global Header Bar:** Include the subtle engine mark next to tenant switcher.

### 4.3 Universal Print & PDF Documents (Rule 010 & Global Print Layout)
- **Top Header:** Strictly reserved for the tenant coaching institute (e.g. `Prashant Academy`), address, contact, and registration numbers.
- **Bottom Footer (Row 2):** Center-aligned, subtle grey endorsement:
  ```
  Generated by PrathamOne EduOS · © PrathamOne EduOS · prathamone.com
  ```
- **Watermark:** A 5% opacity rendering of the Circular Seal can be optionally toggled in Institute Settings for formal report cards and certificates.

---

## 5. TECHNICAL ASSET PIPELINE

To support all display resolutions and responsive contexts, the following master assets are generated from the 2752×1536 source:
1. `prathamone-eduos-lockup.png` (Full horizontal lockup with transparent background)
2. `prathamone-eduos-seal.png` (Circular emblem 1024×1024 with transparent background)
3. `favicon-32x32.png` & `favicon.ico` (Multi-resolution icons)
4. `icon-192x192.png` & `icon-512x512.png` (PWA Android/iOS manifest assets)
5. `prathamone-eduos-white.png` (Inverted white lockup for dark headers and banners)

---

## 6. CONCLUSION

Both uploaded assets are fully recommended for adoption as the authoritative software brand logos for **PrathamOne EduOS**. They provide a distinguished identity that positions the software alongside top-tier global enterprise ERP solutions while cleanly separating platform identity from tenant institutional identity.
