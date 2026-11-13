---
title: "Universal Smart Board & Interactive Teaching Platform Architecture"
module: "01_ARCHITECTURE"
category: "SYSTEM-DESIGN"
document_type: "ARCHITECTURE"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-13"
updated_date: "2026-11-13"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["eduboard", "universal-smart-board", "hardware-independent", "pointer-events", "touchscreen", "stylus", "display-modes", "ssot"]
entities: ["EduBoard", "EduBoardPage", "EduBoardRevision", "EduBoardDisplayPrefs"]
api_routes: ["/api/v1/eduboard", "/api/v1/eduboard/rooms/{board_id}"]
related_modules: ["03_ACADEMIC_MANAGEMENT", "18_TESTING_QA", "16_DATABASE_API"]
---

# PRATHAMONE EduOS — UNIVERSAL SMART BOARD ARCHITECTURE
## Hardware-Independent, Browser-Based Interactive Teaching Platform

**Product:** PrathamOne EduOS (Coaching Institute Edition)  
**System Module:** `01_ARCHITECTURE` / `03_ACADEMIC_MANAGEMENT` (EduBoard)  
**Baseline Version:** 1.0.0  
**Product Architect:** Jawahar R Mallah  
**Organization:** AITDL — AI Technology & Development Lab  
**Policy Status:** MANDATORY ARCHITECTURAL SPECIFICATION  

---

## 1. PRODUCT PRINCIPLE & PHILOSOPHY

PrathamOne EduBoard is engineered as a **hardware-independent, zero-install, browser-based Universal Interactive Teaching Platform**. 

1. **Vendor & Hardware Neutrality:**
   EduBoard does not depend on Teachmint, Promethean, SMART Technologies, ViewSonic, Maxhub, or any proprietary operating system, board firmware, or hardware SDK.
2. **Teachmint X Series Positioning:**
   Teachmint X Series interactive flat panels represent **one verified hardware compatibility target**, never the product architecture or proprietary boundary.
3. **W3C Standards Authoritativeness:**
   All rendering, drawing, touch digitizing, and synchronization operations execute strictly via standard W3C Web Technologies:
   - W3C Pointer Events Level 3
   - HTML5 Canvas & Konva 2D Rendering
   - WebSockets (RFC 6455)
   - W3C Fullscreen API
   - IndexedDB & Web Storage APIs
4. **Capability-Based Progressive Adaptation:**
   Rather than hardcoding vendor profiles or operating system flags, EduBoard operates on runtime **capability detection**. Devices with active stylus hardware, multi-touch panels, 4K displays, or basic mice/keyboards adapt gracefully with zero code divergence.

---

## 2. TARGET HARDWARE TAXONOMY

EduBoard architecture guarantees unified operation across four major classroom hardware categories:

```
┌───────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   PRATHAMONE EduBoard ENGINE                                  │
│                 (HTML5 Canvas / Konva / W3C Pointer Events / WebSockets / SSOT)                │
└───────┬───────────────────────────────┬───────────────────────────────┬───────────────────────┘
        │                               │                               │
        ▼                               ▼                               ▼
┌─────────────────────────┐   ┌─────────────────────────┐   ┌─────────────────────────┐
│   Android Smart Boards  │   │     Windows Systems     │   │   Classroom Displays    │
├─────────────────────────┤   ├─────────────────────────┤   ├─────────────────────────┤
│ • Android EDLA Panels   │   │ • Windows 10/11 OPS     │   │ • Interactive Projectors│
│ • Teachmint X Series    │   │ • Desktop & Laptops     │   │ • Standard TVs / Mon.   │
│ • Maxhub / Newline      │   │ • HDMI + USB Touch      │   │ • Graphics Tablets      │
│ • Passive / Active Pen  │   │ • Microsoft Pen Protocol│   │ • iPads & Android Tabs  │
└─────────────────────────┘   └─────────────────────────┘   └─────────────────────────┘
```

### A. Android Smart Boards (Interactive Flat Panels)
- **Target OS:** Android 11, 12, 13, 14 (Google EDLA certified and AOSP enterprise boards).
- **Runtime:** Chromium-based browsers (Google Chrome, Chromium Enterprise, board stock WebView/browsers).
- **Digitizer Types:** Infrared (IR) multi-touch matrices and In-Glass / Capacitive touch digitizers.
- **Stylus Types:** Dual-tip passive styluses, magnetic pens, and active Bluetooth styluses.

### B. Windows Ecosystem
- **Target Systems:** Windows 10 IoT Enterprise, Windows 11 Pro / Enterprise OPS (Open Pluggable Specification) computers slotted directly into classroom IFPs.
- **Peripheral Connectivity:** External teacher laptops connected via HDMI/DisplayPort (video) and USB-A/USB-B (HID touch digitizer feedback).
- **Pen Technologies:** Microsoft Pen Protocol (MPP 2.0), Wacom Feel IT, and generic HID-compliant digitizers.

### C. Other Classroom & Lecture Hall Hardware
- **Projectors:** Ultra-short-throw interactive laser projectors (Epson BrightLink, BenQ PointWrite) and non-interactive standard projectors (used with Projector Presentation Mode).
- **Secondary Displays:** Wall-mounted 55"–85" commercial TVs and repeater monitors in large coaching lecture halls.
- **Graphics Tablets:** USB-connected pen tablets (Wacom One, Huion Inspiroy, XP-Pen Deco) operated from teacher podium desktops.

### D. Mobile & Tablet Environments
- **Classroom Tablets:** Apple iPad (Safari/WebKit), Samsung Galaxy Tab S series (One UI / Chrome), and Microsoft Surface tablets.

---

## 3. UNIVERSAL INPUT ENGINE

EduBoard eliminates device-specific input listeners in favor of a **Hardware-Independent Input Abstraction Layer**:

```
                       ┌──────────────────────────────────────┐
                       │   Raw Hardware Events (HID / USB)    │
                       └──────────────────┬───────────────────┘
                                          │
                                          ▼
                       ┌──────────────────────────────────────┐
                       │   W3C Pointer Events (Level 3)       │
                       │   pointerdown / move / up / cancel   │
                       └──────────────────┬───────────────────┘
                                          │
                  ┌───────────────────────┴───────────────────────┐
                  ▼                                               ▼
     ┌─────────────────────────┐                     ┌─────────────────────────┐
     │  e.pointerType === pen  │                     │ e.pointerType === touch │
     └────────────┬────────────┘                     └────────────┬────────────┘
                  │                                               │
                  │ (Full drawing allowed)                        │ (Checked against
                  ▼                                               │  stylusOnly filter)
     ┌─────────────────────────┐                                  ▼
     │ Extract pressure & tilt │                     ┌─────────────────────────┐
     │ Fallback if 0 / unsupp. │                     │ Reject if stylusOnly ON │
     └────────────┬────────────┘                     └────────────┬────────────┘
                  │                                               │
                  └───────────────────────┬───────────────────────┘
                                          ▼
                       ┌──────────────────────────────────────┐
                       │ Universal Drawing Pipeline           │
                       │ Logical Coordinate Clamping [1280x720│
                       └──────────────────────────────────────┘
```

### 3.1 Input Abstraction Features
1. **Pointer Events Standardization:**
   All strokes, shapes, erasures, and object interactions bind exclusively to `onPointerDown`, `onPointerMove`, `onPointerUp`, and `onPointerCancel`. Legacy `touchstart`/`touchmove` or `mousedown`/`mousemove` are never bound separately.
2. **Dynamic Pointer Type Inspection:**
   `e.evt.pointerType` identifies `'pen'`, `'touch'`, or `'mouse'`.
3. **Opportunistic Stylus Pressure & Tilt:**
   - If `e.evt.pressure > 0 && e.evt.pressure < 1`, EduBoard dynamically modulates line stroke thickness.
   - If the digitizer does not expose pressure (common on IR touch boards), pressure smoothly defaults to `0.5`, preserving author-selected stroke widths without visual artifacts.
   - Tilt (`tiltX`, `tiltY`) is preserved in scene payloads when reported by active digitizers.
4. **Software Palm Rejection Fallback:**
   Many affordable classroom smart boards use Infrared (IR) touch bezels that cannot distinguish an intentional finger touch from a resting palm. EduBoard solves this via an explicit **Stylus Only** mode (`stylusOnly`). When toggled on:
   - All `pointerType === 'touch'` events are immediately discarded.
   - Only `pointerType === 'pen'` produces strokes, allowing teachers to rest their palm completely on the screen without misfires.
5. **No Blind Digitizer Assumptions:**
   EduBoard never assumes multi-pen simultaneous differentiation, hardware palm rejection, or hover proximity.

---

## 4. UNIVERSAL BOARD ENGINE

Every display mode, window configuration, and classroom hardware setup renders from the **same authoritative engine**:

### 4.1 Master 16:9 Presentation Coordinate System
- **Logical Dimension:** Strictly defined at **1280 × 720** (HD 16:9 aspect ratio).
- **Dynamic Centering & Auto-Fit:**
  On widescreen displays (e.g. 1920×1080, 2560×1440, 3840×2160), EduBoard centers the whiteboard symmetrically via `centerOffsetX` and `centerOffsetY`, rendering a realistic bezel border and subtle drop shadow.
- **Boundary Clamping & Visual Clipping:**
  Konva `<Group clip={{ x: 0, y: 0, width: 1280, height: 720 }}>` guarantees that no strokes can leak into screen margins, preventing cut-offs.

### 4.2 Unified Teaching Surfaces
The single engine seamlessly supports:
- **Classic Greenboard:** Forest Green `#1b4332` with chalk auto-contrast (White, Yellow, Pink, Cyan, Lime).
- **Blackboard:** Obsidian Slate `#121212` with chalk palettes.
- **Digital Whiteboard:** Clean Slate `#ffffff` with carbon and vibrant inks.
- **Ruled & Grid Overlays:** Math grids and ruled lines rendered dynamically with auto-adapting color.
- **PDF & Presentation Annotation:** Vectorized background rendering of imported lecture slides with layered freehand annotations.
- **Dynamic Content Auto-Framing:** PyMuPDF backend export scans all scene elements and auto-scales any drawings into 16:9 presentation PDFs (`842 × 473.6 pt`) with **0% cropping**.

---

## 5. AUTOMATIC CAPABILITY DETECTION LAYER

Located in [`frontend/src/utils/deviceCapabilities.ts`](file:///f:/PrashantAcademy/frontend/src/utils/deviceCapabilities.ts), EduBoard features an automatic capability detection layer that runs without external plugins:

```typescript
export interface DeviceCapabilityProfile {
  userAgent: string
  osFamily: 'Android' | 'Windows' | 'macOS' | 'Linux' | 'iOS' | 'Unknown'
  browserFamily: 'Chrome' | 'Edge' | 'Firefox' | 'Safari' | 'Opera' | 'Unknown'
  isStandalonePWA: boolean
  screenWidth: number
  screenHeight: number
  viewportWidth: number
  viewportHeight: number
  devicePixelRatio: number
  displayClassification: DisplayClassification
  orientation: 'landscape' | 'portrait'
  hasPointerEvents: boolean
  hasTouchEvents: boolean
  maxTouchPoints: number
  primaryPointer: 'coarse' | 'fine' | 'none'
  lastObservedPointerType: 'mouse' | 'touch' | 'pen' | 'unknown'
  hasObservedPressure: boolean
  hasObservedTilt: boolean
  supportsFullscreen: boolean
  supportsIndexedDB: boolean
  supportsWebSockets: boolean
  isOnline: boolean
}
```

### 5.1 Regulatory Transparency Directive
EduBoard strictly distinguishes **automatically detected browser runtime capabilities** from **physical factory hardware certifications**:
- The UI displays detected parameters inside the **Universal Device & Browser Diagnostics Modal** (`<EduBoardDeviceDiagnosticsModal />`).
- The modal displays an explicit banner:
  > *"Capability Detection Notice: The parameters below are dynamically detected via standard W3C browser APIs at runtime. They reflect the current browser execution environment and must be distinguished from physical factory hardware certifications."*
- EduBoard never claims "Certified for Brand X" based merely on browser feature detection.

---

## 6. ADAPTIVE DISPLAY MODES & WORKSPACES

Teachers can switch between three tailored display modes to fit their hardware:

| Mode | Target Hardware | UI Configuration | Focus & Controls |
| :--- | :--- | :--- | :--- |
| **Standard Mode** | Laptops, Desktops, Teacher Podiums | Header visible, Pages drawer open, Saved Boards panel open | Full lecture management, rapid page jumping |
| **Focus Mode** | Classroom Smart Boards (1080p / 4K) | Navigation chrome collapsed, floating pages/drawer buttons | Maximum board real estate for uninterrupted teaching |
| **Immersive Full-Screen** | Interactive Flat Panels & Projectors | Native OS fullscreen (`document.requestFullscreen`), toolbar dockable | Zero browser chrome distractions, bezel-to-bezel canvas |
| **Detached Pop-Out** | Dual-Monitor & Extended Projector setups | Independent popout window (`/eduboard/window/:boardId`) | Teacher operates controls on laptop; students view clean board on projector |

---

## 7. STORAGE, SYNCHRONIZATION & SSOT GOVERNANCE

EduBoard adheres strictly to **RULE 001 — Single Source of Truth**:

1. **Authoritative Ledger:**
   - PostgreSQL `eduboards`, `eduboard_pages`, and `eduboard_revisions`.
   - All devices (Android panel, Windows OPS, teacher laptop, student portal) connect to the exact same board records isolated strictly by `institution_id`.
2. **Debounced Autosave & Conflict Prevention:**
   - Teacher edits autosave every 3.5 seconds.
   - Optimistic concurrency control via `latest_revision_no`.
   - If another window or device commits revision `N+1`, revision `N` triggers a 409 conflict notification with a visual diff option, preventing accidental overwrite.
3. **Multi-Window Real-Time Sync:**
   - WebSocket room `/api/v1/eduboard/rooms/{board_id}` broadcasts live scene patches across windows with millisecond latency.
4. **Offline Resilience & Crash Recovery:**
   - IndexedDB stores local draft snapshots keyed by `institution:user:board:page`.
   - In case of power loss or network disconnection, the recovery banner restores the board state instantly upon reconnection.

---

## 8. HARDWARE ACCEPTANCE SUMMARY

| Hardware Target | Architectural Validation | Real Hardware Status |
| :--- | :--- | :--- |
| **Teachmint X Series** | Pointer Events Level 3, 16:9 Auto-Framing | Verified Progressive Compatibility Target |
| **Android EDLA IFPs** | WebKit/Blink Chromium, IR Touch Matrix | Architectural Standard Pass |
| **Windows OPS** | Windows 10/11 IoT, MPP / HID Digitizer | Architectural Standard Pass |
| **HDMI + USB Touch Laptops** | Extended Desktop / Clone Mode, HID Touch | Architectural Standard Pass |
| **Interactive Projectors** | PointWrite / BrightLink Calibration | Architectural Standard Pass |
| **Graphics Tablets** | Wacom / Huion USB HID Digitizers | Architectural Standard Pass |

*(Refer to `DEVICE_COMPATIBILITY_MATRIX.md` for full test logs and observations.)*
