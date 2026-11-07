---
title: "PrathamOne EduOS Visual Identity & Brand Design Guidelines"
module: "17_UI_UX_DESIGN"
category: "GUIDE"
document_type: "GUIDE"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-07"
updated_date: "2026-11-07"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["branding", "style-guide", "design-system", "typography", "color-tokens"]
entities: ["PrathamOne", "PrathamOne EduOS", "AITDL", "Prashant Academy"]
api_routes: ["/media/logo/*"]
related_modules: ["frontend.config", "frontend.components", "14_PRINTING_DOCUMENTS"]
---

# PrathamOne EduOS Visual Identity & Brand Design Guidelines

**Product Architect:** Jawahar R Mallah  
**Organization:** AITDL — AI Technology & Development Lab  
**Client Organization:** Prashant Academy Coaching Institute  
**Effective Date:** 2026-11-07  
**Governance Standard:** Enterprise Visual Compliance  

---

## 1. Visual Identity Philosophy

**PrathamOne EduOS** embodies the strength, wisdom, and steadfast reliability of the elephant emblem combined with the precision of cutting-edge educational operating software.

The brand personality projects:
1. **Academic Authority & Trust:** Anchored in deep imperial navy (`#1A1A50`).
2. **Dynamic Energy & Innovation:** Illuminated by vibrant energy orange (`#EE8B36`).
3. **Clarity & Accessibility:** Supported by clean sans-serif typography, high-contrast dark surfaces, and generous negative space.

---

## 2. Official Chromatic Palette

### 2.1 Core Brand Colors

```
┌─────────────────────────────────┐   ┌─────────────────────────────────┐
│          PRATHAM NAVY           │   │         PRATHAM ORANGE          │
│             #1A1A50             │   │             #EE8B36             │
│       RGB(26, 26, 80)           │   │       RGB(238, 139, 54)         │
│  CMYK: 98%, 95%, 35%, 38%       │   │  CMYK: 0%, 53%, 85%, 0%         │
└─────────────────────────────────┘   └─────────────────────────────────┘
```

- **Pratham Navy (`#1A1A50`):** Used for the master elephant emblem, the word "ratham", the "EduOS" descriptor, and authoritative document headers.
- **Pratham Orange (`#EE8B36`):** Exclusively highlights the word "One", call-to-action buttons, active milestone indicators, and accent badges.

### 2.2 Supporting Neutrals & Surfaces

| Color Role | Hex Code | Usage Scenario |
| :--- | :--- | :--- |
| **Dark Slate Background** | `#0F172A` | Primary background for dark mode workspaces and collapsible sidebars. |
| **Midnight Navy Gradient** | `#071739` | Ambient background depth in login portals and system splash screens. |
| **Pure White** | `#FFFFFF` | Card surfaces, typography on dark navy, and internal emblem highlights. |
| **Border Neutral** | `#E2E8F0` | Structural card borders and table dividing lines. |
| **Text Secondary** | `#64748B` | Supporting labels, breadcrumbs, and metadata. |

---

## 3. Typography Standards

The official corporate typography harmonizes modern sans-serif geometric construction with maximum cross-platform legibility:

- **Primary Typeface:** `Inter`, `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `Roboto`, `sans-serif`.
- **Wordmark Characteristics:** Custom modified rounded sans-serif geometry with distinct open counters, gentle terminal curvatures, and mathematical baseline alignment.
- **Hierarchy:**
  - **H1 Page Headers:** 24px–28px, Bold (700), tracking `-0.02em`.
  - **H2 Section Titles:** 18px–20px, Bold (700), tracking `-0.01em`.
  - **Body Text:** 14px (0.875rem), Regular (400) / Medium (500), leading `1.5`.
  - **Microcopy & Footers:** 11px–12px, Medium (500), tracking `+0.01em`.

---

## 4. Clear-Space & Minimum Sizing Rules

### 4.1 Clear-Space Perimeter
To ensure visual impact and brand dignity, a mandatory exclusion zone must surround all logo variants.
- The minimum clear space is defined as **$X$**, where $X$ equals half the height of the elephant emblem loop ($X = 0.5 \times H_{\text{loop}}$).
- No typography, UI buttons, borders, or imagery may infringe upon this exclusion perimeter.

```
       ┌────────────────────────────────────────────────────────┐
       │                       CLEAR SPACE [X]                  │
       │     ┌────────────────────────────────────────────┐     │
 [X]   │ [X] │  [ELEPHANT] prathamOne                     │ [X] │   [X]
       │     │             EduOS                          │     │
       │     └────────────────────────────────────────────┘     │
       │                       CLEAR SPACE [X]                  │
       └────────────────────────────────────────────────────────┘
```

### 4.2 Minimum Dimensions
To prevent illegibility and pixel decay:

| Logo Variant | Digital Screens (Min Width) | Physical Print (Min Width) |
| :--- | :--- | :--- |
| **Master Logo (`PrathamOne`)** | 120 px | 25 mm |
| **Primary Stacked (`PrathamOne EduOS`)** | 100 px | 22 mm |
| **Horizontal Lockup (`PrathamOne | EduOS`)** | 140 px | 30 mm |
| **Elephant Symbol Mark** | 24 px | 6 mm |
| **Browser Favicon** | 16 × 16 px (ICO) / Scalable (SVG) | N/A |

---

## 5. Background Application Rules

- **Light Backdrops (White, `#F8FAFC`, `#F1F5F9`):**  
  Deploy standard color variants: `prathamone-master-logo-transparent.png` or `prathamone-eduos-primary-transparent.png`.
- **Dark Backdrops (`#0F172A`, `#071739`, `#020617`):**  
  Deploy dedicated dark variants: `prathamone-master-logo-dark.png` or `prathamone-eduos-primary-dark.png`. The navy characters transition to crisp `#FFFFFF`, while the vibrant orange "One" is preserved at full luminance.
- **Photography & Rich Artwork Backdrops:**  
  Place the logo inside a frosted glass container (`bg-white/90 backdrop-blur-md border border-white/20`) or a solid rounded squircle.

---

## 6. Co-Branding with Client Institutions

When co-branding PrathamOne EduOS with tenant institutes (such as Prashant Academy):
1. **Tenant Primacy:** The tenant's identity is the primary brand recognized by students, parents, and faculties.
2. **Platform Endorsement:** PrathamOne EduOS serves as the authoritative engine endorsement ("Powered by PrathamOne EduOS").
3. **Visual Separation:** Never merge or fuse the tenant logo directly into the PrathamOne emblem. Separate them using whitespace, a subtle vertical hairline, or distinct layout sections.

---

## 7. Strict Prohibitions (Brand Don'ts)

> [!CAUTION]
> The following modifications are strictly prohibited across all engineering, design, and marketing workflows:

- **DO NOT** stretch, condense, skew, or distort the logo aspect ratio.
- **DO NOT** alter the official colors or replace Pratham Navy with black or cyan.
- **DO NOT** convert "One" into navy or "pratham" into orange. The dual-color polarity is mandatory.
- **DO NOT** remove or fill the internal white contour details (eye, ear curve) of the elephant emblem.
- **DO NOT** apply harsh drop shadows, outer glows, or bevel/emboss filters.
- **DO NOT** rotate the emblem or place it upside-down.
- **DO NOT** place the standard navy logo directly on dark backgrounds where it loses contrast.
