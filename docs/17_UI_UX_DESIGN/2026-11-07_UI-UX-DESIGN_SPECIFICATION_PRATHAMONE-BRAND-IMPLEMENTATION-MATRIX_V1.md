---
title: "PrathamOne EduOS Brand Implementation & Surface Verification Matrix"
module: "17_UI_UX_DESIGN"
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
tags: ["branding", "matrix", "ui-surfaces", "verification", "eduos"]
entities: ["PrathamOne", "PrathamOne EduOS", "AITDL", "Prashant Academy"]
api_routes: ["/media/logo/*", "/icons/*", "/api/v1/institutions"]
related_modules: ["frontend.config", "frontend.components", "14_PRINTING_DOCUMENTS"]
---

# PrathamOne EduOS Brand Implementation & Surface Verification Matrix

**Product Architect:** Jawahar R Mallah  
**Organization:** AITDL — AI Technology & Development Lab  
**Client Organization:** Prashant Academy Coaching Institute  
**Baseline Release:** 1.0.0  
**Effective Date:** 2026-11-07  
**Validation Status:** Complete (100% Verified)  

---

## 1. Global Brand Surface Matrix

This matrix documents every touchpoint where corporate and product branding is surfaced throughout the PrathamOne EduOS application, specifying the active visual asset, layout role, and verification status:

| Surface ID | Application Route / Scope | Component Location | Visual Brand Asset Deployed | Hierarchy Role | Verification Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **SRF-01** | `/login` (Public Authentication) | `frontend/src/pages/Login.tsx` | `symbolMarkTransparentUrl` (Elephant 'P' emblem) | Master Product Emblem | **VERIFIED ACTIVE** |
| **SRF-02** | `/login` (Card Header Pill) | `frontend/src/pages/Login.tsx` | Typography: `branding.suiteName` | Platform Identifier | **VERIFIED ACTIVE** |
| **SRF-03** | `/login` (Card Footer) | `frontend/src/pages/Login.tsx` | `branding.suiteName` • `branding.edition` | Corporate Attribution | **VERIFIED ACTIVE** |
| **SRF-04** | Global Admin Navigation | `frontend/src/components/Sidebar.tsx` | Base Footnote: `symbolMarkTransparentUrl` + `suiteName` + `versionDisplay` | Subtle Platform Anchor | **VERIFIED ACTIVE** |
| **SRF-05** | Global Student Portal Navigation | `frontend/src/components/Sidebar.tsx` | Base Footnote: `symbolMarkTransparentUrl` + `suiteName` + `versionDisplay` | Student Workspace Anchor | **VERIFIED ACTIVE** |
| **SRF-06** | Browser Chrome & Bookmark Bar | `frontend/index.html` | `/favicon.svg` & `/favicon.ico` | Official Vector Squircle Favicon | **VERIFIED ACTIVE** |
| **SRF-07** | Progressive Web App (PWA) | `frontend/public/manifest.json` | `/icons/icon-512x512.png` & `/icons/icon-192x192.png` | Native App Launch Icon | **VERIFIED ACTIVE** |
| **SRF-08** | Android Adaptive Launcher | `frontend/public/manifest.json` | `/icons/icon-maskable-512x512.png` | Adaptive Maskable Icon | **VERIFIED ACTIVE** |
| **SRF-09** | iOS Safari Home Screen | `frontend/index.html` | `/icons/apple-touch-icon.png` (180 × 180 px) | iOS Web Clip Icon | **VERIFIED ACTIVE** |
| **SRF-10** | Organization Ecosystem Cards | `frontend/src/components/OrganizationBranding.tsx` | `symbolMarkTransparentUrl` (Elephant 'P' emblem) | Active Product Card | **VERIFIED ACTIVE** |
| **SRF-11** | Organization Footers | `frontend/src/components/OrganizationBranding.tsx` | `AITDL` Parent Org Link + `prathamone.com` | Corporate Ecosystem | **VERIFIED ACTIVE** |
| **SRF-12** | Printable Fee Receipts | `frontend/src/components/FeeReceiptDocument.tsx` | Tenant Primacy (`Prashant Academy`), Subordinate 2-Row Footer | Legal Document Standard | **VERIFIED ACTIVE** |
| **SRF-13** | Student ID Cards | `frontend/src/components/StudentIDCardDocument.tsx` | Tenant Primacy (`Prashant Academy`), Subordinate 2-Row Footer | Legal Document Standard | **VERIFIED ACTIVE** |
| **SRF-14** | Exam Mark Statements | `frontend/src/components/ReportCardDocument.tsx` | Tenant Primacy (`Prashant Academy`), Subordinate 2-Row Footer | Academic Document Standard | **VERIFIED ACTIVE** |
| **SRF-15** | Developer & SysAdmin Console | Browser Developer Console (`ConsoleBanner.ts`) | ASCII / Styled Banner: PrathamOne EduOS • AITDL Ecosystem | System Provenance | **VERIFIED ACTIVE** |

---

## 2. Technical Asset Mapping in `branding.ts`

The single source of truth configuration maps these surfaces directly to physical assets:

```typescript
export const BRANDING_CONFIG = {
  appName: 'PrathamOne EduOS',
  suiteName: 'PrathamOne EduOS',
  edition: 'Coaching Institute Edition',
  colors: {
    prathamNavy: '#1A1A50',
    prathamOrange: '#EE8B36',
  },
  assets: {
    masterLogoUrl: '/media/logo/prathamone-master-logo.png',
    masterLogoTransparentUrl: '/media/logo/prathamone-master-logo-transparent.png',
    masterLogoDarkUrl: '/media/logo/prathamone-master-logo-dark.png',
    primaryLogoUrl: '/media/logo/prathamone-eduos-primary.png',
    primaryLogoTransparentUrl: '/media/logo/prathamone-eduos-primary-transparent.png',
    primaryLogoDarkUrl: '/media/logo/prathamone-eduos-primary-dark.png',
    horizontalLogoUrl: '/media/logo/prathamone-eduos-horizontal.png',
    horizontalLogoTransparentUrl: '/media/logo/prathamone-eduos-horizontal-transparent.png',
    horizontalLogoDarkUrl: '/media/logo/prathamone-eduos-horizontal-dark.png',
    symbolMarkUrl: '/media/logo/prathamone-symbol-icon.png',
    symbolMarkTransparentUrl: '/media/logo/prathamone-symbol-icon-transparent.png',
    symbolMarkDarkUrl: '/media/logo/prathamone-symbol-icon-dark.png',
    faviconUrl: '/favicon.svg',
    faviconIcoUrl: '/favicon.ico',
  }
};
```

---

## 3. Responsive & High-DPI Verification

All assets have been tested across screen densities and device formats:
- **Desktop (1920 × 1080 & 2560 × 1440 HiDPI):** Vector SVG and crisp 2x PNG rendering with zero blur or interpolation softness.
- **Laptop & Tablet (1366 × 768, iPad Pro):** Adaptive sidebar footnote remains legible without horizontal scrollbar overflow.
- **Mobile Smartphone (iPhone 15, Pixel 8):** Collapsible drawer footnote displays cleanly without displacing navigational touch targets.
- **Physical Print (A4 & A5 Dimensions):** Clean vectors and high-DPI rasterization at 300 DPI output with zero clipping.
